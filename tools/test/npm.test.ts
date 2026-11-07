// tools/lib/npm.ts: how a tool starts npm on each system. Windows cannot be run from a cloud session, so its branch is
// pinned here instead. Run: node --test "tools/test/*.test.ts"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { npmInvocation, runNpm } from '../lib/npm.ts';

const NODE = 'C:\\Program Files\\nodejs\\node.exe';
const CLI = 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js';

test('started by npm: npm\'s own script with this node, no shell, on any system', () => {
  for (const platform of ['win32', 'linux', 'darwin']) {
    assert.deepEqual(npmInvocation(['run', 'test', '-w', 'games/tethys'], platform, { npm_execpath: CLI }, NODE), {
      command: NODE,
      args: [CLI, 'run', 'test', '-w', 'games/tethys'],
      shell: false,
    });
  }
});

test('started directly on Windows: npm.cmd through the shell', () => {
  assert.deepEqual(npmInvocation(['install', '--no-audit', '--no-fund'], 'win32', {}), {
    command: 'npm.cmd',
    args: ['install', '--no-audit', '--no-fund'],
    shell: true,
  });
});

test('started directly elsewhere: plain npm, no shell', () => {
  assert.deepEqual(npmInvocation(['run', 'build', '-w', 'packages/core'], 'linux', {}), {
    command: 'npm',
    args: ['run', 'build', '-w', 'packages/core'],
    shell: false,
  });
});

test('another tool\'s execpath (npx, pnpm) is not taken for npm\'s', () => {
  assert.equal(npmInvocation(['install'], 'linux', { npm_execpath: '/usr/lib/node_modules/npm/bin/npx-cli.js' }).command, 'npm');
  assert.equal(npmInvocation(['install'], 'win32', { npm_execpath: 'C:\\pnpm\\pnpm.cjs' }).command, 'npm.cmd');
});

test('on the Windows shell path, an argument the shell would split or read is refused', () => {
  for (const bad of ['two words', 'a&b', 'x|y', '"q"', '%PATH%', '']) {
    assert.throws(() => npmInvocation(['run', bad], 'win32', {}), /cannot go through the Windows shell/, JSON.stringify(bad));
  }
  // the arguments the tools pass are all fine
  assert.doesNotThrow(() => npmInvocation(['run', 'test', '-w', 'games/rootshock', '--no-audit', '@wb/core'], 'win32', {}));
});

test('it really runs npm here', () => {
  const r = runNpm(['--version'], { encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.match(String(r.stdout), /^\d+\.\d+\.\d+/);
});
