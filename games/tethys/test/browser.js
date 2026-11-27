// test/browser.js — the browser tests, `npm run smoke` (27 Nov 2026, the root's docs/decisions.md 30): test/gpu.js --check, test/boot.js, test/wcache_page.js,
// test/three187.js and test/horizon_page.js, one after another (each drives software WebGL, which takes every core), every one run even when
// one before it failed, then a table of each one's time; exit 1 on any failure.
//   node test/browser.js             all of them (gpu.js once, at every place)
//   SHARD=k/n node test/browser.js   the k-th of n parts (CI: package.json's "smokeShards", one machine a part)
// The parts are dealt as build.js deals --test's: longest first to the part with the fewest seconds so far, ties to the lower part, by the
// seconds beside each run below. gpu.js is dealt a place at a time (its ONLY=), the places of one part counted in one run of it: in one job
// it was 23 of the browser tests' 35 minutes, and each place opens a browser of its own, so a place's counts are the same split or not.
// The seconds are CI's (a runner of v11.247, PR 217's job), not a session's: software WebGL is 2-6x slower there, unevenly (gpu.js 4.7x, boot.js
// 2x). A new browser test goes in RUNS with its CI seconds; a new place in PLACES (test/benchpage.js) in GPU. A wrong number only unbalances the
// parts; nothing is dropped.
'use strict';
const path=require('path'),{spawnSync}=require('child_process');
const {PLACES}=require('./benchpage.js');
const ROOT=path.join(__dirname,'..');
const GPU={forest:194,atoll:215,open:189,coast:209,wood:194,shore:178,canopy:183}; // gpu.js --check at one place, its seconds in CI: a session's (34-41 s) x 5.2, CI's whole run over the session's
const RUNS=[[['test/boot.js'],{},147],[['test/wcache_page.js'],{},132],[['test/three187.js'],{},119],[['test/horizon_page.js'],{},339]];
const places=Object.keys(PLACES),gpu=places.map(p=>[['test/gpu.js','--check'],{ONLY:p},GPU[p]||200,p]);
const SH=/^(\d+)\/(\d+)$/.exec(process.env.SHARD||'');
if(process.env.SHARD&&!(SH&&+SH[1]>=1&&+SH[1]<=+SH[2])){console.error('SHARD is k/n with 1 <= k <= n, not '+process.env.SHARD);process.exit(1);}
const part=new Map();if(SH){const load=new Array(+SH[2]).fill(0);for(const r of gpu.concat(RUNS).sort((a,b)=>b[2]-a[2])){let k=0;for(let i=1;i<load.length;i++)if(load[i]<load[k])k=i;load[k]+=r[2];part.set(r,k+1);}}
const mine=r=>!SH||part.get(r)===+SH[1],at=gpu.filter(mine).map(r=>r[3]);
// gpu.js once for this part's places (all of them: no ONLY, as before the split), then the rest in their order
const todo=(at.length?[[['test/gpu.js','--check'],at.length===places.length?{}:{ONLY:at.join(',')}]]:[]).concat(RUNS.filter(mine));
const name=([args,env])=>Object.entries(env).map(([k,v])=>k+'='+v+' ').join('')+'node '+args.join(' ');
const T0=Date.now(),res=[];
const ci=gpu.concat(RUNS).filter(mine).reduce((s,r)=>s+r[2],0);
console.log(todo.length+' browser tests'+(SH?' (part '+SH[1]+' of '+SH[2]+', SHARD)':'')+', about '+Math.round(ci/60)+' min in CI: '+todo.map(name).join(', '));
for(const r of todo){const t0=Date.now();console.log('\n$ '+name(r));
  const p=spawnSync(process.execPath,r[0],{cwd:ROOT,stdio:'inherit',env:Object.assign({},process.env,r[1])});
  const s=(Date.now()-t0)/1000,ok=p.status===0;if(!ok)console.log('exit '+(p.status===null?p.signal:p.status)+(p.error?' ('+p.error.message+')':''));res.push([name(r),ok,s]);}
const bad=res.filter(r=>!r[1]);
console.log('\n'+res.map(([n,ok,s])=>(ok?'ok    ':'FAILED')+s.toFixed(0).padStart(5)+' s  '+n).join('\n'));
console.log((bad.length?'\nFAILED: '+bad.map(r=>r[0]).join(', '):'\nALL OK')+' ('+((Date.now()-T0)/1000).toFixed(0)+' s'+(SH?', part '+SH[1]+' of '+SH[2]:'')+')');
process.exitCode=bad.length?1:0;
