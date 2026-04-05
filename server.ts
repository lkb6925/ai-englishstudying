import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { shouldExcludeDomain } from './text';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT ?? '3000');

app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const authClient =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

type LookupResponse = {
  lemma: string;
  contextual_meanings: string[];
};

type LookupEventBody = {
  term?: string;
  context?: string;
  meanings?: string[];
  sourceDomain?: string;
  sourcePathHash?: string;
};

type QuizAction = 'know' | 'dont_know';

function extractJWT(req: express.Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  return null;
}

function createUserScopedSupabase(jwt: string) {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
  });
}

async function getSupabaseUser(jwt: string) {
  if (!authClient) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(jwt);

  if (error) {
    return null;
  }

  return user;
}

function sanitizeMeanings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 3);
}

function getRankFromCount(count: number): string {
  if (count >= 12) return 'red';
  if (count >= 8) return 'orange';
  if (count >= 5) return 'yellow';
  if (count >= 3) return 'green';
  return 'blue';
}

function getRankOrderValue(rank: string): number {
  const order: Record<string, number> = {
    red: 0,
    orange: 1,
    yellow: 2,
    green: 3,
    blue: 4,
    master: 5,
  };

  return order[rank] ?? order.blue;
}

async function lookupContextualMeanings(
  word: string,
  sentence: string,
): Promise<LookupResponse> {
  if (!ai) {
    return {
      lemma: word,
      contextual_meanings: ['테스트 의미'],
    };
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
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

  return JSON.parse(response.text || '{}') as LookupResponse;
}

async function getPlanTier(userDb: ReturnType<typeof createUserScopedSupabase>, userId: string) {
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

app.post('/api/lookup', async (req, res) => {
  const { word, sentence } = req.body as { word?: string; sentence?: string };

  if (!word || !sentence) {
    return res.status(400).json({ error: 'word and sentence are required' });
  }

  try {
    const result = await lookupContextualMeanings(word, sentence);
    return res.json(result);
  } catch (error) {
    console.error('Lookup error:', error);
    const errMsg = String(error);

    if (
      errMsg.includes('RESOURCE_EXHAUSTED') ||
      errMsg.toLowerCase().includes('quota')
    ) {
      return res.json({
        lemma: word,
        contextual_meanings: ['테스트 의미'],
      });
    }

    return res.status(500).json({ error: 'AI lookup failed', details: errMsg });
  }
});

app.post('/api/lookup-event', async (req, res) => {
  const { term, context, meanings, sourceDomain, sourcePathHash } =
    req.body as LookupEventBody;
  const jwt = extractJWT(req);

  if (!term) {
    return res.status(400).json({ error: 'term is required' });
  }

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

  const user = await getSupabaseUser(jwt);
  const userDb = createUserScopedSupabase(jwt);

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
      promoted = getRankOrderValue(nextRank) < getRankOrderValue(existingEntry.rank);

      const { error: updateEntryError } = await userDb
        .from('wordbook_entries')
        .update({
          total_lookup_count: totalLookupCount,
          rank: nextRank,
          last_seen_at: now,
          context_sample: safeContext,
          meaning_snapshot:
            safeMeanings.length > 0
              ? safeMeanings
              : existingEntry.meaning_snapshot,
        })
        .eq('id', existingEntry.id);

      if (updateEntryError) {
        throw updateEntryError;
      }
    } else if (totalLookupCount >= 2) {
      promoted = true;

      const { error: insertEntryError } = await userDb
        .from('wordbook_entries')
        .insert({
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

app.post('/api/quiz-review', async (req, res) => {
  try {
    const { entryId, action } = req.body as {
      entryId?: string;
      action?: QuizAction;
    };
    const jwt = extractJWT(req);

    if (!entryId || (action !== 'know' && action !== 'dont_know')) {
      return res
        .status(400)
        .json({ error: 'entryId and a valid action are required' });
    }

    if (!jwt) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await getSupabaseUser(jwt);
    const userDb = createUserScopedSupabase(jwt);

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

    const rankOrder = ['red', 'orange', 'yellow', 'green', 'blue', 'master'];
    let nextRank = entry.rank;

    if (action === 'know') {
      const currentIndex = rankOrder.indexOf(entry.rank);
      if (currentIndex < rankOrder.length - 1) {
        nextRank = rankOrder[currentIndex + 1];
      }
    } else {
      nextRank = 'red';
    }

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

async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

setupVite().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
