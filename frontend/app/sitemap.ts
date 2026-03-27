import { MetadataRoute } from "next";

const BASE_URL = "https://foxscan.vercel.app";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "hourly", priority: 1 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    const res = await fetch(`${API_URL}/articles?limit=100`, { next: { revalidate: 3600 } });
    if (!res.ok) return staticRoutes;
    const data = await res.json();
    const articleRoutes: MetadataRoute.Sitemap = data.items.map((a: { id: number; published_at: string }) => ({
      url: `${BASE_URL}/article/${a.id}`,
      lastModified: new Date(a.published_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
    return [...staticRoutes, ...articleRoutes];
  } catch {
    return staticRoutes;
  }
}
