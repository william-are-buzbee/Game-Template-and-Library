// test/rec.js — the flight recorder (v11.191, src/rec.js): rec.js alone in a context of its own per run, against a fake page — a renderer whose
// WebGL answers the GPU timer's queries two frames late with times the test chose, a player the test moves, the boot's stages — so every number in
// the report can be checked against what was fed in. Checks: the machine read once (the ANGLE names shortened); the boot's stages in order; menu
// frames apart from play; the percentiles against a sort of the same intervals (within a bin); the places by cell with their seconds, their p95 and
// their GPU time by pass to the hundredth; a slow frame kept with what it was doing (a compile, a cell's generation) and its GPU time filled in late;
// a disjoint dropping the queries in flight and nothing else; a hidden tab's gap not a frame; the warnings and errors counted once each; the timeline's
// rows and their halving; no NaN anywhere; the session through deflate and back to the bit (test/report.js's decoder); a two-hour session over 900
// places fitting the link (REC_K.url) and still decoding; the store keeping a long session and not a short one over it, and F9 sending the last
// when this one is short. In --test (build.js SIDE). It reads no wall clock: the page's performance.now is the test's.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),zlib=require('zlib');
const ROOT=path.join(__dirname,'..'),SRC=fs.readFileSync(path.join(ROOT,'src','rec.js'),'utf8');
const {decode,show}=require('./report.js');
let fails=0;const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++;};

function page(opt){opt=opt||{};let now=1000,frame=0,disjoint=false;const handlers={},store=opt.store||new Map(),warned=[];
  const E={TIME_ELAPSED_EXT:0x88BF,GPU_DISJOINT_EXT:0x8FBB};
  const gl={QUERY_RESULT_AVAILABLE:0x8867,QUERY_RESULT:0x8866,RENDERER:0x1F01,VENDOR:0x1F00,MAX_TEXTURE_SIZE:0x0D33,ns:0,open:null,made:0,
    getExtension:n=>n==='EXT_disjoint_timer_query_webgl2'?(opt.timer===false?null:E):n==='WEBGL_debug_renderer_info'?{UNMASKED_RENDERER_WEBGL:1,UNMASKED_VENDOR_WEBGL:2}:null,
    getSupportedExtensions:()=>opt.timer===false?['KHR_parallel_shader_compile']:['EXT_disjoint_timer_query_webgl2','KHR_parallel_shader_compile'],
    getParameter:k=>k===1?'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 (0x00002882) Direct3D11 vs_5_0 ps_5_0, D3D11)':k===2?'Google Inc. (NVIDIA)':k===0x0D33?16384:k===E.GPU_DISJOINT_EXT?(disjoint?(disjoint=false,true):false):'x',
    createQuery(){this.made++;return {end:-1,ns:0};},beginQuery(t,q){if(this.open)throw new Error('two queries open');q.ns=this.ns;q.end=-1;this.open=q;},
    endQuery(){const q=this.open;if(!q)throw new Error('no query open');q.end=frame;this.open=null;},
    getQueryParameter(q,k){if(k===this.QUERY_RESULT_AVAILABLE)return q.end>=0&&frame>=q.end+2;return q.ns;}};
  const g={console:{log(){},warn(...a){warned.push(a.join(' '));},error(...a){warned.push(a.join(' '));}},Math,JSON,Date,Map,Set,Array,Object,String,Number,Error,Promise,
    Uint8Array,Uint32Array,Int8Array,Int32Array,Float64Array,Blob,crypto:opt.crypto===false?undefined:globalThis.crypto,Response,CompressionStream,TextEncoder,btoa,unescape,encodeURIComponent,setTimeout:f=>f(),
    performance:{now:()=>now},navigator:{hardwareConcurrency:16,deviceMemory:8,userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0'},
    screen:{width:2560,height:1440},innerWidth:1600,innerHeight:900,devicePixelRatio:1.5,location:{pathname:'/Game-Template-and-Library/preview/135/games/tethys/tethys.html',hash:'#low'},
    localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))},
    document:{hidden:false,addEventListener(n,f){(handlers['doc:'+n]=handlers['doc:'+n]||[]).push(f);}},
    addEventListener(n,f){(handlers[n]=handlers[n]||[]).push(f);},
    THREE:{Vector2:class{constructor(){this.x=0;this.y=0;}}},LOD:{on:true,k:0.5,dSea:150,dAir:120},GL2:true,Q:{tier:'high',why:'default',pr:1.5,aa:true},TIER_SAVED:null,isTouch:false,FX:{snow:true,shadows:true,biolum:false},CELL:215,
    BOOT:{stage:'store',done:false},mode:'menu',player:{pos:{x:0,y:-12,z:0},yaw:0},visibleCreatures:0,visibleChunks:0,resK:1,wasAbove:false,hintEl:{style:{}},
    renderer:{info:{render:{calls:0,triangles:0},programs:[]},getContext:()=>gl,getDrawingBufferSize:v=>{v.x=2400;v.y=1350;return v;},domElement:{addEventListener(){}}}};
  g.window=g;g.open=opt.open||(()=>({location:{href:''},opener:{}}));vm.createContext(g);vm.runInContext(SRC,g,{filename:'rec.js'});
  // one frame: the passes timed (ms each), then the loop's end (main.js recFrame)
  function step(iv,o){o=o||{};const R=g.__rec;frame++;now+=iv;g.mode=o.mode||'play';if(o.pos){g.player.pos.x=o.pos[0];g.player.pos.y=o.pos[1];g.player.pos.z=o.pos[2];}
    g.renderer.info.render.calls=o.draws||100;g.renderer.info.render.triangles=o.tris||1e6;if(o.compile)for(let i=0;i<o.compile;i++)g.renderer.info.programs.push({});
    const ps=o.gpu||[3,0,0,0,0];for(let k=0;k<5;k++)if(ps[k]>0){gl.ns=ps[k]*1e6;g.recGpu(k);}g.recGpuEnd();
    const w=o.work||4;g.recFrame(iv,w,o.gen||0.2,0.1,1.5,0.3,0.4,0.1,0.8);return R;}
  return {g,gl,step,handlers,store,warned,setDisjoint:()=>{disjoint=true;},R:()=>g.__rec};}
function nanFree(o,where){let bad=[];(function walk(v,p){if(typeof v==='number'){if(!isFinite(v))bad.push(p);}else if(v&&typeof v==='object')for(const k of Object.keys(v))walk(v[k],p+'.'+k);})(o,where);return bad;}
async function unpack(tok){const m=/tethys-rec:1:([zj])([A-Za-z0-9_-]+)/.exec(tok);const b=Buffer.from(m[2],'base64url');return JSON.parse((m[1]==='z'?zlib.inflateRawSync(b):b).toString('utf8'));}

(async()=>{
  console.log('the machine, the boot, the menu');
  {const P=page();const N=P.R().name;
    ok(N('ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 (0x00002882) Direct3D11 vs_5_0 ps_5_0, D3D11)')==='NVIDIA GeForce RTX 4060','the ANGLE name of a Windows card: '+N('ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 (0x00002882) Direct3D11 vs_5_0 ps_5_0, D3D11)'));
    ok(N('ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)')==='Apple M1 Pro','a Mac\'s: '+N('ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)'));
    ok(N('Mali-G78')==='Mali-G78','a plain name kept');
    for(let i=0;i<20;i++)P.step(16.7,{mode:'menu'});P.g.BOOT.stage='load';for(let i=0;i<20;i++)P.step(16.7,{mode:'menu'});P.g.BOOT.stage='settle';P.step(16.7,{mode:'menu'});P.g.BOOT.done=true;P.g.BOOT.stage='done';P.step(16.7,{mode:'menu'});
    const f=P.R().full(),b=f.boot,d=f.dev;
    ok(d.gpu.indexOf('RTX 4060')>0&&d.timer&&d.par&&d.cores===16&&d.mem===8&&d.gl===2&&d.maxTex===16384,'the machine: '+[d.gpu,d.cores+' threads',d.mem+' GB','timer '+d.timer,'parallel '+d.par].join(', '));
    ok(d.buf[0]===2400&&d.buf[1]===1350&&d.screen[0]===2560&&d.dpr===1.5&&d.fx&&d.fx.snow===true,'the screen, the drawing buffer and the effects at the report');
    ok(d.flags==='#low','the URL\'s flags (v11.194): '+d.flags);
    ok(b.first>0&&b.first<=b.store&&b.store<=b.load&&b.load<=b.done,'the boot\'s stages in order: first '+b.first+', store '+b.store+', load '+b.load+', done '+b.done);
    ok(f.menu.frames===41&&f.all.frames===0,'menu frames apart from play (the page\'s first frame never one): '+f.menu.frames+' and '+f.all.frames);}

  console.log('play: the places, the percentiles, the GPU by pass, the slow frames');
  const P=page(),A=[330,-12,0],B=[110,0.6,-380],ivs=[];
  for(let i=0;i<5;i++)P.step(16.7,{mode:'menu'});P.g.BOOT.done=true;
  for(let i=0;i<1800;i++){const iv=6.9;ivs.push(iv);P.step(iv,{pos:A,gpu:[3,0,0.5,0],draws:120,tris:2e6});} // the forest: 12.4 s at 145 fps, 3.5 ms on the GPU
  P.g.wasAbove=true;
  for(let i=0;i<1200;i++){const iv=i%10<8?16.7:33.3;ivs.push(iv);P.step(iv,{pos:B,gpu:[9,1.5,1,0,0.5],draws:300,tris:4.8e6,work:5});} // the shore: 30 s, every fifth frame dropped, 12 ms on the GPU
  ivs.push(120);P.step(120,{pos:B,gpu:[9,1.5,1,0.5,0.5],work:60,gen:11,compile:2}); // a slow frame: two programs and a cell
  P.g.document.hidden=true;P.step(5000,{pos:B,gpu:[9,1.5,1,0,0.5]});P.g.document.hidden=false;P.step(4000,{pos:B,gpu:[9,1.5,1,0,0.5]}); // a hidden tab and the gap after it
  for(let i=0;i<4;i++)P.step(16.7,{pos:B,gpu:[9,1.5,1,0,0.5]});ivs.push(16.7,16.7,16.7,16.7);
  {const R=P.R(),f=R.full(),a=f.all,pc=f.pc,c=k=>r=>r[pc.indexOf(k)];
    ok(a.frames===ivs.length,'play frames '+a.frames+' (fed '+ivs.length+'; the hidden tab and its gap not frames)');
    const s=ivs.slice().sort((x,y)=>x-y),pct=p=>s[Math.max(0,Math.ceil(p*s.length)-1)];
    for(const [i,p] of [[0,0.5],[2,0.95],[3,0.99]])ok(Math.abs(a.iv[i]-pct(p))<=0.5,'interval p'+Math.round(p*100)+' '+a.iv[i]+' against the sort\'s '+pct(p));
    ok(a.iv[4]===120,'the max '+a.iv[4]);
    const pA=f.places.find(r=>c('x')(r)===330),pB=f.places.find(r=>c('x')(r)===110);
    ok(f.places.length===2&&pA&&pB,'two places by cell: '+f.places.map(r=>'tp('+c('x')(r)+','+c('z')(r)+') '+c('s')(r)+' s').join(', '));
    ok(Math.abs(c('s')(pA)-12.4)<0.1&&Math.abs(c('s')(pB)-(960*16.7+240*33.3+120+4*16.7)/1000)<0.1,'their seconds: '+c('s')(pA)+' and '+c('s')(pB));
    ok(c('p95')(pA)===6.75&&c('p95')(pB)===33.25,'their p95 (bin centres): '+c('p95')(pA)+' and '+c('p95')(pB));
    ok(Math.abs(c('gpu')(pA)-3.5)<0.01&&Math.abs(c('gMain')(pA)-3)<0.01&&Math.abs(c('gClouds')(pA)-0.5)<0.01,'the forest\'s GPU: '+c('gpu')(pA)+' ms, main '+c('gMain')(pA)+', clouds '+c('gClouds')(pA));
    ok(Math.abs(c('gpu')(pB)-12)<0.01&&Math.abs(c('gHorizon')(pB)-1.5)<0.01&&Math.abs(c('gSky')(pB)-0.5)<0.01&&c('gSky')(pA)===0,'the shore\'s: '+c('gpu')(pB)+' ms, horizon '+c('gHorizon')(pB)+', sky '+c('gSky')(pB)+' (the last frames\' results still in flight)');
    ok(c('drawsMax')(pB)===300&&c('trisMax')(pB)===4800&&c('above')(pB)===1&&c('above')(pA)===0,'draws, triangles and the medium by place');
    ok(c('wiv')(pB)===120&&c('wx')(pB)===110&&c('wy')(pB)===0.6,'the worst frame\'s place, to stand a bench there: AT='+[c('wx')(pB),c('wy')(pB),c('wz')(pB),c('wyaw')(pB)].join(','));
    const sp=f.spikes[0],sc=f.sc,S=k=>sp[sc.indexOf(k)];
    ok(f.spikes.length===1&&S('iv')===120&&/compile×2/.test(S('what'))&&/gen/.test(S('what')),'the slow frame kept with what it did: '+S('what'));
    ok(S('gpu')===12.5,'its GPU time filled in when the query came back: '+S('gpu'));
    ok(a.gpu&&Math.abs(a.gpu.pass.horizon-1.5*(a.gpu.frames-1800)/a.gpu.frames)<0.01&&Math.abs(a.gpu.pass.sky-0.5*(a.gpu.frames-1800)/a.gpu.frames)<0.01&&a.gpu.frames>=3000,'the GPU over the session: '+a.gpu.mean+' ms, '+a.gpu.frames+' frames timed, main '+a.gpu.pass.main+', horizon '+a.gpu.pass.horizon+', sky '+a.gpu.pass.sky);
    ok(R.gpu.ema>3&&R.gpu.n<=10,'the readout\'s EMA '+R.gpu.ema.toFixed(2)+' ms; '+R.gpu.n+' queries in flight; '+P.gl.made+' made in all');
    ok(Math.abs(a.vsync-6.75)<0.01,'the interval most frames take: '+a.vsync+' ms');
    ok(f.tl.rows.length>=16&&f.tl.rows.length<=19&&f.tl.every===2,'the timeline: '+f.tl.rows.length+' rows of '+f.tl.every+' s');
    const bad=nanFree(f,'session');ok(!bad.length,'no NaN or Infinity'+(bad.length?': '+bad.slice(0,5).join(' '):''));}

  console.log('a disjoint, the warnings, the errors');
  {const g=P.g,R=P.R(),n0=R.state.gN;for(let i=0;i<3;i++)P.step(16.7,{pos:B,gpu:[9,2,1,0]});P.setDisjoint();for(let i=0;i<10;i++)P.step(16.7,{pos:B,gpu:[9,2,1,0]});
    ok(R.state.gN>n0&&R.state.gN<n0+13,'a disjoint drops the queries in flight: '+(R.state.gN-n0)+' of 13 frames timed');
    const f=R.full(),pB=f.places.find(r=>r[0]===110);ok(Math.abs(pB[f.pc.indexOf('gpu')]-12)<0.01,'and the shore\'s GPU is still 12 ms: '+pB[f.pc.indexOf('gpu')]);
    // v11.198: a result no GPU could give (the work tower's 960,769 ms, #148–149, with no disjoint): its frame dropped, counted, nothing else moved
    {const n1=R.state.gN,m0=R.state.gMax,e0=R.gpu.ema;P.step(16.7,{pos:B,gpu:[960769,2,1,0]});for(let i=0;i<6;i++)P.step(16.7,{pos:B,gpu:[9,2,1,0]});
      const f2=R.full(),pB2=f2.places.find(r=>r[0]===110);
      ok(R.gpu.junk===1&&f2.all.gpu.junk===1&&R.state.gMax===m0&&R.state.gN===n1+6&&Math.abs(pB2[f2.pc.indexOf('gpu')]-12)<0.01&&Math.abs(R.gpu.ema-e0)<1,
        'a junk reading (960,769 ms) drops its frame: '+(R.state.gN-n1)+' of 7 timed, '+R.gpu.junk+' junk counted, the max '+R.state.gMax+', the shore still '+pB2[f2.pc.indexOf('gpu')]+' ms');}
    g.console.warn('the horizon tier could not build: x');g.console.warn('the horizon tier could not build: x');g.console.error('THREE.WebGLProgram: shader error',{a:1});
    for(const h of P.handlers.error)h({message:'boom',lineno:12,colno:3});for(const h of P.handlers.unhandledrejection)h({reason:new Error('no store')});
    const e=R.full().errs;ok(e.length===4&&e[0][0]==='warn'&&e[0][1]===2&&e[0][3]===110,'four kinds, the warning twice and where: '+e.map(x=>x[0]+'×'+x[1]).join(' '));
    ok(P.warned.length===3,'and still printed: the console\'s own warn and error called through');}

  console.log('the session through deflate and back; the link');
  {const R=P.R(),f=R.full(),tok=await R.pack(f);ok(/^tethys-rec:1:z[A-Za-z0-9_-]+$/.test(tok),'deflated and base64url: '+tok.length+' characters for '+JSON.stringify(f).length+' of JSON');
    ok(JSON.stringify(await unpack(tok))===JSON.stringify(f),'back to the bit');
    const o=await R.body();ok(o.len<=R.K.url&&o.level===0&&/^https:\/\/github\.com\/william-are-buzbee\/Game-Template-and-Library\/issues\/new\?title=/.test(o.url),'a short session\'s link whole: '+o.len+' characters, level '+o.level);
    const body=decodeURIComponent(o.url.split('&body=')[1]),p=decode(body);ok(p&&p.play===f.play&&p.places.length===2,'test/report.js decodes the issue\'s body');
    ok(/RTX 4060/.test(body)&&/preview #135/.test(body)&&/tp\(110,-380\)/.test(body),'the body says the card, the preview and the worst place for a person');
    const txt=show(p,'test');ok(/AT=110,0.6,-380/.test(txt)&&/RTX 4060/.test(txt),'report.js prints it, with the bench line');}

  console.log('two hours over 900 places');
  {const Q=page();Q.g.BOOT.done=true;Q.R().K.tlMax=400;let x=0,z=0,k=0;
    for(let i=0;i<432000;i++){if(i%480===0){k++;x=(k%30)*215+100;z=Math.floor(k/30)*215+100;}const iv=i%97===0?55:i%7===0?20:14;Q.step(iv,{pos:[x,-10,z],gpu:[8,0,1,0.2],draws:200+(k%50),tris:3e6});
      if(i%9001===0)Q.g.console.warn('warning number '+(i/9001));}
    const R=Q.R(),f=R.full();ok(R.state.places.size===600&&f.places.length===601,'the places capped at '+R.K.places+', the rest pooled: '+f.places.length+' rows');
    ok(f.tl.rows.length<R.K.tlMax&&f.tl.every>2,'the timeline halved as it grew: '+f.tl.rows.length+' rows of '+f.tl.every+' s');
    ok(f.spikes.length===40&&f.spN>4000,'the worst 40 frames kept of '+f.spN);ok(f.errs.length===40&&f.errN>0,'40 kinds of warning kept, '+f.errN+' more counted');
    const o=await R.body();ok(o.len<=R.K.url,'the link fits: '+o.len+' characters at level '+o.level);
    const p=decode(decodeURIComponent(o.url.split('&body=')[1]));ok(p&&p.places.length>=10&&p.spikes.length>=6,'and decodes: '+p.places.length+' places, '+p.spikes.length+' frames, '+p.tl.rows.length+' rows');
    const full=await unpack(o.full);ok(full.places.length===601&&full.tl.rows.length===f.tl.rows.length,'the clipboard holds the whole: '+o.full.length+' characters');
    ok(!nanFree(f,'s').length,'no NaN');}

  console.log('the store: a long session kept, a short one not over it; F9 sends the last when this one is short');
  {const store=new Map(),P1=page({store});P1.g.BOOT.done=true;for(let i=0;i<5000;i++)P1.step(16.7,{pos:A});for(const h of P1.handlers.pagehide)h();
    const kept=Math.round(P1.R().state.s);ok(store.has('tethys.rec')&&JSON.parse(store.get('tethys.rec')).p.play===kept,'a session of '+P1.R().state.s.toFixed(0)+' s stored at pagehide');
    const P2=page({store});P2.g.BOOT.done=true;for(let i=0;i<100;i++)P2.step(16.7,{pos:B});for(const h of P2.handlers.pagehide)h();
    ok(JSON.parse(store.get('tethys.rec')).p.play===kept,'a short one (2 s) not stored over it');
    let opened=null;const P3=page({store,open:()=>(opened={location:{href:''},opener:{}})});P3.g.BOOT.done=true;for(let i=0;i<100;i++)P3.step(16.7,{pos:B});
    for(const h of P3.handlers.keydown)h({code:'F9',preventDefault(){}});await new Promise(r=>setTimeout(r,300)); // the compression is a promise
    ok(opened&&/issues\/new/.test(opened.location.href)&&opened.opener===null,'F9 opens the tab and sends it there, the opener cut');
    const p=decode(decodeURIComponent(opened.location.href.split('&body=')[1]));ok(p&&p.play===kept&&/previous session/.test(decodeURIComponent(opened.location.href)),'the last session sent, and said so');
    ok(P3.g.hintEl.textContent.indexOf('github issue')>=0,'the hint: '+P3.g.hintEl.textContent);
    const mid=P1.R().state.mid,f1=P1.R().full();ok(/^[0-9a-z]{4}$/.test(mid)&&store.get('tethys.mid')===mid&&f1.dev.mid===mid,'the machine\'s name made once and kept: '+mid);
    ok(P3.R().state.mid===mid&&p.dev.mid===mid&&/· [0-9a-z]{4} ·/.test(decodeURIComponent(opened.location.href.split('&body=')[0])),'the same browser the same name, in the report and its title');
    ok(P3.g.machine('tower 1')==='this browser reports as tower 1'&&store.get('tethys.mid')==='tower 1'&&P3.R().full().dev.mid==='tower 1','machine(\'tower 1\') names it');
    const Pn=page({crypto:false});ok(/^[0-9a-z]{4}$/.test(Pn.R().state.mid)&&Pn.R().state.mid!==mid,'a fresh browser another name (without crypto too): '+Pn.R().state.mid);
    const P4=page({timer:false});P4.g.BOOT.done=true;for(let i=0;i<100;i++)P4.step(16.7,{pos:A});P4.step(2500,{pos:A,work:2400,compile:30});const f4=P4.R().full();
    ok(f4.all.frames===100&&f4.all.iv[4]===2500&&/compile×30/.test(f4.spikes[0][f4.sc.indexOf('what')]),'a visible frame of seconds is a stall, counted (the first frame never is): '+f4.all.frames+' frames, max '+f4.all.iv[4]+' ms, '+f4.spikes[0][f4.sc.indexOf('what')]);ok(f4.all.gpu===null&&!f4.dev.timer&&P4.gl.made===0,'no timer in the browser: no queries made, the GPU said untimed');}

  console.log(fails?fails+' FAILED':'rec: ok');process.exit(fails?1:0);})().catch(e=>{console.log('threw: '+(e&&e.stack||e));process.exit(1);});
