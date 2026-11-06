import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { STATION } from '../src/content/station';
import { buildUpper } from '../src/content/levels/upper';
import { makeSim } from '../src/sim/sim';
import { give } from '../src/sim/game';
import { CameraRig } from '../src/present/camera';
import { U } from '../src/present/render/shader';

/* The flashlight in your hand (present/camera.ts, and `held` in render/shader.ts), headless: it shines from your left
   hand, below the eye, and is aimed at what you look at, so its beam crosses your line of sight where that meets the
   first thing along it. */

describe('the flashlight in your hand', () => {
  /* you, at the end of the Security corridor, looking down it and a little to its side, flashlight on */
  const sim = makeSim(buildUpper(STATION.ladders), { seed: 3, station: STATION }), g = sim.game;
  give(g, 'flash', 1); g.light = 'flash'; g.lightOn = true;
  const R = sim.world.rooms.find(r => r.name === 'Security corridor')!, b = sim.player.body, along = R.x1 - R.x0 > R.z1 - R.z0;
  b.x = along ? R.x0 + 1.2 : (R.x0 + R.x1) / 2; b.z = along ? (R.z0 + R.z1) / 2 : R.z0 + 1.2; b.y = R.y0; b.sync();
  sim.player.yaw = (along ? -Math.PI / 2 : Math.PI) + 0.5;
  sim.player.pitch = -0.1;
  const cam = new THREE.PerspectiveCamera(72, 1, 0.06, 140), rig = new CameraRig();
  cam.rotation.order = 'YXZ';
  for (let k = 0; k < 120; k++) rig.update(cam, sim, { x: b.x, y: b.y, z: b.z }, 1, 1 / 60, { yaw: 0, pitch: 0 });
  cam.updateMatrixWorld();
  const eye = cam.position.clone(), view = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
  const H = U.uFlashPos.value.clone(), D = U.uFlashDir.value.clone();

  it('shines from your left hand, a little below the eye', () => {
    expect(U.uFlash.value).toBeGreaterThan(0);
    expect(H.clone().sub(eye).dot(right)).toBeLessThan(-0.15);
    expect(H.y).toBeLessThan(eye.y - 0.2);
  });

  it('crosses your line of sight where it meets the first thing along it', () => {
    /* (sight goes through bodies, your own among them, and glass) */
    const far = 20, t = sim.world.raycast(eye.x, eye.y, eye.z, eye.x + view.x * far, eye.y + view.y * far, eye.z + view.z * far, d => d.kind === 'body' || !!d.glass) * far;
    expect(t).toBeGreaterThan(1);
    expect(t).toBeLessThan(far);
    const hit = eye.clone().addScaledVector(view, t), toHit = hit.clone().sub(H);
    /* how far the beam's line passes from it: near enough, for a hand that sways a little (a beam straight out from the
       hand, as the eye looks, would pass a hand's width off) */
    const miss = toHit.clone().sub(D.clone().multiplyScalar(toHit.dot(D))).length();
    expect(miss).toBeLessThan(0.1);
    expect(H.distanceTo(eye)).toBeGreaterThan(0.3);
  });
});
