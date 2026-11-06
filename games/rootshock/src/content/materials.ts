/* What things are made of (engine.md §15). One table that the sound, the look and the sim all read, so 'steel' means the
   same thing to each of them. Plain data: nothing here knows about three.js or the page.

   A property goes in only when something reads it: how the material sounds struck (present/audio.ts), and how it
   takes the light (present/render/shader.ts). What it does when pried, cut or wetted comes in as it is built. */

export type Mat =
  | 'concrete' | 'block' | 'plaster' | 'tiles' | 'glazed' | 'paving'
  | 'grating' | 'steel' | 'rock' | 'wood' | 'glass'
  | 'shot' | 'board' | 'epoxy' | 'vinyl' | 'carpet' | 'terrazzo' | 'stone' | 'flake' | 'polished';

/** how a thing of it is built, which is half of how it sounds: solid through (its ring dies at once and drops in
 *  pitch), hollow (a crate, a box: the air inside booms), a sheet over a frame (plate: rings on), or an open grate
 *  (rings, and its bars rattle) */
export type Build = 'solid' | 'hollow' | 'sheet' | 'grate';

/** how it sounds struck (present/audio.ts, impact). Its body's ring: modes over a base pitch, each [ratio, loudness,
 *  seconds to die away]; the click of the contact (centre Hz, seconds); grit that skitters off it (grains); and how
 *  things of it are usually built. Who strikes it, how hard and with what, is the voice's to say. */
export interface Ring { base: number; modes: [number, number, number][]; click: number; clickT: number; grit: number; build: Build }

/** what is drawn on it, from where it is in the world (render/shader.ts): poured concrete's blotches and formwork, a
 *  wall of painted block, smooth paint, a suspended ceiling's tiles, glazed tile, paving flags, steel plate with its
 *  seams, an open steel mesh, raw rock, boards; shotcrete over the rock with its bolts, a coated slab, sheet vinyl,
 *  carpet, terrazzo, stone cladding; a coat with flakes broadcast in it, a slab ground to its stone; or nothing */
export type Pattern = 'none' | 'cast' | 'block' | 'plaster' | 'tiles' | 'glazed' | 'flags' | 'plate' | 'mesh' | 'rock' | 'boards'
  | 'shot' | 'epoxy' | 'vinyl' | 'carpet' | 'terrazzo' | 'stone' | 'flake' | 'polished';

/** how it takes the light. The flashlight's highlight on it: how bright (gloss, 0..1) and how tight (a broad sheen at
 *  8, a pin of light at 80), and how much it takes the material's own colour (metal 1: steel shines as steel; paint
 *  0: a white glint). How rough it is to light raking across it (bump, 0..1), and how much it shows the station's
 *  wear (grime at the foot of a wall, water run down from the ceiling): none on raw rock. What the water leaves
 *  (salt): on bare cement, white salts leached out of it (1); on paint and tile, a brown tide mark (0). */
export interface Look { pattern: Pattern; gloss: number; tight: number; metal: number; bump: number; wear: number; salt: number }

export interface MatDef {
  /** what it is, in a word or two */
  n: string;
  ring: Ring;
  look: Look;
}

const ring = (base: number, modes: [number, number, number][], click: number, clickT: number, build: Build, grit = 0): Ring => ({ base, modes, click, clickT, grit, build });
const look = (pattern: Pattern, gloss: number, tight: number, metal: number, bump: number, wear = 1, salt = 0): Look => ({ pattern, gloss, tight, metal, bump, wear, salt });

export const MATS: Record<Mat, MatDef> = {
  /** poured: blotched, with the formwork's seams and tie holes on walls and ceilings */
  concrete: { n: 'Concrete', ring: ring(110, [[1, 1, 0.07], [2.1, 0.35, 0.04]], 700, 0.05, 'solid'), look: look('cast', 0.04, 8, 0, 0.35, 1, 1) },
  /** concrete block, filled and painted smooth: the paint's sheen, and no coursing to be seen */
  block: { n: 'Painted block', ring: ring(150, [[1, 1, 0.06], [2.4, 0.3, 0.03]], 900, 0.04, 'solid'), look: look('block', 0.12, 14, 0, 0.5) },
  /** smooth painted plaster: an eggshell sheen and almost nothing else */
  plaster: { n: 'Painted plaster', ring: ring(130, [[1, 1, 0.05]], 600, 0.04, 'solid'), look: look('plaster', 0.2, 12, 0, 0.12) },
  /** a suspended ceiling: mineral tiles, pitted, in a grid of painted T-bar */
  tiles: { n: 'Ceiling tiles', ring: ring(210, [[1, 0.6, 0.05]], 420, 0.06, 'hollow'), look: look('tiles', 0.03, 8, 0, 0.3) },
  /** glazed ceramic wall tile: glassy, in a grid of grout */
  glazed: { n: 'Glazed tile', ring: ring(900, [[1, 0.5, 0.05], [2.7, 0.3, 0.03]], 2600, 0.02, 'solid'), look: look('glazed', 0.75, 70, 0, 0.25) },
  /** the Commons' street: flags laid on the cavern floor, gritty underfoot */
  paving: { n: 'Paving', ring: ring(120, [[1, 1, 0.06], [2.6, 0.3, 0.03]], 900, 0.04, 'solid', 2), look: look('flags', 0.03, 8, 0, 0.45) },
  /** a walkway's open steel bar grating, galvanised: it rings */
  grating: { n: 'Steel grating', ring: ring(380, [[1, 1, 0.18], [2.76, 0.45, 0.12], [5.4, 0.25, 0.08], [8.93, 0.12, 0.05]], 1300, 0.05, 'grate'), look: look('mesh', 0.25, 18, 0.6, 0.3) },
  /** plate and section: a platform's deck, a door's slab, a container's skin */
  steel: { n: 'Steel', ring: ring(300, [[1, 1, 0.3], [2.76, 0.5, 0.2], [5.4, 0.3, 0.12]], 1500, 0.03, 'sheet'), look: look('plate', 0.45, 50, 0.85, 0.2) },
  rock: { n: 'Rock', ring: ring(90, [[1, 0.6, 0.05]], 1200, 0.02, 'solid', 4), look: look('rock', 0.05, 14, 0, 1, 0) },
  /** a crate's boards: hollow */
  wood: { n: 'Wood', ring: ring(190, [[1, 1, 0.12], [2.2, 0.25, 0.05]], 500, 0.05, 'hollow'), look: look('boards', 0.08, 10, 0, 0.3) },
  /** a window's sealed pane: it clinks */
  glass: { n: 'Glass', ring: ring(1700, [[1, 1, 0.35], [2.3, 0.4, 0.2]], 4000, 0.01, 'sheet'), look: look('none', 1, 120, 0, 0, 0) },
  /** shotcrete: concrete sprayed over blasted rock, lumpy as the rock under it, no formwork; the rock bolts' plates
   *  in a grid through it. What a mined room is when nobody built anything inside it */
  shot: { n: 'Shotcrete', ring: ring(100, [[1, 1, 0.06], [2.1, 0.3, 0.035]], 650, 0.05, 'solid', 1), look: look('shot', 0.05, 10, 0, 0.8, 1, 1) },
  /** plasterboard on steel studs, painted: the refit's partitions. Looks as plaster does; knocks hollow */
  board: { n: 'Plasterboard', ring: ring(170, [[1, 1, 0.08], [2.3, 0.3, 0.04]], 520, 0.04, 'hollow'), look: look('plaster', 0.16, 12, 0, 0.1) },
  /** a slab sealed with a coat of epoxy: smooth, with a sheen, and scuffs where things went */
  epoxy: { n: 'Coated concrete', ring: ring(115, [[1, 1, 0.06], [2.2, 0.3, 0.035]], 1100, 0.035, 'solid'), look: look('epoxy', 0.35, 30, 0, 0.15) },
  /** sheet vinyl, flecked, its welded seams a roll's width apart: the refit's medical floor */
  vinyl: { n: 'Sheet vinyl', ring: ring(110, [[1, 0.8, 0.05]], 520, 0.05, 'solid'), look: look('vinyl', 0.25, 22, 0, 0.1) },
  /** carpet, laid wall to wall. It hushes a step */
  carpet: { n: 'Carpet', ring: ring(90, [[1, 0.3, 0.035]], 300, 0.06, 'solid'), look: look('carpet', 0, 8, 0, 0.25) },
  /** terrazzo: chips of marble poured in cement, ground and polished in place, in one pour. The
   *  family's floor: it came down the shaft in bags */
  terrazzo: { n: 'Terrazzo', ring: ring(140, [[1, 1, 0.06], [2.5, 0.35, 0.035]], 1400, 0.03, 'solid'), look: look('terrazzo', 0.55, 45, 0, 0.12) },
  /** honed limestone, hung in panels on the walls the family's visitors saw */
  stone: { n: 'Limestone', ring: ring(160, [[1, 1, 0.06], [2.6, 0.35, 0.03]], 1300, 0.03, 'solid'), look: look('stone', 0.22, 24, 0, 0.3) },
  /** a slab coated, with flakes of vinyl broadcast into the coat while it was wet and a clear coat over them: it sounds
   *  as a coated slab does, and shines more */
  flake: { n: 'Flaked coating', ring: ring(115, [[1, 1, 0.06], [2.2, 0.3, 0.035]], 1100, 0.035, 'solid'), look: look('flake', 0.5, 40, 0, 0.12) },
  /** the slab itself ground down to the stone in it and polished: no coat to wear through */
  polished: { n: 'Polished concrete', ring: ring(125, [[1, 1, 0.065], [2.3, 0.35, 0.035]], 1500, 0.03, 'solid'), look: look('polished', 0.45, 36, 0, 0.1) },
};

/** every material in a fixed order: the renderer numbers them from 1 by it (0 is a thing that says nothing of itself) */
export const MAT_ORDER = Object.keys(MATS) as Mat[];

/** what a room's floor, walls and ceiling are; and if its walls change above a height (its datum, metres over its
 *  floor; 4 unless it says), what they are above it */
export interface RoomMats { floor: Mat; wall: Mat; ceiling: Mat; upper?: Mat; datum?: number }

/** the usual rooms: fitted ones are concrete; a walkway is grating over open air; a cave is rock all round; the
 *  Commons' street is paved, between the blocks' plastered fronts, under rock painted as sky. A doorway is its steel
 *  frame. A room dug and left as dug is shotcrete over the rock, on a poured floor. */
export const FITTED: RoomMats = { floor: 'concrete', wall: 'concrete', ceiling: 'concrete' };
export const WALKWAY: RoomMats = { floor: 'grating', wall: 'concrete', ceiling: 'concrete' };
export const CAVERN: RoomMats = { floor: 'rock', wall: 'rock', ceiling: 'rock' };
export const STREET: RoomMats = { floor: 'paving', wall: 'plaster', ceiling: 'rock' };
export const DOORWAY: RoomMats = { floor: 'concrete', wall: 'steel', ceiling: 'steel' };
export const DUG: RoomMats = { floor: 'concrete', wall: 'shot', ceiling: 'shot' };
