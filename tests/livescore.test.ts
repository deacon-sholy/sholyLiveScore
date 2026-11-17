import { describe, expect, it } from 'vitest';
import { getLeague } from '../src/lib/leagues';
import {
  buildMatchDetail,
  mapEvent,
  mapStatus,
  parseMinute,
  parseStandings,
  statNumber,
  transformScoreboard,
  type EspnScoreboard,
  type EspnSummary,
} from '../netlify/functions/livescore';

const league = getLeague('eng.1')!;

describe('status and minute parsing', () => {
  it('maps ESPN states to app statuses', () => {
    expect(mapStatus('in', "67'")).toBe('live');
    expect(mapStatus('in', 'HT')).toBe('halftime');
    expect(mapStatus('in', 'Halftime')).toBe('halftime');
    expect(mapStatus('post', '')).toBe('finished');
    expect(mapStatus('pre', '')).toBe('scheduled');
  });

  it('pulls the minute out of stoppage-time clocks', () => {
    expect(parseMinute("67'")).toBe(67);
    expect(parseMinute("90'+5'")).toBe(90);
    expect(parseMinute('45+2')).toBe(45);
    expect(parseMinute('HT')).toBeNull();
  });
});

describe('mapEvent', () => {
  it('builds a goal with an assist from athletesInvolved shapes', () => {
    const event = mapEvent({
      scoringPlay: true,
      clock: { displayValue: "23'" },
      athletesInvolved: [
        { displayName: 'Scorer', team: { id: '10' } },
        { displayName: 'Assister' },
      ],
    });
    expect(event).toMatchObject({
      type: 'goal',
      minute: 23,
      player_name: 'Scorer',
      detail: 'Assist: Assister',
      team_id: '10',
    });
  });

  it('labels the second substitution participant as the player coming off', () => {
    const event = mapEvent({
      type: { text: 'Substitution' },
      clock: { displayValue: "70'" },
      participants: [
        { athlete: { displayName: 'On' } },
        { athlete: { displayName: 'Off' } },
      ],
    });
    expect(event?.detail).toBe('Off: Off');
    expect(event?.player_name).toBe('On');
  });

  it('recognises cards from the type text fallback', () => {
    expect(mapEvent({ type: { text: 'Yellow Card' } })?.type).toBe('yellow_card');
    expect(mapEvent({ type: { text: 'Red Card' } })?.type).toBe('red_card');
    expect(mapEvent({ type: { text: 'Corner' } })).toBeNull();
  });
});

describe('scoreboard transform', () => {
  const scoreboard: EspnScoreboard = {
    leagues: [{ logos: [{ href: 'https://example.com/pl.png' }] }],
    events: [
      {
        id: '777',
        date: '2026-11-17T15:00:00Z',
        competitions: [
          {
            id: '777',
            date: '2026-11-17T15:00:00Z',
            status: { type: { state: 'in', shortDetail: "67'" }, clock: { displayValue: "67'" } },
            competitors: [
              { homeAway: 'home', score: '2', team: { id: '1', displayName: 'Home FC', logo: 'h.png' } },
              { homeAway: 'away', score: '1', team: { id: '2', displayName: 'Away FC', logos: [{ href: 'a.png' }] } },
            ],
            details: [{ scoringPlay: true, clock: { displayValue: "12'" }, athletesInvolved: [{ displayName: 'Scorer' }] }],
          },
        ],
      },
    ],
  };

  it('maps teams, scores, status, logo fallbacks and events', () => {
    const result = transformScoreboard(league, scoreboard);
    expect(result).not.toBeNull();
    expect(result?.slug).toBe('eng.1');
    expect(result?.logo).toBe('https://example.com/pl.png');
    expect(result?.matches).toHaveLength(1);
    expect(result?.matches[0]).toMatchObject({
      id: '777',
      status: 'live',
      minute: 67,
      home_score: 2,
      away_score: 1,
    });
    expect(result?.matches[0].away_team.logo).toBe('a.png');
    expect(result?.matches[0].events[0].player_name).toBe('Scorer');
  });

  it('returns null for an empty scoreboard', () => {
    expect(transformScoreboard(league, { events: [] })).toBeNull();
  });
});

describe('standings and stats', () => {
  it('parses named standings groups and stat aliases', () => {
    const result = parseStandings(
      {
        children: [
          {
            name: 'Group A',
            standings: {
              entries: [
                {
                  team: { displayName: 'Team A' },
                  stats: [
                    { name: 'rank', displayValue: '1' },
                    { name: 'gamesPlayed', displayValue: '3' },
                    { name: 'wins', displayValue: '2' },
                    { name: 'ties', displayValue: '1' },
                    { name: 'pointsFor', displayValue: '7' },
                    { name: 'pointsAgainst', displayValue: '2' },
                    { name: 'points', displayValue: '7' },
                  ],
                },
              ],
            },
          },
        ],
      },
      'Premier League',
    );
    expect(result?.groups).toHaveLength(1);
    expect(result?.groups[0]).toMatchObject({ name: 'Group A' });
    expect(result?.groups[0].teams[0]).toMatchObject({
      position: 1,
      name: 'Team A',
      played: 3,
      wins: 2,
      draws: 1,
      goalsFor: 7,
      goalsAgainst: 2,
      points: 7,
    });
  });

  it('scales pass percentage from ESPN’s 0–1 value', () => {
    expect(statNumber({ passPct: '0.558' }, 'passPct')).toBe(56);
    expect(statNumber({ possessionPct: '55.3' }, 'possessionPct')).toBe(55);
    expect(statNumber({}, 'totalShots')).toBeNull();
  });
});

describe('match detail', () => {
  it('prefers keyEvents over a trimmed header timeline and extracts boxscore stats', () => {
    const summary: EspnSummary = {
      header: {
        competitions: [
          {
            id: '777',
            date: '2026-11-17T15:00:00Z',
            competitors: [
              { homeAway: 'home', score: '1', team: { id: '1', displayName: 'Home FC' } },
              { homeAway: 'away', score: '0', team: { id: '2', displayName: 'Away FC' } },
            ],
            details: [{ scoringPlay: true, clock: { displayValue: "9'" } }],
          },
        ],
      },
      keyEvents: [
        {
          scoringPlay: true,
          clock: { displayValue: "34'" },
          athletesInvolved: [{ displayName: 'Real Scorer', team: { id: '1' } }],
        },
      ],
      boxscore: {
        teams: [
          {
            team: { id: '1', displayName: 'Home FC' },
            statistics: [
              { name: 'possessionPct', displayValue: '60' },
              { name: 'totalShots', displayValue: '14' },
            ],
          },
        ],
      },
    };

    const detail = buildMatchDetail(league, summary);
    expect(detail.match?.home_score).toBe(1);
    expect(detail.events).toHaveLength(1);
    expect(detail.events[0].player_name).toBe('Real Scorer');
    expect(detail.stats?.home).toMatchObject({ possession: 60, shots: 14 });
    expect(detail.stats?.away.shots).toBeNull();
  });
});
