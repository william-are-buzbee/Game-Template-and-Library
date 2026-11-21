// test/opt.js — the terrain's hot functions stay in V8's optimised code (v11.197, world.js rdata, recSeal; the person's GC pauses): every record's
// plain objects are on RDATA's shapes (no other object's, every field stored as any value — so V8 never retires one); then sample() over the home
// waters and the world, 200,000 times, in a node of its own with V8's natives: sample and islandH optimised at the end, islandH thrown out of
// optimised code no more than a few times (to v11.196 it was 25 times and ended in the baseline tier: a record's object on a retired shape, a read the
// optimiser would not take feedback from), and what a call allocates (a lower bound: the heap's growth; printed, not held). The same V8 as Chrome's.
// In --test (build.js SIDE).
'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const ROOT=path.join(__dirname,'..');
if(process.argv[2]!=='--child'){
  const r=cp.spawnSync(process.execPath,['--allow-natives-syntax','--trace-deopt',__filename,'--child'],{encoding:'utf8',maxBuffer:1<<28});
  const out=(r.stdout||'')+(r.stderr||''),lines=out.split('\n'),deopts=lines.filter(l=>/deoptimizing 0x[0-9a-f]+ <JSFunction islandH /.test(l)).length;
  for(const l of lines)if(/^ {2}(ok|FAIL) |^opt:/.test(l))console.log(l);
  let fails=lines.filter(l=>/^ {2}FAIL /.test(l)).length+(r.status===0?0:1);
  const ok=deopts<=12;console.log((ok?'  ok   ':'  FAIL ')+'islandH thrown out of optimised code '+deopts+' times (no more than 12 — the compiles\' timing moves it a little; v11.196: 25 and more)');if(!ok)fails++;
  if(r.status!==0&&!/^ {2}FAIL /m.test(out))console.log(out.slice(-2000));
  console.log(fails?fails+' FAILED':'opt: ok');process.exit(fails?1:0);}
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
let js='';for(const n of ORDER)js+=fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')+'\n';
js+='\nglobal.__O={sample,islandH,ISLANDS,RDATA:typeof RDATA==="undefined"?null:RDATA,WX0,WX1,WZ0,WZ1};';
const tmp=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'tethys-opt-')),'bundle.js');fs.writeFileSync(tmp,js);
const log=console.log;console.warn=()=>{};require('./stub.js');console.log=()=>{};require(tmp);console.log=log;const O=global.__O;
let fails=0;const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++;};
// every plain object a record holds, at any depth (arrays walked), on RDATA's prototype
let n=0,bad=[];const walk=(v,at)=>{if(!v||typeof v!=='object'||ArrayBuffer.isView(v))return;if(Array.isArray(v)){v.forEach((x,i)=>walk(x,at+'['+i+']'));return;}
  const p=Object.getPrototypeOf(v);if(p===Object.prototype){bad.push(at);return;}if(p!==O.RDATA)return;n++;for(const k of Object.keys(v))walk(v[k],at+'.'+k);};
for(const R of O.ISLANDS)for(const k of Object.keys(R))walk(R[k],R.id+'.'+k);
ok(bad.length===0&&n>O.ISLANDS.length,'every record\'s data on RDATA\'s shapes: '+n+' objects in '+O.ISLANDS.length+' records'+(bad.length?'; not: '+bad.slice(0,5).join(', '):''));
// sample() as the cells and the far regions ask it: round home densely, then across the world
const go=k=>{for(let i=0;i<k;i++){const x=i&1?-3000+(i%400)*15:O.WX0+(O.WX1-O.WX0)*((i*7919)%10007)/10007,z=i&1?-3000+((i/400)|0)%400*15:O.WZ0+(O.WZ1-O.WZ0)*((i*104729)%10009)/10009;O.sample(x,z);}};
go(100000);const v8=require('v8'),used=()=>v8.getHeapSpaceStatistics().reduce((a,s)=>a+s.space_used_size,0);
let grow=0;const B=2000;for(let k=0;k<50;k++){const a=used();go(B);const b=used();if(b>a)grow+=b-a;} // no clock: a test run side by side reads none (test/bench.js times sample())
const st=new Function('f','return %GetOptimizationStatus(f)'),opt=f=>(st(f)&16)!==0; // V8's natives, in the child only (its flag); a string here so the parent parses
ok(opt(O.sample)&&opt(O.islandH),'sample and islandH in optimised code at the end (status '+st(O.sample)+', '+st(O.islandH)+')');
console.log('opt: about '+(grow/(50*B)).toFixed(0)+' bytes allocated a sample() call (v11.196: ~2,000)');
process.exit(fails?1:0);
