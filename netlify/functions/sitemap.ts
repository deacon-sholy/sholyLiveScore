import type { Handler } from '@netlify/functions';
import { LEAGUES } from '../../src/lib/leagues';

const SITE = 'https://sholylivescore.netlify.app';

export const handler: Handler = async () => {
  // No <lastmod>: we have no reliable per-page modification date, and inventing
  // "today" on every request tells crawlers every page changes constantly.
  const url = (loc: string, priority: string, changefreq: string) =>
    `  <url><loc>${loc}</loc><changefreq>${changefreq}</changefreq>` +
    `<priority>${priority}</priority></url>\n`;

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    url(`${SITE}/`, '1.0', 'hourly') +
    LEAGUES.map((l) => url(`${SITE}/league/${l.slug}`, '0.8', 'daily')).join('') +
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
