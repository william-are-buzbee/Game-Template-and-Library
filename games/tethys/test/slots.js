// test/slots.js — the slots and their summaries (v11.195, save.js slotSum, slotPut, slotDel, slotGet, storeSums, saveRefresh): save.js alone in a
// context of its own, on the memory backend and on a localStorage (the browser's IndexedDB is test/boot.js's, in Chromium), every read of the store
// counted. Checks: a slot written has its summary, with what the list shows (name, clade, the spec's id, the generations, the time played, ended,
// the dead and the last cause, where the body is); the list made from the summaries reads no slot whole; a record that is no slot is read once a session; a slot from before the summaries is read
// once and given one, and the next list reads none; an import-like write and a death's write keep the summary current; delete takes both; the
// localStorage backend's list parses no slot. In --test (build.js SIDE).
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const SRC=fs.readFileSync(path.join(__dirname,'..','src','save.js'),'utf8');
let fails=0;const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++;};
function page(ls){const g={console,Math,JSON,Date,Map,Set,Array,Object,String,Number,Error,Promise,Float32Array,Int32Array,Uint8Array,setTimeout:f=>f(),
    document:{addEventListener(){}},addEventListener(){},navigator:{},performance:{now:()=>0}};
  g.window=g;if(ls)g.localStorage=ls;vm.createContext(g);vm.runInContext(SRC+'\n;this.__S={store,kvSync,slotSum,slotPut,slotDel,slotGet,storeSums,saveRefresh,storePut,get saveList(){return saveList;},SUM_P};',g,{filename:'save.js'});
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

console.log(fails?fails+' FAILED':'slots: ok');process.exit(fails?1:0);
