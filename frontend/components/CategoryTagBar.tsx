"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TAG_COLORS, DEFAULT_TAG_COLOR } from "@/components/TagBadge";

interface TagCount { tag: string; count: number; }

interface Props {
  tags: TagCount[];
  activeTag: string | null; // null = "tutti"
}

export default function CategoryTagBar({ tags, activeTag }: Props) {
  const scrollRef   = useRef<HTMLDivElement>(null);
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    update();
    const el = scrollRef.current;
    el?.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update, tags]);

  // Porta il tag attivo in vista al mount
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const active = container.querySelector("[data-active='true']") as HTMLElement | null;
    if (!active) return;
    const containerLeft = container.getBoundingClientRect().left;
    const activeLeft    = active.getBoundingClientRect().left;
    const offset        = activeLeft - containerLeft - container.clientWidth / 2 + active.offsetWidth / 2;
    container.scrollBy({ left: offset, behavior: "smooth" });
  }, [activeTag]);

  const scroll = (dir: "left" | "right") =>
    scrollRef.current?.scrollBy({ left: dir === "left" ? -220 : 220, behavior: "smooth" });

  return (
    <div className="flex items-center gap-1 mb-8">
      {/* Freccia sinistra */}
      <button
        onClick={() => scroll("left")}
        disabled={!canLeft}
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full border border-blue-100 dark:border-white/10 text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-[#00FFE5] hover:border-blue-300 dark:hover:border-[#00FFE5]/30 transition-all disabled:opacity-20 disabled:cursor-default"
        aria-label="Scorri sinistra"
      >
        <ChevronLeft size={12} />
      </button>

      {/* Barra scrollabile — py-1.5 evita che il ring venga tagliato */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide py-1.5 px-0.5"
      >
        {/* Tutti */}
        <Link
          href="/category/tutti"
          data-active={activeTag === null ? "true" : "false"}
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all bg-blue-100 text-blue-800 border-blue-200 dark:bg-white/10 dark:text-slate-200 dark:border-white/10 ${
            activeTag === null
              ? "ring-2 ring-offset-1 ring-blue-400 dark:ring-[#00FFE5] opacity-100"
              : "opacity-60 hover:opacity-100"
          }`}
        >
          Tutti
        </Link>

        {/* Altri tag */}
        {tags.map(({ tag }) => {
          const isActive = tag === activeTag;
          const color = TAG_COLORS[tag] ?? DEFAULT_TAG_COLOR;
          return (
            <Link
              key={tag}
              href={`/category/${encodeURIComponent(tag)}`}
              data-active={isActive ? "true" : "false"}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${color} ${
                isActive
                  ? "ring-2 ring-offset-1 ring-current opacity-100"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              {tag}
            </Link>
          );
        })}
      </div>

      {/* Freccia destra */}
      <button
        onClick={() => scroll("right")}
        disabled={!canRight}
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full border border-blue-100 dark:border-white/10 text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-[#00FFE5] hover:border-blue-300 dark:hover:border-[#00FFE5]/30 transition-all disabled:opacity-20 disabled:cursor-default"
        aria-label="Scorri destra"
      >
        <ChevronRight size={12} />
      </button>
    </div>
  );
}
