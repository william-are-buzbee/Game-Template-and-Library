// reef.js — the sessile life's structures: the colonies and the banks (v11.181; to v11.178 only the two extra giant-colony shapes). What is
// left of the reef pass (REEF.md): v11.20 built manufactured reef structures with live colonies on them; v11.21 struck them and put the
// colonies on the geology's rock instead; v11.22 struck that too (the person, 10 Sep 2026: the coat clipped, stood at odd angles, and "dark
// rock and these things meant for light sand"; "put the placed rocks with stuff stuck to it in the bin"). What v11.22 keeps from the pass is
// upstream of any coat: nothing is placed inside rock any more — the rock goes first and every plant asks the collision hash before it stands
// (chunks.js, placeFloraType `clear`). The generator and the coat are in the v11.20–11.21 zips if a barnacle-on-rock ever wants them back.
// v11.181 (analysis_sessile.md; the person, 18 Nov 2026: one giant "pasted everywhere ... just not believable or accurate to evolution"): the
// old domes are the farmers' colonies again — in the light, a few metres, a handful to a coast, with the microatoll where one meets the lowest
// tide — and the big living shapes below them are the banks: many animals, not one. Every structure here is drawn by the far layer with the
// rock's material (far.js; the knoll since v11.182 without its tide band, `farMat`) and its cores' dodecahedra are its collision, as the rock kits' are. Appended to FLORA after the rocks, so the
// structures' placement streams (far.js bigsGen, one per BIG index) before them are unchanged.
// ---------- the colonies (the polyps' farmers: a green in the skin, so the light's) ----------
// The person (v11.21): the largest coral more varied rather than scaled up. The old dome (flora.js) is a banded mound, the massive colony's
// shape; two more, each a real growth form of one: two lobes that grew into each other (a colony that split and fused, or two that met), and
// the low wide one that spread instead of rising once it neared the wave base. To v11.178 all three were 12–30 m and stood from −20 to −150
// on fed hard ground: ~95 within 2.7 km of the start (FLORA.md planned ~4 in the world), a farmer six times deeper than its light and in the
// water farmers lose. Earth's massive colonies are 1–5 m; the few past 10 m (the Solomons' 34 × 32 × 5.5 m, Ta'u's) are centuries old,
// famous, and in clear shallow water. Now 3–9 m (the low wide one to 14), −5 to −30, poor clear water, old rock, the top held at the lowest
// spring tide (clear 4.5, world.js TIDE_A1): a colony grows to the low water and stops.
function lobedGeo(seed) {
  const rg = mulberry(seed),
    P = [];
  mound(P, {r: 0.62, sq: 0.6, bands: 4, col: [0.9, 0.9, 0.9], sw: 9, sh: 6}, rg, -0.34, 0, 0.1);
  mound(P, {r: 0.5, sq: 0.62, bands: 4, col: [0.86, 0.88, 0.86], sw: 8, sh: 5}, rg, 0.42, 0, -0.14);
  return kit(P, [
    {x: -0.34, y: 0, z: 0.1, r: 0.82, s: [1, 0.66, 1], rot: [0, 0, 0]},
    {x: 0.42, y: 0, z: -0.14, r: 0.66, s: [1, 0.68, 1], rot: [0, 0, 0]}
  ]);
}
function lowdomeGeo(seed) {
  const rg = mulberry(seed),
    P = [];
  mound(P, {r: 0.92, sq: 0.3, bands: 6, col: [0.9, 0.9, 0.9], sw: 10, sh: 6}, rg, 0, 0, 0);
  return kit(P, [{x: 0, y: 0, z: 0, r: 1.16, s: [1, 0.36, 1], rot: [0, 0, 0]}]);
}
// the microatoll (v11.181): a massive colony whose top reached the lowest tide — the top dies of the air at every spring low and goes to turf,
// the rim lives on and grows outward, so it is a flat dish with a living lip (Earth's microatolls: the low water's own record, read by
// geologists to the centimetre). Only just under the lowest tide (−4.6 to −7.5), so only on the reef flats and the shallow rock; 2–6 m wide
const MTOP=[0.6,0.63,0.5],MRIM=[0.92,0.9,0.84],MRIM2=[0.82,0.8,0.74];
function microGeo(seed){const rg=mulberry(seed),P=[],n=11;
  P.push(part(G.cyl(0.84,0.94,0.18,10,false),0,0.11,0,MTOP)); // the dead top, turfed, at the low water
  for(let i=0;i<n;i++){const a=i/n*TAU+(rg()-0.5)*0.25,rr=0.19+rg()*0.06;P.push(part(G.sph(rr,6,4),Math.cos(a)*0.86,0.13,Math.sin(a)*0.86,i%2?MRIM:MRIM2,{s:[1,0.78,1]}));} // the living lip in lobes
  P.push(part(G.cyl(0.97,1.02,0.1,12,true),0,0.05,0,MRIM2)); // last year's band on the flank
  return kit(P,[{x:0,y:0.04,z:0,r:1.1,s:[1,0.27,1],rot:[0,0,0]}]);}
// ---------- the gaper banks (v11.181) ----------
// A bank is generations of gapers (flora.js): the larvae settle on their elders, the elders die shut and their young bury them, so the mound is
// old valves bound together under a skin of living ones with their gapes open (Earth's oyster reefs and mussel banks by the same rule). It is
// where the old domes stood to v11.178 — fed hard ground in a current, −6 to −90 — because that was a filter feeder's envelope all along: food
// carried to it, not light. Long across the current (`flow`: local x across it), low, a few metres: three cores of dead shell, ~50 gapers on the
// top and the shoulders (a third dead, shut and greyer), loose valves round the foot. 6–13 m long, 1–2.5 m high.
const GDEAD=[0.62,0.6,0.56],GDEAD2=[0.7,0.67,0.6];
function bankGeo(seed){const rg=mulberry(seed),P=[],lumps=[],C=[[0,0.62,0.42,0],[-0.6,0.46,0.38,0.08],[0.62,0.44,0.36,-0.07]]; // the cores: x, radius, height over radius, z
  for(const [cx,r,sq,cz] of C){P.push(part(G.sph(r,8,5),cx,0,cz,GDEAD,{s:[1.1,sq,0.8]}));P.push(part(G.sph(r*0.78,7,4),cx+(rg()-0.5)*0.1,r*sq*0.32,cz,GDEAD2,{s:[1.1,sq,0.8]}));lumps.push({x:cx,y:0,z:cz,r:r*1.27,s:[1.1,sq,0.8],rot:[0,0,0]});}
  const inside=(x,y,z,k)=>{for(let i=0;i<C.length;i++){if(i===k)continue;const c=C[i],u=(x-c[0])/(c[1]*1.1),v=y/(c[1]*c[2]),w=(z-c[3])/(c[1]*0.8);if(u*u+v*v+w*w<0.92)return true;}return false;};
  const on=(k,ph,th)=>{const c=C[k],ex=Math.cos(ph)*Math.cos(th),ey=Math.sin(ph),ez=Math.cos(ph)*Math.sin(th);return {x:c[0]+c[1]*1.1*ex,y:c[1]*c[2]*ey,z:c[3]+c[1]*0.8*ez,n:V3(ex/1.1,ey/c[2],ez/0.8).normalize()};}; // a point on core k's skin and its normal
  for(let n=0,tries=0;n<42&&tries<400;tries++){const k=rg()<0.4?0:rg()<0.5?1:2,ph=0.3+rg()*1.15,p=on(k,ph,rg()*TAU);if(inside(p.x,p.y,p.z,k))continue;
    const live=ph>0.55&&rg()<0.72;gaperAt(P,p.x,p.y-0.008,p.z,p.n,0.045+rg()*0.025,live?0.3+rg()*0.3:0.04,live?2:0,0,live?1:0.78,rg,true);n++;}
  for(let n=0,tries=0;n<56&&tries<400;tries++){const k=rg()<0.4?0:rg()<0.5?1:2,p=on(k,0.12+rg()*1.3,rg()*TAU);if(inside(p.x,p.y,p.z,k))continue; // the dead: single valves bedded in the skin, every way up
    const nn=p.n.clone().add(V3((rg()-0.5)*0.7,(rg()-0.5)*0.4,(rg()-0.5)*0.7)).normalize(),rv=0.04+rg()*0.025,c=rg()<0.5?GDEAD:GDEAD2;P.push(part(G.cyl(rv,rv*0.85,rv*0.3,5,false),p.x,p.y,p.z,[c[0]*1.08,c[1]*1.08,c[2]*1.08],{dir:nn,s:[1,1,1.25]}));n++;}
  for(let i=0;i<14;i++){const th=rg()*TAU,d=1+rg()*0.22;P.push(part(G.cyl(0.05,0.045,0.012,5,false),Math.cos(th)*d*1.12,0.085,Math.sin(th)*d*0.58,GDEAD2,{r:[(rg()-0.5)*0.6,rg()*TAU,(rg()-0.5)*0.6],s:[1,1,1.25]}));} // loose valves at the foot
  return kit(P,lumps);}
// ---------- the tube knolls (v11.181; v11.182 the thicket) ----------
// Wormshells (flora.js) settling on wormshells: in the wash the tubes pile into a knoll, the old cemented together under the living (Earth's
// vermetid platforms, Bermuda's boilers and the serpulid clumps of Loch Creran: the same rule). Exposed rock in the surf, −2.5 to −11; its top
// held three metres under mean water (clear 3), so the springs' lows bare it. 2.5–6 m across, 1–2.5 high.
// v11.182 (the person, 18 Nov 2026: the lone tubes "looked the best by far"; the knoll, "the rock looking ball of little worms", too busy): to
// v11.181 a pale dome of three cores with 94 short tubes lying and standing every way on it and a crown on 7 — a rock with things stuck to it
// (v11.22's bin) at a grain too fine to read. A crowded tube-dweller grows up, not along: Earth's serpulids and vermetids in a clump stand erect
// and near parallel, racing each other for the water over them. So the knoll is the lone tube's gesture many times over: 24 long ribbed tubes
// rising from a dark foot of their dead and fanning out, the middle's tallest, a crown on every living mouth; a fifth dead, shorter, greyer and
// open. The foot is dark so the tubes stand off it, not lie on a rock. The young are the lone wormshells round it (the same envelope, flora.js):
// a kit of its own put three at its edge, and from a swimmer's height they lay flat and read as sticks.
const KFOOT=[0.32,0.3,0.27],KFOOT2=[0.38,0.36,0.32],KDEAD=[0.64,0.62,0.58],KSINK=0.06;
// one tube of the thicket: from (x, y, z) along d, five ribbed segments wandering as the lone one does and bending a little toward the water
// above; returns its mouth {x,y,z,d}
function knollTube(P,x,y,z,d,len,r,col,rg){const L=len/5,v=d.clone();let px=x,py=y,pz=z;
  for(let k=0;k<5;k++){v.x+=(rg()-0.5)*0.42;v.z+=(rg()-0.5)*0.42;v.y+=0.08;v.normalize();const s=v.clone().multiplyScalar(L),r0=r*(1+0.03*k),r1=r*(1+0.03*(k+1));
    P.push(part(G.cyl(r1*(k%2?1.14:0.9),r0*(k%2?0.9:1.14),L*1.04,5,true),px+s.x/2,py+s.y/2,pz+s.z/2,col,{dir:s}));px+=s.x;py+=s.y;pz+=s.z;}
  return {x:px,y:py,z:pz,d:v};}
function knollGeo(seed){const rg=mulberry(seed),P=[],N=24,RB=0.58;
  P.push(part(G.sph(0.66,8,5),0,-0.03,0,KFOOT,{s:[1,0.42,1]}));P.push(part(G.sph(0.42,7,4),0.14,0.06,-0.08,KFOOT2,{s:[1,0.5,1]})); // the foot: the dead cemented, showing only between the living's bases
  for(let i=0;i<N;i++){const th=i*2.39996+(rg()-0.5)*0.5,rho=RB*Math.sqrt((i+0.3+rg()*0.4)/N),c=Math.cos(th),s=Math.sin(th),dead=rg()<0.2; // spread by the golden angle: as even as a crowd that never moves
    const y=0.2*Math.sqrt(Math.max(0,1-(rho/0.66)**2)),d=V3(c*rho*1.7+(rg()-0.5)*0.2,1,s*rho*1.7+(rg()-0.5)*0.2).normalize(),len=(0.8-0.5*rho)*(0.82+rg()*0.36)*(dead?0.6:1),r=0.028+rg()*0.014;
    const t=knollTube(P,c*rho,y,s*rho,d,len,r,dead?KDEAD:i%4?WSHELL:WSHELL2,rg);if(dead)continue;
    P.push(part(G.cyl(r*1.4,r*1.15,r*0.5,5,true),t.x,t.y,t.z,WSHELL2,{dir:t.d})); // the aperture's lip
    crown(P,V3(t.x,t.y,t.z).addScaledVector(t.d,r*0.3),{n:5,len:r*4.5,w:r*0.45,spread:0,rim:r*1.1,col:CFLESH,lite:true},rg);}
  return kit(P,[{x:0,y:0.02,z:0,r:0.78,s:[1,0.75,1],rot:[0,0,0]}]);}
const LOBED = lobedGeo(97),
  LOWDOME = lowdomeGeo(103),
  MICRO=microGeo(107),BANK=bankGeo(109),KNOLL=knollGeo(113),
  GIANT_T = [
    [0.55, 0.5, 0.42],
    [0.6, 0.55, 0.4],
    [0.5, 0.55, 0.45]
  ];
// the entries, after every rock's (far.js BIG: each structure kind's stream is its index). env: the old dome's (flora.js) for its sisters; the
// low wide one where the waves do not break it (expo), since that is how it got old. clear: metres the top stays under mean water (far.js bigPlace)
for (const e of [
  {id: 'olddome2', k: LOBED, s: [2, 5], sx: [0.9, 1.15], tints: GIANT_T, sink: 0.1, per: 1, env: FLORA_BY_ID.olddome.env, field: 0.009, clear: 4.5},
  {id: 'olddome3', k: LOWDOME, s: [3.5, 7.5], sx: [0.85, 1.3], tints: GIANT_T, sink: 0.1, per: 1, env: {h: [-30, -5], sub: [0.5, 1], nut: [0, 0.5], young: [0, 0.4], expo: [0, 0.45]}, field: 0.009, clear: 4.5},
  {id:'microatoll',k:MICRO,s:[1,2.8],sx:[0.85,1.2],tints:[[0.85,0.8,0.7],[0.9,0.84,0.68],[0.8,0.84,0.74]],sink:0.05,per:5,env:{h:[-7.5,-4.6],sub:[0.5,1],nut:[0,0.5],young:[0,0.4]},field:0.01,clear:4.5},
  {id:'gaperbank',k:BANK,s:[3,6],sx:[0.85,1.2],tints:[[0.92,0.9,0.86],[0.86,0.84,0.8],[0.96,0.93,0.86]],sink:0.08,per:2,flow:true,env:{h:[-90,-6],sub:[0.5,1],flow:[0.35,1],nut:[0.4,1],young:[0,0.6]},field:0.009,clear:4.5},
  {id:'knoll',k:KNOLL,s:[1.2,2.6],sx:[0.85,1.2],tints:[[1,1,1],[0.95,0.92,0.85],[0.92,0.9,0.88]],sink:KSINK,per:2,env:{h:[-11,-2.5],sub:[0.55,1],expo:[0.45,1],young:[0,0.7]},field:0.012,clear:3,farMat:MATSHELL}
]) {
  const f = {id: e.id, geo: e.k.geo, lumps: e.k.lumps, top: e.k.top, foot: e.k.foot, mat: MAT, tints: e.tints, s: e.s, sink: e.sink, sx: e.sx, per: e.per, flow: !!e.flow, env: e.env, field: e.field, clear: e.clear, big: true, farMat: e.farMat || null}; // farMat (v11.182): far.js draws it with that, else MATROCKB
  FLORA.push(f);
  FLORA_BY_ID[f.id] = f;
}
