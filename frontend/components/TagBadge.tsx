"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { translateText } from "@/lib/translate";

export const TAG_COLORS: Record<string, string> = {
  malware:       "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700/60",
  ransomware:    "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700/60",
  breach:        "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/50 dark:text-teal-300 dark:border-teal-700/60",
  CVE:           "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/50 dark:text-violet-300 dark:border-violet-700/60",
  APT:           "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 dark:bg-fuchsia-900/50 dark:text-fuchsia-300 dark:border-fuchsia-700/60",
  policy:        "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/50 dark:text-sky-300 dark:border-sky-700/60",
  tool:          "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700/60",
  phishing:      "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700/60",
  vulnerability: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/50 dark:text-rose-300 dark:border-rose-700/60",
  espionage:     "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-700/60",
};

export const DEFAULT_TAG_COLOR = "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-600/60";

// Tag che sono acronimi tecnici universali — non vanno tradotti
const NO_TRANSLATE = new Set(["CVE", "APT", "RCE", "DDoS", "AI", "XSS", "CSRF", "SQL"]);

interface TagBadgeProps {
  tag: string;
  linked?: boolean;
}

export default function TagBadge({ tag, linked = true }: TagBadgeProps) {
  const locale = useLocale();
  const [label, setLabel] = useState(tag);

  useEffect(() => {
    // Non tradurre se: siamo in italiano, o è un acronimo tecnico
    if (locale === "it" || NO_TRANSLATE.has(tag)) {
      setLabel(tag);
      return;
    }
    translateText(tag, locale).then(setLabel);
  }, [locale, tag]);

  const color = TAG_COLORS[tag] ?? DEFAULT_TAG_COLOR;
  const cls = `inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${color}`;

  if (linked) {
    return (
      // href usa sempre il tag originale italiano per il routing corretto
      <Link href={`/category/${encodeURIComponent(tag)}`} className={`${cls} hover:shadow-blue-sm transition-shadow`}>
        {label}
      </Link>
    );
  }
  return <span className={cls}>{label}</span>;
}
