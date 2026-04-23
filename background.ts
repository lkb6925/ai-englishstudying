import type {
  ExtensionMessage,
  ExtensionMessageResponse,
  GuestStats,
  LookupRequestPayload,
  ModifierMode,
} from './messages';
import { resolveApiBaseUrl, resolveAppOrigin } from './app-config';
import {
  extensionStorageKeys,
  readStorageValue,
  removeStorageValue,
  writeStorageValue,
} from './extension-storage';

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

function broadcastModifierChange(modifier: ModifierMode) {
  void chrome.runtime.sendMessage({
    type: 'FLOW_MODIFIER_CHANGED',
    payload: { modifier },
  }).catch(() => {
    // best effort broadcast only
  });
}

type LookupApiResponse = {
  contextual_meanings: string[];
};

type LookupEventApiResponse = {
  persisted: boolean;
  promoted: boolean;
  totalLookupCount: number;
  reason?: 'unauthorized' | 'excluded_domain';
};

type ApiErrorResponse = {
  error?: string;
  details?: string;
};

type GuestStatsStorage = {
  total: number;
  terms: Record<string, number>;
  shownCount: number;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isLookupApiResponse(value: unknown): value is LookupApiResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return isStringArray(candidate.contextual_meanings);
}

function isLookupEventApiResponse(value: unknown): value is LookupEventApiResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.persisted !== 'boolean' ||
    typeof candidate.promoted !== 'boolean' ||
    typeof candidate.totalLookupCount !== 'number'
  ) {
    return false;
  }

  return (
    candidate.reason === undefined ||
    candidate.reason === 'unauthorized' ||
    candidate.reason === 'excluded_domain'
  );
}

async function getApiErrorMessage(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  try {
    const payload = (await response.json()) as ApiErrorResponse;
    if (typeof payload.error === 'string' && payload.error.length > 0) {
      return payload.error;
    }
    if (typeof payload.details === 'string' && payload.details.length > 0) {
      return payload.details;
    }
  } catch {
    // ignore malformed error bodies and use the fallback below
  }

  return fallbackMessage;
}

async function getApiBaseUrl(): Promise<string> {
  const value = await readStorageValue<string>(
    chrome.storage.sync,
    extensionStorageKeys.apiBaseUrl,
  );
  if (typeof value === 'string' && value.length > 0) {
    return value.replace(/\/$/, '');
  }
  return defaultApiBaseUrl;
}

async function getAuthToken(): Promise<string | null> {
  const sessionToken = await readStorageValue<string>(
    chrome.storage.session,
    extensionStorageKeys.jwt,
  );
  if (typeof sessionToken === 'string' && sessionToken.length > 0) {
    return sessionToken;
  }
  const localToken = await readStorageValue<string>(
    chrome.storage.local,
    extensionStorageKeys.jwt,
  );
  if (typeof localToken === 'string' && localToken.length > 0) {
    return localToken;
  }
  return null;
}

async function buildHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function readGuestStats(): Promise<GuestStatsStorage> {
  const raw = await readStorageValue<unknown>(
    chrome.storage.local,
    extensionStorageKeys.guestStats,
  );
  if (typeof raw !== 'object' || raw === null) {
    return { total: 0, terms: {}, shownCount: 0 };
  }
  const candidate = raw as Partial<GuestStatsStorage>;
  return {
    total: typeof candidate.total === 'number' ? candidate.total : 0,
    terms:
      typeof candidate.terms === 'object' && candidate.terms !== null
        ? candidate.terms
        : {},
    shownCount:
      typeof candidate.shownCount === 'number' ? candidate.shownCount : 0,
  };
}

function computeFomoMessage(
  nextTotal: number,
  nextTermCount: number,
  shownCount: number,
  term: string
): string | null {
  if (shownCount >= 3) return null;
  const shouldShow =
    nextTotal >= 25 || nextTermCount >= 3 || nextTotal >= 10;
  if (!shouldShow) return null;
  if (nextTermCount >= 3) return `'${term}'를 ${nextTermCount}번 다시 찾았습니다`;
  return `🚨 ${nextTotal}개는 아직 익숙하지 않습니다`;
}

async function recordGuestLookup(term: string): Promise<GuestStats> {
  const key = term.toLowerCase().trim();
  const stats = await readGuestStats();
  const nextTermCount = (stats.terms[key] ?? 0) + 1;
  const nextTotal = stats.total + 1;
  const fomoMessage = computeFomoMessage(
    nextTotal,
    nextTermCount,
    stats.shownCount,
    term
  );
  await writeStorageValue(chrome.storage.local, extensionStorageKeys.guestStats, {
    total: nextTotal,
    terms: { ...stats.terms, [key]: nextTermCount },
    shownCount: fomoMessage ? stats.shownCount + 1 : stats.shownCount,
  } satisfies GuestStatsStorage);
  return { total: nextTotal, termCount: nextTermCount, fomoMessage };
}

async function handleLookup(
  payload: LookupRequestPayload
): Promise<ExtensionMessageResponse> {
  const apiBaseUrl = await getApiBaseUrl();
  const headers = await buildHeaders();

  const lookupResponse = await fetch(`${apiBaseUrl}/api/lookup`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ word: payload.word, sentence: payload.sentence }),
  });

  if (!lookupResponse.ok) {
    return {
      ok: false,
      error: {
        message: await getApiErrorMessage(
          lookupResponse,
          `Lookup failed with status ${lookupResponse.status}`,
        ),
      },
    };
  }

  const lookupPayload = await lookupResponse.json();
  if (!isLookupApiResponse(lookupPayload)) {
    return {
      ok: false,
      error: { message: 'Lookup response shape was invalid.' },
    };
  }

  const lookupData = lookupPayload;

  const eventResponse = await fetch(`${apiBaseUrl}/api/lookup-event`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      term: payload.term,
      context: payload.context,
      meanings: lookupData.contextual_meanings,
      sourceDomain: payload.sourceDomain,
      sourcePathHash: payload.sourcePathHash,
    }),
  });

  let lookupEvent: LookupEventApiResponse | null = null;
  let guestStats: GuestStats | null = null;

  if (eventResponse.ok) {
    const eventPayload = await eventResponse.json();
    if (isLookupEventApiResponse(eventPayload)) {
      lookupEvent = eventPayload;
    } else {
      console.warn('AI English Study lookup-event response shape was invalid.', eventPayload);
    }

    if (
      lookupEvent &&
      !lookupEvent.persisted &&
      lookupEvent.reason === 'unauthorized'
    ) {
      guestStats = await recordGuestLookup(payload.term);
    }
  }

  return {
    ok: true,
    data: {
      meanings: lookupData.contextual_meanings,
      lookupEvent,
      guestStats,
    },
  };
}

async function getModifier(): Promise<ModifierMode> {
  const modifier = await readStorageValue<unknown>(
    chrome.storage.sync,
    extensionStorageKeys.modifier,
  );
  if (modifier === 'cmd_ctrl' || modifier === 'alt_option') return modifier;
  return 'alt_option';
}

async function clearAuthToken(): Promise<void> {
  await removeStorageValue(chrome.storage.session, extensionStorageKeys.jwt);
  await removeStorageValue(chrome.storage.local, extensionStorageKeys.jwt);
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync') {
    return;
  }

  const modifierChange = changes[extensionStorageKeys.modifier];
  if (!modifierChange) {
    return;
  }

  const nextModifier = modifierChange.newValue;
  if (nextModifier === 'alt_option' || nextModifier === 'cmd_ctrl') {
    broadcastModifierChange(nextModifier);
  }
});

chrome.runtime.onMessage.addListener(
  (message: any, _sender: any, sendResponse: (response: any) => void) => {
    const handler = async (
      incoming: ExtensionMessage
    ): Promise<ExtensionMessageResponse> => {
      if (incoming.type === 'FLOW_LOOKUP') {
        return handleLookup(incoming.payload);
      }
      if (incoming.type === 'FLOW_GET_MODIFIER') {
        const modifier = await getModifier();
        return { ok: true, data: { modifier } };
      }
      if (incoming.type === 'FLOW_GET_RUNTIME_CONFIG') {
        const modifier = await getModifier();
        const apiBaseUrl = await getApiBaseUrl();
        return {
          ok: true,
          data: {
            modifier,
            appUrl: defaultAppUrl,
            apiBaseUrl: apiBaseUrl || defaultApiBaseUrl,
          },
        };
      }
      if (incoming.type === 'FLOW_SET_MODIFIER') {
        await writeStorageValue(
          chrome.storage.sync,
          extensionStorageKeys.modifier,
          incoming.payload.modifier,
        );
        return { ok: true, data: { modifier: incoming.payload.modifier } };
      }
      if (incoming.type === 'FLOW_SET_JWT') {
        await writeStorageValue(
          chrome.storage.session,
          extensionStorageKeys.jwt,
          incoming.payload.token,
        );
        await writeStorageValue(
          chrome.storage.local,
          extensionStorageKeys.jwt,
          incoming.payload.token,
        );
        return { ok: true, data: { saved: true } };
      }
      if (incoming.type === 'FLOW_CLEAR_JWT') {
        await clearAuthToken();
        return { ok: true, data: { saved: true } };
      }
      return { ok: false, error: { message: 'Unknown message type.' } };
    };

    void handler(message)
      .then(sendResponse)
      .catch((error: unknown) => {
        const messageText =
          error instanceof Error ? error.message : 'Background request failed';
        sendResponse({ ok: false, error: { message: messageText } });
      });

    return true;
  }
);
