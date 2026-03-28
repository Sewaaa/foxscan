"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, Zap, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getArticles, getTags, ArticleSummary, TagCount } from "@/lib/api";
import TagBadge, { TAG_COLORS, DEFAULT_TAG_COLOR } from "@/components/TagBadge";
import RelevanceDots from "@/components/RelevanceDots";
import CyberLoader from "@/components/CyberLoader";

const PAGE_SIZE = 9;
const EVIDENZA_HOURS = 48;

const LEVEL_RANGES: Record<number, { min_score?: number; max_score?: number }> = {
  0: {},
  1: { min_score: 1, max_score: 4 },
  2: { min_score: 5, max_score: 7 },
  3: { min_score: 8 },
};
const LEVEL_LABELS: Record<number, string> = { 0: "Tutti", 1: "Bassa", 2: "Media", 3: "Critica" };

function isRecent(iso: string, hours: number) {
  return Date.now() - new Date(iso).getTime() < hours * 3_600_000;
}
function getLevel(score: number) {
  if (score >= 8) return 3;
  if (score >= 5) return 2;
  return 1;
}
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours   = Math.floor(diff / 3_600_000);
  if (minutes < 2)  return "pochi minuti fa";
  if (minutes < 60) return `${minutes} min fa`;
  if (hours   < 24) return `${hours} or${hours === 1 ? "a" : "e"} fa`;
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}
function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

const cardGrid = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const cardItem = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as [number,number,number,number] } },
};
const sectionFade = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

/* ─── Hero Card ─────────────────────────────────────────────────────────── */
function HeroCard({ article }: { article: ArticleSummary }) {
  const level = getLevel(article.relevance_score);
  const levelBg = level === 3 ? "bg-red-500" : level === 2 ? "bg-orange-500" : "bg-green-500";
  const accentBorder = level === 3 ? "border-t-red-500" : level === 2 ? "border-t-orange-500" : "border-t-green-500";

  return (
    <Link
      href={`/article/${article.id}`}
      className={`card-blue flex flex-col group overflow-hidden border-t-2 ${accentBorder} ${level === 3 ? "critical-pulse" : ""}`}
    >
      {/* Image — fixed height, separated from text */}
      <div className={`w-full h-48 md:h-52 shrink-0 overflow-hidden card-img-bg relative ${article.image_url ? "bg-blue-50" : "img-placeholder"}`}>
        {article.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.image_url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            onError={(e) => {
              const el = e.target as HTMLImageElement;
              el.style.display = "none";
              el.parentElement!.classList.add("img-placeholder");
            }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/testa_nobg.png" alt="" className="w-full h-full object-contain p-10 opacity-10" />
        )}
      </div>

      {/* Text content — completely separate from image */}
      <div className="p-5 md:p-6 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold text-white ${levelBg}`}>
            {LEVEL_LABELS[level]}
          </span>
          <span className="text-xs text-gray-400 card-meta">
            {formatDateShort(article.published_at)} · {article.sources.length} fonte{article.sources.length !== 1 ? "i" : ""}
          </span>
        </div>

        <h2 className="card-title font-grotesk font-extrabold text-[#0B1F3A] text-lg md:text-xl leading-snug mb-3 group-hover:text-blue-600 dark:group-hover:text-[#00FFE5] transition-colors line-clamp-3">
          {article.title}
        </h2>

        <div className="mt-auto flex items-center gap-2 flex-wrap pt-3 border-t border-blue-50 dark:border-white/5">
          {article.tags.slice(0, 3).map((tag) => (
            <TagBadge key={tag} tag={tag} linked={false} />
          ))}
          <span className="ml-auto text-blue-600 dark:text-[#00FFE5] font-bold text-sm group-hover:translate-x-1 transition-transform inline-block">
            Leggi →
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ─── Secondary Card ─────────────────────────────────────────────────────── */
function SecondaryCard({ article }: { article: ArticleSummary }) {
  const level = getLevel(article.relevance_score);
  const accentBorder =
    level === 3 ? "border-t-red-500" :
    level === 2 ? "border-t-orange-500" :
                  "border-t-green-500";

  return (
    <Link
      href={`/article/${article.id}`}
      className={`card-blue flex items-stretch group overflow-hidden border-t-2 h-full ${accentBorder}`}
      style={{ borderRadius: "16px" }}
    >
      {article.image_url && (
        <div className="shrink-0 w-20 h-20 overflow-hidden card-img-bg bg-blue-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.image_url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
          />
        </div>
      )}
      <div className="flex-1 min-w-0 p-3">
        <h3 className="card-title font-grotesk font-bold text-[#0B1F3A] text-xs leading-snug line-clamp-2 mb-1.5 group-hover:text-blue-600 dark:group-hover:text-[#00FFE5] transition-colors">
          {article.title}
        </h3>
        <div className="flex items-center justify-between">
          <time className="text-xs text-gray-400 card-meta">{timeAgo(article.published_at)}</time>
          <span className="text-xs text-blue-600 dark:text-[#00FFE5]/80 font-semibold">Leggi →</span>
        </div>
      </div>
    </Link>
  );
}

/* ─── Top Critical Widget ────────────────────────────────────────────────── */
function TopCriticalWidget({ articles }: { articles: ArticleSummary[] }) {
  const top5 = articles.slice(0, 5);
  if (top5.length === 0) return null;

  return (
    <div className="flex flex-col">
      {/* Titolo — stesso stile di "In Evidenza" */}
      <div className="flex items-center gap-2 mb-4">
        <Zap size={15} className="text-blue-600 dark:text-[#00FFE5] shrink-0" />
        <h2 className="font-grotesk font-extrabold text-xs text-blue-600 dark:text-[#00FFE5] uppercase tracking-widest">
          Top criticità del giorno
        </h2>
      </div>

      {/* Lista senza riquadro */}
      <ol className="flex flex-col gap-0.5">
        {top5.map((a, i) => {
          const level = getLevel(a.relevance_score);
          const dotColor =
            level === 3 ? "bg-red-600" :
            level === 2 ? "bg-amber-400" :
                          "bg-green-400";
          return (
            <li key={a.id}>
              <Link href={`/article/${a.id}`} className="flex items-start gap-2.5 group py-1.5 border-b border-blue-50 dark:border-white/5 last:border-0">
                <span className="shrink-0 w-5 h-5 mt-0.5 rounded-full bg-blue-100 dark:bg-white/10 text-blue-700 dark:text-[#00FFE5] text-[10px] font-bold flex items-center justify-center font-mono">
                  {i + 1}
                </span>
                <p className="flex-1 min-w-0 text-xs text-[#0B1F3A] dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-white transition-colors leading-snug">
                  {a.title}
                </p>
                <span className={`shrink-0 w-1.5 h-1.5 mt-1.5 rounded-full ${dotColor}`} />
              </Link>
            </li>
          );
        })}
      </ol>

      {/* Mascotte podio sotto l'ultimo articolo */}
      <div className="flex justify-center mt-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/podio_nobg.png"
          alt=""
          className="h-32 w-32 object-contain float-slow opacity-90"
        />
      </div>
    </div>
  );
}

/* ─── Grid Card ──────────────────────────────────────────────────────────── */
function GridCard({ article }: { article: ArticleSummary }) {
  const level = getLevel(article.relevance_score);

  return (
    <Link
      href={`/article/${article.id}`}
      className={`card-blue flex flex-row md:flex-col group overflow-hidden min-h-[80px] md:min-h-0 ${level === 3 ? "critical-pulse" : ""}`}
    >
      {/* Image — orizzontale su mobile, verticale su desktop */}
      <div className={`shrink-0 w-28 h-28 md:w-full md:h-36 overflow-hidden card-img-bg relative ${article.image_url ? "bg-blue-50" : "img-placeholder"}`}>
        {article.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.image_url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).parentElement!.classList.add("img-placeholder");
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/testa_nobg.png" alt="" className="w-full h-full object-contain p-4 md:p-6 opacity-10" />
        )}
        {level === 3 && (
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-80" />
        )}
      </div>

      {/* Content */}
      <div className="p-3 md:p-4 flex flex-col flex-1 min-w-0">
        <span className="card-title font-grotesk font-bold text-[#0B1F3A] text-xs md:text-sm leading-snug line-clamp-2 mb-2 md:mb-3 group-hover:text-blue-600 dark:group-hover:text-[#00FFE5] transition-colors">
          {article.title}
        </span>
        <div className="hidden md:flex flex-wrap gap-1 mb-3">
          {article.tags.slice(0, 2).map((tag) => <TagBadge key={tag} tag={tag} linked={false} />)}
        </div>
        <div className="mt-auto flex items-center gap-2 pt-2 border-t border-blue-50 dark:border-white/5">
          <RelevanceDots score={article.relevance_score} showLabel={false} />
          <time className="text-xs text-gray-400 card-meta flex-1 truncate">{timeAgo(article.published_at)}</time>
          <span className="shrink-0 text-blue-600 dark:text-[#00FFE5]/80 font-semibold text-xs group-hover:translate-x-0.5 transition-transform inline-block">
            Leggi →
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ─── Skeleton ────────────────────────────────────────────────────────────── */
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="card-blue overflow-hidden cyber-scan">
          <div className="w-full h-36 skeleton" />
          <div className="p-4">
            <div className="h-4 skeleton rounded w-full mb-1.5" />
            <div className="h-4 skeleton rounded w-3/4 mb-3" />
            <div className="h-3 skeleton rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadingCenter() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <CyberLoader size={72} />
      <p className="text-xs font-mono tracking-widest text-gray-400 dark:text-[#00FFE5]/40 uppercase animate-pulse">
        Caricamento feed...
      </p>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */
export default function HomePage() {
  const [page, setPage] = useState(1);
  const goToPage = (n: number) => {
    setPage(n);
    setTimeout(() => document.getElementById("ultime-notizie")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const [levelFilter, setLevelFilter] = useState(0);
  const [tagFilter, setTagFilter]     = useState<string | null>(null);
  const [articles, setArticles]       = useState<ArticleSummary[]>([]);
  const [inEvidenza, setInEvidenza]   = useState<ArticleSummary[]>([]);
  const [allLatest, setAllLatest]     = useState<ArticleSummary[]>([]);
  const [total, setTotal]             = useState(0);
  const [tags, setTags]               = useState<TagCount[]>([]);
  const [loading, setLoading]         = useState(true);
  const [retryCount, setRetryCount]   = useState(0);
  const [catOpen, setCatOpen]         = useState(false);

  useEffect(() => {
    getArticles({ min_score: 8, limit: 6 })
      .then((res) => setInEvidenza(res.items.filter((a) => isRecent(a.published_at, EVIDENZA_HOURS)).slice(0, 3)))
      .catch(() => {});
    getArticles({ limit: 20 })
      .then((res) => setAllLatest(res.items))
      .catch(() => {});
  }, [retryCount]);

  useEffect(() => {
    setLoading(true);
    const offset      = (page - 1) * PAGE_SIZE;
    const scoreParams = LEVEL_RANGES[levelFilter];
    Promise.all([
      getArticles({ limit: PAGE_SIZE, offset, ...scoreParams, ...(tagFilter ? { tag: tagFilter } : {}) }),
      getTags(),
    ]).then(([articlesRes, tagsRes]) => {
      setArticles(articlesRes.items);
      setTotal(articlesRes.total);
      setTags(tagsRes);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      if (retryCount < 4) {
        const delay = 5000 * (retryCount + 1);
        setTimeout(() => setRetryCount((r) => r + 1), delay);
      }
    });
  }, [page, levelFilter, tagFilter, retryCount]);

  function changeLevel(lvl: number) { setLevelFilter(lvl); setPage(1); }
  function changeTag(tag: string | null) { setTagFilter(tag); setPage(1); }

  const totalPages        = Math.ceil(total / PAGE_SIZE);
  const topTags           = tags.slice(0, 12);
  const heroArticle       = inEvidenza[0];
  const secondaryArticles = inEvidenza.slice(1, 3);
  // Escludi dalla griglia gli articoli già mostrati in "In Evidenza"
  const evidenzaIds       = new Set(inEvidenza.map((a) => a.id));
  const gridArticles      = articles.filter((a) => !evidenzaIds.has(a.id));
  const briefingArticles = allLatest
    .filter((a) => getLevel(a.relevance_score) >= 2)
    .sort((a, b) => b.relevance_score - a.relevance_score);

  return (
    <motion.div variants={sectionFade} initial="hidden" animate="show" className="space-y-8 md:space-y-10">

      {/* ── In Evidenza ─────────────────────────────────────────────────── */}
      {heroArticle && (
        <motion.section variants={sectionFade} initial="hidden" animate="show">

          {/* Section label */}
          <div className="flex items-center gap-2 mb-4">
            <Flame size={15} className="text-red-500 shrink-0" />
            <h2 className="font-grotesk font-extrabold text-xs text-red-500 uppercase tracking-widest">
              In Evidenza
            </h2>
            <span className="text-xs text-gray-400 dark:text-slate-600 border border-blue-100 dark:border-white/8 rounded-full px-2.5 py-0.5 evidenza-badge">
              ultime {EVIDENZA_HOURS}h
            </span>
          </div>

          {/*
            Grid desktop (3 col, 2 righe):
              Hero          → col 1-2, row 1
              Secondary     → col 1-2, row 2
              TopCritical   → col 3,   row 1-2

            Mobile (1 col, ordine JSX):
              Hero → Secondary → TopCritical ✓
          */}
          <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-[auto_auto] gap-4">

            {/* Hero — col 1-2, row 1 */}
            <motion.div
              className="md:col-span-2 md:row-start-1"
              variants={cardItem} initial="hidden" animate="show"
            >
              <HeroCard article={heroArticle} />
            </motion.div>

            {/* Secondary articles — col 1-2, row 2 (su mobile stanno qui, dopo hero) */}
            {secondaryArticles.length > 0 && (
              <motion.div
                className="md:col-span-2 md:row-start-2 grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch"
                variants={cardGrid} initial="hidden" animate="show"
              >
                {secondaryArticles.map((a) => (
                  <motion.div key={a.id} variants={cardItem} className="h-full">
                    <SecondaryCard article={a} />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* TopCriticalWidget — col 3, row 1-2 (solo desktop) */}
            {briefingArticles.length > 0 && (
              <motion.div
                className="hidden md:block md:col-start-3 md:row-start-1 md:row-span-2 md:border-l border-blue-100 dark:border-[#00FFE5]/15 md:pl-5"
                variants={cardItem} initial="hidden" animate="show"
              >
                <TopCriticalWidget articles={briefingArticles} />
              </motion.div>
            )}
          </div>
        </motion.section>
      )}

      {/* ── Filter Bar ───────────────────────────────────────────────────── */}
      <div>

        {/* Su mobile: Categoria sopra, rilevanza sotto. Su desktop: tutto su una riga */}
        <div className="flex flex-col md:flex-row md:items-center gap-2 py-3">

          {/* Riga 1 mobile / sinistra desktop: rilevanza */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {([0, 1, 2, 3] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => changeLevel(lvl)}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all whitespace-nowrap ${
                  levelFilter === lvl
                    ? "border-blue-600 bg-blue-600 text-white dark:border-[#00FFE5] dark:bg-transparent dark:text-[#00FFE5]"
                    : "filter-btn-inactive border-blue-200 dark:border-white/8 text-gray-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-[#00FFE5]/40 dark:hover:text-[#00FFE5]"
                }`}
              >
                {lvl > 0 && (
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    lvl === 1 ? "bg-green-500" : lvl === 2 ? "bg-orange-500" : "bg-red-500"
                  }`} />
                )}
                {LEVEL_LABELS[lvl]}
              </button>
            ))}
          </div>

          {/* Divider desktop */}
          {topTags.length > 0 && (
            <div className="hidden md:block shrink-0 w-px h-5 bg-blue-100 dark:bg-white/10" />
          )}

          {/* Bottone Categoria — sempre visibile su mobile (riga separata) */}
          {topTags.length > 0 && (
            <button
              onClick={() => setCatOpen((o) => !o)}
              className={`shrink-0 self-start flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all whitespace-nowrap ${
                catOpen || tagFilter
                  ? "border-blue-600 bg-blue-600 text-white dark:border-[#00FFE5] dark:bg-transparent dark:text-[#00FFE5]"
                  : "filter-btn-inactive border-blue-200 dark:border-white/8 text-gray-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-[#00FFE5]/40 dark:hover:text-[#00FFE5]"
              }`}
            >
              Categoria
              {tagFilter && <span className="w-2 h-2 rounded-full bg-current" />}
              <ChevronDown size={13} className={`transition-transform ${catOpen ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>

        {/* Seconda riga: tag pill (collassabile) */}
        {catOpen && topTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pb-2.5 border-t border-blue-100/40 dark:border-white/5 pt-2.5">
            {topTags.map(({ tag }) => {
              const color = TAG_COLORS[tag] ?? DEFAULT_TAG_COLOR;
              const isActive = tagFilter === tag;
              return (
                <button
                  key={tag}
                  onClick={() => changeTag(isActive ? null : tag)}
                  className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${color} ${
                    isActive ? "ring-2 ring-offset-1 ring-current" : "opacity-75 hover:opacity-100"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Ultime Notizie ───────────────────────────────────────────────── */}
      <section id="ultime-notizie" className="scroll-mt-32">
        <h2 className="font-grotesk text-lg font-extrabold text-[#0B1F3A] dark:text-slate-100 mb-5">
          Ultime notizie
        </h2>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <LoadingCenter />
              <SkeletonGrid />
            </motion.div>
          ) : articles.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <div className="flex justify-center mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/error_nobg.png"
                  alt=""
                  className="w-32 h-32 object-contain float-anim opacity-70 neon-glow-logo"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <p className="text-base font-grotesk font-semibold text-gray-500 dark:text-slate-400 mb-2">
                {levelFilter > 0
                  ? `Nessun articolo con rilevanza "${LEVEL_LABELS[levelFilter]}".`
                  : "Nessuna notizia ancora..."}
              </p>
              {levelFilter === 0 && (
                <p className="text-sm text-gray-400 dark:text-slate-500">
                  Avvia la pipeline dal{" "}
                  <Link href="/admin" className="text-blue-600 dark:text-[#00FFE5] hover:underline font-medium">
                    pannello Admin
                  </Link>.
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={`grid-${page}-${levelFilter}`}
              variants={cardGrid}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {gridArticles.map((article) => (
                <motion.div key={article.id} variants={cardItem}>
                  <GridCard article={article} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex items-center justify-center gap-3"
          >
            {page > 1 && (
              <button
                onClick={() => goToPage(page - 1)}
                className="page-btn-prev px-5 py-2.5 text-sm rounded-full border border-blue-200 text-[#0B1F3A] font-medium hover:border-blue-400 hover:bg-blue-50 transition-all dark:bg-[#080e1e]"
              >
                ← Prec.
              </button>
            )}
            <span className="px-4 py-2 text-sm text-gray-400 dark:text-slate-500 font-mono">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <button
                onClick={() => goToPage(page + 1)}
                className="px-5 py-2.5 text-sm rounded-full bg-[#0B1F3A] dark:bg-[#00FFE5] text-white dark:text-[#020817] font-semibold hover:opacity-90 transition-opacity"
              >
                Succ. →
              </button>
            )}
          </motion.div>
        )}
      </section>

    </motion.div>
  );
}
