// cacheload.js — the world cache's reader (v11.214; analysis_loading.md §4.3, the person's yes of 22 Nov 2026). The build puts it in tethys.html only, before
// the game's script, which it starts: the world this build made on an earlier visit — its maps and its caustic tiles, stored under `world:<the hash of the
// game's code>` (src/wcache.js writes it) — read from IndexedDB as array buffers into window.__WCACHE, then the game. The database is opened as save.js opens
// it (the same name, version and store), so whichever comes first makes it the same way. A store that does not answer in WCACHE_WAIT ms, a missing record or
// any error: the game starts without, and computes as it always did. dev.html, the benches and the tests have no hash, so never read one.
var WCACHE_WAIT=1500;
function wcacheRead(go){
  var B=window.TETHYS_BUILD,done=false;
  var fin=function(){if(done)return;done=true;go();};
  if(!B||!B.wh||!window.indexedDB){fin();return;}
  setTimeout(fin,WCACHE_WAIT);
  try{
    var rq=window.indexedDB.open('tethys',1);
    rq.onupgradeneeded=function(){rq.result.createObjectStore('kv',{keyPath:'id'});};
    rq.onerror=fin;
    rq.onsuccess=function(){
      var db=rq.result;
      try{
        var g=db.transaction('kv','readonly').objectStore('kv').get('world:'+B.wh);
        g.onerror=function(){db.close();fin();};
        g.onsuccess=function(){
          var r=g.result;db.close();
          if(!r||!r.blobs){fin();return;}
          var keys=Object.keys(r.blobs),n=keys.length,buf={},t0=performance.now();
          if(!n){fin();return;}
          keys.forEach(function(k){
            r.blobs[k].arrayBuffer().then(function(ab){buf[k]=ab;n--;if(n===0){if(!done)window.__WCACHE={meta:r.meta,buf:buf,ms:performance.now()-t0};fin();}},fin);
          });
        };
      }catch(e){db.close();fin();}
    };
  }catch(e){fin();}
}
