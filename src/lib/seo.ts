import { LEAGUES, leagueSeoName, type LeagueDef } from './leagues';

export interface PageSeo {
  title: string;
  description?: string;
  canonical: string;
  jsonLd?: unknown;
}

const SITE = 'https://sholylivescore.netlify.app';

/** Human label for a league, disambiguated only where names collide. */
export function leagueName(slug: string): string {
  const def = LEAGUES.find((l) => l.slug === slug) as LeagueDef | undefined;
  return def?.name ?? 'Football';
}

export function isKnownLeague(slug: string): boolean {
  return LEAGUES.some((l) => l.slug === slug);
}

export function leagueCountry(slug: string): string {
  return LEAGUES.find((l) => l.slug === slug)?.country ?? 'International';
}

export function leagueSlugTitle(slug: string): string {
  return `${leagueSeoName(slug)} · Live Scores & Results | Sholy Livescore`;
}

function upsertMeta(selectorName: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${selectorName}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(selectorName, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

export function applySeo(seo: PageSeo): void {
  document.title = seo.title;
  const description = seo.description;
  const url = `${SITE}${seo.canonical}`;

  if (description) upsertMeta('name', 'description', description);

  // Open Graph uses `property`, Twitter cards use `name`. Both need absolute URLs.
  upsertMeta('property', 'og:title', seo.title);
  if (description) upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:url', url);
  upsertMeta('property', 'og:type', 'website');
  upsertMeta('property', 'og:site_name', 'Sholy Livescore');

  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', seo.title);
  if (description) upsertMeta('name', 'twitter:description', description);

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = url;

  document.getElementById('seo-jsonld')?.remove();
  if (seo.jsonLd) {
    const script = document.createElement('script');
    script.id = 'seo-jsonld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(seo.jsonLd);
    document.head.appendChild(script);
  }
}

export { SITE };
