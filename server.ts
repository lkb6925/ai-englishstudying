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

// API Routes
app.post('/api/lookup', async (req, res) => {
  try {
    const { word, sentence } = req.body;
    if (!word || !sentence) {
      return res.status(400).json({ error: 'word and sentence are required' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
    res.status(500).json({ error: 'AI lookup failed' });
  }
});

app.post('/api/lookup-event', async (req, res) => {
  // Mocking persistence for now if Supabase is not configured
  // In a real app, we'd save to lookup_events and check wordbook promotion
  const { term, context, sourceDomain, sourcePathHash } = req.body;
  
  // Basic logic as per PRD
  res.json({
    persisted: !!supabase,
    totalLookupCount: 1,
    promoted: false,
    planTier: 'free'
  });
});

app.post('/api/quiz-review', async (req, res) => {
  try {
    const { entryId, action } = req.body;
    if (!entryId || !action) {
      return res.status(400).json({ error: 'entryId and action are required' });
    }

    // Mocking rank update
    res.json({ success: true, entryId, nextRank: 'blue' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process review' });
  }
});

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
