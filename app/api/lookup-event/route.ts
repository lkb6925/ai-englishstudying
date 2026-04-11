import { NextResponse } from 'next/server';
import { shouldExcludeDomain } from '@/text';
import { getRankFromCount, rankOrderValue } from '@/src/lib/rank';
import type { Rank } from '@/src/lib/types';
import { createUserScopedSupabase, getSupabaseUser } from '@/src/server/context';
import { extractBearerToken, parseLookupEventBody, sanitizeMeanings } from '@/src/server/parsers';

export const runtime = 'nodejs';

async function getPlanTier(userId: string, jwt: string): Promise<'free' | 'premium'> {
  const userDb = createUserScopedSupabase(jwt);
  if (!userDb) {
    return 'free';
  }

  const { data } = await userDb.from('profiles').select('plan_tier').eq('id', userId).maybeSingle();
  return data?.plan_tier === 'premium' ? 'premium' : 'free';
}

export async function POST(request: Request) {
  let body: ReturnType<typeof parseLookupEventBody>;

  try {
    body = parseLookupEventBody(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid request body' },
      { status: 400 },
    );
  }

  const { term, context, meanings, sourceDomain, sourcePathHash } = body;
  const jwt = extractBearerToken(request.headers.get('authorization'));

  if (sourceDomain && shouldExcludeDomain(sourceDomain)) {
    return NextResponse.json({
      persisted: false,
      totalLookupCount: 0,
      promoted: false,
      reason: 'excluded_domain',
      planTier: null,
    });
  }

  if (!jwt) {
    return NextResponse.json({
      persisted: false,
      totalLookupCount: 1,
      promoted: false,
      reason: 'unauthorized',
      planTier: null,
    });
  }

  const user = await getSupabaseUser(jwt);
  const userDb = createUserScopedSupabase(jwt);

  if (!user || !userDb) {
    return NextResponse.json({
      persisted: false,
      totalLookupCount: 1,
      promoted: false,
      reason: 'unauthorized',
      planTier: null,
    });
  }

  try {
    const normalizedTerm = term.toLowerCase().trim();
    const safeContext = context?.slice(0, 300) || null;
    const safeMeanings = sanitizeMeanings(meanings);
    const now = new Date().toISOString();

    const { count: previousLookupCount, error: countError } = await userDb
      .from('lookup_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('normalized_term', normalizedTerm);

    if (countError) {
      throw countError;
    }

    const totalLookupCount = (previousLookupCount ?? 0) + 1;
    const nextRank = getRankFromCount(totalLookupCount);

    const { data: existingEntry, error: existingError } = await userDb
      .from('wordbook_entries')
      .select('id, rank, meaning_snapshot')
      .eq('user_id', user.id)
      .eq('normalized_term', normalizedTerm)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    const planTier = await getPlanTier(user.id, jwt);

    const { error: insertEventError } = await userDb.from('lookup_events').insert({
      user_id: user.id,
      term,
      normalized_term: normalizedTerm,
      context: safeContext,
      source_domain: sourceDomain ?? null,
      source_path_hash: sourcePathHash ?? null,
    });

    if (insertEventError) {
      throw insertEventError;
    }

    let promoted = false;

    if (existingEntry) {
      promoted = rankOrderValue(nextRank) < rankOrderValue(existingEntry.rank as Rank);

      const { error: updateEntryError } = await userDb
        .from('wordbook_entries')
        .update({
          total_lookup_count: totalLookupCount,
          rank: nextRank,
          last_seen_at: now,
          context_sample: safeContext,
          meaning_snapshot: safeMeanings.length > 0 ? safeMeanings : existingEntry.meaning_snapshot,
        })
        .eq('id', existingEntry.id);

      if (updateEntryError) {
        throw updateEntryError;
      }
    } else if (totalLookupCount >= 2) {
      promoted = true;

      const { error: insertEntryError } = await userDb.from('wordbook_entries').insert({
        user_id: user.id,
        term,
        normalized_term: normalizedTerm,
        context_sample: safeContext,
        meaning_snapshot: safeMeanings.length > 0 ? safeMeanings : null,
        total_lookup_count: totalLookupCount,
        rank: nextRank,
        last_seen_at: now,
      });

      if (insertEntryError) {
        throw insertEntryError;
      }
    }

    return NextResponse.json({
      persisted: true,
      totalLookupCount,
      promoted,
      planTier,
    });
  } catch (error) {
    console.error('Lookup event error:', error);
    return NextResponse.json({ error: 'Failed to record lookup event' }, { status: 500 });
  }
}
