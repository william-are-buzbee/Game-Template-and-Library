// test/bench_creatures.js — the creatures' cost and their fingerprint (v11.149, the creature performance pass), in headless Chromium with the real
// three.js: the stub's primitives have no triangles (test/stub.js), so a body's build cannot be timed in node. Not in --test.
//   node test/bench_creatures.js                the numbers below for this tree
//   BASE=<dir> node test/bench_creatures.js     the same beside the sources kept in <dir> (src/ and vendor/ from before a change, or any older version's:
//                                               `git archive <commit> games/tethys/src games/tethys/vendor | tar -x -C <dir>`), the ratio, and whether
//                                               every built body is the same to the bit
// The page runs on a clock of its own (as the node tests' stub does): performance.now and requestAnimationFrame are replaced before any script, the
// frame loop advanced only by the bench, 16.7 ms a frame, and Math.random seeded — so the ledger, the streaming and every draw are the same in every
// run, and two trees can be held to the same bodies and the same simulation. The bench's own timings read the real clock.
// What it measures, after the boot and SETTLE frames, in N rounds (each page its own browser, a fresh one a round):
//   build      every kind's body (creatures_ai.js buildKind, plain coat): the first build, then the least of the next five — what a spawn pays;
//              each kind the least of its rounds
//   cells      3×3 cells at five places (the forest's shelf, an atoll, the platform, the open sea, the giant's coast) generated whole (chunks.js
//              genChunk drained, as loadChunkNow does), the time a cell and the share of it inside spawn() and inside compile(); each step of
//              the generator timed apart and each step the least of its rounds
//   frame      the player put at the forest's shelf (330, −12, 0: the heaviest place) and FRAMES frames stepped (the render left out): updateSchools +
//              updateCreatures a frame, on the real clock, with every creature the cells round it hold; each frame the least of its rounds
// and what it proves: every creature those cells placed (its kind, place, coat class, scale; every mesh's geometry — position, normal, colour, the
// pattern — its far bake's, its hit capsules, coverings, grip, edge, gape and mass) and each body posed by its own anim at a fixed time, hashed; and after
// the frames every creature's place, velocity, facing, state and hunger, and every rig's points (the simulation the same, frame for frame).
// The comparison is fair (v11.237.1): identical sources read within ±4%, ×0.93–1.07 at the sea and the giant's coast, where they read ×0.81–1.28. With BASE both trees'
// pages are open at once and take turns — kind by kind, cell by cell, BLOCK frames at a time — the side going first alternating (base, here |
// here, base | …), each round booting and starting with the other side; and every piece is the least of its rounds, not every round's total — a
// kind, a step of a cell's generator, a frame, each the same work in every round (the bodies and the simulation are held to the bit). A cloud
// machine's speed swings ±25% within half a second (a fixed loop timed again and again, 25 Nov 2026), each page's V8 tiers and collects on a
// clock of its own, and a cell is 10–150 ms: a cell in a slow spell reads half as long again, and four or five rounds of whole cells left one
// in a few without its fast reading. A step (~0.1 ms, ~250–700 a cell) misses one only now and then, and costs little when it does. So a cell's
// time is its work on a quiet machine: what a collection pause adds falls on a different step each round and is mostly left out, as the best of
// several runs always left it. The page is cross-origin isolated (test/benchpage.js `iso`): its clock reads to 5 µs, not 100 (a rebuild is
// ~0.15 ms). Tried and worse: a collection forced before each cell, V8 single-threaded or --predictable, both pages on one renderer.
// Needs Playwright (a cloud session has one globally; PLAYWRIGHT_MODULE names another) and three.js r128 from cdnjs, which the page loads itself.
// Env: BASE, N (rounds, 8: ~35 s a round with BASE), FRAMES (300), BLOCK (frames a turn, 20), SETTLE (60), ONLY (build,cells,frame), JSON=<file> (the results, for test/perf.js).
'use strict';
const path=require('path');
const here=path.join(__dirname,'..'),roots=(process.env.BASE?[path.resolve(process.env.BASE)]:[]).concat([here]),N=+(process.env.N||8),FRAMES=+(process.env.FRAMES||300),BLOCK=+(process.env.BLOCK||20),SETTLE=+(process.env.SETTLE||60);
const ONLY=new Set((process.env.ONLY||'build,cells,frame').split(','));
const PLACES={forest:[330,0],atoll:[108100,4000],platform:[216062,15900],sea:[20000,40000],giant:[-12000,6000]};
const {playwright,open}=require('./benchpage.js'); // the page, its clock and seed, and three's UUIDs on a stream of their own (test/benchpage.js, v11.179: shared with test/gpu.js)
// ---- in the page: the bench's pieces as window.__bc, each called from node on its own (v11.237.1), so two pages can take turns ----
function inPage(){const now=()=>window.__real(),B={};
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
  // build: every kind's body, plain — the first, then the least of the next five
  B.kinds=()=>[...new Set(SPAWN.map(e=>e.kind))].filter(k=>DEFS[k]&&specOfKind(k));
  B.build=k=>{const d=DEFS[k];let t0=now();const b0=buildKind(d,k,'');const f=now()-t0;b0.g.traverse(o=>{if(o.geometry)o.geometry.dispose();});let best=1e9;
    for(let r=0;r<5;r++){t0=now();const b=buildKind(d,k,'');const t=now()-t0;if(t<best)best=t;b.g.traverse(o=>{if(o.geometry)o.geometry.dispose();});}return [k,f,best];};
  // cells: the c-th of the 3×3 round (x, z), in the order the whole set was always made (dj, then di); null when it was already loaded. Made as
  // loadChunkNow makes it — genChunk drained — with every step of the generator timed apart (st): a cell is 10–150 ms, a step well under one
  B.cellsStart=()=>{wrap('spawn');wrap('compile');wrap('bakeLOD');};
  B.cell=([x,z,c])=>{const i=Math.floor((x+HALF)/CELL)+c%3-1,j=Math.floor((z+HALF)/CELL)+Math.floor(c/3)-1;if(chunks.has(ckey(i,j)))return null;for(const n in T)T[n]=0;const st=[],g=genChunk(i,j);let t=now();
    for(;;){const r=g.next(),u=now();st.push(u-t);t=u;if(r.done)break;}
    return {st,spawn:T.spawn||0,compile:T.compile||0,bake:T.bakeLOD||0,creatures:chunks.get(ckey(i,j)).creatures.length};};
  B.bodies=()=>{const H=hs(),P=hs(),per=[];let nc=0;
    for(const ch of [...chunks.values()].sort((a,b)=>a.i-b.i||a.j-b.j))for(const c of ch.creatures){bodyH(H,c);poseH(P,c);nc++;
      const parts={kind:c.kind+(c.cls?'@'+c.cls:'')+(c.juv>0?'~':'')},one=(k,f)=>{const q=hs();f(q);parts[k]=q.h.toString(16);};one('place',q=>{addS(q,c.kind);addS(q,c.cls||'');addN(q,c.k);addN(q,c.pos.x);addN(q,c.pos.y);addN(q,c.pos.z);});one('numbers',q=>{addN(q,c.mass);addN(q,c.b.gape||0);addS(q,(c.b.cover||[]).join());for(const h of c.b.hit||[]){addA(q,h.a);addA(q,h.b);addN(q,h.r);}});
      let mi=0;c.g.traverse(o=>{if(o.isMesh)one('mesh'+(mi++)+(o.visible?'':'h'),q=>geoH(q,o.geometry));});if(c.b.rigs)c.b.rigs.forEach((r,i)=>one('rig'+i,q=>{for(const ch of r.chains){addN(q,ch.n);addA(q,ch.restL);}}));one('pose',q=>poseH(q,c));per.push(parts);} // each body's pieces apart, to say which differs
    return {n:nc,hash:H.h.toString(16),pose:P.h.toString(16),per};};
  // frame: the forest's shelf, the cells round it loaded, then frameRun(n) as often as asked, then frameEnd
  const F={};
  B.frameStart=()=>{F.rf=window.renderFrame;window.renderFrame=function(){}; // the render left out: software WebGL takes seconds a frame, and the creatures' work is the CPU's
    player.pos.set(330,-12,0);camera.position.set(330,-12,0);cellsAround();window.__step(30);
    F.ms=[];F.u=window.updateCreatures;F.sc=window.updateSchools;let ss=0;window.updateSchools=function(dt){const t0=now();F.sc(dt);ss=now()-t0;};window.updateCreatures=function(dt){const t0=now();F.u(dt);F.ms.push(now()-t0+ss);};};
  B.frameRun=n=>{window.__step(n);};
  B.frameEnd=()=>{window.updateCreatures=F.u;window.updateSchools=F.sc;window.renderFrame=F.rf;return {ms:F.ms,creatures:creatures.length,near:creatures.filter(c=>c.lod===0&&c.g.visible).length,sim:simH()};};
  window.__bc=B;}
// ---- a page, booted and settled ----
async function openSide(pw,root){const P=await open(pw,root,{iso:true}); // isolated: its clock to 5 µs, not 100 (a body's rebuild is ~0.15 ms)
  try{const {page,errs}=P;const boot=await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return n.domContentLoadedEventStart-n.responseEnd;});
    for(let k=0;k<500;k++){if(await page.evaluate(()=>window.__boot.stage!=='store'))break;await new Promise(r=>setTimeout(r,20));} // v11.200: the store's answer first, no frame stepped (as test/gpu.js) — it comes when IndexedDB gives it, and a boot that streamed a few frames before it spawned another ledger: 'the bodies differ between two runs' (since v11.189's boot)
    await page.evaluate(()=>{const st=window.__step;window.__step=n=>{for(let i=0;i<n;i++){if(typeof menuWake==='function')menuWake();st(1);}};}); // v11.202: the bench runs on the menu — a mouse moving keeps it from the idle menu's pace (menu.js MENU_IDLE_IV)
    await page.evaluate(n=>{const rf=window.renderFrame;window.renderFrame=function(){};window.__step(n);window.renderFrame=rf;},SETTLE); // the menu's first frames, the same in every run
    await page.evaluate(inPage);return {P,page,boot,errs};}catch(e){await P.close();throw e;}}
// ---- one round: every side's page open, the sections run turn about ----
async function round(pw,k){const S=[];
  try{for(const r of k%2?roots.slice().reverse():roots)S.push(await openSide(pw,r));if(k%2)S.reverse(); // booted one after the other, the first to boot alternating: the boot's time is each page's alone, and the page just settled is the busier one
    const turn=q=>(k+q)%2?S.slice().reverse():S,ix=s=>S.indexOf(s),o=S.map(s=>({boot:s.boot,errs:s.errs}));
    if(ONLY.has('build')){const K=[];for(const s of S)K.push(await s.page.evaluate(()=>window.__bc.kinds()));const rows=S.map(()=>[]);
      for(let j=0;j<Math.max(...K.map(x=>x.length));j++)for(const s of turn(j))if(j<K[ix(s)].length)rows[ix(s)].push(await s.page.evaluate(kk=>window.__bc.build(kk),K[ix(s)][j]));
      rows.forEach((w,i)=>{o[i].build={kinds:w.length,rows:w};});}
    if(ONLY.has('cells')){for(const s of S)await s.page.evaluate(()=>window.__bc.cellsStart());o.forEach(x=>{x.cells={};});let q=0;
      for(const p in PLACES){o.forEach(x=>{x.cells[p]=[];});for(let c=0;c<9;c++,q++)for(const s of turn(q))o[ix(s)].cells[p].push(await s.page.evaluate(a=>window.__bc.cell(a),[PLACES[p][0],PLACES[p][1],c]));}
      for(const s of S)o[ix(s)].bodies=await s.page.evaluate(()=>window.__bc.bodies());}
    if(ONLY.has('frame')){for(const s of S)await s.page.evaluate(()=>window.__bc.frameStart());
      for(let f=0,q=0;f<FRAMES;f+=BLOCK,q++)for(const s of turn(q))await s.page.evaluate(n=>window.__bc.frameRun(n),Math.min(BLOCK,FRAMES-f));
      for(const s of S)o[ix(s)].frame=await s.page.evaluate(()=>window.__bc.frameEnd());}
    return o;}finally{for(const s of S)await s.P.close();}}
(async()=>{const pw=playwright(),res=roots.map(()=>null);
  for(let k=0;k<N;k++){const rr=await round(pw,k);
    rr.forEach((o,i)=>{const r=roots[i];if(o.errs.length)console.log('page errors in '+r+': '+o.errs.slice(0,3).join(' | '));const best=res[i];
      if(!best){res[i]=o;return;}best.boot=Math.min(best.boot,o.boot);if(o.build)best.build.rows=best.build.rows.map((w,j)=>[w[0],Math.min(w[1],o.build.rows[j][1]),Math.min(w[2],o.build.rows[j][2])]); // each kind its least
      if(o.cells)for(const p in o.cells)best.cells[p]=best.cells[p].map((a,j)=>{const b=o.cells[p][j];return a&&b?{st:a.st.length===b.st.length?a.st.map((v,q)=>Math.min(v,b.st[q])):a.st,spawn:Math.min(a.spawn,b.spawn),compile:Math.min(a.compile,b.compile),bake:Math.min(a.bake,b.bake),creatures:a.creatures}:a;}); // each step of each cell its least
      if(o.bodies&&(o.bodies.hash!==best.bodies.hash||o.bodies.pose!==best.bodies.pose))console.log('  the bodies differ between two runs of '+r+' (something unseeded)');
      if(o.frame&&best.frame){best.frame.ms=best.frame.ms.slice(0,o.frame.ms.length).map((v,j)=>Math.min(v,o.frame.ms[j]));if(o.frame.sim!==best.frame.sim)console.log('  the simulation differs between two runs of '+r+' (something unseeded)');}});}
  for(const o of res){if(o.build){o.build.first=o.build.rows.reduce((a,r)=>a+r[1],0);o.build.rep=o.build.rows.reduce((a,r)=>a+r[2],0);}
    if(o.frame){const m=o.frame.ms.slice().sort((a,b)=>a-b),n=m.length;o.frame={frames:n,mean:m.reduce((a,b)=>a+b,0)/n,median:m[n>>1],p95:m[Math.floor(n*0.95)],creatures:o.frame.creatures,near:o.frame.near,sim:o.frame.sim};} // each frame its least: the simulation is the same frame for frame in every round
    if(o.cells)for(const p in o.cells){const v=o.cells[p].filter(Boolean),n=Math.max(1,v.length),s=q=>v.reduce((a,c)=>a+c[q],0); // a place: its cells' steps, each its least, summed
    o.cells[p]={cells:v.length,ms:v.reduce((a,c)=>a+c.st.reduce((x,y)=>x+y,0),0)/n,creatures:s('creatures'),spawn:s('spawn')/n,compile:s('compile')/n,bake:s('bake')/n};}}
  const pad=(s,n)=>String(s).padStart(n),f=(v,d)=>v.toFixed(d===undefined?1:d),name=i=>roots[i]===here?'here':'base',two=res.length>1;
  if(process.env.JSON)require('fs').writeFileSync(process.env.JSON,JSON.stringify(res.map((o,i)=>({who:name(i),boot:o.boot,build:o.build,cells:o.cells,bodies:o.bodies&&{n:o.bodies.n,hash:o.bodies.hash,pose:o.bodies.pose},frame:o.frame})))); // for test/perf.js
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
