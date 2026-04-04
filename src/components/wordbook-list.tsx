import { rankOrderValue } from '@/src/lib/rank';
import type { PlanTier, Rank, WordbookEntry } from '@/src/lib/types';

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
  const grouped = groupWords(words);
  const orderedRanks = (Object.keys(grouped) as Rank[]).sort(
    (left, right) => rankOrderValue(left) - rankOrderValue(right),
  );

  return (
    <section className="relative rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">My Wordbook</h1>
      
      <div className={planTier === 'free' ? 'pointer-events-none blur-md select-none' : ''}>
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
        </div>
      </div>

      {planTier === 'free' ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/60 backdrop-blur-sm">
          <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
            <h3 className="mb-2 text-xl font-bold">Unlock Your Wordbook</h3>
            <p className="mb-6 text-slate-600">Premium 멤버가 되어 모든 단어 데이터와 상세 분석 기능을 이용하세요.</p>
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

import { Button } from '@/src/components/ui/button';
