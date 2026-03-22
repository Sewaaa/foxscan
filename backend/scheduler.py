import json
import logging
import time
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from config import FETCH_INTERVAL_MINUTES, MAX_ARTICLES_PER_CLUSTER
from database import SessionLocal
from pipeline.clustering import cluster_items
from pipeline.discovery import fetch_new_items, get_unprocessed_items, mark_processed
from pipeline.scraper import scrape_cluster
from pipeline.synthesizer import synthesize

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()


def run_pipeline(db: Session | None = None) -> dict:
    """
    Esegue l'intera pipeline:
    1. Fetch nuovi item dai feed RSS
    2. Recupera tutti gli item non processati
    3. Clustering per topic
    4. Scraping + sintesi per ogni cluster
    5. Salvataggio su DB
    """
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    stats = {"discovered": 0, "clusters": 0, "articles_created": 0, "errors": 0}

    try:
        # Step 1: Discovery
        new = fetch_new_items(db)
        stats["discovered"] = len(new)

        # Step 2: Recupera tutti i pending
        pending = get_unprocessed_items(db)
        if not pending:
            logger.info("Nessun item da processare")
            return stats

        # Step 3: Clustering
        clusters = cluster_items(pending)
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
            time.sleep(12)  # rispetta Groq free tier: 6000 TPM → ~1 req ogni 12s

    finally:
        if close_db:
            db.close()

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

    # Salvataggio
    article = Article(
        title=result["titolo"],
        summary=result["sommario"],
        body=result["corpo"],
        tags=json.dumps(result.get("tag", []), ensure_ascii=False),
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
