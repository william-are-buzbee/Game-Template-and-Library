import type * as THREE from 'three';
import { clamp } from '../core/math';
import { STEP } from '../core/loop';
import type { Sim } from '../sim/sim';
import type { Dyn } from '../world/world';
import { U } from './render/shader';
import { BOUNCE } from '../world/light';
import { DOWN } from '../sim/moves';

/** what the beam's bounce passes through: the cast, not the walls */
/** what sight goes through: bodies, and glass */
const seeThrough = (d: Dyn) => d.kind === 'body' || !!d.glass;

/** where the flashlight in your hand is aimed: at what you look at, as far off as the first thing along the view, no
 *  nearer than `near` and no further than `far` (m), and how fast that eases (per second), so the beam does not jump
 *  as the view crosses an edge */
const AIM = { near: 1, far: 20, ease: 6 };

/** where the player's body was at the start of the latest step, so the camera can draw between steps */
export interface Prev { x: number; y: number; z: number }

/** The eye: follows the body between sim steps, eases over steps, bobs as you walk. All of it is looks only. */
export class CameraRig {
  private cy = NaN;
  /** how high the eye is over the feet, easing as you crouch and stand */
  eye = 1.62;
  /** where the eye stands this frame, before any shake (feet height, eased over steps; and across), and which way it
   *  looks: for your body, drawn under it (selfView.ts) */
  at = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
  /** the walk's sway, for the hand as well */
  bob = 0;
  /** how hard the view shakes, dying away */
  shake = 0;
  /** where the beam points: it trails the view a little, as a light held in a hand does, and sways as you walk */
  private beam = { x: 0, y: 0, z: -1 };
  private snap = true;
  private t = 0;
  private bounce = 0;
  /** how far off the beam is aimed (AIM) */
  private aim = AIM.far;
  /** jolts to the view, in radians (yaw, pitch, roll): put on at once, easing off */
  private jolt = { y: 0, p: 0, r: 0 };
  /** how far over you are (0 on your feet, 1 on the floor): quick to go, slower back up */
  private fall = 0;

  /** your blow landed, this hard (0..1): the view dips into it */
  impact(k: number): void {
    this.jolt.p -= 0.022 * k;
    this.jolt.r += 0.012 * k;
  }

  /** you were struck from `bearing` (radians from straight ahead, clockwise): the view is knocked away from it */
  struck(bearing: number): void {
    const side = Math.sin(bearing), ahead = Math.cos(bearing);
    this.jolt.y += 0.07 * side;
    this.jolt.r -= 0.06 * side;
    this.jolt.p += 0.045 * ahead;
  }

  /** a new place (another level): no easing in from where you were */
  reset(): void {
    this.cy = NaN;
    this.snap = true;
  }

  update(cam: THREE.PerspectiveCamera, sim: Sim, prev: Prev, alpha: number, dt: number, look: { yaw: number; pitch: number }): void {
    const p = sim.player, b = p.body;
    const x = prev.x + (b.x - prev.x) * alpha, y = prev.y + (b.y - prev.y) * alpha, z = prev.z + (b.z - prev.z) * alpha;
    if (Number.isNaN(this.cy)) this.cy = y;
    this.cy += (y - this.cy) * Math.min(1, dt * 18);
    /* knocked down: the view goes to the floor quickly, tipped over the way you fell and looking up, and comes back
       up as you get up (sim/combat.ts, struck) */
    const h = sim.hands, over = h.down > 0 ? 1 : h.rise > 0 ? h.rise / DOWN.rise : 0;
    this.fall += (over - this.fall) * Math.min(1, dt * (over > this.fall ? 12 : 5));
    const stand = p.crouch ? 0.95 : 1.62;
    this.eye += (stand + (0.35 - stand) * this.fall - this.eye) * Math.min(1, dt * (this.fall > 0.01 ? 14 : 10));
    this.bob += (p.moved / STEP) * dt * 3.3;
    const yaw = p.yaw + look.yaw, pitch = clamp(p.pitch + look.pitch, -1.45, 1.45);
    this.at.x = x; this.at.y = this.cy; this.at.z = z; this.at.yaw = yaw; this.at.pitch = pitch;
    this.shake = Math.max(0, this.shake - dt * 1.6);
    const k = this.shake * 0.08, j = () => (Math.random() * 2 - 1) * k;
    cam.position.set(x + j(), this.cy + this.eye + Math.sin(this.bob) * 0.035 + j(), z + j());
    const J = this.jolt, ease = Math.exp(-dt * 9);
    J.y *= ease; J.p *= ease; J.r *= ease;
    cam.rotation.set(pitch + J.p + 0.3 * this.fall, yaw + J.y, J.r - 0.45 * h.side * this.fall);
    /* the flashlight is in your left hand (what you swing is in your right): a little below the eye and to the left, so
       its light rakes across what is close and what stands in it throws its shadow off to the right */
    U.uFlashPos.value.set(cam.position.x - Math.cos(yaw) * 0.22, cam.position.y - 0.3, cam.position.z + Math.sin(yaw) * 0.22);
    /* the hand follows the eye a beat late (about 70 ms), wanders with the stride and, standing, with your breath */
    this.t += dt;
    const sway = Math.min(1, p.moved / STEP / 3), by = yaw + Math.sin(this.bob * 0.5) * 0.022 * sway + Math.sin(this.t * 0.7) * 0.004;
    const bp = pitch + (Math.abs(Math.cos(this.bob * 0.5)) - 0.6) * 0.03 * sway + Math.sin(this.t * 1.1) * 0.005;
    const bc = Math.cos(bp), want = { x: -Math.sin(by) * bc, y: Math.sin(bp), z: -Math.cos(by) * bc };
    const B = this.beam, f = this.snap ? 1 : 1 - Math.exp(-dt * 14), snapped = this.snap;
    this.snap = false;
    B.x += (want.x - B.x) * f; B.y += (want.y - B.y) * f; B.z += (want.z - B.z) * f;
    const n = Math.hypot(B.x, B.y, B.z) || 1;
    B.x /= n; B.y /= n; B.z /= n;
    const g = sim.game, low = g.batt < 15 ? 0.6 : 1;
    U.uFlash.value = g.lightOn && g.light === 'flash' ? low : 0;
    /* what the view meets along the beam's way, out to AIM.far */
    const ex = x, ey = this.cy + this.eye, ez = z, F = AIM.far;
    const met = U.uFlash.value > 0 ? sim.world.raycast(ex, ey, ez, ex + B.x * F, ey + B.y * F, ez + B.z * F, seeThrough) * F : F;
    /* the beam, from the hand, at what you look at: it crosses the view where that is */
    const to = Math.max(AIM.near, met), H = U.uFlashPos.value;
    this.aim = snapped ? to : this.aim + (to - this.aim) * Math.min(1, dt * AIM.ease);
    const ax = cam.position.x + B.x * this.aim - H.x, ay = cam.position.y + B.y * this.aim - H.y, az = cam.position.z + B.z * this.aim - H.z;
    const an = Math.hypot(ax, ay, az) || 1;
    U.uFlashDir.value.set(ax / an, ay / an, az / an);
    /* bounce: a wall close in front of the beam lights the space around you a little; far off, it gives nothing back */
    const hit = met / BOUNCE.reach;
    const bounce = hit < 1 ? (U.uFlash.value * BOUNCE.gain) / (1 + BOUNCE.hit * (hit * BOUNCE.reach) ** 2) : 0;
    this.bounce += (bounce - this.bounce) * Math.min(1, dt * 10);
    U.uBounce.value = this.bounce;
    U.uLamp.value = sim.hands.muzzle > 0 ? 2.5 : g.lightOn && g.light === 'lantern' ? low : 0;
  }
}
