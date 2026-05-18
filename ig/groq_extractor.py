# -*- coding: utf-8 -*-
"""
groq_extractor.py — Genera contenuti carosello + caption Instagram via Groq.
"""

import json
import logging
import os
import re
import time

from groq import Groq

logger = logging.getLogger(__name__)

GROQ_MODEL_SLIDES   = "openai/gpt-oss-20b"
GROQ_MODEL_CAPTION  = "openai/gpt-oss-20b"
GROQ_MODEL_FALLBACK = "llama-3.3-70b-versatile"  # usato SOLO se il modello principale fallisce 3 volte

SYSTEM_PROMPT = """Sei un social media manager italiano esperto di cybersecurity che scrive per Instagram.
Ricevi un articolo tecnico e produci: i testi per un carosello di 6 slide + una caption professionale per il post.

REGOLE OBBLIGATORIE:
- Scrivi SOLO in italiano corretto con accenti (è, à, ù, ecc.). MAI usare caratteri ASCII al posto degli accenti.
- NON usare trattini em (—) nel testo delle slide
- cover_title: max 10 parole, titolo giornalistico chiaro e d'impatto. DUE CASI:
  CASO 1 — articolo su una grande azienda nota (Google, Microsoft, Apple, Cisco, Meta, Amazon, Samsung, Oracle, Fortinet, Palo Alto, CrowdStrike, ecc.): metti SEMPRE il nome azienda in grassetto PER PRIMO, poi ":" e cosa è successo. Esempi: "**Google**: zero-day in Chrome già sfruttato, aggiornate subito", "**Cisco**: falla critica nei router espone migliaia di reti", "**Microsoft** Exchange: credenziali di massa rubate via SSRF", "**Apple**: vulnerabilità nel kernel colpisce iPhone e Mac".
  CASO 2 — articolo generico senza grande brand protagonista: usa un fatto concreto e d'impatto (numero di vittime, dato, conseguenza reale) come apertura. Struttura libera ma sempre con ":" come separatore naturale. Esempi: "13 milioni di account violati: la colpa è di una singola API", "600 aziende colpite in 48 ore: supply chain nel mirino", "Zero patch disponibile: falla critica già sfruttata attivamente", "Ransomware ferma tre ospedali: dati dei pazienti in ostaggio".
  REGOLE VALIDE PER ENTRAMBI I CASI: MAI usare parole generiche come "Allarme", "Attenzione", "Scoperta", "Violati", "Rubati" come prima parola — sono vuote e ripetitive. Il titolo deve far capire subito di cosa parla la notizia.
- cover_title GRASSETTO — REGOLA TASSATIVA OBBLIGATORIA: il cover_title deve contenere SEMPRE esattamente 1 o 2 parole in **grassetto**. Senza grassetto il titolo non è valido. Metti in grassetto: il nome dell'azienda (es. **Google**, **Cisco**), OPPURE il numero chiave (es. **3 milioni**, **15 CVE**), OPPURE il nome del malware/vulnerabilità (es. **Log4Shell**, **zero-day**). Esempi corretti: "**Google**: falla critica in Chrome già sfruttata", "**13 milioni** di account violati: colpa di una API", "**Cisco**: patch urgente per falla nei router", "Kernel Linux: scoperta vulnerabilità **Fragnesia** già sfruttata".
- cover_kicker: uno tra BREAKING / URGENTE / ALERT / ESCLUSIVO
- slides[]: scegli per ogni slide il titolo di sezione (campo "section") più adatto a QUELL'articolo specifico. NON usare sempre le stesse tre sezioni — variali in base a cosa è più interessante e rilevante nella notizia.
  REGOLE per "section": massimo 3-4 parole, in italiano, specifico e concreto. Esempi: "Le vittime", "Come funziona", "I paesi colpiti", "Il gruppo dietro", "La tecnica usata", "Dati rubati", "L'impatto reale", "Il malware", "Quanto è grave", "I precedenti", "Chi ha scoperto", "Le patch disponibili", "Il vettore d'attacco", "Cosa è stato rubato", "Le organizzazioni colpite". Evita titoli generici come "Il quadro completo" o "Chi è coinvolto" — sii specifico sulla notizia.
  Il contenuto delle tre slide deve coprire insieme: i fatti principali, i dettagli tecnici/chi è coinvolto, e il contesto/implicazioni — ma distribuiscili come meglio si adatta alla storia.
- opinion.text: commento serio e informato sull'episodio, stile analista esperto. Fornisce contesto extra o implicazioni che non compaiono nelle slide precedenti (geopolitica, precedenti storici, impatto reale, cosa significa per il settore). Tono: sobrio, autorevole, mai ironico. GRAMMATICA ITALIANA OBBLIGATORIA: usa forme corrette — "ci è già passato" (non "ci ha già passato"), concordanza corretta dei verbi ausiliari. MAI generalizzare con "aggiornate i sistemi". LIMITE TASSATIVO: massimo 200 caratteri, non superare mai questo limite.
- Ogni testo slide: 2-3 frasi brevi. LIMITE TASSATIVO: massimo 220 caratteri (spazi inclusi). Conta i caratteri prima di rispondere. Usa <strong>parola</strong> per i termini chiave.

IMAGE QUERY (CRITICO — SII SPECIFICO):
- OGNI image_query DEVE essere visivamente DIVERSA dalle altre: nessun sfondo ripetuto
- Se l'articolo cita esplicitamente un'azienda (Google, Microsoft, Apple, Meta, Cisco, ecc.) includi SEMPRE il nome dell'azienda nella query: es. "Google Googleplex headquarters campus aerial", "Microsoft Azure logo office building", "Apple Park spaceship campus aerial"
- Se cita un paese o governo, usa immagini specifiche: "US Capitol Washington cybersecurity", "Pentagon building aerial view"
- slides[0].image_query: reazione umana o notizia specifica (giornalista, sala riunioni, conferenza stampa)
- slides[1].image_query: infrastruttura SPECIFICA citata nell'articolo (router Cisco, data center Azure, ecc.)
- slides[2].image_query: visione globale o strategica (mappa, satellite, geopolitica)
- SEMPRE in inglese, 4-7 parole per Pexels. MAI ripetere parole tra query diverse.

CAPTION INSTAGRAM:
- Tono: social media manager professionista, coinvolgente, diretto, leggermente allarmistico
- Struttura: emoji hook + frase d'apertura forte (1-2 righe) + riga vuota + bullet points o domanda retorica + riga vuota + CTA per leggere le news (es. "Tutte le notizie cyber su www.foxscan.vercel.app") + riga vuota + hashtag
- FoxScan è un aggregatore di notizie cyber, NON uno scanner di vulnerabilità: il CTA NON deve mai dire "proteggi la tua azienda", "scopri le vulnerabilità" o simili
- Usa 10-12 hashtag mix italiano/inglese pertinenti al contenuto specifico. Gli hashtag NON devono contenere trattini "-": scrivi le parole attaccate (es. #zeroday non #zero-day, #databreach non #data-breach)
- Emoji: usale con misura ma in modo strategico (max 4-5 totali)
- La caption NON deve essere generica: deve rispecchiare il contenuto specifico dell'articolo
- NON includere il consiglio di FoxScan nella caption (è già nelle slide), concentrati sui fatti
- NON usare **grassetto** markdown nella caption (non funziona su Instagram), scrivi testo normale
- NON includere "Scorri per approfondire" perché lo aggiungiamo noi separatamente
- NON scrivere "[link]" o "[URL]" come placeholder: il link viene aggiunto automaticamente, non metterlo nella caption

Rispondi SOLO con JSON valido, niente testo extra, niente markdown.

Schema JSON:
{
  "cover_title": "max 10 parole allarmanti",
  "cover_kicker": "BREAKING",
  "slides": [
    {"section": "[titolo specifico per questa notizia, max 4 parole]", "text": "...", "image_query": "journalist newsroom alert screen monitor"},
    {"section": "[titolo specifico per questa notizia, max 4 parole]", "text": "...", "image_query": "corporate server room data center hardware"},
    {"section": "[titolo specifico per questa notizia, max 4 parole]", "text": "...", "image_query": "world map digital network satellite view"}
  ],
  "opinion": {
    "section": "Il consiglio di FoxScan",
    "text": "..."
  },
  "caption": "🔴 [hook forte] ...\\n\\n• [punto chiave 1]\\n• [punto chiave 2]\\n• [punto chiave 3]\\n\\n[CTA + link]\\n\\n#hashtag1 #hashtag2 ..."
}"""


CAPTION_PROMPT = """Sei un social media manager italiano esperto di cybersecurity.
Scrivi UNA caption Instagram professionale basata sui testi delle slide forniti.

CONTESTO: FoxScan è un aggregatore di notizie sulla sicurezza informatica — NON uno scanner di vulnerabilità, NON uno strumento di analisi aziendale. Il CTA deve invitare a leggere le ultime notizie cyber, non a "proteggere la propria azienda" o "scoprire vulnerabilità".

REGOLE:
- Italiano perfetto e corretto grammaticalmente
- Tono coinvolgente, diretto, leggermente allarmistico ma professionale
- Struttura: emoji hook + frase d'apertura forte + riga vuota + 2-3 punti chiave con "• " (bullet + spazio) + riga vuota + CTA + www.foxscan.vercel.app + riga vuota + hashtag
- CTA esempi corretti: "Tutte le notizie cyber su www.foxscan.vercel.app", "Resta aggiornato su www.foxscan.vercel.app", "Leggi tutti gli aggiornamenti su www.foxscan.vercel.app"
- CTA da EVITARE: qualsiasi frase tipo "proteggi la tua azienda", "scopri le vulnerabilità", "analizza i tuoi sistemi", "metti al sicuro la tua rete"
- 10-12 hashtag mix italiano/inglese, senza trattini (es. #zeroday non #zero-day)
- NON usare **grassetto** markdown
- NON scrivere [link] o placeholder
- NON ripetere il consiglio FoxScan (è già nelle slide)
Rispondi SOLO con il testo della caption, niente altro."""


def extract_carousel_data(article: dict) -> dict:
    client = Groq(api_key=os.environ["GROQ_API_KEY"])

    tags = article.get("tags", [])
    if isinstance(tags, str):
        try:
            tags = json.loads(tags)
        except json.JSONDecodeError:
            tags = [tags]

    user_content = (
        f"Titolo: {article['title']}\n\n"
        f"Tag: {', '.join(tags)}\n\n"
        f"Sommario: {article.get('summary', '')}\n\n"
        f"Testo completo:\n{article.get('body', '')[:4000]}"
    )

    # Chiamata 1: testi slide
    data = None
    for attempt in range(1, 4):
        response = client.chat.completions.create(
            model=GROQ_MODEL_SLIDES,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": user_content},
            ],
            temperature=0.5,
        )
        raw = response.choices[0].message.content.strip()
        if not raw:
            logger.warning("Tentativo %d: risposta vuota da %s", attempt, GROQ_MODEL_SLIDES)
            if attempt < 3:
                time.sleep(2)
            continue
        extracted = _extract_json(raw)
        if not extracted:
            logger.warning("Tentativo %d: JSON non trovato. Raw: %.200s", attempt, raw)
            if attempt < 3:
                time.sleep(2)
            continue
        try:
            data = json.loads(extracted)
            _validate(data)
            break
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning("Tentativo %d: parsing fallito (%s). Raw: %.200s", attempt, e, raw)
            if attempt < 3:
                time.sleep(2)

    if data is None:
        # Fallback di emergenza: prova con llama-3.3-70b-versatile
        logger.warning(
            "Modello principale %s fallito 3 volte — fallback emergenza su %s",
            GROQ_MODEL_SLIDES, GROQ_MODEL_FALLBACK,
        )
        for attempt in range(1, 4):
            response = client.chat.completions.create(
                model=GROQ_MODEL_FALLBACK,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": user_content},
                ],
                temperature=0.5,
            )
            raw = response.choices[0].message.content.strip()
            if not raw:
                logger.warning("Fallback tentativo %d: risposta vuota", attempt)
                if attempt < 3:
                    time.sleep(2)
                continue
            extracted = _extract_json(raw)
            if not extracted:
                logger.warning("Fallback tentativo %d: JSON non trovato", attempt)
                if attempt < 3:
                    time.sleep(2)
                continue
            try:
                data = json.loads(extracted)
                _validate(data)
                logger.info("Fallback %s riuscito al tentativo %d", GROQ_MODEL_FALLBACK, attempt)
                break
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning("Fallback tentativo %d: parsing fallito (%s)", attempt, e)
                if attempt < 3:
                    time.sleep(2)

    if data is None:
        raise ValueError(
            f"Groq non ha restituito JSON valido né con {GROQ_MODEL_SLIDES} né con {GROQ_MODEL_FALLBACK}"
        )

    # Chiamata 2: caption con modello migliore (70b) — solo testo breve
    slide_summary = "\n".join([
        f"Titolo: {data['cover_title']}",
        f"Slide 1: {data['slides'][0]['text']}",
        f"Slide 2: {data['slides'][1]['text']}",
        f"Slide 3: {data['slides'][2]['text']}",
    ])
    caption_text = None
    for attempt in range(1, 4):
        caption_resp = client.chat.completions.create(
            model=GROQ_MODEL_CAPTION,
            messages=[
                {"role": "system", "content": CAPTION_PROMPT},
                {"role": "user",   "content": slide_summary},
            ],
            temperature=0.6,
        )
        caption_text = caption_resp.choices[0].message.content.strip()
        if caption_text:
            break
        logger.warning("Caption tentativo %d: risposta vuota", attempt)
        if attempt < 3:
            time.sleep(2)
    if not caption_text:
        raise ValueError("Groq non ha restituito la caption dopo 3 tentativi")
    data["caption"] = caption_text

    return data


def _extract_json(raw: str) -> str:
    """Estrae il blocco JSON da una risposta che potrebbe contenere markdown o testo extra."""
    # Rimuove blocchi ```json ... ``` o ``` ... ```
    if "```" in raw:
        raw = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("`").strip()
    # Trova il primo { e l'ultimo } per isolare l'oggetto JSON
    start = raw.find("{")
    end   = raw.rfind("}")
    if start != -1 and end != -1 and end > start:
        return raw[start:end + 1]
    return raw


def _validate(data: dict) -> None:
    # caption non è ancora presente a questo punto (viene aggiunta dopo)
    required_top = {"cover_title", "cover_kicker", "slides", "opinion"}
    missing = required_top - data.keys()
    if missing:
        raise ValueError(f"Groq output manca di: {missing}")
    if len(data["slides"]) != 3:
        raise ValueError(f"Attese 3 slides, ricevute {len(data['slides'])}")
    for i, slide in enumerate(data["slides"]):
        for key in ("section", "text", "image_query"):
            if not slide.get(key):
                raise ValueError(f"Slide {i} manca di '{key}'")
    for key in ("section", "text"):
        if not data["opinion"].get(key):
            raise ValueError(f"opinion manca di '{key}'")


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()

    demo = {
        "title": "CISA aggiunge 15 CVE al catalogo delle vulnerabilità sfruttate attivamente",
        "summary": "La CISA ha aggiornato il KEV con 15 nuove vulnerabilità già sfruttate da APT e gruppi criminali.",
        "body": "La Cybersecurity and Infrastructure Security Agency (CISA) ha aggiunto 15 nuove voci al suo Known Exploited Vulnerabilities (KEV) catalog. Tra i sistemi colpiti figurano Cisco IOS XE, Fortinet FortiOS e Microsoft Exchange. I difetti sono attivamente sfruttati da gruppi APT e operatori ransomware su scala globale.",
        "tags": ["CVE", "vulnerability", "CISA"],
    }
    result = extract_carousel_data(demo)
    print(json.dumps(result, ensure_ascii=False, indent=2))
