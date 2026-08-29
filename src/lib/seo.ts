export interface PageSeo {
  title: string;
  description?: string;
  canonical: string;
  jsonLd?: unknown;
}

const SITE = 'https://sholylivescore.netlify.app';

const LEAGUE_META: Record<string, { name: string; country: string }> = {
  'eng.1': { name: 'Premier League', country: 'England' },
  'uefa.champions': { name: 'Champions League', country: 'Europe' },
  'uefa.europa': { name: 'Europa League', country: 'Europe' },
  'uefa.europa.conf': { name: 'Conference League', country: 'Europe' },
  'esp.1': { name: 'La Liga', country: 'Spain' },
  'ita.1': { name: 'Serie A', country: 'Italy' },
  'ger.1': { name: 'Bundesliga', country: 'Germany' },
  'fra.1': { name: 'Ligue 1', country: 'France' },
  'por.1': { name: 'Primeira Liga', country: 'Portugal' },
  'ned.1': { name: 'Eredivisie', country: 'Netherlands' },
  'bel.1': { name: 'Pro League', country: 'Belgium' },
  'tur.1': { name: 'Süper Lig', country: 'Turkey' },
  'sco.1': { name: 'Scottish Premiership', country: 'Scotland' },
  'rus.1': { name: 'Premier League', country: 'Russia' },
  'sui.1': { name: 'Super League', country: 'Switzerland' },
  'aut.1': { name: 'Bundesliga', country: 'Austria' },
  'gre.1': { name: 'Super League', country: 'Greece' },
  'cze.1': { name: 'Fortuna Liga', country: 'Czechia' },
  'den.1': { name: 'Superliga', country: 'Denmark' },
  'nor.1': { name: 'Eliteserien', country: 'Norway' },
  'swe.1': { name: 'Allsvenskan', country: 'Sweden' },
  'fin.1': { name: 'Veikkausliiga', country: 'Finland' },
  'eng.2': { name: 'Championship', country: 'England' },
  'eng.3': { name: 'League One', country: 'England' },
  'esp.2': { name: 'LaLiga 2', country: 'Spain' },
  'ita.2': { name: 'Serie B', country: 'Italy' },
  'ger.2': { name: '2. Bundesliga', country: 'Germany' },
  'fra.2': { name: 'Ligue 2', country: 'France' },
  'usa.1': { name: 'MLS', country: 'USA' },
  'usa.nwsl': { name: 'NWSL', country: 'USA' },
  'mex.1': { name: 'Liga MX', country: 'Mexico' },
  'bra.1': { name: 'Brasileirão Série A', country: 'Brazil' },
  'arg.1': { name: 'Liga Profesional', country: 'Argentina' },
  'col.1': { name: 'Liga BetPlay', country: 'Colombia' },
  'chi.1': { name: 'Primera División', country: 'Chile' },
  'per.1': { name: 'Liga 1', country: 'Peru' },
  'ecu.1': { name: 'LigaPro', country: 'Ecuador' },
  'conmebol.libertadores': { name: 'CONMEBOL Libertadores', country: 'South America' },
  'conmebol.sudamericana': { name: 'CONMEBOL Sudamericana', country: 'South America' },
  'ksa.1': { name: 'Saudi Pro League', country: 'Saudi Arabia' },
  'jpn.1': { name: 'J1 League', country: 'Japan' },
  'chn.1': { name: 'Chinese Super League', country: 'China' },
  'ind.1': { name: 'Indian Super League', country: 'India' },
  'afc.champions': { name: 'AFC Champions League', country: 'Asia' },
};

export function leagueName(slug: string): string {
  return LEAGUE_META[slug]?.name ?? 'Football';
}

export function isKnownLeague(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(LEAGUE_META, slug);
}

export function leagueSlugTitle(slug: string): string {
  return `${leagueName(slug)} · Live Scores & Results | Sholy Livescore`;
}

function upsertMeta(name: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

export function applySeo(seo: PageSeo): void {
  document.title = seo.title;
  if (seo.description) upsertMeta('description', seo.description);
  upsertMeta('og:title', seo.title);
  if (seo.description) upsertMeta('og:description', seo.description);
  upsertMeta('og:url', seo.canonical);

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = `${SITE}${seo.canonical}`;

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