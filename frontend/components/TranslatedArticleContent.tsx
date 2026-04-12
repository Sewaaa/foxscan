"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { translateText } from "@/lib/translate";

interface Props {
  title: string;
  summary: string | null;
  body: string;
}

export default function TranslatedArticleContent({ title, summary, body }: Props) {
  const locale = useLocale();
  const t = useTranslations("article");

  const [trTitle, setTrTitle]     = useState(title);
  const [trSummary, setTrSummary] = useState(summary);

  useEffect(() => {
    if (locale === "it") {
      setTrTitle(title);
      setTrSummary(summary);
      return;
    }
    translateText(title, locale).then(setTrTitle);
    if (summary) translateText(summary, locale).then(setTrSummary);
  }, [locale, title, summary]);

  return (
    <>
      {/* Titolo tradotto */}
      <h1 className="text-2xl md:text-3xl font-extrabold text-[#0B1F3A] dark:text-white leading-tight mb-4 md:mb-5">
        {trTitle}
      </h1>

      {/* Summary box tradotta */}
      {trSummary && (
        <div className="byte-box relative overflow-hidden rounded-2xl mb-5 md:mb-6 border border-blue-200 dark:border-[#00FFE5]/20 bg-blue-50 dark:bg-[#080e1e]">
          <div className="h-0.5 w-full bg-gradient-to-r from-blue-400 via-blue-500 to-transparent dark:from-[#00FFE5]/70 dark:via-[#00FFE5]/30 dark:to-transparent" />
          <div className="flex gap-4 md:gap-5 p-5 md:p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/sintesi_nobg.png"
              alt=""
              className="shrink-0 w-20 h-20 md:w-24 md:h-24 object-contain float-slow self-center opacity-95"
            />
            <div className="flex-1 min-w-0 py-1">
              <p className="byte-label text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-500 dark:text-[#00FFE5] mb-2">
                {t("inSummary")}
              </p>
              <div className="byte-text text-sm md:text-base text-blue-900 dark:text-slate-200 leading-relaxed font-medium">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <span>{children}</span>,
                    strong: ({ children }) => <strong className="font-bold text-blue-700 dark:text-[#00FFE5]">{children}</strong>,
                  }}
                >
                  {trSummary}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Body — rimane in italiano (markdown lungo, no traduzione) */}
      <div className="prose-cyber mt-6">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
      </div>
    </>
  );
}
