import { testbed } from '../../src/content/levels/testbed';
import { STEP } from '../../src/core/loop';
import { spawn, type Mutant } from '../../src/sim/cast';
import { give } from '../../src/sim/game';
import { noInput } from '../../src/sim/input';
import { makeSim, step, type Sim } from '../../src/sim/sim';

/** you in the test bed's arena at (8, -3), facing north, and one of the cast stood `d` metres in front of you (`lat`
 *  to your right), facing you, held still */
export function facing(kind: string, d: number, lat = 0, hp = 1e5): { s: Sim; m: Mutant } {
  const s = makeSim(testbed(), { seed: 3 }), b = s.player.body;
  b.x = 8; b.z = -3; b.y = 0; b.sync(); s.game.god = true;
  const m = spawn(s, kind, 8 + lat, 0, -3 - d)!;
  m.stun = 1e9; m.hp = m.max = hp; m.yaw = 0;
  for (let i = 0; i < 5; i++) step(s, noInput());
  return { s, m };
}

/** look at `aim` of its height (0 its feet, 1 its top; for one fixed to a wall, of 2.5 m) and click once with `weapon`;
 *  `each` is called every step for `secs` seconds after. Returns where across the swing it was struck (0..1), if it
 *  was */
export function swingAt(s: Sim, m: Mutant, weapon: string, aim: number, secs: number, each: (t: number) => void = () => {}): number | undefined {
  const b = s.player.body, h = m.fixed ? 2.5 : (m.body?.h ?? 1), dx = m.x - b.x, dz = m.z - b.z;
  s.player.yaw = Math.atan2(-dx, -dz);
  s.player.pitch = Math.atan2(m.y + h * aim - (b.y + 1.6), Math.hypot(dx, dz));
  give(s.game, weapon); s.game.weapon = weapon;
  step(s, { ...noInput(), attack: true });
  let struck: number | undefined;
  for (let t = 0; t < secs; t += STEP) {
    step(s, noInput());
    if (s.hands.swing?.struck !== undefined) struck = s.hands.swing.struck;
    each(t);
  }
  return struck;
}
