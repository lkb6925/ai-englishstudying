import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Check, Globe2, Keyboard, Sparkles } from 'lucide-react';
import type { ModifierMode } from './messages';
import { resolveApiBaseUrl } from './app-config';

const defaultApiBaseUrl = resolveApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL,
  import.meta.env.VITE_APP_URL,
  import.meta.env.VITE_CODESPACE_NAME,
  import.meta.env.VITE_CODESPACES_PORT_FORWARDING_DOMAIN,
);

type OptionsState = {
  modifier: ModifierMode;
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

function Options() {
  const [state, setState] = useState<OptionsState>({
    modifier: 'alt_option',
    apiBaseUrl: defaultApiBaseUrl,
    saved: false,
  });

  const selectedOption = useMemo(
    () => modifierOptions.find((option) => option.value === state.modifier),
    [state.modifier],
  );

  useEffect(() => {
    chrome.storage.sync.get(['flow_reader_modifier', 'flow_reader_api_base_url']).then((values) => {
      setState((prev) => ({
        ...prev,
        modifier: (values.flow_reader_modifier as ModifierMode) || 'alt_option',
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
      flow_reader_api_base_url: state.apiBaseUrl.trim(),
    });
    setState((prev) => ({ ...prev, saved: true }));
  };

  return (
    <div className="min-h-screen bg-transparent px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/15">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-indigo-600">AI English Study</p>
              <h1 className="text-2xl font-black tracking-tight">설정</h1>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            단축키와 서버 주소를 저장하면 확장앱이 바로 동작합니다. 저장 후 열려 있는 탭에도 설정이 자동 반영됩니다.
          </p>
        </header>

        <section className="space-y-4 rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
              <Keyboard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-950">단어 조회 단축키</h2>
              <p className="text-sm text-slate-600">이 키를 누른 상태에서 단어 위에 마우스를 올리면 뜻이 표시됩니다.</p>
            </div>
          </div>

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
        </section>

        <section className="mt-4 rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
              <Globe2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-950">서버 주소</h2>
              <p className="text-sm text-slate-600">AI English Study 서버의 주소를 입력하세요.</p>
            </div>
          </div>

          <div className="mt-4">
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">API Base URL</span>
              <input
                type="url"
                value={state.apiBaseUrl}
                onChange={(e) => setState((prev) => ({ ...prev, apiBaseUrl: e.target.value }))}
                placeholder="http://localhost:3000"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-mono text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
              />
            </label>
            <p className="mt-2 text-xs text-slate-500">기본값: {defaultApiBaseUrl}</p>
          </div>
        </section>

        <button
          onClick={saveSettings}
          className={`mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-bold text-white shadow-lg transition ${
            state.saved
              ? 'bg-emerald-500 shadow-emerald-500/30'
              : 'bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-600 shadow-indigo-500/25 hover:brightness-105'
          }`}
        >
          {state.saved ? <Check className="h-4 w-4" /> : null}
          {state.saved ? '저장되었습니다' : '설정 저장'}
        </button>

        <div className="mt-4 rounded-3xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm text-indigo-900">
          <strong>사용법:</strong> 영어 웹페이지에서 선택한 키를 누른 채로 모르는 단어 위에 마우스를 0.2초 올려두면 뜻이 팝업으로 표시됩니다.
          {selectedOption ? (
            <div className="mt-2 text-xs text-indigo-700">현재 선택: {selectedOption.label}</div>
          ) : null}
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
