import * as THREE from 'three';
import { scale3, type Colour } from '../../core/math';
import { CELL, CHUNK } from '../../world/grid';
import type { Surface, World } from '../../world/world';
import type { Lighting } from '../../world/light';
import { ICO, type PropDef, type RoomDef } from '../../content/types';
import { matId } from './shader';
import { TEMPLATES } from './templates';

/* The level's static mesh. Flat surfaces come from the grid: wherever open space meets solid, there is a face, coloured by
   the room on the open side and by what the solid is (rock takes the room's palette; a block, its own colour, but for a
   floor slab's top, which is the floor of the room on it). Faces are merged into the largest flat rectangles that share a
   colour (within a chunk), then cut where the palette changes (the dado and the stripe on walls). What a surface is made of draws its own joints; the first engine's 2 m checker on floors,
   walls and the painted sky is gone. Sloped surfaces (ramps, cave floors and ceilings) are drawn from their
   own lattices, and walls at an angle from their turned boxes, each face finished as the room in front of it. Fixed
   props are added from their shapes; loose ones are drawn elsewhere, since they move.

   The light itself is read by the shader from the level's light field, pixel by pixel (lightVolume.ts); a vertex says
   only how much of it its surface takes (a ceiling less, a lit fitting more). When the power changes, only the fittings'
   colours here change (LevelMesh.relight).

   Each vertex also carries what it is made of (content/materials.ts, numbered by matId), and the floor and ceiling
   heights of its room, for the shader to draw the material and its wear from.

   It is drawn in pieces, each the faces whose middles fall in one block of space (PIECE): what is out of view, or out of
   a beam's view for its shadow, is not drawn at all. (As one mesh, all of the level went through every shadow map
   every frame.) What they hide is not lit for nothing: their depth is drawn first (post.ts). */

/** the blocks of space the mesh is drawn in (m): across, and up. A few hundred for the upper station */
const PIECE = { across: 16, up: 8 };

/** a vertex's light: which room it is in (for its fitting's colour), and how much it takes; and what it is made of */
interface Src { room: number; m: number; mat: number }

/** the corner each room's joints are laid from (the shader's aRoomO): the north-west corner of all of it, every piece
 *  of a room that bears its name on its floor (a hall and its bay, the strips it reaches into a partition with), so a
 *  floor's joints run on across its pieces and start again past its doorways */
function corners(rooms: RoomDef[]): [number, number][] {
  const at = new Map<string, [number, number]>();
  const key = (R: RoomDef) => R.name + '@' + R.y0.toFixed(2);
  for (const R of rooms) {
    const c = at.get(key(R));
    at.set(key(R), c ? [Math.min(c[0], R.x0), Math.min(c[1], R.z0)] : [R.x0, R.z0]);
  }
  return rooms.map(R => at.get(key(R))!);
}

class Out {
  private corner: [number, number][];
  constructor(private rooms: RoomDef[]) { this.corner = corners(rooms); }
  P: number[] = [];
  C: number[] = [];
  room: number[] = [];
  m: number[] = [];
  M: number[] = [];
  RY: number[] = [];
  RO: number[] = [];
  /** fittings whose colour shows power: [first vertex, count, which] */
  pw: [number, number, [Colour, Colour], string][] = [];
  vert(x: number, y: number, z: number, c: Colour, src: Src): void {
    this.P.push(x, y, z);
    this.C.push(c[0], c[1], c[2]);
    this.room.push(src.room); this.m.push(src.m);
    const R = src.room >= 0 ? this.rooms[src.room] : null;
    this.M.push(src.mat);
    this.RY.push(R ? R.y0 : 0, R ? R.y0 + R.ht : 0);
    const o = R ? this.corner[src.room] : null;
    this.RO.push(o ? o[0] : 0, o ? o[1] : 0);
  }
  /** a rectangle on plane `a` (0 x, 1 y, 2 z) at `s`, spanning [u0, u1] x [v0, v1] on the other two axes in order */
  rect(a: number, s: number, u0: number, u1: number, v0: number, v1: number, c: Colour, room: number, m: number, mat = 0): void {
    const pt = (u: number, v: number): [number, number, number] =>
      a === 0 ? [s, u, v] : a === 1 ? [u, s, v] : [u, v, s];
    const q = [pt(u0, v0), pt(u1, v0), pt(u1, v1), pt(u0, v1)];
    for (const k of [0, 1, 2, 0, 2, 3]) this.vert(q[k][0], q[k][1], q[k][2], c, { room, m, mat });
  }
  /** a four-cornered face, its corners in order round it */
  quad(q: [number, number, number][], c: Colour, room: number, m: number, mat = 0): void {
    for (const k of [0, 1, 2, 0, 2, 3]) this.vert(q[k][0], q[k][1], q[k][2], c, { room, m, mat });
  }
  get count(): number { return this.P.length / 3; }
}

/** the level's mesh, in pieces (PIECE), and how to show the power in its fittings again. Its services (pipes and trays
 *  under bare ceilings) are pieces of their own, shown only with surface detail on */
export class LevelMesh {
  readonly pieces: THREE.BufferGeometry[];
  readonly services: THREE.BufferGeometry[];
  /** for each vertex as built: the piece it went to, and its place there */
  private piece: Int32Array;
  private at: Int32Array;
  /** each piece's colours, and which have changed since they were last sent */
  private cols: Float32Array[];
  private touched = new Set<number>();
  constructor(private o: Out, extra: Out) {
    const own = cut(o);
    this.pieces = own.geometries; this.piece = own.piece; this.at = own.at;
    this.cols = this.pieces.map(g => g.getAttribute('aCol').array as Float32Array);
    this.services = cut(extra).geometries;
  }
  /** every fitting's colour under this lighting */
  relight(L: Lighting): void {
    for (const [first, count, pw, circuit] of this.o.pw) this.fitting(L, first, count, pw, circuit);
    this.send();
  }

  /** only these rooms' fittings: a light coming on room by room (present/cascade.ts) */
  relightRooms(L: Lighting, rooms: Iterable<number>): void {
    const o = this.o;
    if (!this.pwByRoom) {
      this.pwByRoom = new Map();
      o.pw.forEach((f, k) => { const r = o.room[f[0]]; let a = this.pwByRoom!.get(r); if (!a) this.pwByRoom!.set(r, (a = [])); a.push(k); });
    }
    for (const r of rooms) for (const k of this.pwByRoom.get(r) ?? []) { const [first, count, pw, circuit] = o.pw[k]; this.fitting(L, first, count, pw, circuit); }
    this.send();
  }

  private pwByRoom: Map<number, number[]> | null = null;

  private fitting(L: Lighting, first: number, count: number, pw: [Colour, Colour], circuit: string): void {
    const c = L.fittingIn(pw, circuit, this.o.room[first]);
    for (let i = first; i < first + count; i++) {
      const p = this.piece[i];
      this.cols[p].set(c, this.at[i] * 3);
      this.touched.add(p);
    }
  }

  /** the pieces whose colours changed, to the card */
  private send(): void {
    for (const p of this.touched) this.pieces[p].getAttribute('aCol').needsUpdate = true;
    this.touched.clear();
  }
}

/** the mesh cut into pieces, each the triangles whose middles are in one block of space (PIECE), in the order they were
 *  built; and where each vertex went */
function cut(o: Out): { geometries: THREE.BufferGeometry[]; piece: Int32Array; at: Int32Array } {
  const n = o.count, P = o.P, piece = new Int32Array(n), at = new Int32Array(n), byBlock = new Map<number, number>(), counts: number[] = [];
  for (let v = 0; v < n; v += 3) {
    const x = (P[v * 3] + P[v * 3 + 3] + P[v * 3 + 6]) / 3, y = (P[v * 3 + 1] + P[v * 3 + 4] + P[v * 3 + 7]) / 3, z = (P[v * 3 + 2] + P[v * 3 + 5] + P[v * 3 + 8]) / 3;
    const key = ((Math.floor(x / PIECE.across) + 512) * 1024 + (Math.floor(y / PIECE.up) + 512)) * 1024 + (Math.floor(z / PIECE.across) + 512);
    let p = byBlock.get(key);
    if (p === undefined) byBlock.set(key, (p = counts.push(0) - 1));
    for (let k = 0; k < 3; k++) { piece[v + k] = p; at[v + k] = counts[p]++; }
  }
  const arrays = counts.map(c => ({ P: new Float32Array(c * 3), C: new Float32Array(c * 3), m: new Float32Array(c), M: new Float32Array(c), RY: new Float32Array(c * 2), RO: new Float32Array(c * 2) }));
  for (let v = 0; v < n; v++) {
    const A = arrays[piece[v]], i = at[v];
    for (let k = 0; k < 3; k++) { A.P[i * 3 + k] = P[v * 3 + k]; A.C[i * 3 + k] = o.C[v * 3 + k]; }
    A.m[i] = o.m[v]; A.M[i] = o.M[v]; A.RY[i * 2] = o.RY[v * 2]; A.RY[i * 2 + 1] = o.RY[v * 2 + 1];
    A.RO[i * 2] = o.RO[v * 2]; A.RO[i * 2 + 1] = o.RO[v * 2 + 1];
  }
  const geometries = arrays.map(A => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(A.P, 3));
    g.setAttribute('aCol', new THREE.BufferAttribute(A.C, 3));
    g.setAttribute('aLight', new THREE.BufferAttribute(A.m, 1));
    g.setAttribute('aMat', new THREE.BufferAttribute(A.M, 1));
    g.setAttribute('aRoomY', new THREE.BufferAttribute(A.RY, 2));
    g.setAttribute('aRoomO', new THREE.BufferAttribute(A.RO, 2));
    g.computeBoundingSphere();
    return g;
  });
  return { geometries, piece, at };
}

/** cut [lo, hi] at each of `at` that falls inside it */
function cuts(lo: number, hi: number, at: number[]): [number, number][] {
  const xs = [lo, ...at.filter(x => x > lo + 1e-6 && x < hi - 1e-6).sort((p, q) => p - q), hi];
  const out: [number, number][] = [];
  for (let i = 0; i < xs.length - 1; i++) out.push([xs[i], xs[i + 1]]);
  return out;
}

/** build the level's mesh, its fittings showing the power as L has it */
export function buildLevelMesh(w: World, L: Lighting): LevelMesh {
  const g = w.grid, o = new Out(w.rooms), extra = new Out(w.rooms);

  /* a rectangle in a room */
  const put = (a: number, s: number, u0: number, u1: number, v0: number, v1: number, room: number, c: Colour, m: number, mat: number) =>
    o.rect(a, s, u0, u1, v0, v1, c, room, m, mat);

  /* is a floor (or ceiling) face at height s over x0..x1, z0..z1 lying wholly under (over) a sloped surface of its kind,
     at or above (below) it everywhere? Then the surface is what shows, and drawing both would have them fight where they
     meet in one plane: a cave whose floor is flat at its room's floor, say. Asked every half metre across the face. */
  const covered = (floor: boolean, s: number, x0: number, x1: number, z0: number, z1: number): boolean => {
    const kind = floor ? 'floor' : 'ceiling';
    return w.surfaces.some(sf => {
      const d = sf.def;
      if (d.kind !== kind || d.hidden || x0 < d.x0 - 1e-3 || x1 > d.x1 + 1e-3 || z0 < d.z0 - 1e-3 || z1 > d.z1 + 1e-3) return false;
      const nx = Math.max(1, Math.ceil((x1 - x0) / 0.5)), nz = Math.max(1, Math.ceil((z1 - z0) / 0.5));
      for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
        const x = Math.min(Math.max(x0 + ((x1 - x0) * i) / nx, x0 + 0.01), x1 - 0.01), z = Math.min(Math.max(z0 + ((z1 - z0) * j) / nz, z0 + 0.01), z1 - 0.01);
        if (!sf.has(x, z)) return false;
        const h = sf.heightAt(x, z);
        if (floor ? h < s - 0.002 : h > s + 0.002) return false;
      }
      return true;
    });
  };

  /* one face: axis a, plane s (world), rectangle over the other two axes (world), the open side's room, the solid's block (-1 rock) */
  const face = (a: number, s: number, u0: number, u1: number, v0: number, v1: number, room: number, block: number, openUp: boolean) => {
    const R = w.rooms[room];
    if (a === 1 && covered(openUp, s, u0, u1, v0, v1)) return;
    /* (a slab's top is the floor of the room on it, as rock's is) */
    if (block >= 0 && !(a === 1 && openUp && w.blocks[block].slab)) {
      put(a, s, u0, u1, v0, v1, room, w.blocks[block].colour, 1, matId(w.blocks[block].mat));
      return;
    }
    if (a === 1) {
      /* u is x, v is z */
      const fm = matId(R.mat.floor);
      if (openUp) put(a, s, u0, u1, v0, v1, room, R.floor, 1, fm);
      /* the cavern's roof, painted sky, lit up more than a ceiling (as before): paint, with nothing drawn on it */
      else if (R.sky) put(a, s, u0, u1, v0, v1, room, R.sky, 1.5, 0);
      else put(a, s, u0, u1, v0, v1, room, scale3(R.wall, 0.6), 0.8, matId(R.mat.ceiling));
      return;
    }
    /* a wall. On plane x the axes are (y, z); on plane z, (x, y) */
    const yAxisFirst = a === 0;
    const [y0, y1] = yAxisFirst ? [u0, u1] : [v0, v1], [h0, h1] = yAxisFirst ? [v0, v1] : [u0, u1];
    for (const [ya, yb, c, m, mat] of bands(R, y0, y1)) {
      if (yAxisFirst) put(a, s, ya, yb, h0, h1, room, c, m, mat);
      else put(a, s, h0, h1, ya, yb, room, c, m, mat);
    }
  };

  /* chunk by chunk. A chunk draws the faces on planes whose far cell is its own, and the plane past its far side when
     nothing lies beyond (no chunk there, so nobody else would). */
  const mask = new Int32Array(CHUNK * CHUNK), stride = [1, CHUNK, CHUNK * CHUNK];
  g.forEachChunk((cx, cy, cz) => {
    const base = [cx * CHUNK, cy * CHUNK, cz * CHUNK], own = g.chunkCells(cx, cy, cz)!;
    /* a chunk that is all open or all solid has no faces inside it: only its boundary planes need looking at */
    const open0 = own[0] >= 0;
    let mixed = false;
    for (let n = 1; n < own.length; n++) if (own[n] >= 0 !== open0) { mixed = true; break; }
    for (let a = 0; a < 3; a++) {
      const ua = a === 0 ? 1 : 0, va = a === 2 ? 1 : 2, ou = stride[ua], ov = stride[va], d = stride[a];
      const prev = [cx, cy, cz], next = [cx, cy, cz];
      prev[a]--; next[a]++;
      /* cells are read straight from the chunk's array; the plane on its near side reads the neighbour's last layer */
      const before = g.chunkCells(prev[0], prev[1], prev[2]), last = g.hasChunk(next[0], next[1], next[2]) ? CHUNK - 1 : CHUNK;
      for (let ls = 0; ls <= last; ls++) {
        if (!mixed && ls > 0 && ls < CHUNK) continue;
        const s = base[a] + ls;
        for (let v = 0; v < CHUNK; v++)
          for (let u = 0; u < CHUNK; u++) {
            const o = u * ou + v * ov;
            const A = ls > 0 ? own[o + (ls - 1) * d] : before ? before[o + (CHUNK - 1) * d] : -1;
            const B = ls < CHUNK ? own[o + ls * d] : -1;
            let key = 0;
            if ((A >= 0) !== (B >= 0)) {
              const room = A >= 0 ? A : B, solid = A >= 0 ? B : A, side = B >= 0 ? 1 : 0;
              key = ((-1 - solid) * 4096 + room) * 2 + side + 1;
            }
            mask[v * CHUNK + u] = key;
          }
        /* greedy: grow each face along u, then along v, while the key holds */
        for (let v = 0; v < CHUNK; v++)
          for (let u = 0; u < CHUNK; ) {
            const key = mask[v * CHUNK + u];
            if (!key) { u++; continue; }
            let w1 = 1;
            while (u + w1 < CHUNK && mask[v * CHUNK + u + w1] === key) w1++;
            let h1 = 1;
            grow: while (v + h1 < CHUNK) {
              for (let q = 0; q < w1; q++) if (mask[(v + h1) * CHUNK + u + q] !== key) break grow;
              h1++;
            }
            for (let r = 0; r < h1; r++) for (let q = 0; q < w1; q++) mask[(v + r) * CHUNK + u + q] = 0;
            const k = key - 1, side = k & 1, room = (k >> 1) & 4095, block = Math.floor((k >> 1) / 4096) - 1;
            const U = base[ua] + u, V = base[va] + v;
            face(a, s * CELL, U * CELL, (U + w1) * CELL, V * CELL, (V + h1) * CELL, room, block, side === 1);
            u += w1;
          }
      }
    }
  });

  for (const sf of w.surfaces) if (!sf.def.hidden) surfaceMesh(o, w, sf);
  w.walls.forEach((W, k) => wallMesh(o, w, W, k));

  /* fixed props, in the room they stand in; fittings show their circuit's power.
     Each is drawn a hair larger than it is (apart: see `apart`), so where two meet face to face, or one stands on the
     floor or a shelf, the faces are not in one plane and do not fight. */
  w.def.props.forEach((p, k) => {
    /* glass is drawn see-through on its own (render/things.ts) */
    if (p.loose || p.mat === 'glass') return;
    const R = w.roomAt(p.x, p.y + 0.05, p.z) ?? w.roomAt(p.x, p.y + p.sy / 2, p.z), src: Src = { room: R ? R.id : -1, m: p.glow, mat: matId(p.mat) };
    const to = p.services ? extra : o, first = to.count, e = p.flush ? 0 : apart(k);
    propVerts({ ...p, sx: p.sx + 2 * e, sy: p.sy + 2 * e, sz: p.sz + 2 * e, y: p.y - e }, (x, y, z) => to.vert(x, y, z, p.colour, src));
    if (p.pw) to.pw.push([first, to.count - first, p.pw, p.pc ?? w.def.circuit]);
  });

  const mesh = new LevelMesh(o, extra);
  mesh.relight(L);
  return mesh;
}

/** a prop's triangles in the world, from its template: scaled, tipped (rz), turned (ry), stood on its base */
export function propVerts(p: PropDef, put: (x: number, y: number, z: number) => void, at?: { x: number; y: number; z: number }): void {
  const src = TEMPLATES[p.shape], px = at ? at.x : p.x, py = at ? at.y : p.y, pz = at ? at.z : p.z;
  /* its middle over its base: half its height, or for a lump, half what it reaches (ICO), so it sits on its base */
  const cy = Math.cos(p.ry), sy = Math.sin(p.ry), cz = Math.cos(p.rz), sz = Math.sin(p.rz), by = py + (p.sy / 2) * (p.shape === 'ico' ? ICO : 1);
  for (let v = 0; v < src.length; v += 3) {
    let X = src[v] * p.sx, Y = src[v + 1] * p.sy, Z = src[v + 2] * p.sz;
    if (p.rz) { const x2 = X * cz - Y * sz; Y = X * sz + Y * cz; X = x2; }
    const x3 = X * cy + Z * sy; Z = -X * sy + Z * cy; X = x3;
    put(px + X, by + Y, pz + Z);
  }
}

/** how much larger than it is the k-th of a set of parts is drawn, each side: 1 to 7 mm, different for neighbours, so two
 *  parts made flush (a button on its post, a box on a shelf, a crate on the floor) never share a plane. Everything is
 *  drawn two-sided, so a face pressed against another shows through it unless one stands clear. */
export const apart = (k: number): number => 0.001 * (1 + (k % 7));

/** a room's wall from y0 up to y1, in the bands it is finished in: [from, to, colour, how much light it takes, what it is
 *  made of]. High up a tall room, walls are darker (as before). Painted block takes a darker dado and the stripe over
 *  it; nothing else is painted so. A room can be one thing below its datum and another above it (the lobby's stone,
 *  plaster over it). */
function bands(R: RoomDef, y0: number, y1: number): [number, number, Colour, number, number][] {
  const f = R.y0, wm = matId(R.mat.wall), painted = !R.plain && !R.doorway && R.mat.wall === 'block';
  const up = R.mat.upper ? f + (R.mat.datum ?? 4) : Infinity;
  return cuts(y0, y1, [f + 3.2, ...(painted ? [f + 0.9, f + 1.05] : []), ...(R.mat.upper ? [up] : [])]).map(([ya, yb]) => {
    const high = ya >= f + 3.2 - 1e-6;
    const band = !painted || high ? 2 : yb <= f + 0.9 + 1e-6 ? 0 : yb <= f + 1.05 + 1e-6 ? 1 : 2;
    const c = band === 0 ? scale3(R.wall, 0.78) : band === 1 ? R.stripe : R.wall;
    return [ya, yb, c, high ? 0.6 : 1, ya >= up - 1e-6 ? matId(R.mat.upper) : wm];
  });
}

/** a wall at an angle (world.ts, walls): each face in the finish of the room in front of it, as a face of rock is, cut
 *  where that room changes along it; or all of it its own colour, if it has one. Faces with nothing in front of them
 *  (in rock, in another wall's side) are not drawn. It is drawn a hair larger than it is (apart), so a face in one
 *  plane with one of the grid's, or with a floor or a ceiling, does not fight it */
function wallMesh(o: Out, w: World, W: World['walls'][number], k: number): void {
  const t = W.turn, e = apart(k), hu = t.hu + e, hv = t.hv + e, y0 = W.y0 - e, y1 = W.y1 + e;
  const at = (u: number, v: number): [number, number] => [t.cx + t.c * u - t.s * v, t.cz + t.s * u + t.c * v];
  const own = W.colour ? { c: W.colour, mat: matId(W.mat) } : null;
  /* where the face stands: a body's height up it, or its middle if it is shorter */
  const ys = Math.min(W.y0 + 1.2, (W.y0 + W.y1) / 2);
  /* its sides, each from p to q with its outward facing n: along it either side, and its two ends */
  const sides: [[number, number], [number, number], [number, number]][] = [
    [at(-hu, hv), at(hu, hv), [-t.s, t.c]], [at(hu, -hv), at(-hu, -hv), [t.s, -t.c]],
    [at(hu, hv), at(hu, -hv), [t.c, t.s]], [at(-hu, -hv), at(-hu, hv), [-t.c, -t.s]],
  ];
  for (const [p, q, n] of sides) {
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]), steps = Math.max(1, Math.ceil(len / 0.5));
    /* the room in front of each half metre of it, and runs of the same room */
    const rooms: number[] = [];
    for (let i = 0; i < steps; i++) {
      const f = (i + 0.5) / steps, x = p[0] + (q[0] - p[0]) * f + n[0] * 0.06, z = p[1] + (q[1] - p[1]) * f + n[1] * 0.06;
      rooms.push(w.inWall(x, ys, z) ? -1 : w.roomAt(x, ys, z)?.id ?? -1);
    }
    for (let i = 0; i < steps; ) {
      let j = i + 1;
      while (j < steps && rooms[j] === rooms[i]) j++;
      const r = rooms[i], fa = i / steps, fb = j / steps;
      const a: [number, number] = [p[0] + (q[0] - p[0]) * fa, p[1] + (q[1] - p[1]) * fa], b: [number, number] = [p[0] + (q[0] - p[0]) * fb, p[1] + (q[1] - p[1]) * fb];
      const face = (ya: number, yb: number, c: Colour, m: number, mat: number) => o.quad([[a[0], ya, a[1]], [b[0], ya, b[1]], [b[0], yb, b[1]], [a[0], yb, a[1]]], c, r, m, mat);
      if (r >= 0) {
        if (own) face(y0, y1, own.c, 1, own.mat);
        else for (const [ya, yb, c, m, mat] of bands(w.rooms[r], y0, y1)) face(ya, yb, c, m, mat);
      }
      i = j;
    }
  }
  /* its top and its foot, where they are in the open (a wall short of the ceiling, or hung off the floor) */
  const corners = [at(-hu, -hv), at(hu, -hv), at(hu, hv), at(-hu, hv)];
  for (const [y, d] of [[y1, 0.06], [y0, -0.06]] as const) {
    const R = w.inWall(t.cx, y + d, t.cz) ? null : w.roomAt(t.cx, y + d, t.cz);
    if (R) o.quad(corners.map(([x, z]) => [x, y, z] as [number, number, number]), own ? own.c : R.wall, R.id, 1, own ? own.mat : matId(R.mat.wall));
  }
}

/** a sloped surface: its lattice as quads, and for a ramp its edges down to the base */
function surfaceMesh(o: Out, w: World, sf: Surface): void {
  const d = sf.def, floor = d.kind === 'floor', res = d.res;
  const X = (i: number) => d.x0 + i * res, Z = (j: number) => d.z0 + j * res, H = (i: number, j: number) => d.h[j * d.nx + i];
  /* each quad is in the room it faces */
  const mat = matId(d.mat);
  const src = (x: number, y: number, z: number, m: number): Src => {
    const R = w.roomAt(x, y + (floor ? 0.3 : -0.3), z);
    return { room: R ? R.id : -1, m, mat };
  };
  const m = floor ? 1 : 0.8;
  for (let j = 0; j < d.nz - 1; j++)
    for (let i = 0; i < d.nx - 1; i++) {
      if (d.mask && !d.mask[j * (d.nx - 1) + i]) continue;
      const x0 = X(i), x1 = X(i + 1), z0 = Z(j), z1 = Z(j + 1), h00 = H(i, j), h10 = H(i + 1, j), h11 = H(i + 1, j + 1), h01 = H(i, j + 1);
      const l = src((x0 + x1) / 2, (h00 + h11) / 2, (z0 + z1) / 2, m);
      const q: [number, number, number][] = [[x0, h00, z0], [x1, h10, z0], [x1, h11, z1], [x0, h01, z1]];
      for (const k of [0, 1, 2, 0, 2, 3]) o.vert(q[k][0], q[k][1], q[k][2], d.colour, l);
    }
  if (!d.sides) return;
  const side = (pts: [number, number, number][]) => {
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, ah, az] = pts[k], [bx, bh, bz] = pts[k + 1], l = src((ax + bx) / 2, d.base + 0.1, (az + bz) / 2, 1), c = scale3(d.colour, 0.85);
      const q: [number, number, number][] = [[ax, d.base, az], [bx, d.base, bz], [bx, bh, bz], [ax, ah, az]];
      for (const n of [0, 1, 2, 0, 2, 3]) o.vert(q[n][0], q[n][1], q[n][2], c, l);
    }
  };
  side(Array.from({ length: d.nx }, (_, i) => [X(i), H(i, 0), Z(0)] as [number, number, number]));
  side(Array.from({ length: d.nx }, (_, i) => [X(i), H(i, d.nz - 1), Z(d.nz - 1)] as [number, number, number]));
  side(Array.from({ length: d.nz }, (_, j) => [X(0), H(0, j), Z(j)] as [number, number, number]));
  side(Array.from({ length: d.nz }, (_, j) => [X(d.nx - 1), H(d.nx - 1, j), Z(j)] as [number, number, number]));
}
