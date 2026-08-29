import type { Handler, HandlerEvent } from '@netlify/functions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// ESPN's public soccer API is free, requires no key and covers 100+ leagues.
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

interface LeagueDef {
  slug: string;
  name: string;
  country: string;
}

// Curated list of the world's biggest competitions. Empty scoreboards are
// skipped, so leagues outside their season simply don't show up.
const LEAGUES: LeagueDef[] = [
  // Europe - top flights
  { slug: 'eng.1', name: 'Premier League', country: 'England' },
  { slug: 'esp.1', name: 'La Liga', country: 'Spain' },
  { slug: 'ita.1', name: 'Serie A', country: 'Italy' },
  { slug: 'ger.1', name: 'Bundesliga', country: 'Germany' },
  { slug: 'fra.1', name: 'Ligue 1', country: 'France' },
  { slug: 'por.1', name: 'Primeira Liga', country: 'Portugal' },
  { slug: 'ned.1', name: 'Eredivisie', country: 'Netherlands' },
  { slug: 'bel.1', name: 'Pro League', country: 'Belgium' },
  { slug: 'sco.1', name: 'Scottish Premiership', country: 'Scotland' },
  { slug: 'tur.1', name: 'Süper Lig', country: 'Turkey' },
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
  // UEFA & continental cups
  { slug: 'uefa.champions', name: 'Champions League', country: 'Europe' },
  { slug: 'uefa.europa', name: 'Europa League', country: 'Europe' },
  { slug: 'uefa.europa.conf', name: 'Conference League', country: 'Europe' },
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
  // Asia
  { slug: 'jpn.1', name: 'J1 League', country: 'Japan' },
  { slug: 'chn.1', name: 'Chinese Super League', country: 'China' },
  { slug: 'afc.champions', name: 'AFC Champions League', country: 'Asia' },
];

const LEAGUE_INDEX = new Map(LEAGUES.map((league, index) => [league.slug, index]));

// In-memory cache (a warm Lambda/Netlify instance keeps it alive).
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 60_000; // 60s for scoreboards
const MATCH_CACHE_TTL = 30_000; // 30s for match details
const STANDINGS_CACHE_TTL = 5 * 60_000; // 5min for standings

function getCached(key: string, ttl: number = CACHE_TTL): unknown | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < ttl) {
    return entry.data;
  }
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ---------------------------------------------------------------------------
// HTTP + concurrency helpers
// ---------------------------------------------------------------------------

async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      // ESPN's anti-bot layer rejects unknown/non-browser User-Agents (e.g.
      // Deno's default), so we send a plain, widely-accepted one that is known
      // to return 200.
      headers: { Accept: 'application/json', 'User-Agent': 'curl/8.7.1' },
      signal: controller.signal,
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Runs `fn` over `items` with at most `limit` concurrent tasks. Individual
// failures never reject the batch — a bad league just comes back null.
async function runLimited<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<unknown>,
): Promise<unknown[]> {
  const results: unknown[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      try {
        results[index] = await fn(items[index]);
      } catch {
        results[index] = null;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

function jsonResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function normalizeDateParam(raw: string | null | undefined): string | null {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return raw;
}

// ---------------------------------------------------------------------------
// ESPN → app data model
// ---------------------------------------------------------------------------

type MatchStatus = 'scheduled' | 'live' | 'halftime' | 'finished';

interface MatchEvent {
  type: string;
  minute: number;
  player_name: string;
  detail: string;
  team_id: string | null;
  team_name: string | null;
}

interface Team {
  id: string;
  name: string;
  short_name: string | null;
  logo: string | null;
  color: string | null;
}

interface Match {
  id: string;
  league_slug: string;
  league_name: string;
  league_country: string;
  league_logo: string | null;
  kickoff: string;
  status: MatchStatus;
  status_detail: string;
  minute: number | null;
  home_team: Team;
  away_team: Team;
  home_score: number;
  away_score: number;
  events: MatchEvent[];
}

interface LeagueWithMatches {
  id: string;
  name: string;
  country: string;
  logo: string | null;
  slug: string;
  matches: Match[];
}

interface StandingTeam {
  position: number;
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

interface StandingsData {
  league: string;
  teams: StandingTeam[];
}

interface EspnTeamRef {
  id: string;
  displayName: string;
  abbreviation?: string;
  shortDisplayName?: string;
  logo?: string;
  color?: string;
}

interface EspnCompetitor {
  homeAway: string;
  score?: string;
  team: EspnTeamRef;
}

interface EspnDetail {
  clock?: { displayValue?: string };
  scoringPlay?: boolean;
  redCard?: boolean;
  penaltyKick?: boolean;
  ownGoal?: boolean;
  yellowCard?: boolean;
  team?: { id: string; displayName?: string };
  participants?: Array<{ athlete: { displayName: string } }>;
  athletesInvolved?: Array<{ displayName: string; team?: { id: string } }>;
  type?: { text?: string };
}

interface EspnCompetition {
  status?: {
    clock?: { displayValue?: string };
    type: { state: string; shortDetail?: string };
  };
  competitors?: EspnCompetitor[];
  details?: EspnDetail[];
}

interface EspnEvent {
  id: string;
  date: string;
  competitions?: EspnCompetition[];
}

interface EspnScoreboard {
  events?: EspnEvent[];
  leagues?: Array<{ logos?: Array<{ href: string }> }>;
}

interface EspnStandingEntry {
  team?: { displayName?: string; name?: string };
  stats?: Array<{ name: string; displayValue: string }>;
}

function mapStatus(state: string, clockDisplay?: string): MatchStatus {
  switch (state) {
    case 'in': {
      if (clockDisplay?.toUpperCase() === 'HT' || clockDisplay?.toUpperCase().startsWith('HALF')) {
        return 'halftime';
      }
      return 'live';
    }
    case 'post':
      return 'finished';
    default:
      return 'scheduled';
  }
}

function parseMinute(clockDisplay: string): number | null {
  const match = clockDisplay.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function parseScore(score: string | null | undefined): number {
  if (!score) return 0;
  const n = parseInt(score, 10);
  return Number.isNaN(n) ? 0 : n;
}

function mapEvent(detail: EspnDetail, teamNameById?: Record<string, string>): MatchEvent | null {
  const participantNames = (detail.participants || []).map((p) => p.athlete.displayName);
  const involvedNames = (detail.athletesInvolved || []).map((a) => a.displayName);
  const names = [...participantNames, ...involvedNames];
  const playerName = names[0] || '';
  const secondAthlete = names[1] || '';

  const teamId = detail.team?.id ?? detail.athletesInvolved?.[0]?.team?.id ?? null;
  const teamName = detail.team?.displayName ?? (teamId ? teamNameById?.[teamId] : undefined) ?? null;

  let type: string;
  let detailText = '';

  if (detail.scoringPlay) {
    type = 'goal';
    if (detail.penaltyKick) detailText = 'Penalty';
    else if (detail.ownGoal) detailText = 'Own goal';
    else if (secondAthlete) detailText = `Assist: ${secondAthlete}`;
  } else if (detail.redCard) {
    type = 'red_card';
    detailText = 'Red card';
  } else if (detail.yellowCard) {
    type = 'yellow_card';
    detailText = 'Yellow card';
  } else {
    const text = (detail.type?.text || '').toLowerCase();
    if (text.includes('yellow')) {
      type = 'yellow_card';
      detailText = 'Yellow card';
    } else if (text.includes('red')) {
      type = 'red_card';
      detailText = 'Red card';
    } else if (text.includes('sub')) {
      type = 'substitution';
      detailText = secondAthlete ? `For: ${secondAthlete}` : '';
    } else {
      return null;
    }
  }

  return {
    type,
    minute: parseMinute(detail.clock?.displayValue || '') ?? 0,
    player_name: playerName,
    detail: detailText,
    team_id: teamId,
    team_name: teamName,
  };
}

const STATUS_ORDER: Record<MatchStatus, number> = {
  live: 0,
  halftime: 1,
  scheduled: 2,
  finished: 3,
};

function compareMatches(a: Match, b: Match): number {
  const orderDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  if (orderDiff !== 0) return orderDiff;
  return new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime();
}

function transformScoreboard(league: LeagueDef, data: EspnScoreboard): LeagueWithMatches | null {
  const events = data.events ?? [];
  if (events.length === 0) return null;

  const leagueLogo = data.leagues?.[0]?.logos?.[0]?.href ?? null;

  const matches = events.map((event): Match | null => {
    const comp = event.competitions?.[0];
    if (!comp) return null;

    const home = comp.competitors?.find((c) => c.homeAway === 'home');
    const away = comp.competitors?.find((c) => c.homeAway === 'away');
    if (!home || !away) return null;

    const clock = comp.status?.clock?.displayValue ?? '';
    const status = mapStatus(comp.status?.type?.state ?? '', clock);
    const teamNameById: Record<string, string> = {
      [home.team.id]: home.team.displayName,
      [away.team.id]: away.team.displayName,
    };
    const details = (comp.details ?? [])
      .map((d) => mapEvent(d, teamNameById))
      .filter((e): e is MatchEvent => e !== null);

    return {
      id: event.id,
      league_slug: league.slug,
      league_name: league.name,
      league_country: league.country,
      league_logo: leagueLogo,
      kickoff: event.date,
      status,
      status_detail: comp.status?.type?.shortDetail ?? '',
      minute: status === 'live' ? parseMinute(clock) : null,
      home_team: {
        id: home.team.id,
        name: home.team.displayName,
        short_name: home.team.abbreviation || home.team.shortDisplayName || null,
        logo: home.team.logo || null,
        color: home.team.color || null,
      },
      away_team: {
        id: away.team.id,
        name: away.team.displayName,
        short_name: away.team.abbreviation || away.team.shortDisplayName || null,
        logo: away.team.logo || null,
        color: away.team.color || null,
      },
      home_score: parseScore(home.score),
      away_score: parseScore(away.score),
      events: details,
    };
  }).filter((m): m is Match => m !== null);

  if (matches.length === 0) return null;

  matches.sort(compareMatches);

  return {
    id: league.slug,
    name: league.name,
    country: league.country,
    logo: leagueLogo,
    slug: league.slug,
    matches,
  };
}

// Leagues with live matches first, then the curated LEAGUES order.
function sortLeagues(leagues: LeagueWithMatches[]): void {
  leagues.sort((a, b) => {
    const aLive = a.matches.some((m) => m.status === 'live' || m.status === 'halftime') ? 0 : 1;
    const bLive = b.matches.some((m) => m.status === 'live' || m.status === 'halftime') ? 0 : 1;
    if (aLive !== bLive) return aLive - bLive;
    const aIndex = LEAGUE_INDEX.get(a.slug) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = LEAGUE_INDEX.get(b.slug) ?? Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });
}

function parseStandings(json: unknown, leagueName: string): StandingsData | null {
  // ESPN's standings API nests tables under children[].standings.entries.
  const children = (json as { children?: Array<{ standings?: { entries?: EspnStandingEntry[] } }> })
    ?.children;
  if (!Array.isArray(children)) return null;

  const entries = children.flatMap((child) => child.standings?.entries ?? []);
  if (entries.length === 0) return null;

  const teams = entries.map((entry, index) => {
    const stats = Object.fromEntries(
      (entry.stats ?? []).map((s) => [s.name, s.displayValue]),
    );
    return {
      position: parseInt(stats.rank || '0', 10) || index + 1,
      name: entry.team?.displayName || entry.team?.name || 'Unknown',
      played: parseInt(stats.gamesPlayed || stats.played || '0', 10),
      wins: parseInt(stats.wins || '0', 10),
      draws: parseInt(stats.ties || stats.draws || '0', 10),
      losses: parseInt(stats.losses || '0', 10),
      goalsFor: parseInt(stats.pointsFor || stats.goalsFor || '0', 10),
      goalsAgainst: parseInt(stats.pointsAgainst || stats.goalsAgainst || '0', 10),
      points: parseInt(stats.points || '0', 10),
    };
  });

  return { league: leagueName, teams };
}

// ---------------------------------------------------------------------------
// Request handling
// ---------------------------------------------------------------------------

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    const query = event.queryStringParameters ?? {};
    const standingsSlug = query.standings;
    const eventId = query.event;

    // GET /livescore?standings=<slug> → league standings
    if (standingsSlug) {
      if (!LEAGUE_INDEX.has(standingsSlug)) {
        return jsonResponse(404, { error: 'Unknown league' });
      }
      const cacheKey = `standings_${standingsSlug}`;
      const cached = getCached(cacheKey, STANDINGS_CACHE_TTL);
      if (cached) return jsonResponse(200, { standings: cached });

      const standingsUrl = `https://site.web.api.espn.com/apis/v2/sports/soccer/${standingsSlug}/standings`;
      const json = await fetchJson(standingsUrl, 10000);
      const league = LEAGUES[LEAGUE_INDEX.get(standingsSlug)!];
      const standings = json ? parseStandings(json, league.name) : null;
      if (standings) setCache(cacheKey, standings);

      return jsonResponse(200, { standings });
    }

    // GET /livescore?league=<slug>&event=<id> → single match events
    if (eventId) {
      const leagueSlug = query.league;
      if (!leagueSlug) {
        return jsonResponse(400, { error: "Missing 'league' parameter" });
      }
      const cacheKey = `match_${leagueSlug}_${eventId}`;
      const cached = getCached(cacheKey, MATCH_CACHE_TTL);
      if (cached) return jsonResponse(200, { events: cached });

      const json = await fetchJson(`${ESPN_BASE}/${leagueSlug}/summary?event=${eventId}`, 10000);
      const details = (json as { header?: { competitions?: EspnCompetition[] } })
        ?.header?.competitions?.[0]?.details ?? [];
      const events = details
        .map((d) => mapEvent(d))
        .filter((e): e is MatchEvent => e !== null);

      setCache(cacheKey, events);
      return jsonResponse(200, { events });
    }

    // GET /livescore?date=YYYY-MM-DD → all leagues' scoreboards for a day
    const dateParam = normalizeDateParam(query.date);
    const mainCacheKey = dateParam ? `livescore_${dateParam}` : 'livescore_main';
    const cached = getCached(mainCacheKey);
    if (cached) return jsonResponse(200, { leagues: cached });

    const scoreboardUrl = (league: LeagueDef) =>
      dateParam
        ? `${ESPN_BASE}/${league.slug}/scoreboard?dates=${dateParam.replace(/-/g, '')}`
        : `${ESPN_BASE}/${league.slug}/scoreboard`;

    const results = await runLimited(LEAGUES, 8, async (league) => {
      const json = await fetchJson(scoreboardUrl(league));
      return json ? transformScoreboard(league, json as EspnScoreboard) : null;
    });

    const leagues = results.filter((r): r is LeagueWithMatches => r !== null);
    sortLeagues(leagues);

    setCache(mainCacheKey, leagues);
    return jsonResponse(200, { leagues });
  } catch (err) {
    return jsonResponse(
      500,
      { error: err instanceof Error ? err.message : 'Unexpected error' },
    );
  }
};