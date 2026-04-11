import { Type } from '@google/genai';
import { NextResponse } from 'next/server';
import { getAiClient, getGeminiModel } from '@/src/server/context';
import { parseLookupBody, sanitizeMeanings, type LookupResponse } from '@/src/server/parsers';

export const runtime = 'nodejs';

function parseLookupResponse(payload: unknown, fallbackLemma: string): LookupResponse {
  if (!payload || typeof payload !== 'object') {
    throw new Error('AI response payload was invalid');
  }

  const candidate = payload as Record<string, unknown>;
  const meanings = sanitizeMeanings(candidate.contextual_meanings);
  if (meanings.length === 0) {
    throw new Error('AI response did not include contextual meanings');
  }

  const lemma =
    typeof candidate.lemma === 'string' && candidate.lemma.trim()
      ? candidate.lemma.trim()
      : fallbackLemma;

  return {
    lemma,
    contextual_meanings: meanings,
  };
}

export async function POST(request: Request) {
  let word: string;
  let sentence: string;

  try {
    const json = await request.json();
    ({ word, sentence } = parseLookupBody(json));
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Invalid request body',
      },
      { status: 400 },
    );
  }

  const ai = getAiClient();
  if (!ai) {
    return NextResponse.json(
      { error: 'AI lookup is not configured on the server' },
      { status: 503 },
    );
  }

  try {
    const response = await ai.models.generateContent({
      model: getGeminiModel(),
      contents: `Analyze the word "${word}" in the context of this sentence: "${sentence}". Provide 1-2 concise contextual meanings in Korean.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lemma: {
              type: Type.STRING,
              description: 'The dictionary form of the word',
            },
            contextual_meanings: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '1-2 concise contextual meanings in Korean',
            },
          },
          required: ['lemma', 'contextual_meanings'],
        },
      },
    });

    return NextResponse.json(parseLookupResponse(JSON.parse(response.text || '{}'), word));
  } catch (error) {
    const errMsg = String(error);

    if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.toLowerCase().includes('quota')) {
      return NextResponse.json(
        { error: 'AI lookup quota is currently exhausted' },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: 'AI lookup failed', details: errMsg },
      { status: 500 },
    );
  }
}
