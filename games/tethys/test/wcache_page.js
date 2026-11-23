// test/wcache_page.js — the world cache in a real browser (v11.214; loader.js, src/wcache.js): the built tethys.html (its hash stamped, its loader
// before the game) opened twice in one headless Chromium with the same storage. The first visit builds the world and, at the boot's end, writes it to
// IndexedDB under world:<the hash>; the second reads it before the game starts and takes the maps and the caustics from it. No page errors either time;
// the boot's own times (the recorder's) printed for both. Run with `npm run smoke` (CI); needs `node build.js` first.
'use strict';
const path=require('path'),fs=require('fs');
const ROOT=path.join(__dirname,'..');
const {playwright,serve}=require('./benchpage.js');
(async()=>{let fails=0;const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++;};
  if(!fs.existsSync(path.join(ROOT,'tethys.html'))){console.log('wcache_page: no tethys.html — node build.js first');process.exit(1);}
  const wh=(fs.readFileSync(path.join(ROOT,'tethys.html'),'utf8').match(/TETHYS_BUILD=\{v:"[^"]*",wh:"([0-9a-f]+)"\}/)||[])[1];
  ok(!!wh,'tethys.html carries the code\'s hash: '+wh);
  const pw=playwright(),server=await serve(ROOT),url='http://127.0.0.1:'+server.address().port+'/tethys.html';
  const browser=await pw.chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  try{const ctx=await browser.newContext({viewport:{width:480,height:270}}),page=await ctx.newPage(),errs=[];page.on('pageerror',e=>errs.push(String(e)));
    const visit=async(first)=>{if(first)await page.goto(url,{waitUntil:'load',timeout:300000});else await page.reload({waitUntil:'load',timeout:300000});
      await page.waitForFunction(()=>window.__boot&&window.__boot.done,null,{timeout:300000,polling:500});
      return page.evaluate(()=>({hit:window.__wcache?Object.assign({},window.__wcache.hit):null,boot:window.__rec?window.__rec.full().boot:null}));};
    const stored=()=>page.evaluate(wh=>new Promise(done=>{const rq=indexedDB.open('tethys',1);rq.onsuccess=()=>{const db=rq.result;const g=db.transaction('kv','readonly').objectStore('kv').get('world:'+wh);g.onsuccess=()=>{const r=g.result;db.close();done(r?{keys:Object.keys(r.blobs||{}).length,mb:+(Object.values(r.blobs||{}).reduce((s,b)=>s+b.size,0)/1e6).toFixed(1),rings:r.meta&&r.meta.cau&&r.meta.cau.rings}:null);};g.onerror=()=>{db.close();done(null);};};rq.onerror=()=>done(null);}),wh);
    const a=await visit(true);
    ok(a.hit&&!a.hit.maps&&!a.hit.cau,'the first visit builds the world (no cache yet)');
    let s=null;for(let i=0;i<60&&!s;i++){s=await stored();if(!s)await new Promise(r=>setTimeout(r,500));}
    ok(s&&s.keys>=5&&s.rings>=3,'and writes it at the boot\'s end: '+(s?s.keys+' products, '+s.mb+' MB, '+s.rings+' caustic rings':'nothing stored'));
    const b=await visit(false);
    ok(b.hit&&b.hit.maps&&b.hit.cau,'the second visit takes the maps and the caustics from it');
    ok(!errs.length,'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
    if(a.boot&&b.boot)console.log('  the boot (the recorder, s): first frame '+a.boot.first+' → '+b.boot.first+', in '+a.boot.done+' → '+b.boot.done+' (software WebGL; the scripts start '+a.boot.scripts+' → '+b.boot.scripts+')');
  }catch(e){ok(false,'threw: '+String(e).slice(0,300));}finally{await browser.close();server.close();}
  console.log(fails?fails+' FAILED':'wcache_page: ok');process.exit(fails?1:0);})();
