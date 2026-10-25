import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, Newspaper } from 'lucide-react';
import type { NewsArticle } from '../types';
import { fetchNews } from '../lib/api';
import { timeAgo } from '../lib/time';

const REFRESH_MS = 2 * 60_000;
const SIDEBAR_COUNT = 5;
const MOBILE_COUNT = 4;

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
          <Newspaper className="h-6 w-6 text-subtle" />
        </div>
      )}
    </div>
  );
}

function Meta({ article }: { article: NewsArticle }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold text-subtle">
      <span className="min-w-0 flex-1 truncate uppercase tracking-wide">{article.league}</span>
      <span className="inline-flex flex-shrink-0 items-center gap-1 font-medium normal-case tracking-normal">
        <Clock3 className="h-3 w-3" />
        {timeAgo(article.published_at)}
      </span>
    </div>
  );
}

function MobileCard({ article }: { article: NewsArticle }) {
  return (
    <Link
      to={`/news/${article.id}`}
      className="group w-[268px] flex-shrink-0 snap-start overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift sm:w-[300px]"
    >
      <Thumb article={article} className="aspect-video" />
      <div className="space-y-2 p-3">
        <Meta article={article} />
        <h3 className="line-clamp-2 font-display text-sm font-bold leading-snug text-fg transition-colors group-hover:text-accent-600 dark:group-hover:text-accent-400">
          {article.headline}
        </h3>
      </div>
    </Link>
  );
}

function SidebarLead({ article }: { article: NewsArticle }) {
  return (
    <Link to={`/news/${article.id}`} className="group block">
      <Thumb article={article} className="aspect-[16/9]" />
      <div className="px-4 pb-3 pt-3">
        <Meta article={article} />
        <h3 className="mt-1.5 line-clamp-3 font-display text-[14px] font-bold leading-snug text-fg transition-colors group-hover:text-accent-600 dark:group-hover:text-accent-400">
          {article.headline}
        </h3>
      </div>
    </Link>
  );
}

function SidebarRow({ article }: { article: NewsArticle }) {
  return (
    <Link
      to={`/news/${article.id}`}
      className="group flex gap-2.5 px-3.5 py-3 transition-colors hover:bg-elevated"
    >
      <div className="min-w-0 flex-1">
        <Meta article={article} />
        <h3 className="mt-1 line-clamp-2 text-[13px] font-semibold leading-snug text-fg transition-colors group-hover:text-accent-600 dark:group-hover:text-accent-400">
          {article.headline}
        </h3>
      </div>
      <Thumb article={article} className="h-[52px] w-16 flex-shrink-0 rounded-lg" />
    </Link>
  );
}

function MobileSkeleton() {
  return (
    <div className="-mx-4 flex gap-3 overflow-hidden px-4 lg:hidden" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="w-[268px] flex-shrink-0 sm:w-[300px]">
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

function SidebarSkeleton() {
  return (
    <div className="hidden lg:block" aria-hidden>
      <div className="skeleton aspect-[16/9]" />
      <div className="space-y-2 px-4 py-4">
        <div className="skeleton h-2.5 w-24 rounded" />
        <div className="skeleton h-3.5 w-full rounded" />
        <div className="skeleton h-3.5 w-3/4 rounded" />
      </div>
      <div className="divide-y divide-line border-t border-line">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-2.5 px-3.5 py-3">
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-2.5 w-20 rounded" />
              <div className="skeleton h-3.5 w-full rounded" />
              <div className="skeleton h-3.5 w-2/3 rounded" />
            </div>
            <div className="skeleton h-[52px] w-16 flex-shrink-0 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomeNews({ className = '' }: { className?: string }) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const data = await fetchNews();
      setArticles(data);
    } catch {
      // Keep any stories already on screen; the scores page must not break
      // because a news feed is briefly down.
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

  const sidebar = articles.slice(0, SIDEBAR_COUNT);
  const mobile = articles.slice(0, MOBILE_COUNT);
  const [lead, ...rows] = sidebar;

  return (
    <aside
      aria-labelledby="home-news-heading"
      className={`min-w-0 lg:overflow-hidden lg:rounded-2xl lg:border lg:border-line lg:bg-surface lg:shadow-card ${className}`}
    >
      <div className="mb-3 flex items-end justify-between gap-3 lg:mb-0 lg:items-center lg:border-b lg:border-line lg:px-4 lg:py-3.5">
        <div>
          <h2
            id="home-news-heading"
            className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-fg sm:text-xl lg:text-[15px]"
          >
            <Newspaper className="h-4 w-4 text-accent-500" />
            Latest news
          </h2>
          <p className="mt-0.5 text-xs text-muted sm:text-[13px] lg:hidden">
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
        <>
          <MobileSkeleton />
          <SidebarSkeleton />
        </>
      ) : sidebar.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-4 text-xs text-muted lg:rounded-none lg:border-0 lg:px-4 lg:py-5">
          News is unavailable right now.{' '}
          <Link to="/news" className="font-semibold text-accent-600 hover:underline dark:text-accent-400">
            Visit the news page
          </Link>
        </div>
      ) : (
        <>
          {/* Phones and tablets: a swipeable rail above the scores. */}
          <div className="-mx-4 flex snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto px-4 pb-1 no-scrollbar lg:hidden">
            {mobile.map((article) => (
              <MobileCard key={article.id} article={article} />
            ))}
          </div>

          {/* Desktop: livescore-style sidebar column. */}
          <div className="hidden lg:block">
            {lead && <SidebarLead article={lead} />}
            {rows.length > 0 && (
              <div className="divide-y divide-line border-t border-line">
                {rows.map((article) => (
                  <SidebarRow key={article.id} article={article} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
