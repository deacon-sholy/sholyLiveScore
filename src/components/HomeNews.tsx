import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, Newspaper } from 'lucide-react';
import type { NewsArticle } from '../types';
import { fetchNews } from '../lib/api';
import { timeAgo } from '../lib/time';

const REFRESH_MS = 2 * 60_000;
const CARD_COUNT = 4;

function NewsThumb({ article }: { article: NewsArticle }) {
  return (
    <div className="relative aspect-video overflow-hidden bg-sunken">
      {article.image_url ? (
        <img
          src={article.image_url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-500/15 to-sky-500/10">
          <Newspaper className="h-7 w-7 text-subtle" />
        </div>
      )}
    </div>
  );
}

function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <Link
      to={`/news/${article.id}`}
      className="group w-[268px] flex-shrink-0 snap-start overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift sm:w-[300px] lg:w-auto"
    >
      <NewsThumb article={article} />
      <div className="space-y-2 p-3">
        <div className="flex min-w-0 items-center gap-2 text-[10px] font-semibold text-subtle">
          <span className="min-w-0 flex-1 truncate uppercase tracking-wide">{article.league}</span>
          <span className="inline-flex flex-shrink-0 items-center gap-1 font-medium normal-case tracking-normal">
            <Clock3 className="h-3 w-3" />
            {timeAgo(article.published_at)}
          </span>
        </div>
        <h3 className="line-clamp-2 font-display text-sm font-bold leading-snug text-fg transition-colors group-hover:text-accent-600 dark:group-hover:text-accent-400">
          {article.headline}
        </h3>
      </div>
    </Link>
  );
}

function NewsSkeleton() {
  return (
    <div className="-mx-4 flex gap-3 overflow-hidden px-4 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-4 lg:px-0" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="w-[268px] flex-shrink-0 sm:w-[300px] lg:w-auto">
          <div className="skeleton aspect-video rounded-t-2xl" />
          <div className="space-y-2 rounded-b-2xl border border-t-0 border-line bg-surface p-3">
            <div className="skeleton h-2.5 w-24 rounded" />
            <div className="skeleton h-3.5 w-full rounded" />
            <div className="skeleton h-3.5 w-2/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HomeNews() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const data = await fetchNews();
      setArticles(data);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      if (document.visibilityState !== 'hidden') load();
    }, REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  const latest = articles.slice(0, CARD_COUNT);

  // The home page is still a scores page first: if news is unavailable, or has
  // no stories yet, collapse silently instead of showing an error block.
  if (!loading && (failed || latest.length === 0)) return null;

  return (
    <section className="mb-6" aria-labelledby="home-news-heading">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2
            id="home-news-heading"
            className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-fg sm:text-xl"
          >
            <Newspaper className="h-4 w-4 text-accent-500" />
            Latest football news
          </h2>
          <p className="mt-0.5 text-xs text-muted sm:text-[13px]">
            Transfers, match reports and headlines
          </p>
        </div>
        <Link
          to="/news"
          className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg px-1 py-1 text-xs font-semibold text-accent-600 transition-colors hover:text-accent-500 dark:text-accent-400"
        >
          All news
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading ? (
        <NewsSkeleton />
      ) : (
        // Swipeable rail on phones and tablets so scores stay close to the top;
        // four even columns once there is room.
        <div className="-mx-4 flex snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto px-4 pb-1 no-scrollbar lg:mx-0 lg:grid lg:grid-cols-4 lg:scroll-pl-0 lg:gap-4 lg:overflow-visible lg:px-0">
          {latest.map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </section>
  );
}
