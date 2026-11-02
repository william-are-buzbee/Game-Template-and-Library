import { describe, expect, it } from 'vitest';
import { STATION } from '../src/content/station';
import { makeSim, step, type Sim } from '../src/sim/sim';
import { noInput } from '../src/sim/input';
import { power } from '../src/sim/game';
import { eyeHeight } from '../src/sim/player';
import type { Usable } from '../src/sim/interact';
import { circle } from '../src/world/shapes';
import { fresh, hold, upper } from './kit';

/* The upper station's gates, played headless through the real interaction: stand near a thing, look at it, press E. */

const level = upper();
const said = (s: Sim) => s.game.events.filter(e => e.type === 'say').map(e => (e as { text: string }).text);

/** the usable whose label matches, nearest to (x, z) if given */
function find(s: Sim, label: RegExp, near?: [number, number]): Usable {
  const all = s.usables.filter(u => !u.off && label.test(u.label() ?? ''));
  if (!all.length) throw new Error('nothing labelled ' + label);
  if (near) all.sort((a, b) => Math.hypot(a.x - near[0], a.z - near[1]) - Math.hypot(b.x - near[0], b.z - near[1]));
  return all[0];
}
/** stand 1.1 m from it on the side `from` (a unit vector on the plan), look straight at it, press E */
function use(s: Sim, u: Usable, from: [number, number]): string | null {
  const b = s.player.body;
  b.x = u.x + from[0] * 1.1; b.z = u.z + from[1] * 1.1; b.vy = 0;
  b.y = s.world.groundBelow(circle(b.x, b.z, b.r), u.y + 0.2); // the floor at its own height, not wherever you were
  b.sync();
  step(s, noInput()); // settle onto the floor there
  const p = s.player, dx = u.x - b.x, dz = u.z - b.z, dy = u.y - (b.y + eyeHeight(p));
  p.yaw = Math.atan2(-dx, -dz);
  p.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  s.game.events.length = 0;
  step(s, { ...noInput(), use: true });
  return s.focus?.text ?? null;
}
const doorAt = (s: Sim, x: number, z: number) => s.doors.find(d => x > d.def.x0 - 1 && x < d.def.x1 + 1 && z > d.def.z0 - 1 && z < d.def.z1 + 1)!;
/** plan metres of tile (i, j)'s centre on the upper station */
const tile = (i: number, j: number): [number, number] => [i * 2 - 10 + 1, j * 2 - 30 + 1];

describe('the upper station, played', () => {
  it('starts on the backup set: Ops half-lit, the wing cut off, Cargo dead, Gen-1 down', () => {
    const s = fresh();
    expect(power(s.game, 'OPS')).toBe(1);
    expect(power(s.game, 'SEC')).toBe(0);
    expect(power(s.game, 'CARGO')).toBe(0);
    expect(power(s.game, 'LIFT')).toBe(0);
  });

  it('the wing\'s cut wants a splice kit; mended, it takes what Ops has, and its elevator goes down', () => {
    const s = fresh();
    use(s, find(s, /^Elevator$/), [-1, 0]);
    expect(said(s).join(' ')).toMatch(/No power/);
    const cut = find(s, /Service connection, Security wing: cut through/);
    use(s, cut, [0, 1]);
    expect(said(s).join(' ')).toMatch(/Needs a splice kit/);
    expect(power(s.game, 'SEC')).toBe(0);
    use(s, find(s, /^Splice kit$/, tile(47, 31)), [0, -1]); // the one in Maintenance, on Ops' side
    use(s, cut, [0, 1]);
    expect(cut.label()).toMatch(/: closed$/);
    expect(s.game.inv.some(i => i.id === 'kit')).toBe(false);
    expect(power(s.game, 'SEC')).toBe(1); // Ops' backup set, through the mended feed
    use(s, find(s, /^Elevator$/), [-1, 0]);
    expect(s.game.travel).toEqual({ level: 'main', mark: 'elev:upper' }); // the run takes you down
    s.game.travel = null;
    s.game.station!.circuits.OPS.back = false; // Ops' set stopped: the wing goes with it
    expect(power(s.game, 'SEC')).toBe(0);
    s.game.station!.main = true; // and on Gen-1, the wing has full power
    expect(power(s.game, 'SEC')).toBe(2);
    use(s, cut, [0, 1]);
    expect(cut.label()).toMatch(/: open$/);
    expect(power(s.game, 'SEC')).toBe(0);
  });

  it('a flashlight lies at the stair\'s foot, off; taken and switched on, the dark has an answer', () => {
    const s = fresh();
    hold(s, 0.1, { light: true });
    expect(s.game.lightOn).toBe(false); // nothing to switch on yet
    const F = find(s, /^Flashlight$/), it = s.items.find(i => i.id === 'flash')!;
    expect(it.on).toBeUndefined();
    use(s, F, [0, 1]);
    expect(s.game.tools).toContain('flash');
    expect(s.game.lightOn).toBe(false); // in your hand now, off
    hold(s, 0.1, { light: true });
    expect(s.game.lightOn).toBe(true);
    const before = s.game.batt;
    hold(s, 3);
    expect(s.game.batt).toBeLessThan(before);
    hold(s, 0.1, { light: true });
    expect(s.game.lightOn).toBe(false);
  });

  it('The briefing room\'s reader is dark while the wing is; mended, it wants the officer\'s card, and takes it', () => {
    const s = fresh();
    const [cx, cz] = tile(36, 12), d = doorAt(s, cx, cz);
    use(s, find(s, /Card reader/, [cx, cz]), [0, 1]);
    expect(said(s).join(' ')).toMatch(/No power/);
    s.game.station!.circuits.SEC.broken = false; // as if the cut were mended
    use(s, find(s, /Card reader/, [cx, cz]), [0, 1]);
    expect(said(s).join(' ')).toMatch(/Needs the Security keycard/);
    hold(s, 1);
    expect(d.t).toBe(0); // locked: it does not open for you
    use(s, find(s, /^Officer$/), [1, 0]);
    expect(s.game.keys).toContain('s');
    use(s, find(s, /Card reader/, [cx, cz]), [0, 1]);
    expect(d.unlocked).toBe(true);
    const b = s.player.body; b.x = cx; b.z = cz + 2.2; b.sync();
    hold(s, 1.5);
    expect(d.t).toBeGreaterThan(0.9);
  });

  it('heavy doors will not move on the backup set; on Gen-1 the Armory keypad wants the run\'s code', () => {
    const s = fresh();
    const [ax, az] = tile(32, 26);
    expect(find(s, /^Heavy door$/, [ax, az])).toBeTruthy();
    use(s, find(s, /Heavy door/, [ax, az]), [0, 1]);
    expect(said(s).join(' ')).toMatch(/Not on the backup/);
    s.game.station!.main = true; // as if Gen-1 had been brought back
    use(s, find(s, /Keypad/, [ax, az]), [0, 1]);
    expect(s.game.pad).not.toBeNull();
    for (const k of '0000') s.game.commands.push({ type: 'pad', key: k });
    step(s, noInput());
    if (s.game.code !== '0000') expect(s.game.pad?.typed).toBe(''); // wrong: it clears and waits
    for (const k of s.game.code) s.game.commands.push({ type: 'pad', key: k });
    step(s, noInput());
    expect(s.game.pad).toBeNull();
    use(s, find(s, /^Door control$/, [ax, az]), [0, 1]);
    hold(s, 1.5);
    expect(doorAt(s, ax, az).t).toBeGreaterThan(0.9);
  });

  it('with Cargo dead its doors slide by hand and its hoist will not move; its backup set changes both', () => {
    const s = fresh();
    for (const m of s.cast) m.stun = 1e9; // the door opened by hand brings receiving's cast to it: held still, as this is not theirs
    const [dx, dz] = tile(59, 14), d = doorAt(s, dx, dz);
    expect(d.def.circuit).toBe('CARGO');
    use(s, find(s, /^Door$/, [dx, dz]), [-1, 0]);
    hold(s, 1);
    expect(d.t).toBeGreaterThan(0.9);
    /* step into the personnel hoist's car: its button offers the ride up, and without power refuses */
    const P = s.platforms.find(p => p.def.call?.name === 'Personnel hoist')!, b = s.player.body;
    expect(P.def.y1).toBe(15); // the floor to the top deck
    const onto = () => { b.x = (P.def.x0 + P.def.x1) / 2; b.z = (P.def.z0 + P.def.z1) / 2 + 1; b.y = 0; b.sync(); hold(s, 0.3); };
    const mid: [number, number] = [(P.def.x0 + P.def.x1) / 2, (P.def.z0 + P.def.z1) / 2];
    onto();
    use(s, find(s, /^Personnel hoist$/, mid), [0, 1]);
    expect(said(s).join(' ')).toMatch(/No power/);
    expect(P.moving).toBe(false);
    const set = s.world.def.uses.find(u => u.kind === 'backup' && (u.opts as { c?: string }).c === 'CARGO')!;
    expect(s.world.roomAt(set.x, set.y, set.z)?.name).toBe('Receiving office'); // behind Operations' card, with the nave
    use(s, find(s, /^Backup set: stopped$/, [set.x, set.z]), [0, 1]);
    expect(power(s.game, 'CARGO')).toBe(1);
    expect(s.game.events.some(e => e.type === 'power')).toBe(true);
    /* now it answers: ride it up to the top deck */
    onto();
    use(s, find(s, /^Personnel hoist$/, mid), [0, 1]);
    expect(P.moving).toBe(true);
    hold(s, 11);
    expect(P.y).toBeCloseTo(15);
    expect(b.y).toBeCloseTo(15, 1);
  });

  it('Cargo\'s fire shutters came down with the power: no way past them from either side until its set runs, then they rise at their controls; one stopped on a pallet, too low to get under', () => {
    const s = fresh();
    for (const m of s.cast) m.stun = 1e9;
    const shutters = s.doors.filter(d => d.def.fire);
    expect(shutters.length).toBe(4); // three to the nave, one to the freight hall
    const low = shutters.filter(d => d.def.low);
    expect(low.length).toBe(1);
    const open = shutters.filter(d => !d.def.low);
    const mid = (d: (typeof shutters)[number]): [number, number] => [(d.def.x0 + d.def.x1) / 2, (d.def.z0 + d.def.z1) / 2];
    for (const d of open) {
      const [x, z] = mid(d);
      for (const side of [[0, -1], [0, 1], [-1, 0], [1, 0]] as [number, number][]) {
        const u = s.usables.find(q => !q.off && q.label() === 'Fire shutter' && Math.hypot(q.x - x, q.z - z) < 3);
        if (!u) continue;
        use(s, u, side);
        expect(said(s).join(' ')).toMatch(/No power/);
        hold(s, 1);
        expect(d.t).toBeLessThan(0.05);
        break;
      }
    }
    /* the one on the pallet: its foot 0.6 m up, under a crouch (1 m), and sealed, whatever the power */
    const L = low[0];
    expect(L.t * (L.def.y1 - L.def.y0)).toBeCloseTo(0.6, 1);
    s.game.station!.circuits.CARGO.back = true;
    hold(s, 0.5);
    for (const d of open) {
      const [x, z] = mid(d);
      use(s, find(s, /^Shutter control$/, [x, z]), d.def.alongX ? [0, -1] : [-1, 0]);
      hold(s, 1.5);
      expect(d.t, `shutter at ${x}, ${z}`).toBeGreaterThan(0.9);
    }
    hold(s, 1);
    expect(L.t * (L.def.y1 - L.def.y0)).toBeCloseTo(0.6, 1);
  });

  it('the crane\'s ladder is climbed: walk at it and up it to the cab\'s platform, step off at the top, and back down it looking down', () => {
    const s = fresh();
    for (const m of s.cast) m.stun = 1e9;
    const L = s.world.def.climbs!.find(c => c.y1 === 15)!, b = s.player.body, p = s.player, cx = (L.x0 + L.x1) / 2;
    /* at its foot, facing it: its rungs are on the south wall */
    b.x = cx; b.z = L.z0 - 0.6; b.y = 0; b.vy = 0; b.sync(); p.yaw = Math.PI; p.pitch = 0;
    hold(s, 0.3);
    hold(s, 9, { forward: 1 });
    expect(p.climbing).toBe(true);
    expect(b.y).toBeGreaterThan(15.2); // up through the hatch, and held there
    hold(s, 1, { strafe: 1 }); // to the west, off it
    hold(s, 0.5);
    expect(p.climbing).toBe(false);
    expect(b.y).toBeCloseTo(15, 1);
    expect(s.world.roomAt(b.x, b.y + 0.5, b.z)?.name).toBe('Crane cab');
    /* back onto it, and down it, looking down */
    hold(s, 1, { strafe: -1 });
    expect(p.climbing).toBe(true);
    expect(b.y).toBeGreaterThan(14.8); // on it, not fallen down the hatch
    p.pitch = -1;
    hold(s, 9, { forward: 1 });
    expect(b.y).toBeCloseTo(0, 1);
  });

  it('ladderway B wants Cargo power; the fuse is in the parts crib; the surface lift wants Gen-1', () => {
    const s = fresh();
    const B1: [number, number] = [263.2, 3.2]; // ladderway B, in the fan station
    use(s, find(s, /Ladder/, B1), [-1, 0]);
    expect(said(s).join(' ')).toMatch(/fan door is sealed/);
    s.game.station!.circuits.CARGO.back = true;
    use(s, find(s, /Ladder/, B1), [-1, 0]);
    expect(said(s).join(' ')).toMatch(/rung over rung/);
    expect(s.game.travel).toEqual({ level: 'main', mark: 'ladder:B1' }); // the run takes you down
    s.game.travel = null;
    use(s, find(s, /^Main fuse$/), [0, 1]);
    expect(s.game.inv.map(i => i.id)).toContain('fuse');
    use(s, find(s, /^Surface lift$/), [0, 1]);
    expect(said(s).join(' ')).toMatch(/^(No power|Not on the backup)\.$/);
  });

  it('notes can be read and are kept; a long fall hurts', () => {
    const s = fresh();
    use(s, find(s, /^Isolation record, room 1$/), [1, 0]);
    expect(s.game.read).toContain('intake');
    expect(s.game.events.some(e => e.type === 'note')).toBe(true);
    const b = s.player.body, [x, z] = tile(90, 11);
    b.x = x; b.z = z + 0.5; b.y = 15; b.sync(); // Tier 3, then off the edge to the floor
    b.z = z + 9; b.sync();
    hold(s, 3);
    expect(s.game.hp).toBeLessThan(100);
  });

  it('what you put down can be taken again, and a searched body stays searched', () => {
    const s = fresh();
    use(s, find(s, /^Officer$/), [1, 0]);
    use(s, find(s, /^Guard's baton$/), [0, -1]);
    s.game.commands.push({ type: 'drop', slot: 0 });
    step(s, noInput());
    expect(s.game.inv.length).toBe(0);
    expect(s.usables.some(u => /^Officer$/.test(u.label() ?? '') && !u.off)).toBe(false);
    use(s, find(s, /^Guard's baton$/), [0, 1]);
    expect(s.game.inv.map(i => i.id)).toEqual(['baton']);
  });

  it('the same seed gives the same codes, and a different one, different codes', () => {
    expect(fresh().game.code).toBe(fresh().game.code);
    expect(makeSim(level, { seed: 8, station: STATION }).game.code).not.toBe(fresh().game.code);
  });
});
