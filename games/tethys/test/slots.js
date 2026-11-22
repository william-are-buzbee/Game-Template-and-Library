// test/slots.js — the slots and their summaries (v11.195, save.js slotSum, slotPut, slotDel, slotGet, storeSums, saveRefresh): save.js alone in a
// context of its own, on the memory backend and on a localStorage (the browser's IndexedDB is test/boot.js's, in Chromium), every read of the store
// counted. Checks: a slot written has its summary, with what the list shows (name, clade, the spec's id, the generations, the time played, ended,
// the dead and the last cause, where the body is); the list made from the summaries reads no slot whole; a record that is no slot is read once a session; a slot from before the summaries is read
// once and given one, and the next list reads none; an import-like write and a death's write keep the summary current; delete takes both; the
// localStorage backend's list parses no slot. In --test (build.js SIDE).
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const SRC=fs.readFileSync(path.join(__dirname,'..','src','wcache.js'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'..','src','save.js'),'utf8'); // wcache.js (v11.214): WORLD_P, which the list skips
let fails=0;const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++;};
function page(ls){const g={console,Math,JSON,Date,Map,Set,Array,Object,String,Number,Error,Promise,Float32Array,Int32Array,Uint8Array,Uint32Array,setTimeout:f=>f(),
    document:{addEventListener(){}},addEventListener(){},navigator:{},performance:{now:()=>0}};
  g.window=g;if(ls)g.localStorage=ls;vm.createContext(g);vm.runInContext(SRC+'\n;this.__S={store,kvSync,slotSum,slotPut,slotDel,slotGet,storeSums,saveRefresh,storePut,get saveList(){return saveList;},SUM_P,encNew,encRun,encVal,encEnd,runsOk,runsInto,runsArr,slotJSON};',g,{filename:'save.js'});
  // every whole read counted: the memory backend's get, the localStorage's getItem of a slot
  const S=g.__S;S.storeOpen=null;return {g,S};}
function rec(id,o){return Object.assign({id,kind:'save',v:3,name:'game 1',made:1000,played:2000,playT:600,clade:'fin',spec:{id:'needle'},pos:[1,2,3],yaw:0,pitch:0,deaths:[],line:[{},{}],over:false,pop:{ents:['x'],n:[[1]]}},o||{});}

console.log('the memory backend');
{const {g,S}=page(null);let reads=0;const get0=S.kvSync;
  vm.runInContext('const __kv=kvSync;kvSync=function(op,id,rec){if(op==="get"&&typeof id==="string"&&id.indexOf("sum:")!==0&&id!=="profile")__reads++;return __kv(op,id,rec);};var __reads=0;',g);
  const R=()=>vm.runInContext('__reads',g),Z=()=>vm.runInContext('__reads=0',g);
  S.slotPut(rec('s1',{deaths:[{cause:'bled out'}],name:'game 1'}));S.slotPut(rec('s2',{name:'game 2',played:5000,line:[{}],spec:{id:'finback'}}));
  const s1=vm.runInContext('store.mem.get("sum:s1")',g);
  ok(s1&&s1.kind==='sum'&&s1.slot==='s1'&&s1.name==='game 1'&&s1.clade==='fin'&&s1.specId==='needle'&&s1.gens===2&&s1.playT===600&&s1.over===false&&s1.dead===1&&s1.cause==='bled out'&&s1.pos.join()==='1,2,3','a slot written has its summary: '+JSON.stringify(s1));
  Z();let n=0;S.saveRefresh(()=>{n++;});const L=S.saveList;
  ok(n===1&&L.length===2&&L[0].id==='s2'&&L[1].id==='s1','the list from the summaries, newest played first: '+L.map(r=>r.id+' '+r.name).join(', '));
  ok(R()===0,'and no slot read whole for it ('+R()+' reads)');
  ok(!('pop' in L[0])&&L[1].dead===1&&L[1].cause==='bled out'&&L[0].gens===1&&L[0].specId==='finback','an entry is the summary, not the slot (no ledger)');
  // a slot from before the summaries: written without one
  S.storePut(rec('s0',{name:'old',played:100}));Z();S.saveRefresh();
  ok(S.saveList.length===3&&S.saveList.some(r=>r.id==='s0'&&r.name==='old')&&R()===1,'a slot from before: read whole once ('+R()+') and listed');
  ok(!!vm.runInContext('store.mem.get("sum:s0")',g),'and its summary written');
  Z();S.saveRefresh();ok(R()===0,'the next list reads none ('+R()+')');
  // the slot written again (a death, an autosave): its summary follows
  S.slotPut(rec('s1',{over:true,deaths:[{cause:'bled out'},{cause:'eaten'}],playT:900}));S.saveRefresh();const e1=S.saveList.find(r=>r.id==='s1');
  ok(e1.over===true&&e1.dead===2&&e1.cause==='eaten'&&e1.playT===900,'written again, its summary current: '+JSON.stringify({over:e1.over,dead:e1.dead,cause:e1.cause,playT:e1.playT}));
  let got=null;S.slotGet('s1',r=>{got=r;});ok(got&&got.pop&&got.over===true,'a slot read whole when asked (slotGet)');
  let none='x';S.slotGet('sum:s1',r=>{none=r;});ok(none===null,'a summary is not a slot to slotGet');
  S.slotDel('s1');S.saveRefresh();ok(!S.saveList.some(r=>r.id==='s1')&&!vm.runInContext('store.mem.has("s1")||store.mem.has("sum:s1")',g),'delete takes the slot and its summary');
  // a record of another kind stored beside them is never taken for a slot
  S.storePut({id:'profile',kind:'profile'});Z();S.saveRefresh();ok(R()===0&&S.saveList.length===2,'the profile is no slot ('+S.saveList.length+' slots)');
  S.storePut({id:'x1',kind:'other'});Z();S.saveRefresh();const r1=R();Z();S.saveRefresh();
  ok(r1===1&&R()===0&&S.saveList.length===2,'a record that is no slot: read once, then not again this session ('+r1+', '+R()+')');}

console.log('the localStorage backend');
{const M=new Map(),parsed=[];const ls={get length(){return M.size;},key:i=>Array.from(M.keys())[i],getItem:k=>{if(k.indexOf('tethys.kv.s')===0&&k.indexOf('tethys.kv.sum:')!==0)parsed.push(k);return M.has(k)?M.get(k):null;},setItem:(k,v)=>M.set(k,String(v)),removeItem:k=>M.delete(k)};
  const {g,S}=page(ls);S.slotPut(rec('a1',{name:'one'}));S.slotPut(rec('a2',{name:'two',played:9000}));parsed.length=0;S.saveRefresh();
  ok(S.saveList.length===2&&S.saveList[0].name==='two'&&parsed.length===0,'the list from the summaries, no slot parsed ('+parsed.length+')');
  let got=null;S.slotGet('a1',r=>{got=r;});ok(got&&got.name==='one'&&got.pop,'a slot read whole when asked');}

console.log('the ledger\'s streams (v11.196: encRun, encVal, encEnd, runsOk, runsInto, slotJSON)');
{const {g,S}=page(null);const n=5000,A=[new Float32Array(n),new Float32Array(n),new Float32Array(n)];let x=9;
  for(const a of A)for(let i=0;i<n;i++){x=(x*16807)%2147483647;a[i]=x%7===0?(x%1000)/333:i>4000?0.25:0;}A[1][17]=0.0004;A[1][18]=-0.0004;A[2][3]=NaN; // runs, lone values, values the rounding takes to 0, a NaN
  const E=S.encNew();for(const a of A)S.encRun(E,a,0,a.length);const R=S.encEnd(E),B=A.map(()=>new Float32Array(n));
  ok(S.runsOk(R,3*n)&&!S.runsOk(R,3*n-1)&&R.v instanceof Float32Array&&R.c instanceof Uint32Array,'a stream of runs fills exactly its tables ('+R.v.length+' runs for '+3*n+' values)');
  S.runsInto(R,B,n);let off=0;A.forEach((a,t)=>{for(let i=0;i<n;i++){const w=Math.round(a[i]*1000)/1000,v=B[t][i];if(!(Number.isNaN(w)?Number.isNaN(v):Math.abs(v-w)<1e-6))off++;}});
  ok(off===0,'decoded: every value at the save\'s rounding, across the tables\' ends ('+off+' off)');
  const J=JSON.parse(S.slotJSON({pop:{n:R}})).pop.n,C=A.map(()=>new Float32Array(n));S.runsInto(J,C,n);let off2=0;B.forEach((b,t)=>{for(let i=0;i<n;i++)if(!(Number.isNaN(b[i])?C[t][i]===0:Math.abs(C[t][i]-b[i])<1e-6))off2++;});
  ok(Array.isArray(J.v)&&Array.isArray(J.c)&&S.runsOk(J,3*n)&&off2===0,'as text (the shadow, the localStorage store, a file): plain arrays, the same values ('+off2+' off; a NaN reads as 0, which the load would make it)');
  const F=S.encNew();S.encRun(F,A[0],0,10);S.encVal(F,7);S.encRun(F,A[0],11,n);const R2=S.encEnd(F),D=[new Float32Array(n)];S.runsInto(R2,D,n);
  ok(S.runsOk(R2,n)&&D[0][10]===7&&Math.abs(D[0][11]-Math.round(A[0][11]*1000)/1000)<1e-6&&Math.abs(D[0][9]-Math.round(A[0][9]*1000)/1000)<1e-6,'a value put in (a loaded cell\'s count, encVal) in its place, the table round it as it was');
  ok(S.runsArr({v:[1],c:[3]},2,2)===null&&S.runsArr({v:[1,2],c:[2,2]},2,2)[1][0]===2,'a stream the wrong length is refused whole (runsArr)');}
console.log('a binary slot through the localStorage store (its text)');
{const M=new Map();const ls={get length(){return M.size;},key:i=>Array.from(M.keys())[i],getItem:k=>M.has(k)?M.get(k):null,setItem:(k,v)=>M.set(k,String(v)),removeItem:k=>M.delete(k)};
  const {g,S}=page(ls),E=S.encNew(),a=new Float32Array(100).fill(1.5);a[50]=2;S.encRun(E,a,0,100);const st=S.encEnd(E);
  S.slotPut(rec('b1',{v:4,pop:{bin:1,ents:['x'],cells:100,n:st}}));let got=null;S.slotGet('b1',r=>{got=r;});const T=[new Float32Array(100)];
  ok(!!got&&S.runsOk(got.pop.n,100)&&(S.runsInto(got.pop.n,T,100),T[0][50]===2&&T[0][49]===1.5),'stored as text and read back: the stream whole');}
console.log(fails?fails+' FAILED':'slots: ok');process.exit(fails?1:0);
