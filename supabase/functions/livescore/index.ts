import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

const LEAGUES = [
  { slug: "eng.1", name: "Premier League", country: "England" },
  { slug: "esp.1", name: "La Liga", country: "Spain" },
  { slug: "ita.1", name: "Serie A", country: "Italy" },
  { slug: "ger.1", name: "Bundesliga", country: "Germany" },
  { slug: "fra.1", name: "Ligue 1", country: "France" },
  { slug: "uefa.champions", name: "Champions League", country: "Europe" },
  { slug: "uefa.europa", name: "Europa League", country: "Europe" },
  { slug: "usa.1", name: "MLS", country: "USA" },
  { slug: "por.1", name: "Primeira Liga", country: "Portugal" },
  { slug: "ned.1", name: "Eredivisie", country: "Netherlands" },
];

interface EspnTeam {
  id: string;
  displayName: string;
  abbreviation: string;
  shortDisplayName: string;
  logo?: string;
  color?: string;
}

interface EspnCompetitor {
  homeAway: string;
  score: string;
  team: EspnTeam;
}

interface EspnDetail {
  clock: { displayValue: string };
  scoringPlay?: boolean;
  redCard?: boolean;
  penaltyKick?: boolean;
  ownGoal?: boolean;
  yellowCard?: boolean;
  team?: { id: string; displayName: string };
  participants?: Array<{ athlete: { displayName: string } }>;
  type?: { text: string };
}

interface EspnCompetition {
  status: {
    clock: { displayValue: string };
    type: { state: string; description: string; shortDetail: string };
  };
  competitors: EspnCompetitor[];
  details?: EspnDetail[];
}

interface EspnEvent {
  id: string;
  date: string;
  name: string;
  competitions: EspnCompetition[];
}

interface EspnScoreboardResponse {
  events?: EspnEvent[];
  leagues?: Array<{
    name: string;
    slug: string;
    logos?: Array<{ href: string }>;
  }>;
}

function mapStatus(state: string, clockDisplay?: string): { status: string; minute: number | null } {
  switch (state) {
    case "pre":
      return { status: "scheduled", minute: null };
    case "in": {
      // Detect halftime from clock (ESPN returns "HT" for halftime)
      if (clockDisplay?.toUpperCase() === "HT" || clockDisplay?.toUpperCase().startsWith("HALF")) {
        return { status: "halftime", minute: null };
      }
      return { status: "live", minute: null };
    }
    case "post":
      return { status: "finished", minute: null };
    default:
      return { status: "scheduled", minute: null };
  }
}

function parseMinute(clockDisplay: string): number | null {
  const match = clockDisplay.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function parseScore(score: string | null | undefined): number {
  if (!score) return 0;
  const n = parseInt(score, 10);
  return isNaN(n) ? 0 : n;
}

function extractEventDetail(detail: EspnDetail): { type: string; player: string; detail: string } | null {
  const athletes = (detail.participants || []).map((p) => p.athlete.displayName);
  const playerName = athletes[0] || "";
  const secondAthlete = athletes[1] || "";

  if (detail.scoringPlay) {
    let detailText = "";
    if (detail.penaltyKick) detailText = "Penalty";
    else if (detail.ownGoal) detailText = "Own goal";
    else if (secondAthlete) detailText = `Assist: ${secondAthlete}`;
    return { type: "goal", player: playerName, detail: detailText };
  }

  if (detail.redCard) {
    return { type: "red_card", player: playerName, detail: "Red card" };
  }

  if (detail.yellowCard) {
    return { type: "yellow_card", player: playerName, detail: "Yellow card" };
  }

  const text = detail.type?.text || "";
  if (text.toLowerCase().includes("yellow")) {
    return { type: "yellow_card", player: playerName, detail: "Yellow card" };
  }
  if (text.toLowerCase().includes("red")) {
    return { type: "red_card", player: playerName, detail: "Red card" };
  }
  if (text.toLowerCase().includes("sub") || text.toLowerCase().includes("substitution")) {
    return { type: "substitution", player: playerName, detail: secondAthlete ? `For: ${secondAthlete}` : "" };
  }

  return null;
}

async function fetchLeagueScoreboard(leagueSlug: string): Promise<EspnScoreboardResponse | null> {
  try {
    const resp = await fetch(`${ESPN_BASE}/${leagueSlug}/scoreboard`, {
      headers: { "Accept": "application/json" },
    });
    if (!resp.ok) return null;
    return await resp.json() as EspnScoreboardResponse;
  } catch {
    return null;
  }
}

async function fetchMatchSummary(leagueSlug: string, eventId: string): Promise<EspnDetail[]> {
  try {
    const resp = await fetch(`${ESPN_BASE}/${leagueSlug}/summary?event=${eventId}`, {
      headers: { "Accept": "application/json" },
    });
    if (!resp.ok) return [];
    const data = await resp.json() as {
      header?: { competitions?: EspnCompetition[] };
    };
    const comp = data.header?.competitions?.[0];
    return comp?.details || [];
  } catch {
    return [];
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];

    // GET /livescore → fetch all leagues' scoreboards
    // GET /livescore/match?league=eng.1&event=12345 → fetch single match summary

    if (lastSegment === "match" || url.searchParams.has("event")) {
      const leagueSlug = url.searchParams.get("league");
      const eventId = url.searchParams.get("event");

      if (!leagueSlug || !eventId) {
        return new Response(JSON.stringify({ error: "Missing 'league' or 'event' parameter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const details = await fetchMatchSummary(leagueSlug, eventId);
      const events = details
        .map((d) => {
          const extracted = extractEventDetail(d);
          if (!extracted) return null;
          return {
            type: extracted.type,
            minute: parseMinute(d.clock.displayValue) ?? 0,
            player_name: extracted.player,
            detail: extracted.detail,
            team_id: d.team?.id ?? null,
            team_name: d.team?.displayName ?? null,
          };
        })
        .filter((e) => e !== null);

      return new Response(JSON.stringify({ events }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all leagues in parallel
    const results = await Promise.all(
      LEAGUES.map(async (league) => {
        const scoreboard = await fetchLeagueScoreboard(league.slug);
        if (!scoreboard || !scoreboard.events || scoreboard.events.length === 0) return null;

        const leagueLogo = scoreboard.leagues?.[0]?.logos?.[0]?.href || null;

        const matches = scoreboard.events.map((event) => {
          const comp = event.competitions[0];
          if (!comp) return null;

          const homeCompetitor = comp.competitors.find((c) => c.homeAway === "home");
          const awayCompetitor = comp.competitors.find((c) => c.homeAway === "away");
          if (!homeCompetitor || !awayCompetitor) return null;

          const { status } = mapStatus(comp.status.type.state, comp.status.clock.displayValue);
          const minute = status === "live" ? parseMinute(comp.status.clock.displayValue) : null;

          const events = (comp.details || [])
            .map((d) => {
              const extracted = extractEventDetail(d);
              if (!extracted) return null;
              return {
                type: extracted.type,
                minute: parseMinute(d.clock.displayValue) ?? 0,
                player_name: extracted.player,
                detail: extracted.detail,
                team_id: d.team?.id ?? null,
                team_name: d.team?.displayName ?? null,
              };
            })
            .filter((e) => e !== null);

          return {
            id: event.id,
            league_slug: league.slug,
            league_name: league.name,
            league_country: league.country,
            league_logo: leagueLogo,
            kickoff: event.date,
            status,
            status_detail: comp.status.type.shortDetail,
            minute,
            home_team: {
              id: homeCompetitor.team.id,
              name: homeCompetitor.team.displayName,
              short_name: homeCompetitor.team.abbreviation || homeCompetitor.team.shortDisplayName,
              logo: homeCompetitor.team.logo || null,
              color: homeCompetitor.team.color || null,
            },
            away_team: {
              id: awayCompetitor.team.id,
              name: awayCompetitor.team.displayName,
              short_name: awayCompetitor.team.abbreviation || awayCompetitor.team.shortDisplayName,
              logo: awayCompetitor.team.logo || null,
              color: awayCompetitor.team.color || null,
            },
            home_score: parseScore(homeCompetitor.score),
            away_score: parseScore(awayCompetitor.score),
            events,
          };
        }).filter((m) => m !== null);

        if (matches.length === 0) return null;

        return {
          id: league.slug,
          name: league.name,
          country: league.country,
          logo: leagueLogo,
          slug: league.slug,
          matches,
        };
      })
    );

    const leagues = results.filter((r) => r !== null);

    return new Response(JSON.stringify({ leagues }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
