// test/idle.js — the idle menu's pace (v11.202, main.js loop, menu.js MENU_IDLE_IV): the game booted to its menu against the stub, the mouse still
// until the menu goes idle (MENU_IDLE), then the frames it draws counted on the recorder (rec.js REC.menu.n): at the stub's 60 Hz every other frame
// (~30 fps); woken (menuWake, a mouse move), every frame again; play never paced. In --test (build.js SIDE).
'use strict';
const fs=require('fs'),path=require('path'),os=require('os');
const ROOT=path.join(__dirname,'..');
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
const js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n')+'\nglobal.__I={REC,menu,BOOT,menuWake,MENU_IDLE,MENU_IDLE_IV,TIER_S,get tierBoot(){return tierBoot;},get mode(){return mode;},startNew,CLADES,get t(){return t;}};';
const tmp=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'tethys-idle-')),'bundle.js');fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
const log=console.log;console.log=()=>{};console.warn=()=>{};require('./stub.js');require(tmp);console.log=log;
const I=global.__I;let fails=0;const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++;};
for(let i=0;i<3000&&!I.BOOT.done;i++)__step(1);
ok(I.BOOT.done&&I.mode==='menu','booted to the menu');
ok(I.tierBoot>=0||I.TIER_S.v==='off','the loop samples the tier (tierFrame, v11.207): '+(I.TIER_S.v==='off'?'off here, as it should be under the stub':'its settle started'));
const steps=Math.ceil(I.MENU_IDLE/16.7)+30;for(let i=0;i<steps;i++)__step(1);
ok(I.menu.idle===true,'the menu idle after '+(I.MENU_IDLE/1000)+' s of a still mouse');
{const n0=I.REC.menu.n,t0=I.t;for(let i=0;i<120;i++)__step(1);const n=I.REC.menu.n-n0,dt=I.t-t0;
  ok(n>=55&&n<=65&&Math.abs(dt-2)<0.1,'idle: '+n+' of 120 frames drawn at 60 Hz (~30 fps), the clock on by '+dt.toFixed(2)+' s (2 s of time, not half)');}
{I.menuWake();const n0=I.REC.menu.n;for(let i=0;i<120;i++)__step(1);const n=I.REC.menu.n-n0;
  ok(I.menu.idle===false&&n===120,'woken (a mouse move): '+n+' of 120 drawn');}
{const n0=I.REC.n;I.startNew(I.CLADES[1]);for(let i=0;i<120;i++)__step(1);const n=I.REC.n-n0;
  ok(I.mode==='play'&&n>=119,'in play every frame: '+n+' of 120');}
console.log(fails?fails+' FAILED':'idle: ok');process.exit(fails?1:0);
