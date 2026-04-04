import type { ExtensionMessageResponse, LookupResultPayload, ModifierMode } from './messages';

const LOOKUP_DEBOUNCE_MS = 200;
const MAX_REQ_PER_MINUTE = 10;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SHADOW_STYLE_ASSET = 'tailwind-shadow.css';
const trustedAuthBridgeOrigins = ['https://thoughthecontext.com', 'http://localhost:3000'];

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
  type: 'SUPABASE_JWT';
  token: string;
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
    const response = await chrome.runtime.sendMessage({ type: 'FLOW_GET_MODIFIER' });
    if (response.ok && 'modifier' in response.data) {
      this.modifierMode = response.data.modifier;
    }
  }

  private handleAuthBridgeMessage = (event: MessageEvent<unknown>) => {
    if (event.source !== window) {
      return;
    }
    if (!trustedAuthBridgeOrigins.includes(event.origin)) {
      return;
    }

    if (typeof event.data !== 'object' || event.data === null) {
      return;
    }

    const data = event.data as Partial<AuthBridgeMessage>;
    if (data.source !== 'tap-and-know-auth' || data.type !== 'SUPABASE_JWT' || typeof data.token !== 'string') {
      return;
    }

    void chrome.runtime.sendMessage({
      type: 'FLOW_SET_JWT',
      payload: {
        token: data.token,
      },
    });
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.modifierMode === 'cmd_ctrl') {
      this.modifierPressed = event.metaKey || event.ctrlKey;
      return;
    }

    this.modifierPressed = event.altKey;
  };

  private handleKeyUp = () => {
    this.modifierPressed = false;
  };

  private handleMouseMove = (event: MouseEvent) => {
    if (!this.modifierPressed) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (this.hoverTimer !== null) {
      window.clearTimeout(this.hoverTimer);
    }

    this.hoverTimer = window.setTimeout(() => {
      void this.lookupFromElement(target, event.clientX, event.clientY);
    }, LOOKUP_DEBOUNCE_MS);
  };

  private async lookupFromElement(element: Element, x: number, y: number) {
    const word = this.extractWord(element);
    const context = this.extractContext(element);

    if (!word || !context) {
      return;
    }

    const normalized = word.toLowerCase().trim();
    const contextHash = await this.sha256(context);
    const lookupKey = `${normalized}:${contextHash}`;

    if (this.lastLookupKey === lookupKey) {
      return;
    }

    if (!this.canRequest()) {
      this.renderOverlay({
        word,
        meanings: ['요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'],
        x,
        y,
        fomoMessage: null,
      });
      return;
    }

    this.lastLookupKey = lookupKey;

    const cached = this.getCachedLookup(lookupKey);
    if (cached) {
      this.renderOverlay({ word, meanings: cached.meanings, x, y, fomoMessage: null });
      return;
    }

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

    const lookupData = this.extractLookupResult(workerResponse);
    if (!lookupData) {
      return;
    }

    this.setCachedLookup(lookupKey, {
      meanings: lookupData.meanings,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    this.renderOverlay({
      word,
      meanings: lookupData.meanings,
      x,
      y,
      fomoMessage: lookupData.guestStats?.fomoMessage ?? null,
    });
  }

  private extractLookupResult(response: ExtensionMessageResponse): LookupResultPayload | null {
    if (!response.ok) {
      return null;
    }

    if (!('meanings' in response.data)) {
      return null;
    }

    return response.data;
  }

  private extractWord(element: Element): string {
    const text = element.textContent?.trim() ?? '';
    const match = text.match(/[A-Za-z][A-Za-z'-]*/);
    return match?.[0] ?? '';
  }

  private extractContext(element: Element): string {
    const sentenceCandidate = element.closest('p, li, h1, h2, h3, h4, h5, h6, article')?.textContent ?? '';
    const paragraphCandidate = element.closest('p, div, article, section')?.textContent ?? '';
    const uiCandidate = element.closest('label, button, span')?.textContent ?? '';
    const fallback = element.textContent ?? '';

    const prioritized = [sentenceCandidate, paragraphCandidate, uiCandidate, fallback]
      .map((value) => value.replace(/\s+/g, ' ').trim())
      .find((value) => value.length > 0);

    return (prioritized ?? '').slice(0, 300);
  }

  private canRequest(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    this.recentRequestTimestamps = this.recentRequestTimestamps.filter((timestamp) => timestamp > oneMinuteAgo);

    if (this.recentRequestTimestamps.length >= MAX_REQ_PER_MINUTE) {
      return false;
    }

    this.recentRequestTimestamps.push(now);
    return true;
  }

  private getCachedLookup(key: string): CachedLookup | null {
    const raw = window.localStorage.getItem(`flow-reader:ext:${key}`);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as CachedLookup;
      if (parsed.expiresAt < Date.now()) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private setCachedLookup(key: string, value: CachedLookup) {
    window.localStorage.setItem(`flow-reader:ext:${key}`, JSON.stringify(value));
  }

  private async sha256(input: string): Promise<string> {
    const encoded = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('');
  }

  private ensureOverlayRoot(): ShadowRoot {
    if (this.overlayHost && this.shadowRootRef) {
      return this.shadowRootRef;
    }

    const host = document.createElement('div');
    host.id = 'flow-reader-overlay-host';
    host.style.position = 'fixed';
    host.style.left = '0';
    host.style.top = '0';
    host.style.zIndex = '2147483647';
    host.style.pointerEvents = 'none';
    document.documentElement.appendChild(host);

    const root = host.attachShadow({ mode: 'open' });
    this.injectShadowStyles(root);

    this.overlayHost = host;
    this.shadowRootRef = root;
    return root;
  }

  private injectShadowStyles(root: ShadowRoot) {
    const styleHref = chrome.runtime.getURL(SHADOW_STYLE_ASSET);

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = styleHref;
    root.appendChild(link);

    const baseStyle = document.createElement('style');
    baseStyle.textContent = `
      :host { all: initial; }
      .flow-popup { pointer-events: auto; position: fixed; width: 320px; max-width: calc(100vw - 16px); border-radius: 12px; border: 1px solid #d4d4d8; background: white; padding: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.12); font-family: Inter, system-ui, sans-serif; }
      .flow-title { font-weight: 600; margin: 0 0 8px 0; }
      .flow-list { margin: 0; padding-left: 16px; color: #475569; font-size: 14px; }
      .flow-fomo { margin-top: 8px; font-size: 12px; color: #e11d48; font-weight: 600; }
    `;
    root.appendChild(baseStyle);
  }

  private renderOverlay(state: OverlayState) {
    const root = this.ensureOverlayRoot();
    root.innerHTML = '';
    this.injectShadowStyles(root);

    const container = document.createElement('div');
    container.className = 'flow-popup';
    container.style.left = `${state.x + 8}px`;
    container.style.top = `${state.y + 8}px`;

    const title = document.createElement('p');
    title.className = 'flow-title';
    title.textContent = state.word;

    const list = document.createElement('ul');
    list.className = 'flow-list';

    for (const meaning of state.meanings) {
      const item = document.createElement('li');
      item.textContent = meaning;
      list.appendChild(item);
    }

    container.appendChild(title);
    container.appendChild(list);

    if (state.fomoMessage) {
      const fomo = document.createElement('p');
      fomo.className = 'flow-fomo';
      fomo.textContent = state.fomoMessage;
      container.appendChild(fomo);
    }

    root.appendChild(container);
  }
}

const flowReader = new FlowReaderContentScript();
void flowReader.start();
