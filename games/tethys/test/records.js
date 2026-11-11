// test/records.js — the records' index (v11.103, GLOBE §10 step 1; world.js RIX, recsAt): the lookups by place take the records near a point
// from a grid of buckets instead of testing every record. The world must not notice: sample()'s ground and its nine fields, apronAt and coneK,
// to the bit, with the index and with the old loop over every record (RIX.on false), over a grid across the index's whole extent and past it,
// random points, and points on the buckets' edges and corners; every bucket's records in ISLANDS order; every record whose range holds a point
// in that point's bucket. Then the cost, both ways. In --test.
'use strict';
const fs=require('fs'),path=require('path'),root=path.join(__dirname,'..');
const util=fs.readFileSync(path.join(root,'vendor/wb-core.global.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'src/util.js'),'utf8');
const world=fs.readFileSync(path.join(root,'src/world.js'),'utf8'),region=fs.readFileSync(path.join(root,'src/region.js'),'utf8');
const THREE={Vector3:class{constructor(x,y,z){this.x=x;this.y=y;this.z=z;}},Matrix4:class{},Quaternion:class{}};
const G=new Function('THREE',util+'\n'+world+'\n'+region+'\nreturn {sample,HALF,ISLANDS,RIX,recsAt,rixRange,apronAt,coneK,NF};')(THREE);
let fails=0;const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++;};
G.recsAt(0,0);const X=G.RIX,ext=[X.x0,X.x0+X.nx*X.B,X.z0,X.z0+X.nz*X.B];
console.log(`records: ${G.ISLANDS.length} in ${X.nx}×${X.nz} buckets of ${X.B} m over ${((ext[1]-ext[0])/1000).toFixed(0)} × ${((ext[3]-ext[2])/1000).toFixed(0)} km`);
// the points: a grid over the extent and 3 km past it, random ones, and the buckets' own edges and corners (where a list changes)
const P=[];let r=20261111;const rnd=()=>{r=(Math.imul(r,1103515245)+12345)>>>0;return r/4294967296;};
for(let z=ext[2]-3000;z<=ext[3]+3000;z+=731)for(let x=ext[0]-3000;x<=ext[1]+3000;x+=731)P.push([x,z]);
for(let k=0;k<40000;k++)P.push([ext[0]+(ext[1]-ext[0])*rnd(),ext[2]+(ext[3]-ext[2])*rnd()]);
for(let k=0;k<6000;k++){const i=Math.floor(rnd()*X.nx),j=Math.floor(rnd()*X.nz),e=[0,1e-7,-1e-7][k%3];P.push([X.x0+i*X.B+e,X.z0+j*X.B+X.B*rnd()]);P.push([X.x0+i*X.B+X.B*rnd(),X.z0+j*X.B+e]);P.push([X.x0+i*X.B+e,X.z0+j*X.B+e]);}
for(let k=0;k<20000;k++){const a=rnd()*Math.PI*2,d=rnd()*4000;P.push([Math.cos(a)*d,Math.sin(a)*d]);} // ours, where the cone and the core are
const run=on=>{X.on=on;const H=new Float64Array(P.length),F=new Float32Array(P.length*G.NF),A=new Float64Array(P.length),C=new Float64Array(P.length),f=new Float32Array(G.NF);const t=process.hrtime.bigint();
  for(let k=0;k<P.length;k++){const s=G.sample(P[k][0],P[k][1],f);H[k]=s.h;F.set(f,k*G.NF);}const us=Number(process.hrtime.bigint()-t)/1e3/P.length;
  for(let k=0;k<P.length;k++){A[k]=G.apronAt(P[k][0],P[k][1]);C[k]=G.coneK(P[k][0],P[k][1]);}return {H,F,A,C,us};};
run(true);const off=run(false),on=run(true); // a warm-up first: the timing is the second pass each way
let dh=0,df=0,da=0,dc=0,first=-1;for(let k=0;k<P.length;k++){const a=Object.is(on.H[k],off.H[k]);if(!a){dh++;if(first<0)first=k;}if(!Object.is(on.A[k],off.A[k]))da++;if(!Object.is(on.C[k],off.C[k]))dc++;
  for(let q=0;q<G.NF;q++)if(!Object.is(on.F[k*G.NF+q],off.F[k*G.NF+q])){df++;if(first<0)first=k;break;}}
ok(dh===0&&df===0,`sample() at ${P.length} points: the ground and the nine fields the same to the bit with the index and without`+(first>=0?` — first difference at ${P[first].map(v=>v.toFixed(1)).join(', ')}`:''));
ok(da===0&&dc===0,`apronAt and coneK the same to the bit (${da} and ${dc} differ)`);
// a NaN point (the snow's swarm block can hand groundAt one: CHANGELOG v11.103): no bucket, no records, NaN ground — as the loop over every record left it
{const g=on=>{X.on=on;return [G.sample(NaN,0).h,G.sample(0,NaN).h,G.sample(NaN,NaN).h];},a=g(true),b=g(false);
  ok(a.every((v,k)=>Number.isNaN(v)&&Number.isNaN(b[k])),'a NaN point: the ground NaN with the index and without, and no throw');}
// the buckets: ISLANDS order, and complete — every record whose range holds a point is in that point's bucket
ok(X.L.every(l=>l.every((v,k)=>k===0||l[k-1]<v)),'every bucket\'s records in ISLANDS order (each loop meets them as before)');
let miss=0;for(let k=0;k<30000;k++){const x=ext[0]+(ext[1]-ext[0])*rnd(),z=ext[2]+(ext[3]-ext[2])*rnd();X.on=true;const L=G.recsAt(x,z);
  G.ISLANDS.forEach((R,i)=>{if(Math.hypot(x-R.x,z-R.z)<=G.rixRange(R)&&!L.includes(i))miss++;});}
ok(miss===0,`every record whose range holds a point is in that point's bucket (30000 random points: ${miss} missed)`);
const per=X.L.reduce((s,l)=>s+l.length,0)/X.L.length;
ok(per<G.ISLANDS.length/2,`a bucket holds ${per.toFixed(1)} records on average, of ${G.ISLANDS.length}`);
console.log(`  sample(): ${on.us.toFixed(2)} µs with the index, ${off.us.toFixed(2)} µs over every record (the mean of the points above)`);
console.log(fails?`records: ${fails} FAILED`:'records: ok');process.exit(fails?1:0);
