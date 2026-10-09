export type ResultInput = {
  teamId: string;
  teamName: string;
  rank: number;
  kills: number;
};

export type Standing = {
  teamId: string;
  teamName: string;
  killPoints: number;
  placementPoints: number;
  totalPoints: number;
  wins: number;
  matches: number;
};

export type RankedStanding = Standing & {
  rank: number;
};

const PLACEMENT_POINTS: Record<number, number> = {
  1: 10,
  2: 6,
  3: 5,
  4: 4,
  5: 3,
  6: 2,
  7: 1,
  8: 1,
};

export function placementPoints(rank: number): number {
  assertInteger(rank, 1, 200, "순위는 1 이상 200 이하의 정수여야 합니다.");
  return PLACEMENT_POINTS[rank] ?? 0;
}

export function killPoints(kills: number): number {
  assertInteger(kills, 0, 500, "킬은 0 이상 500 이하의 정수여야 합니다.");
  return kills;
}

export function scoreTeam(rank: number, kills: number): {
  placementPoints: number;
  killPoints: number;
  totalPoints: number;
} {
  const placement = placementPoints(rank);
  const killsScore = killPoints(kills);
  return {
    placementPoints: placement,
    killPoints: killsScore,
    totalPoints: placement + killsScore,
  };
}

export function previewScore(
  rank: number | null,
  kills: number | null,
): { placementPoints: number; killPoints: number; totalPoints: number } | null {
  if (rank === null || kills === null) return null;
  try {
    return scoreTeam(rank, kills);
  } catch {
    return null;
  }
}

export function aggregateStandings(results: ResultInput[]): RankedStanding[] {
  const totals = new Map<string, Standing>();

  for (const result of results) {
    const scored = scoreTeam(result.rank, result.kills);
    const current = totals.get(result.teamId) ?? {
      teamId: result.teamId,
      teamName: result.teamName,
      killPoints: 0,
      placementPoints: 0,
      totalPoints: 0,
      wins: 0,
      matches: 0,
    };
    current.teamName = result.teamName;
    current.killPoints += scored.killPoints;
    current.placementPoints += scored.placementPoints;
    current.totalPoints += scored.totalPoints;
    current.matches += 1;
    if (result.rank === 1) current.wins += 1;
    totals.set(result.teamId, current);
  }

  return [...totals.values()]
    .sort((left, right) => {
      if (right.totalPoints !== left.totalPoints) return right.totalPoints - left.totalPoints;
      if (right.killPoints !== left.killPoints) return right.killPoints - left.killPoints;
      if (right.wins !== left.wins) return right.wins - left.wins;
      return left.teamName.localeCompare(right.teamName, "ko");
    })
    .map((standing, index) => ({ ...standing, rank: index + 1 }));
}

export function formatSigned(value: number): string {
  return `+${value}`;
}

function assertInteger(value: number, min: number, max: number, message: string) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(message);
  }
}
