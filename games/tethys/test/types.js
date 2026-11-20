#!/usr/bin/env node
// test/types.js — the type checker over the game (v11.193, analysis_project.md §3). TypeScript's checker run on src/*.js as the scripts they are:
// one shared scope, every top-level name global to every file, as the build's one IIFE has them (tsconfig.json; types/globals.d.ts for what the
// page and the browser give: THREE from @types/three@0.128.0, WB from @wb/core's own source, the window's helpers). Nothing is converted and
// nothing emitted — the game stays JavaScript; the checker is a second reader.
// What it found on its first run (20 Nov 2026) was mostly noise — the DOM's narrow types (an event's target, a style's opacity as a string), data
// hung on three's objects, tables of tuples it cannot type without a hint — and that is the baseline, test/types.json: the errors counted by
// file and by kind. The run fails when a count moves either way. More is a new error: a property misspelt, a wrong number of arguments, a three
// call r128 does not have, a value of the wrong kind. Fewer is one fixed, and `--update` writes the lower count — so the baseline only goes
// down (the ratchet), and an error fixed cannot come back unseen.
//   node test/types.js            the check (and `npm run typecheck`, which CI runs on every pull request)
//   node test/types.js --update   test/types.json from this run (after a fix, or a compiler upgrade whose messages moved — read the diff)
//   node test/types.js --list     every error, not only the new
'use strict';
const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const HERE=path.join(__dirname,'..'),KEPT=path.join(__dirname,'types.json');
const args=process.argv.slice(2),UPDATE=args.includes('--update'),LIST=args.includes('--list');

function tscPath(){let d=HERE;for(let i=0;i<8;i++){const p=path.join(d,'node_modules','typescript','bin','tsc');if(fs.existsSync(p))return p;const up=path.dirname(d);if(up===d)break;d=up;}return null;}
const TSC=tscPath();
if(!TSC){console.log('types: typescript is not installed (npm ci at the repository\'s root) — the type check did not run');process.exit(1);}
const ver=JSON.parse(fs.readFileSync(path.join(path.dirname(path.dirname(TSC)),'package.json'),'utf8')).version;
// node runs the package's own launcher: no shell, no tsc.cmd, the same on Windows (the repository's decisions.md 19)
const r=spawnSync(process.execPath,[TSC,'-p','tsconfig.json','--pretty','false'],{cwd:HERE,encoding:'utf8',maxBuffer:64<<20});
if(r.error){console.log('types: tsc did not start: '+r.error.message);process.exit(1);}
const out=(r.stdout||'')+(r.stderr||'');
// an error is `file(line,col): error TSnnnn: message`; an elaboration continues on indented lines. Its kind is the code and the first line,
// with an object literal's inferred type cut to {…} and any long type to its first 32 characters (they name every key, so they move when a
// literal does)
const errs=[];for(const line of out.split(/\r?\n/)){const m=/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/.exec(line);
  if(m)errs.push({file:m[1].replace(/\\/g,'/'),line:+m[2],col:+m[3],code:m[4],msg:m[5],kind:m[4]+' '+m[5].replace(/'\{[^']*\}'/g,"'{…}'").replace(/'([^']{48,})'/g,(q,t)=>"'"+t.slice(0,32)+"…'")});
  else if(errs.length&&/^\s/.test(line))errs[errs.length-1].msg+='\n'+line;
  else if(line.trim()&&!/^Found \d+ error/.test(line)){console.log('types: tsc said something that is not an error line: '+line);process.exitCode=1;}}
const now={};for(const e of errs){const f=now[e.file]||(now[e.file]={});f[e.kind]=(f[e.kind]||0)+1;}
const sorted=o=>Object.keys(o).sort().reduce((a,k)=>{a[k]=o[k];return a;},{});
const files={};for(const f of Object.keys(now).sort())files[f]=sorted(now[f]);
if(UPDATE){fs.writeFileSync(KEPT,JSON.stringify({note:'the type checker\'s errors by file and kind (test/types.js): --update writes it, the check fails when a count moves either way',tsc:ver,total:errs.length,files},null,1)+'\n');
  console.log('types: test/types.json written: '+errs.length+' errors in '+Object.keys(files).length+' files (tsc '+ver+')');process.exit(0);}
if(!fs.existsSync(KEPT)){console.log('types: no test/types.json — node test/types.js --update writes it');process.exit(1);}
const kept=JSON.parse(fs.readFileSync(KEPT,'utf8'));
let more=0,fewer=0;const report=[];
for(const f of new Set(Object.keys(files).concat(Object.keys(kept.files)))){const a=kept.files[f]||{},b=files[f]||{};
  for(const k of new Set(Object.keys(a).concat(Object.keys(b)))){const d=(b[k]||0)-(a[k]||0);if(!d)continue;
    if(d>0){more+=d;report.push('NEW   '+f+': '+k+(d>1?'  (×'+d+')':''));for(const e of errs)if(e.file===f&&e.kind===k)report.push('        '+f+':'+e.line+':'+e.col+'  '+e.msg.split('\n')[0]);}
    else{fewer-=d;report.push('fixed '+f+': '+k+(d<-1?'  (×'+(-d)+')':''));}}}
if(LIST)for(const e of errs)console.log(e.file+':'+e.line+':'+e.col+'  '+e.code+' '+e.msg.split('\n')[0]);
const byFile=Object.keys(files).map(f=>[f,Object.values(files[f]).reduce((s,n)=>s+n,0)]).sort((x,y)=>y[1]-x[1]);
console.log('types: '+errs.length+' errors in '+byFile.length+' files (the baseline '+kept.total+'; tsc '+ver+(kept.tsc!==ver?', the baseline\'s '+kept.tsc+' — an upgrade can move the messages: read the diff, then --update':'')+')');
if(report.length)console.log(report.join('\n'));
if(more){console.log('types: '+more+' new — fix them (each is a line above), or, when the checker is wrong, say why in a JSDoc type or types/globals.d.ts');process.exit(1);}
if(fewer){console.log('types: '+fewer+' fixed — node test/types.js --update lowers the baseline, and the pull request commits test/types.json');process.exit(1);}
if(!process.exitCode)console.log('types: ok, the baseline held');
