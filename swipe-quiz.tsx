'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { rankOrderValue } from './src/lib/rank';
import type { Rank, WordbookEntry } from './src/lib/types';
import { Check, X, RotateCw, Trophy } from 'lucide-react';

type SwipeQuizProps = {
  words: WordbookEntry[];
  onClose: () => void;
};

type ReviewAction = 'know' | 'dont_know';

const rankMeta: Record<Rank, { label: string; color: string }> = {
  red:    { label: '위험', color: '#ef4444' },
  orange: { label: '주의', color: '#f97316' },
  yellow: { label: '관심', color: '#f59e0b' },
  green:  { label: '안정', color: '#10b981' },
  blue:   { label: '신규', color: '#3b82f6' },
  master: { label: '마스터', color: '#8b5cf6' },
};

export function SwipeQuiz({ words, onClose }: SwipeQuizProps) {
  const sortedWords = useMemo(
    () => [...words].sort((a, b) => rankOrderValue(a.rank) - rankOrderValue(b.rank)),
    [words]
  );

  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const current = sortedWords[index] ?? null;

  const submitReview = async (action: ReviewAction) => {
    if (!current || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await fetch('/api/quiz-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: current.id, action }),
      });
      setIsFlipped(false);
      setTimeout(() => setIndex(v => v + 1), 100);
    } catch (err) {
      console.error('Review failed', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!current) {
    return (
      <div className="rounded-3xl p-12 text-center" style={{
        background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)'
      }}>
        <div className="mx-auto mb-4 inline-flex h-20 w-20 items-center justify-center rounded-3xl" style={{ background: 'rgba(16,185,129,0.15)' }}>
          <Trophy className="h-10 w-10" style={{ color: '#10b981' }} />
        </div>
        <h2 className="mb-2 text-2xl font-black" style={{ color: 'var(--text-primary)' }}>복습 완료! 🎉</h2>
        <p className="mb-8" style={{ color: 'var(--text-muted)' }}>
          오늘의 모든 단어를 확인했습니다. 내일 다시 만나요!
        </p>
        <button
          onClick={onClose}
          className="rounded-2xl px-8 py-3 font-bold transition-all hover:scale-[1.02]"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          단어장으로 돌아가기
        </button>
      </div>
    );
  }

  const rankInfo = rankMeta[current.rank as Rank];

  return (
    <div className="rounded-3xl p-6" style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)'
    }}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          {index + 1} / {sortedWords.length}
        </div>
        <span className="rounded-full px-3 py-1 text-xs font-bold"
          style={{ background: `${rankInfo.color}20`, color: rankInfo.color, border: `1px solid ${rankInfo.color}40` }}>
          {rankInfo.label}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-6 h-1 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{
          width: `${(index / sortedWords.length) * 100}%`,
          background: 'linear-gradient(90deg, #6366f1, #8b5cf6)'
        }} />
      </div>

      {/* Card */}
      <div className="relative mb-6 h-[300px]" style={{ perspective: '1000px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            onDragEnd={(_, info) => {
              if (info.offset.x > 100) void submitReview('know');
              else if (info.offset.x < -100) void submitReview('dont_know');
            }}
          >
            <div
              className="relative h-full w-full rounded-2xl p-8 cursor-pointer transition-all duration-500"
              onClick={() => setIsFlipped(!isFlipped)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transition: 'transform 0.5s'
              }}
            >
              {/* Front */}
              <div className="absolute inset-0 flex flex-col justify-between p-8" style={{ backfaceVisibility: 'hidden' }}>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>단어</div>
                  <div className="text-5xl font-black" style={{ color: 'var(--text-primary)' }}>{current.term}</div>
                  <div className="mt-6">
                    <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>문맥</div>
                    <p className="text-sm leading-relaxed italic" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      "{current.context_sample}"
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <RotateCw className="h-4 w-4" />
                  <span className="text-xs">탭하면 뒤집기</span>
                </div>
              </div>

              {/* Back */}
              <div className="absolute inset-0 flex flex-col justify-between p-8" style={{
                backfaceVisibility: 'hidden', transform: 'rotateY(180deg)'
              }}>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>알고 있나요?</div>
                  <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    이 단어의 뜻을 기억하시나요?
                  </p>
                  <p className="mt-3 text-base" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    아래 버튼을 눌러 복습 결과를 기록하세요.
                  </p>
                </div>
                <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <RotateCw className="h-4 w-4" />
                  <span className="text-xs">탭하면 뒤집기</span>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Swipe hint */}
      <p className="mb-4 text-center text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
        ← 스와이프: 모름 &nbsp;|&nbsp; 알아요: 스와이프 →
      </p>

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => void submitReview('dont_know')}
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 rounded-2xl py-4 font-bold transition-all hover:scale-[1.02] disabled:opacity-50"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}
        >
          <X className="h-5 w-5" />
          모르겠어요
        </button>
        <button
          onClick={() => void submitReview('know')}
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 rounded-2xl py-4 font-bold transition-all hover:scale-[1.02] disabled:opacity-50"
          style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7' }}
        >
          <Check className="h-5 w-5" />
          알고 있어요
        </button>
      </div>
    </div>
  );
}
