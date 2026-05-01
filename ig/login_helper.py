# -*- coding: utf-8 -*-
"""
login_helper.py — Esegui questo script UNA VOLTA nel terminale per autenticarti su Instagram.
Salva la sessione in ig_session.json che poi la pipeline riusa automaticamente.

Uso: python login_helper.py
"""

from dotenv import load_dotenv
load_dotenv()

import os
from pathlib import Path
from instagrapi import Client
from instagrapi.exceptions import ChallengeRequired, TwoFactorRequired

username = os.environ["INSTAGRAM_USERNAME"]
password = os.environ["INSTAGRAM_PASSWORD"]

_IG_DATA_DIR = Path(os.getenv("IG_DATA_DIR", Path(__file__).parent))
_IG_DATA_DIR.mkdir(parents=True, exist_ok=True)
SESSION_FILE = str(_IG_DATA_DIR / "ig_session.json")

print(f"Login su Instagram come @{username}...")

cl = Client()
cl.delay_range = [1, 3]

try:
    cl.login(username, password)

except ChallengeRequired:
    print("\nInstagram richiede verifica (email o SMS).")
    last = cl.last_json
    try:
        cl.challenge_resolve(last)
    except Exception:
        pass
    code = input("Inserisci il codice ricevuto: ").strip()
    cl.challenge_send_security_code(code)

except TwoFactorRequired:
    print("\nAutenticazione a due fattori attiva.")
    code = input("Inserisci il codice 2FA: ").strip()
    username_from_form = cl.last_json.get("two_factor_info", {}).get("username", username)
    cl.two_factor_login(code, username=username_from_form)

# Salva sessione
cl.dump_settings(SESSION_FILE)
info = cl.account_info()
print(f"\nLogin riuscito! Account: @{info.username}")
print(f"Sessione salvata in {SESSION_FILE} — la pipeline non chiederà più il login.")
