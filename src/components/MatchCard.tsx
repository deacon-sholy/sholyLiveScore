import type { Match } from '../types';
import { formatKickoff } from '../lib/api';

interface MatchCardProps {
  match: Match;
  onClick: () => void;
}

function LiveDot({ className = '' }: { className?: string }) {
  return (
    <span className={`relative flex h-2 w-2 ${className}`}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
    </span>
  );
}

function StatusBadge({ match }: { match: Match }) {
  if (match.status === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-500">
        <LiveDot className="h-1.5 w-1.5" />
        <span className="sr-only">Live: </span>
        {match.status_detail || 'Live'}
      </span>
    );
  }
  if (match.status === 'halftime') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Half time
      </span>
    );
  }
  if (match.status === 'finished') {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wide text-subtle">
        {match.status_detail || 'Full time'}
      </span>
    );
  }
  return <span className="nums text-[11px] font-semibold text-muted">{formatKickoff(match.kickoff)}</span>;
}

function TeamLogo({
  logo,
  shortName,
  color,
  size = 'sm',
}: {
  logo: string | null;
  shortName: string;
  color: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dims = size === 'lg' ? 'h-14 w-14' : size === 'md' ? 'h-10 w-10' : 'h-7 w-7';
  const imgDims = size === 'lg' ? 'h-10 w-10' : size === 'md' ? 'h-7 w-7' : 'h-5 w-5';
  const fontSize = size === 'lg' ? 'text-sm' : size === 'md' ? 'text-[11px]' : 'text-[9px]';

  if (logo) {
    return (
      <span
        className={`flex ${dims} flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-sunken p-1 ring-1 ring-inset ring-line`}
      >
        <img src={logo} alt="" loading="lazy" className={`${imgDims} object-contain`} />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={`flex ${dims} flex-shrink-0 items-center justify-center rounded-full ${fontSize} font-bold uppercase text-white ring-1 ring-inset ring-black/10`}
      style={{ backgroundColor: color ? `#${color}` : '#64748b' }}
    >
      {shortName.slice(0, 3)}
    </span>
  );
}

export default function MatchCard({ match, onClick }: MatchCardProps) {
  const isLive = match.status === 'live' || match.status === 'halftime';
  const isFinished = match.status === 'finished';
  const home = match.home_team;
  const away = match.away_team;

  const goals = match.events.filter((e) => e.type === 'goal');
  const yellowCards = match.events.filter((e) => e.type === 'yellow_card');
  const redCards = match.events.filter((e) => e.type === 'red_card');

  return (
    <button
      onClick={onClick}
      aria-label={`${home.name} versus ${away.name}${
        isFinished ? `, final score ${match.home_score} to ${match.away_score}` : ''
      }${isLive ? ', in play' : ''}`}
      className={`group relative w-full overflow-hidden rounded-2xl border text-left transition-all duration-200 active:scale-[0.995] ${
        isLive
          ? 'border-red-500/30 bg-red-500/[0.04] hover:border-red-500/50 hover:bg-red-500/[0.07]'
          : isFinished
            ? 'border-line bg-surface hover:border-line-strong hover:bg-elevated'
            : 'border-line bg-surface hover:border-line-strong hover:bg-elevated hover:shadow-lift'
      }`}
    >
      {isLive && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-red-400 to-red-600" />}

      <div className="flex items-center gap-3 px-3.5 py-3">
        {/* Home */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <TeamLogo logo={home.logo} shortName={home.short_name ?? home.name} color={home.color} />
          <span className={`truncate text-[13px] font-semibold leading-tight sm:text-sm ${isFinished ? 'text-muted' : 'text-fg'}`}>
            {home.name}
          </span>
        </div>

        {/* Score / kickoff */}
        <div className="flex w-[74px] flex-shrink-0 flex-col items-center gap-1">
          {match.status === 'scheduled' ? (
            <>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-subtle">vs</span>
              <StatusBadge match={match} />
            </>
          ) : (
            <>
              <span className={`nums text-[19px] font-extrabold leading-none tracking-tight ${isLive ? 'text-fg' : isFinished ? 'text-muted' : 'text-fg'}`}>
                {match.home_score}
                <span className="mx-1 text-subtle">–</span>
                {match.away_score}
              </span>
              <StatusBadge match={match} />
            </>
          )}
        </div>

        {/* Away */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5">
          <span className={`truncate text-[13px] font-semibold leading-tight sm:text-sm ${isFinished ? 'text-muted' : 'text-fg'}`}>
            {away.name}
          </span>
          <TeamLogo logo={away.logo} shortName={away.short_name ?? away.name} color={away.color} />
        </div>
      </div>

      {/* Event chips */}
      {(goals.length > 0 || yellowCards.length > 0 || redCards.length > 0) && (
        <div className="flex items-center gap-2.5 border-t border-line px-3.5 py-1.5">
          {goals.length > 0 && (
            <span className="nums inline-flex items-center gap-1 text-[10px] font-bold text-accent-600 dark:text-accent-400">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
              {goals.length}
              <span className="sr-only"> goals</span>
            </span>
          )}
          {yellowCards.length > 0 && (
            <span className="nums inline-flex items-center gap-1 text-[10px] font-semibold text-muted" title={`${yellowCards.length} yellow cards`}>
              <span className="h-3 w-2 rounded-[2px] bg-amber-400" />
              {yellowCards.length}
            </span>
          )}
          {redCards.length > 0 && (
            <span className="nums inline-flex items-center gap-1 text-[10px] font-semibold text-muted" title={`${redCards.length} red cards`}>
              <span className="h-3 w-2 rounded-[2px] bg-red-500" />
              {redCards.length}
            </span>
          )}

          {isLive && match.minute != null && (
            <span className="nums ml-auto text-[10px] font-bold text-red-500">{match.minute}&apos;</span>
          )}
        </div>
      )}

      {isLive && match.minute != null && (
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-line">
          <span
            className="block h-full bg-gradient-to-r from-red-500 to-red-400 transition-[width] duration-1000 ease-linear"
            style={{ width: `${Math.min((match.minute / 90) * 100, 100)}%` }}
          />
        </span>
      )}
    </button>
  );
}
