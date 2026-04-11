import { buildWordbookSummary, filterAndSortWords, getReviewQueue } from '@/src/lib/wordbook';
import type { WordbookEntry } from '@/src/lib/types';

const now = new Date('2026-04-11T12:00:00.000Z');

const words: WordbookEntry[] = [
  {
    id: '1',
    user_id: 'u1',
    term: 'abandon',
    normalized_term: 'abandon',
    context_sample: 'Do not abandon your studies.',
    meaning_snapshot: ['포기하다'],
    total_lookup_count: 12,
    rank: 'red',
    last_seen_at: now.toISOString(),
    created_at: now.toISOString(),
  },
  {
    id: '2',
    user_id: 'u1',
    term: 'benevolent',
    normalized_term: 'benevolent',
    context_sample: 'She is a benevolent teacher.',
    meaning_snapshot: ['자애로운'],
    total_lookup_count: 6,
    rank: 'yellow',
    last_seen_at: new Date('2026-04-01T12:00:00.000Z').toISOString(),
    created_at: now.toISOString(),
  },
  {
    id: '3',
    user_id: 'u1',
    term: 'curate',
    normalized_term: 'curate',
    context_sample: 'Curate the lesson set.',
    meaning_snapshot: ['선별하다'],
    total_lookup_count: 2,
    rank: 'master',
    last_seen_at: now.toISOString(),
    created_at: now.toISOString(),
  },
];

describe('wordbook helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds the summary from the current list', () => {
    expect(buildWordbookSummary(words)).toEqual({
      totalWords: 3,
      urgentWords: 1,
      masteredWords: 1,
      totalLookups: 20,
      activeThisWeek: 2,
    });
  });

  it('orders the review queue by risk, lookups, then recency', () => {
    expect(getReviewQueue(words).map((word) => word.id)).toEqual(['1', '2', '3']);
  });

  it('filters and sorts matching words', () => {
    expect(
      filterAndSortWords(words, { query: '자애', rank: 'all', sort: 'alphabetical' }).map(
        (word) => word.term,
      ),
    ).toEqual(['benevolent']);

    expect(
      filterAndSortWords(words, { query: '', rank: 'all', sort: 'lookups' }).map(
        (word) => word.id,
      ),
    ).toEqual(['1', '2', '3']);
  });
});
