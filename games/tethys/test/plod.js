// test/plod.js — the plants' light copies' bookkeeping (v11.241, chunks.js poolPlod, poolCull, poolPack; grow.js PLOD). The stub has no WebGL2, so no species
// is pulled and none has a copy: here a few pooled species are given a stand-in (their own geometry and material as the copy's) and Q.lod set, the forest's
// shelf loaded, and the camera swum across it and held still. After every frame, for every pool with a copy: each block's flags are its state's (0 near,
// 1 far, AHIDE hidden); no instance of a far block is nearer the camera than Q.lod less the hysteresis; every seen instance is drawn by exactly one of the
// two meshes (the whole plant draws [0, nNear) and shows 0, the copy [0, nDraw) and shows 1); the counts are the blocks'; once still, the blocks are packed
// near, far, hidden. And the copies' build itself on the real three (grow.js plodVariants: the same plant, fewer facets) is test/gpu.js's and the
// pictures' (CHANGELOG v11.241). In --test (build.js SIDE).
'use strict';
const fs=require('fs'),path=require('path'),os=require('os');
const ROOT=path.join(__dirname,'..');
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
const js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n')+
  '\nglobal.__P={POOLS,poolCull,chunks,camera,Q,PLOD_HYS,FLORA,loadChunkNow,worldClear,cellOf,AHIDE,ORIGIN,POOL_CALM};';
const tmp=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'tethys-plod-')),'bundle.js');fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
const log=console.log;console.log=()=>{};console.warn=()=>{};process.env.PICK='0';require('./stub.js');require(tmp);console.log=log;
const X=global.__P;let fails=0;const ok=(c,m)=>{log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++;};
X.Q.lod=45;let given=0;for(const f of X.FLORA)if(f.geo&&!f.card&&!f.pads&&f.mat&&f.mat.sway){f.gpL=f.geo;f.mpL=f.mat;given++;} // a stand-in copy for every swaying species: its own geometry and material
const ci=X.cellOf(330),cj=X.cellOf(0);X.worldClear();for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++)X.loadChunkNow(ci+di,cj+dj);
for(const ch of X.chunks.values()){ch.group.visible=true;ch.near=true;}
const pools=[...X.POOLS.values()].filter(P=>P.plod);
ok(given>5&&pools.length>5,given+' species given a stand-in copy; '+pools.length+' pools drawing one');
let bad=[],frames=0,farSeen=0,nearSeen=0;
function check(tag){const c=X.camera.position;
  for(const P of pools){const B=P.blocks,H=P.geo.attributes.aHide.array,M=P.im.instanceMatrix.array;let nv=0,nf=0,endN=0,endD=0;
    for(const b of B){const want=b.vis?(b.far?1:0):X.AHIDE;for(let k=b.start;k<b.start+b.count;k++)if(H[k]!==want){bad.push(tag+' '+P.f.id+': flag '+H[k]+' at '+k+', its block '+want);break;}
      if(b.vis){nv+=b.count;endD=b.start+b.count;if(b.far){nf+=b.count;farSeen+=b.count;for(let k=b.start;k<b.start+b.count;k++){const x=M[k*16+12]+X.ORIGIN.x,y=M[k*16+13],z=M[k*16+14]+X.ORIGIN.z,d=Math.hypot(x-c.x,y-c.y,z-c.z);if(d<X.Q.lod-X.PLOD_HYS-1e-6){bad.push(tag+' '+P.f.id+': a copy at '+d.toFixed(1)+' m');break;}}}else{nearSeen+=b.count;endN=b.start+b.count;}}}
    if(nv!==P.nVis||nf!==P.nFar||endN!==P.nNear||endD!==P.nDraw||P.im.count!==P.nNear)bad.push(tag+' '+P.f.id+': counts vis '+nv+'/'+P.nVis+' far '+nf+'/'+P.nFar+' near end '+endN+'/'+P.nNear+' draw end '+endD+'/'+P.nDraw+' whole draws '+P.im.count);}}
// swim across the shelf's middle cell and back, then hold still past the calm
const path_=[];for(let i=0;i<=60;i++)path_.push([330-60+i*2,-10,0+i*1.5]);for(let i=60;i>=0;i--)path_.push([330-60+i*2,-10,0+i*1.5]);
for(const p of path_){X.camera.position.set(p[0],p[1],p[2]);X.poolCull(1/60);frames++;check('frame '+frames);}
for(let i=0;i<60;i++){X.poolCull(1/60);frames++;check('still '+i);}
let packed=true;for(const P of pools){let st=0;for(const b of P.blocks){const s=b.vis?(b.far?1:0):2;if(s<st){packed=false;break;}st=s;}}
ok(bad.length===0,frames+' frames swum and held: flags, the copies past '+X.Q.lod+' − '+X.PLOD_HYS+' m, every seen instance drawn once, the counts'+(bad.length?' — '+bad.slice(0,4).join('; '):''));
ok(farSeen>0&&nearSeen>0,'both meshes drew: '+nearSeen+' near and '+farSeen+' far instance-frames');
ok(packed,'still past '+X.POOL_CALM+' s: every pool packed near, far, hidden');
log(fails?fails+' FAILED':'plod: ok');process.exit(fails?1:0);
