import {
  getAllChangedEntries,
  getGroupedEntries,
  groupDescriptions,
  renderStatus,
  shellQuote,
} from './git-worktree-groups.ts';

function main() {
  const entries = getAllChangedEntries();

  if (entries.length === 0) {
    console.log('Working tree is already clean.');
    return;
  }

  const grouped = getGroupedEntries();

  console.log('Worktree optimization report');
  console.log('');
  console.log(`Detected ${entries.length} changed file(s) across ${grouped.size} group(s).`);

  for (const [group, groupEntries] of grouped) {
    console.log('');
    console.log(`[${group}] ${groupDescriptions[group]}`);
    for (const entry of groupEntries) {
      console.log(`  ${renderStatus(entry)}`);
    }

    const addCommand = groupEntries
      .map((entry) => shellQuote(entry.path))
      .join(' ');
    console.log(`  Suggested stage: git add ${addCommand}`);
  }

  console.log('');
  console.log('Recommendation: commit one group at a time unless two groups are intentionally coupled.');
}

main();
