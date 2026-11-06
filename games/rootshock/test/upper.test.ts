import { describe, expect, it } from 'vitest';
import { STATION } from '../src/content/station';
import { buildUpper } from '../src/content/levels/upper';
import { makeSim, step } from '../src/sim/sim';
import { noInput } from '../src/sim/input';
import { reach } from '../src/sim/reach';
import { Lighting, stationPower, fullPower } from '../src/world/light';
import { buildLevelMesh } from '../src/present/render/levelMesh';
import { matId } from '../src/present/render/shader';
import { looseLights } from '../src/sim/sim';
import { circle } from '../src/world/shapes';
import { field } from '../src/world/nav';
import { makeFields, rulesFor } from '../src/sim/fields';
import { upper } from './kit';

const level = upper();
const sim = makeSim(level);

describe('the upper station', () => {
  it('builds the same every time', () => {
    const again = buildUpper(STATION.ladders);
    expect(JSON.stringify(again)).toBe(JSON.stringify(level));
  });

  it('starts you standing in your isolation room, a storey under the wing', () => {
    const b = sim.player.body;
    expect(sim.world.roomAt(b.x, b.y + 1, b.z)?.name).toBe('Isolation room 1');
    expect(b.y).toBeCloseTo(-4.5);
    expect(sim.world.groundBelow(circle(b.x, b.z, b.r), b.y + 0.1)).toBeCloseTo(b.y);
    expect(sim.world.overlap(circle(b.x, b.z, b.r), b.y + 0.01, b.y + 1.8, b.dyn)).toBe(null);
  });

  it('can be walked: every room is reachable on foot from the start, except the welded and the grown shut', () => {
    const r = reach(sim);
    const named = new Set(level.rooms.map(R => R.name).filter(Boolean));
    const missing = [...named].filter(n => !r.rooms.has(n)).sort();
    expect(missing).toEqual(['Freight shaft', 'Operations room', 'Phase 2']); // the operations room, its door grown shut; the freight shaft's foot, fenced off 30 m down
  });

  it('walls what the 2 m layout left open: room 4\'s corner, the isolation hall\'s top, the upper corridor\'s side', () => {
    const w = sim.world, r = 0.32;
    /** how far a body gets walking from (ax, az) to (bx, bz) with its feet at y, as a share of the way */
    const walk = (ax: number, az: number, bx: number, bz: number, y: number) => w.sweep(circle(ax, az, r), y + 0.1, y + 1.7, bx - ax, bz - az);
    /* room 4 keeps its corner, and its partition meets the north side's: nobody walks round the end of it from the
       stair's foot (they did, and its corner was the hall's) */
    expect(w.roomAt(52.4, -4, -23.6)?.name).toBe('Isolation room 4');
    expect(walk(53.6, -22.4, 51.2, -24.8, -4.5)).toBeLessThan(0.5);
    /* from the check-in hall and screening, east into the isolation hall's upper half: a wall, not a 4.5 m drop */
    for (const z of [-20.5, -16]) expect(walk(40, z, 44, z, 0) * 4).toBeCloseTo(1.5 - r, 1);
    /* the upper corridor runs beside the lobby's air behind a wall, and opens only onto the gallery */
    expect(walk(32, -9, 28, -9, 5) * 4).toBeCloseTo(1.5 - r, 1);
    expect(walk(32, -3, 28, -3, 5)).toBe(1);
  });

  it('lights in two halves: the wing dead behind its cut, Ops on its backup set, Cargo dark', () => {
    const at = (L: Lighting, name: string) => L.room(level.rooms.find(r => r.name === name)!.id);
    const L = new Lighting(sim.world, stationPower(STATION.circuits, STATION.main));
    /* the suite is the wing's, and with the feed cut has only its emergency cells: dim, not dark */
    expect(at(L, 'Isolation room 1')[0]).toBeGreaterThan(0.03);
    expect(at(L, 'Isolation room 1')[0]).toBeLessThan(0.1);
    expect(at(L, 'Security corridor')[0]).toBe(0); // the wing's feed is cut
    const em = at(L, 'Operations corridor');
    expect(em[0]).toBeGreaterThan(0.2); // emergency lights on the backup set
    expect(em[2]).toBeLessThan(em[0] * 0.6); // amber, not white
    expect(Math.max(...em)).toBeCloseTo(0.4 * Math.max(...level.rooms.find(r => r.name === 'Operations corridor')!.lc), 5); // as visible as before
    expect(at(L, 'Atrium')[0]).toBeGreaterThan(0.2); // the threshold: theirs, and lit
    expect(at(L, 'Firing range')[0]).toBe(0); // no emergency lights: dark on backup
    expect(at(L, 'Operations room')[0]).toBeGreaterThan(0.2); // its emergency lights: seen through its glass
    expect(at(L, 'Cargo cavern')[0]).toBe(0); // its backup set is not running
    /* mended, the wing takes what Ops has: the backup set's amber */
    const mended = structuredClone(STATION.circuits);
    mended.SEC.broken = false;
    const M = new Lighting(sim.world, stationPower(mended, STATION.main));
    const wing = at(M, 'Security corridor');
    expect(wing[0]).toBeGreaterThan(0.2);
    expect(wing[2]).toBeLessThan(wing[0] * 0.6);
    const full = new Lighting(sim.world, fullPower);
    const R = level.rooms.find(r => r.name === 'Cargo cavern')!;
    expect(full.room(R.id)[0]).toBeGreaterThan(0.5);
    expect(full.atPoint((R.x0 + R.x1) / 2, R.y0 + 1, (R.z0 + R.z1) / 2)[0]).toBeGreaterThan(0.5);
  });

  it('lights the suite, its feed cut, by its emergency cells and its exit signs; the guard\'s flashlight lies there, off', () => {
    const hall = level.rooms.find(r => r.name === 'Isolation suite')!, F = level.items.find(it => it.id === 'flash')!;
    expect(F.on).toBeUndefined(); // days dead, and his light with him
    expect(sim.world.roomAt(F.x, F.y + 0.3, F.z)?.name).toBe('Isolation suite');
    const power = stationPower(STATION.circuits, STATION.main), off = new Lighting(sim.world, power);
    expect(looseLights(sim).filter(L => L.key.startsWith('item'))).toEqual([]); // none lying on (the night round's is in its hand)
    /* dim, cool and even: enough to find your way to it by, not to see far */
    const c = off.room(hall.id);
    expect(Math.max(...c)).toBeGreaterThan(0.03);
    expect(Math.max(...c)).toBeLessThan(0.1);
    expect(c[2]).toBeGreaterThanOrEqual(c[0]);
    /* the exit signs: green, a little light each, whatever the power (the suite's two, and the retreat's fire exit
       over its door into the suite) */
    const signs = level.lamps.filter(l => l.colour[1] > l.colour[0] * 3);
    expect(signs.length).toBe(3);
    for (const S of signs) expect(Math.max(...off.atPoint(S.x, S.y + 0.5, S.z))).toBeGreaterThan(0.1);
  });

  it('looks out over the bay through glass: it stops you, and sight goes through it', () => {
    const s = makeSim(level, { seed: 1, station: STATION }), panes = s.doors.filter(d => d.def.glass && d.def.circuit === 'CARGO' && d.def.x0 > 108 && d.def.x1 < 110); // Cargo control's, over the bay
    expect(panes.length).toBe(3);
    const P = panes[1].def, x = P.x0 - 1.2, z = (P.z0 + P.z1) / 2, y = P.y0 + 1.6;
    /* a line from Cargo control out into the bay: glass is no wall to an eye, but it is to a ray that sees nothing through it */
    expect(s.world.raycast(x, y, z, x + 12, y - 2, z, d => d.kind === 'body' || !!d.glass)).toBe(1);
    expect(s.world.raycast(x, y, z, x + 12, y - 2, z, () => false)).toBeLessThan(1);
    /* and you walk into it and no further */
    const b = s.player.body; b.x = x; b.y = P.y0; b.z = z; b.sync();
    for (let k = 0; k < 120; k++) step(s, { ...noInput(), forward: 1 });
    expect(b.x).toBeLessThan(P.x1);
  });

  it('floors the second floor in one colour: the gallery\'s slab stops at the door into Cargo control', () => {
    const R = level.rooms.find(r => r.name === 'Cargo control')!, G = level.rooms.find(r => r.name === 'Gallery' && r.z1 - r.z0 > 10)!;
    const under = (Q: typeof R) => level.blocks.filter(b => b.y1 === Q.y0 && b.x0 < Q.x1 && b.x1 > Q.x0 && b.z0 < Q.z1 && b.z1 > Q.z0);
    const room = new Set(under(R).map(b => b.colour.join())), walk = new Set(under(G).map(b => b.colour.join()));
    expect(room.size).toBe(1);
    expect(walk.size).toBe(1);
    expect([...room][0]).not.toBe([...walk][0]);
  });

  it('floors a fitted room upstairs in its own finish, not its slab\'s concrete', () => {
    const mesh = buildLevelMesh(sim.world, new Lighting(sim.world, fullPower)), seen = new Map<string, Set<number>>();
    const rooms = ['Checkpoint', 'Staff mess', 'Cargo control'].map(n => level.rooms.find(r => r.name === n)!);
    for (const g of mesh.pieces) {
      const P = g.getAttribute('position'), M = g.getAttribute('aMat');
      for (let i = 0; i < P.count; i += 3) {
        const y = (P.getY(i) + P.getY(i + 1) + P.getY(i + 2)) / 3, x = (P.getX(i) + P.getX(i + 1) + P.getX(i + 2)) / 3, z = (P.getZ(i) + P.getZ(i + 1) + P.getZ(i + 2)) / 3;
        const R = rooms.find(q => Math.abs(y - q.y0) < 0.01 && x > q.x0 + 0.5 && x < q.x1 - 0.5 && z > q.z0 + 0.5 && z < q.z1 - 0.5);
        if (R) seen.set(R.name, (seen.get(R.name) ?? new Set()).add(Math.round(M.getX(i))));
      }
    }
    /* (what stands on the floor faces it from below, in its own material) */
    for (const R of rooms) {
      expect([...(seen.get(R.name) ?? [])], R.name).toContain(matId(R.mat.floor));
      expect([...(seen.get(R.name) ?? [])], R.name).not.toContain(matId('concrete'));
    }
  });

  it('sinks the muster court 1.25 m under the hall, with steps down both long sides, and lifts its ceiling to 8.5 m', () => {
    const court = level.rooms.find(r => r.name === 'Muster court')!, hall = level.rooms.filter(r => r.name === 'Muster hall' && !r.part);
    expect(court.y0).toBeCloseTo(-1.25);
    expect(court.y0 + court.ht).toBeCloseTo(8.5);
    expect(hall.length).toBe(4);
    for (const H of hall) expect(H.y0 + H.ht).toBeCloseTo(4.5);
    const mx = (court.x0 + court.x1) / 2 + 6, mz = (court.z0 + court.z1) / 2, w = sim.world; // clear of the middle
    expect(w.groundBelow(circle(mx, mz, 0.3), 1)).toBeCloseTo(-1.25); // the court's floor
    expect(w.groundBelow(circle(mx, court.z0 + 2, 0.3), 1)).toBeGreaterThan(-1.25); // part way up its steps
    /* the nav graph walks the steps both ways: from the court's floor to the promenade and back, no drop */
    const nav = makeFields(sim).nav, a = nav.locate(mx, -1.25, mz), b = nav.locate(mx, 0, court.z0 - 1);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(b).toBeGreaterThanOrEqual(0);
    const F = field(nav, b, rulesFor(sim, makeFields(sim), 'big'));
    expect(F[a]).toBeLessThan(20); // what fits through no door comes down into it as easily as you do
  });

  it('measures: chunks, memory, mesh', () => {
    const t0 = performance.now();
    makeSim(buildUpper(STATION.ladders));
    const compile = performance.now() - t0;
    const t1 = performance.now();
    const lm = buildLevelMesh(sim.world, new Lighting(sim.world, fullPower));
    const mesh = performance.now() - t1, verts = lm.pieces.reduce((n, g) => n + g.getAttribute('position').count, 0);
    const chunks = sim.world.grid.chunkCount;
    const t2 = performance.now(), L = new Lighting(sim.world, stationPower(STATION.circuits, STATION.main));
    void L.colours;
    lm.relight(L);
    const relight = performance.now() - t2;
    expect(relight).toBeLessThan(100);
    console.log(`relight on a power change: ${relight.toFixed(1)} ms`);
    console.log(`upper station: ${level.rooms.length} rooms, ${level.props.length} props, ${chunks} chunks (${((chunks * 8) / 1024).toFixed(1)} MB of grid), ` +
      `build + compile ${compile.toFixed(0)} ms, mesh ${mesh.toFixed(0)} ms, ${verts} vertices in ${lm.pieces.length} pieces`);
    expect(chunks * 8 * 1024).toBeLessThan(64 * 1024 * 1024);
  });
});
