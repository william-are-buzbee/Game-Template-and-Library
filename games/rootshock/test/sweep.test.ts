import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/content/build/builder';
import { STEP } from '../src/core/loop';
import type { Mutant } from '../src/sim/cast';
import { give } from '../src/sim/game';
import { noInput, type Input } from '../src/sim/input';
import { wayOf, wstats } from '../src/sim/combat';
import { MOVES, POISE } from '../src/sim/moves';
import { makeSim, step, type Sim } from '../src/sim/sim';
import { hold } from './kit';

/* Blows traced through the world (engine.md §6, F3b). You stand at x 10, in the middle of a room's width, facing east;
   your right is south (+z). The pipe and the baton swing side to side, right to left, and the axe chops straight down,
   unless sent another way by the keys held as you press (which way it goes, below). */
function room(w: number, ht: number, build: (b: LevelBuilder, z: number) => void = () => {}): Sim {
  const b = new LevelBuilder('room', 'Room');
  b.room('Room', 0, 0, 20, w, { ht });
  build(b, w / 2);
  b.start(10, w / 2, -Math.PI / 2);
  const s = makeSim(b.finish());
  for (const m of s.cast) { m.stun = 1e9; m.hp = m.max = 1e4; }
  s.game.hp = 1e9;
  return s;
}
const heard = (s: Sim, name: string) => s.game.events.some(e => e.type === 'sfx' && e.name === name);
/** a click (with `keys` held as you press: which way it goes), and what came of it: whether it glanced, whether you
 *  reeled */
function swing(s: Sim, id: string, keys: Partial<Input> = {}) {
  give(s.game, id);
  s.game.events.length = 0;
  let reeled = false;
  hold(s, STEP, { ...keys, attack: true });
  for (let t = 0; t < 2; t += STEP) { step(s, noInput()); reeled ||= s.hands.stag > 0; }
  return { glanced: heard(s, 'blow'), reeled };
}

describe('a swing meets the world', () => {
  it('a side swing in a narrow corridor glances off its wall and knocks the wind out of you; in the open, nothing', () => {
    expect(swing(room(1.6, 4), 'pipe')).toEqual({ glanced: true, reeled: true });
    expect(swing(room(12, 4), 'pipe')).toEqual({ glanced: false, reeled: false });
  });

  it('the baton glances there too, but it is too light to knock the wind out of you', () => {
    expect(swing(room(1.6, 4), 'baton')).toEqual({ glanced: true, reeled: false });
  });

  it('the axe\'s chop catches a low ceiling the pipe\'s side swing passes under', () => {
    expect(swing(room(12, 2.2), 'axe').glanced).toBe(true);
    expect(swing(room(12, 2.2), 'pipe').glanced).toBe(false);
    expect(swing(room(12, 4), 'axe').glanced).toBe(false);
  });

  it('a glance comes back on your poise even when it does not knock the wind out of you', () => {
    const s = room(1.6, 4);
    swing(s, 'baton');
    expect(s.hands.poise).toBeLessThan(POISE.you);
  });

  it('a wall between you and it: the blow glances off the wall, and what is behind it is untouched', () => {
    const s = room(12, 4, (b, z) => { b.block(10.75, 0, 0, 11, 4, 12, 0x707070); b.mutant('worm', 11.5, 0, z); }); // the wall on the 0.25 m grid
    const m = s.cast[0];
    s.player.pitch = -0.6;
    expect(swing(s, 'pipe').glanced).toBe(true);
    expect(m.hp).toBe(m.max);
  });
});

describe('a swing meets the cast', () => {
  it('a blow stops in what it hits: the swing is over there, and goes on through nothing behind it', () => {
    const s = room(12, 4, (b, z) => { b.mutant('worm', 11.0, 0, z + 0.45); b.mutant('worm', 11.4, 0, z - 0.45); });
    const [right, left] = s.cast;
    give(s.game, 'pipe');
    s.player.pitch = -0.7;
    hold(s, STEP, { attack: true });
    let struck: number | undefined;
    for (let t = 0; t < 2; t += STEP) { step(s, noInput()); struck ??= s.hands.swing?.struck; }
    expect(struck).toBeGreaterThan(0);
    expect(right.hp).toBeLessThan(right.max);
    expect(left.hp).toBe(left.max);
  });

  it('a side swing sends what it hits off to your left, the way the swing was going', () => {
    const s = room(12, 4, (b, z) => b.mutant('worm', 11.3, 0, z));
    const m = s.cast[0], x = m.x, z = m.z;
    s.player.pitch = -0.7; // looking down at it
    swing(s, 'pipe');
    expect(m.hp).toBeLessThan(m.max);
    expect(m.x - x).toBeGreaterThan(0.1);
    expect(m.z - z).toBeLessThan(-0.1); // north: your left
  });

  it('the axe\'s chop shoves what it lands on straight along your line, low as well as high', () => {
    /* below your eye the chop's head is coming back toward you as it lands; the shove went whichever way was left */
    for (const [kind, x] of [['skitter', 11.5], ['worm', 11.3], ['husk', 11.6]] as const) {
      const s = room(12, 4, (b, z) => b.mutant(kind, x, 0, z));
      const m = s.cast[0];
      s.player.pitch = Math.atan2(m.body!.h * 0.5 - 1.6, x - 10);
      give(s.game, 'axe');
      hold(s, STEP, { attack: true });
      let v: { x: number; z: number } | null = null;
      for (let t = 0; t < 2; t += STEP) { step(s, noInput()); if (!v && m.hp < m.max) v = { x: m.body!.vx, z: m.body!.vz }; }
      expect(v, kind).not.toBe(null);
      expect(v!.x, kind).toBeGreaterThan(0);
      expect(Math.abs(v!.z), kind).toBeLessThan(0.15 * v!.x);
    }
  });

  it('a grabber is struck anywhere it hangs: a side swing through its tentacles lands, and so does a shot at them', () => {
    const s = room(12, 4, (b, z) => b.mutant('grabber', 11.3, 0, z));
    const m = s.cast[0];
    s.player.pitch = Math.atan2(1 - 1.6, 1.3); // at its tentacles, a metre up
    swing(s, 'pipe');
    expect(m.hp).toBeLessThan(m.max);
    const hp = m.hp;
    give(s.game, 'pistol'); give(s.game, 'ammo9'); s.game.weapon = 'pistol';
    hold(s, STEP, { attack: true });
    hold(s, 0.2);
    expect(m.hp).toBeLessThan(hp);
  });

  it('a thresher\'s wide blow in a corridor glances off its walls and leaves it reeling and open; in the open it lands', () => {
    const blow = (w: number) => {
      const s = room(w, 4, (b, z) => b.mutant('thresher', 11.2, 0, z)), m = s.cast[0] as Mutant;
      m.stun = 0; m.state = 'pursue'; m.st = 10; m.yaw = -Math.PI / 2; // faced west, at you
      m.blow = { ph: 'wind', t: MOVES.thresher.wind - 0.02, hit: false };
      const hp = s.game.hp;
      s.game.events.length = 0;
      let reeled = false;
      for (let t = 0; t < 0.4; t += STEP) { step(s, noInput()); reeled ||= m.reel > 0; }
      return { took: hp - s.game.hp, glanced: heard(s, 'blow'), reeled };
    };
    expect(blow(2)).toEqual({ took: 0, glanced: true, reeled: true });
    const open = blow(12);
    expect(open.took).toBeGreaterThan(0);
    expect(open.glanced).toBe(false);
  });
});

describe('which way it goes: what you hold as you press', () => {
  const A = { strafe: -1 }, D = { strafe: 1 }, W = { forward: 1 }, S = { forward: -1 };
  const way = (id: string | null, keys: Partial<Input>) => wayOf(wstats(id), { ...noInput(), ...keys });

  it('A from your left, D from your right, W over your head or straight out; nothing, or S, the weapon\'s own way', () => {
    for (const id of ['pipe', 'baton', 'wrench']) expect([way(id, {}), way(id, A), way(id, D), way(id, W), way(id, S)], id).toEqual(['side', 'back', 'side', 'chop', 'side']);
    expect([way('axe', {}), way('axe', A), way('axe', D), way('axe', W)]).toEqual(['chop', 'back', 'side', 'chop']);
    for (const id of ['knife', null]) expect([way(id, {}), way(id, A), way(id, D), way(id, W)], `${id}`).toEqual(['thrust', 'back', 'side', 'thrust']);
    /* a stick pushed off straight: the stronger way, and only past halfway */
    expect([way('pipe', { strafe: -0.7, forward: 0.6 }), way('pipe', { strafe: -0.4, forward: 0.9 }), way('pipe', { strafe: 0.3, forward: 0.3 })]).toEqual(['back', 'chop', 'side']);
  });

  it('with the sides swapped (a setting), A sends it from your right and D from your left; W and the rest as they were', () => {
    const swapped = (id: string | null, keys: Partial<Input>) => way(id, { ...keys, swap: true });
    expect([swapped('pipe', A), swapped('pipe', D), swapped('pipe', W), swapped('pipe', {})]).toEqual(['side', 'back', 'chop', 'side']);
    expect([swapped('axe', A), swapped('axe', D), swapped('axe', {})]).toEqual(['side', 'back', 'chop']);
    expect([swapped(null, A), swapped(null, D), swapped(null, W)]).toEqual(['side', 'back', 'thrust']);
    /* and in the fight: stepping left with it swapped, the one on your right is struck */
    const s = room(12, 4, (b, z) => { b.mutant('worm', 11.2, 0, z + 0.45); b.mutant('worm', 11.2, 0, z - 0.45); });
    const [right, left] = s.cast;
    s.player.pitch = -0.7;
    swing(s, 'pipe', { ...A, swap: true });
    expect({ right: right.hp < right.max, left: left.hp < left.max }).toEqual({ right: true, left: false });
  });

  it('a backhand takes the one on your left first, as a side swing takes the one on your right', () => {
    const hits = (keys: Partial<Input>) => {
      const s = room(12, 4, (b, z) => { b.mutant('worm', 11.2, 0, z + 0.45); b.mutant('worm', 11.2, 0, z - 0.45); });
      const [right, left] = s.cast;
      s.player.pitch = -0.7;
      swing(s, 'pipe', keys);
      return { right: right.hp < right.max, left: left.hp < left.max };
    };
    expect(hits(D)).toEqual({ right: true, left: false });
    expect(hits({})).toEqual({ right: true, left: false });
    expect(hits(A)).toEqual({ right: false, left: true });
  });

  it('a backhand sends what it hits off to your right, the way it was going', () => {
    const s = room(12, 4, (b, z) => b.mutant('worm', 11.3, 0, z));
    const m = s.cast[0], x = m.x, z = m.z;
    s.player.pitch = -0.7;
    swing(s, 'pipe', A);
    expect(m.hp).toBeLessThan(m.max);
    expect(m.x - x).toBeGreaterThan(0.1);
    expect(m.z - z).toBeGreaterThan(0.1); // south: your right
  });

  it('in a corridor the pipe brought down over your head clears what its side swing glances off; under a low ceiling the axe swung across clears what its chop catches', () => {
    expect(swing(room(1.6, 4), 'pipe', W).glanced).toBe(false);
    expect(swing(room(1.6, 4), 'pipe', A).glanced).toBe(true);
    expect(swing(room(12, 2.2), 'axe', D).glanced).toBe(false);
    expect(swing(room(12, 2.2), 'pipe', W).glanced).toBe(true);
  });

  it('only the path is chosen: the blow is as hard and as quick whichever way it comes', () => {
    const blow = (keys: Partial<Input>) => {
      const s = room(12, 4, (b, z) => b.mutant('husk', 11.4, 0, z)), m = s.cast[0];
      s.player.pitch = Math.atan2(1.1 - 1.6, 1.4);
      give(s.game, 'pipe');
      hold(s, STEP, { ...keys, attack: true });
      let dur = 0;
      for (let t = 0; t < 2; t += STEP) { step(s, noInput()); dur ||= s.hands.swing?.dur ?? 0; }
      return { took: Math.round((m.max - m.hp) * 1e6) / 1e6, dur };
    };
    const side = blow(D);
    expect(side.took).toBeGreaterThan(0);
    expect(blow(A)).toEqual(side);
    expect(blow(W)).toEqual(side);
  });

  it('a press kept while you are busy goes the way it asked for as it was pressed, whatever is held when it starts', () => {
    const s = room(12, 4), h = s.hands;
    give(s.game, 'pipe');
    hold(s, STEP, { attack: true });
    /* pressed with A held just before the arm is back in from a swing that met nothing (BUF, 0.2 s), then let go of */
    for (let k = 0; k < 200 && (h.swing || h.chg >= 0 || h.rec > 0.1); k++) step(s, noInput());
    expect(h.swing === null && h.chg < 0 && h.rec > 0).toBe(true);
    hold(s, STEP, { ...A, attack: true });
    expect(h.chg).toBeLessThan(0); // busy: kept
    for (let k = 0; k < 20 && h.chg < 0; k++) step(s, noInput()); // nothing held when the load begins
    expect(h.chg).toBeGreaterThanOrEqual(0);
    expect(h.way).toBe('back');
  });
});
