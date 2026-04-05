import React from 'react';
import { Header } from '@/src/components/header';
import { Link } from 'react-router-dom';
import { MousePointer2, BookOpen, BarChart3, Zap, ArrowRight, Chrome } from 'lucide-react';

export function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>
      <Header />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-6 pb-24 pt-28 text-center">
          {/* Background glow */}
          <div className="pointer-events-none absolute inset-0">
            <div style={{
              position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
              width: '800px', height: '600px', borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 70%)'
            }} />
          </div>

          <div className="relative mx-auto max-w-4xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm" style={{
              borderColor: 'rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.08)',
              color: 'var(--accent)'
            }}>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Chrome 확장앱 · 무료로 시작
            </div>

            <h1 className="mb-6 text-5xl font-black leading-tight tracking-tight sm:text-7xl" style={{ fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif" }}>
              영어 읽기를{' '}
              <span style={{ background: 'linear-gradient(135deg, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                멈추지 마세요
              </span>
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-xl leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Alt + Hover 하나로 모르는 단어를 즉시 확인하고,<br />
              조회한 단어는 <strong style={{ color: 'var(--text-primary)' }}>자동으로 나만의 단어장</strong>이 됩니다.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="https://chrome.google.com/webstore"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-2xl px-8 py-4 text-base font-bold transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', boxShadow: '0 0 40px rgba(99,102,241,0.4)' }}
              >
                <Chrome className="h-5 w-5" />
                Chrome에 추가하기
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
              <Link
                to="/wordbook"
                className="flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-bold transition-all hover:scale-105"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-primary)' }}
              >
                <BookOpen className="h-5 w-5" />
                내 단어장 보기
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-black" style={{ fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif" }}>어떻게 작동하나요?</h2>
            <p style={{ color: 'var(--text-muted)' }}>3단계로 끝나는 초간단 사용법</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              { step: '01', icon: <Chrome className="h-7 w-7" />, title: '확장앱 설치', desc: 'Chrome 웹스토어에서 Flow Reader를 설치하세요. 1분이면 충분합니다.' },
              { step: '02', icon: <MousePointer2 className="h-7 w-7" />, title: 'Alt + 마우스 올리기', desc: '영어 페이지에서 Alt 키를 누른 채 모르는 단어 위에 마우스를 올리세요.' },
              { step: '03', icon: <BookOpen className="h-7 w-7" />, title: '자동 단어장 등록', desc: '2번 이상 조회한 단어는 자동으로 단어장에 추가되어 복습할 수 있습니다.' },
            ].map((item, i) => (
              <div key={i} className="relative rounded-3xl p-8 transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="mb-6 flex items-start justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                    {item.icon}
                  </div>
                  <span className="text-6xl font-black" style={{ color: 'rgba(255,255,255,0.04)', lineHeight: 1 }}>{item.step}</span>
                </div>
                <h3 className="mb-3 text-xl font-bold">{item.title}</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <Zap className="h-5 w-5" />, title: 'AI 문맥 해석', desc: '문장 속 정확한 뜻을 한국어로', color: '#f59e0b' },
              { icon: <BarChart3 className="h-5 w-5" />, title: '위험도 랭킹', desc: '자주 찾을수록 red → 집중 관리', color: '#ef4444' },
              { icon: <BookOpen className="h-5 w-5" />, title: '자동 단어장', desc: '2회 조회 시 자동 등록', color: '#10b981' },
              { icon: <MousePointer2 className="h-5 w-5" />, title: 'Swipe 복습', desc: '카드 스와이프로 빠른 복습', color: '#6366f1' },
            ].map((f, i) => (
              <div key={i} className="rounded-2xl p-6 transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: `${f.color}20`, color: f.color }}>
                  {f.icon}
                </div>
                <h3 className="mb-1 font-bold">{f.title}</h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-3xl px-6 pb-28 text-center">
          <div className="rounded-3xl p-12" style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.2) 100%)',
            border: '1px solid rgba(99,102,241,0.3)'
          }}>
            <h2 className="mb-4 text-4xl font-black" style={{ fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif" }}>
              지금 바로 시작하세요
            </h2>
            <p className="mb-8 text-lg" style={{ color: 'var(--text-muted)' }}>
              무료로 설치하고 영어 읽기를 완전히 바꿔보세요.
            </p>
            <a
              href="https://chrome.google.com/webstore"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 rounded-2xl px-8 py-4 text-base font-bold transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', boxShadow: '0 0 40px rgba(99,102,241,0.4)' }}
            >
              <Chrome className="h-5 w-5" />
              무료로 시작하기
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
