// fx.js — the body's effects (v11.53, POLISH.md pass B): one pooled point system for what the water does when a body does something —
// silt kicked off the floor, bubbles from the seeps, scraps at a bite — and the emitters that feed it. The blood (combat.js) stays its own
// cloud in the clade's colour; the breach's foam and its bubble puff stay in player.js splash (v11.46). Everything here is a term in the
// numbers the game already has: a body on the floor, a jet near the sand, a strike out of it, a bite, a seep. Nothing glows but the sparks (v11.160, at the end: the flashers firing where a body shears the water). The points are
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
    .replace('#include <color_fragment>',()=>{n++;return 'diffuseColor.rgb=vColor*(diffuse+uPLc*vL);diffuseColor.a*=vA;';});
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
  if(!o||!at||!o.g)return;const from=by&&by.pos?by.pos:null;T4.copy(at);if(from)T4.sub(from);else T4.set(rnd(-1,1),rnd(-0.3,0.3),rnd(-1,1));if(T4.lengthSq()<1e-4)T4.set(0,0,1);T4.normalize();
  const k=clamp(0.25+dmg*0.02,0.25,0.8); // the flinch: the chain points shoved along the bite, the tips most — the constraint pass does the rest (physics.js simChain)
  if(o.b&&o.b.rigs)for(const rig of o.b.rigs)for(const c of rig.chains){const Pp=c.pts,n=c.n;for(let i=1;i<=n;i++){const w=k*i/n;Pp[i*3]+=T4.x*w;Pp[i*3+1]+=T4.y*w;Pp[i*3+2]+=T4.z*w;}}
  o.rollV=(o.rollV||0)+rnd(-1,1)*POSE_K.jerk*clamp(dmg*0.06,0.3,1); // the spin, damped over a second (bodyPose)
  flushBody(o);
  if(at.y-groundAt(at.x,at.z)<2.2)fxSilt(at.x,at.y,at.z,8,0.6);fxScraps(o,at,6+Math.min(10,dmg*0.3));
  sparkBurst(at.x,at.y,at.z,clamp(0.5+dmg*0.03,0.5,1.5)); // at night the struggle lights the water round it (v11.160, the sparks below)
}
// ---------- the sparks (v11.160, POLISH 15, PLANKTON §8: the bioluminescence) ----------
// The one glow the rules allow (PLANET Hooks: "only as events … dinoflagellates firing in a wake"): the flashers (world.js FLASH) fire where the water is
// sheared hard, and a spark is a point of their blue-green light for its moment. Four things keep it a believable thing rather than a lamp (the person,
// 16 Nov 2026: "is a bioluminescent wake believable?" — yes, on these four, and they took them):
//   - the stock (flashC): bright only where the flashers are many — faint in island water, little in the gyre, a sheet on a flank days after a storm;
//   - the clock, not the light (SPK.night, on the sun's altitude): the cells' capacity is a circadian rhythm — a dark noon or a shower by day fires nothing;
//   - the shear (SPK.v0..v1, a body's speed through the water): a grazing school leaves a few sparks, a sprint or a hunter's charge a line;
//   - fatigue (SPK.tire, SPK.rest): a cell that has flashed is spent for a while, so water swum through a moment ago is dimmer on the second pass. The
//     table is a hash of SPK.vox voxels in the water's own frame (the current at the camera integrated, as the snow drifts).
// The sources: every body in FLOW (physics.js: the player and the five nearest moving creatures — the bodies the snow flows round) over its shear shell
// and along the path it covered this frame; a wound (hitFx: a struggle lights the water round it); and the breaking water — a probe of the snow's
// bubble points (atmosphere.js pk 3: the breakers, the whitecaps, the rain on the surface), so the surf and a shower at night spark round the camera.
// Drawn additive with the water's extinction only (an additive thing takes no veil — DESIGN, the shafts' rule) times the eye (FOG_SKE w, v11.159), so
// moonlight washes them out as it does on Earth and the moonless fortnight is theirs. Not yet: the hunters reading a lit wake (PLANKTON §8's cost).
const SPK={v0:1.0,v1:6.0,rate:250,aMax:3,life:[0.6,1.4],rise:0.05,size:[0.8,1.4],vox:1,tire:0.1,rest:75,surf:0.5,probe:64,burst:40,col:[0.30,0.80,1.0],K:0.4,night:[0.12,-0.08],cap:200,g:0,gS:0,nightK:0,n:0};
// v0, v1: the speed through the water (m/s) at which a body's shear starts to fire the cells and at which it fires them all (the schools swim 1.5–2.7, the
// hunters 5–11, the player 4–8 at the top); rate: sparks a second per m² of flow radius at full shear and full light; aMax: the flow radius counted at most
// (m: a big slow body is not a sheet); life (s: one cell flashes ~0.1 s; a sheared patch keeps firing as its eddies turn); rise (s); size × uSize; vox (m);
// tire: the capacity one spark spends; rest: its recovery (s, real); surf: the chance a probed bubble point fires; probe: the snow's points tried a frame;
// burst: a wound's sparks at full light; col, K: the light (~480 nm) and a spark's strength; night: the sun's altitude (sin) over which the capacity comes up
// at dusk; cap: sparks at most a frame. The state: g the stock's light at the player, gS at the camera's surface, nightK the clock's gate, n the sparks made (the tests).
const SK_N=Q.sparks,skP=new Float64Array(SK_N*3),skPG=new Float32Array(SK_N*3),skV=new Float32Array(SK_N*3),skA=new Float32Array(SK_N),skL=new Float32Array(SK_N),skPk=new Float32Array(SK_N),skG=new Float32Array(SK_N),skS=new Float32Array(SK_N);let skNext=0,skLive=0;
const SK_TN=4096,skTK=new Int32Array(SK_TN),skTD=new Float32Array(SK_TN),skTT=new Float32Array(SK_TN),skOff=[0,0],skB=[0,0,0,0],skAcc=new Float32Array(8); // the fatigue's table (a voxel's key, its spent share, when), the water's drift, a texel, each FLOW slot's fraction of a spark
const skGeo=new THREE.BufferGeometry();skGeo.setAttribute('position',new THREE.BufferAttribute(skPG,3));skGeo.setAttribute('aG',new THREE.BufferAttribute(skG,1));skGeo.setAttribute('aS',new THREE.BufferAttribute(skS,1));
const skU={uCol:{value:new THREE.Color(SPK.col[0],SPK.col[1],SPK.col[2])},uK:{value:SPK.K},uScale:{value:360},uSize:{value:0.14},uFogP:{value:FOG_PS},uFogD:{value:SEA_FOG.dens},uSkE:{value:FOG_SKE}};
const skM=new THREE.ShaderMaterial({uniforms:skU,transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending,
  vertexShader:'attribute float aG;attribute float aS;uniform float uScale;uniform float uSize;varying float vG;varying float vD;\nvoid main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vD=length(mv.xyz);vG=aG*smoothstep(0.3,1.2,-mv.z);gl_PointSize=min(uSize*aS*uScale/max(-mv.z,0.1),24.0);gl_Position=projectionMatrix*mv;}',
  fragmentShader:'uniform vec3 uCol;uniform float uK;uniform vec4 uFogP;uniform float uFogD;uniform vec4 uSkE;varying float vG;varying float vD;\nvoid main(){float d=vD;float tn=exp(-uFogD*uFogD*d*d);float ex=mix(exp(-uFogP.x*d),tn,uFogP.y)'+FOG_CUT_GLSL+';gl_FragColor=vec4(uCol*(uK*vG*ex*uSkE.w),1.0);}'}); // the shafts' extinction (atmosphere.js shM), the eye's gain by hand: a ShaderMaterial misses the fog chunk's
const skPts=new THREE.Points(skGeo,skM);skPts.frustumCulled=false;skPts.visible=false;scene.add(skPts);
// the share of the cells still able to flash in the water at x,y,z (1 rested, 0 spent), spending `use` of it
function skTire(x,y,z,use){const ix=Math.floor((x-skOff[0])/SPK.vox),iy=Math.floor(y/SPK.vox),iz=Math.floor((z-skOff[1])/SPK.vox),h=(Math.imul(ix,73856093)^Math.imul(iy,19349663)^Math.imul(iz,83492791))|0,i=(h>>>0)&(SK_TN-1);
  const d=skTK[i]===h?skTD[i]*Math.exp(-(t-skTT[i])/SPK.rest):0;if(use>0){skTK[i]=h;skTD[i]=Math.min(1,d+use);skTT[i]=t;}return 1-d;}
function skEmit(x,y,z,vx,vy,vz,pk,life){const i=skNext;skNext=(skNext+1)%SK_N;const i3=i*3;skP[i3]=x;skP[i3+1]=y;skP[i3+2]=z;skV[i3]=vx;skV[i3+1]=vy;skV[i3+2]=vz;skA[i]=0;skL[i]=life;skPk[i]=pk;skS[i]=rnd(SPK.size[0],SPK.size[1]);skG[i]=0;skLive=SK_N;SPK.n++;}
// the stock's light at a point (0..1), by the clock's gate
function skLight(x,y,z){wmBloom(x,z,skB);return flashK(flashC(skB,skB[3],TIDE-y))*SPK.nightK;}
// a struggle at a wound (hitFx): a burst round it, k its strength (~0.5–1.5)
function sparkBurst(x,y,z,k){if(SPK.nightK<0.01||y>TIDE-0.3)return;const n=Math.min(SPK.cap,Math.round(SPK.burst*skLight(x,y,z)*k));
  for(let m=0;m<n;m++){const a=Math.random()*TAU,u=Math.random()*2-1,s=Math.sqrt(1-u*u),r=0.3+Math.random()*1.2,px=x+s*Math.cos(a)*r,py=Math.min(y+u*r,TIDE-0.2),pz=z+s*Math.sin(a)*r;
    if(Math.random()>=skTire(px,py,pz,SPK.tire))continue;skEmit(px,py,pz,s*Math.cos(a)*0.8,u*0.8,s*Math.sin(a)*0.8,0.7+0.3*Math.random(),rnd(SPK.life[0],SPK.life[1]));}}
function updateSparks(dt){
  const cam=camera.position;SPK.nightK=FX.biolum?smooth(SPK.night[0],SPK.night[1],SKY.sunAlt):0;skOff[0]+=CURV.x*dt;skOff[1]+=CURV.z*dt;
  if(SPK.nightK>0.01){let budget=SPK.cap;
    wmBloom(cam.x,cam.z,skB);SPK.gS=flashK(flashC(skB,skB[3],0.5));SPK.g=mode==='play'&&!player.dead?flashK((wmBloom(player.pos.x,player.pos.z,skB),flashC(skB,skB[3],Math.max(0,TIDE-player.pos.y)))):SPK.gS;
    // the bodies: over the shear shell, most of it behind (the wake, not the bow), spread along the path covered this frame so a fast body leaves no gaps
    for(let bb=0;bb<flowN;bb++){const f=FLOW[bb],U=Math.sqrt(f.ux*f.ux+f.uy*f.uy+f.uz*f.uz),ex=smooth(SPK.v0,SPK.v1,U);if(ex<=0||f.y>TIDE-0.3||budget<=0){skAcc[bb]=0;continue;}
      const a=Math.min(f.a,SPK.aMax);skAcc[bb]+=SPK.rate*skLight(f.x,f.y,f.z)*ex*a*a*dt;let n=Math.floor(skAcc[bb]);skAcc[bb]-=n;n=Math.min(n,budget);budget-=n;
      const iu=1/Math.max(U,1e-3),dx=f.ux*iu,dy=f.uy*iu,dz=f.uz*iu;
      for(let m=0;m<n;m++){let ox=Math.random()*2-1,oy=Math.random()*2-1,oz=Math.random()*2-1;const ol=Math.sqrt(ox*ox+oy*oy+oz*oz)||1;ox/=ol;oy/=ol;oz/=ol;
        const al=ox*dx+oy*dy+oz*dz;if(al>0&&Math.random()<0.7){ox-=2*al*dx;oy-=2*al*dy;oz-=2*al*dz;}
        const r=a*(0.6+Math.random()),bk=U*dt*Math.random(),px=f.x+ox*r-dx*bk,py=f.y+oy*r-dy*bk,pz=f.z+oz*r-dz*bk;
        if(py>TIDE-0.2||Math.random()>=skTire(px,py,pz,SPK.tire))continue;
        flowAt(px,py,pz,HV);skEmit(px,py,pz,HV.x*0.6,HV.y*0.6,HV.z*0.6,0.5+0.5*ex,rnd(SPK.life[0],SPK.life[1]));}}
    // the breaking water: the snow's bubble points in the top 2 m (the breakers, the whitecaps, the rain); no fatigue — the sea keeps turning it over
    if(FX.snow&&SPK.gS>0.005){const p=SPK.surf*SPK.gS*SPK.nightK;for(let m=0;m<SPK.probe&&budget>0;m++){const i=Math.floor(Math.random()*PN_SN);if(pk[i]!==3)continue;const y=pp[i*3+1];if(TIDE-y>2||Math.random()>=p)continue;budget--;skEmit(pp[i*3]+rnd(-0.3,0.3),y,pp[i*3+2]+rnd(-0.3,0.3),0,0.1,0,0.4+0.4*Math.random(),rnd(0.25,0.6));}}
  }else{SPK.g=0;SPK.gS=0;}
  if(!skLive){skPts.visible=false;return;}
  // the live sparks: drift with what they were thrown with and the current; rise in SPK.rise, fade over their life
  let live=0;const kd=Math.exp(-2.5*dt);
  for(let i=0;i<SK_N;i++){if(skL[i]<=0)continue;const i3=i*3;skA[i]+=dt;const a=skA[i],L=skL[i];if(a>=L){skL[i]=0;skG[i]=0;continue;}live++;
    skV[i3]*=kd;skV[i3+1]*=kd;skV[i3+2]*=kd;skP[i3]+=(skV[i3]+CURV.x)*dt;skP[i3+1]+=skV[i3+1]*dt;skP[i3+2]+=(skV[i3+2]+CURV.z)*dt;const u=1-a/L;skG[i]=skPk[i]*Math.min(1,a/SPK.rise)*u*u;}
  skLive=live;skPts.visible=live>0;if(!live)return;
  {const ox=ORIGIN.x,oz=ORIGIN.z;for(let i=0;i<SK_N;i++){skPG[i*3]=skP[i*3]-ox;skPG[i*3+1]=skP[i*3+1];skPG[i*3+2]=skP[i*3+2]-oz;}skPts.position.set(ox,0,oz);}
  skGeo.attributes.position.needsUpdate=true;skGeo.attributes.aG.needsUpdate=true;skGeo.attributes.aS.needsUpdate=true;skU.uScale.value=(renderer.domElement&&renderer.domElement.height||720)*0.5; // three's own points scale: half the drawing buffer's height
}
