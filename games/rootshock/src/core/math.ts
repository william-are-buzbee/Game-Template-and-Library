export const PI = Math.PI;
export const TAU = PI * 2;

export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** the shortest signed turn from angle a to angle b */
export function angDiff(a: number, b: number): number {
  return ((((b - a + PI) % TAU) + TAU) % TAU) - PI;
}
export const angLerp = (a: number, b: number, t: number): number => a + angDiff(a, b) * t;

/** an RGB colour, each channel 0..1. Channels above 1.5 mark the colour as emissive (it ignores light) */
export type Colour = readonly [number, number, number];

export function hex(c: number | Colour): Colour {
  if (typeof c !== 'number') return c;
  return [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
}
export const scale3 = (c: Colour, k: number): Colour => [c[0] * k, c[1] * k, c[2] * k];
export const BLACK: Colour = [0, 0, 0];

/** is (x, z) inside the outline (its corners in order, either way round)? */
export function inPoly(pts: readonly [number, number][], x: number, z: number): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
