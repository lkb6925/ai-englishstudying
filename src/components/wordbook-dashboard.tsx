import { useState } from 'react';
import { SwipeQuiz } from '@/src/components/swipe-quiz';
import { WordbookList } from '@/src/components/wordbook-list';
import type { PlanTier, WordbookEntry } from '@/src/lib/types';

type WordbookDashboardProps = {
  words: WordbookEntry[];
  planTier: PlanTier;
};

export function WordbookDashboard({ words, planTier }: WordbookDashboardProps) {
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const isPremium = planTier === 'premium';

  return (
    <section className="space-y-6">
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
      </div>

      {isPremium && isReviewOpen ? (
        <SwipeQuiz words={words} onClose={() => setIsReviewOpen(false)} />
      ) : null}

      <WordbookList words={words} planTier={planTier} />
    </section>
  );
}
