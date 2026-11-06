import { describe, expect, it } from 'vitest';
import { STATION } from '../src/content/station';
import { testbed } from '../src/content/levels/testbed';
import { makeSim, step, type Sim } from '../src/sim/sim';
import { noInput, type Input } from '../src/sim/input';
import { load, save } from '../src/sim/save';
import { give } from '../src/sim/game';
import { upper } from './kit';

/* A save is everything that can change; loaded, a run plays on exactly as it would have. */

const level = upper();
const opts = { seed: 5, station: STATION };
/** a walk about the place that does a bit of everything: turning, running, crouching, the light, swinging */
const script = (k: number): Input => ({
  ...noInput(), forward: k % 400 < 300 ? 1 : -1, strafe: k % 700 < 100 ? 1 : 0, run: k % 500 < 200, yaw: k % 240 < 60 ? 0.03 : -0.004,
  crouch: k % 900 === 0, light: k % 1300 === 5, attack: k % 120 < 70, jump: k % 333 === 0,
});
/** everything that can be compared, as text */
const state = (s: Sim) => JSON.stringify({ ...save(s), fields: null });

describe('save and load', () => {
  it('a loaded run plays on exactly as the original does', () => {
    const a = makeSim(level, opts);
    give(a.game, 'flash'); give(a.game, 'pipe');
    a.game.hp = 1e6; // live long enough to be compared
    a.game.station!.circuits.CARGO.back = true;
    for (let k = 0; k < 1500; k++) step(a, script(k));
    const data = JSON.parse(JSON.stringify(save(a))); // through text, as it would be stored
    const b = load(level, data, opts);
    expect(state(b)).toBe(state(a));
    for (let k = 1500; k < 2700; k++) { step(a, script(k)); step(b, script(k)); }
    expect(state(b)).toBe(state(a));
    expect(a.cast.some(m => m.state !== 'idle' || Math.hypot(m.x - m.hx, m.z - m.hz) > 1)).toBe(true); // they did something
  }, 30_000); // about 9 s on CI, near half of it the upper station's light made the first time: over the usual limit by a little noise

  it('keeps what was taken, searched, unlocked and switched', () => {
    const a = makeSim(level, opts);
    const body = a.usables.find(u => /^Officer$/.test(u.label() ?? ''))!;
    body.act();
    const item = a.usables.find(u => /^Flashlight$/.test(u.label() ?? ''))!;
    item.act();
    a.doors[14].unlocked = true;
    a.game.station!.circuits.CARGO.back = true;
    const b = load(level, JSON.parse(JSON.stringify(save(a))), opts);
    expect(b.game.keys).toContain('s');
    expect(b.game.tools).toContain('flash');
    expect(b.usables.some(u => /^Officer$/.test(u.label() ?? '') && !u.off)).toBe(false);
    expect(b.usables.some(u => /^Flashlight$/.test(u.label() ?? ''))).toBe(false);
    expect(b.doors[14].unlocked).toBe(true);
    expect(b.game.station!.circuits.CARGO.back).toBe(true);
    expect(b.game.notes.memo).toBeTruthy();
  });

  /* A save names what it keeps of each thing (sim/save.ts), so a field added to one of them and not to its list would
     quietly not be saved. Every field of what is saved is in its save, or named here as made again, and why. */
  it('keeps every field of what it saves, but those made again', () => {
    const NOT_SAVED: Record<string, string[]> = {
      game: [
        'events', 'commands', // said and done within the step
        'travel', // taken up by the run in the step that sets it
        'notes', // made again from the codes
      ],
      player: [
        'body', // saved apart
        'thrown', 'pace', 'feet', 'planted', 'down', // worked out again each step, before they are asked
      ],
      body: [
        'mass', 'r', 'climb', // what it is (your mass with what you hold, each step)
        'carried', // worked out again each step
        'on', // saved apart, by id (Save.on)
        'dyn', 'skip', 'sync', 'clear', // made with it
      ],
      door: ['def', 'dyn'],
      platform: ['def', 'dyn'],
      loose: [
        'prop', 'hx', 'hz', 'h', // what it is, from the level
        'on', // saved apart, by id (Save.on)
        'dyn', 'sync', 'clear', // made with it
      ],
      mutant: [
        /* what it is, from the level and its kind */
        'id', 'type', 'ai', 'model', 'green', 'max', 'mass', 'r', 'pmax', 'gait', 'eye', 'line', 'walker', 'opens', 'low', 'noDoors', 'fixed',
        'swim', 'solid', 'sit', 'holt', 'big', 'hx', 'hz', 'room', 'cards', 'round', 'hide', 'wear',
        'F', // its route, made again on load (restoreRoute)
        'd', 'dp', 'dy', 'drove', // worked out again each step
      ],
    };
    const a = makeSim(level, opts), b = makeSim(testbed(), { seed: 5 });
    for (let k = 0; k < 60; k++) { step(a, noInput()); step(b, noInput()); }
    const sa = save(a), sb = save(b);
    const keys = (os: object[]) => [...new Set(os.flatMap(o => Object.keys(o)))];
    const check = (what: string, live: object[], saved: object[]) => {
      expect(live.length, what).toBeGreaterThan(0);
      const kept = new Set(keys(saved)), here = keys(live), made = NOT_SAVED[what];
      expect(here.filter(k => !kept.has(k) && !made.includes(k)), `${what}: name it in its list in sim/save.ts, or here`).toEqual([]);
      /* and the list here stays true: nothing on it that is saved, or that is not there at all */
      expect(made.filter(k => kept.has(k) || !here.includes(k)), `${what}: no longer true here`).toEqual([]);
    };
    const bodies = (s: Sim) => [s.player.body, ...s.cast.flatMap(m => (m.body ? [m.body] : []))];
    check('game', [a.game], [sa.game]);
    check('player', [a.player], [sa.player]);
    check('body', bodies(a), [sa.body, ...sa.cast.flatMap(m => (m.body ? [m.body as object] : []))]);
    check('door', a.doors, sa.doors);
    check('platform', a.platforms, sa.platforms);
    check('loose', b.loose.all, sb.loose);
    check('mutant', a.cast, sa.cast);
  });

  it('refuses a save of another level or another version', () => {
    const data = save(makeSim(level, opts));
    expect(() => load(level, { ...data, v: 99 }, opts)).toThrow(/version/);
    expect(() => load(level, { ...data, level: 'main' }, opts)).toThrow(/main/);
  });
});
