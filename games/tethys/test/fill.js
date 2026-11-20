// test/fill.js — what each thing drawn costs the GPU, as a time (v11.187): every draw of a frame timed alone in headless Chromium's software WebGL
// (SwiftShader), named by what it draws — a flora species (its pool, or a cell's own mesh), the terrain, the creatures, the surface, the sky — and
// the frame drawn twice: at the person's 1600×900 and at a tenth of each side, so a draw's time splits into its vertices (the small frame: the
// same geometry, a hundredth of the pixels) and its pixels (the rest). test/gpu.js counts what a frame asks for, the same on any machine; this is
// what it costs, on a CPU pretending to be a GPU. So it is a proxy: SwiftShader is a slow GPU with no texture units of its own and no post-transform
// cache, and its ratios are not a 4060's — but a draw that is half the frame here is a large share on any weak GPU, and two versions compare.
//   node test/fill.js                the table at each place: the top draws by time, vertices and pixels apart, a frame's total
//   BASE=<dir> node test/fill.js     beside older sources (`git archive <commit> games/tethys/src games/tethys/vendor games/tethys/shell.html`)
// Env: ONLY (places, comma-separated: test/benchpage.js PLACES), SIZE (1600x900), SMALL (10: the small frame's divisor), FRAMES (3: each frame
// timed, the least time of each draw kept), TOP (18 rows), JSON=<file> (the results, for test/perf.js). Not in --test, not in CI: a time.
// How it times: a draw is preceded and followed by a one-pixel read of what is bound (gl.finish does not wait in Chromium; a read does), so it is
// alone on the software GPU; the empty read's own time is taken off. The frame's sum is slower than the frame drawn straight (no overlap), and the
// absolute numbers are SwiftShader's on this machine: compare rows, and two versions on one machine, never with the person's readout.
'use strict';
const fs=require('fs'),path=require('path');
const {here,playwright,open,PLACES}=require('./benchpage.js');
const [W,H]=(process.env.SIZE||'1600x900').split('x').map(Number),SMALL=+(process.env.SMALL||10),FRAMES=+(process.env.FRAMES||3),TOP=+(process.env.TOP||18);
const only=(process.env.ONLY||Object.keys(PLACES).join(',')).split(',').filter(k=>k in PLACES);
const roots=(process.env.BASE?[path.resolve(process.env.BASE)]:[]).concat([here]);
const names=root=>{const f=path.join(root,'src/INDEX.md');if(fs.existsSync(f))return [...fs.readFileSync(f,'utf8').matchAll(/`([A-Za-z_$][\w$]*)`/g)].map(m=>m[1]); // the build's index of top-level names, or (a kept tree has none) the sources' top-level declarations read roughly
  const o=[];for(const n of fs.readdirSync(path.join(root,'src')).filter(n=>n.endsWith('.js')))for(const l of fs.readFileSync(path.join(root,'src',n),'utf8').split('\n'))if(/^(const|let|var) /.test(l))for(const m of l.matchAll(/(?:^(?:const|let|var)\s+|,)\s*([A-Za-z_$][\w$]*)\s*=/g))o.push(m[1]);return o;};
// ---- in the page, before any script: every draw and copy timed when __fill.on ----
function fillTiming(){
  const F=window.__fill={on:false,lab:'',recs:[],idle:0};const px=new Uint8Array(4);
  const sync=gl=>{gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);if(gl.getError()){const rb=gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);gl.bindFramebuffer(gl.READ_FRAMEBUFFER,null);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);gl.bindFramebuffer(gl.READ_FRAMEBUFFER,rb);}};
  F.sync=sync;
  for(const P of [window.WebGL2RenderingContext,window.WebGLRenderingContext])if(P)for(const n of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced','copyTexSubImage2D','copyTexImage2D','blitFramebuffer']){
    const f=P.prototype[n];if(!f)continue;
    P.prototype[n]=function(){if(!F.on)return f.apply(this,arguments);sync(this);const t0=window.__real();const r=f.apply(this,arguments);sync(this);F.recs.push([n.startsWith('draw')?F.lab:'copy: '+n,window.__real()-t0]);return r;};}
}
function atPlace(a){
  window.__step(3);const rf=window.renderFrame;window.renderFrame=function(){};
  choose(0,V3(a.x,a.y,a.z),a.yaw,0);
  if(a.hold){const st=window.__step;window.__step=n=>{for(let i=0;i<n;i++){player.pos.y=a.y;player.vel.y=0;st(1);}};} // the body held at its height (benchpage.js PLACES `hold`)
  let gens=0;for(const n of ['genChunk','genRegion']){const f=window[n];if(typeof f==='function')window[n]=function(){gens++;return f.apply(this,arguments);};}
  let k=0,quiet=0;for(;k<600&&quiet<20;k++){const n=gens;window.__step(1);quiet=gens===n?quiet+1:0;}window.__step(150);
  window.renderFrame=rf;window.__step(8);
  // the names: every top-level material, mesh and group by its own name; the pools by species; a cell's own flora by species (chunks.js keeps f on
  // nothing, so by its geometry's size and material: a card species' per-cell clone has its FLORA geometry's vertex count); creatures, the player
  const N=new Map();for(const n of a.names){let v;try{v=(0,eval)(n);}catch(e){continue;}if(v&&(v.isMaterial||v.isObject3D)&&!N.has(v))N.set(v,n);}
  const pool=new Map();for(const P of POOLS.values())pool.set(P.im,P.f.id);
  const geoOf=new Map();for(const f of FLORA){if(f.geo&&f.mat)geoOf.set(f.geo.attributes.position.count+'|'+f.mat.uuid,f.id);if(f.gp&&f.mp)geoOf.set(f.gp.attributes.position.count+'|'+f.mp.uuid,f.id);} // f.gp, f.mp: the pulled geometry and material (v11.187)
  const owner=new Map();for(const c of creatures)if(c.g)owner.set(c.g,'creatures');if(typeof player!=='undefined'&&player.g)owner.set(player.g,'player');
  const labelOf=(o,m,rt)=>{let s=pool.get(o);if(s)s='flora '+s;
    if(!s&&o.isInstancedMesh&&o.geometry&&o.material){const id=geoOf.get(o.geometry.attributes.position.count+'|'+o.material.uuid);if(id)s='flora '+id+' (cell)';}
    if(!s){for(let p=o;p&&!s;p=p.parent)s=owner.get(p);}
    if(!s)s=N.get(o)||(o.parent&&N.get(o.parent));
    if(!s)s=(N.get(m)||m.type)+(o.isInstancedMesh?' inst':'')+(o.isPoints?' points':'');
    return (rt?rt+': ':'')+s;};
  const r=renderer,rbd=r.renderBufferDirect,srt=r.setRenderTarget;let rt='';
  r.setRenderTarget=function(t){rt=t?(t===(sun.shadow&&sun.shadow.map)?'shadow (creatures)':t===(typeof sunS!=='undefined'&&sunS.shadow&&sunS.shadow.map)?'shadow (world)':'target'):'';return srt.apply(this,arguments);};
  r.renderBufferDirect=function(cam,sc,g,m,o,gr){window.__fill.lab=labelOf(o,m,rt);return rbd.apply(this,arguments);};
  const gl=r.getContext(),F=window.__fill;
  const frame=()=>{F.recs=[];F.on=true;window.__step(1);F.on=false;F.sync(gl);return F.recs;};
  const idle=()=>{const t=[];for(let i=0;i<40;i++){const t0=window.__real();F.sync(gl);F.sync(gl);t.push((window.__real()-t0)/2);}t.sort((x,y)=>x-y);return t[10];};
  const best=(n)=>{const m=new Map();let tot=Infinity;for(let i=0;i<n;i++){const R=frame(),seen=new Map();let s=0;
      for(const [l,t] of R){const k=l+'#'+((seen.get(l)||0));seen.set(l,(seen.get(l)||0)+1);const c=m.get(k);if(c===undefined||t<c)m.set(k,t);s+=t;}tot=Math.min(tot,s);}
    const by={};for(const [k,t] of m){const l=k.replace(/#\d+$/,'');by[l]=(by[l]||[0,0]);by[l][0]+=t;by[l][1]++;}return by;};
  const wFull=r.domElement.width,hFull=r.domElement.height;
  // the CPU's side of drawing: renderFrame's own time on the wall clock, the GL calls queued and not waited for (three's traversal, sort, uniforms, the
  // calls' own cost) — the readout's `render ms` on this machine; the median of 15 frames, each after a read so nothing is queued before it
  const cpu=(()=>{const rf2=window.renderFrame,T=[];window.renderFrame=function(){const t0=window.__real();rf2.apply(this,arguments);T.push(window.__real()-t0);};for(let i=0;i<15;i++){F.sync(gl);window.__step(1);}window.renderFrame=rf2;F.sync(gl);T.sort((x,y)=>x-y);return T[7];})();
  const i0=idle(),full=best(a.frames);
  r.setSize(Math.round(wFull/a.small),Math.round(hFull/a.small),false);window.__step(2);const i1=idle(),small=best(a.frames);r.setSize(wFull,hFull,false);
  // the picture: one more frame at full size, read whole — two trees' are compared pixel for pixel (the page is on the bench's clock, Math.random seeded)
  window.__step(1);const px=new Uint8Array(wFull*hFull*4);gl.bindFramebuffer(gl.READ_FRAMEBUFFER,null);gl.readPixels(0,0,wFull,hFull,gl.RGBA,gl.UNSIGNED_BYTE,px);let bin='';for(let i=0;i<px.length;i+=32768)bin+=String.fromCharCode.apply(null,px.subarray(i,i+32768));
  for(const [B,i] of [[full,i0],[small,i1]])for(const l in B)B[l][0]=Math.max(0,B[l][0]-B[l][1]*i*0.5); // a draw's two reads are one empty read's time each, half of it inside the draw's window
  return {full,small,cpu,pixels:btoa(bin),idle:i0,cells:chunks.size,creatures:typeof visibleCreatures==='number'?visibleCreatures:-1,above:wasAbove===true,mode};
}
async function place(pw,root,name){const p=PLACES[name],P=await open(pw,root,{width:W,height:H,init:[fillTiming]});
  try{const o=await P.page.evaluate(atPlace,Object.assign({frames:FRAMES,small:SMALL,names:names(root)},p));o.errs=P.errs.slice();return o;}finally{await P.close();}}
const ms=v=>v>=100?v.toFixed(0):v>=10?v.toFixed(1):v.toFixed(2);
(async()=>{const pw=playwright(),res=[];
  for(const r of roots){const o={};for(const n of only){const q=await place(pw,r,n);o[n]=q;if(q.errs.length)console.log('page errors at '+n+(r===here?'':' (base)')+': '+q.errs.slice(0,3).join(' | '));
    if(q.mode!=='play'||q.above!==PLACES[n].above)console.log(n+': not the place it says ('+q.mode+', the camera '+(q.above?'above':'under')+' the water)');}res.push(o);}
  const cur=res[res.length-1],base=res.length>1?res[0]:null,out={size:W+'x'+H,small:SMALL,places:{}};
  console.log('the GPU\'s time by what is drawn, under software WebGL (SwiftShader) at '+W+'×'+H+': each draw alone, the least of '+FRAMES+' frames; ms here, a proxy (test/fill.js)');
  for(const n of only){const q=cur[n],b=base&&base[n];
    const rows=l=>{const f=(q.full[l]||[0,0])[0],s=(q.small[l]||[0,0])[0];return {l,draws:(q.full[l]||[0,0])[1],vert:s,pix:Math.max(0,f-s),all:f};};
    const L=new Set(Object.keys(q.full).concat(b?Object.keys(b.full):[]));const R=[...L].map(l=>{const h=rows(l);if(b){const f=(b.full[l]||[0,0])[0],s=(b.small[l]||[0,0])[0];h.base=f;}return h;}).sort((x,y)=>Math.max(y.all,y.base||0)-Math.max(x.all,x.base||0));
    const sum=k=>R.reduce((s,r)=>s+(r[k]||0),0);
    console.log('\n'+n+' — '+PLACES[n].what+' ('+q.cells+' cells, '+q.creatures+' creatures in sight; an empty read '+ms(q.idle)+' ms)');
    console.log('  the CPU\'s side (renderFrame on the wall clock, the median of 15): '+ms(q.cpu)+' ms'+(b?' (base '+ms(b.cpu)+', ×'+(q.cpu/b.cpu).toFixed(2)+')':''));
    console.log('  '+'what'.padEnd(46)+'draws'.padStart(6)+'vertices'.padStart(10)+'pixels'.padStart(9)+'all'.padStart(9)+(b?'base'.padStart(9)+'ratio'.padStart(8):''));
    for(const r of R.slice(0,TOP))console.log('  '+r.l.slice(0,46).padEnd(46)+String(r.draws).padStart(6)+ms(r.vert).padStart(10)+ms(r.pix).padStart(9)+ms(r.all).padStart(9)+(b?ms(r.base||0).padStart(9)+(r.base?('×'+(r.all/r.base).toFixed(2)):'new').padStart(8):''));
    console.log('  '+('the frame ('+R.length+' things)').padEnd(46)+String(sum('draws')).padStart(6)+ms(sum('vert')).padStart(10)+ms(sum('pix')).padStart(9)+ms(sum('all')).padStart(9)+(b?ms(sum('base')).padStart(9)+('×'+(sum('all')/sum('base')).toFixed(2)).padStart(8):''));
    if(b){const A=Buffer.from(b.pixels,'base64'),B=Buffer.from(q.pixels,'base64');let d=0,mx=0;for(let i=0;i<A.length;i+=4){const m=Math.max(Math.abs(A[i]-B[i]),Math.abs(A[i+1]-B[i+1]),Math.abs(A[i+2]-B[i+2]));if(m){d++;if(m>mx)mx=m;}}
      console.log('  the picture: '+(d?d+' of '+(A.length/4)+' pixels differ ('+(100*d/(A.length/4)).toFixed(3)+'%), by up to '+mx+' of 255':'the same, pixel for pixel'));q.diff={n:d,max:mx};}
    if(process.env.SAVE){const p=path.join(here,'test/render/fill_'+n+'.rgba');fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,Buffer.from(q.pixels,'base64'));}
    out.places[n]={cpu:q.cpu,cpuBase:b?b.cpu:null,diff:q.diff||null,frame:sum('all'),vert:sum('vert'),pix:sum('pix'),base:b?sum('base'):null,rows:R.slice(0,TOP)};}
  if(process.env.JSON)fs.writeFileSync(process.env.JSON,JSON.stringify(out,null,1));
})().catch(e=>{console.error(e);process.exit(1);});
