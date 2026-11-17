import { useCallback, useEffect, useState } from 'react';
import type { NewsArticle } from '../types';

const STORAGE_KEY = 'sholy-saved-articles';

function loadSaved(): NewsArticle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is NewsArticle =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as NewsArticle).id === 'string' &&
        typeof (item as NewsArticle).headline === 'string',
    );
  } catch {
    return [];
  }
}

export function useSavedArticles() {
  const [saved, setSaved] = useState<NewsArticle[]>(loadSaved);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // ignore storage errors (private mode, quota)
    }
  }, [saved]);

  const toggleSave = useCallback((article: NewsArticle) => {
    setSaved((prev) =>
      prev.some((a) => a.id === article.id)
        ? prev.filter((a) => a.id !== article.id)
        : [article, ...prev],
    );
  }, []);

  const isSaved = useCallback((id: string) => saved.some((a) => a.id === id), [saved]);

  return { saved, toggleSave, isSaved };
}
