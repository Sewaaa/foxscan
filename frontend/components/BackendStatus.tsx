"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const WAKE_HOUR = 8; // ora italiana in cui il NAS si risveglia

function getStatusMessage(locale: string): string {
  const italianHour = new Date().toLocaleString("en-US", {
    timeZone: "Europe/Rome",
    hour: "numeric",
    hour12: false,
  });
  const hour = parseInt(italianHour, 10);
  const isNightMode = hour >= 23 || hour < WAKE_HOUR;

  if (locale === "it") {
    return isNightMode
      ? `FoxScan è in pausa notturna · il servizio riprende automaticamente alle 0${WAKE_HOUR}:00 CET`
      : "Stiamo riscontrando un'interruzione temporanea del servizio · ci scusiamo per il disagio";
  }
  return isNightMode
    ? `FoxScan is in night mode · service resumes automatically at 0${WAKE_HOUR}:00 CET`
    : "We are experiencing a temporary service disruption · we apologise for the inconvenience";
}

export default function BackendStatus() {
  const [offline, setOffline] = useState(false);
  const locale = useLocale();

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(`${API_BASE}/health`, { cache: "no-store" })
        .then((r) => setOffline(!r.ok))
        .catch(() => setOffline(true));
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!offline) return null;

  const italianHour = parseInt(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Rome", hour: "numeric", hour12: false }),
    10
  );
  const isNightMode = italianHour >= 23 || italianHour < 8;

  // Di notte nessun banner — il sito mostra già lo stato vuoto
  if (isNightMode) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm text-center py-2.5 px-4">
      {getStatusMessage(locale)}
    </div>
  );
}
