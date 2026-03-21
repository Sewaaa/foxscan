import logging
from urllib.parse import urlparse

import trafilatura

from config import MAX_TEXT_CHARS_PER_ARTICLE

logger = logging.getLogger(__name__)


def scrape_url(url: str) -> str | None:
    """
    Scarica e estrae il testo pulito di un articolo tramite trafilatura.
    Ritorna None se l'estrazione fallisce.
    """
    try:
        downloaded = trafilatura.fetch_url(url)
        if not downloaded:
            logger.warning(f"Download fallito per {url}")
            return None

        text = trafilatura.extract(
            downloaded,
            include_comments=False,
            include_tables=False,
            no_fallback=False,
        )
        if not text:
            logger.warning(f"Estrazione testo fallita per {url}")
            return None

        if len(text) > MAX_TEXT_CHARS_PER_ARTICLE:
            text = text[:MAX_TEXT_CHARS_PER_ARTICLE] + "\n[...testo troncato...]"

        return text

    except Exception as e:
        logger.error(f"Errore scraping {url}: {e}")
        return None


def scrape_cluster(cluster: list[dict]) -> list[dict]:
    """
    Esegue lo scraping di tutti gli URL di un cluster.
    Restituisce la lista degli item con campo 'text' aggiunto.
    Esclude gli item dove lo scraping fallisce.
    """
    results = []
    for item in cluster:
        url = item.get("url", "")
        text = scrape_url(url)
        if text:
            domain = urlparse(url).netloc
            results.append({**item, "text": text, "domain": domain})
        else:
            logger.warning(f"Skipping {url}: testo non disponibile")

    return results
