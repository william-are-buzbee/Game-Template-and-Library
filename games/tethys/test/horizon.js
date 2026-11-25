// test/horizon.js — the horizon's land as a mesh per member (v11.109, GLOBE §10.1; horizon.js hzGen, hzLand): the whole game against the stub,
// the build run to its end from the camera at ours, then again with the members collapsed to one (the source patched: the first member takes
// every cell in the box, as v11.102–108's one mesh did). Every triangle is in one member's mesh and no other; the members' triangles are the one
// mesh's, each to the bit with its winding; each vertex is on the lattice; the members are built nearest first; the giant's land is done after
// a small share of the whole (by the triangles: the stub's clock stands within a frame). v11.237: the sea line — the two numbers the water dome's
// cut and the sea disc's reach rest on, from the waves themselves, the disc v11.233's from an eye over 3 m, the dome's code (the picture is
// test/horizon_page.js's, in smoke). In --test.
'use strict';
const fs=require('fs'),path=require('path'),os=require('os');
const ROOT=path.join(__dirname,'..'),ONE=process.env.HZ==='one';
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
let js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n');
const P=[['for(const m of order)yield* hzMember(m);','yield* hzMember(order[0]);'],['const cells=[],i0=Math.max(0,Math.floor((m.x-m.t-x0)/C)),i1=Math.min(cx-1,Math.floor((m.x+m.t-x0)/C)),j0=Math.max(0,Math.floor((m.z-m.t-z0)/C)),j1=Math.min(cz-1,Math.floor((m.z+m.t-z0)/C));','const cells=[],i0=0,i1=cx-1,j0=0,j1=cz-1;'],['if(own!==m)continue;','if(!own)continue;']];
let fails=0;const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++;};
function build(one){let src=js;if(one)for(const [a,b] of P){if(!src.includes(a))throw new Error('horizon.js not as expected: '+a.slice(0,50));src=src.replace(a,b);}
  src+='\nglobal.__HZ'+(one?1:0)+'={run(x,z){const g=hzGen(x,z);let n=0;for(;;){const r=g.next();n++;if(r.done)break;}return {land:hzLand,steps:n};},watch:(x,y,z)=>{const H=hzSetup();H.built.clear();H.queue.length=0;for(const q of H.tops)q.queued=false;hzWatch(x,y,z);return H.queue.map(q=>q.id);},sight:(id,y)=>{const q=hzSetup().tops.find(t=>t.id===id);return q?hzSight(q,y):null;},ISLANDS,Q,sea:{WAVES,WSH_MEAN,WAVE_SHOAL_MAX,WAVE_FADE_D,FOG_SR,FOG_SN,FAR,HZ_DIP,HZ_SEA0,HZ_IN,HZ_FAR,DOME_M,hzIn,hzSeaBuild,disc:()=>hzSea,dome:waterDome,sky,SKY_FS}};';
  const tmp=path.join(os.tmpdir(),'tethys_horizon'+(one?'_one':'')+'.js');fs.writeFileSync(tmp,'(function(){"use strict";\n'+src+'\n})();');require(tmp);return global['__HZ'+(one?1:0)];}
process.env.PICK='1';require('./stub.js');
const tris=land=>{const out=[];for(const m of land.children){const p=m.geometry.attributes.position.array,ix=m.geometry.index.array||m.geometry.index,o=m.position;const k=v=>(o.x+p[3*v]).toFixed(4)+','+p[3*v+1]+','+(o.z+p[3*v+2]).toFixed(4); // the world's position (v11.110: each mesh local to a lattice point by it)
  for(let t=0;t<ix.length;t+=3){const a=[k(ix[t]),k(ix[t+1]),k(ix[t+2])],r=a.indexOf([...a].sort()[0]);out.push([a[r],a[(r+1)%3],a[(r+2)%3]].join('|')+'@'+m.name);}}return out;};
const N=build(false),t1=Date.now(),rn=N.run(0,0),msN=Date.now()-t1;
const O=build(true),t2=Date.now(),ro=O.run(0,0),msO=Date.now()-t2;
console.log(`horizon: ${rn.land.children.length} members' meshes (${msN} ms, ${rn.steps} slices), against one (${msO} ms)`);
const tn=tris(rn.land),to=tris(ro.land),bare=s=>s.slice(0,s.lastIndexOf('@'));
const seen=new Map();let dup=0;for(const t of tn){const b=bare(t);if(seen.has(b))dup++;seen.set(b,t);}
ok(dup===0,`every triangle in one member's mesh (${tn.length} triangles, ${dup} in two)`);
const so=new Set(to.map(bare));let miss=0,extra=0;for(const t of to)if(!seen.has(bare(t)))miss++;for(const b of seen.keys())if(!so.has(b))extra++;
ok(miss===0&&extra===0&&tn.length===to.length,`the members' triangles are the one mesh's, each with its winding: ${to.length} against ${tn.length} (${miss} missing, ${extra} more)`);
const S=N.Q.hz;let off=0;for(const m of rn.land.children){const p=m.geometry.attributes.position.array;for(let k=0;k<p.length;k+=3){const fx=p[k]/S,fz=p[k+2]/S; /* local: whole steps from the mesh's lattice point (v11.110) */if(Math.abs(fx-Math.round(fx))>1e-6||Math.abs(fz-Math.round(fz))>1e-6)off++;}}
ok(off===0,'every vertex on the lattice, whole steps from its mesh\'s place ('+off+' off it)');
const R=n=>N.ISLANDS.find(q=>q.id===n),edge=m=>{const r=R(m.name);return Math.hypot(r.x,r.z);};
const names=rn.land.children.map(m=>m.name);ok(names[0]==='home'&&names.indexOf('giant')>=0&&names.indexOf('giant')<names.indexOf('m153'),`built nearest first from ours: ${names.slice(0,6).join(', ')} … (${names.length})`);
{let cum=0,tot=0,at={};for(const m of rn.land.children)tot+=m.geometry.index.length/3;for(const m of rn.land.children){cum+=m.geometry.index.length/3;at[m.name]=cum/tot;} // the work by the triangles built (the stub's clock stands within a frame, so the build never yields here)
  ok(at.giant<0.1,`the giant's land done after ${(100*at.giant).toFixed(1)}% of the build's triangles, the awesome shield's after ${(100*at.m153).toFixed(0)}% (v11.134: m138, the 308 m island, a vent of the awesome shield's now)`);}
// v11.113: by sight — from 2 m up at ours the queue holds the near land (the giant, the awesome shield, the 799 m island m122 48 km east) and not
// the atoll m117 87 km east-north-east (its rim a few metres up), which comes in from the awesome shield's summit. v11.134: to v11.133 the 308 m
// island m138 and the low island m150 62 km west (a 50 m island seen ~30 km off to v11.129, a 4 m rim since v11.130), both vents of composites now
{const q0=N.watch(0,2,0),low=N.sight('m117',2);ok(q0.includes('giant')&&q0.includes('m122')&&q0.includes('m153')&&!q0.includes('m117')&&low>5000&&low<40000,`by sight from the water at ours: ${q0.length} members queued, the giant first among the land (${q0.slice(0,4).join(', ')} …), the atoll m117 not (seen ${(low/1000).toFixed(0)} km off; it is 87)`);
  const q1=N.watch(-30005,2500,-36615);ok(q1.includes('m117'),'from the awesome shield\'s summit (2.5 km up) the atoll m117 comes into sight: '+q1.length+' queued');}
// v11.237, the sea line (the person, 25 Nov 2026: "horizon flickering black line above water"). In air the water dome (atmosphere.js) is drawn only
// where a pixel's step above it lies DOME_M under the drawn sea at its point, so a ray reaching it has crossed the sea's face first; a ray the main pass's
// sea leaves to the far plane falls to the horizon pass, whose disc reaches in to hzIn(h) (horizon.js), the tide's crossing of a ray that meets the
// drawn sea no nearer than the far plane when that sea is never more than HZ_DIP under the tide. Here those two numbers against the waves' own:
{const S=N.sea,M=S.WSH_MEAN,TAUx=2*Math.PI,wsh=s=>2*Math.pow((s+1)/2,1.7)-1,ss=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
  const wOf=(i,rm)=>1-ss(S.WAVE_FADE_D[i][0],S.WAVE_FADE_D[i][1],rm),amax=W=>W.A*S.WAVE_SHOAL_MAX; // a wave's drawn share at a grid distance (the mesh's fade, as the fog chunk has it); its amplitude at most: the chop and the place's energy whole, shoaled to the cap
  // the lowest the drawn sea sits under the tide past the disc's HZ_SEA0: every wave in its trough where it is drawn finest (the diagonal, rm = d/√2)
  let low=0,lowAt=0;for(let d=S.FAR*S.HZ_SEA0;d<=S.FOG_SR*Math.SQRT2;d+=10){let h=0;S.WAVES.forEach((W,i)=>{h+=amax(W)*(M-wOf(i,d/Math.SQRT2)*(1+M));});if(-h>low){low=-h;lowAt=d;}}
  ok(low<=S.HZ_DIP,`the drawn sea past ${(S.FAR*S.HZ_SEA0).toFixed(0)} m is never more than HZ_DIP (${S.HZ_DIP} m) under the tide: at most ${low.toFixed(2)} m, at ${lowAt.toFixed(0)} m, shoaled`);
  // the mesh's chords against the wave sum at the dome's radius: at each bearing the grid's two spacings there (as atmosphere.js lays it out), a
  // triangle's longest edge their hypotenuse, and each drawn wave's worst gap between its shape and the straight edge over that step, summed
  const R=Math.max(...(()=>{const p=S.dome.geometry.attributes.position.array,r=[];for(let k=0;k<p.length;k+=3)r.push(Math.hypot(p[k],p[k+1],p[k+2]));return r;})());
  const SR=S.FOG_SR,SN=S.FOG_SN,uOf=x=>{let a=0,b=1;for(let k=0;k<50;k++){const m=(a+b)/2;if(SR*(0.06*m+0.94*m*m*m)<x)a=m;else b=m;}return a;},dmap=u=>SR*(0.06+2.82*u*u)*(2/SN);
  const gap=(dt)=>{let g=0;for(let t0=0;t0<TAUx;t0+=0.02)for(let f=0.05;f<1;f+=0.05){const a=wsh(Math.sin(t0)),b=wsh(Math.sin(t0+dt)),v=wsh(Math.sin(t0+f*dt));g=Math.max(g,Math.abs(v-(a+(b-a)*f)));}return g;};
  let chord=0,chAt=0;for(let ph=0;ph<=Math.PI/4+1e-9;ph+=Math.PI/72){const x=R*Math.cos(ph),z=R*Math.sin(ph),rm=Math.max(x,z),e=Math.hypot(dmap(uOf(x)),dmap(uOf(z)));let c=0;
    S.WAVES.forEach((W,i)=>{const w=wOf(i,rm);if(w>0)c+=amax(W)*w*gap(W.k*e);});if(c>chord){chord=c;chAt=ph;}}
  ok(chord<=S.DOME_M,`at the dome's ${R.toFixed(0)} m the drawn mesh strays from the wave sum by at most ${chord.toFixed(3)} m (bearing ${(chAt*180/Math.PI).toFixed(0)}° off the grid, shoaled), within DOME_M ${S.DOME_M}`);
  // the disc: from an eye over ~3 m it starts at HZ_SEA0 as to v11.233, its rings and triangles as they were; from a low one it reaches in
  S.hzSeaBuild();const g=S.disc().geometry,p=g.attributes.position.array,ix=g.index.array||g.index,r0=S.FAR*S.HZ_SEA0,K=18,NS=96;
  const at=(v,rin)=>{const x=p[3*v],z=p[3*v+2],r=Math.hypot(x,z),k=r>=rin-1e-3?1:rin/r;return [x*k,z*k];},key=q=>q.map(v=>v.toFixed(2)).join(','); // the shader's max(r,uHzIn)/r: 1 on the rings it leaves (a ring's float32 radius is within a millimetre of its own)
  const tri=rin=>{const out=[];for(let t=0;t<ix.length;t+=3){const a=at(ix[t],rin),b=at(ix[t+1],rin),c=at(ix[t+2],rin);if(Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))>1)out.push(key(a)+'|'+key(b)+'|'+key(c));}return out;};
  const old=[];{const q=[];for(let k=0;k<=K;k++){const r=r0*Math.pow(S.HZ_FAR/r0,k/K);for(let s=0;s<NS;s++){const a=s/NS*TAUx;q.push([Math.fround(Math.cos(a)*r),Math.fround(Math.sin(a)*r)]);}}for(let k=0;k<K;k++)for(let s=0;s<NS;s++){const a=k*NS+s,b=k*NS+(s+1)%NS,cc=a+NS,d=b+NS;for(const [i,j,l] of [[a,cc,b],[b,cc,d]])old.push(key(q[i])+'|'+key(q[j])+'|'+key(q[l]));}}
  const t3=tri(S.hzIn(3)),so=new Set(old),inner=Math.min(...Array.from({length:p.length/3},(_,v)=>Math.hypot(p[3*v],p[3*v+2])));
  ok(S.hzIn(3)===r0&&S.hzIn(40)===r0&&t3.length===old.length&&t3.every(t=>so.has(t)),`the disc from an eye 3 m or more over the tide is v11.233's: ${t3.length} triangles of ${old.length}, from ${S.hzIn(3).toFixed(0)} m`);
  ok(inner<=S.hzIn(0.3)&&S.hzIn(1)<r0&&S.hzIn(1)>=S.FAR*1/(1+S.HZ_DIP)-1e-6,`from a low eye it reaches in: ${S.hzIn(1).toFixed(0)} m from 1 m over the tide, ${S.hzIn(0.3).toFixed(0)} from 0.3 (its rings to ${inner.toFixed(0)})`);
  // the dome's code: the cut at the drawn sea (fogWaveH2's x) a pixel's step above the fragment (the derivatives on), the tide's under water; the sky's
  const sh={fragmentShader:'a\n#include <fog_fragment>\nb',vertexShader:'',uniforms:{}};S.dome.material.onBeforeCompile(sh);
  ok(sh.fragmentShader.includes(').x-'+S.DOME_M.toFixed(2)+')discard')&&/fogWaveH2\(vFogPos\.xz/.test(sh.fragmentShader)&&/fyT=fy\+abs\(dFdx\(fy\)\)\+abs\(dFdy\(fy\)\)/.test(sh.fragmentShader)&&/if\(fy>uFogW\.x\)discard/.test(sh.fragmentShader)&&S.dome.material.extensions&&S.dome.material.extensions.derivatives===true,'the water dome cut at the drawn sea less DOME_M a pixel\'s step up in air, at the tide under water');
  ok(S.SKY_FS.includes('if(uCamH+(dy+uSkyStep*(abs(dFdx(dy))+abs(dFdy(dy))))*')&&S.sky.material.extensions&&S.sky.material.extensions.derivatives===true,'the sky cut at the water a pixel\'s step down when uSkyStep is 1 (the horizon pass), at its fragment when 0');}
console.log(fails?`horizon: ${fails} FAILED`:'horizon: ok');process.exit(fails?1:0);
