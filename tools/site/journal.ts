// tools/site/journal.ts — the index as a field journal: each game a notebook entry, its screenshot the plate, the last
// change to it noted in the margin; the labs are the loose notes at the back.
import { REPO, type Entry, type Site } from './data.ts';
import { day, esc, img, page, provenance, roman, tally, themes, type Compare } from './html.ts';

const CSS =
  themes(
    '--paper:#f3eee2;--ink:#2a251e;--soft:#655b4c;--faint:#8f846f;--rule:#d6cab3;--grid:rgba(110,88,52,.075);--red:#983a20;--mat:#fffdf7;--corner:rgba(48,36,22,.82);--shadow:rgba(70,48,20,.2)',
    '--paper:#191612;--ink:#ebe3d2;--soft:#b5aa93;--faint:#8b806c;--rule:#3b3329;--grid:rgba(240,222,186,.04);--red:#e3906a;--mat:#2b261f;--corner:rgba(8,6,4,.85);--shadow:rgba(0,0,0,.55)',
  ) +
  `
body{margin:0;color:var(--ink);background:var(--paper);background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);background-size:26px 26px;font:17px/1.6 "Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua","Sitka Text",Georgia,serif;-webkit-text-size-adjust:100%}
a{color:inherit}code{font:.82em ui-monospace,"Cascadia Mono",Consolas,Menlo,monospace}
.book{max-width:1060px;margin:0 auto;padding:44px 16px 56px}
@media (min-width:720px){.book{padding:72px 32px 80px}}
.sc{font-variant:small-caps;letter-spacing:.09em}
.mast{padding-bottom:26px;border-bottom:1px solid var(--rule)}
.kicker{margin:0;color:var(--red)}
h1{font-weight:400;font-style:italic;font-size:clamp(44px,9vw,84px);line-height:1;letter-spacing:-.015em;margin:.08em 0 .22em}
.lede{max-width:34em;margin:0 0 22px;color:var(--soft)}
.log{display:flex;flex-wrap:wrap;gap:6px 30px;margin:0;font-size:15px}
.log div{display:flex;gap:8px;align-items:baseline}.log dt{color:var(--faint)}.log dd{margin:0}
.part{display:flex;align-items:center;gap:14px;margin:52px 0 0;font-weight:400;font-size:16px;color:var(--soft)}
.part::after{content:"";flex:1;border-top:1px solid var(--rule)}.part b{font-weight:400;color:var(--red)}
.entry{display:grid;gap:22px;padding:30px 0 34px;border-bottom:1px dashed var(--rule)}
@media (min-width:820px){.entry{grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:44px;align-items:center;padding:52px 0}.entry:nth-of-type(even){grid-template-columns:minmax(0,5fr) minmax(0,7fr)}.entry:nth-of-type(even) .plate{order:2}.entry:nth-of-type(even) .mount{rotate:.6deg}}
.plate{margin:0}
.mount{display:block;position:relative;padding:9px;background:var(--mat);box-shadow:0 1px 2px var(--shadow),0 10px 26px -10px var(--shadow);rotate:-.6deg;transition:rotate .35s ease,translate .35s ease}
a.mount:hover{rotate:0deg;translate:0 -2px}
.mount img{display:block;width:100%;height:auto}
.mount::before,.mount::after{content:"";position:absolute;width:26px;height:26px;background:linear-gradient(135deg,var(--corner) 50%,transparent 50%);top:2px;left:2px;pointer-events:none}
.mount::after{top:auto;left:auto;bottom:2px;right:2px;rotate:180deg}
.wanting{display:grid;place-items:center;aspect-ratio:16/9;padding:16px;border:1.5px dashed var(--rule);color:var(--faint);font-style:italic;text-align:center}
figcaption{margin:12px 0 0 4px;font-size:15px;font-style:italic;color:var(--soft)}figcaption b{font-style:normal;font-weight:400;color:var(--ink)}
.no{margin:0;font-size:15px;color:var(--faint)}.no code{font-variant:normal;letter-spacing:0}
h3{font-weight:400;font-size:clamp(32px,4.4vw,42px);line-height:1.08;margin:.08em 0 .3em}
h3 a{text-decoration:none}h3 a:hover{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:5px}
.desc{margin:0 0 16px}
.obs{margin:0 0 16px;padding-left:14px;border-left:2px solid var(--rule);font-size:15px;font-style:italic;color:var(--soft)}
.obs span{display:block;font-style:normal;font-size:14px;color:var(--faint)}
.stamp{display:table;margin:0 0 16px;padding:1px 10px 2px;border:1.5px solid var(--red);border-radius:3px;color:var(--red);font-size:14px;rotate:-2deg}
.go{font-size:17px;color:var(--red);text-decoration:none}.go:hover{text-decoration:underline}
.off{color:var(--faint);font-style:italic;font-size:15px}
.aside{margin:6px 0 0;color:var(--soft);font-style:italic}
.notes{list-style:none;margin:0;padding:0;display:grid;column-gap:44px}
@media (min-width:820px){.notes{grid-template-columns:1fr 1fr}}
.note{display:grid;grid-template-columns:minmax(0,132px) minmax(0,1fr);gap:18px;align-items:start;padding:24px 0;border-bottom:1px dashed var(--rule)}
.note .mount{padding:5px;rotate:1.2deg}.note .mount::before,.note .mount::after{width:16px;height:16px}
.note .wanting{font-size:13px;padding:6px}
.note h3{font-size:25px;margin:0 0 .2em}.note .desc{font-size:15px;margin:0 0 10px}.note .obs{font-size:14px;margin:0 0 10px}
footer{margin-top:44px;font-size:14px;color:var(--faint);font-style:italic}footer a{color:var(--soft)}
a:focus-visible{outline:2px solid var(--red);outline-offset:3px}
`;

function plate(e: Entry, n: number, small: boolean, first: boolean): string {
  const sizes = small ? '132px' : '(min-width: 1060px) 580px, (min-width: 820px) 56vw, calc(100vw - 32px)';
  const pic = e.picture
    ? img(e.picture, { sizes, alt: `${e.title} as it opens`, first })
    : `<span class="wanting">${small ? 'no plate' : 'Plate wanting: no picture could be taken of it this time.'}</span>`;
  const mount = e.href && e.picture ? `<a class="mount" href="${e.href}" tabindex="-1" aria-hidden="true">${pic}</a>` : e.picture ? `<span class="mount">${pic}</span>` : pic;
  return small ? mount : `<figure class="plate">${mount}<figcaption><b class="sc">Plate ${roman(n)}.</b> ${esc(e.title)}, as it opens.</figcaption></figure>`;
}

function notes(e: Entry, site: Site): string {
  const obs = e.last ? `<p class="obs"><span class="sc">Last noted ${day(e.last.date)}</span>${esc(e.last.subject)}</p>` : '';
  const stamp = e.changed ? `<p class="stamp sc">${e.changed === 'here' ? 'Revised' : 'Revised, through a package it uses,'} in pull request #${esc(site.pr ?? '')}</p>` : '';
  return `${obs}${stamp}`;
}

function entry(e: Entry, n: number, site: Site): string {
  const name = e.href ? `<a href="${e.href}">${esc(e.title)}</a>` : esc(e.title);
  const uses = e.uses.length ? ` · uses ${e.uses.map(esc).join(', ')}` : '';
  const go = e.href ? `<a class="go sc" href="${e.href}">Open ${esc(e.title)}&nbsp;→</a>` : `<p class="off">Not built this time, so not on the site.</p>`;
  return `<article class="entry"${e.href ? '' : ' data-off'}>${plate(e, n, false, n === 1)}<div><p class="no sc">No. ${n} · <code>${esc(e.dir)}</code>${uses}</p><h3>${name}</h3><p class="desc">${esc(e.description)}</p>${notes(e, site)}${go}</div></article>`;
}

function note(e: Entry, site: Site): string {
  const name = e.href ? `<a href="${e.href}">${esc(e.title)}</a>` : `${esc(e.title)} <span class="off">(not built)</span>`;
  return `<li class="note">${plate(e, 0, true, false)}<div><h3>${name}</h3><p class="desc">${esc(e.description)}</p>${notes(e, site)}</div></li>`;
}

export function journal(site: Site, compare?: Compare): string {
  const games = site.entries.filter(e => e.kind === 'game');
  const labs = site.entries.filter(e => e.kind === 'lab');
  const from = site.pr ? `Pull request #${esc(site.pr)}` : site.commit ? `<code>${esc(site.commit.slice(0, 7))}</code>` : 'main';
  const body = `<div class="book">
<header class="mast">
<p class="kicker sc">A field journal</p>
<h1>Games and labs</h1>
<p class="lede">Every game and lab in the repository, observed as each one opens. The plates are taken from the build each time the site is made, so none is older than its code.</p>
<dl class="log sc"><div><dt>Entries</dt><dd>${tally(site)}</dd></div><div><dt>Made</dt><dd>${day(site.made)}</dd></div><div><dt>From</dt><dd>${from}</dd></div></dl>
</header>
<section aria-labelledby="games"><h2 class="part sc" id="games"><b>Part I.</b> Games</h2>
${games.length ? games.map((e, i) => entry(e, i + 1, site)).join('\n') : '<p class="aside">No entries yet.</p>'}
</section>
<section aria-labelledby="labs"><h2 class="part sc" id="labs"><b>Part II.</b> Labs</h2>
<p class="aside">Loose notes: one-shots, model trials and tech demos.</p>
${labs.length ? `<ol class="notes">${labs.map(e => note(e, site)).join('')}</ol>` : '<p class="aside">None yet.</p>'}
</section>
<footer>${provenance(site, REPO)}</footer>
</div>`;
  return page({ site, title: 'Games and labs', css: CSS, body, compare });
}
