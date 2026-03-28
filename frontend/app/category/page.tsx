import type { Metadata } from "next";
import Link from "next/link";
import { getTags } from "@/lib/api";
import TagBadge from "@/components/TagBadge";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Esplora categorie — FoxScan",
  description: "Sfoglia tutte le categorie di notizie cybersecurity su FoxScan.",
};

export default async function CategoryIndexPage() {
  const tags = await getTags().catch(() => []);

  return (
    <div className="max-w-3xl mx-auto fade-up py-4">

      {/* Header */}
      <div className="mb-8">
        <Link href="/" className="text-sm text-blue-600 dark:text-[#00FFE5] hover:underline">
          ← Torna alla homepage
        </Link>
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#0B1F3A] dark:text-slate-100 mt-4 mb-2 font-grotesk">
          Esplora categorie
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          {tags.length} categorie disponibili — clicca per leggere gli articoli.
        </p>
      </div>

      {tags.length === 0 ? (
        <p className="text-gray-400 dark:text-slate-500 text-sm">
          Nessuna categoria disponibile al momento.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tags.map(({ tag, count }) => (
            <Link
              key={tag}
              href={`/category/${encodeURIComponent(tag)}`}
              className="card-blue p-4 flex items-center justify-between group hover:border-blue-300 dark:hover:border-[#00FFE5]/30 transition-colors"
            >
              <TagBadge tag={tag} linked={false} />
              <span className="text-xs text-gray-400 dark:text-slate-500 font-mono group-hover:text-blue-600 dark:group-hover:text-[#00FFE5] transition-colors">
                {count} articol{count !== 1 ? "i" : "o"} →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
