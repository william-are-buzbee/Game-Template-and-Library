import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { STATION } from '../src/content/station';
import { makeSim } from '../src/sim/sim';
import { Lighting, fullPower } from '../src/world/light';
import { U } from '../src/present/render/shader';
import { ANKLE, SHIN, THIGH, SelfView, ankle, fittingsOver, leg, pose, strideOf } from '../src/present/render/selfView';
import { upper } from './kit';

/* Your body (present/render/selfView.ts), headless: legs that put each foot where it is meant to be, standing nearly
   straight and folded right down crouched; feet that keep to the floor through a stride and the right one coming
   down on the footstep; and its shadow handed to the level's shader, from the fittings over you when they are lit. */

const level = upper();
const room = (n: string) => level.rooms.find(R => R.name === n)!;
const LEG = THIGH + SHIN;

describe('a leg', () => {
  it('puts the ankle where it was asked to, anywhere it can reach', () => {
    for (const [f, d] of [[0, 0.8], [0.3, 0.75], [-0.25, 0.7], [0.4, 0.3], [0, 0.2]]) {
      const { thigh, knee } = leg(f, d), [af, ad] = ankle(thigh, knee);
      expect(af).toBeCloseTo(f, 5);
      expect(ad).toBeCloseTo(d, 5);
      expect(knee).toBeGreaterThanOrEqual(0); // knees bend one way
    }
  });
});

describe('a pose', () => {
  it('stands nearly straight, and crouched sits right down with the knees folded', () => {
    const up = pose(0, 0, 0, 1.7, 0), down = pose(1, 0, 0, 1.7, 0);
    expect(leg(0, up.hip - ANKLE).knee).toBeLessThan(0.25);
    expect(down.hip).toBeLessThan(0.4);
    expect(leg(0, down.hip - ANKLE).knee).toBeGreaterThan(2);
    expect(down.lean).toBeGreaterThan(up.lean);
  });

  it('keeps a planted foot on the floor through a walking stride', () => {
    const stride = strideOf(false, false);
    for (let ph = 0; ph < 2 * Math.PI; ph += 0.05) {
      const P = pose(0, 1, ph, stride, 0);
      for (const [f, u] of P.feet) if (u === 0) expect(Math.hypot(f, P.hip - ANKLE)).toBeLessThanOrEqual(LEG);
    }
  });

  it('brings the right foot down, out in front, on the footstep (phase 0)', () => {
    const [[f, u], [lf, lu]] = pose(0, 1, 0, strideOf(false, false), 0).feet;
    expect(u).toBe(0);
    expect(f).toBeGreaterThan(0.2);
    expect(lf).toBeLessThan(0); // the left behind, about to lift
    expect(lu).toBe(0);
  });
});

describe('its shadow', () => {
  it('is thrown by the fittings of the room you stand in when they are lit, and by none in the dark', () => {
    const sim = makeSim(level, { seed: 1, station: STATION }), R = room('Briefing room'); // no emergency cells of its own
    const x = (R.x0 + R.x1) / 2, z = (R.z0 + R.z1) / 2;
    const lit = fittingsOver(sim, new Lighting(sim.world, fullPower), x, R.y0, z);
    expect(lit.room?.id).toBe(R.id);
    expect(lit.near.length).toBeGreaterThan(0);
    expect(fittingsOver(sim, new Lighting(sim.world, () => 0), x, R.y0, z).near).toEqual([]);
  });

  it('hands the shader capsules standing where you do, and the fittings over you', () => {
    const sim = makeSim(level, { seed: 1, station: STATION }), R = room('Isolation room 1');
    const x = (R.x0 + R.x1) / 2, z = (R.z0 + R.z1) / 2, b = sim.player.body;
    b.x = x; b.z = z; b.y = R.y0;
    const v = new SelfView(new THREE.Object3D(), sim, new Lighting(sim.world, fullPower));
    v.update({ x, y: R.y0, z, yaw: 0, pitch: 0 }, 1.62, 1 / 60);
    const [torso, right, left] = U.uSelfA.value, ends = U.uSelfB.value;
    /* the torso from the hips to the crown, a little behind the eye; the legs down to the floor either side */
    expect(torso.y - R.y0).toBeGreaterThan(0.8);
    expect(ends[0].y - R.y0).toBeGreaterThan(1.6);
    expect(Math.hypot(torso.x - x, torso.z - z)).toBeLessThan(0.3);
    for (const k of [1, 2]) expect(ends[k].y - R.y0).toBeLessThan(0.1);
    expect(right.x).toBeGreaterThan(left.x); // facing -z, the right is +x
    expect(U.uFix.value[0].w).toBe(1);
    expect(U.uSelfLo.value.x).toBeLessThan(x);
    expect(U.uSelfHi.value.x).toBeGreaterThan(x);
  });
});
