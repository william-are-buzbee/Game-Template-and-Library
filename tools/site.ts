// tools/site.ts — assembles the published site in _site/ from what `npm run build` left in each workspace's dist/,
// and the card pictures tools/cards.ts left in _cards/.
//   node tools/site.ts
// Each build is copied to _site/<folder>/<name>/ and each card picture to _site/cards/. The index page lists every game
// and lab from the same package.json fields as CATALOG.md, with its picture and the last change to it (git); it is
// written by one of the designs in tools/site/, never by hand. A workspace with no dist/ is listed without a link and
// warned about, and one with no picture gets a card made of its name, so one broken lab does not take the site down.
// On a pull request's preview (PREVIEW_PR, and PREVIEW_BASE: the branch it goes into) it also marks what the pull
// request changed. .github/publish.sh puts _site on the gh-pages branch.
//
// While three designs are compared, until the person picks one (docs/decisions.md will say which), all three are
// written, journal.html, gallery.html and front-page.html, each with a bar to switch between them; index.html is PICK.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { OUT as CARDS } from './cards.ts';
import { ROOT, workspaces } from './lib/workspaces.ts';
import { gather, type Site } from './site/data.ts';
import type { Compare } from './site/html.ts';
import { front } from './site/front.ts';
import { gallery } from './site/gallery.ts';
import { journal } from './site/journal.ts';

const DESIGNS: { file: string; name: string; render: (site: Site, compare?: Compare) => string }[] = [
  { file: 'journal.html', name: 'Field journal', render: journal },
  { file: 'gallery.html', name: 'Dark gallery', render: gallery },
  { file: 'front-page.html', name: 'Front page', render: front },
];
const PICK = 'front-page.html';

const out = join(ROOT, '_site');
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'cards'), { recursive: true });

const all = workspaces();
const shown = all.filter(w => w.kind !== 'package');
const built = new Set<string>();
for (const w of shown) {
  const dist = join(ROOT, w.dir, 'dist');
  if (!existsSync(join(dist, 'index.html'))) {
    console.warn(`warning: ${w.dir} has no dist/index.html (run \`npm run build -w ${w.dir}\`); listed without a link`);
    continue;
  }
  cpSync(dist, join(out, w.dir), { recursive: true });
  built.add(w.dir);
}

const site = gather(all, built, {
  cards: CARDS,
  pr: process.env.PREVIEW_PR || undefined,
  base: process.env.PREVIEW_BASE || undefined,
  commit: process.env.GITHUB_SHA,
});
for (const e of site.entries) {
  if (!e.picture) {
    console.warn(`warning: ${e.dir} has no card picture (\`node tools/cards.ts ${e.dir}\`); its card is its name`);
    continue;
  }
  for (const f of readdirSync(CARDS)) if (new RegExp(`^${e.name}-\\d+\\.webp$`).test(f)) cpSync(join(CARDS, f), join(out, 'cards', f));
}

for (const d of DESIGNS) {
  const html = d.render(site, { current: d.file, pick: PICK, designs: DESIGNS });
  writeFileSync(join(out, d.file), html);
  if (d.file === PICK) writeFileSync(join(out, 'index.html'), html);
}
const pictured = site.entries.filter(e => e.picture).length;
console.log(`_site/ assembled: ${built.size} of ${shown.length} games and labs built, ${pictured} pictured; index.html is ${PICK}.`);
