import type { Match } from '../types';
import { SITE } from './seo';

export const ALERTS_STORAGE_KEY = 'sholy-goal-alerts';

export function alertsEnabled(): boolean {
  try {
    return localStorage.getItem(ALERTS_STORAGE_KEY) === '1' && Notification.permission === 'granted';
  } catch {
    return false;
  }
}

export async function requestAlerts(): Promise<NotificationPermission | null> {
  if (!('Notification' in window)) return null;
  let permission = Notification.permission;
  if (permission !== 'granted') permission = await Notification.requestPermission();
  try {
    localStorage.setItem(ALERTS_STORAGE_KEY, permission === 'granted' ? '1' : '0');
  } catch {
    // ignore storage errors
  }
  return permission;
}

export function disableAlerts(): void {
  try {
    localStorage.setItem(ALERTS_STORAGE_KEY, '0');
  } catch {
    // ignore storage errors
  }
}

export function showGoalAlert(match: Match): void {
  if (!alertsEnabled()) return;

  const title = `GOAL · ${match.home_team.name} ${match.home_score}-${match.away_score} ${match.away_team.name}`;
  const options: NotificationOptions = {
    body: `${match.league_name}${match.status_detail ? ` · ${match.status_detail}` : ''}`,
    tag: `goal-${match.id}`,
    data: { url: `${SITE}/league/${match.league_slug}/match/${match.id}` },
  };

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => registration.showNotification(title, options))
      .catch(() => {
        // Fall back to a plain notification if the SW isn't controlling yet.
        try {
          new Notification(title, options);
        } catch {
          // Notifications unavailable — silently skip.
        }
      });
    return;
  }

  try {
    new Notification(title, options);
  } catch {
    // Notifications unavailable — silently skip.
  }
}
