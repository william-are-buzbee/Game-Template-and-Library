import { describe, expect, it } from 'vitest';
import { FixedLoop, STEP } from '../src/core/loop';
import { Rng } from '../src/core/rng';

describe('FixedLoop', () => {
  it('runs whole steps and carries the remainder', () => {
    const l = new FixedLoop();
    expect(l.advance(STEP * 2.5)).toBe(2);
    expect(l.alpha).toBeCloseTo(0.5);
    expect(l.advance(STEP * 0.5)).toBe(1);
    expect(l.alpha).toBeCloseTo(0);
  });
  it('gives up catching up after a stall', () => {
    const l = new FixedLoop();
    expect(l.advance(5)).toBe(8);
    expect(l.advance(0)).toBe(0);
  });
});

describe('Rng', () => {
  it('repeats for the same seed and differs for another', () => {
    const a = new Rng('upper'), b = new Rng('upper'), c = new Rng('main');
    const sa = Array.from({ length: 5 }, () => a.next()), sb = Array.from({ length: 5 }, () => b.next());
    expect(sa).toEqual(sb);
    expect(c.next()).not.toBe(sa[0]);
    for (const x of sa) expect(x >= 0 && x < 1).toBe(true);
  });
});
