// test/clock.js — the clock and the risk (v11.228; BEHAVIOUR.md). The sim's own sun (clockTick: never the drawing's SKY); a kind's hours (creatures_defs.js
// BEHAVE, awakeOf) and its rest out of them (restBegin, restStep: the cover, the floor, the sand); a resting hunter hungrier before it hunts and taking only
// what comes to it, and hunger getting it up; the schools settling; the risk (riskOf, dares: a small hunter leaves a body its own size until it is starving);
// the player weighed as any body (to v11.227 at 0.7 of its distance); the look (RISK): a slowblood circles prey that watches it, a ringmouth holds off
// facing it, a hingeshell never looks — and the prey's answer: running is chased, a back turned is the opening, coming at it drives it off; a wounded
// hunter flees what wounded it, not the player; the crusher eats carrion between hunts; the arrow jets in the chase; a carcass's glow is the sim's own.
// The whole bundle against the stub, as test/combat.js. `node test/clock.js`.
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
let js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n');
js+='\nglobal.__ck={currentAt,CK,clockTick,awakeOf,huntAt,needOf,riskOf,findPrey,findCarcass,carcGlow,REST,RISK,DEFS,ECO,spawn,removeCreature,creatures,carcasses,schools,makeSchool,player,choose,faceQ,V3,groundAt,cellOf,chunkIJ,'
  +'at(x,z){player.pos.set(x,-60,z);cellsAround();},updateCreatures,updateSchools,kill,mulberry,kgOf,FX,solidPush,get mode(){return mode;},get t(){return t;},setT(v){t=v;},setClock(h){clockH=h;TIDE=tideAt(h);clockTick();},get clockH(){return clockH;}};';
const tmp=path.join(require('os').tmpdir(),'tethys_clock_'+process.pid+'.js');
fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
process.env.PICK='0';
require('./stub.js');require(tmp);fs.unlinkSync(tmp);
const X=global.__ck;let fails=0;const AT=[900,0];X.at(AT[0],AT[1]); // the open water east of the start, its floor ~140 m down (the start's own cells are the lagoon's 22 m)
Math.random=X.mulberry(31);
function check(ok,msg){if(!ok){fails++;console.error('  FAIL '+msg);}else console.log('  ok   '+msg);}
const dt=1/60,P=X.player,ch=X.chunkIJ(X.cellOf(AT[0]),X.cellOf(AT[1]));
function frames(n,each){for(let i=0;i<n;i++){X.setT(X.t+dt);X.updateSchools(dt);X.updateCreatures(dt);if(each&&each(i))return i;}return -1;}
function clearAll(){for(const c of X.creatures.slice())X.removeCreature(c);X.schools.length=0;}
function fish(kind,p){const it=X.makeSchool(ch,kind,p,1,Math.random,{ent:-1});while(!it.next().done);const s=X.schools[X.schools.length-1];s.scanT=1e9;s.t=1e9;s.target.copy(p);const c=s.members[0];c.pos.copy(p);c.home.copy(p);return c;} // a school of one held at p, blind to threats: prey that stays where it is put
function put(kind,pos,hunger){const c=X.spawn(ch,kind,pos,Math.random,{ent:-1});c.hunger=hunger;c.cool=0;c.scanT=0;c.home.copy(pos);return c;}
const face=(x,z)=>{const dx=x-P.pos.x,dz=z-P.pos.z,b=Math.atan2(-dx,-dz);P.yaw=P.byaw=b;P.pitch=P.bpitch=0;X.faceQ(P);}; // the player's body toward (x, z) (player.js faceQ: forward −sin byaw, −cos byaw)
X.choose(1);P.dead=false;P.pos.set(AT[0],-60,AT[1]);
// a place in deep enough water among the loaded cells, its floor well under the bodies put on it
let S=null;for(let r=0;r<160&&!S;r+=20)for(let a=0;a<12&&!S;a++){const x=AT[0]+Math.cos(a*0.52)*r,z=AT[1]+Math.sin(a*0.52)*r,h=X.groundAt(x,z);if(h<-90&&X.groundAt(x+40,z)<-80&&X.groundAt(x-40,z)<-80&&X.groundAt(x,z+40)<-80&&X.groundAt(x,z-40)<-80)S={x,z,h};}
check(!!S,'a place in open water for the hunts ('+(S?S.x.toFixed(0)+', '+S.z.toFixed(0)+', floor '+S.h.toFixed(0):'none')+')');
const Y=S?Math.max(S.h+40,-60):-40;
const hold=()=>{P.vel.set(0,0,0);};

// ---- 1. the sim's sun and a kind's hours ----
console.log('the clock');
let noon=0,mid=0,dusk=-1,hi=-2,lo=2;for(let h=0;h<30;h+=0.05){X.setClock(h);X.clockTick();if(X.CK.sun>hi){hi=X.CK.sun;noon=h;}if(X.CK.sun<lo){lo=X.CK.sun;mid=h;}if(dusk<0&&X.CK.dusk>0.99)dusk=h;}
X.setClock(noon);X.clockTick();check(X.CK.day>0.99&&X.CK.night<0.01,'noon is day ('+X.CK.day.toFixed(2)+'), from the clock alone');
X.setClock(mid);X.clockTick();check(X.CK.night>0.99&&X.CK.day<0.01,'midnight is night ('+X.CK.night.toFixed(2)+')');
let sum=0;for(let h=0;h<30;h+=0.25){X.setClock(h);X.clockTick();sum=Math.max(sum,Math.abs(X.CK.day+X.CK.night+X.CK.dusk-1));}
check(dusk>=0&&sum<1e-9,'and a dusk between, the three summing to one at every hour');
const D=X.DEFS;const at=(h,d)=>{X.setClock(h);X.clockTick();return X.awakeOf(d);};
check(at(noon,D.eel)<X.REST.on&&at(mid,D.eel)>X.REST.off,'the eel keeps the night: about '+at(noon,D.eel).toFixed(2)+' at noon, '+at(mid,D.eel).toFixed(2)+' at midnight');
check(at(noon,D.grazer)>X.REST.off&&at(mid,D.grazer)<X.REST.on,'the grazer the day: '+at(noon,D.grazer).toFixed(2)+', '+at(mid,D.grazer).toFixed(2));
check(at(noon,D.abyssal)===1&&at(mid,D.abyssal)===1,'the abyssal, below the light, every hour');
{X.CK.hi=0;const l=X.awakeOf(D.wedge);X.CK.hi=1;const h=X.awakeOf(D.wedge);check(l<0.05&&h>0.95,'the wedge keeps the tide: '+l.toFixed(2)+' at low water, '+h.toFixed(2)+' at high');}

// ---- 2. rest ----
console.log('rest');
if(S){clearAll();X.setClock(noon);P.pos.set(S.x+150,Y,S.z);hold();
  const e=put('eel',X.V3(S.x,S.h+6,S.z),0.2);let r=frames(60*3,()=>e.state==='rest');
  check(r>=0,'an eel at noon, fed, goes to rest ('+e.state+')');
  frames(60*25);const v=e.vel.length(),fh=X.groundAt(e.pos.x,e.pos.z);
  check(v<0.3&&e.pos.y-fh<(D.eel.clear!==undefined?D.eel.clear:D.eel.size*0.35)+1.2,'and lies still on the floor at its rest (speed '+v.toFixed(2)+' m/s, '+(e.pos.y-fh).toFixed(2)+' m up)');
  const thr=X.huntAt(e);check(Math.abs(thr-(X.ECO.hungry+X.REST.k*(1-e.awake)))<1e-9&&thr>0.7,'resting, it hunts only past hunger '+thr.toFixed(2)+' (awake '+e.awake.toFixed(2)+')');
  const far=fish('darter',X.V3(e.pos.x+12,e.pos.y+1,e.pos.z));e.hunger=0.6;e.scanT=0;frames(30);
  check(e.state==='rest','hungry but under that, it lets a darter 12 m off go by');
  const near=fish('darter',X.V3(e.pos.x+3,e.pos.y+0.5,e.pos.z));e.scanT=0;const tk=frames(30,()=>e.state==='chase'&&e.target===near); // v11.230.1: within the half-second, not at its end — by then a run's chase may have struck already
  check(tk>=0,'and takes one that comes within '+(D.eel.detect*X.REST.see).toFixed(1)+' m ('+(tk>=0?'in '+(tk/60).toFixed(2)+' s':e.state)+')');
  clearAll();const e2=put('eel',X.V3(S.x,S.h+6,S.z),0.2);frames(60*3);const dd=fish('darter',X.V3(S.x+10,S.h+6,S.z));e2.hunger=0.95;e2.scanT=0;frames(30);
  check(e2.state==='chase'&&e2.target===dd,'starving, it gets up at noon and hunts a darter 10 m off ('+e2.state+')');
  clearAll();const e3=put('eel',X.V3(S.x,S.h+6,S.z),0.2);frames(60*3);X.setClock(mid);frames(60*1.5);
  check(e3.state==='wander'&&e3.sink===1,'at midnight it is up and about ('+e3.state+')');
  clearAll();X.setClock(noon);const pl=put('plough',X.V3(S.x,S.h+2,S.z),0);frames(60*30);const ph=pl.pos.y-X.groundAt(pl.pos.x,pl.pos.z),pc=D.plough.clear;
  check(pl.state==='rest'&&pl.sink===X.REST.bury&&ph<pc*0.6,'a plough at noon is under the sand ('+ph.toFixed(2)+' m up against its clearance '+pc+')');
  clearAll();X.setClock(mid);const sc=[];const it=X.makeSchool(ch,'darter',X.V3(S.x,S.h+12,S.z),10,Math.random,{ent:-1});while(!it.next().done);const sch=X.schools[X.schools.length-1];frames(60*2);
  const sfh=X.groundAt(sch.target.x,sch.target.z);check(sch.rest&&sch.target.y-sfh<3,'a school of darters at midnight settles over the floor (its mark '+(sch.target.y-sfh).toFixed(1)+' m up)');
  X.setClock(noon);frames(60*2);check(!sch.rest,'and is up by day');}

// ---- 3. the risk, and the player as any body ----
console.log('the risk');
if(S){clearAll();X.setClock(noon);P.pos.set(S.x,Y,S.z);hold();P.vel.set(2,0,0); // v11.229: at noon, and the bodies moving, so the hook and the ridge see them (the senses are test/senses.js's)
  const hk=put('hook',X.V3(S.x,Y,S.z+8),0);hk.awake=1;const thr=X.huntAt(hk),r=X.riskOf(hk,P);hk.hunger=thr+0.3*(1-thr);
  check(r>0.9&&X.findPrey(hk,20,thr)===null,'a hook (≈'+(X.kgOf(hk)/1000).toFixed(1)+' t) leaves the player (≈'+(X.kgOf(P)/1000).toFixed(1)+' t, risk '+r.toFixed(2)+') at need 0.3');
  const dar=put('darter',X.V3(S.x+2,Y,S.z+14),0);dar.state='sit';dar.vel.set(2,0,0);check(X.findPrey(hk,20,thr)===dar,'and takes a darter further off');
  hk.hunger=1;check(X.findPrey(hk,20,thr)===dar,'starving, still the darter nearer by its weight');X.removeCreature(dar);check(X.findPrey(hk,20,thr)===P,'and the player when there is nothing else');
  clearAll();const rg=put('ridge',X.V3(S.x,Y,S.z),1);P.pos.set(S.x,Y,S.z+10);hold();P.vel.set(2,0,0);const pk=put('picker',X.V3(S.x,Y,S.z-9.5),0);pk.state='sit';pk.vel.set(2,0,0);
  check(X.findPrey(rg,40,X.huntAt(rg))===pk,'a ridge takes a picker 9.5 m off before the player 10 m off (the 0.7 is gone)');
  const gz=put('grazer',X.V3(S.x+2,Y,S.z-5),0);gz.state='sit';gz.bleed=0;const rgz=X.riskOf(rg,gz);gz.bleed=0.01;const rgw=X.riskOf(rg,gz);gz.bleed=0;
  check(rgw<rgz*0.5,'a bleeding grazer is less of a risk ('+rgz.toFixed(2)+' → '+rgw.toFixed(2)+')');}

// ---- 4. the look ----
console.log('the look');
function look(kind,h,setup,each,n){clearAll();X.setClock(h);P.pos.set(S.x,Y,S.z);hold();const c=put(kind,X.V3(S.x+30,Y,S.z),0);c.awake=X.awakeOf(D[kind]);const thr=X.huntAt(c);c.hunger=thr+0.35*(1-thr);face(c.pos.x,c.pos.z);if(setup)setup(c);let k=frames(n,i=>{hold();if(each)return each(c,i);});return {c,k};}
if(S){const dusk2=dusk;
  {const {c}=look('ridge',dusk2,null,null,60);check(c.state==='inspect','a ridge at need 0.35 with the player facing it does not come straight in: it looks ('+c.state+')');
    let a0=Math.atan2(c.pos.z-P.pos.z,c.pos.x-P.pos.x),turn=0,minD=1e9,maxD=0,last=a0,bit=false;
    frames(60*5,()=>{hold();face(c.pos.x,c.pos.z);const a=Math.atan2(c.pos.z-P.pos.z,c.pos.x-P.pos.x);let da=a-last;if(da>Math.PI)da-=2*Math.PI;if(da<-Math.PI)da+=2*Math.PI;turn+=da;last=a;const dd=c.pos.distanceTo(P.pos);minD=Math.min(minD,dd);maxD=Math.max(maxD,dd);if(P.blood>0||c.hold)bit=true;});
    check(c.state==='inspect'&&Math.abs(turn)>0.6&&!bit,'it circles, the player watching it ('+(Math.abs(turn)*57.3).toFixed(0)+'° round in 5 s, '+minD.toFixed(0)+'–'+maxD.toFixed(0)+' m off, no bite)');
    face(c.pos.x*2-P.pos.x*2+P.pos.x,P.pos.z-(c.pos.z-P.pos.z));const k=frames(60*2,()=>{hold();const bx=P.pos.x-(c.pos.x-P.pos.x),bz=P.pos.z-(c.pos.z-P.pos.z);face(bx,bz);return c.state==='chase';});
    check(k>=0&&k<60*1.5,'the player turns its back: the opening, and the chase ('+(k<0?'none':(k/60).toFixed(2)+' s')+')');}
  {const {c}=look('ridge',dusk2,null,null,60);let k=frames(60*8,()=>{const dx=c.pos.x-P.pos.x,dz=c.pos.z-P.pos.z,l=Math.hypot(dx,dz)||1;P.pos.x+=dx/l*2.2*dt;P.pos.z+=dz/l*2.2*dt;P.vel.set(dx/l*2.2,0,dz/l*2.2);face(c.pos.x,c.pos.z);return c.state!=='inspect';});
    check(c.state==='wander'&&c.cool>10,'the player comes at it, watching it: it is driven off ('+c.state+' after '+(k/60).toFixed(1)+' s, left alone '+c.cool.toFixed(0)+' s)');}
  {const {c}=look('ridge',dusk2,null,null,60);let k=frames(60*2,()=>{const dx=P.pos.x-c.pos.x,dz=P.pos.z-c.pos.z,l=Math.hypot(dx,dz)||1;P.vel.set(dx/l*5,0,dz/l*5);P.pos.x+=dx/l*5*dt;P.pos.z+=dz/l*5*dt;return c.state==='chase';});
    check(k>=0,'the player bolts: the chase ('+(k<0?'none':(k/60).toFixed(2)+' s')+')');}
  {const {c}=look('ortho',mid,null,null,60);let off=0,n=0;frames(60*3,()=>{hold();face(c.pos.x,c.pos.z);if(c.face===P.pos)off++;n++;});
    check(c.state==='inspect'&&off>n*0.8,'an ortho holds off facing the player instead ('+(100*off/n).toFixed(0)+'% of the look its face on the player, '+c.pos.distanceTo(P.pos).toFixed(0)+' m off)');}
  {const {c}=look('sickle',dusk2,null,(c)=>c.state==='inspect',60*3);check(D.sickle.insp===undefined&&c.state!=='inspect','a sickle (a hingeshell) never looks: '+c.state);}
  {const {c}=look('ridge',dusk2,(c)=>{c.hunger=1;},null,30);check(c.state==='chase','starving, the ridge goes straight in');}}

// ---- 5. the rest of the pass ----
console.log('the fixes');
if(S){clearAll();X.setClock(dusk);P.pos.set(S.x-40,Y,S.z);hold();const rg=put('ridge',X.V3(S.x,Y,S.z),0);const gz=put('grazer',X.V3(S.x+15,Y,S.z),0);gz.state='sit';
  rg.state='flee';rg.fleeT=5;rg.dread=gz;const x0=rg.pos.x;frames(60*2,()=>{hold();});
  check(rg.pos.x<x0-3,'a ridge wounded by a grazer flees the grazer ('+(rg.pos.x-x0).toFixed(1)+' m along x), toward the player behind it if need be');
  clearAll();X.setClock(noon);P.pos.set(S.x+200,Y,S.z);hold();const g=put('grazer',X.V3(S.x+12,S.h+3,S.z),0);X.kill(g,null);const cu=X.currentAt(g.pos.x,g.pos.z,g.pos.y,X.V3()),cl=Math.hypot(cu.x,cu.z)||1,cr=put('crusher',X.V3(g.pos.x+cu.x/cl*12,S.h+5,g.pos.z+cu.z/cl*12),0.7); // v11.229: downstream of it (the carrion's scent runs with the current)
  const f0=g.flesh;let near=1e9;frames(60*25,()=>{hold();near=Math.min(near,cr.pos.distanceTo(g.pos));});check(g.flesh<f0&&near<8,'a hungry crusher eats at a carcass 12 m off (flesh '+(100*g.flesh/f0).toFixed(0)+'%, within '+near.toFixed(1)+' m of it)'); // v11.231: its closest, not where it is at the end — at −138 it is cold (THERM), and fed it drifts off before its slowed hunger brings it back
  X.FX.biolum=false;g.deadT=X.ECO.carc*2400*0.9;g.glow=0;const gl=X.carcGlow(g);X.FX.biolum=true;check(gl>0,'a carcass glows for the scavengers by its own law, whatever the effects list says ('+gl.toFixed(2)+')');
  clearAll();X.setClock(mid);P.pos.set(S.x+200,Y,S.z);hold();const ar=put('arrow',X.V3(S.x,Y,S.z),1);const dr=fish('darter',X.V3(S.x,Y,S.z+8));frames(60*0.5);
  check(D.arrow.jetter===true&&ar.state==='chase'&&ar.st.jet===true,'an arrow chases mantle-first (the jet pose: '+ar.st.jet+')');}
try{fs.unlinkSync(tmp);}catch(e){}
console.log(fails?'clock: '+fails+' FAILED':'clock: ok');process.exit(fails?1:0);
