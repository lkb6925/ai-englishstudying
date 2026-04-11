'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/src/components/ui/button';
import { syncExtensionJwt } from '@/src/lib/extension-bridge';
import { supabase } from '@/src/lib/supabase';

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }

    setLoading(true);
    setError(null);

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
      } else {
        const { error: signupError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signupError) {
          throw signupError;
        }
      }

      router.push('/');
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : '인증에 실패했습니다.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          {mode === 'login' ? 'Welcome back' : 'Create an account'}
        </h1>
        <p className="text-sm text-slate-500">
          {mode === 'login'
            ? 'Enter your credentials to access your wordbook'
            : 'Sign up to start tracking your reading'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-offset-background transition focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-offset-background transition focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? 'Processing...' : mode === 'login' ? 'Login' : 'Sign Up'}
        </Button>
      </form>

      <div className="text-center">
        <button
          type="button"
          className="text-sm text-slate-500 hover:underline"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        >
          {mode === 'login'
            ? "Don't have an account? Sign up"
            : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  );
}
