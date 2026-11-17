import { useEffect, useRef } from 'react';
import type { Match } from '../types';
import { alertsEnabled, showGoalAlert } from './notifications';

interface ScoreSnapshot {
  home: number;
  away: number;
}

/**
 * Watches a sequence of scoreboard refreshes and raises one notification when
 * a followed team scores. The baseline is set on the first render, so enabling
 * alerts mid-match never fires a retroactive "goal" for the current score.
 */
export function useGoalAlerts(matches: Match[], followedIds: string[]): void {
  const previous = useRef<Map<string, ScoreSnapshot>>(new Map());

  useEffect(() => {
    const next = new Map<string, ScoreSnapshot>();
    for (const match of matches) {
      next.set(match.id, { home: match.home_score, away: match.away_score });

      const before = previous.current.get(match.id);
      const involvesFollowed =
        followedIds.includes(match.home_team.id) || followedIds.includes(match.away_team.id);
      if (
        before &&
        involvesFollowed &&
        alertsEnabled() &&
        document.visibilityState === 'hidden' &&
        (match.home_score > before.home || match.away_score > before.away)
      ) {
        showGoalAlert(match);
      }
    }
    previous.current = next;
  }, [matches, followedIds]);
}
