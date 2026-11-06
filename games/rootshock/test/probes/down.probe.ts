import { it } from 'vitest';
import { RAG, REFLEX, STAGGER, bones } from '../../src/sim/ragdoll';
import { SHOVE } from '../../src/sim/moves';
import { begin, say, set } from './out';
import { facing, swingAt } from './swing';

/* How a knockdown goes: the axe's chop on a husk, as hard as one run into (SHOVE.you 90 for 70), stood at a few
   distances, a little to either side, struck low to high. How far its shoulders turn on the plan while it is down
   (counted while they lie flat enough to say), and how far its hips go out to the side. Turning on its feet like a
   top is the fault this was written for. TRACE=1 prints one fall step by step; SET=... to try constants. */
it('down', () => {
  set({ RAG, REFLEX, STAGGER });
  SHOVE.you = 90;
  begin('down', process.env.SET ? ` (${process.env.SET})` : '');
  let sum = 0, worst = 0, n = 0;
  for (const kind of (process.env.KINDS ?? 'husk').split(',')) for (const d of [1.3, 1.7]) for (const lat of [0, 0.25, -0.25]) for (const aim of [0.3, 0.6, 0.9]) {
    const { s, m } = facing(kind, d, lat);
    m.poise = 1;
    const B = bones(kind), at = (n: string) => { const i = B.at[n] * 3; return { x: m.rag!.p[i], y: m.rag!.p[i + 1], z: m.rag!.p[i + 2] }; };
    let turned = 0, last = NaN, side = 0, was = false;
    const trace = process.env.TRACE && d === 1.7 && lat === 0 && aim === 0.6;
    swingAt(s, m, 'axe', aim, 2.5, t => {
      if (!(m.down > 0 && m.rag)) return;
      was = true;
      const L = at('shL'), R = at('shR'), a = Math.atan2(R.z - L.z, R.x - L.x), flat = Math.hypot(R.z - L.z, R.x - L.x) / Math.hypot(R.x - L.x, R.y - L.y, R.z - L.z);
      if (flat > 0.7) {
        if (!Number.isNaN(last)) { let da = a - last; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; turned += Math.abs(da); }
        last = a;
      } else last = NaN;
      side = Math.max(side, Math.abs(at('hipL').x - m.x));
      if (trace && Math.round(t * 60) % 3 === 0) { const H = at('head'); say(`  t ${t.toFixed(2)} shoulders at ${((a * 180) / Math.PI).toFixed(0)}°, head ${H.x.toFixed(2)} ${H.y.toFixed(2)} ${H.z.toFixed(2)}${m.rag.stride ? ', stepping' : ''}`); }
    });
    if (!was) { say(`${kind} ${d} m, ${lat} right, aimed at ${aim}: not down`); continue; }
    sum += turned; n++; worst = Math.max(worst, turned);
    say(`${kind} ${d} m, ${lat} right, aimed at ${aim}: shoulders turned ${((turned * 180) / Math.PI).toFixed(0)}° in all, hips out ${side.toFixed(2)} m`);
  }
  say(`mean ${((sum / n) * 180 / Math.PI).toFixed(0)}°, worst ${((worst * 180) / Math.PI).toFixed(0)}°, ${n} down`);
});
