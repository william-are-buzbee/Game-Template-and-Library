import { it } from 'vitest';
import { STATION } from '../../src/content/station';
import { testbed } from '../../src/content/levels/testbed';
import { makeRun, stepRun } from '../../src/sim/run';
import { makeSim, step, simLighting, looseLights } from '../../src/sim/sim';
import { spawn } from '../../src/sim/cast';
import { noInput } from '../../src/sim/input';
import { begin, say } from './out';

/* What a sim step costs, level by level: the mean and the worst of a few seconds' steps, walking forward and turning */
it('step cost', () => {
  const lines: string[] = [];
  const time = (label: string, stepOnce: (k: number) => void, n = 600) => {
    for (let k = 0; k < 60; k++) stepOnce(k);
    const t: number[] = [];
    for (let k = 0; k < n; k++) { const t0 = performance.now(); stepOnce(k); t.push(performance.now() - t0); }
    t.sort((a, b) => a - b);
    const mean = t.reduce((a, b) => a + b, 0) / n;
    lines.push(`${label.padEnd(28)} mean ${mean.toFixed(3)} ms  p50 ${t[n >> 1].toFixed(3)}  p95 ${t[Math.floor(n * 0.95)].toFixed(3)}  max ${t[n - 1].toFixed(3)}`);
  };
  const walk = (k: number) => ({ ...noInput(), forward: 1, yaw: Math.sin(k / 40) * 0.02 });
  const run = makeRun(STATION, { seed: 1, opening: true });
  time('upper, the opening', k => stepRun(run, walk(k)), 1200);
  for (const id of ['upper', 'main', 'plant', 'sump', 'cave']) {
    const r = makeRun(STATION, { seed: 1, start: id });
    time(id + ' (' + r.here.cast.length + ' cast)', k => stepRun(r, walk(k)));
  }
  const sim = makeSim(testbed(), { seed: 1 });
  const b = sim.player.body;
  for (const [i, t] of ['husk', 'husk', 'skitter', 'thresher', 'worm', 'husk'].entries()) spawn(sim, t, b.x + 3 + i, b.y, b.z - 3, {});
  time('testbed, 6 awake', k => step(sim, walk(k)));
  /* the page's side of the light each frame: lighting.follow + lights(looseLights) */
  const L = simLighting(run.here);
  time('lighting.follow+lights', () => { L.follow(k => run.here.doors[k].t); L.lights(looseLights(run.here)); });
  begin('step'); say(lines.join('\n'));
  console.log(lines.join('\n'));
});
