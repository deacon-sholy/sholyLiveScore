export type LeagueGroup = 'europe' | 'americas' | 'asia' | 'international';

export interface LeagueDef {
  slug: string;
  name: string;
  country: string;
  group: LeagueGroup;
  /**
   * Display name used for SEO/sitemap. Only needed where the short name
   * collides with another league in the list (e.g. two "Premier League"s).
   */
  seoName?: string;
  /**
   * ESPN returns an empty `children` for competitions with no table
   * (friendlies, some women's leagues), so we hide the standings button.
   */
  standings?: boolean;
}

// Curated list of the world's biggest competitions, in display order.
// The order below is the display order on the home page and in the sitemap.
// Empty scoreboards are skipped, so leagues outside their season (or in
// between tournament windows) simply don't show up.
export const LEAGUES: LeagueDef[] = [
  // International (senior men's national teams)
  { slug: 'fifa.world', name: 'FIFA World Cup', country: 'International', group: 'international', seoName: 'World Cup' },
  { slug: 'uefa.euro', name: 'UEFA European Championship', country: 'International', group: 'international', seoName: 'Euro' },
  { slug: 'fifa.cwc', name: 'FIFA Club World Cup', country: 'International', group: 'international', seoName: 'Club World Cup' },
  { slug: 'uefa.nations', name: 'UEFA Nations League', country: 'International', group: 'international' },
  { slug: 'fifa.worldq.uefa', name: 'World Cup Qualifying', country: 'Europe', group: 'international', seoName: 'World Cup Qualifying Europe' },
  { slug: 'fifa.worldq.conmebol', name: 'World Cup Qualifying', country: 'South America', group: 'international', seoName: 'World Cup Qualifying CONMEBOL' },
  { slug: 'fifa.worldq.concacaf', name: 'World Cup Qualifying', country: 'North America', group: 'international', seoName: 'World Cup Qualifying Concacaf' },
  { slug: 'fifa.worldq.afc', name: 'World Cup Qualifying', country: 'Asia', group: 'international', seoName: 'World Cup Qualifying AFC' },
  { slug: 'fifa.worldq.caf', name: 'World Cup Qualifying', country: 'Africa', group: 'international', seoName: 'World Cup Qualifying CAF' },
  { slug: 'fifa.friendly', name: 'International Friendlies', country: 'International', group: 'international', standings: false },

  // Europe - top flights & cups
  { slug: 'eng.1', name: 'Premier League', country: 'England', group: 'europe' },
  { slug: 'uefa.champions', name: 'Champions League', country: 'Europe', group: 'europe' },
  { slug: 'uefa.europa', name: 'Europa League', country: 'Europe', group: 'europe' },
  { slug: 'uefa.europa.conf', name: 'Conference League', country: 'Europe', group: 'europe' },
  { slug: 'esp.1', name: 'La Liga', country: 'Spain', group: 'europe' },
  { slug: 'ita.1', name: 'Serie A', country: 'Italy', group: 'europe' },
  { slug: 'ger.1', name: 'Bundesliga', country: 'Germany', group: 'europe' },
  { slug: 'fra.1', name: 'Ligue 1', country: 'France', group: 'europe' },
  { slug: 'por.1', name: 'Primeira Liga', country: 'Portugal', group: 'europe' },
  { slug: 'ned.1', name: 'Eredivisie', country: 'Netherlands', group: 'europe' },
  { slug: 'bel.1', name: 'Pro League', country: 'Belgium', group: 'europe' },
  { slug: 'tur.1', name: 'Süper Lig', country: 'Turkey', group: 'europe' },
  { slug: 'sco.1', name: 'Scottish Premiership', country: 'Scotland', group: 'europe' },
  { slug: 'rus.1', name: 'Premier League', country: 'Russia', group: 'europe', seoName: 'Russian Premier League' },
  { slug: 'sui.1', name: 'Super League', country: 'Switzerland', group: 'europe', seoName: 'Swiss Super League' },
  { slug: 'aut.1', name: 'Bundesliga', country: 'Austria', group: 'europe', seoName: 'Austrian Bundesliga' },
  { slug: 'gre.1', name: 'Super League', country: 'Greece', group: 'europe', seoName: 'Greek Super League' },
  { slug: 'cze.1', name: 'Fortuna Liga', country: 'Czechia', group: 'europe' },
  { slug: 'den.1', name: 'Superliga', country: 'Denmark', group: 'europe', seoName: 'Danish Superliga' },
  { slug: 'nor.1', name: 'Eliteserien', country: 'Norway', group: 'europe' },
  { slug: 'swe.1', name: 'Allsvenskan', country: 'Sweden', group: 'europe' },
  { slug: 'fin.1', name: 'Veikkausliiga', country: 'Finland', group: 'europe' },
  // Europe - second tiers
  { slug: 'eng.2', name: 'Championship', country: 'England', group: 'europe' },
  { slug: 'eng.3', name: 'League One', country: 'England', group: 'europe' },
  { slug: 'esp.2', name: 'LaLiga 2', country: 'Spain', group: 'europe' },
  { slug: 'ita.2', name: 'Serie B', country: 'Italy', group: 'europe' },
  { slug: 'ger.2', name: '2. Bundesliga', country: 'Germany', group: 'europe' },
  { slug: 'fra.2', name: 'Ligue 2', country: 'France', group: 'europe' },
  // Europe - women's top flights
  { slug: 'eng.w.1', name: "Women's Super League", country: 'England', group: 'europe', seoName: "Women's Super League" },
  // Americas
  { slug: 'usa.1', name: 'MLS', country: 'USA', group: 'americas' },
  { slug: 'usa.nwsl', name: 'NWSL', country: 'USA', group: 'americas' },
  { slug: 'mex.1', name: 'Liga MX', country: 'Mexico', group: 'americas' },
  { slug: 'bra.1', name: 'Brasileirão Série A', country: 'Brazil', group: 'americas' },
  { slug: 'arg.1', name: 'Liga Profesional', country: 'Argentina', group: 'americas' },
  { slug: 'col.1', name: 'Liga BetPlay', country: 'Colombia', group: 'americas' },
  { slug: 'chi.1', name: 'Primera División', country: 'Chile', group: 'americas' },
  { slug: 'per.1', name: 'Liga 1', country: 'Peru', group: 'americas' },
  { slug: 'ecu.1', name: 'LigaPro', country: 'Ecuador', group: 'americas' },
  { slug: 'conmebol.libertadores', name: 'CONMEBOL Libertadores', country: 'South America', group: 'americas' },
  { slug: 'conmebol.sudamericana', name: 'CONMEBOL Sudamericana', country: 'South America', group: 'americas' },
  // Asia & Middle East
  { slug: 'ksa.1', name: 'Saudi Pro League', country: 'Saudi Arabia', group: 'asia' },
  { slug: 'jpn.1', name: 'J1 League', country: 'Japan', group: 'asia' },
  { slug: 'chn.1', name: 'Chinese Super League', country: 'China', group: 'asia' },
  { slug: 'ind.1', name: 'Indian Super League', country: 'India', group: 'asia' },
  { slug: 'afc.champions', name: 'AFC Champions League', country: 'Asia', group: 'asia' },
];

export const LEAGUE_INDEX = new Map(LEAGUES.map((league, index) => [league.slug, index]));

const LEAGUE_BY_SLUG = new Map(LEAGUES.map((league) => [league.slug, league]));

export function getLeague(slug: string): LeagueDef | undefined {
  return LEAGUE_BY_SLUG.get(slug);
}

export function isKnownLeague(slug: string): boolean {
  return LEAGUE_BY_SLUG.has(slug);
}

/** Name used in page titles / sitemap, disambiguated where names collide. */
export function leagueSeoName(slug: string): string {
  const league = LEAGUE_BY_SLUG.get(slug);
  return league?.seoName ?? league?.name ?? 'Football';
}
