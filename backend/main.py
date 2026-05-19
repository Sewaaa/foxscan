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


@app.post("/admin/reset-ig-errors")
@limiter.limit("10/minute")
def reset_ig_errors(request: Request, db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    """Rimette in coda gli articoli con errore IG azzerando ig_last_error e ig_attempts."""
    logger.warning(f"ADMIN reset-ig-errors — IP: {request.client.host if request.client else 'unknown'}")
    count = db.query(Article).filter(Article.ig_last_error.isnot(None)).update(
        {"ig_last_error": None, "ig_last_error_at": None, "ig_attempts": 0},
        synchronize_session="fetch",
    )
    db.commit()
    return {"status": "ok", "reset": count}


@app.delete("/admin/articles/{article_id}")
@limiter.limit("30/minute")
def delete_article(article_id: int, request: Request, db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    """Elimina un singolo articolo per ID."""
    from models import Source
    from fastapi import HTTPException
    logger.warning(f"ADMIN delete-article #{article_id} — IP: {request.client.host if request.client else 'unknown'}")
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail=f"Articolo #{article_id} non trovato")
    db.query(Source).filter(Source.article_id == article_id).delete()
    db.delete(article)
    db.commit()
    return {"status": "ok", "article_id": article_id}


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


@app.post("/admin/close-stale-runs")
@limiter.limit("10/minute")
def close_stale_runs(request: Request, db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    """Chiude le pipeline run rimaste aperte (completed_at IS NULL)."""
    from models import PipelineRun
    logger.warning(f"ADMIN close-stale-runs — IP: {request.client.host if request.client else 'unknown'}")
    updated = db.query(PipelineRun).filter(PipelineRun.completed_at == None).update(  # noqa: E711
        {"completed_at": datetime.utcnow(), "duration_s": 0},
        synchronize_session=False,
    )
    db.commit()
    return {"status": "ok", "closed": updated}


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
    IG_WINDOW_HOURS = 36  # deve corrispondere a pipeline.py get_pending_articles(hours=36)
    cutoff = datetime.utcnow() - timedelta(hours=IG_WINDOW_HOURS)

    # Coda: stessa logica della pipeline — ig_score + bonus multi-fonte + penalità unsplash
    pending_rows = db.execute(text("""
        SELECT a.id, a.title, a.relevance_score, a.ig_score, a.published_at,
               a.ig_posted_at, a.ig_last_error, a.ig_last_error_at, a.ig_attempts,
               COUNT(s.id) AS source_count,
               COALESCE(a.ig_score, 0)
               - CASE WHEN a.image_url LIKE '%unsplash.com%' THEN 1.0 ELSE 0.0 END
               + LEAST((COUNT(s.id) - 1) * 0.5, 1.0)
               AS effective_ig_score
        FROM articles a
        LEFT JOIN sources s ON s.article_id = a.id
        WHERE (a.posted_to_ig IS NULL OR a.posted_to_ig = FALSE)
          AND a.ig_last_error IS NULL
          AND a.published_at >= :cutoff
        GROUP BY a.id, a.title, a.relevance_score, a.ig_score, a.published_at,
                 a.ig_posted_at, a.ig_last_error, a.ig_last_error_at, a.ig_attempts, a.image_url
        ORDER BY effective_ig_score DESC, a.published_at DESC
    """), {"cutoff": cutoff}).fetchall()
    pending = [dict(r._mapping) for r in pending_rows]

    pending_fallback = []  # non più usato, mantenuto per compatibilità frontend

    cutoff_48h = datetime.utcnow() - timedelta(hours=48)

    too_old = (
        db.query(Article)
        .filter((Article.posted_to_ig == False) | (Article.posted_to_ig == None))  # noqa: E712
        .filter(Article.ig_last_error == None)  # noqa: E711
        .filter(Article.published_at < cutoff)
        .filter(Article.published_at >= cutoff_48h)
        .order_by(func.coalesce(Article.ig_score, 0).desc(), Article.published_at.desc())
        .all()
    )

    recent_posted = (
        db.query(Article)
        .filter(Article.posted_to_ig == True)  # noqa: E712
        .order_by(Article.ig_posted_at.desc().nullslast())
        .limit(6)
        .all()
    )

    posted_today = (
        db.query(Article)
        .filter(Article.posted_to_ig == True)  # noqa: E712
        .filter(Article.published_at >= cutoff)
        .count()
    )

    failed = (
        db.query(Article)
        .filter((Article.posted_to_ig == False) | (Article.posted_to_ig == None))  # noqa: E712
        .filter(Article.ig_last_error != None)  # noqa: E711
        .order_by(Article.ig_last_error_at.desc(), Article.published_at.desc())
        .limit(10)
        .all()
    )

    def _fmt_dt(v):
        return v.isoformat() if v and hasattr(v, "isoformat") else v

    def _slim_orm(a: Article, source_count: int = 0) -> dict:
        return {
            "id": a.id,
            "title": a.title,
            "relevance_score": a.relevance_score,
            "ig_score": a.ig_score,
            "source_count": source_count,
            "published_at": _fmt_dt(a.published_at),
            "ig_posted_at": _fmt_dt(a.ig_posted_at),
            "ig_last_error": a.ig_last_error,
            "ig_last_error_at": _fmt_dt(a.ig_last_error_at),
            "ig_attempts": a.ig_attempts or 0,
        }

    def _slim_dict(d: dict) -> dict:
        return {
            "id": d["id"],
            "title": d["title"],
            "relevance_score": d["relevance_score"],
            "ig_score": d["ig_score"],
            "source_count": int(d.get("source_count", 0)),
            "published_at": _fmt_dt(d.get("published_at")),
            "ig_posted_at": _fmt_dt(d.get("ig_posted_at")),
            "ig_last_error": d.get("ig_last_error"),
            "ig_last_error_at": _fmt_dt(d.get("ig_last_error_at")),
            "ig_attempts": d.get("ig_attempts") or 0,
        }

    return {
        "posted_today": posted_today,
        "pending": [_slim_dict(a) for a in pending],
        "pending_fallback": [_slim_orm(a) for a in pending_fallback],
        "too_old": [_slim_orm(a) for a in too_old],
        "recent_posted": [_slim_orm(a) for a in recent_posted],
        "failed": [_slim_orm(a) for a in failed],
    }


@app.get("/health")
@app.head("/health")
def health():
    return {"status": "ok"}
