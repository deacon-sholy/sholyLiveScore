import { Trophy } from 'lucide-react';
import type { LeagueWithMatches } from '../types';
import MatchCard from './MatchCard';

interface LeagueSectionProps {
  league: LeagueWithMatches;
  onMatchClick: (matchId: string, leagueSlug: string) => void;
  onStandingsClick: (leagueSlug: string, leagueName: string) => void;
}

export default function LeagueSection({ league, onMatchClick, onStandingsClick }: LeagueSectionProps) {
  const liveCount = league.matches.filter((m) => m.status === 'live').length;
  const finishedCount = league.matches.filter((m) => m.status === 'finished').length;

  return (
    <div className="mb-6 animate-slide-up">
      {/* League header */}
      <div className="mb-3 flex items-center gap-3">
        <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-white/[0.03]">
          {league.logo ? (
            <img src={league.logo} alt={league.name} className="h-7 w-7 object-contain" />
          ) : (
            <span className="text-xs font-bold text-ink-300">{league.name.slice(0, 2)}</span>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <h2 className="font-display text-sm font-bold text-white truncate">{league.name}</h2>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-ink-400">{league.country}</span>
            {liveCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-red-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                </span>
                {liveCount} live
              </span>
            )}
            {finishedCount > 0 && liveCount === 0 && (
              <span className="text-[11px] text-ink-500">{finishedCount} finished</span>
            )}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => onStandingsClick(league.slug, league.name)}
            className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-semibold text-ink-400 transition-all hover:border-accent-500/30 hover:bg-accent-500/5 hover:text-accent-400"
          >
            <Trophy className="h-3 w-3" />
            Table
          </button>
          <div className="flex h-7 min-w-7 items-center justify-center rounded-lg border border-white/5 bg-white/[0.03] px-2 text-[11px] font-semibold text-ink-400">
            {league.matches.length}
          </div>
        </div>
      </div>

      {/* Matches */}
      <div className="flex flex-col gap-2.5">
        {league.matches.map((match, idx) => (
          <div key={match.id} style={{ animationDelay: `${idx * 50}ms` }}>
            <MatchCard match={match} onClick={() => onMatchClick(match.id, match.league_slug)} />
          </div>
        ))}
      </div>
    </div>
  );
}