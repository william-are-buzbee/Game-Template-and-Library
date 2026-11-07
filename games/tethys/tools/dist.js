#!/usr/bin/env node
// tools/dist.js — the published game for the repository's site, from what build.js wrote: as the old pages workflow
// published it (tethys.html as index.html and as itself, map.html, and the two src files map.html loads), plus the
// vendored @wb/core that map.html loads before them.
'use strict';
const fs=require('fs'),path=require('path');
const GAME=path.resolve(__dirname,'..'),OUT=path.join(GAME,'dist');
fs.rmSync(OUT,{recursive:true,force:true});
for(const d of ['src','vendor'])fs.mkdirSync(path.join(OUT,d),{recursive:true});
const cp=(from,to)=>fs.copyFileSync(path.join(GAME,from),path.join(OUT,to||from));
cp('tethys.html','index.html');cp('tethys.html');cp('map.html');cp('src/util.js');cp('src/world.js');cp('vendor/wb-core.global.js');
console.log('dist/: index.html, tethys.html, map.html, src/util.js, src/world.js, vendor/wb-core.global.js');
