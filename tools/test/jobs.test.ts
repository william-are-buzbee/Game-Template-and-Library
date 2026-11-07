// tools/lib/jobs.ts: the jobs CI makes from the workspaces a change affects. Run: node --test "tools/test/*.test.ts"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jobs } from '../lib/jobs.ts';
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

test('everything (a push to main): one job per workspace with a test or smoke script, in catalog order', () => {
  assert.deepEqual(jobs(ALL, null), [
    { name: 'core', dir: 'packages/core', test: true, smoke: false },
    { name: 'overworld', dir: 'games/overworld', test: true, smoke: true },
    { name: 'tethys', dir: 'games/tethys', test: true, smoke: false },
  ]);
});

test('a pull request: only the affected ones', () => {
  assert.deepEqual(jobs(ALL, ['games/tethys']).map(j => j.name), ['tethys']);
});

test('a workspace with nothing to run makes no job, even when affected', () => {
  assert.deepEqual(jobs(ALL, ['labs/quiet']), []);
});

test('nothing affected, no jobs', () => {
  assert.deepEqual(jobs(ALL, []), []);
});

test('--changed reads as origin/main, --changed=<ref> as that ref, nothing as null', () => {
  assert.equal(changedRef(['--changed']), 'origin/main');
  assert.equal(changedRef(['x', '--changed=origin/dev']), 'origin/dev');
  assert.equal(changedRef(['--keep']), null);
});
