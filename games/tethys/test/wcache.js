// test/wcache.js — the world cache (v11.214, src/wcache.js; cacheload.js): the game loaded against the stub in four processes. One builds the world as
// always and keeps what the cache would store; a second is handed that as its cache (window.__WCACHE, as cacheload.js leaves it) and must take both products
// from it and end with the maps and the caustic tiles the same to the bit; a third, on the low tier, takes its three rings from the high tier's five and must
// match a fourth that baked its own three. Also: the saves list never reads a world record as a slot. In --test (build.js SIDE).
'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process'),v8=require('v8');
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),'tethys-wcache-'));
if(process.argv[2]==='--child'){const role=process.argv[3],keepF=process.argv[4];
  const ROOT=path.join(__dirname,'..');
  const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
  const js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n')+
    '\nglobal.__C={WC,wmRaw,fmRaw,wfRaw,pgRaw,pfRaw,WM_DATA,FM_DATA,CAU_TEX,get CAU_GTEX(){return CAU_GTEX;},Q,saveRefresh,get saveList(){return saveList;},slotNot,storePut,storeOpen};';
  const tmp=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'tethys-wc-')),'bundle.js');fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
  const log=console.log;console.log=()=>{};console.warn=()=>{};require('./stub.js');
  if(role==='use'){const K=v8.deserialize(fs.readFileSync(keepF));const buf={};for(const k in K.blobs){const a=K.blobs[k];buf[k]=a.buffer.slice(a.byteOffset,a.byteOffset+a.byteLength);}global.__WCACHE={meta:K.meta,buf:buf};}
  const t0=process.hrtime.bigint();require(tmp);const ms=Number(process.hrtime.bigint()-t0)/1e6;const C=global.__C;
  let h=2166136261>>>0;const mix=a=>{const u=new Uint8Array(a.buffer,a.byteOffset,a.byteLength);for(let i=0;i<u.length;i+=7){h^=u[i];h=Math.imul(h,16777619)>>>0;}h^=u.length;h=Math.imul(h,16777619)>>>0;};
  for(const a of [C.wmRaw,C.fmRaw,C.wfRaw,C.pgRaw,C.pfRaw,C.WM_DATA,C.FM_DATA])mix(a);const maps=h.toString(16);h=2166136261>>>0;
  for(const r of C.CAU_TEX){mix(r.s.image.data);mix(r.c.image.data);mix(r.g.image.data);h^=r.n;h=Math.imul(h,16777619)>>>0;}mix(C.CAU_GTEX.image.data);const cau=h.toString(16);
  const out={maps:maps,cau:cau,rings:C.CAU_TEX.length,hit:C.WC.hit,ms:Math.round(ms)};
  if(role==='make'){const K=C.WC.keep;fs.writeFileSync(keepF,v8.serialize({meta:K.meta,blobs:K.blobs}));out.kept=Object.keys(K.blobs).length;out.mb=+(Object.values(K.blobs).reduce((s,a)=>s+a.byteLength,0)/1e6).toFixed(1);}
  if(role==='list'){C.storePut({id:'world:test',kind:'world',meta:{},blobs:{}},()=>{C.saveRefresh(()=>{out.listed=C.saveList.some(s=>s.id==='world:test'||s.slot==='world:test');out.read=C.slotNot.has('world:test');log(JSON.stringify(out));process.exit(0);});});return;}
  log(JSON.stringify(out));process.exit(0);}
const K=path.join(TMP,'keep.bin');
const run=(role,env)=>{const r=cp.spawnSync(process.execPath,[__filename,'--child',role,K],{encoding:'utf8',maxBuffer:1<<26,env:Object.assign({},process.env,env||{})});const line=(r.stdout||'').trim().split('\n').pop();try{return JSON.parse(line);}catch(e){return {err:(r.stderr||'').slice(0,500)};}};
let fails=0;const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++;};
const A=run('make'),B=run('use'),C=run('use',{TIER:'low'}),D=run('make',{TIER:'low'}),L=run('list'); // C reads A's five rings before D bakes its own three to compare
ok(A.kept>0&&!A.hit.maps&&!A.hit.cau,'built as always and kept for the cache: '+A.kept+' products, '+A.mb+' MB, the load '+A.ms+' ms'+(A.err?' — '+A.err:''));
ok(B.hit&&B.hit.maps&&B.hit.cau,'handed the cache: the maps and the caustics both taken from it, the load '+B.ms+' ms (built: '+A.ms+')'+(B.err?' — '+B.err:''));
ok(B.maps===A.maps&&B.cau===A.cau&&B.rings===A.rings,'the maps and the '+B.rings+' caustic rings the same to the bit ('+B.maps+', '+B.cau+')');
ok(C.hit&&C.hit.cau&&C.rings===3&&D.rings===3&&C.cau===D.cau&&C.maps===D.maps,'the low tier from the high tier\'s cache: its 3 rings of the 5, the same as its own bake ('+C.cau+' / '+D.cau+')');
ok(L.listed===false&&L.read===false,'the saves list neither lists nor reads a world record');
console.log(fails?fails+' FAILED':'wcache: ok');process.exit(fails?1:0);
