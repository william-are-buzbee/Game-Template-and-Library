import type { Colour } from '../core/math';
import { Lighting } from '../world/light';
import type { World } from '../world/world';

/* Power coming on, seen: the rooms light one after another outward from where you threw the switch, each tube
   striking (on, a stutter, on) as it catches. Power going off is not staged: a cut is a cut. Looks only; the sim's own
   light (what the cast see by) changes at once.

   A Staged lighting answers for each room as it was or as it will be; the cascade says which, frame by frame, and
   which rooms changed, so only their light is added again. */

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const sum = (c: Colour) => c[0] + c[1] + c[2];

/** a lighting part way from one power state to another: each room as it was, or as it will be */
export class Staged extends Lighting {
  constructor(w: World, readonly from: Lighting, readonly to: Lighting, readonly on: Uint8Array) {
    super(w, to.power, d => to.open[d], to.looseLights);
  }
  override colourOf(s: number): Colour {
    const r = this.field.sources[s].room;
    return (r >= 0 && !this.on[r] ? this.from : this.to).colourOf(s);
  }
  override room(id: number): Colour {
    return (this.on[id] ? this.to : this.from).room(id);
  }
  /** these rooms have flipped */
  flipped(rooms: Iterable<number>): void {
    const src: number[] = [];
    for (const r of rooms) if (this.field.roomSource[r] >= 0) src.push(this.field.roomSource[r]);
    this.recolour(src);
  }
  override fittingIn(pw: [Colour, Colour], circuit: string, room: number): Colour {
    return room >= 0 && !this.on[room] ? this.from.fitting(pw, circuit) : this.to.fitting(pw, circuit);
  }
}

export class Cascade {
  readonly L: Staged;
  /** for each room, the times (from the start) its light flips; empty for a room that does not change */
  private flips: number[][];
  private t = 0;
  private end = 0;

  /** `start`: the room you are in, where the switch is */
  constructor(w: World, from: Lighting, to: Lighting, start: number, private strike: (room: number) => void) {
    const n = w.rooms.length, on = new Uint8Array(n).fill(1);
    this.flips = w.rooms.map(() => []);
    /* rooms by the number of rooms between them and you; ones not joined to yours, by how far away they are */
    const hops = new Array<number>(n).fill(Infinity);
    if (start >= 0) {
      hops[start] = 0;
      const q = [start];
      while (q.length) { const r = q.shift()!; for (const k of w.neighbours(r)) if (hops[k] === Infinity) { hops[k] = hops[r] + 1; q.push(k); } }
    }
    const S = start >= 0 ? w.rooms[start] : null;
    for (const R of w.rooms) {
      const a = from.room(R.id), b = to.room(R.id);
      if (sum(b) <= sum(a) + 0.01) continue;
      on[R.id] = 0;
      const far = S ? Math.hypot((R.x0 + R.x1 - S.x0 - S.x1) / 2, (R.z0 + R.z1 - S.z0 - S.z1) / 2) / 6 : 4;
      const h = Math.min(Number.isFinite(hops[R.id]) ? hops[R.id] : far, 30);
      /* each room out waits 85 ms more, give or take less than that, so the nearer always catches first; then on, off a
         moment, on, and sometimes once more before it holds */
      const t0 = Math.min(2.6, h * 0.085 + rnd(0, 0.06)), f = [t0, t0 + rnd(0.04, 0.08)];
      f.push(f[1] + rnd(0.05, 0.13));
      if (Math.random() < 0.45) { f.push(f[2] + rnd(0.04, 0.07)); f.push(f[3] + rnd(0.08, 0.2)); }
      this.flips[R.id] = f;
      this.end = Math.max(this.end, f[f.length - 1]);
    }
    this.L = new Staged(w, from, to, on);
  }

  get done(): boolean {
    return this.t > this.end;
  }

  /** a frame: the rooms whose light flipped */
  update(dt: number): number[] {
    const t0 = this.t, t1 = (this.t += dt), out: number[] = [], on = this.L.on;
    this.flips.forEach((f, r) => {
      let k = 0;
      for (const x of f) if (x > t0 && x <= t1) k++;
      if (!k) return;
      const n = f.filter(x => x <= t1).length;
      on[r] = n % 2;
      out.push(r);
      if (f[0] > t0 && f[0] <= t1) this.strike(r);
    });
    if (out.length) this.L.flipped(out);
    return out;
  }
}
