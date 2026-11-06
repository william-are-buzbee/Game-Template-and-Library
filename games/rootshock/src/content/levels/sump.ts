import { PI } from '../../core/math';
import type { LadderDef, LevelDef } from '../types';
import { DUG } from '../materials';
import { beginLevel, bx, dive, door, finishLevel, item, ladder, lamp, floor, mut, note, P, pick, rnd, room, use, type LevelInfo, type RoomOpts } from '../build/plan';
import { column, corpse, liftRoom, shelf } from '../build/furnish';

/* The sump, 522 m down. Everything drains here; with Gen-1 dead the pumps stopped and it flooded. A 6 m hall (x 14 to 94)
   at wading depth, the pump station at its east end, and under it the drowned level: the intake gallery, where root
   mass chokes the pump intakes and the flooded link comes in from the cave. Sergeant Aldana went down there and did not
   come back. Ported from the first engine (archive/first-engine.html: buildSump, buildSumpDeep). The water is real
   now: you wade in the hall, and below you swim, with no surface to come up to. */

export const SUMP: LevelInfo = { id: 'sump', name: 'The sump', c: 'HYD' };
export const SUMPDEEP: LevelInfo = { id: 'sumpdeep', name: 'The sump, drowned', c: 'DEEP' };

export function buildSump(ladders: Record<string, LadderDef>): LevelDef {
  beginLevel(SUMP, ladders);
  const D = floor(SUMP, { terrain: [-10, -30, 270, 30], wet: 0.9 }), WT: RoomOpts = { fl: 0x2a2f30, wl: 0x4a5052, st: 0x4a5052, c: 'HYD', mat: DUG };
  liftRoom(D, 0, -2, 5, -1); room(D, 'Shaft station', 6, -2, 6, 6, { ...WT, em: 1, safe: 1, nolamp: 1 }); door(D, 13, -1, { sg: [['Sump', 'w'], ['Shaft station', 'e']] }); lamp(D, 10.8, -1.2, 6);
  ladder(D, 'A3', 11, 3.2, 9.2, 2.2, PI / 2, true);
  room(D, 'Sump', 14, -14, 80, 28, { ...WT, ht: 6, em: 1 });
  for (let x = 26; x <= 82; x += 14) { bx(D, x, -7, 0.4, 1.4, 6, 0x4a5052); bx(D, x, 7, 0.4, 1.4, 6, 0x4a5052); column(D, x, 0, 6); }
  /* pipes along both walls */
  for (const z of [-13.85, 13.85]) bx(D, 54, z, 79, 0.3, 0.3, 0x3d4042, { y: 4.4, c: 0 }); bx(D, 54, -13.91, 79, 0.18, 0.18, 0x5a4034, { y: 3.6, c: 0 });
  for (let k = 0; k < 8; k++) bx(D, rnd(18, 90), rnd(-12, 12), rnd(0.4, 1.2), 0.12, rnd(0.3, 0.9), pick([0x3a3020, 0x4a5052, 0x2c3a3c]), { y: 0.88, c: 0, ry: rnd(PI) });
  bx(D, 51, -13.4, 2.4, 0.06, 1.2, 0x2a2c2e, { y: 0.88, c: 0 }); for (let q = -1; q <= 1; q++) bx(D, 51 + q, -13.4, 0.08, 0.08, 1.2, 0x8a7a2a, { y: 0.92, c: 0 });
  dive(D, 51, -12.2, 1, 'sumpdeep', 'Dive', true); D.marks['dive:sumpdeep'] = [51, -10.8, PI];
  mut(D, 'swimmer', 34, -4); mut(D, 'swimmer', 62, 4); mut(D, 'swimmer', 78, -8); mut(D, 'swimmer', 46, 10);
  /* the pump station, the control office over it, and the filters */
  room(D, 'Pump station', 94, -10, 16, 20, { ...WT, ht: 8, em: 1 });
  for (const z of [-7, -2.4, 2.4, 7]) { P(D, 'cyl', 106.8, z, 1.4, 2.4, 1.4, 0x3b4d57); bx(D, 104, z, 1.6, 1, 1, 0x44525a); } bx(D, 109.85, 0, 0.3, 0.3, 9, 0x5a4034, { y: 3, c: 0 });
  use(D, 'look', 102, 0, 1.2, { label: 'Pump controls', text: 'Four pumps, all of them dead. The intake gauges read blocked: something below has grown into the grates. Even with power they would only cough.' });
  bx(D, 102, 0, 0.8, 1.2, 0.6, 0x3a3f44);
  room(D, 'Pump control', 96, -20, 10, 8, WT); door(D, 101, -11, { sg: [['Control', 's']] });
  bx(D, 101, -18.8, 2.4, 1, 0.7, 0x3f4448); bx(D, 101, -18.8, 0.5, 0.34, 0.06, 0x22262a, { y: 1, c: 0 }); bx(D, 101, -18.76, 0.44, 0.28, 0.02, [0.06, 0.12, 0.1], { y: 1.03, c: 0, pw: [[0.04, 0.05, 0.05], [2.2, 2.75, 2.5]] });
  note(D, 'hydro', 100, -18.9, 1.02); item(D, 'lantern', 102, -18.8, 1.02); shelf(D, 96.6, -16, 0.5, 3); item(D, 'wrench', 96.7, -17.2, 1.06); item(D, 'batt', 96.7, -14.8, 1.06, 2);
  room(D, 'Filter room', 96, 12, 10, 8, WT); door(D, 101, 11, { sg: [['Filters', 'n']] }); for (const x of [98, 103.2]) bx(D, x, 17.2, 1.4, 1.6, 1, 0x3f5148); mut(D, 'swimmer', 100, 14.8);
  return finishLevel([9.2, 2.2, PI / 2]); // at the foot of A3, for ?level=sump
}

export function buildSumpDeep(ladders: Record<string, LadderDef>): LevelDef {
  beginLevel(SUMPDEEP, ladders);
  const D = floor(SUMPDEEP, { terrain: [-10, -30, 270, 30], deep: 1 }), DW: RoomOpts = { fl: 0x1e2628, wl: 0x38423f, st: 0x38423f, lit: 'none', nolamp: 1, mat: DUG };
  room(D, 'Intake gallery', 34, -24, 34, 8, { ...DW, ht: 3.6 }); room(D, 'Flooded link', 18, -22, 16, 4, { ...DW, ht: 2.6 }); room(D, 'Intake main', 68, -22, 26, 4, { ...DW, ht: 2.6 });
  for (let k = 0; k < 4; k++) {
    const x = 39 + k * 8;
    /* a grate in the wall at the floor, and what has grown through it */
    bx(D, x, -23.85, 1.6, 1.6, 0.3, 0x2c3a3c, { c: 0 });
    for (let q = 0; q < 4; q++) P(D, 'ico', x + rnd(-1, 1), -23.9 + rnd(0, 0.3), rnd(0.6, 1.1), rnd(0.6, 1.2), rnd(0.5, 0.9), pick([0x2f4a2a, 0x4a3b2c, 0x3a5230, 0x6e2b28]), { y: rnd(0.2, 1.4), c: 0 });
  }
  for (let k = 0; k < 8; k++) bx(D, rnd(20, 90), rnd(-21.6, -17.6), rnd(0.3, 0.9), rnd(0.2, 0.5), rnd(0.3, 0.9), pick([0x2c3a3c, 0x3a3020, 0x4a5052]), { ry: rnd(PI), c: 0 });
  corpse(D, 59.2, -18.8, 0x2c3440, true, { label: 'Drowned sergeant', say: 'SGT. R. ALDANA. Four digits in grease pencil on the back of her hand.', note: 'code' });
  dive(D, 51, -18.4, 1.6, 'sump', 'Swim up'); D.marks['dive:sump'] = [51, -19.2, PI];
  dive(D, 19.2, -20.8, 1.4, 'cave', 'Swim on'); D.marks['dive:cave'] = [20.8, -20.8, -PI / 2];
  mut(D, 'swimmer', 42, -20); mut(D, 'swimmer', 52, -22); mut(D, 'swimmer', 64, -18.8); mut(D, 'swimmer', 26, -20.4); mut(D, 'swimmer', 82, -20.8);
  return finishLevel([51, -19.2, PI]); // under the intake grates, for ?level=sumpdeep
}
