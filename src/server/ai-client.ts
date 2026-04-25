import { GoogleGenAI } from '@google/genai';
import { sanitizeMeanings, type LookupResponse } from './parsers';

export type AiProvider = 'gemini' | 'anthropic' | 'mock';

export type AiConfig = {
  provider: AiProvider;
  apiKey: string;
  model: string;
};

export type AiTextOptions = {
  system?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
};

const DEFAULT_MODELS: Record<AiProvider, string> = {
  gemini: 'gemini-2.0-flash',
  anthropic: 'claude-3-5-sonnet-20241022',
  mock: 'mock',
};

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_VERSION = '2023-06-01';

function normalizeProvider(raw: string | null | undefined): AiProvider | null {
  const provider = raw?.trim().toLowerCase();
  if (!provider) {
    return null;
  }

  if (provider === 'gemini' || provider === 'google' || provider === 'google-genai') {
    return 'gemini';
  }

  if (provider === 'anthropic' || provider === 'claude') {
    return 'anthropic';
  }

  if (provider === 'mock' || provider === 'test' || provider === 'local') {
    return 'mock';
  }

  return null;
}

function detectProvider(): AiProvider | null {
  const explicit = normalizeProvider(process.env.AI_PROVIDER);
  if (explicit) {
    return explicit;
  }

  if (process.env.AI_API_KEY) {
    return 'gemini';
  }

  if (process.env.GEMINI_API_KEY) {
    return 'gemini';
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return 'anthropic';
  }

  if (process.env.NODE_ENV === 'test') {
    return 'mock';
  }

  return null;
}

function resolveApiKey(provider: AiProvider): string {
  if (provider === 'gemini') {
    return process.env.GEMINI_API_KEY?.trim() || process.env.AI_API_KEY?.trim() || '';
  }

  if (provider === 'anthropic') {
    return process.env.ANTHROPIC_API_KEY?.trim() || process.env.AI_API_KEY?.trim() || '';
  }

  return '';
}

function resolveModel(provider: AiProvider): string {
  if (provider === 'gemini') {
    return (
      process.env.GEMINI_MODEL?.trim() ||
      process.env.AI_MODEL?.trim() ||
      DEFAULT_MODELS.gemini
    );
  }

  if (provider === 'anthropic') {
    return (
      process.env.ANTHROPIC_MODEL?.trim() ||
      process.env.AI_MODEL?.trim() ||
      DEFAULT_MODELS.anthropic
    );
  }

  return DEFAULT_MODELS.mock;
}

export function getAiProvider(): AiProvider | null {
  return detectProvider();
}

export function getAiApiKey(provider: AiProvider = getAiProvider() ?? 'gemini'): string {
  return resolveApiKey(provider);
}

export function getAiModel(provider: AiProvider = getAiProvider() ?? 'gemini'): string {
  return resolveModel(provider);
}

export function getAiConfig(): AiConfig | null {
  const provider = detectProvider();
  if (!provider) {
    return null;
  }

  const apiKey = resolveApiKey(provider);
  if (!apiKey && provider !== 'mock') {
    return null;
  }

  return {
    provider,
    apiKey,
    model: resolveModel(provider),
  };
}

export function isAiConfigured(): boolean {
  return getAiConfig() !== null;
}

function extractTextFromGemini(response: unknown): string {
  if (!response || typeof response !== 'object') {
    throw new Error('Gemini response payload was invalid');
  }

  const text = (response as { text?: unknown }).text;
  if (typeof text === 'string' && text.trim()) {
    return text.trim();
  }

  throw new Error('Gemini returned no text content');
}

function buildMockText(prompt: string): string {
  const lookupMatch = prompt.match(/word\s+"([^"]+)"[\s\S]*?sentence:\s*"([^"]+)"/i);

  if (lookupMatch) {
    const word = lookupMatch[1].trim();
    const sentence = lookupMatch[2].trim();
    const contextualMeanings = [
      `${word}의 문맥상 의미`,
      `${sentence.slice(0, 24)}…에서의 의미`,
    ];

    return JSON.stringify({
      lemma: word,
      contextual_meanings: contextualMeanings,
    });
  }

  return `# Mock AI Review

> This is a deterministic local fallback for testing.

## Critical
- No external API call was made.

## Architecture
- This provider keeps tests and local smoke checks offline.

## Performance
- Fast and deterministic.

## Readability
- Good enough for app tests.

## Recommended Patch
\`\`\`ts
// mock provider
\`\`\`

## Next Step
Wire the real provider only when you need live model output.
`;
}

function extractTextFromAnthropic(responseBody: unknown): string {
  if (!responseBody || typeof responseBody !== 'object') {
    throw new Error('Anthropic response payload was invalid');
  }

  const candidate = responseBody as { content?: unknown; output_text?: unknown };
  const parts = Array.isArray(candidate.content) ? candidate.content : [];

  const contentText = parts
    .map((part) => {
      if (!part || typeof part !== 'object') {
        return '';
      }

      const text = (part as { text?: unknown }).text;
      return typeof text === 'string' ? text : '';
    })
    .join('')
    .trim();

  if (contentText) {
    return contentText;
  }

  if (typeof candidate.output_text === 'string' && candidate.output_text.trim()) {
    return candidate.output_text.trim();
  }

  throw new Error('Anthropic returned no text content');
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();

  if (trimmed.startsWith('```')) {
    const firstNewline = trimmed.indexOf('\n');
    const lastFence = trimmed.lastIndexOf('```');
    if (firstNewline >= 0 && lastFence > firstNewline) {
      return trimmed.slice(firstNewline + 1, lastFence).trim();
    }
  }

  return trimmed;
}

function parseJsonFromText(text: string): unknown {
  const cleaned = stripCodeFences(text);
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const candidate = firstBrace >= 0 && lastBrace > firstBrace ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned;

  try {
    return JSON.parse(candidate);
  } catch {
    throw new Error(`AI response was not valid JSON: ${cleaned}`);
  }
}

async function generateGeminiText(prompt: string, options: AiTextOptions = {}): Promise<string> {
  const config = getAiConfig();
  if (!config || config.provider !== 'gemini') {
    throw new Error('AI lookup is not configured on the server');
  }

  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  const response = await ai.models.generateContent({
    model: options.model ?? config.model,
    contents: prompt,
    config: {
      ...(options.system ? { systemInstruction: options.system } : {}),
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxTokens ?? 1024,
    },
  });

  return extractTextFromGemini(response);
}

async function generateAnthropicText(prompt: string, options: AiTextOptions = {}): Promise<string> {
  const config = getAiConfig();
  if (!config || config.provider !== 'anthropic') {
    throw new Error('AI lookup is not configured on the server');
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'anthropic-version': ANTHROPIC_API_VERSION,
      'x-api-key': config.apiKey,
    },
    body: JSON.stringify({
      model: options.model ?? config.model,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.2,
      ...(options.system ? { system: options.system } : {}),
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: prompt }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Anthropic HTTP ${response.status}: ${errBody}`);
  }

  const data = (await response.json()) as unknown;
  return extractTextFromAnthropic(data);
}

export async function generateAiText(prompt: string, options: AiTextOptions = {}): Promise<string> {
  const provider = getAiProvider();

  if (provider === 'gemini') {
    return generateGeminiText(prompt, options);
  }

  if (provider === 'anthropic') {
    return generateAnthropicText(prompt, options);
  }

  if (provider === 'mock') {
    return buildMockText(prompt);
  }

  throw new Error('AI lookup is not configured on the server');
}

export async function generateLookupResponse(word: string, sentence: string): Promise<LookupResponse> {
  const prompt = `Analyze the word "${word}" in the context of this sentence: "${sentence}".
Return valid JSON only with these keys:
{
  "lemma": "the dictionary form of the word",
  "contextual_meanings": ["1-2 concise contextual meanings in Korean"]
}
Do not include markdown, code fences, or commentary.`;

  const responseText = await generateAiText(prompt, {
    system: 'You are an English study assistant. Return concise, accurate Korean contextual meanings as strict JSON.',
    maxTokens: 256,
    temperature: 0.2,
  });

  const payload = parseJsonFromText(responseText);
  if (!payload || typeof payload !== 'object') {
    throw new Error('AI lookup payload was invalid');
  }

  const candidate = payload as Record<string, unknown>;
  const meanings = sanitizeMeanings(candidate.contextual_meanings);
  if (meanings.length === 0) {
    throw new Error('AI response did not include contextual meanings');
  }

  const lemma = typeof candidate.lemma === 'string' && candidate.lemma.trim() ? candidate.lemma.trim() : word;

  return {
    lemma,
    contextual_meanings: meanings,
  };
}

export {
  generateAiText as generateAnthropicText,
  getAiConfig as getAnthropicConfig,
  getAiApiKey as getAnthropicApiKey,
  getAiModel as getAnthropicModel,
  isAiConfigured as isAnthropicConfigured,
};
