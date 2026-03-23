"use client";

import { useEffect, useState } from "react";

const READERS = [
  { name: "Feedly", url: "https://feedly.com", desc: "Il più popolare, gratuito" },
  { name: "Inoreader", url: "https://www.inoreader.com", desc: "Potente e gratuito" },
  { name: "NewsBlur", url: "https://newsblur.com", desc: "Open source" },
  { name: "NetNewsWire", url: "https://netnewswire.com", desc: "Mac e iOS, gratuito" },
];

export default function RssPage() {
  const [feedUrl, setFeedUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setFeedUrl(`${window.location.origin}/api/rss-proxy`);
  }, []);

  function copyUrl() {
    navigator.clipboard.writeText(feedUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="max-w-2xl space-y-10">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">📡</span>
          <h1 className="text-2xl font-bold text-[#0B1F3A] dark:text-slate-100">Feed RSS</h1>
        </div>
        <p className="text-gray-500 dark:text-slate-400 leading-relaxed">
          RSS è un formato standard che ti permette di ricevere automaticamente i nuovi articoli
          di CyberNews nel tuo lettore preferito, senza doverti ricordare di tornare sul sito.
        </p>
      </div>

      {/* Feed URL */}
      <div className="border border-blue-100 dark:border-zinc-800 rounded-xl p-6 bg-white dark:bg-zinc-900 space-y-4 shadow-blue-sm">
        <h2 className="text-sm font-semibold text-[#0B1F3A] dark:text-zinc-300 uppercase tracking-wide">URL del feed</h2>
        <div className="flex gap-2">
          <code className="flex-1 bg-blue-50 dark:bg-zinc-950 border border-blue-200 dark:border-zinc-700 rounded-md px-4 py-2.5 text-sm text-blue-700 dark:text-cyan-400 font-mono truncate">
            {feedUrl || "caricamento…"}
          </code>
          <button
            onClick={copyUrl}
            disabled={!feedUrl}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-200 dark:disabled:bg-zinc-700 disabled:text-gray-400 dark:disabled:text-zinc-500 text-white text-sm font-medium rounded-md transition-colors shrink-0"
          >
            {copied ? "✓ Copiato" : "Copia"}
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-zinc-500">
          Incolla questo URL nel tuo lettore RSS per iscriverti agli aggiornamenti.
        </p>
      </div>

      {/* Come si usa */}
      <div className="border border-blue-100 dark:border-zinc-800 rounded-xl p-6 bg-white dark:bg-zinc-900 space-y-4 shadow-blue-sm">
        <h2 className="text-sm font-semibold text-[#0B1F3A] dark:text-zinc-300 uppercase tracking-wide">Come si usa</h2>
        <ol className="space-y-3 text-sm text-gray-500 dark:text-zinc-400">
          <li className="flex gap-3">
            <span className="text-blue-600 dark:text-cyan-400 font-bold shrink-0">1.</span>
            Scegli un lettore RSS dalla lista qui sotto e creati un account gratuito.
          </li>
          <li className="flex gap-3">
            <span className="text-blue-600 dark:text-cyan-400 font-bold shrink-0">2.</span>
            Cerca il pulsante <strong className="text-gray-700 dark:text-zinc-300">&quot;Add feed&quot;</strong> o{" "}
            <strong className="text-gray-700 dark:text-zinc-300">&quot;Subscribe&quot;</strong>.
          </li>
          <li className="flex gap-3">
            <span className="text-blue-600 dark:text-cyan-400 font-bold shrink-0">3.</span>
            Incolla l&apos;URL del feed qui sopra e conferma.
          </li>
          <li className="flex gap-3">
            <span className="text-blue-600 dark:text-cyan-400 font-bold shrink-0">4.</span>
            Da quel momento riceverai automaticamente ogni nuovo articolo generato da CyberNews.
          </li>
        </ol>
      </div>

      {/* Lettori consigliati */}
      <div>
        <h2 className="text-sm font-semibold text-[#0B1F3A] dark:text-zinc-300 uppercase tracking-wide mb-4">
          Lettori RSS consigliati
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {READERS.map((r) => (
            <a
              key={r.name}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-blue-100 dark:border-zinc-800 rounded-xl p-4 bg-white dark:bg-zinc-900 hover:border-blue-300 dark:hover:border-zinc-600 transition-colors flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded bg-blue-50 dark:bg-zinc-800 flex items-center justify-center text-sm shrink-0">
                🔖
              </div>
              <div>
                <p className="text-[#0B1F3A] dark:text-white font-medium text-sm">{r.name}</p>
                <p className="text-gray-500 dark:text-zinc-500 text-xs mt-0.5">{r.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Nota tecnica */}
      <p className="text-xs text-gray-400 dark:text-zinc-600 border-t border-blue-100 dark:border-zinc-800 pt-6">
        Il feed viene aggiornato ogni 30 minuti in sincronia con la pipeline AI. Contiene gli
        ultimi 50 articoli in formato RSS 2.0.
      </p>
    </div>
  );
}
