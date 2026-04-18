import ipaddress
import logging
import re
import socket
from concurrent.futures import ThreadPoolExecutor, as_completed
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


def _is_safe_url(url: str) -> bool:
    """Blocca URL che puntano a IP privati/loopback/link-local (SSRF protection).
    Fail-open: se DNS non si risolve o la verifica fallisce, lascia passare
    (il rischio SSRF reale viene da IP interni espliciti, non da DNS failure).
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        hostname = parsed.hostname
        if not hostname:
            return False
        ip = ipaddress.ip_address(socket.gethostbyname(hostname))
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            logger.warning(f"SSRF blocked: {url} → {ip}")
            return False
        return True
    except Exception:
        return True  # fail-open: DNS failure non è un attacco SSRF


def scrape_url(url: str) -> dict | None:
    """
    Scarica e estrae testo e immagine (og:image) di un articolo tramite trafilatura.
    Ritorna {"text": str, "image_url": str | None} oppure None se l'estrazione fallisce.
    """
    if not _is_safe_url(url):
        logger.warning(f"Scraping bloccato (URL non sicuro): {url}")
        return None
    try:
        downloaded = trafilatura.fetch_url(url)
        if not downloaded:
            logger.warning(f"Download fallito per {url}")
            return None

        # Tronca l'HTML grezzo a 2MB prima di passarlo a trafilatura:
        # pagine più grandi (JS-heavy, immagini inline) non aggiungono testo utile
        # ma consumano molta RAM durante il parsing.
        if len(downloaded) > 2_000_000:
            downloaded = downloaded[:2_000_000]

        # Estrai metadata (og:image, title, ecc.)
        metadata = trafilatura.extract_metadata(downloaded)
        image_url = metadata.image if metadata and metadata.image else None

        text = trafilatura.extract(
            downloaded,
            include_comments=False,
            include_tables=False,
            no_fallback=False,
        )

        # Libera subito l'HTML grezzo — può pesare svariati MB
        del downloaded

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


def _scrape_item(item: dict) -> dict | None:
    """Scraping di un singolo item, con fallback RSS. Usato in parallelo."""
    url = item.get("url", "")
    domain = urlparse(url).netloc
    scraped = scrape_url(url)

    if scraped:
        logger.info(f"Scraping OK: {url}")
        return {**item, "text": scraped["text"], "image_url": scraped["image_url"], "domain": domain}

    rss_content = item.get("rss_content", "").strip()
    if rss_content:
        logger.info(f"Scraping fallito per {url}, uso contenuto RSS come fallback")
        return {**item, "text": rss_content, "image_url": None, "domain": domain}

    logger.warning(f"Skipping {url}: né scraping né contenuto RSS disponibili")
    return None


def scrape_cluster(cluster: list[dict]) -> list[dict]:
    """
    Esegue lo scraping di tutti gli URL di un cluster in parallelo (max 5 thread).
    Se lo scraping fallisce, usa il contenuto RSS salvato in fase di discovery.
    """
    results = []
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = {executor.submit(_scrape_item, item): item for item in cluster}
        for future in as_completed(futures):
            result = future.result()
            if result:
                results.append(result)
    return results
