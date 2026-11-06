import { describe, expect, it } from 'vitest';
import { STATION } from '../src/content/station';
import { step, type Sim } from '../src/sim/sim';
import { noInput, type Input } from '../src/sim/input';
import { STEP } from '../src/core/loop';
import { give, power } from '../src/sim/game';
import { EYES, LOCKDOWN, camLive, doorZones, onScreen, soundZone } from '../src/sim/eyes';
import { doorAct, doorLabel, findUsable } from '../src/sim/interact';
import { load, save } from '../src/sim/save';
import { free, pace as paceOf } from '../src/sim/cast';
import { fresh, hold, upper } from './kit';

/* Security's eyes and voice (sim/eyes.ts), on the upper station: cameras guard the armed rooms they hang in, and hold
   you moving there sound their zone; every husk that hears it hurries to it. */

const level = upper();
const place = (s: Sim, x: number, y: number, z: number) => { const b = s.player.body; b.x = x; b.y = y; b.z = z; b.vx = b.vy = b.vz = 0; b.sync(); };
const sounded = (s: Sim, name: string) => s.game.events.some(e => e.type === 'sfx' && e.name === name);
const camIn = (s: Sim, room: string) => s.cams.find(c => s.world.roomAt(c.def.x, c.def.y - 1, c.def.z)?.name === room)!;
/** the electrical room's, over its door, looking across the room at the board */
const board = (s: Sim) => camIn(s, 'Electrical room');
/** the atrium's, on the threshold: the atrium is not armed */
const threshold = (s: Sim) => s.cams.find(c => c.def.zone === 'atrium')!;
const still = (s: Sim) => { for (const m of s.cast) m.stun = 1e9; };
/** in the electrical room, in its camera's view, with your flashlight on: the room has no emergency lights, so on the
 *  backup set it is dark, and the camera sees you only near it but for your light */
const inside = (s: Sim) => { place(s, 16.5, 0, 35.5); s.player.yaw = Math.PI; s.game.lightOn = true; s.game.batt = 100; };
/** go on the way you face for a while: walking, running, or crouched (the first step crouches, the rest creep) */
const go = (s: Sim, secs: number, how: 'walk' | 'run' | 'creep' = 'walk') => {
  for (let t = 0; t < secs; t += STEP) step(s, { ...noInput(), forward: 1, run: how === 'run', crouch: how === 'creep' && !s.player.crouch });
};
/** go round in a small circle where you are for a while: moving, but staying put */
const pace = (s: Sim, secs: number, how: 'walk' | 'run' | 'creep' = 'walk') => {
  for (let t = 0; t < secs; t += STEP) {
    s.player.yaw += (2 * Math.PI / 1.2) * STEP;
    step(s, { ...noInput(), forward: 1, run: how === 'run', crouch: how === 'creep' && !s.player.crouch });
  }
};
/** go to and fro until the camera has you */
const until = (s: Sim, c: { hold: number }, how: 'walk' | 'run' | 'creep' = 'walk') => {
  for (let t = 0; t < 1 && c.hold === 0; t += STEP) pace(s, STEP, how);
  expect(c.hold).toBeGreaterThan(0);
};

describe('the armed rooms', () => {
  it('are the wing\'s corridor, the electrical room, the Armory, the range, the operations stair and the chief\'s outer office', () => {
    const s = fresh(), names = new Set(s.world.rooms.filter(R => R.armed).map(R => R.name));
    expect([...names].sort()).toEqual(['Armory', 'Electrical room', 'Firing range', 'Operations stair', 'Outer office', 'Security corridor']);
  });

  it('each has a camera that guards it; the rest only record', () => {
    const s = fresh();
    for (const R of new Set(s.world.rooms.filter(q => q.armed).map(q => q.name))) expect(camIn(s, R)?.guard, R).toBe(true);
    expect(s.cams.filter(c => !c.guard).length).toBe(7); // the booth's four, the atrium's threshold, the court's, the east bays'
    expect(threshold(s).guard).toBe(false);
  });

  it('the way in is not marked: no hazard paint on the floor, the signs as any other', () => {
    expect(level.props.filter(p => p.sy <= 0.011 && p.y > 0.01 && p.y < 0.02 && p.sx <= 0.33 && p.sz <= 0.33).length).toBe(0);
  });

  it('the camera is the tell: from just inside every way in, its guard is in plain view', () => {
    const s = fresh(), w = s.world;
    let ways = 0;
    for (const d of w.def.doors) {
      if (d.glass || d.vent) continue;
      const cx = (d.x0 + d.x1) / 2, cz = (d.z0 + d.z1) / 2, y = d.y0 + 1.6;
      for (const sgn of [-1, 1]) {
        const ix = d.alongX ? cx : cx + sgn * 1.05, iz = d.alongX ? cz + sgn * 1.05 : cz;
        const R = w.roomAt(ix, y, iz), out = w.roomAt(d.alongX ? cx : cx - sgn * 1.2, y, d.alongX ? cz - sgn * 1.2 : cz);
        if (!R?.armed || out?.armed) continue;
        ways++;
        const c = s.cams.find(q => q.guard && w.roomAt(q.def.x, q.def.y - 1, q.def.z)?.name === R.name)!;
        expect(w.raycast(ix, y, iz, c.def.x, c.def.y, c.def.z), `${R.name} at ${cx}, ${cz}`).toBeGreaterThan(0.97);
      }
    }
    expect(ways).toBe(13); // the chief's outer office has its records door as well as the card door
  });

  it('the cast keep out of them on their rounds', () => {
    const s = fresh();
    place(s, 39, -4.5, -15); // you, out of it all, a storey down
    const rounds = s.cast.filter(m => m.ai === 'husk' && !m.post);
    expect(rounds.length).toBeGreaterThan(1);
    for (let t = 0; t < 90; t += 0.5) {
      hold(s, 0.5);
      for (const m of rounds) if (m.state === 'idle') expect(s.world.roomAt(m.x, m.y + 0.5, m.z)?.armed ?? false, `${m.id} at ${t}`).toBe(false);
    }
  }, 30_000); // a minute and a half of the level, 8 s alone: past the default 10 s with the suite on four cores
});

describe('cameras', () => {
  it('a guard that holds you moving a moment sounds its zone: its light at once, then the klaxon', () => {
    const s = fresh(), c = board(s);
    still(s);
    inside(s);
    hold(s, 0.5);
    expect(c.hold).toBe(0); // standing still: nothing to see
    s.game.events.length = 0;
    until(s, c);
    expect(sounded(s, 'cam')).toBe(true); // it has you: the light is red, the servo heard
    expect(s.alarms).toEqual([]);
    pace(s, EYES.hold - 0.3);
    expect(s.alarms).toEqual([]); // time to step back out, or freeze
    pace(s, 0.5);
    expect(s.alarms.map(a => a.zone)).toEqual(['muster']);
    expect(sounded(s, 'klaxon')).toBe(true);
  });

  it('at any pace: creeping is moving, and running is no quicker', () => {
    for (const how of ['creep', 'run'] as const) {
      const s = fresh(), c = board(s);
      still(s);
      inside(s);
      until(s, c, how);
      pace(s, EYES.hold - 0.2, how);
      expect(s.alarms, how).toEqual([]);
      pace(s, 0.4, how);
      expect(s.alarms.map(a => a.zone), how).toEqual(['muster']);
    }
  });

  it('stand stock still in its view in time and it loses you: nothing sounds, and it forgets you', () => {
    const s = fresh(), c = board(s);
    still(s);
    inside(s);
    until(s, c);
    pace(s, EYES.hold * 0.5);
    const had = c.hold;
    hold(s, 1);
    expect(c.hold).toBeLessThan(had); // still, it lets go a little at a time
    hold(s, had / EYES.drain);
    expect(c.hold).toBe(0);
    expect(s.alarms).toEqual([]);
  });

  it('in a dark armed room it sees you only near it, but for your light: by the board, lit, you are seen across the room', () => {
    for (const lit of [false, true]) {
      const s = fresh(), c = board(s);
      still(s);
      place(s, 12, 0, 36); s.game.lightOn = lit; s.game.batt = 100;
      pace(s, EYES.hold + 0.6);
      expect(s.alarms.map(a => a.zone), `light ${lit}`).toEqual(lit ? ['muster'] : []);
      expect(c.hold > 0 || c.tripped).toBe(lit);
    }
  });

  it('step back out of the armed room in time and it lets you go at once', () => {
    const s = fresh(), c = board(s);
    still(s);
    inside(s);
    until(s, c);
    place(s, 24, 0, 35); // back out in the hall
    hold(s, 0.1);
    expect(c.hold).toBe(0);
    hold(s, 2);
    expect(s.alarms).toEqual([]);
  });

  it('one that only records lets you be, whatever you do in its view', () => {
    const s = fresh(), c = threshold(s);
    still(s);
    place(s, c.def.x, 0, c.def.z - 7); s.player.yaw = Math.PI; // in the atrium, in its view, facing it
    go(s, 1.5, 'run');
    expect(c.hold).toBe(0);
    expect(s.alarms).toEqual([]);
  });

  it('it sounds once for one sighting, and keeps it sounding while it still has you moving', () => {
    const s = fresh(), c = board(s);
    still(s);
    inside(s);
    until(s, c);
    pace(s, EYES.hold + 0.1);
    expect(s.alarms.length).toBe(1);
    hold(s, 0.5);
    const t = s.alarms[0].t;
    pace(s, 0.3);
    expect(c.tripped).toBe(true);
    expect(s.alarms[0].t).toBeGreaterThan(t); // kept sounding
  });

  it('a dead camera sees nothing, and neither does a smashed one; smashing takes something in your hand, and is loud', () => {
    const s = fresh(), c = board(s);
    still(s);
    s.usables.find(u => /Breaker, Muster hall west/.test(u.label() ?? ''))!.act(); // its own branch, opened
    inside(s);
    pace(s, 2);
    expect(c.hold).toBe(0);
    expect(s.alarms).toEqual([]);
    const t = fresh(), d = board(t);
    still(t);
    const smash = t.usables.find(u => u.x === d.def.x && u.z === d.def.z)!;
    smash.act();
    expect(d.broken).toBe(false); // bare hands
    give(t.game, 'baton');
    t.game.noiseI = 0;
    smash.act();
    expect(d.broken).toBe(true);
    expect(t.game.noiseI).toBeGreaterThanOrEqual(14);
    expect(smash.label()).toBeNull();
    inside(t);
    pace(t, 2);
    expect(d.hold).toBe(0);
    expect(t.alarms).toEqual([]);
  });

  it('smash the switch in a comms cupboard and its branch\'s cameras are blind: read first, not with bare hands, loud, and kept', () => {
    const s = fresh(), c = board(s);
    still(s);
    const sw = s.usables.find(u => u.label() === 'Comms cupboard' && s.world.roomAt(u.x, u.y, u.z)?.name === 'Comms: muster hall')!;
    s.game.events.length = 0;
    sw.act(); // read: what it feeds
    expect(s.game.events.some(e => e.type === 'say' && /hall's cameras/.test(e.text))).toBe(true);
    sw.act();
    expect(s.blind).toEqual([]); // bare hands
    give(s.game, 'baton');
    expect(sw.label()).toBe('Smash the switch');
    s.game.noiseI = 0;
    sw.act();
    expect(s.blind).toEqual(['HALL']);
    expect(s.game.noiseI).toBeGreaterThanOrEqual(14);
    expect(sw.label()).toBeNull();
    /* the hall's cameras all blind, the electrical room's guard among them; another branch's sees on */
    expect(s.cams.filter(q => q.def.circuit === 'HALL').length).toBe(4);
    for (const q of s.cams) if (q.def.circuit === 'HALL') expect(camLive(s, q)).toBe(false);
    expect(camLive(s, threshold(s))).toBe(true);
    inside(s);
    pace(s, 2);
    expect(c.hold).toBe(0);
    expect(s.alarms).toEqual([]);
    const a = load(level, JSON.parse(JSON.stringify(save(s))), { seed: 7, station: STATION });
    expect(a.blind).toEqual(['HALL']);
    expect(camLive(a, board(a))).toBe(false);
  });

  it('the wing\'s guards its corridor, dead until the cut is mended', () => {
    const s = fresh(), c = camIn(s, 'Security corridor');
    expect(c.def.circuit).toBe('SEC');
    expect(power(s.game, 'SEC')).toBe(0);
  });
});

describe('the zone alarm', () => {
  /** the husks that would answer and hear the atrium's alarm, with you out of it all; everything else still */
  const setUp = (keep: (s: Sim) => number[]) => {
    const s = fresh();
    place(s, 39, -4.5, -15); // you are a storey down in the suite, far out of its sight and hearing
    hold(s, 0.2);
    const k = keep(s);
    for (const q of s.cast) if (!k.includes(q.id)) q.stun = 1e9;
    return s;
  };
  const fastest = (s: Sim, m: Sim['cast'][number], secs: number) => {
    let v = 0;
    for (let t = 0; t < secs && m.state === 'answer'; t += STEP) { step(s, noInput()); v = Math.max(v, Math.hypot(m.body!.vx, m.body!.vz)); }
    return v;
  };

  it('every husk that hears it comes', () => {
    const s = setUp(t => t.cast.filter(m => m.ai === 'husk' && !m.post).map(m => m.id));
    /* the old one of Ops stands among Holt's flowers behind the core, out of sight of the rest: put it in the atrium's
       south arm, where its round takes it, in sight of the Operations corridor's */
    const old = s.cast.find(m => m.type === 'changed' && m.round)!, ob = old.body!;
    ob.x = old.x = 72; ob.z = old.z = 7; ob.sync();
    soundZone(s, 'atrium');
    const a = s.alarms[0], hear = s.cast.filter(m => free(m) && m.stun < 1e8 && a.heard[m.spot] < EYES.reach && a.route[m.spot] > 2.5);
    hold(s, 0.1);
    expect(hear.length).toBeGreaterThan(1);
    for (const m of hear) expect(m.state, `${m.id}`).toBe('answer');
  });

  it('one alone hurries to the speaker, not to you; there it stands and looks about a while', () => {
    const s = setUp(t => [t.cast[1].id]), m = s.cast[1]; // on its rounds in the Operations corridor
    soundZone(s, 'atrium');
    hold(s, 0.1);
    expect(m.state).toBe('answer');
    const sp = level.speakers!.find(q => q.zone === 'atrium')!;
    const v = fastest(s, m, 40);
    expect(v).toBeGreaterThan(paceOf(m, 'answer') * 0.85); // a hurry, faster than its rounds (each its own: sim/cast/gait.ts)
    expect(v).toBeGreaterThan(paceOf(m, 'walk') * 1.5);
    expect(v).toBeLessThan(paceOf(m, 'rally') * 0.9); // and alone, no faster than that
    expect(Math.hypot(m.x - sp.x, m.z - sp.z)).toBeLessThan(3.5);
    expect(m.state).toBe('idle'); // it never came for you
    const x = m.x, z = m.z;
    hold(s, 4);
    expect(Math.hypot(m.x - x, m.z - z)).toBeLessThan(0.2);
  });

  it('with another in sight hurrying too, faster: one starts and the rest catch it', () => {
    const s = setUp(t => t.cast.filter(m => m.ai === 'husk' && !m.post).map(m => m.id));
    /* the old one of Ops stands among Holt's flowers behind the core, out of sight of the rest: put it in the atrium's
       south arm, where its round takes it, in sight of the Operations corridor's */
    const old = s.cast.find(m => m.type === 'changed' && m.round)!, ob = old.body!;
    ob.x = old.x = 72; ob.z = old.z = 7; ob.sync();
    soundZone(s, 'atrium');
    hold(s, 0.1);
    const going = s.cast.filter(m => m.state === 'answer');
    expect(going.length).toBeGreaterThan(1);
    let k = 0; // the most any went, as a share of its own hurry
    for (let t = 0; t < 30 && going.some(m => m.state === 'answer'); t += STEP) {
      step(s, noInput());
      for (const m of going) if (m.state === 'answer') k = Math.max(k, Math.hypot(m.body!.vx, m.body!.vz) / paceOf(m, 'answer'));
    }
    expect(k).toBeGreaterThan(1.15);
  });

  it('dies away after a while, and sounding it again starts it over', () => {
    const s = fresh();
    still(s);
    soundZone(s, 'ops');
    hold(s, EYES.sound - 2);
    soundZone(s, 'ops');
    hold(s, 4);
    expect(s.alarms.map(a => a.zone)).toEqual(['ops']);
    hold(s, EYES.sound);
    expect(s.alarms).toEqual([]);
  });

  it('mending the wing\'s cut sounds the wing: its circuit comes live on Security\'s board', () => {
    const s = fresh();
    still(s);
    give(s.game, 'kit');
    s.usables.find(u => /Service connection, Security wing/.test(u.label() ?? ''))!.act();
    expect(s.alarms.map(a => a.zone)).toEqual(['wing']);
  });

  it('a save made while an alarm sounds and a husk answers it plays on the same', () => {
    const s = setUp(t => [t.cast[1].id]);
    soundZone(s, 'atrium');
    hold(s, 2);
    const a = load(level, JSON.parse(JSON.stringify(save(s))), { seed: 7, station: STATION });
    hold(s, 3); hold(a, 3);
    expect(JSON.stringify(save(a))).toBe(JSON.stringify(save(s)));
  });
});

describe('lockdown', () => {
  /** a zone's doors, by the room on the far side from the hall or corridor */
  const doorTo = (s: Sim, room: string) => s.doors.find(d => {
    const D = d.def, cx = (D.x0 + D.x1) / 2, cz = (D.z0 + D.z1) / 2, y = D.y0 + 0.5;
    return [[1.3, 0], [-1.3, 0], [0, 1.3], [0, -1.3]].some(([dx, dz]) => s.world.roomAt(cx + dx, y, cz + dz)?.name === room) && !D.seal && !D.glass;
  })!;
  const brk = (s: Sim, name: string) => s.usables.find(u => new RegExp('Breaker, ' + name).test(u.label() ?? ''))!;
  const zoneDoors = (s: Sim, zone: string) => s.doors.filter(d => doorZones(s.world, d).includes(zone));

  it('an alarm bolts its zone\'s doors that have power to move: heard being drawn, home a moment later', () => {
    const s = fresh();
    still(s);
    place(s, 39, -4.5, -15);
    s.game.events.length = 0;
    soundZone(s, 'muster');
    hold(s, 0.1);
    const drawn = zoneDoors(s, 'muster').filter(d => d.drawing > 0);
    expect(drawn.map(d => d.def.circuit).sort()).toEqual(['HALL', 'HALL', 'HALL', 'HALL', 'OPS']); // the electrical room's, the range's, the training room's, the hall's comms cupboard's, the duty office's
    expect(sounded(s, 'bolt-draw')).toBe(true);
    expect(drawn.some(d => d.down)).toBe(false); // time to get through
    hold(s, LOCKDOWN.draw);
    for (const d of drawn) expect(d.down).toBe(true);
    expect(sounded(s, 'bolt')).toBe(true);
    expect(doorTo(s, 'Armory').down).toBe(false); // heavy, and the backup set cannot move it: nothing to bolt
    for (const d of zoneDoors(s, 'ops')) expect(d.down || d.drawing > 0).toBe(false); // another zone's
  });

  it('a bolted door will not open, for you or anything else, and is refused', () => {
    const s = fresh(), d = doorTo(s, 'Firing range');
    still(s);
    soundZone(s, 'muster');
    hold(s, LOCKDOWN.draw + 0.2);
    expect(doorLabel(s, d)).toBe('Locked down');
    s.game.events.length = 0;
    doorAct(s, d);
    expect(d.open).toBe(false);
    expect(s.game.events.some(e => e.type === 'sfx' && e.name === 'deny')).toBe(true); // its red lamp says why
    const D = d.def;
    place(s, (D.x0 + D.x1) / 2, 0, (D.z0 + D.z1) / 2 - 1.5); // right at it, on the hall's side
    hold(s, 0.5);
    expect(d.t).toBeLessThan(0.1);
  });

  it('it holds while the alarm sounds, and lets go when it stops', () => {
    const s = fresh(), d = doorTo(s, 'Electrical room');
    still(s);
    soundZone(s, 'muster');
    hold(s, EYES.sound - 1);
    expect(d.down).toBe(true);
    s.game.events.length = 0;
    hold(s, 1.5);
    expect(s.alarms).toEqual([]);
    expect(d.down).toBe(false);
    expect(sounded(s, 'bolt-free')).toBe(true);
  });

  it('a door without power is not bolted, and one that loses its power lets go: exits fail safe', () => {
    const s = fresh();
    still(s);
    soundZone(s, 'wing'); // the wing is cut: its doors are dead
    hold(s, LOCKDOWN.draw + 0.2);
    for (const d of zoneDoors(s, 'wing')) expect(d.down, d.def.circuit).toBe(false);
    const t = fresh(), range = doorTo(t, 'Firing range'), elec = doorTo(t, 'Electrical room');
    still(t);
    soundZone(t, 'muster');
    hold(t, LOCKDOWN.draw + 0.2);
    expect(range.down && elec.down).toBe(true);
    brk(t, 'Muster hall west').act(); // the hall's branch, which the range's door is on
    hold(t, 0.1);
    expect(range.down).toBe(false);
    expect(elec.down).toBe(true); // on Ops' own bus
  });

  it('taken in the electrical room, you are bolted in with it: the door goes while you get your bearings', () => {
    const s = fresh(), c = board(s), d = doorTo(s, 'Electrical room');
    still(s);
    inside(s);
    until(s, c);
    pace(s, EYES.hold + 0.1);
    expect(s.alarms.map(a => a.zone)).toEqual(['muster']);
    expect(d.drawing).toBeGreaterThan(0);
    hold(s, LOCKDOWN.draw);
    expect(d.down).toBe(true);
  });

  it('a save made while the bolts are drawn and home plays on the same', () => {
    const s = fresh();
    still(s);
    soundZone(s, 'muster');
    hold(s, 0.5);
    const a = load(level, JSON.parse(JSON.stringify(save(s))), { seed: 7, station: STATION });
    hold(s, 2); hold(a, 2);
    expect(JSON.stringify(save(a))).toBe(JSON.stringify(save(s)));
    expect(a.doors.some(d => d.down)).toBe(true);
  });
});

describe('call points', () => {
  const callIn = (s: Sim, zone: string) => {
    const ui = level.uses.findIndex(u => u.kind === 'call' && u.opts.zone === zone);
    return s.usables.find(u => u.key === 'use' + ui)!;
  };

  it('one a zone', () => {
    expect(level.uses.filter(u => u.kind === 'call').map(u => u.opts.zone).sort()).toEqual(['atrium', 'muster', 'ops', 'wing']);
  });

  it('break the glass and its zone sounds, with all that follows: the changed hurry to it, and the zone locks down', () => {
    const s = fresh(), u = callIn(s, 'muster');
    for (const m of s.cast) if (m.ai !== 'husk' || m.post) m.stun = 1e9;
    place(s, 39, -4.5, -15);
    hold(s, 0.2);
    expect(u.label()).toBe('Call point');
    s.game.noiseI = 0;
    u.act(); // bare hands: it is made for a thumb
    expect(s.alarms.map(a => a.zone)).toEqual(['muster']);
    expect(s.game.noiseI).toBeGreaterThan(0);
    hold(s, 0.1);
    expect(s.cast.some(m => m.state === 'answer')).toBe(true);
    hold(s, LOCKDOWN.draw);
    expect(s.doors.some(d => d.down && doorZones(s.world, d).includes('muster'))).toBe(true);
  });

  it('once: the glass is gone, and a save keeps it gone', () => {
    const s = fresh(), u = callIn(s, 'ops');
    still(s);
    u.act();
    expect(u.off).toBe(true);
    const t = load(level, JSON.parse(JSON.stringify(save(s))), { station: STATION });
    expect(callIn(t, 'ops').off).toBe(true);
    expect(callIn(t, 'wing').off).toBeFalsy();
  });

  it('a zone with its speaker smashed has no voice: the glass goes and nothing sounds', () => {
    const s = fresh(), u = callIn(s, 'atrium');
    still(s);
    s.mute.push('atrium');
    u.act();
    expect(u.off).toBe(true);
    expect(s.alarms).toEqual([]);
  });

  it('the dead wing\'s still sounds: its PA is critical power, though its doors have none to bolt', () => {
    const s = fresh(), u = callIn(s, 'wing');
    still(s);
    u.act();
    expect(s.alarms.map(a => a.zone)).toEqual(['wing']);
    hold(s, LOCKDOWN.draw + 0.2);
    expect(s.doors.some(d => d.down)).toBe(false);
  });
});

describe('the booth\'s monitors', () => {
  const console_ = (s: Sim) => s.usables.find(u => u.key === 'use' + level.uses.findIndex(q => q.kind === 'watch' && q.opts.c === 'SEC'))!;
  const mended = () => { const s = fresh(); still(s); s.game.station!.circuits.SEC.broken = false; s.lighting = null; hold(s, 0.1); return s; };
  const press = (s: Sim, inp: Partial<Input>) => { step(s, { ...noInput(), ...inp }); step(s, noInput()); };

  it('dark until the wing is mended', () => {
    const s = fresh(), u = console_(s);
    still(s);
    expect(u.label()).toBe('Monitors');
    u.act();
    expect(s.watch).toBeNull();
  });

  it('sat at them, you see the lobby, the checkpoint, the surface landing and the shaft station, a feed a press', () => {
    const s = mended(), u = console_(s);
    expect(u.label()).toBe('Monitors');
    u.act();
    expect(s.watch).not.toBeNull();
    const names = () => onScreen(s)!.cam.def.name;
    expect(names()).toBe('Lobby');
    expect(onScreen(s)!.live).toBe(true);
    const seen = [names()];
    for (let k = 0; k < 3; k++) { press(s, { strafe: 1 }); seen.push(names()!); }
    expect(seen).toEqual(['Lobby', 'Checkpoint', 'Surface landing', 'Shaft station']);
    press(s, { strafe: 1 });
    expect(names()).toBe('Lobby'); // round again
    press(s, { strafe: -1 });
    expect(names()).toBe('Shaft station');
    for (let k = 0; k < 30; k++) step(s, { ...noInput(), strafe: 1 }); // held, it is one press
    expect(names()).toBe('Lobby');
  });

  it('while you watch you do nothing else, and there is nothing to use', () => {
    const s = mended();
    console_(s).act();
    const b = s.player.body, x = b.x, z = b.z;
    hold(s, 0.5); for (let t = 0; t < 1; t += STEP) step(s, { ...noInput(), forward: 1, run: true });
    expect(Math.hypot(b.x - x, b.z - z)).toBeLessThan(0.05);
    expect(s.focus).toBeNull();
  });

  it('use stands you up; so does being hurt, or the screens losing their power', () => {
    const s = mended();
    console_(s).act();
    press(s, { use: true });
    expect(s.watch).toBeNull();
    console_(s).act();
    s.game.hp -= 5;
    step(s, noInput());
    expect(s.watch).toBeNull();
    console_(s).act();
    s.game.station!.circuits.SEC.broken = true; s.lighting = null;
    step(s, noInput());
    expect(s.watch).toBeNull();
  });

  it('a camera smashed sends nothing', () => {
    const s = mended();
    s.cams.find(c => c.def.name === 'Lobby')!.broken = true;
    console_(s).act();
    expect(onScreen(s)!.live).toBe(false);
  });

  it('with the wing\'s comms switch smashed, none of its feeds sends anything', () => {
    const s = mended();
    s.blind.push('SEC');
    console_(s).act();
    expect(onScreen(s)!.live).toBe(false);
  });
});

describe('the duty office\'s screen', () => {
  const console_ = (s: Sim) => s.usables.find(u => u.key === 'use' + level.uses.findIndex(q => q.kind === 'watch' && q.opts.c === 'OPS'))!;
  const name = (s: Sim) => onScreen(s)!.cam.def.name;
  const brk = (s: Sim, n: string) => s.usables.find(u => new RegExp('Breaker, ' + n).test(u.label() ?? ''))!;

  it('on Ops\' power from the start: the hall\'s cameras and the rooms off it, a sequencer stepping through them', () => {
    const s = fresh(), u = console_(s);
    still(s);
    expect(u.label()).toBe('Monitors');
    u.act();
    const seen = [name(s)];
    for (let k = 0; k < 5; k++) { hold(s, 5.05); seen.push(name(s)!); }
    expect(seen).toEqual(['Muster court', 'East bays', 'Electrical room', 'Armory', 'Firing range', 'Operations stair']);
    hold(s, 5.05);
    expect(name(s)).toBe('Muster court'); // round again
  });

  it('a press steps it at once, and the sequencer waits its full time after', () => {
    const s = fresh();
    still(s);
    console_(s).act();
    hold(s, 4);
    step(s, { ...noInput(), strafe: 1 }); step(s, noInput());
    expect(name(s)).toBe('East bays');
    hold(s, 4);
    expect(name(s)).toBe('East bays');
    hold(s, 1.2);
    expect(name(s)).toBe('Electrical room');
  });

  it('a branch you have opened is black on it', () => {
    const s = fresh();
    still(s);
    brk(s, 'Muster hall west').act();
    console_(s).act();
    const live: Record<string, boolean> = {};
    for (let k = 0; k < 6; k++) { live[name(s)!] = onScreen(s)!.live; step(s, { ...noInput(), strafe: 1 }); step(s, noInput()); }
    expect(live).toEqual({ 'Muster court': false, 'East bays': true, 'Electrical room': false, Armory: false, 'Firing range': false, 'Operations stair': true });
  });
});

describe('the operations room', () => {
  it('its door is grown shut: no way in on the first pass', () => {
    const s = fresh();
    const d = s.doors.find(q => q.def.seal && !q.def.glass && Math.abs(q.def.y0 - 5) < 0.1)!;
    expect(d).toBeTruthy();
    s.game.events.length = 0;
    doorAct(s, d);
    expect(s.game.events.some(e => e.type === 'say' && /Bodies/.test(e.text))).toBe(true);
  });
});

describe('the power-failure drill', () => {
  const brk = (s: Sim, name: string) => s.usables.find(u => new RegExp('Breaker, ' + name).test(u.label() ?? ''))!;
  /** a husk on its rounds put in the hall's east bays, which have their own breaker; everything else still */
  const setUp = () => {
    const s = fresh(), m = s.cast.find(q => q.ai === 'husk' && !q.post)!;
    for (const q of s.cast) if (q !== m) q.stun = 1e9;
    place(s, 39, -4.5, -15); // you, out of it all, a storey down
    const b = m.body!; b.x = m.x = 70; b.y = m.y = 0; b.z = m.z = 36; b.sync();
    hold(s, 0.2);
    return { s, m };
  };

  it('those an opened breaker leaves in the dark are each given a time to go, within three minutes; posts and the lit are not', () => {
    const { s, m } = setUp();
    brk(s, 'Muster hall east').act();
    expect(s.drills.length).toBe(1);
    const D = s.drills[0];
    expect(D.c).toBe('EAST');
    const post = s.cast.find(q => q.post && q.y > 4)!; // the one kept at the grown door, in the dark with it
    expect(D.due.map(e => e.id)).toContain(m.id);
    expect(D.due.map(e => e.id)).not.toContain(post.id);
    for (const e of D.due) {
      expect(e.at).toBeGreaterThan(0);
      expect(e.at).toBeLessThanOrEqual(180);
      const q = s.cast[e.id];
      expect(s.world.roomAt(q.x, q.y + 0.5, q.z)?.circuit).toBe('EAST'); // every one of them caught by this breaker
    }
  });

  it('one sent goes to the board and throws the breaker back on, and it is heard', () => {
    const { s, m } = setUp();
    brk(s, 'Muster hall east').act();
    for (const e of s.drills[0].due) e.at = e.id === m.id ? 0.3 : 1e9;
    hold(s, 0.5);
    expect(m.state).toBe('fix');
    s.game.events.length = 0;
    let back = false;
    for (let t = 0; t < 90 && !back; t += STEP) { step(s, noInput()); back = s.game.station!.circuits.EAST.on; }
    expect(back).toBe(true);
    expect(sounded(s, 'clang')).toBe(true);
    expect(s.drills).toEqual([]);
  });

  it('one who reaches the light has stopped noticing: the breaker stays open', () => {
    const { s, m } = setUp();
    brk(s, 'Muster hall east').act();
    const b = m.body!; b.x = m.x = 30; b.z = m.z = 36; b.sync(); // into the lit west end
    for (const e of s.drills[0].due) e.at = e.id === m.id ? 0.3 : 1e9;
    hold(s, 1);
    expect(m.state).not.toBe('fix');
    expect(s.game.station!.circuits.EAST.on).toBe(false);
  });

  it('a save made while one goes to the board plays on the same', () => {
    const { s, m } = setUp();
    brk(s, 'Muster hall east').act();
    for (const e of s.drills[0].due) e.at = e.id === m.id ? 0.3 : 1e9;
    hold(s, 2);
    const a = load(level, JSON.parse(JSON.stringify(save(s))), { seed: 7, station: STATION });
    hold(s, 3); hold(a, 3);
    expect(JSON.stringify(save(a))).toBe(JSON.stringify(save(s)));
  });
});

describe('the electrical room\'s board', () => {
  const brk = (s: Sim, name: string) => s.usables.find(u => new RegExp('Breaker, ' + name).test(u.label() ?? ''))!;

  it('breaks Ops out to the hall and its east bays, side by side; its schedule says the operations room and the PA are not on it', () => {
    const s = fresh(), b = ['Muster hall west', 'Muster hall east'].map(n => brk(s, n));
    for (const u of b) expect(u.label()).toMatch(/: closed$/);
    expect(Math.hypot(b[1].x - b[0].x, b[1].z - b[0].z)).toBeLessThan(4);
    expect(s.usables.filter(u => /^Breaker, /.test(u.label() ?? '')).length).toBe(2);
    const sched = s.usables.find(u => u.label() === 'Panel schedule')!;
    s.game.events.length = 0;
    sched.act();
    expect(s.game.events.some(e => e.type === 'say' && /CRITICAL LOADS.*NOT ON THIS BOARD/.test(e.text))).toBe(true);
  });

  it('the hall\'s breaker darkens it and its own cameras; the east bays keep theirs, and its speaker still sounds', () => {
    const s = fresh();
    still(s);
    brk(s, 'Muster hall west').act();
    const hall = s.cams.filter(c => c.def.zone === 'muster');
    expect(hall.length).toBe(4);
    for (const c of hall) expect(power(s.game, c.def.circuit)).toBe(0);
    expect(s.cams.filter(c => c.def.circuit === 'EAST').every(c => power(s.game, c.def.circuit) === 1)).toBe(true);
    soundZone(s, 'muster'); // the PA is wired from critical power, not from the hall's lights
    expect(s.alarms.map(a => a.zone)).toEqual(['muster']);
  });

  it('the PA is critical power: every speaker is on it, and no breaker on the board touches it', () => {
    const s = fresh();
    expect(level.speakers!.every(S => S.pa === 'CRIT')).toBe(true);
    expect(s.usables.some(u => /Breaker, .*(PA|critical)/i.test(u.label() ?? ''))).toBe(false);
  });
});

describe('a smashed speaker', () => {
  /** look at a thing from where you stand */
  const lookAt = (s: Sim, x: number, y: number, z: number) => {
    const p = s.player, b = p.body, dx = x - b.x, dz = z - b.z, dy = y - (b.y + 1.6);
    p.yaw = Math.atan2(-dx, -dz); p.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  };
  const speakerUse = (s: Sim, zone: string) => {
    const S = level.speakers!.find(q => q.zone === zone)!;
    return s.usables.find(u => u.x === S.x && u.z === S.z && u.y > S.y + 3)!;
  };

  it('the Operations corridor\'s (the overseer\'s zone) is in reach from the floor; smashing it takes something in your hand, and is loud', () => {
    const s = fresh(), u = speakerUse(s, 'ops');
    still(s);
    place(s, 77, 0, 20.6);
    hold(s, 0.1);
    lookAt(s, u.x, u.y, u.z);
    expect(findUsable(s)?.text).toBe('Speaker');
    u.act();
    expect(s.mute).toEqual([]); // bare hands
    give(s.game, 'baton');
    s.game.noiseI = 0;
    u.act();
    expect(s.mute).toEqual(['ops']);
    expect(s.game.noiseI).toBeGreaterThanOrEqual(14);
    expect(u.label()).toBeNull();
  });

  it('the atrium\'s hangs high in the well: out of reach from the floor, in reach leaning from the gallery\'s rail', () => {
    const s = fresh(), u = speakerUse(s, 'atrium');
    still(s);
    place(s, u.x, 0, u.z);
    hold(s, 0.1);
    lookAt(s, u.x, u.y, u.z);
    expect(findUsable(s)?.text).not.toBe('Speaker');
    place(s, 84.5, 5, u.z); // on the east gallery, at the rail
    hold(s, 0.1);
    expect(s.player.body.x).toBeGreaterThan(84);
    lookAt(s, u.x, u.y, u.z);
    expect(findUsable(s)?.text).toBe('Speaker');
  });

  it('not from the deck above: only from under it', () => {
    const s = fresh(), u = speakerUse(s, 'ops');
    s.player.body.y = 5;
    expect(u.label()).toBeNull();
  });

  it('the zone has no voice: seen there, no alarm sounds and no husk comes', () => {
    const s = fresh(), m = s.cast[1];
    for (const q of s.cast) if (q !== m) q.stun = 1e9;
    s.mute.push('ops');
    place(s, 87.5, 0, 19.6); // in the chief's outer office, armed, near its camera and in its view
    s.player.yaw = 0;
    s.game.events.length = 0;
    pace(s, EYES.hold + 0.6);
    expect(s.cams.some(c => c.tripped)).toBe(true); // it saw you
    hold(s, 2);
    expect(s.alarms).toEqual([]);
    expect(sounded(s, 'klaxon')).toBe(false);
    expect(m.state).not.toBe('answer');
    /* sounded any other way, it does not sound at all */
    const t = fresh();
    t.mute.push('wing');
    soundZone(t, 'wing');
    expect(t.alarms).toEqual([]);
  });

  it('smashed while it sounds, the klaxon stops at its next round', () => {
    const s = fresh();
    still(s);
    place(s, 39, -4.5, -15);
    soundZone(s, 'atrium');
    hold(s, 2);
    s.mute.push('atrium');
    s.game.events.length = 0;
    hold(s, 3);
    expect(sounded(s, 'klaxon')).toBe(false);
  });

  it('a save keeps it smashed', () => {
    const s = fresh();
    s.mute.push('ops');
    const t = load(level, save(s), { station: STATION });
    expect(t.mute).toEqual(['ops']);
  });
});
