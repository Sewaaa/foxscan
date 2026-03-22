import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import BackendStatus from "@/components/BackendStatus";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CyberNews — Cybersecurity in italiano",
  description:
    "Le notizie di cybersecurity più rilevanti, sintetizzate automaticamente da AI in un unico articolo completo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="dark">
      <body className={`${inter.className} bg-zinc-950 text-zinc-100 min-h-screen`}>
        <BackendStatus />
        <header className="border-b border-zinc-800 sticky top-0 z-50 bg-zinc-950/90 backdrop-blur">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-cyan-400 font-bold text-xl tracking-tight">Cyber</span>
              <span className="text-white font-bold text-xl tracking-tight">News</span>
              <span className="ml-2 text-xs text-zinc-500 font-normal hidden sm:inline">
                AI-powered cybersecurity digest
              </span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
                Home
              </Link>
              <Link href="/admin" className="text-zinc-400 hover:text-white transition-colors">
                Admin
              </Link>
              <Link href="/rss" className="text-zinc-400 hover:text-white transition-colors">
                RSS
              </Link>
            </nav>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>

        <footer className="border-t border-zinc-800 mt-16">
          <div className="max-w-4xl mx-auto px-4 py-6 text-center text-xs text-zinc-600">
            CyberNews — articoli generati automaticamente da AI · fonti sempre citate
          </div>
        </footer>
      </body>
    </html>
  );
}
