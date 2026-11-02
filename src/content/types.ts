import { inPoly, type Colour } from '../core/math';
import type { Mat, RoomMats } from './materials';

/* A level as data. Builders in content/build produce it; world/compile turns it into a World.
   All positions are plan metres in the station's frame: x east, z south, y up from the surface. */

/** how a room is lit. 'main': by its circuit (full power: lc; backup: lc dimmed, if it has emergency lights; else dark).
 *  'always': lc whatever the power (cells under their own supply). 'none': never. */
export type LitRule = 'main' | 'always' | 'none';

/** what hangs in a room's air: dust, unless it is the green's (spores) or the flesh's (flecks) */
export type Motes = 'dust' | 'spores' | 'flesh';

export interface RoomDef {
  id: number;
  name: string;
  /** rock or a walkway, not a fitted room: plain walls, no dado or stripe */
  plain: boolean;
  /** the open volume: floor at y0, ceiling at y0 + ht; on the plan, the box x0..x1, z0..z1, or the outline in it */
  x0: number; z0: number; x1: number; z1: number;
  y0: number; ht: number;
  /** an outline of any shape on the plan, its corners in order (either way round): the room is what lies inside it,
   *  carved cell by cell (each cell whose middle is in it), and its box bounds it. A side of it at an angle is a
   *  staircase of cells until a wall (WallDef) stands on it */
  poly?: [number, number][];
  floor: Colour; wall: Colour; stripe: Colour;
  /** what its floor, walls and ceiling are made of (content/materials.ts) */
  mat: RoomMats;
  lit: LitRule;
  /** the colour of its lights when lit */
  lc: Colour;
  /** has emergency lights: lit (dimly) on backup power */
  em: boolean;
  /** the circuit that powers it */
  circuit: string;
  /** it has emergency lights on cells of their own, as life-safety code wants (the isolation suite): this colour, while
   *  the supply they watch (`watch`, the room's feed) is dead and their own (`supply`) is live. A light switch turning the
   *  room's own circuit off leaves them dark */
  batt?: Batt;
  /** its lights stutter */
  flick: boolean;
  /** a doorway: lit by the rooms either side of it */
  doorway: boolean;
  /** more of a room past the rest of its side, reaching to a partition's face; or a partition's doorway or pane
   *  (content/build/plan.ts, RoomOpts.part and compileDoor) */
  part?: boolean;
  /** for the cast: a refuge they do not enter (safe), a room they do not wander into (noroam) */
  safe: boolean;
  noroam: boolean;
  /** armed by Security's lockdown: a live camera here takes anyone moving in it (sim/eyes.ts), and the cast keep out of
   *  it on their rounds, as staff kept out of where they were never cleared to go */
  armed: boolean;
  /** the alarm zone it is in (a speaker's zone): its alarm locks its doors down (sim/eyes.ts) */
  zone?: string;
  /** what hangs in its air, if not dust: the green's spores, or the flesh's flecks (present/render/motes.ts) */
  motes?: Motes;
  /** a cavern's roof painted as sky: its ceiling is this colour, and no fittings hang from it */
  sky?: Colour;
  /** a cave of any outline (engine.md §14): only these tiles are its own, each carved from lo to hi. The box above
   *  (x0 to x1, y0 to y0 + ht) bounds them. Tile (i, j) has its low corner at (x0 + i * res, z0 + j * res); a tile with
   *  lo >= hi is not the room's. */
  cells?: { res: number; nx: number; nz: number; lo: number[]; hi: number[] };
}

/** is (x, z) on the plan of the room: in its outline, or else its box */
export const roomHas = (R: Pick<RoomDef, 'x0' | 'z0' | 'x1' | 'z1' | 'poly'>, x: number, z: number): boolean =>
  R.poly ? inPoly(R.poly, x, z) : x >= R.x0 && x < R.x1 && z >= R.z0 && z < R.z1;

/** a room's emergency lights (RoomDef.batt): their colour, their own supply, and the supply whose loss brings them up */
export interface Batt { colour: Colour; supply: string; watch: string }

/** solid built back into open space: a platform, a step, a plinth. Part of the world, not a prop. */
export interface BlockDef {
  x0: number; y0: number; z0: number; x1: number; y1: number; z1: number;
  colour: Colour;
  mat: Mat;
  /** a floor slab under an upper floor: what stands on it is floored in the finish of the room over it, as on rock (its
   *  colour and what it is made of are its underside's and its edges') */
  slab?: boolean;
}

/** a wall at any angle on the plan: a straight run of solid from (ax, az) to (bx, bz), `t` thick about that line,
 *  from y0 up to y1. It is part of the world (bodies, sight, light and sound stop at it, exactly), and each face takes
 *  the finish of the room in front of it, as a face of rock does; or, given, a colour and what it is made of, as a
 *  block does. On an outline's side at an angle (RoomDef.poly) it hides the cells' staircase, if it is at least
 *  WALL_MIN thick there */
export interface WallDef {
  ax: number; az: number; bx: number; bz: number;
  t: number;
  y0: number; y1: number;
  colour?: Colour;
  mat?: Mat;
}

/** how thick a wall on an outline's side at an angle must be to hide the staircase of cells the room is carved as
 *  (both rooms', if it stands between two): the cells reach a half cell's width across the side either way, which is
 *  most (0.18 m) at 45 degrees */
export const WALL_MIN = 0.36;

/** an invisible solid: one box around furniture that is drawn as many parts */
export interface ColliderDef {
  x0: number; y0: number; z0: number; x1: number; y1: number; z1: number;
}

export type Shape = 'box' | 'cyl' | 'ico';
/** how far an icosahedron reaches along each axis, as a share of the size it is given: its corners lie on the sphere in
 *  the cube it is sized by (present/render/templates.ts), so it is drawn this much of its size, its lowest corner on its
 *  base (a lump sits on what it is put on) */
export const ICO = (1 + Math.sqrt(5)) / 2 / Math.hypot(1, (1 + Math.sqrt(5)) / 2);

/** a thing standing in a room. (x, z) is its centre, y its base */
export interface PropDef {
  shape: Shape;
  x: number; y: number; z: number;
  sx: number; sy: number; sz: number;
  ry: number; rz: number;
  colour: Colour;
  /** multiplies the light it receives: fittings that should read as lit */
  glow: number;
  /** blocks bodies (an axis-aligned box around it) */
  solid: boolean;
  /** can be pushed and knocked about (a crate); otherwise it never moves */
  loose: boolean;
  /** what it is made of, where something asks (a loose one is stood on: wood unless it says) */
  mat?: Mat;
  /** part of a run of services under a bare ceiling (pipes, a tray, their hangers): dressing only, drawn with surface
   *  detail on (render/shader.ts) */
  services?: boolean;
  /** a fitting that shows power: colour when its circuit is dead, and when it is live */
  pw?: [Colour, Colour];
  /** the circuit for pw */
  pc?: string;
  /** drawn at its size, not a hair larger (render/levelMesh.ts, apart): one of a run laid face to face to read as one
   *  piece (a stair's treads, its balustrade), where each drawn a different hair larger shows a seam at every joint */
  flush?: boolean;
}

/** a light of its own (a battery work lamp, a glowing growth): a pool of light, in its room only, whatever the power. It
 *  reaches r metres from where it is (x, y, z): a lamp on the floor does not light a ceiling far over it */
export interface LampDef {
  x: number; y: number; z: number;
  r: number;
  colour: Colour;
}

/** a ceiling fitting: a point its room's light shines down from */
export interface FixtureDef {
  x: number; y: number; z: number;
}

/** an air grille in a ceiling: its middle */
export interface VentDef {
  x: number; y: number; z: number;
}

/** a pool of blood on a floor: its middle and about how far it runs */
export interface StainDef {
  x: number; y: number; z: number; r: number;
}

/** a sign over a doorway: text on a plate, facing (yaw) the way it is read from */
export interface SignDef {
  text: string;
  x: number; y: number; z: number;
  yaw: number;
  circuit: string;
}

/** a board of the family's exhibit on a wall (content/exhibit.ts): what is drawn on it (`key`: a board's, or 'process'
 *  for the growing process, all its stages across one), its middle, which way it faces (yaw, as a sign's), and its size */
export interface ExhibitDef {
  key: string;
  x: number; y: number; z: number;
  yaw: number;
  w: number; h: number;
}

/** a sloped or uneven surface: a ramp, a cave's floor or ceiling. Heights are given on a lattice of `res` metres
 *  (nx by nz corners, row by row from (x0, z0)) and blended between. A floor is solid from `base` up to it;
 *  a ceiling is solid from it up to `base`. */
export interface SurfaceDef {
  kind: 'floor' | 'ceiling';
  x0: number; z0: number; x1: number; z1: number;
  res: number; nx: number; nz: number;
  h: number[];
  base: number;
  colour: Colour;
  mat: Mat;
  /** draw its edges down to the base (a ramp standing in a room); off where walls already hide them (a cave floor) */
  sides: boolean;
  /** solid but not drawn: the ramp under a flight of steps */
  hidden?: boolean;
  /** only some of its lattice squares are there ((nx - 1) by (nz - 1), row by row; 1 where it is): the floor or roof of
   *  caves of any outline */
  mask?: number[];
}

/** standing water: a level over a rectangle */
export interface WaterDef {
  x0: number; z0: number; x1: number; z1: number;
  level: number;
}

/** a door: a slab that fills a doorway and slides up into the lintel. What opens it is decided by its rules
 *  (engine.md §9, world.md §4): light doors open for anything near, heavy ones from a button on full power; either may
 *  carry a card reader or keypad; some are jammed half open, welded shut, or are loose panels. */
export interface DoorDef {
  x0: number; y0: number; z0: number; x1: number; y1: number; z1: number;
  kind: 'light' | 'heavy';
  /** the slab runs along x (people pass north and south) rather than along z */
  alongX: boolean;
  open: boolean;
  /** jammed part open: crouch under it */
  stuck: boolean;
  /** welded shut for good */
  seal: boolean;
  /** a loose wall panel, not a door */
  vent: boolean;
  /** the main lift's door */
  lift: boolean;
  /** a pane of glass, sealed: bodies stop at it, sight and light go through (a window) */
  glass?: boolean;
  card?: string;
  code?: number;
  /** fail-safe (world.md §4): its lock lets go when its power dies, and stays let go (a cell's, the isolation suite's) */
  failsafe?: boolean;
  /** a big door, heard this far (m, through the air) when it is opened by hand: those at rest in earshot come to it to
   *  look (sim/cast/round.ts, noiseAt). Cargo's, onto its dark bay */
  loud?: number;
  circuit: string;
  /** what it says when it will not open */
  msg?: string;
  /** what its slab is made of */
  mat: Mat;
  /** the end along its length that has wall beside it (1: the far end of x or z, -1 the near): where its reader, its
   *  lamps and, if it slides, its pocket are */
  side?: -1 | 1;
  /** it slides sideways into the wall at `side`; else it rises, as a shutter does */
  slides?: boolean;
  /** how it is drawn (content/build/plan.ts says, from the rooms either side: lookOf) */
  look?: DoorLook;
  /** how deep its doorway is, wall face to wall face: 2 m through the rock, half a metre through a partition */
  depth?: number;
}

/** what a door looks like: a roller shutter (dug places, and anything jammed); a heavy steel door; a painted steel door
 *  with a wired vision panel (Security, and anywhere plain); an office's veneered door; a clinic's pair of pale leaves
 *  with windows, wide for a bed; the family's pair of walnut leaves trimmed in bronze */
export type DoorLook = 'shutter' | 'heavy' | 'steel' | 'office' | 'clinic' | 'grand';

/** data the later steps use (engine.md §13): kept with the level now so the level is ported once */
export interface ItemDef {
  id: string; x: number; y: number; z: number; n: number;
  /** a light lying switched on (a flashlight dropped still on), and which way it points: yaw as the player's, pitch up */
  on?: Aim;
  /** put down square on a shelf, a desk or a table: how it lies, turned about y as drawn (content/lying.ts); without
   *  it, it lies as it fell */
  yaw?: number;
}
export interface Aim { yaw: number; pitch: number }
/** a paper to read; how it lies, as an item (ItemDef.yaw). `bare`: no paper of its own, it is written on what it is read
 *  from (a whiteboard), at its face */
export interface NoteDef { key: string; x: number; y: number; z: number; yaw?: number; bare?: boolean }
export interface MutantDef { type: string; x: number; y: number; z: number; opts: Record<string, unknown> }
/** a stop on a guard's round (world.md §8, the night round), in plan metres: how long it stands there looking about (at
 *  a door, first, before it tries it), and how many times it tries the door beside it with its card, and how long it
 *  looks in if the door opens. A stop may want a circuit live (it is passed by otherwise), be kept on the first time
 *  round only, be walked to at a pace of its own, be inside a room it searches (`about`: it looks right round), or be
 *  where it strikes down whoever is there and takes them (the opening's other patient), or grafts what it has taken
 *  (`graft`) and leaves it there. It looks about the way it came, or the way the stop faces it (`face`, a yaw) */
export interface RoundStop {
  x: number; y: number; z: number; wait?: number; tries?: number; look?: number;
  need?: string; once?: boolean; pace?: number; take?: boolean; graft?: boolean; about?: boolean; face?: number;
}
/** something to use: a corpse to search, a panel, a backup set, a ladder, the lift */
export interface UseDef { kind: string; x: number; y: number; z: number; opts: Record<string, unknown> }

/** a platform that carries what stands on it between two heights. Its top is at y0 or y1. */
export interface PlatformDef {
  x0: number; z0: number; x1: number; z1: number;
  y0: number; y1: number;
  colour: Colour;
  /** what its deck is made of */
  mat: Mat;
  /** worked by a button on a circuit (the station's cargo platforms); without it, it goes when stood on */
  call?: { name: string; circuit: string };
}

/** a camera: fixed eyes on a circuit (world.md §8). Its lens at (x, y, z), looking along yaw (as the cast: 0 is south,
 *  a quarter turn east), over a cone fov wide, as far as range in good light. Held in view, you sound its zone. */
export interface CameraDef {
  x: number; y: number; z: number;
  yaw: number; fov: number; range: number;
  circuit: string;
  zone: string;
  /** what its feed is called on a monitor (sim/eyes.ts, watching) */
  name?: string;
}

/** a zone's speaker, where its alarm sounds: (x, y, z) the floor under it, which is where whatever answers it comes to */
/** a zone's speaker: (x, y, z) the floor under it. It is wired from its PA system (`pa`, a circuit), not from the room
 *  it hangs in, and sounds only while that has power */
export interface SpeakerDef { zone: string; x: number; y: number; z: number; pa?: string }

export interface Start { x: number; y: number; z: number; yaw: number }

export interface LevelDef {
  id: string;
  name: string;
  /** its staff carry their cards: a card door with power opens for those of the cast that work doors and started in one of
   *  its alarm zones (sim/cast.ts), and is safe only from you (Security's: world.md §8, the changed) */
  cards?: boolean;
  seed: string;
  rooms: RoomDef[];
  blocks: BlockDef[];
  /** walls at any angle */
  walls?: WallDef[];
  props: PropDef[];
  colliders: ColliderDef[];
  surfaces: SurfaceDef[];
  water: WaterDef[];
  doors: DoorDef[];
  platforms: PlatformDef[];
  lamps: LampDef[];
  /** ceiling fittings: where each room's own light comes from, so it falls in pools below them (world/light.ts) */
  fixtures?: FixtureDef[];
  /** air grilles in fitted ceilings: where a room's air is drawn to and heard from while its fans run (motes.ts) */
  vents?: VentDef[];
  /** blood on the floor, wet enough to walk out of with it on your soles (present/render/prints.ts) */
  stains?: StainDef[];
  /** Security's cameras, and the speakers their alarms sound from (sim/eyes.ts) */
  cameras?: CameraDef[];
  speakers?: SpeakerDef[];
  signs: SignDef[];
  /** the family's exhibit, its boards on the walls (present/render/exhibit.ts) */
  exhibits?: ExhibitDef[];
  items: ItemDef[];
  notes: NoteDef[];
  mutants: MutantDef[];
  uses: UseDef[];
  /** named places: where you arrive by the lift, by each ladder, by stairs from each level */
  marks: Record<string, Start>;
  /** the circuit for anything that does not name one */
  circuit: string;
  start: Start;
}

/** how a circuit starts: on (fed by Gen-1 when it runs), with a working backup set, or broken (its feed is burned or cut).
 *  A branch (`feed`) takes its power from another circuit through its own service connection, not from Gen-1: whatever
 *  that circuit has, it has, while its connection is closed and whole. */
export interface CircuitDef { on: boolean; back: boolean; broken?: boolean; feed?: string; tag?: string }

/** a ladderway between two levels: broken (why it does not go), or needing something to pass */
export interface LadderDef {
  broken?: string; need?: { power?: string; msg?: string }; say?: string;
  /** the two levels it joins, by id */
  ends?: [string, string];
}

export interface StationDef {
  levels: { id: string; name: string; circuit: string; build: () => LevelDef }[];
  circuits: Record<string, CircuitDef>;
  ladders: Record<string, LadderDef>;
  /** Gen-1 is running */
  main: boolean;
  /** where the game begins: this level's own start */
  start: string;
  /** what you are told as it begins */
  intro?: string;
  /** every level's name, ported or not (a ladder names where it goes before that level is built) */
  names: Record<string, string>;
}
