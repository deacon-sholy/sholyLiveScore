import type { Match } from '../types';
import { SITE } from './seo';

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** A two-hour event with a deep link back to the match page. */
export function buildIcs(match: Match): string {
  const start = new Date(match.kickoff);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const url = `${SITE}/league/${match.league_slug}/match/${match.id}`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sholy Livescore//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${match.id}@sholylivescore.netlify.app`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${utcStamp(start)}`,
    `DTEND:${utcStamp(end)}`,
    `SUMMARY:${escapeIcs(`${match.home_team.name} vs ${match.away_team.name}`)}`,
    `DESCRIPTION:${escapeIcs(`${match.league_name} — match details: ${url}`)}`,
    `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadCalendar(match: Match): void {
  const blob = new Blob([buildIcs(match)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${match.home_team.name}-${match.away_team.name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
