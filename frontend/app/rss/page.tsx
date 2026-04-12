"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const READERS = [
  { name: "Feedly",      url: "https://feedly.com",           descKey: "r1Desc" },
  { name: "Inoreader",   url: "https://www.inoreader.com",    descKey: "r2Desc" },
  { name: "NewsBlur",    url: "https://newsblur.com",         descKey: "r3Desc" },
  { name: "NetNewsWire", url: "https://netnewswire.com",      descKey: "r4Desc" },
] as const;

export default function RssPage() {
  const t = useTranslations("rss");
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
    <div className="max-w-2xl mx-auto space-y-10">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">📡</span>
          <h1 className="text-2xl font-bold text-[#0B1F3A] dark:text-slate-100">{t("title")}</h1>
        </div>
        <p className="text-gray-500 dark:text-slate-400 leading-relaxed">
          {t("desc")}
        </p>
      </div>

      {/* Feed URL */}
      <div className="border border-blue-100 dark:border-zinc-800 rounded-xl p-6 bg-white dark:bg-zinc-900 space-y-4 shadow-blue-sm">
        <h2 className="text-sm font-semibold text-[#0B1F3A] dark:text-zinc-300 uppercase tracking-wide">{t("feedUrlLabel")}</h2>
        <div className="flex gap-2">
          <code className="flex-1 bg-blue-50 dark:bg-zinc-950 border border-blue-200 dark:border-zinc-700 rounded-md px-4 py-2.5 text-sm text-blue-700 dark:text-cyan-400 font-mono truncate">
            {feedUrl || t("loading")}
          </code>
          <button
            onClick={copyUrl}
            disabled={!feedUrl}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-200 dark:disabled:bg-zinc-700 disabled:text-gray-400 dark:disabled:text-zinc-500 text-white text-sm font-medium rounded-md transition-colors shrink-0"
          >
            {copied ? t("copied") : t("copy")}
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-zinc-500">
          {t("feedHint")}
        </p>
      </div>

      {/* Come si usa */}
      <div className="border border-blue-100 dark:border-zinc-800 rounded-xl p-6 bg-white dark:bg-zinc-900 space-y-4 shadow-blue-sm">
        <h2 className="text-sm font-semibold text-[#0B1F3A] dark:text-zinc-300 uppercase tracking-wide">{t("howTitle")}</h2>
        <ol className="space-y-3 text-sm text-gray-500 dark:text-zinc-400">
          {(["step1", "step2", "step3", "step4"] as const).map((key, i) => (
            <li key={key} className="flex gap-3">
              <span className="text-blue-600 dark:text-cyan-400 font-bold shrink-0">{i + 1}.</span>
              {t(key)}
            </li>
          ))}
        </ol>
      </div>

      {/* Lettori consigliati */}
      <div>
        <h2 className="text-sm font-semibold text-[#0B1F3A] dark:text-zinc-300 uppercase tracking-wide mb-4">
          {t("readersTitle")}
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
                <p className="text-gray-500 dark:text-zinc-500 text-xs mt-0.5">{t(r.descKey)}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Nota tecnica */}
      <p className="text-xs text-gray-400 dark:text-zinc-600 border-t border-blue-100 dark:border-zinc-800 pt-6">
        {t("techNote")}
      </p>
    </div>
  );
}
