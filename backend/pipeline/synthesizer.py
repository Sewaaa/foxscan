import json
import logging
import os
import re

import httpx
from dotenv import load_dotenv

load_dotenv()

from config import GROQ_MODEL

logger = logging.getLogger(__name__)

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


def _extract_json(raw: str) -> dict | None:
    match = re.search(r"```json\s*([\s\S]+?)\s*```", raw)
    if match:
        raw = match.group(1)

    match = re.search(r"\{[\s\S]+\}", raw)
    if match:
        raw = match.group(0)

    try:
        return json.loads(raw)
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

    try:
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                json={"model": GROQ_MODEL, "messages": messages, "temperature": 0.3, "max_tokens": 2048},
                headers={"Authorization": f"Bearer {api_key}"},
            )
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
