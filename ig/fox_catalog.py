# -*- coding: utf-8 -*-
"""
fox_catalog.py — Mappa tag articolo → immagini volpe per ogni slide.

Logica di selezione:
- COVER   : tag-based, priorità ordinata, rotazione con contatore persistente
            (ig_data/fox_rotation.json) — evita ripetizioni nei post recenti
- DETAIL  : rotazione fissa tra fox analitici/neutri (indipendente dal tag)
- OPINION : sempre fox autorevole (regge documento/report)
- CTA     : sempre fox_cta_forward
"""

import json
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

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
#  cve_shield2     – regge lucchetto rosso aperto         → vulnerability / falla
#  breach_fly          – documenti che volano (landscape)     → data breach / leak
#  breach_fly2         – stessa scena, portrait, più intensa  → breach alternativa
#  breach_harddrive    – hard disk rotto con dati dispersi     → breach / data loss
#  breach_classified   – cartella top secret trapelata         → leak / classified
#  breach_vault        – file/lucchetto rotto                  → breach / vault
#  phishing_hook       – amo con busta diamante               → phishing / BEC
#  phishing_hook2      – amo con busta rossa, sorriso dark    → phishing / social eng.
#  phishing_hook3      – amo che trafigge email               → phishing variante
#  phishing_credentials– credenziali rubate                   → phishing / BEC
#  phishing_mask       – identità falsa / maschera            → social engineering
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
    "cve_shield2":     PUB / "fox_cve_shield_broken2_nobg.png",
    "cve_bug":         PUB / "cve_bug_nobg.png",
    "cve_crack":       PUB / "cve_crack_nobg.png",
    "cve_ghost":       PUB / "cve_ghost_nobg.png",
    "cve_inject":      PUB / "cve_inject_nobg.png",
    "cve_shatter":     PUB / "cve_shatter_nobg.png",
    "breach_fly":           PUB / "fox_breach_document_fly_nobg.png",
    "breach_fly2":          PUB / "fox_breach_document_fly2_nobg.png",
    "breach_harddrive":     PUB / "harddisk corrotto.png",
    "breach_classified":    PUB / "file topsecret.png",
    "breach_vault":         PUB / "file rotti da lucchetto.png",
    "phishing_hook":        PUB / "fox_phishing_hook_nobg.png",
    "phishing_hook2":       PUB / "fox_phishing_hook2_nobg.png",
    "phishing_hook3":       PUB / "email ladro_nobg.png",
    "phishing_credentials": PUB / "credenziali rubate.png",
    "phishing_mask":        PUB / "identità falsa.png",
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
    # Tag              Lista varianti — scelta con article_id % len
    ("ransomware",    ["ransomware",      "alert_siren",    "cve_shatter"]),
    ("extortion",     ["ransomware",      "alert_siren",    "cve_crack"]),
    ("APT",           ["apt_detective",   "apt_detective2"]),
    ("espionage",     ["apt_detective",   "apt_detective2"]),
    ("spionaggio",    ["apt_detective",   "apt_detective2"]),
    ("nation-state",  ["apt_detective2",  "apt_detective"]),
    ("phishing",          ["phishing_hook",        "phishing_hook2", "phishing_hook3", "phishing_credentials", "phishing_mask"]),
    ("BEC",               ["phishing_credentials", "phishing_hook2", "phishing_mask"]),
    ("social engineering",["phishing_mask",         "phishing_hook",  "phishing_credentials"]),
    ("CVE",               ["cve_shield2",     "cve_crack",      "cve_bug"]),
    ("vulnerability",     ["cve_shield2",     "cve_inject",     "cve_crack"]),
    ("zero-day",          ["cve_crack",       "cve_inject",     "cve_shatter"]),
    ("breach",            ["breach_fly",      "breach_fly2",   "breach_harddrive", "breach_classified", "breach_vault"]),
    ("leak",              ["breach_fly2",     "breach_vault",  "breach_classified"]),
    ("data breach",       ["breach_harddrive","breach_fly",    "breach_vault",     "breach_fly2"]),
    ("malware",           ["cve_ghost",       "cve_shatter",    "alert_siren2"]),
    ("trojan",            ["cve_ghost",       "cve_shield2",    "cve_inject"]),
    ("backdoor",          ["apt_detective2",  "cve_inject",     "cve_ghost"]),
    ("artificial intelligence", ["research_tablet", "apt_detective2"]),
    ("machine learning",  ["research_tablet", "apt_detective"]),
    ("policy",            ["policy_doc",      "policy_doc2"]),
    ("compliance",        ["policy_doc2",     "policy_doc"]),
    ("regulation",        ["policy_doc",      "policy_doc2"]),
    ("NIS2",              ["policy_doc2",     "policy_doc"]),
    ("GDPR",              ["policy_doc2",     "policy_doc"]),
    ("research",          ["research_tablet", "apt_detective"]),
    ("threat intel",      ["research_tablet", "apt_detective2"]),
    ("report",            ["research_tablet", "policy_doc"]),
    ("patch",             ["good_news",       "cve_bug",        "cve_crack"]),
    ("update",            ["good_news",       "research_tablet"]),
    ("fix",           ["good_news",       "cve_shield2"]),
]

# Fallback se nessun tag corrisponde (breaking news generico)
DEFAULT_COVER_VARIANTS = ["alert_siren", "alert_siren2", "cve_shatter"]

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


# ── Rotazione persistente ─────────────────────────────────────────────────────
# Tiene traccia degli ultimi fox usati in ig_data/fox_rotation.json
# per evitare che lo stesso fox appaia più volte di fila, indipendentemente
# dagli article_id (che possono essere non consecutivi).

def _rotation_path() -> Path:
    data_dir = Path(os.getenv("IG_DATA_DIR", Path(__file__).parent / "ig_data"))
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir / "fox_rotation.json"


def _load_rotation() -> dict:
    try:
        return json.loads(_rotation_path().read_text(encoding="utf-8"))
    except Exception:
        return {"counter": 0, "recent": []}


def _save_rotation(state: dict) -> None:
    try:
        _rotation_path().write_text(json.dumps(state), encoding="utf-8")
    except Exception as e:
        logger.warning("fox_rotation: impossibile salvare stato — %s", e)


def _pick_fox(variants: list[str], state: dict) -> str:
    """
    Sceglie il fox dalla lista di varianti evitando quelli usati di recente.
    Aggiorna il contatore e la lista recent in-place nel dict state.
    """
    recent = state.get("recent", [])
    counter = state.get("counter", 0)

    # Escludi gli ultimi min(2, len-1) fox usati per garantire varietà
    exclude_n = min(2, len(variants) - 1)
    available = [v for v in variants if v not in recent[-exclude_n:]] if exclude_n > 0 else variants
    if not available:
        available = variants  # fallback: tutti disponibili

    chosen = available[counter % len(available)]
    state["counter"] = counter + 1
    state["recent"] = (recent + [chosen])[-6:]  # tieni solo gli ultimi 6
    return chosen


# ── API pubblica ──────────────────────────────────────────────────────────────

def select_cover_fox(tags: list[str], article_id: int) -> Path:
    """
    Restituisce il Path dell'immagine fox per la cover.
    Usa un contatore persistente (ig_data/fox_rotation.json) per ruotare
    tra le varianti disponibili per la categoria dell'articolo,
    evitando ripetizioni nelle ultime pubblicazioni.
    article_id è mantenuto per compatibilità ma non più usato per la selezione.
    """
    state = _load_rotation()

    for tag in tags:
        for (match_tag, variants) in TAG_PRIORITY:
            if match_tag.lower() in tag.lower() or tag.lower() in match_tag.lower():
                chosen = _pick_fox(variants, state)
                _save_rotation(state)
                logger.debug("fox cover: tag=%s → %s (counter=%d)", match_tag, chosen, state["counter"])
                return CATALOG[chosen]

    # Fallback generico
    chosen = _pick_fox(DEFAULT_COVER_VARIANTS, state)
    _save_rotation(state)
    logger.debug("fox cover: fallback → %s (counter=%d)", chosen, state["counter"])
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
