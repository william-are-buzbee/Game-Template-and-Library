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
const G=new Function('THREE',util+'\n'+world+'\n'+region+'\nreturn {sample,HALF,WX0,WX1,WZ0,WZ1,WORLD70,CELL,FI,ISLANDS,REGION_K,REGION_PINS,RG_STATE,regionModel,regionGrid,regionBasins,regionSeen,rgKei,rgSea,rgTrack,OXY,chemoAt,chemoD,oxyAt,underChemo,chemoB:()=>CHEMO_B,apronAt,apronR,RG_BUILT,rgFloor,BASIN,islandH,recsAt,FILL_TOP,shT,SHELTER};')(THREE);
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
const ages=M.filter(m=>m.pin<0).map(m=>m.age);ok(Math.min(...ages)>=0&&Math.max(...ages)<=K.span+0.01,`births between now and ${K.span} Ma`);
const atA=M.filter(m=>m.pin<0&&m.age<0.6),atB=M.filter(m=>m.pin<0&&m.age>K.span-3);let dA=0,dB=0;R.track(0,o);for(const m of atA)dA+=Math.hypot(m.x-o.x,m.z-o.z)/atA.length;R.track(K.span,o);for(const m of atB)dB+=Math.hypot(m.x-o.x,m.z-o.z)/atB.length;
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
ok(mo&&mo.silled&&mo.sill<-990&&mo.sill>-1010&&mo.area>500&&west&&!mo.anox&&mo.D<0.5,`the floor east of ours is in a silled basin — ${mo?mo.area.toFixed(0):'-'} km² behind ${mo?mo.sill.toFixed(1):'-'}, the moat joined to the basin 28 km west — and it is oxic: its food over its oxygen ${mo?mo.D.toFixed(2):'-'} (open water, nut ${mo?mo.nut.toFixed(2):'-'}, the sill deep)`);
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
  ok(reefs.length>=30&&reefs.every(R=>R.state==='atoll'||R.state==='bank'||R.state==='drowned')&&!G.ISLANDS[0].carb&&!G.ISLANDS[1].carb&&!G.ISLANDS.some(R=>R.carb&&R.bare!==undefined),`${reefs.length} reef records carry the cap (atolls, banks, drowned banks); ours, the giant and the seamounts none`);
  ok(n>2000&&crest>0.15*n&&chute>0.2*n,`their slopes at 500–800 m (${n} samples): ${(100*crest/n).toFixed(0)}% hard convex spur, ${(100*chute/n).toFixed(0)}% soft chute`);
  ok(deep===0,'ours\' own deep flanks 5 km out are mud, as before ('+deep+' hard samples)');}
// the floor's supply (v11.97, DEEP §2): the islands' aprons by their land, the open floor beyond them
const hR=G.ISLANDS[0],gi=G.ISLANDS[1],aFoot=G.apronR(hR,6000),aOurs=G.apronR(hR,8500),aGiant=G.apronR(gi,14000),aw=G.ISLANDS.find(r=>r.id==='m153');
ok(aFoot===1&&aOurs<0.4,`ours' apron: ${aFoot.toFixed(2)} at its foot (6 km), ${aOurs.toFixed(2)} at 8.5 km (a rim with almost no land sheds little)`);
ok(aGiant>0.7,`the giant's apron 14 km from its centre, past its foot: ${aGiant.toFixed(2)} (7 km of rainy land supply it)`);
ok(aw&&G.apronR(aw,aw.fade[1]+11000)>0&&G.apronR(aw,aw.fade[1]+11200)===0,'the awesome shield\'s run-out stops 11.1 km past its foot, as the giant\'s does: more land, a thicker apron, not a longer one');
{let deep=0,ap=0,none=0;for(let x=-G.HALF+250;x<G.HALF;x+=500)for(let z=-G.HALF+250;z<G.HALF;z+=500){if(G.sample(x,z).h>-700)continue;deep++;const a=G.apronAt(x,z);if(a>0.5)ap++;else if(a===0)none++;}
  ok(ap>deep/2&&none>0,`the square's floor under -700: ${(100*ap/deep).toFixed(0)}% apron (the archipelago's debris), ${(100*none/deep).toFixed(0)}% open floor beyond every apron`);}
// the records (v11.102, GLOBE §8 step 5): every member whose ground reaches the world, the buried struck, ours and the giant unchanged inside their cores
const RB=G.RG_BUILT;ok(RB.recs.length>=15&&RB.recs.every(r=>Number.isFinite(r.reach)&&r.hi&&r.hi.length>0&&r.an),`${RB.recs.length} of the model's members are records (${RB.recs.map(r=>r.id+' '+r.state).join(', ')}), each with its bound and its angular tables`);
{const inB=(r,w)=>typeof w==='number'?Math.max(Math.abs(r.x),Math.abs(r.z))-r.reach<w:r.x+r.reach>w[0]&&r.x-r.reach<w[1]&&r.z+r.reach>w[2]&&r.z-r.reach<w[3],o=RB.recs.slice(0,RB.n0),w=RB.recs.slice(RB.n0,RB.n1),v=RB.recs.slice(RB.n1); // v11.106: the old square's first, as v11.102 built them, then the ±70.5 km world's; v11.115 then the province's
  const W7=G.WORLD70,b7=[W7.i0*G.CELL-G.HALF-2000,W7.i1*G.CELL-G.HALF+2000,W7.j0*G.CELL-G.HALF-2000,W7.j1*G.CELL-G.HALF+2000];
  ok(RB.n0===20&&RB.n1===45&&o.every(r=>inB(r,G.HALF+2000))&&w.every(r=>inB(r,b7)&&!inB(r,G.HALF+2000)),`the first ${RB.n0} reach the old square (v11.102's, in its order), the ${w.length} after them v11.106's ±70.5 km alone: ${w.map(r=>r.id+' '+r.state).join(', ')}`);
  ok(v.length>=60&&v.every(r=>inB(r,[G.WX0-2000,G.WX1+2000,G.WZ0-2000,G.WZ1+2000])&&!inB(r,b7)),`the ${v.length} after them the province alone (x ${(G.WX0/1000).toFixed(1)}…${(G.WX1/1000).toFixed(1)}, z ${(G.WZ0/1000).toFixed(1)}…${(G.WZ1/1000).toFixed(1)} km): ${v.map(r=>r.id+' '+r.state).join(', ')}`);
}
ok(RB.struck.every(q=>RB.recs.some(r=>r.id===q.by)||q.by==='home'||q.by==='giant'),`${RB.struck.length} struck as inside another's ground: `+RB.struck.map(q=>q.id+' in '+q.by).join(', '));
{let bad=0;const f9b=new Float32Array(9);for(const R of RB.recs)for(let r=0;r<R.reach;r+=97)for(let k=0;k<12;k++){const a=k/12*Math.PI*2+r*0.01,x=R.x+Math.cos(a)*r,z=R.z+Math.sin(a)*r,I={};G.islandH(R,x,z,I);if(I.h>R.hi[Math.min(R.hi.length-1,Math.floor(r/R.hiS))]||I.hs>R.hi[Math.min(R.hi.length-1,Math.floor(r/R.hiS))])bad++;}
  ok(bad===0,`every record's ground stays under its bound table (world.js sample skips by it): ${bad} over`);}
// v11.114: where records meet, the fill (smax's knee) stops at FILL_TOP: above it the ground is the highest record's own, so no land stands where
// no record has land — to v11.113 coalesced banks' lagoons (−20) met at up to +90, hundreds of km² of plateau the model has not got
{let n=0,over=0,land=0,worst=-1e9,at='';const I={};for(let x=G.WX0+200;x<G.WX1;x+=400)for(let z=G.WZ0+200;z<G.WZ1;z+=400){const h=G.sample(x,z).h;if(h<=G.FILL_TOP)continue;n++;if(h>0)land++;
    let own=-1e9;for(const i of G.recsAt(x,z)){const R=G.ISLANDS[i];if(Math.hypot(x-R.x,z-R.z)>R.reach*R.sc)continue;G.islandH(R,x,z,I);if(I.h>own)own=I.h;}
    if(h>own+0.01){over++;if(h-own>worst){worst=h-own;at=`(${(x/1000).toFixed(1)}, ${(z/1000).toFixed(1)}) km`;}}}
  ok(n>1000&&over===0,`above ${G.FILL_TOP} m the ground is the highest record's own: ${over} of ${n} places at 400 m over the world higher${over?' (the worst '+worst.toFixed(1)+' m at '+at+')':''}; ${(land*0.16).toFixed(0)} km² of land, every bit some record's`);}
// v11.117 (analysis_flora_diversity §5.4; the person, 12 Nov 2026): the islands shelter each other — what stands at the surface upwind casts a
// wave shadow, what stands up into the current a wake (world.js SHELTER, shelterBuild); the pins take none (their fields were set by hand); the
// land is untouched (its rain and its sea cliffs read the record's own aspect, the shelter only the water's fields)
{const I=id=>G.ISLANDS.find(R=>R.id===id),sh=(id,k,a)=>{const R=I(id);return R&&R.sh?G.shT(R.sh,k,a):0;},WA=Math.atan2(-Math.sin(3.49),-Math.cos(3.49)),CA=5.44;
  ok(!G.ISLANDS[0].sh&&!G.ISLANDS[1].sh,'ours and the giant take no shelter (the pins: their fields are as v11.116\'s)');
  const w138=sh('m138',0,WA),c141=sh('m141',1,CA),c148=sh('m148',1,CA),n=G.ISLANDS.filter(R=>R.sh&&[...R.sh].some(v=>v>0.3)).length;
  ok(w138>0.4&&c141>0.3&&c148<0.1,`the 308 m island's windward face in a wave shadow (${w138.toFixed(2)}: the bank m122 and the atoll m139 upwind), the east atoll's fed face in a wake (${c141.toFixed(2)}), m148's open (${c148.toFixed(2)}); ${n} of ${G.ISLANDS.length} records sheltered over 0.3 somewhere`);
  const pts=[];for(let k=0;k<4000;k++){const R=G.ISLANDS[2+k%(G.ISLANDS.length-2)],a=k*2.399,r=(R.land?R.land.r*1.2:R.rimR!==undefined?R.rimR+800:1500)*R.sc*((k%7)/7+0.2);pts.push([R.x+Math.cos(a)*r,R.z+Math.sin(a)*r]);}
  const h1=pts.map(p=>G.sample(p[0],p[1]).h),keep=G.ISLANDS.map(R=>R.sh);for(const R of G.ISLANDS)R.sh=null;const h0=pts.map(p=>G.sample(p[0],p[1]).h);G.ISLANDS.forEach((R,i)=>{R.sh=keep[i];});
  ok(h1.every((h,i)=>h===h0[i]),'the ground with the shelter and without it the same to the bit at 4,000 places over every record (the water\'s fields alone take it)');}
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
