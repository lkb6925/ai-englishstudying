type SecretPattern = {
  description: string;
  regex: RegExp;
};

const BLOCKED_PATH_RULES: Array<{ description: string; test: (path: string) => boolean }> = [
  {
    description: 'Local .env files must never be committed',
    test: (path) => /^\.env(?:\..+)?$/i.test(path) && path !== '.env.example',
  },
  {
    description: 'Downloaded env snapshots must never be committed',
    test: (path) => path === 'env.download',
  },
  {
    description: 'Private key files must never be committed',
    test: (path) => /\.(pem|p12|pfx|key)$/i.test(path),
  },
];

const SECRET_PATTERNS: SecretPattern[] = [
  {
    description: 'Google API key',
    regex: /AIza[0-9A-Za-z\-_]{35}/g,
  },
  {
    description: 'GitHub personal access token',
    regex: /(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/g,
  },
  {
    description: 'OpenAI-style API key',
    regex: /\bsk-[A-Za-z0-9]{20,}\b/g,
  },
  {
    description: 'Supabase service role key assignment',
    regex: /\b(?:SUPABASE_)?SERVICE_ROLE(?:_KEY)?\s*=\s*\S+/g,
  },
];

export function normalizeGitPath(path: string): string {
  return path.replace(/\\/g, '/');
}

export function getBlockedPathReason(path: string): string | null {
  const normalizedPath = normalizeGitPath(path);

  for (const rule of BLOCKED_PATH_RULES) {
    if (rule.test(normalizedPath)) {
      return rule.description;
    }
  }

  return null;
}

export function findSecretMatches(content: string): SecretPattern[] {
  return SECRET_PATTERNS.filter((pattern) => {
    pattern.regex.lastIndex = 0;
    return pattern.regex.test(content);
  });
}

export function isSafePlaceholderLine(line: string): boolean {
  const trimmed = line.trim();

  if (!trimmed.includes('=')) {
    return true;
  }

  const [, value = ''] = trimmed.split('=', 2);
  const normalizedValue = value.trim();

  return (
    normalizedValue === '' ||
    normalizedValue.startsWith('YOUR_') ||
    normalizedValue.startsWith('your-') ||
    normalizedValue.startsWith('<') ||
    normalizedValue.startsWith('${')
  );
}

export function hasUnsafeEnvAssignment(content: string): boolean {
  return content.split('\n').some((line) => {
    if (!/(?:^|_)(API_KEY|TOKEN|SECRET|PASSWORD)\s*=/.test(line)) {
      return false;
    }

    return !isSafePlaceholderLine(line);
  });
}
