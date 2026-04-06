import { useMemo, useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { rankOrderValue } from '@/src/lib/rank';
import type { PlanTier, Rank, WordbookEntry } from '@/src/lib/types';
import {
  filterAndSortWords,
  type WordbookSort,
} from '@/src/lib/wordbook';

type GroupedWords = Record<Rank, WordbookEntry[]>;

type WordbookListProps = {
  words: WordbookEntry[];
  planTier: PlanTier;
};

const rankLabels: Record<Rank, string> = {
  red: 'Red (High Risk)',
  orange: 'Orange',
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
  master: 'Mastered',
};

function groupWords(words: WordbookEntry[]): GroupedWords {
  const base: GroupedWords = {
    red: [],
    orange: [],
    yellow: [],
    green: [],
    blue: [],
    master: [],
  };

  for (const word of words) {
    base[word.rank].push(word);
  }

  return base;
}

export function WordbookList({ words, planTier }: WordbookListProps) {
  const [query, setQuery] = useState('');
  const [selectedRank, setSelectedRank] = useState<Rank | 'all'>('all');
  const [sort, setSort] = useState<WordbookSort>('recent');
  const isPremium = planTier === 'premium';
  const filteredWords = useMemo(
    () =>
      filterAndSortWords(words, {
        query,
        rank: selectedRank,
        sort,
      }),
    [query, selectedRank, sort, words],
  );
  const grouped = useMemo(() => groupWords(filteredWords), [filteredWords]);
  const orderedRanks = useMemo(
    () =>
      (Object.keys(rankLabels) as Rank[]).sort(
        (left, right) => rankOrderValue(left) - rankOrderValue(right),
      ),
    [],
  );

  return (
    <section className="relative rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Wordbook</h1>
          <p className="mt-2 text-slate-500">
            {filteredWords.length} / {words.length} words shown
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Search
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="word, meaning, context"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-primary"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Rank
            </span>
            <select
              value={selectedRank}
              onChange={(event) =>
                setSelectedRank(event.target.value as Rank | 'all')
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-primary"
            >
              <option value="all">All ranks</option>
              {orderedRanks.map((rank) => (
                <option key={rank} value={rank}>
                  {rankLabels[rank]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Sort
            </span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as WordbookSort)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-primary"
            >
              <option value="recent">Recently seen</option>
              <option value="lookups">Most lookups</option>
              <option value="rank">Highest risk first</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </label>
        </div>
      </div>
      
      <div className={`mt-8 ${isPremium ? '' : 'pointer-events-none select-none blur-md'}`}>
        <div className="space-y-10">
          {orderedRanks.map((rank) => {
            const items = grouped[rank];
            if (items.length === 0) {
              return null;
            }

            return (
              <article key={rank}>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                  <span className={`h-3 w-3 rounded-full bg-current ${getRankDotColor(rank)}`} />
                  {rankLabels[rank]}
                  <span className="ml-2 text-sm font-normal text-slate-400">({items.length})</span>
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => (
                    <div key={item.id} className="group rounded-xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-primary/20 hover:bg-white hover:shadow-md">
                      <p className="text-lg font-bold text-slate-900">{item.term}</p>
                      {item.meaning_snapshot?.length ? (
                        <p className="mt-2 text-sm font-medium text-slate-700">
                          {item.meaning_snapshot.join(' · ')}
                        </p>
                      ) : null}
                      <p className="mt-1 text-sm text-slate-500 line-clamp-2">{item.context_sample}</p>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                        <span>Lookups: {item.total_lookup_count}</span>
                        <span>{new Date(item.last_seen_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}

          {filteredWords.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
              <p className="text-lg font-bold text-slate-900">No matching words</p>
              <p className="mt-2 text-slate-500">
                검색어, 랭크, 정렬 조건을 바꿔 보세요.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {!isPremium ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/60 backdrop-blur-sm">
          <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
            <h3 className="mb-2 text-xl font-bold">Unlock Your Wordbook</h3>
            <p className="mb-6 text-slate-600">
              Premium 멤버가 되어 저장된 의미 스냅샷과 Swipe Review를 모두 이용하세요.
            </p>
            <Button className="w-full rounded-full">Upgrade to Premium</Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function getRankDotColor(rank: Rank) {
  const colors: Record<Rank, string> = {
    red: 'text-red-500',
    orange: 'text-orange-500',
    yellow: 'text-yellow-500',
    green: 'text-emerald-500',
    blue: 'text-sky-500',
    master: 'text-slate-400',
  };
  return colors[rank];
}
