// Headless check of the resolution that holds the frame (v11.188, scene.js RES, resStep): the controller driven by simulated machines — a display's
// refresh, a GPU whose frame time goes with the pixels (k²), a CPU's work — over a minute or more of frames each. It proves the controller's
// decisions (down on a GPU that drops frames, never on a CPU-bound frame or a good card, back up and settling, the floor), not what a real GPU does.
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
let js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n');
js+='\nglobal.__res={RES,resStep,FX,FX_DEF};\n';
const tmp=path.join(require('os').tmpdir(),'tethys_res_bundle_'+process.pid+'.js');
fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
process.env.PICK='1';
require('./stub.js');
require(tmp);fs.rmSync(tmp,{force:true});
const {RES,resStep,FX_DEF}=global.__res;let failed=false;
function ok(c,msg){console.log((c?'  ok   ':'  FAIL ')+msg);if(!c)failed=true;}
const fresh=()=>({k:1,ema:RES.target,cpu:0,bad:0,good:0,upW:RES.up,lastUp:-1e9,t:0,holdT:0,holdW:RES.hold,probe:null,moves:0});
// a machine: hz the display (or the browser's cap), gpu(k) the GPU's ms at scale k, cpu the CPU's ms. A frame is the slowest of the three with a little
// jitter, as Chrome paces a GPU-bound page (not to whole refreshes); `vsync` lands it on the next whole refresh instead, a native double buffer's way
let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
function run(m,secs){const S=fresh(),per=1000/m.hz,ks=[];let t=0;
  while(t<secs*1000){const work=Math.max(m.gpu(S.k),m.cpu),iv=m.vsync?Math.max(1,Math.ceil(work/per-1e-9))*per:Math.max(work,per)*(1+0.04*(rnd()-0.5));t+=iv;resStep(S,iv,m.cpu);ks.push([t,S.k,iv]);}
  const tail=ks.filter(x=>x[0]>secs*1000-20000),moves20=tail.filter((x,i)=>i&&x[1]!==tail[i-1][1]).length,ivT=tail.reduce((s,x)=>s+x[2],0)/tail.length;
  return {S,k:S.k,moves:S.moves,moves20,ivT};}
console.log('the controller (RES): target '+RES.target+' ms, a step '+RES.step+', the floor '+RES.min);
{const r=run({hz:60,gpu:k=>25*k*k,cpu:5},90);ok(r.k<=0.8&&r.k>=0.7&&r.ivT<18&&r.moves20<=2,'a GPU at 25 ms on a 60 Hz screen settles at '+r.k+' ('+r.ivT.toFixed(1)+' ms a frame over the last 20 s, '+r.moves+' steps, '+r.moves20+' in the last 20 s)');}
{const r=run({hz:60,gpu:k=>60*k*k,cpu:5},120);ok(r.k===RES.min,'a GPU at 60 ms goes to the floor: '+r.k+' ('+r.ivT.toFixed(1)+' ms a frame)');}
{const r=run({hz:60,gpu:k=>10*k*k,cpu:30},60);ok(r.k===1,'CPU-bound (30 ms of work, the GPU at 10): the scale stays '+r.k);}
{const r=run({hz:144,gpu:k=>8*k*k,cpu:4},60);ok(r.k===1,'a good card on 144 Hz (8 ms, 13.9 a frame): stays '+r.k);}
{const r=run({hz:60,gpu:k=>14*k*k,cpu:4},60);ok(r.k===1&&r.moves===0,'a card that makes 60 fps: never moves ('+r.moves+' steps)');}
{const r=run({hz:30,gpu:k=>10*k*k,cpu:4},300);ok(r.k===1&&r.moves<=8,'a browser capped at 30 fps (a battery saver): a step tried, undone, tried rarely after — '+r.k+', '+r.moves+' steps in 5 minutes');}
{const r=run({hz:60,gpu:k=>25*k*k,cpu:5,vsync:true},180);ok(r.moves<=8&&(r.k===1||r.ivT<18),'a strictly vsynced GPU at 25 ms (a step of 0.1 cannot cross the refresh): no swinging — '+r.k+', '+r.moves+' steps in 3 minutes ('+r.ivT.toFixed(1)+' ms a frame)');}
{const r=run({hz:60,gpu:k=>18*k*k,cpu:4},180);ok(r.moves20<=1&&r.ivT<18,'a GPU just over the frame (18 ms) settles, not swinging: '+r.k+', '+r.moves+' steps in 180 s, '+r.moves20+' in the last 20 ('+r.ivT.toFixed(1)+' ms a frame)');}
{const S=fresh();resStep(S,16.7,4);const k0=S.k;resStep(S,5000,4);resStep(S,NaN,4);ok(S.k===k0&&S.t<0.1,'a hidden tab\'s gap and a NaN are not frames');}
ok(FX_DEF.autoRes===true,'on by default (the effects list\'s `hold the frame`)');
console.log(failed?'res: FAILED':'res: all ok');process.exit(failed?1:0);
