import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { STATION } from '../src/content/station';
import { makeSim } from '../src/sim/sim';
import { power } from '../src/sim/game';
import { Lighting } from '../src/world/light';
import { Motes } from '../src/present/render/motes';
import { upper } from './kit';

/* What hangs in the air (present/render/motes.ts), headless: how much of it the air holds, and that a speck keeps the
   push of something passing through it instead of swinging back to where it was. */

const level = upper();
type Inside = { pos: Float32Array; vel: Float32Array; want: Float32Array; room: Int32Array };
const inside = (m: Motes) => m as unknown as Inside;

function air(full: boolean) {
  const sim = makeSim(level, { seed: 5, station: STATION });
  /* full: Gen-1 on and every circuit fed; otherwise dead, the backup sets off too (still air) */
  const st = sim.game.station!;
  if (full) { st.main = true; for (const c of Object.values(st.circuits)) { c.on = true; c.broken = false; } }
  else { st.main = false; for (const c of Object.values(st.circuits)) c.back = false; }
  const L = new Lighting(sim.world, c => power(sim.game, c)), m = new Motes(new THREE.Group(), L, () => {});
  return { sim, m, M: inside(m) };
}

describe('motes', () => {
  it('moving air holds a quarter of the dust still air does', () => {
    const shown = (full: boolean) => {
      let n = 0;
      for (let k = 0; k < 6; k++) {
        const { sim, m, M } = air(full);
        m.update(sim, new THREE.Vector3(77, 1.6, 25), 0); // in the Operations corridor, which runs south from the atrium
        for (let i = 0; i < 900; i++) if (M.room[i] >= 0 && sim.world.rooms[M.room[i]].name === 'Operations corridor' && M.want[i] > 0) n++;
      }
      return n;
    };
    const still = shown(false), moving = shown(true);
    expect(still).toBeGreaterThan(20);
    expect(moving / still).toBeGreaterThan(0.12);
    expect(moving / still).toBeLessThan(0.45);
  });

  it('what you walk through is carried and shoved along, and keeps going after you stop', () => {
    const { sim, m, M } = air(false), cam = new THREE.Vector3(66, 1.62, 0), dt = 1 / 60;
    const b = sim.player.body; b.x = 66; b.y = 0; b.z = 0; b.sync(); // your body is under the eye (you start a storey down)
    m.update(sim, cam, dt);
    m.update(sim, cam, dt);
    /* twenty specks of the corridor's, put in a strip ahead of you, low enough for your body, and at rest (where the
       scatter happens to put them is chance: a strip that small can hold three or none) */
    const corridor = sim.world.roomAt(67, 1, 0)!.id;
    const near = [...Array(900).keys()].filter(i => M.room[i] === corridor).slice(0, 20);
    expect(near.length).toBe(20);
    near.forEach((i, k) => { M.pos.set([66.5 + (k % 5) * 0.25, 0.4 + (k % 4) * 0.3, -0.5 + (k % 3) * 0.5], i * 3); M.vel.fill(0, i * 3, i * 3 + 3); });
    for (let t = 0; t < 0.5; t += dt) { cam.x += 4 * dt; m.update(sim, cam, dt); } // run east through them
    const vx = near.reduce((s, i) => s + M.vel[i * 3], 0) / near.length;
    expect(vx).toBeGreaterThan(0.3);
    const x1 = near.map(i => M.pos[i * 3]);
    for (let t = 0; t < 0.5; t += dt) m.update(sim, cam, dt); // stand still
    const on = near.filter((i, k) => M.pos[i * 3] > x1[k]).length;
    expect(on / near.length).toBeGreaterThan(0.8); // still going the way they were pushed, not swinging back
  });
});
