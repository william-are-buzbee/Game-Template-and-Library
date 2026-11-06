import { describe, expect, it } from 'vitest';
import { makeSim, simLighting, step, type Sim } from '../src/sim/sim';
import { noInput } from '../src/sim/input';
import { STEP } from '@wb/core';
import { give } from '../src/sim/game';
import { field, openRules } from '../src/world/nav';
import { refreshFields } from '../src/sim/fields';
import { GAIT, hitMutant, pace, rounds, type Mutant } from '../src/sim/cast';
import { fieldTo, ROAM } from '../src/sim/cast/move';
import { STATION } from '../src/content/station';
import { levelDef } from '../src/sim/run';
import { MOVES as BLOWS } from '../src/sim/moves';
import { fresh, hold } from './kit';

/* The cast on the upper station: the graph they walk, what they notice, how they follow, and what hurts them. */

/** put a body somewhere and let the world know */
function place(s: Sim, who: Mutant | 'player', x: number, y: number, z: number): void {
  const b = who === 'player' ? s.player.body : who.body!;
  b.x = x; b.y = y; b.z = z; b.vy = 0; b.sync();
  if (who !== 'player') { who.x = who.px = x; who.y = who.py = y; who.z = who.pz = z; }
}
/** stand `dist` from it on whichever side has room, and look at it */
/** the cast by where they start, not by the order they were made in (each deck's are made in turn, the lowest first) */
const startRoom = (s: Sim, m: Mutant) => s.world.roomAt(m.x, m.y + 0.5, m.z)?.name;
const rangeSkitter = (s: Sim) => s.cast.find(m => m.ai === 'skitter' && startRoom(s, m) === 'Firing range')!;
const cargoHusk = (s: Sim) => s.cast.find(m => m.ai === 'husk' && !m.post && startRoom(s, m) === 'Cargo cavern')!;
const cavernWorm = (s: Sim) => s.cast.find(m => m.ai === 'worm')!;

function faceOff(s: Sim, m: Mutant, dist: number, at = 0.5): void {
  for (const a of [-Math.PI / 2, Math.PI / 2, 0, Math.PI]) {
    const x = m.x + Math.sin(a) * dist, z = m.z + Math.cos(a) * dist;
    if (s.world.overlap({ x, z, hx: 0.32, hz: 0.32, round: true }, m.y + 0.05, m.y + 1.8)) continue;
    if (s.world.raycast(x, m.y + 1.62, z, m.x, m.y + at, m.z, d => d.kind === 'body') < 1) continue;
    place(s, 'player', x, m.y, z);
    face(s, m.x, m.y + at, m.z);
    return;
  }
  throw new Error('no room about ' + m.type);
}
/** everyone else stands still (stunned) so a test sees one at a time */
const only = (s: Sim, keep: Mutant[]) => { for (const m of s.cast) if (!keep.includes(m)) m.stun = 1e9; };
/** you, out of it: flying high over the level, where nothing sees or hears you */
const away = (s: Sim) => { s.player.fly = true; s.player.body.y += 200; };
/** look at a point from where you stand */
function face(s: Sim, x: number, y: number, z: number): void {
  const b = s.player.body, dx = x - b.x, dz = z - b.z;
  s.player.yaw = Math.atan2(-dx, -dz);
  s.player.pitch = Math.atan2(y - (b.y + 1.62), Math.hypot(dx, dz));
}

describe('the nav graph', () => {
  it('reaches every room, and everything that walks stands on it', () => {
    const s = fresh(), F = s.fields!, nav = F.nav;
    /* a room's strip in a partition is one place with the room; too narrow to hold a spot of its own */
    for (const R of s.world.rooms) if (!R.part) expect(nav.byRoom.get(R.id)?.length ?? 0, R.name).toBeGreaterThan(0);
    for (const m of s.cast) if (m.body) expect(nav.locate(m.x, m.y, m.z), `${m.type} at ${m.x},${m.z}`).toBeGreaterThanOrEqual(0);
    /* on foot, with no doors in the way, every spot is reachable from your cell, platforms included */
    const b = s.player.body, d = field(nav, nav.locate(b.x, b.y, b.z), openRules(nav));
    expect(d.filter(v => v === Infinity).length).toBe(0);
  });

  it('a field for each kind of body: big ones keep out of doors; shut doors muffle sound; none runs on for ever', () => {
    const s = fresh(), F = s.fields!, nav = F.nav;
    expect(F.ways.hands[nav.locate(150, 0, -1)]).toBe(Infinity); // 90 m and more from your cell: beyond any hunt
    place(s, 'player', 102, 0, -1); // by the Cargo door, dead at the start
    refreshFields(s, F);
    const spot = nav.locate(114, 0, -1); // just through it
    expect(F.ways.hands[spot]).toBeLessThan(20); // a hand slides it
    expect(F.ways.crawl[spot]).toBe(Infinity); // what has no hands waits behind it
    expect(F.ways.big[spot]).toBe(Infinity); // the big ones take no doors
    expect(F.sound[spot]).toBeGreaterThan(F.ways.hands[spot]); // and it muffles what you do
  });
});

describe('what they notice', () => {
  it('a husk does not see you crouched and still behind it; it hears you run', () => {
    const s = fresh(), m = s.cast[1]; // the Operations corridor, which runs south from the atrium
    only(s, [m]);
    m.post = true; m.yaw = 0; // facing south, keeping its place
    place(s, m, 77, 0, 26);
    place(s, 'player', 77, 0, 21);
    face(s, 77, 1, 26);
    hold(s, 0.1, { crouch: true });
    hold(s, 2);
    expect(m.state).toBe('idle');
    hold(s, 0.1, { crouch: true }); // stand
    hold(s, 0.4, { forward: 1, run: true });
    expect(m.state).toBe('hunt');
  });

  it('one that has seen you comes, and hurts', () => {
    const s = fresh(), m = s.cast[1];
    only(s, [m]);
    m.yaw = Math.PI; // facing you, up the corridor
    place(s, m, 77, 0, 30);
    place(s, 'player', 77, 0, 22);
    face(s, 77, 1, 30);
    hold(s, 0.5);
    expect(m.state).toBe('hunt');
    hold(s, 5);
    expect(Math.hypot(m.x - 77, m.z - 22)).toBeLessThan(1.6);
    expect(s.game.hp).toBeLessThan(100);
  });
});

describe('their rounds', () => {
  it('husks keep their rounds to lit rooms: the wing joins them when it is mended, and in the dark there are none', () => {
    const s = fresh();
    step(s, noInput());
    const names = () => new Set(rounds(s).map(id => s.world.rooms[id].name));
    const now = names();
    expect([...now]).toEqual(expect.arrayContaining(['Atrium', 'Operations corridor', 'Gallery', 'Muster hall']));
    for (const dark of ['Checkpoint', 'Firing range', 'Cargo cavern']) expect(now.has(dark)).toBe(false); // the wing, a room with no emergency lights, Cargo
    s.game.station!.circuits.SEC.broken = false; s.lighting = null; // the wing mended
    expect(names().has('Checkpoint')).toBe(true);
    s.game.station!.circuits.OPS.back = false; s.lighting = null; // and Ops' set stopped: nothing to see by but the flesh's own glow
    expect([...names()].every(n => /^Tier|^Operations room$/.test(n))).toBe(true); // the nest's, and the operations room's
  });

  it('one standing in the dark makes for the nearest light it can get to', () => {
    const s = fresh(), m = s.cast[1];
    only(s, [m]);
    place(s, m, 35, 0, 55); // in the firing range: no emergency lights, dark on the backup set
    const lum = () => Math.max(...simLighting(s).atPoint(m.x, m.y + 0.5, m.z));
    expect(lum()).toBe(0);
    hold(s, 20 * (GAIT.husk.pace.walk / pace(m, 'walk'))); // 20 s at a husk's walk; this one walks at its own
    expect(m.state).toBe('idle'); // not hunting you: going to the light
    expect(lum()).toBeGreaterThan(0.05); // well in it (the cast count anything over 0.02 as lit)
  });

  it('one in the dark with no light it can get to keeps still; when the light comes, it walks', () => {
    const s = fresh(), m = cargoHusk(s); // a husk on the Cargo floor: dark, and Cargo's link is behind Operations' card
    only(s, [m]);
    const x0 = m.x, z0 = m.z;
    hold(s, 20);
    expect(m.state).toBe('idle');
    expect(Math.hypot(m.x - x0, m.z - z0)).toBeLessThan(0.3);
    s.game.station!.circuits.CARGO.back = true; s.lighting = null;
    hold(s, 30);
    expect(Math.hypot(m.x - x0, m.z - z0)).toBeGreaterThan(2);
  });

  it('one in the dark with the light far off keeps still: the dark Commons keeps its own, not sending them to Horticulture', () => {
    const s = makeSim(levelDef(STATION, 'main'), { seed: 7, station: STATION }), m = s.cast.find(q => q.ai === 'husk' && !q.post && startRoom(s, q) === 'The Commons')!;
    only(s, [m]);
    away(s);
    const x0 = m.x, z0 = m.z, nav = s.fields!.nav;
    step(s, noInput());
    /* Horticulture's backup set is lit, and there is a way to it, but it is the length of the street off */
    const to = field(nav, m.spot, openRules(nav));
    expect(Math.min(...rounds(s).flatMap(R => (nav.byRoom.get(R) ?? []).map(k => to[k])))).toBeGreaterThan(ROAM.light);
    hold(s, 30);
    expect(m.state).toBe('idle');
    expect(Math.hypot(m.x - x0, m.z - z0)).toBeLessThan(0.3);
  });

  it('two of them in one room make for two others: their rounds keep them apart', () => {
    const s = fresh(), [a, b] = s.cast.filter(m => m.ai === 'husk' && !m.post && startRoom(s, m) === 'Muster hall');
    only(s, [a, b]);
    away(s);
    for (let t = 0; t < 8 && (a.dest < 0 || b.dest < 0); t += STEP) step(s, noInput());
    const nav = s.fields!.nav, to = [a, b].map(m => s.world.rooms[nav.room[m.dest]].name);
    expect(to[0]).not.toBe(to[1]);
    expect(to).not.toContain('Muster hall');
  });

  it('two meeting head on where neither can get by do not stand there: each gives its round up for another', () => {
    const s = fresh(), [a, b] = s.cast.filter(m => m.ai === 'husk' && !m.post && startRoom(s, m) === 'Muster hall');
    only(s, [a, b]);
    away(s);
    place(s, a, 66, 0, 25.5); place(s, b, 72, 0, 25.5); // along the hall's north side, by the east bays, each going the other's way
    step(s, noInput());
    const nav = s.fields!.nav, goals = [nav.locate(78, 0, 25.5), nav.locate(58, 0, 25.5)];
    [a, b].forEach((m, i) => { m.state = 'idle'; m.wt = 0; m.dest = goals[i]; m.F = fieldTo(s, m, goals[i]); m.near = 1e9; m.stk = 0; });
    hold(s, 2.5 * (2 * GAIT.husk.pace.walk) / (pace(a, 'walk') + pace(b, 'walk'))); // 2.5 s at a husk's walk; these at their own
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeLessThan(1.2); // met, and stopped there
    hold(s, 5);
    expect(a.dest).not.toBe(goals[0]);
    expect(b.dest).not.toBe(goals[1]);
  });
});

describe('how they follow', () => {
  it('a husk slides a dead door open by hand to come through it', () => {
    const s = fresh(), m = cargoHusk(s), d = s.doors.find(d => d.def.x0 > 107 && d.def.x1 < 111 && d.def.z1 < 1)!; // the Cargo door, x 109: dead at the start
    only(s, [m]);
    s.game.hp = 1e9;
    expect(d.t).toBe(0);
    place(s, m, 116, 0, -1);
    place(s, 'player', 102, 0, -1);
    m.state = 'hunt';
    hold(s, 8);
    expect(d.open).toBe(true);
    expect(m.x).toBeLessThan(108);
  });

  it('with Cargo on its backup set, a husk calls the hoist and rides it up after you', () => {
    const s = fresh(), m = cargoHusk(s), nav = s.fields!.nav, P = s.platforms.findIndex(p => p.def.call?.name === 'Personnel hoist');
    s.game.station!.circuits.CARGO.back = true;
    only(s, [m]);
    s.game.hp = 1e9;
    /* you, on the top deck beside the hoist's landing; it, at the hoist's gate on the floor. The stairs up are at the
       decks' ends, a long way round: the hoist is the way */
    const D = s.platforms[P].def;
    let top = -1;
    for (let i = 0; i < nav.n; i++) if (Math.abs(nav.y[i] - 15) < 0.3 && Math.abs(nav.x[i] - (D.x0 + D.x1) / 2) < 1 && nav.z[i] > D.z0 - 3 && nav.z[i] < D.z0 - 1) top = i;
    expect(top).toBeGreaterThanOrEqual(0);
    place(s, 'player', nav.x[top], 15, nav.z[top]);
    place(s, m, (D.x0 + D.x1) / 2, 0, D.z1 + 1.5);
    m.state = 'hunt';
    let rode = false;
    for (let t = 0; t < 40 && !(Math.abs(m.y - 15) < 0.5 && Math.hypot(m.x - nav.x[top], m.z - nav.z[top]) < 3); t += 0.5) { hold(s, 0.5); if (m.ride?.lift === P) rode = true; }
    expect(rode).toBe(true);
    expect(m.y).toBeCloseTo(15, 0);
    expect(Math.hypot(m.x - nav.x[top], m.z - nav.z[top])).toBeLessThan(3);
  });
});

describe('fighting', () => {
  it('a click is a whole blow: it comes down as soon as the arm is up, and lands as hard as one held', () => {
    const blow = (secs: number) => {
      const s = fresh(), w = cavernWorm(s); // a worm in the cavern
      only(s, []);
      w.stun = 1e9;
      give(s.game, 'pipe');
      faceOff(s, w, 1.2, 0.3);
      hold(s, secs, { attack: true });
      let at = -1;
      for (let t = 0; t < 1.5 && at < 0; t += STEP) { step(s, noInput()); if (w.hp < 40) at = secs + t; }
      return { lost: 40 - w.hp, at };
    };
    const click = blow(STEP), held = blow(1.5);
    expect(click.lost).toBeGreaterThan(0);
    expect(click.lost).toBeCloseTo(held.lost, 6);
    /* not before the arm is up: the pipe's load (0.93 s) and the blow coming down */
    expect(click.at).toBeGreaterThan(0.93);
  });

  it('a blow that lands holds the swing still a moment, and says so', () => {
    const s = fresh(), w = cavernWorm(s);
    only(s, []);
    w.stun = 1e9;
    give(s.game, 'pipe');
    faceOff(s, w, 1.2, 0.3);
    hold(s, 1.1, { attack: true });
    s.game.events.length = 0;
    let stopped = false;
    for (let t = 0; t < 0.5; t += STEP) { step(s, noInput()); if (s.hands.stop > 0) stopped = true; }
    expect(stopped).toBe(true);
    expect(s.game.events.some(e => e.type === 'impact')).toBe(true);
  });

  it('a husk blow can be stepped back from: it whiffs, and you are not hurt; one that lands says where it came from', () => {
    const s = fresh(), m = cargoHusk(s);
    only(s, [m]);
    s.game.hp = 100;
    faceOff(s, m, 1.1, 1.2);
    m.state = 'hunt';
    let wound = false;
    for (let t = 0; t < 1 && !wound; t += STEP) { step(s, noInput()); wound = m.blow?.ph === 'wind'; }
    expect(wound).toBe(true);
    s.game.events.length = 0;
    hold(s, 0.8, { forward: -1 }); // backing off as it winds up
    expect(s.game.hp).toBe(100);
    expect(s.game.events.some(e => e.type === 'sfx' && e.name === 'whiff')).toBe(true);
    /* standing still for the next */
    s.game.events.length = 0;
    hold(s, 3);
    const hurt = s.game.events.find(e => e.type === 'hurt');
    expect(s.game.hp).toBeLessThan(100);
    expect(hurt?.type === 'hurt' && hurt.from).toBeTruthy();
  });

  /** a husk hunting you from just in front, run to where its wind-up has stopped turning */
  function committed(dmg = 100) {
    const s = fresh(), m = cargoHusk(s);
    only(s, [m]);
    s.game.hp = dmg;
    faceOff(s, m, 1.1, 1.2);
    m.state = 'hunt';
    for (let t = 0; t < 1.5 && !(m.blow?.ph === 'wind' && m.blow.t > BLOWS.husk.wind * BLOWS.husk.lock); t += STEP) step(s, noInput());
    expect(m.blow?.ph).toBe('wind');
    return { s, m };
  }
  /** stand `dist` from it at `ang` from the way it faces, wherever there is room */
  function around(s: Sim, m: Mutant, dist: number, angs: number[]): void {
    for (const a of angs) {
      const x = m.x + Math.sin(m.yaw + a) * dist, z = m.z + Math.cos(m.yaw + a) * dist;
      if (s.world.overlap({ x, z, hx: 0.32, hz: 0.32, round: true }, m.y + 0.05, m.y + 1.8)) continue;
      place(s, 'player', x, m.y, z);
      return;
    }
    throw new Error('no room about ' + m.type);
  }

  it('a husk winds up, strikes, carries its lunge a step and stands, not turning, before it comes on again', () => {
    const { s, m } = committed();
    s.game.hp = 1e9;
    const yaw = m.yaw;
    for (let t = 0; t < 0.5 && m.blow?.ph !== 'after'; t += STEP) step(s, noInput());
    expect(m.blow?.ph).toBe('after');
    const x = m.x, z = m.z;
    around(s, m, 1.6, [Math.PI / 2, -Math.PI / 2]); // off to its side
    /* the way on it had from its lunge carries it a little (engine.md §6, the cast by velocity), and then it stands */
    hold(s, 0.25);
    const x2 = m.x, z2 = m.z;
    expect(Math.hypot(x2 - x, z2 - z)).toBeLessThan(0.3);
    hold(s, BLOWS.husk.rec - 0.35);
    expect(m.blow?.ph).toBe('after');
    expect(Math.hypot(m.x - x2, m.z - z2)).toBeLessThan(1e-3);
    expect(m.yaw).toBeCloseTo(yaw, 6); // it has not turned since it committed
    hold(s, 0.6);
    expect(m.blow?.ph ?? null).not.toBe('after');
    expect(Math.abs(m.yaw - yaw)).toBeGreaterThan(0.1); // and now it comes round to you
  });

  it('a husk blow goes where it was aimed: once it has committed, a step round it is a step out of it', () => {
    const behind = committed();
    around(behind.s, behind.m, 0.9, [Math.PI / 2, -Math.PI / 2, Math.PI]);
    behind.s.game.events.length = 0;
    hold(behind.s, 0.4);
    expect(behind.s.game.hp).toBe(100);
    expect(behind.s.game.events.some(e => e.type === 'sfx' && e.name === 'whiff')).toBe(true);
    /* the same blow, stood in front of: it lands */
    const front = committed();
    hold(front.s, 0.4);
    expect(front.s.game.hp).toBe(80);
  });

  it('a blow that met nothing leaves it open longer than one that landed', () => {
    const missed = committed();
    around(missed.s, missed.m, 0.9, [Math.PI / 2, -Math.PI / 2, Math.PI]);
    const landed = committed();
    landed.s.game.hp = 1e9;
    const open = (s: Sim, m: Mutant) => { let t = 0; for (let k = 0; k < 200 && m.blow?.ph !== 'after'; k++) step(s, noInput()); while (m.blow?.ph === 'after') { step(s, noInput()); t += STEP; } return t; };
    const a = open(missed.s, missed.m), b = open(landed.s, landed.m);
    expect(a).toBeCloseTo(BLOWS.husk.miss, 1);
    expect(b).toBeCloseTo(BLOWS.husk.rec, 1);
  });

  it('caught recovering from its own blow, it takes yours worse; struck as it winds up, it loses the blow', () => {
    const struck = (ph: 'after' | null) => {
      const s = fresh(), m = cargoHusk(s);
      only(s, [m]);
      m.state = 'hunt';
      m.blow = ph && { ph, t: 0, hit: false };
      hitMutant(s, m, { dmg: 30, poise: 10 }, 1);
      return { lost: m.max - m.hp, stun: m.stun, poise: m.pmax - m.poise, m };
    };
    const open = struck('after'), shut = struck(null);
    expect(open.lost).toBeGreaterThan(shut.lost * 1.2);
    expect(open.stun).toBeGreaterThan(shut.stun * 1.5);
    expect(open.poise).toBeGreaterThan(shut.poise * 1.5);
    expect(open.m.blow?.ph).toBe('after'); // still recovering
    const s = fresh(), m = cargoHusk(s);
    m.state = 'hunt';
    m.blow = { ph: 'wind', t: 0.3, hit: false };
    hitMutant(s, m, { dmg: 10, poise: 10 }, 0.3);
    expect(m.blow).toBe(null);
  });

  it('a skitter rears and drops where it was aimed: a step aside once it has stopped turning, and it lands on nothing', () => {
    const s = fresh(), k = rangeSkitter(s), K = BLOWS.skitter;
    only(s, [k]);
    s.game.hp = 100;
    faceOff(s, k, 1.0, 0.4);
    k.state = 'hunt';
    for (let t = 0; t < 2 && !(k.blow?.ph === 'wind' && k.blow.t > K.wind * K.lock); t += STEP) step(s, noInput());
    expect(k.blow?.ph).toBe('wind');
    around(s, k, 1.0, [Math.PI / 2, -Math.PI / 2]);
    s.game.events.length = 0;
    hold(s, 0.35);
    expect(s.game.hp).toBe(100);
    expect(s.game.events.some(e => e.type === 'sfx' && e.name === 'whiff')).toBe(true);
  });

  /** the two cavern worms, both close by you (a pair: one alone only touches you), awake and coming */
  function wormPair() {
    const s = fresh(), [a, b] = s.cast.filter(m => m.ai === 'worm');
    only(s, [a, b]);
    s.game.hp = 100;
    const y = a.y, px = 220, pz = 2;
    place(s, 'player', px, y, pz);
    place(s, a, px + 1.0, y, pz);
    place(s, b, px + 0.8, y, pz + 1.4);
    b.cd = 1e9; // b only makes up the pair
    face(s, px - 1, y + 1, pz); // looking away: no light on them
    return { s, a, b };
  }

  it('a worm reaches for you with a tell first: heard, and a step back as it lifts is enough', () => {
    const { s } = wormPair();
    s.game.events.length = 0;
    let rasp = -1, hurt = -1;
    for (let t = 0; t < 3 && hurt < 0; t += STEP) {
      step(s, noInput());
      if (rasp < 0 && s.game.events.some(e => e.type === 'sfx' && e.name === 'rasp')) rasp = t;
      if (s.game.hp < 100) hurt = t;
    }
    expect(rasp).toBeGreaterThanOrEqual(0);
    expect(hurt - rasp).toBeGreaterThanOrEqual(BLOWS.worm.wind - 0.02);
    expect(s.game.hp).toBe(88);
    /* again, stepping back as it lifts */
    const b = wormPair();
    for (let t = 0; t < 2 && b.a.blow?.ph !== 'wind'; t += STEP) step(b.s, noInput());
    expect(b.a.blow?.ph).toBe('wind');
    b.s.game.events.length = 0;
    hold(b.s, 0.3, { forward: 1 }); // facing away from it: forward is away
    hold(b.s, 0.2);
    expect(b.s.game.hp).toBe(100);
    expect(b.s.game.events.some(e => e.type === 'sfx' && e.name === 'whiff')).toBe(true);
  });

  it('a light put on a worm as it lifts to reach puts it off', () => {
    const { s, a } = wormPair();
    s.game.light = 'flash';
    for (let t = 0; t < 2 && a.blow?.ph !== 'wind'; t += STEP) step(s, noInput());
    expect(a.blow?.ph).toBe('wind');
    s.game.lightOn = true;
    face(s, a.x, a.y + 0.3, a.z);
    hold(s, 0.5);
    expect(a.blow).toBe(null);
    expect(s.game.hp).toBe(100);
  });

  it('a knock back slides: over a few frames, not all at once, and a worm (25 kg) is thrown the best part of a metre', () => {
    const s = fresh(), w = cavernWorm(s);
    only(s, []);
    w.stun = 1e9;
    give(s.game, 'pipe');
    faceOff(s, w, 1.2, 0.3);
    const x0 = w.x, z0 = w.z;
    let first = -1;
    hold(s, 1.1, { attack: true });
    for (let t = 0; t < 1 && first < 0; t += STEP) { step(s, noInput()); if (w.hp < 40) first = Math.hypot(w.x - x0, w.z - z0); }
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(0.15); // the step it was struck: only the start of the slide
    hold(s, 0.5);
    const total = Math.hypot(w.x - x0, w.z - z0);
    expect(total).toBeGreaterThan(0.6);
    expect(total).toBeLessThan(1.2);
  });

  it('a click and a held blow stun and knock back alike', () => {
    const blow = (secs: number) => {
      const s = fresh(), w = cavernWorm(s);
      only(s, []);
      give(s.game, 'pipe');
      faceOff(s, w, 1.2, 0.3);
      w.stun = 0;
      hold(s, secs, { attack: true });
      /* from where it stood as the blow landed: before that it was coming at you */
      let stun = 0, x0 = w.x, z0 = w.z;
      for (let t = 0; t < 2 && !stun; t += STEP) { x0 = w.x; z0 = w.z; step(s, noInput()); if (w.hp < 40) stun = w.stun; }
      w.stun = 1e9; // held still, so the slide is the knock alone
      hold(s, 0.5);
      return { stun, slid: Math.hypot(w.x - x0, w.z - z0) };
    };
    const click = blow(STEP), held = blow(1.5);
    expect(click.stun).toBeGreaterThan(0);
    expect(click.stun).toBeCloseTo(held.stun, 6);
    expect(click.slid).toBeCloseTo(held.slid, 2);
  });

  it('a side swing takes the first thing in its path: one on your right as you swing at another is struck instead', () => {
    /* the pipe swings right to left (engine.md §6, F3b). Facing east, your right is south (+z) */
    const swing = (side: 1 | -1) => {
      const s = fresh(), [a, b] = s.cast.filter(m => m.ai === 'worm');
      only(s, []);
      a.stun = b.stun = 1e9;
      give(s.game, 'pipe');
      const y = a.y, px = 220, pz = 2;
      place(s, 'player', px, y, pz);
      place(s, a, px + Math.cos(0.6) * 1.0, y, pz + side * Math.sin(0.6) * 1.0); // nearer, off to one side
      place(s, b, px + 1.5, y, pz); // further, straight ahead
      face(s, b.x, b.y + 0.36, b.z);
      hold(s, 1.1, { attack: true });
      hold(s, 0.5);
      return { a: a.hp < 40, b: b.hp < 40 };
    };
    expect(swing(1)).toEqual({ a: true, b: false }); // on the right: in the way of it
    expect(swing(-1)).toEqual({ a: false, b: true }); // on the left: the swing is done before it gets there
  });

  it('a pistol fires on the press, spends a round, is heard, and kills', () => {
    const s = fresh(), k = rangeSkitter(s); // the firing range skitter
    only(s, []);
    k.stun = 1e9;
    give(s.game, 'pistol'); give(s.game, 'ammo9');
    s.game.weapon = 'pistol';
    const rounds = () => s.game.inv.find(q => q.id === 'ammo9')?.n ?? 0, n0 = rounds();
    faceOff(s, k, 4);
    hold(s, STEP, { attack: true });
    expect(rounds()).toBe(n0 - 1);
    expect(s.game.noise).toBe(36);
    hold(s, 0.5);
    hold(s, STEP, { attack: true });
    hold(s, 0.2);
    expect(k.dead).toBe(true);
    expect(s.game.kills).toBe(1);
  });
});

describe('the whole cast', () => {
  it('runs the same way twice from the same seed', () => {
    const run = () => {
      const s = fresh(11);
      hold(s, 6, { forward: 1, yaw: 0.002 });
      return s.cast.map(m => [m.x.toFixed(4), m.z.toFixed(4), m.state].join()).join('|');
    };
    expect(run()).toBe(run());
  });

  it('costs little: twenty seconds of everyone, a step at a time', () => {
    const s = fresh();
    hold(s, 1);
    const t0 = performance.now();
    hold(s, 20, { forward: 1, run: true, yaw: 0.01 });
    const ms = (performance.now() - t0) / (20 / STEP);
    expect(ms).toBeLessThan(4);
  });
});
