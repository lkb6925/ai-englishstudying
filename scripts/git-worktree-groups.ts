import { execFileSync } from 'node:child_process';

export type GitStatusEntry = {
  indexStatus: string;
  worktreeStatus: string;
  path: string;
};

export type WorktreeGroup =
  | 'server'
  | 'extension'
  | 'frontend'
  | 'docs'
  | 'config'
  | 'generated'
  | 'other';

export const groupDescriptions: Record<WorktreeGroup, string> = {
  server: 'API/server logic',
  extension: 'Chrome extension runtime',
  frontend: 'React app / shared UI',
  docs: 'Documentation and notes',
  config: 'Config / tooling',
  generated: 'Build outputs or generated files',
  other: 'Unclassified files',
};

export function getGitStatusLines(): string[] {
  const output = execFileSync('git', ['status', '--short'], {
    encoding: 'utf8',
  });

  return output
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
}

export function parseStatusLine(line: string): GitStatusEntry {
  return {
    indexStatus: line[0] ?? ' ',
    worktreeStatus: line[1] ?? ' ',
    path: line.slice(3).trim(),
  };
}

export function getGroup(path: string): WorktreeGroup {
  if (path.startsWith('server/') || path === 'server.ts') {
    return 'server';
  }

  if (
    path === 'background.ts' ||
    path === 'content.tsx' ||
    path.startsWith('content-') ||
    path.startsWith('lookup-') ||
    path === 'messages.ts' ||
    path === 'chrome.d.ts' ||
    path === 'extension-storage.ts' ||
    path.startsWith('dist-extension/')
  ) {
    return 'extension';
  }

  if (
    path.startsWith('src/') ||
    path === 'index.css' ||
    path === 'index.html' ||
    path.startsWith('dist/')
  ) {
    return path.startsWith('dist/') ? 'generated' : 'frontend';
  }

  if (
    path.endsWith('.md') ||
    path === 'SETUP.md' ||
    path === 'LEGACY_NOTES.md'
  ) {
    return 'docs';
  }

  if (
    path === 'package.json' ||
    path === 'package-lock.json' ||
    path === 'tsconfig.json' ||
    path.startsWith('vite') ||
    path.startsWith('.env') ||
    path.startsWith('scripts/')
  ) {
    return 'config';
  }

  return 'other';
}

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function renderStatus(entry: GitStatusEntry): string {
  return `${entry.indexStatus}${entry.worktreeStatus} ${entry.path}`;
}

export function getGroupedEntries(): Map<WorktreeGroup, GitStatusEntry[]> {
  const entries = getGitStatusLines().map(parseStatusLine);
  const grouped = new Map<WorktreeGroup, GitStatusEntry[]>();

  for (const entry of entries) {
    const group = getGroup(entry.path);
    grouped.set(group, [...(grouped.get(group) ?? []), entry]);
  }

  return grouped;
}

export function getAllChangedEntries(): GitStatusEntry[] {
  return getGitStatusLines().map(parseStatusLine);
}
