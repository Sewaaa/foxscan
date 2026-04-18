import gc
import hashlib
import logging
import re
from datetime import datetime
from urllib.parse import urlparse

import feedparser
from sqlalchemy.orm import Session

from config import RSS_FEEDS

logger = logging.getLogger(__name__)


def _hash_url(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()


def _extract_rss_content(entry) -> str:
    """Estrae il testo dal campo content o summary dell'entry RSS, strippando l'HTML."""
    text = ""
    # Prova prima content (più completo), poi summary
    if hasattr(entry, "content") and entry.content:
        text = entry.content[0].get("value", "")
    if not text and hasattr(entry, "summary"):
        text = entry.summary or ""
    # Strip tag HTML
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:3000]  # stesso limite del scraper


def fetch_new_items(db: Session) -> list[dict]:
    """
    Interroga tutti i feed RSS configurati e restituisce gli item non ancora visti.
    Persiste i nuovi URL in rss_items con processed=False.
    """
    from models import RssItem

    new_items: list[dict] = []

    for feed_url in RSS_FEEDS:
        logger.info(f"Fetching feed: {feed_url}")
        try:
            parsed = feedparser.parse(feed_url)
        except Exception as e:
            logger.error(f"Errore nel parsing di {feed_url}: {e}")
            continue

        for entry in parsed.entries:
            url = entry.get("link", "").strip()
            if not url:
                continue

            url_hash = _hash_url(url)
            exists = db.query(RssItem).filter(RssItem.url_hash == url_hash).first()
            if exists:
                continue

            title = entry.get("title", "").strip()
            domain = urlparse(feed_url).netloc
            rss_content = _extract_rss_content(entry)

            item = RssItem(
                url_hash=url_hash,
                url=url,
                title=title,
                feed_source=domain,
                rss_content=rss_content or None,
                discovered_at=datetime.utcnow(),
                processed=False,
            )
            db.add(item)
            new_items.append({"url": url, "title": title, "feed_source": domain})

        # Libera subito il feed parsato — ogni feed può occupare svariati MB
        del parsed
        gc.collect()

    db.commit()
    logger.info(f"Scoperti {len(new_items)} nuovi articoli")
    return new_items


def get_unprocessed_items(db: Session, limit: int = 20) -> list[dict]:
    from models import RssItem

    rows = (
        db.query(RssItem)
        .filter(RssItem.processed == False)  # noqa: E712
        .order_by(RssItem.discovered_at.asc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": r.id,
            "url": r.url,
            "title": r.title,
            "feed_source": r.feed_source,
            "rss_content": r.rss_content or "",
            "discovered_at": r.discovered_at,
        }
        for r in rows
    ]


def mark_processed(db: Session, item_ids: list[int]) -> None:
    from models import RssItem

    db.query(RssItem).filter(RssItem.id.in_(item_ids)).update(
        {"processed": True}, synchronize_session="fetch"
    )
    db.commit()
