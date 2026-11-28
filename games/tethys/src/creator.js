// creator.js — the creator as the player sees it (v11.248): the lab with its words taken away. The person, 27 Nov 2026: "we should be able to
// remove 95% of the text on the left side of the screen and have a perfectly functional creature creator … a tasteful, minimalist thing my dad
// can use to make a creature." Spore's editor is the model (analysis_creators.md): parts as pictures in a column, dragged onto the body and off it
// again; the body shaped on itself (lab.js, "the body by hand"); a row of colours; a few icons. The dev lab (#lab, l) keeps its panel; this
// overlay is lab.player's — the menu's creator and the conception's window. Words only where a picture cannot say it: the name, and a tooltip.
// The style and the stage are the person's next (images to come).
const crtEl = document.getElementById('crt');
const CRT = {
  icons: new Map(), // key → data URL: a part or a body drawn as a flat-shaded silhouette (crtIcon)
  queue: [], // icons still to draw, a few a frame
  key: '', // what the overlay was drawn for (clade, core, coat): drawn again when it moves (the palette's pictures are the clade's, cached)
  ghost: null, // a part on its way from the palette: {kind, style, el}
  pick: false // the species' pictures open
};
// ---------- the pictures: a body or one part drawn flat on a 2D canvas, in the game's own facets ----------
// Every mesh's triangles projected orthographically from the lab's side (the body's nose to the right, seen a little from above and in front),
// painted far to near, each facet its vertex colour lit by one light: the low-poly look without a second WebGL context or the scene's shaders.
const CRT_VIEW = {yaw: 1.15, pitch: 0.32, light: [0.35, 0.85, 0.4], px: 88};
function crtIcon(key, spec, which) {
  if (CRT.icons.has(key)) return CRT.icons.get(key);
  let url = '';
  try {
    const cv = document.createElement('canvas'), cx = cv.getContext && cv.getContext('2d');
    if (cx && typeof cx.fill === 'function' && typeof cv.toDataURL === 'function') {
      cv.width = cv.height = CRT_VIEW.px;
      const b = compile(spec, 1, undefined, {split: true});
      b.anim(0, 0, {});
      if (b.rigs) for (const r of b.rigs) rigRest(r);
      b.g.updateMatrixWorld(true);
      const roots = which < 0 ? [b.g] : (b.built[which] && b.built[which].meshes) || [];
      const cy = Math.cos(CRT_VIEW.yaw), sy = Math.sin(CRT_VIEW.yaw), cp = Math.cos(CRT_VIEW.pitch), sp = Math.sin(CRT_VIEW.pitch);
      const ex = [sy * cp, sp, cy * cp], rx = [cy, 0, -sy], ux = [-sy * sp, cp, -cy * sp]; // toward the eye, the screen's right, its up
      const Lt = CRT_VIEW.light, ll = Math.hypot(Lt[0], Lt[1], Lt[2]), T = [], v = new THREE.Vector3();
      for (const root of roots)
        root.traverse(o0 => {
          const o = /** @type {import('three').Mesh} */ (o0);
          if (!o.isMesh || !o.visible || !o.geometry || !o.geometry.attributes.position) return;
          const g = o.geometry, pa = g.attributes.position, ca = g.attributes.color, ix = g.index, n = ix ? ix.count : pa.count, e = o.matrixWorld;
          const P = k => {v.fromBufferAttribute(pa, k).applyMatrix4(e); return [v.x, v.y, v.z];};
          for (let i = 0; i + 2 < n; i += 3) {
            const k0 = ix ? ix.getX(i) : i, k1 = ix ? ix.getX(i + 1) : i + 1, k2 = ix ? ix.getX(i + 2) : i + 2, a = P(k0), bb = P(k1), c = P(k2);
            const ux1 = bb[0] - a[0], uy1 = bb[1] - a[1], uz1 = bb[2] - a[2], vx1 = c[0] - a[0], vy1 = c[1] - a[1], vz1 = c[2] - a[2];
            let nx = uy1 * vz1 - uz1 * vy1, ny = uz1 * vx1 - ux1 * vz1, nz = ux1 * vy1 - uy1 * vx1;
            const nl = Math.hypot(nx, ny, nz);
            if (!(nl > 1e-12)) continue;
            nx /= nl; ny /= nl; nz /= nl;
            const facing = nx * ex[0] + ny * ex[1] + nz * ex[2];
            if (facing <= 0) continue; // the back of a facet: the front one covers it
            const lit = 0.42 + 0.58 * Math.max(0, (nx * Lt[0] + ny * Lt[1] + nz * Lt[2]) / ll),
              col = ca ? [ca.getX(k0), ca.getY(k0), ca.getZ(k0)] : [0.7, 0.7, 0.7],
              pr = q => [q[0] * rx[0] + q[1] * rx[1] + q[2] * rx[2], q[0] * ux[0] + q[1] * ux[1] + q[2] * ux[2], q[0] * ex[0] + q[1] * ex[1] + q[2] * ex[2]];
            const A = pr(a), B = pr(bb), C = pr(c);
            T.push({p: [A, B, C], z: (A[2] + B[2] + C[2]) / 3, c: col.map(x => Math.round(255 * Math.min(1, x * lit)))});
          }
        });
      if (T.length) {
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (const t of T) for (const q of t.p) {x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]);}
        const W = CRT_VIEW.px, k = (W * 0.84) / Math.max(1e-6, x1 - x0, y1 - y0), ox = W / 2 - ((x0 + x1) / 2) * k, oy = W / 2 + ((y0 + y1) / 2) * k;
        T.sort((a, b) => a.z - b.z);
        cx.lineJoin = 'round';
        cx.lineWidth = 0.6;
        for (const t of T) {
          cx.beginPath();
          t.p.forEach((q, i) => (i ? cx.lineTo(ox + q[0] * k, oy - q[1] * k) : cx.moveTo(ox + q[0] * k, oy - q[1] * k)));
          cx.closePath();
          cx.fillStyle = cx.strokeStyle = 'rgb(' + t.c[0] + ',' + t.c[1] + ',' + t.c[2] + ')';
          cx.fill();
          cx.stroke();
        }
        url = cv.toDataURL();
      }
      b.g.traverse(o => {const m = /** @type {import('three').Mesh} */ (o); if (m.geometry) m.geometry.dispose();});
    }
  } catch (e) {url = '';}
  CRT.icons.set(key, url);
  return url;
}
// a few pictures a frame (each is a build): the palette and the picker fill in as they are drawn
function crtIconsStep() {
  const t0 = performance.now();
  while (CRT.queue.length && performance.now() - t0 < 12) {
    const q = CRT.queue.shift(), url = crtIcon(q.key, q.spec, q.which);
    if (crtEl.querySelectorAll) for (const im of /** @type {NodeListOf<HTMLImageElement>} */ (crtEl.querySelectorAll('img[data-key="' + q.key + '"]'))) if (url) im.src = url;
  }
  if (CRT.queue.length) setTimeout(crtIconsStep, 16);
}
function crtIconFor(key, spec, which) {
  if (CRT.icons.has(key)) return CRT.icons.get(key) || '';
  if (!CRT.queue.some(q => q.key === key)) {CRT.queue.push({key: key, spec: spec, which: which}); if (CRT.queue.length === 1) setTimeout(crtIconsStep, 0);}
  return '';
}
function crtEsc(s) {return String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);}
// ---------- the icons of the bar: strokes, no words ----------
const CRT_SVG = {
  undo: '<path d="M9 7 4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12h-3" transform="translate(0 -6)"/>',
  redo: '<path d="m15 7 5 5-5 5"/><path d="M20 12H10a6 6 0 0 0 0 12h3" transform="translate(0 -6)"/>',
  turn: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v4h-4"/>',
  swim: '<path d="M3 12c3-4 6-4 9 0s6 4 9 0"/>',
  act: '<path d="M5 12h11"/><path d="m12 7 5 5-5 5"/>',
  paint: '<circle cx="12" cy="12" r="7"/><circle cx="9.5" cy="10" r="1.2"/><circle cx="14.5" cy="10" r="1.2"/><circle cx="12" cy="15" r="1.2"/>',
  dice: '<rect x="5" y="5" width="14" height="14" rx="3"/><circle cx="9.5" cy="9.5" r="1"/><circle cx="14.5" cy="14.5" r="1"/>',
  new: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  keep: '<path d="M7 4h10v16l-5-4-5 4z"/>',
  done: '<path d="m5 12 5 5 9-10"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>'
};
function crtBtn(act, tip, on) {return '<button data-crt="' + act + '" title="' + tip + '"' + (on ? ' class="on"' : '') + '><svg viewBox="0 0 24 24">' + CRT_SVG[act] + '</svg></button>';}
// ---------- the overlay ----------
// One tile a part, the same for the whole clade (the person, 28 Nov 2026: "Every animal of the same clade should have an identical set of tools,
// parts … none of them go away or come back unless you pick an entirely new clade", and "one part gets one spot on the left side list"; a part's
// configs — the ortho's mouth and the soft-arm's as one part, two configs — come later). A tile drops its clade's standard style, below: the
// commonest the roster wears, or the blank's where that is the clade's own (the soft-arm's jet arms). The other styles stay what the roster
// wears and what the dev lab offers; a body keeps whatever it has.
const CRT_STD = {
  ringmouths: {eyes: 'collar', mouth: 'beak', arms: 'jet', shell: 'coil', ridge: 'gladius', skirt: 'trio', head: 'turret'},
  slowbloods: {eyes: 'ring', mouth: 'tentacles', chevrons: 'rows', spines: 'row', barbels: 'cone', plates: 'rows', fins: 'trio', tail: 'lathe'},
  hingeshells: {eyes: 'stalks', mouth: 'plates', spines: 'thorns', comb: 'rake', tailplate: 'spine', legs: 'walk', keel: 'ventral', valves: 'placed', flaps: 'sides', weapon: 'claws'},
  drifters: {arms: 'hang'}
};
// A part the clade has but this core carries itself (the eel's chain is its own tail and its own dorsal fin): the tile is there all the same,
// and dropped it turns the core's own on (CREATOR.md, Eighth round)
const CRT_ON_CORE = {chain: {fins: c => {c.fin = true;}, tail: c => {if (!(c.lobes >= 1)) c.lobes = CORES.chain.params.lobes.d;}}};
// the clade's parts, in the registry's order: every kind any of its cores takes; in the creator, a kind once any of its styles has been seen
function crtKinds(clade) {return Object.keys(PARTS).filter(k => CRT_STD[clade] && CRT_STD[clade][k] && stylesFor(k, clade).length && (!lab.player || stylesFor(k, clade).some(s => seen('pt', k + ':' + s))));}
function crtSpecOf(kind, style, clade) { // a part alone on the clade's blank, in its coat (filled: a shell reads colours a soft body's lacks), for its picture: the same whichever body is open
  const b = SPEC_BLANK[clade];
  return {id: 'icon', clade: clade, size: b.size, s: 1, coat: coatFill(b.coat, clade, true), core: Object.assign({}, b.core), parts: [{kind: kind, style: style}]};
}
function crtPalette() {
  const cl = lab.v.clade;
  let h = '';
  for (const kind of crtKinds(cl)) {
    const style = CRT_STD[cl][kind], key = 'p|' + cl + '|' + kind + '|' + style, url = crtIconFor(key, crtSpecOf(kind, style, cl), 0);
    h += '<div class="tile" data-kind="' + kind + '" data-style="' + style + '" title="' + kind + '"><img data-key="' + crtEsc(key) + '" src="' + url + '" draggable="false"></div>';
  }
  return h;
}
function crtCoats() {
  const v = lab.v, keys = [];
  for (const id in SPECS) {const sp = SPECS[id]; if (sp.clade === v.clade && typeof sp.coat === 'string' && keys.indexOf(sp.coat) < 0 && labOk('sp', id)) keys.push(sp.coat);}
  const sw = k => {const p = PAL[k] || {}, c = a => 'rgb(' + (a || [0.5, 0.5, 0.5]).map(x => Math.round(x * 255)).join(',') + ')'; return 'linear-gradient(160deg,' + c(p.top || p.bell || p.float) + ' 50%,' + c(p.belly || p.top || p.core) + ' 50%)';};
  return keys.slice(0, 8).map(k => '<button class="sw' + (v.coat === k ? ' on' : '') + '" data-coat="' + k + '" title="a coat" style="background:' + sw(k) + '"></button>').join('') + crtBtn('dice', 'a coat its chemistry would give it');
}
function crtBars() {
  const d = lab.d;
  if (!d) return '';
  const bar = (k, f, tip) => '<div class="bar" title="' + tip + '"><i style="width:' + Math.round(100 * clamp(f, 0.04, 1)) + '%"></i></div>';
  return bar('speed', d.speed / 12, 'speed ' + d.speed + ' m/s') + bar('turn', Math.sqrt(d.turn / 8), 'agility ' + d.turn) + bar('mass', Math.log10(1 + d.mass) / 2.5, 'mass ' + d.mass + ' t');
}
function crtBudget() {
  const cv = lab.conceive;
  if (!cv) return '';
  const pr = conceivePrice(cv.parent, lab.v || cv.parent), f = pr.total / Math.max(1e-6, cv.budget), over = pr.total > cv.budget + 1e-9;
  return '<div class="budget' + (over ? ' over' : '') + '" title="' + crtEsc(pr.items.map(i => i.what + ' ' + i.cost.toFixed(2)).join('\n') || 'unchanged') + '"><i style="width:' + Math.round(100 * Math.min(1, f)) + '%"></i></div>';
}
function crtPicker() {
  if (!CRT.pick) return '';
  let h = '<div id="crt-pick">';
  const add = (key, spec, val, tip) => {h += '<div class="tile big" data-load="' + crtEsc(val) + '" title="' + crtEsc(tip) + '"><img data-key="' + crtEsc(key) + '" src="' + crtIconFor(key, spec, -1) + '" draggable="false"></div>';};
  for (const k in PROFILE.creatures) {try {const sp = specFromJSON(PROFILE.creatures[k]); add('s|' + k + '|' + PROFILE.creatures[k].length, sp, 'saved:' + k, k);} catch (e) {}}
  for (const id in SPECS) if (labOk('sp', id) && (!lab.conceive || SPECS[id].clade === lab.conceive.parent.clade)) add('b|' + id, SPECS[id], id, id);
  return h + '</div>';
}
function crtRender() {
  if (!lab.player || !lab.v) return;
  const key = lab.v.clade + '|' + lab.v.core.kind + '|' + (typeof lab.v.coat === 'string' ? lab.v.coat : 'own');
  crtEl.innerHTML =
    '<div id="crt-parts">' + crtPalette() + '</div>' +
    '<div id="crt-top"><input id="crt-name" value="' + crtEsc(lab.spec.id || '') + '" spellcheck="false" maxlength="40"><div id="crt-bars">' + crtBars() + '</div>' + crtBudget() + '</div>' +
    '<div id="crt-tools">' + crtBtn('undo', 'undo (ctrl+z)') + crtBtn('redo', 'redo') + '<span class="gap"></span>' + crtBtn('turn', 'turn it', lab.spin) + crtBtn('swim', 'swim', lab.cruise) + crtBtn('act', 'the action (space)') + '<span class="gap"></span>' +
      (lab.conceive ? '' : crtBtn('new', 'start from another') + crtBtn('keep', 'keep it')) + crtBtn('done', lab.conceive ? 'lay the clutch' : 'done') + (lab.conceive ? crtBtn('close', 'decline: a copy of the parent') : '') + '</div>' +
    '<div id="crt-coat">' + crtCoats() + '</div>' + crtPicker();
  CRT.key = key;
}
// the parts of the overlay that follow the body without a rebuild of the palette (its pictures are dear): the bars, the budget, the name
function crtUpdate() {
  if (!lab.player || !lab.v) return;
  const key = lab.v.clade + '|' + lab.v.core.kind + '|' + (typeof lab.v.coat === 'string' ? lab.v.coat : 'own');
  if (key !== CRT.key || !crtEl.querySelector) {crtRender(); return;}
  const b = crtEl.querySelector('#crt-bars');
  if (b) b.innerHTML = crtBars();
  const top = crtEl.querySelector('#crt-top'), old = top && top.querySelector('.budget');
  if (old) old.outerHTML = crtBudget();
}
// ---------- the hand: a part from the palette onto the body ----------
// the tile's part onto a spec at fore–aft z: a part of its own, or the core's own turned on (CRT_ON_CORE); false when the body cannot take it
function crtCan(spec, kind, style) {return stylesFor(kind, spec.clade, spec.core.kind).indexOf(style) >= 0 || !!(CRT_ON_CORE[spec.core.kind] && CRT_ON_CORE[spec.core.kind][kind]);}
function crtAdd(spec, kind, style, z) {
  if (!crtCan(spec, kind, style)) return false;
  if (stylesFor(kind, spec.clade, spec.core.kind).indexOf(style) < 0) {
    CRT_ON_CORE[spec.core.kind][kind](spec.core);
    return true;
  }
  const part = {kind: kind, style: style};
  if (paramsFor(kind, style).indexOf('z') >= 0 && isFinite(z)) part.z = +(+z).toFixed(3);
  spec.parts.push(part);
  return true;
}
function crtDrop(e) {
  const g = CRT.ghost;
  CRT.ghost = null;
  if (g && g.el && g.el.parentNode) g.el.parentNode.removeChild(g.el);
  if (!g || !lab.b || mode !== 'lab') return;
  if (!labOnBody(e) && labPickPart(e) < 0) return; // dropped in the water: nothing
  const p = labPlaneHit(e, V3(0, 0, 0));
  if (!crtCan(lab.spec, g.kind, g.style)) return; // the eel's tail on the eel: nothing to add
  labUndoPush();
  crtAdd(lab.spec, g.kind, g.style, p.z);
  labBuild();
  labRender();
}
crtEl.addEventListener('mousedown', e => {
  let t = /** @type {HTMLElement} */ (e.target);
  while (t && t !== crtEl && !(t.dataset && (t.dataset.kind || t.dataset.crt || t.dataset.coat || t.dataset.load))) t = /** @type {HTMLElement} */ (t.parentNode);
  if (!t || t === crtEl || !t.dataset.kind) return;
  e.preventDefault();
  const im = document.createElement('img');
  const ti = /** @type {HTMLImageElement|null} */ (t.querySelector ? t.querySelector('img') : null);
  im.src = (ti && ti.src) || '';
  im.className = 'crt-ghost';
  im.style.left = e.clientX + 'px';
  im.style.top = e.clientY + 'px';
  document.body.appendChild(im);
  CRT.ghost = {kind: t.dataset.kind, style: t.dataset.style, el: im};
});
addEventListener('mousemove', e => {
  if (!CRT.ghost) return;
  CRT.ghost.el.style.left = e.clientX + 'px';
  CRT.ghost.el.style.top = e.clientY + 'px';
});
addEventListener('mouseup', e => {if (CRT.ghost) crtDrop(e);});
crtEl.addEventListener('click', e => {
  let t = /** @type {HTMLElement} */ (e.target);
  while (t && t !== crtEl && !(t.dataset && (t.dataset.crt || t.dataset.coat || t.dataset.load))) t = /** @type {HTMLElement} */ (t.parentNode);
  if (!t || t === crtEl) return;
  const a = t.dataset.crt;
  if (t.dataset.coat) {labUndoPush(); lab.spec.coat = t.dataset.coat; labBuild(); crtRender(); return;}
  if (t.dataset.load) {
    const v = t.dataset.load;
    CRT.pick = false;
    if (v.indexOf('saved:') === 0) {try {labLoad(specFromJSON(PROFILE.creatures[v.slice(6)]));} catch (err) {}}
    else if (SPECS[v]) labLoad(SPECS[v]);
    crtRender();
    return;
  }
  if (a === 'undo') labUndo();
  else if (a === 'redo') labRedo();
  else if (a === 'turn') lab.spin = !lab.spin;
  else if (a === 'swim') lab.cruise = !lab.cruise;
  else if (a === 'act') {if (lab.b) lab.act = 0;}
  else if (a === 'dice') {labUndoPush(); lab.spec.coat = coatFor(lab.spec.clade, lab.spec.depth !== undefined ? lab.spec.depth : -30, 'hunter', mulberry(Math.floor(Math.random() * 1e6))); labBuild();}
  else if (a === 'new') CRT.pick = !CRT.pick;
  else if (a === 'keep') {const id = String(lab.v.id || 'new').trim().slice(0, 40) || 'new'; PROFILE.creatures[id] = specToJSON(lab.v); profileSave(); CRT.icons.forEach((u, k) => {if (k.indexOf('s|' + id + '|') === 0) CRT.icons.delete(k);}); t.classList.add('on');}
  else if (a === 'done') {if (lab.conceive) conceiveClose(false); else labLeave();}
  else if (a === 'close') {if (lab.conceive) conceiveClose(true);}
  if (a !== 'keep') crtRender();
});
crtEl.addEventListener('input', e => {
  const t = /** @type {HTMLInputElement} */ (e.target);
  if (t && t.id === 'crt-name') {lab.spec.id = t.value; if (lab.v) lab.v.id = t.value;}
});
crtEl.addEventListener('keydown', e => {e.stopPropagation();});
crtEl.addEventListener('wheel', e => {e.stopPropagation();}, {passive: true});
