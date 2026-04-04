import { useEffect, useState } from 'react';
import { Header } from '@/src/components/header';
import { WordbookDashboard } from '@/src/components/wordbook-dashboard';
import { useAuth, supabase } from '@/src/lib/supabase';
import type { WordbookEntry, PlanTier } from '@/src/lib/types';

export function WordbookPage() {
  const { user, loading } = useAuth();
  const [words, setWords] = useState<WordbookEntry[]>([]);
  const [planTier, setPlanTier] = useState<PlanTier>('free');
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!user || !supabase) {
      setIsFetching(false);
      return;
    }

    const fetchData = async () => {
      const [profileRes, wordsRes] = await Promise.all([
        supabase.from('profiles').select('plan_tier').eq('id', user.id).maybeSingle(),
        supabase.from('wordbook_entries').select('*').eq('user_id', user.id).order('last_seen_at', { ascending: false })
      ]);

      if (profileRes.data) {
        setPlanTier(profileRes.data.plan_tier as PlanTier);
      }
      if (wordsRes.data) {
        setWords(wordsRes.data as WordbookEntry[]);
      }
      setIsFetching(false);
    };

    fetchData();
  }, [user]);

  if (loading || isFetching) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="flex h-[calc(100vh-64px)] items-center justify-center">
          <p className="text-slate-500">Loading your wordbook...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="mb-4 text-3xl font-bold">Wordbook</h1>
          <p className="mb-8 text-slate-600">로그인하시면 당신이 조회한 단어들을 확인할 수 있습니다.</p>
          <Link to="/auth">
            <Button size="lg">Login to Start</Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <WordbookDashboard words={words} planTier={planTier} />
      </main>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Button } from '@/src/components/ui/button';
