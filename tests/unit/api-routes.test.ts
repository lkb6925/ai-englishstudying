import { POST as lookupPost } from '@/app/api/lookup/route';
import { POST as lookupEventPost } from '@/app/api/lookup-event/route';
import { POST as quizReviewPost } from '@/app/api/quiz-review/route';
import { extractBearerToken, parseLookupBody, parseQuizReviewBody } from '@/src/server/parsers';

const envKeys = ['AI_PROVIDER', 'AI_API_KEY', 'GEMINI_API_KEY', 'ANTHROPIC_API_KEY', 'AI_MODEL', 'GEMINI_MODEL', 'ANTHROPIC_MODEL'] as const;
const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]])) as Record<(typeof envKeys)[number], string | undefined>;

function restoreEnv() {
  for (const key of envKeys) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

afterEach(() => {
  restoreEnv();
});

describe('server parsers', () => {
  it('parses valid lookup and quiz payloads', () => {
    expect(parseLookupBody({ word: 'focus', sentence: 'Stay focused.' })).toEqual({
      word: 'focus',
      sentence: 'Stay focused.',
    });
    expect(parseQuizReviewBody({ entryId: 'entry-1', action: 'know' })).toEqual({
      entryId: 'entry-1',
      action: 'know',
    });
  });

  it('rejects oversized lookup inputs before they reach the AI provider', () => {
    expect(() =>
      parseLookupBody({ word: 'a'.repeat(81), sentence: 'Stay focused.' }),
    ).toThrow(/word must be 80 characters or fewer/);

    expect(() =>
      parseLookupBody({ word: 'focus', sentence: 'a'.repeat(601) }),
    ).toThrow(/sentence must be 600 characters or fewer/);
  });

  it('extracts bearer tokens safely', () => {
    expect(extractBearerToken('Bearer test-token')).toBe('test-token');
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken('Basic nope')).toBeNull();
  });
});

describe('route handlers', () => {
  it('rejects invalid lookup payloads', async () => {
    const response = await lookupPost(
      new Request('http://localhost/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: '', sentence: '' }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it('returns a mock lookup response when AI_PROVIDER is mock', async () => {
    process.env.AI_PROVIDER = 'mock';
    delete process.env.AI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const response = await lookupPost(
      new Request('http://localhost/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: 'focus', sentence: 'Stay focused.' }),
      }),
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.lemma).toBe('focus');
    expect(Array.isArray(json.contextual_meanings)).toBe(true);
    expect(json.contextual_meanings.length).toBeGreaterThan(0);
  });

  it('returns 503 when AI is not configured', async () => {
    process.env.AI_PROVIDER = 'gemini';
    delete process.env.AI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const response = await lookupPost(
      new Request('http://localhost/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: 'focus', sentence: 'Stay focused.' }),
      }),
    );

    expect(response.status).toBe(503);
  });

  it('returns excluded_domain without auth for blocked hosts', async () => {
    const response = await lookupEventPost(
      new Request('http://localhost/api/lookup-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          term: 'focus',
          context: 'Stay focused.',
          sourceDomain: 'docs.google.com',
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      persisted: false,
      reason: 'excluded_domain',
    });
  });

  it('returns unauthorized for quiz review without a token', async () => {
    const response = await quizReviewPost(
      new Request('http://localhost/api/quiz-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: 'entry-1', action: 'know' }),
      }),
    );

    expect(response.status).toBe(401);
  });
});
