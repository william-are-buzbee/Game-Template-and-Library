// test/benchpage.js — the page the browser benches run the game in (test/bench_creatures.js, v11.149; test/gpu.js, v11.179): any tree's
// sources served as build.js writes dev.html, on a clock of the bench's own, with Math.random seeded — so a run is the same run every time, and
// two trees (BASE, and here) can be compared draw for draw. Not a test of its own.
//   pageOf(root)          the page's html: this tree's shell (or the root's own), the seed and the clock, three.js r128 from cdnjs, the root's
//                         src/ in its order.txt's order
//   serve(root)           a local server for it (`/` and `/bench.html` the page, the rest the root's files); `.address().port`
//   open(pw, root, opt)   a browser of its own (software WebGL), the page loaded: {browser, page, server, errs, close()}. opt: {width, height,
//                         init: [functions run in the page before any script, e.g. tools/lib/browser.ts glCounting]}
//   playwright()          Playwright: PLAYWRIGHT_MODULE, else the global one (a cloud session has one; CI installs one)
// In the page: performance.now and requestAnimationFrame are the bench's (the page's clock is still between steps, so a streaming budget never
// runs out: each frame generates one whole cell and one whole far region), setTimeout runs at once, and `__step(n)` runs n frames of 1000/60 ms (`window.__FRAME_MS` another: v11.210, a screen at another rate).
// `__real()` is the wall clock, for the benches' own timings.
'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),{execSync}=require('child_process');
const here=path.join(__dirname,'..');
function playwright(){try{return require(process.env.PLAYWRIGHT_MODULE||'playwright');}catch(e){return require(path.join(execSync('npm root -g',{encoding:'utf8'}).trim(),'playwright'));}}
function pageOf(root){const shell=fs.readFileSync(path.join(fs.existsSync(path.join(root,'shell.html'))?root:here,'shell.html'),'utf8'),order=fs.readFileSync(path.join(root,'src/order.txt'),'utf8').split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('#'));
  const seed='<script>(function(){let s=20261114>>>0;Math.random=function(){s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};'+ // mulberry32: the same draws in every run
    'const real=performance.now.bind(performance);window.__real=real;let now=0,raf=null;performance.now=()=>now;window.requestAnimationFrame=f=>{raf=f;return 1;};window.setTimeout=(f)=>{f();return 1;};'+ // the page's own clock: still between the bench's steps
    'let su=777;window.__uuidR=function(){su=(su+0x6D2B79F5)>>>0;let t=su;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};'+ // three's UUIDs on a stream of their own (below)
    'window.__step=n=>{for(let i=0;i<n;i++){const f=raf;raf=null;if(!f)break;now+=window.__FRAME_MS||1000/60;f(now);}};})();</script>\n';
  return shell.replace('<!--SCRIPTS-->',()=>seed+'<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n'+order.map(n=>'<script src="src/'+n+'.js"></script>\n').join(''));}
function serve(root){const html=pageOf(root);return new Promise(ok=>{const s=http.createServer((req,res)=>{const u=decodeURIComponent(new URL(req.url,'http://x').pathname);if(u==='/'||u==='/bench.html'){res.writeHead(200,{'content-type':'text/html'});res.end(html);return;}
  const p=path.normalize(path.join(root,u));if(!p.startsWith(root)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){res.writeHead(404).end();return;}res.writeHead(200,{'content-type':p.endsWith('.js')?'text/javascript':p.endsWith('.html')?'text/html':'application/octet-stream'});fs.createReadStream(p).pipe(res);});s.listen(0,'127.0.0.1',()=>ok(s));});}
// three.js r128 draws four Math.random() for every geometry's UUID (its ct()): a build that makes fewer geometries (v11.149's replay) would shift
// every later draw — the arms' phases — and two trees could not be compared draw for draw. The page's three.js has those four on a stream of their
// own (__uuidR); the game's own draws stay on Math.random. In the game Math.random is not seeded at all, so this is the comparison's, nothing else
let THREE_JS=null;
async function open(pw,root,opt){opt=opt||{};const server=await serve(root),browser=await pw.chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  try{const page=await browser.newPage({viewport:{width:opt.width||1280,height:opt.height||720}}),errs=[];page.on('pageerror',e=>errs.push(String(e)));
    for(const f of opt.init||[])await page.addInitScript(f);
    await page.route('**/three.min.js',async route=>{if(!THREE_JS){const r=await route.fetch(),t=await r.text(),n=t.split('4294967295*Math.random()').length-1;if(n!==4)throw new Error('three.min.js: '+n+' UUID draws found, 4 expected');THREE_JS=t.split('4294967295*Math.random()').join('4294967295*window.__uuidR()');}
      await route.fulfill({status:200,contentType:'text/javascript',body:THREE_JS});});
    await page.goto(`http://127.0.0.1:${server.address().port}/bench.html${process.env.TIER?'#'+process.env.TIER:''}`,{waitUntil:'load',timeout:300000}); // TIER=low (v11.208): the page at that tier, as the address's #low
    return {browser,page,server,errs,close:async()=>{await browser.close();server.close();}};}
  catch(e){await browser.close();server.close();throw e;}}
// the places the browser benches stand at (test/gpu.js, test/fill.js; v11.187 moved them here and added the shore and the canopy, the person's laggy
// places of 19 Nov: plants at the shore and breaching the surface): x, y (absolute: under 0 is under the water), z, the yaw (0 faces north, −z; π/2 west; π
// south), and whether the camera is above the water; hold: the body kept at y through the bench's frames (test/gpu.js, test/fill.js), for a camera that would
// otherwise ride the body down to the waterline
const PLACES={
  forest:{x:330,y:-12,z:0,yaw:0,above:false,what:'the weed forest on the shelf: the heaviest place for creatures and flora'},
  atoll:{x:109800,y:-10,z:4000,yaw:Math.PI/2,above:false,what:'the atoll 110 km east, 10 m down on its slope, facing its rim: a dense kelp stand, the most triangles under water'},
  open:{x:20000,y:-30,z:40000,yaw:0,above:false,what:'open water over the deep floor: the water column, the snow and the fog alone'},
  coast:{x:-7700,y:0.6,z:6000,yaw:Math.PI/2,above:true,what:'the giant\'s coast from the sea\'s surface: the horizon pass, the sky, the clouds, the land'},
  wood:{x:-10703,y:144,z:10914,yaw:0,above:true,what:'inside the giant\'s windward forest, 3 m over the ground (v11.180, the wood): the platewood stand and the canopy\'s hand-off at 360–450 m'},
  shore:{x:110,y:0.6,z:-380,yaw:Math.PI,above:true,hold:true,what:'the tidewood shore north of ours from the water\'s surface (v11.187): the tidewood and the reeds in the air, the kelp under the camera; the body held at 0.6 m (hold, v11.189: left to float it rests 2–3 m down by the world\'s state, and the camera with it at the waterline, above or under by a wave)'},
  canopy:{x:80,y:-3,z:-360,yaw:Math.PI,above:false,what:'3 m down in the kelp off the same shore (v11.187), facing it: the canopy at the surface, the tidewood above it'},
};
// AT=x,y,z[,yaw] (v11.191): one more place, `at`, where a flight recorder's report says the worst frame was (test/report.js prints the line); the benches
// then stand there alone (test/gpu.js and test/fill.js take ONLY=at when AT is set and ONLY is not). y absolute as above; the camera above the water at y >= 0,
// the body held there. Not for gpu.js --check or --update: gpu.json holds the named places only
if(process.env.AT){const a=process.env.AT.split(',').map(Number);if(a.length<3||a.slice(0,3).some(v=>!isFinite(v)))throw new Error('AT=x,y,z[,yaw]: '+process.env.AT);
  PLACES.at={x:a[0],y:a[1],z:a[2],yaw:isFinite(a[3])?a[3]:0,above:a[1]>=0,hold:a[1]>=0,what:'AT='+process.env.AT+', from a flight recorder\'s report (test/report.js)'};}
module.exports={here,playwright,pageOf,serve,open,PLACES};
