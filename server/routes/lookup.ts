import express from 'express';
import { generateLookupResponse, isAiConfigured } from '../lib/ai-client';
import { shouldExcludeDomain } from '../../text';
import { getRankFromCount, rankOrderValue } from '../../src/lib/rank.ts';
import type { Rank } from '../../src/lib/types.ts';
import type { AppContext, UserScopedSupabase } from '../lib/context.ts';
import {
  parseLookupBody,
  parseLookupEventBody,
  sanitizeMeanings,
  type LookupResponse,
} from '../lib/parsers.ts';

function parseLookupResponse(
  payload: unknown,
  fallbackLemma: string,
): LookupResponse {
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

async function lookupContextualMeanings(
  word: string,
  sentence: string,
): Promise<LookupResponse> {
  return generateLookupResponse(word, sentence);
}

async function getPlanTier(
  userDb: UserScopedSupabase | null,
  userId: string,
): Promise<'free' | 'premium'> {
  if (!userDb) {
    return 'free';
  }

  const { data } = await userDb
    .from('profiles')
    .select('plan_tier')
    .eq('id', userId)
    .maybeSingle();

  return data?.plan_tier === 'premium' ? 'premium' : 'free';
}

function extractJWT(req: express.Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  return null;
}

export function createLookupRouter(appContext: AppContext): express.Router {
  const router = express.Router();

  router.post('/lookup', async (req, res) => {
    let word: string;
    let sentence: string;

    try {
      ({ word, sentence } = parseLookupBody(req.body));
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid request body',
      });
    }

    if (!isAiConfigured()) {
      return res.status(503).json({ error: 'AI lookup is not configured on the server' });
    }

    try {
      const result = await lookupContextualMeanings(word, sentence);
      return res.json(result);
    } catch (error) {
      console.error('Lookup error:', error);
      const errMsg = String(error);

      if (errMsg.includes('HTTP 429') || errMsg.includes('HTTP 529') || errMsg.toLowerCase().includes('quota')) {
        return res.status(503).json({ error: 'AI lookup is currently unavailable' });
      }

      return res.status(500).json({ error: 'AI lookup failed', details: errMsg });
    }
  });

  router.post('/lookup-event', async (req, res) => {
    let body: ReturnType<typeof parseLookupEventBody>;

    try {
      body = parseLookupEventBody(req.body);
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid request body',
      });
    }

    const { term, context, meanings, sourceDomain, sourcePathHash } = body;
    const jwt = extractJWT(req);

    if (sourceDomain && shouldExcludeDomain(sourceDomain)) {
      return res.json({
        persisted: false,
        totalLookupCount: 0,
        promoted: false,
        reason: 'excluded_domain',
        planTier: null,
      });
    }

    if (!jwt) {
      return res.json({
        persisted: false,
        totalLookupCount: 1,
        promoted: false,
        reason: 'unauthorized',
        planTier: null,
      });
    }

    const user = await appContext.getSupabaseUser(jwt);
    const userDb = appContext.createUserScopedSupabase(jwt);

    if (!user || !userDb) {
      return res.json({
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

      const planTier = await getPlanTier(userDb, user.id);

      const { error: insertEventError } = await userDb
        .from('lookup_events')
        .insert({
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
        promoted =
          rankOrderValue(nextRank) <
          rankOrderValue(existingEntry.rank as Rank);

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

      return res.json({
        persisted: true,
        totalLookupCount,
        promoted,
        planTier,
      });
    } catch (error) {
      console.error('Lookup event error:', error);
      return res.status(500).json({ error: 'Failed to record lookup event' });
    }
  });

  return router;
}
