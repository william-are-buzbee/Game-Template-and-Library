#!/usr/bin/env node
// test/report.js — the flight recorder's reports read back (v11.191, src/rec.js; analysis_project.md §1). F9 in the game opens a GitHub issue with the
// session written in: a few lines for a person and a `tethys-rec:1:…` line for this (the session as JSON, deflated, base64url). This decodes it and
// prints what a performance question needs: the machine, the boot, the frames (the CPU's phases, the GPU's passes), the worst places with the tp() to go
// there and the bench line that stands at the worst moment (AT=x,y,z,yaw for test/gpu.js and test/fill.js), the worst frames and what each was doing,
// the errors, the worst stretches of the timeline. With several reports, a table of them by machine and version: the creep, on each of the person's machines.
//
//   node test/report.js <file>...    files holding an issue's body, or only its tethys-rec line (a pasted log too: the longest line found wins)
//   node test/report.js --search     every issue titled "tethys report" in the repository (gh api, its search: no token needed for a public repo),
//                                    newest first: the table of all, then the newest in full; --n <issue> one of them in full instead
//   --json                           the decoded session as JSON, nothing else
'use strict';
const fs=require('fs'),zlib=require('zlib'),{execFileSync}=require('child_process');
const REPO='william-are-buzbee/Game-Template-and-Library';

function decode(text){const re=/tethys-rec:1:([zj])([A-Za-z0-9_-]+)/g;let m,best=null;while((m=re.exec(text)))if(!best||m[2].length>best[2].length)best=m;
  if(!best)return null;const buf=Buffer.from(best[2],'base64url');return JSON.parse((best[1]==='z'?zlib.inflateRawSync(buf):buf).toString('utf8'));}
function search(){const out=execFileSync('gh',['api','-X','GET','search/issues','-f','q=repo:'+REPO+' is:issue in:title "tethys report"','-f','sort=created','-f','order=desc','-f','per_page=50'],{encoding:'utf8',maxBuffer:64<<20});
  return JSON.parse(out).items.map(i=>({n:i.number,at:i.created_at,title:i.title,body:i.body||''}));}

const f1=v=>v<0||v===undefined||v===null?'–':Math.abs(v)>=100?Math.round(v).toString():(+v).toFixed(1);
const f2=v=>v<0||v===undefined||v===null?'–':(+v).toFixed(2);
function table(head,rows){const w=head.map((h,i)=>Math.max(String(h).length,...rows.map(r=>String(r[i]).length)));
  const line=r=>r.map((c,i)=>i?String(c).padStart(w[i]):String(c).padEnd(w[i])).join('  ');return [line(head),w.map(n=>'-'.repeat(n)).join('  '),...rows.map(line)].join('\n');}
function col(p,cols,name){const i=cols.indexOf(name);return r=>r[i];}
function tp(x,z,y){return 'tp('+x+','+z+(y<0?','+Math.round(y):'')+')';}
function gpuName(s){s=String(s||'');const m=/^ANGLE \((.*)\)$/.exec(s);if(m){const p=m[1].split(', ');s=p.length>1?p[1]:p[0];}return s.replace(/ \(0x[0-9A-Fa-f]+\)/,'').replace(/ Direct3D.*$/,'').replace(/^ANGLE Metal Renderer: /,'').trim();}
function where(u){const m=/\/preview\/(\d+)\//.exec(u||'');return m?'preview #'+m[1]:/Game-Template-and-Library\/games/.test(u||'')?'live':'local ('+(u||'?')+')';}

function wcOf(b){return b.wc?' · world cache '+b.wc+(b.wcMs>=0?' (read '+b.wcMs.toFixed(2)+' s)':''):'';} // v11.217: what the visit took from the world cache
function show(p,label){const a=p.all,d=p.dev||{},b=p.boot||{},L=[];
  L.push('='.repeat(100));L.push((label?label+' — ':'')+'tethys '+p.v+', '+where(p.url)+', '+p.at+': '+(p.play/60).toFixed(1)+' min played of '+(p.wall/60).toFixed(1)+' min drawn');
  L.push('\nmachine  '+(d.mid?d.mid+': ':'')+d.gpu+'\n         vendor '+d.vendor+' · WebGL'+d.gl+' · max texture '+d.maxTex+' · GPU timer '+(d.timer?'yes':'no')+' · parallel compile '+(d.par?'yes':'no'));
  L.push('         '+d.cores+' threads · '+(d.mem?d.mem+' GB (as the browser rounds and caps it)':'memory not said')+(d.plat?' · '+d.plat.trim():'')+(d.br?' · '+d.br:''));
  L.push('         screen '+(d.screen||[]).join('×')+' ×'+(+d.dpr).toFixed(2).replace(/\.?0+$/,'')+' · window '+(d.win||[]).join('×')+' · drawn '+(d.buf||[]).join('×')+' · tier '+d.tier+(d.tierWhy&&d.tierWhy!=='default'?' by '+(d.tierWhy==='machine'&&d.tierV?'the machine\'s verdict (GPU '+d.tierV.ms+' ms on '+d.tierV.from+(d.tierV.timer?'':', no timer')+')':d.tierWhy==='hash'?'the URL':d.tierWhy):'')+' (pr '+d.pr+', aa '+d.aa+')'+(d.flags?' · URL '+d.flags:'')+(d.lod?' · far copies '+d.lod:'')+(d.touch?' · touch':'')+(a.vsync?' · frames settle at '+a.vsync.toFixed(1)+' ms (~'+Math.round(1000/a.vsync)+' Hz)':''));
  if(d.ua)L.push('         '+d.ua);
  if(d.fx){const on=Object.keys(d.fx).filter(k=>d.fx[k]===true),off=Object.keys(d.fx).filter(k=>d.fx[k]===false);L.push('         effects on: '+on.join(' ')+(off.length?'  · off: '+off.join(' '):''));}
  const nv=b.nav||{};L.push('\nboot     first paint '+f2(nv.fcp)+' s · page loaded '+f2(nv.loaded)+' s · scripts start '+f2(b.scripts)+' s · first frame '+f2(b.first)+' s · store '+f2(b.store)+' s · world streamed '+f2(b.load)+' s · in '+f2(b.done)+' s · '+b.progs+' programs · '+(b.seen?'this version played here before (the shader cache warm)':'first stored visit of this version')+(nv.bytes?' · '+(nv.bytes/1048576).toFixed(1)+' MB fetched':'')+wcOf(b));
  if(p.now){const n=p.now.boot||{},nn=n.nav||{};L.push('         this visit (F9 under a minute in, so the session above is the one before it, '+p.now.v+'): first paint '+f2(nn.fcp)+' s · page loaded '+f2(nn.loaded)+' s · scripts start '+f2(n.scripts)+' s · first frame '+f2(n.first)+' s · world streamed '+f2(n.load)+' s · in '+f2(n.done)+' s'+wcOf(n));}
  L.push('\nframes   '+a.frames+' in play: interval p50 '+f1(a.iv[0])+' · p90 '+f1(a.iv[1])+' · p95 '+f1(a.iv[2])+' · p99 '+f1(a.iv[3])+' · max '+f1(a.iv[4])+' ms; over 16.7 ms '+(100*a.over[0]).toFixed(1)+'%, over 33 '+(100*a.over[1]).toFixed(1)+'%, over 50 '+(100*a.over[2]).toFixed(1)+'%');
  L.push('         CPU work '+f2(a.work[0])+' ms (p95 '+f1(a.work[1])+', max '+f1(a.work[2])+'): gen '+f2(a.ph.gen)+' · play '+f2(a.ph.play)+' · sim '+f2(a.ph.sim)+' · fx '+f2(a.ph.fx)+' · scene '+f2(a.ph.scene)+' · hud '+f2(a.ph.hud)+' · render (submit) '+f2(a.ph.render));
  L.push(a.gpu?'         GPU '+f2(a.gpu.mean)+' ms (p50 '+f1(a.gpu.p50)+', p95 '+f1(a.gpu.p95)+', max '+f1(a.gpu.max)+', '+a.gpu.frames+' frames timed'+(a.gpu.junk?', '+a.gpu.junk+' junk readings dropped':'')+'): main '+f2(a.gpu.pass.main)+' · horizon '+f2(a.gpu.pass.horizon)+' · clouds '+f2(a.gpu.pass.clouds)+' · world shadows '+f2(a.gpu.pass.shadows)+(a.gpu.pass.sky!==undefined?' · sky '+f2(a.gpu.pass.sky)+' (in the air; horizon is the far land and sea without it)':' (horizon includes the sky: recorded before v11.206)'):'         GPU not timed (no EXT_disjoint_timer_query_webgl2 in this browser)');
  if(a.gpu&&a.gpu.max>=2000&&a.gpu.junk===undefined&&a.gpu.frames>1)L.push('         !! a GPU reading of '+f1(a.gpu.max)+' ms is the timer\'s junk (recorded before v11.198, which drops them): the mean without it '+f2((a.gpu.mean*a.gpu.frames-a.gpu.max)/(a.gpu.frames-1))+' ms; one place\'s gpu still has it; p50 and p95 never did');
  L.push('         draws '+a.draws[0]+' (max '+a.draws[1]+') · triangles '+a.tris[0]+'k (max '+a.tris[1]+'k) · creatures in sight '+a.creatures+' · cells in sight '+a.cells+' · resolution ×'+a.res+' · above the water '+Math.round(100*a.above)+'% of frames');
  if(p.probe&&p.probe.length)for(const q of p.probe){L.push('probe    at '+tp(q.at[0],q.at[2],q.at[1])+' (yaw '+q.at[3]+') · '+q.buf.join('×')+' · '+q.tier+(q.above?' · in the air':' · under water')+': the GPU '+f2(q.gpu)+' ms a frame'+(q.noise!==undefined?', noise ±'+f2(q.noise)+' (the frame as it is between neighbouring measurements; ~ marks a cost within it)':'')+'; each part, the frame without it (F8, v11.208):');
    const pc=v=>v===null?'–':((q.noise!==undefined&&Math.abs(v)<=q.noise?'~':'')+(+v).toFixed(2)); // v11.212: a negative cost printed as one (the noise, made visible)
    for(const x of q.parts)L.push('           '+x[0].padEnd(11)+pc(x[1]).padStart(7)+' ms  '+x[2]+' draws');
    for(const x of q.fx)L.push('           '+x[0].padEnd(11)+pc(x[1]).padStart(7)+' ms  an effect');
    if(q.exit!==undefined)L.push('           the off-screen exit (v11.211, off in play) saved '+pc(q.exit)+' ms a frame here (negative: it cost)');}
  if(p.menu&&p.menu.frames)L.push('menu     '+p.menu.frames+' frames: interval '+f1(p.menu.iv)+' ms (max '+f1(p.menu.max)+'), work '+f2(p.menu.work)+' ms');
  const pc=p.pc,c=k=>col(p,pc,k),S=c('s'),P95=c('p95'),rowOf=r=>[tp(c('x')(r),c('z')(r),c('y')(r)),f1(S(r)),f1(c('p50')(r)),f1(P95(r)),f1(c('p99')(r)),f1(c('max')(r)),f2(c('work')(r)),f2(c('sim')(r)),f2(c('gen')(r)),f2(c('render')(r)),
    f2(c('gpu')(r)),f2(c('gMain')(r))+'/'+f2(c('gHorizon')(r))+'/'+f2(c('gClouds')(r))+'/'+f2(c('gShadows')(r))+(pc.indexOf('gSky')>=0?'/'+f2(c('gSky')(r)):''),c('draws')(r)+'/'+c('drawsMax')(r),c('tris')(r)+'/'+c('trisMax')(r),c('creatures')(r),Math.round(100*c('above')(r))+'%'];
  const head=['place','s','p50','p95','p99','max','work','sim','gen','render','gpu',pc.indexOf('gSky')>=0?'main/hz/cld/sh/sky':'main/hz/cld/sh','draws/max','tris k/max','cr','above'];
  const worst=p.places.filter(r=>S(r)>=5).sort((x,y)=>P95(y)-P95(x)).slice(0,12);
  L.push('\nworst places (p95 interval, 5 s or more there; ms)  — '+p.places.length+' places kept');L.push(table(head,worst.map(rowOf)));
  L.push('\nwhere the worst frame was, to stand a bench there (test/gpu.js, test/fill.js; ONLY= is set by AT):');
  for(const r of worst.slice(0,5))L.push('  AT='+[c('wx')(r),c('wy')(r),c('wz')(r),c('wyaw')(r)].join(',')+' node test/fill.js    # '+f1(c('wiv')(r))+' ms frame, '+f1(c('wwork')(r))+' ms work, near '+tp(c('x')(r),c('z')(r),c('y')(r)));
  L.push('\nlongest places');L.push(table(head,p.places.slice().sort((x,y)=>S(y)-S(x)).slice(0,8).map(rowOf)));
  if(p.spikes.length){const sc=p.sc,s=k=>col(p,sc,k);L.push('\nworst frames ('+p.spN+' over 50 ms or 33 ms of work; '+p.spikes.length+' kept)');
    L.push(table(['t s','where','iv','work','gen','play','sim','fx','scene','hud','render','gpu','draws','tris k','what'],p.spikes.slice(0,15).map(r=>[s('t')(r),tp(s('x')(r),s('z')(r),s('y')(r)),f1(s('iv')(r)),f1(s('work')(r)),f1(s('gen')(r)),f1(s('play')(r)),f1(s('sim')(r)),f1(s('fx')(r)),f1(s('scene')(r)),f1(s('hud')(r)),f1(s('render')(r)),f1(s('gpu')(r)),s('draws')(r),s('tris')(r),s('what')(r)||''])));
    L.push('  what: gen a cell or far region built that frame (>4 ms) · compile×n programs linked · world-shadows the static map redrawn · outside most of the interval outside the frame\'s own work (the browser, a GC, the GPU\'s queue) · boot · gc the heap fell');}
  if(p.errs.length){L.push('\nerrors and warnings ('+p.errs.length+(p.errN?', '+p.errN+' more not kept':'')+')');for(const e of p.errs)L.push('  '+e[0]+' ×'+e[1]+' first at '+e[2]+' s'+(e[3]||e[4]?' near '+tp(e[3],e[4]):'')+': '+e[5]);}
  if(p.loaf&&p.loaf.n){L.push('\nlong animation frames (Chrome): '+p.loaf.n+', '+p.loaf.ms+' ms, '+p.loaf.block+' ms blocking; by entry point (ms):');for(const x of p.loaf.by)L.push('  '+x[0]+' ×'+x[1]+' '+x[2]);}
  const T=p.tl,t=k=>col(p,T.cols,k);if(T.rows.length){const rows=T.rows.slice().sort((x,y)=>t('ivMax')(y)-t('ivMax')(x)).slice(0,8);
    L.push('\ntimeline: '+T.rows.length+' rows of '+T.every+' s; the worst stretches');L.push(table(['t s','where','frames','iv','ivMax','work','gen','sim','render','gpu','draws','tris k','cr','res','heap MB'],rows.map(r=>[t('t')(r),tp(t('x')(r),t('z')(r),t('y')(r)),t('frames')(r),f1(t('iv')(r)),f1(t('ivMax')(r)),f2(t('work')(r)),f2(t('gen')(r)),f2(t('sim')(r)),f2(t('render')(r)),f2(t('gpu')(r)),t('draws')(r),t('tris')(r),t('creatures')(r),t('res')(r),t('heap')(r)])));}
  return L.join('\n');}

// the reports by machine (rec.js's per-browser name, `d.mid`), then newest first: a version's frames compared on one machine, never across two
function versions(list){list=list.slice().sort((a,b)=>String(a.p.dev&&a.p.dev.mid||'').localeCompare(String(b.p.dev&&b.p.dev.mid||''))||String(b.at||b.p.at).localeCompare(String(a.at||a.p.at)));
  return table(['issue','filed','machine','version','where','gpu','min','p50','p95','p99','gpu p50','gpu p95','draws','tris k','worst place'],list.map(({n,at,p})=>{const a=p.all,pc=p.pc,S=pc.indexOf('s'),P=pc.indexOf('p95');
  const w=p.places.filter(r=>r[S]>=5).sort((x,y)=>y[P]-x[P])[0];return ['#'+n,(at||p.at).slice(0,10),p.dev&&p.dev.mid||'?',p.v,where(p.url),gpuName(p.dev&&p.dev.gpu),(p.play/60).toFixed(0),f1(a.iv[0]),f1(a.iv[2]),f1(a.iv[3]),a.gpu?f1(a.gpu.p50):'–',a.gpu?f1(a.gpu.p95):'–',a.draws[0],a.tris[0],w?tp(w[pc.indexOf('x')],w[pc.indexOf('z')],w[pc.indexOf('y')])+' '+f1(w[P]):'–'];}));}

function main(){const args=process.argv.slice(2),json=args.includes('--json'),files=args.filter(a=>!a.startsWith('--')&&!/^\d+$/.test(a));
  if(args.includes('--search')){const ni=args.indexOf('--n'),pick=ni>=0?+args[ni+1]:0,list=[];
    for(const i of search()){try{const p=decode(i.body);if(p)list.push({n:i.n,at:i.at,p});}catch(e){console.log('#'+i.n+': '+e.message);}}
    if(!list.length){console.log('no reports found');return;}
    if(json){console.log(JSON.stringify((list.find(x=>x.n===pick)||list[0]).p,null,1));return;}
    console.log(versions(list));const one=list.find(x=>x.n===pick)||list[0];console.log('\n'+show(one.p,'#'+one.n));return;}
  if(!files.length){console.log('node test/report.js <file>... | --search [--n <issue>] [--json]');process.exit(2);}
  const list=[];for(const f of files){const p=decode(fs.readFileSync(f,'utf8'));if(!p){console.log(f+': no tethys-rec line');process.exitCode=1;continue;}list.push({n:f,at:p.at,p});}
  if(json){console.log(JSON.stringify(list.map(x=>x.p),null,1));return;}
  if(list.length>1)console.log(versions(list)+'\n');for(const x of list)console.log(show(x.p,x.n));}
if(require.main===module)main();
module.exports={decode,show,versions};
