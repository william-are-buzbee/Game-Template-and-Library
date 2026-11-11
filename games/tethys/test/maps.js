// test/maps.js — the water and floor maps as a window (v11.104, GLOBE §10, the windows; scene.js WM_HALF, WM_O; far.js WM_A, WM_I0, wmRecentre,
// wmShiftGen): the whole game against the stub, as test/falls.js boots it, twice. As built (the window is the world's square): it sits at the
// anchor, its centre is 0, and a swim to the far corner never moves it. With the window patched to half the square (MAPS=half, run as a child
// of this file): it boots centred on the world's middle; a teleport 10 km east moves it, by whole regions; every map read (wmSample, wmFloor,
// wmWave, wmBloom) at places inside both windows and away from the regions built meanwhile is the same to the bit after the move as before; the
// uncovered strip holds what a coarse fill at boot would have put there; and the shaders' centre (uWmO) moved with the texels. In --test.
'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const ROOT=path.join(__dirname,'..'),HALFW=process.env.MAPS==='half';
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
let js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n');
if(HALFW){const a='const WM_HALF=CELL*120,';if(!js.includes(a))throw new Error('scene.js WM_HALF not as expected');js=js.replace(a,'const WM_HALF=CELL*60,');}
js+='\nglobal.__M={get I0(){return WM_I0;},get J0(){return WM_J0;},get shifts(){return wmShifts;},get gen(){return wmGen;},WM_O,WM_A,WM_N,WM_HALF,WM_MOVE,get WM_T(){return WM_T;},wmRaw,fmRaw,wfRaw,pgRaw,pfRaw,WM_DATA,FM_DATA,'
  +'wmSample,wmFloor,wmWave,wmBloom,sample,waterColor,waveEnergy,plankTexel,FM_SCALE,HALF,player,cellsAround,tp:(x,z)=>{player.pos.set(x,dispY,z);cellsAround();}};';
const tmp=path.join(os.tmpdir(),'tethys_maps'+(HALFW?'_half':'')+'.js');fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
process.env.PICK='1';require('./stub.js');require(tmp);
const M=__M;let fails=0;const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++;};
const reads=(x,z)=>{const a=[0,0,0,0],b=[0,0,0,0];M.wmSample(x,z,a);M.wmBloom(x,z,b);return a.concat(b,[M.wmFloor(x,z),M.wmWave(x,z)]);};
__step(60);
if(!HALFW){
  console.log('maps: the window as built (the world\'s square)');
  ok(M.I0===0&&M.J0===0&&M.WM_O[0]===0&&M.WM_O[1]===0&&M.WM_N===1440,`the window is the square: its corner at the anchor (${M.I0}, ${M.J0}), its centre (${M.WM_O[0]}, ${M.WM_O[1]}), ${M.WM_N}² texels`);
  ok(!M.WM_MOVE,'and it does not move: the world is no wider than it (HALF '+M.HALF+', WM_HALF '+M.WM_HALF+')');
  M.tp(M.HALF-400,M.HALF-400);__step(120);M.tp(-M.HALF+400,-M.HALF+400);__step(120);
  ok(M.shifts===0&&M.I0===0&&M.J0===0,`swum to two far corners: still unmoved (${M.shifts} moves)`);
  const r=M.wmSample(0,0,[0,0,0,0]),u=(0-M.WM_A)/M.WM_T-M.I0-0.5;ok(u===(0+M.HALF)/M.WM_T-0.5,'a read\'s texel coordinate is v11.103\'s to the bit ((x − WM_A)/WM_T − WM_I0 − 0.5 against (x + HALF)/WM_T − 0.5)');
  // the half-width window, in a process of its own
  const ch=cp.spawnSync(process.execPath,[__filename],{env:Object.assign({},process.env,{MAPS:'half'}),encoding:'utf8',maxBuffer:1<<26});
  process.stdout.write(ch.stdout.split('\n').filter(l=>/^ {2}(ok|FAIL)|^maps/.test(l)).join('\n')+'\n');if(ch.status!==0){fails++;if(ch.stderr)console.log(ch.stderr.slice(-2000));}
  console.log(fails?`maps: ${fails} FAILED`:'maps: ok');process.exit(fails?1:0);
}
// ---- the half window ----
console.log('maps: a window half the square (patched), moved');
const T=M.WM_T,N=M.WM_N;
ok(M.WM_MOVE&&N===720&&M.I0===360&&M.J0===360&&Math.abs(M.WM_O[0])<1e-6&&Math.abs(M.WM_O[1])<1e-6,`it moves (the world is wider), ${N}² texels, booted centred on the middle: its corner at texel (${M.I0}, ${M.J0}) of the anchor's grid`);
// places in both windows (x −2..4 km) and far from the start and the goal's regions (built within ~3 km of the player)
const P=[];for(let x=-2000;x<=4000;x+=600)for(let z=-11000;z<=11000;z+=1100){if(Math.hypot(x,z)<4500)continue;P.push([x,z]);}
const before=P.map(([x,z])=>reads(x,z)),I00=M.I0;
M.tp(10000,0);__step(30);
ok(M.shifts===1&&M.I0!==I00&&(M.I0-I00)%24===0&&M.J0===360,`a teleport 10 km east moves it once, by whole regions: ${(M.I0-I00)} texels (${((M.I0-I00)*T/1000).toFixed(2)} km)`);
const cx=M.WM_A+M.I0*T+M.WM_HALF;ok(Math.abs(M.WM_O[0]-cx)<1e-3&&Math.abs(M.WM_O[0]-10000)<T*12+1,`the shaders' centre moved with the texels: uWmO.x ${M.WM_O[0].toFixed(1)} (the player at 10000)`);
const after=P.map(([x,z])=>reads(x,z));let same=0;for(let k=0;k<P.length;k++)if(after[k].every((v,q)=>Object.is(v,before[k][q])))same++;
ok(same===P.length,`every map read at ${P.length} places inside both windows the same to the bit after the move (${same})`);
// the uncovered strip (x from the old edge, 12.9 km, to the new): what a coarse fill at boot would have put there, away from the goal's regions
let n=0,bad=0;const f=new Float32Array(9);
for(let j=0;j<N;j+=7)for(let i=0;i<N;i+=5){const I=M.I0+i,J=M.J0+j,x=M.WM_A+(I+0.5)*T;if(x<15000)continue;const bI=I-I%4,bJ=J-J%4,sx=M.WM_A+(bI+2)*T,sz=M.WM_A+(bJ+2)*T,s=M.sample(sx,sz),c=M.waterColor(s),k=j*N+i;
  n++;if(M.wmRaw[k*4]!==Math.fround(c[0])||M.wmRaw[k*4+1]!==Math.fround(c[1])||M.wmRaw[k*4+2]!==Math.fround(c[2])||M.fmRaw[k]!==Math.fround(Math.min(1,Math.max(0,-s.h/M.FM_SCALE))))bad++;}
ok(n>1000&&bad===0,`the uncovered strip: ${n} texels as a coarse fill puts them (${bad} not)`);
// and the far corner of the new window reads the world there, not the old window's wrap
const fc=M.wmFloor(22000,9000),s2=M.sample(22000,9000).h;ok(Math.abs(fc-Math.min(M.FM_SCALE,Math.max(0,-s2)))<80,`a read near the new far edge is the world there: the floor ${fc.toFixed(0)} m against ${(-s2).toFixed(0)} (the coarse map's blur)`);
process.exit(fails?1:0);
