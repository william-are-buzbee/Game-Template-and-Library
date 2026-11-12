// far.js — what lies beyond the loaded cells, built once and kept: the whole mountain as a coarse terrain, every big
// structure (the rock forms of flora.js, the old domes, the cairns) and every landmark. Near cells draw their own fine terrain and flora on top and only
// register collision for the structures and landmarks (chunks.js), so nothing pops when a cell loads: the crag you saw
// from 1200 units is the crag you swim through. The far terrain is pushed down under loaded cells so the fine mesh wins
// wherever both exist. Also fills the water colour map the fog reads (scene.js).
// Built region by region (4x4 cells, 860 units) under a per-frame time budget, nearest to the player first: the ring
// beyond the loaded cells is up within a second or two of boot (behind the menu), the rest follows.

// ---------- the water map ----------
// waterColor() of the floor's conditions (world.js), the front's X in alpha (v11.81), one texel per ~36 units, box-blurred so borders
// blend over ~70 units. A coarse pass at boot (every 4th texel); each region refines its own block as it is built.
// v11.104 (GLOBE §10, the windows): the maps are a window (scene.js WM_HALF, WM_O) on a fixed grid of texels anchored at WM_A, the v11.65 square's
// corner, so a texel is a fixed place: the window's corner is the texel (WM_I0, WM_J0) of that grid, and moving it moves whole texels — what a
// moved window holds at a place is what it would hold had it been filled there (wmShiftGen). While the world is the window's square it never moves.
const WM_A=-CELL*120; // the anchor: cell 0's corner, six texels a cell, so cell i's first texel is 6i (v11.111; WM_C0, the world's corner on it, went with the regions' numbering from GRID0)
let WM_I0=Math.round(((0-WM_A)/(2*WM_HALF/WM_N)-WM_N/2)/24)*24,WM_J0=WM_I0; // the window's corner on the anchor's grid, at boot centred on the world's middle (0 today), a region's 24 texels to a step
const WM_T=2*WM_HALF/WM_N,wmRaw=new Float32Array(WM_N*WM_N*4),fmRaw=new Float32Array(WM_N*WM_N),wfRaw=new Float32Array(WM_N*WM_N),pgRaw=new Float32Array(WM_N*WM_N),pfRaw=new Float32Array(WM_N*WM_N),wmTx=[0,0,0]; // fmRaw (v11.27): the floor's depth, 0..1 of FM_SCALE, filled and blurred beside the colour; wfRaw (v11.44): the place's wave energy (world.js waveFac) in the floor map's green; pgRaw, pfRaw (v11.81): the plankton's green and gold crops (world.js plankTexel) in its blue and alpha, X in the water map's alpha
function wmFill(i0,i1,j0,j1,step){
  for(let j=j0;j<j1;j+=step)for(let i=i0;i<i1;i+=step){
    const x=WM_A+(WM_I0+i+0.5*step)*WM_T,z=WM_A+(WM_J0+j+0.5*step)*WM_T,s=sample(x,z),c=waterColor(s),fd=clamp(-s.h/FM_SCALE,0,1),wf=waveEnergy(x,z,s),p=plankTexel(x,z,s,wmTx);
    for(let jj=j;jj<Math.min(j1,j+step);jj++)for(let ii=i;ii<Math.min(i1,i+step);ii++){const n=(jj*WM_N+ii)*4,m=jj*WM_N+ii;wmRaw[n]=c[0];wmRaw[n+1]=c[1];wmRaw[n+2]=c[2];wmRaw[n+3]=p[2];fmRaw[m]=fd;wfRaw[m]=wf;pgRaw[m]=p[0];pfRaw[m]=p[1];} // alpha: the canopy's weight to v11.80, the front's X since v11.81
  }
}
// ---------- the plankton in the maps (v11.81, PLANKTON.md §7) ----------
// The lit layer's two crops (world.js plankTexel: green and gold on a log scale) ride the floor map's blue and alpha and the tidal front's
// criterion X the water map's alpha — filled and blurred with the colour and the floor above (one sample() per texel, nothing extra), so the
// ring is drawn at the maps' 36 m grain. The fragment shaders were at WebGL's 16 texture units, so a map of their own could not be bound. Static per
// place; the clock's part — the ring's breathing with the spring–neap cycle and the storm's pulse — is uFogB (world.js FOG_B), written per frame by bloomTick.
// a point's texel on the window and its weights (v11.106): the place and the weights are the anchor's grid's — (x − WM_A)/WM_T − 0.5, its floor and
// fraction — and the window's corner, a whole number, comes off the index after, so a moved window reads a place with the same bits it did before
// the move (u − WM_I0 rounds the fraction once the corner is negative, which v11.104's window, the square, never was); at the anchor, v11.103's
const WM_R=new Float64Array(4); // i0, j0 (on the window, clamped to it), fu, fv
function wmAt(x,z){const ua=(x-WM_A)/WM_T-0.5,va=(z-WM_A)/WM_T-0.5,ia=Math.floor(ua),ja=Math.floor(va),i=ia-WM_I0,j=ja-WM_J0,i0=clamp(i,0,WM_N-1),j0=clamp(j,0,WM_N-1);
  WM_R[0]=i0;WM_R[1]=j0;WM_R[2]=i0===i?ua-ia:clamp(ua-ia+i-i0,0,1);WM_R[3]=j0===j?va-ja:clamp(va-ja+j-j0,0,1);}
// the maps at a point, bilinear like the GPU reads them: out = [green enc, gold enc, X enc, the floor's depth in m]
function wmBloom(x,z,out){
  wmAt(x,z);const i0=WM_R[0],j0=WM_R[1],i1=Math.min(i0+1,WM_N-1),j1=Math.min(j0+1,WM_N-1),fu=WM_R[2],fv=WM_R[3],F=FM_DATA,W=WM_DATA,bl=(D,c)=>{const a=D[(j0*WM_N+i0)*4+c]*(1-fu)+D[(j0*WM_N+i1)*4+c]*fu,b=D[(j1*WM_N+i0)*4+c]*(1-fu)+D[(j1*WM_N+i1)*4+c]*fu;return (a*(1-fv)+b*fv)/255;};
  out[0]=bl(F,2);out[1]=bl(F,3);out[2]=bl(W,3);out[3]=bl(F,0)*FM_SCALE;return out;
}
// the crops at a point from the maps, now: out = [green, gold, red] mg/m³ (the CPU's read of what the veil draws; updateAtmosphere)
const bmB=[0,0,0,0];
function bloomAt(x,y,z,out){wmBloom(x,z,bmB);return bloomC(bmB,bmB[3],TIDE-y,out);}
// the clock's part of the field, per frame: the front's criterion shifted by the tide's amplitude (u ∝ amp: 3·log10), and the storm's pulse —
// the rain of the past four days (weatherAt, 2 h steps) through a kernel rising over a day and decaying over three, recomputed every 2 s
let bmPulse=0,bmPulseT=-1e9;
function bloomTick(){
  FOG_B[0]=PLK.xc+3*Math.log10(tideAmp(clockH)/TIDE_A1);
  if(clockH-bmPulseT>2*CLOCK_RATE||clockH<bmPulseT){let p=0;for(let tau=2;tau<=96;tau+=2)p+=weatherAt(clockH-tau).rain*(tau/30)*Math.exp(1-tau/30);bmPulse=p*2/30;bmPulseT=clockH;}
  FOG_B[2]=PLK.storm*Math.max(0,bmPulse-PLK.calm);FOG_B[3]=seasonAt(clockH); // the season (v11.83)
}
// the floor's depth at a point as the shader reads it (bilinear on the blurred map), in units (v11.27)
function wmFloor(x,z){
  wmAt(x,z);const i0=WM_R[0],j0=WM_R[1],i1=Math.min(i0+1,WM_N-1),j1=Math.min(j0+1,WM_N-1),fu=WM_R[2],fv=WM_R[3],D=FM_DATA;
  const a=D[(j0*WM_N+i0)*4]*(1-fu)+D[(j0*WM_N+i1)*4]*fu,b=D[(j1*WM_N+i0)*4]*(1-fu)+D[(j1*WM_N+i1)*4]*fu;return (a*(1-fv)+b*fv)/255*FM_SCALE;
}
// the place's wave energy at a point (v11.44, the floor map's green), bilinear like the GPU reads it
function wmWave(x,z){
  wmAt(x,z);const i0=WM_R[0],j0=WM_R[1],i1=Math.min(i0+1,WM_N-1),j1=Math.min(j0+1,WM_N-1),fu=WM_R[2],fv=WM_R[3],D=FM_DATA;
  const a=D[(j0*WM_N+i0)*4+1]*(1-fu)+D[(j0*WM_N+i1)*4+1]*fu,b=D[(j1*WM_N+i0)*4+1]*(1-fu)+D[(j1*WM_N+i1)*4+1]*fu;return (a*(1-fv)+b*fv)/255;
}
// the map at a point, bilinear like the GPU reads it: rgb the floor's water, a the front's X (0..1 floats)
function wmSample(x,z,out){
  wmAt(x,z);const i0=WM_R[0],j0=WM_R[1],i1=Math.min(i0+1,WM_N-1),j1=Math.min(j0+1,WM_N-1),fu=WM_R[2],fv=WM_R[3],D=WM_DATA;
  for(let c=0;c<4;c++){const a=D[(j0*WM_N+i0)*4+c]*(1-fu)+D[(j0*WM_N+i1)*4+c]*fu,b=D[(j1*WM_N+i0)*4+c]*(1-fu)+D[(j1*WM_N+i1)*4+c]*fu;out[c]=(a*(1-fv)+b*fv)/255;}
  return out;
}
function wmBlur(i0,i1,j0,j1){
  for(let j=Math.max(0,j0);j<Math.min(WM_N,j1);j++)for(let i=Math.max(0,i0);i<Math.min(WM_N,i1);i++){
    let r=0,g=0,b=0,a=0,f=0,wf=0,pg=0,pf=0,n=0;
    for(let dj=-1;dj<=1;dj++){const jj=j+dj;if(jj<0||jj>=WM_N)continue;for(let di=-1;di<=1;di++){const ii=i+di;if(ii<0||ii>=WM_N)continue;const k=(jj*WM_N+ii)*4,m=jj*WM_N+ii;r+=wmRaw[k];g+=wmRaw[k+1];b+=wmRaw[k+2];a+=wmRaw[k+3];f+=fmRaw[m];wf+=wfRaw[m];pg+=pgRaw[m];pf+=pfRaw[m];n++;}}
    const k=(j*WM_N+i)*4;WM_DATA[k]=Math.round(255*clamp(r/n,0,1));WM_DATA[k+1]=Math.round(255*clamp(g/n,0,1));WM_DATA[k+2]=Math.round(255*clamp(b/n,0,1));WM_DATA[k+3]=Math.round(255*clamp(a/n,0,1));
    FM_DATA[k]=Math.round(255*clamp(f/n,0,1));FM_DATA[k+1]=Math.round(255*clamp(wf/n,0,1));FM_DATA[k+2]=Math.round(255*clamp(pg/n,0,1));FM_DATA[k+3]=Math.round(255*clamp(pf/n,0,1));
  }
  waterMap.needsUpdate=true;floorMap.needsUpdate=true;
}
WM_O[0]=WM_A+WM_I0*WM_T+WM_HALF;WM_O[1]=WM_A+WM_J0*WM_T+WM_HALF; // the window's centre, the shaders' uWmO (0 today: −25800 + 0 + 25800)
wmFill(0,WM_N,0,WM_N,4);wmBlur(0,WM_N,0,WM_N);
// moving the window (v11.104): once the player is half a window's half-width from its centre, it is centred on them again, snapped to a region's
// 24 texels. The overlap is rolled (every map, raw and blurred), the centre and the texture move together, and the uncovered strips — at least a
// quarter of the window from the player, where no far region stands (they are dropped at FAR_DROP) — are filled coarse a slice a frame and
// blurred; the regions refine them when they are built there, as at boot. Only when the world is wider than the window: since v11.106 (±WHALF).
const WM_MOVE=Math.max(WX1-WX0,WZ1-WZ0)>2*WM_HALF;let wmGen=null,wmShifts=0;
function wmRecentre(px,pz){if(!WM_MOVE||wmGen)return;if(Math.max(Math.abs(px-WM_O[0]),Math.abs(pz-WM_O[1]))<WM_HALF/2)return;
  const I=Math.round(((px-WM_A)/WM_T-WM_N/2)/24)*24,J=Math.round(((pz-WM_A)/WM_T-WM_N/2)/24)*24;if(I!==WM_I0||J!==WM_J0)wmGen=wmShiftGen(I-WM_I0,J-WM_J0);}
function* wmShiftGen(di,dj){const N=WM_N;
  for(const [A,c] of [[wmRaw,4],[fmRaw,1],[wfRaw,1],[pgRaw,1],[pfRaw,1],[WM_DATA,4],[FM_DATA,4]]){const T=A.slice(),i0=Math.max(0,-di),i1=Math.min(N,N-di);
    for(let j=0;j<N;j++){const sj=j+dj;if(sj<0||sj>=N||i0>=i1)continue;A.set(T.subarray((sj*N+i0+di)*c,(sj*N+i1+di)*c),(j*N+i0)*c);}}
  WM_I0+=di;WM_J0+=dj;WM_O[0]=WM_A+WM_I0*WM_T+WM_HALF;WM_O[1]=WM_A+WM_J0*WM_T+WM_HALF;wmShifts++;waterMap.needsUpdate=true;floorMap.needsUpdate=true;yield;
  const strips=[];if(di>0)strips.push([Math.max(0,N-di),N,0,N]);if(di<0)strips.push([0,Math.min(N,-di),0,N]);if(dj>0)strips.push([0,N,Math.max(0,N-dj),N]);if(dj<0)strips.push([0,N,0,Math.min(N,-dj)]);
  for(const [a0,a1,b0,b1] of strips){for(let j=b0;j<b1;j+=4){wmFill(a0,a1,j,Math.min(b1,j+4),4);if(((j-b0)&31)===28)yield;}wmBlur(a0-1,a1+1,b0-1,b1+1);yield;}}

// The height the cell terrain has at a point: bilinear on the fine grid, from the same samples the cell takes, so a
// landmark placed with this sits on the near mesh exactly (sample() alone is off by the interpolation error).
function gridH(x,z){
  const fx=(x+HALF)/STEP,fz=(z+HALF)/STEP,ix=Math.floor(fx),iz=Math.floor(fz),tx=fx-ix,tz=fz-iz;
  const H=(gx,gz)=>sample(gx*STEP-HALF,gz*STEP-HALF).h;
  const a=H(ix,iz),b=H(ix+1,iz),c=H(ix,iz+1),d=H(ix+1,iz+1);return a+(b-a)*tx+(c-a)*tz+(a-b-c+d)*tx*tz;
}

// ---------- big structures ----------
// Where every structure stands, per cell, from the analytic terrain and a per-(cell, type) rng: computed on
// first request (by a region here, or by a cell loading before its region exists) and cached, so the far and near views
// agree by construction. The rules are placeFloraType's for `big` entries: per-biome density (the biome checked only once
// the cheap tests have passed, since a sample costs ~35 µs), field clustering, clear of landmarks, scaled to stay 12 under
// the surface unless on the strand, sunk into slopes. rs is the collision radius scale (chunks.js addLumps).
const BIG=FLORA.filter(f=>f.big),bigCache=new Map(),bigD=new THREE.Object3D();
// One structure of f at (x,z) on ground h: the instance matrix and collision scale, or null if it cannot fit. Under water a
// structure stays 12 under the surface (scaled down to); on the strand it stands as it likes. Set on the ground by the one
// rule (chunks.js settleOn), the ground read from sample().
const bigH=(x,z)=>sample(x,z).h,bigRng=()=>0.5;
function bigPlace(f,x,z,h,sc,yaw,sx,sz,minSc){
  if(h<0.5){const room=(-(f.clear||12)-h)/(f.top-(f.sink||0));sc=f.fill?Math.min(room,f.s?f.s[1]:room):Math.min(sc,room);} // `clear` under mean level (12: the rock; a reef 5: it grows to the lowest tide and stops); `fill`: as tall as that lets it (reef.js)
  if(sc<minSc)return null;
  if(!settleOn(bigD,f,x,z,h,sc,yaw,bigH,bigRng))return null;bigD.scale.set(sc*sx,sc,sc*sz);bigD.updateMatrix(); // a kit that can't lie on the ground here (fit, face) is not placed
  return {f:f,m:bigD.matrix.clone(),rs:sc*Math.min(sx,sz,1)};
}
// A generator (v11.12): a cell's structures are a few hundred sample() calls, which was one step of a region's build against a
// 3 ms budget; a yield every BIG_YIELD tries. bigsFor drains it for the callers that need the list at once (chunks.js
// placeBigSolids); the rng is untouched by a yield, so both paths agree.
// v11.31.3: the count was per entry and no entry has more than 20 tries (crag), so the yield had never once fired — a cell's whole
// structure pass was always a single step. Measured before the fix that step was 0.27-0.54 ms over all 256 cells, comfortably
// inside farMs, so nothing was stalling; the guard was simply dead, and would have stayed dead had a per gone up. The counter now
// runs over the whole cell and the cairns yield too. (The ~35 µs a sample this file used to cite is the cold figure; warm it
// measures 0.7 µs, 13 Sep — DESIGN "The far layer" already had it at ~2 µs warm.)
const BIG_YIELD=16; // tries between yields: a try is ~3 samples, or ~11 with settleOn's eight probes, so a step stays near 0.1 ms
function* bigsGen(i,j){
  const ck=ckey(i,j);let L=bigCache.get(ck);if(L)return L;L=[];
  const x0=i*CELL-HALF,z0=j*CELL-HALF;let tn=0; // tn: tries this cell over every entry — the yield's clock
  for(let fi=0;fi<BIG.length;fi++){const f=BIG[fi];
    const rng=mulberry((((i*73856093)^(j*19349663)^(fi*83492791)^0x2545f491)>>>0));
    const maxN=f.per||0,tries=Math.round(maxN*Q.flora);
    for(let n=0;n<tries;n++){
      if(++tn%BIG_YIELD===0)yield;
      const x=x0+rng()*CELL,z=z0+rng()*CELL,u=rng();
      let q=1;if(f.field)q*=clamp(0.1+4*Math.pow(fbm(x*f.field+31,z*f.field+17,2),2.5),0,1.6);
      if(u>=q)continue; // the envelope can only lower the chance from here
      const s=sample(x,z),h=s.h,sl=Math.hypot((sample(x+STEP,z).h-h)/STEP,(sample(x,z+STEP).h-h)/STEP);
      if(f.env&&u>=q*envW(f.env,h,sl,fixF(s.f,sl)))continue;
      if(underChemo(x,h,z))continue; // nothing under a basin's chemocline (v11.96; the -450 to v11.95)
      if(nearLandmark(x,z,110))continue;
      let sc=f.s[0]+rng()*(f.s[1]-f.s[0]);
      if(h<0.5&&!f.fill)sc=Math.min(sc,(-(f.clear||12)-h)/(f.top-(f.sink||0)));if(sc<f.s[0]*0.5)continue; // the same test as bigPlace's, here so a rejection draws nothing more
      let yaw=rng()*TAU;const sx=f.sx?f.sx[0]+rng()*(f.sx[1]-f.sx[0]):1,sz=f.sx?f.sx[0]+rng()*(f.sx[1]-f.sx[0]):1;
      if(f.flow)yaw=flowYaw(x,z)+(yaw-Math.PI)*0.12; // a reef mound lies along the current, a drowned reef along the contour (reef.js); the draw is kept so the stream is unchanged
      const e=bigPlace(f,x,z,h,sc,yaw,sx,sz,f.s[0]*0.5);if(!e)continue;
      const tc=f.tints[Math.floor(rng()*f.tints.length)];
      e.col=[tc[0]*(0.85+rng()*0.25),tc[1]*(0.85+rng()*0.25),tc[2]*(0.85+rng()*0.25)];L.push(e);
    }
  }
  bigCache.set(ck,L);return L;
}
function bigsFor(i,j){const g=bigsGen(i,j);let r;do r=g.next();while(!r.done);return r.value;}

// ---------- landmarks ----------
// The hand-built one-offs, built once at boot and kept (three culls each by its bounding sphere). LMK holds what the cells
// need to register their collision and lights (chunks.js placeLandmarks): heights on the fine grid.
const LMK={meshes:[]};
(function(){
  const keep=m=>{m.frustumCulled=true;scene.add(m);LMK.meshes.push(m);return shadowCaster(m,MATLM);}; // a caster into the world's shadow map (v11.30)
  // the bones landmark (a ~100 m ribcage) struck v11.100: a holdover; the falls are the bones now (DEEP §4)
  {const p=LM.chimney,y=gridH(p.x,p.z)-2,m=new THREE.Mesh(FLORA_BY_ID.chimney.geo,MATLM);m.geometry.computeBoundingSphere();m.position.set(p.x,y,p.z);m.scale.set(4.6,4.6,4.6);keep(m);LMK.chimney={y:y};}
})();

// ---------- far impostors: the forest, the bladder meadow and the rafts from a distance ----------
// The stipe forest (1100/cell), bladders, rafts and colonies are placed by the cell's rng and exist only in loaded cells, so from 600 units the
// forest read as a green floor. A sparse stand-in for each: every 5th stipe as a crossed pair of olive cards stretched to
// the surface with a canopy pad on top (a wall of stalks from afar), every 3rd bladder as a thin crossed card the height of the water
// column with a pad on top, rafts and colonies as flat octagons, every 2nd tidewood as a low-poly copy of the real one (v11.116). Placed by the same density rules as
// placeFloraType (biome, field, pocket, the lee) from a pure per-cell rng, drawn by the region, and zeroed inside loaded
// cells the way the far terrain is sunk. They do not match the near flora one for one; only the density does.
function impGeo(tris){ // tris: [[x,y,z]x3, [r,g,b]] with the normal from the winding
  const pos=[],nor=[],col=[];
  for(const [a,b,c,k] of tris){const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
    let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
    for(const v of [a,b,c]){pos.push(v[0],v[1],v[2]);nor.push(nx,ny,nz);col.push(k[0],k[1],k[2]);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(pos),3));
  g.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(nor),3));g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(col),3));g.computeBoundingSphere();return g;
}
function crossCards(w,y0,y1,col,tris){ // two vertical quads at right angles, width w between y0 and y1
  for(const [ax,az] of [[1,0],[0,1]]){const x=ax*w/2,z=az*w/2;tris.push([[-x,y0,-z],[x,y0,z],[x,y1,z],col],[[-x,y0,-z],[x,y1,z],[-x,y1,-z],col]);}
}
function farStipeGeo(){const T=[];crossCards(2.8,0,1,[0.42,0.44,0.17],T);const r=2.4,c=[0.5,0.5,0.2];for(let k=0;k<6;k++){const a0=k/6*TAU,a1=(k+1)/6*TAU;T.push([[0,1,0],[Math.cos(a0)*r,1,Math.sin(a0)*r],[Math.cos(a1)*r,1,Math.sin(a1)*r],c]);}return impGeo(T);} // the stipe: a unit card stretched to the surface like the bladder's, a canopy pad on top
function farBladderGeo(){const T=[];crossCards(1.4,0,1,[0.5,0.56,0.26],T);const r=2.2,c=[0.68,0.72,0.36];for(let k=0;k<6;k++){const a0=k/6*TAU,a1=(k+1)/6*TAU;T.push([[0,1,0],[Math.cos(a0)*r,1,Math.sin(a0)*r],[Math.cos(a1)*r,1,Math.sin(a1)*r],c]);}return impGeo(T);}
function farRaftGeo(col){const T=[];for(let k=0;k<8;k++){const a0=k/8*TAU+0.2,a1=(k+1)/8*TAU+0.2,r0=0.9+0.1*(k%2),r1=0.9+0.1*((k+1)%2);T.push([[0,0,0],[Math.cos(a0)*r0,0,Math.sin(a0)*r0],[Math.cos(a1)*r1,0,Math.sin(a1)*r1],col||W]);}return impGeo(T);}
// The tidewood (v11.116; to v11.115 a crossed pair of 1.2 m cards 9 m tall under a flat six-sided pad, olive on olive: from the water a fence
// of pale posts beside the real wood — "strange looking square LOD's", the person, 12 Nov 2026). Now the real one's middle size as flora.js
// tidewoodB draws it (H 9): a tapering trunk, four props to the sand, and the whorls — every rod one upright triangle from the trunk to where
// the real rod's kinked tip ends, so a whorl reads as the real one's V from any side and the crown is the real goblet (2.2 m out at 4.5,
// 2.7 at 7.5, the brush to 11). The trunk and props in JOINT, the rods white: the instance's tint is the real one's (impostorsGen, `pig`).
// 37 triangles (10 the cards).
function farTreeGeo(){
  const T=[],rg=mulberry(0x7d3e),P=(a,r,y)=>[Math.cos(a)*r,y,Math.sin(a)*r];
  const out=(a,b,c,k)=>{const ux=b[0]-a[0],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2],uy=b[1]-a[1],nx=uy*vz-uz*vy,nz=ux*vy-uy*vx; // the trunk's faces outward (impGeo's normal is the winding's)
    T.push(nx*(a[0]+b[0]+c[0])+nz*(a[2]+b[2]+c[2])<0?[a,c,b,k]:[a,b,c,k]);};
  for(let k=0;k<4;k++){const a0=k/4*TAU+0.4,a1=(k+1)/4*TAU+0.4;out(P(a0,0.3,-0.3),P(a1,0.3,-0.3),P(a1,0.12,9.6),JOINT);out(P(a0,0.3,-0.3),P(a1,0.12,9.6),P(a0,0.12,9.6),JOINT);} // ribbed 0.27 → 0.11 in the real
  for(let k=0;k<4;k++){const a=k/4*TAU+rg()*0.6,h1=1.2+rg()*1.0,d=1.2+rg()*0.8+h1*0.35;T.push([[0,h1+0.15,0],[0,h1-0.35,0],P(a,d,-0.3),JOINT]);} // the props: from 1–2.4 m up the trunk to the sand
  for(const [y,n,ox,oy] of [[4.5,6,2.2,1.5],[6,7,2.5,1.9],[7.5,7,2.7,2.4],[9,5,1.2,2.0]]){ // node height, rods, the kinked tip's reach out and up (the real whorls at t 0.5, 0.67, 0.83 and the brush)
    const ph=rg()*TAU,L0=Math.hypot(ox,oy),e0=Math.atan2(oy,ox);
    for(let i=0;i<n;i++){const a=ph+i/n*TAU+(rg()-0.5)*0.5,L=L0*(0.8+rg()*0.4),e=e0+(rg()-0.5)*0.3;T.push([[0,y-0.1,0],[0,y+0.5,0],[Math.cos(a)*Math.cos(e)*L,y+Math.sin(e)*L,Math.sin(a)*Math.cos(e)*L],W]);}
  }
  return impGeo(T);
}
// stride: one impostor per that many of the real thing. w: card width factor on the kelp's scale. r: pad extent (local units of the real geometry) for rafts.
// pig (v11.116): tinted as the real instances are — pigment(h, line) with the place's stain (grow.js tintBy) — not from the species' list. hs: the real
// variants' heights on the geometry's, one drawn per instance.
const FAR_IMP=[
  {f:FLORA_BY_ID.stipe,geo:farStipeGeo(),stride:5,dim:0.55}, // dim (v11.42.4): the card's tint against the real plant's — the stipe's pigment darkens with depth and its pads are silhouettes from below, and past the swap at FLORA_FAR the cards' residual through the fog read paler than the veil where the real kelp's read darker: a pale band with a bright line of pads along the far water level (the person's last 5%, 14 Sep)
  {f:FLORA_BY_ID.bladder,geo:farBladderGeo(),stride:3,dim:0.7},
  {f:FLORA_BY_ID.button,geo:farRaftGeo([0.56,0.82,0.78]),stride:2,r:1.1}, // the buttons' fleets, green-blue
  {f:FLORA_BY_ID.tidetree,geo:farTreeGeo(),stride:2,pig:true,hs:[6/9,1,12/9]} // tidewoodB's 6, 9 and 12 m
];
for(const sp of FAR_IMP)sp.f.card=true; // v11.52: a card species keeps an instanced mesh per cell (chunks.js makeInstanced) — its cards take over per cell at FLORA_FAR; every other species is pooled
const impCache=new Map(); // by ckey (v11.111; a dense array over the world's cells to v11.110)
// a generator (v11.12), like bigsGen: a cell's impostors are hundreds of sample() calls and were one step of a region's build
function* impostorsGen(i,j){
  const ck=ckey(i,j);let L=impCache.get(ck);if(L)return L;L=[];
  const x0=i*CELL-HALF,z0=j*CELL-HALF,d=new THREE.Object3D();
  const cw=Math.max(leeW(x0+CELL/2,z0+CELL/2),leeW(x0,z0),leeW(x0+CELL,z0),leeW(x0,z0+CELL),leeW(x0+CELL,z0+CELL)); // the retention field (v11.81; the canopy mask to v11.80)
  for(let si=0;si<FAR_IMP.length;si++){const sp=FAR_IMP[si];
    const f=sp.f,rng=mulberry((((i*73856093)^(j*19349663)^((si+40)*83492791)^0x2545f491)>>>0));
    let maxN=f.per||0;
    const lee=f.leePer&&cw>0.03;if(lee)maxN=Math.max(maxN,f.leePer);
    const tries=Math.round(maxN*Q.flora/sp.stride),floor=f.y!=='surface';
    for(let n=0;n<tries;n++){
      if(n%50===49)yield;
      const x=x0+rng()*CELL,z=z0+rng()*CELL,u=rng();
      // the envelope can only lower the chance: reject on the cheap terms first, sample() only for the rest
      const field=f.field?clamp(0.1+4*Math.pow(fbm(x*f.field+31,z*f.field+17,2),2.5),0,1.6):1;
      const pocket=f.pocket?0.1+smooth(0.6,0.72,fbm(x*f.pocket+53,z*f.pocket+29,2)):1;
      const cterm=lee?leeW(x,z)*f.leePer/maxN:0;
      if(u>=Math.max(pocket,cterm)*field)continue;
      const s=sample(x,z),h=s.h,sl=Math.hypot((sample(x+STEP,z).h-h)/STEP,(sample(x,z+STEP).h-h)/STEP);
      if(u>=Math.max((f.per||0)/maxN*(f.env?envW(f.env,h,sl,fixF(s.f,sl)):1)*pocket,cterm)*field)continue;
      if(floor&&underChemo(x,h,z))continue; // nothing on the floor under a basin's chemocline (v11.96; the -450 to v11.95)
      if(!floor&&h>-4)continue;
      if(floor&&sl>(f.maxSlope!==undefined?f.maxSlope:0.9))continue; // placeFloraType's slope (v11.116: the tidewood's 0.5; no other card species sets one)
      if(f.minH!==undefined&&h<f.minH)continue; // and its wet sand (v11.116: the tidewood's alone)
      let y=h,sc=f.s?f.s[0]+rng()*(f.s[1]-f.s[0]):1,sy=sc,sxz=sc;
      if(sp.hs)sy*=sp.hs[Math.floor(rng()*sp.hs.length)]; // a real variant's height (v11.116)
      if(f.reach){if(h>-14)continue;sy=-h-1.4;sxz=1;} // to just under the deepest trough (v11.4): the real stipes are folded to the wave, a card is not, and one that reached mean level stood 0.6 m out of every trough
      else if(!floor){y=f.ys!==undefined?f.ys:-0.45;sy=1;sxz=sc*sp.r;}
      else sxz=sc*(sp.w||1);
      d.position.set(x,y,z);d.rotation.set(0,rng()*TAU,0);d.scale.set(sxz,sy,sxz);d.updateMatrix();
      let tc;if(sp.pig){tc=pigment(h,f.line);const q=tintBy(h,s.f,true);if(q)tc=[lerp(tc[0],q[0],q[3]),lerp(tc[1],q[1],q[3]),lerp(tc[2],q[2],q[3])];} // as chunks.js placeFloraType and makeInstanced tint the real ones
      else tc=f.tints[Math.floor(rng()*f.tints.length)];
      const dm=sp.dim||1;L.push({si:si,m:d.matrix.clone(),col:[tc[0]*(0.85+rng()*0.25)*dm,tc[1]*(0.85+rng()*0.25)*dm,tc[2]*(0.85+rng()*0.25)*dm]});
    }
  }
  impCache.set(ck,L);return L;
}
const ZERO16=new Float32Array(16);
// show or hide one cell's impostors in a region: hidden (all-zero matrix, draws nothing) while the cell is loaded
function farApplyCell(reg,i,j){
  const ch=chunkIJ(i,j),on=!ch||!ch.near,k=(j-reg.cj0)*FR+(i-reg.ci0); // on: not loaded, or loaded but past FLORA_FAR (v11.12: the cell's flora is hidden then and the cards stand in)
  for(const imp of reg.imps){const rg=imp.ranges[k];if(!rg)continue;const arr=imp.im.instanceMatrix.array;
    for(let n=rg[0];n<rg[0]+rg[1];n++)arr.set(on?imp.mats.subarray(n*16,n*16+16):ZERO16,n*16);
    imp.im.instanceMatrix.needsUpdate=true;}
}

// a loaded cell went past FLORA_FAR or came back (chunks.js cullChunks): its impostors on or off, if its region is built
function farCellDrawn(i,j){const reg=regions.get(ckey(Math.floor(i/FR),Math.floor(j/FR)));if(reg)farApplyCell(reg,i,j);}
// ---------- the regions ----------
// A region is 4x4 cells: one terrain mesh on an 18-unit grid (36 on low; every 4th (8th) vertex of the fine grid, the same samples, so the
// two meet exactly at cell borders), and one instanced mesh per structure geometry holding every structure in the region.
// Vertices whose every touching cell is loaded are pushed 80 under (the fine mesh covers them); the vertices on the edge of
// the loaded block stay, so the far mesh runs up to the fine mesh's edge and dives under it.
const FR=4,FQ=Q.farQ,FS=CH_RES/FQ,FSTEP=STEP*FS,FG=FR*FQ+1; // FQ quads per cell, FS fine steps per far step
const regions=new Map(),farList=[];let farGen=null,farBuilt=0,visibleRegions=0; // the built regions by ckey(ri, rj), region (ri, rj) the cells from 4ri, 4rj (v11.111: by number from cell 0, any size of world; to v11.110 a dense array from GRID0), and as a list, farList, for the loops each frame
const RX0=WORLD.i0/FR,RX1=WORLD.i1/FR-1,RZ0=WORLD.j0/FR,RZ1=WORLD.j1/FR-1; // the world's regions, its bounds the clamp's (gridIn; v11.112 per axis, the world a rectangle)
function* genRegion(ri,rj){
  const ci0=ri*FR,cj0=rj*FR,x0=ci0*CELL-HALF,z0=cj0*CELL-HALF,[ox,oz]=originOf(x0,z0); // v11.110: the region's group at its corner, everything in it local
  // the water map block first: the fog reads it every frame
  const tn=FR*6,ti=ri*tn-WM_I0,tj=rj*tn-WM_J0,a0=Math.max(0,ti),a1=Math.min(WM_N,ti+tn),b0=Math.max(0,tj),b1=Math.min(WM_N,tj+tn); // the region's block on the window (v11.104), clipped to it
  if(a0<a1&&b0<b1){for(let j=b0;j<b1;j+=6){wmFill(a0,a1,j,Math.min(b1,j+6),1);yield;}wmBlur(a0-1,a1+1,b0-1,b1+1);yield;}
  // heights on the region's grid plus a one-vertex ring outside it (for slopes at the edge)
  const N=FG+2,hg=new Float32Array(N*N),fg=new Float32Array(N*N*NF);let minH=1e9,maxH=-1e9;
  for(let jj=0;jj<N;jj++){
    for(let ii=0;ii<N;ii++){const gx=ci0*CH_RES+(ii-1)*FS,gz=cj0*CH_RES+(jj-1)*FS,k=jj*N+ii,s=sample(gx*STEP-HALF,gz*STEP-HALF,fg.subarray(k*NF,(k+1)*NF));hg[k]=s.h;
      if(ii>0&&ii<N-1&&jj>0&&jj<N-1){if(s.h<minH)minH=s.h;if(s.h>maxH)maxH=s.h;}}
    yield;
  }
  const pos=new Float32Array(FG*FG*3),col=new Float32Array(FG*FG*3),idx=[];
  for(let jj=0;jj<FG;jj++){
    for(let ii=0;ii<FG;ii++){const n=jj*FG+ii,k=(jj+1)*N+(ii+1),gx=ci0*CH_RES+ii*FS,gz=cj0*CH_RES+jj*FS,x=gx*STEP-HALF,z=gz*STEP-HALF,h=hg[k];
      pos[n*3]=x-ox;pos[n*3+1]=h;pos[n*3+2]=z-oz;
      const sl=Math.hypot((hg[k+1]-hg[k-1])/(2*FSTEP),(hg[k+N]-hg[k-N])/(2*FSTEP));terrainColor(x,z,h,fixF(fg.subarray(k*NF,(k+1)*NF),sl),sl,col,n);}
    if(jj%8===7)yield;
  }
  for(let jj=0;jj<FG-1;jj++)for(let ii=0;ii<FG-1;ii++){const a=jj*FG+ii,b=a+1,c=a+FG,d=c+1;idx.push(a,c,b,b,c,d);}
  let P=pos,Cl=col,ext=0;
  if(ri===RX0||rj===RZ0||ri===RX1||rj===RZ1){P=Array.from(pos);Cl=Array.from(col);ext=apronGen(ri,rj,x0,z0,P,Cl,idx,ox,oz);P=new Float32Array(P);Cl=new Float32Array(Cl);yield;} // the world's edge: the terrain carried on past the far plane (v11.27)
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(P,3));geo.setAttribute('color',new THREE.BufferAttribute(Cl,3));geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,TERRAIN_MAT);mesh.frustumCulled=false;
  const reg={ri:ri,rj:rj,ci0:ci0,cj0:cj0,cx:x0+FR*CELL/2,cz:z0+FR*CELL/2,hg:hg,N:N,geo:geo,group:new THREE.Group(),sphere:null,imps:[],ext:ext};reg.group.position.set(ox,0,oz);
  reg.group.add(mesh);
  const top=Math.max(maxH,0)+120; // structures stand up to ~100 over the ground
  reg.sphere=new THREE.Sphere(new THREE.Vector3(reg.cx,(minH+top)/2,reg.cz),Math.hypot(FR*CELL*0.71+80+ext,(top-minH)/2+(ext?600:0))); // an edge region's sphere takes its apron in (the void floor is ~550 under the apron)
  yield;
  // the structures, gathered by geometry
  const byGeo=new Map();
  for(let dj=0;dj<FR;dj++)for(let di=0;di<FR;di++){for(const s of (yield* bigsGen(ci0+di,cj0+dj))){let L=byGeo.get(s.f.geo);if(!L){L=[];byGeo.set(s.f.geo,L);}L.push(s);}yield;}
  const c=new THREE.Color();
  byGeo.forEach((L,g)=>{const im=new THREE.InstancedMesh(g,MATROCKB,L.length);im.frustumCulled=false;
    for(let i=0;i<L.length;i++){im.setMatrixAt(i,L[i].m);c.setRGB(L[i].col[0],L[i].col[1],L[i].col[2]);im.setColorAt(i,c);}instLocal(im,L,ox,oz,q=>q.m);
    im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;reg.group.add(im);});
  yield;
  // the impostors, one instanced mesh per kind, instances grouped by cell so a cell's run can be zeroed when it loads
  const cellL=[];for(let dj=0;dj<FR;dj++)for(let di=0;di<FR;di++){cellL.push(yield* impostorsGen(ci0+di,cj0+dj));yield;}
  FAR_IMP.forEach((sp,si)=>{
    const ranges=new Array(FR*FR).fill(null);let total=0;
    for(let k=0;k<FR*FR;k++){let cnt=0;for(const e of cellL[k])if(e.si===si)cnt++;if(cnt){ranges[k]=[total,cnt];total+=cnt;}}
    if(!total)return;
    const im=new THREE.InstancedMesh(sp.geo,MATFAR,total);im.frustumCulled=false;const mats=new Float32Array(total*16);let n=0;
    for(let k=0;k<FR*FR;k++)for(const e of cellL[k]){if(e.si!==si)continue;im.setMatrixAt(n,e.m);mats.set(e.m.elements,n*16);mats[n*16+12]=e.m.elements[12]-ox;mats[n*16+14]=e.m.elements[14]-oz;im.instanceMatrix.array.set(mats.subarray(n*16,n*16+16),n*16);c.setRGB(e.col[0],e.col[1],e.col[2]);im.setColorAt(n,c);n++;}
    im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;reg.group.add(im);
    if(sp.f.y==='surface')im.tide=true;else if(sp.f.reach)im.reach=true; // the raft and colony discs ride the tide (cullFar lifts them each frame); the kelp and bladder cards stand on the floor and reach mean level — at a low tide they follow the water down (v11.2), as the real stipes are folded to it
    reg.imps.push({im:im,mats:mats,ranges:ranges});
  });
  scene.add(reg.group);regions.set(ckey(ri,rj),reg);farList.push(reg);farBuilt++;
  farPushRegion(reg);
}
// ---------- the apron (v11.27) ----------
// A region on the world's edge carries its terrain on past the far plane: APRON.length more columns (rows, and a block on a corner)
// of vertices beyond the edge at these offsets, sampled from the same sample() (the void's floor at ~-810 runs out flat), in the same
// mesh as the region, so the edge of the world has no edge. Before this the far mesh stopped at ±HALF and the black dome stood beyond
// it — a straight silhouette 25 m past the player's clamp, and the dome a shade darker than any terrain beside it (scene.js FOG_CUT).
// The last offset must exceed FAR from the clamp (25 inside the world's edge): at 2000 it does on both tiers. ~600 vertices on an edge region, ~1000 on a corner.
const APRON=[60,150,330,700,1300,2000];
function apronGen(ri,rj,x0,z0,pos,col,idx,ox,oz){ // appends to pos/col (plain arrays) and idx; returns the apron's reach beyond the edge
  const sides=[ri===RX0,ri===RX1,rj===RZ0,rj===RZ1]; // -x,+x,-z,+z: the world's edge
  const fT=new Float32Array(NF),cT=new Float32Array(3);let n=pos.length/3;
  const addV=(x,z)=>{const s=sample(x,z,fT);terrainColor(x,z,s.h,fixF(fT,0),0,cT,0);pos.push(x-ox,s.h,z-oz);col.push(cT[0],cT[1],cT[2]);return n++;};
  const L=FR*CELL,K=APRON.length,quad=(a,b,c,d)=>idx.push(a,c,b,b,c,d); // a→b along +x, a→c along +z: the interior's winding
  const strip={}; // strip['x+'][k][jj]: the vertex at level k beyond the +x edge on row jj (and so on)
  for(const sx of [-1,1]){if(!sides[sx<0?0:1])continue;const xe=sx<0?x0:x0+L,S=strip[sx<0?'x-':'x+']=[];
    for(let k=0;k<K;k++){S.push([]);for(let jj=0;jj<FG;jj++)S[k].push(addV(xe+sx*APRON[k],z0+jj*FSTEP));}
    const V=(k,jj)=>k<0?jj*FG+(sx<0?0:FG-1):S[k][jj];
    for(let k=0;k<K;k++)for(let jj=0;jj<FG-1;jj++){if(sx>0)quad(V(k-1,jj),V(k,jj),V(k-1,jj+1),V(k,jj+1));else quad(V(k,jj),V(k-1,jj),V(k,jj+1),V(k-1,jj+1));}}
  for(const sz of [-1,1]){if(!sides[sz<0?2:3])continue;const ze=sz<0?z0:z0+L,S=strip[sz<0?'z-':'z+']=[];
    for(let k=0;k<K;k++){S.push([]);for(let ii=0;ii<FG;ii++)S[k].push(addV(x0+ii*FSTEP,ze+sz*APRON[k]));}
    const V=(k,ii)=>k<0?(sz<0?0:FG-1)*FG+ii:S[k][ii];
    for(let k=0;k<K;k++)for(let ii=0;ii<FG-1;ii++){if(sz>0)quad(V(k-1,ii),V(k-1,ii+1),V(k,ii),V(k,ii+1));else quad(V(k,ii),V(k,ii+1),V(k-1,ii),V(k-1,ii+1));}}
  for(const sx of [-1,1])for(const sz of [-1,1]){const SX=strip[sx<0?'x-':'x+'],SZ=strip[sz<0?'z-':'z+'];if(!SX||!SZ)continue; // a corner: the block between two strips
    const xe=sx<0?x0:x0+L,ze=sz<0?z0:z0+L,ie=sx<0?0:FG-1,je=sz<0?0:FG-1,C=[];
    for(let a=0;a<K;a++){C.push([]);for(let b=0;b<K;b++)C[a].push(addV(xe+sx*APRON[a],ze+sz*APRON[b]));}
    const V=(a,b)=>a<0?(b<0?je*FG+ie:SZ[b][ie]):(b<0?SX[a][je]:C[a][b]);
    for(let a=0;a<K;a++)for(let b=0;b<K;b++){const A=V(a-1,b-1),B=V(a,b-1),Cc=V(a-1,b),D=V(a,b); // A→B steps along sx, A→Cc along sz
      if(sx>0&&sz>0)quad(A,B,Cc,D);else if(sx<0&&sz>0)quad(B,A,D,Cc);else if(sx>0)quad(Cc,D,A,B);else quad(D,Cc,B,A);}}
  return APRON[K-1];
}
// Vertex (ii,jj) of a region goes 80 under if every cell it touches is loaded. On the edge of the loaded block (some
// touching cells loaded) it is held at or below the fine mesh's heights around it, so where the coarse edge would stand
// above the fine one the far mesh dips under the fine edge (hidden from inside) instead of showing a sliver over it.
function farPushVertex(reg,ii,jj){
  const gx=reg.ci0*CH_RES+ii*FS,gz=reg.cj0*CH_RES+jj*FS,x=gx*STEP-HALF,z=gz*STEP-HALF;
  const i0=cellOf(x-0.01),i1=cellOf(x+0.01),j0=cellOf(z-0.01),j1=cellOf(z+0.01);
  let all=true,h=reg.hg[(jj+1)*reg.N+(ii+1)],lo=h;
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){if(!gridIn(i,j))continue;const ch=chunkIJ(i,j);if(!ch){all=false;continue;}
    const li=gx-i*CH_RES,lj=gz-j*CH_RES; // this vertex on the cell's fine grid; the min over the coarse quad's reach around it
    for(let b=Math.max(0,lj-FS);b<=Math.min(CH_RES,lj+FS);b++)for(let a=Math.max(0,li-FS);a<=Math.min(CH_RES,li+FS);a++){const v=ch.hg[b*GR+a];if(v<lo)lo=v;}}
  reg.geo.attributes.position.array[(jj*FG+ii)*3+1]=all?h-80:Math.max(lo,h-30); // 30 covers the coarse grid's worst overshoot; more would dig a trench at the pit's rim
}
function farPushRegion(reg){for(let jj=0;jj<FG;jj++)for(let ii=0;ii<FG;ii++)farPushVertex(reg,ii,jj);reg.geo.attributes.position.needsUpdate=true;
  for(let dj=0;dj<FR;dj++)for(let di=0;di<FR;di++)farApplyCell(reg,reg.ci0+di,reg.cj0+dj);}
// a cell loaded or unloaded: refresh the vertices of its block in every region that holds them (its edges are shared)
function farCellChanged(i,j){ // the regions that can hold the cell's block: its own and the ones its edges touch (v11.106: not a walk over every region)
  const R=FR*CH_RES,a=Math.floor(i/FR),b=Math.floor(j/FR);
  for(let rj=b-1;rj<=b+1;rj++)for(let ri=a-1;ri<=a+1;ri++){const reg=regions.get(ckey(ri,rj));if(!reg)continue;
    const g0=reg.ci0*CH_RES,h0=reg.cj0*CH_RES,lo=Math.max(i*CH_RES,g0),hi=Math.min((i+1)*CH_RES,g0+R),lz=Math.max(j*CH_RES,h0),hz=Math.min((j+1)*CH_RES,h0+R);
    if(lo>hi||lz>hz)continue;
    for(let gz=lz;gz<=hz;gz+=FS)for(let gx=lo;gx<=hi;gx+=FS)farPushVertex(reg,(gx-g0)/FS,(gz-h0)/FS);
    reg.geo.attributes.position.needsUpdate=true;
    if(i>=reg.ci0&&i<reg.ci0+FR&&j>=reg.cj0&&j<reg.cj0+FR)farApplyCell(reg,i,j);}
}
// (v11.58) The regions stream like the cells: built nearest first within FAR_R of the player (the far plane plus a region's reach — nothing
// beyond it can be drawn), dropped beyond FAR_DROP, one a frame (the band between is hysteresis, so a region on its edge does not thrash).
// To v11.57 the far layer was the whole world built once and kept: 16 regions. The basin's world is 900, a hundred megabytes of terrain
// nobody sees. A dropped region's water map block stays filled (the fog reads the whole map); its heights and structures are rebuilt on
// return from the same samples and caches, so nothing moves.
const FAR_R=FAR+FR*CELL*0.71+500,FAR_DROP=FAR_R+900;
function manageFar(budgetMs){
  const t0=performance.now(),px=player.pos.x,pz=player.pos.z;
  wmRecentre(px,pz);while(wmGen&&performance.now()-t0<budgetMs){if(wmGen.next().done)wmGen=null;} // the maps' window first (v11.104): never moves yet
  if(!farGen){let best=null,bd=FAR_R*FAR_R;
    const L=FR*CELL,a0=Math.max(RX0,Math.floor((px-FAR_R+HALF)/L)),a1=Math.min(RX1,Math.floor((px+FAR_R+HALF)/L)),b0=Math.max(RZ0,Math.floor((pz-FAR_R+HALF)/L)),b1=Math.min(RZ1,Math.floor((pz+FAR_R+HALF)/L));
    for(let rj=b0;rj<=b1;rj++)for(let ri=a0;ri<=a1;ri++){if(regions.has(ckey(ri,rj)))continue;const dx=(ri+0.5)*L-HALF-px,dz=(rj+0.5)*L-HALF-pz,d=dx*dx+dz*dz;if(d<bd){bd=d;best=[ri,rj];}}
    if(best)farGen=genRegion(best[0],best[1]);}
  while(farGen&&performance.now()-t0<budgetMs){if(farGen.next().done){farGen=null;break;}}
  for(const reg of farList){if(Math.hypot(reg.cx-px,reg.cz-pz)>FAR_DROP+reg.ext){dropRegion(reg);break;}}
}
function dropRegion(reg){scene.remove(reg.group);reg.geo.dispose();for(const o of reg.group.children)if(o.isInstancedMesh)o.dispose();regions.delete(ckey(reg.ri,reg.rj));farList.splice(farList.indexOf(reg),1);farBuilt--;} // the structure and card geometries are shared (FLORA's, FAR_IMP's): only the instance buffers go
// after cullChunks, which sets the frustum
function cullFar(){
  visibleRegions=0;
  for(const reg of farList){const d=Math.hypot(reg.cx-camera.position.x,reg.cz-camera.position.z);const v=d<FAR+FR*CELL*0.71+reg.ext&&frustum.intersectsSphere(reg.sphere);reg.group.visible=v;if(v){visibleRegions++;for(const I of reg.imps){if(I.im.tide)I.im.position.y=TIDE;else if(I.im.reach)I.im.position.y=Math.min(TIDE,0);}}}
}
