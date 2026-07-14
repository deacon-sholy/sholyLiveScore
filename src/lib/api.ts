import type { LeagueWithMatches, Match, MatchEvent } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const API_URL = `${SUPABASE_URL}/functions/v1/livescore`;

const headers: Record<string, string> = {
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

interface ApiResponse {
  leagues?: LeagueWithMatches[];
  events?: MatchEvent[];
  error?: string;
}

export async function fetchMatchesByStatus(statusFilter: 'all' | 'live' | 'finished' | 'scheduled'): Promise<LeagueWithMatches[]> {
  const response = await fetch(API_URL, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch matches (${response.status})`);
  }

  const data: ApiResponse = await response.json();
  if (data.error) throw new Error(data.error);
  if (!data.leagues) return [];

  let leagues = data.leagues;

  if (statusFilter === 'live') {
    leagues = leagues
      .map((l) => ({ ...l, matches: l.matches.filter((m) => m.status === 'live') }))
      .filter((l) => l.matches.length > 0);
  } else if (statusFilter === 'finished') {
    leagues = leagues
      .map((l) => ({ ...l, matches: l.matches.filter((m) => m.status === 'finished') }))
      .filter((l) => l.matches.length > 0);
  } else if (statusFilter === 'scheduled') {
    leagues = leagues
      .map((l) => ({ ...l, matches: l.matches.filter((m) => m.status === 'scheduled') }))
      .filter((l) => l.matches.length > 0);
  }

  return leagues;
}

export async function fetchMatchDetail(leagueSlug: string, eventId: string): Promise<MatchEvent[]> {
  const url = `${API_URL}?league=${leagueSlug}&event=${eventId}`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch match detail (${response.status})`);
  }

  const data: ApiResponse = await response.json();
  if (data.error) throw new Error(data.error);
  return data.events || [];
}

export function formatKickoff(kickoff: string): string {
  const date = new Date(kickoff);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHrs = diffMs / (1000 * 60 * 60);

  if (Math.abs(diffHrs) < 24) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function sortEventsByMinute(events: MatchEvent[]): MatchEvent[] {
  return [...events].sort((a, b) => a.minute - b.minute);
}

export type { Match };
