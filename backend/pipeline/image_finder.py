"""
Cerca un'immagine rilevante su Unsplash basandosi su una query testuale.
Richiede UNSPLASH_ACCESS_KEY nel file .env.
"""
import logging
import os

import httpx

logger = logging.getLogger(__name__)

UNSPLASH_SEARCH_URL = "https://api.unsplash.com/search/photos"


def find_image(query: str) -> str | None:
    """
    Cerca un'immagine landscape su Unsplash coerente con la query.
    Ritorna l'URL `regular` (1080px) o None se non trovata / API key assente.
    """
    access_key = os.getenv("UNSPLASH_ACCESS_KEY")
    if not access_key:
        logger.debug("UNSPLASH_ACCESS_KEY non configurata, ricerca immagine saltata")
        return None

    if not query or not query.strip():
        return None

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(
                UNSPLASH_SEARCH_URL,
                params={"query": query.strip(), "per_page": 3, "orientation": "landscape"},
                headers={"Authorization": f"Client-ID {access_key}"},
            )
            resp.raise_for_status()
            results = resp.json().get("results", [])
            if results:
                # Preferisce immagini con buona risoluzione
                return results[0]["urls"]["regular"]
    except httpx.HTTPStatusError as e:
        logger.warning(f"Unsplash HTTP {e.response.status_code} per query '{query}'")
    except Exception as e:
        logger.warning(f"Ricerca immagine fallita per '{query}': {e}")

    return None
