// test/records.js — the records' index (v11.103, GLOBE §10 step 1; world.js RIX, recsAt): the lookups by place take the records near a point
// from a grid of buckets instead of testing every record. The world must not notice: sample()'s ground and its nine fields, apronAt and coneK,
// to the bit, with the index and with the old loop over every record (RIX.on false), over a grid across the index's whole extent and past it,
// random points, and points on the buckets' edges and corners; every bucket's records in ISLANDS order; every record whose range holds a point
// in that point's bucket. Then the cost, both ways. In --test.
// v11.148 (the performance pass): what its savings rest on — every record one shape (world.js recNew's keys, in its order); hyp2 the engine's
// Math.hypot to the bit; the value noise the same four hash() values; angN angNoise from the angle's cosine and sine; islandH and islandW the
// same with the record's local point handed in (sample()'s way) as without.
'use strict';
const fs=require('fs'),path=require('path'),root=path.join(__dirname,'..');
const util=fs.readFileSync(path.join(root,'vendor/wb-core.global.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'src/util.js'),'utf8');
const world=fs.readFileSync(path.join(root,'src/world.js'),'utf8'),region=fs.readFileSync(path.join(root,'src/region.js'),'utf8');
const THREE={Vector3:class{constructor(x,y,z){this.x=x;this.y=y;this.z=z;}},Matrix4:class{},Quaternion:class{}};
const G=new Function('THREE',util+'\n'+world+'\n'+region+'\nreturn {sample,HALF,ISLANDS,RIX,recsAt,rixRange,apronAt,coneK,NF,recNew,hyp2,vnoise,hash,fbm,angNoise,angN,islandH,islandW,recLoc,rl:()=>[_rlx,_rlz]};')(THREE);
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
// ---- v11.148: the performance pass's identities ----
{const K0=Object.keys(G.recNew()).join(','),odd=G.ISLANDS.filter(R=>Object.keys(R).join(',')!==K0);
  ok(odd.length===0,`every record one shape: recNew's ${K0.split(',').length} keys, in its order, on all ${G.ISLANDS.length}`+(odd.length?` — not ${odd.map(R=>R.id+' ('+(Object.keys(R).filter(k=>!K0.split(',').includes(k)).join(' ')||'order, or a key deleted')+')').join(', ')}: a new key goes in recNew's list (world.js); unset one with undefined, never delete`:''));}
{let bad=0,n=0;const eq=(x,y)=>{n++;if(!Object.is(Math.hypot(x,y),G.hyp2(x,y)))bad++;};
  for(let k=0;k<300000;k++){const a=Math.pow(10,rnd()*14-6),b=k&1?a:Math.pow(10,rnd()*14-6);eq((rnd()-0.5)*a,(rnd()-0.5)*b);}
  const O=[0,-0,1,-1,NaN,Infinity,-Infinity,1e308,-1e308,5e-324,1e-200,3,4,1e154,1.7976931348623157e308,2.2250738585072014e-308,0.1,1/3];for(const x of O)for(const y of O)eq(x,y);
  ok(bad===0,`hyp2 is Math.hypot to the bit at ${n} pairs (the zeros, the infinities and NaN among them): ${bad} differ`);}
{let bad=0,n=0,ba=0;const v0=(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),a=G.hash(xi,yi),b=G.hash(xi+1,yi),c=G.hash(xi,yi+1),d=G.hash(xi+1,yi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}; // v11.147's vnoise
  for(let k=0;k<300000;k++){const sc=Math.pow(10,rnd()*9-2),x=(rnd()-0.5)*sc,y=(rnd()-0.5)*sc;n++;if(!Object.is(v0(x,y),G.vnoise(x,y)))bad++;}
  for(const x of [0,-0,255,256,-256,-255.5,511,512,2147483647,2147483648,-2147483649,4294967296,1e15,NaN,Infinity,-1e-300])for(const y of [0,-0,255,256,-256,2147483648,-2147483649,1e15,NaN,-Infinity,0.3]){n++;if(!Object.is(v0(x,y),G.vnoise(x,y)))bad++;}
  for(let k=0;k<20000;k++){const a=(rnd()-0.5)*20,kk=1+rnd()*3,sd=rnd()*2000;if(!Object.is(G.angNoise(a,kk,sd),G.angN(Math.cos(a),Math.sin(a),kk,sd)))ba++;}
  ok(bad===0&&ba===0,`the value noise the old four hash() values' to the bit at ${n} points (${bad} differ); angN angNoise's own doubles (${ba} of 20000 differ)`);}
{let bad=0,n=0,bw=0,first='';const A={},B={};
  for(const R of G.ISLANDS){if(!(R.sc!==1||R.rot||R.lobe))continue;for(let k=0;k<400;k++){const a=rnd()*Math.PI*2,d=(k%8===0?0:rnd())*R.reach*R.sc*1.1,x=R.x+Math.cos(a)*d,z=R.z+Math.sin(a)*d;
    G.recLoc(R,x-R.x,z-R.z);const [lx,lz]=G.rl();G.islandH(R,x,z,A,lx,lz);G.islandH(R,x,z,B);n++;let same=true;for(const key in B)if(!Object.is(A[key],B[key]))same=false;if(!same){bad++;if(!first)first=`${R.id} at ${x.toFixed(1)}, ${z.toFixed(1)}`;}
    const w1=G.islandW(R,x,z,lx,lz),i1=w1.isl,u1=w1.upW,w2=G.islandW(R,x,z);if(!Object.is(i1,w2.isl)||!Object.is(u1,w2.upW))bw++;}}
  ok(n>1000&&bad===0&&bw===0,`islandH and islandW with the record's local point handed in (recLoc's, as sample() does) the same to the bit as without, at ${n} points over the turned, squeezed and lobed records (${bad} and ${bw} differ${first?'; first '+first:''})`);}
const per=X.L.reduce((s,l)=>s+l.length,0)/X.L.length;
ok(per<G.ISLANDS.length/2,`a bucket holds ${per.toFixed(1)} records on average, of ${G.ISLANDS.length}`);
console.log(`  sample(): ${on.us.toFixed(2)} µs with the index, ${off.us.toFixed(2)} µs over every record (the mean of the points above)`);
console.log(fails?`records: ${fails} FAILED`:'records: ok');process.exit(fails?1:0);
