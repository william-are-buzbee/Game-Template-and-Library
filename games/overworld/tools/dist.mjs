#!/usr/bin/env node
// dist.mjs — the published game: the folder as it is (no build), copied to dist/ for the repository's site.
// Everything but the tools, the package files and what git ignores, as the old Pages workflow published it.
import fs from 'node:fs';
import path from 'node:path';

const game = path.resolve(new URL('.', import.meta.url).pathname, '..');
const out = path.join(game, 'dist');
const SKIP = new Set(['dist', 'node_modules', 'tools', 'package.json', '.gitignore']);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const f of fs.readdirSync(game)) if (!SKIP.has(f) && !f.startsWith('.')) fs.cpSync(path.join(game, f), path.join(out, f), { recursive: true });
console.log(`dist/: ${fs.readdirSync(out).join(', ')}`);
