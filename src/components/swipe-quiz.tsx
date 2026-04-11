'use client';

import React from 'react';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, RotateCw, X } from 'lucide-react';
import { rankColorStyles, rankOrderValue } from '@/src/lib/rank';
import { supabase } from '@/src/lib/supabase';
import type { Rank, WordbookEntry } from '@/src/lib/types';

type SwipeQuizProps = {
  words: WordbookEntry[];
  onClose: () => void;
};

type ReviewAction = 'know' | 'dont_know';

const swipeThreshold = 100;

export function SwipeQuiz({ words, onClose }: SwipeQuizProps) {
  const sortedWords = useMemo(
    () => [...words].sort((left, right) => rankOrderValue(left.rank) - rankOrderValue(right.rank)),
    [words],
  );

  const [index, setIndex] = useState(0);
  const [isBackVisible, setIsBackVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const current = sortedWords[index] ?? null;
  const currentMeanings = current?.meaning_snapshot?.length
    ? current.meaning_snapshot
    : ['저장된 의미가 아직 없습니다. 다시 조회해 최신 뜻을 저장해 보세요.'];

  const submitReview = async (action: ReviewAction) => {
    if (!current || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const session = supabase
        ? await supabase.auth.getSession()
        : { data: { session: null } };
      const accessToken = session.data.session?.access_token;

      const response = await fetch('/api/quiz-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ entryId: current.id, action }),
      });

      if (!response.ok) {
        throw new Error(`Review request failed with status ${response.status}`);
      }

      setIsBackVisible(false);
      setIndex((value) => value + 1);
    } catch (error) {
      console.error('Review submission failed', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!current) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Check className="h-8 w-8" />
        </div>
        <h2 className="mb-2 text-2xl font-bold">리뷰 완료!</h2>
        <p className="mb-6 text-slate-600">오늘의 모든 단어를 확인했습니다. 내일 다시 만나요!</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-slate-900 px-8 py-3 font-bold text-white transition-all hover:bg-slate-800"
        >
          돌아가기
        </button>
      </div>
    );
  }

  const rankBadgeClass = rankColorStyles[current.rank as Rank];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold">Swipe Review</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-400">
            {index + 1} / {sortedWords.length}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${rankBadgeClass}`}>
            {current.rank}
          </span>
        </div>
      </div>

      <div className="relative h-[400px] perspective-1000">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            onDragEnd={(_event, info) => {
              if (info.offset.x >= swipeThreshold) {
                void submitReview('know');
              } else if (info.offset.x <= -swipeThreshold) {
                void submitReview('dont_know');
              }
            }}
          >
            <div
              className={`relative h-full w-full rounded-2xl border-2 border-slate-100 bg-white p-8 shadow-xl transition-all duration-500 preserve-3d ${
                isBackVisible ? 'rotate-y-180' : ''
              }`}
              onClick={() => setIsBackVisible(!isBackVisible)}
            >
              <div className="absolute inset-0 flex flex-col p-8 backface-hidden">
                <div className="flex-1">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Word</span>
                  <h3 className="mt-4 text-4xl font-black text-slate-900">{current.term}</h3>
                  <div className="mt-8">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Context</span>
                    <p className="mt-2 text-lg leading-relaxed text-slate-600 italic">
                      &quot;{current.context_sample}&quot;
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 text-slate-400">
                  <RotateCw className="h-4 w-4" />
                  <span className="text-sm font-medium">Tap to flip</span>
                </div>
              </div>

              <div className="absolute inset-0 flex flex-col p-8 rotate-y-180 backface-hidden">
                <div className="flex-1">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Meaning</span>
                  <div className="mt-4 space-y-4">
                    <p className="text-2xl font-bold text-slate-900">문맥 속 의미</p>
                    <ul className="space-y-3">
                      {currentMeanings.map((meaning) => (
                        <li
                          key={meaning}
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-slate-700"
                        >
                          {meaning}
                        </li>
                      ))}
                    </ul>
                    <p className="text-slate-600">이 단어를 알고 계신가요?</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 text-slate-400">
                  <RotateCw className="h-4 w-4" />
                  <span className="text-sm font-medium">Tap to flip back</span>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void submitReview('dont_know')}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-red-100 bg-red-50 py-4 font-bold text-red-600 transition-all hover:bg-red-100 disabled:opacity-50"
        >
          <X className="h-5 w-5" />
          모르겠어요
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void submitReview('know')}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-emerald-100 bg-emerald-50 py-4 font-bold text-emerald-600 transition-all hover:bg-emerald-100 disabled:opacity-50"
        >
          <Check className="h-5 w-5" />
          알고 있어요
        </button>
      </div>
    </div>
  );
}
