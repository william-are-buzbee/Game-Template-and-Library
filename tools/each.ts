// tools/each.ts — runs one npm script in every workspace that has it, in catalog order; fails if any fails.
//   node tools/each.ts <script>                       every workspace, e.g. `node tools/each.ts test`
//   node tools/each.ts <script> --changed             only what this branch changed, and what uses it
//   node tools/each.ts <script> --changed=<ref>       the same against another base (default origin/main)
// `npm run <script> --workspaces` would do the same but errors when there are no workspaces at all, which is a
// legitimate state of this repo (an empty games/ or labs/), so the root scripts come through here.
//
// --changed compares against where this branch left <ref> (git merge-base), counting committed, uncommitted and new
// files; tools/lib/affected.ts decides what that touches. A change outside any workspace (tools/, the workflows, the
// lockfile, root config) runs everything; so does anything git cannot answer. Pull requests run this way in CI; a push
// to main always runs everything.
import { spawnSync } from 'node:child_process';
import { affected } from './lib/affected.ts';
import { runNpm } from './lib/npm.ts';
import { ROOT, workspaces } from './lib/workspaces.ts';

const script = process.argv[2];
if (!script || script.startsWith('--')) {
  console.error('usage: node tools/each.ts <script> [--changed[=<ref>]]');
  process.exit(2);
}
const changedArg = process.argv.slice(3).find(a => a === '--changed' || a.startsWith('--changed='));

const git = (...args: string[]) => {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  return r.status === 0 ? r.stdout : null;
};

const all = workspaces();
let targets = all;
if (changedArg) {
  const ref = changedArg.includes('=') ? changedArg.slice('--changed='.length) : 'origin/main';
  const base = git('merge-base', ref, 'HEAD')?.trim();
  const diff = base ? git('diff', '--name-only', '--no-renames', base) : null;
  const added = git('ls-files', '--others', '--exclude-standard');
  if (diff === null || added === null) {
    console.log(`── ${script}: could not compare with ${ref}, so everything runs`);
  } else {
    const files = [...diff.split('\n'), ...added.split('\n')].filter(Boolean);
    const a = affected(files, all);
    console.log(`── ${script}, for what changed since ${ref} (${files.length} files):`);
    for (const line of a.why) console.log(`   ${line}`);
    if (a.dirs) {
      if (!a.dirs.length) console.log('   nothing a build or test reads');
      targets = all.filter(w => a.dirs!.includes(w.dir));
    }
  }
}

const failed: string[] = [];
const ran = targets.filter(w => w.scripts[script]);
for (const w of ran) {
  console.log(`\n── ${script}: ${w.dir}`);
  const r = runNpm(['run', script, '-w', w.dir], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) failed.push(w.dir);
}
if (!ran.length) console.log(`(no ${changedArg ? 'affected ' : ''}workspace has a "${script}" script)`);
if (failed.length) {
  console.error(`\n${script} failed in: ${failed.join(', ')}`);
  process.exit(1);
}
