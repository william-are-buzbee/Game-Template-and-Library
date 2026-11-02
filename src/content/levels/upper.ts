import { PI, type Colour } from '../../core/math';
import type { LevelDef, LadderDef } from '../types';
import {
  arch, beginLevel, bx, cave, colT, door, elev, exhibit, finishLevel, flight, item, ladder, floor, mut, note, P, roughen, room, stack, stairs, use, type Floor, type LevelInfo, type RoomOpts,
} from '../build/plan';
import { ARRIVAL, HISTORY, STAGES, WELCOME, stageAt } from '../exhibit';
import {
  BAY, FAM, MED, OFF, OPS, SEC, UTIL, WALK, blood, callPoint, camera, comms, container, corpse, desk, eggs, exitSign, forklift, genset, gore, grandStair, liftRoom, medbed, monitors, panel, POLE, shelf, speaker, tbl,
} from '../build/furnish';
import { WOOD as ROOTS, bed, bells, candelabra, crack, cup, forced, grower, heave, litter, pressed, runner, spire, tobacco, tone } from '../build/overgrowth';
import { bore, root as rootThrough } from '../build/roots';

/** the block skim-coated smooth: the corridors the wing's people walked every day */
const SKIM = (o: RoomOpts): RoomOpts['mat'] => ({ ...o.mat, wall: 'plaster' });

/* Upper station, 400 m down. Off the main shaft, the Security wing (x 14 to 66) and Operations (x 64 to 110, south to
   z 54), with a two-storey atrium where they meet; the Cargo cavern (x 110 to 240); the exhaust shaft (x 260). Start here.
   Ported from the first engine (archive/first-engine.html, buildUpper and buildCargo2); Security and Ops since laid
   out again around the highway and its bend (world.md §8). */

export const UPPER: LevelInfo = { id: 'upper', name: 'Upper station', c: 'OPS', cards: true }; // Security's staff carry their cards

export function buildUpper(ladders: Record<string, LadderDef>): LevelDef {
  beginLevel(UPPER, ladders);
  /* the ground floor, over a basement a storey down (the isolation suite) where it needs one */
  const lv = UPPER, D = floor(lv, { terrain: [-10, -30, 270, 66], ground: true }), B = floor(lv, { terrain: [-10, -30, 270, 66], y0: -4.5 });
  /* the rungs over the ground floor at +5, +10 and +15: Tier 1 also carries the second floor over Ops */
  const tier = (y0: number, li: number) => floor(lv, { terrain: [-10, -30, 270, 66], y0, li }), T1 = tier(5, 1), T2 = tier(10, 2), T3 = tier(15, 3);
  stack(B, D); stack(D, T1); stack(T1, T2); stack(T2, T3);
  /* the main shaft: the hoist cage (runs on Gen-1) at the ground floor, where freight came off, and over it on the second
     floor the surface cage, where people did. No ladderway down it: the way down from Security is its own elevator, in
     the atrium (below) */
  liftRoom(D, 0, -2, 5, -1);
  room(D, 'Shaft station', 6, -2, 6, 6, { ...UTIL, c: 'SEC', em: 1, safe: 1 }); door(D, 13, 1, { sg: [['Goods inward', 'w'], ['Shaft station', 'e']] });
  room(T1, 'Surface cage', 0, -2, 4, 4, { ...OPS, c: 'LIFT', nolamp: 1, noroam: 1, safe: 1 }); door(T1, 5, 0, { kind: 'heavy', c: 'LIFT', lift: true, sg: [['Surface', 'e']] });

  /* The Security wing: the lobby off the shaft, the first leg of the highway, and the rooms off it. Its feed hangs off
     Ops, and the survivors cut it to blind the cameras on their side (world.md §8): dark at the start, and a kit mends
     it. */
  /* where freight came in: off the hoist, through to the hazard store and the corridor, never across the lobby. A
     wall between them, the lobby's limestone on one face and the dock's sprayed rock on the other: they were one open
     space, the stone meeting the shotcrete in one plane beside the lobby's door */
  room(D, 'Goods inward', 14, -0.75, 16, 10.75, { ...UTIL, c: 'SEC', ht: 4, em: 1 }); door(D, 31, 1, { sg: [['Security', 'w'], ['Goods inward', 'e']] });
  /* the dock (world.md §8, Security at the station's size): what came down the hoist was staged here before it went on,
     to the kitchen and the walk-ins by the service passage, to the hazard store, or east into the wing. A walkway kept
     clear along the north wall from the hoist's door to the wing's; three bays marked out on the floor; racking along
     the south wall; the platform scale by the hoist's door; the bonded cage, where the bar's spirits and the family's
     wine came in, its gate prised open; and in the far corner the clerk's cabin, its hatch on the floor */
  const PAINT = 0xc9a227, WOOD = 0x8a6a44, CARTON = 0x9a7a52, TAPE = 0x6a5a3c;
  const paint = (x0: number, z0: number, x1: number, z1: number) => bx(D, (x0 + x1) / 2, (z0 + z1) / 2, Math.max(x1 - x0, 0.1), 0.01, Math.max(z1 - z0, 0.1), PAINT, { y: 0.012, c: 0 });
  /* a pallet at (x, z) on whatever is y under it, and on it cartons `h` high, or nothing */
  const pallet = (x: number, z: number, y = 0, h = 0, ry = 0) => {
    bx(D, x, z, 1.2, 0.14, 1, WOOD, { y, ry });
    if (h) { bx(D, x, z, 1.1, h, 0.9, CARTON, { y: y + 0.14, ry }); bx(D, x, z, 0.08, 0.01, 0.9, TAPE, { y: y + 0.14 + h, ry, c: 0 }); } // taped across the top
  };
  paint(14.4, 2.25, 29.6, 2.25); // the walkway's edge
  for (const x of [18.6, 21.3, 24, 26.6]) paint(x, 3, x, 6.2);
  paint(18.6, 6.2, 26.6, 6.2);
  pallet(19.95, 4.6, 0, 0.9); pallet(22.65, 4.4, 0, 0, 0.12); // bay 1 full, bay 2 an empty pallet
  pallet(25.3, 4.6); // bay 3, flour, one sack split
  for (const [k, [dx, dz]] of [[-0.28, -0.22], [0.28, -0.22], [-0.28, 0.22], [0.28, 0.22]].entries()) P(D, 'ico', 25.3 + dx, 4.6 + dz, 0.55, 0.32, 0.42, k === 3 ? 0xb8a880 : 0xc8b890, { y: 0.14 });
  P(D, 'cyl', 25.95, 5.35, 0.9, 0.02, 0.7, 0xe2ddd0, { c: 0 }); // what came out of it
  /* the racking, two bays against the south wall, a pallet's depth: blue frames, orange beams */
  for (const x of [19, 22, 25]) for (const z of [8.75, 9.85]) bx(D, x, z, 0.08, 3.4, 0.08, 0x3a5a8a);
  for (const x0 of [19, 22]) for (const y of [1.5, 3]) for (const z of [8.8, 9.8]) bx(D, x0 + 1.5, z, 2.92, 0.1, 0.08, 0xc8641e, { y, c: 0 });
  pallet(19.8, 9.3, 0, 1); pallet(21.2, 9.3, 0, 0.8); pallet(20.5, 9.3, 1.6, 0.9); pallet(23.4, 9.3, 1.6, 0.7); pallet(24.2, 9.3, 3.1, 0.6);
  for (const x of [22.7, 23.3]) P(D, 'cyl', x, 9.3, 0.56, 0.88, 0.56, 0x3d5a44); // drums, on the floor of the second bay
  /* the scale, a plate let into the floor by the hoist's door, and its readout on a post */
  bx(D, 15.6, 4.2, 1.5, 0.04, 1.5, 0x6b6e70, { mat: 'steel', c: 0 });
  bx(D, 14.4, 5.2, 0.06, 1.2, 0.06, 0x3a3d40); bx(D, 14.4, 5.2, 0.14, 0.24, 0.32, 0x2c2f33, { y: 1.2, c: 0 });
  bx(D, 14.48, 5.2, 0.02, 0.08, 0.2, [0.05, 0.06, 0.05], { y: 1.3, c: 0, pw: [[0.05, 0.06, 0.05], [0.6, 2.4, 1]], pc: 'SEC' });
  /* the bonded cage in the north-east corner, off the walkway: mesh on three sides, its gate prised and swung out, two
     cases of the bar's left, one opened, and a bottle on the floor */
  const MESH = 0x5a5d60, CAGE = [26.8, 2.6, 29.98, 5.4] as const;
  for (let z = CAGE[1]; z <= CAGE[3] + 1e-6; z += 0.2) if (z < 3.9 || z > 5.1) bx(D, CAGE[0], z, 0.03, 2.2, 0.03, MESH, { c: 0 });
  for (const z of [CAGE[1], CAGE[3]]) for (let x = CAGE[0] + 0.2; x < CAGE[2] - 0.05; x += 0.2) bx(D, x, z, 0.03, 2.2, 0.03, MESH, { c: 0 });
  for (const [x0, z0, x1, z1] of [[CAGE[0], CAGE[1], CAGE[0], CAGE[3]], [CAGE[0], CAGE[1], CAGE[2], CAGE[1]], [CAGE[0], CAGE[3], CAGE[2], CAGE[3]]] as const)
    for (const y of [0, 2.2]) bx(D, (x0 + x1) / 2, (z0 + z1) / 2, Math.max(x1 - x0, 0.05), 0.05, Math.max(z1 - z0, 0.05), MESH, { y, c: 0 });
  for (const [z0, z1] of [[CAGE[1], 3.9], [5.1, CAGE[3]]]) colT(D, CAGE[0], (z0 + z1) / 2, 0.08, z1 - z0, 2.2);
  for (const z of [CAGE[1], CAGE[3]]) colT(D, (CAGE[0] + CAGE[2]) / 2, z, CAGE[2] - CAGE[0], 0.08, 2.2);
  /* the gate, on its hinge at the gap's north end, swung out */
  for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) bx(D, 26.8 - t * 0.932, 3.9 - t * 0.362, 0.03, 2.1, 0.03, MESH, { c: 0 });
  for (const y of [0.1, 2]) bx(D, 26.334, 3.719, 0.04, 0.05, 1, MESH, { ry: 1.2, y, c: 0 });
  bx(D, 26.84, 3.8, 0.06, 0.12, 0.06, 0x2a2c2e, { y: 1.1, c: 0 }); // and its hasp on the post, bent
  pallet(28.7, 4.4); bx(D, 28.4, 4.4, 0.6, 0.36, 0.4, 0x7a5a38, { y: 0.14 }); bx(D, 29.1, 4.4, 0.6, 0.36, 0.4, 0x7a5a38, { y: 0.14 });
  bx(D, 29.3, 3.5, 0.62, 0.03, 0.42, 0x7a5a38, { y: 0, ry: 0.5, c: 0 }); // its lid, off
  for (const dz of [-0.1, 0.1]) P(D, 'cyl', 29.1, 4.4 + dz, 0.08, 0.3, 0.08, 0x355530, { y: 0.5, c: 0 }); // what is left in it
  P(D, 'cyl', 27.6, 4.9, 0.08, 0.3, 0.08, 0x6a4a2a, { y: -0.11, rz: 1.5, ry: 0.7, c: 0 });
  /* the clerk's cabin in the south-east corner: a box of painted panels with its own roof, its hatch and its door on the
     floor's side. Inside, the desk, the dockets on their spike, a cabinet */
  const CAB = 0xb8b2a0, CW = 2.5;
  bx(D, 28.29, 6.2, 3.38, CW, 0.08, CAB); // the north side, whole
  for (const [z0, z1, y0, y1] of [[6.24, 6.6, 0, CW], [6.6, 7.8, 0, 0.95], [6.6, 7.8, 2, CW], [7.8, 8.9, 0, CW], [8.9, 9.98, 2.1, CW]] as const)
    bx(D, 26.6, (z0 + z1) / 2, 0.08, y1 - y0, z1 - z0, CAB, { y: y0 }); // the west side round the hatch and the door
  bx(D, 26.6, 7.2, 0.02, 1.05, 1.2, [0.55, 0.66, 0.7], { mat: 'glass', y: 0.95, c: 0 }); // the hatch's pane
  bx(D, 26.42, 7.2, 0.36, 0.04, 1.3, 0x4a3a2c, { y: 0.95, c: 0 }); // its sill, a ledge to sign on
  bx(D, 28.29, 8.07, 3.38, 0.06, 3.82, CAB, { y: CW, c: 0 }); // its roof
  desk(D, 29.5, 7.6, 0.7, 1.8, { c: 0x5a5048, bare: 1 }); bx(D, 28.7, 7.6, 0.45, 0.45, 0.45, 0x2c2f33); bx(D, 29.6, 9.5, 0.5, 1.3, 0.5, 0x5f6266);
  P(D, 'cyl', 29.6, 7.1, 0.02, 0.18, 0.02, 0x2a2c2e, { y: 0.76, c: 0 }); bx(D, 29.6, 7.1, 0.15, 0.04, 0.21, 0xe2ddd0, { y: 0.78, c: 0 }); // the spike, and the dockets on it
  use(D, 'look', 29.6, 7.1, 0.9, { label: 'Dockets', text: 'Delivery dockets on a spike, newest on top: dry goods, linen, the post. The last is dated 5/11.' });
  /* a pallet truck, parked between the bays and the racking: its forks east, its handle back */
  for (const z of [7.16, 7.64]) bx(D, 24.3, z, 1.15, 0.08, 0.16, 0x8c2f24, { c: 0 });
  bx(D, 23.5, 7.4, 0.32, 0.36, 0.56, 0x8c2f24); bx(D, 23.16, 7.4, 0.05, 1.2, 0.05, 0x2a2c2e, { y: 0.3, rz: 0.35, c: 0 });
  /* the oldest of the changed, rooting at its post: each of Security's seven walks at its own pace and steps, the bench's
     (mockups/mutants.html, Security's seven; sim/cast/gait.ts). It has stood long enough for its roots to go out over the
     floor: along the bays' painted line, into the full pallet and up the racking, under the door to the passage */
  mut(D, 'changed', 18, 6.8, { post: 1, yaw: PI / 2, walk: 0.25, steps: 50 });
  const ROOT = ROOTS, root = (pts: readonly (readonly [number, number])[], d0: number, d1: number, y = 0) => runner(D, pts, d0, d1, { y });
  /* matted under its feet: lumps of root grown into each other */
  for (const [dx, dz, r] of [[0, 0, 0.9], [0.3, -0.2, 0.55], [-0.3, 0.25, 0.6], [0.25, 0.35, 0.45], [-0.25, -0.3, 0.5]] as const)
    P(D, 'ico', 18 + dx, 6.8 + dz, r, 0.12, r * 0.9, ROOT[(Math.round(r * 10)) % 3], { c: 0 });
  root([[18.3, 6.65], [19.2, 6.42], [20.3, 6.3], [21.4, 6.22], [22.6, 6.18], [23.6, 6.28], [24.5, 6.2]], 0.13, 0.04); // along the line
  root([[18.35, 6.45], [18.8, 5.9], [19.15, 5.42], [19.33, 5.06]], 0.11, 0.06); // to the full pallet
  root([[17.7, 6.95], [16.9, 7.3], [16.1, 7.42], [15.2, 7.25], [14.4, 7.35]], 0.11, 0.04); // toward the passage, under its door
  root([[18.15, 7.2], [18.3, 7.8], [18.6, 8.3], [18.88, 8.62]], 0.1, 0.06); // to the racking
  root([[17.85, 6.5], [17.6, 5.8], [17.2, 4.9], [16.9, 4.1], [16.5, 3.4]], 0.09, 0.03); // toward the scale
  root([[17.75, 7.1], [17.3, 7.7], [17.1, 8.4]], 0.08, 0.03);
  P(D, 'cyl', 19.36, 4.95, 0.06, 1.0, 0.06, ROOT[1], { c: 0, rz: 0.08 }); root([[19.42, 4.95], [19.9, 4.7], [20.35, 4.35]], 0.05, 0.03, 1.04); // up the cartons, and over them
  P(D, 'cyl', 18.93, 8.68, 0.06, 1.5, 0.06, ROOT[0], { c: 0 }); // up the upright

  /* People came up the shaft to the second floor: off the surface cage into the arrival hall, down it to the checkpoint
     (world.md §8, The lobby; Security at the station's size). The first room a visitor saw, and the last you cross. A
     cage-load stood in it at a time, thirty or so with their bags: limestone to the gallery's height, and bronze. The
     cage's gates framed in it, under the dial that showed it coming; the house's board facing them as they open; down
     the east side the rail the line kept to, to the checkpoint's door, which looks straight down the line at the arch;
     past that, the cloakroom, and the bench where whoever was going up waited for the cage. Over the shaft station and
     the service passage, which are low enough to leave it its height */
  const AH: RoomOpts = { ...FAM, c: 'SEC', ht: 4.5, em: 1, lc: [0.92, 0.86, 0.74], mat: { ...FAM.mat, datum: 3.2 } };
  room(T1, 'Surface landing', 6, -2, 6, 14, AH); room(T1, 'Surface landing', 2, 5, 4, 6, { ...AH, ht: 3.2 }); // the hall, and the cloakroom off it under a lower ceiling
  door(T1, 13, 7.1, { sg: [['Checkpoint', 'w'], ['Surface', 'e']] });
  const BRZ = 0x5e4424, LIME = 0x9a9384, brz = { c: 0, mat: 'steel' } as const;
  /* the gates in bronze, and over them the dial, its needle up: the cage is here */
  for (const z of [-1.2, 1.2]) bx(T1, 6.04, z, 0.08, 2.72, 0.22, BRZ, brz);
  bx(T1, 6.04, 0, 0.08, 0.22, 2.62, BRZ, { ...brz, y: 2.5 });
  P(T1, 'cyl', 6.03, 0, 0.8, 0.05, 0.8, BRZ, { ...brz, y: 3.125, rz: PI / 2 }); P(T1, 'cyl', 6.06, 0, 0.66, 0.02, 0.66, 0xd8d0b8, { c: 0, y: 3.14, rz: PI / 2 });
  for (const a of [-1, -0.5, 0, 0.5, 1]) bx(T1, 6.08, Math.sin(a) * 0.26, 0.02, 0.035, 0.035, 0x2a2420, { c: 0, y: 3.13 + Math.cos(a) * 0.26 });
  bx(T1, 6.085, 0, 0.015, 0.22, 0.025, 0x2a2420, { c: 0, y: 3.15 });
  exhibit(T1, ARRIVAL.key, 12, 0, 2, 'w', 2.4, 1.9); // across from the gates
  /* bronze sconces, lit with the wing: either side of the board and of the checkpoint's door, and over the bench */
  for (const [x, z, s] of [[12, -1.7, -1], [12, 1.7, -1], [12, 5.6, -1], [12, 8.6, -1], [6, 3.4, 1]] as const) {
    bx(T1, x + s * 0.03, z, 0.06, 0.4, 0.14, BRZ, { ...brz, y: 2.3 });
    bx(T1, x + s * 0.12, z, 0.12, 0.24, 0.2, [0.2, 0.18, 0.15], { c: 0, y: 2.38, pw: [[0.2, 0.18, 0.15], [2.5, 2.42, 2.25]], pc: 'SEC' });
  }
  /* the line's rail: bronze posts, the belt between them gone slack, the last unhooked and down */
  for (const [k, z] of [1.6, 3.1, 4.6, 6.1].entries()) {
    P(T1, 'cyl', 10.3, z, 0.07, 0.95, 0.07, BRZ, { mat: 'steel' }); P(T1, 'cyl', 10.3, z, 0.11, 0.05, 0.11, BRZ, { ...brz, y: 0.95 });
    if (k < 2) bx(T1, 10.3, z + 0.75, 0.03, 0.05, 1.43, 0x5a1e1e, { c: 0, y: 0.84 });
  }
  bx(T1, 10.3, 4.66, 0.03, 0.84, 0.05, 0x5a1e1e, { c: 0 });
  /* the bench by the gates, and the bags left at them: whoever was going up when Security sealed itself */
  bx(T1, 6.35, 3.4, 0.6, 0.45, 2.4, LIME, { mat: 'stone' });
  bx(T1, 7.3, 1.6, 0.26, 0.66, 0.46, 0x3a2c22); bx(T1, 7.75, 1.95, 0.24, 0.58, 0.42, 0x2c3440, { ry: 0.3 }); bx(T1, 8.4, 1.35, 0.7, 0.24, 0.46, 0x4a3a2c, { ry: -0.2 });
  /* the cloakroom: a counter across its mouth, the way behind it at the north end; coats on the rails behind, a ticket
     on each sleeve, and empty hangers between */
  bx(T1, 5.7, 8.45, 0.6, 1.0, 4.7, LIME, { mat: 'stone' }); bx(T1, 5.7, 8.45, 0.7, 0.05, 4.8, 0x3a2c22, { c: 0, y: 1 });
  bx(T1, 5.7, 9.6, 0.45, 0.1, 0.36, 0x2e2f33, { c: 0, y: 1.05, ry: 0.2 }); // one folded on the counter
  const COATS = [0x2e2f33, 0x4a3a2c, 0x2c3440, 0x5c4c3a, 0x3a3226, 0x6a5a48, 0x343a2e];
  for (const [r, x] of [2.7, 4].entries()) {
    bx(T1, x, 8, 0.04, 0.04, 5, 0x8a8e8c, { c: 0, y: 1.76 }); for (const z of [5.5, 10.5]) bx(T1, x, z, 0.05, 1.8, 0.05, 0x8a8e8c, { c: 0 });
    colT(T1, x, 8, 0.5, 5, 1.8);
    for (let k = 0; k < 12; k++) {
      const z = 5.85 + k * 0.39;
      if ((k * (r ? 5 : 3) + r) % 4 === 0 || (r && k % 2)) { bx(T1, x, z, 0.02, 0.02, 0.38, 0x8a8e8c, { c: 0, y: 1.745 }); continue; } // a hanger, empty
      bx(T1, x, z, 0.2, 1.05, 0.44, COATS[(k * 3 + r) % COATS.length], { c: 0, y: 0.72, ry: ((k * 5 + r) % 3 - 1) * 0.12 });
    }
  }
  use(T1, 'look', 4.2, 8, 1.3, { label: 'Coats', text: 'Winter coats, a numbered ticket pinned to each sleeve. It was November up top. Nobody came back for them.' });
  /* the far end: a bench along the wall, facing the gates, between two planters gone to stalks */
  bx(T1, 9, 11.4, 3.4, 0.45, 0.6, LIME, { mat: 'stone' });
  for (const x of [6.6, 11.4]) { bx(T1, x, 11.4, 1, 0.8, 1, 0x6e6a62); for (let k = 0; k < 4; k++) P(T1, 'ico', x + Math.cos(k * 1.7) * 0.25, 11.4 + Math.sin(k * 1.7) * 0.25, 0.2, 0.9 + k * 0.2, 0.2, 0x5a4a2e, { y: 0.8, c: 0 }); }
  /* the checkpoint: everyone off the surface came through it, the bag scanner and its belt, the arch, the turnstiles,
     and the booth behind glass that watched them do it. Through it, the head of the grand stair, and the lobby below */
  room(T1, 'Checkpoint', 14, 0, 16, 12, { ...OPS, c: 'SEC', ht: 4, em: 1 }); door(T1, 25.4, -1, { sg: [['Surface lift', 'n'], ['Lobby', 's']] });
  bx(T1, 20, 3.2, 0.9, 0.95, 4, 0x5f6266); bx(T1, 20, 4, 1.1, 1, 1.6, 0x3a3d40, { y: 0.95 }); bx(T1, 20, 2.4, 0.7, 0.04, 0.5, 0x4a3a2c, { y: 0.95, c: 0 });
  bx(T1, 20, 0.6, 0.1, 1, 1.2, 0x8a8e8c); // the rail that closes the line at the wall
  for (const z of [6, 8.2]) bx(T1, 20, z, 0.25, 2.3, 0.25, 0x8a8e8c); bx(T1, 20, 7.1, 0.35, 0.25, 2.45, 0x8a8e8c, { y: 2.3, c: 0 });
  /* the turnstiles: each arm out from its post's south face across the lane, short of the next post or the wall */
  for (const z of [9.6, 11.2]) { bx(T1, 20, z, 0.9, 1, 0.3, 0x5f6266); bx(T1, 20.44, z + 0.413, 0.05, 0.05, 0.6, 0x8a8e8c, { y: 0.9, ry: 0.5, c: 0 }); }
  bx(T1, 25, 9, 0.06, 2.4, 6, [0.55, 0.66, 0.7], { mat: 'glass' }); bx(T1, 26.9, 6, 3.8, 2.4, 0.06, [0.55, 0.66, 0.7], { mat: 'glass' }); // the booth's glass, its way in at the east end
  desk(T1, 27.6, 10.6, 2.4, 0.7, { bare: 1 }); bx(T1, 27.6, 9.4, 0.45, 0.45, 0.45, 0x2c2f33);
  /* the booth's monitors: two screens on the desk, showing the checkpoint's own cameras (world.md §8, smaller screens
     first): the lobby below, the checkpoint, the surface landing, the shaft station. On the wing's feed: dark until the
     cut is mended, when the changed start walking the lit lobby and there is something worth watching */
  for (const x of [26.9, 28.3]) {
    bx(T1, x, 10.86, 0.6, 0.44, 0.08, 0x22262a, { y: 0.76, c: 0 }); // on the desk, at its back edge
    bx(T1, x, 10.81, 0.52, 0.36, 0.02, [0.04, 0.05, 0.05], { y: 0.84, c: 0, pw: [[0.04, 0.05, 0.05], [2.3, 2.42, 2.38]], pc: 'SEC' });
  }
  monitors(T1, 27.6, 9.8, 1.1, 'SEC', ['Lobby', 'Checkpoint', 'Surface landing', 'Shaft station']);
  /* and what they watch, recording: the line from the north-west corner, the arrival hall from its far end up to the
     gates, the shaft station from over goods inward's */
  camera(T1, 14.8, 0.8, 3.5, 0.79, 'SEC', 'wing', { name: 'Checkpoint' });
  camera(T1, 11.6, 11.6, 4, -2.66, 'SEC', 'wing', { name: 'Surface landing' });
  camera(D, 11.2, -1.2, 2.8, -1.17, 'SEC', 'wing', { name: 'Shaft station' });
  /* behind the booth, the wing's comms cupboard (world.md §8, Security at the station's size, 9): the switch its cameras
     run on, on the wing's own feed and none behind it, which is why the survivors' cut blinded them all */
  room(T1, 'Comms: wing', 30.5, 8, 2.5, 3, { ...SEC, c: 'SEC', ht: 2.8, zone: 'wing' }); door(T1, 30.25, 9.5, { plain: true, sg: [['Comms', 'w']] });
  comms(T1, 'SEC', 33, 9.75, 'w', 2.8, 'The switch the wing\'s cameras run on, a cable down to each and one away to the head end. On the wing\'s own feed, with no battery behind it.');
  bx(T1, 14.8, 4, 0.45, 0.42, 2.6, 0x5f6266); bx(T1, 14.3, 10.4, 0.5, 1.8, 1.4, 0x56636e); // a bench clear of the door from the hall, a cabinet
  corpse(T1, 22.8, 4.4, 0x2c3440, true, { label: 'Officer', say: 'A security officer. Whatever opened him did it from behind.', keys: ['s'] });

  /* The lobby: where the money shows (world.md §8, The lobby). A hall 38 by 24 m and 13 m to a luminous ceiling,
     backlit panels made to pass for daylight 400 m down. Down the grand stair from the checkpoint's gallery: the statue
     in the middle (the family that built the place; a placeholder, the logo or a gardening motif later), a lounge to the
     east, a bar under the gallery to the west. On the wing's feed: dark at the start, and the survivors raided the bar;
     mended, it lights end to end */
  const LB: RoomOpts = { ...FAM, c: 'SEC', ht: 13, em: 1, lc: [0.92, 0.86, 0.74] };
  /* its south-east reaches a row further, to the corridor's door; the west keeps a wall's width off the shaft's doors */
  room(D, 'Lobby', -8, -28, 38, 24, LB); room(D, 'Lobby', 14, -4, 16, 2.75, LB); // to goods inward's wall, half a metre off its floor
  door(D, 31, -3, { sg: [['Security', 'w'], ['Lobby', 'e']] });
  const LG: RoomOpts = { ...WALK, ht: 8, c: 'SEC', fl: FAM.fl, wl: FAM.wl, mat: { floor: 'terrazzo', wall: 'stone', upper: 'plaster', datum: 3.2 } };
  room(T1, 'Lobby gallery', -8, -6, 38, 2, LG); room(T1, 'Lobby gallery', 14, -4, 16, 2, LG);
  grandStair(D, T1, 8, -18, 8, 12, 's');
  /* the false sky: emitting (2 + its colour), with power. A diffuser hung under the roof, wall to wall and over the
     strip by the gallery too, deep enough that the light fittings and air grilles are behind it: their light comes
     through it, and they are not seen */
  for (const [x, z, w, d] of [[11, -16, 38, 24], [22, -3, 16, 2]] as const) bx(D, x, z, w, 0.18, d, [0.1, 0.1, 0.1], { y: 12.82, c: 0, pw: [[0.08, 0.08, 0.09], [2.85, 2.82, 2.72]], pc: 'SEC' });
  /* the statue: a plinth, and a figure in bronze looking up at the false sky */
  bx(D, 12, -23.6, 3.4, 1.1, 3.4, 0x9a9384); bx(D, 12, -23.6, 3.6, 0.12, 3.6, 0x7d776a, { y: 1.1, c: 0 });
  for (const dx of [-0.25, 0.25]) bx(D, 12 + dx, -23.6, 0.42, 2.1, 0.5, 0x6b5a3a, { y: 1.22 });
  bx(D, 12, -23.6, 1.2, 1.7, 0.6, 0x6b5a3a, { y: 3.3, c: 0 }); bx(D, 12, -23.7, 0.55, 0.6, 0.55, 0x6b5a3a, { y: 5.0, rz: 0.15, c: 0 });
  bx(D, 12.8, -23.6, 0.3, 1.5, 0.3, 0x6b5a3a, { y: 4.5, rz: -0.5, c: 0 }); bx(D, 11.2, -23.6, 0.3, 1.3, 0.3, 0x6b5a3a, { y: 3.4, rz: 0.2, c: 0 });
  /* the lounge, east: sofas round low tables, and planters gone to stalks */
  for (const [x, z] of [[21, -22], [21, -13]] as const) {
    bx(D, x, z, 1.8, 0.42, 1, 0x3a3226);
    for (const [ox, oz, w, d] of [[0, -2.5, 3.2, 0.9], [0, 2.5, 3.2, 0.9], [2.9, 0, 0.9, 2.6]] as const) { bx(D, x + ox, z + oz, w, 0.45, d, 0x5a3e34); bx(D, x + ox + (ox ? 0.34 : 0), z + oz + (oz > 0 ? 0.34 : oz < 0 ? -0.34 : 0), ox ? 0.25 : w, 0.9, ox ? d : 0.25, 0x4e352c, { c: 0 }); }
  }
  for (const [x, z] of [[-5.6, -26.8], [4, -26.8], [27.2, -26.8], [27.2, -8]] as const) { bx(D, x, z, 1.2, 0.8, 1.2, 0x6e6a62); for (let k = 0; k < 4; k++) P(D, 'ico', x + Math.cos(k * 1.7) * 0.3, z + Math.sin(k * 1.7) * 0.3, 0.2, 0.9 + k * 0.2, 0.2, 0x5a4a2e, { y: 0.8, c: 0 }); }
  /* the bar, under the gallery to the west: a counter, stools, and the bottles on the back wall that caught the
     emergency light; the survivors took what they could carry */
  bx(D, -1, -7.4, 10, 1.0, 0.7, 0x4a3226); bx(D, -1, -7.4, 10.3, 0.16, 0.85, 0x2a2c2e, { y: 1.0, c: 0 }); // a heavy top on a solid counter
  bx(D, -1, -4.3, 10, 2.4, 0.3, 0x3a2a20, { y: 0.2 }); for (const y of [1.1, 1.7]) bx(D, -1, -4.6, 10, 0.04, 0.35, 0x2a2c2e, { y, c: 0 });
  for (let k = 0; k < 22; k++) if ((k * 7) % 5 !== 0) P(D, 'cyl', -5.6 + k * 0.44, -4.56, 0.08, 0.3, 0.08, [[0.35, 0.55, 0.3], [0.6, 0.35, 0.15], [0.7, 0.68, 0.6], [0.3, 0.2, 0.15]][k % 4] as [number, number, number], { y: 1.14 + (k % 2) * 0.6, c: 0 });
  for (let k = 0; k < 6; k++) P(D, 'cyl', -5.2 + k * 1.6, -9.2, 0.4, 0.75, 0.4, 0x2c2f33); // the stools
  bx(D, -3.8, -9.6, 0.4, 0.05, 0.25, 0x5a6a50, { y: 0.01, ry: 0.6, c: 0 }); P(D, 'cyl', 2.6, -9.8, 0.08, 0.3, 0.08, 0x355530, { y: -0.11, rz: 1.5, c: 0 }); // a bottle, dropped (on its side: its middle 4 cm up)
  /* its walnut, gone soft in the wet since the air plant's dehumidifiers stopped (world.md §1, Decay): the veneer of its
     front let go at the seams, a sheet standing off it at one end */
  for (const [x, ry] of [[-4.6, 0.07], [-1.3, -0.06], [2.2, 0.08]] as const) bx(D, x, -7.77, 1.6, 0.9, 0.012, 0x6a4a32, { y: 0.05, ry, c: 0 }); // paler where the wet got in
  use(D, 'look', -1.3, -7.9, 0.7, { label: 'Bar', text: 'Walnut, and gone soft since the air went wet: the veneer of its front has let go at the seams and stands off it.' });
  /* its eye: one high in the north-east corner, over the lounge; the lobby is a public room, not armed, so it records */
  camera(D, 29.2, -27.2, 9, -0.79, 'SEC', 'wing', { name: 'Lobby' }); // looking south-west, over the lounge to the stair

  /* off goods inward, where things came off the hoist: hazardous storage, its suits on the wall and its rebreathers.
     Its heavy door runs off Ops' own bus, not the wing's: it waits on Gen-1 either way, cut or mended */
  room(D, 'Hazardous storage', 14, 12, 12, 10, { ...UTIL, c: 'SEC' }); door(D, 17, 11, { kind: 'heavy', c: 'OPS', sg: [['Hazard store', 'n']] });
  for (const [x, z] of [[15.2, 20.8], [16.6, 21], [15.2, 19.4], [24.8, 12.8], [23.6, 12.8]]) P(D, 'cyl', x, z, 0.6, 0.9, 0.6, 0xc9a227);
  for (let k = 0; k < 3; k++) bx(D, 19.2 + k * 1.2, 12.06, 0.5, 1.5, 0.12, 0xc9a227, { y: 0.4, c: 0 }); // hazmat suits on their pegs, against the wall
  shelf(D, 25.4, 17.2, 0.5, 2.2, { cols: [0xc9a227, 0x3d4042] }); bx(D, 20.8, 20.8, 0.8, 0.6, 0.6, 0x3a4030);
  item(D, 'rebreather', 20.8, 20.8, 0.6); item(D, 'kit', 25.3, 16.6, 1.06);
  /* its floor the slab itself, ground down to its stone and polished, with no coat for the wing's boots to wear
     through; the rooms off it are coated (SEC) */
  const SC: RoomOpts = { ...SEC, c: 'SEC', ht: 4.5, em: 1, safe: 1, armed: 1, mat: { ...SKIM(SEC), floor: 'polished' } };
  room(D, 'Security corridor', 32, -4, 36, 6, SC);
  /* the cut, near the wing's end: the cabinet left open, the cable through, and the one who did it */
  panel(D, 'SEC', 64.8, -4.68, 's', { cut: 1, zone: 'wing' }); // mended, it comes live on Security's board, and the wing sounds
  bx(D, 64.8, -4.71, 0.12, 2.7, 0.08, 0x2a2c2e, { y: 1.8, c: 0 }); // its conduit, up the wall to the ceiling
  /* the cut ends, hanging out of the bottom of the open cabinet */
  P(D, 'cyl', 64.6, -4.65, 0.07, 0.6, 0.07, 0x1d1f21, { y: 0.38, rz: 0.35, c: 0 }); P(D, 'cyl', 65, -4.65, 0.07, 0.45, 0.07, 0x1d1f21, { y: 0.51, rz: -0.3, c: 0 });
  corpse(D, 62.4, -2.2, 0x2c3440, false, { label: 'Guard', say: 'A guard, days dead, bolt cutters still in his hand. Behind him the feed to the wing is cut clean through.' });
  blood(D, 63, -1.4, 1.3); note(D, 'cut', 63.8, -1.2, 0.02); // days ago: the survivors' cut, to blind the wing's cameras
  /* the wing's eye, dead with it until the cut is mended: its corridor, past the checkpoint, is armed, and the camera
     looks down it from the lobby end. Mended, the way along the wing is watched */
  speaker(D, 'wing', 50, -1, 'CRIT'); camera(D, 32.8, -3.4, 3.9, PI / 2, 'SEC', 'wing');
  /* what was left of a barricade across the mouth of the wing */
  bx(D, 66.8, -2.6, 1.8, 0.75, 0.7, 0x5b5d5f, { ry: 0.5 });
  /* and the first of Holt's growth along the wing (world.md §8, Security overgrown in parts): the newest of the three
     places she has come through, so no flower yet. Her roots are coming west under the floor from the atrium; the slab,
     ground to its stone, has cracked over them down the middle of the corridor, and heaved where one came up through
     it, seedlings in the break */
  crack(D, 59.9, 0, -0.75, -PI / 2 - 0.08, 1.7, 'floor'); crack(D, 58.2, 0, -0.9, -PI / 2 + 0.05, 1.5, 'floor'); crack(D, 56.8, 0, -1.05, -PI / 2 - 0.15, 0.6, 'floor');
  heave(D, 56.3, -1.15, 0.2); crack(D, 55.9, 0, -1.3, -PI / 2 + 0.5, 1.1, 'floor');
  tobacco(D, 56.32, -1.18, 0.24, { age: 0 }); tobacco(D, 56.5, -0.95, 0.15, { age: 0 }); tobacco(D, 58.3, -0.85, 0.12, { age: 0 });
  /* North, a storey down: the medical isolation suite (world.md §8, Holding and The opening). Isolation rooms round a tall
     common hall, and over its south end, at the wing's own level, the nurses' station that the stair climbs to. The wing's
     feed is days cut; the suite runs on its own small backup set, kept for its locks, its readers and its pumps, and
     failing: its fittings low and stuttering. When it dies its emergency lights come up on their own cells, as the code
     wants: dimmer and cooler, not dark. You wake in room 1, on the west side; the other patient is in room 2, by the foot
     of the stair, their window facing yours across the hall; rooms 3 and 4, empty, are along the north side between you,
     in sight of your window; every isolation room's door is fail-safe: locked while the set runs, let go when it dies */
  const NIGHT: Colour = [0.3, 0.26, 0.2], BATT = { colour: [0.06, 0.065, 0.075] as Colour, supply: 'CELLS', watch: 'ISO' };
  const ISO: RoomOpts = { fl: 0x4c5250, wl: 0x6f7a77, st: 0x3f7f6b, c: 'ISO', em: 1, flick: 1, safe: 1, lc: NIGHT, batt: BATT, mat: { floor: 'vinyl', wall: 'block' } };
  const ROOM: RoomOpts = { ...ISO, lc: [0.5, 0.42, 0.32] };
  /* the hall, and its north-east bay at the stair's foot, walled off from room 4: the partition between them meets
     the one along the north side, so room 4 keeps its corner and nobody walks round the end of either */
  const IS: RoomOpts = { ...ISO, ht: 8 }, ISP: RoomOpts = { ...IS, part: 1 };
  room(B, 'Isolation suite', 42, -22, 14, 14, IS); room(B, 'Isolation suite', 53.25, -28, 2.75, 6, IS);
  /* and up to the partitions: the north side's, and rooms 1 and 2's, west and east. Room 1's is no taller than the
     room: over it, beyond the hall's west wall, are the check-in hall and screening */
  room(B, 'Isolation suite', 42, -22.75, 11.25, 0.75, ISP);
  room(B, 'Isolation suite', 41.25, -22, 0.75, 4, { ...ISP, ht: 3.2 }); room(B, 'Isolation suite', 56, -26, 0.75, 6, ISP);
  /* a room in use: its bed, its pump on its pole and the last bag hung on it, dry; its bed lamp on (`lamp`), whoever is
     in it shows against it at the glass. (x, z) the north-west corner of the room past its partition, 6 m square: the
     partition with its door and observation window is on its east (east) or west side, half a metre thick, the room
     reaching to it; the window's middle `win` metres along it from the north and the door's `dr`. The window's sill
     high enough that crouched under it nobody outside sees you */
  const isoRoom = (k: number, x: number, z: number, east: boolean, win: number, dr: number, lamp = false) => {
    const wx = east ? x + 7 : x - 1, bed = east ? x + 0.8 : x + 5.2, pole = bed + (east ? POLE.across : -POLE.across), at = z + 3 + POLE.along;
    room(B, 'Isolation room ' + k, east ? x : x - 0.75, z, 6.75, 6, lamp ? { ...ROOM, lc: [1.5, 1.25, 0.88] } : ROOM);
    door(B, wx, z + dr, { span: 2, card: 's', failsafe: true, c: 'ISO', sg: [['Isolation ' + k, east ? 'e' : 'w']] }); door(B, wx, z + win, { span: 2, glass: true, glaze: 'obs' });
    medbed(B, bed, z + 3, east ? 1 : -1); bx(B, bed + (east ? 1.2 : -1.2), z + 0.9, 0.45, 0.5, 0.4, 0xb8bcc0);
    bx(B, pole, at, 0.22, 0.17, 0.13, 0xd8dcd8, { y: 1.02, c: 0 }); // the pump on the bed's pole, its screen lit while it has power
    bx(B, pole + (east ? 0.12 : -0.12), at, 0.02, 0.07, 0.09, [0.05, 0.06, 0.05], { y: 1.08, c: 0, pw: [[0.05, 0.06, 0.05], [2.3, 2.55, 2.4]], pc: 'ISO' });
    return { x: pole, z: at };
  };
  /* yours, on a guard's card like the rest */
  const p1 = isoRoom(1, 34, -24, true, 3, 5); // its window straight across the hall at room 2's
  use(B, 'pump', p1.x, p1.z, 1.1);
  use(B, 'look', p1.x, p1.z, 1.55, { label: 'IV bag', text: 'MIDAZOLAM 100 mg in 100 mL sodium chloride 0.9%. Isolation 1. Hung 11/11, 23:10, M.O. Empty.' });
  use(B, 'look', 40.66, -23.4, 1.4, { label: 'Intercom', text: 'Static, and nothing under it.', sfx: 'static' });
  note(B, 'intake', 36, -23.1, 0.52);
  /* your washroom, out of sight of the hall, behind room 1: its door a plain one, slid by hand, that stays as you leave it
     (on the wing's dead feed, so no motor of its own) */
  room(B, 'Washroom', 34, -16, 6, 4, ROOM); door(B, 37.4, -17, { c: 'SEC' });
  for (const x of [34.6, 36.2]) bx(B, x, -12.6, 0.5, 0.85, 0.6, 0xc8ccd0); bx(B, 39, -15, 1, 2.1, 1, 0x8a9a94, { c: 0 });
  /* the other patient's, by the stair's foot: awake for days, their bag run dry first, and their lamp on. Tally marks by
     the bed, the chair they hit the glass with, the drawers turned out for anything to eat, and their hands on the inside
     of the window */
  const p2 = isoRoom(2, 58, -26, false, 5, 3, true); // its window straight across at yours, over the stair's foot
  use(B, 'look', p2.x, p2.z, 1.55, { label: 'IV bag', text: 'MIDAZOLAM 100 mg in 100 mL sodium chloride 0.9%. Isolation 2. Hung 8/11, 22:50, M.O. Dry, days ago.' });
  for (let k = 0; k < 3; k++) bx(B, 60.2 + k * 0.1, -25.995, 0.012, 0.32, 0.01, 0x2a2622, { y: 1.15, c: 0 });
  /* on the glass, the room's side of it (the pane's 3 cm in the middle of the wall) */
  for (const [z, y] of [[-21.3, 1.45], [-20.9, 1.62], [-20.6, 1.38], [-21.1, 1.8]]) bx(B, 57.018, z, 0.006, 0.09, 0.07, 0x5a4a3e, { y, c: 0 });
  bx(B, 60.8, -20.8, 0.45, 0.45, 0.45, 0x5f6266, { rz: PI / 2 - 0.15, ry: 0.4 }); // the chair, on its side by the window
  /* the drawers against the wall, pulled half out */
  bx(B, 61.2, -25.775, 0.6, 0.8, 0.45, 0x5f6266); for (const y of [0.2, 0.5]) bx(B, 61.2, -25.475, 0.5, 0.18, 0.4, 0x6a6e70, { y, c: 0 });
  room(B, 'Washroom', 58, -18, 6, 4, ROOM); door(B, 61.4, -19, { open: true });
  for (const z of [-17.4, -15.8]) bx(B, 63.4, z, 0.5, 0.85, 0.6, 0xc8ccd0); bx(B, 59.2, -15, 1, 2.1, 1, 0x8a9a94, { c: 0 });
  /* rooms 3 and 4, made up and empty, along the north side of the hall, between you: their doors open to a guard's card */
  for (const [k, x, w, cab] of [[3, 42, 4, 45.5], [4, 48, 4.75, 52.25]] as const) {
    room(B, 'Isolation room ' + k, x, -28, w, 4.75, ROOM); door(B, x + 1, -23, { span: 2, card: 's', failsafe: true, c: 'ISO', sg: [['Isolation ' + k, 's']] });
    medbed(B, x + 2, -27); bx(B, cab, -24.8, 0.45, 0.5, 0.4, 0xb8bcc0);
  }
  /* the hall: a kitchenette under the balcony, a table, plants nobody watered */
  bx(B, 47, -8.32, 5, 0.88, 0.6, 0x5a5e60); bx(B, 47, -8.34, 5.1, 0.04, 0.66, 0x8a8e8c, { y: 0.88, c: 0 }); bx(B, 47, -8.18, 5, 0.7, 0.35, 0x5a5e60, { y: 1.6, c: 0 });
  bx(B, 52.8, -8.36, 0.8, 1.9, 0.7, 0xb8bcc0);
  tbl(B, 46.8, -15.6, 2.4, 1.2, 0x6b5a48); for (const [x, z] of [[46, -16.7], [47.6, -16.7], [46, -14.5], [47.6, -14.5]]) bx(B, x, z, 0.45, 0.45, 0.45, 0x3a3d40);
  for (const [x, z] of [[42.8, -14.8], [42.8, -13]]) { P(B, 'cyl', x, z, 0.5, 0.5, 0.5, 0x8a6a4a); P(B, 'ico', x, z, 0.8, 0.5, 0.8, 0x5a4a34, { y: 0.5, c: 0 }); } // clear of the door to the retreat
  /* the stair up to the station, wide, against the east wall; by its foot a flashlight, out, where somebody dropped it */
  stairs(B, D, 52, -22, 2, 10, 's'); stairs(B, D, 54, -22, 2, 10, 's'); exitSign(B, 56.725, -20.8, 3, 'w'); // on the wall the stair climbs
  item(B, 'flash', 53.85, -27, 0.02);
  room(D, "Nurses' station", 36, -12, 22, 6, { ...WALK, c: 'SEC', ht: 3.5, safe: 1, fl: 0x4c5250, wl: 0x6f7a77 }); door(D, 47.4, -5, { open: true, sg: [['Isolation', 's']] });
  exitSign(D, 47, -6.025, 2.5, 'n');
  desk(D, 41, -6.8, 1.8, 0.7, { bare: 1 }); bx(D, 41, -6.6, 0.5, 0.34, 0.06, 0x22262a, { y: 0.76, c: 0 }); bx(D, 41, -6.64, 0.44, 0.28, 0.02, [0.06, 0.12, 0.1], { y: 0.79, c: 0, pw: [[0.04, 0.05, 0.05], [2.2, 2.75, 2.5]], pc: 'SEC' });
  bx(D, 41, -8, 0.45, 0.45, 0.45, 0x2c2f33); bx(D, 51, -6.6, 1.6, 0.42, 0.4, 0x44484c);
  /* the whiteboard on the wall behind the desk, its sedation orders seven weeks old: read off the board itself */
  bx(D, 52.8, -6.02, 1.7, 1.0, 0.04, 0xe2e2da, { y: 1.15, c: 0 });
  for (let k = 0; k < 5; k++) { const w = 0.7 + (k % 3) * 0.2; bx(D, 53.5 - (k % 2) * 0.15 - w / 2, -6.045, w, 0.03, 0.01, 0x2a3a6a, { y: 1.9 - k * 0.15, c: 0 }); } // its lines, from a margin on the reader's left (east)
  note(D, 'board', 52.8, -6.05, 1.5, true);
  item(D, 'batt', 41.8, -6.8, 0.78); note(D, 'duty', 40.2, -6.9, 0.78); item(D, 'baton', 50.4, -6.6, 0.44); item(D, 'ration', 51.6, -6.6, 0.44);
  /* The briefing room (world.md §8, one control room): where the response team was told what the day held, and the
     survivors' last room. A vestibule off the corridor, with the plan table and a window onto the corridor they held,
     opens into the room proper, which runs east behind the atrium's north wall: a projection screen across its north
     wall, the lectern, chairs in rows with an aisle down the middle, the station's plans on the walls. The survivors
     slept at the back of it. Behind the officer's card, and dark with the wing. */
  room(D, 'Briefing room', 60, -14, 6, 8.75, { ...OFF, c: 'SEC', ht: 4 }); door(D, 63.4, -5, { card: 's', sg: [['Briefing', 's']] });
  room(D, 'Briefing room', 60, -24, 14, 10, { ...OFF, c: 'SEC', ht: 4 });
  door(D, 61, -5, { seal: true, glass: true }); room(D, 'Security corridor', 60, -4.75, 6, 0.75, { ...SC, part: 1 }); // the vestibule's wall on the corridor, a window in it
  bx(D, 67, -23.98, 10, 2.9, 0.04, 0xd8d4c4, { y: 0.9, c: 0 }); bx(D, 67, -23.97, 10.2, 0.12, 0.06, 0x2a2c2e, { y: 3.8, c: 0 }); // the screen, on the wall
  bx(D, 67, -17.6, 0.5, 0.25, 0.6, 0x2c2f33, { y: 3.4, c: 0 }); bx(D, 67, -17.6, 0.06, 0.35, 0.06, 0x2c2f33, { y: 3.65, c: 0 }); // the projector, on its rod from the ceiling
  bx(D, 67, -17.92, 0.16, 0.12, 0.04, [0.05, 0.05, 0.05], { y: 3.45, c: 0, pw: [[0.05, 0.05, 0.05], [2.9, 2.85, 2.7]], pc: 'SEC' });
  bx(D, 62.4, -22.2, 0.6, 1.1, 0.5, 0x4a3a2c); bx(D, 62.4, -22.28, 0.7, 0.05, 0.6, 0x3a2c22, { y: 1.1, c: 0 }); // the lectern, its top flat enough for the briefing to lie on
  /* the chairs, as the last briefing left them; a few knocked over since */
  for (const [z, zi] of [[-20.4, 0], [-18.4, 1], [-16.4, 2]] as const) for (const [x, xi] of [[62.6, 0], [64, 1], [65.4, 2], [68.6, 3], [70, 4]] as const) {
    const k = zi * 5 + xi, down = k === 3 || k === 11;
    if (down) { bx(D, x, z + 0.4, 0.45, 0.45, 0.45, 0x2c2f33, { ry: 0.4 + k * 0.2, rz: PI / 2 - 0.1 }); continue; }
    bx(D, x, z, 0.45, 0.45, 0.45, 0x2c2f33, { ry: ((k * 7) % 5 - 2) * 0.05 }); bx(D, x, z + 0.2, 0.45, 0.5, 0.05, 0x2c2f33, { y: 0.45, c: 0 }); // its back, on the seat's back edge
  }
  /* the station's plans, on the walls: a floor to a sheet */
  for (const [x, z, ew] of [[60.015, -21.4, true], [60.015, -17.2, true], [69.2, -14.015, false]] as const) {
    bx(D, x, z, ew ? 0.03 : 2.2, 1.4, ew ? 2.2 : 0.03, 0xd8d4c4, { y: 1.2, c: 0 });
    for (let k = 0; k < 4; k++) bx(D, x + (ew ? 0.02 : (k - 1.5) * 0.5), z + (ew ? (k - 1.5) * 0.5 : -0.02), ew ? 0.02 : 0.3, 0.6 + (k % 2) * 0.3, ew ? 0.3 : 0.02, [0x39485a, 0x8c2f24, 0x4a5a3a, 0x8a7a4a][k], { y: 1.45, c: 0 });
  }
  /* where the survivors slept: bedrolls along the back wall, and what they ate */
  for (const x of [69.8, 71.9]) bx(D, x, -14.9, 1.9, 0.14, 0.7, 0x4a5240, { c: 0 });
  for (const [x, z] of [[68.4, -15.8], [68.7, -15.4], [73.2, -15.9]] as const) P(D, 'cyl', x, z, 0.08, 0.11, 0.08, 0x8a8e8c, { c: 0 });
  tbl(D, 63, -10.4, 2.6, 1.4, 0x4a3a2c); bx(D, 63, -10.4, 2.2, 0.01, 1.1, 0xd8d4c4, { y: 0.76, c: 0 }); // the plan of the floor, pinned out
  shelf(D, 73.4, -20, 0.5, 2.4, { cols: [0x4d5a66, 0x7a4a34, 0x8a7a4a] });
  note(D, 'cams', 62.4, -22.24, 1.16); item(D, 'batt', 71.2, -14.9, 0.16, 2); item(D, 'ammo9', 61, -7, 0.02);
  /* South off the wing: the locker room, the survivors' back way into the muster hall (a door at each end, down the
     aisle between the banks), and the infirmary. The back door is the wing's, on its feed like the room: cut, it slides
     by hand; and it makes the level's first loop, the wing to the hall by the atrium or by the lockers */
  room(D, 'Locker room', 32, 3.25, 16, 18.75, { ...SEC, c: 'SEC', safe: 1 }); door(D, 39.4, 3, { sg: [['Lockers', 'n']] });
  door(D, 39.4, 23, { c: 'SEC', sg: [['Lockers', 's']] });
  /* its wall on the corridor a partition, a strip of glass along its top sharing the corridor's light */
  room(D, 'Security corridor', 32, 2, 16, 0.75, { ...SC, part: 1 }); for (const x of [33, 35, 43, 45, 47]) door(D, x, 3, { span: 2, seal: true, glass: true, glaze: 'high' });
  for (const z of [9, 15]) for (const x of [34.8, 43.2]) { bx(D, x, z, 5.6, 2, 1, 0x4d5a66); bx(D, x, z, 5.64, 0.05, 1.04, 0x3a444c, { y: 2, c: 0 }); }
  for (const x of [34.8, 43.2]) for (const z of [6.4, 12, 17.6]) bx(D, x, z, 4.4, 0.45, 0.4, 0x6b5a48);
  for (const [x, z, ry] of [[37, 9.696, 0.9], [41.2, 15.722, -1.1], [33.6, 15.741, 1.3]] as const) bx(D, x, z, 0.5, 1.8, 0.03, 0x56636e, { y: 0.15, ry, c: 0 }); // doors left open, swung out from the banks' faces
  note(D, 'lockers', 42.4, 12, 0.47); item(D, 'bandage', 44.8, 17.6, 0.47); bx(D, 36.2, 20.8, 1.6, 0.45, 0.4, 0x6b5a48, { ry: 0.35 }); blood(D, 39, 20.4, 1.1);
  /* off the locker room's west side, the wet half it never had (world.md §8, Security at the station's size): the
     showers, open stalls down the west wall, a bench, towels on their hooks; and the toilets, stalls with their doors
     back, urinals, basins under a mirror. On the wing's feed with the lockers, so dead */
  const WET: RoomOpts = { ...SEC, c: 'SEC', fl: 0x8a8e8c, wl: 0xc8ccc8, st: 0x39485a, mat: { floor: 'epoxy', wall: 'glazed', ceiling: 'concrete' } };
  const PAN = 0xe8e8e2, CUBE = 0x5a6670, STEELW = 0x8a8e8c;
  room(D, 'Showers', 27, 11, 4.5, 5.5, WET); door(D, 31.75, 13.6, { plain: true, sg: [['Showers', 'e']] });
  room(D, 'Toilets', 27, 17, 4.5, 5, WET); door(D, 31.75, 20.4, { plain: true, sg: [['Toilets', 'e']] });
  for (const z of [12.4, 13.7, 15]) bx(D, 27.6, z, 1.2, 2, 0.04, CUBE, { y: 0.1 }); // the stalls' screens
  for (const z of [11.7, 13.05, 14.35, 15.75]) { bx(D, 27.1, z, 0.2, 0.05, 0.12, STEELW, { y: 2.1, c: 0 }); P(D, 'cyl', 27.6, z, 0.15, 0.01, 0.15, 0x3a3d40, { c: 0 }); } // a head each, a drain
  bx(D, 29.6, 13.75, 0.4, 0.45, 2.4, 0x6b5a48); // the bench
  for (const [k, x] of [29.4, 30.1, 30.8].entries()) { bx(D, x, 11.02, 0.06, 0.06, 0.04, STEELW, { y: 1.75, c: 0 }); if (k !== 1) bx(D, x, 11.02, 0.4, 0.8, 0.04, [0xd8d4c4, 0x6a8aaa][k % 2], { y: 0.95, c: 0 }); } // hooks, towels
  bx(D, 30.4, 15.6, 0.6, 0.03, 0.5, 0xd8d4c4, { ry: 0.5, c: 0 }); // one on the floor
  for (const z of [18.75, 20.25]) bx(D, 27.8, z, 1.6, 1.8, 0.04, CUBE, { y: 0.12 }); // the toilets' stalls
  for (const z of [17.02, 18.79, 20.29]) bx(D, 28.25, z, 0.7, 1.75, 0.04, CUBE, { y: 0.12, c: 0 }); // their doors, back
  bx(D, 28.6, 19.5, 0.04, 0.04, 5, STEELW, { y: 1.95, c: 0 });
  for (const z of [17.9, 19.5, 21.1]) { bx(D, 27.4, z, 0.65, 0.4, 0.4, PAN); bx(D, 27.08, z, 0.16, 0.8, 0.45, PAN); }
  for (const x of [30.2, 31]) bx(D, x, 21.825, 0.4, 0.6, 0.35, PAN, { y: 0.45 }); // urinals
  bx(D, 31.225, 18.3, 0.55, 0.85, 1.8, 0xb8bcc0); for (const z of [17.85, 18.75]) { P(D, 'cyl', 31.2, z, 0.3, 0.03, 0.38, PAN, { y: 0.85, c: 0 }); P(D, 'cyl', 31.42, z, 0.03, 0.15, 0.03, STEELW, { y: 0.85, c: 0 }); }
  bx(D, 31.485, 18.3, 0.03, 0.9, 1.6, 0xaab4b8, { y: 1.15, c: 0, mat: 'steel' }); // the mirror
  /* the infirmary: a ward of four beds behind curtains down the south wall, and at the east end a treatment bay behind
     glass, with its table and crash cart. They kept the hurt here, in the dark, and someone sat with the last of them */
  room(D, 'Infirmary', 50, 3.25, 16, 8.75, { ...MED, c: 'SEC', safe: 1, ht: 3.6 }); door(D, 57, 3, { sg: [['Infirmary', 'n']] });
  /* the ward's wall on the corridor is a partition, windows either side of the door: the nurses could see who came */
  room(D, 'Security corridor', 50, 2, 16, 0.75, { ...SC, part: 1 }); for (const x of [53, 61, 63]) door(D, x, 3, { span: 2, seal: true, glass: true });
  for (const x of [51.2, 53.8, 56.4, 59]) medbed(D, x, 9.2);
  /* the curtains, hung from tracks on the ceiling */
  for (const x of [52.5, 55.1, 57.7]) {
    bx(D, x, 9.2, 0.04, 1.9, 1.7, 0xb9c4bd, { y: 0.15, c: 0 }); bx(D, x, 9.2, 0.05, 0.04, 1.8, 0x9aa0a4, { y: 3.46, c: 0 });
    for (const dz of [-0.8, 0, 0.8]) bx(D, x, 9.2 + dz, 0.01, 1.42, 0.01, 0x9aa0a4, { y: 2.04, c: 0 });
  }
  bx(D, 58.4, 7.4, 0.45, 0.45, 0.45, 0x5f6266); blood(D, 59, 9.2, 0.8); // the chair pulled up to the last bed
  bx(D, 60.5, 5.6, 0.05, 2.1, 3.2, [0.55, 0.66, 0.7], { mat: 'glass' }); // the treatment bay's glass
  bx(D, 63.2, 6, 0.8, 0.9, 2, 0xb9c4bd); bx(D, 65, 8.4, 0.6, 0.95, 0.5, 0x8c2f24); bx(D, 50.7, 4.6, 0.6, 0.9, 0.5, 0xc8ccd0); // table, crash cart, sink
  /* the treatment bay's shelf, against its south wall across from the table. Its middle on a column of the light's
     lattice (lightField.ts), so its ends fall past the half way to the next: what is dark inside it stays inside it,
     not a slab on the wall beside it */
  shelf(D, 53.6, 4.6, 1.8, 0.5, { cols: [0xd4d8d4, 0xb9c4bd, 0x8c2f24] }); shelf(D, 63.125, 11.75, 1.8, 0.5, { cols: [0xd4d8d4, 0xb9c4bd, 0x8c2f24] });
  item(D, 'bandage', 62.5, 11.75, 1.04, 2); item(D, 'medkit', 63.6, 11.75, 1.04);

  /* The atrium: the highway's bend, and the threshold. The wing's leg runs into it from the west, dark; it is lit,
     theirs, and the second leg leaves it south for Operations. Two storeys, a gallery round two sides at +5 with a
     stair up the core, and in the middle the core itself: the Security elevator, on the wing's feed. */
  const AT: RoomOpts = { ...OPS, ht: 9.5, em: 1, lc: [0.85, 0.8, 0.68] };
  for (const [x, z, w, d] of [[68, -12, 20, 6], [68, 2, 20, 10], [68, -6, 6, 8], [82, -6, 6, 8]]) room(D, 'Atrium', x, z, w, d, AT);
  room(D, 'Security elevator', 76, -4, 4, 4, { ...SEC, c: 'SEC', em: 1, noroam: 1 }); door(D, 75, -0.6, { sg: [['Security elevator', 'w']] });
  bx(D, 79.97, -2, 0.06, 0.5, 0.4, 0x2c2f33, { y: 1.1, c: 0 }); use(D, 'elev', 79.8, -2, 1.3, { c: 'SEC', to: 'main' }); D.marks['elev:main'] = [78, -2, PI / 2];
  room(D, 'Phase 2', 76, -18, 4, 4, { ...UTIL, lit: 'none', nolamp: 1, noroam: 1 }); door(D, 77, -13, { kind: 'heavy', seal: true, msg: 'Welded shut. Stencilled across it: PHASE 2. NOT COMMISSIONED.', sg: [['Phase 2', 's']] });
  /* the stair up the core, and the gallery it climbs to: where the family's upper corridor comes out, so theirs too.
     Stone treads, a stone balustrade on the atrium side that rises with it to the gallery's slab, where the gallery's
     glass takes over; against the core, a balustrade only where the core does not reach (the foot, and the head) */
  stairs(D, T1, 82, -8, 2, 12, 'n', true);
  for (let q = 0, N = 24; q < N; q++) {
    const sh = ((q + 1) / N) * 5, z = 4 - ((q + 0.5) / N) * 12, d = 12 / N, o = { y: -0.005, flush: true };
    bx(D, 83, z, 2, sh + 0.005, d, q % 2 ? 0xb3ab9c : 0xa9a192, { ...o, c: 0 });
    bx(D, 84.16, z, 0.32, Math.min(sh + 1.05, 4.75) + 0.005, d, 0x8f877a, o);
    if (z < -6 || z > 2) bx(D, 81.84, z, 0.32, sh + 1.05 + 0.005, d, 0x8f877a, o);
  }
  const GW: RoomOpts = { ...WALK, ht: 4.5, c: 'OPS', fl: OPS.fl, wl: OPS.wl, lc: AT.lc, mat: { floor: 'terrazzo', wall: 'block' } };
  room(T1, 'Gallery', 68, -12, 20, 4, GW); room(T1, 'Gallery', 84, -8, 4, 20, GW);
  /* and where the corridor comes out onto it, the growing process across the gallery's back wall, the length of the
     gallery ahead of you as you come out; on Ops' power, so lit from the start */
  exhibit(T1, 'process', 77, -12, 2, 's', 10, 2.2, STAGES.map((s, k) => [s.key, stageAt(k, 10)]));
  /* the atrium's eye: one on the threshold from the south-west corner, which only records (the atrium is not armed);
     its speaker high in the well by the east gallery's rail, out of reach but from there */
  speaker(D, 'atrium', 83.4, 9.2, 'CRIT'); camera(D, 68.6, 11.2, 3.8, PI, 'OPS', 'atrium');
  /* Ops' comms cupboard (world.md §8, Security at the station's size, 9), off the atrium's north arm: the switch its
     camera and the outer office's run on */
  room(D, 'Comms: operations', 88.5, -11.5, 2.5, 3, { ...SEC, c: 'OPS', ht: 2.8, zone: 'atrium' }); door(D, 88.25, -9.5, { plain: true, sg: [['Comms', 'w']] });
  comms(D, 'OPS', 91, -9.75, 'w', 2.8, 'The switch the atrium\'s camera and the outer office\'s run on, a cable down to each and one away to the head end. On Ops\' own feed, with no battery behind it.');
  /* where the light changes, it starts: eggs at the threshold, on their side */
  eggs(D, 68.8, -3.2, 2); eggs(D, 68.6, 1.2, 3); blood(D, 82.6, 8.6, 1.4);
  /* Holt's growth (world.md §8, Security overgrown in parts): not the bush's, which comes out of the changed, but
     hers, up from under the station, where Phase 2 broke into the cave. The upper station is the top of her, so where
     she has come through it she is mostly flower. Of the three places she has, this is the oldest, and the most in
     flower: out round the weld of Phase 2's door, its seams and under it; the floor before it heaved up into a crater,
     and her flowers up out of it under the gallery, the lowest leaf cured; spires in the gap between the gallery and
     the core, flowering at its rail, across from the boards that say our seedlings take in a day; and her roots out
     under the floor toward the wing, the floor cracked over them. The old one of Ops stands in it (its round, below):
     nothing tall is on the line along the north arm from either end to where it stands, so whatever hides it there
     hides you as well */
  {
    const age = 0.65, g = grower('phase 2'), arm = (x: number, z: number) => x > 68.3 && x < 87.7 && z > -11.9 && z < -6.2;
    /* out of the seams, where the weld held and the door gave: either side, and under it; its leaf pressed flat to the
       slab round them */
    forced(D, [[76.06, 0.75, -12.87], [76.2, 0.9, -12.55], [76.35, 1.35, -12.15], [76.3, 2, -11.75], [76.12, 2.55, -11.45]], 0.06, { age });
    forced(D, [[77.94, 1.55, -12.87], [77.8, 1.7, -12.5], [77.72, 2.1, -12.1], [77.95, 2.75, -11.7], [78.25, 3.25, -11.45]], 0.05, { age });
    forced(D, [[77.1, 0.03, -12.95], [77.15, 0.04, -12.45], [77.25, 0.14, -12.05], [77.3, 0.7, -11.8], [77.36, 1.45, -11.7]], 0.07, { age });
    for (const [x, y, tilt] of [[76.22, 0.55, 0.5], [76.25, 1.05, -0.3], [76.3, 1.6, 0.9], [77.75, 1.3, -0.6], [77.7, 1.95, 0.4], [77.45, 0.3, 1.1]] as const) {
      const len = g.rnd(0.22, 0.34);
      pressed(D, x, y, -12.85, 0, len, len * 0.62, tilt, tone(age + g.rnd(-0.2, 0.2), g));
    }
    rootThrough(D, [[76.7, 0.035, -13.05], [76.55, 0.045, -12.45], [76.2, 0.05, -11.95], [75.5, 0.06, -11.6], [74.8, 0.03, -11.4]], 0.1, 0.06);
    bore(D, 74.75, 0, -11.38, [0, 1, 0], 0.06, { dir: [-0.6, -0.8, 0], small: true, g });
    /* the wall cracked either side of it, and over it */
    crack(D, 75.6, 0.1, -12, -0.25, 1.5, 0); crack(D, 78.45, 0.2, -12, 0.3, 1.7, 0); crack(D, 77.3, 2.7, -12, 0.15, 1.3, 0);
    /* the crater, and what came up out of it and round it, under the gallery */
    heave(D, 77.1, -10.55, 0.6, { g });
    litter(D, 77.1, -10.6, 1.5, { n: 22, dry: 0.8, inside: arm, g });
    bed(D, 78.4, -11.45, 0.5, { age, inside: arm }); bed(D, 75.9, -11.45, 0.45, { age, inside: arm }); bed(D, 77.4, -9.55, 0.5, { age: 0.5, inside: arm });
    candelabra(D, 80, -10.2, 2.6, { age, heave: true }); bells(D, 75, -10.75, 1.8, { age: 0.6, heave: true });
    spire(D, 73.6, -11, 2.9, { age: 0.6, heave: true }); cup(D, 81.4, -10.7, 1.5, { age: 0.5, heave: true });
    tobacco(D, 72.2, -11.1, 1.3, { age: 0.55, bloom: true }); heave(D, 72.2, -11.1, 0.2);
    tobacco(D, 83, -10.9, 1.2, { age: 0.5, bloom: true }); heave(D, 83, -10.9, 0.18);
    tobacco(D, 84.6, -11.3, 0.5, { age: 0.2 });
    /* along the wall either side of the door, thick with flower */
    for (const [x, h, a] of [[73, 1.6, 0.6], [74.4, 1.1, 0.5], [81.9, 1.5, 0.55], [80.6, 0.9, 0.45]] as const) { tobacco(D, x, -11.45, h, { age: a, bloom: true }); heave(D, x, -11.45, 0.16); }
    bed(D, 73.9, -11.3, 0.55, { age, inside: arm }); bed(D, 81.1, -11.35, 0.55, { age, inside: arm }); bed(D, 79.1, -9.9, 0.4, { age: 0.5, inside: arm });
    /* in the gap between the gallery and the core, up past the gallery's floor to flower at its rail */
    spire(D, 76.2, -7.05, 6.4, { age: 0.6, heave: true }); spire(D, 77.75, -6.95, 5.6, { age: 0.55, heave: true });
    spire(D, 79.2, -7, 6.9, { age: 0.7, heave: true }); spire(D, 80.9, -7.1, 4.4, { age: 0.5, heave: true });
    bed(D, 77, -7.1, 0.75, { age: 0.5, inside: arm }); bed(D, 80, -7, 0.6, { age: 0.5, inside: arm });
    /* her roots out under the floor, humped up through it and down again: west toward the wing, and east */
    const hump = (pts: [number, number, number][], d0: number, d1: number) => {
      rootThrough(D, pts, d0, d1);
      const [a, b] = [pts[pts.length - 2], pts[pts.length - 1]], L = Math.hypot(b[0] - a[0], b[2] - a[2]) || 1;
      bore(D, b[0], 0, b[2], [0, 1, 0], d1, { dir: [(b[0] - a[0]) / L * 0.6, -0.8, (b[2] - a[2]) / L * 0.6], small: true });
    };
    hump([[76.6, -0.06, -10.5], [75.7, 0.09, -10.1], [74.9, 0.1, -9.8], [74.2, -0.05, -9.55]], 0.12, 0.08);
    hump([[72.95, -0.05, -9.05], [72.2, 0.06, -8.6], [71.5, -0.04, -8.1]], 0.07, 0.05);
    bore(D, 72.95, 0, -9.05, [0, 1, 0], 0.07, { small: true });
    hump([[77.7, -0.06, -10.45], [78.5, 0.09, -10.15], [79.2, -0.05, -9.85]], 0.1, 0.07);
    /* and on under the floor, cracking it, round into the west arm toward the wing: her front, seedlings up the cracks */
    crack(D, 71.3, 0, -7.9, -0.9, 1.5, 'floor'); crack(D, 70.4, 0, -6.6, -0.5, 1.6, 'floor'); crack(D, 69.9, 0, -5.1, -0.2, 1.3, 'floor');
    tobacco(D, 70.3, -6.5, 0.22, { age: 0 }); tobacco(D, 69.8, -4.95, 0.16, { age: 0 });
  }
  /* the second leg: south from the atrium between the offices, and out into the muster hall */
  room(D, 'Operations corridor', 74, 12, 6, 12, { ...OPS, ht: 4.5, em: 1, mat: SKIM(OPS) });
  /* the Operations zone sounds here: the corridor, and the hall's east bays */
  speaker(D, 'ops', 77, 20, 'CRIT'); mut(D, 'changed', 77, 18, { walk: 0.7, steps: 88 });
  /* the old one of Ops (world.md §8, Security overgrown in parts): one of the older of the changed, and drawn to Holt's
     flowers before Phase 2's door, as the bush's line is to what smells of Pia (§10, rule 8). Its round ends there, and
     it stands a minute among them, facing them; then down the west arm to where it kept before, to the deputy
     director's open door to look in, and back. As slow as the oldest walk */
  mut(D, 'changed', 77.4, -9.3, { yaw: PI, walk: 0.35, steps: 60, round: [
    { F: D, x: 77.4, z: -9.3, wait: 60, face: PI }, { F: D, x: 72, z: 7, wait: 6 }, { F: D, x: 75.2, z: 17, wait: 10, face: -PI / 2 },
  ] });
  blood(D, 76, 15.4, 1.2);
  /* Operations' offices, either side of the corridor (world.md §8, Security at the station's size): a house that minds
     how it looks gave its two officers rooms to match. West, the deputy director's, its door open as she left it: her
     desk facing the door, a table to meet at, her coat still on its stand. East, behind her card, the chief of
     security's suite: the outer office, where a secretary kept the door and a camera watches it, so armed, its camera in
     the far corner on the door; off it the chief's own office, its window on the atrium, and the records room; past the
     chief's desk, the conference room */
  const OF: RoomOpts = { ...OFF, c: 'OPS', lc: [0.85, 0.78, 0.62] }, WALNUT = 0x4a3226, STEELC = 0x5f6266, SEAT = 0x2c2f33;
  /* a chair whose sitter faces `face`, its back behind them */
  const chair = (x: number, z: number, face: 'n' | 's' | 'e' | 'w', back = 0.5) => {
    bx(D, x, z, 0.45, 0.45, 0.45, SEAT);
    const [bx2, bz] = { n: [0, 0.2], s: [0, -0.2], e: [-0.2, 0], w: [0.2, 0] }[face], ew = face === 'e' || face === 'w';
    bx(D, x + bx2, z + bz, ew ? 0.05 : 0.45, back, ew ? 0.45 : 0.05, SEAT, { y: 0.45, c: 0 });
  };
  /* a screen on a desk, its face toward whoever sits on side `s` of it (1 east, -1 west) */
  const screenEW = (x: number, z: number, s: 1 | -1) => {
    bx(D, x, z, 0.06, 0.34, 0.5, 0x22262a, { y: 0.76, c: 0 });
    bx(D, x + s * 0.04, z, 0.02, 0.28, 0.44, [0.04, 0.05, 0.05], { y: 0.79, c: 0, pw: [[0.04, 0.05, 0.05], [2.2, 2.75, 2.5]], pc: 'OPS' });
  };
  const cabinet = (x: number, z: number) => bx(D, x, z, 0.5, 1.3, 0.6, STEELC);
  const coatStand = (x: number, z: number, coat?: number) => {
    P(D, 'cyl', x, z, 0.4, 0.03, 0.4, 0x2a2c2e, { c: 0 }); P(D, 'cyl', x, z, 0.05, 1.8, 0.05, 0x2a2c2e, { c: 0 });
    if (coat) bx(D, x + 0.05, z, 0.16, 1.0, 0.44, coat, { y: 0.78, c: 0 });
  };
  /* the deputy director's */
  room(D, 'Office: operations', 64, 14, 8, 8, OF); door(D, 73, 17, { open: true, span: 2 });
  desk(D, 66.6, 17.5, 0.8, 1.9, { c: WALNUT, bare: 1 }); screenEW(66.85, 17.9, -1); chair(65.7, 17.5, 'e'); for (const z of [17, 18]) chair(67.6, z, 'w');
  shelf(D, 64.6, 17.2, 0.5, 1.8, { cols: [0x7a4a34, 0x4d5a66, 0x8a7a4a] });
  tbl(D, 69.8, 20.4, 1, 1, WALNUT); chair(69.8, 19.6, 's'); chair(69.8, 21.2, 'n'); chair(69, 20.4, 'e'); chair(70.6, 20.4, 'w');
  coatStand(71.4, 15, 0x6a5a48); cabinet(64.4, 21.4); cabinet(65, 21.4);
  bx(D, 68, 14.015, 1.2, 0.9, 0.03, 0x3a3026, { y: 1.3, c: 0 }); bx(D, 68, 14.035, 1.05, 0.75, 0.01, 0x5a6a4a, { y: 1.375, c: 0 }); // a print of the low field
  /* the chief's outer office, behind her card */
  room(D, 'Outer office', 82, 14, 8, 8, { ...OF, armed: 1 }); door(D, 81, 17, { card: 'o', span: 2, sg: [['Chief of security', 'w']] });
  desk(D, 85.2, 17, 0.8, 2, { c: WALNUT, bare: 1 }); screenEW(84.95, 16.6, 1); chair(86.1, 17, 'w');
  bx(D, 85.1, 17.6, 0.22, 0.08, 0.2, 0x2a2c2e, { y: 0.76, c: 0 }); // the telephone
  for (const x of [83.2, 84, 84.8]) chair(x, 14.45, 's'); bx(D, 84, 15.3, 1.6, 0.4, 0.6, WALNUT); // the waiting chairs, and their table
  shelf(D, 89.4, 17.2, 0.5, 1.8, { cols: [0x7a4a34, 0x4d5a66, 0x8a7a4a] });
  coatStand(82.5, 15); cabinet(84, 21.7); cabinet(84.6, 21.7);
  bx(D, 83, 21.4, 0.5, 0.5, 0.5, 0x6e6a62); for (let k = 0; k < 3; k++) P(D, 'ico', 83 + Math.cos(k * 2.1) * 0.1, 21.4 + Math.sin(k * 2.1) * 0.1, 0.12, 0.6 + k * 0.15, 0.12, 0x5a4a2e, { y: 0.5, c: 0 });
  camera(D, 89.2, 21.2, 2.8, -1.99, 'OPS', 'ops');
  /* the chief's own office: panelled, its window on the atrium, the desk facing it and the door; a safe in the corner,
     drinks on the sideboard, books */
  room(D, 'Office: chief of security', 88.5, 3, 8.5, 8.5, { ...OF, fl: 0x4a3e34, lc: [0.9, 0.82, 0.66] }); door(D, 89.4, 12.75, { sg: [['Chief of security', 's']] });
  for (const z of [6.25, 8.75]) door(D, 88.25, z, { span: 2, seal: true, glass: true, glaze: 'view' });
  desk(D, 94.6, 7.25, 1, 2.4, { c: WALNUT, bare: 1 }); screenEW(94.3, 6.6, 1); chair(95.7, 7.25, 'w', 0.75); for (const z of [6.7, 7.8]) chair(93.5, z, 'e');
  bx(D, 93.8, 7.25, 3.6, 0.012, 3.2, 0x5a2e2a, { c: 0 }); // the rug
  bx(D, 96.5, 3.5, 0.8, 1, 0.7, 0x3a4038); P(D, 'cyl', 96.085, 3.5, 0.16, 0.03, 0.16, 0x8a8e8c, { y: 0.635, rz: PI / 2, c: 0 }); // the safe, its dial
  bx(D, 92.5, 3.25, 1.8, 0.85, 0.5, WALNUT); for (const [x, h] of [[91.9, 0.3], [92.3, 0.24], [92.8, 0.3]] as const) P(D, 'cyl', x, 3.25, 0.1, h, 0.1, 0x6a4a2a, { y: 0.85, c: 0 });
  bx(D, 92.5, 11.3, 3, 2, 0.4, WALNUT); // the bookcase, and its books
  for (const [r, y] of [0.35, 0.95, 1.55].entries()) for (let k = 0; k < 8; k++) bx(D, 91.25 + k * 0.33 + (r % 2) * 0.08, 11.09, 0.26, 0.4 - ((k + r) % 3) * 0.05, 0.02, [0x5a2e2a, 0x2c3440, 0x3a4a30, 0x6a5a3c][(k + r) % 4], { y, c: 0 });
  bx(D, 96.985, 4.8, 0.03, 0.8, 1.1, 0x3a3026, { y: 1.3, c: 0 }); bx(D, 96.965, 4.8, 0.01, 0.65, 0.95, 0x6a6458, { y: 1.375, c: 0 }); // a photograph
  note(D, 'mgr', 66.4, 17, 0.78); item(D, 'batt', 66.4, 18.1, 0.78); note(D, 'chief', 94.9, 6.4, 0.78); item(D, 'ammo9', 94.9, 8.1, 0.78); item(D, 'medkit', 87.6, 15.2, 0.02);
  /* the records room, off the outer office: two rows of cabinets, a drawer left out, the report on top */
  room(D, 'Records', 90.5, 14, 6.5, 8, { ...OF, fl: 0x5a5d5a, mat: { floor: 'vinyl', wall: 'board', ceiling: 'tiles' } }); door(D, 90.25, 20.4, {});
  for (const x of [92.5, 95]) {
    bx(D, x, 18, 1.2, 1.35, 5.6, 0x6a6e70);
    for (const s of [-1, 1]) {
      for (const y of [0.33, 0.67, 1.01]) bx(D, x + s * 0.605, 18, 0.01, 0.02, 5.6, 0x4a4e50, { y, c: 0 });
      for (let k = 1; k < 12; k++) bx(D, x + s * 0.605, 15.2 + k * (5.6 / 12), 0.01, 1.35, 0.02, 0x4a4e50, { c: 0 });
    }
    for (const z of [15.6, 16.2, 17.8]) bx(D, x, z, 0.4, 0.28, 0.32, 0xb8a888, { y: 1.35 }); // archive boxes on top
  }
  bx(D, 91.65, 19.9, 0.5, 0.3, 0.45, 0x6a6e70, { y: 0.69 }); // a drawer, out
  note(D, 'sealed', 92.5, 20.3, 1.36);
  /* the conference room, past the chief's desk */
  room(D, 'Conference room', 97.5, 3, 8.5, 8.5, OF); door(D, 97.25, 10.4, {});
  tbl(D, 101.75, 7.25, 5, 1.4, WALNUT); // room to walk round either end of it
  for (const x of [100, 101.25, 102.5, 103.75]) { chair(x, 5.95, 's'); chair(x, 8.55, 'n'); }
  bx(D, 105.98, 7.25, 0.04, 1.1, 2.4, 0xe2e2da, { y: 1.1, c: 0 }); // the whiteboard, and what was last drawn on it
  for (let k = 0; k < 4; k++) bx(D, 105.955, 7.1 + (k % 2) * 0.2, 0.01, 0.03, 0.9 + (k % 3) * 0.3, [0x2a3a6a, 0x8c2f24][k % 2], { y: 1.9 - k * 0.2, c: 0 });
  bx(D, 101.75, 3.25, 2.4, 0.85, 0.5, WALNUT); P(D, 'cyl', 101.2, 3.25, 0.14, 0.26, 0.14, 0xb8c4c8, { y: 0.85, c: 0 }); // the sideboard, a water jug
  /* Maintenance, the Ops side's (world.md §8, Security at the station's size): a workshop, and through the rock east of
     it the room Ops' backup set stands in, on its own as a set should be, and its fuel beside it behind another wall.
     All dug and left as dug, and dark on the set's own power, as Maintenance always was */
  const MW: RoomOpts = { ...UTIL, c: 'OPS', ht: 4 };
  room(D, 'Maintenance', 82, 24, 14, 12, MW); door(D, 81, 27, { sg: [['Maintenance', 'w']] });
  room(D, 'Generator room', 97, 24, 7, 7, MW); door(D, 96.5, 28, { sg: [['Generator', 'w']] });
  room(D, 'Fuel store', 97, 32, 7, 5, { ...UTIL, c: 'OPS' }); door(D, 100.5, 31.5, { sg: [['Fuel store', 'n']] });
  /* the set, on a plinth: its radiator, the engine, the alternator; its exhaust up from the engine and along under the
     roof into the return air; its day tank and the panel you start it at; the transfer switch on the wall. A line
     painted round it, kept clear */
  const PLINTH = 0x6b6e70, ENGINE = 0x3d5a44, LAG = 0xb8b2a0;
  bx(D, 100.5, 26.6, 4.6, 0.15, 1.9, PLINTH);
  bx(D, 98.5, 26.6, 0.5, 1.7, 1.7, 0x2c2f33, { y: 0.15 }); bx(D, 100.1, 26.6, 2.4, 1.3, 1.3, ENGINE, { y: 0.15 }); bx(D, 102, 26.6, 1.2, 1.2, 1.2, 0x44525a, { y: 0.15 });
  for (const x of [99.4, 100.8]) P(D, 'cyl', x, 26.95, 0.32, 0.3, 0.32, 0x2c2f33, { y: 1.45, c: 0 }); // its air filters
  P(D, 'cyl', 100.4, 26.3, 0.22, 2.15, 0.22, LAG, { y: 1.45, c: 0 }); P(D, 'cyl', 100.4, 25.4, 0.22, 1.9, 0.22, LAG, { y: 3.6 - 0.95, rz: PI / 2, ry: PI / 2, c: 0 });
  bx(D, 100.4, 24.3, 0.9, 0.6, 0.6, 0x7a7d80, { y: 3.4, c: 0 }); // the return air's duct, through the wall
  for (const [x0, z0, x1, z1] of [[97.9, 25.3, 103.1, 25.3], [97.9, 27.9, 103.1, 27.9], [97.9, 25.3, 97.9, 27.9], [103.1, 25.3, 103.1, 27.9]] as const) paint(x0, z0, x1, z1);
  bx(D, 98.2, 30.2, 1.2, 0.3, 0.7, 0x3a3d40); bx(D, 98.2, 30.2, 1.2, 0.9, 0.7, 0x8a7a3a, { y: 0.3 }); bx(D, 98.82, 30.2, 0.02, 0.6, 0.06, 0xd8d0b8, { y: 0.45, c: 0 }); // the day tank, its sight glass
  P(D, 'cyl', 98.95, 28.75, 0.06, 2.2, 0.06, 0x2a2c2e, { y: 0.03 - 1.1, rz: PI / 2, ry: PI / 2, c: 0 }); // its feed to the engine
  genset(D, 'OPS', 102.5, 30.4, 102.5, 29.4);
  bx(D, 103.7, 30.2, 0.6, 2, 1.2, 0x5f6266); bx(D, 103.39, 30.2, 0.02, 0.1, 0.1, [0.2, 0.2, 0.2], { y: 1.6, c: 0, pw: [[0.2, 0.2, 0.2], [0.4, 2.6, 0.6]], pc: 'OPS' });
  use(D, 'look', 103.35, 30.2, 1.3, { label: 'Transfer switch', text: 'Ops\' supply: from Gen-1, or from this set when Gen-1 drops. Its handle at AUTO.' });
  bx(D, 103.6, 24.45, 0.8, 0.35, 0.4, 0x2c2f33); // its starting batteries
  /* the fuel store: a tank walled round low to hold it if it leaks, a hand pump on top; drums on a spill pallet; an
     extinguisher by the door */
  for (const [x, z, w, d] of [[101, 33.2, 5, 0.15], [101, 36.5, 5, 0.15], [98.5, 34.85, 0.15, 3.15], [103.5, 34.85, 0.15, 3.15]] as const) bx(D, x, z, w, 0.4, d, 0x8a8e8c);
  for (const x of [99.8, 102.2]) bx(D, x, 34.85, 0.2, 0.3, 1, 0x3a3d40);
  P(D, 'cyl', 101, 34.85, 1.4, 3.6, 1.4, 0x8a8e8c, { y: 0.95 - 1.8, rz: PI / 2, c: 0 }); colT(D, 101, 34.85, 3.6, 1.4, 1.65);
  bx(D, 101.6, 34.85, 0.2, 0.25, 0.2, 0x8c2f24, { y: 1.62, c: 0 }); P(D, 'cyl', 101.6, 34.85, 0.04, 0.5, 0.04, 0x2a2c2e, { y: 1.87, c: 0 }); // the hand pump
  use(D, 'look', 101, 33.6, 1.3, { label: 'Tank', text: 'Diesel, for the set next door. Walled round to hold it if it leaks.' });
  bx(D, 97.75, 35.8, 1.2, 0.15, 2.38, 0xc9a227); for (const z of [35.05, 35.65, 36.25]) P(D, 'cyl', 97.75, z, 0.58, 0.88, 0.58, 0x8c2f24, { y: 0.15 });
  P(D, 'cyl', 98.8, 32.25, 0.18, 0.6, 0.18, 0xb3261e, { c: 0 });
  /* the workshop: the bench along the north wall and its pegboard; the supervisor's desk under the board of work
     orders; a pillar drill; the welding set and its bottles; cable drums; a chain hoist on a beam; the parts shelf, the
     kit on it; and in the south-east corner the tool cage, its gate open, the shadow board in it with one outline
     empty, long and narrow: the bolt cutters at the wing's cut were taken from here */
  bx(D, 88, 24.45, 6, 0.9, 0.8, 0x5a5048); bx(D, 88, 24.45, 6.1, 0.06, 0.85, 0x6b5a3c, { y: 0.9, c: 0 });
  bx(D, 85.3, 24.55, 0.22, 0.18, 0.26, 0x2a2c2e, { y: 0.96, c: 0 }); // the vice
  bx(D, 88, 24.015, 4, 1.2, 0.03, 0x8a7a5a, { y: 1.3, c: 0 }); // the pegboard, and what hangs on it
  for (let k = 0; k < 9; k++) bx(D, 86.3 + k * 0.42, 24.04, k % 3 ? 0.05 : 0.14, k % 3 ? 0.34 + (k % 2) * 0.12 : 0.05, 0.02, k % 4 === 1 ? 0xc8641e : 0x3a3d40, { y: 1.55 + (k % 2) * 0.25, c: 0 });
  desk(D, 93.5, 24.6, 1.4, 0.7, { bare: 1, c: 0x5a5048 }); chair(93.5, 25.45, 'n');
  bx(D, 93.5, 24.015, 1.6, 1, 0.03, 0x8a6a44, { y: 1.3, c: 0 }); // the board
  for (let k = 0; k < 6; k++) bx(D, 92.95 + (k % 3) * 0.5, 24.035, 0.3, 0.38, 0.01, 0xe2ddd0, { y: 1.85 - Math.floor(k / 3) * 0.45, c: 0 });
  note(D, 'orders', 93.5, 24.06, 1.8, true);
  bx(D, 83.2, 31.5, 0.6, 0.05, 0.5, 0x3a3d40); P(D, 'cyl', 83.2, 31.6, 0.09, 1.6, 0.09, 0x4a5a4a); bx(D, 83.2, 31.45, 0.36, 0.34, 0.5, 0x4a5a4a, { y: 1.3, c: 0 }); // the pillar drill
  bx(D, 82.6, 33.6, 0.6, 0.7, 0.5, 0x8c2f24); for (const [z, c] of [[33.95, 0x2a2c2e], [34.25, 0x8c2f24]] as const) P(D, 'cyl', 82.6, z, 0.24, 1.3, 0.24, c, { c: 0 }); // the welding set, its bottles
  for (const x of [89, 90.2]) { P(D, 'cyl', x, 34.9, 1, 0.6, 1, 0x7a5a38, { y: 0.2, rz: PI / 2, c: 0 }); colT(D, x, 34.9, 0.6, 1, 1); } // cable drums, on their sides
  bx(D, 88, 29.5, 5, 0.2, 0.15, 0xc9a227, { y: 3.8, c: 0 }); bx(D, 88.6, 29.5, 0.3, 0.25, 0.2, 0x2a2c2e, { y: 3.55, c: 0 }); // the hoist's beam, its block
  bx(D, 88.6, 29.5, 0.03, 1.95, 0.03, 0x5a5d60, { y: 1.6, c: 0 }); bx(D, 88.6, 29.5, 0.12, 0.14, 0.06, 0x2a2c2e, { y: 1.46, c: 0 }); // its chain, its hook
  shelf(D, 85.2, 35.7, 1.8, 0.5, { cols: [0xc9a227, 0x3d4042] }); item(D, 'kit', 85.2, 35.7, 1.06);
  const TC = [92, 32, 96, 36] as const;
  for (let z = TC[1] + 0.2; z < TC[3] - 0.05; z += 0.2) bx(D, TC[0], z, 0.03, 2.2, 0.03, MESH, { c: 0 });
  for (let x = TC[0]; x < TC[2] - 0.05; x += 0.2) if (x < 93.9 || x > 95.1) bx(D, x, TC[1], 0.03, 2.2, 0.03, MESH, { c: 0 });
  for (const y of [0, 2.2]) { bx(D, TC[0], 34, 0.05, 0.05, 4, MESH, { y, c: 0 }); bx(D, 94, TC[1], 4, 0.05, 0.05, MESH, { y, c: 0 }); }
  colT(D, TC[0], 34, 0.08, 4, 2.2); for (const [x0, x1] of [[TC[0], 93.9], [95.1, TC[2]]]) colT(D, (x0 + x1) / 2, TC[1], x1 - x0, 0.08, 2.2);
  for (const t of [0.1, 0.3, 0.5, 0.7, 0.9, 1.1]) bx(D, 95.1, 32 - t, 0.03, 2.1, 0.03, MESH, { c: 0 }); // its gate, open
  for (const y of [0.1, 2]) bx(D, 95.1, 31.4, 0.04, 0.05, 1.2, MESH, { y, c: 0 });
  bx(D, 95.985, 34, 0.03, 1.2, 1.6, 0x3a4048, { y: 1, c: 0 }); // the shadow board, its tools on their outlines
  for (const [z, y, h, w] of [[33.45, 1.25, 0.5, 0.12], [33.85, 1.3, 0.4, 0.1], [34.6, 1.35, 0.35, 0.16], [34.6, 1.85, 0.15, 0.3]] as const) {
    bx(D, 95.965, z, 0.01, h + 0.06, w + 0.06, 0xe2ddd0, { y: y - 0.03, c: 0 }); bx(D, 95.955, z, 0.02, h, w, 0x9aa0a4, { y, c: 0, mat: 'steel' });
  }
  bx(D, 95.965, 34.3, 0.01, 0.96, 0.18, 0xe2ddd0, { y: 1.08, c: 0 }); bx(D, 95.96, 34.3, 0.01, 0.9, 0.12, 0x3a4048, { y: 1.11, c: 0 }); // the empty one
  bx(D, 95.6, 35.4, 0.7, 1, 0.8, 0x8c2f24); // the tool chest

  /* The muster hall: where the response team drilled (world.md §8). Long, flat and lit, on Ops' backup set: a promenade
     round a sunken court, the court's ceiling lifted into a coffer, and rooms off every side, each with a door. Over its
     south side, behind a wall of glass on the court, the operations room, over every crossing. Its east bays, the stair
     up to it hang off their own breaker (EAST), in the electrical room at the far, west end; the room itself is on critical
     power, which nothing out here can switch. */
  const MH: RoomOpts = { ...OPS, ht: 4.5, em: 1, lc: [0.86, 0.82, 0.72], c: 'HALL' };
  for (const [x, z, w, d] of [[22, 24, 16, 24], [38, 24, 24, 4], [38, 44, 24, 4]] as const) room(D, 'Muster hall', x, z, w, d, MH);
  room(D, 'Muster hall', 62, 24, 18, 24, { ...MH, c: 'EAST' });
  /* the court: 1.25 m down (five steps; floors keep to the grid's quarter metres), with steps the length of both long sides (they sat on them for the muster) and a glass
     balustrade at each end; over it the ceiling lifts to 8.5 m, the drill clock hangs in the middle, and the operations
     room looks down on it through its glass */
  room(D, 'Muster court', 38, 28, 24, 16, { ...MH, dy: -1.25, ht: 9.75 });
  flight(D, 38, 28, 24, 4, -1.25, 0, 'n', 5); flight(D, 38, 40, 24, 4, -1.25, 0, 's', 5);
  for (const x of [37.92, 62.08]) { bx(D, x, 36, 0.06, 1, 16, [0.55, 0.66, 0.7], { mat: 'glass' }); bx(D, x, 36, 0.12, 0.06, 16.1, 0x5a5d60, { y: 1, c: 0 }); }
  bx(D, 50, 36, 2.6, 1.1, 0.5, 0x22262a, { y: 6.2, c: 0 });
  for (const z of [35.74, 36.26]) bx(D, 50, z, 2.2, 0.7, 0.02, [0.05, 0.04, 0.04], { y: 6.4, c: 0, pw: [[0.05, 0.04, 0.04], [2.6, 0.5, 0.3]], pc: 'HALL' });
  for (const x of [49, 51]) bx(D, x, 36, 0.04, 2.45, 0.04, 0x2a2c2e, { y: 7.3, c: 0 }); // its rods, up to the coffer's ceiling
  for (const [x, z, c] of [[44, 28.02, 0x39485a], [56, 28.02, 0x8a7a4a], [44, 43.98, 0x8a7a4a], [56, 43.98, 0x39485a]] as const) bx(D, x, z, 1.4, 2.2, 0.04, c, { y: 5.9, c: 0 });
  bx(D, 39.4, 36, 0.6, 1.1, 0.5, 0x4a3a2c); P(D, 'cyl', 39, 33.2, 0.05, 2.2, 0.05, 0x8a8a84, { c: 0 }); bx(D, 39, 33.6, 0.03, 0.6, 0.9, 0x39485a, { y: 1.5, c: 0 });
  eggs(D, 52, 34.4, 3); eggs(D, 46.8, 37.6, 2); blood(D, 49, 36, 1.6);
  /* the drains backing up (the work orders, 5/11): Holt's growth come up the court's drains, the lowest floor in the
     hall, where its water goes (world.md §8, Security overgrown in parts). Younger than the atrium's: the gully at the
     west end of the north steps burst, its grate thrown aside, a spire out of it coming into flower and a stalk beside
     it with its first; a crack run on east along the drain under the floor, and seedlings where it opened. The gully
     at the east end as they all were. Across the court from the operations room, seen over its glass, and from the
     hall above the steps */
  {
    const gully = (x: number, z: number) => {
      bx(D, x, z, 0.38, 0.004, 0.38, 0x1c1814, { y: 0.001, c: 0, flush: true });
      for (let k = -2; k <= 2; k++) bx(D, x + k * 0.07, z, 0.025, 0.006, 0.34, 0x4a4d50, { y: 0.004, c: 0, flush: true });
    };
    gully(59.5, 32.75);
    const g = grower('drains'), tip = 0.42, t = 0.02, L = 0.38;
    heave(D, 41.4, 32.8, 0.3, { g });
    bx(D, 41.98, 33.3, L, t, L, 0x3e4144, { y: (L / 2) * Math.sin(tip) + (t / 2) * Math.cos(tip) - 0.01 - t / 2, rz: -tip, ry: 0.6, c: 0, mat: 'steel' }); // its grate, thrown off
    spire(D, 41.35, 32.85, 2.5, { age: 0.3 }); tobacco(D, 42.3, 32.8, 1.4, { age: 0.3, bloom: true }); heave(D, 42.3, 32.8, 0.15);
    tobacco(D, 40.75, 33.2, 0.7, { age: 0.15 });
    crack(D, 42.6, 0, 32.6, PI / 2 - 0.05, 1.5, 'floor'); crack(D, 44.2, 0, 32.55, PI / 2 + 0.08, 1.3, 'floor');
    heave(D, 45.6, 32.6, 0.12); tobacco(D, 45.55, 32.65, 0.24, { age: 0 }); tobacco(D, 45.85, 32.5, 0.16, { age: 0 });
  }
  /* pillars round the court and down both ends; the track painted round the hall; benches, the muster board, shields */
  for (const [x, z] of [[29, 31], [29, 41], [71, 31], [71, 41], [37, 27], [63, 27], [37, 45], [63, 45]]) {
    bx(D, x, z, 0.9, 4.5, 0.9, 0x8c887e); bx(D, x, z, 1, 0.3, 1, 0x5a5d60, { c: 0 });
  }
  for (const z of [24.8, 47.2]) bx(D, 50.4, z, 55.2, 0.01, 0.12, 0xc9a227, { y: 0.012, c: 0 });
  for (const x of [22.8, 78]) bx(D, x, 36, 0.12, 0.01, 22.4, 0xc9a227, { y: 0.012, c: 0 });
  bx(D, 29, 24.025, 3.2, 1.6, 0.05, 0x2c3440, { y: 1.1, c: 0 }); for (let k = 0; k < 5; k++) bx(D, 27.62 + k * 0.69, 24.055, 0.42, 0.56, 0.01, 0xd8d4c4, { y: 1.5 + (k % 2) * 0.4, c: 0 });
  for (const z of [29.2, 42.8]) bx(D, 22.5, z, 0.4, 0.45, 3, 0x6b5a48);
  for (let k = 0; k < 4; k++) bx(D, 22.132, 39.8 + k * 0.6, 0.12, 1.2, 0.55, 0x3a3d40, { y: 0.003, rz: 0.12, c: 0 }); // shields, leaning on the wall
  /* the east bays: crowd barriers left where the last drill had them */
  for (const [x, z, ry] of [[68, 36, 0], [75, 32.8, 0.4], [74, 40.4, -0.3], [66, 28.4, PI / 2]] as const) {
    bx(D, x, z, 0.3, 1.05, 2.4, 0xc9a227, { ry }); bx(D, x, z, 0.32, 0.12, 2.42, 0x2a2c2e, { y: 0.6, ry, c: 0 });
  }
  /* off the hall's west end, the response team's training room: weights under a mirror, a squat rack, the bench, a
     punch bag, two treadmills and a rower; mats by the door; the board with the week's PT on it. On the hall's breaker,
     dark until Gen-1, as the range is */
  room(D, 'Training room', 8, 23, 13, 8, { ...SEC, c: 'HALL', ht: 4, fl: 0x3a4a5a, mat: { floor: 'vinyl', wall: 'block', ceiling: 'concrete' } });
  door(D, 21.5, 25.6, { sg: [['Training', 'e']] });
  const IRON = 0x2a2c2e, BLK = 0x3a3d40;
  bx(D, 12.5, 23.015, 7, 1.8, 0.03, 0xaab4b8, { y: 0.4, c: 0, mat: 'steel' }); // the mirror
  bx(D, 11.5, 23.45, 3, 0.55, 0.5, IRON); for (let k = 0; k < 8; k++) P(D, 'cyl', 10.3 + k * 0.34, 23.45, 0.14, 0.3, 0.14, BLK, { y: 0.47, rz: PI / 2, c: 0 }); // the dumbbells on their rack
  for (const x of [15.4, 16.6]) for (const z of [23.8, 25]) bx(D, x, z, 0.08, 2.3, 0.08, IRON); // the squat rack
  for (const z of [23.8, 25]) bx(D, 16, z, 1.28, 0.08, 0.08, IRON, { y: 2.3, c: 0 }); for (const x of [15.4, 16.6]) bx(D, x, 24.4, 0.08, 0.08, 1.28, IRON, { y: 2.3, c: 0 });
  P(D, 'cyl', 16, 23.85, 0.05, 2.2, 0.05, STEELW, { y: 1.4 - 1.1, rz: PI / 2, c: 0 }); for (const x of [15.1, 16.9]) P(D, 'cyl', x, 23.85, 0.45, 0.06, 0.45, IRON, { y: 1.37, rz: PI / 2, c: 0 });
  bx(D, 11, 27.6, 0.35, 0.45, 1.3, IRON); for (const x of [10.75, 11.25]) bx(D, x, 26.9, 0.06, 1.1, 0.06, IRON); P(D, 'cyl', 11, 26.9, 0.05, 2, 0.05, STEELW, { y: 1.05 - 1, rz: PI / 2, c: 0 }); // the bench and its bar
  bx(D, 19.3, 28.8, 0.03, 1.4, 0.03, STEELW, { y: 2.6, c: 0 }); P(D, 'cyl', 19.3, 28.8, 0.4, 1.2, 0.4, 0x8c2f24, { y: 1.4 }); // the punch bag
  for (const x of [12.2, 14]) {
    bx(D, x, 30, 0.8, 0.22, 1.8, IRON); for (const dx of [-0.35, 0.35]) bx(D, x + dx, 29.2, 0.05, 1.1, 0.05, BLK, { y: 0.22, c: 0 });
    bx(D, x, 29.2, 0.8, 0.2, 0.25, BLK, { y: 1.32, c: 0 }); // a treadmill, its console
  }
  bx(D, 17.5, 30.4, 2.2, 0.22, 0.3, BLK); bx(D, 16.5, 30.4, 0.45, 0.5, 0.5, IRON); bx(D, 18, 30.4, 0.3, 0.08, 0.3, IRON, { y: 0.22, c: 0 }); // the rower
  bx(D, 19.4, 25.6, 1.6, 0.04, 2.2, 0x2a4a7a, { c: 0 }); // mats
  bx(D, 8.015, 27, 0.03, 1, 1.6, 0xe2e2da, { y: 1.2, c: 0 }); for (let k = 0; k < 4; k++) bx(D, 8.035, 26.9 + (k % 2) * 0.2, 0.01, 0.03, 0.9 + (k % 3) * 0.2, [0x2a3a6a, 0x8c2f24][k % 2], { y: 1.95 - k * 0.2, c: 0 });
  use(D, 'look', 8.1, 27, 1.6, { label: 'Whiteboard', text: 'RESPONSE TEAM PT, 06:00. FITNESS TESTS THIS MONTH.' });
  /* its eyes: the hall is a promenade, not armed, so the two out here only record (one high in the coffer, on the
     hall's own breaker; one in the east bays' north-east corner, on EAST). The rooms off it that are armed have their
     own, inside, on the hall's breaker: the electrical room, the Armory, the range; and the operations stair, on EAST,
     sounding the Operations zone. The speaker hangs low enough to reach; like every speaker on the level it is on the
     PA, which is on critical power: smashing it is the only answer */
  speaker(D, 'muster', 29, 36, 'CRIT');
  camera(D, 38.2, 36, 7.6, PI / 2, 'HALL', 'muster', { name: 'Muster court' }); camera(D, 79.4, 24.6, 4, -PI / 4, 'EAST', 'ops', { name: 'East bays' });
  /* their comms cupboards, one a breaker (world.md §8, Security at the station's size, 9): the hall's off its west
     wall, which the court's camera and the armed rooms' off the hall run on; the east bays' off theirs, for the bays'
     camera and the operations stair's */
  room(D, 'Comms: muster hall', 19, 45, 2.5, 3, { ...SEC, c: 'HALL', ht: 2.8, zone: 'muster' }); door(D, 21.75, 46.5, { plain: true, sg: [['Comms', 'e']] });
  comms(D, 'HALL', 19, 46.75, 'e', 2.8, 'The switch the hall\'s cameras run on, the court\'s and those in the rooms off it, a cable down to each and one away to the head end. On the hall\'s breaker, with no battery behind it.');
  room(D, 'Comms: east bays', 80.5, 41.5, 2.5, 3, { ...SEC, c: 'EAST', ht: 2.8, zone: 'ops' }); door(D, 80.25, 42.5, { plain: true, sg: [['Comms', 'w']] });
  comms(D, 'EAST', 83, 42.75, 'w', 2.8, 'The switch the east bays\' camera and the operations stair\'s run on, a cable down to each and one away to the head end. On the bays\' breaker, with no battery behind it.');

  /* west, off the hall's far end: the electrical room, and the one who came for it. Armed: its camera hangs over the
     door looking across at the board, so the way to the board is in its view. The board breaks Ops' feed out to the hall
     (HALL: its lights, the court, the cameras of the rooms off it, this one's too) and its east bays (EAST: their
     lights, the operations stair, two cameras): each a trade, and a third way left spare. The operations room and the PA are not on it: they are
     critical operations power, panelled inside the operations room's own walls, and its schedule says so. A lamp over
     the cabinet for each branch, for the critical feed, and for Ops itself */
  room(D, 'Electrical room', 10, 32, 10, 8, { ...UTIL, c: 'OPS', safe: 1, armed: 1 }); door(D, 21, 35, { sg: [['Electrical', 'e']] });
  camera(D, 19.2, 32.6, 2.8, -1.08, 'HALL', 'muster', { name: 'Electrical room' });
  bx(D, 10.02, 35, 0.04, 1.7, 3.4, 0x3a3d40, { y: 0.55, c: 0 });
  for (const [c, z] of [['HALL', 33.2], ['EAST', 35]] as const) panel(D, c, 10.11, z, 'e', { brk: 1 });
  bx(D, 10.08, 36.8, 0.08, 0.5, 0.5, 0x2c2f33, { y: 1.1, c: 0 }); // the spare way, blanked
  use(D, 'look', 10.4, 36.8, 1.6, { label: 'Panel schedule', text: 'Typed, under plastic. 1: MUSTER HALL WEST (AND COURT). 2: MUSTER HALL EAST (AND OPS STAIR). 3: SPARE. Below, in red: OPERATIONS AND SECURITY PA ARE CRITICAL LOADS. FED FROM THE UPS ROOM BEHIND OPERATIONS. NOT ON THIS BOARD.' });
  bx(D, 15, 32.4, 4.4, 2.2, 0.6, 0x4a4f55);
  for (const [k, c] of (['HALL', 'EAST', 'CRIT', 'OPS'] as const).entries()) bx(D, 13.3 + k * 1.2, 32.72, 0.5, 0.3, 0.04, [0.2, 0.2, 0.2], { y: 1.5, c: 0, pw: [[0.2, 0.2, 0.2], [0.4, 2.6, 0.6]], pc: c });
  bx(D, 17.6, 38.4, 1.2, 1.6, 1, 0x44525a); bx(D, 14.8, 39.85, 3.4, 0.08, 0.3, 0x2a2c2e, { y: 2.8, c: 0 }); item(D, 'batt', 12, 38.8, 0.02);
  corpse(D, 23.8, 35.6, 0x2c3440, true, { label: 'Guard', say: 'A guard, a step short of the electrical room. REYES, on the name tape. Opened from the side, by something that kept going.' });
  blood(D, 25.2, 36.8, 1.8);

  /* north, off the hall: the Armory, the response team's, where they kept what they drilled with. Armed, its camera
     in the north-west corner on the door */
  room(D, 'Armory', 50, 14, 10, 8, { ...SEC, c: 'OPS', armed: 1 }); camera(D, 50.8, 14.8, 2.8, 0.53, 'HALL', 'muster', { name: 'Armory' }); door(D, 55, 23, { kind: 'heavy', code: 1, c: 'OPS', sg: [['Armory', 's']] });
  shelf(D, 50.6, 17.2, 0.5, 3, { empty: 1 }); shelf(D, 59.4, 17.2, 0.5, 3, { empty: 1 }); bx(D, 55, 15, 0.9, 0.7, 0.7, 0x3a4030);
  for (let k = 0; k < 6; k++) bx(D, 51.8 + k * 1.24, 19.2, 0.05, 2.4, 0.05, 0x2a2c2e, { c: 0 }); bx(D, 54.8, 19.2, 3.2, 0.05, 0.05, 0x2a2c2e, { y: 2.4, c: 0 }); // the cage
  item(D, 'pistol', 50.7, 15.8, 1.06); item(D, 'ammo9', 50.7, 17, 1.06, 2); item(D, 'shotgun', 50.7, 18.4, 1.06); item(D, 'shells', 59.3, 16, 1.06, 2); item(D, 'tacvest', 59.3, 18, 1.06); item(D, 'surf', 55, 15, 0.7);

  /* south, off the hall: the range (dark until Gen-1: it has no emergency lights), the duty office with its window on
     the hall, and the stair up to the operations room */
  room(D, 'Firing range', 22, 50, 28, 8, { ...SEC, c: 'OPS', ht: 3.4, armed: 1 }); door(D, 25.4, 49, { sg: [['Range', 'n']] });
  camera(D, 22.8, 50.8, 3, 1.24, 'HALL', 'muster', { name: 'Firing range' }); // armed, its camera by the door looking down the lanes: blind until Gen-1 lights them
  bx(D, 29.2, 53, 0.5, 1, 6, 0x44484c); for (const z of [52, 54, 56]) bx(D, 30.1, z, 0.9, 1.8, 0.06, 0x5a5d60);
  for (const z of [51, 53, 55]) { bx(D, 39.6, z, 20, 0.06, 0.06, 0x2a2c2e, { y: 3.1, c: 0 }); bx(D, 48.6, z, 0.06, 1, 0.5, 0xc8c0a0, { y: 1, c: 0 }); bx(D, 48.6, z, 0.06, 0.06, 0.06, 0x2a2c2e, { y: 2, c: 0 }); }
  bx(D, 49.7, 54, 0.3, 3.2, 8, 0x3a3226); for (const x of [33, 37, 41, 45]) bx(D, x, 54, 0.8, 0.05, 8, 0x5a5d60, { y: 2.6, rz: 0.5, c: 0 });
  item(D, 'ammo9', 29.2, 52, 1.02);
  room(D, 'Duty office', 52, 49.25, 8, 8.75, { ...OFF, c: 'OPS', lc: [0.85, 0.78, 0.62] }); door(D, 53.4, 49, { sg: [['Duty office', 'n']] });
  for (const x of [57, 59]) door(D, x, 49, { span: 2, seal: true, glass: true }); room(D, 'Muster hall', 52, 48, 8, 0.75, { ...MH, part: 1 }); // its wall on the hall, the window in it
  desk(D, 57, 51.2, 1.8, 0.7, { c: 0x4a3a2c }); bx(D, 57, 52.6, 0.45, 0.45, 0.45, 0x2c2f33); shelf(D, 59.4, 55.2, 0.5, 1.8, { cols: [0x7a4a34, 0x4d5a66, 0x8a7a4a] });
  item(D, 'peaches', 56.2, 51.2, 0.78); item(D, 'bandage', 57.8, 51.1, 0.78); note(D, 'memo', 57, 51.36, 0.78);
  /* the desk's screen: the hall's cameras and the rooms off it, a sequencer stepping through them, on Ops' power
     (world.md §8, smaller screens first). A branch you have opened is black on it */
  monitors(D, 57, 52, 1.1, 'OPS', ['Muster court', 'East bays', 'Electrical room', 'Armory', 'Firing range', 'Operations stair'], { dwell: 5 });
  /* the deputy director, at the far end of the hall from Cargo's door, under the glass: she ran for the range */
  corpse(D, 23.6, 44.8, 0x4a4238, false, { label: 'Manager', say: 'DEPUTY DIRECTOR, OPERATIONS. She got as far as the range door. Her pass is still on its lanyard.', keys: ['o'] });
  /* the stair up to the operations room: a tall well off the east bays, and the landing at its head, where the door is
     grown shut. Armed, as the way to Operations. Eggs, and the floor dragged red, thicken toward it */
  room(D, 'Operations stair', 64, 50, 6, 12, { ...OPS, c: 'EAST', em: 1, ht: 9.5, armed: 1 }); door(D, 67.4, 49, { sg: [['Operations', 'n']] });
  stairs(D, T1, 66, 50, 2, 12, 's');
  room(T1, 'Operations stair', 64, 62, 6, 4, { ...OPS, c: 'EAST', em: 1, ht: 3.2, armed: 1 });
  camera(T1, 67, 65.2, 2.8, PI, 'EAST', 'ops', { name: 'Operations stair' }); // armed: from the landing, down the well to the door
  door(T1, 63, 63.4, { seal: true, msg: 'Bodies. Grown into the frame and into each other, floor to lintel, faces turned in. Something behind them is breathing.' });
  for (const z of [41.2, 43.6, 46]) blood(D, 66.8 + (z - 42) * 0.15, z, 1.1); eggs(D, 64.6, 46.6, 3); eggs(D, 69.2, 45.2, 2);
  for (const z of [52, 56, 59.2]) { eggs(D, 64.9, z, 2); eggs(D, 69.2, z + 1, 2); }
  eggs(T1, 64.8, 63, 4); eggs(T1, 69, 64.6, 3); gore(T1, 65.2, 64.4, 3); mut(T1, 'changed', 67.2, 63.2, { post: 1, yaw: PI / 2, walk: 0.4, steps: 66 });
  /* the operations room, over the hall's south side: a wall of glass on the court, and along the back wall its screens,
     what was left of its staff at each (below). Its door is grown shut, so it is no round's to walk to (the way toward it
     is up the armed stair, which the rounds keep out of) */
  room(T1, 'Operations room', 38, 46, 24, 18, { ...OFF, c: 'CRIT', ht: 4, em: 1, lc: [0.7, 0.74, 0.8], noroam: 1 });
  for (let x = 43; x <= 57; x += 2) door(T1, x, 45, { span: 2, seal: true, glass: true, c: 'CRIT' });
  tbl(T1, 48.6, 62.8, 20, 0.7, 0x3a3d40); // short of the east wall: the door comes in there
  for (let k = 0; k < 9; k++) { bx(T1, 39.4 + k * 2.3, 63.97, 2.1, 1.2, 0.06, 0x22262a, { y: 1.1, c: 0 }); bx(T1, 39.4 + k * 2.3, 63.93, 2, 1.1, 0.02, [0.05, 0.07, 0.08], { y: 1.15, c: 0, pw: [[0.04, 0.05, 0.05], [2.2, 2.5, 2.75]], pc: 'CRIT' }); }
  eggs(T1, 40, 47.2, 3); eggs(T1, 59.8, 48, 4); gore(T1, 43, 52, 3); gore(T1, 57.2, 55, 3); blood(T1, 50, 56, 2.4);
  mut(D, 'skitter', 45.2, 54); eggs(D, 42.8, 56.6, 2); // the range
  /* east of the atrium, behind Operations' card: the link to Cargo, and over it on the second floor, Cargo control */
  door(D, 89, -1, { card: 'o', c: 'OPS', sg: [['Cargo', 'w']] }); room(D, 'Cargo link', 90, -2, 18, 4, { ...UTIL, c: 'CARGO', em: 1 });
  /* the way into Cargo: slid open by hand onto its dark bay, it is heard the length of receiving, and what waits there comes */
  door(D, 109, -1, { sg: [['Cargo cavern', 'w']], loud: 60 });
  door(T1, 89, 3.4, { sg: [['Cargo control', 'w']] }); room(T1, 'Cargo control', 90, -6, 18, 14, { ...OFF, c: 'CARGO', ht: 4 });
  tbl(T1, 106.6, 0, 0.8, 4, 0x3a3d40); bx(T1, 104.8, 0, 0.45, 0.45, 0.45, 0x2c2f33); for (const z of [-1.6, 1.6]) bx(T1, 106.8, z, 0.5, 0.3, 0.06, 0x22262a, { y: 0.76, c: 0, pw: [[0.04, 0.05, 0.05], [2.2, 2.5, 2.75]], pc: 'CARGO' });
  /* the window onto the bay: three bays of glass in the east wall, high over the floor (world.md §8) */
  for (const z of [-3, 1, 5]) door(T1, 109, z, { span: 2, seal: true, glass: true, c: 'CARGO' });
  use(T1, 'look', 106.8, 0, 1.5, { label: 'Window', text: 'Thick glass, and the bay a long way down. Out on the rungs something glows, the colour of a healing burn.' });
  buildCargo(D, T1, T2, T3);
  /* at each screen, what is left of one of the operations staff, grown to it: a hunched trunk, a hand on the desk and
     one swollen eye at the glass of it, joined to its neighbours and by a cord of meat toward the middle of the room.
     Dressing for now: the room's new answer is open (world.md §8) */
  const MEAT = [0xa8705e, 0x9a6252, 0xb07a66, 0xa06854]; // their flesh
  for (let k = 0; k < 9; k++) {
    const x = 39.4 + k * 2.3, z = 61.5;
    bx(T1, x, z, 0.45, 0.35, 0.45, 0x2c2f33); // still in the chair
    bx(T1, x, z, 0.55, 0.85, 0.45, MEAT[k % 4], { y: 0.35, rz: ((k * 7) % 5 - 2) * 0.06 }); // the trunk, hunched to its screen
    P(T1, 'ico', x, z + 0.16, 0.42, 0.4, 0.42, MEAT[(k + 1) % 4], { y: 1.15, c: 0 });
    P(T1, 'ico', x + ((k % 3) - 1) * 0.08, z + 0.44, 0.36, 0.34, 0.24, 0xd8d0c0, { y: 1.22, c: 0 }); // its eye, swollen to the screen
    P(T1, 'ico', x + ((k % 3) - 1) * 0.08, z + 0.53, 0.14, 0.14, 0.06, 0x15100e, { y: 1.26, c: 0 });
    P(T1, 'ico', x + 0.36, 62.7, 0.26, 0.12, 0.2, MEAT[(k + 2) % 4], { y: 0.76, c: 0 }); // its hand on the desk
    if (k < 8) bx(T1, x + 1.15, z - 0.1, 1.95, 0.16, 0.14, MEAT[k % 4], { y: 0.75 + (k % 2) * 0.12, c: 0 }); // grown into the next
    const dx = 51.4 - x, dz = 50.2 - z, len = Math.hypot(dx, dz); // and into the back of the body
    bx(T1, (x + 51.4) / 2, (z + 50.2) / 2, len, 0.16, 0.18, MEAT[k % 4], { y: 0.5 + (k % 3) * 0.1, ry: -Math.atan2(dz, dx), c: 0 });
  }
  /* a light that needs no power: pustules come up through the floor in the middle of the room, the colour of a healing
     burn, so from the hall there is always something behind the glass, lit from below */
  for (const [x, z, n] of [[49.2, 48.2, 3], [54, 48.8, 3], [48.8, 52.2, 3], [53.6, 53.2, 2]] as const) {
    for (let k = 0; k < n; k++) { const sz = 0.14 + ((k * 7) % 5) * 0.03; P(T1, 'ico', x + Math.cos(k * 2.3) * 0.24, z + Math.sin(k * 2.3) * 0.2, sz, sz * 0.7, sz, [2.75, 2.36, 2.2], { y: -sz * 0.15, c: 0 }); }
    T1.lamps.push({ x, z, r: 4.5, c: [0.5, 0.17, 0.1], h: 0.4 });
  }
  /* and two of the staff on their rounds of the hall */
  mut(D, 'changed', 31, 28, { walk: 1, steps: 100 }); mut(D, 'changed', 67, 44, { walk: 0.9, steps: 98 });
  /* break-glass call points, one a zone, by its way out: the wing's by the checkpoint, the atrium's by the way south,
     the hall's at its west end by the electrical room and the range, Operations' in its corridor by the speaker */
  callPoint(D, 35, 2.75, 'n', 'wing'); callPoint(D, 71, 12, 'n', 'atrium'); callPoint(D, 22, 42, 'e', 'muster'); callPoint(D, 74, 21, 'e', 'ops');
  /* Security's alarm zones, room by room: an alarm locks down the doors of its zone (sim/eyes.ts). The hall's east bays
     are Operations', with their own breaker; the suite below, the shaft and Cargo are in none */
  const ZONES: Record<string, string> = {
    Checkpoint: 'wing', Lobby: 'wing', 'Lobby gallery': 'wing', 'Goods inward': 'wing', 'Surface landing': 'wing', 'Hazardous storage': 'wing', 'Security corridor': 'wing', "Nurses' station": 'wing', 'Briefing room': 'wing',
    'Locker room': 'wing', Showers: 'wing', Toilets: 'wing', Infirmary: 'wing',
    Atrium: 'atrium', 'Security elevator': 'atrium', Gallery: 'atrium',
    'Muster hall': 'muster', 'Muster court': 'muster', 'Training room': 'muster', 'Electrical room': 'muster', Armory: 'muster', 'Firing range': 'muster', 'Duty office': 'muster',
    'Operations corridor': 'ops', 'Office: operations': 'ops', 'Outer office': 'ops', 'Office: chief of security': 'ops', Records: 'ops', 'Conference room': 'ops',
    Maintenance: 'ops', 'Generator room': 'ops', 'Fuel store': 'ops', 'Operations stair': 'ops',
  };
  for (const R of [...D.rooms, ...T1.rooms]) if (ZONES[R.name]) R.zone = R.name === 'Muster hall' && R.c === 'EAST' ? 'ops' : ZONES[R.name];
  /* the night round (world.md §8): one of the changed still walking the night shift's round, flashlight on. It begins on
     the nurses' station's balcony, looking down into the suite, and stays until something draws it (the opening: the
     other patient at the glass). Then, the one night it does so, down into the suite, at a purposeful walk: the other
     patient's door at the stair's foot, which its card opens, and the other patient, struck down where they hide and
     dragged out by an ankle into the hall, in sight of your window, and grafted there, and left; rooms 4 and 3 opened
     and searched, walked into and looked right round (not the washrooms); a while at your door before it opens it, and
     yours searched; and back up and out. After that its round is the wing, which is dark, and it walks it anyway, by its beam: along
     the corridor to the briefing room's reader and the cut, back past the nurses' station, and out round the lobby. Last
     of the cast but one, so the rest keep their places in it */
  const once = { need: 'ISO', once: true }, quick = { ...once, pace: 1.4 };
  mut(D, 'nightround', 51, -9.4, { yaw: PI, round: [
    { F: D, x: 51, z: -9.4, wait: 600, ...once }, { F: B, x: 54, z: -24, wait: 0.3, ...quick }, { F: B, x: 54.8, z: -23, tries: 1, ...quick },
    { F: B, x: 59.4, z: -22, wait: 1.2, take: true, ...quick }, { F: B, x: 54.6, z: -24, wait: 0.2, ...quick }, { F: B, x: 48.8, z: -19.2, graft: true, ...quick },
    { F: B, x: 49, z: -21.2, tries: 1, look: 0.5, ...quick }, { F: B, x: 50, z: -26, wait: 2.2, about: true, ...quick },
    { F: B, x: 43, z: -21.2, tries: 1, look: 0.5, ...quick }, { F: B, x: 44, z: -26, wait: 2.2, about: true, ...quick },
    { F: B, x: 42, z: -19, wait: 3, tries: 1, look: 0.5, ...quick }, { F: B, x: 37.2, z: -21.2, wait: 3, about: true, ...quick },
    { F: D, x: 53, z: -9.6, wait: 0.2, ...quick }, { F: D, x: 47, z: -2.8, wait: 0.5, ...quick },
    { F: D, x: 63, z: -2.8, tries: 1 }, { F: D, x: 64.4, z: -1.2, wait: 4 }, { F: D, x: 47, z: -3.2, wait: 3 },
    { F: D, x: 27, z: -7, wait: 2 }, { F: D, x: 16, z: -17, wait: 4 }, { F: D, x: 23, z: -24, wait: 3 }, { F: D, x: 34, z: -1, wait: 2 },
  ] });
  /* the other patient, at their window in room 2, and where they crouch to hide (under the sill). Listed after the night
     round, last of all */
  mut(D, 'patient', -10, -30, { at: { F: B, x: 58.8, z: -21}, yaw: -PI / 2, state: 'wait', hide: { F: B, x: 58.6, z: -21.1} });
  buildHub(B, D, T1, T2); // last: everything built before it keeps its place in the level's lists
  return finishLevel([37.2, -21, PI / 2], B); // in isolation room 1, by the bed, turned to the pump; the window behind you (arrivals and the plant stair are over it)
}

/* The lobby as the upper station's hub (world.md §8, *The lobby as a hub*): every way off it but the corridor's door
   and the grand stair is here. East, arrivals: the desk the lobby opens onto, and screening behind it, which opens onto
   the nurses' station. Below, the family's retreat: a stair down from the lobby's north-west corner to a lounge, its
   humidor and a pool, and a passage on to the isolation suite, the retreat's second way out. Over the wing at +5, a
   corridor from the lobby's gallery to the atrium's, the mess and administration off it, and the stair to the air
   plant, which climbs on into the space over the false sky. Behind the bar, the kitchen, and a passage round the back
   of the shaft to goods inward. All of it on the wing's feed, dark until the cut is mended, and in the wing's zone. */
function buildHub(B: Floor, D: Floor, T1: Floor, T2: Floor): void {
  const wing = { c: 'SEC', em: 1, zone: 'wing' };
  /* shelving with its goods in fixed places (shelf() draws them at random, and would move everything drawn after) */
  const rack = (Dk: Floor, x: number, z: number, w: number, d: number, cols: number[]) => {
    const ns = d > w, L = ns ? d : w;
    for (const y of [0.1, 0.55, 1, 1.45, 1.86]) bx(Dk, x, z, w, 0.04, d, 0x4a4d50, { y, c: 0 });
    for (const s of [-1, 1]) bx(Dk, x + (ns ? 0 : s * (L / 2 - 0.02)), z + (ns ? s * (L / 2 - 0.02) : 0), ns ? w : 0.04, 1.9, ns ? 0.04 : d, 0x3a3d40, { c: 0 });
    [0.14, 0.59, 1.04, 1.49].forEach((y, b) => {
      for (let k = 0; k < 4; k++) {
        if ((k + b) % 3 === 0) continue;
        const t = -L / 2 + 0.1 + ((L - 0.2) / 4) * (k + 0.5), s = 0.22, deep = Math.min(0.24, (ns ? w : d) - 0.08);
        bx(Dk, x + (ns ? 0 : t), z + (ns ? t : 0), ns ? deep : s, 0.16 + ((k * 3 + b) % 4) * 0.04, ns ? s : deep, cols[(k + b) % cols.length], { y, c: 0, goods: true });
      }
    });
    colT(Dk, x, z, w, d, 1.9);
  };
  const seat = (Dk: Floor, x: number, z: number, c: number) => { bx(Dk, x, z, 0.45, 0.45, 0.45, c); };
  /* a screen on a desk, facing west or north (s -1) or east or south (s 1), lit with the wing */
  const screen = (Dk: Floor, x: number, z: number, y: number, ew: boolean, s = -1) => {
    bx(Dk, x, z, ew ? 0.06 : 0.5, 0.34, ew ? 0.5 : 0.06, 0x22262a, { y, c: 0 });
    bx(Dk, x + (ew ? s * 0.04 : 0), z + (ew ? 0 : s * 0.04), ew ? 0.02 : 0.44, 0.28, ew ? 0.44 : 0.02, [0.04, 0.05, 0.05], { y: y + 0.03, c: 0, pw: [[0.04, 0.05, 0.05], [2.2, 2.75, 2.5]], pc: 'SEC' });
  };
  const planter = (Dk: Floor, x: number, z: number) => {
    bx(Dk, x, z, 1.2, 0.8, 1.2, 0x6e6a62);
    for (let k = 0; k < 4; k++) P(Dk, 'ico', x + Math.cos(k * 1.7) * 0.3, z + Math.sin(k * 1.7) * 0.3, 0.2, 0.9 + k * 0.2, 0.2, 0x5a4a2e, { y: 0.8, c: 0 });
  };

  /* Arrivals. The lobby's east wall opens on the desk where crews on rotation and visitors checked in: the customer's
     side of the station, its finish already less than the lobby's (carpet and paint, not stone). Behind the desk, the
     door to screening, where everyone arriving or leaving was looked over for exposure; it opens onto the nurses'
     station, which is why the isolation suite is a stair from the front door */
  const CK: RoomOpts = { ...OFF, ...wing, ht: 4, fl: 0x6a6258, wl: 0xa39a8a, st: 0x7a5a30, lc: [0.92, 0.86, 0.74], mat: { floor: 'carpet', wall: 'plaster', ceiling: 'tiles' } };
  room(D, 'Check-in hall', 32, -28, 9.5, 8.75, CK); room(D, 'Check-in hall', 30, -26, 2, 4, { ...CK, mat: FAM.mat }); // the opening, in the lobby's stone
  bx(D, 35.2, -24.2, 0.7, 1.05, 5.6, 0x8a8070, { mat: 'stone' }); bx(D, 35.2, -24.2, 0.8, 0.05, 5.7, 0x3a3026, { y: 1.05, c: 0 }); // the desk, facing the lobby
  for (const z of [-25.6, -22.8]) { screen(D, 35.44, z, 1.1, true, 1); seat(D, 36.6, z, 0x2c2f33); } // the staff's side, east
  bx(D, 35.24, -24.2, 0.3, 0.18, 0.26, 0xb8bcc0, { y: 1.1, c: 0 }); // the badge printer
  for (const z of [-26.4, -24.8, -23.2, -21.6]) P(D, 'cyl', 33.1, z, 0.06, 0.95, 0.06, 0x8a7a4a); // the queue's posts, their tape gone
  bx(D, 41.1, -24.2, 0.5, 0.9, 5.6, 0x5a5048); bx(D, 41.49, -24.2, 0.02, 0.9, 2.4, 0xd8d4c4, { y: 1.3, c: 0 }); // cabinets, and the rotation board over them
  item(D, 'batt', 41.1, -25.8, 0.9);
  door(D, 37, -19, { sg: [['Screening', 'n']] });
  /* screening (world.md §8, Security at the station's size): where a cage-load was looked over for exposure. In from
     check-in; the changing cubicles in the wing south of it, a curtain to each; the decontamination shower in the
     corner; the chair where blood was drawn, its arm out; the clerk's desk; the lab bench, where the samples were spun;
     a bench to wait on; and out to the nurses' station and the suite below. It and the hall stop short of the isolation
     hall's top, a wall between */
  const SCR: RoomOpts = { ...MED, ...wing };
  room(D, 'Screening', 32, -18.75, 9.5, 4.75, SCR); room(D, 'Screening', 32, -14, 3.5, 3.5, SCR);
  door(D, 39, -13, { sg: [['Isolation', 'n'], ['Screening', 's']] });
  desk(D, 36.2, -14.9, 1.2, 0.6, { bare: 1 }); screen(D, 36.2, -15.14, 0.76, false, 1); seat(D, 36.2, -14.25, 0x2c2f33); // the clerk faces the room
  item(D, 'bandage', 35.76, -14.9, 0.76);
  const TILE = 0xd8dcd8, GOWN = 0x9ab4c4, BR = 0x5e4424;
  /* the decontamination shower, open to the room but for its curtain: a wall of tile on its east side, the head over it */
  bx(D, 33.7, -17.875, 0.06, 2.2, 1.75, TILE);
  bx(D, 32.85, -18.6, 0.3, 0.06, 0.3, 0x8a8e8c, { y: 2.3, c: 0 }); bx(D, 32.85, -18.72, 0.06, 0.06, 0.06, 0x8a8e8c, { y: 2.3, c: 0 }); // the head, off the wall
  P(D, 'cyl', 32.85, -17.9, 0.3, 0.01, 0.3, 0x3a3d40, { c: 0 }); // the drain
  bx(D, 32.85, -17.02, 1.66, 0.04, 0.04, 0x8a8e8c, { y: 2.2, c: 0 }); bx(D, 32.35, -17.03, 0.6, 2.05, 0.02, 0x8fb0a4, { y: 0.15, c: 0 }); // its rail, the curtain half across
  bx(D, 33.64, -17.4, 0.06, 0.04, 0.04, 0xc9a227, { y: 1.6, c: 0 }); // the pull handle, yellow
  use(D, 'look', 32.85, -17.6, 1.4, { label: 'Decontamination shower', text: 'Pull the handle and stand under it a full minute. Hung beside it, stencilled: EVERYONE. EVERY TIME.' });
  /* where blood was drawn: the chair, its arm out for the needle, and the trolley beside it, tubes in their rack */
  bx(D, 34.9, -18, 0.6, 0.45, 0.6, 0x5a7a8a); bx(D, 34.9, -18.33, 0.6, 0.8, 0.06, 0x5a7a8a, { y: 0.45, c: 0 }); bx(D, 35.3, -17.94, 0.22, 0.08, 0.72, 0x5a7a8a, { y: 0.62, c: 0 });
  bx(D, 35.75, -17.4, 0.4, 0.85, 0.5, 0xb8bcc0);
  for (let k = 0; k < 5; k++) P(D, 'cyl', 35.62 + k * 0.065, -17.48, 0.03, 0.1, 0.03, [0x8c2f24, 0x6a8aaa, 0xc9a227, 0x8a8e8c, 0x3a6a3a][k], { y: 0.85, c: 0 });
  bx(D, 35.8, -17.25, 0.14, 0.18, 0.12, 0xc9a227, { y: 0.85, c: 0 }); // the sharps bin
  /* the lab bench on the east wall, and its fridge: a centrifuge, a microscope, a rack of samples nobody read */
  bx(D, 41.15, -17.7, 0.7, 0.9, 1.9, 0xb9c4bd); bx(D, 41.15, -17.7, 0.72, 0.04, 1.92, 0x8a8e8c, { y: 0.9, c: 0 });
  P(D, 'cyl', 41.15, -18.25, 0.36, 0.24, 0.36, 0xd8dcd8, { y: 0.94, c: 0 });
  bx(D, 41.2, -17.55, 0.2, 0.04, 0.2, 0x2a2c2e, { y: 0.94, c: 0 }); bx(D, 41.28, -17.55, 0.05, 0.36, 0.05, 0x2a2c2e, { y: 0.98, c: 0 }); bx(D, 41.22, -17.55, 0.14, 0.1, 0.08, 0x2a2c2e, { y: 1.3, c: 0 }); // the microscope
  bx(D, 41.1, -17.05, 0.18, 0.06, 0.4, 0xb8bcc0, { y: 0.94, c: 0 }); for (let k = 0; k < 6; k++) P(D, 'cyl', 41.1, -17.2 + k * 0.06, 0.025, 0.1, 0.025, 0x8c2f24, { y: 1, c: 0 });
  bx(D, 41.1, -14.35, 0.6, 0.85, 0.6, 0xd8dcd8); // the fridge
  bx(D, 39.3, -18.45, 2, 0.45, 0.4, 0xb8c4bd); // a bench to wait on
  /* the cubicles, three down the wing's south wall: a curtain across each, a bench, a gown on its hook; in two, the
     clothes someone took off and never came back for */
  bx(D, 33.75, -11.8, 3.5, 0.04, 0.04, 0x8a8e8c, { y: 2.05, c: 0 });
  for (const x of [33.15, 34.3]) bx(D, x, -11.15, 0.04, 1.9, 1.3, TILE, { y: 0.1 });
  for (const [k, x0, x1] of [[0, 32, 33.15], [1, 33.15, 34.3], [2, 34.3, 35.5]] as const) {
    const mx = (x0 + x1) / 2;
    bx(D, mx, -10.7, x1 - x0 - 0.2, 0.42, 0.4, 0x8a7a6a); // the bench
    bx(D, mx + 0.3, -10.54, 0.08, 0.04, 0.08, BR, { y: 1.7, c: 0 }); bx(D, mx + 0.3, -10.6, 0.3, 0.9, 0.06, GOWN, { y: 0.82, c: 0 }); // the hook, the gown
    if (k < 2) bx(D, mx - 0.15, -10.7, 0.4, 0.1, 0.32, [0x2c3440, 0x5a4a3a][k], { y: 0.42, c: 0 }); // folded clothes
    bx(D, x0 + 0.2 + k * 0.1, -11.8, 0.3 + (k % 2) * 0.3, 1.95, 0.02, 0x8fb0a4, { y: 0.1, c: 0 }); // the curtain, drawn back
  }

  /* the lobby's washrooms, off its east wall where a hotel puts them: stone and bronze like the lobby, a walnut pair to
     each. A vanity of basins under a mirror; the stalls at the far end, their doors open; urinals in the gentlemen's */
  const WCR: RoomOpts = { ...FAM, ...wing, ht: 3.2, lc: [0.92, 0.86, 0.74] }, WHITE = 0xe8e8e2, PANEL = 0x5a4030;
  room(D, 'Ladies', 30.5, -10, 5, 2.5, WCR); door(D, 30.25, -8.75, { sg: [['Ladies', 'w']] });
  room(D, 'Gentlemen', 30.5, -7, 5, 2.5, WCR); door(D, 30.25, -5.75, { sg: [['Gentlemen', 'w']] });
  for (const [z0, s] of [[-10, 1], [-7, 1]] as const) {
    bx(D, 32.05, z0 + s * 0.275, 1.7, 0.85, 0.55, 0x9a9384, { mat: 'stone' }); // the vanity
    for (const x of [31.6, 32.5]) { P(D, 'cyl', x, z0 + 0.3, 0.38, 0.03, 0.3, WHITE, { y: 0.85, c: 0 }); P(D, 'cyl', x, z0 + 0.08, 0.03, 0.15, 0.03, BR, { y: 0.85, c: 0 }); }
    bx(D, 32.05, z0 + 0.015, 1.6, 0.9, 0.03, 0xaab4b8, { y: 1.15, c: 0, mat: 'steel' }); bx(D, 32.05, z0 + 0.015, 1.7, 0.04, 0.03, BR, { y: 2.05, c: 0 }); // the mirror
  }
  /* the stalls: a partition between the ladies' two, one in the gentlemen's; a rail over the fronts; each door swung
     back against a wall; the pan and its cistern */
  bx(D, 34.7, -8.75, 1.6, 1.8, 0.04, PANEL, { y: 0.12 }); bx(D, 34.7, -5.6, 1.6, 1.8, 0.04, PANEL, { y: 0.12 });
  bx(D, 33.9, -8.75, 0.04, 0.04, 2.5, BR, { y: 1.95, c: 0 }); bx(D, 33.9, -6.3, 0.04, 0.04, 1.4, BR, { y: 1.95, c: 0 });
  for (const z of [-9.98, -8.71, -6.98]) bx(D, 34.3, z, 0.75, 1.75, 0.04, PANEL, { y: 0.12, c: 0 });
  for (const z of [-9.4, -8.1, -6.35]) { bx(D, 35.15, z, 0.65, 0.4, 0.4, WHITE); bx(D, 35.42, z, 0.16, 0.8, 0.45, WHITE); }
  for (const x of [32.2, 33]) bx(D, x, -4.675, 0.4, 0.6, 0.35, WHITE, { y: 0.45 }); bx(D, 32.6, -4.75, 0.04, 0.9, 0.5, PANEL, { y: 0.5, c: 0 }); // the urinals, a screen between

  /* The retreat, a storey under the lobby: the family's, and their buyers'. A stair down from the lobby's north-west
     corner, behind glass and planting, to a lounge panelled in wood (the family's indulgence: nothing else down here
     burns), with a window that is a lit panel; off it the humidor, glazed, where the product line was sampled; through
     the passage, a pool cut into the limestone; and the plant room that serves them. The passage goes on to the
     isolation suite: the retreat's second way out, as fire code wants of a room below ground, and the family's private
     door to their clinic. A plain door for now, on the wing's dead feed, slid by hand from either side */
  /* one flight 4 m wide, stone like the grand stair, its lounge side a balustrade that rises with it to the lobby's
     floor, where the glass takes over */
  for (const x of [-8, -6]) stairs(B, D, x, -24, 2, 10, 's', true);
  for (let q = 0, N = 20; q < N; q++) {
    const sh = ((q + 1) / N) * 4.5, z = -24 + ((q + 0.5) / N) * 10, d = 10 / N; // 10 m of stair, 4.5 m of rise
    bx(B, -6.16, z, 3.68, sh, d, q % 2 ? 0xb3ab9c : 0xa9a192, { c: 0, flush: true });
    bx(B, -4.16, z, 0.32, Math.min(sh + 1.05, 4.5), d, 0x8f877a, { flush: true });
  }
  const GL: Colour = [0.55, 0.66, 0.7];
  for (const [x, z, sx, sz] of [[-3.94, -19, 0.06, 10], [-6, -24.06, 4, 0.06]] as const) {
    bx(D, x, z, sx, 1, sz, GL, { mat: 'glass' }); bx(D, x, z, sx > 1 ? sx : 0.07, 0.07, sz > 1 ? sz : 0.07, 0x5e4424, { y: 1, c: 0, mat: 'steel' });
  }
  planter(D, -2.6, -21.6); planter(D, -2.6, -17.6);
  const RL: RoomOpts = { ...wing, ht: 3.8, fl: 0x3e342a, wl: 0x5a4030, st: 0x7a5a30, lc: [0.95, 0.78, 0.55], mat: { floor: 'stone', wall: 'wood', ceiling: 'plaster' } };
  room(B, 'Retreat lounge', -4, -28, 14, 16, RL); room(B, 'Retreat lounge', -8, -28, 4, 2, RL);
  room(B, 'Retreat lounge', -8, -26, 4, 12, { ...RL, ht: 4.5, nolamp: 1 }); // the stairwell, open to the lobby over it
  for (const z of [-23.6, -17.2]) {
    bx(B, 2.4, z, 1.6, 0.4, 0.9, 0x2a2420);
    for (const s of [-1, 1]) { bx(B, 2.4, z + s * 1.8, 2.6, 0.45, 0.85, 0x6a3a2a); bx(B, 2.4, z + s * 2.32, 2.6, 0.9, 0.22, 0x5a3024, { c: 0 }); }
    bx(B, 5.2, z, 0.85, 0.45, 0.85, 0x6a3a2a); bx(B, 5.72, z, 0.22, 0.9, 0.85, 0x5a3024, { c: 0 });
  }
  bx(B, 2.4, -27.7, 3, 0.85, 0.5, 0x4a3226); for (const x of [1.8, 2.2, 3.2]) P(B, 'cyl', x, -27.7, 0.1, 0.28, 0.1, 0x6a4a2a, { y: 0.85, c: 0 }); // the sideboard, its decanters
  item(B, 'peaches', 1, -27.7, 0.85);
  bx(B, 2, -12.03, 6, 1.6, 0.03, [0.06, 0.06, 0.07], { y: 0.8, c: 0, pw: [[0.06, 0.06, 0.07], [2.75, 2.82, 2.92]], pc: 'SEC' }); // the window: a lit panel of sky
  for (const x of [-0.97, 1, 3, 4.97]) bx(B, x, -12.07, 0.06, 1.6, 0.02, 0x3a2c22, { y: 0.8, c: 0 }); // its frame and mullions
  for (const y of [0.8, 2.34]) bx(B, 2, -12.07, 6, 0.06, 0.02, 0x3a2c22, { y, c: 0 });
  room(B, 'Retreat lounge', 10, -28, 0.75, 8, { ...RL, part: 1 });
  room(B, 'Humidor', 11.25, -28, 4.75, 8, { ...wing, ht: 3, fl: 0x4a3426, wl: 0x8a5a3a, st: 0x5a3a24, lc: [0.95, 0.8, 0.6], mat: { floor: 'wood', wall: 'wood', ceiling: 'wood' } });
  door(B, 11, -24.6, { sg: [['Humidor', 'w']] }); for (const z of [-27, -23, -21]) door(B, 11, z, { span: 2, glass: true, glaze: 'full' });
  for (const z of [-26, -22]) rack(B, 15.5, z, 0.5, 2.6, [0x7a4a2a, 0x8a6a3a, 0x6a3a24, 0xa08a4a]);
  /* the trial lots have taken: leaf out of the cedar, in shelves, as it comes out of the changed */
  for (const [z, y] of [[-26.6, 1.04], [-25.4, 0.59], [-22.4, 1.49], [-21.2, 0.14]]) P(B, 'ico', 15.4, z, 0.36, 0.22, 0.3, 0x8a8a3a, { y, c: 0 });
  tbl(B, 13.2, -24, 0.9, 1.6, 0x5a3e2a); bx(B, 13.2, -24.4, 0.25, 0.06, 0.18, 0x7a4a2a, { y: 0.76, c: 0 }); bx(B, 13.1, -23.6, 0.22, 0.05, 0.16, 0x8a6a3a, { y: 0.76, c: 0 });
  const PH: RoomOpts = { ...wing, ht: 4, fl: 0x9a968a, wl: 0x6a8a88, st: 0x3f6a6a, lc: [0.8, 0.9, 0.95], mat: { floor: 'stone', wall: 'glazed', ceiling: 'plaster' } };
  room(B, 'Pool hall', 18, -28, 14, 16, PH);
  room(B, 'Pool', 20, -26, 10, 10, { ...PH, dy: -1.5, ht: 5.5, fl: 0x4a8a9a, wl: 0x3a7a8a, mat: { floor: 'glazed', wall: 'glazed', ceiling: 'plaster' }, nolamp: 1 });
  flight(B, 20, -20, 4, 4, -1.5, 0, 's', 6, 0x9a968a); // steps down into it at the shallow end
  B.water.push([20, -26, 30, -16, -0.25]); // chest deep: you wade it
  for (const z of [-24, -21]) for (const x of [20.015, 29.985]) bx(B, x, z, 0.03, 0.18, 0.3, [0.1, 0.12, 0.12], { y: 0.5, c: 0, pw: [[0.1, 0.12, 0.12], [2.1, 2.6, 2.9]], pc: 'SEC' }); // its lights, under the water
  for (const z of [-25, -21.6, -18.2]) bx(B, 30.9, z, 0.7, 0.35, 1.9, 0xd8d4c4); // loungers
  planter(B, 19, -26.6); planter(B, 19, -15.2);
  room(B, 'Retreat plant', -8, -10, 14, 4, { ...UTIL, ...wing, noroam: 1 }); door(B, 7, -9, { sg: [['Plant room', 'e']] });
  bx(B, -6.9, -8, 2, 1.8, 2.6, 0x6b6e70, { mat: 'steel' }); // the air handler against the wall, and the smoke extract's fan
  for (const x of [-1.2, 1.2]) P(B, 'cyl', x, -9.2, 1, 1.8, 1, 0x8a8a84, { mat: 'steel' }); // the pool's filters
  for (const x of [-1.6, 0.4]) P(B, 'cyl', x, -7.2, 0.7, 0.7, 0.7, 0x3d5a44, { mat: 'steel' }); // its pumps
  bx(B, 4, -6.9, 1.6, 0.9, 0.7, 0x5a5048); item(B, 'adjwrench', 4, -6.9, 0.9);
  const PS: RoomOpts = { ...wing, ht: 3, fl: 0x5a5d5a, wl: 0x8a8e88, st: 0x3f7f6b, mat: { floor: 'vinyl', wall: 'plaster' } };
  room(B, 'Retreat passage', 8, -10, 32, 4, PS);
  door(B, 9.4, -11, { sg: [['Pool', 'n'], ['Lounge', 's']] }); door(B, 25, -11, { sg: [['Pool', 's']] });
  door(B, 41, -8.6, { c: 'SEC', sg: [['Isolation', 'w'], ['Private', 'e']] }); exitSign(B, 39.975, -9, 2.5, 'w'); // the fire exit, lit on its own battery

  /* Over the wing, at +5: the floor world.md has long asked for. A corridor from the lobby's gallery to the atrium's,
     so the wing can be gone round upstairs; off it the mess and the station's administration, and the stair up to the
     plant that keeps the lobby's air. The family's corridor, not Security's: the gallery's terrazzo runs on into it,
     its limestone comes down to a dado, plaster over it, and the services are behind a plastered ceiling */
  const UC: RoomOpts = { ...FAM, ...wing, ht: 3.5, lc: [0.92, 0.86, 0.74], mat: { ...FAM.mat, datum: 1.2 } };
  /* a wall between it and the lobby's air, but where it meets the gallery */
  room(T1, 'Upper corridor', 30.5, -12, 3.5, 10, UC); room(T1, 'Upper corridor', 30, -6, 0.5, 4, { ...UC, part: 1 }); room(T1, 'Upper corridor', 34, -12, 34, 4, UC);
  /* the family's exhibit (world.md §8, The exhibit; content/exhibit.ts): the house's board facing you as you come in off
     the gallery, and the company's story along the south wall, which has no doors, from the lobby end: walking on is
     walking forward in time. On the wing's feed with the rest, so read by your beam until the mend */
  exhibit(T1, WELCOME.key, 34, -4.6, 1.75, 'w', 2.8, 2.2);
  HISTORY.forEach((b, k) => exhibit(T1, b.key, 37.5 + k * 4.5, -8, 1.75, 'n', 1.4, 2));
  const PL: RoomOpts = { ...UTIL, ...wing, ht: 3.5, noroam: 1 };
  room(T1, 'Plant stair', 32, -26, 8, 12, PL); room(T1, 'Plant stair', 40, -26, 2, 12, { ...PL, ht: 7.5 }); // the stairwell, up to the plant
  door(T1, 35.5, -13, { plain: true, sg: [['Plant room', 's']] }); stairs(T1, T2, 40, -26, 2, 10, 'n');
  bx(T1, 33.2, -24.8, 1, 3.4, 1, 0x6b6e70, { mat: 'steel' }); // the lobby's air, in its riser
  room(T1, 'Staff mess', 44, -26, 10, 12, { ...OFF, ...wing, mat: { floor: 'vinyl', wall: 'plaster', ceiling: 'tiles' } }); door(T1, 47.4, -13, { sg: [['Mess', 's']] });
  for (const x of [46.4, 50.8]) for (const z of [-21.6, -17.6]) { tbl(T1, x, z, 1.6, 0.8, 0x8a8e8c); for (const s of [-1, 1]) seat(T1, x, z + s * 0.9, 0x3a3d40); }
  bx(T1, 47, -25.6, 4, 0.9, 0.6, 0x8a8e8c); bx(T1, 53, -25.5, 0.8, 1.9, 0.7, 0xb8bcc0); P(T1, 'cyl', 45.4, -25.6, 0.16, 0.24, 0.16, 0x2a2c2e, { y: 0.9, c: 0 }); // the counter, the fridge, a kettle
  item(T1, 'ration', 46.4, -25.6, 0.9);
  /* the station's administration (world.md §8, Security at the station's size): the office where its crews were
     planned, paid and kept on file, under the board of who was down and who was up; through its east wall, over the
     briefing room, the ID office, where passes were made, and the administrator's own */
  room(T1, 'Administration', 56, -26, 10, 12, { ...OFF, ...wing }); door(T1, 61.4, -13, { sg: [['Administration', 's']] });
  for (const x of [58.5, 62.5]) for (const z of [-22.6, -19.4, -16.2]) { desk(T1, x, z, 1.4, 0.7, { bare: 1 }); screen(T1, x, z + 0.2, 0.76, false); seat(T1, x, z - 0.9, 0x2c2f33); }
  for (const z of [-25.4, -24.8, -24.2]) bx(T1, 56.3, z, 0.6, 1.3, 0.5, 0x5f6266); // filing
  bx(T1, 65.2, -25.2, 1, 1, 0.7, 0xb8bcc0); // the copier
  bx(T1, 56.4, -14.6, 0.35, 1, 0.35, 0xd8dcd8); P(T1, 'cyl', 56.4, -14.6, 0.26, 0.4, 0.26, 0x6a8aaa, { y: 1, c: 0 }); // the water cooler
  /* the rotation board: two crews, three weeks on and three off, a magnet a name; crew B's in November, never moved back */
  bx(T1, 61, -25.985, 6, 1.3, 0.03, 0xe2e2da, { y: 1.2, c: 0 });
  for (let k = 0; k < 8; k++) for (let r = 0; r < 5; r++) if ((k * 3 + r * 5) % 7 !== 3)
    bx(T1, 58.4 + k * 0.72, -25.965, 0.36, 0.1, 0.01, k >= 6 || Math.floor(k / 3) % 2 ? 0xc8641e : 0x2a4a7a, { y: 1.35 + r * 0.22, c: 0 });
  use(T1, 'look', 61, -25.9, 1.85, { label: 'Rotation board', text: 'Two crews, three weeks on and three off, a magnet for every name. Crew B came down at the end of October. Their magnets were never moved back.' });
  /* the ID office: the desk with the card printer on it, a box of blanks; the backdrop and the stool, the camera on its
     stand; the lanyards by access, a colour each, and the chart of what each colour opens; the safe for the stock */
  room(T1, 'ID office', 66.5, -26, 7.5, 6, { ...OFF, ...wing }); door(T1, 66.25, -21.6, { sg: [['ID office', 'w']] });
  desk(T1, 70.5, -23.5, 1.8, 0.8, { bare: 1 }); screen(T1, 70.1, -23.3, 0.76, false); seat(T1, 70.5, -24.4, 0x2c2f33);
  bx(T1, 71, -23.5, 0.45, 0.3, 0.4, 0xb8bcc0, { y: 0.76, c: 0 }); bx(T1, 71, -23.5, 0.2, 0.08, 0.14, 0x6a6e70, { y: 1.06, c: 0 }); // the printer, its hopper of blanks
  bx(T1, 71, -23.28, 0.09, 0.01, 0.06, 0xe2ddd0, { y: 0.84, c: 0 }); // a card half out of it
  bx(T1, 70.6, -23.75, 0.12, 0.06, 0.09, 0xe2ddd0, { y: 0.76, c: 0 }); // a box of blanks
  use(T1, 'look', 71, -23.5, 1, { label: 'Card printer', text: 'It prints a face and a name on a blank, and writes into its strip the doors it opens. The screen beside it wants a login.' });
  bx(T1, 72.5, -25.985, 1.4, 1.8, 0.03, 0x8aa0b0, { y: 0.6, c: 0 }); P(T1, 'cyl', 72.5, -25.2, 0.4, 0.6, 0.4, 0x2c2f33); // the backdrop, the stool
  bx(T1, 72.5, -22.6, 0.3, 0.04, 0.3, 0x2a2c2e, { c: 0 }); P(T1, 'cyl', 72.5, -22.6, 0.04, 1.4, 0.04, 0x2a2c2e, { y: 0.04, c: 0 }); bx(T1, 72.5, -22.62, 0.22, 0.16, 0.14, 0x22262a, { y: 1.44, c: 0 }); // the camera on its stand
  bx(T1, 73.98, -21, 0.04, 0.04, 1.2, 0x8a8e8c, { y: 1.6, c: 0 });
  for (let k = 0; k < 6; k++) bx(T1, 73.95, -21.5 + k * 0.2, 0.02, 0.5, 0.02, [0x8c2f24, 0x2a4a7a, 0x3a6a3a, 0xc9a227][k % 4], { y: 1.1, c: 0 }); // the lanyards
  bx(T1, 69, -20.015, 1.6, 1, 0.03, 0xe2e2da, { y: 1.3, c: 0 });
  for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) if ((k + r) % 3 !== 1) bx(T1, 68.45 + k * 0.22, -20.035, 0.16, 0.14, 0.01, [0x8c2f24, 0x2a4a7a, 0x3a6a3a, 0xc9a227][r], { y: 1.45 + r * 0.2, c: 0 });
  bx(T1, 67, -25.6, 0.6, 0.7, 0.6, 0x3a4038); // the safe for the card stock
  /* the administrator's: the desk facing the door, chairs across it, binders on the shelf */
  room(T1, 'Office: administration', 66.5, -19.5, 7.5, 5.5, { ...OFF, ...wing, lc: [0.88, 0.82, 0.7] }); door(T1, 66.25, -16.6, { sg: [['Administrator', 'w']] });
  desk(T1, 72, -16.75, 0.8, 1.9, { bare: 1, c: 0x4a3226 }); seat(T1, 72.9, -16.75, 0x2c2f33); bx(T1, 73.1, -16.75, 0.05, 0.5, 0.45, 0x2c2f33, { y: 0.45, c: 0 });
  bx(T1, 71.75, -16.4, 0.06, 0.34, 0.5, 0x22262a, { y: 0.76, c: 0 }); bx(T1, 71.79, -16.4, 0.02, 0.28, 0.44, [0.04, 0.05, 0.05], { y: 0.79, c: 0, pw: [[0.04, 0.05, 0.05], [2.2, 2.75, 2.5]], pc: 'SEC' });
  for (const z of [-17.3, -16.2]) { seat(T1, 70.9, z, 0x2c2f33); bx(T1, 70.7, z, 0.05, 0.5, 0.45, 0x2c2f33, { y: 0.45, c: 0 }); }
  bx(T1, 70, -19.3, 2.4, 1.9, 0.4, 0x4a3226);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 9; k++) bx(T1, 69 + k * 0.24, -19.09, 0.08, 0.38, 0.02, [0x2a4a7a, 0x8c2f24, 0x3a3d40][(k + r) % 3], { y: 0.3 + r * 0.55, c: 0 });
  bx(T1, 73.6, -19.1, 0.5, 1.3, 0.6, 0x5f6266); bx(T1, 67, -14.5, 0.5, 0.5, 0.5, 0x6e6a62); // a cabinet; a pot, its plant long gone
  /* the air plant, at +10 (world.md §8, Security at the station's size): what airs the lobby, 12,400 m³ under a sky of
     its own, and, the job that matters underground, dries it: the walnut and the sofas last only while the
     dehumidifiers run. East of the steps, its hall: the air handler along the north wall, the return down into its
     west end and the supply up out of its east; the two dehumidifiers on the south wall, and the drum that charts the
     lobby's air; and low in the east wall the mess's branch, its access door off. Up the steps, the space over the
     false sky: half a metre over the lobby's roof, a dark plenum of grating between the backs of the ceiling's light
     boxes. The steps take the whole length of the old room (any steeper and nothing that walks could follow you up) */
  const AP: RoomOpts = { ...UTIL, ...wing, ht: 6, noroam: 1 };
  room(T2, 'Air plant', 32, -30, 20, 4, AP); room(T2, 'Air plant', 42.5, -26, 9.5, 4, AP); // a wall's width off the plant stair's well
  flight(T2, 32, -30, 8, 4, 0, 3.5, 'w', 16);
  /* the air handler on its plinth, in its sections from the west: where the return comes in, the filters, the coil, the
     fan, and the plenum the supply leaves by; a door on each, on the aisle */
  const AHU = 0x6e7672, DUCT = 0x8a8e8c, LAG = 0xb8b2a0, steel = { mat: 'steel' } as const;
  bx(T2, 47, -28.7, 8.2, 0.15, 2.5, 0x6b6e70);
  for (const [x0, x1, c] of [[43, 44.4, AHU], [44.4, 45.4, 0x66706c], [45.4, 46.8, AHU], [46.8, 49.6, 0x66706c], [49.6, 51, AHU]] as const) {
    bx(T2, (x0 + x1) / 2, -28.7, x1 - x0 - 0.02, 2.65, 2.4, c, { ...steel, y: 0.15 });
    bx(T2, (x0 + x1) / 2, -27.485, Math.min(0.9, x1 - x0 - 0.3), 1.9, 0.03, 0x5a625e, { ...steel, y: 0.4, c: 0 }); // its door
    bx(T2, (x0 + x1) / 2 + Math.min(0.9, x1 - x0 - 0.3) / 2 - 0.12, -27.46, 0.04, 0.16, 0.03, 0x2a2c2e, { y: 1.3, c: 0 }); // the handle
  }
  bx(T2, 44.9, -27.46, 0.16, 0.16, 0.02, 0xd8d4c4, { y: 1.75, c: 0 }); // the filters' gauge, on their door
  bx(T2, 43.7, -28.9, 1.2, 3.2, 1.6, DUCT, { ...steel, y: 2.8, c: 0 }); bx(T2, 50.3, -28.9, 1.2, 3.2, 1.6, DUCT, { ...steel, y: 2.8, c: 0 }); // the return down from the roof, the supply up into it
  for (const x of [45.52, 46.68]) P(T2, 'cyl', x, -27.4, 0.2, 1.3, 0.2, LAG, { c: 0 }); // the chilled water, up out of the floor into the coil, either side of its door
  P(T2, 'cyl', 46.1, -26.9, 0.24, 0.02, 0.24, 0x2a2c2e, { c: 0 }); // the floor's drain
  /* the dehumidifiers, A and B, on the south wall: each its panel, lit with the wing, A's lamp green and B's red; their
     ducts up into the roof */
  for (const [k, x] of [45.2, 48.4].entries()) {
    bx(T2, x, -22.65, 1.8, 2, 1.1, 0x7a8288, { ...steel });
    bx(T2, x, -22.65, 0.6, 4, 0.6, DUCT, { ...steel, y: 2, c: 0 });
    bx(T2, x - 0.4, -23.215, 0.5, 0.4, 0.03, 0x2c2f33, { y: 1.3, c: 0 });
    bx(T2, x - 0.52, -23.235, 0.06, 0.06, 0.01, [0.06, 0.06, 0.06], { y: 1.55, c: 0, pw: [[0.06, 0.06, 0.06], k ? [2.6, 0.3, 0.2] : [0.3, 2.4, 0.4]], pc: 'SEC' });
    bx(T2, x - 0.32, -23.235, 0.2, 0.08, 0.01, [0.04, 0.05, 0.05], { y: 1.4, c: 0, pw: [[0.04, 0.05, 0.05], [0.6, 2.4, 1]], pc: 'SEC' });
  }
  bx(T2, 48.1, -23.205, 0.14, 0.09, 0.01, 0xd8d0a0, { y: 1.15, c: 0 }); // B's tag
  use(T2, 'look', 48.4, -23.2, 1.3, { label: 'Dehumidifier B', text: 'It and A beside it dried the lobby\'s air. A tag on its panel: TRIPS ON ITS OWN. RESET 2/10. Under it in pencil: 9/10, 17/10, 30/10.' });
  /* the drum recorder on its shelf: clockwork and a hair, so it went on without the power */
  bx(T2, 50.6, -22.15, 0.6, 0.04, 0.3, 0x3a3d40, { y: 1.2, c: 0 }); bx(T2, 50.6, -22.15, 0.4, 0.24, 0.26, 0x4a5056, { y: 1.24, c: 0 });
  P(T2, 'cyl', 50.6, -22.15, 0.14, 0.13, 0.14, 0xe2ddd0, { y: 1.48, c: 0 }); // its drum
  use(T2, 'look', 50.6, -22.2, 1.4, { label: 'Chart recorder', text: 'A drum on clockwork and a pen on a hair: the lobby\'s air, a week to a chart. Forty-five per cent, round and round; then, the last few days, a climb past ninety, and it stays there.' });
  /* the plant's controls on the east wall, its screen lit with the wing; spare filters on a pallet */
  bx(T2, 51.7, -24.4, 0.6, 2, 1.2, 0x5f6266); bx(T2, 51.39, -24.4, 0.02, 0.28, 0.4, [0.04, 0.05, 0.05], { y: 1.4, c: 0, pw: [[0.04, 0.05, 0.05], [2.2, 2.75, 2.5]], pc: 'SEC' });
  bx(T2, 44.2, -24.4, 1.2, 0.14, 1, 0x8a6a44); for (const y of [0.14, 0.64]) bx(T2, 44.2, -24.4, 1.1, 0.5, 0.6, 0xd8d4c4, { y });
  /* the mess's branch, to be crawled: low in the east wall, a galvanised collar round it and its access door off on
     the floor. East through the rock, down a riser, and back west along the mess's north wall to its grille over the
     servery, 2 m up the wall; a joint a hand lower at each section past the riser. A body's crouch high, no light. Its
     drop and the grille's are each a body's fall that does not hurt, and neither climbs back: one way, into the mess.
     Nothing a person's height follows you in. The grille is off (the work orders: a noise along it at night, in
     October), and down the middle of the duct's dust a track a body wide; what made it is the owner's to say */
  for (const z of [-28.14, -26.86]) bx(T2, 51.96, z, 0.08, 1.58, 0.08, DUCT, { ...steel, c: 0 });
  bx(T2, 51.96, -27.5, 0.08, 0.08, 1.36, DUCT, { ...steel, y: 1.5, c: 0 });
  bx(T2, 50.4, -25.6, 1.25, 0.03, 1.15, DUCT, { ...steel, ry: 0.2, c: 0 });
  const DU: RoomOpts = { ...wing, em: 0, nolamp: 1, noroam: 1, ht: 1.5, fl: 0x8a8478, wl: 0x8a8e8c, st: 0x8a8e8c, mat: { floor: 'steel', wall: 'steel', ceiling: 'steel' } };
  room(T2, 'Duct', 52, -28.1, 4, 1.2, DU);
  room(T1, 'Duct', 56, -28.1, 1.2, 1.2, { ...DU, dy: 2.75, ht: 3.75 }); // the riser: 2.25 m down
  room(T1, 'Duct', 55, -28.1, 1, 1.2, { ...DU, dy: 2.5 }); room(T1, 'Duct', 54, -28.1, 1, 1.2, { ...DU, dy: 2.25 });
  room(T1, 'Duct', 49.9, -28.1, 4.1, 1.2, { ...DU, dy: 2 }); room(T1, 'Duct', 49.9, -26.9, 1, 0.9, { ...DU, dy: 2 }); // and to the grille
  /* the track through the dust: [floor, its middle, how long along x, along z] */
  for (const [F, x, z, w, d] of [[T2, 54, -27.5, 4, 0.5], [T1, 56.6, -27.5, 1.2, 0.5], [T1, 55.5, -27.5, 1, 0.5], [T1, 54.5, -27.5, 1, 0.5], [T1, 51.95, -27.5, 4.1, 0.5], [T1, 50.4, -26.45, 0.5, 0.9]] as const)
    bx(F, x, z, w, 0.004, d, 0x6a6e70, { y: 0.002, c: 0 });
  use(T1, 'look', 52, -27.5, 0.3, { label: 'Dust', text: 'Grey dust on the floor of the duct, thick as felt, but for a track down its middle a body wide.' });
  /* the grille's opening in the mess, framed, and the grille on the floor under it, bent outward, its screws still in
     the wall */
  for (const x of [49.86, 50.94]) bx(T1, x, -25.98, 0.08, 1.2, 0.04, 0xb8bcc0, { y: 2, c: 0 });
  bx(T1, 50.4, -25.98, 1.16, 0.04, 0.04, 0xb8bcc0, { y: 1.96, c: 0 });
  bx(T1, 50.7, -25, 1, 0.03, 1.2, 0xb8bcc0, { ry: 0.4, c: 0 });
  use(T1, 'look', 50.7, -25, 0.2, { label: 'Grille', text: 'The grille off the duct over the servery, on the floor under its opening and bent outward. Its screws are still in the wall.' });
  const SV: RoomOpts = { ...wing, em: 0, air: 1, dy: 3.5, ht: 2.4, noroam: 1, fl: 0x4a4c4e, wl: 0x4a4640, st: 0x4a4640, mat: { floor: 'grating', wall: 'shot', ceiling: 'shot' } };
  room(T2, 'Sky void', -8, -28, 38, 24, SV); room(T2, 'Sky void', 30, -28, 2, 2, SV);
  for (const x of [-5, 1, 7, 13, 19, 25]) for (const z of [-25, -19, -13, -7]) {
    bx(T2, x, z, 2.8, 0.4, 2.8, 0x3a3c3e); bx(T2, x, z, 2.6, 0.02, 2.6, 0x8a8e8c, { y: 0.4, c: 0 }); // a light box's back, its access panel
  }

  /* Behind the bar: the kitchen that served it and the lounges, and a passage round the back of the shaft to goods
     inward, so that stock never crossed the lobby. Down its west side the service stair (world.md §8, Security at the
     station's size), an open well with a wall round it at the kitchen's floor, to the pantry a storey down under the
     bar, and on along a back passage to the retreat's: the family's dinners went down the back way. On the wing's feed */
  const KT: RoomOpts = { ...wing, fl: 0x6a6e6a, wl: 0xb8bcb4, st: 0x8c2f24, mat: { floor: 'epoxy', wall: 'glazed', ceiling: 'tiles' } };
  const STL = 0x8a8e8c, TILEK = 0xb8bcb4, stl = { mat: 'steel' } as const;
  room(D, 'Kitchen', -8, -2, 6, 14, KT);
  door(D, -7, -3, { sg: [['Staff only', 'n']] });
  /* the well: the stair climbs south from the pantry, and comes up at the kitchen's south end; a tiled wall round its
     open sides, a steel rail along the top */
  stairs(B, D, -8, 0, 2, 10, 's');
  bx(D, -5.95, 5, 0.1, 1.05, 10, TILEK); bx(D, -6.95, -0.05, 2.1, 1.05, 0.1, TILEK);
  bx(D, -5.95, 5, 0.14, 0.05, 10, STL, { ...stl, y: 1.05, c: 0 }); bx(D, -6.95, -0.05, 2.1, 0.05, 0.14, STL, { ...stl, y: 1.05, c: 0 });
  /* the line along the east wall: a steel counter, the range and the hood over it, the sink */
  bx(D, -2.32, 1.9, 0.6, 0.9, 7, STL, stl); bx(D, -2.32, 1.2, 0.56, 0.02, 1.2, 0x1d1f21, { y: 0.9, c: 0 }); // the counter, the range's top
  bx(D, -2.45, 1.2, 0.9, 0.5, 1.6, STL, { ...stl, y: 2.1, c: 0 }); bx(D, -2.3, 1.2, 0.6, 0.6, 0.5, STL, { ...stl, y: 2.6, c: 0 }); // the hood, its duct
  bx(D, -2.32, 4.4, 0.5, 0.02, 0.8, 0x5a5d60, { y: 0.9, c: 0 }); P(D, 'cyl', -2.1, 4.4, 0.03, 0.3, 0.03, STL, { y: 0.9, c: 0 }); // the sink, its tap
  /* the island, a steel table; the pots on a rail hung over it */
  bx(D, -4.4, 5, 0.9, 0.9, 4, STL, stl);
  bx(D, -4.4, 5, 0.06, 0.06, 3, 0x2a2c2e, { y: 2.3, c: 0 }); for (const z of [3.7, 6.3]) bx(D, -4.4, z, 0.04, 0.84, 0.04, 0x2a2c2e, { y: 2.36, c: 0 });
  for (const [k, z] of [3.9, 4.6, 5.3, 6].entries()) P(D, 'cyl', -4.4, z, 0.26 + (k % 2) * 0.08, 0.26, 0.26 + (k % 2) * 0.08, STL, { y: 2.05, c: 0 });
  for (let k = 0; k < 3; k++) P(D, 'cyl', -4.4, 3.5 + k * 0.3, 0.26, 0.02 + k * 0.02, 0.26, 0xe8e8e2, { y: 0.9, c: 0 }); // plates, stacked
  /* the south end, where the stair comes up: dry goods on a rack, the fridge, its door open and nothing in it */
  rack(D, -4.6, 11.7, 2, 0.5, [0x8a8e8c, 0x6b5a3c, 0x4d5a66, 0x7a4a34]); bx(D, -3.4, 8.8, 0.8, 0.6, 0.8, 0x6b5a3c);
  bx(D, -2.4, 11.6, 0.7, 1.9, 0.7, 0xb8bcc0); bx(D, -2.98, 11.1, 0.04, 1.8, 0.6, 0xb8bcc0, { ry: 0.6, c: 0 });
  item(D, 'ration', -2.32, 3, 0.9, 2); item(D, 'peaches', -2.32, 5.2, 0.9);
  /* the pantry, under the bar: the family's china behind glass, linen, the silver's table, a plate warmer and a trolley,
     and their wine laid down in its rack; and the back passage east, under the lobby, to the retreat's */
  const PN: RoomOpts = { ...wing, fl: 0x6a6258, wl: 0xc8bea8, st: 0x7a5a30, lc: [0.92, 0.86, 0.74], mat: { floor: 'vinyl', wall: 'plaster', ceiling: 'plaster' } };
  room(B, 'Service stair', -8, 0, 2, 10, { ...UTIL, ...wing, ht: 4.5, nolamp: 1, mat: { floor: 'epoxy', wall: 'block', ceiling: 'concrete' } });
  room(B, 'Pantry', -8, -5.5, 6, 5.5, PN);
  room(B, 'Back passage', -1.5, -5.5, 12.5, 2, { ...wing, fl: 0x5a5d5a, wl: 0x8a8e88, st: 0x3f7f6b, mat: { floor: 'vinyl', wall: 'block' } });
  door(B, -1.75, -4.5, { sg: [['Pantry', 'e']] }); door(B, 9.5, -5.75, { sg: [['Staff only', 'n'], ['Retreat', 's']] });
  const OAK = 0x6a4a2e;
  bx(B, -2.3, -1.5, 0.6, 2.2, 2.4, OAK); for (const y of [0.5, 1, 1.5]) bx(B, -2.62, -1.5, 0.02, 0.02, 2.3, OAK, { y, c: 0 }); // the china cupboard, glazed, clear of the door
  bx(B, -2.61, -1.5, 0.01, 1.6, 2.2, [0.55, 0.66, 0.7], { y: 0.45, c: 0, mat: 'glass' });
  for (const y of [0.55, 1.05, 1.55]) for (let k = 0; k < 5; k++) P(B, 'cyl', -2.4, -2.4 + k * 0.45, 0.3, 0.02, 0.3, 0xe8e8e2, { y, c: 0, rz: PI / 2 - 0.15 });
  bx(B, -5, -5.25, 3, 2, 0.5, OAK); // the wine, laid down
  for (let r = 0; r < 5; r++) for (let k = 0; k < 9; k++) if ((k * 7 + r * 3) % 5 !== 0) bx(B, -6.35 + k * 0.34, -5.0, 0.07, 0.07, 0.02, [0x2a3a22, 0x3a1e1a][(k + r) % 2], { y: 0.3 + r * 0.36, c: 0 });
  tbl(B, -5, -2.6, 1.6, 0.8, OAK); for (const [x, c] of [[-5.5, 0x9aa0a4], [-5.1, 0x9aa0a4], [-4.6, 0xc9a227]] as const) P(B, 'cyl', x, -2.6, 0.08, 0.12, 0.08, c, { y: 0.76, c: 0, mat: 'steel' }); // the silver, half polished
  bx(B, -7.7, -2.5, 0.6, 1.1, 1, STL, stl); // the plate warmer
  bx(B, -4.8, -0.7, 0.9, 0.85, 0.5, STL, stl); P(B, 'ico', -4.8, -0.7, 0.4, 0.22, 0.32, 0xb8bcc0, { y: 0.85, c: 0, mat: 'steel' }); // the trolley, a cloche on it
  bx(B, -7.7, -4.6, 0.6, 1.8, 1.2, 0xd8d4c4); // linen, folded
  use(B, 'look', -5, -2.6, 0.9, { label: 'Menus', text: 'Menus for dinner in the lounge, typed on the house\'s card. The last is for eight.' });
  bx(B, 4, -3.8, 0.6, 1, 0.5, STL, stl); // an empty trolley, parked
  room(D, 'Service passage', -2, 6, 14, 4, { ...UTIL, ...wing }); door(D, 13, 7, { sg: [['Goods inward', 'w']] });
  bx(D, 4.6, 8.9, 0.8, 1.6, 0.7, 0x6b6e70, { mat: 'steel' }); // a roll cage, empty
  /* the walk-ins off its south side (world.md §8, Security at the station's size): what the dock sent on for the bar's
     kitchen, the mess and the retreat. The dry store behind a shutter; the chiller and the freezer behind plain steel,
     each with its readout by the door, lit with the wing. No emergency lights in them: in the dark, they are black */
  const DRY: RoomOpts = { ...wing, em: 0, fl: 0x6a665e, wl: 0x9a958a, st: 0x7a5a30, mat: { floor: 'epoxy', wall: 'block', ceiling: 'concrete' } };
  const COLD: RoomOpts = { ...wing, em: 0, ht: 3, fl: 0x8a8e8c, wl: 0xc8ccc8, st: 0x5a7a8a, lc: [0.82, 0.88, 0.92], mat: { floor: 'epoxy', wall: 'glazed', ceiling: 'concrete' } };
  room(D, 'Dry store', -1, 11, 6, 8, DRY); door(D, 2, 10.5, { sg: [['Dry store', 'n']] });
  room(D, 'Chiller', 5.5, 11, 3.5, 5.5, COLD); door(D, 7.4, 10.5, { plain: true, sg: [['Chiller', 'n']] });
  room(D, 'Freezer', 9.5, 11, 3.5, 5.5, COLD); door(D, 10.4, 10.5, { plain: true, sg: [['Freezer', 'n']] });
  for (const x of [8.4, 11.4]) bx(D, x, 9.98, 0.24, 0.14, 0.04, [0.04, 0.05, 0.05], { y: 1.5, c: 0, pw: [[0.04, 0.05, 0.05], [0.6, 2.4, 1]], pc: 'SEC' });
  /* the dry store: shelving down both walls and an island between, tins, packets and sacks; a pallet of flour at the
     back, one sack split */
  rack(D, -0.7, 15, 0.5, 7, [0x8a8e8c, 0x6b5a3c, 0xc8b890, 0x7a4a34]); rack(D, 4.7, 14.6, 0.5, 6.2, [0x6b5a3c, 0x8a8e8c, 0x4d5a66, 0xc8b890]);
  rack(D, 2, 14.4, 0.6, 3.6, [0x8a8e8c, 0x7a4a34, 0xc8b890, 0x5c6b4a]);
  bx(D, 2, 18.2, 1.2, 0.14, 1, 0x8a6a44);
  for (const [k, [dx, dz]] of [[-0.28, -0.22], [0.28, -0.22], [-0.28, 0.22], [0.28, 0.22]].entries()) P(D, 'ico', 2 + dx, 18.2 + dz, 0.55, 0.32, 0.42, k === 1 ? 0xb8a880 : 0xc8b890, { y: 0.14 });
  P(D, 'cyl', 2.9, 17.5, 0.8, 0.02, 0.6, 0xe2ddd0, { c: 0 });
  /* the chiller: crates down both walls, what was in them gone over; the freezer: boxes that were furred with frost,
     thawing since the cut */
  for (const x of [5.8, 8.7]) rack(D, x, 13.9, 0.5, 4.6, [0x5a4a2a, 0x3a4a28, 0xb8bcc0, 0x6a3a2a]);
  for (const x of [9.8, 12.7]) rack(D, x, 13.9, 0.5, 4.6, [0xd8dcdc, 0xb8c4c8, 0x9aa4a8, 0x8a7a6a]);
}

/* the Cargo cavern: a 20 m vault, x 110 to 240, with three tiers stepped up its north side at +5, +10 and +15 and a platform
   between each. Dead and black until its backup set runs, which also moves the platforms, and wakes the nest that thickens
   toward the roof. East of it, the link to the exhaust shaft and ladderway B under the sealed fan door. */
function buildCargo(D: Floor, T1: Floor, T2: Floor, T3: Floor): void {
  const cav = cave(D, 'Cargo cavern', 110, -14, 130, 28, { ...BAY, ht: 20, c: 'CARGO', lit: 'main', em: 1, motes: 'flesh' }); arch(D, cav, 5); roughen(D, cav, 0, 1.2);
  const TW: RoomOpts = { ...WALK, ht: 5, c: 'CARGO', motes: 'flesh', mat: { wall: 'shot', ceiling: 'shot' } };
  room(T1, 'Tier 1', 126, -14, 96, 10, TW); room(T2, 'Tier 2', 134, -14, 78, 10, TW); room(T3, 'Tier 3', 142, -14, 50, 10, TW);
  elev(D, T1, 130, -8, 4, 4, 'CARGO', 'Cargo platform'); elev(T1, T2, 138, -8, 4, 4, 'CARGO', 'Cargo platform'); elev(T2, T3, 146, -8, 4, 4, 'CARGO', 'Cargo platform');
  /* the gantry crane, on rails along both walls */
  for (const z of [-13.6, 13.6]) bx(D, 175, z, 128, 0.5, 0.4, 0x5a5d60, { y: 17.4, c: 0 });
  bx(D, 170, 0, 1, 0.8, 27.4, 0xc9a227, { y: 17.6, c: 0 }); bx(D, 170, 3, 1.4, 0.6, 1.4, 0x2a2c2e, { y: 17, c: 0 }); bx(D, 170, 3, 0.05, 8.6, 0.05, 0x2a2c2e, { y: 8.4, c: 0 }); bx(D, 170, 3, 0.5, 0.4, 0.5, 0x8a7a2a, { y: 8, c: 0 });
  /* the floor: receiving at the west end, containers and forklifts, the nest at the east end */
  blood(D, 118, 2, 1.4);
  container(D, 134, 10, false, 2); container(D, 150, 10, false, 3); container(D, 180, 10.4, false, 2); container(D, 198, 8.8, true, 1); container(D, 158, -10, false, 1); container(D, 186, -10.8, false, 1);
  container(D, 166, 4.8, true, 2); container(D, 210, 5.2, true, 3); forklift(D, 142, 3, true); forklift(D, 192, 3.6, false);
  mut(D, 'husk', 150, -0.8); mut(D, 'husk', 182, 0.8);
  /* one of the bone line's middle years beside the young one at receiving: the two come to the door when it is slid open
     (its `loud`, above) */
  mut(D, 'bonemid', 146, -4.5);
  for (const [x, z, n] of [[218, -6, 4], [224, 6, 5], [228, -10, 3], [232, 0, 5], [236, 10, 4], [222, -0.8, 3]]) eggs(D, x, z, n); gore(D, 226, 1, 4); blood(D, 230, -4, 2);
  mut(D, 'worm', 224, 2); mut(D, 'worm', 226, 4); mut(D, 'worm', 223, 4.8); mut(D, 'skitter', 232, -6); mut(D, 'husk', 214, 8, { post: 1, yaw: -PI / 2 });
  /* the tiers: thicker with every one */
  container(T1, 174, -10.8, false, 1); for (const [x, z] of [[160, -10], [188, -12], [206, -8]]) eggs(T1, x, z, 4); mut(T1, 'skitter', 166, -8); mut(T1, 'skitter', 198, -10);
  for (const [x, z] of [[142, -12], [158, -8], [170, -12], [182, -8.8], [196, -11.2], [206, -10]]) eggs(T2, x, z, 5); gore(T2, 176, -10, 4); mut(T2, 'skitter', 162, -10); mut(T2, 'skitter', 184, -8); mut(T2, 'skitter', 200, -10.8);
  mut(T2, 'grabber', 170, -13.76, { yaw: 0 });
  for (const [x, z] of [[144, -12], [151.2, -8], [156, -11.2], [162, -8.4], [168, -12], [174, -8], [180, -10.8], [186, -8.8]]) eggs(T3, x, z, 6); gore(T3, 166, -10, 5); gore(T3, 178, -10.8, 4);
  mut(T3, 'skitter', 154, -10); mut(T3, 'skitter', 170, -7.2); mut(T3, 'skitter', 184, -12);
  /* the nest's own light: pustules among the eggs that glow a sick red, enough to be seen across the bay in the dark; and
     its edge, creeping west over the floor toward the door, below Cargo control's window */
  for (const [x, z, n] of [[122, 9, 3], [130, 5.6, 4], [137, 9.2, 5], [144, 6.4, 4]] as const) eggs(D, x, z, n);
  for (const [Dk, x, z] of [[D, 123.2, 8.4], [D, 131, 6], [D, 138, 8.8], [T1, 160, -10], [T2, 158, -8], [T2, 170, -12], [T3, 151.2, -8], [T3, 162, -8.4], [T3, 174, -8]] as const) {
    for (let k = 0; k < 5; k++) P(Dk, 'ico', x + (k - 2) * 0.44, z + ((k * 7) % 3 - 1) * 0.5, 0.38, 0.3, 0.38, [2.6, 0.9, 0.55], { y: k % 2 ? 0 : -0.08, c: 0 });
    Dk.lamps.push({ x, z, r: 5.5, c: [0.55, 0.18, 0.1], h: 0.5 });
  } bx(T3, 182, -11.2, 1.1, 0.6, 1.1, 0x6b5a3c); item(T3, 'fuse', 182, -11.2, 0.6); item(T3, 'batt', 180, -9.2, 0.02, 2);
  /* south of the floor: the cargo office, with the backup set, and the vehicle bay */
  room(D, 'Cargo office', 114, 16, 8, 8, { ...OFF, c: 'CARGO' }); door(D, 117.4, 15, { sg: [['Cargo office', 'n']] });
  desk(D, 116.8, 22.6, 1.8, 0.7); note(D, 'manifest', 116.2, 22.5, 0.78); item(D, 'batt', 117.5, 22.6, 0.78); genset(D, 'CARGO', 120.6, 17.4, 119.4, 18.6); item(D, 'bandage', 114.8, 17, 0.02);
  room(D, 'Vehicle bay', 126, 16, 12, 8, { ...UTIL, c: 'CARGO' }); door(D, 131, 15, { sg: [['Vehicles', 'n']] });
  forklift(D, 128, 20.6, true); forklift(D, 134.8, 20.4, true); item(D, 'batt', 136.8, 17, 0.02); item(D, 'pipe', 132, 23.2, 0.02);
  /* east: the link to the exhaust shaft, and the top of ladderway B */
  door(D, 241, -1, { sg: [['Exhaust shaft', 'w']] }); room(D, 'Exhaust link', 242, -2, 12, 4, { ...UTIL, c: 'CARGO', em: 1 }); mut(D, 'grabber', 247, -1.76, { yaw: 0 });
  door(D, 255, -1, { sg: [['Fan station', 'w']] }); room(D, 'Fan station', 256, -6, 10, 12, { ...UTIL, c: 'CARGO', ht: 6, em: 1 });
  P(D, 'cyl', 261.2, -0.8, 4.4, 0.8, 4.4, 0x3b4046, { y: 5.2, c: 0 }); for (let k = 0; k < 4; k++) bx(D, 261.2, -0.8, 4, 0.06, 0.5, 0x5a5d60, { y: 5.14, c: 0, ry: (k * PI) / 4 }); // the fan, in the ceiling
  ladder(D, 'B1', 263.2, 3.2, 261.2, 2.8, PI / 2, false);
}

