import * as THREE from 'three';
import type { Colour } from '../../core/math';
import { KNOT, LEAF } from '../../content/build/overgrowth';
import { parts } from './things';

/* What the cast are made of, shared by everyone who draws them (castView.ts): their colours, and a part
   of one shape and colour put on a parent, each shape and colour and size made once. */

export const FLESH = 0xb08572, RAW = 0x8c4a44, GOREC = 0x4e1616, PALE = 0xcdbfae, BONE = 0xddd6c0, DARK = 0x140c0d, ORANGE = 0xb5541c;
export const GR = [0x3f6a3a, 0x4f7a40, 0x2f5a34, 0x5a7a3a, 0x6a8a44, 0x2a4a2c];

export type C = number | Colour;
export type Shape = 'box' | 'cyl' | 'ico';
export type O3 = THREE.Object3D;
const geos = new Map<string, THREE.BufferGeometry>();
function geo(shape: Shape, c: C, sx: number, sy: number, sz: number): THREE.BufferGeometry {
  const k = `${shape}|${c}|${sx}|${sy}|${sz}`;
  let g = geos.get(k);
  if (!g) geos.set(k, (g = parts([[shape, c, sx, sy, sz, 0, 0, 0]])));
  return g;
}
export function mk(parent: O3, mat: THREE.Material, shape: Shape, c: C, sx: number, sy: number, sz: number, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geo(shape, c, sx, sy, sz), mat);
  m.position.set(x, y, z);
  /* culled part by part, by each camera that draws it (the view, and a beam's shadow map): a level's whole cast, living
     and dead, is a thousand parts and more, and most are out of sight */
  parent.add(m);
  return m;
}
export function grp(parent: O3, x: number, y: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

/** the same pseudo-random numbers for the same mutant every time */
export function seeded(id: number) {
  let s = (id * 2654435761) >>> 0 || 1;
  const next = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  return { rnd: (a: number, b: number) => a + next() * (b - a), pick: <T>(a: T[]) => a[Math.floor(next() * a.length)] };
}

const _m = new THREE.Matrix4(), _p = new THREE.Vector3();
/** parts built on a group of their own (`build` puts them there with mk), as one geometry on `parent`: a cluster of many
 *  small parts in one draw call. Their geometries are shared and left as they are */
export function merged(parent: O3, mat: THREE.Material, build: (g: THREE.Group) => void): THREE.Mesh {
  const g = new THREE.Group(), shown: THREE.Mesh[] = [];
  build(g);
  g.updateMatrixWorld(true);
  g.traverse(o => { if ((o as THREE.Mesh).isMesh) shown.push(o as THREE.Mesh); });
  let n = 0;
  for (const o of shown) n += o.geometry.getAttribute('position').count;
  const P = new Float32Array(n * 3), Cc = new Float32Array(n * 3);
  let at = 0;
  for (const o of shown) {
    const pos = o.geometry.getAttribute('position'), col = o.geometry.getAttribute('aCol');
    _m.copy(o.matrixWorld);
    for (let v = 0; v < pos.count; v++, at++) {
      _p.fromBufferAttribute(pos, v).applyMatrix4(_m).toArray(P, at * 3);
      Cc[at * 3] = col.getX(v); Cc[at * 3 + 1] = col.getY(v); Cc[at * 3 + 2] = col.getZ(v);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(P, 3));
  out.setAttribute('aCol', new THREE.BufferAttribute(Cc, 3));
  const mesh = new THREE.Mesh(out, mat);
  parent.add(mesh);
  return mesh;
}

/* the plant on the changed (world.md §8): wild tobacco, Nicotiana rustica, green going yellow, the colour of the leaf in
   the curing barn; and where it comes out, a woody knot. The bush's own, as it grows over the places it has taken
   (content/build/overgrowth.ts) */
export { LEAF, KNOT };
/** a shelf of leaf out of the body along yaw, the way a bracket fungus stacks out of a stump: from a woody knot, tiers
 *  climbing `rise` metres a tier (and leaning `lean` toward yaw as they climb), each one broad, flat slab of leaf, the
 *  lowest the widest. Low-poly, as the cast are (mockups/mutants.html). `rnd` for the small differences, the same each
 *  time for the same one */
export function shelf(parent: O3, mat: THREE.Material, x: number, y: number, z: number, yaw: number, tiers: number, len: number,
  rnd: (a: number, b: number) => number, o: { rise?: number; lean?: number } = {}): void {
  const rise = o.rise ?? len * 0.3, lean = o.lean ?? 0, sx = Math.sin(yaw), sz = Math.cos(yaw);
  mk(parent, mat, 'ico', KNOT, len * 0.45, rise * (tiers - 0.4), len * 0.4, x, y + rise * (tiers - 1) / 2, z);
  for (let j = 0; j < tiers; j++) {
    const k = 1 - j * (0.45 / tiers), g = grp(parent, x + sx * lean * j, y + j * rise, z + sz * lean * j);
    g.rotation.set(rnd(0.02, 0.12), yaw + rnd(-0.2, 0.2), 0);
    mk(g, mat, 'ico', LEAF[(j + 4) % 4], len * 1.3 * k, len * 0.1, len * 0.75 * k, 0, 0, len * 0.42 * k);
  }
}
