import type { Handler } from '@netlify/functions';
import { LEAGUES } from '../../src/lib/leagues';

const SITE = 'https://sholylivescore.netlify.app';
const NEWS_FEED = 'https://site.api.espn.com/apis/site/v2/sports/soccer/all/news?limit=50';
const READABLE_TYPES = new Set(['story', 'headlinenews', 'recap']);

interface EspnFeedArticle {
  id?: number | string;
  type?: string;
  links?: { web?: { href?: string } };
}

/** Recent story IDs, best-effort: a slow ESPN response must not block the map. */
async function recentArticleIds(): Promise<string[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(NEWS_FEED, {
      headers: { Accept: 'application/json', 'User-Agent': 'curl/8.7.1' },
      signal: controller.signal,
    });
    if (!response.ok) return [];
    const json = (await response.json()) as { articles?: EspnFeedArticle[] };
    return (json.articles ?? [])
      .filter(
        (article) =>
          article.id !== undefined &&
          article.id !== null &&
          READABLE_TYPES.has((article.type ?? '').toLowerCase()) &&
          Boolean(article.links?.web?.href),
      )
      .slice(0, 50)
      .map((article) => String(article.id));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export const handler: Handler = async () => {
  // No <lastmod>: we have no reliable per-page modification date, and inventing
  // "today" on every request tells crawlers every page changes constantly.
  const url = (loc: string, priority: string, changefreq: string) =>
    `  <url><loc>${loc}</loc><changefreq>${changefreq}</changefreq>` +
    `<priority>${priority}</priority></url>\n`;

  const articleIds = await recentArticleIds();
  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    url(`${SITE}/`, '1.0', 'hourly') +
    url(`${SITE}/news`, '0.7', 'hourly') +
    url(`${SITE}/download`, '0.7', 'weekly') +
    LEAGUES.map((l) => url(`${SITE}/league/${l.slug}`, '0.8', 'daily')).join('') +
    articleIds.map((id) => url(`${SITE}/news/${id}`, '0.6', 'daily')).join('') +
    '</urlset>';

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
    body,
  };
};
