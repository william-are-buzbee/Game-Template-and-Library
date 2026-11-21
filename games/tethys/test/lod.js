// test/lod.js — the flora's far copies (v11.194, analysis_project.md §4; grow.js species, lodParts; parts.js GEO_K, LOD): every species built twice
// against the stub with real geometry (test/geo.js), the far copy switched on and forced (LOD.on: off in the game but with #lod; LOD.force: the stub has no WebGL2, where the game builds it). For each species
// and each of its three variants: the copy is no heavier than the plant, and it is the same plant — its bounds inside the plant's to within 10% of its
// size (a polygon with fewer sides lies inside the one with more when its count divides; a blade with fewer segments follows a coarser line to the
// same droop and its tip lands up to 8% out — the frond's), as tall to within 15% and at least half as wide (a variant drawn from another random stream would be
// a different shape and fail here). Then the triangles of all of them, whole against the copies. In --test (build.js SIDE).
'use strict';
const fs=require('fs'),path=require('path'),os=require('os');
const ROOT=path.join(__dirname,'..');
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
let js='';for(const n of ORDER){js+=fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')+'\n';if(n==='parts')js+='LOD.on=true;LOD.force=true;\n';}
js+='\nglobal.__flora=()=>FLORA;';
const tmp=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'tethys-lod-')),'bundle.js');fs.writeFileSync(tmp,js);
require('./stub.js');require('./geo.js')(global.THREE);require(tmp);
let fails=0;const ok=(c,m)=>{if(!c){console.log('  FAIL '+m);fails++;}};
function boxes(g){const P=g.attributes.position.array,V=g.attributes.vid.array,B=[0,1,2].map(()=>({n:0,lo:[1e9,1e9,1e9],hi:[-1e9,-1e9,-1e9]}));
  for(let i=0;i<V.length;i++){const b=B[V[i]];b.n++;for(let a=0;a<3;a++){const v=P[i*3+a];if(v<b.lo[a])b.lo[a]=v;if(v>b.hi[a])b.hi[a]=v;}}return B;}
let whole=0,copy=0,n=0;const rows=[];
for(const f of global.__flora()){if(!f.geo||!f.geo.attributes||!f.geo.attributes.vid)continue;n++;
  if(!f.geoL){ok(false,f.id+': no far copy');continue;}
  const A=boxes(f.geo),B=boxes(f.geoL);let tw=0,tc=0;
  for(let k=0;k<3;k++){const a=A[k],b=B[k];tw+=a.n/3;tc+=b.n/3;
    ok(b.n<=a.n,f.id+' variant '+k+': the copy has more triangles ('+b.n/3+' against '+a.n/3+')');
    const size=Math.max(a.hi[0]-a.lo[0],a.hi[1]-a.lo[1],a.hi[2]-a.lo[2]),eps=0.1*size+1e-4;
    for(let x=0;x<3;x++){ok(b.lo[x]>=a.lo[x]-eps&&b.hi[x]<=a.hi[x]+eps,f.id+' variant '+k+': the copy reaches outside the plant on axis '+'xyz'[x]+' ('+b.lo[x].toFixed(2)+'…'+b.hi[x].toFixed(2)+' in '+a.lo[x].toFixed(2)+'…'+a.hi[x].toFixed(2)+')');
      const wa=a.hi[x]-a.lo[x],wb=b.hi[x]-b.lo[x];ok(wb>=(x===1?0.85:0.5)*wa-eps,f.id+' variant '+k+': the copy is '+(wb/wa*100).toFixed(0)+'% of the plant on axis '+'xyz'[x]);}}
  whole+=tw;copy+=tc;rows.push([f.id,tw/3,tc/3]);}
rows.sort((x,y)=>y[1]-x[1]);
console.log('far copies: '+n+' species, a variant\'s triangles whole → copy (the heaviest twelve):');
for(const r of rows.slice(0,12))console.log('  '+r[0].padEnd(11)+String(Math.round(r[1])).padStart(6)+' → '+String(Math.round(r[2])).padStart(5)+'  ×'+(r[2]/r[1]).toFixed(2));
console.log('  all '+n+': ×'+(copy/whole).toFixed(2)+' of the triangles');
ok(n>30,'the species with far copies: '+n);
console.log(fails?fails+' FAILED':'lod: ok');process.exit(fails?1:0);
