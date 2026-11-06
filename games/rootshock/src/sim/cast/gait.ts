import { STEP } from '../../core/loop';
import type { Sim } from '../sim';
import type { Mutant } from '../cast';
import { step_ } from './move';

/* How each kind of the cast gets about (engine.md §6, the cast by velocity; how the cast move): its paces, by what it is
   doing; how fast it changes its pace, and turns; and its feet. A behaviour asks for a pace by name (`pace(m, 'hunt')`)
   and moves by the ways in move.ts, which do the rest by its gait. So two kinds can share a behaviour and still move
   as themselves (the night round is a husk after you, slower), and a new kind is a row here, not a change to how
   anything walks. A kind with no row takes its behaviour's; one fixed where it is, none.

   One of the cast can be given its own pace by the level (`walk`, m/s, in mut()'s options): every pace of its kind's is
   scaled to it, the hunt as well as the walk, so a slow one is slow at everything. And its own steps (`steps`, a minute,
   walking): with the pace they make its stride. Not given, a slower one takes fewer steps and shorter, each by the square
   root of how much slower it is, as a slow walk does. Its footfalls come as often as its steps; its walk is drawn, and its
   prints laid, by its stride and steps against its kind's (`stride`, `cadence`), so a slow one shuffles and does not
   skate. Security's seven have theirs from the bench (mockups/mutants.html). */

const dt = STEP;

/** its footfalls: the sound, the time between them walking and going fast (s), and whether they are a big thing's.
 *  Fast is the behaviour's to say (a skitter hunting), or above `over` m/s */
export interface Feet { sound: string; walk: number; fast: number; big?: boolean; over?: number }

export interface Gait {
  /** its paces (m/s), by what it is doing: `walk` its own, and any other its behaviour asks for. One it has no pace for,
   *  it walks */
  pace: Readonly<{ walk: number } & Record<string, number>>;
  /** how fast it changes its own pace (m/s²): a skitter at once, a thresher slowly */
  acc: number;
  /** how quickly it turns to the way it walks: a share of the turn left, a second (as angLerp takes it) */
  turn: number;
  /** one that walks where it faces (a big body), the most it turns (rad/s): it goes only as much of its pace as it faces
   *  the way, and turns where it stands to a way behind it. Without it, it steps any way at once and turns as it goes */
  heading?: number;
  feet?: Feet;
  /** one given its own pace: that pace, how long its steps are, and how many it takes, each against its kind's */
  scale?: number; stride?: number; cadence?: number;
}

/* Security's staff and the Commons' husks (cast/husk.ts): on their rounds and at their posts (shifting about one,
   `shift`), a hurry to an alarm (faster again, `rally`, with another in sight hurrying), slowly to a board or a door
   left open, more slowly looking about, and after you; circling while another is at you (`hover`); away when hurt, and
   lying low after. A round is walked slowly (cast/round.ts) */
const HUSK: Gait = {
  pace: { walk: 1.3, shift: 0.6, round: 1.0, search: 1.2, shut: 1.4, fix: 1.6, lurk: 1.6, hover: 1.3, answer: 2.6, rally: 3.4, hunt: 3.5, flee: 4.2 },
  acc: 18, turn: 8, feet: { sound: 'hstep', walk: 0.58, fast: 0.3, over: 2 },
};

/** nothing that moves: what is fixed where it is (the grabber, the vines), and the dead */
const STILL: Gait = { pace: { walk: 0 }, acc: 0, turn: 8 };

export const GAIT: Record<string, Gait> = {
  husk: HUSK,
  /* the bone line's middle years: a longer stride (the bench's 1.5 m at 92 a minute), harder after you, quicker away,
     and a charge, shorter and slower than the thresher's */
  bonemid: { ...HUSK, acc: 20, pace: { ...HUSK.pace, walk: 1.15, hunt: 3.8, flee: 4.6, charge: 5.5 }, feet: { sound: 'hstep', walk: 0.65, fast: 0.3, over: 2, big: true } },
  /* one of the changed on the night round: as the rest, but slower to get going, and after you slower than they are */
  nightround: { ...HUSK, acc: 14, pace: { ...HUSK.pace, hunt: 3.0 } },
  /* about where it lives, then a scuttle in bursts */
  skitter: { pace: { walk: 3, hunt: 5 }, acc: 40, turn: 8, feet: { sound: 'tap', walk: 0.11, fast: 0.09 } },
  bigSkitter: { pace: { walk: 2, hunt: 4.3 }, acc: 40, turn: 8, feet: { sound: 'tap', walk: 0.2, fast: 0.16, big: true } },
  bloat: { pace: { walk: 0.55 }, acc: 3, turn: 8, feet: { sound: 'hstep', walk: 1.1, fast: 1.1, big: true } },
  /* its room, a charge, and after you on foot */
  thresher: { pace: { walk: 1.2, charge: 7.4, hunt: 2.6 }, acc: 10, turn: 8, feet: { sound: 'hstep', walk: 0.62, fast: 0.16, big: true } },
  /* a crawl; away from your light (`shy`), and away when struck */
  worm: { pace: { walk: 0.5, hunt: 1.25, shy: 1.5, flee: 2.6 }, acc: 8, turn: 8 },
  swimmer: { pace: { walk: 0.9, hunt: 2.5, flee: 3 }, acc: 10, turn: 8, feet: { sound: 'slosh', walk: 0.5, fast: 0.5 } },
  /* the other patient: weak from the days under */
  patient: { pace: { walk: 1.3 }, acc: 6, turn: 8 },
  grabber: STILL,
  dead: STILL,
};

/** a kind's gait: its own row, a big one's if it is big and there is one (the big skitter), else its behaviour's; and
 *  scaled to its own walking pace and steps, if the level gives it them */
export function gaitOf(type: string, ai: string, big: boolean, walk?: number, steps?: number): Gait {
  const G = (big && GAIT['big' + ai[0].toUpperCase() + ai.slice(1)]) || GAIT[type] || GAIT[ai] || STILL;
  if (walk === undefined || !G.pace.walk) return G;
  const k = walk / G.pace.walk, pace = { ...G.pace }, F = G.feet;
  for (const p of Object.keys(pace)) pace[p] *= k;
  const c = steps !== undefined && F ? (steps / 60) * F.walk : Math.sqrt(k);
  const feet = F && { ...F, walk: F.walk / c, fast: F.fast / c, ...(F.over !== undefined ? { over: F.over * k } : {}) };
  return { ...G, pace, ...(feet ? { feet } : {}), scale: k, stride: k / c, cadence: c };
}

/* the bush's line, old in it: the bench's stride and steps (0.7 m at 56 a minute, 0.33 m/s; its feet barely lift),
   everything it does as much slower than the changed, and slow to get going. Its stride and cadence against the husk's
   are its walk drawn (render/castView.ts) */
GAIT.plantold = { ...gaitOf('husk', 'husk', false, 0.33, 56), acc: 4 };

/** its pace (m/s) for what it is doing, by name */
export const pace = (m: Mutant, name: string): number => m.gait.pace[name] ?? m.gait.pace.walk;

/** a step of its feet: a footfall each time the last has had its time, sooner going fast. Called while it moves */
export function footfall(sim: Sim, m: Mutant, fast?: boolean): void {
  const F = m.gait.feet;
  if (!F || (m.tk -= dt) >= 0) return;
  m.tk = (fast ?? m.mv > (F.over ?? Infinity)) ? F.fast : F.walk;
  step_(sim, m, F.sound, F.big);
}
