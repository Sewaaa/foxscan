RSS_FEEDS = [
    "https://www.bleepingcomputer.com/feed/",
    "https://feeds.feedburner.com/TheHackersNews",
    "https://krebsonsecurity.com/feed/",
    "https://www.darkreading.com/rss.xml",
    "https://www.securityweek.com/feed",
    "https://threatpost.com/feed/",
    "https://www.cisa.gov/cybersecurity-advisories/feed.xml",
]

# LLM
GROQ_MODEL = "llama-3.1-8b-instant"

DATABASE_URL = "sqlite:///./cybernews.db"

# Clustering
SIMILARITY_THRESHOLD = 0.75  # soglia per considerare due articoli dello stesso topic

# Pipeline
FETCH_INTERVAL_MINUTES = 30
MAX_ARTICLES_PER_CLUSTER = 5
MAX_TEXT_CHARS_PER_ARTICLE = 8000  # troncamento per non sforare il context window
