// tools/site/front.ts — the index as a newspaper's front page: what changed last is the lead story, its latest commit
// the headline's deck; the other games below it, the labs in brief. On a pull request's preview, what the pull request
// changed leads. The page answers "what is new?" before "what is there?".
import { REPO, type Entry, type Site } from './data.ts';
import { day, esc, img, page, provenance, tally, themes, weekday, type Compare } from './html.ts';

const CSS =
  themes(
    '--paper:#f6f4ee;--ink:#151413;--soft:#4f4c47;--faint:#7a766e;--hair:#cdc8bd;--rule:#151413;--red:#b0281c;--hold:#e5e1d7',
    '--paper:#131312;--ink:#ecebe6;--soft:#b9b6ae;--faint:#8a877f;--hair:#363531;--rule:#d9d7d0;--red:#ff8170;--hold:#1d1d1b',
  ) +
  `
body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 Charter,"Bitstream Charter","Sitka Text",Cambria,Georgia,serif;-webkit-text-size-adjust:100%}
a{color:inherit;text-decoration:none}code{font:.85em ui-monospace,"Cascadia Mono",Consolas,Menlo,monospace}
.paper{max-width:1200px;margin:0 auto;padding:20px 16px 56px}
@media (min-width:720px){.paper{padding:32px 32px 72px}}
.sans{font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
.ear{display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 16px;padding:6px 0;border-bottom:1px solid var(--rule);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--soft)}
h1{margin:0;padding:14px 0 10px;text-align:center;font-family:"Iowan Old Style","Sitka Heading",Charter,Georgia,serif;font-weight:900;font-size:clamp(46px,12vw,124px);line-height:.92;letter-spacing:-.025em;border-bottom:4px double var(--rule)}
.motto{margin:0;padding:7px 0;text-align:center;font-style:italic;font-size:14px;color:var(--soft);border-bottom:1px solid var(--rule)}
.kicker{margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--faint)}
.kicker .red{color:var(--red)}
.head{font-family:"Iowan Old Style","Sitka Heading",Charter,Georgia,serif;font-weight:700;letter-spacing:-.01em;line-height:1.02;margin:0}
.head a:hover{text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:4px}
.deck{margin:8px 0 0;font-style:italic;color:var(--soft);line-height:1.35}
.lead{display:grid;gap:14px;padding:22px 0 28px;border-bottom:1px solid var(--rule)}
.lead .head{font-size:clamp(44px,8vw,88px)}
.lead .deck{font-size:clamp(18px,2.2vw,23px)}
@media (min-width:880px){.lead{grid-template-columns:minmax(0,2fr) minmax(0,1fr);grid-template-areas:"top top" "fig text";column-gap:36px;row-gap:20px}
 .lead .top{grid-area:top}.lead figure{grid-area:fig}.lead .text{grid-area:text;border-left:1px solid var(--hair);padding-left:24px}}
figure{margin:0}figure .shot{display:block;background:var(--hold)}figure img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover}
figcaption{margin-top:6px;font-size:12px;color:var(--faint)}
.blank{display:grid;place-items:center;aspect-ratio:16/9;padding:12px;color:var(--faint);font-style:italic;text-align:center;border:1px solid var(--hair)}
.body{margin:0 0 14px}
.lead .body::first-letter{float:left;margin:4px 8px 0 0;font-family:"Iowan Old Style","Sitka Heading",Charter,Georgia,serif;font-weight:700;font-size:3.9em;line-height:.8}
.go{font-size:13px;font-weight:600;letter-spacing:.04em;color:var(--red)}.go:hover{text-decoration:underline}
.off{font-size:13px;color:var(--faint);font-style:italic}
.where{margin:16px 0 0;font-size:12px;color:var(--faint)}
.text .band{margin:22px 0 10px;font-size:11px}
.earlier{list-style:none;margin:0;padding:0;font-size:14px;line-height:1.4;color:var(--soft)}.earlier li{padding:8px 0;border-top:1px solid var(--hair)}
.earlier span{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);margin-bottom:2px}
.band{display:flex;align-items:center;gap:12px;margin:30px 0 16px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
.band::after{content:"";flex:1;border-top:1px solid var(--rule)}
.cols{overflow:hidden}
.stories{list-style:none;padding:0;margin:0 -18px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))}
.story{padding:0 18px 26px;margin-left:-1px;border-left:1px solid var(--hair)}
.story figure{margin-bottom:12px}.story .head{font-size:clamp(28px,3.2vw,36px)}.story .deck{font-size:16px;margin-bottom:10px}.story .body{font-size:15px}
.brief{list-style:none;padding:0;margin:0 -18px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))}
.brief li{display:grid;grid-template-columns:minmax(0,1fr) 112px;gap:14px;align-items:start;padding:0 18px 22px;margin-left:-1px;border-left:1px solid var(--hair)}
.brief .head{font-size:22px}.brief .deck{font-size:14px;margin:4px 0 6px}.brief .body{font-size:14px;margin:0}
.brief .blank{font-size:11px;padding:4px}
.none{color:var(--faint);font-style:italic}
footer{margin-top:30px;padding-top:8px;border-top:4px double var(--rule);font-size:12px;color:var(--faint)}footer a{color:var(--soft);text-decoration:underline;text-underline-offset:2px}
a:focus-visible{outline:2px solid var(--red);outline-offset:3px}
`;

/** what changed in the pull request first, then what changed last, then the catalog's order */
export function byNews(entries: Entry[]): Entry[] {
  const rank = (e: Entry) => (e.changed === 'here' ? 0 : e.changed === 'via' ? 1 : 2);
  return entries
    .map((e, i) => ({ e, i }))
    .sort((a, b) => rank(a.e) - rank(b.e) || (b.e.last?.time ?? 0) - (a.e.last?.time ?? 0) || a.i - b.i)
    .map(x => x.e);
}

function kicker(e: Entry): string {
  const what = e.kind === 'game' ? 'Game' : 'Lab';
  if (e.changed) return `<p class="kicker sans"><span class="red">${e.changed === 'here' ? 'Changed in this pull request' : 'Changed through a package it uses'}</span> · ${what}</p>`;
  return `<p class="kicker sans">${what}${e.last ? ` · changed ${day(e.last.date)}` : ''}</p>`;
}

function photo(e: Entry, sizes: string, first: boolean, caption: boolean): string {
  const pic = e.picture
    ? img(e.picture, { sizes, alt: `${e.title} as it opens`, first })
    : `<span class="blank">No photograph: ${esc(e.title)} could not be pictured this time.</span>`;
  const shot = e.href && e.picture ? `<a class="shot" href="${e.href}" tabindex="-1" aria-hidden="true">${pic}</a>` : `<span class="shot">${pic}</span>`;
  return `<figure>${shot}${caption ? `<figcaption class="sans">${esc(e.title)} as it opens, from the build this page was made with.</figcaption>` : ''}</figure>`;
}

const name = (e: Entry) => (e.href ? `<a href="${e.href}">${esc(e.title)}</a>` : esc(e.title));
const deck = (e: Entry) => (e.last ? `<p class="deck">${esc(e.last.subject)}</p>` : '');
const go = (e: Entry) =>
  e.href ? `<a class="go sans" href="${e.href}">${e.kind === 'game' ? 'Play' : 'Open'} ${esc(e.title)} →</a>` : `<p class="off">Not built this time, so not on the site.</p>`;

function earlier(e: Entry): string {
  const where = `<p class="where sans"><code>${esc(e.dir)}</code>${e.uses.length ? ` · uses ${e.uses.map(esc).join(', ')}` : ''}</p>`;
  if (!e.earlier.length) return where;
  return `${where}<h3 class="band sans">Before that</h3><ul class="earlier">${e.earlier.map(c => `<li><span class="sans">${day(c.date)}</span> ${esc(c.subject)}</li>`).join('')}</ul>`;
}

export function front(site: Site, compare?: Compare): string {
  const news = byNews(site.entries);
  const lead = news[0];
  const games = news.filter(e => e.kind === 'game' && e !== lead);
  const labs = news.filter(e => e.kind === 'lab' && e !== lead);
  const edition = site.pr ? `Preview edition · pull request #${esc(site.pr)}` : site.count ? `No. ${String(site.count).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` : 'Main edition';
  const leadHtml = lead
    ? `<article class="lead"><div class="top">${kicker(lead)}<h2 class="head">${name(lead)}</h2>${deck(lead)}</div>${photo(lead, '(min-width: 1200px) 760px, (min-width: 880px) 64vw, calc(100vw - 32px)', true, true)}<div class="text"><p class="body">${esc(lead.description)}</p>${go(lead)}${earlier(lead)}</div></article>`
    : '<p class="none">Nothing to report: no games or labs yet.</p>';
  const story = (e: Entry) =>
    `<li class="story">${photo(e, '(min-width: 880px) 360px, calc(100vw - 32px)', false, false)}${kicker(e)}<h3 class="head">${name(e)}</h3>${deck(e)}<p class="body">${esc(e.description)}</p>${go(e)}</li>`;
  const brief = (e: Entry) =>
    `<li><div>${kicker(e)}<h3 class="head">${name(e)}</h3>${deck(e)}<p class="body">${esc(e.description)}</p></div>${photo(e, '112px', false, false)}</li>`;
  const body = `<div class="paper">
<header><p class="ear sans"><span>${edition}</span><span>${weekday(site.made)}, ${day(site.made)}</span><span>${tally(site)}</span></p>
<h1>Games &amp; Labs</h1>
<p class="motto">Every game and lab in the repository, printed fresh from the code each time it changes</p></header>
<main>
${leadHtml}
${games.length ? `<section aria-labelledby="games"><h2 class="band sans" id="games">More games</h2><div class="cols"><ul class="stories">${games.map(story).join('')}</ul></div></section>` : ''}
<section aria-labelledby="labs"><h2 class="band sans" id="labs">Labs, in brief</h2>${labs.length ? `<div class="cols"><ul class="brief">${labs.map(brief).join('')}</ul></div>` : `<p class="none">${lead?.kind === 'lab' ? 'The only lab leads today.' : 'No labs yet.'}</p>`}</section>
</main>
<footer class="sans">${provenance(site, REPO)}</footer>
</div>`;
  return page({ site, title: 'Games and labs', css: CSS, body, compare });
}
