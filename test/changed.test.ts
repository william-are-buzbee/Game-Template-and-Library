import { describe, expect, it } from 'vitest';
import { STATION } from '../src/content/station';
import { buildMain } from '../src/content/levels/main';
import { makeSim, step, type Sim } from '../src/sim/sim';
import { noInput } from '../src/sim/input';
import { STEP } from '../src/core/loop';
import { field } from '../src/world/nav';
import { carded, routeRules } from '../src/sim/fields';
import { answer, type Mutant } from '../src/sim/cast';
import { locked } from '../src/sim/movers';
import { doorAct } from '../src/sim/interact';
import { fresh, hold, upper } from './kit';

/* The changed (world.md §8, The second pass): Security's staff, intelligent but sedated. They carry their cards. */

const level = upper();
function place(s: Sim, who: Mutant | 'player', x: number, y: number, z: number): void {
  const b = who === 'player' ? s.player.body : who.body!;
  b.x = x; b.y = y; b.z = z; b.vy = 0; b.sync();
  if (who !== 'player') { who.x = who.px = x; who.y = who.py = y; who.z = who.pz = z; }
}
const only = (s: Sim, keep: Mutant[]) => { for (const m of s.cast) if (!keep.includes(m)) m.stun = 1e9; };
const roomOf = (s: Sim, m: Mutant) => s.world.roomAt(m.x, m.y + 0.5, m.z)?.name;
/** the briefing room's card door, off the wing's corridor */
const briefDoor = (s: Sim) => s.doors.find(d => d.def.card === 's' && !d.def.failsafe)!; // (room 3's in the suite takes it too)
/** send one of the staff to a spot, as an alarm would: the way there by the level's shape, doors met as they come */
const sendTo = (s: Sim, m: Mutant, x: number, z: number) => {
  const F = s.fields!, spot = F.nav.locate(x, 0, z);
  answer(s, m, spot, field(F.nav, spot, routeRules(s, F, m.walker)));
};
/** a husk on its rounds, put in the wing's corridor by the briefing room's door; you out of it all, a storey down */
const setUp = (mended: boolean) => {
  const s = fresh(), m = s.cast.find(q => q.ai === 'husk' && !q.post && q.cards)!;
  only(s, [m]);
  if (mended) { s.game.station!.circuits.SEC.broken = false; s.lighting = null; }
  place(s, 'player', 39, -4.5, -15);
  place(s, m, 63, 0, -1);
  hold(s, 0.2);
  return { s, m };
};

describe('they carry their cards', () => {
  it('a card door with power lets one of them through, then shuts behind it, still locked to you', () => {
    const { s, m } = setUp(true), d = briefDoor(s);
    expect(carded(s, d)).toBe(true);
    s.game.events.length = 0;
    sendTo(s, m, 63, -11);
    let through = false;
    for (let t = 0; t < 20 && !through; t += STEP) { step(s, noInput()); through = roomOf(s, m) === 'Briefing room'; }
    expect(through).toBe(true);
    expect(s.game.events.some(e => e.type === 'sfx' && e.name === 'take')).toBe(true); // the reader's beep
    hold(s, 6);
    expect(d.t).toBeLessThan(0.1);
    expect(locked(d)).toBe(true);
    s.game.events.length = 0;
    doorAct(s, d);
    expect(s.game.events.some(e => e.type === 'say' && /^Needs the /.test(e.text))).toBe(true);
  });

  it('a dark reader reads no card: with the wing cut, the door holds them as it holds you', () => {
    const { s, m } = setUp(false);
    expect(carded(s, briefDoor(s))).toBe(false);
    sendTo(s, m, 63, -11);
    hold(s, 12);
    expect(roomOf(s, m)).not.toBe('Briefing room');
  });

  it('a lockdown\'s bolt beats a card', () => {
    const { s } = setUp(true), d = briefDoor(s);
    d.down = true;
    expect(carded(s, d)).toBe(false);
  });

  it('only Security\'s own staff carry them: Cargo\'s keep to their dark, the card door between them shut', () => {
    const s = fresh(), staff = s.cast.filter(q => q.ai === 'husk' && q.cards).map(q => roomOf(s, q));
    expect(staff.length).toBeGreaterThan(3);
    expect(staff).not.toContain('Cargo cavern');
    expect(s.cast.filter(q => q.ai === 'husk' && roomOf(s, q) === 'Cargo cavern').every(q => !q.cards)).toBe(true);
  });

  it('only Security\'s staff carry them: elsewhere a card door keeps out what lives there', () => {
    const s = makeSim(buildMain(STATION.ladders), { seed: 7, station: STATION });
    const d = s.doors.find(q => q.def.card)!;
    expect(d).toBeTruthy();
    expect(carded(s, d)).toBe(false);
  });
});

describe('a breaker thrown means someone threw it', () => {
  const brk = (s: Sim, name: string) => s.usables.find(u => new RegExp('Breaker, ' + name).test(u.label() ?? ''))!;
  /** one of the staff in the east bays, which have their own breaker, sent at once to throw it back; you out of it all */
  const setUp = () => {
    const s = fresh(), m = s.cast.find(q => q.ai === 'husk' && !q.post && q.cards)!;
    only(s, [m]);
    place(s, 'player', 39, -4.5, -15);
    place(s, m, 70, 0, 36);
    hold(s, 0.2);
    brk(s, 'Muster hall east').act();
    for (const e of s.drills[0].due) e.at = e.id === m.id ? 0.3 : 1e9;
    for (let t = 0; t < 120 && !s.game.station!.circuits.EAST.on; t += STEP) step(s, noInput());
    expect(s.game.station!.circuits.EAST.on).toBe(true);
    return { s, m, board: { x: m.x, z: m.z } };
  };

  it('back on, it looks about the board a while for who threw it, slowly, then goes back to its rounds', () => {
    const { s, m, board } = setUp();
    expect(m.state).toBe('search');
    let far = 0, fastest = 0, t = 0;
    for (; t < 30 && m.state === 'search'; t += STEP) {
      step(s, noInput());
      far = Math.max(far, Math.hypot(m.x - board.x, m.z - board.z));
      fastest = Math.max(fastest, Math.hypot(m.body!.vx, m.body!.vz));
    }
    expect(t).toBeGreaterThan(12);
    expect(far).toBeGreaterThan(1.5); // it moves about
    expect(far).toBeLessThan(8); // about the board
    expect(fastest).toBeLessThan(1.5); // slowly
    expect(m.state).toBe('idle');
  });

  it('looking, it sees all round: behind it, where on its rounds it would not', () => {
    const { s, m } = setUp();
    const behind = (q: Mutant) => { const b = s.player.body; place(s, 'player', q.x - Math.sin(q.yaw) * 3.5, q.y, q.z - Math.cos(q.yaw) * 3.5); b.vx = b.vz = 0; };
    s.game.lightOn = true; s.game.batt = 100;
    m.wt = 5; // stopped, looking the other way
    behind(m);
    expect(s.world.roomAt(s.player.body.x, s.player.body.y + 0.5, s.player.body.z)?.name).toBe(s.world.roomAt(m.x, m.y + 0.5, m.z)?.name);
    hold(s, 0.3);
    expect(m.state).toBe('hunt');
    /* the same, but on its rounds, standing: it does not turn round for you */
    const t = setUp(), q = t.m;
    q.state = 'idle'; q.dest = -1; q.wt = 5;
    t.s.game.lightOn = true; t.s.game.batt = 100;
    const b = t.s.player.body; place(t.s, 'player', q.x - Math.sin(q.yaw) * 3.5, q.y, q.z - Math.cos(q.yaw) * 3.5); b.vx = b.vz = 0;
    hold(t.s, 0.3);
    expect(q.state).toBe('idle');
  });

  it('a save made while it searches plays on the same', async () => {
    const { s } = setUp();
    hold(s, 3);
    const { load, save } = await import('../src/sim/save');
    const a = load(level, JSON.parse(JSON.stringify(save(s))), { seed: 7, station: STATION });
    hold(s, 6); hold(a, 6);
    expect(JSON.stringify(save(a))).toBe(JSON.stringify(save(s)));
  });
});

describe('a door left open is noticed', () => {
  /** the Armory's heavy door, off the muster hall: with Gen-1 up it opens to its button and stays as it was left */
  const armory = (s: Sim) => s.doors.findIndex(d => d.def.kind === 'heavy' && d.def.code === 1);
  /** two of the staff in the hall south of it, one facing it (north), one facing away; Gen-1 up; you out of it all. Two
   *  that keep no round, so between their wanderings they stand */
  const setUp = (yaw = Math.PI) => {
    const s = fresh(), staff = s.cast.filter(q => q.ai === 'husk' && !q.post && q.cards && !q.round).slice(0, 2), [m, n] = staff;
    only(s, staff);
    s.game.station!.main = true; s.lighting = null;
    const k = armory(s), d = s.doors[k], cx = (d.def.x0 + d.def.x1) / 2, cz = (d.def.z0 + d.def.z1) / 2;
    place(s, 'player', 39, -4.5, -15);
    place(s, m, cx, 0, cz + 7); m.yaw = yaw; m.wt = 30; m.dest = -1; // standing, between rounds
    place(s, n, cx - 3, 0, cz + 8); n.yaw = Math.PI; n.wt = 30; n.dest = -1;
    hold(s, 0.2);
    d.open = true; // left open
    return { s, m, n, k, d };
  };

  it('one on its rounds that sees it walks over, looks through, and shuts it; only one goes', () => {
    const { s, m, n, k, d } = setUp();
    hold(s, 1.5);
    const going = [m, n].filter(q => q.state === 'shut');
    expect(going.length).toBe(1);
    expect(going[0].door).toBe(k);
    s.game.events.length = 0;
    for (let t = 0; t < 20 && d.open; t += STEP) step(s, noInput());
    expect(d.open).toBe(false);
    expect(s.game.events.some(e => e.type === 'sfx' && e.name === 'door')).toBe(true);
    hold(s, 0.5);
    expect(going[0].state).toBe('idle');
  });

  it('not one at its back', () => {
    const { s, m, n, d } = setUp(0);
    n.stun = 1e9; // only the one facing away
    hold(s, 3);
    expect(m.state).toBe('idle');
    expect(d.open).toBe(true);
  });

  it('a save made while one goes to it plays on the same', async () => {
    const { s } = setUp();
    hold(s, 2);
    const { load, save } = await import('../src/sim/save');
    const a = load(level, JSON.parse(JSON.stringify(save(s))), { seed: 7, station: STATION });
    hold(s, 5); hold(a, 5);
    expect(JSON.stringify(save(a))).toBe(JSON.stringify(save(s)));
  });
});
