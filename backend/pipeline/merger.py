"""
Merger: controlla se un nuovo item RSS corrisponde a un articolo già pubblicato
nelle ultime MERGE_WINDOW_HOURS ore. Se sì, aggiunge la fonte, ri-sintetizza
l'articolo con le nuove informazioni e lo sposta in cima al feed.
"""
import json
import logging
from datetime import datetime, timedelta

from rapidfuzz import fuzz
from sqlalchemy.orm import Session

from pipeline.clustering import SIMILARITY_THRESHOLD
from pipeline.image_finder import find_image
from pipeline.scraper import scrape_cluster
from pipeline.synthesizer import synthesize_update

logger = logging.getLogger(__name__)

MERGE_WINDOW_HOURS = 24  # finestra temporale entro cui cercare articoli da aggiornare


def _normalize_domain(domain: str) -> str:
    """Normalizza un dominio per il confronto: rimuove www. e path."""
    return domain.lower().replace("www.", "").split("/")[0].strip()


def try_merge_with_existing(db: Session, item: dict) -> bool:
    """
    Controlla se il nuovo item corrisponde a un articolo pubblicato nelle ultime
    MERGE_WINDOW_HOURS ore. Se sì, aggiunge la fonte, ri-sintetizza e aggiorna.

    Ritorna True se l'item è stato assorbito in un articolo esistente.
    """
    from models import Article, Source

    cutoff = datetime.utcnow() - timedelta(hours=MERGE_WINDOW_HOURS)
    recent_articles = db.query(Article).filter(Article.published_at >= cutoff).all()

    if not recent_articles:
        return False

    item_title = item.get("title", "").lower().strip()
    item_domain_norm = _normalize_domain(item.get("feed_source", ""))

    best_article = None
    best_score = 0

    for article in recent_articles:
        # Salta se questo dominio ha già contribuito a questo articolo
        existing_domains = {_normalize_domain(s.domain) for s in article.sources}
        if item_domain_norm and item_domain_norm in existing_domains:
            continue

        score = fuzz.token_set_ratio(item_title, article.title.lower().strip())
        if score >= SIMILARITY_THRESHOLD and score > best_score:
            best_article = article
            best_score = score

    if best_article is None:
        return False

    logger.info(
        f"Merge match (score={best_score}): '{item['title'][:60]}' "
        f"→ articolo [{best_article.id}] '{best_article.title[:60]}'"
    )

    # Scraping della nuova fonte
    scraped = scrape_cluster([item])
    if not scraped:
        logger.warning(f"Scraping fallito per {item['url']}, merge saltato")
        return False

    # Re-sintesi: articolo esistente + nuova fonte
    result = synthesize_update(
        existing_body=best_article.body,
        new_sources=scraped,
    )
    if not result:
        logger.warning(f"Re-sintesi fallita per articolo [{best_article.id}], merge saltato")
        return False

    # Aggiorna l'articolo
    best_article.title = result["titolo"]
    best_article.summary = result["sommario"]
    best_article.body = result["corpo"]
    best_article.tags = json.dumps(result.get("tag", []), ensure_ascii=False)
    best_article.relevance_score = int(result.get("score_rilevanza", best_article.relevance_score))
    best_article.published_at = datetime.utcnow()  # rimette in cima al feed

    # Aggiungi immagine se l'articolo non ne aveva una:
    # prima dalla nuova fonte, poi cerca su Unsplash tramite image_query.
    # Se l'LLM non ha restituito image_query, usa i tag come fallback.
    if not best_article.image_url:
        new_img = scraped[0].get("image_url")
        if new_img:
            best_article.image_url = new_img
        else:
            image_query = result.get("image_query", "").strip()
            if not image_query:
                tags = result.get("tag", [])
                image_query = f"{tags[0]} cybersecurity" if tags else "cybersecurity attack hacker"
                logger.info(f"image_query assente (merge) — fallback: '{image_query}'")
            found = find_image(image_query)
            if found:
                best_article.image_url = found

    # Aggiungi la nuova fonte
    new_source = Source(
        article_id=best_article.id,
        url=item["url"],
        domain=item.get("feed_source", ""),
    )
    db.add(new_source)
    db.commit()

    # Ricarica le sources per avere il conteggio aggiornato nel log
    db.refresh(best_article)
    logger.info(
        f"Articolo [{best_article.id}] aggiornato: ora {len(best_article.sources)} fonte/i "
        f"(aggiunto: {item.get('feed_source', '?')})"
    )
    return True
