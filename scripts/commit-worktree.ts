import { execFileSync } from 'node:child_process';
import {
  getGroupedEntries,
  groupDescriptions,
  type GitStatusEntry,
  type WorktreeGroup,
} from './git-worktree-groups.ts';

type CliOptions = {
  groups: WorktreeGroup[];
  message: string;
  dryRun: boolean;
};

const validGroups = new Set<WorktreeGroup>([
  'server',
  'extension',
  'frontend',
  'docs',
  'config',
  'generated',
  'other',
]);

function parseArgs(argv: string[]): CliOptions {
  let rawGroups = '';
  let message = '';
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === '--group' || current === '-g') {
      rawGroups = argv[index + 1] ?? '';
      index += 1;
      continue;
    }

    if (current === '--message' || current === '-m') {
      message = argv[index + 1] ?? '';
      index += 1;
      continue;
    }

    if (current === '--dry-run') {
      dryRun = true;
    }
  }

  const groups = rawGroups
    .split(',')
    .map((value) => value.trim())
    .filter((value): value is WorktreeGroup => validGroups.has(value as WorktreeGroup));

  if (groups.length === 0) {
    throw new Error('Missing --group. Example: --group extension or --group server,config');
  }

  if (!message.trim()) {
    throw new Error('Missing --message. Example: --message "refactor extension runtime"');
  }

  return {
    groups,
    message: message.trim(),
    dryRun,
  };
}

function getEntriesForGroups(
  grouped: Map<WorktreeGroup, GitStatusEntry[]>,
  groups: WorktreeGroup[],
): GitStatusEntry[] {
  const entries: GitStatusEntry[] = [];

  for (const group of groups) {
    entries.push(...(grouped.get(group) ?? []));
  }

  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.path)) {
      return false;
    }
    seen.add(entry.path);
    return true;
  });
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const grouped = getGroupedEntries();
  const entries = getEntriesForGroups(grouped, options.groups);

  if (entries.length === 0) {
    throw new Error(
      `No changed files found for group(s): ${options.groups.join(', ')}`,
    );
  }

  const paths = entries.map((entry) => entry.path);
  if (options.dryRun) {
    console.log('Dry run: no files were staged or committed.');
    console.log(`Groups: ${options.groups.join(', ')}`);
    console.log(`Message: ${options.message}`);
    console.log('Files:');
    for (const path of paths) {
      console.log(`  - ${path}`);
    }
    return;
  }

  execFileSync('git', ['add', '--', ...paths], { stdio: 'inherit' });
  execFileSync('git', ['commit', '-m', options.message], { stdio: 'inherit' });

  console.log('');
  console.log(
    `Committed ${entries.length} file(s) from group(s): ${options.groups
      .map((group) => `${group} (${groupDescriptions[group]})`)
      .join(', ')}`,
  );
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
