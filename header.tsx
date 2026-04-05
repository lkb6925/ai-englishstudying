import { Link, useLocation } from 'react-router-dom';
import { useAuth, supabase } from '@/src/lib/supabase';
import { BookOpen, LogOut, User } from 'lucide-react';

export function Header() {
  const { user } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(10,10,15,0.8)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)'
    }}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 font-black text-lg" style={{ color: 'var(--text-primary)' }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'
          }}>
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <span>Flow Reader</span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-2">
          <Link
            to="/wordbook"
            className="rounded-xl px-4 py-2 text-sm font-medium transition-all hover:scale-[1.02]"
            style={{
              color: location.pathname === '/wordbook' ? 'var(--accent)' : 'var(--text-muted)',
              background: location.pathname === '/wordbook' ? 'rgba(99,102,241,0.12)' : 'transparent'
            }}
          >
            단어장
          </Link>

          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <User className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                  {user.email?.split('@')[0]}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all hover:scale-[1.02]"
                style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="rounded-xl px-4 py-2 text-sm font-bold transition-all hover:scale-[1.02]"
              style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent)', border: '1px solid rgba(99,102,241,0.3)' }}
            >
              로그인
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
