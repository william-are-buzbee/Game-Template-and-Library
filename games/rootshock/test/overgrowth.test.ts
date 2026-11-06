import { describe, expect, it } from 'vitest';
import { beginLevel, door, finishLevel, floor, item, room, type Floor, type LevelInfo } from '../src/content/build/plan';
import { SEC, UTIL, shelf } from '../src/content/build/furnish';
import { BLOOM, CREAM, GOLD, GROW, LEAF, YOUNG, CURED, bed, bells, candelabra, colonise, cup, spire, tobacco } from '../src/content/build/overgrowth';
import { fringe, greatroot, pillar, span, sprawl, taproot, vault, wallroot } from '../src/content/build/roots';
import { makeSim } from '../src/sim/sim';
import { hold } from './kit';
import { bench } from '../src/content/levels/bench';
import type { LevelDef } from '../src/content/types';
import { placement } from './placement';

/* The growth (content/build/overgrowth.ts): what a room grown over by colonise() keeps to; the bench has every piece. */

const LV: LevelInfo = { id: 'g', name: 'g', c: 'G' };
/** a room 16 by 12 with a door in its north wall and a battery on its floor, grown over (or not) from its south-west
 *  corner, and a shelf of goods laid after it */
function level(grow: boolean): LevelDef {
  beginLevel(LV, {});
  const F = floor(LV);
  room(F, 'Hall', 0, 0, 16, 12, { ...SEC, ht: 3 }); room(F, 'Passage', 6, -3, 4, 2.5, SEC); door(F, 8.5, -0.25);
  item(F, 'batt', 5, 8);
  if (grow) colonise(F, F.rooms[0], 2, 10, 12);
  shelf(F, 14, 2, 1.8, 0.5);
  return finishLevel([8, 6, 0]);
}
/** a room 10 by 8 with whatever is grown in it */
function one(grow: (F: Floor) => void, o = { ...SEC, ht: 3.5 }): LevelDef {
  beginLevel(LV, {});
  const F = floor(LV);
  room(F, 'Room', 0, 0, 10, 8, o);
  grow(F);
  return finishLevel([5, 4, 0]);
}
const hex = (c: number) => [c >> 16, (c >> 8) & 255, c & 255].map(v => v / 255).join();
const leafy = new Set([...LEAF, ...YOUNG, ...CURED].map(c => [c >> 16, (c >> 8) & 255, c & 255].map(v => v / 255).join()));
const isLeaf = (p: LevelDef['props'][number]) => p.shape === 'ico' && leafy.has(p.colour.join());

describe('a place grown over', () => {
  const bare = level(false), grown = level(true);

  it('grows the same every time, and changes nothing else the level draws from its seed', () => {
    expect(level(true).props).toEqual(grown.props);
    /* the shelf's goods, laid after it, are as they are without it */
    const goods = (L: LevelDef) => L.props.filter(p => p.x > 13 && p.x < 15 && p.z > 1.6 && p.z < 2.4).map(p => [p.x, p.y, p.z, p.colour.join()]);
    expect(goods(grown)).toEqual(goods(bare));
  });

  it('is thickest at its heart, and thins out to its front', () => {
    const at = (r0: number, r1: number) => {
      const n = grown.props.filter(p => isLeaf(p) && p.y < 0.05 && Math.hypot(p.x - 2, p.z - 10) >= r0 && Math.hypot(p.x - 2, p.z - 10) < r1).length;
      return n / (Math.PI * (r1 * r1 - r0 * r0) / 4); // a quarter of the ring is in the room
    };
    const heart = at(0.5, 2.5), mid = at(5, 7), front = at(9, 11);
    expect(heart).toBeGreaterThan(2 * mid);
    expect(mid).toBeGreaterThan(front);
    expect(front).toBeGreaterThan(0);
    expect(grown.props.length - bare.props.length).toBeGreaterThan(400);
  });

  it('is dressing only: none of it solid, so it never shuts a way', () => {
    expect(grown.props.filter(p => p.solid).length).toBe(bare.props.filter(p => p.solid).length);
    expect(grown.colliders.length).toBe(bare.colliders.length);
  });

  it('keeps off the doorway and what lies about', () => {
    const d = grown.doors[0], dx = (d.x0 + d.x1) / 2, dz = (d.z0 + d.z1) / 2, b = grown.items[0];
    const stalks = grown.props.filter(p => p.shape === 'cyl' && p.sy > 0.3 && Math.abs(p.rz) < 0.3);
    expect(stalks.length).toBeGreaterThan(3);
    for (const p of stalks) expect(Math.hypot(p.x - dx, p.z - dz)).toBeGreaterThan(GROW.door - 0.2);
    for (const p of grown.props.filter(p => p.y < 0.05 && isLeaf(p))) expect(Math.hypot(p.x - b.x, p.z - b.z)).toBeGreaterThan(GROW.keep - 0.5 * 0.45);
  });

  it('the bench has every piece on it', () => {
    const L = bench(), looks = L.uses.filter(u => u.kind === 'look').map(u => u.opts.label);
    expect(looks).toEqual(expect.arrayContaining(['Shelves', 'Climbing, old', 'In flower', 'Leaf, cured', 'Hung', 'Runner', 'Where it took', 'Grown over', 'The front']));
    expect(looks).toEqual(expect.arrayContaining(['Spire', 'Bells', 'Candelabra', 'Cup', 'Bed', 'Forced', 'Taproot', 'Out of the wall', 'Across the room', 'Hair roots']));
    expect(L.props.some(p => p.colour[0] > 0.8 && p.colour[1] > 0.75 && p.colour[2] < 0.5)).toBe(true); // its flowers, pale yellow
  });
});

describe('the ways it flowers', () => {
  const yellow = new Set([...BLOOM, ...CREAM, ...GOLD].map(hex));
  const ways: [string, (F: Floor) => void][] = [
    ['rustica', F => tobacco(F, 5, 4, 1.6, { bloom: true })], ['spire', F => spire(F, 5, 4, 2.3, { heave: true })],
    ['bells', F => bells(F, 5, 4, 1.9, { heave: true })], ['candelabra', F => candelabra(F, 5, 4, 2.2, { heave: true })],
    ['cup', F => cup(F, 5, 4, 1.7, { heave: true })], ['bed', F => bed(F, 5, 4, 0.9)],
  ];
  for (const [name, grow] of ways)
    it(`${name}: up out of the floor and in flower, held where it stands, clear of the walls, never solid`, () => {
      const L = one(grow), F = placement(L), bare = one(() => {});
      expect(L.props.filter(p => yellow.has(p.colour.join())).length).toBeGreaterThan(name === 'rustica' ? 4 : 8);
      expect(F.map(f => `${f.kind}: ${f.what}`)).toEqual([]);
      expect(L.props.filter(p => p.solid).length).toBe(bare.props.filter(p => p.solid).length);
    });
});

describe('roots through concrete', () => {
  const L = one(F => {
    taproot(F, 3, 3, 4, { d: 0.45 });
    wallroot(F, 10, 2.5, 5, 'w', 7, 6);
    span(F, [0, 3.2, 6.5], 'e', [10, 3, 7], 'w');
    fringe(F, 6.5, 2.5, 4, 0.7);
  }, { ...UTIL, ht: 4 });

  it('go into the walls only as lumps, as growth may into rock; and hang from nothing', () => {
    const F = placement(L), site = { x0: 0, x1: 10 };
    expect(F.filter(f => f.kind === 'runs into a wall' || f.kind === 'lost in a wall').every(f => L.props[f.prop!].shape === 'ico')).toBe(true);
    expect(F.filter(f => f.kind !== 'runs into a wall').map(f => `${f.kind}: ${f.what}`)).toEqual([]);
    /* and they do go in: lumps through each wall they come out of */
    expect(L.props.some(p => p.shape === 'ico' && p.x - p.sx / 2 < site.x0 && p.y > 2)).toBe(true);
    expect(L.props.some(p => p.shape === 'ico' && p.x + p.sx / 2 > site.x1 && p.y > 1.5)).toBe(true);
  });

  it('reach from the ceiling to the floor, and leave the concrete broken where they go through', () => {
    const near = L.props.filter(p => Math.hypot(p.x - 3, p.z - 3) < 1.5);
    expect(Math.max(...near.map(p => p.y + p.sy))).toBeGreaterThan(3.9);
    expect(Math.min(...near.map(p => p.y))).toBeLessThan(0.05);
    expect(L.props.filter(p => p.colour.join() === hex(0x6a3a24)).length).toBeGreaterThan(2); // the reinforcing, bared
  });

  it('keep over a head, across a room', () => {
    const across = L.props.filter(p => p.x > 1 && p.x < 9 && Math.abs(p.z - 6.75) < 0.6 && p.y > 1);
    expect(across.length).toBeGreaterThan(10);
    expect(Math.min(...across.map(p => p.y))).toBeGreaterThan(GROW.head - 0.4);
  });

  it('are never solid', () => {
    expect(L.props.filter(p => p.solid).length).toBe(0);
  });
});

describe('the great roots', () => {
  /** a room 12 by 8 with a great root laid in it (or none), and you walked north across it from its south side for a
   *  few seconds: how far north you got */
  const walk = (lay: (F: Floor) => void) => {
    beginLevel(LV, {});
    const F = floor(LV);
    room(F, 'Hall', 0, 0, 12, 8, { ...UTIL, ht: 4.5 });
    lay(F);
    const s = makeSim(finishLevel([6, 7, 0]), { seed: 1 }), b = s.player.body;
    b.x = 6; b.z = 7.2; b.vx = b.vz = 0; s.player.yaw = 0;
    hold(s, 4, { forward: 1 });
    return b.z;
  };

  it('stop you where they lie across a room too high to step over, and let you under where they arch over a head', () => {
    expect(walk(() => {})).toBeLessThan(2); // nothing in the way: across the room
    expect(walk(F => greatroot(F, [[0.8, 0.3, 4], [11.2, 0.3, 4]], 1.4, 1.4))).toBeGreaterThan(4.4); // stopped at it
    expect(walk(F => greatroot(F, [[0.8, 3.4, 4], [11.2, 3.4, 4]], 0.9, 0.9))).toBeLessThan(2); // under it
    expect(walk(F => greatroot(F, [[0.8, 0.3, 4], [11.2, 0.3, 4]], 1.4, 1.4, { block: false }))).toBeLessThan(2); // drawn only
  });

  const L = one(F => {
    pillar(F, 3, 4, 4.5, { d: 1.6, inside: (x, z) => x > 0.3 && x < 9.7 && z > 0.3 && z < 7.7 });
    sprawl(F, 10, 0.7, 1.5, 'w', [[8.6, 1.8], [7.2, 3], [6.6, 5]], { d: 1.2 });
    vault(F, 6, 3.4, 8, 'n', 6.5, 4.5, { d: 0.8 });
  }, { ...UTIL, ht: 4.5 });

  it('go into the walls and the floor only as lumps (or as cracks), and hang from nothing', () => {
    const F = placement(L), rough = (p: LevelDef['props'][number]) => p.shape === 'ico' || p.sy <= 0.03;
    const wall = (f: { kind: string }) => f.kind === 'runs into a wall' || f.kind === 'lost in a wall';
    expect(F.filter(f => wall(f) && !rough(L.props[f.prop!])).map(f => f.what)).toEqual([]);
    expect(F.filter(f => !wall(f)).map(f => `${f.kind}: ${f.what}`)).toEqual([]);
  });

  it('are two to five times as thick as the cellar\'s, and solid along them, not their drawing', () => {
    expect(L.props.filter(p => p.solid).length).toBe(0); // what stops you is the boxes laid along them
    expect(L.colliders.length).toBeGreaterThan(30);
    const thick = Math.max(...L.props.filter(p => p.shape === 'cyl').map(p => p.sx));
    expect(thick).toBeGreaterThan(0.35 * 2 * 0.78); // a core at least twice a cellar root's
  });
});
