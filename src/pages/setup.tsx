import { Link } from 'react-router-dom';
import { Header } from '@/src/components/header';
import { Button } from '@/src/components/ui/button';

const installSteps = [
  '대시보드에서 최신 `dist-extension/` 빌드를 받습니다.',
  '`chrome://extensions`에서 개발자 모드를 켭니다.',
  '`압축 해제된 확장 프로그램 로드`로 `dist-extension/` 폴더를 선택합니다.',
  '옵션 화면에서 API 주소를 확인한 뒤, 영어 페이지에서 지정 키와 함께 단어를 가리킵니다.',
];

export function SetupPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Install Guide
          </span>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900">
            Flow Reader 설치 가이드
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            첫 출시 버전은 Chrome 개발자 모드 설치를 기준으로 제공합니다. 아래 순서대로
            설치하면 바로 단어 조회와 단어장 저장을 사용할 수 있습니다.
          </p>

          <div className="mt-8 grid gap-4">
            {installSteps.map((step, index) => (
              <div
                key={step}
                className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white">
                  {index + 1}
                </div>
                <p className="pt-2 text-sm leading-6 text-slate-700">{step}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/wordbook">
              <Button size="lg" className="rounded-full px-8">
                내 단어장 열기
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="rounded-full px-8">
                로그인하고 시작하기
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
