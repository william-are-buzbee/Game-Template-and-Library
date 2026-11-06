import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { testbed } from '../src/content/levels/testbed';
import { STEP } from '../src/core/loop';
import { give } from '../src/sim/game';
import { noInput, type Input } from '../src/sim/input';
import { makeSim, simLighting, step } from '../src/sim/sim';
import { HandsView } from '../src/present/render/handsView';
import type { Shape } from '../src/content/items';

/* Your hands, drawn (render/handsView.ts), whichever way a swing is sent (sim/combat.ts, wayOf): from how a thing is held
   at rest, loaded to where its way starts, swung along it, and brought back, with no jump between. */

/** a click with `keys` held as it is pressed, drawn a frame a step from a second before it to two after, standing in
 *  the open: the most the hand turned (rad) and moved (m) from one frame to the next, and when */
function click(id: string | null, keys: Partial<Input>) {
  const s = makeSim(testbed(), { seed: 3 }), b = s.player.body;
  b.x = 8; b.z = -3; b.y = 0; b.sync(); s.player.yaw = 0; s.player.pitch = 0; s.game.god = true;
  if (id) give(s.game, id);
  s.game.weapon = id;
  const hv = new HandsView(new THREE.PerspectiveCamera(), s, simLighting(s)), vm = (hv as unknown as { vm: THREE.Group }).vm;
  const look = { yaw: 0, pitch: 0 }, q = new THREE.Quaternion(), p = new THREE.Vector3();
  let turned = 0, moved = 0, when = '', k = 0, first = true;
  const frame = (inp: Partial<Input>) => {
    step(s, { ...noInput(), ...inp });
    hv.update(0, k * STEP, look);
    const h = s.hands, at = h.swing ? `swing ${(h.swing.t / h.swing.dur).toFixed(2)}` : h.chg >= 0 ? `load ${h.chg.toFixed(2)}` : 'rest';
    if (!first) {
      const a = 2 * Math.acos(Math.min(1, Math.abs(q.dot(vm.quaternion)))), d = p.distanceTo(vm.position);
      if (a > turned) { turned = a; when = at; }
      if (d > moved) moved = d;
    }
    first = false; k++;
    q.copy(vm.quaternion); p.copy(vm.position);
  };
  for (let t = 0; t < 1; t += STEP) frame({});
  frame({ ...keys, attack: true });
  for (let t = 0; t < 2; t += STEP) frame({});
  return { turned, moved, when };
}

describe('your hands, drawn', () => {
  it('load, swing and come back without a jump, every weapon, every way', () => {
    /* the most a frame may turn the hand is what the swing itself does in one: the baton brought down over your head
       turns 0.41 rad a frame coming in to where it can land, the knife's slash 0.28 across it; and move it, a thrust
       driven out, 0.17 m. A load begun from the wrong place, or a swing started from somewhere other than where the
       load left it, is a radian or more in a frame */
    const jumps: string[] = [];
    for (const id of ['pipe', 'baton', 'wrench', 'axe', 'knife', null]) for (const [name, keys] of [['own', {}], ['A', { strafe: -1 }], ['D', { strafe: 1 }], ['W', { forward: 1 }]] as const) {
      const r = click(id, keys);
      if (r.turned > 0.45 || r.moved > 0.2) jumps.push(`${id ?? 'fists'} ${name}: turned ${r.turned.toFixed(3)} rad (${r.when}), moved ${r.moved.toFixed(3)} m`);
    }
    expect(jumps).toEqual([]);
  });

  it('an edged thing swung across leads with its edge: to the left from the right, to the right on a backhand; brought down, to the floor', () => {
    /* where the edge faces (the axe's head, and the knife's blade, are to -z of the handle), in the view, as it crosses
       the middle of the swing */
    const facing = (id: string, way: Shape, q: number) => {
      const s = makeSim(testbed(), { seed: 3 });
      give(s.game, id);
      s.game.weapon = id;
      const hv = new HandsView(new THREE.PerspectiveCamera(), s, simLighting(s)), h = s.hands;
      h.way = way; h.swing = { t: q * 0.3, dur: 0.3, a: 0, done: false }; h.line = { yaw: 0, pitch: 0 };
      hv.update(0, 0, { yaw: 0, pitch: 0 });
      const mesh = (hv as unknown as { mesh: THREE.Mesh }).mesh;
      mesh.updateWorldMatrix(true, false);
      return new THREE.Vector3(0, 0, -1).applyQuaternion(mesh.getWorldQuaternion(new THREE.Quaternion()));
    };
    for (const id of ['axe', 'knife']) {
      expect(facing(id, 'side', 0.4).x, `${id} across from the right`).toBeLessThan(-0.6);
      expect(facing(id, 'back', 0.4).x, `${id} backhand`).toBeGreaterThan(0.6);
    }
    expect(facing('axe', 'chop', 0.45).y).toBeLessThan(-0.6);
  });
});
