// save.js — the save files and the profile (v11.47, the person's ask): a slot is a whole game — the player, the clock, the world's ledger — kept
// in the browser's IndexedDB (localStorage where it is missing, memory in the tests), one record a game, with the profile beside them: the
// creator's key, what has been seen (species, clades, cores, part styles — the creator offers only those, lab.js) and the creator's own saved
// creatures. The browser is asked to keep the store (navigator.storage.persist), and any slot or the creatures can be written out as a .json
// file and read back in (fileSave/filePick), so nothing depends on the browser keeping it. The world outside the loaded cells *is* the ledger
// (ecology.js POP), so a save is the ledger's five tables and the clock; the loaded cells are counted into the tables as the tick counts them
// (the living, and the eggs). What a cell drew — carcasses, wounds, a school's shape — is not kept, as it is not kept across an unload either.
// A save is written every SAVE_EVERY seconds of play (in slices, v11.196: saveSoon), on leaving to the menu (menu.js toMenu) and when the page is hidden.
const SAVE_V=4,SAVE_EVERY=30,SEEN_R=30; // the record format's version (4, v11.196: the ledger in binary streams, `pop.bin`; a 3 has v11.58's arrays of runs and loads as it did. 2, v11.68: the player's spec on the record; a 1 has only the clade id and loads as its preset. 3, v11.69: the line — line.js — and `over`, the save ended; an older record's animal is its line's founder); seconds of play between autosaves; m: a species drawn nearer than this in play is seen
// ---------- the store ----------
// Callbacks, not promises: the localStorage and memory backends answer synchronously, which is what the headless tests need (their frames are
// driven by hand and no microtask ever runs between them); IndexedDB answers when it does.
const store={kind:'',db:null,mem:null}; // kind: 'idb' | 'ls' | 'mem'
function storeOpen(cb){
  if(store.kind)return cb();
  const idb=window.indexedDB;
  if(idb){try{const rq=idb.open('tethys',1);rq.onupgradeneeded=()=>{rq.result.createObjectStore('kv',{keyPath:'id'});};rq.onsuccess=()=>{store.db=rq.result;store.kind='idb';cb();};rq.onerror=()=>{storeFallback();cb();};
    try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});}catch(e){}return;}catch(e){}}
  storeFallback();cb();
}
function storeFallback(){store.kind=window.localStorage?'ls':'mem';store.mem=new Map();}
function storeOp(mode,fn,cb){try{const tx=store.db.transaction('kv',mode),rq=fn(tx.objectStore('kv'));rq.onsuccess=()=>cb(rq.result);rq.onerror=()=>cb(undefined);}catch(e){cb(undefined);}}
function kvSync(op,id,rec){ // the localStorage and memory backends
  if(store.kind==='mem'){const m=store.mem;if(op==='all')return Array.from(m.values());if(op==='keys')return Array.from(m.keys());if(op==='sums')return Array.from(m.values()).filter(r=>r&&r.kind==='sum');if(op==='get')return m.get(id);if(op==='put')m.set(rec.id,rec);else m.delete(id);return;}
  const ls=window.localStorage,P='tethys.kv.';
  try{if(op==='all'||op==='keys'||op==='sums'){const out=[];for(let i=0;i<ls.length;i++){const k=ls.key(i);if(k.indexOf(P)!==0)continue;if(op==='keys')out.push(k.slice(P.length));else if(op==='all'||k.indexOf(P+SUM_P)===0)out.push(JSON.parse(ls.getItem(k)));}return out;} // keys and sums parse no slot
    if(op==='get'){const s=ls.getItem(P+id);return s?JSON.parse(s):undefined;}if(op==='put')ls.setItem(P+rec.id,slotJSON(rec));else ls.removeItem(P+id);}catch(e){return op==='all'?[]:undefined;}
}
// ---------- the slots and their summaries (v11.195) ----------
// The person, 21 Nov 2026 (a report from home, #141–142: a 2.3 s freeze seconds into play and ~2 s on the menu, Chrome laying 6 s of long frames on
// IndexedDB's success callbacks): the menu's list read every slot whole — getAll, the ledger's tables and all — to show a name and a time, at the boot,
// on every return to the menu and in a new game's first seconds. Now each slot has a summary beside it, `sum:<id>` (slotSum: what the list shows and
// continue chooses by), written in the slot's own transaction (slotPut, slotDel), and the list reads the summaries alone (a key range) and the
// store's keys (storeSums); a slot is read whole only to open or export it (slotGet). A slot with no summary — every save from before — gets one
// the first time the list meets it: its one whole read, once. Nothing is removed but by delete; an older build reads the summaries as not saves.
const SUM_P='sum:';
function slotSum(r){const L=Array.isArray(r.line)?r.line:null,D=Array.isArray(r.deaths)?r.deaths:[];
  return {id:SUM_P+r.id,kind:'sum',slot:r.id,name:String(r.name||''),made:+r.made||0,played:+r.played||0,playT:+r.playT||0,clade:String(r.clade||''),specId:r.spec&&typeof r.spec.id==='string'?r.spec.id:'',gens:L?L.length:0,over:!!r.over,dead:D.length,cause:D.length?String(D[D.length-1].cause||''):'',pos:Array.isArray(r.pos)?r.pos.slice(0,3).map(v=>+v||0):null};}
function slotEntry(s){return {id:s.slot,name:s.name,made:s.made,played:s.played,playT:s.playT,clade:s.clade,specId:s.specId,gens:s.gens,over:s.over,dead:s.dead,cause:s.cause,pos:s.pos};} // the list's: the slot's id, the summary's fields
function slotPut(rec,cb){const s=slotSum(rec);storeOpen(()=>{if(store.kind==='idb'){let done=false;const end=()=>{if(!done){done=true;if(cb)cb();}};
    try{const tx=store.db.transaction('kv','readwrite'),os=tx.objectStore('kv');try{os.put(slotPack(rec));}catch(e){os.put(rec);} // v11.196: the streams as Blobs; a browser that will not store one gets the arrays
      os.put(s);tx.oncomplete=end;tx.onerror=end;tx.onabort=end;}catch(e){console.warn('save: '+e.message);end();}}
  else{kvSync('put',rec.id,rec);kvSync('put',s.id,s);if(cb)cb();}});}
function slotDel(id,cb){storeOpen(()=>{if(store.kind==='idb'){let done=false;const end=()=>{if(!done){done=true;if(cb)cb();}};
    try{const tx=store.db.transaction('kv','readwrite'),os=tx.objectStore('kv');os.delete(id);os.delete(SUM_P+id);tx.oncomplete=end;tx.onerror=end;tx.onabort=end;}catch(e){end();}}
  else{kvSync('del',id);kvSync('del',SUM_P+id);if(cb)cb();}});}
function slotGet(id,cb){storeGet(id,r=>{if(r&&r.kind==='save'&&r.pop)slotUnpack(r,cb);else cb(null);});} // a slot whole, or null (v11.196: its Blobs read back first)
function storeSums(cb){storeOpen(()=>{ // the summaries and every key (no slot read): cb(sums, keys)
  if(store.kind!=='idb'){cb(kvSync('sums')||[],kvSync('keys')||[]);return;}
  try{const tx=store.db.transaction('kv','readonly'),os=tx.objectStore('kv'),R=window.IDBKeyRange,a=os.getAll(R.bound(SUM_P,SUM_P+'\uffff')),k=os.getAllKeys();let done=false;
    tx.oncomplete=()=>{if(!done){done=true;cb(a.result||[],(k.result||[]).map(String));}};tx.onerror=tx.onabort=()=>{if(!done){done=true;cb([],[]);}};}catch(e){cb([],[]);}});}
function storeGet(id,cb){storeOpen(()=>{if(store.kind==='idb')storeOp('readonly',os=>os.get(id),cb);else cb(kvSync('get',id));});}
function storePut(rec,cb){storeOpen(()=>{if(store.kind==='idb')storeOp('readwrite',os=>os.put(rec),()=>{if(cb)cb();});else{kvSync('put',rec.id,rec);if(cb)cb();}});}
// a file out and a file in: the browser's download, and a file picker; both only on a click
function fileSave(name,txt){try{const a=document.createElement('a');a.href=window.URL.createObjectURL(new Blob([txt],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(()=>{window.URL.revokeObjectURL(a.href);},2000);}catch(e){console.warn('save: could not write the file: '+e.message);}}
function filePick(cb){try{const i=document.createElement('input');i.type='file';i.accept='.json,application/json';i.onchange=()=>{const f=i.files&&i.files[0];if(!f)return;const r=new window.FileReader();r.onload=()=>{cb(String(r.result));};r.readAsText(f);};i.click();}catch(e){console.warn('save: could not read a file: '+e.message);}}
function escH(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));} // a name into markup
// ---------- the profile ----------
const PROFILE={id:'profile',kind:'profile',creator:false,seen:{sp:[],cl:[],co:[],pt:[]},creatures:{}}; // creator: the menu shows the creator; seen: species ids, clades, core kinds, part kind:style; creatures: the creator's saved specs, JSON by name
let profileDirty=false,profileLoaded=false;const seenSpecs=new Set(); // nothing is written before the stored profile is read (main.js profileLoad): a write first would empty the seen lists
function profileLoad(cb){storeGet('profile',r=>{if(r){if(r.creator)PROFILE.creator=true;if(r.seen)for(const k in PROFILE.seen)if(Array.isArray(r.seen[k]))for(const v of r.seen[k])if(typeof v==='string'&&PROFILE.seen[k].indexOf(v)<0)PROFILE.seen[k].push(v);if(r.creatures&&typeof r.creatures==='object')for(const k in r.creatures)if(typeof r.creatures[k]==='string'&&!(k in PROFILE.creatures))PROFILE.creatures[k]=r.creatures[k];}for(const id of PROFILE.seen.sp){seenSpecs.add(id);const sp=SPECS[id];if(sp)for(const p of sp.parts){const v=p.kind+':'+(p.style||'');if(PROFILE.seen.pt.indexOf(v)<0){PROFILE.seen.pt.push(v);profileDirty=true;}}}profileLoaded=true;if(profileDirty)profileSave();if(cb)cb();});} // the seen species' parts re-read (v11.70.1): a style renamed or split since (the hingeshells' spines are thorns) is seen under its new name
function profileSave(){if(!profileLoaded){profileDirty=true;return;}profileDirty=false;storePut(JSON.parse(JSON.stringify(PROFILE)));}
function seeSpec(id){ // a species seen up close (creatures_ai, and the player's own clade): it, its clade, its core and each part's kind:style are the creator's from here
  if(seenSpecs.has(id))return;const sp=SPECS[id];if(!sp)return;seenSpecs.add(id);const S=PROFILE.seen,add=(a,v)=>{if(a.indexOf(v)<0)a.push(v);};
  add(S.sp,id);add(S.cl,sp.clade);add(S.co,sp.core.kind);for(const p of sp.parts)add(S.pt,p.kind+':'+(p.style||''));profileDirty=true;
}
function seen(k,v){return PROFILE.seen[k].indexOf(v)>=0;}
function grantCreator(){if(PROFILE.creator)return;PROFILE.creator=true;profileSave();if(profileLoaded)menuRefresh();} // the lab used once, or #creator in the URL (main.js); the menu's word appears
// ---------- the record ----------
let curSave=null,saveT=0,playT=0,saveList=[]; // the slot being played {id,name,made,played,playT}; the autosave clock; seconds played in it; the slots known to the menu, newest played first
function r3(v){return Math.round(v*1000)/1000;}
// The tables to v11.194 were run-length coded as arrays (v11.58, rle: a run of k equal values [v,k], a lone value itself); a record of then is
// read by popLoad still (unrle; a raw array, an older record, decodes as itself). test/ledger.js writes records of that form to load them.
function unrle(a){if(!Array.isArray(a))return null;const o=[];for(const t of a){if(Array.isArray(t)){for(let k=0;k<t[1];k++)o.push(t[0]);}else o.push(t);}return o;}
// ---------- the ledger in binary, and a save in slices (v11.196) ----------
// The person's home report (#143, 23 min of play): every save in play stalled the frame ~160 ms — 60 long frames on the pointer's release alone,
// and the autosave each SAVE_EVERY. The ledger was the cost: popRows walked every table (49 kinds × 61,696 cells × five, and the patches' four
// × 46,200 — 24M values) into arrays of runs, a quarter of a second here on a fresh world, and IndexedDB's put copied those arrays one by one
// (1.3 s here at a long game's density). Now a table is one stream of runs in two typed arrays, every kind of it end to end (`v` the values at
// the save's rounding, r3's; `c` the run lengths), which the put copies whole; and a save in play (saveSoon: the autosave, the pointer's
// release, a clutch, a child) walks the tables POP_SLICE values a frame (popJob, popStep) instead of all at once. saveNow is still the whole
// save at once, where one is needed now: to the menu, the page hidden or going, a new game.
const POP_Q=1000,POP_SLICE=1<<19; // the save's rounding (1/POP_Q, as r3); the values a save in slices walks a frame (~1 ms here)
function encNew(){return {v:new Float32Array(1024),c:new Uint32Array(1024),m:0,q:0,run:0,x:NaN};}
function encGrow(E){const v=new Float32Array(E.v.length*2),c=new Uint32Array(E.c.length*2);v.set(E.v);c.set(E.c);E.v=v;E.c=c;}
function encRun(E,a,i0,i1){ // a[i0..i1) onto E's runs: values equal at the save's rounding are one run; x, the last value as it is, skips the rounding along a run
  let x=E.x,q=E.q,run=E.run,m=E.m,V=E.v,C=E.c;
  for(let i=i0;i<i1;i++){const y=a[i];if(y===x){run++;continue;}x=y;const r=Math.round(y*POP_Q);if(r===q&&run>0){run++;continue;}
    if(run>0){if(m===V.length){E.m=m;encGrow(E);V=E.v;C=E.c;}V[m]=q/POP_Q;C[m]=run;m++;}q=r;run=1;}
  E.x=x;E.q=q;E.run=run;E.m=m;}
function encVal(E,y){const r=Math.round(y*POP_Q);E.x=NaN; // one value not from the table (a loaded cell's count); x forgotten, so the table's next value is rounded
  if(r===E.q&&E.run>0){E.run++;return;}if(E.run>0){if(E.m===E.v.length)encGrow(E);E.v[E.m]=E.q/POP_Q;E.c[E.m]=E.run;E.m++;}E.q=r;E.run=1;}
function encEnd(E){if(E.run>0){if(E.m===E.v.length)encGrow(E);E.v[E.m]=E.q/POP_Q;E.c[E.m]=E.run;E.m++;E.run=0;}return {v:E.v.slice(0,E.m),c:E.c.slice(0,E.m)};}
function popJob(){ // a save's ledger, to be walked (popStep): the tables in order, `done` before the counts — a cell or patch whose census lands while the save
  // walks is saved undone, and censused again at the load; the loaded cells' counts are the living and the eggs, as the tick counts them (ov)
  const K=SPAWN.length,P=ECO_PT,T=[['done',[POP.done]],['n',POP.n],['k',POP.k],['ke',POP.ke],['cd',POP.cd],['ow',POP.ow]];
  if(P.on)for(const k of ['done','n','k','ke','cd'])T.push(['pt.'+k,k==='done'?[P.done]:P[k]]);
  const ov=[];for(const ch of chunks.values()){const c=ecoId(ch.i,ch.j);if(c<0||!POP.done[c])continue;const cnt=new Float32Array(K);for(const o of ch.creatures)if(o.alive&&o.ent>=0)cnt[o.ent]+=1;for(const g of ch.eggs)if(g.ent>=0)cnt[g.ent]+=g.n;
    for(let ei=0;ei<K;ei++)cnt[ei]/=Q.creatures;ov.push({c,cnt});}
  ov.sort((x,y)=>x.c-y.c);
  return {T,t:0,e:0,i:0,oi:0,E:encNew(),out:{},ov,blob:store.kind==='idb'&&typeof Blob!=='undefined', /* a save in slices (saveSoon) packs as it goes; popBin does not */bp:P.on?P.bp.slice():null,last:POP.last,tally:[POP.births,POP.deaths,POP.kills,POP.starved,POP.eaten,POP.recruits,POP.laid,POP.hatched]};}
function popStep(J,budget){ // J walked up to `budget` values; true when every table is
  const T=J.T,ov=J.ov;
  while(J.t<T.length){const name=T[J.t][0],A=T[J.t][1],a=A[J.e],n=a.length,live=name==='n'&&ov.length>0;
    while(J.i<n){if(budget<=0)return false;let i1=Math.min(n,J.i+budget);
      if(live){while(J.oi<ov.length&&ov[J.oi].c<J.i)J.oi++;if(J.oi<ov.length&&ov[J.oi].c<i1)i1=ov[J.oi].c;}
      encRun(J.E,a,J.i,i1);budget-=i1-J.i;J.i=i1;
      if(live&&J.oi<ov.length&&ov[J.oi].c===J.i&&J.i<n){encVal(J.E,ov[J.oi].cnt[J.e]);J.i++;J.oi++;budget--;}}
    J.i=0;J.oi=0;J.e++;if(J.e>=A.length){const S=encEnd(J.E);J.out[name]=J.blob?runsBlob(S):S;J.E=encNew();J.e=0;J.t++;}} // blob: IndexedDB's form, made here a table at a time (slotPack)
  return true;}
function popOut(J){const o=J.out,P=ECO_PT; // the walked ledger as the record's `pop`
  return {ents:SPAWN.map(e=>e.kind),bin:1,cells:ECO_CELLS,n:o.n,k:o.k,ke:o.ke,cd:o.cd,ow:o.ow,done:o.done,
    pt:P.on?{np:P.np,n:o['pt.n'],k:o['pt.k'],ke:o['pt.ke'],cd:o['pt.cd'],done:o['pt.done'],bp:Array.from(J.bp),w:[WORLD.i0,WORLD.i1,WORLD.j0,WORLD.j1]}:undefined, // w: the world the patches tile (v11.115)
    last:J.last,tally:J.tally};}
function popBin(){const J=popJob();J.blob=false;popStep(J,Infinity);return popOut(J);} // the whole ledger at once, as typed arrays (a record the shadow or a file writes as text; slotPut packs it for IndexedDB)
function runsOk(S,tot){ // a stream of runs that fills exactly tot values
  if(!S||!S.v||!S.c||S.v.length!==S.c.length)return false;let sum=0;for(let r=0;r<S.c.length;r++){const k=S.c[r];if(!(k>0)||k!==Math.floor(k))return false;sum+=k;}return sum===tot;}
function runsInto(S,A,n){let t=0,i=0;for(let r=0;r<S.v.length;r++){const v=+S.v[r];let k=S.c[r];while(k>0){const w=Math.min(k,n-i);A[t].fill(v,i,i+w);i+=w;k-=w;if(i===n){t++;i=0;}}}} // into A's tables, each n long, end to end (runsOk first)
function runsArr(S,K,n){if(!runsOk(S,K*n))return null;const A=[];for(let i=0;i<K;i++)A.push(new Float32Array(n));runsInto(S,A,n);return A;}
function slotJSON(r){return JSON.stringify(r,(k,v)=>v instanceof Float32Array?Array.from(v,r3):v instanceof Uint32Array?Array.from(v):v);} // a record as text (the localStorage store, the shadow, an export): the streams as plain arrays, which popLoad reads as well
// IndexedDB copies a record's typed arrays on the main thread at the put (~2.6 ms a MB here: a long game's 6.7 MB of streams 17 ms, all in the
// save's last frame); a Blob it takes by reference (0.2 ms at any size; making one ~0.6 ms a MB). So in IndexedDB a slot's streams are Blobs
// (slotPack at the put; a save in slices makes each table's as it finishes it, popStep), and slotGet reads them back into the typed arrays
// (slotUnpack) before anything sees the record. The memory and localStorage backends keep the arrays as they are.
function runsBlob(S){if(!S||S.b)return S;const v=S.v instanceof Float32Array?S.v:Float32Array.from(S.v),c=S.c instanceof Uint32Array?S.c:Uint32Array.from(S.c);return {b:new Blob([v,c]),m:v.length};}
function popStreams(p){const L=[];if(!p||!p.bin)return L;for(const k of ['n','k','ke','cd','ow','done'])L.push([p,k]);if(p.pt)for(const k of ['n','k','ke','cd','done'])L.push([p.pt,k]);return L;}
function slotPack(r){if(!r||!r.pop||!r.pop.bin||typeof Blob==='undefined')return r;const pop=Object.assign({},r.pop);if(pop.pt)pop.pt=Object.assign({},pop.pt);
  for(const [o,k] of popStreams(pop))o[k]=runsBlob(o[k]);return Object.assign({},r,{pop});}
function slotUnpack(r,cb){const L=popStreams(r&&r.pop).filter(([o,k])=>o[k]&&o[k].b);if(!L.length){cb(r);return;}let left=L.length;
  for(const [o,k] of L){const S=o[k];S.b.arrayBuffer().then(buf=>{const m=S.m;o[k]=buf.byteLength===8*m?{v:new Float32Array(buf,0,m),c:new Uint32Array(buf,4*m,m)}:null;},()=>{o[k]=null;}) // a stream that cannot be read: popLoad finds it missing, and the world starts fresh
    .then(()=>{if(--left===0)cb(r);});}}
function popLoad(p){ // the ledger from a record; a save from another roster (SPAWN's kinds differ) gets a fresh census instead, and the player and the clock still load
  ecoReset();
  const D={},bin=!!(p&&p.bin),K=SPAWN.length;let ok=p&&Array.isArray(p.ents)&&p.ents.length===K&&p.ents.every((k,i)=>k===SPAWN[i].kind);
  if(ok&&bin)ok=p.cells===ECO_CELLS&&['n','k','ke','cd','ow'].every(k=>runsOk(p[k],K*ECO_CELLS))&&runsOk(p.done,ECO_CELLS); // v11.196: the streams, checked whole before any is read in
  else if(ok)for(const k of ['n','k','ke','cd','ow']){const T=Array.isArray(p[k])&&p[k].length===SPAWN.length?p[k].map(unrle):null;if(!T||!T.every(a=>a&&(a.length===ECO_CELLS||a.length===ECO_FINE))){ok=false;break;}D[k]=T;} // ECO_FINE: a save from before v11.106, when the box was the world and there were no slots — the same cells, the slots empty
  if(ok&&!bin){D.done=unrle(p.done);if(!D.done||(D.done.length!==ECO_CELLS&&D.done.length!==ECO_FINE))ok=false;}
  if(!ok){if(p)console.warn('save: the roster or the world changed since this save; the world starts fresh');return false;}
  if(bin){for(const k of ['n','k','ke','cd','ow'])runsInto(p[k],POP[k],ECO_CELLS);runsInto(p.done,[POP.done],ECO_CELLS);}
  else{for(let ei=0;ei<SPAWN.length;ei++){POP.n[ei].set(D.n[ei]);POP.k[ei].set(D.k[ei]);POP.ke[ei].set(D.ke[ei]);POP.cd[ei].set(D.cd[ei]);POP.ow[ei].set(D.ow[ei]);}POP.done.set(D.done);}
  POP.last=+p.last||0;const T=Array.isArray(p.tally)?p.tally:[];[POP.births,POP.deaths,POP.kills,POP.starved,POP.eaten,POP.recruits,POP.laid,POP.hatched]=[0,1,2,3,4,5,6,7].map(i=>+T[i]||0);
  // the coarse patches (v11.105): from the record if it has them whole, else the load pass of the paper census does them again (v11.106)
  // v11.115: a save's patches tile the world it was made in (pt.w; v11.106–113's ±70.5 km square, WORLD70, when it has none), each moved to
  // the same cells' patch in this one; a patch past this world's edge is dropped
  if(ECO_PT.on&&p.pt){const P=ECO_PT,q=p.pt,T={},sw=Array.isArray(q.w)&&q.w.length===4&&q.w.every(Number.isInteger)?q.w:[WORLD70.i0,WORLD70.i1,WORLD70.j0,WORLD70.j1],snz=Math.ceil((sw[3]-sw[2])/PATCH),snp=Math.ceil((sw[1]-sw[0])/PATCH)*snz;
    const mv=x=>{const i=sw[0]+Math.floor(x/snz)*PATCH,j=sw[2]+(x%snz)*PATCH;return gridIn(i,j)&&(i-WORLD.i0)%PATCH===0&&(j-WORLD.j0)%PATCH===0?ecoPOf(i,j):-1;}; // the saved patch x's place in this world
    let good=Array.isArray(q.bp)&&q.bp.length===ECO_SLOTS&&snp>0&&snp<1e7;
    for(const k of ['n','k','ke','cd']){T[k]=!good?null:bin?runsArr(q[k],K,snp):Array.isArray(q[k])&&q[k].length===K?q[k].map(unrle):null;if(!T[k]||!T[k].every(a=>a&&a.length===snp))good=false;} // v11.196: a binary record's streams decoded to the same tables
    const dn=!good?null:bin?(runsArr(q.done,1,snp)||[null])[0]:unrle(q.done);if(!dn||dn.length!==snp)good=false;
    if(good){const to=new Int32Array(snp);for(let x=0;x<snp;x++)to[x]=mv(x);
      for(let ei=0;ei<SPAWN.length;ei++)for(let x=0;x<snp;x++){const y=to[x];if(y<0)continue;P.n[ei][y]=T.n[ei][x]>=0?T.n[ei][x]:0;P.k[ei][y]=T.k[ei][x];P.ke[ei][y]=T.ke[ei][x];P.cd[ei][y]=T.cd[ei][x];}
      for(let x=0;x<snp;x++)if(to[x]>=0)P.done[to[x]]=dn[x];
      P.blk.fill(-1);P.free=[];for(let s2=ECO_SLOTS-1;s2>=0;s2--){const p0=q.bp[s2],pp=Number.isInteger(p0)&&p0>=0&&p0<snp?to[p0]:-1;if(pp>=0&&P.coarse[pp]&&P.blk[pp]<0){P.bp[s2]=pp;P.blk[pp]=s2;}else{P.bp[s2]=-1;P.free.push(s2);const c0=ECO_FINE+s2*64;POP.done.fill(0,c0,c0+64);for(let ei=0;ei<SPAWN.length;ei++){POP.n[ei].fill(0,c0,c0+64);POP.ow[ei].fill(0,c0,c0+64);}}} /* a free slot holds nothing (v11.115: its patch may be past this world's edge) */
      for(let ei=0;ei<SPAWN.length;ei++){P.cells[ei].length=0;P.mark[ei].fill(0);for(let x=0;x<P.np;x++)if(P.k[ei][x]>0||P.n[ei][x]>0){P.mark[ei][x]=1;P.cells[ei].push(x);}}}}
  let all=true;for(let c=0;c<ECO_FINE;c++)if(!POP.done[c]){all=false;break;}if(all)POP.gen=ECO_PT.on?ecoGen(true):null; // the paper census was done in the saved game; the settle after it is boot's, not a load's (v11.106: the patches still want their hunters' tables, or a census if the save had none — ecoGen's load pass)
  for(let ei=0;ei<SPAWN.length;ei++){const N=POP.n[ei];for(let c=0;c<ECO_CELLS;c++)if(!(N[c]>=0))N[c]=0;} // a hand-edited file: nothing negative or NaN into the model
  ecoIndexAll(); // the ledger's index from the loaded tables (v11.65)
  return true;
}
function saveRecord(slices){ // the game as it stands, as a record for the store (slices: without its ledger, which a save in slices walks after — saveSoon)
  const P=player,s=curSave;
  return {id:s.id,kind:'save',v:SAVE_V,name:s.name,made:s.made,played:Date.now(),playT:Math.round(playT),clade:P.clade.id,spec:JSON.parse(specToJSON(P.clade.spec)),pos:[r3(P.pos.x),r3(P.pos.y),r3(P.pos.z)],yaw:r3(P.yaw),pitch:r3(P.pitch),deaths:s.deaths||[],arms:P.armsLost||0,regrow:(P.regrow||[]).map(r3),bleed:r3(P.bleed||0),blood:r3(P.blood||0),eaten:r3(P.eaten||0),wounds:(P.wounds||[]).map(w=>({ci:w.ci|0,at:w.at.map(r3),q:+w.q.toFixed(6),tau:r3(w.tau)})),lost:(P.lost||[]).slice(),hunger:r3(P.hunger||0),starveT:r3(P.starveT||0),t:r3(t),line:lineOut(),over:!!s.over,pop:slices?null:popBin(),falls:fallsOut()}; // hunger, starveT (v11.73): the stomach as it was // blood, wounds (v11.91): the blood lost and every open wound with its rate // arms, regrow, bleed (v11.56): the animal's injuries — a dropped arm is still dropped when you come back, and regrows by the world's clock // deaths (v11.55): the slot's animals that died, {cause, day, playT}
}
function lineOut(){const L=curSave.line;if(!L)return [];for(const M of L)for(const b of M.broods)if(b._ch){b.n=b.hatched?broodLive(b):b._egg?b._egg.n:0;b.at=r3(t);}return JSON.parse(JSON.stringify(L,(k,v)=>k[0]==='_'?undefined:v));} // the line as data (line.js): the loaded broods counted first, the runtime links dropped. at (v11.76, found by the test): a loaded brood's count is current at the save, so its catch-up starts here — to v11.75 it started at the hatch, and a continue took the unloaded losses off young that had been in view the whole time
let slotLast=null;const slotNot=new Set(); // slotLast: the record saveNow(true) wrote (toMenu's, kept for continue as menu.worldRec; an autosave keeps none, so play holds no extra slot) // slotNot: keys the list found were no slot (a record that is neither the profile nor a save), not read again this session
function saveNow(keep){slotLast=null;saveJob=null;if(!curSave||mode!=='play'||player.dead||!player.clade)return false;camNote();const rec=saveRecord();curSave.played=rec.played;curSave.playT=rec.playT;slotPut(rec);if(keep)slotLast=rec;if(profileDirty)profileSave();saveT=SAVE_EVERY;return true;}
let saveJob=null; // a save in slices under way (v11.196): {id, rec — the record at its start, its ledger to come; J — popJob}
function saveSoon(){ // a save in play, its ledger walked over the next frames (the autosave, the pointer's release, a clutch, a child); one at a time — one walking is recent
  if(saveJob||!curSave||mode!=='play'||player.dead||!player.clade)return;camNote();saveJob={id:curSave.id,rec:saveRecord(true),J:popJob()};saveT=SAVE_EVERY;}
function saveStep(){const S=saveJob;if(!S)return; // a frame of it; at its end the record is stored
  if(!curSave||curSave.id!==S.id||mode!=='play'||player.dead){saveJob=null;return;} // the game it was saving is gone (a death and a new game save at once themselves)
  if(!popStep(S.J,POP_SLICE))return;saveJob=null;
  if(S.J.bp){const B=ECO_PT.bp;for(let i=0;i<B.length;i++)if(B[i]!==S.J.bp[i]){saveSoon();return;}} // a patch split or merged while it walked: its slot's cells and the patch would disagree — from the start again
  S.rec.pop=popOut(S.J);curSave.played=S.rec.played;curSave.playT=S.rec.playT;slotPut(S.rec);if(profileDirty)profileSave();}
function updateSave(dt){if(mode!=='play'||!curSave)return;playT+=dt;lineTick(dt);if(saveJob){saveStep();return;}saveT-=dt;if(saveT<=0)saveSoon();}
function saveRefresh(cb){ // the slots read again; first, a shadow the page left on its way out (saveShadow) goes into the store — it is the latest state of that slot, nothing later can exist
  let sh=null;try{const ls=window.localStorage,s=ls&&ls.getItem('tethys.last');if(s){ls.removeItem('tethys.last');sh=JSON.parse(s);}}catch(e){}
  const go=()=>storeSums((sums,keys)=>{const have=new Set();for(const s of sums)if(s&&s.kind==='sum')have.add(s.slot);
    const miss=keys.filter(k=>k!=='profile'&&k.indexOf(SUM_P)!==0&&!have.has(k)&&!slotNot.has(k)),list=sums.filter(s=>s&&s.kind==='sum');
    const fin=()=>{saveList=list.map(slotEntry).sort((a,b)=>(b.played||b.made||0)-(a.played||a.made||0));if(cb)cb();};
    const next=()=>{if(!miss.length){fin();return;}const k=miss.shift();slotGet(k,r=>{if(r){const s=slotSum(r);list.push(s);storePut(s,next);}else{slotNot.add(k);next();}});}; // a slot from before the summaries: read whole once, its summary written
    next();});
  if(sh&&sh.kind==='save'&&sh.pop&&typeof sh.id==='string')slotPut(sh,go);else go();
}
// The title screen's camera (v11.47.2, the person's ask): from the exact spot you last died, left or saved in, every time. The camera's
// position and look direction go to localStorage synchronously at every one of those events (saveNow, saveShadow, player.js die) — a few
// dozen bytes, the one thing here that must survive even a hard close — and menu.js reads it at boot (menuCam). Nothing until the first game.
function camNote(){try{const ls=window.localStorage;if(!ls||mode!=='play')return;const d=V3(0,0,-1).applyQuaternion(camera.quaternion);ls.setItem('tethys.cam',JSON.stringify({p:[r3(camera.position.x),r3(camera.position.y),r3(camera.position.z)],d:[r3(d.x),r3(d.y),r3(d.z)],t:Date.now(),id:curSave?curSave.id:''}));}catch(e){}}
function camRead(){try{const ls=window.localStorage,s=ls&&ls.getItem('tethys.cam');if(!s)return null;const o=JSON.parse(s);if(!Array.isArray(o.p)||!Array.isArray(o.d)||o.p.length!==3||o.d.length!==3)return null;const p=o.p.map(v=>+v||0),d=o.d.map(v=>+v||0);if(!inWorld(p[0],p[2],-2000)||!(d[0]*d[0]+d[1]*d[1]+d[2]*d[2]>0.1))return null;return {p:p,d:d,id:typeof o.id==='string'?o.id:''};}catch(e){return null;}}
function saveShadow(){if(!curSave||mode!=='play'||player.dead||!player.clade)return;camNote();try{const ls=window.localStorage;if(ls)ls.setItem('tethys.last',slotJSON(saveRecord()));}catch(e){}} // the page going away (v11.47.1): IndexedDB's put may not finish before it does, localStorage's write is synchronous and does; read back by saveRefresh at the next boot
function saveName(){let n=0;for(const r of saveList){const m=/^game (\d+)$/.exec(r.name||'');if(m&&+m[1]>n)n=+m[1];}return 'game '+(n+1);}
function saveImport(txt,cb){ // a file back in (menu.js): checked as far as the shape goes, given a new id if its own is taken, stored
  let r=null;try{r=JSON.parse(txt);}catch(e){}
  if(!r||r.kind!=='save'||!r.pop||typeof r.clade!=='string'){if(cb)cb(null);return;}const sp=specOk(r.spec);
  const rec={id:typeof r.id==='string'&&!saveList.some(s=>s.id===r.id)?r.id:'s'+Date.now().toString(36),kind:'save',v:+r.v||SAVE_V,name:typeof r.name==='string'?r.name.slice(0,40):saveName(),made:+r.made||Date.now(),played:+r.played||Date.now(),playT:+r.playT||0,clade:r.clade,spec:sp||undefined,pos:Array.isArray(r.pos)?r.pos.slice(0,3).map(v=>+v||0):[0,dispY,0],yaw:+r.yaw||0,pitch:+r.pitch||0,deaths:Array.isArray(r.deaths)?r.deaths.slice(-50):[],arms:Math.max(0,+r.arms||0),regrow:Array.isArray(r.regrow)?r.regrow.map(v=>+v||0):[],bleed:Math.max(0,+r.bleed||0),lost:Array.isArray(r.lost)?r.lost.map(v=>v|0):[],t:Math.max(0,+r.t||0),line:Array.isArray(r.line)?r.line:undefined,over:!!r.over,pop:r.pop};
  slotPut(rec,()=>{saveRefresh(()=>{if(cb)cb(rec);});});
}
// ---------- the world in and out ----------
function worldClear(){ // every cell out (the living written into the ledger), a cell mid-build dropped with what it had spawned, the lists emptied
  activeGen=null;activeKey=null;for(const ch of Array.from(chunks.values()))unloadChunk(ch);
  for(const g of eggs.slice())removeEgg(g);for(const s of sheds.slice())removeShed(s);for(const c of creatures)disposeCreature(c);creatures.length=0;carcasses.length=0;schools.length=0; // the sheds too (v11.66)
}
function cellsAround(){const ci=cellOf(player.pos.x),cj=cellOf(player.pos.z);for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const i=ci+di,j=cj+dj;if(gridIn(i,j))loadChunkNow(i,j);}shadowDirty();} // the 3×3 round the player before the first frame (boot, a game starting, the menu); the rest streams
function playerBody(C,pos,yaw,pitch){ // the player's body built and placed as the clade; the old one disposed
  const P=player;playerDrop();const b=C.build();castOn(b.g);scene.add(b.g);
  P.clade=C;P.b=b;P.g=b.g;P.anim=b.anim;P.mass=C.mass;P.def.size=C.size;P.paraT=0;P.stungT=0;P.sickT=0;P.hunger=0;P.starveT=0;P.waste=0;P.armsLost=0;P.regrow=null;P.cause='';P.live=null;P.lost=null;P.speedK=1;P.turnK=1;
  P.pos.copy(pos);b.g.position.copy(pos);P.vel.set(0,0,0);P.yaw=+yaw||0;P.pitch=clamp(+pitch||0,-PITCH_MAX,PITCH_MAX);P.byaw=P.yaw;P.bpitch=P.pitch;P.angV=0;faceQ(P);P.dead=false;P.cd=0;P.inkT=0;P.bleed=0;P.blood=0;P.eaten=0;P.wounds=null;P.hold=null;P.held=0;P.grab=null;P.holding=0;P.withdrawn=false;P.shut=false;P.soft=false;P.fp=false;P.camAbove=false;P.camFlipT=0;P.wet=true;P.sub=1;P.hurtT=0;P.lastHurt=-100;P.jetT=0;P.pulse=0;P.biteCD=0;P.flopT=0; // v11.77: the body faces its heading at the start (byaw, bpitch, faceQ)
  camera.position.copy(pos).add(V3(0,2,8));snapMed=true;seeSpec(C.spec.id);
}
function playerDrop(){const P=player;if(!P.g)return;releaseAll(P);for(const c of creatures)if(c.target===P)dropTarget(c);ghostBody(P.g,false);scene.remove(P.g);P.g.traverse(o=>{if(o.geometry)o.geometry.dispose();});P.g=null;P.b=null;P.anim=null;P.dead=true;P.fp=false;P.hold=null;P.held=0;P.grab=null;}
function startNew(C){ // a new game (menu.js): a fresh ledger, the clock at boot, the player at the peak as the clade, a new slot written at once so continue lists it
  worldClear();ecoReset();fallsIn([]);t=0;clockH=0;TIDE=tideAt(0);hazeSnap=true;
  curSave={id:'s'+Date.now().toString(36)+Math.floor(Math.random()*1296).toString(36),name:saveName(),made:Date.now(),played:Date.now(),playT:0};playT=0;
  lineStart(C);choose(C);saveNow();saveRefresh();
}
function startFrom(rec){ // continue a slot (menu.js): the clock and the ledger as saved, the player where it was
  if(rec.over)return false; // the line ended (v11.69): nothing to continue as
  worldClear();slotWorld(rec);return slotPlayer(rec);}
// v11.189: a slot's world and its player apart — the boot opens the last slot's world under the menu's camera (main.js bootSlot), and continue then puts
// the player into that world as it stands (menu.js menuContinue), nothing cleared or reloaded; startFrom is the two after a clear, as it always was
function slotWorld(rec){t=Math.max(0,+rec.t||0);clockH=t*CLOCK_RATE;TIDE=tideAt(clockH);hazeSnap=true;popLoad(rec.pop);fallsIn(rec.falls);} // the clock and the ledger as saved; the falls (v11.99; none in an older save)
function slotPlayer(rec){
  if(rec.over)return false;
  let C=cladeOfRec(rec);
  curSave={id:rec.id,name:rec.name,made:rec.made,played:rec.played,playT:+rec.playT||0,deaths:Array.isArray(rec.deaths)?rec.deaths.slice():[]};playT=curSave.playT;
  lineLoadRec(rec,C);const L=lineCur();if(L&&(lineScale(L)<1||lineSoft(L)))C=lifeClade(L,lineScale(L)); // the line (line.js); a hatchling still small (v11.76: at its moults' step), a moulting body still soft
  const p=Array.isArray(rec.pos)?V3(+rec.pos[0]||0,+rec.pos[1]||0,+rec.pos[2]||0):V3(0,dispY,0);if(!inWorld(p.x,p.z,-1500))p.set(0,dispY,0);
  choose(C,p,rec.yaw,rec.pitch);injuriesLoad(rec);player.hunger=clamp(+rec.hunger||0,0,1);player.starveT=Math.max(0,+rec.starveT||0);player.soft=lineSoft(L);return true; // the stomach (v11.73); a record from before it comes back fed. soft (v11.76): through a moult as it was
}
// the body swapped in place (v11.69: a hatchling grown, line.js lineTick): where it is, moving as it was, its wounds kept, the camera left where it is
function playerRebody(C){const P=player,pos=P.pos.clone(),vel=P.vel.clone(),cam=camera.position.clone(),fp=P.fp,inj={arms:P.armsLost,regrow:P.regrow?P.regrow.slice():[],bleed:P.bleed,blood:P.blood,eaten:P.eaten,wounds:P.wounds?P.wounds.map(w=>({ci:w.ci,at:w.at.slice(),q:w.q,tau:w.tau})):[],lost:P.lost?P.lost.slice():[]},hun=P.hunger,stv=P.starveT;
  playerBody(C,pos,P.yaw,P.pitch);P.vel.copy(vel);camera.position.copy(cam);injuriesLoad(inj);P.hunger=hun;P.starveT=stv;if(fp){P.fp=true;ghostBody(P.g,true);}} // the stomach stays what it was (v11.73)
// the player's body from a record (v11.68): its spec when it has one that compiles, else (a version 1 record, or a spec that no longer compiles) the preset its clade id names
function specOk(sp){if(!sp||typeof sp!=='object'||!sp.core||!sp.clade||!Array.isArray(sp.parts))return null;try{const b=compile(sp);b.g.traverse(o=>{if(o.geometry)o.geometry.dispose();});statsOf(sp);return sp;}catch(e){console.warn('save: the player spec does not compile ('+e.message+'); the preset instead');return null;}}
function cladeOfRec(rec){const pre=CLADE_PRESETS.find(p=>p.id===rec.clade),sp=specOk(rec.spec);if(sp)return playerClade(sp,pre);return CLADES.find(c=>c.id===rec.clade)||CLADES[1];}
function injuriesLoad(rec){const P=player;P.armsLost=Math.max(0,+rec.arms||0);P.regrow=Array.isArray(rec.regrow)&&rec.regrow.length?rec.regrow.map(v=>+v||0):null;P.blood=clamp(+rec.blood||0,0,1);P.eaten=clamp(+rec.eaten||0,0,1);P.wounds=Array.isArray(rec.wounds)?rec.wounds.filter(w=>w&&Array.isArray(w.at)&&w.at.length===3&&+w.q>0).map(w=>({ci:w.ci|0,at:w.at.map(v=>+v||0),q:+w.q,tau:Math.max(1,+w.tau||6),by:null,tT:0})):null;if(P.wounds&&!P.wounds.length)P.wounds=null;P.bleed=P.wounds?P.wounds.reduce((s,w)=>s+w.q,0):0;const rig=armsOf(P);if(rig){const n=Math.min(P.armsLost,Math.max(0,rig.chains.length-AUTOTOMY.keep));P.armsLost=n;rig.chains.forEach((c,i)=>{c.gone=i<n;c.grow=0;});}else P.armsLost=0;if(P.armsLost)armsLive(P);for(const pi of (Array.isArray(rec.lost)?rec.lost:[]))losePart(P,pi|0,null,null,true);} // the saved injuries back on the body (v11.56)
// the slot's animal is dead (v11.55, COMBAT.md §9). Since v11.69 (LINEAGE §4.5): the death is written to the life and the slot, and you continue
// as the nearest living child of this life (line.js lineNext: an unhatched clutch counts, and the world runs on to its hatch). None, and the
// save is over (the person, 20 Sep 2026: "There is no grace"): the slot is written ended, the menu says so, and continue refuses it.
function slotDeath(cause){const s=curSave;if(!s||mode!=='play')return;(s.deaths||(s.deaths=[])).push({cause:cause||'',day:+(clockH/DAY_H).toFixed(1),playT:Math.round(playT)});
  const L=lineCur();if(L){L.died=r3(t);L.cause=cause||'';}
  const x=lineNext(player.pos);if(x){lineContinue(x,cause);return;}
  s.over=true;saveJob=null;const rec=saveRecord();slotPut(rec);if(profileDirty)profileSave();curSave=null;unlock();
  const shot=camNow();playerDrop();mode='menu';worldClear();menuCam(shot);cellsAround();menuEl.classList.remove('gone');menuPage('main');menuRise(MENU_RISE_BACK);hintEl.style.opacity=0;menuRefresh();
  setTimeout(()=>{fadeEl.style.opacity=0;},400);menuNote((cause||'dead')+'. no young: the line ends');}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveNow();});
addEventListener('pagehide',()=>{saveNow();saveShadow();});addEventListener('beforeunload',()=>{saveShadow();});
document.addEventListener('pointerlockchange',()=>{if(mode==='play'&&!document.pointerLockElement)saveSoon();}); // the first esc from locked play frees the pointer (the browser keeps that esc): save there (v11.47.1) — in slices since v11.196; a close right after is pagehide's, which saves at once
