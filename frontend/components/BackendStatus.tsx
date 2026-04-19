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
      : "Servizio temporaneamente non disponibile · ripristino automatico in corso";
  }
  return isNightMode
    ? `FoxScan is in night mode · service resumes automatically at 0${WAKE_HOUR}:00 CET`
    : "Service temporarily unavailable · automatic recovery in progress";
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

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm text-center py-2.5 px-4">
      {getStatusMessage(locale)}
    </div>
  );
}
