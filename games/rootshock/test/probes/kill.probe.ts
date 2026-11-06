import { it } from 'vitest';
import { bones, RAG, REFLEX, STAGGER } from '../../src/sim/ragdoll';
import { begin, say, set } from './out';
import { facing, swingAt } from './swing';

/* Where what a real swing kills lies: each kind stood 1.5 m in front of you, struck at the middle of it, and how far its
   middle went along your line and across it, and how high it rose. The axe's chop should drop it about where it stood;
   the pipe's swing carries it off. SET=... to try constants (out.ts). */
it('kill', () => {
  set({ RAG, REFLEX, STAGGER });
  begin('kill', process.env.SET ? ` (${process.env.SET})` : '');
  for (const kind of (process.env.KINDS ?? 'husk,skitter,worm,thresher').split(',')) for (const weapon of ['axe', 'pipe']) {
    const { s, m } = facing(kind, kind === 'thresher' ? 1.8 : 1.5, 0, 1);
    const B = bones(kind), mid = () => {
      let x = 0, y = 0, z = 0;
      if (!m.rag) return { x: m.x, y: m.y + (m.body?.h ?? 1) / 2, z: m.z };
      for (let i = 0; i < B.names.length; i++) { const w = B.kg[i] / B.mass; x += m.rag.p[i * 3] * w; y += m.rag.p[i * 3 + 1] * w; z += m.rag.p[i * 3 + 2] * w; }
      return { x, y, z };
    };
    const c0 = mid();
    let top = c0.y;
    swingAt(s, m, weapon, 0.5, 3, () => { top = Math.max(top, mid().y); });
    const c = mid();
    say(`${kind.padEnd(8)} ${weapon.padEnd(4)}: ${m.dead ? '' : 'NOT DEAD '}middle ${(c0.z - c.z).toFixed(2)} m along, ${(c.x - c0.x).toFixed(2)} m across, rose ${(top - c0.y).toFixed(2)} m`);
  }
});
