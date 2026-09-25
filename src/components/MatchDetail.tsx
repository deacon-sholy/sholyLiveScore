import { ArrowLeft, Goal, ArrowRightLeft, Calendar, Clock, Swords, BarChart3, ListOrdered } from 'lucide-react';
import type { FormResult, Match, MatchEvent } from '../types';
import { sortEventsByMinute } from '../lib/api';

interface MatchDetailProps {
  match: Match;
  onBack: () => void;
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
    <li className="relative flex items-center gap-3 px-4 py-2.5">
      {/* Timeline spine */}
      <span aria-hidden className="absolute bottom-0 left-[35px] top-0 w-px bg-line" />
      {dotClass && <span aria-hidden className={`absolute left-[31px] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ring-4 ring-surface ${dotClass}`} />}

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
  const dims = size === 'lg' ? 'h-16 w-16 sm:h-20 sm:w-20' : 'h-7 w-7';
  const imgDims = size === 'lg' ? 'h-11 w-11 sm:h-14 sm:w-14' : 'h-5 w-5';
  const fontSize = size === 'lg' ? 'text-base sm:text-lg' : 'text-[10px]';

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
    <div className="flex items-center gap-2.5 sm:gap-4">
      <span className={`nums text-5xl font-extrabold leading-none tracking-tight sm:text-6xl ${isLive ? 'text-fg' : 'text-muted'}`}>
        {home}
      </span>
      <span aria-hidden className="text-2xl font-light leading-none text-subtle sm:text-3xl">
        :
      </span>
      <span className={`nums text-5xl font-extrabold leading-none tracking-tight sm:text-6xl ${isLive ? 'text-fg' : 'text-muted'}`}>
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
    <div className="flex items-center gap-3 py-2">
      <span className={`nums w-10 flex-shrink-0 text-right text-[13px] font-bold ${missing ? 'text-subtle' : 'text-fg'}`}>
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
      <span className={`nums w-10 flex-shrink-0 text-[13px] font-bold ${missing ? 'text-subtle' : 'text-fg'}`}>
        {fmt(away)}
      </span>
      <span className="w-[74px] flex-shrink-0 text-right text-[10px] font-medium uppercase leading-tight tracking-wide text-muted">
        {label}
      </span>
    </div>
  );
}

function FormChips({ results, teamName }: { results: FormResult[]; teamName: string }) {
  if (!results || results.length === 0) return null;
  const chipClass = (r: string) =>
    r === 'W'
      ? 'bg-accent-500/15 text-accent-600 dark:text-accent-400'
      : r === 'D'
        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
        : 'bg-red-500/15 text-red-500';
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <span className="truncate text-xs font-semibold text-muted">{teamName}</span>
      <div className="flex flex-shrink-0 items-center gap-1.5">
        {results.map((f, i) => (
          <span
            key={i}
            title={`${f.atVs === 'at' ? '@' : 'vs '}${f.opponent || 'Unknown'}${f.score ? ` · ${f.score}` : ''}${
              f.date ? ` · ${f.date.slice(0, 10)}` : ''
            }`}
            className={`flex h-6 min-w-6 items-center justify-center rounded-lg px-1.5 text-[11px] font-extrabold ${chipClass(f.result)}`}
          >
            {f.result || '?'}
          </span>
        ))}
      </div>
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
        {aside && <span className="ml-auto text-[11px] font-medium text-subtle">{aside}</span>}
      </h2>
      {children}
    </section>
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
    <div className="mx-auto max-w-2xl animate-fade-in px-4 py-6 sm:px-6">
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

        <div className="flex items-center justify-between gap-3 px-4 py-8 sm:px-8 sm:py-10">
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2.5">
            <TeamLogo
              logo={homeTeam.logo}
              name={homeTeam.name}
              shortName={homeTeam.short_name ?? homeTeam.name}
              color={homeTeam.color}
              size="lg"
            />
            <span className="max-w-[110px] truncate text-center text-xs font-bold text-fg sm:text-sm">{homeTeam.name}</span>
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

          <div className="flex min-w-0 flex-1 flex-col items-center gap-2.5">
            <TeamLogo
              logo={awayTeam.logo}
              name={awayTeam.name}
              shortName={awayTeam.short_name ?? awayTeam.name}
              color={awayTeam.color}
              size="lg"
            />
            <span className="max-w-[110px] truncate text-center text-xs font-bold text-fg sm:text-sm">{awayTeam.name}</span>
          </div>
        </div>
      </div>

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

      {match.detail?.h2h && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3">
          <Swords className="h-3.5 w-3.5 flex-shrink-0 text-subtle" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-subtle">H2H</span>
          <span className="truncate text-[13px] font-semibold text-fg">{match.detail.h2h.summary}</span>
        </div>
      )}

      {/* Last 5 form */}
      {match.detail?.form && (match.detail.form.home.length > 0 || match.detail.form.away.length > 0) && (
        <div className="mt-4">
          <SectionCard icon={<ListOrdered className="h-4 w-4 text-accent-500" />} title="Last 5 form" aside="oldest → newest">
            <div className="flex flex-col gap-3 px-4 py-3">
              <FormChips results={match.detail.form.home} teamName={homeTeam.name} />
              <FormChips results={match.detail.form.away} teamName={awayTeam.name} />
            </div>
          </SectionCard>
        </div>
      )}

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
