# -*- coding: utf-8 -*-
"""
scheduler_ig.py — Daemon per i 3 post giornalieri su Instagram.

Orari (ora italiana / Europe/Rome):
  - 09:00 — mattina
  - 12:30 — mezzogiorno
  - 21:00 — sera

NON usa APScheduler: il loop principale controlla ogni 60 secondi se è
ora di postare. Questo approccio è immune all'ibernazione del NAS —
nessun thread executor di terze parti che si congela.

Logica catch-up: se il NAS era spento all'orario pianificato, lo slot
viene eseguito comunque fino a MAX_CATCHUP_HOURS ore dopo.

Espone anche un trigger HTTP interno sulla porta 8081:
  POST http://ig-pipeline:8081/run  → esegue subito un post
  GET  http://ig-pipeline:8081/status → stato corrente
"""

import json
import logging
import sys
import threading
import time
from datetime import date, datetime, timedelta
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytz

from pipeline import run_pipeline

ROME = pytz.timezone("Europe/Rome")


class _RomeFormatter(logging.Formatter):
    def formatTime(self, record, datefmt=None):
        dt = datetime.fromtimestamp(record.created, tz=ROME)
        return dt.strftime(datefmt or "%Y-%m-%d %H:%M:%S")


_handler = logging.StreamHandler()
_handler.setFormatter(_RomeFormatter("%(asctime)s [%(levelname)s] %(message)s", "%Y-%m-%d %H:%M:%S"))
logging.basicConfig(level=logging.INFO, handlers=[_handler])
logger = logging.getLogger(__name__)

TRIGGER_PORT = 8081
CHECK_INTERVAL = 60           # controlla ogni 60 secondi
HEARTBEAT_EVERY = 5           # log heartbeat ogni 5 minuti (= ogni 5 check)
LOCK_TIMEOUT_MINUTES = 60     # forza rilascio lock se uno slot dura più di 60 min
MAX_CATCHUP_HOURS = 8         # esegui lo slot fino a 8h dopo l'orario pianificato

POST_SLOTS = [
    {"hour": 9,  "minute": 0,  "id": "morning"},
    {"hour": 12, "minute": 30, "id": "midday"},
    {"hour": 21, "minute": 0,  "id": "evening"},
]

_lock = threading.Lock()
_lock_acquired_at: datetime | None = None
_last_result: dict = {}

# Tiene traccia degli slot già eseguiti: chiave = "YYYY-MM-DD_slot_id"
# Resettato solo al riavvio del container (sufficiente: ogni giorno il NAS
# si riavvia almeno una volta per ibernazione).
_posted_slots: set[str] = set()


# ── Lock helpers ──────────────────────────────────────────────────────────────

def _is_running() -> bool:
    acquired = _lock.acquire(blocking=False)
    if acquired:
        _lock.release()
    return not acquired


def _try_acquire_lock(caller: str) -> bool:
    """Acquisisce il lock. Se tenuto da >60 min lo forza-rilascia."""
    global _lock_acquired_at
    if _lock.acquire(blocking=False):
        _lock_acquired_at = datetime.now(tz=ROME)
        return True
    if _lock_acquired_at is not None:
        elapsed_min = (datetime.now(tz=ROME) - _lock_acquired_at).total_seconds() / 60
        if elapsed_min >= LOCK_TIMEOUT_MINUTES:
            logger.warning(
                "Lock tenuto da %.0f min (timeout %d min) — forzo il rilascio [%s]",
                elapsed_min, LOCK_TIMEOUT_MINUTES, caller,
            )
            try:
                _lock.release()
            except RuntimeError:
                pass
            if _lock.acquire(blocking=False):
                _lock_acquired_at = datetime.now(tz=ROME)
                return True
        else:
            logger.info("Slot %s: pipeline già in esecuzione (%.0f min), salto.", caller, elapsed_min)
    else:
        logger.info("Slot %s: pipeline già in esecuzione, salto.", caller)
    return False


def _release_lock() -> None:
    global _lock_acquired_at
    _lock_acquired_at = None
    try:
        _lock.release()
    except RuntimeError:
        pass


# ── Logica slot ───────────────────────────────────────────────────────────────

def _slot_key(slot_id: str, day: date) -> str:
    return f"{day.isoformat()}_{slot_id}"


def _should_fire(slot: dict, now: datetime) -> bool:
    """
    Ritorna True se lo slot deve essere eseguito ora:
    - non è già stato eseguito oggi
    - l'orario pianificato è passato ma non più di MAX_CATCHUP_HOURS fa
    """
    key = _slot_key(slot["id"], now.date())
    if key in _posted_slots:
        return False
    slot_time = now.replace(
        hour=slot["hour"], minute=slot["minute"], second=0, microsecond=0
    )
    catchup_deadline = slot_time + timedelta(hours=MAX_CATCHUP_HOURS)
    return slot_time <= now <= catchup_deadline


def _post_slot(slot_id: str) -> None:
    global _last_result
    if not _try_acquire_lock(slot_id):
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
        _release_lock()


# ── HTTP trigger ──────────────────────────────────────────────────────────────

class _TriggerHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/run":
            if _is_running():
                self._respond(409, {"status": "already_running"})
                return
            threading.Thread(target=_post_slot, args=["manual"], daemon=True).start()
            self._respond(200, {"status": "started"})
        else:
            self._respond(404, {"error": "not found"})

    def do_GET(self):
        if self.path == "/status":
            self._respond(200, {"running": _is_running(), "last_result": _last_result})
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


# ── Main loop ─────────────────────────────────────────────────────────────────

def start_scheduler() -> None:
    _start_trigger_server()

    for slot in POST_SLOTS:
        logger.info(
            "Slot configurato: %s alle %02d:%02d (Europe/Rome), catch-up fino a %dh dopo",
            slot["id"], slot["hour"], slot["minute"], MAX_CATCHUP_HOURS,
        )

    logger.info("Loop avviato — controllo ogni %ds, heartbeat ogni %d min",
                CHECK_INTERVAL, HEARTBEAT_EVERY)

    check_count = 0
    try:
        while True:
            time.sleep(CHECK_INTERVAL)
            check_count += 1
            now = datetime.now(tz=ROME)

            # Controlla ogni slot
            for slot in POST_SLOTS:
                if _should_fire(slot, now):
                    key = _slot_key(slot["id"], now.date())
                    _posted_slots.add(key)  # segna subito per evitare doppio fire
                    delay_min = (now - now.replace(
                        hour=slot["hour"], minute=slot["minute"], second=0, microsecond=0
                    )).total_seconds() / 60
                    if delay_min > 1:
                        logger.info(
                            "Slot %s: catch-up dopo %.0f min (NAS era spento)",
                            slot["id"], delay_min,
                        )
                    threading.Thread(
                        target=_post_slot, args=[slot["id"]], daemon=True
                    ).start()

            # Heartbeat ogni HEARTBEAT_EVERY minuti
            if check_count % HEARTBEAT_EVERY == 0:
                posted = sorted(_posted_slots)
                pending = [
                    f"{s['id']}@{s['hour']:02d}:{s['minute']:02d}"
                    for s in POST_SLOTS
                    if _slot_key(s["id"], now.date()) not in _posted_slots
                ]
                logger.info(
                    "[heartbeat] %s | postati oggi: %s | ancora da postare: %s",
                    now.strftime("%H:%M"),
                    posted if posted else "nessuno",
                    pending if pending else "tutti completati",
                )

    except (KeyboardInterrupt, SystemExit):
        logger.info("Shutdown ricevuto.")


if __name__ == "__main__":
    if "--now" in sys.argv:
        logger.info("Modalita' test: eseguo subito uno slot")
        _post_slot("test")
    else:
        start_scheduler()
