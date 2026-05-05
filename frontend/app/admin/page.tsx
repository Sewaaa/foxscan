"use client";

import { useEffect, useState } from "react";
import { AdminStats, PipelineRun, IgStats, IgArticle, getStats, getPipelineHistory, getIgStats } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const SESSION_KEY = "foxscan_admin_key";

interface FeedStat { feed_source: string; count: number; multi_source_count: number; }

const FEED_META: Record<string, { name: string; url: string }> = {
  "www.bleepingcomputer.com":        { name: "BleepingComputer",       url: "https://www.bleepingcomputer.com" },
  "feeds.feedburner.com":            { name: "The Hacker News",         url: "https://thehackernews.com" },
  "krebsonsecurity.com":             { name: "Krebs on Security",       url: "https://krebsonsecurity.com" },
  "www.darkreading.com":             { name: "Dark Reading",            url: "https://www.darkreading.com" },
  "securityaffairs.com":             { name: "Security Affairs",        url: "https://securityaffairs.com" },
  "grahamcluley.com":                { name: "Graham Cluley",           url: "https://grahamcluley.com" },
  "www.helpnetsecurity.com":         { name: "Help Net Security",       url: "https://www.helpnetsecurity.com" },
  "www.infosecurity-magazine.com":   { name: "Infosecurity Magazine",   url: "https://www.infosecurity-magazine.com" },
  "www.wired.com":                   { name: "Wired Security",          url: "https://www.wired.com/category/security/" },
  "cyberscoop.com":                  { name: "CyberScoop",              url: "https://cyberscoop.com" },
  "www.theregister.com":             { name: "The Register",            url: "https://www.theregister.com/security/" },
  "techcrunch.com":                  { name: "TechCrunch Security",     url: "https://techcrunch.com/tag/security/" },
  "www.malwarebytes.com":            { name: "Malwarebytes",            url: "https://www.malwarebytes.com/blog/" },
  "www.recordedfuture.com":          { name: "Recorded Future",         url: "https://www.recordedfuture.com" },
  "unit42.paloaltonetworks.com":     { name: "Unit 42",                 url: "https://unit42.paloaltonetworks.com" },
  "www.microsoft.com":               { name: "Microsoft Security",      url: "https://www.microsoft.com/en-us/security/blog/" },
  "www.schneier.com":                { name: "Schneier on Security",    url: "https://www.schneier.com" },
  "arstechnica.com":                 { name: "Ars Technica",            url: "https://arstechnica.com/security/" },
  "hackread.com":                    { name: "Hackread",                url: "https://hackread.com" },
  "gbhackers.com":                   { name: "GBHackers",               url: "https://gbhackers.com" },
  "thecyberexpress.com":             { name: "The Cyber Express",       url: "https://thecyberexpress.com" },
  "cybernews.com":                   { name: "Cybernews",               url: "https://cybernews.com" },
  "www.redhotcyber.com":             { name: "Red Hot Cyber",           url: "https://www.redhotcyber.com" },
  "www.cybersecurity360.it":         { name: "Cybersecurity360",        url: "https://www.cybersecurity360.it" },
  "cert-agid.gov.it":                { name: "CERT-AgID",               url: "https://cert-agid.gov.it" },
  "www.agendadigitale.eu":           { name: "Agenda Digitale",         url: "https://www.agendadigitale.eu" },
  "www.punto-informatico.it":        { name: "Punto Informatico",       url: "https://www.punto-informatico.it" },
};

// ── Icons ─────────────────────────────────────────────────────────────────────

const IconPlay = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
  </svg>
);
const IconRefresh = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);
const IconClock = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);
const IconTrash = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);
const IconCamera = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
  </svg>
);
const IconCheck = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
);
const IconX = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);
const IconLock = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
  </svg>
);
const IconLogout = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
  </svg>
);
const IconSpinner = ({ className = "w-4 h-4" }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);
const IconChevronRight = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
  </svg>
);

// ── Btn ───────────────────────────────────────────────────────────────────────

function Btn({
  onClick, disabled, loading, variant = "ghost", icon, children, className = "",
}: {
  onClick: () => void; disabled?: boolean; loading?: boolean;
  variant?: "primary" | "ghost" | "danger" | "pink";
  icon?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  const v = {
    primary: "bg-orange-500 hover:bg-orange-400 text-white",
    pink:    "bg-pink-600 hover:bg-pink-500 text-white",
    ghost:   "bg-white/5 hover:bg-white/10 border border-white/8 text-slate-400 hover:text-slate-200",
    danger:  "bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300",
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${v} ${className}`}>
      {loading ? <IconSpinner /> : icon}
      {children}
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [adminKey, setAdminKey]         = useState("");
  const [keyInput, setKeyInput]         = useState("");
  const [unlocked, setUnlocked]         = useState(false);
  const [authError, setAuthError]       = useState(false);
  const [authLoading, setAuthLoading]   = useState(false);

  const [stats, setStats]                     = useState<AdminStats | null>(null);
  const [feedStats, setFeedStats]             = useState<FeedStat[]>([]);
  const [pipelineHistory, setPipelineHistory] = useState<PipelineRun[]>([]);
  const [igStats, setIgStats]                 = useState<IgStats | null>(null);
  const [igRunning, setIgRunning]             = useState(false);
  const [igMessage, setIgMessage]             = useState<string | null>(null);
  const [, setLoading]                        = useState(true);
  const [running, setRunning]                 = useState(false);
  const [resetting, setResetting]             = useState(false);
  const [closingRuns, setClosingRuns]         = useState(false);
  const [deleting, setDeleting]               = useState(false);
  const [message, setMessage]                 = useState<string | null>(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) { setAdminKey(saved); setUnlocked(true); }
  }, []);

  async function loadStats(key: string) {
    setLoading(true);
    const [s, fs, ph, ig] = await Promise.all([
      getStats(key).catch(() => null),
      fetch(`${API_BASE}/admin/feed-stats`, { headers: { "X-Admin-Key": key } }).then(r => r.ok ? r.json() : []).catch(() => []),
      getPipelineHistory(key).catch(() => []),
      getIgStats(key).catch(() => null),
    ]);
    setStats(s); setFeedStats(fs); setPipelineHistory(ph); setIgStats(ig);
    const igStatus = await fetch(`${API_BASE}/admin/ig-pipeline-status`, { headers: { "X-Admin-Key": key } })
      .then(r => r.ok ? r.json() : null).catch(() => null);
    setIgRunning(igStatus?.running ?? false);
    setPipelineRunning(s?.pipeline_running ?? false);
    setLoading(false);
  }

  useEffect(() => {
    if (!unlocked || !adminKey) return;
    loadStats(adminKey);
    const iv = setInterval(() => loadStats(adminKey), 15000);
    return () => clearInterval(iv);
  }, [unlocked, adminKey]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setAuthError(false); setAuthLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/stats`, { headers: { "X-Admin-Key": keyInput } });
      if (res.status === 401) { setAuthError(true); setAuthLoading(false); return; }
      sessionStorage.setItem(SESSION_KEY, keyInput);
      setAdminKey(keyInput); setUnlocked(true);
    } catch { setAuthError(true); }
    setAuthLoading(false);
  }

  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY);
    setAdminKey(""); setKeyInput(""); setUnlocked(false); setStats(null);
  }

  function aFetch(path: string, opts: RequestInit = {}) {
    return fetch(`${API_BASE}${path}`, { ...opts, headers: { ...(opts.headers ?? {}), "X-Admin-Key": adminKey } });
  }

  async function triggerIgPipeline() {
    setIgRunning(true); setIgMessage(null);
    try {
      const d = await aFetch("/admin/run-ig-pipeline", { method: "POST" }).then(r => r.json());
      setIgMessage(d.status === "already_running" ? "Pipeline IG già in esecuzione." : d.status === "started" ? "Post avviato." : `Errore: ${JSON.stringify(d)}`);
      if (d.status !== "started") setIgRunning(false);
    } catch { setIgMessage("Errore nell'avvio."); setIgRunning(false); }
  }

  async function closeStaleRuns() {
    setClosingRuns(true); setMessage(null);
    try {
      const d = await aFetch("/admin/close-stale-runs", { method: "POST" }).then(r => r.json());
      setMessage(`Chiuse ${d.closed} run bloccate.`); await loadStats(adminKey);
    } catch { setMessage("Errore."); } finally { setClosingRuns(false); }
  }

  async function resetItems() {
    setResetting(true); setMessage(null);
    try {
      const d = await aFetch("/admin/reset-items", { method: "POST" }).then(r => r.json());
      setMessage(`${d.items_reset} item rimarcati — avvia la pipeline.`); await loadStats(adminKey);
    } catch { setMessage("Errore."); } finally { setResetting(false); }
  }

  async function deleteAllArticles() {
    if (!window.confirm("Eliminare TUTTI gli articoli? Azione irreversibile.")) return;
    setDeleting(true); setMessage(null);
    try {
      const d = await aFetch("/admin/delete-all-articles", { method: "DELETE" }).then(r => r.json());
      setMessage(`Eliminati ${d.articles_deleted} articoli.`); await loadStats(adminKey);
    } catch { setMessage("Errore."); } finally { setDeleting(false); }
  }

  async function triggerPipeline() {
    setRunning(true); setMessage(null);
    try {
      const d = await aFetch("/admin/run-pipeline", { method: "POST" }).then(r => r.json());
      if (d.status === "already_running") { setMessage("Pipeline già in esecuzione."); await loadStats(adminKey); }
      else { setMessage("Pipeline avviata."); setPipelineRunning(true); }
    } catch { setMessage("Errore."); } finally { setRunning(false); }
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  if (!unlocked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-xs">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 mb-4">
              <IconLock className="w-5 h-5 text-orange-400" />
            </div>
            <h1 className="text-lg font-semibold text-slate-100">Pannello Admin</h1>
          </div>
          <form onSubmit={handleLogin} className="rounded-xl border border-white/5 bg-white/[0.03] p-5 space-y-3">
            <div>
              <label htmlFor="ak" className="block text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Chiave admin</label>
              <input id="ak" type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/8 text-slate-100 placeholder-slate-700 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/60 transition-colors"
                placeholder="••••••••••••" autoFocus autoComplete="current-password" />
            </div>
            {authError && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <IconX />Chiave non valida
              </div>
            )}
            <button type="submit" disabled={!keyInput || authLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white text-sm font-medium transition-all active:scale-95 cursor-pointer">
              {authLoading ? <IconSpinner /> : null}
              {authLoading ? "Verifica…" : "Accedi"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  const utc = (s: string) => new Date(s.endsWith("Z") ? s : s + "Z");
  const fmt = (s: string, opts?: Intl.DateTimeFormatOptions) =>
    utc(s).toLocaleString("it-IT", opts ?? {});

  const sortBy = (list: IgArticle[]) =>
    [...list].sort((a, b) => {
      const d = (b.ig_score ?? 0) - (a.ig_score ?? 0);
      if (d !== 0) return d;
      if (b.relevance_score !== a.relevance_score) return b.relevance_score - a.relevance_score;
      return utc(b.published_at).getTime() - utc(a.published_at).getTime();
    });

  const hasCritical   = (igStats?.pending.length ?? 0) > 0;
  const sortedPending = sortBy(hasCritical ? (igStats?.pending ?? []) : (igStats?.pending_fallback ?? []));
  const isFallback    = !hasCritical && sortedPending.length > 0;
  const nextArticle   = sortedPending[0] ?? null;
  const queueRest     = sortedPending.slice(1);

  const sortedFeeds = Object.entries(FEED_META)
    .map(([domain, meta]) => {
      const stat = feedStats.find(f => f.feed_source === domain);
      return { domain, meta, count: stat?.count ?? 0, multi: stat?.multi_source_count ?? 0 };
    })
    .sort((a, b) => b.count - a.count);

  const maxFeedCount = Math.max(...sortedFeeds.map(f => f.count), 1);

  // ── Dashboard ──────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl space-y-4 pb-16">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h1 className="text-base font-semibold text-slate-200">Dashboard</h1>
          {stats && (
            <span className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              {utc(stats.server_time).toLocaleTimeString("it-IT")}
            </span>
          )}
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-300 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-white/5">
          <IconLogout className="w-3.5 h-3.5" />Esci
        </button>
      </div>

      {/* ── Bento KPI ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

        {/* Articoli totali — grande */}
        <div className="col-span-1 rounded-xl border border-white/5 bg-white/[0.03] p-5 flex flex-col justify-between min-h-[110px]">
          <p className="text-[11px] font-medium uppercase tracking-widest text-slate-600">Articoli totali</p>
          {stats ? (
            <p className="text-4xl font-bold text-slate-100 tabular-nums mt-2">{stats.total_articles}</p>
          ) : (
            <div className="h-10 w-20 animate-pulse rounded-lg bg-white/5 mt-2" />
          )}
        </div>

        {/* Ultime 24h */}
        <div className="col-span-1 rounded-xl border border-white/5 bg-white/[0.03] p-5 flex flex-col justify-between min-h-[110px]">
          <p className="text-[11px] font-medium uppercase tracking-widest text-slate-600">Ultime 24h</p>
          {stats ? (
            <>
              <p className="text-4xl font-bold text-emerald-400 tabular-nums mt-2">{stats.articles_last_24h}</p>
              <div className="mt-3 h-1 w-full rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500/60 transition-all duration-700"
                  style={{ width: `${Math.min((stats.articles_last_24h / Math.max(stats.total_articles, 1)) * 100 * 8, 100)}%` }} />
              </div>
            </>
          ) : <div className="h-10 w-16 animate-pulse rounded-lg bg-white/5 mt-2" />}
        </div>

        {/* RSS in coda */}
        <div className="col-span-1 rounded-xl border border-white/5 bg-white/[0.03] p-5 flex flex-col justify-between min-h-[110px]">
          <p className="text-[11px] font-medium uppercase tracking-widest text-slate-600">RSS in coda</p>
          {stats ? (
            <>
              <p className="text-4xl font-bold text-sky-400 tabular-nums mt-2">{stats.rss_items_pending}</p>
              <p className="text-[11px] text-slate-700 mt-1">{stats.rss_items_processed} processati</p>
            </>
          ) : <div className="h-10 w-14 animate-pulse rounded-lg bg-white/5 mt-2" />}
        </div>

        {/* Ultimo articolo */}
        <div className="col-span-1 rounded-xl border border-white/5 bg-white/[0.03] p-5 flex flex-col justify-between min-h-[110px]">
          <p className="text-[11px] font-medium uppercase tracking-widest text-slate-600">Ultimo articolo</p>
          {stats?.last_article_at ? (
            <>
              <p className="text-lg font-semibold text-slate-200 mt-2 tabular-nums leading-tight">
                {fmt(stats.last_article_at, { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="text-[11px] text-slate-600 mt-1">
                {fmt(stats.last_article_at, { day: "2-digit", month: "short" })}
              </p>
            </>
          ) : <div className="h-8 w-20 animate-pulse rounded-lg bg-white/5 mt-2" />}
        </div>
      </div>

      {/* ── Coverage strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          { label: "Copertura multi-fonte · 24h", pct: stats?.multi_source_pct_24h ?? 0, count: stats?.multi_source_last_24h ?? 0, total: stats?.articles_last_24h ?? 0 },
          { label: "Copertura multi-fonte · 48h", pct: stats?.multi_source_pct_48h ?? 0, count: stats?.multi_source_last_48h ?? 0, total: stats?.articles_last_48h ?? 0 },
        ].map(({ label, pct, count, total }) => {
          const color = pct >= 60 ? "bg-emerald-500" : pct >= 30 ? "bg-amber-400" : "bg-red-500";
          const text  = pct >= 60 ? "text-emerald-400" : pct >= 30 ? "text-amber-400" : "text-red-400";
          return (
            <div key={label} className="rounded-xl border border-white/5 bg-white/[0.03] px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-medium uppercase tracking-widest text-slate-600">{label}</p>
                <span className={`text-xl font-bold tabular-nums ${text}`}>{pct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[11px] text-slate-700 mt-1.5">{count} su {total} articoli con più fonti</p>
            </div>
          );
        })}
      </div>

      {/* ── Pipeline ────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Pipeline</h2>
            <p className="text-[11px] text-slate-600 mt-0.5">Automatica ogni 30 min</p>
          </div>
          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${
            pipelineRunning
              ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          }`}>
            {pipelineRunning ? "In esecuzione" : "Idle"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={triggerPipeline} disabled={running || pipelineRunning} loading={running || pipelineRunning} variant="primary" icon={<IconPlay />}>
            {pipelineRunning ? "In esecuzione…" : "Avvia pipeline"}
          </Btn>
          <Btn onClick={resetItems} disabled={running || resetting || deleting || closingRuns} loading={resetting} icon={<IconRefresh />}>
            {resetting ? "Reset…" : "Reset item"}
          </Btn>
          <Btn onClick={closeStaleRuns} disabled={running || resetting || deleting || closingRuns} loading={closingRuns} icon={<IconClock />}>
            {closingRuns ? "Chiusura…" : "Chiudi bloccate"}
          </Btn>
        </div>
        {message && (
          <div className="flex items-start gap-2 rounded-lg bg-white/5 border border-white/8 px-3 py-2.5 text-xs text-slate-400">
            <span className="flex-1">{message}</span>
            <button onClick={() => setMessage(null)} className="text-slate-600 hover:text-slate-300 cursor-pointer shrink-0"><IconX /></button>
          </div>
        )}
      </div>

      {/* ── Fonti RSS ────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-200">
            Fonti RSS <span className="text-slate-600 font-normal">({Object.keys(FEED_META).length})</span>
          </h2>
          <div className="flex items-center gap-3 text-[10px] text-slate-700">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-600 inline-block" />item</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />multi-fonte</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          {sortedFeeds.map(({ domain, meta, count, multi }) => (
            <div key={domain} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
              <div className="w-14 shrink-0">
                <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-orange-500/40 transition-all duration-500"
                    style={{ width: `${Math.round((count / maxFeedCount) * 100)}%` }} />
                </div>
              </div>
              <a href={meta.url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-slate-400 hover:text-orange-400 transition-colors truncate flex-1 cursor-pointer">
                {meta.name}
              </a>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-mono text-slate-600">{count || "·"}</span>
                {multi > 0 && (
                  <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    {multi}×
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Instagram (controlli + coda + ultimi post) ───────────────────── */}
      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5 space-y-5">

        {/* Header + KPI + prossimo + bottone */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Instagram</h2>
            <p className="text-[11px] text-slate-600 mt-0.5">09:00 · 12:30 · 21:00</p>
          </div>
          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${
            igRunning
              ? "bg-pink-500/10 border-pink-500/20 text-pink-400"
              : "bg-white/5 border-white/8 text-slate-500"
          }`}>
            {igRunning ? "In esecuzione" : "Idle"}
          </span>
        </div>

        {/* Mini KPI */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { v: igStats?.posted_today ?? "·", l: "Postati (36h)", c: "text-emerald-400" },
            { v: sortedPending.length, l: isFallback ? "Coda (fallback)" : "In coda", c: "text-slate-200" },
            { v: igStats?.too_old.length ?? "·", l: "Scaduti", c: "text-amber-500" },
          ].map(({ v, l, c }) => (
            <div key={l} className="rounded-lg bg-white/[0.03] border border-white/5 py-3">
              <p className={`text-2xl font-bold tabular-nums ${c}`}>{v}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">{l}</p>
            </div>
          ))}
        </div>

        {/* Prossimo post */}
        {nextArticle ? (
          <div className={`rounded-lg border p-3 ${isFallback ? "border-amber-500/20 bg-amber-500/5" : "border-pink-500/20 bg-pink-500/5"}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <p className={`text-[10px] font-semibold uppercase tracking-widest ${isFallback ? "text-amber-500" : "text-pink-500"}`}>Prossimo</p>
              {isFallback && <span className="text-[9px] font-medium bg-amber-500/15 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">fallback</span>}
              <span className="ml-auto text-[11px] font-mono text-amber-400">▲{nextArticle.relevance_score}</span>
              {nextArticle.ig_score != null && <span className="text-[11px] font-mono text-pink-400">ig·{nextArticle.ig_score}</span>}
            </div>
            <a href={`/article/${nextArticle.id}`} target="_blank" rel="noopener noreferrer"
              className="text-xs text-slate-300 hover:text-orange-400 transition-colors line-clamp-2 cursor-pointer leading-relaxed">
              {nextArticle.title}
            </a>
          </div>
        ) : igStats && (
          <p className="text-xs text-slate-600 italic">Nessun articolo idoneo nelle ultime 36h.</p>
        )}

        {/* Bottone posta */}
        <div className="flex items-center gap-3 flex-wrap">
          <Btn onClick={triggerIgPipeline} disabled={igRunning} loading={igRunning} variant="pink" icon={<IconCamera />}>
            {igRunning ? "Post in corso…" : "Posta ora"}
          </Btn>
          {igMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/8 px-3 py-2 text-xs text-slate-400">
              <span>{igMessage}</span>
              <button onClick={() => setIgMessage(null)} className="text-slate-600 hover:text-slate-300 cursor-pointer"><IconX /></button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-white/[0.06]" />

        {/* Coda IG + Ultimi post — side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Coda + scaduti */}
          <div className="space-y-4">
            {sortedPending.length > 0 && (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-slate-600 mb-2">
                  Coda — {sortedPending.length} {sortedPending.length === 1 ? "articolo" : "articoli"}
                </p>
                <div className="divide-y divide-white/[0.04]">
                  {sortedPending.map((a, i) => (
                    <div key={a.id} className="flex items-center gap-2 py-2">
                      <span className="text-[10px] font-mono text-slate-700 w-4 shrink-0">{i + 1}</span>
                      <a href={`/article/${a.id}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-slate-400 hover:text-orange-400 transition-colors truncate flex-1 cursor-pointer">
                        {a.title}
                      </a>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono text-amber-500">▲{a.relevance_score}</span>
                        {a.ig_score != null && <span className="text-[10px] font-mono text-pink-500">ig·{a.ig_score}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(igStats?.too_old.length ?? 0) > 0 && (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-amber-600/60 mb-2">
                  Scaduti — fuori finestra 36h
                </p>
                <div className="divide-y divide-white/[0.04]">
                  {igStats!.too_old.map(a => (
                    <div key={a.id} className="flex items-center justify-between py-2 gap-2">
                      <a href={`/article/${a.id}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-slate-700 line-through truncate flex-1 hover:text-amber-500/60 transition-colors cursor-pointer">
                        {a.title}
                      </a>
                      <span className="text-[10px] font-mono text-slate-700 shrink-0">▲{a.relevance_score}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {sortedPending.length === 0 && (igStats?.too_old.length ?? 0) === 0 && (
              <p className="text-xs text-slate-700 italic">Nessun articolo in coda o scaduto.</p>
            )}
          </div>

          {/* Ultimi post pubblicati */}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-600 mb-2">
              Ultimi post pubblicati
            </p>
            {(igStats?.recent_posted.length ?? 0) === 0 ? (
              <p className="text-xs text-slate-700 italic">Nessun post ancora pubblicato.</p>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {igStats!.recent_posted.map(a => (
                  <div key={a.id} className="flex items-center gap-3 py-2.5">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/25 shrink-0">
                      <IconCheck className="w-2.5 h-2.5 text-emerald-400" />
                    </span>
                    <a href={`/article/${a.id}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-slate-400 hover:text-orange-400 transition-colors truncate flex-1 cursor-pointer">
                      {a.title}
                    </a>
                    <span className="text-[11px] text-slate-700 shrink-0 whitespace-nowrap">
                      {fmt(a.published_at, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Storico pipeline ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-3">
          Storico pipeline <span className="text-slate-600 font-normal">({pipelineHistory.length})</span>
        </h2>
        {pipelineHistory.length === 0 ? (
          <p className="text-xs text-slate-700 italic">Nessuna esecuzione registrata.</p>
        ) : (
          <>
            <div className="divide-y divide-white/[0.04]">
              {pipelineHistory.map((run) => {
                const isRunning = !run.completed_at;
                return (
                  <div key={run.id} className="flex items-center gap-4 py-1.5 text-[11px] font-mono">
                    <span className="w-28 shrink-0 text-slate-600">
                      {fmt(run.started_at, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {isRunning ? (
                      <span className="flex items-center gap-1 text-amber-400"><IconSpinner className="w-3 h-3" />in corso</span>
                    ) : (
                      <span className="text-slate-700 w-10 shrink-0">{run.duration_s}s</span>
                    )}
                    <span className="text-emerald-500">+{run.created}</span>
                    <span className="text-sky-500">~{run.updated}</span>
                    <span className="text-slate-700">/{run.skipped}</span>
                    {run.errors > 0 && <span className="text-red-400">✗{run.errors}</span>}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-2 pt-2 border-t border-white/[0.04] text-[10px] text-slate-700">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />creati</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block" />aggiornati</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-600 inline-block" />saltati</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />errori</span>
            </div>
          </>
        )}
      </div>

      {/* ── Zona pericolosa ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-red-500/15 bg-red-500/[0.02] p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-red-400">Zona pericolosa</h2>
            <p className="text-xs text-slate-700 mt-0.5">Azione irreversibile.</p>
          </div>
          <Btn onClick={deleteAllArticles} disabled={running || resetting || deleting} loading={deleting} variant="danger" icon={<IconTrash />}>
            {deleting ? "Eliminazione…" : "Elimina tutti gli articoli"}
          </Btn>
        </div>
      </div>

      <p className="text-[10px] text-slate-800 font-mono">{API_BASE}</p>
    </div>
  );
}
