// test/browsers.js — the browser tests (`npm run smoke`), all of them one after another, or one part of them for CI. Each run is a real build in
// headless Chromium under software WebGL: test/gpu.js --check a place at a time (its seven places, each in a browser of its own already),
// test/sound.js --check --recipes (v11.249), then test/boot.js, test/wcache_page.js, test/three187.js and test/horizon_page.js. On one CI machine they took 31 minutes in a row (27 Nov 2026: gpu.js
// 20.5, horizon_page 4.3, boot 2, wcache_page 2, three187 1.5) against a 45-minute limit, so a slow runner cancelled a good pull request; package.json's
// "smokeShards" splits them across that many CI jobs (tools/lib/jobs.ts: tethys-browser-1 … -n), each given SHARD=k/n, as "shards" splits the suite.
//   node test/browsers.js            every run, in order (what `npm run smoke` is locally)
//   SHARD=k/n node test/browsers.js  the k-th of n parts: the runs dealt longest first to the part with the least, by their seconds below
// Every run in the part runs even when one fails; exit 1 if any did.
'use strict';
const {spawnSync}=require('child_process'),path=require('path');
const {PLACES}=require('./benchpage.js');
const ROOT=path.join(__dirname,'..');
// [the script and its arguments, its environment, its seconds on a CI machine (27 Nov 2026), for the dealing]
// test/sound.js (v11.249): its one-shots, noise and beds in one run (41 s here; its CI seconds a guess until a CI run says — gpu.js and horizon_page ran
// ×4 here's there). The mixes are not held in CI (the person, 28 Nov 2026): they move with the creatures as well as the sound, ~45 s a place here,
// and are checked by hand on an audio pull request and heard on listen.html
const RUNS=Object.keys(PLACES).map(p=>[['test/gpu.js','--check'],{ONLY:p},176]) // gpu.js's 1,235 s over its seven places
  .concat([[['test/sound.js','--check','--recipes'],{},100]])
  .concat([[['test/boot.js'],{},119],[['test/wcache_page.js'],{},124],[['test/three187.js'],{},93],[['test/horizon_page.js'],{},260]]);
const SH=/^(\d+)\/(\d+)$/.exec(process.env.SHARD||'');
if(process.env.SHARD&&!(SH&&+SH[1]>=1&&+SH[1]<=+SH[2])){console.error('SHARD is k/n with 1 <= k <= n, not '+process.env.SHARD);process.exit(1);}
let mine=RUNS;
if(SH){const n=+SH[2],load=new Array(n).fill(0),part=new Map();for(const r of RUNS.slice().sort((a,b)=>b[2]-a[2])){let k=0;for(let i=1;i<n;i++)if(load[i]<load[k])k=i;load[k]+=r[2];part.set(r,k+1);}
  mine=RUNS.filter(r=>part.get(r)===+SH[1]);}
const name=r=>r[0].join(' ')+(r[1].ONLY?' (ONLY='+r[1].ONLY+(r[1].PLACES?' PLACES='+r[1].PLACES:'')+')':'');
console.log('browser tests'+(SH?' (part '+SH[1]+' of '+SH[2]+', SHARD)':'')+': '+mine.map(name).join('; '));
const failed=[],t0=Date.now();
for(const r of mine){const t=Date.now();
  const res=spawnSync(process.execPath,r[0],{cwd:ROOT,stdio:'inherit',env:Object.assign({},process.env,{SHARD:''},r[1])}); // SHARD is this runner's: the scripts below never see it
  const s=Math.round((Date.now()-t)/1000);console.log((res.status===0?'ok':'FAILED')+'  '+s+' s  '+name(r));if(res.status!==0)failed.push(name(r));}
console.log('\n'+(failed.length?'BROWSER TESTS FAILED: '+failed.join('; '):'browser tests: all ok')+' ('+Math.round((Date.now()-t0)/1000)+' s)');
process.exit(failed.length?1:0);
