// tools/site/html.ts — what every design of the index shares: escaping, dates, the picture tag, the page around it,
// and (while the designs are being compared) the bar that switches between them.
import type { Picture, Site } from './data.ts';

export const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const parts = (iso: string) => iso.split('-').map(Number) as [number, number, number];
/** 2026-11-07 → "7 Nov 2026", the way the repository's documents write dates */
export function day(iso: string): string {
  const [y, m, d] = parts(iso);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
/** 2026-11-07 → "Saturday" */
export function weekday(iso: string): string {
  const [y, m, d] = parts(iso);
  return DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]!;
}

export function roman(n: number): string {
  let out = '';
  for (const [v, s] of [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']] as const)
    for (; n >= v; n -= v) out += s;
  return out;
}

/** "3 games, 1 lab"; `words` spells small numbers out ("three games, one lab") */
export function tally(site: Site, words = false): string {
  const say = (n: number) => (words && n <= 10 ? ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n]! : String(n));
  const n = (kind: string) => site.entries.filter(e => e.kind === kind).length;
  const g = n('game'), l = n('lab');
  return `${say(g)} game${g === 1 ? '' : 's'}, ${say(l)} lab${l === 1 ? '' : 's'}`;
}

/**
 * The picture tag. Only the first picture on a page is fetched at once; the rest wait until they are scrolled near
 * (`loading="lazy"`), and every one carries its size so nothing moves as they arrive. `sizes` says how wide it is shown,
 * so a phone fetches the 480 and a wide screen the 960.
 */
export function img(p: Picture, o: { sizes: string; alt: string; first?: boolean }): string {
  return `<img src="${p.src}" srcset="${p.srcset}" sizes="${o.sizes}" width="${p.width}" height="${p.height}" alt="${esc(o.alt)}" ${
    o.first ? 'fetchpriority="high"' : 'loading="lazy"'
  } decoding="async">`;
}

/** CSS custom properties for light, and for dark (by the system's setting, or the comparison bar's choice) */
export function themes(light: string, dark: string): string {
  return `:root{${light}}@media (prefers-color-scheme:dark){:root:not([data-theme=light]){${dark}}}:root[data-theme=dark]{${dark}}`;
}

/** the designs being compared, while they are; the page they are on is `current` */
export interface Compare {
  current: string;
  /** which one index.html is */
  pick: string;
  designs: { file: string; name: string }[];
}

const COMPARE_CSS = `.cmp{font:13px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#1d1d1b;color:#e8e6e1;padding:10px 16px;display:flex;flex-wrap:wrap;gap:6px 18px;align-items:center;justify-content:center}
.cmp p{margin:0;color:#a9a69e}.cmp a,.cmp button{color:#e8e6e1;background:none;border:1px solid #45443f;border-radius:99px;padding:3px 11px;font:inherit;text-decoration:none;cursor:pointer}
.cmp a[aria-current],.cmp button[aria-pressed=true]{background:#e8e6e1;color:#1d1d1b;border-color:#e8e6e1}.cmp span{display:flex;flex-wrap:wrap;gap:6px;align-items:center}`;

function compareBar(c: Compare, site: Site): string {
  const links = c.designs
    .map(d => `<a href="${d.file}"${d.file === c.current ? ' aria-current="page"' : ''}>${esc(d.name)}${d.file === c.pick ? ' (my pick)' : ''}</a>`)
    .join('');
  return `<nav class="cmp" aria-label="Designs being compared"><p>${site.pr ? `Pull request #${esc(site.pr)}: three` : 'Three'} designs for this page.</p><span>${links}</span><span><button data-t="">system</button><button data-t="light">light</button><button data-t="dark">dark</button></span></nav>`;
}

// the light/dark buttons: remembered in this browser only, and only while the designs are compared
const THEME_HEAD = `<script>try{var t=localStorage.getItem('wb-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>`;
const THEME_BODY = `<script>(function(){var r=document.documentElement,b=document.querySelectorAll('.cmp button');function show(){var t=r.getAttribute('data-theme')||'';b.forEach(function(x){x.setAttribute('aria-pressed',String(x.getAttribute('data-t')===t))})}b.forEach(function(x){x.addEventListener('click',function(){var t=x.getAttribute('data-t');if(t)r.setAttribute('data-theme',t);else r.removeAttribute('data-theme');try{t?localStorage.setItem('wb-theme',t):localStorage.removeItem('wb-theme')}catch(e){}show()})});show()})()</script>`;

/** the whole document: one request for the page, its style inline, no script but the comparison bar's */
export function page(o: { site: Site; title: string; css: string; body: string; compare?: Compare }): string {
  const what = 'Every game and lab in the Game-Template-and-Library repository, built from its code: play any of them in the browser.';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(what)}">
${o.compare ? THEME_HEAD : ''}<style>
*,*::before,*::after{box-sizing:border-box}img{max-width:100%}
${o.compare ? COMPARE_CSS : ''}
${o.css}
</style>
</head>
<body>
${o.compare ? compareBar(o.compare, o.site) : ''}${o.body}
${o.compare ? THEME_BODY : ''}</body>
</html>
`;
}

/** the line at the foot of every design: where it was made from */
export function provenance(site: Site, repo: string): string {
  const from = site.commit ? ` from <a href="${repo}/commit/${esc(site.commit)}"><code>${esc(site.commit.slice(0, 7))}</code></a>` : '';
  const pr = site.pr ? `Preview of <a href="${repo}/pull/${esc(site.pr)}">pull request #${esc(site.pr)}</a>. ` : '';
  return `${pr}Made on ${day(site.made)}${from} by <code>tools/site.ts</code>. The code, the packages and the catalog are in <a href="${repo}">the repository</a>.`;
}
