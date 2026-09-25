import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Radio,
  CheckCircle2,
  CalendarDays,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Star,
  AlertCircle,
  SearchX,
} from 'lucide-react';
import type { LeagueWithMatches } from '../types';
import { fetchLeagues, filterByStatus, isInPlay, type StatusFilter } from '../lib/api';
import SiteHeader from '../components/SiteHeader';
import LeagueSection from '../components/LeagueSection';
import SearchBar from '../components/SearchBar';
import StandingsModal from '../components/StandingsModal';
import { useFavorites } from '../lib/useFavorites';
import { applySeo } from '../lib/seo';

type Filter = 'all' | 'live' | 'finished' | 'scheduled' | 'favorites';

const FILTERS: { key: Filter; label: string; icon: typeof Radio }[] = [
  { key: 'all', label: 'All', icon: LayoutGrid },
  { key: 'live', label: 'Live', icon: Radio },
  { key: 'finished', label: 'Finished', icon: CheckCircle2 },
  { key: 'scheduled', label: 'Upcoming', icon: CalendarDays },
  { key: 'favorites', label: 'My Leagues', icon: Star },
];

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function SkeletonList() {
  return (
    <div className="space-y-8" aria-hidden>
      {[0, 1, 2].map((group) => (
        <div key={group}>
          <div className="mb-2.5 flex items-center gap-3">
            <div className="skeleton h-9 w-9 rounded-xl" />
            <div className="space-y-1.5">
              <div className="skeleton h-3.5 w-32 rounded" />
              <div className="skeleton h-2.5 w-20 rounded" />
            </div>
          </div>
          <div className="space-y-2">
            {[0, 1, 2].map((row) => (
              <div key={row} className="skeleton h-[58px] rounded-2xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const todayISO = toISODate(new Date());
  const [date, setDate] = useState(todayISO);
  const isToday = date === todayISO;
  const [filter, setFilter] = useState<Filter>('all');
  const [leagues, setLeagues] = useState<LeagueWithMatches[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [standingsLeague, setStandingsLeague] = useState<{ slug: string; name: string } | null>(null);
  const { favoriteSlugs, toggleFavorite } = useFavorites();

  // Toggling a favourite must not re-fetch: the raw league list is cached in
  // state and favourites are applied in the memo below.
  const requestIdRef = useRef(0);
  const loadMatches = useCallback(async (isRefresh = false) => {
    // Rapid date changes can resolve out of order; only the newest request may
    // write to state.
    const requestId = ++requestIdRef.current;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await fetchLeagues(date);
      if (requestId !== requestIdRef.current) return;
      setLeagues(data);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load matches');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [date]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  useEffect(() => () => { requestIdRef.current++; }, []);

  useEffect(() => {
    if (filter !== 'live' && filter !== 'all') return;
    if (!isToday) return;
    const interval = setInterval(() => {
      loadMatches(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [filter, loadMatches, isToday]);

  useEffect(() => {
    applySeo({
      title: 'Sholy Livescore · Live Football Scores, Stats & Match Events',
      description: 'Live football scores, standings, stats & match events for leagues around the world. Premier League, Champions League, La Liga and more.',
      canonical: '/',
    });
  }, []);

  const handleMatchClick = (matchId: string) => {
    const match = leagues.flatMap((l) => l.matches).find((m) => m.id === matchId);
    if (!match) return;
    navigate(`/league/${match.league_slug}/match/${match.id}`);
  };

  // Status, favourites and search are all pure client-side views of one
  // fetch, so none of them can trigger a network request.
  const filteredLeagues = useMemo(() => {
    let result = filterByStatus(
      leagues,
      filter === 'favorites' ? 'all' : (filter as StatusFilter),
    );

    if (filter === 'favorites') {
      result = result.filter((l) => favoriteSlugs.includes(l.slug));
    }

    const q = search.trim().toLowerCase();
    if (!q) return result;

    return result
      .map((l) => ({
        ...l,
        matches: l.matches.filter(
          (m) =>
            m.home_team.name.toLowerCase().includes(q) ||
            m.away_team.name.toLowerCase().includes(q) ||
            l.name.toLowerCase().includes(q)
        ),
      }))
      .filter((l) => l.matches.length > 0);
  }, [leagues, search, filter, favoriteSlugs]);

  const shiftDate = useCallback((delta: number) => {
    setDate((current) => {
      const d = new Date(`${current}T12:00:00`);
      d.setDate(d.getDate() + delta);
      return toISODate(d);
    });
  }, []);

  // Counts always reflect the full fetched day, not the active filter, so the
  // numbers don't jump around as the user switches tabs.
  const liveCount = leagues.reduce((acc, l) => acc + l.matches.filter(isInPlay).length, 0);
  const totalMatches = leagues.reduce((acc, l) => acc + l.matches.length, 0);

  return (
    <>
      <SiteHeader refreshing={refreshing} onRefresh={() => loadMatches(true)}>
        <div className="pb-3 pt-3">
          <SearchBar value={search} onChange={setSearch} />
        </div>

        <div className="flex items-center justify-between gap-2 pb-3">
          <button
            onClick={() => shiftDate(-1)}
            aria-label="Previous day"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-muted transition-colors hover:border-line-strong hover:text-fg"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            {!isToday && (
              <button
                onClick={() => setDate(todayISO)}
                className="rounded-lg border border-accent-500/30 bg-accent-500/10 px-2.5 py-1 text-[11px] font-bold text-accent-600 transition-colors hover:bg-accent-500/20 dark:text-accent-400"
              >
                Today
              </button>
            )}
            <span className="text-sm font-bold text-fg">
              {new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>

          <button
            onClick={() => shiftDate(1)}
            aria-label="Next day"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-muted transition-colors hover:border-line-strong hover:text-fg"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-3 no-scrollbar">
          {FILTERS.map((f) => {
            const Icon = f.icon;
            const isActive = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                aria-pressed={isActive}
                className={`flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-all ${
                  isActive
                    ? 'bg-fg text-canvas shadow-sm'
                    : 'border border-line bg-surface text-muted hover:border-line-strong hover:text-fg'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {f.label}
                {f.key === 'live' && liveCount > 0 && (
                  <span
                    className={`nums flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                      isActive ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-500'
                    }`}
                  >
                    {liveCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </SiteHeader>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {loading && leagues.length === 0 ? (
          <SkeletonList />
        ) : error ? (
          <EmptyState
            icon={<AlertCircle className="h-7 w-7 text-red-500" />}
            title="Couldn't load scores"
            body={error}
            action={
              <button
                onClick={() => loadMatches()}
                className="rounded-xl bg-fg px-5 py-2.5 text-sm font-semibold text-canvas transition-opacity hover:opacity-85"
              >
                Try again
              </button>
            }
          />
        ) : filteredLeagues.length === 0 ? (
          <EmptyState
            icon={
              search ? (
                <SearchX className="h-7 w-7 text-subtle" />
              ) : filter === 'favorites' && favoriteSlugs.length === 0 ? (
                <Star className="h-7 w-7 text-amber-500" />
              ) : (
                <CalendarDays className="h-7 w-7 text-subtle" />
              )
            }
            title={
              search
                ? 'No matches match your search'
                : filter === 'favorites'
                  ? favoriteSlugs.length === 0
                    ? 'No favourite leagues yet'
                    : 'No matches in your favourite leagues'
                  : 'No matches found'
            }
            body={
              search
                ? 'Try a different team or league name'
                : filter === 'favorites' && favoriteSlugs.length === 0
                  ? 'Tap the star on any league to add it here'
                  : 'Try a different filter'
            }
          />
        ) : (
          <div className="animate-fade-in">
            {/* Day summary */}
            <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-line bg-surface px-4 py-3">
              <Stat label="matches" value={totalMatches} />
              <span aria-hidden className="hidden h-4 w-px bg-line sm:block" />
              <Stat label="live" value={liveCount} dot={liveCount > 0} />
              <span aria-hidden className="hidden h-4 w-px bg-line sm:block" />
              <Stat label="leagues" value={leagues.length} />
              {refreshing && (
                <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-subtle">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-500" />
                  Updating
                </span>
              )}
            </div>

            <div className="grid gap-x-6 gap-y-7 lg:grid-cols-2">
              {filteredLeagues.map((league) => (
                <LeagueSection
                  key={league.id}
                  league={league}
                  favorite={favoriteSlugs.includes(league.slug)}
                  onToggleFavorite={toggleFavorite}
                  onMatchClick={handleMatchClick}
                  onStandingsClick={(slug, name) => setStandingsLeague({ slug, name })}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {standingsLeague && (
        <StandingsModal
          leagueSlug={standingsLeague.slug}
          leagueName={standingsLeague.name}
          onClose={() => setStandingsLeague(null)}
        />
      )}
    </>
  );
}

function Stat({ label, value, dot }: { label: string; value: number; dot?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      {dot && (
        <span className="relative -translate-y-px flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
      )}
      <span className="nums text-base font-bold text-fg">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </span>
  );
}

function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-fg">{title}</p>
        <p className="mt-1 text-xs text-muted">{body}</p>
      </div>
      {action}
    </div>
  );
}
