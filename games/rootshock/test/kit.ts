import type { LevelDef } from '../src/content/types';
import { STATION } from '../src/content/station';
import { buildUpper } from '../src/content/levels/upper';
import { STEP } from '../src/core/loop';
import { makeSim, step, type Sim } from '../src/sim/sim';
import { noInput, type Input } from '../src/sim/input';

/* What the tests share: the upper station and a new game on it, and time passing with an input held. */

let built: LevelDef | undefined;
/** the upper station, as a game begins on it: built once a file, when first asked for */
export const upper = (): LevelDef => (built ??= buildUpper(STATION.ladders));

/** a new game on the upper station */
export const fresh = (seed = 7): Sim => makeSim(upper(), { seed, station: STATION });

/** `secs` of steps, holding the same input throughout (none, unless given) */
export const hold = (s: Sim, secs: number, inp: Partial<Input> = {}): void => {
  for (let t = 0; t < secs; t += STEP) step(s, { ...noInput(), ...inp });
};
