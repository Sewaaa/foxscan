<p align="center">
  <img src="frontend/public/logo_nobg.png" alt="FoxScan Logo" width="180"/>
</p>

<h1 align="center">FoxScan</h1>
<p align="center">AI-powered cybersecurity intelligence — automatically discovers, clusters, and synthesizes the latest security news into concise briefings.</p>

<p align="center">
  🌐 <a href="https://foxscan.vercel.app"><strong>foxscan.vercel.app</strong></a>
  &nbsp;·&nbsp;
  <a href="https://foxscan.vercel.app/rss">RSS Feed</a>
</p>

---

## What it does

FoxScan runs a fully automated pipeline every 30 minutes:

1. **Discovery** — polls 21 RSS feeds from top cybersecurity sources and deduplicates via SHA-256
2. **Clustering** — groups related stories by topic using fuzzy string similarity (rapidfuzz, threshold 55)
3. **Scraping** — extracts full article text via trafilatura, with RSS summary as automatic fallback
4. **Synthesis** — sends each cluster to Groq LLaMA 3.3 70B, which returns a structured briefing: title, summary, markdown body, tags, and relevance score
5. **Merging** — if a similar article already exists (< 48h), it re-synthesizes with the new source merged in rather than creating a duplicate
6. **Images** — fetches a contextual cover image from Unsplash based on article tags
7. **Serving** — exposes articles via a REST API consumed by the Next.js frontend

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), Tailwind CSS, TypeScript |
| Backend | FastAPI, SQLAlchemy, APScheduler |
| Database | PostgreSQL (Neon serverless, free tier) / SQLite locally |
| AI / LLM | Groq API — LLaMA 3.3 70B Versatile |
| Scraping | trafilatura, feedparser |
| Clustering | rapidfuzz (token set ratio) |
| Images | Unsplash API |
| Deploy | Vercel (frontend) + any Docker-capable server (backend) |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      VERCEL (CDN)                        │
│  Next.js 15 — SSR/ISR pages, Tailwind dark theme        │
│  Homepage · Article · Category · About · Admin · RSS    │
└─────────────────────────┬────────────────────────────────┘
                          │  REST API (JSON)
                          ▼
┌──────────────────────────────────────────────────────────┐
│         ANY SERVER — Docker (Render, VPS, home lab…)     │
│  FastAPI — /articles  /tags  /rss  /admin/*  /health    │
│                                                          │
│  APScheduler ──► Pipeline (every 30 min)                │
│    ├── Discovery    (feedparser → 21 RSS feeds)         │
│    ├── Clustering   (rapidfuzz similarity)              │
│    ├── Scraping     (trafilatura + RSS fallback)        │
│    ├── Synthesis    (Groq → LLaMA 3.3 70B → JSON)      │
│    ├── Merging      (re-synthesis if duplicate < 48h)   │
│    └── Image finder (Unsplash contextual cover)         │
└─────────────────────────┬────────────────────────────────┘
                          │  SQLAlchemy ORM
                          ▼
┌──────────────────────────────────────────────────────────┐
│           NEON (Serverless PostgreSQL — EU Frankfurt)    │
│  Articles · Sources · RssItems · PipelineRuns           │
└──────────────────────────────────────────────────────────┘
```

---

## Features

- **Fully automated** — no manual curation, pipeline runs on a schedule every 30 minutes
- **Smart deduplication** — SHA-256 hashing prevents storing the same RSS item twice; fuzzy clustering prevents publishing the same story twice
- **Source merging** — when a new source covers the same story (within 48h), the article is re-synthesized to include all perspectives
- **Contextual images** — each article gets a cover image fetched from Unsplash based on its tags
- **RSS output** — subscribe to AI-generated briefings in any feed reader
- **Auto-tagging** — LLM assigns tags (ransomware, CVE, phishing, APT, espionage, etc.)
- **Relevance scoring** — articles ranked 1–10 with 3-level visual indicator (green / orange / red)
- **"In Evidenza"** — critical articles (score 8–10) pinned at top in a featured strip
- **Daily briefing** — "Top threats of the day" section with the most relevant current threats
- **Night mode UI** — friendly sleep screen when the NAS is in standby (23:00–09:00 CET)
- **Dark / light mode** — toggle between themes, cyberpunk-inspired design, fully responsive
- **Admin panel** — trigger pipeline, view live stats, feed stats per source, reset items (password protected)
- **Resilient scraping** — gracefully falls back to RSS content when web scraping is blocked
- **SEO** — dynamic sitemap, robots.txt, OG + Twitter card metadata per article
- **Security** — rate limiting, admin auth, SSRF protection, CSP headers
- **i18n** — Italian and English UI (next-intl)

---

## Running Locally

### Prerequisites
- Python 3.11+
- Node.js 18+
- A [Groq API key](https://console.groq.com) (free)
- An [Unsplash API key](https://unsplash.com/developers) (free, optional — images will be skipped if absent)

### Backend

```bash
cd backend

python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env`:
```env
GROQ_API_KEY=your_groq_api_key_here
UNSPLASH_ACCESS_KEY=your_unsplash_key_here
ADMIN_SECRET=a_random_secret_string
FRONTEND_URL=http://localhost:3000
# Optional: use a remote PostgreSQL URL (defaults to local SQLite)
# DATABASE_URL=postgresql://user:pass@host/dbname
```

```bash
uvicorn main:app --reload --port 8080
```

- API: `http://localhost:8080`
- Interactive docs: `http://localhost:8080/docs`

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

```bash
npm run dev
```

Frontend: `http://localhost:3000`

---

## Deploy

### 1. Database — Neon PostgreSQL (free, persistent)

1. Create a free project on [neon.tech](https://neon.tech)
2. Copy the **Connection String** (starts with `postgresql://...`)

### 2. Backend — Docker

The backend ships with a `Dockerfile` and `docker-compose.yml`. It runs on any Docker-capable host — a VPS, a cloud service (Render, Railway, Fly.io), or a home server.

```bash
cd backend
cp .env.example .env   # fill in your keys
sudo docker compose up -d --build
```

Environment variables in `backend/.env`:

| Key | Value |
|---|---|
| `GROQ_API_KEY` | Your Groq API key |
| `UNSPLASH_ACCESS_KEY` | Your Unsplash API key |
| `DATABASE_URL` | PostgreSQL connection string |
| `FRONTEND_URL` | `https://your-vercel-app.vercel.app` (used for CORS) |
| `ADMIN_SECRET` | A strong random string to protect admin endpoints |

**No Docker?** You can also deploy directly on [Render](https://render.com) (free tier):
- New → Web Service → connect repo, root directory `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### 3. Frontend — Vercel

```bash
cd frontend
npx vercel
```

Set in Vercel dashboard → Environment Variables:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | Your backend public URL (e.g. `https://your-service.onrender.com`) |

---

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/articles` | — | List articles — supports `?tag=`, `?min_score=`, `?max_score=`, `?limit=`, `?offset=` |
| `GET` | `/articles/{id}` | — | Full article with markdown body and sources |
| `GET` | `/tags` | — | All tags with article counts |
| `GET` | `/rss` | — | RSS 2.0 feed (last 50 articles) |
| `POST` | `/admin/run-pipeline` | `X-Admin-Key` | Trigger pipeline immediately |
| `POST` | `/admin/reset-items` | `X-Admin-Key` | Re-queue all processed RSS items |
| `DELETE` | `/admin/delete-all-articles` | `X-Admin-Key` | Delete all articles and sources from DB |
| `GET` | `/admin/stats` | `X-Admin-Key` | Live pipeline stats |
| `GET` | `/admin/feed-stats` | `X-Admin-Key` | Item count and multi-source count per RSS feed |
| `GET` | `/admin/pipeline-history` | `X-Admin-Key` | Last 30 pipeline runs |
| `GET` / `HEAD` | `/health` | — | Health check — `{"status": "ok"}` |

---

## Project Structure

```
FoxScan/
├── backend/
│   ├── pipeline/
│   │   ├── discovery.py      # RSS fetching, SHA-256 dedup, RSS content caching
│   │   ├── clustering.py     # Fuzzy topic clustering (rapidfuzz)
│   │   ├── scraper.py        # Web scraping + RSS summary fallback
│   │   ├── synthesizer.py    # Groq LLM call, JSON parsing, retry on rate limit
│   │   ├── merger.py         # Re-synthesis when duplicate source found < 48h
│   │   └── image_finder.py   # Unsplash cover image fetch per article
│   ├── main.py               # FastAPI app, endpoints, CORS
│   ├── models.py             # SQLAlchemy models (Article, Source, RssItem, PipelineRun)
│   ├── scheduler.py          # APScheduler — pipeline runner with threading lock
│   ├── database.py           # DB engine, SQLite/PostgreSQL compat, migrations
│   ├── config.py             # RSS feeds, model name, thresholds
│   ├── Dockerfile            # Python 3.11-slim image
│   ├── docker-compose.yml    # Backend service
│   ├── .env.example          # Environment variable template
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── page.tsx                  # Homepage — client-side, retry on backend unavailable
    │   ├── about/page.tsx            # About — platform overview
    │   ├── article/[id]/page.tsx     # Article detail — ISR (revalidate 1h), OG metadata
    │   ├── category/[tag]/page.tsx   # Tag filter — ISR (revalidate 1min)
    │   ├── admin/page.tsx            # Admin panel — password login, live stats polling
    │   ├── sitemap.ts                # Dynamic sitemap (last 100 articles)
    │   └── error.tsx                 # Global error boundary
    ├── components/
    │   ├── Header.tsx         # Navigation with mobile drawer
    │   ├── ArticleCard.tsx    # Article card with image, relevance dots, tags
    │   ├── RelevanceDots.tsx  # 3-dot visual relevance indicator
    │   ├── TagBadge.tsx       # Color-coded tag badge per category
    │   ├── ThemeToggle.tsx    # Dark / light mode toggle
    │   ├── LanguageToggle.tsx # IT / EN language switcher
    │   └── TopCriticalDropdown.tsx  # "Top threats" header dropdown
    ├── messages/
    │   ├── it.json            # Italian UI strings
    │   └── en.json            # English UI strings
    ├── lib/api.ts             # Type-safe API client
    └── public/robots.txt      # Disallow /admin, Sitemap pointer
```

---

## News Sources

21 RSS feeds polled every 30 minutes:

| Source | Domain |
|---|---|
| BleepingComputer | bleepingcomputer.com |
| The Hacker News | thehackernews.com |
| Krebs on Security | krebsonsecurity.com |
| Dark Reading | darkreading.com |
| Security Affairs | securityaffairs.com |
| Graham Cluley | grahamcluley.com |
| SecurityWeek | securityweek.com |
| Help Net Security | helpnetsecurity.com |
| Infosecurity Magazine | infosecurity-magazine.com |
| Wired Security | wired.com |
| CyberScoop | cyberscoop.com |
| The Register Security | theregister.com |
| SC Magazine | scmagazine.com |
| TechCrunch Security | techcrunch.com |
| Malwarebytes Blog | malwarebytes.com |
| Recorded Future | recordedfuture.com |
| Unit 42 (Palo Alto Networks) | unit42.paloaltonetworks.com |
| Cisco Talos | blog.talosintelligence.com |
| Microsoft Security Blog | microsoft.com |
| Sophos News | news.sophos.com |
| Schneier on Security | schneier.com |

---

## License

MIT
