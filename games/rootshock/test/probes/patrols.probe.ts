import { it } from 'vitest';
import { STATION } from '../../src/content/station';
import { levelDef } from '../../src/sim/run';
import { makeSim, step } from '../../src/sim/sim';
import { noInput } from '../../src/sim/input';
import { STEP } from '../../src/core/loop';
import { begin, say } from './out';

/* Where the changed keep their rounds: each level left to itself for some minutes, you out of it (flying, far over
   the level's roof, so nothing sees or hears you), and where they are looked at every two seconds. Rounds that bunch
   show as a few rooms holding most of them, and as many of them near each other.

   Out, by level: the rooms they were in, by share of the looks (and where they began); how many others each had within
   6 m, on average, and how often two or more (a knot of them); the most in one room at once; and the rooms their rounds
   made for. MINUTES=8 for how long, LEVEL=main for one, SEED=3 for another draw, POWER=full with everything on (Gen-1
   running, the wing mended). */
it('patrols', () => {
  begin('patrols');
  const only = process.env.LEVEL, mins = +(process.env.MINUTES ?? 8), seed = +(process.env.SEED ?? 7);
  for (const id of ['upper', 'main'].filter(l => !only || l === only)) {
    const sim = makeSim(levelDef(STATION, id), { seed, station: STATION }), p = sim.player, rooms = sim.world.rooms, st = sim.game.station!;
    if (process.env.POWER === 'full') { st.main = true; for (const c of Object.values(st.circuits)) { c.on = true; c.broken = false; } sim.lighting = null; }
    p.fly = true; p.body.y += 200;
    const staff = sim.cast.filter(m => m.ai === 'husk' && !m.round);
    const name = (r: number) => (r >= 0 ? rooms[r].name : '(none)');
    const roomOf = (x: number, y: number, z: number) => sim.world.roomAt(x, y + 0.5, z)?.id ?? -1;
    const was = new Map<string, number>(), at = new Map<string, number>(), dests = new Map<string, number>(), last = new Map<number, number>();
    for (const m of staff) was.set(name(m.room), (was.get(name(m.room)) ?? 0) + 1);
    let looks = 0, near = 0, knots = 0, most = 0, mostAt = '';
    const every = Math.round(2 / STEP), steps = Math.round((mins * 60) / STEP);
    for (let t = 0; t < steps; t++) {
      step(sim, noInput());
      for (const m of staff) {
        if (m.dest >= 0 && m.dest !== last.get(m.id) && sim.fields) { const r = sim.fields.nav.room[m.dest]; dests.set(name(r), (dests.get(name(r)) ?? 0) + 1); }
        last.set(m.id, m.dest);
      }
      if (t % every) continue;
      const alive = staff.filter(m => !m.dead), by = new Map<string, number>();
      for (const m of alive) {
        const n = name(roomOf(m.x, m.y, m.z));
        at.set(n, (at.get(n) ?? 0) + 1); by.set(n, (by.get(n) ?? 0) + 1);
        const n6 = alive.filter(o => o !== m && Math.abs(o.y - m.y) < 2 && Math.hypot(o.x - m.x, o.z - m.z) < 6).length;
        near += n6; if (n6 >= 2) knots++;
        looks++;
      }
      for (const [n, k] of by) if (k > most) { most = k; mostAt = `${n} at ${((t * STEP) / 60).toFixed(1)} min`; }
    }
    const share = (M: Map<string, number>, of: number) => [...M].sort((a, b) => b[1] - a[1]).map(([n, k]) => `    ${((100 * k) / of).toFixed(0).padStart(3)}%  ${n}`);
    say(`\n${id}: ${staff.length} of the changed on rounds, ${mins} min, seed ${seed}${process.env.POWER === 'full' ? ', everything on' : ''}`);
    say(`  began in:`); say(share(was, staff.length).join('\n'));
    say(`  were in (by share of looks):`); say(share(at, looks).slice(0, 12).join('\n'));
    say(`  others within 6 m, on average: ${(near / looks).toFixed(2)}; in a knot (two or more): ${((100 * knots) / looks).toFixed(0)}% of looks; most in one room at once: ${most} (${mostAt})`);
    const nd = [...dests.values()].reduce((a, b) => a + b, 0);
    say(`  rounds made for (${nd}):`); say(share(dests, nd || 1).slice(0, 12).join('\n'));
  }
});
