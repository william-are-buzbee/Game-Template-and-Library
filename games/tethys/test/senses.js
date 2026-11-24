// test/senses.js — the senses (v11.229; BEHAVIOUR.md §4, pass 1). The step's own sky (clockTick: the moon, the eclipses, dayK, the surface's light
// lg0); sight by the light at the body seen (sightOf: an eye's two numbers, the silhouette against the light above, a still body seen late, a body that
// matches its ground or is buried, the weed's cover); the lateral line (hearOf: light-blind, silent for a still body); notices, the two together; scent
// down the current (plumeK: blood and carrion from further below their source, hardly at all above it); prey with the same senses (a school notices a
// hunter in the light, not in the dark unless it moves close); a cryptic grazer that freezes, its valves clamped, and bolts when the threat is close; the
// pall's cloud in the step whatever the effects list says. The whole bundle against the stub, as test/clock.js. `node test/senses.js`.
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
let js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n');
js+='\nglobal.__sn={CK,clockTick,SENSE,SCENT,FREEZE,REST,DEFS,EYE_K,sightOf,hearOf,notices,scentFrom,plumeK,weedAt,coverOf,currentAt,spawn,removeCreature,creatures,schools,makeSchool,player,choose,faceQ,V3,groundAt,cellOf,chunkIJ,'
  +'phoStep,phoCloud,PHO,PHO_C,holds,FX,updateCreatures,updateSchools,mulberry,'
  +'at(x,z){player.pos.set(x,-60,z);cellsAround();},get t(){return t;},setT(v){t=v;},setClock(h){clockH=h;TIDE=tideAt(h);clockTick();}};';
const tmp=path.join(require('os').tmpdir(),'tethys_senses_'+process.pid+'.js');
fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
process.env.PICK='0';
require('./stub.js');require(tmp);fs.unlinkSync(tmp);
const X=global.__sn;let fails=0;const AT=[900,0];X.at(AT[0],AT[1]);
Math.random=X.mulberry(37);
function check(ok,msg){if(!ok){fails++;console.error('  FAIL '+msg);}else console.log('  ok   '+msg);}
const dt=1/60,P=X.player,D=X.DEFS;let ch=X.chunkIJ(X.cellOf(AT[0]),X.cellOf(AT[1]));
function frames(n,each){for(let i=0;i<n;i++){X.setT(X.t+dt);X.updateSchools(dt);X.updateCreatures(dt);if(each&&each(i))return i;}return -1;}
function clearAll(){for(const c of X.creatures.slice())X.removeCreature(c);X.schools.length=0;}
function put(kind,pos,hunger){const c=X.spawn(ch,kind,pos,Math.random,{ent:-1});c.hunger=hunger;c.cool=0;c.scanT=0;c.home.copy(pos);return c;}
X.choose(1);P.dead=false;P.pos.set(AT[0],-60,AT[1]);
const Y=-55,f2=v=>v.toFixed(2);
// the sky's hours: noon, a moonless midnight, a full-moon night
let noon=0,hi=-2,dark=-1,moon=-1;for(let h=0;h<600;h+=0.05){X.setClock(h);if(h<30&&X.CK.sun>hi){hi=X.CK.sun;noon=h;}if(dark<0&&X.CK.night>0.99&&X.CK.moonK<0.002)dark=h;if(moon<0&&X.CK.night>0.99&&X.CK.moonK>0.6)moon=h;}

// ---- 1. the step's sky ----
console.log('the sky in the step');
X.setClock(noon);const n0=X.CK.lg0,dk=X.CK.dayK;X.setClock(dark);const d0=X.CK.lg0;
check(dk>0.95&&n0>-0.3,'noon: dayK '+f2(dk)+', the surface\'s light log10 '+f2(n0)+' of noon\'s');
check(dark>=0&&d0<-7&&X.CK.dayK<0.01,'a moonless midnight: log10 '+f2(d0)+' (starlight, world.js LIGHT_P)');
if(moon>=0){X.setClock(moon);check(X.CK.lg0>-5.6&&X.CK.lg0<-4.8,'a full-moon night: log10 '+f2(X.CK.lg0)+' (the moon, ~1e-5 of noon)');}

// ---- 2. sight by light ----
console.log('sight');
clearAll();P.pos.set(AT[0],Y,AT[1]);const rg=put('ridge',P.pos.clone(),0);rg.pos.x+=40;
const view=(h,v)=>{X.setClock(h);P.vel.set(v,0,0);return X.sightOf(D.ridge,rg.pos.y,P,40);};
const sNoon=view(noon,2),sDark=view(dark,2),sStill=view(noon,0),stillK=Math.min(1,X.SENSE.still+X.SENSE.big*P.clade.size);
view(noon,2);check(sNoon>0.9&&X.notices(D.ridge,rg.pos.y,P,40,D.ridge.detect),'at noon at −55 a ridge sees a swimming finback 40 m off ('+f2(sNoon)+' of its '+D.ridge.detect+' m)');
view(dark,2);check(sDark<0.6&&!X.notices(D.ridge,rg.pos.y,P,40,D.ridge.detect),'at a moonless midnight it does not: starlight at −55 gives its eyes '+f2(sDark)+' of the reach ('+(sDark*D.ridge.detect).toFixed(0)+' m)');
check(Math.abs(sStill/sNoon-stillK)<0.02,'holding still, the finback is seen at '+f2(stillK)+' of the reach ('+f2(sStill)+')');
X.setClock(dark);P.vel.set(2,0,0);const hr=X.hearOf(D.ridge,P);check(hr>4&&X.notices(D.ridge,rg.pos.y,P,hr*0.9,D.ridge.detect),'in the dark it feels a swimming finback within '+hr.toFixed(1)+' m (its lateral line)');
P.vel.set(0,0,0);const sd=X.sightOf(D.ridge,rg.pos.y,P,12)*D.ridge.detect;check(X.hearOf(D.ridge,P)===0&&!X.notices(D.ridge,rg.pos.y,P,12,D.ridge.detect),'and nothing of one holding still 12 m off: silent, and seen only within '+sd.toFixed(1)+' m');
// the silhouette: at dusk's light, one above is seen further than one below
{X.setClock(dark);P.vel.set(2,0,0);const up=X.sightOf(D.ridge,Y-20,P,20),dn=X.sightOf(D.ridge,Y+20,P,20);
  check(up>dn*1.3,'on a moonless night a body over the eye is a silhouette against the stars: seen at '+f2(up)+' from under it, '+f2(dn)+' from over it');}
// the eyes: a night hunter's see in the dark further than a day fish's; the deep's further still
X.setClock(dark);P.vel.set(2,0,0);const eDay=X.sightOf(D.grazer,Y,P,10),eNight=X.sightOf(D.eel,Y,P,10),eDeep=X.sightOf(D.abyssal,Y,P,10);
check(eNight>eDay&&eDeep>eNight,'at a moonless midnight at −55: a grazer\'s eyes '+f2(eDay)+', the eel\'s (a night hunter\'s) '+f2(eNight)+', the abyssal\'s (the deep\'s) '+f2(eDeep));
check(D.jelly.eye===undefined&&X.sightOf(D.jelly,Y,P,1)===0,'a drifter has no eyes');

// ---- 3. what is seen: the ground, the sand, the weed ----
console.log('crypsis and cover');
X.setClock(noon);clearAll();const g1=put('grazer',X.V3(AT[0]+5,Y,AT[1]),0),g2=put('grazer',X.V3(AT[0]+5,Y,AT[1]+3),0);g1.vel.set(2,0,0);g2.vel.set(2,0,0);g1.crypt=0.25;g2.crypt=0.95;
check(X.sightOf(D.ridge,Y,g2,20)<X.sightOf(D.ridge,Y,g1,20)*0.75,'a grazer that matches its ground is seen at '+f2(X.sightOf(D.ridge,Y,g2,20))+' against the countershaded type\'s '+f2(X.sightOf(D.ridge,Y,g1,20)));
g1.sink=X.REST.bury;check(X.sightOf(D.ridge,Y,g1,20)<=0.4*1.001,'one under the sand at '+f2(X.sightOf(D.ridge,Y,g1,20)));g1.sink=1;
// the weed: the shelf's forest (the start's cells, 330, 0)
X.at(330,0);let wx=null;for(let r=0;r<200&&!wx;r+=10)for(let a=0;a<16&&!wx;a++){const x=330+Math.cos(a*0.39)*r,z=Math.sin(a*0.39)*r;if(X.weedAt(x,z)>0.7)wx=[x,z];}
check(!!wx,'a point in the weed forest ('+(wx?wx.map(v=>v.toFixed(0)).join(', '):'none')+', the canopy\'s envelope '+(wx?f2(X.weedAt(wx[0],wx[1])):'-')+')');
if(wx){P.pos.set(wx[0],X.groundAt(wx[0],wx[1])+4,wx[1]);P.vel.set(2,0,0);X.setT(X.t+2);const cv=X.coverOf(P),sIn=X.sightOf(D.ridge,P.pos.y,P,20);P.pos.set(AT[0],Y,AT[1]);X.setT(X.t+2);X.coverOf(P);
  check(cv>0.7&&sIn<0.75,'the player among the stalks: cover '+f2(cv)+', seen at '+f2(sIn));}
X.at(AT[0],AT[1]);ch=X.chunkIJ(X.cellOf(AT[0]),X.cellOf(AT[1]));

// ---- 4. scent down the current ----
console.log('scent');
{let best=null,bw=0;for(let dx=-200;dx<=200;dx+=25)for(let dz=-200;dz<=200;dz+=25)for(const y of [-20,-60,-100]){const v=X.currentAt(AT[0]+dx,AT[1]+dz,y,X.V3()),w=Math.hypot(v.x,v.y,v.z);if(w>bw&&X.groundAt(AT[0]+dx,AT[1]+dz)<y-5){bw=w;best=[AT[0]+dx,y,AT[1]+dz];}}
  if(best&&bw>X.SCENT.v){clearAll();const sn=put('ridge',X.V3(best[0],best[1],best[2]),0);X.scentFrom(sn);const cu=X.currentAt(best[0],best[2],best[1],X.V3()).normalize();
    const up=X.V3(best[0]-cu.x*30,best[1]-cu.y*30,best[2]-cu.z*30),down=X.V3(best[0]+cu.x*30,best[1]+cu.y*30,best[2]+cu.z*30);
    const kU=X.plumeK(sn,up,30),kD=X.plumeK(sn,down,30);
    check(kU>1.5&&kD<0.3,'where the current runs at '+bw.toFixed(2)+' m/s: a source up the current is smelt from '+f2(kU)+' × its reach, one down it from '+f2(kD)+' ×');}
  else check(false,'a place with a current over '+X.SCENT.v+' m/s near ('+AT+') (the strongest '+bw.toFixed(2)+')');}

// ---- 5. prey with the same senses ----
console.log('prey');
for(const [h,name,near] of [[noon,'noon',false],[dark,'a moonless midnight',true]]){clearAll();X.setClock(h);P.pos.set(AT[0]+300,Y,AT[1]);P.vel.set(0,0,0);
  const it=X.makeSchool(ch,'darter',X.V3(AT[0],Y,AT[1]),6,Math.random,{ent:-1});while(!it.next().done);const sc=X.schools[X.schools.length-1];
  const r2=put('arrow',X.V3(AT[0]+9,Y,AT[1]),0);r2.vel.set(1.5,0,0);sc.scanT=0;frames(30,()=>{r2.vel.set(1.5,0,0);r2.pos.set(AT[0]+9,Y,AT[1]);});
  check(near?sc.threat===null:sc.threat===r2.pos,'at '+name+' a darter school '+(near?'does not see':'sees')+' an arrow (its hunter) swimming 9 m off ('+(sc.threat===r2.pos?'its threat':'none')+')');}
X.setClock(noon);clearAll();P.pos.set(AT[0],Y,AT[1]);const sq=put('scuttle',X.V3(AT[0]+8,X.groundAt(AT[0]+8,AT[1])+0.5,AT[1]),0);sq.state='wander';P.pos.set(sq.pos.x-6,sq.pos.y+1,sq.pos.z);
let froze=0,n=0;frames(60*2,()=>{P.vel.set(1.6,0,0);P.pos.set(sq.pos.x-6,sq.pos.y+1,sq.pos.z);n++;if(sq.threat&&sq.vel.length()<0.3&&sq.st.soft===1)froze++;});
check(D.scuttle.freeze===true&&froze>n*0.5,'a scuttle with the player 6 m off holds still, valves clamped ('+(100*froze/n).toFixed(0)+'% of 2 s)');
const x0=sq.pos.x;frames(60*1.5,()=>{P.vel.set(1.6,0,0);P.pos.set(sq.pos.x-2.5,sq.pos.y+0.5,sq.pos.z);});
check(sq.pos.x>x0+0.8&&sq.st.soft===undefined,'and bolts when the player is 2.5 m off ('+(sq.pos.x-x0).toFixed(1)+' m away in 1.5 s, valves open)');

// ---- 6. the pall's cloud in the step ----
console.log('the pall');
clearAll();X.setClock(dark);const pa=put('pall',X.V3(AT[0],-120,AT[1]),0);X.FX.biolum=false;const h={a:P,b:pa};X.holds.push(h);P.pos.set(pa.pos.x-6,pa.pos.y,pa.pos.z);
for(let i=0;i<60;i++)X.phoStep(dt);X.holds.splice(X.holds.indexOf(h),1);X.FX.biolum=true;
check(pa.lumD>80&&(pa.wander.x-pa.pos.x)>10,'a pall held a second with the effects list\'s bioluminescence off: its cloud (dark for '+Math.round(pa.lumD)+' s) and its flee from the holder ('+(pa.wander.x-pa.pos.x).toFixed(0)+' m on)');

try{fs.unlinkSync(tmp);}catch(e){}
console.log(fails?'senses: '+fails+' FAILED':'senses: ok');process.exit(fails?1:0);
