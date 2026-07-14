import { Trophy, X } from 'lucide-react';
import { useEffect, useState } from 'react';

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
  trend: 'up' | 'down' | 'same';
}

interface StandingsData {
  league: string;
  teams: StandingTeam[];
}

interface StandingsModalProps {
  leagueSlug: string;
  leagueName: string;
  onClose: () => void;
}

const LEAGUE_IDS: Record<string, string> = {
  'eng.1': 'eng.1',
  'esp.1': 'esp.1',
  'ita.1': 'ita.1',
  'ger.1': 'ger.1',
  'fra.1': 'fra.1',
  'por.1': 'por.1',
  'ned.1': 'ned.1',
  'usa.1': 'usa.1',
};

export default function StandingsModal({ leagueSlug, leagueName, onClose }: StandingsModalProps) {
  const [data, setData] = useState<StandingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStandings() {
      setLoading(true);
      setError(null);
      try {
        // Use ESPN standings endpoint
        const espnSlug = LEAGUE_IDS[leagueSlug];
        if (!espnSlug) throw new Error('Standings not available for this league');

        const resp = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnSlug}/standings`,
          { headers: { Accept: 'application/json' } }
        );
        if (!resp.ok) throw new Error(`Failed (${resp.status})`);

        const json = await resp.json();
        const children = json?.standings?.entries?.[0]?.standings?.entries;
        if (!children) throw new Error('No standings data');

        const teams: StandingTeam[] = children.map((entry: any) => {
          const stats = Object.fromEntries(
            (entry.stats || []).map((s: any) => [s.name, s.displayValue])
          );
          return {
            position: parseInt(entry.position?.ordinal || entry.position, 10) || 0,
            name: entry.team?.displayName || entry.team?.name || 'Unknown',
            played: parseInt(stats.gamesPlayed || stats.played || 0, 10),
            wins: parseInt(stats.wins || 0, 10),
            draws: parseInt(stats.ties || stats.draws || 0, 10),
            losses: parseInt(stats.losses || 0, 10),
            goalsFor: parseInt(stats.pointsFor || stats.goalsFor || 0, 10),
            goalsAgainst: parseInt(stats.pointsAgainst || stats.goalsAgainst || 0, 10),
            points: parseInt(stats.points || 0, 10),
            trend: 'same',
          } as StandingTeam;
        });

        setData({ league: leagueName, teams });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load standings');
      } finally {
        setLoading(false);
      }
    }
    fetchStandings();
  }, [leagueSlug, leagueName]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-hidden rounded-t-3xl sm:rounded-3xl border border-white/5 bg-ink-900 shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500/10">
              <Trophy className="h-5 w-5 text-accent-400" />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-white">Standings</h2>
              <p className="text-[11px] text-ink-400">{leagueName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-white/[0.03] text-ink-400 transition-colors hover:text-ink-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 73px)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-700 border-t-accent-500" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <p className="text-sm font-medium text-ink-400">{error}</p>
              <p className="text-xs text-ink-500">Standings may not be available for this league</p>
            </div>
          ) : data ? (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-ink-900">
                <tr className="border-b border-white/5 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                  <th className="px-4 py-3 w-8">#</th>
                  <th className="py-3">Team</th>
                  <th className="py-3 w-8 text-center">P</th>
                  <th className="py-3 w-8 text-center">W</th>
                  <th className="py-3 w-8 text-center">D</th>
                  <th className="py-3 w-8 text-center">L</th>
                  <th className="py-3 w-10 text-center">GD</th>
                  <th className="py-3 w-10 text-center pr-4">Pts</th>
                </tr>
              </thead>
              <tbody>
                {data.teams.map((team) => {
                  const gd = team.goalsFor - team.goalsAgainst;
                  return (
                    <tr
                      key={team.position}
                      className="border-b border-white/[0.03] text-sm transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 font-bold text-ink-300">{team.position}</td>
                      <td className="py-3 font-semibold text-ink-100">{team.name}</td>
                      <td className="py-3 text-center text-ink-400">{team.played}</td>
                      <td className="py-3 text-center text-ink-400">{team.wins}</td>
                      <td className="py-3 text-center text-ink-400">{team.draws}</td>
                      <td className="py-3 text-center text-ink-400">{team.losses}</td>
                      <td className={`py-3 text-center font-semibold ${gd > 0 ? 'text-green-400' : gd < 0 ? 'text-red-400' : 'text-ink-400'}`}>
                        {gd > 0 ? `+${gd}` : gd}
                      </td>
                      <td className="py-3 pr-4 text-center font-extrabold text-accent-400">{team.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-16 text-center text-sm text-ink-400">No data available</div>
          )}
        </div>
      </div>
    </div>
  );
}