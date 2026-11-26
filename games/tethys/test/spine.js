// The spine (v11.246, CREATOR.md "Sixth round: the spine"): every body a chain of knots the creator drags and fattens by hand. Holds, over every
// species of SPECS (real geometry, test/geo.js; the arms' phases and the sim's draws seeded before every build):
//   default   a core given its knots as they would default — a trunk's, the arches' and the eel's two, a lathe's rings written [r, z, 0, r], an
//             ellipsoid's five at 1, 1, 0, 0 and six of them (G.ellK, not G.sph), a mantle's two radii — builds the very body (the eel within 1e-6:
//             its old taper is another sum)
//   still     every handle picked up and put down where it was, and fattened by 1: the very body, the spec's core unchanged
//   add       a knot put in between every two chained knots leaves the body where it was (its bounds within 1e-5), and taken out again, the very body
//   edits     the middle knot fattened 1.5 and raised, the last pulled out: the body changes, nothing is NaN, the mass does not fall when it fattens
//   grow      a trunk's and the arches' back knot pulled out a step at a time grows plates at their pitch (a drag's small steps once crept the pitch)
//   tape      a bent, swollen body of every core replayed from the build's tape (creatures_ai.js tapeBuild) is its whole build to the bit
//   node test/spine.js        the summary and any failure
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
let js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n');
js+='\nglobal.__sp={SPECS,compile,rigRest,derive,fillSpec,spineOf,spineMove,spineSize,spineAdd,spineDel,spineAxis,simSeed,tapeBuild,BUILD_TAPE};';
const tmp=path.join(require('os').tmpdir(),'tethys_spine_'+process.pid+'.js');
fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
process.env.PICK='0';
const log=console.log,warn=console.warn;console.log=()=>{};console.warn=()=>{}; // the boot's chatter
require('./stub.js');require('./geo.js')(global.THREE);require(tmp);
console.log=log;console.warn=warn;
const X=global.__sp,THREE=global.THREE;
function seed(){let a=12345;Math.random=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};X.simSeed(7);}
function lm(o){const q=new THREE.Quaternion();const e=o.rotation;if(e.x||e.y||e.z)q.setFromEuler(e);else q.copy(o.quaternion);return new THREE.Matrix4().compose(o.position,q,o.scale);}
// a built body as the world sees it: every vertex placed, its bounds, NaNs, and the capsules
function look(b){b.anim(1,0.6,{});if(b.rigs)for(const r of b.rigs)X.rigRest(r);const V=[];let lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9],nan=0;
  const walk=(o,M)=>{const m=new THREE.Matrix4().multiplyMatrices(M,lm(o));if(o.isMesh&&o.geometry&&o.geometry.attributes.position){const a=o.geometry.attributes.position.array,e=m.elements;
    for(let i=0;i<a.length;i+=3){const x=e[0]*a[i]+e[4]*a[i+1]+e[8]*a[i+2]+e[12],y=e[1]*a[i]+e[5]*a[i+1]+e[9]*a[i+2]+e[13],z=e[2]*a[i]+e[6]*a[i+1]+e[10]*a[i+2]+e[14];V.push(x,y,z);if(!isFinite(x+y+z))nan++;
      lo=[Math.min(lo[0],x),Math.min(lo[1],y),Math.min(lo[2],z)];hi=[Math.max(hi[0],x),Math.max(hi[1],y),Math.max(hi[2],z)];}}for(const c of o.children)walk(c,m);};
  walk(b.g,new THREE.Matrix4());return {V,lo,hi,nan,hit:JSON.stringify(b.hit)};}
function sig(spec){seed();return look(X.compile(spec));}
const same=(a,b)=>a.hit===b.hit&&a.V.length===b.V.length&&a.V.every((v,i)=>Object.is(v,b.V[i]));
const near=(a,b,e)=>a.V.length===b.V.length&&a.V.every((v,i)=>Math.abs(v-b.V[i])<=e);
const bnd=(a,b)=>Math.max(...a.lo.map((x,k)=>Math.abs(x-b.lo[k])),...a.hi.map((x,k)=>Math.abs(x-b.hi[k])));
const J=o=>JSON.parse(JSON.stringify(o)),canon=o=>JSON.stringify(Object.keys(o).sort().map(k=>[k,o[k]])); // a core's numbers whatever order its keys were written in
const bad=[],fail=(...a)=>bad.push(a.join(' '));
const C={default:0,still:0,add:0,edits:0,grow:0,tape:0};
// ---------- default: the knots as they would default build the very body ----------
const ELL=['coilbody','bean','shield','float'];
for(const id in X.SPECS){const sp0=X.SPECS[id],base=sig(sp0),c=X.fillSpec(sp0).core,k=c.kind,sp=J(sp0);let tol=0;
  if(k==='trunk'||k==='arches')sp.core.knots=[{u:0,w:c.w0,h:c.h0,y:c.y||0},{u:1,w:c.w1,h:c.h1,y:c.y||0}];
  else if(k==='chain'){sp.core.knots=[{u:0,w:c.w0+c.w1},{u:1,w:c.w0}];tol=1e-6;}
  else if(k==='lathe'||(k==='sac'&&c.shape==='lathe'&&c.prof))sp.core.prof=c.prof.map(p=>[p[0],p[1],0,p[0]]);
  else if(k==='mantle'){sp.core.kb=0.28;sp.core.kf=0.92;sp.core.yb=0;sp.core.rings=[];}
  else if(ELL.indexOf(k)>=0||k==='sac')sp.core.ek=[-1,-0.5,0,0.25,0.5,1].map(u=>({u:u,kw:1,kh:1,dy:0,dz:0}));
  else continue;
  const s=sig(sp);if(tol?!near(s,base,tol):!same(s,base))fail(id,'default knots: not the very body');C.default++;}
// ---------- still, add, edits ----------
for(const id in X.SPECS){const sp0=X.SPECS[id],base=sig(sp0),S=X.spineOf(sp0);if(!S){fail(id,'no spine');continue;}
  S.H.forEach((h,i)=>{const sp=J(sp0);X.spineMove(sp,i,h.y,h.z);if(!same(sig(sp),base)||canon(X.fillSpec(sp).core)!==canon(X.fillSpec(sp0).core))fail(id,'handle',i,h.role,'picked up and put down moved the body');
    const sp2=J(sp0);if(X.spineSize(sp2,i,1,1)&&!same(sig(sp2),base))fail(id,'handle',i,h.role,'fattened by 1 moved the body');C.still++;});
  const ax=X.spineAxis(S),Ch=S.H.filter(q=>q.chain);
  for(let j=1;j<Ch.length;j++){if(Ch[j][ax]-Ch[j-1][ax]<1e-6)continue; // two rings at one height (a bell's flat underside): nothing between them
    const sp=J(sp0),v=(Ch[j-1][ax]+Ch[j][ax])/2,H=X.spineAdd(sp,v);if(!H){fail(id,'a knot refused between',j-1,'and',j);continue;}
    const s=sig(sp),d=bnd(s,base);if(d>1e-5||s.nan)fail(id,'a knot put in moved the body',d.toExponential(2),s.nan?'NaN':'');
    const k=H.findIndex(q=>q.role==='k'&&Math.abs(q[ax]-v)<1e-7);if(k<0){fail(id,'the knot put in is not among the handles');continue;}
    X.spineDel(sp,k);if(!same(sig(sp),base))fail(id,'a knot put in and taken out: not the very body',JSON.stringify(sp.core).slice(0,160));C.add++;}
  const mid=Ch[Math.floor(Ch.length/2)],mi=S.H.indexOf(mid);
  if(mid.size){const sp=J(sp0);X.spineSize(sp,mi,1.5,1.5);const s=sig(sp);if(same(s,base))fail(id,'fattened: nothing changed');if(s.nan)fail(id,'fattened: NaN');if(X.derive(sp).mass<X.derive(sp0).mass)fail(id,'fattened: lighter');C.edits++;}
  if(mid.move.indexOf('y')>=0){const sp=J(sp0);X.spineMove(sp,mi,mid.y+0.3*(base.hi[1]-base.lo[1]),mid.z);const s=sig(sp);if(same(s,base))fail(id,'raised: nothing changed');if(s.nan)fail(id,'raised: NaN');C.edits++;}
  const e=Ch.filter(q=>q.move).slice(-1)[0];if(e){const sp=J(sp0),i=S.H.indexOf(e),L=base.hi[2]-base.lo[2];X.spineMove(sp,i,e.y+(ax==='y'?0.2*L:0),ax==='z'?e.z+0.2*L:e.z);const s=sig(sp);if(same(s,base))fail(id,'pulled: nothing changed');if(s.nan)fail(id,'pulled: NaN');C.edits++;}}
// ---------- grow: a back knot pulled out in small steps grows plates at their pitch ----------
for(const id of ['sickle','tread']){const sp=J(X.SPECS[id]),S=X.spineOf(sp),i=S.H.findIndex(h=>h.role==='k'),n0=X.fillSpec(sp).core.n,L0=X.fillSpec(sp).core.L;let z=S.H[i].z;
  for(let k=0;k<40;k++){z-=0.1;X.spineMove(sp,i,S.H[i].y,z);}const c=X.fillSpec(sp).core,want=n0+Math.round(4/(id==='tread'?L0:L0/n0));
  if(Math.abs(c.n-want)>1)fail(id,'pulled 4 m out by 0.1 m steps: '+n0+' plates became '+c.n+', not about '+want);C.grow++;}
// ---------- tape: a bent, swollen body replays from the build's tape to the bit ----------
{const T=X.BUILD_TAPE,geoA=g=>['position','normal','color'].map(k=>g.attributes[k]?g.attributes[k].array:null),eq=(a,b)=>{if(!a||!b)return a===b;if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(!Object.is(a[i],b[i]))return false;return true;};
  const meshes=b=>{const rigM=new Set((b.rigs||[]).map(r=>r.mesh)),M=[];b.g.updateMatrixWorld(true);b.g.traverse(o=>{if(o.isMesh&&!rigM.has(o))M.push(geoA(o.geometry).concat([o.matrixWorld.elements.slice()]));});return {M,num:JSON.stringify([b.hit,b.cover,b.grip])};};
  const seen={};for(const id in X.SPECS){const k=X.SPECS[id].core.kind;if(seen[k])continue;seen[k]=1;const sp=J(X.SPECS[id]),S=X.spineOf(sp),Ch=S.H.filter(q=>q.chain),m=Ch[Math.floor(Ch.length/2)],mi=S.H.indexOf(m);
    if(m.move.indexOf('y')>=0)X.spineMove(sp,mi,m.y+0.2,m.z);if(m.size)X.spineSize(sp,mi,1.3,1.2);
    const d={build:()=>X.compile(sp)};T.on=false;seed();const w=meshes(X.tapeBuild(d,'spine-'+k,''));T.on=true;T.map=new WeakMap();seed();X.tapeBuild(d,'spine-'+k,'');seed();const r=meshes(X.tapeBuild(d,'spine-'+k,''));
    if(w.num!==r.num||w.M.length!==r.M.length||!w.M.every((a,i)=>a.every((x,j)=>eq(x,r.M[i][j]))))fail(id,'('+k+') bent and swollen: the tape\'s replay is not its whole build');C.tape++;}
  T.on=true;T.map=new WeakMap();}
console.log('spine: '+C.default+' bodies at their default knots, '+C.still+' handles picked up and put down, '+C.add+' knots put in and taken out, '+C.edits+' edits, '+C.grow+' trunks grown, '+C.tape+' cores replayed from the tape');
if(bad.length){console.log('SPINE FAILED '+bad.length+'\n  '+bad.slice(0,30).join('\n  '));process.exit(1);}
console.log('OK');
