import { NextResponse } from 'next/server';
import { generateLookupResponse, isAiConfigured } from '@/src/server/ai-client';
import { parseLookupBody } from '@/src/server/parsers';

export const runtime = 'nodejs';

const MAX_LOOKUP_BODY_BYTES = 4096;
const LOOKUP_RATE_LIMIT_WINDOW_MS = 60_000;
const LOOKUP_RATE_LIMIT_MAX = 20;
const lookupRateLimitBuckets = new Map<string, number[]>();

function getClientRateLimitKey(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

function isLookupRateLimited(request: Request): boolean {
  const key = getClientRateLimitKey(request);
  const now = Date.now();
  const cutoff = now - LOOKUP_RATE_LIMIT_WINDOW_MS;
  const timestamps = (lookupRateLimitBuckets.get(key) ?? []).filter(
    (timestamp) => timestamp > cutoff,
  );

  if (timestamps.length >= LOOKUP_RATE_LIMIT_MAX) {
    lookupRateLimitBuckets.set(key, timestamps);
    return true;
  }

  timestamps.push(now);
  lookupRateLimitBuckets.set(key, timestamps);
  return false;
}

function isTemporarilyUnavailableAiError(errMsg: string): boolean {
  const normalized = errMsg.toLowerCase();
  return (
    errMsg.includes('not configured') ||
    errMsg.includes('HTTP 400') ||
    errMsg.includes('HTTP 401') ||
    errMsg.includes('HTTP 403') ||
    errMsg.includes('HTTP 429') ||
    errMsg.includes('HTTP 503') ||
    errMsg.includes('HTTP 529') ||
    normalized.includes('api key') ||
    normalized.includes('invalid_argument') ||
    normalized.includes('unavailable') ||
    normalized.includes('quota') ||
    normalized.includes('high demand') ||
    normalized.includes('overloaded')
  );
}

async function readBoundedJson(request: Request): Promise<unknown> {
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_LOOKUP_BODY_BYTES) {
    throw new Error('request body is too large');
  }
  return JSON.parse(rawBody);
}

export async function POST(request: Request) {
  if (isLookupRateLimited(request)) {
    return NextResponse.json({ error: 'Too many lookup requests' }, { status: 429 });
  }

  let word: string;
  let sentence: string;

  try {
    const json = await readBoundedJson(request);
    ({ word, sentence } = parseLookupBody(json));
  } catch (error) {
    const message =
      error instanceof Error &&
      (error.message.includes('characters or fewer') ||
        error.message === 'request body is too large')
        ? error.message
        : 'Invalid request body';

    return NextResponse.json(
      {
        error: message,
      },
      { status: 400 },
    );
  }

  try {
    if (!isAiConfigured()) {
      return NextResponse.json({ error: 'AI lookup is not configured on the server' }, { status: 503 });
    }

    return NextResponse.json(await generateLookupResponse(word, sentence));
  } catch (error) {
    const errMsg = String(error);

    if (isTemporarilyUnavailableAiError(errMsg)) {
      return NextResponse.json({ error: 'AI lookup is currently unavailable' }, { status: 503 });
    }

    console.error('AI lookup failed:', error);
    return NextResponse.json({ error: 'AI lookup failed' }, { status: 500 });
  }
}
