import { STEP } from '../core/loop';
import { rect } from '../world/shapes';
import type { Box } from '../world/shapes';
import type { Dyn, World } from '../world/world';
import type { Body } from './body';
import type { Mutant } from './cast';
import type { Sim } from './sim';
import { sfx } from './game';
import type { V3 } from './sweep';

/* Corpses (engine.md §6, bodies with physics, as built). What dies goes loose: a handful of points, each a ball of
   some weight, held at their distances by sticks, falling and sliding against the world as the world answers anything
   (the grid, the props, the sloped surfaces, doors, platforms and crates); not a solver, and nothing the world does not
   already know. Points move by where they were and where they are (verlet), so a stick or a wall that moves one moves
   its speed with it. The cast's models are boxes on joints; each box rides the points of its joint (castView.ts, RIG),
   so the silhouette is the model's own. Plain numbers, no chance in it: the same blow drops the same body the same
   way, every time.

   A corpse is awake while it moves, and sleeps once still, as a loose crate does (loose.ts): asleep it costs nothing.
   No more than RAG.budget are awake at once; past that, the longest-awake one that has had time to fall sleeps where
   it is. */

/** a point of a body: where it is in the model's own frame as it stands (x to its right as drawn, y up, z the way
 *  it faces), its radius, and what it weighs (kg); a body's points weigh what the body does (cast.ts, MT) */
type Pt = [x: number, y: number, z: number, r: number, kg: number];

export interface Skel {
  pts: Record<string, Pt>;
  /** clusters held rigid: the first four all to each other, each after them to those four */
  rigid: string[][];
  /** sticks held at their length: a bone */
  sticks: [string, string][];
  /** pairs kept at least this share of their length apart: how far a joint folds */
  apart: [string, string, number][];
  /** joints that bend one way, a knee or an elbow: (a, b, c, side from, side to, way) keeps c on the `way` side (1
   *  forward, -1 back) of the line a to b, forward being square to that line and to the side */
  hinge?: [string, string, string, string, string, 1 | -1][];
  /** the middle of these is where it is said to be (its x and z) */
  mid: string[];
  /** three points of its trunk, not in a line, that its frame is reckoned from: what its muscles hold the rest to */
  core?: [string, string, string];
  /** how much of its muscles' hold each point has, where not all (1): legs give first, the neck last */
  tone?: Record<string, number>;
  /** its reflexes (REFLEX): its hands, each with the shoulder it reaches from, for bracing a fall, clutching a wound and
   *  guarding its face; and whether it writhes */
  hands?: [string, string][];
  writhe?: boolean;
  /** its legs, hip, knee and foot, for stepping to catch itself (STAGGER) */
  legs?: [string, string, string][];
}

/* The skeletons, from the models in castView.ts (test/ragdoll.test.ts holds them to each other). A husk's legs and
   arms are one box each, so one bone each; a thresher's arms bend at the elbow; a skitter's four legs are each one bent
   piece; a worm is a chain. */
export const SKEL: Record<string, Skel> = {
  husk: {
    pts: {
      hipL: [-0.11, 0.9, 0, 0.12, 10], hipR: [0.11, 0.9, 0, 0.12, 10],
      kneeL: [-0.11, 0.45, 0, 0.08, 5], kneeR: [0.11, 0.45, 0, 0.08, 5],
      footL: [-0.11, 0.08, 0.04, 0.08, 3], footR: [0.11, 0.08, 0.04, 0.08, 3],
      belly: [0, 1.18, 0.05, 0.13, 14],
      shL: [-0.27, 1.46, 0, 0.11, 8], shR: [0.3, 1.48, 0, 0.12, 9],
      head: [-0.02, 1.66, 0, 0.13, 6],
      /* the plain arm, and the one that is something else, longer and heavier */
      handL: [-0.27, 0.78, 0, 0.05, 3], handR: [0.3, 0.46, 0.02, 0.06, 4],
    },
    rigid: [['hipL', 'hipR', 'belly', 'shL', 'shR', 'head']],
    sticks: [['hipL', 'kneeL'], ['kneeL', 'footL'], ['hipR', 'kneeR'], ['kneeR', 'footR'], ['shL', 'handL'], ['shR', 'handR']],
    apart: [['kneeL', 'shL', 0.72], ['kneeR', 'shR', 0.72], ['kneeL', 'belly', 0.6], ['kneeR', 'belly', 0.6], ['hipL', 'footL', 0.3], ['hipR', 'footR', 0.3],
      ['kneeL', 'kneeR', 0.6], ['footL', 'footR', 0.6], ['handL', 'belly', 0.4], ['handR', 'belly', 0.3]],
    hinge: [['hipL', 'kneeL', 'footL', 'hipL', 'hipR', -1], ['hipR', 'kneeR', 'footR', 'hipL', 'hipR', -1]],
    mid: ['hipL', 'hipR', 'belly'],
    core: ['hipL', 'hipR', 'shL'],
    tone: { kneeL: 0.5, kneeR: 0.5, footL: 0.5, footR: 0.5, handL: 0.6, handR: 0.6 },
    hands: [['handL', 'shL'], ['handR', 'shR']],
    legs: [['hipL', 'kneeL', 'footL'], ['hipR', 'kneeR', 'footR']],
  },
  thresher: {
    pts: {
      hipL: [-0.17, 1, 0, 0.13, 28], hipR: [0.17, 1, 0, 0.13, 28],
      kneeL: [-0.17, 0.48, 0.02, 0.09, 13], kneeR: [0.17, 0.48, 0.02, 0.09, 13],
      footL: [-0.17, 0.09, 0.06, 0.09, 8], footR: [0.17, 0.09, 0.06, 0.09, 8],
      back: [0, 1.55, -0.2, 0.18, 60],
      shL: [-0.47, 1.98, -0.06, 0.12, 12], shR: [0.47, 1.98, -0.06, 0.12, 12],
      head: [0, 2.14, -0.12, 0.14, 10],
      elbL: [-0.47, 1.54, -0.06, 0.07, 8], elbR: [0.47, 1.54, -0.06, 0.07, 8],
      handL: [-0.47, 1.0, -0.06, 0.07, 6], handR: [0.47, 1.0, -0.06, 0.07, 6],
    },
    rigid: [['hipL', 'hipR', 'back', 'shL', 'shR', 'head']],
    sticks: [['hipL', 'kneeL'], ['kneeL', 'footL'], ['hipR', 'kneeR'], ['kneeR', 'footR'], ['shL', 'elbL'], ['elbL', 'handL'], ['shR', 'elbR'], ['elbR', 'handR']],
    apart: [['kneeL', 'shL', 0.72], ['kneeR', 'shR', 0.72], ['kneeL', 'back', 0.75], ['kneeR', 'back', 0.75], ['hipL', 'footL', 0.3], ['hipR', 'footR', 0.3],
      ['kneeL', 'kneeR', 0.6], ['footL', 'footR', 0.6], ['shL', 'handL', 0.45], ['shR', 'handR', 0.45], ['handL', 'back', 0.3], ['handR', 'back', 0.3]],
    hinge: [['hipL', 'kneeL', 'footL', 'hipL', 'hipR', -1], ['hipR', 'kneeR', 'footR', 'hipL', 'hipR', -1],
      ['shL', 'elbL', 'handL', 'shL', 'shR', 1], ['shR', 'elbR', 'handR', 'shL', 'shR', 1]],
    mid: ['hipL', 'hipR', 'back'],
    core: ['hipL', 'hipR', 'shL'],
    tone: { kneeL: 0.5, kneeR: 0.5, footL: 0.5, footR: 0.5, elbL: 0.6, elbR: 0.6, handL: 0.5, handR: 0.5 },
    hands: [['handL', 'shL'], ['handR', 'shR']],
    legs: [['hipL', 'kneeL', 'footL'], ['hipR', 'kneeR', 'footR']],
  },
  skitter: {
    pts: {
      fl: [-0.2, 0.55, 0.38, 0.13, 6.5], fr: [0.2, 0.55, 0.38, 0.13, 6.5], bl: [-0.2, 0.55, -0.38, 0.13, 6.5], top: [0, 0.66, 0, 0.12, 8],
      br: [0.2, 0.55, -0.38, 0.13, 6.5],
      head: [0, 0.57, 0.62, 0.15, 5],
      /* its feet, out and down, front then back on each side */
      f0: [-0.56, 0.05, 0.38, 0.05, 1.5], f1: [-0.56, 0.05, -0.38, 0.05, 1.5],
      f2: [0.56, 0.05, 0.38, 0.05, 1.5], f3: [0.56, 0.05, -0.38, 0.05, 1.5],
    },
    rigid: [['fl', 'fr', 'bl', 'top', 'br', 'head']],
    sticks: [['fl', 'f0'], ['bl', 'f1'], ['fr', 'f2'], ['br', 'f3']],
    apart: [['f0', 'top', 0.75], ['f1', 'top', 0.75], ['f2', 'top', 0.75], ['f3', 'top', 0.75], ['f0', 'f1', 0.5], ['f2', 'f3', 0.5]],
    mid: ['fl', 'fr', 'bl', 'br'],
    core: ['fl', 'fr', 'bl'],
    tone: { f0: 0.8, f1: 0.8, f2: 0.8, f3: 0.8 },
  },
  worm: {
    pts: {
      head: [0, 0.22, 0.3, 0.15, 4], s0: [0, 0.18, 0, 0.18, 5], s1: [0, 0.18, -0.36, 0.17, 4.5], s2: [0, 0.18, -0.72, 0.15, 4],
      s3: [0, 0.16, -1.08, 0.14, 3.5], s4: [0, 0.14, -1.44, 0.12, 2.5], s5: [0, 0.12, -1.8, 0.11, 1.5],
    },
    rigid: [],
    sticks: [['head', 's0'], ['s0', 's1'], ['s1', 's2'], ['s2', 's3'], ['s3', 's4'], ['s4', 's5']],
    apart: [['head', 's1', 0.75], ['s0', 's2', 0.75], ['s1', 's3', 0.75], ['s2', 's4', 0.75], ['s3', 's5', 0.75]],
    mid: ['s1', 's2'],
    writhe: true,
  },
};
/* the bone line's middle years (castView.ts, boneMid): a husk, 1.08 times the size and 105 kg, its right arm (bone) drawn
   down to 0.3 m off the floor, its left (raw) a little long, its head carried forward */
SKEL.bonemid = grown(SKEL.husk, 1.08, 105, { handR: [0.33, 0.3, 0.04], handL: [-0.29, 0.73, 0], head: [-0.02, 1.79, 0.05] });
/* the bush's line, old in it (castView.ts, changed() grown over): a husk, 1.15 times the size and 110 kg */
SKEL.plantold = grown(SKEL.husk, 1.15, 110);
/** points weighted, all of them in proportion, to come to `kg` */
function weigh(kg: number, pts: Skel['pts']): Skel['pts'] {
  const all = Object.values(pts).reduce((t, p) => t + p[4], 0);
  return Object.fromEntries(Object.entries(pts).map(([k, p]) => [k, [p[0], p[1], p[2], p[3], (p[4] * kg) / all] as Pt]));
}
/* the other patient is built as the husk is (render/castView.ts) and goes loose as it does, on its own frame: its hips
   and shoulders a little narrower, both arms a person's, and lighter all over (55 kg to the husk's 80) */
SKEL.patient = { ...SKEL.husk, pts: weigh(55, {
    ...SKEL.husk.pts,
    hipL: [-0.1, 0.9, 0, 0.12, 10], hipR: [0.1, 0.9, 0, 0.12, 10], kneeL: [-0.1, 0.45, 0, 0.08, 5], kneeR: [0.1, 0.45, 0, 0.08, 5],
    footL: [-0.1, 0.08, 0.04, 0.08, 3], footR: [0.1, 0.08, 0.04, 0.08, 3],
    shL: [-0.25, 1.46, 0, 0.11, 8], shR: [0.25, 1.46, 0, 0.11, 8], head: [0, 1.66, 0, 0.13, 6],
    handL: [-0.25, 0.78, 0, 0.05, 3], handR: [0.25, 0.78, 0, 0.05, 3],
  }) };
/* the station's dead, the guards and the residents (sim/cast.ts, MT.dead): a person, as the other patient is, at a
   grown person's weight */
SKEL.dead = { ...SKEL.patient, pts: weigh(75, SKEL.patient.pts) };

/** a skeleton made ready: points by number, and its sticks with their lengths */
export interface Bones {
  names: string[];
  at: Record<string, number>;
  rest: number[];
  r: number[];
  kg: number[];
  /** 1 / kg, for sharing a correction */
  w: number[];
  mass: number;
  /** what each point takes with it when it is walked into: a limb's its own weight, the trunk's the whole body (and
   *  all of a body with no trunk, a worm) */
  carry: number[];
  /** a, b, length, for each stick; and for each pair kept apart, its least distance */
  sticks: number[];
  apart: number[];
  /** a, b, c, side from, side to, way, for each hinge */
  hinge: number[];
  mid: number[];
  /** its trunk's three points, and their frame as it stands (columns) and middle; each point's share of its tone */
  core: number[] | null;
  frame0: number[];
  c0: number[];
  tone: number[];
  /** its hands and their shoulders, and how far each reaches */
  hands: { hand: number; from: number; reach: number }[];
  writhe: boolean;
  /** its legs (hip, knee, foot) and how long each is */
  legs: { hip: number; knee: number; foot: number; len: number }[];
  /** how tall it stands: for the slump, which turns its top one way and its feet the other */
  ht: number;
}

/** a skeleton as another's, `k` times the size and weighing `kg` in all, with some of its points put elsewhere (as it
 *  stands, already that size) */
function grown(S: Skel, k: number, kg: number, moved: Record<string, [number, number, number]> = {}): Skel {
  const total = Object.values(S.pts).reduce((a, p) => a + p[4], 0), pts: Record<string, Pt> = {};
  for (const [n, [x, y, z, r, w]] of Object.entries(S.pts)) pts[n] = [...(moved[n] ?? [x * k, y * k, z * k]), r * k, (w * kg) / total];
  return { ...S, pts };
}

const ready = new Map<string, Bones>();
export function bones(kind: string): Bones {
  let B = ready.get(kind);
  if (B) return B;
  const S = SKEL[kind], names = Object.keys(S.pts), at: Record<string, number> = {};
  names.forEach((n, i) => { at[n] = i; });
  const rest: number[] = [], r: number[] = [], kg: number[] = [];
  for (const n of names) { const [x, y, z, rr, k] = S.pts[n]; rest.push(x, y, z); r.push(rr); kg.push(k); }
  const len = (a: number, b: number) => Math.hypot(rest[a * 3] - rest[b * 3], rest[a * 3 + 1] - rest[b * 3 + 1], rest[a * 3 + 2] - rest[b * 3 + 2]);
  const sticks: number[] = [], apart: number[] = [];
  const stick = (a: number, b: number) => { sticks.push(a, b, len(a, b)); };
  for (const c of S.rigid) {
    const ix = c.map(n => at[n]), base = ix.slice(0, 4);
    for (let i = 0; i < base.length; i++) for (let j = i + 1; j < base.length; j++) stick(base[i], base[j]);
    for (const k of ix.slice(4)) for (const b of base) stick(k, b);
  }
  for (const [a, b] of S.sticks) stick(at[a], at[b]);
  for (const [a, b, k] of S.apart) apart.push(at[a], at[b], len(at[a], at[b]) * k);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < names.length; i++) { lo = Math.min(lo, rest[i * 3 + 1] - r[i]); hi = Math.max(hi, rest[i * 3 + 1] + r[i]); }
  const mass = kg.reduce((a, b) => a + b, 0), limb = (n: string) => S.rigid.length > 0 && !S.rigid.some(c => c.includes(n));
  const hinge = (S.hinge ?? []).flatMap(([a, b, c, s0, s1, way]) => [at[a], at[b], at[c], at[s0], at[s1], way]);
  const core = S.core ? S.core.map(n => at[n]) : null;
  const c0 = core ? [0, 1, 2].map(k => (rest[core[0] * 3 + k] + rest[core[1] * 3 + k] + rest[core[2] * 3 + k]) / 3) : [0, 0, 0];
  B = {
    names, at, rest, r, kg, w: kg.map(k => 1 / k), mass, carry: names.map((n, i) => (limb(n) ? kg[i] : mass)), sticks, apart, hinge, mid: S.mid.map(n => at[n]), ht: hi - lo,
    core, frame0: core ? frameOf(rest, core) : [], c0, tone: names.map(n => S.tone?.[n] ?? 1),
    hands: (S.hands ?? []).map(([h, f]) => ({ hand: at[h], from: at[f], reach: len(at[h], at[f]) })),
    writhe: !!S.writhe,
    legs: (S.legs ?? []).map(([h, k, f]) => ({ hip: at[h], knee: at[k], foot: at[f], len: len(at[h], at[k]) + len(at[k], at[f]) })),
  };
  ready.set(kind, B);
  return B;
}

/** how a corpse goes (engine.md §6, bodies with physics, as built) */
export const RAG = {
  /** passes over the sticks each step: more holds a body stiffer */
  iters: 8,
  /** what a body gone loose falls at (m/s²): the earth's, not the station's 20 (body.ts), which suits a jump and
   *  yanks a body down as if on a string */
  gravity: 10,
  /** muscle tone: nobody goes limp at once. For `last` seconds after it goes loose a body holds its shape, each point
   *  pulled `start` of the way (each step, falling away to nothing) toward where it is as it stands in its trunk's
   *  frame, by its share (SKEL.tone: its legs least, so its knees still go); knocked down and alive, it keeps `alive` */
  tone: { start: 0.12, last: 0.45, alive: 0.06 },
  /** what the air takes of its speed each step */
  air: 0.999,
  /** what a step leaves of each point's speed apart from the whole body's: its joints are not frictionless; and of one
   *  out cold, dragged, which goes heavy rather than flailing */
  joint: 0.97, slack: 0.86,
  /** what the floor takes of the speed of a point on it, as a share of how hard it is pressed on it: 1.2 stops a body
   *  lying on it at 12 m/s², and one thrown along it slides a metre or two */
  friction: 1.2,
  /** asleep once it has moved, on the whole (its points by their weight), slower than `speed` (m/s) for `after`
   *  seconds; and asleep anyway after `most`
   *  seconds awake, if it is on the floor, so one that cannot settle does not cost for ever */
  sleep: { speed: 0.12, after: 0.5, most: 8 },
  /** no more than this many awake at once (as loose crates), but none put to sleep that has not been awake `down`
   *  seconds */
  budget: 16, down: 1,
  /** the share of a killing blow felt in the part it struck rather than the whole body, and how far from where it
   *  landed it is felt (m): a head struck turns the body about it */
  local: 0.35, spread: 0.6,
  /** what a wall holds of a point pressed against it, as a share of how hard it is pressed (friction) */
  grip: 1.2,
  /** and the most a wall holds a point, as a share of its own weight */
  cling: 2,
  /** the fastest a blow sends any one point (m/s) */
  most: 8,
  /** the hardest a killing blow sends the whole of a corpse (m/s): the fight shoves a light one at up to 7 */
  shove: 4,
  /** how much more of a blow its top takes than its feet: 1.2 sends its feet at 0.4 of the shove and its head at 1.6 */
  tip: 1.2,
  /** the legs going: the top of it is sent the way it falls and its feet the other, at this (m/s) */
  slump: 1.1,
  /** under water: what it takes of a point's speed each second, and the share of its weight left */
  water: { drag: 3, weight: 0.12 },
  /** what one corpse's points take of another's sliding over them, as a share of how hard they press */
  rub: 0.8,
  /** knocked down, a body goes loose too (false: drawn tipped over, as before) */
  floored: true,
  /** the share of the way to its feet a body knocked down is drawn each step (sim/cast.ts has its feet) */
  held: 0.2,
  /** walked into: the share of a walker that meets what it walks into (its legs, one at a time), and the most of the
   *  walker's pace anything is kicked to. A point goes to the share of the pace that and what it carries would make:
   *  by you, a husk's hand half, its trunk a fifth, a thresher's trunk a twelfth */
  kick: { legs: 0.25, most: 0.5 },
  /** how far one corpse has to push into a sleeping one to wake it (m) */
  stir: 0.03,
  /** a point landing harder than this (m/s) is heard, at most every `gap` seconds a body */
  thud: 3.5, gap: 0.3,
};

/** a body gone loose: its points as they are (p), as they were a step ago (q: the difference is their speed), and
 *  as they were at the start of this step (o, for drawing between steps). Plain numbers. */
export interface Rag {
  kind: string;
  p: number[]; q: number[]; o: number[];
  awake: boolean;
  /** seconds it has been still; seconds it has been awake; the tick it woke, for the budget; seconds since a thud */
  still: number; t: number; woke: number; heard: number;
  /** seconds it has been loose and awake, which its tone goes by (a kick wakes it, but does not bring its tone back);
   *  none in a save from before tone */
  age?: number;
  /** the point a blow last landed nearest, for a hand to go to (a reflex); and seconds left of guarding its face,
   *  struck while it is down */
  wound?: number;
  guard?: number;
  /** a step under way to catch itself (STAGGER): which leg, from where to where on the plan, how far through (0..1);
   *  and how many it has taken */
  stride?: { leg: number; x0: number; z0: number; x1: number; z1: number; s: number } | null;
  steps?: number;
  /** alive but gone slack, no tone and no reflexes (the other patient, at the night round's touch: sim/cast.ts) */
  limp?: boolean;
  /** one point held where something holds it (an ankle in a hand, dragged): which, and where */
  pin?: { i: number; x: number; y: number; z: number } | null;
}

/** what struck the blow that killed it: the way it was shoved (on the plan) and how hard (m/s, as the body was
 *  shoved), and where it landed and the way the striking thing was going, if a blow did it */
export interface Killing { ux: number; uz: number; v: number; at?: V3; way?: V3 }

/** a model's point (x, y, z) in the world, for one standing at (x0, y0, z0) facing yaw; `down` turns it over backward
 *  about its feet, as the knocked down are drawn (castView.ts) */
function place(x: number, y: number, z: number, yaw: number, x0: number, y0: number, z0: number, down: boolean): [number, number, number] {
  if (down) { const a = -1.45, c = Math.cos(a), s = Math.sin(a), yy = y * c - z * s, zz = y * s + z * c; y = Math.max(yy, 0) + 0.15; z = zz; }
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return [x0 + x * c + z * s, y0 + y, z0 - x * s + z * c];
}

/** its body gone loose where it stands (or lies), moving as its body was, and the blow that killed it (or, `alive`,
 *  knocked it down) in it */
export function makeRag(m: Mutant, kill: Killing | null, alive = false): Rag | null {
  const b = m.body;
  if (!b || !SKEL[m.model] || !Number.isFinite(b.mass)) return null;
  const B = bones(m.model), n = B.names.length, p: number[] = [], v: number[] = [];
  const down = m.down > 0 || m.rise > 0;
  for (let i = 0; i < n; i++) p.push(...place(B.rest[i * 3], B.rest[i * 3 + 1], B.rest[i * 3 + 2], m.yaw, b.x, b.y, b.z, down));
  return loose(m, B, p, v, kill, down, alive);
}

/** one dead in a save from before corpses were kept: laid on its back where it lay, asleep */
export function layRag(m: Mutant): Rag | null {
  if (!m.body || !SKEL[m.model] || !Number.isFinite(m.body.mass)) return null;
  const B = bones(m.model), p: number[] = [];
  for (let i = 0; i < B.names.length; i++) p.push(...place(B.rest[i * 3], B.rest[i * 3 + 1], B.rest[i * 3 + 2], m.yaw, m.x, m.y, m.z, true));
  return { kind: m.model, p, q: p.slice(), o: p.slice(), awake: false, still: 0, t: 0, woke: 0, heard: 99, age: 99 };
}

/** one of the station's dead, laid out where it was found: flat on its back, its feet where it stands and its head the
 *  way its back is to, each point on the floor under it, asleep */
export function layDead(m: Mutant, w: World): Rag | null {
  if (!m.body || !SKEL[m.model]) return null;
  const B = bones(m.model), p: number[] = [], c = Math.cos(m.yaw), s = Math.sin(m.yaw);
  for (let i = 0; i < B.names.length; i++) {
    /* turned over backward a quarter turn about its feet: how tall a point stood is how far behind them it lies */
    const x = B.rest[i * 3], z = -B.rest[i * 3 + 1], px = m.x + x * c + z * s, pz = m.z - x * s + z * c, r = B.r[i];
    p.push(px, w.groundBelow(rect(px, pz, r * 0.6, r * 0.6), m.y + 0.5, passes) + r, pz);
  }
  return { kind: m.model, p, q: p.slice(), o: p.slice(), awake: false, still: 0, t: 0, woke: 0, heard: 99, age: 99 };
}

function loose(m: Mutant, B: Bones, p: number[], v: number[], kill: Killing | null, down: boolean, alive: boolean): Rag {
  const b = m.body!, n = B.names.length;
  /* the way it goes: the blow's, or back off its heels */
  let ux = kill && kill.v > 0 ? kill.ux : -Math.sin(m.yaw), uz = kill && kill.v > 0 ? kill.uz : -Math.cos(m.yaw);
  const ul = Math.hypot(ux, uz) || 1;
  ux /= ul; uz /= ul;
  /* what the blow put into the part it struck is taken from what it put into the whole */
  const local = kill && kill.at && kill.v > 0 ? RAG.local : 0, vy = b.vy;
  let ly = b.y;
  for (let i = 0; i < n; i++) ly = Math.min(ly, p[i * 3 + 1] - B.r[i]);
  /* the shove is taken out of how it was moving and put back by height: struck about the chest, a body goes over its
     feet rather than off them. Dead, it is put back only as much as the blow was going its way across the floor, and
     no harder than RAG.shove: a chop comes down, and drops what it kills where it stood (the fight shoves the living
     along the line whatever the swing, and a light one at full tilt; a corpse sent so went flying) */
  const w = kill?.way ?? { x: ux, y: 0, z: uz }, wl = Math.hypot(w.x, w.y, w.z) || 1;
  const kv = kill?.v ?? 0, bx = b.vx - ux * kv, bz = b.vz - uz * kv;
  const sv = alive ? kv : Math.min(RAG.shove, kv * Math.max(0, (w.x * ux + w.z * uz) / wl));
  for (let i = 0; i < n; i++) {
    const h = (p[i * 3 + 1] - ly) / B.ht - 0.5, s = (down ? 0 : RAG.slump * h) + sv * (1 - local) * (1 + (down ? 0 : RAG.tip * h));
    v.push(bx + ux * s, vy, bz + uz * s);
  }
  if (local && kill?.at) {
    const A = kill.at, J = (alive ? kv : Math.min(RAG.shove, kv)) * b.mass * local, f: number[] = [];
    let near = 0, nd = Infinity, sum = 0;
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(p[i * 3] - A.x, p[i * 3 + 1] - A.y, p[i * 3 + 2] - A.z);
      if (d < nd) { nd = d; near = i; }
      const k = Math.max(0, 1 - d / RAG.spread);
      f.push(k * k);
      sum += k * k * B.kg[i];
    }
    if (sum <= 0) { f[near] = 1; sum = B.kg[near]; }
    for (let i = 0; i < n; i++) {
      if (!f[i]) continue;
      const dv = Math.min(RAG.most, (J * f[i]) / sum);
      v[i * 3] += (w.x / wl) * dv; v[i * 3 + 1] += (w.y / wl) * dv; v[i * 3 + 2] += (w.z / wl) * dv;
    }
  }
  const q = p.map((c, k) => c - v[k] * STEP), wound = kill?.at ? nearest(B, p, kill.at) : undefined;
  return { kind: m.model, p, q, o: p.slice(), awake: true, still: 0, t: 0, woke: 0, heard: 99, age: 0, ...(wound !== undefined ? { wound } : {}) };
}

/** what a corpse's points pass through: the living (they are kept apart from it otherwise) */
const passes = (d: Dyn) => d.kind === 'body';

/** where it is said to be: the middle of its middle points on the plan, and the lowest of it */
export function ragAt(R: Rag): V3 {
  const B = bones(R.kind);
  let x = 0, z = 0, y = Infinity;
  for (const i of B.mid) { x += R.p[i * 3]; z += R.p[i * 3 + 2]; }
  for (let i = 0; i < B.names.length; i++) y = Math.min(y, R.p[i * 3 + 1] - B.r[i]);
  return { x: x / B.mid.length, y, z: z / B.mid.length };
}

/** how fast it moved this step, on the whole (its points by their weight, as it is reckoned still by) (m/s) */
export function ragSpeed(R: Rag): number {
  const B = bones(R.kind), { p, o } = R;
  let moving = 0;
  for (let i = 0; i < B.names.length; i++) {
    const k = i * 3;
    moving += B.kg[i] * ((p[k] - o[k]) ** 2 + (p[k + 1] - o[k + 1]) ** 2 + (p[k + 2] - o[k + 2]) ** 2);
  }
  return Math.sqrt(moving / B.mass) / dt;
}

/** a step of every corpse: woken by what moves into it, then those awake, together, so they can meet each other and
 *  what walks among them; keeping to the budget */
export function updateCorpses(sim: Sim): void {
  /* the dead, and the knocked down: a body loose while it is on the floor is held to its feet, which are where the
     fight has it (it never moves them), and does not sleep until it is up again */
  const dead = sim.cast.filter(m => m.rag);
  if (!dead.length) return;
  const owner = new Map(dead.map(m => [m.rag!, m]));
  const movers = moving(sim), walkers = sim.cast.filter(m => !m.dead && m.body).map(m => m.body!);
  walkers.push(sim.player.body);
  for (const m of dead) {
    const R = m.rag!;
    if (m.dead) { m.px = m.x; m.py = m.y; m.pz = m.z; }
    if (R.awake) continue;
    /* asleep: woken by a door, a platform or a crate moving into it, or by anything walking into it */
    const box = bounds(R);
    if (movers.some(d => meetsBox(box, d, 0.1)) || walkers.some(b => meetsBody(box, b) && treads(R, b))) wakeRag(R, sim.tick);
  }
  let awake = 0;
  for (const m of dead) if (m.rag!.awake) awake++;
  /* past the budget, the longest awake sleeps where it is, if it has been awake long enough to be down (a fall is
     over in half a second); never one still in the air */
  while (awake > RAG.budget) {
    let oldest: Rag | null = null;
    for (const m of dead) if (m.dead && m.rag!.awake && m.rag!.t > RAG.down && (!oldest || m.rag!.woke < oldest.woke)) oldest = m.rag!;
    if (!oldest) break;
    sleep(oldest);
    awake--;
  }
  /* one just struck is held still a moment (sim/moves.ts, HITSTOP): not moved, keeping the way it was knocked for after */
  const live = dead.filter(m => m.rag!.awake && !(m.stop > 0)).map(m => m.rag!);
  for (const R of live) begin(sim, R, owner.get(R)!);
  /* what touches them: whoever walks into one (not its own feet), each other, and what moves into them */
  for (const R of live) for (const b of walkers) if (b !== owner.get(R)!.body) kicked(R, b);
  const box = new Map(dead.map(m => [m.rag!, bounds(m.rag!)]));
  live.forEach((R, i) => {
    const a = box.get(R)!;
    for (const m of dead) {
      const S = m.rag!, j = live.indexOf(S);
      if (S !== R && (j < 0 || j > i) && !(m.stop > 0) && meetsBox(a, box.get(S)!)) meet(R, S, sim.tick);
    }
  });
  for (const R of live) for (const d of movers) pushedOut(R, d);
  for (const m of dead) {
    const R = m.rag!;
    /* held: drawn where it is, its hold run down here (sim/cast.ts, updateCast) */
    if (m.stop > 0) { m.stop = Math.max(0, m.stop - dt); for (let k = 0; k < R.p.length; k++) R.o[k] = R.p[k]; continue; }
    if (!R.awake) continue;
    if (scratch.has(R)) finish(sim, R, !m.dead);
    if (!m.dead) continue;
    const a = ragAt(R);
    m.x = a.x; m.y = a.y; m.z = a.z;
  }
}

function sleep(R: Rag): void {
  R.awake = false;
  for (let k = 0; k < R.p.length; k++) R.q[k] = R.o[k] = R.p[k];
}

/** wake it: something moved it */
export function wakeRag(R: Rag, tick: number): void {
  if (R.awake) return;
  R.awake = true; R.still = 0; R.t = 0; R.woke = tick;
}

/** the box about all its points */
function bounds(R: Rag): Box {
  const B = bones(R.kind), b: Box = { x0: Infinity, y0: Infinity, z0: Infinity, x1: -Infinity, y1: -Infinity, z1: -Infinity };
  for (let i = 0; i < B.names.length; i++) {
    const k = i * 3, r = B.r[i];
    b.x0 = Math.min(b.x0, R.p[k] - r); b.x1 = Math.max(b.x1, R.p[k] + r);
    b.y0 = Math.min(b.y0, R.p[k + 1] - r); b.y1 = Math.max(b.y1, R.p[k + 1] + r);
    b.z0 = Math.min(b.z0, R.p[k + 2] - r); b.z1 = Math.max(b.z1, R.p[k + 2] + r);
  }
  return b;
}
const meetsBox = (a: Box, b: Box, pad = 0) =>
  a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.y0 < b.y1 + pad && a.y1 > b.y0 - pad && a.z0 < b.z1 + pad && a.z1 > b.z0 - pad;
const meetsBody = (a: Box, b: Body) => a.x0 < b.x + b.r && a.x1 > b.x - b.r && a.y0 < b.y + b.h && a.y1 > b.y && a.z0 < b.z + b.r && a.z1 > b.z - b.r;

/** what is moving this step: a door on its way, a platform under way, a crate sliding */
function moving(sim: Sim): Box[] {
  const out: Box[] = [];
  for (const d of sim.doors) if (d.t !== (d.def.stuck ? d.t : d.open ? 1 : 0)) out.push(d.dyn);
  for (const p of sim.platforms) if (p.moving) out.push(p.dyn);
  for (const o of sim.loose.all) if (o.awake) out.push(o.dyn);
  return out;
}

/** a walker is walking into it: some point of it more than a centimetre inside the walker, which is coming at it (one
 *  standing still in it does not wake it: it is not kicked) */
function treads(R: Rag, b: Body): boolean {
  const B = bones(R.kind), { p } = R;
  for (let i = 0; i < B.names.length; i++) {
    const k = i * 3, dx = p[k] - b.x, dz = p[k + 2] - b.z;
    if (p[k + 1] + B.r[i] < b.y || p[k + 1] - B.r[i] > b.y + b.h || b.vx * dx + b.vz * dz <= 0) continue;
    if (Math.hypot(dx, dz) < b.r + B.r[i] - RAG.stir) return true;
  }
  return false;
}

/** whoever walks into it kicks the points in their way aside, as its legs and what they meet would share their
 *  momentum: a limb by what it weighs, so it is swept aside, and the trunk by the whole body, so it shifts. Each is
 *  brought up to that share of how fast the walker comes at it, and to no more than half, so the walker goes on through
 *  rather than carrying it off before it; one standing still in it does not move it. The walker is not slowed: a corpse
 *  is not in anyone's way (engine.md §6, bodies with physics, as built) */
function kicked(R: Rag, b: Body): void {
  if (!Number.isFinite(b.mass)) return;
  const B = bones(R.kind), legs = RAG.kick.legs * b.mass, { p, o } = R;
  for (let i = 0; i < B.names.length; i++) {
    const k = i * 3, y = p[k + 1];
    if (y + B.r[i] < b.y || y - B.r[i] > b.y + b.h) continue;
    const dx = p[k] - b.x, dz = p[k + 2] - b.z, d = Math.hypot(dx, dz), over = b.r + B.r[i] - d;
    if (over <= 0 || d < 1e-6) continue;
    /* what it is going away from the walker this step, against what it should: pushed the rest, and no further than
       out of the walker; what moves it this step is its speed after */
    const nx = dx / d, nz = dz / d, going = (p[k] - o[k]) * nx + (p[k + 2] - o[k + 2]) * nz;
    const share = Math.min(RAG.kick.most, legs / (legs + B.carry[i]));
    const push = Math.min(over, share * (b.vx * nx + b.vz * nz) * dt - going);
    if (push > 0) { p[k] += nx * push; p[k + 2] += nz * push; }
  }
}

/** two corpses where their points overlap: pushed apart, the lighter more. One asleep is woken only by a push worth
 *  waking for, so a body coming to rest on another does not keep both awake */
function meet(R: Rag, S: Rag, tick: number): void {
  const A = bones(R.kind), C = bones(S.kind);
  for (let i = 0; i < A.names.length; i++) for (let j = 0; j < C.names.length; j++) {
    const a = i * 3, c = j * 3, dx = S.p[c] - R.p[a], dy = S.p[c + 1] - R.p[a + 1], dz = S.p[c + 2] - R.p[a + 2];
    const rr = A.r[i] + C.r[j], d2 = dx * dx + dy * dy + dz * dz;
    if (d2 >= rr * rr || d2 < 1e-12) continue;
    const d = Math.sqrt(d2), over = rr - d;
    /* one asleep is woken by a push worth waking for, but stays put this step: what falls on it lands on it */
    if (!S.awake && over > RAG.stir) wakeRag(S, tick);
    const wa = A.w[i], wc = scratch.has(S) ? C.w[j] : 0, k = over / (d * (wa + wc));
    R.p[a] -= dx * k * wa; R.p[a + 1] -= dy * k * wa; R.p[a + 2] -= dz * k * wa;
    S.p[c] += dx * k * wc; S.p[c + 1] += dy * k * wc; S.p[c + 2] += dz * k * wc;
    /* and they drag on each other by how hard they press, so one lying on another stays on it */
    const nx = dx / d, ny = dy / d, nz = dz / d;
    let tx = R.p[a] - R.q[a] - (S.p[c] - S.q[c]), ty = R.p[a + 1] - R.q[a + 1] - (S.p[c + 1] - S.q[c + 1]), tz = R.p[a + 2] - R.q[a + 2] - (S.p[c + 2] - S.q[c + 2]);
    const vn = tx * nx + ty * ny + tz * nz;
    tx -= nx * vn; ty -= ny * vn; tz -= nz * vn;
    const t = Math.hypot(tx, ty, tz);
    if (t < 1e-9) continue;
    const f = Math.min(1, (RAG.rub * over) / t) / (wa + wc);
    R.q[a] += tx * f * wa; R.q[a + 1] += ty * f * wa; R.q[a + 2] += tz * f * wa;
    S.q[c] -= tx * f * wc; S.q[c + 1] -= ty * f * wc; S.q[c + 2] -= tz * f * wc;
  }
}

/** a door, a platform or a crate moving into its points puts them out of its way, by the shortest way out of its box */
function pushedOut(R: Rag, d: Box): void {
  const B = bones(R.kind), { p } = R;
  for (let i = 0; i < B.names.length; i++) {
    const k = i * 3, r = B.r[i];
    const outs = [d.x1 + r - p[k], p[k] - (d.x0 - r), d.y1 + r - p[k + 1], p[k + 1] - (d.y0 - r), d.z1 + r - p[k + 2], p[k + 2] - (d.z0 - r)];
    if (outs.some(v => v <= 0)) continue;
    /* never down: there is floor there, and a door coming down on it puts it to one side */
    let best = 0;
    for (const j of [1, 2, 4, 5]) if (outs[j] < outs[best]) best = j;
    const ax = best >> 1, sign = best & 1 ? -1 : 1;
    p[k + ax] += sign * outs[best];
    /* it starts the step clear of it, so the world does not take it back in */
    R.o[k + ax] = p[k + ax];
    scratch.get(R)!.moved[i] = 1;
  }
}

/** a blow on a corpse: `J` (kg m/s) given to the points near where it landed, along the way the blow was going */
export function knockRag(R: Rag, at: V3, way: V3, J: number, tick: number): void {
  const B = bones(R.kind), n = B.names.length, f: number[] = [], wl = Math.hypot(way.x, way.y, way.z) || 1;
  let sum = 0, near = 0, nd = Infinity;
  for (let i = 0; i < n; i++) {
    const d = Math.hypot(R.p[i * 3] - at.x, R.p[i * 3 + 1] - at.y, R.p[i * 3 + 2] - at.z), k = Math.max(0, 1 - d / RAG.spread);
    if (d < nd) { nd = d; near = i; }
    f.push(k * k); sum += k * k * B.kg[i];
  }
  if (sum <= 0) { f[near] = 1; sum = B.kg[near]; }
  wakeRag(R, tick);
  R.wound = near;
  /* as a killing blow is laid on (makeRag): some of it to the whole body, the rest to the part it struck */
  const whole = (J * (1 - RAG.local)) / B.mass;
  for (let i = 0; i < n; i++) {
    const dv = Math.min(RAG.most, whole + (J * RAG.local * f[i]) / sum) * dt / wl;
    R.q[i * 3] -= way.x * dv; R.q[i * 3 + 1] -= way.y * dv; R.q[i * 3 + 2] -= way.z * dv;
  }
}

/** the first point of a corpse a segment (a to b) comes within its radius of, and how far along: for blows and shots */
export function ragOnLine(R: Rag, a: V3, b: V3, pad = 0): { t: number; at: V3 } | null {
  const B = bones(R.kind), dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, L2 = dx * dx + dy * dy + dz * dz || 1;
  let best: { t: number; at: V3 } | null = null;
  for (let i = 0; i < B.names.length; i++) {
    const k = i * 3, cx = R.p[k], cy = R.p[k + 1], cz = R.p[k + 2];
    const t = Math.max(0, Math.min(1, ((cx - a.x) * dx + (cy - a.y) * dy + (cz - a.z) * dz) / L2));
    const r = B.r[i] + pad;
    if (Math.hypot(a.x + dx * t - cx, a.y + dy * t - cy, a.z + dz * t - cz) < r && (!best || t < best.t)) best = { t, at: { x: cx, y: cy, z: cz } };
  }
  return best;
}

const dt = STEP;
/** what a step of one body needs between its halves: per point, the floor under it as the step began, whether it is
 *  under water, how far the floor has pushed it up (how hard it is pressed on it, for friction), and how fast it was
 *  coming down (for a landing). Made again each step; never saved */
interface Scratch { floor: Float64Array; wet: Uint8Array; press: Float64Array; rubbed: Float64Array; sink: Float64Array; moved: Uint8Array }
const scratch = new WeakMap<Rag, Scratch>();

/** the first half of a step: on by its speed, down by its weight, held to its bones */
function begin(sim: Sim, R: Rag, m: Mutant): void {
  const w = sim.world, B = bones(R.kind), n = B.names.length, { p, q, o } = R;
  let S = scratch.get(R);
  if (!S) scratch.set(R, (S = { floor: new Float64Array(n), wet: new Uint8Array(n), press: new Float64Array(n), rubbed: new Float64Array(n), sink: new Float64Array(n), moved: new Uint8Array(n) }));
  const { floor, wet, press, rubbed, sink } = S;
  S.moved.fill(0);
  /* where each is now, and the floor under it */
  for (let i = 0; i < n; i++) {
    const k = i * 3, x = p[k], y = p[k + 1], z = p[k + 2], r = B.r[i];
    o[k] = x; o[k + 1] = y; o[k + 2] = z;
    floor[i] = w.groundBelow(rect(x, z, r * 0.6, r * 0.6), y - r * 0.4, passes);
    wet[i] = w.waterAt(x, z) > y ? 1 : 0;
  }
  /* on by their speed, down by their weight; what each does apart from the whole body dies away, as a limb's swing
     does in its joint */
  const g = RAG.gravity * dt * dt;
  let Vx = 0, Vy = 0, Vz = 0;
  for (let i = 0; i < n; i++) { const k = i * 3, c = B.kg[i] / B.mass; Vx += (p[k] - q[k]) * c; Vy += (p[k + 1] - q[k + 1]) * c; Vz += (p[k + 2] - q[k + 2]) * c; }
  for (let i = 0; i < n; i++) {
    const k = i * 3, keep = wet[i] ? RAG.air * (1 - RAG.water.drag * dt) : RAG.air, J = R.limp ? RAG.slack : RAG.joint;
    const vx = (Vx + (p[k] - q[k] - Vx) * J) * keep, vy = (Vy + (p[k + 1] - q[k + 1] - Vy) * J) * keep, vz = (Vz + (p[k + 2] - q[k + 2] - Vz) * J) * keep;
    q[k] = p[k]; q[k + 1] = p[k + 1]; q[k + 2] = p[k + 2];
    p[k] += vx; p[k + 1] += vy - g * (wet[i] ? RAG.water.weight : 1); p[k + 2] += vz;
    press[i] = 0; rubbed[i] = 0; sink[i] = -vy / dt;
  }
  /* knocked down, not dead: drawn after its feet, which the fight moves (a share of the way each step, as a speed, so
     the world still stops it); not one out cold, which goes where it is dragged */
  if (!m.dead && m.body && !R.limp) {
    let mx = 0, mz = 0;
    for (const i of B.mid) { mx += p[i * 3]; mz += p[i * 3 + 2]; }
    const dx = (m.body.x - mx / B.mid.length) * RAG.held, dz = (m.body.z - mz / B.mid.length) * RAG.held;
    for (let i = 0; i < n; i++) { p[i * 3] += dx; p[i * 3 + 2] += dz; }
  }
  tone(R, B, !m.dead && !R.limp);
  if (!R.limp) { reflexes(sim, R, B, m); stagger(sim, R, B, m); }
  /* the sticks, a few times over; the floor each time, so they cannot push a point through it */
  const St = B.sticks, A = B.apart, H = B.hinge, W = B.w;
  for (let it = 0; it < RAG.iters; it++) {
    for (let s = 0; s < St.length; s += 3) hold(p, W, St[s], St[s + 1], St[s + 2], false);
    for (let s = 0; s < A.length; s += 3) hold(p, W, A[s], A[s + 1], A[s + 2], true);
    for (let s = 0; s < H.length; s += 6) bend(p, W, H[s], H[s + 1], H[s + 2], H[s + 3], H[s + 4], H[s + 5]);
    if (R.pin) { const j = R.pin.i * 3; p[j] = R.pin.x; p[j + 1] = R.pin.y; p[j + 2] = R.pin.z; }
    for (let i = 0; i < n; i++) {
      const j = i * 3, lo = floor[i] + B.r[i];
      if (p[j + 1] >= lo) continue;
      /* pushed up out of the floor, and held where it stood on it by how hard: inside the passes, so the rest of the
         body turns about a foot the floor holds rather than dragging it along */
      const d = lo - p[j + 1], tx = p[j] - o[j], tz = p[j + 2] - o[j + 2], t = Math.sqrt(tx * tx + tz * tz);
      press[i] += d; p[j + 1] = lo;
      /* by what the floor has held it up this step, less what that has held it from already (a budget, not a drag
         each pass: one weight, not eight) */
      const c = Math.min(t, RAG.friction * press[i] - rubbed[i]);
      if (t > 0 && c > 0) { p[j] -= (tx / t) * c; p[j + 2] -= (tz / t) * c; rubbed[i] += c; }
    }
  }
}

/** the frame of three points (a, b, c): the way a to b, then square to it toward c, then square to both; as the nine
 *  numbers of a turn, by columns */
function frameOf(p: number[], [a, b, c]: number[]): number[] {
  let ex = p[b * 3] - p[a * 3], ey = p[b * 3 + 1] - p[a * 3 + 1], ez = p[b * 3 + 2] - p[a * 3 + 2];
  const el = Math.sqrt(ex * ex + ey * ey + ez * ez) || 1;
  ex /= el; ey /= el; ez /= el;
  const fx = p[c * 3] - p[a * 3], fy = p[c * 3 + 1] - p[a * 3 + 1], fz = p[c * 3 + 2] - p[a * 3 + 2];
  let nx = ey * fz - ez * fy, ny = ez * fx - ex * fz, nz = ex * fy - ey * fx;
  const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  nx /= nl; ny /= nl; nz /= nl;
  return [ex, ey, ez, ny * ez - nz * ey, nz * ex - nx * ez, nx * ey - ny * ex, nx, ny, nz];
}

/** muscle tone (RAG.tone): each point pulled a share of the way toward where it is as it stands, in the frame its
 *  trunk has now. A pull on where it is, not on where it was, so it is a speed: the body keeps its shape a moment as
 *  it goes over, then lets go */
function tone(R: Rag, B: Bones, alive: boolean): void {
  if (!B.core) return;
  const T = RAG.tone, age = R.age ?? 99, left = Math.max(0, 1 - age / T.last), k = Math.max(T.start * left * left, alive ? T.alive : 0);
  if (k <= 0) return;
  const { p } = R, F = frameOf(p, B.core), F0 = B.frame0, c = [0, 1, 2].map(j => (p[B.core![0] * 3 + j] + p[B.core![1] * 3 + j] + p[B.core![2] * 3 + j]) / 3);
  for (let i = 0; i < B.names.length; i++) {
    /* where it stands, in the trunk's own frame (F0 turned back), then in the trunk's frame now (F) */
    const rx = B.rest[i * 3] - B.c0[0], ry = B.rest[i * 3 + 1] - B.c0[1], rz = B.rest[i * 3 + 2] - B.c0[2];
    const u = rx * F0[0] + ry * F0[1] + rz * F0[2], v = rx * F0[3] + ry * F0[4] + rz * F0[5], w = rx * F0[6] + ry * F0[7] + rz * F0[8];
    const s = k * B.tone[i], j = i * 3;
    p[j] += (c[0] + u * F[0] + v * F[3] + w * F[6] - p[j]) * s;
    p[j + 1] += (c[1] + u * F[1] + v * F[4] + w * F[7] - p[j + 1]) * s;
    p[j + 2] += (c[2] + u * F[2] + v * F[5] + w * F[8] - p[j + 2]) * s;
  }
}

/** the point of a body nearest a place */
function nearest(B: Bones, p: number[], at: V3): number {
  let best = 0, bd = Infinity;
  for (let i = 0; i < B.names.length; i++) {
    const d = (p[i * 3] - at.x) ** 2 + (p[i * 3 + 1] - at.y) ** 2 + (p[i * 3 + 2] - at.z) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

/** reflexes (engine.md §6, *Reflexes, as built*): what a body does with its hands and legs in the moment it has, as
 *  targets for a few of its points, pulled toward a share of the way each step. `latency`: nothing is quicker than this
 *  (s). `brace`: knocked down and toppling past `lean` (the sine of its trunk's tilt), its hands reach out and down the
 *  way it goes, to the floor or the wall they meet, for the `alive` seconds of its fall, fading (held longer, an arm
 *  of one bone braced on the floor props the body back up). `clutch`: dying, the hand
 *  nearest goes toward where it was struck (as far as its arm reaches), from `from` to `to` seconds. `guard`: struck while it is down, its hands come
 *  up to its face for `time` seconds. `writhe`: a worm dying thrashes, `amp` metres side to side, `hz` a second, for `time` seconds. No
 *  hand is moved faster than `most` (m/s) */
export const REFLEX = {
  latency: 0.08,
  brace: { pull: 0.2, lean: 0.35, alive: 0.5 },
  clutch: { pull: 0.15, from: 0.1, to: 0.7 },
  guard: { pull: 0.25, time: 0.6 },
  writhe: { amp: 0.12, hz: 2.5, time: 1.6 },
  most: 4,
};

/** a point of the model as it stands (x, y, z), put where it is now in the frame of its trunk (F; F0 as it stands, c
 *  the trunk's middle now) */
function placed(B: Bones, F: number[], F0: number[], c: number[], x: number, y: number, z: number): [number, number, number] {
  const rx = x - B.c0[0], ry = y - B.c0[1], rz = z - B.c0[2];
  const u = rx * F0[0] + ry * F0[1] + rz * F0[2], v = rx * F0[3] + ry * F0[4] + rz * F0[5], w = rx * F0[6] + ry * F0[7] + rz * F0[8];
  return [c[0] + u * F[0] + v * F[3] + w * F[6], c[1] + u * F[1] + v * F[4] + w * F[7], c[2] + u * F[2] + v * F[5] + w * F[8]];
}

/** point i pulled `k` of the way toward (x, y, z), no faster than a hand moves (a speed, as tone is) */
function reach(p: number[], i: number, x: number, y: number, z: number, k: number): void {
  const j = i * 3, dx = (x - p[j]) * k, dy = (y - p[j + 1]) * k, dz = (z - p[j + 2]) * k, d = Math.sqrt(dx * dx + dy * dy + dz * dz), cap = REFLEX.most * dt;
  const s = d > cap ? cap / d : 1;
  p[j] += dx * s; p[j + 1] += dy * s; p[j + 2] += dz * s;
}

function reflexes(sim: Sim, R: Rag, B: Bones, m: Mutant): void {
  const X = REFLEX, age = R.age ?? 99, alive = !m.dead, { p } = R;
  if ((R.guard ?? 0) > 0) R.guard = Math.max(0, R.guard! - dt);
  if (age < X.latency) return;
  if (B.writhe && !alive && age < X.writhe.time) writhe(R, B, age);
  if (!B.core) return;
  const F = frameOf(p, B.core), F0 = B.frame0;
  /* which way it stands now: its own up (and forward), as it stands, turned as its trunk is */
  const up = placed(B, F, F0, [0, 0, 0], B.c0[0], B.c0[1] + 1, B.c0[2]), fwd = placed(B, F, F0, [0, 0, 0], B.c0[0], B.c0[1], B.c0[2] + 1);
  const lean = Math.hypot(up[0], up[2]);
  /* the hand that goes to the wound: of those that are not it, the one whose shoulder is nearest it as it stands */
  let clutch = -1;
  if (!alive && R.wound !== undefined && age > X.clutch.from && age < X.clutch.to) {
    let bd = Infinity;
    const W = [0, 1, 2].map(k => B.rest[R.wound! * 3 + k]);
    B.hands.forEach((h, j) => {
      /* not a hand on the arm that was struck: as it stands, its arm passes near the wound */
      const S = [0, 1, 2].map(k => B.rest[h.from * 3 + k]), H = [0, 1, 2].map(k => B.rest[h.hand * 3 + k]), a = H.map((v, k) => v - S[k]);
      const t = Math.max(0, Math.min(1, a.reduce((x, v, k) => x + v * (W[k] - S[k]), 0) / a.reduce((x, v) => x + v * v, 0)));
      if (Math.hypot(...[0, 1, 2].map(k => S[k] + a[k] * t - W[k])) < 0.15) return;
      const d = Math.hypot(...[0, 1, 2].map(k => S[k] - W[k]));
      if (d < bd) { bd = d; clutch = j; }
    });
  }
  const head = B.at.head ?? B.at.hd;
  B.hands.forEach((h, j) => {
    if (alive && (R.guard ?? 0) > 0 && head !== undefined) {
      /* struck while down: hands up in front of its face */
      const k = head * 3;
      reach(p, h.hand, p[k] + fwd[0] * 0.18, p[k + 1] + fwd[1] * 0.18, p[k + 2] + fwd[2] * 0.18, X.guard.pull);
    } else if (j === clutch) {
      /* the arm laid toward the wound, across the front of it, at its own length: an arm of one bone cannot bend to it,
         and a hand pulled nearer its shoulder than the arm is long swings the whole arm about */
      const k = R.wound! * 3, s = h.from * 3, fade = 1 - (age - X.clutch.from) / (X.clutch.to - X.clutch.from);
      let dx = p[k] - p[s], dy = p[k + 1] - p[s + 1], dz = p[k + 2] - p[s + 2];
      const d = Math.hypot(dx, dy, dz) || 1;
      dx = dx / d + fwd[0] * 0.5; dy = dy / d + fwd[1] * 0.5; dz = dz / d + fwd[2] * 0.5;
      const e = Math.hypot(dx, dy, dz) || 1, L = h.reach;
      reach(p, h.hand, p[s] + (dx / e) * L, p[s + 1] + (dy / e) * L, p[s + 2] + (dz / e) * L, X.clutch.pull * fade);
    } else if (alive && lean > X.brace.lean && age < X.brace.alive) {
      const fade = 1 - age / X.brace.alive;
      /* knocked over: out and down the way it goes, as far as its arm reaches or the first thing it meets. (Not dying:
         the dying do not catch themselves, and an arm of one bone braced on the floor props a body like a strut) */
      const s = h.from * 3, dx = (up[0] / lean) * 0.7, dz = (up[2] / lean) * 0.7, L = h.reach * 0.95;
      const ex = p[s] + dx * L, ey = p[s + 1] - 0.7 * L, ez = p[s + 2] + dz * L;
      const t = sim.world.raycast(p[s], p[s + 1], p[s + 2], ex, ey, ez, passes);
      reach(p, h.hand, p[s] + (ex - p[s]) * t, p[s + 1] + (ey - p[s + 1]) * t, p[s + 2] + (ez - p[s + 2]) * t, X.brace.pull * fade);
    }
  });
}

/** stagger steps (engine.md §6, *Stagger steps, as built*): a body still trying to stand steps to catch itself before
 *  it goes down. Where its weight is going (its middle, and its speed by how long a body that tall takes to fall: the
 *  capture point) is past `slack` metres from between its feet, it swings the foot further from there to it, lifted
 *  `lift` metres, in `time` seconds, no further from its hip than `reach` of its leg; meanwhile its trunk is held over
 *  its feet, `upright` of the way each step. Knocked down, it tries for `alive` seconds and `steps` steps, then lets go
 *  and falls: its knees are sent forward at `give` m/s, so one balanced on the feet it has stepped to does not stand
 *  there while the fight has it on the floor. The dying do not step: a dying step toward a wall took the slump from a
 *  body killed against it */
export const STAGGER = { slack: 0.12, lift: 0.12, time: 0.22, reach: 0.55, upright: 0.045, alive: 0.45, steps: 2, give: 1.5 };

function stagger(sim: Sim, R: Rag, B: Bones, m: Mutant): void {
  const X = STAGGER, age = R.age ?? 99, { p } = R;
  if (m.dead || !B.legs.length) return;
  if (age > X.alive) {
    /* it gives up: its knees go (once, as its time to try runs out), so one that has caught itself still goes down, as
       the fight has it */
    if (R.stride !== undefined && age - dt <= X.alive && B.core) {
      const F = frameOf(p, B.core), fwd = placed(B, F, B.frame0, [0, 0, 0], B.c0[0], B.c0[1], B.c0[2] + 1);
      for (const L of B.legs) { const j = L.knee * 3; p[j] += fwd[0] * X.give * dt; p[j + 1] -= X.give * 0.5 * dt; p[j + 2] += fwd[2] * X.give * dt; }
    }
    R.stride = null;
    return;
  }
  if (R.stride === undefined) R.stride = null;
  const most = X.steps, taken = R.steps ?? 0;
  /* its middle, how fast it is going, and how high it is over its feet */
  let cx = 0, cy = 0, cz = 0, vx = 0, vz = 0;
  for (let i = 0; i < B.names.length; i++) {
    const k = i * 3, w = B.kg[i] / B.mass;
    cx += p[k] * w; cy += p[k + 1] * w; cz += p[k + 2] * w; vx += (p[k] - R.q[k]) / dt * w; vz += (p[k + 2] - R.q[k + 2]) / dt * w;
  }
  const feet = B.legs.map(L => [p[L.foot * 3], p[L.foot * 3 + 1], p[L.foot * 3 + 2]]);
  const fx = feet.reduce((a, f) => a + f[0], 0) / feet.length, fz = feet.reduce((a, f) => a + f[2], 0) / feet.length;
  const fy = Math.min(...feet.map(f => f[1])), hc = Math.max(0.2, cy - fy), k = Math.sqrt(hc / RAG.gravity);
  const px = cx + vx * k, pz = cz + vz * k;
  /* its trunk held over its feet while it is still trying, less as it gives up: all of it, by how high it is over its
     feet, which tips it about them. (Held by the three points of its trunk's frame, as first built, one shoulder was
     pulled and not the other, and the trunk turned on its feet like a top, three quarters of a turn in half a second) */
  const hold = X.upright * (1 - age / X.alive);
  for (let i = 0; i < B.names.length; i++) {
    const j = i * 3, lean = Math.max(0, (p[j + 1] - fy) / hc);
    p[j] += (fx - cx) * hold * lean; p[j + 2] += (fz - cz) * hold * lean;
  }
  if (!R.stride && taken < most && Math.hypot(px - fx, pz - fz) > X.slack) {
    /* the foot further from where its weight is going steps there, as far as the leg lets it from its hip */
    let leg = 0, far = -1;
    B.legs.forEach((_, j) => { const d = Math.hypot(feet[j][0] - px, feet[j][2] - pz); if (d > far) { far = d; leg = j; } });
    const L = B.legs[leg], hx = p[L.hip * 3], hz = p[L.hip * 3 + 2];
    let tx = px - hx, tz = pz - hz;
    const d = Math.hypot(tx, tz), most = L.len * X.reach;
    if (d > most) { tx *= most / d; tz *= most / d; }
    R.stride = { leg, x0: feet[leg][0], z0: feet[leg][2], x1: hx + tx, z1: hz + tz, s: 0 };
  }
  const S = R.stride;
  if (!S) return;
  S.s = Math.min(1, S.s + dt / X.time);
  const L = B.legs[S.leg], e = S.s * S.s * (3 - 2 * S.s), x = S.x0 + (S.x1 - S.x0) * e, z = S.z0 + (S.z1 - S.z0) * e;
  const r = B.r[L.foot], ground = sim.world.groundBelow(rect(x, z, r * 0.6, r * 0.6), p[L.hip * 3 + 1], passes);
  reach(p, L.foot, x, ground + r + X.lift * Math.sin(Math.PI * S.s), z, 0.5);
  if (S.s >= 1) { R.stride = null; R.steps = taken + 1; }
}

/** a worm dying thrashes: bent one way and the other across its length, its ends against its middle, dying away. A
 *  wave that ran down it, as first built, swam it along the floor as a snake goes, two metres and more; this one
 *  stands, and what it would move the whole worm by is taken out, so it thrashes where it dies */
function writhe(R: Rag, B: Bones, age: number): void {
  const X = REFLEX.writhe, { p } = R, n = B.names.length, fade = 1 - age / X.time, w = X.hz * Math.PI * 2;
  const d: number[] = [];
  let mx = 0, mz = 0;
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1) * 3, b = Math.min(n - 1, i + 1) * 3, tx = p[b] - p[a], tz = p[b + 2] - p[a + 2], tl = Math.hypot(tx, tz) || 1;
    /* across it, on the plan; a speed, as all of it is */
    const v = X.amp * w * Math.cos(w * age) * Math.cos((Math.PI * i) / (n - 1)) * fade * dt;
    d.push((-tz / tl) * v, (tx / tl) * v);
    mx += d[i * 2] * B.kg[i]; mz += d[i * 2 + 1] * B.kg[i];
  }
  mx /= B.mass; mz /= B.mass;
  for (let i = 0; i < n; i++) { p[i * 3] += d[i * 2] - mx; p[i * 3 + 2] += d[i * 2 + 1] - mz; }
}

/** the second half: the world, point by point (what it ran into stops it there); the floor's drag; asleep if still */
function finish(sim: Sim, R: Rag, living: boolean): void {
  const w = sim.world, B = bones(R.kind), n = B.names.length, { p, q, o } = R, S = scratch.get(R)!;
  let moving = 0, landed = 0, lx = 0, ly = 0, lz = 0;
  const floored: number[] = [];
  for (let i = 0; i < n; i++) {
    const k = i * 3, fall = S.sink[i];
    if (collide(w, p, o, i, B.r[i], S)) {
      if (fall > landed) { landed = fall; lx = p[k]; ly = p[k + 1]; lz = p[k + 2]; }
      /* the floor holds it up: it keeps no speed into it, nor any it was pushed up by */
      q[k + 1] = p[k + 1];
      floored.push(i);
    }
    moving += B.kg[i] * ((p[k] - o[k]) ** 2 + (p[k + 1] - o[k + 1]) ** 2 + (p[k + 2] - o[k + 2]) ** 2);
  }
  /* what met the floor only now, on its way across it, is dragged by what is left of how hard it met it */
  for (const i of floored) {
    const k = i * 3, vx = p[k] - q[k], vz = p[k + 2] - q[k + 2], v = Math.hypot(vx, vz);
    const keep = v > 0 ? Math.max(0, 1 - Math.max(0, RAG.friction * S.press[i] - S.rubbed[i]) / v) : 0;
    q[k] = p[k] - vx * keep; q[k + 2] = p[k + 2] - vz * keep;
  }
  scratch.delete(R);
  R.t += dt; R.heard += dt; R.age = (R.age ?? 99) + dt;
  if (landed > RAG.thud && R.heard > RAG.gap) { R.heard = 0; sfx(sim.game, 'thud', { x: lx, y: ly, z: lz }, B.mass > 150); }
  /* still: its weight, on the whole, hardly moving (a hand twitching under it does not keep it awake) */
  R.still = Math.sqrt(moving / B.mass) / dt < RAG.sleep.speed ? R.still + dt : 0;
  if (!living && (R.still > RAG.sleep.after || (R.t > RAG.sleep.most && grounded(B, p, S.floor)))) sleep(R);
}

/** some of it is on the floor */
function grounded(B: Bones, p: number[], floor: Float64Array): boolean {
  for (let i = 0; i < B.names.length; i++) if (p[i * 3 + 1] - B.r[i] <= floor[i] + 0.02) return true;
  return false;
}

/** two points held at `len` (or, `least`, at least `len`) apart, each moved by its share: the lighter more */
function hold(p: number[], W: number[], a: number, b: number, len: number, least: boolean): void {
  const ka = a * 3, kb = b * 3, dx = p[kb] - p[ka], dy = p[kb + 1] - p[ka + 1], dz = p[kb + 2] - p[ka + 2];
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (d < 1e-9 || (least && d >= len)) return;
  const wa = W[a], wb = W[b], k = (d - len) / (d * (wa + wb));
  p[ka] += dx * k * wa; p[ka + 1] += dy * k * wa; p[ka + 2] += dz * k * wa;
  p[kb] -= dx * k * wb; p[kb + 1] -= dy * k * wb; p[kb + 2] -= dz * k * wb;
}

/** a joint that bends one way: c kept on the `way` side of the line a to b (forward is square to it and to the side
 *  from s0 to s1), moved back onto the line if not, and b with it by their shares */
function bend(p: number[], W: number[], a: number, b: number, c: number, s0: number, s1: number, way: number): void {
  const A = a * 3, Bk = b * 3, C = c * 3, S0 = s0 * 3, S1 = s1 * 3;
  const ux = p[Bk] - p[A], uy = p[Bk + 1] - p[A + 1], uz = p[Bk + 2] - p[A + 2];
  const sx = p[S1] - p[S0], sy = p[S1 + 1] - p[S0 + 1], sz = p[S1 + 2] - p[S0 + 2];
  let fx = uy * sz - uz * sy, fy = uz * sx - ux * sz, fz = ux * sy - uy * sx;
  const fl = Math.sqrt(fx * fx + fy * fy + fz * fz);
  if (fl < 1e-9) return;
  fx /= fl; fy /= fl; fz /= fl;
  const d = ((p[C] - p[Bk]) * fx + (p[C + 1] - p[Bk + 1]) * fy + (p[C + 2] - p[Bk + 2]) * fz) * way;
  if (d >= 0) return;
  const wb = W[b], wc = W[c], kb = (d * way * wb) / (wb + wc), kc = (d * way * wc) / (wb + wc);
  p[C] -= fx * kc; p[C + 1] -= fy * kc; p[C + 2] -= fz * kc;
  p[Bk] += fx * kb; p[Bk + 1] += fy * kb; p[Bk + 2] += fz * kb;
}

/** a point from where it began the step (o) to where it would go (p): down or up first, then along each way on the
 *  plan, as a body walks; what stops it on a way takes its speed that way. A lip lower than a little of it is gone
 *  over. True if it is on the floor. */
function collide(w: World, p: number[], o: number[], i: number, r: number, S: Scratch): boolean {
  const k = i * 3, h = r * 0.6, x0 = o[k], z0 = o[k + 2], press = S.press;
  let y = p[k + 1], onFloor = false;
  /* the floor under where it began, found as the step began (unless something moved it since: then again) */
  const f0 = rect(x0, z0, h, h), gr = S.moved[i] ? w.groundBelow(f0, o[k + 1] - r * 0.4, passes) : S.floor[i];
  if (y - r <= gr + 1e-4) { press[i] += Math.max(0, gr + r - y); y = gr + r; onFloor = true; }
  else if (y > o[k + 1]) {
    const c = w.ceilingAbove(f0, o[k + 1] + r * 0.4, passes, y + r + 0.05);
    if (y + r > c) y = Math.max(gr + r, c - r);
  }
  let x = p[k], z = p[k + 2], into = 0, wx = false, wz = false;
  if (x !== x0 && w.overlap(rect(x, z0, h, h), y - r * 0.4, y + r * 0.8, passes)) { into += Math.abs(x - x0); x = x0; wx = true; }
  if (z !== z0 && w.overlap(rect(x, z, h, h), y - r * 0.4, y + r * 0.8, passes)) { into += Math.abs(z - z0); z = z0; wz = true; }
  /* a wall it is pressed against holds it by how hard it is pressed, along it as well as down it, so a body thrown at
     one slumps down it, not off it or along it; but no point holds more than a little more than its own weight, so a
     foot caught on a ledge's face does not hang a body from it */
  if (into > 0 && !onFloor) {
    const ty = y - o[k + 1], tx = wx ? 0 : x - x0, tz = wz ? 0 : z - z0, t = Math.hypot(tx, ty, tz);
    if (t > 0) {
      const keep = Math.max(0, 1 - Math.min(RAG.grip * into, RAG.cling * RAG.gravity * dt * dt) / t);
      y = o[k + 1] + ty * keep; x = x0 + tx * keep; z = z0 + tz * keep;
    }
  }
  if (x !== x0 || z !== z0) {
    const g2 = w.groundBelow(rect(x, z, h, h), y - r * 0.4, passes);
    if (y - r <= g2 + 1e-4) { press[i] += Math.max(0, g2 + r - y); y = g2 + r; onFloor = true; }
  }
  /* stopped on a way, it is back where it began the step that way, so it has no speed left along it */
  p[k] = x; p[k + 1] = y; p[k + 2] = z;
  return onFloor;
}
