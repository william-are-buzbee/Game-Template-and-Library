// tools/site/ and tools/cards.ts: what the index page promises (every game and lab on it, linked when built, its text
// escaped, light and dark, phone width, nothing fetched but its own pictures), the marks on a preview, and the card
// settings every package.json may carry. Run: node --test tools/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settings } from '../cards.ts';
import { changes, picture, type Entry, type Site } from '../site/data.ts';
import { byNews, front } from '../site/front.ts';
import { gallery } from '../site/gallery.ts';
import { day, roman, weekday, type Compare } from '../site/html.ts';
import { journal } from '../site/journal.ts';
import { title, workspaces, type Workspace } from '../lib/workspaces.ts';

const entry = (o: Partial<Entry> & Pick<Entry, 'kind' | 'name'>): Entry => ({
  title: title(o),
  dir: `${o.kind === 'game' ? 'games' : 'labs'}/${o.name}`,
  href: `${o.kind === 'game' ? 'games' : 'labs'}/${o.name}/`,
  description: `${o.name}, described`,
  uses: ['core'],
  picture: picture(o.name, { widths: [480, 960], width: 960, height: 540 }),
  last: { date: '2026-11-06', subject: `${o.name}: the last change`, time: 1_000 },
  earlier: [],
  changed: null,
  ...o,
});
const SITE: Site = {
  entries: [
    entry({ kind: 'game', name: 'old-game', last: { date: '2026-10-01', subject: 'long ago', time: 10 } }),
    entry({ kind: 'game', name: 'new-game', description: 'A <b>bold</b> & "quoted" game', last: { date: '2026-11-07', subject: 'fixed <the> thing', time: 5_000 } }),
    entry({ kind: 'game', name: 'unbuilt', href: null, picture: null, last: null }),
    entry({ kind: 'lab', name: 'planet-viewer', uses: [] }),
  ],
  pr: null,
  commit: '201129b45b294c4f44a32d646223833384204bbe',
  count: 1344,
  made: '2026-11-07',
};
const DESIGNS = { journal, gallery, front };
const COMPARE: Compare = {
  current: 'gallery.html',
  pick: 'front-page.html',
  designs: [
    { file: 'journal.html', name: 'Field journal' },
    { file: 'gallery.html', name: 'Dark gallery' },
    { file: 'front-page.html', name: 'Front page' },
  ],
};

for (const [name, render] of Object.entries(DESIGNS)) {
  test(`${name}: every game and lab is on it, linked when it was built`, () => {
    const html = render(SITE);
    for (const e of SITE.entries) assert.ok(html.includes(e.title), e.title);
    for (const e of SITE.entries.filter(e => e.href)) assert.ok(html.includes(`href="${e.href}"`), e.dir);
    assert.ok(!html.includes('href="games/unbuilt/"'));
    assert.ok(html.includes('Planet-Viewer'));
  });

  test(`${name}: text from package.json and git is escaped`, () => {
    const html = render(SITE);
    assert.ok(html.includes('A &lt;b&gt;bold&lt;/b&gt; &amp; &quot;quoted&quot; game'));
    assert.ok(!html.includes('<b>bold</b>'));
    assert.ok(!html.includes('<the>'));
  });

  test(`${name}: phone width, light and dark`, () => {
    const html = render(SITE);
    assert.ok(html.includes('<meta name="viewport" content="width=device-width, initial-scale=1">'));
    assert.ok(html.includes('@media (prefers-color-scheme:dark){:root:not([data-theme=light])'));
    assert.ok(html.includes(':root[data-theme=dark]'));
  });

  test(`${name}: nothing is fetched but its own pictures, and only the first at once`, () => {
    const html = render(SITE);
    assert.doesNotMatch(html, /<link|<script[^>]*src|@import|url\(|src="https?:/);
    assert.doesNotMatch(html, /<script/, 'no script without the comparison bar');
    const imgs = html.match(/<img [^>]*>/g) ?? [];
    assert.equal(imgs.length, 3, 'one per entry with a picture');
    for (const i of imgs) assert.match(i, /width="960" height="540"/);
    assert.equal(imgs.filter(i => i.includes('fetchpriority="high"')).length, 1);
    assert.equal(imgs.filter(i => i.includes('loading="lazy"')).length, 2);
    for (const i of imgs) assert.match(i, /srcset="cards\/[a-z-]+-480\.webp 480w, cards\/[a-z-]+-960\.webp 960w"/);
  });

  test(`${name}: marks what a pull request changed, only on its preview`, () => {
    assert.doesNotMatch(render(SITE), /pull request #13|in #13/i);
    const pr: Site = { ...SITE, pr: '13', entries: SITE.entries.map(e => (e.name === 'old-game' ? { ...e, changed: 'here' } : e)) };
    const html = render(pr);
    assert.match(html, /pull request #13|changed in #13/i);
    assert.match(html, /[Cc]hanged in (this pull request|#13)|Revised in pull request #13/);
  });

  test(`${name}: the comparison bar links all three, and is the only script`, () => {
    const html = render(SITE, COMPARE);
    for (const d of COMPARE.designs) assert.ok(html.includes(`href="${d.file}"`), d.file);
    assert.ok(html.includes('href="gallery.html" aria-current="page"'));
    assert.ok(html.includes('Front page (my pick)'));
    assert.equal((html.match(/<script>/g) ?? []).length, 2);
  });

  test(`${name}: says so when there is nothing yet`, () => {
    const html = render({ ...SITE, entries: [] });
    assert.match(html, /None yet|No entries yet|Nothing to report/);
  });
}

test('the front page leads with what the pull request changed, then what changed last', () => {
  const order = (s: Site) => byNews(s.entries).map(e => e.name);
  assert.deepEqual(order(SITE), ['new-game', 'planet-viewer', 'old-game', 'unbuilt']);
  const pr = { ...SITE, entries: SITE.entries.map(e => (e.name === 'old-game' ? { ...e, changed: 'via' as const } : e.name === 'unbuilt' ? { ...e, changed: 'here' as const } : e)) };
  assert.deepEqual(order(pr), ['unbuilt', 'old-game', 'new-game', 'planet-viewer']);
  assert.match(front(SITE), /<article class="lead">.*?New-Game/s);
});

const ws = (kind: Workspace['kind'], name: string, uses: string[] = []): Workspace => ({
  kind,
  name,
  dir: `${kind === 'package' ? 'packages' : kind === 'game' ? 'games' : 'labs'}/${name}`,
  pkgName: `@wb/${name}`,
  description: name,
  scripts: {},
  uses,
});
const ALL = [ws('package', 'core'), ws('game', 'rootshock', ['@wb/core']), ws('game', 'tethys', ['@wb/core']), ws('lab', 'planet-viewer')];

test('a preview marks the games it changed, and those it changed through a package', () => {
  assert.deepEqual([...changes(['games/tethys/src/util.js'], ALL)], [['games/tethys', 'here']]);
  assert.deepEqual([...changes(['packages/core/src/rng.ts', 'games/tethys/package.json'], ALL)], [
    ['packages/core', 'here'],
    ['games/rootshock', 'via'],
    ['games/tethys', 'here'],
  ]);
});

test('a preview does not mark games for a change to the tools, or to documents', () => {
  assert.equal(changes(['tools/site.ts', '.github/workflows/pages.yml', 'package-lock.json'], ALL).size, 0);
  assert.equal(changes(['games/tethys/CHANGELOG.md', 'docs/decisions.md'], ALL).size, 0);
});

test('dates, numerals and names as the page writes them', () => {
  assert.equal(day('2026-11-07'), '7 Nov 2026');
  assert.equal(weekday('2026-11-07'), 'Saturday');
  assert.equal(weekday('2027-01-01'), 'Friday');
  assert.deepEqual([1, 4, 9, 14, 40, 1999].map(roman), ['I', 'IV', 'IX', 'XIV', 'XL', 'MCMXCIX']);
  assert.equal(title({ name: 'planet-viewer' }), 'Planet-Viewer');
  assert.equal(title({ name: 'tethys' }), 'Tethys');
});

test('card settings: the defaults, and a size that is not WIDTHxHEIGHT refused', () => {
  assert.deepEqual(settings(), { query: '', width: 1280, height: 720, scale: 1, wait: 2500, click: [], ready: undefined, element: undefined });
  assert.equal(settings({ size: '640x360', scale: 2 }).width, 640);
  assert.throws(() => settings({ size: '640' }), /WIDTHxHEIGHT/);
});

test('every "card" in the repository uses only the settings tools/cards.ts knows', () => {
  const known = new Set(['query', 'size', 'scale', 'wait', 'click', 'ready', 'element']);
  for (const w of workspaces().filter(w => w.card)) {
    for (const k of Object.keys(w.card!)) assert.ok(known.has(k), `${w.dir}: card.${k} is not a setting`);
    assert.doesNotThrow(() => settings(w.card), w.dir);
    if (w.card!.click) assert.ok(Array.isArray(w.card!.click), `${w.dir}: card.click is a list of selectors`);
  }
});
