import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/content/build/builder';
import { STEP } from '../src/core/loop';
import { hitMutant, type Mutant } from '../src/sim/cast';
import { give } from '../src/sim/game';
import { noInput } from '../src/sim/input';
import { struck } from '../src/sim/combat';
import { DOWN, LAUNCH, MOVES, swingOf } from '../src/sim/moves';
import { makeSim, step, type Sim } from '../src/sim/sim';
import { hold } from './kit';

/* Knocked down and thrown (engine.md §6, knockdowns). A hall 20 by 12 m; you stand at (10, 6) facing east. What is put in
   it stands still (stunned) and cannot die of these unless a test says. */
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
const AXE = { dmg: 14 + 9 * 3.2, poise: swingOf('edge', 3.2).poise, shove: 70 * (3.2 + 1.5) };
const lost = (m: Mutant) => m.max - m.hp;

describe('the cast knocked down', () => {
  it('an axe blow run in floors a husk; the same blow stood still only staggers it', () => {
    const blow = (running: boolean) => {
      const s = hall(b => b.mutant('husk', 11, 0, 6)), m = s.cast[0];
      hitMutant(s, m, AXE, running ? 1.5 : 1);
      return { down: m.down > 0, reel: m.reel > 0 };
    };
    expect(blow(false)).toEqual({ down: false, reel: true });
    expect(blow(true)).toEqual({ down: true, reel: false });
  });

  it('down, it does nothing and takes a blow harder; then it gets up, and while it does it keeps its feet', () => {
    const s = hall(b => b.mutant('husk', 11, 0, 6)), m = s.cast[0];
    m.stun = 0; m.state = 'hunt';
    hitMutant(s, m, AXE, 1.5);
    expect(m.down).toBeGreaterThan(0);
    /* on the floor: a blow lands half again as hard */
    const before = lost(m);
    hitMutant(s, m, { dmg: 20, poise: 0 }, 1);
    expect(lost(m) - before).toBeCloseTo(30, 6);
    /* it lies there, and throws no blow, though you stand in reach */
    hold(s, DOWN.time - 0.1);
    expect(m.down).toBeGreaterThan(0);
    expect(m.blow).toBe(null);
    /* getting up: a pipe blow that would stagger it on its feet does not */
    hold(s, 0.15);
    expect(m.down).toBe(0);
    expect(m.rise).toBeGreaterThan(0);
    m.poise = m.pmax;
    hitMutant(s, m, { dmg: 1, poise: swingOf('blunt', 2.4).poise }, 1);
    expect(m.reel).toBe(0);
    expect(m.down).toBe(0);
    /* and on its feet again, the same blow does */
    hold(s, 3);
    m.poise = m.pmax; m.stun = 0;
    hitMutant(s, m, { dmg: 1, poise: swingOf('blunt', 2.4).poise }, 1);
    expect(m.reel).toBeGreaterThan(0);
  });

  it('a worm struck with the axe is thrown up off the floor, but a worm is never "down": it is on the floor already', () => {
    const s = hall(b => b.mutant('worm', 11, 0, 6)), m = s.cast[0];
    hitMutant(s, m, AXE, 1);
    let top = m.y;
    for (let t = 0; t < 1; t += STEP) { step(s, noInput()); top = Math.max(top, m.y); }
    expect(top).toBeGreaterThan(0.2);
    expect(m.down).toBe(0);
  });

  it('a husk knocked off a high ledge lands on its back', () => {
    const s = hall(b => { b.block(12, 0, 0, 20, 6, 12, 0x707070); b.mutant('husk', 12.4, 6, 6); }, [4, 6], 10), m = s.cast[0];
    m.body!.vx = -7;
    let down = false;
    for (let t = 0; t < 3; t += STEP) { step(s, noInput()); down ||= m.down > 0; }
    expect(down).toBe(true);
  });
});

describe('you knocked down', () => {
  /** a thresher faced at you from the east, its blow about to come down */
  function swipe() {
    const s = hall(b => b.mutant('thresher', 11.2, 0, 6)), m = s.cast[0];
    m.stun = 0; m.state = 'pursue'; m.st = 10; m.yaw = -Math.PI / 2;
    m.blow = { ph: 'wind', t: MOVES.thresher.wind - 0.02, hit: false };
    for (let t = 0; t < 0.4 && s.hands.down <= 0; t += STEP) step(s, noInput());
    m.stun = 1e9; // and it stands back
    return s;
  }

  it('a thresher\'s swipe puts you on the floor: you lie low, cannot move or start a blow, then get up', () => {
    const s = swipe();
    expect(s.hands.down).toBeGreaterThan(0);
    hold(s, 0.3); // the shove dies away
    expect(s.player.down).toBe(true);
    expect(s.player.body.h).toBeLessThan(1.2);
    const x = s.player.body.x;
    hold(s, 0.3, { forward: 1, attack: true });
    expect(Math.abs(s.player.body.x - x)).toBeLessThan(0.05);
    expect(s.hands.chg).toBe(-1);
    hold(s, 2);
    expect(s.hands.down).toBe(0);
    expect(s.hands.rise).toBe(0);
    expect(s.player.down).toBe(false);
    hold(s, 0.3, { attack: true });
    expect(s.hands.chg).toBeGreaterThan(0);
  });

  it('a thresher\'s charge throws you: up off your feet, and down where you land', () => {
    const s = hall(b => b.mutant('thresher', 8, 0, 6)), m = s.cast[0];
    m.stun = 0; m.state = 'charge'; m.st = 3; m.tgt = false; m.cdir = Math.PI / 2;
    let top = 0, down = false;
    for (let t = 0; t < 1; t += STEP) { step(s, noInput()); top = Math.max(top, s.player.body.y); down ||= s.hands.down > 0; }
    expect(top).toBeGreaterThan(0.2);
    expect(down).toBe(true);
  });

  it('a husk\'s blow on you while you are down lands half again as hard', () => {
    const blow = (down: boolean) => {
      const s = hall(b => b.mutant('husk', 11.1, 0, 6)), m = s.cast[0];
      m.stun = 0; m.state = 'hunt';
      const hp = s.game.hp;
      for (let t = 0; t < 2 && s.game.hp === hp; t += STEP) { if (down) s.hands.down = 5; step(s, noInput()); }
      return hp - s.game.hp;
    };
    expect(blow(false)).toBeCloseTo(20, 6);
    expect(blow(true)).toBeCloseTo(30, 6);
  });

  it('two husk blows still only stagger you: they do not shove hard enough to floor you', () => {
    const s = hall(b => b.mutant('husk', 11.1, 0, 6)), m = s.cast[0];
    m.stun = 0; m.state = 'hunt';
    let reeled = false, down = false;
    for (let t = 0; t < 4; t += STEP) { step(s, noInput()); reeled ||= s.hands.stag > 0; down ||= s.hands.down > 0; }
    expect(reeled).toBe(true);
    expect(down).toBe(false);
  });
});

describe('down, what was in your hands goes with your footing', () => {
  /** floored from the east, by a shove that floors and does not throw */
  const floor = (s: Sim) => struck(s, 100, { x: 11, z: 6 }, (DOWN.dv + LAUNCH.dv) / 2);

  it('a load held up is dropped: let go on the floor and nothing is thrown; held on through, it starts nothing once up', () => {
    const s = hall();
    give(s.game, 'axe');
    hold(s, 1.3, { attack: true });
    expect(s.hands.full).toBe(true);
    expect(floor(s)).toBe('down');
    expect(s.hands.chg).toBe(-1);
    hold(s, 0.3, { attack: true });
    hold(s, 0.1);
    expect(s.hands.swing).toBeNull();
    expect(s.hands.chg).toBe(-1);
    /* pressed again on the floor and held until you are up: still nothing, until let go and pressed again */
    hold(s, DOWN.time + DOWN.rise, { attack: true });
    expect(s.hands.down + s.hands.rise).toBe(0);
    hold(s, 0.2, { attack: true });
    expect(s.hands.chg).toBe(-1);
    hold(s, STEP);
    hold(s, 0.2, { attack: true });
    expect(s.hands.chg).toBeGreaterThan(0);
  });

  it('a blow thrown as you go down is lost: it lands on nothing', () => {
    const s = hall(b => b.mutant('husk', 11.6, 0, 6)), m = s.cast[0];
    give(s.game, 'axe');
    hold(s, 1.3, { attack: true });
    hold(s, STEP);
    expect(s.hands.swing).not.toBeNull();
    floor(s);
    expect(s.hands.swing).toBeNull();
    hold(s, 1);
    expect(lost(m)).toBe(0);
  });
});

it('on the floor you cannot start a blow', () => {
  const s = hall();
  give(s.game, 'pipe');
  s.hands.down = 0.5;
  hold(s, 0.2, { attack: true });
  expect(s.hands.chg).toBe(-1);
});
