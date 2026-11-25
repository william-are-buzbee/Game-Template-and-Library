// test/perf.js — what a change costs, in one command (v11.179; the repository's `perf` skill, CLAUDE.md "Performance"): the files the branch changed
// since it left main, the benches they call for, the sources from before kept and every bench run beside them, and the pull request's table.
//   node test/perf.js                  against where the branch left origin/main (its merge base), the benches the change calls for
//   node test/perf.js --all            every bench, whatever changed
//   node test/perf.js --only gpu,world just these (world: test/bench.js, frames: test/frames.js, creatures: test/bench_creatures.js, gpu: test/gpu.js,
//                                      fill: test/fill.js — the GPU's time as a proxy, at FILL_PLACES, default the forest, the shore and the canopy)
//   node test/perf.js --ref <commit>   against another version: the way to find which version moved a number
//   node test/perf.js --dry            what it would run, and why; runs nothing
// "Here" is the working tree, committed or not. The sources from before are `git archive <ref>` of src/, vendor/ and shell.html, kept in the
// system's temp folder by the commit's hash (made once). Each bench prints its own output as it runs; then the table, in markdown for the pull
// request and the CHANGELOG entry, is printed and written to test/render/perf.md. A row worse by more than 10% is marked and listed first.
// The times are the benches' (each the best of several runs, base and here alternated — test/bench_creatures.js's two pages open at once and taking
// turns cell by cell, v11.237.1); the GPU's counts are exact. What none of them is: the
// GPU's own time — the shaders, the fill — which is the person's readout at a tp(). Env: N (runs each, handed to the benches).
'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),{execFileSync,spawnSync}=require('child_process');
const GAME=path.join(__dirname,'..'),REPO=path.join(GAME,'..','..'),argv=process.argv.slice(2),opt=k=>{const i=argv.indexOf(k);return i>=0?argv[i+1]:undefined;};
const git=(...a)=>execFileSync('git',a,{cwd:REPO,encoding:'utf8',maxBuffer:1<<26}).trim();
// which bench for which file (CLAUDE.md "Performance"); vendor/ is everything
const BENCHES={
  world:{file:'test/bench.js',what:'the world: its load, µs a sample() over five windows',src:['util','world','region']},
  frames:{file:'test/frames.js',what:'the creatures\' work a frame at the forest (node)',src:[/^creatures_/,'physics','parts','combat','fx','main','player']},
  creatures:{file:'test/bench_creatures.js',what:'every kind\'s build, a cell\'s generation at five places, the creatures\' frame (Chromium)',src:[/^creatures_/,'parts','chunks','flora','grow','ecology','reef']},
  gpu:{file:'test/gpu.js',what:'what a frame asks of the GPU at seven places (Chromium)',src:[/./],not:['audio','bench','save','input','worldmap','menu','zoo','lab'],shell:true},
  fill:{file:'test/fill.js',what:'the GPU\'s time by what is drawn, under software WebGL: a proxy (Chromium, ~2 min a place)',src:['scene','atmosphere','clouds','horizon','grow','flora','reef','chunks','far','parts','creatures_builders','creatures_spec','fx','main'],shell:true,env:{ONLY:process.env.FILL_PLACES||'forest,shore,canopy'}},
};
const ref=opt('--ref')||'',all=argv.includes('--all'),dry=argv.includes('--dry'),only=opt('--only');
// ---- what changed ----
let base;try{base=ref?git('rev-parse',ref):git('merge-base','HEAD','origin/main');}catch(e){console.error('no '+(ref||'origin/main')+' to compare with (git fetch origin main)');process.exit(2);}
const changed=[...new Set(git('diff','--name-only',base,'--','games/tethys').split('\n').concat(git('ls-files','--others','--exclude-standard','games/tethys').split('\n')).filter(Boolean))].map(f=>f.replace(/^games\/tethys\//,''));
const why={};
for(const f of changed){const m=/^src\/(.+)\.js$/.exec(f),vendor=f.startsWith('vendor/');
  for(const [k,B] of Object.entries(BENCHES)){const hit=vendor||(m&&B.src.some(s=>typeof s==='string'?s===m[1]:s.test(m[1]))&&!(B.not||[]).includes(m[1]))||(B.shell&&f==='shell.html');if(hit)(why[k]=why[k]||[]).push(f);}}
const run=only?only.split(',').filter(k=>BENCHES[k]):all?Object.keys(BENCHES):Object.keys(BENCHES).filter(k=>why[k]);
console.log('against '+(ref||'the merge base with origin/main')+' ('+base.slice(0,10)+'); changed in games/tethys: '+(changed.length?changed.join(', '):'nothing'));
for(const k of Object.keys(BENCHES))console.log('  '+(run.includes(k)?'run ':'skip')+' '+k.padEnd(10)+BENCHES[k].file.padEnd(24)+(why[k]?'for '+why[k].slice(0,6).join(', ')+(why[k].length>6?' …':''):only||all?'(asked)':'(nothing it measures changed)'));
if(!run.length){console.log('nothing that runs every frame or at load changed: no cost to measure');process.exit(0);}
if(dry)process.exit(0);
// ---- the sources from before ----
const dir=path.join(os.tmpdir(),'tethys-base-'+base.slice(0,12)),BASE=path.join(dir,'games','tethys');
if(!fs.existsSync(path.join(BASE,'src','order.txt'))){fs.mkdirSync(dir,{recursive:true});
  const tar=execFileSync('git',['archive',base,'games/tethys/src','games/tethys/vendor','games/tethys/shell.html'],{cwd:REPO,maxBuffer:1<<28});
  execFileSync('tar',['-x','-C',dir],{input:tar});}
console.log('the sources from before: '+BASE+'\n');
// ---- the benches ----
const out={};
for(const k of run){const J=path.join(os.tmpdir(),'tethys-perf-'+process.pid+'-'+k+'.json');console.log('---- '+k+': node '+BENCHES[k].file+' (BASE) ----');
  const r=spawnSync(process.execPath,[path.join(GAME,BENCHES[k].file)],{cwd:GAME,stdio:'inherit',env:Object.assign({},BENCHES[k].env||{},process.env,{BASE,JSON:J})});
  if(fs.existsSync(J)){out[k]=JSON.parse(fs.readFileSync(J,'utf8'));fs.rmSync(J);}else console.log('('+k+' wrote no results; exit '+r.status+')');console.log('');}
// ---- the table ----
const rows=[],notes=[],worse=[],num=(v,d)=>v===undefined||v===null?'—':typeof v==='number'?(Math.abs(v)>=1000?Math.round(v).toLocaleString('en-US'):v.toFixed(d===undefined?2:d)):String(v);
let timeWorse=false;
const add=(what,b,h,d,lower=true)=>{const r=b&&h?h/b:null,bad=r!==null&&(lower?r>1.1:r<0.9);if(bad){worse.push(what+' ×'+r.toFixed(2));timeWorse=true;}rows.push('| '+what+' | '+num(b,d)+' | '+num(h,d)+' | '+(r===null?'—':(bad?'**×'+r.toFixed(2)+'** ⚠':'×'+r.toFixed(2)))+' |');};
if(out.world){const [b,h]=out.world;add('the world\'s load, s',b.load,h.load);for(const w of Object.keys(h.w))add('sample() at '+w+', µs',b.w[w]&&b.w[w].us,h.w[w].us,3);
  const diff=Object.keys(h.w).filter(w=>!b.w[w]||b.w[w].hash!==h.w[w].hash).concat(h.deep?Object.keys(h.deep).filter(k=>!b.deep||b.deep[k]!==h.deep[k]):[]);
  notes.push(diff.length?'the world NOT the same: '+diff.join(', '):'the world the same to the bit (every window, 300,000 random points, every piece of the region\'s data)');}
if(out.frames){const {base:b,here:h,at}=out.frames;add('creatures\' work a frame at '+at+', ms (mean)',b&&b.mean,h.mean,3);add('the same, p95',b&&b.p95,h.p95,3);
  notes.push(b?(b.sim===h.sim?'the simulation the same to the bit (test/frames.js)':'the simulation NOT the same (test/frames.js): behaviour moved'):'');}
if(out.creatures){const [b,h]=out.creatures.length>1?out.creatures:[null,out.creatures[0]];
  if(h.build){add('every kind\'s build, ms (first)',b&&b.build.first,h.build.first,1);add('every kind\'s build, ms (again: what a spawn pays)',b&&b.build.rep,h.build.rep,1);}
  if(h.cells)for(const p of Object.keys(h.cells))add('a cell at '+p+', ms',b&&b.cells[p]&&b.cells[p].ms,h.cells[p].ms,1);
  if(h.frame)add('creatures\' work a frame at the forest (Chromium), ms',b&&b.frame&&b.frame.mean,h.frame.mean,3);
  if(b&&h.bodies)notes.push(b.bodies&&b.bodies.hash===h.bodies.hash&&b.bodies.pose===h.bodies.pose?'every body the same to the bit, built and posed (test/bench_creatures.js)':'the bodies NOT the same (test/bench_creatures.js)');
  if(b&&h.frame&&b.frame)notes.push(b.frame.sim===h.frame.sim?'':'the simulation in Chromium NOT the same');}
const gpu=[];
if(out.gpu&&out.gpu.base){const {base:b,here:h}=out.gpu,K=['draws','instances','triangles','programs','uniforms','passes','bufferBytes','textureBytes','copyBytes','readbacks'];
  const fmt=(k,v)=>k.endsWith('Bytes')?(v>=1<<20?(v/(1<<20)).toFixed(2)+' MB':(v/1024).toFixed(0)+' KB'):num(v,v%1?1:0);
  for(const p of Object.keys(h.places))for(const k of K){const x=b.places[p]&&b.places[p][k],y=h.places[p][k];if(x===y)continue;const r=x?y/x:null,bad=r===null||r>1.1;if(bad)worse.push(p+' '+k+(r?' ×'+r.toFixed(2):' new'));gpu.push('| '+p+' | '+k+' | '+fmt(k,x||0)+' | '+fmt(k,y)+' | '+(r===null?'new':bad?'**×'+r.toFixed(2)+'** ⚠':'×'+r.toFixed(2))+' |');}
  for(const p of Object.keys(h.places))if((h.places[p].sight||0)!==(b.places[p]&&b.places[p].sight||0))gpu.push('| '+p+' | compiled at first sight | '+(b.places[p].sight||0)+' | '+h.places[p].sight+' | |');
  for(const k of ['compiles','bufferBytes','textureBytes'])if(b.boot[k]!==h.boot[k])gpu.push('| boot | '+k+' | '+fmt(k,b.boot[k])+' | '+fmt(k,h.boot[k])+' | ×'+(h.boot[k]/Math.max(1,b.boot[k])).toFixed(2)+' |');}
if(out.fill){for(const [p,o] of Object.entries(out.fill.places)){add('the GPU\'s time at '+p+' (software WebGL, a proxy), ms',o.base,o.frame,0);add('the CPU\'s side of drawing at '+p+' (renderFrame), ms',o.cpuBase,o.cpu,1);
    if(o.diff)notes.push('the picture at '+p+': '+(o.diff.n?o.diff.n+' pixels of '+out.fill.size.replace('x','×')+' differ, by up to '+o.diff.max+' of 255':'the same, pixel for pixel'));}}
const md=[];
md.push(worse.length?'**Worse by more than 10%:** '+worse.join(', ')+' — say why it is worth it in the first line.':'Nothing worse by more than 10%.');
// what the times are worth here: identical sources on both sides read up to ×1.02 on frames.js's mean and ×1.09 on its p95 (a cloud session, 18 Nov 2026);
// bench_creatures.js's cells ±4%, and ×0.93–1.07 at the sea and the giant's coast, its builds and frame ±2% (its sides taking turns, v11.237.1, 25 Nov 2026;
// ×0.81–1.28 at a place before it)
if(timeWorse)md.push('','A time is a measurement on a shared machine: identical sources on both sides read up to ×1.02 on test/frames.js\'s mean and ×1.09 on its p95 here, and test/bench_creatures.js\'s cells ±4%, up to ×1.07 at the sea and the giant\'s coast, its builds and frame ±2%. A flagged time on code the change did not touch is worth a second run (`--only <bench>`, `N=5`) before it is believed; the counts and the hashes are exact.');
if(rows.length){md.push('','| measure | before | after | ratio |','|---|---|---|---|',...rows);}
if(out.gpu&&out.gpu.base){md.push('','What a frame asks of the GPU (test/gpu.js, '+out.gpu.size.replace('x','×')+', exact counts):');
  if(gpu.length)md.push('','| place | count | before | after | ratio |','|---|---|---|---|---|',...gpu,'','Every other count the same.');else md.push('the same at every place, every count.');}
const said=notes.filter(Boolean);if(said.length)md.push('',...said.map(n=>'- '+n));
md.push('',out.fill?'The GPU\'s time above is SwiftShader\'s (test/fill.js): a CPU drawing as a GPU, its ratios not a real GPU\'s — the person\'s readout at a `tp()` is the measure.':'Not measured: the GPU\'s own time (the shaders, the fill) — `--only fill` gives a proxy; the person\'s readout at a `tp()` is the measure.');
const text=md.join('\n');console.log('==== for the pull request (against '+(ref||'the merge base')+' '+base.slice(0,10)+') ====\n'+text);
const f=path.join(GAME,'test','render','perf.md');fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,text+'\n');console.log('\n(written to test/render/perf.md)');
