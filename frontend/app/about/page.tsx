import Link from "next/link";
import type { Metadata } from "next";
import ByteMascot from "@/components/ByteMascot";

export const metadata: Metadata = {
  title: "Chi siamo — CyberNews",
  description:
    "CyberNews è una piattaforma AI-powered che aggrega e sintetizza le notizie di cybersecurity più rilevanti da 7+ fonti top.",
};

const SOURCES = [
  { name: "BleepingComputer",  icon: "🖥️" },
  { name: "The Hacker News",   icon: "📰" },
  { name: "Krebs on Security", icon: "🔍" },
  { name: "Dark Reading",      icon: "🌑" },
  { name: "SecurityWeek",      icon: "📡" },
  { name: "CISA Alerts",       icon: "🏛️" },
  { name: "Recorded Future",   icon: "🧠" },
];

const FEATURES = [
  {
    icon: "🤖",
    title: "AI Synthesis",
    desc: "Groq + LLaMA 3.1 sintetizza articoli duplicati in un unico briefing completo.",
  },
  {
    icon: "📊",
    title: "Relevance Scoring",
    desc: "Ogni notizia riceve un punteggio 1-10. Solo le più rilevanti finiscono In Evidenza.",
  },
  {
    icon: "⚡",
    title: "Aggiornamento continuo",
    desc: "La pipeline gira automaticamente e aggiorna il feed senza intervento umano.",
  },
  {
    icon: "🏷",
    title: "Auto-tagging",
    desc: "Categorie automatiche: malware, CVE, breach, APT, ransomware e altro.",
  },
  {
    icon: "📡",
    title: "Feed RSS",
    desc: "Integra CyberNews nel tuo lettore RSS preferito con un click.",
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
      <section className="relative overflow-hidden rounded-3xl bg-[#0B1F3A] px-8 py-16 mb-16">
        <div className="absolute inset-0 dot-grid-bg opacity-20" />

        {/* Cyan glow blob */}
        <div className="absolute top-1/2 right-8 -translate-y-1/2 w-72 h-72 bg-[#06E6D9] opacity-10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 md:flex items-center gap-14">
          {/* Text */}
          <div className="flex-1">
            <span className="text-[#06E6D9] text-xs font-bold tracking-widest uppercase mb-4 block">
              🛡️ La piattaforma
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-6">
              Sempre un passo avanti<br />
              <span className="text-[#06E6D9]">su ogni minaccia.</span>
            </h1>
            <p className="text-blue-200 text-lg leading-relaxed mb-8 max-w-lg">
              Byte scansiona ogni giorno 7+ fonti top di cybersecurity, raggruppa gli articoli duplicati
              e li sintetizza con AI in un unico briefing — chiaro, completo, gratuito.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="px-6 py-3 bg-[#06E6D9] text-[#0B1F3A] rounded-full font-bold text-sm hover:bg-cyan-300 transition-colors"
              >
                Esplora le notizie →
              </Link>
              <Link
                href="/rss"
                className="px-6 py-3 border border-blue-400 text-blue-200 rounded-full font-semibold text-sm hover:border-[#06E6D9] hover:text-[#06E6D9] transition-colors"
              >
                Feed RSS
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mt-8 flex flex-wrap gap-3">
              {["7+ Fonti", "Groq AI", "LLaMA 3.1", "Auto-updated"].map((b) => (
                <span
                  key={b}
                  className="text-xs text-blue-300 border border-blue-700 rounded-full px-3 py-1 bg-blue-900/40"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Byte mascot */}
          <div className="shrink-0 mt-10 md:mt-0 flex justify-center">
            <ByteMascot size={300} />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mb-16">
        <h2 className="text-2xl font-extrabold text-[#0B1F3A] mb-2">Come funziona</h2>
        <p className="text-gray-500 mb-8">Tutto automatizzato, tutto trasparente.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="card-blue p-6">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-[#0B1F3A] mb-1.5">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sources ── */}
      <section className="mb-16">
        <h2 className="text-2xl font-extrabold text-[#0B1F3A] mb-2">Le fonti</h2>
        <p className="text-gray-500 mb-8">Monitorati 24/7 da Byte.</p>
        <div className="flex flex-wrap gap-3">
          {SOURCES.map((s) => (
            <span
              key={s.name}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-100 rounded-xl text-sm font-medium text-[#0B1F3A] shadow-blue-sm"
            >
              <span>{s.icon}</span>
              {s.name}
            </span>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-blue-50 border border-blue-100 rounded-3xl p-10 text-center">
        <div className="text-4xl mb-4">👻</div>
        <h2 className="text-2xl font-extrabold text-[#0B1F3A] mb-3">
          Byte ti aspetta
        </h2>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          Torna alla homepage e scopri le ultime minacce del giorno, già sintetizzate e pronte da leggere.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#0B1F3A] text-white rounded-full font-bold hover:bg-blue-700 transition-colors shadow-blue-md"
        >
          Vai alle notizie →
        </Link>
      </section>

    </div>
  );
}
