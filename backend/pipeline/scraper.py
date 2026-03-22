import logging
import re
from urllib.parse import urlparse

import trafilatura

from config import MAX_TEXT_CHARS_PER_ARTICLE

logger = logging.getLogger(__name__)

# Pattern di paragrafi da rimuovere: sponsor, podcast, newsletter, social follow, ecc.
_NOISE_PATTERNS = re.compile(
    r"(sponsor|supporta il podcast|segui il podcast|seguici su|unisciti a|"
    r"iscriviti alla newsletter|subscribe to|follow us|support the show|"
    r"smashing security plus|apple podcasts|podchaser|subreddit|"
    r"pubblicità|senza pubblicità|early.release|lasciando una recensione|"
    r"raccontando ai tuoi amici|puoi aiutare|join us on|find us on)",
    re.IGNORECASE,
)


def _clean_text(text: str) -> str:
    """Rimuove paragrafi che contengono contenuto non editoriale (sponsor, podcast, ecc.)."""
    paragraphs = text.split("\n")
    cleaned = [p for p in paragraphs if not _NOISE_PATTERNS.search(p)]
    return "\n".join(cleaned).strip()


def scrape_url(url: str) -> dict | None:
    """
    Scarica e estrae testo e immagine (og:image) di un articolo tramite trafilatura.
    Ritorna {"text": str, "image_url": str | None} oppure None se l'estrazione fallisce.
    """
    try:
        downloaded = trafilatura.fetch_url(url)
        if not downloaded:
            logger.warning(f"Download fallito per {url}")
            return None

        # Estrai metadata (og:image, title, ecc.)
        metadata = trafilatura.extract_metadata(downloaded)
        image_url = metadata.image if metadata and metadata.image else None

        text = trafilatura.extract(
            downloaded,
            include_comments=False,
            include_tables=False,
            no_fallback=False,
        )
        if not text:
            logger.warning(f"Estrazione testo fallita per {url}")
            return None

        text = _clean_text(text)

        if len(text) > MAX_TEXT_CHARS_PER_ARTICLE:
            text = text[:MAX_TEXT_CHARS_PER_ARTICLE] + "\n[...testo troncato...]"

        return {"text": text, "image_url": image_url}

    except Exception as e:
        logger.error(f"Errore scraping {url}: {e}")
        return None


def scrape_cluster(cluster: list[dict]) -> list[dict]:
    """
    Esegue lo scraping di tutti gli URL di un cluster.
    Se lo scraping fallisce, usa il contenuto RSS salvato in fase di discovery.
    Esclude solo gli item senza nessuna fonte di testo disponibile.
    """
    results = []
    for item in cluster:
        url = item.get("url", "")
        domain = urlparse(url).netloc

        scraped = scrape_url(url)

        if scraped:
            text = scraped["text"]
            image_url = scraped["image_url"]
            logger.info(f"Scraping OK: {url}")
        else:
            # Fallback: usa il contenuto RSS salvato durante la discovery
            rss_content = item.get("rss_content", "").strip()
            if rss_content:
                logger.info(f"Scraping fallito per {url}, uso contenuto RSS come fallback")
                text = rss_content
                image_url = None
            else:
                logger.warning(f"Skipping {url}: né scraping né contenuto RSS disponibili")
                continue

        results.append({**item, "text": text, "image_url": image_url, "domain": domain})

    return results
