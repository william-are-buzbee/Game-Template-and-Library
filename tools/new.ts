// tools/new.ts — starts a new game or lab from tools/templates/<kind>/.
//   npm run new -- game <name> "<one line: what it is>"
//   npm run new -- lab  <name> "<one line: what it is>"
//   add --no-install to skip `npm install` (the tests of this tool do)
// It copies the template, fills in the name, title, description and date, links the workspace (`npm install`)
// and rewrites CATALOG.md. Nothing outside the new folder, package-lock.json and CATALOG.md is touched.
import { cpSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { FOLDER, ROOT, SITE, workspaces } from './lib/workspaces.ts';

const KINDS = ['game', 'lab'] as const;
type NewKind = (typeof KINDS)[number];

function fail(msg: string): never {
  console.error(msg);
  console.error('usage: npm run new -- game|lab <name> "<one line: what it is>" [--no-install]');
  process.exit(1);
}

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const install = !process.argv.includes('--no-install');
const [kind, name, description] = args as [NewKind, string, string];

if (!KINDS.includes(kind)) fail(`kind must be one of: ${KINDS.join(', ')}`);
if (!name || !/^[a-z][a-z0-9-]{1,39}$/.test(name)) fail('name: lowercase letters, digits and hyphens, starting with a letter, 2–40 long');
if (!description?.trim()) fail('give a one-line description in quotes');
const taken = workspaces().find(w => w.name === name);
if (taken) fail(`"${name}" is taken: ${taken.dir}`);

const dir = join(ROOT, FOLDER[kind], name);
if (existsSync(dir)) fail(`${FOLDER[kind]}/${name} already exists`);

const title = name.split('-').map(s => s[0]!.toUpperCase() + s.slice(1)).join(' ');
const vars: Record<string, string> = {
  name,
  title,
  description: description.trim(),
  date: new Date().toISOString().slice(0, 10),
  dir: `${FOLDER[kind]}/${name}`,
  site: SITE,
};

cpSync(join(ROOT, 'tools', 'templates', kind), dir, { recursive: true });
// package.json is set as data, so a description with quotes in it stays valid JSON; every other file gets {{var}}s
const pkgFile = join(dir, 'package.json');
const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'));
pkg.name = `@wb/${name}`;
pkg.description = vars.description;
writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n');
const fill = (p: string) => {
  for (const f of readdirSync(p)) {
    const abs = join(p, f);
    if (statSync(abs).isDirectory()) fill(abs);
    else if (abs !== pkgFile) {
      const src = readFileSync(abs, 'utf8');
      const out = src.replace(/\{\{(\w+)\}\}/g, (m, k: string) => vars[k] ?? m);
      if (out !== src) writeFileSync(abs, out);
    }
  }
};
fill(dir);

console.log(`created ${vars.dir}`);
const run = (cmd: string, a: string[]) => {
  const r = spawnSync(cmd, a, { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) fail(`${cmd} ${a.join(' ')} failed`);
};
if (install) run('npm', ['install', '--no-audit', '--no-fund']);
run('node', ['tools/catalog.ts']);

console.log(`
next:
  npm run dev -w ${vars.dir}              play it while you work on it
  npm run check                         types, the catalog, the tests of what you changed
  npm run build -w ${vars.dir} && npm run look -- ${vars.dir}    a screenshot in _look/${name}.png
${kind === 'game' ? `  fill in ${vars.dir}/CLAUDE.md ("What this is") from the prompt before writing code` : `  fill in ${vars.dir}/README.md from the prompt`}`);
