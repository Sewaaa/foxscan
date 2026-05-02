import logging
import os
import threading
import time
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional
from xml.etree.ElementTree import Element, SubElement, tostring


from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from database import get_db, init_db
from models import Article
from scheduler import run_pipeline, start_scheduler, stop_scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    secret = os.getenv("ADMIN_SECRET", "")
    if not secret:
        logger.warning("ADMIN_SECRET non impostata — endpoint /admin/* sono aperti!")
    elif len(secret) < 16:
        logger.warning("ADMIN_SECRET troppo corta (< 16 char) — usa: openssl rand -base64 32")
    start_scheduler()
    # Esegue la pipeline subito all'avvio (in background per non bloccare il server).
    # Fondamentale su Render free tier: il server va in sleep e si risveglia
    # ogni ~5 min tramite UptimeRobot — la pipeline partirebbe solo ogni 30 min
    # con lo scheduler da solo, invece così parte ad ogni risveglio.
    threading.Thread(target=run_pipeline, daemon=True).start()
    yield
    stop_scheduler()


app = FastAPI(title="FoxScan API", version="1.0.0", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Articles ──────────────────────────────────────────────────────────────────


@app.get("/articles")
@limiter.limit("60/minute")
def list_articles(
    request: Request,
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
@limiter.limit("60/minute")
def get_article(request: Request, article_id: int, db: Session = Depends(get_db)):
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    return article.to_dict(include_body=True)


# ── Tags ──────────────────────────────────────────────────────────────────────


_tags_cache: dict = {"data": None, "ts": 0.0}
_TAGS_TTL = 300  # 5 minuti


@app.get("/tags")
@limiter.limit("30/minute")
def list_tags(request: Request, db: Session = Depends(get_db)):
    """Restituisce tutti i tag con il conteggio degli articoli per ciascuno. Cache 5 min."""
    if _tags_cache["data"] is not None and (time.time() - _tags_cache["ts"]) < _TAGS_TTL:
        return _tags_cache["data"]

    articles = db.query(Article).all()
    tag_counts: dict[str, int] = {}
    for article in articles:
        for tag in article.tags_list:
            tag_counts[tag] = tag_counts.get(tag, 0) + 1

    result = [{"tag": k, "count": v} for k, v in sorted(tag_counts.items(), key=lambda x: -x[1])]
    _tags_cache["data"] = result
    _tags_cache["ts"] = time.time()
    return result


# ── RSS feed in uscita ────────────────────────────────────────────────────────


@app.get("/rss")
@limiter.limit("10/minute")
def rss_feed(request: Request, db: Session = Depends(get_db)):
    articles = db.query(Article).order_by(Article.published_at.desc()).limit(50).all()

    rss = Element("rss", version="2.0")
    channel = SubElement(rss, "channel")

    fe_url = os.getenv("FRONTEND_URL", "https://foxscan.vercel.app").rstrip("/")

    SubElement(channel, "title").text = "FoxScan — Cybersecurity News"
    SubElement(channel, "link").text = fe_url
    SubElement(channel, "description").text = "Le notizie di cybersecurity più rilevanti, sintetizzate da AI ogni 30 minuti."
    SubElement(channel, "language").text = "it"

    for article in articles:
        item = SubElement(channel, "item")
        SubElement(item, "title").text = article.title
        SubElement(item, "link").text = f"{fe_url}/article/{article.id}"
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
@limiter.limit("10/minute")
def reset_items(request: Request, db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    """Rimarca tutti gli item RSS come non processati, così la pipeline li riprocessa."""
    from models import RssItem
    logger.warning(f"ADMIN reset-items — IP: {request.client.host if request.client else 'unknown'}")
    count = db.query(RssItem).filter(RssItem.processed == True).update(  # noqa: E712
        {"processed": False}, synchronize_session="fetch"
    )
    db.commit()
    return {"status": "ok", "items_reset": count}


@app.delete("/admin/delete-all-articles")
@limiter.limit("10/minute")
def delete_all_articles(request: Request, db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    """Elimina tutti gli articoli e le sorgenti dal DB."""
    from models import Source
    logger.warning(f"ADMIN delete-all-articles — IP: {request.client.host if request.client else 'unknown'}")
    sources_deleted = db.query(Source).delete()
    articles_deleted = db.query(Article).delete()
    db.commit()
    return {"status": "ok", "articles_deleted": articles_deleted, "sources_deleted": sources_deleted}


_pipeline_status: dict = {"running": False, "last_stats": None}


@app.post("/admin/run-pipeline")
@limiter.limit("10/minute")
def trigger_pipeline(request: Request, _: None = Depends(verify_admin)):
    """Avvia la pipeline in background e ritorna subito."""
    logger.warning(f"ADMIN run-pipeline — IP: {request.client.host if request.client else 'unknown'}")
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
@limiter.limit("10/minute")
def get_stats(request: Request, db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    from datetime import timedelta
    from models import RssItem, Source
    from sqlalchemy import func

    total_articles = db.query(Article).count()
    pending_items = db.query(RssItem).filter(RssItem.processed == False).count()  # noqa: E712
    processed_items = db.query(RssItem).filter(RssItem.processed == True).count()  # noqa: E712

    last_article = db.query(Article).order_by(Article.published_at.desc()).first()

    def _multi_source_stats(articles):
        if not articles:
            return 0, 0
        ids = [a.id for a in articles]
        counts = (
            db.query(Source.article_id, func.count(Source.id).label("n"))
            .filter(Source.article_id.in_(ids))
            .group_by(Source.article_id)
            .all()
        )
        multi = sum(1 for _, n in counts if n > 1)
        pct = round(multi / len(articles) * 100)
        return multi, pct

    now = datetime.utcnow()
    articles_24h = db.query(Article).filter(Article.published_at >= now - timedelta(hours=24)).all()
    articles_48h = db.query(Article).filter(Article.published_at >= now - timedelta(hours=48)).all()

    multi_24, pct_24 = _multi_source_stats(articles_24h)
    multi_48, pct_48 = _multi_source_stats(articles_48h)

    return {
        "total_articles": total_articles,
        "rss_items_pending": pending_items,
        "rss_items_processed": processed_items,
        "last_article_at": last_article.published_at.isoformat() if last_article else None,
        "server_time": datetime.utcnow().isoformat(),
        "pipeline_running": _pipeline_status["running"],
        "articles_last_24h": len(articles_24h),
        "multi_source_last_24h": multi_24,
        "multi_source_pct_24h": pct_24,
        "articles_last_48h": len(articles_48h),
        "multi_source_last_48h": multi_48,
        "multi_source_pct_48h": pct_48,
    }


@app.get("/admin/pipeline-history")
@limiter.limit("10/minute")
def get_pipeline_history(request: Request, db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    """Ultime 30 esecuzioni della pipeline."""
    from models import PipelineRun
    runs = db.query(PipelineRun).order_by(PipelineRun.started_at.desc()).limit(30).all()
    return [r.to_dict() for r in runs]


@app.get("/admin/feed-stats")
@limiter.limit("10/minute")
def get_feed_stats(request: Request, db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    """Conta gli item RSS scoperti per ciascuna fonte + articoli multi-fonte per dominio."""
    from models import RssItem, Source
    from sqlalchemy import func

    # Item RSS scoperti per feed_source
    rss_rows = (
        db.query(RssItem.feed_source, func.count(RssItem.id))
        .group_by(RssItem.feed_source)
        .all()
    )

    # Per ogni dominio: quanti articoli (in Source) hanno quel dominio
    # E il loro article_id compare in più di una riga in Source (= multi-fonte)
    multi_subq = (
        db.query(Source.article_id)
        .group_by(Source.article_id)
        .having(func.count(Source.id) > 1)
        .subquery()
    )
    multi_rows = (
        db.query(Source.domain, func.count(Source.article_id.distinct()))
        .filter(Source.article_id.in_(db.query(multi_subq)))
        .group_by(Source.domain)
        .all()
    )
    multi_map: dict[str, int] = {r[0]: r[1] for r in multi_rows}

    return [
        {
            "feed_source": r[0] or "unknown",
            "count": r[1],
            "multi_source_count": multi_map.get(r[0] or "unknown", 0),
        }
        for r in rss_rows
    ]


@app.post("/admin/run-ig-pipeline")
@limiter.limit("5/minute")
def trigger_ig_pipeline(request: Request, _: None = Depends(verify_admin)):
    """Avvia manualmente un post Instagram tramite il container ig-pipeline."""
    import httpx
    logger.warning(f"ADMIN run-ig-pipeline — IP: {request.client.host if request.client else 'unknown'}")
    try:
        resp = httpx.post("http://ig-pipeline:8081/run", timeout=5.0)
        return resp.json()
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="ig-pipeline non raggiungibile")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/admin/ig-pipeline-status")
@limiter.limit("10/minute")
def ig_pipeline_status(request: Request, _: None = Depends(verify_admin)):
    """Stato corrente della pipeline IG."""
    import httpx
    try:
        resp = httpx.get("http://ig-pipeline:8081/status", timeout=3.0)
        return resp.json()
    except Exception:
        return {"running": False, "last_result": {}, "reachable": False}


@app.get("/admin/ig-stats")
@limiter.limit("10/minute")
def get_ig_stats(request: Request, db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    """Stato pipeline Instagram: articoli in attesa, postati, finestra scaduta."""
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(hours=24)

    pending = (
        db.query(Article)
        .filter(Article.relevance_score >= 8)
        .filter((Article.posted_to_ig == False) | (Article.posted_to_ig == None))  # noqa: E712
        .filter(Article.published_at >= cutoff)
        .order_by(Article.relevance_score.desc(), Article.published_at.desc())
        .all()
    )

    too_old = (
        db.query(Article)
        .filter(Article.relevance_score >= 8)
        .filter((Article.posted_to_ig == False) | (Article.posted_to_ig == None))  # noqa: E712
        .filter(Article.published_at < cutoff)
        .order_by(Article.published_at.desc())
        .limit(10)
        .all()
    )

    recent_posted = (
        db.query(Article)
        .filter(Article.posted_to_ig == True)  # noqa: E712
        .order_by(Article.published_at.desc())
        .limit(10)
        .all()
    )

    posted_today = (
        db.query(Article)
        .filter(Article.posted_to_ig == True)  # noqa: E712
        .filter(Article.published_at >= cutoff)
        .count()
    )

    def _slim(a: Article) -> dict:
        return {
            "id": a.id,
            "title": a.title,
            "relevance_score": a.relevance_score,
            "ig_score": a.ig_score,
            "published_at": a.published_at.isoformat() if a.published_at else None,
        }

    return {
        "posted_today": posted_today,
        "pending": [_slim(a) for a in pending],
        "too_old": [_slim(a) for a in too_old],
        "recent_posted": [_slim(a) for a in recent_posted],
    }


@app.get("/health")
@app.head("/health")
def health():
    return {"status": "ok"}
