// test/horizon_page.js — the sea line in headless Chromium (v11.234; the person, 25 Nov 2026: "horizon flickering black line above water"): the
// bench's page (test/benchpage.js: its clock, Math.random seeded, the high tier, multisampled), the finback in first person held over open sea at
// eye heights 0.8, 1.2 (across the surface grid) and 1.0 m (along it); each frame drawn three times — as it is, with the water dome hidden,
// and with the horizon pass's clear colour turned red. Fails on a pixel by the sea line that is darker by more than DARK
// with the dome than without (the dome seen past the surface's end: to v11.233 the line, ~700–1200 pixels a frame across the middle at 1280 wide,
// from eyes 0.6–1.2 m), and on one that moves more than BARE with the red (the pass's clear colour seen bare: to this version's first cut, the sky's own cut at the water took the line's pixel whole, 154–400 pixels a frame). And on
// any page error. Needs Playwright and cdnjs; `npm run smoke` (CI), not --test. ~1.5 min.
//   node test/horizon_page.js            BASE=<dir> the same against another tree's sources (v11.233's fails it)
'use strict';
const path=require('path');
const {here,playwright,open}=require('./benchpage.js');
const ROOT=process.env.BASE?path.resolve(process.env.BASE):here;
const DARK=30,BARE=200,ROWS=12,FRAMES=1,GAP=5; // luminance; the three channels' change summed (the clear colour bare moves them ~450, under the surface's far end ~12% of that); rows each side of the screen's middle; frames at each place, GAP steps apart
const PLACES=[{yaw:Math.PI/4,y:[0.8,1.2]},{yaw:0,y:[1.0]}]; // across the grid (where the swell is still drawn at the dome) and along it
(async()=>{const pw=playwright(),P=await open(pw,ROOT,{width:1280,height:720});let fails=0;const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++;};
  try{const page=P.page;
    for(let k=0;k<500;k++){if(await page.evaluate(()=>!window.__boot||window.__boot.stage!=='store'))break;await new Promise(r=>setTimeout(r,20));}
    await page.evaluate(()=>{for(let i=0;i<3000&&window.__boot&&!window.__boot.done;i++)window.__step(1);});
    await page.evaluate(()=>{const rf=window.renderFrame;window.renderFrame=function(){};choose(0,V3(20000,1,40000),Math.PI/4,0);player.fp=true;window.__hold=1; // one game, put there once
      const st=window.__step;window.__step=n=>{for(let i=0;i<n;i++){player.pos.y=window.__hold;player.vel.y=0;st(1);}};window.__step(60);window.renderFrame=rf;
      window.__grab=()=>{const gl=renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,px=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,px);return {w,h,px};};});
    for(const pl of PLACES){const name=pl.yaw===0?'along the grid':'across the grid';
      await page.evaluate(yaw=>{player.yaw=player.byaw=yaw;faceQ(player);},pl.yaw); // turned where it floats
      for(const y of pl.y)for(let f=0;f<FRAMES;f++){ // a frame at a time: a page that draws many in one call runs out of memory
        const q=await page.evaluate(a=>{window.__hold=a.y;window.__step(a.gap);const above=wasAbove===true;
          const A=window.__grab();waterDome.visible=false;renderFrame();const B=window.__grab();waterDome.visible=true;
          const bg=scene.background;scene.background=new THREE.Color(1,0,0);renderFrame();const C=window.__grab();scene.background=bg;
          const {w,h}=A,j0=Math.floor(h/2)-a.rows,j1=Math.floor(h/2)+a.rows;let dark=0,bare=0,c0=w,c1=-1,maxD=0;
          for(let j=j0;j<j1;j++)for(let i=0;i<w;i++){const k=(j*w+i)*4,la=(A.px[k]+A.px[k+1]+A.px[k+2])/3,lb=(B.px[k]+B.px[k+1]+B.px[k+2])/3,dd=lb-la;
            if(dd>a.dark){dark++;c0=Math.min(c0,i);c1=Math.max(c1,i);}maxD=Math.max(maxD,dd);if(Math.abs(C.px[k]-A.px[k])+Math.abs(C.px[k+1]-A.px[k+1])+Math.abs(C.px[k+2]-A.px[k+2])>a.bare)bare++;}
          return {eye:camera.position.y,above,dark,bare,maxD,span:dark?[c0/w,c1/w]:null};},{y,gap:GAP,rows:ROWS,dark:DARK,bare:BARE});
        const where=`${name}, the eye ${q.eye.toFixed(2)} m, frame ${f}`;
        if(!q.above){ok(false,where+': the camera is not in air');continue;}
        ok(q.dark===0,`${where}: ${q.dark} pixels by the sea line darker with the water dome (by ${Math.round(q.maxD)} at most${q.span?', across '+(100*q.span[0]).toFixed(0)+'–'+(100*q.span[1]).toFixed(0)+'% of the width':''})`);
        ok(q.bare===0,`${where}: ${q.bare} pixels of the horizon pass's clear colour bare`);}}
    ok(P.errs.length===0,'no page errors'+(P.errs.length?': '+P.errs.slice(0,3).join(' | '):''));
  }finally{await P.close();}
  console.log(fails?`horizon_page: ${fails} FAILED`:'horizon_page: ok');process.exit(fails?1:0);})().catch(e=>{console.error(e);process.exit(1);});
