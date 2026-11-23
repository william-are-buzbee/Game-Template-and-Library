// test/three187.js — the game on three.js r187, the upgrade's target (v11.218; analysis_project.md §6), in headless Chromium on the bench's page with
// THREE=187 (test/benchpage.js: r187's module and, by an import map, its minified core). What it holds is what v11.218 mended both ways (scene.js T187):
// the boot through, a place under water drawn — the plants (their pulled colour), the creatures' shadows (their depth packed as r128's), the surface (one
// pass, oneP), the light chunks rewritten (sun-by-depth, thinLight, r128's point-light falloff) — with no page error, no shader that fails to compile and
// none of the game's own "chunk not as expected" warnings. The pictures against r128's are not held here (a person looks: the scratch picver of v11.218).
// Run by `npm run smoke` (CI); the game ships build.js's three.js, so this is the upgrade's guard, not the live game's.
'use strict';
process.env.THREE='187';
const {here,playwright,open,PLACES}=require('./benchpage.js');
let failed=false;const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m);if(!c)failed=true;};
const BAD=/not as expected|program not valid|Shader Error|THREE\.WebGLProgram|THREE\.WebGLShader|INVALID_OPERATION|INVALID_VALUE/;
(async()=>{let P=null;
  try{P=await open(playwright(),here,{width:640,height:360,init:[()=>{window.__cons=[];const ce=console.error,cw=console.warn;
      console.error=function(){window.__cons.push('error: '+Array.from(arguments).join(' ').slice(0,300));return ce.apply(console,arguments);};
      console.warn=function(){window.__cons.push('warn: '+Array.from(arguments).join(' ').slice(0,300));return cw.apply(console,arguments);};}]});
    const page=P.page,cons=[];page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')cons.push(m.type()+': '+m.text().slice(0,300));});
    for(let k=0;k<500;k++){if(await page.evaluate(()=>window.__boot.stage!=='store'))break;await new Promise(r=>setTimeout(r,20));}
    const a=PLACES.forest;
    const r=await page.evaluate((a)=>{const rf=window.renderFrame;window.renderFrame=function(){};for(let i=0;i<3000&&!window.__boot.done;i++)__step(1);
      const done=window.__boot.done;choose(0,V3(a.x,a.y,a.z),a.yaw,0);for(let i=0;i<300;i++)__step(1);window.renderFrame=rf;for(let i=0;i<10;i++)__step(1);
      let pools=0,drawn=0;for(const P of POOLS.values()){pools++;if(P.nDraw>0)drawn++;}let casters=0,packed=0;
      for(const c of creatures){if(!c.cast)continue;for(const o of c.shM){casters++;if(o.customDepthMaterial&&o.customDepthMaterial.depthPacking===THREE.RGBADepthPacking)packed++;}}
      const gl=renderer.getContext(),px=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);
      return {rev:THREE.REVISION,done:done,pools:pools,drawn:drawn,casters:casters,packed:packed,progs:renderer.info.programs.length,refr:surfaceU.uRefrOn.value,cons:window.__cons};},a);
    ok(r.rev==='187','three.js r'+r.rev+' loaded (its module, its minified core by the import map)');
    ok(r.done,'the boot through on r187');
    ok(r.drawn>0,'the plants drawn under water: '+r.drawn+' of '+r.pools+' pools with plants in view (their pulled colour compiles: a vec4 on r187)');
    ok(r.casters>0&&r.packed===r.casters,'the creatures cast with their depth packed as r128 packs it: '+r.packed+' of '+r.casters+' meshes');
    ok(r.refr===1,'the refraction\'s copy of the frame taken (a FramebufferTexture)');
    const bad=[...new Set(r.cons.concat(cons))].filter(s=>BAD.test(s));
    ok(!bad.length,'no shader failed and no light chunk was not as expected'+(bad.length?': '+bad.slice(0,3).join(' | '):'')+' ('+r.progs+' programs)');
    ok(!P.errs.length,'no page errors'+(P.errs.length?': '+P.errs.slice(0,3).join(' | '):''));
  }catch(e){ok(false,'threw: '+String(e).slice(0,400));}finally{if(P)await P.close();}
  console.log(failed?'three187: FAILED':'three187: ok');process.exit(failed?1:0);})();
