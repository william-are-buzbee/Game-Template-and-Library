// test/drifters.js — the drifters' pass (v11.233; BEHAVIOUR.md §3g). A jelly takes a small swimmer that touches its bell (at a chance a scan),
// paralyses it, draws it to its mouth and eats it, then digests before it takes another; a body too big for it, and the player, it only stings; a
// sailer's lines take what touches them; a sailer on a shoal strands and dies there, carrion on the sand that a scuttle comes to eat; one in deep water
// sails on (DRIFT, STRAND). The whole bundle against the stub, as test/clock.js. `node test/drifters.js`.
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
let js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n');
js+='\nglobal.__dr={CK,DRIFT,STRAND,POP,DEFS,get TIDE(){return TIDE;},carcasses,spawn,removeCreature,creatures,schools,makeSchool,player,choose,V3,groundAt,cellOf,chunkIJ,'
  +'updateCreatures,updateSchools,updatePlayer,finishPlayer,updateStates,get bodies(){return bodies;},get mode(){return mode;},mulberry,'
  +'at(x,z){player.pos.set(x,-30,z);cellsAround();},get t(){return t;},setT(v){t=v;},setClock(h){clockH=h;TIDE=tideAt(h);clockTick();}};';
const tmp=path.join(require('os').tmpdir(),'tethys_drifters_'+process.pid+'.js');
fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
process.env.PICK='0';
require('./stub.js');require(tmp);fs.unlinkSync(tmp);
const X=global.__dr;let fails=0;
Math.random=X.mulberry(53);
function check(ok,msg){if(!ok){fails++;console.error('  FAIL '+msg);}else console.log('  ok   '+msg);}
const dt=1/60,P=X.player,D=X.DEFS;
function frames(n,each){for(let i=0;i<n;i++){X.setT(X.t+dt);if(X.mode==='play')X.updatePlayer(dt);X.updateSchools(dt);X.updateCreatures(dt);if(X.mode==='play')X.finishPlayer(dt,X.bodies);X.updateStates(dt);if(each&&each(i))return i;}return -1;}
function clearAll(){for(const c of X.creatures.slice())X.removeCreature(c);X.schools.length=0;}
const hold=()=>{P.vel.set(0,0,0);};
let noon=0,hi=-2;for(let h=0;h<30;h+=0.05){X.setClock(h);if(X.CK.sun>hi){hi=X.CK.sun;noon=h;}}
X.choose(1);P.dead=false;X.setClock(noon);
const AT=[330,40];X.at(AT[0],AT[1]);const ch=X.chunkIJ(X.cellOf(AT[0]),X.cellOf(AT[1]));
let SX=0,SZ=0;for(let r=0;r<200&&!SX;r+=8)for(let a=0;a<16&&!SX;a++){const x=AT[0]+Math.cos(a*0.39)*r,z=AT[1]+Math.sin(a*0.39)*r,h=X.groundAt(x,z);if(h<-25&&h>-50)SX=x,SZ=z;}
const SH=X.groundAt(SX,SZ),Y=SH+12;
function fish(kind,pos){const it=X.makeSchool(ch,kind,pos,1,Math.random,{ent:-1});while(!it.next().done);const s=X.schools[X.schools.length-1];s.t=1e9;s.scanT=1e9;return s.members[0];}

// ---- 1. a jelly eats what touches it ----
console.log('the jelly');
{clearAll();P.pos.set(SX+80,Y,SZ);hold();const j=X.spawn(ch,'jelly',X.V3(SX,Y,SZ),Math.random,{ent:-1});j.home.copy(j.pos);
  const dr=fish('darter',X.V3(SX+0.8,Y,SZ));const st0=X.POP.stung;
  const k=frames(60*10,()=>{P.pos.set(SX+80,Y,SZ);hold();if(j.feedAt!==dr&&dr.alive&&!(dr.paraT>0))dr.pos.set(j.pos.x+0.8,j.pos.y,j.pos.z);return j.feedAt===dr;});
  check(k>=0&&dr.paraT>0&&X.POP.stung===st0+1,'a darter (0.6 m) at its bell is held, paralysed ('+(k/60).toFixed(2)+' s; a chance of '+X.DRIFT.p+' a '+X.DRIFT.scan+' s scan)');
  let near=1e9;const e=frames(60*(X.DRIFT.haul+1),()=>{P.pos.set(SX+80,Y,SZ);hold();if(dr.alive)near=Math.min(near,Math.hypot(dr.pos.x-j.pos.x,dr.pos.y-(j.pos.y-D.jelly.size*0.35),dr.pos.z-j.pos.z));return !dr.alive;});
  check(near<0.6,'it is drawn to the mouth under the bell (within '+near.toFixed(2)+' m)');
  check(e>=0&&Math.abs(e/60-X.DRIFT.haul)<1&&dr.gone,'and eaten whole at the haul\'s end ('+((e)/60).toFixed(1)+' s on)');
  check(Math.abs(j.cool-X.DRIFT.full)<1,'the jelly digests '+j.cool.toFixed(0)+' s');
  const d2=fish('darter',X.V3(j.pos.x+0.8,j.pos.y,j.pos.z));const k2=frames(60*20,()=>{P.pos.set(SX+80,Y,SZ);hold();d2.pos.set(j.pos.x+0.8,j.pos.y,j.pos.z);return j.feedAt===d2;});
  check(k2<0,'digesting, it takes nothing for 20 s (a darter at its bell all the while)');X.removeCreature(d2);
  j.cool=0;const nd=X.spawn(ch,'needle',X.V3(j.pos.x+0.8,j.pos.y,j.pos.z),Math.random,{ent:-1});nd.hunger=0;nd.cool=1e9;
  const k3=frames(60*10,()=>{P.pos.set(SX+80,Y,SZ);hold();nd.pos.set(j.pos.x+0.8,j.pos.y,j.pos.z);return j.feedAt===nd;});
  check(k3<0&&D.needle.size>D.jelly.size*X.DRIFT.take,'a needle ('+D.needle.size+' m, over '+(D.jelly.size*X.DRIFT.take).toFixed(2)+') it does not take');X.removeCreature(nd);
  P.pos.set(j.pos.x+0.8,j.pos.y,j.pos.z);hold();const pk=frames(60*3,()=>{P.pos.set(j.pos.x+0.8,j.pos.y,j.pos.z);hold();return P.stungT>0;});
  check(pk>=0&&j.feedAt===null&&!(P.paraT>0),'the player it stings, and does not hold');
  X.removeCreature(j);
  // a school swims through a jelly: its arms take one
  clearAll();const j2=X.spawn(ch,'jelly',X.V3(SX,Y,SZ),Math.random,{ent:-1});j2.home.copy(j2.pos);const it=X.makeSchool(ch,'darter',X.V3(SX-25,Y-1,SZ),10,Math.random,{ent:-1});while(!it.next().done);
  const sc=X.schools[X.schools.length-1];sc.t=1e9;sc.scanT=1e9;const s0=X.POP.stung;let tk=-1;
  frames(60*40,i=>{P.pos.set(SX+80,Y,SZ);hold();j2.pos.set(SX,Y,SZ);sc.target.set(SX+25*Math.cos(i/60*0.25),Y-1,SZ+6*Math.sin(i/60*0.5));if(j2.feedAt&&tk<0)tk=i/60;return tk>=0;}); // the school's target swung through the jelly, back and forth
  check(tk>=0&&X.POP.stung>s0,'a ribbon of ten darters swung through a jelly: it takes one ('+(tk>=0?tk.toFixed(1)+' s':'none in 40 s')+')');
  X.removeCreature(j2);}

// ---- 2. a sailer's lines ----
console.log('the sailer');
{let ox=0,oz=0;for(let r=200;r<6000&&!ox;r+=100)for(let a=0;a<32;a++){const x=Math.cos(a/32*Math.PI*2)*r,z=Math.sin(a/32*Math.PI*2)*r,h=X.groundAt(x,z);if(h<-60&&h>-200){ox=x;oz=z;break;}}
  X.at(ox,oz);clearAll();const sch=X.chunkIJ(X.cellOf(ox),X.cellOf(oz));const sl=X.spawn(sch,'sailer',X.V3(ox,0,oz),Math.random,{ent:-1});sl.home.copy(sl.pos);
  P.pos.set(ox+25,-8,oz);hold();frames(60*4,()=>{P.pos.set(sl.pos.x+25,-8,sl.pos.z);hold();});
  const rig=sl.b.rigs&&sl.b.rigs[0],chn=rig&&rig.chains[0];check(sl.lod===0&&!!chn,'a sailer over open water, its lines simulated near the player');
  if(chn){const tip=()=>{const P2=chn.pts,k=Math.max(1,chn.n-2);return X.V3(P2[k*3],P2[k*3+1],P2[k*3+2]);};let d0=tip();const dr=X.spawn(sch,'darter',d0.clone(),Math.random,{ent:-1});
    const it=X.makeSchool(sch,'darter',d0.clone(),1,Math.random,{ent:-1});while(!it.next().done);X.removeCreature(dr);const s=X.schools[X.schools.length-1];s.t=1e9;s.scanT=1e9;const fd=s.members[0];
    const depth=sl.pos.y-d0.y;const k=frames(60*10,()=>{P.pos.set(sl.pos.x+25,-8,sl.pos.z);hold();if(sl.feedAt!==fd&&fd.alive&&!(fd.paraT>0))fd.pos.copy(tip());return sl.feedAt===fd;});
    check(k>=0,'a darter at a line '+depth.toFixed(0)+' m down is held ('+(k/60).toFixed(2)+' s)');
    const e=frames(60*(X.DRIFT.haul+1),()=>{P.pos.set(sl.pos.x+25,-8,sl.pos.z);hold();return !fd.alive;});
    check(e>=0,'hauled up and eaten ('+((k+e)/60).toFixed(1)+' s)');}
  // a jelly over the same deep water climbs with the plankton's layer at night, and sinks by day; the deepbell keeps its depth
  {let mid=0,lo2=2;for(let h=0;h<30;h+=0.05){X.setClock(h);if(X.CK.sun<lo2){lo2=X.CK.sun;mid=h;}}X.setClock(mid);
    const jy=X.groundAt(ox,oz)+40,jl=X.spawn(sch,'jelly',X.V3(ox+10,jy,oz),Math.random,{ent:-1}),db=X.spawn(sch,'deepbell',X.V3(ox+20,jy,oz),Math.random,{ent:-1});
    frames(60*30,()=>{P.pos.set(sl.pos.x+25,-8,sl.pos.z);hold();});const up=jl.pos.y-jy,dbu=db.pos.y-jy;
    const want=jl.wander.y-jy;check(Math.sign(up)===Math.sign(want)&&Math.abs(up)>X.DRIFT.rise*30*0.7&&!D.deepbell.layer&&!!D.jelly.layer,'at midnight a jelly 40 m over a '+(-X.groundAt(ox,oz)).toFixed(0)+' m floor goes '+up.toFixed(1)+' m in 30 s toward the plankton\'s layer at '+jl.wander.y.toFixed(0)+' (the moon holds it deep tonight); the deepbell keeps to its own');
    X.setClock(noon);X.removeCreature(jl);X.removeCreature(db);}
  // in deep water it sails on
  X.removeCreature(sl);const s2=X.spawn(sch,'sailer',X.V3(ox,0,oz),Math.random,{ent:-1});frames(60*3,()=>{P.pos.set(s2.pos.x+25,-8,s2.pos.z);hold();});
  check(s2.alive,'a sailer in '+(-X.groundAt(s2.pos.x,s2.pos.z)).toFixed(0)+' m of water sails on');X.removeCreature(s2);}

// ---- 3. the stranding ----
console.log('the stranding');
{let fx=0,fz=0;const T=X.TIDE;for(let r=150;r<2500&&!fx;r+=3)for(let a=0;a<64;a++){const x=Math.cos(a/64*Math.PI*2)*r,z=Math.sin(a/64*Math.PI*2)*r,h=X.groundAt(x,z);if(h>T-0.3&&h<T+0.8){fx=x;fz=z;break;}}
  check(!!fx,'a shoal at the waterline ('+fx.toFixed(0)+', '+fz.toFixed(0)+', the ground '+X.groundAt(fx,fz).toFixed(2)+' against the tide '+T.toFixed(2)+')');
  if(fx){X.at(fx,fz);clearAll();const sch=X.chunkIJ(X.cellOf(fx),X.cellOf(fz));const sl=X.spawn(sch,'sailer',X.V3(fx,X.TIDE,fz),Math.random,{ent:-1});
    P.pos.set(fx+40,X.TIDE-3,fz);hold();const k=frames(60*3,()=>{P.pos.set(fx+40,X.TIDE-3,fz);hold();return !sl.alive;});
    check(k>=0&&sl.dead&&X.carcasses.indexOf(sl)>=0,'a sailer aground there strands and dies ('+(k/60).toFixed(2)+' s), a carcass');
    frames(60*2,()=>{P.pos.set(fx+40,X.TIDE-3,fz);hold();});const fl=X.groundAt(sl.pos.x,sl.pos.z);check(sl.pos.y-fl<D.sailer.size*0.35+0.05,'lying on the sand ('+(sl.pos.y-fl).toFixed(2)+' m up)');
    const sc=X.spawn(sch,'scuttle',X.V3(fx+12,X.groundAt(fx+12,fz)+0.6,fz),Math.random,{ent:-1});sc.home.copy(sc.pos);sc.hunger=0.9;sc.scavT=0;sc.state='wander';const f0=sl.flesh;
    const ate=frames(60*40,()=>{P.pos.set(fx+40,X.TIDE-3,fz);hold();return sl.flesh<f0*0.995;});
    check(ate>=0,'a hungry scuttle 12 m off comes to eat at it ('+(ate/60).toFixed(0)+' s)');
    X.removeCreature(sc);}}

try{fs.unlinkSync(tmp);}catch(e){}
console.log(fails?'drifters: '+fails+' FAILED':'drifters: ok');process.exit(fails?1:0);
