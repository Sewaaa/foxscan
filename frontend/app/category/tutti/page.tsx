"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getArticles, getTags, ArticleSummary, TagCount } from "@/lib/api";
import ArticleCard from "@/components/ArticleCard";
import CategoryTagBar from "@/components/CategoryTagBar";
import CyberLoader from "@/components/CyberLoader";

const PAGE_SIZE = 15;

export default function TuttiPage() {
  const [articles, setArticles]   = useState<ArticleSummary[]>([]);
  const [tags, setTags]           = useState<TagCount[]>([]);
  const [total, setTotal]         = useState<number | null>(null);
  const [hasMore, setHasMore]     = useState(true);
  const [loading, setLoading]     = useState(false);
  const offsetRef                 = useRef(0);
  const loadingRef                = useRef(false);
  const sentinelRef               = useRef<HTMLDivElement>(null);

  // Carica tags una volta
  useEffect(() => {
    getTags().then(setTags).catch(() => {});
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await getArticles({ limit: PAGE_SIZE, offset: offsetRef.current });
      setArticles((prev) => [...prev, ...res.items]);
      setTotal(res.total);
      offsetRef.current += res.items.length;
      if (offsetRef.current >= res.total || res.items.length < PAGE_SIZE) {
        setHasMore(false);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [hasMore]);

  // Caricamento iniziale
  useEffect(() => { loadMore(); }, [loadMore]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div>
      {/* Barra tag */}
      <CategoryTagBar tags={tags} activeTag={null} />

      {/* Articoli */}
      <div className="space-y-4">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>

      {/* Sentinel */}
      <div ref={sentinelRef} className="h-4" />

      {/* Loader */}
      {loading && (
        <div className="flex justify-center py-8">
          <CyberLoader size={48} />
        </div>
      )}

      {/* Fine feed */}
      {!hasMore && articles.length > 0 && (
        <p className="text-center text-xs text-gray-400 dark:text-slate-600 py-8 font-mono tracking-widest uppercase">
          — Fine del feed —
        </p>
      )}
    </div>
  );
}
