import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import MatchHistory from './MatchHistory';

afterEach(cleanup);

const form = {
  home: [
    { result: 'W', opponent: 'Jablonec', score: '2-0', atVs: 'vs', date: '2026-10-22T16:45Z' },
  ],
  away: [
    { result: 'L', opponent: 'Liverpool', score: '0-2', atVs: '@', date: '2026-10-22T16:45Z' },
  ],
};

const h2h = {
  title: 'H2H',
  summary: 'Home leads 1-0',
  meetings: [
    {
      date: '2025-01-01',
      home: 'Home FC',
      away: 'Away FC',
      home_score: 1,
      away_score: 0,
      winner: 'home' as const,
      status: 'FT',
      competition: 'League',
    },
  ],
};

describe('MatchHistory tabs', () => {
  it('switches from head-to-head to form when the Form button is clicked', () => {
    render(
      <MatchHistory
        h2h={h2h}
        form={form}
        homeName="Home FC"
        awayName="Away FC"
      />,
    );

    expect(screen.getByText('Home leads 1-0')).toBeInTheDocument();
    expect(screen.queryByText('Jablonec')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Form' }));

    expect(screen.getByText('Jablonec')).toBeInTheDocument();
    expect(screen.getByText('Liverpool')).toBeInTheDocument();
    expect(screen.queryByText('Home leads 1-0')).not.toBeInTheDocument();
  });
});
