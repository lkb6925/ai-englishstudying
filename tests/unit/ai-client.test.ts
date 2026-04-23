import { afterEach, describe, expect, it } from 'vitest';
import { generateAiText, getAiConfig, getAiModel } from '@/src/server/ai-client';

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

describe('ai client config', () => {
  it('prefers provider-specific model names over AI_MODEL', () => {
    process.env.AI_PROVIDER = 'gemini';
    process.env.GEMINI_API_KEY = 'gemini-key';
    process.env.AI_MODEL = 'mock';
    process.env.GEMINI_MODEL = 'gemini-1.5-pro';

    expect(getAiModel('gemini')).toBe('gemini-1.5-pro');
    expect(getAiConfig()).toMatchObject({
      provider: 'gemini',
      model: 'gemini-1.5-pro',
      apiKey: 'gemini-key',
    });
  });

  it('uses the mock provider for deterministic local text', async () => {
    process.env.AI_PROVIDER = 'mock';
    delete process.env.AI_API_KEY;

    const jsonText = await generateAiText('Please analyze the word "focus" using sentence: "Stay focused."');
    const parsed = JSON.parse(jsonText) as { lemma: string; contextual_meanings: string[] };

    expect(parsed.lemma).toBe('focus');
    expect(parsed.contextual_meanings.length).toBeGreaterThan(0);
  });
});
