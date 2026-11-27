// The creator as the player sees it (v11.248, creator.js): the lab with its words taken away. Headless, against the stub's DOM: for every species
// of SPECS and every clade's blank, opened in the creator with everything seen, the overlay is drawn without a throw — a picture tile for every
// part style the lab would offer on that core (the palette is the add list), each kind once as a group, the bar's icons, the coat swatches, the
// name — and nothing but the name is a word on the screen (every other word is a tooltip). The undo and redo walk back and forth to the very spec;
// the conception's window shows its budget bar and the lay and decline icons. The drag onto the body and off it is the browser's (raycasts): looked
// at, not tested here.
//   node test/creator.js
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
let js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n');
js+='\nglobal.__cr={lab,labEnter,labLeave,labLoad,labBuild,labUndo,labRedo,labUndoPush,labStyles,crtEl,crtRender,CRT,PROFILE,SPECS,SPEC_BLANK,PARTS,spineOf,spineSize,setMode:m=>{mode=m;}};';
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
let n=0,tiles=0;
const all=Object.keys(X.SPECS).map(k=>X.SPECS[k]).concat(Object.keys(X.SPEC_BLANK).map(k=>X.SPEC_BLANK[k]));
for(const sp of all){
  try{X.labLoad(sp);X.crtRender();}catch(e){fail(sp.id,sp.clade,'the overlay threw: '+e.message);continue;}
  const h=X.crtEl.innerHTML||'',v=X.lab.v;
  for(const kind of Object.keys(X.PARTS))for(const style of X.labStyles(kind,v.clade,undefined,v.core.kind)){tiles++;if(h.indexOf('data-kind="'+kind+'" data-style="'+style+'"')<0)fail(sp.id,'no tile for '+kind+':'+style);}
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
console.log('creator: '+n+' bodies in the creator, '+tiles+' part tiles, the icons, the coats and the name on each; undo and redo; the conception\'s bar');
if(bad.length){console.log('CREATOR FAILED '+bad.length+'\n  '+bad.slice(0,30).join('\n  '));process.exit(1);}
console.log('OK');
