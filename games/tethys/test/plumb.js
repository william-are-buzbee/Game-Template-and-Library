// test/plumb.js — the plumb, the stations and a gas shell's floor (v11.223; CLADES.md, The radiation). The stations score a wall and still
// water and the ledger weighs a cell's capacity by them; a wall cell's plumb stands at a wall; it hangs nose-down, rides the swarm's layer
// (deeper by day), strikes only at what is under it and lets go of what rises above it; and a gas-chambered body (derive's deepY) never goes
// under −450, nor goes for what is there. The whole bundle against the stub, as test/combat.js.
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
let js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n');
js+='\nglobal.__pl={CLADES,NCELL,CELL,HALF,FI,STATION,HANG,DEFS,SPAWN,SKY,POP,stationW,gridRise,stationPoint,envW,sample,ecoCap,ecoId,swarmDepth,plumbY,chunkIJ,loadChunkNow,cellOf,groundAt,creatures,player,spawn,removeCreature,placeKind,findPrey,updateCreatures,updatePlayer,finishPlayer,get bodies(){return bodies;},get mode(){return mode;},choose,faceQ,V3,mulberry,setT(v){t=v;},get t(){return t;}};';
const tmp=path.join(require('os').tmpdir(),'tethys_plumb.js');
fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
process.env.PICK='0';
require('./stub.js');require(tmp);
const X=global.__pl;let fails=0;
Math.random=X.mulberry(23);
function check(ok,msg){if(!ok){fails++;console.error('  FAIL '+msg);}else console.log('  ok   '+msg);}
const dt=1/60,D=X.DEFS.plumb,ei=X.SPAWN.findIndex(e=>e.kind==='plumb'),E=X.SPAWN[ei];
function frames(n,each){for(let i=0;i<n;i++){X.setT(X.t+dt);if(X.mode==='play')X.updatePlayer(dt);X.updateCreatures(dt);if(X.mode==='play')X.finishPlayer(dt,X.bodies);if(each&&each(i))return i;}return -1;} // one frame of the game's creature path, as test/combat.js's
const hold=()=>{X.player.vel.set(0,0,0);}; // the player kept where a check puts it
const down=c=>{const q=c.g.quaternion,z=X.V3(0,0,1).applyQuaternion(q);return -z.y;}; // the body's +z (its arms' way) against straight down: 1 is plumb

// ---- 1. the stations, by hand ----
console.log('the stations');
check(D.deepY===-450,'the plumb is gas-chambered: derive gives it the shell\'s floor, −450 (deepY '+D.deepY+')');
check(X.DEFS.ortho.deepY===-450&&X.DEFS.ridge.deepY===undefined,'so is the ortho; a slowblood has none');
check(X.stationW(D.station,-200,0,36,0.1,D.deepY)===0,'flat ground is no wall');
check(X.stationW(D.station,-200,34,36,0.1,D.deepY)>0.99,'a 34 m face over 36 m in still water is a full station');
check(X.stationW(D.station,-200,34,36,0.6,D.deepY)===0,'the same face in a current is none (a hung body is a mast)');
check(X.stationW(D.station,-520,40,36,0.1,D.deepY)===0,'a face that tops out under −450 + reach is none (the plumb could not hang beside it)');
check(X.gridRise([0,0,0,0,-30,0,0,0,0],3,4)===30&&X.gridRise([0,0,0,0,30,0,0,0,0],3,4)===0,'gridRise: the rise to the highest neighbour, none on a summit');

// ---- 2. the ledger: a wall cell holds plumbs, a flat one none ----
console.log('the ledger');
const cellW=(i,j)=>{const x0=i*X.CELL-X.HALF,z0=j*X.CELL-X.HALF,hs=[],fs=[];for(let b=0;b<6;b++)for(let a=0;a<6;a++){const s=X.sample(x0+(a+0.5)/6*X.CELL,z0+(b+0.5)/6*X.CELL);hs.push(s.h);fs.push(s.f);}
  let w=0,flat=true;for(let n=0;n<36;n++){const r=X.gridRise(hs,6,n);if(r>3)flat=false;let t=X.envW(E.env,hs[n],0,fs[n]);if(t>0)t*=X.stationW(D.station,hs[n],r,X.CELL/6,fs[n][X.FI.flow],D.deepY);w+=t;}return {w:w,flat:flat,deep:Math.min(...hs)};};
let wall=null,flat=null;const c0=X.cellOf(0);
for(let r=1;r<40&&!(wall&&flat);r++)for(let a=0;a<r*8&&!(wall&&flat);a++){const ang=a/(r*8)*Math.PI*2,i=c0+Math.round(Math.cos(ang)*r),j=c0+Math.round(Math.sin(ang)*r);if(i<0||j<0||i>=X.NCELL||j>=X.NCELL)continue;
  const q=cellW(i,j);if(!wall&&q.w>2)wall={i:i,j:j,w:q.w};if(!flat&&q.flat&&q.deep<-40&&q.deep>-400)flat={i:i,j:j};}
check(!!wall,'a cell with a wall in still water is found near the start'+(wall?' ('+wall.i+', '+wall.j+'; '+wall.w.toFixed(1)+' of 36 points)':''));
check(!!flat,'and a flat wet one');
if(wall&&flat){for(const q of [wall,flat]){const c=X.ecoId(q.i,q.j);X.ecoCap(c,null);q.K=X.POP.k[ei][c];}
  check(wall.K>0,'the ledger gives the wall cell plumbs (capacity '+wall.K.toFixed(3)+')');
  check(flat.K===0,'and the flat cell none');}

// ---- 3. the placing: at a wall, sitting, nose-down ----
console.log('the placing');
X.choose(1);X.player.pos.set(1e4,-30,1e4);
let P=null;
if(wall){X.loadChunkNow(wall.i,wall.j);const ch=X.chunkIJ(wall.i,wall.j);for(const c of X.creatures.slice())if(c.kind==='plumb')X.removeCreature(c);
  const g=X.placeKind(ch,E,1,X.mulberry(5),{ent:-1});let r=g.next();while(!r.done)r=g.next();P=X.creatures.find(c=>c.kind==='plumb');
  check(r.value===1&&!!P,'placeKind stands one at the wall cell');
  if(P){const fl=X.groundAt(P.home.x,P.home.z),w=P.wallD,up=X.groundAt(P.home.x+w.x*X.CELL/6,P.home.z+w.z*X.CELL/6)-fl;
    check(up>12,'the wall rises '+up.toFixed(0)+' m within 36 m of its station, the way wallD says');
    check(P.state==='sit'&&P.pos.y>=fl+D.clear+D.size*X.HANG.gap-0.01&&P.pos.y>=-450&&P.pos.y<=-(D.size*X.HANG.above+X.HANG.surf)+0.01,'it hangs between its arms\' reach and HANG.gap × size over the floor and its shell\'s length under the surface ('+P.pos.y.toFixed(0)+' over a floor at '+fl.toFixed(0)+')');
    check(down(P)>0.98,'placed nose-down (cos '+down(P).toFixed(3)+')');}}

// ---- 4. hanging, and the layer ----
console.log('the hang and the layer');
if(P){for(const c of X.creatures.slice())if(c!==P)X.removeCreature(c); // the cell's own animals out: the checks below are the plumb's and the player's alone
  P.hunger=0;P.cool=1e9;const x0=P.home.x,z0=P.home.z;const away=()=>{X.player.pos.set(P.pos.x-P.wallD.x*150,Math.min(-20,P.pos.y),P.pos.z-P.wallD.z*150);hold();}; // in reach of the loop's update (360 m), out of its strike
  away();
  X.SKY.dayK=1;frames(60*3,()=>{away();});const dayY=P.home.y,x1=P.pos.x,z1=P.pos.z;
  check(down(P)>0.98,'it hangs plumb (cos '+down(P).toFixed(3)+'), swaying a few degrees');
  let path=0,far=0,lo=1,hi=-1;const q=X.V3();q.copy(P.pos);frames(60*30,()=>{away();path+=P.pos.distanceTo(q);q.copy(P.pos);far=Math.max(far,Math.hypot(P.pos.x-x0,P.pos.z-z0));const c=down(P);lo=Math.min(lo,c);});
  check(path>1&&far<X.HANG.drift[0]+4,'it is never still and never leaves its station: '+path.toFixed(1)+' m wandered in 30 s, at most '+far.toFixed(1)+' m off it');
  check(lo>0.97,'it sways but stays upright (the least cos '+lo.toFixed(3)+')');
  P.vel.set(3,0,0);frames(2,()=>{away();});const pushed=P.pos.x;frames(60*20,()=>{away();});
  check(Math.hypot(P.pos.x-x0,P.pos.z-z0)<X.HANG.drift[0]+4,'a push moves it and it drifts back');
  X.SKY.dayK=0;X.SKY.moonL=0;let maxV=0;frames(60*40,()=>{away();maxV=Math.max(maxV,Math.abs(P.vel.y));});const nightY=P.home.y;
  check(nightY>dayY+5,'its station rises at night with the swarm\'s layer (day '+dayY.toFixed(0)+', night '+nightY.toFixed(0)+')');
  check(maxV<=X.HANG.rise*1.1,'by buoyancy, at about '+X.HANG.rise+' m/s at most ('+maxV.toFixed(2)+'; the water\'s own drift on top)');
  check(Math.abs(P.pos.y-nightY)<Math.abs(dayY-nightY),'and climbs toward it');}

// ---- 5. the strike: only down ----
console.log('the strike');
if(P){X.SKY.dayK=1;P.scanT=0;for(let i=0;i<60*300&&(i<30||Math.abs(P.pos.y-P.home.y)>0.5);i++)frames(1,()=>{X.player.pos.set(P.pos.x-P.wallD.x*150,Math.min(-20,P.pos.y),P.pos.z-P.wallD.z*150);hold();}); // back down to its day station
  P.hunger=0.9;P.cool=0;P.scanT=0;P.state='sit';
  X.player.pos.set(P.pos.x+P.wallD.x*-12,P.pos.y,P.pos.z+P.wallD.z*-12);X.player.vel.set(0,0,0);
  const lv=frames(60*3,()=>{hold();return P.state==='lunge';});
  check(lv<0,'the player level with it 12 m off: no strike');
  P.state='sit';P.scanT=0;X.player.pos.set(P.pos.x+P.wallD.x*-3,P.pos.y-12,P.pos.z+P.wallD.z*-3);
  const at=frames(60*2,()=>{hold();return P.state==='lunge';});
  check(at<0||P.target===X.player,'its target is the player');
  check(at>=0,'the player 12 m under it: it strikes'+(at>=0?' ('+(at/60).toFixed(2)+' s)':''));
  if(at>=0){X.player.pos.y=P.pos.y+20;const let_=frames(60*2,()=>P.state!=='lunge');check(let_>=0,'and lets go when the player rises over it');}}

// ---- 6. a gas shell's floor ----
console.log('a gas shell\'s floor');
{const ch=wall?X.chunkIJ(wall.i,wall.j):null;let dx=0,dz=0;for(let r=500;r<20000&&!dx;r+=250)for(let a=0;a<32;a++){const x=Math.cos(a/32*Math.PI*2)*r,z=Math.sin(a/32*Math.PI*2)*r;if(X.groundAt(x,z)<-900){dx=x;dz=z;break;}} // over water deeper than −900
  check(!!dx,'a place over deep water is found');
  if(ch&&dx){const o=X.spawn(ch,'ortho',X.V3(dx,-440,dz),Math.random,{ent:-1}),pk=X.spawn(ch,'picker',X.V3(dx,-600,dz),Math.random,{ent:-1});
  X.player.pos.set(o.pos.x+60,-60,o.pos.z);hold();const rd=X.spawn(ch,'ridge',X.V3(dx+30,-440,dz),Math.random,{ent:-1});o.hunger=0;rd.hunger=0;o.cool=rd.cool=1e9;let low=0,lowR=0;
  o.pos.y=rd.pos.y=-480;o.vel.y=rd.vel.y=-3;frames(4,()=>{hold();low=o.pos.y;lowR=rd.pos.y;}); // four steps: past 150 m from the player a body moves every other one // both put under the line, sinking
  check(low>=-450-1e-6,'an ortho put under −450 is back at it the next step ('+low.toFixed(1)+')');
  check(lowR<-470,'a ridge put there stays (no gas in it: '+lowR.toFixed(1)+')');X.removeCreature(rd);
  o.state='wander';o.target=null;o.pos.y=-440;check(X.findPrey(o,400)!==pk,'and does not go for it');X.removeCreature(o);X.removeCreature(pk);}}

// ---- 7. the player's gas shell (v11.223.1: the coilshell held above −450 as every chambered body is) ----
console.log('the player\'s gas shell');
{let dx=0,dz=0;for(let r=500;r<20000&&!dx;r+=250)for(let a=0;a<32;a++){const x=Math.cos(a/32*Math.PI*2)*r,z=Math.sin(a/32*Math.PI*2)*r;if(X.groundAt(x,z)<-900){dx=x;dz=z;break;}}
  for(const id of ['coil','soft']){const ci=X.CLADES.findIndex(C=>C.id===id);X.choose(ci);const P2=X.player;P2.pos.set(dx,-420,dz);P2.vel.set(0,-12,0);let low=0;
    for(let i=0;i<60*4;i++){P2.vel.y=Math.min(P2.vel.y,-12);frames(1);low=Math.min(low,P2.pos.y);} // driven down every step
    if(id==='coil')check(X.CLADES[ci].deepY===-450&&low>=-450-1e-6,'the coilshell driven down at 12 m/s for 4 s stops at −450 (lowest '+low.toFixed(1)+')');
    else check(X.CLADES[ci].deepY===undefined&&low<-460,'the soft-arm, no gas in it, goes on ('+low.toFixed(0)+')');}}

if(fails){console.error('plumb: '+fails+' FAILED');process.exit(1);}console.log('plumb: ok');
