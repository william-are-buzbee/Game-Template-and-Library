// rec.js — the flight recorder (v11.191, analysis_project.md §1). The person, 20 Nov 2026: "I could just play and you'd learn what device I'm on, the
// GPU/CPU, specs, frames, polygons, everything. You could check the log and that would literally be it." Every session is recorded where it is played,
// in this browser and nowhere else: the machine once; every frame's interval, the CPU's work by phase and, where the browser has a GPU timer
// (EXT_disjoint_timer_query_webgl2: desktop Chrome), the GPU's own time by pass; the frames by the place they were played at (a cell of the world), so
// the worst places come with their tp(); the worst frames and what each was doing; every error and warning the game printed; the boot's stages.
// F9 (or report() from the console) sends it: GitHub's new-issue page opens in a tab with the session written in, the data compressed, and the person
// submits it. The repository is public, so the issue is (their answer, 20 Nov 2026: "the public issue works well too"). test/report.js reads one back.
// Nothing here changes the game: it reads what the frame already measured. It loads first (src/order.txt) so the warnings and errors of every file's
// load are caught; everything else it reads (renderer, player, BOOT, mode) is read at a frame, never at load.
const REC_K={repo:'william-are-buzbee/Game-Template-and-Library',url:7400,spike:50,work:33,places:600,spikes:40,errs:40,tl:2,tlMax:1800,save:60,minPlay:60,key:'tethys.rec'};
// url: the longest link sent (GitHub refuses a new-issue address past about 8 KB); spike, work: a frame this long (its interval, or the CPU's work) is kept
// with what it was doing; places: the cells kept apart (the rest pool as one); tl: the timeline's row every this many seconds of play, tlMax rows before
// they are merged in pairs; save: seconds between writes to localStorage; minPlay: a session shorter than this is not stored over the last, and F9 sends the last instead
const REC_NB=176; // a frame's milliseconds in bins: 0.5 ms wide to 50, 5 ms to 250, 50 ms to 2 s (a stall's size), then one for the rest
function recBin(ms){return ms<50?(ms>0?Math.floor(ms*2):0):ms<250?100+Math.floor((ms-50)/5):ms<2000?140+Math.floor((ms-250)/50):175;}
function recBinMs(b){return b<100?(b+0.5)/2:b<140?50+(b-100+0.5)*5:b<175?250+(b-140+0.5)*50:2000;}
function recPct(H,n,p){if(!n)return 0;const k=Math.max(1,Math.ceil(p*n));let c=0;for(let b=0;b<REC_NB;b++){c+=H[b];if(c>=k)return recBinMs(b);}return 2000;}
// the measures of a play frame, in this order (REC.F, every place's sums): the interval, the CPU's work and its phases (main.js loop), what was drawn
const REC_M=['iv','work','gen','play','sim','fx','scene','hud','render','draws','tris','creatures','cells','res','above'],REC_NM=REC_M.length;
const REC={v:(window.TETHYS_BUILD&&window.TETHYS_BUILD.v)||'dev',at:new Date().toISOString(),t0:performance.now(),dev:null,frame:0,wall:0,s:0,n:0,
  H:new Uint32Array(REC_NB),HW:new Uint32Array(REC_NB),HG:new Uint32Array(REC_NB),sum:new Float64Array(REC_NM),mx:new Float64Array(REC_NM),F:new Float64Array(REC_NM),
  gN:0,gSum:0,gMax:0,gPass:new Float64Array(4),places:new Map(),cur:null,other:null,progs:0,heap:0,
  sec:{s:0,n:0,ivMax:0,gN:0,g:0,sum:new Float64Array(REC_NM)},tl:[],tlEvery:2,sp:[],spN:0,errs:new Map(),errN:0,
  menu:{n:0,iv:0,work:0,max:0},boot:{scripts:0,first:-1,store:-1,load:-1,done:-1,progs:0,seen:false},loaf:{n:0,ms:0,block:0,by:new Map()},
  prev:null,saveT:0,sent:0,skip:true,mid:''}; // skip: the next frame is not one (the first, and the one after the tab was hidden)
REC.boot.scripts=+(REC.t0/1000).toFixed(2); // the page's own clock: seconds from the navigation to this file's first line (the scripts fetched and parsed)
function recPlace(key,i,j){return {key:key,i:i,j:j,n:0,s:0,x:0,y:0,z:0,H:new Uint32Array(REC_NB),sum:new Float64Array(REC_NM),dMax:0,tMax:0,
  gN:0,g:0,gp:new Float64Array(4),wIv:0,w:new Float64Array(6)};} // one shape (CLAUDE.md "the shape rule"); w: the worst frame there — x, y, z, the body's yaw, its interval, its work
REC.other=recPlace(-1,0,0);

// ---------- the GPU's own time (EXT_disjoint_timer_query_webgl2) ----------
// A query brackets each pass (recGpu before it, recGpuEnd or the next recGpu after); its result arrives a few frames later and is added to its frame's
// sum, which is counted when the next frame's first result arrives. The passes (k): 0 main, renderer.render of the world (three's own shadow map
// inside it; horizon.js renderFrame); 1 the horizon tier; 2 the cloud volume (atmosphere.js cloudPass); 3 the world's static shadow map (scene.js updateShadowS). One query at a time (WebGL has no nesting). A disjoint (the GPU's clock reset:
// a power state, another app) throws the queries in flight away. RG.ema is the readout's `gpu`.
const RG={gl:null,ext:null,on:false,open:null,openK:0,pool:[],q:new Array(64).fill(null),k:new Int8Array(64),f:new Int32Array(64),p:new Array(64).fill(null),pl:new Uint8Array(64),h:0,n:0,did:0,
  acc:new Float64Array(4),accF:-1,accP:null,accPl:0,ema:-1};
function recGpu(k){RG.did|=1<<k;if(!RG.on)return;if(RG.open!==null)recGpuEnd();if(RG.n>=60)return;const gl=RG.gl,q=RG.pool.length?RG.pool.pop():gl.createQuery();
  gl.beginQuery(RG.ext.TIME_ELAPSED_EXT,q);RG.open=q;RG.openK=k;}
function recGpuEnd(){if(RG.open===null)return;RG.gl.endQuery(RG.ext.TIME_ELAPSED_EXT);const i=RG.h,pl=mode==='play';RG.q[i]=RG.open;RG.k[i]=RG.openK;RG.f[i]=REC.frame;RG.p[i]=pl?REC.cur:null;RG.pl[i]=pl?1:0;
  RG.h=(i+1)&63;RG.n++;RG.open=null;}
function recGpuFlush(){if(RG.accF<0)return;const a=RG.acc,g=a[0]+a[1]+a[2]+a[3];RG.ema=RG.ema<0?g:RG.ema+(g-RG.ema)*0.05;
  if(RG.accPl){REC.HG[recBin(g)]++;REC.gN++;REC.gSum+=g;if(g>REC.gMax)REC.gMax=g;for(let k=0;k<4;k++)REC.gPass[k]+=a[k];REC.sec.gN++;REC.sec.g+=g;
    const P=RG.accP;if(P){P.gN++;P.g+=g;for(let k=0;k<4;k++)P.gp[k]+=a[k];}
    for(const r of REC.sp)if(r[0]===RG.accF)r[15]=+g.toFixed(2);}
  a.fill(0);RG.accF=-1;RG.accP=null;RG.accPl=0;}
function recPoll(){const gl=RG.gl,E=RG.ext;
  while(RG.n>0){const o=(RG.h-RG.n+64)&63,q=RG.q[o];if(!gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE))break;
    if(gl.getParameter(E.GPU_DISJOINT_EXT)){while(RG.n>0){const i=(RG.h-RG.n+64)&63;RG.pool.push(RG.q[i]);RG.q[i]=null;RG.p[i]=null;RG.n--;}RG.acc.fill(0);RG.accF=-1;RG.accP=null;break;}
    const ms=gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6;RG.pool.push(q);RG.q[o]=null;RG.n--;
    if(RG.f[o]!==RG.accF){recGpuFlush();RG.accF=RG.f[o];RG.accP=RG.p[o];RG.accPl=RG.pl[o];}
    RG.acc[RG.k[o]]+=ms;RG.p[o]=null;}}

// ---------- the machine, once (at the first frame: the renderer exists by then) ----------
function recGpuName(s){s=String(s||'');const m=/^ANGLE \((.*)\)$/.exec(s);if(m){const p=m[1].split(', ');s=p.length>1?p[1]:p[0];}
  return s.replace(/ \(0x[0-9A-Fa-f]+\)/,'').replace(/ Direct3D.*$/,'').replace(/^ANGLE Metal Renderer: /,'').replace(/ vs_\d.*$/,'').trim();}
function recDevice(){const d={mid:REC.mid,gpu:'',vendor:'',gl:GL2?2:1,maxTex:0,timer:false,par:false,cores:navigator.hardwareConcurrency||0,mem:navigator.deviceMemory||0,ua:navigator.userAgent||'',plat:'',
  screen:[screen.width||0,screen.height||0],dpr:window.devicePixelRatio||1,win:[innerWidth,innerHeight],buf:[0,0],tier:Q.tier,pr:Q.pr,aa:!!Q.aa,touch:!!isTouch,fx:null};REC.dev=d;
  try{const gl=renderer.getContext(),dbg=gl.getExtension('WEBGL_debug_renderer_info');d.gpu=String(gl.getParameter(dbg?dbg.UNMASKED_RENDERER_WEBGL:gl.RENDERER));d.vendor=String(gl.getParameter(dbg?dbg.UNMASKED_VENDOR_WEBGL:gl.VENDOR));
    d.maxTex=gl.getParameter(gl.MAX_TEXTURE_SIZE)|0;const ex=gl.getSupportedExtensions()||[];d.par=ex.indexOf('KHR_parallel_shader_compile')>=0;
    const E=GL2&&ex.indexOf('EXT_disjoint_timer_query_webgl2')>=0?gl.getExtension('EXT_disjoint_timer_query_webgl2'):null;if(E){RG.gl=gl;RG.ext=E;RG.on=true;d.timer=true;}
    renderer.domElement.addEventListener('webglcontextlost',()=>recErr('gl','the WebGL context was lost'));}catch(e){}
  try{const U=navigator.userAgentData;if(U&&U.getHighEntropyValues)U.getHighEntropyValues(['platformVersion','architecture','bitness','fullVersionList']).then(h=>{
    const v=h.platformVersion||'',win=h.platform==='Windows'&&v?(parseInt(v,10)>=13?'11':'10'):'';d.plat=[h.platform,win||v,h.architecture?h.architecture+(h.bitness?'-'+h.bitness:''):''].filter(x=>x).join(' '); /* Windows' platformVersion 13 and up is 11 */if(h.fullVersionList)d.br=h.fullVersionList.filter(b=>!/Not.A.Brand/i.test(b.brand)).map(b=>b.brand+' '+b.version).join(', ');},()=>{});}catch(e){}}

// ---------- the boot's stages (main.js BOOT), seconds from the page's navigation ----------
function recBoot(){const B=REC.boot;if(B.done>=0)return;const now=+(performance.now()/1000).toFixed(2);if(B.first<0)B.first=now;
  if(BOOT.stage!=='store'&&B.store<0)B.store=now;if((BOOT.stage==='settle'||BOOT.done)&&B.load<0)B.load=now;
  if(BOOT.done){B.done=now;B.progs=renderer.info.programs?renderer.info.programs.length:0;}}

// ---------- a frame (main.js loop, at its end): iv the interval, then the CPU's work and its phases, ms ----------
function recFrame(iv,work,gen,pl,sim,fx,sc,hud,rd){
  if(!REC.dev)recDevice();if(RG.on)recPoll();recBoot();
  const fr=REC.frame++,did=RG.did;RG.did=0;
  const progs=renderer.info.programs?renderer.info.programs.length:0,comp=progs-REC.progs;REC.progs=progs;
  if(document.hidden){REC.skip=true;return;}if(REC.skip||!(iv>0)||iv>30000){REC.skip=false;return;} // not a frame: a hidden tab, the gap after one (its interval is the time away), a machine asleep. A visible frame of seconds is a stall, and counted
  REC.wall+=iv;if(REC.wall-REC.saveT>REC_K.save*1000){REC.saveT=REC.wall;recIdle(recStore);}
  if(mode!=='play'){const M=REC.menu;M.n++;M.iv+=iv;M.work+=work;if(iv>M.max)M.max=iv;return;}
  const r=renderer.info.render,P=player.pos,F=REC.F;
  F[0]=iv;F[1]=work;F[2]=gen;F[3]=pl;F[4]=sim;F[5]=fx;F[6]=sc;F[7]=hud;F[8]=rd;F[9]=r.calls;F[10]=r.triangles/1000;F[11]=visibleCreatures;F[12]=visibleChunks;F[13]=resK;F[14]=wasAbove===true?1:0;
  REC.n++;REC.s+=iv/1000;const b=recBin(iv);REC.H[b]++;REC.HW[recBin(work)]++;
  const S=REC.sum,X=REC.mx;for(let m=0;m<REC_NM;m++){S[m]+=F[m];if(F[m]>X[m])X[m]=F[m];}
  const ci=Math.floor(P.x/CELL),cj=Math.floor(P.z/CELL),key=(ci+32768)*65536+(cj+32768);let c=REC.cur;
  if(!c||c.key!==key){c=REC.places.get(key)||null;if(!c){if(REC.places.size<REC_K.places){c=recPlace(key,ci,cj);REC.places.set(key,c);}else c=REC.other;}REC.cur=c;}
  c.n++;c.s+=iv/1000;c.x+=P.x;c.y+=P.y;c.z+=P.z;c.H[b]++;const cs=c.sum;for(let m=0;m<REC_NM;m++)cs[m]+=F[m];if(F[9]>c.dMax)c.dMax=F[9];if(F[10]>c.tMax)c.tMax=F[10];
  if(iv>c.wIv){c.wIv=iv;const w=c.w;w[0]=P.x;w[1]=P.y;w[2]=P.z;w[3]=player.yaw;w[4]=iv;w[5]=work;}
  const T=REC.sec;T.n++;T.s+=iv/1000;if(iv>T.ivMax)T.ivMax=iv;for(let m=0;m<REC_NM;m++)T.sum[m]+=F[m];if(T.s>=REC.tlEvery)recRow();
  if(iv>=REC_K.spike||work>=REC_K.work){REC.spN++;let what='';
    if(gen>4)what+=' gen';if(comp>0)what+=' compile×'+comp;if(did&8)what+=' world-shadows';if(iv-work>33&&work<iv/2)what+=' outside';if(!BOOT.done)what+=' boot';
    const hp=performance.memory?performance.memory.usedJSHeapSize/1048576:0;if(hp&&REC.heap-hp>4)what+=' gc';
    const row=[fr,+(REC.s).toFixed(1),Math.round(P.x),+P.y.toFixed(1),Math.round(P.z),+player.yaw.toFixed(2),+iv.toFixed(1),+work.toFixed(1),+gen.toFixed(1),+pl.toFixed(1),+sim.toFixed(1),+fx.toFixed(1),+sc.toFixed(1),+hud.toFixed(1),+rd.toFixed(1),-1,r.calls,Math.round(r.triangles/1000),what.trim()];
    const L=REC.sp;if(L.length<REC_K.spikes)L.push(row);else{let k=0;for(let i=1;i<L.length;i++)if(L[i][6]<L[k][6])k=i;if(iv>L[k][6])L[k]=row;}}}
function recRow(){const T=REC.sec,n=T.n||1,S=T.sum,P=player.pos,hp=performance.memory?performance.memory.usedJSHeapSize/1048576:0;REC.heap=hp;
  REC.tl.push([+REC.s.toFixed(1),Math.round(P.x),+P.y.toFixed(1),Math.round(P.z),+player.yaw.toFixed(2),T.n,+(S[0]/n).toFixed(2),+T.ivMax.toFixed(1),+(S[1]/n).toFixed(2),+(S[2]/n).toFixed(2),+(S[4]/n).toFixed(2),
    +(S[8]/n).toFixed(2),T.gN?+(T.g/T.gN).toFixed(2):-1,Math.round(S[9]/n),Math.round(S[10]/n),Math.round(S[11]/n),Math.round(S[12]/n),+(S[13]/n).toFixed(2),+(S[14]/n).toFixed(2),Math.round(hp)]);
  T.s=0;T.n=0;T.ivMax=0;T.gN=0;T.g=0;S.fill(0);
  if(REC.tl.length>=REC_K.tlMax){REC.tl=recHalve(REC.tl);REC.tlEvery*=2;}}
const REC_TL=['t','x','y','z','yaw','frames','iv','ivMax','work','gen','sim','render','gpu','draws','tris','creatures','cells','res','above','heap'];
function recHalve(rows){const out=[];for(let i=0;i+1<rows.length;i+=2){const a=rows[i],b=rows[i+1],na=a[5],nb=b[5],n=na+nb||1,o=b.slice();o[5]=na+nb;
    for(const k of [6,8,9,10,11,13,14,15,16,17,18])o[k]=+((a[k]*na+b[k]*nb)/n).toFixed(2);o[7]=Math.max(a[7],b[7]);o[12]=a[12]<0?b[12]:b[12]<0?a[12]:+((a[12]+b[12])/2).toFixed(2);out.push(o);}
  if(rows.length%2)out.push(rows[rows.length-1]);return out;}
function recIdle(f){if(window.requestIdleCallback)window.requestIdleCallback(f,{timeout:5000});else setTimeout(f,0);}

// ---------- errors, warnings, long frames ----------
function recErr(kind,msg){try{msg=String(msg).slice(0,300);const k=kind+'|'+msg;let e=REC.errs.get(k);
  if(!e){if(REC.errs.size>=REC_K.errs){REC.errN++;return;}e={kind:kind,msg:msg,n:0,t:+(performance.now()/1000).toFixed(1),x:0,z:0};REC.errs.set(k,e);try{if(mode==='play'){e.x=Math.round(player.pos.x);e.z=Math.round(player.pos.z);}}catch(_){}}
  e.n++;}catch(_){}}
function recArgs(a){let s='';for(let i=0;i<a.length;i++){const v=a[i];s+=(i?' ':'')+(v&&v.message?v.message:typeof v==='object'?(function(){try{return JSON.stringify(v);}catch(_){return String(v);}})():String(v));}return s;}
function recLoaf(e){const L=REC.loaf;L.n++;L.ms+=e.duration;L.block+=e.blockingDuration||0;
  for(const s of e.scripts||[]){const k=(s.invoker||'?')+(s.sourceFunctionName?' '+s.sourceFunctionName:'');let a=L.by.get(k);if(!a){if(L.by.size>=24)continue;a={k:k,n:0,ms:0};L.by.set(k,a);}a.n++;a.ms+=s.duration;}}
(function(){const c=console,w=c.warn,er=c.error;
  c.warn=function(){recErr('warn',recArgs(arguments));return w.apply(c,arguments);};
  c.error=function(){recErr('error',recArgs(arguments));return er.apply(c,arguments);}; // three's shader compile and link failures come through here
  addEventListener('error',e=>recErr('throw',(e&&(e.message||e.error)||'?')+(e&&e.lineno?' @'+e.lineno+':'+e.colno:'')));
  addEventListener('unhandledrejection',e=>recErr('reject',e&&e.reason&&(e.reason.message||e.reason)));
  try{const PO=window.PerformanceObserver;if(PO&&PO.supportedEntryTypes&&PO.supportedEntryTypes.indexOf('long-animation-frame')>=0)new PO(l=>{for(const e of l.getEntries())recLoaf(e);}).observe({type:'long-animation-frame',buffered:true});}catch(e){}
  // the machine's name in its reports (the person plays on several, 20 Nov 2026: "two work towers and my home computer"): four random characters made once
  // per browser and kept in localStorage — two towers with the same card still tell apart — or a name given with machine('home') from the console. Not
  // Math.random: the benches seed it, and one draw more at load would move every draw after it
  try{const LS=window.localStorage;let m=LS&&LS.getItem('tethys.mid');if(!m){const C=window.crypto;m=(C&&C.getRandomValues?C.getRandomValues(new Uint32Array(1))[0]:Date.now()).toString(36).slice(-4);if(LS)LS.setItem('tethys.mid',m);}REC.mid=m;}catch(e){REC.mid='?';}
  try{const s=window.localStorage&&window.localStorage.getItem(REC_K.key);if(s){REC.prev=JSON.parse(s);REC.boot.seen=!!(REC.prev&&REC.prev.v===REC.v);}}catch(e){}
  addEventListener('keydown',e=>{if(e&&e.code==='F9'){if(e.preventDefault)e.preventDefault();recSend();}});
  addEventListener('pagehide',()=>recStore());
  if(document.addEventListener)document.addEventListener('visibilitychange',()=>{REC.skip=true;if(document.hidden)recStore();});})();
function recStore(){if(REC.s<REC_K.minPlay)return;try{const p=recShrink(recFull(),1);window.localStorage.setItem(REC_K.key,JSON.stringify({v:REC.v,at:REC.at,p:p}));}catch(e){}}

// ---------- the session as data ----------
const REC_PC=['x','z','y','s','frames','p50','p95','p99','max','work','gen','sim','render','gpu','gMain','gHorizon','gClouds','gShadows','draws','drawsMax','tris','trisMax','creatures','above','wx','wy','wz','wyaw','wiv','wwork'];
const REC_SC=['frame','t','x','y','z','yaw','iv','work','gen','play','sim','fx','scene','hud','render','gpu','draws','tris','what'];
function recPlaceRow(c){const n=c.n||1,S=c.sum,g=c.gN||0,f=v=>+v.toFixed(2);
  return [Math.round(c.x/n),Math.round(c.z/n),+(c.y/n).toFixed(1),+c.s.toFixed(1),c.n,recPct(c.H,c.n,0.5),recPct(c.H,c.n,0.95),recPct(c.H,c.n,0.99),+c.wIv.toFixed(1),f(S[1]/n),f(S[2]/n),f(S[4]/n),f(S[8]/n),
    g?f(c.g/g):-1,g?f(c.gp[0]/g):-1,g?f(c.gp[1]/g):-1,g?f(c.gp[2]/g):-1,g?f(c.gp[3]/g):-1,Math.round(S[9]/n),c.dMax,Math.round(S[10]/n),Math.round(c.tMax),Math.round(S[11]/n),f(S[14]/n),
    Math.round(c.w[0]),+c.w[1].toFixed(1),Math.round(c.w[2]),+c.w[3].toFixed(2),+c.w[4].toFixed(1),+c.w[5].toFixed(1)];}
function recFull(){const n=REC.n||1,S=REC.sum,X=REC.mx,f=v=>+v.toFixed(2),g=REC.gN,d=REC.dev||{};
  try{const v=renderer.getDrawingBufferSize(new THREE.Vector2());d.buf=[v.x|0,v.y|0];d.fx=Object.assign({},FX);}catch(e){}
  let vs=0,vb=0;for(let b=4;b<70;b++)if(REC.H[b]>REC.H[vb]){vb=b;}if(REC.H[vb]>0)vs=recBinMs(vb); // the interval most frames take: the display's refresh when the frame has room
  const over=ms=>{let c=0;for(let b=recBin(ms)+1;b<REC_NB;b++)c+=REC.H[b];return f(c/n);};
  const places=[];for(const c of REC.places.values())places.push(c);if(REC.other.n)places.push(REC.other);places.sort((a,b)=>b.s-a.s);
  let nav=null;try{const e=performance.getEntriesByType('navigation')[0],fcp=performance.getEntriesByType('paint').find(p=>p.name==='first-contentful-paint');nav={loaded:e?f(e.loadEventEnd/1000):-1,fcp:fcp?f(fcp.startTime/1000):-1,bytes:e?e.transferSize|0:0};}catch(e){}
  const errs=[];for(const e of REC.errs.values())errs.push([e.kind,e.n,e.t,e.x,e.z,e.msg]);
  const loaf=[];for(const a of REC.loaf.by.values())loaf.push([a.k,a.n,Math.round(a.ms)]);loaf.sort((a,b)=>b[2]-a[2]);
  return {f:1,v:REC.v,url:location.pathname||'',at:REC.at,wall:Math.round(REC.wall/1000),play:Math.round(REC.s),dev:d,boot:Object.assign({nav:nav},REC.boot),
    all:{frames:REC.n,iv:[recPct(REC.H,REC.n,0.5),recPct(REC.H,REC.n,0.9),recPct(REC.H,REC.n,0.95),recPct(REC.H,REC.n,0.99),f(X[0])],work:[f(S[1]/n),recPct(REC.HW,REC.n,0.95),f(X[1])],
      ph:{gen:f(S[2]/n),play:f(S[3]/n),sim:f(S[4]/n),fx:f(S[5]/n),scene:f(S[6]/n),hud:f(S[7]/n),render:f(S[8]/n)},
      gpu:g?{frames:g,mean:f(REC.gSum/g),p50:recPct(REC.HG,g,0.5),p95:recPct(REC.HG,g,0.95),max:f(REC.gMax),pass:{main:f(REC.gPass[0]/g),horizon:f(REC.gPass[1]/g),clouds:f(REC.gPass[2]/g),shadows:f(REC.gPass[3]/g)}}:null,
      draws:[Math.round(S[9]/n),X[9]],tris:[Math.round(S[10]/n),Math.round(X[10])],creatures:Math.round(S[11]/n),cells:Math.round(S[12]/n),res:f(S[13]/n),above:f(S[14]/n),vsync:vs,over:[over(16.7),over(33.3),over(50)]},
    menu:{frames:REC.menu.n,iv:REC.menu.n?f(REC.menu.iv/REC.menu.n):0,max:f(REC.menu.max),work:REC.menu.n?f(REC.menu.work/REC.menu.n):0},
    pc:REC_PC,places:places.map(recPlaceRow),tl:{every:REC.tlEvery,cols:REC_TL,rows:REC.tl.slice()},
    sc:REC_SC,spikes:REC.sp.slice().sort((a,b)=>b[6]-a[6]),spN:REC.spN,errs:errs,errN:REC.errN,loaf:{n:REC.loaf.n,ms:Math.round(REC.loaf.ms),block:Math.round(REC.loaf.block),by:loaf.slice(0,10)}};}
// a level of detail: 0 everything, each step fewer places, frames and errors, and a coarser timeline — for the link's length (recBody)
function recShrink(p,L){if(!L)return p;const o=Object.assign({},p),K=[0,60,40,25,15,10][Math.min(L,5)],pc=p.pc,iS=pc.indexOf('s'),i95=pc.indexOf('p95');
  const byS=p.places.slice().sort((a,b)=>b[iS]-a[iS]),byP=p.places.filter(r=>r[iS]>=5).sort((a,b)=>b[i95]-a[i95]),keep=new Set();
  for(let i=0;keep.size<Math.min(K,p.places.length)&&i<p.places.length;i++){if(byP[i])keep.add(byP[i]);if(keep.size<K&&byS[i])keep.add(byS[i]);}
  o.places=byS.filter(r=>keep.has(r));o.spikes=p.spikes.slice(0,[0,40,25,15,10,6][Math.min(L,5)]);o.errs=p.errs.slice(0,[0,40,20,12,8,5][Math.min(L,5)]);
  let rows=p.tl.rows,every=p.tl.every;const cap=[0,600,300,150,80,40][Math.min(L,5)];while(rows.length>cap){rows=recHalve(rows);every*=2;}o.tl={every:every,cols:p.tl.cols,rows:rows};
  if(L>=4){o.loaf=Object.assign({},p.loaf,{by:p.loaf.by.slice(0,4)});o.dev=Object.assign({},p.dev,{ua:p.dev.ua?p.dev.ua.slice(0,160):''});}return o;}

// ---------- sending it (F9, report()) ----------
function recB64(u8){let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function recPack(p){const s=JSON.stringify(p),CS=window.CompressionStream,TE=window.TextEncoder;
  if(CS&&window.Response){try{const st=new Blob([s]).stream().pipeThrough(new CS('deflate-raw'));return new window.Response(st).arrayBuffer().then(b=>'tethys-rec:1:z'+recB64(new Uint8Array(b)));}catch(e){}}
  return Promise.resolve('tethys-rec:1:j'+recB64(TE?new TE().encode(s):new Uint8Array(Array.from(unescape(encodeURIComponent(s)),ch=>ch.charCodeAt(0)))));}
function recMs(v){return v<0?'–':v>=100?v.toFixed(0):v.toFixed(1);}
function recWhere(p){const m=/\/preview\/(\d+)\//.exec(p.url||'');return m?'preview #'+m[1]:/github\.io/.test(p.url||'')||/Game-Template-and-Library\/games/.test(p.url||'')?'live':'local';}
function recTp(x,z,y){return 'tp('+x+','+z+(y<0?','+Math.round(y):'')+')';}
function recMd(p,tok,cut,prev){const a=p.all,d=p.dev||{},b=p.boot||{},pc=p.pc,I=k=>pc.indexOf(k),L=[];
  L.push('**tethys '+p.v+'** · '+(p.play/60).toFixed(1)+' min played · '+recWhere(p)+(prev?' · the previous session (this one was under a minute)':'')+' · '+p.at.slice(0,16).replace('T',' ')+' UTC');
  L.push('**machine** '+(d.mid?'`'+d.mid+'` ':'')+recGpuName(d.gpu)+' · WebGL'+d.gl+' · '+d.cores+' threads'+(d.mem?' · '+d.mem+' GB':'')+(d.plat?' · '+d.plat.trim():'')+' · screen '+(d.screen||[]).join('×')+' ×'+d.dpr+' · drawn '+(d.buf||[]).join('×')+' · '+d.tier+(a.vsync?' · vsync '+a.vsync.toFixed(1)+' ms':''));
  L.push('**frames** p50 '+recMs(a.iv[0])+' · p95 '+recMs(a.iv[2])+' · p99 '+recMs(a.iv[3])+' · max '+recMs(a.iv[4])+' ms · '+(100*a.over[1]).toFixed(1)+'% over 33 ms · CPU '+recMs(a.work[0])+' ms (sim '+recMs(a.ph.sim)+' · gen '+recMs(a.ph.gen)+' · render '+recMs(a.ph.render)+')');
  L.push(a.gpu?'**gpu** p50 '+recMs(a.gpu.p50)+' · p95 '+recMs(a.gpu.p95)+' ms (main '+recMs(a.gpu.pass.main)+' · horizon '+recMs(a.gpu.pass.horizon)+' · clouds '+recMs(a.gpu.pass.clouds)+' · shadows '+recMs(a.gpu.pass.shadows)+')':'**gpu** no timer in this browser');
  L.push('**boot** scripts '+b.scripts+' s · first frame '+b.first+' s · world in '+b.done+' s · '+b.progs+' programs'+(b.seen?' (seen this version before)':' (first visit of this version)'));
  const w=p.places.filter(r=>r[I('s')]>=5).sort((x,y)=>y[I('p95')]-x[I('p95')]).slice(0,5);
  if(w.length){L.push('**worst places** (p95 · gpu · time there)');for(const r of w)L.push('- `'+recTp(r[I('x')],r[I('z')],r[I('y')])+'` '+recMs(r[I('p95')])+' · '+recMs(r[I('gpu')])+' ms · '+(r[I('s')]/60).toFixed(1)+' min');}
  if(p.errs.length)L.push('**errors** '+p.errs.length+(p.errN?'+':'')+' kinds: '+p.errs.slice(0,2).map(e=>e[0]+' ×'+e[1]+' "'+String(e[5]).slice(0,70)+'"').join(' · '));
  if(cut)L.push('_detail was cut to fit the link; the whole log is on the clipboard: paste it below this line to add it._');
  return L.join('\n')+'\n\n<details><summary>data (test/report.js)</summary>\n\n```\n'+tok+'\n```\n</details>\n';}
async function recBody(){const prev=REC.s<REC_K.minPlay&&REC.prev&&REC.prev.p&&REC.prev.p.play>REC.s,full=prev?REC.prev.p:recFull(),d=full.dev||{};
  const title='tethys report · '+full.v+' · '+(d.mid?d.mid+' · ':'')+recGpuName(d.gpu)+' · '+(full.play/60).toFixed(0)+' min';let o=null;
  for(let L=0;L<=5;L++){const p=recShrink(full,L),tok=await recPack(p),url='https://github.com/'+REC_K.repo+'/issues/new?title='+encodeURIComponent(title)+'&body='+encodeURIComponent(recMd(p,tok,L>0,prev));
    o={url:url,level:L,len:url.length,full:L?await recPack(full):tok,prev:!!prev};if(url.length<=REC_K.url)break;}
  return o;}
function recHint(s){try{hintEl.textContent=s;hintEl.style.opacity=1;setTimeout(()=>{hintEl.style.opacity=0;},6000);}catch(e){}}
function recSend(){const w=window.open?window.open('','_blank'):null; // the tab now, in the key's own gesture: the compression is a promise, and a pop-up blocker allows only the gesture's own call
  REC.sent++;return recBody().then(o=>{let clip=false;
    try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(o.full).then(()=>{},()=>{});clip=true;}}catch(e){}
    if(w){try{w.opener=null;}catch(e){}w.location.href=o.url;recHint('report: a github issue opened in a new tab — submit it there');}
    else recHint(clip?'the browser blocked the tab: the report is on the clipboard':'the browser blocked the tab');return o;},e=>{if(w)try{w.close();}catch(_){}recErr('error','report: '+(e&&e.message));recHint('the report failed: '+(e&&e.message));});}
window.report=function(){return recSend();};
window.machine=function(name){name=String(name||'').trim().slice(0,24);if(!name)return 'this browser reports as '+REC.mid;try{window.localStorage.setItem('tethys.mid',name);}catch(e){}REC.mid=name;if(REC.dev)REC.dev.mid=name;return 'this browser reports as '+name;}; // machine('home'): the name its reports carry // from the console; the tab may be blocked there (no gesture), the clipboard has it
window.__rec={full:()=>recFull(),body:()=>recBody(),shrink:recShrink,pack:recPack,name:recGpuName,state:REC,gpu:RG,K:REC_K}; // the tests (test/rec.js, test/boot.js) and the console
