// math.ts — the small maths more than one game had: clamping, interpolation, and the shortest turn between angles.
// From Rootshock's src/core/math.ts (Nov 2026); its colour and polygon helpers stayed in Rootshock, the only user.

export const PI = Math.PI;
export const TAU = PI * 2;

export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** the shortest signed turn from angle a to angle b */
export function angDiff(a: number, b: number): number {
  return ((((b - a + PI) % TAU) + TAU) % TAU) - PI;
}
export const angLerp = (a: number, b: number, t: number): number => a + angDiff(a, b) * t;
