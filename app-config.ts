const LOCAL_APP_ORIGIN = 'http://localhost:3000';

function sanitizeUrl(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

export function resolveAppOrigin(appUrl?: string | null): string {
  return sanitizeUrl(appUrl) ?? LOCAL_APP_ORIGIN;
}

export function resolveApiBaseUrl(
  apiBaseUrl?: string | null,
  appUrl?: string | null,
): string {
  return sanitizeUrl(apiBaseUrl) ?? resolveAppOrigin(appUrl);
}

export function getTrustedAuthBridgeOrigins(appUrl?: string | null): string[] {
  return [resolveAppOrigin(appUrl)];
}

export function getChromeExtensionHostPermissions(
  apiBaseUrl?: string | null,
  appUrl?: string | null,
): string[] {
  const appOrigin = new URL(resolveAppOrigin(appUrl)).origin;
  const apiOrigin = new URL(resolveApiBaseUrl(apiBaseUrl, appUrl)).origin;

  return Array.from(new Set([appOrigin, apiOrigin])).map(
    (origin) => `${origin}/*`,
  );
}

export function getWordbookUrl(appUrl?: string | null): string {
  return `${resolveAppOrigin(appUrl)}/wordbook`;
}

export function getSetupUrl(appUrl?: string | null): string {
  return `${resolveAppOrigin(appUrl)}/setup`;
}
