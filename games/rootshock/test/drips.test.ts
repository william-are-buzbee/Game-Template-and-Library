import { describe, expect, it } from 'vitest';
import { STATION } from '../src/content/station';
import { levelDef } from '../src/sim/run';
import { makeSim } from '../src/sim/sim';
import { dripPoints } from '../src/present/render/drips';

/* Where the rock drips (present/render/drips.ts): in caves and over standing water, the same points every load, each
   with roof above and something under it a fall below. */

const world = (id: string) => makeSim(levelDef(STATION, id), { seed: 1, station: STATION }).world;

describe('drips', () => {
  it('the cave and the sump drip; the dry station only over its pool', () => {
    expect(dripPoints(world('cave')).length).toBeGreaterThan(3);
    expect(dripPoints(world('sump')).length).toBeGreaterThan(3);
    /* the station is dry but for the retreat's pool, its hall shut up warm and wet since the power went */
    const W = world('upper');
    expect(dripPoints(W).every(d => /^Pool/.test(W.roomAt(d.x, d.low + 0.5, d.z)?.name ?? ''))).toBe(true);
  });

  it('the same points every time, each falling at least a metre onto rock or water', () => {
    const w = world('sump'), a = dripPoints(w), b = dripPoints(w);
    expect(b.map(p => [p.x, p.z])).toEqual(a.map(p => [p.x, p.z]));
    for (const p of a) {
      expect(p.top - p.low).toBeGreaterThanOrEqual(1);
      if (p.water) expect(p.low).toBeCloseTo(w.waterAt(p.x, p.z), 5);
    }
    expect(a.some(p => p.water)).toBe(true);
  });
});
