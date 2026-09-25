import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
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
        <div className="mt-3 flex items-center gap-2 text-sm">
          <button
            onClick={() => navigate(`/league/${leagueSlug}`)}
            className="flex items-center gap-1 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-ink-400 transition-colors hover:border-white/10 hover:bg-white/[0.06] hover:text-ink-100"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {leagueName(leagueSlug)}
          </button>
          <span className="truncate text-sm font-bold text-ink-100">{home && away ? `${home} vs ${away}` : 'Match'}</span>
        </div>
      </SiteHeader>

      <main className="relative px-4 py-6">
        {loading && !match ? (
          <div className="mx-auto flex max-w-2xl min-h-[300px] flex-col items-center justify-center gap-3">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-ink-700 border-t-accent-500" />
            <p className="text-xs font-medium text-ink-400">Loading match...</p>
          </div>
        ) : error && !match ? (
          <div className="mx-auto flex max-w-2xl min-h-[300px] flex-col items-center justify-center gap-4">
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
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03]">
        <ChevronLeft className="h-8 w-8 text-ink-600" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-ink-200">Match not found</p>
        <p className="mt-1 text-xs text-ink-400">This {slug} could not be loaded, or the id is no longer valid.</p>
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
