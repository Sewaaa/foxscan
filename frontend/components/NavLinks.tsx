"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

export default function NavLinks() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const NAV_LINKS = [
    { href: "/",      label: t("home") },
    { href: "/about", label: t("about") },
  ];

  return (
    <>
      {NAV_LINKS.map(({ href, label }) => {
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/40"
                : "text-gray-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}
