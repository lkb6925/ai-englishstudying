import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';
import { BookOpen, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

export function AuthForm() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError('Supabase가 설정되지 않았습니다. .env 파일을 확인하세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

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
        navigate('/wordbook');
      } else {
        const { error: signupError } = await supabase.auth.signUp({ email, password });
        if (signupError) throw signupError;
        setSuccess('가입 완료! 이메일을 확인해 인증 링크를 클릭하세요.');
      }
    } catch (err: any) {
      // Translate common errors to Korean
      const msg = err.message || '';
      if (msg.includes('Invalid login credentials')) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else if (msg.includes('Email not confirmed')) {
        setError('이메일 인증이 필요합니다. 메일함을 확인해주세요.');
      } else if (msg.includes('User already registered')) {
        setError('이미 가입된 이메일입니다. 로그인해주세요.');
      } else if (msg.includes('Password should be at least')) {
        setError('비밀번호는 최소 6자 이상이어야 합니다.');
      } else {
        setError(msg || '오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-deep)' }}>
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0" style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 60%)'
      }} />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'
            }}>
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Flow Reader</span>
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-8" style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)'
        }}>
          <div className="mb-8">
            <h2 className="mb-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {mode === 'login' ? '다시 오셨군요 👋' : '시작해볼까요?'}
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {mode === 'login' ? '로그인하고 단어장을 확인하세요' : '무료로 가입하고 영어 읽기를 시작하세요'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                이메일
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl py-3 pl-10 pr-4 text-sm outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                비밀번호
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  placeholder="최소 6자"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl py-3 pl-10 pr-4 text-sm outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>
            </div>

            {/* Error/Success */}
            {error && (
              <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5'
              }}>
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{
                background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7'
              }}>
                {success}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', boxShadow: '0 0 30px rgba(99,102,241,0.3)' }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? '로그인' : '회원가입'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle mode */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setSuccess(null); }}
              className="text-sm transition-all hover:opacity-80"
              style={{ color: 'var(--accent)' }}
            >
              {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
