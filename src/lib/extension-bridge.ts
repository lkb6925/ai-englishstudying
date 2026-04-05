type ExtensionAuthBridgeMessage =
  | {
      source: 'tap-and-know-auth';
      type: 'SUPABASE_JWT';
      token: string;
    }
  | {
      source: 'tap-and-know-auth';
      type: 'SUPABASE_LOGOUT';
    };

function postBridgeMessage(message: ExtensionAuthBridgeMessage) {
  if (typeof window === 'undefined') {
    return;
  }

  window.postMessage(message, window.location.origin);
}

export function syncExtensionJwt(token: string) {
  postBridgeMessage({
    source: 'tap-and-know-auth',
    type: 'SUPABASE_JWT',
    token,
  });
}

export function clearExtensionJwt() {
  postBridgeMessage({
    source: 'tap-and-know-auth',
    type: 'SUPABASE_LOGOUT',
  });
}
