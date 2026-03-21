import hashlib
import logging
from datetime import datetime
from urllib.parse import urlparse

import feedparser
from sqlalchemy.orm import Session

from config import RSS_FEEDS

logger = logging.getLogger(__name__)


def _hash_url(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()


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

            item = RssItem(
                url_hash=url_hash,
                url=url,
                title=title,
                feed_source=domain,
                discovered_at=datetime.utcnow(),
                processed=False,
            )
            db.add(item)
            new_items.append({"url": url, "title": title, "feed_source": domain})

    db.commit()
    logger.info(f"Scoperti {len(new_items)} nuovi articoli")
    return new_items


def get_unprocessed_items(db: Session) -> list[dict]:
    from models import RssItem

    rows = db.query(RssItem).filter(RssItem.processed == False).all()  # noqa: E712
    return [{"id": r.id, "url": r.url, "title": r.title, "feed_source": r.feed_source} for r in rows]


def mark_processed(db: Session, item_ids: list[int]) -> None:
    from models import RssItem

    db.query(RssItem).filter(RssItem.id.in_(item_ids)).update(
        {"processed": True}, synchronize_session="fetch"
    )
    db.commit()
