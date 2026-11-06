import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/content/build/builder';
import { STEP } from '../src/core/loop';
import { angDiff } from '../src/core/math';
import { GAIT, MT, pace, spawn, wayOf, type Mutant } from '../src/sim/cast';
import { fieldTo } from '../src/sim/cast/move';
import { refreshFields, sized, WAYS, type Walker, type Way } from '../src/sim/fields';
import { field, openRules } from '../src/world/nav';
import { noInput } from '../src/sim/input';
import { makeSim, step, type Sim } from '../src/sim/sim';
import { hold } from './kit';

/* How the cast get about, by kind (engine.md §6, how the cast move): a kind's gait and its way are rows in tables, and
   a kind the code has never heard of moves by its rows alone. */

/* a kind made here and nowhere else: tall, slow, walking where it faces, with the husk's behaviour, and a way of its
   own (it needs 2.6 m of headroom and takes no doors). Made as a new kind would be: rows, no code */
(WAYS as Record<string, Way>).tall = { head: 2.6, r: 0.45, climb: 0.5, drop: 2.5, doors: 'none', call: false };
MT.strider = { ai: 'husk', model: 'husk', hp: 200, r: 0.5, cr: 0.45, mass: 3, kg: 260, h: 2.5, way: 'tall' as Walker };
GAIT.strider = { pace: { walk: 0.8, hunt: 2 }, acc: 6, turn: 8, heading: 1.2, feet: { sound: 'hstep', walk: 0.9, fast: 0.6, big: true } };
/* and one broad (1.6 m across) that climbs a metre and drops no more than one; and a way that drops less than a step and
   a half, walked by nothing */
(WAYS as Record<string, Way>).broad = { head: 2.2, r: 0.8, climb: 1, drop: 1, doors: 'none', call: false };
(WAYS as Record<string, Way>).careful = { head: 1.8, r: 0.3, climb: 0.5, drop: 0.4, doors: 'hands', call: false };
MT.lumber = { ai: 'husk', model: 'husk', hp: 300, r: 0.8, cr: 0.75, mass: 4, kg: 400, h: 2, way: 'broad' as Walker };
GAIT.lumber = { pace: { walk: 0.6, hunt: 1.8 }, acc: 5, turn: 8 };

/** a hall 20 by 12 m, 4 m high, you at (5, 6) facing east. Off its east end, dead ends: a passage 2.2 m high and 2 m
 *  wide, a lane 4 m high and 2 m wide, and a slot 4 m high and 1 m wide. In its north-west corner a ledge 0.75 m high */
function hall(build: (b: LevelBuilder) => void = () => {}): Sim {
  const b = new LevelBuilder('hall', 'Hall');
  b.room('Hall', 0, 0, 20, 12, { ht: 4 });
  b.room('Passage', 20, 5, 30, 7, { ht: 2.2 });
  b.room('Lane', 20, 1, 30, 3, { ht: 4 });
  b.room('Slot', 20, 9, 30, 10, { ht: 4 });
  b.block(1, 0, 8, 6, 0.75, 12, 0x808080);
  build(b);
  b.start(5, 6, -Math.PI / 2);
  const s = makeSim(b.finish());
  s.game.hp = 1e9;
  return s;
}
const v = (m: Mutant) => Math.hypot(m.body!.vx, m.body!.vz);
const hunting = (m: Mutant) => { m.state = 'hunt'; m.fled = true; m.lost = 0; };

describe('a kind is its rows', () => {
  it('one put down where none of its way walked gets a field for its way, made in its turn', () => {
    const s = hall(b => b.mutant('husk', 15, 0, 6));
    expect(s.fields!.order).toEqual(['crawl', 'hands', 'big', 'sound']); // the three every level keeps, and sound
    spawn(s, 'strider', 15, 0, 3);
    expect(s.fields!.order).toEqual(['crawl', 'hands', 'big', 'tall', 'sound']);
    hold(s, 0.2);
    const nav = s.fields!.nav, here = nav.locate(15, 0, 3);
    expect(s.fields!.ways.tall[here]).toBeLessThan(15);
  });

  it('its way keeps it to where it fits: the low passage is on a husk\'s way, not on its', () => {
    const s = hall(b => b.mutant('strider', 15, 0, 3));
    hold(s, 0.2);
    const F = s.fields!, deep = F.nav.locate(27, 0, 6);
    expect(F.nav.head[deep]).toBeLessThan(2.6);
    expect(F.ways.hands[deep]).toBeLessThan(30);
    expect(F.ways.tall[deep]).toBe(Infinity);
  });

  it('it goes after you at its own pace, not a husk\'s', () => {
    const s = hall(b => { b.mutant('strider', 16, 0, 6, { yaw: -Math.PI / 2 }); b.mutant('husk', 16, 0, 9, { yaw: -Math.PI / 2 }); });
    const [m, h] = s.cast;
    hunting(m); hunting(h);
    hold(s, 0.6);
    expect(v(m)).toBeCloseTo(GAIT.strider.pace.hunt, 1);
    expect(v(h)).toBeCloseTo(GAIT.husk.pace.hunt, 1);
  });

  it('walking where it faces, it turns no faster than its gait lets it, and goes only once it faces you', () => {
    const s = hall(b => b.mutant('strider', 11, 0, 6, { yaw: Math.PI / 2 })), m = s.cast[0]; // its back to you, 6 m off
    hunting(m);
    let worst = 0, crept = 0;
    for (let t = 0; t < 5; t += STEP) {
      const was = m.yaw;
      step(s, noInput());
      worst = Math.max(worst, Math.abs(angDiff(was, m.yaw)));
      const off = Math.abs(angDiff(m.yaw, Math.atan2(s.player.body.x - m.x, s.player.body.z - m.z)));
      if (off > Math.PI / 2 + 0.05) crept = Math.max(crept, v(m));
    }
    expect(worst).toBeLessThanOrEqual(GAIT.strider.heading! * STEP + 1e-9);
    expect(crept).toBeLessThan(0.05); // turned away, it stands and turns
    expect(m.dp).toBeLessThan(3); // and then it comes: half a turn takes it 2.6 s
  });

  it('a husk turns on the spot and goes at once, as it always has', () => {
    const s = hall(b => b.mutant('husk', 11, 0, 6, { yaw: Math.PI / 2 })), m = s.cast[0];
    hunting(m);
    hold(s, 0.25);
    expect(v(m)).toBeGreaterThan(2.5);
  });
});

describe('size', () => {
  /** you, put somewhere, and the ways to you made again */
  const put = (s: Sim, x: number, y: number, z: number) => { const b = s.player.body; b.x = x; b.y = y; b.z = z; b.vy = 0; b.sync(); refreshFields(s, s.fields!); };
  const at = (s: Sim, x: number, y: number, z: number) => s.fields!.nav.locate(x, y, z);

  it('a broad one keeps out of what is too narrow for it, and goes down a lane it fits that a husk would think no wider', () => {
    const s = hall(b => b.mutant('lumber', 15, 0, 6)), F = s.fields!;
    hold(s, 0.1);
    expect(F.ways.hands[at(s, 27, 0, 9.5)]).toBeLessThan(40); // a husk goes down the slot
    expect(F.ways.broad[at(s, 27, 0, 9.5)]).toBe(Infinity); // it does not
    expect(F.ways.broad[at(s, 27, 0, 2)]).toBeLessThan(40); // the lane, it does
    expect(F.ways.broad[at(s, 27, 0, 6)]).toBeLessThan(40); // and the passage, 2.2 m high as its way needs
  });

  it('and its body goes where its way does: down the lane after you, not into the slot', () => {
    const lane = hall(b => b.mutant('lumber', 14, 0, 2.5)), m = lane.cast[0];
    put(lane, 28, 0, 2); hunting(m);
    hold(lane, 14);
    expect(m.x).toBeGreaterThan(25);
    const slot = hall(b => b.mutant('lumber', 14, 0, 9.5)), q = slot.cast[0];
    put(slot, 28, 0, 9.5); hunting(q);
    hold(slot, 8);
    expect(q.x).toBeLessThan(20); // at the slot's mouth at most: the 1 m slot does not take it
  });

  it('it climbs what its way climbs, and its body does; a husk, a step as it always has', () => {
    const s = hall(b => { b.mutant('lumber', 12, 0, 6); b.mutant('husk', 12, 0, 3); }), [m, h] = s.cast;
    put(s, 3.5, 0.75, 10); // up on the ledge
    expect(s.fields!.ways.hands[at(s, 10, 0, 6)]).toBe(Infinity); // no way up it for a husk
    expect(s.fields!.ways.broad[at(s, 10, 0, 6)]).toBeLessThan(15);
    hunting(m); hunting(h);
    hold(s, 12);
    expect(m.y).toBeCloseTo(0.75, 2); // up after you
    expect(h.y).toBe(0); // still on the floor
  });

  it('it drops no further than its way does', () => {
    const s = hall(b => b.mutant('husk', 15, 0, 6)), nav = s.fields!.nav, down = at(s, 3.5, 0.75, 10), floor = at(s, 10, 0, 6);
    const way = (W: Way) => { const S = sized(s, nav, W), R = openRules(nav); R.blocked.set(S.low); R.edges = S.edges; return field(nav, floor, R); };
    expect(way(WAYS.hands)[down]).toBeLessThan(15); // off the ledge: a drop of 0.75 m
    expect(way((WAYS as Record<string, Way>).careful)[down]).toBe(Infinity);
  });

  it('every kind fits the way it walks, give or take a squeeze, but for those named here', () => {
    /* the first engine's big ones walk a way made for a husk: the bloat keeps to its room and never asks the way, and
       on main, where the thresher lives, six spots in all are too narrow for it (engine.md §7, size) */
    const SQUEEZE = 0.1, named = ['thresher', 'bloat'];
    for (const [k, S] of Object.entries(MT)) {
      if (S.fixed || named.includes(k)) continue;
      expect(S.cr, k).toBeLessThanOrEqual(WAYS[wayOf(S)].r + SQUEEZE);
    }
  });
});

describe('one of the cast given its own pace by the level', () => {
  it('is slow at everything, its hunt as well as its walk', () => {
    const s = hall(b => { b.mutant('husk', 16, 0, 6, { walk: 0.65 }); b.mutant('husk', 16, 0, 9); });
    const [slow, other] = s.cast;
    expect(pace(slow, 'walk')).toBe(0.65);
    expect(pace(slow, 'hunt')).toBeCloseTo(GAIT.husk.pace.hunt / 2, 9);
    expect(pace(other, 'hunt')).toBe(GAIT.husk.pace.hunt);
    hunting(slow);
    hold(s, 0.6);
    expect(v(slow)).toBeCloseTo(GAIT.husk.pace.hunt / 2, 1);
  });

  it('keeps to its way somewhere however slowly it goes: coming a spot nearer takes it longer, and it is not held up for that', () => {
    const s = hall(b => b.mutant('husk', 2, 0, 6, { walk: 0.3 })), m = s.cast[0], nav = s.fields!.nav;
    s.player.fly = true; s.player.body.y += 200; // you, out of it
    const goal = nav.locate(18, 0, 6);
    m.wt = 0; m.dest = goal; m.F = fieldTo(s, m, goal); m.near = 1e9; m.stk = 0;
    let gaveUp = false;
    for (let t = 0; t < 70 && m.dest === goal; t += STEP) { step(s, noInput()); if (m.dest !== goal && m.F![m.spot] > 1.2) gaveUp = true; }
    expect(gaveUp).toBe(false);
    expect(Math.hypot(m.x - 18, m.z - 6)).toBeLessThan(1.5); // there, at its 0.3 m/s
  });

  it('asked for a pace its kind has none for, walks', () => {
    const s = hall(b => b.mutant('worm', 16, 0, 6));
    expect(pace(s.cast[0], 'rally')).toBe(GAIT.worm.pace.walk);
  });
});
