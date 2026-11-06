import * as THREE from 'three';
import type { Sim } from '../../sim/sim';
import { EYE, EYE_CROUCH } from '../../sim/player';
import type { Lighting } from '../../world/light';
import { dynamicMaterial, lightMaterial, SELF, U } from './shader';
import { parts } from './things';

/* You, drawn: a body under the eye, in the coverall your sleeve already shows (handsView.ts), so you see your legs and
   chest when you look down and a light lying about throws your shadow. Rough blocks, as the cast are.
   What the eye would only see the inside of, it is not shown: the head, and the arms (the hand in front of the camera is
   handsView's). Those are on SHADOW_ONLY, which the shadow cameras of the beams lying about see and the eye does not, so
   your shadow has a head and arms all the same. (Your own beam's leaves them out: its lens is in your hand.)
   The fittings over you throw it too, though the level's light is worked out once and nothing that moves stands in it:
   the body is handed to the level's shader as capsules (SELF in shader.ts), with the nearest lit fittings of the room
   you are in, and each takes back its share of the light where it falls.
   Feet keep to the floor by working each leg back from where its foot is (two bones, thigh and shin), and land in
   step with the footsteps you hear: a whole stride (both feet) is the distance between two of them (sim.ts), and the
   right foot comes down on the sound. Looks only. */

/** the layer that only shadow maps see (beams.ts) */
export const SHADOW_ONLY = 1;

const COVERALL = 0xb5541c, SEAM = 0x8a3e14, SKIN = 0xb08572, BOOT = 0x1c1a1a, HAIR = 0x2a211c;
/** thigh, shin; how high the ankle is over the sole. Standing, the leg is a hair short of straight */
export const THIGH = 0.44, SHIN = 0.43, ANKLE = 0.08;
/** hip to the base of the neck; the base of the neck to the eye */
const TORSO = 0.5, NECK = 0.175;
/** the spine is this far behind the eye: you see past your chest, not out of it */
const BEHIND = 0.16;
/** how far a stride's two steps take you (sim.ts: a step heard every 1.7 m walking, 2.3 running, 1.3 in water) */
export const strideOf = (running: boolean, wet: boolean): number => (wet ? 1.3 : running ? 2.3 : 1.7);

/** a pose: how high the hip is over the floor, how far the torso leans forward (radians), and each foot's place
 *  relative to its hip (forward, and lifted), right foot first */
export interface Pose { hip: number; lean: number; feet: [number, number][] }

/** the pose at a crouch (0 standing, 1 down), walking (0 still, 1 striding) at phase `ph` of a stride `stride` long */
export function pose(crouch: number, walking: number, ph: number, stride: number, air: number): Pose {
  /* crouched: the eye at EYE_CROUCH, sat back on the heels, the torso tipped forward a little */
  const lean = 0.08 * walking + 0.22 * crouch;
  const eye = EYE + (EYE_CROUCH - EYE) * crouch;
  /* striding, the hips sink a little, so a foot out in front still reaches the floor */
  const hip = eye - NECK - TORSO * Math.cos(lean) - 0.08 * walking * (1 - crouch);
  const reach = (stride / 4) * 0.8 * walking, lift = 0.12 * walking * (1 - 0.5 * crouch);
  const feet: [number, number][] = [0, 1].map(k => {
    const s = (((ph / (2 * Math.PI) + k / 2) % 1) + 1) % 1;
    /* planted for the first half, sliding back under you; then lifted and swung forward */
    let f: number, u: number;
    if (s < 0.5) { f = reach * (1 - 4 * s); u = 0; }
    else { const q = (s - 0.5) * 2, e = q * q * (3 - 2 * q); f = -reach + 2 * reach * e; u = lift * Math.sin(Math.PI * q); }
    /* off the ground the legs draw up a little, one more than the other */
    return [f + air * (k ? 0.05 : 0.18), u + air * (k ? 0.1 : 0.22)];
  }) as [number, number][];
  return { hip, lean, feet };
}

/** the thigh's swing forward and the knee's bend (radians) that put the ankle `f` forward of the hip and `d` below it */
export function leg(f: number, d: number): { thigh: number; knee: number } {
  const D = Math.min(Math.hypot(f, d), THIGH + SHIN - 1e-4), c = (a: number) => Math.min(1, Math.max(-1, a));
  const knee = Math.PI - Math.acos(c((THIGH ** 2 + SHIN ** 2 - D * D) / (2 * THIGH * SHIN)));
  const thigh = Math.atan2(f, d) + Math.acos(c((THIGH ** 2 + D * D - SHIN ** 2) / (2 * THIGH * D)));
  return { thigh, knee };
}

/** where the ankle ends up for a thigh swing and a knee bend: forward of the hip, and below it */
export function ankle(thigh: number, knee: number): [number, number] {
  return [THIGH * Math.sin(thigh) + SHIN * Math.sin(thigh - knee), THIGH * Math.cos(thigh) + SHIN * Math.cos(thigh - knee)];
}

/** the nearest `n` fittings to (x, y, z) of the room it is in, if that room is lit; none in rock, a doorway or the dark */
export function fittingsOver(sim: Sim, L: Lighting, x: number, y: number, z: number, n = SELF.fix) {
  const R = sim.world.roomAt(x, y + 0.5, z), fx = R && L.fixtures.get(R.id);
  if (!R || !fx || Math.max(...L.room(R.id)) < 0.02) return { room: R, near: [] };
  const near = [...fx].sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z)).slice(0, n);
  return { room: R, near };
}

type O3 = THREE.Object3D;
function grp(parent: O3, x: number, y: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

export class SelfView {
  /** not a Group: View.show hides every Group under the scene but the level's */
  readonly root = new THREE.Object3D();
  private mat = dynamicMaterial();
  private hips: THREE.Group;
  private torso: THREE.Group;
  private head: THREE.Group;
  private legs: { thigh: THREE.Group; shin: THREE.Group; foot: THREE.Group }[] = [];
  private arms: { up: THREE.Group; fore: THREE.Group }[] = [];
  /** where the capsules' ends are, in the parts that carry them */
  private ends: { a: [O3, THREE.Vector3]; b: [O3, THREE.Vector3]; r: number }[] = [];
  private walking = 0;
  private ph = 0;
  private air = 0;
  private v = new THREE.Vector3();

  constructor(scene: O3, public sim: Sim, private L: Lighting) {
    const m = this.mat, add = (parent: O3, list: Parameters<typeof parts>[0], shadowOnly = false) => {
      const mesh = new THREE.Mesh(parts(list), m);
      mesh.frustumCulled = false;
      if (shadowOnly) mesh.layers.set(SHADOW_ONLY);
      parent.add(mesh);
      return mesh;
    };
    /* facing -z, as the eye does at yaw 0; the root at the floor under the hips */
    this.hips = grp(this.root, 0, 1, 0);
    add(this.hips, [['box', COVERALL, 0.36, 0.16, 0.22, 0, -0.02, 0]]);
    for (const s of [1, -1]) {
      const thigh = grp(this.hips, s * 0.1, 0, 0), shin = grp(thigh, 0, -THIGH, 0), foot = grp(shin, 0, -SHIN, 0);
      add(thigh, [['box', COVERALL, 0.15, THIGH + 0.04, 0.16, 0, -THIGH / 2, 0]]);
      add(shin, [['box', COVERALL, 0.13, SHIN, 0.14, 0, -SHIN / 2, 0], ['box', SEAM, 0.135, 0.03, 0.145, 0, -SHIN + 0.07, 0]]);
      add(foot, [['box', BOOT, 0.12, ANKLE + 0.02, 0.27, 0, -ANKLE / 2, -0.06]]);
      this.legs.push({ thigh, shin, foot });
    }
    this.torso = grp(this.hips, 0, 0, 0);
    add(this.torso, [['box', COVERALL, 0.4, TORSO - 0.04, 0.23, 0, TORSO / 2, 0], ['box', SEAM, 0.025, TORSO - 0.1, 0.235, 0, TORSO / 2, 0], ['box', SEAM, 0.41, 0.05, 0.24, 0, 0.1, 0]]);
    this.head = grp(this.torso, 0, TORSO, 0.01);
    add(this.head, [['box', SKIN, 0.09, 0.1, 0.09, 0, 0.04, 0], ['ico', SKIN, 0.21, 0.25, 0.23, 0, 0.19, 0], ['ico', HAIR, 0.22, 0.13, 0.23, 0, 0.27, 0.02]], true);
    for (const s of [1, -1]) {
      const up = grp(this.torso, s * 0.25, TORSO - 0.06, 0), fore = grp(up, 0, -0.3, 0);
      add(up, [['box', COVERALL, 0.11, 0.32, 0.12, 0, -0.15, 0]], true);
      add(fore, [['box', COVERALL, 0.1, 0.24, 0.1, 0, -0.12, 0], ['box', SKIN, 0.08, 0.11, 0.1, 0, -0.29, 0]], true);
      this.arms.push({ up, fore });
    }
    const at = (o: O3, x: number, y: number, z: number): [O3, THREE.Vector3] => [o, new THREE.Vector3(x, y, z)];
    this.ends = [
      { a: at(this.hips, 0, 0.08, 0), b: at(this.head, 0, 0.16, 0), r: 0.17 },
      ...this.legs.map(l => ({ a: at(l.thigh, 0, -0.04, 0), b: at(l.foot, 0, -0.02, -0.06), r: 0.075 })),
      ...this.arms.map(a => ({ a: at(a.up, 0, -0.02, 0), b: at(a.fore, 0, -0.3, 0), r: 0.055 })),
    ];
    scene.add(this.root);
  }

  setLighting(L: Lighting): void { this.L = L; }

  /** stand the body under the eye (`at`: camera.ts), `eye` over its feet, and hand its shadow to the shader */
  update(at: { x: number; y: number; z: number; yaw: number; pitch: number }, eye: number, dt: number): void {
    const sim = this.sim, p = sim.player, b = p.body;
    const crouch = Math.min(1, Math.max(0, (EYE - eye) / (EYE - EYE_CROUCH)));
    const wet = p.water !== 'dry', swim = p.water === 'swimming';
    /* the stride's phase, from how far you have come since the last footstep heard: one stride between two of them */
    const stride = strideOf(p.running, wet);
    const want = 2 * Math.PI * (p.stepD / stride);
    /* ease toward it, the short way round, so a change of gait does not jump */
    let dp = want - this.ph;
    dp -= 2 * Math.PI * Math.round(dp / (2 * Math.PI));
    this.ph += dp * Math.min(1, dt * 20);
    const moving = p.moved > 1e-4 && !p.fly ? 1 : 0;
    this.walking += (moving - this.walking) * Math.min(1, dt * (moving ? 8 : 5));
    this.air += ((b.ground || wet || p.fly ? 0 : 1) - this.air) * Math.min(1, dt * 8);
    const P = pose(crouch, this.walking, swim ? sim.tick * 0.05 : this.ph, stride, this.air);

    /* the spine BEHIND the eye, and the hips under it however far the torso leans; looking down, a little further
       back, as a head bowed over its feet is, so you see your legs and feet and not the top of your chest */
    const bow = Math.min(1, Math.max(0, (-at.pitch - 0.4) / 1)), neckF = TORSO * Math.sin(P.lean), back = BEHIND + neckF + 0.14 * bow;
    const fx = -Math.sin(at.yaw), fz = -Math.cos(at.yaw);
    this.root.position.set(at.x - fx * back, at.y, at.z - fz * back);
    this.root.rotation.set(0, at.yaw, 0);
    /* lowest as a foot comes down, highest passing over the other */
    const bobY = this.walking * (1 - crouch) * 0.025 * Math.abs(Math.cos(this.ph));
    this.hips.position.y = P.hip - bobY;
    this.torso.rotation.x = -P.lean;
    this.head.rotation.x = at.pitch * 0.8 + P.lean;
    P.feet.forEach(([f, u], k) => {
      const L = this.legs[k], { thigh, knee } = leg(f, P.hip - bobY - ANKLE - u);
      L.thigh.rotation.x = thigh;
      L.shin.rotation.x = -knee;
      L.foot.rotation.x = knee - thigh;
    });
    /* the right hand out in front, where the light and what you hold are (handsView.ts); the left swings with the
       right foot, or reaches too when you crouch */
    const [right, left] = this.arms;
    right.up.rotation.set(1.05 + at.pitch * 0.6 + P.lean, 0, 0.12);
    right.fore.rotation.x = 0.45;
    const swing = Math.sin(this.ph) * 0.35 * this.walking;
    left.up.rotation.set(swing + crouch * 0.5 + P.lean * 0.5, 0, -0.08);
    left.fore.rotation.x = 0.25 + crouch * 0.3;

    lightMaterial(this.mat, this.L.atPoint(b.x, b.y + 1, b.z), this.L.flickAt(b.x, b.y + 1, b.z), this.L.towards(b.x, b.y + 1, b.z));
    this.shadow(at);
  }

  /** the capsules, and the fittings that throw them, for the level's shader */
  private shadow(at: { x: number; y: number; z: number }): void {
    this.root.updateMatrixWorld(true);
    const A = U.uSelfA.value, B = U.uSelfB.value, v = this.v;
    this.ends.forEach((e, k) => {
      v.copy(e.a[1]); e.a[0].localToWorld(v); A[k].set(v.x, v.y, v.z, e.r);
      v.copy(e.b[1]); e.b[0].localToWorld(v); B[k].set(v.x, v.y, v.z, 0);
    });
    const { room, near } = fittingsOver(this.sim, this.L, at.x, at.y, at.z);
    U.uFix.value.forEach((F, k) => {
      const f = near[k];
      if (f) F.set(f.x, f.y - 0.1, f.z, 1); else F.set(0, 0, 0, 0);
    });
    if (room) {
      U.uSelfLo.value.set(room.x0 - 0.05, room.y0 - 0.05, room.z0 - 0.05);
      U.uSelfHi.value.set(room.x1 + 0.05, room.y0 + room.ht + 0.05, room.z1 + 0.05);
    }
  }
}
