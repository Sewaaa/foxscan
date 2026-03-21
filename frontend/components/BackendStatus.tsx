"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function BackendStatus() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((r) => setOffline(!r.ok))
      .catch(() => setOffline(true));
  }, []);

  if (!offline) return null;

  return (
    <div className="bg-red-900/60 border-b border-red-700 text-red-200 text-sm text-center py-2 px-4">
      Backend non raggiungibile su{" "}
      <code className="font-mono text-red-100">{API_BASE}</code> — avvia il server con{" "}
      <code className="font-mono text-red-100">uvicorn main:app --port 8080</code>
    </div>
  );
}
