import logging
import os
import threading
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional
from xml.etree.ElementTree import Element, SubElement, tostring

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy.orm import Session

from database import get_db, init_db
from models import Article
from scheduler import run_pipeline, start_scheduler, stop_scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    start_scheduler()
    # Esegue la pipeline subito all'avvio (in background per non bloccare il server).
    # Fondamentale su Render free tier: il server va in sleep e si risveglia
    # ogni ~5 min tramite UptimeRobot — la pipeline partirebbe solo ogni 30 min
    # con lo scheduler da solo, invece così parte ad ogni risveglio.
    threading.Thread(target=run_pipeline, daemon=True).start()
    yield
    stop_scheduler()


app = FastAPI(title="CyberNews API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Articles ──────────────────────────────────────────────────────────────────


@app.get("/articles")
def list_articles(
    tag: Optional[str] = Query(None, description="Filtra per tag"),
    min_score: Optional[int] = Query(None, ge=1, le=10, description="Score minimo (1-10)"),
    max_score: Optional[int] = Query(None, ge=1, le=10, description="Score massimo (1-10)"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    q = db.query(Article).order_by(Article.published_at.desc(), Article.relevance_score.desc())

    if tag:
        q = q.filter(Article.tags.like(f'%"{tag}"%'))
    if min_score is not None:
        q = q.filter(Article.relevance_score >= min_score)
    if max_score is not None:
        q = q.filter(Article.relevance_score <= max_score)

    total = q.count()
    articles = q.offset(offset).limit(limit).all()

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "items": [a.to_dict(include_body=False) for a in articles],
    }


@app.get("/articles/{article_id}")
def get_article(article_id: int, db: Session = Depends(get_db)):
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    return article.to_dict(include_body=True)


# ── Tags ──────────────────────────────────────────────────────────────────────


@app.get("/tags")
def list_tags(db: Session = Depends(get_db)):
    """Restituisce tutti i tag con il conteggio degli articoli per ciascuno."""
    import json

    articles = db.query(Article).all()
    tag_counts: dict[str, int] = {}
    for article in articles:
        for tag in article.tags_list:
            tag_counts[tag] = tag_counts.get(tag, 0) + 1

    return [{"tag": k, "count": v} for k, v in sorted(tag_counts.items(), key=lambda x: -x[1])]


# ── RSS feed in uscita ────────────────────────────────────────────────────────


@app.get("/rss")
def rss_feed(db: Session = Depends(get_db)):
    articles = db.query(Article).order_by(Article.published_at.desc()).limit(50).all()

    rss = Element("rss", version="2.0")
    channel = SubElement(rss, "channel")

    import os
    frontend_url = os.getenv("FRONTEND_URL", "https://cybernews-bxml.onrender.com").rstrip("/")

    SubElement(channel, "title").text = "CyberNews — Cybersecurity in italiano"
    SubElement(channel, "link").text = frontend_url
    SubElement(channel, "description").text = "Le notizie di cybersecurity più rilevanti, sintetizzate da AI"
    SubElement(channel, "language").text = "it"

    for article in articles:
        item = SubElement(channel, "item")
        SubElement(item, "title").text = article.title
        SubElement(item, "link").text = f"{frontend_url}/article/{article.id}"
        SubElement(item, "description").text = article.summary or ""
        SubElement(item, "pubDate").text = article.published_at.strftime("%a, %d %b %Y %H:%M:%S +0000")
        SubElement(item, "guid").text = str(article.id)

    xml_bytes = tostring(rss, encoding="unicode", xml_declaration=False)
    xml_output = '<?xml version="1.0" encoding="UTF-8"?>\n' + xml_bytes
    return Response(content=xml_output, media_type="application/rss+xml")


# ── Admin auth ────────────────────────────────────────────────────────────────


def verify_admin(x_admin_key: Optional[str] = Header(default=None)):
    secret = os.getenv("ADMIN_SECRET")
    if secret and x_admin_key != secret:
        raise HTTPException(status_code=401, detail="Unauthorized")


# ── Admin / Pipeline ──────────────────────────────────────────────────────────


@app.post("/admin/reset-items")
def reset_items(db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    """Rimarca tutti gli item RSS come non processati, così la pipeline li riprocessa."""
    from models import RssItem
    count = db.query(RssItem).filter(RssItem.processed == True).update(  # noqa: E712
        {"processed": False}, synchronize_session="fetch"
    )
    db.commit()
    return {"status": "ok", "items_reset": count}


@app.delete("/admin/delete-all-articles")
def delete_all_articles(db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    """Elimina tutti gli articoli e le sorgenti dal DB."""
    from models import Source
    sources_deleted = db.query(Source).delete()
    articles_deleted = db.query(Article).delete()
    db.commit()
    return {"status": "ok", "articles_deleted": articles_deleted, "sources_deleted": sources_deleted}


_pipeline_status: dict = {"running": False, "last_stats": None}


@app.post("/admin/run-pipeline")
def trigger_pipeline(_: None = Depends(verify_admin)):
    """Avvia la pipeline in background e ritorna subito."""
    import threading

    if _pipeline_status["running"]:
        return {"status": "already_running"}

    def _run():
        _pipeline_status["running"] = True
        try:
            stats = run_pipeline()
            _pipeline_status["last_stats"] = stats
        finally:
            _pipeline_status["running"] = False

    threading.Thread(target=_run, daemon=True).start()
    return {"status": "started"}


@app.get("/admin/stats")
def get_stats(db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    from models import RssItem

    total_articles = db.query(Article).count()
    pending_items = db.query(RssItem).filter(RssItem.processed == False).count()  # noqa: E712
    processed_items = db.query(RssItem).filter(RssItem.processed == True).count()  # noqa: E712

    last_article = db.query(Article).order_by(Article.published_at.desc()).first()

    return {
        "total_articles": total_articles,
        "rss_items_pending": pending_items,
        "rss_items_processed": processed_items,
        "last_article_at": last_article.published_at.isoformat() if last_article else None,
        "server_time": datetime.utcnow().isoformat(),
        "pipeline_running": _pipeline_status["running"],
    }


@app.get("/health")
@app.head("/health")
def health():
    return {"status": "ok"}
