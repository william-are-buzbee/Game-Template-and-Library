import * as THREE from 'three';
import { it, vi } from 'vitest';
import { testbed } from '../../src/content/levels/testbed';
import { blowAt, hitMutant, spawn } from '../../src/sim/cast';
import { noInput } from '../../src/sim/input';
import { makeSim, simLighting, step } from '../../src/sim/sim';
import { CastView } from '../../src/present/render/castView';
import { begin, say } from './out';

/* How far a living one's pose jumps in a frame: each kind put down in the arena after you, you stepping from one end
   to the other every two seconds (so it walks, stops, swings), and struck every second and a half (so it flinches,
   reels, has its swing cut short); drawn a frame a step, halfway through it. Measured in the model's own frame, so
   walking across the floor is not counted; its rock back on its heels apart. None of the living's twitches (each
   kind's random jerks, castView.ts twitch): they come at random, and test/fade.test.ts holds each to going out and
   back. KINDS=husk,worm for fewer. */
it('snap', () => {
  begin('snap');
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  let now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  for (const kind of (process.env.KINDS ?? 'husk,thresher,skitter,worm').split(',')) {
    const s = makeSim(testbed(), { seed: 3 }), b = s.player.body;
    s.game.god = true;
    const at = (z: number) => { b.x = 8; b.z = z; b.y = 0; b.sync(); s.player.yaw = 0; };
    at(-3);
    const m = spawn(s, kind, 8, 0, -9)!, cv = new CastView(new THREE.Group(), s, simLighting(s));
    const S = (cv as unknown as { shown: { m: typeof m; M: { g: THREE.Group } }[] }).shown.find(x => x.m === m)!, g = S.M.g;
    const eye = new THREE.PerspectiveCamera(72, 16 / 9, 0.06, 140), v = new THREE.Vector3();
    const pose = () => { const out: THREE.Vector3[] = []; g.traverse(o => { if ((o as THREE.Mesh).isMesh) out.push(g.worldToLocal(o.getWorldPosition(v.set(0, 0, 0))).clone()); }); return out; };
    let was = pose(), tilt = g.rotation.x;
    const jumps: number[] = [], tilts: number[] = [], doing: string[] = [];
    let then = '';
    for (let k = 0; k < 60 * 12; k++) {
      if (k % 120 === 0) at(k % 240 ? -3 : -15);
      if (k % 90 === 45 && !m.dead && m.down === 0) hitMutant(s, m, { dmg: 1, poise: 8 + (k % 4) * 4, shove: 60, dir: { x: 0, z: -1 }, at: { x: m.x, y: m.y + 1, z: m.z + 0.3 } }, 1);
      step(s, noInput());
      now += 1000 / 60;
      eye.position.set(b.x, b.y + 1.6, b.z); eye.lookAt(m.x, m.y + 0.5, m.z);
      cv.update(0.5, eye);
      const p = pose(), limp = !!m.rag;
      const B = blowAt(m), now_ = `${m.state}${m.mv > 0 ? ' walking' : ''}${B ? ` ${B.ph} ${B.q.toFixed(2)}` : ''}${m.reel > 0 ? ' reeling' : ''}`;
      if (!limp) { jumps.push(Math.max(...p.map((q, i) => q.distanceTo(was[i])))); tilts.push(Math.abs(g.rotation.x - tilt)); doing.push(`${then} → ${now_}`); }
      then = now_;
      was = p; tilt = g.rotation.x;
    }
    const J = jumps.slice(1).sort((a, c) => a - c), T = tilts.slice(1).sort((a, c) => a - c), q = (A: number[], f: number) => A[Math.floor((A.length - 1) * f)];
    const worst = jumps.map((j, i) => [j, i]).slice(1).sort((a, c) => c[0] - a[0]).slice(0, 4).map(([j, i]) => `${j.toFixed(2)} m (${doing[i]})`);
    say(`${kind}: part moved in a frame: median ${q(J, 0.5).toFixed(3)} m, 99th ${q(J, 0.99).toFixed(3)}, worst ${q(J, 1).toFixed(3)}; frames over 0.15 m ${J.filter(j => j > 0.15).length} of ${J.length}; rock back in a frame, worst ${q(T, 1).toFixed(3)} rad\n  worst frames: ${worst.join('; ')}`);
  }
  vi.restoreAllMocks();
});
