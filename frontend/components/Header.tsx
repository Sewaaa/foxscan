"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import ThemeToggle from "./ThemeToggle";
import TopCriticalDropdown from "./TopCriticalDropdown";
import LanguageToggle from "./LanguageToggle";

/* ── Riga tema per il drawer mobile ── */
function MobileThemeRow() {
  const t = useTranslations("themeToggle");
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    setDark(stored ? stored === "dark" : true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center justify-between w-full px-4 py-3.5 rounded-xl text-sm font-medium text-[#0B1F3A] dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-white/5 transition-colors"
    >
      <span>{dark ? t("toLight") : t("toDark")}</span>
      {dark ? (
        /* sole */
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        /* luna */
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}

/* ── Riga lingua per il drawer mobile ── */
function MobileLanguageRow() {
  const locale = useLocale();
  const t = useTranslations("languageToggle");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function switchLocale() {
    const next = locale === "it" ? "en" : "it";
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000`;
    startTransition(() => router.refresh());
  }

  return (
    <button
      onClick={switchLocale}
      disabled={isPending}
      className="flex items-center justify-between w-full px-4 py-3.5 rounded-xl text-sm font-medium text-[#0B1F3A] dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
    >
      <span>{locale === "it" ? t("toEn") : t("toIt")}</span>
      <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-2.5 py-1 rounded-lg border border-blue-200 dark:border-white/10 text-gray-500 dark:text-slate-400">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        {locale.toUpperCase()}
      </span>
    </button>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("nav");

  const NAV_LINKS = [
    { href: "/",             label: t("home") },
    { href: "/category/tutti", label: t("explore") },
    { href: "/about",        label: t("about") },
  ];

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
            decoding="sync"
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

          <TopCriticalDropdown />

          <LanguageToggle />
          <ThemeToggle />

        </nav>

        {/* Mobile controls — solo hamburger */}
        <div className="flex md:hidden items-center">
          <button
            onClick={() => setOpen(!open)}
            className="p-2.5 rounded-xl text-[#0B1F3A] dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-white/6 transition-colors"
            aria-label={open ? t("closeMenu") : t("openMenu")}
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

          {/* Divider */}
          <div className="my-1 border-t border-blue-100/60 dark:border-white/5" />

          {/* Tema */}
          <MobileThemeRow />

          {/* Lingua */}
          <MobileLanguageRow />
        </nav>
      )}
    </header>
  );
}
