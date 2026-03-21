import { notFound } from "next/navigation";
import { getArticle } from "@/lib/api";
import TagBadge from "@/components/TagBadge";
import SourcesList from "@/components/SourcesList";
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

export default async function ArticlePage({ params }: PageProps) {
  const { id } = await params;
  const article = await getArticle(Number(id)).catch(() => null);
  if (!article) notFound();

  const publishedAt = new Date(article.published_at).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <article className="max-w-3xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-wrap gap-2 mb-4">
          {article.tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>

        <h1 className="text-3xl font-bold text-white leading-tight mb-4">{article.title}</h1>

        {article.summary && (
          <p className="text-xl text-zinc-400 leading-relaxed border-l-4 border-cyan-700 pl-4">
            {article.summary}
          </p>
        )}

        <div className="mt-4 flex items-center gap-4 text-sm text-zinc-500">
          <time dateTime={article.published_at}>{publishedAt}</time>
          <span>·</span>
          <span>Rilevanza: {article.relevance_score}/10</span>
          <span>·</span>
          <span>{article.sources.length} fonte{article.sources.length !== 1 ? "i" : "e"}</span>
        </div>
      </header>

      {/* Body */}
      <div className="prose-cyber">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.body}</ReactMarkdown>
      </div>

      {/* Sources */}
      <SourcesList sources={article.sources} />

      {/* Back */}
      <div className="mt-10">
        <a href="/" className="text-sm text-cyan-400 hover:text-cyan-300 hover:underline">
          ← Torna alla homepage
        </a>
      </div>
    </article>
  );
}
