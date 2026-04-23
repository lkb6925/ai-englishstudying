'use client';

import React from 'react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Header } from '@/src/components/header';
import { Button } from '@/src/components/ui/button';
import { WordbookDashboard } from '@/src/components/wordbook-dashboard';
import type { PlanTier, WordbookEntry } from '@/src/lib/types';
import { supabase, useAuth } from '@/src/lib/supabase';

export function WordbookPage() {
  const { user, loading } = useAuth();
  const [words, setWords] = useState<WordbookEntry[]>([]);
  const [planTier, setPlanTier] = useState<PlanTier>('free');
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      if (!user || !supabase) {
        if (!cancelled) {
          setIsFetching(false);
          setWords([]);
          setPlanTier('free');
        }
        return;
      }

      const [profileRes, wordsRes] = await Promise.all([
        supabase.from('profiles').select('plan_tier').eq('id', user.id).maybeSingle(),
        supabase
          .from('wordbook_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('last_seen_at', { ascending: false }),
      ]);

      if (cancelled) {
        return;
      }

      if (profileRes.data?.plan_tier) {
        setPlanTier(profileRes.data.plan_tier as PlanTier);
      }

      if (wordsRes.data) {
        setWords(wordsRes.data as WordbookEntry[]);
      }

      setIsFetching(false);
    }

    setIsFetching(true);
    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || isFetching) {
    return (
      <div className="min-h-screen bg-transparent">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-10">
          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-4 w-28 rounded-full bg-slate-200" />
                <div className="mt-3 h-8 w-56 rounded-full bg-slate-200" />
              </div>
              <div className="h-10 w-32 rounded-full bg-slate-200" />
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-28 animate-pulse rounded-3xl bg-slate-100" />
              ))}
            </div>
            <div className="mt-8 grid gap-4 xl:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="h-60 animate-pulse rounded-3xl bg-slate-100" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-transparent">
        <Header />
        <main className="mx-auto flex max-w-4xl px-4 py-20">
          <section className="w-full rounded-[2rem] border border-white/70 bg-white/88 p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
            <span className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-indigo-700">
              Wordbook
            </span>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">Wordbook</h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
              로그인하시면 당신이 조회한 단어들을 확인할 수 있습니다. 저장된 단어는 위험 랭크와 함께 쌓여
              복습 우선순위를 자동으로 만듭니다.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/auth">
                <Button size="lg" className="rounded-full px-8">
                  Login to Start
                </Button>
              </Link>
              <Link href="/setup">
                <Button size="lg" variant="outline" className="rounded-full border-slate-300 px-8 bg-white/80">
                  설치 가이드 보기
                </Button>
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <WordbookDashboard words={words} planTier={planTier} />
      </main>
    </div>
  );
}
