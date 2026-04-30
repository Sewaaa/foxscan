# -*- coding: utf-8 -*-
"""
fox_catalog.py — Mappa tag articolo → immagini volpe per ogni slide.

Logica di selezione:
- COVER   : tag-based, priorità ordinata, variante deterministica da article_id
- DETAIL  : rotazione fissa tra fox analitici/neutri (indipendente dal tag)
- OPINION : sempre fox autorevole (regge documento/report)
- CTA     : sempre fox_cta_forward
"""

import os
from pathlib import Path

# Dev Windows → percorso assoluto alla cartella frontend/public
# Docker/NAS  → cartella assets/ accanto agli script (copiata nel container)
_DEV_PATH = Path(r"C:\me\Progetti Personali\Foxscan\frontend\public")
PUB = _DEV_PATH if _DEV_PATH.exists() else Path(os.getenv("FOX_ASSETS_PATH", Path(__file__).parent / "assets"))

# ── Catalogo completo ─────────────────────────────────────────────────────────
#
# Ogni voce: lista di nomi file (senza .png) in ordine di preferenza.
# Quando ci sono due varianti si sceglie in modo deterministico da article_id.
#
# Legenda visiva:
#  alert_siren     – fox panico, preme pulsante rosso    → breaking/critico generico
#  alert_siren2    – stessa posa, espressione più composta → breaking alternativa
#  apt_detective   – lente, tutto cyan, investigativo     → APT / spionaggio
#  apt_detective2  – lente, angolo diverso                → APT alternativa
#  cve_shield      – regge frammento scudo rosso rotto    → CVE / vulnerability
#  cve_shield2     – regge lucchetto rosso aperto         → vulnerability / falla
#  breach_fly      – documenti che volano (landscape)     → data breach / leak
#  breach_fly2     – stessa scena, portrait, più intensa  → breach alternativa
#  phishing_hook   – amo con busta diamante               → phishing / BEC
#  phishing_hook2  – amo con busta rossa, sorriso dark    → phishing / social eng.
#  ransomware      – laptop con lucchetto rosso            → ransomware / extortion
#  policy_doc      – regge pergamena con sigillo ufficiale → policy / normativa
#  policy_doc2     – pergamena con medaglia/badge          → compliance / cert.
#  research_tablet – tablet con grafici analitici          → threat intel / report
#  good_news       – pollice su, tutto cyan                → patch / buone notizie
#  cta_forward     – dito puntato verso lo spettatore      → CTA universale

CATALOG = {
    "alert_siren":     PUB / "fox_alert_siren_nobg.png",
    "alert_siren2":    PUB / "fox_alert_siren2_nobg.png",
    "apt_detective":   PUB / "fox_apt_detective_nobg.png",
    "apt_detective2":  PUB / "fox_apt_detective2_nobg.png",
    "cve_shield":      PUB / "fox_cve_shield_broken_nobg.png",
    "cve_shield2":     PUB / "fox_cve_shield_broken2_nobg.png",
    "breach_fly":      PUB / "fox_breach_document_fly_nobg.png",
    "breach_fly2":     PUB / "fox_breach_document_fly2_nobg.png",
    "phishing_hook":   PUB / "fox_phishing_hook_nobg.png",
    "phishing_hook2":  PUB / "fox_phishing_hook2_nobg.png",
    "ransomware":      PUB / "fox_ransomware_laptop_lock_nobg.png",
    "policy_doc":      PUB / "fox_policy_document_nobg.png",
    "policy_doc2":     PUB / "fox_policy_document2_nobg.png",
    "research_tablet": PUB / "fox_research_tablet_nobg.png",
    "good_news":       PUB / "fox_good_news_nobg.png",
    "cta_forward":     PUB / "fox_cta_forward_nobg.png",
    # Vecchie mascotte (già presenti nel progetto)
    "sintesi":         PUB / "sintesi_nobg.png",
    "dito":            PUB / "dito_nobg.png",
    "testa":           PUB / "testa_nobg.png",
}

# ── Mapping tag → varianti cover ──────────────────────────────────────────────
# Ordine: dal più specifico al più generico.
# Se l'articolo ha più tag, vince il primo match nella lista TAG_PRIORITY.

TAG_PRIORITY = [
    # Tag              Variante A          Variante B
    ("ransomware",    "ransomware",        "alert_siren"),
    ("extortion",     "ransomware",        "alert_siren"),
    ("APT",           "apt_detective",     "apt_detective2"),
    ("espionage",     "apt_detective",     "apt_detective2"),
    ("spionaggio",    "apt_detective",     "apt_detective2"),
    ("nation-state",  "apt_detective2",    "apt_detective"),
    ("phishing",      "phishing_hook",     "phishing_hook2"),
    ("BEC",           "phishing_hook2",    "phishing_hook"),
    ("social",        "phishing_hook",     "phishing_hook2"),
    ("CVE",           "cve_shield",        "cve_shield2"),
    ("vulnerability", "cve_shield2",       "cve_shield"),
    ("zero-day",      "cve_shield",        "alert_siren"),
    ("breach",        "breach_fly2",       "breach_fly2"),
    ("leak",          "breach_fly2",       "breach_fly2"),
    ("data",          "breach_fly2",       "breach_fly2"),
    ("malware",       "cve_shield",        "alert_siren2"),
    ("trojan",        "cve_shield2",       "alert_siren2"),
    ("backdoor",      "apt_detective2",    "cve_shield"),
    ("policy",        "policy_doc",        "policy_doc2"),
    ("compliance",    "policy_doc2",       "policy_doc"),
    ("regulation",    "policy_doc",        "policy_doc2"),
    ("NIS2",          "policy_doc2",       "policy_doc"),
    ("GDPR",          "policy_doc2",       "policy_doc"),
    ("research",      "research_tablet",   "apt_detective"),
    ("threat intel",  "research_tablet",   "apt_detective2"),
    ("report",        "research_tablet",   "policy_doc"),
    ("patch",         "good_news",         "cve_shield"),
    ("update",        "good_news",         "research_tablet"),
    ("fix",           "good_news",         "cve_shield2"),
]

# Fallback se nessun tag corrisponde (breaking news generico)
DEFAULT_COVER_VARIANTS = ("alert_siren", "alert_siren2")

# ── Sequenza fox per le slide di dettaglio (2, 3, 4) ─────────────────────────
# Rotazione indipendente dal tag: analytical/investigative
DETAIL_SEQUENCE = [
    "research_tablet",   # slide 2 — analizza i dati
    "apt_detective",     # slide 3 — investiga nel dettaglio
    "apt_detective2",    # slide 4 — approfondisce
]

# ── Opinion e CTA fissi ───────────────────────────────────────────────────────
OPINION_FOX = "policy_doc"      # autorevole, regge documento ufficiale
CTA_FOX     = "cta_forward"     # punta verso lo spettatore


# ── API pubblica ──────────────────────────────────────────────────────────────

def select_cover_fox(tags: list[str], article_id: int) -> Path:
    """
    Restituisce il Path dell'immagine fox per la cover,
    scelto in base ai tag dell'articolo.
    Usa article_id per scegliere deterministicamente tra variante A e B.
    """
    for tag in tags:
        for (match_tag, variant_a, variant_b) in TAG_PRIORITY:
            if match_tag.lower() in tag.lower() or tag.lower() in match_tag.lower():
                chosen = variant_a if article_id % 2 == 0 else variant_b
                return CATALOG[chosen]

    # Fallback
    chosen = DEFAULT_COVER_VARIANTS[article_id % 2]
    return CATALOG[chosen]


def select_detail_fox(slide_index: int) -> Path:
    """
    Restituisce il fox per le slide di dettaglio (indici 0, 1, 2 → slide 2, 3, 4).
    """
    key = DETAIL_SEQUENCE[slide_index % len(DETAIL_SEQUENCE)]
    return CATALOG[key]


def select_opinion_fox() -> Path:
    return CATALOG[OPINION_FOX]


def select_cta_fox() -> Path:
    return CATALOG[CTA_FOX]


def get_path(key: str) -> Path:
    """Accesso diretto a qualsiasi voce del catalogo per nome chiave."""
    return CATALOG[key]
