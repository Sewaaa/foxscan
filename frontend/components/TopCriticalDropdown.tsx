"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getArticles, ArticleSummary } from "@/lib/api";
import { Zap } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { translateText } from "@/lib/translate";

function getLevel(score: number) {
  if (score >= 8) return 3;
  if (score >= 5) return 2;
  return 1;
}

export default function TopCriticalDropdown() {
  const [open, setOpen] = useState(false);
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [trTitles, setTrTitles] = useState<Record<number, string>>({});
  const ref = useRef<HTMLDivElement>(null);
  const t = useTranslations("topCritical");
  const locale = useLocale();

  useEffect(() => {
    getArticles({ min_score: 5, limit: 20 })
      .then((res) => {
        const sorted = res.items
          .filter((a) => getLevel(a.relevance_score) >= 2)
          .sort((a, b) => b.relevance_score - a.relevance_score)
          .slice(0, 5);
        setArticles(sorted);
      })
      .catch(() => {});
  }, []);

  // Traduci i titoli quando cambia la lingua o gli articoli
  useEffect(() => {
    if (locale === "it" || articles.length === 0) return;
    Promise.all(
      articles.map((a) =>
        translateText(a.title, locale).then((tr) => [a.id, tr] as const)
      )
    ).then((pairs) =>
      setTrTitles(Object.fromEntries(pairs))
    );
  }, [articles, locale]);

  // Chiudi cliccando fuori
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (articles.length === 0) return null;

  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        onClick={() => setOpen((o) => !o)}
        title={t("title")}
        className={`p-2 rounded-lg transition-colors ${
          open
            ? "text-[#00FFE5] bg-white/8"
            : "text-slate-400 hover:text-[#00FFE5] hover:bg-white/5"
        }`}
      >
        {/* Trophy icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4a2 2 0 0 1-2-2V5h4" />
          <path d="M18 9h2a2 2 0 0 0 2-2V5h-4" />
          <path d="M6 2h12v7a6 6 0 0 1-12 0V2Z" />
          <path d="M12 15v5" />
          <path d="M8 20h8" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 z-50 rounded-2xl border border-[#00FFE5]/20 bg-[#020817]/95 backdrop-blur-xl shadow-2xl shadow-[#00FFE5]/5 p-4">
          {/* Titolo */}
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-[#00FFE5] shrink-0" />
            <h3 className="font-grotesk font-extrabold text-sm text-[#00FFE5] uppercase tracking-widest">
              {t("title")}
            </h3>
          </div>

          {/* Lista */}
          <ol className="flex flex-col gap-0.5">
            {articles.map((a, i) => {
              const level = getLevel(a.relevance_score);
              const dotColor =
                level === 3 ? "bg-red-500" :
                level === 2 ? "bg-amber-400" :
                              "bg-green-400";
              return (
                <li key={a.id}>
                  <Link
                    href={`/article/${a.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-2.5 group py-2 border-b border-white/5 last:border-0"
                  >
                    <span className="shrink-0 w-6 h-6 mt-0.5 rounded-full bg-white/10 text-[#00FFE5] text-xs font-bold flex items-center justify-center font-mono">
                      {i + 1}
                    </span>
                    <p className="flex-1 min-w-0 text-sm text-slate-300 group-hover:text-white transition-colors leading-snug">
                      {trTitles[a.id] ?? a.title}
                    </p>
                    <span className={`shrink-0 w-2 h-2 mt-1.5 rounded-full ${dotColor}`} />
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
