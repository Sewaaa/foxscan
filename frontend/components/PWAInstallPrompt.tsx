"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const t = useTranslations("pwa");
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      localStorage.getItem("pwa-dismissed") === "1" ||
      window.matchMedia("(display-mode: standalone)").matches
    ) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    setVisible(false);
    localStorage.setItem("pwa-dismissed", "1");
  }

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    dismiss();
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="card-blue rounded-2xl p-4 shadow-xl border border-blue-200 dark:border-white/10 flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/testa_nobg.png" alt="" className="w-10 h-10 object-contain shrink-0 neon-glow-logo" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#0B1F3A] dark:text-slate-100">{t("title")}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t("desc")}</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={install}
              className="flex-1 px-3 py-1.5 bg-blue-600 dark:bg-[#00FFE5] text-white dark:text-[#020817] text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              {t("install")}
            </button>
            <button
              onClick={dismiss}
              className="px-3 py-1.5 text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
            >
              {t("dismiss")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
