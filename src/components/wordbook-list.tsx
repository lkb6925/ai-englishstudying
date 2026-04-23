'use client';

import React from 'react';
import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { rankOrderValue } from '@/src/lib/rank';
import { filterAndSortWords, type WordbookSort } from '@/src/lib/wordbook';
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
    <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-indigo-50/70 to-transparent" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-white">
            <Sparkles className="h-3.5 w-3.5" />
            My Wordbook
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">단어장 전체를 한 눈에 관리하세요.</h1>
          <p className="mt-2 text-slate-500">
            {filteredWords.length} / {words.length} words shown
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Search className="h-3.5 w-3.5" />
              Search
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="word, meaning, context"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
            />
          </label>
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Rank
            </span>
            <select
              value={selectedRank}
              onChange={(event) => setSelectedRank(event.target.value as Rank | 'all')}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
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
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Sort</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as WordbookSort)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="recent">Recently seen</option>
              <option value="lookups">Most lookups</option>
              <option value="rank">Highest risk first</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </label>
        </div>
      </div>

      <div className={`relative mt-8 ${isPremium ? '' : 'overflow-hidden'}`}>
        <div className={isPremium ? '' : 'pointer-events-none select-none blur-[1.5px]'}>
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
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="group rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-black text-slate-950">{item.term}</p>
                            <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Lookups {item.total_lookup_count}</p>
                          </div>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold uppercase text-slate-600">
                            {item.rank}
                          </span>
                        </div>
                        {item.meaning_snapshot?.length ? (
                          <p className="mt-3 text-sm font-medium leading-6 text-slate-700">
                            {item.meaning_snapshot.join(' · ')}
                          </p>
                        ) : null}
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{item.context_sample}</p>
                        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                          <span>{new Date(item.last_seen_at).toLocaleDateString()}</span>
                          <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}

            {filteredWords.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                <p className="text-lg font-bold text-slate-950">No matching words</p>
                <p className="mt-2 text-slate-500">검색어, 랭크, 정렬 조건을 바꿔 보세요.</p>
              </div>
            ) : null}
          </div>
        </div>

        {!isPremium ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-[2rem] bg-white/55 px-6 backdrop-blur-sm">
            <div className="max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-8 text-center shadow-[0_25px_70px_rgba(15,23,42,0.12)]">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-2xl font-black text-slate-950">Unlock Your Wordbook</h3>
              <p className="mt-3 text-slate-600">
                Premium 멤버가 되어 저장된 의미 스냅샷과 Swipe Review를 모두 이용하세요.
              </p>
              <Button className="mt-6 w-full rounded-full">Upgrade to Premium</Button>
            </div>
          </div>
        ) : null}
      </div>
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
