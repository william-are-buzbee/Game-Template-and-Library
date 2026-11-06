import { PI, TAU, type Colour } from '../../core/math';
import type { LadderDef, LevelDef } from '../types';
import { FITTED } from '../materials';
import {
  beginLevel, bx, cave, door, finishLevel, hill, item, ladder, floor, mut, note, outline, P, pick, rnd, ROCKP, room, roughen, stack, stairs, use, vault,
  type Floor, type LevelInfo, type DoorOpts, type PRoom, type RoomOpts,
} from '../build/plan';
import {
  GR, HAB, HRT, MED, SEC, UTIL, WALK, bed, blood, body, column, corpse, desk, eggs, genset, gore, liftRoom, medbed, overgrow, shelf, tbl, tree,
} from '../build/furnish';

/* The main level, 450 m down: the Commons (a street of residences under a cavern roof, three storeys of flats on
   galleries), the Square at its east end, and Horticulture beyond the airlock. Ported from the first engine
   (archive/first-engine.html: buildMain, buildSquare, flatRect, groundFloor, buildHorticulture).
   One change: the storeys are 3.5 m apart (the first engine had 3.4), so floors fall on the 0.25 m grid (engine.md §14). */

export const MAIN: LevelInfo = { id: 'main', name: 'Main level', c: 'RES' };
const STOREY = 3.5;

/** a flat: [its door, what is inside, what is on the table, and for a body the card it carries] */
type Flat = [DoorOpts, 'clean' | 'gore' | 'worm' | 'nest' | 'post' | 'body', string, string?];

export function buildMain(ladders: Record<string, LadderDef>): LevelDef {
  beginLevel(MAIN, ladders);
  const lv = MAIN;
  const G = floor(lv, { terrain: [-10, -30, 270, 30] }), S2 = floor(lv, { terrain: [-10, -30, 270, 30], y0: STOREY, li: 1 }), S3 = floor(lv, { terrain: [-10, -30, 270, 30], y0: 2 * STOREY, li: 2 }), RF = floor(lv, { terrain: [-10, -30, 270, 30], y0: 3 * STOREY, li: 3 });
  stack(G, S2); stack(S2, S3); stack(S3, RF);
  /* the main shaft: the hoist, A2 on down (collapsed), and off the shaft station the foot of the Security elevator, the
     only way up to Security but the hoist and the exhaust shaft */
  liftRoom(G, 0, -2, 5, -1); room(G, 'Shaft station', 6, -2, 6, 6, { ...UTIL, em: 1, safe: 1 }); door(G, 13, -1, { sg: [['The Commons', 'w'], ['Shaft station', 'e']] });
  ladder(G, 'A2', 7, 3.2, 8.8, 1.2, PI / 2, false);
  room(G, 'Security elevator', 6, 6, 4, 4, { ...SEC, c: 'SEC', em: 1, noroam: 1 }); door(G, 9, 5, { sg: [['Security elevator', 'n']] });
  bx(G, 8, 9.97, 0.5, 0.4, 0.06, 0x2c2f33, { y: 1.1, c: 0 }); use(G, 'elev', 8, 9.8, 1.3, { c: 'SEC', to: 'upper' }); G.marks['elev:upper'] = [8, 7.6, 0];
  /* the cavern: the street between the rows, the plazas at either end, and its volume over the roofs */
  const CM: RoomOpts = { fl: 0x8d8a7c, wl: 0xa5a296, st: 0x3f7f6b, ht: 20, sky: 0x86a9c4, em: 1, c: 'RES' };
  room(G, 'The Commons', 14, -6, 110, 12, CM); for (const z of [-14, 6]) room(G, 'The Commons', 14, z, 4, 8, CM);
  const AIR: RoomOpts = { ...CM, air: 1, ht: 20 - 3 * STOREY, fl: 0x55524a, noroam: 1, nolamp: 1 };
  for (const z of [-14, 6]) room(RF, 'The Commons', 18, z, 114, 8, AIR); for (const z of [-22, 14]) room(RF, 'The Square', 124, z, 44, 8, AIR); for (const z of [-14, 2]) room(RF, 'The Square', 160, z, 8, 12, AIR);
  /* galleries along both fronts on storeys 2 and 3, a bridge across on each, and stairs: street to 2 at both plazas, 2 to 3 mid-street */
  const GW: RoomOpts = { ...WALK, c: 'RES', fl: 0x6a665e, wl: 0x8c887e };
  for (const z of [-6, 2]) { room(S2, 'Gallery', 14, z, 118, 4, { ...GW, ht: 3.4 }); room(S3, 'Gallery', 14, z, 110, 4, { ...GW, ht: 3.2 }); }
  room(S2, 'Bridge', 90, -2, 2, 4, { ...GW, ht: 3.4 }); room(S3, 'Bridge', 42, -2, 2, 4, { ...GW, ht: 3.2 });
  stairs(G, S2, 14, -14, 2, 8, 's'); stairs(G, S2, 14, 6, 2, 8, 'n');
  stairs(S2, S3, 78, -4, 2, 8, 'e'); stairs(S2, S3, 50, 2, 2, 8, 'w');
  for (let k = 0; k < 6; k++) { const x = 35 + 16 * k; column(G, x, -2.3, STOREY); column(G, x, 2.3, STOREY); }
  /* the street itself: the sick tree, benches, lamps, and what happened here */
  P(G, 'cyl', 82, 0, 3.6, 0.5, 3.6, 0x8a8a84); P(G, 'cyl', 82, 0, 3.3, 0.08, 3.3, 0x3a2e22, { y: 0.5, c: 0 }); tree(G, 82, 0, 5, 0.5, true);
  for (const [x, z, ns] of [[70, -1.2, 0], [94, 1.2, 0], [46, 1.2, 0], [118, -1.2, 0]]) bx(G, x, z, ns ? 0.45 : 1.8, 0.42, ns ? 1.8 : 0.45, 0x5f6266);
  for (const [x, z] of [[30, -1.5], [62, 1.5], [102, -1.5], [118, 1.5]]) { P(G, 'cyl', x, z, 0.12, 3.3, 0.12, 0x3a3d40); bx(G, x, z, 0.5, 0.12, 0.5, 0xe8eef2, { y: 3.3, c: 0, glow: 1 }); }
  bx(G, 106, 0.4, 1.8, 0.9, 0.1, 0x5b5d5f, { rz: 0.25, ry: 1.2 }); bx(G, 104.8, 2.4, 0.6, 0.6, 0.6, 0x6b5a3c, { ry: 0.6 }); blood(G, 104, 0.8, 2.4); blood(G, 58, -0.8, 1.6); blood(G, 130, 0, 1.4); gore(G, 86, -3.2, 3);
  eggs(G, 16, -12, 3); eggs(G, 16, 11, 2);
  mut(G, 'bloat', 50, 0); mut(G, 'husk', 30, -4); mut(G, 'husk', 62, 1.2); mut(G, 'husk', 94, -3.6); mut(G, 'husk', 114, 2);
  mut(S2, 'husk', 40, -4.8); mut(S2, 'husk', 106, 3.2); mut(S3, 'husk', 70, -4.8);
  /* the bone line's middle years, most of them here: along the street, and one in the Square */
  for (const [x, z] of [[46, 2], [58, -3], [78, -2], [100, 3], [142, 9]]) mut(G, 'bonemid', x, z);
  /* one of the bush's line, old in it, rooted by the street's planter, facing the way you come (until it has a place of its
     own, grown over) */
  mut(G, 'plantold', 85.5, 2.5, { post: 1, yaw: -PI / 2 });
  /* the blocks. Each is 14 by 6 m behind a facade with its doors: north z -14 to -8 (its facade -8 to -6), south 8 to 14 (6 to 8).
     Ground floors are the street's rooms; storeys 2 and 3 are flats, but for the director's at the top of the trauma centre. */
  const HB: RoomOpts = { ...HAB, c: 'RES', lc: [0.85, 0.78, 0.62] }, fl: string[] = [];
  const flat = (D: Floor, x0: number, north: boolean, dc: number, nm: string, v: Flat) => {
    const z0 = north ? -14 : 8, dz = north ? -7 : 7, cz = north ? z0 + 2.2 : z0 + 3.8, back = north ? z0 + 0.6 : z0 + 5.4;
    room(D, 'Residence ' + nm, x0, z0, 14, 6, { ...HB, fl: 0x74685a, lit: v[1] === 'worm' || v[1] === 'nest' ? 'none' : 'main', ...(v[1] === 'nest' ? { motes: 'flesh' } : {}) }); door(D, x0 + dc, dz, { ...v[0], span: 2 });
    bed(D, x0 + 0.8, z0 + 3, true, fl.length % 3 ? 0x5f6b78 : 0x7a5a50); tbl(D, x0 + 7, z0 + 3, 1.4, 0.8, 0x6b5a48); bx(D, x0 + 13.4, back, 0.45, 1.9, 0.45, 0x5a5448); bx(D, x0 + 10.8, back, 1.8, 0.45, 0.7, 0x6b5f58);
    item(D, v[2], x0 + 7, z0 + 3, 0.78); fl.push(nm);
    const cx = x0 + 7 + (v[1] === 'post' ? 3 : 0);
    if (v[1] === 'gore') { gore(D, cx, cz, 4); body(D, cx + 0.8, cz + 0.8, pick([0x4a5560, 0x8a8f96, 0x6b6f5a]), true); if (fl.length % 2) mut(D, 'skitter', cx - 2, cz); }
    else if (v[1] === 'worm') { mut(D, 'worm', cx - 1.2, cz); mut(D, 'worm', cx + 1.2, cz + 0.8); mut(D, 'worm', cx + 2.8, cz); eggs(D, x0 + 3.2, back, 2); }
    else if (v[1] === 'nest') { eggs(D, cx - 1.6, cz, 3); eggs(D, x0 + 10, back, 3); mut(D, 'skitter', cx + 1.2, cz); }
    else if (v[1] === 'post') mut(D, 'husk', cx, cz, { post: 1, yaw: north ? PI : 0 });
    else if (v[1] === 'body') corpse(D, cx + 0.8, cz, pick([0x4a5560, 0x6b6f5a, 0x7a5a50]), true, { label: 'Resident', say: 'A room card on a lanyard. Not for this flat.', keys: [v[3]] });
  };
  /* cards lock six flats (two round the Square); each card lies on a body elsewhere */
  const RV: Record<string, Flat> = {
    'N1.2': [{ open: true }, 'clean', 'ration'], 'N2.2': [{ card: 'N2.2' }, 'clean', 'medkit'], 'N3.2': [{ stuck: true }, 'gore', 'bandage'], 'N4.2': [{}, 'post', 'batt'],
    'N5.2': [{ open: true }, 'worm', 'batt'], 'N6.2': [{ card: 'N6.2' }, 'body', 'ammo9', 'C7'],
    'N1.3': [{}, 'gore', 'batt'], 'N2.3': [{ open: true }, 'nest', 'bandage'], 'N3.3': [{}, 'body', 'ration', 'N2.2'], 'N4.3': [{ card: 'N4.3' }, 'clean', 'shells'],
    'N5.3': [{}, 'body', 'batt', 'S3.2'], 'N6.3': [{ stuck: true }, 'worm', 'knife'],
    'S1.2': [{}, 'gore', 'batt'], 'S2.2': [{ open: true }, 'post', 'bandage'], 'S3.2': [{ card: 'S3.2' }, 'clean', 'medkit'], 'S4.2': [{ stuck: true }, 'nest', 'medkit'],
    'S5.2': [{}, 'clean', 'batt'], 'S6.2': [{}, 'body', 'bandage', 'N6.2'],
    'S1.3': [{ open: true }, 'clean', 'ration'], 'S2.3': [{}, 'gore', 'batt'], 'S3.3': [{ stuck: true }, 'post', 'bandage'], 'S4.3': [{}, 'nest', 'batt'],
    'S6.3': [{ open: true }, 'clean', 'peaches'],
  };
  for (let k = 0; k < 6; k++) {
    const x0 = 20 + 16 * k;
    for (const north of [true, false]) {
      const nm = (north ? 'N' : 'S') + (k + 1);
      if (RV[nm + '.2']) flat(S2, x0, north, 3, nm + '.2', RV[nm + '.2']);
      if (RV[nm + '.3']) flat(S3, x0, north, 11, nm + '.3', RV[nm + '.3']);
      groundFloor(G, x0, north, k, HB);
    }
  }
  /* the director's residence: the top of the trauma centre's block, and what keeps the lift key */
  room(S3, "Director's residence", 84, 8, 14, 6, { ...HAB, c: 'RES', fl: 0x5e5248, lc: [0.85, 0.78, 0.62], noroam: 1 }); door(S3, 95.4, 7, { sg: [['Director', 'n']] });
  bed(S3, 84.8, 11, true, 0x7a5a50); tbl(S3, 88.8, 12.8, 2, 0.8, 0x4a3a2c); note(S3, 'keeper', 88.8, 12.7, 0.78); eggs(S3, 87.2, 9.2, 4); eggs(S3, 92, 12.8, 3); gore(S3, 90.8, 10.4, 5);
  mut(S3, 'bloat', 95.6, 11.2, { sit: 1, yaw: -PI / 2 }); mut(S3, 'husk', 87.2, 10.4, { post: 1, yaw: -PI / 2 }); mut(S3, 'husk', 90.4, 12.4, { post: 1, yaw: -PI / 2 }); mut(S3, 'skitter', 89.2, 9.2);
  buildSquare(G, S2, HB, GW, CM);
  /* east: the transit tunnel and the airlock to Horticulture */
  door(G, 169, -1, { sg: [['Horticulture', 'w'], ['The Square', 'e']] }); room(G, 'Transit tunnel', 170, -2, 6, 4, { ...UTIL, c: 'RES', em: 1 });
  door(G, 177, -1, { sg: [['Airlock', 'w']] }); room(G, 'Airlock', 178, -2, 6, 4, { ...UTIL, c: 'HORT', em: 1 });
  door(G, 185, -1, { sg: [['Horticulture', 'w']] });
  buildHorticulture(G, S2);
  return finishLevel([9.2, 2.2, PI / 2]); // in the shaft station, for ?level=main
}

/* the Square, x 124 to 168 by z -22 to 22: the court (x 132 to 160, z -14 to 14) open to the cavern roof, the street coming in on the
   west and a passage out east to the tunnel; round it a band of rooms two storeys high behind a facade, with the ring gallery at storey 2 */
function buildSquare(G: Floor, S2: Floor, HB: RoomOpts, GW: RoomOpts, CM: RoomOpts): void {
  room(G, 'The Square', 132, -14, 28, 28, CM); room(G, 'The Square', 124, -6, 8, 12, CM); room(G, 'The Square', 160, -2, 8, 4, CM);
  for (const [x, z, w, d] of [[132, -14, 28, 4], [132, 10, 28, 4], [132, -10, 4, 20], [156, -10, 4, 20]]) room(S2, 'Ring', x, z, w, d, { ...GW, ht: 3.4 });
  stairs(G, S2, 136, -10, 2, 8, 'n'); stairs(G, S2, 152, 2, 2, 8, 's');
  /* the centrepiece: the planter, and a tree the size of the court, gone the way of everything near Horticulture */
  P(G, 'cyl', 146, 0, 7.6, 0.6, 7.6, 0x8a8a84); P(G, 'cyl', 146, 0, 7.2, 0.08, 7.2, 0x3a2e22, { y: 0.6, c: 0 }); P(G, 'cyl', 146, 0, 0.9, 11, 0.9, 0x4a3b2c, { y: 0.6, c: 1 });
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU + rnd(0.3), L = rnd(2.4, 4.2), y = rnd(4, 9.5);
    bx(G, 146 + Math.cos(a) * L * 0.45, -Math.sin(a) * L * 0.45, L, 0.16, 0.16, 0x40332a, { y, c: 0, ry: a, rz: 0.5 });
    P(G, 'ico', 146 + Math.cos(a) * L * 0.9, -Math.sin(a) * L * 0.9, rnd(1.2, 2.2), rnd(0.8, 1.5), rnd(1.2, 2.2), pick([0x8c4a44, 0x6e2b28, 0xb08572, 0x4f7a40]), { y: y + 0.6, c: 0 });
  }
  for (let k = 0; k < 7; k++) { const a = rnd(TAU), L = rnd(2.6, 4.4); bx(G, 146 + Math.cos(a) * L * 0.5, -Math.sin(a) * L * 0.5, L, 0.22, 0.3, 0x3a2e22, { y: 0.02, c: 0, ry: a }); }
  for (const [x, z, ns] of [[140.4, 0, 1], [151.6, 0, 1], [146, -5.6, 0], [146, 5.6, 0]]) bx(G, x, z, ns ? 0.45 : 1.8, 0.42, ns ? 1.8 : 0.45, 0x5f6266);
  for (const [x, z, n] of [[142.8, -3.6, 4], [149.2, 3.8, 3], [156, 8, 3], [134, -12, 2]]) eggs(G, x, z, n); blood(G, 138, 7.2, 2); gore(G, 155.2, -10, 3);
  mut(G, 'thresher', 146, -9); mut(G, 'bloat', 150, 8); mut(G, 'worm', 142.4, 3.2); mut(G, 'worm', 149.6, -3.2); mut(G, 'husk', 139, 6, { post: 1, yaw: PI / 2 }); mut(S2, 'skitter', 144, -12.8); mut(S2, 'skitter', 157.2, 2);
  /* the band. North and south: three rooms a side behind facades at z -16 and 14 (the street's last four ground floors and new
     ones), half a metre of wall between neighbours; west and east: two a side behind facades at x 130 and 160. Storey 2 is
     ten flats, C1 to C10, their doors on the ring. */
  const nb = { z0: -22, dz: -15 }, sb = { z0: 16, dz: 15 };
  for (const o of [nb, sb]) { groundFloor(G, 124, o === nb, 7, HB, { ...o, dc: 11, sides: [124, 137.75] }); groundFloor(G, 138, o === nb, 6, HB, { ...o, dc: 7, sides: [138.25, 151.75] }); }
  /* a shop: its north-west corner, w by d; its door's middle; and what is in it, from its corner */
  const shop = (nm: string, x: number, z: number, w: number, d: number, dx: number, dz: number, sd: 'n' | 's' | 'e' | 'w', f: (x: number, z: number) => void) => {
    room(G, nm, x, z, w, d, { ...HB }); door(G, dx, dz, { span: 2, sg: [[nm.split(' ')[0], sd]] }); f(x, z);
  };
  shop('Café', 152.25, -22, 13.75, 6, 155, -15, 's', (x, z) => { for (const q of [3.2, 8, 12.4]) tbl(G, x + q, z + 3.2, 1, 1, 0x8a7a5a); bx(G, x + 7, z + 0.6, 5, 1, 0.6, 0x6f7378); item(G, 'ration', x + 6, z + 0.6, 1.02, 2); blood(G, x + 10, z + 4.8, 1.2); });
  shop('Barbershop', 152.25, 16, 13.75, 6, 155, 15, 'n', (x, z) => { for (let q = 0; q < 3; q++) bx(G, x + 3 + q * 4, z + 4.8, 0.7, 1, 0.7, 0x7a2a2a); bx(G, x + 7, z + 5.97, 6, 1, 0.06, [0.16, 0.2, 0.22], { y: 1, c: 0 }); body(G, x + 8, z + 2.4, 0x6b6f5a, false); });
  shop('Kiosk', 124, -14, 6, 6, 131, -9, 'e', (x, z) => { bx(G, x + 4.4, z + 3, 0.6, 1, 2.4, 0x6b5a48); item(G, 'peaches', x + 4.4, z + 2, 1.02); shelf(G, x + 0.6, z + 3, 0.5, 2.4, { cols: [0xc9a227, 0x7a4a34] }); });
  shop('Florist', 124, 8, 6, 6, 131, 9, 'e', (x, z) => { for (let q = 0; q < 4; q++) P(G, 'cyl', x + 1.2 + (q % 2) * 2.4, z + 1.6 + Math.floor(q / 2) * 2.8, 0.5, 0.5, 0.5, 0x6b5a48); overgrow(G, { x0: x, z0: z, x1: x + 6, z1: z + 6, ht: 3.2 }, 0.6, true); });
  shop('Transit office', 162, -14, 6, 10, 161, -7, 'w', (x, z) => { desk(G, x + 3.2, z + 1.2, 1.8, 0.7); item(G, 'batt', x + 4, z + 1.2, 0.78); shelf(G, x + 5.4, z + 6, 0.5, 2.4); });
  shop('Lost property', 162, 4, 6, 10, 161, 7, 'w', (x, z) => { shelf(G, x + 5.4, z + 4.8, 0.5, 3, { cols: [0x4d5a66, 0x6b5a3c, 0x8a7a6a] }); item(G, 'bandage', x + 2.4, z + 2.8, 0.02); });
  const CV: [number, number, number, number, number, number, string, Flat][] = [
    [124, -22, 13.75, 6, 133, -15, 'C1', [{}, 'clean', 'peaches']], [138.25, -22, 13.5, 6, 149, -15, 'C2', [{ card: 'C2' }, 'nest', 'medkit']], [152.25, -22, 13.75, 6, 159, -15, 'C3', [{ open: true }, 'body', 'bandage', 'N4.3']],
    [124, 16, 13.75, 6, 133, 15, 'C4', [{ open: true }, 'clean', 'ration']], [138.25, 16, 13.5, 6, 149, 15, 'C5', [{ open: true }, 'worm', 'peaches']], [152.25, 16, 13.75, 6, 159, 15, 'C6', [{}, 'worm', 'batt']],
    [124, -14, 6, 6, 131, -13, 'C7', [{ card: 'C7' }, 'clean', 'shells']], [124, 8, 6, 6, 131, 13, 'C8', [{}, 'clean', 'ration']], [162, -14, 6, 10, 161, -11, 'C9', [{}, 'gore', 'batt']], [162, 4, 6, 10, 161, 11, 'C10', [{}, 'post', 'bandage']],
  ];
  for (const [x, z, w, d, dx, dz, nm, v] of CV) flatRect(S2, x, z, w, d, dx, dz, nm, v, HB);
}

/* a flat of any shape: bed in the corner away from the door (the east one, for a door in the middle of the front), table in the
   middle with what was left on it, and what happened here */
function flatRect(D: Floor, x: number, z: number, w: number, d: number, dx: number, dz: number, nm: string, v: Flat, HB: RoomOpts): void {
  room(D, 'Residence ' + nm, x, z, w, d, { ...HB, fl: 0x74685a, lit: v[1] === 'worm' || v[1] === 'nest' ? 'none' : 'main', ...(v[1] === 'nest' ? { motes: 'flesh' } : {}) }); door(D, dx, dz, { ...v[0], span: 2 });
  const cx = x + w / 2, cz = z + d / 2, fx = dx <= cx ? x + w - 1.2 : x + 1.2, fz = dz <= cz ? z + d - 2.2 : z + 2.2, ox = dx <= cx ? x + 0.8 : x + w - 0.8, oz = dz <= cz ? z + d - 0.7 : z + 0.7;
  bed(D, fx, fz, true, 0x5f6b78); tbl(D, cx, cz, 1.2, 0.8, 0x6b5a48); item(D, v[2], cx, cz, 0.78); bx(D, ox, oz, 0.45, 1.9, 0.45, 0x5a5448);
  const vx = cx + (fx < cx ? 1.8 : -1.8), vz = cz + (fz < cz ? 1.4 : -1.4);
  if (v[1] === 'gore') { gore(D, vx, vz, 4); body(D, vx, vz, pick([0x4a5560, 0x8a8f96, 0x6b6f5a]), true); mut(D, 'skitter', vx, cz); }
  else if (v[1] === 'worm') { mut(D, 'worm', vx - 1, vz); mut(D, 'worm', vx + 1, vz); mut(D, 'worm', vx, cz); }
  else if (v[1] === 'nest') { eggs(D, vx, vz, 3); eggs(D, ox, oz - 0.6, 2); mut(D, 'skitter', vx, cz); }
  else if (v[1] === 'post') mut(D, 'husk', vx, vz, { post: 1, yaw: Math.atan2(dx - vx, dz - vz) }); // facing the door
  else if (v[1] === 'body') corpse(D, vx, vz, pick([0x4a5560, 0x6b6f5a, 0x7a5a50]), true, { label: 'Resident', say: 'A room card on a lanyard. Not for this flat.', keys: [v[3]] });
}

/** a home's walls and ceiling over sheet vinyl: the street's rooms where food, water or sweat is */
const VINYL = { ...HAB.mat, floor: 'vinyl' } as const;

/* the ground floor of block k: the street's rooms, out of the old Commons. Built inside the blocks, so even the
   utility rooms are poured, not dug; carpeted as homes are, but for the vinyl. (x0, z0) its north-west corner, 14 by 6 m
   (its west and east sides `sides`, if walled from a neighbour); its door's middle dc along its front, at dz */
function groundFloor(D: Floor, x0: number, north: boolean, k: number, HB: RoomOpts, at: { z0?: number; dz?: number; dc?: number; sides?: [number, number] } = {}): void {
  const z0 = at.z0 ?? (north ? -14 : 8), dz = at.dz ?? (north ? -7 : 7), dc = at.dc ?? 7, sd = north ? 's' : 'n', back = north ? z0 + 0.6 : z0 + 5.4, front = north ? z0 + 5.2 : z0 + 0.8, mid = z0 + 3;
  const [w0, w1] = at.sides ?? [x0, x0 + 14];
  const R = (nm: string, o: RoomOpts = {}, dopt: DoorOpts = {}) => { room(D, nm, w0, z0, w1 - w0, 6, { ...HB, ...o }); door(D, x0 + dc, dz, { span: 2, sg: [[nm.split(' ')[0], sd]], ...dopt }); };
  if (north) switch (k) {
    case 0: R('Canteen', { mat: VINYL }, { open: true }); for (const dm of [-1.2, 1.2]) tbl(D, x0 + 5.2, mid + dm, 3.2, 0.8, 0x8a8578); bx(D, x0 + 12, back, 1.8, 1, 0.6, 0x6f7378); item(D, 'peaches', x0 + 12, back, 1.02, 2);
      note(D, 'diary', x0 + 5.2, mid - 1.2, 0.78); blood(D, x0 + 8.8, front, 2); blood(D, x0 + 2, mid, 1.4); mut(D, 'husk', x0 + 10.8, mid + 1.2); mut(D, 'husk', x0 + 1.6, mid, { post: 1, yaw: -PI / 2 }); break;
    case 1: R('Kitchen', { fl: 0x8f9492, wl: 0xa9aeab, mat: { ...VINYL, wall: 'glazed' } }, { stuck: true }); bx(D, x0 + 7, back, 6, 0.9, 0.6, 0x7c8186); bx(D, x0 + 13, mid, 0.8, 1.9, 0.7, 0xb4b8ba);
      item(D, 'knife', x0 + 5, back, 0.92); item(D, 'ration', x0 + 8.8, back, 0.92, 2); mut(D, 'grabber', x0 + 7, z0 + 0.24, { yaw: 0 }); eggs(D, x0 + 2, front, 3); break;
    case 2: R('Commissary', {}, { stuck: true }); shelf(D, x0 + 4, back + 0.2, 3, 0.5, { jars: 1 }); shelf(D, x0 + 11, back + 0.2, 2.4, 0.5); item(D, 'peaches', x0 + 10, mid, 0.02); break;
    case 3: R('Laundry', { lit: 'none', mat: VINYL }); for (let q = 0; q < 4; q++) bx(D, x0 + 2 + q * 2.8, back, 0.9, 1, 0.8, 0xb8bcc0); mut(D, 'worm', x0 + 4, mid); mut(D, 'worm', x0 + 6, mid + 0.8); mut(D, 'worm', x0 + 10, mid); eggs(D, x0 + 12.4, front, 3); break;
    case 4: R('Chapel'); for (let q = 0; q < 3; q++) bx(D, x0 + 3 + q * 3.6, mid + 0.4, 1.4, 0.45, 0.5, 0x5a4a3c); bx(D, x0 + 7, back, 1.6, 1, 0.6, 0x6b5a48); gore(D, x0 + 11.2, front, 3); body(D, x0 + 10, mid, 0x4a5560, false); break;
    case 5: R('Maintenance', { ...UTIL, c: 'RES', mat: FITTED }); genset(D, 'RES', x0 + 11.2, z0 + 1.4, x0 + 10, z0 + 2.6); shelf(D, x0 + 3, back + 0.2, 2.4, 0.5); item(D, 'batt', x0 + 2.4, back + 0.2, 1.06, 2); item(D, 'bandage', x0 + 5.2, mid, 0.02); break;
    case 6: R('Post room'); shelf(D, x0 + 3, back + 0.2, 2.4, 0.5, { cols: [0xb9a98a, 0x8a7a6a] }); tbl(D, x0 + 9, mid, 2, 0.8); item(D, 'batt', x0 + 9, mid, 0.78); break;
    case 7: R('Recreation', { lit: 'none' }); bx(D, x0 + 5, mid, 2.4, 0.8, 1.3, 0x3a2e22); bx(D, x0 + 5, mid, 2.3, 0.04, 1.2, 0x2f5a40, { y: 0.8, c: 0 }); bx(D, x0 + 11.2, back, 2, 0.45, 0.8, 0x5a4a44);
      bx(D, x0 + 12.8, front, 0.9, 0.5, 0.6, 0x4a5238); item(D, 'goggles', x0 + 12.8, front, 0.5); item(D, 'batt', x0 + 1.2, back, 0.02);
      corpse(D, x0 + 8.8, front, 0x6b6f5a, false, { label: 'Resident', say: 'Swimming trunks, a towel, a room card.', keys: ['C2'] }); eggs(D, x0 + 2, front, 4); mut(D, 'skitter', x0 + 7.2, mid); mut(D, 'skitter', x0 + 2.8, back + 0.8); break;
  }
  else switch (k) {
    case 0: R('Gymnasium', { mat: VINYL }); bx(D, x0 + 4, mid, 3, 0.08, 2, 0x3a4a5a, { c: 0 }); for (let q = 0; q < 3; q++) P(D, 'cyl', x0 + 10 + q * 1.2, back, 0.4, 0.4, 0.4, 0x2a2c2e); mut(D, 'husk', x0 + 7, mid, { post: 1, yaw: 0 }); break;
    case 1: R('School room'); for (let q = 0; q < 3; q++) for (const dm of [-1, 1]) tbl(D, x0 + 3.2 + q * 3.6, mid + dm, 1, 0.6, 0x8a7a5a); bx(D, x0 + 7, z0 + 5.97, 3, 1.2, 0.06, 0x2a3a2c, { y: 1, c: 0 }); eggs(D, x0 + 12, front, 3); mut(D, 'skitter', x0 + 11, mid); break;
    case 2: R('Library', { lit: 'none' }); for (let q = 0; q < 3; q++) shelf(D, x0 + 2.4 + q * 4.6, back - 0.2, 1.8, 0.5); shelf(D, x0 + 7, mid + 0.4, 3, 0.5); break;
    case 3: R('Stores', { ...UTIL, c: 'RES', mat: FITTED }, { kind: 'heavy' }); shelf(D, x0 + 3, back + 0.2, 2.4, 0.5); shelf(D, x0 + 11, back + 0.2, 2.4, 0.5); item(D, 'ration', x0 + 7, back, 0.02, 2); item(D, 'batt', x0 + 7, mid, 0.02); break;
    case 4: R('Trauma centre', { ...MED, c: 'RES' }, { kind: 'heavy' }); for (let q = 0; q < 4; q++) medbed(D, x0 + 1.2 + q * 3, z0 + 3.8);
      shelf(D, x0 + 13.4, mid, 0.5, 2.6, { cols: [0xd4d8d4, 0xb9c4bd, 0x8c2f24, 0xa8b4c0] }); for (const z of [mid - 0.9, mid, mid + 0.9]) item(D, 'medkit', x0 + 13.3, z, 1.06); item(D, 'bandage', x0 + 13.3, mid + 1, 0.61, 2);
      tbl(D, x0 + 10.8, front, 0.8, 0.7, 0xb4b8ba); note(D, 'clinic', x0 + 10.8, front, 0.78); break;
    case 5: R('Water room', { ...UTIL, c: 'RES', mat: FITTED }); for (const q of [3.2, 10.8]) P(D, 'cyl', x0 + q, mid, 2.2, 2.6, 2.2, 0x3b4d57); bx(D, x0 + 7, mid, 6, 0.14, 0.14, 0x3d4042, { y: 2.4, c: 0 }); break;
    case 6: R('Workshop', { ...UTIL, c: 'RES', mat: FITTED }); tbl(D, x0 + 6, back + 0.15, 4, 0.9, 0x54504a); item(D, 'pipe', x0 + 6, mid + 1.2, 0.02); item(D, 'batt', x0 + 7.6, back + 0.15, 0.78); break;
    case 7: R('Bar', {}, { open: true }); bx(D, x0 + 7, mid, 5, 1, 0.6, 0x4a3a2c); for (let q = 0; q < 4; q++) P(D, 'cyl', x0 + 3.6 + q * 2.4, mid - 1.4, 0.4, 0.7, 0.4, 0x2a2c2e); blood(D, x0 + 4, front, 1.6); mut(D, 'husk', x0 + 11.2, back, { post: 1, yaw: 0 }); break;
  }
}

/* ===== Horticulture, the east end of the main level. Its own security, its own power, and nobody has pruned anything.
   The post off the airlock; three parallel grow galleries on a cross passage, with the tissue lab and Holt's office north of them and the
   seed vault and infirmary south; the arboretum, a 16 m cavern with the cave bulkhead breached in its north wall; and east of it the
   exhaust shaft, where ladderway B passes. ===== */
function buildHorticulture(G: Floor, S2: Floor): void {
  const H: RoomOpts = { ...HRT, c: 'HORT' };
  /* the post: the guard who kept his pass, the backup set that still runs, and the door into the labs */
  const post = room(G, 'Security post', 186, -6, 8, 12, { ...SEC, c: 'HORT', em: 1 }); desk(G, 191.2, -5, 1.8, 0.7); note(G, 'hsec', 190.4, -5.1, 0.78); genset(G, 'HORT', 192.6, 3.2, 191.4, 4.4);
  corpse(G, 188.8, 2.8, 0x2c3440, true, { label: 'Guard', say: 'Horticulture had its own security. This one kept his pass.', keys: ['h'] });
  door(G, 195, -1, { card: 'h', sg: [['Labs', 'w'], ['Security', 'e']] });
  /* the cross passage, and the three galleries off it */
  const cross = room(G, 'Cross passage', 196, -18, 2, 36, { ...H, em: 1 });
  const gal = ([['Grow gallery north', -18, {}], ['Grow gallery', -4, { em: 1 }], ['Grow gallery south', 10, { lit: 'none' }]] as [string, number, RoomOpts][])
    .map(([nm, z, o]) => z === -18
      /* the north one reaches into the partitions along its north side, up to the glass (below) */
      ? outline(G, nm, [[198, -18], [202, -18], [202, -18.75], [214, -18.75], [214, -18], [216, -18], [216, -18.75], [224, -18.75], [224, -10], [198, -10]], { ...H, ht: 6, ...o })
      : room(G, nm, 198, z, 26, 8, { ...H, ht: 6, ...o }));
  /* two long beds a gallery, 2 m short of each end and with the aisle between them on the doors' line */
  for (const z of [-18, -4, 10]) for (const dz of [1.6, 6.4]) {
    bx(G, 211, z + dz, 22, 0.7, 1.1, 0x6f6a5e); bx(G, 211, z + dz, 21.6, 0.06, 0.9, 0x2e2418, { y: 0.7, c: 0 });
    for (let q = 0; q < 14; q++) P(G, 'ico', 200.6 + q * 1.56 + rnd(-0.2, 0.2), z + dz, rnd(0.3, 0.7), rnd(0.4, 1.8), rnd(0.3, 0.7), pick([...GR, 0x8c4a44]), { y: 0.72, c: 0 });
  }
  /* north: the tissue lab and the director of research's office. South: the seed vault and the infirmary */
  const lab = room(G, 'Tissue lab', 202, -28, 12, 8.75, { ...H, fl: 0x7d8588, wl: 0x9aa89c, flick: 1 }); door(G, 207, -19, { sg: [['Tissue lab', 's']] });
  /* the lab looks out over the north gallery through a glass wall, and the director's office through a window */
  for (const x of [203, 205, 209, 211, 213]) door(G, x, -19, { seal: true, glass: true, glaze: 'full' });
  for (const x of [221, 223]) door(G, x, -19, { seal: true, glass: true });
  tbl(G, 206, -25.2, 3, 0.8, 0xaab2b5); tbl(G, 212.8, -24, 0.8, 2, 0xaab2b5); for (const x of [203.2, 205.2]) P(G, 'cyl', x, -27, 0.8, 2.2, 0.8, [0.16, 0.3, 0.24] as Colour, { c: 1 }); note(G, 'journal', 206, -25.3, 0.78); item(G, 'batt', 205, -25.2, 0.78, 2);
  room(G, 'Director of research', 216, -28, 8, 8.75, { ...HAB, c: 'HORT', fl: 0x5e5248, lc: [0.85, 0.78, 0.62] }); door(G, 219, -19, { code: 2, sg: [['Dr. M. Holt', 's']] });
  desk(G, 220, -26.8, 2, 0.8, { c: 0x4a3a2c }); shelf(G, 216.6, -24, 0.5, 2.4, { cols: [0x7a4a34, 0x4d5a66, 0x8a7a4a] }); bed(G, 223.2, -23.2, true, 0x7a5a50); note(G, 'holt', 219.2, -26.9, 0.78); item(G, 'batt', 220.7, -26.8, 0.78, 2); item(G, 'medkit', 217.2, -20.8, 0.02);
  room(G, 'Seed vault', 202, 20, 10, 8, { ...UTIL, c: 'HORT' }); door(G, 207, 19, { kind: 'heavy', sg: [['Seed vault', 'n']] });
  shelf(G, 202.6, 24, 0.5, 3, { jars: 1, cols: [0x6a8a44, 0xcbbfa8, 0x8c4a44] }); shelf(G, 211.4, 24, 0.5, 3, { jars: 1, cols: [0x6a8a44, 0xcbbfa8] }); item(G, 'medkit', 207, 27, 0.02); item(G, 'kit', 211.3, 23.2, 1.06);
  room(G, 'Infirmary', 214, 20, 8, 8, { ...MED, c: 'HORT' }); door(G, 217, 19, { sg: [['Infirmary', 'n']] });
  medbed(G, 214.8, 23.6); shelf(G, 221.4, 25, 0.5, 2.4, { cols: [0xd4d8d4, 0x8c2f24] }); item(G, 'medkit', 221.3, 24.4, 1.06); item(G, 'bandage', 221.3, 26, 1.06, 2);
  /* the arboretum: hills, sick trees, and what is left of Holt */
  for (const z of [-13, -1, 11]) door(G, 225, z, { span: 2, open: z === -1, sg: [['Arboretum', 'w']] });
  const arb = cave(G, 'Arboretum', 226, -18, 30, 30, { ...HRT, c: 'HORT', ht: 16, lit: 'always', lc: [0.5, 0.24, 0.4] });
  hill(G, 234, 4, 8, 1.6, arb); hill(G, 248, -11, 7, 1.2, arb); hill(G, 246, 5, 6, 1, arb); vault(G, 240, -4, 16, 4, arb); roughen(G, arb, 0.15, 1.5);
  for (const [x, z, h] of [[233, -10, 7], [242, 0, 9], [236, 5, 6.5], [250, -8, 7.5], [249, 6, 6], [231, -2.8, 5.5]]) tree(G, x, z, h, 0, true);
  mut(G, 'bloat', 245.2, -4, { sit: 1, yaw: -PI / 2, holt: 1 }); note(G, 'last', 240.4, -4.6, 0.03);
  /* roots out of her across the ground, rising to her */
  for (let k = 0; k < 8; k++) bx(G, 244.8 - rnd(0, 2.8), -4 + rnd(-1.2, 1.2), rnd(0.8, 2), 0.07, 0.07, pick([0x6e2b28, 0x3f6a3a]), { y: rnd(-0.04, 0), c: 0, ry: rnd(-0.5, 0.5), rz: rnd(0, 0.2) });
  /* the overlook: a balcony out over the arboretum a storey up, where the family showed visitors the trees. A stair
     climbs off the cross passage in the rock between the north and middle galleries, and a passage runs on to an
     archway in the arboretum's wall; terrazzo underfoot, glass balustrades round it */
  room(G, 'Overlook stair', 198, -8, 12, 2, { ...H, ht: STOREY + 3.2, em: 1 }); stairs(G, S2, 198, -8, 2, 12, 'e');
  const OV: RoomOpts = { ...H, em: 1, lc: [0.86, 0.82, 0.72], fl: 0x8a8070, wl: 0x9aa89c, mat: { floor: 'terrazzo', wall: 'plaster', ceiling: 'plaster' } };
  room(S2, 'Overlook passage', 210, -8, 16, 2, { ...OV, ht: 3.2 });
  room(S2, 'Arboretum balcony', 226, -10, 6, 6, { ...OV, open: 1, ht: 4, nolamp: 1, mat: { floor: 'terrazzo', wall: 'shot', ceiling: 'shot' } });
  for (const z of [-8.8, -5.2]) bx(S2, 227.6, z, 1.6, 0.45, 0.45, 0x5a3e34); // benches, facing the trees

  /* the bulkhead to the cave, in the north wall: Horticulture drilled through it */
  room(G, 'Breach', 240, -24, 2, 4, { ...ROCKP, lit: 'none', nolamp: 1, noroam: 1 }); door(G, 241, -19, { stuck: true, sg: [['Cave', 's']] });
  ladder(G, 'CV', 241, -23, 241, -21.2, PI, false, { bare: true, label: 'Breach' });
  /* the green through the breach, on its walls */
  for (let k = 0; k < 6; k++) P(G, 'ico', 240 + (rnd(0.1, 0.9) < 0.5 ? 0.16 : 1.84), -24 + rnd(0, 4), rnd(0.3, 0.7), rnd(0.2, 0.5), rnd(0.3, 0.7), pick(GR), { c: 0, y: rnd(0, 1.6) });
  /* east: the exhaust shaft. Ladderway B up to Cargo, and on down to the plant level */
  door(G, 257, -1, { sg: [['Exhaust shaft', 'w']] }); room(G, 'Exhaust shaft', 258, -6, 8, 12, { ...UTIL, c: 'HORT', em: 1 });
  ladder(G, 'B1', 263.2, -4.8, 261.2, -3.2, PI / 2, true); ladder(G, 'B2', 263.2, 3.2, 261.2, 2.8, PI / 2, false);
  /* the green, everywhere */
  for (const [R, d, gl] of [[cross, 0.7, true], [{ ...gal[0], z0: -18 }, 0.9, true], [gal[1], 0.6, true], [gal[2], 1.1, true], [arb, 1, true], [{ ...lab, z1: -20 }, 0.5, false], [post, 0.12, false]] as [PRoom, number, boolean][]) overgrow(G, R, d, gl);
  for (const [x, z, yaw] of [[196.24, -14, PI / 2], [196.24, 12, PI / 2], [223.76, 1, -PI / 2], [207, -10.24, PI]]) mut(G, 'vine', x, z, { yaw });
  mut(G, 'vine', 226.24, 8, { yaw: PI / 2 }); mut(G, 'vine', 257.76, -0.8, { yaw: -PI / 2 });
  for (const [x, z] of [[202, -16], [210, -13.2], [218, -15.6], [204, 12], [212, 14.8], [220, 12.8], [232, 2], [238, 8], [250, 0]]) mut(G, 'rootworm', x, z);
}
