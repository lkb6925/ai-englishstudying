import type { Rank } from './types';

export const rankColorStyles: Record<Rank, string> = {
  blue: 'text-sky-700 bg-sky-100',
  green: 'text-emerald-700 bg-emerald-100',
  yellow: 'text-amber-700 bg-amber-100',
  orange: 'text-orange-700 bg-orange-100',
  red: 'text-red-700 bg-red-100',
  master: 'text-slate-700 bg-slate-200',
};

export function getRankFromLookupCount(lookupCount: number): Rank {
  if (lookupCount >= 12) return 'red';
  if (lookupCount >= 8) return 'orange';
  if (lookupCount >= 5) return 'yellow';
  if (lookupCount >= 3) return 'green';
  return 'blue';
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

export function decreaseDangerRank(rank: Rank): Rank {
  const scale: Rank[] = ['red', 'orange', 'yellow', 'green', 'blue', 'master'];
  const idx = scale.indexOf(rank);
  if (idx < 0) return 'red';
  if (idx >= scale.length - 1) return 'master';
  return scale[idx + 1];
}

export function resetDangerRank(): Rank {
  return 'red';
}
