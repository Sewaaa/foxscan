import { getArticles } from "@/lib/api";

export const revalidate = 3600; // aggiorna ogni ora

export async function GET() {
  const res = await getArticles({ limit: 20, min_score: 5 }).catch(() => null);
  const articles = res?.items ?? [];

  const articleLines = articles
    .map(
      (a) =>
        `- [${a.title}](https://foxscan.vercel.app/article/${a.id})` +
        (a.summary ? `: ${a.summary.replace(/\n/g, " ")}` : "")
    )
    .join("\n");

  const body = `# FoxScan

> FoxScan è un aggregatore di notizie cybersecurity in italiano. La pipeline automatica raccoglie articoli da 17 fonti internazionali ogni 30 minuti, li raggruppa per topic, e produce sintesi originali tramite AI (LLaMA 3.3 70B via Groq). Ogni articolo ha un punteggio di rilevanza (1–10) e tag tematici.

## Sito

- [Home](https://foxscan.vercel.app): Ultime notizie, sezione "In Evidenza" (score ≥ 8), Daily Briefing top 5
- [Esplora](https://foxscan.vercel.app/category/tutti): Tutti gli articoli con filtri per tag e rilevanza
- [Chi siamo](https://foxscan.vercel.app/about): Descrizione del progetto e della pipeline
- [RSS feed](https://foxscan.vercel.app/rss): Feed RSS degli ultimi 50 articoli

## Categorie (tag)

malware, ransomware, breach, CVE, APT, phishing, vulnerability, policy, tool, espionage

## Articoli recenti (score ≥ 5)

${articleLines || "- Nessun articolo disponibile al momento."}

## API pubblica

- \`GET /articles\` — lista articoli; parametri: \`tag\`, \`min_score\`, \`max_score\`, \`limit\`, \`offset\`
- \`GET /articles/{id}\` — articolo completo con corpo in markdown
- \`GET /tags\` — conteggio articoli per tag
- \`GET /rss\` — feed RSS 2.0 (ultimi 50 articoli)

## Fonti RSS monitorate

BleepingComputer, The Hacker News, Krebs on Security, Dark Reading, CISA, Security Affairs, Graham Cluley, SecurityWeek, Help Net Security, Infosecurity Magazine, Ars Technica Security, Wired Security, Naked Security (Sophos), CyberScoop, The Register, Malwarebytes, Recorded Future
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
