// test/step.js — the fixed step (v11.210, step.js; analysis_project.md §7): one world, three screens. In three processes the game boots against the stub at
// 60 Hz, starts a new game and lets the cells round it load; then the screen's rate changes to 30, 60 or 144 Hz and the sim runs 600 steps (10 s). Every
// creature and the player must come out the same to the bit on all three — anything only seen that feeds the sim, a sim draw left on Math.random, or a step
// that still reads the frame's interval breaks it. Also: the steps a frame (two at 30 Hz, one at 60, none or one at 144), the clock on by exactly 10 s, and
// the drawing set between the last two steps and put back after the render (the sim never sees an in-between pose). In --test (build.js SIDE).
'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const N=600;
if(process.argv[2]==='--child'){const fm=+process.argv[3];
  const ROOT=path.join(__dirname,'..');
  const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
  const js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n')+
    '\nglobal.__S={creatures,player,startNew,CLADES,BOOT,chunks,lerpApply,lerpRestore,get CHEMO_B(){return CHEMO_B;},get simSteps(){return simSteps;},get t(){return t;},get mode(){return mode;}};';
  const tmp=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'tethys-step-')),'bundle.js');fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
  const log=console.log;console.log=()=>{};console.warn=()=>{};require('./stub.js');require(tmp);const S=global.__S;
  global.__FRAME_MS=1000/60;
  for(let i=0;i<3000&&!S.BOOT.done;i++)__step(1);
  S.startNew(S.CLADES[1]);
  let quiet=0,n0=-1,k=0;for(;k<3000&&quiet<90;k++){__step(1);const n=S.chunks.size;quiet=n===n0?quiet+1:0;n0=n;}
  const ready=!!S.CHEMO_B&&quiet>=90;
  global.__FRAME_MS=fm;const s0=S.simSteps,t0=S.t;let frames=0,per=new Map();
  while(S.simSteps-s0<N&&frames<10000){const a=S.simSteps;__step(1);frames++;const d=S.simSteps-a;per.set(d,(per.get(d)||0)+1);}
  let h=2166136261>>>0,n=0;const mix=v=>{const q=String(v);for(let i=0;i<q.length;i++){h^=q.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}};
  for(const c of S.creatures){if(!c.alive)continue;n++;mix(c.kind);mix(c.state);mix(c.pos.x);mix(c.pos.y);mix(c.pos.z);mix(c.vel.x);mix(c.vel.y);mix(c.vel.z);mix(c.g.quaternion.x);mix(c.g.quaternion.w);}
  const P=S.player;mix(P.pos.x);mix(P.pos.y);mix(P.pos.z);mix(P.vel.y);
  // the drawing between steps, and back: a creature drawn moves between its two poses, and the render's end puts the step's back
  let lerpOk=null;{const c=S.creatures.find(c=>c.alive&&c.g.visible&&c.vel.lengthSq()>0.01);if(c){const x=c.g.position.x,qw=c.g.quaternion.w;S.lerpApply(0.5);const mid=c.g.position.x;S.lerpRestore();lerpOk=c.g.position.x===x&&c.g.quaternion.w===qw&&mid!==x;}}
  log(JSON.stringify({h:h.toString(16),n:n,steps:S.simSteps-s0,frames:frames,per:[...per.entries()].sort((a,b)=>a[0]-b[0]),dt:+(S.t-t0).toFixed(9),ready:ready,cells:S.chunks.size,lerpOk:lerpOk,mode:S.mode}));process.exit(0);}
const run=fm=>{const r=cp.spawnSync(process.execPath,[__filename,'--child',String(fm)],{encoding:'utf8',maxBuffer:1<<26});const line=(r.stdout||'').trim().split('\n').pop();try{return JSON.parse(line);}catch(e){return {h:'error: '+(r.stderr||'').slice(0,400),n:0,per:[]};}};
const R={30:run(1000/30),60:run(1000/60),144:run(1000/144)};let fails=0;const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++;};
for(const hz of [30,60,144]){const r=R[hz];ok(r.ready&&r.mode==='play'&&r.steps===N&&Math.abs(r.dt-N/60)<1e-6,hz+' Hz: '+r.cells+' cells loaded and the flood built first; '+r.steps+' steps in '+r.frames+' frames (steps a frame: '+r.per.map(x=>x[0]+'×'+x[1]).join(', ')+'), the clock on by '+r.dt+' s');}
ok(R[30].per.length===1&&R[30].per[0][0]===2&&R[60].per.length===1&&R[60].per[0][0]===1&&R[144].per.every(x=>x[0]<=1),'two steps a frame at 30 Hz, one at 60, none or one at 144');
ok(R[60].n>50&&R[30].h===R[60].h&&R[144].h===R[60].h&&R[30].n===R[60].n&&R[144].n===R[60].n,'every creature ('+R[60].n+') and the player the same to the bit at 30, 60 and 144 Hz: '+R[30].h+' / '+R[60].h+' / '+R[144].h);
ok(R[60].lerpOk===true,'a creature drawn halfway between its last two steps, and the step\'s pose back after the render');
console.log(fails?fails+' FAILED':'step: ok');process.exit(fails?1:0);
