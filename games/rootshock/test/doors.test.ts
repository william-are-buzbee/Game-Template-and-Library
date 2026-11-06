import { describe, expect, it } from 'vitest';
import { STATION } from '../src/content/station';
import { levelDef } from '../src/sim/run';
import { makeSim } from '../src/sim/sim';
import { doorBox } from '../src/sim/movers';
import { MT } from '../src/sim/cast';
import { NARROW } from '../src/content/build/plan';
import { checkProgress } from '../src/sim/progress';
import { upper } from './kit';

/* Doors by where they are (world.md §1, *The station as built*; engine.md §15): what each looks like, and that a door
   sliding into its wall goes into rock, not into a room or another doorway. */

const level = upper();
/** the door whose sign reads `text` */
const signed = (text: string) => {
  const g = level.signs.find(q => q.text === text)!;
  return level.doors.reduce((a, d) => (Math.hypot((d.x0 + d.x1) / 2 - g.x, (d.z0 + d.z1) / 2 - g.z) < Math.hypot((a.x0 + a.x1) / 2 - g.x, (a.z0 + a.z1) / 2 - g.z) ? d : a));
};

describe('doors', () => {
  it('look like where they are', () => {
    expect(signed('Lobby').look).toBe('grand');
    expect(signed('Infirmary').look).toBe('clinic');
    expect(signed('Lockers').look).toBe('steel');
    expect(signed('Duty office').look).toBe('office');
    expect(signed('Armory').look).toBe('heavy');
    expect(signed('Hazard store').look).toBe('shutter');
  });

  it('are as wide as what they are: a single leaf 1.2 m, a pair, a heavy door and a shutter the whole 2 m', () => {
    const width = (text: string) => { const d = signed(text); return Math.max(d.x1 - d.x0, d.z1 - d.z0); };
    expect(width('Lockers')).toBeCloseTo(NARROW);
    expect(width('Duty office')).toBeCloseTo(NARROW);
    for (const t of ['Lobby', 'Infirmary', 'Armory', 'Hazard store']) expect(width(t), t).toBeCloseTo(2);
  });

  it('a narrow one still lets through everything that uses doors, and the big cast use none', () => {
    for (const [k, S] of Object.entries(MT)) if (!S.noDoors && !S.fixed) expect(2 * S.r, k).toBeLessThan(NARROW - 0.1); // a skitter, the widest, has 10 cm either side
    for (const k of ['thresher', 'bloat']) expect(MT[k].noDoors, k).toBe(true);
    /* every door has somewhere in it to stand, on every level */
    for (const id of ['upper', 'main', 'plant', 'sump', 'cave']) {
      const s = makeSim(levelDef(STATION, id), { seed: 1, station: STATION });
      s.doors.forEach((d, k) => { if (!d.def.glass && !d.def.lift) expect(s.fields!.doorSpots[k].length, `${id} door ${k}`).toBeGreaterThan(0); });
    }
  });

  it('slide into rock; shutters, and anything jammed, rise', () => {
    for (const id of ['upper', 'main', 'plant', 'sump', 'cave']) {
      const s = makeSim(levelDef(STATION, id), { seed: 1, station: STATION }), w = s.world;
      for (const d of s.doors) {
        if (d.def.stuck || d.def.look === 'shutter') expect(d.def.slides, id).toBeFalsy();
        if (!d.def.slides) continue;
        const b = doorBox(d, 1), x = (b.x0 + b.x1) / 2, z = (b.z0 + b.z1) / 2;
        for (const y of [b.y0 + 0.3, b.y0 + 1.2, b.y1 - 0.3]) expect(w.roomAt(x, y, z), `${id} door at ${(d.def.x0 + d.def.x1) / 2}, ${(d.def.z0 + d.def.z1) / 2}`).toBeNull();
      }
    }
  });

  it('Gen-1 control looks down into the generator hall through glass, and its stair reaches it', () => {
    const s = makeSim(levelDef(STATION, 'plant'), { seed: 1, station: STATION }), w = s.world;
    const C = w.rooms.find(R => R.name === 'Gen-1 control' && !R.part)!, H = w.rooms.find(R => R.name === 'Generator hall' && !R.part)!;
    const eye = [C.x1 - 1, C.y0 + 1.5, (C.z0 + C.z1) / 2] as const, below = [H.x0 + 20, H.y0 + 1, (C.z0 + C.z1) / 2] as const; // (steeper, the sill under the glass is in the way)
    const panes = s.doors.filter(d => d.def.glass && d.def.y0 >= C.y0 - 0.01 && Math.abs((d.def.x0 + d.def.x1) / 2 - C.x1 - 1) < 1.5);
    expect(panes.length).toBe(4);
    /* nothing but glass between: the cast see through it as you do */
    expect(w.raycast(...eye, ...below, d => !!d.glass)).toBe(1);
    expect(checkProgress(s, {}).rooms.never).toEqual([]);
  });
});
