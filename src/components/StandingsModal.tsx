import { Trophy, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { StandingsData } from '../types';
import { fetchStandings } from '../lib/api';

interface StandingsModalProps {
  leagueSlug: string;
  leagueName: string;
  onClose: () => void;
}

export default function StandingsModal({ leagueSlug, leagueName, onClose }: StandingsModalProps) {
  const [data, setData] = useState<StandingsData | null>(null);
  const [groupIndex, setGroupIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const standings = await fetchStandings(leagueSlug);
        if (cancelled) return;
        if (!standings || standings.groups.length === 0) {
          setError('Standings not available for this league');
          return;
        }
        setData(standings);
        setGroupIndex(0);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load standings');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [leagueSlug]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    // Prevent the page behind the sheet from scrolling.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const group = data?.groups[groupIndex] ?? data?.groups[0] ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button
        type="button"
        aria-label="Close standings"
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${leagueName} standings`}
        className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-hidden rounded-t-3xl sm:rounded-3xl border border-white/5 bg-ink-900 shadow-2xl animate-slide-up"
      >
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
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close standings"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-white/[0.03] text-ink-400 transition-colors hover:text-ink-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Group switcher — tournaments like the World Cup have several tables */}
        {data && data.groups.length > 1 && (
          <div className="flex gap-2 overflow-x-auto border-b border-white/5 px-5 py-3 scrollbar-thin">
            {data.groups.map((g, i) => (
              <button
                key={g.name || i}
                type="button"
                onClick={() => setGroupIndex(i)}
                aria-pressed={i === groupIndex}
                className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                  i === groupIndex
                    ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30'
                    : 'border border-white/5 bg-white/[0.03] text-ink-400 hover:text-ink-200'
                }`}
              >
                {g.name || 'Table'}
              </button>
            ))}
          </div>
        )}

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
          ) : group ? (
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
                {group.teams.map((team) => {
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
