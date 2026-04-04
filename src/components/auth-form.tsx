import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/src/components/ui/button';
import { supabase } from '@/src/lib/supabase';

export function AuthForm() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;
        
        // Post message for extension bridge
        if (data.session?.access_token) {
          window.postMessage({
            source: 'tap-and-know-auth',
            type: 'SUPABASE_JWT',
            token: data.session.access_token
          }, window.location.origin);
        }
      } else {
        const { error: signupError } = await supabase.auth.signUp({ email, password });
        if (signupError) throw signupError;
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-6 rounded-2xl border border-border bg-white p-8 shadow-lg">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          {mode === 'login' ? 'Welcome back' : 'Create an account'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {mode === 'login' ? 'Enter your credentials to access your wordbook' : 'Sign up to start tracking your reading'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? 'Processing...' : mode === 'login' ? 'Login' : 'Sign Up'}
        </Button>
      </form>

      <div className="text-center">
        <button
          type="button"
          className="text-sm text-muted-foreground hover:underline"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  );
}
