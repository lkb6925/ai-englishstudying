import express from 'express';
import {
  decreaseDangerRank,
  resetDangerRank,
} from '../../src/lib/rank.ts';
import type { Rank } from '../../src/lib/types.ts';
import type { AppContext } from '../lib/context.ts';
import { parseQuizReviewBody } from '../lib/parsers.ts';

function extractJWT(req: express.Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  return null;
}

export function createQuizRouter(appContext: AppContext): express.Router {
  const router = express.Router();

  router.post('/quiz-review', async (req, res) => {
    try {
      const { entryId, action } = parseQuizReviewBody(req.body);
      const jwt = extractJWT(req);

      if (!jwt) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await appContext.getSupabaseUser(jwt);
      const userDb = appContext.createUserScopedSupabase(jwt);

      if (!user || !userDb) {
        return res.status(401).json({ error: 'Unauthorized' });
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
        return res.status(404).json({ error: 'Entry not found' });
      }

      const nextRank =
        action === 'know'
          ? decreaseDangerRank(entry.rank as Rank)
          : resetDangerRank();

      const { error: updateError } = await userDb
        .from('wordbook_entries')
        .update({ rank: nextRank })
        .eq('id', entryId);

      if (updateError) {
        throw updateError;
      }

      return res.json({ success: true, entryId, nextRank });
    } catch (error) {
      console.error('Quiz review error:', error);
      return res.status(500).json({ error: 'Failed to process review' });
    }
  });

  return router;
}
