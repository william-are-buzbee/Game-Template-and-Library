import { describe, expect, it } from 'vitest';
import { PI } from '../src/core/math';
import { STATION } from '../src/content/station';
import { makeRun, stepRun, saveRun, loadRun, levelDef } from '../src/sim/run';
import { noInput } from '../src/sim/input';
import { give } from '../src/sim/game';
import { validateStation } from '../src/sim/validate';
import { makeSim } from '../src/sim/sim';
import { checkProgress } from '../src/sim/progress';
import { field, openRules } from '../src/world/nav';
import type { Run } from '../src/sim/run';

/* A run across levels: ladders, dives, the lift, the Security elevator, levels kept as you left them, and each level
   as it is ported. */

const use = (run: Run, label: RegExp) => {
  const u = run.here.usables.find(q => !q.off && label.test(q.label() ?? ''));
  if (!u) throw new Error('nothing labelled ' + label + ' on ' + run.here.world.def.id);
  u.act();
  stepRun(run, noInput()); // the run carries out the trip after the step
};
/** down from Security the usual way: the wing mended (as if with a kit), and its elevator */
const down = (run: Run) => {
  run.here.game.station!.circuits.SEC.broken = false;
  use(run, /^Elevator$/);
};

describe('travel between levels', () => {
  it('the Security elevator is dead until the wing is mended', () => {
    const run = makeRun(STATION, { seed: 4 });
    use(run, /^Elevator$/);
    expect(run.here.world.def.id).toBe('upper');
    expect(run.here.game.events.some(e => e.type === 'say' && e.text === 'No power.')).toBe(true);
  });

  it('the Security elevator goes down to the main level and back up, and each level waits as you left it', () => {
    const run = makeRun(STATION, { seed: 4 }), upper = run.here;
    give(run.here.game, 'pipe');
    upper.doors[3].open = true; upper.doors[3].hold = 1e9; // something to find again
    down(run);
    expect(run.here.world.def.id).toBe('main');
    const m = run.here.world.def.marks['elev:upper'], b = run.here.player.body;
    expect(Math.hypot(b.x - m.x, b.z - m.z)).toBeLessThan(0.01);
    expect(run.here.game).toBe(upper.game); // one game: what you carry came with you
    expect(run.here.game.inv.map(s => s.id)).toContain('pipe');
    expect(run.here.game.events.some(e => e.type === 'level' && e.id === 'main')).toBe(true);
    use(run, /^Elevator$/);
    expect(run.here).toBe(upper);
    const u = upper.world.def.marks['elev:main'];
    expect(Math.hypot(upper.player.body.x - u.x, upper.player.body.z - u.z)).toBeLessThan(0.01);
    expect(upper.doors[3].open).toBe(true);
  });

  it('the lift goes where you ask once Gen-1 runs', () => {
    const run = makeRun(STATION, { seed: 4 });
    run.here.game.station!.main = true;
    run.here.game.commands.push({ type: 'lift', level: 'main' });
    stepRun(run, noInput());
    expect(run.here.world.def.id).toBe('main');
    const m = run.here.world.def.marks.lift, b = run.here.player.body;
    expect(Math.hypot(b.x - m.x, b.z - m.z)).toBeLessThan(0.01);
  });

  it('a run saved on the main level loads there, with the upper station as it was', () => {
    const run = makeRun(STATION, { seed: 4 });
    run.here.doors[3].unlocked = true;
    down(run);
    for (let k = 0; k < 60; k++) stepRun(run, noInput());
    const back = loadRun(STATION, JSON.parse(JSON.stringify(saveRun(run))));
    expect(back.here.world.def.id).toBe('main');
    expect(back.sims.get('upper')!.doors[3].unlocked).toBe(true);
    expect(back.sims.get('upper')!.game).toBe(back.here.game);
    expect(JSON.stringify(saveRun(back))).toBe(JSON.stringify(saveRun(run)));
  });
});

describe('the main level', () => {
  const L = levelDef(STATION, 'main');

  it('validates', () => {
    expect(validateStation(STATION, [L])).toEqual([]);
  });

  it('from the foot of the Security elevator: Horticulture and the ways on are open; the heavy doors want Gen-1', () => {
    const run = makeRun(STATION, { seed: 4 });
    down(run);
    const r = checkProgress(run.here);
    expect(Object.keys(r.goals)).toEqual(expect.arrayContaining(['elevator to Upper station', 'ladder CV to The cave', 'ladder B2 to Plant level']));
    expect(r.rooms.never).toEqual(expect.arrayContaining(['Seed vault', 'Stores', 'Trauma centre']));
    expect(r.softLocks).toEqual([]);
    const r2 = checkProgress(run.here, { main: true });
    expect(r2.items.never).toEqual([]);
  });
});

/** take a ladder by its name: A2 and B2 both read "down to the Plant level" */
const ladder = (run: Run, id: string) => {
  const i = run.here.world.def.uses.findIndex(u => u.kind === 'ladder' && (u.opts as { id?: string }).id === id);
  run.here.usables.find(u => u.key === 'use' + i)!.act();
  stepRun(run, noInput());
};
const at = (run: Run, mark: string) => {
  const m = run.here.world.def.marks[mark], b = run.here.player.body;
  return Math.hypot(b.x - m.x, b.z - m.z) < 0.01 && Math.abs(b.y - m.y) < 0.01;
};

describe('the plant level', () => {
  const L = levelDef(STATION, 'plant');

  it('validates', () => {
    expect(validateStation(STATION, [L])).toEqual([]);
  });

  it('A2 is collapsed; B2 goes down the exhaust shaft to the plant level and back', () => {
    const run = makeRun(STATION, { seed: 4, start: 'main' });
    ladder(run, 'A2');
    expect(run.here.world.def.id).toBe('main');
    expect(run.here.game.events.some(e => e.type === 'say' && /collapsed/.test(e.text))).toBe(true);
    ladder(run, 'B2');
    expect(run.here.world.def.id).toBe('plant');
    const m = run.here.world.def.marks['ladder:B2'], b = run.here.player.body;
    expect(Math.hypot(b.x - m.x, b.z - m.z)).toBeLessThan(0.01);
    ladder(run, 'B2');
    expect(run.here.world.def.id).toBe('main');
  });

  it('from the foot of B2, Gen-1 can be started: the fuse, its socket, the breaker; nothing is lost on the way', () => {
    const run = makeRun(STATION, { seed: 4, start: 'main' });
    ladder(run, 'B2');
    const r = checkProgress(run.here);
    expect(r.goals['Gen-1 running']).toEqual(['take main fuse', 'seat the fuse', 'start Gen-1']);
    expect(Object.keys(r.goals)).toEqual(expect.arrayContaining(['ladder B2 to Main level', 'ladder A3 to The sump', 'the lift']));
    expect(r.rooms.never).toEqual([]);
    expect(r.items.never).toEqual([]);
    expect(r.softLocks).toEqual([]);
  });

  it('starting Gen-1 in the sim powers the station and opens the lift', () => {
    const run = makeRun(STATION, { seed: 4, start: 'plant' }), g = run.here.game;
    use(run, /^Main fuse$/);
    use(run, /^Fuse socket/);
    expect(g.station!.fuseIn).toBe(true);
    use(run, /^Gen-1 main breaker/);
    expect(g.station!.main).toBe(true);
    expect(g.events.some(e => e.type === 'power')).toBe(true);
    g.commands.push({ type: 'lift', level: 'upper' });
    stepRun(run, noInput());
    expect(run.here.world.def.id).toBe('upper');
  });
});

describe('the sump', () => {
  const L = levelDef(STATION, 'sump');

  it('validates', () => {
    expect(validateStation(STATION, [L])).toEqual([]);
  });

  it('A3 goes down from the plant level into the water, where you wade and cannot run; and back up', () => {
    const run = makeRun(STATION, { seed: 4, start: 'plant' });
    ladder(run, 'A3');
    expect(run.here.world.def.id).toBe('sump');
    expect(at(run, 'ladder:A3')).toBe(true);
    const p = run.here.player, b = p.body;
    for (let k = 0; k < 30; k++) stepRun(run, { ...noInput(), yaw: k ? 0 : PI / 2 - p.yaw }); // face east, into the hall
    for (let k = 0; k < 60; k++) stepRun(run, { ...noInput(), forward: 1, run: true });
    expect(p.water).toBe('wading');
    const x = b.x;
    stepRun(run, { ...noInput(), forward: 1, run: true });
    expect(Math.abs(b.x - x)).toBeLessThan(2.2 / 60 + 1e-6);
    ladder(run, 'A3');
    expect(run.here.world.def.id).toBe('plant');
  });

  it('from the foot of A3: the ladder and the dive are open; the lift wants Gen-1; with it, everything', () => {
    const run = makeRun(STATION, { seed: 4, start: 'sump' });
    const r = checkProgress(run.here);
    expect(Object.keys(r.goals).sort()).toEqual(['dive to The sump, drowned', 'ladder A3 to Plant level']);
    expect(r.rooms.never).toEqual(['Main lift', 'the doorway between Main lift and Shaft station']);
    expect(r.items.never).toEqual([]);
    expect(r.softLocks).toEqual([]);
    expect(r.deadEnds).toEqual([]);
    const r2 = checkProgress(run.here, { main: true });
    expect(r2.rooms.never).toEqual([]);
    expect(Object.keys(r2.goals)).toContain('the lift');
  });
});

describe('the drowned sump', () => {
  const L = levelDef(STATION, 'sumpdeep');

  it('validates', () => {
    expect(validateStation(STATION, [L])).toEqual([]);
  });

  it('down through the intake grates: no surface over you, so you hang where you are, swim up and down, and count', () => {
    const run = makeRun(STATION, { seed: 4, start: 'sump' });
    use(run, /^Dive$/);
    expect(run.here.world.def.id).toBe('sumpdeep');
    expect(at(run, 'dive:sump')).toBe(true);
    const p = run.here.player, b = p.body, y = b.y, air = p.air;
    for (let k = 0; k < 120; k++) stepRun(run, noInput());
    expect(p.water).toBe('swimming');
    expect(p.under).toBe(true);
    expect(Math.abs(b.y - y)).toBeLessThan(0.1); // not floated up against the roof
    expect(p.air).toBeLessThan(air - 1.9);
    for (let k = 0; k < 30; k++) stepRun(run, { ...noInput(), rise: true });
    expect(b.y).toBeGreaterThan(y + 0.5);
    use(run, /^Swim up$/);
    expect(run.here.world.def.id).toBe('sump');
    expect(at(run, 'dive:sumpdeep')).toBe(true);
  });

  it('the checker counts the breath you have: on 12 s, the flooded link to the cave is out of reach', () => {
    const run = makeRun(STATION, { seed: 4, start: 'sumpdeep' });
    expect(Object.keys(checkProgress(run.here).goals).sort()).toEqual(['dive to The cave', 'dive to The sump']);
    run.here.player.air = 12;
    const r = checkProgress(run.here);
    expect(r.air).toEqual({ now: 12, max: 35 });
    expect(Object.keys(r.goals)).toEqual(['dive to The sump']);
    expect(r.rooms.never).toEqual(['Flooded link', 'Intake main']);
  });

  it('from the sump, the checker looks through the dive at the drowned level, on the breath you would take down', () => {
    const run = makeRun(STATION, { seed: 4, start: 'sump' });
    const far = (id: string) => run.sims.get(id) ?? makeSim(levelDef(STATION, id), { station: STATION, seed: 1 });
    const t = checkProgress(run.here, { through: far }).through['dive to The sump, drowned'];
    expect(t).toEqual({ air: 35, rooms: ['Flooded link', 'Intake gallery', 'Intake main'], never: [], goals: ['dive to The cave', 'dive to The sump'] });
  });

  it('a rebreather is worn when taken, taken off into your hands, and put on again; off under water, you have one lungful', () => {
    const run = makeRun(STATION, { seed: 4, start: 'sumpdeep' }), sim = run.here, g = sim.game, p = sim.player;
    give(g, 'rebreather');
    stepRun(run, noInput());
    expect(p.airMax).toBe(150);
    p.air = 120;
    g.commands.push({ type: 'unwear', id: 'rebreather' });
    stepRun(run, noInput());
    expect(g.inv.map(s => s.id)).toEqual(['rebreather']);
    expect(p.airMax).toBe(35);
    expect(p.air).toBeLessThanOrEqual(35);
    g.commands.push({ type: 'use', slot: 0 });
    stepRun(run, noInput());
    expect(g.worn).toEqual(['rebreather']);
    expect(g.inv).toEqual([]);
    expect(p.airMax).toBe(150);
  });

  it("Sergeant Aldana has the Armory code; the flooded link goes on to the cave", () => {
    const run = makeRun(STATION, { seed: 4, start: 'sumpdeep' }), g = run.here.game;
    use(run, /^Drowned sergeant$/);
    expect(g.read).toContain('code');
    expect(g.events.some(e => e.type === 'say' && e.text.includes(String(g.code)))).toBe(true);
    const r = checkProgress(run.here);
    expect(Object.keys(r.goals).sort()).toEqual(['dive to The cave', 'dive to The sump']);
    expect(r.rooms.never).toEqual([]);
    use(run, /^Swim on$/);
    expect(run.here.world.def.id).toBe('cave');
    expect(at(run, 'dive:sumpdeep')).toBe(true);
  });
});

describe('the cave', () => {
  const L = levelDef(STATION, 'cave');

  it('validates', () => {
    expect(validateStation(STATION, [L])).toEqual([]);
  });

  it('through the breach behind the arboretum, and back', () => {
    const run = makeRun(STATION, { seed: 4, start: 'main' });
    ladder(run, 'CV');
    expect(run.here.world.def.id).toBe('cave');
    expect(at(run, 'ladder:CV')).toBe(true);
    ladder(run, 'CV');
    expect(run.here.world.def.id).toBe('main');
  });

  it('from the breach: every chamber and passage, and both ways out; nowhere to drop into and not climb out of', () => {
    const run = makeRun(STATION, { seed: 4, start: 'cave' });
    const r = checkProgress(run.here);
    expect(Object.keys(r.goals).sort()).toEqual(['dive to The sump, drowned', 'ladder CV to Main level']);
    expect(r.rooms.never).toEqual([]);
    expect(r.items.never).toEqual([]);
    expect(r.deadEnds).toEqual([]);
  });

  it('on your own feet from the pool in the lower chamber up to the breach, 58 m higher', () => {
    const run = makeRun(STATION, { seed: 4, start: 'sumpdeep' });
    use(run, /^Swim on$/);
    const sim = run.here, p = sim.player, b = p.body, nav = sim.fields!.nav, cv = sim.world.def.marks['ladder:CV'];
    sim.game.god = true; // the cast is about; this is about the rock
    const F = field(nav, nav.locate(cv.x, cv.y, cv.z), openRules(nav));
    let t = 0;
    for (; t < 150 * 60 && Math.hypot(b.x - cv.x, b.z - cv.z) > 1; t++) {
      const i = nav.locate(b.x, b.y, b.z);
      let next = i;
      for (let k = nav.start[i]; k < nav.start[i + 1]; k++) if (F[nav.to[k]] < F[next]) next = nav.to[k];
      stepRun(run, { ...noInput(), forward: 1, yaw: Math.atan2(b.x - nav.x[next], b.z - nav.z[next]) - p.yaw });
    }
    expect(Math.hypot(b.x - cv.x, b.z - cv.z)).toBeLessThan(1);
    expect(b.y).toBeGreaterThan(-1);
  });
});
