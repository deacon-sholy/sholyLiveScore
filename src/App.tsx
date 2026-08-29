import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Radio, CheckCircle2, CalendarDays, LayoutGrid, RefreshCw, Zap, Globe, Sun, Moon, ChevronLeft, ChevronRight, Star, Goal } from 'lucide-react';
import type { LeagueWithMatches, Match } from './types';
import { fetchMatchesByStatus, fetchMatchDetail } from './lib/api';
import LeagueSection from './components/LeagueSection';
import MatchDetail from './components/MatchDetail';
import SearchBar from './components/SearchBar';
import ShareButton from './components/ShareButton';
import StandingsModal from './components/StandingsModal';
import { useDarkMode } from './lib/useDarkMode';
import { useFavorites } from './lib/useFavorites';

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

function App() {
  const todayISO = toISODate(new Date());
  const [date, setDate] = useState(todayISO);
  const isToday = date === todayISO;
  const [filter, setFilter] = useState<Filter>('all');
  const [leagues, setLeagues] = useState<LeagueWithMatches[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [standingsLeague, setStandingsLeague] = useState<{ slug: string; name: string } | null>(null);
  const { dark, toggle: toggleDark } = useDarkMode();
  const { favoriteSlugs, toggleFavorite } = useFavorites();
  const [toasts, setToasts] = useState<Array<{ id: number; text: string }>>([]);
  const prevGoalKeys = useRef<Set<string> | null>(null);

  const loadMatches = useCallback(async (f: Filter, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await fetchMatchesByStatus(f === 'favorites' ? 'all' : f, date);
      setLeagues(f === 'favorites' ? data.filter((l) => favoriteSlugs.includes(l.slug)) : data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load matches');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date, favoriteSlugs]);

  useEffect(() => {
    loadMatches(filter);
  }, [filter, loadMatches]);

  useEffect(() => {
    if (filter !== 'live' && filter !== 'all') return;
    if (!isToday) return;
    const interval = setInterval(() => {
      loadMatches(filter, true);
    }, 30000);
    return () => clearInterval(interval);
  }, [filter, loadMatches, isToday]);

  // Goal alerts: watch the live feed for new goals and toast them
  useEffect(() => {
    const keys = new Set<string>();
    for (const l of leagues) {
      for (const m of l.matches) {
        if (m.status !== 'live' && m.status !== 'halftime') continue;
        for (const e of m.events) {
          if (e.type === 'goal') keys.add(`${m.id}:${e.minute}:${String(e.player_name ?? '')}`);
        }
      }
    }
    if (prevGoalKeys.current !== null) {
      for (const key of keys) {
        if (prevGoalKeys.current.has(key)) continue;
        const [matchId, minute, player] = key.split(':');
        const match = leagues.flatMap((l) => l.matches).find((mm) => mm.id === matchId);
        if (!match) continue;
        const id = Date.now() + Math.random();
        const text = `${player || 'Goal'} ${minute}' — ${match.home_team.name} ${match.home_score}-${match.away_score} ${match.away_team.name}`;
        setToasts((prev) => [...prev, { id, text }]);
        window.setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 6000);
      }
    }
    prevGoalKeys.current = keys;
  }, [leagues]);

  const shiftDate = useCallback((delta: number) => {
    setDate((current) => {
      const d = new Date(`${current}T12:00:00`);
      d.setDate(d.getDate() + delta);
      return toISODate(d);
    });
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedMatch]);

  const handleMatchClick = (matchId: string) => {
    const match = leagues.flatMap((l) => l.matches).find((m) => m.id === matchId);
    if (!match) return;
    setSelectedMatch(match);
    fetchMatchDetail(match.league_slug, matchId)
      .then((detail) => {
        if (detail.events.length > 0) {
          setSelectedMatch(
            (prev) => (prev && prev.id === matchId
              ? { ...prev, events: detail.events, detail: { stats: detail.stats, form: detail.form, h2h: detail.h2h } }
              : prev),
          );
        }
      })
      .catch(() => {});
  };

  // Filter leagues by search query
  const filteredLeagues = useMemo(() => {
    if (!search.trim()) return leagues;
    const q = search.toLowerCase();
    return leagues
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
  }, [leagues, search]);

  if (selectedMatch) {
    return (
      <div className="min-h-screen bg-ink-950 px-4 py-6">
        <MatchDetail match={selectedMatch} onBack={() => setSelectedMatch(null)} />
      </div>
    );
  }

  const liveCount = leagues.reduce(
    (acc, l) => acc + l.matches.filter((m) => m.status === 'live').length,
    0
  );
  const totalMatches = leagues.reduce((acc, l) => acc + l.matches.length, 0);

  return (
    <div className="min-h-screen bg-ink-950">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-accent-500/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 h-80 w-80 rounded-full bg-accent-600/5 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="mx-auto max-w-3xl px-4 py-3.5">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 shadow-lg shadow-accent-500/30">
                <Zap className="h-5 w-5 text-white" fill="white" />
              </div>
              <div>
                <h1 className="font-display text-xl font-extrabold leading-none tracking-tight text-white">
                  Sholy <span className="text-gradient">Livescore</span>
                </h1>
                <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-ink-400">
                  <Globe className="h-2.5 w-2.5" />
                  Live football scores
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Dark mode toggle */}
              <button
                onClick={toggleDark}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-ink-300 transition-colors hover:border-white/20 hover:bg-white/10"
                title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              {/* Share */}
              <ShareButton title="Sholy Livescore" text="Live football scores, stats & match events" />

              {/* Refresh */}
              <button
                onClick={() => loadMatches(filter, true)}
                disabled={refreshing}
                className="group flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-ink-200 transition-all hover:border-white/20 hover:bg-white/10 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 transition-transform group-hover:rotate-180 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mt-3">
            <SearchBar value={search} onChange={setSearch} />
          </div>

          {/* Date navigation */}
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

          {/* Filter tabs */}
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
        </div>
      </header>

      {/* Content */}
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
              onClick={() => loadMatches(filter)}
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
            {/* Stats bar */}
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

      {/* Goal alert toasts */}
      {toasts.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="animate-slide-up pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-green-500/25 bg-ink-900/95 px-4 py-3 shadow-2xl backdrop-blur"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-green-500/15">
                <Goal className="h-4 w-4 text-green-400" />
              </div>
              <p className="text-sm font-semibold leading-snug text-white">{toast.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-6 text-center">
        <p className="text-xs text-ink-500">
          Sholy Livescore · Live data from ESPN · Auto-refresh every 30s
        </p>
      </footer>

      {/* Standings modal */}
      {standingsLeague && (
        <StandingsModal
          leagueSlug={standingsLeague.slug}
          leagueName={standingsLeague.name}
          onClose={() => setStandingsLeague(null)}
        />
      )}
    </div>
  );
}

export default App;