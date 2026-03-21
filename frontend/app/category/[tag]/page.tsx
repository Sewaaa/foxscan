import { getArticles, getTags } from "@/lib/api";
import ArticleCard from "@/components/ArticleCard";
import TagBadge from "@/components/TagBadge";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ tag: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tag } = await params;
  return {
    title: `#${tag} — CyberNews`,
    description: `Articoli di cybersecurity sul tema ${tag}`,
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);

  const [articlesRes, allTags] = await Promise.all([
    getArticles({ tag: decoded, limit: 30 }).catch(() => ({
      total: 0,
      offset: 0,
      limit: 30,
      items: [],
    })),
    getTags().catch(() => []),
  ]);

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm text-zinc-500 mb-2">Categoria</p>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <TagBadge tag={decoded} linked={false} />
          <span className="text-zinc-400 text-lg font-normal">
            {articlesRes.total} articol{articlesRes.total !== 1 ? "i" : "o"}
          </span>
        </h1>
      </div>

      {/* Altre categorie */}
      <div className="mb-8 flex flex-wrap gap-2">
        {allTags
          .filter((t) => t.tag !== decoded)
          .slice(0, 10)
          .map(({ tag: t }) => (
            <TagBadge key={t} tag={t} />
          ))}
      </div>

      {articlesRes.items.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          Nessun articolo per questa categoria.
        </div>
      ) : (
        <div className="space-y-4">
          {articlesRes.items.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
