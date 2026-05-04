"use client";

import { useEffect, useState } from "react";
import { AdminStats, PipelineRun, IgStats, IgArticle, getStats, getPipelineHistory, getIgStats } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const SESSION_KEY = "foxscan_admin_key";

interface FeedStat { feed_source: string; count: number; multi_source_count: number; }

const FEED_META: Record<string, { name: string; url: string }> = {
  "www.bleepingcomputer.com":        { name: "BleepingComputer",         url: "https://www.bleepingcomputer.com" },
  "feeds.feedburner.com":            { name: "The Hacker News",           url: "https://thehackernews.com" },
  "krebsonsecurity.com":             { name: "Krebs on Security",         url: "https://krebsonsecurity.com" },
  "www.darkreading.com":             { name: "Dark Reading",              url: "https://www.darkreading.com" },
  "securityaffairs.com":             { name: "Security Affairs",          url: "https://securityaffairs.com" },
  "grahamcluley.com":                { name: "Graham Cluley",             url: "https://grahamcluley.com" },
  "www.securityweek.com":            { name: "SecurityWeek",              url: "https://www.securityweek.com" },
  "www.helpnetsecurity.com":         { name: "Help Net Security",         url: "https://www.helpnetsecurity.com" },
  "www.infosecurity-magazine.com":   { name: "Infosecurity Magazine",     url: "https://www.infosecurity-magazine.com" },
  "www.wired.com":                   { name: "Wired Security",            url: "https://www.wired.com/category/security/" },
  "cyberscoop.com":                  { name: "CyberScoop",                url: "https://cyberscoop.com" },
  "www.theregister.com":             { name: "The Register Security",     url: "https://www.theregister.com/security/" },
  "techcrunch.com":                  { name: "TechCrunch Security",       url: "https://techcrunch.com/tag/security/" },
  "www.malwarebytes.com":            { name: "Malwarebytes Blog",         url: "https://www.malwarebytes.com/blog/" },
  "www.recordedfuture.com":          { name: "Recorded Future",           url: "https://www.recordedfuture.com" },
  "unit42.paloaltonetworks.com":     { name: "Unit 42 (Palo Alto)",       url: "https://unit42.paloaltonetworks.com" },
  "www.microsoft.com":               { name: "Microsoft Security Blog",   url: "https://www.microsoft.com/en-us/security/blog/" },
  "www.schneier.com":                { name: "Schneier on Security",      url: "https://www.schneier.com" },
  // Fonti italiane
  "www.redhotcyber.com":             { name: "Red Hot Cyber",              url: "https://www.redhotcyber.com" },
  "www.cybersecurity360.it":         { name: "Cybersecurity360",           url: "https://www.cybersecurity360.it" },
  "cert-agid.gov.it":                { name: "CERT-AgID",                  url: "https://cert-agid.gov.it" },
  "www.agendadigitale.eu":           { name: "Agenda Digitale",            url: "https://www.agendadigitale.eu" },
  "www.punto-informatico.it":        { name: "Punto Informatico",          url: "https://www.punto-informatico.it" },
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="border border-blue-100 dark:border-zinc-800 rounded-xl p-4 bg-white dark:bg-zinc-900">
      <p className="text-xs text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-[#0B1F3A] dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function MultiSourceGauge({ label, pct, count, total }: { label: string; pct: number; count: number; total: number }) {
  const color = pct >= 60 ? "text-green-500" : pct >= 30 ? "text-amber-400" : "text-red-500";
  const barColor = pct >= 60 ? "bg-green-500" : pct >= 30 ? "bg-amber-400" : "bg-red-500";

  return (
    <div className="border border-blue-100 dark:border-zinc-800 rounded-xl p-5 bg-white dark:bg-zinc-900">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-0.5">
            {label}
          </p>
          <p className="text-xs text-gray-400 dark:text-zinc-600">
            {count} su {total} articoli hanno più di una fonte
          </p>
        </div>
        <span className={`text-3xl font-bold tabular-nums ${color}`}>{pct}%</span>
      </div>
      <div className="h-2 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] text-gray-400 dark:text-zinc-600">
        {pct >= 60
          ? "Il sistema sta funzionando bene · le notizie vengono coperte da più fonti."
          : pct >= 30
          ? "Copertura media · alcune notizie hanno una sola fonte."
          : total === 0
          ? "Nessun articolo nelle ultime 24h."
          : "Copertura bassa · la maggior parte degli articoli ha una sola fonte."}
      </p>
    </div>
  );
}


export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [authError, setAuthError] = useState(false);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [feedStats, setFeedStats] = useState<FeedStat[]>([]);
  const [pipelineHistory, setPipelineHistory] = useState<PipelineRun[]>([]);
  const [igStats, setIgStats] = useState<IgStats | null>(null);
  const [igRunning, setIgRunning] = useState(false);
  const [igMessage, setIgMessage] = useState<string | null>(null);
  const [, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [closingRuns, setClosingRuns] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) { setAdminKey(saved); setUnlocked(true); }
  }, []);

  async function loadStats(key: string) {
    setLoading(true);
    const [s, fs, ph, ig] = await Promise.all([
      getStats(key).catch(() => null),
      fetch(`${API_BASE}/admin/feed-stats`, { headers: { "X-Admin-Key": key } })
        .then((r) => r.ok ? r.json() : [])
        .catch(() => []),
      getPipelineHistory(key).catch(() => []),
      getIgStats(key).catch(() => null),
    ]);
    setStats(s);
    setFeedStats(fs);
    setPipelineHistory(ph);
    setIgStats(ig);
    const igStatus = await fetch(`${API_BASE}/admin/ig-pipeline-status`, { headers: { "X-Admin-Key": key } })
      .then(r => r.ok ? r.json() : null).catch(() => null);
    setIgRunning(igStatus?.running ?? false);
    setPipelineRunning(s?.pipeline_running ?? false);
    setLoading(false);
  }

  useEffect(() => {
    if (!unlocked || !adminKey) return;
    loadStats(adminKey);
    const interval = setInterval(() => loadStats(adminKey), 15000);
    return () => clearInterval(interval);
  }, [unlocked, adminKey]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(false);
    try {
      const res = await fetch(`${API_BASE}/admin/stats`, { headers: { "X-Admin-Key": keyInput } });
      if (res.status === 401) { setAuthError(true); return; }
      sessionStorage.setItem(SESSION_KEY, keyInput);
      setAdminKey(keyInput);
      setUnlocked(true);
    } catch { setAuthError(true); }
  }

  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY);
    setAdminKey(""); setKeyInput(""); setUnlocked(false); setStats(null);
  }

  function adminFetch(path: string, options: RequestInit = {}) {
    return fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { ...(options.headers ?? {}), "X-Admin-Key": adminKey },
    });
  }

  async function triggerIgPipeline() {
    setIgRunning(true); setIgMessage(null);
    try {
      const res = await adminFetch("/admin/run-ig-pipeline", { method: "POST" });
      const data = await res.json();
      if (data.status === "already_running") {
        setIgMessage("Pipeline IG già in esecuzione.");
      } else if (data.status === "started") {
        setIgMessage("Post avviato · la pagina si aggiorna ogni 15s.");
      } else {
        setIgMessage(`Errore: ${JSON.stringify(data)}`);
        setIgRunning(false);
      }
    } catch { setIgMessage("Errore nell'avvio della pipeline IG."); setIgRunning(false); }
  }

  async function closeStaleRuns() {
    setClosingRuns(true); setMessage(null);
    try {
      const res = await adminFetch("/admin/close-stale-runs", { method: "POST" });
      const data = await res.json();
      setMessage(`Chiuse ${data.closed} run bloccate.`);
      await loadStats(adminKey);
    } catch { setMessage("Errore nella chiusura delle run."); }
    finally { setClosingRuns(false); }
  }

  async function resetItems() {
    setResetting(true); setMessage(null);
    try {
      const res = await adminFetch("/admin/reset-items", { method: "POST" });
      const data = await res.json();
      setMessage(`Reset completato · ${data.items_reset} item rimarcati. Ora avvia la pipeline.`);
      await loadStats(adminKey);
    } catch { setMessage("Errore nel reset."); }
    finally { setResetting(false); }
  }

  async function deleteAllArticles() {
    if (!window.confirm("⚠️ Eliminare TUTTI gli articoli? Azione irreversibile.")) return;
    setDeleting(true); setMessage(null);
    try {
      const res = await adminFetch("/admin/delete-all-articles", { method: "DELETE" });
      const data = await res.json();
      setMessage(`Eliminati ${data.articles_deleted} articoli e ${data.sources_deleted} sorgenti.`);
      await loadStats(adminKey);
    } catch { setMessage("Errore durante l'eliminazione."); }
    finally { setDeleting(false); }
  }

  async function triggerPipeline() {
    setRunning(true); setMessage(null);
    try {
      const res = await adminFetch("/admin/run-pipeline", { method: "POST" });
      const data = await res.json();
      if (data.status === "already_running") {
        setMessage("Pipeline già in esecuzione.");
        await loadStats(adminKey);
      } else {
        setMessage("Pipeline avviata · la pagina si aggiorna ogni 15s.");
        setPipelineRunning(true);
      }
    } catch { setMessage("Errore nell'avvio della pipeline."); }
    finally { setRunning(false); }
  }

  if (!unlocked) {
    return (
      <div className="max-w-sm mx-auto mt-16">
        <h1 className="text-2xl font-bold text-[#0B1F3A] dark:text-slate-100 mb-6">Pannello Admin</h1>
        <form onSubmit={handleLogin} className="border border-blue-100 dark:border-zinc-800 rounded-xl p-6 bg-white dark:bg-zinc-900 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Chiave admin</label>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-[#0B1F3A] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              autoFocus
            />
          </div>
          {authError && <p className="text-sm text-red-600 dark:text-red-400">Chiave non valida.</p>}
          <button
            type="submit"
            disabled={!keyInput}
            className="w-full px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-200 dark:disabled:bg-zinc-700 disabled:text-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            Accedi
          </button>
        </form>
      </div>
    );
  }

  const utc = (s: string) => new Date(s.endsWith("Z") ? s : s + "Z");

  const lastAt = stats?.last_article_at
    ? utc(stats.last_article_at).toLocaleString("it-IT")
    : "·";

  const sortBy = (list: IgArticle[]) =>
    [...list].sort((a, b) => {
      const igDiff = (b.ig_score ?? 0) - (a.ig_score ?? 0);
      if (igDiff !== 0) return igDiff;
      if (b.relevance_score !== a.relevance_score) return b.relevance_score - a.relevance_score;
      return utc(b.published_at).getTime() - utc(a.published_at).getTime();
    });

  const hasCritical = (igStats?.pending.length ?? 0) > 0;
  const sortedPending = sortBy(hasCritical ? (igStats?.pending ?? []) : (igStats?.pending_fallback ?? []));
  const isFallback = !hasCritical && sortedPending.length > 0;
  const nextArticle = sortedPending[0] ?? null;
  const queueRest = sortedPending.slice(1);

  return (
    <div className="max-w-4xl space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1F3A] dark:text-slate-100">Dashboard</h1>
          {stats && (
            <p className="text-xs text-gray-400 dark:text-zinc-600 mt-0.5">
              Aggiornamento automatico ogni 15s · Server: {utc(stats.server_time).toLocaleTimeString("it-IT")}
            </p>
          )}
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors">
          Esci
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Articoli totali" value={stats?.total_articles ?? "·"} />
        <StatCard label="Articoli ultime 24h" value={stats?.articles_last_24h ?? "·"} />
        <StatCard label="Item RSS in coda" value={stats?.rss_items_pending ?? "·"} />
        <StatCard label="Ultimo articolo" value={lastAt} />
      </div>

      {/* Multi-source gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <MultiSourceGauge
          label="Copertura multi-fonte · 24h"
          pct={stats?.multi_source_pct_24h ?? 0}
          count={stats?.multi_source_last_24h ?? 0}
          total={stats?.articles_last_24h ?? 0}
        />
        <MultiSourceGauge
          label="Copertura multi-fonte · 48h"
          pct={stats?.multi_source_pct_48h ?? 0}
          count={stats?.multi_source_last_48h ?? 0}
          total={stats?.articles_last_48h ?? 0}
        />
      </div>

      {/* Pipeline */}
      <div className="border border-blue-100 dark:border-zinc-800 rounded-xl p-5 bg-white dark:bg-zinc-900">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-[#0B1F3A] dark:text-white">Pipeline</h2>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
            pipelineRunning
              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
              : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
          }`}>
            {pipelineRunning ? "In esecuzione" : "Idle"}
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">
          Discovery + clustering + sintesi. Gira automaticamente ogni 30 minuti.
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={triggerPipeline}
            disabled={running || pipelineRunning}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-200 dark:disabled:bg-zinc-700 disabled:text-gray-400 dark:disabled:text-zinc-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {pipelineRunning ? "⏳ In esecuzione…" : running ? "Avvio…" : "Avvia ora"}
          </button>
          <button
            onClick={resetItems}
            disabled={running || resetting || deleting || closingRuns}
            className="px-4 py-2 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 disabled:opacity-50 text-gray-700 dark:text-zinc-300 text-sm font-medium rounded-lg transition-colors"
          >
            {resetting ? "Reset…" : "Reset item processati"}
          </button>
          <button
            onClick={closeStaleRuns}
            disabled={running || resetting || deleting || closingRuns}
            className="px-4 py-2 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 disabled:opacity-50 text-gray-700 dark:text-zinc-300 text-sm font-medium rounded-lg transition-colors"
          >
            {closingRuns ? "Chiusura…" : "Chiudi run bloccate"}
          </button>
        </div>
        {message && (
          <p className="mt-3 text-sm text-gray-700 dark:text-zinc-300 border border-blue-100 dark:border-zinc-700 rounded-lg p-3 bg-blue-50 dark:bg-zinc-800">
            {message}
          </p>
        )}
      </div>

      {/* Fonti RSS */}
      <div className="border border-blue-100 dark:border-zinc-800 rounded-xl p-5 bg-white dark:bg-zinc-900">
        <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
          <h2 className="text-base font-semibold text-[#0B1F3A] dark:text-white">
            Fonti RSS <span className="text-sm font-normal text-gray-400 dark:text-zinc-500">({Object.keys(FEED_META).length})</span>
          </h2>
          <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-zinc-500">
            <span className="flex items-center gap-1">
              <span className="bg-blue-50 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full font-mono">N item</span>
              item RSS scoperti
            </span>
            <span className="flex items-center gap-1">
              <span className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full font-mono">N ×</span>
              articoli con &gt;1 fonte
            </span>
          </div>
        </div>
        <div className="divide-y divide-blue-50 dark:divide-zinc-800">
          {Object.entries(FEED_META)
            .map(([domain, meta]) => {
              const stat = feedStats.find((f) => f.feed_source === domain);
              return {
                domain, meta,
                count: stat?.count ?? null,
                multiCount: stat?.multi_source_count ?? null,
              };
            })
            .sort((a, b) => (b.count ?? -1) - (a.count ?? -1))
            .map(({ domain, meta, count, multiCount }) => (
              <div key={domain} className="flex items-center justify-between py-2.5 gap-3">
                <div className="min-w-0">
                  <a
                    href={meta.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-[#0B1F3A] dark:text-slate-200 hover:text-blue-600 dark:hover:text-[#00FFE5] transition-colors"
                  >
                    {meta.name}
                  </a>
                  <p className="text-xs text-gray-400 dark:text-zinc-600">{domain}</p>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  <span className="text-xs font-mono text-gray-400 dark:text-zinc-500 bg-blue-50 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                    {count !== null ? `${count} item` : "·"}
                  </span>
                  <span
                    title="Articoli con più di una fonte"
                    className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                      multiCount
                        ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
                        : "text-gray-300 dark:text-zinc-700 bg-gray-50 dark:bg-zinc-800/50"
                    }`}
                  >
                    {multiCount !== null ? `${multiCount} ×` : "·"}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Storico pipeline */}
      <div className="border border-blue-100 dark:border-zinc-800 rounded-xl p-5 bg-white dark:bg-zinc-900">
        <h2 className="text-base font-semibold text-[#0B1F3A] dark:text-white mb-4">
          Storico pipeline <span className="text-sm font-normal text-gray-400 dark:text-zinc-500">(ultime 30)</span>
        </h2>
        {pipelineHistory.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-zinc-600">Nessuna esecuzione registrata.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-400 dark:text-zinc-500 border-b border-blue-50 dark:border-zinc-800">
                  <th className="pb-2 pr-4 font-medium">Avvio</th>
                  <th className="pb-2 pr-4 font-medium">Durata</th>
                  <th className="pb-2 pr-4 font-medium">Trovati</th>
                  <th className="pb-2 pr-4 font-medium">Creati</th>
                  <th className="pb-2 pr-4 font-medium">Aggiornati</th>
                  <th className="pb-2 pr-4 font-medium">Saltati</th>
                  <th className="pb-2 font-medium">Errori</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50 dark:divide-zinc-800">
                {pipelineHistory.map((run) => (
                  <tr key={run.id} className="text-gray-600 dark:text-zinc-400">
                    <td className="py-2 pr-4 font-mono whitespace-nowrap">
                      {utc(run.started_at).toLocaleString("it-IT")}
                    </td>
                    <td className="py-2 pr-4 font-mono">
                      {run.duration_s != null ? `${run.duration_s}s` : run.completed_at ? "·" : <span className="text-amber-500">in corso</span>}
                    </td>
                    <td className="py-2 pr-4">{run.discovered}</td>
                    <td className="py-2 pr-4 text-green-600 dark:text-green-400 font-medium">{run.created}</td>
                    <td className="py-2 pr-4 text-blue-600 dark:text-blue-400">{run.updated}</td>
                    <td className="py-2 pr-4 text-gray-400 dark:text-zinc-600">{run.skipped}</td>
                    <td className={`py-2 font-medium ${run.errors > 0 ? "text-red-500" : "text-gray-400 dark:text-zinc-600"}`}>
                      {run.errors}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Instagram */}
      <div className="border border-blue-100 dark:border-zinc-800 rounded-xl p-5 bg-white dark:bg-zinc-900 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#0B1F3A] dark:text-white">Instagram</h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">Slot automatici: 09:00 · 12:30 · 21:00</p>
          </div>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
            igRunning
              ? "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
          }`}>
            {igRunning ? "In esecuzione" : "Idle"}
          </span>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Postati oggi" value={igStats?.posted_today ?? "·"} />
          <StatCard
            label="In coda"
            value={sortedPending.length}
            sub={isFallback ? "fallback medi (5–7)" : "score ≥ 8, entro 36h"}
          />
          <StatCard label="Scaduti" value={igStats?.too_old.length ?? "·"} sub="fuori finestra 36h" />
        </div>

        {/* Prossimo post */}
        {nextArticle ? (
          <div className={`rounded-lg border p-4 ${isFallback ? "border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20" : "border-pink-200 dark:border-pink-900/40 bg-pink-50/40 dark:bg-pink-950/20"}`}>
            <div className="flex items-center gap-2 mb-2">
              <p className={`text-[10px] font-semibold uppercase tracking-widest ${isFallback ? "text-amber-500 dark:text-amber-400" : "text-pink-500 dark:text-pink-400"}`}>
                Prossimo post
              </p>
              {isFallback && (
                <span className="text-[9px] font-semibold uppercase tracking-wide bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                  fallback medio
                </span>
              )}
            </div>
            <a
              href={`/article/${nextArticle.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-[#0B1F3A] dark:text-white hover:text-pink-600 dark:hover:text-pink-400 transition-colors line-clamp-2 block"
            >
              {nextArticle.title}
            </a>
            <div className="flex items-center gap-3 mt-2.5 flex-wrap">
              <span className="text-xs font-mono text-amber-600 dark:text-amber-400 font-bold">▲ {nextArticle.relevance_score}</span>
              {nextArticle.ig_score != null && (
                <span className="text-xs font-mono text-pink-600 dark:text-pink-400 font-bold">📸 {nextArticle.ig_score}</span>
              )}
              <span className="text-xs text-gray-400 dark:text-zinc-500">#{nextArticle.id}</span>
              <span className="text-xs text-gray-400 dark:text-zinc-500">
                {utc(nextArticle.published_at).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ) : igStats && (
          <p className="text-sm text-gray-400 dark:text-zinc-500 italic">Nessun articolo idoneo (score ≥ 5) nelle ultime 36h.</p>
        )}

        {/* Trigger manuale */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={triggerIgPipeline}
            disabled={igRunning}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-500 disabled:bg-gray-200 dark:disabled:bg-zinc-700 disabled:text-gray-400 dark:disabled:text-zinc-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {igRunning ? "⏳ Post in corso…" : "📸 Posta ora"}
          </button>
          {igMessage && (
            <p className="text-sm text-gray-700 dark:text-zinc-300 border border-blue-100 dark:border-zinc-700 rounded-lg px-3 py-2 bg-blue-50 dark:bg-zinc-800">
              {igMessage}
            </p>
          )}
        </div>

        {/* Coda rimanente */}
        {queueRest.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
              Coda — {queueRest.length} {queueRest.length === 1 ? "articolo" : "articoli"} successivi
            </p>
            <div className="divide-y divide-blue-50 dark:divide-zinc-800">
              {queueRest.map((a, i) => (
                <div key={a.id} className="flex items-center gap-3 py-2">
                  <span className="text-xs font-mono text-gray-300 dark:text-zinc-600 w-4 shrink-0 text-right">{i + 2}</span>
                  <a
                    href={`/article/${a.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#0B1F3A] dark:text-slate-200 hover:text-blue-600 dark:hover:text-[#00FFE5] transition-colors truncate min-w-0"
                  >
                    {a.title}
                  </a>
                  <div className="shrink-0 flex items-center gap-2 ml-auto">
                    <span className="text-xs font-mono text-amber-500 dark:text-amber-400">▲ {a.relevance_score}</span>
                    {a.ig_score != null && (
                      <span className="text-xs font-mono text-pink-500 dark:text-pink-400">📸 {a.ig_score}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scaduti */}
        {(igStats?.too_old.length ?? 0) > 0 && (
          <div>
            <p className="text-xs font-medium text-amber-500 dark:text-amber-400 uppercase tracking-wide mb-2">
              Scaduti — finestra 36h superata
            </p>
            <div className="divide-y divide-blue-50 dark:divide-zinc-800">
              {igStats!.too_old.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 gap-3">
                  <a
                    href={`/article/${a.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-400 dark:text-zinc-500 hover:text-amber-500 transition-colors truncate min-w-0 line-through"
                  >
                    {a.title}
                  </a>
                  <span className="text-xs font-mono text-gray-300 dark:text-zinc-600 shrink-0">▲ {a.relevance_score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Postati recenti */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-2">Ultimi 6 post pubblicati</p>
          {(igStats?.recent_posted.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-400 dark:text-zinc-600 italic">Nessun articolo ancora pubblicato su Instagram.</p>
          ) : (
            <div className="divide-y divide-blue-50 dark:divide-zinc-800">
              {igStats!.recent_posted.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 gap-3">
                  <a
                    href={`/article/${a.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#0B1F3A] dark:text-slate-300 hover:text-blue-600 dark:hover:text-[#00FFE5] transition-colors truncate min-w-0"
                  >
                    {a.title}
                  </a>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-xs text-gray-400 dark:text-zinc-500 whitespace-nowrap">
                      {utc(a.published_at).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium">
                      ✓ postato
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Zona pericolosa */}
      <div className="border border-red-200 dark:border-red-900/50 rounded-xl p-5 bg-red-50/50 dark:bg-red-950/20">
        <h2 className="text-base font-semibold text-red-600 dark:text-red-400 mb-1">Zona pericolosa</h2>
        <p className="text-sm text-gray-500 dark:text-zinc-500 mb-4">Azioni irreversibili.</p>
        <button
          onClick={deleteAllArticles}
          disabled={running || resetting || deleting}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-200 dark:disabled:bg-zinc-800 disabled:text-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {deleting ? "Eliminazione…" : "🗑️ Elimina tutti gli articoli"}
        </button>
      </div>

      <p className="text-xs text-gray-400 dark:text-zinc-600">Backend: {API_BASE}</p>
    </div>
  );
}
