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
const G=new Function('THREE',util+'\n'+world+'\n'+region+'\nreturn {sample,HALF,ISLANDS,REGION_K,REGION_PINS,RG_STATE,regionModel,regionGrid,regionBasins,regionSeen,rgKei,rgSea,rgTrack,OXY,chemoAt,oxyAt,underChemo,chemoB:()=>CHEMO_B,apronAt,apronR,RG_BUILT,rgFloor,BASIN,islandH};')(THREE);
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
const f9=new Float32Array(9),Hg=G.regionGrid(R,x0,z0,span,n,(x,z)=>G.sample(x,z,f9).h,G.HALF),ci=Math.floor((6000-x0)/(span/n)),cj=Math.floor(-z0/(span/n));
ok(Math.abs(Hg[cj*n+ci]-G.sample(6000+0.5*span/n-((6000-x0)%(span/n)),0.5*span/n-(-z0%(span/n)),f9).h)<1,'inside the game\'s square the grid is the game\'s own ground');
console.log('region: the game\'s own water (v11.96, DEEP §2, §9)');
// the basins of the game's own ground (v11.102: the model's members in it): those silled by region.js's rule, none over ours or the giant
const t4=Date.now();G.chemoAt(0,0);const CB=G.chemoB(),silled=CB.B.filter(b=>b.silled),bXZ=b=>[CB.x0+(b.cx+0.5)*CB.G,CB.x0+(b.cz+0.5)*CB.G];
ok(silled.every(b=>{const p=bXZ(b);return Math.hypot(p[0],p[1])>8000&&Math.hypot(p[0]+15400,p[1]-9200)>8000;}),`the square's ground at ${CB.G} m (${CB.n}², ${Date.now()-t4} ms): ${CB.B.length} hollows and lagoons, ${silled.length} silled by region.js's rule (`+silled.map(b=>{const p=bXZ(b);return `${b.area.toFixed(0)} km² behind ${b.sill.toFixed(0)} at ${(p[0]/1000).toFixed(1)}, ${(p[1]/1000).toFixed(1)} km`;}).join('; ')+'), none within 8 km of ours or the giant');
const spots=[[0,0,'ours'],[6000,0,'the floor east'],[-15400,9200,'the giant'],[-400,-11100,'the drowned atoll north'],[20000,20000,'a far corner']];
ok(spots.every(([x,z])=>G.chemoAt(x,z)===null),'no chemocline over '+spots.map(p=>p[2]).join(', '));
ok(!G.underChemo(6000,-1000,0),'the floor east of ours at -1000 is not under a chemocline');
// the profile: 1 in the light, the core's minimum, back to half at the floor; the core lower where the food rains
const ox=y=>G.oxyAt(3000,y,0),o50=ox(-50),o300=ox(-300),o650=ox(-650),o1100=ox(-1100);
ok(o50===1&&o300<1&&o650<o300&&o1100>o650,`the profile over the fed water 3 km east of ours (6 km out, the open basin's, the core is the mild 0.5 and the floor's): ${o50.toFixed(2)} at -50, ${o300.toFixed(2)} at -300, ${o650.toFixed(2)} at -650 (the core), ${o1100.toFixed(2)} at -1100`);
ok(o650>=G.OXY.min[0]-1e-9&&o650<=G.OXY.min[1]+1e-9&&Math.abs(o1100-G.OXY.deep)<1e-9,'the core within the table\'s minimum, the floor at its deep value — survivable everywhere (the person, 10 Nov 2026)');
const near=G.oxyAt(3000,-650,0),far=G.oxyAt(15000,-650,-15000);
ok(near<far,`the core lower under the island's fed water (${near.toFixed(2)} 3 km out) than in the open basin (${far.toFixed(2)})`);
// the floor's supply (v11.97, DEEP §2): the islands' aprons by their land, the open floor beyond them
const hR=G.ISLANDS[0],gi=G.ISLANDS[1],aFoot=G.apronR(hR,6000),aOurs=G.apronR(hR,8500),aGiant=G.apronR(gi,14000),aw=G.ISLANDS.find(r=>r.id==='m153');
ok(aFoot===1&&aOurs<0.4,`ours' apron: ${aFoot.toFixed(2)} at its foot (6 km), ${aOurs.toFixed(2)} at 8.5 km (a rim with almost no land sheds little)`);
ok(aGiant>0.7,`the giant's apron 14 km from its centre, past its foot: ${aGiant.toFixed(2)} (7 km of rainy land supply it)`);
ok(aw&&G.apronR(aw,aw.fade[1]+11000)>0&&G.apronR(aw,aw.fade[1]+11200)===0,'the awesome shield\'s run-out stops 11.1 km past its foot, as the giant\'s does: more land, a thicker apron, not a longer one');
{let deep=0,ap=0,none=0;for(let x=-G.HALF+250;x<G.HALF;x+=500)for(let z=-G.HALF+250;z<G.HALF;z+=500){if(G.sample(x,z).h>-700)continue;deep++;const a=G.apronAt(x,z);if(a>0.5)ap++;else if(a===0)none++;}
  ok(ap>deep/2&&none>0,`the square's floor under -700: ${(100*ap/deep).toFixed(0)}% apron (the archipelago's debris), ${(100*none/deep).toFixed(0)}% open floor beyond every apron`);}
// the records (v11.102, GLOBE §8 step 5): every member whose ground reaches the world, the buried struck, ours and the giant unchanged inside their cores
const RB=G.RG_BUILT;ok(RB.recs.length>=15&&RB.recs.every(r=>Number.isFinite(r.reach)&&r.hi&&r.hi.length>0&&r.an),`${RB.recs.length} of the model's members are records (${RB.recs.map(r=>r.id+' '+r.state).join(', ')}), each with its bound and its angular tables`);
ok(RB.struck.every(q=>RB.recs.some(r=>r.id===q.by)||q.by==='home'||q.by==='giant'),`${RB.struck.length} struck as inside another's ground: `+RB.struck.map(q=>q.id+' in '+q.by).join(', '));
{let bad=0;const f9b=new Float32Array(9);for(const R of RB.recs)for(let r=0;r<R.reach;r+=97)for(let k=0;k<12;k++){const a=k/12*Math.PI*2+r*0.01,x=R.x+Math.cos(a)*r,z=R.z+Math.sin(a)*r,I={};G.islandH(R,x,z,I);if(I.h>R.hi[Math.min(R.hi.length-1,Math.floor(r/R.hiS))]||I.hs>R.hi[Math.min(R.hi.length-1,Math.floor(r/R.hiS))])bad++;}
  ok(bad===0,`every record's ground stays under its bound table (world.js sample skips by it): ${bad} over`);}
ok(Math.abs(G.rgFloor(6000,0)-G.BASIN.h)<0.5,`the model's floor read by the game beside ours: ${G.rgFloor(6000,0).toFixed(1)} (${G.BASIN.h})`);
// the log: what the default province is
const cnt={};let land=0;for(const m of M){cnt[m.state]=(cnt[m.state]||0)+1;land+=m.land;}
console.log(`\n  ${M.length} members in ${ms} ms (seed ${K.seed}; the grid ${t2-t1} ms, the flood ${t3-t2} ms):`);
for(const s in G.RG_STATE)if(cnt[s])console.log(`    ${String(cnt[s]).padStart(3)}  ${G.RG_STATE[s]}`);
console.log(`  land ${land.toFixed(0)} km² (discs); above the sea:`);
for(const m of M.filter(m=>m.zv>0).sort((a,b)=>b.zv-a.zv))console.log(`    ${m.id.padEnd(6)} ${G.RG_STATE[m.state].padEnd(18)} ${String(Math.round(m.zv)).padStart(5)} m  ${m.age.toFixed(2).padStart(5)} Ma  ${String(Math.round(m.V/1e9)).padStart(5)} km³  ${String(Math.round(m.land)).padStart(5)} km²  at ${(m.x/1000).toFixed(1)}, ${(m.z/1000).toFixed(1)} km${m.inSq&&m.pin<0?'  (inside the game\'s square: a proposal)':''}`);
const seen=G.regionSeen(R,0,0);console.log(`  from ours: ${seen.map(s=>`${s.m.id} ${(s.d/1000).toFixed(0)} km${s.haze?'':s.clear?' (clear days)':' (never)'}`).join(', ')}`);
const k0=cj*n+ci;console.log(`  the water beside ours (the game's ground inside its square): floor ${Hg[k0].toFixed(0)}, its way out tops at ${regionFill(Hg,n,span,k0).toFixed(0)}`);
function regionFill(Hh,nn,sp,k){return G.regionBasins(Hh,nn,sp/nn).F[k];}
for(const b of B.B.filter(b=>b.silled).sort((a,b)=>b.area-a.area).slice(0,4))console.log(`  a silled basin: ${b.area.toFixed(0)} km², sill ${b.sill.toFixed(0)}, floor ${b.floor.toFixed(0)}, chemocline ${b.chemo.toFixed(0)}`);
console.log(fails?`\nregion: ${fails} FAILED`:'\nregion: all passed');process.exit(fails?1:0);
