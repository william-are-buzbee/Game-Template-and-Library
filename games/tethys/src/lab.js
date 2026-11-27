// lab.js — the creature lab (CREATOR.md, v11.10–11.11): a spec (creatures_spec.js) edited live, shown the way the bestiary shows a
// species — at the peak, in the game's own light and water, the arms simulated — with its derived numbers beside it. Open with #lab
// in the URL (#lab=<base64 spec> opens a saved creature), l on the menu, l in the bestiary on a species that has a spec, or l in
// play (the world waits beside you; l again puts you back).
// The panel: a nav that follows the scroll (click to jump); the species (a roster spec or a clade's blank), the core and its
// numbers, the parts (each a fold: click its name; the cursor on a part lights it on the creature; add and remove; only the
// styles the clade has), the coat (the roster's palettes, a coat drawn by chemistry — coatFor — or every key by hand), the readout
// (derive: a lock beside a stat holds a hand value over the derived one, the plausibility warnings, tris and draws) and the save
// row (the JSON to the clipboard, a paste box, the link, the export lines for creatures_defs.js). Keys as the zoo's: space for the
// action, s to cruise, r to spin or stop, drag turns (and stops the spin), wheel zooms; p places the creature in the world (a
// temporary species, DEFS.lab); l or escape back to where you came from.
// The creator (v11.47): the same panel opened from the menu's `creator` word (menu.js) with lab.player set — only the species, clades,
// cores and part styles the profile has seen are offered (save.js PROFILE.seen; labOk, labStyles) — and a `saved creatures` list in the
// save section (the profile's, with a file out and in), shown in every mode. Opening the lab at all grants the creator (grantCreator).
const labEl = document.getElementById('lab'),
  labPanel = document.getElementById('labpanel'),
  labCap = document.getElementById('labcap');
const lab = {
  spec: null,
  b: null,
  v: null,
  warn: [],
  d: null,
  yaw: 1.15, // v11.246: from the side, where the body's spine is drawn and dragged (0.6 to v11.245: from the front)
  pitch: 0.22,
  dist: 10,
  spin: false, // v11.246: still, as an editor is (r spins it)
  drag: null,
  act: -1,
  cruise: false,
  radius: 2,
  o: V3(0, 0, 0),
  floor: false,
  pend: false,
  placed: 0,
  from: 'menu',
  open: {},
  hi: -1,
  sec: 'species',
  at: 0, // the body's clock (v11.246): stops while the cursor is on a knot or a part
  conceive: null, // the editor at conception (v11.72, line.js conceiveOpen): {parent, gen, budget, at, price} while the window is open over a laying
  player: false // the creator (v11.47): opened from the menu's `creator` word; only the species, clades, cores and part styles the profile has seen are offered (save.js PROFILE.seen, labOk)
};
function labOk(k,v){return !lab.player||seen(k,v);} // k: 'sp' | 'cl' | 'co' | 'pt'
function labStyles(kind,clade,cur,core){const st=stylesFor(kind,clade,core);return lab.player?st.filter(s=>s===cur||seen('pt',kind+':'+s)):st;} // the styles offered for a part: all of the clade's that stand on the core (v11.70), or in the creator the seen ones (and the one it wears)
const LAB_CLADES = ['ringmouths', 'slowbloods', 'hingeshells', 'drifters'],
  LAB_SECS = ['species', 'core', 'parts', 'coat', 'readout', 'save'];
const MAT_HI = addTint(new THREE.MeshLambertMaterial({vertexColors: true, emissive: new THREE.Color(0.55, 0.32, 0.08)}), 'lam', true, undefined, undefined, 'body'); // the part under the cursor
function labClone(o) {
  return JSON.parse(JSON.stringify(o));
}
// ---------- the creature ----------
function labBuild() {
  if (lab.b) {
    scene.remove(lab.b.g);
    lab.b.g.traverse(o => {
      if (o.geometry) o.geometry.dispose();
    });
    lab.b = null;
  }
  const v = validate(lab.spec);
  lab.v = v.spec;
  lab.warn = v.warnings;
  let b;
  try {
    b = compile(lab.v, undefined, undefined, {split: true});
  } catch (e) { // v11.70: a coat without a colour this core or part reads (a jetter's on a sac, a shell under it) throws in merge — once more with the coat filled from the clade's (coatFill); it is the spec's from there, every key a swatch
    for(const all of [false,true]){if(b)break;try{const coat=coatFill(lab.v.coat,lab.v.clade,all);b=compile(Object.assign({},lab.v,{coat:coat}),undefined,undefined,{split:true});lab.v.coat=coat;lab.spec.coat=labClone(coat);lab.note="the coat had no colour for that: filled from the clade's";}catch(e1){b=null;}}
    if(!b){labCap.innerHTML = '<i>the build failed: ' + String(e.message).replace(/</g, '&lt;') + '</i>';
    return;}
  }
  b.owner = {b: b, pos: b.g.position, grab: null, reach: 0, shapesW: null};
  const size = lab.v.size || 2,
    floor = !!(lab.v.behaviour && lab.v.behaviour.floor);
  lab.floor = floor;
  if (lab.from === 'play') {
    lab.o.y = Math.max(groundAt(lab.o.x, lab.o.z) + size * 0.4, Math.min(lab.o.y, TIDE - 1 - size * 0.4));
  } else {
    lab.o.set(0, floor ? floor0 + size * 0.35 : clamp(floor0 + 4.5 + size * 0.5, floor0 + 3, TIDE - 2 - size * 0.4), 0);
  }
  b.g.position.copy(lab.o);
  castOn(b.g);
  scene.add(b.g);
  lab.b = b;
  lab.radius = Math.max(0.6, zooRadius(b.g));
  if (lab.pend) {
    lab.dist = Math.max(4, lab.radius * 2.0 + 1.5);
    lab.pend = false;
  }
  lab.d = derive(lab.v);
  let tris = 0,
    draws = 0;
  b.g.traverse(o => {
    if (o.isMesh && o.geometry.attributes.position) {
      tris += o.geometry.attributes.position.count / 3;
      draws++;
    }
  });
  lab.d.tris = Math.round(tris);
  lab.d.draws = draws;
  if (lab.hi >= 0) labHi(lab.hi, true);
  labCaption();
  labReadout();
  labSpineDraw(); // the knots on the body (v11.246)
  crtUpdate(); // the creator's bars and budget (v11.248)
}
// light the part under the cursor: its meshes swap to the lit material (the arms' chains too)
function labHi(i, force) {
  if (!force && i === lab.hi) return;
  if (lab.b && lab.b.built) {
    const set = (j, m) => {
      const r = lab.b.built[j];
      if (!r || !r.meshes) return;
      for (const o of r.meshes)
        o.traverse(x => {
          if (x.isMesh && (x.material === MAT || x.material === MAT_HI)) x.material = m;
        });
    };
    if (lab.hi >= 0 && lab.hi !== i) set(lab.hi, MAT);
    if (i >= 0) set(i, MAT_HI);
  }
  lab.hi = i;
}
function labCaption() {
  const s = lab.v,
    d = lab.d;
  if (!s || !d) return;
  labCap.innerHTML =
    '<div id="labname">' +
    (s.id || 'new') +
    '</div><div id="labline">' +
    s.clade +
    ' · ' +
    d.mode +
    ' · ' +
    d.length +
    ' m long · ' +
    d.mass +
    ' t' +
    '<br>speed ' +
    d.speed +
    ' · turn ' +
    d.turn +
    ' · ' +
    d.cost +
    ' points' +
    (d.form > 1 ? '<br>drag ×' + d.form.toFixed(2) + ' from its shape: ' + d.formWhy : '') + // v11.247: what the outline costs, and why
    (d.plausible.length ? '<br><i>' + d.plausible.join(' · ') + '</i>' : '') +
    (lab.note ? '<br><i>' + lab.note + '</i>' : '') + // what the lab did to the spec on its own (v11.70: a coat filled, parts a new core cannot carry removed); until the next load

    '</div>';
}
// ---------- the panel ----------
function labSel(path, opts, val, labels) {
  return (
    '<select data-path="' +
    path +
    '">' +
    opts.map((o, i) => '<option value="' + o + '"' + (o === val ? ' selected' : '') + '>' + (labels ? labels[i] : o) + '</option>').join('') +
    '</select>'
  );
}
function labNum(path, val, step, lo, hi) {
  return (
    '<input type="number" data-path="' +
    path +
    '" value="' +
    (+val).toFixed(step < 0.01 ? 3 : step < 1 ? 2 : 0) +
    '" step="' +
    step +
    '"' +
    (lo !== undefined ? ' min="' + lo + '"' : '') +
    (hi !== undefined ? ' max="' + hi + '"' : '') +
    '>'
  );
}
// A control's name, unit and range are the registry's (creatures_spec.js paramOf, v11.70): LAB_NAME, LAB_NAME_BY and LAB_UNIT lived here to
// v11.69, the name a file away from the range it named, so a control could have one without the other
function labSlider(path,owner,key,p,F){
  const q=paramOf(owner,key,p,F),label=q.label,val=q.val;
  if(q.k==='b')return '<label class="row"><span>'+label+'</span><input type="checkbox" data-path="'+path+'"'+(val?' checked':'')+'></label>';
  if(q.k==='s')return '<label class="row"><span>'+label+'</span>'+labSel(path,q.opts,val)+'</label>';
  if(q.k==='l')return '';
  const v=+val,step=q.k==='n'?1:(q.hi-q.lo)/200,out=v<q.b0||v>q.b1;
  return '<label class="row'+(out?' out':'')+'" title="'+(out?'past the believable band ':'believable ')+q.b0.toFixed(2)+' – '+q.b1.toFixed(2)+'"><span>'+label+'</span><input type="range" data-path="'+path+'" min="'+q.lo+'" max="'+q.hi+'" step="'+step+'" value="'+v+'"><b>'+(q.k==='n'?v:v.toFixed(2))+(q.unit?'<i>'+q.unit+'</i>':'')+'</b></label>';
}
function labProfile(path, prof) {
  let h = '<div class="prof">';
  prof.forEach((p, i) => {
    h +=
      '<div class="row pt"><span>' +
      i +
      '</span>r ' +
      labNum(path + '.' + i + '.0', p[0], 0.01, 0) +
      ' z ' +
      labNum(path + '.' + i + '.1', p[1], 0.01) +
      '<button data-act="delpt" data-path="' +
      path +
      '" data-i="' +
      i +
      '">×</button></div>';
  });
  return h + '<button data-act="addpt" data-path="' + path + '">+ point</button></div>';
}
// a snapped part's y (or z, for a mouth on the face) is the body's to give: the slider is hidden
function labHidden(p, k) {
  if (p.kind === 'mouth') return p.where === 'under' ? k === 'y' : k === 'z';
  if (p.kind === 'eyes') return k === 'y' && p.style !== 'crown';
  return k === 'y';
}
function labIsReq(p, gr, core) {
  const def = PARTS[p.kind];
  return !!(
    def.req ||
    gr.req.some(r => r.split(':')[0] === p.kind && (!r.split(':')[1] || r.split(':')[1] === p.style)) ||
    (core.req || []).indexOf(p.kind) >= 0
  );
}
function labPanelHTML() {
  const s = lab.v,
    d = lab.d,
    F = compileFrame(s),
    core = CORES[s.core.kind],
    gr = GRAMMAR[s.clade];
  let h =
    (lab.conceive ? conceiveHTML() : '') + // the conception's bill, over everything (line.js, v11.72); not a .sec — labReadout counts those
    '<div class="nav">' + LAB_SECS.map(k => '<a data-go="' + k + '"' + (k === lab.sec ? ' class="on"' : '') + '>' + k + '</a>').join('') + '</div>';
  h += '<div class="sec" id="lab-species"><div class="hd">species</div>';
  if (!lab.conceive) // at conception the body is the parent's: nothing else is loaded, and a child never changes clade (LINEAGE §12.8)
  h +=
    '<label class="row"><span>from</span><select data-act="load"><option value="">—</option>' +
    LAB_CLADES.filter(c => labOk('cl', c)).map(c => '<option value="new:' + c + '">new ' + c.replace(/s$/, '') + '</option>').join('') +
    Object.keys(SPECS).filter(k => labOk('sp', k))
      .map(k => '<option value="' + k + '">' + k + ' (' + SPECS[k].clade + ')</option>')
      .join('') +
    '</select></label>';
  h += '<label class="row"><span>name</span><input type="text" data-path="id" value="' + (s.id || '') + '"></label>';
  h += '<label class="row"><span>clade</span><span class="v">' + s.clade + '</span></label>';
  h += '<label class="row"><span>half-length</span>' + labNum('size', s.size, 0.1, 0.1, SPEC_SIZE_MAX) + '<b>m</b></label>';
  h += '<label class="row"><span>scale</span>' + labNum('s', s.s || 1, 0.05, 0.1, SPEC_SCALE_MAX) + '</label>';
  h += '<label class="row"><span>depth</span>' + labNum('depth', s.depth !== undefined ? s.depth : -30, 5, -800, 0) + '<b>m</b></label>';
  h +=
    '<label class="row"><span>on the floor</span><input type="checkbox" data-path="behaviour.floor"' +
    (s.behaviour && s.behaviour.floor ? ' checked' : '') +
    '></label>';
  h +=
    '<label class="row"><span>spin</span><input type="checkbox" data-act="spin"' +
    (lab.spin ? ' checked' : '') +
    '><i class="dim">r</i></label></div>';
  // the core
  h +=
    '<div class="sec" id="lab-core"><div class="hd">core</div><label class="row"><span>kind</span>' +
    labSel('core.kind', gr.cores.filter(c => c === s.core.kind || labOk('co', c)), s.core.kind) +
    '</label>';
  const over = spineOver(s.core); // v11.246: the numbers the spine's knots stand in for are its, not a slider's
  h += '<label class="row"><span>the spine</span><input type="checkbox" data-act="spine"' + (LAB_SP.on ? ' checked' : '') + '><i class="dim">on the body</i></label>';
  if (LAB_SP.on && SPINE[s.core.kind]) h += '<div class="note">the knots show with the cursor on the body · drag a knot to move it · wheel on it to fatten (shift: height, alt: width) · double-click the body to add a knot, a knot to take it out · drag or wheel a part · ctrl+z undoes</div>';
  const byHand = lab.player && !!SPINE[s.core.kind]; // v11.246.1 (the person: "hide the sliders"): the creator shapes the body by hand only; the dev lab keeps them
  if (!byHand) for (const k in core.params) if (over.indexOf(k) < 0) h += labSlider('core.' + k, s.core.kind, k, s.core, F);
  h +=
    '<label class="row"><span>beat</span>' +
    labNum('core.beat.0', (s.core.beat || [1.5, 0.9])[0], 0.1, 0.1, 12) +
    ' + ' +
    labNum('core.beat.1', (s.core.beat || [1.5, 0.9])[1], 0.05, 0, 4) +
    '<b>× spd</b></label>';
  if (!byHand && (s.core.kind === 'lathe' || (s.core.kind === 'sac' && s.core.shape === 'lathe' && s.core.prof)))
    h += '<div class="hd2">profile, tail to nose [r, z]</div>' + labProfile('core.prof', s.core.prof);
  h += '</div>';
  // the parts: a fold each; only the clade's styles
  h += '<div class="sec" id="lab-parts"><div class="hd">parts <span class="v">' + d.cost + ' points</span></div>';
  s.parts.forEach((p, i) => {
    const def = PARTS[p.kind];
    if (!def) return;
    const req = labIsReq(p, gr, core),
      styles = labStyles(p.kind, s.clade, p.style, s.core.kind),
      open = lab.open[i] !== false;
    h +=
      '<div class="part' +
      (open ? ' open' : '') +
      '" data-part="' +
      i +
      '"><div class="ph" data-act="fold" data-i="' +
      i +
      '"><span>' +
      (open ? '▾' : '▸') +
      ' ' +
      p.kind +
      '</span>' +
      (styles.length > 1 ? labSel('parts.' + i + '.style', styles, p.style) : '<i>' + p.style + '</i>') +
      (req ? '<i>required</i>' : '<button data-act="del" data-i="' + i + '" title="remove">×</button>') +
      '</div>';
    if (open) {
      h += '<div class="pb">';
      for (const k of paramsFor(p.kind, p.style)) {
        if (k === 'prof' || k === 'pairs' || k === 'rr') continue;
        if (p.snap && labHidden(p, k)) continue;
        h += labSlider('parts.' + i + '.' + k, p.kind, k, p, F);
      }
      if (p.prof) h += '<div class="hd2">profile</div>' + labProfile('parts.' + i + '.prof', p.prof);
      h += '</div>';
    }
    h += '</div>';
  });
  const kinds = Object.keys(PARTS).filter(k => labStyles(k, s.clade, undefined, s.core.kind).length > 0); // a kind is offered when one of its styles is the clade's and stands on this core (v11.70: every kind has a style since the registry, so the no-style branch went)
  h +=
    '<label class="row"><span>add</span><select data-act="add"><option value="">—</option>' +
    kinds.map(k => '<option value="' + k + '">' + k + ' (' + labStyles(k, s.clade, undefined, s.core.kind).join(', ') + ')</option>').join('') +
    '</select></label></div>';
  // the coat
  const pal = typeof s.coat === 'string' ? PAL[s.coat] : s.coat,
    palKeys = Object.keys(PAL).filter(k => Array.isArray(PAL[k].top || PAL[k].mantle || PAL[k].shell || PAL[k].bell || PAL[k].float));
  h +=
    '<div class="sec" id="lab-coat"><div class="hd">coat</div><label class="row"><span>palette</span><select data-act="coat"><option value="">by hand</option>' +
    palKeys.map(k => '<option value="' + k + '"' + (s.coat === k ? ' selected' : '') + '>' + k + '</option>').join('') +
    '</select></label>';
  h +=
    '<label class="row"><span>drawn at</span>' +
    labNum('_depth', lab.coatDepth !== undefined ? lab.coatDepth : s.depth !== undefined ? s.depth : -30, 10, -800, 0) +
    '<b>m</b></label>';
  h +=
    '<label class="row"><span>diet</span><select data-act="diet">' +
    Object.keys(COAT_DIET)
      .map(k => '<option value="' + k + '"' + (lab.diet === k ? ' selected' : '') + '>' + k + '</option>')
      .join('') +
    '</select><button data-act="draw">draw a coat</button></label>';
  { // the texel pattern (v11.41, PIXEL.md pass B): by clade unless the spec says; drawn in pixel mode only; custom (painted cell by cell) is pass D
    const pt=Object.assign({kind:PATTERN_BY_CLADE[s.clade]||'none'},PATTERN_DEF,s.pattern||{});
    h+='<label class="row"><span>pattern</span>'+labSel('pattern.kind',PATTERNS,pt.kind)+'</label><label class="row"><span>period</span>'+labNum('pattern.scale',pt.scale,1,1,12)+'<b>cells</b></label><label class="row"><span>tone</span>'+labNum('pattern.tone',pt.tone,0.02,0,0.5)+'</label>';
    if(!FX.texels)h+='<div class="note">the pattern draws with texels on (e)</div>';
  }
  if (pal && pal.note) h += '<div class="note">' + pal.note + '</div>';
  if (pal) {
    h += '<div class="swatches">';
    for (const k in pal) {
      const c = pal[k];
      if (!Array.isArray(c)) continue;
      const hex = '#' + [0, 1, 2].map(i => ('0' + Math.round(clamp(c[i], 0, 1) * 255).toString(16)).slice(-2)).join('');
      h += '<label class="sw"><input type="color" data-coat="' + k + '" value="' + hex + '"><span>' + k + '</span></label>';
    }
    h += '</div>';
  }
  h += '</div>';
  // the readout
  const st = s.stats || {};
  h += '<div class="sec" id="lab-readout"><div class="hd">readout</div>';
  for (const k of ['speed', 'accel', 'turn', 'mass'])
    h +=
      '<label class="row"><span>' +
      k +
      '</span><span class="v">' +
      d[k] +
      '</span>' +
      (lab.player // v11.71: a lock is the dev lab's tuning tool; the creator has none, and nothing in the world reads one (creatures_spec.js statsOf)
        ? ''
        : '<input type="checkbox" data-lock="' +
          k +
          '"' +
          (st[k] !== undefined && st[k] !== null ? ' checked' : '') +
          ' title="hold a hand value (the dev lab only: nothing in the world reads it)">' +
          (st[k] !== undefined && st[k] !== null ? labNum('stats.' + k, st[k], 0.1) : '')) +
      '</label>';
  h +=
    '<div class="note">' +
    d.mode +
    ', ' +
    d.buoyancy +
    ' · ' +
    d.length +
    ' m · reach ' +
    d.reach +
    ' · thrust ' +
    d.thrust +
    ' / drag ' +
    d.drag +
    '<br>' +
    d.tris +
    ' tris, ' +
    d.draws +
    ' draws</div>';
  if (d.plausible.length) h += '<div class="warn">' + d.plausible.join('<br>') + '</div>';
  if (lab.warn.length) h += '<div class="warn dim">' + lab.warn.join('<br>') + '</div>';
  h += '</div>';
  // save
  h +=
    '<div class="sec" id="lab-save"><div class="hd">save</div><div class="row btns"><button data-act="copy">copy json</button><button data-act="link">link</button><button data-act="export">export</button><button data-act="drop">place in the world</button></div>';
  // the saved creatures (v11.47): the profile's, by name (save.js PROFILE.creatures); a file out and in for keeping them off the browser
  const cr = Object.keys(PROFILE.creatures).sort();
  h += '<div class="hd2">saved creatures</div><div class="row btns"><button data-act="csave">save as ' + escH(s.id || 'new') + '</button><button data-act="cexport">export file</button><button data-act="cimport">import file</button></div>';
  h += cr.map(k => '<div class="row"><span class="v" data-act="cload" data-id="' + escH(k) + '" title="load">' + escH(k) + '</span><button data-act="cdel" data-id="' + escH(k) + '" title="delete">×</button></div>').join('');
  h += '<textarea data-act="paste" placeholder="paste a spec or export lines here"></textarea><div class="note" id="labmsg"></div></div>';
  return h;
}
function labRender() {
  const sc = labPanel.scrollTop || 0;
  labPanel.innerHTML = labPanelHTML();
  labPanel.scrollTop = sc;
  crtRender(); // the creator's overlay (v11.248; lab.player only)
}
function labReadout() {
  // the readout and the caption refresh without rebuilding the panel (a slider drag keeps its focus)
  const el = labPanel.querySelectorAll ? labPanel.querySelectorAll('.sec') : [];
  if (!el.length) return;
  const tmp = document.createElement('div');
  if (!tmp.querySelectorAll) return;
  tmp.innerHTML = labPanelHTML();
  const secs = tmp.querySelectorAll('.sec');
  if (secs[4] && el[4]) el[4].innerHTML = secs[4].innerHTML;
  const cv = lab.conceive && labPanel.querySelector ? labPanel.querySelector('#lab-cv') : null;
  if (cv) cv.outerHTML = conceiveHTML();
  const hd = el[2] && el[2].querySelector ? el[2].querySelector('.hd .v') : null;
  if (hd) hd.textContent = lab.d.cost + ' points';
}
// the nav follows the scroll
function labScroll() {
  if (!labPanel.querySelectorAll) return;
  const y = labPanel.scrollTop + 60;
  let cur = LAB_SECS[0];
  for (const k of LAB_SECS) {
    const el = document.getElementById('lab-' + k);
    if (el && el.offsetTop <= y) cur = k;
  }
  if (cur !== lab.sec) {
    lab.sec = cur;
    for (const a of labPanel.querySelectorAll('.nav a')) a.classList.toggle('on', a.dataset.go === cur);
  }
}
// set a value at a dotted path in the working spec
function labSet(path, val) {
  const ks = path.split('.');
  let o = lab.spec;
  for (let i = 0; i < ks.length - 1; i++) {
    const k = ks[i];
    if (o[k] === undefined) o[k] = isNaN(+ks[i + 1]) ? {} : [];
    o = o[k];
  }
  o[ks[ks.length - 1]] = val;
}
function labGet(path) {
  const ks = path.split('.');
  let o = lab.spec;
  for (const k of ks) {
    if (o === undefined) return undefined;
    o = o[k];
  }
  return o;
}
let labT = null;
function labRebuildSoon(rerender) {
  if (labT) return;
  labT = setTimeout(() => {
    labT = null;
    labBuild();
    if (rerender) labRender();
  }, 0);
}
function labMsg(m) {
  const el = document.getElementById('labmsg');
  if (el) el.textContent = m;
}
function labLoad(spec) {
  if (lab.conceive && spec && spec.clade !== lab.conceive.parent.clade) {
    labMsg('a child never changes clade');
    return;
  }
  lab.spec = labClone(spec);
  if (!lab.spec.core.beat) lab.spec.core.beat = [1.5, 0.9];
  lab.pend = true;
  lab.note = '';
  lab.open = {};
  lab.hi = -1;
  LAB_SP.undo = [];
  LAB_SP.redo = [];
  LAB_SP.hov = -1;
  LAB_SP.part = -1;
  LAB_SP.drag = null;
  labBuild();
  labRender();
  if (lab.v)
    try {
      location.hash = labHash();
    } catch (e) {}
}
// The spec in the address bar, keeping the tier the person asked for (v11.31.4: `location.hash = specToHash(...)` ate a forced
// #low, so a reload or a shared link came back on high). scene.js reads the flags in any order, separated by &.
function labHash() {
  return '#' + (HASH_TIER ? HASH_TIER + '&' : '') + specToHash(lab.v).slice(1);
}
function labOnInput(e) {
  const t = e.target;
  if (!t) return;
  const path = t.dataset && t.dataset.path;
  if (t.dataset && t.dataset.coat) {
    // a colour by hand: the coat becomes inline
    let pal = lab.spec.coat;
    if (typeof pal === 'string' || !pal) pal = lab.spec.coat = labClone(PAL[pal] || PAL.softP);
    const hex = t.value;
    pal[t.dataset.coat] = [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255];
    labRebuildSoon(false);
    return;
  }
  if (t.dataset && t.dataset.act === 'spin') {
    lab.spin = t.checked;
    return;
  }
  if (t.dataset && t.dataset.act === 'spine') { // v11.246
    LAB_SP.on = t.checked;
    LAB_SP.hov = -1;
    labSpineDraw();
    return;
  }
  if (!path) return;
  let v;
  if (t.type === 'checkbox') v = t.checked;
  else if (t.type === 'range' || t.type === 'number') v = +t.value;
  else v = t.value;
  if (path === '_depth') {
    lab.coatDepth = v;
    return;
  }
  if (typeof v === 'number' && isNaN(v)) return; // a number field mid-edit ('-', '1e') is NaN: it would go into the spec, and a NaN in a build reaches the uniforms (v11.31.4; only stats.* was guarded)
  labSet(path, v);
  const b = t.parentNode && t.parentNode.querySelector ? t.parentNode.querySelector('b') : null;
  if (b && t.type === 'range') {
    const u = b.querySelector ? b.querySelector('i') : null;
    b.textContent = t.step === '1' ? v : (+v).toFixed(2);
    if (u) b.appendChild(u);
  }
  // a style or kind change reshapes the row set; a value change only rebuilds the creature
  const structural = path === 'core.kind' || /\.style$/.test(path) || t.tagName === 'SELECT' || /\.snap$/.test(path) || /\.where$/.test(path);
  if (path === 'core.kind') {
    const c = lab.spec.core;
    lab.spec.core = {kind: v, beat: c.beat};
    if (v === 'lathe') {
      lab.spec.core.prof = FIN_PROF.map(p => p.slice());
    }
    if (v === 'chain') lab.spec.core.beat = [2.2, 0.8];
    if (v === 'bell') lab.spec.core.beat = [1.6, 0];
    // v11.70: what the last core's parts leave behind — a part the new core is itself (a tail under a chain body: two tails) or that has no style standing on it goes; a style that cannot stand there (withdraw off the shelled body) becomes the first that can
    const cl=lab.spec.clade,n0=lab.spec.parts.length;lab.spec.parts=lab.spec.parts.filter(p=>!PARTS[p.kind]||stylesFor(p.kind,cl,v).length>0);
    for(const p of lab.spec.parts){if(!PARTS[p.kind])continue;const ok=stylesFor(p.kind,cl,v);if(ok.indexOf(p.style||PARTS[p.kind].styles[0])<0){for(const k in p)if(k!=='kind'&&k!=='mirror')delete p[k];p.style=ok[0];}}
    if(lab.spec.parts.length<n0){lab.open={};lab.hi=-1;lab.note=(n0-lab.spec.parts.length)+' part'+(n0-lab.spec.parts.length>1?'s':'')+' the '+v+' cannot carry: removed';}
  }
  if (path === 'core.shape' && v === 'lathe' && !lab.spec.core.prof) lab.spec.core.prof = SPECS.veil.core.prof.map(p => [p[0] * 0.3, p[1] * 0.3]); // a sac drawn as a lathe: start from the veil's profile at a third
  const ms = /^parts\.(\d+)\.(style|where)$/.exec(path);
  if (ms) {
    const p = lab.spec.parts[+ms[1]],
      keep = ms[2] === 'where' ? ['where', 'feed', 'fn', 'flen', 'snap'] : paramsFor(p.kind, v);
    for (const k in p) if (k !== 'kind' && k !== 'style' && k !== 'mirror' && keep.indexOf(k) < 0) delete p[k];
  }
  labRebuildSoon(structural);
}
function labOnChange(e) {
  const t = e.target;
  if (t.dataset && t.dataset.lock !== undefined) {
    const k = t.dataset.lock;
    if (!lab.spec.stats) lab.spec.stats = {};
    lab.spec.stats[k] = t.checked ? lab.d[k] : null;
    labRebuildSoon(true);
  }
}
function labOnClick(e) {
  let t = e.target;
  while (t && t !== labPanel && !(t.dataset && (t.dataset.act || t.dataset.go))) t = t.parentNode;
  if (!t || t === labPanel) return;
  const act = t.dataset.act;
  if (t.dataset.go) {
    const el = document.getElementById('lab-' + t.dataset.go);
    if (el && el.scrollIntoView) el.scrollIntoView({behavior: 'smooth', block: 'start'});
    return;
  }
  if (act === 'cv-lay' || act === 'cv-decline') {
    conceiveClose(act === 'cv-decline');
    return;
  }
  if (act === 'fold') {
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') return;
    const i = +t.dataset.i;
    lab.open[i] = lab.open[i] === false;
    labRender();
  } else if (act === 'del') {
    const i = +t.dataset.i;
    lab.spec.parts.splice(i, 1);
    lab.hi = -1;
    const o = {};
    for (const k in lab.open) {
      const j = +k;
      if (j < i) o[j] = lab.open[k];
      else if (j > i) o[j - 1] = lab.open[k];
    }
    lab.open = o;
    labRebuildSoon(true);
  } else if (act === 'delpt') {
    const pr = labGet(t.dataset.path);
    if (pr.length > 3) pr.splice(+t.dataset.i, 1);
    labRebuildSoon(true);
  } else if (act === 'addpt') {
    const pr = labGet(t.dataset.path),
      a = pr[pr.length - 2],
      b = pr[pr.length - 1];
    pr.splice(pr.length - 1, 0, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
    labRebuildSoon(true);
  } else if (act === 'draw') {
    const depth = lab.coatDepth !== undefined ? lab.coatDepth : lab.spec.depth !== undefined ? lab.spec.depth : -30;
    lab.spec.coat = coatFor(lab.spec.clade, depth, lab.diet || 'hunter', mulberry(Math.floor(Math.random() * 1e6)));
    labRebuildSoon(true);
  } else if (act === 'copy') {
    const txt = specToJSON(lab.v);
    labClip(txt);
    labMsg('copied the spec (' + txt.length + ' chars)');
  } else if (act === 'link') {
    const h = labHash();
    location.hash = h;
    labClip(location.href.split('#')[0] + h);
    labMsg('the link is in the address bar and the clipboard');
  } else if (act === 'export') {
    const ta = labPanel.querySelector ? labPanel.querySelector('textarea') : null;
    const txt = specExport(lab.v);
    if (ta) ta.value = txt;
    labClip(txt);
    labMsg('the export lines are in the box and the clipboard');
  } else if (act === 'drop') labDrop();
  else if (act === 'csave') {
    const id = String(lab.v.id || 'new').trim().slice(0, 40) || 'new';
    PROFILE.creatures[id] = specToJSON(lab.v);
    profileSave();
    labRender();
    labMsg('saved ' + id);
  } else if (act === 'cload') {
    const j = PROFILE.creatures[t.dataset.id];
    if (!j) return;
    try {
      labLoad(specFromJSON(j));
      labMsg('loaded ' + t.dataset.id);
    } catch (err) {
      labMsg('not a spec: ' + err.message);
    }
  } else if (act === 'cdel') {
    delete PROFILE.creatures[t.dataset.id];
    profileSave();
    labRender();
  } else if (act === 'cexport') fileSave('creatures.tethys.json', JSON.stringify({kind: 'creatures', creatures: PROFILE.creatures}));
  else if (act === 'cimport')
    filePick(txt => {
      let n = 0;
      try {
        const o = JSON.parse(txt),
          cs = o && o.kind === 'creatures' && o.creatures && typeof o.creatures === 'object' ? o.creatures : null;
        if (!cs) throw new Error('not a creatures file');
        for (const k in cs) {
          if (typeof cs[k] !== 'string') continue;
          specFromJSON(cs[k]); // parses, or throws: nothing that is not a spec goes in
          PROFILE.creatures[String(k).slice(0, 40)] = cs[k];
          n++;
        }
        profileSave();
        labRender();
        labMsg('imported ' + n);
      } catch (err) {
        labMsg('not a creatures file: ' + err.message);
      }
    });
}
function labClip(txt) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt);
  } catch (e) {}
}
function labOnSelect(e) {
  const t = e.target;
  if (!t.dataset) return;
  if (t.dataset.act === 'load') {
    const v = t.value;
    if (!v) return;
    if (v.indexOf('new:') === 0) labLoad(SPEC_BLANK[v.slice(4)]);
    else labLoad(SPECS[v]);
  } else if (t.dataset.act === 'add') {
    const k = t.value;
    if (!k) return;
    const st = labStyles(k, lab.spec.clade, undefined, lab.spec.core.kind)[0];
    const p = {kind: k};
    if (st) p.style = st;
    lab.spec.parts.push(p);
    lab.open[lab.spec.parts.length - 1] = true;
    labRebuildSoon(true);
  } else if (t.dataset.act === 'coat') {
    if (t.value) lab.spec.coat = t.value;
    labRebuildSoon(true);
  } else if (t.dataset.act === 'diet') {
    lab.diet = t.value;
  }
}
function labOnPaste(e) {
  const t = e.target;
  if (!t.dataset || t.dataset.act !== 'paste') return;
  setTimeout(() => {
    const txt = t.value.trim();
    if (!txt) return;
    try {
      const m = /SPECS:\s*(\{[\s\S]*\})\s*$/.exec(txt);
      labLoad(specFromJSON(m ? m[1] : txt));
      labMsg('loaded');
      t.value = '';
    } catch (err) {
      labMsg('not a spec: ' + err.message);
    }
  }, 0);
}
function labOnOver(e) {
  let t = e.target;
  while (t && t !== labPanel && !(t.dataset && t.dataset.part !== undefined)) t = t.parentNode;
  labHi(t && t !== labPanel ? +t.dataset.part : -1);
}
// ---------- the body by hand (v11.246, CREATOR.md "Sixth round: the spine") ----------
// Spore's grammar (analysis_creators.md): the body's knots stand on it as beads on its spine, each with its section drawn round it; the cursor near
// one lights it. Drag moves it in the body's own middle plane (x 0 — or, seen end on, the plane facing the eye through it); the wheel over it
// fattens or thins it (shift: up only; alt: across only); a double-click on the body puts a knot in there, on a knot takes it out (Delete too);
// pulling the last plate of a trunk out grows plates. A part under the cursor lights up: drag slides it along the body (its z, and its y where the
// body does not place it), the wheel scales it. ctrl+z undoes a gesture. Every gesture is an edit of the spec (creatures_spec.js spineMove,
// spineSize, spineAdd, spineDel; a part's own numbers), so the panel, the link, the export and the conception's bill see the same body.
const LAB_SP = {
  on: true, // the spine drawn and in reach ('show the spine' in the core section)
  H: null, // the handles as drawn (spineOf(lab.v))
  ax: 'z',
  show: false, // v11.246.1 (the person: "only on hover, as in spore"): the knots are drawn while the cursor is on the body, a knot or a part, or a gesture is under way
  hov: -1, // the handle under the cursor
  part: -1, // the part under the cursor
  drag: null, // {kind: 'knot'|'part', i, off|p0, ...}
  g: null,
  undo: [],
  redo: [], // v11.248
  wheelT: 0,
  renderT: null,
  ball: new THREE.MeshBasicMaterial({color: 0xffd28a, transparent: true, opacity: 0.85, depthTest: false, fog: false}),
  piece: new THREE.MeshBasicMaterial({color: 0x8fd0ff, transparent: true, opacity: 0.8, depthTest: false, fog: false}),
  hot: new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 1, depthTest: false, fog: false}),
  line: new THREE.LineBasicMaterial({color: 0xffd28a, transparent: true, opacity: 0.5, depthTest: false, fog: false}),
  ring: new THREE.LineBasicMaterial({color: 0xffd28a, transparent: true, opacity: 0.22, depthTest: false, fog: false}),
  ringHot: new THREE.LineBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.8, depthTest: false, fog: false})
};
// what a part's wheel scales: its main proportions (VARY_AUTO's, creatures_defs.js), those its style has
const LAB_SIZE = {eyes: ['r'], mouth: ['R', 'r', 'len'], arms: ['len', 'w'], shell: ['R1', 'R0', 'L', 'r0', 'r1'], ridge: ['len', 'h', 'w'], skirt: ['len', 'h'], chevrons: ['sz'], spines: ['h'],
  barbels: ['len'], plates: ['w'], fins: ['len', 'h'], tail: ['L', 'll', 'lh'], comb: ['len'], tailplate: ['w'], legs: ['len', 'll', 'wl'], keel: ['h'], valves: ['w', 'th'], flaps: ['len', 'w'], weapon: ['len', 'w'], head: ['sy']};
// where a handle is drawn in the body's frame: on its knot, a bell's on its ring's rim (its axis is upright: the rim is what the hand reads)
function labHandleAt(h) {return LAB_SP.ax === 'y' ? V3(0, h.y, h.w) : V3(0, h.y, h.z);}
function labSpineDraw() {
  if (LAB_SP.g && LAB_SP.g.parent) LAB_SP.g.parent.remove(LAB_SP.g);
  LAB_SP.g = null;
  const b = lab.b;
  let S = null;
  try {S = b ? spineOf(lab.v) : null;} catch (e) {S = null;}
  LAB_SP.H = S ? S.H : null;
  LAB_SP.ax = S ? spineAxis(S) : 'z';
  if (!S || !LAB_SP.on || !(LAB_SP.show || LAB_SP.drag)) return;
  const H = S.H, g = new THREE.Group(), ax = LAB_SP.ax;
  let lo = Infinity, hi = -Infinity;
  for (const h of H) {lo = Math.min(lo, h[ax]); hi = Math.max(hi, h[ax]);}
  const rb = clamp((hi - lo) * 0.035, 0.025, 0.8),
    C = H.filter(h => h.chain), sp = [], rg = [], rh = [], ring = (out, h) => {
      for (let k = 0; k < 20; k++) {
        const a0 = (k / 20) * TAU, a1 = ((k + 1) / 20) * TAU;
        if (ax === 'y') out.push(Math.cos(a0) * h.w, h.y, Math.sin(a0) * h.w, Math.cos(a1) * h.w, h.y, Math.sin(a1) * h.w);
        else out.push(Math.cos(a0) * h.w, h.y + Math.sin(a0) * h.h, h.z, Math.cos(a1) * h.w, h.y + Math.sin(a1) * h.h, h.z);
      }
    };
  for (let j = 1; j < C.length; j++) {const a = labHandleAt(C[j - 1]), c = labHandleAt(C[j]); sp.push(a.x, a.y, a.z, c.x, c.y, c.z);}
  H.forEach((h, i) => {
    const hot = i === LAB_SP.hov || (LAB_SP.drag && LAB_SP.drag.kind === 'knot' && LAB_SP.drag.i === i);
    if (h.size) ring(hot ? rh : rg, h);
    const m = new THREE.Mesh(G.sph(rb * (h.chain ? 1 : 0.85), 8, 6), hot ? LAB_SP.hot : h.chain ? LAB_SP.ball : LAB_SP.piece);
    m.position.copy(labHandleAt(h));
    m.renderOrder = 20;
    g.add(m);
  });
  const seg = (P, mat) => {
    if (!P.length) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    const l = new THREE.LineSegments(geo, mat);
    l.renderOrder = 19;
    g.add(l);
  };
  seg(sp, LAB_SP.line);
  seg(rg, LAB_SP.ring);
  seg(rh, LAB_SP.ringHot);
  b.g.add(g);
  LAB_SP.g = g;
}
// the cursor's ray in the creature's frame (its metres at s 1: the group's scale undone)
function labRay(e) {
  const r = canvas.getBoundingClientRect(),
    nx = ((e.clientX - r.left) / r.width) * 2 - 1,
    ny = -(((e.clientY - r.top) / r.height) * 2 - 1),
    o = camera.position.clone(),
    p = V3(nx, ny, 0.5).unproject(camera);
  lab.b.g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(lab.b.g.matrixWorld).invert(),
    oL = o.clone().applyMatrix4(inv),
    pL = p.applyMatrix4(inv);
  return {o: oL, d: pL.sub(oL).normalize()};
}
// where the ray meets the body's middle plane (x 0); seen end on (the ray along that plane), the plane through q facing the eye
function labPlaneHit(e, q) {
  const R = labRay(e), o = R.o, d = R.d;
  if (Math.abs(d.x) > 0.25) return o.clone().addScaledVector(d, -o.x / d.x);
  const n = d.clone().negate(), dn = d.dot(n);
  return o.clone().addScaledVector(d, q.clone().sub(o).dot(n) / dn);
}
// the handle within 14 px of the cursor, nearest first
function labPick(e) {
  if (!LAB_SP.on || !LAB_SP.H || !lab.b) return -1; // drawn or not: the cursor near a knot is what shows it
  const r = canvas.getBoundingClientRect();
  lab.b.g.updateMatrixWorld(true);
  let best = -1, bd = 14 * 14;
  LAB_SP.H.forEach((h, i) => {
    const v = labHandleAt(h).applyMatrix4(lab.b.g.matrixWorld).project(camera);
    if (v.z > 1) return;
    const sx = ((v.x + 1) / 2) * r.width + r.left, sy = ((1 - v.y) / 2) * r.height + r.top, d2 = (sx - e.clientX) * (sx - e.clientX) + (sy - e.clientY) * (sy - e.clientY);
    if (d2 < bd) {bd = d2; best = i;}
  });
  return best;
}
// the part under the cursor (the split build's meshes: compile's opt.split), or -1
let LAB_RC = null; // made at the first use: the headless stub has no raycaster
function labPickPart(e) {
  if (!lab.b || !lab.b.built) return -1;
  if (!LAB_RC) LAB_RC = new THREE.Raycaster();
  const r = canvas.getBoundingClientRect();
  LAB_RC.setFromCamera({x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1)}, camera);
  let best = -1, bd = Infinity;
  lab.b.built.forEach((p, i) => {
    if (!p || !p.meshes) return;
    for (const m of p.meshes) for (const h of LAB_RC.intersectObject(m, true)) if (h.distance < bd) {bd = h.distance; best = i;}
  });
  if (best >= 0) {
    const bh = LAB_RC.intersectObject(lab.b.body, false)[0]; // the body in front of the part hides it
    if (bh && bh.distance < bd - 1e-3) return -1;
  }
  return best;
}
function labUndoPush() {
  LAB_SP.redo.length = 0;
  LAB_SP.undo.push(JSON.stringify(lab.spec));
  if (LAB_SP.undo.length > 60) LAB_SP.undo.shift();
}
function labUndo() {
  const j = LAB_SP.undo.pop();
  if (!j) return;
  LAB_SP.redo.push(JSON.stringify(lab.spec));
  lab.spec = JSON.parse(j);
  labBuild();
  labRender();
}
function labRedo() { // v11.248: the creator's redo
  const j = LAB_SP.redo.pop();
  if (!j) return;
  LAB_SP.undo.push(JSON.stringify(lab.spec));
  lab.spec = JSON.parse(j);
  labBuild();
  labRender();
}
// the panel once a gesture rests (its sliders and readout follow the body)
function labRenderSoon() {
  if (LAB_SP.renderT) clearTimeout(LAB_SP.renderT);
  LAB_SP.renderT = setTimeout(() => {LAB_SP.renderT = null; labRender();}, 250);
}
// the cursor on the body itself (its core's mesh)
function labOnBody(e) {
  if (!lab.b || !lab.b.body) return false;
  if (!LAB_RC) LAB_RC = new THREE.Raycaster();
  const r = canvas.getBoundingClientRect();
  LAB_RC.setFromCamera({x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1)}, camera);
  return LAB_RC.intersectObject(lab.b.body, false).length > 0;
}
function labHover(e) {
  const i = labPick(e);
  let p = -1;
  if (i < 0) p = labPickPart(e);
  const show = i >= 0 || p >= 0 || labOnBody(e);
  if (i !== LAB_SP.hov || show !== LAB_SP.show) {LAB_SP.hov = i; LAB_SP.show = show; labSpineDraw();}
  if (p !== LAB_SP.part) {LAB_SP.part = p; labHi(p);}
  canvas.style.cursor = i >= 0 || p >= 0 ? 'grab' : '';
}
// a part's numbers as the build read them (lab.v: defaults filled), written into the working spec
function labPartGet(i, k) {const p = lab.v.parts[i]; return p ? p[k] : undefined;}
function labPartMove(i, dy, dz) {
  const d = LAB_SP.drag, p = lab.spec.parts[i], pv = lab.v.parts[i], ks = paramsFor(pv.kind, pv.style);
  if (ks.indexOf('z') >= 0 && typeof d.z0 === 'number') p.z = d.z0 + dz;
  if (ks.indexOf('y') >= 0 && typeof d.y0 === 'number' && !(pv.snap && labHidden(pv, 'y'))) p.y = d.y0 + dy;
}
function labPartSize(i, k) {
  const pv = lab.v.parts[i], ks = paramsFor(pv.kind, pv.style);
  let n = 0;
  for (const key of LAB_SIZE[pv.kind] || []) if (ks.indexOf(key) >= 0 && typeof pv[key] === 'number') {lab.spec.parts[i][key] = pv[key] * k; n++;}
  return n > 0;
}
// ---------- the world ----------
// p: the creature as a temporary species in DEFS (lab) with its derived stats, spawned near the peak — or, in play, ahead of the player.
function labDrop() {
  const s = lab.v;
  if (!s) return;
  const st = statsOf(s, !lab.player), // the locks: the dev lab's only (v11.71)
    b = s.behaviour || {},
    role = b.role === 'player' ? 'hunter' : b.role || 'wander';
  const spec = labClone(s),
    inPlay = mode === 'play' || lab.from === 'play';
  DEFS.lab = {
    build: () => compile(spec),
    size: s.size,
    speed: st.speed,
    top: st.speed, // v11.93.1: the committed lunge (creatures_ai.js, v11.92) runs at top × sprint — with neither on this row the placed creature's velocity went NaN in its first chase and the low tier's smoke test failed one run in three (a NaN cell)
    sprint: st.burst || 1,
    accel: st.accel,
    hp: 100, // a mortal (v11.55: hp is the forage/immortal flag only)
    role: role,
    turn: st.turn,
    cruiseF: 0.45,
    home: 20 + s.size * 10,
    prey: ['darter', 'flicker'],
    detect: 10 + s.size * 5,
    reach: st.reach,
    dmg: Math.round(st.mass * 3) + 2,
    biteCD: 1.2,
    cool: 3,
    legs: st.legs,
    jetter: st.jet,
    floor: !!b.floor
  };
  const p = inPlay
    ? V3(0, 0, 1)
        .applyQuaternion(player.g.quaternion)
        .multiplyScalar(6 + s.size * 2)
        .add(player.pos)
    : V3(2, floor0 + 4 + s.size * 0.5, -6);
  p.y = Math.max(p.y, groundAt(p.x, p.z) + s.size * 0.4);
  const ch = chunkAt(p.x, p.z);
  if (!ch) {
    labMsg('no cell there yet');
    return;
  }
  const c = spawn(ch, 'lab', p, mulberry(lab.placed++));
  c.home.copy(p);
  labMsg(inPlay ? 'placed ahead of you' : 'placed at the peak: pick a clade to meet it');
}
// ---------- enter, leave, frame ----------
function labEnter(spec, asPlayer) {
  if (mode !== 'menu' && mode !== 'zoo' && mode !== 'play') return;
  if (mode === 'zoo') zooLeave();
  lab.from = mode;
  mode = 'lab';
  lab.player = !!asPlayer; // the creator (menu.js): gated to what has been seen
  labEl.classList.toggle('player', lab.player); // v11.248: the creator's overlay (creator.js) in place of the panel
  if (document.body && document.body.classList) document.body.classList.toggle('creator', lab.player); // and the game's title out of its way
  grantCreator(); // the lab used once is the creator used (v11.47): the menu shows the word from here
  labEl.classList.add('on');
  lab.pend = true;
  if (lab.from === 'play') {
    try {
      if (document.exitPointerLock) document.exitPointerLock();
    } catch (e) {}
    const size = (spec || lab.spec || SPECS.soft).size || 2;
    lab.o.copy(
      V3(0, 0, 1)
        .applyQuaternion(player.g.quaternion)
        .multiplyScalar(5 + size * 2.5)
        .add(player.pos)
    );
    lab.yaw = player.yaw + Math.PI * 0.75;
  } else {
    menuPage('none');
    player.pos.set(0, dispY, 0); // the cells stream round player.pos: the peak, where the creature is shown (v11.47.2: the menu's camera may be anywhere)
  }
  hintEl.textContent = isTouch
    ? 'drag to turn'
    : 'drag a knot or a part, wheel on it to size it, double-click the body for a knot · drag the water to turn · space, s, r, p, l as ever';
  hintEl.style.opacity = lab.player ? 0 : 1; // the creator says nothing it can show (v11.248)
  labLoad(spec || lab.spec || SPECS.soft);
}
function labLeave() {
  if (mode !== 'lab') return;
  mode = lab.from === 'play' ? 'play' : 'menu';
  labEl.classList.remove('on');
  hintEl.style.opacity = 0;
  if (lab.b) {
    scene.remove(lab.b.g);
    lab.b.g.traverse(o => {
      if (o.geometry) o.geometry.dispose();
    });
    lab.b = null;
  }
  lab.player = false;
  labEl.classList.remove('player');
  if (document.body && document.body.classList) document.body.classList.remove('creator');
  CRT.pick = false;
  lab.conceive = null;
  if (player.away) playerAway(false); // the parent back in the world (v11.72.1)
  if (mode === 'menu') {
    menuPage('main');
    layoutMenu();
  } else {
    hintEl.textContent = 'click to look again; l for the lab';
    hintEl.style.opacity = 1;
    setTimeout(() => {
      hintEl.style.opacity = 0;
    }, 4000);
  }
}
function updateLab(dt) {
  if (mode !== 'lab' || !lab.b) return;
  const b = lab.b;
  if (lab.act >= 0) {
    lab.act += dt;
    if (lab.act > 2.2) lab.act = -1;
  }
  const a = lab.act,
    st = {};
  if (a >= 0) {
    st.tell = a < 0.6 ? smooth(0, 0.6, a) : a < 1.4 ? 1 : 1 - smooth(1.4, 2.1, a);
    st.strike = a < 0.75 ? 0 : a < 0.9 ? smooth(0.75, 0.9, a) : a < 1.4 ? 1 : 1 - smooth(1.4, 2.1, a);
    st.jet = st.strike > 0.5;
    st.pulse = st.strike * 0.6;
    st.withdrawn = st.strike > 0.5;
  }
  const spd = (lab.cruise ? 1.2 : 0.3) + 2.5 * (st.strike || 0);
  if (!(LAB_SP.hov >= 0 || LAB_SP.part >= 0 || LAB_SP.drag) || lab.act >= 0) lab.at += dt; // v11.246: the body holds still under the hand (a wagging tail would slip from under the cursor); its clock is the lab's
  b.anim(lab.at, spd, st);
  b.g.updateMatrix();
  worldShapes(b.owner);
  stepRigs(b.owner, null, dt);
  if (lab.spin && !lab.drag) lab.yaw += 0.18 * dt;
  const cp = Math.cos(lab.pitch),
    sp = Math.sin(lab.pitch),
    o = lab.o,
    cy = o.y + (lab.floor ? lab.radius * 0.25 : 0);
  let x = o.x + Math.sin(lab.yaw) * cp * lab.dist,
    y = cy + sp * lab.dist,
    z = o.z + Math.cos(lab.yaw) * cp * lab.dist;
  y = clamp(y, groundAt(x, z) + 1.2, TIDE - 1.0);
  camera.position.set(x, y, z);
  camera.lookAt(o.x, cy, o.z);
}
labPanel.addEventListener('input', labOnInput);
labPanel.addEventListener('change', e => {
  labOnChange(e);
  labOnSelect(e);
});
labPanel.addEventListener('click', labOnClick);
labPanel.addEventListener('paste', labOnPaste);
labPanel.addEventListener('mouseover', labOnOver);
labPanel.addEventListener('mouseleave', () => labHi(-1));
labPanel.addEventListener('focusin', labOnOver);
labPanel.addEventListener('scroll', labScroll, {passive: true});
labPanel.addEventListener('keydown', e => {
  e.stopPropagation();
});
labPanel.addEventListener('keyup', e => {
  e.stopPropagation();
});
labPanel.addEventListener(
  'wheel',
  e => {
    e.stopPropagation();
  },
  {passive: true}
);
addEventListener('keydown', e => {
  if (mode === 'menu' && e.code === 'KeyL') {
    labEnter();
    return;
  }
  if (mode === 'zoo' && e.code === 'KeyL') {
    const r = ROSTER[zoo.i];
    if (SPECS[r.id]) labEnter(SPECS[r.id]);
    return;
  }
  if (mode === 'play' && e.code === 'KeyL' && !player.dead) {
    labEnter();
    return;
  }
  if (mode === 'play' && e.code === 'KeyP' && lab.v && !lab.conceive) {
    labDrop();
    return;
  }
  if (mode !== 'lab') return;
  if ((e.code === 'KeyL' || e.code === 'Escape') && lab.conceive) conceiveClose(false); // closing the window is the laying (line.js, v11.72): refused over the budget
  else if (e.code === 'KeyL' || e.code === 'Escape') labLeave();
  else if (e.code === 'Space') {
    e.preventDefault();
    if (lab.b) lab.act = 0;
  } else if (e.code === 'KeyS') lab.cruise = !lab.cruise;
  else if (e.code === 'KeyR') {
    lab.spin = !lab.spin;
    const c = labPanel.querySelector ? labPanel.querySelector('[data-act=spin]') : null;
    if (c) c.checked = lab.spin;
  } else if (e.code === 'KeyP' && !lab.conceive) labDrop();
  else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { // v11.246
    e.preventDefault();
    labUndo();
  } else if ((e.code === 'Delete' || e.code === 'Backspace') && LAB_SP.hov >= 0) {
    e.preventDefault();
    labUndoPush();
    if (spineDel(lab.spec, LAB_SP.hov)) {LAB_SP.hov = -1; labBuild(); labRender();}
    else LAB_SP.undo.pop();
  }
});
// a double-click on the body puts a knot in where it was clicked; on a knot, takes it out (v11.246)
canvas.addEventListener('dblclick', e => {
  if (mode !== 'lab' || !lab.b || !LAB_SP.H || !LAB_SP.on) return;
  const i = labPick(e);
  labUndoPush();
  if (i >= 0) {
    if (spineDel(lab.spec, i)) {LAB_SP.hov = -1; labBuild(); labRender();}
    else LAB_SP.undo.pop();
    return;
  }
  if (!LAB_RC) LAB_RC = new THREE.Raycaster();
  const r = canvas.getBoundingClientRect();
  LAB_RC.setFromCamera({x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1)}, camera);
  const hit = LAB_RC.intersectObject(lab.b.body, false)[0];
  const p = hit ? labPlaneHit(e, lab.b.g.worldToLocal(hit.point.clone())) : null;
  if (p && spineAdd(lab.spec, LAB_SP.ax === 'y' ? p.y : p.z)) {labBuild(); labRender();}
  else LAB_SP.undo.pop();
});
canvas.addEventListener('mousedown', e => {
  if (mode !== 'lab' || e.button !== 0) return;
  if (lab.b && LAB_SP.hov >= 0 && LAB_SP.H && LAB_SP.H[LAB_SP.hov]) { // a knot taken up (v11.246)
    const h = LAB_SP.H[LAB_SP.hov], q = labHandleAt(h);
    if (h.move) {labUndoPush(); LAB_SP.drag = {kind: 'knot', i: LAB_SP.hov, off: q.clone().sub(labPlaneHit(e, q)), gone: false, moved: 0, p0: null, y0: 0, z0: 0};}
    else LAB_SP.drag = {kind: 'none', i: LAB_SP.hov, off: null, gone: false, moved: 0, p0: null, y0: 0, z0: 0};
    canvas.style.cursor = 'grabbing';
    return;
  }
  if (lab.b && LAB_SP.part >= 0 && lab.v.parts[LAB_SP.part]) { // a part taken up
    const i = LAB_SP.part, pv = lab.v.parts[i], q = V3(0, isFinite(pv.y) ? pv.y : 0, isFinite(pv.z) ? pv.z : 0);
    labUndoPush();
    LAB_SP.drag = {kind: 'part', i: i, off: null, gone: false, moved: 0, p0: labPlaneHit(e, q), y0: labPartGet(i, 'y'), z0: labPartGet(i, 'z')};
    canvas.style.cursor = 'grabbing';
    return;
  }
  lab.drag = {moved: 0};
});
addEventListener('mousemove', e => {
  if (mode !== 'lab') return;
  const D = LAB_SP.drag;
  if (D) {
    D.moved += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0);
    if (!lab.b || D.moved < 3) return;
    if (D.kind === 'knot') {
      const h = LAB_SP.H && LAB_SP.H[D.i];
      if (!h) return;
      const p = labPlaneHit(e, labHandleAt(h)).add(D.off);
      if (spineMove(lab.spec, D.i, p.y, LAB_SP.ax === 'y' ? h.z : p.z)) labRebuildSoon(false);
    } else if (D.kind === 'part') {
      const p = labPlaneHit(e, D.p0);
      labPartMove(D.i, p.y - D.p0.y, p.z - D.p0.z);
      D.gone = D.moved > 12 && !labOnBody(e) && !labIsReq(lab.v.parts[D.i], GRAMMAR[lab.v.clade], CORES[lab.v.core.kind]); // v11.248: pulled off the body, it goes when let go (a part the clade must have never does)
      canvas.style.cursor = D.gone ? 'no-drop' : 'grabbing';
      labRebuildSoon(false);
    }
    return;
  }
  if (!lab.drag) {
    if (e.target === canvas && lab.b) labHover(e);
    else if (LAB_SP.hov >= 0 || LAB_SP.part >= 0 || LAB_SP.show) {LAB_SP.hov = -1; LAB_SP.part = -1; LAB_SP.show = false; labSpineDraw(); canvas.style.cursor = '';} // off the water (the panel): nothing under the hand
    return;
  }
  const dx = e.movementX || 0,
    dy = e.movementY || 0;
  lab.drag.moved += Math.abs(dx) + Math.abs(dy);
  lab.yaw -= dx * 0.006;
  lab.pitch = clamp(lab.pitch + dy * 0.004, -0.3, 1.2);
  if (lab.drag.moved > 4) lab.spin = false;
});
addEventListener('mouseup', e => {
  if (mode !== 'lab') return;
  if (LAB_SP.drag) { // a gesture ends: nothing moved, nothing to undo; else the panel follows
    const D = LAB_SP.drag;
    LAB_SP.drag = null;
    if (D.kind === 'part' && D.gone && e && !labOnBody(e)) { // let go off the body: the part is taken out (v11.248)
      lab.spec.parts.splice(D.i, 1);
      LAB_SP.part = -1;
      lab.hi = -1;
      lab.open = {};
      canvas.style.cursor = '';
      labBuild();
      labRender();
      return;
    }
    if (D.kind !== 'none' && D.moved < 3) LAB_SP.undo.pop();
    else if (D.kind !== 'none') labRenderSoon();
    canvas.style.cursor = LAB_SP.hov >= 0 || LAB_SP.part >= 0 ? 'grab' : '';
    labSpineDraw();
    return;
  }
  if (!lab.drag) return;
  if (lab.drag.moved < 4 && lab.b) lab.act = 0;
  else {
    const c = labPanel.querySelector ? labPanel.querySelector('[data-act=spin]') : null;
    if (c) c.checked = lab.spin;
  }
  lab.drag = null;
});
addEventListener(
  'wheel',
  e => {
    if (mode !== 'lab') return;
    if (lab.b && e.target === canvas && (LAB_SP.hov >= 0 || LAB_SP.part >= 0)) { // v11.246: the wheel on a knot fattens it, on a part sizes it
      const dv = e.deltaY || e.deltaX, k = dv < 0 ? 1.06 : 1 / 1.06, now = performance.now();
      if (!dv) return;
      if (now - LAB_SP.wheelT > 500) labUndoPush(); // a run of the wheel is one gesture
      LAB_SP.wheelT = now;
      if (LAB_SP.hov >= 0) {if (spineSize(lab.spec, LAB_SP.hov, e.shiftKey ? 1 : k, e.altKey ? 1 : k)) labRebuildSoon(false);}
      else if (labPartSize(LAB_SP.part, k)) labRebuildSoon(false);
      labRenderSoon();
      return;
    }
    lab.dist = clamp(lab.dist * (e.deltaY > 0 ? 1.1 : 0.9), Math.max(2, lab.radius * 0.6), Math.max(12, lab.radius * 6));
  },
  {passive: true}
);
if (HASH_FLAGS.some(f => f === 'lab' || f.indexOf('lab=') === 0)) {
  let sp = null;
  try {
    sp = specFromHash(location.hash);
  } catch (e) {}
  labEnter(sp || undefined);
}
