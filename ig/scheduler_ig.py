# -*- coding: utf-8 -*-
"""
scheduler_ig.py — Daemon per i 3 post giornalieri su Instagram.

Orari (ora italiana / Europe/Rome):
  - 09:00 — mattina
  - 12:30 — mezzogiorno
  - 21:00 — sera

Ad ogni slot viene scelto l'articolo con relevance_score più alto
pubblicato nelle ultime 24 ore e non ancora postato su Instagram.

Uso:
  python scheduler_ig.py            # avvia il daemon (blocca il terminale)
  python scheduler_ig.py --now      # esegue subito uno slot (per test)
"""

import logging
import sys

import pytz
from apscheduler.schedulers.blocking import BlockingScheduler

from pipeline import run_pipeline

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

ROME = pytz.timezone("Europe/Rome")

POST_SLOTS = [
    {"hour": 9,  "minute": 0,  "id": "morning"},
    {"hour": 12, "minute": 30, "id": "midday"},
    {"hour": 21, "minute": 0,  "id": "evening"},
]


def _post_slot(slot_id: str) -> None:
    logger.info("=== Slot %s: cerco articolo da postare ===", slot_id)
    result = run_pipeline(max_posts=1)
    if result.get("skipped"):
        logger.info("Pipeline saltata (INSTAGRAM_ENABLED=false)")
    elif result.get("posted", 0) == 0:
        logger.info("Nessun articolo idoneo nelle ultime 24h per lo slot %s", slot_id)
    else:
        logger.info("Slot %s completato: %s", slot_id, result)


def start_scheduler() -> None:
    scheduler = BlockingScheduler(timezone=ROME)

    for slot in POST_SLOTS:
        scheduler.add_job(
            _post_slot,
            trigger="cron",
            hour=slot["hour"],
            minute=slot["minute"],
            id=slot["id"],
            args=[slot["id"]],
            replace_existing=True,
            misfire_grace_time=600,  # tollera fino a 10 min di ritardo
        )
        logger.info(
            "Slot registrato: %s alle %02d:%02d (Europe/Rome)",
            slot["id"], slot["hour"], slot["minute"],
        )

    logger.info("Scheduler avviato. In attesa degli slot...")
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Scheduler fermato.")


if __name__ == "__main__":
    if "--now" in sys.argv:
        logger.info("Modalita' test: eseguo subito uno slot")
        _post_slot("test")
    else:
        start_scheduler()
