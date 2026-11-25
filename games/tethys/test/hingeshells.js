// test/hingeshells.js — the hingeshells' pass (v11.232; BEHAVIOUR.md §3f). The valves breathing at rest and still when clamped or moving (VALVE);
// the moult's cue (its last hour: the valves down and to its rest, out of its hours); the den kept and gone back to, bolted for at a threat and
// clamped in, covered there (DEN); the strike as the only hunt — no sprint, and a hunt with no strike begun or two missed given up (HINGE); the hook
// striking only what is under it, climbing back to its post, and climbing to another in the structure when nothing passes (HOOK); the scuttles out
// on the flats at low water and not at high (TIDEW). The whole bundle against the stub, as test/clock.js. `node test/hingeshells.js`.
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
let js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n');
js+='\nglobal.__hg={CK,MOULT,VALVE,DEN,HINGE,HOOK,TIDEW,FREEZE,REST,DEFS,DAY_S,DAY_H,get TIDE(){return TIDE;},premoult,awakeC,coverOf,inDen,setWander,hangSpot,solidPush,spawn,removeCreature,creatures,schools,player,choose,V3,groundAt,cellOf,chunkIJ,'
  +'updateCreatures,updateSchools,updatePlayer,finishPlayer,updateStates,get bodies(){return bodies;},get mode(){return mode;},mulberry,'
  +'at(x,z){player.pos.set(x,-30,z);cellsAround();},get t(){return t;},setT(v){t=v;},setClock(h){clockH=h;TIDE=tideAt(h);clockTick();}};';
const tmp=path.join(require('os').tmpdir(),'tethys_hingeshells_'+process.pid+'.js');
fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
process.env.PICK='0';
require('./stub.js');require(tmp);fs.unlinkSync(tmp);
const X=global.__hg;let fails=0;
Math.random=X.mulberry(47);
function check(ok,msg){if(!ok){fails++;console.error('  FAIL '+msg);}else console.log('  ok   '+msg);}
const dt=1/60,P=X.player,D=X.DEFS;
function frames(n,each){for(let i=0;i<n;i++){X.setT(X.t+dt);if(X.mode==='play')X.updatePlayer(dt);X.updateSchools(dt);X.updateCreatures(dt);if(X.mode==='play')X.finishPlayer(dt,X.bodies);X.updateStates(dt);if(each&&each(i))return i;}return -1;}
function clearAll(){for(const c of X.creatures.slice())X.removeCreature(c);X.schools.length=0;}
const hold=()=>{P.vel.set(0,0,0);};
let noon=0,hi=-2,midnight=0,lo=2;for(let h=0;h<30;h+=0.05){X.setClock(h);if(X.CK.sun>hi){hi=X.CK.sun;noon=h;}if(X.CK.sun<lo){lo=X.CK.sun;midnight=h;}}
X.choose(1);P.dead=false;
// the shelf's rock at (330, 0)'s cells: a stretch of hard floor for the walkers and the hunters
const AT=[330,40];X.at(AT[0],AT[1]);const ch=X.chunkIJ(X.cellOf(AT[0]),X.cellOf(AT[1]));
let SX=0,SZ=0;for(let r=0;r<200&&!SX;r+=8)for(let a=0;a<16&&!SX;a++){const x=AT[0]+Math.cos(a*0.39)*r,z=AT[1]+Math.sin(a*0.39)*r,h=X.groundAt(x,z);if(h<-12&&h>-40)SX=x,SZ=z;}
const SH=X.groundAt(SX,SZ);
const put=(kind,x,z,up)=>{const c=X.spawn(ch,kind,X.V3(x,X.groundAt(x,z)+(up||1),z),Math.random,{ent:-1});c.home.copy(c.pos);c.hunger=0;c.cool=0;c.scanT=0;return c;};

// ---- 1. the valves ----
console.log('the valves');
{clearAll();const c=put('scuttle',SX,SZ);const rot=()=>{const r=[];c.g.traverse(o=>{r.push(o.rotation.x,o.rotation.y,o.rotation.z);});return r;},diff=(a,b)=>a.reduce((m,v,i)=>Math.max(m,Math.abs(v-b[i])),0);
  const st=c.st,br=X.VALVE.lift,at=(tt,spd,on)=>{X.VALVE.lift=on?br:0;c.anim(tt,spd,st);X.VALVE.lift=br;return rot();}; // the breath alone: the pose with it against the pose without it, the rest of the body (the legs' clock) the same
  st.soft=undefined;const q=X.VALVE.p*0.25,b1=diff(at(q,0,true),at(q,0,false));
  check(b1>0.05,'at rest a scuttle\'s valves breathe: '+b1.toFixed(3)+' rad up at the breath\'s top (every '+X.VALVE.p+' s)');
  check(diff(at(q,1.2,true),at(q,1.2,false))<1e-9,'walking they stay up, as they were');
  st.soft=1;check(diff(at(q,0,true),at(q,0,false))<1e-9,'clamped they stay shut');st.soft=undefined;
  X.removeCreature(c);}

// ---- 2. the moult's cue ----
console.log('the moult\'s cue');
{clearAll();X.setClock(midnight);P.pos.set(SX+200,SH+6,SZ);hold();const c=put('lash',SX,SZ,2);c.hunger=0.3;const H=X.DAY_S/X.DAY_H;
  c.moultT=H*3;frames(60);check(!X.premoult(c)&&c.awake>0.5&&c.st.soft===undefined,'three hours before its moult, a lash is about at night (awake '+c.awake.toFixed(2)+', its valves up)');
  c.moultT=H*X.MOULT.cue*0.9;c.scanT=0;frames(60*3,()=>{P.pos.set(SX+200,SH+6,SZ);hold();});
  check(X.premoult(c)&&c.awake===0&&c.st.soft===1,'in its last hour its valves stay down and it is out of its hours (awake '+c.awake+')');
  check(c.state==='rest','and it goes to its rest ('+c.state+')');
  X.removeCreature(c);}

// ---- 3. the den ----
console.log('the den');
{clearAll();X.setClock(noon);X.CK.hi=0;P.pos.set(SX+200,SH+6,SZ);hold();
  const w=put('lash',SX,SZ,2);w.hunger=0;w.cool=1e9;
  const k=frames(60*6,()=>{P.pos.set(SX+200,SH+6,SZ);hold();return w.state==='rest';});
  check(k>=0&&!!w.den,'a lash out of its hours rests in cover and keeps it as its den'+(w.den?' ('+w.den.distanceTo(w.home).toFixed(1)+' m from where it was)':''));
  if(w.den){const den=w.den.clone();frames(60*30,()=>{P.pos.set(SX+200,SH+6,SZ);hold();});
    check(X.inDen(w)&&X.coverOf(w)===1,'it lies in its den, covered there (cover '+X.coverOf(w).toFixed(2)+')');
    w.state='wander';w.pos.set(den.x+15,den.y+2,den.z);w.vel.set(0,0,0);w.scanT=0;w.covT=-9;
    const k2=frames(60*30,()=>{P.pos.set(SX+200,SH+6,SZ);hold();return w.state==='rest'&&X.inDen(w);});
    check(k2>=0&&w.den.distanceTo(den)<1e-6,'put 15 m off, at its next rest it goes back to the same den ('+(k2/60).toFixed(0)+' s)');}
  X.removeCreature(w);
  // a grazer with a den bolts for it
  const g=put('scuttle',SX,SZ);D.scuttle.dens; /* the scuttle buries: no den */const wd=X.spawn(ch,'wedge',X.V3(SX,SH+1,SZ),Math.random,{ent:-1});
  check(!D.scuttle.dens&&!!D.wedge.dens&&!!D.lash.dens&&!D.lurker.dens,'the dens are the hingeshells\' that rest in cover (the wedge, the lash, the hose, the sickle), not the buriers\' nor the other clades\'');
  X.removeCreature(g);wd.home.copy(wd.pos);wd.den=X.V3(SX-10,SH+0.5,SZ);wd.state='wander';wd.hunger=0;
  P.pos.set(SX+2,wd.pos.y,SZ);P.vel.set(-1.6,0,0);const run=frames(60*12,()=>{P.pos.set(Math.max(wd.pos.x+2.5,SX-6),wd.pos.y,SZ);P.vel.set(-1.6,0,0);return X.inDen(wd);});
  check(run>=0,'a wedge the player comes at bolts for its den 10 m off, away from the player ('+(run>=0?(run/60).toFixed(1)+' s':wd.state+', '+wd.pos.distanceTo(wd.den).toFixed(1)+' m off')+')');
  if(run>=0){frames(30,()=>{P.pos.set(SX-6,wd.pos.y,SZ);hold();});check(wd.st.soft===1&&wd.vel.length()<0.6,'and clamps there ('+wd.vel.length().toFixed(2)+' m/s)');}
  X.removeCreature(wd);}

// ---- 4. the strike as the only hunt ----
console.log('the strike');
{clearAll();X.setClock(midnight);const y=SH+6;const s=X.spawn(ch,'sickle',X.V3(SX,y,SZ),Math.random,{ent:-1});s.home.copy(s.pos);s.hunger=1;s.cool=0;s.scanT=0;
  let gx=SX+25;P.pos.set(gx,y,SZ);hold();const k=frames(60*4,()=>{P.pos.set(gx,y,SZ);P.vel.set(1.6,0,0);return s.state==='chase';});
  check(k>=0,'a starving sickle takes on the player 25 m off ('+s.state+')');
  let top=0,gone=-1;frames(60*20,i=>{s.biteT=1e9;gx=Math.max(gx,s.pos.x+16);P.pos.set(gx,y,SZ);P.vel.set(3,0,0);top=Math.max(top,Math.hypot(s.vel.x,s.vel.z));if(s.state!=='chase'){gone=i/60;return true;}}); // its strikes held off (biteT): the pursuit alone
  check(top<=D.sickle.speed*1.08,'no sprint: '+top.toFixed(1)+' m/s at the most in pursuit, its speed '+D.sickle.speed.toFixed(1)+' (burst and coast; its strike\'s own lunge is '+D.sickle.strike.speed+')');
  check(gone>=X.HINGE.chase-0.5&&gone<X.HINGE.chase+1,'with no strike begun, it lets the player go at '+gone.toFixed(1)+' s (HINGE.chase '+X.HINGE.chase+')');
  s.state='chase';s.target=P;s.cool=0;s.chaseT=0;s.missN=X.HINGE.misses;P.pos.set(s.pos.x+8,y,SZ);hold();frames(2);
  check(s.state!=='chase'&&s.missN===0,'a hunt its strikes have missed '+X.HINGE.misses+' times it gives up ('+s.state+'; its count back to 0)');
  const r=X.spawn(ch,'ridge',X.V3(SX,y,SZ+30),Math.random,{ent:-1});r.state='chase';r.target=P;r.missN=5;r.chaseT=20;r.hunger=1;P.pos.set(r.pos.x+8,y,r.pos.z);hold();frames(2);
  check(r.state==='chase','a ridge (a slowblood) is not held to it');X.removeCreature(r);X.removeCreature(s);}

// ---- 5. the hook ----
console.log('the hook');
{clearAll();X.setClock(noon);const h=X.spawn(ch,'hook',X.V3(SX,SH+9,SZ),Math.random,{ent:-1});h.home.copy(h.pos);h.state='sit';h.hunger=1;h.cool=0;h.scanT=0; /* starving: it dares the player (RISK), so only the geometry decides */
  P.pos.set(SX+3.5,h.pos.y,SZ);P.vel.set(0,0,1.6);const lv=frames(60*2,()=>{P.pos.set(SX+3.5,h.pos.y,SZ);P.vel.set(0,0,1.6);return h.state==='lunge';});
  check(lv<0,'at noon (out of its hours, it notices within ~4 m), the player level with a starving hook 3.5 m off: nothing');
  h.state='sit';h.scanT=0;h.hunger=1;h.cool=0;P.pos.set(SX+1,h.pos.y-3.4,SZ);P.vel.set(0,0,1.6);const dn=frames(60*2,()=>{P.pos.set(SX+1,h.pos.y-3.4,SZ);P.vel.set(0,0,1.6);return h.state==='lunge';});
  check(dn>=0,'under it, 3.4 m down: it drops on it ('+(dn/60).toFixed(2)+' s)');
  X.setClock(midnight);
  P.pos.set(SX+300,SH+6,SZ);hold();h.state='return';h.target=null;h.pos.set(SX,SH+3,SZ);let vmax=0;const up=frames(60*20,()=>{P.pos.set(SX+300,SH+6,SZ);hold();vmax=Math.max(vmax,h.vel.length());return h.state==='sit';});
  check(up>=0&&vmax<=X.HOOK.climb*1.15,'it climbs back up to its post at '+vmax.toFixed(2)+' m/s ('+(up/60).toFixed(0)+' s; HOOK.climb '+X.HOOK.climb+')');
  const h0=h.home.clone();h.hunger=0.9;h.cool=0;const mv=frames(60*(X.HOOK.give+15),()=>{P.pos.set(SX+300,SH+6,SZ);hold();return h.state==='return';});
  const fl=X.groundAt(h.home.x,h.home.z),over=h.home.y-fl,dd=Math.hypot(h.home.x-h0.x,h.home.z-h0.z);
  check(mv>=0&&dd>=X.HOOK.step[0]-0.01&&dd<=X.HOOK.step[1]+0.01&&over>=X.HOOK.hang[0]-0.01&&over<=X.HOOK.hang[1]+0.01,'hungry at night with nothing passing, after '+(mv/60).toFixed(0)+' s it climbs to another post '+dd.toFixed(0)+' m off, '+over.toFixed(1)+' m over the floor');
  check(!X.solidPush(X.V3().copy(h.home),2.5,null,ch,true),'out of any solid');
  X.removeCreature(h);}

// ---- 6. the scuttles at low water ----
console.log('the flats');
{let low=-1,high=-1;for(let h=midnight-15;h<midnight+15;h+=0.05){X.setClock(h);if(X.CK.night<0.9)continue;if(low<0&&X.CK.hi<0.1)low=h;if(high<0&&X.CK.hi>0.9)high=h;}
  check(low>=0&&high>=0,'a low and a high water at night');X.setClock(low);const T0=X.TIDE;
  let fx=0,fz=0;for(let r=300;r<3000&&!fx;r+=20)for(let a=0;a<48;a++){const x=Math.cos(a/48*Math.PI*2)*r,z=Math.sin(a/48*Math.PI*2)*r,h=X.groundAt(x,z);if(h<T0-1.5&&h>T0-4){let wet=false;for(let b=0;b<8&&!wet;b++){const g=X.groundAt(x+Math.cos(b*0.785)*30,z+Math.sin(b*0.785)*30);if(g>T0+0.5&&g<T0+2)wet=true;}if(wet){fx=x;fz=z;break;}}}
  check(!!fx,'a shore at low water: 1.5–4 m under the low tide\'s line, the wet sand within 30 m ('+fx.toFixed(0)+', '+fz.toFixed(0)+')');
  if(fx){X.at(fx,fz);clearAll();const sch=X.chunkIJ(X.cellOf(fx),X.cellOf(fz));
    const sc=X.spawn(sch,'scuttle',X.V3(fx,X.groundAt(fx,fz)+0.6,fz),Math.random,{ent:-1});sc.home.copy(sc.pos);sc.hunger=0;
    X.setClock(low);let n=0,ok=0;for(let i=0;i<40;i++){X.setWander(sc);n++;const g=X.groundAt(sc.wander.x,sc.wander.z);if(g>=X.TIDE+X.TIDEW.band[0]-0.01&&g<=X.TIDE+X.TIDEW.band[1]+0.01)ok++;}
    check(ok>=30,'at low water ('+X.TIDE.toFixed(1)+' m) '+ok+' of '+n+' of its wanders are on the wet sand just above the waterline');
    X.setClock(high);let ok2=0;for(let i=0;i<40;i++){X.setWander(sc);const g=X.groundAt(sc.wander.x,sc.wander.z);if(g>=X.TIDE+X.TIDEW.band[0])ok2++;}
    check(ok2===0,'at high water ('+X.TIDE.toFixed(1)+' m) none ('+ok2+')');
    X.setClock(low);sc.state='wander';sc.wanderT=0;sc.pos.set(fx,X.groundAt(fx,fz)+0.6,fz);sc.vel.set(0,0,0);P.pos.set(fx+60,-6,fz);hold();frames(2,()=>{P.pos.set(fx+60,-6,fz);hold();});const sub0=sc.sub;let out=-1;frames(60*90,i=>{P.pos.set(fx+60,-6,fz);hold();if(sc.sub<0.5&&out<0)out=i/60;return out>=0;});
    check(sub0>0.9&&out>=0,'and walks up out of the water onto them (in it to start: '+sub0.toFixed(2)+'; out at '+(out>=0?out.toFixed(0)+' s':'not in 90 s: '+sc.state+', '+sc.pos.y.toFixed(1))+')');
    X.removeCreature(sc);}}

try{fs.unlinkSync(tmp);}catch(e){}
console.log(fails?'hingeshells: '+fails+' FAILED':'hingeshells: ok');process.exit(fails?1:0);
