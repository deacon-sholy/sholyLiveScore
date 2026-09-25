import type { Handler, HandlerEvent } from '@netlify/functions';
import { LEAGUES, LEAGUE_INDEX, getLeague, type LeagueDef } from '../../src/lib/leagues';

// ESPN's public soccer API is free, requires no key and covers 100+ leagues.
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const ESPN_STANDINGS_BASE = 'https://site.web.api.espn.com/apis/v2/sports/soccer';

// Only same-origin browser requests are expected; we echo the caller's origin
// back instead of `*` so this can't be used as an open proxy for scrapers.
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
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

// ---------------------------------------------------------------------------
// In-memory cache (a warm Lambda/Netlify instance keeps it alive).
// ---------------------------------------------------------------------------

interface CacheEntry {
  data: unknown;
  timestamp: number;
  /** Per-entry lifetime; partial results are stored with a short one. */
  ttl?: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 60_000; // 60s for scoreboards
const MATCH_CACHE_TTL = 30_000; // 30s for match details
const STANDINGS_CACHE_TTL = 5 * 60_000; // 5min for standings
// Hard cap so a long-lived instance can't grow the map without bound.
const MAX_CACHE_ENTRIES = 500;

function pruneCache(): void {
  if (cache.size <= MAX_CACHE_ENTRIES) return;
  // Drop the oldest entries first.
  const entries = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
  for (const [key] of entries.slice(0, cache.size - MAX_CACHE_ENTRIES)) {
    cache.delete(key);
  }
}

function getCached(key: string, ttl: number = CACHE_TTL): unknown | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < (entry.ttl ?? ttl)) {
    return entry.data;
  }
  return null;
}

/** Returns a stale value regardless of age — used to answer when ESPN is down. */
function getStale(key: string): unknown | null {
  return cache.get(key)?.data ?? null;
}

function setCache(key: string, data: unknown, ttl: number = CACHE_TTL): void {
  cache.set(key, { data, timestamp: Date.now(), ttl });
  pruneCache();
}

// ---------------------------------------------------------------------------
// HTTP + concurrency helpers
// ---------------------------------------------------------------------------

async function fetchJson(
  url: string,
  timeoutMs = 5000,
  attempts = 2,
  externalSignal?: AbortSignal,
): Promise<unknown | null> {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (timeoutMs <= 0) return null;
    if (externalSignal?.aborted) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    // A shared deadline must be able to cancel work already in flight,
    // otherwise the tail of a fan-out overruns the platform's time limit.
    const onExternalAbort = () => controller.abort();
    externalSignal?.addEventListener('abort', onExternalAbort);
    try {
      const resp = await fetch(url, {
        // ESPN's anti-bot layer rejects unknown/non-browser User-Agents (e.g.
        // Deno's default), so we send a plain, widely-accepted one that is known
        // to return 200.
        headers: { Accept: 'application/json', 'User-Agent': 'curl/8.7.1' },
        signal: controller.signal,
      });
      if (resp.ok) return await resp.json();
      // 4xx won't get better on retry, so don't spend budget on it.
      if (resp.status < 500) return null;
      if (attempt < attempts) await sleep(attempt * 250);
    } catch {
      if (externalSignal?.aborted) return null;
      if (attempt < attempts) await sleep(attempt * 250);
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    }
  }
  return null;
}

// Runs `fn` over `items` with at most `limit` concurrent tasks. Individual
// failures never reject the batch — a bad league just comes back null.
// Stops starting new work once `deadline` has passed, and aborts anything
// still in flight at that moment, so the function returns inside the platform's
// execution limit instead of waiting on the slowest stragglers.
async function runLimited<T>(
  items: T[],
  limit: number,
  fn: (item: T, signal: AbortSignal) => Promise<unknown>,
  deadline = Number.POSITIVE_INFINITY,
): Promise<Array<unknown> & { timedOut?: boolean }> {
  const results: unknown[] & { timedOut?: boolean } = new Array(items.length);
  const controller = new AbortController();
  let cursor = 0;
  let timedOut = false;

  const timer = Number.isFinite(deadline)
    ? setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, Math.max(0, deadline - Date.now()))
    : null;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      if (timedOut || controller.signal.aborted) return;
      try {
        results[index] = await fn(items[index], controller.signal);
      } catch {
        results[index] = null;
      }
    }
  }

  try {
    await Promise.all(
      Array.from({ length: Math.min(limit, items.length) }, () => worker()),
    );
  } finally {
    if (timer) clearTimeout(timer);
    controller.abort();
  }
  results.timedOut = timedOut;
  return results;
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

interface StandingGroup {
  name: string;
  teams: StandingTeam[];
}

interface StandingsData {
  league: string;
  groups: StandingGroup[];
}

interface EspnTeamRef {
  id: string;
  displayName: string;
  abbreviation?: string;
  shortDisplayName?: string;
  logo?: string;
  logos?: Array<{ href?: string }>;
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

interface EspnStatus {
  clock?: { displayValue?: string };
  type: { state: string; shortDetail?: string };
}

interface EspnCompetition {
  id?: string;
  date?: string;
  status?: EspnStatus;
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
  // Handles "67'", "90'+5'" and "45+2".
  const match = clockDisplay.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function parseScore(score: string | null | undefined): number {
  if (!score) return 0;
  const n = parseInt(score, 10);
  return Number.isNaN(n) ? 0 : n;
}

function teamLogo(team: EspnTeamRef | undefined): string | null {
  if (!team) return null;
  return team.logo ?? team.logos?.[0]?.href ?? null;
}

function mapTeam(team: EspnTeamRef): Team {
  return {
    id: team.id,
    name: team.displayName,
    short_name: team.abbreviation || team.shortDisplayName || null,
    logo: teamLogo(team),
    color: team.color || null,
  };
}

function mapEvent(detail: EspnDetail, teamNameById?: Record<string, string>): MatchEvent | null {
  const participantNames = (detail.participants || []).map((p) => p.athlete.displayName);
  const involvedNames = (detail.athletesInvolved || []).map((a) => a.displayName);
  const names = [...participantNames, ...involvedNames].filter(Boolean);
  const playerName = names[0] || '';
  const secondAthlete = names[1] || '';

  // The summary endpoint omits `detail.team` for internationals, so fall back
  // to whichever athlete is involved.
  const teamId = detail.team?.id || detail.athletesInvolved?.[0]?.team?.id || null;
  const teamName =
    detail.team?.displayName || (teamId ? teamNameById?.[teamId] : undefined) || null;

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
      // participants[0] is the player coming on, participants[1] is the one
      // being replaced — so the second name is who goes "off", not "for".
      detailText = secondAthlete ? `Off: ${secondAthlete}` : 'Substitution';
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

function buildMatch(
  league: LeagueDef,
  event: EspnEvent,
  comp: EspnCompetition,
  leagueLogo: string | null,
  teamNameById?: Record<string, string>,
): Match | null {
  const home = comp.competitors?.find((c) => c.homeAway === 'home');
  const away = comp.competitors?.find((c) => c.homeAway === 'away');
  if (!home || !away) return null;

  const clock = comp.status?.clock?.displayValue ?? '';
  const status = mapStatus(comp.status?.type?.state ?? '', clock);
  const names: Record<string, string> = {
    [home.team.id]: home.team.displayName,
    [away.team.id]: away.team.displayName,
  };
  const details = (comp.details ?? [])
    .map((d) => mapEvent(d, teamNameById ?? names))
    .filter((e): e is MatchEvent => e !== null);

  return {
    id: event.id,
    league_slug: league.slug,
    league_name: league.name,
    league_country: league.country,
    league_logo: leagueLogo,
    kickoff: comp.date || event.date,
    status,
    status_detail: comp.status?.type?.shortDetail ?? '',
    minute: status === 'live' ? parseMinute(clock) : null,
    home_team: mapTeam(home.team),
    away_team: mapTeam(away.team),
    home_score: parseScore(home.score),
    away_score: parseScore(away.score),
    events: details,
  };
}

function transformScoreboard(league: LeagueDef, data: EspnScoreboard): LeagueWithMatches | null {
  const events = data.events ?? [];
  if (events.length === 0) return null;

  const leagueLogo = data.leagues?.[0]?.logos?.[0]?.href ?? null;

  const matches = events
    .map((event): Match | null => {
      const comp = event.competitions?.[0];
      if (!comp) return null;
      return buildMatch(league, event, comp, leagueLogo);
    })
    .filter((m): m is Match => m !== null);

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

// Stable display order (curated LEAGUES list). Matches within a league are
// still sorted live-first by compareMatches.
function sortLeagues(leagues: LeagueWithMatches[]): void {
  leagues.sort((a, b) => {
    const aIndex = LEAGUE_INDEX.get(a.slug) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = LEAGUE_INDEX.get(b.slug) ?? Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });
}

function parseStandings(json: unknown, leagueName: string): StandingsData | null {
  // ESPN's standings API nests tables under children[].standings.entries.
  // Tournaments (World Cup, Euro) have one child per group; domestic leagues
  // have a single unnamed child.
  const children = (json as { children?: Array<{ name?: string; standings?: { entries?: EspnStandingEntry[] } }> })
    ?.children;
  if (!Array.isArray(children)) return null;

  const groups: StandingGroup[] = children
    .map((child) => ({
      name: (child.name ?? '').trim(),
      teams: (child.standings?.entries ?? []).map((entry, index) => {
        const stats = Object.fromEntries((entry.stats ?? []).map((s) => [s.name, s.displayValue]));
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
      }),
    }))
    .filter((group) => group.teams.length > 0);

  if (groups.length === 0) return null;
  return { league: leagueName, groups };
}

// ---------------------------------------------------------------------------
// Match-detail extras: team stats, last-5 form, head-to-head
// ---------------------------------------------------------------------------

interface EspnSummaryBoxscore {
  teams?: Array<{
    team?: EspnTeamRef;
    statistics?: Array<{ name: string; displayValue?: string }>;
  }>;
}

interface EspnSummary {
  header?: {
    competitions?: EspnCompetition[];
    league?: { logos?: Array<{ href: string }> };
  };
  boxscore?: EspnSummaryBoxscore;
  keyEvents?: EspnDetail[];
  lastFiveGames?: Array<{
    team?: EspnTeamRef;
    events?: Array<{
      gameResult?: string;
      opponent?: string;
      score?: string;
      atVs?: string;
      gameDate?: string;
    }>;
  }>;
  seasonseries?: Array<{
    title?: string;
    summary?: string;
    events?: unknown[];
  }>;
}

interface TeamStats {
  possession: number | null;
  shots: number | null;
  shots_on_target: number | null;
  corners: number | null;
  fouls: number | null;
  yellow_cards: number | null;
  red_cards: number | null;
  offsides: number | null;
  saves: number | null;
  passes: number | null;
  pass_accuracy: number | null;
}

interface FormResult {
  result: string;
  opponent: string;
  score: string;
  atVs: string;
  date: string;
}

interface MatchExtras {
  stats: { home: TeamStats; away: TeamStats } | null;
  form: { home: FormResult[]; away: FormResult[] } | null;
  h2h: { title: string; summary: string } | null;
}

function statNumber(stats: Record<string, string>, key: string): number | null {
  const raw = stats[key];
  if (!raw) return null;
  if (key === 'passPct' && raw !== '') {
    const n = parseFloat(raw);
    return Number.isNaN(n) ? null : Math.round(n * 100);
  }
  if (key === 'possessionPct') {
    const n = parseFloat(raw);
    return Number.isNaN(n) ? null : Math.round(n);
  }
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? null : n;
}

function extractTeamStats(json: EspnSummary): MatchExtras['stats'] {
  const competitors = json.header?.competitions?.[0]?.competitors ?? [];
  const home = competitors.find((c) => c.homeAway === 'home');
  const away = competitors.find((c) => c.homeAway === 'away');
  if (!home || !away) return null;

  const byId = new Map<string, Record<string, string>>();
  for (const t of json.boxscore?.teams ?? []) {
    const id = t.team?.id;
    if (!id) continue;
    const map: Record<string, string> = {};
    for (const s of t.statistics ?? []) {
      if (s.name && s.displayValue !== undefined) map[s.name] = s.displayValue;
    }
    byId.set(id, map);
  }

  const toStats = (teamId: string): TeamStats => {
    const s = byId.get(teamId) ?? {};
    return {
      possession: statNumber(s, 'possessionPct'),
      shots: statNumber(s, 'totalShots'),
      shots_on_target: statNumber(s, 'shotsOnTarget'),
      corners: statNumber(s, 'wonCorners'),
      fouls: statNumber(s, 'foulsCommitted'),
      yellow_cards: statNumber(s, 'yellowCards'),
      red_cards: statNumber(s, 'redCards'),
      offsides: statNumber(s, 'offsides'),
      saves: statNumber(s, 'saves'),
      passes: statNumber(s, 'totalPasses'),
      pass_accuracy: statNumber(s, 'passPct'),
    };
  };

  const homeStats = toStats(home.team?.id ?? '');
  const awayStats = toStats(away.team?.id ?? '');
  const hasAny =
    Object.values(homeStats).some((v) => v !== null) ||
    Object.values(awayStats).some((v) => v !== null);
  if (!hasAny) return null;
  return { home: homeStats, away: awayStats };
}

function extractForm(json: EspnSummary): MatchExtras['form'] {
  if (!Array.isArray(json.lastFiveGames) || json.lastFiveGames.length === 0) return null;
  const pick = (teamId: string | undefined): FormResult[] => {
    const lfg = json.lastFiveGames?.find((g) => g.team?.id === teamId);
    if (!lfg) return [];
    return (lfg.events ?? [])
      .slice(0, 5)
      .map((e) => ({
        result: e.gameResult ?? '',
        opponent: e.opponent ?? '',
        score: e.score ?? '',
        atVs: e.atVs ?? '',
        date: e.gameDate ?? '',
      }));
  };

  const competitors = json.header?.competitions?.[0]?.competitors ?? [];
  const homeTeamId = competitors.find((c) => c.homeAway === 'home')?.team?.id;
  const awayTeamId = competitors.find((c) => c.homeAway === 'away')?.team?.id;
  const home = pick(homeTeamId);
  const away = pick(awayTeamId);
  if (home.length === 0 && away.length === 0) return null;
  return { home, away };
}

function extractH2h(json: EspnSummary, homeName: string, awayName: string): MatchExtras['h2h'] {
  const series = json.seasonseries ?? [];
  const usable = series.filter((s) => s.summary || s.title);
  if (usable.length === 0) return null;

  // The array can hold several series (e.g. aggregate + per-competition), so
  // prefer the one whose title names both teams of this match.
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const h = norm(homeName);
  const a = norm(awayName);
  const match = usable.find((s) => {
    const t = norm(s.title ?? '');
    return t.length > 0 && t.includes(h) && t.includes(a);
  });
  const chosen = match ?? usable[0];

  return { title: chosen.title ?? '', summary: chosen.summary ?? '' };
}

function extractMatchExtras(json: EspnSummary, homeName: string, awayName: string): MatchExtras {
  return {
    stats: extractTeamStats(json),
    form: extractForm(json),
    h2h: extractH2h(json, homeName, awayName),
  };
}

/** Everything a match page needs, derived from a single summary response. */
interface MatchDetailPayload {
  match: Match | null;
  events: MatchEvent[];
  stats: MatchExtras['stats'];
  form: MatchExtras['form'];
  h2h: MatchExtras['h2h'];
}

function buildMatchDetail(league: LeagueDef, json: EspnSummary): MatchDetailPayload {
  const comp = json.header?.competitions?.[0];
  const leagueLogo = json.header?.league?.logos?.[0]?.href ?? null;
  const home = comp?.competitors?.find((c) => c.homeAway === 'home');
  const away = comp?.competitors?.find((c) => c.homeAway === 'away');
  const homeName = home?.team?.displayName ?? '';
  const awayName = away?.team?.displayName ?? '';

  // The summary header carries the same shape as a scoreboard competition, so
  // the whole match can be rebuilt from it — no league-wide fetch needed.
  const match = comp
    ? buildMatch(league, { id: comp.id ?? '', date: comp.date ?? '' }, comp, leagueLogo)
    : null;

  // `keyEvents` is the complete, consistently shaped timeline (it carries
  // player names and assists for every competition, including tournaments
  // where `header.details` is trimmed down to a couple of bare rows). Fall
  // back to `header.details` only when keyEvents is missing entirely.
  const rawEvents =
    Array.isArray(json.keyEvents) && json.keyEvents.length > 0
      ? json.keyEvents
      : (comp?.details ?? []);
  const names: Record<string, string> = {
    ...(home ? { [home.team.id]: home.team.displayName } : {}),
    ...(away ? { [away.team.id]: away.team.displayName } : {}),
  };
  const events = rawEvents
    .map((d) => mapEvent(d, names))
    .filter((e): e is MatchEvent => e !== null);

  return { match, events, ...extractMatchExtras(json, homeName, awayName) };
}

// ---------------------------------------------------------------------------
// Request handling
// ---------------------------------------------------------------------------

export const handler: Handler = async (event: HandlerEvent) => {
  const origin = event.headers?.origin;
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { ...corsHeaders(origin), 'Content-Type': 'text/plain' }, body: '' };
  }

  try {
    const query = event.queryStringParameters ?? {};
    const standingsSlug = query.standings;
    const eventId = query.event;

    // GET /livescore?standings=<slug> → league standings
    if (standingsSlug) {
      const league = getLeague(standingsSlug);
      if (!league) {
        return jsonResponse(404, { error: 'Unknown league' }, origin);
      }
      const cacheKey = `standings_${standingsSlug}`;
      const cached = getCached(cacheKey, STANDINGS_CACHE_TTL);
      if (cached) return jsonResponse(200, { standings: cached }, origin);

      const json = await fetchJson(`${ESPN_STANDINGS_BASE}/${standingsSlug}/standings`, 6000);
      const standings = json ? parseStandings(json, league.name) : null;
      if (standings) {
        setCache(cacheKey, standings);
      } else {
        // Keep serving the last good table rather than an empty modal.
        const stale = getStale(cacheKey) as StandingsData | null;
        if (stale) return jsonResponse(200, { standings: stale }, origin);
      }

      return jsonResponse(200, { standings }, origin);
    }

    // GET /livescore?league=<slug>[&date=YYYY-MM-DD] → single league scoreboard
    if (query.league && !eventId) {
      const slug = query.league;
      const league = getLeague(slug);
      if (!league) {
        return jsonResponse(404, { error: 'Unknown league' }, origin);
      }
      const dateParam = normalizeDateParam(query.date);
      const cacheKey = `league_${slug}_${dateParam ?? 'today'}`;
      const cached = getCached(cacheKey);
      if (cached) return jsonResponse(200, { leagues: cached }, origin);

      const url = dateParam
        ? `${ESPN_BASE}/${slug}/scoreboard?dates=${dateParam.replace(/-/g, '')}`
        : `${ESPN_BASE}/${slug}/scoreboard`;
      const json = await fetchJson(url);
      const transformed = json ? transformScoreboard(league, json as EspnScoreboard) : null;
      const leagues = transformed ? [transformed] : [];
      setCache(cacheKey, leagues);
      return jsonResponse(200, { leagues }, origin);
    }

    // GET /livescore?league=<slug>&event=<id> → full match detail
    if (eventId) {
      const leagueSlug = query.league;
      if (!leagueSlug) {
        return jsonResponse(400, { error: "Missing 'league' parameter" }, origin);
      }
      const league = getLeague(leagueSlug);
      if (!league) {
        return jsonResponse(404, { error: 'Unknown league' }, origin);
      }
      const cacheKey = `match_${leagueSlug}_${eventId}`;
      // Cache the whole payload — caching only `events` used to drop
      // stats/form/h2h on every cache hit.
      const cached = getCached(cacheKey, MATCH_CACHE_TTL) as MatchDetailPayload | null;
      if (cached) return jsonResponse(200, cached, origin);

      const json = await fetchJson(`${ESPN_BASE}/${leagueSlug}/summary?event=${eventId}`, 7000);
      if (!json) {
        const stale = getStale(cacheKey) as MatchDetailPayload | null;
        if (stale) return jsonResponse(200, stale, origin);
        return jsonResponse(502, { error: 'Match data unavailable' }, origin);
      }

      const detail = buildMatchDetail(league, json as EspnSummary);
      setCache(cacheKey, detail);
      return jsonResponse(200, detail, origin);
    }

    // GET /livescore?date=YYYY-MM-DD → all leagues' scoreboards for a day
    const dateParam = normalizeDateParam(query.date);
    const mainCacheKey = dateParam ? `livescore_${dateParam}` : 'livescore_main';
    const cached = getCached(mainCacheKey);
    if (cached) return jsonResponse(200, { leagues: cached }, origin);

    const scoreboardUrl = (league: LeagueDef) =>
      dateParam
        ? `${ESPN_BASE}/${league.slug}/scoreboard?dates=${dateParam.replace(/-/g, '')}`
        : `${ESPN_BASE}/${league.slug}/scoreboard`;

    // Netlify functions get ~10s wall clock, and a cold start eats into that
    // before we even run. Keep the fan-out well under it: the cache serves the
    // fast path, and anything that misses the deadline is refetched within 5s.
    const deadline = Date.now() + 6000;
    const results = await runLimited(
      LEAGUES,
      10,
      async (league, signal) => {
        const remaining = deadline - Date.now();
        if (remaining <= 500) return null;
        // Retry only while we comfortably have time left.
        const attempts = remaining > 3000 ? 2 : 1;
        const json = await fetchJson(scoreboardUrl(league), Math.min(4000, remaining), attempts, signal);
        return json ? transformScoreboard(league, json as EspnScoreboard) : null;
      },
      deadline,
    );

    const leagues = results.filter((r): r is LeagueWithMatches => r !== null);
    const stale = getStale(mainCacheKey) as LeagueWithMatches[] | null;
    // A partial fan-out must not be served as if it were complete: keep the
    // previous full result as the stale fallback, and shorten this entry's life
    // so the next request retries the leagues that didn't make the deadline.
    const partial = results.timedOut === true;

    // A league that failed this round but succeeded earlier still has useful
    // (slightly old) data — better than dropping it from the page entirely.
    if (stale) {
      const have = new Set(leagues.map((l) => l.slug));
      for (const past of stale) {
        if (!have.has(past.slug)) leagues.push(past);
      }
    }

    sortLeagues(leagues);

    // Keep a partial result only briefly so the next request re-fetches the
    // leagues that missed the deadline instead of serving gaps for a full TTL.
    setCache(mainCacheKey, leagues, partial ? 5_000 : CACHE_TTL);
    return jsonResponse(200, { leagues }, origin);
  } catch (err) {
    return jsonResponse(
      500,
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      origin,
    );
  }
};
