// test/bench_creatures.js — the creatures' cost and their fingerprint (v11.149, the creature performance pass), in headless Chromium with the real
// three.js: the stub's primitives have no triangles (test/stub.js), so a body's build cannot be timed in node. Not in --test.
//   node test/bench_creatures.js                the numbers below for this tree
//   BASE=<dir> node test/bench_creatures.js     the same beside the sources kept in <dir> (src/ and vendor/ from before a change, or any older version's:
//                                               `git archive <commit> games/tethys/src games/tethys/vendor | tar -x -C <dir>`), the ratio, and whether
//                                               every built body is the same to the bit
// The page runs on a clock of its own (as the node tests' stub does): performance.now and requestAnimationFrame are replaced before any script, the
// frame loop advanced only by the bench, 16.7 ms a frame, and Math.random seeded — so the ledger, the streaming and every draw are the same in every
// run, and two trees can be held to the same bodies and the same simulation. The bench's own timings read the real clock.
// What it measures, after the boot and SETTLE frames (each page its own browser; the best of N pages):
//   build      every kind's body (creatures_ai.js buildKind, plain coat): the first build, then the least of the next five — what a spawn pays
//   cells      3×3 cells at five places (the forest's shelf, an atoll, the platform, the open sea, the giant's coast) generated whole (chunks.js
//              loadChunkNow), the time a cell and the share of it inside spawn() and inside compile()
//   frame      the player put at the forest's shelf (330, −12, 0: the heaviest place) and FRAMES frames stepped (the render left out): updateSchools +
//              updateCreatures a frame, on the real clock, with every creature the cells round it hold
// and what it proves: every creature those cells placed (its kind, place, coat class, scale; every mesh's geometry — position, normal, colour, the
// pattern — its far bake's, its hit capsules, coverings, grip, edge, gape and mass) and each body posed by its own anim at a fixed time, hashed; and after
// the frames every creature's place, velocity, facing, state and hunger, and every rig's points (the simulation the same, frame for frame).
// Needs Playwright (a cloud session has one globally; PLAYWRIGHT_MODULE names another) and three.js r128 from cdnjs, which the page loads itself.
// Env: BASE, N (pages each, 2), FRAMES (300), SETTLE (60), ONLY (build,cells,frame).
'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),{execSync}=require('child_process');
const here=path.join(__dirname,'..'),roots=(process.env.BASE?[path.resolve(process.env.BASE)]:[]).concat([here]),N=+(process.env.N||2),FRAMES=+(process.env.FRAMES||300),SETTLE=+(process.env.SETTLE||60);
const ONLY=new Set((process.env.ONLY||'build,cells,frame').split(','));
function playwright(){try{return require(process.env.PLAYWRIGHT_MODULE||'playwright');}catch(e){return require(path.join(execSync('npm root -g',{encoding:'utf8'}).trim(),'playwright'));}}
// the page: this tree's shell (or the root's own), the root's src/ in its order.txt's order, as build.js writes dev.html
function pageOf(root){const shell=fs.readFileSync(path.join(fs.existsSync(path.join(root,'shell.html'))?root:here,'shell.html'),'utf8'),order=fs.readFileSync(path.join(root,'src/order.txt'),'utf8').split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('#'));
  const seed='<script>(function(){let s=20261114>>>0;Math.random=function(){s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};'+ // mulberry32: the same draws in every run
    'const real=performance.now.bind(performance);window.__real=real;let now=0,raf=null;performance.now=()=>now;window.requestAnimationFrame=f=>{raf=f;return 1;};window.setTimeout=(f)=>{f();return 1;};'+ // the page's own clock: still between the bench's steps
    'let su=777;window.__uuidR=function(){su=(su+0x6D2B79F5)>>>0;let t=su;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};'+ // three's UUIDs on a stream of their own (below)
    'window.__step=n=>{for(let i=0;i<n;i++){const f=raf;raf=null;if(!f)break;now+=16.7;f(now);}};})();</script>\n';
  return shell.replace('<!--SCRIPTS-->',()=>seed+'<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n'+order.map(n=>'<script src="src/'+n+'.js"></script>\n').join(''));}
function serve(root){const html=pageOf(root);return new Promise(ok=>{const s=http.createServer((req,res)=>{const u=decodeURIComponent(new URL(req.url,'http://x').pathname);if(u==='/'||u==='/bench.html'){res.writeHead(200,{'content-type':'text/html'});res.end(html);return;}
  const p=path.normalize(path.join(root,u));if(!p.startsWith(root)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){res.writeHead(404).end();return;}res.writeHead(200,{'content-type':p.endsWith('.js')?'text/javascript':'application/octet-stream'});fs.createReadStream(p).pipe(res);});s.listen(0,'127.0.0.1',()=>ok(s));});}
// ---- in the page ----
function inPage(arg){const now=()=>window.__real(),out={};
  // a hash of numbers (FNV over their float32 bits) and of strings
  const hs=()=>({h:2166136261>>>0,n:0}),f32=new Float32Array(1),u32=new Uint32Array(f32.buffer),addN=(H,v)=>{f32[0]=v;H.h=Math.imul(H.h^u32[0],16777619)>>>0;H.n++;},addA=(H,a)=>{if(!a)return addN(H,-1);addN(H,a.length);for(let i=0;i<a.length;i++)addN(H,a[i]);},addS=(H,s)=>{s=String(s);for(let i=0;i<s.length;i++)addN(H,s.charCodeAt(i));};
  const geoH=(H,g)=>{if(!g){addN(H,-2);return;}for(const k of ['position','normal','color','aPat']){const a=g.attributes[k];addS(H,k);addA(H,a?a.array:null);}};
  const bodyH=(H,c)=>{addS(H,c.kind);addS(H,c.cls||'');addN(H,c.k);addN(H,c.pos.x);addN(H,c.pos.y);addN(H,c.pos.z);addN(H,c.mass);addN(H,c.b.gape||0);addS(H,(c.b.cover||[]).join());addS(H,JSON.stringify(c.b.grip||null));addS(H,c.b.edge||'');
    for(const h of c.b.hit||[]){addA(H,h.a);addA(H,h.b);addN(H,h.r);}
    c.g.traverse(o=>{addS(H,o.type);addN(H,o.visible?1:0);if(o.isMesh)geoH(H,o.geometry);});
    if(c.b.rigs)for(const r of c.b.rigs)for(const ch of r.chains){addN(H,ch.n);addA(H,ch.restL);}};
  const poseH=(H,c)=>{const st={tell:0,strike:0,jet:false};if(c.b.anim)c.b.anim(1.234,1.5,st);c.g.updateMatrixWorld(true);c.g.traverse(o=>{addA(H,o.matrixWorld.elements);});
    if(c.b.rigs)for(const r of c.b.rigs)for(const ch of r.chains)addA(H,ch.restL);};
  // timers round the functions the cells call by name (top-level declarations are the page's globals)
  const T={};const wrap=n=>{const f=window[n];if(typeof f!=='function')return;T[n]=0;window[n]=function(){const t0=now();try{return f.apply(this,arguments);}finally{T[n]+=now()-t0;}};};
  const simH=()=>{const H=hs();for(const c of creatures){addS(H,c.kind);for(const v of [c.pos,c.vel])if(v){addN(H,v.x);addN(H,v.y);addN(H,v.z);}const q=c.g.quaternion;addN(H,q.x);addN(H,q.y);addN(H,q.z);addN(H,q.w);addS(H,c.state);addN(H,c.hunger||0);addN(H,c.alive?1:0);
    if(c.b&&c.b.rigs)for(const r of c.b.rigs)for(const ch of r.chains)addA(H,ch.pts);}return H.h.toString(16);};
  if(arg.only.includes('build')){ // every kind's body, plain
    const kinds=[...new Set(SPAWN.map(e=>e.kind))].filter(k=>DEFS[k]&&specOfKind(k));const rows=[];let first=0,rep=0;
    for(const k of kinds){const d=DEFS[k];let t0=now();const b0=buildKind(d,k,'');const f=now()-t0;b0.g.traverse(o=>{if(o.geometry)o.geometry.dispose();});let best=1e9;
      for(let r=0;r<5;r++){t0=now();const b=buildKind(d,k,'');const t=now()-t0;if(t<best)best=t;b.g.traverse(o=>{if(o.geometry)o.geometry.dispose();});}rows.push([k,f,best]);first+=f;rep+=best;}
    out.build={kinds:rows.length,first,rep,rows};}
  if(arg.only.includes('cells')){wrap('spawn');wrap('compile');wrap('bakeLOD');const places={forest:[330,0],atoll:[108100,4000],platform:[216062,15900],sea:[20000,40000],giant:[-12000,6000]},res={};
    for(const k in places){const ci=Math.floor((places[k][0]+HALF)/CELL),cj=Math.floor((places[k][1]+HALF)/CELL);for(const n in T)T[n]=0;let n=0,cr=0;const t0=now();
      for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(chunks.has(ckey(ci+di,cj+dj)))continue;loadChunkNow(ci+di,cj+dj);n++;cr+=chunks.get(ckey(ci+di,cj+dj)).creatures.length;}
      res[k]={cells:n,ms:(now()-t0)/Math.max(1,n),creatures:cr,spawn:T.spawn/Math.max(1,n),compile:T.compile/Math.max(1,n),bake:T.bakeLOD/Math.max(1,n)};}
    out.cells=res;const H=hs(),P=hs(),per=[];let nc=0;
    for(const ch of [...chunks.values()].sort((a,b)=>a.i-b.i||a.j-b.j))for(const c of ch.creatures){bodyH(H,c);poseH(P,c);nc++;
      const parts={kind:c.kind+(c.cls?'@'+c.cls:'')+(c.juv>0?'~':'')},one=(k,f)=>{const q=hs();f(q);parts[k]=q.h.toString(16);};one('place',q=>{addS(q,c.kind);addS(q,c.cls||'');addN(q,c.k);addN(q,c.pos.x);addN(q,c.pos.y);addN(q,c.pos.z);});one('numbers',q=>{addN(q,c.mass);addN(q,c.b.gape||0);addS(q,(c.b.cover||[]).join());for(const h of c.b.hit||[]){addA(q,h.a);addA(q,h.b);addN(q,h.r);}});
      let mi=0;c.g.traverse(o=>{if(o.isMesh)one('mesh'+(mi++)+(o.visible?'':'h'),q=>geoH(q,o.geometry));});if(c.b.rigs)c.b.rigs.forEach((r,i)=>one('rig'+i,q=>{for(const ch of r.chains){addN(q,ch.n);addA(q,ch.restL);}}));one('pose',q=>poseH(q,c));per.push(parts);} // each body's pieces apart, to say which differs
    out.bodies={n:nc,hash:H.h.toString(16),pose:P.h.toString(16),per};}
  if(arg.only.includes('frame')){const rf=window.renderFrame;window.renderFrame=function(){}; // the render left out: software WebGL takes seconds a frame, and the creatures' work is the CPU's
    player.pos.set(330,-12,0);camera.position.set(330,-12,0);cellsAround();window.__step(30); // the forest's shelf, the cells round it loaded
    const ms=[],u=window.updateCreatures,sc=window.updateSchools;let ss=0;window.updateSchools=function(dt){const t0=now();sc(dt);ss=now()-t0;};window.updateCreatures=function(dt){const t0=now();u(dt);ms.push(now()-t0+ss);};
    window.__step(arg.frames);window.updateCreatures=u;window.updateSchools=sc;window.renderFrame=rf;const m=ms.slice().sort((a,b)=>a-b),n=m.length;
    out.frame={frames:n,mean:m.reduce((a,b)=>a+b,0)/n,median:m[n>>1],p95:m[Math.floor(n*0.95)],creatures:creatures.length,near:creatures.filter(c=>c.lod===0&&c.g.visible).length,sim:simH()};}
  return out;}
// three.js r128 draws four Math.random() for every geometry's UUID (its ct()): a build that makes fewer geometries (v11.149's replay) would shift
// every later draw — the arms' phases — and two trees could not be compared draw for draw. The page's three.js has those four on a stream of their
// own (__uuidR); the game's own draws stay on Math.random. In the game Math.random is not seeded at all, so this is the comparison's, nothing else
let THREE_JS=null;
async function onePage(pw,root){const srv=await serve(root),browser=await pw.chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  try{const page=await browser.newPage({viewport:{width:1280,height:720}}),errs=[];page.on('pageerror',e=>errs.push(String(e)));
    await page.route('**/three.min.js',async route=>{if(!THREE_JS){const r=await route.fetch(),t=await r.text(),n=t.split('4294967295*Math.random()').length-1;if(n!==4)throw new Error('three.min.js: '+n+' UUID draws found, 4 expected');THREE_JS=t.split('4294967295*Math.random()').join('4294967295*window.__uuidR()');}
      await route.fulfill({status:200,contentType:'text/javascript',body:THREE_JS});});
    const t0=Date.now();await page.goto(`http://127.0.0.1:${srv.address().port}/bench.html`,{waitUntil:'load',timeout:300000});const boot=await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return n.domContentLoadedEventStart-n.responseEnd;});
    await page.evaluate(n=>{const rf=window.renderFrame;window.renderFrame=function(){};window.__step(n);window.renderFrame=rf;},SETTLE); // the menu's first frames, the same in every run
    const o=await page.evaluate(inPage,{only:[...ONLY],frames:FRAMES});o.boot=boot;o.errs=errs;return o;}finally{await browser.close();srv.close();}}
(async()=>{const pw=playwright(),res=[];
  for(const r of roots){let best=null;for(let k=0;k<N;k++){const o=await onePage(pw,r);if(o.errs.length)console.log('page errors in '+r+': '+o.errs.slice(0,3).join(' | '));
    if(!best){best=o;continue;}best.boot=Math.min(best.boot,o.boot);if(o.build){best.build.first=Math.min(best.build.first,o.build.first);best.build.rep=Math.min(best.build.rep,o.build.rep);best.build.rows=best.build.rows.map((w,i)=>[w[0],Math.min(w[1],o.build.rows[i][1]),Math.min(w[2],o.build.rows[i][2])]);}
      if(o.cells)for(const k in o.cells)for(const q of ['ms','spawn','compile','bake'])best.cells[k][q]=Math.min(best.cells[k][q],o.cells[k][q]);
      if(o.bodies&&(o.bodies.hash!==best.bodies.hash||o.bodies.pose!==best.bodies.pose))console.log('  the bodies differ between two runs of '+r+' (something unseeded)');
      if(o.frame&&best.frame){for(const q of ['mean','median','p95'])best.frame[q]=Math.min(best.frame[q],o.frame[q]);if(o.frame.sim!==best.frame.sim)console.log('  the simulation differs between two runs of '+r+' (something unseeded)');}}
    res.push(best);}
  const pad=(s,n)=>String(s).padStart(n),f=(v,d)=>v.toFixed(d===undefined?1:d),name=i=>roots[i]===here?'here':'base',two=res.length>1;
  console.log('the scripts at load (ms): '+res.map((o,i)=>name(i)+' '+f(o.boot,0)).join(', '));
  if(res[0].build){console.log('\nbuild: every kind\'s body (ms), first / the least of the next five — '+res[0].build.kinds+' kinds');
    console.log(pad('',14)+res.map((o,i)=>pad(name(i)+' first',12)+pad(name(i)+' again',12)).join(''));
    for(let q=0;q<res[0].build.rows.length;q++)console.log(pad(res[0].build.rows[q][0],14)+res.map(o=>pad(f(o.build.rows[q][1],2),12)+pad(f(o.build.rows[q][2],2),12)).join(''));
    console.log(pad('all',14)+res.map(o=>pad(f(o.build.first),12)+pad(f(o.build.rep),12)).join('')+(two?'   again ×'+f(res[1].build.rep/res[0].build.rep,2):''));}
  if(res[0].cells){console.log('\ncells: ms a cell (3×3 at each place) — whole / in spawn() / in compile() / in the far bake');
    for(const k in res[0].cells)console.log(pad(k,10)+res.map((o,i)=>{const c=o.cells[k];return '   '+name(i)+' '+pad(f(c.ms),6)+' '+pad(f(c.spawn),6)+' '+pad(f(c.compile),6)+' '+pad(f(c.bake),5)+' ('+c.creatures+' bodies)';}).join('')+(two?'   ×'+f(res[1].cells[k].ms/res[0].cells[k].ms,2):''));
    console.log('bodies: '+res.map((o,i)=>name(i)+' '+o.bodies.n+' built '+o.bodies.hash+', posed '+o.bodies.pose).join('; '));
    if(two){const same=res[0].bodies.hash===res[1].bodies.hash&&res[0].bodies.pose===res[1].bodies.pose&&res[0].bodies.n===res[1].bodies.n;console.log(same?'  every body the same to the bit, built and posed':'  NOT the same bodies');
      if(!same){const A=res[0].bodies.per,B=res[1].bodies.per;let shown=0,nd=0;const by={};for(let i=0;i<Math.min(A.length,B.length);i++){const ks=[...new Set(Object.keys(A[i]).concat(Object.keys(B[i])))].filter(k=>A[i][k]!==B[i][k]);if(!ks.length)continue;nd++;for(const k of ks)by[k.replace(/[0-9]+/,'')]=(by[k.replace(/[0-9]+/,'')]||0)+1;
        if(shown++<6)console.log('    body '+i+' ('+A[i].kind+'): '+ks.join(', '));}console.log('    '+nd+' of '+A.length+' bodies differ; by piece: '+JSON.stringify(by));}}}
  if(res[0].frame){console.log('\nframe: updateSchools + updateCreatures, ms a frame over '+FRAMES+' frames at the forest\'s shelf');
    for(let i=0;i<res.length;i++){const q=res[i].frame;console.log(pad(name(i),6)+'  mean '+f(q.mean,3)+'  median '+f(q.median,3)+'  p95 '+f(q.p95,3)+'  ('+q.creatures+' creatures, '+q.near+' near; the simulation '+q.sim+')');}
    if(two)console.log('        mean ×'+f(res[1].frame.mean/res[0].frame.mean,2)+(res[0].frame.sim===res[1].frame.sim?'   the simulation the same to the bit':'   the simulation NOT the same'));}
})().catch(e=>{console.error(e);process.exit(1);});
