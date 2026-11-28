// test/gaps.js — how far each part of every species floats off the rest of its body (v11.250, for the clarity pass: CREATOR.md, Eighth round).
// Every species built as the lab builds it (validate, compile with split, the rest pose), and for each part the nearest of its vertices to any
// triangle of the core or of another part, over the body's length. A whole part that touches nothing shows here; a part one of whose pieces
// touches (a ring of eyes, one on the skin) does not. Not in --test: a list to work from, not a bound (yet).
//   node test/gaps.js           every part 1% of the body or more off
//   GAP=0.005 node test/gaps.js another floor;  ONLY=crusher,flicker  just these
const fs=require('fs'),path=require('path');const ROOT=path.join(__dirname,'..');
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
let js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n');
js+='\nglobal.__cr={SPECS,compile,validate,rigRest};';
const tmp=path.join(require('os').tmpdir(),'tethys_gaps_'+process.pid+'.js');fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
const log=console.log;console.log=()=>{};console.warn=()=>{};
require(ROOT+'/test/stub.js');require(ROOT+'/test/geo.js')(global.THREE);require(tmp);console.log=log;
const X=global.__cr,T=global.THREE;
function tris(objs){const out=[];const v=new T.Vector3();for(const r of objs)r.traverse(o=>{if(!o.isMesh||!o.geometry||!o.geometry.attributes.position)return;o.updateMatrixWorld(true);const g=o.geometry,pa=g.attributes.position,ix=g.index,n=ix?ix.count:pa.count;const P=k=>{v.fromBufferAttribute(pa,k).applyMatrix4(o.matrixWorld);return[v.x,v.y,v.z];};for(let i=0;i+2<n;i+=3)out.push([P(ix?ix.getX(i):i),P(ix?ix.getX(i+1):i+1),P(ix?ix.getX(i+2):i+2)]);});return out;}
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function ptTri(p,[a,b,c]){ // closest point on triangle (Ericson)
  const ab=sub(b,a),ac=sub(c,a),ap=sub(p,a),d1=dot(ab,ap),d2=dot(ac,ap);if(d1<=0&&d2<=0)return dot(ap,ap);
  const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);if(d3>=0&&d4<=d3)return dot(bp,bp);
  const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0){const v=d1/(d1-d3),q=sub(p,[a[0]+v*ab[0],a[1]+v*ab[1],a[2]+v*ab[2]]);return dot(q,q);}
  const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);if(d6>=0&&d5<=d6)return dot(cp,cp);
  const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0){const w=d2/(d2-d6),q=sub(p,[a[0]+w*ac[0],a[1]+w*ac[1],a[2]+w*ac[2]]);return dot(q,q);}
  const va=d3*d6-d5*d4;if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0){const w=(d4-d3)/((d4-d3)+(d5-d6)),bc=sub(c,b),q=sub(p,[b[0]+w*bc[0],b[1]+w*bc[1],b[2]+w*bc[2]]);return dot(q,q);}
  const den=1/(va+vb+vc),v=vb*den,w=vc*den,q=sub(p,[a[0]+ab[0]*v+ac[0]*w,a[1]+ab[1]*v+ac[1]*w,a[2]+ab[2]*v+ac[2]*w]);return dot(q,q);}
const rows=[];
const ONLY=process.env.ONLY?process.env.ONLY.split(','):null,FLOOR=+(process.env.GAP||0.01);
for(const id in X.SPECS){if(ONLY&&ONLY.indexOf(id)<0)continue;const sp=X.validate(X.SPECS[id]).spec;let b;try{b=X.compile(sp,1,undefined,{split:true});}catch(e){continue;}
  b.anim(0,0,{});if(b.rigs)for(const r of b.rigs)X.rigRest(r);b.g.updateMatrixWorld(true);
  const core=tris([b.body]);if(!core.length)continue;let z0=1e9,z1=-1e9;for(const t of core)for(const p of t){z0=Math.min(z0,p[2]);z1=Math.max(z1,p[2]);}const L=z1-z0;
  b.built.forEach((r,i)=>{if(!r||!r.meshes||!r.meshes.length)return;const pt=tris(r.meshes);if(!pt.length)return;let best=Infinity;
    const other=core.concat(...b.built.map((q,j)=>j!==i&&q&&q.meshes?tris(q.meshes):[]));const pts=[];for(const t of pt)for(const p of t)pts.push(p);for(const p of pts){for(const t of other){const d=ptTri(p,t);if(d<best)best=d;}if(best<1e-6)break;}
    const g=Math.sqrt(best)/L,p=sp.parts[i];rows.push([g,id,p.kind+':'+(p.style||'')]);});}
rows.sort((a,b)=>b[0]-a[0]);for(const r of rows.filter(r=>r[0]>=FLOOR))log((100*r[0]).toFixed(1)+'%  '+r[1]+'  '+r[2]);
log(rows.length+' parts measured, '+rows.filter(r=>r[0]>=FLOOR).length+' off by '+(100*FLOOR)+'% of the body or more');
