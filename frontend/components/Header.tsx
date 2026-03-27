"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const NAV_LINKS = [
  { href: "/",      label: "Home" },
  { href: "/about", label: "Chi siamo" },
  { href: "/admin", label: "Admin" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 glass border-b border-blue-100 dark:border-blue-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/testa_nobg.png" alt="" className="h-10 w-10 object-contain" />
          <span className="font-extrabold text-xl tracking-tight">
            <span className="text-white fox-stroke">Fox</span><span className="text-blue-600">Scan</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5 text-sm">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isActive(href)
                  ? "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/40"
                  : "text-gray-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40"
              }`}
            >
              {label}
            </Link>
          ))}
          <ThemeToggle />
          <Link
            href="/rss"
            className="ml-1 px-4 py-1.5 rounded-full bg-[#0B1F3A] text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-blue-sm"
          >
            📡 Feed RSS
          </Link>
        </nav>

        {/* Mobile controls */}
        <div className="flex md:hidden items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setOpen(!open)}
            className="p-2.5 rounded-xl text-[#0B1F3A] dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            aria-label={open ? "Chiudi menu" : "Apri menu"}
            aria-expanded={open}
          >
            {open ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="7" x2="21" y2="7" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="17" x2="21" y2="17" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {open && (
        <nav className="md:hidden border-t border-blue-100 dark:border-blue-900/50 bg-white/95 dark:bg-[#0d1117]/95 backdrop-blur-md px-4 py-3 flex flex-col gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className={`px-4 py-3.5 rounded-xl text-sm font-medium transition-colors ${
                isActive(href)
                  ? "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/40"
                  : "text-[#0B1F3A] dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30"
              }`}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/rss"
            onClick={() => setOpen(false)}
            className="mt-2 px-4 py-3.5 rounded-full bg-[#0B1F3A] dark:bg-blue-900 text-white text-sm font-semibold text-center hover:bg-blue-700 transition-colors"
          >
            📡 Feed RSS
          </Link>
        </nav>
      )}
    </header>
  );
}
