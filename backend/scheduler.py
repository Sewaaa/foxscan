import gc
import json
import logging
import threading
import time
from datetime import datetime  # noqa: F401


from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from config import FETCH_INTERVAL_MINUTES, MAX_ARTICLES_PER_CLUSTER, MAX_ITEMS_PER_RUN
from database import SessionLocal
from pipeline.clustering import cluster_items
from pipeline.discovery import fetch_new_items, get_unprocessed_items, mark_processed
from pipeline.image_finder import find_image
from pipeline.merger import try_merge_with_existing
from pipeline.scraper import scrape_cluster
from pipeline.synthesizer import synthesize

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()

# Lock per evitare che pipeline concorrenti (startup thread + scheduler)
# processino gli stessi item contemporaneamente creando duplicati.
# Se una run rimane bloccata per più di PIPELINE_LOCK_TIMEOUT_MINUTES minuti
# il lock viene forzatamente rilasciato al prossimo tentativo.
_pipeline_lock = threading.Lock()
_pipeline_lock_acquired_at: datetime | None = None
PIPELINE_LOCK_TIMEOUT_MINUTES = 60


def _try_acquire_pipeline_lock() -> bool:
    """Tenta di acquisire il lock. Se è tenuto da più di 60 min lo forza-rilascia."""
    global _pipeline_lock_acquired_at
    if _pipeline_lock.acquire(blocking=False):
        _pipeline_lock_acquired_at = datetime.utcnow()
        return True
    # Lock già tenuto — controlla il timeout
    if _pipeline_lock_acquired_at is not None:
        elapsed_min = (datetime.utcnow() - _pipeline_lock_acquired_at).total_seconds() / 60
        if elapsed_min >= PIPELINE_LOCK_TIMEOUT_MINUTES:
            logger.warning(
                "Pipeline lock tenuto da %.0f min (timeout %d min) — forzo il rilascio",
                elapsed_min, PIPELINE_LOCK_TIMEOUT_MINUTES,
            )
            try:
                _pipeline_lock.release()
            except RuntimeError:
                pass
            if _pipeline_lock.acquire(blocking=False):
                _pipeline_lock_acquired_at = datetime.utcnow()
                return True
        else:
            logger.info("Pipeline già in esecuzione (%.0f min), skip", elapsed_min)
    else:
        logger.info("Pipeline già in esecuzione, skip")
    return False


def _release_pipeline_lock() -> None:
    global _pipeline_lock_acquired_at
    _pipeline_lock_acquired_at = None
    try:
        _pipeline_lock.release()
    except RuntimeError:
        pass


def run_pipeline(db: Session | None = None) -> dict:  # noqa: C901
    """
    Esegue l'intera pipeline:
    1. Fetch nuovi item dai feed RSS
    2. Recupera tutti gli item non processati
    3. Clustering per topic
    4. Scraping + sintesi per ogni cluster
    5. Salvataggio su DB
    """
    if not _try_acquire_pipeline_lock():
        return {"skipped": True}

    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    from models import PipelineRun
    run = PipelineRun(started_at=datetime.utcnow())
    db.add(run)
    db.commit()
    db.refresh(run)
    t0 = time.time()

    stats = {"discovered": 0, "clusters": 0, "articles_created": 0, "articles_updated": 0, "errors": 0}

    try:
        # Step 1: Discovery
        new = fetch_new_items(db)
        stats["discovered"] = len(new)

        # Step 2: Recupera i pending con cap diretto in SQL (evita caricare migliaia di righe in RAM)
        pending = get_unprocessed_items(db, limit=MAX_ITEMS_PER_RUN)
        if not pending:
            logger.info("Nessun item da processare")
            return stats

        # Step 3: Prova a fondere ogni item con articoli recenti (ultime 24h).
        # Se un item copre la stessa notizia di un articolo già pubblicato,
        # lo aggiorna invece di creare un duplicato.
        to_cluster = []
        for item in pending:
            try:
                merged = try_merge_with_existing(db, item)
                if merged:
                    mark_processed(db, [item["id"]])
                    stats["articles_updated"] += 1
                    time.sleep(2)  # pausa dopo ogni Groq call
                else:
                    to_cluster.append(item)
            except Exception as e:
                logger.error(f"Errore nel merge di item {item['id']}: {e}")
                to_cluster.append(item)
            gc.collect()

        # Step 4: Clustering degli item rimasti (nessun articolo esistente trovato)
        clusters = cluster_items(to_cluster)
        stats["clusters"] = len(clusters)

        for cluster in clusters:
            ids = [item["id"] for item in cluster]
            try:
                saved = _process_cluster(db, cluster[:MAX_ARTICLES_PER_CLUSTER])
                mark_processed(db, ids)
                if saved:
                    stats["articles_created"] += 1
            except Exception as e:
                logger.error(f"Errore su cluster {ids}: {e}")
                stats["errors"] += 1
                mark_processed(db, ids)  # marchia comunque per evitare loop
            # Svuota l'identity map di SQLAlchemy per evitare accumulo di oggetti in sessione
            db.expire_all()
            gc.collect()
            time.sleep(2)  # piccola pausa tra cluster; il retry 429 gestisce i rate limit

    finally:
        # Salva esito della run
        try:
            run.completed_at = datetime.utcnow()
            run.duration_s = int(time.time() - t0)
            run.discovered = stats.get("discovered", 0)
            run.created = stats.get("articles_created", 0)
            run.updated = stats.get("articles_updated", 0)
            run.errors = stats.get("errors", 0)
            db.commit()
        except Exception as e:
            logger.warning(f"Impossibile salvare PipelineRun: {e}")
        if close_db:
            db.close()
        _release_pipeline_lock()

    logger.info(f"Pipeline completata: {stats}")
    return stats


def _process_cluster(db: Session, cluster: list[dict]) -> bool:
    from models import Article, Source

    # Scraping
    scraped = scrape_cluster(cluster)
    if not scraped:
        logger.warning("Cluster senza testi disponibili, skip")
        return False

    # Sintesi AI
    result = synthesize(scraped)
    if not result:
        logger.warning("Sintesi fallita per il cluster, skip")
        return False

    # Prendi la prima immagine disponibile tra gli articoli del cluster;
    # se nessuna fonte aveva un'immagine, cerca su Unsplash tramite image_query.
    # Se l'LLM non ha restituito image_query, usa i tag come fallback.
    image_url = next((item.get("image_url") for item in scraped if item.get("image_url")), None)
    if not image_url:
        image_query = result.get("image_query", "").strip()
        if not image_query:
            tags = result.get("tag", [])
            image_query = f"{tags[0]} cybersecurity" if tags else "cybersecurity attack hacker"
            logger.info(f"image_query assente — uso fallback dai tag: '{image_query}'")
        image_url = find_image(image_query)

    # Salvataggio
    article = Article(
        title=result["titolo"],
        summary=result["sommario"],
        body=result["corpo"],
        tags=json.dumps(result.get("tag", []), ensure_ascii=False),
        image_url=image_url,
        relevance_score=int(result.get("score_rilevanza", 5)),
        ig_score=float(result["ig_score"]) if result.get("ig_score") else None,
        published_at=datetime.utcnow(),
    )
    db.add(article)
    db.flush()  # ottieni l'ID

    for item in scraped:
        source = Source(
            article_id=article.id,
            url=item["url"],
            domain=item.get("domain", ""),
        )
        db.add(source)

    db.commit()
    logger.info(f"Articolo salvato: [{article.relevance_score}/10] {article.title}")
    return True


def cleanup_old_rss_items() -> None:
    """Elimina item RSS processati più vecchi di 30 giorni per liberare spazio su Neon."""
    from datetime import timedelta
    from models import RssItem
    db = SessionLocal()
    try:
        cutoff = datetime.utcnow() - timedelta(days=30)
        deleted = db.query(RssItem).filter(
            RssItem.processed == True,  # noqa: E712
            RssItem.discovered_at < cutoff,
        ).delete(synchronize_session=False)
        db.commit()
        logger.info("Cleanup RSS: eliminati %d item più vecchi di 30 giorni", deleted)
    except Exception as e:
        logger.error("Errore nel cleanup RSS: %s", e)
        db.rollback()
    finally:
        db.close()


WATCHDOG_INTERVAL = 300  # controlla ogni 5 minuti


def _scheduler_watchdog() -> None:
    """Thread watchdog: verifica che lo scheduler sia attivo e che il lock pipeline non sia bloccato."""
    global _pipeline_lock_acquired_at
    heartbeat_count = 0
    while True:
        time.sleep(WATCHDOG_INTERVAL)
        heartbeat_count += 1

        # 1. Controlla se lo scheduler è vivo
        if not scheduler.running:
            logger.error("[watchdog #%d] Scheduler NON attivo — riavvio...", heartbeat_count)
            try:
                scheduler.start()
                logger.info("[watchdog] Scheduler riavviato con successo.")
            except Exception as e:
                logger.error("[watchdog] Errore nel riavvio dello scheduler: %s", e)
            continue

        # 2. Controlla se il lock pipeline è bloccato da troppo tempo
        if _pipeline_lock_acquired_at is not None:
            elapsed_min = (datetime.utcnow() - _pipeline_lock_acquired_at).total_seconds() / 60
            if elapsed_min >= PIPELINE_LOCK_TIMEOUT_MINUTES:
                logger.warning(
                    "[watchdog #%d] Lock pipeline bloccato da %.0f min — forzo rilascio",
                    heartbeat_count, elapsed_min,
                )
                try:
                    _pipeline_lock.release()
                except RuntimeError:
                    pass
                _pipeline_lock_acquired_at = None
            else:
                logger.info(
                    "[watchdog #%d] Pipeline in esecuzione da %.0f min", heartbeat_count, elapsed_min
                )
        else:
            jobs = scheduler.get_jobs()
            next_times = {j.id: str(j.next_run_time) for j in jobs}
            logger.info("[watchdog #%d] OK — prossimi job: %s", heartbeat_count, next_times)


def start_scheduler():
    scheduler.add_job(
        run_pipeline,
        trigger="interval",
        minutes=FETCH_INTERVAL_MINUTES,
        id="pipeline_job",
        replace_existing=True,
        max_instances=3,          # APScheduler non blocca i nuovi tentativi;
        misfire_grace_time=7200,  # è il _pipeline_lock (60 min timeout) a gestire la concorrenza.
        # Senza questo, se il NAS iberna a metà pipeline il contatore interno di APScheduler
        # resta a 1 e salta tutti i successivi run con "maximum instances reached".
    )
    scheduler.add_job(
        cleanup_old_rss_items,
        trigger="interval",
        weeks=1,
        id="cleanup_rss_job",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(f"Scheduler avviato — pipeline ogni {FETCH_INTERVAL_MINUTES} minuti")
    threading.Thread(target=_scheduler_watchdog, daemon=True, name="scheduler-watchdog").start()
    logger.info("Watchdog avviato — controllo scheduler ogni %d secondi", WATCHDOG_INTERVAL)


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
