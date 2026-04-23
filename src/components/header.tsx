'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/src/components/ui/button';
import { clearExtensionJwt } from '@/src/lib/extension-bridge';
import { supabase, useAuth } from '@/src/lib/supabase';

export function Header() {
  const router = useRouter();
  const { user } = useAuth();

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    clearExtensionJwt();
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 font-bold text-white">
            F
          </div>
          <span className="text-xl font-bold tracking-tight">AI English Study</span>
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/setup" className="text-sm font-medium text-slate-500 hover:text-slate-900">
            Install
          </Link>
          <Link href="/wordbook" className="text-sm font-medium text-slate-500 hover:text-slate-900">
            Wordbook
          </Link>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">{user.email}</span>
              <Button variant="outline" size="sm" onClick={() => void handleLogout()}>
                Logout
              </Button>
            </div>
          ) : (
            <Link href="/auth">
              <Button size="sm">Login</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
