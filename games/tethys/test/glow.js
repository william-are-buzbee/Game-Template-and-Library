// Headless bioluminescence check (v11.160, PLANKTON.md §8, POLISH 15; fx.js SPK, world.js FLASH; the wake struck v11.162 — its stock kept as a kit and checked here,
// the sparks' pool now the carcasses' and the dusk displays'): the flashers' stock where the doc puts it — faint in
// island water, little in the gyre, more on the fed flank, at the surface and gone by the mixed layer's base — and its pulse a few days behind the gold's;
// then the sparks' four rules in the running game: none by day (the clock, not the light), none from a body swimming slowly, a line from a sprint, a
// second pass through the same water dimmer (fatigue) and the water rested again after a few minutes; a struggle's burst; no NaN; the cost. It proves
// the rules; it says nothing about how the light looks.
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
let js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n');
js+='\nglobal.__gl={spawn,chunkAt,mulberry,stepRigs,hitFx,holds,lightPhys,phoGate,PHO,PHO_C,PHO_F,PHO_B,PHO_CL,PHO_L,FX,OXY,ORIGIN,sample,plank,flashAt,flashK,flashC,FLASH,FLASH_P,FOG_B,PLK,bloomTick,updateSky,updateSparks,sparkBurst,SPK,SK_N,FLOW,SKY,creatures,CURV,FI,bactGlow,bactSee,BACT,BACT_L,dspGate,dspHab,DSP,DSP_S,MILKY,MILKY_P,milkyPulse,updateNightLights,carcasses,kill,findCarcass,FOG_SKF,DAY_S,MOONL,V3,player,camera,DAY_H,SOLAR_H0,CUR_A,'+
  'setClock:h=>{clockH=h;TIDE=tideAt(h);},setT:v=>{t=v;},getT:()=>t,tide:()=>TIDE,setFlow:n=>{flowN=n;},live:()=>skLive,alpha:()=>skG,pos:()=>skP,ground:(x,z)=>groundAt(x,z),'+
  'load:(x,z)=>{const ci=cellOf(x),cj=cellOf(z);for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++)if(gridIn(ci+di,cj+dj))loadChunkNow(ci+di,cj+dj);}};';
const tmp=path.join(require('os').tmpdir(),'tethys_glow_bundle.js');
fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
process.env.PICK='1';
require('./stub.js');
require(tmp);
const h=global.__h;
for(let i=0;i<30;i++)__step(1);
h['mnew:click'][0]();h['mfounders:click'][0]({target:{dataset:{id:'fin'}}}); // the menu's new game, the finback
for(let i=0;i<30;i++)__step(1);
const G=global.__gl;let failed=false;
function ok(c,msg){console.log((c?'  ok   ':'  FAIL ')+msg);if(!c)failed=true;}
const T=v=>+v.toFixed(3),smooth01=u=>{const x=Math.min(1,Math.max(0,u));return x*x*(3-2*x);};
// ---------- the stock ----------
console.log('the flashers\' stock (the light it gives, 0..1, at 2 m; the clock at boot, no storm behind it)');
G.setClock(0);G.bloomTick();
const at=(a,r)=>[Math.round(Math.cos(a)*r),Math.round(Math.sin(a)*r)];
const sites={flank:at(5.44,900),shelf:at(0.75,600),lagoon:at(1.0,100),basin:[4000,4000]};
const L={};for(const k in sites){const [x,z]=sites[k],tide=G.tide();L[k]=G.flashK(G.flashAt(x,tide-2,z));console.log('  '+k.padEnd(8)+String(x).padStart(6)+String(z).padStart(7)+'  '+T(L[k]));}
ok(L.basin<0.06,'the gyre all but dark ('+T(L.basin)+')');
ok(L.shelf>0.04&&L.shelf<0.3,'island water a faint sparkle ('+T(L.shelf)+')');
ok(L.flank>2*L.shelf&&L.flank<0.85,'the fed flank brighter ('+T(L.flank)+')');
{const [x,z]=sites.flank,tide=G.tide(),s2=G.flashAt(x,tide-2,z),s30=G.flashAt(x,tide-30,z),s80=G.flashAt(x,tide-80,z);
  ok(s30<s2&&s80<0.15*s2,'at the surface, gone by the mixed layer\'s base (2 m '+T(s2)+', 30 m '+T(s30)+', 80 m '+T(s80)+')');}
// the lagged pulse: over 120 days, the lag at which the flashers' pulse best follows the gold's
{const step=2,N=Math.floor(120*G.DAY_H/step),gold=new Float64Array(N),fl=new Float64Array(N);let nan=0,mx=0;
  for(let i=0;i<N;i++){G.setClock(i*step);G.bloomTick();gold[i]=G.FOG_B[2];fl[i]=G.FLASH_P[0];if(fl[i]!==fl[i])nan++;mx=Math.max(mx,fl[i]);}
  const mean=a=>a.reduce((s,v)=>s+v,0)/a.length,mg=mean(gold),mf=mean(fl);let best=-2,bl=0;
  for(let lag=0;lag<=8*G.DAY_H/step;lag++){let sxy=0,sxx=0,syy=0;for(let i=0;i+lag<N;i++){const a=gold[i]-mg,b=fl[i+lag]-mf;sxy+=a*b;sxx+=a*a;syy+=b*b;}const r=sxy/Math.sqrt(sxx*syy+1e-12);if(r>best){best=r;bl=lag;}}
  const days=bl*step/G.DAY_H;ok(nan===0&&mx<G.PLK.storm*3,'the flashers\' pulse finite and bounded (at most '+T(mx)+')');
  ok(days>=1.5&&days<=5,'it follows the gold\'s by '+days.toFixed(1)+' days (r '+T(best)+')');
  G.setClock(0);G.bloomTick();}
// ---------- the sparks in the game ----------
console.log('the wake (struck v11.162)');
const P=G.player,[fx,fz]=sites.flank;let tide=0,fy=0;
const night=()=>{G.setClock(G.DAY_H*13+((0-G.SOLAR_H0)%G.DAY_H+G.DAY_H)%G.DAY_H);G.bloomTick();G.updateSky(0.016);}; // a new moon's midnight
const noon=()=>{G.setClock(G.DAY_H*13+((15-G.SOLAR_H0)%G.DAY_H+G.DAY_H)%G.DAY_H);G.bloomTick();G.updateSky(0.016);};
night();tide=G.tide();fy=Math.max(tide-6,G.ground(fx,fz)+3);G.load(fx,fz);P.pos.set(fx,fy,fz);G.camera.position.set(fx,fy+2,fz+8); // 6 m under the night's tide
// v11.162: the wake is struck — a sprint at a new moon's midnight on the fed flank fires nothing (its kit, skBody and sparkBurst, uncalled)
{for(const c of G.creatures)c.vel.set(0,0,0);G.CURV.set(0,0,0);const n0=G.SPK.n;for(let k=0;k<60;k++){P.pos.set(fx-40+8*k/60,fy,fz);P.vel.set(8,0,0);P.sub=1;G.updateSparks(1/60);}P.vel.set(0,0,0);ok(G.SPK.n===n0,'the wake struck: a sprint at night fires nothing ('+(G.SPK.n-n0)+')');}
// ---------- the night's other lights (v11.161) ----------
console.log('glowing carcasses');
ok(G.bactGlow(0,1)===0&&G.bactGlow(0.6,1)>0.95&&Math.abs(G.bactGlow(0.6,0.5)-Math.SQRT1_2)<0.02&&G.bactGlow(0.6,0)===0,'the quorum and the flesh: dark at death, full by 0.6 days, √ of the flesh left, none on bones');
ok(G.bactSee(0.9)===0&&G.bactSee(0.035)===1,'shown only in the dark (noon in the shallows none, a moonless night full)');
{night();let c=null,bd=1e9;for(const o of G.creatures){if(!o.alive||o.dead||o.def.role==='swarm'||!o.def.size)continue;const d=Math.hypot(o.pos.x-fx,o.pos.z-fz);if(d<bd){bd=d;c=o;}}
  if(!c)ok(false,'no creature to kill');else{G.kill(c);const m0=c.fall?c.fall.m0:null;if(c.fall)c.fall.t0-=0.6;else c.deadT=0.6*G.DAY_S;G.camera.position.set(c.pos.x,c.pos.y+2,c.pos.z+8);
    const n0=G.SPK.n;for(let k=0;k<60;k++)G.updateNightLights(1/60);const nc=G.SPK.n-n0,L=G.BACT_L[0];
    ok(c.glow>0.5&&nc>3,'a '+c.kind+' dead 0.6 days glows '+T(c.glow)+': '+nc+' glow points in a second');ok(L.intensity>0.3&&Math.hypot(L.x-c.pos.x,L.z-c.pos.z)<0.01,'and holds a light ('+T(L.intensity)+')');
    const sc={pos:G.V3(c.pos.x+30,c.pos.y,c.pos.z)};ok(G.findCarcass(sc,20)===c,'a scavenger 30 m off finds it within a 20 m look (the glow carries)');
    noon();const n1=G.SPK.n;for(let k=0;k<30;k++)G.updateNightLights(1/60);ok(G.SPK.n===n1||G.SKY.skyLw*1<0.3,'at noon none shown (its glow '+T(c.glow)+' is there, the water too bright to see it)');night();}}
console.log('the dusk displays (struck v11.162.1; their window and floor kept as a kit)');
const deg=d=>Math.sin(d*Math.PI/180);
ok(G.dspGate(0,0)===0&&G.dspGate(deg(-15),0)>0.99&&G.dspGate(deg(-35),0)===0&&G.dspGate(deg(-15),0.5)===0,'the window: none at sunset, full at −15°, gone by −35°, none under a moon half up');
ok(G.dspHab(-5,0)>0.99&&G.dspHab(-130,0)===0&&G.dspHab(2,0)===0&&Math.abs(G.dspHab(-5,1)-0.3)<0.01,'the floor: shallow sheltered, not the deep, not land, little in the surf');
{let lx=0,lz=0,hb=0;for(let r=200;r<=2400&&hb<0.8;r+=50)for(let a=0;a<6.28&&hb<0.8;a+=0.1){const x=Math.cos(a)*r,z=Math.sin(a)*r,sm=G.sample(x,z),hh=G.dspHab(sm.h,sm.f[G.FI.expo]);if(hh>hb){hb=hh;lx=Math.round(x);lz=Math.round(z);}} // the first shallow sheltered floor out from ours
  console.log('  the displays\' floor at '+lx+', '+lz+' ('+T(hb)+')');let best=null;for(let lh=21;lh<28;lh+=0.05){G.setClock(G.DAY_H*13+((lh-G.SOLAR_H0)%G.DAY_H+G.DAY_H)%G.DAY_H);G.updateSky(0.016);if(Math.abs(G.SKY.sunAlt-deg(-15))<0.01){best=lh;break;}}
  G.load(lx,lz);const ly=Math.max(G.ground(lx,lz)+1,G.tide()-3);G.camera.position.set(lx,ly,lz);for(const S of G.DSP_S)S.on=false;
  const n0=G.SPK.n;let up=0,tot=0;for(let k=0;k<1200;k++){G.setT(G.getT()+1/60);G.updateSparks(1/60);if(k%30===0)for(const S of G.DSP_S)if(S.on){tot++;if(S.dy>0.9)up++;}}
  const nd=G.SPK.n-n0;ok(G.DSP.on===false&&nd===0,'struck (v11.162.1): a new moon\'s dusk over shallow sheltered floor makes no pulses ('+nd+')');
  {const p=G.pos(),al=G.alpha();let nan=0,air=0;for(let i=0;i<G.SK_N;i++){if(al[i]<=0)continue;if(p[i*3]!==p[i*3]||p[i*3+1]!==p[i*3+1])nan++;if(p[i*3+1]>G.tide()+0.5)air++;}ok(nan===0&&air===0,'no NaN and none in the air ('+G.live()+' alive)');}
  {let ns=0n;for(let k=0;k<600;k++){G.setT(G.getT()+1/60);const t0=process.hrtime.bigint();G.updateSparks(1/60);ns+=process.hrtime.bigint()-t0;}const ms=Number(ns)/600/1e6;console.log('  cost: updateSparks (the displays and the carcasses) '+ms.toFixed(3)+' ms a frame, '+G.live()+' alive (this machine, headless)');ok(ms<0.3,'under 0.3 ms a frame headless');}
  G.setClock(G.DAY_H*0+((best-G.SOLAR_H0)%G.DAY_H+G.DAY_H)%G.DAY_H);G.updateSky(0.016);for(const S of G.DSP_S)S.on=false;const n1=G.SPK.n;for(let k=0;k<600;k++)G.updateNightLights(1/60);
  ok(G.SPK.n===n1,'a full moon\'s dusk: none (the moon\'s light '+T(G.SKY.moonL/G.MOONL)+')');night();}
console.log('milky seas');
{const years=10;let runs=0,on=false,nights=0,bad=0;for(let d=0;d<185*years;d++){const h=d*G.DAY_H+((0-G.SOLAR_H0)%G.DAY_H+G.DAY_H)%G.DAY_H,p=G.milkyPulse(h),m=smooth01((p-G.MILKY.on[0])/(G.MILKY.on[1]-G.MILKY.on[0]));if(!(m>=0&&m<=1))bad++;if(m>0.5){nights++;if(!on){runs++;on=true;}}else on=false;}
  ok(bad===0,'the strength within 0..1');ok(runs/years>=1&&runs/years<=8,(runs/years).toFixed(1)+' milky seas a year ('+nights+' nights in '+years+' years)');}
{const step=2,N=Math.floor(120*G.DAY_H/step),fl=new Float64Array(N),mk=new Float64Array(N);for(let i=0;i<N;i++){G.setClock(i*step);G.bloomTick();fl[i]=G.FLASH_P[0];mk[i]=G.MILKY_P[1];}
  const mean=a=>a.reduce((s,v)=>s+v,0)/a.length,mf=mean(fl),mm=mean(mk);let best=-2,bl=0;for(let lag=0;lag<=10*G.DAY_H/step;lag++){let sxy=0,sxx=0,syy=0;for(let i=0;i+lag<N;i++){const a=fl[i]-mf,b=mk[i+lag]-mm;sxy+=a*b;sxx+=a*a;syy+=b*b;}const r=sxy/Math.sqrt(sxx*syy+1e-12);if(r>best){best=r;bl=lag;}}
  ok(bl*step/G.DAY_H>=1.5,'it follows the flashers\' bloom by '+(bl*step/G.DAY_H).toFixed(1)+' days (the dying bloom\'s bacteria)');}
{let found=-1;for(let d=0;d<185*3&&found<0;d++){const h=d*G.DAY_H+((0-G.SOLAR_H0)%G.DAY_H+G.DAY_H)%G.DAY_H;G.setClock(h);G.bloomTick();if(G.MILKY_P[0]>0.6)found=h;}
  if(found<0)ok(false,'no milky night in three years');else{G.updateSky(0.016);G.updateNightLights(0.016);const mN=G.FOG_SKF[3];G.setClock(found+15);G.bloomTick();G.updateSky(0.016);G.updateNightLights(0.016);ok(mN>0.02&&G.FOG_SKF[3]<1e-6,'its midnight lights the water ('+T(mN)+'), its noon does not');}}
// ---------- the pall's lights (v11.163, BIOLUM.md §8; fx.js PHO, world.js lightPhys) ----------
console.log('the pall'+"'"+'s lights');
{const Lp=(alt,moon,dz)=>G.lightPhys(alt,moon,G.tide()+dz);
  ok(Math.abs(Lp(1,0,0)-1)<0.01&&Lp(deg(-6),0,0)<1e-4&&Lp(deg(-6),0,0)>1e-6,'the planet'+"'"+'s light: noon 1 at the surface, civil dusk '+Lp(deg(-6),0,0).toExponential(1));
  ok(Math.abs(Math.log10(Lp(1,0,-600))+10)<0.05&&Lp(-1,1,0)<2e-5&&Lp(-1,1,0)>5e-6&&Lp(-1,0,0)<2e-8,'tenfold every 60 m (noon at −600 '+Lp(1,0,-600).toExponential(1)+'); a full moon ~1e-5 of noon, starlight ~1e-8');}
{noon();const g5=G.phoGate(G.tide()-500),g6=G.phoGate(G.tide()-620);night();const n5=G.phoGate(G.tide()-500);
  ok(g5<0.15&&g6>0.95&&n5>0.99,'the web'+"'"+'s gate: noon at −500 '+T(g5)+' (the core'+"'"+'s top still lit for a deep eye), at −620 '+T(g6)+'; midnight at −500 '+T(n5));}
{const x=2400,z=-699;G.load(x,z);night();const y0=Math.max(G.tide()-560,G.ground(x,z)+12);const c=G.spawn(G.chunkAt(x,z),'pall',G.V3(x,y0,z),G.mulberry(5));G.camera.position.set(x,y0+3,z+30);
  const run=(s,f)=>{for(let k=0;k<s*60;k++){if(f)f(k);G.setT(G.getT()+1/60);G.updateNightLights(1/60);}};
  run(5);const nf=G.PHO_F.count,A=G.PHO_F.instanceMatrix.array,gl=G.PHO_F.geometry.attributes.aGl.array;let nan=0,far=0,mine=0;
  for(let i=0;i<nf;i++){for(let q=0;q<16;q++)if(!(A[i*16+q]===A[i*16+q]))nan++;const wx=A[i*16+12]+G.ORIGIN.x,wy=A[i*16+13],wz=A[i*16+14]+G.ORIGIN.z;if(Math.hypot(wx-c.pos.x,wy-c.pos.y,wz-c.pos.z)<14)mine++;if(!G.PHO_C.some(o=>Math.hypot(wx-o.pos.x,wy-o.pos.y,wz-o.pos.z)<14))far++;}
  ok(c.lumL>0.9&&mine===32,'a pall at '+Math.round(G.tide()-y0)+' m at midnight: the lure on ('+T(c.lumL)+'), 32 faces ('+mine+'): four on each of eight arms ('+G.PHO_C.length+' palls lit here, the ledger'+"'"+'s and this one)');
  ok(nan===0&&far===0&&gl[0]>0.4,'every face finite and on a pall'+"'"+'s arms ('+far+' off), the web at '+T(gl[0]));
  noon();const yS=c.pos.y;c.pos.y=c.g.position.y=G.tide()-505;run(5);ok(c.lumL<0.2,'at noon at −505 its web dims ('+T(c.lumL)+')');c.pos.y=c.g.position.y=yS;night();run(5);
  for(let k=0;k<10;k++)G.stepRigs(c,[],1/60);const q=c.b.rigs[0].chains[0],n=q.n;G.player.pos.set(q.pts[n*3],q.pts[n*3+1],q.pts[n*3+2]);run(0.1);
  ok(c.lumF>0.9,'touched at an arm'+"'"+'s tip: a flash ('+T(c.lumF)+')');G.player.pos.set(x,y0+40,z+60);run(2);ok(c.lumF<0.05,'gone two seconds after ('+T(c.lumF)+')');
  const P0=G.V3(c.pos.x-10,c.pos.y,c.pos.z);G.hitFx(c,{pos:P0},c.pos.clone(),5);const cl=G.PHO_CL.filter(s=>s.on).length,away=(c.wander.x-c.pos.x)*(c.pos.x-P0.x)>0;
  ok(cl===1&&c.lumD>89&&away,'bitten: a cloud ('+cl+'), dark for '+Math.round(c.lumD)+' s, heading away from the biter');
  run(3);ok(c.lumL<0.15&&G.PHO_B.count===G.PHO.cl.n&&G.PHO_L.intensity>0.3,'three seconds on: the pall dark ('+T(c.lumL)+'), the cloud'+"'"+'s '+G.PHO_B.count+' blobs glowing and lighting the water ('+T(G.PHO_L.intensity)+')');
  run(G.PHO.cl.life);ok(G.PHO_B.count===0,'the cloud gone after '+G.PHO.cl.life+' s');
  c.lumD=0;run(5);const h={a:G.player,b:c};G.holds.push(h);const n0=G.PHO_CL.filter(s=>s.on).length;run(0.3);const n1=G.PHO_CL.filter(s=>s.on).length;run(0.4);const n2=G.PHO_CL.filter(s=>s.on).length;G.holds.splice(G.holds.indexOf(h),1);
  ok(n1===n0&&n2===n0+1,'held: no cloud at 0.3 s, a cloud by 0.7 s ('+n0+' → '+n1+' → '+n2+')');
  c.lumD=0;G.FX.biolum=false;run(3);ok(G.PHO_F.count===0&&G.PHO_B.count===0,'bioluminescence off on the effects list: nothing drawn');G.FX.biolum=true;
  const c2=G.spawn(G.chunkAt(x,z),'pall',G.V3(x+30,y0,z),G.mulberry(6)),c3=G.spawn(G.chunkAt(x,z),'pall',G.V3(x-30,y0,z),G.mulberry(7));c.lumD=0;run(5);
  let ns=0n;for(let k=0;k<600;k++){G.setT(G.getT()+1/60);const t0=process.hrtime.bigint();G.updateNightLights(1/60);ns+=process.hrtime.bigint()-t0;}const ms=Number(ns)/600/1e6;
  console.log('  cost: updateNightLights with '+G.PHO_C.length+' palls lit ('+G.PHO_F.count+' faces) '+ms.toFixed(3)+' ms a frame (this machine, headless)');ok(ms<0.3,'under 0.3 ms');}
console.log(failed?'glow: FAILED':'glow: ok');
process.exit(failed?1:0);
