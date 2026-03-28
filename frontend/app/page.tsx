"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, Filter, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getArticles, getTags, ArticleSummary, TagCount } from "@/lib/api";
import TagBadge from "@/components/TagBadge";
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

function pillCls(level: number) {
  if (level === 3) return "pill-high  bg-red-50    text-red-700    border border-red-200";
  if (level === 2) return "pill-medium bg-orange-50 text-orange-700 border border-orange-200";
  return              "pill-low   bg-green-50  text-green-700  border border-green-200";
}

function isRecent(iso: string, hours: number) {
  return Date.now() - new Date(iso).getTime() < hours * 3_600_000;
}

function getLevel(score: number) {
  if (score >= 8) return 3;
  if (score >= 5) return 2;
  return 1;
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours   = Math.floor(diff / 3_600_000);
  if (minutes < 2)  return "pochi minuti fa";
  if (minutes < 60) return `${minutes} min fa`;
  if (hours   < 24) return `${hours} or${hours === 1 ? "a" : "e"} fa`;
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

/* ─── Framer Motion variants ─────────────────────────────────────────────── */
const cardGrid = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const cardItem = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show:   { opacity: 1, y: 0,  scale: 1,   transition: { duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] as [number,number,number,number] } },
};
const sectionFade = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0,  transition: { duration: 0.5, ease: "easeOut" as const } },
};

/* ─── Featured Large Card ─────────────────────────────────────────────────── */
function FeaturedLargeCard({ article }: { article: ArticleSummary }) {
  const level = getLevel(article.relevance_score);
  const hasImage = !!article.image_url;
  return (
    <Link
      href={`/article/${article.id}`}
      className={`card-blue block overflow-hidden group h-full ${level === 3 ? "critical-pulse" : ""}`}
    >
      <div className={`relative w-full h-44 md:h-52 overflow-hidden card-img-bg ${hasImage ? "bg-blue-50" : "img-placeholder"}`}>
        {hasImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={article.image_url!} alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.display = "none";
                el.parentElement!.classList.add("img-placeholder");
              }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent md:hidden" />
            <div className="absolute bottom-0 left-0 right-0 p-4 md:hidden">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold mb-1.5
                ${level === 3 ? "bg-red-500/85 text-white" : level === 2 ? "bg-orange-500/85 text-white" : "bg-green-500/85 text-white"}`}>
                <span className="flex gap-0.5">{[0,1,2].map(i=><span key={i} className={`w-1.5 h-1.5 rounded-full ${i<level?"bg-white":"bg-white/30"}`}/>)}</span>
                {LEVEL_LABELS[level]}
              </span>
              <h3 className="text-white font-bold text-sm leading-snug line-clamp-2">{article.title}</h3>
            </div>
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/testa_nobg.png" alt="" className="absolute inset-0 w-full h-full object-contain p-8 opacity-10" />
        )}
        {/* Dark mode: neon border top on critical */}
        {level === 3 && (
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent dark:via-red-400 opacity-70" />
        )}
      </div>

      <div className={`p-4 md:p-6 ${hasImage ? "hidden md:block" : "block"}`}>
        <div className="flex items-center gap-2 mb-2 md:mb-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${pillCls(level)}`}>
            <span className="flex gap-0.5">{[0,1,2].map(i=><span key={i} className={`w-1.5 h-1.5 rounded-full ${i<level ? level===1?"bg-green-500":level===2?"bg-orange-500":"bg-red-500" : "bg-current opacity-20"}`}/>)}</span>
            {LEVEL_LABELS[level]}
          </span>
          <time className="text-xs text-gray-400 card-meta">{formatDateShort(article.published_at)}</time>
        </div>
        <h3 className="card-title font-grotesk font-bold text-[#0B1F3A] text-base md:text-lg leading-snug line-clamp-2 mb-3 md:mb-4 group-hover:text-blue-600 dark:group-hover:text-[#00FFE5] transition-colors">
          {article.title}
        </h3>
        <div className="hidden sm:flex flex-wrap gap-1.5 mb-4">
          {article.tags.slice(0, 3).map((tag) => <TagBadge key={tag} tag={tag} linked={false} />)}
        </div>
      </div>

      <div className={`px-4 py-2.5 flex items-center justify-between border-t border-blue-50 dark:border-white/5 ${hasImage ? "md:border-none md:px-6 md:pb-4 md:pt-0" : ""}`}>
        <span className="text-xs text-gray-400 card-meta">
          {formatDateShort(article.published_at)} · {article.sources.length} fonte{article.sources.length !== 1 ? "i" : ""}
        </span>
        <span className="text-blue-600 dark:text-[#00FFE5] font-semibold text-xs group-hover:translate-x-0.5 transition-transform inline-block">
          Leggi →
        </span>
      </div>
    </Link>
  );
}

/* ─── Featured Small Card ─────────────────────────────────────────────────── */
function FeaturedSmallCard({ article }: { article: ArticleSummary }) {
  const level = getLevel(article.relevance_score);
  const accentColor =
    level === 3 ? "bg-red-500 dark:bg-red-400" :
    level === 2 ? "bg-orange-500 dark:bg-orange-400" :
                  "bg-green-500 dark:bg-green-400";
  return (
    <Link href={`/article/${article.id}`} className="card-blue flex items-stretch group h-full overflow-hidden" style={{ borderRadius: "16px" }}>
      <div className={`shrink-0 w-1 ${accentColor} opacity-60`} />
      {article.image_url && (
        <div className="shrink-0 w-14 overflow-hidden bg-blue-50 card-img-bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={article.image_url} alt="" className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }} />
        </div>
      )}
      <div className="flex-1 min-w-0 p-3">
        <h4 className="card-title font-grotesk text-xs font-semibold text-[#0B1F3A] line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-[#00FFE5] transition-colors mb-1.5">
          {article.title}
        </h4>
        <div className="flex items-center justify-between">
          <time className="text-xs text-gray-400 card-meta">{formatDateShort(article.published_at)}</time>
          <span className="text-xs text-blue-600 dark:text-[#00FFE5]/80 font-semibold">Leggi</span>
        </div>
      </div>
    </Link>
  );
}

/* ─── Daily Briefing ──────────────────────────────────────────────────────── */
function DailyBriefing({ articles }: { articles: ArticleSummary[] }) {
  const top5 = articles.slice(0, 5);
  if (top5.length === 0) return null;
  return (
    <motion.section
      variants={sectionFade}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      className="relative bg-blue-50 dark:bg-transparent border border-blue-100 dark:border-[#00FFE5]/10 rounded-3xl overflow-hidden my-10 md:my-14"
    >
      {/* Dark mode: cyber grid + neon border glow */}
      <div className="absolute inset-0 dot-grid-bg opacity-10 dark:opacity-100 dark:cyber-grid-bg" />
      <div className="absolute inset-0 dark:bg-gradient-to-br dark:from-[#00FFE5]/4 dark:via-transparent dark:to-[#7C3AED]/4 pointer-events-none" />

      <div className="relative z-10 px-5 py-8 md:px-8 md:py-12 md:flex items-center gap-10">

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-4 md:mb-6">
            <Zap size={18} className="text-blue-600 dark:text-[#00FFE5] shrink-0" />
            <h2 className="no-dark font-grotesk text-[#0B1F3A] dark:text-white font-extrabold text-xl md:text-2xl">
              Top criticità di oggi
            </h2>
          </div>

          <ol className="space-y-2.5 md:space-y-3 mb-5 md:mb-7">
            {top5.map((a, i) => {
              const level = getLevel(a.relevance_score);
              return (
                <li key={a.id}>
                  <Link href={`/article/${a.id}`} className="flex items-center gap-3 group py-0.5">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-[#00FFE5]/10 text-blue-600 dark:text-[#00FFE5] text-xs font-bold flex items-center justify-center font-mono">
                      {i + 1}
                    </span>
                    <span className="text-sm text-blue-900 dark:text-slate-300 group-hover:text-[#0B1F3A] dark:group-hover:text-white transition-colors line-clamp-1 flex-1">
                      {a.title}
                    </span>
                    <span className="shrink-0 flex gap-0.5 items-center">
                      {[0,1,2].map(j => (
                        <span key={j} className={`w-1.5 h-1.5 rounded-full ${
                          j < level
                            ? level === 1 ? "bg-green-400"
                              : level === 2 ? "bg-orange-400"
                              : "bg-red-400"
                            : "bg-blue-200 dark:bg-white/10"
                        }`} />
                      ))}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>

          <Link href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B1F3A] dark:bg-[#00FFE5] text-white dark:text-[#020817] rounded-full text-sm font-bold hover:opacity-90 transition-opacity font-grotesk">
            Vedi tutte le notizie →
          </Link>
        </div>

        {/* Mascot */}
        <div className="shrink-0 flex justify-center mt-8 md:mt-0">
          <div className="relative w-48 h-48 md:w-64 md:h-64">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/podio_nobg.png"
              alt="La mascotte di FoxScan sul podio"
              className="w-full h-full object-contain drop-shadow-2xl victory-anim neon-glow-logo"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.display = "none";
                if (el.parentElement)
                  el.parentElement.innerHTML = `<div style="width:100%;height:100%;border-radius:50%;background:rgba(0,255,229,0.1);display:flex;align-items:center;justify-content:center;font-size:4rem;">🦊</div>`;
              }}
            />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-10 md:w-56 md:h-16 bg-[#00FFE5] opacity-15 blur-2xl rounded-full" />
          </div>
        </div>
      </div>
    </motion.section>
  );
}

/* ─── Grid Card ───────────────────────────────────────────────────────────── */
function GridCard({ article }: { article: ArticleSummary }) {
  const level = getLevel(article.relevance_score);
  return (
    <Link
      href={`/article/${article.id}`}
      className={`card-blue block group overflow-hidden ${level === 3 ? "critical-pulse" : ""}`}
    >
      <div className="flex md:flex-col h-full">
        {/* Thumbnail */}
        <div className={`shrink-0 w-24 self-stretch md:w-full md:h-36 overflow-hidden card-img-bg ${article.image_url ? "bg-blue-50" : "img-placeholder"}`}>
          {article.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={article.image_url} alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                (e.target as HTMLImageElement).parentElement!.classList.add("img-placeholder");
                (e.target as HTMLImageElement).style.display = "none";
              }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/testa_nobg.png" alt="" className="w-full h-full object-contain p-3 md:p-6 opacity-10" />
          )}
          {/* Neon top border on critical */}
          {level === 3 && (
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent dark:via-red-400 opacity-60" />
          )}
        </div>

        {/* Content */}
        <div className="p-3 md:p-5 flex flex-col flex-1 min-w-0">
          <span className="card-title font-grotesk font-bold text-[#0B1F3A] text-xs md:text-sm leading-snug line-clamp-2 mb-2 md:mb-3 group-hover:text-blue-600 dark:group-hover:text-[#00FFE5] transition-colors">
            {article.title}
          </span>
          <div className="hidden md:flex flex-wrap gap-1.5 mb-3">
            {article.tags.slice(0, 3).map((tag) => <TagBadge key={tag} tag={tag} />)}
          </div>
          <div className="mt-auto flex items-center gap-2 pt-2 border-t border-blue-50 dark:border-white/5">
            <RelevanceDots score={article.relevance_score} showLabel={false} />
            <time className="text-xs text-gray-400 card-meta flex-1 truncate">{timeAgo(article.published_at)}</time>
            <span className="shrink-0 text-blue-600 dark:text-[#00FFE5]/80 font-semibold text-xs group-hover:translate-x-0.5 transition-transform inline-block">
              Leggi →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─── Skeleton ────────────────────────────────────────────────────────────── */
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="card-blue overflow-hidden cyber-scan">
          <div className="flex md:flex-col">
            <div className="shrink-0 w-24 self-stretch md:w-full md:h-36 skeleton" />
            <div className="p-3 md:p-5 flex-1">
              <div className="h-3 skeleton rounded w-1/3 mb-2" />
              <div className="h-4 skeleton rounded w-full mb-1.5" />
              <div className="h-4 skeleton rounded w-4/5 mb-3" />
              <div className="hidden md:block h-12 skeleton rounded-xl mb-4" />
              <div className="h-3 skeleton rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Loading Center ─────────────────────────────────────────────────────── */
function LoadingCenter() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <CyberLoader size={80} />
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
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [inEvidenza, setInEvidenza] = useState<ArticleSummary[]>([]);
  const [allLatest, setAllLatest] = useState<ArticleSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [tags, setTags] = useState<TagCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    getArticles({ min_score: 8, limit: 6 })
      .then((res) => setInEvidenza(res.items.filter((a) => isRecent(a.published_at, EVIDENZA_HOURS)).slice(0, 4)))
      .catch(() => {});
    getArticles({ limit: 20 })
      .then((res) => setAllLatest(res.items))
      .catch(() => {});
  }, [retryCount]);

  useEffect(() => {
    setLoading(true);
    const offset = (page - 1) * PAGE_SIZE;
    const scoreParams = LEVEL_RANGES[levelFilter];
    Promise.all([
      getArticles({ limit: PAGE_SIZE, offset, ...scoreParams }),
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
  }, [page, levelFilter, retryCount]);

  function changeLevel(lvl: number) { setLevelFilter(lvl); setPage(1); }

  const totalPages       = Math.ceil(total / PAGE_SIZE);
  const topTags          = tags.slice(0, 15);
  const featuredLarge    = inEvidenza[0];
  const featuredSmall    = inEvidenza.slice(1, 4);
  const briefingArticles = allLatest
    .filter((a) => getLevel(a.relevance_score) >= 2)
    .sort((a, b) => b.relevance_score - a.relevance_score);

  return (
    <motion.div variants={sectionFade} initial="hidden" animate="show">

      {/* ── In Evidenza ── */}
      {inEvidenza.length > 0 && (
        <motion.section
          variants={sectionFade}
          initial="hidden"
          animate="show"
          className="mb-10 md:mb-14"
        >
          <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
            <h2 className="no-dark font-grotesk text-lg md:text-xl font-extrabold text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <Flame size={20} className="shrink-0" /> In Evidenza
            </h2>
            <span className="evidenza-badge text-xs text-gray-400 border border-blue-100 rounded-full px-2.5 py-0.5 bg-blue-50">
              ultime {EVIDENZA_HOURS}h
            </span>
          </div>

          <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-3 md:gap-5">
            {featuredLarge && (
              <motion.div className="md:col-span-2" variants={cardItem} initial="hidden" animate="show">
                <FeaturedLargeCard article={featuredLarge} />
              </motion.div>
            )}
            {featuredSmall.length > 0 && (
              <motion.div className="flex flex-col gap-3" variants={cardGrid} initial="hidden" animate="show">
                {featuredSmall.map((a) => (
                  <motion.div key={a.id} variants={cardItem}>
                    <FeaturedSmallCard article={a} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </motion.section>
      )}

      {/* ── Filtri ── */}
      <section className="mb-6 md:mb-8">
        <div className="flex items-center gap-2 mb-2">
          {topTags.length > 0 && (
            <button onClick={() => setTagsOpen(!tagsOpen)}
              className="shrink-0 tag-toggle-btn flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-blue-600 dark:hover:text-[#00FFE5] transition-colors px-3 py-2 border border-blue-100 dark:border-white/8 hover:border-blue-300 rounded-full bg-white dark:bg-[#080e1e]">
              <Filter size={13} className="shrink-0" /> Categoria
              <span className="opacity-50">{tagsOpen ? "▲" : "▼"}</span>
            </button>
          )}
          {topTags.length > 0 && (
            <div className="hidden md:block w-px h-5 bg-blue-100 dark:bg-white/8 mx-1 shrink-0" />
          )}
          <span className="hidden md:inline text-xs text-gray-500 dark:text-slate-500 font-medium shrink-0">Rilevanza:</span>
          <div className="hidden md:flex items-center gap-1.5">
            {([0, 1, 2, 3] as const).map((lvl) => (
              <button key={lvl} onClick={() => changeLevel(lvl)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  levelFilter === lvl
                    ? "border-blue-600 bg-blue-600 text-white dark:border-[#00FFE5] dark:bg-[#00FFE5]/15 dark:text-[#00FFE5]"
                    : "filter-btn-inactive border-blue-200 text-gray-600 hover:border-blue-400 hover:text-blue-600 bg-white"
                }`}>
                {lvl > 0 && (
                  <span className="flex gap-0.5 items-center">
                    {[0,1,2].map(i => (
                      <span key={i} className={`w-1.5 h-1.5 rounded-full ${
                        i < lvl
                          ? lvl === 1 ? "bg-green-500" : lvl === 2 ? "bg-orange-500" : "bg-red-500"
                          : levelFilter === lvl ? "bg-current opacity-30" : "bg-blue-100 dark:bg-slate-600"
                      }`} />
                    ))}
                  </span>
                )}
                {LEVEL_LABELS[lvl]}
              </button>
            ))}
          </div>
        </div>

        {tagsOpen && topTags.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2 mb-2 overflow-hidden"
          >
            {topTags.map(({ tag }) => <TagBadge key={tag} tag={tag} />)}
          </motion.div>
        )}

        <div className="flex md:hidden items-center gap-2">
          {([0, 1, 2, 3] as const).map((lvl) => (
            <button key={lvl} onClick={() => changeLevel(lvl)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                levelFilter === lvl
                  ? "border-blue-600 bg-blue-600 text-white dark:border-[#00FFE5] dark:bg-[#00FFE5]/15 dark:text-[#00FFE5]"
                  : "filter-btn-inactive border-blue-200 text-gray-600 hover:border-blue-400 hover:text-blue-600 bg-white"
              }`}>
              {lvl > 0 && (
                <span className="flex gap-0.5 items-center">
                  {[0,1,2].map(i => (
                    <span key={i} className={`w-1.5 h-1.5 rounded-full ${
                      i < lvl
                        ? lvl === 1 ? "bg-green-500" : lvl === 2 ? "bg-orange-500" : "bg-red-500"
                        : levelFilter === lvl ? "bg-current opacity-30" : "bg-blue-100 dark:bg-slate-600"
                    }`} />
                  ))}
                </span>
              )}
              {LEVEL_LABELS[lvl]}
            </button>
          ))}
        </div>
      </section>

      {/* ── Ultime notizie ── */}
      <section id="ultime-notizie" className="mb-4 scroll-mt-20">
        <h2 className="font-grotesk text-lg md:text-xl font-extrabold text-[#0B1F3A] dark:text-slate-100 mb-4 md:mb-6">
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
              className="text-center py-20 md:py-24"
            >
              <div className="flex justify-center mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/error_nobg.png" alt="mascotte" className="w-32 h-32 md:w-40 md:h-40 object-contain float-anim opacity-70 neon-glow-logo"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
              <p className="text-base md:text-lg font-grotesk font-semibold text-gray-500 dark:text-slate-400 mb-2">
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
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5"
            >
              {articles.map((article) => (
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
            className="mt-8 md:mt-10 flex items-center justify-center gap-2"
          >
            {page > 1 && (
              <button onClick={() => goToPage(page - 1)}
                className="page-btn-prev px-4 md:px-5 py-2.5 text-sm rounded-full border border-blue-200 text-[#0B1F3A] font-medium hover:border-blue-400 hover:bg-blue-50 transition-all dark:bg-[#080e1e]">
                ← Prec.
              </button>
            )}
            <span className="px-4 py-2 text-sm text-gray-400 dark:text-slate-500 font-mono">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <button onClick={() => goToPage(page + 1)}
                className="px-4 md:px-5 py-2.5 text-sm rounded-full bg-[#0B1F3A] dark:bg-[#00FFE5] text-white dark:text-[#020817] font-semibold hover:opacity-90 transition-opacity">
                Succ. →
              </button>
            )}
          </motion.div>
        )}
      </section>

      {/* ── Daily Briefing ── */}
      <DailyBriefing articles={briefingArticles} />
    </motion.div>
  );
}
