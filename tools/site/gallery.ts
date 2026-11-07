// tools/site/gallery.ts — the site's index: a quiet, dark gallery (docs/decisions.md 22). Each game and lab hangs as
// its picture with a small wall label; the games in the main room, the most recently changed one featured (on a
// preview, what the pull request changed), the labs as studies in the next room. Dark whatever the system's setting;
// "Lights on" gives a light page, remembered in that browser. Without script the page is simply dark.
import { byRecent, REPO, type Entry, type Site } from './data.ts';
import { day, esc, img, page, provenance, tally } from './html.ts';

const DARK =
  '--wall:#111110;--ink:#eceae4;--soft:#a7a49c;--faint:#77746d;--line:#262624;--hold:#1a1a19;--edge:rgba(255,255,255,.07);--edge-hi:rgba(255,255,255,.2);--spot:rgba(255,238,214,.055);--mark:#dfa75e;--rest:.86';
const LIGHT =
  '--wall:#f2f1ed;--ink:#1b1a18;--soft:#5f5d57;--faint:#8b8880;--line:#dcdad3;--hold:#e5e3dd;--edge:rgba(0,0,0,.07);--edge-hi:rgba(0,0,0,.22);--spot:transparent;--mark:#985811;--rest:1';

const CSS = `:root{color-scheme:dark;${DARK}}:root[data-theme=light]{color-scheme:light;${LIGHT}}
body{margin:0;background:var(--wall);color:var(--ink);font:15px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%;transition:background-color .4s,color .4s}
a{color:inherit;text-decoration:none}code{font:.9em ui-monospace,"Cascadia Mono",Consolas,Menlo,monospace}
.hall{max-width:1320px;margin:0 auto;padding:20px 16px 64px}
@media (min-width:760px){.hall{padding:28px 48px 112px}}
.bar{display:flex;justify-content:space-between;align-items:center;gap:16px;min-height:32px;font-size:12px;color:var(--faint)}
.bar a:hover{color:var(--ink)}.bar .pr{color:var(--mark)}
.mode{flex:none;white-space:nowrap;font:inherit;color:var(--soft);background:none;border:1px solid var(--line);border-radius:99px;padding:5px 13px;cursor:pointer;transition:color .2s,border-color .2s}
.mode:hover{color:var(--ink);border-color:var(--edge-hi)}
.top{margin:64px 0 0;padding-bottom:28px;border-bottom:1px solid var(--line)}
@media (min-width:760px){.top{margin-top:96px}}
h1{margin:0;font-size:clamp(38px,6vw,64px);font-weight:400;line-height:1.02;letter-spacing:-.025em}
.intro{max-width:31em;margin:18px 0 0;font-size:16px;color:var(--soft)}
.count{margin:14px 0 0;font-size:12px;letter-spacing:.04em;color:var(--faint)}
.room{display:flex;align-items:baseline;gap:10px;margin:72px 0 28px;font-size:11px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:var(--faint)}
.room span{letter-spacing:.04em;color:var(--soft)}.room::after{content:"";flex:1;border-top:1px solid var(--line);transform:translateY(-3px)}
.works{list-style:none;margin:0;padding:0;display:grid;gap:64px 44px}
@media (min-width:760px){.works{grid-template-columns:1fr 1fr}
 .feature>.work:first-child:nth-last-child(odd){grid-column:1/-1}
 .feature>.work:first-child:nth-last-child(odd)>*{display:grid;grid-template-columns:minmax(0,2.3fr) minmax(0,1fr);gap:48px;align-items:end}
 .feature>.work:first-child:nth-last-child(odd) .label{margin:0}
 .feature>.work:first-child:nth-last-child(odd) .t{font-size:clamp(26px,2.6vw,34px);letter-spacing:-.02em}
 .works.studies{grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:48px 32px}}
.work>*{display:block;position:relative}
.work>*::before{content:"";position:absolute;inset:-64px -48px 20%;background:radial-gradient(closest-side,var(--spot),transparent);pointer-events:none;z-index:-1}
.frame{display:block;background:var(--hold);overflow:hidden;box-shadow:0 0 0 1px var(--edge);transition:box-shadow .4s}
.frame img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;opacity:var(--rest);transition:opacity .5s,transform .9s cubic-bezier(.2,.7,.2,1)}
a:hover .frame,a:focus-visible .frame{box-shadow:0 0 0 1px var(--edge-hi)}
a:hover .frame img,a:focus-visible .frame img{opacity:1;transform:scale(1.015)}
.blank{display:grid;place-items:center;aspect-ratio:16/9;padding:16px;text-align:center;color:var(--faint);font-size:clamp(22px,3vw,36px);font-weight:300;letter-spacing:.02em}
.label{display:grid;gap:3px;margin-top:18px;max-width:34em}
.t{font-size:20px;font-weight:500;letter-spacing:-.01em;line-height:1.25}
.k{font-size:12px;letter-spacing:.03em;color:var(--faint)}
.mark{color:var(--mark)}.mark::before{content:"";display:inline-block;width:6px;height:6px;margin:0 7px 1px 0;border-radius:50%;background:currentColor}
.d{margin-top:8px;font-size:14px;color:var(--soft)}
.go{margin-top:12px;font-size:13px;color:var(--soft);transition:color .2s}.go i{display:inline-block;font-style:normal;transition:transform .3s}
a:hover .go,a:focus-visible .go{color:var(--ink)}a:hover .go i,a:focus-visible .go i{transform:translateX(4px)}
.studies .t{font-size:16px}.studies .d{font-size:13px}.studies .go{margin-top:8px}
.off .frame{opacity:.55}
a:focus-visible{outline:1px solid var(--ink);outline-offset:10px}
.none{color:var(--faint)}
footer{margin-top:112px;padding-top:16px;border-top:1px solid var(--line);font-size:12px;color:var(--faint)}footer a{color:var(--soft)}footer a:hover{color:var(--ink)}
@media (prefers-reduced-motion:reduce){*{transition:none!important}a:hover .frame img{transform:none}}
`;

// the light switch: read before the page is drawn (no flash of the wrong walls), shown and wired once the page is there
const HEAD = `<script>try{if(localStorage.getItem('wb-theme')==='light')document.documentElement.setAttribute('data-theme','light')}catch(e){}</script>`;
const TAIL = `<script>(function(){var r=document.documentElement,b=document.querySelector('.mode');if(!b)return;function show(){var l=r.getAttribute('data-theme')==='light';b.textContent=l?'Lights off':'Lights on';b.setAttribute('aria-pressed',String(l))}b.hidden=false;show();b.addEventListener('click',function(){var l=r.getAttribute('data-theme')!=='light';if(l)r.setAttribute('data-theme','light');else r.removeAttribute('data-theme');try{l?localStorage.setItem('wb-theme','light'):localStorage.removeItem('wb-theme')}catch(e){}show()})})()</script>`;

function work(e: Entry, site: Site, sizes: string, first: boolean): string {
  const pic = e.picture ? img(e.picture, { sizes, alt: `${e.title} as it opens`, first }) : `<span class="blank">${esc(e.title)}</span>`;
  const kind = e.kind === 'game' ? 'Game' : 'Lab';
  const when = e.last ? ` · changed ${day(e.last.date)}` : '';
  const mark = e.changed ? `<span class="k mark">changed in #${esc(site.pr ?? '')}${e.changed === 'via' ? ', through a package it uses' : ''}</span>` : '';
  const go = e.href ? `<span class="go">${e.kind === 'game' ? 'Play' : 'Open'} <i aria-hidden="true">→</i></span>` : '<span class="k">Not built this time, so not on the site.</span>';
  const inner = `<span class="frame">${pic}</span><span class="label"><span class="t">${esc(e.title)}</span><span class="k">${kind}${when}</span>${mark}<span class="d">${esc(e.description)}</span>${go}</span>`;
  return e.href ? `<li class="work"><a href="${e.href}">${inner}</a></li>` : `<li class="work off"><div>${inner}</div></li>`;
}

/** the games' order: the most recently changed first (it is the one featured), then the rest as the catalog lists them */
export function hang(games: Entry[]): Entry[] {
  const lead = byRecent(games)[0];
  return lead ? [lead, ...games.filter(e => e !== lead)] : [];
}

export function gallery(site: Site): string {
  const games = hang(site.entries.filter(e => e.kind === 'game'));
  const labs = site.entries.filter(e => e.kind === 'lab');
  const wide = games.length % 2 === 1;
  const sizes = (i: number) =>
    i === 0 && wide ? '(min-width: 1320px) 860px, (min-width: 760px) 66vw, calc(100vw - 32px)' : '(min-width: 1320px) 590px, (min-width: 760px) 45vw, calc(100vw - 32px)';
  const where = site.pr
    ? `<span class="pr">Preview of <a href="${REPO}/pull/${esc(site.pr)}">pull request #${esc(site.pr)}</a>: what it changed is marked</span>`
    : `<a href="${REPO}">Game-Template-and-Library</a>`;
  const body = `<div class="hall">
<div class="bar">${where}<button class="mode" type="button" hidden>Lights on</button></div>
<header class="top"><h1>Games and labs</h1>
<p class="intro">Everything made in the repository, each pictured as it opens in the build this page came from. Choose one to play it in the browser.</p>
<p class="count">${tally(site, ' · ')} · updated ${day(site.made)}</p></header>
<section aria-labelledby="games"><h2 class="room" id="games">Games <span>${games.length}</span></h2>
${games.length ? `<ul class="works feature">${games.map((e, i) => work(e, site, sizes(i), i === 0)).join('')}</ul>` : '<p class="none">None yet.</p>'}
</section>
<section aria-labelledby="labs"><h2 class="room" id="labs">Labs <span>${labs.length}</span></h2>
${labs.length ? `<ul class="works studies">${labs.map(e => work(e, site, '(min-width: 760px) 300px, calc(100vw - 32px)', false)).join('')}</ul>` : '<p class="none">None yet.</p>'}
</section>
<footer>${provenance(site, REPO)}</footer>
</div>`;
  return page({ title: 'Games and labs', scheme: 'dark light', css: CSS, body, head: HEAD, tail: TAIL });
}
