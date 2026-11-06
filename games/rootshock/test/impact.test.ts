import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/content/build/builder';
import { STEP } from '../src/core/loop';
import type { Mutant } from '../src/sim/cast';
import { give } from '../src/sim/game';
import { noInput } from '../src/sim/input';
import { makeSim, step, type Sim } from '../src/sim/sim';
import { hold } from './kit';

/* What a blow carries, and what a body thrown into something takes (engine.md §6, F3a). A hall 20 by 12 m, its east
   wall at x 20; you face east. What is put in it stands still (stunned) and cannot die of these unless a test says. */
function hall(build: (b: LevelBuilder) => void = () => {}, at: [number, number] = [10, 6], ht = 4): Sim {
  const b = new LevelBuilder('hall', 'Hall');
  b.room('Hall', 0, 0, 20, 12, { ht });
  build(b);
  b.start(at[0], at[1], -Math.PI / 2);
  const s = makeSim(b.finish());
  for (const m of s.cast) { m.stun = 1e9; m.hp = m.max = 1e4; }
  s.game.hp = 1e9;
  return s;
}
/** what a blow (or whatever the steps do) took from it */
const lost = (m: Mutant) => m.max - m.hp;
const AXE_REACH = 0.8 + 0.9;
/** look at the middle of it, as anyone swinging at it would */
function look(s: Sim, m: Mutant): void {
  const b = s.player.body, dx = m.x - b.x, dz = m.z - b.z, y = m.y + (m.body?.h ?? 1) / 2;
  s.player.yaw = Math.atan2(-dx, -dz);
  s.player.pitch = Math.atan2(y - (b.y + 1.62), Math.hypot(dx, dz));
}

describe('a blow lands by how fast you were closing', () => {
  it('run in and it lands harder; back off as you throw it and it lands softer', () => {
    const standing = (() => {
      const s = hall(b => b.mutant('husk', 11.6, 0, 6)), m = s.cast[0];
      give(s.game, 'axe');
      hold(s, STEP, { attack: true });
      hold(s, 2);
      return lost(m);
    })();
    const running = (() => {
      const s = hall(b => b.mutant('husk', 11.6, 0, 6), [3, 6]), m = s.cast[0];
      give(s.game, 'axe');
      for (let t = 0; t < 3 && lost(m) === 0; t += STEP) {
        const up = s.hands.full && m.dp < AXE_REACH + m.r - 0.1;
        step(s, { ...noInput(), forward: 1, run: true, attack: !up && !s.hands.swing });
      }
      return lost(m);
    })();
    const backing = (() => {
      const s = hall(b => b.mutant('husk', 10.75, 0, 6)), m = s.cast[0];
      give(s.game, 'axe');
      hold(s, 1.2, { attack: true });
      hold(s, 0.15, { attack: true, forward: -1 });
      hold(s, 1, { forward: -1 });
      return lost(m);
    })();
    expect(standing).toBeGreaterThan(0);
    expect(running).toBeGreaterThan(standing * 1.3);
    expect(backing).toBeGreaterThan(0);
    expect(backing).toBeLessThan(standing * 0.85);
  });

  it('one walking into your blow takes it harder than one stood still', () => {
    const blow = (awake: boolean) => {
      const s = hall(b => b.mutant('husk', awake ? 16 : 11.6, 0, 6)), m = s.cast[0];
      if (awake) { m.stun = 0; m.state = 'hunt'; }
      give(s.game, 'axe');
      for (let t = 0; t < 4 && lost(m) === 0; t += STEP) {
        const go = s.hands.full && m.dp < AXE_REACH + m.r + 0.4;
        step(s, { ...noInput(), attack: !go && !s.hands.swing });
      }
      return lost(m);
    };
    expect(blow(true)).toBeGreaterThan(blow(false) * 1.15);
  });

  it('it shoves by what the thing weighs: a worm thrown, a husk sent back, a thresher rocked, a bloat not moved', () => {
    const moved = (type: string) => {
      const s = hall(b => b.mutant(type, 11.6, 0, 6)), m = s.cast[0];
      give(s.game, 'axe');
      look(s, m);
      const x = m.x, z = m.z;
      hold(s, STEP, { attack: true });
      hold(s, 2);
      expect(lost(m)).toBeGreaterThan(0);
      return Math.hypot(m.x - x, m.z - z);
    };
    const worm = moved('worm'), husk = moved('husk'), thresher = moved('thresher'), bloat = moved('bloat');
    expect(worm).toBeGreaterThan(husk * 1.5);
    expect(husk).toBeGreaterThan(thresher * 2);
    expect(thresher).toBeGreaterThan(0.02);
    expect(bloat).toBe(0);
  });
});

describe('a blow that lands holds both still a moment (hit-stop)', () => {
  /** a husk 1.6 m off, struck with `weapon` stood still (a click), or run in at from 7 m off; stepped to the step it lands */
  function landing(weapon: string, run = false): Sim {
    const s = hall(b => b.mutant('husk', 11.6, 0, 6), run ? [3, 6] : undefined), m = s.cast[0];
    give(s.game, weapon);
    for (let t = 0; t < 4 && lost(m) === 0; t += STEP) {
      const up = s.hands.full && m.dp < AXE_REACH + m.r - 0.1;
      step(s, { ...noInput(), forward: run ? 1 : 0, run, attack: run ? !up && !s.hands.swing : t === 0 });
    }
    expect(lost(s.cast[0])).toBeGreaterThan(0);
    return s;
  }

  it('what it lands on stands where it was struck, the shove waiting, as long as your swing stops in it; then it goes', () => {
    const s = landing('axe'), m = s.cast[0], x = m.x, z = m.z;
    expect(m.stop).toBeCloseTo(s.hands.stop - STEP, 6);
    expect(Math.hypot(m.body!.vx, m.body!.vz)).toBeGreaterThan(2);
    let held = 0;
    while (m.stop > 0) { step(s, noInput()); held++; expect(Math.hypot(m.x - x, m.z - z)).toBe(0); }
    expect(held).toBeGreaterThanOrEqual(4);
    hold(s, 0.3);
    expect(Math.hypot(m.x - x, m.z - z)).toBeGreaterThan(0.15);
  });

  it('a heavier blow holds longer, and one run in longer again', () => {
    const baton = landing('baton').hands.stop, axe = landing('axe').hands.stop, run = landing('axe', true).hands.stop;
    expect(axe).toBeGreaterThan(baton * 1.3);
    expect(run).toBeGreaterThan(axe * 1.2);
  });

  it('a body it kills is held where it was struck, then goes loose the way it was knocked', () => {
    const s = hall(b => b.mutant('husk', 11.6, 0, 6)), m = s.cast[0];
    m.hp = 1;
    give(s.game, 'axe');
    for (let t = 0; t < 4 && !m.dead; t += STEP) step(s, { ...noInput(), attack: t === 0 });
    expect(m.rag).toBeTruthy();
    const at = [...m.rag!.p];
    while (m.stop > 0) { step(s, noInput()); expect(m.rag!.p).toEqual(at); }
    hold(s, 0.2);
    expect(Math.hypot(m.rag!.p[0] - at[0], m.rag!.p[2] - at[2])).toBeGreaterThan(0.1);
  });
});

describe('their blows on you', () => {
  /** a husk at you from the east, run to where its wind-up has stopped turning */
  function committed() {
    const s = hall(b => b.mutant('husk', 11.1, 0, 6)), m = s.cast[0];
    m.stun = 0; m.state = 'hunt';
    s.player.yaw = -Math.PI / 2;
    for (let t = 0; t < 1.5 && !(m.blow?.ph === 'wind' && m.blow.t > 0.55 * 0.75); t += STEP) step(s, noInput());
    expect(m.blow?.ph).toBe('wind');
    return { s, m };
  }

  it('a husk\'s blow shoves you back; run into it and it lands harder', () => {
    const still = committed(), hp = still.s.game.hp;
    let vx = 0;
    for (let t = 0; t < 0.4 && still.s.game.hp === hp; t += STEP) { step(still.s, noInput()); vx = still.s.player.body.vx; }
    const stood = hp - still.s.game.hp;
    expect(stood).toBeCloseTo(20, 6);
    expect(vx).toBeLessThan(-1); // west, away from it
    const into = committed(), hp2 = into.s.game.hp;
    for (let t = 0; t < 0.4 && into.s.game.hp === hp2; t += STEP) step(into.s, { ...noInput(), forward: 1, run: true });
    expect(hp2 - into.s.game.hp).toBeGreaterThan(stood + 0.5);
  });

  it('a thresher\'s charge into a wall hurts far more than one into open floor, and throws you off your feet', () => {
    const charge = (px: number) => {
      const s = hall(b => b.mutant('thresher', px - 2, 0, 6), [px, 6]), m = s.cast[0];
      m.stun = 0; m.state = 'charge'; m.st = 3; m.tgt = false; m.cdir = Math.PI / 2; // east, at you
      const hp = s.game.hp;
      let reeled = false;
      for (let t = 0; t < 1.5; t += STEP) { step(s, noInput()); reeled ||= s.hands.down > 0; }
      return { took: hp - s.game.hp, reeled };
    };
    const open = charge(8), wall = charge(19.1);
    expect(open.took).toBeGreaterThan(0);
    expect(wall.took).toBeGreaterThan(open.took + 15);
    expect(wall.reeled).toBe(true);
  });

  it('your own feet never slam you: sprint into a wall and it costs nothing', () => {
    const s = hall();
    const hp = s.game.hp;
    hold(s, 3, { forward: 1, run: true });
    expect(s.player.body.x).toBeCloseTo(20 - 0.32, 2);
    expect(s.game.hp).toBe(hp);
  });
});

describe('the cast thrown and fallen', () => {
  it('thrown into a wall, it takes a slam; the same throw on open floor does not hurt it', () => {
    const thrown = (x: number) => {
      const s = hall(b => b.mutant('husk', x, 0, 6), [4, 6]), m = s.cast[0];
      m.body!.vx = 8;
      hold(s, 1);
      return lost(m);
    };
    expect(thrown(19.5)).toBeGreaterThan(10);
    expect(thrown(12)).toBe(0);
  });

  it('knocked off a high ledge, it is hurt by the fall; off a low one, not', () => {
    const fell = (h: number) => {
      const s = hall(b => { b.block(12, 0, 0, 20, h, 12, 0x707070); b.mutant('husk', 12.4, h, 6); }, [4, 6], 10), m = s.cast[0];
      m.body!.vx = -7; // a hard shove west, off the edge
      hold(s, 3);
      expect(m.y).toBeCloseTo(0, 3);
      return lost(m);
    };
    expect(fell(6)).toBeGreaterThan(20);
    expect(fell(1)).toBe(0);
  });
});
