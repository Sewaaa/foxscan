const CACHE_PREFIX = "fox_tr_";

function makeCacheKey(text: string, to: string): string {
  // Chiave basata su lingua + lunghezza + primi 40 char (abbastanza per evitare collisioni)
  const slug = text.slice(0, 40).replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
  return `${CACHE_PREFIX}${to}_${text.length}_${slug}`;
}

export async function translateText(text: string, to: string): Promise<string> {
  if (!text.trim() || to === "it") return text;

  const key = makeCacheKey(text, to);

  try {
    const cached = localStorage.getItem(key);
    if (cached) return cached;
  } catch { /* localStorage non disponibile (SSR) */ }

  try {
    const url =
      `https://translate.googleapis.com/translate_a/single` +
      `?client=gtx&sl=it&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) return text;
    const data = await res.json();
    // La risposta è un array annidato: [[["testo tradotto", "originale", ...],...],...]
    const translated: string =
      (data[0] as [string, ...unknown[]][])
        ?.map((chunk) => chunk[0] ?? "")
        .join("") ?? text;

    try { localStorage.setItem(key, translated); } catch { /* quota exceeded */ }
    return translated;
  } catch {
    return text; // fallback silenzioso
  }
}

export async function translateArticles<
  T extends { title: string; summary?: string | null }
>(articles: T[], locale: string): Promise<T[]> {
  if (locale === "it") return articles;
  return Promise.all(
    articles.map(async (a) => ({
      ...a,
      title: await translateText(a.title, locale),
      summary: a.summary ? await translateText(a.summary, locale) : a.summary,
    }))
  );
}
