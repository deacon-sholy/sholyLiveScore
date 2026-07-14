import { useState } from 'react';
import type { Match } from '../types';
import { formatKickoff } from '../lib/api';

interface MatchCardProps {
  match: Match;
  onClick: () => void;
}

function StatusBadge({ match }: { match: Match }) {
  if (match.status === 'live') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        <span className="text-[11px] font-bold text-red-400">{match.status_detail || 'LIVE'}</span>
      </div>
    );
  }
  if (match.status === 'halftime') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        <span className="text-[11px] font-bold text-amber-400">HT</span>
      </div>
    );
  }
  if (match.status === 'finished') {
    return <span className="text-[11px] font-semibold text-ink-400">{match.status_detail || 'FT'}</span>;
  }
  return <span className="text-[11px] font-medium text-ink-400">{formatKickoff(match.kickoff)}</span>;
}

function TeamLogo({ logo, name, shortName, color, size = 'sm' }: { logo: string | null; name: string; shortName: string; color: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'lg' ? 'h-12 w-12' : size === 'md' ? 'h-9 w-9' : 'h-7 w-7';
  const imgDims = size === 'lg' ? 'h-8 w-8' : size === 'md' ? 'h-6 w-6' : 'h-5 w-5';
  const fontSize = size === 'lg' ? 'text-sm' : size === 'md' ? 'text-[11px]' : 'text-[10px]';

  if (logo) {
    return (
      <div className={`flex ${dims} flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.06] p-1 transition-transform group-hover:scale-110`}>
        <img src={logo} alt={name} className={`${imgDims} object-contain`} />
      </div>
    );
  }
  const bgColor = color ? `#${color}` : '#1e293b';
  return (
    <div 
      className={`flex ${dims} flex-shrink-0 items-center justify-center rounded-full ${fontSize} font-bold text-white transition-transform group-hover:scale-110`} 
      style={{ backgroundColor: bgColor }}
    >
      {shortName.slice(0, 3)}
    </div>
  );
}

function LiveProgressBar({ minute }: { minute: number | null }) {
  const mins = minute ?? 0;
  const progress = Math.min((mins / 90) * 100, 100);
  return (
    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5 overflow-hidden">
      <div 
        className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-1000 ease-linear"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export default function MatchCard({ match, onClick }: MatchCardProps) {
  const isLive = match.status === 'live' || match.status === 'halftime';
  const homeTeam = match.home_team;
  const awayTeam = match.away_team;
  const goals = match.events.filter((e) => e.type === 'goal');
  const yellowCards = match.events.filter((e) => e.type === 'yellow_card');
  const redCards = match.events.filter((e) => e.type === 'red_card');
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative w-full overflow-hidden rounded-2xl border text-left transition-all duration-300 hover:scale-[1.015] ${
        isLive
          ? 'border-red-500/20 bg-gradient-to-r from-ink-800/80 to-ink-850/60 hover:border-red-500/40 hover:shadow-[0_0_25px_rgba(239,68,68,0.08)]'
          : 'border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04] hover:shadow-[0_0_25px_rgba(255,255,255,0.03)]'
      } ${match.status === 'finished' ? 'opacity-70 hover:opacity-90' : ''}`}
    >
      {/* Live indicator strip */}
      {isLive && (
        <div className="absolute left-0 top-0 h-full w-0.5 bg-gradient-to-b from-red-500 to-red-600" />
      )}
      {/* Scheduled indicator strip */}
      {match.status === 'scheduled' && (
        <div className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-accent-500/30" />
      )}

      <div className="flex items-center justify-between px-4 py-3.5">
        {/* Home team */}
        <div className="flex flex-1 items-center gap-2.5 min-w-0">
          <TeamLogo logo={homeTeam.logo} name={homeTeam.name} shortName={homeTeam.short_name ?? homeTeam.name} color={homeTeam.color} />
          <span className={`truncate text-sm font-semibold transition-colors ${isHovered ? 'text-white' : 'text-ink-100'}`}>{homeTeam.name}</span>
        </div>

        {/* Score / time */}
        <div className="mx-3 flex min-w-[64px] flex-col items-center">
          {match.status === 'scheduled' ? (
            <span className="text-sm font-bold text-ink-500">vs</span>
          ) : (
            <div className="flex items-center gap-2">
              <span className={`text-xl font-extrabold tabular-nums transition-all ${isLive ? 'text-white' : 'text-ink-200'}`}>
                {match.home_score}
              </span>
              <span className="text-sm text-ink-600">-</span>
              <span className={`text-xl font-extrabold tabular-nums transition-all ${isLive ? 'text-white' : 'text-ink-200'}`}>
                {match.away_score}
              </span>
            </div>
          )}
          <div className="mt-1">
            <StatusBadge match={match} />
          </div>
        </div>

        {/* Away team */}
        <div className="flex flex-1 items-center justify-end gap-2.5 min-w-0">
          <span className={`truncate text-sm font-semibold transition-colors ${isHovered ? 'text-white' : 'text-ink-100'}`}>{awayTeam.name}</span>
          <TeamLogo logo={awayTeam.logo} name={awayTeam.name} shortName={awayTeam.short_name ?? awayTeam.name} color={awayTeam.color} />
        </div>
      </div>

      {/* Live progress bar */}
      {isLive && <LiveProgressBar minute={match.minute} />}

      {/* Event indicators */}
      {(match.events.length > 0 || isLive) && (
        <div className={`flex items-center gap-3 border-t ${isLive ? 'border-red-500/10' : 'border-white/5'} px-4 py-2`}>
          {goals.length > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-ink-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
              </span>
              {goals.length} {goals.length === 1 ? 'goal' : 'goals'}
            </span>
          )}
          {yellowCards.length > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-ink-400">
              <span className="h-2 w-1.5 rounded-sm bg-yellow-500" />
              {yellowCards.length}
            </span>
          )}
          {redCards.length > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-ink-400">
              <span className="h-2 w-1.5 rounded-sm bg-red-600" />
              {redCards.length}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {match.minute && isLive && (
              <span className="text-[10px] font-bold text-red-400/70 tabular-nums">{match.minute}'</span>
            )}
            <span className="text-[10px] font-medium text-ink-500 transition-all group-hover:text-accent-400 group-hover:translate-x-0.5">
              View details →
            </span>
          </div>
        </div>
      )}

      {/* Subtle glow on hover */}
      {isLive && (
        <div className={`absolute inset-0 rounded-2xl transition-opacity duration-500 pointer-events-none ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute inset-0 rounded-2xl ring-1 ring-red-500/20" />
        </div>
      )}
    </button>
  );
}