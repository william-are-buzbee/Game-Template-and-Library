// test/slowbloods.js — the slowbloods' pass (v11.231; BEHAVIOUR.md §3e). The water's warmth (waterT, tempAt: the mixed layer, the thermocline, a
// vent's bubble); a slowblood's body following it with its size's lag, and the activity it allows (THERM: an ectotherm's, the ridge's warm muscles', the
// abyssal's bulk, the torpid stone's; speed, turn, notice and the hunger's clock); the basker leaving the cold for its vents and lying there till warm
// (BASK); the grazers' alarm running through the herd and dying out (HERD); the abyssal's forays below its rim (FORAY); a chase paid from stamina — a
// sprint over its speed, then spent, then given up (CHASE). The whole bundle against the stub, as test/clock.js. `node test/slowbloods.js`.
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
let js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n');
js+='\nglobal.__sb={updateStates,CK,TEMP,THERM,THERM_F,BASK,HERD,FORAY,CHASE,STAMINA,REST,ECO,DEFS,FI,OXY,waterT,tempAt,thermTick,slowOf,stamOf,setWander,sample,spawn,removeCreature,creatures,schools,player,choose,V3,groundAt,cellOf,chunkIJ,loadChunkNow,'
  +'updateCreatures,updateSchools,updatePlayer,finishPlayer,get bodies(){return bodies;},get mode(){return mode;},mulberry,'
  +'at(x,z){player.pos.set(x,-30,z);cellsAround();},get t(){return t;},setT(v){t=v;},setClock(h){clockH=h;TIDE=tideAt(h);clockTick();}};';
const tmp=path.join(require('os').tmpdir(),'tethys_slowbloods_'+process.pid+'.js');
fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
process.env.PICK='0';
require('./stub.js');require(tmp);fs.unlinkSync(tmp);
const X=global.__sb;let fails=0;
Math.random=X.mulberry(43);
function check(ok,msg){if(!ok){fails++;console.error('  FAIL '+msg);}else console.log('  ok   '+msg);}
const dt=1/60,P=X.player,D=X.DEFS;
function frames(n,each){for(let i=0;i<n;i++){X.setT(X.t+dt);if(X.mode==='play')X.updatePlayer(dt);X.updateSchools(dt);X.updateCreatures(dt);if(X.mode==='play')X.finishPlayer(dt,X.bodies);X.updateStates(dt);if(each&&each(i))return i;}return -1;}
function clearAll(){for(const c of X.creatures.slice())X.removeCreature(c);X.schools.length=0;}
const hold=()=>{P.vel.set(0,0,0);};
let noon=0,hi=-2;for(let h=0;h<30;h+=0.05){X.setClock(h);if(X.CK.sun>hi){hi=X.CK.sun;noon=h;}}
X.choose(1);P.dead=false;X.setClock(noon);

// ---- 1. the water ----
console.log('the water');
{const T=X.TEMP;
  check(X.waterT(-10,-200,0)===T.top&&X.waterT(-59,-200,0)===T.top,'the mixed layer is '+T.top+' °C down to '+T.mix+' m');
  const t200=X.waterT(-200,-1000,0),t500=X.waterT(-500,-1000,0),t1000=X.waterT(-1000,-1200,0);
  check(t200>13&&t200<17&&t500>4.5&&t500<7&&t1000<3.5&&t1000>=T.deep,'the thermocline: '+t200.toFixed(1)+' °C at −200, '+t500.toFixed(1)+' at −500, '+t1000.toFixed(1)+' at −1000 (Earth\'s tropics: ~15, ~6, ~4)');
  check(Math.abs(X.waterT(-300,-300,1)-X.waterT(-300,-1e4,0)-T.vent)<1e-9&&X.waterT(-240,-300,1)<X.waterT(-300,-300,1),'a vent at full heat is '+T.vent+' °C over the water on its floor, less above it');}

// ---- 2. the body and its activity ----
console.log('the body');
let VX=0,VZ=0,vh=0;for(let r=1100;r<=1500;r+=20)for(let a=0;a<128;a++){const x=Math.cos(a/128*Math.PI*2)*r,z=Math.sin(a/128*Math.PI*2)*r,f=X.sample(x,z).f;if(f[X.FI.heat]>vh){vh=f[X.FI.heat];VX=x;VZ=z;}}
check(vh>0.5,'the vent field found ('+VX.toFixed(0)+', '+VZ.toFixed(0)+', heat '+vh.toFixed(2)+', floor '+X.groundAt(VX,VZ).toFixed(0)+')');
X.at(VX,VZ);const ch=X.chunkIJ(X.cellOf(VX),X.cellOf(VZ));clearAll();
let CX=0,CZ=0;for(let r=1500;r<12000&&!CX;r+=250)for(let a=0;a<32;a++){const x=Math.cos(a/32*Math.PI*2)*r,z=Math.sin(a/32*Math.PI*2)*r;if(X.groundAt(x,z)<-750&&X.sample(x,z).f[X.FI.heat]===0){CX=x;CZ=z;break;}} // cold deep water, no vent under it
check(!!CX,'cold deep water off the vents ('+CX.toFixed(0)+', '+CZ.toFixed(0)+')');
{X.at(CX,CZ);const cch=X.chunkIJ(X.cellOf(CX),X.cellOf(CZ)),fl=X.groundAt(VX,VZ);clearAll();
  const at=(kind,y)=>{const c=X.spawn(cch,kind,X.V3(CX,y,CZ),Math.random,{ent:-1});c.hunger=0;c.cool=1e9;c.scanT=1e9;c.home.copy(c.pos);return c;};
  const g=at('grazer',-150),r=at('ridge',-250),e=at('eel',-250),e2=at('eel',-30),a=at('abyssal',-600),s=at('stone',-250),nd=at('needle',-20);
  for(const c of [g,r,e,e2,a,s,nd])X.thermTick(c);
  const want=(c,y)=>Math.min(1,Math.max(D[c.kind].thermF,Math.pow(X.THERM.q10,(X.waterT(y,-1e4,0)-X.THERM.opt)/10)));
  check(Math.abs(g.therm-want(g,-150))<1e-9&&g.therm>0.45&&g.therm<0.65,'a grazer at −150 ('+g.bodyT.toFixed(1)+' °C): activity '+g.therm.toFixed(2)+' (an ectotherm, Q10 '+X.THERM.q10+')');
  check(e.therm<0.4&&e.therm>=X.THERM_F.ecto&&e2.therm===1,'an eel at −250: '+e.therm.toFixed(2)+' (one at −30: '+e2.therm.toFixed(2)+'); the ridge there, a mixotherm, '+r.therm.toFixed(2)+' (its floor '+X.THERM_F.mixo+')');
  check(r.therm===X.THERM_F.mixo&&a.therm===X.THERM_F.giga&&s.therm===X.THERM_F.torpid,'the abyssal at −600 its bulk\'s '+a.therm.toFixed(2)+', the stone at −250 its torpor\'s '+s.therm.toFixed(2));
  check(D.darter.thermF===undefined&&nd.therm===1&&D.arrow.thermF===undefined&&D.fin.thermF===undefined,'the shelf\'s needle at −20 all its activity; no school, no ringmouth, not the player\'s kind');
  check(Math.abs(X.slowOf(e)-e.therm*X.slowOf(e2))<1e-9,'it slows the body (slowOf × '+e.therm.toFixed(2)+')');
  const h0=e.hunger,h2=e2.hunger;frames(60);
  check(e.hunger>h0&&Math.abs((e.hunger-h0)/(e2.hunger-h2)-e.therm)<0.02,'and its hunger\'s clock (the cold eel\'s '+((e.hunger-h0)/(e2.hunger-h2)).toFixed(2)+' of the warm one\'s in a second)');
  for(const c of [g,r,e,e2,a,s,nd])X.removeCreature(c);
  // the basker: warm on its vent; then in the cold off it, cooling with its length's lag
  X.at(VX,VZ);const bk=X.spawn(ch,'basker',X.V3(VX,fl+4,VZ),Math.random,{ent:-1});bk.hunger=0;bk.cool=1e9;bk.scanT=1e9;X.thermTick(bk);
  check(bk.bodyT>X.TEMP.top&&bk.therm===1,'the basker on its vent: '+bk.bodyT.toFixed(1)+' °C, all its activity');
  bk.pos.set(CX,-500,CZ);const T0=bk.bodyT,w=X.tempAt(bk.pos.x,bk.pos.y,bk.pos.z),tau=X.THERM.tau*D.basker.size;
  for(let i=0;i<Math.round(tau);i++){X.setT(X.t+1);X.thermTick(bk);}
  const exp=w+(T0-w)*Math.exp(-1);check(Math.abs(bk.bodyT-exp)<0.5,'off the vents in '+w.toFixed(1)+' °C water it cools from '+T0.toFixed(1)+' to '+bk.bodyT.toFixed(1)+' in '+tau+' s (its length\'s lag: '+X.THERM.tau+' s a metre; activity '+bk.therm.toFixed(2)+')');
  X.removeCreature(bk);}

// ---- 3. the basker basks ----
console.log('the basker');
{X.at(VX,VZ);clearAll();const fl=X.groundAt(VX,VZ),bk=X.spawn(ch,'basker',X.V3(VX,fl+6,VZ),Math.random,{ent:-1});bk.home.copy(bk.pos);bk.hunger=0;bk.cool=1e9;
  P.pos.set(VX+300,-60,VZ);hold();
  bk.pos.set(VX+120,fl+6,VZ);bk.bodyT=12;bk.thmT=0;
  const k=frames(60*3,()=>{P.pos.set(VX+300,-60,VZ);hold();return bk.state==='bask';});
  check(k>=0,'a basker cooled to '+bk.therm.toFixed(2)+' (under '+X.BASK.go+') goes to bask ('+bk.state+')');
  const d0=Math.hypot(bk.pos.x-VX,bk.pos.z-VZ);
  const w=frames(60*400,()=>{P.pos.set(VX+300,-60,VZ);hold();return bk.state!=='bask';});
  check(w>=0&&bk.therm>=X.BASK.warm,'it goes back over its vents ('+d0.toFixed(0)+' m) and lies there till warm: '+(w/60).toFixed(0)+' s, '+bk.bodyT.toFixed(1)+' °C, activity '+bk.therm.toFixed(2)+' ('+bk.state+')');
  X.removeCreature(bk);}

// ---- 4. the herd ----
console.log('the herd');
{let sx=0,sz=0;const c0=X.cellOf(0);for(let r=5;r<60&&!sx;r+=2)for(let a=0;a<24&&!sx;a++){const x=Math.cos(a/24*Math.PI*2)*r*20+300,z=Math.sin(a/24*Math.PI*2)*r*20,h=X.groundAt(x,z);if(h<-12&&h>-40&&Math.abs(X.groundAt(x+12,z)-h)<3&&Math.abs(X.groundAt(x,z+12)-h)<3)sx=x,sz=z;}
  check(!!sx,'a flat stretch of the shelf ('+sx.toFixed(0)+', '+sz.toFixed(0)+')');
  if(sx){X.at(sx,sz);clearAll();X.setClock(noon);const hch=X.chunkIJ(X.cellOf(sx),X.cellOf(sz)),fl=X.groundAt(sx,sz);
    const herd=[[0,0],[6,0],[12,0],[18,0],[24,0]].map(([dx,dz])=>{const c=X.spawn(hch,'grazer',X.V3(sx+dx,X.groundAt(sx+dx,sz+dz)+1.5,sz+dz),Math.random,{ent:-1});c.home.copy(c.pos);c.hunger=0;c.state='wander';c.scanT=0.3*Math.random();return c;});
    P.pos.set(sx-40,fl+3,sz);hold();frames(60*2,()=>{P.pos.set(sx-40,fl+3,sz);hold();});
    check(herd.every(c=>c.fleeT===0&&!c.threat),'a herd of five in a row, 6 m apart, at rest with nothing near');
    const at=[];const k=frames(60*4,i=>{P.pos.set(herd[0].pos.x-3,fl+3,sz);P.vel.set(1.6,0,0);herd.forEach((c,j)=>{if(at[j]===undefined&&c.threat)at[j]=i/60;});return herd.every(c=>c.threat);});
    check(k>=0,'the player comes at the first: every one takes fright ('+at.map(v=>v===undefined?'-':v.toFixed(2)).join(', ')+' s)');
    check(at[4]!==undefined&&at[4]>at[0]&&herd[4].pos.distanceTo(P.pos)>8,'the last, '+herd[4].pos.distanceTo(P.pos).toFixed(0)+' m off and past its own notice, on its neighbours\' call, later than the first');
    let away=0;const p0=herd.map(c=>c.pos.clone());frames(60*1,()=>{P.pos.set(herd[0].pos.x-3,fl+3,sz);hold();});herd.forEach((c,j)=>{if(c.pos.x>p0[j].x)away++;});
    check(away>=4,'and they run from it ('+away+' of 5 farther off in a second)');
    P.pos.set(sx-300,fl+3,sz);hold();const calm=frames(60*20,()=>{P.pos.set(sx-300,fl+3,sz);hold();return herd.every(c=>c.fleeT===0&&!c.threat);});
    check(calm>=0,'the threat gone, the alarm dies out ('+(calm/60).toFixed(1)+' s)');
    for(const c of herd)X.removeCreature(c);}}

// ---- 5. the abyssal's forays ----
console.log('the abyssal');
{let ax=0,az=0;for(let r=1500;r<12000&&!ax;r+=250)for(let a=0;a<32;a++){const x=Math.cos(a/32*Math.PI*2)*r,z=Math.sin(a/32*Math.PI*2)*r;if(X.groundAt(x,z)<-1100){ax=x;az=z;break;}}
  check(!!ax,'deep water for it');
  if(ax){X.at(ax,az);const ach=X.chunkIJ(X.cellOf(ax),X.cellOf(az)),a=X.spawn(ach||ch,'abyssal',X.V3(ax,-420,az),Math.random,{ent:-1});a.home.set(ax,-420,az);
    let deep=0,n=0,low=0,bad=0;for(let i=0;i<400;i++){X.setWander(a);const fh=X.groundAt(a.wander.x,a.wander.z);if(fh>=X.OXY.top)continue;n++;if(a.wander.y<a.home.y-X.FORAY.dy[0]+1)deep++;low=Math.min(low,a.wander.y);if(a.wander.y<Math.max(fh+X.FORAY.off,X.FORAY.deep)-1e-6)bad++;}
    check(n>100&&deep/n>0.15&&deep/n<0.35,'over the deep, '+(100*deep/n).toFixed(0)+'% of its wanders are forays '+X.FORAY.dy[0]+' m and more below its home ('+n+')');
    check(bad===0&&low>=X.FORAY.deep-1e-6,'never past '+X.FORAY.deep+' or its floor (its lowest '+low.toFixed(0)+')');
    const r=X.spawn(ach||ch,'ridge',X.V3(ax,-420,az),Math.random,{ent:-1});r.home.set(ax,-420,az);let rl=0;for(let i=0;i<200;i++){X.setWander(r);rl=Math.min(rl,r.wander.y);}
    check(rl>=-420,'a ridge over the same water keeps above the minimum ('+rl.toFixed(0)+')');X.removeCreature(a);X.removeCreature(r);}}

// ---- 6. the chase paid from stamina ----
console.log('the chase');
{const sx=330,sz=60;X.at(sx,sz);clearAll();X.setClock(noon);const cch=X.chunkIJ(X.cellOf(sx),X.cellOf(sz)),y=-40;
  const r=X.spawn(cch,'ridge',X.V3(sx,y,sz),Math.random,{ent:-1});r.home.set(sx,y,sz);r.hunger=1;r.cool=0;r.scanT=0;r.awake=1;
  const S=X.STAMINA.slowbloods;let gx=sx+16;P.pos.set(gx,y,sz);P.vel.set(0,0,0);
  const ch0=frames(60*4,()=>{P.pos.set(gx,y,sz);P.vel.set(2,0,0);return r.state==='chase';});
  check(ch0>=0,'a starving ridge takes on the player 16 m off ('+r.state+')');
  let top=0,t0=-1,gone=-1,stamAt=1;const lead=16;
  frames(60*30,i=>{const ahead=r.pos.x+lead;gx=Math.max(gx,ahead);P.pos.set(gx,y,sz);P.vel.set(3,0,0);const v=Math.hypot(r.vel.x,r.vel.z);if(i<60*4)top=Math.max(top,v);if(r.state!=='chase'&&gone<0){gone=i/60;stamAt=X.stamOf(r);return true;}});
  check(top>D.ridge.speed*1.3,'it sprints: '+top.toFixed(1)+' m/s against its speed '+D.ridge.speed.toFixed(1)+' (× 1 + '+X.CHASE.slowbloods+' while its stamina lasts)');
  check(gone>S.full&&gone<S.full+S.fade+6&&stamAt<=X.CHASE.give+0.01,'kept '+lead+' m ahead, it is spent and gives up at '+gone.toFixed(1)+' s (its stamina '+stamAt.toFixed(2)+'; a slowblood\'s '+S.full+' s and '+S.fade+' more)');
  const s0=X.stamOf(r);frames(60*10,()=>{P.pos.set(sx+300,y,sz);hold();});
  check(X.stamOf(r)>s0+0.15,'and gets its breath back resting ('+s0.toFixed(2)+' → '+X.stamOf(r).toFixed(2)+' in 10 s)');
  X.removeCreature(r);}

try{fs.unlinkSync(tmp);}catch(e){}
console.log(fails?'slowbloods: '+fails+' FAILED':'slowbloods: ok');process.exit(fails?1:0);
