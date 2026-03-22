import Link from "next/link";
import { ArticleSummary } from "@/lib/api";
import TagBadge from "./TagBadge";

interface ArticleCardProps {
  article: ArticleSummary;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RelevanceBar({ score }: { score: number }) {
  const pct = Math.min(Math.max(score, 0), 10) * 10;
  const color =
    score >= 8
      ? "bg-green-500"
      : score >= 5
        ? "bg-yellow-500"
        : "bg-zinc-600";

  return (
    <div className="flex items-center gap-1.5" title={`Rilevanza: ${score}/10`}>
      <div className="w-16 h-1 bg-zinc-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-zinc-500">{score}/10</span>
    </div>
  );
}

export default function ArticleCard({ article }: ArticleCardProps) {
  return (
    <article className="border border-zinc-800 rounded-lg p-5 hover:border-zinc-600 transition-colors bg-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link
            href={`/article/${article.id}`}
            className="text-white font-semibold text-lg leading-snug hover:text-cyan-400 transition-colors line-clamp-2"
          >
            {article.title}
          </Link>
          {article.summary && (
            <p className="mt-2 text-zinc-400 text-sm leading-relaxed line-clamp-3">
              {article.summary}
            </p>
          )}
        </div>
        {article.image_url && (
          <div className="shrink-0 w-24 h-16 rounded-md overflow-hidden bg-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.image_url}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {article.tags.map((tag) => (
          <TagBadge key={tag} tag={tag} />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
        <div className="flex items-center gap-3">
          <RelevanceBar score={article.relevance_score} />
          <span>{article.sources.length} font{article.sources.length !== 1 ? "i" : "e"}</span>
        </div>
        <time dateTime={article.published_at}>{formatDate(article.published_at)}</time>
      </div>
    </article>
  );
}
