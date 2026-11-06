import { describe, expect, it } from 'vitest';
import { STATION } from '../src/content/station';
import { testbed } from '../src/content/levels/testbed';
import { bench } from '../src/content/levels/bench';
import { LevelBuilder } from '../src/content/build/builder';
import type { LevelDef } from '../src/content/types';
import { levelDef } from '../src/sim/run';
import { LCELL, LOFF } from '../src/world/lightField';
import { placement, Site, type Fault } from './placement';

/* Where things are (test/placement.ts measures it): nothing you can pick up, and no paper, floats over what it lies on,
   hangs off its edge, or lies in a wall or in something else; no fitting hangs in the air or runs into a wall; every pane
   lies across its opening; every rail stands at a drop, not against a wall. A lump of growth may grow into the rock, a stain or a patch of moss may run under a wall's
   edge, and anything in a cave may meet its rough walls: that is where they are, not a mistake. The probe
   (test/probes/placement.probe.ts) lists everything, those included. */

const levels: LevelDef[] = [...STATION.levels.map(l => levelDef(STATION, l.id)), testbed(), bench()];
const THINGS = new Set(['floats', 'overhangs', 'in a wall', 'inside']);
const say = (F: Fault[]) => F.map(f => `${f.kind}: ${f.what} at ${f.at.join(', ')}`);

describe('where things are', () => {
  for (const L of levels)
    it(`${L.id}: what you pick up and the papers lie on something, the fittings are held and clear of the walls, the panes lie across, the rails stand at drops, what is on a board is on it`, () => {
      const site = new Site(L), F = placement(L, site);
      /* growth and stains, and anything in a cave, against rock */
      const rough = (f: Fault) => {
        const p = L.props[f.prop!], R = site.w.roomAt(p.x, p.y + p.sy / 2, p.z);
        return p.shape === 'ico' || p.sy <= 0.03 || !!R?.cells || R?.mat.wall === 'rock';
      };
      expect(say(F.filter(f => THINGS.has(f.kind)))).toEqual([]);
      expect(say(F.filter(f => f.kind === 'lies along its opening'))).toEqual([]);
      expect(say(F.filter(f => f.kind === 'rail against a wall'))).toEqual([]);
      expect(say(F.filter(f => f.kind === 'hangs in the air'))).toEqual([]);
      expect(say(F.filter(f => f.kind === 'off its edge'))).toEqual([]);
      expect(say(F.filter(f => (f.kind === 'runs into a wall' || f.kind === 'lost in a wall') && !rough(f)))).toEqual([]);
    });

  it('the whiteboard by the nurses\' desk is read off the board itself: no paper in the air in front of it', () => {
    const L = levelDef(STATION, 'upper'), n = L.notes.find(q => q.key === 'board')!;
    expect(n.bare).toBe(true);
    const board = L.props.find(p => Math.abs(p.x - n.x) < 0.01 && p.sx === 1.7 && p.sy === 1)!;
    expect(Math.abs(n.z - (board.z - board.sz / 2))).toBeLessThan(0.02); // at its face
    expect(n.y).toBeGreaterThan(board.y); expect(n.y).toBeLessThan(board.y + board.sy);
    const lines = L.props.filter(p => p.sy === 0.03 && p.sz === 0.01 && Math.abs(p.z - n.z) < 0.02 && Math.abs(p.x - board.x) < 1);
    expect(lines.length).toBe(5);
    for (const p of lines) { expect(p.x - p.sx / 2).toBeGreaterThan(board.x - board.sx / 2 + 0.05); expect(p.x + p.sx / 2).toBeLessThan(board.x + board.sx / 2 - 0.05); } // on it, from a margin
  });

  it('the treatment bay\'s shelf, with the trauma kit and the bandages on it, stands against its south wall, out of the corner', () => {
    const L = levelDef(STATION, 'upper'), R = L.rooms.find(r => r.name === 'Infirmary' && !r.part)!, kit = L.items.find(i => i.id === 'medkit' && i.x > R.x0 && i.x < R.x1 && i.z > R.z0 && i.z < R.z1)!;
    const boards = L.props.filter(p => Math.abs(p.z - kit.z) < 0.3 && Math.abs(p.x - kit.x) < 1 && p.sy === 0.04);
    expect(boards.length).toBe(5);
    for (const p of boards) { expect(p.x + p.sx / 2).toBeLessThanOrEqual(R.x1 + 1e-6); expect(p.z + p.sz / 2).toBeLessThanOrEqual(R.z1 + 1e-6); }
    expect(R.z1 - Math.max(...boards.map(p => p.z + p.sz / 2))).toBeLessThan(0.01); // against the south wall
    expect(R.x1 - Math.max(...boards.map(p => p.x + p.sx / 2))).toBeGreaterThan(1); // well off the east one
    const col = (boards[0].x - LOFF) / LCELL;
    expect(Math.abs(col - Math.round(col))).toBeLessThan(1e-6); // its middle on a column of the light's lattice: no dark slab on the wall by it
  });

  it('the operations room\'s glass on the court runs along its wall, pane by pane, not across it', () => {
    const L = levelDef(STATION, 'upper'), panes = L.doors.filter(d => d.glass && d.circuit === 'CRIT');
    expect(panes.length).toBe(8);
    for (const d of panes) { expect(d.alongX).toBe(true); expect(d.x1 - d.x0).toBeCloseTo(2); }
  });

  it('rails a walkway only where there is a drop: along the galleries over the street and the lobby, not along their walls', () => {
    /* rails are runs a metre high and 10 cm through, as long as the edge they guard */
    const rails = (id: string) => levelDef(STATION, id).props.filter(p => p.sy === 1 && Math.min(p.sx, p.sz) > 0.09 && Math.min(p.sx, p.sz) < 0.11);
    const length = (ps: { sx: number; sz: number }[]) => ps.reduce((n, p) => n + Math.max(p.sx, p.sz), 0);
    const main = rails('main'), upper = rails('upper');
    /* the Commons: the galleries' inner edges over the street (plan z -2 and 2 on both upper floors) are railed; their fronts
       (z -6 and 6), over the doors of the floor below, are wall */
    expect(length(main.filter(p => Math.abs(Math.abs(p.z) - 2.05) < 0.01))).toBeGreaterThan(160);
    expect(main.filter(p => Math.abs(Math.abs(p.z) - 5.95) < 0.01 && p.x + p.sx / 2 > 18 && p.x - p.sx / 2 < 112)).toEqual([]); // (west of x 18, the plazas' stairwells: railed)
    /* the lobby's gallery: glass over the lobby, and none against its end wall over the corridor's door */
    const glass = upper.filter(p => p.mat === 'glass' && p.y === 5);
    expect(length(glass)).toBeGreaterThan(20);
    expect(glass.filter(p => Math.abs(p.x - 29.95) < 0.01)).toEqual([]);
  });

  it('puts down what lies about on what is under it: square to it, in from its edges, making room on a shelf', () => {
    const b = new LevelBuilder('t', 't');
    b.room('Room', 0, 0, 10, 10);
    b.box(5, 5, 1.8, 0.76, 0.7, 0x333333); // a desk
    b.box(2, 2, 2, 0.04, 0.5, 0x444444, { y: 1 }); // a shelf's board, and what is on it
    b.box(2, 2, 0.2, 0.2, 0.2, 0x555555, { y: 1.04, goods: true }); b.box(2.6, 2, 0.2, 0.2, 0.2, 0x555555, { y: 1.04, goods: true });
    b.item('batt', 5, 0.78, 5); b.item('shotgun', 5.85, 0.78, 5); b.item('medkit', 2, 1.06, 2); b.item('batt', 8, 1.5, 8); b.note('memo', 4.6, 0.78, 5.1);
    const L = b.finish(), [batt, gun, kit, high] = L.items;
    expect(batt.y).toBeCloseTo(0.76); expect(kit.y).toBeCloseTo(1.04); expect(L.notes[0].y).toBeCloseTo(0.76);
    expect(Math.abs(Math.sin(gun.yaw!))).toBeLessThan(0.25); // along the desk
    expect(gun.x).toBeLessThan(5.85); // moved in off the end
    expect(L.props.filter(p => p.sy === 0.2).map(p => p.x)).toEqual([2.6]); // the goods where the kit went are gone
    expect(high.y).toBe(1.5); // nothing near under it: left where it was put, for this test to find
    expect(placement(L).filter(f => THINGS.has(f.kind)).map(f => f.what)).toEqual([expect.stringMatching(/^batt, 1\.500 m over/), expect.stringMatching(/^batt: /)]);
  });
});
