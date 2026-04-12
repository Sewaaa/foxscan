"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

export default function LanguageToggle() {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function switchLocale() {
    const next = locale === "it" ? "en" : "it";
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      onClick={switchLocale}
      disabled={isPending}
      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg border border-blue-200 dark:border-white/10 text-gray-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-[#00FFE5]/40 dark:hover:text-[#00FFE5] transition-all disabled:opacity-50"
      title={locale === "it" ? "Switch to English" : "Passa all'italiano"}
    >
      {/* Globe icon */}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      {locale.toUpperCase()}
    </button>
  );
}
