// test/region.js — the region model (v11.94, GLOBE.md §9; src/region.js): the pieces against their numbers and the history against its pins.
// kei against Abramowitz & Stegun's table; the sea level's sawtooth; the track through ours and the giant; the pins' summits and the floor beside
// ours tuned to the records'; the same seed the same province to the bit; no NaN; every state a named one; the grid finite and the flood's fill
// never under the ground; and a table of the default province (the states, the land, what shows from ours, the basins) for the log. In --test.
'use strict';
const fs=require('fs'),path=require('path'),root=path.join(__dirname,'..');
const util=fs.readFileSync(path.join(root,'vendor/wb-core.global.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'src/util.js'),'utf8');
let world=fs.readFileSync(path.join(root,'src/world.js'),'utf8');const cut=world.indexOf('// ---------- the light');if(cut>0)world=world.slice(0,cut); // the geology and the fields (test/map.js's cut)
const region=fs.readFileSync(path.join(root,'src/region.js'),'utf8');
const THREE={Vector3:class{constructor(x,y,z){this.x=x;this.y=y;this.z=z;}},Matrix4:class{},Quaternion:class{}};
const G=new Function('THREE',util+'\n'+world+'\n'+region+'\nreturn {WIND_A,rgAt,rgLoc,rgRecord,recLoc,rdgBound,sample,HALF,WX0,WX1,WZ0,WZ1,WORLD70,CELL,FI,ISLANDS,REGION_K,REGION_PINS,RG_STATE,regionModel,regionGrid,regionBasins,regionSeen,rgKei,rgSea,rgTrack,OXY,chemoAt,chemoD,oxyAt,underChemo,chemoB:()=>CHEMO_B,apronAt,apronR,RG_BUILT,rgFloor,BASIN,islandH,recsAt,FILL_TOP,rgAng,rgLagD,rgRadial,rgPlat,rgPlatSd,rgPlatform,RG_PL:()=>RG_PL,RG_PL_K,shT,SHELTER};')(THREE);
let fails=0;const ok=(c,msg)=>{console.log((c?'  ok   ':'  FAIL ')+msg);if(!c)fails++;};
console.log('region: the pieces');
// kei(x) (A&S Table 9.12): 1 → −0.494991, 2 → −0.202400, 3 → −0.051123, 4 → +0.002198; the table is kei/kei(0), kei(0) = −π/4
for(const [x,v] of [[1,-0.494991],[2,-0.202400],[3,-0.051123],[4,0.002198]]){const k=G.rgKei(x)*-Math.PI/4;ok(Math.abs(k-v)<2e-4,`kei(${x}) ${k.toFixed(6)} against ${v}`);}
let lo=0,hi=-1e9;for(let t=0;t<1;t+=0.0005){const s=G.rgSea(t);lo=Math.min(lo,s);hi=Math.max(hi,s);}
ok(G.rgSea(0)===0&&lo>=-120.001&&lo<-119&&hi<=0,`the sea: 0 now, ${lo.toFixed(1)} at the lowstands of the last 1 Myr, never over 0`);
console.log('region: the default province');
const t0=Date.now(),R=G.regionModel(),ms=Date.now()-t0,K=R.K,M=R.M,home=M.find(m=>m.id==='home'),giant=M.find(m=>m.id==='giant');
const o={x:0,z:0};R.track(K.ageOurs,o);const dO=Math.hypot(o.x-home.x,o.z-home.z);R.track(R.tg,o);const dG=Math.hypot(o.x-giant.x,o.z-giant.z);
ok(dO<1&&dG<1,`the track passes through ours at ${K.ageOurs} Ma (${dO.toFixed(3)} m) and the giant at ${R.tg.toFixed(2)} Ma (${dG.toFixed(3)} m)`);
ok(Math.abs(R.tg-1.31)<0.03,`the giant's age from the speed: ${R.tg.toFixed(3)} Ma (1.06 cm/yr over 17.9 km from 3 Ma)`);
const P0=G.REGION_PINS;ok(Math.abs(home.zv-P0[0].sum)<2&&Math.abs(giant.zv-P0[1].sum)<2,`the pins' summits today: ours ${home.zv.toFixed(1)} (${P0[0].sum}), the giant ${giant.zv.toFixed(1)} (${P0[1].sum}), in ${R.iter} rounds`);
const ref=R.floorAt(R.ref.x,R.ref.z);ok(Math.abs(ref-K.floor)<2,`the floor beside ours ${ref.toFixed(1)} (${K.floor})`);
ok(home.state==='rim'&&giant.state==='high',`ours is ${G.RG_STATE[home.state]}, the giant ${G.RG_STATE[giant.state]}`);
ok(home.alive&&giant.reef&&!home.fed&&!giant.fed,'both pins carry a living reef and neither is fed');
const num=['x','z','age','V','H','R','Ts','zv','peak','E','rt','top','rtop','shore','land','fl'];let bad=0;
for(const m of M){for(const k of num)if(!Number.isFinite(m[k]))bad++;if(!G.RG_STATE[m.state])bad++;}
ok(bad===0,`${M.length} members: every number finite, every state a named one`);
const R2=G.regionModel(),same=JSON.stringify(R2.M.map(m=>[m.x,m.z,m.age,m.V,m.zv,m.rt,m.state]))===JSON.stringify(M.map(m=>[m.x,m.z,m.age,m.V,m.zv,m.rt,m.state]));
ok(same,'the same knobs, the same province to the bit');
const R3=G.regionModel({seed:K.seed+1});ok(R3.M.length!==M.length||R3.M[2].x!==M[2].x,'another seed, another province');
const VT=M.filter(m=>m.pin<0).flatMap(m=>m.vents||[m]),ages=VT.map(m=>m.age);ok( // v11.134: the births are the volcanoes' vents
Math.min(...ages)>=0&&Math.max(...ages)<=K.span+0.01,`births between now and ${K.span} Ma`);
const atA=VT.filter(m=>m.age<0.6),atB=VT.filter(m=>m.age>K.span-3);let dA=0,dB=0;R.track(0,o);for(const m of atA)dA+=Math.hypot(m.x-o.x,m.z-o.z)/atA.length;R.track(K.span,o);for(const m of atB)dB+=Math.hypot(m.x-o.x,m.z-o.z)/atB.length;
ok(atA.length>0&&atB.length>0&&dA<2*K.foot*1000&&dB<2*K.foot*1000,`the young births sit by the plume now (${(dA/1000).toFixed(0)} km) and the oldest by the head (${(dB/1000).toFixed(0)} km)`);
console.log('region: the grid and the basins');
const span=520e3,n=260,x0=-140e3,z0=-260e3,t1=Date.now(),H=G.regionGrid(R,x0,z0,span,n),t2=Date.now(),B=G.regionBasins(H,n,span/n),t3=Date.now();
let fin=true,under=0;for(let k=0;k<n*n;k++){if(!Number.isFinite(H[k]))fin=false;if(B.F[k]<H[k]-1e-3)under++;}
ok(fin,`${n}² heights, all finite`);ok(under===0,'the flood\'s fill is never under the ground');
let edge=true;for(let i=0;i<n;i++)for(const k of [i,(n-1)*n+i,i*n,i*n+n-1])if(B.F[k]!==H[k])edge=false;ok(edge,'the grid\'s edge is the open ocean: its fill is its ground');
const f9=new Float32Array(9),Hg=G.regionGrid(R,x0,z0,span,n,(x,z)=>G.sample(x,z,f9).h,[G.WX0,G.WX1,G.WZ0,G.WZ1]),ci=Math.floor((6000-x0)/(span/n)),cj=Math.floor(-z0/(span/n));
ok(Math.abs(Hg[cj*n+ci]-G.sample(6000+0.5*span/n-((6000-x0)%(span/n)),0.5*span/n-(-z0%(span/n)),f9).h)<1,'inside the game\'s world the grid is the game\'s own ground');
console.log('region: the game\'s own water (v11.96, DEEP §2, §9)');
// the basins of the game's own ground (v11.102: the model's members in it; v11.106: the world's, ±WHALF): those silled by region.js's rule
const t4=Date.now();G.chemoAt(0,0);const CB=G.chemoB(),silled=CB.B.filter(b=>b.silled),bXZ=b=>[CB.x0+(b.cx+0.5)*CB.G,CB.z0+(b.cz+0.5)*CB.G];
console.log(`  the world's ground at ${CB.G} m (${CB.nx}×${CB.nz}, ${Date.now()-t4} ms): ${CB.B.length} hollows and lagoons, ${silled.length} silled by region.js's rule: `+silled.map(b=>{const p=bXZ(b);return `${b.area.toFixed(0)} km² behind ${b.sill.toFixed(0)} at ${(p[0]/1000).toFixed(1)}, ${(p[1]/1000).toFixed(1)} km (nut ${b.nut.toFixed(2)}, food over oxygen ${b.D.toFixed(2)})`;}).join('; '));
// v11.108 (the person, 11 Nov 2026: "believability is the deciding factor"): a silled basin's still water goes anoxic only when the food raining
// onto its sill outweighs the oxygen its inflow brings (world.js chemoD, OXY.anox). The rule against Earth's basins on the game's profile, then
// the world: the moat round ours and the basin 28 km west are one silled water behind −999 (v11.106) — oxic; no basin in the world is anoxic
const E=[['Cariaco',-146,0.6,true],['Santa Barbara',-475,0.5,true],['Santa Monica',-740,0.5,false],['San Clemente',-1800,0.3,false]];
ok(E.every(([n,sl,nu,an])=>(G.chemoD(sl,nu)>=1)===an),'the rule on Earth\'s basins: '+E.map(([n,sl,nu])=>n+' '+G.chemoD(sl,nu).toFixed(2)).join(', ')+' (anoxic at 1: the first two are, the last two are not)');
const labAt=(x,z)=>{const i=Math.floor((x-CB.x0)/CB.G),j=Math.floor((z-CB.z0)/CB.G);return CB.lab[j*CB.nx+i];},mo=CB.B[labAt(6000,0)];
let west=false;if(mo)for(let k=0;k<CB.nx*CB.nz;k++)if(CB.lab[k]===mo.id&&CB.x0+(k%CB.nx+0.5)*CB.G<-30000){west=true;break;}
// v11.121: the province's shape moved the moat (to v11.120 the floor east of ours lay in 603 km² behind −999 joined to the basin west); what holds is that it is oxic
ok(!mo||!mo.anox&&mo.D<0.5,`the floor east of ours is ${mo?(mo.silled?'in a silled basin — ':'in a hollow — ')+mo.area.toFixed(0)+' km² behind '+mo.sill.toFixed(1)+(west?', the moat joined to the basin west':'')+' — and oxic: its food over its oxygen '+mo.D.toFixed(2)+' (nut '+mo.nut.toFixed(2)+')':'open to the ocean, oxic'}`);
ok(silled.every(b=>!b.anox)&&CB.ch.every(c=>c===null),`no basin in the world is anoxic (the nearest ${Math.max(...silled.map(b=>b.D)).toFixed(2)}): no chemocline anywhere`);
const spots=[[0,0,'ours'],[6000,0,'the floor east'],[-15400,9200,'the giant'],[-400,-11100,'the drowned atoll north'],[20000,20000,'a far corner'],[-27900,-5100,'the basin west']];
ok(spots.every(([x,z])=>G.chemoAt(x,z)===null),'no chemocline over '+spots.map(p=>p[2]).join(', '));
ok(!G.underChemo(6000,-1000,0),'the floor east of ours at -1000 is not under a chemocline');
// the profile: 1 in the light, the core's minimum, back to half at the floor; the core lower where the food rains
const ox=y=>G.oxyAt(3000,y,0),o50=ox(-50),o300=ox(-300),o650=ox(-650),o1100=ox(-1100);
ok(o50===1&&o300<1&&o650<o300&&o1100>o650,`the profile over the fed water 3 km east of ours (6 km out, the open basin's, the core is the mild 0.5 and the floor's): ${o50.toFixed(2)} at -50, ${o300.toFixed(2)} at -300, ${o650.toFixed(2)} at -650 (the core), ${o1100.toFixed(2)} at -1100`);
ok(o650>=G.OXY.min[0]-1e-9&&o650<=G.OXY.min[1]+1e-9&&Math.abs(o1100-G.OXY.deep)<1e-9,'the core within the table\'s minimum, the floor at its deep value — survivable everywhere (the person, 10 Nov 2026)');
const near=G.oxyAt(3000,-650,0),far=G.oxyAt(15000,-650,-15000);
ok(near<far,`the core lower under the island's fed water (${near.toFixed(2)} 3 km out) than in the open basin (${far.toFixed(2)})`);
// the reefs' carbonate cap (v11.107, DEEP §3; world.js CARB): an atoll's or a bank's slope below its terraces is spurs and chutes down to
// CARB.base — the crests hard and proud of the smoothed slope, the chutes mud and hollow; ours, the giant and the seamounts have none
{const reefs=G.ISLANDS.filter(R=>R.carb),f9c=new Float32Array(9);let n=0,crest=0,chute=0,deep=0;
  for(const R of reefs)for(let a=0;a<64;a++){const t=a/64*Math.PI*2;for(let d=R.rimR+1400;d<R.rimR+9000;d+=37){const x=R.x+Math.cos(t)*d,z=R.z+Math.sin(t)*d,s=G.sample(x,z,f9c);
    if(s.h>-500)continue;if(s.h<-800)break;n++;if(f9c[G.FI.sub]>=0.55&&f9c[G.FI.rel]>=0.6)crest++;if(f9c[G.FI.sub]<=0.3&&f9c[G.FI.rel]<0.5)chute++;}}
  for(let x=-1200;x<=1200;x+=400)for(let z=-1200;z<=1200;z+=400){const s=G.sample(x+(x<0?-5200:5200),z,f9c);if(s.h<-260&&f9c[G.FI.sub]>=0.55)deep++;}
  ok(reefs.length>=5&&reefs.every( // v11.134: 9 since the composites (30+ to v11.133)
R=>R.state==='atoll'||R.state==='bank'||R.state==='drowned')&&!G.ISLANDS[0].carb&&!G.ISLANDS[1].carb&&!G.ISLANDS.some(R=>R.carb&&R.bare!==undefined),`${reefs.length} reef records carry the cap (atolls, banks, drowned banks); ours, the giant and the seamounts none`);
  ok(n>2000&&crest>0.15*n&&chute>0.2*n,`their slopes at 500–800 m (${n} samples): ${(100*crest/n).toFixed(0)}% hard convex spur, ${(100*chute/n).toFixed(0)}% soft chute`);
  ok(deep===0,'ours\' own deep flanks 5 km out are mud, as before ('+deep+' hard samples)');}
// the floor's supply (v11.97, DEEP §2): the islands' aprons by their land, the open floor beyond them
const hR=G.ISLANDS[0],gi=G.ISLANDS[1],aFoot=G.apronR(hR,6000),aOurs=G.apronR(hR,8500),aGiant=G.apronR(gi,14000),aw=G.ISLANDS.find(r=>r.id==='m153');
ok(aFoot===1&&aOurs<0.4,`ours' apron: ${aFoot.toFixed(2)} at its foot (6 km), ${aOurs.toFixed(2)} at 8.5 km (a rim with almost no land sheds little)`);
ok(aGiant>0.7,`the giant's apron 14 km from its centre, past its foot: ${aGiant.toFixed(2)} (7 km of rainy land supply it)`);
ok(aw&&G.apronR(aw,aw.fade[1]+11000)>0&&G.apronR(aw,aw.fade[1]+11200)===0,'the awesome shield\'s run-out stops 11.1 km past its foot, as the giant\'s does: more land, a thicker apron, not a longer one');
{let deep=0,ap=0,none=0;for(let x=-G.HALF+250;x<G.HALF;x+=500)for(let z=-G.HALF+250;z<G.HALF;z+=500){if(G.sample(x,z).h>-700)continue;deep++;const a=G.apronAt(x,z);if(a>0.5)ap++;else if(a===0)none++;}
  ok(ap>deep/4&&none>0,`the square's floor under -700 (v11.134: a quarter or more; half to v11.133, its many cones): ${(100*ap/deep).toFixed(0)}% apron (the archipelago's debris), ${(100*none/deep).toFixed(0)}% open floor beyond every apron`);}
// the records (v11.102, GLOBE §8 step 5): every member whose ground reaches the world, the buried struck, ours and the giant unchanged inside their cores
const RB=G.RG_BUILT;ok(RB.recs.length>=10&&RB.recs.every(r=>Number.isFinite(r.reach)&&r.hi&&r.hi.length>0&&r.an),`${RB.recs.length} of the model's members are records (${RB.recs.map(r=>r.id+' '+r.state).join(', ')}), each with its bound and its angular tables`);
{const inB=(r,w)=>typeof w==='number'?Math.max(Math.abs(r.x),Math.abs(r.z))-r.reach<w:r.x+r.reach>w[0]&&r.x-r.reach<w[1]&&r.z+r.reach>w[2]&&r.z-r.reach<w[3],o=RB.recs.slice(0,RB.n0),w=RB.recs.slice(RB.n0,RB.n1),v=RB.recs.slice(RB.n1); // v11.106: the old square's first, as v11.102 built them, then the ±70.5 km world's; v11.115 then the province's
  const W7=G.WORLD70,b7=[W7.i0*G.CELL-G.HALF-2000,W7.i1*G.CELL-G.HALF+2000,W7.j0*G.CELL-G.HALF-2000,W7.j1*G.CELL-G.HALF+2000];
  ok(RB.n0>=2&&RB.n1>RB.n0&&o.every(r=>inB(r,G.HALF+2000))&&w.every(r=>inB(r,b7)&&!inB(r,G.HALF+2000)),`the first ${RB.n0} reach the old square (v11.102's, in its order), the ${w.length} after them v11.106's ±70.5 km alone: ${w.map(r=>r.id+' '+r.state).join(', ')}`);
  ok(v.length>=5&&v.every(r=>inB(r,[G.WX0-2000,G.WX1+2000,G.WZ0-2000,G.WZ1+2000])&&!inB(r,b7)),`the ${v.length} after them the province alone (x ${(G.WX0/1000).toFixed(1)}…${(G.WX1/1000).toFixed(1)}, z ${(G.WZ0/1000).toFixed(1)}…${(G.WZ1/1000).toFixed(1)} km): ${v.map(r=>r.id+' '+r.state).join(', ')}`);
}
ok(RB.struck.every(q=>RB.recs.some(r=>r.id===q.by)||q.by==='home'||q.by==='giant'||q.by==='platform'),`${RB.struck.length} struck as inside another's ground: `+RB.struck.map(q=>q.id+' in '+q.by).join(', '));
{let bad=0,n=0;for(const R of RB.recs){const rq=Math.max(R.reach,R.rdgR||0)*R.sc;for(let r=0;r<rq;r+=97)for(let k=0;k<12;k++){const a=k/12*Math.PI*2+r*0.01,x=R.x+Math.cos(a)*r,z=R.z+Math.sin(a)*r,I={};
    // v11.138: as sample() reads it — the record's own radius (recLoc), its table within its reach and its ridges' bound at the point (rdgBound);
    // past its reach it counts by its ridges alone (its own flank there was never sample()'s, v11.102), so there what a ridge raises is under their
    // bound (to v11.137 the table by the world distance over sc)
    const rl=G.recLoc(R,x-R.x,z-R.z),out=rl>R.reach;if(out&&!(R.rdg&&rl<=R.rdgR))continue;G.islandH(R,x,z,I);const rb=R.rdg?G.rdgBound(R):-1e9;
    if(out){const J={};G.islandH(Object.assign({},R,{rdg:undefined}),x,z,J);if(I.h<=J.h+0.5)continue;n++;if(I.h>rb)bad++;continue;}
    n++;const bi=Math.max(R.hi[Math.min(R.hi.length-1,Math.floor(rl/R.hiS))],rb);if(I.h>bi||I.hs>bi)bad++;}}
  ok(bad===0,`every record's ground stays under the bound sample() skips by (its table, its ridges'): ${bad} over, of ${n}`);}
// v11.114: where records meet, the fill (smax's knee) stops at FILL_TOP: above it the ground is the highest record's own, so no land stands where
// no record has land — to v11.113 coalesced banks' lagoons (−20) met at up to +90, hundreds of km² of plateau the model has not got
{let n=0,over=0,land=0,worst=-1e9,at='';const I={};for(let x=G.WX0+200;x<G.WX1;x+=400)for(let z=G.WZ0+200;z<G.WZ1;z+=400){const h=G.sample(x,z).h;if(h<=G.FILL_TOP)continue;n++;if(h>0)land++;
    let own=G.rgPlat(x,z,{});for(const i of G.recsAt(x,z)){const R=G.ISLANDS[i];if(Math.hypot(x-R.x,z-R.z)>R.reach*R.sc)continue;G.islandH(R,x,z,I);if(I.h>own)own=I.h;}
    if(h>own+0.01){over++;if(h-own>worst){worst=h-own;at=`(${(x/1000).toFixed(1)}, ${(z/1000).toFixed(1)}) km`;}}}
  ok(n>1000&&over===0,`above ${G.FILL_TOP} m the ground is the highest record's own or the platform's (v11.122): ${over} of ${n} places at 400 m over the world higher${over?' (the worst '+worst.toFixed(1)+' m at '+at+')':''}; ${(land*0.16).toFixed(0)} km² of land, every bit some record's or the platform's rim`);}
// v11.117 (analysis_flora_diversity §5.4; the person, 12 Nov 2026): the islands shelter each other — what stands at the surface upwind casts a
// wave shadow, what stands up into the current a wake (world.js SHELTER, shelterBuild); the pins take none (their fields were set by hand); the
// land is untouched (its rain and its sea cliffs read the record's own aspect, the shelter only the water's fields)
{const I=id=>G.ISLANDS.find(R=>R.id===id),sh=(id,k,a)=>{const R=I(id);return R&&R.sh?G.shT(R.sh,k,a):0;},WA=Math.atan2(-Math.sin(3.49),-Math.cos(3.49)),CA=5.44;
  ok(!G.ISLANDS[0].sh&&!G.ISLANDS[1].sh,'ours and the giant take no shelter (the pins: their fields are as v11.116\'s)');
  // v11.134: re-chosen among the composites (to v11.133 m133's windward face 0.4+, m146's fed face 0.3+, m131's open; v11.121 before that m138, m141, m148)
  const c154=sh('m154',1,CA),w91=sh('m91',0,WA),o117=sh('m117',1,CA),n=G.ISLANDS.filter(R=>R.sh&&[...R.sh].some(v=>v>0.3)).length;
  ok(c154>0.3&&w91>0.2&&o117<0.1,`the young shield 48 km west's fed face in a wake (m154, ${c154.toFixed(2)}), the bank m91's windward face in a wave shadow (${w91.toFixed(2)}), the atoll m117's fed face open (${o117.toFixed(2)}; v11.135: m88 to v11.134, 0.11 with the lobes); ${n} of ${G.ISLANDS.length} records sheltered over 0.3 somewhere`);
  const pts=[];for(let k=0;k<4000;k++){const R=G.ISLANDS[2+k%(G.ISLANDS.length-2)],a=k*2.399,r=(R.land?R.land.r*1.2:R.rimR!==undefined?R.rimR+800:1500)*R.sc*((k%7)/7+0.2);pts.push([R.x+Math.cos(a)*r,R.z+Math.sin(a)*r]);}
  const h1=pts.map(p=>G.sample(p[0],p[1]).h),keep=G.ISLANDS.map(R=>R.sh);for(const R of G.ISLANDS)R.sh=null;const h0=pts.map(p=>G.sample(p[0],p[1]).h);G.ISLANDS.forEach((R,i)=>{R.sh=keep[i];});
  ok(h1.every((h,i)=>h===h0[i]),'the ground with the shelter and without it the same to the bit at 4,000 places over every record (the water\'s fields alone take it)');}
// v11.121 (analysis_archipelago §1.2, §2.5, §6; the person, 12 Nov 2026): the edifice that holds its volume (7° above the sea it was born
// under, 12° below: rgShape2), the awesome shield held at its 2,533 m (K.tune), and a high island's living reef ring built as a barrier reef
{const aw=M.find(m=>m.id==='m153'),reefs=M.filter(m=>m.reef&&m.ring>800),out=reefs.filter(m=>m.ring>m.R+1);
  ok(aw&&aw.tuned&&Math.abs(aw.zv-2533)<3&&aw.state==='shield',`the awesome shield held at ${aw?aw.zv.toFixed(0):'-'} m (2,533), ${aw?(aw.V/1e9).toFixed(0):'-'} km³ to stand there on Earth's slopes (2,558 to v11.120 as a 12° cone)`);
  const dry=out.filter(m=>m.b0<=0||R.rlT(m.rl,0)-R.rlT(m.rl,m.age)>1); // born where the plateau's head stood above the sea (24–30 Ma): its shore is the plateau's, the platform's (analysis_archipelago §2.3, the next step); v11.126: or lifted after its birth by a centre growing under it
  ok(out.length===dry.length,`every reef ring of a member born under the sea within its own volcano's foot: ${out.length-dry.length} of ${reefs.length-dry.length} outside (56 of 95 to v11.120: the land a 7° cone drawn over a 12° one); ${dry.length} born on the dry plateau or lifted by a centre after its birth (v11.126), whose shore was the plateau's`);
  const B=G.ISLANDS.filter(R=>R.barrier),gi=G.ISLANDS.find(R=>R.id==='giant'),I={};let low=0,lag=0,n=0,fea=0;
  // v11.129: half-way out in the record's own frame (an oval's)
  for(const R of B)for(let k=0;k<48;k++){const a=k/48*Math.PI*2,rr=(R.land.r+R.barrier.r)/2,P=G.rgAt(R,rr,a,{}),x=P.x,z=P.z;G.islandH(R,x,z,I);n++;if(I.h>R.barrier.lag-6&&I.h<R.barrier.top-10)lag++;if(I.h>R.barrier.lag-170&&I.h<R.barrier.top+1)fea++;
    const Q=Object.assign({},R,{barrier:undefined}),J={};G.islandH(Q,x,z,J);if(I.h<J.h-1e-9)low++;}
  ok(B.length>=3&&gi&&gi.barrier&&lag>0.75*n&&low===0,`${B.length} high islands with a barrier reef (${B.map(R=>R.id+' '+R.barrier.r+' m at '+R.barrier.top).join(', ')}): the lagoon at its floor half-way out at ${lag} of ${n} places (v11.123: a patch reef or a blue hole at the rest — ${fea} of ${n} within them), the cap never lowers the island's ground (${low}); the giant's at ${gi&&gi.barrier?gi.barrier.top:'-'} m, sinking in the awesome shield's moat`);}
// v11.121: sample() a function of its point alone — to v11.120 a record past the loop's break kept the previous sample's mark and its influence
// was dropped or kept by whatever had been sampled before (found by test/maps.js on m147's new atoll: flow 0.334 against 0.332 at one texel)
{let diff=0,n=0;const key=p=>{const q=G.sample(p[0],p[1]);return [q.h,...q.f].join(',');};
  for(let k=0;k<400;k++){const R=G.ISLANDS[2+k%(G.ISLANDS.length-2)],a=k*2.399,r=(R.reach||3000)*0.7*((k%5)/5+0.1),p=[R.x+Math.cos(a)*r,R.z+Math.sin(a)*r];
    G.sample(R.x,R.z);const k1=key(p);G.sample(p[0]+150000,p[1]);const k2=key(p);G.sample(p[0]+40,p[1]-30);const k3=key(p);n++;if(k1!==k2||k2!==k3)diff++;}
  ok(diff===0,`sample() the same at a place whatever was sampled before it: ${diff} of ${n} places over the records differ`);}
// v11.122 (analysis_archipelago §2.3, §6 step 2; the person, 12 Nov 2026): the plateau's platform — the members' reef rule run on the plateau's
// own surface (region.js rgPlatform): where its reef lives today, a rim at its top, the lagoon behind, a wall outside; the members on it buried
{const P=G.RG_PL(),RB=G.RG_BUILT,bur=RB.struck.filter(q=>q.by==='platform'),t1=Date.now();G.rgPlatform(R);const ms2=Date.now()-t1;
  const lab=new Int32Array(P.sd.length).fill(-1),banks=[];for(let k=0;k<P.sd.length;k++){if(P.sd[k]<=0||lab[k]>=0)continue;let n=0;const st=[k];lab[k]=banks.length;while(st.length){const q=st.pop();n++;const i=q%P.nx,j=(q-i)/P.nx;for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const ii=i+di,jj=j+dj;if(ii<0||jj<0||ii>=P.nx||jj>=P.nz)continue;const w=jj*P.nx+ii;if(P.sd[w]>0&&lab[w]<0){lab[w]=banks.length;st.push(w);}}}banks.push(n*P.G*P.G/1e6);} // v11.126: the living banks, apart
  const big=banks.filter(a=>a>300).sort((a,b)=>b-a);
  ok(P&&P.area>5000&&P.area<25000&&big.length>=3&&P.drowned>5000&&P.bb[0]>100000,`the platform a chain (v11.126): ${big.length} banks over 300 km² (${big.map(a=>a.toFixed(0)).join(', ')}), ${P?P.area.toFixed(0):'-'} km² living and ${P?P.drowned.toFixed(0):'-'} drowned (Saya de Malha's 40,808, mostly drowned; one platform of 29,259 to v11.125), its box from x ${P?(P.bb[0]/1000).toFixed(0):'-'} km — none of it within ±70.5 km of ours; built in ${ms2} ms`);
  let lag=0,ln=0,lf=0,rim=0,rn=0,wall=0,wn=0;const o={};for(let k=0;k<P.sd.length;k++){const i=k%P.nx,j=Math.floor(k/P.nx),x=P.x0+i*P.G,z=P.z0+j*P.G;if(P.sd[k]>9000&&x>G.WX0&&x<G.WX1&&z>G.WZ0&&z<G.WZ1){ln++;const h=G.rgPlat(x,z,o);if(h<-25&&h>-80)lag++;if(h<0&&h>-245)lf++;}}
  const edge=[];for(let k=0;k<P.sd.length;k++){const x=P.x0+(k%P.nx)*P.G,z=P.z0+Math.floor(k/P.nx)*P.G;if(Math.abs(P.sd[k])<P.G&&x>G.WX0&&x<G.WX1&&z>G.WZ0&&z<G.WZ1)edge.push([x,z]);} // the margin's nodes; about each, places on the warped rim
  for(let q=0;q<40000&&rn<400;q++){const e=edge[q%edge.length],x=e[0]+3000*(((q*0.618034)%1)-0.5)*2,z=e[1]+3000*(((q*0.414214)%1)-0.5)*2;G.rgPlat(x,z,o);if(Math.abs(o.sd)<120&&o.rimA>0.62){rn++;const h=G.rgPlat(x,z,o);if(h>-20)rim++;
      const ox=x+o.nx*1500,oz=z+o.nz*1500;wn++;const dro=G.rgPlatSd(ox,oz,true)>0&&G.rgPlatSd(ox,oz)<0;if(G.sample(ox,oz).h<h-(dro?30:500))wall++;}}
  ok(ln>100&&lag>0.75*ln&&lf===ln&&rn>5&&rim>0.75*rn&&wall>0.8*wn,`its lagoon 9 km in between −25 and −80 at ${lag} of ${ln} nodes (v11.123: patch reefs and blue holes the rest — ${lf} of ${ln} between −245 and the sea); its rim within 20 m of the sea at ${rim} of ${rn} places on its crest between the passes; the ground 1.5 km outside 500 m lower, or 30 m onto the drowned carbonate (v11.126), at ${wall} of ${wn} (the wall)`);
  const landB=bur.filter(q=>{const m=M.find(mm=>mm.id===q.id);return m&&m.zv>0;});
  ok(bur.length>=1&&landB.length===0,`${bur.length} members buried in it (v11.134: 2, the composites; 30+ to v11.133) (their reefs its own now), none with land`);}
// v11.123 (analysis_archipelago §1.4, §3.1, §3.4–3.6; the person, 12 Nov 2026: "go ahead with step 3"): one margin per reef, the lagoon by its size,
// its patch reefs and blue holes, the reef's walls and its one bench
{const L=G.ISLANDS.filter(R=>R.id!=='home'&&(R.rimR!==undefined||R.barrier)),ring=R=>R.rimR!==undefined?R.rimR:R.barrier.r,top=R=>R.rimR!==undefined?R.rimH:R.barrier.top;
  // v11.126: the living rims (a drowned member's, on the drowned carbonate, lies under its flat)
  let arcs=0,sunk=0;const I={};for(const R of L){if(!R.rimM||top(R)<-20)continue;for(let k=0;k<96;k++){const a=k/96*Math.PI*2,x=R.x+Math.cos(a)*ring(R),z=R.z+Math.sin(a)*ring(R);G.islandH(R,x,z,I);
    if(G.rgAng(R.rimM,a)<0.05){arcs++;if(G.sample(x,z).h<top(R)-8)sunk++;}}}
  const faros=L.filter(A=>L.some(B=>B!==A&&ring(A)<=2500&&Math.hypot(A.x-B.x,A.z-B.z)+ring(A)<ring(B)-1.6*(B.rimR!==undefined?B.rimW:B.barrier.w)));
  ok(sunk>=0.8*arcs,`one margin per reef (v11.134: the composites' living rims stand apart, so ${arcs} places on lost arcs; 50+ to v11.133): ${L.filter(R=>R.rimM).length} of ${L.length} rims lose an arc to another's lagoon or the platform's; at ${sunk} of ${arcs} places on those arcs the ground is under the crest (the lagoon's floor or the other's; a patch reef the rest); ${faros.length} faros kept (${faros.map(R=>R.id).join(', ')})`);
  const dep=[[800,18],[4000,31],[9000,40],[21000,50]].map(([r,d])=>Math.abs(G.rgLagD(r)-d)<1.5);
  ok(dep.every(Boolean)&&G.rgLagD(60000)===60,`the lagoon by its ring (rgLagD): ${[800,4000,9000,21000,60000].map(r=>(r/1000)+' km '+G.rgLagD(r).toFixed(0)+' m').join(', ')} — the widest the deepest (to v11.122 a bank flat at 20)`);
  const P=G.RG_PL();let kn=0,ho=0,nn=0;for(let q=0;q<80000;q++){const x=P.bb[0]+(P.bb[1]-P.bb[0])*((q*0.618034)%1),z=P.bb[2]+(P.bb[3]-P.bb[2])*((q*0.414214)%1),o={};if(x<G.WX0||x>G.WX1||z<G.WZ0||z>G.WZ1)continue;const h=G.rgPlat(x,z,o);if(o.sd>9000){nn++;if(h>o.hs+10)kn++;if(h<o.hs-40)ho++;}}
  ok(nn>1000&&kn>0.03*nn&&kn<0.3*nn&&ho>0,`the platform's lagoon: patch reefs over ${(100*kn/nn).toFixed(0)}% of it, blue holes at ${ho} of ${nn} places`);
  const at=L.filter(R=>R.rimR!==undefined&&R.state==='atoll'&&!R.rimM).slice(0,8);let st=0,bn=0,sl=0;
  for(const R of at){const r=R.rimR;const h1=G.rgRadial(R,r+190),h2=G.rgRadial(R,r+310),h3=G.rgRadial(R,r+350),h4=G.rgRadial(R,r+390);if((h1-h2)/120>0.6)st++;if(Math.abs(h3-(R.rimH-122))<8&&Math.abs(h4-h3)<6)bn++;const fr=R.flank.r,hA=G.rgRadial(R,fr+200),hB=G.rgRadial(R,fr+700);if((hA-hB)/500>0.55)sl++; /* v11.141: the talus past the reef's apron (rgApron), at its flank's start */}
  ok(at.length>=3&&st===at.length&&bn===at.length&&sl===at.length,`the reef's walls: on ${at.length} atolls a wall of 31°+ from −32 to −122, the bench at the reef's top −122 (the last Myr's lowstands), the talus past 29°: ${st}, ${bn}, ${sl}`);}
// v11.126 (analysis_archipelago §8; the person, 13 Nov 2026: "a chain of banks", "drowned saddles"): the old end's relief — a lower head with volcanic
// centres where the head arrived and at the pulses — and its necks, swept by the currents and the tides that cross the ridge, drowned under the big swings
{const P=G.RG_PL(),Rl=K.relief;let z70=0,n70=0;for(let q=0;q<2000;q++){const x=(((q*0.618034)%1)-0.5)*2*70520,zz=(((q*0.414214)%1)-0.5)*2*70520;n70++;if(R.rlAt(x,zz).every(v=>v===0))z70++;}
  ok(R.cen.length>=4&&z70===n70,`the old end's relief: ${R.cen.length} centres (${R.cen.map(c=>c.t.toFixed(1)+' Ma '+Math.round(c.H)+' m').join(', ')}); none of it within ±70.5 km of ours (nothing at ${z70} of ${n70} places)`);
  const d=[];for(let k=0;k<P.sd.length;k++)if(P.sd2&&P.sd2[k]>0&&P.sd[k]<=0)d.push(P.top2[k]);d.sort((a,b)=>a-b);const med=d.length?d[d.length>>1]:0,q=p=>d.length?d[Math.floor(p*(d.length-1))].toFixed(0):'-';
  ok(d.length>100&&med<-55&&med>-150,`the drowned carbonate: ${(P.drowned||0).toFixed(0)} km², its top today ${q(0.1)} … ${med.toFixed(0)} (median) … ${q(0.9)} m — past the light's end, as Saya de Malha's interior (70–150 m); the early necks the deepest`);
  const R1=Object.assign({},R,{K:Object.assign({},K,{relief:Object.assign({},Rl,{swept:1})})}),P1=G.rgPlatform(R1);
  ok(P1&&(P1.drowned||0)<0.05*P.drowned,`the drowning is the necks': unswept (relief.swept 1) ${P1?(P1.drowned||0).toFixed(0):'-'} km² drowns (${(P.drowned||0).toFixed(0)} swept), ${P1?P1.area.toFixed(0):'-'} lives`);
  const swl=M.filter(m=>m.sw&&m.alive&&m.rt>-K.photic);let hi=-1e9;for(let x=125000;x<G.WX1;x+=2000)for(let z=G.WZ0;z<G.WZ1;z+=2000)hi=Math.max(hi,G.sample(x,z).h);
  ok(swl.length===0&&hi<10,`the members on a neck swept and drowned with it (${M.filter(m=>m.sw).length}, none living${swl.length?': '+swl.map(m=>m.id).join(', '):''}); the east's highest ground ${hi.toFixed(1)} m (the rims' islets)`);}
// v11.127 (analysis_archipelago §8.5 step 2; the person, 13 Nov 2026: "follow Earth's pattern for this size"): the banks' margins by their side —
// the windward crest at the sea with the islets, the lee one under it by the bank's shallows upwind, the windward wall the atolls', the lee a gentler
// slope — and each bank's lagoon by its size
{const P=G.RG_PL(),wa=G.WIND_A,o={},S=P.sd,rows={w:[],l:[]};
  for(let j=0;j<P.nz-1;j++)for(let i=0;i<P.nx-1;i++){const k=j*P.nx+i,a=S[k],b=S[k+1];if((a>0)===(b>0))continue;const x=P.x0+(i+a/(a-b))*P.G,z=P.z0+j*P.G;if(x<G.WX0+2000||x>G.WX1-6000||z<G.WZ0+2000||z>G.WZ1-6000)continue;
    G.rgPlat(x,z,o);const nx=o.nx,nz=o.nz,e=-(nx*Math.cos(wa)+nz*Math.sin(wa));if(Math.abs(e)<0.4)continue;let bs=null,prev=null;for(let s=-2500;s<=2500;s+=20){G.rgPlat(x+nx*s,z+nz*s,o);if(prev!==null&&(prev>0)!==(o.sd>0)&&(bs===null||Math.abs(s)<Math.abs(bs)))bs=s;prev=o.sd;}if(bs===null)continue;let best=-1e9;for(let s=bs-60;s<=bs+60;s+=10)best=Math.max(best,G.sample(x+nx*s,z+nz*s).h); // the crest where the warped margin is (the nearest crossing of its sd along the normal)
    const ox=x+nx*(bs+1500),oz=z+nz*(bs+1500),dro=G.rgPlatSd(ox,oz,true)>0,fe=P.fe[Math.floor((z-P.z0)/P.G)*P.nx+Math.floor((x-P.x0)/P.G)];(e>0?rows.w:rows.l).push({c:best,drop:dro?null:best-G.sample(ox,oz).h,fe});}
  const med=A=>{const v=A.filter(q=>q!==null).sort((p,q)=>p-q);return v.length?v[v.length>>1]:NaN;},W=rows.w,L=rows.l,iw=W.filter(r=>r.c>0.5).length,il=L.filter(r=>r.c>0.5).length,far=L.filter(r=>r.fe>40000),near=L.filter(r=>r.fe<15000);
  ok(W.length>30&&L.length>30&&med(W.map(r=>r.c))>-2&&iw>0.5*W.length&&il<0.2*L.length&&med(far.map(r=>r.c))<med(near.map(r=>r.c))-5,`the crest by its side: windward at ${med(W.map(r=>r.c)).toFixed(1)} m (median of ${W.length}), islets at ${iw}; lee at ${med(L.map(r=>r.c)).toFixed(1)} (${L.length}), islets at ${il} — behind 40+ km of bank ${med(far.map(r=>r.c)).toFixed(1)} (${far.length}), under 15 km ${med(near.map(r=>r.c)).toFixed(1)} (${near.length}): Saya de Malha's west 50–55 m behind 230 km, its windward east 30–35`);
  const dw=med(W.map(r=>r.drop)),dl=med(L.map(r=>r.drop));
  ok(dl<0.75*dw,`the wall by its side: 1.5 km out onto the plateau the windward ground ${dw.toFixed(0)} m under the crest (the atolls' wall and talus), the lee ${dl.toFixed(0)} (its slope of shed sand)`);
  const L2=new Map();for(let k=0;k<S.length;k++)if(S[k]>0)L2.set(P.lg[k],(L2.get(P.lg[k])||0)+1);const by=[...L2].map(([d,n])=>({d,A:n*P.G*P.G/1e6})).sort((p,q)=>q.A-p.A),law=by.every(b=>Math.abs(b.d-G.rgLagD(Math.sqrt(b.A*1e6/Math.PI)))<0.5);
  ok(by.length>=3&&law&&by[0].d>by[by.length-1].d,`each bank's lagoon by its size (rgLagD of the disc of its area): ${by.slice(0,5).map(b=>b.A.toFixed(0)+' km² '+b.d.toFixed(0)+' m').join(', ')}${by.length>5?' …':''} (50 for all to v11.126)`);}
// v11.128 (analysis_archipelago §3.3; the person, 13 Nov 2026: "the atolls' rims by the wind"): the living atolls' and barriers' rims by their side —
// windward a broad flat at the reef's top with the islets, leeward under the sea and cut by passes (to v11.127 by the angular noise alone, the same all round)
{const wa=G.WIND_A,o={},S={w:{n:0,i:0,c:[]},l:{n:0,i:0,c:[]}};let nr=0;
  for(const R of G.ISLANDS){const ring=R.rimR!==undefined&&R.patch?R.rimR:R.barrier?R.barrier.r:0,tp=R.rimR!==undefined&&R.patch?R.rimH:R.barrier?R.barrier.top:-1e9;if(!ring||tp<-5||R.x<G.WX0||R.x>G.WX1||R.z<G.WZ0||R.z>G.WZ1)continue;nr++;
    for(let k=0;k<48;k++){const a=k/48*Math.PI*2,e=-(Math.cos(a)*Math.cos(wa)+Math.sin(a)*Math.sin(wa));if(Math.abs(e)<0.4)continue;let best=-1e9;
      for(let r=ring*0.8-300;r<=ring*1.2+300;r+=20){const x=R.x+Math.cos(a)*r,z=R.z+Math.sin(a)*r;G.islandH(R,x,z,o);if(o.rimK>0.5)best=Math.max(best,G.sample(x,z).h);}
      if(best>-1e9){const q=e>0?S.w:S.l;q.n++;q.c.push(best);if(best>0.5)q.i++;}}}
  const med=A=>{const v=A.slice().sort((p,q)=>p-q);return v.length?v[v.length>>1]:NaN;},iw=S.w.i/Math.max(1,S.w.n),il=S.l.i/Math.max(1,S.l.n);
  ok(nr>=8&&iw>0.4&&il<0.15&&med(S.w.c)>-1&&med(S.l.c)<med(S.w.c)-5,`the rims by their side on ${nr} living atolls and barriers: windward the crest at ${med(S.w.c).toFixed(1)} m (median), islets on ${(100*iw).toFixed(0)}% of rays; leeward ${med(S.l.c).toFixed(1)}, islets on ${(100*il).toFixed(0)}% (about a third each side to v11.127)`);}
// v11.129 (analysis_archipelago §3.3; the person, 13 Nov 2026: "let's do 1"): the volcanoes born on an old fracture zone as ovals along it — area kept, the
// rim where the record's own frame puts it, the pins and the tuned shield round
{const ov=G.ISLANDS.filter(R=>R.asq),fa=K.fracA,o={},home=G.ISLANDS.find(R=>R.id==='home'),gi=G.ISLANDS.find(R=>R.id==='giant'),aw=G.ISLANDS.find(R=>R.id==='m153');
  // v11.134: a composite is long along its own vents' spread (rot, asp from the model, the awesome shield too); a single volcano on a zone as v11.129's
  const comp=ov.filter(R=>{const m=M.find(q=>q.id===R.id);return m&&m.asp>1.05;}),axis=ov.every(R=>{const m=M.find(q=>q.id===R.id);const s0=R.sc/(R.lmax||1); /* v11.135: sc carries the farthest lobe */if(m&&m.asp>1.05)return Math.abs(R.rot-m.rot)<1e-9&&Math.abs(R.asq-m.asp)<1e-9&&Math.abs(s0*s0-R.asq)<1e-9&&m.nv>1;
    let d=Math.abs(((R.rot-fa)%Math.PI+Math.PI*1.5)%Math.PI-Math.PI/2);return d<=0.2+1e-9&&R.asq>=1.3&&R.asq<=2.4&&Math.abs(s0*s0-R.asq)<1e-9;});
  let land=0,landR=0;const isl=ov.filter(R=>R.land).slice(0,3);for(const R of isl){const L=R.land.r*R.sc,st=40;let n=0;for(let x=R.x-L-200;x<=R.x+L+200;x+=st)for(let z=R.z-L-200;z<=R.z+L+200;z+=st){G.islandH(R,x,z,o);if(o.h>0)n++;}land+=n*st*st;
    const Q=Object.assign({},R,{rot:0,sc:1,asq:undefined,lobe:undefined}); /* v11.135: the round one unlobed too */let m=0;for(let x=R.x-R.land.r-200;x<=R.x+R.land.r+200;x+=st)for(let z=R.z-R.land.r-200;z<=R.z+R.land.r+200;z+=st){G.islandH(Q,x,z,o);if(o.h>0)m++;}landR+=m*st*st;}
  let rim=0,rn=0;for(const R of ov.filter(R=>R.rimR!==undefined&&R.rimH>-5).slice(0,10))for(let k=0;k<24;k++){rn++;for(let r=0.75*R.rimR;r<=1.25*R.rimR;r+=10){const P=G.rgAt(R,r,k/24*Math.PI*2,{});G.islandH(R,P.x,P.z,o);if(o.rimK>0.5){rim++;break;}}} // the crest on every ray of the record's own frame, within its ±16% warp
  ok(ov.length>=5&&comp.length>=5&&axis&&!home.asq&&!gi.asq&&aw&&aw.asq&&Math.abs(land/landR-1)<0.06&&rn>0&&rim>0.8*rn,`${ov.length} records oval, ${comp.length} of them composites along their vents (the awesome shield ${aw&&aw.asq?aw.asq.toFixed(2):'round'}), the rest along the fracture zones (aspect 1.3–2.4, the axis within 0.2 rad of ${fa}); ours and the giant round; an oval island's land ${(land/1e6).toFixed(1)} km² against ${(landR/1e6).toFixed(1)} round (${isl.map(R=>R.id).join(', ')}); the rim on ${rim} of ${rn} rays of their own frames on 10 living atolls (within the ±16% warp)`);}
// v11.130 (analysis_archipelago §2.6, §5 #11; the person, 13 Nov 2026: "do 3a"): the fed rule by its time — a member is fed while nothing upstream of it
// stands in the light (to v11.129 once for all time, by what could ever stand above −300 m by today's floor: a shelter born after it sank still counted)
{const lit=m=>Math.max(m.zv,m.reef?m.rt:-1e9)>-K.photic,mis=M.filter(m=>m.pin<0&&m.up.length&&m.fed!==!m.up.some(i=>lit(M[i]))),fed=M.filter(m=>m.fed);
  ok(M.every(m=>m.pin<0||!m.fed)&&mis.length<=2,`fed today (v11.134: none among the composites, each with a member upstream in the light; 26 to v11.133): ${fed.length} members (${Object.entries(fed.reduce((o,m)=>(o[m.state]=(o[m.state]||0)+1,o),{})).map(([k,v])=>v+' '+k).join(', ')}), each with nothing upstream in the light now — ${mis.length} otherwise (the step's lag); the pins never`);}
// v11.131 (analysis_archipelago §2.7, §5 #8; the person, 13 Nov 2026: "do 2"): a member born on an older one's finished shield stands on its surface
// and rides it down — a satellite cone, or on an island the rejuvenated stage — and never buries its host
// v11.134: the composites take seed 32's late vents into their volcanoes (m151 is a vent of the awesome shield's now), so none is a satellite here: the
// rule is tested on the province drawn without composites (K.comp null, v11.133's), and on the records if any
{const R0=G.regionModel({comp:null}),M0=R0.M,sat0=M0.filter(m=>m.host>=0),hosts0=sat0.length>=10&&sat0.every(m=>{const q=M0[m.host];return q.age-m.age>=q.Ts-1e-9&&q.V>m.V&&Math.hypot(q.x-m.x,q.z-m.z)<q.R-0.5*m.R&&m.off>=0;})&&M0.every(m=>m.pin<0||m.host<0);
  ok(hosts0&&M0.length===159,`without composites (v11.133's ${M0.length} cones) ${sat0.length} satellites, each host older, bigger, finished and under it; with them (seed 32) ${M.filter(m=>m.host>=0).length}`);}
{const sat=M.filter(m=>m.host>=0),RB=G.RG_BUILT,land=G.ISLANDS.filter(R=>R.sat&&R.land&&R.land.b>0);
  const hosts=sat.every(m=>{const q=M[m.host];return q.age-m.age>=q.Ts-1e-9&&q.V>m.V&&Math.hypot(q.x-m.x,q.z-m.z)<q.R-0.5*m.R;})&&M.every(m=>m.pin<0||m.host<0);
  const recs=G.ISLANDS.every(R=>{const m=M.find(m=>m.id===R.id);return !R.sat===!(m&&m.off>0)&&(!R.sat||R.sat.b===Math.round(m.lastB)&&R.sat.host===M[m.host].id);});
  const own=RB.struck.every(q=>{const B=G.ISLANDS.find(R=>R.id===q.by);return !(B&&B.sat&&B.sat.host===q.id);});
  let on=0,nr=0,top=true;for(const R of land){if(G.sample(R.x,R.z).h<R.land.b+0.5*(R.land.h-R.land.b))top=false;
    for(let k=0;k<24;k++){const P=G.rgAt(R,1.3*R.land.r,k/24*Math.PI*2,{});nr++;if(G.sample(P.x,P.z).h>0)on++;}}
  ok(hosts&&recs&&own&&(land.length===0||top&&on>=0.9*nr&&land.every(R=>R.h0===R.land.b&&R.terr.n===0)),`${sat.length} members born on an older one's finished shield, each on its surface (${G.ISLANDS.filter(R=>R.sat).length} records); on land ${land.map(R=>`${R.id} ${R.land.h} m on ${R.sat.host} at ${R.land.b}`).join(', ')}, its host's land all round (${on}/${nr} rays at 1.3× its shore); no host buried by its own satellite`);}
// v11.132 (the person, 13 Nov 2026: "make the noise seed follow the member's id"): a record's noise seed and its rifts are its member's own, so a
// change to one member reshapes no other record
{const recs=G.ISLANDS.filter(R=>R.id!=='home'&&R.id!=='giant'),rf=recs.filter(R=>R.rifts);
  const seeds=recs.every(R=>R.ns===1000+37*Number(R.id.slice(1))),rifts=rf.every(R=>{const Q=G.rgRecord(M.find(m=>m.id===R.id),K);return Q.rifts&&Q.rifts[0]===R.rifts[0]&&Q.rifts[1]===R.rifts[1];});
  ok(seeds&&rf.length>0&&rifts&&new Set(G.ISLANDS.map(R=>R.ns)).size===G.ISLANDS.length,`${recs.length} records seeded by their member's id (ns 1000 + 37·n, none shared), the ${rf.length} with rifts drawing them alone`);}
// v11.135 (analysis_archipelago §9.6; the person, 13 Nov 2026: "The lobed is a solid idea"): every volcano's outline lobed by its vents and its rift
// zones, the area kept, whole to its land or rim and softer on the deep flank; its sc the farthest lobe's, so the bounds read by sc stay bounds
{const L=G.ISLANDS.filter(R=>R.lobe),P=G.ISLANDS.filter(R=>R.id==='home'||R.id==='giant'),N=L.length?L[0].lobe.length-1:0;
  const area=L.every(R=>{let q=0;for(let k=0;k<N;k++)q+=R.lobe[k]*R.lobe[k];return Math.abs(q/N-1)<1e-4&&R.lobe[N]===R.lobe[0]&&R.lmax>=1-1e-9;});
  let trip=0,tn=0,bad=0,bn=0;const o={};for(const R of L){for(let k=0;k<24;k++){const a=k/24*Math.PI*2,r=(0.3+0.4*(k%5))*R.lbR;G.rgAt(R,r,a,o);tn++;if(Math.abs(G.rgLoc(R,o.x,o.z)-r)<1e-6*r+1e-6)trip++;}
    for(let k=0;k<200;k++){const a=k*2.399,d=(k%20+0.5)*R.lbR*0.25,x=R.x+Math.cos(a)*d,z=R.z+Math.sin(a)*d;bn++;if(G.rgLoc(R,x,z)<d/R.sc-1e-6)bad++;}}
  const span=L.map(R=>R.lobe.slice(0,N)).map(T=>Math.max(...T)/Math.min(...T));
  ok(L.length===G.ISLANDS.length-P.length&&P.every(R=>!R.lobe)&&area&&trip===tn&&bad===0,`${L.length} records lobed (ours and the giant not), each table's mean square 1 (the area kept); farthest over nearest ${Math.min(...span).toFixed(2)}–${Math.max(...span).toFixed(2)}; rgAt and rgLoc each other's inverse at ${trip} of ${tn} places; the own radius never under the world distance over sc (sample()'s bound) at ${bn-bad} of ${bn}`);}
// v11.138 (analysis_archipelago §11 A, E; the person, 13 Nov 2026: "I would love to start on 1 right now"): the flanks sculpted — every record but the
// pins carries submarine ridges along its rift arms and canyons on its flank; the ground never stands over the bound table sample() trusts
{const L=G.ISLANDS.filter(R=>R.rdg),P=G.ISLANDS.filter(R=>R.id==='home'||R.id==='giant'),I={};let n=0,over=0,worst=0,at='',up=0,un=0;
  for(const R of L){for(let k=0;k<1500;k++){const a=k*2.39996,d=(0.15+0.85*((k*0.618034)%1))*R.reach*R.sc,x=R.x+Math.cos(a)*d,z=R.z+Math.sin(a)*d,rl=G.recLoc(R,x-R.x,z-R.z);if(rl>R.reach)continue;
      G.islandH(R,x,z,I);n++;const b=Math.max(R.hi[Math.min(R.hi.length-1,Math.floor(rl/R.hiS))],G.rdgBound(R));if(I.h>b+1e-6){over++;if(I.h-b>worst){worst=I.h-b;at=R.id;}}}
    // a ridge's crest stands over the flank a few km out along its arm (the record's own ground with and without its ridges)
    const G0=R.rdg,c=G0.c[0],sn=G0.n[0],dd=G0.r0+0.35*G0.L,lxw=c*dd,lzw=sn*dd,w={};
    G.rgAt(R,dd,Math.atan2(sn,c),w);G.islandH(R,w.x,w.z,I);const hr=I.h;const Q=Object.assign({},R,{rdg:undefined,cny:undefined});G.islandH(Q,w.x,w.z,I);un++;if(hr>I.h+50)up++;}
  ok(L.length===G.ISLANDS.length-P.length&&P.every(R=>!R.rdg&&!R.cny)&&L.every(R=>R.cny&&R.cny.n>=12)&&over===0&&up>=0.8*un,`${L.length} records with submarine ridges along their rift arms and canyons on their flanks (ours and the giant none); a ridge stands 50 m or more over its own flank a third of the way out at ${up} of ${un}; the ground over sample()'s bound (the table and rdgBound at the point) at ${over} of ${n} places${over?' (worst '+worst.toFixed(1)+' m, '+at+')':''}`);}
// v11.119 (analysis_flora_diversity §5.6, SEAFLOOR §6): the lineages — hops down the colonisation chain from the founder, cut into the old
// east, the middle and the young west (region.js RANGE, rangeBuild): a brooding line's sister species keep to theirs
{const I=id=>G.ISLANDS.find(R=>R.id===id),n=[0,1,2].map(r=>G.ISLANDS.filter(R=>R.rng===r).length),w70=G.ISLANDS.filter(R=>Math.max(Math.abs(R.x),Math.abs(R.z))<70520),w50=G.ISLANDS.filter(R=>Math.hypot(R.x,R.z)<50000);
  // v11.122: the founder m2 and most of the old east lie buried in the platform (chunks.js chRange gives the platform the old east's range)
  const f2=M.filter(m=>m.lit!==null&&m.src<0).sort((a,b)=>b.lit-a.lit)[0]; // the founder: the first lit (m2 to v11.133; a vent of m4's volcano since v11.134)
  ok(f2&&G.rgPlatSd(f2.x,f2.z,true)>0&&I('home').hops===9&&I('home').rng===2&&n[0]>=1&&n[1]>=3&&n[2]>=3&&w50.every(R=>R.rng===2),`the chain's stretches: ${n[0]} records in the old east (and the platform), ${n[1]} in the middle, ${n[2]} in the young west; the founder ${f2&&f2.id} on the platform's carbonate, ours ${I('home').hops} hops; every record within 50 km of ours the west's (${w50.length}: the brooders' forms there as they were), within ±70.5 km all but ${w70.filter(R=>R.rng!==2).map(R=>R.id+' '+(R.x/1000).toFixed(0)+' km east').join(', ')}`);}
ok(Math.abs(G.rgFloor(6000,0)-G.BASIN.h)<0.5,`the model's floor read by the game beside ours: ${G.rgFloor(6000,0).toFixed(1)} (${G.BASIN.h})`);
// the log: what the default province is
const cnt={};let land=0;for(const m of M){cnt[m.state]=(cnt[m.state]||0)+1;land+=m.land;}
console.log(`\n  ${M.length} members in ${ms} ms (seed ${K.seed}; the grid ${t2-t1} ms, the flood ${t3-t2} ms):`);
for(const s in G.RG_STATE)if(cnt[s])console.log(`    ${String(cnt[s]).padStart(3)}  ${G.RG_STATE[s]}`);
console.log(`  land ${land.toFixed(0)} km² (discs); above the sea:`);
for(const m of M.filter(m=>m.zv>0).sort((a,b)=>b.zv-a.zv))console.log(`    ${m.id.padEnd(6)} ${G.RG_STATE[m.state].padEnd(18)} ${String(Math.round(m.zv)).padStart(5)} m  ${m.age.toFixed(2).padStart(5)} Ma  ${String(Math.round(m.V/1e9)).padStart(5)} km³  ${String(Math.round(m.land)).padStart(5)} km²  at ${(m.x/1000).toFixed(1)}, ${(m.z/1000).toFixed(1)} km${m.inSq&&m.pin<0?'  (in the game\'s world)':''}`);
const seen=G.regionSeen(R,0,0);console.log(`  from ours: ${seen.map(s=>`${s.m.id} ${(s.d/1000).toFixed(0)} km${s.haze?'':s.clear?' (clear days)':' (never)'}`).join(', ')}`);
const k0=cj*n+ci;console.log(`  the water beside ours on the model's grid (the game's ground inside its world): floor ${Hg[k0].toFixed(0)}, its way out tops at ${regionFill(Hg,n,span,k0).toFixed(0)}`);
function regionFill(Hh,nn,sp,k){return G.regionBasins(Hh,nn,sp/nn).F[k];}
for(const b of B.B.filter(b=>b.silled).sort((a,b)=>b.area-a.area).slice(0,4))console.log(`  a silled basin: ${b.area.toFixed(0)} km², sill ${b.sill.toFixed(0)}, floor ${b.floor.toFixed(0)}, its line if anoxic ${b.chemo.toFixed(0)}`);
console.log(fails?`\nregion: ${fails} FAILED`:'\nregion: all passed');process.exit(fails?1:0);
