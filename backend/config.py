import os

RSS_FEEDS = [
    # News generaliste — alta sovrapposizione, buon clustering
    "https://www.bleepingcomputer.com/feed/",
    "https://feeds.feedburner.com/TheHackersNews",
    "https://www.darkreading.com/rss.xml",
    "https://securityaffairs.com/feed",
    "https://grahamcluley.com/feed/",
    "https://www.helpnetsecurity.com/feed/",
    "https://www.infosecurity-magazine.com/rss/news/",
    "https://cyberscoop.com/feed/",
    "https://www.theregister.com/security/headlines.atom",
    "https://arstechnica.com/security/feed/",
    "https://hackread.com/feed/",
    "https://gbhackers.com/feed/",
    "https://thecyberexpress.com/feed/",
    # Fonti italiane — cybersecurity
    "https://www.cybersecurity360.it/feed/",
]

# LLM
GROQ_MODEL = "llama-3.3-70b-versatile"

# Database — usa variabile d'ambiente (PostgreSQL su Render) oppure SQLite in locale
_db_url = os.getenv("DATABASE_URL", "sqlite:///./cybernews.db")
# Render fornisce URL con schema "postgres://" ma SQLAlchemy richiede "postgresql://"
if _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql://", 1)
DATABASE_URL = _db_url

# Clustering
SIMILARITY_THRESHOLD = 0.75  # soglia per considerare due articoli dello stesso topic (usata come documentazione)

# Pipeline
FETCH_INTERVAL_MINUTES = 30
MAX_ARTICLES_PER_CLUSTER = 3
MAX_TEXT_CHARS_PER_ARTICLE = 3000  # ridotto per rispettare Groq TPM limit (6000/min)
MAX_ITEMS_PER_RUN = 25  # alzato da 15 — NAS ha 7.66GB RAM, nessun limite Render
