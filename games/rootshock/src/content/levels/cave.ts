import { clamp } from '../../core/math';
import { ICO, type LadderDef, type LevelDef } from '../types';
import { beginLevel, chamber, dive, fieldAt, finishLevel, ladder, floor, mut, owns, P, pick, pool, rnd, roughen, tunnel, use, vault, bx, type LevelInfo, type RoomOpts } from '../build/plan';
import { caveDress, tree } from '../build/furnish';

/* The cave. A stream cave in limestone, known to the builders, walled off and used as the water intake. Its floor heights
   are metres from the main level's floor. From the breach behind the arboretum: the entry passage falls to the upper chamber (the spring branch climbs away east toward
   the surface); the descent, through breakdown, into the great chamber, where the green has made its real arboretum; the
   lower passage narrows to the lower chamber, half flooded, and its pool is the flooded link to the sump.
   Ported from the first engine (archive/first-engine.html, buildCave): its tunnels and chambers are caves of any
   outline (engine.md §14). */

export const CAVE: LevelInfo = { id: 'cave', name: 'The cave', c: 'CAVE' };

export function buildCave(ladders: Record<string, LadderDef>): LevelDef {
  beginLevel(CAVE, ladders);
  const D = floor(CAVE, { terrain: [-10, -140, 310, 0] }), wet: RoomOpts = { lit: 'none', fl: 0x3a3832, wl: 0x4a453c, st: 0x4a453c, motes: 'spores' };
  const gf = (x: number) => -40 + clamp((x - 100) / 100, 0, 1) * 14;
  const entry = tunnel(D, 'Entry passage', [[241, -18, 0], [234, -34, -3], [226, -46, -6], [219, -54, -8]], 3.2, { ...wet, ht: 4 });
  const upper = chamber(D, 'Upper chamber', 215, -60, 15, 10, () => -8, { ...wet, ht: 6 }); vault(D, 215, -60, 14, 6, upper);
  const spring = tunnel(D, 'Spring branch', [[226, -66, -8], [242, -80, -2], [258, -92, 6], [274, -108, 14], [290, -120, 22]], 1.8, { ...wet, ht: 2.6 });
  const desc = tunnel(D, 'Descent', [[206, -66, -8], [194, -78, -14], [182, -88, -21], [174, -96, -29.6]], 4, { ...wet, ht: 5 });
  const great = chamber(D, 'Great chamber', 150, -110, 50, 18, gf, { ...wet, ht: 18, lit: 'always', lc: [0.05, 0.12, 0.07] }); vault(D, 150, -110, 40, 8, great);
  const lower = tunnel(D, 'Lower passage', [[110, -104, -38.6], [94, -92, -46], [82, -83, -58]], 2.4, { ...wet, ht: 2.8 });
  const lc = chamber(D, 'Lower chamber', 80, -75, 17.5, 12, () => -58, { ...wet, ht: 6 }); vault(D, 80, -75, 12, 3, lc);
  /* rough floors and roofs; the tight passages less in the roof, so you can still stand */
  for (const [R, f, c] of [[entry, 0.25, 0.8], [upper, 0.3, 1.5], [spring, 0.2, 0.35], [desc, 0.3, 1], [great, 0.4, 2], [lower, 0.2, 0.35], [lc, 0.25, 1]] as const) roughen(D, R, f, c);
  pool(D, lc, 82, -67, 5.2, 2.4);
  /* the ways out: back through the breach; the flooded link; the crack at the top of the spring branch */
  ladder(D, 'CV', 241, -18.8, 241, -21.2, 0, true, { bare: true, label: 'Breach' });
  dive(D, 82, -71.4, 1, 'sumpdeep', 'Dive', true); D.marks['dive:sumpdeep'] = [80, -72.4, 0];
  use(D, 'look', 290, -119.6, 1.2, { label: 'Crack', text: 'The passage pinches to a crack you could put an arm through. Cold air comes down it, and the smell of grass. Not today.' });
  /* breakdown along both sides of the descent, a clear way down its middle */
  for (let k = 0; k < 14; k++) {
    const t = rnd(0.15, 0.9), side = k % 2 ? 1 : -1, off = side * rnd(1.1, 1.8), x = 206 + (174 - 206) * t + off * 1.38, z = -66 + (-96 + 66) * t - off * 1.44, s = rnd(0.8, 1.8);
    P(D, 'ico', x, z, s * 1.3, s, s * 1.2, pick([0x5a5248, 0x4a443c, 0x6b6a64]), { c: 1, y: -0.3 });
  }
  /* the stream across the great chamber; the green's real arboretum */
  for (let x = 182, k = 0; x > 106; x -= 1.2, k++) { const z = -110 + Math.sin(0.105 * x + 1.05) * 5.2 + Math.sin(0.035 * x + 0.35) * 3.2; bx(D, x, z, 1.4, 0.03, 1.3, 0x16343c, { y: 0.004 + (k % 3) * 0.003, c: 0, lie: true }); }
  for (let k = 0; k < 9; k++) { const x = rnd(114, 186), z = rnd(-122, -98), t = !owns(D, great, x, z); if (t) continue; P(D, 'cyl', x, z, rnd(0.6, 1.2), rnd(14, 20), rnd(0.6, 1.2), 0x3a4a2c, { c: 1 }); }
  /* the canopy: masses of it hanging from the roof, grown into it (its height drawn as it was, so the rest of the cave is
     dressed as before, and set from the roof over it) */
  for (let k = 0; k < 12; k++) {
    const x = rnd(114, 186), z = rnd(-122, -98), sx = rnd(2, 4), sy = rnd(1.4, 3), sz = rnd(2, 4), c = pick([0x2f4a2a, 0x3a5230, 0x4f7a40, 0x6e2b28]);
    rnd(14, 19);
    P(D, 'ico', x, z, sx, sy, sz, c, { y: great.ht + fieldAt(D, D.cf, x, z) - ICO * sy + 0.4, c: 0 });
  }
  for (let k = 0; k < 6; k++) tree(D, rnd(118, 182), rnd(-120, -100), rnd(6, 10), 0, true);
  caveDress(D, great, 140, true); caveDress(D, upper, 24, true); caveDress(D, lc, 20, true); caveDress(D, entry, 16, false); caveDress(D, desc, 14, false); caveDress(D, lower, 10, true); caveDress(D, spring, 12, false);
  for (const [x, z] of [[130, -112], [146, -104], [162, -116], [174, -106], [122, -102], [138, -120]]) mut(D, 'rootworm', x, z); mut(D, 'rootworm', 214, -58); mut(D, 'rootworm', 82, -78);
  mut(D, 'skitter', 158, -108); mut(D, 'skitter', 210, -64); mut(D, 'skitter', 84, -80);
  return finishLevel([241, -21.2, 0]); // inside the breach, for ?level=cave
}
