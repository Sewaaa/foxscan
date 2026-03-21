# CyberNews

Piattaforma di notizie automatizzata dedicata alla cybersecurity. Il sistema raccoglie articoli da feed RSS di fonti autorevoli, li raggruppa per topic tramite fuzzy matching, e usa un LLM locale (Ollama) per sintetizzare ogni cluster in un unico articolo in italiano.

## Stack

| Layer | Tecnologia |
|---|---|
| LLM | Ollama + Llama 3.1 8B (locale, costo €0) |
| Discovery | feedparser (RSS polling ogni 30 min) |
| Scraping | trafilatura |
| Clustering | rapidfuzz (fuzzy title matching) |
| Backend | FastAPI + SQLAlchemy + SQLite |
| Scheduling | APScheduler |
| Frontend | Next.js 15 + Tailwind CSS |
| Deploy | Vercel (frontend) + Render free tier (backend) |

## Struttura

```
cybernews/
├── backend/
│   ├── main.py              # FastAPI app + endpoints
│   ├── scheduler.py         # APScheduler pipeline ogni 30 min
│   ├── pipeline/
│   │   ├── discovery.py     # RSS fetching + dedup via SHA-256
│   │   ├── clustering.py    # Raggruppamento per topic (rapidfuzz)
│   │   ├── scraper.py       # Trafilatura full text extraction
│   │   └── synthesizer.py   # Ollama prompt + JSON parsing
│   ├── models.py            # SQLAlchemy models
│   ├── database.py          # SQLite connection
│   ├── config.py            # Feed RSS, impostazioni
│   ├── seed_demo.py         # Dati demo per sviluppo frontend
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── page.tsx               # Homepage
    │   ├── article/[id]/page.tsx  # Pagina articolo
    │   ├── category/[tag]/page.tsx # Filtro per tag
    │   ├── admin/page.tsx         # Pannello admin
    │   └── api/rss-proxy/route.ts # Proxy RSS
    ├── components/
    │   ├── ArticleCard.tsx
    │   ├── TagBadge.tsx
    │   └── SourcesList.tsx
    └── lib/
        └── api.ts
```

## Avvio rapido

### Prerequisiti

- Python 3.11+
- Node.js 18+
- [Ollama](https://ollama.ai) installato e in esecuzione

### 1. Scarica il modello LLM

```bash
ollama pull llama3.1:8b
```

### 2. Backend

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt

# Seed database con articoli demo (opzionale, per sviluppare il frontend)
python seed_demo.py

# Avvia il server
uvicorn main:app --reload --port 8000
```

API disponibile su `http://localhost:8000`
Documentazione interattiva: `http://localhost:8000/docs`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend disponibile su `http://localhost:3000`

## API Endpoints

| Metodo | Endpoint | Descrizione |
|---|---|---|
| GET | `/articles` | Lista articoli (paginata, filtrabile per tag) |
| GET | `/articles/{id}` | Singolo articolo con corpo completo |
| GET | `/tags` | Tutti i tag con conteggio |
| GET | `/rss` | Feed RSS in uscita |
| GET | `/health` | Health check |
| GET | `/admin/stats` | Statistiche pipeline |
| POST | `/admin/run-pipeline` | Esegui pipeline manualmente |

### Parametri `/articles`

- `tag` — filtra per tag (es. `?tag=ransomware`)
- `limit` — numero risultati (default 20, max 100)
- `offset` — paginazione

## Pipeline

```
RSS Feeds → Discovery (SHA-256 dedup) → Clustering (rapidfuzz) → Scraping (trafilatura) → Sintesi (Ollama) → SQLite → API → Frontend
```

La pipeline gira automaticamente ogni 30 minuti tramite APScheduler. Si può anche triggerare manualmente dall'endpoint `/admin/run-pipeline` o dal pannello admin.

## Configurazione

Modifica `backend/config.py` per:
- Aggiungere/rimuovere feed RSS
- Cambiare modello Ollama (`OLLAMA_MODEL`)
- Modificare la frequenza di polling (`FETCH_INTERVAL_MINUTES`)
- Cambiare la soglia di clustering (`SIMILARITY_THRESHOLD`)

## Deploy

### Frontend (Vercel)
```bash
cd frontend
npx vercel
```
Imposta la variabile d'ambiente `NEXT_PUBLIC_API_URL` con l'URL del backend.

### Backend (Render)
1. Crea un nuovo Web Service su Render
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

**Nota**: Su Render free tier, Ollama non è disponibile. Usa il [Groq API](https://groq.com) come alternativa gratuita — modifica `synthesizer.py` per usare `groq` invece di httpx verso Ollama.

## Alternativa a Ollama: Groq API (gratuito)

```python
# In synthesizer.py, sostituire la chiamata httpx con:
from groq import Groq
client = Groq(api_key=os.environ["GROQ_API_KEY"])
completion = client.chat.completions.create(
    model="llama-3.1-8b-instant",
    messages=[...],
)
```
