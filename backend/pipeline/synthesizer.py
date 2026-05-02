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

IGNORA COMPLETAMENTE qualsiasi contenuto non editoriale presente nelle fonti, come:
- Sezioni sponsor o pubblicità
- Inviti a seguire podcast, newsletter, subreddit o social media
- Messaggi tipo "supporta il podcast", "iscriviti", "lascia una recensione"
- Promozioni di prodotti o servizi non pertinenti alla notizia
- Boilerplate del sito (cookie policy, copyright, ecc.)

Rispondi SOLO con un oggetto JSON valido con questa struttura:
{
  "titolo": "...",
  "sommario": "... (max 2 righe)",
  "corpo": "... (markdown ben formattato, 600-900 parole. OBBLIGATORIO: paragrafi separati da riga vuota, **grassetto** per termini tecnici chiave, ## per sottotitoli di sezione, elenchi - o 1. quando appropriato. NON scrivere un blocco unico di testo.)",
  "tag": ["...", "..."],
  "score_rilevanza": <intero 1-10>,
  "ig_score": <intero 1-10>,
  "image_query": "2-4 parole in inglese per cercare una foto stock rilevante su Unsplash (es: 'hacker dark screen', 'data breach server', 'ransomware lock computer', 'phishing email attack')"
}

Per ig_score (instagrammabilità) usa questa scala — misura quanto la notizia può diventare virale e interessare il grande pubblico:
- 1-2: tecnica pura, interessa solo addetti ai lavori (es. patch CVE minore, advisory CERT)
- 3-4: notizia di settore, poco appeal fuori dalla community cyber
- 5-6: notizia che può interessare utenti tech e appassionati (breach noto, malware diffuso)
- 7-8: notizia che tocca persone comuni (app popolari, banche, dati personali, governi)
- 9-10: evento che fa notizia sui TG generalisti (mega-breach, attacco stato-nazione su infrastrutture pubbliche, scandalo tecnologico di massa)

Per score_rilevanza usa questa scala RIGOROSA — la maggior parte delle notizie deve cadere tra 3 e 7:
- 1-2: notizia di routine, aggiornamenti minori, patch ordinarie, advisory generici senza impatto concreto
- 3-4: vulnerabilità o incidente di interesse limitato, riguarda software di nicchia o impatto basso
- 5-6: vulnerabilità significativa o breach con impatto moderato, interessa un settore specifico
- 7-8: vulnerabilità critica (CVSS alto), breach su larga scala, campagna malware attiva e diffusa
- 9-10: RISERVATO a eventi eccezionali: attacco stato-nazione su infrastrutture critiche, zero-day sfruttato attivamente su milioni di sistemi, breach massivo con dati di decine di milioni di persone

I tag devono essere scelti tra: malware, ransomware, breach, CVE, APT, policy, tool, phishing, vulnerability, espionage"""

UPDATE_SYSTEM_PROMPT = """Sei un giornalista tecnico specializzato in cybersecurity.
Hai un articolo già pubblicato su una notizia. Sono arrivate nuove fonti sulla stessa notizia.
Il tuo compito è aggiornare l'articolo incorporando le nuove informazioni.

L'articolo aggiornato deve:
- Conservare le informazioni già presenti nell'articolo base
- Integrare le nuove informazioni rilevanti dalle nuove fonti
- Avere un tono professionale ma accessibile
- Non copiare frasi intere (parafrasa sempre)
- Lunghezza 600-900 parole

IGNORA qualsiasi contenuto non editoriale (sponsor, pubblicità, newsletter, boilerplate).

Rispondi SOLO con un oggetto JSON valido con questa struttura:
{
  "titolo": "...",
  "sommario": "... (max 2 righe)",
  "corpo": "... (markdown ben formattato, 600-900 parole. OBBLIGATORIO: paragrafi separati da riga vuota, **grassetto** per termini tecnici chiave, ## per sottotitoli di sezione, elenchi - o 1. quando appropriato. NON scrivere un blocco unico di testo.)",
  "tag": ["...", "..."],
  "score_rilevanza": <intero 1-10>,
  "ig_score": <intero 1-10>,
  "image_query": "2-4 parole in inglese per cercare una foto stock rilevante su Unsplash (es: 'hacker dark screen', 'data breach server', 'ransomware lock computer')"
}

Per ig_score (instagrammabilità): quanto la notizia può diventare virale per il grande pubblico.
- 1-2: solo addetti ai lavori  3-4: community cyber  5-6: utenti tech  7-8: persone comuni  9-10: TG generalisti

Per score_rilevanza usa questa scala RIGOROSA — la maggior parte deve cadere tra 3 e 7:
- 1-2: routine, aggiornamenti minori, patch ordinarie, advisory generici
- 3-4: interesse limitato, software di nicchia, impatto basso
- 5-6: vulnerabilità significativa o breach con impatto moderato
- 7-8: vulnerabilità critica, breach su larga scala, campagna malware attiva
- 9-10: RISERVATO: attacco stato-nazione su infrastrutture critiche, zero-day su milioni di sistemi

I tag devono essere scelti tra: malware, ransomware, breach, CVE, APT, policy, tool, phishing, vulnerability, espionage"""


def _build_user_prompt(scraped_items: list[dict]) -> str:
    parts = ["--- ARTICOLI ---\n"]
    for i, item in enumerate(scraped_items, 1):
        url = item.get("url", "N/A")
        text = item.get("text", "")
        parts.append(f"[FONTE {i}: {url}]\n{text}\n")
    return "\n".join(parts)


def _build_update_prompt(existing_body: str, new_sources: list[dict]) -> str:
    parts = [f"--- ARTICOLO ESISTENTE ---\n{existing_body}\n\n--- NUOVE FONTI ---\n"]
    for i, item in enumerate(new_sources, 1):
        url = item.get("url", "N/A")
        text = item.get("text", "")
        parts.append(f"[NUOVA FONTE {i}: {url}]\n{text}\n")
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


def _strip_md(text: str) -> str:
    """Rimuove markdown bold/italic da campi di testo puro (titolo, sommario)."""
    text = re.sub(r'\*{1,3}(.+?)\*{1,3}', r'\1', text)
    text = re.sub(r'_{1,2}(.+?)_{1,2}', r'\1', text)
    return text.strip()


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

            result["titolo"] = _strip_md(result["titolo"])
            result["sommario"] = _strip_md(result.get("sommario", ""))
            return result

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP {e.response.status_code}: {e.response.text[:300]}")
            return None
        except Exception as e:
            logger.error(f"Errore sintesi: {e}")
            return None

    logger.error("Tutti i tentativi Groq esauriti")
    return None


def synthesize_update(existing_body: str, new_sources: list[dict]) -> dict | None:
    """
    Aggiorna un articolo esistente incorporando nuove fonti.
    Usa un prompt dedicato che istruisce l'LLM a partire dall'articolo già pubblicato.
    """
    if not new_sources or not existing_body:
        return None

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY non trovata nel file .env")

    messages = [
        {"role": "system", "content": UPDATE_SYSTEM_PROMPT},
        {"role": "user", "content": _build_update_prompt(existing_body, new_sources)},
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
                logger.warning(f"Rate limit Groq (update), attendo {wait:.0f}s (tentativo {attempt + 1}/{MAX_RETRIES})")
                time.sleep(wait)
                continue

            resp.raise_for_status()

            raw = resp.json()["choices"][0]["message"]["content"]
            result = _extract_json(raw)

            if not result:
                return None

            required = {"titolo", "sommario", "corpo", "tag", "score_rilevanza"}
            if not required.issubset(result.keys()):
                logger.error(f"Risposta JSON incompleta (update): {result.keys()}")
                return None

            result["titolo"] = _strip_md(result["titolo"])
            result["sommario"] = _strip_md(result.get("sommario", ""))
            return result

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP {e.response.status_code} (update): {e.response.text[:300]}")
            return None
        except Exception as e:
            logger.error(f"Errore re-sintesi: {e}")
            return None

    logger.error("Tutti i tentativi Groq esauriti (update)")
    return None
