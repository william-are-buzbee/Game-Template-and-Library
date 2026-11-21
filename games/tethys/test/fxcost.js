// test/fxcost.js — what each switch of the effects list costs a frame (v11.203, for the low tier's defaults: the person, 21 Nov 2026, "turn off effects
// that kill performance. It's not low if you can't run it on a low device"): the bench's page in headless Chromium at a place, the high tier's
// defaults on, then each switch flipped (fxApply, as the list does) and the frame timed — the whole frame stepped (__step) and waited on with a
// one-pixel read, the least of FRAMES — against the frame with it flipped back. On SwiftShader, a CPU pretending to be a GPU: a proxy whose ratios are
// not a real card's, but a switch that is a tenth of the frame here is a share on any weak GPU. Not in --test.
//   node test/fxcost.js       ONLY (places: forest,shore), SIZE (800x450), FRAMES (5)
'use strict';
const path=require('path');const ROOT=path.join(__dirname,'..');
const {playwright,open,PLACES}=require('./benchpage.js');
const ONLY=(process.env.ONLY||'forest,shore').split(','),SZ=(process.env.SIZE||'800x450').split('x').map(Number),K=+process.env.FRAMES||5;
(async()=>{const P=await open(playwright(),ROOT,{width:SZ[0],height:SZ[1]});const page=P.page,out={};
  for(let k=0;k<500;k++){if(await page.evaluate(()=>window.__boot.stage!=='store'))break;await new Promise(r=>setTimeout(r,20));}
  await page.evaluate(()=>{const rf=window.renderFrame;window.renderFrame=function(){};for(let i=0;i<3000&&!window.__boot.done;i++)__step(1);window.renderFrame=rf;});
  for(const name of ONLY){const a=PLACES[name];
    const r=await page.evaluate(({a,K})=>{const rf=window.renderFrame;window.renderFrame=function(){};choose(0,V3(a.x,a.y,a.z),a.yaw,0);
      const st=window.__step,step=n=>{for(let i=0;i<n;i++){if(a.hold){player.pos.y=a.y;player.vel.y=0;}st(1);}};step(300);window.renderFrame=rf;
      const gl=renderer.getContext(),px=new Uint8Array(4),sync=()=>gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);
      const time=()=>{step(3);sync();let b=1e9;for(let i=0;i<K;i++){const t0=__real();step(1);sync();b=Math.min(b,__real()-t0);}return b;}; // three frames to settle (a switch can compile a program), then the least of K
      const keys=Object.keys(FX_DEF).filter(k=>typeof FX_DEF[k]==='boolean'&&['autoRes','freeLook','camFx'].indexOf(k)<0);
      for(const k of keys)FX[k]=FX_DEF[k];FX.autoRes=false;fxApply();const base=time(),res=[];
      for(const k of keys){const was=FX[k];FX[k]=!was;fxApply();const t1=time();FX[k]=was;fxApply();const t0=time();res.push([k,was,was?t0-t1:t1-t0]);} // the cost of the switch on: on − off, whichever is the default
      for(const k of keys)FX[k]=FX_DEF[k];fxApply();return {base,res};},{a,K});
    out[name]=r;}
  await P.close();
  const keys=out[ONLY[0]].res.map(x=>x[0]);
  console.log('what each switch costs a frame on, ms (SwiftShader at '+SZ.join('×')+'; the frame with the high tier\'s defaults: '+ONLY.map(n=>n+' '+out[n].base.toFixed(1)).join(', ')+')');
  console.log('switch'.padEnd(12)+'default '+ONLY.map(n=>n.padStart(9)).join('')+'   share');
  const rows=keys.map(k=>{const v=ONLY.map(n=>out[n].res.find(x=>x[0]===k)[2]);return [k,out[ONLY[0]].res.find(x=>x[0]===k)[1],v];}).sort((a,b)=>Math.max(...b[2])-Math.max(...a[2]));
  for(const [k,def,v] of rows)console.log(k.padEnd(12)+(def?'on      ':'off     ')+v.map(x=>x.toFixed(2).padStart(9)).join('')+'   '+(100*Math.max(...v.map((x,i)=>x/out[ONLY[i]].base))).toFixed(0)+'%');
})().catch(e=>{console.log(e);process.exit(1);});
