import { useState } from 'react';
import { SwipeQuiz } from '@/src/components/swipe-quiz';
import { WordbookList } from '@/src/components/wordbook-list';
import type { PlanTier, WordbookEntry } from '@/src/lib/types';
import { buildWordbookSummary, getReviewQueue } from '@/src/lib/wordbook';
import { rankColorStyles } from '@/src/lib/rank';

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
        <SummaryCard label="Saved Words" value={summary.totalWords} tone="slate" />
        <SummaryCard label="Urgent Review" value={summary.urgentWords} tone="red" />
        <SummaryCard label="Mastered" value={summary.masteredWords} tone="emerald" />
        <SummaryCard label="Seen This Week" value={summary.activeThisWeek} tone="sky" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Review Zone</h2>
            <p className="text-slate-600">Swipe 기반 복습으로 위험 랭크를 빠르게 낮추세요.</p>
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
            className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            {isPremium
              ? isReviewOpen
                ? 'Close Review'
                : 'Start Review'
              : 'Premium Only'}
          </button>
        </div>
        {!isPremium ? (
          <p className="mt-4 text-sm text-slate-500">
            Swipe Review와 전체 단어장 분석은 Premium에서 사용할 수 있습니다.
          </p>
        ) : null}

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {reviewQueue.length > 0 ? (
            reviewQueue.map((word) => (
              <article
                key={word.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{word.term}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {word.total_lookup_count} lookups
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-bold uppercase ${rankColorStyles[word.rank]}`}
                  >
                    {word.rank}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                  {word.context_sample}
                </p>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500 md:col-span-2 xl:col-span-5">
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
}: {
  label: string;
  value: number;
  tone: 'slate' | 'red' | 'emerald' | 'sky';
}) {
  const toneStyles = {
    slate: 'border-slate-200 bg-white text-slate-900',
    red: 'border-red-100 bg-red-50 text-red-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    sky: 'border-sky-100 bg-sky-50 text-sky-700',
  };

  return (
    <article className={`rounded-2xl border p-5 shadow-sm ${toneStyles[tone]}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </article>
  );
}
