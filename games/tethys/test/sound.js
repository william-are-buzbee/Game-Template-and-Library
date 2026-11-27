#!/usr/bin/env node
// test/sound.js — every sound the game makes, rendered headless and measured (v11.248, the audio overhaul's instrument; AUDIO.md, "The ear's
// instruments"). The sound bench (src/bench.js) run in test/benchpage.js's page — Math.random seeded, the bench's clock, the real sources — with
// its takes handed back here (bench.out) instead of posted to serve.js: the one-shots, the noise buffers and impulse responses and the beds,
// offline, then the whole mix at each of the bench places (benchpage.js PLACES) and at the vent, offline too, with the game's own tick run
// against it at 20 Hz and the world stepped between. Nothing here needs a person at a browser, and nothing is real time, so a run is the same
// run every time: what moves is what changed.
//   Nobody here can hear. What this holds is what a sound *is* — its loudness (BS.1770 LUFS), its peak, where its energy sits, how it decays —
// so a change that turns the vent into a hiss, or a bite into silence, shows in the diff of test/sound.json, as test/gpu.json does for the GPU.
// Whether it sounds right is the person's: test/sound.js --dist writes the listening set the site's listen.html plays, blind, against main's.
//   node test/sound.js              render every take into test/render/ (shot_, noise_, ir_, bed_, mix_*.wav) and print the table
//   node test/sound.js --check      the same, then against test/sound.json: fails when a number moves past its tolerance (npm run smoke)
//   node test/sound.js --update     writes test/sound.json — a change that moves a sound updates it in the same pull request, which says why
//   node test/sound.js --dist <dir> [--from <url>]   also the listening set: <dir>/listen/*.mp3 (ffmpeg) and <dir>/listen/index.json, for the site
//                                    (.github/workflows/pages.yml). --from: the live site's listening set; a sound whose numbers are main's takes
//                                    main's file as it is, so the site's history (every publish a commit on gh-pages) holds one copy of it
// Env: MIX_S (a mix's seconds before it is tried again, 240), ONLY (groups, comma-separated: shots, noise, beds, mix), PLACES (mix places, comma-separated), JOBS (pages side by side for the mixes,
// 2).
//   The same to the bit: the one-shots, the material and the beds, run to run. A mix is not quite: some hundred of its 768,000 samples move by
// one step of sixteen bits between runs (float order in the audio thread, at −136 dB; seen v11.248), so "the same sound" is `fp`, the hash of
// its numbers to a hundredth of a dB, a hertz and a thousandth of a band — what listen.html and --from compare. `pcm` is the take's own hash.
// Then `node test/spectro.js` draws any of them.
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{execFileSync}=require('child_process');
const {here,playwright,open,PLACES,bootThrough}=require('./benchpage.js');
const {readWav,measure}=require('./spectro.js');
const argv=process.argv.slice(2),CHECK=argv.includes('--check'),UPDATE=argv.includes('--update'),DIST=argv.includes('--dist')?argv[argv.indexOf('--dist')+1]:null;
const FROM=argv.includes('--from')?argv[argv.indexOf('--from')+1]:null;
if(argv.includes('--dist')&&!DIST){console.log('--dist <dir>: where the listening set goes');process.exit(2);}
const OUT=path.join(here,'test','render'),KEPT=path.join(here,'test','sound.json');
const GROUPS=(process.env.ONLY||'shots,noise,beds,mix').split(',');
// the vent is the one placed bed no bench place hears: 25 m off the chimney's mouth, at its height (audio.js auTick, 6)
const MIXES=Object.assign({},PLACES,{vent:{vent:true,yaw:Math.PI/2,above:false,what:'25 m off the vent\'s mouth, at its height, facing it: the rumble and the boil, placed and reverbed'}});
const mixNames=(process.env.PLACES||Object.keys(MIXES).filter(n=>n!=='at').join(',')).split(',').filter(n=>n in MIXES);
const JOBS=+(process.env.JOBS||2); // two: four browsers at once ran a session out of memory (v11.248)
fs.mkdirSync(OUT,{recursive:true});
const takes=new Map(); // name → {group, what}
// ---- in the page ----
async function pageOf(pw){ // a page booted through to the menu, its audio graph built, every take handed to __take
  const P=await open(pw,here,{width:640,height:360});
  await P.page.exposeFunction('__take',(name,b64)=>{if(!/^[a-z0-9_.-]+\.wav$/i.test(name))throw new Error('bad take name '+name);fs.writeFileSync(path.join(OUT,name),Buffer.from(b64,'base64'));});
  await bootThrough(P.page);
  const ok=await P.page.evaluate(()=>{window.renderFrame=function(){}; // the sound needs no picture: software WebGL is the slowest thing here
    initAudio();if(!AU.on)return false;AU.bench=true;
    bench.out=async(name,ch,sr)=>{const b=new Uint8Array(await bnWav(ch,sr).arrayBuffer());let s='';for(let i=0;i<b.length;i+=32768)s+=String.fromCharCode.apply(null,b.subarray(i,i+32768));await window.__take(name,btoa(s));};
    return true;});
  if(!ok)throw new Error('no audio graph in the page (initAudio failed)');
  return P;}
async function bench(pw){ // the one-shots, the material and the beds: one page, offline
  const P=await pageOf(pw);
  try{const r=await P.page.evaluate(async g=>{const said=[];bench.log=said;
      if(g.includes('shots'))await bnShots();if(g.includes('noise'))await bnNoises();if(g.includes('beds'))await bnBeds();
      return {shots:BN_SHOTS.map(s=>({id:s.id,c:s.c})),beds:bnChains().map(c=>c.id)};},GROUPS);
    if(GROUPS.includes('shots'))for(const s of r.shots)takes.set('shot_'+s.id,{group:'shot',what:s.c});
    if(GROUPS.includes('noise')){for(const n of ['white','brown','pink','crackle'])takes.set('noise_'+n,{group:'noise',what:'the '+n+' buffer (audio.js auNoise)'});
      for(const n of ['cove','cavern'])takes.set('ir_'+n,{group:'noise',what:'the '+n+'\'s impulse response (audio.js auIR)'});}
    if(GROUPS.includes('beds'))for(const b of r.beds)takes.set('bed_'+b,{group:'bed',what:'the '+b.replace(/_/g,' ')+' chain alone at 0.5, the medium open, no reverb'});
    if(P.errs.length)throw new Error('page errors: '+P.errs.slice(0,3).join(' | '));}
  finally{await P.close();}}
// A mix gets MIX_S seconds, then its browser is closed and it runs once more: once in a full run (v11.248, the wood, two pages at a time) a
// page sat busy for twenty minutes that alone takes one. Twice over the limit is a failure, said, never a hang in CI.
const MIX_S=+(process.env.MIX_S||240);
async function mix(pw,name){for(let n=1;;n++){const t0=Date.now();
  try{await Promise.race([mixOnce(pw,name),new Promise((ok,no)=>setTimeout(()=>no(new Error('timeout')),MIX_S*1000))]);console.log('  '+name+' '+((Date.now()-t0)/1000).toFixed(0)+' s'+(n>1?' (again)':''));return;}
  catch(e){if(e.message!=='timeout'||n>=2)throw new Error(name+': '+(e.message==='timeout'?'over '+MIX_S+' s twice':e.message));console.log('  '+name+': over '+MIX_S+' s, its browser closed; again');}}}
async function mixOnce(pw,name){ // one place's whole mix: a page of its own, so a place depends on no other
  const a=MIXES[name],P=await pageOf(pw);const kill=setTimeout(()=>{P.close().catch(()=>{});},MIX_S*1000);
  try{const r=await P.page.evaluate(async a=>{
      if(a.vent){const vp=LM.chimney,vy=(LMK.chimney?LMK.chimney.y:vp.h)+52;a=Object.assign({},a,{x:vp.x+25,y:vy,z:vp.z});}
      let gens=0;for(const n of ['genChunk','genRegion']){const f=window[n];if(typeof f==='function')window[n]=function(){gens++;return f.apply(this,arguments);};}
      choose(0,V3(a.x,a.y,a.z),a.yaw,0);
      const step=n=>{for(let i=0;i<n;i++){if(a.hold){player.pos.y=a.y;player.vel.y=0;}window.__step(1);}};
      let k=0,quiet=0;for(;k<600&&quiet<20;k++){const n=gens;step(1);quiet=gens===n?quiet+1:0;}step(150); // streamed in and settled, as test/gpu.js stands
      const ch=await bnMix(BN_MIX,BN_PRE,dt=>step(Math.round(dt*60)));await bench.out('mix_'+a.name+'.wav',ch,BN_SR);
      return {mode:mode,above:wasAbove===true,depth:TIDE-player.pos.y};},Object.assign({name},a));
    if(r.mode!=='play'||r.above!==!!a.above)throw new Error(name+': not the place it says ('+r.mode+', the camera '+(r.above?'above':'under')+' the water)');
    takes.set('mix_'+name,{group:'mix',what:a.what});
    if(P.errs.length)throw new Error('page errors at '+name+': '+P.errs.slice(0,3).join(' | '));}
  finally{clearTimeout(kill);await P.close().catch(()=>{});}}
// ---- the numbers ----
const r1=v=>Math.round(v*10)/10,r2=v=>Math.round(v*100)/100;
function numbers(name){const buf=fs.readFileSync(path.join(OUT,name+'.wav')),w=readWav(buf),M=measure(w);
  const fine=[w.n,w.nc,M.lufs.toFixed(2),M.stmax.toFixed(2),M.peak.toFixed(2),M.centroid.toFixed(0),M.roll.toFixed(0),M.bands.map(v=>v.toFixed(3)).join(','),M.decay.toFixed(3)].join(' ');
  return {fp:crypto.createHash('sha1').update(fine).digest('hex').slice(0,12),secs:r2(w.n/w.sr),lufs:r1(M.lufs),stmax:r1(M.stmax),peak:r1(M.peak),centroid:Math.round(M.centroid),roll:Math.round(M.roll),
    bands:M.bands.map(r2),decay:M.decay<0?-1:Math.round(M.decay*1000),steady:r2(1-Math.min(1,M.steady)),clip:M.clip,
    pcm:crypto.createHash('sha1').update(buf.subarray(44)).digest('hex').slice(0,12)};}
// how far a number may move before the check calls it a change: a mix stands in a world the creatures move through, so it is given more
const TOL={lufs:[1,1.5],stmax:[1,1.5],peak:[1.5,2],centroid:[0.1,0.15],roll:[0.1,0.15],bands:[0.04,0.06],decay:[0.15,0.25]};
function moved(name,k,n){const mx=name.startsWith('mix_')?1:0,out=[];
  for(const key of Object.keys(TOL)){const t=TOL[key][mx],a=k[key],b=n[key];if(a===undefined)continue;
    if(key==='bands'){a.forEach((v,i)=>{if(Math.abs(b[i]-v)>t)out.push('band '+['sub','low','mid','hi','air'][i]+' '+v+' → '+b[i]);});continue;}
    if(key==='decay'&&(a<0||b<0)){if(a!==b)out.push('decay '+a+' → '+b+' ms');continue;}
    const rel=key==='centroid'||key==='roll'||key==='decay',d=rel?Math.abs(b-a)/Math.max(Math.abs(a),20):Math.abs(b-a);
    if(a<=-69.9&&b<=-69.9)continue;
    if(d>t)out.push(key+' '+a+' → '+b);}
  if(n.clip&&!k.clip)out.push('clips ('+n.clip+' samples)');
  return out;}
// ---- the listening set (pages.yml): mp3 for the ear, the numbers beside, and the pcm's hash so listen.html knows what changed ----
async function dist(rows){
  const dir=path.join(path.resolve(DIST),'listen');fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});
  try{execFileSync('ffmpeg',['-version'],{stdio:'ignore'});}catch(e){console.log('no ffmpeg: no listening set');return;}
  const cl=fs.readFileSync(path.join(here,'CHANGELOG.md'),'utf8').match(/^## (v[\d.]+)/gm),version=cl?cl[cl.length-1].slice(3):'?';
  let live={};if(FROM){try{const r=await fetch(FROM.replace(/\/?$/,'/')+'index.json');if(r.ok)for(const x of (await r.json()).sounds)live[x.name]=x;else console.log('--from: '+r.status+' (no listening set live yet?)');}catch(e){console.log('--from: '+e.message);}}
  const list=[];let kept=0;
  for(const [name,n] of rows){const t=takes.get(name);if(!t||t.group==='noise')continue; // the material is for the pictures, not the ear
    const f=path.join(dir,name+'.mp3');let got=false;
    if(live[name]&&live[name].fp===n.fp){try{const r=await fetch(FROM.replace(/\/?$/,'/')+name+'.mp3');if(r.ok){fs.writeFileSync(f,Buffer.from(await r.arrayBuffer()));got=true;kept++;}}catch(e){}}
    if(!got)execFileSync('ffmpeg',['-loglevel','error','-y','-i',path.join(OUT,name+'.wav'),'-map_metadata','-1','-fflags','+bitexact','-flags:a','+bitexact','-c:a','libmp3lame','-b:a','192k',f]);
    list.push({name:name,group:t.group,what:t.what,fp:n.fp,secs:n.secs,lufs:n.lufs,stmax:n.stmax,peak:n.peak,centroid:n.centroid,bands:n.bands});}
  fs.writeFileSync(path.join(dir,'index.json'),JSON.stringify({version:version,sounds:list},null,1)+'\n');
  console.log('listening set: '+list.length+' sounds ('+kept+' main\'s files, the same sound) → '+path.relative(process.cwd(),dir));}
// ---- run ----
(async()=>{const pw=playwright(),t0=Date.now();
  if(GROUPS.some(g=>g!=='mix'))await bench(pw);
  if(GROUPS.includes('mix')){const q=mixNames.slice();await Promise.all(Array.from({length:Math.max(1,JOBS)},async()=>{while(q.length)await mix(pw,q.shift());}));}
  const rows=[...takes.keys()].sort().map(n=>[n,numbers(n)]);
  const pad=(s,n)=>String(s).padStart(n);
  console.log(pad('',22)+pad('s',6)+pad('lufs',7)+pad('stmax',7)+pad('peak',7)+pad('centr',7)+pad('roll85',7)+'  sub/low/mid/hi/air'+pad('dec40',7)+pad('steady',7));
  for(const [name,n] of rows)console.log(name.padEnd(22).slice(0,22)+pad(n.secs,6)+pad(n.lufs,7)+pad(n.stmax,7)+pad(n.peak,7)+pad(n.centroid,7)+pad(n.roll,7)+'  '+n.bands.map(v=>pad(Math.round(v*100),3)).join('')+'   '+pad(n.decay<0?'-':n.decay,7)+pad(n.steady,7)+(n.clip?'  CLIP':''));
  console.log(rows.length+' takes in '+((Date.now()-t0)/1000).toFixed(0)+' s → test/render/*.wav (node test/spectro.js draws them)');
  const now=Object.fromEntries(rows.map(([k,v])=>[k,v]));
  let bad=0;
  if(UPDATE){let keep={note:'what every sound is (test/sound.js): --update writes it, --check (CI) fails when a number moves past its tolerance; pcm is the take\'s hash, to say what is the same to the bit',sounds:{}};
    if(fs.existsSync(KEPT)&&(process.env.ONLY||process.env.PLACES))keep.sounds=JSON.parse(fs.readFileSync(KEPT,'utf8')).sounds;
    Object.assign(keep.sounds,now);keep.sounds=Object.fromEntries(Object.keys(keep.sounds).sort().map(k=>[k,keep.sounds[k]]));
    fs.writeFileSync(KEPT,JSON.stringify(keep,null,1).replace(/\[\n\s+([^\]]+?)\n\s+\]/g,(m,a)=>'['+a.replace(/\s+/g,'')+']')+'\n');console.log('wrote test/sound.json');}
  if(CHECK){if(!fs.existsSync(KEPT)){console.log('no test/sound.json: node test/sound.js --update writes it');process.exit(1);}
    const kept=JSON.parse(fs.readFileSync(KEPT,'utf8')).sounds,lines=[];let same=0;
    for(const [name,n] of rows){const k=kept[name];if(!k){lines.push(name+': not in test/sound.json');continue;}if(k.pcm===n.pcm)same++;const m=moved(name,k,n);if(m.length)lines.push(name+': '+m.join(', '));}
    for(const name of Object.keys(kept))if(!now[name]&&(!process.env.ONLY&&!process.env.PLACES))lines.push(name+': in test/sound.json, not made');
    if(lines.length){console.log('\nmoved past its tolerance from test/sound.json:\n  '+lines.join('\n  ')+'\nIf the change means it: node test/sound.js --update, commit test/sound.json with the change, and say in the pull request what moved and why.');bad++;}
    else console.log('\nevery sound within its tolerance of test/sound.json; '+same+' of '+rows.length+' the same to the bit');}
  if(DIST)await dist(rows);
  if(bad)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1);});
