import { notFound } from "next/navigation";
import { getArticle } from "@/lib/api";
import TagBadge from "@/components/TagBadge";
import SourcesList from "@/components/SourcesList";
import RelevanceDots from "@/components/RelevanceDots";
import ShareButtons from "@/components/ShareButtons";
import TranslatedArticleContent from "@/components/TranslatedArticleContent";
import { getTranslations, getLocale } from "next-intl/server";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const article = await getArticle(Number(id)).catch(() => null);
  if (!article) return { title: "Articolo non trovato" };
  const url = `https://foxscan.vercel.app/article/${id}`;
  const image = article.image_url ?? "https://foxscan.vercel.app/testa_nobg.png";
  return {
    title: `${article.title} · FoxScan`,
    description: article.summary ?? undefined,
    openGraph: {
      title: article.title,
      description: article.summary ?? undefined,
      url,
      siteName: "FoxScan",
      images: [{ url: image }],
      locale: "it_IT",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.summary ?? undefined,
      images: [image],
    },
  };
}

function getLevel(score: number) {
  if (score >= 8) return 3;
  if (score >= 5) return 2;
  return 1;
}


export default async function ArticlePage({ params }: PageProps) {
  const { id } = await params;
  const article = await getArticle(Number(id)).catch(() => null);
  if (!article) notFound();

  const t = await getTranslations("article");
  const locale = await getLocale();
  const level = getLevel(article.relevance_score);

  const dateLocale = locale === "en" ? "en-US" : "it-IT";
  const publishedAt = new Date(article.published_at).toLocaleDateString(dateLocale, {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <article className="max-w-3xl mx-auto fade-up">

      {/* ── Back ── */}
      <div className="mb-5 md:mb-6">
        <a href="/" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors py-1">
          {t("back")}
        </a>
      </div>

      {/* ── Header ── */}
      <header className="mb-6 md:mb-8">
        {/* Hero image (statica, non tradotta) */}
        <div
          className={`mb-5 md:mb-6 rounded-2xl overflow-hidden shadow-blue-md ${article.image_url ? "bg-blue-50" : "img-placeholder"}`}
          style={{ maxHeight: article.image_url ? undefined : "10rem", minHeight: "8rem" }}
        >
          {article.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={article.image_url} alt={article.title} className="w-full object-cover max-h-52 md:max-h-80" />
          ) : null}
        </div>

        {/* Titolo, sommario e body · tradotti lato client */}
        <TranslatedArticleContent
          title={article.title}
          summary={article.summary}
          body={article.body}
        />

        {/* Metadata */}
        <div className="flex items-center gap-3 text-gray-500 flex-wrap mt-4">
          <time dateTime={article.published_at} className="text-xs md:text-sm">{publishedAt}</time>
          <span className="text-gray-300">·</span>
          <RelevanceDots score={article.relevance_score} />
        </div>

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {article.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        )}
      </header>

      {/* ── Share ── */}
      <div className="mt-8 pt-6 border-t border-blue-100 dark:border-white/5">
        <ShareButtons title={article.title} url={`https://foxscan.vercel.app/article/${id}`} />
      </div>

      {/* ── Sources ── */}
      <div id="fonti" className="mt-6 pt-6 border-t border-blue-100 dark:border-white/5">
        <SourcesList sources={article.sources} />
      </div>
    </article>
  );
}
