import { execFileSync } from 'node:child_process';
import {
  findSecretMatches,
  getBlockedPathReason,
  hasUnsafeEnvAssignment,
  normalizeGitPath,
} from './secret-rules.ts';

type Violation = {
  path: string;
  reason: string;
};

function runGit(args: string[]): string {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: 'pipe',
  }).trimEnd();
}

function getStagedPaths(): string[] {
  const output = runGit(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
  if (!output) {
    return [];
  }

  return output
    .split('\n')
    .map((line) => normalizeGitPath(line.trim()))
    .filter((line) => line.length > 0);
}

function getStagedContent(path: string): string {
  return runGit(['show', `:${path}`]);
}

function findViolations(paths: string[]): Violation[] {
  const violations: Violation[] = [];

  for (const path of paths) {
    const blockedPathReason = getBlockedPathReason(path);
    if (blockedPathReason) {
      violations.push({
        path,
        reason: blockedPathReason,
      });
      continue;
    }

    const content = getStagedContent(path);

    if (hasUnsafeEnvAssignment(content)) {
      violations.push({
        path,
        reason: 'Environment-style assignment looks like a real secret value',
      });
      continue;
    }

    for (const match of findSecretMatches(content)) {
      violations.push({
        path,
        reason: match.description,
      });
    }
  }

  return violations;
}

function main() {
  const stagedPaths = getStagedPaths();

  if (stagedPaths.length === 0) {
    console.log('Secret guard: no staged files to scan.');
    return;
  }

  const violations = findViolations(stagedPaths);

  if (violations.length === 0) {
    console.log(`Secret guard: scanned ${stagedPaths.length} staged file(s).`);
    return;
  }

  console.error('Secret guard blocked this commit.');
  for (const violation of violations) {
    console.error(`- ${violation.path}: ${violation.reason}`);
  }
  console.error('');
  console.error('Fix the staged content or unstage the file, then try again.');
  process.exit(1);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Secret guard failed: ${message}`);
  process.exit(1);
}
