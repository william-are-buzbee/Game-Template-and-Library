import type { Mat } from '../content/materials';
import { inPoly } from '../core/math';
import type { BlockDef, LevelDef, RoomDef, SurfaceDef, WallDef, WaterDef } from '../content/types';
import { CELL, Grid, blockCell } from './grid';
import { meets, meetsTurned, samples, segmentBox, segmentTurned, turnedAlong, turnedReach, type Box, type Footprint, type Turned } from './shapes';

/** something solid that moves: a door, a platform, a loose crate. The sim moves it; the world reports it. */
export interface Dyn extends Box {
  kind: 'mover' | 'loose' | 'body';
  id: number;
  /** glass: it stops what moves, and what looks goes through it */
  glass?: boolean;
  /** what it is made of, for what stands on it: a platform's deck, a crate's boards */
  mat?: Mat;
}

/** what a query sees through: one moving thing, or a test for which */
export type Ignore = Dyn | null | ((d: Dyn) => boolean);
const skipper = (ig: Ignore) => (typeof ig === 'function' ? ig : (d: Dyn) => d === ig);

/** what a query ran into: nothing, the fixed world, or something that moves */
export type Hit = null | 'world' | Dyn;

/** a sloped surface, ready to be asked */
export class Surface {
  readonly lo: number;
  readonly hi: number;
  constructor(readonly def: SurfaceDef) {
    this.lo = Math.min(...def.h);
    this.hi = Math.max(...def.h);
  }
  /** is it there over (x, z)? Everywhere in its bounds, unless it is masked */
  has(x: number, z: number): boolean {
    const d = this.def;
    if (!d.mask) return true;
    const i = Math.min(Math.max(Math.floor((x - d.x0) / d.res), 0), d.nx - 2), j = Math.min(Math.max(Math.floor((z - d.z0) / d.res), 0), d.nz - 2);
    return d.mask[j * (d.nx - 1) + i] === 1;
  }
  /** its height at (x, z), blended from the lattice; outside its bounds, the height at the nearest edge */
  heightAt(x: number, z: number): number {
    const d = this.def, fx = Math.min(Math.max((x - d.x0) / d.res, 0), d.nx - 1 - 1e-9), fz = Math.min(Math.max((z - d.z0) / d.res, 0), d.nz - 1 - 1e-9);
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, h = d.h, n = d.nx;
    return h[j * n + i] * (1 - u) * (1 - v) + h[j * n + i + 1] * u * (1 - v) + h[(j + 1) * n + i] * (1 - u) * v + h[(j + 1) * n + i + 1] * u * v;
  }
  /** the highest (floor) or lowest (ceiling) it gets under a footprint */
  extremeUnder(f: Footprint): number {
    const d = this.def;
    let best = d.kind === 'floor' ? -Infinity : Infinity;
    for (const [x, z] of samples(f)) {
      const cx = Math.min(Math.max(x, d.x0), d.x1), cz = Math.min(Math.max(z, d.z0), d.z1);
      if (d.mask && !this.has(cx, cz)) continue;
      const h = this.heightAt(cx, cz);
      best = d.kind === 'floor' ? Math.max(best, h) : Math.min(best, h);
    }
    return best;
  }
}

const EPS = 1e-6;

/** a fixed solid: a box (a prop, a collider), or a wall turned on the plan (`turn`; the box bounds it). It says what it
 *  is made of, if its level does */
type Fixed = Box & { mat?: Mat; turn?: Turned };
/** does the footprint meet a fixed solid's plan? */
const hits = (f: Footprint, b: Fixed): boolean => meets(f, b.x0, b.z0, b.x1, b.z1) && (!b.turn || meetsTurned(f, b.turn));

/* The world: one level compiled into one spatial model. Every spatial question goes through here: bodies, sight,
   sound, pathing, light. An answer combines the grid, the fixed solids (props, colliders), the sloped surfaces, and
   whatever moves (doors, platforms, loose crates), which the sim keeps in `dyn`. */
export class World {
  readonly grid = new Grid();
  readonly rooms: RoomDef[];
  readonly blocks: BlockDef[];
  readonly surfaces: Surface[];
  readonly water: WaterDef[];
  /** the walls at an angle, as each stands */
  readonly walls: (WallDef & { turn: Turned })[];
  /** the moving solids, kept up to date by the sim */
  readonly dyn: Dyn[] = [];
  private ids = 0;
  /** fixed solids, bucketed by 2 m column so a query only looks at what is near */
  private boxes = new Map<number, Fixed[]>();
  private static readonly B = 2;

  constructor(readonly def: LevelDef) {
    this.rooms = def.rooms;
    this.blocks = def.blocks;
    this.surfaces = def.surfaces.map(s => new Surface(s));
    this.water = def.water;
    /* carve the rooms, then build the blocks back in */
    for (const r of def.rooms) {
      const c = r.cells;
      if (r.poly) { this.carve(r, r.poly); continue; }
      if (!c) { this.grid.fill(r.x0, r.y0, r.z0, r.x1, r.y0 + r.ht, r.z1, r.id); continue; }
      for (let j = 0; j < c.nz; j++)
        for (let i = 0; i < c.nx; i++) {
          const k = j * c.nx + i;
          if (c.lo[k] < c.hi[k]) this.grid.fill(r.x0 + i * c.res, c.lo[k], r.z0 + j * c.res, r.x0 + (i + 1) * c.res, c.hi[k], r.z0 + (j + 1) * c.res, r.id);
        }
    }
    def.blocks.forEach((b, i) => this.grid.fill(b.x0, b.y0, b.z0, b.x1, b.y1, b.z1, blockCell(i)));
    for (const p of def.props) {
      if (!p.solid || p.loose) continue;
      const c = Math.abs(Math.cos(p.ry)), s = Math.abs(Math.sin(p.ry)), ex = (p.sx * c + p.sz * s) / 2, ez = (p.sx * s + p.sz * c) / 2;
      this.addBox({ x0: p.x - ex, y0: p.y, z0: p.z - ez, x1: p.x + ex, y1: p.y + p.sy, z1: p.z + ez, ...(p.mat ? { mat: p.mat } : {}) });
    }
    for (const c of def.colliders) this.addBox(c);
    this.walls = (def.walls ?? []).map(W => ({ ...W, turn: turnedAlong(W.ax, W.az, W.bx, W.bz, W.t) }));
    for (const W of this.walls) {
      const t = W.turn, [rx, rz] = turnedReach(t);
      this.addBox({ x0: t.cx - rx, y0: W.y0, z0: t.cz - rz, x1: t.cx + rx, y1: W.y1, z1: t.cz + rz, turn: t, ...(W.mat ? { mat: W.mat } : {}) });
    }
  }

  /** carve a room of any outline: each column of cells whose middle is inside it, from its floor to its ceiling */
  private carve(r: RoomDef, pts: [number, number][]): void {
    for (let k = Math.floor(r.z0 / CELL); k < Math.ceil(r.z1 / CELL); k++)
      for (let i = Math.floor(r.x0 / CELL); i < Math.ceil(r.x1 / CELL); i++)
        if (inPoly(pts, (i + 0.5) * CELL, (k + 0.5) * CELL)) this.grid.fill(i * CELL, r.y0, k * CELL, (i + 1) * CELL, r.y0 + r.ht, (k + 1) * CELL, r.id);
  }

  /** is (x, y, z) inside one of the walls at an angle? */
  inWall(x: number, y: number, z: number): boolean {
    const f: Footprint = { x, z, hx: 1e-4, hz: 1e-4, round: false };
    let inside = false;
    this.boxesNear(f, b => { if (b.turn && y > b.y0 && y < b.y1) inside = true; });
    return inside;
  }

  private bkey(i: number, k: number): number { return (k + 32768) * 65536 + (i + 32768); }
  private addBox(b: Fixed): void {
    const B = World.B;
    for (let k = Math.floor(b.z0 / B); k <= Math.floor(b.z1 / B); k++)
      for (let i = Math.floor(b.x0 / B); i <= Math.floor(b.x1 / B); i++) {
        const key = this.bkey(i, k);
        let a = this.boxes.get(key);
        if (!a) this.boxes.set(key, (a = []));
        a.push(b);
      }
  }
  /** each fixed solid whose plan meets the footprint, once */
  private boxesNear(f: Footprint, fn: (b: Fixed) => void): void {
    const B = World.B, k0 = Math.floor((f.z - f.hz) / B), k1 = Math.floor((f.z + f.hz) / B), i0 = Math.floor((f.x - f.hx) / B), i1 = Math.floor((f.x + f.hx) / B);
    /* in one column, nothing is met twice: no need to keep count (a small footprint, a corpse's point, nearly always) */
    if (k0 === k1 && i0 === i1) {
      const a = this.boxes.get(this.bkey(i0, k0));
      if (a) for (const b of a) if (hits(f, b)) fn(b);
      return;
    }
    const seen = new Set<Box>();
    for (let k = k0; k <= k1; k++)
      for (let i = i0; i <= i1; i++) {
        const a = this.boxes.get(this.bkey(i, k));
        if (a) for (const b of a) {
          if (seen.has(b)) continue;
          seen.add(b);
          if (hits(f, b)) fn(b);
        }
      }
  }
  private dynNear(f: Footprint, ignore: Ignore, fn: (d: Dyn) => void): void {
    const skip = ignore === null ? null : typeof ignore === 'function' ? ignore : null;
    const x0 = f.x - f.hx, x1 = f.x + f.hx, z0 = f.z - f.hz, z1 = f.z + f.hz;
    for (const d of this.dyn) {
      if (d.x1 < x0 || d.x0 > x1 || d.z1 < z0 || d.z0 > z1) continue; // nowhere near: no call at all
      if (skip ? skip(d) : d === ignore) continue;
      if (meets(f, d.x0, d.z0, d.x1, d.z1)) fn(d);
    }
  }
  private surfacesNear(f: Footprint, fn: (s: Surface) => void): void {
    for (const s of this.surfaces) if (meets(f, s.def.x0, s.def.z0, s.def.x1, s.def.z1)) fn(s);
  }
  /** each grid column (i, k) whose cell meets the footprint */
  private columns(f: Footprint, fn: (i: number, k: number) => void): void {
    for (let k = Math.floor((f.z - f.hz) / CELL); k <= Math.floor((f.z + f.hz) / CELL); k++)
      for (let i = Math.floor((f.x - f.hx) / CELL); i <= Math.floor((f.x + f.hx) / CELL); i++)
        if (meets(f, i * CELL, k * CELL, (i + 1) * CELL, (k + 1) * CELL)) fn(i, k);
  }

  /** a new id for something that moves. Ids count from 1 in each world, in the order things are made, so the same
   *  level always gives the same ids (a save can name things by them). */
  newId(): number {
    return ++this.ids;
  }

  /** every fixed solid box, once (for the dev overlay): a wall at an angle as its turned box */
  forEachBox(fn: (b: Box & { turn?: Turned }) => void): void {
    const seen = new Set<Box>();
    for (const a of this.boxes.values()) for (const b of a) if (!seen.has(b)) { seen.add(b); fn(b); }
  }

  solidAt(x: number, y: number, z: number): boolean {
    if (this.grid.at(x, y, z) < 0) return true;
    const f: Footprint = { x, z, hx: 1e-4, hz: 1e-4, round: false };
    return this.overlap(f, y - 1e-4, y + 1e-4) !== null;
  }

  /** does anything solid overlap the footprint between heights y0 and y1? */
  overlap(f: Footprint, y0: number, y1: number, ignore: Ignore = null): Hit {
    const g = this.grid, j0 = Math.floor(y0 / CELL), j1 = Math.floor((y1 - EPS) / CELL);
    let hit: Hit = null;
    this.columns(f, (i, k) => {
      if (hit) return;
      for (let j = j0; j <= j1; j++) if (g.get(i, j, k) < 0) { hit = 'world'; return; }
    });
    if (hit) return hit;
    this.boxesNear(f, b => { if (b.y0 < y1 && b.y1 > y0) hit = 'world'; });
    if (hit) return hit;
    this.surfacesNear(f, s => {
      if (hit) return;
      const e = s.extremeUnder(f), d = s.def;
      if (d.kind === 'floor' ? e > y0 + EPS && d.base < y1 : e < y1 - EPS && d.base > y0) hit = 'world';
    });
    if (hit) return hit;
    this.dynNear(f, ignore, d => { if (!hit && d.y0 < y1 && d.y1 > y0) hit = d; });
    return hit;
  }

  /** the highest surface under the footprint whose top is at or below `top`: what it stands on */
  groundBelow(f: Footprint, top: number, ignore: Ignore = null): number {
    const g = this.grid, jt = Math.floor(top / CELL + EPS) - 1;
    let best = -Infinity;
    this.columns(f, (i, k) => {
      /* solid running on up past `top` is something in the way, not ground */
      if (g.get(i, jt + 1, k) < 0 && (jt + 1) * CELL < top - EPS) return;
      for (let j = jt, n = 0; n < 4096; j--, n++) if (g.get(i, j, k) < 0) { best = Math.max(best, (j + 1) * CELL); return; }
    });
    const consider = (y1: number) => { if (y1 <= top + EPS && y1 > best) best = y1; };
    this.boxesNear(f, b => consider(b.y1));
    this.dynNear(f, ignore, d => consider(d.y1));
    this.surfacesNear(f, s => {
      if (s.def.kind !== 'floor') return;
      const e = s.extremeUnder(f);
      if (e <= top + EPS && e > best) best = e;
    });
    return best;
  }

  /** the lowest surface over the footprint whose underside is at or above `from`: what it would hit its head on.
   *  `upTo`: nothing higher matters to the caller (Infinity is returned for anything above it), which spares a climb
   *  through every empty cell of a tall cavern. */
  ceilingAbove(f: Footprint, from: number, ignore: Ignore = null, upTo = Infinity): number {
    const g = this.grid, jf = Math.ceil(from / CELL - EPS), n1 = Math.min(4096, Math.ceil((upTo - from) / CELL) + 1);
    let best = Infinity;
    this.columns(f, (i, k) => {
      for (let j = jf, n = 0; n < n1; j++, n++) if (g.get(i, j, k) < 0) { best = Math.min(best, j * CELL); return; }
    });
    const consider = (y0: number) => { if (y0 >= from - EPS && y0 < best) best = y0; };
    this.boxesNear(f, b => consider(b.y0));
    this.dynNear(f, ignore, d => consider(d.y0));
    this.surfacesNear(f, s => {
      if (s.def.kind !== 'ceiling') return;
      const e = s.extremeUnder(f);
      if (e >= from - EPS && e < best) best = e;
    });
    return best;
  }

  /** how far (0..1) a footprint can travel by (dx, dz) before it runs into something; 1 if all the way */
  sweep(f: Footprint, y0: number, y1: number, dx: number, dz: number, ignore: Ignore = null): number {
    const at = (t: number): Footprint => ({ ...f, x: f.x + dx * t, z: f.z + dz * t });
    const len = Math.hypot(dx, dz), stepLen = Math.max(0.05, Math.min(f.hx, f.hz) * 0.5), n = Math.max(1, Math.ceil(len / stepLen));
    let ok = 0;
    for (let s = 1; s <= n; s++) {
      const t = s / n;
      if (this.overlap(at(t), y0, y1, ignore)) {
        let lo = ok, hi = t;
        for (let k = 0; k < 8; k++) {
          const m = (lo + hi) / 2;
          if (this.overlap(at(m), y0, y1, ignore)) hi = m;
          else lo = m;
        }
        return lo;
      }
      ok = t;
    }
    return 1;
  }

  /** if the footprint overlaps something, the smallest nudge (dx, dy, dz) that frees it; null if it is clear or stuck */
  pushOut(f: Footprint, y0: number, y1: number, ignore: Ignore = null): [number, number, number] | null {
    if (!this.overlap(f, y0, y1, ignore)) return null;
    for (const d of [0.02, 0.05, 0.1, 0.2, 0.35, 0.5, 0.75]) {
      if (!this.overlap(f, y0 + d, y1 + d, ignore)) return [0, d, 0];
      for (let a = 0; a < 8; a++) {
        const dx = Math.cos((a * Math.PI) / 4) * d, dz = Math.sin((a * Math.PI) / 4) * d;
        if (!this.overlap({ ...f, x: f.x + dx, z: f.z + dz }, y0, y1, ignore)) return [dx, 0, dz];
      }
    }
    return null;
  }

  /** where a straight line from a to b first meets anything solid, as a fraction 0..1 of the way; 1 if it is clear.
   *  `ignore`: one moving thing to see through, or a test for which to see through (bodies, for a line of sight) */
  raycast(ax: number, ay: number, az: number, bx: number, by: number, bz: number, ignore: Ignore = null): number {
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    let best = this.gridRay(ax, ay, az, dx, dy, dz);
    /* fixed solids: the buckets the line passes over */
    const B = World.B, len = Math.hypot(dx, dz), n = Math.max(1, Math.ceil(len / (B / 4))), seen = new Set<Box>();
    for (let s = 0; s <= n; s++) {
      const x = ax + (dx * s) / n, z = az + (dz * s) / n;
      const a = this.boxes.get(this.bkey(Math.floor(x / B), Math.floor(z / B)));
      if (a) for (const b of a) if (!seen.has(b)) {
        seen.add(b);
        best = Math.min(best, b.turn ? segmentTurned(ax, ay, az, dx, dy, dz, b.turn, b.y0, b.y1) : segmentBox(ax, ay, az, dx, dy, dz, b));
      }
    }
    const skip = skipper(ignore);
    for (const d of this.dyn) if (!skip(d)) best = Math.min(best, segmentBox(ax, ay, az, dx, dy, dz, d));
    for (const s of this.surfaces) best = Math.min(best, this.surfaceRay(s, ax, ay, az, dx, dy, dz, best));
    return Math.min(1, best);
  }

  /** whether a straight line from a to b is clear of the grid (rock, walls, blocks), whatever moves or stands on it: a
   *  quick, generous line of sight, for what only needs to know it might be seen (the renderer's) */
  gridClear(ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean {
    return this.gridRay(ax, ay, az, bx - ax, by - ay, bz - az) >= 1;
  }

  /** the grid, cell by cell along the line (Amanatides and Woo) */
  private gridRay(ax: number, ay: number, az: number, dx: number, dy: number, dz: number): number {
    const g = this.grid, p = [ax / CELL, ay / CELL, az / CELL], d = [dx / CELL, dy / CELL, dz / CELL];
    const c = p.map(Math.floor), step = d.map(Math.sign);
    const tMax = d.map((v, a) => (v === 0 ? Infinity : ((v > 0 ? c[a] + 1 : c[a]) - p[a]) / v));
    const tDelta = d.map(v => (v === 0 ? Infinity : Math.abs(1 / v)));
    if (g.get(c[0], c[1], c[2]) < 0) return 0;
    for (let n = 0; n < 100000; n++) {
      const a = tMax[0] < tMax[1] ? (tMax[0] < tMax[2] ? 0 : 2) : tMax[1] < tMax[2] ? 1 : 2, t = tMax[a];
      if (t > 1) return Infinity;
      c[a] += step[a];
      tMax[a] += tDelta[a];
      if (g.get(c[0], c[1], c[2]) < 0) return t;
    }
    return Infinity;
  }

  private surfaceRay(s: Surface, ax: number, ay: number, az: number, dx: number, dy: number, dz: number, limit: number): number {
    const d = s.def, inside = (t: number) => {
      const x = ax + dx * t, z = az + dz * t;
      if (x < d.x0 || x > d.x1 || z < d.z0 || z > d.z1 || !s.has(x, z)) return false;
      const y = ay + dy * t, h = s.heightAt(x, z);
      return d.kind === 'floor' ? y < h && y > d.base : y > h && y < d.base;
    };
    const len = Math.hypot(dx, dy, dz), n = Math.max(1, Math.ceil((len * Math.min(1, limit)) / 0.1));
    let prev = 0;
    for (let k = 0; k <= n; k++) {
      const t = (k / n) * Math.min(1, limit);
      if (inside(t)) {
        if (k === 0) return 0;
        let lo = prev, hi = t;
        for (let m = 0; m < 10; m++) { const mid = (lo + hi) / 2; if (inside(mid)) hi = mid; else lo = mid; }
        return hi;
      }
      prev = t;
    }
    return Infinity;
  }

  /** the water's surface over (x, z), or -Infinity where there is none */
  waterAt(x: number, z: number): number {
    let lv = -Infinity;
    for (const w of this.water) if (x >= w.x0 && x < w.x1 && z >= w.z0 && z < w.z1 && w.level > lv) lv = w.level;
    return lv;
  }

  /** the rooms that open into this one: open cells just outside its box (or its outline), at its floor and a little
   *  above, and not across a wall */
  neighbours(id: number): number[] {
    const R = this.rooms[id], out = new Set<number>(), g = this.grid, walls = this.walls.length > 0;
    /* the cell at (x, z), looked at from (ex, ez) on the room's side: not if a wall stands between */
    const look = (x: number, y: number, z: number, ex: number, ez: number) => {
      const c = g.at(x, y, z);
      if (c < 0 || c === id) return;
      if (walls && [0, 0.5, 1].some(f => this.inWall(ex + (x - ex) * f, y, ez + (z - ez) * f))) return;
      out.add(c);
    };
    if (R.poly) {
      /* along each side, out past the staircase of its cells (half a cell's diagonal) and half a cell more */
      const P = R.poly, n = P.length, out0 = (CELL / 2) * Math.SQRT2 + CELL / 2;
      let area = 0;
      for (let i = 0; i < n; i++) { const [ax, az] = P[i], [bx, bz] = P[(i + 1) % n]; area += ax * bz - bx * az; }
      for (let i = 0; i < n; i++) {
        const [ax, az] = P[i], [bx, bz] = P[(i + 1) % n], len = Math.hypot(bx - ax, bz - az), side = area > 0 ? 1 : -1;
        if (len < 1e-9) continue;
        const nx = ((bz - az) / len) * side, nz = (-(bx - ax) / len) * side;
        for (const y of [R.y0 + 0.3, R.y0 + 1.2])
          for (let d = CELL / 2; d < len; d += CELL) {
            const ex = ax + ((bx - ax) * d) / len, ez = az + ((bz - az) * d) / len;
            look(ex + nx * out0, y, ez + nz * out0, ex, ez);
          }
      }
      return [...out];
    }
    for (const y of [R.y0 + 0.3, R.y0 + 1.2])
      for (let x = R.x0 + CELL / 2; x < R.x1; x += CELL)
        for (const [z, e] of [[R.z0 - CELL / 2, R.z0], [R.z1 + CELL / 2, R.z1]]) look(x, y, z, x, e);
    for (const y of [R.y0 + 0.3, R.y0 + 1.2])
      for (let z = R.z0 + CELL / 2; z < R.z1; z += CELL)
        for (const [x, e] of [[R.x0 - CELL / 2, R.x0], [R.x1 + CELL / 2, R.x1]]) look(x, y, z, e, z);
    return [...out];
  }

  /** the room at a point, or null in rock */
  roomAt(x: number, y: number, z: number): RoomDef | null {
    const c = this.grid.at(x, y, z);
    return c >= 0 ? this.rooms[c] : null;
  }

  /** what a solid is made of where a line from (fx, fy, fz) meets it at (x, y, z): something there that says (a crate,
   *  a container, a door), a block, or else the wall of the room the line came through */
  solidMat(x: number, y: number, z: number, fx: number, fy: number, fz: number): Mat {
    const f: Footprint = { x, z, hx: 0.06, hz: 0.06, round: false };
    let m: Mat | null = null;
    const at = (b: Fixed | Dyn) => { if (b.mat && y > b.y0 - 0.06 && y < b.y1 + 0.06) m = b.mat; };
    this.boxesNear(f, at);
    this.dynNear(f, null, at);
    if (m) return m;
    const dx = x - fx, dy = y - fy, dz = z - fz, l = Math.hypot(dx, dy, dz) || 1;
    const c = this.grid.at(x + (dx / l) * 0.05, y + (dy / l) * 0.05, z + (dz / l) * 0.05);
    if (c <= -2) return this.blocks[-2 - c].mat;
    return this.roomAt(x - (dx / l) * 0.15, y - (dy / l) * 0.15, z - (dz / l) * 0.15)?.mat.wall ?? 'rock';
  }

  /** what is underfoot at a point (feet at y): what `on` is made of, if that is what you stand on; else the top of
   *  something there that says what it is (a crate's lid, a container's roof); else a sloped floor within a quarter
   *  metre of your feet; else the floor of the room you are in */
  floorMat(x: number, y: number, z: number, on: Dyn | null = null): Mat {
    if (on) return on.mat ?? 'concrete';
    const f: Footprint = { x, z, hx: 1e-4, hz: 1e-4, round: false };
    let top: Mat | null = null;
    const at = (b: Fixed | Dyn) => { if (b.mat && Math.abs(b.y1 - y) < 0.05) top = b.mat; };
    this.boxesNear(f, at);
    this.dynNear(f, null, at);
    if (top) return top;
    for (const s of this.surfaces) {
      const d = s.def;
      if (d.kind !== 'floor' || d.hidden || x < d.x0 || x > d.x1 || z < d.z0 || z > d.z1 || !s.has(x, z)) continue;
      if (Math.abs(s.heightAt(x, z) - y) < 0.25) return d.mat;
    }
    return this.roomAt(x, y + 0.3, z)?.mat.floor ?? 'concrete';
  }
}
