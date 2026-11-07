// tools/look.ts — opens a built game or lab in headless Chromium, fails on any page error, and takes a screenshot.
//   node tools/look.ts games/<name> [--query "?dev"] [--wait 2500] [--shot path.png | --no-shot] [--size 1280x720]
//   node tools/look.ts --all          every game and lab with a dist/ (CI: "every game and lab boots")
// It serves the workspace's dist/ (what `npm run build -w <dir>` made, i.e. what gets published) on a free local
// port, so it checks the real build, not the dev server. Screenshots go to _look/<name>.png unless --shot says.
// Before the screenshot the game's frame loop is stopped (tools/lib/browser.ts `freeze`), so a game that draws slowly
// under software WebGL still gets its picture taken. Playwright: see tools/lib/browser.ts.
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { freezable, freeze, launch, serve, url as served } from './lib/browser.ts';
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

// A browser of its own for each target, closed whole afterwards: a page closed on its own waits for a renderer stuck in
// long software-WebGL frames, and the next page queued behind it (Tethys's boot took 5 min that way in CI, and
// Planet-Viewer's after it 1.7, 7 Nov 2026). --no-shot: the check without the picture (CI, where nobody looks at it).
const noShot = argv.includes('--no-shot');

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
  const url = served(server) + query;
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await freezable(page);
  const errors: string[] = [];
  // What the game loads from other hosts (Tethys's three.js from cdnjs, Rootshock's web font) it gets, if the network
  // allows. A request to another host that fails is a note, not a fault of the build: a session's network may refuse a
  // host CI reaches. What the game then does without it (a page error) still fails the check.
  const origin = new URL(url).origin;
  const outside = new Set<string>();
  const external = (u: string) => {
    try {
      return new URL(u).origin !== origin;
    } catch {
      return false;
    }
  };
  page.on('pageerror', (e: Error) => errors.push(`page error: ${e.message}`));
  page.on('console', (m: any) => {
    if (m.type() !== 'error') return;
    const at = m.location()?.url ?? '';
    if (/^Failed to load resource/.test(m.text()) && external(at)) outside.add(new URL(at).host);
    else errors.push(`console.error: ${m.text()}`);
  });
  page.on('requestfailed', (r: any) =>
    external(r.url()) ? outside.add(new URL(r.url()).host) : errors.push(`request failed: ${r.url()} (${r.failure()?.errorText})`),
  );
  // the browser asks for /favicon.ico on its own; a missing one is not the game's fault
  page.on('response', (r: any) => {
    if (r.status() < 400 || r.url().endsWith('/favicon.ico')) return;
    if (external(r.url())) outside.add(new URL(r.url()).host);
    else errors.push(`HTTP ${r.status()}: ${r.url()}`);
  });
  try {
    // a minute: drawn one frame at a time (freezable), a heavy game's load event comes later (Rootshock 14 s here)
    await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
    await page.waitForTimeout(wait);
  } catch (e) {
    errors.push(`load: ${(e as Error).message}`);
  }
  const shot = argv.includes('--shot') && targets.length === 1 ? resolve(opt('--shot', '')) : join(ROOT, '_look', `${name}.png`);
  mkdirSync(dirname(shot), { recursive: true });
  // the screenshot is for looking at, not part of the verdict: a heavy game under software WebGL can take longer to draw
  // one frame than any sensible wait (Rootshock, 6 Nov 2026), and that says nothing about whether it boots. Held to one
  // frame at a time and then stopped (tools/lib/browser.ts), it has its picture taken at once.
  const notes: string[] = [];
  let shotTaken = !noShot;
  if (!noShot) {
    await freeze(page).catch(() => {});
    await page.screenshot({ path: shot, timeout: 60_000 }).catch((e: Error) => {
      shotTaken = false;
      notes.push(`no screenshot (${e.message.split('\n')[0]}): too slow to draw under software WebGL, or hung; look at it on the preview`);
    });
  }
  await browser.close();
  server.close();
  if (outside.size) notes.push(`could not load, from other hosts: ${[...outside].join(", ")}`);
  const note = notes.map(n => `\n  (${n})`).join('');
  if (errors.length) {
    failed++;
    console.error(`✗ ${target}${query}\n  ${errors.join('\n  ')}${shotTaken ? `\n  screenshot: ${shot}` : ''}${note}`);
  } else console.log(`✓ ${target}${query} booted with no errors${shotTaken ? `; screenshot: ${shot}` : ''}${note}`);
}
process.exit(failed ? 1 : 0);
