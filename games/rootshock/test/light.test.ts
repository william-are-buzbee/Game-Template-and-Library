import { describe, expect, it } from 'vitest';
import { STATION } from '../src/content/station';
import { buildUpper } from '../src/content/levels/upper';
import { buildMain } from '../src/content/levels/main';
import { applyCommands, looseLights, makeSim, simLighting, step, type Sim } from '../src/sim/sim';
import { give } from '../src/sim/game';
import { noInput } from '../src/sim/input';
import { Lighting, fullPower, spot } from '../src/world/light';
import { Cascade } from '../src/present/cascade';
import { buildLevelMesh } from '../src/present/render/levelMesh';
import { EMIT } from '../src/present/render/shader';
import { levelDef } from '../src/sim/run';

/* Light on the upper station. Power coming on, room by room (present/cascade.ts): it starts where you are, reaches the
   far end last, ends exactly as the new power lights it, and going dark is not staged. Light in pools under the ceiling
   fittings, reaching past a room through its openings and no further (world/light.ts, world/lightField.ts): what you see
   and what the cast see you by. */

const sim = makeSim(buildUpper(STATION.ladders), { seed: 3, station: STATION });
const w = sim.world, dark = new Lighting(w, () => 0), lit = new Lighting(w, fullPower);
const named = (n: string) => w.rooms.find(R => R.name === n)!.id;
const lum = (L: Lighting, x: number, y: number, z: number) => Math.max(...L.atPoint(x, y, z));
const mid = (r: number, up = 1): [number, number, number] => { const R = w.rooms[r]; return [(R.x0 + R.x1) / 2, R.y0 + up, (R.z0 + R.z1) / 2]; };

describe('the power coming on', () => {
  it('lights the room you are in first and the far end last, then holds exactly as the new power has it', () => {
    const here = named('Operations corridor'), far = named('Cargo office'), struck: number[] = [];
    const C = new Cascade(w, dark, lit, here, r => struck.push(r));
    expect(C.L.room(here)).toEqual(dark.room(here)); // nothing yet
    expect(lum(C.L, ...mid(here))).toBe(0);
    const first = new Map<number, number>();
    for (let t = 0; t < 5 && !C.done; t += 1 / 60) for (const r of C.update(1 / 60)) if (!first.has(r)) first.set(r, t);
    expect(C.done).toBe(true);
    expect(first.get(here)!).toBeLessThan(first.get(far)!);
    expect(struck[0]).toBe(here);
    for (const R of w.rooms) {
      expect(C.L.room(R.id)).toEqual(lit.room(R.id));
      const a = C.L.atPoint(...mid(R.id)), b = lit.atPoint(...mid(R.id));
      for (let k = 0; k < 3; k++) expect(a[k]).toBeCloseTo(b[k], 4);
    }
  });

  it('a tube strikes: it comes on, goes off a moment, and comes on again', () => {
    const here = named('Operations corridor'), C = new Cascade(w, dark, lit, here, () => {});
    const seen: number[] = [C.L.on[here]]; // as it stands before the first frame
    for (let t = 0; t < 5 && !C.done; t += 1 / 120) { C.update(1 / 120); if (seen[seen.length - 1] !== C.L.on[here]) seen.push(C.L.on[here]); }
    expect(seen.slice(0, 4)).toEqual([0, 1, 0, 1]);
  });

  it('power going off goes at once', () => {
    const C = new Cascade(w, lit, dark, named('Operations corridor'), () => {});
    for (const R of w.rooms) { expect(C.L.room(R.id)).toEqual(dark.room(R.id)); expect(lum(C.L, ...mid(R.id))).toBe(lum(dark, ...mid(R.id))); }
    C.update(0.001);
    expect(C.done).toBe(true);
  });
});

describe('light in pools', () => {
  const corridor = named('Security corridor'), R = w.rooms[corridor];
  const fx = lit.fixtures.get(corridor)!;

  it('a fitted room has its fittings, and a cave or a walkway has none', () => {
    expect(fx.length).toBeGreaterThan(2);
    expect(lit.fixtures.has(named('Cargo cavern'))).toBe(false);
  });

  it('the floor under a fitting is lit above the room, between two below it, and the ceiling darkest', () => {
    const f = fx[1], room = Math.max(...lit.room(corridor));
    const under = lum(lit, f.x, R.y0 + 0.1, f.z), between = lum(lit, (fx[0].x + fx[1].x) / 2, R.y0 + 0.1, (fx[0].z + fx[1].z) / 2);
    const ceiling = lum(lit, f.x + 1.5, R.y0 + R.ht - 0.1, f.z);
    expect(under).toBeGreaterThan(room);
    expect(between).toBeLessThan(under);
    expect(ceiling).toBeLessThan(between);
  });

  it('what the cast see you by follows the pools: you are harder to see between the lights than under one', () => {
    const f = fx[1], a = lit.atPoint(f.x, R.y0 + 0.5, f.z), b = lit.atPoint((fx[0].x + fx[1].x) / 2, R.y0 + 0.5, R.z0 + 0.3);
    expect(Math.max(...b)).toBeLessThan(Math.max(...a));
  });
});

describe('light past a room', () => {
  /* a lit room with a doorway into one left dark: Ops lit, its wing's corridor dead behind its cut */
  const only = (ids: number[], open: (d: number) => number = () => 1) =>
    new Lighting(w, c => (ids.includes(w.rooms.findIndex(R => R.circuit === c && ids.includes(R.id))) ? 2 : 0), open);
  const pairs = () => {
    const out: [number, number, number][] = [];
    for (const D of w.rooms) {
      if (!D.doorway) continue;
      const near = w.neighbours(D.id).filter(n => !w.rooms[n].doorway);
      if (near.length === 2 && w.rooms[near[0]].circuit !== w.rooms[near[1]].circuit) out.push([near[0], D.id, near[1]]);
    }
    return out;
  };

  /** a room with a pane of glass in its walls (light goes through a window: not this test's) */
  /* a room with a window: a pane lies in the middle of its opening, a quarter metre into a partition and a metre into the rock */
  const glazed = (id: number) => { const R = w.rooms[id]; return w.def.doors.some(d => d.glass && d.x1 > R.x0 - 1.1 && d.x0 < R.x1 + 1.1 && d.z1 > R.z0 - 1.1 && d.z0 < R.z1 + 1.1 && d.y0 < R.y0 + R.ht && d.y1 > R.y0); };

  it('reaches through a doorway into a dark room, falling off with distance, and not through its walls', () => {
    const [A, D, B] = pairs().find(([a, , b]) => w.rooms[a].lit === 'main' && w.rooms[b].lit !== 'always' && !glazed(a) && !glazed(b))!;
    const L = only([A]), Dr = w.rooms[D], Br = w.rooms[B];
    expect(Math.max(...L.room(B))).toBe(0); // the room itself is dark
    /* the doorway takes some of A's light, and B, just past it, less */
    const door = mid(D, 1), dl = lum(L, ...door);
    expect(dl).toBeGreaterThan(0.02);
    /* one step past the doorway into B, and farther along the way it faces */
    const cx = (Dr.x0 + Dr.x1) / 2, cz = (Dr.z0 + Dr.z1) / 2, dx = Math.sign(((Br.x0 + Br.x1) / 2 - cx) * (Dr.z1 - Dr.z0 < Dr.x1 - Dr.x0 ? 0 : 1)), dz = dx ? 0 : Math.sign((Br.z0 + Br.z1) / 2 - cz);
    const ex = dx > 0 ? Dr.x1 : dx < 0 ? Dr.x0 : cx, ez = dz > 0 ? Dr.z1 : dz < 0 ? Dr.z0 : cz;
    const near = lum(L, ex + dx * 0.6, Dr.y0 + 1, ez + dz * 0.6), farther = lum(L, ex + dx * 3, Dr.y0 + 1, ez + dz * 3);
    expect(near).toBeGreaterThan(0);
    expect(near).toBeLessThan(dl + 1e-6);
    expect(farther).toBeLessThan(near);
    /* and less still in B's far corner, round from the doorway */
    const corners = [[Br.x0 + 0.3, Br.z0 + 0.3], [Br.x1 - 0.3, Br.z0 + 0.3], [Br.x0 + 0.3, Br.z1 - 0.3], [Br.x1 - 0.3, Br.z1 - 0.3]];
    const [fx, fz] = corners.reduce((p, c) => (Math.hypot(c[0] - cx, c[1] - cz) > Math.hypot(p[0] - cx, p[1] - cz) ? c : p));
    expect(lum(L, fx, Br.y0 + 1, fz)).toBeLessThan(farther + 1e-6);
  });

  it('changes smoothly across a doorway: no step anywhere along the way through', () => {
    /* a sample, by the rooms either side (the range's door, a dark room off a bright hall, steps 0.16: known) */
    const sample = ['Main lift', 'Surface cage', 'Security elevator', 'Maintenance', 'Electrical room', 'Armory'];
    const some = pairs().filter(([a, , b]) => sample.includes(w.rooms[a].name) || sample.includes(w.rooms[b].name));
    expect(some.length).toBe(6);
    for (const [A, D] of some) {
      const L = only([A]), a = mid(A, 1), d = mid(D, 1);
      let prev = lum(L, ...a), worst = 0;
      for (let k = 1; k <= 40; k++) {
        const t = k / 40, v = lum(L, a[0] + (d[0] - a[0]) * t, a[1], a[2] + (d[2] - a[2]) * t);
        worst = Math.max(worst, Math.abs(v - prev));
        prev = v;
      }
      expect(worst).toBeLessThan(0.15);
    }
  });

  it('a shut door keeps it in; opened, it lets it through, as far as it is open', () => {
    const [A, D] = pairs().find(([a, d]) => w.rooms[a].lit === 'main' && w.def.doors.some(o => o.x0 >= w.rooms[d].x0 - 0.01 && o.x1 <= w.rooms[d].x1 + 0.01 && o.z0 >= w.rooms[d].z0 - 0.01 && o.z1 <= w.rooms[d].z1 + 0.01))!;
    const Dr = w.rooms[D], door = w.def.doors.findIndex(o => o.x0 >= Dr.x0 - 0.01 && o.x1 <= Dr.x1 + 0.01 && o.z0 >= Dr.z0 - 0.01 && o.z1 <= Dr.z1 + 0.01);
    /* the far side of the doorway from A */
    const Ar = w.rooms[A], alongZ = Dr.x1 - Dr.x0 <= Dr.z1 - Dr.z0 + 0.01 && (Ar.z1 <= Dr.z0 + 0.01 || Ar.z0 >= Dr.z1 - 0.01);
    const far: [number, number, number] = alongZ
      ? [(Dr.x0 + Dr.x1) / 2, Dr.y0 + 1, Ar.z1 <= Dr.z0 + 0.01 ? Dr.z1 - 0.3 : Dr.z0 + 0.3]
      : [Ar.x1 <= Dr.x0 + 0.01 ? Dr.x1 - 0.3 : Dr.x0 + 0.3, Dr.y0 + 1, (Dr.z0 + Dr.z1) / 2];
    const L = only([A], () => 0), shut = lum(L, ...far);
    L.follow(d => (d === door ? 0.5 : 0));
    const half = lum(L, ...far);
    L.follow(d => (d === door ? 1 : 0));
    const open = lum(L, ...far);
    expect(half).toBeGreaterThan(shut);
    expect(open).toBeGreaterThan(half);
    expect(open).toBeCloseTo(lum(only([A], d => (d === door ? 1 : 0)), ...far), 5);
    L.follow(() => 0);
    expect(lum(L, ...far)).toBeCloseTo(shut, 5);
  });

  it('spilt into a dark room, comes from the doorway it came through', () => {
    /* (which way it comes from is the renderer's: world/light.ts, towards) */
    let checked = 0;
    for (const [A, D, B] of pairs()) {
      if (w.rooms[A].lit !== 'main' || w.rooms[B].lit === 'always' || glazed(A) || glazed(B)) continue;
      const L = only([A]), Dr = w.rooms[D], Br = w.rooms[B];
      if (Math.max(...L.room(B)) > 0) continue;
      /* just past the doorway into B, as above */
      const cx = (Dr.x0 + Dr.x1) / 2, cz = (Dr.z0 + Dr.z1) / 2, dx = Math.sign(((Br.x0 + Br.x1) / 2 - cx) * (Dr.z1 - Dr.z0 < Dr.x1 - Dr.x0 ? 0 : 1)), dz = dx ? 0 : Math.sign((Br.z0 + Br.z1) / 2 - cz);
      const ex = dx > 0 ? Dr.x1 : dx < 0 ? Dr.x0 : cx, ez = dz > 0 ? Dr.z1 : dz < 0 ? Dr.z0 : cz, p = [ex + dx * 0.6, Dr.y0 + 1, ez + dz * 0.6] as const;
      if (lum(L, ...p) < 0.01) continue;
      const t = L.towards(...p);
      expect(-(t[0] * dx + t[2] * dz)).toBeGreaterThan(0.2);
      checked++;
    }
    expect(checked).toBeGreaterThan(2);
  });

  it('does not come through a wall: rooms side by side with none between them see none of each other', () => {
    /* every point of a dark room a wall's thickness from a lit one, with no opening between, is dark */
    const L = new Lighting(w, fullPower), off = (r: number) => Math.max(...L.room(r)) === 0 && !w.rooms[r].doorway;
    let checked = 0;
    for (const R of w.rooms) {
      if (!off(R.id)) continue;
      const open = new Set(w.neighbours(R.id));
      for (const S of w.rooms) {
        if (S.id === R.id || open.has(S.id) || off(S.id) || S.doorway) continue;
        /* S just across R's west wall, 2 m of rock, at R's floor */
        if (Math.abs(S.x1 - (R.x0 - 2)) > 0.01 || S.z1 <= R.z0 || S.z0 >= R.z1 || Math.abs(S.y0 - R.y0) > 0.5) continue;
        const z = (Math.max(S.z0, R.z0) + Math.min(S.z1, R.z1)) / 2;
        expect(lum(L, R.x0 + 0.2, R.y0 + 1, z)).toBe(0);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe('shadows of what stands about', () => {
  it('a desk or a table shades the floor under it', () => {
    let checked = 0;
    for (const p of w.def.props) {
      const R = w.roomAt(p.x, p.y + 0.05, p.z);
      if (!R || p.loose || p.sx < 1 || p.sz < 0.6 || p.sy > 0.15 || p.y < R.y0 + 0.5 || p.y > R.y0 + 1.2 || !lit.fixtures.has(R.id) || Math.abs(p.ry) > 0.01) continue;
      const under = lum(lit, p.x, R.y0 + 0.1, p.z), beside = lum(lit, p.x + p.sx / 2 + 0.8, R.y0 + 0.1, p.z);
      expect(under).toBeLessThan(beside * 0.9);
      checked++;
    }
    expect(checked).toBeGreaterThan(3);
  });
});

describe('a tube that stutters', () => {
  const main = makeSim(buildMain(STATION.ladders), { seed: 3, station: STATION }), mw = main.world, L = new Lighting(mw, fullPower);
  const lab = mw.rooms.find(R => R.flick)!;
  it('stutters wherever its light reaches, and only there', () => {
    const [x, y, z] = [(lab.x0 + lab.x1) / 2, lab.y0 + 1, (lab.z0 + lab.z1) / 2];
    expect(Math.max(...L.flickAt(x, y, z))).toBeCloseTo(Math.max(...L.atPoint(x, y, z)), 2); // in the lab, all of it
    /* in its doorway: some of the light there is the lab's */
    /* the lab and its strip in the partition on the gallery, which its doorway opens off */
    const door = mw.rooms.filter(R => R.name === lab.name).flatMap(R => mw.neighbours(R.id)).map(n => mw.rooms[n]).find(R => R.doorway)!;
    const d = [(door.x0 + door.x1) / 2, door.y0 + 1, (door.z0 + door.z1) / 2] as const;
    expect(Math.max(...L.flickAt(...d))).toBeGreaterThan(0);
    /* and none of it in a room well away */
    const far = mw.rooms.find(R => !R.flick && !R.doorway && R.lit !== 'none' && Math.hypot(R.x0 - lab.x0, R.z0 - lab.z0) > 30)!;
    expect(Math.max(...L.flickAt((far.x0 + far.x1) / 2, far.y0 + 1, (far.z0 + far.z1) / 2))).toBe(0);
  });
});

describe('lights put down', () => {
  /* you, in the dark suite at the start, with a light in hand, on */
  const holding = (tool: 'flash' | 'lantern') => {
    const s = makeSim(buildUpper(STATION.ladders), { seed: 3, station: STATION }), g = s.game;
    for (const it of s.items) if (it.id === 'flash') it.taken = true; // the one lying at the stair's foot is not this one
    give(g, tool, 1); g.light = tool; g.lightOn = true;
    /* at the end of the Security corridor, looking down it */
    const R = s.world.rooms.find(r => r.name === 'Security corridor')!, b = s.player.body, along = R.x1 - R.x0 > R.z1 - R.z0;
    b.x = along ? R.x0 + 1.2 : (R.x0 + R.x1) / 2; b.z = along ? (R.z0 + R.z1) / 2 : R.z0 + 1.2; b.y = R.y0; b.sync();
    s.player.yaw = along ? -Math.PI / 2 : Math.PI;
    for (const m of s.cast) { m.stun = 1e9; m.torch = false; } // the night round's beam out of it too: it walks this corridor
    step(s, noInput());
    return s;
  };
  const putDown = (s: Sim, tool: string) => { s.game.commands.push({ type: 'putDown', tool }); applyCommands(s); step(s, noInput()); };

  it('a flashlight put down on is the same beam, from where it lies: ahead of it, not behind, and not through a wall', () => {
    const s = holding('flash'), yaw = s.player.yaw;
    putDown(s, 'flash');
    expect(s.game.lightOn).toBe(false);
    expect(s.game.tools).not.toContain('flash');
    const it = s.items[s.items.length - 1], ax = -Math.sin(yaw), az = -Math.cos(yaw);
    expect(it.on).toBeDefined();
    const L = simLighting(s), dark = new Lighting(s.world, L.power, d => s.doors[d].t);
    const at = (d: number) => [it.x + ax * d, it.y + 0.2, it.z + az * d] as const;
    /* the beam, as the shader draws it: FLASH and spot(), from its lens */
    const ahead = Math.max(...L.seen(...at(2))) - Math.max(...dark.seen(...at(2)));
    expect(ahead).toBeGreaterThan(0.3);
    expect(Math.max(...L.seen(...at(-2)))).toBeLessThan(Math.max(...dark.seen(...at(-2))) + 0.02);
    /* in the beam's spill, but behind the corridor's side wall: nothing */
    const R = s.world.roomAt(it.x, it.y + 0.5, it.z)!, side = R.z1 + 1 - it.z, q = [it.x + ax * 6, it.y + 0.5, R.z1 + 1] as const;
    expect(spot(6 / Math.hypot(6, side, 0.46))).toBeGreaterThan(0.1); // it would be lit, but for the wall
    expect(Math.max(...L.seen(...q))).toBe(Math.max(...dark.seen(...q)));
  });

  it('taken again, it is on in your hand; and a light lying about is counted once, however often it is told of', () => {
    const s = holding('flash');
    putDown(s, 'flash');
    const it = s.items[s.items.length - 1], L = simLighting(s), before = Float32Array.from(L.colours);
    L.lights(looseLights(s)); L.lights(looseLights(s));
    /* the field unchanged, point for point (compared in a loop: the whole level's light is too big to diff quickly) */
    const now = L.colours;
    let moved = 0;
    for (let k = 0; k < now.length; k++) if (now[k] !== before[k]) moved++;
    expect(moved).toBe(0);
    s.usables.find(u => u.x === it.x && u.z === it.z)!.act();
    expect(it.taken).toBe(true);
    expect(s.game.lightOn).toBe(true);
    expect(s.game.light).toBe('flash');
    L.lights(looseLights(s));
    expect(looseLights(s)).toEqual([]);
  });

  it('a lantern put down on lights round it, through the level\'s light, and is gone when taken', () => {
    const s = holding('lantern');
    const dark = simLighting(s), b = s.player.body, here = [b.x, b.y + 0.5, b.z] as const, was = Math.max(...dark.atPoint(...here));
    putDown(s, 'lantern');
    const it = s.items[s.items.length - 1], L = simLighting(s);
    expect(Math.max(...L.atPoint(it.x, it.y + 0.5, it.z))).toBeGreaterThan(was + 0.3);
    s.usables.find(u => u.x === it.x && u.z === it.z)!.act();
    L.lights(looseLights(s));
    const none = new Lighting(s.world, L.power, d => L.open[d]);
    let worst = 0;
    for (let k = 0; k < L.colours.length; k++) worst = Math.max(worst, Math.abs(L.colours[k] - none.colours[k]));
    expect(worst).toBeLessThan(1e-4);
  });
});

describe('which way the light comes from', () => {
  /* the renderer's alone (Lighting.directions, towards): how much of the light at a point comes from one way, and which */
  const len = (v: readonly number[]) => Math.hypot(v[0], v[1], v[2]);
  const close = (a: Float32Array, b: Float32Array) => {
    let worst = 0;
    for (let k = 0; k < a.length; k++) worst = Math.max(worst, Math.abs(a[k] - b[k]));
    return worst;
  };

  it('under a fitting, from above; by a lamp, from the lamp; and never more than all of it', () => {
    const corridor = named('Security corridor'), R = w.rooms[corridor], f = lit.fixtures.get(corridor)![1];
    const up = lit.towards(f.x, R.y0 + 0.3, f.z);
    expect(up[1]).toBeGreaterThan(0.3);
    expect(up[1]).toBeGreaterThan(3 * Math.hypot(up[0], up[2]));
    /* a lamp, from a metre and a half off it, whichever way is open */
    const lamp = w.def.lamps.find(l => w.roomAt(l.x, l.y + 0.3, l.z)?.name === "Nurses' station")!;
    const off = [[1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5]].map(([dx, dz]) => [lamp.x + dx, lamp.y, lamp.z + dz] as const)
      .find(p => w.grid.at(...p) >= 0 && lum(lit, ...p) > 0)!;
    const t = lit.towards(...off), back = [lamp.x - off[0], lamp.y - off[1], lamp.z - off[2]];
    expect((t[0] * back[0] + t[1] * back[1] + t[2] * back[2]) / (len(t) * len(back))).toBeGreaterThan(0.8);
    /* summed by how bright each part is, it is never longer than the light it comes with */
    const col = lit.colours, dir = lit.directions;
    let over = 0;
    for (let p = 0; p < col.length; p += 3) {
      const l = 0.3 * col[p] + 0.59 * col[p + 1] + 0.11 * col[p + 2];
      if (len([dir[p], dir[p + 1], dir[p + 2]]) > l * 1.02 + 1e-4) over++;
    }
    expect(over).toBe(0);
  });

  it('follows the power, the doors and the lights put down as one made afresh has it', () => {
    const here = named('Operations corridor'), C = new Cascade(w, dark, lit, here, () => {});
    void C.L.directions; // kept from the start, and changed as the rooms come on
    for (let t = 0; t < 5 && !C.done; t += 1 / 60) C.update(1 / 60);
    expect(close(C.L.directions, lit.directions)).toBeLessThan(1e-3);
    /* a door opening, half and whole, and shutting again */
    const door = w.def.doors.findIndex(d => !d.glass), L = new Lighting(w, fullPower, () => 0);
    const shut = Float32Array.from(L.directions);
    L.follow(d => (d === door ? 0.5 : 0));
    L.follow(d => (d === door ? 1 : 0));
    expect(close(L.directions, new Lighting(w, fullPower, d => (d === door ? 1 : 0)).directions)).toBeLessThan(1e-3);
    L.follow(() => 0);
    expect(close(L.directions, shut)).toBeLessThan(1e-3);
    /* a lantern put down, and taken again */
    const [x, y, z] = mid(named('Security corridor'), 0.3);
    const lantern = { key: 'l', kind: 'lantern' as const, x, y, z, dx: 0, dy: 0, dz: 1, k: 1 };
    L.lights([lantern]);
    expect(close(L.directions, new Lighting(w, fullPower, () => 0, [lantern]).directions)).toBeLessThan(1e-3);
    L.lights([]);
    expect(close(L.directions, shut)).toBeLessThan(1e-3);
  });

  it('asking which way changes nothing the sim sees', () => {
    const a = new Lighting(w, fullPower), b = new Lighting(w, fullPower);
    void a.directions;
    expect(close(a.colours, b.colours)).toBe(0);
    for (const R of w.rooms.slice(0, 40)) expect(a.atPoint(...mid(R.id))).toEqual(b.atPoint(...mid(R.id)));
  });
});

describe('a lit fitting, as drawn', () => {
  it('is told from the rest by a take clear of the cut, so no face of the rest is lit as one', () => {
    /* the shader tells them apart by a vertex's own take (EMIT.cut); across a face a take of 1 came out a hair over 1
       on an NVIDIA card, and floors drew in streaks of a fitting's brightness while it was tested there */
    const near = (t: number) => Math.abs(t - EMIT.cut) < 0.2, lm = buildLevelMesh(w, lit), takes = new Set<number>();
    for (const g of [...lm.pieces, ...lm.services]) for (const t of g.getAttribute('aLight').array as Float32Array) takes.add(t);
    expect([...takes].filter(near)).toEqual([]);
    expect(takes.has(1)).toBe(true);
    expect([...takes].some(t => t > EMIT.cut)).toBe(true); // its fittings
    /* what the mesh takes of its own is the same on every level; a prop's take is the level's to say */
    for (const { id } of STATION.levels) expect(levelDef(STATION, id).props.map(p => p.glow).filter(near), id).toEqual([]);
  });
});
