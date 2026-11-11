// region.js — the region as a plume's history (v11.94, GLOBE.md §9): the province's members are not placed but fall out of a plume run under the
// plate. The head's plateau; the tail's volcanoes born by the plume's pulse, scattered over its footprint and drawn onto old fracture zones; each
// member's rise and fall (the swell it rides off, the plate's cooling, flexure under every load, erosion and the waves' planing); the reef against
// Earth's sea level deciding its state; and, on a grid, the basins the ridges enclose with each one's sill. Pure data: no THREE, no page. Ours and
// the giant (ISLANDS[0], [1]) are pinned — the track passes through them at their ages, their volumes are tuned until their summits today are the
// records', and the floor beside ours until it is the basin's −1100. The game reads the flood (v11.96: world.js chemoInit, the basins'
// chemoclines) and, since v11.102 (GLOBE §8 step 5, the end of this file), its members as records in ISLANDS and its floor (rgFloor);
// region.html draws the rest, test/region.js checks it. Frame: x east, z south, metres; ages in Ma (millions of years before now), t counting back.
// ---------- the knobs ----------
const REGION_K={
  seed:32,        // the history's seed: the pulses, the births, their scatter, the fracture zones' phase (32: the person's picture of 25 Sep — one awesome, two great, two fine, the barely ones; region.html surveys the rest)
  span:30,        // Myr of the tail's history; the head arrived then (the province's age — not young: the person, 10 Nov 2026)
  ageOurs:3,      // Ma: our island's birth (DIRECTION Open 1, closed 10 Nov 2026: the age with the most variety; 3 gives the giant 1.3 at 1.06 cm/yr)
  v:1.06,         // cm/yr: the plate over the plume (GLOBE §2: 1–2, slow, so a cluster); with ageOurs it sets the giant's age
  turn:3,         // degrees per Myr the plate's heading turns (a small plate rotates; 0 is a straight track, 6 a horseshoe over 30 Myr)
  foot:40,        // km: the plume's footprint — twice the σ of the births' scatter about its centre
  rate:10,        // births per Myr at unit flux
  vol:6,          // km³: the smallest birth at unit flux (the giant's edifice comes out ~320, ours ~70); a pulse then makes ~6 over 30, ~2 over 100
  beta:0.75,      // the size law: N(>V) ∝ V^−β (seamount populations run 0.7–1): most births are small and never surface
  vMax:3000,      // km³: the largest birth
  base:0.3,       // the flux between pulses (a pulse peaks near 1 over it)
  period:3.5,     // Myr between pulses, ± half
  young:0.6,      // the pulse waxing now (at 0.25 Ma), as a share of the giant's: ARCHIPELAGO's accepted plan has an active young shield; 0 for none
  pulseW:0.6,     // Myr: a pulse's 1/e half-width
  fracSp:26,      // km between the old fracture zones the births align on (Galápagos's lineaments)
  fracA:0.6,      // rad: the zones' heading, from +x toward +z (the old ridge's spreading direction)
  fracPull:0.45,  // the share of births drawn onto the nearest zone
  Te:6,           // km: the plate's elastic thickness (flexure: a moat round each load, an arch beyond)
  swell:600,      // m: the plume's swell at its centre
  swellW:110,     // km: the swell's 1/e radius
  plateAge:45,    // Myr: the plate's age today (its cooling, d ≈ 2500 + 350·√age: PLANET, the plate)
  reef:7,         // mm/yr: the lime polyps' fastest upward growth, at the surface (this planet's, unknown: Earth's corals 1–10)
  light:15,       // m: the growth's e-folding depth (it is the light's: a reef behind the sea grows slower the deeper it is left)
  photic:50,      // m: a reef left deeper than this gives up (drowns); it takes hold again only where rock or reef comes back into the shallows
  fedL:90,        // km: how far upstream (against world.js CUR_A) another member shelters one from the open ocean's water
  fedK:0,         // the reef's growth on a fed member, as a share of K.reef (PLANET: the lime polyps win only in clear, bright water; the weed takes fed shallows)
  erode:0.45,     // per Myr: subaerial erosion (the land's height over the sea lost at this rate: 0.2 mm/yr at 450 m)
  plane:0.3,      // mm/yr: the waves' planing of rock in the surf band, wave base to +30
  wb:10,          // m: wave base
  platW:70,       // km: the plateau's half-width about the track (the tail's aprons); it falls to the plate over the next 40
  headR:160,      // km: the head's plateau about the track's old end
  hill:60,        // m: the abyssal hills over the floor (PLANET; the grid only)
  plate:-3800,    // m: the plate off the plateau
  floor:-1100,    // m: the floor beside ours today (PLANET, the basin): the plateau's level is solved for it
};
const REGION_PINS=[{id:'home',x:0,z:0,sum:5,excl:7000},{id:'giant',x:-15400,z:9200,sum:900,excl:15000}]; // the records the history passes through: their summits today (PLANET: the rim's last land +2..+6; ARCHIPELAGO: the giant's 900) and the radius no birth's centre takes (their feet: 5.7 and 13.8 km)
const RG_S=Math.tan(12*Math.PI/180),RG_SA=Math.tan(7*Math.PI/180),RG_DT=0.002,RG_R=6371000*7/6; // an edifice's mean submarine slope (PLANET: 10–20°, easing low); the subaerial (4–8°); the history's step in Myr (a deglaciation's 10 kyr is five); the planet's radius with the air's refraction, for the horizon
const RG_STATE={shield:'an active shield',young:'a growing seamount',high:'a high island',rim:'a rim and lagoon',low:'a low island',atoll:'an atoll',bank:'a carbonate bank',raised:'a raised atoll',drowned:'a drowned bank',guyot:'a guyot',seamount:'a seamount'}; // the states, as the page names them
// ---------- the pieces ----------
// Earth's sea level by age (GLOBE §4): a sawtooth — a slow fall over nine tenths of a cycle, a rise in the last tenth — 120 m every 100 kyr since 1 Ma,
// 70 every 41 kyr to 2.7 Ma, 30 every 41 kyr before (the Antarctic's alone); now is a highstand at 0
function rgSea(t){const P=t<1?0.1:0.041,A=t<1?120:t<2.7?70:30,ph=((t<1?t:t-1)/P)%1;return ph<0.1?-A*ph/0.1:-A*(1-(ph-0.1)/0.9);}
let KEI_T=null; // kei(x)/kei(0) on 0..8 by 0.01 (A&S 9.9.12's series): a point load's deflection of a thin plate on a fluid, 1 at the load, through 0 near 3.9, a small arch beyond
function rgKei(x){if(!KEI_T){KEI_T=new Float64Array(802);for(let i=0;i<802;i++){const q=(i*0.01)*(i*0.01)/4;let ber=0,bei=0,s=0,f0=1,f1=1,qa=1,psi=-0.5772156649015329+1;
    for(let k=0;k<30;k++){const sg=k&1?-1:1;if(k>0){f0*=(2*k-1)*(2*k);f1=f0*(2*k+1);}else f1=1;const q2=qa,q3=qa*q;ber+=sg*q2/(f0*f0);bei+=sg*q3/(f1*f1);s+=sg*psi*q3/(f1*f1);psi+=1/(2*k+2)+1/(2*k+3);qa*=q*q;}
    KEI_T[i]=i?(-Math.log(i*0.005)*bei-Math.PI/4*ber+s)/(-Math.PI/4):1;}}
  if(x>=8)return 0;const u=x*100,i=u|0,f=u-i;return KEI_T[i]+(KEI_T[i+1]-KEI_T[i])*f;}
// the plume's centre on the plate at age t, through ours at ageOurs and the giant at the age the speed and the turn give; older is north-east
function rgTrack(K,a,b){const dx=a.x-b.x,dz=a.z-b.z,ch=Math.hypot(dx,dz),thc=Math.atan2(dz,dx),v=K.v*1e4,w=K.turn*Math.PI/180,ta=K.ageOurs; // v in m/Myr
  const straight=Math.abs(w)<1e-6,dt=straight?ch/v:2*Math.asin(clamp(ch*w/(2*v),-1,1))/w,tm=ta-dt/2,th=t=>thc+w*(t-tm),s0=Math.sin(th(ta)),c0=Math.cos(th(ta));
  const P=(t,o)=>{o=o||{x:0,z:0};if(straight){o.x=a.x+v*(t-ta)*Math.cos(thc);o.z=a.z+v*(t-ta)*Math.sin(thc);}else{const T=th(t);o.x=a.x+v/w*(Math.sin(T)-s0);o.z=a.z-v/w*(Math.cos(T)-c0);}return o;};
  return {P,tg:ta-dt,v,w,th};}
const rgGauss=r=>{const u=Math.max(1e-12,r()),v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(TAU*v);};
function rgShape(m){m.H=Math.cbrt(3*m.V*RG_S*RG_S/Math.PI);m.R=m.H/RG_S;m.Ts=clamp(0.35*Math.cbrt(m.V/1e11),0.15,1.2);} // a cone of the mean slope holding V: its height over its base, its foot, its shield's duration (Myr)
// ---------- the model ----------
function regionModel(Kin){
  const K=Object.assign({},REGION_K,Kin||{}),rng=mulberry(K.seed*7919+11);
  const pin=REGION_PINS.map(p=>{const R=typeof ISLANDS==='object'?ISLANDS.find(r=>r.id===p.id):null;return Object.assign({},p,R?{x:R.x,z:R.z}:{});});
  const tr=rgTrack(K,pin[0],pin[1]),tg=tr.tg,T=tr.P;
  // the pulses: one at the giant's birth (the biggest is the one that has just finished its shield: ARCHIPELAGO), the rest spaced both ways
  const pulses=[{t:tg,a:1}];for(let t=tg+K.period*(0.5+rng());t<K.span+K.period;t+=K.period*(0.5+rng()))pulses.push({t,a:0.4+0.6*rng()});if(K.young>0)pulses.push({t:0.25,a:K.young});else for(let t=tg-K.period*(0.5+rng());t>-K.period;t-=K.period*(0.5+rng()))pulses.push({t,a:0.4+0.6*rng()});
  const flux=t=>{let f=K.base;for(const p of pulses){const u=(t-p.t)/K.pulseW;f+=p.a*Math.exp(-u*u);}return f;};
  // the births: a Poisson count every 10 kyr by the flux, each scattered about the plume's centre, some drawn onto a fracture zone, its volume by
// the size law and the flux. Births inside the game's world are kept and marked (inSq; region.html rings them): since v11.102 each is a
// record there unless another buries it (rgBuild); none within a pin's foot. The world is ±WHALF since v11.106 (the square ±HALF to v11.105), a rectangle since v11.112
  const sq=typeof WX0==='number'?[WX0,WX1,WZ0,WZ1]:[-70520,70520,-70520,70520],M=[],nfx=-Math.sin(K.fracA),nfz=Math.cos(K.fracA),sp=K.fracSp*1000,ph0=rng()*sp,sg=K.foot*500,o={x:0,z:0};
  pin.forEach((p,i)=>{const m={id:p.id,pin:i,x:p.x,z:p.z,age:i?tg:K.ageOurs,V:(i?600:60)*1e9,target:p.sum};M.push(m);});
  for(let k=Math.round(K.span/0.01);k>0;k--){const t=k*0.01,lam=K.rate*flux(t)*0.01,L=Math.exp(-lam);let n=-1,p=1;do{n++;p*=rng();}while(p>L);
    for(let b=0;b<n;b++){T(t,o);let x=o.x+sg*rgGauss(rng),z=o.z+sg*rgGauss(rng);const V=Math.min(K.vMax,K.vol*Math.pow(flux(t),1.3)*Math.pow(Math.max(1e-9,rng()),-1/K.beta))*1e9,pull=rng()<K.fracPull;
      if(pull){const s=nfx*x+nfz*z,c=ph0+sp*Math.round((s-ph0)/sp);x-=(s-c)*nfx;z-=(s-c)*nfz;}
      const m={id:'m'+M.length,pin:-1,x,z,age:t+0.01*rng(),V,frac:pull};rgShape(m);
      if(pin.some(q=>Math.hypot(x-q.x,z-q.z)<q.excl+0.4*m.R))continue;m.inSq=x>sq[0]&&x<sq[1]&&z>sq[2]&&z<sq[3];M.push(m);}}
  M.forEach(rgShape);
  // the plateau: a band about the track and the head's disc at its old end, the plate beyond; its level solved below so the floor beside ours is K.floor
  const TP=[];for(let t=0;t<=K.span+1e-9;t+=0.25)TP.push(T(t));const head=T(K.span);
  const dTrack=(x,z)=>{let d=1e18;for(let i=1;i<TP.length;i++){const a=TP[i-1],b=TP[i],ex=b.x-a.x,ez=b.z-a.z,l=ex*ex+ez*ez,u=l>0?clamp(((x-a.x)*ex+(z-a.z)*ez)/l,0,1):0,qx=a.x+ex*u-x,qz=a.z+ez*u-z,q=qx*qx+qz*qz;if(q<d)d=q;}return Math.sqrt(d);};
  const platW=(x,z)=>Math.max(1-smooth(K.platW*1000,(K.platW+40)*1000,dTrack(x,z)),1-smooth(K.headR*600,K.headR*1000,Math.hypot(x-head.x,z-head.z)));
  // flexure: a point load P = Δρ g V on a plate of rigidity D bends it by P α²/8D × kei(r/α)/kei(0) (Turcotte & Schubert §3.18); α the flexural parameter
  const D=7e10*Math.pow(K.Te*1000,3)/(12*(1-0.0625)),al=Math.pow(D/(2270*9.8),0.25),cf=1770*9.8*al*al/(8*D),n=M.length,Kf=new Float64Array(n*n);
  for(let i=0;i<n;i++)for(let j=0;j<n;j++)Kf[i*n+j]=cf*rgKei(Math.hypot(M[i].x-M[j].x,M[i].z-M[j].z)/al);
  M.forEach(m=>{m.pw=platW(m.x,m.z);});
  const ref={x:pin[0].x+6000,z:pin[0].z},refW=platW(ref.x,ref.z),refK=M.map(m=>cf*rgKei(Math.hypot(m.x-ref.x,m.z-ref.z)/al));
  const swellAt=(x,z,t)=>{T(t,o);const d=Math.hypot(x-o.x,z-o.z)/(K.swellW*1000);return K.swell*Math.exp(-d*d);};
  const A=Math.max(K.plateAge,K.span+1),cool=t=>350*(Math.sqrt(A)-Math.sqrt(A-t)); // how much shallower the plate stood at age t than now
  let top=K.floor;
  // the fed face: the current brings the open ocean's nutrient in across the province's upstream edge (to v11.101 the game's own was the gap in its sill).
  // A member with no other's top able to reach the shallows upstream of it — across its own foot, within K.fedL — sits in that water, where the
  // weed takes the shallows from the lime polyps: little or no reef, so planed, it sinks — a drowned bank, a guyot. The pins are never fed: their
  // reefs are the records'. (Seed 32's own members shelter both — ours in the lee of the drowned atoll 18 km up-current, the giant in ours' —
  // so the rule decides nothing there; it keeps the pins' reefs from hanging on a seed.)
  const ca=typeof CUR_A==='number'?CUR_A:2.3,ux=-Math.cos(ca),uz=-Math.sin(ca),high=M.map(m=>K.plate+(K.floor-K.plate)*m.pw+K.swell+m.H>-300);
  M.forEach((m,j)=>{m.fed=m.pin<0&&!M.some((q,i)=>{if(i===j||!high[i])return false;const rx=q.x-m.x,rz=q.z-m.z,al2=rx*ux+rz*uz,la=Math.abs(rx*uz-rz*ux);return al2>0&&al2<K.fedL*1000&&la<0.7*m.R+0.5*q.R;});});
  // a member that cannot come within 200 m of the lowest sea even at its birth, on the swell, unloaded, is a seamount whatever happens: not stepped
  const deep=M.map(m=>K.plate+(K.floor-K.plate)*m.pw+cool(m.age)+K.swell+m.H<-120-K.photic-200);
  const ord=M.map((m,i)=>i).sort((a,b)=>M[b].age-M[a].age); // oldest first: the loads are born in this order
  const run=mask=>{const Fl=new Float64Array(n),Ld=new Float64Array(n),S=[],grow=[];let ob=0;for(let j=0;j<n;j++)if(mask[j])S.push(j);
    M.forEach(m=>{m.plat=K.plate+(top-K.plate)*m.pw;m.E=0;m.peak=-1e9;m.reef=false;m.alive=false;m.rt=0;m.ring=0;m.lit=null;m.surf=null;m.src=-1;m.srcD=0;m.exp=0;m.died=null;m.lastB=null;m.litNow=false;m.zv=-1e9;});
    const litPrev=new Uint8Array(n);
    for(let k=Math.round(K.span/RG_DT);k>=0;k--){const t=k*RG_DT,sea=rgSea(t),C=cool(t);T(t,o);const px=o.x,pz=o.z;
      while(ob<n&&M[ord[ob]].age>t)grow.push(ord[ob++]);
      for(let g=grow.length-1;g>=0;g--){const i=grow[g],m=M[i],l=m.V*Math.min(1,(m.age-t)/m.Ts),dl=l-Ld[i];if(dl>0){for(const j of S)Fl[j]+=Kf[i*n+j]*dl;Ld[i]=l;}if(l>=m.V)grow.splice(g,1);}
      for(const j of S){const m=M[j];if(t>=m.age)continue;const dx=(m.x-px)/(K.swellW*1000),dz=(m.z-pz)/(K.swellW*1000);
        const base=m.plat+C+K.swell*Math.exp(-dx*dx-dz*dz)-Fl[j],gr=Math.min(1,(m.age-t)/m.Ts),dB=m.lastB===null?0:base-m.lastB;m.lastB=base;
        let zv=base+m.H*Math.cbrt(gr)-m.E;
        if(gr>=1){if(zv>sea)m.E+=K.erode*(zv-sea)*RG_DT;if(zv>sea-K.wb&&zv<sea+30&&!(m.alive&&m.rt>=zv-1))m.E+=K.plane*1000*RG_DT;zv=base+m.H-m.E;}
        if(zv>m.peak)m.peak=zv;m.zv=zv;
        // the reef: it takes hold once the shield is done on rock in the shallows — a fringe at the shore, or a cap on a summit just under — and keeps
        // to the sea at K.reef while the sea is over it; left deeper than K.photic it drowns, and takes hold again only if rock comes back into the shallows
        if(m.reef)m.rt+=dB;
        if(gr>=1&&!m.alive&&(!m.fed||K.fedK>0)&&Math.max(zv,m.reef?m.rt:-1e9)>sea-K.photic*0.5){const rtop=Math.min(0.75*m.R,m.E/RG_S);if(!m.reef)m.ring=Math.max(800,rtop+Math.max(0,zv-sea)/RG_SA);m.reef=true;m.alive=true;m.rt=Math.min(sea,Math.max(zv,m.rt));m.died=null;}
        if(m.alive){if(m.rt<sea)m.rt+=Math.min(K.reef*(m.fed?K.fedK:1)*1000*RG_DT*Math.exp(-(sea-m.rt)/K.light),sea-m.rt);else m.exp+=RG_DT;if(m.rt<sea-K.photic&&zv<sea-K.photic){m.alive=false;m.died=t;}}
        const topv=Math.max(zv,m.reef?m.rt:-1e9);m.litNow=topv>sea-K.photic;
        if(m.litNow&&m.lit===null){m.lit=t;let bd=1e18;for(let i=0;i<n;i++)if(i!==j&&litPrev[i]){const d=Math.hypot(M[i].x-m.x,M[i].z-m.z);if(d<bd){bd=d;m.src=i;m.srcD=d;}}}
        if(zv>sea&&m.surf===null)m.surf=t;}
      for(const j of S)litPrev[j]=M[j].litNow?1:0;}
    for(let j=0;j<n;j++){let f=0;for(let i=0;i<n;i++)f+=Kf[i*n+j]*Ld[i];M[j].fl=f;} // today's loads on every member, stepped or not
    let fr=0;for(let i=0;i<n;i++)fr+=refK[i]*M[i].V;return K.plate+(top-K.plate)*refW+swellAt(ref.x,ref.z,0)-fr;}; // the floor beside ours now
  // the pins: Newton then secant on each pinned volume (log) for its summit today, and the plateau's level for the floor beside ours
  const pm=M.map(m=>m.pin>=0),all=M.map((m,i)=>!deep[i]),prev=M.map(()=>null);let it=0,err=1e9;
  for(;it<16;it++){const fl=run(pm);top+=K.floor-fl;err=Math.abs(K.floor-fl);
    for(const m of M){if(m.pin<0)continue;const e=m.zv-m.target,lv=Math.log(m.V),p=prev[m.pin];err=Math.max(err,Math.abs(e));
      let d=p&&Math.abs(e-p.e)>1e-6?-e*(lv-p.lv)/(e-p.e):-e/Math.max(50,m.H/3*0.6);d=clamp(d,-1,1);prev[m.pin]={lv,e};m.V=Math.exp(lv+d);rgShape(m);}
    if(err<1)break;}
  run(all);M.forEach((m,i)=>{if(deep[i]){m.zv=m.plat+swellAt(m.x,m.z,0)+m.H-m.fl;m.peak=m.zv;}}); // the unstepped: today's summit on today's swell, under today's loads
  // today: each member's state, its flat top, its shore, and what the history says of its life
  for(const m of M){const s=m.zv,building=m.age<m.Ts;m.rtop=Math.min(0.75*m.R,m.E/RG_S);m.shore=s>0?m.rtop+s/RG_SA:m.reef&&m.rt>0?m.ring:0;m.top=Math.max(s,m.reef?m.rt:-1e9);
    m.state=building?(s>0?'shield':'young'):s>150?'high':s>0?(m.alive?'rim':'low'):m.reef&&m.rt>5?'raised':m.alive&&m.rt>-K.photic?(m.ring>6000?'bank':'atoll'):m.reef?(m.rt>-150?'drowned':'guyot'):m.E>0?'guyot':'seamount';
    m.land=m.shore>0?Math.PI*m.shore*m.shore/1e6:0;} // km², the disc's
  return {K,M,pulses,flux,track:T,tg,top,al,cf,err,iter:it,head,platW,swellAt,ref,
    floorAt:(x,z)=>{let f=K.plate+(top-K.plate)*platW(x,z)+swellAt(x,z,0);for(const m of M)f-=cf*rgKei(Math.hypot(m.x-x,m.z-z)/al)*m.V;return f;}};
}
// the members whose land stands over the sea's horizon from the surface at (x, z): a summit h at d clears the curve's drop d²/2R'; `haze` is the
// ordinary day's 30 km (horizon.js's air), the clear day's 110 (ARCHIPELAGO)
function regionSeen(R,x,z){const out=[];for(const m of R.M){if(m.top<=0)continue;const d=Math.hypot(m.x-x,m.z-z),drop=d*d/(2*RG_R);if(d>1000&&m.top>drop)out.push({m,d,clear:d<110000,haze:d<30000});}return out.sort((a,b)=>a.d-b.d);}
// the province today as heights on an n² grid of `span` metres whose corner is (x0, z0), at cell centres: the floor (the plateau, the swell, the moats
// and arches, the hills) under every member's cone, flat top, reef ring and lagoon; `inner(x,z)` (optional) is the game's own ground, which takes over
// inside its square of half-side `half` past a 3 km blend (so the picture and the basins carry the records as the game has them)
function regionGrid(R,x0,z0,span,n,inner,half){const HB=typeof half==='number'?[-half,half,-half,half]:half; // the game's ground inside ±half, or a rectangle [x0, x1, z0, z1] (v11.112)
  const H=new Float32Array(n*n),c=span/n,K=R.K,M=R.M,st=4,nc=Math.ceil(n/st)+2,C=new Float32Array(nc*nc);
  for(let j=0;j<nc;j++)for(let i=0;i<nc;i++)C[j*nc+i]=R.floorAt(x0+(i*st+0.5)*c,z0+(j*st+0.5)*c); // the plateau, the swell and the flexure are smooth over km: every 4th cell, then bilinear
  for(let j=0;j<n;j++){const z=z0+(j+0.5)*c,fj=j/st,j0=fj|0,v=fj-j0;for(let i=0;i<n;i++){const x=x0+(i+0.5)*c,fi=i/st,i0=fi|0,u=fi-i0,k=j0*nc+i0;
    H[j*n+i]=(C[k]*(1-u)+C[k+1]*u)*(1-v)+(C[k+nc]*(1-u)+C[k+nc+1]*u)*v+(typeof fbm==='function'?(fbm(x*0.00012+7,z*0.00012+3,3)-0.5)*2*K.hill:0);}}
  for(const m of M){const s=m.zv,rt=m.rtop,reach=m.R*1.6+3000,i0=Math.max(0,Math.floor((m.x-reach-x0)/c)),i1=Math.min(n-1,Math.ceil((m.x+reach-x0)/c)),j0=Math.max(0,Math.floor((m.z-reach-z0)/c)),j1=Math.min(n-1,Math.ceil((m.z+reach-z0)/c));
    const ring=m.reef&&m.state!=='high'&&m.state!=='shield',lag=m.ring>6000?20:40;
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const dx=x0+(i+0.5)*c-m.x,dz=z0+(j+0.5)*c-m.z,r=Math.sqrt(dx*dx+dz*dz);if(r>reach)continue;
      let g=s>0?(r<rt+s/RG_SA?s-Math.max(0,r-rt)*RG_SA:-(r-rt-s/RG_SA)*RG_S):s-Math.max(0,r-rt)*RG_S;
      if(ring)g=Math.max(g,r<=m.ring?m.rt-Math.min(lag,Math.max(0,m.ring-400-r)*0.05):m.rt-(r-m.ring)*0.6); // the crest 400 m wide at the ring, the lagoon (a bank's flat) inside, the fore-reef's talus outside
      const q=j*n+i;if(g>H[q])H[q]=g;}}
  if(inner)for(let j=0;j<n;j++){const z=z0+(j+0.5)*c;for(let i=0;i<n;i++){const x=x0+(i+0.5)*c,e=Math.min(x-HB[0],HB[1]-x,z-HB[2],HB[3]-z);if(e>0){const w=smooth(0,3000,e),q=j*n+i;H[q]+=(inner(x,z)-H[q])*w;}}}
  return H;}
// the water each cell exchanges with the open ocean through: the shallowest point on its deepest way to the grid's edge (a priority flood from the
// edge, lowest first). A cell whose floor lies under that (by th, 30 m unless given; world.js chemoInit passes 1, so a basin's walls are its) is
// enclosed; the enclosed cells in one piece are a basin with that sill. A basin is silled as ours was (PLANET, the basin: anoxic under the sill,
// its chemocline 20 m below it) when the water coming in over its sill is the oxygen minimum's, not the ventilated deep's — the sill above
// OXY.floor (-1100; Santa Barbara Basin goes anoxic behind a 475 m sill on the minimum's water) and below -100 (a lagoon the tide flushes) — when
// its floor lies 150 m or more under the sill, and when it is 10 km² or more (v11.96: a hollow smaller is stirred clean; the outer flank's
// ribbing made 0.5-1.6 km² "basins" at -2500 to -3500)
function regionBasins(H,n,cell,th,nz){if(th===undefined)th=30;if(nz===undefined)nz=n;const N=n*nz,F=new Float32Array(N).fill(Infinity),hp=new Int32Array(N),lab=new Int32Array(N).fill(-1);let hn=0;
  const up=k=>{const v=hp[k];while(k>0){const p=(k-1)>>1;if(F[hp[p]]<=F[v])break;hp[k]=hp[p];k=p;}hp[k]=v;},
    down=()=>{const v=hp[--hn];let k=0;for(;;){let c=2*k+1;if(c>=hn)break;if(c+1<hn&&F[hp[c+1]]<F[hp[c]])c++;if(F[hp[c]]>=F[v])break;hp[k]=hp[c];k=c;}hp[k]=v;};
  const push=i=>{hp[hn]=i;up(hn++);};
  const seed=k=>{if(F[k]===Infinity){F[k]=H[k];push(k);}}; // the edge: the open ocean (v11.112: an n × nz grid; a square's order as before)
  for(let i=0;i<Math.max(n,nz);i++){if(i<n){seed(i);seed((nz-1)*n+i);}if(i<nz){seed(i*n);seed(i*n+n-1);}}
  while(hn){const k=hp[0];if(hn>1)down();else hn=0;const x=k%n,y=(k/n)|0,f=F[k];
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=n||yy>=nz)continue;const q=yy*n+xx;if(F[q]!==Infinity)continue;F[q]=Math.max(H[q],f);push(q);}}
  const B=[];for(let k=0;k<N;k++){if(lab[k]>=0||F[k]-H[k]<th||F[k]>=0)continue;const b={id:B.length,sill:F[k],floor:H[k],cells:0,sx:0,sz:0},st=[k];lab[k]=b.id;
    while(st.length){const q=st.pop(),x=q%n,y=(q/n)|0;b.cells++;b.sx+=x;b.sz+=y;if(H[q]<b.floor)b.floor=H[q];
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=n||yy>=nz)continue;const r=yy*n+xx;if(lab[r]>=0||F[r]-H[r]<th||Math.abs(F[r]-b.sill)>1)continue;lab[r]=b.id;st.push(r);}}
    // silled: still water behind its sill; anoxic only if world.js chemoD says its food outruns its inflow (v11.108) — b.chemo is where the line would be
    b.area=b.cells*cell*cell/1e6;b.cx=b.sx/b.cells;b.cz=b.sz/b.cells;b.silled=b.sill<-100&&b.sill>(typeof OXY==='object'?OXY.floor:-1100)&&b.sill-b.floor>=150&&b.area>=10;b.chemo=b.silled?b.sill-20:null;B.push(b);}
  return {F,lab,B};}
// ---------- the region in the game (v11.102, GLOBE §8 step 5) ----------
// The square rebuilt from the model. Every member whose ground reaches the world (the square and the far layer's 2 km past it) is a record in
// ISLANDS, its shape its state's from islandH's kit and its numbers the history's — where it stands, its summit or its reef's top today, the
// reef's ring, the shore — and the floor under them all is the model's (the plateau, the plume's swell, every load's moat and arch), where to
// v11.101 it was a flat −1100 and a hand-built sill. Run at load from the seed and the knobs (the recipe: the repository's rule 3); ours and the
// giant are their own records (the pins), only their reach grown where the model's floor lies deeper than their flanks were cut for.
// The shapes, by state:
//   high, shield — land: the kit's shield surface from the shore (the model's) to the summit (its height today), gullies by the rain, a caldera
//     and flows down two rift zones on an active shield or one under 1 Myr (the zones on the province's fracture grain, K.fracA, as the births
//     are); offshore a shelf cut by the waves for as long as it has stood (the giant's at its 1.3 Myr, narrower when younger, wider when older;
//     an active shield has none: its lava reaches the sea), cut into the land (the coast retreats; the flank stays where the model's 12° cone
//     puts it, its toe at −290 1.4 km past the model's shore), the eight terraces at its edge, the flank at 12°.
//   atoll, bank, drowned — the reef: ours scaled to the ring — the rim at the reef's top (awash, islets to +6, or under), broken by passes; the
//     lagoon inside, deeper on a wider ring (a bank's flat at 20 under); outside, ours fore-reef, shelf and terraces, the flank at 17° easing to 12°.
//   seamount, guyot, young — a cone: a low dome on the summit (a guyot's planed flat), the flank from 20° easing to 12°, the upper 200 m swept
//     bare (R.bare) and knobbed with pillow mounds 30 m high (R.knob). A growing seamount is given no heat yet: seed 32's lies inside an older member and is not built.
// A member whose summit lies under another's ground at its centre is not built: the model draws every cone from the plateau, and a birth on an
// older member's flank there is a cone inside it (seed 32: three — the 0.99 and 2.62 Ma seamounts on the 308 m island's land, the 40 kyr one
// inside the drowned atoll at the west edge — and a guyot under the awesome shield's flank).
const RG_FLG=1000; // the floor's grid (m): the moats and the swell are smooth over tens of km; a Catmull-Rom patch reads it with no crease at a line
let RG_FL=null;
// v11.106: the lattice is fixed by its origin (ox, oz: v11.102's, the old square's members' extent less a node) and may start mi, mj nodes
// before it, so a node the old grid had is the same double, and a read in the old square the same arithmetic, to the bit
function rgFloorInit(R,ox,oz,mi,mj,x1,z1){const G=RG_FLG,nx=mi+Math.ceil((x1-ox)/G)+2,nz=mj+Math.ceil((z1-oz)/G)+2,H=new Float32Array(nx*nz);
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++)H[j*nx+i]=R.floorAt(ox+(i-mi)*G,oz+(j-mj)*G);RG_FL={G,x0:ox,z0:oz,mi,mj,nx,nz,H};}
function rgCR(a,b,c,d,t){return b+0.5*t*(c-a+t*(2*a-5*b+4*c-d+t*(3*(b-c)+d-a)));}
// the model's floor at (x, z) (world.js sample's basement): the grid's patch, its edge held beyond it
function rgFloor(x,z){const F=RG_FL;if(!F)return BASIN.h;const u=clamp((x-F.x0)/F.G,1-F.mi,F.nx-F.mi-2.000001),v=clamp((z-F.z0)/F.G,1-F.mj,F.nz-F.mj-2.000001),i=Math.floor(u),j=Math.floor(v),tu=u-i,tv=v-j,H=F.H,n=F.nx;
  let k=(j+F.mj-1)*n+i+F.mi;const a=rgCR(H[k-1],H[k],H[k+1],H[k+2],tu);k+=n;const b=rgCR(H[k-1],H[k],H[k+1],H[k+2],tu);k+=n;const c=rgCR(H[k-1],H[k],H[k+1],H[k+2],tu);k+=n;
  return rgCR(a,b,c,rgCR(H[k-1],H[k],H[k+1],H[k+2],tu),tv);}
// a record's ground along a radius with no noise and no warp: islandH's profile, terraces, land, rim and lagoon, and lower flank (the foot, the reach, the burial)
function rgRadial(R,r){let h=R.h0;for(const s of R.prof)h-=s[2]*smooth(s[0],s[1],r);const T=R.terr;h-=T.n*T.step*smooth(T.r0,T.r1,r);
  if(R.land&&r<R.land.r){const tl=1-r/R.land.r,S=tl*tl*(3-2*tl);h+=R.land.h*(0.55*tl+0.45*S);}
  const F=R.flank,rf=r-F.r;if(rf>0){const t=Math.min(rf/F.w,1),d0=rf<F.w?F.w*(t*t*t-0.5*t*t*t*t):rf-0.5*F.w,u=clamp((rf-F.a)/(F.b-F.a),0,1),d1=rf<F.a?0:rf<F.b?(F.b-F.a)*(u*u*u-0.5*u*u*u*u):rf-0.5*(F.a+F.b);h-=F.s0*d0-(F.s0-F.s1)*d1;}
  if(R.rimR!==undefined){h=lerp(h,R.lagH,smooth(R.rimR-R.rimW*0.4,R.rimR-R.rimW*1.6,r));h=lerp(h,(R.rimH||0)+2.5,smooth(R.rimR-R.rimW,R.rimR-R.rimW*0.3,r)*smooth(R.rimR+R.rimW,R.rimR+R.rimW*0.3,r));}
  return h;}
// the most a record's ground (h or the smooth hs) can stand at a distance d from its centre, on a table of RG_HIS steps (world.js sample skips a
// record that cannot raise the ground or give the conditions): its radius warped ±16% (islandH's rw), its flank's toe ±60 and the drop ribbed
// +15%, and what the radial profile leaves out — the hills (10.5), the rift ridges (8), a terrace's step (12), the rim's noise (3.5), a
// seamount's knobs, a reef's spurs (v11.107: 0.6·CARB.A over the smooth flank), the land's cliff and flows — with 5 to spare. `quiet`: past it every field the record gives but its influence is open water's (its shelf edge, rim, land,
// rift arms); the influence sample() takes from islandW alone (world.js).
const RG_HIS=50;
function rgBound(R){const F=R.flank,L=R.land,ex=10.5+8+12+4+5+(R.knob||0)+(R.carb?0.6*CARB.A:0)+(L?L.cliff+(L.flows?L.flows.h:0):0),n=Math.ceil(R.reach/RG_HIS)+1,hi=new Float32Array(n);
  const at=r=>{const rf=r-(F.r+60);let d=0;if(rf>0){const t=Math.min(rf/F.w,1),d0=rf<F.w?F.w*(t*t*t-0.5*t*t*t*t):rf-0.5*F.w,u=clamp((rf-F.a)/(F.b-F.a),0,1),d1=rf<F.a?0:rf<F.b?(F.b-F.a)*(u*u*u-0.5*u*u*u*u):rf-0.5*(F.a+F.b);d=F.s0*d0-(F.s0-F.s1)*d1;}
    const Q=Object.assign({},R,{flank:Object.assign({},F,{r:1e9})});return rgRadial(Q,r)-0.85*d;};
  for(let k=0;k<n;k++){const a=0.84*k*RG_HIS,b=1.16*(k+1)*RG_HIS;let m=-1e9;for(let q=0;q<=8;q++){const v=at(a+(b-a)*q/8);if(v>m)m=v;}hi[k]=m+ex;}
  for(let k=n-2;k>=0;k--)if(hi[k]<hi[k+1])hi[k]=hi[k+1]; // never rising outward: a bump between the table's points is covered by the next
  R.hi=hi;R.hiS=RG_HIS;R.quiet=Math.max(R.terr.r1+150,R.riftR?R.riftR[2]:0,L?L.r:0,R.rimR!==undefined?R.rimR+R.rimW:0)/0.84+100;}
// a member's record by its state (above); k its index among the built, for its noise offset
function rgRecord(m,k,K,rng){const ns=1000+37*k,R={id:m.id,x:m.x,z:m.z,rot:0,sc:1,ns,state:m.state,age:m.age};
  const arms=()=>{const a=K.fracA+0.3*(rng()-0.5)*2;return [a,(a+Math.PI+0.3*(rng()-0.5)*2)%TAU];};
  if(m.state==='high'||m.state==='shield'){const sh=Math.round(m.shore),act=m.state==='shield',yg=act||m.age<1,q=act?0:clamp(m.age/1.3,0.3,1.5),L={r:sh,h:Math.round(m.zv),cliff:act?15:yg?20:30,gully:{n:Math.round(clamp(sh/600,8,act?14:36)),lee:act?0.15:0.25}};
    if(yg){L.cald={r:clamp(0.07*sh,150,1800),d:clamp(0.05*m.zv,20,150),w:clamp(0.004*sh,25,80)};L.flows={n:Math.round(clamp(sh/250,20,90)),h:act?10:5,hw:0.45};R.rifts=arms();R.riftR=[L.cald.r,L.cald.r+500,sh+(act?5000:800),sh+(act?2500:300)];}
    if(act){R.h0=0;R.prof=[[sh,sh+200,25],[sh+200,sh+900,150]];R.terr={r0:sh+200,r1:sh+900,n:0,step:0};R.flank={r:sh+900,w:300,s0:0.27,s1:0.21,a:800,b:4000};}
    else{const w=v=>Math.round(v*q),c=Math.round(Math.min(sh,Math.max(0.5*sh,sh+1380-w(2800))));L.r=c;R.h0=0;R.prof=[[c,c+w(300),8],[c+w(300),c+w(1000),52],[c+w(1800),c+w(2300),94],[c+w(2300),c+w(2800),40]];R.terr={r0:c+w(1000),r1:c+w(1800),n:8,step:12};R.flank={r:c+w(2800),w:250,s0:0.21,s1:0.21,a:600,b:2600};}
    R.land=L;R.fade=[R.flank.r,R.flank.r+3000];R.core=Math.round(Math.min(L.r,R.fade[0]/1.2));}
  else if(m.reef&&m.state!=='guyot'){const rr=Math.round(m.ring),rt=Math.round(m.rt),W=clamp(0.06*rr,40,300);R.h0=rt-14;R.rimR=rr;R.rimW=W;R.rimH=rt;R.lagH=rt-(rr>6000?20:Math.min(40,18+6*rr/1000));
    R.prof=[[rr+0.3*W,rr+85,6],[rr+85,rr+455,40],[rr+755,rr+955,94],[rr+955,rr+1355,40]];R.terr={r0:rr+455,r1:rr+755,n:8,step:12};R.flank={r:rr+1315,w:250,s0:0.30,s1:0.22,a:600,b:2600};R.fade=[rr+2800,rr+5800];R.carb={n:Math.max(24,Math.round(TAU*(rr+1500)/CARB.sp))};} // carb (v11.107): the cap's spurs round it, every CARB.sp m at the slope's top
  else{const rS=m.state==='guyot'?Math.max(200,m.rtop):clamp(0.05*m.R,120,300);R.h0=Math.round(m.zv);R.prof=m.state==='guyot'?[]:[[0,2*rS,20]];R.terr={r0:rS,r1:rS+400,n:0,step:0};R.flank={r:rS,w:300,s0:0.36,s1:0.22,a:600,b:2000};R.bare=R.h0;R.knob=30;R.fade=[rS+1500,rS+4000];}
  return R;}
// the records: shaped, the buried struck, the rest kept if their foot reaches the world; the floor's grid over the world and every kept record's land.
// v11.106 (GLOBE §10.1 step 4, the world to ±WHALF): in two passes, so the old square's records are v11.102's to the bit — first the members
// that reach the old square (HALF + 2 km, as v11.102–105 built them: the same list, order, rng and noise seeds), then the rest that reach the
// world, by their own rng, their seeds after; the floor's grid is v11.102's lattice grown by whole nodes, so every node it had is the same node
function rgBuild(Rg){const K=Rg.K,rng=mulberry(K.seed*104729+7),rng2=mulberry(K.seed*104729+11),W0=[-HALF-2000,HALF+2000,-HALF-2000,HALF+2000],W=[WX0-2000,WX1+2000,WZ0-2000,WZ1+2000],box=(x,z,r,w)=>x+r>w[0]&&x-r<w[1]&&z+r>w[2]&&z-r<w[3]; // the boxes as rectangles (v11.112; a square's test the same decisions)
  const cand=w=>Rg.M.filter(m=>m.pin<0&&box(m.x,m.z,m.R*1.6+3000,w)).sort((a,b)=>b.top-a.top),c0=cand(W0),c1=cand(W);
  const ext=(L,w)=>{let x0=w[0]-5000,x1=w[1]+5000,z0=w[2]-5000,z1=w[3]+5000;for(const m of L){const r=Math.max(m.shore,m.ring,m.R)+6000;x0=Math.min(x0,m.x-r);x1=Math.max(x1,m.x+r);z0=Math.min(z0,m.z-r);z1=Math.max(z1,m.z+r);}return [x0,z0,x1,z1];};
  const e0=ext(c0,W0),e1=ext(c1,W),G=RG_FLG,ox=e0[0]-G,oz=e0[1]-G; // v11.102's origin: its x0 less a node
  rgFloorInit(Rg,ox,oz,Math.ceil(Math.max(0,e0[0]-e1[0])/G),Math.ceil(Math.max(0,e0[1]-e1[1])/G),Math.max(e1[2],e0[2]),Math.max(e1[3],e0[3]));
  const foot=R=>{const f0=rgFloor(R.x,R.z)-BASIN.knee-200;let r=0;while(r<80000&&rgRadial(R,r)>f0)r+=50;return r;};
  const kept=ISLANDS.slice(),out=[],struck=[],later=new Set(c1.filter(m=>!c0.includes(m)));
  const pass=(L,rg,w)=>{for(const m of L){const R=rgRecord(m,out.length,K,rg),top=R.land?R.land.h:R.rimR!==undefined?R.rimH:R.h0;
    const by=kept.find(B=>rgRadial(B,Math.hypot(B.x-R.x,B.z-R.z))>top-20);if(by){struck.push({id:m.id,by:by.id});continue;}
    const f=foot(R);R.reach=Math.round(Math.max(1.2*f,R.fade[1])+500);if(!box(R.x,R.z,R.reach,w)){later.add(m);continue;}rgBound(R);R.an=anTables(R.ns);kept.push(R);out.push(R);}};
  pass(c0,rng,W0);const n0=out.length;pass(c1.filter(m=>later.has(m)),rng2,W); // the old square's, then the world's (a member of the first list kept by the world alone is shaped again, by the second rng)
  for(const R of ISLANDS){const f=foot(R),need=Math.round(1.2*f+500);if(need>R.reach)R.reach=need;if(R.id==='giant')rgBound(R);} // the pins: their flanks go on down to the model's floor; the giant's kit is the model's (land, rifts, flows: no collapse, dikes, 
  return {recs:out,struck,n0};}
const REGION=regionModel(),RG_BUILT=rgBuild(REGION);for(const R of RG_BUILT.recs)ISLANDS.push(R);
