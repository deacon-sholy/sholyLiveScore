import type { Handler } from '@netlify/functions';
import { LEAGUES } from './leagues';

const SITE = 'https://sholylivescore.netlify.app';

export const handler: Handler = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const url = (loc: string) =>
    `  <url><loc>${loc}</loc><lastmod>${today}</lastmod></url>\n`;
  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    url(`${SITE}/`) +
    LEAGUES.map((l) => url(`${SITE}/league/${l.slug}`)).join('') +
    '</urlset>';

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600',
    },
    body,
  };
};