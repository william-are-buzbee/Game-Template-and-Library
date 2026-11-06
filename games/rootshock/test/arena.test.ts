import { describe, expect, it } from 'vitest';
import { testbed } from '../src/content/levels/testbed';
import { hitMutant, killAll, spawn } from '../src/sim/cast';
import { makeSim, type Sim } from '../src/sim/sim';
import { field, openRules } from '../src/world/nav';
import { hold } from './kit';

/* The arena in the test bed, and the tools for working on the fight (engine.md §6, F4). */
const arena = (): Sim => {
  const s = makeSim(testbed(), { seed: 3 });
  const b = s.player.body;
  b.x = 8; b.z = -8; b.y = 0; b.sync(); s.player.yaw = 0; // in the middle of the arena, facing north
  return s;
};

describe('the arena', () => {
  it('is reached on foot from the test bed\'s start, and so are its corridor, its low bay and the top of its ledge', () => {
    const s = makeSim(testbed(), { seed: 3 }), b = s.player.body;
    spawn(s, 'husk', 8, 0, -8); // the ways about the level are worked out with the first of the cast
    const nav = s.fields!.nav, d = field(nav, nav.locate(b.x, b.y, b.z), openRules(nav));
    const at = (x: number, y: number, z: number) => d[nav.locate(x, y, z)];
    for (const [x, y, z] of [[8, 0, -8], [24, 0, -10.2], [-5, 0, -10], [15, 3, -15.5]]) expect(at(x, y, z), `${x},${z}`).toBeLessThan(Infinity);
    for (const name of ['Arena', 'Arena corridor', 'Low bay']) expect(s.world.rooms.some(r => r.name === name)).toBe(true);
  });

  it('has the weapons laid out on a table by the gate', () => {
    const s = makeSim(testbed(), { seed: 3 });
    const here = s.items.filter(it => it.z < -2 && it.z > -4).map(it => it.id).sort();
    expect(here).toEqual(['axe', 'baton', 'knife', 'pipe', 'wrench']);
  });
});

describe('the cast put down by hand', () => {
  it('a husk put down is awake, faces you, and comes for you', () => {
    const s = arena(), m = spawn(s, 'husk', 8, 0, -13)!;
    expect(m.state).toBe('hunt');
    expect(Math.abs(m.yaw - Math.atan2(0, 5))).toBeLessThan(1e-6); // faced south, at you
    s.game.hp = 1e9;
    const d0 = m.dp || 5;
    hold(s, 1.5);
    expect(m.dp).toBeLessThan(d0 - 1);
  });

  it('each kind can be put down, and all of them cleared at once', () => {
    const s = arena();
    for (const t of ['husk', 'skitter', 'thresher', 'worm']) expect(spawn(s, t, 8, 0, -13)).not.toBe(null);
    expect(spawn(s, 'nothing', 8, 0, -13)).toBe(null);
    killAll(s);
    expect(s.cast.every(m => m.dead)).toBe(true);
  });
});

it('every blow is written in the hit log: what struck what, how hard, and what came of it', () => {
  const s = arena(), m = spawn(s, 'husk', 8, 0, -9.5)!;
  s.game.events.length = 0;
  hitMutant(s, m, { dmg: 43, poise: 29, shove: 330, by: 'axe' }, 1.5);
  const lines = s.game.events.filter(e => e.type === 'log').map(e => (e as { text: string }).text);
  expect(lines.length).toBe(1);
  expect(lines[0]).toMatch(/^axe → husk {2}65 dmg {2}×1\.50 {2}shove 6\.2 m\/s {2}→ down/);
});
