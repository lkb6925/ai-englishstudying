import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  API_KEY: process.env.GEMINI_API_KEY || '',
  WATCH_DIR: process.cwd(),
  FEEDBACK_FILE: 'gemini_feedback.md',
  WATCH_EXTS: ['.js', '.jsx', '.ts', '.tsx', '.py', '.html', '.css', '.vue', '.svelte'],
  EXCLUDE_PATTERNS: [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    '.nuxt',
    'coverage',
    '.cache',
    '__pycache__',
    'venv',
    '.env',
    'gemini_feedback.md',
    'gemini-watcher.js',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
  ],
  DEBOUNCE_MS: 800,
  COOLDOWN_MS: 6000,
  MAX_CHARS: 12000,
  RETRY_COUNT: 2,
  RETRY_DELAY_MS: 2000,
  MODEL: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
};

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
  bgRed: '\x1b[41m',
};

const paint = (color, text) => `${color}${text}${C.reset}`;
const log = {
  info: (msg) => console.log(paint(C.cyan, `i  ${msg}`)),
  ok: (msg) => console.log(paint(C.green, `OK ${msg}`)),
  warn: (msg) => console.log(paint(C.yellow, `!  ${msg}`)),
  error: (msg) => console.log(paint(C.red, `X  ${msg}`)),
  fatal: (msg) => console.log(paint(C.bgRed, `!! ${msg}`)),
  action: (msg) => console.log(paint(C.magenta, `>  ${msg}`)),
  dim: (msg) => console.log(paint(C.gray, msg)),
  section: (msg) =>
    console.log(
      paint(
        C.bold,
        `\n${'-'.repeat(60)}\n   ${msg}\n${'-'.repeat(60)}`,
      ),
    ),
};

const debounceTimers = new Map();
const cooldownMap = new Map();

function shouldSkip(filePath) {
  const now = Date.now();
  const last = cooldownMap.get(filePath) || 0;
  if (now - last < CONFIG.COOLDOWN_MS) {
    log.dim(
      `[cooldown] ${filePath} - ${Math.ceil(
        (CONFIG.COOLDOWN_MS - (now - last)) / 1000,
      )}s left`,
    );
    return true;
  }
  return false;
}

function isExcluded(filename) {
  return CONFIG.EXCLUDE_PATTERNS.some((pattern) => filename.includes(pattern));
}

function isWatchTarget(filename) {
  return CONFIG.WATCH_EXTS.some((ext) => filename.endsWith(ext));
}

function getFeedbackPath() {
  return path.join(CONFIG.WATCH_DIR, CONFIG.FEEDBACK_FILE);
}

function buildPrompt(filename, code, trimmed) {
  const trimNote = trimmed
    ? `\n[code was trimmed to the first ${CONFIG.MAX_CHARS} characters; review structure and highest-risk issues first]\n`
    : '';

  return `
You are reviewing a production-bound codebase. Be direct, concrete, and prioritize issues that would block release.
${trimNote}
Target file: ${filename}

Source:
\`\`\`
${code}
\`\`\`

Return markdown in this exact structure:

# ${filename} - Gemini Code Review

> Review time: {{TIMESTAMP}}
> Target file: \`${filename}\`

---

## Critical

## Architecture

## Performance

## Readability

## Recommended Patch

\`\`\`${path.extname(filename).replace('.', '')}
// Provide a full-file replacement when practical.
\`\`\`

## Next Step

One short sentence telling Codex what to fix first.
`.trim();
}

function buildMissingKeyFeedback(filename) {
  const timestamp = new Date().toISOString();
  return `# Gemini Watcher Status

> Review time: ${timestamp}
> Target file: \`${filename}\`

---

## Critical

- \`GEMINI_API_KEY\` is missing, so Gemini review could not run.

## Architecture

- The watcher is healthy enough to detect file changes and update this report.

## Performance

- None.

## Readability

- Add \`GEMINI_API_KEY\` to \`.env\` or \`.env.local\` and restart the watcher.

## Recommended Patch

\`\`\`md
Set GEMINI_API_KEY in your environment and save the file again.
\`\`\`

## Next Step

Add \`GEMINI_API_KEY\`, restart \`node gemini-watcher.js\`, then resave \`${filename}\`.
`;
}

function ensureFeedbackFile() {
  const feedbackPath = getFeedbackPath();
  if (fs.existsSync(feedbackPath)) {
    return;
  }

  const initialMessage = `# Gemini Watcher Ready

> Started at: ${new Date().toISOString()}

Waiting for file changes...
`;
  fs.writeFileSync(feedbackPath, initialMessage, 'utf8');
}

async function callGeminiAPI(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.MODEL}:generateContent?key=${CONFIG.API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`HTTP ${response.status} - ${errBody}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Gemini returned no review text');
  }

  return text;
}

function getReadableErrorMessage(error) {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('HTTP 429') ||
    message.toLowerCase().includes('quota')
  ) {
    return 'Gemini API quota is exhausted right now. Wait for quota reset or switch to a billed key, then save the file again.';
  }

  return message;
}

async function callWithRetry(prompt) {
  for (let attempt = 1; attempt <= CONFIG.RETRY_COUNT + 1; attempt += 1) {
    try {
      return await callGeminiAPI(prompt);
    } catch (error) {
      if (attempt > CONFIG.RETRY_COUNT) {
        throw error;
      }

      log.warn(
        `Gemini call failed (${attempt}/${CONFIG.RETRY_COUNT + 1}); retrying in ${
          CONFIG.RETRY_DELAY_MS / 1000
        }s`,
      );
      log.dim(`  reason: ${getReadableErrorMessage(error)}`);
      await new Promise((resolve) => setTimeout(resolve, CONFIG.RETRY_DELAY_MS));
    }
  }

  throw new Error('Gemini retry loop exited unexpectedly');
}

function writeFeedback(markdown) {
  fs.writeFileSync(getFeedbackPath(), markdown, 'utf8');
}

function printSummary(filename, feedbackText) {
  const hasCritical = /critical/i.test(feedbackText);
  const hasArchitecture = /architecture/i.test(feedbackText);
  const hasPerformance = /performance/i.test(feedbackText);

  log.ok(`review saved to ${CONFIG.FEEDBACK_FILE}`);
  console.log('');

  if (hasCritical) log.fatal('critical issue detected');
  if (hasArchitecture) log.warn('architecture concerns detected');
  if (hasPerformance) log.warn('performance concerns detected');

  const nextStepMatch = feedbackText.match(/## Next Step\s+([\s\S]*?)(?:\n## |\n#|$)/i);
  if (nextStepMatch) {
    log.dim('Next Step');
    console.log(paint(C.bold, nextStepMatch[1].trim()));
  }

  console.log('');
  log.action(
    `Codex prompt: "${CONFIG.FEEDBACK_FILE} 읽고 ${filename} 출시 기준으로 수정해"`,
  );
  console.log('');
}

async function processFeedback(filePath, filename) {
  if (shouldSkip(filePath)) {
    return;
  }

  cooldownMap.set(filePath, Date.now());
  log.section(`Gemini review start: ${filename}`);

  let code;
  try {
    code = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    log.error(`failed to read ${filePath}`);
    return;
  }

  if (!code.trim()) {
    log.warn('empty file skipped');
    return;
  }

  let trimmed = false;
  if (code.length > CONFIG.MAX_CHARS) {
    log.warn(`file too large (${code.length}); trimming to ${CONFIG.MAX_CHARS}`);
    code = `${code.slice(0, CONFIG.MAX_CHARS)}\n// ... trimmed ...`;
    trimmed = true;
  }

  const timestamp = new Date().toISOString();
  const prompt = buildPrompt(filename, code, trimmed).replace('{{TIMESTAMP}}', timestamp);

  if (!CONFIG.API_KEY) {
    const fallback = buildMissingKeyFeedback(filename);
    writeFeedback(fallback);
    printSummary(filename, fallback);
    return;
  }

  try {
    log.info(`sending ${filename} to ${CONFIG.MODEL}`);
    const feedback = await callWithRetry(prompt);
    writeFeedback(feedback);
    printSummary(filename, feedback);
  } catch (error) {
    const message = getReadableErrorMessage(error);
    log.error(`Gemini review failed: ${message}`);
    const fallback = `# Gemini Watcher Error

> Review time: ${new Date().toISOString()}
> Target file: \`${filename}\`

---

Gemini review failed.

\`\`\`
${message}
\`\`\`

Save the file again after fixing the watcher or API configuration.
`;
    writeFeedback(fallback);
  }
}

function startWatcher() {
  ensureFeedbackFile();

  log.section('Gemini Watcher Online');
  log.info(`watching: ${CONFIG.WATCH_DIR}`);
  log.info(`extensions: ${CONFIG.WATCH_EXTS.join(', ')}`);
  log.info(`debounce: ${CONFIG.DEBOUNCE_MS}ms | cooldown: ${CONFIG.COOLDOWN_MS}ms`);
  log.info(`feedback file: ${CONFIG.FEEDBACK_FILE}`);

  if (!CONFIG.API_KEY) {
    log.warn('GEMINI_API_KEY is missing; watcher will write recovery guidance instead of live reviews');
  } else {
    log.ok(`Gemini model ready: ${CONFIG.MODEL}`);
  }

  fs.watch(CONFIG.WATCH_DIR, { recursive: true }, (_eventType, filename) => {
    if (!filename) {
      return;
    }

    const normalized = filename.replace(/\\/g, '/');

    if (isExcluded(normalized) || !isWatchTarget(normalized)) {
      return;
    }

    const filePath = path.join(CONFIG.WATCH_DIR, normalized);
    if (!fs.existsSync(filePath)) {
      return;
    }

    if (debounceTimers.has(normalized)) {
      clearTimeout(debounceTimers.get(normalized));
    }

    const timer = setTimeout(() => {
      debounceTimers.delete(normalized);
      void processFeedback(filePath, normalized);
    }, CONFIG.DEBOUNCE_MS);

    debounceTimers.set(normalized, timer);
  });

  log.ok('watching for changes... press Ctrl+C to stop');
}

startWatcher();
