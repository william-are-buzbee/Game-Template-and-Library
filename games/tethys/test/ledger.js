// test/ledger.js — the ledger in tiers (v11.105, GLOBE §10.1 step 3; ecology.js ECO_FB, ECO_PT, ecoId, ecoIJ, ecoSplit, ecoMerge, ecoBubble,
// ecoPatchGen): the fine box keeps its cells one by one, coarse patches of 8×8 cells hold the rest, a patch near the player splits into its cells
// and merges back when the player has gone. Three runs. As built (v11.106: the fine box the old square, the world ±WHALF round it): 5,824
// patches and 64 slots, the lookups the old i*NCELL+j both ways in the box, and the census of LEDGER_DAYS days for the comparison below (the box's,
// which nothing crosses into from the ring). With the fine box patched to the middle 112×112 cells (a child run, the model alone as test/census.js
// loads it): the coarse patches censused (the 704 in the old square are the comparison's); a split lays a patch's count on its 64 cells and a
// merge sums it back, every entry to the float; the bubble splits the patches round the player within ECO_R[0], merges them past ECO_R[1],
// never past its slots, the world's count the same through it; the model over the three tiers side by side finite; and the census against
// the fine one — the coarse ring's capacities and counts after the days, kind by kind. With the box patched in the whole game (a second child,
// as test/falls.js boots it): a cell loaded in a coarse patch splits it and spawns from it; the save carries the patches and the slots back to
// the float. In --test.
'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const ROOT=path.join(__dirname,'..'),MODE=process.env.LEDGER||'',DAYS=+(process.env.LEDGER_DAYS||40),BOX='const ECO_FB={i0:0,j0:0,w:NCELL}',BOXP='const ECO_FB={i0:64,j0:64,w:112}';
let fails=0;const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++;};
const src=n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8');
function ecoBundle(patched){ // the model alone, as test/census.js loads it
  require('./stub.js');let js=['../vendor/wb-core.global','util','world','region','physics','scene','parts','grow','creatures_builders','creatures_spec','creatures_defs','ecology'].map(src).join('\n');
  if(patched){if(!js.includes(BOX))throw new Error('ecology.js ECO_FB not as expected');js=js.replace(BOX,BOXP);}
  const pre='function chunkIJ(){return undefined;}const chunks=new Map(),creatures=[],carcasses=[],player={pos:{x:0,y:0,z:0}};function cellOf(v){return Math.floor((v+HALF)/CELL);}function placeKind(){}\n';
  return new Function('return (function(){"use strict";'+pre+js+'\nreturn {SPAWN,POP,ECO_PT,ECO_FB,ECO_FINE,ECO_CELLS,ECO_SLOTS,ECO_COARSE,ECO_R,PATCH,NCELL,CELL,HALF,GRID0,GRIDN,ecoPI,ecoPJ,ecoPOf,ecoPatchDist,ecoId,ecoIJ,ecoCap,ecoPatchCap,ecoSum,ecoModel,ecoSettle,ecoSplit,ecoMerge,ecoBubble,ecoCellOf,ecoOf,player,sample};})()')();}
const kindTot=(W,field)=>{const m={};W.SPAWN.forEach((e,ei)=>{let s=0;const A=W.POP[field][ei];for(let c=0;c<W.ECO_CELLS;c++)s+=A[c];if(W.ECO_PT.on){const P=W.ECO_PT;for(let p=0;p<P.np;p++)if(P.blk[p]<0)s+=P[field][ei][p];}m[e.kind]=(m[e.kind]||0)+s;});return m;};
const inSq=(W,p)=>{const i=W.ecoPI(p),j=W.ecoPJ(p);return i>=0&&j>=0&&i<W.NCELL&&j<W.NCELL;}; // a patch of the old square (v11.106: the world's are round it)
const ringTot=(W,field,coarse)=>{const m={};W.SPAWN.forEach((e,ei)=>{let s=0;const A=W.POP[field][ei];
  if(coarse){const P=W.ECO_PT;for(let p=0;p<P.np;p++)if(P.coarse[p]&&P.blk[p]<0&&inSq(W,p))s+=P[field][ei][p];for(let c=W.ECO_FINE;c<W.ECO_CELLS;c++)s+=A[c];} // the ring in the old square: its patches and the slots
  else for(let c=0;c<W.ECO_FINE;c++){const i=Math.floor(c/W.NCELL),j=c%W.NCELL;if(i<64||j<64||i>=176||j>=176)s+=A[c];} // the same cells, fine
  m[e.kind]=(m[e.kind]||0)+s;});return m;};
function census(W){for(let c=0;c<W.ECO_FINE;c++)W.ecoCap(c,null);if(W.ECO_PT.on)for(let p=0;p<W.ECO_PT.np;p++)if(W.ECO_PT.coarse[p])W.ecoPatchCap(p);W.ecoSettle(()=>false);}
function run(W,days,coarse){const K=ringTot(W,'k',coarse),N0=ringTot(W,'n',coarse);for(let d=0;d<days-1e-9;d+=0.05)W.ecoModel(0.05,()=>false);return {K,N0,N:ringTot(W,'n',coarse)};} // coarse: the patched box's ring (v11.106: as built has patches too, round the old square)

if(MODE===''){
  console.log('ledger: as built (the fine box the old square, the world ±WHALF round it)');
  const W=ecoBundle(false),nc=W.ECO_PT.coarse?null:null;
  ok(W.ECO_COARSE&&W.ECO_PT.on&&W.ECO_SLOTS===64&&W.ECO_FINE===W.NCELL*W.NCELL&&W.ECO_PT.np===(W.GRIDN/8)**2,`the box ${W.ECO_FB.w}² from (${W.ECO_FB.i0}, ${W.ECO_FB.j0}), ${W.ECO_FINE} cells; ${W.ECO_PT.np} patches over the world from cell ${W.GRID0}, ${W.ECO_SLOTS} slots`);
  let bad=0;for(let k=0;k<20000;k++){const i=(k*7919)%W.NCELL,j=(k*104729)%W.NCELL,c=W.ecoId(i,j);W.ecoIJ(c);if(c!==i*W.NCELL+j||W.ecoIJ(c)[0]!==i||W.ecoIJ(c)[1]!==j)bad++;}
  ok(bad===0&&W.ecoId(-1,5)===-1&&W.ecoId(5,W.NCELL)===-1&&W.ecoId(W.GRID0-1,0)===-1&&W.ecoId(W.GRID0+W.GRIDN,0)===-1,'in the box ecoId is i*NCELL+j and ecoIJ its inverse (20,000 cells); past it a coarse cell not split, and off the world, -1');
  census(W);{const P=W.ECO_PT;let n=0;for(let p=0;p<P.np;p++)n+=P.coarse[p];ok(n===5824&&P.done.reduce((a,b)=>a+b,0)===5824,`the census: ${n} coarse patches round the box, every one censused`);}const fine=run(W,DAYS,false);
  const kid=(mode,extra)=>{const r=cp.spawnSync(process.execPath,[__filename],{env:Object.assign({},process.env,{LEDGER:mode},extra||{}),encoding:'utf8',maxBuffer:1<<26});
    process.stdout.write(r.stdout.split('\n').filter(l=>/^ {2}(ok|FAIL|  )|^ledger/.test(l)).join('\n')+'\n');if(r.status!==0){fails++;if(r.stderr)console.log(r.stderr.slice(-3000));}};
  kid('model',{LEDGER_FINE:JSON.stringify(fine)});kid('game');
  console.log(fails?`ledger: ${fails} FAILED`:'ledger: ok');process.exit(fails?1:0);
}
if(MODE==='model'){
  console.log('ledger: the fine box the middle 112² cells (patched), the model alone');
  const W=ecoBundle(true),P=W.ECO_PT,E=W.SPAWN.length;
  const nc=P.coarse.reduce((a,b)=>a+b,0);ok(W.ECO_COARSE&&P.on&&nc===(W.GRIDN/8)**2-196&&W.ECO_FINE===112*112&&W.ECO_SLOTS===64,`${nc} coarse patches of ${W.PATCH}², the box ${W.ECO_FINE} cells, ${W.ECO_SLOTS} slots of 64`);
  let bad=0;for(let c=0;c<W.ECO_FINE;c++){const ij=W.ecoIJ(c);if(W.ecoId(ij[0],ij[1])!==c)bad++;}ok(bad===0&&W.ecoId(0,0)===-1,'the box\'s cells round-trip through ecoIJ and ecoId; a coarse cell not split is -1');
  census(W);
  // a split and a merge: the count laid on the cells and summed back
  let pp=-1,best=0;for(let p=0;p<P.np;p++){if(!P.coarse[p])continue;let s=0;for(let ei=0;ei<E;ei++)s+=P.n[ei][p]>0?1:0;if(s>best){best=s;pp=p;}}
  const before=W.SPAWN.map((e,ei)=>P.n[ei][pp]);W.ecoSplit(pp);const s=P.blk[pp],base=W.ECO_FINE+s*64;
  const laid=W.SPAWN.map((e,ei)=>{let t=0;for(let l=0;l<64;l++)t+=W.POP.n[ei][base+l];return t;});
  ok(s>=0&&laid.every((v,ei)=>Math.abs(v-before[ei])<=1e-4*Math.max(1,before[ei]))&&before.every((v,ei)=>P.n[ei][pp]===0),`a patch with ${best} kinds split into slot ${s}: every entry's count laid on its 64 cells, to the float`);
  const ij=W.ecoIJ(base+9);ok(W.ecoId(ij[0],ij[1])===base+9&&W.ecoPOf(ij[0],ij[1])===pp,'a slot\'s cell is where its patch is, both ways');
  W.ecoMerge(pp);ok(P.blk[pp]<0&&before.every((v,ei)=>Math.abs(P.n[ei][pp]-laid[ei])<=1e-4*Math.max(1,v)),'merged back: the counts summed, the slot freed');
  // the bubble: round the player within ECO_R[0], merged past ECO_R[1]; the world's count the same through it
  const sum=()=>W.SPAWN.map((e,ei)=>W.ecoSum(ei)),S0=sum();
  W.player.pos.x=-W.HALF+3000;W.player.pos.z=-W.HALF+3000;for(let k=0;k<80;k++)W.ecoBubble(W.player.pos.x,W.player.pos.z);
  const used=()=>P.bp.reduce((a,b)=>a+(b>=0?1:0),0),u1=used();let within=0,split=0;for(let p=0;p<P.np;p++){if(!P.coarse[p])continue;const W8=8*W.CELL,x0=(W.GRID0+Math.floor(p/P.nw)*8)*W.CELL-W.HALF,z0=(W.GRID0+(p%P.nw)*8)*W.CELL-W.HALF,dx=Math.max(x0-W.player.pos.x,0,W.player.pos.x-x0-W8),dz=Math.max(z0-W.player.pos.z,0,W.player.pos.z-z0-W8);if(Math.hypot(dx,dz)<W.ECO_R[0]){within++;if(P.blk[p]>=0)split++;}}
  ok(u1>0&&split===within&&u1<=W.ECO_SLOTS,`at the old square's north-west corner: the ${within} coarse patches within ${W.ECO_R[0]} m all split (${u1} slots in use)`);
  const S1=sum();ok(S1.every((v,ei)=>Math.abs(v-S0[ei])<=1e-3*Math.max(1,S0[ei])),'the world\'s count the same through the splits, every entry');
  for(let d=0;d<5;d+=0.05)W.ecoModel(0.05,()=>false);const S2=sum();ok(S2.every(v=>Number.isFinite(v)&&v>=0),'five days of the model over the fine box, the split cells and the patches side by side: every count finite');
  W.player.pos.x=W.HALF-3000;W.player.pos.z=W.HALF-3000;const S3=sum();for(let k=0;k<80;k++)W.ecoBubble(W.player.pos.x,W.player.pos.z);const S4=sum();
  let old=0;for(let x=0;x<W.ECO_SLOTS;x++){const p=P.bp[x];if(p<0)continue;if(W.ecoPatchDist(p,-W.HALF+3000,-W.HALF+3000)<W.ECO_R[1])old++;}
  ok(old===0&&used()>0&&used()<=W.ECO_SLOTS&&S4.every((v,ei)=>Math.abs(v-S3[ei])<=1e-3*Math.max(1,S3[ei])),`gone to its south-east corner: the north-west's patches merged, the south-east's split (${used()} slots), the count the same`);
  for(let k=0;k<80;k++){W.player.pos.x=(k%2?1:-1)*(W.HALF-3000);W.ecoBubble(W.player.pos.x,W.player.pos.z);}ok(used()<=W.ECO_SLOTS&&P.free.length+used()===W.ECO_SLOTS,'back and forth eighty times: never past the slots, none lost');
  // a cell loading in a coarse patch splits it
  const ch={i:10,j:10},c=W.ecoCellOf(ch);ok(c>=W.ECO_FINE&&W.ecoId(10,10)===c,`a loading cell in a coarse patch (10, 10) splits it: index ${c}`);
  // the census against the fine one, over the coarse ring
  const F=JSON.parse(process.env.LEDGER_FINE),C0=W.ecoBundle?null:null;const W2=ecoBundle(true);census(W2);const coarse=run(W2,DAYS,true);
  const kinds=Object.keys(F.K).filter(k=>F.K[k]>5).sort((a,b)=>F.K[b]-F.K[a]);let rows=[],kOK=true,nOK=true;
  for(const k of kinds){const rk=coarse.K[k]/F.K[k],rn=F.N[k]>1?coarse.N[k]/F.N[k]:null;rows.push(`${k} ${rk.toFixed(2)}/${rn===null?'-':rn.toFixed(2)}`);if(rk<0.7||rk>1.3)kOK=false;if(rn!==null&&(rn<0.5||rn>2))nOK=false;}
  const tk=Object.values(coarse.K).reduce((a,b)=>a+b,0)/Object.values(F.K).reduce((a,b)=>a+b,0),tn=Object.values(coarse.N).reduce((a,b)=>a+b,0)/Object.values(F.N).reduce((a,b)=>a+b,0);
  console.log('    the coarse ring against the same cells fine, capacity/count after '+DAYS+' days, kind by kind: '+rows.join(', '));
  ok(Math.abs(tk-1)<0.1&&kOK,`the ring's capacity on 704 patches' 256 samples against 45,056 cells' 36: ${tk.toFixed(3)} of the fine census's in all, every kind within 30%`);
  ok(Math.abs(tn-1)<0.15&&nOK,`its count after ${DAYS} days of the model: ${tn.toFixed(3)} of the fine model's in all, every kind within a factor of two`);
  process.exit(fails?1:0);
}
if(MODE==='game'){
  console.log('ledger: the fine box patched in the whole game');
  const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
  let js=ORDER.map(src).join('\n');if(!js.includes(BOX))throw new Error('ecology.js ECO_FB not as expected');js=js.replace(BOX,BOXP);
  js+='\nglobal.__G={POP,ECO_PT,ECO_FINE,ECO_SLOTS,ecoId,ecoSum,ecoOf,popRows,popLoad,chunks,SPAWN,player,cellsAround,HALF,CELL,go:(x,z)=>{player.pos.set(x,dispY,z);cellsAround();},day:(h,st)=>{for(let k=0;k<h;k+=st){clockH+=st;POP.acc=ECO_STEP;ecoTick(ECO_STEP);let g=0;while(POP.model&&g++<5000)ecoTick(0);}}};';
  const tmp=path.join(os.tmpdir(),'tethys_ledger_game.js');fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');process.env.PICK='1';require('./stub.js');require(tmp);
  const G=__G,P=G.ECO_PT;__step(200);let g=0;while(G.POP.gen&&g++<200000){const r=G.POP.gen.next();if(r.done)G.POP.gen=null;}
  G.go(G.HALF-2500,2000);__step(400); // the coarse ring's east, by the seamount m147 (the north-west corner is the awesome shield's land)
  const loaded=[...G.chunks.values()];const ids=loaded.map(ch=>G.ecoId(ch.i,ch.j));
  ok(loaded.length>0&&ids.every(c=>c>=G.ECO_FINE),`${loaded.length} cells loaded in the coarse east, every one in a split patch's slot`);
  const spawned=loaded.reduce((a,ch)=>a+ch.creatures.filter(o=>o.ent>=0).length,0);ok(spawned>0,`and spawned from it: ${spawned} creatures on the ledger`);
  G.day(20,0.05);const rows=G.popRows(),json=JSON.parse(JSON.stringify(rows));
  ok(!!json.pt&&json.pt.bp.length===G.ECO_SLOTS,'the save carries the patches and the slots');
  const snap=G.SPAWN.map((e,ei)=>[Array.from(P.n[ei]),Array.from(P.k[ei]),Array.from(P.cd[ei])]),bp=Array.from(P.bp),tot=G.SPAWN.map((e,ei)=>G.ecoSum(ei));
  for(const ch of [...G.chunks.values()]){} // the loaded cells stay; popLoad resets the ledger under them as a load does
  const okLoad=G.popLoad(json);const same=G.SPAWN.every((e,ei)=>[P.n[ei],P.k[ei],P.cd[ei]].every((A,q)=>A.every((v,x)=>Math.abs(v-snap[ei][q][x])<=1e-3)));
  ok(okLoad&&same&&Array.from(P.bp).every((v,x)=>v===bp[x]),'loaded back: every patch\'s count, capacity and condition to the save\'s rounding, the slots where they were');
  // v11.106: the hunters' response tables are not saved — the load pass rebuilds them, the counts untouched, and the model runs on
  {const n0=G.SPAWN.map((e,ei)=>Array.from(P.n[ei]));let g=0;while(G.POP.gen&&g++<200000){const r=G.POP.gen.next();if(r.done)G.POP.gen=null;}
    let miss=0;for(let p=0;p<P.np;p++)if(P.coarse[p]&&P.blk[p]<0&&!P.rt[p])miss++;
    const kept=G.SPAWN.every((e,ei)=>P.n[ei].every((v,x)=>v===n0[ei][x]));
    let threw='';try{G.day(5,0.05);}catch(e){threw=e.message;}const fin=G.SPAWN.every((e,ei)=>Number.isFinite(G.ecoSum(ei)));
    ok(!G.POP.gen&&miss===0&&kept&&!threw&&fin,`after the load the patches' tables rebuilt (${miss} missing), every count the save's, and five days of the model run on${threw?' — threw: '+threw:''}`);}
  // a save from before v11.106 (the box the world: no patches, the tables ECO_FINE long): its cells load, the patches are censused again
  {const old=JSON.parse(JSON.stringify(G.popRows()));delete old.pt;for(const k of ['n','k','ke','cd','ow'])old[k]=old[k].map(r=>{const a=[];for(const t of r){if(Array.isArray(t))for(let q=0;q<t[1];q++)a.push(t[0]);else a.push(t);}return a.slice(0,G.ECO_FINE);});
    {const a=[];for(const t of old.done){if(Array.isArray(t))for(let q=0;q<t[1];q++)a.push(t[0]);else a.push(t);}old.done=a.slice(0,G.ECO_FINE);}
    const cell=G.ecoId(100,100),want=G.SPAWN.map((e,ei)=>old.n[ei][cell]);const okOld=G.popLoad(old);let g=0;while(G.POP.gen&&g++<400000){const r=G.POP.gen.next();if(r.done)G.POP.gen=null;}
    let und=0;for(let p=0;p<P.np;p++)if(P.coarse[p]&&!P.done[p])und++;
    ok(okOld&&G.SPAWN.every((e,ei)=>G.ecoOf(e.kind).hunter||Math.abs(G.POP.n[ei][cell]-want[ei])<=1e-3)&&und===0,`a save from before v11.106 (its tables ${G.ECO_FINE} cells long, no patches): loaded, a cell's counts the save's, every patch censused again (${und} not)`);}
  process.exit(fails?1:0);
}
