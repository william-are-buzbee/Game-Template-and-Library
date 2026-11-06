import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/content/build/builder';
import { noInput } from '../src/sim/input';
import { makeSim, step, type Sim } from '../src/sim/sim';
import { CROUCH } from '../src/sim/player';
import { hold } from './kit';

/* A corridor running east from x 0 with things in the way. The player starts at x 1 facing east (yaw -PI/2). */
function course(build: (b: LevelBuilder) => void): Sim {
  const b = new LevelBuilder('course', 'Course');
  b.room('Run', 0, 0, 20, 2, { ht: 4, nolamp: true });
  build(b);
  b.start(1, 1, -Math.PI / 2);
  return makeSim(b.finish());
}
const east = { forward: 1 };

describe('the body', () => {
  it('stands on the floor and stays there', () => {
    const s = course(() => {});
    hold(s, 1);
    expect(s.player.body.y).toBeCloseTo(0);
    expect(s.player.body.ground).toBe(true);
  });

  it('walks into a wall and stops at it', () => {
    const s = course(() => {});
    hold(s, 10, east);
    expect(s.player.body.x).toBeCloseTo(20 - 0.32, 2);
  });

  it('walks up a 0.5 m edge without jumping', () => {
    const s = course(b => b.block(4, 0, 0, 20, 0.5, 2, 0x808080));
    hold(s, 2, east);
    expect(s.player.body.x).toBeGreaterThan(5);
    expect(s.player.body.y).toBeCloseTo(0.5);
  });

  it('is stopped by a 0.75 m edge, and jumps onto it', () => {
    const s = course(b => b.block(4, 0, 0, 20, 0.75, 2, 0x808080));
    hold(s, 2, east);
    expect(s.player.body.x).toBeLessThan(4);
    step(s, { ...noInput(), ...east, jump: true });
    hold(s, 1.5, east);
    expect(s.player.body.y).toBeCloseTo(0.75);
    expect(s.player.body.x).toBeGreaterThan(5);
  });

  it('cannot get onto 1.75 m even jumping', () => {
    const s = course(b => b.block(4, 0, 0, 20, 1.75, 2, 0x808080));
    hold(s, 1, east);
    step(s, { ...noInput(), ...east, jump: true });
    hold(s, 2, east);
    expect(s.player.body.x).toBeLessThan(4);
  });

  it('walks off a ledge and falls', () => {
    const s = course(b => b.block(0, 0, 0, 6, 2, 2, 0x808080));
    expect(s.player.body.y).toBeCloseTo(2);
    hold(s, 3, east);
    expect(s.player.body.x).toBeGreaterThan(8);
    expect(s.player.body.y).toBeCloseTo(0);
  });

  it('crouches under a low ceiling, and cannot stand up under it', () => {
    const s = course(b => b.block(4, 1.25, 0, 8, 4, 2, 0x808080));
    hold(s, 2, east);
    expect(s.player.body.x).toBeLessThan(4);
    step(s, { ...noInput(), crouch: true });
    hold(s, 2.5, east);
    expect(s.player.body.x).toBeGreaterThan(4.5);
    step(s, { ...noInput(), crouch: true });
    hold(s, 0.1);
    expect(s.player.crouch).toBe(true);
    expect(s.player.body.h).toBe(CROUCH);
    hold(s, 3, east);
    expect(s.player.body.x).toBeGreaterThan(8);
    expect(s.player.crouch).toBe(false);
  });

  it('hits its head on a ceiling mid-jump', () => {
    const s = course(b => b.block(0, 2.25, 0, 20, 4, 2, 0x808080));
    step(s, { ...noInput(), jump: true });
    let top = 0;
    for (let k = 0; k < 60; k++) { step(s, noInput()); top = Math.max(top, s.player.body.y); }
    expect(top).toBeGreaterThan(0.3);
    expect(top).toBeLessThanOrEqual(2.25 - 1.8 + 1e-6);
  });

  it('is the same run twice: the sim is deterministic', () => {
    const run = () => {
      const s = course(b => { b.block(4, 0, 0, 6, 0.5, 2, 0x808080); b.block(9, 0, 0, 20, 0.75, 2, 0x808080); });
      for (let k = 0; k < 400; k++) step(s, { ...noInput(), forward: 1, yaw: k % 7 === 0 ? 0.01 : -0.01, jump: k === 200 });
      const b = s.player.body;
      return [b.x, b.y, b.z, b.vy];
    };
    expect(run()).toEqual(run());
  });
});
