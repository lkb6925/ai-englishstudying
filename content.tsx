import type {
  ModifierMode,
} from './messages';
import { getTrustedAuthBridgeOrigins } from './app-config';
import {
  ContentEventManager,
  type AuthBridgeEvent,
} from './content-events';
import { LookupCoordinator } from './content-lookup';

const LOOKUP_DEBOUNCE_MS = 200;
const MAX_REQ_PER_MINUTE = 10;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const trustedAuthBridgeOrigins = getTrustedAuthBridgeOrigins(
  import.meta.env.VITE_APP_URL,
);

class FlowReaderContentScript {
  private eventManager = new ContentEventManager({
    trustedAuthBridgeOrigins,
    hoverDebounceMs: LOOKUP_DEBOUNCE_MS,
    onHoverIntent: (element, x, y) => {
      void this.lookupCoordinator.lookupFromElement(element, x, y);
    },
    onModifierReleased: () => {
      this.lookupCoordinator.clearOverlay();
    },
    onAuthBridgeEvent: (event) => {
      void this.persistAuthBridgeEvent(event);
    },
  });

  private lookupCoordinator = new LookupCoordinator({
    cacheTtlMs: CACHE_TTL_MS,
    maxRequestsPerMinute: MAX_REQ_PER_MINUTE,
  });

  async start() {
    this.eventManager.setModifierMode(await this.loadModifierFromBackground());
    this.eventManager.start();
  }

  private async loadModifierFromBackground(): Promise<ModifierMode> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'FLOW_GET_MODIFIER',
      });
      if (response.ok && 'modifier' in response.data) {
        return response.data.modifier;
      }
    } catch (error) {
      console.warn('Flow Reader modifier load failed, using default.', error);
    }

    return 'alt_option';
  }

  private async persistAuthBridgeEvent(event: AuthBridgeEvent) {
    if (event.type === 'jwt') {
      await chrome.runtime.sendMessage({
        type: 'FLOW_SET_JWT',
        payload: { token: event.token },
      });
      return;
    }

    await chrome.runtime.sendMessage({
      type: 'FLOW_CLEAR_JWT',
    });
  }
}

const flowReader = new FlowReaderContentScript();
void flowReader.start();
