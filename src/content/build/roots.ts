import { PI, TAU, clamp } from '../../core/math';
import { P, roomAt, type Dir, type Floor } from './plan';
import { CONCRETE, FACE, GROW, HOLE, WOOD, crack, curve, grower, heave, lump, rod, rubble, spindle, type Grow, type V3 } from './overgrowth';
import { ICO } from '../types';

/* Holt's roots (world.md §8, Security overgrown in parts): what her flowers on the upper floors put down through
   the station's concrete into the floors under them, and how she comes up to them. Woody, as thick as an arm or a waist, braided where they are
   thickest, pale at their tips; where one goes through a floor, a wall or a ceiling it leaves it broken round it, the
   concrete spalled, cracks run out, the reinforcing bared and bent, rubble fallen under it. The pieces (a root along a
   path; a bore, where one goes through) and what they make: a taproot down out of a ceiling into the floor, a root out
   of a wall and down into the floor, one across a room from wall to wall over a head, and hair roots hung from a
   ceiling. Plan metres, y over the floor, as the rest of the growth (overgrowth.ts); dressing only, as that is:
   nothing here is solid, so lay them where nobody walks through them. But for the great roots (at the end), two to five
   times as thick, which are in the way. */

/** the big roots' bark, and their young tips' pale tan */
export const BARK = [...WOOD, 0x5e4c38], PALE = [0x8a7656, 0x9a8462, 0xa8946e];
/** the reinforcing in the concrete, rusted where it is bared */
const REBAR = 0x6a3a24;

const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const unit = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** two directions square to n and to each other */
const across = (n: V3): [V3, V3] => { const u = unit(cross(n, Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])); return [u, cross(n, u)]; };
/** a wall's face, looking out into the room */
const out = (face: Dir): V3 => [Math.sin(FACE[face]), 0, Math.cos(FACE[face])];

/** a root through the points given, d0 thick at its first and d1 at its last: woody, knuckled at its bends, and where
 *  it is over a hand thick braided of two strands twisting round it. `lets`, rootlets off it to a metre of it, hanging
 *  down and coming to rest on the floor if they reach it, but none lower than `low` over it (a head, under one across
 *  a room); `inside`, where they may go */
export function root(F: Floor, pts: readonly V3[], d0: number, d1: number,
  o: { lets?: number; low?: number; inside?: (x: number, z: number) => boolean; g?: Grow } = {}): void {
  const g = o.g ?? grower('root', ...pts[0]), n = pts.length - 1, low = o.low ?? 0.01;
  let tw = g.rnd(TAU);
  for (let k = 0; k < n; k++) {
    const a = pts[k], b = pts[k + 1], d = d0 + ((d1 - d0) * k) / Math.max(1, n - 1), c = g.pick(BARK);
    rod(F, a, b, d, c, d * 0.25);
    if (k) lump(F, a[0], a[1], a[2], d * 1.3, d * 1.15, d * 1.3, c, g.rnd(PI));
    if (d > 0.16) {
      const [u, v] = across(unit(add(b, a, -1))), t0 = tw, t1 = (tw += g.rnd(0.9, 1.5));
      for (const s of [0, PI]) {
        const off = (t: number): V3 => add(add([0, 0, 0], u, Math.cos(t + s) * d * 0.3), v, Math.sin(t + s) * d * 0.3);
        rod(F, add(a, off(t0)), add(b, off(t1)), d * 0.5, g.pick(BARK), d * 0.1);
      }
    }
  }
  /* rootlets, down off it */
  for (let k = 0; k < n; k++) {
    const a = pts[k], b = pts[k + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    for (let m = 0, c = Math.floor(L * (o.lets ?? 0) + g.rnd(1)); m < c; m++) {
      const f = g.rnd(0.15, 0.85), p: V3 = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
      /* out from it a little way, then hanging under its own weight: three lengths, each nearer straight down */
      const az = g.rnd(TAU), out = g.rnd(0.08, 0.25), drop = Math.min(g.rnd(0.3, 1), p[1] - low);
      if (drop < 0.15) continue;
      const pts: V3[] = [p];
      for (const [f, s] of [[0.2, 0.6], [0.55, 0.9], [1, 1]] as const) pts.push([p[0] + Math.sin(az) * out * s + g.rnd(-0.03, 0.03), p[1] - drop * f, p[2] + Math.cos(az) * out * s + g.rnd(-0.03, 0.03)]);
      if (o.inside && !pts.every(q => o.inside!(q[0], q[2]))) continue;
      const dd = g.rnd(0.018, 0.04), c = g.pick(PALE);
      for (let j = 0; j < 3; j++) rod(F, pts[j], pts[j + 1], dd * (1 - 0.25 * j), c, dd * 0.2);
    }
  }
}

/** where a root d thick goes through concrete: the face of it at (x, y, z) looking out along n (a unit vector, into the
 *  room), the root going on in along `dir` (else straight in). The root sunk into it, tapering; a dark hole round it;
 *  the concrete spalled off in lumps about it; cracks run out; the reinforcing bared and bent; and, out of a wall or a
 *  ceiling, rubble fallen on the floor under it. `c`, the surface's colour; `small`, only the hole and the cracks */
export function bore(F: Floor, x: number, y: number, z: number, n: V3, d: number, o: { dir?: V3; c?: number; small?: boolean; len?: number; g?: Grow } = {}): void {
  const g = o.g ?? grower('bore', x, y, z), c = o.c ?? 0x6a6660, dir = o.dir ?? [-n[0], -n[1], -n[2]], [u, v] = across(n), p: V3 = [x, y, z];
  /* a great root breaks more: more plates and lumps, more reinforcing and longer, more rubble */
  const big = Math.max(0, d - 0.6), more = Math.round(big * 5);
  /* the root on into it, half in and half out: no deeper than a slab is thick, unless it says (into rock) */
  spindle(F, p, dir, o.len ?? Math.min(0.7, d * 1.6), d * 1.05, g.pick(BARK));
  const ht = 0.012, hd = d * 1.3;
  P(F, 'cyl', x + (n[0] * ht) / 2, z + (n[2] * ht) / 2, hd, ht, hd, HOLE, { y: y + (n[1] * ht) / 2 - ht / 2, rz: Math.acos(clamp(n[1], -1, 1)), ry: Math.atan2(n[2], -n[0]), c: 0 });
  const floor = n[1] > 0.5, ceiling = n[1] < -0.5, yaw = Math.atan2(n[0], n[2]);
  for (let k = 0, m = 3 + Math.floor(g.rnd(3)); k < m; k++) {
    const a = g.rnd(TAU), r0 = d * 0.7, len = g.rnd(0.3, 0.9) * (0.5 + d);
    if (floor || ceiling) crack(F, x + Math.sin(a) * r0, y, z + Math.cos(a) * r0, a, len, floor ? 'floor' : 'ceiling');
    /* (on a wall, none run on down under the floor, as they would from a bore low on it) */
    else if (y + Math.cos(a) * (r0 + len * 1.3) > 0.05 && y + Math.cos(a) * r0 > 0.05) crack(F, x + Math.cos(yaw) * Math.sin(a) * r0, y + Math.cos(a) * r0, z - Math.sin(yaw) * Math.sin(a) * r0, a, len, yaw);
  }
  if (o.small) return;
  /* spalled: plates of it pushed out round the hole, their inner edges lifted off the face as a floor heaves, and a lump
     or two of its raw inside between them */
  for (let k = 0, m0 = 5 + Math.floor(g.rnd(3)), m = m0 + more; k < m; k++) {
    /* (a great root's are no larger than a waist-thick one's, flatter, and a second ring of them further out: a crater) */
    const a = (k / m) * TAU + g.rnd(-0.3, 0.3), rr = add(add([0, 0, 0], u, Math.cos(a)), v, Math.sin(a)), w = g.rnd(0.14, 0.24) + Math.min(d, 0.6) * 0.5 + big * 0.15, tip = g.rnd(0.25, 0.6) * (big ? 0.5 : 1);
    /* out from the hole along rr, its face turned out away from it (nn) */
    const at = add(add(p, rr, d * 0.55 + w * 0.42 + (k >= m0 ? w * 0.9 : 0)), n, w * 0.42 * Math.sin(tip)), nn = unit(add(add([0, 0, 0], n, Math.cos(tip)), rr, Math.sin(tip))), t = g.rnd(0.035, 0.06);
    P(F, 'ico', at[0], at[2], w / ICO, t / ICO, w * g.rnd(0.6, 0.9) / ICO, g.rnd(1) < 0.7 ? c : g.pick(CONCRETE), { y: at[1] - t / 2, rz: Math.acos(clamp(nn[1], -1, 1)), ry: Math.atan2(nn[2], -nn[0]), c: 0 });
  }
  for (let k = 0, m = 2 + Math.floor(g.rnd(3)) + more; k < m; k++) {
    const a = g.rnd(TAU), q = d * g.rnd(0.55, 0.75), s = g.rnd(0.05, 0.1) + d * 0.15, at = add(add(p, u, Math.cos(a) * q), v, Math.sin(a) * q);
    lump(F, at[0] + n[0] * s * 0.2, at[1] + n[1] * s * 0.2, at[2] + n[2] * s * 0.2, s, s * g.rnd(0.5, 0.8), s * g.rnd(0.7, 1), g.pick(CONCRETE), g.rnd(PI));
  }
  /* the reinforcing, bared and bent out of it */
  for (let k = 0, m = 1 + Math.floor(g.rnd(3)) + more; k < m; k++) {
    const a = g.rnd(TAU), q = d * g.rnd(0.6, 0.8), s = add(add(p, u, Math.cos(a) * q), v, Math.sin(a) * q), r = g.rnd(0.05, 0.15) * (1 + big);
    const m1 = add(s, n, g.rnd(0.06, 0.14) * (1 + big)), e = add(add(m1, u, Math.cos(a) * r), v, Math.sin(a) * r);
    if (Math.min(s[1], e[1]) < 0.05) continue;
    rod(F, s, m1, 0.016, REBAR); rod(F, m1, e, 0.016, REBAR);
  }
  /* what fell: under a ceiling, about where it came through; out from the foot of a wall */
  if (!floor) rubble(F, x + n[0] * (0.25 + d), z + n[2] * (0.25 + d), 0.3 + d, 5 + Math.floor(g.rnd(5)) + more * 2, c, g);
}

/** a taproot down out of a ceiling `top` over the floor at (x, z), and into the floor at `to` (a little off, unless it
 *  says): d thick at the ceiling, bending as it comes down, buttressed where it goes in by roots spread out over the
 *  floor and down into it; bored through both. `c`, the ceiling's colour, and `fc`, the floor's (else its room's) */
export function taproot(F: Floor, x: number, z: number, top: number,
  o: { d?: number; to?: [number, number]; c?: number; fc?: number; lets?: number; inside?: (x: number, z: number) => boolean; g?: Grow } = {}): void {
  const g = o.g ?? grower('taproot', x, z), d = o.d ?? 0.35, R = roomAt(F, x, z), c = o.c ?? R?.wl ?? 0x8a8378, fc = o.fc ?? R?.fl ?? 0x645d55;
  const [tx, tz] = o.to ?? [x + g.rnd(-0.6, 0.6), z + g.rnd(-0.6, 0.6)];
  /* down out of the ceiling and bending: eased from one to the other, bowed out to one side between */
  const bend = g.rnd(0.15, 0.4), ba = g.rnd(TAU), pts: V3[] = [];
  for (let k = 0, n = 6; k <= n; k++) {
    const t = k / n, e = t * t * (3 - 2 * t), w = Math.sin(t * PI) * bend;
    pts.push([x + (tx - x) * e + Math.sin(ba) * w, top * (1 - t), z + (tz - z) * e + Math.cos(ba) * w]);
  }
  root(F, pts, d, d * 0.8, { lets: o.lets ?? 0.8, inside: o.inside, g });
  bore(F, x, top, z, [0, -1, 0], d * 1.05, { dir: [0, 1, 0], c, g });
  bore(F, tx, 0, tz, [0, 1, 0], d * 0.85, { dir: [0, -1, 0], c: fc, g });
  /* buttresses: roots out from its foot over the floor, half sunk, and on down into it */
  for (let k = 0, m = 3 + Math.floor(g.rnd(3)); k < m; k++) {
    const a = (k / m) * TAU + g.rnd(-0.4, 0.4), L = g.rnd(0.6, 1.4) * (0.6 + d), dd = d * g.rnd(0.35, 0.5), bp: V3[] = [];
    for (let j = 0; j <= 4; j++) {
      const f = j / 4, w = Math.sin(f * PI) * g.rnd(-0.1, 0.1);
      bp.push([tx + Math.sin(a) * (d * 0.3 + L * f) + Math.cos(a) * w, dd * 0.25 + d * 0.5 * (1 - f) ** 2, tz + Math.cos(a) * (d * 0.3 + L * f) - Math.sin(a) * w]);
    }
    const [ex, , ez] = bp[4];
    if (o.inside && !o.inside(ex, ez)) continue;
    root(F, bp, dd, dd * 0.4, { g });
    bore(F, ex, 0, ez, [0, 1, 0], dd * 0.5, { dir: unit([Math.sin(a), -0.6, Math.cos(a)]), c: fc, small: true, g });
  }
}

/** a root out of a wall at (x, y, z) on its face, which looks out `face`, d thick, arching out into the room and down
 *  into the floor at (tx, tz); bored through both. `c`, the wall's colour, and `fc`, the floor's (else its room's) */
export function wallroot(F: Floor, x: number, y: number, z: number, face: Dir, tx: number, tz: number,
  o: { d?: number; c?: number; fc?: number; lets?: number; inside?: (x: number, z: number) => boolean; g?: Grow } = {}): void {
  const g = o.g ?? grower('wallroot', x, y, z), d = o.d ?? 0.3, n = out(face), R = roomAt(F, tx, tz), c = o.c ?? R?.wl ?? 0x8a8378, fc = o.fc ?? R?.fl ?? 0x645d55;
  const far = Math.hypot(tx - x, tz - z), lift = g.rnd(0.2, 0.6);
  /* out of the wall square to it (clear of it by more than its own thickness, so none of it is in the wall but the
     root bored on into it), over, and down */
  const p0: V3 = [x + n[0] * d * 0.6, y, z + n[2] * d * 0.6], p1: V3 = [x + n[0] * far * 0.55, y + lift, z + n[2] * far * 0.55], p2: V3 = [tx, 0, tz];
  const pts: V3[] = [];
  for (let k = 0; k <= 7; k++) pts.push(curve(p0, p1, p2, k / 7));
  root(F, pts, d, d * 0.65, { lets: o.lets ?? 0.7, inside: o.inside, g });
  bore(F, x, y, z, n, d * 1.05, { c, g });
  bore(F, tx, 0, tz, [0, 1, 0], d * 0.7, { dir: unit(add(pts[7], pts[6], -1)), c: fc, g });
}

/** a root across a room from wall to wall: out of the wall at a (its face looking out fa) and into the one at b (fb),
 *  d thick, sagging `sag` between, hung with rootlets; bored through both. Over a head: none of it, nor of what hangs
 *  from it, lower than GROW.head. `c`, the walls' colour (else the room's at a) */
export function span(F: Floor, a: V3, fa: Dir, b: V3, fb: Dir,
  o: { d?: number; sag?: number; c?: number; lets?: number; inside?: (x: number, z: number) => boolean; g?: Grow } = {}): void {
  const g = o.g ?? grower('span', ...a), d = o.d ?? 0.3, na = out(fa), nb = out(fb), c = o.c ?? roomAt(F, a[0] + na[0], a[2] + na[2])?.wl ?? 0x8a8378;
  const p0 = add(a, na, d * 0.6), p1 = add(b, nb, d * 0.6), sag = o.sag ?? 0.3, pts: V3[] = [], n = Math.max(4, Math.round(Math.hypot(p1[0] - p0[0], p1[2] - p0[2]) / 1.2));
  for (let k = 0; k <= n; k++) {
    const t = k / n, w = Math.sin(t * PI) * g.rnd(-0.15, 0.15);
    const y = p0[1] + (p1[1] - p0[1]) * t - Math.sin(t * PI) * sag;
    pts.push([p0[0] + (p1[0] - p0[0]) * t + w, Math.max(GROW.head + d / 2, y), p0[2] + (p1[2] - p0[2]) * t - w]);
  }
  root(F, pts, d, d * 0.8, { lets: o.lets ?? 1.2, low: GROW.head, inside: o.inside, g });
  bore(F, ...a, na, d * 1.05, { c, g });
  bore(F, ...b, nb, d * 0.9, { c, g });
}

/** hair roots hung from a ceiling `top` over the floor about (x, z), out to r: fine and pale and kinked, from cracks run
 *  across the ceiling, none lower than a head (GROW.head). `inside`, where they may hang */
export function fringe(F: Floor, x: number, z: number, top: number, r: number, o: { n?: number; inside?: (x: number, z: number) => boolean; g?: Grow } = {}): void {
  const g = o.g ?? grower('fringe', x, z);
  for (let k = 0, m = 4 + Math.floor(g.rnd(3)); k < m; k++) {
    const a = g.rnd(TAU), q = r * g.rnd(0, 0.6);
    crack(F, x + Math.sin(a) * q, top, z + Math.cos(a) * q, g.rnd(TAU), g.rnd(0.4, 1.2) * (0.5 + r), 'ceiling');
  }
  for (let k = 0, m = o.n ?? Math.round(10 + 20 * r * r); k < m; k++) {
    const a = g.rnd(TAU), q = r * Math.sqrt(g.rnd(1)), px = x + Math.sin(a) * q, pz = z + Math.cos(a) * q;
    if (o.inside && !o.inside(px, pz)) continue;
    const len = g.rnd(0.25, top - GROW.head), dd = g.rnd(0.012, 0.024), segs = 2 + Math.floor(g.rnd(2));
    let p: V3 = [px, top, pz];
    for (let j = 1; j <= segs; j++) {
      const q2: V3 = [px + g.rnd(-0.06, 0.06), top - (len * j) / segs, pz + g.rnd(-0.06, 0.06)];
      rod(F, p, q2, dd * (1 - 0.25 * j), g.pick(PALE));
      p = q2;
    }
    if (g.rnd(1) < 0.3) lump(F, px, top - 0.03, pz, 0.06, 0.05, 0.06, g.pick(BARK));
  }
}

/* ---- the great roots: two to five times as thick, as roots go when a plant has had a place for years. These are in
   the way: each lays what stops a body along it (boxes about its axis, as furniture has), so it is gone round, climbed
   over where it lies low enough, or ducked under where it arches high */

/** a smooth path through the points given (a Catmull-Rom curve through each in turn), about `step` apart */
function smooth(pts: readonly V3[], step: number): V3[] {
  const out: V3[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t, f = (j: number) => 0.5 * (2 * p1[j] + (p2[j] - p0[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * t3);
      out.push([f(0), f(1), f(2)]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** what stops a body at a root along the path, d0 thick tapering to d1: boxes about its axis, square on the plan, each
 *  as wide as most of it and as high as it is there, close enough to run together; none where it is under the floor */
function block(F: Floor, path: readonly V3[], d0: number, d1: number): void {
  const n = path.length - 1;
  for (let k = 0; k < n; k++) {
    const a = path[k], b = path[k + 1], d = d0 + ((d1 - d0) * k) / Math.max(1, n - 1), h = d * 0.4, L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    for (let i = 0, m = Math.max(1, Math.ceil(L / (d * 0.45))); i < m; i++) {
      const f = i / m, x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f, z = a[2] + (b[2] - a[2]) * f;
      if (y + h > 0.05) F.cols.push([x - h, z - h, x + h, z + h, Math.max(0, y - h), y + h]);
    }
  }
}

/** a great root through the points given (smoothed through them), d0 thick at its first and d1 at its last: a core bound
 *  round with five strands twisting along it, bark in plates over them, a burl here and there, a knuckle at each bend.
 *  Solid (`block`, unless it says not) */
export function greatroot(F: Floor, pts: readonly V3[], d0: number, d1: number, o: { block?: boolean; g?: Grow } = {}): void {
  const g = o.g ?? grower('greatroot', ...pts[0]), path = smooth(pts, Math.max(0.45, (d0 + d1) * 0.3)), n = path.length - 1;
  /* a frame carried along it, square to it and turned no more than it turns, so the strands run on unbroken */
  const T = path.map((_, k) => unit(add(path[Math.min(n, k + 1)], path[Math.max(0, k - 1)], -1))), U: V3[] = [];
  let u = across(T[0])[0];
  for (const t of T) { u = unit(add(u, t, -dot(u, t))); U.push(u); }
  const at = (k: number, phi: number, r: number): V3 => add(add(path[k], U[k], Math.cos(phi) * r), cross(T[k], U[k]), Math.sin(phi) * r);
  const S = 5, tw = g.rnd(TAU), dtw = g.rnd(0.35, 0.6);
  /* where it has gone down into the floor, nothing is drawn of it: a length wholly under it is not seen */
  const shown = (a: V3, b: V3, r: number) => Math.max(a[1], b[1]) + r > 0.06;
  const length = (a: V3, b: V3, w: number, c: number, over: number) => { if (shown(a, b, w / 2)) rod(F, a, b, w, c, over); };
  for (let k = 0; k < n; k++) {
    const a = path[k], b = path[k + 1], d = d0 + ((d1 - d0) * k) / Math.max(1, n - 1), c = g.pick(BARK);
    length(a, b, d * 0.78, c, d * 0.15);
    if (k && shown(a, a, d * 0.45)) lump(F, a[0], a[1], a[2], d * 0.95, d * 0.9, d * 0.95, c, g.rnd(PI));
    for (let s = 0; s < S; s++) {
      const p0 = tw + k * dtw + (s * TAU) / S;
      length(at(k, p0, d * 0.3), at(k + 1, p0 + dtw, d * 0.3), d * 0.36 * g.rnd(0.85, 1.15), g.pick(BARK), d * 0.08);
    }
    if (!shown(a, b, d * 0.5)) continue;
    /* bark in plates over the strands, and now and then a burl */
    for (let m = 0, c2 = 1 + Math.floor(g.rnd(3)); m < c2; m++) {
      const j = g.rnd(1) < 0.5 ? k : k + 1, phi = g.rnd(TAU), rr = unit(add(at(j, phi, 1), path[j], -1)), w = d * g.rnd(0.15, 0.3), t = Math.max(GROW.least, d * 0.04);
      const q = add(path[j], rr, d * 0.45);
      P(F, 'ico', q[0], q[2], w / ICO, t / ICO, (w * g.rnd(0.5, 0.8)) / ICO, g.pick(BARK), { y: q[1] - t / 2, rz: Math.acos(clamp(rr[1], -1, 1)), ry: Math.atan2(rr[2], -rr[0]), c: 0 });
    }
    if (g.rnd(1) < 0.25) { const q = at(k, g.rnd(TAU), d * 0.35), s = d * g.rnd(0.4, 0.6); lump(F, q[0], q[1], q[2], s, s * 0.8, s, g.pick(BARK), g.rnd(PI)); }
  }
  if (o.block !== false) block(F, path, d0, d1);
}

/** the floor broken along a great root lying half sunk in it through the points given (on the plan), d thick: slabs
 *  of it tipped up against either flank, their edges on it lifted, and cracks run out from it */
function flank(F: Floor, pts: readonly (readonly [number, number])[], d: number, c: number, g: Grow): void {
  for (let k = 0; k + 1 < pts.length; k++) {
    const [ax, az] = pts[k], [bx, bz] = pts[k + 1], L = Math.hypot(bx - ax, bz - az), along = Math.atan2(bx - ax, bz - az);
    for (let i = 0, m = Math.max(1, Math.round(L / 1.1)); i < m; i++)
      for (const s of [-1, 1]) {
        if (g.rnd(1) < 0.45) continue;
        const f = (i + g.rnd(0.2, 0.8)) / m, x = ax + (bx - ax) * f, z = az + (bz - az) * f, side = along + (s * PI) / 2;
        const W = g.rnd(0.25, 0.5) + d * 0.1, Lb = g.rnd(0.3, 0.6), t = g.rnd(0.06, 0.1), tip = g.rnd(0.3, 0.7), q = d * 0.45 + W * 0.4;
        const cy = (W / 2) * Math.sin(tip) + (t / 2) * Math.cos(tip) - 0.01;
        P(F, 'box', x + Math.sin(side) * q, z + Math.cos(side) * q, W, t, Lb, g.rnd(1) < 0.5 ? c : g.pick(CONCRETE), { y: cy - t / 2, rz: -tip, ry: side - PI / 2, c: 0 });
        if (g.rnd(1) < 0.5) crack(F, x + Math.sin(side) * (q + W * 0.5), 0, z + Math.cos(side) * (q + W * 0.5), side + g.rnd(-0.5, 0.5), g.rnd(0.4, 1), 'floor');
      }
  }
}

/** a great root down out of a ceiling `top` over the floor at (x, z) and into the floor below it, d thick and flaring
 *  at its foot: the ceiling broken round it, the floor heaved, and great buttress roots spread out from its foot over
 *  the floor and down into it, as solid as it is. `inside`, where its buttresses may go */
export function pillar(F: Floor, x: number, z: number, top: number,
  o: { d?: number; c?: number; fc?: number; inside?: (x: number, z: number) => boolean; g?: Grow } = {}): void {
  const g = o.g ?? grower('pillar', x, z), d = o.d ?? 1.6, R = roomAt(F, x, z), c = o.c ?? R?.wl ?? 0x8a8378, fc = o.fc ?? R?.fl ?? 0x645d55;
  const lean = g.rnd(TAU), w = g.rnd(0.15, 0.4), tx = x + Math.sin(lean) * w, tz = z + Math.cos(lean) * w, bow = g.rnd(TAU), b = g.rnd(0.1, 0.25);
  greatroot(F, [[x, top, z], [x + Math.sin(bow) * b, top * 0.62, z + Math.cos(bow) * b], [tx + Math.sin(bow) * b * 0.5, top * 0.28, tz + Math.cos(bow) * b * 0.5], [tx, -0.1, tz]], d, d * 1.15, { g });
  bore(F, x, top, z, [0, -1, 0], d * 1.05, { dir: [0, 1, 0], c, g });
  bore(F, tx, 0, tz, [0, 1, 0], d * 1.1, { dir: [0, -1, 0], c: fc, g });
  heave(F, tx, tz, d * 0.85, { c: fc, g });
  /* buttresses: out from its foot over the floor, half sunk, and on down into it */
  for (let k = 0, m = 4 + Math.floor(g.rnd(3)); k < m; k++) {
    const a = (k / m) * TAU + g.rnd(-0.35, 0.35), L = g.rnd(1.6, 3) * (0.5 + d * 0.5), dd = d * g.rnd(0.28, 0.38), bp: V3[] = [];
    for (let j = 0; j <= 4; j++) {
      const f = j / 4, s = Math.sin(f * PI) * g.rnd(-0.25, 0.25), r = d * 0.35 + L * f;
      bp.push([tx + Math.sin(a) * r + Math.cos(a) * s, j === 4 ? -dd * 0.3 : dd * 0.3 + d * 0.35 * (1 - f) ** 2, tz + Math.cos(a) * r - Math.sin(a) * s]);
    }
    const [ex, , ez] = bp[4];
    if (o.inside && !bp.every(p => o.inside!(p[0], p[2]))) continue;
    greatroot(F, bp, dd, dd * 0.45, { g });
    flank(F, bp.slice(1, 4).map(p => [p[0], p[2]] as const), dd, fc, g);
    bore(F, ex, 0, ez, [0, 1, 0], dd * 0.5, { dir: unit([Math.sin(a), -0.7, Math.cos(a)]), c: fc, small: true, g });
  }
}

/** a great root out of a wall low at (x, y, z) on its face, which looks out `face`, d thick, and along the floor half
 *  sunk in it through the points given (on the plan), breaking the floor along its flanks, to go down into it at the
 *  last of them; the wall broken where it came through */
export function sprawl(F: Floor, x: number, y: number, z: number, face: Dir, pts: readonly (readonly [number, number])[],
  o: { d?: number; c?: number; fc?: number; g?: Grow } = {}): void {
  const g = o.g ?? grower('sprawl', x, y, z), d = o.d ?? 1.4, n = out(face), R = roomAt(F, pts[0][0], pts[0][1]), c = o.c ?? R?.wl ?? 0x8a8378, fc = o.fc ?? R?.fl ?? 0x645d55;
  /* square out of the wall, clear of it by more than its end turns toward it; then down to lie half sunk */
  const s = d * 0.45 + 0.05, p0: V3 = [x + n[0] * s, y, z + n[2] * s], p1: V3 = [x + n[0] * (s + d * 0.7), y, z + n[2] * (s + d * 0.7)];
  const lie = d * 0.22, path: V3[] = [p0, p1, ...pts.map(([px, pz], k): V3 => [px, k === pts.length - 1 ? -d * 0.45 : lie, pz])];
  greatroot(F, path, d, d * 0.6, { g });
  bore(F, x, y, z, n, d * 1.05, { c, len: 2 * (s + d * 0.3), g });
  flank(F, pts.slice(0, -1), d, fc, g);
  const [ex, ez] = pts[pts.length - 1];
  heave(F, ex, ez, d * 0.6, { c: fc, g });
}

/** a great root out of a wall high at (x, y, z) on its face, which looks out `face`, d thick, arching over and down into
 *  the floor at (tx, tz): under its arch near the wall it can be walked, further out it is ducked or gone round; the wall
 *  broken where it came through, the floor heaved where it goes in */
export function vault(F: Floor, x: number, y: number, z: number, face: Dir, tx: number, tz: number,
  o: { d?: number; c?: number; fc?: number; g?: Grow } = {}): void {
  const g = o.g ?? grower('vault', x, y, z), d = o.d ?? 0.9, n = out(face), R = roomAt(F, tx, tz), c = o.c ?? R?.wl ?? 0x8a8378, fc = o.fc ?? R?.fl ?? 0x645d55;
  const s = d * 0.45 + 0.05, far = Math.hypot(tx - x, tz - z), p0: V3 = [x + n[0] * s, y, z + n[2] * s], p1: V3 = [x + n[0] * (s + d * 0.7), y + 0.05, z + n[2] * (s + d * 0.7)];
  const top: V3 = [x + n[0] * far * 0.4, y + g.rnd(0.1, 0.3), z + n[2] * far * 0.4], end: V3 = [tx, -d * 0.4, tz];
  const pts: V3[] = [p0, p1];
  for (let k = 1; k <= 5; k++) pts.push(curve(p1, top, end, k / 5));
  greatroot(F, pts, d, d * 0.7, { g });
  bore(F, x, y, z, n, d * 1.05, { c, len: 2 * (s + d * 0.3), g });
  heave(F, tx, tz, d * 0.8, { c: fc, g });
}
