import Link from "next/link";
import type { Metadata } from "next";
import { Layers } from "lucide-react";
import ByteMascot from "@/components/ByteMascot";

export const metadata: Metadata = {
  title: "Chi siamo — FoxScan",
  description:
    "FoxScan è una piattaforma AI-powered che aggrega e sintetizza le notizie di cybersecurity più rilevanti da 17+ fonti top.",
};

const SOURCES = [
  { name: "BleepingComputer",      icon: "🖥️" },
  { name: "The Hacker News",       icon: "📰" },
  { name: "Krebs on Security",     icon: "🔍" },
  { name: "Dark Reading",          icon: "🌑" },
  { name: "CISA Alerts",           icon: "🏛️" },
  { name: "Security Affairs",      icon: "🔐" },
  { name: "Graham Cluley",         icon: "✍️" },
  { name: "SecurityWeek",          icon: "📡" },
  { name: "Help Net Security",     icon: "🛡️" },
  { name: "Infosecurity Magazine", icon: "📋" },
  { name: "Ars Technica",          icon: "⚙️" },
  { name: "Wired Security",        icon: "🌐" },
  { name: "Naked Security",        icon: "🐑" },
  { name: "CyberScoop",            icon: "🔭" },
  { name: "The Register",          icon: "📝" },
  { name: "Malwarebytes",          icon: "🦠" },
  { name: "Recorded Future",       icon: "🧠" },
];

const FEATURES = [
  {
    icon: "🤖",
    title: "Sintesi AI",
    desc: "La nostra intelligenza artificiale sintetizza articoli duplicati in un unico briefing completo.",
  },
  {
    icon: "📊",
    title: "Punteggio di Rilevanza",
    desc: "Ogni notizia riceve un punteggio 1-10. Solo le più rilevanti finiscono In Evidenza.",
  },
  {
    icon: "⚡",
    title: "Aggiornamento continuo",
    desc: "La pipeline gira automaticamente e aggiorna il feed senza intervento umano.",
  },
  {
    icon: <Layers size={30} />,
    title: "Categorizzazione automatica",
    desc: "Categorie automatiche: malware, CVE, breach, APT, ransomware e altro.",
  },
  {
    icon: "📡",
    title: "Feed RSS",
    desc: "Integra FoxScan nel tuo lettore RSS preferito con un click.",
  },
  {
    icon: "🛡️",
    title: "Zero tracciamento",
    desc: "Nessun cookie di profilazione. Solo notizie, senza rumore.",
  },
];

export default function AboutPage() {
  return (
    <div className="fade-up">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-3xl bg-[#0B1F3A] px-6 py-12 md:px-8 md:py-16 mb-12 md:mb-16">
        <div className="absolute inset-0 dot-grid-bg opacity-20" />
        <div className="absolute top-1/2 right-8 -translate-y-1/2 w-72 h-72 bg-[#06E6D9] opacity-10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 md:grid md:grid-cols-2 md:items-center md:gap-10">
          {/* Text */}
          <div>
            <span className="text-[#06E6D9] text-xs font-bold tracking-widest uppercase mb-4 block">
              🛡️ La piattaforma
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mb-5 md:mb-6">
              Sempre un passo avanti <span className="text-[#06E6D9]">su ogni minaccia.</span>
            </h1>
            <p className="text-blue-200 text-base md:text-lg leading-relaxed mb-6 md:mb-8 max-w-lg">
              Scansiona ogni giorno 17+ fonti top di cybersecurity, raggruppa gli articoli duplicati
              e li sintetizza con AI in un unico briefing — chiaro, completo, gratuito.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="px-5 py-2.5 md:px-6 md:py-3 bg-[#06E6D9] text-[#0B1F3A] rounded-full font-bold text-sm hover:bg-cyan-300 transition-colors"
              >
                Esplora le notizie →
              </Link>
              <Link
                href="/rss"
                className="px-5 py-2.5 md:px-6 md:py-3 border border-blue-400 text-blue-200 rounded-full font-semibold text-sm hover:border-[#06E6D9] hover:text-[#06E6D9] transition-colors"
              >
                Feed RSS
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mt-6 md:mt-8 flex flex-wrap gap-3">
              {["17+ Fonti", "Sintesi AI", "Aggiornato 24/7"].map((b) => (
                <span key={b} className="text-xs text-blue-300 border border-blue-700 rounded-full px-3 py-1 bg-blue-900/40">
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Logo */}
          <div className="shrink-0 mt-8 md:mt-0 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo_nobg.png" alt="FoxScan" className="w-48 md:w-64 object-contain float-anim" />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mb-12 md:mb-16">
        <h2 className="text-xl md:text-2xl font-extrabold text-[#0B1F3A] dark:text-slate-100 mb-2">Come funziona</h2>
        <p className="text-gray-500 dark:text-slate-400 mb-6 md:mb-8">Tutto automatizzato, tutto trasparente.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="card-blue p-5 md:p-6">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-[#0B1F3A] dark:text-slate-100 mb-1.5">{f.title}</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sources ── */}
      <section className="mb-12 md:mb-16">
        <h2 className="text-xl md:text-2xl font-extrabold text-[#0B1F3A] dark:text-slate-100 mb-2">Le fonti</h2>
        <p className="text-gray-500 dark:text-slate-400 mb-6 md:mb-8">Monitorate 24/7.</p>
        <div className="flex flex-wrap gap-2 md:gap-3">
          {SOURCES.map((s) => (
            <span
              key={s.name}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white dark:bg-[#161b22] border border-blue-100 dark:border-[#30363d] rounded-xl text-sm font-medium text-[#0B1F3A] dark:text-slate-200 shadow-blue-sm"
            >
              <span>{s.icon}</span>
              {s.name}
            </span>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <div className="flex justify-center mt-2 mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#0B1F3A] dark:bg-blue-700 text-white rounded-full font-bold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-blue-md"
        >
          Vai alle notizie →
        </Link>
      </div>

    </div>
  );
}
