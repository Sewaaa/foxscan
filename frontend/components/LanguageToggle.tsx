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
      className="px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg border border-blue-200 dark:border-white/10 text-gray-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-[#00FFE5]/40 dark:hover:text-[#00FFE5] transition-all disabled:opacity-50"
      title={locale === "it" ? "Switch to English" : "Passa all'italiano"}
    >
      {locale === "it" ? "EN" : "IT"}
    </button>
  );
}
