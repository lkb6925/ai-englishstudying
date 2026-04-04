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
            onClick={() => setIsReviewOpen((value) => !value)}
            className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90"
          >
            {isReviewOpen ? 'Close Review' : 'Start Review'}
          </button>
        </div>
      </div>

      {isReviewOpen ? <SwipeQuiz words={words} onClose={() => setIsReviewOpen(false)} /> : null}

      <WordbookList words={words} planTier={planTier} />
    </section>
  );
}
