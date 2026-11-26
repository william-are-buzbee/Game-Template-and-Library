// test/vsplit.js — a split species' two pools (v11.242, grow.js VSPLIT, chunks.js poolSplit): the same instances as one pool, to the bit. The stub has no
// WebGL2, so no species is pulled and none is split: here every pooled species with variants is given a stand-in split (its own geometry for the light
// pool's, variant 2 the heavy one, as the strap's and the tress's are), and three places loaded twice — the forest's shelf, test/pool.js's, the work
// tower's F8 meadow (#208) — once whole and once split. Every cell's instances of every species (matrix, tint, variant, current, tide) must be the same
// set both times (the rng drawn in the list's order: a slip moves every later species' tints), each in the pool of its variant's weight. The pictures,
// and what it saved, are the browser's (test/gpu.js, test/fill.js; CHANGELOG v11.242). In --test (build.js SIDE).
'use strict';
const fs=require('fs'),path=require('path'),os=require('os');
const ROOT=path.join(__dirname,'..');
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
const js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n')+
  '\nglobal.__V={POOLS,FLORA,loadChunkNow,worldClear,cellOf,chunks};';
const tmp=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'tethys-vsplit-')),'bundle.js');fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
const log=console.log;console.log=()=>{};console.warn=()=>{};process.env.PICK='0';require('./stub.js');require(tmp);console.log=log;
const X=global.__V;let fails=0;const ok=(c,m)=>{log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++;};
const HEAVY=1<<2,places=[[330,0],[147,-443],[69950,29582]];
const split=X.FLORA.filter(f=>f.geo&&f.vars&&f.vars.length===3&&!f.card&&!f.pads&&f.mat);
function load(on){for(const f of split){if(on){f.gp=f.geo;f.mp=f.mat;f.split={geo:f.geo,heavy:HEAVY,key:{id:f.id+' (light)'}};}else{delete f.gp;delete f.mp;delete f.split;}}
  const out=new Map();let n=0;
  for(const [x,z] of places){const ci=X.cellOf(x),cj=X.cellOf(z);X.worldClear();for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++)X.loadChunkNow(ci+di,cj+dj);
    for(const [K,P] of X.POOLS){const M=P.im.instanceMatrix.array,C=P.im.instanceColor.array,G=P.geo.attributes,V=P.vars?G.aVar.array:null,A=P.cur?G.aCur.array:null,B=P.cur?G.aTide.array:null;
      const light=K!==P.f;
      for(const b of P.blocks)for(let k=b.start;k<b.start+b.count;k++){const v=V?V[k]:0;
        const key=x+','+z+' '+b.ch.k+' '+P.f.id,s=Array.from(M.subarray(k*16,k*16+16)).join(',')+'|'+C[k*3]+','+C[k*3+1]+','+C[k*3+2]+'|'+v+(A?'|'+A[k*2]+','+A[k*2+1]+','+B[k*2]+','+B[k*2+1]:'');
        if(on&&P.f.split&&(light===!!((HEAVY>>v)&1)))wrong.push(P.f.id+': variant '+v+' in its '+(light?'light':'heavy')+' pool');
        if(!out.has(key))out.set(key,[]);out.get(key).push(s);n++;}}}
  for(const a of out.values())a.sort();return {out,n};}
const wrong=[];
const a=load(false),a2=load(false),b=load(true);
const same=(p,q)=>{if(p.out.size!==q.out.size)return 'cells×species '+p.out.size+' against '+q.out.size;for(const [k,v] of p.out){const w=q.out.get(k);if(!w||w.length!==v.length)return k+': '+v.length+' against '+(w?w.length:0);for(let i=0;i<v.length;i++)if(v[i]!==w[i])return k+': instance '+i+' differs';}return '';};
let pools=0,lights=0;for(const [K,P] of X.POOLS){pools++;if(K!==P.f)lights++;}
ok(split.length>5&&lights>3,split.length+' species given a stand-in split; '+lights+' light pools of '+pools+' at the last place');
ok(same(a,a2)==='','the whole pools load the same twice ('+a.n+' instances) — the comparison is fair'+(same(a,a2)?' — '+same(a,a2):''));
const d=same(a,b);ok(d==='','split: every cell\'s instances of every species the same set as whole ('+b.n+' against '+a.n+'), the rng where it was'+(d?' — '+d:''));
ok(wrong.length===0,'every instance in the pool of its variant\'s weight'+(wrong.length?' — '+wrong.slice(0,3).join('; '):''));
log(fails?fails+' FAILED':'vsplit: ok');process.exit(fails?1:0);
