// test/deopts.js — where V8 throws the game out of optimised code (v11.200; v11.197's islandH was the find that started it): the bench's page in
// headless Chromium with the real three.js, a new game swum FRAMES frames (default 400) across cells and regions, V8's verbose deoptimisation trace
// read from the browser's output and counted by function and source line (src/<file>.js:<line>, or three.min.js:<line>:<column>), then the sites
// thrown out five times or more. A site thrown out again and again is the pattern to fix: a shape that changes or was retired (islandH's gullies,
// merge's geometry attributes), a value that is sometimes a double where an int was learned (vlyCut's index); "exit from OSR'd inner loop" is V8
// leaving a loop it optimised mid-run, and harmless. Not in --test: the trace is tens of MB and the counts move a little with the compiles' timing.
//   node test/deopts.js [frames]        FRAMES= the same; WIDTH, HEIGHT the page (320×180: drawn, small)
'use strict';
const path=require('path'),cp=require('child_process');
if(process.argv[2]!=='--child'){ // the parent: the child's debug output is the browser's, the trace in it
  const r=cp.spawnSync(process.execPath,[__filename,'--child',process.argv[2]||process.env.FRAMES||'400'],{env:Object.assign({},process.env,{DEBUG:'pw:browser'}),encoding:'utf8',maxBuffer:1<<30});
  const lines=(r.stderr||'').split('\n'),by=new Map(),site=new Map();
  for(let i=0;i<lines.length;i++){const m=/reason: ([^)]*)\): begin\. deoptimizing 0x[0-9a-f]+ <JSFunction ([^ ]*) /.exec(lines[i]);if(!m)continue;
    let pos='';for(let j=i+1;j<Math.min(lines.length,i+16);j++){const p=/;;; deoptimize at <[^>]*\/(src\/[a-z_]+\.js|three\.min\.js|bench\.html):(\d+):(\d+)>/.exec(lines[j]);if(p){pos=p[1]+':'+p[2]+(p[1]==='three.min.js'?':'+p[3]:'');break;}}
    const k=m[2];let e=by.get(k);if(!e){e={n:0,why:new Map()};by.set(k,e);}e.n++;const w=m[1]+' @ '+pos;e.why.set(w,(e.why.get(w)||0)+1);site.set(k+'  '+w,(site.get(k+'  '+w)||0)+1);}
  process.stdout.write(r.stdout||'');
  const rows=[...by.entries()].sort((a,b)=>b[1].n-a[1].n);console.log('deoptimisations: '+rows.reduce((a,x)=>a+x[1].n,0)+' in '+rows.length+' functions; the most:');
  for(const [k,e] of rows.slice(0,20)){console.log(String(e.n).padStart(5)+'  '+k);for(const [w,n] of [...e.why.entries()].sort((a,b)=>b[1]-a[1]).slice(0,2))console.log('         '+String(n).padStart(4)+'× '+w);}
  const rep=[...site.entries()].filter(x=>x[1]>=5&&!/exit from OSR'd inner loop/.test(x[0])).sort((a,b)=>b[1]-a[1]);
  console.log('\na site thrown out five times or more (not counting the loops\' OSR exits): '+rep.length);for(const [k,n] of rep.slice(0,25))console.log(String(n).padStart(5)+'  '+k);
  process.exit(r.status||0);}
const N=+process.argv[3]||400,ROOT=path.join(__dirname,'..');
const {playwright,serve}=require('./benchpage.js');
(async()=>{const pw=playwright(),server=await serve(ROOT),url='http://127.0.0.1:'+server.address().port+'/bench.html';
  const browser=await pw.chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--js-flags=--trace-deopt-verbose']});
  try{const page=await browser.newPage({viewport:{width:+process.env.WIDTH||320,height:+process.env.HEIGHT||180}});await page.goto(url,{waitUntil:'load',timeout:300000});
    for(let k=0;k<500;k++){if(await page.evaluate(()=>window.__boot.stage!=='store'))break;await new Promise(r=>setTimeout(r,20));}
    await page.evaluate(()=>{for(let i=0;i<3000&&!window.__boot.done;i++)__step(1);startNew(CLADES[1]);});
    const ms=await page.evaluate(N=>{const t0=__real();let a=0;for(let i=0;i<N;i++){if(i%200===0)a+=1.1;player.pos.x+=0.3*Math.cos(a);player.pos.z+=0.3*Math.sin(a);__step(1);}return (__real()-t0)/N;},N);
    console.log(N+' frames swum, '+ms.toFixed(1)+' ms a frame here (software WebGL)');}
  finally{await browser.close();server.close();}})().catch(e=>{console.log(e);process.exit(1);});
