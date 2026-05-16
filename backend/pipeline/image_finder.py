"""
Cerca un'immagine rilevante su Unsplash basandosi su una query testuale.
Richiede UNSPLASH_ACCESS_KEY nel file .env.
"""
import logging
import os
import random

import httpx

logger = logging.getLogger(__name__)

UNSPLASH_SEARCH_URL = "https://api.unsplash.com/search/photos"

# Quanti risultati recuperare per poi sceglierne uno casuale
_PER_PAGE = 10
# Quanti dei top risultati considerare per la scelta casuale
# (i primi sono più rilevanti, ma ruotiamo tra loro per varietà)
_PICK_FROM_TOP = 5


def find_image(query: str) -> str | None:
    """
    Cerca un'immagine landscape su Unsplash coerente con la query.
    Ritorna l'URL `regular` (1080px) o None se non trovata / API key assente.
    Sceglie casualmente tra i primi _PICK_FROM_TOP risultati per evitare
    che la stessa foto appaia su tutti gli articoli.
    """
    from dotenv import load_dotenv
    load_dotenv()

    access_key = os.getenv("UNSPLASH_ACCESS_KEY")
    if not access_key:
        logger.warning("UNSPLASH_ACCESS_KEY non configurata — immagine non cercata")
        return None

    if not query or not query.strip():
        logger.debug("Query immagine vuota, skip Unsplash")
        return None

    # Aggiunge "cybersecurity" alla query per evitare risultati fuori contesto
    # (es. "Windows vulnerability" → foto di finestre rotte invece di schermi)
    safe_query = query.strip()
    if "cybersecurity" not in safe_query.lower() and "cyber" not in safe_query.lower():
        safe_query = f"{safe_query} cybersecurity"

    logger.info(f"Ricerca Unsplash: '{safe_query}'")
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(
                UNSPLASH_SEARCH_URL,
                params={"query": safe_query, "per_page": _PER_PAGE, "orientation": "landscape"},
                headers={"Authorization": f"Client-ID {access_key}"},
            )
            resp.raise_for_status()
            results = resp.json().get("results", [])
            if results:
                # Sceglie casualmente tra i primi _PICK_FROM_TOP risultati
                pool = results[:_PICK_FROM_TOP]
                chosen = random.choice(pool)
                url = chosen["urls"]["regular"]
                logger.info(f"Immagine scelta (1 di {len(pool)}): {url[:80]}...")
                return url
            logger.warning(f"Nessun risultato Unsplash per '{safe_query}'")
    except httpx.HTTPStatusError as e:
        logger.warning(f"Unsplash HTTP {e.response.status_code} per query '{safe_query}': {e.response.text[:200]}")
    except Exception as e:
        logger.warning(f"Ricerca immagine fallita per '{safe_query}': {e}")

    return None
