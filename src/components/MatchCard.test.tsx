import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Match } from '../types';
import MatchCard from './MatchCard';

const match: Match = {
  id: '777',
  league_slug: 'eng.1',
  league_name: 'Premier League',
  league_country: 'England',
  league_logo: null,
  kickoff: '2026-11-17T15:00:00Z',
  status: 'finished',
  status_detail: 'Full time',
  minute: null,
  home_team: { id: '1', name: 'Home FC', short_name: 'HOM', logo: null, color: null },
  away_team: { id: '2', name: 'Away FC', short_name: 'AWY', logo: null, color: null },
  home_score: 2,
  away_score: 1,
  events: [
    { type: 'goal', minute: 12, player_name: 'Scorer', detail: '', team_id: '1', team_name: 'Home FC' },
  ],
};

afterEach(cleanup);

describe('MatchCard', () => {
  it('exposes an accessible label and reports clicks', () => {
    const onClick = vi.fn();
    render(<MatchCard match={match} onClick={onClick} />);

    const card = screen.getByRole('button', {
      name: /home fc versus away fc, final score 2 to 1/i,
    });
    expect(card).toBeInTheDocument();
    expect(screen.getByText('Full time')).toBeInTheDocument();

    fireEvent.click(card);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('shows a live badge and minute for matches in play', () => {
    render(
      <MatchCard
        match={{
          ...match,
          status: 'live',
          status_detail: "67'",
          minute: 67,
          events: [],
        }}
        onClick={() => undefined}
      />,
    );
    expect(screen.getByText("67'")).toBeInTheDocument();
  });
});
