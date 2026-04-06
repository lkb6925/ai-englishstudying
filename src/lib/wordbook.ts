import { rankOrderValue } from '@/src/lib/rank';
import type { Rank, WordbookEntry } from '@/src/lib/types';

export type WordbookSort = 'recent' | 'lookups' | 'rank' | 'alphabetical';

export type WordbookSummary = {
  totalWords: number;
  urgentWords: number;
  masteredWords: number;
  totalLookups: number;
  activeThisWeek: number;
};

export type WordbookFilters = {
  query: string;
  rank: Rank | 'all';
  sort: WordbookSort;
};

export function buildWordbookSummary(words: WordbookEntry[]): WordbookSummary {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return words.reduce<WordbookSummary>(
    (summary, word) => {
      summary.totalWords += 1;
      summary.totalLookups += word.total_lookup_count;

      if (word.rank === 'red' || word.rank === 'orange') {
        summary.urgentWords += 1;
      }

      if (word.rank === 'master') {
        summary.masteredWords += 1;
      }

      if (Date.parse(word.last_seen_at) >= weekAgo) {
        summary.activeThisWeek += 1;
      }

      return summary;
    },
    {
      totalWords: 0,
      urgentWords: 0,
      masteredWords: 0,
      totalLookups: 0,
      activeThisWeek: 0,
    },
  );
}

export function getReviewQueue(
  words: WordbookEntry[],
  limit = 5,
): WordbookEntry[] {
  return [...words]
    .sort((left, right) => {
      const byRank = rankOrderValue(left.rank) - rankOrderValue(right.rank);
      if (byRank !== 0) {
        return byRank;
      }

      const byLookups = right.total_lookup_count - left.total_lookup_count;
      if (byLookups !== 0) {
        return byLookups;
      }

      return Date.parse(right.last_seen_at) - Date.parse(left.last_seen_at);
    })
    .slice(0, limit);
}

export function filterAndSortWords(
  words: WordbookEntry[],
  filters: WordbookFilters,
): WordbookEntry[] {
  const normalizedQuery = filters.query.trim().toLowerCase();

  const filtered = words.filter((word) => {
    if (filters.rank !== 'all' && word.rank !== filters.rank) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return (
      word.term.toLowerCase().includes(normalizedQuery) ||
      word.normalized_term.toLowerCase().includes(normalizedQuery) ||
      word.context_sample.toLowerCase().includes(normalizedQuery) ||
      (word.meaning_snapshot ?? []).some((meaning) =>
        meaning.toLowerCase().includes(normalizedQuery),
      )
    );
  });

  return filtered.sort((left, right) => {
    switch (filters.sort) {
      case 'lookups':
        return (
          right.total_lookup_count - left.total_lookup_count ||
          Date.parse(right.last_seen_at) - Date.parse(left.last_seen_at)
        );
      case 'rank':
        return (
          rankOrderValue(left.rank) - rankOrderValue(right.rank) ||
          right.total_lookup_count - left.total_lookup_count
        );
      case 'alphabetical':
        return left.term.localeCompare(right.term);
      case 'recent':
      default:
        return Date.parse(right.last_seen_at) - Date.parse(left.last_seen_at);
    }
  });
}
