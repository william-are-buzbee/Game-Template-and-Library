import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/content/build/builder';
import { STATION } from '../src/content/station';
import { STEP } from '../src/core/loop';
import { blowKind, hitMutant, MT, type Mutant } from '../src/sim/cast';
import { RUSH, TEMPER } from '../src/sim/cast/husk';
import { noInput } from '../src/sim/input';
import { doorAct } from '../src/sim/interact';
import { levelDef } from '../src/sim/run';
import { makeSim, step, type Sim } from '../src/sim/sim';
import { circle } from '../src/world/shapes';
import { fresh, hold } from './kit';

/* Pia's lines that walk as husks (world.md §10, Temper): Security's changed, the bush's children, fear held down by the
   opiate; and the bone mother's young, the Commons' husks, fear with nothing holding it. One body and one behaviour,
   two tempers (cast/husk.ts, TEMPER). */

/** a hall 20 by 12 m, 4 m high, and off its east end a lane 10 m long; you flown high out of it, unless `here` */
function hall(build: (b: LevelBuilder) => void, here = false): Sim {
  const b = new LevelBuilder('hall', 'Hall');
  b.room('Hall', 0, 0, 20, 12, { ht: 4 });
  b.room('Lane', 20, 1, 30, 3, { ht: 4 });
  build(b);
  b.start(5, 6, -Math.PI / 2);
  const s = makeSim(b.finish());
  s.game.hp = 1e9;
  if (!here) { s.player.fly = true; s.player.body.y += 200; }
  return s;
}
const from = (m: Mutant, x: number, z: number) => Math.hypot(m.x - x, m.z - z);

describe('two lines, one body', () => {
  it('Security\'s staff are the changed, the bush\'s; the husks elsewhere the bone mother\'s', () => {
    const s = fresh();
    const changed = s.cast.filter(m => m.type === 'changed' || m.type === 'nightround');
    expect(changed.length).toBe(7); // Security's seven
    expect(changed.every(m => m.line === 'bush' && m.cards)).toBe(true);
    expect(s.cast.filter(m => m.type === 'husk').every(m => m.line === 'bone' && !m.cards)).toBe(true); // Cargo's
    expect(MT.thresher.line).toBe('bone'); // the bone line's middle years
  });

  it('the bone line ignores its own pain: badly hurt, one of the changed runs, a husk comes on', () => {
    const s = hall(b => { b.mutant('changed', 12, 0, 3); b.mutant('husk', 12, 0, 9); }, true), [c, h] = s.cast;
    for (const m of [c, h]) { m.state = 'hunt'; m.lost = 0; m.hp = m.max * 0.2; }
    hold(s, 0.2);
    expect(c.state).toBe('flee');
    expect(h.state).toBe('hunt');
    expect(h.fled).toBe(false);
  });

  it('at its post, one of the changed stands, taking root; a husk is never still, shifting about it', () => {
    const s = hall(b => { b.mutant('changed', 8, 0, 3, { post: 1 }); b.mutant('husk', 8, 0, 9, { post: 1 }); }), [c, h] = s.cast;
    let shifted = 0, strayed = 0;
    for (let t = 0; t < 20; t += 0.5) { hold(s, 0.5); shifted = Math.max(shifted, from(h, 8, 9)); strayed = Math.max(strayed, from(c, 8, 3)); }
    expect(strayed).toBeLessThan(0.05);
    expect(shifted).toBeGreaterThan(0.3);
    expect(shifted).toBeLessThan(TEMPER.bone.fidget * Math.SQRT2 + 0.5);
  });

  it('it rests less between rounds than the changed do', () => {
    expect(TEMPER.bone.rest[1]).toBeLessThan(TEMPER.bush.rest[0]);
  });

  it('one that turns on you sets off the rest of its line in earshot, not further, and not the changed', () => {
    const s = hall(b => {
      b.mutant('husk', 4, 0, 6); b.mutant('husk', 14, 0, 6); // ten metres off: in earshot
      b.mutant('husk', 28, 0, 2); // down the lane, well out of it
      b.mutant('changed', 8, 0, 9); // in earshot, but another line
    });
    hold(s, 0.2);
    const [a, b, far, c] = s.cast;
    expect(s.cast.every(m => m.state === 'idle')).toBe(true);
    hitMutant(s, a, { dmg: 1, poise: 0 });
    expect(a.state).toBe('hunt');
    expect(b.state).toBe('hunt');
    expect(far.state).toBe('idle');
    expect(c.state).toBe('idle');
    expect(s.game.events.filter(e => e.type === 'sfx' && e.name === 'moan').length).toBeGreaterThanOrEqual(1); // heard
  });
});

describe('the bone line, middle years', () => {
  it('stand where they are put: most in the Commons, a few on the plant, one in Cargo by the young one', () => {
    for (const [id, n] of [['main', 5], ['plant', 3], ['upper', 1]] as const) {
      const s = makeSim(levelDef(STATION, id), { seed: 7, station: STATION }), nav = s.fields!.nav;
      const mid = s.cast.filter(m => m.type === 'bonemid');
      expect(mid.length, id).toBe(n);
      for (const m of mid) {
        expect(nav.locate(m.x, m.y, m.z), `${id} ${m.x},${m.z}`).toBeGreaterThanOrEqual(0);
        expect(s.world.overlap(circle(m.x, m.z, m.body!.r), m.y + 0.02, m.y + m.body!.h, m.body!.skip), `${id} ${m.x},${m.z}`).toBe(null);
      }
      if (id === 'upper') expect(mid.every(m => s.world.roomAt(m.x, m.y + 0.5, m.z)?.name === 'Cargo cavern')).toBe(true);
    }
  });

  it('are husks grown: a husk\'s wits and doors, a harder blow from further, and they run sooner', () => {
    const s = hall(b => { b.mutant('bonemid', 12, 0, 3); b.mutant('husk', 12, 0, 6); b.mutant('changed', 12, 0, 9); }, true), [m, h, c] = s.cast;
    expect(m.ai).toBe('husk');
    expect(m.opens && m.walker === 'hands').toBe(true);
    expect(blowKind(m)!.dmg).toBeGreaterThan(blowKind(h)!.dmg);
    expect(blowKind(m)!.reach).toBeGreaterThan(blowKind(h)!.reach);
    for (const q of [m, h, c]) { q.state = 'hunt'; q.lost = 0; q.hp = q.max * 0.5; }
    hold(s, 0.2);
    expect(m.state).toBe('flee'); // half its health gone: away
    expect(h.state).toBe('hunt'); // its young never
    expect(c.state).toBe('hunt'); // the changed not yet
  });

  it('now and then it charges: never at once, not every time it could, and it braces first, heard', () => {
    const s = hall(b => b.mutant('bonemid', 4, 0, 6, { yaw: -Math.PI / 2 }), true), m = s.cast[0], b = s.player.body, R = RUSH.bonemid;
    m.state = 'hunt'; m.lost = 0; m.ct = R.every[0]; m.hp = m.max = 1e9;
    let first = -1, braces = 0, was = '';
    for (let t = 0; t < 60; t += STEP) {
      /* you, always six metres ahead of it along the hall, turning back at its ends: in its sight, out of its reach */
      const dir = m.x < 10 ? 1 : -1;
      b.x = m.x + dir * 6; b.z = m.z; b.vx = b.vz = 0; b.sync();
      s.game.events.length = 0;
      step(s, noInput());
      if (m.state === 'brace' && was !== 'brace') {
        braces++;
        if (first < 0) first = t;
        expect(s.game.events.some(e => e.type === 'sfx' && e.name === 'growl')).toBe(true);
      }
      was = m.state;
    }
    expect(first).toBeGreaterThanOrEqual(R.every[0] - 0.1);
    expect(braces).toBeGreaterThanOrEqual(2);
    expect(braces).toBeLessThan(60 / R.every[0]);
  });

  it('its charge, landed, hurts and throws you along it; smaller than the thresher\'s', () => {
    const s = hall(b => b.mutant('bonemid', 11, 0, 6, { yaw: -Math.PI / 2 }), true), m = s.cast[0], hp = s.game.hp;
    m.state = 'brace'; m.st = RUSH.bonemid.wind;
    let fastest = 0;
    for (let t = 0; t < 2.5; t += STEP) { step(s, noInput()); fastest = Math.max(fastest, -s.player.body.vx); }
    expect(s.game.hp).toBeLessThan(hp);
    expect(fastest).toBeGreaterThan(3); // thrown back, west, along its charge
    expect(RUSH.bonemid.throws).toBeLessThan(9); // the thresher throws you 9 m/s
  });

  it('Cargo\'s door slid open by hand is heard down the bay: the young one and the one beside it come to it, not those deeper in', () => {
    const s = fresh(), d = s.doors.find(q => q.def.x0 > 107 && q.def.x1 < 111 && q.def.z1 < 1)!;
    s.player.fly = true; s.player.body.y += 200;
    const near = s.cast.filter(m => (m.type === 'bonemid' || (m.type === 'husk' && Math.abs(m.x - 150) < 1)));
    const deep = s.cast.find(m => m.type === 'husk' && Math.abs(m.x - 182) < 1)!;
    expect(near.length).toBe(2);
    hold(s, 1); // as it is when you could get there: each of them where it stands
    doorAct(s, d); d.hold = 1e9;
    hold(s, 55);
    for (const m of near) expect(Math.hypot(m.x - 109, m.z + 1), `${m.type} at ${m.x.toFixed(1)}`).toBeLessThan(8);
    expect(Math.hypot(deep.x - 182, deep.z - 0.8)).toBeLessThan(0.5);
  });
});

describe('the bush\'s line, old in it', () => {
  it('stands rooted by the Commons\' planter, the bush\'s, drawn as itself', () => {
    const s = makeSim(levelDef(STATION, 'main'), { seed: 7, station: STATION }), p = s.cast.filter(m => m.type === 'plantold');
    expect(p.length).toBe(1);
    const [m] = p;
    expect(m.line).toBe('bush');
    expect(m.post).toBe(true);
    expect(s.world.roomAt(m.x, m.y + 0.5, m.z)?.name).toBe('The Commons');
    expect(s.world.overlap(circle(m.x, m.z, m.body!.r), m.y + 0.02, m.y + m.body!.h, m.body!.skip)).toBe(null);
    const x = m.x, z = m.z;
    s.player.fly = true; s.player.body.y += 200;
    hold(s, 20);
    expect(Math.hypot(m.x - x, m.z - z)).toBeLessThan(0.05); // taking root: it does not shift about its post
  });

  it('barely walks, and after you, slowly; it does not run however hurt', () => {
    const s = hall(b => { b.mutant('plantold', 14, 0, 6); b.mutant('changed', 14, 0, 9); }, true), [m, c] = s.cast;
    expect(m.gait.pace.walk).toBeCloseTo(0.33, 2);
    expect(m.gait.pace.hunt).toBeLessThan(c.gait.pace.hunt / 3);
    m.state = 'hunt'; m.lost = 0;
    hold(s, 3);
    expect(Math.hypot(m.body!.vx, m.body!.vz)).toBeCloseTo(m.gait.pace.hunt, 1);
    m.hp = m.max * 0.1;
    hold(s, 0.5);
    expect(m.state).toBe('hunt');
  });
});
