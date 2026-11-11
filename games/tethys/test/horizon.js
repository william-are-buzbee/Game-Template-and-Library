// test/horizon.js — the horizon's land as a mesh per member (v11.109, GLOBE §10.1; horizon.js hzGen, hzLand): the whole game against the stub,
// the build run to its end from the camera at ours, then again with the members collapsed to one (the source patched: the first member takes
// every cell in the box, as v11.102–108's one mesh did). Every triangle is in one member's mesh and no other; the members' triangles are the one
// mesh's, each to the bit with its winding; each vertex is on the lattice; the members are built nearest first; the giant's land is done after
// a small share of the whole (by the triangles: the stub's clock stands within a frame). In --test.
'use strict';
const fs=require('fs'),path=require('path'),os=require('os');
const ROOT=path.join(__dirname,'..'),ONE=process.env.HZ==='one';
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
let js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n');
const P=[['for(const m of order){','for(const m of [order[0]]){'],['const cells=[],i0=Math.max(0,Math.floor((m.x-m.t-x0)/C)),i1=Math.min(cx-1,Math.floor((m.x+m.t-x0)/C)),j0=Math.max(0,Math.floor((m.z-m.t-z0)/C)),j1=Math.min(cz-1,Math.floor((m.z+m.t-z0)/C));','const cells=[],i0=0,i1=cx-1,j0=0,j1=cz-1;'],['if(own!==m)continue;','if(!own)continue;']];
let fails=0;const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++;};
function build(one){let src=js;if(one)for(const [a,b] of P){if(!src.includes(a))throw new Error('horizon.js not as expected: '+a.slice(0,50));src=src.replace(a,b);}
  src+='\nglobal.__HZ'+(one?1:0)+'={run(x,z){const g=hzGen(x,z);let n=0;for(;;){const r=g.next();n++;if(r.done)break;}return {land:hzLand,steps:n};},ISLANDS,Q};';
  const tmp=path.join(os.tmpdir(),'tethys_horizon'+(one?'_one':'')+'.js');fs.writeFileSync(tmp,'(function(){"use strict";\n'+src+'\n})();');require(tmp);return global['__HZ'+(one?1:0)];}
process.env.PICK='1';require('./stub.js');
const tris=land=>{const out=[];for(const m of land.children){const p=m.geometry.attributes.position.array,ix=m.geometry.index.array||m.geometry.index;const k=v=>p[3*v]+','+p[3*v+1]+','+p[3*v+2];
  for(let t=0;t<ix.length;t+=3){const a=[k(ix[t]),k(ix[t+1]),k(ix[t+2])],r=a.indexOf([...a].sort()[0]);out.push([a[r],a[(r+1)%3],a[(r+2)%3]].join('|')+'@'+m.name);}}return out;};
const N=build(false),t1=Date.now(),rn=N.run(0,0),msN=Date.now()-t1;
const O=build(true),t2=Date.now(),ro=O.run(0,0),msO=Date.now()-t2;
console.log(`horizon: ${rn.land.children.length} members' meshes (${msN} ms, ${rn.steps} slices), against one (${msO} ms)`);
const tn=tris(rn.land),to=tris(ro.land),bare=s=>s.slice(0,s.lastIndexOf('@'));
const seen=new Map();let dup=0;for(const t of tn){const b=bare(t);if(seen.has(b))dup++;seen.set(b,t);}
ok(dup===0,`every triangle in one member's mesh (${tn.length} triangles, ${dup} in two)`);
const so=new Set(to.map(bare));let miss=0,extra=0;for(const t of to)if(!seen.has(bare(t)))miss++;for(const b of seen.keys())if(!so.has(b))extra++;
ok(miss===0&&extra===0&&tn.length===to.length,`the members' triangles are the one mesh's, each with its winding: ${to.length} against ${tn.length} (${miss} missing, ${extra} more)`);
const S=N.Q.hz;let off=0;for(const m of rn.land.children){const p=m.geometry.attributes.position.array;for(let k=0;k<p.length;k+=3){const fx=(p[k]-p[0])/S,fz=(p[k+2]-p[2])/S;if(Math.abs(fx-Math.round(fx))>1e-6||Math.abs(fz-Math.round(fz))>1e-6)off++;}}
ok(off===0,'every vertex on the lattice ('+off+' off it)');
const R=n=>N.ISLANDS.find(q=>q.id===n),edge=m=>{const r=R(m.name);return Math.hypot(r.x,r.z);};
const names=rn.land.children.map(m=>m.name);ok(names[0]==='home'&&names.indexOf('giant')>=0&&names.indexOf('giant')<names.indexOf('m153'),`built nearest first from ours: ${names.slice(0,6).join(', ')} … (${names.length})`);
{let cum=0,tot=0,at={};for(const m of rn.land.children)tot+=m.geometry.index.length/3;for(const m of rn.land.children){cum+=m.geometry.index.length/3;at[m.name]=cum/tot;} // the work by the triangles built (the stub's clock stands within a frame, so the build never yields here)
  ok(at.giant<0.1,`the giant's land done after ${(100*at.giant).toFixed(1)}% of the build's triangles, the 308 m island's after ${(100*at.m138).toFixed(1)}% (the awesome shield's after ${(100*at.m153).toFixed(0)}%)`);}
console.log(fails?`horizon: ${fails} FAILED`:'horizon: ok');process.exit(fails?1:0);
