export interface LeagueDef {
  slug: string;
  name: string;
  country: string;
}

// Curated list of the world's biggest competitions, in display order
// (premier league first). Empty scoreboards are skipped, so leagues outside
// their season simply don't show up.
export const LEAGUES: LeagueDef[] = [
  // Europe - top flights & cups
  { slug: 'eng.1', name: 'Premier League', country: 'England' },
  { slug: 'uefa.champions', name: 'Champions League', country: 'Europe' },
  { slug: 'uefa.europa', name: 'Europa League', country: 'Europe' },
  { slug: 'uefa.europa.conf', name: 'Conference League', country: 'Europe' },
  { slug: 'esp.1', name: 'La Liga', country: 'Spain' },
  { slug: 'ita.1', name: 'Serie A', country: 'Italy' },
  { slug: 'ger.1', name: 'Bundesliga', country: 'Germany' },
  { slug: 'fra.1', name: 'Ligue 1', country: 'France' },
  { slug: 'por.1', name: 'Primeira Liga', country: 'Portugal' },
  { slug: 'ned.1', name: 'Eredivisie', country: 'Netherlands' },
  { slug: 'bel.1', name: 'Pro League', country: 'Belgium' },
  { slug: 'tur.1', name: 'Süper Lig', country: 'Turkey' },
  { slug: 'sco.1', name: 'Scottish Premiership', country: 'Scotland' },
  { slug: 'rus.1', name: 'Premier League', country: 'Russia' },
  { slug: 'sui.1', name: 'Super League', country: 'Switzerland' },
  { slug: 'aut.1', name: 'Bundesliga', country: 'Austria' },
  { slug: 'gre.1', name: 'Super League', country: 'Greece' },
  { slug: 'cze.1', name: 'Fortuna Liga', country: 'Czechia' },
  { slug: 'den.1', name: 'Superliga', country: 'Denmark' },
  { slug: 'nor.1', name: 'Eliteserien', country: 'Norway' },
  { slug: 'swe.1', name: 'Allsvenskan', country: 'Sweden' },
  { slug: 'fin.1', name: 'Veikkausliiga', country: 'Finland' },
  // Europe - second tiers
  { slug: 'eng.2', name: 'Championship', country: 'England' },
  { slug: 'eng.3', name: 'League One', country: 'England' },
  { slug: 'esp.2', name: 'LaLiga 2', country: 'Spain' },
  { slug: 'ita.2', name: 'Serie B', country: 'Italy' },
  { slug: 'ger.2', name: '2. Bundesliga', country: 'Germany' },
  { slug: 'fra.2', name: 'Ligue 2', country: 'France' },
  // Americas
  { slug: 'usa.1', name: 'MLS', country: 'USA' },
  { slug: 'usa.nwsl', name: 'NWSL', country: 'USA' },
  { slug: 'mex.1', name: 'Liga MX', country: 'Mexico' },
  { slug: 'bra.1', name: 'Brasileirão Série A', country: 'Brazil' },
  { slug: 'arg.1', name: 'Liga Profesional', country: 'Argentina' },
  { slug: 'col.1', name: 'Liga BetPlay', country: 'Colombia' },
  { slug: 'chi.1', name: 'Primera División', country: 'Chile' },
  { slug: 'per.1', name: 'Liga 1', country: 'Peru' },
  { slug: 'ecu.1', name: 'LigaPro', country: 'Ecuador' },
  { slug: 'conmebol.libertadores', name: 'CONMEBOL Libertadores', country: 'South America' },
  { slug: 'conmebol.sudamericana', name: 'CONMEBOL Sudamericana', country: 'South America' },
  // Middle East & Asia
  { slug: 'ksa.1', name: 'Saudi Pro League', country: 'Saudi Arabia' },
  { slug: 'jpn.1', name: 'J1 League', country: 'Japan' },
  { slug: 'chn.1', name: 'Chinese Super League', country: 'China' },
  { slug: 'ind.1', name: 'Indian Super League', country: 'India' },
  { slug: 'afc.champions', name: 'AFC Champions League', country: 'Asia' },
];

export const LEAGUE_INDEX = new Map(LEAGUES.map((league, index) => [league.slug, index]));