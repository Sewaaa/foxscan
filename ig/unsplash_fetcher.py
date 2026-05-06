# -*- coding: utf-8 -*-
"""
unsplash_fetcher.py — Scarica immagini per il carosello.
- Cover: usa image_url dell'articolo dal sito (più contestuale)
- Slides: Pexels (primario, se configurato) → Unsplash (fallback)
"""

import json
import hashlib
import os
import random
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

UNSPLASH_API = "https://api.unsplash.com/photos/random"
PEXELS_API   = "https://api.pexels.com/v1/search"
RECENT_HASH_LIMIT = 300

# Aziende tech riconoscibili → query ottimizzate
_COMPANY_QUERIES = {
    "google":     "Google Googleplex headquarters campus building",
    "microsoft":  "Microsoft campus Redmond headquarters office",
    "apple":      "Apple Park headquarters campus aerial",
    "meta":       "Meta Facebook headquarters Menlo Park office",
    "facebook":   "Meta Facebook headquarters Menlo Park office",
    "amazon":     "Amazon headquarters Seattle campus building",
    "aws":        "Amazon AWS cloud data center building",
    "nvidia":     "Nvidia headquarters Santa Clara campus building",
    "openai":     "OpenAI San Francisco office building tech",
    "cisco":      "Cisco headquarters San Jose campus building",
    "fortinet":   "Fortinet headquarters Sunnyvale office building",
    "palo alto":  "Palo Alto Networks headquarters building campus",
    "crowdstrike":"CrowdStrike cybersecurity office building",
    "nsa":        "NSA National Security Agency headquarters building",
    "cisa":       "government cybersecurity agency headquarters building",
    "fbi":        "FBI headquarters building Washington DC",
    "samsung":    "Samsung headquarters Seoul building campus",
    "intel":      "Intel headquarters Santa Clara campus building",
    "amd":        "AMD headquarters Santa Clara campus building",
    "tesla":      "Tesla headquarters Fremont factory building",
    "twitter":    "X Twitter headquarters San Francisco building",
    "x corp":     "X Twitter headquarters San Francisco building",
    "tiktok":     "TikTok ByteDance headquarters office building",
    "cloudflare": "Cloudflare San Francisco office headquarters",
    "github":     "GitHub Microsoft developer office tech",
}

# Fallback distinti per slot
_SLOT_FALLBACKS = {
    "cover":   ["cyber attack dark city network", "hacker terminal screen dark", "surveillance digital security"],
    "slide_0": ["journalist newsroom monitor screen alert", "breaking news anchor desk tv", "reporter laptop technology"],
    "slide_1": ["server rack data center hardware", "network infrastructure cables blue", "office technology computer"],
    "slide_2": ["world map digital globe connections", "satellite dish technology sky", "global network fiber optic"],
}

_KEY_TO_QUERY = {
    "cover":   lambda d: d["cover_image_query"],
    "slide_0": lambda d: d["slides"][0]["image_query"],
    "slide_1": lambda d: d["slides"][1]["image_query"],
    "slide_2": lambda d: d["slides"][2]["image_query"],
}


def _detect_company(text: str) -> str | None:
    lower = text.lower()
    for company, query in _COMPANY_QUERIES.items():
        if re.search(r'\b' + re.escape(company) + r'\b', lower):
            return query
    return None


def fetch_images(carousel_data: dict, out_dir: Path,
                 article_image_url: str | None = None) -> dict[str, Path]:
    """
    Scarica le immagini per il carosello.
    Ordine tentativi per ogni slot:
      1. article_image_url (solo cover)
      2. Pexels con query Groq/company, se configurato
      3. Unsplash con query Groq/company
      4. Fallback slot via Pexels → Unsplash
      5. Errore se non esiste nessuna immagine distinta per lo slot
    """
    unsplash_key = os.environ.get("UNSPLASH_ACCESS_KEY", "")
    pexels_key   = os.environ.get("PEXELS_API_KEY", "")
    use_pexels   = bool(pexels_key)

    article_id = str(carousel_data.get("id") or "manual")
    run_id = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")

    results: dict[str, Path] = {}
    cover_path: Path | None = None
    used_hashes: set[str] = set()
    recent_hashes = _load_recent_hashes()

    article_text = " ".join([
        carousel_data.get("cover_title", ""),
        " ".join(s.get("text", "") for s in carousel_data.get("slides", [])),
    ])

    for key, query_fn in _KEY_TO_QUERY.items():
        dest = out_dir / f"_img_{article_id}_{run_id}_{key}.jpg"
        path: Path | None = None

        # 1. Cover: immagine articolo dal sito
        if key == "cover" and article_image_url:
            path = _download_direct(article_image_url, dest, used_hashes, recent_hashes, reject_recent=False)
            if path:
                print(f"  [img] cover: articolo dal sito -> OK")

        # 2. Company detection per cover e slide_0
        if path is None:
            company_query = _detect_company(article_text)
            if company_query and key in ("cover", "slide_0"):
                reject_recent = key != "cover"
                if use_pexels:
                    path = _download_pexels(company_query, dest, pexels_key, used_hashes, recent_hashes, reject_recent)
                if path is None and unsplash_key:
                    path = _download_unsplash(company_query, dest, unsplash_key, used_hashes, recent_hashes, reject_recent)

        # 3. Query generata da Groq
        if path is None:
            primary_query = query_fn(carousel_data)
            reject_recent = key != "cover"
            if use_pexels:
                path = _download_pexels(primary_query, dest, pexels_key, used_hashes, recent_hashes, reject_recent)
            if path is None and unsplash_key:
                path = _download_unsplash(primary_query, dest, unsplash_key, used_hashes, recent_hashes, reject_recent)

        # 4. Fallback per slot
        if path is None:
            for fallback_query in _SLOT_FALLBACKS[key]:
                time.sleep(0.5)
                if use_pexels:
                    path = _download_pexels(fallback_query, dest, pexels_key, used_hashes, recent_hashes, reject_recent=True)
                if path is None and unsplash_key:
                    path = _download_unsplash(fallback_query, dest, unsplash_key, used_hashes, recent_hashes, reject_recent=True)
                if path:
                    break

        # 5. Niente copia della cover sulle slide: se Pexels/Unsplash falliscono,
        # meglio far fallire il post che pubblicare slide con sfondi duplicati.
        if path is None and cover_path is not None and key != "cover":
            print(f"  [img] WARN {key}: nessuna immagine distinta trovata")

        if path is None:
            raise RuntimeError(f"Impossibile scaricare immagine per '{key}'")

        results[key] = path
        if key == "cover":
            cover_path = path

        time.sleep(0.4)

    _save_recent_hashes(recent_hashes)
    return results


def _download_pexels(
    query: str,
    dest: Path,
    api_key: str,
    used_hashes: set[str],
    recent_hashes: list[str],
    reject_recent: bool,
) -> Path | None:
    params = urllib.parse.urlencode({
        "query":       query,
        "per_page":    10,
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
            print(f"  [pexels] WARN '{query}': nessun risultato")
            return None

        random.shuffle(photos)
        for photo in photos:
            img_url = photo.get("src", {}).get("large2x", "")
            if not img_url:
                continue
            path = _download_direct(img_url, dest, used_hashes, recent_hashes, reject_recent)
            if path:
                print(f"  [pexels] {dest.name}: '{query}' -> OK")
                return path

        print(f"  [pexels] WARN '{query}': tutti i download falliti")
        return None

    except Exception as e:
        print(f"  [pexels] WARN '{query}': {e}")
        return None


def _download_unsplash(
    query: str,
    dest: Path,
    access_key: str,
    used_hashes: set[str],
    recent_hashes: list[str],
    reject_recent: bool,
) -> Path | None:
    params = (
        f"?query={urllib.parse.quote(query)}"
        f"&orientation=portrait"
        f"&count=5"
        f"&client_id={access_key}"
    )
    url = UNSPLASH_API + params
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "FoxScan/1.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())

        photos = data if isinstance(data, list) else [data]
        random.shuffle(photos)
        for photo in photos:
            raw_url = photo["urls"]["raw"]
            img_url = raw_url + "&w=1080&h=1350&fit=crop&q=85"
            path = _download_direct(img_url, dest, used_hashes, recent_hashes, reject_recent)
            if path:
                print(f"  [unsplash] {dest.name}: '{query}' -> OK")
                return path

        print(f"  [unsplash] WARN '{query}': risultati duplicati o download falliti")
        return None

    except Exception as e:
        print(f"  [unsplash] WARN '{query}': {e}")
        return None


def _download_direct(
    url: str,
    dest: Path,
    used_hashes: set[str] | None = None,
    recent_hashes: list[str] | None = None,
    reject_recent: bool = True,
) -> Path | None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "FoxScan/1.0"})
        with urllib.request.urlopen(req, timeout=15) as r, open(dest, "wb") as f:
            f.write(r.read())
        if used_hashes is not None and recent_hashes is not None:
            if not _register_unique_image(dest, used_hashes, recent_hashes, reject_recent):
                return None
        elif used_hashes is not None and not _register_unique_image(dest, used_hashes, [], False):
            return None
        return dest
    except Exception as e:
        print(f"  [img] WARN download diretto fallito: {e}")
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
        print(f"  [img] WARN {path.name}: immagine duplicata scartata")
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


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()

    OUT_DIR = Path(r"C:\me\Progetti Personali\Foxscan\ig\carousel_output")
    demo_data = {
        "cover_title": "Google esposta: vulnerabilità critica nei suoi server",
        "cover_image_query": "government building night cyber attack",
        "slides": [
            {"text": "Google ha rilevato una falla.", "image_query": "journalist newsroom breaking alert screen"},
            {"text": "I sistemi colpiti.", "image_query": "cisco router network rack data center"},
            {"text": "Il quadro completo.", "image_query": "world map digital connections satellite"},
        ],
    }
    paths = fetch_images(demo_data, OUT_DIR)
    for k, p in paths.items():
        print(f"  {k}: {p}")
