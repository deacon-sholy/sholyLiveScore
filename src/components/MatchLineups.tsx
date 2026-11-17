import { Users } from 'lucide-react';
import type { LineupPlayer, MatchLineups, TeamLineup } from '../types';

interface MatchLineupsProps {
  lineups?: MatchLineups | null;
  homeName: string;
  awayName: string;
}

const GROUPS = [
  { key: 'goalkeeper', label: 'Goalkeeper' },
  { key: 'defender', label: 'Defenders' },
  { key: 'midfielder', label: 'Midfielders' },
  { key: 'forward', label: 'Forwards' },
] as const;

function PlayerChip({ player }: { player: LineupPlayer }) {
  return (
    <li
      className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-line bg-sunken/60 px-1.5 py-1"
      title={[player.position, player.subbed_out ? 'Substituted off' : '', player.subbed_in ? 'Substituted on' : '']
        .filter(Boolean)
        .join(' · ')}
    >
      <span className="nums flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-surface text-[10px] font-bold text-muted">
        {player.jersey ?? '–'}
      </span>
      <span className="max-w-[150px] truncate text-[11px] font-medium text-fg">{player.name}</span>
      {player.goals > 0 && (
        <span className="nums text-[10px] font-extrabold text-accent-600 dark:text-accent-400" title={`${player.goals} goals`}>
          {player.goals}⚽
        </span>
      )}
      {player.assists > 0 && (
        <span className="nums text-[10px] font-extrabold text-sky-500" title={`${player.assists} assists`}>
          {player.assists}A
        </span>
      )}
      {player.yellow_cards > 0 && (
        <span className="nums rounded bg-amber-500/15 px-1 text-[10px] font-extrabold text-amber-500" title="Yellow card">
          YC
        </span>
      )}
      {player.red_cards > 0 && (
        <span className="nums rounded bg-red-500/15 px-1 text-[10px] font-extrabold text-red-500" title="Red card">
          RC
        </span>
      )}
      {player.subbed_out && (
        <span className="text-[11px] font-extrabold text-red-500" title="Substituted off">
          ↓
        </span>
      )}
      {player.subbed_in && (
        <span className="text-[11px] font-extrabold text-accent-500" title="Substituted on">
          ↑
        </span>
      )}
    </li>
  );
}

function TeamLineupPanel({ lineup, name }: { lineup: TeamLineup | null; name: string }) {
  if (!lineup) {
    return (
      <div className="rounded-xl border border-line bg-sunken/40 px-3 py-6 text-center text-[12px] text-subtle">
        Lineups not available for {name}
      </div>
    );
  }

  const starters = lineup.players.filter((p) => p.starter);
  const substitutes = lineup.players.filter((p) => !p.starter);

  return (
    <div className="min-w-0 rounded-xl border border-line bg-sunken/40">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-fg">{name}</span>
        {lineup.formation && (
          <span className="nums flex-shrink-0 rounded-md bg-accent-500/10 px-2 py-0.5 text-[10px] font-bold text-accent-600 dark:text-accent-400">
            {lineup.formation}
          </span>
        )}
      </div>
      <div className="space-y-2.5 px-3 py-3">
        {GROUPS.map((group) => {
          const players = starters.filter((p) => p.position_group === group.key);
          if (players.length === 0) return null;
          return (
            <div key={group.key}>
              <p className="pb-1 text-[10px] font-bold uppercase tracking-wide text-subtle">{group.label}</p>
              <ul className="flex flex-wrap gap-1.5">
                {players.map((player, i) => (
                  <PlayerChip key={`${player.id}-${i}`} player={player} />
                ))}
              </ul>
            </div>
          );
        })}
        {substitutes.length > 0 && (
          <div className="border-t border-line/70 pt-2">
            <p className="pb-1 text-[10px] font-bold uppercase tracking-wide text-subtle">Substitutes</p>
            <ul className="flex flex-wrap gap-1.5">
              {substitutes.map((player, i) => (
                <PlayerChip key={`${player.id}-${i}`} player={player} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MatchLineups({ lineups, homeName, awayName }: MatchLineupsProps) {
  if (!lineups || (!lineups.home && !lineups.away)) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Users className="h-4 w-4 text-accent-500" />
        <h2 className="text-[13px] font-bold text-fg">Lineups</h2>
        <span className="ml-auto text-[10px] font-medium text-subtle">starting XI &amp; subs</span>
      </div>
      <div className="grid gap-3 p-3 sm:grid-cols-2 sm:gap-4 sm:p-4">
        <TeamLineupPanel lineup={lineups.home} name={homeName} />
        <TeamLineupPanel lineup={lineups.away} name={awayName} />
      </div>
    </section>
  );
}
