export type MatchStatus = 'scheduled' | 'live' | 'halftime' | 'finished';

export type EventType = 'goal' | 'yellow_card' | 'red_card' | 'substitution';

export interface Team {
  id: string;
  name: string;
  short_name: string | null;
  logo: string | null;
  color: string | null;
}

export interface MatchEvent {
  type: EventType;
  minute: number;
  player_name: string | null;
  detail: string | null;
  team_id: string | null;
  team_name: string | null;
}

export interface Match {
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

export interface LeagueWithMatches {
  id: string;
  name: string;
  country: string;
  logo: string | null;
  slug: string;
  matches: Match[];
}
