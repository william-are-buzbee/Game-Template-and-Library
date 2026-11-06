// tools/look.ts — opens a built game or lab in headless Chromium, fails on any page error, and takes a screenshot.
//   node tools/look.ts games/<name> [--query "?dev"] [--wait 2500] [--shot path.png] [--size 1280x720]
//   node tools/look.ts --all          every game and lab with a dist/ (CI: "every game and lab boots")
// It serves the workspace's dist/ (what `npm run build -w <dir>` made, i.e. what gets published) on a free local
// port, so it checks the real build, not the dev server. Screenshots go to _look/<name>.png unless --shot says.
// Playwright is not a dependency of the repo: it is found as PLAYWRIGHT_MODULE, else as a global `playwright`
// (cloud sessions have one; CI installs one in the job).
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
import { ROOT, workspaces } from './lib/workspaces.ts';

const argv = process.argv.slice(2);
const opt = (k: string, d: string) => {
  const i = argv.indexOf(k);
  return i >= 0 && argv[i + 1] ? argv[i + 1]! : d;
};
const flagValues = new Set(['--query', '--wait', '--shot', '--size'].flatMap(k => (argv.includes(k) ? [argv[argv.indexOf(k) + 1]] : [])));
const all = argv.includes('--all');
// --all is every game and lab; one with no build fails below rather than being skipped
const targets = all ? workspaces().filter(w => w.kind !== 'package').map(w => w.dir) : argv.filter(a => !a.startsWith('--') && !flagValues.has(a));
if (all && !targets.length) {
  console.log('no games or labs to look at');
  process.exit(0);
}
if (!targets.length) {
  console.error('usage: node tools/look.ts <games/name|labs/name> [...] | --all   [--query "?dev"] [--wait ms] [--shot file] [--size WxH]');
  process.exit(2);
}
const wait = Number(opt('--wait', '2500'));
const query = opt('--query', '');
const [W, H] = opt('--size', '1280x720').split('x').map(Number) as [number, number];

const TYPES: Record<string, string> = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.wav': 'audio/wav',
  '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.txt': 'text/plain',
};

function serve(dir: string): Promise<Server> {
  const root = resolve(dir);
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    let file = normalize(join(root, path));
    if (!file.startsWith(root)) return void res.writeHead(403).end();
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) return void res.writeHead(404).end();
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise(ok => server.listen(0, '127.0.0.1', () => ok(server)));
}

const require = createRequire(import.meta.url);
let pw: any;
try {
  pw = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
} catch {
  console.error('Playwright not found: set PLAYWRIGHT_MODULE to its folder, or install it globally (`npm i -g playwright`).');
  process.exit(2);
}
// software WebGL, so a machine with no GPU (CI, a cloud session) still draws
const browser = await pw.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

let failed = 0;
for (const target of targets) {
  const dist = join(ROOT, target, 'dist');
  const name = target.split('/').pop()!;
  if (!existsSync(join(dist, 'index.html'))) {
    console.error(`✗ ${target}: no dist/index.html (run \`npm run build -w ${target}\` first)`);
    failed++;
    continue;
  }
  const server = await serve(dist);
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/${query}`;
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors: string[] = [];
  // only the build itself is served: anything from another host (a web font, say) is refused, so the check is of the
  // game and not of the network, and it runs the same in CI, in a session with no internet, and offline
  const origin = new URL(url).origin;
  const outside = new Set<string>();
  await page.route((u: URL) => u.origin !== origin, (r: any) => (outside.add(new URL(r.request().url()).host), r.abort()));
  page.on('pageerror', (e: Error) => errors.push(`page error: ${e.message}`));
  page.on('console', (m: any) => m.type() === 'error' && !/net::ERR_FAILED/.test(m.text()) && errors.push(`console.error: ${m.text()}`));
  page.on('requestfailed', (r: any) => new URL(r.url()).origin === origin && errors.push(`request failed: ${r.url()} (${r.failure()?.errorText})`));
  // the browser asks for /favicon.ico on its own; a missing one is not the game's fault
  page.on('response', (r: any) => r.status() >= 400 && !r.url().endsWith('/favicon.ico') && errors.push(`HTTP ${r.status()}: ${r.url()}`));
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 20_000 });
    await page.waitForTimeout(wait);
  } catch (e) {
    errors.push(`load: ${(e as Error).message}`);
  }
  const shot = argv.includes('--shot') && targets.length === 1 ? resolve(opt('--shot', '')) : join(ROOT, '_look', `${name}.png`);
  mkdirSync(dirname(shot), { recursive: true });
  // the screenshot is for looking at, not part of the verdict: a heavy game under software WebGL can take longer to draw
  // one frame than any sensible wait (Rootshock, 6 Nov 2026), and that says nothing about whether it boots
  const notes: string[] = [];
  let shotTaken = true;
  await page.screenshot({ path: shot, timeout: 20_000 }).catch((e: Error) => {
    shotTaken = false;
    notes.push(`no screenshot (${e.message.split('\n')[0]}): too slow to draw under software WebGL, or hung; look at it on the preview`);
  });
  await page.close();
  server.close();
  if (outside.size) notes.push(`refused, from other hosts: ${[...outside].join(', ')}`);
  const note = notes.map(n => `\n  (${n})`).join('');
  if (errors.length) {
    failed++;
    console.error(`✗ ${target}${query}\n  ${errors.join('\n  ')}${shotTaken ? `\n  screenshot: ${shot}` : ''}${note}`);
  } else console.log(`✓ ${target}${query} booted with no errors${shotTaken ? `; screenshot: ${shot}` : ''}${note}`);
}
await browser.close();
process.exit(failed ? 1 : 0);
