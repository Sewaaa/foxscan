import { getArticles, getTags } from "@/lib/api";
import ArticleCard from "@/components/ArticleCard";
import CategoryTagBar from "@/components/CategoryTagBar";
import { getTranslations, getLocale } from "next-intl/server";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ tag: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tag } = await params;
  const locale = await getLocale();
  return {
    title: `#${tag} · FoxScan`,
    description: locale === "en"
      ? `Cybersecurity articles about ${tag}`
      : `Articoli di cybersecurity sul tema ${tag}`,
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const t = await getTranslations("categories");

  const [articlesRes, allTags] = await Promise.all([
    getArticles({ tag: decoded, limit: 30 }).catch(() => ({
      total: 0, offset: 0, limit: 30, items: [],
    })),
    getTags().catch(() => []),
  ]);

  return (
    <div>
      <CategoryTagBar tags={allTags} activeTag={decoded} />

      {articlesRes.items.length === 0 ? (
        <div className="text-center py-20 text-gray-500 dark:text-zinc-500">
          {t("noArticles")}
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
