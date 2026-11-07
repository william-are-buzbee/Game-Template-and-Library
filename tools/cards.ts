// tools/cards.ts — the pictures on the site's index: a screenshot of every game and lab, taken from its build.
//   node tools/cards.ts                   every game and lab with a dist/ (CI: pages.yml, before tools/site.ts)
//   node tools/cards.ts games/<name> ...  just those
// For each it serves dist/ (what `npm run build` made, as look.ts does) and opens it as its package.json's "card" says
// (Card in tools/lib/workspaces.ts: the address, the window, clicks, what to wait for). It lets it run, stops its frame
// loop (tools/lib/browser.ts `freeze`: without that, a game drawing under software WebGL never lets the screenshot
// happen) and takes the picture. It writes _cards/<name>-<width>.webp at 480, 960 and 1280 wide, and _cards/<name>.json
// saying what is there; tools/site.ts puts them on the index. A picture of one flat colour (nothing drawn) is not kept.
// It does not fail for one game: a game with no picture is listed with a card made of its name, and the reason is
// printed, so one broken lab does not hold up the site. It never builds anything itself.
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { freezable, freeze, launch, serve, url } from './lib/browser.ts';
import { ROOT, workspaces, type Card, type Workspace } from './lib/workspaces.ts';

export const OUT = join(ROOT, '_cards');
/** the widths written (none wider than the screenshot); the index's srcset chooses between them */
export const WIDTHS = [480, 960, 1280];

/** a Card with its defaults filled in, and its size read */
export function settings(card: Card = {}) {
  const [width, height] = (card.size ?? '1280x720').split('x').map(Number) as [number, number];
  if (!(width > 0 && height > 0)) throw new Error(`card.size ${JSON.stringify(card.size)} is not WIDTHxHEIGHT`);
  return { query: card.query ?? '', width, height, scale: card.scale ?? 1, wait: card.wait ?? 2500, click: card.click ?? [], ready: card.ready, element: card.element };
}

/** what _cards/<name>.json holds */
export interface CardFile {
  /** the widths written, each as _cards/<name>-<width>.webp */
  widths: number[];
  /** the largest one's size */
  width: number;
  height: number;
}

async function shoot(browser: any, w: Workspace): Promise<{ png: Buffer; notes: string[] }> {
  const s = settings(w.card);
  const server = await serve(join(ROOT, w.dir, 'dist'));
  const page = await browser.newPage({ viewport: { width: s.width, height: s.height }, deviceScaleFactor: s.scale });
  const notes: string[] = [];
  page.on('pageerror', (e: Error) => notes.push(`page error: ${e.message}`));
  try {
    await freezable(page);
    await page.goto(url(server) + s.query, { waitUntil: 'load', timeout: 60_000 });
    for (const sel of s.click) await page.click(sel, { timeout: 30_000 });
    if (s.ready) await page.waitForSelector(s.ready, { state: 'visible', timeout: 180_000 });
    await page.waitForTimeout(s.wait);
    await freeze(page);
    const target = s.element ? page.locator(s.element) : page;
    const png: Buffer = await target.screenshot({ timeout: 120_000 });
    return { png, notes };
  } finally {
    await page.close().catch(() => {});
    server.close();
  }
}

/** scales the screenshot to each width as WebP, in the browser (no image library needed); null if it is blank */
async function encode(browser: any, png: Buffer): Promise<{ width: number; height: number; data: string }[] | null> {
  const page = await browser.newPage();
  try {
    return await page.evaluate(
      async ({ b64, widths }: { b64: string; widths: number[] }) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        // blank: every pixel of a small copy within a few levels of the first one
        const probe = document.createElement('canvas');
        probe.width = 48;
        probe.height = 27;
        const p = probe.getContext('2d')!;
        p.drawImage(img, 0, 0, probe.width, probe.height);
        const px = p.getImageData(0, 0, probe.width, probe.height).data;
        let spread = 0;
        for (let i = 0; i < px.length; i += 4)
          spread = Math.max(spread, Math.abs(px[i]! - px[0]!), Math.abs(px[i + 1]! - px[1]!), Math.abs(px[i + 2]! - px[2]!));
        if (spread < 6) return null;
        return [...new Set(widths.map(w => Math.min(w, img.naturalWidth)))].map(width => {
          const height = Math.round((width * img.naturalHeight) / img.naturalWidth);
          const c = document.createElement('canvas');
          c.width = width;
          c.height = height;
          const g = c.getContext('2d')!;
          g.imageSmoothingQuality = 'high';
          g.drawImage(img, 0, 0, width, height);
          return { width, height, data: c.toDataURL('image/webp', 0.8).split(',')[1]! };
        });
      },
      { b64: png.toString('base64'), widths: WIDTHS },
    );
  } finally {
    await page.close();
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const shown = workspaces().filter(w => w.kind !== 'package');
  const unknown = args.filter(a => !shown.some(w => w.dir === a));
  if (unknown.length) {
    console.error(`not a game or lab: ${unknown.join(', ')}\nusage: node tools/cards.ts [games/<name> | labs/<name> ...]`);
    process.exit(2);
  }
  const targets = args.length ? shown.filter(w => args.includes(w.dir)) : shown;
  mkdirSync(OUT, { recursive: true });
  const browser = await launch();
  let made = 0;
  for (const w of targets) {
    for (const old of readdirSync(OUT)) if (old === `${w.name}.json` || new RegExp(`^${w.name}-\\d+\\.webp$`).test(old)) rmSync(join(OUT, old));
    if (!existsSync(join(ROOT, w.dir, 'dist', 'index.html'))) {
      console.warn(`– ${w.dir}: no dist/index.html (run \`npm run build -w ${w.dir}\`); no card`);
      continue;
    }
    const t0 = Date.now();
    try {
      const { png, notes } = await shoot(browser, w);
      const sizes = await encode(browser, png);
      const took = `${((Date.now() - t0) / 1000).toFixed(0)} s`;
      const said = notes.map(n => `\n    (${n})`).join('');
      if (!sizes) {
        console.warn(`– ${w.dir}: the picture is one flat colour (nothing drawn yet?), not kept; ${took}${said}`);
        continue;
      }
      for (const s of sizes) writeFileSync(join(OUT, `${w.name}-${s.width}.webp`), Buffer.from(s.data, 'base64'));
      const big = sizes[sizes.length - 1]!;
      const file: CardFile = { widths: sizes.map(s => s.width), width: big.width, height: big.height };
      writeFileSync(join(OUT, `${w.name}.json`), JSON.stringify(file) + '\n');
      const kb = sizes.map(s => `${s.width}: ${Math.round((s.data.length * 0.75) / 1024)} KB`).join(', ');
      console.log(`✓ ${w.dir}: ${kb}; ${took}${said}`);
      made++;
    } catch (e) {
      console.warn(`– ${w.dir}: no card (${(e as Error).message.split('\n')[0]}); ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
  }
  await browser.close();
  console.log(`_cards/: ${made} of ${targets.length} pictures.`);
}
