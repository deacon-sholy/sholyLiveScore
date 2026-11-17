import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Bookmark, BookmarkCheck, Clock3, Newspaper, SearchX } from 'lucide-react';
import type { NewsArticle } from '../types';
import { fetchNews } from '../lib/api';
import SiteHeader from '../components/SiteHeader';
import SearchBar from '../components/SearchBar';
import { useSavedArticles } from '../lib/useSavedArticles';
import { applySeo, SITE } from '../lib/seo';
import { timeAgo } from '../lib/time';

const REFRESH_MS = 60_000;

function ArticleMeta({ article }: { article: NewsArticle }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-subtle">
      {article.byline && <span className="truncate">{article.byline}</span>}
      {article.byline && <span aria-hidden>·</span>}
      <span className="inline-flex items-center gap-1">
        <Clock3 className="h-3 w-3" />
        {timeAgo(article.published_at)}
      </span>
      <span className="ml-auto inline-flex items-center gap-0.5 text-muted transition-colors group-hover:text-fg">
        Read
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
      </span>
    </div>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span className="w-fit max-w-full truncate rounded-md border border-line bg-elevated px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
      {label}
    </span>
  );
}

function Thumb({ article, className = '' }: { article: NewsArticle; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-sunken ${className}`}>
      {article.image_url ? (
        <img
          src={article.image_url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-500/15 to-sky-500/10">
          <Newspaper className="h-8 w-8 text-subtle" />
        </div>
      )}
    </div>
  );
}

function SaveButton({
  saved,
  onClick,
}: {
  saved: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      title={saved ? 'Remove from saved' : 'Save story'}
      aria-label={saved ? 'Remove from saved stories' : 'Save story'}
      className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface/90 text-muted backdrop-blur transition-colors hover:text-fg"
    >
      {saved ? <BookmarkCheck className="h-4 w-4 text-accent-500" /> : <Bookmark className="h-4 w-4" />}
    </button>
  );
}

function FeaturedArticle({
  article,
  saved,
  onToggleSave,
}: {
  article: NewsArticle;
  saved: boolean;
  onToggleSave: (article: NewsArticle) => void;
}) {
  return (
    <div className="group relative">
      <Link
        to={`/news/${article.id}`}
        className="grid h-full overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-all hover:border-line-strong hover:shadow-lift sm:grid-cols-2"
      >
        <Thumb article={article} className="aspect-video sm:aspect-auto sm:h-full sm:min-h-[260px]" />
        <div className="flex flex-col justify-center gap-3 p-4 sm:p-6">
          <Tag label={article.league} />
          <h2 className="font-display text-lg font-extrabold leading-snug text-fg transition-colors group-hover:text-accent-600 sm:text-xl dark:group-hover:text-accent-400">
            {article.headline}
          </h2>
          {article.description && (
            <p className="line-clamp-3 text-sm leading-relaxed text-muted">{article.description}</p>
          )}
          <ArticleMeta article={article} />
        </div>
      </Link>
      <SaveButton saved={saved} onClick={() => onToggleSave(article)} />
    </div>
  );
}

function ArticleCard({
  article,
  saved,
  onToggleSave,
}: {
  article: NewsArticle;
  saved: boolean;
  onToggleSave: (article: NewsArticle) => void;
}) {
  return (
    <div className="group relative">
      <Link
        to={`/news/${article.id}`}
        className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift"
      >
        <Thumb article={article} className="aspect-video" />
        <div className="flex flex-1 flex-col gap-2 p-4">
          <Tag label={article.league} />
          <h3 className="line-clamp-2 font-display text-[15px] font-bold leading-snug text-fg transition-colors group-hover:text-accent-600 dark:group-hover:text-accent-400">
            {article.headline}
          </h3>
          {article.description && (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted">{article.description}</p>
          )}
          <div className="mt-auto pt-2">
            <ArticleMeta article={article} />
          </div>
        </div>
      </Link>
      <SaveButton saved={saved} onClick={() => onToggleSave(article)} />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="skeleton h-64 rounded-2xl sm:h-72" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton h-72 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { saved, toggleSave, isSaved } = useSavedArticles();
  const inFlight = useRef(false);

  const load = useCallback(async (manual = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (manual) setRefreshing(true);
    setError(null);
    try {
      const data = await fetchNews();
      setArticles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load news');
    } finally {
      inFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      if (document.visibilityState !== 'hidden') load();
    }, REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    applySeo({
      title: 'Football News · Transfers, Match Reports & Headlines | Sholy Livescore',
      description:
        'The latest football news, transfer stories, match reports and headlines from the Premier League, Champions League, Africa and around the world.',
      canonical: '/news',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Football News',
        description: 'Latest football news and headlines from ESPN.',
        url: `${SITE}/news`,
      },
    });
  }, []);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const article of articles) {
      counts.set(article.league, (counts.get(article.league) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([label]) => label);
  }, [articles]);

  const tabs = useMemo(
    () => ['all', ...(saved.length > 0 ? ['saved'] : []), ...tags],
    [tags, saved.length],
  );

  useEffect(() => {
    if (filter === 'saved' && saved.length === 0) setFilter('all');
    else if (filter !== 'all' && filter !== 'saved' && !tags.includes(filter)) setFilter('all');
  }, [filter, tags, saved.length]);

  const visible = useMemo(() => {
    const base = filter === 'saved' ? saved : filter === 'all' ? articles : articles.filter((a) => a.league === filter);
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (a) =>
        a.headline.toLowerCase().includes(q) ||
        (a.description ?? '').toLowerCase().includes(q) ||
        (a.league ?? '').toLowerCase().includes(q),
    );
  }, [articles, saved, filter, search]);
  const [featured, ...rest] = visible;

  return (
    <>
      <SiteHeader refreshing={refreshing} onRefresh={() => load(true)}>
        <div className="flex items-center gap-2 pb-2.5 pt-2.5 sm:pb-3 sm:pt-3">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-muted">
            <Newspaper className="h-3.5 w-3.5" />
            Football news
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            Live
          </span>
        </div>
      </SiteHeader>

      <main id="main-content" className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-5">
          <h1 className="font-display text-xl font-extrabold tracking-tight text-fg sm:text-2xl">
            Latest football news
          </h1>
          <p className="mt-1 text-xs text-muted sm:text-sm">
            Headlines, transfers and match reports from ESPN · refreshed every minute.
          </p>
        </div>

        <div className="mb-3">
          <SearchBar value={search} onChange={setSearch} />
        </div>

        {tabs.length > 1 && (
          <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {tabs.map((tag) => {
              const isActive = filter === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setFilter(tag)}
                  aria-pressed={isActive}
                  className={`flex-shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-[13px] font-semibold transition-all ${
                    isActive
                      ? 'bg-fg text-canvas shadow-sm'
                      : 'border border-line bg-surface text-muted hover:border-line-strong hover:text-fg'
                  }`}
                >
                  {tag === 'all' ? 'All news' : tag === 'saved' ? 'Saved' : tag}
                </button>
              );
            })}
          </div>
        )}

        {loading && articles.length === 0 ? (
          <Skeleton />
        ) : error && articles.length === 0 ? (
          <div className="mx-auto flex min-h-[320px] max-w-xl flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-fg">Couldn't load the news feed</p>
              <p className="mt-1 text-xs text-muted">{error}</p>
            </div>
            <button
              onClick={() => load(true)}
              className="rounded-xl bg-fg px-5 py-2.5 text-sm font-semibold text-canvas transition-opacity hover:opacity-85"
            >
              Try again
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="mx-auto flex min-h-[320px] max-w-xl flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface">
              <SearchX className="h-6 w-6 text-subtle" />
            </div>
            <p className="text-sm font-semibold text-fg">
              {search
                ? 'No stories match your search'
                : filter === 'saved'
                  ? 'No saved stories yet'
                  : 'No stories in this category'}
            </p>
            <p className="text-xs text-muted">
              {search
                ? 'Try a different headline or team'
                : filter === 'saved'
                  ? 'Tap the bookmark on any article to keep it here'
                  : 'Try another tag'}
            </p>
            <button
              onClick={() => {
                setFilter('all');
                setSearch('');
              }}
              className="text-xs font-semibold text-accent-600 hover:underline dark:text-accent-400"
            >
              Show all news
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {featured && (
              <FeaturedArticle
                article={featured}
                saved={isSaved(featured.id)}
                onToggleSave={toggleSave}
              />
            )}
            {rest.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    saved={isSaved(article.id)}
                    onToggleSave={toggleSave}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <p className="mt-8 text-center text-[11px] text-subtle">
          News is provided by ESPN and published here for Sholy readers.
        </p>
      </main>
    </>
  );
}
