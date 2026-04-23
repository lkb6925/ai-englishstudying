'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, LockKeyhole, Mail, Sparkles } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { syncExtensionJwt } from '@/src/lib/extension-bridge';
import { supabase } from '@/src/lib/supabase';

const formCopy = {
  login: {
    title: 'Welcome back',
    subtitle: 'Enter your credentials to access your wordbook and extension sync.',
    button: 'Login',
  },
  signup: {
    title: 'Create an account',
    subtitle: 'Sign up to start tracking your reading and building a premium wordbook.',
    button: 'Sign Up',
  },
} as const;

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'login') {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (loginError) {
          throw loginError;
        }

        if (data.session?.access_token) {
          syncExtensionJwt(data.session.access_token);
        }
        router.push('/wordbook');
        router.refresh();
        return;
      }

      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signupError) {
        throw signupError;
      }

      if (data.session?.access_token) {
        syncExtensionJwt(data.session.access_token);
        router.push('/wordbook');
        router.refresh();
        return;
      }

      setSuccess('가입 완료. 이메일 인증을 마치면 로그인할 수 있습니다.');
      setMode('login');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '인증에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const copy = formCopy[mode];

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_1.05fr]">
      <aside className="rounded-[2rem] border border-white/70 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.2)]">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-indigo-100">
          <Sparkles className="h-3.5 w-3.5" />
          Secure sign in
        </span>
        <h1 className="mt-5 text-4xl font-black tracking-tight">AI English Study</h1>
        <p className="mt-4 max-w-md text-base leading-7 text-slate-200">
          로그인하면 웹 확장앱, 단어장, 복습 흐름이 하나의 세션으로 이어집니다. 읽던 흐름을 끊지 않고
          필요한 순간에만 잠깐 멈추세요.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <Benefit icon={<BookOpen className="h-5 w-5" />} title="Auto save" description="조회한 단어가 자동으로 누적됩니다." />
          <Benefit icon={<LockKeyhole className="h-5 w-5" />} title="Session sync" description="확장앱과 웹이 같은 JWT를 공유합니다." />
          <Benefit icon={<Sparkles className="h-5 w-5" />} title="Premium ready" description="복습 큐와 단어장 분석까지 이어집니다." />
        </div>
      </aside>

      <div className="rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.1)] backdrop-blur">
        <div className="space-y-2 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-indigo-600">{mode === 'login' ? 'Login' : 'Create account'}</p>
          <h2 className="text-3xl font-black tracking-tight text-slate-950">{copy.title}</h2>
          <p className="text-sm leading-6 text-slate-600">{copy.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Field label="Email" htmlFor="email" icon={<Mail className="h-4 w-4" />}>
            <input
              id="email"
              type="email"
              className="flex h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>

          <Field label="Password" htmlFor="password" icon={<LockKeyhole className="h-4 w-4" />}>
            <input
              id="password"
              type="password"
              className="flex h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </Field>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {success}
            </div>
          ) : null}

          <Button className="h-12 w-full rounded-2xl text-base font-semibold" type="submit" disabled={loading}>
            {loading ? 'Processing...' : copy.button}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-3 text-sm text-slate-500">
          <span>{mode === 'login' ? '처음인가요?' : '이미 계정이 있나요?'}</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 font-semibold text-indigo-600 transition hover:text-indigo-700"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError(null);
              setSuccess(null);
            }}
          >
            {mode === 'login' ? 'Sign up' : 'Login'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  icon,
  children,
}: {
  label: string;
  htmlFor: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2" htmlFor={htmlFor}>
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          {icon}
        </span>
        {label}
      </span>
      {children}
    </label>
  );
}

function Benefit({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
        {icon}
      </div>
      <h3 className="mt-4 text-sm font-bold text-white">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-200">{description}</p>
    </div>
  );
}
