// test/probe.js — the GPU probe (v11.208, probe.js; F8): the game booted against the stub and a new game played a little; then a probe run with the GPU's
// times made up from what each state leaves out (a cost for every part and every effect that is on, the results arriving two frames late as the timer's do),
// and the probe must give each cost back. Also: what each object counts as (probeCat), that a skipped part's draws never reach three while the rest do, that
// every effect is as it was afterwards, that the result is kept for the report, and that leaving play stops a probe with nothing kept. In --test (build.js SIDE).
'use strict';
const fs=require('fs'),path=require('path'),os=require('os');
const ROOT=path.join(__dirname,'..');
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
const js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n')+
  '\nglobal.__P={probe,probeStep,probeGot,probeCat,PROBE_K,PROBE_PARTS,PROBE_FX,get PROBE(){return PROBE;},REC,RG,FX,fxApply,renderer,sky,surface,waterDome,SURF_OCC,POOLS,chunks,creatures,player,startNew,CLADES,BOOT,recFull,get mode(){return mode;},set mode(v){mode=v;}};';
const tmp=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'tethys-probe-')),'bundle.js');fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
const log=console.log;console.log=()=>{};console.warn=()=>{};require('./stub.js');require(tmp);
const P=global.__P;let fails=0;const ok=(c,m)=>{log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++;};
for(let i=0;i<3000&&!P.BOOT.done;i++)__step(1);
P.startNew(P.CLADES[1]);for(let i=0;i<120;i++)__step(1);
ok(P.mode==='play','in play');
ok(/timer/.test(P.probe()),'no GPU timer: the probe says so and does not start');
P.RG.on=true; // the stub's browser has no timer; the results are fed by hand below
const drawn=[];P.renderer.renderBufferDirect=function(c,s,g,m,o){drawn.push(o);}; // three's call, as the stub has none: what reaches it
const COST={terrain:8,flora:5,rocks:2,far:1,creatures:3,water:4,sky:1.5,horizon:0.25},FXC={caustics:2,texelLight:0.7,shadows:1.2,statics:0.9,shafts:0.6,snow:0.4,rain:0.1,clouds:1.1,refract:1.6,crest:0.3,halo:0.2,murk:0.5,mirror:0.15,cloudLight:0.35,ground:0.8,sharp:0.45};
const was=Object.assign({},P.FX),BASE=10;
const gpuNow=()=>{let g=BASE;for(const k in COST)if(!(P.PROBE&&P.PROBE.skip===k))g+=COST[k];for(const k of P.PROBE_FX)if(P.FX[k]===true)g+=FXC[k];return g;};
const full=gpuNow();
const said=P.probe();ok(/^started: \d+ states/.test(said),said);
const fxOn=P.PROBE_FX.filter(k=>was[k]===true),nSt=1+2*(P.PROBE_PARTS.length+fxOn.length);
ok(P.PROBE.st.length===nSt,'its states: the frame as it is, then each part and each effect that is on ('+fxOn.join(' ')+'), the frame as it is between every two — '+P.PROBE.st.length);
// what each thing counts as, and the skip at three's call
const ch=[...P.chunks.values()].find(c=>c.terrain),pool=[...P.POOLS.values()].find(p=>p.im),cr=P.creatures.find(c=>c.alive&&c.g);let crMesh=null;if(cr)cr.g.traverse(o=>{if(!crMesh&&o.isMesh)crMesh=o;});
{let hit=0;const cat={};const lag=[];let frames=0;
  while(P.PROBE&&frames<3000){P.probeStep();if(!P.PROBE)break;const S=P.PROBE.st[P.PROBE.i]; // past the last state: the wait for the timer's last results
    if(S&&S.k==='part'&&!cat[S.name]){cat[S.name]=1;const n0=drawn.length;
      const objs=[[P.sky,P.sky.material],[P.surface,P.surface.material],[ch.terrain,ch.terrain.material],[pool.im,pool.im.material],[crMesh,crMesh&&crMesh.material]];
      for(const [o,m] of objs)if(o)P.renderer.renderBufferDirect(null,null,o.geometry,m,o,null);
      const want=objs.filter(([o,m])=>o&&P.probeCat(o,m)!==S.name).length;if(drawn.length-n0===want)hit++;}
    lag.push([P.REC.frame,gpuNow()]);if(lag.length>2){const [fr,g]=lag.shift();P.probeGot(fr,g);} // the timer's results two frames late
    P.REC.frame++;frames++;}
  ok(!P.PROBE&&frames<3000,'it ran to its end in '+frames+' frames ('+Math.round(frames/60)+' s at 60 Hz)');
  ok(hit===P.PROBE_PARTS.length,'each part skipped at three\'s call while it is measured, the rest drawn ('+hit+' of '+P.PROBE_PARTS.length+')');}
ok(P.probeCat(P.sky,P.sky.material)==='sky'&&P.probeCat(P.surface,P.surface.material)==='water'&&P.probeCat(P.waterDome,P.waterDome.material)==='water'&&P.probeCat(P.SURF_OCC,P.SURF_OCC.material)==='water','the sky, the surface, the dome and the occluder');
ok(P.probeCat(ch.terrain,ch.terrain.material)==='terrain'&&P.probeCat(pool.im,pool.im.material)==='flora','a cell\'s terrain, a species\' pool');
ok(crMesh&&P.probeCat(crMesh,crMesh.material)==='creatures','a creature\'s mesh (it was one while its part was measured)');
const R=P.REC.probe[0];
ok(P.REC.probe.length===1&&R&&Math.abs(R.gpu-full)<1e-6,'kept for the report: the frame as it is '+(R&&R.gpu)+' ms (made up: '+full+')');
{const bad=R.parts.filter(x=>Math.abs(x[1]-COST[x[0]])>0.011);ok(R.parts.length===P.PROBE_PARTS.length&&!bad.length,'every part\'s cost given back: '+R.parts.map(x=>x[0]+' '+x[1]).join(', ')+(bad.length?' — wrong: '+bad.map(x=>x[0]).join(' '):''));}
{const bad=R.fx.filter(x=>Math.abs(x[1]-FXC[x[0]])>0.011);ok(R.fx.length===fxOn.length&&!bad.length,'every effect that was on: '+R.fx.map(x=>x[0]+' '+x[1]).join(', '));}
ok(R.parts[0][0]==='terrain'&&R.parts[R.parts.length-1][0]==='horizon','the dearest first');
ok(Object.keys(was).every(k=>P.FX[k]===was[k]),'every effect as it was before');
ok(Array.isArray(P.recFull().probe)&&P.recFull().probe.length===1,'in the report (recFull)');
// leaving play stops one, nothing kept, the effects as they were
{P.probe();let n=0;while(P.PROBE&&n<200){P.probeStep();P.REC.frame++;n++;if(n===60)P.mode='menu';}
  ok(!P.PROBE&&P.REC.probe.length===1&&Object.keys(was).every(k=>P.FX[k]===was[k]),'leaving play stops a probe: nothing kept, every effect as it was');P.mode='play';}
log(fails?fails+' FAILED':'probe: ok');process.exit(fails?1:0);
