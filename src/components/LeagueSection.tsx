import { Star, Trophy } from 'lucide-react';
import type { LeagueWithMatches } from '../types';
import { isInPlay } from '../lib/api';
import { getLeague } from '../lib/leagues';
import MatchCard from './MatchCard';

interface LeagueSectionProps {
  league: LeagueWithMatches;
  favorite: boolean;
  onToggleFavorite: (slug: string) => void;
  onMatchClick: (matchId: string) => void;
  onStandingsClick: (leagueSlug: string, leagueName: string) => void;
}

export default function LeagueSection({
  league,
  favorite,
  onToggleFavorite,
  onMatchClick,
  onStandingsClick,
}: LeagueSectionProps) {
  const liveCount = league.matches.filter(isInPlay).length;
  const finishedCount = league.matches.filter((m) => m.status === 'finished').length;
  const hasStandings = getLeague(league.slug)?.standings !== false;

  return (
    <section className="animate-slide-up">
      {/* League header */}
      <div className="mb-2.5 flex items-center gap-3 px-0.5">
        <span className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface">
          {league.logo ? (
            <img src={league.logo} alt="" loading="lazy" className="h-6 w-6 object-contain" />
          ) : (
            <span aria-hidden className="text-[10px] font-bold text-muted">
              {league.name.slice(0, 2)}
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-sm font-bold leading-tight text-fg">{league.name}</h2>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
            <span className="truncate">{league.country}</span>
            {liveCount > 0 && (
              <span className="inline-flex flex-shrink-0 items-center gap-1 font-semibold text-red-500">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                </span>
                {liveCount} live
              </span>
            )}
            {liveCount === 0 && finishedCount > 0 && <span className="flex-shrink-0">{finishedCount} finished</span>}
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5">
          {hasStandings && (
            <button
              onClick={() => onStandingsClick(league.slug, league.name)}
              aria-label={`${league.name} standings`}
              className="flex h-7 items-center gap-1.5 rounded-lg border border-line bg-surface px-2 text-[11px] font-semibold text-muted transition-colors hover:border-accent-500/40 hover:bg-accent-500/5 hover:text-accent-600 dark:hover:text-accent-400"
            >
              <Trophy className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
          )}
          <button
            onClick={() => onToggleFavorite(league.slug)}
            aria-pressed={favorite}
            aria-label={favorite ? `Remove ${league.name} from My Leagues` : `Add ${league.name} to My Leagues`}
            className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${
              favorite
                ? 'border-amber-500/40 bg-amber-500/15 text-amber-500'
                : 'border-line bg-surface text-subtle hover:border-amber-500/40 hover:text-amber-500'
            }`}
          >
            <Star className="h-3.5 w-3.5" fill={favorite ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      {/* Matches */}
      <div className="flex flex-col gap-2">
        {league.matches.map((match) => (
          <MatchCard key={match.id} match={match} onClick={() => onMatchClick(match.id)} />
        ))}
      </div>
    </section>
  );
}
