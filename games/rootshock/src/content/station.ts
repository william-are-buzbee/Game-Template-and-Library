import type { StationDef } from './types';
import { buildUpper } from './levels/upper';
import { buildMain } from './levels/main';
import { buildPlant } from './levels/plant';
import { buildSump, buildSumpDeep } from './levels/sump';
import { buildCave } from './levels/cave';

/* The station: its levels top to bottom, its circuits, its ladderways. Ported from NEWSTATION in the first engine. */

const ladders: StationDef['ladders'] = {
  A2: { broken: 'The ladderway is collapsed below this landing. Rubble fills the shaft.', ends: ['main', 'plant'] },
  CV: { say: 'Through root and broken concrete, and the station ends. Rock, and the sound of water.', ends: ['main', 'cave'] },
  A3: { say: 'Down the main shaft, and the last rungs go into black water.', ends: ['plant', 'sump'] },
  B2: { say: 'Fifty metres down the exhaust shaft, into the warm.', ends: ['main', 'plant'] },
  B1: { need: { power: 'CARGO', msg: 'A fan door is sealed over the ladderway. Its release runs off the Cargo backup set.' }, say: 'The exhaust shaft, rung over rung against the draught.', ends: ['upper', 'main'] },
};

export const STATION: StationDef = {
  levels: [
    { id: 'upper', name: 'Upper station', circuit: 'OPS', build: () => buildUpper(ladders) },
    { id: 'main', name: 'Main level', circuit: 'RES', build: () => buildMain(ladders) },
    { id: 'plant', name: 'Plant level', circuit: 'ENG', build: () => buildPlant(ladders) },
    { id: 'sump', name: 'The sump', circuit: 'HYD', build: () => buildSump(ladders) },
    { id: 'sumpdeep', name: 'The sump, drowned', circuit: 'DEEP', build: () => buildSumpDeep(ladders) },
    { id: 'cave', name: 'The cave', circuit: 'CAVE', build: () => buildCave(ladders) },
  ],
  circuits: {
    OPS: { on: true, back: true, tag: 'upper station' },
    /* the Security wing hangs off Ops; the survivors cut its feed to blind the cameras on their side (world.md §8) */
    SEC: { on: true, back: false, broken: true, feed: 'OPS', tag: 'Security wing' },
    /* the isolation suite's own backup set, kept for its locks, its readers and its pumps whatever the wing's feed does:
       dead by the time you are out (sim/opening.ts runs it through a new game's first minutes, failing); and the suite's
       emergency cells, their own supply, which come up when the set dies (held off a moment, as they wait to) */
    ISO: { on: true, back: false, tag: 'Isolation suite backup set' },
    CELLS: { on: true, back: true, tag: 'Isolation suite emergency cells' },
    /* the muster hall, in two branches off the electrical room's board: the hall, and its east bays with the stair up to
       the operations room */
    HALL: { on: true, back: false, feed: 'OPS', tag: 'Muster hall west' },
    EAST: { on: true, back: false, feed: 'OPS', tag: 'Muster hall east' },
    /* critical operations power: the operations room and Security's PA, straight off Ops' set, their panel inside the
       operations room's own walls. Nothing outside them can switch it (world.md §8) */
    CRIT: { on: true, back: false, feed: 'OPS', tag: 'Operations, critical' },
    RES: { on: true, back: false, tag: 'main level' },
    ENG: { on: true, back: false, tag: 'plant level' },
    HYD: { on: true, back: false, broken: true, tag: 'the sump' },
    LIFT: { on: true, back: false },
    CARGO: { on: false, back: false, tag: 'Cargo' },
    HORT: { on: true, back: true, tag: 'Horticulture' },
    /* never wired: the drowned level's lights went with the water, and the cave never had any */
    DEEP: { on: false, back: false },
    CAVE: { on: false, back: false },
  },
  ladders,
  /* "This morning the main generator dropped." */
  main: false,
  start: 'upper',
  intro: 'The lights go out, and the lock on your door lets go.',
  names: { upper: 'Upper station', main: 'Main level', plant: 'Plant level', sump: 'The sump', sumpdeep: 'The sump, drowned', cave: 'The cave' },
};
