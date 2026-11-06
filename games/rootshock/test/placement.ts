import type { LevelDef, PropDef } from '../src/content/types';
import { World } from '../src/world/world';
import { CELL } from '../src/world/grid';
import { propCorners as corners } from '../src/content/build/builder';
import { lyingCorners, lyingYaw, paperYaw } from '../src/content/lying';

/* Where things are, measured against what is built (test/placement.test.ts holds the station to it;
   test/probes/placement.probe.ts lists everything it finds): what you can pick up and the papers lie on something you
   can see, not over it, in it or in a wall; fittings neither run into the walls nor hang in the air; a pane of glass lies
   across its opening, not along it. */

type V3 = [number, number, number];
/** what is wrong, and where: `prop`, the index of the prop it is about, if it is one */
export interface Fault { kind: string; what: string; at: V3; d: number; prop?: number }

/** a point in a prop's own frame: its middle at the origin, its sides along the axes (turned about y, then tipped about
 *  z, undone) */
function local(p: PropDef, x: number, y: number, z: number): V3 {
  const dx = x - p.x, dy = y - (p.y + p.sy / 2), dz = z - p.z, c = Math.cos(p.ry), s = Math.sin(p.ry);
  const u = dx * c - dz * s, w = dx * s + dz * c, cz = Math.cos(p.rz), sz = Math.sin(p.rz);
  return [u * cz + dy * sz, -u * sz + dy * cz, w];
}
/** is (x, y, z) in a prop's body, `inset` metres in from its sides? */
function inside(p: PropDef, x: number, y: number, z: number, inset = 0): boolean {
  const [u, v, w] = local(p, x, y, z), hx = p.sx / 2 - inset, hy = p.sy / 2 - inset, hz = p.sz / 2 - inset;
  if (hx <= 0 || hy <= 0 || hz <= 0 || Math.abs(v) > hy) return false;
  return p.shape === 'box' ? Math.abs(u) <= hx && Math.abs(w) <= hz : (u / hx) ** 2 + (w / hz) ** 2 <= 1;
}
/** a tipped prop, or a lump, has no top to put anything on */
const flat = (p: PropDef) => p.shape !== 'ico' && Math.abs(Math.sin(p.rz)) < 0.05;

/** what a level's things are measured against: the world built from it, and its props bucketed by 2 m column */
export class Site {
  readonly w: World;
  private cols = new Map<number, number[]>();
  constructor(readonly def: LevelDef) {
    this.w = new World(def);
    def.props.forEach((p, k) => {
      if (p.services) return;
      const [x0, , z0, x1, , z1] = span(corners(p));
      for (let j = Math.floor(z0 / 2); j <= Math.floor(z1 / 2); j++) for (let i = Math.floor(x0 / 2); i <= Math.floor(x1 / 2); i++) {
        const key = j * 100000 + i;
        let a = this.cols.get(key);
        if (!a) this.cols.set(key, (a = []));
        a.push(k);
      }
    });
  }
  /** the props whose bucket holds (x, z) */
  near(x: number, z: number): number[] { return this.cols.get(Math.floor(z / 2) * 100000 + Math.floor(x / 2)) ?? []; }
  /** the props whose buckets meet a box in plan */
  around(x0: number, z0: number, x1: number, z1: number): Set<number> {
    const out = new Set<number>();
    for (let j = Math.floor(z0 / 2); j <= Math.floor(z1 / 2); j++) for (let i = Math.floor(x0 / 2); i <= Math.floor(x1 / 2); i++) for (const k of this.near(i * 2 + 1, j * 2 + 1)) out.add(k);
    return out;
  }
  /** rock (or a block), or under a sloped floor or over a sloped roof: not open */
  solid(x: number, y: number, z: number): boolean {
    if (this.w.grid.at(x, y, z) < 0) return true;
    for (const s of this.w.surfaces) {
      const d = s.def;
      if (d.hidden || x < d.x0 || x > d.x1 || z < d.z0 || z > d.z1 || !s.has(x, z)) continue;
      const h = s.heightAt(x, z);
      if (d.kind === 'floor' ? y < h && y >= d.base : y > h && y <= d.base) return true;
    }
    return false;
  }
  /** the ceiling as built over (x, z), above `from` */
  ceiling(x: number, z: number, from: number): number {
    let y = Infinity;
    for (let j = Math.floor(from / CELL), n = 0; n < 400; j++, n++) if (this.w.grid.get(Math.floor(x / CELL), j, Math.floor(z / CELL)) < 0) { y = j * CELL; break; }
    for (const s of this.w.surfaces) if (s.def.kind === 'ceiling' && x >= s.def.x0 && x <= s.def.x1 && z >= s.def.z0 && z <= s.def.z1 && s.has(x, z)) { const h = s.heightAt(x, z); if (h >= from && h < y) y = h; }
    return y;
  }
  /** the floor as built under (x, z), below `top`: rock, a block, or a sloped floor */
  floor(x: number, z: number, top: number): number {
    let y = -Infinity;
    for (let j = Math.floor(top / CELL + 1e-6) - 1, n = 0; n < 400; j--, n++) if (this.w.grid.get(Math.floor(x / CELL), j, Math.floor(z / CELL)) < 0) { y = (j + 1) * CELL; break; }
    for (const s of this.w.surfaces) if (s.def.kind === 'floor' && x >= s.def.x0 && x <= s.def.x1 && z >= s.def.z0 && z <= s.def.z1 && s.has(x, z)) { const h = s.heightAt(x, z); if (h <= top && h > y) y = h; }
    return y;
  }
  /** the highest thing you can see under (x, z) whose top is at or under `top`, and what it is */
  ground(x: number, z: number, top: number, skip = -1): { y: number; what: string } {
    let y = -Infinity, what = 'nothing';
    /* the built floor: rock, and blocks built back in (each to its own top, which need not be on the grid) */
    for (let j = Math.floor(top / CELL + 1e-6) - 1, n = 0; n < 400; j--, n++)
      if (this.w.grid.get(Math.floor(x / CELL), j, Math.floor(z / CELL)) < 0) { y = (j + 1) * CELL; what = 'the floor'; break; }
    for (const b of this.def.blocks) if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && b.y1 <= top + 1e-6 && b.y1 > y) { y = b.y1; what = 'a step'; }
    for (const s of this.w.surfaces) {
      const d = s.def;
      if (d.kind !== 'floor' || d.hidden || x < d.x0 || x > d.x1 || z < d.z0 || z > d.z1 || !s.has(x, z)) continue;
      const h = s.heightAt(x, z);
      if (h <= top + 1e-6 && h > y) { y = h; what = 'the ground'; }
    }
    /* and what stands on it */
    for (const k of this.near(x, z)) {
      const p = this.def.props[k], t = p.y + p.sy;
      if (k === skip || !flat(p) || !inside(p, x, p.y + p.sy / 2, z)) continue;
      if (t <= top + 1e-6 && t > y) { y = t; what = `prop ${k} (${p.shape} ${p.sx}×${p.sy}×${p.sz} at ${p.y.toFixed(2)})`; }
    }
    return { y, what };
  }
  /** a prop whose body holds the point, other than `skip` */
  inProp(x: number, y: number, z: number, skip = -1): number {
    for (const k of this.near(x, z)) if (k !== skip && inside(this.def.props[k], x, y, z, 0.005)) return k;
    return -1;
  }
}

/** the box round some points: [x0, y0, z0, x1, y1, z1] */
function span(pts: V3[]): number[] {
  const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const p of pts) for (let a = 0; a < 3; a++) { b[a] = Math.min(b[a], p[a]); b[a + 3] = Math.max(b[a + 3], p[a]); }
  return b;
}

/** a thing lying about, as drawn: points over its underside (each part's corners and middle, on the plan), and how
 *  high it stands */
function lying(id: string, x: number, y: number, z: number, yaw: number): { under: [number, number][]; bottom: number; top: number } {
  const pts = lyingCorners(id, x, y, z, yaw), under: [number, number][] = [];
  for (let k = 0; k < pts.length; k += 8) {
    const P = pts.slice(k, k + 8), cx = P.reduce((a, p) => a + p[0], 0) / 8, cz = P.reduce((a, p) => a + p[2], 0) / 8;
    under.push([cx, cz]);
    /* each corner a little in toward the part's middle, so a thing exactly as long as its shelf is not over the edge */
    for (const p of P) under.push([p[0] + (cx - p[0]) * 0.1, p[2] + (cz - p[2]) * 0.1]);
  }
  return { under, bottom: Math.min(...pts.map(p => p[1])), top: Math.max(...pts.map(p => p[1])) };
}

/** what is wrong with where the level's things are */
export function placement(def: LevelDef, site = new Site(def)): Fault[] {
  const out: Fault[] = [], R = (v: number) => Math.round(v * 100) / 100;
  const fault = (kind: string, what: string, x: number, y: number, z: number, d: number, prop?: number) => out.push({ kind, what, at: [R(x), R(y), R(z)], d: R(d), ...(prop !== undefined ? { prop } : {}) });
  /* what you pick up, and the papers: each resting on what is under it, all of it over something, in nothing */
  const things = [
    ...def.items.map(it => ({ name: it.id, id: it.id, x: it.x, y: it.y, z: it.z, yaw: lyingYaw(it) })),
    ...def.notes.filter(n => !n.bare).map(n => ({ name: 'note ' + n.key, id: 'note', x: n.x, y: n.y, z: n.z, yaw: paperYaw(n) })),
  ];
  for (const t of things) {
    const L = lying(t.id, t.x, t.y, t.z, t.yaw);
    const g = site.ground(t.x, t.z, L.bottom + 0.02), gap = L.bottom - g.y;
    if (gap > 0.005) fault('floats', `${t.name}, ${gap.toFixed(3)} m over ${g.what}`, t.x, t.y, t.z, gap);
    let off = 0, wall = 0, inside = -1;
    for (const [x, z] of L.under) {
      if (L.bottom - site.ground(x, z, L.bottom + 0.02).y > 0.02) off++;
      if (site.solid(x, L.bottom + 0.01, z)) wall++;
      for (const y of [L.bottom + 0.012, (L.bottom + L.top) / 2]) { const k = site.inProp(x, y, z); if (k >= 0 && inside < 0) inside = k; }
    }
    if (off) fault('overhangs', `${t.name}: ${off} of ${L.under.length} points of its underside over nothing (${g.what} under it)`, t.x, t.y, t.z, off / L.under.length);
    if (wall) fault('in a wall', `${t.name}: ${wall} of ${L.under.length} points in rock`, t.x, t.y, t.z, wall / L.under.length);
    if (inside >= 0) { const p = def.props[inside]; fault('inside', `${t.name} in prop ${inside} (${p.shape} ${p.sx}×${p.sy}×${p.sz} from ${p.y.toFixed(2)} to ${(p.y + p.sy).toFixed(2)})`, t.x, t.y, t.z, 0); }
  }
  /* a paper with none of its own is written on what it is read from: something is there, a hand's breadth away */
  for (const n of def.notes.filter(n => n.bare)) {
    let on = false;
    for (const d of [0.01, 0.02, 0.03, 0.04, 0.05]) for (const [dx, dy, dz] of [[d, 0, 0], [-d, 0, 0], [0, 0, d], [0, 0, -d], [0, -d, 0]]) if (site.solid(n.x + dx, n.y + dy, n.z + dz) || site.inProp(n.x + dx, n.y + dy, n.z + dz) >= 0) on = true;
    if (!on) fault('floats', `note ${n.key}, written on nothing`, n.x, n.y, n.z, 0);
  }
  /* fittings: none running into a wall, none hanging in the air: each is held by the floor, a wall or the ceiling, or
     by touching something that is (a screen on its monitor, a pump on its pole) */
  const group = def.props.map((_, k) => k), find = (k: number): number => (group[k] === k ? k : (group[k] = find(group[k])));
  const held = new Set<number>();
  def.props.forEach((p, k) => {
    if (p.services) return;
    const cs = corners(p), [x0, lo, z0, x1, hi, z1] = span(cs);
    /* points through its body, 3 cm in from its faces: in rock, it runs into the wall (or, all of it, is lost in it) */
    /* into a wall: solid all the way up through its height there. Down into the floor or up into the ceiling is not: a
       growth comes up through the floor, a column holds up the ceiling, a rod hangs from it */
    const through = (x: number, z: number) => { for (let y = lo + 0.01; y < hi; y += 0.1) if (!site.solid(x, y, z)) return false; return site.solid(x, hi - 0.01, z); };
    let rock = 0, lost = 0, n = 0;
    for (const a of [-1, -0.5, 0, 0.5, 1]) for (const b of [-1, 0, 1]) for (const c of [-1, -0.5, 0, 0.5, 1]) {
      const at = point(p, a, b, c, 0.03);
      n++;
      if (!site.solid(...at)) continue;
      lost++;
      if (through(at[0], at[2])) rock++;
    }
    if (lost === n) rock = n;
    if (rock) fault(rock === n ? 'lost in a wall' : 'runs into a wall', `prop ${k} ${tint(p)} (${p.shape} ${p.sx}×${p.sy}×${p.sz}${p.ry ? ` turned ${p.ry.toFixed(2)}` : ''}): ${rock} of ${n} points through it in rock`, p.x, p.y, p.z, rock / n, k);
    /* held: by what is under it, or a wall or ceiling against it; and joined to whatever it touches */
    const E = 0.015, mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, my = (lo + hi) / 2;
    let on = false;
    for (const [x, z] of [[mx, mz], [x0 + 0.02, z0 + 0.02], [x1 - 0.02, z0 + 0.02], [x0 + 0.02, z1 - 0.02], [x1 - 0.02, z1 - 0.02]]) if (site.ground(x, z, hi, k).y >= lo - E) { on = true; break; }
    if (!on) for (const y of [lo + 0.02, my, hi - 0.02]) for (const [x, z] of [[x0 - E, mz], [x1 + E, mz], [mx, z0 - E], [mx, z1 + E]]) if (site.solid(x, y, z)) on = true;
    if (!on && site.solid(mx, hi + E, mz)) on = true;
    /* or it floats: on standing water there */
    if (!on && def.water.some(w => mx >= w.x0 && mx <= w.x1 && mz >= w.z0 && mz <= w.z1 && lo <= w.level && hi >= w.level)) on = true;
    /* a patch laid on uneven ground (moss, the stream): on it if no point over its middle stands clear of the floor */
    if (!on && p.sy <= 0.03 && p.rz && lo - site.floor(mx, mz, hi + 0.3) < 0.1) {
      let most = 0;
      for (const a of [-0.9, -0.45, 0, 0.45, 0.9]) for (const c of [-0.9, -0.45, 0, 0.45, 0.9]) { const at = point(p, a, -1, c, 0); most = Math.max(most, at[1] - site.floor(at[0], at[2], at[1] + 0.3)); }
      on = most <= E;
      if (!on) { fault('hangs in the air', `prop ${k} ${tint(p)}, laid on the ground, ${most.toFixed(3)} m clear of it at most`, p.x, p.y, p.z, most, k); held.add(k); }
    }
    /* or a door, or a pane of glass (drawn 3 cm thick down its middle: render/things.ts, pane) */
    if (!on) for (const D of def.doors) {
      const g = D.glass ? 0.015 : 0, cx = (D.x0 + D.x1) / 2, cz = (D.z0 + D.z1) / 2;
      const [dx0, dz0, dx1, dz1] = !g ? [D.x0, D.z0, D.x1, D.z1] : D.alongX ? [D.x0, cz - g, D.x1, cz + g] : [cx - g, D.z0, cx + g, D.z1];
      if (dx0 <= x1 + E && dx1 >= x0 - E && D.y0 <= hi + E && D.y1 >= lo - E && dz0 <= z1 + E && dz1 >= z0 - E) on = true;
    }
    if (on) held.add(k);
    for (const j of site.around(x0, z0, x1, z1)) {
      if (j <= k || def.props[j].services) continue;
      const [qx0, qy0, qz0, qx1, qy1, qz1] = span(corners(def.props[j]));
      if (qx0 <= x1 + E && qx1 >= x0 - E && qy0 <= hi + E && qy1 >= lo - E && qz0 <= z1 + E && qz1 >= z0 - E) group[find(j)] = find(k);
    }
  });
  const up = new Set([...held].map(find)), told = new Set<number>();
  def.props.forEach((p, k) => {
    const g = find(k);
    if (p.services || up.has(g) || told.has(g)) return;
    told.add(g);
    const n = group.filter((_, j) => find(j) === g).length, [, lo, , , hi] = span(corners(p));
    fault('hangs in the air', `prop ${k} ${tint(p)} (${p.shape} ${p.sx}×${p.sy}×${p.sz}${p.rz ? ` tipped ${p.rz.toFixed(2)}` : ''}) from ${lo.toFixed(2)} to ${hi.toFixed(2)}${n > 1 ? `, and ${n - 1} it touches,` : ''} held by nothing`, p.x, p.y, p.z, lo - site.ground(p.x, p.z, lo, k).y, k);
  });
  /* something flat fixed on the face of another (writing on a board, a screen on its monitor, a sheet on a notice board)
     lies within that face, not half off its edge. Square ones only (turned a quarter at most), on square ones */
  const square = (p: PropDef) => p.shape === 'box' && !p.rz && Math.abs(Math.sin(2 * p.ry)) < 1e-6;
  def.props.forEach((p, k) => {
    if (p.services || !square(p)) return;
    const [x0, y0, z0, x1, y1, z1] = span(corners(p)), size = [x1 - x0, y1 - y0, z1 - z0], a = size.indexOf(Math.min(...size));
    const rest = [0, 1, 2].filter(i => i !== a);
    if (size[a] < 0.002 || size[a] > 0.025 || Math.max(...rest.map(i => size[i])) < 4 * size[a] || Math.min(...rest.map(i => size[i])) < 2 * size[a]) return;
    const P = [x0, y0, z0, x1, y1, z1], E = 0.015;
    /* what it is on: a face of its thin side against a face of another, the one holding the most of it */
    let best = -1, most = 0, B: number[] = [];
    for (const j of site.around(x0, z0, x1, z1)) {
      const q = def.props[j];
      if (j === k || q.services || !square(q)) continue;
      const Q = span(corners(q));
      if (!(Math.abs(P[a] - Q[a + 3]) < E && P[a + 3] > Q[a + 3] + 1e-3) && !(Math.abs(P[a + 3] - Q[a]) < E && P[a] < Q[a] - 1e-3)) continue; // proud of it
      const share = rest.reduce((f, i) => f * Math.max(0, Math.min(P[i + 3], Q[i + 3]) - Math.max(P[i], Q[i])) / size[i], 1);
      if (share > most && Math.min(...rest.map(i => Q[i + 3] - Q[i])) >= Math.min(...rest.map(i => size[i]))) { most = share; best = j; B = Q; }
    }
    if (best < 0) return;
    const off = Math.max(...rest.map(i => Math.max(B[i] - P[i], P[i + 3] - B[i + 3])));
    if (off > 0.01) fault('off its edge', `prop ${k} ${tint(p)} (box ${p.sx}×${p.sy}×${p.sz}) on prop ${best} ${tint(def.props[best])}: ${off.toFixed(2)} m of it past the edge`, p.x, p.y, p.z, off, k);
  });
  /* a rail (a balustrade waist high, a hand's breadth thick) keeps you from a drop: open air at least to one side of it,
     and nothing solid hard against either. One along a wall, or with a room's side behind it, is no rail */
  def.props.forEach((p, k) => {
    if (p.services || p.shape !== 'box' || p.sy < 0.9 || p.sy > 1.1 || Math.min(p.sx, p.sz) < 0.08 || Math.min(p.sx, p.sz) > 0.12 || p.rz) return;
    if (Math.abs(p.y - site.floor(p.x, p.z, p.y + 0.3)) > 0.02) return; // standing on the floor, not fixed to a wall
    const along = p.sx >= p.sz, c = Math.cos(p.ry), s = Math.sin(p.ry), half = (along ? p.sz : p.sx) / 2 + 0.15, len = (along ? p.sx : p.sz) / 2;
    /* its two sides, out from its middle and along it, at waist height and just under its top */
    const side = (q: -1 | 1) => {
      let solid = 0, n = 0;
      for (const t of [-0.9, -0.5, 0, 0.5, 0.9]) for (const h of [0.3, 0.7]) {
        const u = along ? t * len : q * half, w = along ? q * half : t * len;
        n++;
        if (site.solid(p.x + u * c + w * s, p.y + h * p.sy, p.z - u * s + w * c)) solid++;
      }
      return solid / n;
    };
    const a = side(-1), b = side(1);
    if (a > 0 || b > 0) fault('rail against a wall', `prop ${k} ${tint(p)} (box ${p.sx}×${p.sy}×${p.sz}): ${Math.round(Math.max(a, b) * 100)}% of one side solid`, p.x, p.y, p.z, Math.max(a, b), k);
  });
  /* a pane (or any door) lies across its opening: open either side of it, and not open room beyond both its ends */
  def.doors.forEach((D, k) => {
    const cx = (D.x0 + D.x1) / 2, cz = (D.z0 + D.z1) / 2, y = (D.y0 + D.y1) / 2, ax = D.alongX, L = ax ? D.x1 - D.x0 : D.z1 - D.z0;
    const open = (x: number, z: number) => site.w.roomAt(x, y, z);
    const room = (x: number, z: number) => { const r = open(x, z); return !!r && !r.doorway && !r.part; };
    const e = L / 2 + 0.3, s = (D.depth ?? 2) / 2 + 0.3;
    const ends = ax ? [room(cx - e, cz), room(cx + e, cz)] : [room(cx, cz - e), room(cx, cz + e)];
    const sides = ax ? [open(cx, cz - s), open(cx, cz + s)] : [open(cx - s, cz), open(cx + s, cz)];
    if ((ends[0] && ends[1]) || !sides[0] || !sides[1]) fault('lies along its opening', `${D.glass ? 'pane' : 'door'} ${k}, ${ax ? 'along x' : 'along z'}: open room past both its ends ${ends[0] && ends[1]}, open either side ${!!sides[0]} ${!!sides[1]}`, cx, y, cz, 0);
  });
  return out;
}

/** a point through a prop's body: (a, b, c) from -1 to 1 along its sides, `inset` metres in from its faces */
function point(p: PropDef, a: number, b: number, c: number, inset: number): V3 {
  const ux = Math.max(p.sx / 2 - inset, 0) * a, uy = Math.max(p.sy / 2 - inset, 0) * b, uz = Math.max(p.sz / 2 - inset, 0) * c;
  const cz = Math.cos(p.rz), sz = Math.sin(p.rz), X = ux * cz - uy * sz, Y = ux * sz + uy * cz, cy = Math.cos(p.ry), sy = Math.sin(p.ry);
  return [p.x + X * cy + uz * sy, p.y + p.sy / 2 + Y, p.z - X * sy + uz * cy];
}

/** a prop's colour as the level wrote it (a hex number), to find it there by */
const tint = (p: PropDef) => (p.colour.some(c => c > 1.01) ? `[${p.colour.map(c => +c.toFixed(2)).join(', ')}]` : '0x' + p.colour.map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join(''));
