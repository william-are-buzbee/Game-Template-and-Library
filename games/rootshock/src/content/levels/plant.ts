import { PI } from '../../core/math';
import type { LadderDef, LevelDef } from '../types';
import { beginLevel, bx, door, finishLevel, item, ladder, floor, mut, note, P, room, stack, stairs, use, type LevelInfo, type RoomOpts } from '../build/plan';
import { MED, OFF, UTIL, corpse, desk, genset, liftRoom, medbed, overgrow, panel, shelf, tbl } from '../build/furnish';

/* The plant level, 500 m down. Dead and black. Engineering on the spine (the machine shop, the parts store, Distribution
   with every floor's service connection, the backup plant); the link corridor; the generator hall, Gen-1 at its east
   end against the exhaust shaft, where the green comes down. The west end is going green too.
   Ported from the first engine (archive/first-engine.html, buildPlant). */

export const PLANT: LevelInfo = { id: 'plant', name: 'Plant level', c: 'ENG' };

export function buildPlant(ladders: Record<string, LadderDef>): LevelDef {
  beginLevel(PLANT, ladders);
  const D = floor(PLANT, { terrain: [-10, -30, 270, 30] }), E: RoomOpts = { ...UTIL, c: 'ENG' };
  /* the main shaft: the hoist, the foot of A2 (collapsed above), and A3 on down into the sump */
  liftRoom(D, 0, -2, 5, -1); room(D, 'Shaft station', 6, -2, 6, 6, { ...UTIL, em: 1, safe: 1 }); door(D, 13, -1, { sg: [['Engineering', 'w'], ['Shaft station', 'e']] });
  ladder(D, 'A2', 11, 3.2, 9.2, 2.2, PI / 2, true); ladder(D, 'A3', 7, 3.2, 8.8, 1.2, PI / 2, false);
  /* Engineering: the corridor down the spine, rooms north (doors on row 13) and south (row 16) */
  const wc = room(D, 'West corridor', 14, -2, 52, 4, { ...E, em: 1 }); room(D, 'East corridor', 66, -2, 52, 4, { ...E, em: 1 });
  const shop = room(D, 'Machine shop', 18, -14, 18, 10, { ...E, ht: 4 }); door(D, 27, -3, { stuck: true, sg: [['Machine shop', 's']] });
  tbl(D, 20, -10, 0.9, 3.4, 0x54504a); bx(D, 28, -12, 1.8, 1.1, 0.9, 0x3f5148); P(D, 'cyl', 28, -12, 0.3, 0.5, 0.3, 0x2c3833, { y: 1.1, c: 0 }); bx(D, 33.2, -8.8, 0.9, 1.3, 1.8, 0x3f5148); shelf(D, 31, -4.6, 3, 0.5);
  item(D, 'adjwrench', 20, -11.2, 0.78); item(D, 'fuse', 20, -9.8, 0.78); note(D, 'work', 20, -8.6, 0.78); item(D, 'batt', 31, -4.7, 1.06, 2);
  corpse(D, 26.8, -7.2, 0x6a5a34, false, { label: 'Engineer', say: 'Something has rooted through him. His card is still good.', keys: ['e'] });
  room(D, 'Parts store', 38, -14, 12, 10, E); door(D, 43, -3, { card: 'e', sg: [['Parts', 's']] });
  shelf(D, 38.6, -9.2, 0.5, 4); shelf(D, 49.4, -9.2, 0.5, 4); shelf(D, 43.6, -13.4, 3, 0.5); item(D, 'kit', 38.7, -10.8, 1.06); item(D, 'kit', 49.3, -7.6, 1.06); item(D, 'batt', 43.6, -13.3, 1.06, 3); item(D, 'pipe', 43.6, -8.8, 0.02);
  room(D, 'Distribution', 52, -14, 16, 10, E); door(D, 59, -3, { sg: [['Distribution', 's']] });
  ['OPS', 'CARGO', 'RES', 'HORT', 'HYD'].forEach((c, k) => panel(D, c, 54.8 + k * 2.4, -13.93, 's')); bx(D, 59.6, -13, 6.4, 0.01, 0.9, 0xb89b2e, { y: 0.012, c: 0 });
  for (const x of [53.2, 66.8]) bx(D, x, -8.8, 0.9, 2, 2.4, 0x4a4f55); note(D, 'route', 64, -5.2, 0.02);
  room(D, 'Chillers', 70, -14, 16, 10, E); door(D, 77, -3, { sg: [['Chillers', 's']] }); for (let q = 0; q < 3; q++) bx(D, 72.8 + q * 5.2, -10, 2, 2.2, 3, 0x5a6a72); bx(D, 78, -13.9, 7.6, 0.2, 0.2, 0x3d4042, { y: 2.8, c: 0 });
  room(D, 'Backup plant', 88, -14, 10, 10, E); door(D, 93, -3, { sg: [['Backup plant', 's']] }); genset(D, 'ENG', 90.4, -12.8, 90.4, -11.4); genset(D, 'ENG', 95.2, -12.8, 95.2, -11.4);
  room(D, 'Infirmary', 18, 4, 8, 10, { ...MED, c: 'ENG' }); door(D, 21, 3, { sg: [['Infirmary', 'n']] }); medbed(D, 18.8, 8); item(D, 'bandage', 24.8, 11.2, 0.02, 2); item(D, 'medkit', 22.8, 12.8, 0.02);
  room(D, 'Water treatment', 28, 4, 20, 10, E); door(D, 37, 3, { sg: [['Water', 'n']] }); for (const x of [32, 40]) P(D, 'cyl', x, 9.2, 2.4, 3, 2.4, 0x3b4d57);
  for (const z of [6, 10]) bx(D, 46.4, z, 1, 1.6, 1.4, 0x3f5148); bx(D, 38, 13.93, 9.6, 0.14, 0.14, 0x3d4042, { y: 2.4, c: 0 });
  room(D, 'Control room', 50, 4, 14, 10, E); door(D, 57, 3, { sg: [['Control', 'n']] }); tbl(D, 57, 12.4, 5, 0.8);
  for (let k = 0; k < 5; k++) { bx(D, 52.6 + k * 2.2, 13.97, 1, 0.7, 0.06, 0x22262a, { y: 1.2, c: 0 }); bx(D, 52.6 + k * 2.2, 13.93, 0.9, 0.6, 0.02, [0.05, 0.07, 0.08], { y: 1.25, c: 0, pw: [[0.04, 0.05, 0.05], [2.3, 2.6, 2.75]] }); }
  item(D, 'batt', 55, 12.4, 0.78);
  room(D, 'Locker room', 66, 4, 12, 10, E); door(D, 71, 3, { sg: [['Lockers', 'n']] }); for (let k = 0; k < 6; k++) bx(D, 67.2 + k * 1.8, 13.75, 0.8, 1.9, 0.5, 0x4d5863); bx(D, 72, 8.8, 3, 0.42, 0.4, 0x44484c); item(D, 'hardhat', 73.2, 8.8, 0.44); item(D, 'bandage', 71, 8.8, 0.44);
  overgrow(D, wc, 0.6, true); overgrow(D, shop, 0.7, true);
  mut(D, 'vine', 16.24, 1, { yaw: PI / 2 }); mut(D, 'vine', 25, -4.24, { yaw: PI }); mut(D, 'rootworm', 22, -9.2); mut(D, 'rootworm', 30, -7.6); mut(D, 'rootworm', 27.2, -11.6); mut(D, 'rootworm', 34, -0.8); mut(D, 'rootworm', 42, 0.8);
  mut(D, 'husk', 82, -0.8); mut(D, 'husk', 106, 0.8, { post: 1, yaw: -PI / 2 });
  /* the link, and the generator hall */
  door(D, 119, -1, { sg: [['Generator hall', 'w'], ['Engineering', 'e']] }); room(D, 'Link corridor', 120, -2, 30, 4, { ...E, em: 1 }); door(D, 151, -1, { sg: [['Gen-1', 'w']] });
  room(D, 'Generator hall', 152, -12, 98, 24, { ...E, ht: 16, em: 1 });
  /* Gen-1 control, over the link at the hall's west end, a storey up: a band of glass the length of its east wall, so
     whoever ran Gen-1 watched it while they did. A stair climbs to it beside the link. */
  const T1 = floor(PLANT, { terrain: [-10, -30, 270, 30], y0: 5, li: 1 }); stack(D, T1);
  room(D, 'Control stair', 134, 2, 16, 2, { ...E, ht: 8.4, em: 1 }); stairs(D, T1, 136, 2, 2, 12, 'e');
  room(T1, 'Control landing', 148, -2, 2, 6, { ...E, ht: 3.4, em: 1 }); door(T1, 149.4, -3, { sg: [['Gen-1 control', 's']] });
  room(T1, 'Gen-1 control', 134, -12, 16.75, 8, { ...OFF, c: 'ENG', ht: 3.4, lc: [0.8, 0.84, 0.9] });
  /* its east wall is a partition with the glass in it; past it, the hall's air at this height */
  room(T1, 'Generator hall', 151.25, -12, 0.75, 8, { ...E, ht: 3.4, em: 1, air: 1 });
  for (let z = -11; z <= -5; z += 2) door(T1, 151, z, { seal: true, glass: true, glaze: 'full', c: 'ENG' });
  /* the desk along the glass, its screens dead, a chair pushed back; the mimic board on the back wall */
  for (let r = 0; r < 3; r++) { desk(T1, 147.8, -10.2 + r * 2.2, 0.8, 1.9, { c: 0x4a4f55 }); bx(T1, 146.4, -10.2 + r * 2.2, 0.5, 0.45, 0.5, 0x2c2f33); }
  bx(T1, 134.03, -8, 0.06, 1.6, 5.6, 0x2a3036, { y: 1 }); for (let q = 0; q < 6; q++) bx(T1, 134.07, -10.6 + q * 1.04, 0.02, 0.1, 0.3, [0.3, 0.05, 0.04], { y: 1.4 + (q % 3) * 0.4, c: 0, pw: [[0.3, 0.05, 0.04], [2.2, 2.9, 2.3]], pc: 'ENG' });
  /* Gen-1: 24 m of housing with its stacks, and the board on its west face: the fuse socket and the main breaker */
  bx(D, 229, 0, 22, 5, 9, 0x44525a); bx(D, 229, 0, 20, 1, 8, 0x36424a, { y: 5, c: 0 }); for (const x of [220, 238]) for (const z of [-4, 4]) P(D, 'cyl', x, z, 0.9, 6, 0.9, 0x2c3338, { y: 6, c: 0 });
  for (const q of [-1, 1]) bx(D, 229, q * 4.56, 22.4, 0.04, 0.12, 0x8a7a2a, { y: 2.4, c: 0 }); bx(D, 229, 0, 24, 0.01, 11, 0xb89b2e, { y: 0.012, c: 0 });
  bx(D, 217.2, 0, 0.34, 2, 1.7, 0x3a3f44); bx(D, 217, -0.6, 0.06, 0.3, 0.2, 0x15181b, { y: 1.05, c: 0 }); bx(D, 216.96, 0.6, 0.08, 0.4, 0.08, 0xa82a20, { y: 1, c: 0, rz: 0.5 });
  bx(D, 217, 0, 0.06, 0.1, 0.1, [0.3, 0.05, 0.04], { y: 1.7, c: 0, pw: [[2.9, 2.15, 2.1], [2.2, 2.9, 2.3]] }); bx(D, 216.2, 0, 0.9, 0.01, 1.9, 0xb89b2e, { y: 0.013, c: 0 });
  use(D, 'fuse', 216.4, -0.6, 1.2); use(D, 'breaker', 216.4, 0.6, 1.2);
  /* the hall's fittings: transformers along both walls, cable trays and ducts overhead, the crane that set Gen-1 in place */
  for (let x = 162; x <= 210; x += 12) for (const z of [-10.8, 10.8]) { bx(D, x, z, 2.4, 2.4, 1.4, 0x3f4a50); bx(D, x, z, 2, 0.3, 1, 0x2c3338, { y: 2.4, c: 0 }); for (const q of [-0.7, 0, 0.7]) P(D, 'cyl', x + q, z, 0.18, 0.5, 0.18, 0xb8bcc0, { y: 2.7, c: 0 }); }
  /* trays and ducts along the walls, end to end */
  for (const [z, q] of [[-12, 1], [12, -1]]) { bx(D, 201, z + q * 0.3, 98, 0.12, 0.6, 0x5a5d60, { y: 6, c: 0 }); bx(D, 201, z + q * 0.25, 98, 0.5, 0.5, 0x3d4042, { y: 9, c: 0 }); }
  for (const z of [-11.8, 11.8]) bx(D, 200, z, 96, 0.5, 0.4, 0x5a5d60, { y: 13.4, c: 0 }); bx(D, 229, 0, 1.2, 1, 23.4, 0xc9a227, { y: 13.6, c: 0 }); bx(D, 229, -3, 1.6, 0.8, 1.6, 0x2a2c2e, { y: 13, c: 0 });
  bx(D, 229, -3, 0.06, 6.4, 0.06, 0x2a2c2e, { y: 6.6, c: 0 }); bx(D, 229, -3, 0.5, 0.4, 0.5, 0x8a7a2a, { y: 6.3, c: 0 });
  bx(D, 190, -11.82, 0.8, 1.9, 0.18, 0xa82a20); item(D, 'axe', 190, -10.8, 0.02); item(D, 'batt', 170, 9, 0.02); mut(D, 'husk', 174, -4.8); mut(D, 'husk', 198, 6.8);
  for (const [x, z] of [[160, 6], [186, -6], [212, 2]]) mut(D, 'bonemid', x, z); // a few of the bone line's middle years
  /* the east end, where the green comes down the exhaust shaft */
  overgrow(D, { x0: 240, z0: -12, x1: 250, z1: 12, ht: 16 }, 1.1, true); for (const [x, z] of [[242, -8], [246, 4], [244, -0.8], [238, 8]]) mut(D, 'rootworm', x, z); mut(D, 'vine', 249.76, -4, { yaw: -PI / 2 });
  door(D, 251, -1, { sg: [['Exhaust shaft', 'w']] }); const xl = room(D, 'Exhaust link', 252, -2, 4, 4, { ...E, em: 1 }); door(D, 257, -1);
  const xs = room(D, 'Exhaust shaft', 258, -6, 8, 12, { ...E, em: 1 }); ladder(D, 'B2', 263.2, -4.8, 261.2, -3.2, PI / 2, true); overgrow(D, xl, 1.2, true); overgrow(D, xs, 1.2, true); mut(D, 'rootworm', 260, 2.8);
  return finishLevel([9.2, 2.2, PI / 2]); // at the foot of A2, for ?level=plant
}
