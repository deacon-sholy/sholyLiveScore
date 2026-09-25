import { ArrowLeft, Goal, ArrowRightLeft, Calendar, Clock } from 'lucide-react';
import type { FormResult, Match, MatchEvent } from '../types';
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
  } else if (event.type === 'substitution') {
    icon = <ArrowRightLeft className="h-4 w-4 text-blue-400" />;
    badgeColor = 'bg-blue-500/15 text-blue-400 border-blue-500/20';
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
        {/* ESPN occasionally omits the team on an event; show it centrally
            rather than rendering a row with only a minute badge. */}
        {!isHome && !isAway && (
          <div className="flex items-center gap-2.5">
            <div className="flex-shrink-0">{icon}</div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-ink-100">
                {event.player_name || '—'}
              </span>
              {event.detail && <span className="truncate text-xs text-ink-400">{event.detail}</span>}
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

function StatRow({ label, home, away, isPercent = false }: { label: string; home: number | null; away: number | null; isPercent?: boolean }) {
  // Percentages (possession, pass accuracy) are already a share of the whole,
  // so the bar must use the value directly. Counting stats share the total
  // between the two teams, so the bar uses home / (home + away).
  const frac = isPercent
    ? (home ?? 50) / 100
    : home === null || away === null
      ? 0.5
      : (home + away) > 0
        ? home / (home + away)
        : 0.5;
  const fmt = (v: number | null) => (v === null ? '–' : isPercent ? `${v}%` : `${v}`);
  const missing = home === null || away === null;

  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="w-9 flex-shrink-0 text-right text-sm font-bold tabular-nums text-ink-100">{fmt(home)}</span>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
        {missing ? (
          <div className="h-full w-full bg-white/[0.02]" />
        ) : (
          <>
            <div className="h-full rounded-full bg-gradient-to-r from-accent-500/70 to-accent-400" style={{ width: `${frac * 100}%` }} />
            <div
              className="absolute top-0 h-full w-px bg-white/20"
              style={{ left: '50%' }}
            />
          </>
        )}
      </div>
      <span className="w-9 flex-shrink-0 text-sm font-bold tabular-nums text-ink-100">{fmt(away)}</span>
      <span className="flex w-24 flex-shrink-0 justify-end text-right text-[10px] font-medium leading-tight text-ink-500">{label}</span>
    </div>
  );
}

function FormChips({ results, teamName }: { results: FormResult[]; teamName: string }) {
  if (!results || results.length === 0) return null;
  const chipClass = (r: string) =>
    r === 'W' ? 'bg-green-500/15 text-green-400' : r === 'D' ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400';
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <span className="text-xs font-bold text-ink-300">{teamName}</span>
      <div className="flex items-center gap-1.5">
        {results.map((f, i) => (
          <span
            key={i}
            title={`${f.atVs === 'at' ? '@' : ''}${f.opponent || 'Unknown'} · ${f.score || ''} · ${f.date ? f.date.slice(0, 10) : ''}`}
            className={`flex h-6 min-w-6 items-center justify-center rounded-lg px-1.5 text-[11px] font-extrabold ${chipClass(f.result)}`}
          >
            {f.result || '?'}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function MatchDetail({ match, onBack }: MatchDetailProps) {
  const homeTeam = match.home_team;
  const awayTeam = match.away_team;
  const events = sortEventsByMinute(match.events);
  const isLive = match.status === 'live' || match.status === 'halftime';
  // ESPN can omit goals from the event feed (shootouts, own-goal data gaps), so
  // warn instead of showing a timeline that silently disagrees with the score.
  const goalGap = match.home_score + match.away_score - events.filter((e) => e.type === 'goal').length;
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

      {match.detail?.h2h && (
        <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Head-to-Head</span>
          <span className="text-sm font-bold text-ink-100">{match.detail.h2h.summary}</span>
        </div>
      )}

      {/* Last 5 form */}
      {match.detail?.form && (match.detail.form.home.length > 0 || match.detail.form.away.length > 0) && (
        <div className="mt-5 overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] shadow-lg">
          <h3 className="flex items-center gap-2 border-b border-white/5 px-5 py-4 text-sm font-bold text-ink-100">
            <div className="h-2 w-2 rounded-full bg-accent-500" />
            Last 5 Form
            <span className="ml-auto text-[11px] font-medium text-ink-500">oldest → newest</span>
          </h3>
          <div className="flex flex-col gap-4 px-5 py-4">
            <FormChips results={match.detail.form.home} teamName={homeTeam.name} />
            <FormChips results={match.detail.form.away} teamName={awayTeam.name} />
          </div>
        </div>
      )}

      {/* Team statistics */}
      {match.detail?.stats && (
        <div className="mt-5 overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] shadow-lg">
          <h3 className="flex items-center gap-2 border-b border-white/5 px-5 py-4 text-sm font-bold text-ink-100">
            <div className="h-2 w-2 rounded-full bg-accent-500" />
            Statistics
            <span className="ml-auto text-[11px] font-medium text-ink-500">{homeTeam.name} vs {awayTeam.name}</span>
          </h3>
          <div className="px-5 py-2">
            <StatRow label="Possession" home={match.detail.stats.home.possession} away={match.detail.stats.away.possession} isPercent />
            <StatRow label="Total shots" home={match.detail.stats.home.shots} away={match.detail.stats.away.shots} />
            <StatRow label="Shots on target" home={match.detail.stats.home.shots_on_target} away={match.detail.stats.away.shots_on_target} />
            <StatRow label="Corners" home={match.detail.stats.home.corners} away={match.detail.stats.away.corners} />
            <StatRow label="Fouls" home={match.detail.stats.home.fouls} away={match.detail.stats.away.fouls} />
            <StatRow label="Yellow cards" home={match.detail.stats.home.yellow_cards} away={match.detail.stats.away.yellow_cards} />
            <StatRow label="Red cards" home={match.detail.stats.home.red_cards} away={match.detail.stats.away.red_cards} />
            <StatRow label="Offsides" home={match.detail.stats.home.offsides} away={match.detail.stats.away.offsides} />
            <StatRow label="Saves" home={match.detail.stats.home.saves} away={match.detail.stats.away.saves} />
            <StatRow label="Passes" home={match.detail.stats.home.passes} away={match.detail.stats.away.passes} />
            <StatRow label="Pass accuracy" home={match.detail.stats.home.pass_accuracy} away={match.detail.stats.away.pass_accuracy} isPercent />
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

      {events.length > 0 && goalGap > 0 && (
        <p className="mt-3 text-center text-[11px] text-ink-500">
          {goalGap} more {goalGap === 1 ? 'goal' : 'goals'} not listed in the timeline
        </p>
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