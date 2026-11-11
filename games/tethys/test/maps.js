// test/maps.js — the water and floor maps as a window (v11.104, GLOBE §10, the windows; scene.js WM_HALF, WM_O; far.js WM_A, WM_I0, wmRecentre,
// wmShiftGen): the whole game against the stub, as test/falls.js boots it, twice. As built (v11.106: the window the old square's size, the world
// ±WHALF): it boots at the anchor, centred at 0, its reads v11.103's; a swim 36 km out moves it, reads in both windows unchanged. With the window patched to half the square (MAPS=half, run as a child
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
  +'wmSample,wmFloor,wmWave,wmBloom,wmAt,WM_R,sample,waterColor,waveEnergy,plankTexel,FM_SCALE,HALF,WX0,WX1,WZ0,WZ1,player,cellsAround,tp:(x,z)=>{player.pos.set(x,dispY,z);cellsAround();}};';
const tmp=path.join(os.tmpdir(),'tethys_maps'+(HALFW?'_half':'')+'.js');fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
process.env.PICK='1';require('./stub.js');require(tmp);
const M=__M;let fails=0;const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++;};
const reads=(x,z)=>{const a=[0,0,0,0],b=[0,0,0,0];M.wmSample(x,z,a);M.wmBloom(x,z,b);return a.concat(b,[M.wmFloor(x,z),M.wmWave(x,z)]);};
__step(60);
if(!HALFW){
  console.log('maps: the window as built (the v11.65 square\'s size; the world ±WHALF since v11.106)');
  ok(M.I0===0&&M.J0===0&&M.WM_O[0]===0&&M.WM_O[1]===0&&M.WM_N===1440,`at boot the window is the old square: its corner at the anchor (${M.I0}, ${M.J0}), its centre (${M.WM_O[0]}, ${M.WM_O[1]}), ${M.WM_N}² texels`);
  {let bad=0;for(let k=0;k<4000;k++){const x=-M.HALF+2*M.HALF*((k*0.6180339887)%1),z=-M.HALF+2*M.HALF*((k*0.4142135624)%1),u=(x+M.HALF)/M.WM_T-0.5,v=(z+M.HALF)/M.WM_T-0.5,i0=Math.min(Math.max(Math.floor(u),0),M.WM_N-1),j0=Math.min(Math.max(Math.floor(v),0),M.WM_N-1);
    M.wmAt(x,z);if(M.WM_R[0]!==i0||M.WM_R[1]!==j0||!Object.is(M.WM_R[2],Math.min(Math.max(u-i0,0),1))||!Object.is(M.WM_R[3],Math.min(Math.max(v-j0,0),1)))bad++;}
    ok(bad===0,`a read's texel and weights at boot are v11.103's to the bit at 4000 places (wmAt against (x + HALF)/WM_T − 0.5: ${bad} differ)`);}
  ok(M.WM_MOVE&&M.WX1-M.WX0>2*M.WM_HALF,'and it moves: the world is wider than it ('+(M.WX1-M.WX0)+' m across, the window '+2*M.WM_HALF+')');
  // a swim 36 km out (a teleport): the window follows by whole regions; reads in both windows, far from the regions built at either end, unchanged
  const Q=[];for(let x=8000;x<=22000;x+=2000)for(let z=-22000;z<=2000;z+=3000)Q.push([x,z]);const b0=Q.map(([x,z])=>reads(x,z));
  M.tp(30000,-20000);__step(200);
  const cx=M.WM_A+M.I0*M.WM_T+M.WM_HALF,cz=M.WM_A+M.J0*M.WM_T+M.WM_HALF;
  ok(M.shifts>=1&&M.I0%24===0&&M.J0%24===0&&Math.abs(cx-30000)<M.WM_HALF/2&&Math.abs(cz+20000)<M.WM_HALF/2&&Math.abs(M.WM_O[0]-cx)<1e-3&&Math.abs(M.WM_O[1]-cz)<1e-3,`swum 36 km out: the window followed (${M.shifts} moves, by whole regions), its centre (${cx.toFixed(0)}, ${cz.toFixed(0)}) near the player's (30000, −20000)`);
  const b1=Q.map(([x,z])=>reads(x,z));let same=0;for(let k=0;k<Q.length;k++)if(b1[k].every((v,q)=>Object.is(v,b0[k][q])))same++;
  ok(same===Q.length,`every map read at ${Q.length} places in both windows the same to the bit after it (${same})`);if(same<Q.length&&process.env.MAPS_DBG)for(let k=0;k<Q.length;k++)if(!b1[k].every((v,q)=>Object.is(v,b0[k][q])))console.log('   ',Q[k].join(','),b0[k].map(v=>+v.toFixed(4)).join(' '),'|',b1[k].map(v=>+v.toFixed(4)).join(' '));
  const fc=M.wmFloor(40000,-30000),s2=M.sample(40000,-30000).h;ok(Math.abs(fc-Math.min(M.FM_SCALE,Math.max(0,-s2)))<80,`a read out where the old square never reached is the world there: the floor ${fc.toFixed(0)} m against ${(-s2).toFixed(0)}`);
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
