import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Check, Globe2, Keyboard, Sparkles } from 'lucide-react';
import type { ModifierMode } from './messages';
import { resolveApiBaseUrl, resolveAppOrigin } from './app-config';
import { extensionStorageKeys } from './extension-storage';

const defaultAppUrl = resolveAppOrigin(
  import.meta.env.VITE_APP_URL,
  import.meta.env.VITE_CODESPACE_NAME,
  import.meta.env.VITE_CODESPACES_PORT_FORWARDING_DOMAIN,
);
const defaultApiBaseUrl = resolveApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL,
  import.meta.env.VITE_APP_URL,
  import.meta.env.VITE_CODESPACE_NAME,
  import.meta.env.VITE_CODESPACES_PORT_FORWARDING_DOMAIN,
);

type OptionsState = {
  modifier: ModifierMode;
  appUrl: string;
  apiBaseUrl: string;
  saved: boolean;
};

const modifierOptions = [
  {
    value: 'alt_option' as ModifierMode,
    label: 'Alt / Option',
    description: 'Windows: Alt | Mac: Option',
    keyHint: '⌥',
  },
  {
    value: 'cmd_ctrl' as ModifierMode,
    label: 'Cmd / Ctrl',
    description: 'Windows: Ctrl | Mac: Cmd',
    keyHint: '⌘',
  },
] as const;

function SettingsCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/10">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-black tracking-tight text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function FieldLabel({ title, helper }: { title: string; helper: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">{title}</div>
      <div className="text-sm text-slate-500">{helper}</div>
    </div>
  );
}

function Options() {
  const [state, setState] = useState<OptionsState>({
    modifier: 'alt_option',
    appUrl: defaultAppUrl,
    apiBaseUrl: defaultApiBaseUrl,
    saved: false,
  });

  const selectedOption = useMemo(
    () => modifierOptions.find((option) => option.value === state.modifier),
    [state.modifier],
  );

  useEffect(() => {
    chrome.storage.sync
      .get(['flow_reader_modifier', 'flow_reader_app_url', 'flow_reader_api_base_url'])
      .then((values) => {
        setState((prev) => ({
          ...prev,
          modifier: (values.flow_reader_modifier as ModifierMode) || 'alt_option',
          appUrl: values.flow_reader_app_url || defaultAppUrl,
          apiBaseUrl: values.flow_reader_api_base_url || defaultApiBaseUrl,
        }));
      });
  }, []);

  useEffect(() => {
    if (!state.saved) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setState((prev) => ({ ...prev, saved: false }));
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [state.saved]);

  const saveSettings = async () => {
    await chrome.storage.sync.set({
      flow_reader_modifier: state.modifier,
      flow_reader_app_url: state.appUrl.trim(),
      flow_reader_api_base_url: state.apiBaseUrl.trim(),
    });
    setState((prev) => ({ ...prev, saved: true }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50 px-4 py-8 text-slate-900">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <header className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500 px-6 py-6 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/80">AI English Study</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight">설정</h1>
              </div>
            </div>
          </div>
          <div className="px-6 py-5">
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              단축키와 웹앱 주소를 저장하면 확장앱이 바로 동작합니다. 저장 후 열려 있는 탭에도 설정이 자동 반영됩니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700 ring-1 ring-indigo-100">
                기본 웹앱: {defaultAppUrl}
              </span>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700 ring-1 ring-sky-100">
                기본 서버: {defaultApiBaseUrl}
              </span>
            </div>
          </div>
        </header>

        <SettingsCard
          icon={<Keyboard className="h-5 w-5" />}
          title="단어 조회 단축키"
          description="선택한 키를 누른 상태에서 단어 위에 마우스를 올리면 뜻이 표시됩니다."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {modifierOptions.map((option) => {
              const active = state.modifier === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-4 rounded-3xl border p-4 transition ${
                    active
                      ? 'border-indigo-300 bg-indigo-50/80 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="modifier"
                    value={option.value}
                    checked={active}
                    onChange={() => setState((prev) => ({ ...prev, modifier: option.value }))}
                    className="sr-only"
                  />
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-black ${
                      active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {option.keyHint}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-950">{option.label}</span>
                      {active ? <Check className="h-4 w-4 text-indigo-600" /> : null}
                    </div>
                    <p className="text-sm text-slate-500">{option.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </SettingsCard>

        <SettingsCard
          icon={<Globe2 className="h-5 w-5" />}
          title="주소 설정"
          description="팝업의 ‘내 단어장 열기’와 서버 요청 주소를 각각 맞게 저장하세요."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <FieldLabel title="App URL" helper="팝업 버튼이 여기를 엽니다." />
              <input
                type="url"
                value={state.appUrl}
                onChange={(e) => setState((prev) => ({ ...prev, appUrl: e.target.value }))}
                placeholder="https://your-app.example.com"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-mono text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
              />
            </label>

            <label className="block space-y-2">
              <FieldLabel title="API Base URL" helper="확장앱이 서버에 요청을 보냅니다." />
              <input
                type="url"
                value={state.apiBaseUrl}
                onChange={(e) => setState((prev) => ({ ...prev, apiBaseUrl: e.target.value }))}
                placeholder="http://localhost:3000"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-mono text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
              />
            </label>
          </div>
        </SettingsCard>

        <button
          onClick={saveSettings}
          className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-bold text-white shadow-lg transition ${
            state.saved
              ? 'bg-emerald-500 shadow-emerald-500/30'
              : 'bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-600 shadow-indigo-500/25 hover:brightness-105'
          }`}
        >
          {state.saved ? <Check className="h-4 w-4" /> : null}
          {state.saved ? '저장되었습니다' : '설정 저장'}
        </button>

        <div className="rounded-3xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm text-indigo-900">
          <strong>현재 선택:</strong> {selectedOption ? selectedOption.label : '미선택'}
          <div className="mt-2 text-xs leading-5 text-indigo-700">
            저장 후 확장앱 팝업과 단어 조회 동작에 바로 반영됩니다.
          </div>
        </div>
      </div>
    </div>
  );
}

export default Options;

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<Options />);
}
