import type { Handler, HandlerEvent } from '@netlify/functions';

// ESPN's public news feeds are keyless and share the same data source as the
// scoreboards. We aggregate a few so the feed has global stories plus African
// coverage without one quiet league emptying the page.
const ESPN_NEWS_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const ESPN_ARTICLE_BASE = 'https://now.core.api.espn.com/v1/sports/news';

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
const ARTICLE_CACHE_TTL = 10 * 60_000;
const MAX_ARTICLES = 60;
const MAX_AGE_MS = 45 * 24 * 60 * 60 * 1000;

interface EspnImage {
  type?: string;
  url?: string;
}

interface EspnCategory {
  type?: string;
  description?: string;
  sportId?: number;
}

interface EspnArticle {
  id?: number | string;
  type?: string;
  headline?: string;
  description?: string;
  published?: string;
  byline?: string;
  premium?: boolean;
  story?: string;
  root?: string;
  images?: EspnImage[];
  categories?: EspnCategory[];
  links?: { web?: { href?: string } };
}

interface EspnNewsResponse {
  articles?: EspnArticle[];
  headlines?: EspnArticle[];
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

interface NewsBlock {
  type: 'p' | 'h2';
  text: string;
}

interface NewsArticleDetail extends NewsArticle {
  blocks: NewsBlock[];
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

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '...',
  mdash: '-',
  ndash: '-',
  lsquo: "'",
  rsquo: "'",
  ldquo: '"',
  rdquo: '"',
  eacute: 'é',
  egrave: 'è',
  agrave: 'à',
  ccedil: 'ç',
  uuml: 'ü',
  ouml: 'ö',
  auml: 'ä',
  ntilde: 'ñ',
  ocirc: 'ô',
  icirc: 'î',
  ecirc: 'ê',
};

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (match, hex: string) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    })
    .replace(/&#(\d+);/g, (match, dec: string) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    })
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match);
}

// ESPN serves article bodies as HTML with custom placeholders (<video1>,
// <photo caption>, <inline1>). We never render that HTML: convert it to plain
// text blocks so the reader stays on our site and there is no XSS surface.
function htmlToBlocks(html: string): NewsBlock[] {
  const blocks: NewsBlock[] = [];
  const tagPattern = /<(h2|h3|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const raw = match[2]
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]*>/g, ' ');
    const text = decodeEntities(raw).replace(/\s+/g, ' ').trim();
    if (!text) continue;
    if (tag === 'li') {
      blocks.push({ type: 'p', text: `• ${text}` });
    } else {
      blocks.push({ type: tag === 'h2' || tag === 'h3' ? 'h2' : 'p', text });
    }
  }

  if (blocks.length === 0) {
    const text = decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (text) blocks.push({ type: 'p', text });
  }

  return blocks;
}

function isSoccerArticle(article: EspnArticle): boolean {
  if (article.root === 'soccer') return true;
  return (article.categories ?? []).some((category) => category.sportId === 600);
}

function mapArticleDetail(article: EspnArticle): NewsArticleDetail | null {
  const base = mapArticle(article, 'Football');
  if (!base) return null;

  const description = (article.description ?? '').trim();
  const blocks = htmlToBlocks(article.story ?? '');
  return {
    ...base,
    description,
    blocks: blocks.length > 0 ? blocks : description ? [{ type: 'p', text: description }] : [],
  };
}

async function fetchArticle(id: string): Promise<EspnArticle | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`${ESPN_ARTICLE_BASE}/${id}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'curl/8.7.1' },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const json = (await response.json()) as EspnNewsResponse;
    const article = json.headlines?.[0] ?? json.articles?.[0] ?? null;
    return article && isSoccerArticle(article) ? article : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
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
const articleCache = new Map<string, { article: NewsArticleDetail; timestamp: number }>();

function cacheArticle(id: string, article: NewsArticleDetail): void {
  if (articleCache.size > 200) {
    const oldest = [...articleCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (const [key] of oldest.slice(0, articleCache.size - 200)) articleCache.delete(key);
  }
  articleCache.set(id, { article, timestamp: Date.now() });
}

export const handler: Handler = async (event: HandlerEvent) => {
  const origin = event.headers?.origin;
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { ...corsHeaders(origin), 'Content-Type': 'text/plain' }, body: '' };
  }

  // GET /news?id=<espn-article-id> → one story, converted to plain text blocks
  // so it can be read on this site instead of sending readers to ESPN.
  const articleId = event.queryStringParameters?.id?.trim();
  if (articleId) {
    if (!/^\d+$/.test(articleId)) {
      return jsonResponse(400, { error: 'Invalid story id' }, origin);
    }
    const entry = articleCache.get(articleId);
    if (entry && Date.now() - entry.timestamp < ARTICLE_CACHE_TTL) {
      return jsonResponse(200, { article: entry.article }, origin);
    }

    const raw = await fetchArticle(articleId);
    const article = raw ? mapArticleDetail(raw) : null;
    if (article) {
      cacheArticle(articleId, article);
      return jsonResponse(200, { article }, origin);
    }
    if (entry) return jsonResponse(200, { article: entry.article }, origin);
    return jsonResponse(404, { error: 'Story unavailable' }, origin);
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
