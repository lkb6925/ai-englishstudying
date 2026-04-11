import { POST as lookupPost } from '@/app/api/lookup/route';
import { POST as lookupEventPost } from '@/app/api/lookup-event/route';
import { POST as quizReviewPost } from '@/app/api/quiz-review/route';
import { extractBearerToken, parseLookupBody, parseQuizReviewBody } from '@/src/server/parsers';

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

  it('returns 503 when AI is not configured', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const response = await lookupPost(
      new Request('http://localhost/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: 'focus', sentence: 'Stay focused.' }),
      }),
    );

    expect(response.status).toBe(503);

    if (originalKey) {
      process.env.GEMINI_API_KEY = originalKey;
    }
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
