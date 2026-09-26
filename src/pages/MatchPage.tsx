import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ChevronLeft, SearchX } from 'lucide-react';
import type { Match } from '../types';
import { fetchMatchDetail } from '../lib/api';
import SiteHeader from '../components/SiteHeader';
import MatchDetail from '../components/MatchDetail';
import { applySeo, isKnownLeague, leagueName, SITE } from '../lib/seo';

export default function MatchPage() {
  const navigate = useNavigate();
  const { leagueSlug = '', matchId = '' } = useParams();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      setError(null);
      try {
        // The summary endpoint returns the match itself, so this works for any
        // date rather than only matches in today's scoreboard.
        const detail = await fetchMatchDetail(leagueSlug, matchId);
        if (!alive) return;
        setMatch(
          detail.match
            ? { ...detail.match, detail: { stats: detail.stats, form: detail.form, h2h: detail.h2h } }
            : null,
        );
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'Failed to load match');
      } finally {
        inFlight.current = false;
        if (alive) setLoading(false);
      }
    };

    setLoading(true);
    setMatch(null);
    load();
    const interval = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [leagueSlug, matchId]);

  const home = match?.home_team.name ?? '';
  const away = match?.away_team.name ?? '';

  useEffect(() => {
    const title = home && away ? `${home} vs ${away} · ${leagueName(leagueSlug)} | Sholy Livescore` : 'Match | Sholy Livescore';
    const seoStatus =
      match?.status === 'finished'
        ? `${home} ${match.home_score}-${match.away_score} ${away} — full time.`
        : match && isInPlayStatus(match.status)
          ? `${home} vs ${away} — ${match.home_score}-${match.away_score}, live.`
          : `${home} vs ${away} — kickoff, fixtures and results.`;
    const url = `${SITE}/league/${leagueSlug}/match/${matchId}`;

    applySeo({
      title,
      description: `${seoStatus} ${leagueName(leagueSlug)} stats, form, head-to-head and match events on Sholy Livescore.`,
      canonical: `/league/${leagueSlug}/match/${matchId}`,
      jsonLd: match
        ? {
            '@context': 'https://schema.org',
            '@type': 'SportsEvent',
            name: `${home} vs ${away}`,
            startDate: match.kickoff,
            sport: 'Soccer',
            eventStatus: `https://schema.org/${eventStatus(match.status)}`,
            competitor: [
              { '@type': 'SportsTeam', name: home, homeAway: 'Home', score: String(match.home_score) },
              { '@type': 'SportsTeam', name: away, homeAway: 'Away', score: String(match.away_score) },
            ],
            url,
          }
        : undefined,
    });
  }, [home, away, match, leagueSlug, matchId]);

  if (!isKnownLeague(leagueSlug)) {
    return (
      <NotFound slug="match" />
    );
  }

  return (
    <>
      <SiteHeader>
        <div className="flex items-center gap-2 pb-2.5 pt-2.5 text-sm sm:pb-3 sm:pt-3">
          <button
            onClick={() => navigate(`/league/${leagueSlug}`)}
            className="inline-flex max-w-[45%] min-w-0 items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-line-strong hover:text-fg"
          >
            <ChevronLeft className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{leagueName(leagueSlug)}</span>
          </button>
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-fg">
            {home && away ? `${home} vs ${away}` : 'Match'}
          </span>
        </div>
      </SiteHeader>

      <main className="px-4 py-5 sm:px-6 sm:py-6">
        {loading && !match ? (
          <div className="mx-auto max-w-2xl space-y-4" aria-hidden>
            <div className="skeleton h-56 rounded-2xl" />
            <div className="skeleton h-40 rounded-2xl" />
          </div>
        ) : error && !match ? (
          <div className="mx-auto flex max-w-2xl min-h-[300px] flex-col items-center justify-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <p className="text-sm font-medium text-fg">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl bg-fg px-5 py-2.5 text-sm font-semibold text-canvas transition-opacity hover:opacity-85"
            >
              Try again
            </button>
          </div>
        ) : match ? (
          <MatchDetail match={match} onBack={() => navigate(`/league/${leagueSlug}`)} />
        ) : (
          <NotFound slug="match" />
        )}
      </main>
    </>
  );
}

function isInPlayStatus(status: Match['status']): boolean {
  return status === 'live' || status === 'halftime';
}

function eventStatus(status: Match['status']): string {
  if (status === 'finished') return 'EventCompleted';
  if (isInPlayStatus(status)) return 'EventInProgress';
  return 'EventScheduled';
}

function NotFound({ slug }: { slug: string }) {
  return (
    <div className="mx-auto flex min-h-[400px] max-w-3xl flex-col items-center justify-center gap-4 px-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface">
        <SearchX className="h-6 w-6 text-subtle" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-fg">Match not found</p>
        <p className="mt-1 text-xs text-muted">This {slug} could not be loaded, or the id is no longer valid.</p>
      </div>
      <Link
        to="/"
        className="rounded-xl bg-fg px-5 py-2.5 text-sm font-semibold text-canvas transition-opacity hover:opacity-85"
      >
        Back to all scores
      </Link>
    </div>
  );
}
