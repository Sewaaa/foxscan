"use client";

import { useEffect, useState } from "react";
import { AdminStats, getStats } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadStats() {
    setLoading(true);
    const s = await getStats().catch(() => null);
    setStats(s);
    setLoading(false);
  }

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 15000);
    return () => clearInterval(interval);
  }, []);

  async function triggerPipeline() {
    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/admin/run-pipeline`, { method: "POST" });
      const data = await res.json();
      setMessage(
        `Pipeline completata — ${data.stats.articles_created} articoli creati, ${data.stats.discovered} nuovi item scoperti`
      );
      await loadStats();
    } catch {
      setMessage("Errore nell'avvio della pipeline. Assicurati che il backend sia avviato.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-6">Pannello Admin</h1>

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
          <div key={label} className="border border-zinc-800 rounded-lg p-4 bg-zinc-900">
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-xl font-semibold text-white">{String(value)}</p>
          </div>
        ))}
      </div>

      {/* Pipeline trigger */}
      <div className="border border-zinc-800 rounded-lg p-6 bg-zinc-900 mb-6">
        <h2 className="text-lg font-semibold text-white mb-2">Pipeline manuale</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Esegui subito la pipeline di discovery + clustering + sintesi. Normalmente gira in
          automatico ogni 30 minuti.
        </p>
        <button
          onClick={triggerPipeline}
          disabled={running}
          className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium rounded-lg transition-colors"
        >
          {running ? "Pipeline in esecuzione…" : "Avvia pipeline ora"}
        </button>

        {message && (
          <p className="mt-4 text-sm text-zinc-300 border border-zinc-700 rounded p-3 bg-zinc-800">
            {message}
          </p>
        )}
      </div>

      {/* Info */}
      <div className="text-xs text-zinc-600 space-y-1">
        <p>Backend: {API_BASE}</p>
        {stats && <p>Server time: {new Date(stats.server_time).toLocaleString("it-IT")}</p>}
        <p>La pagina si aggiorna automaticamente ogni 15 secondi.</p>
      </div>
    </div>
  );
}
