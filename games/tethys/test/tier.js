// test/tier.js — the tier that follows the machine (v11.199, scene.js TIER_K, tierStep, tierFrame, Q): the verdict driven by simulated machines — a GPU's
// time a frame with jitter, the frame's interval where there is no timer, the menu before play and play — over the seconds it waits for; then a stored
// verdict choosing the next start's tier (and #low/#high over it), and the game's own frame loop storing a verdict and reloading. It proves the
// decisions (the work tower down at once, a borderline card down from the next start, a good card never, a wrongly low one back up, nothing when the
// URL forces a tier), not what a real GPU does. In --test (build.js SIDE).
'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const ROOT=path.join(__dirname,'..');
function bundle(extra){const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
  const js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n')+'\n'+extra;
  const tmp=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'tethys-tier-')),'bundle.js');fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');return tmp;}
const HOOK='global.__T={Q,TIER_K,TIER_LS,TIER_SAVED,tierNew,tierStep,tierFrame,tierOff,REC,TIER_S,BOOT,RG,get mode(){return mode;},set mode(v){mode=v;},hintEl};';
// a child: the start's tier from a stored verdict (TIER_JSON) and the URL (TIER)
if(process.argv[2]==='--start'){const saved=process.env.TIER_JSON||'';global.localStorage={getItem:k=>k==='tethys.tier'&&saved?saved:null,setItem(){}};
  const log=console.log;console.log=()=>{};console.warn=()=>{};require('./stub.js');require(bundle(HOOK));console.log=log;
  console.log(JSON.stringify({tier:__T.Q.tier,why:__T.Q.why,pr:__T.Q.pr,flora:__T.Q.flora}));process.exit(0);}

let fails=0;const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++;};
const tmp=bundle(HOOK);const log=console.log;console.log=()=>{};console.warn=()=>{};require('./stub.js');require(tmp);console.log=log;
const T=global.__T,K=T.TIER_K;
let seed=11;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
// a machine: its GPU's ms a frame (gpu), the frame's interval (iv, ms); feed s seconds of the menu, then p of play → the verdict and when
function run(tier,why,timer,m,menuS,playS){const S=T.tierNew(tier,why,timer);let v='',at=-1,t=0;
  const feed=(secs,pl)=>{let s=0;while(s<secs&&!v){const iv=m.iv*(0.9+0.2*rnd()),g=m.gpu*(0.85+0.3*rnd());const r=T.tierStep(S,timer?g:iv,iv/1000,pl);s+=iv/1000;t+=iv/1000;if(r){v=r;at=t;}}};
  feed(menuS,false);feed(playS,true);return {v,at:+at.toFixed(1),med:+S.med.toFixed(1),state:S.v};}

console.log('the verdicts, by machine');
{const r=run('high','default',true,{gpu:82,iv:85},10,0);ok(r.v==='now'&&r.at>=K.menuS&&r.at<K.menuS+1&&Math.abs(r.med-82)<6,'the work tower on the high tier (GPU 82 ms): down at once, on the menu, after '+r.at+' s (median '+r.med+')');}
{const r=run('high','default',true,{gpu:8,iv:8.3},10,120);ok(r.v===''&&r.state==='keep','the home card (8 ms at 120 Hz): no verdict, judged and kept after a minute of play');}
{const r=run('high','default',true,{gpu:24,iv:33.3},10,120);ok(r.v==='low'&&r.at>=K.playS&&Math.abs(r.med-24)<3,'a card at 24 ms: not on the menu (under '+K.now+'), low from the next start after '+(r.at-10).toFixed(0)+' s of play (median '+r.med+')');}
{const r=run('low','machine',true,{gpu:28,iv:33.3},10,120);ok(r.v===''&&r.state==='keep','the work tower on its low (28 ms): kept low');}
{const r=run('low','machine',true,{gpu:4,iv:8.3},10,120);ok(r.v==='high'&&Math.abs(r.med-4)<1,'a card the verdict put low wrongly (4 ms on low): high from the next start (median '+r.med+')');}
{const r=run('low','touch',true,{gpu:4,iv:16.7},10,120);ok(r.v==='','a small touch screen\'s low is not the verdict\'s: never raised');}
{const r=run('high','hash',true,{gpu:82,iv:85},10,120);ok(r.v==='','#high in the URL: no verdict at all');}
console.log('without the GPU timer: a frame\'s interval, where the CPU did not make it slow');
{const r=run('high','default',false,{gpu:0,iv:70},10,0);ok(r.v==='now','frames of 70 ms on the menu: down at once');}
{const r=run('high','default',false,{gpu:0,iv:40},10,120);ok(r.v==='low','frames of 40 ms in play: low from the next start (over '+K.downIv+')');}
{const r=run('high','default',false,{gpu:0,iv:33.3},10,120);ok(r.v==='','frames of 33 ms (a 30 Hz screen, or a card just holding 30): kept');}
{const r=run('low','machine',false,{gpu:0,iv:16.7},10,120);ok(r.v==='','no timer, 60 Hz on low: never raised (the screen hides the headroom)');}
console.log('one verdict a session; the menu after play');
{const S=T.tierNew('high','default',true);for(let i=0;i<100;i++)T.tierStep(S,10,0.033,true);for(let i=0;i<300;i++)T.tierStep(S,90,0.1,false);
  ok(S.v===''&&S.mn===0,'the menu after play counts nothing ('+S.mn+' samples): the reload is for before play only');
  for(let i=0;i<3000;i++)T.tierStep(S,30,0.033,true);const v1=S.v;let more='';for(let i=0;i<100;i++)more+=T.tierStep(S,2,0.033,true);
  ok(v1==='low'&&more==='','a verdict once a session: low, then nothing more');
  ok(T.tierStep(T.tierNew('high','default',true),NaN,0.03,true)===''&&T.tierStep(T.tierNew('high','default',true),5,0,true)==='','a sample that is not a number, or of no time, is none');}

console.log('the start\'s tier, from a stored verdict');
const start=(json,tier)=>JSON.parse(cp.execFileSync(process.execPath,[__filename,'--start'],{env:Object.assign({},process.env,{TIER_JSON:json||'',TIER:tier||''}),encoding:'utf8'}).trim().split('\n').pop());
{const a=start('',''),b=start(JSON.stringify({tier:'low',ms:82,from:'high',at:1}),''),c=start(JSON.stringify({tier:'low',ms:82,from:'high',at:1}),'high'),d=start('{"tier":"ultra"}','');
  ok(a.tier==='high'&&a.why==='default','no verdict: high, by default');
  ok(b.tier==='low'&&b.why==='machine'&&b.flora<1,'a verdict of low: the low tier, the machine\'s (flora '+b.flora+')');
  ok(c.tier==='high'&&c.why==='hash','#high over the verdict');
  ok(d.tier==='high'&&d.why==='default','a stored verdict that is no tier: ignored');}

console.log('the game\'s frame loop: the verdict stored, the reload');
{const store=new Map(),reloads=[];global.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))};global.location.reload=()=>reloads.push(1);
  let clock=0;global.performance.now=()=>clock; // the clock the test's own: the game's loop is not stepped (its frames would be samples too)
  T.RG.on=false;T.BOOT.done=true;T.mode='menu';T.tierFrame(70,3); // the first frame after the boot: the settle starts
  for(let i=0;i<200;i++){clock+=70;T.tierFrame(70,3);} // frames of 70 ms with 3 of work: past the settle, then the menu's seconds
  const v=JSON.parse(store.get(T.TIER_LS)||'null');
  ok(reloads.length===1&&v&&v.tier==='low'&&v.from==='high'&&v.re===1&&v.fresh===1&&Math.abs(v.ms-70)<5,'70 ms frames on the menu: stored low ('+(v&&v.ms)+' ms) and reloaded once');}
console.log('no verdict where no one plays');
{const d0=T.REC.dev,w0=global.navigator.webdriver;T.REC.dev={gpu:'NVIDIA GeForce RTX 4060'};const real=T.tierOff();
  global.navigator.webdriver=true;const auto=T.tierOff();global.navigator.webdriver=w0;
  T.REC.dev={gpu:'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)'};const sw=T.tierOff();T.REC.dev={gpu:'llvmpipe (LLVM 15.0.7, 256 bits)'};const lp=T.tierOff();T.REC.dev=d0;
  ok(!real&&auto&&sw&&lp,'a real card judged; under automation (CI\'s boot, the site\'s cards), SwiftShader or llvmpipe: none');}
console.log(fails?fails+' FAILED':'tier: ok');process.exit(fails?1:0);
