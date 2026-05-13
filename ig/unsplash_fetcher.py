# -*- coding: utf-8 -*-
"""
image_fetcher.py (importato come unsplash_fetcher per compatibilità)

Regole immagini carosello Instagram FoxScan:
  - cover (slide 1)    : sempre l'image_url dell'articolo da FoxScan (Pexels/backend)
  - slide_0/1/2 (2-4) : Pexels, usando le image_query generate da Groq
  - slide opinion (5)  : sfondo statico — nessuna immagine
  - slide CTA (6)      : sfondo statico — nessuna immagine
"""

import hashlib
import json
import logging
import os
import random
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

PEXELS_API = "https://api.pexels.com/v1/search"
RECENT_HASH_LIMIT = 300

logger = logging.getLogger(__name__)

_SLOT_FALLBACKS: dict[str, list[str]] = {
    "slide_0": [
        "journalist newsroom monitor screen alert",
        "breaking news anchor desk tv",
        "reporter laptop technology workspace",
    ],
    "slide_1": [
        "server rack data center hardware blue",
        "network infrastructure cables technology",
        "office technology computer workspace",
    ],
    "slide_2": [
        "world map digital globe connections",
        "satellite dish technology sky",
        "global network fiber optic abstract",
    ],
}


def fetch_images(
    carousel_data: dict,
    out_dir: Path,
    article_image_url: str | None = None,
) -> dict[str, Path]:
    """
    Scarica le immagini per il carosello e ritorna:
      {"cover": Path, "slide_0": Path, "slide_1": Path, "slide_2": Path}

    - cover    : scaricato direttamente da article_image_url (obbligatorio)
    - slide_0/1/2 : scaricati da Pexels usando carousel_data["slides"][i]["image_query"]
    """
    pexels_key = os.environ.get("PEXELS_API_KEY", "")
    if not pexels_key:
        raise RuntimeError("PEXELS_API_KEY non configurata nel .env")

    article_id = str(carousel_data.get("id") or "manual")
    run_id = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
    used_hashes: set[str] = set()
    recent_hashes = _load_recent_hashes()
    results: dict[str, Path] = {}

    # ── Cover: immagine copertina articolo FoxScan (opzionale in v9+) ─────────
    # In v9 la cover è sfondo solido — se article_image_url è None si salta.
    if article_image_url:
        cover_dest = out_dir / f"_img_{article_id}_{run_id}_cover.jpg"
        cover_path = _download_direct(
            article_image_url, cover_dest, used_hashes, recent_hashes, reject_recent=False
        )
        if not cover_path:
            logger.warning("  [img] cover: download fallito (%s) — slide cover userà sfondo solido", article_image_url)
        else:
            logger.info("  [img] cover: immagine articolo FoxScan → OK")
            results["cover"] = cover_path
            time.sleep(0.3)
    else:
        logger.info("  [img] cover: article_image_url assente — cover usa sfondo solido (v9)")

    # ── Slide 2-4: Pexels ─────────────────────────────────────────────────────
    slides = carousel_data.get("slides", [])
    if len(slides) < 3:
        raise RuntimeError(f"carousel_data.slides incompleto: attese 3 voci, trovate {len(slides)}")

    for i, key in enumerate(["slide_0", "slide_1", "slide_2"]):
        query = slides[i].get("image_query", "")
        dest = out_dir / f"_img_{article_id}_{run_id}_{key}.jpg"

        path = _download_pexels(query, dest, pexels_key, used_hashes, recent_hashes)

        if path is None and query:
            logger.info("  [img] %s: query principale esaurita, provo fallback", key)
            for fallback_query in _SLOT_FALLBACKS[key]:
                time.sleep(0.5)
                path = _download_pexels(fallback_query, dest, pexels_key, used_hashes, recent_hashes)
                if path:
                    break

        if path is None:
            raise RuntimeError(f"Nessuna immagine Pexels distinta trovata per '{key}' (query: {query!r})")

        results[key] = path
        logger.info("  [img] %s → OK", key)
        time.sleep(0.3)

    _save_recent_hashes(recent_hashes)
    return results


# ── Pexels ────────────────────────────────────────────────────────────────────

def _download_pexels(
    query: str,
    dest: Path,
    api_key: str,
    used_hashes: set[str],
    recent_hashes: list[str],
) -> Path | None:
    if not query:
        return None
    params = urllib.parse.urlencode({
        "query": query,
        "per_page": 15,
        "orientation": "portrait",
    })
    url = PEXELS_API + "?" + params
    try:
        req = urllib.request.Request(
            url, headers={"Authorization": api_key, "User-Agent": "FoxScan/1.0"}
        )
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())

        photos = data.get("photos", [])
        if not photos:
            logger.warning("  [pexels] '%s': nessun risultato", query)
            return None

        random.shuffle(photos)
        for photo in photos:
            img_url = photo.get("src", {}).get("large2x", "")
            if not img_url:
                continue
            path = _download_direct(img_url, dest, used_hashes, recent_hashes, reject_recent=True)
            if path:
                logger.info("  [pexels] '%s' → OK", query)
                return path

        logger.warning("  [pexels] '%s': tutti i risultati duplicati o falliti", query)
        return None

    except Exception as e:
        logger.warning("  [pexels] '%s': errore — %s", query, e)
        return None


# ── Download diretto ──────────────────────────────────────────────────────────

def _download_direct(
    url: str,
    dest: Path,
    used_hashes: set[str],
    recent_hashes: list[str],
    reject_recent: bool,
) -> Path | None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "FoxScan/1.0"})
        with urllib.request.urlopen(req, timeout=15) as r, open(dest, "wb") as f:
            f.write(r.read())
        if not _register_unique(dest, used_hashes, recent_hashes, reject_recent):
            return None
        return dest
    except Exception as e:
        logger.warning("  [img] download fallito (%s): %s", url, e)
        return None


def _register_unique(
    path: Path,
    used_hashes: set[str],
    recent_hashes: list[str],
    reject_recent: bool,
) -> bool:
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest in used_hashes or (reject_recent and digest in recent_hashes):
        try:
            path.unlink()
        except OSError:
            pass
        logger.warning("  [img] %s: immagine duplicata scartata", path.name)
        return False
    used_hashes.add(digest)
    recent_hashes.append(digest)
    del recent_hashes[:-RECENT_HASH_LIMIT]
    return True


# ── Persistenza hash recenti (anti-ripetizione tra caroselli) ─────────────────

def _recent_hashes_path() -> Path:
    data_dir = Path(os.environ.get("IG_DATA_DIR", Path(__file__).parent / "ig_data"))
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir / "recent_image_hashes.json"


def _load_recent_hashes() -> list[str]:
    path = _recent_hashes_path()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            return [str(x) for x in data][-RECENT_HASH_LIMIT:]
    except Exception:
        pass
    return []


def _save_recent_hashes(hashes: list[str]) -> None:
    path = _recent_hashes_path()
    unique = list(dict.fromkeys(hashes))[-RECENT_HASH_LIMIT:]
    path.write_text(json.dumps(unique), encoding="utf-8")
