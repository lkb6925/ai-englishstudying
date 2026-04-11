import { NextResponse } from 'next/server';
import { decreaseDangerRank, resetDangerRank } from '@/src/lib/rank';
import type { Rank } from '@/src/lib/types';
import { createUserScopedSupabase, getSupabaseUser } from '@/src/server/context';
import { extractBearerToken, parseQuizReviewBody } from '@/src/server/parsers';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { entryId, action } = parseQuizReviewBody(await request.json());
    const jwt = extractBearerToken(request.headers.get('authorization'));

    if (!jwt) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getSupabaseUser(jwt);
    const userDb = createUserScopedSupabase(jwt);

    if (!user || !userDb) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: entry, error: entryError } = await userDb
      .from('wordbook_entries')
      .select('id, rank')
      .eq('id', entryId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (entryError) {
      throw entryError;
    }

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const nextRank = action === 'know' ? decreaseDangerRank(entry.rank as Rank) : resetDangerRank();

    const { error: updateError } = await userDb
      .from('wordbook_entries')
      .update({ rank: nextRank })
      .eq('id', entryId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, entryId, nextRank });
  } catch (error) {
    if (error instanceof Error && error.message.includes('action must be')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Quiz review error:', error);
    return NextResponse.json({ error: 'Failed to process review' }, { status: 500 });
  }
}
