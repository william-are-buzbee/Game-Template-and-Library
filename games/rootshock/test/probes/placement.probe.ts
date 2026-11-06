import { it } from 'vitest';
import { STATION } from '../../src/content/station';
import { testbed } from '../../src/content/levels/testbed';
import { levelDef } from '../../src/sim/run';
import { placement } from '../placement';
import { begin, say } from './out';

/* Where things are, every level: everything test/placement.ts finds, in the room it is in, the growth and stains that
   test/placement.test.ts lets meet rock among them. KIND=floats for one kind. */
it('placement', () => {
  begin('placement');
  const only = process.env.KIND;
  for (const def of [...STATION.levels.map(l => levelDef(STATION, l.id)), testbed()]) {
    const F = placement(def).filter(f => !only || f.kind === only);
    const room = (x: number, y: number, z: number) => def.rooms.find(R => !R.doorway && x >= R.x0 && x < R.x1 && z >= R.z0 && z < R.z1 && y >= R.y0 - 0.5 && y < R.y0 + R.ht)?.name ?? '?';
    say(`\n== ${def.id}: ${F.length}`);
    const kinds = new Map<string, number>();
    for (const f of F) kinds.set(f.kind, (kinds.get(f.kind) ?? 0) + 1);
    say([...kinds].map(([k, n]) => `${k} ${n}`).join(', '));
    for (const f of F) say(`${f.kind.padEnd(22)} ${room(...f.at).padEnd(26)} ${f.at.join(', ').padEnd(22)} ${f.what}`);
  }
});
