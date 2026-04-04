import type { Rank } from './types';

const lookupRankThresholds: Array<{ minCount: number; rank: Rank }> = [
  { minCount: 1, rank: 'blue' },
  { minCount: 3, rank: 'green' },
  { minCount: 5, rank: 'yellow' },
  { minCount: 8, rank: 'orange' },
  { minCount: 12, rank: 'red' },
];

export const rankColorStyles: Record<Rank, string> = {
  blue: 'text-sky-700 bg-sky-100',
  green: 'text-emerald-700 bg-emerald-100',
  yellow: 'text-amber-700 bg-amber-100',
  orange: 'text-orange-700 bg-orange-100',
  red: 'text-red-700 bg-red-100',
  master: 'text-slate-700 bg-slate-200',
};

export function getRankFromLookupCount(lookupCount: number): Rank {
  if (lookupCount <= 0) {
    return 'blue';
  }

  let resolvedRank: Rank = 'blue';
  for (const threshold of lookupRankThresholds) {
    if (lookupCount >= threshold.minCount) {
      resolvedRank = threshold.rank;
    }
  }

  return resolvedRank;
}

export function rankOrderValue(rank: Rank): number {
  const order: Record<Rank, number> = {
    red: 0,
    orange: 1,
    yellow: 2,
    green: 3,
    blue: 4,
    master: 5,
  };

  return order[rank];
}

const reviewScale: Rank[] = ['red', 'orange', 'yellow', 'green', 'blue', 'master'];

export function decreaseDangerRank(rank: Rank): Rank {
  const index = reviewScale.indexOf(rank);
  if (index < 0) return 'red';
  if (index >= reviewScale.length - 1) return 'master';
  return reviewScale[index + 1];
}

export function resetDangerRank(): Rank {
  return 'red';
}
