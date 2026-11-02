import { describe, expect, it } from 'vitest';
import { STATION } from '../src/content/station';
import { buildUpper } from '../src/content/levels/upper';
import { LevelBuilder } from '../src/content/build/builder';
import type { StationDef } from '../src/content/types';
import { makeSim, step } from '../src/sim/sim';
import { noInput } from '../src/sim/input';
import { checkProgress, describe as describeReport } from '../src/sim/progress';
import { load, save } from '../src/sim/save';

/* The progression checker: proved on the upper station as it stands, and on a small level built to go wrong. */

const upper = buildUpper(STATION.ladders);
/** a door's number in the checker's report, found by the sign over it (windows added before it renumber it) */
const doorNo = (sign: string) => {
  const g = upper.signs.find(q => q.text === sign)!, at = (d: typeof upper.doors[number]) => Math.hypot((d.x0 + d.x1) / 2 - g.x, (d.z0 + d.z1) / 2 - g.z);
  return upper.doors.reduce((k, d, i) => (at(d) < at(upper.doors[k]) ? i : k), 0);
};
const CARGO = doorNo('Cargo'), ARMORY = doorNo('Armory');

describe('the upper station', () => {
  const s = makeSim(upper, { seed: 7, station: STATION });
  const r = checkProgress(s);

  it('can be left two ways, neither at once: the elevator with the wing mended, or ladder B through Cargo', () => {
    expect(r.goals['elevator to Main level']).toEqual(['take splice kit', 'mend the SEC connection with a kit']);
    /* Cargo is behind the deputy director's card, and she is at the far end of the muster hall, under the operations room's glass */
    expect(r.goals['ladder B1 to Main level']).toEqual(['search the manager', `use the card at door ${CARGO}`, 'start the CARGO backup set']);
    expect(r.goals['the surface']).toBeUndefined(); // that wants Gen-1, five floors down
  });

  it('keeps the Armory and the hazard store shut until Gen-1 runs, and has no soft-locks or dead ends', () => {
    expect(r.rooms.never).toContain('Armory');
    expect(r.rooms.never).toContain('Hazardous storage');
    expect(r.items.never).toEqual(expect.arrayContaining(['Shotgun', 'Surface lift pass', 'Rebreather']));
    expect(r.softLocks).toEqual([]);
    expect(r.deadEnds).toEqual([]);
  });

  it('opens the briefing room only through the wing\'s cut, mended with the kit from Ops\' side', () => {
    expect(r.rooms.reached).toContain('Briefing room');
    const a = makeSim(upper, { seed: 7, station: STATION });
    a.items.forEach(it => { if (it.id === 'kit') it.taken = true; }); // no kit to be had
    expect(checkProgress(a).rooms.never).toContain('Briefing room');
  });

  it('with Gen-1 running and the Armory code known (both from below), everything is in reach and the surface is open', () => {
    const r2 = checkProgress(s, { main: true, have: ['#1'] });
    expect(r2.items.never).toEqual([]);
    expect(r2.goals['the surface']).toEqual([`key the code at door ${ARMORY}`, 'take surface lift pass']); // the Armory, then its pass
    /* welded, the way out itself, the suite's clinical rooms, on cards whose holders are gone, or the freight shaft's foot,
       fenced off 30 m down */
    expect(r2.rooms.never.every(n => /Cell|Phase 2|Freight shaft|Operations room|Surface cage|doorway|Treatment room|Doctor's office/.test(n))).toBe(true);
  });

  it('works from a save: what you have done is taken as done', () => {
    const a = makeSim(upper, { seed: 7, station: STATION });
    a.game.station!.circuits.CARGO.back = true;
    const r3 = checkProgress(load(upper, JSON.parse(JSON.stringify(save(a))), { seed: 7, station: STATION }));
    expect(r3.goals['ladder B1 to Main level']).toEqual(['search the manager', `use the card at door ${CARGO}`]);
  });

  it('reads as text', () => {
    expect(describeReport(r)).toContain(`ladder B1 to Main level: search the manager → use the card at door ${CARGO} → start the CARGO backup set`);
  });
});

describe('a level built to go wrong', () => {
  /* a hall with one splice kit and two burned-out connections, each powering the heavy door to its own way down; and a
     pit off the hall you can drop into and not climb out of */
  const station: StationDef = {
    levels: [], ladders: {}, main: true, start: 'trap', names: { trap: 'Trap' },
    circuits: { MAIN: { on: true, back: false }, A: { on: false, back: false, broken: true }, B: { on: false, back: false, broken: true } },
  };
  const b = new LevelBuilder('trap', 'Trap', { circuit: 'MAIN' });
  b.room('Hall', 0, 0, 12, 8, { ht: 3 });
  for (const [side, x] of [['A', 1], ['B', 9]] as const) {
    b.room('Passage ' + side, x, 8, x + 2, 8.75, { ht: 2.6 });
    b.room('', x, 8.75, x + 2, 9, { ht: 2.4 });
    b.room('Passage ' + side, x, 9, x + 2, 10, { ht: 2.6 });
    b.door(x, 8.75, x + 2, 9, 2.4, { kind: 'heavy', circuit: side });
    b.room('Room ' + side, x - 1, 10, x + 3, 14, { ht: 3 });
    b.use('stair', x + 1, 0.4, 12, { to: 'below ' + side, up: 0 });
    b.use('panel', x === 1 ? 5 : 7, 1.3, 0.5, { c: side });
  }
  b.item('kit', 6, 0, 4);
  b.room('Pit', 12, 2, 16, 6, { y0: -2, ht: 4.5 });
  b.start(6, 6, 0);
  const s = makeSim(b.finish(), { seed: 1, station });
  const r = checkProgress(s);

  it('sees both ways down, each by mending its own connection', () => {
    expect(r.goals['stairs to below A']).toEqual(['take splice kit', 'mend the A connection with a kit']);
    expect(r.goals['stairs to below B']).toEqual(['take splice kit', 'mend the B connection with a kit']);
  });

  it('reports the kit spent on one as the other lost for good', () => {
    expect(r.softLocks).toEqual(expect.arrayContaining([
      { lost: ['stairs to below B'], route: ['take splice kit', 'mend the A connection with a kit'] },
      { lost: ['stairs to below A'], route: ['take splice kit', 'mend the B connection with a kit'] },
    ]));
  });

  it('reports the pit as a dead end', () => {
    expect(r.deadEnds.map(d => d.room)).toContain('Pit');
  });
});

describe('breath', () => {
  /* two dry rooms joined by 100 m of tunnel flooded to its roof: 42 s of swimming, more than one breath (35 s) holds,
     well within a rebreather's (150 s). The rebreather is lying in the west room. */
  const station: StationDef = { levels: [], ladders: {}, main: true, start: 'flood', names: { flood: 'Flood', on: 'On' }, circuits: { MAIN: { on: true, back: false } } };
  const level = (rebreather: boolean) => {
    const b = new LevelBuilder('flood', 'Flood', { circuit: 'MAIN' });
    b.room('West', 0, 0, 6, 6, { ht: 3 });
    b.room('Flooded tunnel', 6, 2, 106, 4, { ht: 2 });
    b.water(6, 2, 106, 4, 2.5);
    b.room('East', 106, 0, 112, 6, { ht: 3 });
    b.use('stair', 110, 0.4, 3, { to: 'on', up: 0 });
    if (rebreather) b.item('rebreather', 2, 0, 1);
    b.start(3, 3, 0);
    return b.finish();
  };
  const bare = level(false);

  it('a swim longer than your breath is out of reach; with a rebreather on it is not; take it off and it is again', () => {
    const s = makeSim(bare, { seed: 1, station });
    let r = checkProgress(s);
    expect(r.air).toEqual({ now: 35, max: 35 });
    expect(r.rooms.never).toEqual(['East']);
    expect(r.goals['stairs to on']).toBeUndefined();
    s.game.worn.push('rebreather');
    r = checkProgress(s);
    expect(r.air.max).toBe(150);
    expect(r.rooms.never).toEqual([]);
    expect(r.goals['stairs to on']).toEqual([]);
    s.game.commands.push({ type: 'unwear', id: 'rebreather' });
    step(s, noInput());
    expect(s.game.worn).toEqual([]);
    expect(s.game.inv.map(x => x.id)).toEqual(['rebreather']); // in your hands, where it does you no good
    expect(checkProgress(s).rooms.never).toEqual(['East']);
  });

  it('a rebreather to be found counts once taken', () => {
    const r = checkProgress(makeSim(level(true), { seed: 1, station }));
    expect(r.rooms.never).toEqual([]);
    expect(r.goals['stairs to on']).toEqual(['take rebreather']);
  });

  it('half way along, what counts is the breath you have left', () => {
    const s = makeSim(bare, { seed: 1, station }), b = s.player.body;
    b.x = 60; b.z = 3; s.player.air = 25; // 54 m to go east, 46 back west: about 19 s either way
    expect(checkProgress(s).rooms.never).toEqual([]);
    s.player.air = 15;
    const r = checkProgress(s);
    expect(r.air.now).toBe(15);
    expect(r.rooms.reached).not.toContain('West');
    expect(r.rooms.reached).not.toContain('East');
  });
});
