# -*- coding: utf-8 -*-
"""
groq_extractor.py — Genera contenuti carosello + caption Instagram via Groq.
"""

import json
import os

from groq import Groq

GROQ_MODEL_SLIDES = "gemma2-9b-it"
GROQ_MODEL_CAPTION = "gemma2-9b-it"

SYSTEM_PROMPT = """Sei un social media manager italiano esperto di cybersecurity che scrive per Instagram.
Ricevi un articolo tecnico e produci: i testi per un carosello di 6 slide + una caption professionale per il post.

REGOLE OBBLIGATORIE:
- Scrivi SOLO in italiano corretto con accenti (è, à, ù, ecc.). MAI usare caratteri ASCII al posto degli accenti.
- NON usare trattini em (—) nel testo delle slide
- cover_title: titolo BREAKING NEWS urgente, max 10 parole. REGOLA FONDAMENTALE: metti l'azione/scoperta ALL'INIZIO, non alla fine. Esempi di struttura vincente: "Sfruttati zero-day per bypassare Defender: 3 nuove falle", "Scoperta backdoor in milioni di router: attacco globale", "Rubati 13 milioni: exchange crypto violato in poche ore", "Allarme: nuova falla critica espone 200.000 server". Parole che aprono bene: Sfruttati / Scoperta / Rubati / Violato / Allarme / Attenzione / Bucato / Compromessi. MAI iniziare con il nome del prodotto/azienda. MAI finire con il verbo. Sempre linguaggio d'azione e urgenza.
- cover_kicker: uno tra BREAKING / URGENTE / ALERT / ESCLUSIVO
- slides[0].text: fatti principali, linguaggio accessibile a tutti (chi, cosa, quando)
- slides[1].text: sistemi, aziende o paesi coinvolti, leggermente più specifico
- slides[2].text: contesto tecnico, implicazioni, il quadro completo
- opinion.text: commento serio e informato sull'episodio, stile analista esperto. Fornisce contesto extra o implicazioni che non compaiono nelle slide precedenti (geopolitica, precedenti storici, impatto reale, cosa significa per il settore). Tono: sobrio, autorevole, mai ironico. GRAMMATICA ITALIANA OBBLIGATORIA: usa forme corrette — "ci è già passato" (non "ci ha già passato"), concordanza corretta dei verbi ausiliari. MAI generalizzare con "aggiornate i sistemi".
- Ogni testo slide: 2-3 frasi. Usa <strong>parola</strong> per i termini chiave.

IMAGE QUERY (CRITICO — SII SPECIFICO):
- OGNI image_query DEVE essere visivamente DIVERSA dalle altre: nessun sfondo ripetuto
- Se l'articolo cita esplicitamente un'azienda (Google, Microsoft, Apple, Meta, Cisco, ecc.) includi SEMPRE il nome dell'azienda nella query: es. "Google Googleplex headquarters campus aerial", "Microsoft Azure logo office building", "Apple Park spaceship campus aerial"
- Se cita un paese o governo, usa immagini specifiche: "US Capitol Washington cybersecurity", "Pentagon building aerial view"
- cover: scena drammatica e specifica dell'ambito colpito (evita immagini generiche di hacker con felpa)
- slides[0].image_query: reazione umana o notizia specifica (giornalista, sala riunioni, conferenza stampa)
- slides[1].image_query: infrastruttura SPECIFICA citata nell'articolo (router Cisco, data center Azure, ecc.)
- slides[2].image_query: visione globale o strategica (mappa, satellite, geopolitica)
- opinion.image_query: immagine positiva/protettiva (es. "person laptop coffee home secure")
- SEMPRE in inglese, 4-7 parole per Unsplash. MAI ripetere parole tra query diverse.

CAPTION INSTAGRAM:
- Tono: social media manager professionista, coinvolgente, diretto, leggermente allarmistico
- Struttura: emoji hook + frase d'apertura forte (1-2 righe) + riga vuota + bullet points o domanda retorica + riga vuota + call to action + link + riga vuota + hashtag
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
  "cover_image_query": "government building night cyber surveillance",
  "slides": [
    {"section": "Cosa è successo",    "text": "...", "image_query": "journalist newsroom alert screen monitor"},
    {"section": "Chi è coinvolto",    "text": "...", "image_query": "corporate server room data center hardware"},
    {"section": "Il quadro completo", "text": "...", "image_query": "world map digital network satellite view"}
  ],
  "opinion": {
    "section": "Il consiglio di FoxScan",
    "text": "...",
    "image_query": "person laptop home office coffee secure"
  },
  "caption": "🔴 [hook forte] ...\\n\\n[2-3 righe di contesto o bullet points]\\n\\n[CTA + link]\\n\\n#hashtag1 #hashtag2 ..."
}"""


CAPTION_PROMPT = """Sei un social media manager italiano esperto di cybersecurity.
Scrivi UNA caption Instagram professionale basata sui testi delle slide forniti.

REGOLE:
- Italiano perfetto e corretto grammaticalmente
- Tono coinvolgente, diretto, leggermente allarmistico ma professionale
- Struttura: emoji hook + frase d'apertura forte + riga vuota + 2-3 punti chiave con ° + riga vuota + CTA + www.foxscan.vercel.app + riga vuota + hashtag
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

    # Chiamata 1: testi slide con modello veloce (8b)
    response = client.chat.completions.create(
        model=GROQ_MODEL_SLIDES,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_content},
        ],
        temperature=0.5,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    data = json.loads(raw)
    _validate(data)

    # Chiamata 2: caption con modello migliore (70b) — solo testo breve
    slide_summary = "\n".join([
        f"Titolo: {data['cover_title']}",
        f"Slide 1: {data['slides'][0]['text']}",
        f"Slide 2: {data['slides'][1]['text']}",
        f"Slide 3: {data['slides'][2]['text']}",
    ])
    caption_resp = client.chat.completions.create(
        model=GROQ_MODEL_CAPTION,
        messages=[
            {"role": "system", "content": CAPTION_PROMPT},
            {"role": "user",   "content": slide_summary},
        ],
        temperature=0.6,
    )
    data["caption"] = caption_resp.choices[0].message.content.strip()

    return data


def _validate(data: dict) -> None:
    required_top = {"cover_title", "cover_kicker", "cover_image_query", "slides", "opinion", "caption"}
    missing = required_top - data.keys()
    if missing:
        raise ValueError(f"Groq output manca di: {missing}")
    if len(data["slides"]) != 3:
        raise ValueError(f"Attese 3 slides, ricevute {len(data['slides'])}")
    for i, slide in enumerate(data["slides"]):
        for key in ("section", "text", "image_query"):
            if not slide.get(key):
                raise ValueError(f"Slide {i} manca di '{key}'")
    for key in ("section", "text", "image_query"):
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
