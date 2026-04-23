import Link from 'next/link';
import React from 'react';
import { CheckCircle2, Download, Globe, KeyRound, ShieldCheck, Sparkles } from 'lucide-react';
import { Header } from '@/src/components/header';
import { Button } from '@/src/components/ui/button';

const installSteps = [
  {
    title: '최신 확장앱 빌드 받기',
    description: '대시보드에서 dist-extension/ 폴더 또는 패키지된 ZIP 파일을 확보합니다.',
  },
  {
    title: 'Chrome 개발자 모드 활성화',
    description: 'chrome://extensions 에서 개발자 모드를 켜고 압축 해제된 확장 프로그램을 허용합니다.',
  },
  {
    title: '확장앱 연결',
    description: '압축 해제된 확장 프로그램 로드로 dist-extension/ 폴더를 선택합니다.',
  },
  {
    title: 'API 주소와 로그인 확인',
    description: '옵션에서 서버 주소를 확인한 뒤 영어 페이지에서 지정 키로 단어를 가리킵니다.',
  },
];

const checklist = [
  'AI English Study 서버가 실행 중인지 확인',
  'Supabase 인증 정보가 설정되어 있는지 확인',
  '확장앱이 대상 사이트 권한을 가지고 있는지 확인',
];

export function SetupPage() {
  return (
    <div className="min-h-screen bg-transparent">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-indigo-700">
              <Download className="h-3.5 w-3.5" />
              Install Guide
            </span>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              AI English Study 설치 가이드
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              첫 출시 버전은 Chrome 개발자 모드 설치를 기준으로 제공합니다. 아래 순서대로 설치하면
              바로 단어 조회와 단어장 저장을 사용할 수 있습니다.
            </p>

            <div className="mt-8 space-y-4">
              {installSteps.map((step, index) => (
                <div
                  key={step.title}
                  className="flex items-start gap-4 rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-sm"
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white shadow-lg shadow-slate-950/15">
                    {index + 1}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-950">{step.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/wordbook">
                <Button size="lg" className="rounded-full px-8">
                  내 단어장 열기
                </Button>
              </Link>
              <Link href="/auth">
                <Button size="lg" variant="outline" className="rounded-full border-slate-300 px-8 bg-white/80">
                  로그인하고 시작하기
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/70 bg-gradient-to-br from-slate-950 to-indigo-950 p-7 text-white shadow-[0_20px_60px_rgba(15,23,42,0.2)]">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-indigo-100">
                <Sparkles className="h-3.5 w-3.5" />
                Before you start
              </span>
              <h2 className="mt-4 text-2xl font-black">한 번만 준비하면, 이후엔 읽기 흐름만 유지하면 됩니다.</h2>
              <div className="mt-6 space-y-3 text-sm text-slate-200">
                {checklist.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <SideCard
                icon={<Globe className="h-5 w-5" />}
                title="웹페이지 단어 조회"
                description="영어 문장 위에서 지정 키를 누른 채로 단어를 가리키세요."
              />
              <SideCard
                icon={<KeyRound className="h-5 w-5" />}
                title="로그인 동기화"
                description="앱 로그인 시 확장앱도 같은 세션을 공유해 자동 저장이 활성화됩니다."
              />
              <SideCard
                icon={<ShieldCheck className="h-5 w-5" />}
                title="안전한 제외 도메인"
                description="문서/민감한 사이트에서는 조회를 자동으로 건너뛰어 사용성을 지킵니다."
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function SideCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm backdrop-blur">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
