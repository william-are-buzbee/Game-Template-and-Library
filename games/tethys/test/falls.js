// test/falls.js — carcass falls (v11.99, DEEP.md §4; creatures_ai.js FALL, FALLS): the whole game against the stub, as test/live.js boots it.
// A big body killed in sight is a fall; its flesh follows the record's clock (1-3 game days by size) and what eats at it; spent, its bones are a
// mesh with the enriched patch and the mats by their stages; the record outlives its cell (unloaded, reloaded: the carcass back with the flesh
// the clock left); the save carries it; the ledger's off-screen dead of the big mortal kinds fall on the floor; the floor buries the old.
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
let js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n');
js+='\nglobal.__peak=()=>{player.pos.set(0,dispY,0);cellsAround();};';
js+='\nglobal.__day=(hours,step)=>{for(let h=0;h<hours;h+=step){clockH+=step;POP.acc=ECO_STEP;ecoTick(ECO_STEP);let g=0;while(POP.model&&g++<5000)ecoTick(0);}};';
js+='\nglobal.__skip=d=>{t+=d*DAY_S;clockH=t*CLOCK_RATE;TIDE=tideAt(clockH);};'; // the world clock on, as skip() does in play (the frame loop sets clockH from t)
js+='\nglobal.__X={get FALLS(){return FALLS;},FALL,fallState,fallsOut,fallsIn,fallsTick,fallScavDays,kill,spawn,unloadChunk,groundAt,cellOf,sample,nowD,carcasses,chunks,mulberry,V3:(x,y,z)=>new THREE.Vector3(x,y,z),'
  +'addH:h=>{clockH+=h;},get DAY_H(){return DAY_H;},chunkAt:(x,z)=>chunks.get(ckey(cellOf(x),cellOf(z))),bioMass:k=>bioMass(DEFS[k]),DEFS,SPAWN,ecoOf};';
const tmp=path.join(require('os').tmpdir(),'tethys_falls.js');
fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
process.env.PICK='1';
require('./stub.js');
require(tmp);
const X=__X;let fails=0;const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++;};
__peak();__step(600);
const n0=X.FALLS.length;
// ---- 1. a fall in sight: a ridge killed 40 m from the peak ----
const px=40,pz=0,ch=X.chunkAt(px,pz);ok(!!ch,'the cell 40 m east of the peak is loaded');
const g0=X.groundAt(px,pz),r=X.spawn(ch,'ridge',X.V3(px,g0+6,pz),X.mulberry(3),{ent:-1});X.kill(r,null);
const F=X.FALLS[X.FALLS.length-1];
ok(r.fall===F&&F.kind==='ridge'&&F.c===r&&Math.abs(F.flesh-X.bioMass('ridge'))<1e-6,`a ridge (${X.DEFS.ridge.size} m) killed in sight is a fall: its record holds the carcass and its flesh (${F.flesh.toFixed(1)})`);
__step(900);
ok(Math.abs(F.y-(X.groundAt(F.x,F.z)+X.DEFS.ridge.size*0.3))<0.5&&Math.abs(F.y-r.pos.y)<0.05,`it sank and lies on the floor (record y ${F.y.toFixed(1)}, ground ${g0.toFixed(1)}: a body rests 0.3 of its size over it)`);
const sd=X.fallScavDays(F);ok(Math.abs(sd-(1+2*(9-5)/10))<1e-9,`the scavengers' days for 9 m: ${sd.toFixed(2)} (1 for 5 m, 3 for 15)`);
const fl0=F.flesh;__skip(0.5);__step(2);
ok(F.flesh<fl0&&F.flesh>0&&r.flesh===F.flesh,`half a game day on: the flesh ${fl0.toFixed(1)} → ${F.flesh.toFixed(1)} (the clock's ${(fl0-F.m0*0.5/sd).toFixed(1)} or less, with the scavengers')`);
__skip(2);__step(2);
ok(!X.carcasses.includes(r)&&F.c===null&&F.flesh===0,'two days more: the flesh is gone and the carcass with it');
ok(!!F.mesh&&F.ch===ch,'its bones are a mesh in the cell');
const tB=F.tB,st=t=>X.fallState(F,tB+t);
ok(st(0.1).rich>0&&st(5).rich>0.9&&st(12).rich===0,`the enriched patch: ${st(0.1).rich.toFixed(2)} at once, ${st(5).rich.toFixed(2)} at day 5, gone by 12`);
ok(st(1).mat===0&&st(8).mat===1&&st(45).mat===0,`the mats: none at day 1, full at 8, gone by 45 (the person's ~40)`);
ok(!st(140).gone&&st(160).gone||F.apron&&st(70).gone,`the bones lie until buried: ${F.apron?'60 days on an apron':'150 on the ooze'}`);
// ---- 2. a fall outlives its cell ----
const qx=80,qz=-30,ch2=X.chunkAt(qx,qz),a=X.spawn(ch2,'abyssal',X.V3(qx,X.groundAt(qx,qz)+10,qz),X.mulberry(5),{ent:-1});X.kill(a,null);const G=a.fall;__step(300);
const before=G.flesh;X.unloadChunk(ch2);
ok(G.c===null&&G.flesh===before&&!X.carcasses.includes(a),`its cell unloaded: the record keeps the flesh (${before.toFixed(1)}), the carcass is gone`);
__skip(0.5);__step(900);
const ch3=X.chunkAt(qx,qz);ok(!!ch3&&!!G.c&&X.carcasses.includes(G.c),'its cell back: the carcass is back where it lay');
ok(G.c&&G.c.flesh<before&&G.c.flesh>0&&Math.abs(G.c.flesh-(before-G.m0*0.5/X.fallScavDays(G)))<G.m0*0.02,`with the flesh the clock left (${G.c?G.c.flesh.toFixed(1):'-'}; the abyssal ${X.fallScavDays(G).toFixed(1)} days)`);
// ---- 3. the save ----
const out=JSON.parse(JSON.stringify(X.fallsOut())),keep=X.FALLS.length;X.fallsIn(out);
ok(X.FALLS.length===keep&&X.FALLS.every((H,i)=>H.kind===out[i].kind&&Math.abs(H.x-out[i].x)<1e-3&&H.flesh===out[i].flesh),`the save carries ${keep} falls and brings them back`);
X.fallsIn([{kind:'nobody',x:0},{kind:'ridge',x:'NaN'}]);ok(X.FALLS.length===0,'a hand-edited save cannot put in a kind that is not or a NaN');X.fallsIn(out);
// ---- 4. the ledger's dead off-screen ----
const big=[...new Set(X.SPAWN.filter(e=>{const d=X.DEFS[e.kind];return d&&d.size>=X.FALL.size&&d.role!=='swarm'&&!d.ghost&&X.ecoOf(e.kind).mortal;}).map(e=>e.kind))];
const t4=X.nowD(),k4=X.FALLS.length;__day(60,0.05);
const off=X.FALLS.filter(H=>H.t0>t4+1e-9&&!H.c);
ok(off.length>0&&off.every(H=>big.includes(H.kind)),`two game days of the model: ${off.length} falls off-screen, all of big mortal kinds (${[...new Set(off.map(H=>H.kind))].join(', ')}) — the kinds that can fall: ${big.join(', ')}`);
ok(off.every(H=>Math.abs(H.y-(X.sample(H.x,H.z).h+X.DEFS[H.kind].size*0.3))<0.01),'each on the floor where it fell');
// ---- 5. the floor buries ----
const old=X.FALLS[0];old.flesh=0;old.tB=X.nowD()-200;X.fallsTick();
ok(!X.FALLS.includes(old),'bones 200 days down are buried and the record goes');
console.log(`\n  falls now ${X.FALLS.length} (at boot ${n0}); FALL.max ${X.FALL.max}`);
console.log(fails?`falls: ${fails} FAILED`:'falls: ok');process.exit(fails?1:0);
