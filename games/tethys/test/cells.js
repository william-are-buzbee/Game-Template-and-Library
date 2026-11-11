// test/cells.js — the cell hash (v11.111, GLOBE §10.1; chunks.js ckey, chunkIJ, chunkAt; far.js bigCache, impCache, regions, RX0…RZ1): no table
// of the world's size is left; a cell's key is a number, one for each (i, j) negatives and all; the whole game against the stub, at ours, at
// the world's west edge and at its north-east corner: every loaded cell found by chunkAt at its middle and by chunkIJ, nothing found where no
// cell is loaded or off the world; every built region's cells from 4ri, 4rj, the regions on the world's edge carrying the apron and no other;
// the tables holding what is loaded or cached and nothing else. In --test.
'use strict';
const fs=require('fs'),path=require('path'),os=require('os');
const ROOT=path.join(__dirname,'..');
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
let js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n');
js+='\nglobal.__C={dense:typeof chunkGrid!=="undefined"||typeof gridIdx!=="undefined",chunks,ckey,chunkIJ,chunkAt,bigCache,impCache,regions,farList,get farBuilt(){return farBuilt;},RX0,RX1,RZ0,RZ1,FR,CELL,HALF,WX0,WX1,WZ0,WZ1,WORLD,player,cellOf,tp:(x,z)=>{player.pos.set(x,dispY,z);cellsAround();}};';
const tmp=path.join(os.tmpdir(),'tethys_cells.js');fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
process.env.PICK='1';require('./stub.js');require(tmp);const C=__C;
let fails=0;const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++;};
console.log('cells: the cell hash');
ok(!C.dense&&C.bigCache instanceof Map&&C.impCache instanceof Map&&C.regions instanceof Map&&C.chunks instanceof Map,'no table of the world\'s size: the loaded cells, the structures\' and cards\' caches and the regions are Maps');
{const seen=new Set();let dup=0,num=true;for(let i=-700;i<=700;i+=7)for(let j=-700;j<=700;j+=11){const k=C.ckey(i,j);if(typeof k!=='number'||!Number.isSafeInteger(k))num=false;if(seen.has(k))dup++;seen.add(k);}
  ok(num&&dup===0,`a cell's key a safe integer, one for each (i, j) over ±700 cells (${seen.size} keys, ${dup} shared)`);}
const at=(name,x,z)=>{C.tp(x,z);__step(300);const L=[...C.chunks.values()];let found=0,wrong=0;for(const ch of L){if(C.chunkAt(ch.cx,ch.cz)===ch&&C.chunkIJ(ch.i,ch.j)===ch)found++;else wrong++;}
  let ghost=0;for(let k=0;k<400;k++){const gx=x+(k%20-10)*700,gz=z+(Math.floor(k/20)-10)*700,ch=C.chunkAt(gx,gz);if(ch&&(C.cellOf(gx)!==ch.i||C.cellOf(gz)!==ch.j))ghost++;if(!ch){const i=C.cellOf(gx),j=C.cellOf(gz);if(L.some(c=>c.i===i&&c.j===j))ghost++;}}
  const off=C.chunkAt(C.WX1+500,0)===undefined&&C.chunkAt(0,C.WZ0-500)===undefined;
  let start=0,apron=0,edgeOK=0;for(const r of C.farList){if(r.ci0===r.ri*C.FR&&r.cj0===r.rj*C.FR&&C.regions.get(C.ckey(r.ri,r.rj))===r)start++;const edge=r.ri===C.RX0||r.ri===C.RX1||r.rj===C.RZ0||r.rj===C.RZ1;if(edge)apron++;if(edge===(r.ext>0))edgeOK++;}
  ok(L.length>0&&wrong===0&&ghost===0&&off,`${name}: ${found} loaded cells, each found at its middle and by (i, j); 400 places round it found right (${ghost} wrong); off the world nothing`);
  ok(C.farList.length>0&&start===C.farList.length&&edgeOK===C.farList.length&&C.regions.size===C.farList.length&&C.farBuilt===C.farList.length,`${name}: ${C.farList.length} regions, each the cells from 4ri, 4rj and in the table by its key; ${apron} on the world's edge, the apron on those and no other`);
  return apron;};
const a0=at('at ours',0,0),a1=at('at the west edge',C.WX0+300,0),a2=at('at the north-east corner',C.WX1-300,C.WZ0+300);
ok(a0===0&&a1>0&&a2>0,`the edge's regions only at the edge: ${a0} at ours, ${a1} at the west edge, ${a2} at the corner`);
ok(C.bigCache.size<5000&&C.impCache.size<5000,`the caches hold the cells the regions and cells asked for: ${C.bigCache.size} and ${C.impCache.size} (the world has ${(C.WORLD.i1-C.WORLD.i0)*(C.WORLD.j1-C.WORLD.j0)})`);
console.log(fails?`cells: ${fails} FAILED`:'cells: ok');process.exit(fails?1:0);
