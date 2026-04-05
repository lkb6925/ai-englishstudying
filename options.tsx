import React, { useEffect, useState } from 'react';
import type { ModifierMode } from './messages';

type OptionsState = {
  modifier: ModifierMode;
  apiBaseUrl: string;
  saved: boolean;
};

function Options() {
  const [state, setState] = useState<OptionsState>({
    modifier: 'alt_option',
    apiBaseUrl: 'http://localhost:3000',
    saved: false,
  });

  useEffect(() => {
    // Load saved settings
    chrome.storage.sync.get(['flow_reader_modifier', 'flow_reader_api_base_url']).then((values) => {
      setState(prev => ({
        ...prev,
        modifier: (values.flow_reader_modifier as ModifierMode) || 'alt_option',
        apiBaseUrl: values.flow_reader_api_base_url || 'http://localhost:3000',
      }));
    });
  }, []);

  const saveSettings = async () => {
    await chrome.storage.sync.set({
      flow_reader_modifier: state.modifier,
      flow_reader_api_base_url: state.apiBaseUrl,
    });
    setState(prev => ({ ...prev, saved: true }));
    setTimeout(() => setState(prev => ({ ...prev, saved: false })), 2000);
  };

  return (
    <div style={{
      fontFamily: "'Pretendard Variable', 'Pretendard', system-ui, sans-serif",
      background: '#0a0a0f',
      minHeight: '100vh',
      color: '#f4f4f5',
      padding: '40px 20px',
    }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            marginBottom: '8px'
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px'
            }}>📖</div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900 }}>Flow Reader 설정</h1>
          </div>
          <p style={{ margin: 0, color: '#71717a', fontSize: '14px' }}>
            단축키 및 서버 주소를 설정하세요.
          </p>
        </div>

        {/* Modifier Key */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '16px',
        }}>
          <h2 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700 }}>🎯 단어 조회 단축키</h2>
          <p style={{ margin: '0 0 20px 0', color: '#71717a', fontSize: '13px' }}>
            이 키를 누른 상태에서 단어 위에 마우스를 올리면 뜻이 표시됩니다.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {([
              {
                value: 'alt_option' as ModifierMode,
                label: 'Alt / Option 키',
                desc: 'Windows: Alt | Mac: Option',
                icon: '⌥',
              },
              {
                value: 'cmd_ctrl' as ModifierMode,
                label: 'Cmd / Ctrl 키',
                desc: 'Windows: Ctrl | Mac: Cmd',
                icon: '⌘',
              },
            ] as const).map((opt) => (
              <label
                key={opt.value}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '14px 16px', borderRadius: '12px', cursor: 'pointer',
                  background: state.modifier === opt.value ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${state.modifier === opt.value ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.06)'}`,
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="radio"
                  name="modifier"
                  value={opt.value}
                  checked={state.modifier === opt.value}
                  onChange={() => setState(prev => ({ ...prev, modifier: opt.value }))}
                  style={{ display: 'none' }}
                />
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                  background: state.modifier === opt.value ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px',
                }}>
                  {opt.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{opt.label}</div>
                  <div style={{ color: '#71717a', fontSize: '12px', marginTop: '2px' }}>{opt.desc}</div>
                </div>
                {state.modifier === opt.value && (
                  <div style={{ marginLeft: 'auto', color: '#818cf8', fontSize: '18px' }}>✓</div>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* API URL */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
        }}>
          <h2 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700 }}>🌐 서버 주소</h2>
          <p style={{ margin: '0 0 16px 0', color: '#71717a', fontSize: '13px' }}>
            Flow Reader 서버의 주소를 입력하세요.
          </p>
          <input
            type="url"
            value={state.apiBaseUrl}
            onChange={(e) => setState(prev => ({ ...prev, apiBaseUrl: e.target.value }))}
            placeholder="http://localhost:3000"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '12px 14px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#f4f4f5', fontSize: '14px', outline: 'none',
              fontFamily: 'monospace',
            }}
          />
          <p style={{ margin: '8px 0 0 0', color: '#52525b', fontSize: '12px' }}>
            로컬: http://localhost:3000 | 배포 시 실제 도메인으로 변경하세요.
          </p>
        </div>

        {/* Save button */}
        <button
          onClick={saveSettings}
          style={{
            width: '100%', padding: '14px', borderRadius: '14px',
            background: state.saved
              ? 'rgba(16,185,129,0.8)'
              : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white', fontWeight: 700, fontSize: '15px',
            border: 'none', cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 0 30px rgba(99,102,241,0.3)',
          }}
        >
          {state.saved ? '✓ 저장되었습니다!' : '설정 저장'}
        </button>

        {/* Hint */}
        <div style={{
          marginTop: '24px', padding: '16px', borderRadius: '12px',
          background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
        }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#a5b4fc', lineHeight: 1.6 }}>
            💡 <strong>사용법:</strong> 영어 웹페이지에서 선택한 키를 누른 채로<br />
            모르는 단어 위에 마우스를 0.2초 올려두면 뜻이 팝업으로 표시됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Options;
