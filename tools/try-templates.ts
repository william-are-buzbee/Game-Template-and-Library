// tools/try-templates.ts — proves the templates still make a game and a lab that work, the way `npm run new` makes them.
//   node tools/try-templates.ts                   always
//   node tools/try-templates.ts --changed[=ref]   only if something the templates depend on changed since <ref>
//   add --keep to leave the copy behind and print where it is
// In a throwaway copy of the repository (the tools, the packages and the root files, as they are on disk, so uncommitted
// changes count; no games or labs), it scaffolds one game and one lab with tools/new.ts, installs, and runs their
// typecheck, test and build, the catalog check, and tools/look.ts (which needs Playwright, as there). Nothing in the
// repository itself is touched.
//
// With --changed it runs when the change is shared (outside any workspace: tools/templates/ is in tools/) or reaches a
// package, since the templates import @wb/core; a change only inside games or labs, or to documentation, cannot break them.
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { affected } from './lib/affected.ts';
import { changedFiles, changedRef } from './lib/changed.ts';
import { needsTemplates } from './lib/jobs.ts';
import { runNpm } from './lib/npm.ts';
import { ROOT, workspaces } from './lib/workspaces.ts';

const args = process.argv.slice(2);
const ref = changedRef(args);
const keep = args.includes('--keep');

if (ref) {
  const files = changedFiles(ref);
  if (files !== null) {
    const a = affected(files, workspaces());
    if (!needsTemplates(a.dirs)) {
      console.log(`templates: nothing they depend on changed since ${ref}; not tried`);
      process.exit(0);
    }
    console.log(`templates: ${a.dirs === null ? a.why[0] : 'a package they import is affected'}; trying them`);
  } else console.log(`templates: could not compare with ${ref}, so they are tried`);
}

const tmp = mkdtempSync(join(tmpdir(), 'wb-templates-'));
const SKIP = new Set(['node_modules', 'dist', '_site', '_look', '_gh', '.git', 'games', 'labs']);
cpSync(ROOT, tmp, {
  recursive: true,
  filter: src => {
    const rel = relative(ROOT, src);
    return !rel || !rel.split(sep).some(part => SKIP.has(part));
  },
});

const failed: string[] = [];
const run = (what: string, cmd: string, a: string[]) => {
  console.log(`\n── templates: ${what}`);
  const r = cmd === 'npm' ? runNpm(a, { cwd: tmp, stdio: 'inherit' }) : spawnSync(cmd, a, { cwd: tmp, stdio: 'inherit' });
  if (r.status !== 0) failed.push(what);
  return r.status === 0;
};

const ok =
  run('scaffold a game', 'node', ['tools/new.ts', 'game', 'try-game', 'A game from tools/templates/game, made to check the template.', '--no-install']) &&
  run('scaffold a lab', 'node', ['tools/new.ts', 'lab', 'try-lab', 'A lab from tools/templates/lab, made to check the template.', '--no-install']) &&
  run('install', 'npm', ['install', '--no-audit', '--no-fund']);
if (ok) {
  run('catalog', 'node', ['tools/catalog.ts', '--check']);
  run('typecheck', 'node', ['tools/each.ts', 'typecheck']);
  run('test', 'node', ['tools/each.ts', 'test']);
  if (run('build', 'node', ['tools/each.ts', 'build'])) run('boot', 'node', ['tools/look.ts', 'games/try-game', 'labs/try-lab', '--query', '?dev']);
}

if (keep) console.log(`\nthe copy is kept at ${tmp}`);
else rmSync(tmp, { recursive: true, force: true });
if (failed.length) {
  console.error(`\ntemplates: failed at ${failed.join(', ')}`);
  process.exit(1);
}
console.log('\ntemplates: a game and a lab from them install, typecheck, test, build and boot');
