"use client";

import type { Metadata } from "next";
import Link from "next/link";
import { useState } from "react";
import { Send, CheckCircle, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

// Sostituisci con il tuo endpoint Formspree dopo la registrazione su formspree.io
// es. https://formspree.io/f/xyzabcde
const FORMSPREE_ENDPOINT = process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT ?? "";

type Status = "idle" | "sending" | "success" | "error";

export default function ContactPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!FORMSPREE_ENDPOINT) {
      setStatus("error");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus("success");
        setForm({ name: "", email: "", subject: "", message: "" });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="max-w-2xl mx-auto fade-up py-4">

      {/* Header */}
      <div className="mb-8">
        <Link href="/" className="text-sm text-blue-600 dark:text-[#00FFE5] hover:underline">
          ← Torna alla homepage
        </Link>
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#0B1F3A] dark:text-slate-100 mt-4 mb-2 font-grotesk">
          Contatti
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Per richieste sulla privacy, segnalazioni o qualsiasi altro motivo.
        </p>
      </div>

      {/* Success state */}
      {status === "success" ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card-blue p-8 flex flex-col items-center text-center gap-4"
        >
          <CheckCircle size={48} className="text-green-500" />
          <h2 className="font-grotesk font-bold text-xl text-[#0B1F3A] dark:text-slate-100">
            Messaggio inviato!
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Ti risponderemo il prima possibile.
          </p>
          <button
            onClick={() => setStatus("idle")}
            className="mt-2 px-5 py-2 rounded-full bg-blue-600 dark:bg-[#00FFE5] text-white dark:text-[#020817] text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Invia un altro messaggio
          </button>
        </motion.div>
      ) : (
        <div className="card-blue p-6 md:p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Nome */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                Nome
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Il tuo nome"
                className="w-full px-4 py-2.5 rounded-xl border border-blue-100 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-[#0B1F3A] dark:text-slate-200 placeholder-gray-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-[#00FFE5]/40 transition"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="la-tua@email.com"
                className="w-full px-4 py-2.5 rounded-xl border border-blue-100 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-[#0B1F3A] dark:text-slate-200 placeholder-gray-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-[#00FFE5]/40 transition"
              />
            </div>

            {/* Oggetto */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                Oggetto
              </label>
              <select
                name="subject"
                value={form.subject}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-blue-100 dark:border-white/10 bg-white dark:bg-[#0d1526] text-sm text-[#0B1F3A] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-[#00FFE5]/40 transition"
              >
                <option value="">Seleziona un motivo…</option>
                <option value="Privacy / GDPR">Privacy / GDPR</option>
                <option value="Segnalazione errore">Segnalazione errore</option>
                <option value="Richiesta rimozione contenuto">Richiesta rimozione contenuto</option>
                <option value="Collaborazione">Collaborazione</option>
                <option value="Altro">Altro</option>
              </select>
            </div>

            {/* Messaggio */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                Messaggio
              </label>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                required
                rows={5}
                placeholder="Scrivi qui il tuo messaggio…"
                className="w-full px-4 py-2.5 rounded-xl border border-blue-100 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-[#0B1F3A] dark:text-slate-200 placeholder-gray-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-[#00FFE5]/40 transition resize-none"
              />
            </div>

            {/* Error */}
            {status === "error" && (
              <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-3">
                <AlertCircle size={15} className="shrink-0" />
                {!FORMSPREE_ENDPOINT
                  ? "Il form non è ancora configurato. Contatta l'amministratore."
                  : "Errore nell'invio. Riprova tra qualche secondo."}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={status === "sending"}
              className="self-end flex items-center gap-2 px-6 py-2.5 rounded-full bg-blue-600 dark:bg-[#00FFE5] text-white dark:text-[#020817] text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {status === "sending" ? (
                <>
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Invio…
                </>
              ) : (
                <>
                  <Send size={14} />
                  Invia messaggio
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* GDPR note */}
      <p className="mt-6 text-xs text-gray-400 dark:text-slate-600 leading-relaxed">
        I dati inviati tramite questo modulo sono utilizzati esclusivamente per rispondere alla tua richiesta,
        ai sensi dell&apos;art. 6(1)(b) GDPR. Non vengono ceduti a terzi né usati per profilazione.{" "}
        <Link href="/privacy" className="text-blue-500 dark:text-[#00FFE5]/60 hover:underline">
          Leggi la Privacy Policy completa.
        </Link>
      </p>
    </div>
  );
}
