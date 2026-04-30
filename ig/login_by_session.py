# -*- coding: utf-8 -*-
"""
login_by_session.py — Login tramite sessionid estratto dal browser.

Istruzioni:
1. Accedi su instagram.com nel browser
2. F12 → Application → Cookies → instagram.com → copia il valore di "sessionid"
3. Incollalo quando richiesto (oppure mettilo direttamente in SESSION_ID sotto)

Uso: python login_by_session.py
"""

from dotenv import load_dotenv
load_dotenv()

import os
from instagrapi import Client

SESSION_ID = ""  # oppure incolla qui direttamente, es: "1234567890%3AabcXYZ..."

if not SESSION_ID:
    SESSION_ID = input("Incolla il sessionid da instagram.com: ").strip()

print("Login con session ID...")
cl = Client()
cl.delay_range = [1, 3]
cl.login_by_sessionid(SESSION_ID)

cl.dump_settings("ig_session.json")
info = cl.account_info()
print(f"\nLogin riuscito! Account: @{info.username}")
print("Sessione salvata in ig_session.json")
