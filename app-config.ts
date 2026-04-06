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

function isLocalhostOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function resolveCodespacesOrigin(
  codespaceName?: string | null,
  forwardingDomain?: string | null,
  port = '3000',
): string | null {
  const normalizedCodespaceName = codespaceName?.trim();
  const normalizedForwardingDomain = forwardingDomain?.trim();

  if (!normalizedCodespaceName || !normalizedForwardingDomain) {
    return null;
  }

  return `https://${normalizedCodespaceName}-${port}.${normalizedForwardingDomain}`;
}

export function resolveAppOrigin(
  appUrl?: string | null,
  codespaceName?: string | null,
  forwardingDomain?: string | null,
): string {
  const sanitizedAppUrl = sanitizeUrl(appUrl);
  const codespacesOrigin = resolveCodespacesOrigin(
    codespaceName,
    forwardingDomain,
  );

  if (sanitizedAppUrl && !isLocalhostOrigin(sanitizedAppUrl)) {
    return sanitizedAppUrl;
  }

  if (codespacesOrigin) {
    return codespacesOrigin;
  }

  return sanitizedAppUrl ?? LOCAL_APP_ORIGIN;
}

export function resolveApiBaseUrl(
  apiBaseUrl?: string | null,
  appUrl?: string | null,
  codespaceName?: string | null,
  forwardingDomain?: string | null,
): string {
  const sanitizedApiBaseUrl = sanitizeUrl(apiBaseUrl);
  if (sanitizedApiBaseUrl && !isLocalhostOrigin(sanitizedApiBaseUrl)) {
    return sanitizedApiBaseUrl;
  }

  return (
    resolveCodespacesOrigin(codespaceName, forwardingDomain) ??
    sanitizedApiBaseUrl ??
    resolveAppOrigin(appUrl, codespaceName, forwardingDomain)
  );
}

export function getTrustedAuthBridgeOrigins(
  appUrl?: string | null,
  codespaceName?: string | null,
  forwardingDomain?: string | null,
): string[] {
  return [resolveAppOrigin(appUrl, codespaceName, forwardingDomain)];
}

export function getChromeExtensionHostPermissions(
  apiBaseUrl?: string | null,
  appUrl?: string | null,
  codespaceName?: string | null,
  forwardingDomain?: string | null,
): string[] {
  const appOrigin = new URL(
    resolveAppOrigin(appUrl, codespaceName, forwardingDomain),
  ).origin;
  const apiOrigin = new URL(
    resolveApiBaseUrl(apiBaseUrl, appUrl, codespaceName, forwardingDomain),
  ).origin;

  return Array.from(new Set([appOrigin, apiOrigin])).map(
    (origin) => `${origin}/*`,
  );
}

export function getWordbookUrl(
  appUrl?: string | null,
  codespaceName?: string | null,
  forwardingDomain?: string | null,
): string {
  return `${resolveAppOrigin(appUrl, codespaceName, forwardingDomain)}/wordbook`;
}

export function getSetupUrl(
  appUrl?: string | null,
  codespaceName?: string | null,
  forwardingDomain?: string | null,
): string {
  return `${resolveAppOrigin(appUrl, codespaceName, forwardingDomain)}/setup`;
}
