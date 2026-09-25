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

    async function run() {
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
    run();
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
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close standings"
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${leagueName} standings`}
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg animate-scale-in flex-col overflow-hidden rounded-t-3xl border border-line bg-elevated shadow-2xl sm:rounded-2xl"
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-line px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent-500/10">
              <Trophy className="h-4 w-4 text-accent-500" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate font-display text-sm font-bold text-fg">{leagueName}</h2>
              <p className="text-[11px] text-muted">Standings</p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close standings"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-line-strong hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Group switcher — tournaments like the World Cup have several tables */}
        {data && data.groups.length > 1 && (
          <div className="flex flex-shrink-0 gap-1.5 overflow-x-auto border-b border-line px-4 py-2.5 no-scrollbar">
            {data.groups.map((g, i) => (
              <button
                key={g.name || i}
                type="button"
                onClick={() => setGroupIndex(i)}
                aria-pressed={i === groupIndex}
                className={`flex-shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                  i === groupIndex
                    ? 'bg-accent-500/15 text-accent-600 dark:text-accent-400'
                    : 'bg-surface text-muted hover:text-fg'
                }`}
              >
                {g.name || 'Table'}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="space-y-2 p-4" aria-hidden>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton h-9 rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
              <p className="text-sm font-medium text-fg">{error}</p>
              <p className="text-xs text-muted">This league may not have a table</p>
            </div>
          ) : group ? (
            <table className="w-full text-left">
              <thead className="sticky top-0 z-10 bg-elevated">
                <tr className="border-b border-line text-[10px] font-bold uppercase tracking-wider text-subtle">
                  <th scope="col" className="w-9 px-3 py-2.5 text-center">#</th>
                  <th scope="col" className="py-2.5">Team</th>
                  <th scope="col" className="w-8 py-2.5 text-center">P</th>
                  <th scope="col" className="w-8 py-2.5 text-center">W</th>
                  <th scope="col" className="w-8 py-2.5 text-center">D</th>
                  <th scope="col" className="w-8 py-2.5 text-center">L</th>
                  <th scope="col" className="w-10 py-2.5 text-center">GD</th>
                  <th scope="col" className="w-11 py-2.5 pr-3 text-center">Pts</th>
                </tr>
              </thead>
              <tbody>
                {group.teams.map((team) => {
                  const gd = team.goalsFor - team.goalsAgainst;
                  // Promotion/relegation zones, in the conventional 4/2/3 split.
                  const zone =
                    team.position <= 4
                      ? 'border-l-2 border-l-accent-500'
                      : team.position >= group.teams.length - 2
                        ? 'border-l-2 border-l-red-500/70'
                        : team.position === group.teams.length - 3
                          ? 'border-l-2 border-l-amber-500/70'
                          : 'border-l-2 border-l-transparent';
                  return (
                    <tr key={`${team.position}-${team.name}`} className={`border-b border-line/50 ${zone} transition-colors hover:bg-sunken/60`}>
                      <td className="nums py-2.5 pl-3 text-center text-[13px] font-bold text-muted">{team.position}</td>
                      <td className="truncate py-2.5 pr-2 text-[13px] font-semibold text-fg">{team.name}</td>
                      <td className="nums py-2.5 text-center text-[13px] text-muted">{team.played}</td>
                      <td className="nums py-2.5 text-center text-[13px] text-muted">{team.wins}</td>
                      <td className="nums py-2.5 text-center text-[13px] text-muted">{team.draws}</td>
                      <td className="nums py-2.5 text-center text-[13px] text-muted">{team.losses}</td>
                      <td className={`nums py-2.5 text-center text-[13px] font-semibold ${gd > 0 ? 'text-accent-600 dark:text-accent-400' : gd < 0 ? 'text-red-500' : 'text-muted'}`}>
                        {gd > 0 ? `+${gd}` : gd}
                      </td>
                      <td className="nums py-2.5 pr-3 text-center text-[13px] font-extrabold text-fg">{team.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-16 text-center text-sm text-muted">No data available</div>
          )}
        </div>

        {group && group.teams.length > 0 && (
          <div className="flex flex-shrink-0 items-center gap-3 border-t border-line px-4 py-2 text-[10px] text-subtle">
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-0.5 rounded bg-accent-500" /> Top 4
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-0.5 rounded bg-amber-500" /> Relegation
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-0.5 rounded bg-red-500/70" /> Bottom 2
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
