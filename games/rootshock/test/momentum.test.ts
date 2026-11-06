import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/content/build/builder';
import { STEP } from '../src/core/loop';
import { push } from '../src/sim/body';
import { noInput, type Input } from '../src/sim/input';
import { makeSim, step, type Sim } from '../src/sim/sim';
import { hold } from './kit';

/* Momentum and solid bodies (engine.md §6, F1 and F1b). A corridor running east from x 0, 30 m long; you start at x 1
   facing east. Whatever of the cast is put in it stands still (stunned), so what moves it is you. */
function course(build: (b: LevelBuilder) => void = () => {}): Sim {
  const b = new LevelBuilder('course', 'Course');
  b.room('Run', 0, 0, 30, 2, { ht: 4, nolamp: true });
  build(b);
  b.start(1, 1, -Math.PI / 2);
  const s = makeSim(b.finish());
  for (const m of s.cast) m.stun = 1e9;
  s.game.hp = 1e9;
  return s;
}
const east = { forward: 1 };
const speed = (s: Sim) => Math.hypot(s.player.body.vx, s.player.body.vz);

describe('momentum', () => {
  it('you speed up to a walk, not start at one', () => {
    const s = course();
    hold(s, STEP, east);
    expect(speed(s)).toBeLessThan(1);
    hold(s, 0.3, east);
    expect(speed(s)).toBeCloseTo(3.2, 1);
  });

  it('you carry on a little after you let go', () => {
    const s = course();
    hold(s, 1, east);
    const x = s.player.body.x;
    hold(s, 0.5);
    expect(s.player.body.x - x).toBeGreaterThan(0.05);
    expect(speed(s)).toBe(0);
  });

  it('the axe in your hand makes you slower to get going', () => {
    const bare = course(), axe = course();
    axe.game.inv.push({ id: 'axe', n: 1, x: 0, y: 0 }); axe.game.weapon = 'axe';
    hold(bare, 0.05, east); hold(axe, 0.05, east);
    expect(speed(axe)).toBeLessThan(speed(bare) * 0.9);
    expect(axe.player.body.mass).toBeGreaterThan(bare.player.body.mass);
  });

  it('a wall stops you: it takes your pace, and says how hard you met it', () => {
    const s = course(b => b.block(4, 0, 0, 30, 4, 2, 0x808080));
    let slam = 0;
    for (let t = 0; t < 2; t += STEP) { step(s, { ...noInput(), ...east, run: true }); slam = Math.max(slam, s.player.slam); }
    expect(s.player.body.x).toBeCloseTo(4 - 0.32, 2);
    expect(s.player.body.vx).toBeCloseTo(0, 5);
    expect(slam).toBeGreaterThan(4);
  });

  it('thrown, you go further than you walk, and friction stops you whatever you do', () => {
    const thrown = (inp: Partial<Input>) => {
      const s = course();
      hold(s, 0.1);
      push(s.player.body, 9, 0);
      let far = 0;
      for (let t = 0; t < 1; t += STEP) { step(s, { ...noInput(), ...inp }); far = Math.max(far, s.player.body.x - 1); }
      return far;
    };
    /* about 1.7 m, as far as a 9 m/s throw goes against 24 m/s² of friction; backing off makes no difference to it */
    const still = thrown({}), back = thrown({ forward: -1 });
    expect(still).toBeGreaterThan(1.5);
    expect(back).toBeCloseTo(still, 1);
  });
});

describe('solid bodies', () => {
  it('a husk stops you, and you shove it at about half your pace', () => {
    const s = course(b => b.mutant('husk', 4, 0, 1));
    const m = s.cast[0];
    hold(s, 3, east);
    expect(s.player.body.x).toBeLessThan(m.x);
    const pace = (m.x - 4) / 2.5; // most of the 3 s was spent shoving
    expect(pace).toBeGreaterThan(0.9);
    expect(pace).toBeLessThan(2.2);
  });

  it('a worm you shove almost at your own pace; a thresher barely; a bloat not at all', () => {
    const moved = (type: string) => {
      const s = course(b => b.mutant(type, 4, 0, 1));
      hold(s, 3, east);
      return s.cast[0].x - 4;
    };
    const worm = moved('worm'), husk = moved('husk'), thresher = moved('thresher'), bloat = moved('bloat');
    expect(worm).toBeGreaterThan(husk);
    expect(husk).toBeGreaterThan(thresher);
    expect(thresher).toBeGreaterThan(0.05);
    expect(bloat).toBeCloseTo(0, 5);
  });

  it('a husk you walk into knows you are there', () => {
    const s = course(b => b.mutant('husk', 4, 0, 1, { post: 1 }));
    const m = s.cast[0];
    expect(m.state).not.toBe('hunt');
    hold(s, 2, east);
    expect(m.state).toBe('hunt');
    expect(m.post).toBe(false);
  });

  it('one of the cast knocked into you shoves you', () => {
    const s = course(b => b.mutant('husk', 4, 0, 1));
    const m = s.cast[0];
    hold(s, 0.1);
    s.player.body.x = 5; s.player.body.sync();
    m.body!.vx = 6;
    hold(s, 0.5);
    expect(s.player.body.x).toBeGreaterThan(5.02);
    expect(m.x).toBeLessThan(s.player.body.x);
  });
});

describe('the cast on their own feet', () => {
  /* A hall 20 by 12 m, you at (5, 6) facing east; what is put in it is awake. */
  function hall(build: (b: LevelBuilder) => void): Sim {
    const b = new LevelBuilder('hall', 'Hall');
    b.room('Hall', 0, 0, 20, 12, { ht: 4 });
    build(b);
    b.start(5, 6, -Math.PI / 2);
    const s = makeSim(b.finish());
    s.game.hp = 1e9;
    return s;
  }
  const v = (m: { body: { vx: number; vz: number } | null }) => Math.hypot(m.body!.vx, m.body!.vz);

  it('a husk gets going, rather than starting at a run, and brakes to stop short of you', () => {
    const s = hall(b => b.mutant('husk', 12, 0, 6)), m = s.cast[0];
    m.state = 'hunt'; m.fled = true;
    hold(s, STEP * 2);
    expect(v(m)).toBeLessThan(1.5);
    hold(s, 0.4);
    expect(v(m)).toBeCloseTo(3.5, 1);
    let nearest = 99;
    for (let t = 0; t < 3 && !m.blow; t += STEP) { step(s, noInput()); nearest = Math.min(nearest, m.dp); }
    expect(nearest).toBeGreaterThan(m.body!.r + s.player.body.r - 0.01);
  });

  it('its lunge is way it has on: thrown at you as it strikes', () => {
    const s = hall(b => b.mutant('husk', 6.2, 0, 6)), m = s.cast[0];
    m.state = 'hunt'; m.fled = true; m.yaw = -Math.PI / 2;
    let fastest = 0;
    for (let t = 0; t < 1.5; t += STEP) { step(s, noInput()); if (m.blow?.ph === 'strike') fastest = Math.max(fastest, v(m)); }
    expect(fastest).toBeGreaterThan(1.5);
  });

  it('knocked back, it has the knock to work off before it can come on again', () => {
    const s = hall(b => b.mutant('husk', 6.5, 0, 6)), m = s.cast[0];
    m.state = 'hunt'; m.fled = true;
    hold(s, 0.2);
    m.body!.vx = 5; // sent away from you, east
    step(s, noInput());
    expect(m.body!.vx).toBeGreaterThan(3.5); // still going away though it wants to come at you
  });

  it('a thresher\'s charge takes time to get going, and one into a wall hurts it', () => {
    const s = hall(b => b.mutant('thresher', 14, 0, 6)), m = s.cast[0];
    s.player.body.x = 2; s.player.body.sync();
    m.state = 'charge'; m.st = 3; m.tgt = false; m.cdir = Math.PI / 2; // east, at the wall 5.4 m off
    hold(s, 0.2);
    expect(v(m)).toBeLessThan(4);
    const hp = m.hp;
    let fastest = 0;
    for (let t = 0; t < 2 && m.state === 'charge'; t += STEP) { step(s, noInput()); fastest = Math.max(fastest, v(m)); }
    expect(fastest).toBeGreaterThan(6);
    expect(m.state).toBe('recover');
    expect(m.hp).toBeLessThan(hp);
  });
});
