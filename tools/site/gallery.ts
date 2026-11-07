// tools/site/gallery.ts — the index as a quiet gallery: dark walls (white ones in light mode), the pictures large, a
// small label under each; the games in the main room, the labs as studies in the next.
import { REPO, type Entry, type Site } from './data.ts';
import { day, esc, img, page, provenance, tally, themes, type Compare } from './html.ts';

const CSS =
  themes(
    '--wall:#f1f0ec;--ink:#1c1b19;--soft:#64625c;--faint:#8e8b84;--line:#dad8d1;--hold:#e4e2dc;--mark:#9a5a12;--rest:1',
    '--wall:#0f0f0e;--ink:#e8e6e1;--soft:#a19e96;--faint:#737069;--line:#252523;--hold:#191918;--mark:#dba560;--rest:.86',
  ) +
  `
body{margin:0;background:var(--wall);color:var(--ink);font:15px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%}
a{color:inherit;text-decoration:none}code{font:.9em ui-monospace,"Cascadia Mono",Consolas,Menlo,monospace}
.hall{max-width:1320px;margin:0 auto;padding:40px 16px 64px}
@media (min-width:720px){.hall{padding:80px 48px 112px}}
.top{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:4px 16px;padding-bottom:14px;border-bottom:1px solid var(--line)}
h1{margin:0;font-size:15px;font-weight:500;letter-spacing:.01em}
.count{margin:0;font-size:13px;color:var(--faint)}
.intro{max-width:32em;margin:18px 0 0;color:var(--soft)}
.room{margin:72px 0 26px;font-size:11px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:var(--faint)}
.works{list-style:none;margin:0;padding:0;display:grid;gap:56px 44px}
@media (min-width:760px){.works{grid-template-columns:1fr 1fr}
 .feature>.work:first-child:nth-last-child(odd){grid-column:1/-1}
 .feature>.work:first-child:nth-last-child(odd)>*{display:grid;grid-template-columns:minmax(0,2.2fr) minmax(0,1fr);gap:44px;align-items:end}
 .feature>.work:first-child:nth-last-child(odd) .label{margin:0}
 .works.studies{grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:44px 32px}}
.frame{display:block;background:var(--hold);overflow:hidden}
.frame img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;opacity:var(--rest);transition:opacity .5s ease,transform .8s cubic-bezier(.2,.7,.2,1)}
a:hover .frame img,a:focus-visible .frame img{opacity:1;transform:scale(1.012)}
@media (prefers-reduced-motion:reduce){.frame img{transition:none}a:hover .frame img{transform:none}}
.blank{display:grid;place-items:center;aspect-ratio:16/9;color:var(--faint);font-size:clamp(22px,3vw,34px);font-weight:300;letter-spacing:.03em}
.label{display:grid;gap:2px;margin-top:16px;max-width:34em}
.t{font-size:17px;font-weight:500}
.k{font-size:12px;color:var(--faint);letter-spacing:.03em}
.d{margin-top:8px;font-size:14px;color:var(--soft)}
.studies .t{font-size:15px}.studies .d{font-size:13px}
.mark{color:var(--mark)}.mark::before{content:"";display:inline-block;width:6px;height:6px;margin:0 6px 1px 0;border-radius:50%;background:currentColor}
.off .frame{opacity:.5}.off .k::after{content:" · not built this time"}
a:focus-visible{outline:1px solid var(--ink);outline-offset:8px}
.none{color:var(--faint)}
footer{margin-top:104px;padding-top:14px;border-top:1px solid var(--line);font-size:12px;color:var(--faint)}footer a{color:var(--soft)}footer a:hover{color:var(--ink)}
`;

function work(e: Entry, site: Site, sizes: string, first: boolean): string {
  const pic = e.picture ? img(e.picture, { sizes, alt: `${e.title} as it opens`, first }) : `<span class="blank">${esc(e.title)}</span>`;
  const when = e.last ? ` · ${day(e.last.date)}` : '';
  const mark = e.changed ? `<span class="k mark">changed in #${esc(site.pr ?? '')}${e.changed === 'via' ? ', through a package it uses' : ''}</span>` : '';
  const inner = `<span class="frame">${pic}</span><span class="label"><span class="t">${esc(e.title)}</span><span class="k">${e.kind === 'game' ? 'Game' : 'Lab'}${when}</span>${mark}<span class="d">${esc(e.description)}</span></span>`;
  return e.href ? `<li class="work"><a href="${e.href}">${inner}</a></li>` : `<li class="work off"><div>${inner}</div></li>`;
}

export function gallery(site: Site, compare?: Compare): string {
  const games = site.entries.filter(e => e.kind === 'game');
  const labs = site.entries.filter(e => e.kind === 'lab');
  const wide = games.length % 2 === 1;
  const body = `<div class="hall">
<header class="top"><h1>Games and labs</h1><p class="count">${tally(site)}</p></header>
<p class="intro">Every game and lab in the repository, each pictured as it opens, from the build this page was made with. Choose one to play it.</p>
<section aria-labelledby="games"><h2 class="room" id="games">Games</h2>
${games.length ? `<ul class="works feature">${games.map((e, i) => work(e, site, i === 0 && wide ? '(min-width: 1320px) 840px, (min-width: 760px) 62vw, calc(100vw - 32px)' : '(min-width: 1320px) 590px, (min-width: 760px) 45vw, calc(100vw - 32px)', i === 0)).join('')}</ul>` : '<p class="none">None yet.</p>'}
</section>
<section aria-labelledby="labs"><h2 class="room" id="labs">Labs</h2>
${labs.length ? `<ul class="works studies">${labs.map(e => work(e, site, '(min-width: 760px) 300px, calc(100vw - 32px)', false)).join('')}</ul>` : '<p class="none">None yet.</p>'}
</section>
<footer>${provenance(site, REPO)}</footer>
</div>`;
  return page({ site, title: 'Games and labs', css: CSS, body, compare });
}
