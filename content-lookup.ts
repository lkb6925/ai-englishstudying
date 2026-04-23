import type {
  ExtensionMessageResponse,
  LookupResultPayload,
} from './messages';
import { OverlayRenderer, type OverlayState } from './content-overlay';
import { LocalStorageLookupCache, type CachedLookup } from './lookup-cache';
import { sha256, shouldExcludeDomain } from './text';

type LookupCoordinatorOptions = {
  cacheTtlMs: number;
  maxRequestsPerMinute: number;
};

export class LookupCoordinator {
  private recentRequestTimestamps: number[] = [];
  private lastLookupKey: string | null = null;
  private readonly overlay = new OverlayRenderer();
  private readonly cache = new LocalStorageLookupCache();

  constructor(private readonly options: LookupCoordinatorOptions) {}

  async lookupFromElement(element: Element, x: number, y: number) {
    const word = this.extractWord(element);
    const context = this.extractContext(element);
    if (!word || !context) {
      return;
    }

    const normalized = word.toLowerCase().trim();
    const contextHash = await sha256(context);
    const lookupKey = `${normalized}:${contextHash}`;

    if (this.lastLookupKey === lookupKey) {
      return;
    }

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
        x,
        y,
        fomoMessage: null,
      });
      return;
    }

    this.lastLookupKey = lookupKey;

    const cached = this.cache.get(lookupKey);
    if (cached) {
      this.renderOverlay({
        word,
        meanings: cached.meanings,
        x,
        y,
        fomoMessage: null,
      });
      return;
    }

    this.renderOverlay({ word, meanings: ['조회 중...'], x, y, fomoMessage: null });

    const sourcePathHash = await sha256(window.location.pathname);
    let workerResponse: ExtensionMessageResponse;

    try {
      workerResponse = await chrome.runtime.sendMessage({
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
    } catch (error) {
      this.lastLookupKey = null;
      this.renderOverlay({
        word,
        meanings: ['조회 요청을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.'],
        x,
        y,
        fomoMessage: null,
      });
      console.warn('AI English Study lookup request failed.', error);
      return;
    }

    const lookupData = this.extractLookupResult(workerResponse, word, x, y);
    if (!lookupData) {
      this.lastLookupKey = null;
      return;
    }

    this.cache.set(lookupKey, {
      meanings: lookupData.meanings,
      expiresAt: Date.now() + this.options.cacheTtlMs,
    } satisfies CachedLookup);

    this.renderOverlay({
      word,
      meanings: lookupData.meanings,
      x,
      y,
      fomoMessage: lookupData.guestStats?.fomoMessage ?? null,
    });
  }

  clearOverlay() {
    this.overlay.clear();
    this.lastLookupKey = null;
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
    const candidates = [
      element.closest('p, li, h1, h2, h3, h4, h5, h6, article')?.textContent ?? '',
      element.closest('p, div, article, section')?.textContent ?? '',
      element.closest('label, button, span')?.textContent ?? '',
      element.textContent ?? '',
    ];

    const prioritized = candidates
      .map((value) => value.replace(/\s+/g, ' ').trim())
      .find((value) => value.length > 0);

    return (prioritized ?? '').slice(0, 300);
  }

  private canRequest(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    this.recentRequestTimestamps = this.recentRequestTimestamps.filter(
      (timestamp) => timestamp > oneMinuteAgo,
    );

    if (this.recentRequestTimestamps.length >= this.options.maxRequestsPerMinute) {
      return false;
    }

    this.recentRequestTimestamps.push(now);
    return true;
  }

  private renderOverlay(state: OverlayState) {
    this.overlay.render(state);
  }
}
