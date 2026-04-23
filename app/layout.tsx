import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'AI English Study',
    template: '%s · AI English Study',
  },
  description: 'AI 기반 영어 단어 조회와 자동 단어장, 복습까지 이어지는 학습 앱',
  applicationName: 'AI English Study',
  keywords: ['English learning', 'AI vocabulary', 'wordbook', 'browser extension'],
};

export const viewport: Viewport = {
  themeColor: '#020617',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-950 text-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
