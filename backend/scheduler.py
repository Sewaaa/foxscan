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
# processino gli stessi item contemporaneamente creando duplicati
_pipeline_lock = threading.Lock()


def run_pipeline(db: Session | None = None) -> dict:  # noqa: C901
    """
    Esegue l'intera pipeline:
    1. Fetch nuovi item dai feed RSS
    2. Recupera tutti gli item non processati
    3. Clustering per topic
    4. Scraping + sintesi per ogni cluster
    5. Salvataggio su DB
    """
    if not _pipeline_lock.acquire(blocking=False):
        logger.info("Pipeline già in esecuzione, skip")
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
        _pipeline_lock.release()

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


def start_scheduler():
    scheduler.add_job(
        run_pipeline,
        trigger="interval",
        minutes=FETCH_INTERVAL_MINUTES,
        id="pipeline_job",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(f"Scheduler avviato — pipeline ogni {FETCH_INTERVAL_MINUTES} minuti")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
