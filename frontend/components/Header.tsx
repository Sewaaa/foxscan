"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const NAV_LINKS = [
  { href: "/",      label: "Home" },
  { href: "/about", label: "Chi siamo" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 glass border-b border-blue-100/60 dark:border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
          onClick={() => setOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/testa_nobg.png"
            alt=""
            className="h-10 w-10 object-contain transition-all duration-300 group-hover:scale-110 neon-glow-logo"
          />
          <span className="font-grotesk font-extrabold text-xl tracking-tight">
            <span className="text-[#0B1F3A] dark:text-white">Fox</span>
            <span className="text-blue-600 dark:text-[#00FFE5] dark:[text-shadow:0_0_12px_rgba(0,255,229,0.5)]">
              Scan
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5 text-sm">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`relative px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isActive(href)
                  ? "text-blue-600 bg-blue-50 dark:text-[#00FFE5] dark:bg-transparent"
                  : "text-gray-600 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50/80 dark:hover:text-[#00FFE5] dark:hover:bg-white/5"
              }`}
            >
              {label}
              {isActive(href) && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-blue-600 dark:bg-[#00FFE5] dark:shadow-[0_0_6px_rgba(0,255,229,0.8)]" />
              )}
            </Link>
          ))}

          <ThemeToggle />

          <Link
            href="/rss"
            className="ml-1 px-3 py-1.5 text-sm text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-[#00FFE5] transition-colors font-mono text-xs tracking-wide"
          >
            RSS
          </Link>
        </nav>

        {/* Mobile controls */}
        <div className="flex md:hidden items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setOpen(!open)}
            className="p-2.5 rounded-xl text-[#0B1F3A] dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-white/6 transition-colors"
            aria-label={open ? "Chiudi menu" : "Apri menu"}
            aria-expanded={open}
          >
            {open ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="7" x2="21" y2="7" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="17" x2="21" y2="17" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <nav className="md:hidden border-t border-blue-100/60 dark:border-white/5 bg-white/96 dark:bg-[#020817]/96 backdrop-blur-xl px-4 py-3 flex flex-col gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`px-4 py-3.5 rounded-xl text-sm font-medium transition-colors ${
                isActive(href)
                  ? "text-blue-600 bg-blue-50 dark:text-[#00FFE5] dark:bg-transparent"
                  : "text-[#0B1F3A] dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-white/5"
              }`}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/rss"
            onClick={() => setOpen(false)}
            className="px-4 py-3.5 text-sm text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-[#00FFE5] transition-colors font-mono text-xs tracking-wide"
          >
            RSS
          </Link>
        </nav>
      )}
    </header>
  );
}
