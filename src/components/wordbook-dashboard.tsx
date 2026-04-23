'use client';

import React from 'react';
import { useState } from 'react';
import { ArrowRight, Crown, Flame, Layers3, Sparkles } from 'lucide-react';
import { rankColorStyles } from '@/src/lib/rank';
import { buildWordbookSummary, getReviewQueue } from '@/src/lib/wordbook';
import type { PlanTier, WordbookEntry } from '@/src/lib/types';
import { SwipeQuiz } from '@/src/components/swipe-quiz';
import { WordbookList } from '@/src/components/wordbook-list';

type WordbookDashboardProps = {
  words: WordbookEntry[];
  planTier: PlanTier;
};

export function WordbookDashboard({ words, planTier }: WordbookDashboardProps) {
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const isPremium = planTier === 'premium';
  const summary = buildWordbookSummary(words);
  const reviewQueue = getReviewQueue(words, 5);

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Saved Words" value={summary.totalWords} tone="slate" detail="전체 단어장 규모" icon={<Layers3 className="h-4 w-4" />} />
        <SummaryCard label="Urgent Review" value={summary.urgentWords} tone="red" detail="복습이 필요한 단어" icon={<Flame className="h-4 w-4" />} />
        <SummaryCard label="Mastered" value={summary.masteredWords} tone="emerald" detail="안정적으로 익힌 단어" icon={<Sparkles className="h-4 w-4" />} />
        <SummaryCard label="Seen This Week" value={summary.activeThisWeek} tone="sky" detail="최근 7일간 등장" icon={<ArrowRight className="h-4 w-4" />} />
      </div>

      <div className="rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-indigo-700">
              <Crown className="h-3.5 w-3.5" />
              Review Zone
            </span>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Swipe 기반 복습으로 위험 랭크를 빠르게 낮추세요.</h2>
            <p className="mt-3 text-slate-600">
              단어장에 쌓인 단어를 복습 큐로 전환해, 읽기 흐름과 복습 흐름을 분리해서 관리할 수 있습니다.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!isPremium) {
                return;
              }
              setIsReviewOpen((value) => !value);
            }}
            disabled={!isPremium}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            {isPremium ? (isReviewOpen ? 'Close Review' : 'Start Review') : 'Premium Only'}
            {isPremium ? <ArrowRight className="h-4 w-4" /> : null}
          </button>
        </div>

        {!isPremium ? (
          <div className="mt-6 rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-sky-50 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-indigo-700">Premium preview</p>
                <p className="mt-1 text-sm text-slate-600">
                  Swipe Review와 전체 단어장 분석은 Premium에서 사용할 수 있습니다.
                </p>
              </div>
              <div className="rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700">
                Upgrade to unlock review flow
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {reviewQueue.length > 0 ? (
            reviewQueue.map((word) => (
              <article key={word.id} className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-black text-slate-950">{word.term}</p>
                    <p className="mt-1 text-xs text-slate-500">{word.total_lookup_count} lookups</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-bold uppercase ${rankColorStyles[word.rank]}`}
                  >
                    {word.rank}
                  </span>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{word.context_sample}</p>
              </article>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500 md:col-span-2 xl:col-span-5">
              아직 저장된 단어가 없습니다. 확장앱으로 단어를 조회하면 여기에 복습 큐가 쌓입니다.
            </div>
          )}
        </div>
      </div>

      {isPremium && isReviewOpen ? (
        <SwipeQuiz words={words} onClose={() => setIsReviewOpen(false)} />
      ) : null}

      <WordbookList words={words} planTier={planTier} />
    </section>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  detail,
  icon,
}: {
  label: string;
  value: number;
  tone: 'slate' | 'red' | 'emerald' | 'sky';
  detail: string;
  icon: React.ReactNode;
}) {
  const toneStyles = {
    slate: 'border-slate-200 bg-white text-slate-950',
    red: 'border-red-100 bg-red-50 text-red-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    sky: 'border-sky-100 bg-sky-50 text-sky-700',
  };

  return (
    <article className={`rounded-3xl border p-5 shadow-sm ${toneStyles[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] opacity-70">{label}</p>
          <p className="mt-3 text-3xl font-black">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 text-current shadow-sm">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-sm opacity-75">{detail}</p>
    </article>
  );
}
