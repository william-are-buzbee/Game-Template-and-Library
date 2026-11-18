// test/frames.js — the frame's creature work and the hot tables' shapes, in node against the stub (v11.150; the tool v11.149's pass was made with).
// Not in --test. The game boots as the tests boot it (test/stub.js; the stub's performance.now is the frames', so this reads the wall clock itself),
// the player is put at a place (the forest's shelf by default: the heaviest place), the cells round it load, and FRAMES frames are stepped with
// updateSchools + updateCreatures timed. Math.random is seeded, so a run is the same run every time, and the simulation's hash after the frames
// (every creature's place, velocity, facing, hunger, life and rig points) says whether a change moved anything.
//   node test/frames.js                        the time a frame (mean, median, p95, max), the creatures by distance, the simulation's hash
//   BASE=<dir> node test/frames.js             the same for the sources kept in <dir> (src/ and vendor/ from before a change), N runs each,
//                                              alternated so one machine's load moves both alike; the ratio, and whether the simulation is the same
//   SHAPES=1 node test/frames.js               the shape census: how many hidden classes each table read in a hot loop has (the creatures, their
//                                              defs and states, the cells, the solids, the island records, the flora entries, the schools, the
//                                              holds, the falls, the spawn rows) and whether any is in dictionary mode. Past four shapes in a table
//                                              read every frame or every sample an engine drops the read's fast path — a third of the cost each time
//                                              it was found (v11.148, v11.149), and nothing but this shows it. Exits 1 on a fault
//   PROF=updateCreatures node test/frames.js   a CPU profile of the run: self and inclusive time by function, over the samples under the one named
// Env: BASE, N (runs each with BASE, 3), FRAMES (400), PX, PZ, PY (the place: 330, 0, −12), SHAPES, PROF (a function's name), JSON=<file> (the results, for test/perf.js)
'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),{execFileSync}=require('child_process');
const HERE=path.join(__dirname,'..'),FR=+(process.env.FRAMES||400),N=+(process.env.N||3);
if(!process.env.FRAMES_ROOT){ // ---- the parent: one run, or BASE beside here ----
  const run=(root,prof)=>{const args=[];if(process.env.SHAPES)args.push('--allow-natives-syntax');if(prof)args.push('--cpu-prof','--cpu-prof-dir='+prof);args.push(__filename);
    const out=execFileSync(process.execPath,args,{env:Object.assign({},process.env,{FRAMES_ROOT:root}),encoding:'utf8',maxBuffer:1<<26});return JSON.parse(out.split('\n').filter(l=>l.startsWith('{')).pop());};
  const show=(name,o)=>console.log(name.padEnd(6)+' mean '+o.mean.toFixed(3)+'  median '+o.median.toFixed(3)+'  p95 '+o.p95.toFixed(3)+'  max '+o.max.toFixed(3)+' ms a frame  ('+o.creatures+' creatures, '+o.cells+' cells; the simulation '+o.sim+')');
  const at='('+(process.env.PX||330)+', '+(process.env.PZ||0)+')';
  if(process.env.BASE){const B=path.resolve(process.env.BASE),best={};
    for(let k=0;k<N;k++)for(const [nm,r] of [['base',B],['here',HERE]]){const o=run(r);if(!best[nm]||o.mean<best[nm].mean)best[nm]=o;}
    console.log('updateSchools + updateCreatures over '+FR+' frames at '+at+', the best of '+N+' runs each:');show('base',best.base);show('here',best.here);
    if(process.env.JSON)fs.writeFileSync(process.env.JSON,JSON.stringify({at,frames:FR,base:best.base,here:best.here})); // for test/perf.js
    console.log('ratio  mean ×'+(best.here.mean/best.base.mean).toFixed(2)+'  p95 ×'+(best.here.p95/best.base.p95).toFixed(2)+(best.base.sim===best.here.sim?'   the simulation the same to the bit':'   the simulation NOT the same'));
    return;}
  const dir=process.env.PROF?fs.mkdtempSync(path.join(os.tmpdir(),'tethys_frames_')):null,o=run(HERE,dir);
  console.log('updateSchools + updateCreatures over '+FR+' frames at '+at+':');show('here',o);if(process.env.JSON)fs.writeFileSync(process.env.JSON,JSON.stringify({at,frames:FR,base:null,here:o}));
  console.log('the creatures by distance from the player (the frame steps those under 150 m every frame, 150–360 every other, past that only what is still drawn):');
  for(const k in o.bands)console.log('  '+k.padEnd(10)+String(o.bands[k]).padStart(6));
  if(o.shapes){console.log('\nthe shape census (more than 4 shapes in a table read every frame or sample, or any in dictionary mode, is a fault):');let bad=0;
    for(const r of o.shapes){const f=r.maps>4||r.dict>0;if(f)bad++;console.log('  '+(f?'FAULT ':'      ')+r.name.padEnd(16)+String(r.n).padStart(7)+' objects '+String(r.maps).padStart(4)+' shapes'+(r.dict?', '+r.dict+' in dictionary mode':'')+(r.note?'   ('+r.note+')':''));}
    if(bad)process.exitCode=1;}
  if(dir){const f=fs.readdirSync(dir).filter(n=>n.endsWith('.cpuprofile')).map(n=>path.join(dir,n))[0],p=JSON.parse(fs.readFileSync(f,'utf8')),R=process.env.PROF;
    const id2=new Map(p.nodes.map(n=>[n.id,n])),par=new Map();for(const n of p.nodes)for(const c of n.children||[])par.set(c,n.id);const nm=n=>n.callFrame.functionName||'(anonymous)',self=new Map(),incl=new Map();let tot=0;
    for(let i=0;i<p.samples.length;i++){const st=[];let id=p.samples[i],under=false;while(id!==undefined){const n=id2.get(id);st.push(n);if(nm(n)===R)under=true;id=par.get(id);}if(!under)continue;const dt=p.timeDeltas[i];tot+=dt;
      self.set(nm(st[0]),(self.get(nm(st[0]))||0)+dt);const seen=new Set();for(const n of st){const k=nm(n);if(!seen.has(k)){seen.add(k);incl.set(k,(incl.get(k)||0)+dt);}if(k===R)break;}}
    console.log('\nthe profile under '+R+' ('+(tot/1e3).toFixed(0)+' ms; the boot and the loading not counted):');
    for(const [k,v] of [...self].sort((a,b)=>b[1]-a[1]).slice(0,24))console.log((v/tot*100).toFixed(1).padStart(7)+'% self '+((incl.get(k)||0)/tot*100).toFixed(1).padStart(6)+'% incl  '+k);
    fs.rmSync(dir,{recursive:true,force:true});}
  return;}
// ---- the child: the game, the frames ----
const ROOT=process.env.FRAMES_ROOT,PX=+(process.env.PX||330),PZ=+(process.env.PZ||0),PY=process.env.PY!==undefined?+process.env.PY:-12;
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
let js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n');
js+='\nglobal.__go=(x,y,z)=>{player.pos.set(x,y,z);camera.position.set(x,y,z);cellsAround();};';
js+='\nglobal.__W={ms:[],on:false,s:0};{const u=updateCreatures,s=updateSchools;updateCreatures=function(dt){const t0=process.hrtime.bigint();u(dt);if(__W.on)__W.ms.push(Number(process.hrtime.bigint()-t0)/1e6+__W.s);};updateSchools=function(dt){const t0=process.hrtime.bigint();s(dt);__W.s=Number(process.hrtime.bigint()-t0)/1e6;};}';
js+='\nglobal.__sim=()=>{const f=new Float64Array(1),u=new Uint32Array(f.buffer);let h=2166136261>>>0;const N=v=>{f[0]=v;h=Math.imul(h^u[0],16777619)>>>0;h=Math.imul(h^u[1],16777619)>>>0;};for(const c of creatures){N(c.pos.x);N(c.pos.y);N(c.pos.z);N(c.vel.x);N(c.vel.y);N(c.vel.z);const q=c.g.quaternion;N(q.x);N(q.y);N(q.z);N(q.w);N(c.hunger||0);N(c.alive?1:0);if(c.b&&c.b.rigs)for(const r of c.b.rigs)for(const ch of r.chains)for(const v of ch.pts)N(v);}return h.toString(16);};';
js+='\nglobal.__bands=()=>{const B={"under 150":0,"150-360":0,"past 360":0,dead:0};for(const c of creatures){if(!c.alive){B.dead++;continue;}const d=c.pos.distanceTo(player.pos);B[d<150?"under 150":d<360?"150-360":"past 360"]++;}return B;};';
js+='\nglobal.__count=()=>({creatures:creatures.length,cells:chunks.size});';
// the tables read in a hot loop (a new one goes here): [name, the objects, where its one shape is made]
js+='\nglobal.__tables=()=>{const sol=[];for(const ch of chunks.values())for(const s of ch.solids)sol.push(s);return [["creatures",creatures,"creatures_ai.js spawn"],["their defs",creatures.map(c=>c.def),"creatures_defs.js DEF_KEYS"],["their st",creatures.map(c=>c.st),"spawn"],["cells",[...chunks.values()]],["solids",sol,"a shape a kind of solid, t 0-4"],["island records",ISLANDS,"world.js recNew"],["flora entries",FLORA],["schools",schools],["holds",holds],["falls",FALLS],["spawn rows",SPAWN]];};';
if(process.env.SHAPES)js+='\nglobal.__shapes=()=>__tables().map(([name,L,note])=>{const G=[];let dict=0,n=0;for(const o of L){if(!o||typeof o!=="object")continue;n++;if(!%HasFastProperties(o))dict++;if(!G.some(g=>%HaveSameMap(g,o)))G.push(o);}return {name,n,maps:G.length,dict,note:note||""};});';
const tmp=path.join(os.tmpdir(),'tethys_frames_'+process.pid+'.js');
fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
process.env.PICK='1';
const log=console.log,warn=console.warn;console.log=()=>{};console.warn=()=>{};
require(path.join(HERE,'test/stub.js')); // this tree's stub for either tree: it holds no game code
let s=1234;Math.random=()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}; // mulberry32: the same run every time
require(tmp);fs.unlinkSync(tmp);
__go(PX,PY,PZ);__step(400);__go(PX,PY,PZ);__step(200); // the cells round the place loaded and settled
const bands=__bands();__W.on=true;__step(FR);__W.on=false;
const m=__W.ms.slice().sort((a,b)=>a-b),out=Object.assign({frames:m.length,mean:m.reduce((a,b)=>a+b,0)/m.length,median:m[m.length>>1],p95:m[Math.floor(m.length*0.95)],max:m[m.length-1],sim:__sim(),bands},__count());
if(process.env.SHAPES)out.shapes=__shapes();
console.log=log;console.warn=warn;
log(JSON.stringify(out));
