import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Star } from 'lucide-react';
import type { LeagueWithMatches } from '../types';
import { fetchLeague } from '../lib/api';
import SiteHeader from '../components/SiteHeader';
import LeagueSection from '../components/LeagueSection';
import StandingsModal from '../components/StandingsModal';
import { useFavorites } from '../lib/useFavorites';
import { applySeo, isKnownLeague, leagueName, leagueSlugTitle } from '../lib/seo';

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function LeaguePage() {
  const navigate = useNavigate();
  const { leagueSlug = '' } = useParams();
  const [league, setLeague] = useState<LeagueWithMatches | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [standingsOpen, setStandingsOpen] = useState(false);
  const { favoriteSlugs, toggleFavorite } = useFavorites();

  const name = league?.name ?? leagueName(leagueSlug);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setError(null);
      try {
        const data = await fetchLeague(leagueSlug, toISODate(new Date()));
        if (alive) setLeague(data);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'Failed to load league');
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    const interval = setInterval(() => {
      load();
    }, 30000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [leagueSlug]);

  useEffect(() => {
    applySeo({
      title: leagueSlugTitle(leagueSlug),
      description: `${name} — live scores, fixtures, results, standings and stats. Following the ${name} on Sholy Livescore.`,
      canonical: `/league/${leagueSlug}`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: `${name} — Live Scores`,
        description: `${name} live scores, fixtures, results, standings and stats on Sholy Livescore.`,
        url: `https://sholylivescore.netlify.app/league/${leagueSlug}`,
      },
    });
  }, [leagueSlug, name]);

  if (!isKnownLeague(leagueSlug)) {
    return (
      <NotFound slug={leagueSlug} />
    );
  }

  return (
    <>
      <SiteHeader>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <Link
            to="/"
            className="flex items-center gap-1 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-ink-400 transition-colors hover:border-white/10 hover:bg-white/[0.06] hover:text-ink-100"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            All Leagues
          </Link>
          <span className="truncate text-sm font-bold text-ink-100">{name}</span>
        </div>
      </SiteHeader>

      <main className="relative mx-auto max-w-3xl px-4 py-6">
        {loading && !league ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-ink-700 border-t-accent-500" />
            <p className="text-xs font-medium text-ink-400">Loading {name}...</p>
          </div>
        ) : error ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
              <span className="text-2xl">!</span>
            </div>
            <p className="text-sm font-medium text-red-400">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-ink-100 transition-colors hover:bg-white/10"
            >
              Try again
            </button>
          </div>
        ) : league ? (
          <div className="animate-fade-in">
            <LeagueSection
              league={league}
              favorite={favoriteSlugs.includes(league.slug)}
              onToggleFavorite={toggleFavorite}
              onMatchClick={(matchId) => navigate(`/league/${league.slug}/match/${matchId}`)}
              onStandingsClick={() => setStandingsOpen(true)}
            />
          </div>
        ) : (
          <NotFound slug={leagueSlug} />
        )}
      </main>

      {standingsOpen && league && (
        <StandingsModal
          leagueSlug={league.slug}
          leagueName={league.name}
          onClose={() => setStandingsOpen(false)}
        />
      )}
    </>
  );
}

function NotFound({ slug }: { slug: string }) {
  return (
    <div className="mx-auto flex min-h-[400px] max-w-3xl flex-col items-center justify-center gap-4 px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03]">
        <Star className="h-8 w-8 text-ink-600" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-ink-200">League not found</p>
        <p className="mt-1 text-xs text-ink-400">{slug ? `No league matches '${slug}'` : 'Missing league'}</p>
      </div>
      <Link
        to="/"
        className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-ink-100 transition-colors hover:bg-white/10"
      >
        Back to all scores
      </Link>
    </div>
  );
}