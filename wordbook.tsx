import { useEffect, useState } from 'react';
import { Header } from '@/src/components/header';
import { WordbookDashboard } from '@/src/components/wordbook-dashboard';
import { useAuth, supabase } from '@/src/lib/supabase';
import type { WordbookEntry, PlanTier } from '@/src/lib/types';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight, Loader2 } from 'lucide-react';

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
      try {
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
      } catch (e) {
        console.error('Failed to fetch wordbook data:', e);
      } finally {
        setIsFetching(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading || isFetching) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg-deep)' }}>
        <Header />
        <div className="flex h-[calc(100vh-64px)] items-center justify-center">
          <div className="flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>단어장 불러오는 중...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg-deep)' }}>
        <Header />
        <main className="mx-auto max-w-md px-6 py-32 text-center">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl" style={{
            background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)'
          }}>
            <BookOpen className="h-10 w-10" style={{ color: 'var(--accent)' }} />
          </div>
          <h1 className="mb-4 text-3xl font-black" style={{ color: 'var(--text-primary)' }}>내 단어장</h1>
          <p className="mb-8 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            로그인하면 당신이 조회한 모든 단어를<br />한 곳에서 관리할 수 있습니다.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 font-bold transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', boxShadow: '0 0 30px rgba(99,102,241,0.3)' }}
          >
            로그인하기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-deep)' }}>
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <WordbookDashboard words={words} planTier={planTier} />
      </main>
    </div>
  );
}
