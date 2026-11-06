import type { LevelDef, StationDef } from '../content/types';
import { syncBody } from './body';
import type { Input } from './input';
import { load, save, SAVE_VERSION, type Save } from './save';
import { makeSim, step, type Sim } from './sim';

/* A run: the station's levels as you have found them. Each level is a sim of its own world; they share one game (what
   you carry and know, the power) and one draw of chance. Only the level you are on moves; one you have left waits as
   you left it, as in the first engine. Ladders, stairs and the lift ask to go to another level; the run takes you,
   to the other level's mark for the way you came. */

export interface Run {
  /** null for a level on its own (the test bed): nowhere to go */
  station: StationDef | null;
  /** the levels made so far, by id */
  sims: Map<string, Sim>;
  /** the one you are on */
  here: Sim;
}

const built = new Map<string, LevelDef>();
/** a level's content, built once per page (levels are pure functions of their seed) */
export function levelDef(station: StationDef, id: string): LevelDef {
  let L = built.get(id);
  if (!L) {
    const e = station.levels.find(l => l.id === id);
    if (!e) throw new Error('no level ' + id + ' in the station');
    built.set(id, (L = e.build()));
  }
  return L;
}

/** a new run. `opening`: begin with it (sim/opening.ts), if starting on the station's first level */
export function makeRun(station: StationDef, o: { seed?: number | string; start?: string; opening?: boolean } = {}): Run {
  const id = o.start ?? station.start, sim = makeSim(levelDef(station, id), { seed: o.seed, station, opening: o.opening });
  return { station, sims: new Map([[id, sim]]), here: sim };
}

export function stepRun(run: Run, input: Input): void {
  step(run.here, input);
  const g = run.here.game, t = g.travel;
  if (t) { g.travel = null; travel(run, t.level, t.mark); }
}

/** go to another level, arriving at its mark (and at its start if it has no such mark) */
export function travel(run: Run, id: string, mark: string): void {
  const from = run.here;
  if (!run.station) return;
  let to = run.sims.get(id);
  if (!to) {
    to = makeSim(levelDef(run.station, id), { station: run.station, game: from.game, rng: from.rng });
    run.sims.set(id, to);
  }
  /* you, as you were, at the far end */
  const m = to.world.def.marks[mark] ?? to.world.def.start, a = from.player, p = to.player, b = p.body;
  Object.assign(p, {
    yaw: m.yaw, pitch: 0, crouch: false, wantStand: false, air: a.air, airMax: a.airMax, slow: 0, load: 0, slam: 0, thrown: false, pace: 1, down: false, stepD: 0, fly: a.fly,
  });
  b.x = m.x; b.y = m.y; b.z = m.z; b.vx = b.vz = b.vy = 0; b.ground = true; b.h = 1.8; b.on = null;
  syncBody(b);
  to.hands = structuredClone(from.hands);
  to.lighting = null; // the power may have changed while you were away
  run.here = to;
  from.game.events.push({ type: 'level', id });
}

/** a level on its own, as a run (the test bed) */
export function soloRun(sim: Sim): Run {
  return { station: null, sims: new Map([[sim.world.def.id, sim]]), here: sim };
}

/* a run saved: each level you have been to, and which you are on */
export interface RunSave { v: number; here: string; levels: Record<string, Save> }

export function saveRun(run: Run): RunSave {
  const levels: Record<string, Save> = {};
  for (const id of [...run.sims.keys()].sort()) levels[id] = save(run.sims.get(id)!);
  return { v: SAVE_VERSION, here: run.here.world.def.id, levels };
}

export function loadRun(station: StationDef, data: RunSave): Run {
  if (data.v !== SAVE_VERSION) throw new Error(`save version ${data.v}, expected ${SAVE_VERSION}`);
  /* the level you are on first: its save holds the game as it is now; the others share it */
  const here = load(levelDef(station, data.here), data.levels[data.here], { station });
  const sims = new Map([[data.here, here]]);
  for (const [id, s] of Object.entries(data.levels)) {
    if (id === data.here) continue;
    sims.set(id, load(levelDef(station, id), s, { station, game: here.game, rng: here.rng }));
  }
  /* making the other levels drew on the run's chance: put it back as it was */
  here.rng.restore(data.levels[data.here].rng);
  return { station, sims, here };
}
