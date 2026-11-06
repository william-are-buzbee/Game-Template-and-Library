// The numbers themselves, pinned. Every world in every game is generated from these streams (Tethys's island, Overworld's
// map, Rootshock's levels), so a change here changes all of them. Taken 6 Nov 2026 from this code, and checked that day
// to be identical, over 2000 draws for each seed below, to Tethys's mulberry (src/util.js), Overworld's rand (js/rng.js)
// and Planet-Viewer's mulberry32 (core-math.js).
import { describe, expect, it } from 'vitest';
import { Rng, hashString } from '../src/rng';

const FIRST: Record<number, number[]> = {
  1: [0.6270739405881613, 0.002735721180215478, 0.5274470399599522, 0.9810509674716741],
  42: [0.6011037519201636, 0.44829055899754167, 0.8524657934904099, 0.6697340414393693],
  4242: [0.5467061335220933, 0.27860878920182586, 0.9312369171530008, 0.5072224664036185],
  12345: [0.9797282677609473, 0.3067522644996643, 0.484205421525985, 0.817934412509203],
  2147483653: [0.5801103678531945, 0.08632027637213469, 0.9113832253497094, 0.7611181102693081],
};

describe('the streams, pinned', () => {
  for (const [seed, want] of Object.entries(FIRST)) {
    it(`seed ${seed}: the first four draws`, () => {
      const r = new Rng(Number(seed));
      expect(want.map(() => r.next())).toEqual(want);
    });
  }

  it('a state saved and restored carries on the same stream', () => {
    const a = new Rng(42);
    for (let i = 0; i < 100; i++) a.next();
    const b = new Rng(1);
    b.restore(a.state());
    for (let i = 0; i < 100; i++) expect(b.next()).toBe(a.next());
  });

  it('a string seed is its FNV-1a hash', () => {
    expect(hashString('')).toBe(2166136261);
    expect(hashString('tethys')).toBe(hashString('tethys'));
    expect(new Rng('lowfield').next()).toBe(new Rng(hashString('lowfield')).next());
  });
});
