import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, ChevronLeft, Clock3, Newspaper } from 'lucide-react';
import type { NewsArticleDetail } from '../types';
import { fetchNewsArticle } from '../lib/api';
import SiteHeader from '../components/SiteHeader';
import { applySeo, SITE } from '../lib/seo';
import { fullDate, timeAgo } from '../lib/time';

export default function NewsArticlePage() {
  const { newsId = '' } = useParams();
  const [article, setArticle] = useState<NewsArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setArticle(null);
    setError(null);

    fetchNewsArticle(newsId)
      .then((data) => {
        if (alive) setArticle(data);
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : 'Story unavailable');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [newsId]);

  useEffect(() => {
    const title = article
      ? `${article.headline} | Sholy Livescore`
      : 'Football News | Sholy Livescore';
    const description =
      article?.description ||
      'Football news, transfers and match reports from ESPN, published on Sholy Livescore.';

    applySeo({
      title,
      description,
      canonical: `/news/${newsId}`,
      jsonLd: article
        ? {
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: article.headline,
            description: article.description,
            datePublished: article.published_at,
            articleSection: article.league,
            author: article.byline
              ? { '@type': 'Person', name: article.byline }
              : { '@type': 'Organization', name: 'ESPN' },
            publisher: { '@type': 'Organization', name: 'ESPN' },
            image: article.image_url ? [article.image_url] : undefined,
            mainEntityOfPage: `${SITE}/news/${article.id}`,
            url: `${SITE}/news/${article.id}`,
          }
        : undefined,
    });
  }, [article, newsId]);

  return (
    <>
      <SiteHeader>
        <div className="flex items-center gap-2 pb-2.5 pt-2.5 text-sm sm:pb-3 sm:pt-3">
          <Link
            to="/news"
            className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-line-strong hover:text-fg"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            News
          </Link>
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-muted">
            {article?.league ?? 'Football news'}
          </span>
        </div>
      </SiteHeader>

      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-6">
        {loading ? (
          <div className="space-y-4" aria-hidden>
            <div className="skeleton h-5 w-24 rounded" />
            <div className="skeleton h-16 rounded-xl" />
            <div className="skeleton aspect-video rounded-2xl" />
            <div className="space-y-2.5">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton h-4 rounded" />
              ))}
            </div>
          </div>
        ) : error || !article ? (
          <div className="mx-auto flex min-h-[360px] max-w-xl flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-fg">This story isn't available</p>
              <p className="mt-1 text-xs text-muted">{error ?? 'It may have been removed or moved.'}</p>
            </div>
            <Link
              to="/news"
              className="rounded-xl bg-fg px-5 py-2.5 text-sm font-semibold text-canvas transition-opacity hover:opacity-85"
            >
              Back to news
            </Link>
          </div>
        ) : (
          <article>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-line bg-elevated px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                {article.league}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-subtle">
                <Clock3 className="h-3 w-3" />
                {timeAgo(article.published_at)}
              </span>
            </div>

            <h1 className="mt-3 font-display text-2xl font-extrabold leading-tight tracking-tight text-fg sm:text-3xl">
              {article.headline}
            </h1>

            {article.description && (
              <p className="mt-3 text-[15px] leading-7 text-muted">{article.description}</p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-y border-line py-2.5 text-[11px] font-medium text-subtle">
              {article.byline && (
                <>
                  <span>{article.byline}</span>
                  <span aria-hidden>·</span>
                </>
              )}
              <span>{fullDate(article.published_at)}</span>
            </div>

            {article.image_url && (
              <img
                src={article.image_url}
                alt={article.headline}
                className="mt-5 aspect-video w-full rounded-2xl border border-line object-cover"
              />
            )}

            <div className="mt-5 space-y-4">
              {article.blocks.map((block, index) =>
                block.type === 'h2' ? (
                  <h2
                    key={index}
                    className="pt-2 font-display text-lg font-extrabold leading-snug text-fg sm:text-xl"
                  >
                    {block.text}
                  </h2>
                ) : (
                  <p key={index} className="text-[15px] leading-7 text-fg/90">
                    {block.text}
                  </p>
                ),
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-subtle">
                <Newspaper className="h-3.5 w-3.5" />
                Source: ESPN
              </span>
              <Link
                to="/news"
                className="rounded-xl bg-fg px-4 py-2 text-xs font-semibold text-canvas transition-opacity hover:opacity-85"
              >
                More football news
              </Link>
            </div>
          </article>
        )}
      </main>
    </>
  );
}
