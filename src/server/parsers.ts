export type LookupResponse = {
  lemma: string;
  contextual_meanings: string[];
};

export type LookupEventBody = {
  term?: string;
  context?: string;
  meanings?: string[];
  sourceDomain?: string;
  sourcePathHash?: string;
};

export type QuizAction = 'know' | 'dont_know';

const MAX_WORD_LENGTH = 80;
const MAX_SENTENCE_LENGTH = 600;
const MAX_CONTEXT_LENGTH = 600;
const MAX_SOURCE_FIELD_LENGTH = 256;
const MAX_ENTRY_ID_LENGTH = 128;

function requireNonEmptyString(
  value: unknown,
  fieldName: string,
  maxLength = MAX_SOURCE_FIELD_LENGTH,
): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or fewer`);
  }

  return trimmed;
}

function parseOptionalString(
  value: unknown,
  fieldName: string,
  maxLength = MAX_SOURCE_FIELD_LENGTH,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or fewer`);
  }
  return trimmed;
}

function parseOptionalStringArray(value: unknown, fieldName: string): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${fieldName} must be an array of strings`);
  }

  return value.map((item) => item.trim()).filter((item) => item.length > 0);
}

export function sanitizeMeanings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 3);
}

export function parseLookupBody(body: unknown): { word: string; sentence: string } {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }

  const { word, sentence } = body as Record<string, unknown>;
  return {
    word: requireNonEmptyString(word, 'word', MAX_WORD_LENGTH),
    sentence: requireNonEmptyString(sentence, 'sentence', MAX_SENTENCE_LENGTH),
  };
}

export function parseLookupEventBody(
  body: unknown,
): Required<Pick<LookupEventBody, 'term'>> & LookupEventBody {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }

  const candidate = body as Record<string, unknown>;

  return {
    term: requireNonEmptyString(candidate.term, 'term', MAX_WORD_LENGTH),
    context: parseOptionalString(candidate.context, 'context', MAX_CONTEXT_LENGTH),
    meanings: parseOptionalStringArray(candidate.meanings, 'meanings'),
    sourceDomain: parseOptionalString(candidate.sourceDomain, 'sourceDomain'),
    sourcePathHash: parseOptionalString(candidate.sourcePathHash, 'sourcePathHash'),
  };
}

export function parseQuizReviewBody(body: unknown): { entryId: string; action: QuizAction } {
  if (!body || typeof body !== 'object') {
    throw new Error('entryId and a valid action are required');
  }

  const { entryId, action } = body as Record<string, unknown>;
  if (action !== 'know' && action !== 'dont_know') {
    throw new Error('action must be know or dont_know');
  }

  return {
    entryId: requireNonEmptyString(entryId, 'entryId', MAX_ENTRY_ID_LENGTH),
    action,
  };
}

export function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authorizationHeader.slice('Bearer '.length);
}
