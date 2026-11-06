import { describe, expect, it } from 'vitest';
import { GRID, sizeOf } from '../src/content/items';
import { Rng } from '../src/core/rng';
import { fits, give, makeGame, moveSlot, settle, unwear, useItem, type Game } from '../src/sim/game';
import { load, save } from '../src/sim/save';
import { STATION } from '../src/content/station';
import { fresh, upper } from './kit';

/* What you carry takes room (content/items.ts, GRID and size): a long thing a column of cells, a vest a square, most
   things one. Nothing shares a cell; a thing that will not go where there is room for it packs the rest again first. */

const game = (): Game => makeGame(new Rng(1), null);
/** every cell taken at most once, and nothing off the edge */
const sound = (g: Game) => {
  const seen = new Set<string>();
  for (const s of g.inv) {
    const [w, h] = sizeOf(s.id);
    expect(s.x + w).toBeLessThanOrEqual(GRID.w);
    expect(s.y + h).toBeLessThanOrEqual(GRID.h);
    for (let x = s.x; x < s.x + w; x++) for (let y = s.y; y < s.y + h; y++) {
      expect(seen.has(x + ',' + y), `${s.id} on ${x},${y}`).toBe(false);
      seen.add(x + ',' + y);
    }
  }
  return seen.size;
};

describe('the grid', () => {
  it('a gun takes two cells, a shotgun three, a vest four, a battery one', () => {
    expect(sizeOf('pistol')).toEqual([1, 2]);
    expect(sizeOf('shotgun')).toEqual([1, 3]);
    expect(sizeOf('armor')).toEqual([2, 2]);
    expect(sizeOf('batt')).toEqual([1, 1]);
  });

  it('fills column by column from the left, and nothing shares a cell', () => {
    const g = game();
    for (const id of ['shotgun', 'pistol', 'medkit', 'kit', 'bandage']) expect(give(g, id)).toBe(true);
    expect(g.inv.map(s => [s.id, s.x, s.y])).toEqual([['shotgun', 0, 0], ['pistol', 1, 0], ['medkit', 1, 2], ['kit', 2, 0], ['bandage', 2, 1]]);
    expect(sound(g)).toBe(3 + 2 + 1 + 2 + 1);
  });

  it('full is full: what will not fit is left, and said so', () => {
    const g = game();
    for (let k = 0; k < GRID.w; k++) expect(give(g, ['axe', 'pipe', 'shotgun'][k % 3])).toBe(true);
    expect(sound(g)).toBe(GRID.w * GRID.h);
    g.events.length = 0;
    expect(give(g, 'batt')).toBe(false);
    expect(g.events.some(e => e.type === 'say' && e.text === 'Hands full.')).toBe(true);
    expect(give(g, 'ammo9')).toBe(false);
  });

  it('room enough in all but no gap the shape of it: the rest are packed again to make one', () => {
    const g = game();
    /* a trauma kit in the middle of every column: sixteen cells free, but not two of them one above the other */
    for (let x = 0; x < GRID.w; x++) { give(g, 'medkit'); moveSlot(g, x, x, 1); }
    expect(g.inv.every((s, x) => s.x === x && s.y === 1)).toBe(true);
    expect(give(g, 'axe')).toBe(true);
    expect(g.inv.map(s => s.id)).toEqual([...Array(GRID.w).fill('medkit'), 'axe']); // in the order they were taken
    expect(sound(g)).toBe(GRID.w + 3);
  });

  it('moved where there is room, and only there', () => {
    const g = game();
    give(g, 'pistol'); give(g, 'medkit');
    const p = g.inv[0];
    moveSlot(g, 0, 5, 1);
    expect([p.x, p.y]).toEqual([5, 1]);
    moveSlot(g, 0, 5, 2); // would hang off the bottom
    expect([p.x, p.y]).toEqual([5, 1]);
    const m = g.inv[1];
    moveSlot(g, 1, 5, 0); // over the pistol: free
    expect([m.x, m.y]).toEqual([5, 0]);
    moveSlot(g, 1, 5, 2); // on the pistol's lower half: not
    expect([m.x, m.y]).toEqual([5, 0]);
    expect(fits(g, 5, 0, 1, 1)).toBe(false);
    expect(fits(g, 0, 0, 1, 3)).toBe(true); // where both were
    sound(g);
  });

  it('one vest at a time: the second is carried, and put on, the first comes off into the grid', () => {
    const g = game();
    give(g, 'armor');
    expect(g.worn).toEqual(['armor']);
    give(g, 'tacvest');
    expect(g.worn).toEqual(['armor']);
    expect(g.inv.map(s => s.id)).toEqual(['tacvest']);
    useItem(g, 0);
    expect(g.worn).toEqual(['tacvest']);
    expect(g.inv.map(s => s.id)).toEqual(['armor']);
    give(g, 'goggles'); give(g, 'hardhat'); give(g, 'rebreather');
    expect(g.worn.sort()).toEqual(['goggles', 'hardhat', 'rebreather', 'tacvest']);
    unwear(g, 'rebreather');
    expect(g.inv.map(s => s.id)).toEqual(['armor', 'rebreather']);
    sound(g);
  });

  it('a vest will not come off with no room for it', () => {
    const g = game();
    give(g, 'armor');
    for (let k = 0; k < GRID.w; k++) give(g, 'axe');
    unwear(g, 'armor');
    expect(g.worn).toEqual(['armor']);
  });

  it('kept by a save; a save from before the grid finds everything a place', () => {
    const s = fresh();
    give(s.game, 'shotgun'); give(s.game, 'medkit');
    moveSlot(s.game, 1, 6, 2);
    const data = JSON.parse(JSON.stringify(save(s)));
    const t = load(upper(), data, { station: STATION });
    expect(t.game.inv.map(q => [q.id, q.x, q.y])).toEqual([['shotgun', 0, 0], ['medkit', 6, 2]]);
    /* as it was saved before: no places, and a count of slots */
    data.game.inv = data.game.inv.map((q: { id: string; n: number }) => ({ id: q.id, n: q.n }));
    data.game.cap = 10;
    const u = load(upper(), data, { station: STATION });
    expect(u.game.inv.map(q => [q.id, q.x, q.y])).toEqual([['shotgun', 0, 0], ['medkit', 1, 0]]);
    expect('cap' in u.game).toBe(false);
    const g = game();
    g.inv = [{ id: 'pistol', n: 1 } as never, { id: 'batt', n: 2 } as never];
    settle(g);
    sound(g);
  });
});
