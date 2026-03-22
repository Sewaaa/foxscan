import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export async function GET() {
  const res = await fetch(`${API_BASE}/rss`, { next: { revalidate: 300 } });
  const xml = await res.text();
  return new NextResponse(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
