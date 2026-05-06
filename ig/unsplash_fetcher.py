# -*- coding: utf-8 -*-
"""
Image fetcher for FoxScan Instagram carousels.

Rules:
- cover: always use the FoxScan article image_url
- news slides: use Pexels only
- no Unsplash fallback and no cover copy fallback for news slides
- reject duplicate images within the same carousel and across recent carousels
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

_SLOT_FALLBACKS = {
    "slide_0": [
        "journalist newsroom monitor screen alert",
        "breaking news anchor desk tv",
        "reporter laptop technology",
    ],
    "slide_1": [
        "server rack data center hardware",
        "network infrastructure cables blue",
        "office technology computer",
    ],
    "slide_2": [
        "world map digital globe connections",
        "satellite dish technology sky",
        "global network fiber optic",
    ],
}

_KEY_TO_QUERY = {
    "cover": lambda d: d["cover_image_query"],
    "slide_0": lambda d: d["slides"][0]["image_query"],
    "slide_1": lambda d: d["slides"][1]["image_query"],
    "slide_2": lambda d: d["slides"][2]["image_query"],
}


def fetch_images(
    carousel_data: dict,
    out_dir: Path,
    article_image_url: str | None = None,
) -> dict[str, Path]:
    pexels_key = os.environ.get("PEXELS_API_KEY", "")
    if not pexels_key:
        raise RuntimeError("PEXELS_API_KEY non configurata: le slide Instagram usano solo Pexels")

    article_id = str(carousel_data.get("id") or "manual")
    run_id = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")

    results: dict[str, Path] = {}
    used_hashes: set[str] = set()
    recent_hashes = _load_recent_hashes()

    for key, query_fn in _KEY_TO_QUERY.items():
        dest = out_dir / f"_img_{article_id}_{run_id}_{key}.jpg"

        if key == "cover":
            if not article_image_url:
                raise RuntimeError("image_url articolo assente: impossibile generare la cover Instagram")
            path = _download_direct(article_image_url, dest, used_hashes, recent_hashes, reject_recent=False)
            if not path:
                raise RuntimeError("download image_url articolo fallito: impossibile generare la cover Instagram")
            logger.info("  [img] cover: immagine articolo FoxScan -> OK")
            results[key] = path
            time.sleep(0.4)
            continue

        query = query_fn(carousel_data)
        path = _download_pexels(query, dest, pexels_key, used_hashes, recent_hashes)

        if path is None:
            for fallback_query in _SLOT_FALLBACKS[key]:
                time.sleep(0.5)
                path = _download_pexels(fallback_query, dest, pexels_key, used_hashes, recent_hashes)
                if path:
                    break

        if path is None:
            logger.warning("  [img] %s: nessuna immagine Pexels distinta trovata", key)
            raise RuntimeError(f"Impossibile scaricare immagine Pexels distinta per '{key}'")

        results[key] = path
        time.sleep(0.4)

    _save_recent_hashes(recent_hashes)
    return results


def _download_pexels(
    query: str,
    dest: Path,
    api_key: str,
    used_hashes: set[str],
    recent_hashes: list[str],
) -> Path | None:
    params = urllib.parse.urlencode({
        "query": query,
        "per_page": 15,
        "orientation": "portrait",
    })
    url = PEXELS_API + "?" + params
    try:
        req = urllib.request.Request(
            url,
            headers={"Authorization": api_key, "User-Agent": "FoxScan/1.0"},
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
                logger.info("  [pexels] %s: '%s' -> OK", dest.name, query)
                return path

        logger.warning("  [pexels] '%s': risultati duplicati o download falliti", query)
        return None

    except Exception as e:
        logger.warning("  [pexels] '%s': %s", query, e)
        return None


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
        if not _register_unique_image(dest, used_hashes, recent_hashes, reject_recent):
            return None
        return dest
    except Exception as e:
        logger.warning("  [img] download diretto fallito: %s", e)
        return None


def _register_unique_image(
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
    unique_recent = list(dict.fromkeys(hashes))[-RECENT_HASH_LIMIT:]
    path.write_text(json.dumps(unique_recent), encoding="utf-8")
