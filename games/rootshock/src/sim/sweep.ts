import type { Shape } from '../content/items';

/* A swung thing's path (engine.md §6, F3b). A blow is not tested at one instant: the weapon is traced through the
   world across the part of the swing that can land, and the first thing it meets is what it meets. A side swing goes
   right to left across the way you face, a backhand left to right; a chop comes straight down from over your head; a
   thrust goes straight out.
   The path is laid on the line the blow was thrown along, pitch and all, so you aim it by looking: down at a worm, and
   the swing goes low.

   Everything here is in the world's frame: x east, y up, z south; yaw 0 faces north (-z), as the player's does. */

export interface V3 { x: number; y: number; z: number }

/** the part of a swing (0..1 of it) whose path can land: before it the arm is coming round, after it following
 *  through */
export const ACTIVE = { from: 0.2, to: 0.6 };

/** each shape's path: the angles it sweeps across (radians, out from the line; + is the right, or for a chop up), the
 *  tilt of the plane it sweeps in (a chop's is upright: it comes straight down), and for a thrust how far out it
 *  starts */
export const PATHS: Record<Shape, { from: number; to: number; tilt: number; near: number }> = {
  side: { from: (40 * Math.PI) / 180, to: (-40 * Math.PI) / 180, tilt: (-8 * Math.PI) / 180, near: 1 },
  /* the side swing in a mirror: from low on your left, rising across to your right */
  back: { from: (-40 * Math.PI) / 180, to: (40 * Math.PI) / 180, tilt: (8 * Math.PI) / 180, near: 1 },
  chop: { from: (50 * Math.PI) / 180, to: (-40 * Math.PI) / 180, tilt: Math.PI / 2, near: 1 },
  thrust: { from: 0, to: 0, tilt: 0, near: 0.35 },
};

/** the frame a blow is thrown in: where it turns about (a little below your eye) and its three ways */
export interface Frame { p: V3; f: V3; r: V3; u: V3 }

export function frame(eye: V3, yaw: number, pitch: number): Frame {
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const f = { x: -Math.sin(yaw) * cp, y: sp, z: -Math.cos(yaw) * cp };
  const r = { x: Math.cos(yaw), y: 0, z: -Math.sin(yaw) };
  /* up, square to both: r × f */
  const u = { x: r.y * f.z - r.z * f.y, y: r.z * f.x - r.x * f.z, z: r.x * f.y - r.y * f.x };
  return { p: { x: eye.x - u.x * 0.25, y: eye.y - u.y * 0.25, z: eye.z - u.z * 0.25 }, f, r, u };
}

/** a point on the weapon, `k` of the way from the hand to its head (reach R), at `a` (0..1) across the part that can
 *  land */
export function along(F: Frame, shape: Shape, R: number, a: number, k = 1): V3 {
  const P = PATHS[shape];
  if (shape === 'thrust') {
    const d = R * k * (P.near + (1 - P.near) * a);
    return { x: F.p.x + F.f.x * d, y: F.p.y + F.f.y * d, z: F.p.z + F.f.z * d };
  }
  const th = P.from + (P.to - P.from) * a, ct = Math.cos(P.tilt), st = Math.sin(P.tilt);
  /* the sideways way of the plane it sweeps in: right, tilted up by the plane's tilt */
  const s = { x: F.r.x * ct + F.u.x * st, y: F.r.y * ct + F.u.y * st, z: F.r.z * ct + F.u.z * st };
  const c = Math.cos(th), n = Math.sin(th), d = R * k;
  return {
    x: F.p.x + (F.f.x * c + s.x * n) * d,
    y: F.p.y + (F.f.y * c + s.y * n) * d,
    z: F.p.z + (F.f.z * c + s.z * n) * d,
  };
}

/** where across the part that can land a swing `q` (0..1) of the way through is: 0 before it, 1 after */
export const across = (q: number): number => Math.min(1, Math.max(0, (q - ACTIVE.from) / (ACTIVE.to - ACTIVE.from)));

/** how far along a moving point (a to b) it first comes within `r` of an upright cylinder's axis at (cx, cz), between
 *  heights y0 and y1; null if it does not. Already inside, 0. */
export function meetsCylinder(a: V3, b: V3, cx: number, cz: number, r: number, y0: number, y1: number): number | null {
  const dx = b.x - a.x, dz = b.z - a.z, ox = a.x - cx, oz = a.z - cz;
  const A = dx * dx + dz * dz, B = 2 * (ox * dx + oz * dz), C = ox * ox + oz * oz - r * r;
  let t: number;
  if (C <= 0) t = 0;
  else {
    if (A < 1e-12) return null;
    const disc = B * B - 4 * A * C;
    if (disc < 0) return null;
    t = (-B - Math.sqrt(disc)) / (2 * A);
    if (t < 0 || t > 1) return null;
  }
  const y = a.y + (b.y - a.y) * t;
  return y >= y0 && y <= y1 ? t : null;
}

