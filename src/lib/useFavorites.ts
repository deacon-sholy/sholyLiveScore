import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'sholy-favorite-leagues';

export function useFavorites() {
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favoriteSlugs));
    } catch {
      // ignore storage errors (private mode, quota)
    }
  }, [favoriteSlugs]);

  const toggleFavorite = useCallback((slug: string) => {
    setFavoriteSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }, []);

  const isFavorite = useCallback((slug: string) => favoriteSlugs.includes(slug), [favoriteSlugs]);

  return { favoriteSlugs, toggleFavorite, isFavorite };
}