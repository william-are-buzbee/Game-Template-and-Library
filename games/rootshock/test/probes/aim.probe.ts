import { it } from 'vitest';
import { across, PATHS } from '../../src/sim/sweep';
import { begin, say } from './out';
import { facing, swingAt } from './swing';

/* Where a swing lands against the crosshair: each kind stood in front of you at a few distances, a little to your
   right, looked at low, middle and high, struck once. A chop meets the first thing its arc comes down on: the top of
   anything tall. WEAPON=pipe for the side swing. */
it('aim', () => {
  const weapon = process.env.WEAPON ?? 'axe', P = PATHS.chop, deg = (r: number) => (r * 180) / Math.PI;
  begin('aim', `: ${weapon}`);
  for (const kind of (process.env.KINDS ?? 'husk,skitter,worm,thresher,grabber').split(',')) for (const d of [1, 1.5, 2, 2.5]) for (const lat of [0, 0.3]) for (const aim of [0.25, 0.5, 0.8]) {
    const { s, m } = facing(kind, d, lat), hp = m.hp;
    const q = swingAt(s, m, weapon, aim, 1.5), pitch = deg(s.player.pitch);
    const th = q !== undefined && weapon === 'axe' ? deg(P.from + (P.to - P.from) * across(q)) : NaN;
    say(`${kind.padEnd(8)} ${d} m, ${lat} right, aimed at ${aim} of it (pitch ${pitch.toFixed(0)}°): ${m.hp < hp ? 'hit' : 'MISS'}${Number.isNaN(th) ? '' : `, landed ${th.toFixed(0)}° above the crosshair`}`);
  }
});
