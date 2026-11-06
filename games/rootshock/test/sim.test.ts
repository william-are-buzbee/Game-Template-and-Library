import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/content/build/builder';
import { noInput } from '../src/sim/input';
import { BUDGET } from '../src/sim/loose';
import { AIR } from '../src/sim/player';
import { makeSim, step, type Sim } from '../src/sim/sim';
import { hold } from './kit';

function level(build: (b: LevelBuilder) => void, start: [number, number, number] = [1, 1, -Math.PI / 2]): Sim {
  const b = new LevelBuilder('t', 'T');
  build(b);
  b.start(start[0], start[1], start[2]);
  return makeSim(b.finish());
}

describe('doors', () => {
  /* two rooms joined by a doorway at x 6..6.25, the door in it */
  const rooms = (b: LevelBuilder) => {
    b.room('A', 0, 0, 6, 2, { ht: 3, nolamp: true });
    b.room('Gap', 6, 0, 6.25, 2, { ht: 2.4, nolamp: true });
    b.room('B', 6.25, 0, 12, 2, { ht: 3, nolamp: true });
    b.door(6, 0, 6.25, 2, 2.4);
  };

  it('is shut with nobody near', () => {
    const s = level(rooms, [1, 1, -Math.PI / 2]);
    hold(s, 0.5);
    expect(s.doors[0].t).toBe(0);
  });

  it('opens as you come, lets you through, and shuts behind you', () => {
    const s = level(rooms, [1, 1, -Math.PI / 2]);
    hold(s, 4, { forward: 1 });
    expect(s.player.body.x).toBeGreaterThan(8);
    hold(s, 4);
    expect(s.doors[0].t).toBe(0);
  });

  it('will not close on you', () => {
    const s = level(rooms, [6.125, 1, -Math.PI / 2]);
    s.doors[0].t = 1;
    hold(s, 5);
    expect(s.doors[0].t).toBeGreaterThan(0.3);
  });
});

describe('platforms', () => {
  /* a hall, a 3 m shaft up to a gallery, a platform in the shaft */
  const lift = (b: LevelBuilder) => {
    b.room('Hall', 0, 0, 8, 4, { ht: 3, nolamp: true });
    b.room('Shaft', 8, 0, 10, 4, { ht: 6.5, nolamp: true });
    b.room('Gallery', 10, 0, 16, 4, { y0: 3, ht: 3, nolamp: true });
    b.platform(8, 0, 10, 4, 0.2, 3);
  };

  it('carries you up when you stand on it, and you can walk off at the top', () => {
    const s = level(lift, [9, 2, -Math.PI / 2]);
    hold(s, 0.5);
    expect(s.player.body.on).toBe(s.platforms[0].dyn);
    hold(s, 4);
    expect(s.platforms[0].y).toBeCloseTo(3);
    expect(s.player.body.y).toBeCloseTo(3);
    hold(s, 2, { forward: 1 });
    expect(s.player.body.x).toBeGreaterThan(11);
    expect(s.player.body.y).toBeCloseTo(3);
  });

  it('waits while you stay on it at the top; step off and on again and it brings you down', () => {
    const s = level(lift, [9, 2, -Math.PI / 2]);
    hold(s, 5);
    hold(s, 3);
    expect(s.platforms[0].y).toBeCloseTo(3);
    hold(s, 1, { forward: 1 });
    expect(s.player.body.on).toBe(null);
    hold(s, 1, { forward: -1 });
    hold(s, 4);
    expect(s.platforms[0].y).toBeCloseTo(0.2);
    expect(s.player.body.y).toBeCloseTo(0.2);
  });
});

describe('water', () => {
  /* a pool 3 m deep, its surface 0.3 m below the floor around it */
  const pool = (b: LevelBuilder) => {
    b.room('Hall', 0, 0, 12, 4, { ht: 3, nolamp: true });
    b.room('Pool', 4, 0, 8, 4, { y0: -3, ht: 3, nolamp: true });
    b.water(4, 0, 8, 4, -0.3);
  };

  it('you fall in, float at the surface, and climb out the far side', () => {
    const s = level(pool, [3, 2, -Math.PI / 2]);
    hold(s, 1, { forward: 1 });
    hold(s, 2);
    expect(s.player.water).toBe('swimming');
    expect(s.player.under).toBe(false);
    hold(s, 4, { forward: 1 });
    expect(s.player.body.x).toBeGreaterThan(8.5);
    expect(s.player.body.y).toBeCloseTo(0);
    expect(s.player.water).toBe('dry');
  });

  it('you can dive, and your breath runs down while you are under', () => {
    const s = level(pool, [6, 2, -Math.PI / 2]);
    hold(s, 2);
    hold(s, 3, { sink: true });
    expect(s.player.under).toBe(true);
    expect(s.player.air).toBeLessThan(AIR - 1);
    hold(s, 3, { rise: true });
    hold(s, 1);
    expect(s.player.under).toBe(false);
    expect(s.player.air).toBe(AIR);
  });
});

describe('loose crates', () => {
  const room = (b: LevelBuilder) => b.room('Hall', 0, 0, 20, 4, { ht: 4, nolamp: true });

  it('sleep until touched; you push one along by walking into it, and it settles', () => {
    const s = level(b => { room(b); b.box(5, 2, 1, 1, 1, 0x806040, { loose: true }); }, [1, 2, -Math.PI / 2]);
    const c = s.loose.all[0];
    hold(s, 0.5);
    expect(c.awake).toBe(false);
    hold(s, 3, { forward: 1 });
    expect(c.x).toBeGreaterThan(7);
    expect(s.player.body.x).toBeLessThan(c.x - 0.5);
    hold(s, 2);
    expect(c.awake).toBe(false);
    expect(c.y).toBeCloseTo(0);
  });

  it('a crate pushed off a stack falls and lands', () => {
    const s = level(b => {
      room(b);
      b.box(6, 2, 1, 1, 1, 0x806040, { loose: true, solid: true });
      b.box(6, 2, 0.8, 0.8, 0.8, 0x806040, { y: 1, loose: true, solid: true });
      b.collider(6, 2, 0.4, 3, 0.4, 2.2); // nothing in the way, just checking the stack below is honoured
    }, [1, 2, -Math.PI / 2]);
    const [lower, upper] = s.loose.all;
    expect(upper.on).toBe(lower.dyn);
    upper.vx = 8; s.loose.wake(upper, 0); // a kick
    hold(s, 2);
    expect(upper.y).toBeCloseTo(0);
    expect(upper.x).toBeGreaterThan(6.9);
  });

  it('stays within the budget of awake crates', () => {
    const s = level(b => {
      b.room('Big', 0, 0, 40, 40, { ht: 4, nolamp: true });
      for (let k = 0; k < 40; k++) b.box(2 + (k % 8) * 4, 2 + Math.floor(k / 8) * 4, 1, 1, 1, 0x806040, { loose: true });
    });
    for (const c of s.loose.all) { c.vx = 3; s.loose.wake(c, s.tick); }
    expect(s.loose.awakeCount()).toBeLessThanOrEqual(BUDGET);
  });

  it('costs little: a pile of crates tumbling, timed', () => {
    const s = level(b => {
      b.room('Big', 0, 0, 30, 30, { ht: 8, nolamp: true });
      for (let k = 0; k < 48; k++) b.box(10 + (k % 4) * 1.1, 10 + (Math.floor(k / 4) % 4) * 1.1, 1, 1, 1, 0x806040, { y: Math.floor(k / 16) * 1.05, loose: true });
    });
    for (const c of s.loose.all) { c.vx = (c.x - 11.6) * 2; c.vz = (c.z - 11.6) * 2; s.loose.wake(c, s.tick); }
    /* the first second, while the pile is still moving */
    const t0 = performance.now(), n = 60;
    let awake = 0;
    for (let k = 0; k < n; k++) { step(s, noInput()); awake += s.loose.awakeCount(); }
    const ms = (performance.now() - t0) / n;
    console.log(`crates: ${ms.toFixed(3)} ms per step, ${s.loose.all.length} crates, ${(awake / n).toFixed(1)} awake on average`);
    expect(ms).toBeLessThan(4); // a 60 Hz frame is 16.7 ms; this leaves the rest of the game most of it
  });
});

describe('ids', () => {
  it('the same level gives the same ids every time it is loaded', () => {
    const ids = () => {
      const b = new LevelBuilder('t', 'T');
      b.room('A', 0, 0, 20, 8, { ht: 4, nolamp: true });
      b.box(5, 2, 1, 1, 1, 0x806040, { loose: true });
      b.door(10, 0, 10.25, 2);
      b.platform(14, 0, 16, 2, 0.2, 2);
      b.start(1, 1, 0);
      const s = makeSim(b.finish());
      return s.world.dyn.map(d => `${d.kind}:${d.id}`);
    };
    const first = ids();
    expect(ids()).toEqual(first);
    expect(new Set(first).size).toBe(first.length);
  });
});

describe('carrying', () => {
  it('a crate riding on another is left behind rather than dragged into a wall', () => {
    const s = level(b => {
      b.room('Hall', 0, 0, 20, 4, { ht: 4, nolamp: true });
      b.block(8, 1.1, 0, 9, 4, 4, 0x808080); // a beam the lower crate fits under and the upper one does not
      b.box(6, 2, 1, 1, 1, 0x806040, { loose: true });
      b.box(6, 2, 0.8, 0.6, 0.8, 0x806040, { y: 1, loose: true });
    }, [1, 2, 0]);
    const [lower, upper] = s.loose.all;
    expect(upper.on).toBe(lower.dyn);
    lower.vx = 20; s.loose.wake(lower, 0); // a hard shove: it slides about 3 m
    for (let k = 0; k < 180; k++) {
      step(s, noInput());
      expect(s.world.overlap({ x: upper.x, z: upper.z, hx: upper.hx - 0.01, hz: upper.hz - 0.01, round: false }, upper.y + 0.01, upper.y + upper.h, upper.dyn)).toBe(null);
    }
    expect(lower.x).toBeGreaterThan(8); // under the beam
    expect(upper.x).toBeLessThan(8);
  });
});

describe('push-out', () => {
  it('a body left inside a wall is nudged out next step', () => {
    const s = level(b => b.room('A', 0, 0, 6, 4, { ht: 3, nolamp: true }), [1, 2, 0]);
    s.player.body.x = 0.15;
    step(s, noInput());
    expect(s.player.body.x).toBeGreaterThanOrEqual(0.32 - 1e-6);
  });
});
