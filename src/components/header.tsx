'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, Compass, Settings2, Sparkles } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { clearExtensionJwt } from '@/src/lib/extension-bridge';
import { supabase, useAuth } from '@/src/lib/supabase';

const navItems = [
  { href: '/setup', label: 'Install', icon: Settings2 },
  { href: '/wordbook', label: 'Wordbook', icon: BookOpen },
];

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    clearExtensionJwt();
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/40 bg-white/75 backdrop-blur-xl shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="group flex items-center gap-3 rounded-full pr-3 transition hover:bg-slate-50">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/20 transition group-hover:scale-105">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-500">AI</div>
            <span className="block text-base font-black tracking-tight text-slate-900 sm:text-lg">
              English Study
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/80 p-1 shadow-sm md:flex">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/setup"
            className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:text-slate-900 lg:inline-flex"
          >
            <Compass className="h-4 w-4" />
            Quick start
          </Link>
          {user ? (
            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-3 py-2 shadow-sm">
              <span className="max-w-[10rem] truncate text-sm font-medium text-slate-600">{user.email}</span>
              <Button variant="outline" size="sm" onClick={() => void handleLogout()}>
                Logout
              </Button>
            </div>
          ) : (
            <Link href="/auth">
              <Button size="sm" className="gap-2">
                Login
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
