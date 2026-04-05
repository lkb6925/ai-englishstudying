export function normalizeLemma(surface: string): string {
  return surface
    .toLowerCase()
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '')
    .trim();
}

export function findSentenceByWord(text: string, surface: string): string {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const lower = surface.toLowerCase();
  return (
    sentences.find((s) =>
      s
        .toLowerCase()
        .split(/\s+/)
        .some((chunk) => chunk.includes(lower))
    ) ?? text
  );
}

export function shouldExcludeDomain(hostname: string): boolean {
  const blocked = ['gmail.', 'bank', 'docs.', 'localhost'];
  const lower = hostname.toLowerCase();
  return blocked.some((t) => lower.includes(t));
}

export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
