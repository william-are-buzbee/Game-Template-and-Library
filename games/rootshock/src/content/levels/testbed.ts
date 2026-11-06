import { PI } from '../../core/math';
import { CELL, DARK, LevelBuilder, OPS, SEC, UTIL } from '../build/builder';
import { column, crates, shelf, table } from '../build/kit';
import { CAVERN } from '../materials';
import type { LevelDef } from '../types';

/* A place for proving the engine, not part of the station. The hall: steps, a mezzanine, a ledge you can jump onto, a wall
   you cannot, a crawl you have to crouch through, a dark room for the flashlight. Through the door south, the lab: a ramp
   up to a balcony, a lift to a gallery, a pool with a shallow end, crates to push, and a cave off its east side.
   Through the gate north, the arena (engine.md §6, F4): open floor to fight on, the weapons on a table by the gate, a
   corridor 1.6 m wide off its east side (where a side swing and a thresher's glance off the walls), a bay with a 2.2 m
   ceiling off its west side (where the axe's chop catches), and a ledge 3 m up a ramp to knock things off. Nothing
   lives in it: with ?dev, the keys 1 to 6 put the cast down in front of you (main.ts). */
export function testbed(): LevelDef {
  const b = new LevelBuilder('testbed', 'Test bed');

  b.room('Hall', 0, 0, 16, 12, { ht: 4, pal: OPS });
  b.block(12, 0, 0, 16, 1, 4, 0x5a5d60); // mezzanine, 1 m up
  b.steps(10, 0, 12, 2, 0, 1, 4, 'e', 0x5a5d60); // four 25 cm steps up to it
  b.block(2, 0, 9, 4, 0.75, 12, 0x6b5a3c); // a ledge you can jump onto
  b.block(6, 0, 9, 7, 1.75, 12, 0x55585c); // and one you cannot
  table(b, 5, 4, 2, 0.95);
  shelf(b, 0.3, 5, 0.5, 2.4);
  column(b, 8, 6, 4);
  crates(b, 13.5, 9, 3);

  b.room('Service corridor', 16, 5, 24, 7, { ht: 2.4, pal: UTIL, light: [0.32, 0.33, 0.36] });

  b.room('Dark store', 24, 2, 32, 10, { pal: CELL, light: DARK });
  crates(b, 29, 4, 4);
  crates(b, 27, 8.5, 2);

  b.room('Crawlway', -6, 8.5, 0, 10, { ht: 1.25, pal: UTIL, light: [0.3, 0.25, 0.18], nolamp: true });
  b.room('Closet', -10, 6, -6, 12, { ht: 3, pal: UTIL, light: [0.5, 0.12, 0.08] });

  /* the door south, in a short passage */
  b.room('Passage', 7, 12, 9, 13.75, { ht: 2.6, pal: UTIL, light: [0.32, 0.33, 0.36], nolamp: true });
  b.room('', 7, 13.75, 9, 14, { ht: 2.4, pal: UTIL, light: [0.32, 0.33, 0.36], nolamp: true });
  b.room('Passage', 7, 14, 9, 16, { ht: 2.6, pal: UTIL, light: [0.32, 0.33, 0.36], nolamp: true });
  b.door(7, 13.75, 9, 14, 2.4);

  b.room('Lab', 0, 16, 16, 34, { ht: 6, pal: SEC, light: [0.62, 0.66, 0.7] });
  /* a ramp up to a balcony 2 m up */
  b.block(0, 0, 26, 5, 2, 34, 0x55585c);
  b.ramp(1, 18, 3, 26, 0, 2, 's', 0x5f6266);
  /* a lift up to a gallery 3 m up */
  b.block(10, 0, 28, 16, 3, 34, 0x55585c);
  b.platform(8, 30, 10, 32, 0.2, 3);
  /* a pool: a shallow shelf at the west end, deep water beyond */
  b.room('Pool', 6, 18, 12, 24, { y0: -3, ht: 3, pal: SEC, light: [0.4, 0.5, 0.55], nolamp: true });
  b.block(6, -3, 18, 7.5, -0.5, 24, 0x4a5a5c);
  b.water(6, 18, 12, 24, -0.15);
  /* crates to push: a few loose, and a stack */
  for (const [x, z] of [[13, 19], [14.3, 19], [13, 20.3], [14.3, 21.6]]) b.box(x, z, 1.1, 1.1, 1.1, 0x6a4a34, { loose: true });
  b.box(13, 19, 0.9, 0.9, 0.9, 0x3a5a6a, { y: 1.1, loose: true });
  crates(b, 3.5, 31, 2);

  /* the cave, east through a short tunnel: rock, a rising uneven floor, a vaulted ceiling */
  b.room('Tunnel', 16, 20, 18, 22, { ht: 2.6, pal: { fl: 0x4a443c, wl: 0x5a5248, st: 0x5a5248 }, light: [0.12, 0.14, 0.12], nolamp: true, plain: true, mat: CAVERN });
  const rise = (x: number) => Math.max(0, (x - 18) / 14);
  b.cave('Cave', 18, 14, 32, 30, {
    ht: 3, light: [0.1, 0.17, 0.12],
    floor: (x, z) => rise(x) * 1.2 + 0.4 * Math.sin(x * 0.9) * Math.sin(z * 0.7) * rise(x),
    ceil: (x, z) => 1.6 * Math.sin((Math.PI * (z - 14)) / 16) + 0.3 * Math.sin(x * 1.3 + z),
  });
  for (const [x, z, s] of [[24, 18, 1.2], [28, 25, 1.6], [21, 27, 0.9]]) b.prop('ico', x, z, s, s * 0.7, s, 0x5a5248, { solid: true });

  /* the arena, north through a gate */
  b.room('Arena gate', 6, -2, 8, 0, { ht: 3, pal: UTIL, light: [0.4, 0.42, 0.45], nolamp: true });
  b.room('Arena', -2, -18, 18, -2, { ht: 5, pal: SEC, light: [0.62, 0.64, 0.66] });
  table(b, 3.5, -3.4, 2.4, 0.8);
  ['baton', 'pipe', 'wrench', 'axe', 'knife'].forEach((id, i) => b.item(id, 2.6 + i * 0.45, 0.77, -3.4));
  b.block(12, 0, -18, 18, 3, -13, 0x55585c); // the ledge, 3 m up
  b.ramp(4, -18, 12, -15.5, 0, 3, 'e', 0x5f6266); // and the ramp up to it from the west
  b.room('Arena corridor', 18, -11, 28, -9.4, { ht: 3, pal: UTIL, light: [0.45, 0.46, 0.5] });
  b.room('Low bay', -8, -14, -2, -6, { ht: 2.2, pal: UTIL, light: [0.45, 0.42, 0.38] });

  /* walls at an angle (engine.md §4): south out of the lab, a passage into a hall of eight sides, and across its south-
     east corner a wall at an angle (not a diagonal of the grid: 127 degrees) with a gap in it, into an annex, dark.
     The hall is painted block, the annex glazed tile: the wall between them takes each on its own side */
  b.room('Angle passage', 6.75, 34, 8.25, 37, { ht: 2.6, pal: UTIL, light: [0.4, 0.42, 0.45], nolamp: true });
  b.outline('Angled hall', [[5, 37], [10, 37], [12.5, 39.5], [12.5, 41], [8, 47], [5, 47], [2.5, 44.5], [2.5, 39.5]],
    { pal: OPS, light: [0.6, 0.6, 0.62], mat: { wall: 'block' }, open: [3] });
  b.outline('Angled annex', [[12.5, 41], [12.5, 44.5], [10, 47], [8, 47]], { pal: SEC, light: DARK, mat: { wall: 'glazed', floor: 'vinyl' }, open: [3] });
  /* the wall between, from rock to rock past either end, a gap 1.4 m wide in its middle */
  const across = (f: number): [number, number] => [12.5 - 4.5 * f, 41 + 6 * f], gap = 0.7 / 7.5, past = 0.25 / 7.5;
  b.wall(...across(-past), ...across(0.5 - gap)); b.wall(...across(0.5 + gap), ...across(1 + past));
  b.box(4.6, 42, 1.8, 0.45, 0.45, 0x5f6266, { ry: PI / 4 }); // a bench, turned to the passage

  b.start(3, 3, -PI / 2);
  return b.finish();
}
