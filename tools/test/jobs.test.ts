// tools/lib/jobs.ts: the jobs CI makes from the workspaces a change affects. Run: node --test "tools/test/*.test.ts"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jobs, needsTemplates } from '../lib/jobs.ts';
import { changedRef } from '../lib/changed.ts';
import type { Workspace } from '../lib/workspaces.ts';

const ws = (dir: string, scripts: Record<string, string>): Workspace => ({
  kind: dir.startsWith('packages/') ? 'package' : dir.startsWith('games/') ? 'game' : 'lab',
  name: dir.split('/')[1]!,
  dir,
  pkgName: `@wb/${dir.split('/')[1]}`,
  description: '',
  scripts,
  uses: [],
});
const ALL = [
  ws('packages/core', { test: 'vitest run', build: 'vite build' }),
  ws('games/overworld', { test: 'x', smoke: 'y', build: 'z' }),
  ws('games/tethys', { test: 'x', build: 'z' }),
  ws('labs/quiet', { build: 'vite build' }),
];

test('everything (a push to main): one job per workspace with anything to run, in catalog order', () => {
  assert.deepEqual(jobs(ALL, null), [
    { name: 'core', dir: 'packages/core', test: true, build: true, smoke: false, boot: false },
    { name: 'overworld', dir: 'games/overworld', test: true, build: true, smoke: true, boot: true },
    { name: 'tethys', dir: 'games/tethys', test: true, build: true, smoke: false, boot: true },
    { name: 'quiet', dir: 'labs/quiet', test: false, build: true, smoke: false, boot: true },
  ]);
});

test('a package builds and tests but is never booted; a game or lab that builds is', () => {
  const [core, , , quiet] = jobs(ALL, null);
  assert.equal(core!.boot, false);
  assert.equal(quiet!.boot, true);
});

test('a pull request: only the affected ones', () => {
  assert.deepEqual(jobs(ALL, ['games/tethys']).map(j => j.name), ['tethys']);
});

test('a workspace with nothing to run makes no job, even when affected', () => {
  assert.deepEqual(jobs([ws('labs/empty', { dev: 'vite' })], ['labs/empty']), []);
});

test('the templates are tried for a shared change or a package, not for a game alone', () => {
  assert.equal(needsTemplates(null), true);
  assert.equal(needsTemplates(['packages/core', 'games/tethys']), true);
  assert.equal(needsTemplates(['games/tethys', 'labs/quiet']), false);
  assert.equal(needsTemplates([]), false);
});

test('nothing affected, no jobs', () => {
  assert.deepEqual(jobs(ALL, []), []);
});

test('--changed reads as origin/main, --changed=<ref> as that ref, nothing as null', () => {
  assert.equal(changedRef(['--changed']), 'origin/main');
  assert.equal(changedRef(['x', '--changed=origin/dev']), 'origin/dev');
  assert.equal(changedRef(['--keep']), null);
});
