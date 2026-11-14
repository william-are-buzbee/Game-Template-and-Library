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
  Te:15,          // km: the plate's elastic thickness (flexure: a moat round each load, an arch beyond). v11.121: 15, Earth's for loads on a plate 15–35 Myr old when loaded (analysis_archipelago §1.8; to v11.120 6, a ridge's) — at 6 a shield with Earth's slopes sinks under its own weight past ~1,500 m, so the awesome shield could not stand at its 2,533 m (K.tune)
  swell:600,      // m: the plume's swell at its centre
  swellW:110,     // km: the swell's 1/e radius
  plateAge:45,    // Myr: the plate's age today (its cooling, d ≈ 2500 + 350·√age: PLANET, the plate)
  reef:7,         // mm/yr: the lime polyps' fastest upward growth, at the surface (this planet's, unknown: Earth's corals 1–10)
  light:15,       // m: the growth's e-folding depth (it is the light's: a reef behind the sea grows slower the deeper it is left)
  photic:50,      // m: a reef left deeper than this gives up (drowns); it takes hold again only where rock or reef comes back into the shallows
  fedL:90,        // km: how far upstream (against world.js CUR_A) another member shelters one from the open ocean's water
  fedK:0,         // the reef's growth on a fed member, as a share of K.reef (PLANET: the lime polyps win only in clear, bright water; the weed takes fed shallows)
  erode:0.15,     // per Myr: subaerial erosion (the land's height over the sea lost at this rate: 0.07 mm/yr at 450 m). v11.121 (analysis_archipelago §6; the person, 12 Nov 2026: "let's say 10"): high islands that last ~10 Myr, as a slow plate's do (Mauritius 828 m at ~8 Ma, Gran Canaria 1,956 m at 14.5); to v11.120 0.45, a fast plate's clock run on a slow one
  tune:{m153:2533}, // v11.121 (the person, 12 Nov 2026, answer (c)): members held to a summit today as the pins are, their volume solved for it — seed 32's awesome shield at its 2,533 m, so the volume-true shape (rgShape2) leaves it the awesome one
  plane:0.3,      // mm/yr: the waves' planing of rock in the surf band, wave base to +30
  wb:10,          // m: wave base
  platW:70,       // km: the plateau's half-width about the track (the tail's aprons); it falls to the plate over the next 40
  headR:160,      // km: the head's plateau about the track's old end
  comp:{C:40,tau:2.5}, // v11.134 (analysis_archipelago §9): composites — a vent within C km of a volcano with a vent in the last tau Myr builds onto it
  relief:{C:350,nh:4,Hh:900,Rh:55,Hp:900,Rp:40,tmin:19,t0:19,gap:15,grow:0.5,B:150,L:40,sad:0.7,swept:0.03,diss:0.05}, // v11.126 (analysis_archipelago §8; the person, 13 Nov 2026: "a chain of banks", "drowned saddles"): the old end's relief and its necks. C m: the head's plateau that much under platW's flat top past track age t0 (tapered over the 3 Myr before), ±B m of noise at L km on it; nh volcanic centres where the head arrived, scattered over the plume's footprint as the births are (Hh m × 0.7–1, Rh km), and one at each pulse from tmin on (Hp m × the pulse's strength, Rp km; none within gap km of a stronger one), each grown over `grow` Myr from its pulse, cut off at 3 radii, overlapping ones by a 4-norm. sad: where the lesser of the two centres a point lies between has this share of the greater's shape or more (±0.2 of noise), the bank lies between its centres — a neck — and the currents and the 6–9 m tides that cross the ridge run over it; swept, its reef grows at `swept` of the rate. diss: mm/yr, what the rain dissolves from a reef top the sea has left. The necks keep up through the Pliocene's small swings of the sea and give up under the Pleistocene's 70–120 m (swept 0.025 drowns them by 25 Ma, 1 km deep; 0.04 leaves them at −64)
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
function rgShape(m){m.H=Math.cbrt(3*m.V*RG_S*RG_S/Math.PI);m.R=m.H/RG_S;m.H12=m.H;m.Ts=Math.max(m.Tspan||0,clamp(0.35*Math.cbrt(m.V/1e11),0.15,1.2));} /* v11.134: a composite's from its first vent to its last one's shield done (Tspan) */ // a cone of the mean slope holding V: its height over its base, its foot, its shield's duration (Myr)
// v11.121 (analysis_archipelago §1.2, §6; the person, 12 Nov 2026: "shrink the land", answer (c)): the edifice that holds V, by where its base lay
// below the sea when it was born (b, m): under the sea its flank is the submarine 12° (RG_S), above it the subaerial 7° (RG_SA) — the slope breaks at
// the shoreline it grew to, as a shield's does. To v11.120 every member was the 12° cone and its land a 7° cone from its summit drawn on top,
// 2–2.6 V in all: the land and the reef rings 1.7× the volcano's waterline, 56 of 95 rings outside their own volcano's foot. H over the base and
// the foot R; a base above the sea (the plateau's head stood at +270 at 30 Ma) makes a 7° cone, a cone that never reaches it the 12°
function rgShape2(m,b){m.b0=b;const V=m.V,c12=Math.cbrt(3*V*RG_S*RG_S/Math.PI);if(b<=0){m.H=Math.cbrt(3*V*RG_SA*RG_SA/Math.PI);m.R=m.H/RG_SA;return;}
  if(c12<=b){m.H=c12;m.R=c12/RG_S;return;}const vol=s=>{const rs=s/RG_SA,rf=rs+b/RG_S;return Math.PI/3*(rs*rs*s+b*(rs*rs+rs*rf+rf*rf));};let lo=0,hi=c12-b;
  for(let k=0;k<44;k++){const s=0.5*(lo+hi);if(vol(s)>V)hi=s;else lo=s;}const s=0.5*(lo+hi);m.H=b+s;m.R=s/RG_SA+b/RG_S;}
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
  // v11.134 (analysis_archipelago §9; the person, 13 Nov 2026: "Let's go with a"): composites. Each birth above is a vent; oldest first, a vent within
  // K.comp.C km of a volcano that had a vent in the last K.comp.tau Myr builds onto it (its volume added, the centre the vents' volume-weighted mean),
  // else it starts one. A volcano is a member: the id its largest vent's, its age its first vent's, its shield done when its last vent's is (Tspan),
  // long along its vents' spread (asp, rot: the record an oval so, rgRecord). The pins stand alone, and a vent they would take is theirs (its volume in
  // their solved one). On Earth vents this close build one edifice (the Big Island five volcanoes, each Canary several shields, Tahiti two); drawn as a
  // cone each, seed 32's 159 stood 10 km apart and 5 km across, where Earth's chains keep 40–90 km and 9–46 km (analysis_archipelago §9)
  if(K.comp){const C=K.comp.C*1000,tau=K.comp.tau,E=pin.map((p,i)=>({pin:true,x:p.x,z:p.z,last:i?tg:K.ageOurs,vents:[]}));
    for(const v of M.filter(m=>m.pin<0).sort((a,b)=>b.age-a.age)){let best=null,bd=C;for(const e of E){if(e.last-v.age>tau||e.pin&&v.age>e.last)continue; /* a pin takes no vent older than itself */const d=Math.hypot(v.x-e.x,v.z-e.z);if(d<bd){bd=d;best=e;}}
      if(!best){E.push({x:v.x,z:v.z,last:v.age,vents:[v]});continue;}
      best.vents.push(v);best.last=Math.min(best.last,v.age);if(best.pin)continue;let w=0,x=0,z=0;for(const q of best.vents){w+=q.V;x+=q.x*q.V;z+=q.z*q.V;}best.x=x/w;best.z=z/w;}
    const keep=M.filter(m=>m.pin>=0);for(const e of E){if(e.pin||!e.vents.length)continue;const vs=e.vents,big=vs.reduce((a,b)=>b.V>a.V?b:a),first=vs.reduce((a,b)=>b.age>a.age?b:a);
      let V=0,cxx=0,czz=0,cxz=0,s2=0;for(const q of vs){V+=q.V;const dx=q.x-e.x,dz=q.z-e.z;cxx+=q.V*dx*dx;czz+=q.V*dz*dz;cxz+=q.V*dx*dz;s2+=q.V*q.R*q.R/4;} /* s2: each vent's own cone, a disc's second moment */
      const hold=vs.find(q=>K.tune&&K.tune[q.id]!==undefined),c=hold||e; /* a tuned vent holds its volcano's id and place, as a pin does */
      const m={id:(hold||big).id,pin:-1,x:c.x,z:c.z,age:first.age,V,frac:big.frac,nv:vs.length,vents:vs.map(q=>({id:q.id,x:q.x,z:q.z,age:q.age,V:q.V}))};rgShape(m);
      if(vs.length>1){const a=(cxx+s2)/V,c=(czz+s2)/V,b=cxz/V,tr=a+c,dt=Math.sqrt((a-c)*(a-c)/4+b*b);m.asp=Math.min(RG_OVAL.a1,Math.sqrt((tr/2+dt)/(tr/2-dt)));m.rot=0.5*Math.atan2(2*b,a-c);
        m.Tspan=first.age-Math.min(...vs.map(q=>q.age-q.Ts));}
      m.inSq=m.x>sq[0]&&m.x<sq[1]&&m.z>sq[2]&&m.z<sq[3];keep.push(m);}
    M.length=0;for(const m of keep)M.push(m);}
  M.forEach(rgShape);
  for(const id in K.tune||{}){const m=M.find(q=>q.id===id);if(m){m.target=K.tune[id];m.tuned=true;}} // v11.121: members held to a summit (K.tune)
  // the plateau: a band about the track and the head's disc at its old end, the plate beyond; its level solved below so the floor beside ours is K.floor
  const TP=[];for(let t=0;t<=K.span+1e-9;t+=0.25)TP.push(T(t));const head=T(K.span);
  const dTrack=(x,z)=>{let d=1e18;for(let i=1;i<TP.length;i++){const a=TP[i-1],b=TP[i],ex=b.x-a.x,ez=b.z-a.z,l=ex*ex+ez*ez,u=l>0?clamp(((x-a.x)*ex+(z-a.z)*ez)/l,0,1):0,qx=a.x+ex*u-x,qz=a.z+ez*u-z,q=qx*qx+qz*qz;if(q<d)d=q;}return Math.sqrt(d);};
  const platW=(x,z)=>Math.max(1-smooth(K.platW*1000,(K.platW+40)*1000,dTrack(x,z)),1-smooth(K.headR*600,K.headR*1000,Math.hypot(x-head.x,z-head.z)));
  // v11.126 (K.relief; analysis_archipelago §8): the old end is not platW's flat disc but a lower plateau with a volcanic centre where the head arrived and at
  // each later pulse — the thickened crust a pulse builds under the track (the Mascarene Plateau's banks each stand on one). rlAt(x, z): the point's static
  // relief and its share of each centre (0 past 3 radii and west of the old end, so the young province is the same to the bit); rlT(a, t): its relief at
  // age t, each centre grown over RL.grow Myr from its pulse
  const RL=K.relief||null,cen=[];if(RL){const q={x:0,z:0},hr=mulberry(K.seed*31+7);T(K.span,q);for(let i=0;i<RL.nh;i++)cen.push({x:q.x+sg*rgGauss(hr),z:q.z+sg*rgGauss(hr),R:RL.Rh*1000,H:RL.Hh*(0.7+0.3*hr()),t:K.span}); // the head's centres scattered over the plume's footprint as the births are, by an rng of their own (the births' draws untouched)
    for(const p of pulses.filter(p=>p.t>=RL.tmin&&p.t<K.span).sort((a,b)=>b.a-a.a)){T(p.t,q);if(cen.every(c=>Math.hypot(c.x-q.x,c.z-q.z)>=RL.gap*1000))cen.push({x:q.x,z:q.z,R:RL.Rp*1000,H:RL.Hp*p.a,t:p.t});}}
  const tAge=(x,z)=>{let d=1e18,ta=0;for(let i=1;i<TP.length;i++){const a=TP[i-1],b=TP[i],ex=b.x-a.x,ez=b.z-a.z,l=ex*ex+ez*ez,u=l>0?clamp(((x-a.x)*ex+(z-a.z)*ez)/l,0,1):0,qx=a.x+ex*u-x,qz=a.z+ez*u-z,q=qx*qx+qz*qz;if(q<d){d=q;ta=(i-1+u)*0.25;}}return ta;};
  const rlAt=(x,z)=>{const a=new Float64Array(cen.length+1);if(!RL)return a;const on=smooth(RL.t0-3,RL.t0,tAge(x,z));if(on<=0)return a;a[0]=on*smooth(0,0.25,platW(x,z))*(-RL.C+RL.B*(fbm(x/(RL.L*1000)+17.3,z/(RL.L*1000)+4.1,3)-0.5)*2); /* v11.136: the plateau's lowering where the plateau stands (its weight's last quarter the fade): to v11.135 the open plate too, past track age t0 − 3 — far from the curving track that age sweeps by in 2–4 km, a 350 m step across the floor */
    cen.forEach((c,i)=>{const d2=((x-c.x)*(x-c.x)+(z-c.z)*(z-c.z))/(c.R*c.R);if(d2<9)a[i+1]=on*c.H*Math.exp(-d2);});return a;}; // all of it by the old end's weight: nothing west of track age t0 − 3
  const rlNeck=(a,x,z)=>{let p=-1,q=-1;for(let i=0;i<cen.length;i++){const v=a[i+1]/cen[i].H;if(!v)continue;if(p<0||v>a[p+1]/cen[p].H){q=p;p=i;}else if(q<0||v>a[q+1]/cen[q].H)q=i;}return q>=0&&a[q+1]/cen[q].H>=(RL.sad+0.2*(fbm(x*0.00008+3.7,z*0.00008+8.1,2)-0.5)*2)*a[p+1]/cen[p].H;}; // a neck: the lesser of the two centres a point lies between has RL.sad of the greater's shape or more, the threshold wandering ±0.2 over ~12 km so a neck bends and pinches
  const rlT=(a,t)=>{let s=0;for(let i=0;i<cen.length;i++)if(a[i+1]){const h=a[i+1]*clamp((cen[i].t-t)/RL.grow,0,1);s+=h*h*h*h;}return s?a[0]+Math.sqrt(Math.sqrt(s)):a[0];}; // overlapping centres by a 4-norm, not a sum: a cluster stands about as high as its tallest, its lavas burying the others' flanks
  // flexure: a point load P = Δρ g V on a plate of rigidity D bends it by P α²/8D × kei(r/α)/kei(0) (Turcotte & Schubert §3.18); α the flexural parameter
  const D=7e10*Math.pow(K.Te*1000,3)/(12*(1-0.0625)),al=Math.pow(D/(2270*9.8),0.25),cf=1770*9.8*al*al/(8*D),n=M.length,Kf=new Float64Array(n*n);
  for(let i=0;i<n;i++)for(let j=0;j<n;j++)Kf[i*n+j]=cf*rgKei(Math.hypot(M[i].x-M[j].x,M[i].z-M[j].z)/al);
  M.forEach(m=>{m.pw=platW(m.x,m.z);m.rl=rlAt(m.x,m.z);m.rl0=rlT(m.rl,0);m.sw=RL?rlNeck(m.rl,m.x,m.z):false;}); // v11.126: each member's share of the old end's relief, and whether it stands on a neck (swept as the platform's reef there is)
  const ref={x:pin[0].x+6000,z:pin[0].z},refW=platW(ref.x,ref.z),refK=M.map(m=>cf*rgKei(Math.hypot(m.x-ref.x,m.z-ref.z)/al));
  const swellAt=(x,z,t)=>{T(t,o);const d=Math.hypot(x-o.x,z-o.z)/(K.swellW*1000);return K.swell*Math.exp(-d*d);};
  const A=Math.max(K.plateAge,K.span+1),cool=t=>350*(Math.sqrt(A)-Math.sqrt(A-t)); // how much shallower the plate stood at age t than now
  let top=K.floor;
  // the fed face: the current brings the open ocean's nutrient in across the province's upstream edge (to v11.101 the game's own was the gap in its sill).
  // A member with no other's top able to reach the shallows upstream of it — across its own foot, within K.fedL — sits in that water, where the
  // weed takes the shallows from the lime polyps: little or no reef, so planed, it sinks — a drowned bank, a guyot. The pins are never fed: their
  // reefs are the records'. (Seed 32's own members shelter both — ours in the lee of the drowned atoll 18 km up-current, the giant in ours' —
  // so the rule decides nothing there; it keeps the pins' reefs from hanging on a seed.) v11.130 (analysis_archipelago §2.6, §5 #11; the person, 13 Nov
  // 2026: "do 3a"): by its time. To v11.129 a member was fed once for all its history unless one upstream could ever stand above −300 m, whenever it
  // was born — a shelter born 10 Myr after it sank still counted. Now each member's upstream ones (m.up: the same geometry) shelter it only while one
  // of them stands in the light (its top within K.photic of the sea, litNow) — a step behind; m.fed is today's
  const ca=typeof CUR_A==='number'?CUR_A:2.3,ux=-Math.cos(ca),uz=-Math.sin(ca);
  // v11.131 (analysis_archipelago §2.7, §5 #8; the person, 13 Nov 2026: "do 2"): a birth's base is the ground already there. Its host: the older member whose foot
  // it is born inside, its shield already built, and whose cone stands highest there (by their 12° shapes); at its birth its base is raised to the host's surface there (m.off), and it
  // rides that surface as the host sinks and wears — a satellite cone, or on an old island the rejuvenated stage (Diamond Head and Punchbowl on Oahu). To v11.130 every member stood
  // on the plateau, and one whose top stayed under an older neighbour's flank was struck
  M.forEach((m,j)=>{m.host=-1;m.hd=0;if(m.pin>=0)return;let best=0;M.forEach((q,i)=>{if(i===j||q.age-m.age<q.Ts||q.V<=m.V)return;const d=Math.hypot(q.x-m.x,q.z-m.z);if(d>=q.R-0.5*m.R)return; /* bigger, its shield built before this one's birth (a vent on a shield still growing is its flank, buried as before), and it stands mostly on it */const s=q.H*(1-d/q.R);if(s>best){best=s;m.host=i;m.hd=d;m.hostId=q.id;}});});
  M.forEach((m,j)=>{m.up=m.pin<0?M.map((q,i)=>i).filter(i=>{if(i===j)return false;const q=M[i],rx=q.x-m.x,rz=q.z-m.z,al2=rx*ux+rz*uz,la=Math.abs(rx*uz-rz*ux);return al2>0&&al2<K.fedL*1000&&la<0.7*m.R+0.5*q.R;}):[];m.fed=false;});
  // a member that cannot come within 200 m of the lowest sea even at its birth, on the swell, unloaded, is a seamount whatever happens: not stepped
  const deep=M.map(m=>m.host<0&&K.plate+(K.floor-K.plate)*m.pw+Math.max(m.rl0,m.rl[0])+cool(m.age)+K.swell+m.H<-120-K.photic-200);
  const ord=M.map((m,i)=>i).sort((a,b)=>M[b].age-M[a].age); // oldest first: the loads are born in this order
  const run=mask=>{const Fl=new Float64Array(n),Ld=new Float64Array(n),S=[],grow=[];let ob=0;for(let j=0;j<n;j++)if(mask[j])S.push(j);
    M.forEach(m=>{m.plat=K.plate+(top-K.plate)*m.pw;m.off=0;m.born=false;m.E=0;m.peak=-1e9;m.reef=false;m.alive=false;m.rt=0;m.ring=0;m.lit=null;m.surf=null;m.src=-1;m.srcD=0;m.exp=0;m.died=null;m.lastB=null;m.litNow=false;m.zv=-1e9;});
    const litPrev=new Uint8Array(n);
    for(let k=Math.round(K.span/RG_DT);k>=0;k--){const t=k*RG_DT,sea=rgSea(t),C=cool(t);T(t,o);const px=o.x,pz=o.z;
      while(ob<n&&M[ord[ob]].age>t)grow.push(ord[ob++]);
      for(let g=grow.length-1;g>=0;g--){const i=grow[g],m=M[i],l=m.V*Math.min(1,(m.age-t)/m.Ts),dl=l-Ld[i];if(dl>0){for(const j of S)Fl[j]+=Kf[i*n+j]*dl;Ld[i]=l;}if(l>=m.V)grow.splice(g,1);}
      for(const j of S){const m=M[j];if(t>=m.age)continue;const dx=(m.x-px)/(K.swellW*1000),dz=(m.z-pz)/(K.swellW*1000);
        const base0=m.plat+(m.rl0||m.rl[0]?rlT(m.rl,t):0)+C+K.swell*Math.exp(-dx*dx-dz*dz)-Fl[j];if(m.host>=0){const Hq=M[m.host];if(Hq.born&&Hq.lastB!==null)m.off=Math.max(0,Hq.lastB+(Hq.zv-Hq.lastB)*Math.max(0,1-m.hd/Hq.R)-base0);} // v11.131: on its host's surface, which sinks and wears as the host does
        const base=base0+m.off,gr=Math.min(1,(m.age-t)/m.Ts),dB=m.lastB===null?0:base-m.lastB;m.lastB=base;
        if(!m.born){m.born=true;rgShape2(m,sea-base);} // v11.121: the edifice by where its base lies now, at its birth
        let zv=base+m.H*Math.cbrt(gr)-m.E;
        if(gr>=1){if(zv>sea)m.E+=K.erode*(zv-sea)*RG_DT;if(zv>sea-K.wb&&zv<sea+30&&!(m.alive&&m.rt>=zv-1))m.E+=K.plane*1000*RG_DT;zv=base+m.H-m.E;}
        if(zv>m.peak)m.peak=zv;m.zv=zv;
        // the reef: it takes hold once the shield is done on rock in the shallows — a fringe at the shore, or a cap on a summit just under — and keeps
        // to the sea at K.reef while the sea is over it; left deeper than K.photic it drowns, and takes hold again only if rock comes back into the shallows
        if(m.reef){m.rt+=dB;if(m.sw&&m.rt>sea)m.rt-=RL.diss*1000*RG_DT;} // v11.126: a swept reef top the sea has left dissolves (stepped only on the necks: a full-rate reef regrows its ~1 m a cycle, and the young province stays the same to the bit)
        const fed=m.up.length>0&&!m.up.some(i=>litPrev[i]);m.fed=fed; // v11.130: fed now, by what stands in the light upstream now
        if(gr>=1&&!m.alive&&(!fed||K.fedK>0)&&Math.max(zv,m.reef?m.rt:-1e9)>sea-K.photic*0.5){const rtop=Math.min(0.75*m.R,m.E/RG_S);if(!m.reef)m.ring=Math.max(800,rtop+Math.max(0,zv-sea)/RG_SA);m.reef=true;m.alive=true;m.rt=Math.min(sea,Math.max(zv,m.rt));m.died=null;}
        if(m.alive){if(m.rt<sea)m.rt+=Math.min(K.reef*(fed?K.fedK:1)*(m.sw?RL.swept:1)*1000*RG_DT*Math.exp(-(sea-m.rt)/K.light),sea-m.rt);else m.exp+=RG_DT;if(m.rt<sea-K.photic&&zv<sea-K.photic){m.alive=false;m.died=t;}}
        const topv=Math.max(zv,m.reef?m.rt:-1e9);m.litNow=topv>sea-K.photic;
        if(m.litNow&&m.lit===null){m.lit=t;let bd=1e18;for(let i=0;i<n;i++)if(i!==j&&litPrev[i]){const d=Math.hypot(M[i].x-m.x,M[i].z-m.z);if(d<bd){bd=d;m.src=i;m.srcD=d;}}}
        if(zv>sea&&m.surf===null)m.surf=t;}
      for(const j of S)litPrev[j]=M[j].litNow?1:0;}
    for(let j=0;j<n;j++){let f=0;for(let i=0;i<n;i++)f+=Kf[i*n+j]*Ld[i];M[j].fl=f;} // today's loads on every member, stepped or not
    let fr=0;for(let i=0;i<n;i++)fr+=refK[i]*M[i].V;return K.plate+(top-K.plate)*refW+swellAt(ref.x,ref.z,0)-fr;}; // the floor beside ours now
  // the pins: Newton then secant on each pinned volume (log) for its summit today, and the plateau's level for the floor beside ours
  const pm=M.map(m=>m.pin>=0||m.tuned),all=M.map((m,i)=>!deep[i]),prev=M.map(()=>null);let it=0,err=1e9;
  for(;it<40;it++){const fl=run(pm);top+=K.floor-fl;err=Math.abs(K.floor-fl);
    for(let q=0;q<M.length;q++){const m=M[q];if(m.pin<0&&!m.tuned)continue;const e=m.zv-m.target,lv=Math.log(m.V),p=prev[q];err=Math.max(err,Math.abs(e));
      let d=p&&Math.abs(e-p.e)>1e-6?-e*(lv-p.lv)/(e-p.e):-e/Math.max(50,m.H/3*0.6);d=clamp(d,-1,1);prev[q]={lv,e};m.V=Math.exp(lv+d);rgShape(m);}
    if(err<1)break;}
  run(all);M.forEach((m,i)=>{if(deep[i]){m.zv=m.plat+m.rl0+swellAt(m.x,m.z,0)+m.H-m.fl;m.peak=m.zv;}}); // the unstepped: today's summit on today's swell, under today's loads
  // today: each member's state, its flat top, its shore, and what the history says of its life
  for(const m of M){const s=m.zv,building=m.age<m.Ts;m.rtop=Math.min(0.75*m.R,m.E/RG_S);m.shore=s>0?m.rtop+s/RG_SA:m.reef&&m.rt>0?m.ring:0;m.top=Math.max(s,m.reef?m.rt:-1e9);
    m.state=building?(s>0?'shield':'young'):s>150?'high':s>0?(m.alive?'rim':'low'):m.reef&&m.rt>5?'raised':m.alive&&m.rt>-K.photic?(m.ring>6000?'bank':'atoll'):m.reef?(m.rt>-150?'drowned':'guyot'):m.E>0?'guyot':'seamount';
    m.land=m.shore>0?Math.PI*m.shore*m.shore/1e6:0;} // km², the disc's
  return {K,M,pulses,flux,track:T,tg,top,al,cf,err,iter:it,head,platW,swellAt,ref,cen,rlAt,rlT,rlNeck,tAge,
    floorAt:(x,z)=>{let f=K.plate+(top-K.plate)*platW(x,z)+swellAt(x,z,0);if(RL)f+=rlT(rlAt(x,z),0);for(const m of M)f-=cf*rgKei(Math.hypot(m.x-x,m.z-z)/al)*m.V;return f;}};
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
    const ring=m.reef&&(m.state!=='high'&&m.state!=='shield'||m.alive&&m.rt>-K.photic&&m.ring>m.shore+400),lag=rgLagD(m.ring); // v11.121: a high island's barrier too; v11.123 the lagoon by rgLagD
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const dx=x0+(i+0.5)*c-m.x,dz=z0+(j+0.5)*c-m.z,r=Math.sqrt(dx*dx+dz*dz);if(r>reach)continue;
      let g=s>0?(r<rt+s/RG_SA?s-Math.max(0,r-rt)*RG_SA:-(r-rt-s/RG_SA)*RG_S):s-Math.max(0,r-rt)*RG_S;
      if(ring)g=Math.max(g,r<=m.ring?m.rt-Math.min(lag,Math.max(0,m.ring-400-r)*0.05):m.rt-(r-m.ring)*0.9); // v11.123: the fore-reef 42° (31° to v11.122); the crest 400 m wide at the ring, the lagoon (a bank's flat) inside, the fore-reef's talus outside
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
// v11.115 (the province): the flood a generator, yielding every 16k cells, so world.js chemoGen can spread it over frames (a 955 × 568 grid is
// ~0.25 s at once); regionBasins runs it whole, the same answer
function regionBasins(H,n,cell,th,nz){const g=rgBasinsGen(H,n,cell,th,nz);for(;;){const r=g.next();if(r.done)return r.value;}}
function* rgBasinsGen(H,n,cell,th,nz){if(th===undefined)th=30;if(nz===undefined)nz=n;const N=n*nz,F=new Float32Array(N).fill(Infinity),hp=new Int32Array(N),lab=new Int32Array(N).fill(-1);let hn=0,yc=0;
  const up=k=>{const v=hp[k];while(k>0){const p=(k-1)>>1;if(F[hp[p]]<=F[v])break;hp[k]=hp[p];k=p;}hp[k]=v;},
    down=()=>{const v=hp[--hn];let k=0;for(;;){let c=2*k+1;if(c>=hn)break;if(c+1<hn&&F[hp[c+1]]<F[hp[c]])c++;if(F[hp[c]]>=F[v])break;hp[k]=hp[c];k=c;}hp[k]=v;};
  const push=i=>{hp[hn]=i;up(hn++);};
  const seed=k=>{if(F[k]===Infinity){F[k]=H[k];push(k);}}; // the edge: the open ocean (v11.112: an n × nz grid; a square's order as before)
  for(let i=0;i<Math.max(n,nz);i++){if(i<n){seed(i);seed((nz-1)*n+i);}if(i<nz){seed(i*n);seed(i*n+n-1);}}
  while(hn){if((++yc&16383)===0)yield;const k=hp[0];if(hn>1)down();else hn=0;const x=k%n,y=(k/n)|0,f=F[k];
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=n||yy>=nz)continue;const q=yy*n+xx;if(F[q]!==Infinity)continue;F[q]=Math.max(H[q],f);push(q);}}
  const B=[];for(let k=0;k<N;k++){if((k&65535)===65535)yield;if(lab[k]>=0||F[k]-H[k]<th||F[k]>=0)continue;const b={id:B.length,sill:F[k],floor:H[k],cells:0,sx:0,sz:0},st=[k];lab[k]=b.id;
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
// a flank's drop rf m past its start: s0 eased in over w, easing to s1 between a and b (rgRadial's; v11.127 the platform's walls too)
function rgFlank(rf,F){const t=Math.min(rf/F.w,1),d0=rf<F.w?F.w*(t*t*t-0.5*t*t*t*t):rf-0.5*F.w,u=clamp((rf-F.a)/(F.b-F.a),0,1),d1=rf<F.a?0:rf<F.b?(F.b-F.a)*(u*u*u-0.5*u*u*u*u):rf-0.5*(F.a+F.b);return F.s0*d0-(F.s0-F.s1)*d1;}
function rgRadial(R,r){let h=R.h0;for(const s of R.prof)h-=s[2]*smooth(s[0],s[1],r);const T=R.terr;h-=T.n*T.step*smooth(T.r0,T.r1,r);
  if(R.land&&r<R.land.r){const tl=1-r/R.land.r,S=tl*tl*(3-2*tl);h+=(R.land.b?R.land.h-R.land.b:R.land.h)*(0.55*tl+0.45*S);}
  const F=R.flank,rf=r-F.r;if(rf>0)h-=rgFlank(rf,F);
  if(R.rimR!==undefined){h=lerp(h,R.lagH,smooth(R.rimR-R.rimW*0.4,R.rimR-R.rimW*1.6,r));h=lerp(h,(R.rimH||0)+2.5,smooth(R.rimR-R.rimW,R.rimR-R.rimW*0.3,r)*smooth(R.rimR+R.rimW,R.rimR+R.rimW*0.3,r));}
  if(R.barrier){const c=rgCap(R.barrier,r);if(c>h)h=c;}
  return h;}
// v11.121 (analysis_archipelago §2.5, §6; the person, 12 Nov 2026): a high island's barrier reef — R.barrier: its ring r, the crest's half-width w,
// its top today, the lagoon's floor lag, the fore-reef's slope s. A cap of reef over the island's own ground, by max (the land stands above it):
// the lagoon from the coast to the ring, the crest awash or under, outside a wall and the fore-reef at s down onto the island's flank. The
// model gave four high islands a living ring off their coast that no record drew (Bora Bora's, Mayotte's stage). rgCap is it with no noise
// (the radial profile, the bounds); world.js islandH's adds the crest's islets and its passes
function rgCap(B,r){const c=r<=B.r?lerp(B.top-14,B.lag,smooth(B.r-B.w*0.4,B.r-B.w*1.6,r)):B.top-14-(r-B.r)*B.s;return lerp(c,B.top+2.5,smooth(B.r-B.w,B.r-B.w*0.3,r)*smooth(B.r+B.w,B.r+B.w*0.3,r));}
// the most a record's ground (h or the smooth hs) can stand at a distance d from its centre, on a table of RG_HIS steps (world.js sample skips a
// record that cannot raise the ground or give the conditions): its radius warped ±16% (islandH's rw), its flank's toe ±60 and the drop ribbed
// +15%, and what the radial profile leaves out — the hills (10.5), the rift ridges (8), a terrace's step (12), the rim's noise (3.5), a
// seamount's knobs, a reef's spurs (v11.107: 0.6·CARB.A over the smooth flank), the land's cliff and flows — with 5 to spare. `quiet`: past it every field the record gives but its influence is open water's (its shelf edge, rim, land,
// rift arms); the influence sample() takes from islandW alone (world.js).
const RG_HIS=50;
function rgBound(R){const F=R.flank,L=R.land,ex=10.5+8+12+4+5+(R.knob||0)+(R.carb?0.6*CARB.A:0)+(L?L.cliff+(L.flows?L.flows.h:0):0),n=Math.ceil(R.reach/RG_HIS)+1,hi=new Float32Array(n);
  const at=r=>{const rf=r-(F.r+60);let d=0;if(rf>0){const t=Math.min(rf/F.w,1),d0=rf<F.w?F.w*(t*t*t-0.5*t*t*t*t):rf-0.5*F.w,u=clamp((rf-F.a)/(F.b-F.a),0,1),d1=rf<F.a?0:rf<F.b?(F.b-F.a)*(u*u*u-0.5*u*u*u*u):rf-0.5*(F.a+F.b);d=F.s0*d0-(F.s0-F.s1)*d1;}
    const Q=Object.assign({},R,{flank:Object.assign({},F,{r:1e9})});return Math.max(rgRadial(Q,r)-0.85*d,R.barrier?rgCap(R.barrier,r):-1e9);};
  for(let k=0;k<n;k++){const a=0.84*k*RG_HIS,b=1.16*(k+1)*RG_HIS;let m=-1e9;for(let q=0;q<=8;q++){const v=at(a+(b-a)*q/8);if(v>m)m=v;}hi[k]=m+ex;}
  for(let k=n-2;k>=0;k--)if(hi[k]<hi[k+1])hi[k]=hi[k+1]; // never rising outward: a bump between the table's points is covered by the next
  R.hi=hi;R.hiS=RG_HIS;R.quiet=Math.max(R.terr.r1+150,R.riftR?R.riftR[2]:0,L?L.r:0,R.rimR!==undefined?R.rimR+R.rimW:0,R.barrier?R.barrier.r+R.barrier.w:0)/0.84+100;}
// v11.123 (analysis_archipelago §1.4, §6 step 3): a lagoon's depth below its reef's top by its ring — a lagoon is mostly limestone the lowstands'
// rain dissolved, so a wider catchment digs deeper (Purdy & Winterer 2001; Gischler et al. 2014, the Maldives: depth with area): 18 m on a
// 1 km ring, ~31 on 4, ~40 on 9, ~50 on 21, at most 60. To v11.122 18 + 6 a km to 40, and a ring past 6 km (a 'bank') flat at 20: the widest the shallowest
function rgLagD(rr){return clamp(10+13*Math.log(1+rr/1000),18,60);}
// v11.121: a barrier at ring rr whose reef's top is rt today — the lagoon as an atoll's of that ring (rgRecord's reef branch), the crest as wide, the fore-reef 31°
function rgBarrier(rr,rt){return {r:rr,w:Math.round(clamp(0.06*rr,40,300)),top:Math.round(rt),lag:Math.round(rt-rgLagD(rr)),s:0.9};} // v11.123: the lagoon by rgLagD, the fore-reef 42° (31° to v11.122)
// v11.123 (analysis_archipelago §3.1, §6 step 3): one margin per reef. Every record drew its whole rim, so where two reefs met their rims ran on
// across each other's lagoons (57 pairs crossing, 23 nested, three concentric to v11.120). A reef grows where it meets open water: an arc of a
// rim that lies in another's lagoon (or the platform's) is that lagoon's floor, and coalesced reefs meet as one margin round their union
// (Kwajalein's, Huvadhu's); a small reef (ring up to 2.5 km) wholly inside a wide lagoon keeps its rim, a faro (the Maldives'). R.rimM: the
// rim's weight by the angle from its centre (RG_RM bins), 1 open, 0 inside another's lagoon; islandH scales the crest by it and fills the
// crest's band toward the lagoon. Ours keeps its own
const RG_RM=48;
function rgMargins(L){const ring=R=>R.rimR!==undefined?[R.rimR,R.rimW]:R.barrier?[R.barrier.r,R.barrier.w]:null,Q=L.filter(R=>R.id!=='home'&&ring(R));
  const P_={x:0,z:0},faro=(A,B)=>{const [rA]=ring(A),[rB,wB]=ring(B);if(rA>2500)return false;if(!A.asq&&!B.asq&&!A.lobe&&!B.lobe)return Math.hypot(A.x-B.x,A.z-B.z)+rA<rB-1.6*wB; /* two round ones: as to v11.128, the same doubles */for(let k=0;k<8;k++){rgAt(A,rA,k/8*TAU,P_);if(rgLoc(B,P_.x,P_.z)>=rB-1.6*wB)return false;}return true;}; // v11.129: A wholly inside B's lagoon, by both frames
  const meet=(A,B,slack)=>{const [rA]=ring(A),[rB]=ring(B),d=Math.hypot(A.x-B.x,A.z-B.z);if(!A.asq&&!B.asq&&!A.lobe&&!B.lobe)return d<rA+rB-slack;if(d<1)return true;const ux=(B.x-A.x)/d,uz=(B.z-A.z)/d;return d<rgAlong(A,rA,ux,uz)+rgAlong(B,rB,-ux,-uz)-slack;};
  for(const A of Q){const [rA]=ring(A),T=new Float32Array(RG_RM+1);let any=false;
    for(let k=0;k<=RG_RM;k++){const a=k/RG_RM*TAU;rgAt(A,rA,a,P_);const px=P_.x,pz=P_.z;let m=1; // the rim's table by its own angle, as islandH reads it (an oval's local, a round one's the world's)
      for(const B of Q){if(B===A)continue;const [rB,wB]=ring(B);if(!meet(A,B,0))continue;if(faro(A,B))continue; // a faro
        m*=1-smooth(rB-wB*0.4,rB-wB*1.6,rgLoc(B,px,pz));}
      const sd=rgPlatSd(px,pz);if(sd>-1e8)m*=1-smooth(RG_PL_K.crest*0.4,RG_PL_K.crest*1.6,sd);T[k]=m;if(m<0.999)any=true;}
    if(any)A.rimM=T;else delete A.rimM;}
  // one floor: reefs that met share their deepest lagoon (the union is the wider lagoon, rgLagD's), so no member's floor stands as a disc inside
  // another's; one that met the platform takes its lagoon's depth; a faro keeps its own shallow lagoon
  const lagOf=R=>R.rimR!==undefined?R.lagH:R.barrier.lag,setLag=(R,v)=>{if(R.rimR!==undefined)R.lagH=v;else R.barrier.lag=v;},top=R=>R.rimR!==undefined?R.rimH:R.barrier.top;
  const up=Q.map((R,i)=>i),find=i=>up[i]===i?i:(up[i]=find(up[i]));
  for(let i=0;i<Q.length;i++)for(let j=i+1;j<Q.length;j++){const A=Q[i],B=Q[j],[,wA]=ring(A),[,wB]=ring(B);
    if(!meet(A,B,Math.min(wA,wB))||faro(A,B)||faro(B,A))continue;up[find(i)]=find(j);}
  const deep=new Map();Q.forEach((R,i)=>{const g=find(i),v=Math.min(lagOf(R),R.rimM&&rgPlatSd(R.x,R.z)>-ring(R)[0]-RG_PL_K.crest*2?top(R)-RG_PL_K.lag:Infinity);deep.set(g,Math.min(deep.has(g)?deep.get(g):Infinity,v));});
  Q.forEach((R,i)=>{const v=Math.round(deep.get(find(i)));if(v<lagOf(R))setLag(R,v);});}
// v11.129: a world point's radius in a record's own frame (islandH's turn, scale and squeeze, before its warps), the world point at a radius and angle in
// it, and the record's world radius at a local radius toward a unit world direction
function rgLoc(R,x,z){let lx=x-R.x,lz=z-R.z;if(R.rot){const c=Math.cos(R.rot),s=Math.sin(R.rot),tx=lx*c+lz*s;lz=lz*c-lx*s;lx=tx;}if(R.sc!==1){lx/=R.sc;lz/=R.sc;}if(R.asq)lz*=R.asq;const u=Math.hypot(lx,lz);return R.lobe?u/lbF(R,Math.atan2(lz,lx),u*R.lmax):u;}
function rgAt(R,r,a,o){const L=R.lobe?rgLbFix(R,a,r):1;let lx=r*L*Math.cos(a),lz=r*L*Math.sin(a);if(R.asq)lz/=R.asq;lx*=R.sc;lz*=R.sc;if(R.rot){const c=Math.cos(R.rot),s=Math.sin(R.rot);o.x=R.x+lx*c-lz*s;o.z=R.z+lx*s+lz*c;}else{o.x=R.x+lx;o.z=R.z+lz;}return o;}
function rgAlong(R,r,ux,uz){if(!R.asq&&R.sc===1&&!R.rot&&!R.lobe)return r;const c=Math.cos(R.rot||0),s=Math.sin(R.rot||0),p=(ux*c+uz*s)/R.sc,q=(uz*c-ux*s)/R.sc*(R.asq||1);return r/Math.hypot(p,q)*(R.lobe?rgLbFix(R,Math.atan2(q,p),r):1);}
// v11.135: a lobed record's scale for its own radius r at its angle a — world.js lbF reads the fade at the unlobed radius, which is r times the scale, so
// the scale its own fixed point (the map is monotone, so it is one; iterated to 1e-12)
function rgLbFix(R,a,r){let f=lbF(R,a,r);for(let i=0;i<80;i++){const g=lbF(R,a,r*f*R.lmax);if(Math.abs(g-f)<1e-12)return g;f=g;}return f;}
function rgAng(T,a){let u=a*(RG_RM/TAU);u-=Math.floor(u/RG_RM)*RG_RM;const i=Math.min(RG_RM-1,Math.floor(u)),t=u-i;return T[i]+(T[i+1]-T[i])*t;} // a rim table at world angle a
// a member's record by its state (above). v11.132 (the person, 13 Nov 2026: "make the noise seed follow the member's id"): its noise seed (ns) and its
// rifts' draws by its own id, so a change to one member reshapes no other record (to v11.131 ns was its place among the built and the rifts drew
// from the pass's one rng: a record in or out reseeded every record after it)
// v11.129 (analysis_archipelago §3.3, §5; the person, 13 Nov 2026: "let's do 1"): a volcano born on an old fracture zone (m.frac, the births regionModel
// draws onto them) is an oval along it — its record turned to the zones' heading (K.fracA, ±jit), squeezed across by its aspect (a0–a1, by a draw of its own
// id) and stretched along by its root, so its area and its volume are the round one's (Rangiroa 80 × 32 km, long on its volcano's line; Hawaii's and the
// Canaries' rift zones). The pins and a tuned member (the awesome shield) stay round; land: whether a member with land today takes it too.
// Which members are records stays decided by the round footprint of the same area (the burials since v11.131 by the burier's own frame)
const RG_SAT_K=3; // v11.131: a satellite's flank below its base falls this many times steeper — the skirt where its own cone meets its host's slope
const RG_OVAL={on:true,land:true,a0:1.3,a1:2.4,jit:0.2};
function rgRecord(m,K){const ns=1000+37*Number(m.id.slice(1)),rng=mulberry(WB.hashString('rifts:'+m.id)),R={id:m.id,x:m.x,z:m.z,rot:0,sc:1,ns,state:m.state,age:m.age};
  if(m.asp>1.05&&m.pin<0){R.rot=m.rot;R.sc=Math.sqrt(m.asp);R.asq=m.asp;} /* v11.134: a composite long along its vents' spread */
  else if(RG_OVAL.on&&m.frac&&m.pin<0&&!m.tuned&&(RG_OVAL.land||!(m.state==='high'||m.state==='shield'||m.state==='rim'||m.state==='low'))){const h=mulberry(WB.hashString('oval:'+m.id)),asp=RG_OVAL.a0+(RG_OVAL.a1-RG_OVAL.a0)*h();R.rot=K.fracA+RG_OVAL.jit*(h()-0.5)*2;R.sc=Math.sqrt(asp);R.asq=asp;}
  if(m.off>0)R.sat={b:Math.round(m.lastB),k:RG_SAT_K,host:m.hostId}; // v11.131: a satellite's base today (its host's surface at its birth, sunk since): its own flank ends there in a skirt
  const arms=()=>{const a=K.fracA+0.3*(rng()-0.5)*2;return [a,(a+Math.PI+0.3*(rng()-0.5)*2)%TAU];};
  if(m.state==='high'||m.state==='shield'||m.state==='rim'){const sb=m.off>0&&m.lastB>0?m.lastB:0,sh=Math.round(sb>0?Math.min(m.shore,m.rtop+(m.zv-sb)/RG_SA):m.shore),act=m.state==='shield',yg=act||m.age<1,q=act?0:clamp(m.age/1.3,0.3,1.5),L={r:sh,h:Math.round(m.zv), /* v11.131: a satellite on land (its base above the sea, sb) a cone on its pedestal — its land from its summit (h, as every island's) down to its base (b), h0 its base */cliff:act?15:yg?20:30,gully:{n:Math.round(clamp(sh/600,8,act?14:36)),lee:act?0.15:0.25}};
    if(sb>0)L.b=Math.round(sb);if(yg){L.cald={r:clamp(0.07*sh,150,1800),d:clamp(0.05*m.zv,20,150),w:clamp(0.004*sh,25,80)};L.flows={n:Math.round(clamp(sh/250,20,90)),h:act?10:5,hw:0.45};R.rifts=arms();R.riftR=[L.cald.r,L.cald.r+500,sh+(act?5000:800),sh+(act?2500:300)];}
    if(act){R.h0=Math.round(sb);R.prof=[[sh,sh+200,25],[sh+200,sh+900,150]];R.terr={r0:sh+200,r1:sh+900,n:0,step:0};R.flank={r:sh+900,w:300,s0:0.27,s1:0.21,a:800,b:4000};}
    else{const w=v=>Math.round(v*q),c=Math.round(Math.min(sh,Math.max(0.5*sh,sh+1380-w(2800))));L.r=c;R.h0=Math.round(sb);R.prof=[[c,c+w(300),8],[c+w(300),c+w(1000),52],[c+w(1800),c+w(2300),94],[c+w(2300),c+w(2800),40]];R.terr={r0:c+w(1000),r1:c+w(1800),n:sb>0?0:8,step:12}; /* no wave-cut terraces where it never met the sea */R.flank={r:c+w(2800),w:250,s0:0.21,s1:0.21,a:600,b:2600};}
    R.land=L;R.fade=[R.flank.r,R.flank.r+3000];R.core=Math.round(Math.min(L.r,R.fade[0]/1.2));
    if(m.reef&&m.alive&&m.rt>-K.photic&&m.ring>L.r+400){const rr=Math.round(m.ring);R.barrier=rgBarrier(rr,m.rt);R.fade=[Math.max(R.fade[0],rr+1500),Math.max(R.fade[1],rr+4500)];}} // v11.121: a living ring off the coast (to v11.120 a rim island was drawn as an atoll, its land left out)
  else if(m.reef&&m.state!=='guyot'){const rr=Math.round(m.ring),rt=Math.round(m.rt),W=clamp(0.06*rr,40,300);R.h0=rt-14;R.rimR=rr;R.rimW=W;R.rimH=rt;R.lagH=rt-Math.round(rgLagD(rr));R.patch=1;
    // v11.123 (analysis_archipelago §3.5–3.6): the outer slope a reef's, not a volcano's — the reef flat's edge to −20, the spur-and-groove terrace to −32,
    // a wall to −122, the slow plate's one bench there (the last Myr's ten lowstands cut one shoreline over and over: ~5 m of sinking a cycle),
    // the wall again to −580 and the talus at 35° easing to 17° onto the volcano (Enewetak's margin: under 10° on the reef plate, a slope from −16
    // steepening to ~55° and easing to 35°, debris below). To v11.122 ours' basalt profile scaled (eight 12 m terraces, the flank 17° easing to 12°)
    R.prof=[[rr+0.3*W,rr+90,6],[rr+80,rr+210,12],[rr+190,rr+310,90],[rr+390,rr+640,160],[rr+560,rr+1040,300]];R.terr={r0:rr+310,r1:rr+390,n:0,step:0};R.flank={r:rr+950,w:200,s0:0.70,s1:0.30,a:900,b:3200};R.fade=[rr+2800,rr+5800];R.carb={n:Math.max(24,Math.round(TAU*(rr+1500)/CARB.sp))};} // carb (v11.107): the cap's spurs round it, every CARB.sp m at the slope's top
  else{const rS=m.state==='guyot'?Math.max(200,m.rtop):clamp(0.05*m.R,120,300);R.h0=Math.round(m.zv);R.prof=m.state==='guyot'?[]:[[0,2*rS,20]];R.terr={r0:rS,r1:rS+400,n:0,step:0};R.flank={r:rS,w:300,s0:0.36,s1:0.22,a:600,b:2000};R.bare=R.h0;R.knob=30;R.fade=[rS+1500,rS+4000];}
  if(RG_LOBE.on&&m.pin<0)rgLobe(R,m,K);
  return R;}
// v11.135 (analysis_archipelago §9.6; the person, 13 Nov 2026: "The lobed is a solid idea"): a volcano's outline lobed — Earth's are, by their
// vents and their rift zones (the Big Island three-armed, El Hierro and Tenerife stars, an atoll's reef on the volcano it caps), where to v11.134
// every record was a circle or a smooth ellipse (test/earth.js: the hull's roundness 0.91 against Earth's 0.68–0.87). In the record's own frame
// (after its turn and squeeze), the outline the union of its vents' cones (each a disc of its own foot at its place; the largest at the centre),
// as far as `cap` times the centre's, smoothed over ±`sm` steps, and drawn out along its rift zones (the record's rifts where it has them, else 2 or
// 3 arms by its id, on the fracture grain), their reach `armA` and width `armW` (rad). Kept to the area (its mean square 1); the table holds it over
// its farthest (lmax), which multiplies sc, so every bound read by sc stays a bound (sample() then reads its own radius, world.js recLoc). Whole to its land's or rim's
// radius (lbR), `far` of it on the deep flank (world.js lbF): Earth's deep flanks are smoother than their coasts, and a barrier as lobed as its island's
// coast was a starfish
const RG_LOBE={on:true,cap:1.8,sm:2,armA:[0.12,0.3],armW:0.35,far:0.35};
function rgLobe(R,m,K){const N=RG_RM,s=new Float64Array(N),h=mulberry(WB.hashString('lobe:'+m.id)),c=Math.cos(R.rot||0),sn=Math.sin(R.rot||0);
  const loc=(x,z)=>{let lx=x-R.x,lz=z-R.z;const tx=lx*c+lz*sn;lz=lz*c-lx*sn;lx=tx;lx/=R.sc;lz/=R.sc;if(R.asq)lz*=R.asq;return [lx,lz];};
  const D=[];if(m.vents&&m.vents.length>1){const big=m.vents.reduce((a,b)=>b.V>a.V?b:a);for(const v of m.vents){const q={V:v.V};rgShape(q);const [px,pz]=loc(v.x,v.z);D.push({x:v===big?0:px,z:v===big?0:pz,r:q.R/R.sc});}}
  const r0=D.length?Math.max(...D.filter(d=>d.x===0&&d.z===0).map(d=>d.r)):1;
  for(let k=0;k<N;k++){const a=k/N*TAU,ca=Math.cos(a),sa=Math.sin(a);let t=r0;for(const d of D){const along=d.x*ca+d.z*sa,off=d.z*ca-d.x*sa;if(Math.abs(off)<d.r){const e=along+Math.sqrt(d.r*d.r-off*off);if(e>t)t=e;}}s[k]=Math.min(RG_LOBE.cap*r0,t)/r0;}
  const sm=new Float64Array(N);for(let k=0;k<N;k++){let a=0;for(let j=-RG_LOBE.sm;j<=RG_LOBE.sm;j++)a+=s[(k+j+N)%N];sm[k]=a/(2*RG_LOBE.sm+1);}
  // the rift zones' arms, in the record's own frame
  const wa=R.rifts?R.rifts.slice():(()=>{const n=h()<0.5?2:3,a0=K.fracA+0.3*(h()-0.5)*2;return Array.from({length:n},(_,i)=>a0+i*TAU/n+0.25*(h()-0.5)*2);})();
  const arms=wa.map(a=>{const ux=Math.cos(a),uz=Math.sin(a),p=(ux*c+uz*sn),q=(uz*c-ux*sn)*(R.asq||1);return {a:Math.atan2(q,p),A:(RG_LOBE.armA[0]+(RG_LOBE.armA[1]-RG_LOBE.armA[0])*h())/(R.asq||1)};}); // an arm the less where the record is long already
  let ms=0;for(let k=0;k<N;k++){const a=k/N*TAU;let f=1;for(const g of arms){let d=a-g.a;d-=TAU*Math.round(d/TAU);f+=g.A*Math.exp(-(d/RG_LOBE.armW)*(d/RG_LOBE.armW));}sm[k]*=f;ms+=sm[k]*sm[k];}
  const nr=Math.sqrt(ms/N);let lmax=0,lmin=1e9;for(let k=0;k<N;k++){sm[k]/=nr;lmax=Math.max(lmax,sm[k]);lmin=Math.min(lmin,sm[k]);}
  const T=new Float32Array(N+1);for(let k=0;k<N;k++)T[k]=sm[k];T[N]=T[0];R.lobe=T;R.lmax=lmax;R.sc*=lmax;
  R.lbR=R.land?R.land.r:R.rimR!==undefined?R.rimR:R.flank?R.flank.r:1000;R.lbG=RG_LOBE.far;}
// the records: shaped, the buried struck, the rest kept if their foot reaches the world; the floor's grid over the world and every kept record's land.
// v11.106 (GLOBE §10.1 step 4, the world to ±WHALF): in two passes, so the old square's records are v11.102's to the bit — first the members
// that reach the old square (HALF + 2 km, as v11.102–105 built them: the same list, order, rng and noise seeds), then the rest that reach the
// world, by their own rng, their seeds after; the floor's grid is v11.102's lattice grown by whole nodes, so every node it had is the same node
// v11.115 (GLOBE §10.1, the province grown): a third pass, the members that reach the province's rectangle and not v11.106's ±70.5 km
// (WORLD70), by a third rng — 75 more, 122 records with the pins (37 members struck, buried under a neighbour's flank). None reaches ±70.5 km, so
// the ground there is v11.114's to the bit; the floor's grid grows to the province by whole nodes again.
// v11.132: the passes' rngs gone — each record's seed and rifts by its member's id (rgRecord), whatever list or pass it falls in.
function rgBuild(Rg){const K=Rg.K,W0=[-HALF-2000,HALF+2000,-HALF-2000,HALF+2000],W=[WORLD70.i0*CELL-HALF-2000,WORLD70.i1*CELL-HALF+2000,WORLD70.j0*CELL-HALF-2000,WORLD70.j1*CELL-HALF+2000],W2=[WX0-2000,WX1+2000,WZ0-2000,WZ1+2000],box=(x,z,r,w)=>x+r>w[0]&&x-r<w[1]&&z+r>w[2]&&z-r<w[3]; // the boxes as rectangles (v11.112; a square's test the same decisions)
  const cand=w=>Rg.M.filter(m=>m.pin<0&&box(m.x,m.z,m.R*1.6+3000,w)).sort((a,b)=>b.top-a.top),c0=cand(W0),c1=cand(W),c2=cand(W2);
  const ext=(L,w)=>{let x0=w[0]-5000,x1=w[1]+5000,z0=w[2]-5000,z1=w[3]+5000;for(const m of L){const r=Math.max(m.shore,m.ring,m.R)+6000;x0=Math.min(x0,m.x-r);x1=Math.max(x1,m.x+r);z0=Math.min(z0,m.z-r);z1=Math.max(z1,m.z+r);}return [x0,z0,x1,z1];};
  const e0=ext(c0,W0),e1=ext(c2,W2),G=RG_FLG,ox=e0[0]-G,oz=e0[1]-G; // v11.102's origin: its x0 less a node
  rgFloorInit(Rg,ox,oz,Math.ceil(Math.max(0,e0[0]-e1[0])/G),Math.ceil(Math.max(0,e0[1]-e1[1])/G),Math.max(e1[2],e0[2]),Math.max(e1[3],e0[3]));
  const foot=R=>{const f0=rgFloor(R.x,R.z)-BASIN.knee-200;let r=0;while(r<80000&&rgRadial(R,r)>f0)r+=50;return r;};
  {const gm=Rg.M.find(m=>m.id==='giant'),GR=ISLANDS.find(R=>R.id==='giant'); // v11.121 (the person, 12 Nov 2026: "along with this"): the giant's barrier reef, the model's — its top today, its ring as far past its record's coast as past the model's
    if(gm&&GR&&GR.land&&gm.reef&&gm.alive&&gm.rt>-K.photic&&gm.ring>gm.shore)GR.barrier=rgBarrier(Math.round(GR.land.r+gm.ring-gm.shore),gm.rt);}
  const kept=ISLANDS.slice(),out=[],struck=[],later=new Set(c1.filter(m=>!c0.includes(m))),later2=new Set(c2.filter(m=>!c1.includes(m)));
  const pass=(L,w)=>{for(const m of L){const R=rgRecord(m,K),top=R.land?R.land.h:R.rimR!==undefined?R.rimH:R.h0;
    if(m.off>0&&m.lastB>0&&m.zv-m.lastB<20){struck.push({id:m.id,by:m.hostId});continue;} // v11.131: a satellite on land worn to its base is its host's ground now
    if(!R.land&&rgPlatSd(m.x,m.z)>-(R.rimR!==undefined?0.5*R.rimR:0)){struck.push({id:m.id,by:'platform'});continue;} // v11.122: a member the platform grew over (its centre on it, a reef's within half its ring) is buried by it; land stands above it
    // v11.131: a satellite never buries its own host; the burier read in its own frame (an oval's: v11.129 kept the round distance so the list would not move)
    const by=kept.find(B=>!(B.sat&&B.sat.host===m.id)&&rgRadial(B,rgLoc(B,R.x,R.z))>top-20);if(by){struck.push({id:m.id,by:by.id});continue;}
    const f=foot(R);R.reach=Math.round(Math.max(1.2*f,R.fade[1])+500);if(!box(R.x,R.z,R.reach,w)){(w===W0?later:later2).add(m);continue;}rgBound(R);R.an=anTables(R.ns);kept.push(R);out.push(R);}};
  pass(c0,W0);const n0=out.length;pass(c1.filter(m=>later.has(m)),W);const n1=out.length;pass(c2.filter(m=>later2.has(m)),W2); // the old square's, then the world's (a member of the first list kept by the world alone is shaped again: v11.132 the same shape)
  for(const R of ISLANDS){const f=foot(R),need=Math.round(1.2*f+500);if(need>R.reach)R.reach=need;if(R.id==='giant')rgBound(R);} // the pins: their flanks go on down to the model's floor; the giant's kit is the model's (land, rifts, flows: no collapse, dikes, 
  rgMargins(kept); // v11.123: one margin per reef, once every record stands (the pins' barrier too; ours keeps its rim)
  return {recs:out,struck,n0,n1};}
// ---------- the plateau's platform (v11.122; analysis_archipelago §2.3, §6 step 2; the person, 12 Nov 2026: "one carbonate platform") ----------
// The model stepped a reef on every member and none on the plateau they stand on, though the plateau's old end — the head, on a plate 15–25 Myr
// old then, on the swell — stood within 25 m of the sea or above it at 24–30 Ma over some 29,000 km², sinking ~0.05–0.1 mm/yr after: by the
// members' own rule (a reef that takes hold keeps up at that rate) a carbonate platform today, as the Mascarene Plateau's banks are on the
// Réunion track (Saya de Malha 40,808 km²). rgPlatform runs that rule on a grid of the plateau's own surface (RG_PLG): the plateau's level, the
// plate's cooling, the swell and every load's moat (loads growing over their shield's time, refreshed every RG_PL_K.rf Myr between which they
// are interpolated), erosion and the waves' planing while it stands above the sea, the reef taking hold within photic/2 of the sea and keeping
// to it at K.reef by the light, drowned past K.photic — steps of RG_PL_K.dt (the members' 2 kyr resolve the deglaciations' 10 kyr rises; the
// platform's reef stands near a highstand's level when each rise comes, so 20 kyr changes nothing it decides: 0.25 s, not 1.8). The fed rule is not
// applied: it decides which single member the open ocean's water reaches first, and on a platform that is its own up-current margin, behind
// which the platform shelters itself (the rule's own wording: "no other's top able to reach the shallows upstream"). Its load is not counted
// (the members' reef caps are not either). What it keeps: where the reef lives today, its top; around them a signed distance (RG_PL.sd: + inside,
// − outside, metres) that rgPlat reads with a warped margin — the rim at the reef's top (awash, islets, passes), the lagoon behind it to
// RG_PL_K.lag deep over RG_PL_K.lagW (a wide lagoon is a deep one, Purdy & Winterer's karst), outside a wall at RG_PL_K.wall onto the plateau.
// Members whose centre lies on it are buried by it (rgBuild strikes them, by 'platform'), those that stand above it as land keep their land.
const RG_PLG=3000,RG_PL_K={dt:0.02,tf:3,dtf:0.005,rf:0.05,crest:400,lag:50,karst:20,lagW:6000,wall:0.9,warp:1500,warp2:300,isl:4000,leeD:REEF_LEE.D,leeF:REEF_LEE.F,wf:{w:200,s0:0.70,s1:0.30,a:900,b:3200},lf:{w:300,s0:0.27,s1:0.12,a:1500,b:5000}}; // grid m (3 km: 0.2 s at load, the margin warped finer); Myr, from tf Ma on dtf Myr (v11.126: the 41 and 100 kyr cycles resolved, for the necks' karst and regrowth), Myr; the rim's half-width; the lagoon's depth at lagW in, its roll (±m), and lagW (m); the wall's slope (42°); the margin's warps (m); its influence outside (m); v11.127 (analysis_archipelago §8.5 step 2) the margin by its side: a lee crest under the sea by up to leeD m, leeD·(1 − e^(−fetch/leeF)) (Saya de Malha's west flat 50–55 m behind 230 km of bank, its windward east 30–35), the windward wall the atolls' (wf: their flank, 35° easing to 17°), the lee a prograding slope (lf: 15° easing to 7°)
function rgPlatform(Rg){const K=Rg.K,M=Rg.M,G=RG_PLG,P=RG_PL_K,A=Math.max(K.plateAge,K.span+1),cool=t=>350*(Math.sqrt(A)-Math.sqrt(A-t));
  // v11.136: the grid anchored at v11.115–135's corner (its world's less 4 km) and grown from it by whole nodes, so a node it had is the same node
  const ax=-79680,az=-105480,x0=ax-G*Math.ceil(Math.max(0,ax-(WX0-4000))/G),z0=az-G*Math.ceil(Math.max(0,az-(WZ0-4000))/G),RA=new Map(),nx=Math.ceil((WX1+4000-x0)/G)+1,nz=Math.ceil((WZ1+4000-z0)/G)+1,N=nx*nz,plat=new Float64Array(N),cand=[];
  const sw2=1/((K.swellW*1000)*(K.swellW*1000)),o={x:0,z:0},TQ=[];for(let t=0;t<=K.span+1e-9;t+=0.25){Rg.track(t,o);TQ.push([o.x,o.z,cool(t)]);} // the swell by the plume's place, computed once a time
  const hiAt=(i,j)=>{const k=j*nx+i,x=x0+i*G,z=z0+j*G;plat[k]=K.plate+(Rg.top-K.plate)*Rg.platW(x,z);const ra=Rg.rlAt?Rg.rlAt(x,z):null,hi=ra&&ra.some(v=>v)?(RA.set(k,ra),Math.max(ra[0],Rg.rlT(ra,0))):0;let mx=-1e9;for(const q of TQ){const dx=x-q[0],dz=z-q[1],b=plat[k]+hi+q[2]+K.swell*Math.exp(-(dx*dx+dz*dz)*sw2);if(b>mx)mx=b;}return mx;};
  const reach=-120-K.photic*0.5,cs=3,near=new Uint8Array(N); // unloaded it stands highest: a node that cannot come within reach so is never stepped. Every 3rd node first, 300 m to spare (the swell and the plateau vary over tens of km), then every node by a coarse one that came within it
  for(let j=0;j<nz;j+=cs)for(let i=0;i<nx;i+=cs)if(hiAt(i,j)>reach-300)for(let jj=Math.max(0,j-cs);jj<=Math.min(nz-1,j+cs);jj++)for(let ii=Math.max(0,i-cs);ii<=Math.min(nx-1,i+cs);ii++)near[jj*nx+ii]=1;
  for(let k=0;k<N;k++)if(near[k]&&hiAt(k%nx,Math.floor(k/nx))>reach)cand.push(k);
  const nc=cand.length,nm=M.length,cx=new Float64Array(nc),cz=new Float64Array(nc),kf=new Float32Array(nc*nm);
  for(let c=0;c<nc;c++){cx[c]=x0+(cand[c]%nx)*G;cz[c]=z0+Math.floor(cand[c]/nx)*G;for(let i=0;i<nm;i++)kf[c*nm+i]=Rg.cf*rgKei(Math.hypot(M[i].x-cx[c],M[i].z-cz[c])/Rg.al);}
  const ord=M.map((m,i)=>i).sort((a,b)=>M[b].age-M[a].age),Ff=new Float64Array(nc),F0=new Float64Array(nc),F1=new Float64Array(nc),S0=new Float64Array(nc),S1=new Float64Array(nc);
  let done=0;const grow=[]; // the loads: whole ones summed once into Ff as they finish, the growing ones added at each refresh
  const flexAt=(t,F)=>{while(done<nm&&M[ord[done]].age>t){grow.push(ord[done]);done++;}
    for(let g=grow.length-1;g>=0;g--){const i=grow[g],m=M[i];if(t<=m.age-m.Ts){for(let c=0;c<nc;c++)Ff[c]+=kf[c*nm+i]*m.V;grow.splice(g,1);}}
    F.set(Ff);for(const i of grow){const m=M[i],w=m.V*Math.min(1,(m.age-t)/m.Ts);for(let c=0;c<nc;c++)F[c]+=kf[c*nm+i]*w;}};
  const swAt=(t,S)=>{Rg.track(t,o);for(let c=0;c<nc;c++){const dx=cx[c]-o.x,dz=cz[c]-o.z;S[c]=K.swell*Math.exp(-(dx*dx+dz*dz)*sw2);}};
  const E=new Float64Array(nc),rt=new Float64Array(nc),lastB=new Float64Array(nc),reef=new Uint8Array(nc),alive=new Uint8Array(nc),pc=new Float64Array(nc),B0=new Float64Array(nc),B1=new Float64Array(nc);let first=true;
  for(let c=0;c<nc;c++)pc[c]=plat[cand[c]];const pk=K.photic*0.5,il=1/K.light,RLK=K.relief,RC=new Array(nc).fill(null),sw=new Uint8Array(nc);
  // v11.126: each candidate's relief, and whether it lies on a neck
  for(let c=0;c<nc;c++){const ra=RA.get(cand[c]);if(!ra)continue;RC[c]=ra;if(Rg.rlNeck(ra,cx[c],cz[c]))sw[c]=1;} // regionModel's rlNeck, as the members' necks are
  const TS=[],n1=Math.round((K.span-P.tf)/P.dt),n2=Math.round(P.tf/P.dtf);for(let k=0;k<n1;k++)TS.push(K.span-k*P.dt);for(let k=n2;k>=0;k--)TS.push(k*P.dtf); // the steps' ages
  let tA=K.span;flexAt(tA,F0);swAt(tA,S0);let tB=Math.max(0,tA-P.rf);flexAt(tB,F1);swAt(tB,S1);
  const setB=()=>{for(let c=0;c<nc;c++){B0[c]=S0[c]-F0[c];B1[c]=S1[c]-F1[c]-B0[c];}};setB();
  for(let si=0;si<TS.length;si++){const t=TS[si],dt=si?TS[si-1]-t:P.dt,er=K.erode*dt,pl=K.plane*1000*dt,gr=K.reef*1000*dt,kd=RLK?RLK.diss*1000*dt:0;if(t<tB-1e-9){tA=tB;F0.set(F1);S0.set(S1);tB=Math.max(0,tA-P.rf);flexAt(tB,F1);swAt(tB,S1);setB();}
    const u=tA>tB?(tA-t)/(tA-tB):0,sea=rgSea(t),C=cool(t),lo=sea-pk,dr=sea-K.photic,wb=sea-K.wb,sf=sea+30;
    for(let c=0;c<nc;c++){const base=pc[c]+(RC[c]?Rg.rlT(RC[c],t):0)+C+B0[c]+B1[c]*u,dB=first?0:base-lastB[c];lastB[c]=base;let e=E[c],zv=base-e;
      if(zv>sea)e+=er*(zv-sea);const al=alive[c];let r=rt[c];if(zv>wb&&zv<sf&&!(al&&r>=zv-1))e+=pl;E[c]=e;zv=base-e;
      if(reef[c]){r+=dB;if(r>sea)r-=kd;} // v11.126: a reef top the sea has left dissolves (karst)
      if(!al){if((reef[c]?Math.max(zv,r):zv)>lo){r=Math.min(sea,reef[c]?Math.max(zv,r):zv);reef[c]=1;alive[c]=1;}}
      if(alive[c]){if(r<sea)r+=Math.min(gr*(sw[c]?RLK.swept:1)*Math.exp((r-sea)*il),sea-r);if(r<dr&&zv<dr)alive[c]=0;}rt[c]=r;}
    first=false;}
  // the platform today: the nodes whose reef lives; the signed distance to its margin (a chamfer, both ways), the reef's top carried outward
  const inn=new Uint8Array(N),top=new Float32Array(N),d1=new Float64Array(N),d2=new Float64Array(N),INF=1e12,D=G*Math.SQRT2;let n=0,bb=[1e18,-1e18,1e18,-1e18];
  for(let c=0;c<nc;c++)if(alive[c]&&rt[c]>-K.photic){const k=cand[c];inn[k]=1;top[k]=rt[c];n++;bb=[Math.min(bb[0],cx[c]),Math.max(bb[1],cx[c]),Math.min(bb[2],cz[c]),Math.max(bb[3],cz[c])];}
  if(!n)return null;
  for(let k=0;k<N;k++){d1[k]=inn[k]?INF:0;d2[k]=inn[k]?0:INF;}
  const pass=(d,T,T2)=>{for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const k=j*nx+i;for(const [di,dj,w] of [[-1,0,G],[0,-1,G],[-1,-1,D],[1,-1,D]]){const ii=i+di,jj=j+dj;if(ii<0||jj<0||ii>=nx)continue;const q=jj*nx+ii;if(d[q]+w<d[k]){d[k]=d[q]+w;if(T)T[k]=T[q];if(T2)T2[k]=T2[q];}}}
    for(let j=nz-1;j>=0;j--)for(let i=nx-1;i>=0;i--){const k=j*nx+i;for(const [di,dj,w] of [[1,0,G],[0,1,G],[1,1,D],[-1,1,D]]){const ii=i+di,jj=j+dj;if(ii>=nx||jj>=nz||ii<0)continue;const q=jj*nx+ii;if(d[q]+w<d[k]){d[k]=d[q]+w;if(T)T[k]=T[q];if(T2)T2[k]=T2[q];}}}};
  // v11.127 (analysis_archipelago §8.5 step 2): each bank's lagoon by its size — rgLagD of the disc of its area (Purdy & Winterer's: a wider catchment
  // dissolved deeper), carried outward with the top
  const lg=new Float32Array(N),lab=new Int32Array(N).fill(-1);for(let k=0;k<N;k++){if(!inn[k]||lab[k]>=0)continue;const st=[k],mem=[];lab[k]=k;
    while(st.length){const q=st.pop();mem.push(q);const i=q%nx,j=(q-i)/nx;for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const ii=i+di,jj=j+dj;if(ii<0||jj<0||ii>=nx||jj>=nz)continue;const w=jj*nx+ii;if(inn[w]&&lab[w]<0){lab[w]=k;st.push(w);}}}
    const L=rgLagD(Math.sqrt(mem.length*G*G/Math.PI));for(const q of mem)lg[q]=L;}
  pass(d1,null);pass(d2,top,lg);
  // and every node's fetch: the run of a bank's shallows upwind of it (against WIND_A, the trade swell's way), past at most two nodes of its wall — 0 on a
  // windward margin, the bank's breadth on a leeward one
  const fe=new Float32Array(N),wa=typeof WIND_A==='number'?WIND_A:3.49,ux=-Math.cos(wa),uz=-Math.sin(wa);
  for(let k=0;k<N;k++){const i=k%nx,j=(k-i)/nx;let run=0,skip=0,inR=false;for(let s=1;s<=300;s++){const ii=Math.round(i+ux*s),jj=Math.round(j+uz*s);if(ii<0||jj<0||ii>=nx||jj>=nz)break;if(inn[jj*nx+ii]){inR=true;run++;}else if(inR||++skip>2)break;}fe[k]=run*G;}
  const sd=new Float32Array(N);for(let k=0;k<N;k++)sd[k]=inn[k]?d1[k]-G/2:-(d2[k]-G/2);
  // v11.126: the drowned carbonate — every node a reef held that lives no more — its margin and its top today (sd2, top2), so a drowned neck is a flat under
  // the light between its banks' walls, walled itself where it meets the plateau; null when nothing drowned (as to v11.125). (v11.127: the drowned alone —
  // with the living in it, its wall from their top at the sea overrode a lee margin's lower crest and gentler slope)
  let sd2=null,top2=null,nd=0;for(let c=0;c<nc;c++)if(reef[c]&&!inn[cand[c]])nd++;
  if(nd){const cb=new Uint8Array(N);top2=new Float32Array(N);for(let c=0;c<nc;c++)if(reef[c]&&!inn[cand[c]]){const k=cand[c];cb[k]=1;top2[k]=Math.min(0,rt[c]);bb=[Math.min(bb[0],cx[c]),Math.max(bb[1],cx[c]),Math.min(bb[2],cz[c]),Math.max(bb[3],cz[c])];}
    for(let k=0;k<N;k++){d1[k]=cb[k]?INF:0;d2[k]=cb[k]?0:INF;}pass(d1,null);pass(d2,top2);sd2=new Float32Array(N);for(let k=0;k<N;k++)sd2[k]=cb[k]?d1[k]-G/2:-(d2[k]-G/2);}
  const pad=P.warp+P.warp2+P.isl+G;return {G,x0,z0,nx,nz,sd,top,lg,fe,sd2,top2,n,nd,area:n*G*G/1e6,drowned:nd*G*G/1e6,bb:[bb[0]-pad,bb[1]+pad,bb[2]-pad,bb[3]+pad]};}
// the platform's signed distance at a point, unwarped (rgBuild's burial test); −1e9 off it. carb (v11.126): the carbonate's, living or drowned — the greater of
// the living's and the drowned's (chunks.js chRange)
function rgPlatSd(x,z,carb){const P=RG_PL;if(!P||x<P.bb[0]||x>P.bb[1]||z<P.bb[2]||z>P.bb[3])return -1e9;const u=(x-P.x0)/P.G,v=(z-P.z0)/P.G,i=Math.floor(u),j=Math.floor(v);if(i<0||j<0||i>=P.nx-1||j>=P.nz-1)return -1e9;
  const tu=u-i,tv=v-j,k=j*P.nx+i,at=S=>(S[k]*(1-tu)+S[k+1]*tu)*(1-tv)+(S[k+P.nx]*(1-tu)+S[k+P.nx+1]*tu)*tv;return carb&&P.sd2?Math.max(at(P.sd),at(P.sd2)):at(P.sd);}
// the platform's ground at (x, z), and into o its fields (world.js sample takes them where it is the ground): the lagoon's weight, the rim's
// band and its passes, the margin's outward normal (for the waves' and the current's aspect), its influence, the wall's hard spurs, the smooth
// surface; −1e9 where it is not. The margin is warped at two scales so it is never the grid's

function rgPlat(x,z,o){const P=RG_PL;if(!P||x<P.bb[0]||x>P.bb[1]||z<P.bb[2]||z>P.bb[3])return -1e9;const u=(x-P.x0)/P.G,v=(z-P.z0)/P.G,i=Math.floor(u),j=Math.floor(v);if(i<0||j<0||i>=P.nx-1||j>=P.nz-1)return -1e9;
  const K=RG_PL_K,tu=u-i,tv=v-j,k=j*P.nx+i,S=P.sd,T=P.top,nx=P.nx,S2=P.sd2;let sd=(S[k]*(1-tu)+S[k+1]*tu)*(1-tv)+(S[k+nx]*(1-tu)+S[k+nx+1]*tu)*tv,sd2=S2?(S2[k]*(1-tu)+S2[k+1]*tu)*(1-tv)+(S2[k+nx]*(1-tu)+S2[k+nx+1]*tu)*tv:-1e9;
  if(Math.max(sd,sd2)<-(K.isl+K.warp+K.warp2+P.G))return -1e9;
  const gx=((S[k+1]-S[k])*(1-tv)+(S[k+nx+1]-S[k+nx])*tv)/P.G,gz=((S[k+nx]-S[k])*(1-tu)+(S[k+nx+1]-S[k+1])*tu)/P.G,gl=Math.hypot(gx,gz)||1; // the distance's gradient points inward
  if(sd<K.lagW+K.warp+K.warp2){const wp=K.warp*(fbm(x*0.0004+311,z*0.0004+97,3)-0.5)*2+K.warp2*(fbm(x*0.003+51,z*0.003+13,2)-0.5)*2;sd+=wp;sd2+=wp;} // v11.126: the carbonate's margin warped with the banks' (read only where the banks' is near)
  const bl=A=>(A[k]*(1-tu)+A[k+1]*tu)*(1-tv)+(A[k+nx]*(1-tu)+A[k+nx+1]*tu)*tv,top=bl(T),n1=(fbm(x*0.02+5,z*0.02+3,2)-0.5)*2,lgB=P.lg?bl(P.lg):K.lag,feB=P.fe?bl(P.fe):0;
  // v11.127: the margin by its side. e: how squarely it faces the trade swell (1 windward, −1 lee, by its outward normal); the windward crest at the
  // reef's top, its flat broader (W) and fewer passes; the lee crest under the sea by the bank's shallows upwind (dL, never below the lagoon's floor + 15),
  // its islets gone with its depth
  const onx=-gx/gl,onz=-gz/gl,wa=typeof WIND_A==='number'?WIND_A:3.49,e=-(onx*Math.cos(wa)+onz*Math.sin(wa)),wl=smooth(-0.1,0.5,-e),W=K.crest*(0.7+0.6*Math.max(0,e)),dL=Math.max(0,Math.min(K.leeD*(1-Math.exp(-feB/K.leeF)),lgB-15)),ct=top-dL;
  const lagK=smooth(W*0.4,W*1.6,sd),crK=smooth(-W,-W*0.3,sd)*smooth(W,W*0.3,sd),ra=smooth(0.3-0.15*e,0.62-0.15*e,fbm(x*0.0012+11,z*0.0012+7,2)),lagD=18+(lgB-18+K.karst*(fbm(x*0.00008+71,z*0.00008+29,3)-0.5)*2)*smooth(W,K.lagW,sd); // the lagoon deepening inward, its floor rolling ±karst over 10–15 km (the lowstands' dissolution; its patch reefs and holes are the next step's)
  let gS;if(sd>=0)gS=lerp(ct-14,top-lagD,lagK);else{const d=-sd-0.3*W,hW=ct-14-6*smooth(0,90,d)-12*smooth(80,210,d)-90*smooth(190,310,d)-160*smooth(390,640,d)-300*smooth(560,1040,d)-(d>950?rgFlank(d-950,K.wf):0),hL=ct-8-(d>0?rgFlank(d,K.lf):0);gS=lerp(hW,hL,wl);} // v11.127: outside, the windward wall the atolls' (v11.123: the reef flat's edge, the terrace, a wall to −122, the bench, the wall to −580, the talus), the lee a slope of the sand it sheds (to v11.126 a plane at 42° all round)
  let g=sd>=0?lerp(ct-14,lagK>0?lagoonF(x,z,top-lagD+1.5*n1,top):top-lagD,lagK):gS;g=lerp(g,ct+lerp(1.5*n1,2.5+3.5*n1,smooth(-8,-1,ct)),crK*ra)-3*(1-ra)*crK; // v11.123: the lagoon's patch reefs and blue holes (world.js lagoonF)
  o.lag=lagK;o.rimK=crK;o.rimA=ra;o.nx=onx;o.nz=onz;o.isl=smooth(-K.isl,0,sd);o.carb=smooth(-W*0.5,-W*1.5,sd)*smooth(-1000,-850,g)*(1-wl);o.hs=lerp(gS,ct+2.5,crK);o.sd=sd;
  if(S2&&sd<0){const T2=P.top2,wu=clamp(u+(fbm(x*0.0005+7.1,z*0.0005+2.3,2)-0.5)*1.2,0,P.nx-1.001),wv=clamp(v+(fbm(x*0.0005+1.9,z*0.0005+6.7,2)-0.5)*1.2,0,P.nz-1.001),wi=Math.floor(wu),wj=Math.floor(wv),su=wu-wi,sv=wv-wj,wk=wj*nx+wi,t2=(T2[wk]*(1-su)+T2[wk+1]*su)*(1-sv)+(T2[wk+nx]*(1-su)+T2[wk+nx+1]*su)*sv,gD=sd2>=0?t2+4*n1:t2+K.wall*sd2; // v11.126: the drowned flat (its floor rolling ±4 m), walled where it ends; a bank's wall stops on it
    if(gD>g){g=gD;o.lag=0;o.rimK=0;o.rimA=1;o.carb=sd2>=0?0.3:smooth(-W*0.5,-W*1.5,sd2)*smooth(-1000,-850,g);o.hs=sd2>=0?t2:gD;}}
  return g;}
// ---------- the islands' lineages (v11.119, analysis_flora_diversity §5.6; SEAFLOOR §6, the range term; the person, 12 Nov 2026) ----------
// The model knows each member's first light (lit) and the lit member nearest it then (src): the province was settled from its oldest, in the
// far east, down the chain in hops of ~11 km (the median; 54 km the longest) over 30 Myr. A poor disperser — a brooder: the sacs, the crowns,
// the cones the brooding hingeshells became — crosses a gap rarely, so its populations along the chain drift apart with the hops between them
// (isolation by distance). RANGE cuts the chain by hops from the founder into three: the old east (≤ east), the middle (≤ mid) and the young
// west, the rest. v11.134: the cuts are thirds of ours' own hops (ours 9 since the composites; 21 to v11.133, cut at 7 and 14). R.hops, R.rng (0 east, 1 middle, 2 west) on every record, pins too; a member never lit takes its nearest
// lit record's. A brooding line has a sister species by range (flora.js `range`, chunks.js chRange); every other line has larvae or spores
// and is one species over the province.
const RANGE={east:1/3,mid:2/3}; // v11.134: of ours' hops (to v11.133 the hops themselves, 7 and 14)
function rangeBuild(Rg){const M=Rg.M,hop=new Array(M.length).fill(-1),by=new Map(M.map((m,i)=>[m.id,i]));
  const depth=i=>{if(hop[i]!==-1)return hop[i];hop[i]=-3;const m=M[i];let d=-2;if(m.lit!==null){if(m.src<0)d=0;else{const p=depth(m.src);d=p>=0?p+1:-2;}}hop[i]=d;return d;};
  for(const R of ISLANDS){const i=by.get(R.id);R.hops=i===undefined?-2:depth(i);}
  for(const R of ISLANDS){if(R.hops>=0)continue;let bd=1e18,b=null;for(const Q of ISLANDS){if(Q.hops<0)continue;const d=Math.hypot(Q.x-R.x,Q.z-R.z);if(d<bd){bd=d;b=Q;}}R.hops=b?b.hops:99;}
  const ho=ISLANDS.find(R=>R.id==='home').hops,e=Math.round(ho*RANGE.east),md=Math.round(ho*RANGE.mid);for(const R of ISLANDS)R.rng=R.hops<=e?0:R.hops<=md?1:2;}
const REGION=regionModel();RG_PL=rgPlatform(REGION);const RG_BUILT=rgBuild(REGION);for(const R of RG_BUILT.recs)ISLANDS.push(R);shelterBuild();rangeBuild(REGION); // v11.117: the records' shelter of each other, once every record stands; v11.119 their lineages
