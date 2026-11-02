import { Rng } from '../../core/rng';
import { hex, scale3, type Colour } from '../../core/math';
import { CAVERN, FITTED, type Mat, type RoomMats } from '../materials';
import { lie, lyingCorners, lyingYaw, paperYaw } from '../lying';
import { ICO, WALL_MIN, roomHas, type Aim, type Batt, type DoorDef, type LevelDef, type LitRule, type Motes, type PlatformDef, type PropDef, type RoomDef, type Shape, type Start, type SurfaceDef, type WallDef } from '../types';

/* The authoring kit. Levels are written as calls on a LevelBuilder; finish() returns plain data.
   Everything random comes from the level's own seed, so a level is dressed the same way every time. */

export interface Palette { fl: number; wl: number; st: number }
export const OPS: Palette = { fl: 0x6a665e, wl: 0x8c887e, st: 0x8a7a4a };
export const SEC: Palette = { fl: 0x55585c, wl: 0x70747a, st: 0x39485a };
export const UTIL: Palette = { fl: 0x505254, wl: 0x6a6d6c, st: 0xb89b2e };
export const CELL: Palette = { fl: 0x4e5052, wl: 0x666a6e, st: 0xa8521e };
export const ROCK: Palette = { fl: 0x4a443c, wl: 0x5a5248, st: 0x5a5248 };
export const WHITE: Colour = [0.8, 0.85, 0.9];
export const DARK: Colour = [0, 0, 0];

export interface RoomOpts {
  y0?: number;
  ht?: number;
  pal?: Palette;
  /** a light that is always on, whatever the power; DARK for none. Shorthand for lit 'always' (or 'none') with lc. */
  light?: Colour;
  /** or light it by the rules (see LitRule) */
  lit?: LitRule;
  lc?: Colour;
  em?: boolean;
  /** emergency lights on their own cells (RoomDef.batt) */
  batt?: Batt;
  circuit?: string;
  flick?: boolean;
  /** no ceiling fittings */
  nolamp?: boolean;
  /** what hangs in its air, if not dust */
  motes?: Motes;
  /** rock or walkway, not a fitted room: plain walls */
  plain?: boolean;
  /** what its floor, walls and ceiling are made of; concrete unless it says (a cave: rock) */
  mat?: Partial<RoomMats>;
  /** the roof painted as sky */
  sky?: number | Colour;
  doorway?: boolean;
  /** a strip of a room reaching into a partition, or a partition's doorway or pane: too narrow for the nav graph to
   *  stand a spot in, and one place with the room beside it */
  part?: boolean;
  safe?: boolean;
  noroam?: boolean;
  armed?: boolean;
  zone?: string;
}

/** a wall's: how thick (THIN unless it says), from where up to where (from the floor of the rooms either side to over
 *  their ceilings, unless it says), and, if it is not to take the finish of the rooms in front of it, its own colour and
 *  what it is made of */
export interface WallOpts { t?: number; y0?: number; y1?: number; colour?: number | Colour; mat?: Mat }

/** how thick a wall is unless it says: block and its finish, with services in it */
export const THIN = 0.5;

/** a door's rules, beyond where it is (see DoorDef) */
export type DoorOpts = Partial<Omit<DoorDef, 'x0' | 'y0' | 'z0' | 'x1' | 'y1' | 'z1'>>;

export interface PropOpts {
  /** base height; defaults to the floor of the room at (x, z) */
  y?: number;
  ry?: number;
  rz?: number;
  glow?: number;
  /** force solid on or off; by default things of some size near the floor are solid */
  solid?: boolean;
  /** can be pushed and knocked about */
  loose?: boolean;
  pw?: [Colour, Colour];
  pc?: string;
  /** what it is made of (a loose one: wood unless it says) */
  mat?: Mat;
  /** part of a run of services under a bare ceiling */
  services?: boolean;
  /** drawn at its size (PropDef.flush) */
  flush?: boolean;
  /** dressing on a shelf: it makes room for anything put down where it stands (finish, settle) */
  goods?: boolean;
}

/** how what lies about comes to rest (LevelBuilder.settle): on anything up to `up` over or `down` under where it was
 *  put (further than that is a mistake, left for the tests to find); put down square to a shelf, a desk or a table, a
 *  turn of its own either way of up to `turn` of a half turn, and `edge` in from the edges of its top */
const SETTLE = { up: 0.03, down: 0.1, turn: 0.06, edge: 0.05 };

/** heights relative to a floor or ceiling, as a function of plan position */
export type Relief = (x: number, z: number) => number;

export class LevelBuilder {
  readonly rng: Rng;
  private def: LevelDef;
  private nolamp = new Set<number>();
  private goods = new Set<PropDef>();

  constructor(id: string, name: string, o: { seed?: string; circuit?: string; cards?: boolean } = {}) {
    this.def = {
      id, name, seed: o.seed ?? id, circuit: o.circuit ?? 'MAIN', ...(o.cards ? { cards: true } : {}),
      rooms: [], blocks: [], props: [], colliders: [], surfaces: [], water: [], doors: [], platforms: [],
      lamps: [], signs: [], items: [], notes: [], mutants: [], uses: [], marks: {},
      start: { x: 0, y: 0, z: 0, yaw: 0 },
    };
    this.rng = new Rng(this.def.seed);
  }

  /** an open volume, corners (x0, z0) and (x1, z1). Rooms that touch or overlap are one space where they meet. */
  room(name: string, x0: number, z0: number, x1: number, z1: number, o: RoomOpts = {}): RoomDef {
    const p = o.pal ?? OPS;
    const fixed = o.light !== undefined, dark = fixed && o.light![0] + o.light![1] + o.light![2] === 0;
    const r: RoomDef = {
      id: this.def.rooms.length, name, plain: !!o.plain,
      x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1),
      y0: o.y0 ?? 0, ht: o.ht ?? 3.2,
      floor: hex(p.fl), wall: hex(p.wl), stripe: hex(p.st), mat: { ...FITTED, ...o.mat },
      lit: o.lit ?? (fixed ? (dark ? 'none' : 'always') : 'always'),
      lc: o.lc ?? (fixed ? o.light! : WHITE),
      em: !!o.em, ...(o.batt ? { batt: o.batt } : {}), circuit: o.circuit ?? this.def.circuit, flick: !!o.flick, doorway: !!o.doorway, ...(o.part ? { part: true } : {}), safe: !!o.safe, noroam: !!o.noroam, armed: !!o.armed, ...(o.zone ? { zone: o.zone } : {}),
      ...(o.sky !== undefined ? { sky: hex(o.sky) } : {}), ...(o.motes && o.motes !== 'dust' ? { motes: o.motes } : {}),
    };
    this.def.rooms.push(r);
    if (o.nolamp) this.nolamp.add(r.id);
    return r;
  }

  /** a room of any outline: its corners on the plan, in order. Its sides at an angle are walled (WallOpts.t thick, at
   *  least WALL_MIN, standing on the side's line) unless `walls` is false, but for the sides `open` lists (side k runs
   *  from corner k to the next); a wall at a corner where the room turns outward runs on past it by half its thickness,
   *  so the corner is closed. Where two outlines share a side at an angle, it is walled once; to make a way through it,
   *  leave it open on both and put up its wall with a gap in it (wall(), twice) */
  outline(name: string, pts: [number, number][], o: RoomOpts & { walls?: boolean | WallOpts; open?: number[] } = {}): RoomDef {
    const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
    const r = this.room(name, Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), o);
    r.poly = pts.map(p => [p[0], p[1]]);
    if (o.walls === false) return r;
    const wo = typeof o.walls === 'object' ? o.walls : {}, t = Math.max(wo.t ?? THIN, WALL_MIN), n = pts.length;
    let area = 0;
    for (let i = 0; i < n; i++) area += pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1];
    /* does the outline turn outward at corner i (a corner of the room, not of what is outside it)? */
    const outward = (i: number) => {
      const [ax, az] = pts[(i + n - 1) % n], [bx, bz] = pts[i], [cx, cz] = pts[(i + 1) % n];
      return ((bx - ax) * (cz - bz) - (bz - az) * (cx - bx)) * area > 0;
    };
    for (let i = 0; i < n; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % n], len = Math.hypot(bx - ax, bz - az);
      if (len < 1e-9 || Math.abs(ax - bx) < 1e-9 || Math.abs(az - bz) < 1e-9 || o.open?.includes(i)) continue;
      const ux = (bx - ax) / len, uz = (bz - az) / len, ea = outward(i) ? t / 2 : 0, eb = outward((i + 1) % n) ? t / 2 : 0;
      this.wall(ax - ux * ea, az - uz * ea, bx + ux * eb, bz + uz * eb, { ...wo, t });
    }
    return r;
  }

  /** a wall at any angle, standing on the line from (ax, az) to (bx, bz) (WallDef). Unless it says, it runs from just
   *  under the lowest floor of the rooms either side of it to just over the highest of their ceilings, buried a little
   *  in each, so it meets them with no seam */
  wall(ax: number, az: number, bx: number, bz: number, o: WallOpts = {}): WallDef {
    const t = o.t ?? THIN, len = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / len, nz = (bx - ax) / len;
    let lo = Infinity, hi = -Infinity;
    for (const f of [0.1, 0.5, 0.9])
      for (const s of [-1, 1]) {
        const x = ax + (bx - ax) * f + nx * s * (t / 2 + 0.1), z = az + (bz - az) * f + nz * s * (t / 2 + 0.1);
        for (const r of this.def.rooms) if (!r.doorway && roomHas(r, x, z)) { lo = Math.min(lo, r.y0); hi = Math.max(hi, lid(r.y0 + r.ht)); }
      }
    const y0 = o.y0 ?? lo - GRID / 2, y1 = o.y1 ?? hi + GRID / 2;
    if (!Number.isFinite(y0) || !Number.isFinite(y1)) throw new Error(`wall (${ax}, ${az})-(${bx}, ${bz}): no room beside it to stand it in; say y0 and y1`);
    const W: WallDef = { ax, az, bx, bz, t, y0, y1, ...(o.colour !== undefined ? { colour: hex(o.colour) } : {}), ...(o.mat ? { mat: o.mat } : {}) };
    (this.def.walls ??= []).push(W);
    return W;
  }

  /** solid from (x0, y0, z0) to (x1, y1, z1): a platform, a step; or a floor slab (BlockDef.slab) */
  block(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: number | Colour, mat: Mat = 'concrete', slab = false): void {
    this.def.blocks.push({
      x0: Math.min(x0, x1), y0: Math.min(y0, y1), z0: Math.min(z0, z1),
      x1: Math.max(x0, x1), y1: Math.max(y0, y1), z1: Math.max(z0, z1), colour: hex(c), mat, ...(slab ? { slab } : {}),
    });
  }

  /** a straight flight of steps, from (x0, z0) to (x1, z1) along one axis, rising from y0 to y1 in `n` steps toward `dir` */
  steps(x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, n: number, dir: 'n' | 's' | 'e' | 'w', c: number): void {
    const ax = dir === 'e' || dir === 'w', rev = dir === 'w' || dir === 'n';
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n, top = y0 + (y1 - y0) * (k + 1) / n;
      const a = rev ? 1 - t1 : t0, b = rev ? 1 - t0 : t1;
      if (ax) this.block(x0 + (x1 - x0) * a, y0, z0, x0 + (x1 - x0) * b, top, z1, k % 2 ? c : shade(c, 0.94));
      else this.block(x0, y0, z0 + (z1 - z0) * a, x1, top, z0 + (z1 - z0) * b, k % 2 ? c : shade(c, 0.94));
    }
  }

  prop(shape: Shape, x: number, z: number, sx: number, sy: number, sz: number, c: number | Colour, o: PropOpts = {}): PropDef {
    const floor = this.floorAt(x, z), y = o.y ?? floor;
    const solid = o.solid ?? (shape !== 'ico' && sy >= 0.3 && y - floor < 1.6);
    const p: PropDef = { shape, x, y, z, sx, sy, sz, ry: o.ry ?? 0, rz: o.rz ?? 0, colour: hex(c), glow: o.glow ?? 1, solid: solid || !!o.loose, loose: !!o.loose };
    const mat = o.mat ?? (o.loose ? 'wood' : undefined);
    if (mat) p.mat = mat;
    if (o.services) p.services = true;
    if (o.flush) p.flush = true;
    if (o.pw) { p.pw = o.pw; p.pc = o.pc ?? this.def.circuit; }
    this.def.props.push(p);
    if (o.goods) this.goods.add(p);
    return p;
  }
  box(x: number, z: number, sx: number, sy: number, sz: number, c: number | Colour, o?: PropOpts): PropDef {
    return this.prop('box', x, z, sx, sy, sz, c, o);
  }

  /** a ramp over (x0, z0)-(x1, z1), rising from y0 to y1 toward `dir`: a smooth floor you walk up */
  ramp(x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, dir: 'n' | 's' | 'e' | 'w', c: number): void {
    const ax = dir === 'e' || dir === 'w', rev = dir === 'w' || dir === 'n';
    this.surface('floor', x0, z0, x1, z1, (x, z) => {
      const t = ax ? (x - x0) / (x1 - x0) : (z - z0) / (z1 - z0);
      return y0 + (y1 - y0) * (rev ? 1 - t : t);
    }, Math.min(y0, y1), c, true, 0.5, 'concrete');
  }

  /** a cave: a room in rock whose floor and ceiling follow `floor` and `ceil` (metres above y0, and above y0 + ht).
   *  The rock is carved from the lowest floor to the highest ceiling; the surfaces do the rest. */
  cave(name: string, x0: number, z0: number, x1: number, z1: number, o: RoomOpts & { floor?: Relief; ceil?: Relief; res?: number } = {}): RoomDef {
    const y0 = o.y0 ?? 0, ht = o.ht ?? 4, fl = o.floor ?? (() => 0), cl = o.ceil ?? (() => 0), res = o.res ?? 0.5;
    let lo = Infinity, hi = -Infinity;
    for (let z = z0; z <= z1 + 1e-9; z += res) for (let x = x0; x <= x1 + 1e-9; x += res) { lo = Math.min(lo, fl(x, z)); hi = Math.max(hi, cl(x, z)); }
    const snap = (v: number, up: boolean) => (up ? Math.ceil(v / 0.25) : Math.floor(v / 0.25)) * 0.25;
    const bottom = snap(y0 + lo, false), top = snap(y0 + ht + hi, true), p = o.pal ?? ROCK;
    const r = this.room(name, x0, z0, x1, z1, { ...o, pal: p, y0: bottom, ht: top - bottom, plain: true, nolamp: o.nolamp ?? true, mat: { ...CAVERN, ...o.mat } });
    this.surface('floor', x0, z0, x1, z1, (x, z) => y0 + fl(x, z), bottom - 0.25, p.fl, false, res, r.mat.floor);
    this.surface('ceiling', x0, z0, x1, z1, (x, z) => y0 + ht + cl(x, z), top + 0.25, scale3(hex(p.wl), 0.6), false, res, r.mat.ceiling);
    return r;
  }

  surface(kind: 'floor' | 'ceiling', x0: number, z0: number, x1: number, z1: number, f: Relief, base: number, c: number | Colour, sides: boolean, res: number, mat: Mat): void {
    const nx = Math.max(2, Math.round((x1 - x0) / res) + 1), nz = Math.max(2, Math.round((z1 - z0) / res) + 1), h: number[] = [];
    res = Math.max((x1 - x0) / (nx - 1), (z1 - z0) / (nz - 1));
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) h.push(f(x0 + i * res, z0 + j * res));
    const s: SurfaceDef = { kind, x0, z0, x1, z1, res, nx, nz, h, base, colour: hex(c), mat, sides };
    this.def.surfaces.push(s);
  }

  /** a surface given as its lattice of heights, nx by nz corners `res` apart from (x0, z0); masked to some squares if `mask` */
  lattice(kind: 'floor' | 'ceiling', x0: number, z0: number, x1: number, z1: number, res: number, nx: number, nz: number, h: number[], base: number, c: number | Colour, mat: Mat, mask?: number[]): void {
    this.def.surfaces.push({ kind, x0, z0, x1, z1, res, nx, nz, h, base, colour: hex(c), mat, sides: false, ...(mask ? { mask } : {}) });
  }

  /** standing water over a rectangle, its surface at `level` */
  water(x0: number, z0: number, x1: number, z1: number, level: number): void {
    this.def.water.push({ x0, z0, x1, z1, level });
  }

  /** a door filling (x0, z0)-(x1, z1) from the floor up `h` metres */
  door(x0: number, z0: number, x1: number, z1: number, h = 2.4, o: DoorOpts = {}): DoorDef {
    const y0 = this.floorAt((x0 + x1) / 2, (z0 + z1) / 2);
    const d: DoorDef = {
      x0, y0, z0, x1, y1: y0 + h, z1, kind: 'light', alongX: x1 - x0 > z1 - z0, open: false, stuck: false, seal: false, vent: false, lift: false,
      circuit: this.def.circuit, mat: o.glass ? 'glass' : 'steel', ...o,
    };
    this.def.doors.push(d);
    return d;
  }

  /** a fixed ladder climbed standing in (x0, z0)-(x1, z1), from the floor at y0 to the floor at y1 */
  climb(x0: number, z0: number, x1: number, z1: number, y0: number, y1: number): void {
    (this.def.climbs ??= []).push({ x0, z0, x1, z1, y0, y1 });
  }
  /** a platform over (x0, z0)-(x1, z1) that carries what stands on it between heights y0 and y1 */
  platform(x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, c = 0xb89b2e, call?: { name: string; circuit: string }, mat: Mat = 'steel', look?: PlatformDef['look']): void {
    this.def.platforms.push({ x0, z0, x1, z1, y0, y1, colour: hex(c), mat, ...(call ? { call } : {}), ...(look ? { look } : {}) });
  }

  /** an invisible box that bodies cannot enter, base at y (default: the floor) */
  collider(x: number, z: number, sx: number, sy: number, sz: number, y?: number): void {
    const b = y ?? this.floorAt(x, z);
    this.def.colliders.push({ x0: x - sx / 2, y0: b, z0: z - sz / 2, x1: x + sx / 2, y1: b + sy, z1: z + sz / 2 });
  }

  /** a camera (sim/eyes.ts): its lens at (x, y, z), looking along yaw */
  camera(x: number, y: number, z: number, yaw: number, o: { fov: number; range: number; circuit: string; zone: string; name?: string }): void {
    (this.def.cameras ??= []).push({ x, y, z, yaw, ...o });
  }
  /** a zone's speaker: (x, y, z) the floor under it */
  speaker(zone: string, x: number, y: number, z: number, o: { pa?: string } = {}): void {
    (this.def.speakers ??= []).push({ zone, x, y, z, ...o });
  }
  lamp(x: number, y: number, z: number, r: number, c: Colour): void {
    this.def.lamps.push({ x, y, z, r, colour: c });
  }
  sign(text: string, x: number, y: number, z: number, yaw: number, circuit = this.def.circuit): void {
    this.def.signs.push({ text, x, y, z, yaw, circuit });
  }
  exhibit(key: string, x: number, y: number, z: number, yaw: number, w: number, h: number): void {
    (this.def.exhibits ??= []).push({ key, x, y, z, yaw, w, h });
  }
  item(id: string, x: number, y: number, z: number, n = 1, on?: Aim): void { this.def.items.push({ id, x, y, z, n, ...(on ? { on } : {}) }); }
  note(key: string, x: number, y: number, z: number, bare = false): void { this.def.notes.push({ key, x, y, z, ...(bare ? { bare } : {}) }); }
  mutant(type: string, x: number, y: number, z: number, opts: Record<string, unknown> = {}): void { this.def.mutants.push({ type, x, y, z, opts }); }
  use(kind: string, x: number, y: number, z: number, opts: Record<string, unknown> = {}): void { this.def.uses.push({ kind, x, y, z, opts }); }
  mark(name: string, x: number, y: number, z: number, yaw: number): void { this.def.marks[name] = { x, y, z, yaw }; }
  /** a ceiling fitting its room's light shines down from */
  fixture(x: number, y: number, z: number): void { (this.def.fixtures ??= []).push({ x, y, z }); }
  /** an air grille in a ceiling */
  vent(x: number, y: number, z: number): void { (this.def.vents ??= []).push({ x, y, z }); }
  /** blood on the floor that can be walked out of */
  stain(x: number, y: number, z: number, r: number): void { (this.def.stains ??= []).push({ x, y, z, r }); }

  /** the level as built so far (for adapters that need to look back at it) */
  get level(): Readonly<LevelDef> {
    return this.def;
  }

  /** where the game begins: on the floor at y, or, with none given, the highest floor there */
  start(x: number, z: number, yaw: number, y = this.floorAt(x, z)): void {
    this.def.start = { x, y, z, yaw } satisfies Start;
  }

  /** the floor under (x, z): the highest room floor, block top or sloped floor there */
  floorAt(x: number, z: number): number {
    let y = -Infinity;
    for (const r of this.def.rooms) if (roomHas(r, x, z)) y = Math.max(y, r.y0);
    for (const b of this.def.blocks) if (x >= b.x0 && x < b.x1 && z >= b.z0 && z < b.z1 && b.y1 > y && b.y0 <= y + 0.01) y = b.y1;
    for (const s of this.def.surfaces) {
      if (s.kind !== 'floor') continue;
      const h = surfaceAt(s, x, z);
      if (h !== null) y = Math.max(y, h);
    }
    return y === -Infinity ? 0 : y;
  }

  finish(): LevelDef {
    /* ceiling fittings: a strip light every 6 m, lit if the room is, on its ceiling as the world carves it (in a room
       of any outline, those that fall in it, or one in its middle if none does) */
    for (const r of this.def.rooms) {
      if (this.nolamp.has(r.id)) continue;
      const dead = r.lit === 'none', w = r.x1 - r.x0, d = r.z1 - r.z0, at: [number, number][] = [];
      for (let z = r.z0 + Math.min(3, d / 2); z < r.z1; z += 6)
        for (let x = r.x0 + Math.min(3, w / 2); x < r.x1; x += 6) if (roomHas(r, x, z)) at.push([x, z]);
      if (!at.length && r.poly) {
        const cx = r.poly.reduce((a, p) => a + p[0], 0) / r.poly.length, cz = r.poly.reduce((a, p) => a + p[1], 0) / r.poly.length;
        if (roomHas(r, cx, cz)) at.push([cx, cz]);
      }
      for (const [x, z] of at) this.box(x, z, 1.1, 0.06, 0.3, dead ? 0x2a2c2e : 0xe8eef2, { y: lid(r.y0 + r.ht) - 0.07, glow: dead ? 1 : 3, solid: false });
    }
    /* a wall put twice (on a side two outlines share) is one wall */
    if (this.def.walls) {
      const key = (W: WallDef) => [W.ax, W.az, W.bx, W.bz].map(v => v.toFixed(4)).join(','), seen = new Set<string>();
      this.def.walls = this.def.walls.filter(W => {
        const k = key(W), back = key({ ...W, ax: W.bx, az: W.bz, bx: W.ax, bz: W.az });
        if (seen.has(k) || seen.has(back)) return false;
        seen.add(k);
        return true;
      });
    }
    /* what lies about comes to rest on what is under it, and a shelf's dressing makes room for it */
    for (const it of this.def.items) this.settle(it, it.id);
    for (const n of this.def.notes) if (!n.bare) this.settle(n, 'note');
    this.clear();
    return this.def;
  }

  /** something lying about (a thing to pick up, a paper) comes to rest on what is under it (SETTLE): the floor of the
   *  room it is in, a step, a sloped floor, or the top of anything square-topped there. Put on something (a shelf, a
   *  desk), it is put down square to it, a little turned, and kept in from its edges */
  private settle(t: { x: number; y: number; z: number; yaw?: number; on?: Aim }, id: string): void {
    const x = t.x, z = t.z, top = t.y + SETTLE.up;
    let y = -Infinity, on: PropDef | null = null;
    const over = (h: number) => h <= top && h > y;
    for (const r of this.def.rooms) if (!r.doorway && roomHas(r, x, z) && r.y0 + r.ht > t.y && over(r.y0)) { y = r.y0; on = null; }
    for (const b of this.def.blocks) if (x >= b.x0 && x < b.x1 && z >= b.z0 && z < b.z1 && over(b.y1)) { y = b.y1; on = null; }
    for (const s of this.def.surfaces) {
      const h = s.kind === 'floor' && !s.hidden ? surfaceAt(s, x, z) : null;
      if (h !== null && over(h)) { y = h; on = null; }
    }
    /* a lump, or anything tipped, is no shelf */
    for (const p of this.def.props) if (p.shape !== 'ico' && !p.services && Math.abs(Math.sin(p.rz)) < 0.05 && under(p, x, z) && over(p.y + p.sy)) { y = p.y + p.sy; on = p; }
    if (y < t.y - SETTLE.down) return;
    t.y = y;
    if (!on || t.on) return;
    t.yaw = on.ry + (on.sx >= on.sz ? 0 : Math.PI / 2) + lie(x, z) * SETTLE.turn;
    if (on.shape !== 'box') return;
    /* kept on it: how far it reaches each way along its top, and moved in to leave the edge clear (or, too big for
       that, put in its middle) */
    const c = Math.cos(on.ry), s = Math.sin(on.ry);
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const [px, , pz] of lyingCorners(id, x, y, z, t.yaw)) {
      const dx = px - on.x, dz = pz - on.z, u = dx * c - dz * s, v = dx * s + dz * c;
      u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
    }
    const keep = (a0: number, a1: number, h: number) => { const e = h - SETTLE.edge; return a1 - a0 > 2 * e ? -(a0 + a1) / 2 : a0 < -e ? -e - a0 : a1 > e ? e - a1 : 0; };
    const du = keep(u0, u1, on.sx / 2), dv = keep(v0, v1, on.sz / 2);
    t.x += du * c + dv * s; t.z += -du * s + dv * c;
  }

  /** a shelf's dressing makes room for whatever was put down where it stood */
  private clear(): void {
    if (!this.goods.size) return;
    const room = [...this.def.items.map(it => lyingCorners(it.id, it.x, it.y, it.z, lyingYaw(it))), ...this.def.notes.filter(n => !n.bare).map(n => lyingCorners('note', n.x, n.y, n.z, paperYaw(n)))].map(span);
    const E = 0.002;
    this.def.props = this.def.props.filter(p => {
      if (!this.goods.has(p)) return true;
      const g = span(propCorners(p));
      return !room.some(r => r[0] < g[3] - E && r[3] > g[0] + E && r[1] < g[4] - E && r[4] > g[1] + E && r[2] < g[5] - E && r[5] > g[2] + E);
    });
  }
}

function shade(c: number, k: number): Colour {
  return scale3(hex(c), k);
}

/** the world's grid (world/grid.ts, CELL): rooms are carved to it, so a room's ceiling as built is its top rounded to
 *  it (a 3.2 m room's is at 3.25), and what hangs from a ceiling hangs from that */
export const GRID = 0.25;
export const lid = (y: number): number => Math.round(y / GRID) * GRID;

/** a sloped floor's height at (x, z), or null where it is not */
function surfaceAt(s: SurfaceDef, x: number, z: number): number | null {
  if (x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1) return null;
  const fx = Math.min((x - s.x0) / s.res, s.nx - 1 - 1e-9), fz = Math.min((z - s.z0) / s.res, s.nz - 1 - 1e-9);
  const i = Math.floor(fx), j = Math.floor(fz);
  if (s.mask && !s.mask[j * (s.nx - 1) + i]) return null;
  const u = fx - i, v = fz - j, h = s.h, n = s.nx;
  return h[j * n + i] * (1 - u) * (1 - v) + h[j * n + i + 1] * u * (1 - v) + h[(j + 1) * n + i] * (1 - u) * v + h[(j + 1) * n + i + 1] * u * v;
}

/** is (x, z) under a prop, turned as it stands: within its box, or a cylinder's round */
function under(p: PropDef, x: number, z: number): boolean {
  const dx = x - p.x, dz = z - p.z, c = Math.cos(p.ry), s = Math.sin(p.ry), u = dx * c - dz * s, v = dx * s + dz * c;
  return p.shape === 'box' ? Math.abs(u) <= p.sx / 2 && Math.abs(v) <= p.sz / 2 : (u / (p.sx / 2)) ** 2 + (v / (p.sz / 2)) ** 2 <= 1;
}

/** a prop's corners as drawn (present/render/levelMesh.ts, propVerts): tipped about z, turned about y, its base at y */
export function propCorners(p: Pick<PropDef, 'x' | 'y' | 'z' | 'sx' | 'sy' | 'sz' | 'ry' | 'rz'> & { shape?: Shape }): [number, number, number][] {
  const out: [number, number, number][] = [], cy = Math.cos(p.ry), sy = Math.sin(p.ry), cz = Math.cos(p.rz), sz = Math.sin(p.rz), k = p.shape === 'ico' ? ICO : 1, by = p.y + (p.sy / 2) * k;
  for (const a of [-0.5, 0.5]) for (const b of [-0.5, 0.5]) for (const c of [-0.5, 0.5]) {
    let X = a * p.sx * k, Y = b * p.sy * k, Z = c * p.sz * k;
    if (p.rz) { const x2 = X * cz - Y * sz; Y = X * sz + Y * cz; X = x2; }
    const x3 = X * cy + Z * sy; Z = -X * sy + Z * cy; X = x3;
    out.push([p.x + X, by + Y, p.z + Z]);
  }
  return out;
}

/** the box round some points: [x0, y0, z0, x1, y1, z1] */
function span(pts: [number, number, number][]): number[] {
  const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const p of pts) for (let a = 0; a < 3; a++) { b[a] = Math.min(b[a], p[a]); b[a + 3] = Math.max(b[a + 3], p[a]); }
  return b;
}
