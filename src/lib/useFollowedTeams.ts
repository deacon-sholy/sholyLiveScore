import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'sholy-favorite-teams';

export interface FollowedTeam {
  id: string;
  name: string;
}

function loadTeams(): FollowedTeam[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is FollowedTeam =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as FollowedTeam).id === 'string' &&
        typeof (item as FollowedTeam).name === 'string',
    );
  } catch {
    return [];
  }
}

export function useFollowedTeams() {
  const [teams, setTeams] = useState<FollowedTeam[]>(loadTeams);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
    } catch {
      // ignore storage errors (private mode, quota)
    }
  }, [teams]);

  const toggleTeam = useCallback((team: FollowedTeam) => {
    setTeams((prev) =>
      prev.some((t) => t.id === team.id)
        ? prev.filter((t) => t.id !== team.id)
        : [...prev, team],
    );
  }, []);

  const isFollowing = useCallback((id: string) => teams.some((t) => t.id === id), [teams]);

  return { teams, toggleTeam, isFollowing };
}
