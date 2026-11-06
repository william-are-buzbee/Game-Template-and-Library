import { describe, expect, it } from 'vitest';
import { STATION } from '../src/content/station';
import { buildUpper } from '../src/content/levels/upper';
import { validateStation } from '../src/sim/validate';
import { levelDef } from '../src/sim/run';

/* The station's content, checked without playing it: part of `npm run check`. */

describe('level validation', () => {
  const upper = buildUpper(STATION.ladders);

  it('finds no mistakes in the station; what waits on other levels is marked as such', () => {
    const p = validateStation(STATION, [upper]);
    expect(p.filter(x => !x.later)).toEqual([]);
    expect(p.filter(x => x.later).map(x => x.what)).toEqual(expect.arrayContaining([expect.stringMatching(/^door \d+ wants code 1, written on a paper no level ported yet holds$/)]));
  });

  it('with every level ported, the whole station validates, and nothing waits', () => {
    expect(validateStation(STATION, STATION.levels.map(l => levelDef(STATION, l.id)))).toEqual([]);
  });

  it('the air says whose ground it is: spores in the green, flecks in the nests, dust elsewhere', () => {
    const air = (lv: string, name: string) => levelDef(STATION, lv).rooms.find(R => R.name === name)?.motes ?? 'dust';
    expect(air('main', 'Arboretum')).toBe('spores');
    expect(air('main', 'Tissue lab')).toBe('spores');
    expect(air('cave', 'Great chamber')).toBe('spores');
    expect(air('upper', 'Cargo cavern')).toBe('flesh');
    expect(air('upper', 'Operations corridor')).toBe('dust');
    expect(levelDef(STATION, 'main').rooms.some(R => R.name.startsWith('Residence') && R.motes === 'flesh')).toBe(true);
  });

  it('fitted rooms have air grilles in their ceilings, clear of the light fittings; caves and walkways have none', () => {
    const L = levelDef(STATION, 'upper'), V = L.vents ?? [], F = L.fixtures ?? [];
    expect(V.length).toBeGreaterThan(20);
    const corridor = L.rooms.find(R => R.name === 'Operations corridor')!;
    const inside = (R: typeof corridor) => V.filter(v => v.x > R.x0 && v.x < R.x1 && v.z > R.z0 && v.z < R.z1 && v.y > R.y0 + R.ht - 0.3 && v.y < R.y0 + R.ht + 0.3);
    expect(inside(corridor).length).toBe(2); // a long room: one at each end
    expect(inside(L.rooms.find(R => R.name === 'Cargo cavern')!).length).toBe(0);
    for (const v of V) for (const f of F) if (Math.abs(v.y - f.y) < 1) expect(Math.hypot(v.x - f.x, v.z - f.z)).toBeGreaterThan(0.5); // in the same ceiling
  });

  it('catches a thing that does not exist, a card nobody has, a code written nowhere, and a thing out of reach', () => {
    const L = structuredClone(upper);
    L.items.push({ id: 'unobtainium', x: 30, y: 0, z: -1, n: 1 });
    L.items.push({ id: 'batt', x: 30, y: 9, z: -1, n: 1 }); // in the ceiling
    L.doors[3] = { ...L.doors[3], card: 'zz' };
    L.doors[4] = { ...L.doors[4], code: 3 };
    const what = validateStation(STATION, [L]).filter(x => !x.later).map(x => x.what).join('\n');
    expect(what).toMatch(/item that does not exist: unobtainium/);
    expect(what).toMatch(/door 3 wants card zz/);
    expect(what).toMatch(/door 4 wants code 3, which is written down nowhere/);
    expect(what).toMatch(/batt at 30, -1 is out of reach/);
  });
});
