import React from 'react';
import { render, screen } from '@testing-library/react';
import { HomePage } from '@/src/views/home';
import { WordbookPage } from '@/src/views/wordbook';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
}));

vi.mock('@/src/lib/supabase', () => ({
  supabase: null,
  useAuth: () => ({
    user: null,
    loading: false,
  }),
}));

describe('page rendering', () => {
  it('renders the home page hero and CTAs', () => {
    render(<HomePage />);

    expect(screen.getByText(/영어를 읽을 때/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /확장앱 설치하기/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /내 단어장 보기/i })).toBeInTheDocument();
  });

  it('renders the unauthenticated wordbook gate', () => {
    render(<WordbookPage />);

    expect(screen.getByRole('heading', { name: 'Wordbook' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Login to Start/i })).toBeInTheDocument();
  });
});
