# -*- coding: utf-8 -*-
"""
pipeline.py — Orchestratore FoxScan Instagram.

Flusso:
  DB (score>=8, posted_to_ig=False)
  → Groq (genera testi + image_query)
  → Unsplash (scarica 5 immagini)
  → generate_carousel (6 PNG)
  → Instagram (album_upload)
  → DB (posted_to_ig = True)
  → Cleanup file temporanei
"""

import json
import logging
import os
from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv(Path(__file__).parent / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

OUT_DIR = Path(__file__).parent / "carousel_output"
OUT_DIR.mkdir(exist_ok=True)

MIN_SCORE = 8


# ── Database ──────────────────────────────────────────────────────────────────

def _get_engine():
    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        raise RuntimeError("DATABASE_URL non impostata nel .env")
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    return create_engine(db_url, pool_pre_ping=True, pool_recycle=300)


def get_pending_articles(engine, max_posts: int = 1, hours: int = 36) -> list[dict]:
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    query = text("""
        SELECT id, title, summary, body, tags, relevance_score, ig_carousel_data, image_url
        FROM articles
        WHERE relevance_score >= :score
          AND (posted_to_ig IS NULL OR posted_to_ig = FALSE)
          AND published_at >= :cutoff
        ORDER BY relevance_score DESC, COALESCE(ig_score, 0) DESC, published_at DESC
        LIMIT :limit
    """)
    with engine.connect() as conn:
        rows = conn.execute(query, {"score": MIN_SCORE, "cutoff": cutoff, "limit": max_posts}).fetchall()
    return [dict(r._mapping) for r in rows]


def save_carousel_data(engine, article_id: int, data: dict) -> None:
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE articles SET ig_carousel_data = :data WHERE id = :id"),
            {"data": json.dumps(data, ensure_ascii=False), "id": article_id},
        )


def mark_as_posted(engine, article_id: int) -> None:
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE articles SET posted_to_ig = TRUE WHERE id = :id"),
            {"id": article_id},
        )


# ── Cleanup ───────────────────────────────────────────────────────────────────

def cleanup_temp_files() -> None:
    for f in OUT_DIR.glob("_img_*.jpg"):
        try:
            f.unlink()
        except OSError:
            pass
    for f in OUT_DIR.glob("slide_0*.png"):
        try:
            f.unlink()
        except OSError:
            pass


# ── Pipeline principale ───────────────────────────────────────────────────────

def run_pipeline(max_posts: int = 1) -> dict:
    if os.getenv("INSTAGRAM_ENABLED", "false").lower() != "true":
        logger.info("INSTAGRAM_ENABLED non attivo — pipeline ig saltata")
        return {"skipped": True}

    from generate_carousel import generate
    from groq_extractor import extract_carousel_data
    from instagram_poster import post_carousel
    from unsplash_fetcher import fetch_images

    engine = _get_engine()
    articles = get_pending_articles(engine, max_posts=max_posts)

    if not articles:
        logger.info("Nessun articolo pendente per Instagram (score>=%d)", MIN_SCORE)
        return {"posted": 0}

    stats = {"posted": 0, "errors": 0}

    for article in articles:
        article_id = article["id"]
        logger.info("Elaboro articolo #%d: %s", article_id, article["title"][:60])

        try:
            # Step 1: Groq (con cache nel DB)
            if article.get("ig_carousel_data"):
                logger.info("  → Groq: usando cache DB")
                carousel_data = json.loads(article["ig_carousel_data"])
            else:
                logger.info("  → Groq: genero contenuti...")
                carousel_data = extract_carousel_data(article)
                save_carousel_data(engine, article_id, carousel_data)

            # Aggiungo id e tags (necessari per la selezione del fox mascot)
            carousel_data["id"] = article_id
            tags = article.get("tags") or "[]"
            carousel_data["tags"] = json.loads(tags) if isinstance(tags, str) else tags

            # Step 2: Unsplash (+ immagine articolo dal sito come cover)
            logger.info("  → Unsplash: scarico immagini...")
            image_paths = fetch_images(carousel_data, OUT_DIR,
                                       article_image_url=article.get("image_url"))

            # Step 3: Genera PNG
            logger.info("  → Carousel: genero PNG...")
            slide_paths = generate(carousel_data, image_paths)

            # Step 4: Posta su Instagram
            logger.info("  -> Instagram: carico carosello...")
            post_carousel(
                slide_paths,
                carousel_data["cover_title"],
                groq_caption=carousel_data.get("caption"),
            )

            # Step 5: Aggiorna DB
            mark_as_posted(engine, article_id)
            logger.info("  → OK articolo #%d postato.", article_id)
            stats["posted"] += 1

        except Exception as e:
            logger.error("  → ERRORE articolo #%d: %s", article_id, e, exc_info=True)
            stats["errors"] += 1
            continue

        finally:
            cleanup_temp_files()

    logger.info("Pipeline ig completata: %s", stats)
    return stats


if __name__ == "__main__":
    import sys
    result = run_pipeline()
    print(result)
    sys.exit(0 if result.get("errors", 0) == 0 else 1)
