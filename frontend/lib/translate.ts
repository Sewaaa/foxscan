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

/**
 * Traduci testi lunghi (es. body markdown) spezzandoli in chunk per paragrafo,
 * così non si supera il limite della API.
 */
export async function translateLongText(text: string, to: string): Promise<string> {
  if (!text.trim() || to === "it") return text;

  // Suddividi in paragrafi (doppio newline)
  const paragraphs = text.split(/\n\n+/);

  // Raggruppa in chunk da max ~1200 char ciascuno
  const chunks: string[] = [];
  let current = "";
  for (const para of paragraphs) {
    if (current.length + para.length > 1200 && current.length > 0) {
      chunks.push(current);
      current = para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }
  if (current) chunks.push(current);

  // Traduci ogni chunk (sequenzialmente per non martellare l'API)
  const translated: string[] = [];
  for (const chunk of chunks) {
    translated.push(await translateText(chunk, to));
  }
  return translated.join("\n\n");
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
