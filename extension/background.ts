import type {
  ExtensionMessage,
  ExtensionMessageResponse,
  GuestStats,
  LookupRequestPayload,
  ModifierMode,
} from './messages';

const defaultApiBaseUrl = 'http://localhost:3000'; // Default for dev
const modifierStorageKey = 'flow_reader_modifier';
const jwtStorageKey = 'supabase_jwt';
const guestStatsStorageKey = 'flow_reader_guest_stats';

type LookupApiResponse = {
  contextual_meanings: string[];
};

type LookupEventApiResponse = {
  persisted: boolean;
  promoted: boolean;
  totalLookupCount: number;
  reason?: 'unauthorized' | 'excluded_domain';
};

type GuestStatsStorage = {
  total: number;
  terms: Record<string, number>;
  shownCount: number;
};

async function getApiBaseUrl(): Promise<string> {
  const storage = await chrome.storage.sync.get('flow_reader_api_base_url');
  const value = storage.flow_reader_api_base_url;

  if (typeof value === 'string' && value.length > 0) {
    return value.replace(/\/$/, '');
  }

  return defaultApiBaseUrl;
}

async function getAuthToken(): Promise<string | null> {
  const sessionValues = await chrome.storage.session.get(jwtStorageKey);
  const sessionToken = sessionValues[jwtStorageKey];
  if (typeof sessionToken === 'string' && sessionToken.length > 0) {
    return sessionToken;
  }

  const localValues = await chrome.storage.local.get(jwtStorageKey);
  const localToken = localValues[jwtStorageKey];
  if (typeof localToken === 'string' && localToken.length > 0) {
    return localToken;
  }

  return null;
}

async function buildHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function readGuestStats(): Promise<GuestStatsStorage> {
  const values = await chrome.storage.local.get(guestStatsStorageKey);
  const raw = values[guestStatsStorageKey];

  if (typeof raw !== 'object' || raw === null) {
    return { total: 0, terms: {}, shownCount: 0 };
  }

  const candidate = raw as Partial<GuestStatsStorage>;
  return {
    total: typeof candidate.total === 'number' ? candidate.total : 0,
    terms: typeof candidate.terms === 'object' && candidate.terms !== null ? candidate.terms : {},
    shownCount: typeof candidate.shownCount === 'number' ? candidate.shownCount : 0,
  };
}

function computeFomoMessage(nextTotal: number, nextTermCount: number, shownCount: number, term: string): string | null {
  if (shownCount >= 3) {
    return null;
  }

  const shouldShow = nextTotal >= 25 || nextTermCount >= 3 || nextTotal >= 10;
  if (!shouldShow) {
    return null;
  }

  if (nextTermCount >= 3) {
    return `'${term}'를 ${nextTermCount}번 다시 찾았습니다`;
  }

  return `🚨 ${nextTotal}개는 아직 익숙하지 않습니다`;
}

async function recordGuestLookup(term: string): Promise<GuestStats> {
  const key = term.toLowerCase().trim();
  const stats = await readGuestStats();

  const nextTermCount = (stats.terms[key] ?? 0) + 1;
  const nextTotal = stats.total + 1;

  const fomoMessage = computeFomoMessage(nextTotal, nextTermCount, stats.shownCount, term);

  await chrome.storage.local.set({
    [guestStatsStorageKey]: {
      total: nextTotal,
      terms: {
        ...stats.terms,
        [key]: nextTermCount,
      },
      shownCount: fomoMessage ? stats.shownCount + 1 : stats.shownCount,
    } satisfies GuestStatsStorage,
  });

  return {
    total: nextTotal,
    termCount: nextTermCount,
    fomoMessage,
  };
}

async function handleLookup(payload: LookupRequestPayload): Promise<ExtensionMessageResponse> {
  const apiBaseUrl = await getApiBaseUrl();
  const headers = await buildHeaders();

  const lookupResponse = await fetch(`${apiBaseUrl}/api/lookup`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      word: payload.word,
      sentence: payload.sentence,
    }),
  });

  if (!lookupResponse.ok) {
    return {
      ok: false,
      error: { message: `Lookup failed with status ${lookupResponse.status}` },
    };
  }

  const lookupData = (await lookupResponse.json()) as LookupApiResponse;

  const eventResponse = await fetch(`${apiBaseUrl}/api/lookup-event`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      term: payload.term,
      context: payload.context,
      sourceDomain: payload.sourceDomain,
      sourcePathHash: payload.sourcePathHash,
    }),
  });

  let lookupEvent: LookupEventApiResponse | null = null;
  let guestStats: GuestStats | null = null;

  if (eventResponse.ok) {
    lookupEvent = (await eventResponse.json()) as LookupEventApiResponse;
    if (!lookupEvent.persisted && lookupEvent.reason === 'unauthorized') {
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
  const values = await chrome.storage.sync.get(modifierStorageKey);
  const modifier = values[modifierStorageKey];

  if (modifier === 'cmd_ctrl' || modifier === 'alt_option') {
    return modifier;
  }

  return 'alt_option';
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handler = async (incoming: ExtensionMessage): Promise<ExtensionMessageResponse> => {
    if (incoming.type === 'FLOW_LOOKUP') {
      return handleLookup(incoming.payload);
    }

    if (incoming.type === 'FLOW_GET_MODIFIER') {
      const modifier = await getModifier();
      return {
        ok: true,
        data: { modifier },
      };
    }

    if (incoming.type === 'FLOW_SET_MODIFIER') {
      await chrome.storage.sync.set({ [modifierStorageKey]: incoming.payload.modifier });
      return {
        ok: true,
        data: { modifier: incoming.payload.modifier },
      };
    }

    if (incoming.type === 'FLOW_SET_JWT') {
      await chrome.storage.session.set({ [jwtStorageKey]: incoming.payload.token });
      await chrome.storage.local.set({ [jwtStorageKey]: incoming.payload.token });
      return {
        ok: true,
        data: { saved: true },
      };
    }

    return {
      ok: false,
      error: { message: 'Unknown message type.' },
    };
  };

  void handler(message)
    .then((response) => {
      sendResponse(response);
    })
    .catch((error: unknown) => {
      const messageText = error instanceof Error ? error.message : 'Background request failed';
      sendResponse({
        ok: false,
        error: { message: messageText },
      });
    });

  return true;
});
