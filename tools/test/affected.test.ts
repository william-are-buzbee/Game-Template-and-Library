// tools/lib/affected.ts: which workspaces a change can affect. A mistake here means a pull request that skips the tests
// of something it broke, so every rule it has is pinned here. Run: node --test tools/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { affected, ignorable } from '../lib/affected.ts';
import type { Workspace } from '../lib/workspaces.ts';

const ws = (kind: Workspace['kind'], name: string, uses: string[] = []): Workspace => ({
  kind,
  name,
  dir: `${kind === 'package' ? 'packages' : kind === 'game' ? 'games' : 'labs'}/${name}`,
  pkgName: `@wb/${name}`,
  description: name,
  scripts: { test: 'x' },
  uses,
});
// the repository as it is: core used by the three games; a second package used by one game, which itself uses core
const ALL = [
  ws('package', 'core'),
  ws('package', 'three-kit', ['@wb/core']),
  ws('game', 'rootshock', ['@wb/core']),
  ws('game', 'overworld', ['@wb/core']),
  ws('game', 'tethys', ['@wb/core', '@wb/three-kit']),
  ws('lab', 'planet-viewer'),
];

test('a change inside one game tests that game only', () => {
  assert.deepEqual(affected(['games/rootshock/src/sim/player.ts'], ALL).dirs, ['games/rootshock']);
});

test('a lab on its own', () => {
  assert.deepEqual(affected(['labs/planet-viewer/core-math.js'], ALL).dirs, ['labs/planet-viewer']);
});

test('a change to a package tests it and everything that uses it, transitively', () => {
  assert.deepEqual(affected(['packages/core/src/rng.ts'], ALL).dirs, [
    'packages/core',
    'packages/three-kit',
    'games/rootshock',
    'games/overworld',
    'games/tethys',
  ]);
  // three-kit's only user is tethys; core does not use three-kit, so it stays out
  assert.deepEqual(affected(['packages/three-kit/src/x.ts'], ALL).dirs, ['packages/three-kit', 'games/tethys']);
});

test('two games changed: both, in catalog order, each said once', () => {
  const r = affected(['games/tethys/src/util.js', 'games/overworld/js/rng.js', 'games/tethys/test/anim.js'], ALL);
  assert.deepEqual(r.dirs, ['games/overworld', 'games/tethys']);
  assert.equal(r.why.length, 2);
});

test('anything shared means everything', () => {
  for (const f of ['tools/each.ts', 'tools/templates/game/src/main.ts', '.github/workflows/check.yml', 'package.json',
    'package-lock.json', 'tsconfig.base.json', '.nvmrc', '.gitattributes', '.gitignore']) {
    const r = affected(['games/rootshock/src/main.ts', f], ALL);
    assert.equal(r.dirs, null, f);
    assert.match(r.why[0]!, new RegExp(f.replace(/\./g, '\\.')));
  }
});

test('documentation changes nothing to test, inside a game or out', () => {
  assert.deepEqual(affected(['README.md', 'CLAUDE.md', 'CATALOG.md', 'docs/decisions.md', 'docs/only-will-merges.json',
    '.claude/skills/promote/SKILL.md', 'games/tethys/DESIGN.md', 'games/overworld/Notes/Todo.md', 'games/README.md'], ALL).dirs, []);
  assert.ok(ignorable('games/tethys/CHANGELOG.md') && ignorable('docs/x.json') && !ignorable('games/tethys/src/x.js'));
});

test('Windows separators and ./ are read as the same paths', () => {
  assert.deepEqual(affected(['games\\tethys\\src\\util.js', './labs/planet-viewer/main.js'], ALL).dirs, ['games/tethys', 'labs/planet-viewer']);
});

test('a name that only starts like a workspace is not it', () => {
  // games/tethys-2 is not games/tethys; with no such workspace it is a loose path, which is shared
  assert.equal(affected(['games/tethys-2/src/a.js'], ALL).dirs, null);
});

test('nothing changed, nothing to test', () => {
  assert.deepEqual(affected([], ALL), { dirs: [], why: [] });
});
