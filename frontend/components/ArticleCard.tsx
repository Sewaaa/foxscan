import Link from "next/link";
import { ArticleSummary } from "@/lib/api";
import TagBadge from "./TagBadge";
import RelevanceDots from "./RelevanceDots";

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

export default function ArticleCard({ article }: ArticleCardProps) {
  return (
    <article className="card-blue border rounded-xl p-5 group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link
            href={`/article/${article.id}`}
            className="card-title font-semibold text-lg leading-snug hover:text-blue-600 dark:hover:text-cyan-400 transition-colors line-clamp-2 text-[#0B1F3A]"
          >
            {article.title}
          </Link>
          {article.summary && (
            <p className="mt-2 text-gray-500 dark:text-zinc-400 text-sm leading-relaxed line-clamp-3">
              {article.summary}
            </p>
          )}
        </div>
        <div className={`shrink-0 w-24 h-16 rounded-md overflow-hidden card-img-bg ${article.image_url ? "bg-blue-50" : "img-placeholder"}`}>
          {article.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.image_url}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).parentElement!.classList.add("img-placeholder"); (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <span style={{ fontSize: "1.25rem", opacity: 0.25 }}>🔒</span>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {article.tags.map((tag) => (
          <TagBadge key={tag} tag={tag} />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-400 dark:text-zinc-500 card-meta">
        <div className="flex items-center gap-3">
          <RelevanceDots score={article.relevance_score} />
          <span>{article.sources.length} font{article.sources.length !== 1 ? "i" : "e"}</span>
        </div>
        <time dateTime={article.published_at}>{formatDate(article.published_at)}</time>
      </div>
    </article>
  );
}
