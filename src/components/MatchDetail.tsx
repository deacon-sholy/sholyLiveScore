import { ArrowLeft, Goal, ArrowRightLeft, Calendar, Clock } from 'lucide-react';
import type { Match, MatchEvent } from '../types';
import { sortEventsByMinute } from '../lib/api';

interface MatchDetailProps {
  match: Match;
  onBack: () => void;
}

function EventRow({ event, homeTeamId, awayTeamId }: { event: MatchEvent; homeTeamId: string; awayTeamId: string }) {
  const isHome = event.team_id === homeTeamId;
  const isAway = event.team_id === awayTeamId;

  let icon: React.ReactNode;
  let badgeColor = 'bg-ink-700 text-ink-300';

  if (event.type === 'goal') {
    icon = <Goal className="h-4 w-4 text-green-500" />;
    badgeColor = 'bg-green-500/15 text-green-400 border-green-500/20';
  } else if (event.type === 'yellow_card') {
    icon = <div className="h-4 w-3 rounded-[2px] bg-yellow-500 shadow-sm shadow-yellow-500/30" />;
    badgeColor = 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20';
  } else if (event.type === 'red_card') {
    icon = <div className="h-4 w-3 rounded-[2px] bg-red-600 shadow-sm shadow-red-600/30" />;
    badgeColor = 'bg-red-500/15 text-red-400 border-red-500/20';
  } else {
    icon = <ArrowRightLeft className="h-4 w-4 text-blue-400" />;
    badgeColor = 'bg-blue-500/15 text-blue-400 border-blue-500/20';
  }

  return (
    <div className="flex items-center gap-3 py-3 transition-colors hover:bg-white/[0.02] first:pt-4 last:pb-4">
      {/* Home side */}
      <div className="flex flex-1 justify-end min-w-0">
        {isHome && (
          <div className="flex items-center gap-2.5 text-right max-w-full">
            <div className="flex flex-col items-end min-w-0">
              <span className="truncate text-sm font-semibold text-ink-100">{event.player_name}</span>
              {event.detail && <span className="text-xs text-ink-400 truncate">{event.detail}</span>}
            </div>
            <div className="flex-shrink-0">{icon}</div>
          </div>
        )}
      </div>

      {/* Minute */}
      <div className="flex w-14 flex-shrink-0 justify-center">
        <span className={`inline-flex items-center justify-center rounded-lg border px-2.5 py-1 text-xs font-bold tabular-nums ${badgeColor}`}>
          {event.minute}'
        </span>
      </div>

      {/* Away side */}
      <div className="flex flex-1 min-w-0">
        {isAway && (
          <div className="flex items-center gap-2.5 max-w-full">
            <div className="flex-shrink-0">{icon}</div>
            <div className="flex flex-col min-w-0">
              <span className="truncate text-sm font-semibold text-ink-100">{event.player_name}</span>
              {event.detail && <span className="text-xs text-ink-400 truncate">{event.detail}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TeamLogo({ logo, name, shortName, color, size = 'md' }: { logo: string | null; name: string; shortName: string; color: string | null; size?: 'md' | 'lg' }) {
  const dims = size === 'lg' ? 'h-16 w-16 sm:h-20 sm:w-20' : 'h-7 w-7';
  const imgDims = size === 'lg' ? 'h-11 w-11 sm:h-14 sm:w-14' : 'h-5 w-5';
  const fontSize = size === 'lg' ? 'text-base sm:text-lg' : 'text-[10px]';

  if (logo) {
    return (
      <div className={`flex ${dims} items-center justify-center overflow-hidden rounded-2xl bg-white/[0.04] p-1.5 transition-transform hover:scale-110`}>
        <img src={logo} alt={name} className={`${imgDims} object-contain`} />
      </div>
    );
  }
  const bgColor = color ? `#${color}` : '#1e293b';
  return (
    <div className={`flex ${dims} items-center justify-center rounded-2xl ${fontSize} font-bold text-white`} style={{ backgroundColor: bgColor }}>
      {shortName.slice(0, 3)}
    </div>
  );
}

function ScoreDisplay({ home, away, isLive }: { home: number; away: number; isLive: boolean }) {
  return (
    <div className="flex items-center gap-3 sm:gap-5">
      <span className={`text-4xl sm:text-6xl font-extrabold tabular-nums transition-all ${isLive ? 'text-white' : 'text-ink-200'}`}>
        {home}
      </span>
      <div className="flex flex-col items-center gap-1">
        <span className="text-xl sm:text-2xl font-light text-ink-600">:</span>
      </div>
      <span className={`text-4xl sm:text-6xl font-extrabold tabular-nums transition-all ${isLive ? 'text-white' : 'text-ink-200'}`}>
        {away}
      </span>
    </div>
  );
}

export default function MatchDetail({ match, onBack }: MatchDetailProps) {
  const homeTeam = match.home_team;
  const awayTeam = match.away_team;
  const events = sortEventsByMinute(match.events);
  const isLive = match.status === 'live' || match.status === 'halftime';
  const kickoffDate = new Date(match.kickoff);
  const kickoffStr = kickoffDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const kickoffTime = kickoffDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      {/* Back button */}
      <button
        onClick={onBack}
        className="group mb-6 flex items-center gap-2 text-sm font-medium text-ink-400 transition-all hover:text-ink-100"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/5 bg-white/[0.03] transition-colors group-hover:border-white/10 group-hover:bg-white/[0.06]">
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        </div>
        Back to scores
      </button>

      {/* Scoreboard */}
      <div className="overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-b from-ink-800/80 to-ink-850/40 shadow-xl">
        {/* League header */}
        <div className="flex items-center justify-center gap-2.5 border-b border-white/5 bg-white/[0.02] py-3">
          {match.league_logo && (
            <img src={match.league_logo} alt={match.league_name} className="h-4 w-4 object-contain" />
          )}
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-300">
            {match.league_name}
            {match.league_country ? <span className="text-ink-500"> · {match.league_country}</span> : ''}
          </span>
        </div>

        {/* Score */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-8 sm:py-12">
          {/* Home */}
          <div className="flex flex-1 flex-col items-center gap-3">
            <TeamLogo logo={homeTeam.logo} name={homeTeam.name} shortName={homeTeam.short_name ?? homeTeam.name} color={homeTeam.color} size="lg" />
            <span className="text-center text-sm sm:text-base font-bold text-ink-100 max-w-[120px] truncate">{homeTeam.name}</span>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-3">
            {match.status === 'scheduled' ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-ink-300">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-semibold">{kickoffStr}</span>
                </div>
                <div className="flex items-center gap-2 text-ink-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{kickoffTime}</span>
                </div>
              </div>
            ) : (
              <>
                <ScoreDisplay home={match.home_score} away={match.away_score} isLive={isLive} />
                {isLive && (
                  <div className="flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                    </span>
                    <span className="text-xs font-bold text-red-400 tabular-nums">
                      {match.status_detail || 'LIVE'}
                      {match.minute ? ` · ${match.minute}'` : ''}
                    </span>
                  </div>
                )}
                {match.status === 'halftime' && (
                  <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5">
                    <span className="text-xs font-bold text-amber-400">Half Time</span>
                  </div>
                )}
              </>
            )}
            {match.status === 'finished' && (
              <div className="rounded-full border border-white/5 bg-white/[0.03] px-4 py-1.5">
                <span className="text-xs font-bold text-ink-300">{match.status_detail || 'Full Time'}</span>
              </div>
            )}
          </div>

          {/* Away */}
          <div className="flex flex-1 flex-col items-center gap-3">
            <TeamLogo logo={awayTeam.logo} name={awayTeam.name} shortName={awayTeam.short_name ?? awayTeam.name} color={awayTeam.color} size="lg" />
            <span className="text-center text-sm sm:text-base font-bold text-ink-100 max-w-[120px] truncate">{awayTeam.name}</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {events.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] shadow-lg">
          <h3 className="flex items-center gap-2 border-b border-white/5 px-5 py-4 text-sm font-bold text-ink-100">
            <div className="h-2 w-2 rounded-full bg-accent-500" />
            Match Events
            <span className="ml-auto text-[11px] font-medium text-ink-500">{events.length} events</span>
          </h3>
          <div className="px-5 divide-y divide-white/[0.03]">
            {events.map((event, idx) => (
              <EventRow
                key={idx}
                event={event}
                homeTeamId={homeTeam.id}
                awayTeamId={awayTeam.id}
              />
            ))}
          </div>
        </div>
      )}

      {events.length === 0 && match.status === 'scheduled' && (
        <div className="mt-5 flex flex-col items-center gap-5 rounded-3xl border border-white/5 bg-white/[0.02] py-16 shadow-lg">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03] ring-1 ring-white/5">
            <Calendar className="h-8 w-8 text-ink-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-ink-200">Match hasn't started yet</p>
            <p className="mt-1.5 text-xs text-ink-400">{kickoffStr} · {kickoffTime}</p>
          </div>
        </div>
      )}

      {events.length === 0 && match.status === 'finished' && (
        <div className="mt-5 flex flex-col items-center gap-4 rounded-3xl border border-white/5 bg-white/[0.02] py-16 shadow-lg">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03] ring-1 ring-white/5">
            <span className="text-2xl text-ink-500">📊</span>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-ink-200">Match finished</p>
            <p className="mt-1 text-xs text-ink-400">No event data available for this match</p>
          </div>
        </div>
      )}
    </div>
  );
}