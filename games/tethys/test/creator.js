// The creator as the player sees it (v11.248, creator.js): the lab with its words taken away. Headless, against the stub's DOM: for every species
// of SPECS and every clade's blank, opened in the creator with everything seen, the overlay is drawn without a throw — one picture tile a part kind
// of the clade in its standard style (v11.250, CRT_STD), the same column for every body of a clade, each dropped on each body and built, the bar's icons, the coat swatches, the
// name — and nothing but the name is a word on the screen (every other word is a tooltip). The undo and redo walk back and forth to the very spec;
// the conception's window shows its budget bar and the lay and decline icons. The drag onto the body and off it is the browser's (raycasts): looked
// at, not tested here.
//   node test/creator.js
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
let js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n');
js+='\nglobal.__cr={lab,labEnter,labLeave,labLoad,labBuild,labUndo,labRedo,labUndoPush,labStyles,crtEl,crtRender,CRT,CRT_STD,crtKinds,crtCan,crtSpecOf,crtAdd,stylesFor,validate,compile,PROFILE,SPECS,SPEC_BLANK,PARTS,spineOf,spineSize,setMode:m=>{mode=m;}};';
const tmp=path.join(require('os').tmpdir(),'tethys_creator_'+process.pid+'.js');
fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
process.env.PICK='0';
const log=console.log,warn=console.warn;console.log=()=>{};console.warn=()=>{};
require('./stub.js');require('./geo.js')(global.THREE);require(tmp);
console.log=log;console.warn=warn;
const X=global.__cr,bad=[],fail=(...a)=>bad.push(a.join(' '));
// everything seen, as a profile that has met every species
for(const id in X.SPECS){const sp=X.SPECS[id],S=X.PROFILE.seen;if(S.sp.indexOf(id)<0)S.sp.push(id);if(S.cl.indexOf(sp.clade)<0)S.cl.push(sp.clade);if(S.co.indexOf(sp.core.kind)<0)S.co.push(sp.core.kind);
  for(const p of sp.parts){const v=p.kind+':'+(p.style||X.PARTS[p.kind].styles[0]);if(S.pt.indexOf(v)<0)S.pt.push(v);}}
X.setMode('menu');X.labEnter(X.SPECS.fin,true);
if(!X.lab.player)fail('the creator did not open as the player\'s');
const words=h=>h.replace(/<input[^>]*>/g,'').replace(/title="[^"]*"/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(); // what the screen says: the markup's text, the name's field and the tooltips aside
let n=0,tiles=0;const cols={};
// the standard styles: one for every kind a clade's cores take, each a style of that clade
for(const cl in X.CRT_STD)for(const k of Object.keys(X.PARTS)){const st=X.stylesFor(k,cl),d=X.CRT_STD[cl][k];if(st.length&&!d)fail(cl,'no standard '+k);if(d&&st.indexOf(d)<0)fail(cl,'the standard '+k+' '+d+' is not the clade\'s');
  if(d){try{const b=X.compile(X.crtSpecOf(k,d,cl),1,undefined,{split:true});if(!b.built[0]||!b.built[0].meshes||!b.built[0].meshes.length)fail(cl,'the picture of '+k+' has no mesh');}catch(e){fail(cl,'the picture of '+k+' threw: '+e.message);}}}
const all=Object.keys(X.SPECS).map(k=>X.SPECS[k]).concat(Object.keys(X.SPEC_BLANK).map(k=>X.SPEC_BLANK[k]));
for(const sp of all){
  try{X.labLoad(sp);X.crtRender();}catch(e){fail(sp.id,sp.clade,'the overlay threw: '+e.message);continue;}
  const h=X.crtEl.innerHTML||'',v=X.lab.v;
  // one tile a part (v11.250): every kind the clade has, once, dropping the clade's standard style; and the column the same for every body of the clade
  const col=(h.split('<div id="crt-parts">')[1]||'').split('<div id="crt-top">')[0].replace(/ src="[^"]*"/g,'');
  if(cols[v.clade]===undefined)cols[v.clade]=col;else if(cols[v.clade]!==col)fail(sp.id,'the parts column differs from the '+v.clade+"' first body's");
  for(const kind of X.crtKinds(v.clade)){tiles++;const m=h.split('data-kind="'+kind+'"').length-1;if(m!==1)fail(sp.id,m+' tiles for '+kind);if(h.indexOf('data-kind="'+kind+'" data-style="'+X.CRT_STD[v.clade][kind]+'"')<0)fail(sp.id,kind+' is not its standard style');
    const t=JSON.parse(JSON.stringify(sp));if(!X.crtCan(t,kind,X.CRT_STD[v.clade][kind]))continue;X.crtAdd(t,kind,X.CRT_STD[v.clade][kind],0); // the tile dropped on this body builds
    try{X.labLoad(t);if(!X.lab.b)fail(sp.id,'with '+kind+' added it does not build');}catch(e){fail(sp.id,'with '+kind+' added the lab threw: '+e.message);}}
  for(const a of ['undo','redo','turn','swim','act','new','keep','done'])if(h.indexOf('data-crt="'+a+'"')<0)fail(sp.id,'no '+a+' icon');
  if(h.indexOf('id="crt-name"')<0)fail(sp.id,'no name');
  if(h.indexOf('data-coat="')<0)fail(sp.id,'no coat swatch');
  const w=words(h);if(w)fail(sp.id,'words on the screen: "'+w.slice(0,80)+'"');
  n++;}
// undo and redo: back and forth to the very spec
{X.labLoad(X.SPECS.sickle);const a=JSON.stringify(X.lab.spec);X.labUndoPush();const S=X.spineOf(X.lab.spec);X.spineSize(X.lab.spec,S.H.findIndex(h=>h.role==='k'),1.4,1.4);X.labBuild();const b=JSON.stringify(X.lab.spec);
  X.labUndo();if(JSON.stringify(X.lab.spec)!==a)fail('sickle','undo is not the spec before');X.labRedo();if(JSON.stringify(X.lab.spec)!==b)fail('sickle','redo is not the spec after');}
// the conception's window: the budget bar, lay and decline
{X.lab.conceive={parent:JSON.parse(JSON.stringify(X.SPECS.fin)),gen:2,budget:4.5,at:null,price:null};X.labLoad(X.SPECS.fin);X.crtRender();const h=X.crtEl.innerHTML||'';
  if(h.indexOf('class="budget')<0)fail('conception','no budget bar');if(h.indexOf('data-crt="close"')<0||h.indexOf('data-crt="done"')<0)fail('conception','no lay and decline');if(h.indexOf('data-crt="new"')>=0)fail('conception','a child cannot start from another species');
  X.lab.conceive=null;}
X.labLeave();if(X.lab.player)fail('the creator left as the player\'s');
console.log('creator: '+n+' bodies in the creator, '+tiles+' part tiles (one a part, the same column through each clade, each dropped and built), the icons, the coats and the name on each; undo and redo; the conception\'s bar');
if(bad.length){console.log('CREATOR FAILED '+bad.length+'\n  '+bad.slice(0,30).join('\n  '));process.exit(1);}
console.log('OK');
