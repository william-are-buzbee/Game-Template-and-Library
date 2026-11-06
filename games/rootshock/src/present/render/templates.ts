/* Unit shapes (each fits a 1 m cube centred on the origin), as flat triangle lists. Our own, so nothing depends on
   three's primitives. */
import type { Shape } from '../../content/types';

function box(): Float32Array {
  const c = [[-.5, -.5, -.5], [.5, -.5, -.5], [.5, .5, -.5], [-.5, .5, -.5], [-.5, -.5, .5], [.5, -.5, .5], [.5, .5, .5], [-.5, .5, .5]];
  const f = [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0]];
  const p: number[] = [];
  for (const q of f) for (const k of [0, 1, 2, 0, 2, 3]) p.push(...c[q[k]]);
  return new Float32Array(p);
}

function ico(): Float32Array {
  const t = (1 + Math.sqrt(5)) / 2, n = 0.5 / Math.hypot(1, t);
  const v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]]
    .map(a => a.map(x => x * n));
  const fi = [0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1];
  const p: number[] = [];
  for (const i of fi) p.push(...v[i]);
  return new Float32Array(p);
}

function cyl(N = 6): Float32Array {
  const p: number[] = [], TAU = Math.PI * 2;
  for (let k = 0; k < N; k++) {
    const a = (k / N) * TAU, b = ((k + 1) / N) * TAU;
    const x0 = Math.cos(a) * .5, z0 = Math.sin(a) * .5, x1 = Math.cos(b) * .5, z1 = Math.sin(b) * .5;
    p.push(x0, -.5, z0, x1, -.5, z1, x1, .5, z1, x0, -.5, z0, x1, .5, z1, x0, .5, z0, 0, .5, 0, x0, .5, z0, x1, .5, z1, 0, -.5, 0, x1, -.5, z1, x0, -.5, z0);
  }
  return new Float32Array(p);
}

export const TEMPLATES: Record<Shape, Float32Array> = { box: box(), ico: ico(), cyl: cyl() };
