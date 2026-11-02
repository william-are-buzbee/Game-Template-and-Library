import { circle } from '../world/shapes';
import type { Sim } from './sim';
import { STEP_UP } from './body';
import { CROUCH } from './player';

/* Where a body can get to on foot from where it stands: a flood over the level on a 1 m lattice. Each spot is a place to
   stand (ground under it, room for a crouch over it); from a spot you can step to a neighbour if there is room on the
   way, climbing up to STEP_UP or dropping any distance. Every door that is not welded shut counts as open, and a platform
   joins its bottom to its top, as a ladder its foot to its head. It answers "can all of this level be walked?" (engine.md §13, step 3), and is the seed of
   the progression checker (step 7). */

export interface Reach {
  /** names of rooms with at least one reachable spot */
  rooms: Set<string>;
  spots: number;
}

const R = 0.3;

export function reach(sim: Sim, from = sim.player.body): Reach {
  const w = sim.world;
  /* open every door that can open, for the duration */
  const saved = sim.doors.map(d => ({ ...d.dyn }));
  for (const d of sim.doors) if (!d.def.seal && !d.def.stuck) d.dyn.y0 = d.dyn.y1 = -1e6;
  /* platforms are where they are; the flood rides them separately */
  const plats = sim.platforms.map(p => ({ ...p.dyn }));
  for (const p of sim.platforms) p.dyn.y0 = p.dyn.y1 = -1e6;
  const self = new Set([from.dyn, ...sim.loose.all.map(o => o.dyn)]);
  const hidden = w.dyn.filter(d => self.has(d)).map(d => ({ d, y0: d.y0, y1: d.y1 }));
  for (const h of hidden) h.d.y0 = h.d.y1 = -1e6;

  const seen = new Set<string>(), rooms = new Set<string>();
  const key = (x: number, y: number, z: number) => `${Math.round(x)},${Math.round(y * 4)},${Math.round(z)}`;
  const fits = (x: number, z: number, y: number) => !w.overlap(circle(x, z, R), y + 1e-3, y + CROUCH);
  const queue: [number, number, number][] = [];
  const visit = (x: number, y: number, z: number) => {
    const k = key(x, y, z);
    if (seen.has(k)) return;
    seen.add(k);
    queue.push([x, y, z]);
    const r = w.roomAt(x, y + 0.5, z);
    if (r?.name) rooms.add(r.name);
  };
  const sx = Math.floor(from.x) + 0.5, sz = Math.floor(from.z) + 0.5;
  visit(sx, w.groundBelow(circle(sx, sz, R), from.y + STEP_UP), sz);
  while (queue.length) {
    const [x, y, z] = queue.pop()!;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      /* the way there, at this height or stepped up */
      const g = w.groundBelow(circle(nx, nz, R), y + STEP_UP);
      if (g === -Infinity) continue;
      const top = Math.max(g, y);
      if (!fits(x + dx / 2, z + dz / 2, top) || !fits(nx, nz, g)) continue;
      visit(nx, g, nz);
    }
    /* a platform under you takes you to its other end */
    for (let i = 0; i < plats.length; i++) {
      const p = sim.platforms[i].def;
      if (x < p.x0 || x > p.x1 || z < p.z0 || z > p.z1) continue;
      for (const py of [p.y0, p.y1]) if (Math.abs(py - y) > 0.3) visit(x, py, z);
    }
    /* a ladder you stand by takes you to its other end, onto the floor beside its hatch or at its foot */
    for (const L of w.def.climbs ?? []) {
      if (!(x > L.x0 - 1 && x < L.x1 + 1 && z > L.z0 - 1 && z < L.z1 + 1)) continue;
      for (const [y0, y1] of [[L.y0, L.y1], [L.y1, L.y0]]) {
        if (Math.abs(y - y0) > 0.4) continue;
        for (let ix = Math.floor(L.x0 - 1); ix <= Math.ceil(L.x1); ix++) for (let iz = Math.floor(L.z0 - 1); iz <= Math.ceil(L.z1); iz++) {
          const g = w.groundBelow(circle(ix + 0.5, iz + 0.5, R), y1 + 0.3);
          if (Math.abs(g - y1) < 0.3 && fits(ix + 0.5, iz + 0.5, g)) visit(ix + 0.5, g, iz + 0.5);
        }
      }
    }
  }

  saved.forEach((b, i) => Object.assign(sim.doors[i].dyn, b));
  plats.forEach((b, i) => Object.assign(sim.platforms[i].dyn, b));
  for (const h of hidden) { h.d.y0 = h.y0; h.d.y1 = h.y1; }
  return { rooms, spots: seen.size };
}
