import { PI, clamp, hex, inPoly, scale3, type Colour } from '../../core/math';
import type { Rng } from '../../core/rng';
import { CAVERN, FITTED, STREET, WALKWAY, DOORWAY, type Mat, type RoomMats } from '../materials';
import type { Aim, Batt, DoorLook, LadderDef, LitRule, Motes, Shape } from '../types';
import { LevelBuilder, lid, type Palette, type WallOpts } from './builder';

/* The station's way of laying out a level, in plan metres (x east, z south; y up from the surface).

   A level is one or more floors, each a walkable layer at its own height (a hall, and walkways over it). On a floor are
   rooms (boxes, or any outline), and doors in the walls between them; caves and their terrain; stairs and platforms to
   the floor above; and what stands about. Rock is everywhere nothing is laid out, so a wall is whatever is left
   between two rooms: draw two rooms half a metre apart and there is a partition between them, faced on each side with
   that room's own finish; draw them touching and they are one space. A wall at an angle is a wall of its own (wall()).

   Nothing is built until finishLevel(), which compiles every floor into the world's shapes: rooms carved in the grid,
   floor slabs under every upper floor, walkways with rails at their open edges, doors with doorways, platforms, cave
   surfaces from the terrain fields, ceiling fittings, and the props. A door is placed by the middle of its opening; which
   way it faces, how deep its doorway is, what it looks like, and which end it slides into are found from the rooms
   either side of it and the wall beside it. Where layout is asked about (what is beside a door, under a walkway's edge,
   under a slab), it is asked of each floor painted on the world's quarter-metre grid, the later of two things laid out
   in one place being what is there. */

/** a colour as the first engine wrote it: a hex number, or channels (above 1.5 means emissive) */
export type Col = number | Colour;

export interface RoomOpts {
  ht?: number;
  fl?: number; wl?: number; st?: number;
  lit?: LitRule; lc?: Colour; em?: number | boolean; c?: string; flick?: number | boolean;
  /** emergency lights on their own cells (RoomDef.batt) */
  batt?: Batt;
  /** a walkway or rung over open air: a slab with rails at its open edges */
  open?: number | boolean;
  /** rock: floor, walls and ceiling follow the terrain fields */
  cave?: number | boolean;
  /** only the air over lower rooms: no floor where a room lies below */
  air?: number | boolean;
  /** what hangs in its air, if not dust */
  motes?: Motes;
  sky?: number;
  /** what its floor, walls and ceiling are made of, where not the usual: rock for a cave, grating for a walkway, paving
   *  under a sky, concrete for the rest */
  mat?: Partial<RoomMats>;
  /** its floor this far over the floor's (under it, if negative): a sunken court. Its ceiling rides on its floor */
  dy?: number;
  nolamp?: number | boolean; noroam?: number | boolean; safe?: number | boolean;
  /** more of a room drawn already (the same name and options): a strip of it reaching up to a partition's face where the
   *  rest of that side of it does not. No fittings, grilles or services of its own: the room's own are where they were */
  part?: number | boolean;
  /** armed by the lockdown (RoomDef.armed): hazard paint inside each door into it, and its signs read ALARMED AREA */
  armed?: number | boolean;
  /** the alarm zone it is in (RoomDef.zone) */
  zone?: string;
  /** an outline's walls (LevelBuilder.outline): false for none, or how they are; and the sides left open */
  walls?: boolean | WallOpts;
  openSides?: number[];
}

export interface PRoom {
  id: number; name: string;
  /** its box on the plan; an outline's (poly) bounds it */
  x0: number; z0: number; x1: number; z1: number;
  poly?: [number, number][];
  ht: number; dy: number; fl: number; wl: number; st: number;
  lit: LitRule; lc: Colour; em: boolean; batt?: Batt; c: string; flick: boolean;
  open: boolean; hole: 'st' | 'el' | null; cave: boolean; air: boolean; sky?: number; motes?: Motes; mat: RoomMats;
  nolamp: boolean; noroam: boolean; safe: boolean; armed: boolean; zone?: string; part: boolean;
  walls?: boolean | WallOpts; openSides?: number[];
  /** a cave of any outline (caveShape): the terrain's cells marked with its id are its own, and its box bounds them */
  shaped?: boolean;
  /** a stair's opening: the side of it the floor it climbs to is on */
  landing?: Dir;
}

export type Dir = 'n' | 's' | 'e' | 'w';

export interface DoorOpts {
  kind?: 'light' | 'heavy'; open?: boolean; card?: string; code?: number; stuck?: boolean; seal?: boolean; vent?: boolean; lift?: boolean; glass?: boolean;
  /** fail-safe: its lock lets go when its power dies (DoorDef.failsafe) */
  failsafe?: boolean;
  /** heard this far when it is opened by hand, drawing those at rest to it (DoorDef.loud) */
  loud?: number;
  /** a window's height in a partition (GLAZE): to the floor, at a desk's height, or a strip high up */
  glaze?: Glaze;
  c?: string; msg?: string;
  /** signs over it: [text, which side of the doorway it is read from] */
  sg?: [string, Dir][];
  /** how wide its opening is (m), if not as wide as a door of its look is (NARROW for a single door, 2 m for the rest) */
  w?: number;
  /** a plain service door where its sides would make it another: painted steel into a plant room off a grand hall */
  plain?: boolean;
  /** the stretch of wall it stands in, this long about its place: a single door is hung against the end of it that has
   *  wall beyond to slide into (the far end, if both have); a wider one fills the middle of it */
  span?: number;
}

export interface PDoor { x: number; z: number; o: DoorOpts }

interface PProp {
  shape: Shape; x: number; z: number; y: number; sx: number; sy: number; sz: number; c: Colour;
  ry: number; rz: number; glow: number; pw: [Colour, Colour] | null; pc: string | null; solid: boolean; loose: boolean; mat?: Mat; flush?: boolean;
  /** dressing on a shelf (POpts.goods) */
  goods?: boolean;
  /** flat on uneven ground (POpts.lie) */
  lie?: boolean;
}

/** a level as it is described, before it is compiled */
export interface LevelInfo { id: string; name: string; c: string; cards?: boolean }

/** the lattice a floor's terrain is given on: corners `res` apart from (x0, z0), nx by nz of them */
export interface Terrain { x0: number; z0: number; res: number; nx: number; nz: number }

type Claim = { room: PRoom; door?: undefined } | { door: PDoor; room?: undefined };

export interface Floor {
  lv: LevelInfo; name: string; c: string; y0: number; li: number;
  /** a ground floor over a basement: its floor is the rock, and a slab is laid only where something lies below */
  ground: boolean;
  /** wading water over every room (its depth), or every room flooded to the roof */
  wet: number; deep: number;
  rooms: PRoom[]; doors: PDoor[];
  /** rooms and doors in the order they were laid out: where two are in one place, the later is what is there */
  claims: Claim[];
  above: Floor | null; below: Floor | null;
  terrain: Terrain | null;
  hf: Float32Array | null; cf: Float32Array | null; hset: Uint8Array | null;
  /** the terrain's cells a cave of any outline has (its room's id), -1 for none */
  owner: Int16Array | null;
  props: PProp[];
  cols: [number, number, number, number, number, number][];
  lamps: { x: number; z: number; r: number; c: Colour; h?: number }[];
  /** cameras (their lens h metres up, yaw as the cast's) and the zones' speakers */
  cams: { x: number; z: number; h: number; yaw: number; fov: number; range: number; c: string; zone: string; name?: string }[];
  speakers: { zone: string; x: number; z: number; pa?: string }[];
  /** blood on the floor: middle and reach */
  stains: { x: number; z: number; r: number }[];
  elevs: { x0: number; z0: number; x1: number; z1: number; lo: Floor; hi: Floor; c: string; name: string }[];
  stairs: { x0: number; z0: number; x1: number; z1: number; dir: Dir; lo: Floor; hi: Floor; bare: boolean }[];
  /** steps within a floor: from a sunken floor up to the floor's own, or between any two heights over it */
  flights: { x0: number; z0: number; x1: number; z1: number; y0: number; y1: number; n: number; dir: Dir; c: number }[];
  items: { id: string; x: number; z: number; y: number; n: number; on?: Aim }[];
  notes: { key: string; x: number; z: number; y: number; bare?: boolean }[];
  /** the family's exhibit: boards on the walls, their middles y over the floor, facing yaw */
  exhibits: { key: string; x: number; z: number; y: number; yaw: number; w: number; h: number }[];
  muts: { type: string; x: number; z: number; o: Record<string, unknown> }[];
  uses: { kind: string; x: number; z: number; y: number; o: Record<string, unknown> }[];
  marks: Record<string, [number, number, number]>;
  /** walls at an angle, put up when the level is compiled */
  walls: [number, number, number, number, WallOpts][];
  /** standing water of its own (a pool): x0, z0 to x1, z1, its surface in metres over the floor */
  water: [number, number, number, number, number][];
}

/* ---- the level being built: floors share a builder, a seeded rng, and the station's ladderways */
let cur: { b: LevelBuilder; rng: Rng; ladders: Record<string, LadderDef>; floors: Floor[] } | null = null;

/** start a level: every floor made until finishLevel() belongs to it */
export function beginLevel(lv: LevelInfo, ladders: Record<string, LadderDef>): void {
  const b = new LevelBuilder(lv.id, lv.name, { circuit: lv.c, cards: lv.cards });
  cur = { b, rng: b.rng, ladders, floors: [] };
}
const C = () => {
  if (!cur) throw new Error('plan: no level begun');
  return cur;
};
export const rnd = (a: number, b?: number): number => C().rng.range(a, b);
export const pick = <X>(a: readonly X[]): X => C().rng.pick(a);
export const mul3 = (c: Colour, k: number): Colour => scale3(c, k);
const col = (c: Col): Colour => hex(c);

/** a floor of the level: its height (y0), its place in the stack (li), and, for one with caves, the lattice its terrain
 *  is given on (terrain: the corners x0, z0 to x1, z1, `res` apart; 2 m unless it says) */
export function floor(lv: LevelInfo, o: { y0?: number; li?: number; wet?: number; deep?: number; ground?: boolean; terrain?: [number, number, number, number]; res?: number } = {}): Floor {
  const t = o.terrain, res = o.res ?? 2;
  const F: Floor = {
    lv, name: lv.name, c: lv.c, y0: o.y0 ?? 0, li: o.li ?? 0, wet: o.wet ?? 0, deep: o.deep ?? 0, ground: !!o.ground,
    rooms: [], doors: [], claims: [], above: null, below: null,
    terrain: t ? { x0: t[0], z0: t[1], res, nx: Math.round((t[2] - t[0]) / res) + 1, nz: Math.round((t[3] - t[1]) / res) + 1 } : null,
    hf: null, cf: null, hset: null, owner: null,
    props: [], cols: [], lamps: [], cams: [], speakers: [], stains: [], elevs: [], stairs: [], flights: [], items: [], notes: [], exhibits: [], muts: [], uses: [], marks: {}, walls: [], water: [],
  };
  C().floors.push(F);
  return F;
}
export function stack(lo: Floor, hi: Floor): void {
  lo.above = hi; hi.below = lo;
}

/* ---- what is where on a floor, as it is laid out so far */
const has = (R: PRoom, x: number, z: number): boolean => (R.poly ? inPoly(R.poly, x, z) : x >= R.x0 && x < R.x1 && z >= R.z0 && z < R.z1);
/** the terrain cell at (x, z), or -1 off the lattice */
function cellAt(F: Floor, x: number, z: number): number {
  const T = F.terrain;
  if (!T) return -1;
  const i = Math.floor((x - T.x0) / T.res), j = Math.floor((z - T.z0) / T.res);
  return i < 0 || j < 0 || i >= T.nx - 1 || j >= T.nz - 1 ? -1 : j * (T.nx - 1) + i;
}
/** is (x, z) in the room, on its floor? (a cave of any outline: in one of its cells) */
export function holds(F: Floor, R: PRoom, x: number, z: number): boolean {
  if (R.shaped) { const k = cellAt(F, x, z); return k >= 0 && !!F.owner && F.owner[k] === R.id; }
  return has(R, x, z);
}
/** the room at (x, z) on the floor as laid out so far: the latest there, or null (rock, or a door's place). A door is
 *  taken here as its middle's cell of the terrain (or a metre round its middle) */
export function roomAt(F: Floor, x: number, z: number): PRoom | null {
  for (let k = F.claims.length - 1; k >= 0; k--) {
    const c = F.claims[k];
    if (c.room) { if (holds(F, c.room, x, z)) return c.room; }
    else if (doorNear(F, c.door, x, z)) return null;
  }
  return null;
}
function doorNear(F: Floor, d: PDoor, x: number, z: number): boolean {
  const k = cellAt(F, x, z);
  if (k >= 0) return k === cellAt(F, d.x, d.z);
  return Math.abs(x - d.x) < 1 && Math.abs(z - d.z) < 1;
}

/* ---- rooms and doors */
export const WHITE: Colour = [0.8, 0.85, 0.9];
function makeRoom(F: Floor, name: string, x0: number, z0: number, x1: number, z1: number, o: RoomOpts): PRoom {
  const r: PRoom = {
    id: F.rooms.length, name, x0, z0, x1, z1, ht: o.ht ?? 3.2, dy: o.dy ?? 0, fl: o.fl ?? 0x6b6e6a, wl: o.wl ?? 0x7c7f7a, st: o.st ?? 0x555555,
    lit: o.lit ?? 'main', lc: o.lc ?? WHITE, em: !!o.em, ...(o.batt ? { batt: o.batt } : {}), c: o.c ?? F.c, flick: !!o.flick,
    open: !!o.open, hole: null, cave: !!o.cave, air: !!o.air, ...(o.sky !== undefined ? { sky: o.sky } : {}), ...(o.motes ? { motes: o.motes } : {}),
    mat: { ...(o.cave ? CAVERN : o.open ? WALKWAY : o.sky !== undefined ? STREET : FITTED), ...o.mat },
    nolamp: !!o.nolamp, noroam: !!o.noroam, safe: !!o.safe, armed: !!o.armed, ...(o.zone ? { zone: o.zone } : {}), part: !!o.part,
    ...(o.walls !== undefined ? { walls: o.walls } : {}), ...(o.openSides ? { openSides: o.openSides } : {}),
  };
  F.rooms.push(r);
  F.claims.push({ room: r });
  return r;
}
/** a room, its north-west corner at (x, z), w across (x) and d deep (z) */
export function room(F: Floor, name: string, x: number, z: number, w: number, d: number, o: RoomOpts = {}): PRoom {
  return makeRoom(F, name, x, z, x + w, z + d, o);
}
/** a room of any outline: its corners in order (LevelBuilder.outline: its sides at an angle walled, unless o.walls is
 *  false; o.openSides left open) */
export function outline(F: Floor, name: string, pts: [number, number][], o: RoomOpts = {}): PRoom {
  const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
  const r = makeRoom(F, name, Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), o);
  r.poly = pts.map(p => [p[0], p[1]]);
  return r;
}
/** a wall at any angle, on the line from (ax, az) to (bx, bz) (LevelBuilder.wall), put up when the level is compiled */
export function wall(F: Floor, ax: number, az: number, bx: number, bz: number, o: WallOpts = {}): void {
  F.walls.push([ax, az, bx, bz, o]);
}

/** how thick a partition is (m): block and its finish, with services in it; and a window's sill and head in one over
 *  the floor: to the floor, at a desk's height, at a clinic's observation height, or a strip high up that only shares
 *  the light (a clerestory) */
export const THIN = 0.5;
/** a single door's opening (m): wide enough for anyone who uses doors */
export const NARROW = 1.2;
export type Glaze = 'full' | 'view' | 'obs' | 'high';
const GLAZE: Record<Glaze, [number, number]> = { full: [0, 2.4], view: [0.9, 2.2], obs: [1.2, 2.2], high: [2.2, 2.8] };

/** two doors only (world.md §4): light, and heavy. Either may carry a card reader or a keypad, or be jammed or sealed.
 *  (x, z) is the middle of its opening; the wall it is in is found from the rooms either side */
export function door(F: Floor, x: number, z: number, o: DoorOpts = {}): void {
  /* (one put where there is one already is that one, as it now says) */
  const was = F.doors.find(d => Math.abs(d.x - x) < 1e-6 && Math.abs(d.z - z) < 1e-6);
  if (was) { was.o = o; return; }
  const d: PDoor = { x, z, o };
  F.doors.push(d);
  F.claims.push({ door: d });
}

/* ---- props, in plan metres, sizes in metres */
export interface POpts {
  y?: number; ry?: number; rz?: number; glow?: number; pw?: [Col, Col]; pc?: string; c?: 0 | 1; loose?: boolean; mat?: Mat; flush?: boolean; goods?: boolean;
  /** flat on uneven ground (moss, a stream): tipped to the slope under it along its length, and laid low enough that no
   *  corner of it is in the air (ground) */
  lie?: boolean;
}
export function P(F: Floor, shape: Shape, x: number, z: number, sx: number, sy: number, sz: number, c: Col, o: POpts = {}): void {
  const y = o.y ?? 0, solid = o.c === 1 || (o.c !== 0 && sy >= 0.3 && y < 1.6 && shape !== 'ico');
  F.props.push({
    shape, x, z, y, sx, sy, sz, c: col(c), ry: o.ry ?? 0, rz: o.rz ?? 0, glow: o.glow ?? 0,
    pw: o.pw ? [col(o.pw[0]), col(o.pw[1])] : null, pc: o.pc ?? null, solid: solid || !!o.loose, loose: !!o.loose, ...(o.mat ? { mat: o.mat } : {}),
    ...(o.flush ? { flush: true } : {}), ...(o.goods ? { goods: true } : {}), ...(o.lie ? { lie: true } : {}),
  });
}
export const bx = (F: Floor, x: number, z: number, sx: number, sy: number, sz: number, c: Col, o?: POpts): void => P(F, 'box', x, z, sx, sy, sz, c, o);
/** an invisible solid under furniture drawn in parts: centre (x, z), w by d metres, up to h */
export function colT(F: Floor, x: number, z: number, w: number, d: number, h = 0.76): void {
  F.cols.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2, 0, h]);
}
export function lamp(F: Floor, x: number, z: number, r: number): void {
  P(F, 'cyl', x, z, 0.06, 1.5, 0.06, 0x2a2c2e, { c: 0 });
  bx(F, x, z, 0.34, 0.22, 0.12, [2.95, 2.9, 2.65], { y: 1.5, c: 0 });
  bx(F, x, z, 0.5, 0.05, 0.5, 0x2a2c2e, { c: 0 });
  F.lamps.push({ x, z, r, c: [0.78, 0.74, 0.6], h: 1.5 });
}
/** blood on the floor at (x, z), reaching r metres: walked through, it comes away on your soles */
export function stain(F: Floor, x: number, z: number, r: number): void { F.stains.push({ x, z, r }); }
export function item(F: Floor, id: string, x: number, z: number, y = 0, n = 1): Floor['items'][number] {
  const it = { id, x, z, y, n };
  F.items.push(it);
  return it;
}
/** a paper to read at (x, z), y over the floor; `bare`: no paper of its own, it is written on what is there (a whiteboard) */
export function note(F: Floor, key: string, x: number, z: number, y = 0, bare = false): void { F.notes.push({ key, x, z, y, ...(bare ? { bare } : {}) }); }
/** a board of the family's exhibit (content/exhibit.ts) on the wall whose face is at (x, z), facing `face`, its middle y
 *  over the floor, w by h: a bronze frame, the board drawn on it (present/render/exhibit.ts), and what is read off it
 *  (`reads`: each note's key and how far along the board from its middle, to the reader's right) */
export function exhibit(F: Floor, key: string, x: number, z: number, y: number, face: Dir, w: number, h: number, reads: [string, number][] = [[key, 0]]): void {
  /* the board stands off the wall as a sign does (3 cm), and its frame is four bars round its edge, a little prouder: nothing
     of the level lies just behind the board, where the level's depth, drawn first (render/post.ts), would win */
  const [nx, nz] = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[face], ns = nz !== 0, T = 0.045, B = 0.04;
  const bar = (along: number, up: number, len: number, tall: number) =>
    bx(F, x + nx * T / 2 + (ns ? along : 0), z + nz * T / 2 + (ns ? 0 : along), ns ? len : T, tall, ns ? T : len, 0x5e4424, { y: up, c: 0, mat: 'steel' });
  for (const s of [-1, 1]) { bar(0, s < 0 ? y - h / 2 - B : y + h / 2, w + 2 * B, B); bar(s * (w / 2 + B / 2), y - h / 2, B, h); }
  F.exhibits.push({ key, x: x + nx * 0.03, z: z + nz * 0.03, y, yaw: Math.atan2(nx, nz), w, h });
  /* the reader's right, facing the board: the board's own left to right */
  for (const [k, a] of reads) note(F, k, x + nx * 0.04 + nz * a, z + nz * 0.04 - nx * a, y, true);
}
export function mut(F: Floor, type: string, x: number, z: number, o: Record<string, unknown> = {}): void { F.muts.push({ type, x, z, o }); }
/** a place for one of the cast on its floor, as an option to mut(): a stop on a guard's round (types.ts, RoundStop),
 *  given as `round`; a spot to hide in; or where it stands, if on another floor than the one it is listed on (`at`) */
export interface TStop { F: Floor; x: number; z: number; wait?: number; tries?: number; look?: number; need?: string; once?: boolean; pace?: number; take?: boolean; graft?: boolean; about?: boolean; face?: number }
export function use(F: Floor, kind: string, x: number, z: number, y: number, o: Record<string, unknown> = {}): void { F.uses.push({ kind, x, z, y, o }); }
/** a named place: where you arrive (by a ladder, the lift, a dive), facing yaw */
export function mark(F: Floor, name: string, x: number, z: number, yaw: number): void { F.marks[name] = [x, z, yaw]; }

/* ---- terrain: values at the lattice's corners. hf lifts a floor, cf a cave's ceiling */
export function field(F: Floor, k: 'hf' | 'cf'): Float32Array {
  const T = F.terrain;
  if (!T) throw new Error(`plan: ${F.name} at ${F.y0} has no terrain`);
  return F[k] ?? (F[k] = new Float32Array(T.nx * T.nz));
}
/** a field's height at (x, z), blended from the lattice's corners; 0 where there is none */
export function fieldAt(F: Floor, h: Float32Array | null, x: number, z: number): number {
  const T = F.terrain;
  if (!h || !T) return 0;
  const fx = clamp((x - T.x0) / T.res, 0, T.nx - 1 - 1e-4), fz = clamp((z - T.z0) / T.res, 0, T.nz - 1 - 1e-4), i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
  return h[j * T.nx + i] * (1 - u) * (1 - v) + h[j * T.nx + i + 1] * u * (1 - v) + h[(j + 1) * T.nx + i] * (1 - u) * v + h[(j + 1) * T.nx + i + 1] * u * v;
}
/** floor height at (x, z) */
export const hfAt = (F: Floor, x: number, z: number): number => fieldAt(F, F.hf, x, z);
/** the lattice's corners over a room's box, as indices: i0..i1, j0..j1 (inclusive), pulled in by `e` corners */
function corners(F: Floor, R: PRoom, e = 0): [number, number, number, number] {
  const T = F.terrain!, ix = (x: number) => Math.round((x - T.x0) / T.res), jz = (z: number) => Math.round((z - T.z0) / T.res);
  return [ix(R.x0) + e, ix(R.x1) - e, jz(R.z0) + e, jz(R.z1) - e];
}
/** a corner's place on the plan */
const cornerAt = (F: Floor, i: number, j: number): [number, number] => [F.terrain!.x0 + i * F.terrain!.res, F.terrain!.z0 + j * F.terrain!.res];

/** a rise in a room's floor (or, h < 0, a hollow): round, `rad` across from (cx, cz), h at its middle. In a fitted room it
 *  keeps off the walls by a corner of the lattice */
export function hill(F: Floor, cx: number, cz: number, rad: number, h: number, R: PRoom): void {
  const f = field(F, 'hf'), nx = F.terrain!.nx, [i0, i1, j0, j1] = corners(F, R, R.cave ? 0 : 1);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const [x, z] = cornerAt(F, i, j), d = Math.hypot(x - cx, z - cz) / rad;
    if (d < 1) { const q = Math.cos((d * PI) / 2); f[j * nx + i] += h * q * q; }
  }
}
/** a rise in a cave's roof */
export function vault(F: Floor, cx: number, cz: number, rad: number, h: number, R: PRoom): void {
  const f = field(F, 'cf'), nx = F.terrain!.nx, [i0, i1, j0, j1] = corners(F, R);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const [x, z] = cornerAt(F, i, j), d = Math.hypot(x - cx, z - cz) / rad;
    if (d < 1) { const q = Math.cos((d * PI) / 2); f[j * nx + i] += h * q * q; }
  }
}
/** a barrel vault across a cave's short side: the ceiling rises by h along its middle */
export function arch(F: Floor, R: PRoom, h: number): void {
  const f = field(F, 'cf'), nx = F.terrain!.nx, ax = R.x1 - R.x0 < R.z1 - R.z0, [i0, i1, j0, j1] = corners(F, R);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const [x, z] = cornerAt(F, i, j);
    f[j * nx + i] += h * Math.sin(PI * (ax ? (x - R.x0) / (R.x1 - R.x0) : (z - R.z0) / (R.z1 - R.z0)));
  }
}
/** a room's floor sloping from h0 to h1 toward `dir` */
export function slope(F: Floor, R: PRoom, dir: Dir, h0: number, h1: number): void {
  const f = field(F, 'hf'), nx = F.terrain!.nx, ax = dir === 'e' || dir === 'w', rev = dir === 'w' || dir === 'n', L = ax ? R.x1 - R.x0 : R.z1 - R.z0, [i0, i1, j0, j1] = corners(F, R);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const [x, z] = cornerAt(F, i, j), t = (ax ? x - R.x0 : z - R.z0) / L;
    f[j * nx + i] = h0 + (h1 - h0) * (rev ? 1 - t : t);
  }
}
/** break up a cave's floor and ceiling. Corners shared with a door or an ordinary room are left alone, so place doors first */
export function roughen(F: Floor, R: PRoom, fa: number, ca: number): void {
  const hf = field(F, 'hf'), cf = field(F, 'cf'), T = F.terrain!, nx = T.nx, [i0, i1, j0, j1] = corners(F, R);
  /* the four cells round corner (i, j): is it R's, and does it touch anything laid out that is not a cave? */
  const pinned = (i: number, j: number): boolean => {
    let own = false;
    for (const [di, dj] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
      const ti = i + di, tj = j + dj;
      if (ti < 0 || tj < 0 || ti >= nx - 1 || tj >= T.nz - 1) continue;
      const [x, z] = cornerAt(F, ti + 0.5, tj + 0.5), q = topAt(F, x, z);
      if (q?.room === R) own = true;
      if (q && !(q.room && q.room.cave)) return true;
    }
    return !own;
  };
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    if (pinned(i, j)) continue;
    hf[j * nx + i] += rnd(-fa, fa);
    cf[j * nx + i] += rnd(-ca, ca);
  }
}
/** what is laid out at (x, z) as it stands: the latest room or door there */
function topAt(F: Floor, x: number, z: number): Claim | null {
  for (let k = F.claims.length - 1; k >= 0; k--) {
    const c = F.claims[k];
    if (c.room ? holds(F, c.room, x, z) : doorNear(F, c.door, x, z)) return c;
  }
  return null;
}
export const ROCKP = { fl: 0x4a443c, wl: 0x5a5248, st: 0x5a5248 };
export function cave(F: Floor, name: string, x: number, z: number, w: number, d: number, o: RoomOpts = {}): PRoom {
  return room(F, name, x, z, w, d, { ...ROCKP, cave: 1, ht: 4, lit: 'none', nolamp: 1, ...o });
}

/* ---- caves of any outline (engine.md §14). A shape is f(x, z): the floor height at a point inside it, or null outside.
   The terrain's cells test their middles and go to the first shape that claims them (none already laid out); its
   corners take the floor of the first shape to set them, so where shapes meet, the earlier one rules. The room's box
   bounds its cells, as the other terrain tools expect. In the compiled level a floor's shaped caves are one floor and one
   roof, masked to their cells. */
export function caveShape(F: Floor, name: string, f: (x: number, z: number) => number | null, o: RoomOpts = {}): PRoom {
  const T = F.terrain;
  if (!T) throw new Error(`plan: ${name}: its floor has no terrain`);
  const hf = field(F, 'hf'), set = F.hset ?? (F.hset = new Uint8Array(T.nx * T.nz)), own = F.owner ?? (F.owner = new Int16Array((T.nx - 1) * (T.nz - 1)).fill(-1));
  /* (which cells are free is asked before the room is made: it is not laid out until it has some) */
  const free: boolean[] = [];
  for (let j = 0; j < T.nz - 1; j++) for (let i = 0; i < T.nx - 1; i++) { const [x, z] = cornerAt(F, i + 0.5, j + 0.5); free.push(!topAt(F, x, z)); }
  const R = room(F, name, 0, 0, 0, 0, { ...ROCKP, cave: 1, ht: 4, lit: 'none', nolamp: 1, ...o });
  R.shaped = true;
  let i0 = 1e9, j0 = 1e9, i1 = -1, j1 = -1;
  for (let j = 0; j < T.nz - 1; j++)
    for (let i = 0; i < T.nx - 1; i++) {
      const k = j * (T.nx - 1) + i;
      if (!free[k]) continue;
      const [x, z] = cornerAt(F, i + 0.5, j + 0.5), h = f(x, z);
      if (h === null) continue;
      own[k] = R.id;
      i0 = Math.min(i0, i); j0 = Math.min(j0, j); i1 = Math.max(i1, i); j1 = Math.max(j1, j);
      for (const [ci, cj] of [[i, j], [i + 1, j], [i, j + 1], [i + 1, j + 1]]) {
        const c = cj * T.nx + ci;
        if (set[c]) continue;
        const [qx, qz] = cornerAt(F, ci, cj), q = f(qx, qz);
        hf[c] = q === null ? h : q; set[c] = 1;
      }
    }
  [R.x0, R.z0] = cornerAt(F, i0, j0); [R.x1, R.z1] = cornerAt(F, i1 + 1, j1 + 1);
  return R;
}
/** a little wander in an outline, the same every time: measured in the terrain's own lattice, a corner to a step */
const wob = (F: Floor, x: number, z: number) => {
  const T = F.terrain!, i = (x - T.x0) / T.res, j = (z - T.z0) / T.res;
  return T.res * (0.45 * Math.sin(i * 1.3 + j * 0.7) + 0.3 * Math.sin(j * 1.9 - i * 0.4));
};
function nearPath(pts: [number, number, number][], x: number, z: number): { d: number; h: number } {
  let d = 1e9, h = 0;
  for (let s = 0; s < pts.length - 1; s++) {
    const a = pts[s], b = pts[s + 1], dx = b[0] - a[0], dz = b[1] - a[1], t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz), 0, 1);
    const e = Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
    if (e < d) { d = e; h = a[2] + (b[2] - a[2]) * t; }
  }
  return { d, h };
}
/** a passage along pts [[x, z, floor], ...], r metres either side of its line */
export function tunnel(F: Floor, name: string, pts: [number, number, number][], r: number, o: RoomOpts = {}): PRoom {
  return caveShape(F, name, (x, z) => { const q = nearPath(pts, x, z); return q.d < r + wob(F, x, z) * 0.6 ? q.h : null; }, o);
}
/** an elliptical chamber, its floor given by fl(x, z) */
export function chamber(F: Floor, name: string, cx: number, cz: number, rx: number, rz: number, fl: (x: number, z: number) => number, o: RoomOpts = {}): PRoom {
  return caveShape(F, name, (x, z) => (Math.hypot((x - cx) / rx, (z - cz) / rz) < 1 + wob(F, x, z) / Math.max(rx, rz) ? fl(x, z) : null), o);
}
/** does the room have (x, z) as its own: in it, and not under anything laid out over it since? */
export const owns = (F: Floor, R: PRoom, x: number, z: number): boolean => topAt(F, x, z)?.room === R;
/** a pool in a cave floor: the floor sinks under standing water, r across about (cx, cz) */
export function pool(F: Floor, R: PRoom, cx: number, cz: number, r: number, depth: number): void {
  const level = hfAt(F, cx, cz) - 0.35;
  hill(F, cx, cz, r + 2, -depth, R);
  F.water.push([cx - r - 2, cz - r - 2, cx + r + 2, cz + r + 2, level]);
}

/* ---- ways between floors */
/** walk-up stairs from floor lo to floor hi: a flight w wide and len long from its north-west corner (x, z), climbing
 *  toward dir. `bare`: the way up only, its steps drawn by whoever asked for it (a grand stair draws its own over several
 *  side by side) */
export function stairs(lo: Floor, hi: Floor, x: number, z: number, w: number, len: number, dir: Dir, bare = false): void {
  const ax = dir === 'e' || dir === 'w', sx = ax ? len : w, sz = ax ? w : len;
  const R = room(hi, '', x, z, sx, sz, { noroam: 1, nolamp: 1 });
  R.hole = 'st'; R.landing = dir;
  lo.stairs.push({ x0: x, z0: z, x1: x + sx, z1: z + sz, dir, lo, hi, bare });
}
/** steps over (x, z) w by d, rising from y0 to y1 (metres over the floor) toward dir, in n steps: down into a sunken
 *  floor (room dy), say. They stand on the floor of the room they are in. */
export function flight(F: Floor, x: number, z: number, w: number, d: number, y0: number, y1: number, dir: Dir, n: number, c = 0x5a5d60): void {
  F.flights.push({ x0: x, z0: z, x1: x + w, z1: z + d, y0, y1, n, dir, c });
}
/** a platform that carries you, and cargo, between floor lo and floor hi: w by d from (x, z). Needs power. */
export function elev(lo: Floor, hi: Floor, x: number, z: number, w: number, d: number, c: string, nm = 'Cargo elevator'): void {
  const R = room(hi, '', x, z, w, d, { noroam: 1, nolamp: 1 });
  R.hole = 'el';
  lo.elevs.push({ x0: x, z0: z, x1: x + w, z1: z + d, lo, hi, c, name: nm });
  bx(lo, x + w / 2, z + d / 2, w, 0.01, d, 0xb89b2e, { y: 0.012, c: 0 });
  bx(lo, x + w / 2, z + d / 2, w - 0.4, 0.01, d - 0.4, 0x2a2c2e, { y: 0.016, c: 0 });
}
/** stairs to another level: you fade, and arrive at the far level's mark for this one */
export function stairUp(F: Floor, ix: number, iz: number, ax: number, az: number, yaw: number, to: string): void {
  use(F, 'stair', ix, iz, 1, { to, from: F.lv.id, up: 1 });
  F.marks['stair:' + to] = [ax, az, yaw];
  for (let k = 0; k < 5; k++) bx(F, ix, iz - 0.6 + k * 0.3, 1.3, 0.24 * (k + 1), 0.3, 0x5a5d60, { c: 0 });
}
export function stairDn(F: Floor, ix: number, iz: number, ax: number, az: number, yaw: number, to: string): void {
  use(F, 'stair', ix, iz, 0.4, { to, from: F.lv.id, up: 0 });
  F.marks['stair:' + to] = [ax, az, yaw];
  bx(F, ix, iz, 1.3, 0.02, 1.5, 0x030405, { y: 0.014, c: 0 });
  for (const s of [-0.7, 0.7]) bx(F, ix + s, iz, 0.06, 1, 1.5, 0x8a7a2a, { c: 0 });
}
/** one end of a ladderway at (ix, iz), arriving at (ax, az). A ladder is a fade, not a climb. Place it after the room
 *  it stands in. */
export function ladder(F: Floor, id: string, ix: number, iz: number, ax: number, az: number, yaw: number, up: boolean, o: { label?: string; bare?: boolean } = {}): void {
  const L = C().ladders[id], R = roomAt(F, ix, iz);
  const h = up ? (R ? R.ht : 3.2) : 1.1, broken = !!(L && L.broken);
  use(F, 'ladder', ix, iz, up ? 1.2 : 0.4, { id, up: up ? 1 : 0, text: o.label });
  F.marks['ladder:' + id] = [ax, az, yaw];
  if (o.bare) return;
  for (const s of [-0.25, 0.25]) bx(F, ix + s, iz, 0.06, h, 0.06, 0x8a7a2a, { c: 0 });
  for (let y = 0.3; y < h - 0.05; y += 0.3) if (!(broken && y > 1.2 && C().rng.chance(0.5))) bx(F, ix, iz, 0.5, 0.04, 0.04, 0x8a7a2a, { y, c: 0 });
  if (!up) bx(F, ix, iz, 1, 0.02, 1, 0x030405, { y: 0.014, c: 0 });
  if (broken) for (let k2 = 0; k2 < 5; k2++) P(F, 'ico', ix + rnd(-0.8, 0.8), iz + rnd(-0.8, 0.8), rnd(0.2, 0.5), rnd(0.15, 0.35), rnd(0.2, 0.5), pick([0x5a5248, 0x4a443c, 0x6b6a64]), { c: 0 });
}

/** a way through water to another level (a dive): you arrive at that level's mark 'dive:' + this level's id. `under`: it
 *  goes down into water with no air (the first time, you are told to count) */
export function dive(F: Floor, x: number, z: number, y: number, to: string, label: string, under = false): void {
  use(F, 'dive', x, z, y, { to, label, ...(under ? { under: 1 } : {}) });
}

/* ---- doors: what each looks like, from the rooms either side (world.md §1, *The station as built*; engine.md §15) */

/** how grand a room's finish is, for which side a doorway takes its lining from */
const GRAND: Partial<Record<Mat, number>> = { stone: 5, glazed: 4, board: 3, plaster: 3, block: 2, concrete: 1 };
const dug = (R: PRoom | null) => !!R && (R.cave || R.mat.wall === 'shot' || R.mat.wall === 'rock');

/** what frames each face of a doorway, by its door's look: [colour, width (m), material]; a shutter runs in steel guides
 *  inside the opening instead */
const FRAME: Record<Exclude<DoorLook, 'shutter'>, [number, number, Mat]> = {
  grand: [0x6e5028, 0.16, 'steel'], heavy: [0x2e3236, 0.1, 'steel'], steel: [0x3a3f45, 0.07, 'steel'],
  office: [0x4e4a44, 0.06, 'steel'], clinic: [0x9aa0a4, 0.06, 'steel'],
};

/* ---- compile: every floor of the level, into the builder */
/** what the builder is told of a room */
const roomOpts = (R: PRoom) => ({
  pal: { fl: R.fl, wl: R.wl, st: R.st } as Palette, lit: R.lit, lc: R.lc, em: R.em, batt: R.batt, circuit: R.c, flick: R.flick,
  nolamp: true, plain: R.open || R.cave, safe: R.safe, noroam: R.noroam, armed: R.armed, zone: R.zone, ...(R.sky !== undefined ? { sky: R.sky } : {}), motes: R.motes,
  mat: R.mat, ...(R.part ? { part: true } : {}),
});
const DOORPAL = { fl: [0.2, 0.21, 0.22] as Colour, wl: [0.27, 0.28, 0.3] as Colour, st: [0.22, 0.23, 0.25] as Colour };
const SLAB = 0.25;
/** the world's grid: what is laid out on a floor is painted on it to be asked about */
const Q = 0.25;

/** a door as it compiles: which way it faces, the wall it is in (its middle `mid`, how deep), its opening along it */
interface Hung {
  d: PDoor; ns: boolean; mid: number; depth: number; c: number; w: number;
  /** the rooms either side: A to the north (or west), B to the south (or east) */
  A: PRoom | null; B: PRoom | null;
  /** its opening on the plan */
  x0: number; z0: number; x1: number; z1: number;
}

/** a floor painted on the world's grid: what is laid out in each cell, the later of two in one place; a room's cells are
 *  those whose middles are in it, a door's those of its opening */
class Paint {
  private i0 = 0; private k0 = 0; private ni = 0; private nk = 0; private cell = new Int32Array(0);
  readonly what: Claim[] = [];
  constructor(F: Floor, hung: Map<PDoor, Hung> | null) {
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    const box = (c: Claim): [number, number, number, number] | null => {
      if (c.room) return c.room.x1 > c.room.x0 ? [c.room.x0, c.room.z0, c.room.x1, c.room.z1] : null;
      const h = hung?.get(c.door);
      return h ? [h.x0, h.z0, h.x1, h.z1] : null;
    };
    for (const c of F.claims) { const b = box(c); if (b) { x0 = Math.min(x0, b[0]); z0 = Math.min(z0, b[1]); x1 = Math.max(x1, b[2]); z1 = Math.max(z1, b[3]); } }
    if (x0 === Infinity) return;
    this.i0 = Math.floor(x0 / Q) - 1; this.k0 = Math.floor(z0 / Q) - 1;
    this.ni = Math.ceil(x1 / Q) + 1 - this.i0; this.nk = Math.ceil(z1 / Q) + 1 - this.k0;
    this.cell = new Int32Array(this.ni * this.nk).fill(-1);
    for (const c of F.claims) {
      const b = box(c);
      if (!b) continue;
      const n = this.what.push(c) - 1, R = c.room;
      const ia = Math.round(b[0] / Q), ib = Math.round(b[2] / Q), ka = Math.round(b[1] / Q), kb = Math.round(b[3] / Q);
      for (let k = ka; k < kb; k++)
        for (let i = ia; i < ib; i++) {
          const x = (i + 0.5) * Q, z = (k + 0.5) * Q;
          if (R && (R.shaped || R.poly) && !holds(F, R, x, z)) continue;
          this.cell[(k - this.k0) * this.ni + (i - this.i0)] = n;
        }
    }
  }
  /** what is laid out at (x, z), or null */
  at(x: number, z: number): Claim | null {
    const i = Math.floor(x / Q) - this.i0, k = Math.floor(z / Q) - this.k0;
    if (i < 0 || k < 0 || i >= this.ni || k >= this.nk) return null;
    const n = this.cell[k * this.ni + i];
    return n < 0 ? null : this.what[n];
  }
  roomAt(x: number, z: number): PRoom | null { return this.at(x, z)?.room ?? null; }
  /** each cell with something laid out in it: its middle, and what */
  forEach(fn: (x: number, z: number, c: Claim, i: number, k: number) => void): void {
    for (let k = 0; k < this.nk; k++)
      for (let i = 0; i < this.ni; i++) {
        const n = this.cell[k * this.ni + i];
        if (n >= 0) fn((i + this.i0 + 0.5) * Q, (k + this.k0 + 0.5) * Q, this.what[n], i + this.i0, k + this.k0);
      }
  }
}

/** compile the level. `start`: where the game begins, and the way it faces; on the floor of `on`, or the highest floor
 *  there with none given */
export function finishLevel(start?: [number, number, number], on?: Floor) {
  const { b, floors } = C();
  floors.sort((a, c) => a.y0 - c.y0);
  /* what is laid out on each floor, without its doors (to hang them by), and with them */
  const bare = new Map<Floor, Paint>(), full = new Map<Floor, Paint>(), hung = new Map<Floor, Map<PDoor, Hung>>();
  for (const F of floors) bare.set(F, new Paint(F, null));
  for (const F of floors) { const H = hangDoors(F, bare); hung.set(F, H); full.set(F, new Paint(F, H)); }
  /** the room under (x, z) on a floor, as it compiles */
  const roomOn = (F: Floor, x: number, z: number) => full.get(F)!.roomAt(x, z);
  const floorAt = (F: Floor, x: number, z: number) => F.y0 + hfAt(F, x, z) + (roomOn(F, x, z)?.dy ?? 0);
  /** anything laid out at (x, z) on a floor */
  const laidOn = (F: Floor, x: number, z: number) => !!full.get(F)!.at(x, z);
  const downFrom = (F: Floor, x: number, z: number) => { let n = F.below; while (n && !laidOn(n, x, z)) n = n.below; return n; };

  for (const F of floors) {
    const P = full.get(F)!;
    /* rooms */
    for (const R of F.rooms) {
      if (R.hole || R.shaped) continue;
      const opts = roomOpts(R);
      if (R.cave) {
        b.cave(R.name, R.x0, R.z0, R.x1, R.z1, {
          ...opts, y0: F.y0, ht: R.ht, res: F.terrain?.res ?? 2,
          floor: (x, z) => fieldAt(F, F.hf, x, z),
          /* a cave's roof rides on its floor, as before */
          ceil: (x, z) => fieldAt(F, F.hf, x, z) + fieldAt(F, F.cf, x, z),
        });
      } else if (R.poly) b.outline(R.name, R.poly, { ...opts, y0: F.y0 + R.dy, ht: R.ht, ...(R.walls !== undefined ? { walls: R.walls } : {}), ...(R.openSides ? { open: R.openSides } : {}) });
      else b.room(R.name, R.x0, R.z0, R.x1, R.z1, { ...opts, y0: F.y0 + R.dy, ht: R.ht });
    }
    shapedCaves(b, F);
    for (const [ax, az, bx2, bz, o] of F.walls) b.wall(ax, az, bx2, bz, o);
    /* water: wading depth over every room and doorway, or every room flooded over its roof; and pools */
    if (F.wet || F.deep) {
      const top = F.y0 + (F.wet || Math.max(2.4, ...F.rooms.map(R => R.ht)) + 1);
      for (const R of F.rooms) if (!R.hole && R.x1 > R.x0) b.water(R.x0, R.z0, R.x1, R.z1, top);
      for (const h of hung.get(F)!.values()) b.water(h.x0, h.z0, h.x1, h.z1, top);
    }
    for (const [x0, z0, x1, z1, lv] of F.water) b.water(x0, z0, x1, z1, F.y0 + lv);
    /* doorways, and the doors in them */
    for (const d of F.doors) compileDoor(b, F, hung.get(F)!.get(d)!, P, floorAt);
    /* floors under an upper floor: a slab under all that is laid out that is not an opening (or air over a room below
       that reaches up through it: the street's cavern under its own sky, not a flat's ceiling). A stair's opening on
       the way down is no room: what reaches up is the room it is cut in (the retreat's stair, in the lobby's floor), or
       else the one it opens from below (the grand stair's, over the lobby) */
    const roomOver = (L: Floor, x: number, z: number): PRoom | null => {
      const R = roomOn(L, x, z);
      if (!R?.hole) return R;
      for (let k = L.rooms.length - 1; k >= 0; k--) { const q = L.rooms[k]; if (!q.hole && !q.shaped && has(q, x, z)) return q; }
      return null;
    };
    const through = (x: number, z: number) => {
      let lo = downFrom(F, x, z), R = lo && roomOver(lo, x, z);
      while (lo && !R) { lo = downFrom(lo, x, z); R = lo && roomOver(lo, x, z); }
      return !!R && lo!.y0 + R.ht > F.y0 + 0.01;
    };
    if (F.below) {
      /* a walkway's slab is its own floor, so it takes the walkway's colour; under a fitted room it is the doorway grey
         (what stands on a slab is floored in its room's finish all the same: BlockDef.slab) */
      slabs(b, F, P, (x, z, c) => {
        const R = c.room;
        if ((R && (R.hole || (R.air && through(x, z)))) || (F.ground && !downFrom(F, x, z))) return null;
        return R?.open ? [hex(R.fl), R.mat.floor] : [DOORPAL.fl, 'concrete'];
      });
    }
    /* rails along a walkway's edges over open air, and beside a stair opening (but at its head). Open air is a room on
       some floor below rising past the walkway's floor (the street under a gallery, and under the gallery below it too;
       the lobby under its own); where only rooms that do not reach it lie below (a doorway, a flat, a washroom) there is
       wall at the walkway's height, and a rail against a wall is no rail */
    const drop = (x: number, z: number) => {
      for (let L = F.below; L; L = L.below) { const RL = roomOn(L, x, z); if (RL && !RL.hole && L.y0 + RL.dy + RL.ht > F.y0 + 0.5) return true; }
      return false;
    };
    rails(b, F, P, drop);
    /* ceiling fittings, every 6 m from 3 m in (one in the middle of a room 4 m or less across), on the ceiling as built
       (lid: a 3.2 m room's is at 3.25); and its air grilles */
    for (const R of F.rooms) {
      if (R.nolamp || R.part || R.open || R.hole || R.cave || R.sky !== undefined || R.air) continue;
      const top = lid(F.y0 + R.dy + R.ht), W = R.x1 - R.x0, D = R.z1 - R.z0;
      const along = (a0: number, L: number) => { if (L < 4 + 1e-6) return [a0 + L / 2]; const o: number[] = []; for (let p = 3; p <= L - 1 + 1e-6; p += 6) o.push(a0 + p); return o; };
      for (const z of along(R.z0, D))
        for (const x of along(R.x0, W)) {
          const dead = R.lit === 'none';
          b.box(x, z, 1.1, 0.06, 0.3, dead ? 0x2a2c2e : 0xe8eef2, { y: top - 0.07, glow: dead ? 1 : 3, solid: false });
          if (!dead) b.fixture(x, top - 0.08, z);
        }
      /* its air grilles: one at each end of a long room, at the far end of a short one, 1 m in and clear of a fitting
         (2 m further in if one is there), and toward the middle of its width. They are what the room's air is drawn
         toward while its fans run. */
      const long = W >= D, L = long ? W : D, S = long ? D : W, a0 = long ? R.x0 : R.z0, s0 = long ? R.z0 : R.x0;
      const across = s0 + 2 * Math.floor(S / 4 + 1e-6) + 1;
      for (const p of L >= 12 - 1e-6 ? [1, L - 1] : [L - 1]) {
        const at = p > 1 && L > 2 + 1e-6 && Math.abs(((p - 3) % 6 + 6) % 6) < 1e-6 ? p - 2 : p;
        const gx = long ? a0 + at : across, gz = long ? across : a0 + at, gy = top;
        b.box(gx, gz, 0.6, 0.03, 0.6, 0x2a2c2e, { y: gy - 0.04, solid: false });
        for (let s = 0; s < 4; s++) b.box(gx + (long ? 0 : -0.21 + s * 0.14), gz + (long ? -0.21 + s * 0.14 : 0), long ? 0.54 : 0.05, 0.02, long ? 0.05 : 0.54, 0x55585c, { y: gy - 0.06, solid: false });
        b.vent(gx, gy - 0.05, gz);
      }
    }
    /* services under a bare ceiling, poured or sprayed (a suspended or plastered one hides them): along a room's length, by one of its
       long walls, a cable tray and two pipes on hangers, a quarter metre down. Only in rooms tall enough that they
       clear the doors with room to spare, and not in the halls, whose ceilings are too far up to show them. */
    for (const R of F.rooms) {
      const W = R.x1 - R.x0, D = R.z1 - R.z0;
      if (R.part || R.open || R.hole || R.cave || R.shaped || R.air || R.sky !== undefined || (R.mat.ceiling !== 'concrete' && R.mat.ceiling !== 'shot') || R.ht < 3 || R.ht > 6 || Math.max(W, D) < 6 - 1e-6) continue;
      /* up among the light fittings they would take the full glare of them: they are lit as if a little shaded */
      const long = W >= D, side = R.id % 2, top = lid(F.y0 + R.dy + R.ht), DIM = 0.5;
      /* a run's length, and where along and across the room it lies: `off` metres in from the wall on its side */
      const L = long ? W : D, a0 = long ? R.x0 : R.z0;
      const across = (off: number) => (long ? (side ? R.z1 : R.z0) + (side ? -off : off) : (side ? R.x1 : R.x0) + (side ? -off : off));
      const at = (a: number, off: number): [number, number] => (long ? [a0 + a, across(off)] : [across(off), a0 + a]);
      const run = (off: number, d: number, dropBy: number, c: number) => {
        const [x, z] = at(L / 2, off);
        /* a cylinder lying along the run: tipped onto its side, then turned to the room's length; its middle `dropBy` down */
        b.prop('cyl', x, z, d, L - 0.04, d, c, { y: top - dropBy - (L - 0.04) / 2, rz: PI / 2, ry: long ? 0 : PI / 2, solid: false, mat: 'steel', glow: DIM, services: true });
      };
      const [tx, tz] = at(L / 2, 0.22);
      b.box(tx, tz, long ? L - 0.04 : 0.26, 0.05, long ? 0.26 : L - 0.04, 0x6b6e70, { y: top - 0.3, solid: false, mat: 'steel', glow: DIM, services: true });
      const pipes = [0x3d5a44, 0x7a3a2a, 0x8a8a84, 0x4a5a6a];
      run(0.48, 0.11, 0.2, pipes[R.id % 4]);
      run(0.64, 0.07, 0.24, pipes[(R.id + 1) % 4]);
      for (let k = 1; k < L / 2; k++) {
        const [hx, hz] = at(k * 2, 0.22), [px, pz] = at(k * 2, 0.56);
        b.box(hx, hz, 0.02, 0.25, 0.02, 0x3a3d40, { y: top - 0.25, solid: false, glow: DIM, services: true });
        b.box(px, pz, long ? 0.03 : 0.3, 0.03, long ? 0.3 : 0.03, 0x3a3d40, { y: top - 0.15, solid: false, glow: DIM, services: true });
        b.box(px, pz, 0.02, 0.12, 0.02, 0x3a3d40, { y: top - 0.15, solid: false, glow: DIM, services: true });
      }
    }
    /* platforms between this floor and the one above */
    for (const E of F.elevs) b.platform(E.x0, E.z0, E.x1, E.z1, E.lo.y0, E.hi.y0, 0x4a4f55, { name: E.name, circuit: E.c });
    /* stairs: a hidden ramp under visible steps, two to the metre */
    for (const S of F.stairs) {
      const ax = S.dir === 'e' || S.dir === 'w', rev = S.dir === 'w' || S.dir === 'n', rise = S.hi.y0 - S.lo.y0;
      b.ramp(S.x0, S.z0, S.x1, S.z1, S.lo.y0, S.hi.y0, S.dir, 0x5a5d60);
      b.level.surfaces[b.level.surfaces.length - 1].hidden = true;
      if (S.bare) continue;
      const L = ax ? S.x1 - S.x0 : S.z1 - S.z0, w = ax ? S.z1 - S.z0 : S.x1 - S.x0, N = Math.round(L * 2);
      for (let q = 0; q < N; q++) {
        const pos = rev ? 1 - (q + 0.5) / N : (q + 0.5) / N, sh = ((q + 1) / N) * rise;
        if (ax) b.box(S.x0 + pos * L, (S.z0 + S.z1) / 2, L / N, sh, w - 0.3, q % 2 ? 0x5a5d60 : 0x54575a, { y: S.lo.y0, solid: false });
        else b.box((S.x0 + S.x1) / 2, S.z0 + pos * L, w - 0.3, sh, L / N, q % 2 ? 0x5a5d60 : 0x54575a, { y: S.lo.y0, solid: false });
      }
    }
    /* steps within the floor: solid blocks, one a step */
    for (const S of F.flights) b.steps(S.x0, S.z0, S.x1, S.z1, F.y0 + S.y0, F.y0 + S.y1, S.n, S.dir, S.c);
    /* props, colliders, lamps */
    for (const p of F.props) {
      const [y, rz] = p.lie ? ground(p, (x, z) => floorAt(F, x, z)) : [floorAt(F, p.x, p.z), p.rz];
      b.prop(p.shape, p.x, p.z, p.sx, p.sy, p.sz, p.c, {
        y: y + p.y, ry: p.ry, rz, glow: p.glow ? 3 : 1, solid: p.solid, loose: p.loose, mat: p.mat, flush: p.flush, goods: p.goods,
        ...(p.pw ? { pw: p.pw, pc: p.pc ?? F.c } : {}),
      });
    }
    for (const [x0, z0, x1, z1, lo, hi] of F.cols) {
      const y = floorAt(F, (x0 + x1) / 2, (z0 + z1) / 2);
      b.collider((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, hi - lo, z1 - z0, y + lo);
    }
    /* what the later steps need */
    for (const it of F.items) b.item(it.id, it.x, floorAt(F, it.x, it.z) + it.y, it.z, it.n, it.on);
    for (const L of F.lamps) b.lamp(L.x, floorAt(F, L.x, L.z) + (L.h ?? 1), L.z, L.r, L.c);
    for (const S of F.stains) b.stain(S.x, floorAt(F, S.x, S.z), S.z, S.r);
    for (const K of F.cams) b.camera(K.x, floorAt(F, K.x, K.z) + K.h, K.z, K.yaw, { fov: K.fov, range: K.range, circuit: K.c, zone: K.zone, ...(K.name ? { name: K.name } : {}) });
    for (const S of F.speakers) b.speaker(S.zone, S.x, floorAt(F, S.x, S.z), S.z, S.pa ? { pa: S.pa } : {});
    for (const nt of F.notes) b.note(nt.key, nt.x, floorAt(F, nt.x, nt.z) + nt.y, nt.z, nt.bare);
    for (const E of F.exhibits) b.exhibit(E.key, E.x, floorAt(F, E.x, E.z) + E.y, E.z, E.yaw, E.w, E.h);
    for (const m of F.muts) {
      /* places in its options (a round's stops, a spot to hide in), each on its own floor */
      const plan = ({ F: S, x, z, ...o }: TStop) => ({ x, y: floorAt(S, x, z), z, ...o });
      const isStop = (v: unknown): v is TStop => !!v && typeof v === 'object' && 'F' in (v as object);
      const { at, ...o } = Object.fromEntries(Object.entries(m.o).map(([k, v]) => [k, Array.isArray(v) && isStop(v[0]) ? (v as TStop[]).map(plan) : isStop(v) ? plan(v) : v]));
      /* one that stands on another floor says where (`at`): so it can be listed after the rest, keeping their order */
      const p = (at as { x: number; y: number; z: number } | undefined) ?? { x: m.x, y: floorAt(F, m.x, m.z), z: m.z };
      b.mutant(m.type, p.x, p.y, p.z, o);
    }
    for (const u of F.uses) b.use(u.kind, u.x, floorAt(F, u.x, u.z) + u.y, u.z, u.o);
    for (const [name, [ax, az, yaw]] of Object.entries(F.marks)) b.mark(name, ax, floorAt(F, ax, az), az, yaw);
  }
  if (start) b.start(start[0], start[1], start[2], on ? floorAt(on, start[0], start[1]) : undefined);
  const level = b.finish();
  /* the station's dead after the living, so the living keep their numbers whatever lies about (a stable sort) */
  level.mutants.sort((p, q) => +(p.type === 'dead') - +(q.type === 'dead'));
  cur = null;
  return level;
}

/** how something flat lies on uneven ground (POpts.lie): its floor and tip. Tipped about its middle to the slope along
 *  its length, then lowered to where no part of it is over the floor there (the floor bends between the lattice's
 *  corners, so it is looked at all over) */
function ground(p: PProp, floorY: (x: number, z: number) => number): [number, number] {
  const c = Math.cos(p.ry), s = Math.sin(p.ry), at = (u: number, w: number) => floorY(p.x + u * c + w * s, p.z - u * s + w * c);
  const hx = p.sx / 2, hz = p.sz / 2, k = ((at(hx, -hz) + at(hx, hz)) - (at(-hx, -hz) + at(-hx, hz))) / (4 * hx);
  let y = Infinity;
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) { const u = (i / 2 - 1) * hx, w = (j / 2 - 1) * hz; y = Math.min(y, at(u, w) - k * u); }
  return [y, Math.atan(k)];
}

/** hang a floor's doors: for each, which way it faces (a room either side of it north and south, or else west and east),
 *  the wall it is in (its faces are those rooms' faces; its middle, halfway between), what it looks like, and its
 *  opening: as wide as it says, or as a door of its look is, about its middle */
function hangDoors(F: Floor, bare: Map<Floor, Paint>): Map<PDoor, Hung> {
  const P = bare.get(F)!, out = new Map<PDoor, Hung>();
  /* a tall room on some floor below reaching up past this one's floor, at (x, z) (a hall a control room looks down into) */
  const tall = (x: number, z: number) => {
    for (let L = F.below; L; L = L.below) {
      const R = bare.get(L)!.roomAt(x, z);
      if (R) return !R.hole && L.y0 + R.dy + R.ht > F.y0 + 0.5;
    }
    return false;
  };
  for (const d of F.doors) {
    /* the first room from the door's middle toward (ux, uz), within 3 m, and how far to its face; none if another door's
       place comes first */
    const look = (ux: number, uz: number): { R: PRoom; d: number } | null => {
      for (let s = Q / 4; s <= 3; s += Q / 4) {
        const x = d.x + ux * s, z = d.z + uz * s;
        if (F.doors.some(e => e !== d && Math.abs(e.x - x) < 1 && Math.abs(e.z - z) < 1)) return null;
        const R = P.roomAt(x, z);
        if (!R) continue;
        /* its face: the edge of the grid's cell it begins in */
        const v = ux ? x : z, u = ux || uz, face = u > 0 ? Math.floor(v / Q) * Q : (Math.floor(v / Q) + 1) * Q;
        return { R, d: Math.abs(face - (ux ? d.x : d.z)) };
      }
      return null;
    };
    const o = d.o, N = look(0, -1), S = look(0, 1);
    const opn = (q: { R: PRoom } | null, x: number, z: number) => !!q || (!!o.glass && tall(x, z));
    const ns = opn(N, d.x, d.z - 2) && opn(S, d.x, d.z + 2);
    const [a, b2] = ns ? [N, S] : [look(-1, 0), look(1, 0)], at0 = ns ? d.z : d.x;
    /* the wall: its depth face to face, and its middle */
    const depth = a && b2 ? a.d + b2.d : a ? 2 * a.d : b2 ? 2 * b2.d : 2;
    const mid = a && b2 ? at0 + (b2.d - a.d) / 2 : a ? at0 - a.d + depth / 2 : b2 ? at0 + b2.d - depth / 2 : at0;
    const A = a?.R ?? null, B = b2?.R ?? null;
    let c = ns ? d.x : d.z;
    /* its look, from the rooms either side: a shutter between two dug places, or a dug place and a plain one, and on
       anything jammed (you crouch under it); the rest as the grander side's finish has it */
    let w = 2;
    if (!(o.glass || o.vent || o.lift)) {
      const lk = lookOf(A, B, o);
      w = lk.look === 'steel' || lk.look === 'office' ? NARROW : 2;
    }
    w = o.w ?? w;
    /* in a stretch of wall: a single door against the end with wall beyond it, for as far as the stretch again (no room,
       no other door there) */
    if (o.span && w < o.span - 1e-6) {
      const at = (a: number): [number, number] => (ns ? [a, mid] : [mid, a]);
      const solid = (e: -1 | 1) => {
        const end = c + (e * o.span!) / 2;
        for (let s = Q / 2; s < o.span!; s += Q) {
          const [x, z] = at(end + e * s);
          if (P.roomAt(x, z) || F.doors.some(q => q !== d && Math.abs(q.x - x) < 1 && Math.abs(q.z - z) < 1)) return false;
        }
        return true;
      };
      const e = solid(1) ? 1 : solid(-1) ? -1 : 1;
      c += e * (o.span / 2 - w / 2);
    }
    const [x0, z0, x1, z1] = ns ? [c - w / 2, mid - depth / 2, c + w / 2, mid + depth / 2] : [mid - depth / 2, c - w / 2, mid + depth / 2, c + w / 2];
    out.set(d, { d, ns, mid, depth, c, w, A, B, x0, z0, x1, z1 });
  }
  return out;
}

/** a door's look, the room its doorway takes its lining from (none for a shutter), from the rooms either side */
function lookOf(A: PRoom | null, B: PRoom | null, o: DoorOpts): { look: DoorLook; lining: PRoom | null } {
  const rank = (R: PRoom | null) => (!R || R.open ? -1 : dug(R) ? 0 : GRAND[R.mat.wall] ?? 1);
  const G = rank(A) >= rank(B) ? A : B;
  const kind = (R: PRoom | null): DoorLook => !R || R.open || dug(R) ? 'steel' : R.mat.wall === 'stone' ? 'grand' : R.mat.wall === 'glazed' ? 'clinic'
    : R.mat.wall === 'board' || R.mat.floor === 'carpet' ? 'office' : 'steel';
  const shutter = !!o.stuck || (dug(A) || dug(B)) && kind(G) === 'steel' && !(A?.open || B?.open);
  return { look: shutter ? 'shutter' : o.kind === 'heavy' ? 'heavy' : o.plain ? 'steel' : kind(G), lining: shutter || !G || G.open || dug(G) ? null : G };
}

/** a door, as hung: its doorway (lined with the finish of the grander side, or, for a shutter, bare steel and concrete
 *  as it always was), its slab, its frame, its signs */
function compileDoor(b: LevelBuilder, F: Floor, h: Hung, P: Paint, floorAt: (F: Floor, x: number, z: number) => number): void {
  const o = h.d.o, { ns, mid, depth, c, w } = h, thin = depth < 1 - 1e-6;
  const at = (a: number, m: number): [number, number] => (ns ? [a, m] : [m, a]);
  /* is the wall solid for `len` past the opening's end e, along its middle? */
  const solidRun = (e: -1 | 1, len: number) => {
    const end = c + (e * w) / 2;
    for (let s = Q / 2; s < len; s += Q) { const [x, z] = at(end + e * s, mid); if (P.at(x, z)) return false; }
    return true;
  };
  let look: DoorLook | undefined, side: -1 | 1 | undefined, slides = false, lining: PRoom | null = null;
  if (!(o.glass || o.vent || o.lift)) {
    ({ look, lining } = lookOf(h.A, h.B, o));
    /* the end with wall beside it, for the leaf to slide into: the far end if both have */
    side = solidRun(1, w) ? 1 : solidRun(-1, w) ? -1 : 1;
    slides = look !== 'shutter' && !o.seal && solidRun(side, w);
  }
  /* a window's pane in a thin wall sits between its sill and head */
  const [sill, head] = o.glass && thin ? GLAZE[o.glaze ?? 'view'] : [0, 2.4];
  b.room('', h.x0, h.z0, h.x1, h.z1, { pal: { fl: 0, wl: 0, st: 0 }, y0: F.y0 + sill, ht: head - sill, doorway: true, nolamp: true, lit: 'main', circuit: F.c, part: thin,
    mat: lining ? { floor: lining.mat.floor, wall: lining.mat.wall === 'block' ? 'plaster' : lining.mat.wall, ceiling: lining.mat.wall === 'block' ? 'plaster' : lining.mat.wall } : DOORWAY });
  const R = b.level.rooms[b.level.rooms.length - 1];
  if (lining) { R.floor = hex(lining.fl); R.wall = hex(lining.wl); R.stripe = R.wall; } else { R.floor = DOORPAL.fl; R.wall = DOORPAL.wl; R.stripe = DOORPAL.st; }
  /* its circuit, unless it says: the room's to its north, south, west or east */
  const [cx, cz] = at(c, mid);
  let circuit = o.c ?? '';
  if (!circuit) { circuit = F.c; for (const [dx, dz] of [[0, -2], [0, 2], [-2, 0], [2, 0]]) { const r = P.roomAt(cx + dx, cz + dz); if (r) { circuit = r.c; break; } } }
  const y0 = floorAt(F, cx, cz), heavy = o.kind === 'heavy', th = heavy ? 0.36 : o.vent ? 0.12 : 0.14;
  const [sx0, sz0] = at(c - w / 2, mid - th / 2), [sx1, sz1] = at(c + w / 2, mid + th / 2);
  b.door(sx0, sz0, sx1, sz1, 2.4, {
    kind: o.kind ?? 'light', alongX: ns, open: !!o.open, stuck: !!o.stuck, seal: !!o.seal, vent: !!o.vent, lift: !!o.lift,
    card: o.card, code: o.code, ...(o.failsafe ? { failsafe: true } : {}), ...(o.loud ? { loud: o.loud } : {}), circuit, msg: o.msg, ...(o.glass ? { glass: true } : {}), ...(look ? { look, side } : {}), ...(slides ? { slides } : {}),
    ...(Math.abs(depth - 2) > 1e-6 ? { depth } : {}),
  });
  if (look) frame(F, P, h, look);
  b.level.doors[b.level.doors.length - 1].y0 = y0 + sill;
  b.level.doors[b.level.doors.length - 1].y1 = y0 + head;
  /* a sign names the room it is read toward, on the face of the wall it is read from. An armed room is not marked: its
     camera, by the door, is the tell */
  for (const [text, dir] of o.sg ?? []) {
    const y = y0 + 2.74, faceN = (ns ? mid - depth / 2 : c - w / 2) - 0.03, faceS = (ns ? mid + depth / 2 : c + w / 2) + 0.03;
    const faceW = (ns ? c - w / 2 : mid - depth / 2) - 0.03, faceE = (ns ? c + w / 2 : mid + depth / 2) + 0.03;
    if (dir === 'w') b.sign(text, faceW, y, cz, -PI / 2, circuit);
    else if (dir === 'e') b.sign(text, faceE, y, cz, PI / 2, circuit);
    else if (dir === 'n') b.sign(text, cx, y, faceN, PI, circuit);
    else b.sign(text, cx, y, faceS, 0, circuit);
  }
}

/** the frame round both faces of a doorway (an architrave: two jambs and a head, standing 3 cm off the wall). An opening
 *  hard against the room's side wall (a door in a corner) has no jamb on that side, the side wall being one, and its head
 *  stops there, not in the wall. A shutter runs in steel guides at the ends of its opening instead */
function frame(F: Floor, P: Paint, h: Hung, look: DoorLook): void {
  const { ns, mid, depth: dep, c, w } = h, at = (a: number, m: number): [number, number] => (ns ? [a, m] : [m, a]);
  const lo = c - w / 2, hi = c + w / 2;
  if (look === 'shutter') {
    for (const a of [lo + 0.04, hi - 0.04]) { const [x, z] = at(a, mid); bx(F, x, z, ns ? 0.08 : 0.24, 2.4, ns ? 0.24 : 0.08, 0x3a3d40, { c: 0, mat: 'steel' }); }
    return;
  }
  const [colour, fw, mat] = FRAME[look], u = fw / 2;
  for (const face of [-1, 1]) {
    const q = mid + face * (dep / 2 + 0.015);
    /* does the wall run on past the opening's end e in this face's plane, with a room in front of it? (Asked a little
       past the end: the doorway is carved to the grid, which can take it on by a few centimetres) */
    const runsOn = (e: -1 | 1) => {
      const a = e < 0 ? lo - 0.15 : hi + 0.15, [wx, wz] = at(a, mid + face * (dep / 2 - 0.05)), [fx, fz] = at(a, mid + face * (dep / 2 + 0.1));
      /* (a window beside it is the wall going on, with glass in it) */
      const w = P.at(wx, wz);
      return (!w || !!w.door?.o.glass) && !!P.roomAt(fx, fz);
    };
    const A0 = runsOn(-1) ? lo - 2 * u : lo, B0 = runsOn(1) ? hi + 2 * u : hi;
    for (const e of [lo - u, hi + u]) if (e - u >= A0 - 1e-9 && e + u <= B0 + 1e-9) { const [x, z] = at(e, q); bx(F, x, z, ns ? fw : 0.03, 2.4 + fw, ns ? 0.03 : fw, colour, { c: 0, mat }); }
    const [x, z] = at((A0 + B0) / 2, q);
    bx(F, x, z, ns ? B0 - A0 : 0.03, fw, ns ? 0.03 : B0 - A0, colour, { c: 0, y: 2.4, mat });
  }
}

/** the slabs under an upper floor: what `key` says is under each cell of what is laid out on it (a colour and what it is
 *  made of, or nothing), laid as the largest rectangles that share it */
function slabs(b: LevelBuilder, F: Floor, P: Paint, key: (x: number, z: number, c: Claim) => [Colour, Mat] | null): void {
  const rows = new Map<number, [number, string, [Colour, Mat]][]>();
  P.forEach((x, z, c, i, k) => {
    const v = key(x, z, c);
    if (!v) return;
    let r = rows.get(k);
    if (!r) rows.set(k, (r = []));
    r.push([i, v[0].join(',') + '/' + v[1], v]);
  });
  /* runs along each row, then runs of runs down the rows */
  let open = new Map<string, { i0: number; i1: number; k0: number; v: [Colour, Mat] }>();
  const done: { i0: number; i1: number; k0: number; k1: number; v: [Colour, Mat] }[] = [];
  const ks = [...rows.keys()].sort((p, q) => p - q);
  let last = -Infinity;
  for (const k of ks) {
    const r = rows.get(k)!.sort((p, q) => p[0] - q[0]), runs: { i0: number; i1: number; key: string; v: [Colour, Mat] }[] = [];
    for (const [i, key2, v] of r) {
      const t = runs[runs.length - 1];
      if (t && t.i1 === i && t.key === key2) t.i1 = i + 1;
      else runs.push({ i0: i, i1: i + 1, key: key2, v });
    }
    const next = new Map<string, { i0: number; i1: number; k0: number; v: [Colour, Mat] }>();
    for (const t of runs) {
      const id = `${t.i0}:${t.i1}:${t.key}`, was = k === last + 1 ? open.get(id) : undefined;
      next.set(id, was ?? { i0: t.i0, i1: t.i1, k0: k, v: t.v });
      if (was) open.delete(id);
    }
    for (const t of open.values()) done.push({ ...t, k1: last + 1 });
    open = next; last = k;
  }
  for (const t of open.values()) done.push({ ...t, k1: last + 1 });
  done.sort((p, q) => p.k0 - q.k0 || p.i0 - q.i0);
  for (const t of done) b.block(t.i0 * Q, F.y0 - SLAB, t.k0 * Q, t.i1 * Q, F.y0, t.k1 * Q, t.v[0], t.v[1], true);
}

/** rails along a walkway's edges where `drop` (open air below), and beside a stair's opening but at its head, in runs */
function rails(b: LevelBuilder, F: Floor, P: Paint, drop: (x: number, z: number) => boolean): void {
  const dirOf = (di: number, dk: number): Dir => (di > 0 ? 'e' : di < 0 ? 'w' : dk > 0 ? 's' : 'n');
  /* each edge of a cell that wants one: by which way it faces, the line it is on, and the walkway's floor */
  const edges = new Map<string, { di: number; dk: number; line: number; terrazzo: boolean; at: number[] }>();
  P.forEach((x, z, c, i, k) => {
    const R = c.room;
    if (!R || !R.open) return;
    for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = P.at(x + di * Q, z + dk * Q), NR = n?.room;
      const air = !n && drop(x + di * Q, z + dk * Q), st = NR?.hole === 'st' && NR.landing !== dirOf(-di, -dk);
      if (!air && !st) continue;
      const line = di ? i + (di > 0 ? 1 : 0) : k + (dk > 0 ? 1 : 0), terrazzo = R.mat.floor === 'terrazzo', id = `${di},${dk},${line},${terrazzo}`;
      let e = edges.get(id);
      if (!e) edges.set(id, (e = { di, dk, line, terrazzo, at: [] }));
      e.at.push(di ? k : i);
    }
  });
  const E = 0.1;
  for (const e of [...edges.values()].sort((p, q) => p.line - q.line || p.di - q.di || p.dk - q.dk)) {
    const at = e.at.sort((p, q) => p - q);
    for (let s = 0; s < at.length; ) {
      let t = s + 1;
      while (t < at.length && at[t] === at[t - 1] + 1) t++;
      const a0 = at[s] * Q, a1 = (at[t - 1] + 1) * Q, edge = e.line * Q;
      const [lx0, lx1] = e.di ? (e.di > 0 ? [edge - E, edge] : [edge, edge + E]) : [a0, a1];
      const [lz0, lz1] = e.dk ? (e.dk > 0 ? [edge - E, edge] : [edge, edge + E]) : [a0, a1];
      const rx = (lx0 + lx1) / 2, rz = (lz0 + lz1) / 2, sx = lx1 - lx0, sz = lz1 - lz0;
      if (e.terrazzo) {
        /* where the family's visitors walked: a sheet of glass in a bronze shoe, a bronze handrail along its top */
        b.box(rx, rz, sx, 1, sz, [0.55, 0.66, 0.7], { y: F.y0, solid: true, mat: 'glass' });
        b.box(rx, rz, e.di ? 0.07 : sx, 0.07, e.dk ? 0.07 : sz, 0x5e4424, { y: F.y0 + 1, solid: false, mat: 'steel' });
        b.box(rx, rz, e.di ? 0.14 : sx, 0.1, e.dk ? 0.14 : sz, 0x5a4226, { y: F.y0, solid: false, mat: 'steel' });
      } else b.box(rx, rz, sx, 1, sz, [0.35, 0.33, 0.2], { y: F.y0, solid: true });
      s = t;
    }
  }
}

/* A floor's caves of any outline: each a room carved cell by cell of the terrain (from just under its floor to just over
   its roof there), all of them under one floor and one roof, masked to their cells. One surface, so where two caves meet
   the floor and the roof run on without a seam; a roof's height over a corner is the floor there, plus the tallest
   headroom of the caves that share the corner, plus the ceiling field. Their palette and materials are the first cave's. */
function shapedCaves(b: LevelBuilder, F: Floor): void {
  const S = F.rooms.filter(R => R.shaped && R.x1 > R.x0);
  if (!S.length) return;
  const T = F.terrain!, res = T.res, Wc = T.nx - 1, own = F.owner!, ids = new Set(S.map(R => R.id)), q = 0.25;
  const ci = (x: number) => Math.round((x - T.x0) / res), cj = (z: number) => Math.round((z - T.z0) / res);
  let i0 = Infinity, j0 = Infinity, i1 = -Infinity, j1 = -Infinity;
  for (const R of S) { i0 = Math.min(i0, ci(R.x0)); j0 = Math.min(j0, cj(R.z0)); i1 = Math.max(i1, ci(R.x1)); j1 = Math.max(j1, cj(R.z1)); }
  const nx = i1 - i0 + 1, nz = j1 - j0 + 1, mask: number[] = new Array((nx - 1) * (nz - 1)).fill(0), ht = new Float32Array(nx * nz);
  for (let j = j0; j < j1; j++)
    for (let i = i0; i < i1; i++) {
      const r = own[j * Wc + i];
      if (!ids.has(r)) continue;
      mask[(j - j0) * (nx - 1) + (i - i0)] = 1;
      for (const [di, dj] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const c = (j - j0 + dj) * nx + (i - i0 + di); ht[c] = Math.max(ht[c], F.rooms[r].ht); }
    }
  const hf = field(F, 'hf'), cf = field(F, 'cf');
  const fl: number[] = [], cl: number[] = [];
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const c = (j + j0) * T.nx + i + i0, f = F.y0 + hf[c];
      fl.push(f); cl.push(f + ht[j * nx + i] + cf[c]);
    }
  /* carve each cave's cells, and find how far the surfaces reach */
  let lo = Infinity, hi = -Infinity;
  for (const R of S) {
    const rx = ci(R.x0), rz = cj(R.z0), lw = ci(R.x1) - rx, lz = cj(R.z1) - rz, clo: number[] = [], chi: number[] = [];
    for (let j = rz; j < rz + lz; j++)
      for (let i = rx; i < rx + lw; i++) {
        if (own[j * Wc + i] !== R.id) { clo.push(0); chi.push(0); continue; }
        const cs = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([di, dj]) => (j - j0 + dj) * nx + (i - i0 + di));
        const f = Math.min(...cs.map(c => fl[c])), c = Math.max(...cs.map(k => cl[k]));
        clo.push(Math.floor((f - 0.01) / q) * q); chi.push(Math.ceil((c + 0.01) / q) * q);
        lo = Math.min(lo, f); hi = Math.max(hi, c);
      }
    const ylo = Math.min(...clo.filter((v, k) => v < chi[k])), yhi = Math.max(...chi.filter((v, k) => clo[k] < v));
    const r = b.room(R.name, R.x0, R.z0, R.x0 + lw * res, R.z0 + lz * res, {
      pal: { fl: R.fl, wl: R.wl, st: R.st }, lit: R.lit, lc: R.lc, em: R.em, circuit: R.c, flick: R.flick,
      nolamp: true, plain: true, safe: R.safe, noroam: R.noroam, armed: R.armed, zone: R.zone, y0: ylo, ht: yhi - ylo, motes: R.motes, mat: R.mat,
    });
    r.cells = { res, nx: lw, nz: lz, lo: clo, hi: chi };
  }
  const x0 = T.x0 + i0 * res, z0 = T.z0 + j0 * res, x1 = T.x0 + i1 * res, z1 = T.z0 + j1 * res, P0 = S[0];
  b.lattice('floor', x0, z0, x1, z1, res, nx, nz, fl, Math.floor(lo / q) * q - q, P0.fl, P0.mat.floor, mask);
  b.lattice('ceiling', x0, z0, x1, z1, res, nx, nz, cl, Math.ceil(hi / q) * q + q, scale3(hex(P0.wl), 0.6), P0.mat.ceiling, mask);
}
