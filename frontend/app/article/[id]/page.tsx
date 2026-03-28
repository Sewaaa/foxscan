import { notFound } from "next/navigation";
import { getArticle } from "@/lib/api";
import TagBadge from "@/components/TagBadge";
import SourcesList from "@/components/SourcesList";
import RelevanceDots from "@/components/RelevanceDots";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
    title: `${article.title} — FoxScan`,
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

  const level = getLevel(article.relevance_score);

  const publishedAt = new Date(article.published_at).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <article className="max-w-3xl mx-auto fade-up">

      {/* ── Back ── */}
      <div className="mb-5 md:mb-6">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors py-1"
        >
          ← Torna alla homepage
        </a>
      </div>

      {/* ── Header ── */}
      <header className="mb-6 md:mb-8">
        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#0B1F3A] leading-tight mb-4 md:mb-5">
          {article.title}
        </h1>

        {/* Hero image */}
        <div
          className={`mb-5 md:mb-6 rounded-2xl overflow-hidden shadow-blue-md ${article.image_url ? "bg-blue-50" : "img-placeholder"}`}
          style={{ maxHeight: article.image_url ? undefined : "10rem", minHeight: "8rem" }}
        >
          {article.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.image_url}
              alt={article.title}
              className="w-full object-cover max-h-52 md:max-h-80"
            />
          ) : null}
        </div>

        {/* Summary box */}
        {article.summary && (
          <div className="byte-box bg-blue-50 border border-blue-200 rounded-2xl p-4 md:p-5 mb-5 md:mb-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/sintesi_nobg.png"
                alt="mascotte"
                className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 object-contain float-slow self-center sm:self-start"
              />
              <div>
                <p className="byte-label text-[11px] text-blue-500 font-bold uppercase tracking-widest mb-1.5">
                  In sintesi
                </p>
                <p className="byte-text text-sm md:text-base text-blue-700 leading-relaxed">
                  {article.summary}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-3 text-gray-500 flex-wrap">
          <time dateTime={article.published_at} className="text-xs md:text-sm">{publishedAt}</time>
          <span className="text-gray-300">·</span>
          <RelevanceDots score={article.relevance_score} />
          <span className="text-gray-300">·</span>
          <a href="#fonti" className="text-blue-600 dark:text-blue-400 hover:underline text-xs md:text-sm">
            {article.sources.length} fonte{article.sources.length !== 1 ? "i" : ""}
          </a>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="prose-cyber">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.body}</ReactMarkdown>
      </div>

      {/* ── Sources ── */}
      <div id="fonti" className="mt-8 md:mt-10 pt-6 md:pt-8 border-t border-blue-100">
        <SourcesList sources={article.sources} />
      </div>
    </article>
  );
}
