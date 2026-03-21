const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface Source {
  id: number;
  url: string;
  domain: string;
  scraped_at: string;
}

export interface ArticleSummary {
  id: number;
  title: string;
  summary: string | null;
  tags: string[];
  relevance_score: number;
  published_at: string;
  sources: Source[];
}

export interface Article extends ArticleSummary {
  body: string;
}

export interface ArticlesResponse {
  total: number;
  offset: number;
  limit: number;
  items: ArticleSummary[];
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface AdminStats {
  total_articles: number;
  rss_items_pending: number;
  rss_items_processed: number;
  last_article_at: string | null;
  server_time: string;
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`API error ${res.status} on ${path}`);
  return res.json();
}

export async function getArticles(params?: {
  tag?: string;
  limit?: number;
  offset?: number;
}): Promise<ArticlesResponse> {
  const qs = new URLSearchParams();
  if (params?.tag) qs.set("tag", params.tag);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const query = qs.toString() ? `?${qs}` : "";
  return apiFetch<ArticlesResponse>(`/articles${query}`);
}

export async function getArticle(id: number): Promise<Article> {
  return apiFetch<Article>(`/articles/${id}`);
}

export async function getTags(): Promise<TagCount[]> {
  return apiFetch<TagCount[]>("/tags");
}

export async function getStats(): Promise<AdminStats> {
  return apiFetch<AdminStats>("/admin/stats");
}
