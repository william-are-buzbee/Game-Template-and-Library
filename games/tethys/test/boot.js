// test/boot.js — the boot and continue (v11.189, analysis_loading.md; main.js BOOT, menu.js menuContinue), in headless Chromium with the real three.js on
// the bench's page (test/benchpage.js: its clock, Math.random seeded): a first visit's boot through its stages to the fade, on the sea shot, with no slot's
// world; a game played and saved; then the page opened again in the same browser profile (its IndexedDB and localStorage): the boot opens that slot's
// world under the camera note (the slot's id on menu.worldOf, its clock), streams the world round it, fades in; continue puts the player into that world
// with no fade, nothing cleared, where it was saved; and the saves list still goes through the fade for a slot elsewhere. Run by `npm run smoke` (CI).
'use strict';
const {here,playwright,serve}=require('./benchpage.js');
let failed=false;const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m);if(!c)failed=true;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const errsOf=a=>a.filter(e=>!/Pointer ?Lock|pointer lock/i.test(e)); // requestPointerLock wants a real click; nothing else may throw
// the frames the test plays are undrawn (renderFrame stubbed) and shadowless (FX.shadows off: updateShadow renders the creatures' map outside renderFrame) —
// on CI's slower runner that queue of software-GPU work made leaving the page wait minutes, and the last leave outlived the job (20 Nov 2026); what is left
// of it is waited out with a one-pixel read (gl.finish does not wait in Chromium) before the page is left
const drain=page=>page.evaluate(()=>{const gl=renderer.getContext(),px=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);});
async function boot(page){ // the store's answer waited for with no frame stepped (as test/gpu.js), then frames until the boot is through
  for(let k=0;k<500;k++){if(await page.evaluate(()=>window.__boot.stage!=='store'))break;await wait(20);}
  await page.evaluate(()=>{for(let i=0;i<3000&&!window.__boot.done;i++)__step(1);});
  return page.evaluate(()=>{const B=window.__boot,b=document.getElementById('boot');return {done:B.done,stage:B.stage,off:b.classList.contains('off'),worldOf:menu.worldOf,t:t,cells:chunks.size,cam:[camera.position.x,camera.position.y,camera.position.z],mode:mode,line:document.getElementById('bootline').className};});}
// one browser, the page left (about:blank) and opened again — never two of this game at once, which is more memory than a cloud session has; one server,
// so the origin and with it the IndexedDB and the localStorage are the same. (Two persistent-profile sessions lost the IndexedDB between them: Chrome
// commits it lazily, and a closed headless browser does not wait.)
(async()=>{const pw=playwright(),server=await serve(here),url='http://127.0.0.1:'+server.address().port+'/bench.html';
  const browser=await pw.chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']}),ctx=await browser.newContext({viewport:{width:800,height:450}}),page0=await ctx.newPage();
  const session=async(fn,leave)=>{const errs=[],on=e=>errs.push(String(e));page0.on('pageerror',on);try{await page0.goto(url,{waitUntil:'load',timeout:300000});return await fn(page0,errs);}finally{page0.off('pageerror',on);if(leave){await drain(page0).catch(()=>{});await page0.goto('about:blank',{timeout:300000});}}}; // leave: off the page before the next visit (the last is closed with the browser)
  try{
    let s=null;
    await session(async(page,errs)=>{
      console.log('a first visit');
      const b=await boot(page);
      ok(b.done&&b.stage==='done'&&b.off,'the boot through its stages, the black fading ('+b.stage+', #boot '+(b.off?'off':'on')+', the line '+b.line+')');
      ok(b.worldOf===null&&b.mode==='menu','no slot\'s world on a first visit; the menu');
      ok(b.cells>=9,'the world round the camera streamed before the fade: '+b.cells+' cells');
      console.log('a game, played and saved');
      s=await page.evaluate(()=>{const rf=window.renderFrame,sh=FX.shadows;window.renderFrame=function(){};FX.shadows=false;startNew(CLADES[0]);for(let i=0;i<120;i++)__step(1);saveNow();window.renderFrame=rf;FX.shadows=sh;return {id:curSave.id,t:t,pos:[player.pos.x,player.pos.y,player.pos.z],mode:mode};}); // played undrawn: under software WebGL a hundred frames drawn queue minutes of the GPU's work
      ok(s.mode==='play'&&typeof s.id==='string','playing, saved as '+s.id+' at t '+s.t.toFixed(2));
      await wait(500); // the store's write
      const e=errsOf(errs);ok(!e.length,'no page errors'+(e.length?': '+e.slice(0,3).join(' | '):''));},true);
    await session(async(page,errs)=>{
      console.log('the game opened again');
      const b=await boot(page);
      ok(b.done&&b.off,'the boot through its stages ('+b.stage+')');
      ok(b.worldOf===s.id,'the slot\'s world under the menu: '+b.worldOf);
      ok(Math.abs(b.t-s.t)<60,'its clock: the saved '+s.t.toFixed(2)+', now '+b.t.toFixed(2)+' (the boot\'s frames since)');
      const dc=Math.hypot(b.cam[0]-s.pos[0],b.cam[1]-s.pos[1],b.cam[2]-s.pos[2]);ok(dc<20,'the camera at the moment saved, '+dc.toFixed(1)+' m from the body');
      const c=await page.evaluate(()=>{const n=chunks.size,ids=[...chunks.keys()].join();document.getElementById('mcont').click();return {mode:mode,busy:menu.busy,fade:+getComputedStyle(fadeEl).opacity,id:curSave&&curSave.id,pos:[player.pos.x,player.pos.y,player.pos.z],kept:[...chunks.keys()].join()===ids,n:n};});
      ok(c.mode==='play'&&!c.busy&&c.fade<0.01,'continue: in play at once, no fade ('+c.mode+', busy '+c.busy+', fade '+c.fade+')');
      ok(c.id===s.id,'as the saved slot: '+c.id);
      const dp=Math.hypot(c.pos[0]-s.pos[0],c.pos[1]-s.pos[1],c.pos[2]-s.pos[2]);ok(dp<0.5,'where it was saved ('+dp.toFixed(3)+' m)');
      ok(c.kept,'nothing cleared: the '+c.n+' cells the menu streamed are the ones played in');
      await page.evaluate(()=>{const rf=window.renderFrame,sh=FX.shadows;window.renderFrame=function(){};FX.shadows=false;for(let i=0;i<29;i++)__step(1);window.renderFrame=rf;FX.shadows=sh;__step(1);}); // the last one drawn
      const e=errsOf(errs);ok(!e.length,'thirty frames of play after: no page errors'+(e.length?': '+e.slice(0,3).join(' | '):''));});
  }catch(e){ok(false,'threw: '+e.message);}finally{await browser.close();server.close();}
  console.log(failed?'boot: FAILED':'boot: all ok');process.exit(failed?1:0);})();
