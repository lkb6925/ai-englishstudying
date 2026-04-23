import Link from 'next/link';
import React from 'react';
import { BarChart3, BookOpen, MousePointer2, Sparkles, Zap } from 'lucide-react';
import { Header } from '@/src/components/header';
import { Button } from '@/src/components/ui/button';

const stats = [
  { label: 'Instant lookup', value: '< 1 sec' },
  { label: 'Saved words', value: 'Auto' },
  { label: 'Review mode', value: 'Swipe' },
];

const highlights = [
  {
    icon: MousePointer2,
    title: 'Alt + Hover',
    description: '마우스를 올리는 것만으로 즉시 단어의 뜻을 확인하세요.',
  },
  {
    icon: Zap,
    title: 'AI 문맥 해석',
    description: '단순 사전이 아니라 문장 속 실제 의미를 빠르게 파악합니다.',
  },
  {
    icon: BarChart3,
    title: '자동 랭킹 시스템',
    description: '반복 조회된 단어를 위험도 기준으로 쌓아 복습 우선순위를 만듭니다.',
  },
  {
    icon: BookOpen,
    title: '개인화 단어장',
    description: '읽는 흐름을 끊지 않고, 사용자의 단어 학습 기록을 자동으로 축적합니다.',
  },
];

export function HomePage() {
  return (
    <div className="min-h-screen bg-transparent">
      <Header />

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:pt-16">
        <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4" />
              AI English Study
            </span>

            <div className="space-y-5">
              <h1 className="max-w-3xl text-5xl font-black tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
                영어를 읽을 때 <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-600 bg-clip-text text-transparent">멈추지 마세요</span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                브라우저 확장앱으로 모르는 단어를 즉시 조회하고, 조회된 모든 데이터는 자동으로
                당신만의 단어장과 복습 큐로 이어집니다.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/setup">
                <Button size="lg" className="rounded-full px-8">
                  확장앱 설치하기
                </Button>
              </Link>
              <Link href="/wordbook">
                <Button size="lg" variant="outline" className="rounded-full border-slate-300 px-8 bg-white/80 backdrop-blur">
                  내 단어장 보기
                </Button>
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {stats.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-8 top-6 h-44 w-44 rounded-full bg-indigo-400/20 blur-3xl" />
            <div className="absolute -right-6 bottom-0 h-52 w-52 rounded-full bg-sky-400/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-slate-950 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
              <div className="rounded-[1.6rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-6 text-white">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span className="rounded-full border border-white/10 px-3 py-1">Live Preview</span>
                  <span>AI lookup overlay</span>
                </div>

                <div className="mt-6 rounded-[1.4rem] border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Recently seen</p>
                      <p className="mt-2 text-2xl font-black">focus</p>
                    </div>
                    <div className="rounded-2xl bg-indigo-500/20 px-4 py-2 text-right">
                      <p className="text-xs text-indigo-200">Risk</p>
                      <p className="text-lg font-black text-white">Orange</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 text-sm text-slate-200">
                    <div className="rounded-2xl bg-white/5 px-4 py-3">• 문맥상 집중하다 / 초점을 맞추다</div>
                    <div className="rounded-2xl bg-white/5 px-4 py-3">• 중요한 한 가지에 시선을 모으는 느낌</div>
                    <div className="rounded-2xl bg-white/5 px-4 py-3">• 단어장에 자동 저장됨</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {['Alt + Hover', 'Auto save', 'Swipe review'].map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-center text-sm font-semibold text-slate-700 shadow-sm">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-20 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {highlights.map((item) => (
            <FeatureCard
              key={item.title}
              icon={<item.icon className="h-6 w-6 text-indigo-600" />}
              title={item.title}
              description={item.description}
            />
          ))}
        </section>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 ring-1 ring-indigo-100">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-bold text-slate-950">{title}</h3>
      <p className="text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
