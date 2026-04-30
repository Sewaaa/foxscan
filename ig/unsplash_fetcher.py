# -*- coding: utf-8 -*-
"""
unsplash_fetcher.py — Scarica immagini da Unsplash per ogni slide del carosello.
Ogni slot ha fallback distinti per garantire varietà visiva tra le slide.
"""

import json
import os
import shutil
import time
import urllib.parse
import urllib.request
from pathlib import Path

UNSPLASH_API = "https://api.unsplash.com/photos/random"

# Fallback distinti per slot: se la query Groq fallisce, ogni slide usa un tema diverso
_SLOT_FALLBACKS = {
    "cover":   ["cyber attack dark night city", "hacker terminal screen dark", "surveillance camera city night"],
    "slide_0": ["journalist newsroom monitor screen", "breaking news alert tv", "reporter desk newspaper"],
    "slide_1": ["server rack data center blue", "network switch hardware blinking", "office technology computer screen"],
    "slide_2": ["world map digital globe connections", "satellite dish technology sky", "global network fiber optic"],
    "opinion": ["person laptop coffee home", "hand smartphone security app", "family computer living room"],
}

_KEY_TO_QUERY = {
    "cover":   lambda d: d["cover_image_query"],
    "slide_0": lambda d: d["slides"][0]["image_query"],
    "slide_1": lambda d: d["slides"][1]["image_query"],
    "slide_2": lambda d: d["slides"][2]["image_query"],
    "opinion": lambda d: d["opinion"]["image_query"],
}


def fetch_images(carousel_data: dict, out_dir: Path) -> dict[str, Path]:
    """
    Scarica le 5 immagini necessarie per il carosello.
    Usa fallback per slot distinti per garantire varietà visiva.
    """
    access_key = os.environ["UNSPLASH_ACCESS_KEY"]
    results: dict[str, Path] = {}
    cover_path: Path | None = None

    for key, query_fn in _KEY_TO_QUERY.items():
        primary_query = query_fn(carousel_data)
        dest = out_dir / f"_img_{key}.jpg"

        # Prova la query principale
        path = _download(primary_query, dest, access_key)

        # Fallback progressivi specifici per slot
        if path is None:
            for fallback_query in _SLOT_FALLBACKS[key]:
                time.sleep(0.8)
                path = _download(fallback_query, dest, access_key)
                if path:
                    break

        # Ultimo resort: copia cover (solo se non siamo la cover stessa)
        if path is None and cover_path is not None and key != "cover":
            shutil.copy2(cover_path, dest)
            path = dest
            print(f"  [unsplash] {key}: fallback finale -> copia cover")

        if path is None:
            raise RuntimeError(f"Impossibile scaricare immagine per '{key}' (query: '{primary_query}')")

        results[key] = path
        if key == "cover":
            cover_path = path

        time.sleep(0.4)

    return results


def _download(query: str, dest: Path, access_key: str) -> Path | None:
    params = (
        f"?query={urllib.parse.quote(query)}"
        f"&orientation=squarish"
        f"&client_id={access_key}"
    )
    url = UNSPLASH_API + params
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "FoxScan/1.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())

        raw_url = data["urls"]["raw"]
        img_url = raw_url + "&w=1080&h=1080&fit=crop&q=85"

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

    OUT_DIR = Path(r"C:\me\Progetti Personali\Foxscan-ig\carousel_output")
    demo_data = {
        "cover_image_query": "government building night cyber attack",
        "slides": [
            {"image_query": "journalist newsroom breaking alert screen"},
            {"image_query": "cisco router network rack data center"},
            {"image_query": "world map digital connections satellite"},
        ],
        "opinion": {"image_query": "person laptop home office coffee secure"},
    }
    paths = fetch_images(demo_data, OUT_DIR)
    for k, p in paths.items():
        print(f"  {k}: {p}")
