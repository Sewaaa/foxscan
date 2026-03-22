import json
import logging
import os
import re
import time

import httpx
from dotenv import load_dotenv

load_dotenv()

from config import GROQ_MODEL

logger = logging.getLogger(__name__)

MAX_RETRIES = 3

SYSTEM_PROMPT = """Sei un giornalista tecnico specializzato in cybersecurity. \
Ti vengono forniti N articoli diversi che trattano la stessa notizia. \
Il tuo compito è produrre un unico articolo finale in italiano che:
- Sintetizza e confronta le informazioni di tutte le fonti
- È più completo e accurato di qualsiasi singola fonte
- Ha un tono professionale ma accessibile
- Non copia frasi intere da nessuna fonte (parafrasa sempre)
- Ha una lunghezza di 600-900 parole

Rispondi SOLO con un oggetto JSON valido con questa struttura:
{
  "titolo": "...",
  "sommario": "... (max 2 righe)",
  "corpo": "... (markdown, 600-900 parole)",
  "tag": ["...", "..."],
  "score_rilevanza": 8
}

I tag devono essere scelti tra: malware, ransomware, breach, CVE, APT, policy, tool, phishing, vulnerability, espionage"""


def _build_user_prompt(scraped_items: list[dict]) -> str:
    parts = ["--- ARTICOLI ---\n"]
    for i, item in enumerate(scraped_items, 1):
        url = item.get("url", "N/A")
        text = item.get("text", "")
        parts.append(f"[FONTE {i}: {url}]\n{text}\n")
    return "\n".join(parts)


def _fix_control_chars(raw: str) -> str:
    """Escapes literal newlines/tabs inside JSON string values."""
    result = []
    in_string = False
    i = 0
    while i < len(raw):
        c = raw[i]
        if c == "\\" and in_string:
            result.append(c)
            i += 1
            if i < len(raw):
                result.append(raw[i])
            i += 1
            continue
        if c == '"':
            in_string = not in_string
            result.append(c)
        elif in_string and c == "\n":
            result.append("\\n")
        elif in_string and c == "\r":
            result.append("\\r")
        elif in_string and c == "\t":
            result.append("\\t")
        elif in_string and ord(c) < 0x20:
            pass  # drop other control chars
        else:
            result.append(c)
        i += 1
    return "".join(result)


def _extract_json(raw: str) -> dict | None:
    match = re.search(r"```json\s*([\s\S]+?)\s*```", raw)
    if match:
        raw = match.group(1)

    match = re.search(r"\{[\s\S]+\}", raw)
    if match:
        raw = match.group(0)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    try:
        return json.loads(_fix_control_chars(raw))
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing fallito: {e}\nRaw:\n{raw[:500]}")
        return None


def synthesize(scraped_items: list[dict]) -> dict | None:
    if not scraped_items:
        return None

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY non trovata nel file .env")

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": _build_user_prompt(scraped_items)},
    ]

    for attempt in range(MAX_RETRIES):
        try:
            with httpx.Client(timeout=60.0) as client:
                resp = client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    json={"model": GROQ_MODEL, "messages": messages, "temperature": 0.3, "max_tokens": 2048},
                    headers={"Authorization": f"Bearer {api_key}"},
                )

            if resp.status_code == 429:
                try:
                    msg = resp.json().get("error", {}).get("message", "")
                    wait_match = re.search(r"try again in (\d+\.?\d*)s", msg)
                    wait = float(wait_match.group(1)) + 2 if wait_match else 20
                except Exception:
                    wait = 20
                logger.warning(f"Rate limit Groq, attendo {wait:.0f}s (tentativo {attempt + 1}/{MAX_RETRIES})")
                time.sleep(wait)
                continue

            resp.raise_for_status()

            raw = resp.json()["choices"][0]["message"]["content"]
            result = _extract_json(raw)

            if not result:
                return None

            required = {"titolo", "sommario", "corpo", "tag", "score_rilevanza"}
            if not required.issubset(result.keys()):
                logger.error(f"Risposta JSON incompleta: {result.keys()}")
                return None

            return result

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP {e.response.status_code}: {e.response.text[:300]}")
            return None
        except Exception as e:
            logger.error(f"Errore sintesi: {e}")
            return None

    logger.error("Tutti i tentativi Groq esauriti")
    return None
