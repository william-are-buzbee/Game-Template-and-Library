// tools/each.ts — runs one npm script in every workspace that has it, in catalog order; fails if any fails.
//   node tools/each.ts <script>      e.g. `node tools/each.ts test`
// `npm run <script> --workspaces` would do the same but errors when there are no workspaces at all, which is a
// legitimate state of this repo (an empty games/ or labs/), so the root scripts come through here.
import { spawnSync } from 'node:child_process';
import { ROOT, workspaces } from './lib/workspaces.ts';

const script = process.argv[2];
if (!script) {
  console.error('usage: node tools/each.ts <script>');
  process.exit(2);
}

const failed: string[] = [];
const ran = workspaces().filter(w => w.scripts[script]);
for (const w of ran) {
  console.log(`\n── ${script}: ${w.dir}`);
  const r = spawnSync('npm', ['run', script, '-w', w.dir], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) failed.push(w.dir);
}
if (!ran.length) console.log(`(no workspace has a "${script}" script)`);
if (failed.length) {
  console.error(`\n${script} failed in: ${failed.join(', ')}`);
  process.exit(1);
}
