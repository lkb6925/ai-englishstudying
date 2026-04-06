import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createAppContext } from './server/lib/context.ts';
import { setupVite } from './server/lib/setup-vite.ts';
import { createLookupRouter } from './server/routes/lookup.ts';
import { createQuizRouter } from './server/routes/quiz.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT ?? '3000');
const appContext = createAppContext();

app.use(express.json());
app.use('/api', createLookupRouter(appContext));
app.use('/api', createQuizRouter(appContext));

setupVite(app, __dirname).then(() => {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${port}`);
  });
});
