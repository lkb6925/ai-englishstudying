import React from 'react';
import { Header } from '@/src/components/header';
import { Link } from 'react-router-dom';
import { Button } from '@/src/components/ui/button';
import { MousePointer2, BookOpen, BarChart3, Zap } from 'lucide-react';

export function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="px-4 py-20 text-center">
          <div className="mx-auto max-w-3xl space-y-6">
            <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
              영어를 읽을 때 <span className="text-primary">멈추지 마세요</span>
            </h1>
            <p className="text-xl text-slate-600">
              브라우저 확장앱으로 모르는 단어를 즉시 조회하고, 
              조회된 모든 데이터는 자동으로 당신만의 단어장이 됩니다.
            </p>
            <div className="flex justify-center gap-4">
              <Button size="lg" className="rounded-full px-8">
                확장앱 설치하기
              </Button>
              <Link to="/wordbook">
                <Button size="lg" variant="outline" className="rounded-full px-8">
                  내 단어장 보기
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="mx-auto max-w-7xl px-4 py-20">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard 
              icon={<MousePointer2 className="h-6 w-6 text-primary" />}
              title="Alt + Hover"
              description="마우스를 올리는 것만으로 즉시 단어의 뜻을 확인하세요."
            />
            <FeatureCard 
              icon={<Zap className="h-6 w-6 text-primary" />}
              title="AI 문맥 해석"
              description="단순한 사전적 의미가 아닌, 문장 속에서의 정확한 의미를 제공합니다."
            />
            <FeatureCard 
              icon={<BarChart3 className="h-6 w-6 text-primary" />}
              title="자동 랭킹 시스템"
              description="자주 찾아본 단어는 위험 랭크가 올라가며 집중 관리가 시작됩니다."
            />
            <FeatureCard 
              icon={<BookOpen className="h-6 w-6 text-primary" />}
              title="개인화 단어장"
              description="2회 이상 조회된 단어는 자동으로 단어장에 등록됩니다."
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-bold text-slate-900">{title}</h3>
      <p className="text-slate-600">{description}</p>
    </div>
  );
}
