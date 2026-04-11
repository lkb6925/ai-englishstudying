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

function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }

  return value.trim();
}

function parseOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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
    word: requireNonEmptyString(word, 'word'),
    sentence: requireNonEmptyString(sentence, 'sentence'),
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
    term: requireNonEmptyString(candidate.term, 'term'),
    context: parseOptionalString(candidate.context, 'context'),
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
    entryId: requireNonEmptyString(entryId, 'entryId'),
    action,
  };
}

export function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authorizationHeader.slice('Bearer '.length);
}
