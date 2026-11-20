// test/gpu.js — what the frame asks of the GPU (v11.179), counted at WebGL's calls in headless Chromium with the real three.js: draws, instances,
// triangles, program changes, uniforms, passes, the bytes sent to buffers and textures and copied on the GPU, readbacks, compiles (the counter is the
// repository's tools/lib/browser.ts `glCounting`). Not a time: none of it depends on the machine, so two versions compare anywhere and CI can hold
// the game to the counts kept in test/gpu.json — where a time on a shared runner is noise. What it cannot say is what the GPU then spends on each
// draw and each pixel (the shaders, the fill): that is still the person's readout.
//   node test/gpu.js                 the counts at each place, for this tree
//   BASE=<dir> node test/gpu.js      the same for the sources kept in <dir> (src/ and vendor/ from before a change, or any older version's:
//                                    `git archive <commit> games/tethys/src games/tethys/vendor games/tethys/shell.html | tar -x -C <dir>`), beside, the ratio
//   node test/gpu.js --check         against test/gpu.json: fails if any count moved more than 10% either way (CI: `npm run smoke`)
//   node test/gpu.js --update        writes test/gpu.json — a change that moves a count updates it in the same pull request, which says why
// The page is test/benchpage.js's (the bench's clock, Math.random seeded): each place in a browser of its own, so a place's counts depend on no
// other. At each (five since v11.180, the wood: inside the forest on the giant; seven since v11.187, the shore and the canopy: test/benchpage.js PLACES): the boot and three menu frames drawn (`boot`: warmShaders' compiles and the first uploads), the player put there as the finback
// (menu.js `choose`), the cells and the far regions round it streamed in with the render left out until 20 frames pass with none started, 150
// more (the pools packed, the fades done), 8 frames drawn (`sight`: what compiles at the place's first sight, which warmShaders should have done
// behind the fade), then FRAMES frames drawn and counted: the mean a frame. At the person's 1600×900, so the bytes are theirs.
// Env: BASE, CHECK=1 (--check), UPDATE=1 (--update), ONLY (places, comma-separated), SIZE (1600x900), FRAMES (12), SHOTS=1 (a picture of each
// place to test/render/gpu_<place>.png, to see what was counted), JSON=<file> (the results as JSON, for test/perf.js).
'use strict';
const fs=require('fs'),path=require('path');
const {here,playwright,open,PLACES}=require('./benchpage.js'); // the places are benchpage.js's since v11.187, shared with test/fill.js
const {glCounting,GL_KEYS,glNumber}=require('../../../tools/lib/browser.ts');
const argv=process.argv.slice(2),CHECK=argv.includes('--check')||!!process.env.CHECK,UPDATE=argv.includes('--update')||!!process.env.UPDATE;
const [W,H]=(process.env.SIZE||'1600x900').split('x').map(Number),FRAMES=+(process.env.FRAMES||12),KEPT=path.join(__dirname,'gpu.json');
const only=(process.env.ONLY||Object.keys(PLACES).join(',')).split(',').filter(k=>k in PLACES);
const roots=(process.env.BASE?[path.resolve(process.env.BASE)]:[]).concat([here]);
// ---- in the page ----
function atPlace(a){const take=()=>window.__gl.take(),mean=F=>{const o={};for(const k of Object.keys(F[0]))o[k]=F.reduce((s,f)=>s+f[k],0)/F.length;return o;};
  let gens=0;for(const n of ['genChunk','genRegion']){const f=window[n];if(typeof f==='function')window[n]=function(){gens++;return f.apply(this,arguments);};}
  window.__step(3);if(typeof window.bootFinish==='function')window.bootFinish();const boot=take(); // the load and the menu's first frames, drawn; since v11.189 the menu draws nothing behind its loading page until the world is there, and the warm-up runs a program a frame — bootFinish compiles the rest here, so the boot's count is the warm-up's whole, as to v11.188
  const rf=window.renderFrame;window.renderFrame=function(){};
  choose(0,V3(a.x,a.y,a.z),a.yaw,0);
  let k=0,quiet=0;for(;k<600&&quiet<20;k++){const n=gens;window.__step(1);quiet=gens===n?quiet+1:0;}window.__step(150);
  window.renderFrame=rf;if(a.shot){window.__step(1);return {};} // for a picture: one frame drawn, so the GPU has one to finish, not twenty
  take();window.__step(8);const sight=take(); // the place's first frames drawn
  const F=[];for(let i=0;i<a.frames;i++){window.__step(1);F.push(take());}
  return {boot,sight:sight.compiles,frame:mean(F),above:wasAbove===true,mode,cells:chunks.size,creatures:typeof visibleCreatures==='number'?visibleCreatures:-1,settle:k};}
async function place(pw,root,name,shot){const p=PLACES[name],P=await open(pw,root,{width:W,height:H,init:[glCounting]});
  try{const o=await P.page.evaluate(atPlace,Object.assign({frames:FRAMES,shot:!!shot},p));o.errs=P.errs.slice();if(!shot)return o;
    const f=path.join(here,'test/render/gpu_'+name+'.png');fs.mkdirSync(path.dirname(f),{recursive:true});
    // a page of its own with one frame drawn: software WebGL is far behind the page, and a picture waits for it to finish everything queued
    await P.page.evaluate(()=>{const gl=renderer.getContext(),px=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);});
    await P.page.screenshot({path:f,timeout:240000}).catch(e=>o.errs.push('screenshot: '+e.message.split('\n')[0]));return o;}finally{await P.close();}}
// ---- the table ----
const round=o=>{const r={};for(const k of GL_KEYS)r[k]=k.endsWith('Bytes')?Math.round(o[k]):Math.round(o[k]*10)/10;return r;};
const COLS=[['draws','draws'],['instances','inst'],['triangles','tris'],['vertices','verts'],['programs','progs'],['uniforms','unifs'],['passes','passes'],['bufferBytes','→buffers'],['textureBytes','→textures'],['copyBytes','copied'],['readbacks','reads']];
const pad=(s,n)=>String(s).padStart(n),row=(label,o)=>pad(label,8)+COLS.map(([k])=>pad(glNumber(k,o[k]),k.endsWith('Bytes')?11:8)).join('');
const head=()=>pad('',8)+COLS.map(([k,l])=>pad(l,k.endsWith('Bytes')?11:8)).join('');
const ratio=(a,b)=>a===b?'':!a?'new':'×'+(b/a).toFixed(2);
(async()=>{const pw=playwright(),res=[];let bad=0;
  for(const r of roots){const o={root:r,places:{},boot:null};for(const n of only){const q=await place(pw,r,n);o.places[n]=q;if(!o.boot)o.boot=q.boot;
      if(q.errs.length){console.log('page errors at '+n+(r===here?'':' (base)')+': '+q.errs.slice(0,3).join(' | '));bad++;}
      if(q.mode!=='play'||q.above!==PLACES[n].above){console.log(n+': not the place it says ('+q.mode+', the camera '+(q.above?'above':'under')+' the water)');bad++;}
      if(process.env.SHOTS&&r===here){const e=(await place(pw,r,n,true)).errs;if(e.length)console.log('the picture at '+n+': '+e.slice(0,2).join(' | '));else console.log('  test/render/gpu_'+n+'.png');}}
    res.push(o);}
  const cur=res[res.length-1],two=res.length>1,base=res[0];
  console.log('what a frame asks of the GPU at '+W+'×'+H+', the mean of '+FRAMES+' frames once the place has loaded (test/gpu.js):');console.log(head());
  for(const n of only){const h=cur.places[n];
    if(two){const b=base.places[n];console.log(row(n,b.frame).replace(/^ {0,8}\S+/,m=>pad(n+' base',8)));console.log(row('here',h.frame));
      console.log(pad('',8)+COLS.map(([k])=>pad(ratio(b.frame[k],h.frame[k]),k.endsWith('Bytes')?11:8)).join(''));}
    else console.log(row(n,h.frame));}
  console.log('places: '+only.map(n=>n+' ('+cur.places[n].cells+' cells, '+cur.places[n].creatures+' creatures in sight)').join(', '));
  const bootLine=b=>b.compiles+' programs linked, '+glNumber('bufferBytes',b.bufferBytes)+' to buffers, '+glNumber('textureBytes',b.textureBytes)+' to textures, '+b.draws+' draws';
  console.log('boot (the load and three menu frames): '+(two?'base '+bootLine(base.boot)+'; here ':'')+bootLine(cur.boot));
  console.log('compiled at first sight (warmShaders missed these; each a stall in play): '+only.map(n=>n+' '+(two?base.places[n].sight+' → ':'')+cur.places[n].sight).join(', '));
  const now={size:W+'x'+H,frames:FRAMES,boot:round(cur.boot),places:{}};for(const n of only)now.places[n]=Object.assign(round(cur.places[n].frame),{sight:cur.places[n].sight});
  if(process.env.JSON)fs.writeFileSync(process.env.JSON,JSON.stringify({size:now.size,frames:FRAMES,base:two?{boot:round(base.boot),places:Object.fromEntries(only.map(n=>[n,Object.assign(round(base.places[n].frame),{sight:base.places[n].sight})]))}:null,here:{boot:now.boot,places:now.places}},null,1));
  if(UPDATE){const keep=Object.assign({note:'what a frame asks of the GPU at each place: test/gpu.js --update writes it, --check (CI) fails when a count moves more than 10% from it'},now);
    if(only.length<Object.keys(PLACES).length&&fs.existsSync(KEPT)){const old=JSON.parse(fs.readFileSync(KEPT,'utf8'));keep.places=Object.assign(old.places,now.places);}
    fs.writeFileSync(KEPT,JSON.stringify(keep,null,1)+'\n');console.log('wrote test/gpu.json');}
  if(CHECK){if(!fs.existsSync(KEPT)){console.log('no test/gpu.json: node test/gpu.js --update writes it');process.exit(1);}
    const kept=JSON.parse(fs.readFileSync(KEPT,'utf8')),moved=[];
    if(kept.size!==now.size||kept.frames!==now.frames)moved.push('kept at '+kept.size+' over '+kept.frames+' frames, counted at '+now.size+' over '+now.frames);
    const cmp=(label,a,b,keys)=>{for(const k of keys){const x=a[k],y=b[k];if(x===undefined)continue;const d=Math.abs(y-x)/Math.max(Math.abs(x),1);if(d>0.1)moved.push(label+' '+k+' '+glNumber(k,x)+' → '+glNumber(k,y)+(x?' ('+(y>x?'+':'')+((y-x)/x*100).toFixed(0)+'%)':''));}};
    cmp('boot',kept.boot,now.boot,['compiles','bufferBytes','textureBytes']);
    for(const n of only){if(!kept.places[n]){moved.push(n+': not in test/gpu.json');continue;}cmp(n,kept.places[n],now.places[n],GL_KEYS.filter(k=>k!=='compiles'));
      if(now.places[n].sight>(kept.places[n].sight||0))moved.push(n+': '+now.places[n].sight+' compiled at first sight, '+(kept.places[n].sight||0)+' kept');}
    if(moved.length){console.log('\nmoved more than 10% from test/gpu.json:\n  '+moved.join('\n  ')+'\nIf the change means it: node test/gpu.js --update, commit test/gpu.json with the change, and say in the pull request what moved and why.');bad++;}
    else{let same=0,n=0;for(const p of only)for(const k of GL_KEYS){n++;if(kept.places[p][k]===now.places[p][k])same++;}console.log('\nevery count within 10% of test/gpu.json'+(same===n?', every one the same':' ('+same+' of '+n+' the same)'));}}
  if(bad)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1);});
