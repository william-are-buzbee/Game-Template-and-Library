// test/bench.js — the world's cost and its fingerprint (v11.148, the performance pass): how long the world's load takes (util.js, world.js and
// region.js: the model, the platform, the records, the saddles, the grain), what a sample() costs over five windows, and a hash of everything the
// world is — sample()'s ground and nine fields over each window and at 300,000 random points, apronAt and coneK, the landmarks, and every piece
// of the region's data (the model's members, the platform's grids, the floor, the saddles, the grain, the records, the index). Not in --test.
//   node test/bench.js                 the load, the windows' µs a sample, the fingerprints
//   BASE=<dir> node test/bench.js      the same beside the sources kept in <dir> (a folder with src/ and vendor/ from before a change: `mkdir b &&
//                                      cp -r src vendor b/`), the ratio, and which pieces are the same to the bit — "ours' square the same to the
//                                      bit" (HANDOFF, the method) is the `ours` window's hash; a change that must move nothing wants every piece `same`
// Each window is timed in a process of its own, N times (3), REP passes each (7), the best kept: one process timing five windows gives numbers that
// swing by a third with the order the engine met them in. Before a window is timed the process samples 250,000 points across the whole world, as the
// game has by then (the landmarks, the maps, the census): timed cold on ours' square alone, the engine sees two records and specialises to them, which
// the game never is — v11.147 measured that way read 1.6 µs where the game paid 2.4.
// BASE may be any older version's sources (a piece it lacks reads as none): `git archive <commit> games/tethys/src games/tethys/vendor | tar -x -C <dir>`.
// Env: BASE, N, REP, WINS (names, comma-separated: world,w70,ours,plat,east), FAST=1 (no fingerprint of the region's data).
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{execFileSync}=require('child_process');
const WINS={world:null,w70:[-70500,70500,-70500,70500,480,480],ours:[-2000,2000,-2000,2000,400,400],plat:[150000,350000,-40000,140000,480,432],east:[40000,150000,-80000,100000,400,400]}; // x0, x1, z0, z1, columns, rows; world: the world's own box
// ---- one process: load a root's world, time one window or hash the data ----
function child(root,what){
  const util=fs.readFileSync(path.join(root,'vendor/wb-core.global.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'src/util.js'),'utf8');let world=fs.readFileSync(path.join(root,'src/world.js'),'utf8');
  const cut=world.indexOf('// ---------- the light');if(cut>0)world=world.slice(0,cut);world+='\n'+fs.readFileSync(path.join(root,'src/region.js'),'utf8'); // test/map.js's cut: the geology and the fields
  const THREE={Vector3:class{constructor(x,y,z){this.x=x;this.y=y;this.z=z;}},Matrix4:class{},Quaternion:class{}},log=console.log;console.log=()=>{};
  const t0=process.hrtime.bigint(),W=new Function('THREE',util+'\n'+world+'\nconst opt=f=>{try{return f();}catch(e){return null;}};return {sample,apronAt,coneK,WX0,WX1,WZ0,WZ1,NF,ISLANDS,LM,REGION:opt(()=>REGION),RG_PL:opt(()=>RG_PL),RG_SAD:opt(()=>RG_SAD),RG_FL:opt(()=>RG_FL),RG_GR:opt(()=>RG_GR),RG_BUILT:opt(()=>RG_BUILT),RIX:opt(()=>RIX),recsAt:opt(()=>recsAt)};')(THREE),load=Number(process.hrtime.bigint()-t0)/1e9;console.log=log;
  const out={load},f=new Float32Array(W.NF),sha=()=>crypto.createHash('sha1'),hex=h=>h.digest('hex').slice(0,10);
  if(what==='deep'){ // every piece of the region's data, by content (typed arrays' bytes; keys sorted; functions, undefined and the engine's own caches (_c, _s) left out)
    const SKIP=new Set(['ms']),feed=(h,v,seen)=>{if(v===undefined||typeof v==='function')return;if(v===null||typeof v!=='object'){h.update(typeof v==='number'?(Object.is(v,-0)?'-0':String(v)):JSON.stringify(v));h.update('|');return;}
      if(ArrayBuffer.isView(v)){h.update(v.constructor.name+v.length);h.update(Buffer.from(v.buffer,v.byteOffset,v.byteLength));return;}if(seen.has(v)){h.update('@');return;}seen.add(v);
      if(v instanceof Map){h.update('M');for(const [k,x] of v){feed(h,k,seen);feed(h,x,seen);}return;}if(Array.isArray(v)){h.update('['+v.length);for(const x of v)feed(h,x,seen);return;}
      h.update('{');for(const k of Object.keys(v).sort()){if(k[0]==='_'||SKIP.has(k)||v[k]===undefined||typeof v[k]==='function')continue;h.update(k+':');feed(h,v[k],seen);}h.update('}');},H=v=>{const h=sha();feed(h,v,new Set());return hex(h);};
    if(W.recsAt)W.recsAt(0,0);out.deep={members:H(W.REGION&&W.REGION.M),model:H(Object.assign({},W.REGION,{M:null})),platform:H(W.RG_PL),saddles:H(W.RG_SAD),floor:H(W.RG_FL),grain:H(Object.assign({},W.RG_GR,{la:null,n0:null,n1:null})),records:H(W.ISLANDS),index:H(W.RIX&&W.RIX.L),landmarks:H(W.LM)}; // a piece an older BASE lacks hashes as none
    let s=12345;const rnd=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff;},n=300000,Hh=new Float64Array(n),F=new Float32Array(n*W.NF);
    for(let q=0;q<n;q++){const sm=W.sample(W.WX0-3000+rnd()*(W.WX1-W.WX0+6000),W.WZ0-3000+rnd()*(W.WZ1-W.WZ0+6000),f);Hh[q]=sm.h;F.set(f,q*W.NF);}out.deep.random=hex(sha().update(Buffer.from(Hh.buffer)).update(Buffer.from(F.buffer)));
  }else{const [x0,x1,z0,z1,nx,nz]=WINS[what]||[W.WX0,W.WX1,W.WZ0,W.WZ1,640,392],n=nx*nz,Hh=new Float64Array(n),F=new Float32Array(n*W.NF),A=new Float64Array(n),REP=+(process.env.REP||7);let best=1e9;
    {let s=777;const rnd=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff;};for(let q=0;q<250000;q++)W.sample(W.WX0+rnd()*(W.WX1-W.WX0),W.WZ0+rnd()*(W.WZ1-W.WZ0),f);} // the whole world first, as the game
    for(let r=0;r<REP;r++){const t=process.hrtime.bigint();for(let j=0;j<nz;j++){const z=z0+(j+0.37)*(z1-z0)/nz;for(let i=0;i<nx;i++){const sm=W.sample(x0+(i+0.61)*(x1-x0)/nx,z,f),q=j*nx+i;Hh[q]=sm.h;if(r===0)F.set(f,q*W.NF);}}const us=Number(process.hrtime.bigint()-t)/1e3/n;if(us<best)best=us;}
    for(let q=0;q<n;q+=7){const j=(q/nx)|0,i=q-j*nx,x=x0+(i+0.61)*(x1-x0)/nx,z=z0+(j+0.37)*(z1-z0)/nz;A[q]=W.apronAt(x,z)+3*W.coneK(x,z);}
    out.us=best;out.hash=hex(sha().update(Buffer.from(Hh.buffer)).update(Buffer.from(F.buffer)).update(Buffer.from(A.buffer)));}
  log(JSON.stringify(out));}
if(process.env.BENCH_ONE){child(process.env.BENCH_ROOT,process.env.BENCH_ONE);process.exit(0);}
// ---- the table ----
const here=path.join(__dirname,'..'),roots=(process.env.BASE?[path.resolve(process.env.BASE)]:[]).concat([here]),N=+(process.env.N||3),wins=(process.env.WINS||Object.keys(WINS).join(',')).split(',').filter(w=>w in WINS);
const one=(root,what)=>JSON.parse(execFileSync(process.execPath,[__filename],{env:Object.assign({},process.env,{BENCH_ONE:what,BENCH_ROOT:root}),encoding:'utf8',maxBuffer:1<<24}));
const res=roots.map(r=>{const o={root:r,load:1e9,w:{},deep:null};for(const w of wins){let best=1e9,hash='';for(let k=0;k<N;k++){const j=one(r,w);if(j.us<best)best=j.us;hash=j.hash;if(j.load<o.load)o.load=j.load;}o.w[w]={us:best,hash};}
  if(!process.env.FAST){const j=one(r,'deep');o.deep=j.deep;if(j.load<o.load)o.load=j.load;}return o;});
const pad=(s,n)=>String(s).padStart(n),name=o=>o.root===here?'here':'base';
console.log(pad('',6)+pad('load s',9)+wins.map(w=>pad(w,9)).join('')+'   (µs a sample, best of '+N+' processes)');
for(const o of res)console.log(pad(name(o),6)+pad(o.load.toFixed(2),9)+wins.map(w=>pad(o.w[w].us.toFixed(3),9)).join(''));
if(res.length>1){const b=res[0],o=res[1];console.log(pad('ratio',6)+pad((o.load/b.load).toFixed(2),9)+wins.map(w=>pad((o.w[w].us/b.w[w].us).toFixed(2),9)).join(''));
  const diff=wins.filter(w=>o.w[w].hash!==b.w[w].hash).concat(o.deep?Object.keys(o.deep).filter(k=>o.deep[k]!==b.deep[k]):[]);
  console.log(diff.length?'  NOT the same: '+diff.join(', '):'  the same to the bit: '+wins.join(', ')+(o.deep?'; '+Object.keys(o.deep).join(', '):''));process.exitCode=0;}
const o=res[res.length-1];console.log('  fingerprints: '+wins.map(w=>w+' '+o.w[w].hash).join(', ')+(o.deep?'\n  '+Object.keys(o.deep).map(k=>k+' '+o.deep[k]).join(', '):''));
