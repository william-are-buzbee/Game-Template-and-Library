import type { LevelBuilder } from './builder';

/* Furniture and clutter, ported from the first engine. Sizes in metres, positions plan metres. */

export function table(b: LevelBuilder, x: number, z: number, w: number, d: number, c = 0x5b5d5f): void {
  const ns = d > w, f = b.floorAt(x, z);
  b.box(x, z, w, 0.05, d, c, { y: f + 0.71, solid: false });
  for (const s of [-1, 1])
    b.box(x + (ns ? 0 : s * (w / 2 - 0.08)), z + (ns ? s * (d / 2 - 0.08) : 0), ns ? w - 0.1 : 0.06, 0.71, ns ? 0.06 : d - 0.1, 0x33363a, { y: f, solid: false });
  /* one collider for the whole table, so you cannot walk between its legs */
  b.collider(x, z, w, 0.76, d);
}

export function shelf(b: LevelBuilder, x: number, z: number, w: number, d: number): void {
  const ns = d > w, L = ns ? d : w, f = b.floorAt(x, z), r = b.rng;
  for (const y of [0.1, 0.55, 1, 1.45, 1.86]) b.box(x, z, w, 0.04, d, 0x4a4d50, { y: f + y, solid: false });
  for (const s of [-1, 1]) b.box(x + (ns ? 0 : s * (w / 2 - 0.02)), z + (ns ? s * (d / 2 - 0.02) : 0), ns ? w : 0.04, 1.9, ns ? 0.04 : d, 0x3a3d40, { y: f, solid: false });
  for (const y of [0.14, 0.59, 1.04, 1.49])
    for (let k = 0; k < (L > 2 ? 3 : 2); k++) {
      const t = r.range(-L / 2 + 0.3, L / 2 - 0.3), s = r.range(0.15, 0.3);
      b.box(x + (ns ? 0 : t), z + (ns ? t : 0), s, r.range(0.14, 0.3), s, r.pick([0x6b5a3c, 0x4d5a66, 0x7a4a34, 0x5c6b4a]), { y: f + y, solid: false });
    }
  b.collider(x, z, w, 1.9, d);
}

const CARGO = [0x6a4a34, 0x3a5a6a, 0x5a5a3a, 0x6b5a3c, 0x4a4a52, 0x7a3a2a];
/** a few crates, some stacked. They can be pushed (loose) unless told otherwise. */
export function crates(b: LevelBuilder, x: number, z: number, n: number, loose = true): void {
  const r = b.rng;
  for (let k = 0; k < n; k++) {
    const s = r.range(0.8, 1.4), ox = r.range(-0.7, 0.7), oz = r.range(-0.7, 0.7);
    b.box(x + ox, z + oz, s, s, s, r.pick(CARGO), { ry: loose ? 0 : r.range(-0.3, 0.3), solid: true, loose });
    if (r.chance(0.4)) b.box(x + ox, z + oz, s * 0.8, s * 0.8, s * 0.8, r.pick(CARGO), { y: b.floorAt(x + ox, z + oz) + s, ry: loose ? 0 : r.range(-0.3, 0.3), solid: true, loose });
  }
}

export function column(b: LevelBuilder, x: number, z: number, h: number): void {
  b.prop('cyl', x, z, 0.5, h, 0.5, 0x55585c, { solid: true });
}
