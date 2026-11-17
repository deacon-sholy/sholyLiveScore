import { useState } from 'react';
import { ListOrdered } from 'lucide-react';
import type { FormResult, H2hRecord } from '../types';

interface MatchHistoryProps {
  h2h?: H2hRecord | null;
  form?: { home: FormResult[]; away: FormResult[] } | null;
  homeName: string;
  awayName: string;
}

type Tab = 'h2h' | 'form';

function ResultBadge({ result }: { result: string }) {
  const cls =
    result === 'W'
      ? 'bg-accent-500/15 text-accent-600 dark:text-accent-400'
      : result === 'D'
        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
        : 'bg-red-500/15 text-red-500';
  return (
    <span className={`nums flex h-6 min-w-6 flex-shrink-0 items-center justify-center rounded-lg px-1.5 text-[11px] font-extrabold ${cls}`}>
      {result || '?'}
    </span>
  );
}

function FormColumn({ results, teamName }: { results: FormResult[]; teamName: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate px-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-muted">
        {teamName}
      </p>
      {results.length === 0 ? (
        <p className="px-3 py-2 text-[11px] text-subtle">No recent results</p>
      ) : (
        <ul className="divide-y divide-line/60">
          {results.map((result, index) => (
            <li key={`${result.date}-${index}`} className="flex items-center gap-2 px-3 py-2">
              <ResultBadge result={result.result} />
              <span className="min-w-0 flex-1 truncate text-[12px] text-fg">
                <span className="text-subtle">{result.atVs === 'at' ? '@' : 'vs'}</span>{' '}
                {result.opponent || 'Unknown'}
              </span>
              <span className="nums flex-shrink-0 text-[12px] font-semibold text-fg">{result.score || '–'}</span>
              {result.date && (
                <span className="nums hidden flex-shrink-0 text-[10px] text-subtle sm:inline">
                  {result.date.slice(0, 10)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MatchHistory({ h2h, form, homeName, awayName }: MatchHistoryProps) {
  const [tab, setTab] = useState<Tab>('h2h');
  const meetings = h2h?.meetings ?? [];
  const hasForm = Boolean((form?.home.length ?? 0) + (form?.away.length ?? 0));
  const hasH2h = Boolean(h2h?.summary || h2h?.title || meetings.length);
  if (!hasForm && !hasH2h) return null;

  const homeWins = meetings.filter((m) => m.winner === 'home').length;
  const draws = meetings.filter((m) => m.winner === 'draw').length;
  const awayWins = meetings.filter((m) => m.winner === 'away').length;

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <ListOrdered className="h-4 w-4 text-accent-500" />
        <h2 className="text-[13px] font-bold text-fg">Match preview</h2>
        <div className="ml-auto flex gap-1 rounded-lg bg-sunken p-0.5">
          <button
            type="button"
            onClick={() => setTab('h2h')}
            aria-pressed={tab === 'h2h'}
            className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${
              tab === 'h2h' ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
            }`}
          >
            Head-to-head
          </button>
          <button
            type="button"
            onClick={() => setTab('form')}
            aria-pressed={tab === 'form'}
            className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${
              tab === 'form' ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
            }`}
          >
            Form
          </button>
        </div>
      </div>

      {tab === 'h2h' ? (
        <div>
          {h2h?.summary || h2h?.title ? (
            <p className="border-b border-line px-4 py-2.5 text-[12px] leading-relaxed text-muted">
              {h2h.summary || h2h.title}
            </p>
          ) : null}
          {meetings.length > 0 ? (
            <>
              <div className="flex items-center justify-center gap-3 border-b border-line bg-sunken/40 px-4 py-2.5 text-center">
                <span className="text-[12px] font-bold text-fg">{homeWins}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">home wins</span>
                <span className="h-3 w-px bg-line" />
                <span className="text-[12px] font-bold text-fg">{draws}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">draws</span>
                <span className="h-3 w-px bg-line" />
                <span className="text-[12px] font-bold text-fg">{awayWins}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">away wins</span>
              </div>
              <ul className="divide-y divide-line/60">
                {meetings.map((meeting, index) => {
                  const dateStr = meeting.date
                    ? new Date(meeting.date).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: '2-digit',
                      })
                    : '';
                  const status = meeting.status && !/^ft$/i.test(meeting.status.trim()) ? meeting.status : '';
                  const sideClass = (side: 'home' | 'away') =>
                    meeting.winner === side ? 'font-bold text-fg' : 'text-muted';
                  return (
                    <li
                      key={`${meeting.date}-${index}`}
                      title={[dateStr, meeting.competition, status].filter(Boolean).join(' · ') || undefined}
                      className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4"
                    >
                      <span className="nums w-[58px] flex-shrink-0 text-[11px] text-subtle sm:w-[66px]">
                        {dateStr}
                      </span>
                      <span className={`min-w-0 flex-1 truncate text-right text-[13px] ${sideClass('home')}`}>
                        {meeting.home}
                      </span>
                      <span className="nums flex-shrink-0 rounded-lg bg-sunken px-2 py-1 text-[12px] font-bold text-fg">
                        {meeting.home_score ?? '–'}
                        <span className="px-0.5 text-subtle">–</span>
                        {meeting.away_score ?? '–'}
                      </span>
                      <span className={`min-w-0 flex-1 truncate text-[13px] ${sideClass('away')}`}>
                        {meeting.away}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="px-4 py-6 text-center text-[12px] text-subtle">No previous meetings available.</p>
          )}
        </div>
      ) : (
        <div className="grid gap-3 px-3 py-3 sm:grid-cols-2 sm:gap-4">
          <FormColumn results={form?.home ?? []} teamName={homeName} />
          <FormColumn results={form?.away ?? []} teamName={awayName} />
        </div>
      )}
    </section>
  );
}
