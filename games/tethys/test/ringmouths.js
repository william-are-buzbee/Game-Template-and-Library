// test/ringmouths.js — the ringmouths' pass (v11.230; BEHAVIOUR.md §4). The plumb's night: at its wall cell, hungry at a moonless midnight with nothing
// under it, it leaves its post to forage (PLUMB) — away from its station, never under its shell's floor, leaning into its way — goes up a carcass's scent
// to eat at it, and at noon goes home to its wall; the trim (an old giant keeps to its day depth while a young one rises with the layer); the quill's
// stand (one phase; down into the stalks and still when the player comes close, striking nothing); the arrows' pack (an idle packmate joins a hunt and
// comes in from its own side) and their ink (held, a cloud: unseen, the holder slipping, the arrow off); the lurker giving up a post where nothing
// passes. The whole bundle against the stub, as test/plumb.js. `node test/ringmouths.js`.
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
let js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n');
js+='\nglobal.__rm={CK,clockTick,PLUMB,QUILL,PACK,INK,LURK,HANG,REST,DEFS,SPAWN,CELL,HALF,NCELL,FI,sample,envW,gridRise,stationW,ecoId,ecoCap,POP,trimOf,phaseOf,plumbY,sightOf,currentAt,'
  +'updatePlayer,finishPlayer,get bodies(){return bodies;},get mode(){return mode;},spawn,removeCreature,creatures,schools,makeSchool,placeKind,loadChunkNow,chunkIJ,cellOf,groundAt,player,choose,faceQ,V3,mulberry,kill,holds,startHold,releaseHold,updateCreatures,updateSchools,'
  +'at(x,z){player.pos.set(x,-30,z);cellsAround();},get t(){return t;},setT(v){t=v;},setClock(h){clockH=h;TIDE=tideAt(h);clockTick();}};';
const tmp=path.join(require('os').tmpdir(),'tethys_ringmouths_'+process.pid+'.js');
fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
process.env.PICK='0';
require('./stub.js');require(tmp);fs.unlinkSync(tmp);
const X=global.__rm;let fails=0;
Math.random=X.mulberry(41);
function check(ok,msg){if(!ok){fails++;console.error('  FAIL '+msg);}else console.log('  ok   '+msg);}
const dt=1/60,P=X.player,D=X.DEFS;
function frames(n,each){for(let i=0;i<n;i++){X.setT(X.t+dt);if(X.mode==='play')X.updatePlayer(dt);X.updateSchools(dt);X.updateCreatures(dt);if(X.mode==='play')X.finishPlayer(dt,X.bodies);if(each&&each(i))return i;}return -1;} // the game's creature path, the player's own step in it (its shapes for the contact), as test/plumb.js's
const hold=()=>{P.vel.set(0,0,0);};
let noon=0,hi=-2,dark=-1;for(let h=0;h<600;h+=0.05){X.setClock(h);if(h<30&&X.CK.sun>hi){hi=X.CK.sun;noon=h;}if(dark<0&&X.CK.night>0.99&&X.CK.moonK<0.002)dark=h;}
X.choose(1);P.dead=false;P.pos.set(1e4,-30,1e4);

// ---- 1. the plumb's night: a wall cell (test/plumb.js's search), a plumb placed at its station ----
console.log('the plumb\'s night');
const E=X.SPAWN[X.SPAWN.findIndex(e=>e.kind==='plumb')];
const cellW=(i,j)=>{const x0=i*X.CELL-X.HALF,z0=j*X.CELL-X.HALF,hs=[],fs2=[];for(let b=0;b<6;b++)for(let a=0;a<6;a++){const s=X.sample(x0+(a+0.5)/6*X.CELL,z0+(b+0.5)/6*X.CELL);hs.push(s.h);fs2.push(s.f);}
  let w=0;for(let n=0;n<36;n++){const r=X.gridRise(hs,6,n);let tt=X.envW(E.env,hs[n],0,fs2[n]);if(tt>0)tt*=X.stationW(D.plumb.station,hs[n],r,X.CELL/6,fs2[n],D.plumb.deepY);w+=tt;}return w;};
let wall=null;const c0=X.cellOf(0);for(let r=1;r<40&&!wall;r++)for(let a=0;a<r*8&&!wall;a++){const ang=a/(r*8)*Math.PI*2,i=c0+Math.round(Math.cos(ang)*r),j=c0+Math.round(Math.sin(ang)*r);if(i<0||j<0||i>=X.NCELL||j>=X.NCELL)continue;if(cellW(i,j)>2)wall={i,j};}
let Pl=null,ch=null;
if(wall){X.loadChunkNow(wall.i,wall.j);ch=X.chunkIJ(wall.i,wall.j);for(const c of X.creatures.slice())X.removeCreature(c);const g=X.placeKind(ch,E,1,X.mulberry(5),{ent:-1});let r=g.next();while(!r.done)r=g.next();Pl=X.creatures.find(c=>c.kind==='plumb');}
check(!!Pl,'a plumb at a wall cell'+(wall?' ('+wall.i+', '+wall.j+')':''));
if(Pl){const away=()=>{P.pos.set(Pl.pos.x+300,-30,Pl.pos.z);hold();};away();X.setClock(dark);Pl.hunger=0.7;Pl.cool=0;Pl.scanT=0;
  const st0=Pl.home.clone();const k=frames(60*30,()=>{away();return Pl.state==='forage';});
  check(k>=0&&k/60>X.PLUMB.wait-1,'hungry at a moonless midnight, nothing under it, it waits '+(k/60).toFixed(1)+' s at its post and leaves it to forage');
  let far=0,lo=1e9,lean=0,n=0;frames(60*60,()=>{away();far=Math.max(far,Math.hypot(Pl.pos.x-st0.x,Pl.pos.z-st0.z));lo=Math.min(lo,Pl.pos.y);if(Pl.vel.length()>0.2){n++;const z=X.V3(0,0,1).applyQuaternion(Pl.g.quaternion);if(z.x*Pl.vel.x+z.z*Pl.vel.z>0)lean++;}});
  check(Pl.state==='forage'&&far>15&&far<X.PLUMB.range+20,'it forages off the wall: '+far.toFixed(0)+' m from its station at the most in a minute ('+Pl.state+')');
  check(lo>=-450,'and never under its shell\'s floor (its lowest '+lo.toFixed(0)+')');
  check(n>0&&lean>n*0.7,'leaning into its way ('+(100*lean/Math.max(1,n)).toFixed(0)+'% of its moving frames)');
  // carrion up its scent: a grazer's carcass on the floor down the current of it, within its nose
  const cu=X.currentAt(Pl.pos.x,Pl.pos.z,Pl.pos.y,X.V3()),cl=Math.hypot(cu.x,cu.z)||1;let cx=Pl.pos.x-cu.x/cl*60,cz=Pl.pos.z-cu.z/cl*60; // up the current of it: the scent comes down to it
  if(X.groundAt(cx,cz)<-445||X.groundAt(cx,cz)>-20){cx=Pl.pos.x+20;cz=Pl.pos.z;}
  const gz=X.spawn(ch,'grazer',X.V3(cx,X.groundAt(cx,cz)+1,cz),Math.random,{ent:-1});X.kill(gz,null);const f0=gz.flesh;Pl.scavT=0;
  const at=frames(60*240,()=>{away();return Pl.state==='feed'&&gz.flesh<f0*0.99;});
  check(at>=0,'it smells a carcass 60 m up the current and goes to eat at it ('+(at>=0?(at/60).toFixed(0)+' s':'not reached: '+Pl.state+', '+Pl.pos.distanceTo(gz.pos).toFixed(0)+' m off')+')');
  X.setClock(noon);const back=frames(60*240,()=>{away();return Pl.state==='sit'&&Math.hypot(Pl.pos.x-st0.x,Pl.pos.z-st0.z)<3;});
  check(back>=0,'at noon it is home at its wall ('+(back>=0?(back/60).toFixed(0)+' s':'not: '+Pl.state)+')');
  // the trim: an old giant keeps to its day depth
  X.setClock(dark);const fl=X.groundAt(st0.x,st0.z),yY=(Pl.k=1,X.plumbY(D.plumb,fl,Pl)),yO=(Pl.k=1.5,X.plumbY(D.plumb,fl,Pl));X.setClock(noon);const yD=(Pl.k=1,X.plumbY(D.plumb,fl,Pl));Pl.k=1;
  check(yY>yD+5&&Math.abs(yO-yD)<1,'at night a typical plumb\'s station rises with the layer ('+yD.toFixed(0)+' → '+yY.toFixed(0)+'), an old one\'s (size factor 1.5) stays at its day depth ('+yO.toFixed(0)+')');
  check(X.trimOf({k:1})===1&&X.trimOf({k:1.5})===0,'the trim: all of the layer at 1, none at 1.5');}

// ---- 2. the quill's stand (the weed at 330, 0) ----
console.log('the quill\'s stand');
for(const c of X.creatures.slice())X.removeCreature(c);X.schools.length=0;X.at(330,0);let wx=null;
for(let r=0;r<200&&!wx;r+=10)for(let a=0;a<16&&!wx;a++){const x=330+Math.cos(a*0.39)*r,z=Math.sin(a*0.39)*r,h=X.groundAt(x,z);if(h<-25&&h>-50)wx=[x,z];}
check(!!wx,'a place in the weed\'s depths near (330, 0)');
if(wx){X.setClock(noon);const wch=X.chunkIJ(X.cellOf(wx[0]),X.cellOf(wx[1])),bx=Math.floor(wx[0]/6)*6+3,bz=Math.floor(wx[1]/6)*6+3,fl=X.groundAt(bx,bz);
  const q=[0,1,2].map(i=>{const c=X.spawn(wch,'quill',X.V3(bx+(i-1)*1.2,fl+8,bz),Math.random,{ent:-1});c.state='sit';c.t0=10+i*30.3;c.home.copy(c.pos);c.home.y=X.plumbY(D.quill,fl,c);c.hunger=0;c.cool=1e9;return c;});
  check(X.phaseOf(q[0])===X.phaseOf(q[1])&&X.phaseOf(q[1])===X.phaseOf(q[2])&&X.phaseOf(q[0])!==q[0].t0,'three quills of a stand share one phase (they sway and drift as one)');
  P.pos.set(bx+60,fl+6,bz);hold();frames(60*8,()=>{P.pos.set(bx+60,fl+6,bz);hold();});const y0=q.map(c=>c.pos.y);
  const hid=frames(60*12,()=>{P.pos.set(bx+3,fl+6,bz);P.vel.set(1.6,0,0);}); /* 3 m: in the weed the player is covered, and a quill's eyes see it there within ~4 m (the senses) */const dy=q.map((c,i)=>y0[i]-c.pos.y);
  check(q.every(c=>c.waitT>0)&&dy.every(v=>v>1.5),'the player swimming 3 m off: the stand slips down into the stalks ('+dy.map(v=>v.toFixed(1)).join(', ')+' m down)');
  q[0].hunger=1;q[0].cool=0;const dit=X.makeSchool(wch,'darter',X.V3(q[0].pos.x,q[0].pos.y-3,q[0].pos.z),1,Math.random,{ent:-1});while(!dit.next().done);const dsc=X.schools[X.schools.length-1];dsc.t=1e9;dsc.scanT=1e9;const dr=dsc.members[0];
  const lg=frames(60*1,()=>{P.pos.set(bx+3,fl+6,bz);P.vel.set(1.6,0,0);dr.pos.set(q[0].pos.x,q[0].pos.y-3,q[0].pos.z);return q[0].state==='lunge';});
  check(lg<0,'and, hiding, takes nothing (a darter 3 m under one, starving)');X.removeCreature(dr);X.schools.length=0;
  for(const c of q)X.removeCreature(c);}

// ---- 3. the arrows' pack and their ink ----
console.log('the arrows');
if(wx){X.setClock(dark);const wch=X.chunkIJ(X.cellOf(wx[0]),X.cellOf(wx[1])),fl=X.groundAt(wx[0],wx[1]),y=fl+8;P.pos.set(wx[0]+200,y,wx[1]);hold();
  const it=X.makeSchool(wch,'darter',X.V3(wx[0]+18,y,wx[1]),8,Math.random,{ent:-1});while(!it.next().done);const sc=X.schools[X.schools.length-1];sc.t=1e9;sc.scanT=1e9;sc.target.copy(sc.pos);
  const ar=[0,1,2].map(i=>{const c=X.spawn(wch,'arrow',X.V3(wx[0],y,wx[1]+(i-1)*4),Math.random,{ent:-1});c.hunger=i===0?1:0.6;c.cool=i===0?0:1e9;c.scanT=i===0?0:1e9;c.t0=i===2?80:20;c.home.copy(c.pos);return c;});
  const k=frames(60*3,()=>{P.pos.set(wx[0]+200,y,wx[1]);hold();return ar[0].state==='chase';});
  check(k>=0&&ar[1].state==='chase'&&ar[2].state==='chase'&&ar[1].target===ar[0].target,'one arrow takes on a darter and its two packmates join it ('+ar.map(c=>c.state).join(', ')+')');
  let side=[0,0];frames(60*0.8,()=>{P.pos.set(wx[0]+200,y,wx[1]);hold();for(const i of [1,2]){const tg=ar[i].target;if(!tg)continue;const tx=tg.pos.x-ar[i].pos.x,tz=tg.pos.z-ar[i].pos.z,cr=tx*ar[i].vel.z-tz*ar[i].vel.x;side[i-1]+=Math.sign(cr);}});
  check(Math.sign(side[0])!==Math.sign(side[1])&&side[0]!==0&&side[1]!==0,'they come in from either side of the line (the flank: '+side.join(', ')+')');
  for(const c of ar)X.removeCreature(c);X.schools.length=0;
  // the ink: an eel chasing an arrow closes on it
  const a=X.spawn(wch,'arrow',X.V3(wx[0],y,wx[1]),Math.random,{ent:-1});a.hunger=0;a.scanT=1e9;a.cool=1e9;const e=X.spawn(wch,'eel',X.V3(wx[0]-9,y,wx[1]),Math.random,{ent:-1});e.hunger=1;e.state='chase';e.target=a;e.chaseT=0;
  const ki=frames(60*4,()=>{P.pos.set(wx[0]+200,y,wx[1]);hold();a.pos.set(wx[0],y,wx[1]);a.vel.set(0,0,0);return a.inkT>0;});
  check(ki>=0&&a.inkT>X.INK.cool-1&&e.pos.distanceTo(a.pos)<X.INK.near+1,'an eel closing on an arrow: the arrow inks ('+(ki/60).toFixed(1)+' s, the eel '+e.pos.distanceTo(a.pos).toFixed(1)+' m off)');
  check(X.sightOf(D.eel,y,a,3)===0,'in its cloud no eye sees it');
  check(a.state==='flee'&&a.dread===e,'and it jets off from the eel, which '+(e.target===a?'kept after it':'lost it (left it '+e.cool.toFixed(0)+' s)'));
  for(const c of [a,e])if(c.alive)X.removeCreature(c);}

// ---- 4. the lurker gives up a post where nothing passes ----
console.log('the lurker');
if(wx){X.setClock(dark);for(const c of X.creatures.slice())X.removeCreature(c);X.schools.length=0; /* the cell's own animals out: nothing passes this post */const wch=X.chunkIJ(X.cellOf(wx[0]),X.cellOf(wx[1])),fl=X.groundAt(wx[0],wx[1]);P.pos.set(wx[0]+200,fl+10,wx[1]);hold();
  const l=X.spawn(wch,'lurker',X.V3(wx[0],fl+1,wx[1]),Math.random,{ent:-1});l.state='sit';l.home.copy(l.pos);l.hunger=0.8;l.cool=0;const h0=l.home.clone();
  const k=frames(60*(X.LURK.give+10),()=>{P.pos.set(wx[0]+200,fl+10,wx[1]);hold();return l.state==='return';});
  check(k>=0&&l.home.distanceTo(h0)>1.5,'hungry at night with nothing passing, after '+(k/60).toFixed(0)+' s it leaves its post for another '+l.home.distanceTo(h0).toFixed(0)+' m off');
  const s2=frames(60*20,()=>{P.pos.set(wx[0]+200,fl+10,wx[1]);hold();return l.state==='sit';});check(s2>=0&&l.pos.distanceTo(l.home)<1,'and sits there');}

try{fs.unlinkSync(tmp);}catch(e){}
console.log(fails?'ringmouths: '+fails+' FAILED':'ringmouths: ok');process.exit(fails?1:0);
