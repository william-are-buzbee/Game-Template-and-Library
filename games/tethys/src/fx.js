// fx.js — the body's effects (v11.53, POLISH.md pass B): one pooled point system for what the water does when a body does something —
// silt kicked off the floor, bubbles from the seeps, scraps at a bite — and the emitters that feed it. The blood (combat.js) stays its own
// cloud in the clade's colour; the breach's foam and its bubble puff stay in player.js splash (v11.46). Everything here is a term in the
// numbers the game already has: a body on the floor, a jet near the sand, a strike out of it, a bite, a seep. Nothing glows but the night's lights at the end (v11.161: carcasses, the dusk displays; the wake of v11.160 struck v11.162). The points are
// the snow's kind (atmosphere.js pm: squares, lit like the snow and by the player's light, alpha by distance), one draw for all of it.
const FX_N=Q.tier==='low'?320:720,fxP=new Float64Array(FX_N*3),fxPG=new Float32Array(FX_N*3),fxV=new Float32Array(FX_N*3),fxC=new Float32Array(FX_N*3),fxS=new Float32Array(FX_N*2),fxL=new Float32Array(FX_N),fxA=new Float32Array(FX_N),fxK=new Uint8Array(FX_N),fxW=new Float32Array(FX_N);let fxNext=0,fxLive=0;
const FXK=[{life:[3,4.5],fall:0.15,size:[0.7,1.3],grow:0.25,alpha:0.7},{life:[6,9],fall:-0.9,size:[0.35,0.6],grow:0.06,alpha:0.6},{life:[2.5,3.5],fall:0.3,size:[0.5,0.9],grow:0,alpha:0.85}]; // life (s), fall (m/s; bubbles rise), size × the material's, growth (size/s), alpha
const fxG=new THREE.BufferGeometry();fxG.setAttribute('position',new THREE.BufferAttribute(fxPG,3));/* v11.113: fxP the simulation in doubles, fxPG the GPU's copy against the render origin (atmosphere.js, the snow) */fxG.setAttribute('color',new THREE.BufferAttribute(fxC,3));fxG.setAttribute('aSz',new THREE.BufferAttribute(fxS,2));
const fxM=new THREE.PointsMaterial({color:0xcfe6ee,size:0.24,transparent:true,opacity:0.8,depthWrite:false,vertexColors:true});
fxM.onBeforeCompile=function(sh){sh.uniforms.uPL=plU;sh.uniforms.uPLc=plCU;let n=0; // the snow's patch (atmosphere.js pm): a size and an alpha per point, the player's light
  sh.vertexShader=sh.vertexShader.replace('uniform float size;',()=>{n++;return 'attribute vec2 aSz;uniform vec4 uPL;varying float vA;varying float vL;uniform float size;';})
    .replace('gl_PointSize = size;',()=>{n++;return 'gl_PointSize=size*aSz.x;vA=aSz.y*smoothstep(0.4,1.5,-mvPosition.z);{vec3 dl=transformed-uPL.xyz;vL=uPL.w/(0.5+dot(dl,dl));}';})
    .replace('#include <logdepthbuf_vertex>',()=>{n++;return 'gl_PointSize=min(gl_PointSize,36.0);\n#include <logdepthbuf_vertex>';});
  sh.fragmentShader=sh.fragmentShader.replace('uniform vec3 diffuse;',()=>{n++;return 'varying float vA;varying float vL;uniform vec3 uPLc;uniform vec3 diffuse;';})
    .replace('#include <color_fragment>',()=>{n++;return 'diffuseColor.rgb=vColor.rgb*(diffuse+uPLc*vL);diffuseColor.a*=vA;';});
  if(n!==5)console.warn('fx: points chunks not as expected ('+n+' of 5); the debris draws uniform');};
fxM.customProgramCacheKey=function(){return 'fxpts';};
const fxPts=new THREE.Points(fxG,fxM);fxPts.frustumCulled=false;fxPts.visible=false;scene.add(fxPts);
for(let i=0;i<FX_N;i++){fxS[i*2+1]=0;fxP[i*3+1]=-1e4;}
// n points of a kind at p, thrown at up to sp m/s, in a colour (an [r,g,b]); a point is never emitted in the air or under the floor
function fxEmit(kind,x,y,z,n,sp,col){if(!FX.debris)return;if(y>waveH(x,z)-0.1)return;const K=FXK[kind];n=Math.min(FX_N,Math.round(n));
  for(let k=0;k<n;k++){const i=fxNext;fxNext=(fxNext+1)%FX_N;const i3=i*3;
    fxP[i3]=x+rnd(-0.25,0.25);fxP[i3+1]=y+rnd(-0.15,0.15);fxP[i3+2]=z+rnd(-0.25,0.25);
    fxV[i3]=rnd(-1,1)*sp;fxV[i3+1]=rnd(-0.3,1)*sp*0.6;fxV[i3+2]=rnd(-1,1)*sp;
    const j=rnd(0.8,1.15);fxC[i3]=col[0]*j;fxC[i3+1]=col[1]*j;fxC[i3+2]=col[2]*j;
    fxL[i]=rnd(K.life[0],K.life[1]);fxA[i]=fxL[i];fxS[i*2]=rnd(K.size[0],K.size[1]);fxS[i*2+1]=K.alpha;fxK[i]=kind;fxW[i]=rnd(0,TAU);}
  fxLive=FX_N;fxPts.visible=true;}
// silt in the floor's own colour at a point (terrainColor, chunks.js, through sample()): sand, mud, rust, whatever the ground is there
const FX_TC={c:[0,0,0],setXYZ(i,r,g,b){this.c[0]=r;this.c[1]=g;this.c[2]=b;}},FX_S={};
function fxSilt(x,y,z,n,sp){const s=sample(x,z,FX_S);terrainColor(x,z,s.h,fixF(s.f,0),0,FX_TC,0);const c=FX_TC.c;fxEmit(0,x,Math.max(y,s.h+0.15),z,n,sp===undefined?0.6:sp,[c[0]*1.15+0.05,c[1]*1.15+0.05,c[2]*1.1+0.05]);}
function fxBubbles(x,y,z,n){fxEmit(1,x,y,z,n,0.08,[0.86,0.93,0.95]);}
const FX_BODY=[0.5,0.5,0.5];
function bodyColor(o,out){ // a random vertex colour off the body's first coloured mesh: the prey's own flesh, whatever the coat
  let m=null;o.g.traverse(q=>{if(!m&&q.isMesh&&q.geometry&&q.geometry.attributes.color)m=q;});if(!m)return out;const a=m.geometry.attributes.color.array,k=Math.floor(Math.random()*(a.length/3))*3;out[0]=a[k];out[1]=a[k+1];out[2]=a[k+2];return out;}
function fxScraps(o,at,n){if(!o||!o.g)return;const c=bodyColor(o,FX_BODY);fxEmit(2,at.x,at.y,at.z,n,1.4,[c[0]*0.9,c[1]*0.9,c[2]*0.9]);}
// the emitters that run on their own clock: a body moving on the floor (the player's flop and walk, the crawlers, anything grounded and
// going), a jet fired within reach of the sand, a trap striking out of it, the seeps' bubbles (chunks.js keeps a cell's seep tops)
const FX_R=70,FX_SEEP_R=110; // the radius round the camera the emitters watch; the seeps'
function updateFXEmit(dt){
  if(!FX.debris)return;const P=player,cam=camera.position;
  if(mode==='play'&&!P.dead&&P.g){const sub=P.sub||0;
    if(P.grounded&&sub>0.5){const spd=P.spd||0;P.fxAcc=(P.fxAcc||0)+spd*3.5*dt;if(spd>0.6&&P.fxAcc>=1){const n=Math.floor(P.fxAcc);P.fxAcc-=n;fxSilt(P.pos.x,P.pos.y-0.9,P.pos.z,n,0.3+spd*0.08);}}
    if(P.flopT>0.65&&!P.fxFlop){P.fxFlop=true;if(sub>0.5)fxSilt(P.pos.x,P.pos.y-0.9,P.pos.z,14,0.9);}else if(P.flopT<=0)P.fxFlop=false;
    if(P.jetT>0.45&&!P.fxJet){P.fxJet=true;const gh=P.pos.y-groundAt(P.pos.x,P.pos.z);if(gh<2.6+P.clade.size*0.3){T4.set(0,0,-1).applyQuaternion(P.g.quaternion);fxSilt(P.pos.x+T4.x*1.5,P.pos.y-gh*0.6,P.pos.z+T4.z*1.5,10,1.1);}}else if(P.jetT<0.4)P.fxJet=false;}
  for(const c of creatures){if(!c.alive||!c.g.visible)continue;const dx=c.pos.x-cam.x,dz=c.pos.z-cam.z;if(dx*dx+dz*dz>FX_R*FX_R)continue;const d=c.def;
    if(c.grounded&&c.carried===false){const spd=c.vel.length();c.fxAcc=(c.fxAcc||0)+spd*2.5*dt*Math.min(2,0.6+d.size*0.25);if(spd>0.4&&c.fxAcc>=1){const n=Math.floor(c.fxAcc);c.fxAcc-=n;fxSilt(c.pos.x,c.pos.y-d.size*0.3,c.pos.z,n,0.25+spd*0.08);}}
    if(d.role==='trap'){if(c.st.strike&&!c.fxStruck){c.fxStruck=true;fxSilt(c.pos.x,c.pos.y-d.size*0.2,c.pos.z,8+d.size*2,0.8);}else if(!c.st.strike)c.fxStruck=false;}}
  for(const ch of chunks.values()){if(!ch.seeps||!ch.seeps.length)continue;const dx=ch.cx-cam.x,dz=ch.cz-cam.z;if(dx*dx+dz*dz>(FX_SEEP_R+CELL)*(FX_SEEP_R+CELL))continue; // the cell within reach, then each seep on its own
    for(const s of ch.seeps){const ex=s.x-cam.x,ez=s.z-cam.z;if(ex*ex+ez*ez>FX_SEEP_R*FX_SEEP_R)continue;s.t=(s.t||0)-dt;if(s.t<=0){s.t=rnd(0.35,0.8);fxBubbles(s.x,s.y,s.z,1);}}}
}
function updateDebris(dt){
  updateFXEmit(dt);
  if(!fxLive){fxPts.visible=false;return;}
  fxM.color.copy(pm.color); // the light on the snow is the light on the debris
  let live=0;const kf=1-Math.exp(-3*dt),ks=Math.exp(-1.2*dt);
  for(let i=0;i<FX_N;i++){if(fxS[i*2+1]<=0)continue;const i3=i*3;fxA[i]-=dt;if(fxA[i]<=0){fxS[i*2+1]=0;fxP[i3+1]=-1e4;continue;}
    live++;const k=fxK[i],K=FXK[k],x=fxP[i3],y=fxP[i3+1],z=fxP[i3+2];flowAt(x,y,z,HV);
    const wob=k===1?Math.sin(fxA[i]*5+fxW[i])*0.12:0;
    fxV[i3]=(fxV[i3]+(HV.x+CURV.x+wob-fxV[i3])*kf)*ks;fxV[i3+1]=(fxV[i3+1]+(HV.y+CURV.y-K.fall-fxV[i3+1])*kf)*ks;fxV[i3+2]=(fxV[i3+2]+(HV.z+CURV.z-wob*0.7-fxV[i3+2])*kf)*ks;
    let ny=y+fxV[i3+1]*dt;
    if(k===1&&ny>=waveH(x,z)-0.06){fxS[i*2+1]=0;fxP[i3+1]=-1e4;continue;} // a bubble ends at the water
    if(k===0){const g=groundAt(x,z)+0.05;if(ny<g){ny=g;fxV[i3+1]=0;}} // silt settles on the floor
    fxP[i3]=x+fxV[i3]*dt;fxP[i3+1]=ny;fxP[i3+2]=z+fxV[i3+2]*dt;
    const f=fxA[i]/fxL[i];fxS[i*2]+=dt*K.grow;fxS[i*2+1]=K.alpha*Math.min(1,f*3)*(k===2?0.7+0.3*Math.sin(fxA[i]*18+fxW[i]):1);} // a scrap tumbles: its size flickers
  fxLive=live;{const ox=ORIGIN.x,oz=ORIGIN.z;for(let i=0;i<FX_N;i++){fxPG[i*3]=fxP[i*3]-ox;fxPG[i*3+1]=fxP[i*3+1];fxPG[i*3+2]=fxP[i*3+2]-oz;}fxPts.position.set(ox,0,oz);}fxG.attributes.position.needsUpdate=true;fxG.attributes.aSz.needsUpdate=true;fxG.attributes.color.needsUpdate=true;
}
function fxStats(){let n=0,nan=0,k=[0,0,0];for(let i=0;i<FX_N;i++){if(fxS[i*2+1]<=0)continue;n++;k[fxK[i]]++;const i3=i*3;if(!isFinite(fxP[i3]+fxP[i3+1]+fxP[i3+2]+fxV[i3]+fxV[i3+1]+fxV[i3+2]))nan++;}return {live:n,nan:nan,silt:k[0],bubbles:k[1],scraps:k[2]};} // the tests
// ---------- the flush (POLISH 24): a flinch of pallor on a bitten body for FLUSH_T, off by default (the person, 9 Sep: faint, easy to strike) ----------
const FLUSH_T=0.15,flushes=[];
function flushBody(o){if(!FX.flush||!o||!o.g)return;for(const f of flushes)if(f.o===o){f.t=FLUSH_T;return;}const ms=[];o.g.traverse(m=>{if(m.isMesh&&m.material!==MAT_HIT&&(m.material===MAT||m.material===MATBIG)){ms.push([m,m.material]);m.material=MAT_HIT;}});if(ms.length)flushes.push({o:o,ms:ms,t:FLUSH_T});}
function updateFlush(dt){for(let i=flushes.length-1;i>=0;i--){const f=flushes[i];f.t-=dt;if(f.t<=0){for(const [m,m0] of f.ms)if(m.material===MAT_HIT)m.material=m0;flushes.splice(i,1);}}}
// ---------- the secondary motion (POLISH 19–21): squash and stretch, banking, the stun shown ----------
// After the body's own anim: the frame (the hull and everything on it) scaled along +z by 1+s and across by 1−s/2, s from the acceleration
// (a jetter lengthens on the squeeze, a striker into the lunge, a braking fish bulges) and the strike or the player's bite; rolled about +z
// into a turn by the yaw rate and the speed (a fish leans in) and, stunned, listed to one side while it sinks (creatures_ai.js: the stun's
// drift). A rigged body (arms, tails) rolls less (bankRig) and its chains' rest positions turn with it, below. worldShapes reads g's scale,
// never the frame's, so contact is untouched. Runs after the anim and before stepRigs, so the rest it turns is this frame's.
const POSE_K={sq:0.02,sqMax:0.14,strike:0.12,snap:0.15,bank:0.09,bankMax:0.6,bankRig:0.35,stunRoll:1.0,jerk:2.0}; // s per m/s² of acceleration and its cap; the strike's and the bite's stretch; roll per (rad/s × m/s) and its cap; the stun's list; the flinch's spin
function bodyPose(o,dt,yaw){
  const b=o.b;if(!b||!b.frame||!(dt>1e-4))return;const spd=o.spd!==undefined?o.spd:o.vel.length(),acc=(spd-(o.lastSpd||0))/dt;o.lastSpd=spd;
  let dy=o.lastYaw===undefined?0:yaw-o.lastYaw;o.lastYaw=yaw;if(dy>Math.PI)dy-=TAU;else if(dy<-Math.PI)dy+=TAU;const rate=clamp(dy/dt,-6,6);
  // the body's turn and its acceleration, kept on the body for the next frame's anim (v11.80.1): a part that is rigid geometry in a group — the combs —
  // cannot lag the way a chain does, so its builder swings it at its root by these instead. Eased, or a part would jitter with the frame's own noise
  o.turnV=(o.turnV||0)+(rate-(o.turnV||0))*(1-Math.exp(-8*dt));o.accV=(o.accV||0)+(acc-(o.accV||0))*(1-Math.exp(-6*dt));
  const strike=(o.st&&o.st.strike)||(o===player&&o.hold)?1:0;
  const sqT=clamp(acc*POSE_K.sq,-0.1,POSE_K.sqMax)+strike*POSE_K.strike+(o.snapT>0?POSE_K.snap:0);
  o.sq=(o.sq||0)+(sqT-(o.sq||0))*(1-Math.exp(-9*dt));
  const rigged=!!(b.rigs&&b.rigs.length),cap=rigged?POSE_K.bankRig:POSE_K.bankMax;let rollT=clamp(-POSE_K.bank*rate*spd,-cap,cap)+(o.rollBias||0); // rollBias (v11.78): a walker's lean into the side slope (player.js)
  if(o.stun>0)rollT=POSE_K.stunRoll*(o.stunSide||1)*(rigged?0.5:1);
  if(o.spinV){o.roll=wrapA((o.roll||0)+o.spinV*dt);o.rollV=0;} // the roll (v11.93, combat.js holderWork SPIN): a chain body with a hold spins on its axis, the frame with it; the held is carried round in combat.js
  else{o.rollV=(o.rollV||0)*Math.exp(-3*dt);o.roll=(o.roll||0)+(rollT-(o.roll||0))*(1-Math.exp(-4*dt))+o.rollV*dt;}
  const s=o.sq;b.frame.scale.set(1-s*0.5,1-s*0.5,1+s);b.frame.rotation.z=o.roll;
  // a rigged body: its chains' rest positions (rewritten by the anim each frame, then turned by the frame's yaw for the rigs that ride it — creatures_spec.js
  // compile) turned by the roll too, so the arms and the tail lean with the hull and their skins (world chains, physics.js rigSkin) meet the rolled body
  if(rigged&&o.roll!==0){const cs=Math.cos(o.roll),sn=Math.sin(o.roll);for(const rig of b.rigs){if(!rig.ride)continue;for(const c of rig.chains){const R=c.restL;for(let k=0;k<=c.n;k++){const x=R[k*3],y=R[k*3+1];R[k*3]=x*cs-y*sn;R[k*3+1]=x*sn+y*cs;}}}}
}
// ---------- at a wound (combat.js wound): the flinch (23), the flush (24), the debris (26) ----------
function hitFx(o,by,at,dmg){
  if(!o||!at||!o.g)return;const from=by&&by.pos?by.pos:null;
  if(PHO_K[o.kind])phoCloud(o,from); /* v11.163: a bitten pall leaves its cloud (PHO) */T4.copy(at);if(from)T4.sub(from);else T4.set(srnd(-1,1),srnd(-0.3,0.3),srnd(-1,1));if(T4.lengthSq()<1e-4)T4.set(0,0,1);T4.normalize();
  const k=clamp(0.25+dmg*0.02,0.25,0.8); // the flinch: the chain points shoved along the bite, the tips most — the constraint pass does the rest (physics.js simChain)
  if(o.b&&o.b.rigs)for(const rig of o.b.rigs)for(const c of rig.chains){const Pp=c.pts,n=c.n;for(let i=1;i<=n;i++){const w=k*i/n;Pp[i*3]+=T4.x*w;Pp[i*3+1]+=T4.y*w;Pp[i*3+2]+=T4.z*w;}}
  o.rollV=(o.rollV||0)+srnd(-1,1)*POSE_K.jerk*clamp(dmg*0.06,0.3,1); // the spin, damped over a second (bodyPose)
  flushBody(o);
  if(at.y-groundAt(at.x,at.z)<2.2)fxSilt(at.x,at.y,at.z,8,0.6);fxScraps(o,at,6+Math.min(10,dmg*0.3));
}
// ---------- the sparks (v11.160, POLISH 15, PLANKTON §8: the bioluminescence) ----------
// STRUCK v11.162 as a wake (the person: "bin this idea … purely as a function of you moving", to come back with other bioluminescent things): what
// follows describes the wake as built v11.160–160.1; its sources are no longer called. The pool, its soft look and its drawing are the carcasses' and
// the dusk displays' (v11.161), each glow its own colour since v11.162 (skC).
// The one glow the rules allow (PLANET Hooks: "only as events … dinoflagellates firing in a wake"): the flashers (world.js FLASH) fire where the water is
// sheared hard, and a spark is a point of their blue-green light for its moment. Four things keep it a believable thing rather than a lamp (the person,
// 16 Nov 2026: "is a bioluminescent wake believable?" — yes, on these four, and they took them):
//   - the stock (flashC): bright only where the flashers are many — faint in island water, little in the gyre, a sheet on a flank days after a storm;
//   - the clock, not the light (SPK.night, on the sun's altitude): the cells' capacity is a circadian rhythm — a dark noon or a shower by day fires nothing;
//   - the shear (SPK.v0..v1, a body's speed through the water): a grazing school leaves a few sparks, a sprint or a hunter's charge a line;
//   - fatigue (SPK.tire, SPK.rest): a cell that has flashed is spent for a while, so water swum through a moment ago is dimmer on the second pass. The
//     table is a hash of SPK.vox voxels in the water's own frame (the current at the camera integrated, as the snow drifts).
// The sources: the player and every moving creature within SPK.R of the camera (v11.160.1; to v11.160 FLOW's five nearest) over its shear shell
// and along the path it covered this frame; a wound (hitFx: a struggle lights the water round it); and the breaking water — a probe of the snow's
// bubble points (atmosphere.js pk 3: the breakers, the whitecaps, the rain on the surface), so the surf and a shower at night spark round the camera;
// v11.160.1: the current's own shear round the camera, and the breakers' glow on the surface itself (atmosphere.js uSpk), to the horizon. A lit body
// lights what is round it (SK_LIGHT) and is seen further by a hunter (creatures_ai.js litK; the person: "light is light").
// Drawn additive with the water's extinction only (an additive thing takes no veil — DESIGN, the shafts' rule) times the eye (FOG_SKE w, v11.159), so
// moonlight washes them out as it does on Earth and the moonless fortnight is theirs.
const SPK={v0:1.0,v1:6.0,rate:250,aMax:3,life:[0.6,1.4],rise:0.05,size:[0.8,1.4],vox:1,tire:0.1,rest:75,surf:0.5,probe:64,burst:40,col:[0.30,0.80,1.0],K:0.35,night:[0.12,-0.08],cap:260,R:110,cur:[0.25,1.0,90],litRef:150,see:1.5,lightK:1.4,lightD:9,surfK:0.9,g:0,gS:0,nightK:0,n:0};
// v0, v1: the speed through the water (m/s) at which a body's shear starts to fire the cells and at which it fires them all (the schools swim 1.5–2.7, the
// hunters 5–11, the player 4–8 at the top); rate: sparks a second per m² of flow radius at full shear and full light; aMax: the flow radius counted at most
// (m: a big slow body is not a sheet); life (s: one cell flashes ~0.1 s; a sheared patch keeps firing as its eddies turn); rise (s); size × uSize; vox (m);
// tire: the capacity one spark spends; rest: its recovery (s, real); surf: the chance a probed bubble point fires; probe: the snow's points tried a frame;
// burst: a wound's sparks at full light; col, K: the light (~480 nm) and a spark's strength; night: the sun's altitude (sin) over which the capacity comes up
// at dusk; cap: sparks at most a frame. v11.160.1 (the person on v11.160: "you don't really see the bioluminescence anywhere at all except when you're
// moving … it just kinda looks like blue dots"): R, every moving body within it of the camera sparks, not the five nearest; cur, the current's own shear
// (smooth(cur[0], cur[1]) m/s at the camera) twinkling the water round it at cur[2] a second at full light; litRef, the sparks a second that make a body
// fully lit (c.lit, player.lit: what a hunter sees — see, the share its eyes reach further for a lit body, creatures_ai.js litK); lightK, lightD: the
// wake's own light on what is round it (a source in the light pool, scene.js) at full lit; surfK: the breakers' glow (atmosphere.js, the surface's uSpk). The state: g the stock's light at the player, gS at the camera's surface, nightK the clock's gate, n the sparks made (the tests).
const SK_N=Q.sparks,skP=new Float64Array(SK_N*3),skPG=new Float32Array(SK_N*3),skV=new Float32Array(SK_N*3),skA=new Float32Array(SK_N),skL=new Float32Array(SK_N),skPk=new Float32Array(SK_N),skG=new Float32Array(SK_N),skS=new Float32Array(SK_N);let skNext=0,skLive=0;const skC=new Float32Array(SK_N*3); // skC (v11.162): each glow's colour
const SK_TN=4096,skTK=new Int32Array(SK_TN),skTD=new Float32Array(SK_TN),skTT=new Float32Array(SK_TN),skOff=[0,0],skB=[0,0,0,0]; // the fatigue's table (a voxel's key, its spent share, when), the water's drift, a texel
const skGeo=new THREE.BufferGeometry();skGeo.setAttribute('position',new THREE.BufferAttribute(skPG,3));skGeo.setAttribute('aG',new THREE.BufferAttribute(skG,1));skGeo.setAttribute('aS',new THREE.BufferAttribute(skS,1));skGeo.setAttribute('aC',new THREE.BufferAttribute(skC,3));
const skU={uCol:{value:new THREE.Color(SPK.col[0],SPK.col[1],SPK.col[2])},uK:{value:SPK.K},uScale:{value:360},uSize:{value:0.42},uFogP:{value:FOG_PS},uFogD:{value:SEA_FOG.dens},uSkE:{value:FOG_SKE}};
const skM=new THREE.ShaderMaterial({uniforms:skU,transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending,
  vertexShader:'attribute float aG;attribute float aS;attribute vec3 aC;uniform float uScale;uniform float uSize;varying float vG;varying float vD;varying vec3 vC;\nvoid main(){vC=aC;vec4 mv=modelViewMatrix*vec4(position,1.0);vD=length(mv.xyz);vG=aG*smoothstep(0.3,1.5,-mv.z);gl_PointSize=min(uSize*aS*uScale/max(-mv.z,0.1),48.0);gl_Position=projectionMatrix*mv;}',
  fragmentShader:'uniform vec3 uCol;uniform float uK;uniform vec4 uFogP;uniform float uFogD;uniform vec4 uSkE;varying float vG;varying float vD;varying vec3 vC;\nvoid main(){float d=vD;float tn=exp(-uFogD*uFogD*d*d);float ex=mix(exp(-uFogP.x*d),tn,uFogP.y)'+FOG_CUT_GLSL+';vec2 q=gl_PointCoord*2.0-1.0;float r2=dot(q,q),h=max(0.0,1.0-r2);float g=exp(-r2*9.0)+0.3*h*h;gl_FragColor=vec4(vC*(uK*vG*ex*g*uSkE.w),1.0);}'}); // vC (v11.162): its own colour — a light keeps its colour as the eye drains the rest (a bright point still reaches the cones) // soft (v11.160.1, the person: "soft glows please"): a bright core and a halo — the light scattered in the water round a flash — that is 0 at the quad's edge, so no square shows; overlapping halos read as a glowing cloud. The shafts' extinction (atmosphere.js shM), the eye's gain by hand: a ShaderMaterial misses the fog chunk's
const skPts=new THREE.Points(skGeo,skM);skPts.frustumCulled=false;skPts.visible=false;scene.add(skPts);
// the share of the cells still able to flash in the water at x,y,z (1 rested, 0 spent), spending `use` of it
function skTire(x,y,z,use){const ix=Math.floor((x-skOff[0])/SPK.vox),iy=Math.floor(y/SPK.vox),iz=Math.floor((z-skOff[1])/SPK.vox),h=(Math.imul(ix,73856093)^Math.imul(iy,19349663)^Math.imul(iz,83492791))|0,i=(h>>>0)&(SK_TN-1);
  const d=skTK[i]===h?skTD[i]*Math.exp(-(t-skTT[i])/SPK.rest):0;if(use>0){skTK[i]=h;skTD[i]=Math.min(1,d+use);skTT[i]=t;}return 1-d;}
function skEmit(x,y,z,vx,vy,vz,pk,life,col,sz){const i=skNext;skNext=(skNext+1)%SK_N;const i3=i*3;{const C=col||SPK.col;skC[i3]=C[0];skC[i3+1]=C[1];skC[i3+2]=C[2];}skP[i3]=x;skP[i3+1]=y;skP[i3+2]=z;skV[i3]=vx;skV[i3+1]=vy;skV[i3+2]=vz;skA[i]=0;skL[i]=life;skPk[i]=pk;skS[i]=rnd(SPK.size[0],SPK.size[1])*(sz||1);skG[i]=0;skLive=SK_N;SPK.n++;}
// the stock's light at a point (0..1), by the clock's gate
function skLight(x,y,z){wmBloom(x,z,skB);return flashK(flashC(skB,skB[3],TIDE-y))*SPK.nightK;}
// a struggle at a wound (hitFx): a burst round it, k its strength (~0.5–1.5)
function sparkBurst(x,y,z,k){if(SPK.nightK<0.01||y>TIDE-0.3)return;const n=Math.min(SPK.cap,Math.round(SPK.burst*skLight(x,y,z)*k));
  for(let m=0;m<n;m++){const a=Math.random()*TAU,u=Math.random()*2-1,s=Math.sqrt(1-u*u),r=0.3+Math.random()*1.2,px=x+s*Math.cos(a)*r,py=Math.min(y+u*r,TIDE-0.2),pz=z+s*Math.sin(a)*r;
    if(Math.random()>=skTire(px,py,pz,SPK.tire))continue;skEmit(px,py,pz,s*Math.cos(a)*0.8,u*0.8,s*Math.sin(a)*0.8,0.7+0.3*Math.random(),rnd(SPK.life[0],SPK.life[1]));}}
// a body's sparks this frame: o the body (player or creature), x,y,z its middle, ux,uy,uz its velocity, a its flow radius; returns how many were made
function skBody(o,x,y,z,ux,uy,uz,a,dt,budget){const U=Math.sqrt(ux*ux+uy*uy+uz*uz),ex=smooth(SPK.v0,SPK.v1,U);if(ex<=0||y>TIDE-0.3||budget<=0)return 0;
  const aa=Math.min(a,SPK.aMax);let n=Math.floor(SPK.rate*skLight(x,y,z)*ex*aa*aa*dt+Math.random());n=Math.min(n,budget);if(n<=0)return 0; // stochastic rounding: no accumulator on the body
  const iu=1/Math.max(U,1e-3),dx=ux*iu,dy=uy*iu,dz=uz*iu;let made=0;
  for(let m=0;m<n;m++){let ox=Math.random()*2-1,oy=Math.random()*2-1,oz=Math.random()*2-1;const ol=Math.sqrt(ox*ox+oy*oy+oz*oz)||1;ox/=ol;oy/=ol;oz/=ol;
    const al=ox*dx+oy*dy+oz*dz;if(al>0&&Math.random()<0.7){ox-=2*al*dx;oy-=2*al*dy;oz-=2*al*dz;}
    const r=aa*(0.6+Math.random()),bk=U*dt*Math.random(),px=x+ox*r-dx*bk,py=y+oy*r-dy*bk,pz=z+oz*r-dz*bk;
    if(py>TIDE-0.2||Math.random()>=skTire(px,py,pz,SPK.tire))continue;
    flowAt(px,py,pz,HV);skEmit(px,py,pz,HV.x*0.6,HV.y*0.6,HV.z*0.6,0.5+0.5*ex,rnd(SPK.life[0],SPK.life[1]));made++;}
  return made;}
function updateSparks(dt){
  // v11.162 (the person, 16 Nov 2026: "bin this idea of bioluminescence purely as a function of you moving … with the intention of bringing it back in
  // once we have other bioluminescent things"; a school in the shallows was not lit by it, and the sparks read as the marine snow): the wake is struck —
  // the bodies, the current, the breakers, the wake's light and a lit body's being seen. skBody and sparkBurst stay above as its kit, uncalled; the pool
  // lives on for the carcasses and the dusk displays.
  skOff[0]+=CURV.x*dt;skOff[1]+=CURV.z*dt;
  updateNightLights(dt); // v11.161: the carcasses, the dusk displays, the milky sea (below)
  if(!skLive){skPts.visible=false;return;}
  // the live sparks: drift with what they were thrown with and the current; rise in SPK.rise, fade over their life
  let live=0;const kd=Math.exp(-2.5*dt);
  for(let i=0;i<SK_N;i++){if(skL[i]<=0)continue;const i3=i*3;skA[i]+=dt;const a=skA[i],L=skL[i];if(a>=L){skL[i]=0;skG[i]=0;continue;}live++;
    skV[i3]*=kd;skV[i3+1]*=kd;skV[i3+2]*=kd;skP[i3]+=(skV[i3]+CURV.x)*dt;skP[i3+1]+=skV[i3+1]*dt;skP[i3+2]+=(skV[i3+2]+CURV.z)*dt;const u=1-a/L;skG[i]=skPk[i]*Math.min(1,a/SPK.rise)*u*u;}
  skLive=live;skPts.visible=live>0;if(!live)return;
  {const ox=ORIGIN.x,oz=ORIGIN.z;for(let i=0;i<SK_N;i++){skPG[i*3]=skP[i*3]-ox;skPG[i*3+1]=skP[i*3+1];skPG[i*3+2]=skP[i*3+2]-oz;}skPts.position.set(ox,0,oz);}
  skGeo.attributes.position.needsUpdate=true;skGeo.attributes.aG.needsUpdate=true;skGeo.attributes.aS.needsUpdate=true;skGeo.attributes.aC.needsUpdate=true;skU.uScale.value=(renderer.domElement&&renderer.domElement.height||720)*0.5; // three's own points scale: half the drawing buffer's height
}

// ---------- the night's other lights (v11.161; the person, 16 Nov 2026: the dusk displays, glowing carcasses and milky seas, yes) ----------
// Lights that need no stir, each with its reason — never a lamp, never a glowing plant (PLANET; the person: agreed).
// Glowing carcasses (BACT): luminous bacteria live in most animals' guts and in the water; in a dead body they spread through the flesh and, dense,
// switch their light on together (quorum sensing) — dark for the first hours, brightest while the flesh is rich, fading as it is stripped. The
// likely payoff: a glowing carcass (or pellet) is eaten, which carries them into a new gut. So it is seen from further by what eats it (creatures_ai.js
// findCarcass, c.glow). The person asked "it would be from filter feeders, no?" — no: any body's own gut flora, nothing climbs the food chain (PLANKTON §8).
// The glow is steady: soft sparks that hang on the body (the sparks' pool, long and still) and a source in the light pool on the nearest bright ones —
// shown only where the water round it is dark enough to see it by (BACT.dark on the light there: by day in the shallows nothing would).
const BACT={col:[0.35,1.0,0.72],on:[0.15,0.5],K:1.0,rate:30,life:[1.6,3.2],dark:[0.35,0.06],R:120,lights:2,lightK:1.1,lightD:8}; // on: game days after death over which the quorum lights it; K: its strength at full flesh; rate: glow points a second per m of body; life (s); dark: the light at its depth (skyLw × daylight) from which it starts to show and is full; R: the camera's reach; lights: pool sources it may hold; lightK, lightD: theirs
const BACT_L=[];for(let i=0;i<BACT.lights;i++){const s={x:0,y:-1e5,z:0,color:0x6fe0c8,intensity:0,distance:BACT.lightD,d:0};BACT_L.push(s);lightSources.push(s);}
// how bright a carcass's bacteria are (0..1): the quorum by its age (days), the flesh left (a share of the body)
function bactGlow(ageD,frac){return BACT.K*smooth(BACT.on[0],BACT.on[1],ageD)*Math.sqrt(clamp(frac,0,1));}
function bactSee(L){return smooth(BACT.dark[0],BACT.dark[1],L);}
// The dusk displays (DSP) — STRUCK v11.162.1 (the person, 16 Nov 2026: "the dusk stuff coming out of the ground is odd looking, it comes up in a straight
// line and its little blue circles in a game with square features. I think for now it should be left out, and instead it should be considered in a different
// way, like a creature that simply glows"): DSP.on false; the code below is kept as a kit for that rethink. As built v11.161–162: Earth's sea fireflies — ostracods, millimetre crustaceans in a hinged shell — court over shallow reef and seagrass in the
// hour after a dark sunset: a male swims up spitting pulses of luminous mucus, a dotted string of blue lights rising a metre or two that hangs for a
// second or two and fades, and the others take up the beat, so the strings come in waves. Moonlight stops them. Here the displayers are tiny
// hingeshells by their trade (a hinged shell, PLANET's line; a background population, no bodies — the person to confirm), shown round the camera
// where the floor is shallow and sheltered, between DSP.alt's sun altitudes, as the moon allows.
const DSP={on:false,col:[0.28,0.52,1.0],alt:[-0.42,-0.36,-0.20,-0.15],moon:[0.12,0.4],floor:[-25,-12,-1.5,-0.6],expo:0.7,rate:12,slots:96,view:0.7,n:[6,14],gap:[0.18,0.32],step:[0.15,0.28],life:[1.6,2.6],R:26,beat:7,size:0.8,g:0,hab:0};
// alt: the sun's altitude (sin) — the displays from −25° (rising) to −9° (falling), ~0.75–2 h after sunset; moon: the moon's light (of full) over which they stop; floor: the
// floor's height (m) over which they live (full −12 to −1.5); expo: how much the surf's exposure takes off; rate: strings a second at full; slots: strings at once;
// view: the share of strings started in front of the eye (v11.162: 5 a second anywhere round it were a couple of dots at the frame's edge — the person
// could not be sure they saw any; Earth's fill the water with strings); size: a pulse's glow × the pool's; n: pulses in a string; gap: metres between pulses; step: seconds between them; life: a pulse's glow (s); R: the camera's reach (m); beat: the waves' period (s)
const DSP_V=V3();const DSP_S=[];for(let i=0;i<DSP.slots;i++)DSP_S.push({on:false,x:0,y:0,z:0,dx:0,dy:0,dz:0,k:0,n:0,gap:0,step:0,tt:0});let dspHabT=0;const DSP_F=new Float32Array(NF);
function dspGate(sunAlt,moonK){return smooth(DSP.alt[0],DSP.alt[1],sunAlt)*(1-smooth(DSP.alt[2],DSP.alt[3],sunAlt))*(1-smooth(DSP.moon[0],DSP.moon[1],moonK));}
function dspHab(h,expo){return smooth(DSP.floor[0],DSP.floor[1],h)*(1-smooth(DSP.floor[2],DSP.floor[3],h))*(1-DSP.expo*expo);}
function updateNightLights(dt){
  const K=SKY,cam=camera.position,on=FX.biolum;
  // the carcasses: glow by their quorum and flesh; the brightest near ones hold the pool's sources
  for(const s of BACT_L){s.y=-1e5;s.intensity=0;}
  let nl=0;
  for(const c of carcasses){c.glow=0;if(!on||c.gone||!c.dead||c.flesh<=0)continue;const F=c.fall,age=F?nowD()-F.t0:c.deadT/DAY_S,m0=F?F.m0:bioMass(c.def);
    c.glow=bactGlow(age,c.flesh/m0);if(c.glow<0.01)continue;const ex=c.pos.x-cam.x,ey=c.pos.y-cam.y,ez=c.pos.z-cam.z;if(ex*ex+ey*ey+ez*ez>BACT.R*BACT.R)continue;
    const vis=c.glow*bactSee(K.skyLw*daylightAt(c.pos.y));if(vis<0.01)continue;const sz=c.def.size;
    let n=Math.floor(BACT.rate*vis*sz*dt+Math.random());for(;n>0;n--){const u=Math.random()*2-1,a=Math.random()*TAU,r=sz*0.3*Math.sqrt(Math.random());skEmit(c.pos.x+Math.cos(a)*r+u*sz*0.35,Math.min(c.pos.y+(Math.random()-0.3)*sz*0.25,TIDE-0.15),c.pos.z+Math.sin(a)*r-u*sz*0.35,0,0.02,0,0.35+0.4*vis,rnd(BACT.life[0],BACT.life[1]),BACT.col);} // the bacteria's blue-green (~490 nm)
    if(nl<BACT.lights){const s=BACT_L[nl++];s.x=c.pos.x;s.y=c.pos.y+sz*0.6;s.z=c.pos.z;s.intensity=BACT.lightK*vis;s.distance=BACT.lightD+sz;}}
  // the dusk displays: the habitat at the camera every half second, the strings in their slots
  DSP.g=on&&DSP.on?dspGate(K.sunAlt,K.moonL/MOONL):0;dspHabT-=dt;if(DSP.g>0&&dspHabT<=0){dspHabT=0.5;const s=sample(cam.x,cam.z,DSP_F);DSP.hab=dspHab(s.h,s.f[FI.expo]);} // STRUCK v11.162.1: DSP.on false (above). v11.163: that version's comment had swallowed the habitat's update; restored, and only sampled while the displays could show
  const gk=DSP.g*DSP.hab;
  if(gk>0.01){const ph=(t/DSP.beat)%1,wave=0.3+1.6*Math.exp(-ph*ph*30)+1.6*Math.exp(-(1-ph)*(1-ph)*30);let n=Math.floor(DSP.rate*gk*wave*dt+Math.random()); // the waves: the strings come together on the beat
    DSP_V.set(0,0,-1).applyQuaternion(camera.quaternion);const fa=Math.atan2(DSP_V.z,DSP_V.x);
    for(const S of DSP_S){if(n<=0)break;if(S.on)continue;const a=Math.random()<DSP.view?fa+rnd(-1,1):Math.random()*TAU,r=4+(DSP.R-4)*Math.sqrt(Math.random()),x=cam.x+Math.cos(a)*r,z=cam.z+Math.sin(a)*r,g=groundAt(x,z);if(g>TIDE-1.5)continue;
      const up=Math.random()<0.75,ta=Math.random()*TAU,tl=up?0.15:0.95;S.on=true;S.x=x;S.y=Math.min(g+rnd(0.3,2.2),TIDE-1.2);S.z=z;S.dx=Math.cos(ta)*tl;S.dy=up?1:rnd(-0.1,0.2);S.dz=Math.sin(ta)*tl; // most rise; a quarter run along the floor
      {const l=Math.sqrt(S.dx*S.dx+S.dy*S.dy+S.dz*S.dz);S.dx/=l;S.dy/=l;S.dz/=l;}S.k=0;S.n=Math.round(rnd(DSP.n[0],DSP.n[1]));S.gap=rnd(DSP.gap[0],DSP.gap[1]);S.step=rnd(DSP.step[0],DSP.step[1]);S.tt=0;n--;}}
  for(const S of DSP_S){if(!S.on)continue;S.tt-=dt;if(S.tt>0)continue;if(S.k>=S.n||DSP.g<=0.01){S.on=false;continue;}
    const y=S.y+S.dy*S.gap*S.k;if(y>TIDE-0.4){S.on=false;continue;}skEmit(S.x+S.dx*S.gap*S.k,y,S.z+S.dz*S.gap*S.k,0,0.01,0,1.2+0.3*Math.random(),rnd(DSP.life[0],DSP.life[1]),DSP.col,DSP.size);S.k++;S.tt=S.step;} // the sea fireflies' blue (~465 nm), brighter than a carcass's (v11.162: the person could not be sure they saw them)
  // the milky sea: the strength by the clock and the night into every fogged material (uSkF.w) and the far sea by the gold at the camera (uHzSea.w)
  {const m=on?MILKY.E*MILKY_P[0]*(1-K.dayK):0;FOG_SKF[3]=m;wmBloom(cam.x,cam.z,skB);HZ_SEA_U.value.w=m*milkyAt(skB[1])*1.6;}
  updatePho(dt,on); // v11.163: the pall's lights (below)
}

// ---------- the pall's lights (v11.163; BIOLUM.md §8; PLANET as revised 17 Nov 2026: a creature may make light from organs whose use can be named) ----------
// The pall is the deep line's net-holder in the oxygen minimum's core, and two of Earth's deep cephalopods give it its lights. Stauroteuthis, a webbed
// deep octopus, has light organs where its suckers were, along the arms inside the web: a lure that draws the copepods it eats into the web (Johnsen et al.
// 1999) — here a steady glow along each web arm while the pall fishes in the dark. The vampire squid (PLANET's precedent for the pall) lights its arm tips
// when touched, and when badly frightened leaves a cloud of glowing mucus and goes dark (Robison et al. 2003): here a flash at the tips on contact, and
// the cloud when held for PHO.holdT or bitten (hitFx), after which it stays dark for PHO.darkT and heads away from what held it.
// Drawn as the organs' own flat faces (the person, 17 Nov 2026: "Your creature pics are good"), boxes riding the arms' chains, additive with the water's
// extinction and the eye (as the glows: an emitter takes no veil); the cloud as low-poly blobs (three's dodecahedron, flat facets) brighter where they face
// the eye. The lure's gate (the person: "glowing palls too high up would not be adaptive"): a steady light pays the darker the water round it, so the
// web comes on as the planet's own light at its depth falls from 10^-dark[0] to 10^-dark[1] of the noon sun (world.js lightPhys) — by day dim above
// ~-550 over fed water and full by -600, full at any depth at night. Every pall lives at -500..-800 (OXY.core), so this only dims the core's top at noon.
// Not modelled: the lure's meal (the pall eats nothing, on paper or in play — BIOLUM §7.11).
const PHO={col:[0.30,0.62,1.0],web:[2,3,4],sz:[0.5,0.75],inset:0.25,K:[0.55,0.3,0.7,1.6],up:0.5,down:2,flash:[0.6,0.8],touch:1.0,holdT:0.5,darkT:90,dark:[8,10],flee:60,R:300,max:256,
  cl:{n:6,r:[1.6,3.4],grow:4,life:40,spread:1.2,K:0.32,slots:4,lightK:1.2,lightD:12,color:0x4f8fff}};
// col: the light (~470 nm, Stauroteuthis's); web: the chain points (of 0..n) that carry a web light, the tip (n) carries the other; sz: a face's size (m,
// web and tip, × the individual's k); inset: the faces sit this far (m) toward the body's axis, on the arm's oral side; K: the brightness of the web's and
// the tip's faces from the lure, then from a flash; up, down: the lure's easing (1/s); flash: its hold and decay (s); touch: the contact margin (m) past
// the body's capsule or an arm's point; holdT: seconds held before the cloud; darkT: seconds dark after it; dark: the gate (−log10 of the light at its
// depth, from none to full); flee: metres it heads away; R: the camera's reach (m); max: faces drawn. cl, the cloud: n blobs, their radius (m), grown
// over grow s, fading over life s (Robison: minutes), thrown at spread m/s, K their brightness, slots at once, and the light-pool source on the
// brightest (lightK, lightD m, color).
const PHO_K={pall:true}; // the kinds that carry these lights
const PHO_C=[],PHO_REST={}; // the lit creatures; a kind's lights at rest in its own frame ([x, y, z, tip] a light, from the rig's chains at spawn)
const PHO_SH={uniforms:null,vertexShader:'attribute float aGl;uniform float uSoft;varying float vG;varying float vD;varying float vF;\nvoid main(){mat4 im=mat4(1.0);\n#ifdef USE_INSTANCING\nim=instanceMatrix;\n#endif\nvec4 mv=modelViewMatrix*im*vec4(position,1.0);vD=length(mv.xyz);vG=aGl;vec3 n=normalize(mat3(modelViewMatrix)*mat3(im)*normal);vF=abs(dot(n,normalize(-mv.xyz)));gl_Position=projectionMatrix*mv;}',
  fragmentShader:'uniform vec3 uCol;uniform float uK;uniform float uSoft;uniform vec4 uFogP;uniform float uFogD;uniform vec4 uSkE;varying float vG;varying float vD;varying float vF;\nvoid main(){float d=vD;float tn=exp(-uFogD*uFogD*d*d);float ex=mix(exp(-uFogP.x*d),tn,uFogP.y)'+FOG_CUT_GLSL+';float f=mix(1.0,0.15+0.85*vF*vF,uSoft);gl_FragColor=vec4(uCol*(uK*vG*ex*f*uSkE.w),1.0);}'};
function phoMat(col,K,soft){return new THREE.ShaderMaterial({uniforms:{uCol:{value:new THREE.Color(col[0],col[1],col[2])},uK:{value:K},uSoft:{value:soft},uFogP:{value:FOG_PS},uFogD:{value:SEA_FOG.dens},uSkE:{value:FOG_SKE}},vertexShader:PHO_SH.vertexShader,fragmentShader:PHO_SH.fragmentShader,transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending});}
function phoIM(geo,mat,n){const g=geo,a=new THREE.InstancedBufferAttribute(new Float32Array(n),1);g.setAttribute('aGl',a);const im=new THREE.InstancedMesh(g,mat,n);cutFit(mat,g);im.count=0;im.frustumCulled=false;im.visible=false;scene.add(im);return im;}
const PHO_F=phoIM(new THREE.BoxGeometry(1,1,1),phoMat(PHO.col,1,0),PHO.max); // the faces
const PHO_B=phoIM(new THREE.DodecahedronGeometry(1,0),phoMat(PHO.col,PHO.cl.K,1),PHO.cl.slots*PHO.cl.n); // the clouds' blobs
const PHO_CL=[];for(let i=0;i<PHO.cl.slots;i++){const b=[];for(let j=0;j<PHO.cl.n;j++)b.push({x:0,y:0,z:0,vx:0,vy:0,vz:0,r:0,q:new THREE.Quaternion()});PHO_CL.push({on:false,a:0,b:b});}
const PHO_L={x:0,y:-1e5,z:0,color:PHO.cl.color,intensity:0,distance:PHO.cl.lightD,d:0};lightSources.push(PHO_L);
// The lure lights the water (v11.171; the person, 17 Nov 2026: "The lights of the bioluminescent creatures should actually emit a light. The way the own light
// does"). To v11.170 a pall's net was drawn — its faces bright — and lit nothing; a glowing carcass (BACT_L) and the cloud (PHO_L) held sources in the light
// pool. Now every lit pall in reach holds one too, at the middle of its net's faces: the lure's level and a flash (`lightK` × what its faces show, the tips' and
// the web's), its reach `lightD` × its size factor, the faces' blue. In the light pool (scene.js assignLights) it lights the bodies, the floor and the rock
// round it as the own light does, and, among the nearest, the water (the halo, v11.166). `slots` palls at once, the nearest to the camera.
const PHO_LURE={slots:3,lightK:1.0,lightD:14,color:0x4d9eff},PHO_LL=[],PHO_LC=[];
for(let i=0;i<PHO_LURE.slots;i++){const s={x:0,y:-1e5,z:0,color:PHO_LURE.color,intensity:0,distance:PHO_LURE.lightD,d:0};PHO_LL.push(s);lightSources.push(s);}
for(let i=0;i<16;i++)PHO_LC.push({x:0,y:0,z:0,I:0,R:0,d:0}); // this frame's lit nets (a pool, filled in order; nothing allocates a frame)
const PHO_M=new THREE.Matrix4(),PHO_V=V3(),PHO_S=V3(),PHO_P=V3();
// the web's gate at height y (0..1) by the sky now
function phoGate(y){const L=lightPhys(SKY.sunAlt,SKY.moonL/MOONL,y);return smooth(PHO.dark[0],PHO.dark[1],-Math.log10(Math.max(L,1e-30)));}
// a new lit creature (spawn, right after its rigs are posed at rest: their chains' points are in its own frame then)
function phoSpawn(c){const R=c.b.rigs;if(!R)return;if(!PHO_REST[c.kind]){const L=[];for(const r of R)for(const q of r.chains){const n=q.n;for(const k of PHO.web)if(k<n)L.push(q.pts[k*3],q.pts[k*3+1],q.pts[k*3+2],0);L.push(q.pts[n*3],q.pts[n*3+1],q.pts[n*3+2],1);}PHO_REST[c.kind]=L;}PHO_C.push(c);}
// the cloud: c's arm tips leave it, c goes dark and heads away from `from` (a position, or null)
function phoCloud(c,from){if(c.lumD>0||!FX.biolum)return;c.lumD=PHO.darkT;c.lumF=0;c.lumH=0;
  let S=PHO_CL[0];for(const s of PHO_CL)if(!s.on||s.a>S.a)S=s;S.on=true;S.a=0;const k=c.k||1;
  // where the tips are: their mean (the chains' own points once simulated, else at rest)
  let x=0,y=0,z=0,m=0;for(const r of c.b.rigs||[])for(const q of r.chains){if(q.fresh)continue;const n=q.n;x+=q.pts[n*3];y+=q.pts[n*3+1];z+=q.pts[n*3+2];m++;}
  if(m){x/=m;y/=m;z/=m;}else{PHO_V.set(0,0,1).applyQuaternion(c.g.quaternion);x=c.pos.x+PHO_V.x*4*k;y=c.pos.y+PHO_V.y*4*k;z=c.pos.z+PHO_V.z*4*k;}
  for(const b of S.b){b.x=x+rnd(-2,2)*k;b.y=Math.min(y+rnd(-2,2)*k,TIDE-1);b.z=z+rnd(-2,2)*k;const a=Math.random()*TAU,u=Math.random()*2-1,w=Math.sqrt(1-u*u);b.vx=w*Math.cos(a)*PHO.cl.spread;b.vy=u*PHO.cl.spread;b.vz=w*Math.sin(a)*PHO.cl.spread;b.r=rnd(PHO.cl.r[0],PHO.cl.r[1])*k;
    b.q.setFromAxisAngle(PHO_S.set(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5).normalize(),Math.random()*TAU);}
  if(from){PHO_V.set(c.pos.x-from.x,(c.pos.y-from.y)*0.3,c.pos.z-from.z);if(PHO_V.lengthSq()<1e-4)PHO_V.set(1,0,0);PHO_V.normalize();c.wander.copy(c.pos).addScaledVector(PHO_V,PHO.flee);c.wander.y=clamp(c.wander.y,OXY.core[1],OXY.core[0]);c.wanderT=30;}}
// the body's capsules and the arms' points against a point: the nearest surface distance (m)
function phoNear(c,p){let best=1e9;const W=c.shapesW;if(W)for(const w of W){const ex=w.bx-w.ax,ey=w.by-w.ay,ez=w.bz-w.az,l2=ex*ex+ey*ey+ez*ez;let tt=l2>1e-6?((p.x-w.ax)*ex+(p.y-w.ay)*ey+(p.z-w.az)*ez)/l2:0;tt=tt<0?0:tt>1?1:tt;
    const d=len3(p.x-w.ax-ex*tt,p.y-w.ay-ey*tt,p.z-w.az-ez*tt)-w.r;if(d<best)best=d;}
  for(const r of c.b.rigs||[])for(const q of r.chains){if(q.fresh)continue;const P=q.pts;for(let k=1;k<=q.n;k++){const d=len3(p.x-P[k*3],p.y-P[k*3+1],p.z-P[k*3+2]);if(d<best)best=d;}}
  return best;}
function updatePho(dt,on){
  const cam=camera.position,ox=ORIGIN.x,oz=ORIGIN.z,FA=PHO_F.geometry.attributes.aGl.array,BA=PHO_B.geometry.attributes.aGl.array;let nf=0,nl=0;
  for(let i=PHO_C.length-1;i>=0;i--){const c=PHO_C[i];if(c.gone||!c.alive){PHO_C[i]=PHO_C[PHO_C.length-1];PHO_C.pop();}}
  for(const c of PHO_C){
    // the state: dark after a cloud; held long enough, a cloud; touched, a flash; the lure toward its gate
    if(c.lumD>0)c.lumD=Math.max(0,c.lumD-dt);
    let held=null;for(const h of holds)if(h.b===c){held=h;break;}
    if(held){c.lumH+=dt;if(c.lumH>=PHO.holdT)phoCloud(c,held.a&&held.a.pos?held.a.pos:null);}else c.lumH=0;
    if(on&&c.lumD<=0&&!playerGone()&&c.g.visible&&player.pos.distanceTo(c.pos)<c.def.size*1.4&&phoNear(c,player.pos)<PHO.touch)c.lumF=1+PHO.flash[0]/PHO.flash[1]; // a touch: full for flash[0] s, then down over flash[1]
    else c.lumF=Math.max(0,c.lumF-dt/PHO.flash[1]);
    const tg=on&&c.lumD<=0?phoGate(c.pos.y):0;c.lumL+=(tg-c.lumL)*Math.min(1,dt*(tg>c.lumL?PHO.up:PHO.down));
    // drawn: within reach of the camera and in sight, the faces at the arms' points (simulated) or at rest in the body's frame (far, or not yet stepped)
    const fl=Math.min(1,c.lumF),lw=PHO.K[0]*c.lumL+PHO.K[2]*fl,lt=PHO.K[1]*c.lumL+PHO.K[3]*fl;
    if(lw<0.01&&lt<0.01||!c.g.visible)continue;const dx=c.pos.x-cam.x,dy=c.pos.y-cam.y,dz=c.pos.z-cam.z;if(dx*dx+dy*dy+dz*dz>PHO.R*PHO.R)continue;
    const k=c.k||1,L=PHO_REST[c.kind];if(!L)continue;c.g.updateMatrix();const e=c.g.matrix.elements;PHO_V.set(0,0,1).applyQuaternion(c.g.quaternion);const fx=PHO_V.x,fy=PHO_V.y,fz=PHO_V.z;
    const live=c.lod===0;let li=0,sx=0,sy=0,sz=0,sn=0;
    for(const r of c.b.rigs)for(const q of r.chains){const n=q.n,sim=live&&!q.fresh;
      for(let j=0;j<=n;j++){const tip=j===n;if(!tip&&PHO.web.indexOf(j)<0)continue;if(nf>=PHO.max)break;
        let px,py,pz;if(sim){px=q.pts[j*3];py=q.pts[j*3+1];pz=q.pts[j*3+2];}else{const lx=L[li*4],ly=L[li*4+1],lz=L[li*4+2];px=e[0]*lx+e[4]*ly+e[8]*lz+e[12];py=e[1]*lx+e[5]*ly+e[9]*lz+e[13];pz=e[2]*lx+e[6]*ly+e[10]*lz+e[14];}
        li++;
        {const ax=px-c.pos.x,ay=py-c.pos.y,az=pz-c.pos.z,al=ax*fx+ay*fy+az*fz,qx=ax-fx*al,qy=ay-fy*al,qz=az-fz*al,ql=len3(qx,qy,qz);if(ql>1e-3){const s=PHO.inset*k/ql;px-=qx*s;py-=qy*s;pz-=qz*s;}} // onto the oral side: toward the body's axis
        sx+=px;sy+=py;sz+=pz;sn++;
        const s=(tip?PHO.sz[1]:PHO.sz[0])*k;PHO_P.set(px-ox,py,pz-oz);PHO_S.set(s,s,s);PHO_M.compose(PHO_P,c.g.quaternion,PHO_S);PHO_F.setMatrixAt(nf,PHO_M);FA[nf]=tip?lt:lw;nf++;}}
    if(sn&&nl<PHO_LC.length){const L=PHO_LC[nl++];L.x=sx/sn;L.y=sy/sn;L.z=sz/sn;L.I=PHO_LURE.lightK*Math.max(lw,lt);L.R=PHO_LURE.lightD*k;L.d=dx*dx+dy*dy+dz*dz;}} // v11.171: the net's middle, a light candidate
  for(const s of PHO_LL){s.y=-1e5;s.intensity=0;} // the lures' lights (v11.171): the nearest lit nets to the camera hold the slots
  for(let a=0;a<PHO_LL.length&&a<nl;a++){let b=a;for(let j=a+1;j<nl;j++)if(PHO_LC[j].d<PHO_LC[b].d)b=j;if(b!==a){const t=PHO_LC[a];PHO_LC[a]=PHO_LC[b];PHO_LC[b]=t;}const L=PHO_LC[a],S=PHO_LL[a];S.x=L.x;S.y=L.y;S.z=L.z;S.intensity=on?L.I:0;S.distance=L.R;}
  PHO_F.count=nf;PHO_F.visible=nf>0;PHO_F.position.set(ox,0,oz);if(nf){PHO_F.instanceMatrix.needsUpdate=true;PHO_F.geometry.attributes.aGl.needsUpdate=true;}
  // the clouds: grow, drift with the current and what they were thrown with, fade; the brightest near one holds a light
  let nb=0,bl=0;PHO_L.y=-1e5;PHO_L.intensity=0;
  for(const S of PHO_CL){if(!S.on)continue;S.a+=dt;if(S.a>=PHO.cl.life){S.on=false;continue;}const u=1-S.a/PHO.cl.life,g=Math.min(1,S.a/0.4)*u*u,gr=0.3+0.7*Math.min(1,S.a/PHO.cl.grow),kd=Math.exp(-0.8*dt);let mx=0,my=0,mz=0;
    for(const b of S.b){b.vx*=kd;b.vy*=kd;b.vz*=kd;b.x+=(b.vx+CURV.x)*dt;b.y=Math.min(b.y+b.vy*dt,TIDE-1);b.z+=(b.vz+CURV.z)*dt;mx+=b.x;my+=b.y;mz+=b.z;
      if(!on||nb>=PHO_CL.length*PHO.cl.n)continue;PHO_P.set(b.x-ox,b.y,b.z-oz);const s=b.r*gr;PHO_S.set(s,s,s);PHO_M.compose(PHO_P,b.q,PHO_S);PHO_B.setMatrixAt(nb,PHO_M);BA[nb]=g;nb++;}
    const n=S.b.length;mx/=n;my/=n;mz/=n;const dd=Math.hypot(mx-cam.x,my-cam.y,mz-cam.z);if(on&&g>bl&&dd<PHO.R){bl=g;PHO_L.x=mx;PHO_L.y=my;PHO_L.z=mz;PHO_L.intensity=PHO.cl.lightK*g;}}
  PHO_B.count=nb;PHO_B.visible=nb>0;PHO_B.position.set(ox,0,oz);if(nb){PHO_B.instanceMatrix.needsUpdate=true;PHO_B.geometry.attributes.aGl.needsUpdate=true;}
}
