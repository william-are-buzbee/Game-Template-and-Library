// tools/site/ and tools/cards.ts: what the index page promises (every game and lab on it, linked when built, its text
// escaped, dark by default with a switch to light, phone width, nothing fetched but its own pictures), which game it
// features, the marks on a preview, and the card settings every package.json may carry. Run: node --test tools/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settings } from '../cards.ts';
import { byRecent, changes, picture, type Entry, type Site } from '../site/data.ts';
import { gallery, hang } from '../site/gallery.ts';
import { day } from '../site/html.ts';
import { title, workspaces, type Workspace } from '../lib/workspaces.ts';

const entry = (o: Partial<Entry> & Pick<Entry, 'kind' | 'name'>): Entry => ({
  title: title(o),
  dir: `${o.kind === 'game' ? 'games' : 'labs'}/${o.name}`,
  href: `${o.kind === 'game' ? 'games' : 'labs'}/${o.name}/`,
  description: `${o.name}, described`,
  uses: ['core'],
  picture: picture(o.name, { widths: [480, 960, 1280], width: 1280, height: 720 }),
  last: { date: '2026-11-06', subject: `${o.name}: the last change`, time: 1_000 },
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
  made: '2026-11-07',
};
const titles = (html: string) => [...html.matchAll(/<span class="t">([^<]+)<\/span>/g)].map(m => m[1]);

test('every game and lab is on the page, linked when it was built', () => {
  const html = gallery(SITE);
  for (const e of SITE.entries) assert.ok(html.includes(`<span class="t">${e.title}</span>`), e.title);
  for (const e of SITE.entries.filter(e => e.href)) assert.ok(html.includes(`href="${e.href}"`), e.dir);
  assert.ok(!html.includes('href="games/unbuilt/"'));
  assert.match(html, /<span class="blank">Unbuilt<\/span>/, 'no picture: a card of its name');
  assert.match(html, /Games <span>3<\/span>.*Labs <span>1<\/span>/s);
});

test('text from package.json and git is escaped', () => {
  const html = gallery(SITE);
  assert.ok(html.includes('A &lt;b&gt;bold&lt;/b&gt; &amp; &quot;quoted&quot; game'));
  assert.ok(!html.includes('<b>bold</b>'));
});

test('dark whatever the system says, light only when asked for', () => {
  const html = gallery(SITE);
  assert.match(html, /<style>[^]*?:root\{color-scheme:dark;--wall:#111110/, 'the page starts dark');
  assert.match(html, /:root\[data-theme=light\]\{color-scheme:light;--wall:#f2f1ed/);
  assert.doesNotMatch(html, /prefers-color-scheme/, 'the system setting does not choose');
  assert.ok(html.includes('<meta name="color-scheme" content="dark light">'));
  // the switch is hidden until its script shows it, so with no script the page is dark and has no dead button
  assert.match(html, /<button class="mode" type="button" hidden>Lights on<\/button>/);
  assert.match(html, /<head>[^]*localStorage\.getItem\('wb-theme'\)==='light'[^]*<style>/, 'read before the page is drawn');
});

test('phone width', () => {
  assert.ok(gallery(SITE).includes('<meta name="viewport" content="width=device-width, initial-scale=1">'));
});

test('nothing is fetched but its own pictures, and only the first at once', () => {
  const html = gallery(SITE);
  assert.doesNotMatch(html, /<link|<script[^>]*src|@import|url\(|src="https?:/);
  assert.equal((html.match(/<script>/g) ?? []).length, 2, 'the light switch: one line in the head, one at the end');
  const imgs = html.match(/<img [^>]*>/g) ?? [];
  assert.equal(imgs.length, 3, 'one per entry with a picture');
  for (const i of imgs) assert.match(i, /width="1280" height="720"/);
  assert.equal(imgs.filter(i => i.includes('fetchpriority="high"')).length, 1);
  assert.equal(imgs.filter(i => i.includes('loading="lazy"')).length, 2);
  for (const i of imgs) assert.match(i, /srcset="cards\/[a-z-]+-480\.webp 480w, cards\/[a-z-]+-960\.webp 960w, cards\/[a-z-]+-1280\.webp 1280w"/);
});

test('the game changed last is featured; the rest keep the catalog order', () => {
  assert.deepEqual(titles(gallery(SITE)), ['New-Game', 'Old-Game', 'Unbuilt', 'Planet-Viewer']);
  assert.match(gallery(SITE), /<li class="work"><a href="games\/new-game\/"><span class="frame"><img [^>]*fetchpriority="high"/);
  // on a preview, what the pull request changed comes first, before anything changed more recently
  const games = SITE.entries.filter(e => e.kind === 'game').map(e => (e.name === 'unbuilt' ? { ...e, changed: 'here' as const } : e));
  assert.deepEqual(hang(games).map(e => e.name), ['unbuilt', 'old-game', 'new-game']);
  assert.deepEqual(byRecent(games.map(e => (e.name === 'old-game' ? { ...e, changed: 'via' as const } : e))).map(e => e.name), ['unbuilt', 'old-game', 'new-game']);
  assert.deepEqual(hang([]), []);
});

test('a preview says so and marks what it changed; the live page does neither', () => {
  const live = gallery(SITE);
  assert.doesNotMatch(live, /pull request #|changed in #/);
  assert.match(live, /<a href="https:\/\/github\.com\/william-are-buzbee\/Game-Template-and-Library">Game-Template-and-Library<\/a>/);
  const pr = gallery({ ...SITE, pr: '14', entries: SITE.entries.map(e => (e.name === 'old-game' ? { ...e, changed: 'here' } : e.name === 'planet-viewer' ? { ...e, changed: 'via' } : e)) });
  assert.match(pr, /Preview of <a href="[^"]+\/pull\/14">pull request #14<\/a>: what it changed is marked/);
  assert.equal((pr.match(/class="k mark">changed in #14/g) ?? []).length, 2);
  assert.match(pr, /changed in #14, through a package it uses/);
});

test('says so when there is nothing yet', () => {
  assert.equal((gallery({ ...SITE, entries: [] }).match(/None yet\./g) ?? []).length, 2);
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

test('dates and names as the page writes them', () => {
  assert.equal(day('2026-11-07'), '7 Nov 2026');
  assert.equal(day('2027-01-31'), '31 Jan 2027');
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
