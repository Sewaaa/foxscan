"use client";

import { useEffect, useState } from "react";
import { AdminStats, getStats } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const SESSION_KEY = "foxscan_admin_key";

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState<string>("");
  const [keyInput, setKeyInput] = useState<string>("");
  const [unlocked, setUnlocked] = useState(false);
  const [authError, setAuthError] = useState(false);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);

  // Restore key from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      setAdminKey(saved);
      setUnlocked(true);
    }
  }, []);

  async function loadStats(key: string) {
    setLoading(true);
    const s = await getStats(key).catch(() => null);
    setStats(s);
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
      const res = await fetch(`${API_BASE}/admin/stats`, {
        headers: { "X-Admin-Key": keyInput },
      });
      if (res.status === 401) {
        setAuthError(true);
        return;
      }
      sessionStorage.setItem(SESSION_KEY, keyInput);
      setAdminKey(keyInput);
      setUnlocked(true);
    } catch {
      setAuthError(true);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY);
    setAdminKey("");
    setKeyInput("");
    setUnlocked(false);
    setStats(null);
  }

  function adminFetch(path: string, options: RequestInit = {}) {
    return fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(options.headers ?? {}),
        "X-Admin-Key": adminKey,
      },
    });
  }

  async function resetItems() {
    setResetting(true);
    setMessage(null);
    try {
      const res = await adminFetch("/admin/reset-items", { method: "POST" });
      const data = await res.json();
      setMessage(`Reset completato — ${data.items_reset} item rimarcati come da processare. Ora avvia la pipeline.`);
      await loadStats(adminKey);
    } catch {
      setMessage("Errore nel reset.");
    } finally {
      setResetting(false);
    }
  }

  async function deleteAllArticles() {
    const confirmed = window.confirm(
      "⚠️ Sei sicuro?\n\nVerranno eliminati TUTTI gli articoli dal database. Questa azione è irreversibile."
    );
    if (!confirmed) return;

    setDeleting(true);
    setMessage(null);
    try {
      const res = await adminFetch("/admin/delete-all-articles", { method: "DELETE" });
      const data = await res.json();
      setMessage(`🗑️ Eliminati ${data.articles_deleted} articoli e ${data.sources_deleted} sorgenti.`);
      await loadStats(adminKey);
    } catch {
      setMessage("Errore durante l'eliminazione.");
    } finally {
      setDeleting(false);
    }
  }

  async function triggerPipeline() {
    setRunning(true);
    setMessage(null);
    try {
      const res = await adminFetch("/admin/run-pipeline", { method: "POST" });
      const data = await res.json();
      if (data.status === "already_running") {
        setMessage("Pipeline già in esecuzione. Attendi il completamento.");
      } else {
        setMessage("Pipeline avviata in background. Gli articoli appariranno man mano — la pagina si aggiorna ogni 15s.");
        setPipelineRunning(true);
      }
      await loadStats(adminKey);
    } catch {
      setMessage("Errore nell'avvio della pipeline. Assicurati che il backend sia avviato.");
    } finally {
      setRunning(false);
    }
  }

  if (!unlocked) {
    return (
      <div className="max-w-sm mx-auto mt-16">
        <h1 className="text-2xl font-bold text-[#0B1F3A] dark:text-slate-100 mb-6">Pannello Admin</h1>
        <form onSubmit={handleLogin} className="border border-blue-100 dark:border-zinc-800 rounded-xl p-6 bg-white dark:bg-zinc-900 shadow-blue-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
              Chiave admin
            </label>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-[#0B1F3A] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              autoFocus
            />
          </div>
          {authError && (
            <p className="text-sm text-red-600 dark:text-red-400">Chiave non valida.</p>
          )}
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

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#0B1F3A] dark:text-slate-100">Pannello Admin</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
        >
          Esci
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {[
          { label: "Articoli totali", value: stats?.total_articles ?? "—" },
          { label: "Item RSS da processare", value: stats?.rss_items_pending ?? "—" },
          { label: "Item RSS processati", value: stats?.rss_items_processed ?? "—" },
          {
            label: "Ultimo articolo",
            value: stats?.last_article_at
              ? new Date(stats.last_article_at).toLocaleString("it-IT")
              : "—",
          },
        ].map(({ label, value }) => (
          <div key={label} className="border border-blue-100 dark:border-zinc-800 rounded-xl p-4 bg-white dark:bg-zinc-900 shadow-blue-sm">
            <p className="text-xs text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-xl font-semibold text-[#0B1F3A] dark:text-white">{String(value)}</p>
          </div>
        ))}
      </div>

      {/* Pipeline trigger */}
      <div className="border border-blue-100 dark:border-zinc-800 rounded-xl p-6 bg-white dark:bg-zinc-900 mb-6 shadow-blue-sm">
        <h2 className="text-lg font-semibold text-[#0B1F3A] dark:text-white mb-2">Pipeline manuale</h2>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">
          Esegui subito la pipeline di discovery + clustering + sintesi. Normalmente gira in
          automatico ogni 30 minuti.
        </p>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={triggerPipeline}
            disabled={running || resetting || pipelineRunning}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-200 dark:disabled:bg-zinc-700 disabled:text-gray-400 dark:disabled:text-zinc-500 text-white font-medium rounded-lg transition-colors"
          >
            {pipelineRunning ? "⏳ Pipeline in esecuzione…" : running ? "Avvio…" : "Avvia pipeline ora"}
          </button>
          <button
            onClick={resetItems}
            disabled={running || resetting || deleting}
            className="px-5 py-2.5 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 disabled:opacity-50 text-gray-700 dark:text-zinc-300 font-medium rounded-lg transition-colors"
          >
            {resetting ? "Reset in corso…" : "Reset item processati"}
          </button>
        </div>

        {message && (
          <p className="mt-4 text-sm text-gray-700 dark:text-zinc-300 border border-blue-100 dark:border-zinc-700 rounded-lg p-3 bg-blue-50 dark:bg-zinc-800">
            {message}
          </p>
        )}
      </div>

      {/* Zona pericolosa */}
      <div className="border border-red-200 dark:border-red-900/50 rounded-xl p-6 bg-red-50/50 dark:bg-red-950/20">
        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-1">Zona pericolosa</h2>
        <p className="text-sm text-gray-500 dark:text-zinc-500 mb-4">
          Azioni irreversibili. Procedi con cautela.
        </p>
        <button
          onClick={deleteAllArticles}
          disabled={running || resetting || deleting}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-gray-200 dark:disabled:bg-zinc-800 disabled:text-gray-400 dark:disabled:text-zinc-600 text-white font-medium rounded-lg transition-colors"
        >
          {deleting ? "Eliminazione in corso…" : "🗑️ Elimina tutti gli articoli"}
        </button>
      </div>

      {/* Info */}
      <div className="mt-6 text-xs text-gray-400 dark:text-zinc-600 space-y-1">
        <p>Backend: {API_BASE}</p>
        {stats && <p>Server time: {new Date(stats.server_time).toLocaleString("it-IT")}</p>}
        <p>La pagina si aggiorna automaticamente ogni 15 secondi.</p>
      </div>
    </div>
  );
}
