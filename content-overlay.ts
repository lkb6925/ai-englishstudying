export type OverlayState = {
  word: string;
  meanings: string[];
  x: number;
  y: number;
  fomoMessage: string | null;
};

export class OverlayRenderer {
  private overlayHost: HTMLDivElement | null = null;
  private shadowRootRef: ShadowRoot | null = null;

  clear() {
    if (this.shadowRootRef) {
      this.shadowRootRef.innerHTML = '';
    }
  }

  render(state: OverlayState) {
    const root = this.ensureOverlayRoot();
    root.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; }
      .popup {
        pointer-events: auto;
        position: fixed;
        width: 300px;
        max-width: calc(100vw - 24px);
        border-radius: 16px;
        background: #18181b;
        border: 1px solid rgba(255,255,255,0.12);
        padding: 14px 16px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.2);
        font-family: 'Pretendard Variable', 'Pretendard', system-ui, sans-serif;
        animation: fadeIn 0.15s ease;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .word {
        font-size: 16px;
        font-weight: 900;
        color: #f4f4f5;
        margin: 0 0 8px 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .badge {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        padding: 2px 8px;
        border-radius: 999px;
        background: rgba(99,102,241,0.2);
        color: #818cf8;
        border: 1px solid rgba(99,102,241,0.35);
      }
      .divider {
        height: 1px;
        background: rgba(255,255,255,0.08);
        margin: 8px 0;
      }
      .meanings {
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .meaning-item {
        font-size: 13px;
        color: #a1a1aa;
        line-height: 1.6;
        padding: 3px 0;
        display: flex;
        gap: 8px;
      }
      .meaning-item::before {
        content: '•';
        color: #6366f1;
        flex-shrink: 0;
      }
      .fomo {
        margin-top: 10px;
        padding: 8px 10px;
        border-radius: 8px;
        background: rgba(239,68,68,0.1);
        border: 1px solid rgba(239,68,68,0.25);
        font-size: 12px;
        font-weight: 700;
        color: #fca5a5;
      }
      .loading {
        font-size: 13px;
        color: #52525b;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .spinner {
        width: 12px;
        height: 12px;
        border: 2px solid rgba(99,102,241,0.3);
        border-top-color: #6366f1;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
    `;
    root.appendChild(style);

    const popup = document.createElement('div');
    popup.className = 'popup';

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = state.x + 12;
    let top = state.y + 12;
    if (left + 300 > vw) left = state.x - 312;
    if (top + 160 > vh) top = state.y - 170;

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;

    const isLoading =
      state.meanings.length === 1 && state.meanings[0] === '조회 중...';

    popup.innerHTML = `
      <p class="word">
        ${state.word}
        <span class="badge">Flow Reader</span>
      </p>
      <div class="divider"></div>
      ${
        isLoading
          ? `<div class="loading"><div class="spinner"></div> AI가 문맥을 분석 중...</div>`
          : `<ul class="meanings">${state.meanings
              .map((meaning) => `<li class="meaning-item">${meaning}</li>`)
              .join('')}</ul>`
      }
      ${
        state.fomoMessage
          ? `<div class="fomo">${state.fomoMessage}</div>`
          : ''
      }
    `;

    root.appendChild(popup);
  }

  private ensureOverlayRoot(): ShadowRoot {
    if (this.overlayHost && this.shadowRootRef) {
      return this.shadowRootRef;
    }

    const host = document.createElement('div');
    host.id = 'flow-reader-overlay-host';
    Object.assign(host.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      zIndex: '2147483647',
      pointerEvents: 'none',
    });

    document.documentElement.appendChild(host);

    const root = host.attachShadow({ mode: 'open' });
    this.overlayHost = host;
    this.shadowRootRef = root;
    return root;
  }
}
