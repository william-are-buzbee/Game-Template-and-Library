// tools/lib/changed.ts — the files this branch changed since it left <ref> (git merge-base): committed, uncommitted and
// new ones. null when git cannot say (no such ref, not a checkout), which every caller takes to mean "run everything".
// tools/each.ts, tools/plan.ts and tools/try-templates.ts read --changed through here.
import { spawnSync } from 'node:child_process';
import { ROOT } from './workspaces.ts';

const git = (...args: string[]) => {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  return r.status === 0 ? r.stdout : null;
};

export function changedFiles(ref: string): string[] | null {
  const base = git('merge-base', ref, 'HEAD')?.trim();
  const diff = base ? git('diff', '--name-only', '--no-renames', base) : null;
  const added = git('ls-files', '--others', '--exclude-standard');
  if (diff === null || added === null) return null;
  return [...diff.split('\n'), ...added.split('\n')].filter(Boolean);
}

/** `--changed` gives origin/main; `--changed=<ref>` gives <ref>; absent gives null */
export function changedRef(argv: string[]): string | null {
  const a = argv.find(x => x === '--changed' || x.startsWith('--changed='));
  return a ? (a.includes('=') ? a.slice('--changed='.length) : 'origin/main') : null;
}
