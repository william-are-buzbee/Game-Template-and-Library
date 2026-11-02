import * as THREE from 'three';
import type { Colour } from '../../core/math';
import { hex } from '../../core/math';
import type { Sim } from '../../sim/sim';
import { camLive, heard, speakerY, voiced } from '../../sim/eyes';
import { needs } from '../../sim/movers';
import type { DoorDef, PlatformDef } from '../../content/types';
import type { Mat } from '../../content/materials';
import type { World } from '../../world/world';
import type { Lighting } from '../../world/light';
import { apart, propVerts } from './levelMesh';
import { LENS, itemParts, lyingYaw, paperYaw, type Part } from '../../content/lying';
import { TEMPLATES } from './templates';
import { dynamicMaterial, glassMaterial, lightMaterial, matId } from './shader';
import { SignView } from './signs';
import { ExhibitView } from './exhibit';

/* What moves, drawn where the sim says it is: doors, platforms, loose crates. And the water, which does not move but
   is see-through, so it is drawn on its own. Each moving thing is lit by the room it is in. */

interface Moving {
  mesh: THREE.Object3D; mat: THREE.ShaderMaterial; place(): void;
  /** where its light is taken from, if not where it is now: a door is lit by its doorway, even slid up into the rock */
  litAt?: [number, number, number];
  /** a door: lit from whichever side of it is brighter, this far either way (x, z) */
  across?: [number, number];
  /** where it was last lit, and by which lighting as it was then (Lighting.epoch): unmoved under the same light, it is
   *  not looked up again */
  lit?: { L: Lighting; epoch: number; x: number; y: number; z: number };
}

export type { Part };

/** what a geometry is made of, all of it (matId), for the shader */
function madeOf(g: THREE.BufferGeometry, mat: number): THREE.BufferGeometry {
  if (mat) g.setAttribute('aMat', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count).fill(mat), 1));
  return g;
}

/** many parts as one geometry, all of them made of `mat` if it says (matId) */
export function parts(list: Part[], mat = 0): THREE.BufferGeometry {
  const P: number[] = [], C: number[] = [];
  list.forEach(([shape, c, sx, sy, sz, x, y, z, rz], k) => {
    const src = TEMPLATES[shape], col = hex(c), cz = Math.cos(rz ?? 0), szn = Math.sin(rz ?? 0), e = 2 * apart(k);
    for (let v = 0; v < src.length; v += 3) {
      /* each part a hair larger than it is, by its place in the list, so flush parts do not fight (levelMesh's apart) */
      const X = src[v] * (sx + e), Y = src[v + 1] * (sy + e);
      P.push(X * cz - Y * szn + x, X * szn + Y * cz + y, src[v + 2] * (sz + e) + z);
      C.push(col[0], col[1], col[2]);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3));
  g.setAttribute('aCol', new THREE.BufferAttribute(new Float32Array(C), 3));
  return madeOf(g, mat);
}

const LIVE: Colour = [2.3, 2.9, 2.4];

/** a part of a door that moves: its parts, what they are made of, and how much of the door's travel it makes (a pair of
 *  leaves going into the wall at one side: the far leaf all of it, the near one half, so they end stacked) */
interface Leaf { body: Part[]; mat?: Mat; f: number; glass?: Part[] }

/** a panel w by h by d at (x, y, z) with a hole hw by hh in it at (hx, hy) from its middle: four parts round the hole */
function holed(c: number | Colour, w: number, h: number, d: number, x: number, y: number, z: number, hx: number, hy: number, hw: number, hh: number): Part[] {
  const l = hx - hw / 2, r = hx + hw / 2, b = hy - hh / 2, t = hy + hh / 2;
  return [
    ['box', c, l + w / 2, h, d, x + (l - w / 2) / 2, y, z], ['box', c, w / 2 - r, h, d, x + (r + w / 2) / 2, y, z],
    ['box', c, hw, b + h / 2, d, x + hx, y + (b - h / 2) / 2, z], ['box', c, hw, h / 2 - t, d, x + hx, y + (t + h / 2) / 2, z],
  ];
}
/** the glass in a hole, faintly tinted */
const PANE: Colour = [0.55, 0.66, 0.7];

/** a door by its look (DoorDef.look), in its own frame: 2 m along x, centred 1.2 m up, its pocket (or its wall) toward
 *  +x when `side` is 1. Its leaves; what is fixed to the wall beside it (a reader's housing); and the lights (an
 *  indicator, a reader's, a keypad's), which show only with power enough to work it. The wall's faces are a metre
 *  either side of the slab, the doorway being 2 m deep. */
function doorLook(D: DoorDef): { leaves: Leaf[]; fixed: Part[]; lights: Part[] } {
  const sd = D.side ?? 1, look = D.look!, leaves: Leaf[] = [], fixed: Part[] = [], lights: Part[] = [];
  const paint = (body: Part[], f = 1): void => { leaves.push({ body, f }); };
  const metal = (body: Part[], f = 1): void => { leaves.push({ body, mat: 'steel', f }); };
  /* the leading edge is the one away from the pocket: the handle is there */
  const lead = -sd;
  const GLASS: Colour = [0.13, 0.16, 0.18];
  if (look === 'shutter') {
    const slats: Part[] = [['box', 0x666a6c, 2, 2.4, 0.07, 0, 0, 0]];
    for (let y = -1.08; y < 1.15; y += 0.12) slats.push(['box', 0x55595b, 2, 0.025, 0.09, 0, y, 0]);
    slats.push(['box', 0x2a2c2e, 2, 0.07, 0.11, 0, -1.165, 0], ['box', 0x8a8e90, 0.24, 0.05, 0.13, 0, -0.95, 0]);
    metal(slats);
  } else if (look === 'heavy') {
    /* a thick slab with a small port of armoured glass in it */
    leaves.push({ body: [...holed(D.lift ? 0x596068 : 0x3b4046, 2, 2.4, 0.3, 0, 0, 0, lead * 0.5, 0.35, 0.26, 0.26), ['box', 0x2a2d31, 0.14, 2.4, 0.36, 0, 0, 0]],
      mat: 'steel', f: 1, glass: [['box', PANE, 0.26, 0.26, 0.04, lead * 0.5, 0.35, 0]] });
    const bands: Part[] = [];
    for (const z of [-1, 1]) bands.push(['box', 0xb89b2e, 1.9, 0.16, 0.02, 0, -0.95, z * 0.16], ['box', 0xb89b2e, 1.9, 0.16, 0.02, 0, 0.95, z * 0.16]);
    paint(bands);
  } else if (look === 'steel' || look === 'office') {
    /* a single leaf: painted steel with a wired pane and a kick plate, or a veneered door with a strip of glass */
    const office = look === 'office';
    /* drawn to its own width, so the narrow single leaf is not a squeezed wide one */
    const W = Math.max(D.x1 - D.x0, D.z1 - D.z0), k = 2 / W, e = W / 2;
    const [hx, hy, hw, hh] = office ? [lead * (e - 0.3) * k, 0.2, 0.14 * k, 1.3] : [lead * (e - 0.4) * k, 0.32, 0.24 * k, 0.62];
    leaves.push({ body: holed(office ? 0x7a5c3e : 0x5a6168, 2, 2.4, 0.08, 0, 0, 0, hx, hy, hw, hh), f: 1, glass: [['box', PANE, hw, hh, 0.02, hx, hy, 0]] });
    /* a wired pane's wire, faint, in the glass */
    if (!office) paint([['box', GLASS, 0.006, hh, 0.03, hx, hy, 0], ['box', GLASS, hw, 0.006, 0.03, hx, hy, 0]]);
    metal([['box', 0x9a9ea2, 0.05 * k, office ? 0.05 : 0.4, 0.14, lead * (e - 0.12) * k, -0.15, 0], ...(office ? [] : [['box', 0x8a8e92, 1.92, 0.22, 0.086, 0, -1.07, 0] as Part])]);
  } else {
    /* a pair of leaves that both slide into the wall at the pocket: the far one all the way, the near one half */
    const grand = look === 'grand', leaf = grand ? 0x3a2618 : 0xc2c7c2, trim = grand ? 0x8a6a3a : 0x9aa0a4;
    for (const [near, f, z] of [[false, 1, -0.035], [true, 0.5, 0.035]] as const) {
      const x = (near ? sd : -sd) * 0.5;
      if (grand) {
        paint([['box', leaf, 1, 2.4, 0.06, x, 0, z]], f);
        metal([['box', trim, 0.05, 2.4, 0.064, x - 0.475, 0, z], ['box', trim, 0.05, 2.4, 0.064, x + 0.475, 0, z],
          ['box', trim, 1, 0.05, 0.064, x, 1.175, z], ['box', trim, 1, 0.22, 0.064, x, -1.09, z],
          ['box', trim, 0.04, 1.2, 0.1, x + lead * 0.36, 0.05, z]], f);
      } else {
        leaves.push({ body: holed(leaf, 1, 2.4, 0.06, x, 0, z, 0, 0.38, 0.36, 0.48), f, glass: [['box', PANE, 0.36, 0.48, 0.02, x, 0.38, z]] });
        metal([['box', trim, 0.98, 0.18, 0.066, x, -0.3, z], ['box', trim, 0.98, 0.2, 0.066, x, -1.08, z]], f);
      }
    }
  }
  if (D.seal) paint([[`box`, 0x2a2c2e, 1.5, 0.1, 0.4, 0, -0.1, 0], ['box', 0x2a2c2e, 1.5, 0.1, 0.4, 0, 0.6, 0]]);
  /* on the wall beside it, at the pocket's side: a reader, a keypad, a heavy door's live lamp */
  /* (in the door's frame, which is scaled to its width: k undoes it) */
  const Wd = Math.max(D.x1 - D.x0, D.z1 - D.z0), kd = 2 / Wd, wx = sd * (Wd / 2 + 0.32) * kd, face = (D.depth ?? 2) / 2 + 0.02;
  for (const z of [-face, face]) {
    if (D.card) { fixed.push(['box', 0x22262a, 0.12 * kd, 0.18, 0.04, wx, -0.05, z]); lights.push(['box', [2.25, 2.45, 2.85], 0.08 * kd, 0.04, 0.05, wx, 0.01, z]); }
    if (D.code) {
      fixed.push(['box', 0x22262a, 0.16 * kd, 0.24, 0.04, wx, -0.05, z]);
      for (let q = 0; q < 9; q++) lights.push(['box', [2.5, 2.6, 2.5], 0.028 * kd, 0.028, 0.05, wx + (-0.045 + (q % 3) * 0.045) * kd, -0.12 + Math.floor(q / 3) * 0.055, z]);
    }
    if (look === 'heavy') lights.push(['box', LIVE, 0.1 * kd, 0.1, 0.04, wx, 0.35, z]);
  }
  return { leaves, fixed, lights };
}

/** a door as the first engine drew it, in its own frame: 2 m along x, centred 1.2 m up. Returns the slab and the lights
 *  (indicators, reader, keypad), which show only with power enough to work it. The lift's door and a loose panel are
 *  still drawn so */
function doorParts(D: DoorDef): { body: Part[]; lights: Part[] } {
  const heavy = D.kind === 'heavy', W = 2, body: Part[] = [], lights: Part[] = [];
  if (heavy) {
    body.push(['box', D.lift ? 0x596068 : 0x3b4046, W, 2.4, 0.3, 0, 0, 0], ['box', 0x2a2d31, 0.14, 2.4, 0.36, 0, 0, 0]);
    for (const s of [-1, 1]) {
      body.push(['box', 0xb89b2e, W - 0.1, 0.16, 0.02, 0, -0.95, s * 0.16], ['box', 0xb89b2e, W - 0.1, 0.16, 0.02, 0, 0.95, s * 0.16]);
      lights.push(['box', LIVE, 0.12, 0.12, 0.04, -0.72, 0.05, s * 0.17]);
    }
  } else {
    body.push(['box', D.seal ? 0x45484c : 0x666c73, W, 2.4, 0.1, 0, 0, 0], ['box', 0x15181b, 0.5, 0.3, 0.12, 0, 0.5, 0], ['box', 0x4a4f55, W, 0.1, 0.14, 0, -1.1, 0]);
  }
  if (D.seal) for (const s of [-1, 1]) body.push(['box', 0x2a2c2e, 1.5, 0.1, 0.06, 0, -0.1, s * 0.1]);
  const f = heavy ? 0.17 : 0.07;
  if (D.card) for (const s of [-1, 1]) { body.push(['box', 0x22262a, 0.16, 0.24, 0.04, 0.72, 0.1, s * f]); lights.push(['box', [2.25, 2.45, 2.85], 0.1, 0.05, 0.05, 0.72, 0.16, s * (f + 0.01)]); }
  if (D.code) for (const s of [-1, 1]) {
    body.push(['box', 0x22262a, 0.18, 0.26, 0.04, 0.72, 0.1, s * f]);
    for (let q = 0; q < 9; q++) lights.push(['box', [2.5, 2.6, 2.5], 0.03, 0.03, 0.05, 0.67 + (q % 3) * 0.05, 0.03 + Math.floor(q / 3) * 0.06, s * (f + 0.005)]);
  }
  return { body, lights };
}

/** a camera in its own frame: looking along +z from its lens at the origin, on a stalk up to its mount */
const CAM: Part[] = [
  ['box', 0xb8bcc0, 0.17, 0.17, 0.36, 0, 0, -0.2], ['box', 0x15181b, 0.12, 0.12, 0.03, 0, 0, 0.0],
  ['box', 0x2c2f33, 0.05, 0.4, 0.05, 0, 0.28, -0.3], ['box', 0x2c2f33, 0.14, 0.04, 0.14, 0, 0.48, -0.3],
];

/** a platform as the first engine drew it: deck, hazard edges, corner posts, a control post; its top at y 0. A hoist's
 *  car (PlatformDef.look) is caged east and west, open north and south where it is boarded, with a roof and its two
 *  drive units on it on the mast's side (east), and its controls on a wall; a goods lift's carriage has guards at its
 *  sides and its controls on a post at a corner */
function platformParts(w: number, h: number, look?: PlatformDef['look']): Part[] {
  const out: Part[] = [
    ['box', 0x4a4f55, w - 0.12, 0.16, h - 0.12, 0, -0.08, 0], ['box', 0xb89b2e, w - 0.12, 0.02, 0.12, 0, 0.01, h / 2 - 0.14], ['box', 0xb89b2e, w - 0.12, 0.02, 0.12, 0, 0.01, -h / 2 + 0.14],
  ];
  const X = w / 2 - 0.06, Z = h / 2 - 0.06, GALV = 0x8a8f94, BAR = 0x5a5d60;
  if (look === 'hoist') {
    const top = 2.3;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push(['box', GALV, 0.08, top, 0.08, sx * X, top / 2, sz * Z]);
    for (const sx of [-1, 1]) {
      for (const y of [0.05, 1.1, top]) out.push(['box', GALV, 0.06, 0.06, h - 0.12, sx * X, y, 0]);
      for (let z = -Z + 0.25; z < Z - 0.1; z += 0.25) out.push(['box', BAR, 0.02, top - 0.1, 0.02, sx * X, top / 2, z]);
    }
    for (const sz of [-1, 1]) out.push(['box', GALV, w - 0.12, 0.06, 0.06, 0, top, sz * Z]);
    out.push(['box', 0x6b6e70, w - 0.1, 0.05, h - 0.1, 0, top + 0.05, 0]);
    for (const sz of [-0.55, 0.55]) out.push(['box', 0x3d5a44, 0.6, 0.55, 0.5, X - 0.4, top + 0.35, sz * h / 2.8], ['cyl', 0x2a2c2e, 0.42, 0.75, 0.42, X - 1.05, top + 0.3, sz * h / 2.8, Math.PI / 2]);
    for (const sz of [-1, 1]) out.push(['box', 0xc9a227, w - 0.12, 0.05, 0.05, 0, top + 1.05, sz * Z]);
    out.push(['box', 0x2c2f33, 0.12, 0.5, 0.36, X - 0.1, 1.25, -Z + 0.5], ['box', LIVE, 0.03, 0.1, 0.1, X - 0.17, 1.4, -Z + 0.5]);
  } else if (look === 'goods') {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push(['box', 0xc9a227, 0.07, 1.1, 0.07, sx * X, 0.55, sz * Z]);
    for (const sx of [-1, 1]) for (const y of [0.55, 1.1]) out.push(['box', 0xc9a227, 0.06, 0.06, h - 0.12, sx * X, y, 0]);
    out.push(['box', 0x2c2f33, 0.2, 1.1, 0.2, -X + 0.25, 0.55, -Z + 0.25], ['box', LIVE, 0.1, 0.1, 0.22, -X + 0.25, 1.05, -Z + 0.25]);
  } else {
    out.push(['box', 0x2c2f33, 0.2, 1.1, 0.2, 0, 0.55, 0], ['box', LIVE, 0.1, 0.1, 0.22, 0, 1.05, 0]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push(['box', 0x8a7a2a, 0.08, 1.1, 0.08, sx * (w / 2 - 0.14), 0.55, sz * (h / 2 - 0.14)]);
  }
  return out;
}

function coloured(src: Float32Array, c: Colour, mat = 0): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry(), n = src.length / 3, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set(c, i * 3);
  g.setAttribute('position', new THREE.BufferAttribute(src, 3));
  g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  return madeOf(g, mat);
}

export class Things {
  private list: Moving[] = [];
  private signs: SignView;
  private exhibit: ExhibitView;

  /** the power changed: signs and the exhibit's boards take the light where they hang (door lights follow in update) */
  setLighting(L: Lighting): void {
    this.L = L;
    this.signs?.setLighting(L);
    this.exhibit?.setLighting(L);
  }

  constructor(private scene: THREE.Object3D, private sim: Sim, private L: Lighting) {
    const w = sim.world;
    for (const d of sim.doors) {
      if (d.def.glass) { this.pane(d.def); continue; }
      const D = d.def, long = Math.max(D.x1 - D.x0, D.z1 - D.z0), need = needs(D);
      const at: [number, number, number] = [(D.x0 + D.x1) / 2, D.y0, (D.z0 + D.z1) / 2], across: [number, number] = D.alongX ? [0, 0.6] : [0.6, 0];
      const rot = D.alongX ? 0 : Math.PI / 2;
      /* where it stands: a sliding leaf `f` of its slide along its length; anything else where its box is */
      const place = (m: THREE.Object3D, f = 1) => {
        if (D.slides) {
          const s = (D.side ?? 1) * (long - 0.02) * d.t * f;
          m.position.set(at[0] + (D.alongX ? s : 0), D.y0 + 1.2, at[2] + (D.alongX ? 0 : s));
        } else m.position.set((d.dyn.x0 + d.dyn.x1) / 2, d.dyn.y0 + 1.2, (d.dyn.z0 + d.dyn.z1) / 2);
        m.rotation.y = rot;
        m.scale.set(long / 2, 1, 1);
        if (D.vent) m.visible = d.t < 0.5;
      };
      const still = (m: THREE.Object3D) => { m.position.set(at[0], D.y0 + 1.2, at[2]); m.rotation.y = rot; m.scale.set(long / 2, 1, 1); };
      /* its lights show only with power enough to work it */
      const lit = () => this.L.power(D.circuit) >= need && !D.vent;
      if (D.look) {
        const { leaves, fixed, lights } = doorLook(D);
        for (const L of leaves) {
          this.add(parts(L.body, matId(L.mat)), m => place(m, L.f), at, across);
          if (L.glass) this.add(parts(L.glass, matId('glass')), m => { place(m, L.f); m.renderOrder = 1; }, at, across, 0.2);
        }
        if (fixed.length) this.add(parts(fixed), still, at, across);
        if (lights.length) this.add(parts(lights), m => { still(m); m.visible = lit(); }, at, across);
      } else {
        const { body, lights } = doorParts(D);
        this.add(parts(body, matId(D.mat)), m => place(m), at, across);
        if (lights.length) this.add(parts(lights), m => { place(m); m.visible = lit(); }, at, across);
      }
      /* its reader, just shown a card by one of the staff (sim/cast.ts, the night round): green, or red, a moment */
      if (D.card) {
        const flash = (ok: boolean) => (m: THREE.Object3D) => { m.visible = d.beep > 0 && d.beepOk === ok && lit(); };
        for (const [c, ok] of [[[0.3, 2.8, 0.5], true], [[2.9, 0.3, 0.25], false]] as [Colour, boolean][]) {
          if (D.look) {
            const kd = 2 / long, wx = (D.side ?? 1) * (long / 2 + 0.32) * kd, face = (D.depth ?? 2) / 2 + 0.03;
            this.add(parts([-1, 1].map(s => ['box', c, 0.085 * kd, 0.045, 0.05, wx, 0.01, s * face] as Part)), m => { still(m); flash(ok)(m); }, at, across);
          } else {
            const f = D.kind === 'heavy' ? 0.17 : 0.07;
            this.add(parts([-1, 1].map(s => ['box', c, 0.105, 0.055, 0.05, 0.72, 0.16, s * (f + 0.02)] as Part)), m => { place(m); flash(ok)(m); }, at, across);
          }
        }
      }
      /* locked down: a red lamp on the wall beside it, on both faces, flashing while its bolt is drawn and steady once
         it is home */
      if (!(D.seal || D.vent || D.lift || D.stuck)) {
        const k = 2 / long, wx = (D.side ?? 1) * (long / 2 + 0.32) * k, face = (D.depth ?? 2) / 2 + 0.03;
        this.add(parts([-1, 1].map(s => ['box', [2.9, 0.35, 0.3], 0.14 * k, 0.14, 0.05, wx, 0.75, s * face] as Part)), m => {
          still(m);
          m.visible = d.down || (d.drawing > 0 && Math.floor(performance.now() / 150) % 2 === 0);
        }, at, across);
      }
    }
    for (const p of sim.platforms) {
      const D = p.def;
      this.add(parts(platformParts(D.x1 - D.x0, D.z1 - D.z0, D.look), matId(D.mat)), m => m.position.set((D.x0 + D.x1) / 2, p.y, (D.z0 + D.z1) / 2));
    }
    /* the cameras: one guarding an armed room has a light, green while it watches and red while it holds you, and none
       without power; one that only records has none. A smashed one hangs askew. Its zones' speakers, with a beacon that turns while the zone sounds. */
    for (const c of sim.cams) {
      const C = c.def, live = () => camLive(sim, c);
      const place = (m: THREE.Object3D) => { m.position.set(C.x, C.y, C.z); m.rotation.set(c.broken ? 0.7 : 0, C.yaw, c.broken ? 0.4 : 0); };
      this.add(parts(CAM), place);
      this.add(parts([['box', [0.4, 2.6, 0.7], 0.045, 0.045, 0.045, 0, 0.1, 0]]), m => { place(m); m.visible = c.guard && live() && c.hold === 0; });
      this.add(parts([['box', [2.9, 0.35, 0.3], 0.05, 0.05, 0.05, 0, 0.1, 0]]), m => { place(m); m.visible = c.guard && live() && c.hold > 0; });
    }
    /* a call point's pane, until it is broken */
    w.def.uses.forEach((u, ui) => {
      if (u.kind !== 'call') return;
      const face = u.opts.face as string, ew = face === 'e' || face === 'w', o = face === 'e' || face === 's' ? -1 : 1;
      const use = sim.usables.find(q => q.key === 'use' + ui);
      this.add(parts([['box', [0.75, 0.82, 0.86], ew ? 0.01 : 0.13, 0.13, ew ? 0.13 : 0.01, 0, 0, 0]]), m => {
        m.position.set(u.x + (ew ? o * 0.12 : 0), u.y - 0.03, u.z + (ew ? 0 : o * 0.12)); m.visible = !use?.off; // over the button, against the box
      });
    });
    /* a comms cupboard's switch, on its rack under the patch panel: its link lights lit while its branch has power and it
       is whole; smashed, it hangs off the rack by its cables, dark, and the branch's cameras with it */
    w.def.uses.forEach(u => {
      if (u.kind !== 'comms') return;
      const c = u.opts.c as string, [nx, nz] = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[u.opts.face as 'n' | 's' | 'e' | 'w'];
      const yaw = Math.atan2(nx, nz), smashed = () => sim.blind.includes(c);
      const place = (m: THREE.Object3D) => {
        const b = smashed();
        m.position.set(u.x + (b ? nx * 0.06 : 0), u.y - (b ? 0.14 : 0), u.z + (b ? nz * 0.06 : 0));
        m.rotation.set(b ? 0.5 : 0, yaw, b ? 0.35 : 0);
      };
      this.add(parts([['box', 0x3a3d40, 0.48, 0.09, 0.02, 0, 0, -0.01]]), place);
      const lights = Array.from({ length: 8 }, (_, k): Part => ['box', [0.4, 2.6, 0.6], 0.03, 0.015, 0.01, -0.2 + k * 0.057, 0.003, 0.005]);
      this.add(parts(lights), m => { place(m); m.visible = !smashed() && this.L.power(c) >= 1; });
    });
    for (const S of w.def.speakers ?? []) {
      /* it hangs from the ceiling: lit by the room under it, not by what is above */
      const y = speakerY(w, S), dead = () => !voiced(sim, S.zone), at: [number, number, number] = [S.x, y - 1, S.z];
      this.add(parts([['box', 0x2c2f33, 0.5, 0.12, 0.5, 0, -0.06, 0]]), m => m.position.set(S.x, y, S.z), at);
      /* a smashed one's horn hangs off its mount by the wires */
      this.add(parts([['cyl', 0x3a3d40, 0.34, 0.22, 0.34, 0, -0.23, 0]]), m => {
        m.position.set(S.x, y - (dead() ? 0.12 : 0), S.z); m.rotation.set(dead() ? 0.9 : 0, 0, dead() ? 0.3 : 0);
      }, at);
      this.add(parts([['box', [2.9, 1.6, 0.3], 0.16, 0.12, 0.16, 0, -0.4, 0]]), m => {
        m.position.set(S.x, y, S.z);
        m.visible = heard(sim, S.zone) && sim.alarms.some(a => a.zone === S.zone) && Math.floor(performance.now() / 300) % 2 === 0;
      });
    }
    this.signs = new SignView(scene, w, L);
    this.exhibit = new ExhibitView(scene, w, L);
    this.setLighting(L);
    sim.loose.all.forEach((o, k) => {
      /* a hair larger than it is, so a crate on the floor or on another does not fight it (levelMesh's apart) */
      const pts: number[] = [], e = apart(k), P = o.prop;
      propVerts({ ...P, ry: 0, sx: P.sx + 2 * e, sy: P.sy + 2 * e, sz: P.sz + 2 * e }, (x, y, z) => pts.push(x, y, z), { x: 0, y: -e, z: 0 });
      this.add(coloured(new Float32Array(pts), o.prop.colour, matId(o.prop.mat)), m => m.position.set(o.x, o.y, o.z));
    });
    for (const n of w.def.notes) if (!n.bare) this.addFixed(parts(itemParts('note')), n.x, n.y, n.z, paperYaw(n));
    this.glazing(w);
    this.water(w);
  }

  /** things you can pick up: drawn until taken; anything put down later appears */
  private items = 0;
  private itemMeshes: { mesh: THREE.Object3D; shown: () => boolean }[] = [];
  private syncItems(): void {
    for (; this.items < this.sim.items.length; this.items++) {
      const it = this.sim.items[this.items];
      /* turned as it lies: a light lying on, the way it shines; something put down on a shelf or a desk, square to it */
      const yaw = lyingYaw(it), m =this.addFixed(parts(itemParts(it.id)), it.x, it.y, it.z, yaw);
      this.itemMeshes.push({ mesh: m, shown: () => !it.taken });
      if (it.id === 'flash') {
        const lens = this.addFixed(parts(LENS), it.x, it.y, it.z, yaw);
        this.itemMeshes.push({ mesh: lens, shown: () => !it.taken && !!it.on });
      }
    }
    for (const im of this.itemMeshes) im.mesh.visible = im.shown();
  }
  private addFixed(geo: THREE.BufferGeometry, x: number, y: number, z: number, yaw: number): THREE.Mesh {
    const mat = dynamicMaterial(), mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = yaw;
    this.scene.add(mesh);
    this.list.push({ mesh, mat, place: () => {} });
    return mesh;
  }

  private add(geo: THREE.BufferGeometry, place: (m: THREE.Mesh) => void, litAt?: [number, number, number], across?: [number, number], alpha?: number): void {
    const mat = dynamicMaterial(alpha), mesh = new THREE.Mesh(geo, mat);
    this.scene.add(mesh);
    this.list.push({ mesh, mat, place: () => place(mesh), litAt, across });
  }

  /** a window's pane: faintly tinted glass in a dark frame, lit where it stands when the level is drawn */
  private pane(D: DoorDef): void {
    const h = D.y1 - D.y0, w = Math.max(D.x1 - D.x0, D.z1 - D.z0), my = D.y0 + h / 2;
    const cx = (D.x0 + D.x1) / 2, cz = (D.z0 + D.z1) / 2, l = this.L.atPoint(cx, my, cz), rot = D.alongX ? 0 : Math.PI / 2;
    const g = parts([['box', [0.55, 0.66, 0.7], w, h, 0.03, 0, 0, 0]], matId(D.mat)), n = g.getAttribute('position').count, L = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) L.set([0.02 + l[0], 0.025 + l[1], 0.03 + l[2], 0], i * 4); // in the dark it is all but gone
    g.setAttribute('aLight', new THREE.BufferAttribute(L, 4));
    const m = new THREE.Mesh(g, glassMaterial(0.18));
    m.position.set(cx, my, cz); m.rotation.y = rot; m.frustumCulled = false; m.renderOrder = 1;
    this.scene.add(m);
    const e = w / 2 - 0.04, v = h / 2;
    const frame: Part[] = [['box', 0x2a2c2e, w, 0.08, 0.12, 0, v, 0], ['box', 0x2a2c2e, w, 0.08, 0.12, 0, -v, 0], ['box', 0x2a2c2e, 0.08, h, 0.12, -e, 0, 0], ['box', 0x2a2c2e, 0.08, h, 0.12, e, 0, 0]];
    this.add(parts(frame), f => { f.position.set(cx, my, cz); f.rotation.y = rot; }, [cx, D.y0, cz]);
  }

  /** the level's glass that is not a window in a wall (a balustrade, a booth, a screen): every prop made of glass, as
   *  one see-through mesh, each pane lit where it stands when the level is drawn */
  private glazing(w: World): void {
    const P: number[] = [], C: number[] = [], L: number[] = [], M: number[] = [], id = matId('glass');
    for (const p of w.def.props) {
      if (p.mat !== 'glass') continue;
      const l = this.L.atPoint(p.x, p.y + p.sy / 2, p.z), n0 = P.length / 3;
      propVerts(p, (x, y, z) => P.push(x, y, z));
      for (let i = n0; i < P.length / 3; i++) { C.push(...p.colour); L.push(0.02 + l[0], 0.025 + l[1], 0.03 + l[2], 0); M.push(id); }
    }
    if (!P.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3));
    g.setAttribute('aCol', new THREE.BufferAttribute(new Float32Array(C), 3));
    g.setAttribute('aLight', new THREE.BufferAttribute(new Float32Array(L), 4));
    g.setAttribute('aMat', new THREE.BufferAttribute(new Float32Array(M), 1));
    const m = new THREE.Mesh(g, glassMaterial(0.18));
    m.frustumCulled = false; m.renderOrder = 1;
    this.scene.add(m);
  }

  private water(w: World): void {
    if (!w.water.length) return;
    const P: number[] = [], C: number[] = [], L: number[] = [], c: Colour = [0.07, 0.13, 0.14]; // the first engine's water
    for (const s of w.water) {
      const l = this.L.atPoint((s.x0 + s.x1) / 2, s.level + 0.1, (s.z0 + s.z1) / 2);
      for (const [x, z] of [[s.x0, s.z0], [s.x1, s.z0], [s.x1, s.z1], [s.x0, s.z0], [s.x1, s.z1], [s.x0, s.z1]]) {
        P.push(x, s.level, z); C.push(...c); L.push(l[0], l[1], l[2], 0);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3));
    g.setAttribute('aCol', new THREE.BufferAttribute(new Float32Array(C), 3));
    g.setAttribute('aLight', new THREE.BufferAttribute(new Float32Array(L), 4));
    const m = new THREE.Mesh(g, glassMaterial(0.78));
    m.frustumCulled = false;
    m.renderOrder = 1;
    this.scene.add(m);
  }

  /** move everything to where the sim has it, and light it by where it is */
  update(): void {
    this.syncItems();
    const L = this.L;
    for (const t of this.list) {
      t.place();
      const p = t.litAt ? { x: t.litAt[0], y: t.litAt[1], z: t.litAt[2] } : t.mesh.position, w = this.sim.world, was = t.lit;
      if (was && was.L === L && was.epoch === L.epoch && was.x === p.x && was.y === p.y && was.z === p.z) continue;
      t.lit = { L, epoch: L.epoch, x: p.x, y: p.y, z: p.z };
      const R = w.roomAt(p.x, p.y + 0.3, p.z) ?? w.roomAt(p.x, p.y + 1.2, p.z);
      let at = [p.x, p.y + 0.3, p.z] as const, l = R ? this.L.atPoint(...at) : [0, 0, 0];
      if (R && t.across)
        for (const k of [-1, 1]) {
          const q = [p.x + k * t.across[0], p.y + 0.3, p.z + k * t.across[1]] as const, o = this.L.atPoint(...q);
          if (Math.max(...o) > Math.max(...l)) { l = o; at = q; }
        }
      lightMaterial(t.mat, l, R ? this.L.flickAt(...at) : [0, 0, 0], R ? this.L.towards(...at) : [0, 0, 0]);
    }
  }
}
