import { it } from 'vitest';
import { STATION } from '../../src/content/station';
import type { Shape } from '../../src/content/items';
import { wstats } from '../../src/sim/combat';
import { makeFields } from '../../src/sim/fields';
import { levelDef } from '../../src/sim/run';
import { makeSim } from '../../src/sim/sim';
import { along, frame } from '../../src/sim/sweep';
import { begin, say } from './out';

/* Where a swing glances (engine.md §6, F3b; *Which way a swing goes*): from every place the cast can stand (the nav
   graph's spots), facing eight ways with 1.6 m clear ahead at the eye, each weapon's path traced as the sim traces it
   (combat.ts, sweep: the head's path and the length of the thing from the hand to it, against the world, a blow
   meeting it above 0.3 m off the floor glancing), one way at a time. The share of places each way glances in, by
   level. Nothing alive is in the way: it measures the world alone. WEAPONS=pipe,axe for the weapons. */
it('glance', () => {
  begin('glance');
  const ways: Shape[] = ['side', 'back', 'chop'], ids = (process.env.WEAPONS ?? 'pipe,baton,axe').split(','), EYE = 1.6, YAWS = 8;
  const bodies = (d: { kind: string }) => d.kind === 'body';
  for (const L of STATION.levels) {
    const s = makeSim(levelDef(STATION, L.id), { station: STATION }), w = s.world, nav = (s.fields ?? makeFields(s)).nav;
    const n: Record<string, number> = {};
    let places = 0;
    for (let i = 0; i < nav.n; i++) for (let k = 0; k < YAWS; k++) {
      const yaw = (k / YAWS) * Math.PI * 2, x = nav.x[i], y = nav.y[i], z = nav.z[i], fx = -Math.sin(yaw), fz = -Math.cos(yaw);
      if (w.raycast(x, y + EYE, z, x + fx * 1.6, y + EYE, z + fz * 1.6, bodies) < 1) continue;
      places++;
      const F = frame({ x, y: y + EYE, z }, yaw, 0);
      for (const id of ids) for (const way of ways) {
        const R = wstats(id).reach;
        let glanced = false;
        for (let j = 0; j < 8 && !glanced; j++) {
          const H0 = along(F, way, R, j / 8), H1 = along(F, way, R, (j + 1) / 8);
          const tp = w.raycast(H0.x, H0.y, H0.z, H1.x, H1.y, H1.z, bodies), ts = w.raycast(F.p.x, F.p.y, F.p.z, H1.x, H1.y, H1.z, bodies);
          const cy = tp < 1 ? H0.y + (H1.y - H0.y) * tp : ts < 1 ? F.p.y + (H1.y - F.p.y) * ts : null;
          glanced = cy !== null && cy >= y + 0.3;
        }
        if (glanced) n[`${id} ${way}`] = (n[`${id} ${way}`] ?? 0) + 1;
      }
    }
    say(`${L.id} (${places} places): ${ids.map(id => `${id} ${ways.map(way => `${way} ${((100 * (n[`${id} ${way}`] ?? 0)) / places).toFixed(0)}%`).join(', ')}`).join('; ')}`);
  }
});
