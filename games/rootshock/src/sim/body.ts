import { circle, meets, type Footprint } from '../world/shapes';
import type { Dyn, Hit, Ignore, World } from '../world/world';
import type { Rider } from './movers';

/* An upright cylinder that walks: feet at y, radius r, height h. One controller for everything that moves under its
   own weight; the player now, the cast later (engine.md §6). Each body is also a Dyn in the world (its bounding box), so
   crates, doors and platforms know it is there. */
export interface Body extends Rider {
  /** velocity on the plan (m/s): what it is doing, or what was done to it */
  vx: number;
  vz: number;
  vy: number;
  /** kilograms: what a shove has to move */
  mass: number;
  /** something is pushing it along this step, so friction does not slow it as well */
  carried: boolean;
  r: number;
  h: number;
  /** the highest edge it walks up without jumping, and follows the floor down without falling: a husk's STEP_UP, or as
   *  far as its kind's way goes (sim/fields.ts, WAYS) */
  climb: number;
  ground: boolean;
  /** what it moves through: its own box, and whatever else its kind passes */
  skip: Ignore;
}

/** the highest edge a body walks up without jumping */
export const STEP_UP = 0.5;
export const GRAVITY = 20;
const EPS = 1e-3;

export function makeBody(w: World, x: number, y: number, z: number, r: number, h: number, mass = 75, climb = STEP_UP): Body {
  const dyn: Dyn = { kind: 'body', id: w.newId(), x0: 0, y0: 0, z0: 0, x1: 0, y1: 0, z1: 0 };
  const b: Body = {
    x, y, z, vx: 0, vz: 0, vy: 0, mass, carried: false, r, h, climb, ground: true, on: null, dyn, skip: dyn,
    sync: () => syncBody(b),
    clear: (dx, dy, dz) => fits(w, b, b.x + dx, b.z + dz, b.y + dy),
  };
  w.dyn.push(dyn);
  syncBody(b);
  return b;
}

/** bring its box in the world up to date with where it is */
export function syncBody(b: Body): void {
  const d = b.dyn;
  d.x0 = b.x - b.r; d.x1 = b.x + b.r; d.z0 = b.z - b.r; d.z1 = b.z + b.r; d.y0 = b.y; d.y1 = b.y + b.h;
}

export const footprint = (b: Body, x = b.x, z = b.z): Footprint => circle(x, z, b.r);

export function fits(w: World, b: Body, x: number, z: number, y: number, h = b.h): boolean {
  return !w.overlap(footprint(b, x, z), y + EPS, y + h, b.skip);
}

/** move across the floor by (dx, dz): each axis on its own, so a wall stops one and you slide along the other.
 *  An edge up to `climb` high (its own, unless said) is climbed in passing. Returns what stopped it, if anything did. */
export function walk(w: World, b: Body, dx: number, dz: number, climb = b.climb): Hit {
  let hit: Hit = null;
  if (dx) hit = tryMove(w, b, b.x + dx, b.z, climb) ?? hit;
  if (dz) hit = tryMove(w, b, b.x, b.z + dz, climb) ?? hit;
  syncBody(b);
  return hit;
}

function tryMove(w: World, b: Body, x: number, z: number, climb: number): Hit {
  const hit = w.overlap(footprint(b, x, z), b.y + EPS, b.y + b.h, b.skip);
  if (!hit) {
    b.x = x; b.z = z;
    return null;
  }
  const g = w.groundBelow(footprint(b, x, z), b.y + climb, b.skip);
  if (g > b.y && fits(w, b, x, z, g)) {
    b.x = x; b.z = z; b.y = g;
    if (b.vy < 0) b.vy = 0;
    return null;
  }
  /* blocked: go as far as fits, so you end up against the wall rather than a step short of it */
  const t = w.sweep(footprint(b), b.y + EPS, b.y + b.h, x - b.x, z - b.z, b.skip);
  b.x += (x - b.x) * t; b.z += (z - b.z) * t;
  return hit;
}

/* Momentum (engine.md §6, F1). A body keeps its velocity from step to step; whatever shoves it adds to that velocity
   (push), and a wall takes away the part that goes into it (slide). What it does itself, it does by speeding toward
   what it wants (steer), as fast as its footing allows. */

/** add to its velocity (m/s) */
export function push(b: Body, dvx: number, dvz: number, dvy = 0): void {
  b.vx += dvx; b.vz += dvz;
  if (dvy) { b.vy += dvy; b.ground = false; }
}

/** a shove by a momentum (kg m/s): the heavier it is, the less it moves. Nothing moves what is rooted (mass Infinity). */
export function impulse(b: Body, jx: number, jz: number, jy = 0): void {
  if (!Number.isFinite(b.mass)) return;
  push(b, jx / b.mass, jz / b.mass, jy / b.mass);
}

/** speed its velocity toward (tx, tz), changing it by at most `rate` m/s² */
export function steer(b: Body, tx: number, tz: number, rate: number, dt: number): void {
  const dx = tx - b.vx, dz = tz - b.vz, d = Math.hypot(dx, dz), k = rate * dt;
  if (d <= k) { b.vx = tx; b.vz = tz; } else { b.vx += (dx / d) * k; b.vz += (dz / d) * k; }
}

/** a moved into b at (vx, vz), meaning to go at (wx, wz), and was stopped by it: they go on together at the pace they
 *  would share if a's momentum along the line between them were shared between them, the momentum of the pace a was
 *  going or meant to go, whichever is more. So you push a husk at about half your pace, a rush into one hits harder,
 *  and a thing that is rooted (mass Infinity) does not move at all. `both`: a goes on at that pace too (false for one
 *  whose walking is its own business, as the cast's is). */
export function shove(a: Body, b: Body, vx: number, vz: number, wx: number, wz: number, both: boolean): void {
  let nx = b.x - a.x, nz = b.z - a.z;
  const d = Math.hypot(nx, nz);
  if (d < 1e-6) return;
  nx /= d; nz /= d;
  const vn = Math.max(vx * nx + vz * nz, wx * nx + wz * nz);
  if (vn <= 0) return;
  const share = !Number.isFinite(b.mass) ? 0 : !Number.isFinite(a.mass) ? vn : (vn * a.mass) / (a.mass + b.mass);
  /* b goes at least that fast along the line, carried, and a goes on with it */
  const bn = b.vx * nx + b.vz * nz;
  if (bn < share) { b.vx += (share - bn) * nx; b.vz += (share - bn) * nz; }
  b.carried = share > 0;
  if (both) {
    const an = a.vx * nx + a.vz * nz;
    a.vx += (share - an) * nx; a.vz += (share - an) * nz;
  }
}

export interface Slid {
  /** what stopped it, if anything did */
  hit: Hit;
  /** how fast it was going into what stopped it (m/s): 0 when nothing did */
  slam: number;
}

/** move by its velocity for dt, sliding along what it meets; what a wall stopped is taken from the velocity */
export function slide(w: World, b: Body, dt: number, climb = b.climb): Slid {
  const wx = b.vx * dt, wz = b.vz * dt;
  if (!wx && !wz) return { hit: null, slam: 0 };
  const ox = b.x, oz = b.z, hit = walk(w, b, wx, wz, climb);
  let sx = 0, sz = 0;
  /* an axis that got less far than it meant to met something: all the speed along it went into that, at once, even if
     it got part of the way first (counting the part it managed as kept would split one blow into two lesser ones) */
  if (Math.abs(b.x - ox) < Math.abs(wx) - EPS * 0.1) { sx = Math.abs(b.vx); b.vx = 0; }
  if (Math.abs(b.z - oz) < Math.abs(wz) - EPS * 0.1) { sz = Math.abs(b.vz); b.vz = 0; }
  return { hit, slam: Math.hypot(sx, sz) };
}

export interface Landing {
  /** speed at impact, if the body landed this step */
  impact: number;
}

/** weight: fall (at `gravity`), land, follow the floor down a step, stop at the ceiling */
export function fall(w: World, b: Body, dt: number, gravity = GRAVITY): Landing {
  const out: Landing = { impact: 0 };
  b.vy -= gravity * dt;
  let ny = b.y + b.vy * dt;
  const f = footprint(b), g = w.groundBelow(f, b.y + EPS, b.skip);
  if (ny <= g || (b.ground && b.vy <= 0 && b.y - g <= b.climb + 0.05)) {
    if (!b.ground) out.impact = -b.vy;
    ny = g; b.vy = 0; b.ground = true;
  } else b.ground = false;
  const c = w.ceilingAbove(f, b.y + b.h, b.skip, Math.max(b.y, ny) + b.h + 0.5);
  if (ny + b.h > c) {
    ny = Math.max(g, c - b.h);
    if (b.vy > 0) b.vy = 0;
  }
  b.y = ny;
  b.on = b.ground ? standingOn(w, f, b.y, b.dyn) : null;
  syncBody(b);
  return out;
}

/** the moving solid whose top is right under a footprint at height y, if any */
export function standingOn(w: World, f: Footprint, y: number, self: Dyn): Dyn | null {
  for (const d of w.dyn) if (d !== self && d.kind !== 'body' && Math.abs(d.y1 - y) < 0.01 && meets(f, d.x0, d.z0, d.x1, d.z1)) return d;
  return null;
}

/** if the body has ended up inside something (a door, a shove, a bad spawn), nudge it out by the shortest way */
export function settle(w: World, b: Body): void {
  const n = w.pushOut(footprint(b), b.y + EPS, b.y + b.h, b.skip);
  if (n) { b.x += n[0]; b.y += n[1]; b.z += n[2]; syncBody(b); }
}
