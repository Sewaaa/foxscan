# -*- coding: utf-8 -*-
"""
scheduler_ig.py — Daemon per i 3 post giornalieri su Instagram.

Orari (ora italiana / Europe/Rome):
  - 09:00 — mattina
  - 12:30 — mezzogiorno
  - 21:00 — sera

Espone anche un trigger HTTP interno sulla porta 8081:
  POST http://ig-pipeline:8081/run  → esegue subito un post
  GET  http://ig-pipeline:8081/status → stato corrente
"""

import json
import logging
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytz
from apscheduler.schedulers.background import BackgroundScheduler

from pipeline import run_pipeline

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

ROME = pytz.timezone("Europe/Rome")
TRIGGER_PORT = 8081
HEARTBEAT_INTERVAL = 300  # log heartbeat ogni 5 minuti

POST_SLOTS = [
    {"hour": 9,  "minute": 0,  "id": "morning"},
    {"hour": 12, "minute": 30, "id": "midday"},
    {"hour": 21, "minute": 0,  "id": "evening"},
]

_lock = threading.Lock()
_last_result: dict = {}


def _post_slot(slot_id: str) -> None:
    global _last_result
    if not _lock.acquire(blocking=False):
        logger.info("Slot %s: pipeline già in esecuzione, salto.", slot_id)
        return
    logger.info("=== Slot %s: cerco articolo da postare ===", slot_id)
    try:
        result = run_pipeline(max_posts=1)
        _last_result = result
        if result.get("skipped"):
            logger.info("Pipeline saltata (INSTAGRAM_ENABLED=false)")
        elif result.get("posted", 0) == 0:
            logger.info("Nessun articolo idoneo nelle ultime 36h per lo slot %s", slot_id)
        else:
            logger.info("Slot %s completato: %s", slot_id, result)
    except Exception:
        logger.exception("Errore non gestito nello slot %s", slot_id)
    finally:
        _lock.release()


class _TriggerHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/run":
            if not _lock.acquire(blocking=False):
                self._respond(409, {"status": "already_running"})
                return
            _lock.release()
            threading.Thread(target=_post_slot, args=["manual"], daemon=True).start()
            self._respond(200, {"status": "started"})
        else:
            self._respond(404, {"error": "not found"})

    def do_GET(self):
        if self.path == "/status":
            self._respond(200, {"running": not _lock.acquire(blocking=False) or (_lock.release() or False),
                                 "last_result": _last_result})
        else:
            self._respond(404, {"error": "not found"})

    def _respond(self, code: int, body: dict) -> None:
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format, *args):
        pass


def _start_trigger_server() -> None:
    server = HTTPServer(("0.0.0.0", TRIGGER_PORT), _TriggerHandler)
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    logger.info("Trigger HTTP avviato sulla porta %d", TRIGGER_PORT)


def start_scheduler() -> None:
    _start_trigger_server()

    scheduler = BackgroundScheduler(timezone=ROME)

    for slot in POST_SLOTS:
        scheduler.add_job(
            _post_slot,
            trigger="cron",
            hour=slot["hour"],
            minute=slot["minute"],
            id=slot["id"],
            args=[slot["id"]],
            replace_existing=True,
            misfire_grace_time=600,
            coalesce=True,
            max_instances=1,
        )
        logger.info(
            "Slot registrato: %s alle %02d:%02d (Europe/Rome)",
            slot["id"], slot["hour"], slot["minute"],
        )

    scheduler.start()
    logger.info("Scheduler avviato (BackgroundScheduler). In attesa degli slot...")

    # Main thread: heartbeat + watchdog
    heartbeat_count = 0
    try:
        while True:
            time.sleep(HEARTBEAT_INTERVAL)
            heartbeat_count += 1
            if scheduler.running:
                jobs = scheduler.get_jobs()
                next_times = {j.id: str(j.next_run_time) for j in jobs}
                logger.info("[heartbeat #%d] Scheduler attivo. Prossimi slot: %s",
                            heartbeat_count, next_times)
            else:
                logger.error("[heartbeat #%d] Scheduler NON attivo — riavvio...", heartbeat_count)
                scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Shutdown ricevuto, fermo lo scheduler.")
        scheduler.shutdown(wait=False)


if __name__ == "__main__":
    if "--now" in sys.argv:
        logger.info("Modalita' test: eseguo subito uno slot")
        _post_slot("test")
    else:
        start_scheduler()
