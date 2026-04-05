import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Initialize Supabase (optional, if keys provided)
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// JWT auth middleware
function extractJWT(req: express.Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  return null;
}

async function getSupabaseUser(jwt: string) {
  if (!supabase) return null;
  const { data: { user }, error } = await supabase.auth.getUser(jwt);
  if (error) return null;
  return user;
}

// API Routes
app.post('/api/lookup', async (req, res) => {
  try {
    const { word, sentence } = req.body;
    if (!word || !sentence) {
      return res.status(400).json({ error: 'word and sentence are required' });
    }

    // FIX: Use correct model name (gemini-2.0-flash or gemini-1.5-flash)
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Analyze the word "${word}" in the context of this sentence: "${sentence}". Provide 1-2 concise contextual meanings in Korean.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lemma: { type: Type.STRING, description: 'The dictionary form of the word' },
            contextual_meanings: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '1-2 concise contextual meanings in Korean'
            }
          },
          required: ['lemma', 'contextual_meanings']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    res.json(result);
  } catch (error) {
    console.error('Lookup error:', error);
    res.status(500).json({ error: 'AI lookup failed', details: String(error) });
  }
});

app.post('/api/lookup-event', async (req, res) => {
  const { term, context, sourceDomain, sourcePathHash } = req.body;
  const jwt = extractJWT(req);
  
  let user = null;
  if (jwt) {
    user = await getSupabaseUser(jwt);
  }

  if (!user || !supabase) {
    return res.json({
      persisted: false,
      totalLookupCount: 1,
      promoted: false,
      reason: 'unauthorized',
      planTier: null
    });
  }

  try {
    // Upsert into wordbook_entries
    const normalizedTerm = term.toLowerCase().trim();
    
    const { data: existing } = await supabase
      .from('wordbook_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('normalized_term', normalizedTerm)
      .maybeSingle();

    let totalLookupCount = 1;
    let promoted = false;

    if (existing) {
      totalLookupCount = existing.total_lookup_count + 1;
      // Calculate rank based on lookup count
      const newRank = getRankFromCount(totalLookupCount);
      const wasPromoted = newRank !== existing.rank && totalLookupCount >= 2;
      
      await supabase.from('wordbook_entries').update({
        total_lookup_count: totalLookupCount,
        rank: newRank,
        last_seen_at: new Date().toISOString(),
        context_sample: context?.slice(0, 300) || existing.context_sample,
      }).eq('id', existing.id);

      promoted = wasPromoted;
    } else {
      // First lookup - just record event, don't add to wordbook yet
      totalLookupCount = 1;
    }

    // Save lookup event
    await supabase.from('lookup_events').insert({
      user_id: user.id,
      term,
      normalized_term: normalizedTerm,
      context: context?.slice(0, 300),
      source_domain: sourceDomain,
      source_path_hash: sourcePathHash,
    });

    // Check if 2nd lookup - add to wordbook
    if (totalLookupCount === 2 && !existing) {
      await supabase.from('wordbook_entries').insert({
        user_id: user.id,
        term,
        normalized_term: normalizedTerm,
        context_sample: context?.slice(0, 300),
        total_lookup_count: 2,
        rank: 'blue',
        last_seen_at: new Date().toISOString(),
      });
      promoted = true;
    }

    res.json({
      persisted: true,
      totalLookupCount,
      promoted,
      planTier: 'free'
    });
  } catch (error) {
    console.error('Lookup event error:', error);
    res.status(500).json({ error: 'Failed to record lookup event' });
  }
});

app.post('/api/quiz-review', async (req, res) => {
  try {
    const { entryId, action } = req.body;
    const jwt = extractJWT(req);
    
    if (!entryId || !action) {
      return res.status(400).json({ error: 'entryId and action are required' });
    }

    if (!supabase || !jwt) {
      return res.json({ success: true, entryId, nextRank: 'blue' });
    }

    const user = await getSupabaseUser(jwt);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: entry } = await supabase
      .from('wordbook_entries')
      .select('rank')
      .eq('id', entryId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const rankOrder = ['red', 'orange', 'yellow', 'green', 'blue', 'master'];
    let nextRank = entry.rank;

    if (action === 'know') {
      const idx = rankOrder.indexOf(entry.rank);
      if (idx < rankOrder.length - 1) nextRank = rankOrder[idx + 1];
    } else {
      nextRank = 'red';
    }

    await supabase
      .from('wordbook_entries')
      .update({ rank: nextRank })
      .eq('id', entryId);

    res.json({ success: true, entryId, nextRank });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process review' });
  }
});

function getRankFromCount(count: number): string {
  if (count >= 12) return 'red';
  if (count >= 8) return 'orange';
  if (count >= 5) return 'yellow';
  if (count >= 3) return 'green';
  return 'blue';
}

// Vite middleware
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

setupVite().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
