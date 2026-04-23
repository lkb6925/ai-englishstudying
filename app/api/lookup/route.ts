import { NextResponse } from 'next/server';
import { generateLookupResponse, isAiConfigured } from '@/src/server/ai-client';
import { parseLookupBody } from '@/src/server/parsers';

export const runtime = 'nodejs';

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

  try {
    if (!isAiConfigured()) {
      return NextResponse.json({ error: 'AI lookup is not configured on the server' }, { status: 503 });
    }

    return NextResponse.json(await generateLookupResponse(word, sentence));
  } catch (error) {
    const errMsg = String(error);

    if (
      errMsg.includes('not configured') ||
      errMsg.includes('HTTP 429') ||
      errMsg.includes('HTTP 529') ||
      errMsg.toLowerCase().includes('quota') ||
      errMsg.toLowerCase().includes('overloaded')
    ) {
      return NextResponse.json({ error: 'AI lookup is currently unavailable' }, { status: 503 });
    }

    return NextResponse.json(
      { error: 'AI lookup failed', details: errMsg },
      { status: 500 },
    );
  }
}
