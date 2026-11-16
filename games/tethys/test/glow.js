// Headless bioluminescence check (v11.160, PLANKTON.md §8, POLISH 15; fx.js SPK, world.js FLASH): the flashers' stock where the doc puts it — faint in
// island water, little in the gyre, more on the fed flank, at the surface and gone by the mixed layer's base — and its pulse a few days behind the gold's;
// then the sparks' four rules in the running game: none by day (the clock, not the light), none from a body swimming slowly, a line from a sprint, a
// second pass through the same water dimmer (fatigue) and the water rested again after a few minutes; a struggle's burst; no NaN; the cost. It proves
// the rules; it says nothing about how the light looks.
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
let js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n');
js+='\nglobal.__gl={sample,plank,flashAt,flashK,flashC,FLASH,FLASH_P,FOG_B,PLK,bloomTick,updateSky,updateSparks,sparkBurst,SPK,SK_N,FLOW,SKY,creatures,CURV,litK,player,camera,DAY_H,SOLAR_H0,CUR_A,'+
  'setClock:h=>{clockH=h;TIDE=tideAt(h);},setT:v=>{t=v;},getT:()=>t,tide:()=>TIDE,setFlow:n=>{flowN=n;},live:()=>skLive,pos:()=>skP,ground:(x,z)=>groundAt(x,z),'+
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
const T=v=>+v.toFixed(3);
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
console.log('the sparks');
const P=G.player,[fx,fz]=sites.flank;let tide=0,fy=0;
const night=()=>{G.setClock(G.DAY_H*13+((0-G.SOLAR_H0)%G.DAY_H+G.DAY_H)%G.DAY_H);G.bloomTick();G.updateSky(0.016);}; // a new moon's midnight
const noon=()=>{G.setClock(G.DAY_H*13+((15-G.SOLAR_H0)%G.DAY_H+G.DAY_H)%G.DAY_H);G.bloomTick();G.updateSky(0.016);};
// the player at speed U along +x from x0 for sec seconds (v11.160.1: the sources are the bodies themselves), returns the sparks made; the creatures held still so only it fires
const still=()=>{for(const c of G.creatures)c.vel.set(0,0,0);G.CURV.set(0,0,0);};
const swim=(x0,U,sec,dir)=>{still();const n0=G.SPK.n,dt=1/60,d=dir||1;for(let k=0;k<sec*60;k++){P.pos.set(x0+d*U*k*dt,fy,fz);P.vel.set(d*U,0,0);P.sub=1;G.setT(G.getT()+dt);G.updateSparks(dt);}P.vel.set(0,0,0);return G.SPK.n-n0;};
night();tide=G.tide();fy=Math.max(tide-6,G.ground(fx,fz)+3);G.load(fx,fz);P.pos.set(fx,fy,fz);G.camera.position.set(fx,fy+2,fz+8); // 6 m under the night's tide
noon();ok(G.SPK.nightK===0&&swim(fx-40,8,1)===0,'noon: a sprint fires nothing (the clock\'s gate '+G.SPK.nightK+')');
night();G.updateSparks(0.016);ok(G.SPK.nightK>0.99,'a new moon\'s midnight: the gate open ('+T(G.SPK.nightK)+'), the stock\'s light here '+T(G.SPK.gS));
G.setT(G.getT()+1000);
const slow=swim(fx-40,0.8,1);ok(slow===0,'a body at 0.8 m/s fires nothing');
G.setT(G.getT()+1000);
const cruise=swim(fx-40,2.2,1),sprint=(G.setT(G.getT()+1000),swim(fx-40,8,1));
ok(sprint>40,'a sprint at 8 m/s: '+sprint+' sparks a second');ok(cruise<0.2*sprint,'a school\'s pace (2.2 m/s): '+cruise+', under a fifth of it');
// fatigue: back along the same 8 m of water at once, then again after the rest
G.setT(G.getT()+1000);const p1=swim(fx-40,8,1),p2=swim(fx-32,8,1,-1);G.setT(G.getT()+5*G.SPK.rest);const p3=swim(fx-40,8,1);
ok(p2<0.8*p1,'the second pass through the same water dimmer: '+p1+' then '+p2);ok(p3>0.85*p1,'and rested after five times SPK.rest: '+p3);
// lit: what a hunter sees (creatures_ai.js litK)
{G.setT(G.getT()+1000);swim(fx-40,8,1);const lit=P.lit,k=G.litK(P);swim(fx-40,0.5,3);ok(lit>0.8&&k>2,'a sprint lights the player ('+T(lit)+'): a hunter\'s eyes reach ×'+T(k));ok(P.lit<0.05,'and the light goes when it slows ('+T(P.lit)+')');}
// the current's own shear: no body moving, the stream at 1 m/s round the camera
{G.setT(G.getT()+1000);still();const n0=G.SPK.n;for(let k=0;k<60;k++){G.CURV.set(1,0,0);G.updateSparks(1/60);}const nc=G.SPK.n-n0;G.CURV.set(0,0,0);ok(nc>10&&nc<120,'a 1 m/s stream twinkles round the camera with nothing moving: '+nc+' in a second');}
// a struggle
G.setT(G.getT()+1000);{const n0=G.SPK.n;G.sparkBurst(fx+20,fy,fz,1);const nb=G.SPK.n-n0;noon();const n1=G.SPK.n;G.updateSparks(0.016);G.sparkBurst(fx+20,fy,fz,1);ok(nb>3&&G.SPK.n===n1,'a struggle at night: '+nb+' sparks; at noon none');night();}
// the live ones: finite, in the water, gone after their life
{G.updateSparks(0.016);const p=G.pos();let nan=0,air=0;for(let i=0;i<G.SK_N;i++){if(p[i*3]!==p[i*3]||p[i*3+1]!==p[i*3+1])nan++;if(p[i*3+1]>tide+0.5)air++;}ok(nan===0&&air===0,'no NaN and none in the air ('+G.live()+' alive)');
  for(let k=0;k<120;k++)G.updateSparks(1/60);ok(G.live()===0,'all gone two seconds after the last');}
// the cost: a sprint and a struggle every half second at the flank at night, every creature moving at 2 m/s
{G.setT(G.getT()+1000);for(const c of G.creatures)c.vel.set(2,0,0);let ns=0n,n=0;for(let k=0;k<600;k++){P.pos.set(fx-40+8*k/60,fy,fz);P.vel.set(8,0,0);if(k%30===0)G.sparkBurst(P.pos.x,fy,fz,1);const t0=process.hrtime.bigint();G.updateSparks(1/60);ns+=process.hrtime.bigint()-t0;n++;G.setT(G.getT()+1/60);}still();
  const ms=Number(ns)/n/1e6;console.log('  cost: updateSparks '+ms.toFixed(3)+' ms a frame, '+G.live()+' alive (this machine, headless)');ok(ms<0.3,'under 0.3 ms a frame headless');}
console.log(failed?'glow: FAILED':'glow: ok');
process.exit(failed?1:0);
