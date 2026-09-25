import type { LeagueWithMatches, Match, MatchDetailData, MatchEvent, StandingsData } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? '/.netlify/functions/livescore';

interface ApiResponse {
  leagues?: LeagueWithMatches[];
  standings?: StandingsData | null;
  match?: Match | null;
  events?: MatchEvent[];
  stats?: MatchDetailData['stats'];
  form?: MatchDetailData['form'];
  h2h?: MatchDetailData['h2h'];
  error?: string;
}

async function getJson(params: Record<string, string>): Promise<ApiResponse> {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${API_URL}?${query}`);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  const data: ApiResponse = await response.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export type StatusFilter = 'all' | 'live' | 'finished' | 'scheduled';

/** A half-time match is in play, so it belongs under the "live" filter. */
export function matchesStatus(m: Match, statusFilter: StatusFilter): boolean {
  if (statusFilter === 'all') return true;
  if (statusFilter === 'live') return m.status === 'live' || m.status === 'halftime';
  return m.status === statusFilter;
}

export function isInPlay(m: Match): boolean {
  return m.status === 'live' || m.status === 'halftime';
}

export function filterByStatus(
  leagues: LeagueWithMatches[],
  statusFilter: StatusFilter,
): LeagueWithMatches[] {
  if (statusFilter === 'all') return leagues;
  return leagues
    .map((l) => ({ ...l, matches: l.matches.filter((m) => matchesStatus(m, statusFilter)) }))
    .filter((l) => l.matches.length > 0);
}

export async function fetchLeagues(date?: string): Promise<LeagueWithMatches[]> {
  const params: Record<string, string> = {};
  if (date) params.date = date;
  const data = await getJson(params);
  return data.leagues ?? [];
}

export async function fetchLeague(leagueSlug: string, date?: string): Promise<LeagueWithMatches | null> {
  const params: Record<string, string> = { league: leagueSlug };
  if (date) params.date = date;
  const data = await getJson(params);
  return data.leagues?.[0] ?? null;
}

export async function fetchStandings(leagueSlug: string): Promise<StandingsData | null> {
  const data = await getJson({ standings: leagueSlug });
  return data.standings ?? null;
}

/**
 * One request returns the match itself plus events/stats/form/h2h, so a match
 * page works for any date (the old two-call approach only found today's games).
 */
export async function fetchMatchDetail(
  leagueSlug: string,
  eventId: string,
): Promise<MatchDetailData> {
  const data = await getJson({ league: leagueSlug, event: eventId });
  return {
    match: data.match ?? null,
    events: data.events ?? [],
    stats: data.stats ?? undefined,
    form: data.form ?? undefined,
    h2h: data.h2h ?? undefined,
  };
}

export function formatKickoff(kickoff: string): string {
  const date = new Date(kickoff);
  const now = new Date();
  const diffHrs = (date.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (Math.abs(diffHrs) < 24) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function sortEventsByMinute(events: MatchEvent[]): MatchEvent[] {
  return [...events].sort((a, b) => a.minute - b.minute);
}
