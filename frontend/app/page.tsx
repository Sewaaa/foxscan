import { getArticles, getTags } from "@/lib/api";
import ArticleCard from "@/components/ArticleCard";
import TagBadge from "@/components/TagBadge";
import Link from "next/link";

export const revalidate = 60;

const PAGE_SIZE = 10;

interface HomePageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const [articlesRes, tags] = await Promise.all([
    getArticles({ limit: PAGE_SIZE, offset }).catch(() => ({
      total: 0,
      offset: 0,
      limit: PAGE_SIZE,
      items: [],
    })),
    getTags().catch(() => []),
  ]);

  const totalPages = Math.ceil(articlesRes.total / PAGE_SIZE);
  const topTags = tags.slice(0, 12);

  return (
    <div>
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Cybersecurity digest <span className="text-cyan-400">in italiano</span>
        </h1>
        <p className="text-zinc-400">
          Le notizie più rilevanti da{" "}
          <span className="text-zinc-300">BleepingComputer, The Hacker News, Krebs, Dark Reading</span>{" "}
          e altre fonti — sintetizzate automaticamente da AI in un unico articolo.
        </p>
      </div>

      {/* Tag cloud */}
      {topTags.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {topTags.map(({ tag, count }) => (
            <span key={tag} className="flex items-center gap-1.5">
              <TagBadge tag={tag} />
              <span className="text-xs text-zinc-600">{count}</span>
            </span>
          ))}
        </div>
      )}

      {/* Articles */}
      {articlesRes.items.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <p className="text-lg mb-2">Nessun articolo ancora.</p>
          <p className="text-sm">
            Avvia la pipeline dal pannello{" "}
            <a href="/admin" className="text-cyan-400 hover:underline">
              Admin
            </a>{" "}
            per generare i primi articoli.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {articlesRes.items.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>

          {/* Paginazione */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link
                  href={`/?page=${page - 1}`}
                  className="px-4 py-2 text-sm rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
                >
                  ← Precedente
                </Link>
              )}

              <span className="px-4 py-2 text-sm text-zinc-500">
                Pagina {page} di {totalPages}
              </span>

              {page < totalPages && (
                <Link
                  href={`/?page=${page + 1}`}
                  className="px-4 py-2 text-sm rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
                >
                  Successiva →
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
