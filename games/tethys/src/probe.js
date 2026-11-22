// probe.js — what each part of the frame costs this GPU, here (v11.208): F8 in play, or probe() in the console
// The recorder times the GPU by pass (rec.js recGpu), not by what a pass draws, and the software GPU's proxy (test/fill.js) cannot stand for a weak card's
// ratios: the work tower's main pass is 22–35 ms of its ~30 ms frame at 0.6 MP on the low tier (#152), under water as much as in the air, and nothing here
// can say which part of it. So the frame is measured on the person's own GPU. Each part's draws are skipped at the renderer in turn (probeCat: the terrain,
// the flora, the rocks and structures, the far cards, the creatures and the player, the water, the sky, the horizon's land and sea — each with its shadow
// casting, which goes through the same call), then each heavy effect that is on is switched off (fxApply, as the list does); between every two, the frame as
// it is. Each state's frames are timed by the GPU's own timer (rec.js recGpuFlush → probeGot), the median of PROBE_K.frames after PROBE_K.settle (the timer's
// results come back a few frames late, and a switched effect may compile). A part's cost is the frame as it is (the mean of the two beside it) less the frame
// without it. The result is shown, logged, and kept for the next report (REC.probe; test/report.js prints it). The world goes on meanwhile: hold still. The
// resolution and the tier's sampling hold while it runs (main.js).
const PROBE_K={settle:3,frames:10,keep:4}; // frames after a switch before its results count; frames a state is measured; the probes a report keeps
const PROBE_PARTS=['terrain','flora','rocks','far','creatures','water','sky','horizon'];
const PROBE_FX=['caustics','texelLight','shadows','statics','ground','sharp','shafts','snow','rain','clouds','refract','crest','halo','murk','mirror','cloudLight']; // the effects with a pass, a copy or a per-pixel term of their own; those on are measured
let PROBE=null; // a probe under way: {st — the states, i — the current one, skip — the part whose draws are skipped (or null), roots — the creatures' and the player's groups, end — the frame the last state ended (−1 before), at, buf, tier, above}
const probeCatW=new WeakMap();let probeHooked=false,probeFm=null;
function probeState(k,name){return {k:k,name:name,F:0,ms:[],n:0};} // one shape: k 'base' | 'part' | 'fx'; F the frame it began; ms its frames' GPU times; n the draws it skipped a frame (the last)
function probeSay(s){if(typeof hintEl==='undefined')return;hintEl.textContent=s;hintEl.style.opacity='1';const k=s;setTimeout(()=>{if(hintEl.textContent===k)hintEl.style.opacity='0';},12000);}
function probeHook(){if(probeHooked)return;probeHooked=true;const rbd=renderer.renderBufferDirect;if(typeof rbd!=='function')return; // installed at the first probe only: play before it draws through three's own call
  renderer.renderBufferDirect=function(cam,sc,g,m,o,gr){const P=PROBE;if(P!==null&&P.skip!==null&&probeCat(o,m)===P.skip){P.st[P.i].n++;return;}return rbd.apply(this,arguments);};}
function probeCat(o,m){let c=probeCatW.get(o);if(c!==undefined)return c;c=probeCatOf(o,m);if(c!=='other')probeCatW.set(o,c);return c;} // 'other' asked again: a creature spawned after the roots were taken is one at the next state
function probeCatOf(o,m){
  if(o===sky)return 'sky';
  if(o===surface||o===waterDome||o===SURF_OCC)return 'water';
  if(m===TERRAIN_MAT)return 'terrain';
  if(m===MATROCKF||m===MATROCKB)return 'rocks';
  if(m===MATFAR)return 'far';
  if(probeFm===null){probeFm=new Set();for(const f of FLORA){if(f.mat)probeFm.add(f.mat);if(f.mp)probeFm.add(f.mp);}}
  let top=o;for(let p=o;p;p=p.parent){if(p===poolGroup)return 'flora';if(PROBE!==null&&PROBE.roots!==null&&PROBE.roots.has(p))return 'creatures';top=p;}
  if(top===hzScene)return 'horizon';
  if(probeFm.has(m))return 'flora';
  return 'other';}
function probe(){ // start one; what it says is for the console
  if(PROBE!==null)return 'a probe is under way';
  if(mode!=='play'){probeSay('the probe runs in play');return 'in play only';}
  if(!RG.on){probeSay('no GPU timer in this browser: the probe needs one (desktop Chrome has it)');return 'no GPU timer here';}
  probeHook();const st=[probeState('base','')];
  for(const p of PROBE_PARTS){st.push(probeState('part',p));st.push(probeState('base',''));}
  for(const k of PROBE_FX)if(FX[k]===true){st.push(probeState('fx',k));st.push(probeState('base',''));}
  const v=renderer.getDrawingBufferSize(new THREE.Vector2());
  PROBE={st:st,i:-1,skip:null,roots:null,end:-1,at:[Math.round(camera.position.x),+camera.position.y.toFixed(1),Math.round(camera.position.z),+(player.yaw||0).toFixed(2)],buf:[v.x|0,v.y|0],tier:Q.tier,above:wasAbove===true?1:0};
  probeNext();const s=Math.round(st.length*(PROBE_K.settle+PROBE_K.frames)/30);
  probeSay('measuring what each part costs the GPU here: hold still (about '+Math.max(5,Math.round(s/2))+'–'+s+' s)');return 'started: '+st.length+' states';}
function probeNext(){const P=PROBE,o=P.i>=0?P.st[P.i]:null; // the current state undone, the next one set
  if(o!==null&&o.k==='fx'){FX[o.name]=true;fxApply();}
  P.i++;P.skip=null;if(P.i>=P.st.length){P.end=REC.frame;return;}
  const S=P.st[P.i];S.F=REC.frame;
  if(S.k==='part'){P.skip=S.name;P.roots=new Set();for(const c of creatures)if(c.g)P.roots.add(c.g);if(player.g)P.roots.add(player.g);}
  else if(S.k==='fx'){FX[S.name]=false;fxApply();}}
function probeStep(){const P=PROBE;if(P===null)return; // main.js, every frame before the render
  if(mode!=='play'||fxOpen||(typeof document!=='undefined'&&document.hidden)){probeEnd(true);return;} // fxOpen: a switch flipped in the list would save the probe's
  if(P.end>=0){if(REC.frame>P.end+8)probeEnd(false);return;} // the last results back from the timer
  if(REC.frame>=P.st[P.i].F+PROBE_K.settle+PROBE_K.frames)probeNext();
  if(P.end<0)P.st[P.i].n=0;} // the draws skipped counted afresh each frame: a state's count is its last frame's
function probeGot(fr,ms){const P=PROBE;if(P===null)return; // rec.js recGpuFlush: a whole frame's GPU time, by its frame
  for(const S of P.st)if(fr>=S.F+PROBE_K.settle&&fr<S.F+PROBE_K.settle+PROBE_K.frames&&S.ms.length<PROBE_K.frames){S.ms.push(ms);return;}}
function probeMed(a){if(a.length<3)return -1;const s=a.slice().sort((x,y)=>x-y);return s[s.length>>1];}
function probeEnd(cut){const P=PROBE;if(P===null)return;
  if(P.i<P.st.length){const S=P.st[P.i];if(S.k==='fx'){FX[S.name]=true;fxApply();}}
  P.skip=null;PROBE=null;
  if(cut){probeSay('the probe stopped (left play, the effects list opened, or the tab hidden)');return;}
  const f=v=>+v.toFixed(2),med=P.st.map(S=>probeMed(S.ms)),parts=[],fx=[],bases=[];
  for(let j=0;j<P.st.length;j++){const S=P.st[j];if(S.k==='base'){if(med[j]>=0)bases.push(med[j]);continue;}
    const a=med[j-1],b=med[j+1],v=med[j];const c=a>=0&&b>=0&&v>=0?f((a+b)/2-v):null; // null: too few frames timed (a disjoint, the timer's junk)
    if(S.k==='part')parts.push([S.name,c,S.n]);else fx.push([S.name,c]);}
  bases.sort((x,y)=>x-y);const base=bases.length?f(bases[bases.length>>1]):-1;
  const by=(x,y)=>(y[1]===null?-1e9:y[1])-(x[1]===null?-1e9:x[1]);parts.sort(by);fx.sort(by);
  const r={at:P.at,buf:P.buf,tier:P.tier,above:P.above,gpu:base,parts:parts,fx:fx};REC.probe.push(r);if(REC.probe.length>PROBE_K.keep)REC.probe.shift();
  const top=parts.concat(fx).filter(x=>x[1]!==null).sort(by).slice(0,5);
  probeSay('the GPU here '+base+' ms a frame — '+top.map(x=>x[0]+' '+x[1]).join(' · ')+' (kept for the next report, F9)');
  console.log('probe at tp('+P.at[0]+','+P.at[2]+'), '+P.buf.join('×')+', '+P.tier+': the GPU '+base+' ms a frame\n'+parts.map(x=>'  '+x[0].padEnd(11)+String(x[1]).padStart(7)+' ms  '+x[2]+' draws').join('\n')+'\n'+fx.map(x=>'  '+x[0].padEnd(11)+String(x[1]).padStart(7)+' ms  (effect)').join('\n'));}
addEventListener('keydown',e=>{if(e&&e.code==='F8'){if(e.preventDefault)e.preventDefault();probe();}});
