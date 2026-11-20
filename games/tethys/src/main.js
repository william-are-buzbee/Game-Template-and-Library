// main.js — boot, the frame loop, the debug readout (backquote) and its fog tuner
// the readout's hold line (v11.54, COMBAT.md §2): every hold near the player — holder grip/edge on held covering: the edge's verdict there, the hold's age and its struggle
function holdLine(){let s='',n=0;for(const h of holds){if(n>=3)break;if(!(h.a===player||h.b===player||h.a.pos.distanceTo(player.pos)<95))continue;n++;const nm=o=>o===player?'you':o.kind;s+=(s?'   ':'')+nm(h.a)+' '+h.kind+'/'+(h.edge||'-')+' on '+nm(h.b)+' '+(h.cover||'?')+': '+(h.thru||'-')+' k '+(h.k||0).toFixed(2)+(h.saw>1?'×'+h.saw.toFixed(2):'')+'  '+h.t.toFixed(1)+'s pull '+h.pull.toFixed(2)+(h.pinned?' subdued':' calm '+h.calm.toFixed(1))+(h.swallowT>0?' swallow '+h.swallowT.toFixed(1):'')+(h.tear>0?' tear '+h.tear.toFixed(2):'')+' stam '+stamOf(h.b).toFixed(2);}const P=player,L=P.blood||0;let bl='';if(L>0||P.bleed>1e-5)bl='\nblood '+(L*100).toFixed(1)+'% lost'+(P.bleed>1e-5?'  −'+(P.bleed*100).toFixed(2)+'%/s from '+(P.wounds?P.wounds.length:0)+' wound'+(P.wounds&&P.wounds.length===1?'':'s'):'  clotted')+(L>=BLOOD.collapse?'  collapsing':L>=BLOOD.weak?'  weak':'')+'  ×'+bloodK(P).toFixed(2);return (s?'\nhold '+s:'')+bl;} // v11.91: the blood lost and the rate (combat.js)
let showStats=false,statT=0,fpsEma=60,msEma=16,physEma=0,physMs=0,renderMs=0,renderEma=0,frameMs=0,genMs=0; // frameMs: the whole of the last frame's work; genMs: the streaming's share of it (the cells and the far layer) // physMs: the frame's creature, contact, arm, pad, disturbance and snow time (physics.js and friends); renderMs: renderer.render — the submit plus any wait on the GPU's queue (v11.12; when it runs away from the rest of the frame the GPU is the limit)
// The work, not the wait (v11.32.1). `ms` is dt: the wall clock between frames, which on a vsynced 120 Hz display is 8.3 whatever
// the frame costs, so every screenshot of a machine with headroom read the same number and the headroom was invisible. `work` is
// frameMs — the top of loop() to the bottom — as an EMA and, after the slash, the worst single frame since the readout last drew
// (a quarter second). The worst is the one that matters: the shadow map re-renders only when the sun turns, the camera drifts 20 m
// or a cell loads, and on those frames it adds its whole cost at once. An EMA hides that; a max does not. `gen` is the streaming's
// share of the same frame. All three are CPU time: renderer.render is the submit, not the GPU's own execution.
let frameEma=0,frameMax=0,genEma=0,resK=1; // resK (v11.188): the drawing buffer's scale now (scene.js RES)
function poolLine(){const p=poolStats();return p.draws+(p.hid>0?' +'+(p.hid/1000).toFixed(1)+'k hid':'')+(VPULL_N?'':' packed');} // the pools' draws, and (v11.125) the hidden instances they draw until packed (chunks.js poolPack): they leave the shader at once but count in tris
function toggleStats(){showStats=!showStats;statsEl.style.display=showStats?'block':'none';statT=0;}
// Fog tuner: while the readout is open, these keys nudge the sea fog live and the readout's second line shows the numbers,
// so the look can be dialled in without a build — paste the line back and it gets baked into SEA_FOG (world.js).
// Backspace restores the built-in numbers. Shares at 1, sun 0 and ground 0.15 is close to the pre-v8 fog (the water colours aside).
// shareS only matters if it differs from share: it lets small things (flora, small creatures) fade sooner than the terrain.
const FOG_DEF=Object.assign({},SEA_FOG);
const FOG_TUNE=[
  {k:'share',lo:'Digit1',hi:'Digit2',step:0.02,min:0,max:1,d:2},
  {k:'shareS',lo:'Digit3',hi:'Digit4',step:0.02,min:0,max:1,d:2},
  {k:'dens',lo:'Digit5',hi:'Digit6',step:0.0004,min:0.001,max:0.03,d:4},
  {k:'far',lo:'Digit7',hi:'Digit8',step:0.0001,min:0,max:0.01,d:4},
  {k:'bright',lo:'Digit9',hi:'Digit0',step:0.05,min:0.2,max:3,d:2},
  {k:'sun',lo:'Minus',hi:'Equal',step:0.1,min:0,max:3,d:1},
  {k:'ground',lo:'BracketLeft',hi:'BracketRight',step:0.05,min:0,max:2,d:2},
  {k:'reach',lo:'Comma',hi:'Period',step:20,min:20,max:1600,d:0},
  {k:'placeMix',lo:'Semicolon',hi:'Slash',step:0.05,min:0,max:1,d:2},
  {k:'dlAt',lo:'KeyO',hi:'KeyN',step:0.1,min:0,max:1,d:1}, // 1: daylight at the sample point; 0: at the camera (with placeMix 0, the pre-v8 uniform veil). v11.34: was o-p, and p places the lab's creature, so with the readout open in the lab it did both. KeyO has no other use and KeyN none at all — every other letter is taken (the game's, or AU_TUNE's g-h j-k v-b)
  {k:'cau',lo:'KeyT',hi:'KeyY',step:0.1,min:0,max:4,d:1}, // the caustics' contrast (v11.35: 1 is the physical focusing, 0 none)
  {k:'shd',lo:'KeyU',hi:'KeyI',step:0.05,min:0,max:1,d:2}]; // the bodies' shadows' strength (v11.13; 0 is none)
// Camera tuner (v11.48): the field of view and the third-person arm, live, for the scale question — on a flat screen a wide field renders every
// animal at about half its true angular size, and the fix is a narrower field with a longer arm (the body keeps its framing, the far creature
// grows relative to it). Arrows and pgup-pgdn: every letter is taken. The bestiary's arrows stand down while the readout is open (zoo.js).
const CAM_TUNE=[{k:'fov',lo:'ArrowLeft',hi:'ArrowRight',step:2,min:30,max:110,d:0},{k:'fovFP',lo:'PageDown',hi:'PageUp',step:2,min:30,max:110,d:0},{k:'arm',lo:'ArrowDown',hi:'ArrowUp',step:0.5,min:-4,max:8,d:1}];
function camTune(code){if(code==='Backspace'){Object.assign(CAM_K,CAM_DEF);}else{const e=CAM_TUNE.find(e=>e.lo===code||e.hi===code);if(!e)return false;CAM_K[e.k]=clamp(CAM_K[e.k]+(code===e.hi?e.step:-e.step),e.min,e.max);}applyCam();return true;}
function camLine(){return 'cam  fov '+CAM_K.fov.toFixed(0)+'°  fovFP '+CAM_K.fovFP.toFixed(0)+'°  arm '+(CAM_K.arm>=0?'+':'')+CAM_K.arm.toFixed(1)+'m  ('+(camera.fov*2*Math.atan(Math.tan(camera.fov*Math.PI/360)*camera.aspect)*180/Math.PI/camera.fov).toFixed(0)+'° across)   (←→ fov  pgdn-pgup fovFP  ↓↑ arm)';}
function fogTune(code){
  if(code==='Backspace'){Object.assign(SEA_FOG,FOG_DEF);audioTune(code);camTune(code);}
  else{if(audioTune(code)||camTune(code)){statT=0;return;}const e=FOG_TUNE.find(e=>e.lo===code||e.hi===code);if(!e)return;SEA_FOG[e.k]=clamp(SEA_FOG[e.k]+(code===e.hi?e.step:-e.step),e.min,e.max);}
  applyFog(wasAbove===true);statT=0;
}
function fogLine(){return 'fog  '+FOG_TUNE.map(e=>e.k+' '+SEA_FOG[e.k].toFixed(e.d)).join('  ')+'   (1-2 3-4 5-6 7-8 9-0 -= [] ,. ;/ o-n t-y u-i  backspace resets)';}
function updateStats(dt){
  fpsEma+=(1/Math.max(dt,0.001)-fpsEma)*0.05;msEma+=(dt*1000-msEma)*0.05;physEma+=(physMs-physEma)*0.05;renderEma+=(renderMs-renderEma)*0.05;
  frameEma+=(frameMs-frameEma)*0.05;genEma+=(genMs-genEma)*0.05;if(frameMs>frameMax)frameMax=frameMs; // the worst frame since the last draw, below
  statT-=dt;if(statT>0||!showStats)return;statT=0.25;
  const fMax=frameMax;frameMax=0; // read and reset: the max belongs to the quarter second just gone, not to the session
  const r=renderer.info.render;
  statsEl.textContent=fpsEma.toFixed(0)+' fps  '+msEma.toFixed(1)+' ms  work '+frameEma.toFixed(1)+'/'+fMax.toFixed(1)+'ms'+(genEma>0.05?'  gen '+genEma.toFixed(1)+'ms':'')+(resK<1?'  res '+resK.toFixed(1):'')+'  draws '+r.calls+'  tris '+(r.triangles/1000).toFixed(0)+'k  cells '+visibleChunks+'/'+chunks.size+'  pools '+poolLine()+'  far '+visibleRegions+'/'+farBuilt+'  creatures '+visibleCreatures+'/'+creatures.length+'  phys '+physEma.toFixed(2)+'ms  render '+renderEma.toFixed(2)+'ms'+(SHS_P[1]>0?'  wshadow '+shsMs.toFixed(2)+'ms/'+shsN:'')+'  lights '+lightSources.length+(performance.memory?'  heap '+(performance.memory.usedJSHeapSize/1048576).toFixed(0)+'M':'')+'  '+Q.tier+'  '+(player.sub<0.5?(player.grounded?'strand':'air'):'sea')+'  '+player.pos.x.toFixed(0)+','+player.pos.y.toFixed(0)+','+player.pos.z.toFixed(0)+'  oxy '+oxyAt(player.pos.x,player.pos.y,player.pos.z).toFixed(2)+'  tide '+(TIDE>=0?'+':'')+TIDE.toFixed(1)+'m '+(tideRate(clockH)>0.02?'rising':tideRate(clockH)<-0.02?'falling':'slack')+' '+((clockH+SOLAR_H0)%DAY_H).toFixed(1)+'h  year '+yearPhase(clockH).toFixed(3)+(seasonAt(clockH)>0.3?' windy':seasonAt(clockH)<-0.3?' still':' between')+'  sun '+(Math.asin(SKY.sunAlt)*180/Math.PI).toFixed(0)+'°  moon '+(Math.asin(SKY.moonAlt)*180/Math.PI).toFixed(0)+'° '+(SKY.illum*100).toFixed(0)+'%  light '+SKY.skyL.toFixed(2)+(wasAbove===false?'/'+SKY.skyLw.toFixed(2):'')+(SKY.eye>1.005||SKY.eyeT>1.005?'  eye ×'+SKY.eye.toFixed(2)+(Math.abs(SKY.eyeT-SKY.eye)>0.05?'→'+SKY.eyeT.toFixed(2):''):'')+(DSP.g*DSP.hab>0.01?'  displays '+(DSP.g*DSP.hab).toFixed(2):'')+(MILKY_P[0]>0.01?'  milky '+MILKY_P[0].toFixed(2):'')+'  cloud '+SKY.cover.toFixed(2)+'  vis '+SKY.vis.toFixed(0)+' km'+(SKY.rainA>0.02?'  rain '+SKY.rainA.toFixed(2):'')+(SKY.windK<0.5?'  calm':'')+(SKY.eclL>0.02?'  eclipse '+SKY.eclL.toFixed(2):'')+(SKY.dawn>0.02?'  mist '+SKY.dawn.toFixed(2):'')+(SKY.pool>0.002?'  pool '+(SKY.pool/CFOG.pool.k).toFixed(2):'')+(FOG_CAP[3]>0.0005?'  in cloud':'')+'\n'+fogLine()+'\n'+audioLine()+'\n'+camLine()+'\n'+(mode==='play'?hungerLine()+'\n':'')+ecoLine()+holdLine(); // the stomach's line (player.js, v11.73)
}
// Every shader program compiled behind the fade instead of on first sight (v11.12): a sway program is ~90 ms, and the flicker's
// translucent material, the big creatures' far ghost, the sky (on the first breach) and the rain compiled mid-play. One tiny mesh per
// material, in the instanced form where the game uses it (the instanced programs are separate), compiled by renderer.compile with the
// scene's lights and fog, then removed. Run at the end of the first frame, so the programs that frame compiled anyway cost nothing
// more and only the rest are paid for (~400 ms, under the black fade). A failure only means the old stalls.
// The boot's warm-up (v11.189): the same meshes, compiled one at a time behind the loading page — each with only the scene's lights beside it (three's
// compile walks every material in the scene, drawn or not), so a frame takes a program or two and the page's line moves between them; then the scene once (the
// sky, the surface and its occluder, the dome, the snow); then, only with the world's shadows on (FX.statics, off by default), the depth programs of its
// map — a dozen and more programs no default game draws, compiled at every boot to v11.188 (switched on later, they compile at its first pass).
// warmShaders() is all of it at once (bootFinish: a game, the bestiary or a test before the boot was through).
function warmPrep(){const g=new THREE.Group(),g2=new THREE.Group(),geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,0,0.01,0,0.01,0,0],3));geo.setAttribute('normal',new THREE.Float32BufferAttribute([0,1,0,0,1,0,0,1,0],3));geo.setAttribute('color',new THREE.Float32BufferAttribute([1,1,1,1,1,1,1,1,1],3));
  for(const m of [MAT,MAT_HIT,MATBIG,MATLM,MATT,TERRAIN_MAT,MAT_HI,shM,new THREE.MeshLambertMaterial({color:0x06080a,transparent:true,opacity:0.9})])g.add(new THREE.Mesh(geo,m)); // the last is the ink cloud's; shM the light shafts' (v11.13)
  const c=new THREE.Color(1,1,1);
  const pulled=new Set(vpullMats.values()); // v11.187: a pulled species' geometry has no colour attribute, and three keys the program by it (vertexAlphas), so its warm mesh has none either
  const flora=[MATV,MATVD,MATG,MATB,MATR,MATW,MATS,MATSC,MATM,MATGL,MATTR,MATWD].filter(m=>!vpullMats.has(m)); // a pulled one's own program is never drawn in the world (every species of it draws its copy): not compiled, nor its depth program
  for(const m of [MAT,MATROCK,MATROCKF,MATROCKB,MATSHELL,MATFAR,MATTRF,GLOW,...flora,...pulled]){const ig=geo.clone();if(pulled.has(m))ig.deleteAttribute('color');ig.setAttribute('aVar',new THREE.InstancedBufferAttribute(new Float32Array(1),1));ig.setAttribute('aDip',new THREE.InstancedBufferAttribute(new Float32Array(1),1));ig.setAttribute('aCur',new THREE.InstancedBufferAttribute(new Float32Array(2),2));ig.setAttribute('aTide',new THREE.InstancedBufferAttribute(new Float32Array(2),2));const im=new THREE.InstancedMesh(ig,m,1);im.setColorAt(0,c);g.add(im);}
  g2.add(new THREE.Mesh(geo,new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide})),new THREE.Points(geo,new THREE.PointsMaterial({transparent:true,depthWrite:false}))); // v11.187: the splash's ring and drops (player.js), made at the first breach
  g.position.set(0,-1e5,0);g2.position.set(0,-1e5,0);let est=0;scene.traverse(o=>{if(o.material&&!Array.isArray(o.material))est++;}); // the scene's own objects, a guess at the steps the rest will take (most share programs already made)
  return {g:g,items:g.children.concat(g2.children),i:0,k:0,est:Math.min(est,24),rest:false,more:[],passes:false,hz:false,depth:false};}
function warmOne(sc,cam,o){const kids=sc.children,L=[],en=renderer.shadowMap.enabled;sc.traverse(x=>{if(x.isLight)L.push(x);});sc.children=L.concat([o]);renderer.shadowMap.enabled=FX.shadows&&LIGHT_K[1]>0; // the shadow map as play has it (scene.js updateShadow sets it every frame, after this): three keys every program by it
  try{renderer.compile(sc,cam);}finally{sc.children=kids;renderer.shadowMap.enabled=en;}} // one object's programs, with only its scene's lights beside it (three's compile walks every material in the scene, drawn or not)
function warmStep(W){ // the next program (or the depth pass); true when there is nothing left
  W.k++;try{
    if(W.i<W.items.length){warmOne(scene,camera,W.items[W.i++]);return false;}
    if(!W.rest){W.rest=true;W.more=[];renderer.shadowMap.enabled=FX.shadows&&LIGHT_K[1]>0;const seen=new Set(),pr=m=>{const p=renderer.properties.get(m);return p&&(p.currentProgram||p.program);}; // then the scene's own, one object a step: the sky, the surface and its occluder, the dome, the snow, what has streamed in
      if(renderer.properties)scene.traverse(o=>{const m=o.material;if(o!==W.g&&m&&!Array.isArray(m)&&!seen.has(m)&&!pr(m)){seen.add(m);W.more.push(o);}});return false;}
    if(W.more.length){warmOne(scene,camera,W.more.shift());return false;}
    if(!W.passes){W.passes=true;if(CLDP.on)renderer.compile(CLDP.scene,CLDP.cam);return false;} // the clouds' pass (v11.188)
    if(!W.hz){W.hz=true;if(wasAbove===true&&!hzTried){hzTried=true;try{hzSeaBuild();hzSetup();}catch(e){console.warn('the horizon tier could not build: '+e.message);}} // the horizon pass's scene, built here as renderFrame would at the first frame in air
      if(hzSea){const sp=sky.parent,tm=new THREE.Mesh(W.g.children[0].geometry,HZ_TERRAIN_MAT);hzScene.add(sky);hzScene.add(tm);renderer.compile(hzScene,hzCam);hzScene.remove(tm);if(sp)sp.add(sky);}return false;} // its programs with its own lights and fog: the sky in it, the sea disc, the members' land (tm: the first member is built later, hzStep)
    if(!W.depth){W.depth=true;if(FX.statics){scene.add(W.g);W.g.traverse(o=>{if(o.isMesh){shadowCaster(o,o.material);o.castShadow=true;o.frustumCulled=false;}});shadowFrame();updateShadowS(0,true);scene.remove(W.g);}} // the depth programs of the world's shadow map (v11.30), one forced pass, only when it is on
  }catch(e){console.warn('shader warm-up: '+e.message);W.i=W.items.length;W.rest=W.passes=W.hz=W.depth=true;W.more=[];}
  return W.i>=W.items.length&&W.rest&&!W.more.length&&W.passes&&W.hz&&W.depth;}
function warmShaders(W){W=W||warmPrep();while(!warmStep(W));} // all of it now
// ---------- the boot (v11.189, analysis_loading.md; the person, 20 Nov 2026) ----------
// "black screen, tethys + loading, then the scene loads without the tethys name moving"; "the slower the card, the longer you extend the black simple loading
// screen". The page is black with the title in its menu place before any of this runs (shell.html #boot; the build runs the game after the first paint),
// and the line under the title slides while the scripts' own work holds the page. Then, a stage a frame at a time, nothing drawn: `store` — the profile and the
// slots read, and the last slot's world opened under the camera note (bootSlot: its clock, its ledger, its falls; the cells wait for it, so what spawns is
// that world's); `load` — the warm-up a program or two a frame (BOOT.warmMs) while the cells round the camera and the far regions stream with BOOT.budget a
// frame, the line showing both; `settle` — the world drawn behind the black (the first draws upload and compile what is left) until a frame comes in under
// BOOT.settleMs or BOOT.settleMax has passed; then the black fades (3 s, #boot.off) and the column rises MENU_RISE later. A slow machine is longer at every
// stage and so longer in the black, by its own work, not a guess. Anything that leaves the menu first (a game, the bestiary, a test's choose) finishes it at
// once (bootFinish): the warm-up whole, the black gone.
const BOOT={stage:'store',done:false,W:null,world0:0,t0:0,n:0,settleT:0,storeMax:4000,warmMs:20,budget:24,settleMs:50,settleMax:3000,settleN:4,bootEl:document.getElementById('boot'),lineEl:document.getElementById('bootline')};
function bootLine(f){const L=BOOT.lineEl;if(!L)return;L.classList.remove('wait');const i=L.firstElementChild;if(i)i.style.transform='scaleX('+clamp(f,0,1).toFixed(3)+')';}
function bootSlot(){if(BOOT.done||BOOT.stage!=='store')return; // the store's answer (main.js profileLoad → menuRefresh), or its timeout
  if(mode==='menu'){const note=camRead(),rec=note&&note.id?saveList.find(r=>r.id===note.id):null;if(rec&&!rec.over&&rec.pop){try{slotWorld(rec);menu.worldOf=rec.id;}catch(e){console.warn('the last slot\'s world: '+e.message);}}}
  BOOT.stage='load';BOOT.W=warmPrep();BOOT.world0=0;bootLine(0);}
function bootTick(iv){if(BOOT.done)return;if(mode!=='menu'){bootFinish();return;}
  const now=performance.now();if(!BOOT.t0)BOOT.t0=now;
  if(BOOT.stage==='store'){if(now-BOOT.t0>BOOT.storeMax)bootSlot();return;} // a store that never answers: the boot goes on without the slot
  if(BOOT.stage==='load'){const w0=performance.now();if(BOOT.W){do{if(warmStep(BOOT.W)){BOOT.W=null;break;}}while(performance.now()-w0<BOOT.warmMs);}
    const pend=cellsPending()+farPending();BOOT.world0=Math.max(BOOT.world0,pend);const W=BOOT.W,wf=W?W.k/(W.k+(W.items.length-W.i)+(W.rest?W.more.length:W.est+1)+(W.passes?0:1)+(W.hz?0:1)+(W.depth?0:1)):1,gf=BOOT.world0?1-pend/BOOT.world0:1;bootLine(0.5*wf+0.5*gf);
    if(!W&&pend===0){BOOT.stage='settle';BOOT.settleT=now;BOOT.n=0;bootLine(1);if(BOOT.lineEl)BOOT.lineEl.classList.add('settle');}return;}
  if(BOOT.stage==='settle'){BOOT.n++;if(BOOT.n>=BOOT.settleN&&(iv<BOOT.settleMs||now-BOOT.settleT>BOOT.settleMax))bootIn();}}
function bootIn(){BOOT.done=true;BOOT.stage='done';bootLine(1);if(BOOT.bootEl)BOOT.bootEl.classList.add('off');if(BOOT.lineEl)BOOT.lineEl.classList.add('off');menuRise(MENU_RISE);} // the black fades, the title stays, the column rises after
function bootFinish(){if(BOOT.done)return;warmShaders(BOOT.W||undefined);BOOT.W=null;BOOT.done=true;BOOT.stage='done';if(BOOT.bootEl){BOOT.bootEl.style.transition='none';BOOT.bootEl.classList.add('off');}if(BOOT.lineEl)BOOT.lineEl.classList.add('off');}
window.bootFinish=bootFinish;window.__boot=BOOT; // the benches (test/gpu.js): the boot's warm-up counted with the boot, as to v11.188
// the profile and the slots (save.js), then the menu's creator word and its list, then the boot opens the last slot's world under the menu's camera (v11.189,
// bootSlot; to v11.188 the menu's 3×3 cells were built here, before the first frame, the page frozen meanwhile). After BOOT: a store that answers at once
// (the tests' memory one) calls bootSlot from here
profileLoad(()=>{if(HASH_FLAGS.indexOf('creator')>=0)grantCreator();menuRefresh(bootSlot);}); // the profile and the slots (save.js), then the menu's creator word and its list; #creator grants the creator
let last=performance.now();
function loop(now){
  requestAnimationFrame(loop);chemoStep(4); // the basins' flood a slice a frame until it is built (v11.113, world.js)
  const f0=performance.now(),iv=now-last,dt=clamp(iv/1000,0,0.05);last=now;t+=dt;timeU.value=t;FOG_TC[0]=t;
  clockH=t*CLOCK_RATE;TIDE=tideAt(clockH);tideU.value=TIDE;tideRU.value=tideRate(clockH);tintU.value.x=TIDE;FOG_W[0]=TIDE; // the clock and the tide (world.js), once a frame, before anything reads the water level (FOG_W[0]: the fog chunk's copy, v11.32 — the daylight curve measures depth from it)
  readTouch();bootTick(iv); // the boot's stages (v11.189), before the streaming they gate
  // the streaming gets what the rest of the last frame left of Q.target (v11.12): a 3 ms frame leaves 4.5 for the cells, a 6 ms frame 2 (the floor)
  const g0=performance.now(),bl=!BOOT.done&&BOOT.stage==='load';if(BOOT.done||BOOT.stage!=='store')manageChunks(bl?BOOT.budget:Math.min(Q.budgetMs,Math.max(2,Q.target-(frameMs-genMs))));manageFar(bl?BOOT.budget:Q.farMs);genMs=performance.now()-g0;bloomTick(); // v11.189: the cells wait for the boot's slot (its ledger is what they spawn from); behind the loading page both stream with BOOT.budget (to v11.188 the far layer had 14 ms through the menu's first 2.4 s) // the plankton's clock (far.js, v11.81): the front by the tide's amplitude, the storm's pulse // the far layer streams in behind the fade (black until ~2.2 s), then in the gaps (v11.12: 14 ms all through the menu had its creatures stuttering for the first second)
  updateMenu(dt);updateZoo(dt);updateLab(dt);if(mode==='play')updatePlayer(dt); // updateMenu (v11.47.1): the column's rise and the idle fade
  const p0=performance.now();
  updateSchools(dt);updateCreatures(dt);if(mode==='play')finishPlayer(dt,bodies); // bodies, contact, arms, then the camera
  updateEggs(dt);updateSheds(dt);ecoTick(dt);updateSave(dt); // the clutches hatch; the cast carapaces rot (v11.66); the world's ledger (v11.26): the model every few seconds, the births owed; the autosave clock (save.js, v11.47)
  updatePads(dt);updateDisturbers(dt);if(FX.snow)updatePlankton(dt);physMs=performance.now()-p0;
  updateWounds(dt);updateStates(dt);updateInks(dt);updateSplashes(dt);updateBlood(dt);updateDebris(dt);updateSparks(dt);updateFlush(dt); // the wounds bleed and the blood drifts (combat.js, v11.31)
  updateAtmosphere(dt);updateSurface();
  camera.updateMatrixWorld();updateFogCamera();cullChunks(dt);cullFar();assignLights();updateShadow();updateShadowS(dt);updateAudio(dt); // the shadow map's box and casters (v11.23): after everything has moved; the sound (v11.14) last, with the camera where it is
  updateCompass(dt);updateFX();updateWMap(dt);updateSpark(dt); // the sparkle (line.js, v11.69): the handover's mark, over everything // no health bar since v11.55: the body shows the damage (COMBAT.md §5)
  if(BOOT.done||BOOT.stage==='settle'){const r0=performance.now();renderFrame();renderMs=performance.now()-r0;}else renderMs=0; // v11.64: the horizon pass first when the camera is in air (horizon.js), then the world; v11.189: nothing drawn behind the loading page until the world is there
  updateStats(dt);frameMs=performance.now()-f0;
  {const k=FX.autoRes?resStep(RES_S,iv,frameMs):1;if(k!==resK){resK=k;renderer.setPixelRatio(RES_PR*k);vigSize();}} // the resolution that holds the frame (v11.188, scene.js RES): applied for the next frame
}
// tp(x,z,y) from the browser's console (v11.60.2): the player put at x,z (east +, south +), y above the ground there (10 by default; a depth
// is a negative absolute y), still, the camera with it, the cells round it loaded now. The bundle is one IIFE, so this is the one way in
// from tethys.html; the map's stat line gives x,z in km under the mouse. A dev tool, not a feature: nothing saves it, nothing reads it.
window.tp=function(x,z,y){if(mode!=='play'||!player.clade)return 'start a game first';const cx=worldX(x,25),cz=worldZ(z,25),held=cx!==x||cz!==z;x=cx;z=cz;const g=groundAt(x,z),py=y===undefined?g+10:y<0?y:g+y;player.pos.set(x,py,z);player.vel.set(0,0,0);player.hold=null;camera.position.copy(player.pos).add(V3(-6,3,-6));cellsAround();return (held?'outside the world (x '+Math.round(WX0)+'…'+Math.round(WX1)+', z '+Math.round(WZ0)+'…'+Math.round(WZ1)+'): held at ':'at ')+x.toFixed(0)+', '+z.toFixed(0)+', y '+py.toFixed(0)+' (ground '+g.toFixed(0)+')';};
// skip(days) from the console (v11.76): the world clock moved on by that many game days, in play — for looking at what a clock brings (a moult, a hatch, a
// brood's losses) without waiting for it; the ledger's model catches up over its next ticks (ecology.js ECO_MAX_STEP), the broods lazily (line.js
// broodCatchUp). A dev tool beside tp: nothing saves it, nothing reads it
// the next milky sea and the next dark dusk (v11.161), as the skip() that reaches them from now
window.milky=function(){for(let d=0.25;d<400;d+=0.25){const h=clockH+d*DAY_H;if(smooth(MILKY.on[0],MILKY.on[1],milkyPulse(h))>0.5){const lh=((h+SOLAR_H0)%DAY_H+DAY_H)%DAY_H,to=((30-lh)%DAY_H+DAY_H)%DAY_H;return 'skip('+(d+to/DAY_H).toFixed(2)+') — a milky sea over the rich gold (the fed flanks) that night, strength '+smooth(MILKY.on[0],MILKY.on[1],milkyPulse(h)).toFixed(2);}}return 'none in 400 days';};
window.dusk=function(){return 'the dusk displays are struck (v11.162.1)';}; // their finder, kept for the rethink:
function duskNext(){const s=V3(),m=V3();for(let k=1;k<4000;k++){const h=clockH+k*0.1;skyDir(sunHA(h),s,sunDec(h));skyDir(moonHA(h),m);const il=0.5*(1-s.dot(m)),ml=smooth(-0.05,0.25,m.y)*Math.pow(il,1.8);if(dspGate(s.y,ml)>0.9)return 'skip('+(k*0.1/DAY_H).toFixed(3)+') — a dark dusk; the displays are over shallow sheltered floor (the lagoon, the reef flats)';}return 'none soon';};
window.skip=function(days){if(mode!=='play'||!player.clade)return 'start a game first';eyeSnap=true;hazeSnap=true;t+=(+days||0)*DAY_S;clockH=t*CLOCK_RATE;TIDE=tideAt(clockH);return 'day '+(clockH/DAY_H).toFixed(2);};
// falls() from the console (v11.99, DEEP §4): the nearest carcass falls — kind, how far, what stage, and the tp() to go and look. A dev tool beside tp() and skip()
window.falls=function(n){const t=nowD(),p=player.pos;return FALLS.map(F=>{const s=fallState(F,t);return {kind:F.kind,m:Math.round(Math.hypot(F.x-p.x,F.z-p.z)),depth:Math.round(-F.y),stage:s.flesh>0?'flesh '+(100*s.flesh/F.m0).toFixed(0)+'%':s.mat>0.3?'bones, mats':s.rich>0.3?'bones, enriched':'bones',tp:'tp('+Math.round(F.x)+','+Math.round(F.z)+',8)'};}).sort((a,b)=>a.m-b.m).slice(0,n||8);};
window.palls=function(n){const p=player.pos;return creatures.filter(c=>c.kind==='pall'&&c.alive&&!c.gone).map(c=>({m:Math.round(c.pos.distanceTo(p)),depth:Math.round(-c.pos.y),lure:+c.lumL.toFixed(2),dark:c.lumD>0?Math.round(c.lumD)+' s':'',tp:'tp('+Math.round(c.pos.x)+','+Math.round(c.pos.z)+','+Math.round(c.pos.y+10)+')'})).sort((a,b)=>a.m-b.m).slice(0,n||8);}; // v11.163: the loaded palls, nearest first — their depth, the lure's level (fx.js PHO), dark after a cloud, and a tp() to 10 m over each
requestAnimationFrame(loop);
