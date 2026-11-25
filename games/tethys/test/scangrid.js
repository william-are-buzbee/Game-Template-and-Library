// test/scangrid.js — the scans' grid (v11.237, creatures_ai.js CG, cgNear): a school's look for a threat, a grazer's and a hunter's for prey walk the
// squares their reach covers instead of every creature, and must choose exactly as the walk over all did. In two processes the game boots against the
// stub, starts a new game, goes to the weed forest's shelf (330, 0: the most creatures) and lets the cells round it load; then the sim runs 600 steps
// (10 s) with the grid, and with it off (CG.maxC 0: every scan walks every creature). Every creature and the player must come out the same to the bit.
// With the grid, every answer it gives is checked as it is given against every creature: every live one filed under the square it is in, none alive
// within the reach left out, in `creatures`' order, none twice. In --test (build.js SIDE).
'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const N=600,PX=330,PZ=0,PY=-12;
if(process.argv[2]==='--child'){const linear=process.argv[3]==='linear';
  const ROOT=path.join(__dirname,'..');
  const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
  const js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n')+
    // every answer of the grid's checked against every creature where it is asked (an answer is the live creatures whose ground-plane distance is
    // within R, and maybe more, in creatures' order, none twice)
    '\nglobal.__G={asked:0,grid:0,got:0,bad:[]};{const near0=cgNear;cgNear=function(x,z,R){const G=global.__G;G.asked++;const out=near0(x,z,R);if(out===null)return out;G.grid++;G.got+=out.length;'+
    'const at=new Map();out.forEach((c,i)=>{if(at.has(c)&&G.bad.length<5)G.bad.push("twice: "+c.kind);at.set(c,i);});let k=-1;'+
    'for(const c of creatures){if(!at.has(c)){if(c.alive&&Math.hypot(c.pos.x-x,c.pos.z-z)<=R&&G.bad.length<5)G.bad.push("left out: "+c.kind+" at "+Math.hypot(c.pos.x-x,c.pos.z-z).toFixed(2)+" of "+R.toFixed(2));continue;}'+
    'const i=at.get(c);if(i<k&&G.bad.length<5)G.bad.push("out of order: "+c.kind);k=i;}'+
    // and the grid itself: every live creature filed under the square it is in now (a body moved by anything but its own update, or not moved to
    // its new square after it, breaks this before any answer is wrong — the 1 m margin in cgNear would hide a slow one)
    'for(const c of creatures)if(c.alive&&(c.cgI<0||CG.list[c.cgI]!==c||CG.key[c.cgI]!==cgK(c.pos.x,c.pos.z))&&G.bad.length<5)G.bad.push("filed wrong: "+c.kind+(c.cgI<0?" (not filed)":""));return out;};}'+
    '\nglobal.__S={creatures,player,startNew,CLADES,BOOT,chunks,CG,cellsAround,get simSteps(){return simSteps;},get mode(){return mode;}};';
  const tmp=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'tethys-scangrid-')),'bundle.js');fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
  const log=console.log;console.log=()=>{};console.warn=()=>{};require('./stub.js');require(tmp);const S=global.__S;
  if(linear)S.CG.maxC=0; // every reach too wide: every scan walks every creature, as before v11.237
  global.__FRAME_MS=1000/60;
  for(let i=0;i<3000&&!S.BOOT.done;i++)__step(1);
  S.startNew(S.CLADES[1]);S.player.pos.set(PX,PY,PZ);S.player.vel.set(0,0,0);S.cellsAround();
  let quiet=0,n0=-1,k=0;for(;k<3000&&quiet<90;k++){S.player.pos.set(PX,PY,PZ);S.player.vel.set(0,0,0);__step(1);const n=S.chunks.size;quiet=n===n0?quiet+1:0;n0=n;}
  const G=global.__G;G.asked=0;G.grid=0;G.got=0;const s0=S.simSteps;let frames=0;
  while(S.simSteps-s0<N&&frames<10000){S.player.pos.set(PX,PY,PZ);S.player.vel.set(0,0,0);__step(1);frames++;}
  let h=2166136261>>>0,n=0;const mix=v=>{const q=String(v);for(let i=0;i<q.length;i++){h^=q.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}};
  for(const c of S.creatures){n++;mix(c.kind);mix(c.alive);mix(c.state);mix(c.pos.x);mix(c.pos.y);mix(c.pos.z);mix(c.vel.x);mix(c.vel.y);mix(c.vel.z);mix(c.g.quaternion.x);mix(c.g.quaternion.w);mix(c.hunger);mix(c.target?c.target===S.player?'P':c.target.kind:'-');}
  const P=S.player;mix(P.pos.x);mix(P.pos.y);mix(P.pos.z);mix(P.vel.y);
  log(JSON.stringify({h:h.toString(16),n:n,steps:S.simSteps-s0,cells:S.chunks.size,mode:S.mode,asked:G.asked,grid:G.grid,got:G.got,bad:G.bad}));process.exit(0);}
const run=m=>{const r=cp.spawnSync(process.execPath,[__filename,'--child',m],{encoding:'utf8',maxBuffer:1<<26});const line=(r.stdout||'').trim().split('\n').pop();try{return JSON.parse(line);}catch(e){return {h:'error: '+(r.stderr||'').slice(0,400),n:0,steps:0,cells:0,mode:'',asked:0,grid:0,got:0,bad:['no result']};}};
const G=run('grid'),L=run('linear');let fails=0;const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++;};
ok(G.mode==='play'&&G.steps===N&&L.steps===N&&G.cells>=20,'the forest\'s shelf, '+G.cells+' cells loaded, '+N+' steps each way');
ok(G.grid>200&&L.grid===0,'the grid answered '+G.grid+' of '+G.asked+' scans ('+(G.got/Math.max(1,G.grid)).toFixed(1)+' creatures a scan, of '+G.n+'); with it off, none of '+L.asked);
ok(G.bad.length===0,'every live creature filed under the square it is in at every scan; every answer held every one within its reach, in creatures\' order, none twice'+(G.bad.length?': '+G.bad.join('; '):''));
ok(G.n>500&&G.h===L.h&&G.n===L.n,'every creature ('+G.n+') and the player the same to the bit with the grid and without: '+G.h+' / '+L.h);
console.log(fails?fails+' FAILED':'scangrid: ok');process.exit(fails?1:0);
