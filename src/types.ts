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
  detail?: MatchDetail | null;
}

export interface LeagueWithMatches {
  id: string;
  name: string;
  country: string;
  logo: string | null;
  slug: string;
  matches: Match[];
}

export interface StandingTeam {
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

export interface StandingsData {
  league: string;
  teams: StandingTeam[];
}

export interface TeamStats {
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

export interface FormResult {
  result: string;
  opponent: string;
  score: string;
  atVs: string;
  date: string;
}

export interface MatchDetailData {
  events: MatchEvent[];
  stats?: { home: TeamStats; away: TeamStats } | null;
  form?: { home: FormResult[]; away: FormResult[] } | null;
  h2h?: { title: string; summary: string } | null;
}

export interface MatchDetail {
  stats?: { home: TeamStats; away: TeamStats } | null;
  form?: { home: FormResult[]; away: FormResult[] } | null;
  h2h?: { title: string; summary: string } | null;
}
