/* Shapes the world is asked about. */

/** an axis-aligned box */
export interface Box {
  x0: number; y0: number; z0: number; x1: number; y1: number; z1: number;
}

/** what a thing covers on the floor plan: a circle (round, radius hx) or an axis-aligned rectangle (half sizes hx, hz) */
export interface Footprint {
  x: number; z: number; hx: number; hz: number; round: boolean;
}
export const circle = (x: number, z: number, r: number): Footprint => ({ x, z, hx: r, hz: r, round: true });
export const rect = (x: number, z: number, hx: number, hz: number): Footprint => ({ x, z, hx, hz, round: false });
export const moved = (f: Footprint, x: number, z: number): Footprint => ({ ...f, x, z });

/** does the footprint meet the rectangle [x0, x1] x [z0, z1]? Touching does not count. */
export function meets(f: Footprint, x0: number, z0: number, x1: number, z1: number): boolean {
  if (f.round) {
    const px = Math.min(Math.max(f.x, x0), x1), pz = Math.min(Math.max(f.z, z0), z1);
    return (f.x - px) ** 2 + (f.z - pz) ** 2 < f.hx * f.hx;
  }
  return f.x - f.hx < x1 && f.x + f.hx > x0 && f.z - f.hz < z1 && f.z + f.hz > z0;
}

const RIM = Array.from({ length: 8 }, (_, k) => [Math.cos((k * Math.PI) / 4), Math.sin((k * Math.PI) / 4)]);
/** points spread over the footprint (its centre and its rim), for asking a sloped surface how high it is under it */
export function samples(f: Footprint): [number, number][] {
  const out: [number, number][] = [[f.x, f.z]];
  if (f.round) for (const [c, s] of RIM) out.push([f.x + c * f.hx, f.z + s * f.hx]);
  else for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [1, 0], [0, 1], [-1, 0]]) out.push([f.x + a * f.hx, f.z + b * f.hz]);
  return out;
}

/** where a segment from p to p + d first enters the box, as a fraction 0..1 of d; Infinity if it misses */
export function segmentBox(px: number, py: number, pz: number, dx: number, dy: number, dz: number, b: Box): number {
  let t0 = 0, t1 = 1;
  const axis = (p: number, d: number, lo: number, hi: number): boolean => {
    if (Math.abs(d) < 1e-12) return p > lo && p < hi;
    let a = (lo - p) / d, c = (hi - p) / d;
    if (a > c) [a, c] = [c, a];
    if (a > t0) t0 = a;
    if (c < t1) t1 = c;
    return t0 <= t1;
  };
  if (!axis(px, dx, b.x0, b.x1) || !axis(py, dy, b.y0, b.y1) || !axis(pz, dz, b.z0, b.z1)) return Infinity;
  return t0;
}

/** a box turned on the plan (a wall at an angle): its middle (cx, cz), how far it reaches either way along (hu) and
 *  across (hv), and which way along is, as (c, s): the cosine and sine of its angle from x toward z */
export interface Turned { cx: number; cz: number; hu: number; hv: number; c: number; s: number }

/** the turned box along the line from (ax, az) to (bx, bz), t thick about it */
export function turnedAlong(ax: number, az: number, bx: number, bz: number, t: number): Turned {
  const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz) || 1;
  return { cx: (ax + bx) / 2, cz: (az + bz) / 2, hu: len / 2, hv: t / 2, c: dx / len, s: dz / len };
}

/** how far a turned box reaches along x and along z from its middle */
export function turnedReach(t: Turned): [number, number] {
  const ac = Math.abs(t.c), as = Math.abs(t.s);
  return [t.hu * ac + t.hv * as, t.hu * as + t.hv * ac];
}

/** does the footprint meet the turned box's plan? Touching does not count. (For a rectangle, the four ways the two can
 *  be told apart: x and z, and along and across the box.) */
export function meetsTurned(f: Footprint, t: Turned): boolean {
  const dx = f.x - t.cx, dz = f.z - t.cz, u = dx * t.c + dz * t.s, v = -dx * t.s + dz * t.c;
  if (f.round) {
    const pu = Math.min(Math.max(u, -t.hu), t.hu), pv = Math.min(Math.max(v, -t.hv), t.hv);
    return (u - pu) ** 2 + (v - pv) ** 2 < f.hx * f.hx;
  }
  const ac = Math.abs(t.c), as = Math.abs(t.s), [rx, rz] = turnedReach(t);
  return Math.abs(dx) < f.hx + rx && Math.abs(dz) < f.hz + rz
    && Math.abs(u) < t.hu + f.hx * ac + f.hz * as && Math.abs(v) < t.hv + f.hx * as + f.hz * ac;
}

/** where a segment from p to p + d first enters a turned box standing from y0 to y1, as a fraction 0..1 of d;
 *  Infinity if it misses */
export function segmentTurned(px: number, py: number, pz: number, dx: number, dy: number, dz: number, t: Turned, y0: number, y1: number): number {
  const ox = px - t.cx, oz = pz - t.cz;
  return segmentBox(ox * t.c + oz * t.s, py, -ox * t.s + oz * t.c, dx * t.c + dz * t.s, dy, -dx * t.s + dz * t.c,
    { x0: -t.hu, y0, z0: -t.hv, x1: t.hu, y1, z1: t.hv });
}
