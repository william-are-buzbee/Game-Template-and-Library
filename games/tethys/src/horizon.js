// horizon.js — the horizon tier (v11.64, ARCHIPELAGO step 3): what lies past the far plane, seen from above the water. The far layer ends at
// FAR (1600/1000) and to v11.63 the air's fog closed there (FOG_CUT), so the giant 18 km off could not exist for the eye. Now, with the camera
// in air, a second pass draws first — the sky dome, a sea disc from the surface mesh's edge to HZ_FAR, and one coarse mesh of every island's
// land and shallows (above HZ_CUT) sampled once from sample() at Q.hz metres — through a camera whose near plane sits at HZ_NEAR of the far
// plane, and the main pass draws over it with the depth cleared: everything nearer than the far plane is the world as it was, everything
// beyond is this. The planet's curvature is a vertex-shader drop of d²/2R from the camera's foot (PLANET: 1 g and nothing else, so R is
// Earth's): from the water the giant's shore at 18 km sits 25 m under the sea's curve and its summit stands 2.6° up; from 40 m the shore shows.
// The mesh and the disc are fogged by the same air as the world (scene.js fogAir: the mist's layers, then the haze toward the sky in the ray's
// direction) without the far cut, so at 18 km the giant is the haze's contrast (~7% on a clear day, gone under a shower); the world's air was
// made a trade-wind day for this (world.js AIR: visibility ~30 km, to v11.63 ~1 km, "a hazy coast" — the person's call, WATER.md P6). Under
// water nothing changes: the pass is skipped and the dome goes back to the main scene. Built over the first frames above the water (v11.102: a
// slice of HZ_MS a frame, ~1 s of sample() in all; to v11.101 ~0.3 s in one frame, behind the boot's fade; v11.109: a mesh per member, nearest
// first) and kept; nothing streams yet. The pass is not in the tests (the stub's renderer has no clear, so it never runs headless); the land's build is (test/horizon.js, v11.109).
const HZ_NEAR=20,HZ_FAR=250000,HZ_CUT=-5,HZ_R=6371000,HZ_SEA0=0.75; // the pass's near plane (m — not the far plane: near-plane clipping is by view depth, so a plane at FAR cut the dome and anything off-axis to a 32° cone; the main pass overdraws whatever the horizon pass drew nearer than FAR, since its depth is cleared between; 20 rather than 5 for the depth's resolution at 18 km, ~1 m); its far plane; the ground under which no triangle is kept (a triangle stays if any corner is above it, so every shore quad stays; the sea disc covers the rest — at -60 the shallows under the disc fought it for the depth at 18 km and showed as specks on the line); the planet's radius; the sea disc's inner radius as a fraction of FAR (under the surface mesh's edge at 1.05)
const HZ_LIGHT=[0.62,1.15,1.0,0.85]; // the horizon mesh's light: the sky's ambient share (zenith over horizon by the normal's tilt), the sun's share by its cosine; the sea disc's water-column weight and its reflection's ceiling (the surface's 0.85) — tuned in the pane (v11.65) against the surface mesh's far end from 300 m up: with the column term at 1 the surface's own ceiling matches it to three levels of 255 (129,149,160 against 128,147,160); without the column the disc stood a shade lighter from any height
const hzScene=new THREE.Scene(),hzCam=new THREE.PerspectiveCamera(CAM_K.fov,innerWidth/innerHeight,HZ_NEAR,HZ_FAR);
const hzLand=new THREE.Group();hzScene.add(hzLand);let hzSea=null,hzTried=false; // hzLand: the members' land meshes (v11.106: one mesh, hzMesh)
// the shared fog and sky uniforms, the same objects the world's materials read (scene.js shares them through ShaderLib)
function hzUniforms(){const L=(THREE.ShaderLib&&THREE.ShaderLib.lambert&&THREE.ShaderLib.lambert.uniforms)||{},u={};for(const k of ['uFogC','uFogR','uFogW','uFogP','uFogS','uFogT','uFogA','uFogAC','uMist','uMistC','uMistW','uWaterMap','uFloorMap','uWmO','uFogB','uFogTC','uSkA','uSkB','uSkC','uSkD','uSkE','uSkF','uCld','uCldB','uCellA','uCellB'])if(L[k])u[k]=L[k];return u;}
const HZ_VS_HEAD='uniform vec3 uFogC;uniform mat3 uFogR;uniform vec4 uFogW;varying float vFogDepth;varying vec3 vFogPos;\n'; // the fog's vertex stage by hand: vFogPos is the dropped world position
const HZ_FS_HEAD='#define USE_FOG\n'+DITHER_PARS+'\n'; // then the chunk: fogAir, skyLite, the mist
function hzMat(vs,fs){return new THREE.ShaderMaterial({uniforms:hzUniforms(),vertexShader:vs,fragmentShader:fs,vertexColors:true,side:THREE.DoubleSide,fog:false});}
const HZ_TERRAIN_MAT=hzMat(HZ_VS_HEAD+'varying vec3 vCol;varying vec3 vN;void main(){vec3 w=(modelMatrix*vec4(position,1.0)).xyz;vec2 dd=w.xz-uFogC.xz;float dr=dot(dd,dd)*'+(0.5/HZ_R).toExponential(6)+';vec4 mv=modelViewMatrix*vec4(position.x,position.y-dr,position.z,1.0);vFogDepth=length(mv.xyz);vFogPos=vec3(w.x,w.y-dr,w.z);vCol=color;vN=normal;gl_Position=projectionMatrix*mv;}',
  HZ_FS_HEAD+THREE.ShaderChunk.fog_pars_fragment+'\nvarying vec3 vCol;varying vec3 vN;void main(){vec3 n=normalize(vN);float sd=max(dot(n,uSkE.xyz),0.0);vec3 amb=mix(uSkB.xyz,uSkA.xyz,0.5+0.5*n.y)*'+HZ_LIGHT[0].toFixed(3)+';vec3 col=vCol*(amb+uSkD.xyz*uSkA.w*sd*'+HZ_LIGHT[1].toFixed(3)+');'+
  'float d=vFogDepth;if(d<uHzMin)discard;vec3 rd=(vFogPos-uFogC)/max(d,1e-3);col=fogAir(col,uFogC,rd,d,1.0);gl_FragColor=vec4(dithering(col),1.0);}'); // lit by the sky's own uniforms (the zenith and horizon as the ambient, the sun's colour by dayK), an approximation of the world's hemisphere and sun that the haze at 1.3 km hides
HZ_TERRAIN_MAT.uniforms.uHzMin={value:FAR*HZ_SEA0};HZ_TERRAIN_MAT.fragmentShader='uniform float uHzMin;\n'+HZ_TERRAIN_MAT.fragmentShader; // v11.86.1: the land mesh draws only past HZ_SEA0 of the far plane, where the sea disc starts and the main pass hands over — nearer, its Q.hz-metre triangles can stand over the camera where the fine ground is a hollow (the tuff cone's crater: from its floor the sky was the mesh's tan underside; the person, 23 Sep 2026), and nothing in the main pass covers the sky
const HZ_SEA_U={value:new THREE.Vector4(HZ_LIGHT[3],HZ_LIGHT[2],1,0)}; // the disc's terms, live: the reflection's ceiling, the column's weight, the body's (tuned in the pane against the surface's far end, v11.65)
const HZ_SEA_MAT=hzMat(HZ_VS_HEAD+'void main(){vec4 wp=modelMatrix*vec4(position,1.0);vec2 dd=wp.xz-uFogC.xz;wp.y-=dot(dd,dd)*'+(0.5/HZ_R).toExponential(6)+';vec4 mv=viewMatrix*wp;vFogDepth=length(mv.xyz);vFogPos=wp.xyz;gl_Position=projectionMatrix*mv;}',
  HZ_FS_HEAD+THREE.ShaderChunk.fog_pars_fragment+'\nuniform vec4 uHzSea;void main(){float d=vFogDepth;vec3 rd=(vFogPos-uFogC)/max(d,1e-3);float cm=max(-rd.y,0.0);float R=pow(1.0-cm,3.0)*uHzSea.x;float a=0.22+R-0.22*R;vec3 Rw=reflect(rd,vec3(0.0,1.0,0.0));Rw.y=max(Rw.y,1e-3);Rw=normalize(Rw);float dl=mix(0.1,1.0,uSkA.w);'+
  'vec3 col=vec3(0.07,0.23,0.30)*dl*0.22*(1.0-R)*uHzSea.z+skyLite(Rw)*R+vec3(0.04,0.14,0.22)*dl*(1.0-a)*uHzSea.y;col=fogAir(col,uFogC,rd,d,1.0);gl_FragColor=vec4(dithering(col),1.0);}'); // the surface's topside rule at its far end (atmosphere.js SURF_MAT: the Fresnel weight on the mean normal, the sky reflected at R, the body at uBody 0.22 of the rest) and, since the surface is a transparent mesh whose alpha a = uBody+R-uBody·R leaves the rest of the pixel to the water column beneath, the column as a dark blue at (1-a): without it the disc stood a shade lighter than the surface's far end from any height (v11.65). At grazing R → the ceiling: the sky a few degrees up, darker than the horizon's band — the sea line
HZ_SEA_MAT.uniforms.uHzSea=HZ_SEA_U;
// the extent: the world's square with its apron, and every island record's land or rim with a margin
function hzExtent(){let x0=WX0-2000,x1=WX1+2000,z0=WZ0-2000,z1=WZ1+2000;for(const R of ISLANDS){const r=((R.land?R.land.r:R.rimR||0)+3000)*R.sc;x0=Math.min(x0,R.x-r);x1=Math.max(x1,R.x+r);z0=Math.min(z0,R.z-r);z1=Math.max(z1,R.z+r);}return [x0,x1,z0,z1];}
// v11.102: the box grew with the model's records (111 × 98 km for seed 32, against the square's 56) and most of it is open sea, so the mesh is no
// longer sampled whole. A coarse pass at HZ_C·Q.hz, only inside some record's land, rim or cone, finds the cells that can hold something over
// HZ_CUT — a corner over it, or a reef's rim through it (a ring narrower than the coarse step) — and only those are sampled at Q.hz; the rest
// of the box is the sea disc's. ~1 s of sample() for seed 32 (node), against v11.101's ~0.25 for the square whole (v11.106's world: ~2.3 s).
// And it is built a slice at a time (hzStep, HZ_MS a frame) rather than in one frame: the disc and the sky draw from the first, the land when done.
const HZ_C=4,HZ_MS=6;
// v11.109 (GLOBE §10.1, before the province: a horizon mesh per member): each live coarse cell belongs to one member — of the records whose
// top holds its centre, the one it lies deepest inside (its distance over the top's radius least; the first in ISLANDS on a tie) — and each
// member's cells are one mesh, the members built in order of the camera's distance to their tops' edge when the build starts, so the nearest
// land shows first (the giant and the 308 m island in a fraction of the whole). A vertex on a boundary between two members is the same lattice
// point sampled for both, so they meet exactly; the cells, their quads and their vertices are v11.102's, and the union is its one mesh
// triangle for triangle (test/horizon.js). Each mesh is culled by its own sphere, widened by HZ_DROP for the curvature's drop.
const HZ_DROP=4000; // m: the most the vertex shader lowers a point a camera in the world can see (~200 km off: d²/2R ≈ 3.1 km), on each mesh's bounding sphere
function* hzGen(cx0,cz0){const E=hzExtent(),S=Q.hz,C=S*HZ_C,x0=E[0],z0=E[2],nx=Math.ceil((E[1]-x0)/S)+1,nz=Math.ceil((E[3]-z0)/S)+1,cx=Math.ceil((nx-1)/HZ_C),cz=Math.ceil((nz-1)/HZ_C),t0=performance.now();
  // what can stand over HZ_CUT is inside a record's land, rim or cone (its radius warped +16%, and a coarse cell's diagonal): only those cells
  // (v11.107: and a bare summit over the sea, to its terraces' foot — the low island m150, 50 m, the first record with no land or rim above water)
  // are sampled at all; of them, a cell is live with a corner over the cut or a rim through it
  const tops=ISLANDS.map(R=>({x:R.x,z:R.z,t:((R.land?R.land.r:R.rimR!==undefined?R.rimR+R.rimW:R.h0>0&&R.terr?R.terr.r1:0)*1.16+(R.isle?2000:0))*R.sc+C*0.75,r:(R.rimR||0)*R.sc,w:(R.rimW||0)*R.sc+C,id:R.id})).filter(q=>q.t>C*0.75);
  const CH=new Map(),cH=(i,j)=>{const k=j*(cx+1)+i;let h=CH.get(k);if(h===undefined){h=sample(x0+i*C,z0+j*C).h;CH.set(k,h);}return h;};
  const H=new Map(),hAt=(i,j)=>{const k=j*nx+i;let h=H.get(k);if(h===undefined){h=sample(x0+i*S,z0+j*S).h;H.set(k,h);}return h;};
  const cT=new Float32Array(3),f=new Float32Array(NF),order=tops.slice().sort((a,b)=>(Math.hypot(a.x-cx0,a.z-cz0)-a.t)-(Math.hypot(b.x-cx0,b.z-cz0)-b.t));
  let nl=0,nv=0,nt=0,tq=performance.now();
  for(const m of order){
    const cells=[],i0=Math.max(0,Math.floor((m.x-m.t-x0)/C)),i1=Math.min(cx-1,Math.floor((m.x+m.t-x0)/C)),j0=Math.max(0,Math.floor((m.z-m.t-z0)/C)),j1=Math.min(cz-1,Math.floor((m.z+m.t-z0)/C));
    for(let j=j0;j<=j1;j++){for(let i=i0;i<=i1;i++){const mx=x0+(i+0.5)*C,mz=z0+(j+0.5)*C;let own=null,bu=2,rim=false;
        for(const q of tops){const d=Math.hypot(mx-q.x,mz-q.z);if(d<q.t){const u=d/q.t;if(u<bu){bu=u;own=q;}if(q.r>0&&Math.abs(d-q.r)<q.w)rim=true;}}
        if(own!==m)continue;if(rim||Math.max(cH(i,j),cH(i+1,j),cH(i,j+1),cH(i+1,j+1))>HZ_CUT)cells.push(i,j);}
      if(performance.now()-tq>HZ_MS){yield;tq=performance.now();}}
    const keep=new Map(),pos=[],col=[],nrm=[],idx=[],li=Math.round((m.x-x0)/S),lj=Math.round((m.z-z0)/S),[ox,oz]=originOf(x0+li*S,z0+lj*S),OL=ORIGIN.on; // v11.110: the mesh at a lattice point by the member, its vertices whole steps from it
    const use=(i,j)=>{const k=j*nx+i;let v=keep.get(k);if(v!==undefined)return v;const x=x0+i*S,z=z0+j*S,h=sample(x,z,f).h;
      const gx=(hAt(Math.min(i+1,nx-1),j)-hAt(Math.max(i-1,0),j))/(2*S),gz=(hAt(i,Math.min(j+1,nz-1))-hAt(i,Math.max(j-1,0)))/(2*S),sl=Math.sqrt(gx*gx+gz*gz),L=Math.sqrt(gx*gx+1+gz*gz);
      terrainColor(x,z,h,fixF(f,sl),sl,cT,0);v=pos.length/3;pos.push(OL?(i-li)*S:x,h,OL?(j-lj)*S:z);col.push(cT[0],cT[1],cT[2]);nrm.push(-gx/L,1/L,-gz/L);keep.set(k,v);return v;};
    for(let c=0;c<cells.length;c+=2){const ci=cells[c],cj=cells[c+1];
      for(let j=cj*HZ_C;j<Math.min((cj+1)*HZ_C,nz-1);j++)for(let i=ci*HZ_C;i<Math.min((ci+1)*HZ_C,nx-1);i++){if(hAt(i,j)<HZ_CUT&&hAt(i+1,j)<HZ_CUT&&hAt(i,j+1)<HZ_CUT&&hAt(i+1,j+1)<HZ_CUT)continue;const A=use(i,j),B=use(i+1,j),Cc=use(i,j+1),D=use(i+1,j+1);idx.push(A,Cc,B,B,Cc,D);} // a→b along +x, a→c along +z, the far layer's winding
      if(performance.now()-tq>HZ_MS){yield;tq=performance.now();}}
    nl+=cells.length/2;if(!idx.length)continue;
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nrm,3));g.setIndex(idx);
    g.computeBoundingSphere();if(g.boundingSphere)g.boundingSphere.radius+=HZ_DROP;
    const mesh=new THREE.Mesh(g,HZ_TERRAIN_MAT);mesh.name=m.id;mesh.position.set(ox,0,oz);hzLand.add(mesh);nv+=pos.length/3;nt+=idx.length/3;}
  console.log('horizon: '+nx+'×'+nz+' at '+S+' m, '+nl+' coarse cells live of '+(cx*cz)+', '+hzLand.children.length+' members, '+(CH.size+H.size)+' samples, '+nv+' vertices, '+nt+' triangles, '+(performance.now()-t0).toFixed(0)+' ms over the frames');}
// the sea disc: rings from HZ_SEA0·FAR to HZ_FAR, spaced by a power so the near rings are fine, about the camera each frame (the drop is the shader's)
function hzSeaBuild(){const K=18,NS=96,r0=FAR*HZ_SEA0,p=[],c=[],ix=[];for(let k=0;k<=K;k++){const r=r0*Math.pow(HZ_FAR/r0,k/K);for(let s=0;s<NS;s++){const a=s/NS*TAU;p.push(Math.cos(a)*r,0,Math.sin(a)*r);c.push(1,1,1);}}
  for(let k=0;k<K;k++)for(let s=0;s<NS;s++){const a=k*NS+s,b=k*NS+(s+1)%NS,cc=a+NS,d=b+NS;ix.push(a,cc,b,b,cc,d);}
  const sgm=new THREE.BufferGeometry();sgm.setAttribute('position',new THREE.Float32BufferAttribute(p,3));sgm.setAttribute('color',new THREE.Float32BufferAttribute(c,3));sgm.setIndex(ix);hzSea=new THREE.Mesh(sgm,HZ_SEA_MAT);hzSea.frustumCulled=false;hzScene.add(hzSea);}
let hzG=null;
function hzStep(){if(!hzG)return;const t0=performance.now();try{while(performance.now()-t0<HZ_MS){if(hzG.next().done){hzG=null;break;}}}catch(e){hzG=null;console.warn('the horizon tier could not build: '+e.message);}}
// the frame's render (main.js): above the water the horizon pass first, then the world over it with the depth cleared; below, the world alone
function renderFrame(){const above=wasAbove===true&&!!renderer.clearDepth;
  if(above&&!hzTried){hzTried=true;try{hzSeaBuild();hzG=hzGen(camera.position.x,camera.position.z);}catch(e){console.warn('the horizon tier could not build: '+e.message);}}
  if(above)hzStep();
  if(above&&hzSea){if(sky.parent!==hzScene)hzScene.add(sky);
    hzCam.position.copy(camera.position);hzCam.quaternion.copy(camera.quaternion);if(hzCam.fov!==camera.fov||hzCam.aspect!==camera.aspect){hzCam.fov=camera.fov;hzCam.aspect=camera.aspect;hzCam.updateProjectionMatrix();}hzCam.updateMatrixWorld();
    hzSea.position.set(camera.position.x,TIDE,camera.position.z);
    const bg=scene.background;hzScene.background=bg;scene.background=null; // three clears to a scene's background colour whatever autoClear says (WebGLBackground forces it), so the main pass takes none while the horizon pass is under it
    renderer.autoClear=false;renderer.clear();renderer.render(hzScene,hzCam);renderer.clearDepth();renderer.render(scene,camera);renderer.autoClear=true;scene.background=bg;}
  else{if(sky.parent!==scene)scene.add(sky);renderer.render(scene,camera);}}
