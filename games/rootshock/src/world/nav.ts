import { CELL } from './grid';
import { circle, meetsTurned, rect } from './shapes';
import type { Dyn, World } from './world';

/* The nav graph (engine.md §7): where something can stand, and how it gets from there to the next spot. Spots lie on a
   1 m lattice in plan and at every floor height, so one graph covers every layer of a level: a walkway and the hall
   under it are one place to the cast. (Near a wall at an angle a spot may stand off the middle of its square, where the
   wall leaves room for it: NUDGE.) Each spot knows its headroom (a big body skips low ones), its room, and the door
   it stands in, if any (the door's state decides at run time who may pass). Platforms join their two ends.

   Built once per level with everything that moves moved out of the way; the sim keeps it, and fields over it say how far
   each spot is from the player: by foot for each kind of body, and for sound, which closed doors muffle.

   Size (engine.md §7, size): every spot and link is clear for a body NAV_R across that steps up STEP_UP and drops DROP.
   A bigger body is kept off what it does not fit by a mask over the graph (sim/fields.ts): spots and links narrower than
   it (`fitting`, worked out the first time something that wide asks), and steps higher or drops deeper than it takes.
   When some way climbs higher or drops further than that, the graph has the links for it too (`most` to buildNav), each
   knowing the step it climbs (`Nav.climb`). */

export const NAV = 1;
/** the radius every spot, and the way between two, is clear for */
export const NAV_R = 0.3;
const R = NAV_R;
/** a spot needs this much headroom at least (a crouch, or something low) */
const LOW = 1.0;
/** the step a body walks up, and the drop it takes, as a husk does (body.ts STEP_UP) */
export const STEP_UP = 0.5;
export const DROP = 2.5;
/** a body's width is looked for room for up to this height above the floor: what is higher does not stop it */
const CLEAR_H = 2;
/** where in its square a spot may stand, if a wall at an angle is in the way of its middle: the nearest of these to the
 *  middle that is clear. (Lattice squares and walls on the grid's lines agree; a wall at an angle, and a gap in one,
 *  fall anywhere across them, and a spot only in the middle would leave a way through a gap with no spot to take it) */
const NUDGE = (() => {
  const at = [-0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45], out: [number, number][] = [];
  for (const a of at) for (const b of at) out.push([a, b]);
  return out.sort((p, q) => Math.hypot(p[0], p[1]) - Math.hypot(q[0], q[1]) || p[0] - q[0] || p[1] - q[1]);
})();
const MIDDLE: [number, number][] = [[0, 0]];

export const enum Edge { Walk = 0, Drop = 1, Lift = 2, Climb = 3 }

export interface NavDoor { x0: number; z0: number; x1: number; z1: number; y0: number }
export interface NavLift { x0: number; z0: number; x1: number; z1: number; y0: number; y1: number }

export class Nav {
  n = 0;
  x: Float32Array; y: Float32Array; z: Float32Array;
  head: Float32Array;
  room: Int16Array;
  /** the door this spot stands in, or -1 */
  door: Int16Array;
  /** edges, compressed: node i's run from start[i] to start[i + 1] in to[] */
  start: Int32Array;
  to: Int32Array;
  kind: Uint8Array;
  /** for lift edges: which platform */
  lift: Int16Array;
  /** how far along the floor (a lift's ride counts its height) */
  len: Float32Array;
  /** the step a link climbs (m): a step up; none for a smooth slope, a step down, a drop or a ride */
  climb: Float32Array;
  /** the highest step and deepest drop any link here takes: what it was built for */
  most = { climb: STEP_UP, drop: DROP };
  /** the spots in each room */
  byRoom = new Map<number, number[]>();
  private cols = new Map<number, number[]>();

  constructor(spots: { x: number; y: number; z: number; head: number; room: number; door: number }[], edges: [number, number, Edge, number, number, number][]) {
    const n = (this.n = spots.length);
    this.x = new Float32Array(n); this.y = new Float32Array(n); this.z = new Float32Array(n);
    this.head = new Float32Array(n); this.room = new Int16Array(n); this.door = new Int16Array(n);
    spots.forEach((s, i) => {
      this.x[i] = s.x; this.y[i] = s.y; this.z[i] = s.z; this.head[i] = s.head; this.room[i] = s.room; this.door[i] = s.door;
      const k = colKey(Math.floor(s.x / NAV), Math.floor(s.z / NAV));
      let c = this.cols.get(k);
      if (!c) this.cols.set(k, (c = []));
      c.push(i);
      if (s.room >= 0) { let r = this.byRoom.get(s.room); if (!r) this.byRoom.set(s.room, (r = [])); r.push(i); }
    });
    edges.sort((a, b) => a[0] - b[0]);
    this.start = new Int32Array(n + 1);
    this.to = new Int32Array(edges.length); this.kind = new Uint8Array(edges.length); this.lift = new Int16Array(edges.length); this.len = new Float32Array(edges.length);
    this.climb = new Float32Array(edges.length);
    let e = 0;
    for (let i = 0; i < n; i++) {
      this.start[i] = e;
      while (e < edges.length && edges[e][0] === i) { this.to[e] = edges[e][1]; this.kind[e] = edges[e][2]; this.lift[e] = edges[e][3]; this.len[e] = edges[e][4]; this.climb[e] = edges[e][5]; e++; }
    }
    this.start[n] = e;
  }

  /** the spot something at (x, y, z) stands on: in its own lattice square if it can, else the nearest about it */
  locate(x: number, y: number, z: number): number {
    const ix = Math.floor(x / NAV), iz = Math.floor(z / NAV);
    let best = -1, bd = Infinity;
    for (let r = 0; r <= 1 && best < 0; r++)
      for (let dz = -r; dz <= r; dz++)
        for (let dx = -r; dx <= r; dx++) {
          const c = this.cols.get(colKey(ix + dx, iz + dz));
          if (!c) continue;
          for (const i of c) {
            const dy = y - this.y[i];
            if (dy < -0.8 || dy > 1.2) continue;
            const d = Math.hypot(this.x[i] - x, this.z[i] - z) + Math.abs(dy) * 2;
            if (d < bd) { bd = d; best = i; }
          }
        }
    return best;
  }
}

const colKey = (ix: number, iz: number) => (ix + 32768) * 65536 + (iz + 32768);

/** build the graph for a world. Doors and platforms are passed so their spots and links can be marked; `most`, the
 *  highest step any way walks up and the deepest drop any takes (sim/fields.ts, WAYS), if more than a husk's */
export function buildNav(w: World, doors: NavDoor[], lifts: NavLift[], most: { climb?: number; drop?: number } = {}): Nav {
  return emptied(w, () => build(w, doors, lifts, Math.max(STEP_UP, most.climb ?? 0), Math.max(DROP, most.drop ?? 0)));
}

/** with everything that moves out of the way: doors open, crates and bodies gone */
function emptied<T>(w: World, f: () => T): T {
  const saved = w.dyn.map(d => [d.y0, d.y1] as const);
  for (const d of w.dyn) { d.y0 = d.y1 = -1e6; }
  try {
    return f();
  } finally {
    w.dyn.forEach((d: Dyn, i) => { d.y0 = saved[i][0]; d.y1 = saved[i][1]; });
  }
}

function build(w: World, doors: NavDoor[], lifts: NavLift[], CLIMB: number, FALL: number): Nav {
  /* the level's extent, from its chunks */
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  w.grid.forEachChunk((cx, cy, cz) => {
    x0 = Math.min(x0, cx * 4); x1 = Math.max(x1, cx * 4 + 4); z0 = Math.min(z0, cz * 4); z1 = Math.max(z1, cz * 4 + 4);
    y0 = Math.min(y0, cy * 4); y1 = Math.max(y1, cy * 4 + 4);
  });
  const spots: { x: number; y: number; z: number; head: number; room: number; door: number }[] = [];
  const byCol = new Map<number, number[]>();
  const g = w.grid, j0 = Math.floor(y0 / CELL) - 1, j1 = Math.ceil(y1 / CELL); // one below: a floor on an all-rock chunk
  for (let iz = Math.floor(z0 / NAV); iz < Math.ceil(z1 / NAV); iz++)
    for (let ix = Math.floor(x0 / NAV); ix < Math.ceil(x1 / NAV); ix++) {
      const x = (ix + 0.5) * NAV, z = (iz + 0.5) * NAV;
      const tries = w.walls.length && w.walls.some(W => meetsTurned(rect(x, z, NAV / 2 + R, NAV / 2 + R), W.turn)) ? NUDGE : MIDDLE;
      /* floors in this column: rock or a block with open space over it, and any sloped floor */
      const cand: number[] = [], up: number[] = [];
      const ci = Math.floor(x / CELL), ck = Math.floor(z / CELL);
      for (let j = j0; j < j1; j++) if (g.get(ci, j, ck) < 0 && g.get(ci, j + 1, ck) >= 0) { cand.push((j + 1) * CELL); up.push(0.3); }
      /* a sloped floor: on a steep one (a cave's mouth), what a body stands on is higher than the middle by up to its radius */
      for (const s of w.surfaces) {
        const d = s.def;
        if (d.kind === 'floor' && x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1 && s.has(x, z)) { cand.push(s.heightAt(x, z)); up.push(0.3 + 2 * R); }
      }
      const here: number[] = [];
      for (const [n, c] of cand.entries())
        for (const [ox, oz] of tries) {
          const sx = x + ox, sz = z + oz, f = circle(sx, sz, R);
          const gy = w.groundBelow(f, c + up[n]);
          if (gy === -Infinity || gy < c - 0.3) continue;
          if (w.overlap(f, gy + 0.01, gy + LOW)) continue;
          if (here.some(i => Math.abs(spots[i].y - gy) < 0.4)) break;
          const head = w.ceilingAbove(f, gy + 0.01) - gy, R0 = w.roomAt(sx, gy + 0.5, sz);
          let door = -1;
          doors.forEach((d, k) => {
            const along = d.x1 - d.x0 > d.z1 - d.z0, cx = (d.x0 + d.x1) / 2, cz = (d.z0 + d.z1) / 2;
            const inX = along ? sx > d.x0 && sx < d.x1 : Math.abs(sx - cx) < 1;
            const inZ = along ? Math.abs(sz - cz) < 1 : sz > d.z0 && sz < d.z1;
            if (inX && inZ && Math.abs(gy - d.y0) < 0.6) door = k;
          });
          here.push(spots.length);
          spots.push({ x: sx, y: gy, z: sz, head, room: R0 ? R0.id : -1, door });
          break;
        }
      if (here.length) byCol.set(colKey(ix, iz), here);
    }

  const near = (list: number[] | undefined, y: number) => !!list && list.some(i => Math.abs(spots[i].y - y) <= STEP_UP);
  /* a slope steeper than a step a metre (a cave passage): a body climbs it a little at a time, so it is a walk both ways
     if the ground from the lower spot to the higher one rises smoothly, never more than a step at once */
  const smooth = (A: { x: number; y: number; z: number }, B: { x: number; y: number; z: number }) => {
    const n = Math.ceil(Math.hypot(B.x - A.x, B.z - A.z) / 0.1);
    let y = A.y;
    for (let k = 1; k <= n; k++) {
      const f = circle(A.x + ((B.x - A.x) * k) / n, A.z + ((B.z - A.z) * k) / n, R), g = w.groundBelow(f, y + STEP_UP / 2);
      if (g === -Infinity || g < y - STEP_UP / 2 || w.overlap(f, g + 0.01, g + LOW)) return false;
      y = g;
    }
    return Math.abs(y - B.y) < 0.1;
  };
  /* links between neighbouring spots: a step up or down, or a drop one way; the way between must be clear */
  const edges: [number, number, Edge, number, number, number][] = [];
  for (const [k, list] of byCol) {
    const ix = Math.floor(k / 65536) - 32768, iz = (k % 65536) - 32768;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const other = byCol.get(colKey(ix + dx, iz + dz));
      if (!other) continue;
      const diag = dx && dz;
      for (const a of list)
        for (const b of other) {
          const A = spots[a], B = spots[b], rise = B.y - A.y;
          const slope = Math.abs(rise) > STEP_UP && Math.abs(rise) < 2 * STEP_UP * (diag ? Math.SQRT2 : 1) && (rise > 0 ? smooth(A, B) : smooth(B, A));
          if (!slope && (rise > CLIMB || -rise > FALL || (diag && Math.abs(rise) > STEP_UP))) continue;
          const top = Math.max(A.y, B.y), mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2;
          /* the way between must be clear: on a diagonal, the corner it cuts and both squares beside it */
          if (w.overlap(circle(mx, mz, R), top + 0.01, top + LOW)) continue;
          if (diag && !(near(byCol.get(colKey(ix + dx, iz)), A.y) && near(byCol.get(colKey(ix, iz + dz)), A.y))) continue;
          edges.push([a, b, -rise > STEP_UP && !slope ? Edge.Drop : Edge.Walk, -1, diag ? Math.SQRT2 * NAV : NAV, !slope && rise > 0 ? rise : 0]);
        }
    }
  }

  /* a platform joins the spots on it at the bottom to the spots beside it at the top */
  lifts.forEach((L, li) => {
    const bottom: number[] = [], top: number[] = [];
    spots.forEach((s, i) => {
      const on = s.x > L.x0 && s.x < L.x1 && s.z > L.z0 && s.z < L.z1;
      if (on && Math.abs(s.y - L.y0) < 0.4) bottom.push(i);
      const near = s.x > L.x0 - 1.2 && s.x < L.x1 + 1.2 && s.z > L.z0 - 1.2 && s.z < L.z1 + 1.2;
      if (near && !on && Math.abs(s.y - L.y1) < 0.4) top.push(i);
    });
    const ride = Math.abs(L.y1 - L.y0) + 4; // the ride, and the wait for it
    for (const b of bottom) for (const t of top) { edges.push([b, t, Edge.Lift, li, ride, 0]); edges.push([t, b, Edge.Lift, li, ride, 0]); }
  });
  /* a fixed ladder joins the spots by its foot to the spots by its head: climbed, by whoever climbs (Rules.climb) */
  for (const L of w.def.climbs ?? []) {
    const foot: number[] = [], head: number[] = [];
    spots.forEach((s, i) => {
      if (!(s.x > L.x0 - 1 && s.x < L.x1 + 1 && s.z > L.z0 - 1 && s.z < L.z1 + 1)) return;
      if (Math.abs(s.y - L.y0) < 0.4) foot.push(i);
      if (Math.abs(s.y - L.y1) < 0.4) head.push(i);
    });
    const up = L.y1 - L.y0 + 2;
    for (const a of foot) for (const t of head) { edges.push([a, t, Edge.Climb, -1, up, 0]); edges.push([t, a, Edge.Climb, -1, up, 0]); }
  }

  const nav = new Nav(spots, edges);
  nav.most = { climb: CLIMB, drop: FALL };
  return nav;
}

/** where a body `r` across fits (1) and where it does not (0): each spot, and each link; and where in each spot's square
 *  it stands (`at`: x and z from the spot, the nearest its middle that fits). It fits at a spot if it can stand somewhere
 *  in the spot's square on the floor there (the highest under it within a step: the next tread of a stair, the ground
 *  rising on a slope) with room over that up to the spot's headroom, or CLEAR_H; it walks a link if it fits at both ends
 *  and somewhere across the way between. Somewhere, not at the middle: in a corridor 2 m wide every spot is half a metre
 *  from a wall, and a body 1.5 m across goes down the middle between them, making for where it fits in each square
 *  (sim/cast/move.ts, follow). Made once a graph and size, with everything that moves out of the way as the graph was;
 *  anything no wider than NAV_R fits everywhere, at the middle */
export interface Fit { spot: Uint8Array; edge: Uint8Array; at: Float32Array }
const fitted = new WeakMap<Nav, Map<number, Fit>>();
export function fitting(w: World, nav: Nav, r: number): Fit {
  let byR = fitted.get(nav);
  if (!byR) fitted.set(nav, (byR = new Map()));
  let F = byR.get(r);
  if (F) return F;
  F = emptied(w, () => {
    /* the first of `offs` it fits at, or -1 */
    const fits = (x: number, z: number, y: number, up: number, offs: readonly (readonly [number, number])[]) => {
      for (let k = 0; k < offs.length; k++) {
        const f = circle(x + offs[k][0], z + offs[k][1], r), g = w.groundBelow(f, y + STEP_UP);
        if (g >= y - STEP_UP && !w.overlap(f, g + 0.01, g + up)) return k;
      }
      return -1;
    };
    const up = (i: number) => Math.max(LOW, Math.min(nav.head[i], CLEAR_H) - 0.01);
    const spot = new Uint8Array(nav.n), edge = new Uint8Array(nav.to.length), at = new Float32Array(nav.n * 2), between = new Map<number, number>();
    for (let i = 0; i < nav.n; i++) {
      const k = fits(nav.x[i], nav.z[i], nav.y[i], up(i), SQUARE);
      if (k < 0) continue;
      spot[i] = 1; at[i * 2] = SQUARE[k][0]; at[i * 2 + 1] = SQUARE[k][1];
    }
    for (let a = 0; a < nav.n; a++)
      for (let e = nav.start[a]; e < nav.start[a + 1]; e++) {
        const b = nav.to[e];
        if (!spot[a] || !spot[b]) continue;
        if (nav.kind[e] === Edge.Lift || nav.kind[e] === Edge.Climb) { edge[e] = 1; continue; }
        /* the way between is the same both ways: looked at once */
        const key = Math.min(a, b) * nav.n + Math.max(a, b);
        let ok = between.get(key);
        if (ok === undefined) {
          const dx = nav.x[b] - nav.x[a], dz = nav.z[b] - nav.z[a], d = Math.hypot(dx, dz) || 1, across = ACROSS.map(k => [(-dz / d) * k, (dx / d) * k] as const);
          ok = fits((nav.x[a] + nav.x[b]) / 2, (nav.z[a] + nav.z[b]) / 2, Math.max(nav.y[a], nav.y[b]), Math.min(up(a), up(b)), across) >= 0 ? 1 : 0;
          between.set(key, ok);
        }
        edge[e] = ok;
      }
    return { spot, edge, at };
  });
  byR.set(r, F);
  return F;
}
/** where in a spot's square, and how far across a link's way, a body is looked for: the middle first */
const ACROSS = [0, 0.25, -0.25, 0.5, -0.5];
const SQUARE = ACROSS.flatMap(x => ACROSS.map(z => [x, z] as const)).sort((p, q) => Math.hypot(p[0], p[1]) - Math.hypot(q[0], q[1]));

/* ---- fields: distance from one spot to every other, by a rule for who may pass where */

/** who may go where, as arrays (no call per edge): spots that may not be entered, what entering a spot costs on top of
 *  the way there (a shut door muffling a sound), which platforms may be ridden, what a drop costs on top, and the links
 *  that may be taken at all, by size (null: every one) */
export interface Rules {
  blocked: Uint8Array;
  enter: Float32Array | null;
  lifts: Uint8Array;
  drop: number;
  edges: Uint8Array | null;
  /** fixed ladders may be climbed (the cast climb none) */
  climb?: boolean;
}

/** anywhere, on foot: every spot, every platform, every ladder */
export function openRules(nav: Nav): Rules {
  let lifts = 0;
  for (let e = 0; e < nav.lift.length; e++) lifts = Math.max(lifts, nav.lift[e] + 1);
  return { blocked: new Uint8Array(nav.n), enter: null, lifts: new Uint8Array(lifts).fill(1), drop: 0, edges: null, climb: true };
}

/** may the edge e (from spot a into spot b) be taken under these rules? null if not; else what it costs */
export function edgeCost(nav: Nav, R: Rules, e: number, b: number): number | null {
  if (R.blocked[b] || (R.edges && !R.edges[e])) return null;
  const k = nav.kind[e];
  if (k === Edge.Lift && !R.lifts[nav.lift[e]]) return null;
  if (k === Edge.Climb && !R.climb) return null;
  return nav.len[e] + (k === Edge.Drop ? R.drop : 0) + (R.enter ? R.enter[b] : 0);
}

/** distances from `from` over the graph by these rules, out to `limit` (beyond it, Infinity). Walked backwards: the
 *  field says how far each spot is from `from` when walking toward it. */
export function field(nav: Nav, from: number, R: Rules, out?: Float32Array, limit = Infinity): Float32Array {
  const d = out ?? new Float32Array(nav.n);
  d.fill(Infinity);
  if (from < 0) return d;
  /* the graph's edges run forward; a field to `from` needs them backward. Built once per nav. */
  const rev = reverse(nav), heap = heapFor(nav);
  const { blocked, enter, lifts, drop, edges, climb } = R, kind = nav.kind, lift = nav.lift, len = nav.len;
  heap.size = 0;
  d[from] = 0;
  heap.push(from, 0);
  while (heap.size) {
    const b = heap.pop(), db = d[b];
    if (db > limit) break;
    /* a spot that may not be entered is never on the way to anywhere (but the start always is) */
    if (b !== from && blocked[b]) continue;
    const eb = enter ? enter[b] : 0;
    for (let e = rev.start[b]; e < rev.start[b + 1]; e++) {
      const a = rev.from[e], fe = rev.edge[e], k = kind[fe];
      if (k === Edge.Lift && !lifts[lift[fe]]) continue;
      if (k === Edge.Climb && !climb) continue;
      if (edges && !edges[fe]) continue;
      const nd = db + len[fe] + eb + (k === Edge.Drop ? drop : 0);
      if (nd < d[a]) { d[a] = nd; heap.push(a, nd); }
    }
  }
  return d;
}

const heaps = new WeakMap<Nav, Heap>();
const heapFor = (nav: Nav) => {
  let h = heaps.get(nav);
  if (!h) heaps.set(nav, (h = new Heap(nav.n)));
  return h;
};

const reverses = new WeakMap<Nav, { start: Int32Array; from: Int32Array; edge: Int32Array }>();
function reverse(nav: Nav) {
  let r = reverses.get(nav);
  if (r) return r;
  const n = nav.n, m = nav.to.length, count = new Int32Array(n + 1);
  for (let e = 0; e < m; e++) count[nav.to[e] + 1]++;
  for (let i = 0; i < n; i++) count[i + 1] += count[i];
  const start = count.slice(), fill = count.slice(0, n), from = new Int32Array(m), edge = new Int32Array(m);
  for (let a = 0; a < n; a++)
    for (let e = nav.start[a]; e < nav.start[a + 1]; e++) { const b = nav.to[e], p = fill[b]++; from[p] = a; edge[p] = e; }
  r = { start, from, edge };
  reverses.set(nav, r);
  return r;
}

/** a binary heap of spots by distance */
class Heap {
  private ids: Int32Array;
  private keys: Float32Array;
  size = 0;
  constructor(cap: number) { this.ids = new Int32Array(cap * 4 + 16); this.keys = new Float32Array(cap * 4 + 16); }
  push(id: number, k: number): void {
    if (this.size >= this.ids.length) {
      const ni = new Int32Array(this.ids.length * 2), nk = new Float32Array(this.ids.length * 2);
      ni.set(this.ids); nk.set(this.keys); this.ids = ni; this.keys = nk;
    }
    let i = this.size++;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.keys[p] <= k) break;
      this.ids[i] = this.ids[p]; this.keys[i] = this.keys[p]; i = p;
    }
    this.ids[i] = id; this.keys[i] = k;
  }
  pop(): number {
    const top = this.ids[0], id = this.ids[--this.size], k = this.keys[this.size];
    let i = 0;
    for (;;) {
      let c = 2 * i + 1;
      if (c >= this.size) break;
      if (c + 1 < this.size && this.keys[c + 1] < this.keys[c]) c++;
      if (this.keys[c] >= k) break;
      this.ids[i] = this.ids[c]; this.keys[i] = this.keys[c]; i = c;
    }
    this.ids[i] = id; this.keys[i] = k;
    return top;
  }
}
