// tools/site/html.ts — the parts of the index page that are not its design: escaping, dates, the picture tag, the
// document around it, and the line at its foot.
import type { Picture, Site } from './data.ts';

export const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** 2026-11-07 → "7 Nov 2026", the way the repository's documents write dates */
export function day(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** "3 games, 1 lab" */
export function tally(site: Site, sep = ', '): string {
  const n = (kind: string) => site.entries.filter(e => e.kind === kind).length;
  const g = n('game'), l = n('lab');
  return `${g} game${g === 1 ? '' : 's'}${sep}${l} lab${l === 1 ? '' : 's'}`;
}

/**
 * The picture tag. Only the first picture on the page is fetched at once; the rest wait until they are scrolled near
 * (`loading="lazy"`), and every one carries its size so nothing moves as they arrive. `sizes` says how wide it is shown,
 * so a phone fetches the 480 and only a wide, sharp screen the 1280.
 */
export function img(p: Picture, o: { sizes: string; alt: string; first?: boolean }): string {
  return `<img src="${p.src}" srcset="${p.srcset}" sizes="${o.sizes}" width="${p.width}" height="${p.height}" alt="${esc(o.alt)}" ${
    o.first ? 'fetchpriority="high"' : 'loading="lazy"'
  } decoding="async">`;
}

/** the whole document: one request for the page, its style inline, and whatever small inline script it brings */
export function page(o: { title: string; scheme: string; css: string; body: string; head?: string; tail?: string }): string {
  const what = 'Every game and lab in the Game-Template-and-Library repository, built from its code: play any of them in the browser.';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="${o.scheme}">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(what)}">
${o.head ?? ''}<style>
*,*::before,*::after{box-sizing:border-box}img{max-width:100%}
${o.css}
</style>
</head>
<body>
${o.body}
${o.tail ?? ''}</body>
</html>
`;
}

/** the line at the foot of the page: where it was made from */
export function provenance(site: Site, repo: string): string {
  const from = site.commit ? ` from <a href="${repo}/commit/${esc(site.commit)}"><code>${esc(site.commit.slice(0, 7))}</code></a>` : '';
  const pr = site.pr ? `Preview of <a href="${repo}/pull/${esc(site.pr)}">pull request #${esc(site.pr)}</a>. ` : '';
  return `${pr}Made on ${day(site.made)}${from} by <code>tools/site.ts</code>. The code, the packages and the catalog are in <a href="${repo}">the repository</a>.`;
}
