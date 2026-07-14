import { useEffect, useState, useCallback, useMemo } from 'react';
import { Radio, CheckCircle2, CalendarDays, LayoutGrid, RefreshCw, Zap, Globe, Sun, Moon } from 'lucide-react';
import type { LeagueWithMatches, Match } from './types';
import { fetchMatchesByStatus } from './lib/api';
import LeagueSection from './components/LeagueSection';
import MatchDetail from './components/MatchDetail';
import SearchBar from './components/SearchBar';
import ShareButton from './components/ShareButton';
import StandingsModal from './components/StandingsModal';
import { useDarkMode } from './lib/useDarkMode';

type Filter = 'all' | 'live' | 'finished' | 'scheduled';

const FILTERS: { key: Filter; label: string; icon: typeof Radio }[] = [
  { key: 'all', label: 'All', icon: LayoutGrid },
  { key: 'live', label: 'Live', icon: Radio },
  { key: 'finished', label: 'Finished', icon: CheckCircle2 },
  { key: 'scheduled', label: 'Upcoming', icon: CalendarDays },
];

function App() {
  const [filter, setFilter] = useState<Filter>('all');
  const [leagues, setLeagues] = useState<LeagueWithMatches[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [standingsLeague, setStandingsLeague] = useState<{ slug: string; name: string } | null>(null);
  const { dark, toggle: toggleDark } = useDarkMode();

  const loadMatches = useCallback(async (f: Filter, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await fetchMatchesByStatus(f);
      setLeagues(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load matches');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMatches(filter);
  }, [filter, loadMatches]);

  useEffect(() => {
    if (filter !== 'live' && filter !== 'all') return;
    const interval = setInterval(() => {
      loadMatches(filter, true);
    }, 30000);
    return () => clearInterval(interval);
  }, [filter, loadMatches]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedMatch]);

  const handleMatchClick = (matchId: string, _leagueSlug: string) => {
    const match = leagues.flatMap((l) => l.matches).find((m) => m.id === matchId);
    if (match) setSelectedMatch(match);
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
              <CalendarDays className="h-8 w-8 text-ink-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-ink-200">
                {search ? 'No matches match your search' : 'No matches found'}
              </p>
              <p className="mt-1 text-xs text-ink-400">
                {search ? 'Try a different team or league name' : 'Try a different filter'}
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
                onMatchClick={handleMatchClick}
                onStandingsClick={(slug, name) => setStandingsLeague({ slug, name })}
              />
            ))}
          </div>
        )}
      </main>

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