// test/variety.js — the individual (v11.225; VARIETY.md; creatures_defs.js VARIETY, creatures_ai.js indiv/variantOf): a seed gives the same animal;
// the morphs come at their frequencies (the rare one about one in 50); the old are the oldest tenth; size by age with the range on top stays in its
// band; a kind builds no more variants than its budget; every moved param stays in its believable band and set 0 is the type; an old straightshell's
// tip is shed; each variant's def is derive's for its own spec; the morphs' palettes move what they say and leave the eyes; the ringmouths' shells
// take the place's chemistry; and a cell unloaded and loaded again shows the same animals. The whole bundle against the stub, as test/combat.js.
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
let js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n');
js+='\nglobal.__vy={indiv,variantOf,variantSpec,varKind,VAR_KINDS,VARIETY,VARIETY_CLADE,MORPHS,PARTS,PAL,PAL_FIXED,DEFS,SPECS,derive,palMorph,coatChem,rgb2hsl,creatures,chunkIJ,loadChunkNow,unloadChunk,player,choose,mulberry};';
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
  ks.sort((a,b)=>a-b);const rare=cnt[cnt.length-1]/N,want=R.morphs[R.morphs.length-1][1],med=ks[N>>1],lo=R.size[0]*(1-V.range),hi=R.size[1]*(1+V.range);
  check(same,kind+': a seed gives the same animal');
  check(Math.abs(rare-want)<want*0.5,kind+': its rare morph ('+R.morphs[R.morphs.length-1][0]+') at '+(rare*100).toFixed(1)+'% (asked '+(want*100).toFixed(0)+'%)');
  check(Math.abs(old/N-(1-R.old))<0.03,kind+': the old are '+(old/N*100).toFixed(1)+'% (past age rank '+R.old+')');
  check(Math.abs(med-1)<0.06&&ks[0]>=lo-1e-9&&ks[N-1]<=hi+1e-9,kind+': size median '+med.toFixed(2)+', '+ks[0].toFixed(2)+'–'+ks[N-1].toFixed(2)+' within '+lo.toFixed(2)+'–'+hi.toFixed(2));
  check(V.keys.size<=V.max,kind+': '+V.keys.size+' variants built, its budget '+V.max);}
const pl=X.VARIETY.plumb;
check(pl.size[1]===1.5,'the plumb\'s oldest are 1.5 of its type: 30 m against 20 (the person, 23 Nov 2026)');

console.log('the variants');
for(const kind of Object.keys(X.VARIETY)){const R=X.VARIETY[kind],T=X.SPECS[kind];let inBand=true;
  check(JSON.stringify(X.variantSpec(kind,0,false))===JSON.stringify(T),kind+': set 0, young, is the type');
  for(let b=1;b<X.varKind(kind).sets;b++){const sp=X.variantSpec(kind,b,false);for(const v of R.vary){const p=sp.parts.find(q=>q.kind===v[0]),t=T.parts.find(q=>q.kind===v[0]);if(!p||typeof t[v[1]]!=='number')continue;const P=X.PARTS[v[0]].params[v[1]],bd=P&&P.b,x=p[v[1]],tv=t[v[1]];
    if(Math.abs(x/tv-1)>v[2]+1e-9||(bd&&(x<Math.min(bd[0],tv)-1e-9||x>Math.max(bd[1],tv)+1e-9)))inBand=false;}}
  check(inBand,kind+': every moved param within its fraction and its believable band');
  for(const x of X.varKind(kind).keys.values()){const sp=X.variantSpec(kind,+x.key.split('.')[1].replace('o',''),x.o),st=X.derive(sp),d0=X.DEFS[kind];
    if(Math.abs(x.def.top-st.speed)>1e-9||Math.abs(x.def.turn-st.turn)>1e-9||Math.abs(x.def.speed-+(st.speed*(d0.pace||1)).toFixed(2))>1e-9){check(false,kind+' '+x.key+': its def is derive\'s for its own spec');break;}}}
{const sp=X.variantSpec('plumb',0,true),sh=sp.parts.find(p=>p.kind==='shell'),T=X.SPECS.plumb,tsh=T.parts.find(p=>p.kind==='shell');
  check(Math.abs(sh.L-tsh.L*pl.oldShell.L)<1e-9&&sp.hit[0].a[2]>T.hit[0].a[2],'an old plumb\'s tip is shed: its shell '+sh.L.toFixed(2)+' m of '+tsh.L+', its shell\'s capsule shortened with it');}

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
