"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getArticles, getTags, ArticleSummary, TagCount } from "@/lib/api";
import TagBadge from "@/components/TagBadge";
import RelevanceDots from "@/components/RelevanceDots";

const PAGE_SIZE = 9;
const EVIDENZA_HOURS = 48;

const LEVEL_RANGES: Record<number, { min_score?: number; max_score?: number }> = {
  0: {},
  1: { min_score: 1, max_score: 4 },
  2: { min_score: 5, max_score: 7 },
  3: { min_score: 8 },
};

const LEVEL_LABELS: Record<number, string> = { 0: "Tutti", 1: "Bassa", 2: "Media", 3: "Critica" };
const THREAT_ICON:  Record<number, string> = { 1: "🟢", 2: "🟡", 3: "🔴" };

/** Restituisce le classi CSS per il pill rilevanza, con varianti dark */
function pillCls(level: number) {
  if (level === 3) return "pill-high  bg-red-50    text-red-700    border border-red-200";
  if (level === 2) return "pill-medium bg-yellow-50 text-yellow-700 border border-yellow-200";
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

/* ─── Featured Large Card ─────────────────────────────────────────────────── */
function FeaturedLargeCard({ article }: { article: ArticleSummary }) {
  const level = getLevel(article.relevance_score);
  return (
    <Link href={`/article/${article.id}`} className="card-blue block overflow-hidden group h-full">
      <div className={`w-full h-52 overflow-hidden card-img-bg ${article.image_url ? "bg-blue-50" : "img-placeholder"}`}>
        {article.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={article.image_url} alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.classList.add("img-placeholder"); (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : null}
      </div>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${pillCls(level)}`}>
            {THREAT_ICON[level]} {LEVEL_LABELS[level]}
          </span>
          <time className="text-xs text-gray-400 card-meta">{formatDateShort(article.published_at)}</time>
        </div>
        <h3 className="card-title font-bold text-[#0B1F3A] text-lg leading-snug line-clamp-2 mb-4 group-hover:text-blue-600 transition-colors">
          {article.title}
        </h3>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {article.tags.slice(0, 3).map((tag) => <TagBadge key={tag} tag={tag} linked={false} />)}
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400 card-meta">
          <span>{article.sources.length} fonte{article.sources.length !== 1 ? "i" : ""}</span>
          <span className="text-blue-600 font-semibold group-hover:translate-x-1 transition-transform inline-block">Leggi →</span>
        </div>
      </div>
    </Link>
  );
}

/* ─── Featured Small Card ─────────────────────────────────────────────────── */
function FeaturedSmallCard({ article }: { article: ArticleSummary }) {
  const level = getLevel(article.relevance_score);
  return (
    <Link href={`/article/${article.id}`} className="card-blue flex items-start gap-3 p-4 group" style={{ borderRadius: "16px" }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${pillCls(level)}`}>
            {THREAT_ICON[level]} {LEVEL_LABELS[level]}
          </span>
        </div>
        <h4 className="card-title text-sm font-semibold text-[#0B1F3A] line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
          {article.title}
        </h4>
        <div className="mt-2 flex items-center justify-between">
          <time className="text-xs text-gray-400 card-meta">{formatDateShort(article.published_at)}</time>
          <span className="text-xs text-blue-600 font-medium">→</span>
        </div>
      </div>
      {article.image_url && (
        <div className="shrink-0 w-16 h-14 rounded-xl overflow-hidden bg-blue-50 card-img-bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={article.image_url} alt="" className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }} />
        </div>
      )}
    </Link>
  );
}

/* ─── Byte's Daily Briefing ───────────────────────────────────────────────── */
function DailyBriefing({ articles }: { articles: ArticleSummary[] }) {
  const top5 = articles.slice(0, 5);
  if (top5.length === 0) return null;
  return (
    <section className="relative bg-[#0B1F3A] rounded-3xl overflow-hidden my-14">
      <div className="absolute inset-0 dot-grid-bg opacity-20" />
      <div className="relative z-10 px-8 py-12 md:flex items-center gap-10">

        {/* Byte mascot — grande e prominente */}
        <div className="shrink-0 flex justify-center mb-8 md:mb-0 md:order-last">
          <div className="relative w-96 h-96 float-anim">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/byte-mascot.png"
              alt="La mascotte di CyberNews"
              className="w-full h-full object-contain drop-shadow-2xl"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.display = "none";
                if (el.parentElement)
                  el.parentElement.innerHTML = `<div style="width:384px;height:384px;border-radius:50%;background:rgba(6,230,217,0.15);display:flex;align-items:center;justify-content:center;font-size:140px;">👻</div>`;
              }}
            />
            {/* Glow */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-56 h-16 bg-[#06E6D9] opacity-20 blur-2xl rounded-full" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h2 className="no-dark text-white font-extrabold text-2xl mb-6">Le minacce di oggi</h2>
          <ol className="space-y-3 mb-7">
            {top5.map((a, i) => {
              const level = getLevel(a.relevance_score);
              return (
                <li key={a.id}>
                  <Link href={`/article/${a.id}`} className="flex items-center gap-3 group">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600/30 text-[#06E6D9] text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-sm text-blue-100 group-hover:text-white transition-colors line-clamp-1 flex-1">
                      {a.title}
                    </span>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${
                      level === 3 ? "bg-red-500/20 text-red-300"
                      : level === 2 ? "bg-yellow-500/20 text-yellow-300"
                      : "bg-green-500/20 text-green-300"
                    }`}>{THREAT_ICON[level]}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
          <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#06E6D9] text-[#0B1F3A] rounded-full text-sm font-bold hover:bg-cyan-300 transition-colors">
            Vedi tutte le notizie →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Grid Card ───────────────────────────────────────────────────────────── */
function GridCard({ article }: { article: ArticleSummary }) {
  const level = getLevel(article.relevance_score);
  return (
    <article className="card-blue group flex flex-col overflow-hidden">
      <div className={`w-full h-36 overflow-hidden card-img-bg shrink-0 ${article.image_url ? "bg-blue-50" : "img-placeholder"}`}>
        {article.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={article.image_url} alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.classList.add("img-placeholder"); (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : null}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${pillCls(level)}`}>
            {THREAT_ICON[level]} {LEVEL_LABELS[level]}
          </span>
          <time className="text-xs text-gray-400 card-meta">{formatDate(article.published_at)}</time>
        </div>
        <Link href={`/article/${article.id}`}
          className="card-title font-bold text-[#0B1F3A] leading-snug line-clamp-2 mb-3 hover:text-blue-600 transition-colors">
          {article.title}
        </Link>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {article.tags.slice(0, 3).map((tag) => <TagBadge key={tag} tag={tag} />)}
        </div>
        <div className="mt-auto flex items-center justify-between text-xs text-gray-400 card-meta">
          <div className="flex items-center gap-2">
            <RelevanceDots score={article.relevance_score} showLabel={false} />
            <span>{article.sources.length} fonte{article.sources.length !== 1 ? "i" : ""}</span>
          </div>
          <Link href={`/article/${article.id}`} className="text-blue-600 font-semibold hover:translate-x-1 transition-transform inline-block">
            Leggi →
          </Link>
        </div>
      </div>
    </article>
  );
}

/* ─── Skeleton ────────────────────────────────────────────────────────────── */
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="card-blue p-5">
          <div className="h-36 skeleton rounded-xl mb-4" />
          <div className="h-3 skeleton rounded w-1/4 mb-4" />
          <div className="h-5 skeleton rounded w-full mb-2" />
          <div className="h-5 skeleton rounded w-3/4 mb-4" />
          <div className="h-16 skeleton rounded-xl mb-4" />
          <div className="h-3 skeleton rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */
export default function HomePage() {
  const [page, setPage] = useState(1);
  const [levelFilter, setLevelFilter] = useState(0);
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [inEvidenza, setInEvidenza] = useState<ArticleSummary[]>([]);
  const [allLatest, setAllLatest] = useState<ArticleSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [tags, setTags] = useState<TagCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(false);

  useEffect(() => {
    getArticles({ min_score: 8, limit: 6 })
      .then((res) => setInEvidenza(res.items.filter((a) => isRecent(a.published_at, EVIDENZA_HOURS)).slice(0, 4)))
      .catch(() => {});
    getArticles({ limit: 20 })
      .then((res) => setAllLatest(res.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const offset = (page - 1) * PAGE_SIZE;
    const scoreParams = LEVEL_RANGES[levelFilter];
    Promise.all([
      getArticles({ limit: PAGE_SIZE, offset, ...scoreParams }).catch(() => ({ total: 0, offset: 0, limit: PAGE_SIZE, items: [] })),
      getTags().catch(() => []),
    ]).then(([articlesRes, tagsRes]) => {
      setArticles(articlesRes.items);
      setTotal(articlesRes.total);
      setTags(tagsRes);
      setLoading(false);
    });
  }, [page, levelFilter]);

  function changeLevel(lvl: number) { setLevelFilter(lvl); setPage(1); }

  const totalPages   = Math.ceil(total / PAGE_SIZE);
  const topTags      = tags.slice(0, 15);
  const featuredLarge = inEvidenza[0];
  const featuredSmall = inEvidenza.slice(1, 4);
  const briefingArticles = allLatest
    .filter((a) => getLevel(a.relevance_score) >= 2)
    .sort((a, b) => b.relevance_score - a.relevance_score);

  return (
    <div className="fade-up">

      {/* ── In Evidenza ── */}
      {inEvidenza.length > 0 && (
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="no-dark text-xl font-extrabold text-red-600 dark:text-red-400">⚠ In Evidenza</h2>
            <span className="evidenza-badge text-xs text-gray-400 border border-blue-100 rounded-full px-2.5 py-0.5 bg-blue-50">
              ultime {EVIDENZA_HOURS}h
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {featuredLarge && (
              <div className="md:col-span-2">
                <FeaturedLargeCard article={featuredLarge} />
              </div>
            )}
            {featuredSmall.length > 0 && (
              <div className="flex flex-col gap-4">
                {featuredSmall.map((a) => <FeaturedSmallCard key={a.id} article={a} />)}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Filtri ── */}
      <section className="mb-8">
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="text-xs text-gray-500 dark:text-slate-400 font-medium mr-1">Rilevanza:</span>
          {([0, 1, 2, 3] as const).map((lvl) => (
            <button key={lvl} onClick={() => changeLevel(lvl)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                levelFilter === lvl
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "filter-btn-inactive border-blue-200 text-gray-600 hover:border-blue-400 hover:text-blue-600 bg-white"
              }`}>
              {lvl === 0 ? "Tutti" : <>{THREAT_ICON[lvl]} {LEVEL_LABELS[lvl]}</>}
            </button>
          ))}
        </div>

        {topTags.length > 0 && (
          <div>
            <button onClick={() => setTagsOpen(!tagsOpen)}
              className="tag-toggle-btn flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors px-3 py-1.5 border border-blue-100 hover:border-blue-300 rounded-lg bg-white">
              <span>🏷 Filtra per categoria</span>
              <span>{tagsOpen ? "▲" : "▼"}</span>
            </button>
            {tagsOpen && (
              <div className="mt-3 flex flex-wrap gap-2">
                {topTags.map(({ tag }) => <TagBadge key={tag} tag={tag} />)}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Ultime notizie ── */}
      <section className="mb-4">
        <h2 className="text-xl font-extrabold text-[#0B1F3A] dark:text-slate-100 mb-6">Ultime notizie</h2>

        {loading ? <SkeletonGrid /> : articles.length === 0 ? (
          <div className="text-center py-24">
            {/* Empty state con mascotte grande */}
            <div className="flex justify-center mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/byte-mascot.png" alt="Byte" className="w-40 h-40 object-contain float-anim opacity-60"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
            <p className="text-lg font-semibold text-gray-500 dark:text-slate-400 mb-2">
              {levelFilter > 0
                ? `Nessun articolo con rilevanza "${LEVEL_LABELS[levelFilter]}".`
                : "Byte non ha ancora trovato notizie..."}
            </p>
            {levelFilter === 0 && (
              <p className="text-sm text-gray-400 dark:text-slate-500">
                Avvia la pipeline dal{" "}
                <Link href="/admin" className="text-blue-600 hover:underline font-medium">pannello Admin</Link>.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {articles.map((article) => <GridCard key={article.id} article={article} />)}
            </div>

            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                {page > 1 && (
                  <button onClick={() => setPage(page - 1)}
                    className="page-btn-prev px-5 py-2 text-sm rounded-full border border-blue-200 text-[#0B1F3A] font-medium hover:border-blue-400 hover:bg-blue-50 transition-all">
                    ← Precedente
                  </button>
                )}
                <span className="px-4 py-2 text-sm text-gray-400 dark:text-slate-500">{page} / {totalPages}</span>
                {page < totalPages && (
                  <button onClick={() => setPage(page + 1)}
                    className="px-5 py-2 text-sm rounded-full bg-[#0B1F3A] text-white font-medium hover:bg-blue-700 transition-colors">
                    Successiva →
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Byte's Daily Briefing ── */}
      <DailyBriefing articles={briefingArticles} />
    </div>
  );
}
