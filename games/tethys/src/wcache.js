// wcache.js — the world cache (v11.214; analysis_loading.md §4.3 — the person, 22 Nov 2026: "Yes that acceptable for the world cache … We should do this now
// before the three.js update"): what the load builds the same way every time for one build of the code — the water and floor maps' first fill (far.js
// wmFill at step 4, then wmBlur; ~0.8 s of the load in Node), the caustic tiles (scene.js; ~0.35 s) and, since v11.216, region.js's platform and saddles
// (~0.8 s; wcProduct, below) — kept in IndexedDB under `world:<the code's hash>`
// (build.js WH, stamped in tethys.html as TETHYS_BUILD.wh) and, on the next visit, read before the game's script starts (loader.js) and taken instead of
// computed. Each product's site asks for its buffers (wcBuf); given, it uses them; not, it computes as before. Either way it hands what it has to wcKeep, and
// when the boot ends (main.js bootIn, bootFinish) a world with anything computed is written whole (wcWrite) and every other build's deleted. dev.html, the
// benches and the tests carry no hash: they never read or write one. What is stored is a copy, never the arrays the game goes on changing.
const WORLD_P='world:'; // the store's key prefix for a world; the saves list never reads these (save.js saveRefresh)
const WC={c:(typeof window!=='undefined'&&window.__WCACHE)||null,hit:{maps:false,cau:false,plat:false,sad:false},keep:null,wrote:false}; // hit: each product taken from the cache this visit
if(typeof window!=='undefined'){window.__WCACHE=null;window.__wcache=WC;} // the buffers are ours now; __wcache: the tests (test/wcache_page.js)
function wcBuf(k){const c=WC.c;return c&&c.buf&&c.buf[k]?c.buf[k]:null;} // a stored product's ArrayBuffer, or null
function wcMeta(k){const c=WC.c;return c&&c.meta&&c.meta[k]!==undefined?c.meta[k]:null;}
function wcKeep(k,a,meta){if(!WC.keep)WC.keep={meta:{},blobs:{}};if(a)WC.keep.blobs[k]=a;if(meta!==undefined)WC.keep.meta[k]=meta;} // a typed array or ArrayBuffer to write (copied into a Blob at the write); meta: plain data
function wcWrite(){ // the boot's end: a world with anything computed this visit, written; the other builds' worlds deleted
  if(WC.wrote)return;WC.wrote=true;const B=typeof window!=='undefined'?window.TETHYS_BUILD:null,K=WC.keep;WC.keep=null;
  if(!B||!B.wh||!K||Object.keys(WC.hit).every(k=>WC.hit[k]))return;
  setTimeout(()=>{storeOpen(()=>{if(store.kind!=='idb')return; // localStorage could not hold it; the memory store would not keep it
    try{const blobs={};for(const k in K.blobs)blobs[k]=new Blob([K.blobs[k]]);const id=WORLD_P+B.wh;
      storePut({id:id,kind:'world',v:B.v,meta:K.meta,blobs:blobs},()=>{storeSums((sums,keys)=>{for(const k of keys)if(k.indexOf(WORLD_P)===0&&k!==id)storeOp('readwrite',os=>os.delete(k),()=>{});});});}
    catch(e){console.warn('the world cache: '+e.message);}});},0);}
// v11.216 (part two): a product that is one object of typed arrays and plain values — region.js's platform (rgPlatform, ~0.6 s of the load in Node) and
// saddles (rgSaddles, ~0.2 s). Kept as its keys in order, each a buffer of its own or a plain value in the meta; rebuilt by the product's own maker
// (rgPlatMake, rgSadMake), a literal, so the object read in sample()'s hot path has the shape it has when built — never one set key by key (CLAUDE.md:
// past a dozen keys set that way V8 may keep it as a dictionary). undefined: not stored; null: stored as none.
const WC_T={Float32Array:Float32Array,Float64Array:Float64Array,Int32Array:Int32Array,Uint32Array:Uint32Array,Int16Array:Int16Array,Uint16Array:Uint16Array,Int8Array:Int8Array,Uint8Array:Uint8Array};
function wcKeepObj(k,o){if(!o){wcKeep(k,null,{nul:true});return;}const f=[];for(const key in o){const v=o[key];if(ArrayBuffer.isView(v)&&WC_T[v.constructor.name]){f.push({k:key,t:v.constructor.name});wcKeep(k+'.'+key,v);}else f.push({k:key,v:v});}wcKeep(k,null,{f:f});}
function wcObj(k){const m=wcMeta(k);if(!m)return undefined;if(m.nul)return null;const o={};
  for(const f of m.f){if(f.t){const b=wcBuf(k+'.'+f.k),T=WC_T[f.t];if(!b||!T)return undefined;o[f.k]=new T(b);}else o[f.k]=f.v;}return o;}
function wcProduct(k,make,build){const c=wcObj(k);if(c!==undefined){WC.hit[k]=true;return c&&make(c);}const o=build();wcKeepObj(k,o);return o;} // the product from the cache through make, or built and kept
