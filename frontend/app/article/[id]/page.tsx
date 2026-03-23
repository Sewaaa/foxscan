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
  return {
    title: `${article.title} — CyberNews`,
    description: article.summary ?? undefined,
  };
}

function getLevel(score: number) {
  if (score >= 8) return 3;
  if (score >= 5) return 2;
  return 1;
}

const THREAT_PILL: Record<number, string> = {
  1: "bg-green-50 text-green-700 border-green-200",
  2: "bg-yellow-50 text-yellow-700 border-yellow-200",
  3: "bg-red-50 text-red-700 border-red-200",
};
const THREAT_ICON: Record<number, string> = { 1: "🟢", 2: "🟡", 3: "🔴" };
const THREAT_LABEL: Record<number, string> = { 1: "Bassa", 2: "Media", 3: "Critica" };

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
      <div className="mb-6">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          ← Torna alla homepage
        </a>
      </div>

      {/* ── Header ── */}
      <header className="mb-8">
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold border ${THREAT_PILL[level]}`}>
            {THREAT_ICON[level]} Rilevanza {THREAT_LABEL[level]}
          </span>
          {article.tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>

        <h1 className="text-3xl font-extrabold text-[#0B1F3A] leading-tight mb-5">
          {article.title}
        </h1>

        <div className={`mb-6 rounded-2xl overflow-hidden max-h-80 shadow-blue-md ${article.image_url ? "bg-blue-50" : "img-placeholder"}`} style={{ minHeight: article.image_url ? undefined : "12rem" }}>
          {article.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.image_url}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          ) : null}
        </div>

        {article.summary && (
          <div className="byte-box bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6 flex gap-4 items-start">
            {/* Byte mascot */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/byte-mascot.png"
              alt="Byte"
              className="shrink-0 w-24 h-24 object-contain float-anim"
            />
            <div>
              <p className="byte-label text-[11px] text-blue-500 font-bold uppercase tracking-widest mb-1.5">
                In sintesi
              </p>
              <p className="byte-text text-base text-blue-700 leading-relaxed">
                {article.summary}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
          <time dateTime={article.published_at}>{publishedAt}</time>
          <span className="text-gray-300">·</span>
          <RelevanceDots score={article.relevance_score} />
          <span className="text-gray-300">·</span>
          <a href="#fonti" className="text-blue-600 dark:text-blue-400 hover:underline">
            {article.sources.length} fonte{article.sources.length !== 1 ? "i" : ""}
          </a>
        </div>
      </header>

      {/* ── Divider ── */}
      <div className="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent mb-8" />

      {/* ── Body ── */}
      <div className="prose-cyber">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.body}</ReactMarkdown>
      </div>

      {/* ── Sources ── */}
      <div id="fonti" className="mt-10 pt-8 border-t border-blue-100">
        <SourcesList sources={article.sources} />
      </div>
    </article>
  );
}
