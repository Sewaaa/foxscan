const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

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
  image_url: string | null;
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
  pipeline_running: boolean;
  articles_last_24h: number;
  multi_source_last_24h: number;
  multi_source_pct_24h: number;
  articles_last_48h: number;
  multi_source_last_48h: number;
  multi_source_pct_48h: number;
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`API error ${res.status} on ${path}`);
  return res.json();
}

export async function getArticles(params?: {
  tag?: string;
  min_score?: number;
  max_score?: number;
  limit?: number;
  offset?: number;
}): Promise<ArticlesResponse> {
  const qs = new URLSearchParams();
  if (params?.tag) qs.set("tag", params.tag);
  if (params?.min_score != null) qs.set("min_score", String(params.min_score));
  if (params?.max_score != null) qs.set("max_score", String(params.max_score));
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

export interface PipelineRun {
  id: number;
  started_at: string;
  completed_at: string | null;
  duration_s: number | null;
  discovered: number;
  created: number;
  updated: number;
  errors: number;
  skipped: number;
}

export async function getStats(adminKey?: string): Promise<AdminStats> {
  const headers: HeadersInit = adminKey ? { "X-Admin-Key": adminKey } : {};
  const res = await fetch(`${API_BASE}/admin/stats`, { headers });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function getPipelineHistory(adminKey: string): Promise<PipelineRun[]> {
  const res = await fetch(`${API_BASE}/admin/pipeline-history`, {
    headers: { "X-Admin-Key": adminKey },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export interface IgArticle {
  id: number;
  title: string;
  relevance_score: number;
  published_at: string;
}

export interface IgStats {
  posted_today: number;
  pending: IgArticle[];
  too_old: IgArticle[];
  recent_posted: IgArticle[];
}

export async function getIgStats(adminKey: string): Promise<IgStats> {
  const res = await fetch(`${API_BASE}/admin/ig-stats`, {
    headers: { "X-Admin-Key": adminKey },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}
