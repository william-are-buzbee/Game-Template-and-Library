// test/origins.js — local origins (v11.110, GLOBE §10.1; chunks.js ORIGIN, poolSnap, originOf, instLocal; far.js; creatures_ai.js fallShow):
// the whole game against the stub, as test/maps.js boots it, twice — as built, and with ORIGIN.on patched false (world coordinates in every
// buffer, as to v11.109) in a child run — at ours, then 36 km out (the pools' render origin re-snaps). Every loaded cell's terrain, its own
// instanced flora and its structures' shadow proxies, every pool's block of every cell, every far region's terrain, structures and cards:
// their world positions (the object's place plus the local number, in doubles) the same in both runs to within the old world floats'
// rounding (5 mm). As built, every local number is small: a cell's within its cell, a region's within its region and apron, a pool's within
// the snap distance of the render origin. In --test.
'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const ROOT=path.join(__dirname,'..'),OFF=process.env.ORIGINS==='off';
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
let js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n');
if(OFF){const a='const ORIGIN={on:true,';if(!js.includes(a))throw new Error('chunks.js ORIGIN not as expected');js=js.replace(a,'const ORIGIN={on:false,');}
js+='\nglobal.__O={ORIGIN,chunks,POOLS,poolGroup,farList,player,cellsAround,CELL,FR,tp:(x,z)=>{player.pos.set(x,dispY,z);cellsAround();}};';
const tmp=path.join(os.tmpdir(),'tethys_origins'+(OFF?'_off':'')+'.js');fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
process.env.PICK='1';require('./stub.js');require(tmp);const O=__O;
// the world positions, in doubles: a mesh's vertices and an instanced mesh's translations, each plus its parents' places
const placeOf=o=>{let x=0,z=0;for(let q=o;q;q=q.parent){x+=q.position.x;z+=q.position.z;}return [x,z];};
const verts=m=>{const p=m.geometry.attributes.position.array,[x,z]=placeOf(m),o=new Float64Array(p.length);for(let k=0;k<p.length;k+=3){o[k]=x+p[k];o[k+1]=p[k+1];o[k+2]=z+p[k+2];}return o;};
const insts=(m,n)=>{const a=m.instanceMatrix.array,[x,z]=placeOf(m),c=n===undefined?a.length/16:n,o=new Float64Array(c*3);for(let k=0;k<c;k++){if(!a[k*16]&&!a[k*16+5]&&!a[k*16+10]){o[k*3]=o[k*3+1]=o[k*3+2]=NaN;continue;}o[k*3]=x+a[k*16+12];o[k*3+1]=a[k*16+13];o[k*3+2]=z+a[k*16+14];}return o;}; // an all-zero matrix (a card hidden under a loaded cell, far.js farApplyCell) draws nothing wherever it sits: NaN, and not compared
const big=(a,lim)=>{let m=0;for(let k=0;k<a.length;k+=3)m=Math.max(m,Math.abs(a[k]),Math.abs(a[k+2]));return m;};
function dump(){const D={},L={cell:0,reg:0,pool:0};
  for(const ch of O.chunks.values()){const key='c'+ch.i+','+ch.j;if(ch.terrain){D[key+':t']=Array.from(verts(ch.terrain));L.cell=Math.max(L.cell,big(ch.terrain.geometry.attributes.position.array));}
    ch.meshes.forEach((m,q)=>{if(m.isInstancedMesh){D[key+':i'+q]=Array.from(insts(m));}});}
  for(const P of O.POOLS.values())for(const b of P.blocks){const a=P.im.instanceMatrix.array,[x,z]=placeOf(P.im),o=[];for(let k=b.start;k<b.start+b.count;k++){o.push(x+a[k*16+12],a[k*16+13],z+a[k*16+14]);L.pool=Math.max(L.pool,Math.abs(a[k*16+12]),Math.abs(a[k*16+14]));}D['p'+P.f.id+'@'+b.ch.i+','+b.ch.j]=o;}
  for(const r of O.farList){const key='r'+r.ri+','+r.rj;r.group.children.forEach((m,q)=>{if(m.isInstancedMesh)D[key+':i'+q]=Array.from(insts(m));else if(m.geometry){D[key+':t']=Array.from(verts(m));L.reg=Math.max(L.reg,big(m.geometry.attributes.position.array));}});}
  return {D,L,origin:[O.ORIGIN.x,O.ORIGIN.z]};}
__step(240);const A=dump();O.tp(30000,-20000);__step(240);const B=dump();
if(OFF){fs.writeFileSync(process.env.ORIGINS_OUT,JSON.stringify({A,B}));process.exit(0);}
let fails=0;const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++;};
console.log('origins: as built against world coordinates (ORIGIN.on false, a child run)');
const out=path.join(os.tmpdir(),'tethys_origins_off.json');const r=cp.spawnSync(process.execPath,[__filename],{env:Object.assign({},process.env,{ORIGINS:'off',ORIGINS_OUT:out}),encoding:'utf8',maxBuffer:1<<26});
if(r.status!==0){console.log(r.stderr.slice(-3000));process.exit(1);}const W=JSON.parse(fs.readFileSync(out,'utf8'));
const cmp=(X,Y,tag)=>{let keys=0,vals=0,bad=0,worst=0,lenBad=0;const kinds={c:0,p:0,r:0};for(const k in X.D){if(!(k in Y.D))continue;const a=X.D[k],b=Y.D[k];keys++;kinds[k[0]]++;if(a.length!==b.length){lenBad++;continue;}
    let kb=0;for(let q=0;q<a.length;q++){if(a[q]===null||b[q]===null)continue;const d=Math.abs(a[q]-b[q]);vals++;if(d>worst)worst=d;if(d>0.005){bad++;kb++;}}if(kb&&process.env.ORIGINS_DBG)console.log('    ',tag,k,a.length,kb,a.slice(0,6).map(v=>+v.toFixed(2)),b.slice(0,6).map(v=>+v.toFixed(2)));}
  ok(keys>50&&kinds.c>0&&kinds.p>0&&kinds.r>0&&lenBad===0&&bad===0,`${tag}: ${keys} meshes and blocks in both (${kinds.c} of the cells', ${kinds.p} pool blocks, ${kinds.r} of the regions'), ${vals} numbers, the most apart ${(worst*1000).toFixed(2)} mm${bad?' — '+bad+' over 5 mm':''}${lenBad?' — '+lenBad+' of another length':''}`);};
cmp(A,W.A,'at ours');cmp(B,W.B,'36 km out, the render origin re-snapped');
ok(A.origin[0]===0&&A.origin[1]===0&&Math.abs(B.origin[0]-30000)<=O.ORIGIN.grid&&Math.abs(B.origin[1]+20000)<=O.ORIGIN.grid,`the pools' render origin: (${A.origin}) at ours, (${B.origin}) after the swim`);
ok(A.L.cell<=O.CELL+1e-6&&B.L.cell<=O.CELL+1e-6&&A.L.reg<O.FR*O.CELL+2100&&B.L.reg<O.FR*O.CELL+2100&&A.L.pool<O.ORIGIN.snap+3000&&B.L.pool<O.ORIGIN.snap+3000,`the local numbers small: a cell's to ${Math.max(A.L.cell,B.L.cell).toFixed(0)} m, a region's to ${Math.max(A.L.reg,B.L.reg).toFixed(0)}, a pool's to ${Math.max(A.L.pool,B.L.pool).toFixed(0)} (to v11.109 the world's, ${Math.max(W.A.L.cell,W.B.L.cell).toFixed(0)} at 36 km)`);
console.log(fails?`origins: ${fails} FAILED`:'origins: ok');process.exit(fails?1:0);
