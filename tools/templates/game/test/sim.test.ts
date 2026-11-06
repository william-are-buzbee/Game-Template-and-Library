// The sim played with no browser: what a held key does, that the state is plain data, that a run is repeatable.
import { HZ } from '@wb/core';
import { describe, expect, it } from 'vitest';
import { noInput, type Input } from '../src/sim/input';
import { newState, type State } from '../src/sim/state';
import { HALF, SPEED, step } from '../src/sim/step';

function hold(s: State, inp: Input, seconds: number): State {
  for (let i = 0; i < Math.round(seconds * HZ); i++) step(s, inp);
  return s;
}

describe('sim', () => {
  it('forward for a second moves the player forward (−z), close to top speed', () => {
    const s = hold(newState(), { forward: 1, strafe: 0 }, 1);
    expect(s.player.z).toBeLessThan(-0.8 * SPEED);
    expect(Math.abs(s.player.x)).toBeLessThan(1e-9);
    expect(s.t).toBeCloseTo(1, 6);
  });

  it('with no input the player coasts to a stop', () => {
    const s = hold(hold(newState(), { forward: 0, strafe: 1 }, 1), noInput(), 2);
    expect(Math.hypot(s.player.vx, s.player.vz)).toBeLessThan(0.01);
  });

  it('a diagonal is no faster than a straight line', () => {
    const s = hold(newState(), { forward: 1, strafe: 1 }, 2);
    expect(Math.hypot(s.player.vx, s.player.vz)).toBeLessThanOrEqual(SPEED + 1e-9);
  });

  it('never leaves the floor', () => {
    const s = hold(newState(), { forward: 1, strafe: -1 }, 30);
    expect(Math.abs(s.player.x)).toBeLessThanOrEqual(HALF);
    expect(Math.abs(s.player.z)).toBeLessThanOrEqual(HALF);
  });

  it('the state is plain data: it survives JSON and plays on the same', () => {
    const a = hold(newState(), { forward: 1, strafe: 0.5 }, 1.5);
    const b: State = JSON.parse(JSON.stringify(a));
    expect(b).toEqual(a);
    hold(a, { forward: -1, strafe: 0 }, 1);
    hold(b, { forward: -1, strafe: 0 }, 1);
    expect(b).toEqual(a);
  });

  it('the same inputs give the same state, bit for bit', () => {
    const run = () => {
      const s = newState();
      for (let i = 0; i < 600; i++) step(s, { forward: Math.sin(i / 37), strafe: Math.cos(i / 23) });
      return s;
    };
    expect(run()).toEqual(run());
  });
});
