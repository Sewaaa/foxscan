"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function BackendStatus() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // Aspetta 4 secondi prima di controllare: evita falsi positivi
    // durante il cold start di Render o navigazioni lente su mobile.
    const timer = setTimeout(() => {
      fetch(`${API_BASE}/health`, { cache: "no-store" })
        .then((r) => setOffline(!r.ok))
        .catch(() => setOffline(true));
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!offline) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm text-center py-2.5 px-4">
      Aggiornamento in corso — riprova tra qualche secondo.
    </div>
  );
}
