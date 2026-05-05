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
  "arstechnica.com":                 { name: "Ars Technica Security",     url: "https://arstechnica.com/security/" },
  "hackread.com":                    { name: "Hackread",                   url: "https://hackread.com" },
  "gbhackers.com":                   { name: "GBHackers",                  url: "https://gbhackers.com" },
  "thecyberexpress.com":             { name: "The Cyber Express",          url: "https://thecyberexpress.com" },
  "cybernews.com":                   { name: "Cybernews",                  url: "https://cybernews.com" },
  "www.redhotcyber.com":             { name: "Red Hot Cyber",              url: "https://www.redhotcyber.com" },
  "www.cybersecurity360.it":         { name: "Cybersecurity360",           url: "https://www.cybersecurity360.it" },
  "cert-agid.gov.it":                { name: "CERT-AgID",                  url: "https://cert-agid.gov.it" },
  "www.agendadigitale.eu":           { name: "Agenda Digitale",            url: "https://www.agendadigitale.eu" },
  "www.punto-informatico.it":        { name: "Punto Informatico",          url: "https://www.punto-informatico.it" },
};

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function IconShield({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}

function IconPlay({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
    </svg>
  );
}

function IconRefresh({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function IconX({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function IconTrash({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

function IconCamera({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
    </svg>
  );
}

function IconCheck({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function IconClock({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function IconArrowUp({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
    </svg>
  );
}

function IconLogout({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
    </svg>
  );
}

function IconLink({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  );
}

function IconLock({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

function IconSpinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "orange" | "green" | "blue" | "red";
}) {
  const dotColor =
    accent === "orange" ? "bg-orange-500" :
    accent === "green"  ? "bg-emerald-500" :
    accent === "blue"   ? "bg-sky-500" :
    accent === "red"    ? "bg-red-500" :
    "bg-slate-600";

  return (
    <div className="relative rounded-xl border border-white/5 bg-white/[0.03] p-4 overflow-hidden">
      <div className={`absolute top-0 left-0 h-0.5 w-full ${dotColor} opacity-60`} />
      <p className="text-[11px] font-medium uppercase tracking-widest text-slate-500 mb-2">{label}</p>
      <p className="text-2xl font-bold text-slate-100 tabular-nums leading-none">
        {value === null || value === undefined || value === "·" ? (
          <span className="inline-block h-7 w-16 animate-pulse rounded bg-white/5" />
        ) : value}
      </p>
      {sub && <p className="mt-1.5 text-[11px] text-slate-600">{sub}</p>}
    </div>
  );
}

// ── Multi-source gauge ─────────────────────────────────────────────────────────

function MultiSourceGauge({
  label,
  pct,
  count,
  total,
}: {
  label: string;
  pct: number;
  count: number;
  total: number;
}) {
  const tier =
    pct >= 60 ? "green" :
    pct >= 30 ? "amber" :
    "red";

  const barClass   = tier === "green" ? "bg-emerald-500" : tier === "amber" ? "bg-amber-400" : "bg-red-500";
  const valueClass = tier === "green" ? "text-emerald-400" : tier === "amber" ? "text-amber-400" : "text-red-400";
  const msg =
    total === 0       ? "Nessun articolo nel periodo." :
    pct >= 60         ? "Copertura ottima — fonti multiple attive." :
    pct >= 30         ? "Copertura media — alcune notizie singola fonte." :
    "Copertura bassa — la maggior parte ha una sola fonte.";

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-slate-500 mb-1">{label}</p>
          <p className="text-xs text-slate-600">{count} su {total} articoli con più fonti</p>
        </div>
        <span className={`text-3xl font-bold tabular-nums ${valueClass}`}>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2.5 text-[11px] text-slate-600">{msg}</p>
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/5 bg-white/[0.03] p-5 ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({
  title,
  sub,
  badge,
  badgeColor,
}: {
  title: string;
  sub?: string;
  badge?: string;
  badgeColor?: "green" | "amber" | "pink" | "slate";
}) {
  const bc =
    badgeColor === "green"  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
    badgeColor === "amber"  ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
    badgeColor === "pink"   ? "bg-pink-500/10 text-pink-400 border-pink-500/20" :
    "bg-slate-500/10 text-slate-400 border-slate-500/20";

  return (
    <div className="flex items-start justify-between mb-4 gap-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
        {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
      </div>
      {badge && (
        <span className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full border ${bc}`}>
          {badge}
        </span>
      )}
    </div>
  );
}

// ── Action button ──────────────────────────────────────────────────────────────

function ActionButton({
  onClick,
  disabled,
  loading,
  variant = "default",
  icon,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "default" | "danger" | "pink";
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const base = "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer select-none active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100";
  const variants = {
    primary: "bg-orange-500 hover:bg-orange-400 text-white",
    pink:    "bg-pink-600 hover:bg-pink-500 text-white",
    default: "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-slate-100",
    danger:  "bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]}`}
    >
      {loading ? <IconSpinner /> : icon}
      {children}
    </button>
  );
}

// ── Toast message ──────────────────────────────────────────────────────────────

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-slate-800/80 backdrop-blur-sm px-4 py-3 text-sm text-slate-300">
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
        <IconX className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

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
    setAuthLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/stats`, { headers: { "X-Admin-Key": keyInput } });
      if (res.status === 401) { setAuthError(true); setAuthLoading(false); return; }
      sessionStorage.setItem(SESSION_KEY, keyInput);
      setAdminKey(keyInput);
      setUnlocked(true);
    } catch { setAuthError(true); }
    setAuthLoading(false);
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
        setIgMessage("Post avviato — aggiornamento automatico ogni 15s.");
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
      setMessage(`Reset completato — ${data.items_reset} item rimarcati. Avvia la pipeline per processarli.`);
      await loadStats(adminKey);
    } catch { setMessage("Errore nel reset."); }
    finally { setResetting(false); }
  }

  async function deleteAllArticles() {
    if (!window.confirm("Eliminare TUTTI gli articoli? Azione irreversibile.")) return;
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
        setMessage("Pipeline avviata — aggiornamento automatico ogni 15s.");
        setPipelineRunning(true);
      }
    } catch { setMessage("Errore nell'avvio della pipeline."); }
    finally { setRunning(false); }
  }

  // ── Login screen ─────────────────────────────────────────────────────────────

  if (!unlocked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 mb-4">
              <IconLock className="w-5 h-5 text-orange-400" />
            </div>
            <h1 className="text-xl font-semibold text-slate-100">Pannello Admin</h1>
            <p className="text-sm text-slate-600 mt-1">Accesso riservato</p>
          </div>

          <form onSubmit={handleLogin} className="rounded-xl border border-white/5 bg-white/[0.03] p-6 space-y-4">
            <div>
              <label htmlFor="admin-key" className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                Chiave admin
              </label>
              <input
                id="admin-key"
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50 transition-colors"
                placeholder="••••••••••••"
                autoFocus
                autoComplete="current-password"
              />
            </div>

            {authError && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-2.5">
                <IconX className="w-3.5 h-3.5 shrink-0" />
                Chiave non valida
              </div>
            )}

            <button
              type="submit"
              disabled={!keyInput || authLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-all duration-150 active:scale-95 cursor-pointer"
            >
              {authLoading ? <IconSpinner /> : <IconShield className="w-4 h-4" />}
              {authLoading ? "Verifica…" : "Accedi"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const utc = (s: string) => new Date(s.endsWith("Z") ? s : s + "Z");

  const lastAt = stats?.last_article_at
    ? utc(stats.last_article_at).toLocaleString("it-IT")
    : "—";

  const sortBy = (list: IgArticle[]) =>
    [...list].sort((a, b) => {
      const igDiff = (b.ig_score ?? 0) - (a.ig_score ?? 0);
      if (igDiff !== 0) return igDiff;
      if (b.relevance_score !== a.relevance_score) return b.relevance_score - a.relevance_score;
      return utc(b.published_at).getTime() - utc(a.published_at).getTime();
    });

  const hasCritical   = (igStats?.pending.length ?? 0) > 0;
  const sortedPending = sortBy(hasCritical ? (igStats?.pending ?? []) : (igStats?.pending_fallback ?? []));
  const isFallback    = !hasCritical && sortedPending.length > 0;
  const nextArticle   = sortedPending[0] ?? null;
  const queueRest     = sortedPending.slice(1);

  // ── Dashboard ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl space-y-5 pb-12">

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Dashboard</h1>
          {stats ? (
            <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Aggiornamento ogni 15s · {utc(stats.server_time).toLocaleTimeString("it-IT")}
            </p>
          ) : (
            <p className="text-xs text-slate-700 mt-0.5">Connessione in corso…</p>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 text-xs text-slate-600 hover:text-slate-300 transition-colors cursor-pointer px-2 py-1.5 rounded-lg hover:bg-white/5"
          aria-label="Esci dal pannello admin"
        >
          <IconLogout className="w-3.5 h-3.5" />
          Esci
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Articoli totali"    value={stats?.total_articles ?? "·"}      accent="orange" />
        <StatCard label="Ultime 24h"         value={stats?.articles_last_24h ?? "·"}   accent="green" />
        <StatCard label="Item RSS in coda"   value={stats?.rss_items_pending ?? "·"}   accent="blue" />
        <StatCard label="Ultimo articolo"    value={lastAt} />
      </div>

      {/* Multi-source coverage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <MultiSourceGauge
          label="Multi-fonte · 24h"
          pct={stats?.multi_source_pct_24h ?? 0}
          count={stats?.multi_source_last_24h ?? 0}
          total={stats?.articles_last_24h ?? 0}
        />
        <MultiSourceGauge
          label="Multi-fonte · 48h"
          pct={stats?.multi_source_pct_48h ?? 0}
          count={stats?.multi_source_last_48h ?? 0}
          total={stats?.articles_last_48h ?? 0}
        />
      </div>

      {/* Pipeline */}
      <Section>
        <SectionHeader
          title="Pipeline"
          sub="Discovery + clustering + sintesi — automatica ogni 30 minuti"
          badge={pipelineRunning ? "In esecuzione" : "Idle"}
          badgeColor={pipelineRunning ? "amber" : "green"}
        />
        <div className="flex flex-wrap gap-2">
          <ActionButton
            onClick={triggerPipeline}
            disabled={running || pipelineRunning}
            loading={running || pipelineRunning}
            variant="primary"
            icon={<IconPlay />}
          >
            {pipelineRunning ? "In esecuzione…" : "Avvia ora"}
          </ActionButton>
          <ActionButton
            onClick={resetItems}
            disabled={running || resetting || deleting || closingRuns}
            loading={resetting}
            icon={<IconRefresh />}
          >
            {resetting ? "Reset…" : "Reset item processati"}
          </ActionButton>
          <ActionButton
            onClick={closeStaleRuns}
            disabled={running || resetting || deleting || closingRuns}
            loading={closingRuns}
            icon={<IconClock />}
          >
            {closingRuns ? "Chiusura…" : "Chiudi run bloccate"}
          </ActionButton>
        </div>
        {message && (
          <div className="mt-3">
            <Toast message={message} onClose={() => setMessage(null)} />
          </div>
        )}
      </Section>

      {/* Fonti RSS */}
      <Section>
        <SectionHeader
          title={`Fonti RSS`}
          sub={`${Object.keys(FEED_META).length} feed monitorati`}
        />
        <div className="flex items-center gap-4 mb-3 text-[11px] text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-slate-700" />
            item scoperti
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-700" />
            articoli multi-fonte
          </span>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {Object.entries(FEED_META)
            .map(([domain, meta]) => {
              const stat = feedStats.find((f) => f.feed_source === domain);
              return { domain, meta, count: stat?.count ?? null, multiCount: stat?.multi_source_count ?? null };
            })
            .sort((a, b) => (b.count ?? -1) - (a.count ?? -1))
            .map(({ domain, meta, count, multiCount }) => (
              <div key={domain} className="flex items-center justify-between py-2.5 gap-3">
                <div className="min-w-0">
                  <a
                    href={meta.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-slate-300 hover:text-orange-400 transition-colors cursor-pointer"
                  >
                    {meta.name}
                    <IconLink className="opacity-40" />
                  </a>
                  <p className="text-[11px] text-slate-700">{domain}</p>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  <span className="text-[11px] font-mono text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded-md">
                    {count !== null ? `${count}` : "·"}
                  </span>
                  {(multiCount !== null && multiCount > 0) ? (
                    <span className="text-[11px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      {multiCount}×
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono text-slate-700 bg-white/[0.02] px-2 py-0.5 rounded-md">
                      —
                    </span>
                  )}
                </div>
              </div>
            ))}
        </div>
      </Section>

      {/* Storico pipeline */}
      <Section>
        <SectionHeader title="Storico pipeline" sub="Ultime 30 esecuzioni" />
        {pipelineHistory.length === 0 ? (
          <p className="text-sm text-slate-600 italic">Nessuna esecuzione registrata.</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs min-w-[520px]">
              <thead>
                <tr className="text-left border-b border-white/[0.06]">
                  {["Avvio", "Durata", "Trovati", "Creati", "Aggiornati", "Saltati", "Errori"].map(h => (
                    <th key={h} className="pb-2.5 pr-4 font-medium text-[11px] uppercase tracking-wider text-slate-600 last:pr-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {pipelineHistory.map((run) => (
                  <tr key={run.id} className="text-slate-400 hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 pr-4 font-mono text-slate-400 whitespace-nowrap">
                      {utc(run.started_at).toLocaleString("it-IT")}
                    </td>
                    <td className="py-2.5 pr-4 font-mono">
                      {run.duration_s != null
                        ? `${run.duration_s}s`
                        : run.completed_at
                        ? "·"
                        : <span className="text-amber-400 flex items-center gap-1"><IconSpinner className="w-3 h-3" />in corso</span>}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-400">{run.discovered}</td>
                    <td className="py-2.5 pr-4 font-medium text-emerald-400">{run.created}</td>
                    <td className="py-2.5 pr-4 text-sky-400">{run.updated}</td>
                    <td className="py-2.5 pr-4 text-slate-600">{run.skipped}</td>
                    <td className={`py-2.5 font-medium ${run.errors > 0 ? "text-red-400" : "text-slate-700"}`}>
                      {run.errors}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Instagram */}
      <Section>
        <SectionHeader
          title="Instagram"
          sub="Slot automatici: 09:00 · 12:30 · 21:00"
          badge={igRunning ? "In esecuzione" : "Idle"}
          badgeColor={igRunning ? "pink" : "slate"}
        />

        {/* IG KPI */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatCard
            label="Postati (36h)"
            value={igStats?.posted_today ?? "·"}
            accent="green"
          />
          <StatCard
            label="In coda"
            value={sortedPending.length}
            sub={isFallback ? "fallback medi (5–7)" : "score ≥ 8, entro 36h"}
            accent={isFallback ? undefined : "orange"}
          />
          <StatCard
            label="Scaduti"
            value={igStats?.too_old.length ?? "·"}
            sub="fuori finestra 36h"
          />
        </div>

        {/* Prossimo post */}
        {nextArticle ? (
          <div className={`rounded-lg border p-4 mb-5 ${
            isFallback
              ? "border-amber-500/20 bg-amber-500/5"
              : "border-pink-500/20 bg-pink-500/5"
          }`}>
            <div className="flex items-center gap-2 mb-2.5">
              <p className={`text-[10px] font-semibold uppercase tracking-widest ${isFallback ? "text-amber-500" : "text-pink-500"}`}>
                Prossimo post
              </p>
              {isFallback && (
                <span className="text-[9px] font-semibold uppercase tracking-wide bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                  fallback medio
                </span>
              )}
            </div>
            <a
              href={`/article/${nextArticle.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-slate-200 hover:text-orange-400 transition-colors line-clamp-2 block cursor-pointer"
            >
              {nextArticle.title}
            </a>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs font-mono text-amber-400 font-semibold">
                <IconArrowUp />
                {nextArticle.relevance_score}
              </span>
              {nextArticle.ig_score != null && (
                <span className="text-xs font-mono text-pink-400 font-semibold">
                  ig {nextArticle.ig_score}
                </span>
              )}
              <span className="text-xs text-slate-600">#{nextArticle.id}</span>
              <span className="text-xs text-slate-600">
                {utc(nextArticle.published_at).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ) : igStats && (
          <p className="text-sm text-slate-600 italic mb-5">Nessun articolo idoneo (score ≥ 5) nelle ultime 36h.</p>
        )}

        {/* Posta ora */}
        <div className="flex items-center gap-3 flex-wrap mb-5">
          <ActionButton
            onClick={triggerIgPipeline}
            disabled={igRunning}
            loading={igRunning}
            variant="pink"
            icon={<IconCamera />}
          >
            {igRunning ? "Post in corso…" : "Posta ora"}
          </ActionButton>
          {igMessage && (
            <Toast message={igMessage} onClose={() => setIgMessage(null)} />
          )}
        </div>

        {/* Coda rimanente */}
        {queueRest.length > 0 && (
          <div className="mb-5">
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-600 mb-2">
              Coda — {queueRest.length} {queueRest.length === 1 ? "articolo" : "articoli"} successivi
            </p>
            <div className="divide-y divide-white/[0.04]">
              {queueRest.map((a, i) => (
                <div key={a.id} className="flex items-center gap-3 py-2.5">
                  <span className="text-xs font-mono text-slate-700 w-4 shrink-0 text-right">{i + 2}</span>
                  <a
                    href={`/article/${a.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-400 hover:text-orange-400 transition-colors truncate min-w-0 cursor-pointer"
                  >
                    {a.title}
                  </a>
                  <div className="shrink-0 flex items-center gap-2 ml-auto">
                    <span className="inline-flex items-center gap-0.5 text-xs font-mono text-amber-500">
                      <IconArrowUp />
                      {a.relevance_score}
                    </span>
                    {a.ig_score != null && (
                      <span className="text-xs font-mono text-pink-500">ig {a.ig_score}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scaduti */}
        {(igStats?.too_old.length ?? 0) > 0 && (
          <div className="mb-5">
            <p className="text-[11px] font-medium uppercase tracking-widest text-amber-600/70 mb-2">
              Scaduti — finestra 36h superata
            </p>
            <div className="divide-y divide-white/[0.04]">
              {igStats!.too_old.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2.5 gap-3">
                  <a
                    href={`/article/${a.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-700 hover:text-amber-500/70 transition-colors truncate min-w-0 line-through cursor-pointer"
                  >
                    {a.title}
                  </a>
                  <span className="inline-flex items-center gap-0.5 text-xs font-mono text-slate-700 shrink-0">
                    <IconArrowUp />
                    {a.relevance_score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ultimi post pubblicati */}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-slate-600 mb-2">
            Ultimi 6 post pubblicati
          </p>
          {(igStats?.recent_posted.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-700 italic">Nessun articolo ancora pubblicato.</p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {igStats!.recent_posted.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2.5 gap-3">
                  <a
                    href={`/article/${a.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-400 hover:text-orange-400 transition-colors truncate min-w-0 cursor-pointer"
                  >
                    {a.title}
                  </a>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-[11px] text-slate-600 whitespace-nowrap">
                      {utc(a.published_at).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <IconCheck className="w-3 h-3" />
                      postato
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* Zona pericolosa */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-5">
        <h2 className="text-sm font-semibold text-red-400 mb-1">Zona pericolosa</h2>
        <p className="text-xs text-slate-600 mb-4">Queste azioni sono irreversibili.</p>
        <ActionButton
          onClick={deleteAllArticles}
          disabled={running || resetting || deleting}
          loading={deleting}
          variant="danger"
          icon={<IconTrash />}
        >
          {deleting ? "Eliminazione…" : "Elimina tutti gli articoli"}
        </ActionButton>
      </div>

      {/* Footer */}
      <p className="text-[11px] text-slate-700 font-mono">{API_BASE}</p>
    </div>
  );
}
