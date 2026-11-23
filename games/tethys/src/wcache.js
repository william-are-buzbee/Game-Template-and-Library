// wcache.js — the world cache (v11.214; analysis_loading.md §4.3 — the person, 22 Nov 2026: "Yes that acceptable for the world cache … We should do this now
// before the three.js update"): what the load builds the same way every time for one build of the code — the water and floor maps' first fill (far.js
// wmFill at step 4, then wmBlur; ~0.8 s of the load in Node) and the caustic tiles (scene.js; ~0.35 s) — kept in IndexedDB under `world:<the code's hash>`
// (build.js WH, stamped in tethys.html as TETHYS_BUILD.wh) and, on the next visit, read before the game's script starts (loader.js) and taken instead of
// computed. Each product's site asks for its buffers (wcBuf); given, it uses them; not, it computes as before. Either way it hands what it has to wcKeep, and
// when the boot ends (main.js bootIn, bootFinish) a world with anything computed is written whole (wcWrite) and every other build's deleted. dev.html, the
// benches and the tests carry no hash: they never read or write one. What is stored is a copy, never the arrays the game goes on changing.
const WORLD_P='world:'; // the store's key prefix for a world; the saves list never reads these (save.js saveRefresh)
const WC={c:(typeof window!=='undefined'&&window.__WCACHE)||null,hit:{maps:false,cau:false},keep:null,wrote:false};
if(typeof window!=='undefined'){window.__WCACHE=null;window.__wcache=WC;} // the buffers are ours now; __wcache: the tests (test/wcache_page.js)
function wcBuf(k){const c=WC.c;return c&&c.buf&&c.buf[k]?c.buf[k]:null;} // a stored product's ArrayBuffer, or null
function wcMeta(k){const c=WC.c;return c&&c.meta&&c.meta[k]!==undefined?c.meta[k]:null;}
function wcKeep(k,a,meta){if(!WC.keep)WC.keep={meta:{},blobs:{}};if(a)WC.keep.blobs[k]=a;if(meta!==undefined)WC.keep.meta[k]=meta;} // a typed array or ArrayBuffer to write (copied into a Blob at the write); meta: plain data
function wcWrite(){ // the boot's end: a world with anything computed this visit, written; the other builds' worlds deleted
  if(WC.wrote)return;WC.wrote=true;const B=typeof window!=='undefined'?window.TETHYS_BUILD:null,K=WC.keep;WC.keep=null;
  if(!B||!B.wh||!K||(WC.hit.maps&&WC.hit.cau))return;
  setTimeout(()=>{storeOpen(()=>{if(store.kind!=='idb')return; // localStorage could not hold it; the memory store would not keep it
    try{const blobs={};for(const k in K.blobs)blobs[k]=new Blob([K.blobs[k]]);const id=WORLD_P+B.wh;
      storePut({id:id,kind:'world',v:B.v,meta:K.meta,blobs:blobs},()=>{storeSums((sums,keys)=>{for(const k of keys)if(k.indexOf(WORLD_P)===0&&k!==id)storeOp('readwrite',os=>os.delete(k),()=>{});});});}
    catch(e){console.warn('the world cache: '+e.message);}});},0);}
