import { execFileSync } from 'node:child_process';
import {
  getAllChangedEntries,
  getGroup,
  groupDescriptions,
  type GitStatusEntry,
  type WorktreeGroup,
} from './git-worktree-groups.ts';
import { getBlockedPathReason } from './secret-rules.ts';

type CliOptions = {
  allowDirtyStart: boolean;
  dryRun: boolean;
  once: boolean;
};

const CONFIG = {
  pollMs: Number(process.env.AUTO_PUBLISH_POLL_MS ?? '3000'),
  idleMs: Number(process.env.AUTO_PUBLISH_IDLE_MS ?? '15000'),
  remoteName: process.env.AUTO_PUBLISH_REMOTE ?? 'origin',
  ignoredPaths: ['dist/', 'dist-extension/', 'gemini_feedback.md'],
} as const;

function parseArgs(argv: string[]): CliOptions {
  return {
    allowDirtyStart: argv.includes('--allow-dirty-start'),
    dryRun: argv.includes('--dry-run'),
    once: argv.includes('--once'),
  };
}

function runGit(args: string[], stdio: 'pipe' | 'inherit' = 'pipe'): string {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio,
  }).trim();
}

function hasRemote(remoteName: string): boolean {
  try {
    runGit(['remote', 'get-url', remoteName]);
    return true;
  } catch {
    return false;
  }
}

function isIgnoredPath(path: string): boolean {
  return (
    getBlockedPathReason(path) !== null ||
    CONFIG.ignoredPaths.some((ignoredPath) =>
    ignoredPath.endsWith('/') ? path.startsWith(ignoredPath) : path === ignoredPath,
    )
  );
}

function getFilteredEntries(): GitStatusEntry[] {
  return getAllChangedEntries().filter((entry) => !isIgnoredPath(entry.path));
}

function buildFingerprint(entries: GitStatusEntry[]): string {
  return entries
    .map((entry) => `${entry.indexStatus}${entry.worktreeStatus}:${entry.path}`)
    .sort()
    .join('|');
}

function buildCommitMessage(entries: GitStatusEntry[]): string {
  const groups = Array.from(
    new Set(entries.map((entry) => getGroup(entry.path))),
  );

  const headline = groups
    .slice(0, 3)
    .map((group) => group)
    .join(', ');

  const suffix =
    groups.length > 3 ? ` and ${groups.length - 3} more` : '';

  return `auto: update ${headline}${suffix}`;
}

function summarizeGroups(entries: GitStatusEntry[]): string {
  const counts = new Map<WorktreeGroup, number>();

  for (const entry of entries) {
    const group = getGroup(entry.path);
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([group, count]) => `${group} (${groupDescriptions[group]}): ${count}`)
    .join(', ');
}

function printPlan(entries: GitStatusEntry[], message: string) {
  console.log(`Commit message: ${message}`);
  console.log(`Groups: ${summarizeGroups(entries)}`);
  console.log('Files:');
  for (const entry of entries) {
    console.log(`  - ${entry.path}`);
  }
}

function pushCurrentBranch(remoteName: string, dryRun: boolean) {
  const branch = runGit(['branch', '--show-current']);
  if (!branch) {
    throw new Error('Could not determine current branch.');
  }

  let hasUpstream = true;
  try {
    runGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']);
  } catch {
    hasUpstream = false;
  }

  if (dryRun) {
    console.log(
      hasUpstream
        ? `Would run: git push`
        : `Would run: git push -u ${remoteName} ${branch}`,
    );
    return;
  }

  if (hasUpstream) {
    execFileSync('git', ['push'], { stdio: 'inherit' });
    return;
  }

  execFileSync('git', ['push', '-u', remoteName, branch], { stdio: 'inherit' });
}

function publishChanges(entries: GitStatusEntry[], dryRun: boolean) {
  const paths = Array.from(new Set(entries.map((entry) => entry.path)));
  const message = buildCommitMessage(entries);

  printPlan(entries, message);

  if (dryRun) {
    console.log('Dry run: no files were staged, committed, or pushed.');
    return;
  }

  execFileSync('git', ['add', '--', ...paths], { stdio: 'inherit' });

  try {
    execFileSync('git', ['diff', '--cached', '--quiet', '--exit-code'], {
      stdio: 'inherit',
    });
    console.log('No staged diff after git add; skipping commit.');
    return;
  } catch {
    // Non-zero means there is a staged diff, so continue.
  }

  execFileSync('git', ['commit', '-m', message], { stdio: 'inherit' });
  pushCurrentBranch(CONFIG.remoteName, false);
}

function ensureReadyToStart(
  entries: GitStatusEntry[],
  options: CliOptions,
): void {
  if (!hasRemote(CONFIG.remoteName)) {
    throw new Error(`Git remote '${CONFIG.remoteName}' was not found.`);
  }

  if (entries.length > 0 && !options.allowDirtyStart) {
    throw new Error(
      'Working tree is already dirty. Commit or stash existing changes first, or run with --allow-dirty-start.',
    );
  }
}

function runOnce(options: CliOptions) {
  const entries = getFilteredEntries();
  if (entries.length === 0) {
    console.log('No publishable changes detected.');
    return;
  }

  publishChanges(entries, options.dryRun);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const startupEntries = getFilteredEntries();

  ensureReadyToStart(startupEntries, options);

  if (options.once) {
    runOnce(options);
    return;
  }

  console.log('GitHub auto-publish watcher online.');
  console.log(`Polling every ${CONFIG.pollMs}ms`);
  console.log(`Publishing after ${CONFIG.idleMs}ms of no file changes`);
  console.log(`Remote: ${CONFIG.remoteName}`);
  if (options.dryRun) {
    console.log('Dry run mode enabled.');
  }
  if (options.allowDirtyStart && startupEntries.length > 0) {
    console.log(
      `Dirty start allowed. Existing pending files: ${startupEntries.length}`,
    );
  }

  let lastFingerprint = buildFingerprint(startupEntries);
  let lastChangeAt = startupEntries.length > 0 ? Date.now() : 0;
  let publishing = false;

  const interval = setInterval(() => {
    if (publishing) {
      return;
    }

    const entries = getFilteredEntries();
    const fingerprint = buildFingerprint(entries);

    if (fingerprint !== lastFingerprint) {
      lastFingerprint = fingerprint;
      lastChangeAt = entries.length > 0 ? Date.now() : 0;

      if (entries.length > 0) {
        console.log(
          `Detected ${entries.length} publishable change(s); waiting for idle window...`,
        );
      }
      return;
    }

    if (entries.length === 0 || lastChangeAt === 0) {
      return;
    }

    if (Date.now() - lastChangeAt < CONFIG.idleMs) {
      return;
    }

    publishing = true;
    try {
      publishChanges(entries, options.dryRun);
      lastFingerprint = buildFingerprint(getFilteredEntries());
      lastChangeAt = 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Auto-publish failed: ${message}`);
      lastChangeAt = Date.now();
    } finally {
      publishing = false;
    }
  }, CONFIG.pollMs);

  const shutdown = () => {
    clearInterval(interval);
    console.log('GitHub auto-publish watcher stopped.');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
