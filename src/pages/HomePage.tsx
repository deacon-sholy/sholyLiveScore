import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, CheckCircle2, CalendarDays, LayoutGrid, ChevronLeft, ChevronRight, Star } from 'lucide-react';
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
      <SiteHeader
        refreshing={refreshing}
        onRefresh={() => loadMatches(true)}
      >
        <div className="mt-3">
          <SearchBar value={search} onChange={setSearch} />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            onClick={() => shiftDate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/5 bg-white/[0.03] text-ink-300 transition-colors hover:border-white/10 hover:bg-white/[0.06] hover:text-ink-100"
            title="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            {!isToday && (
              <button
                onClick={() => setDate(todayISO)}
                className="rounded-xl border border-accent-500/30 bg-accent-500/10 px-3 py-1.5 text-[11px] font-bold text-accent-400 transition-colors hover:bg-accent-500/20"
              >
                Today
              </button>
            )}
            <span className="text-sm font-bold text-ink-100">
              {new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>

          <button
            onClick={() => shiftDate(1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/5 bg-white/[0.03] text-ink-300 transition-colors hover:border-white/10 hover:bg-white/[0.06] hover:text-ink-100"
            title="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-thin">
          {FILTERS.map((f) => {
            const Icon = f.icon;
            const isActive = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`relative flex flex-shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-accent-500 to-accent-600 text-white shadow-lg shadow-accent-500/25'
                    : 'border border-white/5 bg-white/[0.03] text-ink-400 hover:border-white/10 hover:bg-white/[0.06] hover:text-ink-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {f.label}
                {f.key === 'live' && liveCount > 0 && (
                  <span className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                    isActive ? 'bg-white text-accent-600' : 'bg-red-500 text-white'
                  }`}>
                    {liveCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </SiteHeader>

      <main className="relative mx-auto max-w-3xl px-4 py-6">
        {loading && leagues.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-ink-700 border-t-accent-500" />
            <p className="text-xs font-medium text-ink-400">Loading live scores...</p>
          </div>
        ) : error ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
              <span className="text-2xl">!</span>
            </div>
            <p className="text-sm font-medium text-red-400">{error}</p>
            <button
              onClick={() => loadMatches()}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-ink-100 transition-colors hover:bg-white/10"
            >
              Try again
            </button>
          </div>
        ) : filteredLeagues.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03]">
              {filter === 'favorites' && favoriteSlugs.length === 0 ? (
                <Star className="h-8 w-8 text-accent-500" />
              ) : (
                <CalendarDays className="h-8 w-8 text-ink-600" />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-ink-200">
                {search
                  ? 'No matches match your search'
                  : filter === 'favorites'
                    ? favoriteSlugs.length === 0
                      ? 'No favorite leagues yet'
                      : 'No matches in your favorite leagues'
                    : 'No matches found'}
              </p>
              <p className="mt-1 text-xs text-ink-400">
                {search
                  ? 'Try a different team or league name'
                  : filter === 'favorites'
                    ? favoriteSlugs.length === 0
                      ? 'Tap the ★ on any league to add it here'
                      : 'Try a different filter'
                    : 'Try a different filter'}
              </p>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="mb-5 flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tabular-nums text-white">{totalMatches}</span>
                <span className="text-xs text-ink-400">matches</span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                <span className="text-lg font-bold tabular-nums text-white">{liveCount}</span>
                <span className="text-xs text-ink-400">live</span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tabular-nums text-white">{leagues.length}</span>
                <span className="text-xs text-ink-400">leagues</span>
              </div>
            </div>

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