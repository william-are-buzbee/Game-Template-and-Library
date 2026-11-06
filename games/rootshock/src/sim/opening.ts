import { STEP } from '../core/loop';
import { REEL } from './moves';
import { leftGrafted, type Mutant } from './cast';
import { say, sfx } from './game';
import type { Input } from './input';
import type { Sim } from './sim';

/* The opening (world.md §8, The opening): the first minutes of a new game, in the isolation suite. The wing's feed was
   cut days ago; the suite runs on its own small backup set, kept for its locks, its readers and its pumps, and failing:
   its fittings flicker, low. Most of it is the station working: the night round on the dark balcony, the readers, the
   fail-safe locks, the noise the other patient makes and the night round coming to it, sweeping each room it opens with
   its beam. What is kept here is only what has to be timed:
   - wake: your pump's empty-bag alarm, and you weak from days under. When you have stood at your door or window a few
     seconds (or, if you do not, a while later) the other patient sees you, and starts on the glass;
   - scene: the night round comes down to the noise: it strikes the other patient down, drags them out into the hall and
     grafts them there, and searches the rooms, yours last (sim/cast.ts, its first time round);
   - left: it has gone back up to the wing. A few seconds on, the suite's set dies, and its fail-safe locks let go
     (sim/movers.ts, failSafe);
   - black: everything out, a moment, before the suite's emergency cells come up (they wait to, as real ones do);
   - done. */

export type Phase = 'wake' | 'scene' | 'left' | 'black' | 'done';

export interface Opening {
  phase: Phase;
  /** seconds in this phase */
  t: number;
  /** the pump still sounding, and seconds to its next round of notes */
  alarm: boolean;
  next: number;
  /** seconds left of being weak from the days under; seconds you have stood at your door or window */
  weak: number;
  near: number;
}

/** how near your door or window counts as at it (m), and how long you stand there before the other patient sees you (s),
 *  or how long it waits for you to before they do anyway; how long after the night round has gone before the suite's set
 *  dies; how long the night round may take about the suite before it dies regardless; how long it is black before the cells
 *  come up; how long you are weak, and how slow (your pace at the start, as a share); how often the pump goes round */
export const OPENING = { near: 2.5, dwell: 3, wait: 60, fail: 10, late: 200, black: 2, weak: 90, slow: 0.55, alarm: 2.2 };

const patients = (sim: Sim) => sim.cast.filter(m => m.ai === 'patient');
const nightRound = (sim: Sim): Mutant | undefined => sim.cast.find(m => m.round && m.torch);

/** a new game's start: the suite's set still running (it is dead by the time you are out) and its fail-safe locks on */
export function makeOpening(sim: Sim): Opening {
  const C = sim.game.station?.circuits.ISO;
  if (C) { C.back = true; C.on = true; }
  for (const d of sim.doors) if (d.def.failsafe) d.unlocked = false;
  sim.lighting = null;
  return { phase: 'wake', t: 0, alarm: true, next: 0.6, weak: OPENING.weak, near: 0 };
}

/** a game that does not begin with the opening: the other patient taken already, grafted and out cold where the night
 *  round left them */
export function noOpening(sim: Sim): void {
  const at = nightRound(sim)?.round?.find(s => s.graft);
  for (const m of patients(sim)) if (at) leftGrafted(sim, m, at);
}

/** the pump on your pole (the level's use of kind 'pump') */
const pumpAt = (sim: Sim) => sim.world.def.uses.find(u => u.kind === 'pump');

/** you are at your door or window: near one of them, of your own room */
function atDoor(sim: Sim): boolean {
  const b = sim.player.body, R = sim.world.roomAt(b.x, b.y + 0.5, b.z);
  if (R?.name !== 'Isolation room 1') return false;
  return sim.doors.some(d => (d.def.glass || d.def.failsafe) && Math.hypot((d.def.x0 + d.def.x1) / 2 - b.x, (d.def.z0 + d.def.z1) / 2 - b.z) < OPENING.near);
}

/** a step of it */
export function updateOpening(sim: Sim): void {
  const O = sim.opening;
  if (!O) return;
  const g = sim.game;
  if (O.weak > 0) O.weak = Math.max(0, O.weak - STEP);
  /* the pump, three notes every couple of seconds, until you silence it */
  const P = pumpAt(sim);
  if (O.alarm && P && (O.next -= STEP) <= 0) { O.next = OPENING.alarm; sfx(g, 'pump', P); }
  if (O.phase === 'done') return;
  O.t += STEP;
  switch (O.phase) {
    case 'wake':
      O.near = atDoor(sim) ? O.near + STEP : 0;
      if (O.near < OPENING.dwell && O.t < OPENING.wait) break;
      /* they see you awake, and start on the glass */
      for (const m of patients(sim)) if (!m.dead && m.state === 'wait') { m.state = 'bang'; m.wt = 0.3; m.st = 0; m.tense = 0; }
      O.phase = 'scene'; O.t = 0;
      break;
    case 'scene': {
      /* until the night round has been through the suite and gone back up: on its way to the last of its first-time stops,
         out past the station, with what it drags */
      const m = nightRound(sim), R = m?.round;
      const past = !m || m.dead || !R || m.lap > 0 || m.beat >= R.findIndex(s => !s.once) - 1;
      if (past || O.t > OPENING.late) { O.phase = 'left'; O.t = 0; }
      break;
    }
    case 'left':
      if (O.t < OPENING.fail) break;
      fail(sim);
      O.phase = 'black'; O.t = 0;
      break;
    case 'black': {
      /* the suite's emergency cells, on their delay: they stutter up (the tubes' starters), dim */
      if (O.t < OPENING.black) break;
      const C = g.station?.circuits.CELLS;
      if (C && !C.back) { C.back = true; g.events.push({ type: 'power', loud: false, quiet: true }); if (P) sfx(g, 'strike', P); }
      O.phase = 'done'; O.t = 0;
      break;
    }
  }
}

/** the suite's set dies: its hum runs down, and every light on it goes, the cells held off a moment (sim/sim.ts follows
 *  the power) */
function fail(sim: Sim): void {
  const g = sim.game, C = g.station?.circuits.ISO, cells = g.station?.circuits.CELLS;
  if (!C?.back) return;
  C.back = false;
  if (cells) cells.back = false;
  g.events.push({ type: 'power', loud: false });
  const at = pumpAt(sim);
  if (at) sfx(g, 'winddown', at);
}

/** silence the pump: what its screen says */
export function silencePump(sim: Sim): void {
  const O = sim.opening;
  if (O) O.alarm = false;
  sfx(sim.game, 'take', pumpAt(sim));
  say(sim.game, 'EMPTY BAG, the screen says, and over it MAINS FAIL, and the clock: 14 NOV, 03:12. The bag went up on the eleventh.');
}

/** weak from the days under: your legs slow, and they will not run. Try, and they go from under you a moment */
export function weakened(sim: Sim, input: Input): Input {
  const O = sim.opening;
  if (!O || O.weak <= 0) return input;
  sim.player.pace *= OPENING.slow + (1 - OPENING.slow) * (1 - O.weak / OPENING.weak);
  if (!input.run) return input;
  const h = sim.hands, moving = input.forward !== 0 || input.strafe !== 0;
  if (moving && h.stag <= 0 && h.down <= 0) {
    h.stag = REEL.you;
    sfx(sim.game, 'reel');
    sim.game.events.push({ type: 'shake', k: 0.25 });
  }
  return { ...input, run: false };
}
