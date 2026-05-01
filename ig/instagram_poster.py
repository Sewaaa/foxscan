# -*- coding: utf-8 -*-
"""
instagram_poster.py — Pubblica il carosello su Instagram via instagrapi.
"""

import os
import re
import random
import time
from pathlib import Path

from instagrapi import Client


def _strip_markdown(text: str) -> str:
    """Rimuove **grassetto** markdown (non supportato nelle caption IG)."""
    return re.sub(r'\*\*(.+?)\*\*', r'\1', text)

_IG_DATA_DIR = Path(os.getenv("IG_DATA_DIR", Path(__file__).parent))
_IG_DATA_DIR.mkdir(parents=True, exist_ok=True)
SESSION_FILE = _IG_DATA_DIR / "ig_session.json"

HASHTAG_POOL_IT = [
    "#sicurezzainformatica", "#cybersecurity", "#hacking", "#violazione",
    "#attaccoinformatico", "#privacy", "#protezionedata", "#notizie",
    "#tecnologia", "#digitale",
]
HASHTAG_POOL_EN = [
    "#infosec", "#cybernews", "#datasecurity", "#malware", "#ransomware",
    "#phishing", "#threatintelligence", "#cve", "#vulnerability", "#databreach",
]

_client: Client | None = None


def _get_client() -> Client:
    global _client
    if _client is not None:
        return _client

    username = os.environ["INSTAGRAM_USERNAME"]
    password = os.environ["INSTAGRAM_PASSWORD"]

    cl = Client()
    cl.delay_range = [1, 3]  # ritardo random tra le chiamate API (secondi)

    if SESSION_FILE.exists():
        # Sessione valida: la carichiamo senza rifar il login (evita challenge da nuovo IP)
        cl.load_settings(str(SESSION_FILE))
    else:
        # Primo avvio: login classico e salva sessione
        cl.login(username, password)
        cl.dump_settings(str(SESSION_FILE))

    _client = cl
    return cl


def _build_caption(cover_title: str, groq_caption: str | None = None) -> str:
    if groq_caption and len(groq_caption.strip()) > 40:
        caption = _strip_markdown(groq_caption.strip())
        if "foxscan.vercel.app" not in caption:
            caption += "\n\n🔗 www.foxscan.vercel.app"
        if "Scorri" not in caption:
            # inserisci il CTA prima degli hashtag
            parts = caption.rsplit("\n\n#", 1)
            if len(parts) == 2:
                caption = parts[0] + "\n\nScorti le slide per i dettagli ➡️\n\n#" + parts[1]
        return caption

    # Fallback se Groq non ha generato una caption
    hashtags_it = random.sample(HASHTAG_POOL_IT, 5)
    hashtags_en = random.sample(HASHTAG_POOL_EN, 4)
    return (
        f"🦊 {cover_title}\n\n"
        f"Scorri le slide per i dettagli ➡️\n\n"
        f"🔗 www.foxscan.vercel.app\n\n"
        f"{' '.join(hashtags_it + hashtags_en)}"
    )


def post_carousel(slide_paths: list[Path], cover_title: str, groq_caption: str | None = None) -> str:
    """
    Pubblica il carosello su Instagram.
    slide_paths: lista di 6 Path ai PNG
    cover_title: usato per la caption
    Ritorna il media_id del post pubblicato.
    """
    cl = _get_client()
    caption = _build_caption(cover_title, groq_caption)

    # Pausa random prima dell'upload per sembrare umano
    wait = random.uniform(15, 40)
    print(f"  [ig] Attendo {wait:.0f}s prima dell'upload...")
    time.sleep(wait)

    media = cl.album_upload(
        paths=[Path(p) for p in slide_paths],
        caption=caption,
    )
    print(f"  [ig] Carosello pubblicato: media_id={media.pk}")
    return str(media.pk)


def reset_session() -> None:
    """Elimina la sessione salvata (forza nuovo login al prossimo post)."""
    global _client
    _client = None
    if SESSION_FILE.exists():
        SESSION_FILE.unlink()
        print("  [ig] Sessione eliminata.")


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    print("Caption di esempio:")
    print(_build_caption("Hacker dentro le reti aziendali di tutto il mondo"))
