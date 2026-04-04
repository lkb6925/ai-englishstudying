export type ModifierMode = 'alt_option' | 'cmd_ctrl';

export type LookupRequestPayload = {
  word: string;
  sentence: string;
  term: string;
  context: string;
  sourceDomain: string;
  sourcePathHash: string;
};

export type GuestStats = {
  total: number;
  termCount: number;
  fomoMessage: string | null;
};

export type LookupResultPayload = {
  meanings: string[];
  lookupEvent: {
    persisted: boolean;
    promoted: boolean;
    totalLookupCount: number;
    reason?: 'unauthorized' | 'excluded_domain';
  } | null;
  guestStats: GuestStats | null;
};

export type WorkerErrorPayload = {
  message: string;
};

export type ExtensionMessage =
  | {
      type: 'FLOW_LOOKUP';
      payload: LookupRequestPayload;
    }
  | {
      type: 'FLOW_GET_MODIFIER';
    }
  | {
      type: 'FLOW_SET_MODIFIER';
      payload: {
        modifier: ModifierMode;
      };
    }
  | {
      type: 'FLOW_SET_JWT';
      payload: {
        token: string;
      };
    };

export type ExtensionMessageResponse =
  | {
      ok: true;
      data: LookupResultPayload | { modifier: ModifierMode } | { saved: true };
    }
  | {
      ok: false;
      error: WorkerErrorPayload;
    };
