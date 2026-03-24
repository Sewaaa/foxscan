import logging
from rapidfuzz import fuzz

logger = logging.getLogger(__name__)

SIMILARITY_THRESHOLD = 55  # su scala 0-100 per rapidfuzz
# 55 bilancia bene: cattura titoli diversi sulla stessa notizia (es. "Citrix rilascia patch"
# vs "Vulnerabilità critica in Citrix NetScaler") senza fare false aggregazioni.


def _normalize(title: str) -> str:
    return title.lower().strip()


def cluster_items(items: list[dict]) -> list[list[dict]]:
    """
    Raggruppa una lista di item per topic usando similarità dei titoli.
    Restituisce una lista di cluster, ogni cluster è una lista di item.
    Item senza match formano cluster da 1.
    """
    if not items:
        return []

    clusters: list[list[dict]] = []
    assigned = [False] * len(items)

    for i, item in enumerate(items):
        if assigned[i]:
            continue

        cluster = [item]
        assigned[i] = True
        norm_i = _normalize(item.get("title", ""))

        for j in range(i + 1, len(items)):
            if assigned[j]:
                continue
            norm_j = _normalize(items[j].get("title", ""))
            score = fuzz.token_set_ratio(norm_i, norm_j)
            if score >= SIMILARITY_THRESHOLD:
                cluster.append(items[j])
                assigned[j] = True

        clusters.append(cluster)

    logger.info(f"Clustering: {len(items)} item → {len(clusters)} cluster")
    return clusters
