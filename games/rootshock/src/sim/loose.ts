import type { PropDef } from '../content/types';
import { rect, type Footprint } from '../world/shapes';
import type { Dyn, World } from '../world/world';
import { GRAVITY, standingOn } from './body';
import type { Rider } from './movers';

/* Loose things: crates and the like that can be pushed, knocked off a stack, carried on a platform. Asleep, a crate is
   just a solid box where it stands and costs nothing. Touched, it wakes: it slides, falls and lands as a box that stays
   upright. Once it has been still for a moment it sleeps again where it stopped. Only BUDGET are awake at once
   (engine.md §6); past that, the longest-awake one that is on the ground goes to sleep. */

export const BUDGET = 16;
const FRICTION = 7; // per second, while on the ground
const SLEEP_AFTER = 0.4;
const EPS = 1e-3;

export interface Loose extends Rider {
  prop: PropDef;
  hx: number; hz: number; h: number;
  vx: number; vy: number; vz: number;
  awake: boolean;
  ground: boolean;
  still: number;
  /** when it last woke (sim tick), for the budget */
  woke: number;
}

export function makeLoose(w: World, p: PropDef): Loose {
  const c = Math.abs(Math.cos(p.ry)), s = Math.abs(Math.sin(p.ry));
  const hx = (p.sx * c + p.sz * s) / 2, hz = (p.sx * s + p.sz * c) / 2;
  const dyn: Dyn = { kind: 'loose', id: w.newId(), x0: 0, y0: 0, z0: 0, x1: 0, y1: 0, z1: 0, mat: p.mat };
  const o: Loose = {
    prop: p, x: p.x, y: p.y, z: p.z, hx, hz, h: p.sy, vx: 0, vy: 0, vz: 0, awake: false, ground: true, still: 0, woke: 0, on: null, dyn,
    sync: () => syncLoose(o),
    clear: (dx, dy, dz) => !w.overlap(foot(o, o.x + dx, o.z + dz), o.y + dy + EPS, o.y + dy + o.h, o.dyn),
  };
  w.dyn.push(dyn);
  syncLoose(o);
  return o;
}

const foot = (o: Loose, x = o.x, z = o.z): Footprint => rect(x, z, o.hx - 0.005, o.hz - 0.005);

function syncLoose(o: Loose): void {
  const d = o.dyn;
  d.x0 = o.x - o.hx; d.x1 = o.x + o.hx; d.z0 = o.z - o.hz; d.z1 = o.z + o.hz; d.y0 = o.y; d.y1 = o.y + o.h;
}

export class LooseSet {
  constructor(readonly all: Loose[], private w: World) {
    /* settle what stands on what, so a stack knows it is a stack */
    for (const o of all) o.on = standingOn(w, foot(o), o.y, o.dyn);
  }

  awakeCount(): number {
    let n = 0;
    for (const o of this.all) if (o.awake) n++;
    return n;
  }

  wake(o: Loose, tick: number): void {
    if (o.awake) return;
    if (this.awakeCount() >= BUDGET) {
      let oldest: Loose | null = null;
      for (const q of this.all) if (q.awake && q.ground && (!oldest || q.woke < oldest.woke)) oldest = q;
      if (oldest) this.sleep(oldest);
    }
    o.awake = true; o.still = 0; o.woke = tick;
  }

  private sleep(o: Loose): void {
    o.awake = false; o.vx = 0; o.vy = 0; o.vz = 0;
  }

  /** shove it along (dx, dz), a unit direction, at `speed` */
  push(o: Loose, dx: number, dz: number, speed: number, tick: number): void {
    this.wake(o, tick);
    const along = o.vx * dx + o.vz * dz;
    if (along < speed) { o.vx += dx * (speed - along); o.vz += dz * (speed - along); }
  }

  update(dt: number, tick: number, riders: Rider[]): void {
    for (const o of this.all) if (o.awake) this.step(o, dt, tick, riders);
  }

  private step(o: Loose, dt: number, tick: number, riders: Rider[]): void {
    const w = this.w;
    if (o.ground) {
      const k = Math.max(0, 1 - FRICTION * dt);
      o.vx *= k; o.vz *= k;
    }
    this.slide(o, o.vx * dt, 0, tick, riders);
    this.slide(o, 0, o.vz * dt, tick, riders);

    /* weight */
    o.vy -= GRAVITY * dt;
    const f = foot(o), g = w.groundBelow(f, o.y + 0.05, o.dyn);
    let ny = o.y + o.vy * dt;
    if (ny <= g) { ny = g; o.vy = 0; o.ground = true; }
    else o.ground = false;
    const c = w.ceilingAbove(f, o.y + o.h, o.dyn, Math.max(o.y, ny) + o.h + 0.5);
    if (ny + o.h > c) { ny = Math.max(g, c - o.h); if (o.vy > 0) o.vy = 0; }
    if (ny !== o.y) this.wakeRiders(o, tick);
    o.y = ny;
    o.on = o.ground ? standingOn(w, f, o.y, o.dyn) : null;
    syncLoose(o);

    if (o.ground && Math.hypot(o.vx, o.vz) < 0.05) {
      o.still += dt;
      if (o.still > SLEEP_AFTER) this.sleep(o);
    } else o.still = 0;
  }

  /** move along one axis as far as it goes; what it runs into stops it, or is knocked on if it is loose */
  private slide(o: Loose, dx: number, dz: number, tick: number, riders: Rider[]): void {
    if (!dx && !dz) return;
    const w = this.w, t = w.sweep(foot(o), o.y + EPS, o.y + o.h, dx, dz, o.dyn);
    const mx = dx * t, mz = dz * t;
    if (t < 1) {
      const hit = w.overlap(foot(o, o.x + dx, o.z + dz), o.y + EPS, o.y + o.h, o.dyn);
      const other = hit && hit !== 'world' && hit.kind === 'loose' ? this.all.find(q => q.dyn === hit) : undefined;
      if (other) {
        this.wake(other, tick);
        if (dx) { other.vx += o.vx * 0.6; o.vx *= 0.3; }
        else { other.vz += o.vz * 0.6; o.vz *= 0.3; }
      } else if (dx) o.vx = 0;
      else o.vz = 0;
    }
    if (!mx && !mz) return;
    o.x += mx; o.z += mz;
    syncLoose(o);
    /* what rides on it goes with it, if there is room; if not, it is left behind and slides off */
    for (const r of riders) if (r.on === o.dyn) {
      if (r.clear(mx, 0, mz)) { r.x += mx; r.z += mz; r.sync(); }
      const q = this.all.find(l => l === r);
      if (q) this.wake(q, tick);
    }
  }

  private wakeRiders(o: Loose, tick: number): void {
    for (const q of this.all) if (q.on === o.dyn) this.wake(q, tick);
  }
}
