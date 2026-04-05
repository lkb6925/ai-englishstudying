import type {
  ExtensionMessageResponse,
  LookupResultPayload,
  ModifierMode,
} from './messages';
import { getTrustedAuthBridgeOrigins } from './app-config';
import { shouldExcludeDomain } from './text';

const LOOKUP_DEBOUNCE_MS = 200;
const MAX_REQ_PER_MINUTE = 10;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const trustedAuthBridgeOrigins = getTrustedAuthBridgeOrigins(
  import.meta.env.VITE_APP_URL,
);

type OverlayState = {
  word: string;
  meanings: string[];
  x: number;
  y: number;
  fomoMessage: string | null;
};

type CachedLookup = {
  meanings: string[];
  expiresAt: number;
};

type AuthBridgeMessage = {
  source: 'tap-and-know-auth';
  type: 'SUPABASE_JWT' | 'SUPABASE_LOGOUT';
  token?: string;
};

class FlowReaderContentScript {
  private modifierPressed = false;
  private modifierMode: ModifierMode = 'alt_option';
  private hoverTimer: number | null = null;
  private recentRequestTimestamps: number[] = [];
  private lastLookupKey: string | null = null;
  private overlayHost: HTMLDivElement | null = null;
  private shadowRootRef: ShadowRoot | null = null;

  async start() {
    await this.loadModifierFromBackground();
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('message', this.handleAuthBridgeMessage);
  }

  private async loadModifierFromBackground() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'FLOW_GET_MODIFIER',
      });
      if (response.ok && 'modifier' in response.data) {
        this.modifierMode = response.data.modifier;
      }
    } catch {
      // extension context may not be ready
    }
  }

  private handleAuthBridgeMessage = (event: MessageEvent<unknown>) => {
    if (event.source !== window) return;
    if (!trustedAuthBridgeOrigins.includes(event.origin)) return;
    if (typeof event.data !== 'object' || event.data === null) return;

    const data = event.data as Partial<AuthBridgeMessage>;
    if (
      data.source !== 'tap-and-know-auth' ||
      (data.type !== 'SUPABASE_JWT' && data.type !== 'SUPABASE_LOGOUT')
    )
      return;

    if (data.type === 'SUPABASE_JWT') {
      if (typeof data.token !== 'string' || data.token.length === 0) {
        return;
      }

      void chrome.runtime.sendMessage({
        type: 'FLOW_SET_JWT',
        payload: { token: data.token },
      });
      return;
    }

    void chrome.runtime.sendMessage({
      type: 'FLOW_CLEAR_JWT',
    });
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.modifierMode === 'cmd_ctrl') {
      this.modifierPressed = event.metaKey || event.ctrlKey;
    } else {
      this.modifierPressed = event.altKey;
    }
  };

  private handleKeyUp = () => {
    this.modifierPressed = false;
    // Hide overlay when key is released
    this.clearOverlay();
  };

  private handleMouseMove = (event: MouseEvent) => {
    if (!this.modifierPressed) return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    if (this.hoverTimer !== null) window.clearTimeout(this.hoverTimer);

    this.hoverTimer = window.setTimeout(() => {
      void this.lookupFromElement(target, event.clientX, event.clientY);
    }, LOOKUP_DEBOUNCE_MS);
  };

  private async lookupFromElement(
    element: Element,
    x: number,
    y: number
  ) {
    const word = this.extractWord(element);
    const context = this.extractContext(element);
    if (!word || !context) return;

    const normalized = word.toLowerCase().trim();
    const contextHash = await this.sha256(context);
    const lookupKey = `${normalized}:${contextHash}`;

    if (this.lastLookupKey === lookupKey) return;

    if (shouldExcludeDomain(window.location.hostname)) {
      this.renderOverlay({
        word,
        meanings: ['이 페이지에서는 개인정보 보호를 위해 조회가 비활성화됩니다.'],
        x,
        y,
        fomoMessage: null,
      });
      return;
    }

    if (!this.canRequest()) {
      this.renderOverlay({
        word,
        meanings: ['요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'],
        x, y, fomoMessage: null,
      });
      return;
    }

    this.lastLookupKey = lookupKey;

    const cached = this.getCachedLookup(lookupKey);
    if (cached) {
      this.renderOverlay({ word, meanings: cached.meanings, x, y, fomoMessage: null });
      return;
    }

    // Show loading state
    this.renderOverlay({ word, meanings: ['조회 중...'], x, y, fomoMessage: null });

    const sourcePathHash = await this.sha256(window.location.pathname);
    const workerResponse = await chrome.runtime.sendMessage({
      type: 'FLOW_LOOKUP',
      payload: {
        word,
        sentence: context,
        term: word,
        context,
        sourceDomain: window.location.hostname,
        sourcePathHash,
      },
    });

    const lookupData = this.extractLookupResult(workerResponse, word, x, y);
    if (!lookupData) {
      this.lastLookupKey = null;
      return;
    }

    this.setCachedLookup(lookupKey, {
      meanings: lookupData.meanings,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    this.renderOverlay({
      word,
      meanings: lookupData.meanings,
      x, y,
      fomoMessage: lookupData.guestStats?.fomoMessage ?? null,
    });
  }

  private extractLookupResult(
    response: ExtensionMessageResponse,
    word: string,
    x: number,
    y: number,
  ): LookupResultPayload | null {
    if (!response.ok) {
      this.renderOverlay({
        word,
        meanings: [response.error.message || '조회에 실패했습니다.'],
        x,
        y,
        fomoMessage: null,
      });
      return null;
    }
    if (!('meanings' in response.data)) return null;
    return response.data;
  }

  private extractWord(element: Element): string {
    const text = element.textContent?.trim() ?? '';
    const match = text.match(/[A-Za-z][A-Za-z'-]*/);
    return match?.[0] ?? '';
  }

  private extractContext(element: Element): string {
    const candidates = [
      element.closest('p, li, h1, h2, h3, h4, h5, h6, article')?.textContent ?? '',
      element.closest('p, div, article, section')?.textContent ?? '',
      element.closest('label, button, span')?.textContent ?? '',
      element.textContent ?? '',
    ];
    const prioritized = candidates
      .map((v) => v.replace(/\s+/g, ' ').trim())
      .find((v) => v.length > 0);
    return (prioritized ?? '').slice(0, 300);
  }

  private canRequest(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    this.recentRequestTimestamps = this.recentRequestTimestamps.filter(
      (t) => t > oneMinuteAgo
    );
    if (this.recentRequestTimestamps.length >= MAX_REQ_PER_MINUTE) return false;
    this.recentRequestTimestamps.push(now);
    return true;
  }

  private getCachedLookup(key: string): CachedLookup | null {
    try {
      const raw = window.localStorage.getItem(`flow-reader:ext:${key}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CachedLookup;
      if (parsed.expiresAt < Date.now()) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private setCachedLookup(key: string, value: CachedLookup) {
    try {
      window.localStorage.setItem(
        `flow-reader:ext:${key}`,
        JSON.stringify(value)
      );
    } catch {
      // localStorage full or unavailable
    }
  }

  private async sha256(input: string): Promise<string> {
    const encoded = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('');
  }

  private clearOverlay() {
    if (this.shadowRootRef) {
      this.shadowRootRef.innerHTML = '';
    }
    this.lastLookupKey = null;
  }

  private ensureOverlayRoot(): ShadowRoot {
    if (this.overlayHost && this.shadowRootRef) return this.shadowRootRef;

    const host = document.createElement('div');
    host.id = 'flow-reader-overlay-host';
    Object.assign(host.style, {
      position: 'fixed', left: '0', top: '0',
      zIndex: '2147483647', pointerEvents: 'none',
    });
    document.documentElement.appendChild(host);

    const root = host.attachShadow({ mode: 'open' });
    this.overlayHost = host;
    this.shadowRootRef = root;
    return root;
  }

  private renderOverlay(state: OverlayState) {
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

    // Position popup
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = state.x + 12;
    let top = state.y + 12;
    if (left + 300 > vw) left = state.x - 312;
    if (top + 160 > vh) top = state.y - 170;

    const popup = document.createElement('div');
    popup.className = 'popup';
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
              .map((m) => `<li class="meaning-item">${m}</li>`)
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
}

const flowReader = new FlowReaderContentScript();
void flowReader.start();
