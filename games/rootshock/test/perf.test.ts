import { describe, expect, it } from 'vitest';
import { Meter } from '../src/present/perf';

/* The dev readout's frame breakdown (present/perf.ts). */
describe('the meter', () => {
  it('shows each part as its mean and worst a frame over half a second, and nothing before that', () => {
    const m = new Meter();
    for (const ms of [1, 3, 2]) { m.add('sim', ms); m.end(0.1); }
    expect(m.line(['sim'])).toBe('sim -');
    m.add('sim', 2); m.add('sim', 4); // two steps in one frame are one frame's worth
    m.end(0.1);
    m.end(0.1); // a frame with none
    expect(m.shown.get('sim')).toEqual({ mean: 12 / 5, max: 6 });
    expect(m.line(['sim', 'gl'], 1)).toBe('sim 2.4/6.0  gl -');
  });
});
