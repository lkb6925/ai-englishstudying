export function normalizeLemma(surface: string): string {
  return surface
    .toLowerCase()
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '')
    .trim();
}

export function findSentenceByWord(text: string, surface: string): string {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  const loweredSurface = surface.toLowerCase();

  return (
    sentences.find((sentence) =>
      sentence
        .toLowerCase()
        .split(/\s+/)
        .some((chunk) => chunk.includes(loweredSurface)),
    ) ?? text
  );
}

export function shouldExcludeDomain(hostname: string): boolean {
  const blockedTokens = ['gmail.', 'bank', 'docs.', 'localhost'];
  const lower = hostname.toLowerCase();
  return blockedTokens.some((token) => lower.includes(token));
}

export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
