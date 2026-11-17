import { ArrowLeft, Goal, ArrowRightLeft, Calendar, CalendarPlus, Clock, Heart, BarChart3, ListOrdered } from 'lucide-react';
import type { Match, MatchEvent } from '../types';
import { sortEventsByMinute } from '../lib/api';
import MatchHistory from './MatchHistory';
import MatchLineups from './MatchLineups';

interface MatchDetailProps {
  match: Match;
  onBack: () => void;
  followedTeamIds?: string[];
  onToggleFollow?: (team: { id: string; name: string }) => void;
  onAddCalendar?: () => void;
}

function EventRow({
  event,
  homeTeamId,
  awayTeamId,
}: {
  event: MatchEvent;
  homeTeamId: string;
  awayTeamId: string;
}) {
  const isHome = event.team_id === homeTeamId;
  const isAway = event.team_id === awayTeamId;

  let icon: React.ReactNode;
  let badgeClass = 'border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400';
  let dotClass = '';

  if (event.type === 'goal') {
    icon = <Goal className="h-3.5 w-3.5 text-accent-500" />;
    badgeClass = 'border-accent-500/30 bg-accent-500/10 text-accent-600 dark:text-accent-400';
    dotClass = 'bg-accent-500';
  } else if (event.type === 'substitution') {
    icon = <ArrowRightLeft className="h-3.5 w-3.5 text-sky-500" />;
  } else if (event.type === 'yellow_card') {
    icon = <span aria-hidden className="h-3.5 w-2.5 rounded-[2px] bg-amber-400" />;
    badgeClass = 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400';
  } else if (event.type === 'red_card') {
    icon = <span aria-hidden className="h-3.5 w-2.5 rounded-[2px] bg-red-500" />;
    badgeClass = 'border-red-500/30 bg-red-500/10 text-red-500';
  } else {
    icon = <ArrowRightLeft className="h-3.5 w-3.5 text-sky-500" />;
  }

  const body = (
    <div className="min-w-0">
      <span className="block truncate text-[13px] font-semibold text-fg">{event.player_name || '—'}</span>
      {event.detail && <span className="block truncate text-[11px] text-muted">{event.detail}</span>}
    </div>
  );

  return (
    <li className="relative flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
      {/* Timeline spine. Centred on the minute badge, which sits between the
          two team columns, so it has to track the container rather than sit at
          a fixed offset. */}
      <span aria-hidden className="absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-line" />
      {dotClass && <span aria-hidden className={`absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-surface ${dotClass}`} />}

      <div className="flex min-w-0 flex-1 justify-end text-right">
        {isHome && (
          <span className="flex items-center gap-2">
            {body}
            <span className="flex flex-shrink-0 items-center">{icon}</span>
          </span>
        )}
      </div>

      <span
        className={`nums relative z-10 flex h-9 w-[42px] flex-shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold ${badgeClass}`}
      >
        {event.minute}&apos;
      </span>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        {isAway && (
          <>
            <span className="flex flex-shrink-0 items-center">{icon}</span>
            {body}
          </>
        )}
        {/* ESPN occasionally omits the team on an event; show it centrally
            rather than rendering a row with only a minute badge. */}
        {!isHome && !isAway && (
          <>
            <span className="flex flex-shrink-0 items-center">{icon}</span>
            {body}
          </>
        )}
      </div>
    </li>
  );
}

function TeamLogo({
  logo,
  name,
  shortName,
  color,
  size = 'md',
}: {
  logo: string | null;
  name: string;
  shortName: string;
  color: string | null;
  size?: 'md' | 'lg';
}) {
  const dims = size === 'lg' ? 'h-14 w-14 sm:h-20 sm:w-20' : 'h-7 w-7';
  const imgDims = size === 'lg' ? 'h-10 w-10 sm:h-14 sm:w-14' : 'h-5 w-5';
  const fontSize = size === 'lg' ? 'text-sm sm:text-lg' : 'text-[10px]';

  if (logo) {
    return (
      <span className={`flex ${dims} items-center justify-center overflow-hidden rounded-2xl bg-sunken p-1.5 ring-1 ring-inset ring-line`}>
        <img src={logo} alt={name} loading="lazy" className={`${imgDims} object-contain`} />
      </span>
    );
  }
  return (
    <span
      className={`flex ${dims} items-center justify-center rounded-2xl ${fontSize} font-bold uppercase text-white ring-1 ring-inset ring-black/10`}
      style={{ backgroundColor: color ? `#${color}` : '#64748b' }}
    >
      {shortName.slice(0, 3)}
    </span>
  );
}

function ScoreDisplay({ home, away, isLive }: { home: number; away: number; isLive: boolean }) {
  return (
    <div className="flex items-center gap-2 sm:gap-4">
      <span className={`nums text-[2.5rem] font-extrabold leading-none tracking-tight sm:text-6xl ${isLive ? 'text-fg' : 'text-muted'}`}>
        {home}
      </span>
      <span aria-hidden className="text-2xl font-light leading-none text-subtle sm:text-3xl">
        :
      </span>
      <span className={`nums text-[2.5rem] font-extrabold leading-none tracking-tight sm:text-6xl ${isLive ? 'text-fg' : 'text-muted'}`}>
        {away}
      </span>
    </div>
  );
}

function StatRow({
  label,
  home,
  away,
  isPercent = false,
}: {
  label: string;
  home: number | null;
  away: number | null;
  isPercent?: boolean;
}) {
  // Percentages (possession, pass accuracy) are already a share of the whole,
  // so the bar must use the value directly. Counting stats share the total
  // between the two teams, so the bar uses home / (home + away).
  const missing = home === null || away === null;
  const frac = isPercent
    ? (home ?? 50) / 100
    : missing
      ? 0.5
      : (home + away) > 0
        ? home / (home + away)
        : 0.5;
  const fmt = (v: number | null) => (v === null ? '–' : isPercent ? `${v}%` : `${v}`);

  return (
    <div className="flex items-center gap-2 py-2 sm:gap-3">
      <span className={`nums w-8 flex-shrink-0 text-right text-[13px] font-bold sm:w-10 ${missing ? 'text-subtle' : 'text-fg'}`}>
        {fmt(home)}
      </span>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
        {missing ? (
          <div className="h-full w-full bg-line/50" />
        ) : (
          <>
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-400 transition-[width] duration-500"
              style={{ width: `${frac * 100}%` }}
            />
            <div aria-hidden className="absolute top-0 h-full w-px bg-line-strong" style={{ left: '50%' }} />
          </>
        )}
      </div>
      <span className={`nums w-8 flex-shrink-0 text-[13px] font-bold sm:w-10 ${missing ? 'text-subtle' : 'text-fg'}`}>
        {fmt(away)}
      </span>
      <span className="w-[58px] flex-shrink-0 text-right text-[10px] font-medium uppercase leading-tight tracking-wide text-muted sm:w-[74px]">
        {label}
      </span>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  aside,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <h2 className="flex items-center gap-2 border-b border-line px-4 py-3 text-[13px] font-bold text-fg">
        {icon}
        {title}
        {aside && <span className="ml-auto min-w-0 truncate text-[11px] font-medium text-subtle">{aside}</span>}
      </h2>
      {children}
    </section>
  );
}

export default function MatchDetail({
  match,
  onBack,
  followedTeamIds = [],
  onToggleFollow,
  onAddCalendar,
}: MatchDetailProps) {
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
    // Horizontal padding comes from the page's <main>; only vertical spacing
    // belongs here.
    <div className="mx-auto max-w-2xl animate-fade-in">
      <button
        onClick={onBack}
        className="group mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-fg"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-surface transition-colors group-hover:border-line-strong">
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        </span>
        Back to scores
      </button>

      {/* Scoreboard */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {match.league_name && (
          <div className="flex items-center justify-center gap-2 border-b border-line bg-sunken/50 px-4 py-2.5">
            {match.league_logo && (
              <img src={match.league_logo} alt="" loading="lazy" className="h-4 w-4 object-contain" />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
              {match.league_name}
              {match.league_country ? <span className="text-subtle"> · {match.league_country}</span> : ''}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 px-3 py-6 sm:gap-3 sm:px-8 sm:py-10">
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2 sm:gap-2.5">
            <TeamLogo
              logo={homeTeam.logo}
              name={homeTeam.name}
              shortName={homeTeam.short_name ?? homeTeam.name}
              color={homeTeam.color}
              size="lg"
            />
            <span className="w-full truncate text-center text-xs font-bold text-fg sm:text-sm">{homeTeam.name}</span>
          </div>

          <div className="flex flex-shrink-0 flex-col items-center gap-3">
            {match.status === 'scheduled' ? (
              <>
                <div className="flex items-center gap-1.5 text-muted">
                  <Calendar className="h-4 w-4" />
                  <span className="text-[11px] font-semibold">{kickoffStr}</span>
                </div>
                <div className="nums flex items-center gap-1.5 text-sm font-semibold text-fg">
                  <Clock className="h-3.5 w-3.5 text-subtle" />
                  {kickoffTime}
                </div>
              </>
            ) : (
              <>
                <ScoreDisplay home={match.home_score} away={match.away_score} isLive={isLive} />
                <span className="sr-only" aria-live="polite">
                  Score: {homeTeam.name} {match.home_score}, {awayTeam.name} {match.away_score}
                </span>
                {isLive && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-red-500">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                    </span>
                    {match.status_detail || 'Live'}
                    {match.minute ? ` · ${match.minute}'` : ''}
                  </span>
                )}
                {match.status === 'halftime' && (
                  <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                    Half time
                  </span>
                )}
                {match.status === 'finished' && (
                  <span className="rounded-full border border-line bg-sunken px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-muted">
                    {match.status_detail || 'Full time'}
                  </span>
                )}
              </>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col items-center gap-2 sm:gap-2.5">
            <TeamLogo
              logo={awayTeam.logo}
              name={awayTeam.name}
              shortName={awayTeam.short_name ?? awayTeam.name}
              color={awayTeam.color}
              size="lg"
            />
            <span className="w-full truncate text-center text-xs font-bold text-fg sm:text-sm">{awayTeam.name}</span>
          </div>
        </div>
      </div>

      {/* Team following and calendar export */}
      {(onToggleFollow || onAddCalendar) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {onToggleFollow && (
            <>
              <span className="text-[10px] font-bold uppercase tracking-wide text-subtle">Follow</span>
              {[homeTeam, awayTeam].map((team) => {
                const following = followedTeamIds.includes(team.id);
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => onToggleFollow({ id: team.id, name: team.name })}
                    aria-pressed={following}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                      following
                        ? 'border-accent-500/40 bg-accent-500/10 text-accent-600 dark:text-accent-400'
                        : 'border-line bg-surface text-muted hover:border-line-strong hover:text-fg'
                    }`}
                  >
                    <Heart className="h-3.5 w-3.5" fill={following ? 'currentColor' : 'none'} />
                    <span className="max-w-[120px] truncate">{team.name}</span>
                  </button>
                );
              })}
            </>
          )}
          {match.status === 'scheduled' && onAddCalendar && (
            <button
              type="button"
              onClick={onAddCalendar}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:border-line-strong hover:text-fg"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              Add to calendar
            </button>
          )}
        </div>
      )}

      {/* Timeline */}
      {events.length > 0 && (
        <div className="mt-4">
          <SectionCard
            icon={<ListOrdered className="h-4 w-4 text-accent-500" />}
            title="Match events"
            aside={`${events.length} events`}
          >
            <ul className="relative divide-y divide-line/60 py-1">
              {events.map((event, idx) => (
                <EventRow key={`${event.minute}-${event.type}-${idx}`} event={event} homeTeamId={homeTeam.id} awayTeamId={awayTeam.id} />
              ))}
            </ul>
            {goalGap > 0 && (
              <p className="border-t border-line px-4 py-2 text-center text-[11px] text-subtle">
                {goalGap} more {goalGap === 1 ? 'goal' : 'goals'} not listed in the timeline
              </p>
            )}
          </SectionCard>
        </div>
      )}

      <div className="mt-4">
        <MatchLineups
          lineups={match.detail?.lineups}
          homeName={homeTeam.name}
          awayName={awayTeam.name}
        />
      </div>

      <div className="mt-4">
        <MatchHistory
          h2h={match.detail?.h2h}
          form={match.detail?.form}
          homeName={homeTeam.name}
          awayName={awayTeam.name}
        />
      </div>

      {/* Team statistics */}
      {match.detail?.stats && (
        <div className="mt-4">
          <SectionCard
            icon={<BarChart3 className="h-4 w-4 text-accent-500" />}
            title="Statistics"
            aside={`${homeTeam.short_name ?? homeTeam.name} v ${awayTeam.short_name ?? awayTeam.name}`}
          >
            <div className="px-4 py-2">
              <StatRow label="Possession" home={match.detail.stats.home.possession} away={match.detail.stats.away.possession} isPercent />
              <StatRow label="Shots" home={match.detail.stats.home.shots} away={match.detail.stats.away.shots} />
              <StatRow label="On target" home={match.detail.stats.home.shots_on_target} away={match.detail.stats.away.shots_on_target} />
              <StatRow label="Corners" home={match.detail.stats.home.corners} away={match.detail.stats.away.corners} />
              <StatRow label="Fouls" home={match.detail.stats.home.fouls} away={match.detail.stats.away.fouls} />
              <StatRow label="Yellow" home={match.detail.stats.home.yellow_cards} away={match.detail.stats.away.yellow_cards} />
              <StatRow label="Red" home={match.detail.stats.home.red_cards} away={match.detail.stats.away.red_cards} />
              <StatRow label="Offsides" home={match.detail.stats.home.offsides} away={match.detail.stats.away.offsides} />
              <StatRow label="Saves" home={match.detail.stats.home.saves} away={match.detail.stats.away.saves} />
              <StatRow label="Passes" home={match.detail.stats.home.passes} away={match.detail.stats.away.passes} />
              <StatRow label="Pass acc." home={match.detail.stats.home.pass_accuracy} away={match.detail.stats.away.pass_accuracy} isPercent />
            </div>
          </SectionCard>
        </div>
      )}

      {events.length === 0 && match.status === 'scheduled' && (
        <div className="mt-4 flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sunken">
            <Calendar className="h-6 w-6 text-subtle" />
          </span>
          <div>
            <p className="text-sm font-semibold text-fg">Match hasn't started yet</p>
            <p className="mt-1 text-xs text-muted">
              {kickoffStr} · {kickoffTime}
            </p>
          </div>
        </div>
      )}

      {events.length === 0 && match.status === 'finished' && (
        <div className="mt-4 flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sunken">
            <BarChart3 className="h-6 w-6 text-subtle" />
          </span>
          <div>
            <p className="text-sm font-semibold text-fg">Match finished</p>
            <p className="mt-1 text-xs text-muted">No event data available for this match</p>
          </div>
        </div>
      )}
    </div>
  );
}
