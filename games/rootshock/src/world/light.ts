import type { CircuitDef, RoomDef } from '../content/types';
import { BLACK, scale3, type Colour } from '../core/math';
import { DIRK, LCELL, LOFF, lightField, type LightField } from './lightField';
import type { Dyn, World } from './world';

export { POOL } from './lightField';

/* Light, as the station has it under its power. Every room is lit by its rule (RoomDef.lit) and its circuit's power, in
   pools under its fittings, and its light reaches past it through its openings; lamps make pools of their own
   (world/lightField.ts has the shape of it all). The renderer draws by the same light, point by point, and the sim reads
   it for how visible you are (engine.md §11).

   Lights that lie about (a flashlight put down still on, a lantern) are the same lights as in your hand, with the same
   numbers (FLASH, BOUNCE, LANTERN below; render/shader.ts draws all of them from these): a flashlight's beam is drawn by
   the renderer with its own shadows and added here only for what the cast see (`seen`); what it throws back, and a
   lantern's glow, go into the field like any light, so whatever is lit by them is lit by them once.

   Which way the light comes from (`directions`, `towards`) is the renderer's alone, made only when it first asks: the
   sim, and what the cast see you by, go by how much light there is, never which way it comes. */

/** 2: fed by Gen-1 through a good service connection. 1: its own backup set (dim, halls only, no heavy doors). 0: dead. */
export type PowerLevel = 0 | 1 | 2;
export type Power = (circuit: string) => PowerLevel;

/** the power on a circuit, from the circuits' state and whether Gen-1 runs. A branch has what the circuit feeding it
 *  has, through its connection; any circuit has at least what its own backup set gives. */
export function circuitPower(circuits: Record<string, CircuitDef>, main: boolean, c: string, depth = 0): PowerLevel {
  const C = circuits[c];
  if (!C) return 0;
  const fed: PowerLevel = !C.on || C.broken ? 0 : C.feed ? (depth < 8 ? circuitPower(circuits, main, C.feed, depth + 1) : 0) : main ? 2 : 0;
  return fed || (C.back ? 1 : 0);
}

/** the power on each circuit, from the circuits' state and whether Gen-1 runs */
export function stationPower(circuits: Record<string, CircuitDef>, main: boolean): Power {
  return c => circuitPower(circuits, main, c);
}

/** everything on: for looking at a level as built (?power=full) */
export const fullPower: Power = () => 2;

/** emergency lighting's cast: amber, so a room on its backup set says so at a glance */
const EMERGENCY: Colour = [1, 0.68, 0.45];

/** a room's own light under the given power. On a backup set, its emergency lights: two fifths as bright, amber, and
 *  (since the cast see by the brightest channel) exactly as easy to be seen by as the white they replace. */
export function roomLight(R: RoomDef, power: Power): Colour {
  if (R.lit === 'always') return R.lc;
  if (R.lit === 'none') return BLACK;
  const l = power(R.circuit);
  if (l === 2) return R.lc;
  if (l === 0 && R.batt && power(R.batt.watch) === 0 && power(R.batt.supply) > 0) return R.batt.colour;
  if (l !== 1 || !R.em) return BLACK;
  const c: Colour = [R.lc[0] * EMERGENCY[0], R.lc[1] * EMERGENCY[1], R.lc[2] * EMERGENCY[2]], top = Math.max(...c);
  return top > 0 ? scale3(c, (0.4 * Math.max(...R.lc)) / top) : BLACK;
}

/** a flashlight's beam: a reflector's, a hot centre, a wide dim spill and a faint bright ring at the rim, by the cosine
 *  from its axis; then `gain` over 1 + `fall` d² */
export const FLASH = { colour: [1, 0.93, 0.78] as Colour, gain: 2.3, fall: 0.055, hot: [0.91, 0.975], spill: [0.76, 0.92], rim: 0.952, rimW: 0.007 };
/** how bright a beam is at `ca` (the cosine of the angle off its axis), before distance */
export function spot(ca: number): number {
  const ss = (a: number, b: number) => { const t = Math.min(1, Math.max(0, (ca - a) / (b - a))); return t * t * (3 - 2 * t); };
  const rim = (ca - FLASH.rim) / FLASH.rimW;
  return 0.65 * ss(FLASH.hot[0], FLASH.hot[1]) + 0.42 * ss(FLASH.spill[0], FLASH.spill[1]) + 0.12 * Math.exp(-rim * rim);
}
/** what a beam throws back from what it hits close by, around the light: `gain` over 1 + `hit` h² (h how far the beam
 *  ran before it hit, up to `reach`), then over 1 + `fall` d² from the light */
export const BOUNCE = { colour: [1, 0.9, 0.76] as Colour, gain: 0.16, hit: 0.3, reach: 8, fall: 0.18 };
/** the dive lantern: all round, `gain` over 1 + `fall` d² */
export const LANTERN = { colour: [0.72, 0.92, 1] as Colour, gain: 1.5, fall: 0.2 };
/** how far a light lying about is followed through the field */
const GLOW_REACH = 6;

/** a light lying about, on: where it is, which way it points, and how strong (a weak battery is dimmer) */
export interface Loose { key: string; kind: 'flash' | 'lantern'; x: number; y: number; z: number; dx: number; dy: number; dz: number; k: number }
/** what light goes through, on its way: bodies, and glass */
const clearFor = (d: Dyn) => d.kind === 'body' || !!d.glass;

/** the 12 edges of a cube of 2³ points (corner c is x + 2y + 4z): the lower corner, and the axis along it */
const EDGES: [number, number][] = [];
for (let a = 0; a < 3; a++) for (let c = 0; c < 8; c++) if (!(c & (1 << a))) EDGES.push([c, a]);
/** how bright a colour is, for weighing which way light comes from */
const lumOf = (c: Colour) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];

/** the corners around a point being asked about, and their weights */
const P = new Int32Array(8), W = new Float64Array(8);

export class Lighting {
  readonly field: LightField;
  /** each room's own light, a doorway's from the rooms either side of it */
  private rooms: Colour[] | null = null;
  /** the light at each open point of the field, and the part of it that flickers, made when first asked for */
  private col: Float32Array | null = null;
  private fcol: Float32Array | null = null;
  /** the colour each source is lit by in `col` */
  private lit: Colour[] = [];
  /** each source's light flickers (a room whose tubes stutter) */
  private flicks: Uint8Array;
  /** how far each door stands open in `col` (0 shut, 1 open) */
  readonly open: Float32Array;
  /** at each open point, the way the light comes from, by how bright it is (summed from each source's `dir`), made when
   *  first asked for */
  private dir: Float32Array | null = null;
  /** the lights lying about, and what each adds to the field: each as it is now (`L`), and as it was when what it throws
   *  back was worked out (`at`) */
  private loose = new Map<string, { L: Loose; at: Loose; pts: Int32Array; val: Float32Array; dir: Int8Array; c: Colour }>();
  /** the bricks whose light has changed since last asked (lightVolume.ts) */
  private dirty = new Set<number>();
  /** counts every change to the light anywhere, so what asks it about a place that has not moved can tell whether to
   *  ask again (the renderer's moving things) */
  epoch = 0;

  /** `open`: how far each door stands open (by default, as the level has it). `loose`: the lights lying about */
  constructor(protected w: World, readonly power: Power, open?: (door: number) => number, loose: Loose[] = []) {
    this.field = lightField(w);
    this.open = Float32Array.from(w.def.doors, (D, d) => (open ? open(d) : D.open ? 1 : 0));
    this.flicks = Uint8Array.from(this.field.sources, S => (S.room >= 0 && w.rooms[S.room].flick ? 1 : 0));
    this.lights(loose);
  }

  /** the rooms that have fittings, and each one's fittings */
  get fixtures(): ReadonlyMap<number, readonly { x: number; y: number; z: number }[]> {
    return this.field.fixtures;
  }

  /** a source's colour: its room's light, or its lamp's */
  colourOf(s: number): Colour {
    const S = this.field.sources[s];
    return S.room >= 0 ? roomLight(this.w.rooms[S.room], this.power) : this.w.def.lamps[S.lamp].colour;
  }

  /** a room's own light under this power; a doorway's, a little less than the rooms either side of it */
  room(id: number): Colour {
    if (!this.rooms) {
      const w = this.w, rooms = w.rooms.map(R => roomLight(R, this.power));
      for (const R of w.rooms) {
        if (!R.doorway) continue;
        const near = w.neighbours(R.id).filter(n => !w.rooms[n].doorway);
        if (!near.length) continue;
        const sum = [0, 0, 0];
        for (const n of near) for (let k = 0; k < 3; k++) sum[k] += rooms[n][k];
        rooms[R.id] = scale3(sum as unknown as Colour, 0.8 / near.length);
      }
      this.rooms = rooms;
    }
    return this.rooms[id] ?? BLACK;
  }

  /** the light at every open point of the field (r, g, b by point) */
  get colours(): Float32Array {
    if (!this.col) {
      const F = this.field;
      this.col = new Float32Array(F.n * 3);
      this.fcol = new Float32Array(F.n * 3);
      this.lit = F.sources.map(() => BLACK);
      this.recolour(F.sources.map((_, s) => s));
      for (const g of this.loose.values()) this.add(g.pts, g.val, g.dir, g.c, 1, false);
    }
    return this.col;
  }

  /** the part of the light at every open point that flickers */
  get flickers(): Float32Array {
    void this.colours;
    return this.fcol!;
  }

  /** at every open point, the way its light comes from, weighed by how bright each part of it is (x, y, z by point): as
   *  long as that light's brightness where all of it comes from one way, and none where it comes from every way */
  get directions(): Float32Array {
    if (!this.dir) {
      void this.colours; // (first: once it is kept, making the light adds to it too)
      const F = this.field, open = this.open, dir = (this.dir = new Float32Array(F.n * 3));
      const put = (pts: Int32Array, val: Float32Array, u: Int8Array, k: number, scale?: (i: number) => number) => {
        for (let i = 0; i < pts.length; i++) {
          const v = (val[i] * k * (scale ? scale(i) : 1)) / DIRK, q = pts[i] * 3;
          dir[q] += u[i * 3] * v; dir[q + 1] += u[i * 3 + 1] * v; dir[q + 2] += u[i * 3 + 2] * v;
        }
      };
      F.sources.forEach((S, s) => {
        const l = lumOf(this.lit[s]);
        if (!l) return;
        put(S.pts, S.val, S.dir, l);
        put(S.gpts, S.gval, S.gdir, l, i => open[S.gdoor[i]]);
      });
      for (const g of this.loose.values()) put(g.pts, g.val, g.dir, lumOf(g.c));
    }
    return this.dir;
  }

  /** add `c` times `k` times each of `val` at `pts` (to the flickering part too, if it flickers), and the way it comes
   *  from (`u`, as Source.dir) once that is kept */
  private add(pts: Int32Array, val: Float32Array, u: Int8Array, c: Colour, k: number, flick: boolean, scale?: (i: number) => number): void {
    const col = this.col!, fcol = this.fcol!, dir = this.dir, F = this.field, [r, g, b] = c, l = lumOf(c) / DIRK;
    if (pts.length) this.epoch++;
    for (let i = 0; i < pts.length; i++) {
      const v = val[i] * k * (scale ? scale(i) : 1);
      if (!v) continue;
      const q = pts[i] * 3;
      col[q] += r * v; col[q + 1] += g * v; col[q + 2] += b * v;
      if (flick) { fcol[q] += r * v; fcol[q + 1] += g * v; fcol[q + 2] += b * v; }
      if (dir) { const w = l * v; dir[q] += u[i * 3] * w; dir[q + 1] += u[i * 3 + 1] * w; dir[q + 2] += u[i * 3 + 2] * w; }
      this.dirty.add(F.pslot[pts[i]]);
    }
  }

  /** these sources may have changed colour: add the difference */
  protected recolour(sources: Iterable<number>): void {
    if (!this.col) return;
    const F = this.field, open = this.open;
    for (const s of sources) {
      const was = this.lit[s], now = this.colourOf(s), d: Colour = [now[0] - was[0], now[1] - was[1], now[2] - was[2]];
      this.lit[s] = now;
      if (!d[0] && !d[1] && !d[2]) continue;
      const S = F.sources[s];
      this.add(S.pts, S.val, S.dir, d, 1, !!this.flicks[s]);
      this.add(S.gpts, S.gval, S.gdir, d, 1, !!this.flicks[s], i => open[S.gdoor[i]]);
    }
  }

  /** the doors as they stand now (how far each is open): the light through any that has moved changes with it */
  follow(open: (door: number) => number): void {
    const F = this.field;
    for (let d = 0; d < this.open.length; d++) {
      const t = open(d), dt = t - this.open[d];
      if (dt === 0 || (Math.abs(dt) < 1e-3 && t > 0 && t < 1)) continue;
      this.open[d] = t;
      if (!this.col) continue;
      this.epoch++;
      const D = F.doors[d], col = this.col, fcol = this.fcol!, dir = this.dir;
      for (let k = 0; k < D.pts.length; k++) {
        const s = D.src[k], c = this.lit[s], v = D.val[k] * dt, p = D.pts[k], q = p * 3;
        if (c === BLACK) continue;
        col[q] += c[0] * v; col[q + 1] += c[1] * v; col[q + 2] += c[2] * v;
        if (this.flicks[s]) { fcol[q] += c[0] * v; fcol[q + 1] += c[1] * v; fcol[q + 2] += c[2] * v; }
        if (dir) { const w = (lumOf(c) * v) / DIRK; dir[q] += D.dir[k * 3] * w; dir[q + 1] += D.dir[k * 3 + 1] * w; dir[q + 2] += D.dir[k * 3 + 2] * w; }
        this.dirty.add(F.pslot[p]);
      }
    }
  }

  /** the lights lying about, as they are now: what each throws into the field is added, or taken away, as they come, go
   *  or change. A beam's own light is the renderer's (and `seen`'s); what it throws back around it is the field's */
  lights(list: Loose[]): void {
    const now = new Map(list.map(L => [L.key, L]));
    for (const [key, g] of this.loose) {
      const L = now.get(key);
      /* moved only a little since what it throws back was worked out (a beam in a hand): the beam is where it is now, and
         what it throws back stays as it was. A little since, not a little a step: by the step, one carried about or
         swung (the night round's) never moved enough, and what it threw back stayed behind where it had been */
      if (L && (same(L, g.L) || near(L, g.at))) { g.L = L; now.delete(key); continue; }
      if (this.col) this.add(g.pts, g.val, g.dir, g.c, -1, false);
      this.loose.delete(key);
    }
    for (const L of now.values()) {
      let gain: number, fall: number, c: Colour;
      if (L.kind === 'flash') {
        /* nothing close enough in front of it gives nothing back */
        const t = this.w.raycast(L.x, L.y, L.z, L.x + L.dx * BOUNCE.reach, L.y + L.dy * BOUNCE.reach, L.z + L.dz * BOUNCE.reach, clearFor);
        gain = t < 1 ? (L.k * BOUNCE.gain) / (1 + BOUNCE.hit * (t * BOUNCE.reach) ** 2) : 0; fall = BOUNCE.fall; c = BOUNCE.colour;
      } else { gain = L.k * LANTERN.gain; fall = LANTERN.fall; c = LANTERN.colour; }
      const { pts, val, dir } = gain > 0 ? this.field.glow(L.x, L.y, L.z, GLOW_REACH, d => gain / (1 + fall * d * d)) : { pts: new Int32Array(0), val: new Float32Array(0), dir: new Int8Array(0) };
      const g = { L, at: L, pts, val, dir, c };
      this.loose.set(L.key, g);
      if (this.col) this.add(pts, val, dir, c, 1, false);
    }
  }

  /** the lights lying about, as this lighting has them */
  get looseLights(): Loose[] {
    return [...this.loose.values()].map(g => g.L);
  }

  /** the bricks whose light has changed since last asked */
  changed(): number[] {
    const out = [...this.dirty];
    this.dirty.clear();
    return out;
  }

  /** the light at a point anywhere, blended from the field's points around it that open space joins it to */
  atPoint(x: number, y: number, z: number): Colour {
    return this.blend(x, y, z, this.colours);
  }

  /** the part of the light at a point that flickers */
  flickAt(x: number, y: number, z: number): Colour {
    return this.blend(x, y, z, this.flickers);
  }

  /** which way the light at a point comes from: a vector as long as the share of it that comes from one way (0 to 1),
   *  pointing back toward where that comes from. For the renderer */
  towards(x: number, y: number, z: number): Colour {
    const D = this.blend(x, y, z, this.directions), l = lumOf(this.atPoint(x, y, z));
    return l > 1e-5 ? [D[0] / l, D[1] / l, D[2] / l] : [0, 0, 0];
  }

  /** the light at a point as the cast see it: the field's, and any beam lying about that falls on it */
  seen(x: number, y: number, z: number): Colour {
    const out = [...this.atPoint(x, y, z)];
    for (const { L } of this.loose.values()) {
      if (L.kind !== 'flash') continue;
      const vx = x - L.x, vy = y - L.y, vz = z - L.z, d = Math.hypot(vx, vy, vz);
      if (d < 1e-3 || d > 30) continue;
      const v = (L.k * FLASH.gain * spot((vx * L.dx + vy * L.dy + vz * L.dz) / d)) / (1 + FLASH.fall * d * d);
      if (v < 0.005 || this.w.raycast(L.x, L.y, L.z, x, y, z, clearFor) < 0.999) continue;
      for (let k = 0; k < 3; k++) out[k] += FLASH.colour[k] * v;
    }
    return out as unknown as Colour;
  }

  private blend(x: number, y: number, z: number, col: Float32Array): Colour {
    const F = this.field;
    const fx = (x - LOFF) / LCELL, fy = (y - LOFF) / LCELL, fz = (z - LOFF) / LCELL;
    const i = Math.floor(fx), j = Math.floor(fy), k = Math.floor(fz), tx = fx - i, ty = fy - j, tz = fz - k;
    const s = F.slot(i >> 3, j >> 3, k >> 3);
    if (s < 0) return [0, 0, 0];
    let best = -1;
    for (let c = 0; c < 8; c++) {
      const ox = c & 1, oy = (c >> 1) & 1, oz = c >> 2;
      P[c] = F.local(s, (i & 7) + ox, (j & 7) + oy, (k & 7) + oz);
      W[c] = (ox ? tx : 1 - tx) * (oy ? ty : 1 - ty) * (oz ? tz : 1 - tz);
      if (P[c] >= 0 && F.flags[P[c]] && (best < 0 || W[c] > W[best])) best = c;
    }
    if (best < 0) return [0, 0, 0];
    /* only the corners joined to the nearest open one: none from over a slab or through a wall */
    let reach = 1 << best;
    for (let pass = 0; pass < 3; pass++)
      for (const [c, a] of EDGES) {
        const d = c | (1 << a);
        if (((reach >> c) & 1) !== ((reach >> d) & 1) && P[c] >= 0 && F.flags[P[c]] & (2 << a)) reach |= (1 << c) | (1 << d);
      }
    let r = 0, g = 0, b = 0, sw = 0;
    for (let c = 0; c < 8; c++) {
      if (!((reach >> c) & 1)) continue;
      const p = F.pid[P[c]] * 3;
      r += W[c] * col[p]; g += W[c] * col[p + 1]; b += W[c] * col[p + 2]; sw += W[c];
    }
    return sw > 0 ? [r / sw, g / sw, b / sw] : [0, 0, 0];
  }

  /** a fitting's colour: dead or live by its circuit */
  fitting(pw: [Colour, Colour], circuit: string): Colour {
    return pw[this.power(circuit) > 0 ? 1 : 0];
  }

  /** a fitting's colour where it hangs (a light coming on room by room may say otherwise; present/cascade.ts) */
  fittingIn(pw: [Colour, Colour], circuit: string, _room: number): Colour {
    return this.fitting(pw, circuit);
  }
}

/** how far a light may move, and turn, from where what it throws back was worked out, before it is again (m; the cosine) */
const DRIFT = { move: 0.5, turn: 0.99 };
const near = (a: Loose, b: Loose) =>
  a.kind === b.kind && a.k === b.k && Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < DRIFT.move && a.dx * b.dx + a.dy * b.dy + a.dz * b.dz > DRIFT.turn;
const same = (a: Loose, b: Loose) =>
  a.kind === b.kind && a.k === b.k && a.x === b.x && a.y === b.y && a.z === b.z && a.dx === b.dx && a.dy === b.dy && a.dz === b.dz;
