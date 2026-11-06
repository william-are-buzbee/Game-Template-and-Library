import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/content/build/builder';
import { World } from '../src/world/world';
import { circle, rect } from '../src/world/shapes';
import { testbed } from '../src/content/levels/testbed';

function box(): World {
  const b = new LevelBuilder('t', 'T');
  b.room('A', 0, 0, 4, 4, { ht: 3, nolamp: true });
  b.room('B', 4, 1, 8, 3, { ht: 2, nolamp: true });
  b.block(1, 0, 1, 2, 0.5, 2, 0x808080);
  b.collider(3, 3, 0.5, 1, 0.5);
  return new World(b.finish());
}

describe('World', () => {
  const w = box();
  it('knows open space from rock', () => {
    expect(w.solidAt(2, 1, 0.5)).toBe(false);
    expect(w.solidAt(-0.1, 1, 2)).toBe(true);
    expect(w.solidAt(2, 3.1, 2)).toBe(true);
    expect(w.solidAt(5, 2.1, 2)).toBe(true); // over the low room
    expect(w.roomAt(5, 1, 2)?.name).toBe('B');
  });
  it('stores only the chunks that have space in them', () => {
    expect(w.grid.chunkCount).toBeGreaterThan(0);
    expect(w.grid.chunkCount).toBeLessThanOrEqual(4); // 8 x 4 x 3 m fits in a few 4 m chunks
    expect(w.solidAt(-500, 3, 900)).toBe(true);
  });
  it('sees blocks and colliders', () => {
    expect(w.solidAt(1.5, 0.25, 1.5)).toBe(true);
    expect(w.solidAt(3, 0.5, 3)).toBe(true);
    expect(w.solidAt(3, 1.2, 3)).toBe(false);
  });
  it('finds ground and ceilings, for circles and rectangles', () => {
    expect(w.groundBelow(circle(0.5, 0.5, 0.3), 1)).toBeCloseTo(0);
    expect(w.groundBelow(circle(1.5, 1.5, 0.3), 1)).toBeCloseTo(0.5);
    expect(w.groundBelow(circle(3, 3, 0.3), 1.5)).toBeCloseTo(1);
    expect(w.groundBelow(rect(2.4, 1.5, 0.5, 0.2), 1)).toBeCloseTo(0.5); // overhangs the block's edge
    expect(w.ceilingAbove(circle(0.5, 0.5, 0.3), 1.8)).toBeCloseTo(3);
    expect(w.ceilingAbove(circle(6, 2, 0.3), 1)).toBeCloseTo(2);
  });
  it('overlaps a wall it reaches into, not one it only touches', () => {
    expect(w.overlap(circle(0.29, 2, 0.3), 0.01, 1.8)).toBe('world');
    expect(w.overlap(circle(0.3, 2, 0.3), 0.01, 1.8)).toBe(null);
    expect(w.overlap(rect(0.29, 2, 0.3, 0.3), 0.01, 1.8)).toBe('world');
  });
  it('sweeps up to a wall and stops there', () => {
    const t = w.sweep(circle(2, 0.5, 0.3), 0.01, 1.8, 0, -2);
    expect(0.5 - 2 * t).toBeCloseTo(0.3, 2);
    expect(w.sweep(circle(2.5, 0.6, 0.3), 0.01, 1.8, 0.2, 0)).toBe(1);
  });
  it('pushes something out of a wall by the shortest way', () => {
    const n = w.pushOut(circle(0.2, 2, 0.3), 0.01, 1.8)!;
    expect(n).not.toBeNull();
    expect(n[0]).toBeGreaterThan(0);
    expect(w.pushOut(circle(2.5, 0.6, 0.3), 0.01, 1.8)).toBeNull();
  });
  it('casts rays against rock, blocks and colliders', () => {
    expect(w.raycast(0.5, 1, 2, 3.5, 1, 2)).toBe(1); // clear across the room
    expect(w.raycast(0.5, 1, 2, 9, 1, 2)).toBeLessThan(1); // the far wall
    expect(w.raycast(0.5, 0.25, 1.5, 3.5, 0.25, 1.5) * 3).toBeCloseTo(0.5, 1); // the block, from x 0.5 to its face at 1
    expect(w.raycast(3, 2, 3, 3, 0.2, 3)).toBeLessThan(1); // down onto the collider
    expect(w.raycast(2, 1, 2, 2, 5, 2) * 4).toBeCloseTo(2, 1); // up to the 3 m ceiling
  });
  it('compiles the test bed', () => {
    const t = new World(testbed());
    expect(t.roomAt(3, 1, 3)?.name).toBe('Hall');
    expect(t.groundBelow(circle(14, 2, 0.3), 1.2)).toBeCloseTo(1);
  });
});

describe('sloped surfaces', () => {
  const b = new LevelBuilder('s', 'S');
  b.room('A', 0, 0, 10, 4, { ht: 4, nolamp: true });
  b.ramp(2, 0, 6, 4, 0, 1, 'e', 0x808080);
  b.cave('Cave', 20, 0, 30, 6, { ht: 3, floor: x => (x - 20) * 0.1, ceil: (_x, z) => Math.sin(z) * 0.5 });
  const w = new World(b.finish());

  it('a ramp is ground that rises', () => {
    expect(w.groundBelow(circle(4, 2, 0.01), 2)).toBeCloseTo(0.5, 2);
    expect(w.groundBelow(circle(5, 2, 0.3), 2)).toBeCloseTo(0.75 + 0.3 * 0.25, 2); // the highest point under you
  });
  it('a ramp is solid under its surface and clear over it', () => {
    expect(w.overlap(circle(4, 2, 0.3), 0.2, 1)).toBe('world');
    expect(w.overlap(circle(4, 2, 0.3), 0.6, 2)).toBe(null);
    expect(w.raycast(4, 2, 2, 4, -1, 2) * 3).toBeCloseTo(1.5, 1);
  });
  it('a cave floor and ceiling follow their relief', () => {
    expect(w.groundBelow(circle(25, 3, 0.01), 3)).toBeCloseTo(0.5, 2);
    expect(w.ceilingAbove(circle(25, 3, 0.01), 2)).toBeCloseTo(3 + Math.sin(3) * 0.5, 1);
  });
});

describe('water', () => {
  it('reports the surface where there is water', () => {
    const b = new LevelBuilder('w', 'W');
    b.room('A', 0, 0, 4, 4, { y0: -2, ht: 5 });
    b.water(0, 0, 4, 4, -0.3);
    const w = new World(b.finish());
    expect(w.waterAt(2, 2)).toBeCloseTo(-0.3);
    expect(w.waterAt(6, 2)).toBe(-Infinity);
  });
});
