import { Link } from 'react-router-dom';
import { useAuth, supabase } from '@/src/lib/supabase';
import { Button } from '@/src/components/ui/button';

export function Header() {
  const { user } = useAuth();

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">F</div>
          <span className="text-xl font-bold tracking-tight">Flow Reader</span>
        </Link>
        
        <nav className="flex items-center gap-4">
          <Link to="/wordbook" className="text-sm font-medium text-muted-foreground hover:text-foreground">Wordbook</Link>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
            </div>
          ) : (
            <Link to="/auth">
              <Button size="sm">Login</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
