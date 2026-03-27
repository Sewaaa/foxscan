import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import BackendStatus from "@/components/BackendStatus";
import Header from "@/components/Header";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FoxScan — AI Cybersecurity Intelligence",
  description:
    "Le notizie di cybersecurity più rilevanti, sintetizzate automaticamente da AI in un unico articolo completo.",
  icons: { icon: "/fs_nobg.png" },
  openGraph: {
    title: "FoxScan — AI Cybersecurity Intelligence",
    description: "Le notizie di cybersecurity più rilevanti, sintetizzate automaticamente da AI in un unico articolo completo.",
    url: "https://foxscan.vercel.app",
    siteName: "FoxScan",
    images: [{ url: "https://foxscan.vercel.app/testa_nobg.png", width: 512, height: 512 }],
    locale: "it_IT",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "FoxScan — AI Cybersecurity Intelligence",
    description: "Le notizie di cybersecurity più rilevanti, sintetizzate automaticamente da AI.",
    images: ["https://foxscan.vercel.app/testa_nobg.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className={`${inter.className} bg-[#F8FAFF] dark:bg-[#0d1117] text-[#0B1F3A] dark:text-slate-200 min-h-screen`}>
        <BackendStatus />
        <Header />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">{children}</main>

        {/* ── Footer ── */}
        <footer className="mt-16 md:mt-20 border-t border-blue-100 dark:border-blue-900/50 bg-white dark:bg-[#010409]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-12">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 md:gap-8 mb-8 md:mb-10">
              {/* Brand */}
              <div className="col-span-2 sm:col-span-1">
                <div className="mb-3">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/testa_nobg.png" alt="" className="h-7 w-7 object-contain" />
                    <span className="font-extrabold text-lg tracking-tight">
                      <span className="text-[#0B1F3A] dark:text-white">Fox</span><span className="text-blue-600">Scan</span>
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
                  Il tuo guardiano cyber, 24/7. Notizie sintetizzate dall&apos;AI, sempre aggiornate.
                </p>
              </div>

              {/* Categorie */}
              <div>
                <h4 className="font-semibold text-[#0B1F3A] dark:text-slate-200 mb-3 text-sm">Categorie</h4>
                <ul className="space-y-2 text-sm text-gray-500 dark:text-slate-400">
                  <li><Link href="/category/malware" className="hover:text-blue-600 transition-colors">Malware</Link></li>
                  <li><Link href="/category/ransomware" className="hover:text-blue-600 transition-colors">Ransomware</Link></li>
                  <li><Link href="/category/breach" className="hover:text-blue-600 transition-colors">Data Breach</Link></li>
                  <li><Link href="/category/CVE" className="hover:text-blue-600 transition-colors">CVE</Link></li>
                </ul>
              </div>

              {/* Piattaforma */}
              <div>
                <h4 className="font-semibold text-[#0B1F3A] dark:text-slate-200 mb-3 text-sm">Piattaforma</h4>
                <ul className="space-y-2 text-sm text-gray-500 dark:text-slate-400">
                  <li><Link href="/rss" className="hover:text-blue-600 transition-colors">Feed RSS</Link></li>
                  <li><Link href="/about" className="hover:text-blue-600 transition-colors">Chi siamo</Link></li>
                </ul>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="pt-6 border-t border-blue-100 dark:border-blue-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-gray-400 dark:text-slate-500 text-center sm:text-left">
                © 2026 FoxScan — Articoli generati da AI · fonti sempre citate
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 dark:text-slate-500 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full border border-blue-100 dark:border-blue-800">
                  AI‑Powered
                </span>
                <span className="text-xs text-gray-400 dark:text-slate-500 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full border border-blue-100 dark:border-blue-800">
                  Aggiornamento continuo
                </span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
