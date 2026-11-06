import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { STATION } from '../src/content/station';
import { makeSim, type Sim } from '../src/sim/sim';
import { power } from '../src/sim/game';
import { Lighting } from '../src/world/light';
import { Prints } from '../src/present/render/prints';
import { upper } from './kit';

/* Footprints (present/render/prints.ts), headless: wet ones after water, red ones after blood, a pace apart; the cast's
   too; a print on one already there grows it. */

const level = upper();
type Print = { x: number; z: number; stuff: 'wet' | 'red' | 'green'; k: number; w: number; l: number };
const list = (p: Prints) => (p as unknown as { list: Print[] }).list;

function setUp() {
  const sim = makeSim(level, { seed: 2, station: STATION });
  const p = new Prints(new THREE.Group(), new Lighting(sim.world, c => power(sim.game, c)));
  return { sim, p };
}
/** walk east along the Security corridor and into the atrium from x0 to x1, a frame at a time */
function walk(sim: Sim, p: Prints, x0: number, x1: number): void {
  const b = sim.player.body;
  b.z = 0; b.y = 0; b.ground = true; b.on = null; sim.player.yaw = -Math.PI / 2;
  for (let x = x0; x <= x1; x += 0.05) { b.x = x; p.update(sim, 1 / 60); }
}
/** walk south down the Operations corridor, at x, from z0 to z1 */
function walkSouth(sim: Sim, p: Prints, x: number, z0: number, z1: number): void {
  const b = sim.player.body;
  b.x = x; b.y = 0; b.ground = true; b.on = null; sim.player.yaw = Math.PI;
  for (let z = z0; z <= z1; z += 0.05) { b.z = z; p.update(sim, 1 / 60); }
}
/** the pool of blood in the Operations corridor */
function corridorStain() {
  const R = level.rooms.find(r => r.name === 'Operations corridor')!;
  return level.stains!.find(s => s.x > R.x0 && s.x < R.x1 && s.z > R.z0 + 3 && s.z < R.z1 - 8)!;
}

describe('footprints', () => {
  it('the level knows where its blood is', () => {
    expect((level.stains ?? []).length).toBeGreaterThan(3);
  });

  it('none on a dry, clean floor; out of water, wet ones a pace apart that run out after a dozen or so', () => {
    const { sim, p } = setUp();
    walk(sim, p, 62, 70);
    expect(list(p).length).toBe(0);
    sim.player.water = 'wading';
    walk(sim, p, 70, 71);
    sim.player.water = 'dry';
    walk(sim, p, 71, 85);
    const L = list(p);
    expect(L.length).toBeGreaterThan(8);
    expect(L.length).toBeLessThan(20);
    expect(L.every(q => q.stuff === 'wet' && q.k > 0)).toBe(true);
    expect(Math.abs(L[1].x - L[0].x - 0.75)).toBeLessThan(0.1);
    expect(Math.sign(L[0].z) !== Math.sign(L[1].z)).toBe(true); // left, right
  });

  it('through a pool of blood, red ones after it', () => {
    const { sim, p } = setUp();
    const S = corridorStain();
    expect(S).toBeTruthy();
    walkSouth(sim, p, S.x, S.z - 3, S.z + 8);
    const red = list(p).filter(q => q.stuff === 'red');
    expect(red.length).toBeGreaterThan(4);
    expect(Math.min(...red.map(q => q.z))).toBeGreaterThan(S.z - S.r - 0.3);
  });

  it('the cast leave theirs: a husk through blood walks red soles out of it; a skitter claws; one badly hurt drips', () => {
    const { sim, p } = setUp();
    const S = corridorStain();
    const husk = sim.cast.find(m => m.ai === 'husk')!, sk = sim.cast.find(m => m.ai === 'skitter')!;
    for (const m of sim.cast) if (m !== husk && m !== sk) m.dead = true;
    const walkIt = (m: typeof husk, z0: number, z1: number, x: number) => {
      m.x = x; m.y = 0; m.yaw = 0; // facing south
      if (m.body) { m.body.ground = true; m.body.on = null; }
      for (let z = z0; z <= z1; z += 0.05) { m.z = z; p.update(sim, 1 / 60); }
    };
    walkIt(husk, S.z - 2, S.z + 6, S.x);
    const soles = list(p).filter(q => q.stuff === 'red');
    expect(soles.length).toBeGreaterThan(3);
    const before = list(p).length;
    walkIt(sk, S.z - 2, S.z + 4, S.x + 0.7); // its legs splay wide: one side's claws through the middle of the pool
    expect(list(p).length).toBeGreaterThan(before + 3); // a skitter's pace is short: more prints in less ground
  });

  it('a print that comes down on one already there grows it instead of lying on top', () => {
    const { sim, p } = setUp();
    type Step = (sim: Sim, F: object, g: object, x: number, y: number, z: number, face: number, wet: boolean, firm: boolean) => void;
    const step = (p as unknown as { step: Step }).step.bind(p), gait = { w: 0.12, l: 0.28, pace: 0.75, side: 0.1 };
    const F = { x: 66, z: 0, gone: 0, left: false, wet: 0, blood: 1, sap: false };
    step(sim, F, gait, 66, 0, 0, 0, false, true);
    const first = list(p)[0].w;
    F.left = false; F.blood = 1;
    step(sim, F, gait, 66, 0, 0, 0, false, true); // the same foot in the same place
    expect(list(p).length).toBe(1);
    expect(list(p)[0].w).toBeGreaterThan(first);
    for (let k = 0; k < 30; k++) { F.left = false; F.blood = 1; step(sim, F, gait, 66, 0, 0, 0, false, true); }
    expect(list(p)[0].w).toBeLessThanOrEqual(first * 1.6 + 1e-6); // up to a point
    expect(list(p)[0].l).toBeLessThanOrEqual(0.28 * 1.6 + 1e-6);
  });
});
