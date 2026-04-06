import type { ModifierMode } from './messages';

export type AuthBridgeEvent =
  | { type: 'jwt'; token: string }
  | { type: 'logout' };

type ContentEventManagerOptions = {
  trustedAuthBridgeOrigins: string[];
  hoverDebounceMs: number;
  onHoverIntent: (element: Element, x: number, y: number) => void;
  onModifierReleased: () => void;
  onAuthBridgeEvent: (event: AuthBridgeEvent) => void;
};

type AuthBridgeMessage = {
  source: 'tap-and-know-auth';
  type: 'SUPABASE_JWT' | 'SUPABASE_LOGOUT';
  token?: string;
};

export class ContentEventManager {
  private modifierMode: ModifierMode = 'alt_option';
  private modifierPressed = false;
  private hoverTimer: number | null = null;

  constructor(private readonly options: ContentEventManagerOptions) {}

  setModifierMode(mode: ModifierMode) {
    this.modifierMode = mode;
  }

  start() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('message', this.handleAuthBridgeMessage);
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.modifierMode === 'cmd_ctrl') {
      this.modifierPressed = event.metaKey || event.ctrlKey;
      return;
    }

    this.modifierPressed = event.altKey;
  };

  private handleKeyUp = () => {
    this.modifierPressed = false;
    this.options.onModifierReleased();
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
      this.options.onHoverIntent(target, event.clientX, event.clientY);
    }, this.options.hoverDebounceMs);
  };

  private handleAuthBridgeMessage = (event: MessageEvent<unknown>) => {
    if (event.source !== window) return;
    if (!this.options.trustedAuthBridgeOrigins.includes(event.origin)) return;
    if (typeof event.data !== 'object' || event.data === null) return;

    const data = event.data as Partial<AuthBridgeMessage>;
    if (
      data.source !== 'tap-and-know-auth' ||
      (data.type !== 'SUPABASE_JWT' && data.type !== 'SUPABASE_LOGOUT')
    ) {
      return;
    }

    if (data.type === 'SUPABASE_JWT') {
      if (typeof data.token !== 'string' || data.token.length === 0) {
        return;
      }

      this.options.onAuthBridgeEvent({ type: 'jwt', token: data.token });
      return;
    }

    this.options.onAuthBridgeEvent({ type: 'logout' });
  };
}
