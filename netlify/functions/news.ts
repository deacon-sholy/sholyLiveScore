import type { Handler, HandlerEvent } from '@netlify/functions';

// ESPN's public news feeds are keyless and share the same data source as the
// scoreboards. We aggregate a few so the feed has global stories plus African
// coverage without one quiet league emptying the page.
const ESPN_NEWS_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

const SOURCES = [
  { slug: 'all', label: 'Football', limit: 40 },
  { slug: 'eng.1', label: 'Premier League', limit: 10 },
  { slug: 'uefa.champions', label: 'Champions League', limit: 8 },
  { slug: 'nga.1', label: 'Nigeria', limit: 8 },
  { slug: 'rsa.1', label: 'South Africa', limit: 6 },
  { slug: 'caf.champions', label: 'CAF', limit: 8 },
  { slug: 'caf.nations', label: 'Africa', limit: 6 },
];

const READABLE_TYPES = new Set(['story', 'headlinenews', 'recap']);
const CACHE_TTL = 120_000;
const MAX_ARTICLES = 60;
const MAX_AGE_MS = 45 * 24 * 60 * 60 * 1000;

interface EspnImage {
  type?: string;
  url?: string;
}

interface EspnCategory {
  type?: string;
  description?: string;
}

interface EspnArticle {
  id?: number | string;
  type?: string;
  headline?: string;
  description?: string;
  published?: string;
  byline?: string;
  premium?: boolean;
  images?: EspnImage[];
  categories?: EspnCategory[];
  links?: { web?: { href?: string } };
}

interface EspnNewsResponse {
  articles?: EspnArticle[];
}

interface NewsArticle {
  id: string;
  headline: string;
  description: string;
  published_at: string;
  image_url: string | null;
  url: string;
  byline: string | null;
  league: string;
}

function corsHeaders(origin: string | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
  if (origin && /^https:\/\/([a-z0-9-]+\.)*netlify\.app$/.test(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function jsonResponse(statusCode: number, body: unknown, origin?: string) {
  return {
    statusCode,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
    },
    body: JSON.stringify(body),
  };
}

function leagueTag(article: EspnArticle, fallback: string): string {
  const category = (article.categories ?? []).find(
    (c) =>
      c.type === 'league' &&
      typeof c.description === 'string' &&
      c.description.length > 0 &&
      c.description.toLowerCase() !== 'soccer',
  );
  return category?.description ?? fallback;
}

function mapArticle(article: EspnArticle, fallbackLeague: string): NewsArticle | null {
  const headline = article.headline?.trim();
  const url = article.links?.web?.href;
  const type = article.type?.toLowerCase() ?? '';
  if (!headline || !url || !/^https?:\/\//.test(url) || !READABLE_TYPES.has(type)) return null;
  if (article.premium) return null;

  const image = article.images?.find((i) => i.type === 'header') ?? article.images?.[0];
  const description = (article.description ?? '').trim();

  return {
    id: String(article.id ?? url),
    headline,
    description: description.length > 240 ? `${description.slice(0, 237).trimEnd()}...` : description,
    published_at: article.published ?? '',
    image_url: image?.url ?? null,
    url,
    byline: article.byline?.trim() || null,
    league: leagueTag(article, fallbackLeague),
  };
}

async function fetchSource(source: (typeof SOURCES)[number]): Promise<NewsArticle[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const url = `${ESPN_NEWS_BASE}/${source.slug}/news?limit=${source.limit}`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'curl/8.7.1' },
      signal: controller.signal,
    });
    if (!response.ok) return [];
    const json = (await response.json()) as EspnNewsResponse;
    const cutoff = Date.now() - MAX_AGE_MS;
    return (json.articles ?? [])
      .map((article) => mapArticle(article, source.label))
      .filter(
        (article): article is NewsArticle =>
          article !== null && new Date(article.published_at).getTime() >= cutoff,
      );
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

let cached: { articles: NewsArticle[]; timestamp: number } | null = null;

export const handler: Handler = async (event: HandlerEvent) => {
  const origin = event.headers?.origin;
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { ...corsHeaders(origin), 'Content-Type': 'text/plain' }, body: '' };
  }

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return jsonResponse(200, { articles: cached.articles }, origin);
  }

  const feeds = await Promise.all(SOURCES.map((source) => fetchSource(source)));

  // The same story can appear in several league feeds; keep the newest copy
  // and drop duplicate headlines from regional variants.
  const byId = new Map<string, NewsArticle>();
  const seenHeadlines = new Set<string>();
  for (const article of feeds.flat()) {
    const headlineKey = article.headline.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (byId.has(article.id) || seenHeadlines.has(headlineKey)) continue;
    byId.set(article.id, article);
    seenHeadlines.add(headlineKey);
  }

  const articles = [...byId.values()]
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    .slice(0, MAX_ARTICLES);

  if (articles.length === 0) {
    // Keep the last good feed rather than replacing it with an error if ESPN
    // is briefly unreachable.
    if (cached) return jsonResponse(200, { articles: cached.articles }, origin);
    return jsonResponse(502, { error: 'News unavailable' }, origin);
  }

  cached = { articles, timestamp: Date.now() };
  return jsonResponse(200, { articles }, origin);
};
