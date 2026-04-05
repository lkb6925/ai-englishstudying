import { useState } from 'react';
import { SwipeQuiz } from '@/src/components/swipe-quiz';
import { WordbookList } from '@/src/components/wordbook-list';
import type { PlanTier, WordbookEntry } from '@/src/lib/types';
import { Brain, X } from 'lucide-react';

type WordbookDashboardProps = {
  words: WordbookEntry[];
  planTier: PlanTier;
};

export function WordbookDashboard({ words, planTier }: WordbookDashboardProps) {
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const urgentCount = words.filter(w => w.rank === 'red' || w.rank === 'orange').length;

  return (
    <section className="space-y-6">
      {/* Stats bar */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: '전체 단어', value: words.length, color: 'var(--accent)' },
          { label: '긴급 복습 필요', value: urgentCount, color: '#ef4444' },
          { label: '마스터 완료', value: words.filter(w => w.rank === 'master').length, color: '#10b981' },
        ].map((stat, i) => (
          <div key={i} className="rounded-2xl p-5" style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)'
          }}>
            <div className="text-3xl font-black mb-1" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Review Zone */}
      <div className="rounded-2xl p-6" style={{
        background: urgentCount > 0
          ? 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(99,102,241,0.08) 100%)'
          : 'rgba(255,255,255,0.04)',
        border: urgentCount > 0 ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(255,255,255,0.06)'
      }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{
              background: 'rgba(99,102,241,0.15)'
            }}>
              <Brain className="h-6 w-6" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>복습 모드</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {urgentCount > 0 ? `${urgentCount}개의 단어가 복습을 기다리고 있어요!` : '카드를 스와이프해서 단어를 복습하세요'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsReviewOpen(v => !v)}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all hover:scale-[1.02]"
            style={{
              background: isReviewOpen ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white'
            }}
          >
            {isReviewOpen ? (
              <><X className="h-4 w-4" /> 닫기</>
            ) : '복습 시작'}
          </button>
        </div>
      </div>

      {isReviewOpen && <SwipeQuiz words={words} onClose={() => setIsReviewOpen(false)} />}

      <WordbookList words={words} planTier={planTier} />
    </section>
  );
}
