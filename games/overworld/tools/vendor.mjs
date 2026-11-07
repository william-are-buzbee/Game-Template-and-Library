#!/usr/bin/env node
// vendor.mjs — keeps vendor/wb-core.js, the repository's @wb/core (packages/core) built as an ES module, in step.
// The game has no build step: js/rng.js imports ../vendor/wb-core.js by its path, so the same file works in the browser,
// in node (tools/spectra.mjs) and in the smoke test. The copy is committed, so serving the folder is all it takes.
//   node tools/vendor.mjs           build @wb/core and write vendor/wb-core.js
//   node tools/vendor.mjs --check   build @wb/core and fail if vendor/wb-core.js differs (npm test and the build run this)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runNpm } from '../../../tools/lib/npm.ts';

const game = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const repo = path.resolve(game, '..', '..');
const built = path.join(repo, 'packages', 'core', 'dist', 'core.js');
const vendored = path.join(game, 'vendor', 'wb-core.js');

const r = runNpm(['run', 'build', '-w', 'packages/core'], { cwd: repo, stdio: ['ignore', 'ignore', 'inherit'] });
if (r.status !== 0 || !fs.existsSync(built)) { console.error('vendor: building @wb/core failed'); process.exit(1); }
const want = fs.readFileSync(built, 'utf8');
if (process.argv.includes('--check')) {
  const have = fs.existsSync(vendored) ? fs.readFileSync(vendored, 'utf8') : '';
  if (have !== want) { console.error('vendor/wb-core.js is not the current @wb/core: run `npm run vendor -w games/overworld` and commit it'); process.exit(1); }
  console.log('vendor/wb-core.js is the current @wb/core');
} else {
  fs.mkdirSync(path.dirname(vendored), { recursive: true });
  fs.writeFileSync(vendored, want);
  console.log('vendor/wb-core.js written from @wb/core');
}
