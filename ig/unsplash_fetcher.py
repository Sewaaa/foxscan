# -*- coding: utf-8 -*-
"""
unsplash_fetcher.py — Scarica immagini per il carosello.
- Cover: usa image_url dell'articolo dal sito (più contestuale)
- Slides: Unsplash con query arricchite dal nome azienda se rilevabile
"""

import json
import os
import random
import re
import shutil
import time
import urllib.parse
import urllib.request
from pathlib import Path

UNSPLASH_API = "https://api.unsplash.com/photos/random"

# Aziende tech riconoscibili → query Unsplash ottimizzate
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
    # opinion rimossa: slide 5 usa sfondo gradiente statico
}

_KEY_TO_QUERY = {
    "cover":   lambda d: d["cover_image_query"],
    "slide_0": lambda d: d["slides"][0]["image_query"],
    "slide_1": lambda d: d["slides"][1]["image_query"],
    "slide_2": lambda d: d["slides"][2]["image_query"],
    # opinion rimossa: slide 5 usa sfondo gradiente statico
}


def _detect_company(text: str) -> str | None:
    """Restituisce la query Unsplash ottimizzata se rileva un'azienda nota nel testo."""
    lower = text.lower()
    for company, query in _COMPANY_QUERIES.items():
        if re.search(r'\b' + re.escape(company) + r'\b', lower):
            return query
    return None


def fetch_images(carousel_data: dict, out_dir: Path,
                 article_image_url: str | None = None) -> dict[str, Path]:
    """
    Scarica le 5 immagini per il carosello.
    - cover: usa article_image_url se disponibile (immagine dell'articolo dal sito)
    - slide_0/1/2: Unsplash con company detection automatica
    - opinion: nessuna immagine (sfondo gradiente statico nella slide)
    """
    access_key = os.environ["UNSPLASH_ACCESS_KEY"]
    results: dict[str, Path] = {}
    cover_path: Path | None = None

    # Testo articolo per company detection
    article_text = " ".join([
        carousel_data.get("cover_title", ""),
        " ".join(s.get("text", "") for s in carousel_data.get("slides", [])),
    ])

    for key, query_fn in _KEY_TO_QUERY.items():
        dest = out_dir / f"_img_{key}.jpg"
        path: Path | None = None

        # Cover: usa immagine articolo dal sito se disponibile
        if key == "cover" and article_image_url:
            path = _download_direct(article_image_url, dest)
            if path:
                print(f"  [img] cover: articolo dal sito -> OK")

        if path is None:
            # Prova company detection prima della query Groq
            company_query = _detect_company(article_text)
            if company_query and key in ("cover", "slide_0"):
                path = _download_unsplash(company_query, dest, access_key)

        if path is None:
            # Query generata da Groq
            primary_query = query_fn(carousel_data)
            path = _download_unsplash(primary_query, dest, access_key)

        # Fallback progressivi per slot
        if path is None:
            for fallback_query in _SLOT_FALLBACKS[key]:
                time.sleep(0.8)
                path = _download_unsplash(fallback_query, dest, access_key)
                if path:
                    break

        # Ultimo resort: copia cover
        if path is None and cover_path is not None and key != "cover":
            shutil.copy2(cover_path, dest)
            path = dest
            print(f"  [img] {key}: fallback finale -> copia cover")

        if path is None:
            raise RuntimeError(f"Impossibile scaricare immagine per '{key}'")

        results[key] = path
        if key == "cover":
            cover_path = path

        time.sleep(0.4)

    return results


def _download_direct(url: str, dest: Path) -> Path | None:
    """Scarica un'immagine direttamente da URL."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "FoxScan/1.0"})
        with urllib.request.urlopen(req, timeout=15) as r, open(dest, "wb") as f:
            f.write(r.read())
        return dest
    except Exception as e:
        print(f"  [img] WARN download diretto fallito: {e}")
        return None


def _download_unsplash(query: str, dest: Path, access_key: str) -> Path | None:
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

        photo = random.choice(data) if isinstance(data, list) else data
        raw_url = photo["urls"]["raw"]
        img_url = raw_url + "&w=1080&h=1350&fit=crop&q=85"

        img_req = urllib.request.Request(img_url, headers={"User-Agent": "FoxScan/1.0"})
        with urllib.request.urlopen(img_req, timeout=15) as r, open(dest, "wb") as f:
            f.write(r.read())

        print(f"  [unsplash] {dest.name}: '{query}' -> OK")
        return dest

    except Exception as e:
        print(f"  [unsplash] WARN '{query}': {e}")
        return None


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
        "opinion": {"text": "Consiglio.", "image_query": "person laptop home office coffee secure"},
    }
    paths = fetch_images(demo_data, OUT_DIR)
    for k, p in paths.items():
        print(f"  {k}: {p}")
