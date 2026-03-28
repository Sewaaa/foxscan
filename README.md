# FoxScan

> AI-powered cybersecurity intelligence — automatically discovers, clusters, and synthesizes the latest security news into concise Italian-language briefings.

🌐 **[foxscan.vercel.app](https://foxscan.vercel.app)** &nbsp;·&nbsp; **[API Docs](https://cybernews-bxml.onrender.com/docs)** &nbsp;·&nbsp; **[RSS Feed](https://foxscan.vercel.app/rss)**

---

## What it does

FoxScan runs a fully automated pipeline every 30 minutes:

1. **Discovery** — polls 17 RSS feeds from top cybersecurity sources and deduplicates via SHA-256
2. **Clustering** — groups related stories by topic using fuzzy string similarity (rapidfuzz, threshold 55)
3. **Scraping** — extracts full article text via trafilatura, with RSS summary as automatic fallback
4. **Synthesis** — sends each cluster to Groq LLaMA 3.3 70B, which returns a structured Italian briefing: title, summary, markdown body, tags, and relevance score
5. **Merging** — if a similar article already exists (< 24h), it re-synthesizes with the new source merged in rather than creating a duplicate
6. **Images** — fetches a contextual cover image from Unsplash based on article tags
7. **Serving** — exposes articles via a REST API consumed by the Next.js frontend

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), Tailwind CSS, TypeScript |
| Backend | FastAPI, SQLAlchemy, APScheduler |
| Database | PostgreSQL (Neon serverless, persistent, free tier) / SQLite locally |
| AI / LLM | Groq API — LLaMA 3.3 70B Versatile |
| Scraping | trafilatura, feedparser |
| Clustering | rapidfuzz (token set ratio) |
| Images | Unsplash API |
| Deploy | Vercel (frontend) + Render (backend) |

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
│                  RENDER (Web Service)                    │
│  FastAPI — /articles  /tags  /rss  /admin/*  /health    │
│                                                          │
│  APScheduler ──► Pipeline (every 30 min)                │
│    ├── Discovery    (feedparser → 17 RSS feeds)         │
│    ├── Clustering   (rapidfuzz similarity)              │
│    ├── Scraping     (trafilatura + RSS fallback)        │
│    ├── Synthesis    (Groq → LLaMA 3.3 70B → JSON)      │
│    ├── Merging      (re-synthesis if duplicate < 24h)   │
│    └── Image finder (Unsplash contextual cover)         │
└─────────────────────────┬────────────────────────────────┘
                          │  SQLAlchemy ORM
                          ▼
┌──────────────────────────────────────────────────────────┐
│           NEON (Serverless PostgreSQL — EU Frankfurt)    │
│  Articles · Sources · RssItems                          │
└──────────────────────────────────────────────────────────┘
```

---

## Features

- **Fully automated** — no manual curation, pipeline runs on a schedule every 30 minutes
- **Smart deduplication** — SHA-256 hashing prevents storing the same RSS item twice; fuzzy clustering prevents publishing the same story twice
- **Source merging** — when a new source covers the same story, the article is re-synthesized to include all perspectives
- **Contextual images** — each article gets a cover image fetched from Unsplash based on its tags
- **RSS output** — subscribe to AI-generated briefings in any feed reader
- **Auto-tagging** — LLM assigns tags (ransomware, CVE, phishing, APT, espionage, etc.)
- **Relevance dots** — articles ranked with 3-level visual indicator (green / orange / red)
- **"In Evidenza"** — critical articles (score 8–10) pinned at top for 48h in a featured strip
- **Daily briefing** — "Top threats of the day" section with the most relevant current threats
- **About page** — overview of the platform, sources, and pipeline
- **Dark / light mode** — toggle between themes, cyberpunk-inspired design, fully responsive
- **Admin panel** — trigger pipeline, view live stats, reset items, delete all articles (password protected)
- **Resilient scraping** — gracefully falls back to RSS content when web scraping is blocked
- **Auto-retry on cold start** — frontend retries article fetching automatically while the backend wakes up on Render free tier
- **Collapsible tag filter** — filter by category or relevance level
- **SEO** — dynamic sitemap, robots.txt, OG + Twitter card metadata per article
- **Security** — rate limiting, admin auth, SSRF protection, CSP headers

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

### 2. Backend — Render

1. **New → Web Service** → connect your GitHub repo
2. **Root Directory:** `backend`
3. **Build command:** `pip install -r requirements.txt`
4. **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. **Environment Variables:**

| Key | Value |
|---|---|
| `GROQ_API_KEY` | Your Groq API key |
| `UNSPLASH_ACCESS_KEY` | Your Unsplash API key |
| `DATABASE_URL` | PostgreSQL connection string from Neon |
| `FRONTEND_URL` | `https://your-vercel-app.vercel.app` (used for CORS) |
| `ADMIN_SECRET` | A strong random string to protect admin endpoints |

### 3. Frontend — Vercel

```bash
cd frontend
npx vercel
```

Set environment variable in Vercel dashboard:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://your-render-service.onrender.com` |

### 4. Keep-alive (Render free tier)

Render's free tier sleeps after 15 minutes of inactivity. Set up a free uptime monitor on [UptimeRobot](https://uptimerobot.com) to ping `https://your-render-service.onrender.com/health` every 5 minutes — the backend stays warm at zero cost. The frontend handles the remaining cold-start delay with automatic retry logic.

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
│   │   ├── merger.py         # Re-synthesis when duplicate source found < 24h
│   │   └── image_finder.py   # Unsplash cover image fetch per article
│   ├── main.py               # FastAPI app, endpoints, CORS
│   ├── models.py             # SQLAlchemy models (Article, Source, RssItem)
│   ├── scheduler.py          # APScheduler — pipeline runner with threading lock
│   ├── database.py           # DB engine, SQLite/PostgreSQL compat, migrations
│   ├── config.py             # RSS feeds, model name, thresholds
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── page.tsx                  # Homepage — client-side, handles cold start
    │   ├── about/page.tsx            # About — platform overview
    │   ├── article/[id]/page.tsx     # Article detail — ISR (revalidate 1h), OG metadata
    │   ├── category/[tag]/page.tsx   # Tag filter — ISR (revalidate 1min)
    │   ├── admin/page.tsx            # Admin panel — password login, live stats polling
    │   ├── sitemap.ts                # Dynamic sitemap (last 100 articles)
    │   ├── error.tsx                 # Global error boundary
    │   └── api/rss-proxy/route.ts    # Serverless RSS proxy
    ├── components/
    │   ├── Header.tsx         # FoxScan header with mascot branding
    │   ├── NavLinks.tsx       # Navigation links
    │   ├── ArticleCard.tsx    # Article card with image, relevance dots, tags
    │   ├── RelevanceDots.tsx  # 3-dot visual relevance indicator
    │   ├── TagBadge.tsx       # Color-coded tag badge per category
    │   ├── ByteMascot.tsx     # Animated Fox mascot component
    │   ├── BackendStatus.tsx  # Offline banner with context-aware message
    │   ├── ThemeToggle.tsx    # Dark / light mode toggle
    │   └── SourcesList.tsx    # External source links
    ├── lib/api.ts             # Type-safe API client
    └── public/robots.txt      # Disallow /admin, Sitemap pointer
```

---

## News Sources

17 RSS feeds polled every 30 minutes:

| Source | Domain |
|---|---|
| BleepingComputer | bleepingcomputer.com |
| The Hacker News | thehackernews.com |
| Krebs on Security | krebsonsecurity.com |
| Dark Reading | darkreading.com |
| CISA Advisories | cisa.gov |
| Security Affairs | securityaffairs.com |
| Graham Cluley | grahamcluley.com |
| SecurityWeek | securityweek.com |
| Help Net Security | helpnetsecurity.com |
| Infosecurity Magazine | infosecurity-magazine.com |
| Ars Technica Security | arstechnica.com |
| Wired Security | wired.com |
| Naked Security (Sophos) | nakedsecurity.sophos.com |
| CyberScoop | cyberscoop.com |
| The Register Security | theregister.com |
| Malwarebytes Blog | malwarebytes.com |
| Recorded Future | recordedfuture.com |
