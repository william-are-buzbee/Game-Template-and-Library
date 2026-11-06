#!/usr/bin/env node
// tools/vendor.js — keeps vendor/wb-core.global.js, the repository's @wb/core (packages/core) built as a classic script
// that defines one name, WB, in step. src/order.txt lists it first, so build.js, build.py, dev.html and every test take
// it like any src file: WB.Rng and WB.hashString are in the shared scope. The copy is committed, so build.py needs no
// node and a fresh clone builds as before.
//   node tools/vendor.js           build @wb/core and write vendor/wb-core.global.js
//   node tools/vendor.js --check   build @wb/core and fail if vendor/wb-core.global.js differs (npm test and the build run this)
'use strict';
const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const GAME=path.resolve(__dirname,'..'),REPO=path.resolve(GAME,'..','..');
const BUILT=path.join(REPO,'packages','core','dist','core.global.js'),VENDORED=path.join(GAME,'vendor','wb-core.global.js');
const r=spawnSync('npm',['run','build','-w','packages/core'],{cwd:REPO,stdio:['ignore','ignore','inherit']});
if(r.status!==0||!fs.existsSync(BUILT)){console.error('vendor: building @wb/core failed');process.exit(1);}
const want=fs.readFileSync(BUILT,'utf8');
if(process.argv.includes('--check')){
  const have=fs.existsSync(VENDORED)?fs.readFileSync(VENDORED,'utf8'):'';
  if(have!==want){console.error('vendor/wb-core.global.js is not the current @wb/core: run `npm run vendor -w games/tethys` and commit it');process.exit(1);}
  console.log('vendor/wb-core.global.js is the current @wb/core');
}else{fs.mkdirSync(path.dirname(VENDORED),{recursive:true});fs.writeFileSync(VENDORED,want);console.log('vendor/wb-core.global.js written from @wb/core');}
