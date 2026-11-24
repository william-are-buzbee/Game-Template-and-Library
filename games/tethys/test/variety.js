// test/variety.js — the individual (v11.225; VARIETY.md; creatures_defs.js VARIETY, creatures_ai.js indiv/variantOf): a seed gives the same animal;
// the morphs come at their frequencies (the rare one about one in 50); the old are the oldest tenth; size by age with the range on top stays in its
// band; a kind builds no more variants than its budget; every moved param stays in its believable band and set 0 is the type; an old straightshell's
// tip is shed; each variant's def is derive's for its own spec; the morphs' palettes move what they say and leave the eyes; the ringmouths' shells
// take the place's chemistry; and a cell unloaded and loaded again shows the same animals. The whole bundle against the stub, as test/combat.js.
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
let js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n');
js+='\nglobal.__vy={placeOf,sample,FI,SPAWN,INSTAR,MORPH_PAT,regParam,indiv,variantOf,variantSpec,varKind,VAR_KINDS,VARIETY,VARIETY_CLADE,MORPHS,PARTS,PAL,PAL_FIXED,DEFS,SPECS,derive,palMorph,coatChem,rgb2hsl,creatures,chunkIJ,loadChunkNow,unloadChunk,player,choose,mulberry};';
const tmp=path.join(require('os').tmpdir(),'tethys_variety_'+process.pid+'.js');
fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
process.env.PICK='0';
require('./stub.js');require(tmp);fs.unlinkSync(tmp);
const X=global.__vy;let fails=0;
function check(ok,msg){if(!ok){fails++;console.error('  FAIL '+msg);}else console.log('  ok   '+msg);}
const N=5000,seedOf=s=>Math.imul(s,0x9E3779B1)>>>0;

console.log('the individual, drawn');
for(const kind of Object.keys(X.VARIETY)){const R=X.VARIETY[kind],V=X.varKind(kind),cnt=R.morphs.map(()=>0),ks=[];let old=0,same=true;
  for(let s=1;s<=N;s++){const a=X.indiv(kind,seedOf(s)),b=X.indiv(kind,seedOf(s));if(JSON.stringify(a)!==JSON.stringify(b))same=false;cnt[a.m]++;ks.push(a.k);if(a.o)old++;X.variantOf(kind,a);}
  ks.sort((a,b)=>a-b);const rare=cnt[cnt.length-1]/N,want=R.morphs[R.morphs.length-1][1],med=ks[N>>1],L=Math.log(X.INSTAR),mo=V.grow==='moult', // a moulter's band is in its steps, the nearest each side of the row's
    lo=(mo?Math.pow(X.INSTAR,Math.ceil(Math.log(R.size[0])/L-0.05)):R.size[0])*(1-V.range),hi=(mo?Math.pow(X.INSTAR,Math.floor(Math.log(R.size[1])/L+0.05)):R.size[1])*(1+V.range);
  check(same,kind+': a seed gives the same animal');
  check(Math.abs(rare-want)<want*0.5,kind+': its rare morph ('+R.morphs[R.morphs.length-1][0]+') at '+(rare*100).toFixed(1)+'% (asked '+(want*100).toFixed(0)+'%)');
  check(Math.abs(old/N-Math.max(0,1-R.old))<0.03,kind+': the old are '+(old/N*100).toFixed(1)+'% (past age rank '+R.old+')');
  check(Math.abs(med-1)<0.06&&ks[0]>=lo-1e-9&&ks[N-1]<=hi+1e-9,kind+': size median '+med.toFixed(2)+', '+ks[0].toFixed(2)+'–'+ks[N-1].toFixed(2)+' within '+lo.toFixed(2)+'–'+hi.toFixed(2));
  check(V.keys.size<=V.max,kind+': '+V.keys.size+' variants built, its budget '+V.max);}
const pl=X.VARIETY.plumb;
check(pl.size[1]===1.5,'the plumb\'s oldest are 1.5 of its type: 30 m against 20 (the person, 23 Nov 2026)');

console.log('the variants');
const placed=[...new Set(X.SPAWN.map(e=>e.kind))].filter(k=>X.SPECS[k]);
check(placed.every(k=>X.VARIETY[k]),'every placed species has a row ('+placed.length+')');
for(const k of ['darter','flicker','sifter','pall','cinder']){const V=X.varKind(k);check(V.row.morphs.length===1&&V.sets===1,k+' is uniform: one morph, one set');}
for(const kind of Object.keys(X.VARIETY)){const V=X.varKind(kind),T=X.SPECS[kind];let inBand=true,bad='';
  check(JSON.stringify(X.variantSpec(kind,0,0,false))===JSON.stringify(T),kind+': set 0, young, the type morph, is the type');
  for(let b=1;b<V.sets;b++){const sp=X.variantSpec(kind,0,b,false);for(const v of V.vary){const o=v[0]==='core'?sp.core:sp.parts.find(q=>q.kind===v[0]),ot=v[0]==='core'?T.core:T.parts.find(q=>q.kind===v[0]);if(!o)continue;
    if(v[1]==='prof'){if(Array.isArray(ot.prof))for(let n=0;n<ot.prof.length;n++){const r=o.prof[n][0]/ot.prof[n][0];if(ot.prof[n][0]&&Math.abs(r-1)>v[2]+1e-9){inBand=false;bad='prof';}}continue;}
    const P=X.regParam(v[0],T,v[1]),tv=typeof ot[v[1]]==='number'?ot[v[1]]:P&&typeof P.d==='number'?P.d:undefined,x=o[v[1]];if(tv===undefined)continue;const bd=P&&P.b;
    if(Math.abs(x/tv-1)>v[2]+1e-9||(bd&&(x<Math.min(bd[0],tv)-1e-9||x>Math.max(bd[1],tv)+1e-9))){inBand=false;bad=v[0]+'.'+v[1];}}}
  check(inBand,kind+': every moved param within its fraction and its believable band'+(bad?' ('+bad+')':''));
  for(const x of V.keys.values()){const q=x.key.replace('o','').split('.'),sp=X.variantSpec(kind,+q[0],+q[1],x.o),st=X.derive(sp),d0=X.DEFS[kind];
    if(Math.abs(x.def.top-st.speed)>1e-9||Math.abs(x.def.turn-st.turn)>1e-9||Math.abs(x.def.speed-+(st.speed*(d0.pace||1)).toFixed(2))>1e-9){check(false,kind+' '+x.key+': its def is derive\'s for its own spec');break;}}}
{const V=X.varKind('lurker'),m=V.row.morphs.findIndex(e=>e[0]==='spotted'),sp=X.variantSpec('lurker',m,0,false);check(sp.pattern&&sp.pattern.kind==='spots','a pattern morph wears its own pattern (the spotted lurker: '+(sp.pattern&&sp.pattern.kind)+')');}
for(const kind of Object.keys(X.VARIETY)){const V=X.varKind(kind);if(V.grow!=='moult')continue;const l=Math.log(X.INSTAR);let off=0;
  for(let s=1;s<=2000;s++){const k=X.indiv(kind,seedOf(s)).k,n=Math.round(Math.log(k)/l);if(Math.abs(Math.log(k)-n*l)>-Math.log(1-V.range)+1e-9)off++;}
  if(off){check(false,kind+': its sizes come in moult steps ('+off+' off a step)');}}
check(true,'every hingeshell\'s sizes come in moult steps of '+X.INSTAR+', within its range');
{const sp=X.variantSpec('plumb',0,0,true),sh=sp.parts.find(p=>p.kind==='shell'),T=X.SPECS.plumb,tsh=T.parts.find(p=>p.kind==='shell');
  check(Math.abs(sh.L-tsh.L*pl.oldShell.L)<1e-9&&sp.hit[0].a[2]>T.hit[0].a[2],'an old plumb\'s tip is shed: its shell '+sh.L.toFixed(2)+' m of '+tsh.L+', its shell\'s capsule shortened with it');}

console.log('the place (v11.226.1: a morph\'s odds follow what the animal is seen against)');
{const share=(kind,name,P)=>{const R=X.VARIETY[kind],mi=R.morphs.findIndex(e=>e[0]===name);let n=0;for(let s=1;s<=N;s++)if(X.indiv(kind,seedOf(s),P).m===mi)n++;return n/N;};
  const bright={dark:0.05,lit:1,rock:0.05,sand:0.95,floor:1,vent:0,nut:0.5},dark={dark:0.95,lit:0,rock:0.9,sand:0.1,floor:1,vent:0,nut:0.5},open={dark:0.85,lit:0.3,rock:0,sand:0,floor:0,vent:0,nut:0.5};
  const gb=share('grazer','melanic',bright),gd=share('grazer','melanic',dark),g0=share('grazer','melanic',null);
  check(gb<0.04&&gd>0.25,'the grazer\'s dark morph: '+(gb*100).toFixed(1)+'% on the bright dunes, '+(gd*100).toFixed(1)+'% in a dark place ('+(g0*100).toFixed(1)+'% as written)');
  const lb=share('grazer','leucistic',bright),ld=share('grazer','leucistic',dark);check(lb>0.01&&lb<0.035&&ld>0.01&&ld<0.035,'its pale one follows nothing: '+(lb*100).toFixed(1)+'% and '+(ld*100).toFixed(1)+'%');
  const ro=share('ridge','melanic',open),r0=share('ridge','melanic',null);const rb=share('ridge','melanic',bright);check(ro>0.35&&rb<0.08,'the black ridge: '+(ro*100).toFixed(1)+'% over the open ocean, '+(rb*100).toFixed(1)+'% in bright water ('+(r0*100).toFixed(1)+'% as written)');
  const sl=share('scuttle','erythristic',bright),sd=share('scuttle','erythristic',dark);check(sl>sd*3,'the scuttle\'s red (a shore diet) follows the lit water: '+(sl*100).toFixed(1)+'% against '+(sd*100).toFixed(1)+'% in the dark');
  const fake={h:(x,z)=>X.sample(x,z).h,f:(x,z)=>X.sample(x,z).f};let sh=null,dp=null;
  for(let r=200;r<30000&&!(sh&&dp);r+=97)for(let a=0;a<24&&!(sh&&dp);a++){const x=Math.cos(a/24*6.283)*r,z=Math.sin(a/24*6.283)*r,q=X.sample(x,z);if(!sh&&q.h<-8&&q.h>-25&&q.f[X.FI.sub]<0.3)sh={x:x,y:q.h+2,z:z};if(!dp&&q.h<-500)dp={x:x,y:-300,z:z};}
  const ps=X.placeOf(fake,sh),pd=X.placeOf(fake,dp);
  check(ps.dark<0.3&&ps.lit>0.6&&pd.dark>0.7&&pd.lit===0,'read off the ground: the shallow sand '+ps.dark.toFixed(2)+' dark, '+ps.lit.toFixed(2)+' lit; mid-water over the deep '+pd.dark.toFixed(2)+' dark');}

console.log('the palettes');
{const P=X.PAL.plumb,L=X.palMorph(P,X.MORPHS.leucistic),M=X.palMorph(P,X.MORPHS.melanic),l=c=>X.rgb2hsl(c)[2];
  check(l(L.shell)>l(P.shell)&&l(M.shell)<l(P.shell)&&l(M.flesh)<l(P.flesh),'the pale morph is paler, the dark one darker, shell and flesh');
  check(JSON.stringify(L.eye)===JSON.stringify(P.eye)&&JSON.stringify(M.pupil)===JSON.stringify(P.pupil),'and the eyes are the eyes');
  const E=X.palMorph(X.PAL.ortho,X.MORPHS.erythristic),h=X.rgb2hsl(E.shell)[0];
  check((h<40||h>330)&&JSON.stringify(E.flesh)===JSON.stringify(X.PAL.ortho.flesh),'the red morph reddens the shell (hue '+h.toFixed(0)+'°) and leaves the flesh to the blood');
  const C=X.coatChem(X.PAL.rasp,'rust','ringmouths');
  check(JSON.stringify(C.shell)!==JSON.stringify(X.PAL.rasp.shell)&&JSON.stringify(C.flesh)===JSON.stringify(X.PAL.rasp.flesh),'a ringmouth\'s shell takes the place\'s chemistry (rust), its flesh does not');}

console.log('stable in the world');
{X.choose(1);X.player.pos.set(1e4,-30,1e4);const i=118,j=118;
  const take=()=>{X.loadChunkNow(i,j);const ch=X.chunkIJ(i,j);return ch.creatures.filter(c=>X.VARIETY[c.kind]&&c.seed!==undefined).map(c=>c.kind+' '+c.seed+' '+c.vk+' '+c.g.scale.x.toFixed(4)).sort();};
  const a=take();X.unloadChunk(X.chunkIJ(i,j));const b=take();
  check(a.length>0,'the busiest wall near the centre has individuals ('+a.length+': '+a.slice(0,3).join(', ')+(a.length>3?'…':'')+')');
  check(JSON.stringify(a)===JSON.stringify(b),'and shows the same ones when it loads again');}

if(fails){console.error('variety: '+fails+' FAILED');process.exit(1);}console.log('variety: ok');
