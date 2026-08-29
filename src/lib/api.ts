import type { LeagueWithMatches, MatchDetailData, MatchEvent, StandingsData } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? '/.netlify/functions/livescore';

interface ApiResponse {
  leagues?: LeagueWithMatches[];
  standings?: StandingsData | null;
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

function filterByStatus(
  leagues: LeagueWithMatches[],
  statusFilter: 'all' | 'live' | 'finished' | 'scheduled',
): LeagueWithMatches[] {
  if (statusFilter === 'all') return leagues;
  return leagues
    .map((l) => ({ ...l, matches: l.matches.filter((m) => m.status === statusFilter) }))
    .filter((l) => l.matches.length > 0);
}

export async function fetchMatchesByStatus(
  statusFilter: 'all' | 'live' | 'finished' | 'scheduled',
  date?: string,
): Promise<LeagueWithMatches[]> {
  const params: Record<string, string> = {};
  if (date) params.date = date;
  const data = await getJson(params);
  return filterByStatus(data.leagues ?? [], statusFilter);
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

export async function fetchMatchDetail(leagueSlug: string, eventId: string): Promise<MatchDetailData> {
  const data = await getJson({ league: leagueSlug, event: eventId });
  return {
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
