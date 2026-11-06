import { PI, TAU } from '../../core/math';
import { DUG } from '../materials';
import { P, bx, colT, door, holds, item, mut, owns, pick, rnd, room, stain, stairs, use, type Col, type Floor, type PRoom, type RoomOpts } from './plan';

/* The station's furniture, clutter and fittings (the first engine's, ported as they were, so the station looks as it
   did), in plan metres; their randomness comes from the level's own seed. */

/* ---- palettes: colours, and what rooms are made of (world.md §1, *The station as built*). Lowfield is mined: a room
   dug and left as dug is shotcrete over the rock on a poured floor (utility rooms, the plant, the bays); every other
   room is a box built inside the rock. The family's own fabric, from the 80s, is where people walked: terrazzo
   underfoot, painted block in Security, glazed tile where things are washed down, plaster in homes, limestone where
   visitors came. The refit since laid its own over it: coated floors in Security and Horticulture, sheet vinyl in
   medical rooms, plasterboard and carpet in offices. One house throughout: the colours stay warm wherever people walked,
   and a cold or bare room is one behind a door with a practical job (world.md §1, *Finish by route*). */
export const CELL: RoomOpts = { fl: 0x4e5052, wl: 0x666a6e, st: 0xa8521e };
export const UTIL: RoomOpts = { fl: 0x505254, wl: 0x6a6d6c, st: 0xb89b2e, mat: DUG };
export const HAB: RoomOpts = { fl: 0x7b7568, wl: 0x9a9588, st: 0x3f7f6b, mat: { floor: 'carpet', wall: 'plaster', ceiling: 'plaster' } };
export const MED: RoomOpts = { fl: 0x9aa39d, wl: 0xb9c4bd, st: 0x8c2f24, mat: { floor: 'vinyl', wall: 'glazed', ceiling: 'tiles' } };
/** Security: a notch under Operations, not another house. The refit's coated floor, flaked, and the painted block in
 *  warm greys, under tubes of a neutral white rather than a cold one, and navy only in its stripe and its signs' bar */
export const SEC: RoomOpts = { fl: 0x645d55, wl: 0x8a8378, st: 0x39485a, lc: [0.86, 0.84, 0.78], mat: { floor: 'flake', wall: 'block' } };
export const OPS: RoomOpts = { fl: 0x847c70, wl: 0x8c887e, st: 0x8a7a4a, mat: { floor: 'terrazzo', wall: 'block', ceiling: 'tiles' } };
/** an office, refitted: plasterboard, carpet, a suspended ceiling; a taupe carpet, a shade under the check-in hall's,
 *  and a warm white */
export const OFF: RoomOpts = { fl: 0x5a5148, wl: 0x9e9688, st: 0x6e5a40, lc: [0.88, 0.84, 0.76], mat: { floor: 'carpet', wall: 'board', ceiling: 'tiles' } };
/** where the family's visitors walked: terrazzo, limestone to 4 m and plaster over it, a plastered ceiling */
export const FAM: RoomOpts = { fl: 0x8a8070, wl: 0xa3967e, st: 0x7a5a30, mat: { floor: 'terrazzo', wall: 'stone', ceiling: 'plaster', upper: 'plaster' } };
/** Horticulture: the green's own, and its air is full of spores */
export const HRT: RoomOpts = { fl: 0x3d4a30, wl: 0x5a6a4c, st: 0x2f5a34, motes: 'spores', mat: { floor: 'epoxy', wall: 'glazed' } };
export const BAY: RoomOpts = { fl: 0x4a4c4e, wl: 0x5e6164, st: 0xb89b2e, ht: 8, em: 1, mat: { ...DUG, floor: 'epoxy' } };
export const WALK: RoomOpts = { open: 1, ht: 4, em: 1, fl: 0x5a5d60, wl: 0x5e6164, nolamp: 1 };
export const LOW: [number, number, number] = [0.66, 0.68, 0.72];

/* ---- furniture */
export function bed(F: Floor, x: number, z: number, ns: boolean, c = 0x80848c): void {
  const w = ns ? 0.95 : 2, d = ns ? 2 : 0.95;
  bx(F, x, z, w, 0.32, d, 0x3a3d42);
  bx(F, x, z, w - 0.06, 0.12, d - 0.06, c, { y: 0.32, c: 0 });
  bx(F, x + (ns ? 0 : -0.7), z + (ns ? -0.7 : 0), ns ? 0.6 : 0.32, 0.07, ns ? 0.32 : 0.6, 0xc4c4bc, { y: 0.44, c: 0 });
}
export function tbl(F: Floor, x: number, z: number, w: number, d: number, c = 0x5b5d5f): void {
  const ns = d > w;
  bx(F, x, z, w, 0.05, d, c, { y: 0.71, c: 0 });
  for (const s of [-1, 1]) bx(F, x + (ns ? 0 : s * (w / 2 - 0.08)), z + (ns ? s * (d / 2 - 0.08) : 0), ns ? w - 0.1 : 0.06, 0.71, ns ? 0.06 : d - 0.1, 0x33363a, { c: 0 });
  colT(F, x, z, w, d);
}
export function shelf(F: Floor, x: number, z: number, w: number, d: number, o: { empty?: number; jars?: number; cols?: number[] } = {}): void {
  const ns = d > w, L = ns ? d : w;
  for (const y of [0.1, 0.55, 1, 1.45, 1.86]) bx(F, x, z, w, 0.04, d, 0x4a4d50, { y, c: 0 });
  for (const s of [-1, 1]) bx(F, x + (ns ? 0 : s * (w / 2 - 0.02)), z + (ns ? s * (d / 2 - 0.02) : 0), ns ? w : 0.04, 1.9, ns ? 0.04 : d, 0x3a3d40, { c: 0 });
  /* what is on it: each board in slots along it, one thing a slot, so nothing stands in anything else; some slots
     empty. As tall as the gap to the board over it allows. It is goods: anything put on the shelf later takes the place
     of what stood there (builder.ts, clear) */
  if (!o.empty)
    for (const y of [0.14, 0.59, 1.04, 1.49]) {
      const n = L > 2 ? 4 : 3, slot = (L - 0.2) / n;
      for (let k = 0; k < n; k++) {
        if (rnd(0, 1) < 0.3) continue;
        const t = -L / 2 + 0.1 + slot * (k + 0.5) + rnd(-0.05, 0.05) * slot, s = Math.min(rnd(0.15, 0.3), slot * 0.8);
        const deep = Math.min(s, (ns ? w : d) - 0.08);
        P(F, o.jars ? 'cyl' : 'box', x + (ns ? 0 : t), z + (ns ? t : 0), ns ? deep : s, rnd(0.14, 0.34), ns ? s : deep, pick(o.cols ?? [0x6b5a3c, 0x4d5a66, 0x7a4a34, 0x5c6b4a]), { y, c: 0, goods: true });
      }
    }
  colT(F, x, z, w, d, 1.9);
}
export function desk(F: Floor, x: number, z: number, w: number, d: number, o: { c?: number; bare?: number } = {}): void {
  tbl(F, x, z, w, d, o.c);
  if (!o.bare) {
    bx(F, x, z, 0.5, 0.34, 0.06, 0x22262a, { y: 0.76, c: 0 });
    bx(F, x, z + 0.04, 0.44, 0.28, 0.02, [0.06, 0.12, 0.1], { y: 0.79, c: 0, pw: [[0.04, 0.05, 0.05], [2.2, 2.75, 2.5]] });
  }
}
/** where a hospital bed's drip stands (m): beside it, toward its head, on whichever side it is put (medbed) */
export const POLE = { across: 0.6, along: -0.8 };
/** a hospital bed, its head to the north, and its drip on a pole by the head on side `pole` (east, or -1 for west) */
export function medbed(F: Floor, x: number, z: number, pole: 1 | -1 = 1): void {
  bed(F, x, z, true, 0xd4d8d4);
  const px = x + pole * POLE.across, pz = z + POLE.along;
  bx(F, px, pz, 0.05, 1.7, 0.05, 0xa8acae, { c: 0 });
  bx(F, px, pz, 0.14, 0.2, 0.08, 0xc8d4d8, { y: 1.5, c: 0 });
}

/* ---- what happened here */
/** blood on the floor, `s` across: never square, a pool and what ran from it */
export function blood(F: Floor, x: number, z: number, s: number): void {
  /* on the floor, each splash a hair over the last so none fights another */
  P(F, 'cyl', x, z, s, 0.01, s * rnd(0.6, 1), 0x3a0b0b, { y: 0.001, c: 0, ry: rnd(PI) });
  stain(F, x, z, s * 0.5);
  for (let k = 0; k < 3; k++) P(F, 'cyl', x + rnd(-s, s) * 0.8, z + rnd(-s, s) * 0.8, s * rnd(0.15, 0.4), 0.01, s * rnd(0.15, 0.4), 0x450d0c, { y: 0.003 + k * 0.002, c: 0, ry: rnd(PI) });
}
export function gore(F: Floor, x: number, z: number, n: number): void {
  blood(F, x, z, 1.5);
  for (let k = 0; k < n; k++) P(F, 'ico', x + rnd(-0.6, 0.6), z + rnd(-0.6, 0.6), rnd(0.2, 0.5), rnd(0.12, 0.3), rnd(0.2, 0.5), pick([0x6e2b28, 0x4e1616, 0x8c4a44, 0xcbbfa8]), { c: 0 });
}
export function eggs(F: Floor, x: number, z: number, n: number): void {
  for (let k = 0; k < n; k++) P(F, 'ico', x + rnd(-0.6, 0.6), z + rnd(-0.6, 0.6), rnd(0.3, 0.45), rnd(0.45, 0.65), rnd(0.3, 0.45), pick([0xb9a98a, 0xa89a80, 0xc4b08e]), { c: 0 });
}
/** one of the station's dead where it fell, its middle at (x, z) and dressed in `c`: lying north to south (ns), its head
 *  to the north, or west to east, its head to the west; on its back in the blood it lost. A body like any other, which a
 *  walk or a blow moves (sim/cast.ts, MT.dead): laid by its feet, a metre from its middle, and knowing where that was, so
 *  a search there is of it (sim/interact.ts) */
export function body(F: Floor, x: number, z: number, c: number, ns: boolean): void {
  blood(F, x, z, 1.2);
  mut(F, 'dead', ns ? x : x + 1, ns ? z + 1 : z, { yaw: ns ? 0 : PI / 2, c, lies: [x, z] });
}
export function corpse(F: Floor, x: number, z: number, c: number, ns: boolean, o: Record<string, unknown>): void {
  body(F, x, z, c, ns);
  use(F, 'body', x, z, 0.3, o);
}

/* ---- growth: the green kind */
/** the greens of the garden */
export const GR = [0x3f6a3a, 0x4f7a40, 0x2f5a34, 0x5a7a3a, 0x6a8a44, 0x2a4a2c];
export function bush(F: Floor, x: number, z: number, s: number): void {
  for (let k = 0; k < 3; k++) P(F, 'ico', x + rnd(-0.4, 0.4) * s, z + rnd(-0.4, 0.4) * s, rnd(0.5, 1) * s, rnd(0.4, 0.9) * s, rnd(0.5, 1) * s, pick(GR), { c: 0, y: -rnd(0, 0.1) });
}
export function stalk(F: Floor, x: number, z: number, h: number): void {
  P(F, 'cyl', x, z, 0.14, h, 0.14, 0x3a5a30, { c: 0, rz: rnd(-0.1, 0.1) });
  P(F, 'ico', x, z, rnd(0.5, 0.9), rnd(0.3, 0.5), rnd(0.5, 0.9), pick(GR), { c: 0, y: h - 0.1 });
  for (let k = 0; k < 3; k++) { const a = rnd(TAU); bx(F, x + Math.cos(a) * 0.3, z - Math.sin(a) * 0.3, 0.7, 0.03, 0.2, pick(GR), { c: 0, y: h * rnd(0.3, 0.8), ry: a, rz: 0.4 }); }
}
export function shroom(F: Floor, x: number, z: number, s: number, glow: boolean): void {
  P(F, 'cyl', x, z, 0.12 * s, 0.5 * s, 0.12 * s, 0xc8c0a0, { c: 0 });
  P(F, 'ico', x, z, 0.6 * s, 0.22 * s, 0.6 * s, glow ? [2.35, 2.8, 2.5] : pick([0x9a6a4a, 0x8a4a44, 0xb09060]), { c: 0, y: 0.45 * s });
}
export function moss(F: Floor, x: number, z: number, s: number): void {
  bx(F, x, z, s * rnd(0.7, 1.3), 0.02, s * rnd(0.7, 1.3), pick([0x2f4a2a, 0x3a5230, 0x44502a, 0x2a3a22, 0x4a4a22]), { y: 0.002 + rnd(0.008), c: 0, ry: rnd(PI), lie: true });
}
export function tree(F: Floor, x: number, z: number, h: number, y0: number, sick: boolean): void {
  P(F, 'cyl', x, z, 0.34, h, 0.34, 0x4a3b2c, { y: y0, c: 0 });
  for (let k = 0; k < 6; k++) { const a = rnd(TAU), L = rnd(0.9, 1.7); bx(F, x + Math.cos(a) * L * 0.45, z - Math.sin(a) * L * 0.45, L, 0.07, 0.07, 0x40332a, { y: y0 + h * 0.45 + k * h * 0.09, c: 0, ry: a, rz: 0.6 }); }
  if (sick) for (let k = 0; k < 4; k++) P(F, 'ico', x + rnd(-0.3, 0.3), z + rnd(-0.3, 0.3), rnd(0.3, 0.6), rnd(0.3, 0.5), rnd(0.3, 0.6), pick([0x8c4a44, 0x6e2b28, 0xb08572]), { y: y0 + rnd(0.3, h * 0.7), c: 0 });
}
/** where growth is: a room, or any box of floor with a height over it (and, named, the room it is in) */
export type Ground = Pick<PRoom, 'x0' | 'z0' | 'x1' | 'z1' | 'ht'> & { name?: string };

/** how far the room named `name` runs on from (x, z) in it toward (dx, dz) (within 2 m): to the wall a creeper climbs.
 *  Rooms only: a doorway is no wall */
function wallFrom(F: Floor, name: string, x: number, z: number, dx: number, dz: number): number {
  const inside = (t: number) => {
    const px = x + dx * t, pz = z + dz * t;
    for (let k = F.rooms.length - 1; k >= 0; k--) if (holds(F, F.rooms[k], px, pz)) return F.rooms[k].name === name;
    return false;
  };
  let lo = 0, hi = 0.05;
  while (hi < 2 && inside(hi)) { lo = hi; hi += 0.05; }
  for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (inside(m)) lo = m; else hi = m; }
  return hi;
}
/** the green over a room, `dens` things to each 4 m² of its floor; glowing, some of it lights its own way */
export function overgrow(F: Floor, R: Ground, dens: number, glow: boolean): void {
  const W = R.x1 - R.x0, D = R.z1 - R.z0, n = Math.round(((W * D) / 4) * dens);
  for (let k = 0; k < n; k++) {
    const x = R.x0 + rnd(0.5, W - 0.5), z = R.z0 + rnd(0.5, D - 0.5), t = C01();
    if (t < 0.4) moss(F, x, z, rnd(1, 2.6));
    else if (t < 0.62) bush(F, x, z, rnd(0.6, 1.3));
    else if (t < 0.75) stalk(F, x, z, rnd(1, Math.min(R.ht - 0.6, 3.4)));
    else if (t < 0.9) shroom(F, x, z, rnd(0.6, 2.2), glow && C01() < 0.3);
    else {
      /* a creeper up a wall, from the floor, flat on it */
      const side = Math.floor(rnd(4)), lenw = rnd(0.8, 2.4);
      let vx = side === 0 ? R.x0 + 0.03 : side === 1 ? R.x1 - 0.03 : R.x0 + rnd(1.4, W - 1.4), vz = side === 2 ? R.z0 + 0.03 : side === 3 ? R.z1 - 0.03 : R.z0 + rnd(1.4, D - 1.4);
      /* on the wall: where its room ends, which may be past its box (a room reaching into a partition) */
      if (R.name) {
        const [dx, dz] = [[-1, 0], [1, 0], [0, -1], [0, 1]][side], w = wallFrom(F, R.name, vx, vz, dx, dz) - 0.03;
        vx += dx * w; vz += dz * w;
      }
      bx(F, vx, vz, side < 2 ? 0.06 : Math.min(lenw, 1.2), rnd(1, R.ht - 0.4), side < 2 ? Math.min(lenw, 1.2) : 0.06, pick(GR), { c: 0, y: rnd(-0.3, 0) });
    }
  }
  if (glow)
    for (let k = 0; k < Math.max(1, Math.round((W * D) / 144)); k++) {
      const x = R.x0 + rnd(2, W - 2), z = R.z0 + rnd(2, D - 2);
      shroom(F, x, z, rnd(1.4, 2.4), true);
      F.lamps.push({ x, z, r: rnd(5, 8), c: [0.1, 0.4, 0.2] });
    }
}
const C01 = () => rnd(1);
/** dress a cave: n things on its own floor, some of them glowing */
export function caveDress(F: Floor, R: PRoom, n: number, glow: boolean): void {
  for (let k = 0, tries = 0; k < n && tries < n * 20; tries++) {
    const x = R.x0 + rnd(R.x1 - R.x0), z = R.z0 + rnd(R.z1 - R.z0);
    if (!owns(F, R, x, z)) continue;
    k++;
    const u = C01();
    if (u < 0.35) moss(F, x, z, rnd(1, 2.4));
    else if (u < 0.6) bush(F, x, z, rnd(0.6, 1.3));
    else if (u < 0.85) shroom(F, x, z, rnd(0.6, 2), glow && C01() < 0.4);
    else P(F, 'ico', x, z, rnd(0.6, 1.4), rnd(0.4, 0.9), rnd(0.6, 1.4), pick([0x5a5248, 0x4a443c, 0x6b6a64]), { c: 1 });
    if (glow && u > 0.6 && u < 0.85 && C01() < 0.25) F.lamps.push({ x, z, r: rnd(4, 7), c: [0.1, 0.36, 0.2] });
  }
}

/* ---- cargo */
const CC = [0x6a4a34, 0x3a5a6a, 0x5a5a3a, 0x6b5a3c, 0x4a4a52, 0x7a3a2a];
export function container(F: Floor, x: number, z: number, ns: boolean, n = 1): void {
  for (let k = 0; k < n; k++) {
    const c = pick(CC);
    bx(F, x, z, ns ? 2.4 : 5.4, 2.4, ns ? 5.4 : 2.4, c, { y: k * 2.4, c: k ? 0 : 1, mat: 'steel' });
    bx(F, x, z, ns ? 2.5 : 0.1, 2.2, ns ? 0.1 : 2.5, 0x2a2c2e, { y: k * 2.4 + 0.1, c: 0 });
  }
}
/** a few crates, some stacked. They can now be pushed about (engine.md §6), so they stand square. */
export function crates(F: Floor, x: number, z: number, n: number): void {
  for (let k = 0; k < n; k++) {
    const s = rnd(0.8, 1.4), ox = rnd(-0.7, 0.7), oz = rnd(-0.7, 0.7);
    bx(F, x + ox, z + oz, s, s, s, pick(CC), { loose: true });
    if (C01() < 0.4) bx(F, x + ox, z + oz, s * 0.8, s * 0.8, s * 0.8, pick(CC), { y: s, loose: true });
  }
}
/** pallet racking from (x0, z0) to (x1, z1), running along its longer side, h tall with its beams at `levels`: blue
 *  frames and orange beams, as Goods inward's, bays of 2.7 m with two pallets to a bay, some of them taken. Solid as one
 *  block, so nothing walks through it between the frames */
export function rack(F: Floor, x0: number, z0: number, x1: number, z1: number, h: number, levels: number[], fill = 0.7): void {
  const alongX = x1 - x0 >= z1 - z0, len = alongX ? x1 - x0 : z1 - z0, dep = alongX ? z1 - z0 : x1 - x0;
  const n = Math.max(1, Math.round(len / 2.7)), bay = len / n, at = (s: number, t: number): [number, number] => (alongX ? [x0 + s, z0 + t] : [x0 + t, z0 + s]);
  for (let k = 0; k <= n; k++) for (const t of [0.04, dep - 0.04]) { const [x, z] = at(k * bay, t); bx(F, x, z, 0.08, h, 0.08, 0x3a5a8a, { c: 0, mat: 'steel' }); }
  for (const y of levels) for (const t of [0.04, dep - 0.04]) { const [x, z] = at(len / 2, t); bx(F, x, z, alongX ? len : 0.07, 0.1, alongX ? 0.07 : len, 0xc8641e, { y: y - 0.1, c: 0, mat: 'steel' }); }
  for (let k = 0; k < n; k++) for (const y of [0, ...levels]) {
    if (rnd(0, 1) > fill) continue;
    const [x, z] = at((k + 0.5) * bay, dep / 2);
    for (const o of [-0.62, 0.62]) {
      if (rnd(0, 1) < 0.18) continue;
      const [px, pz] = alongX ? [x + o, z] : [x, z + o];
      bx(F, px, pz, alongX ? 1 : 1.2, 0.14, alongX ? 1.2 : 1, 0x8a6a44, { y, c: 0 });
      bx(F, px, pz, alongX ? 0.95 : 1.1, rnd(0.5, 1.1), alongX ? 1.1 : 0.95, pick([0x9a7a52, 0x8a6e4a, 0x6e5230, 0xa08a62]), { y: y + 0.14, c: 0 });
    }
  }
  colT(F, (x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, h);
}
export function forklift(F: Floor, x: number, z: number, ns: boolean): void {
  const a = (ox: number, oz: number, sx: number, sy: number, sz: number, c: number, y = 0, cl = false) => bx(F, x + (ns ? ox : oz), z + (ns ? oz : ox), ns ? sx : sz, sy, ns ? sz : sx, c, { y, c: cl ? 1 : 0, mat: 'steel' });
  a(0, 0, 1.2, 0.9, 2, 0xc9a227, 0.25, true); a(0, -0.3, 1.1, 0.08, 1.1, 0x2a2c2e, 2, false);
  /* the mast against the body's front, the forks out from the mast */
  for (const s of [-0.5, 0.5]) { a(s, -0.75, 0.07, 1.1, 0.07, 0x2a2c2e, 1.1); a(s, 0.2, 0.07, 1.1, 0.07, 0x2a2c2e, 1.1); a(s * 0.7, 1.05, 0.1, 2.4, 0.1, 0x2a2c2e, 0.1); a(s * 0.6, 1.65, 0.12, 0.06, 1.1, 0x8a8a84, 0.15); }
  /* the wheels on the floor, on their axles across it: tipped onto their sides, and turned to it */
  for (const s of [-0.55, 0.55]) for (const q of [-0.65, 0.65]) P(F, 'cyl', x + (ns ? s : q), z + (ns ? q : s), 0.5, 0.3, 0.5, 0x15181b, { y: 0.1, c: 0, rz: PI / 2, ry: ns ? 0 : PI / 2 });
}
export function column(F: Floor, x: number, z: number, h: number): void {
  P(F, 'cyl', x, z, 0.5, h - 0.14, 0.5, 0x55585c, { c: 1 });
}

/* ---- fittings that touch power */
const LIVE: [number, number, number][] = [[2.9, 2.2, 2.15], [2.25, 2.9, 2.4]];
export function panel(F: Floor, c: string, x: number, z: number, face: 'n' | 's' | 'e' | 'w', opts: Record<string, unknown> = {}): void {
  const ew = face === 'e' || face === 'w', o = face === 'e' || face === 's' ? 0.12 : -0.12;
  bx(F, x, z, ew ? 0.14 : 0.7, 0.9, ew ? 0.7 : 0.14, 0x4a4f55, { y: 0.9, c: 0 });
  bx(F, x + (ew ? o : 0), z + (ew ? 0 : o), 0.1, 0.1, 0.1, [0.2, 0.2, 0.2], { y: 1.55, c: 0, pw: [LIVE[0], LIVE[1]], pc: c });
  use(F, 'panel', x + (ew ? o * 3 : 0), z + (ew ? 0 : o * 3), 1.3, { c, ...opts });
}
/** a camera (sim/eyes.ts) at (x, z), its lens h metres up, looking along yaw (0 south, a quarter turn east), on
 *  circuit c, sounding zone `zone`; drawn by present/render/things.ts */
export function camera(F: Floor, x: number, z: number, h: number, yaw: number, c: string, zone: string, o: { fov?: number; range?: number; name?: string } = {}): void {
  F.cams.push({ x, z, h, yaw, fov: o.fov ?? 1.6, range: o.range ?? 18, c, zone, ...(o.name ? { name: o.name } : {}) });
}
/** a spot monitor's console at (x, z), its seat y up: on circuit c, it shows the named cameras' feeds, one at a time
 *  (sim/eyes.ts, watching); with `dwell`, a sequencer steps it to the next every so many seconds by itself */
export function monitors(F: Floor, x: number, z: number, y: number, c: string, feeds: string[], o: { dwell?: number } = {}): void {
  use(F, 'watch', x, z, y, { c, feeds, ...(o.dwell ? { dwell: o.dwell } : {}) });
}
/** a break-glass call point on a wall at (x, z), read from `face`: a red box at shoulder height with a pane over its
 *  button, wired to the zone's PA (sim/interact.ts, 'call'). The pane is drawn by present/render/things.ts, gone once
 *  broken */
export function callPoint(F: Floor, x: number, z: number, face: 'n' | 's' | 'e' | 'w', zone: string): void {
  /* (x, z) is the wall's face: the box stands out from it toward whoever reads it, its back on the wall */
  const ew = face === 'e' || face === 'w', o = face === 'e' || face === 's' ? 1 : -1;
  if (ew) x += o * 0.05; else z += o * 0.05;
  bx(F, x, z, ew ? 0.1 : 0.17, 0.17, ew ? 0.17 : 0.1, 0xb3261e, { y: 1.32, c: 0 });
  bx(F, x + (ew ? o * 0.052 : 0), z + (ew ? 0 : o * 0.052), ew ? 0.01 : 0.07, 0.07, ew ? 0.07 : 0.01, 0xe8e2d4, { y: 1.37, c: 0 });
  use(F, 'call', x + (ew ? o * 0.18 : 0), z + (ew ? 0 : o * 0.18), 1.4, { zone, face });
}
/** a comms cupboard's rack, its back on the wall whose face is at (x, z), read from `face` (world.md §8, *One control
 *  room*): the switch a branch's cameras run on, a cable down to each and one away to the head end, on circuit c, the
 *  branch's own, with no battery behind it; the patch panel over it, and the cables up the wall in their tray to the
 *  ceiling, h over the floor. The switch and its link lights are drawn as they stand, whole or smashed
 *  (present/render/things.ts); it is read, and smashed, at its face (sim/interact.ts, 'comms'), and a look at it says
 *  `text` */
export function comms(F: Floor, c: string, x: number, z: number, face: 'n' | 's' | 'e' | 'w', h: number, text: string): void {
  const ew = face === 'e' || face === 'w', o = face === 'e' || face === 's' ? 1 : -1;
  /* a point d out from the wall and a along it */
  const at = (d: number, a: number): [number, number] => (ew ? [x + o * d, z + a] : [x + a, z + o * d]);
  const slab = (d: number, w: number, t: number, ht: number, col: Col, y: number) => {
    const [px, pz] = at(d, 0);
    bx(F, px, pz, ew ? t : w, ht, ew ? w : t, col, { y, c: 0 });
  };
  const [rx, rz] = at(0.3, 0);
  bx(F, rx, rz, 0.6, 2, 0.6, 0x2c2f33, { mat: 'steel' }); // the rack
  slab(0.61, 0.48, 0.02, 0.09, 0xb8bcc0, 1.5); // the patch panel, its cables looped down
  slab(0.04, 0.3, 0.08, h - 2, 0x5f6266, 2); // the tray, up the wall from the rack's top
  const [ux, uz] = at(0.62, 0);
  use(F, 'comms', ux, uz, 1.395, { c, face, text });
}
/** a zone's speaker, in the ceiling over (x, z): where its alarm sounds and whatever answers it comes. It is wired from
 *  its PA system (`pa`, a circuit), not from the room it hangs in */
export function speaker(F: Floor, zone: string, x: number, z: number, pa?: string): void {
  F.speakers.push({ zone, x, z, ...(pa ? { pa } : {}) });
}
/** an exit sign, read from `face`: green, and on its own battery as the code wants, so lit whatever the power; a little of
 *  its light falls before it */
export function exitSign(F: Floor, x: number, z: number, y: number, face: 'n' | 's' | 'e' | 'w'): void {
  const ew = face === 'e' || face === 'w', o = 0.8;
  bx(F, x, z, ew ? 0.05 : 0.7, 0.26, ew ? 0.7 : 0.05, [0.35, 2.8, 0.9], { y, c: 0 });
  F.lamps.push({ x: x + (face === 'e' ? o : face === 'w' ? -o : 0), z: z + (face === 's' ? o : face === 'n' ? -o : 0), r: 2.6, c: [0.05, 0.24, 0.1], h: y });
}
/** a flashlight dropped still on, at (x, z), lying on its side and pointing at (ax, az): its beam is the one you will
 *  carry (sim/sim.ts, looseLights), and it goes on shining in your hand once taken */
export function droppedLight(F: Floor, x: number, z: number, ax: number, az: number): void {
  item(F, 'flash', x, z, 0.02).on = { yaw: Math.atan2(-(ax - x), -(az - z)), pitch: 0.04 };
}
export function genset(F: Floor, c: string, x: number, z: number, ix: number, iz: number): void {
  bx(F, x, z, 1.4, 1.1, 0.8, 0x44525a);
  bx(F, x, z, 1.1, 0.3, 0.6, 0x36424a, { y: 1.1, c: 0 });
  P(F, 'cyl', x + 0.5, z, 0.16, 0.7, 0.16, 0x2c3338, { y: 1.4, c: 0 });
  bx(F, x, z + 0.42 * (iz > z ? 1 : -1), 0.12, 0.12, 0.06, [0.2, 0.2, 0.2], { y: 0.8, c: 0, pw: [LIVE[0], LIVE[1]], pc: c });
  use(F, 'backup', ix, iz, 1, { c });
}
/** the main lift: a car 4 m square from (x, z) behind a heavy door in its wall (the door's middle at (dx, dz)), its
 *  panel, and the mark where you arrive */
export function liftRoom(F: Floor, x: number, z: number, dx: number, dz: number): void {
  room(F, 'Main lift', x, z, 4, 4, { fl: 0x44474a, wl: 0x54585a, st: 0xb89b2e, c: 'LIFT', noroam: 1, safe: 1 });
  const n = dz < z, s = dz > z + 4, w = !n && !s && dx < x;
  door(F, dx, dz, { kind: 'heavy', c: 'LIFT', sg: [['Lift', n ? 'n' : s ? 's' : w ? 'w' : 'e']] });
  /* its panel on a wall, its back on the wall */
  const px = n || s ? x + 2 : w ? x + 3.96 : x + 0.04, pz = n ? z + 3.96 : s ? z + 0.04 : z + 2;
  bx(F, px, pz, n || s ? 0.5 : 0.08, 0.4, n || s ? 0.08 : 0.5, 0x2c2f33, { y: 1.1, c: 0 });
  use(F, 'lift', x + 2, z + 2, 1.3);
  F.marks.lift = [x + 2, z + 2, 0];
}

/** a grand stair from floor lo up to floor hi: w wide and len long from (x0, z0), climbing toward dir (north or
 *  south). Walked as one flight (plan.ts, stairs: the way the cast find up it too), bare, and drawn as one: stone treads
 *  the whole width, and a solid balustrade stepping up each side, its foot a centimetre into the treads. Each block is
 *  drawn at its size (flush), so one step's faces run on into the next with no seam (each a different hair larger, as
 *  props are, every joint showed); it runs on a little into the next (all but the last, which meets the floor above), so
 *  no face of one lies in a face of the next, and down a little into the floor. Over each face of the balustrade,
 *  outside and in, a sheet a hair clear of it, each step's own: the end of one block stands edge on in the face it runs
 *  into, and showed through it along every joint as a broken dark line */
export function grandStair(lo: Floor, hi: Floor, x0: number, z0: number, w: number, len: number, dir: 'n' | 's', c = 0xb3ab9c): void {
  stairs(lo, hi, x0, z0, w, len, dir, true);
  const N = Math.round(len * 2), rise = hi.y0 - lo.y0, d = len / N, rev = dir === 'n', OVER = 0.02, CLEAR = 0.005, SINK = 0.005;
  for (let q = 0; q < N; q++) {
    const on = q < N - 1 ? OVER : 0, pos = rev ? 1 - (q + 0.5) / N : (q + 0.5) / N, sh = ((q + 1) / N) * rise;
    const z = z0 + pos * len + ((rev ? -1 : 1) * on) / 2, o = { y: -SINK, flush: true };
    bx(lo, x0 + w / 2, z, w, sh + SINK, d + on, q % 2 ? c : 0xa9a192, { ...o, c: 0 });
    for (const x of [x0 - 0.15, x0 + w + 0.15]) {
      bx(lo, x, z, 0.32, sh + 1.05 + SINK, d + on, 0x8f877a, o);
      for (const s of [-1, 1]) bx(lo, x + s * (0.16 + CLEAR), z, 0, sh + 1.05 + SINK, d + on, 0x8f877a, { ...o, c: 0 });
    }
  }
}
