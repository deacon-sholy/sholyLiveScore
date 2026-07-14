/*
# Football Livescore Schema

Creates the core tables for a football livescore website:
- `leagues` — competition/league metadata (name, country, logo)
- `teams` — team metadata (name, logo, league)
- `matches` — a fixture between two teams with score, status, and timestamps
- `match_events` — goals, cards, substitutions within a match

This is a single-tenant app (no sign-in) so all data is public/shared.
RLS is enabled on every table with anon+authenticated CRUD access.

## Tables

### leagues
- id (uuid PK)
- name (text, not null) — e.g. "Premier League"
- country (text) — e.g. "England"
- logo_url (text)
- created_at (timestamptz)

### teams
- id (uuid PK)
- name (text, not null)
- short_name (text) — e.g. "ARS"
- logo_url (text)
- league_id (uuid FK -> leagues.id)
- created_at (timestamptz)

### matches
- id (uuid PK)
- league_id (uuid FK -> leagues.id)
- home_team_id (uuid FK -> teams.id)
- away_team_id (uuid FK -> teams.id)
- home_score (int, default 0)
- away_score (int, default 0)
- status (text, default 'scheduled') — scheduled | live | halftime | finished
- minute (int) — current minute if live
- kickoff (timestamptz) — scheduled kickoff time
- created_at (timestamptz)

### match_events
- id (uuid PK)
- match_id (uuid FK -> matches.id ON DELETE CASCADE)
- team_id (uuid FK -> teams.id)
- type (text) — goal | yellow_card | red_card | substitution
- minute (int)
- player_name (text)
- detail (text) — e.g. "Assist: Smith" or "Sub: Jones for Smith"
- created_at (timestamptz)

## Security
- RLS enabled on all tables.
- All tables allow anon + authenticated CRUD (public/shared data, no auth).
*/

-- Leagues
CREATE TABLE IF NOT EXISTS leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text,
  logo_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_leagues" ON leagues;
CREATE POLICY "anon_select_leagues" ON leagues FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_leagues" ON leagues;
CREATE POLICY "anon_insert_leagues" ON leagues FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_leagues" ON leagues;
CREATE POLICY "anon_update_leagues" ON leagues FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_leagues" ON leagues;
CREATE POLICY "anon_delete_leagues" ON leagues FOR DELETE
  TO anon, authenticated USING (true);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_name text,
  logo_url text,
  league_id uuid REFERENCES leagues(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_teams" ON teams;
CREATE POLICY "anon_select_teams" ON teams FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_teams" ON teams;
CREATE POLICY "anon_insert_teams" ON teams FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_teams" ON teams;
CREATE POLICY "anon_update_teams" ON teams FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_teams" ON teams;
CREATE POLICY "anon_delete_teams" ON teams FOR DELETE
  TO anon, authenticated USING (true);

-- Matches
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  home_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  away_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  home_score int NOT NULL DEFAULT 0,
  away_score int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'scheduled',
  minute int,
  kickoff timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_matches" ON matches;
CREATE POLICY "anon_select_matches" ON matches FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_matches" ON matches;
CREATE POLICY "anon_insert_matches" ON matches FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_matches" ON matches;
CREATE POLICY "anon_update_matches" ON matches FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_matches" ON matches;
CREATE POLICY "anon_delete_matches" ON matches FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_kickoff ON matches(kickoff);
CREATE INDEX IF NOT EXISTS idx_matches_league ON matches(league_id);

-- Match Events
CREATE TABLE IF NOT EXISTS match_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  type text NOT NULL,
  minute int NOT NULL,
  player_name text,
  detail text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_match_events" ON match_events;
CREATE POLICY "anon_select_match_events" ON match_events FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_match_events" ON match_events;
CREATE POLICY "anon_insert_match_events" ON match_events FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_match_events" ON match_events;
CREATE POLICY "anon_update_match_events" ON match_events FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_match_events" ON match_events;
CREATE POLICY "anon_delete_match_events" ON match_events FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_match_events_match ON match_events(match_id);
