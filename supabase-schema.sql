-- ============================================================
-- Flow Reader - Supabase Database Schema
-- Supabase SQL Editor에 붙여넣고 실행하세요.
-- ============================================================

-- 1. profiles 테이블
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'premium')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 신규 유저 가입 시 자동으로 profile 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. lookup_events 테이블 (개별 조회 기록)
CREATE TABLE IF NOT EXISTS public.lookup_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  term TEXT NOT NULL,
  normalized_term TEXT NOT NULL,
  context TEXT,
  source_domain TEXT,
  source_path_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lookup_events_user_id_idx ON public.lookup_events(user_id);
CREATE INDEX IF NOT EXISTS lookup_events_normalized_term_idx ON public.lookup_events(normalized_term);

-- 3. wordbook_entries 테이블 (단어장)
CREATE TABLE IF NOT EXISTS public.wordbook_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  term TEXT NOT NULL,
  normalized_term TEXT NOT NULL,
  context_sample TEXT,
  meaning_snapshot TEXT[],
  total_lookup_count INTEGER NOT NULL DEFAULT 1,
  rank TEXT NOT NULL DEFAULT 'blue' CHECK (rank IN ('blue', 'green', 'yellow', 'orange', 'red', 'master')),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, normalized_term)
);

ALTER TABLE public.wordbook_entries
  ADD COLUMN IF NOT EXISTS meaning_snapshot TEXT[];

CREATE INDEX IF NOT EXISTS wordbook_entries_user_id_idx ON public.wordbook_entries(user_id);
CREATE INDEX IF NOT EXISTS wordbook_entries_rank_idx ON public.wordbook_entries(rank);

-- ============================================================
-- Row Level Security (RLS) 설정
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lookup_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wordbook_entries ENABLE ROW LEVEL SECURITY;

-- profiles: 본인 데이터만
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- lookup_events: 본인 데이터만
CREATE POLICY "Users can insert own lookup events" ON public.lookup_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own lookup events" ON public.lookup_events
  FOR SELECT USING (auth.uid() = user_id);

-- wordbook_entries: 본인 데이터만
CREATE POLICY "Users can manage own wordbook" ON public.wordbook_entries
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 완료! 위 SQL을 실행하면 모든 테이블이 생성됩니다.
-- ============================================================
