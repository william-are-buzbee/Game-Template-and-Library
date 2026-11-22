// test/simrand.js — the sim's own randomness (v11.209, util.js SIMR; analysis_project.md §7): the game booted against the stub and a new game played 600
// frames in two processes — one with Math.random seeded 1, the other seeded 2 and drawn three times more every frame, as a screen drawing more particles
// would — and every creature and the player must come out the same to the bit. Math.random is the eye candy's; anything a creature does that still drew from
// it breaks this. In --test (build.js SIDE).
'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
if(process.argv[2]==='--child'){const seed=+process.argv[3],extra=+process.argv[4];
  const ROOT=path.join(__dirname,'..');
  const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
  const js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n')+'\nglobal.__S={creatures,player,startNew,CLADES,BOOT,get mode(){return mode;}};';
  const tmp=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'tethys-simrand-')),'bundle.js');fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
  const log=console.log;console.log=()=>{};console.warn=()=>{};require('./stub.js');
  let s=seed>>>0;Math.random=()=>{s=(s+0x6D2B79F5)>>>0;let z=s;z=Math.imul(z^(z>>>15),z|1);z^=z+Math.imul(z^(z>>>7),z|61);return ((z^(z>>>14))>>>0)/4294967296;}; // a mulberry32 of its own: the eye candy's stream
  require(tmp);const S=global.__S;
  for(let i=0;i<3000&&!S.BOOT.done;i++)__step(1);
  S.startNew(S.CLADES[1]);
  for(let i=0;i<600;i++){for(let k=0;k<extra;k++)Math.random();__step(1);}
  let h=2166136261>>>0,n=0;const mix=v=>{const q=String(v);for(let i=0;i<q.length;i++){h^=q.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}};
  for(const c of S.creatures){if(!c.alive)continue;n++;mix(c.kind);mix(c.state);mix(c.pos.x);mix(c.pos.y);mix(c.pos.z);mix(c.vel.x);mix(c.vel.z);mix(c.g.quaternion.w);}
  const P=S.player;mix(P.pos.x);mix(P.pos.y);mix(P.pos.z);
  log(JSON.stringify({h:h.toString(16),n:n,mode:S.mode}));process.exit(0);}
const run=(seed,extra)=>{const r=cp.spawnSync(process.execPath,[__filename,'--child',String(seed),String(extra)],{encoding:'utf8',maxBuffer:1<<26});const line=(r.stdout||'').trim().split('\n').pop();try{return JSON.parse(line);}catch(e){return {h:'error: '+(r.stderr||'').slice(0,400),n:0};}};
const A=run(1,0),B=run(2,3);let fails=0;const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++;};
ok(A.n>50&&A.mode==='play','a new game played 600 frames: '+A.n+' creatures alive');
ok(A.h===B.h&&A.n===B.n,'Math.random seeded 2 and drawn three times more a frame: every creature and the player the same ('+A.h+' / '+B.h+')');
console.log(fails?fails+' FAILED':'simrand: ok');process.exit(fails?1:0);
