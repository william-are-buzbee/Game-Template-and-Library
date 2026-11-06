import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/content/build/builder';
import { testbed } from '../src/content/levels/testbed';
import { WALL_MIN, roomHas } from '../src/content/types';
import { buildLevelMesh } from '../src/present/render/levelMesh';
import { matId } from '../src/present/render/shader';
import { makeFields } from '../src/sim/fields';
import { makeSim } from '../src/sim/sim';
import { CELL } from '../src/world/grid';
import { Lighting, fullPower } from '../src/world/light';
import { circle, meetsTurned, rect } from '../src/world/shapes';
import { World } from '../src/world/world';

/* Walls at an angle (world.ts, walls; content/build/builder.ts, outline and wall): exact for everything that asks the
   world, though the grid under them is a staircase of cells. The test bed's angled hall, south of the lab, and the annex
   off it through a gap in a wall at 127 degrees: the hall lit and painted block, the annex dark and in glazed tile. */

const sim = makeSim(testbed()), w = sim.world;
const named = (n: string) => w.rooms.find(R => R.name === n)!;
const hall = named('Angled hall'), annex = named('Angled annex');
/** a point by the wall between them: f of the way along its line from (12.5, 41) to (8, 47), d off it toward the annex */
const by = (f: number, d: number): [number, number] => [12.5 - 4.5 * f + 0.8 * d, 41 + 6 * f + 0.6 * d];
const T = 0.5, r = 0.32;

describe('a wall at an angle', () => {
  it('stands between two rooms of any outline, each carved as drawn', () => {
    expect(w.roomAt(by(0.25, -1)[0], 1, by(0.25, -1)[1])?.id).toBe(hall.id);
    expect(w.roomAt(by(0.25, 1)[0], 1, by(0.25, 1)[1])?.id).toBe(annex.id);
    expect(w.roomAt(12.2, 1, 37.3)).toBe(null); // past the hall's corner cut at an angle: rock
    expect(roomHas(hall, 4, 42)).toBe(true);
    expect(roomHas(hall, 11.5, 45)).toBe(false);
  });

  it('stops a body at its face, and lets it through the gap in it', () => {
    for (const f of [0.15, 0.3, 0.7, 0.85]) {
      expect(w.overlap(circle(...by(f, 0), r), 0.1, 1.7)).toBe('world');
      expect(w.overlap(rect(...by(f, 0), 0.2, 0.2), 0.1, 1.7)).toBe('world');
      /* (where both rooms are wide enough to stand in) */
      if (f > 0.2) for (const s of [-1, 1]) expect(w.overlap(circle(...by(f, s * (T / 2 + r + 0.02)), r), 0.1, 1.7)).toBe(null);
    }
    expect(w.overlap(circle(...by(0.5, 0), r), 0.1, 1.7)).toBe(null);
    /* walking straight at it from a metre off, it gets as far as the face, less its own radius */
    const [ax, az] = by(0.25, -1), [bx, bz] = by(0.25, 1), t = w.sweep(circle(ax, az, r), 0.1, 1.7, bx - ax, bz - az);
    expect(t * 2).toBeCloseTo(1 - T / 2 - r, 1);
  });

  it('stops sight, and lets it through the gap', () => {
    const [ax, az] = by(0.25, -1), [bx, bz] = by(0.25, 1);
    expect(w.raycast(ax, 1.5, az, bx, 1.5, bz)).toBeCloseTo((1 - T / 2) / 2, 3);
    const [cx, cz] = by(0.5, -1), [dx, dz] = by(0.5, 1);
    expect(w.raycast(cx, 1.5, cz, dx, 1.5, dz)).toBe(1);
  });

  it('stops the light: behind it, the dark annex is dark, but where the gap lets the hall in', () => {
    const L = new Lighting(w, fullPower), lum = (x: number, z: number) => Math.max(...L.atPoint(x, 1.2, z));
    const front = lum(...by(0.12, -0.6)), behind = lum(...by(0.12, 0.6)), gap = lum(...by(0.5, 0.6));
    expect(front).toBeGreaterThan(0.1);
    expect(behind).toBeLessThan(front * 0.1);
    expect(gap).toBeGreaterThan(behind * 2);
  });

  it('is gone round, not through, by the cast: every link across its line goes through the gap', () => {
    const nav = makeFields(sim).nav, line = w.walls.filter(W => Math.abs((W.bx - W.ax) * 6 + (W.bz - W.az) * 4.5) < 1e-6);
    expect(line.length).toBe(2);
    const side = (x: number, z: number) => Math.sign((x - 12.5) * 0.8 + (z - 41) * 0.6);
    let through = 0;
    for (let a = 0; a < nav.n; a++)
      for (let e = nav.start[a]; e < nav.start[a + 1]; e++) {
        const b = nav.to[e], A = [nav.x[a], nav.z[a]], B = [nav.x[b], nav.z[b]];
        if (side(A[0], A[1]) === side(B[0], B[1]) || side(A[0], A[1]) === 0) continue;
        /* where it crosses the line, as f along it */
        const da = (A[0] - 12.5) * 0.8 + (A[1] - 41) * 0.6, db = (B[0] - 12.5) * 0.8 + (B[1] - 41) * 0.6, k = da / (da - db);
        const x = A[0] + (B[0] - A[0]) * k, z = A[1] + (B[1] - A[1]) * k, f = ((x - 12.5) * -0.6 + (z - 41) * 0.8) / 7.5;
        if (f < -0.05 || f > 1.05) continue;
        expect(Math.abs(f - 0.5)).toBeLessThan(0.7 / 7.5);
        through++;
      }
    expect(through).toBeGreaterThan(0);
  });

  it('is faced on each side as the room in front of it: painted block in the hall, glazed tile in the annex', () => {
    const mesh = buildLevelMesh(w, new Lighting(w, fullPower)), seen = { hall: new Set<number>(), annex: new Set<number>() };
    /* the triangles on its faces, along the first piece of it, between the stripe and the high band */
    for (const g of mesh.pieces) {
      const P = g.getAttribute('position'), M = g.getAttribute('aMat');
      for (let i = 0; i < P.count; i += 3) {
        const x = (P.getX(i) + P.getX(i + 1) + P.getX(i + 2)) / 3, y = (P.getY(i) + P.getY(i + 1) + P.getY(i + 2)) / 3, z = (P.getZ(i) + P.getZ(i + 1) + P.getZ(i + 2)) / 3;
        const d = (x - 12.5) * 0.8 + (z - 41) * 0.6, f = ((x - 12.5) * -0.6 + (z - 41) * 0.8) / 7.5;
        if (f < 0 || f > 0.4 || y < 1.1 || y > 3.1 || Math.abs(Math.abs(d) - T / 2) > 0.01) continue;
        (d < 0 ? seen.hall : seen.annex).add(Math.round(M.getX(i)));
      }
    }
    expect([...seen.hall]).toEqual([matId('block')]);
    expect([...seen.annex]).toEqual([matId('glazed')]);
  });
});

describe('a room of any outline', () => {
  /* eight sides, its corners cut at 45 degrees; and a room beside it across a side at an angle, walled whole */
  const oct: [number, number][] = [[2, 0], [6, 0], [8, 2], [8, 6], [6, 8], [2, 8], [0, 6], [0, 2]];
  const b = new LevelBuilder('t', 'T');
  b.outline('Octagon', oct, { ht: 3, nolamp: true });
  b.outline('Beside', [[6, 0], [12, 0], [12, 2], [8, 2]], { ht: 3, nolamp: true, walls: false });
  const v = new World(b.finish()), O = v.rooms[0];

  it('walls its sides at an angle, closing its corners', () => {
    expect(v.walls.length).toBe(4);
    for (const W of v.walls) expect(W.t).toBeGreaterThanOrEqual(WALL_MIN);
    /* a body cannot get out of it anywhere: round its sides, just inside, it is free, and just outside, it is not */
    for (let a = 0; a < 64; a++) {
      const c = Math.cos((a / 64) * 2 * Math.PI), s = Math.sin((a / 64) * 2 * Math.PI);
      const reach = (k: number) => { let d = 0; while (roomHas(O, 4 + c * d, 4 + s * d)) d += 0.01; return d * k; };
      expect(v.overlap(circle(4 + c * reach(0.5), 4 + s * reach(0.5), 0.3), 0.1, 1.7)).toBe(null);
      expect(v.overlap(circle(4 + c * (reach(1) + 0.05), 4 + s * (reach(1) + 0.05), 0.05), 0.1, 1.7)).toBe('world');
    }
  });

  it('hides the staircase its cells make: what pokes out of it, and whatever pokes into it, is in a wall', () => {
    const inWall = (x: number, z: number) => v.walls.some(W => meetsTurned(circle(x, z, 1e-4), W.turn));
    /* a point well inside it, or well outside it (not on a side) */
    const deep = (x: number, z: number, inside: boolean) => [[0.01, 0.01], [-0.01, 0.01], [0.01, -0.01], [-0.01, -0.01]].every(([dx, dz]) => roomHas(O, x + dx, z + dz) === inside);
    let checked = 0;
    for (let k = -4; k < 40; k++)
      for (let i = -4; i < 52; i++) {
        const own = v.grid.get(i, 4, k) === O.id;
        for (const [x, z] of [[i, k], [i + 1, k], [i, k + 1], [i + 1, k + 1]].map(([a, c]) => [a * CELL, c * CELL]))
          if (deep(x, z, !own)) { expect(inWall(x, z)).toBe(true); checked++; }
      }
    expect(checked).toBeGreaterThan(20);
  });

  it('is no neighbour of a room across a wall from it', () => {
    expect(v.neighbours(O.id)).not.toContain(1);
  });
});
