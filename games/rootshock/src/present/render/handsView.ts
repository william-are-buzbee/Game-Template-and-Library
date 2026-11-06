import * as THREE from 'three';
import { clamp } from '../../core/math';
import { STEP } from '../../core/loop';
import { loadTime, wayNow, wstats, type Hands } from '../../sim/combat';
import { ACTIVE, PATHS } from '../../sim/sweep';
import type { Shape } from '../../content/items';
import type { Sim } from '../../sim/sim';
import type { Lighting } from '../../world/light';
import { dynamicMaterial, lightMaterial } from './shader';
import { parts, type Part } from './things';

/* What is in your hand, in front of the camera: the first engine's weaponModel, and how it loads, swings and kicks.
   A swung thing is drawn as the sim swings it (sim/sweep.ts), whichever way you sent it (sim/combat.ts, wayOf): a side
   swing drawn back to the right and brought across right to left, a backhand the other way; brought down over your
   head (the axe's own way), lifted straight up and brought straight down; fists and the knife driven straight out, or
   swung across (a hook, a slash). Loading, it goes from how it is held at rest to where its way starts. It crosses the
   middle of the view in the part of the swing that can land. It stops in what it hits, rocking back a little off it;
   one that glances off a wall jumps back further and shakes.

   Thrown, a blow goes along the line it was let go on, wherever you look (sim/combat.ts), and it is drawn on that line:
   look away and it goes on without you. Over, it is brought back to your hand, not put there: after one that met
   nothing, over the time the sim keeps your arm coming back, carried on past the end of its swing first. */

const HALF = Math.PI / 2;
/** how far past the start of its path a loaded swing is drawn back (radians): a side swing far enough to read as drawn,
 *  not so far it leaves the view; the axe up over your head */
const DRAWN: Record<Shape, number> = { side: 0.3, back: 0.3, chop: 0.87, thrust: 0 };
/** where the axe is held at rest, pointing up and a little forward (its angle up from straight ahead) */
const AXE_REST = HALF - 0.5;
/** how far past the end of the part that can land a swing follows through (radians) */
const FOLLOW = 0.6;
/** how long a swing that met something takes to come back to where the hand is wanted now (s) */
const BACK = 0.16;
/** a blow that met nothing carries on past its follow-through, its weight taking the arm with it (radians a kilogram:
 *  the axe 0.38), before it comes back; fists and the knife, driven straight out, sag instead (m) */
const CARRY = { per: 0.12, sag: 0.05 };
const ease = (t: number) => t * t * (3 - 2 * t);
/** which way along its angles a path goes: drawn back, followed through and carried on are past its ends that way */
const dir = (shape: Shape) => Math.sign(PATHS[shape].from - PATHS[shape].to) || 1;
/** an edged thing (the axe, the knife) swung across is turned a quarter about its handle, so its edge leads: to the left
 *  across from the right, to the right on a backhand. Held, loaded for a chop, or brought down, its edge is to the
 *  floor; swung across so, it went flat side first */
const lead = (shape: Shape, edge: boolean): number => (!edge ? 0 : shape === 'side' ? HALF : shape === 'back' ? -HALF : 0);
const UP = new THREE.Vector3(0, 1, 0), QR = new THREE.Quaternion();
const P0 = new THREE.Vector3(), P1 = new THREE.Vector3(), Q0 = new THREE.Quaternion(), Q1 = new THREE.Quaternion();
const LOOK = new THREE.Euler(0, 0, 0, 'YXZ');

/** where a swung thing points across its swing, `q` (0..1) through it: from drawn back, across the part that can land,
 *  and on through. One that met one of the cast at `hq` stops there, rocked back a little off it; one that glanced
 *  off the world at `gq` jumps back further the way it came */
function swept(shape: Shape, q: number, gq?: number, hq?: number): number {
  const P = PATHS[shape], d = dir(shape), back = P.from + DRAWN[shape] * d, on = P.to - FOLLOW * d;
  const at = (k: number) => k < ACTIVE.from ? back + (P.from - back) * ease(k / ACTIVE.from)
    : k < ACTIVE.to ? P.from + ((P.to - P.from) * (k - ACTIVE.from)) / (ACTIVE.to - ACTIVE.from)
      : P.to + (on - P.to) * ease((k - ACTIVE.to) / (1 - ACTIVE.to));
  const stop = gq ?? hq;
  if (stop === undefined || q < stop) return at(q);
  const g = at(stop), k = (q - stop) / Math.max(1e-3, 1 - stop);
  return g + (P.from - g) * (gq !== undefined ? 0.35 : 0.08) * Math.sin(Math.min(1, k * 3) * HALF);
}

function weaponParts(id: string | null): Part[] {
  switch (id) {
    case 'baton': return [['cyl', 0x1c1e20, 0.05, 0.6, 0.05, 0, 0.22, 0]];
    case 'pipe': return [['cyl', 0x7a7e84, 0.055, 0.85, 0.055, 0, 0.3, 0]];
    case 'wrench': return [['box', 0x8a3a2a, 0.05, 0.5, 0.03, 0, 0.2, 0], ['box', 0x9a9ea4, 0.12, 0.1, 0.04, 0, 0.47, 0]];
    case 'knife': return [['box', 0x22262a, 0.03, 0.12, 0.03, 0, 0, 0], ['box', 0xc8ccd0, 0.012, 0.24, 0.045, 0, 0.18, 0]];
    case 'axe': return [['box', 0x7a5a34, 0.04, 0.95, 0.045, 0, 0.3, 0], ['box', 0xa82a20, 0.045, 0.16, 0.24, 0, 0.72, -0.09]];
    case 'adjwrench': return [['box', 0xb8bcc0, 0.04, 0.4, 0.025, 0, 0.16, 0], ['box', 0xb8bcc0, 0.1, 0.08, 0.03, 0, 0.38, 0]];
    case 'pistol': return [['box', 0x1c1e20, 0.04, 0.06, 0.24, 0, 0.12, -0.1], ['box', 0x1c1e20, 0.04, 0.14, 0.05, 0, 0.04, 0]];
    case 'shotgun': return [['box', 0x1c1e20, 0.05, 0.06, 0.7, 0, 0.1, -0.3], ['box', 0x5a4034, 0.05, 0.1, 0.26, 0, 0.06, 0.12], ['box', 0x5a4034, 0.055, 0.05, 0.2, 0, 0.06, -0.3]];
    default: return [['box', 0xb08572, 0.1, 0.11, 0.14, 0, 0.02, -0.02], ['box', 0xb5541c, 0.1, 0.1, 0.34, 0, 0.01, 0.22]];
  }
}

export class HandsView {
  private vm = new THREE.Group();
  private mat = dynamicMaterial();
  private mesh: THREE.Mesh | null = null;
  private id: string | null | undefined = undefined;
  /** what the hand is drawn in: the camera's frame, turned onto the line of a blow under way */
  private pivot = new THREE.Group();
  /** the swing drawn last frame, and the line it was thrown along */
  private was: Hands['swing'] = null;
  private line = { yaw: 0, pitch: 0 };
  /** a swing over, being brought back: from where it was last drawn, over `dur` from the sim's step `t0` (or over the
   *  recovery, if `rec`); one that `missed` carried on along its way's path first, by what was swung */
  private back: { at: THREE.Vector3; q: THREE.Quaternion; shape: Shape; fist: boolean; edge: boolean; mass: number; missed: boolean; dur: number; t0: number; rec: boolean } | null = null;

  constructor(camera: THREE.Camera, public sim: Sim, private L: Lighting) {
    /* turned first to point out from you, then swung about the up of the plane it sweeps in, then that plane tilted */
    this.vm.rotation.order = 'ZYX';
    this.pivot.add(this.vm);
    camera.add(this.pivot);
  }

  setLighting(L: Lighting): void { this.L = L; }

  /** the hands are not drawn while you watch a console's feed */
  set shown(on: boolean) { this.vm.visible = on; }

  /** `look`: the way the view looks, without its jolts (camera.ts, at) */
  update(bob: number, time: number, look: { yaw: number; pitch: number }): void {
    const sim = this.sim, g = sim.game, h = sim.hands, b = sim.player.body, vm = this.vm;
    if (this.id !== g.weapon) {
      this.id = g.weapon;
      if (this.mesh) { this.vm.remove(this.mesh); this.mesh.geometry.dispose(); }
      this.mesh = new THREE.Mesh(parts(weaponParts(g.weapon)), this.mat);
      this.mesh.frustumCulled = false;
      this.vm.add(this.mesh);
    }
    lightMaterial(this.mat, this.L.atPoint(b.x, b.y + 1, b.z), this.L.flickAt(b.x, b.y + 1, b.z), this.L.towards(b.x, b.y + 1, b.z));
    const w = wstats(g.weapon), fist = !g.weapon, edge = w.kind === 'edge', sw = h.swing;
    /* a swing just over is brought back from where it was last drawn */
    if (this.was && !sw) {
      const missed = !!this.was.missed && this.was.glance === undefined;
      this.back = { at: vm.position.clone(), q: vm.quaternion.clone(), shape: wayNow(sim, w), fist, edge, mass: w.mass, missed, dur: h.rec > 0 ? h.rec : BACK, t0: sim.tick, rec: h.rec > 0 };
    }
    if (sw) { this.back = null; if (h.line) { this.line.yaw = h.line.yaw; this.line.pitch = h.line.pitch; } }
    this.was = sw;
    const ld = h.chg >= 0 ? clamp(h.chg / loadTime(sim, w), 0, 1) : 0;
    /* how it is held at rest (its own way), and the way the load or the blow under way goes */
    const own = w.shape, way = wayNow(sim, w), thrust = way === 'thrust';
    vm.rotation.set(0, fist ? 0.12 : 0, -0.15);
    /* how shaken you are: reeling, on the floor, getting up. Reeling, a load in hand or a blow thrown goes on (sim/combat.ts,
       struck), and is drawn going on, shaken; otherwise the arm is flung down and out until you have your feet again */
    const reel = h.down > 0 ? 1 : h.rise > 0 ? Math.min(1, h.rise / 0.3) : Math.min(1, h.stag / 0.25);
    const flung = h.down > 0 || h.rise > 0 || (h.stag > 0 && !sw && h.chg < 0);
    if (flung) {
      const sh = Math.sin(time * 31) * 0.02 * reel;
      vm.rotation.x = 0.7 * reel + sh;
      vm.position.set(0.34 + 0.06 * reel, -0.36 - 0.18 * reel + sh, -0.42 + 0.06 * reel);
    } else if (w.gun) {
      vm.rotation.x = h.kick * 0.5;
      vm.position.set(0.22, -0.3 + h.kick * 0.04 + Math.sin(bob) * 0.01, -0.42 + h.kick * 0.12);
    } else if (sw && thrust) {
      /* driven straight out and back: fists, or the knife's point first; stopped short where it met something */
      const stop = sw.struck ?? sw.glance, q = Math.min(1, sw.t / sw.dur, stop !== undefined ? Math.max(stop, 0.4) : 1);
      const out = fist ? 0.6 : 0.45, sh = sw.glance !== undefined && sw.t / sw.dur > sw.glance ? Math.sin(time * 60) * 0.015 : 0;
      vm.rotation.x = fist ? 0.05 : -HALF + 0.1;
      if (q < 0.4) { const t = q / 0.4; vm.position.set(0.26 - t * 0.16, -0.3 + t * 0.1, -0.42 + 0.2 * (1 - t) - t * out); }
      else { const t = (q - 0.4) / 0.6; vm.position.set(0.1 + t * 0.16 + sh, -0.2 - t * 0.1, -0.42 - out * (1 - t)); }
    } else if (sw) {
      const q = Math.min(1, sw.t / sw.dur), th = swept(way, q, sw.glance, sw.struck);
      const sh = sw.glance !== undefined && q > sw.glance ? Math.sin(time * 55) * 0.04 * (1 - q) : 0;
      this.swung(way, q, th, sh, fist, lead(way, edge));
    } else {
      /* at rest, held as it is held; loading, taken from there to where its way starts (drawn back to the right for a
         side swing, to the left for a backhand, up over your head to come down, back for a thrust), and trembling once
         it is all the way, if it is to be swung */
      const e = ease(ld), tr = ld >= 1 && !thrust ? Math.sin(time * 38) * 0.012 : 0;
      this.rest(own, fist, bob);
      const rx = vm.rotation.x, ry = vm.rotation.y, rz = vm.rotation.z;
      P0.copy(vm.position);
      if (thrust) { vm.rotation.set(fist ? 0.05 : -HALF + 0.1, fist ? 0.12 : 0, -0.15); vm.position.set(0.3, -0.33, -0.22); }
      else this.swung(way, 0, swept(way, 0), 0, fist);
      vm.rotation.set(rx + (vm.rotation.x + tr - rx) * e, ry + (vm.rotation.y - ry) * e, rz + (vm.rotation.z - rz) * e);
      vm.position.lerpVectors(P0, vm.position, e);
      /* the edge turned to lead as it is drawn back */
      if (lead(way, edge)) vm.quaternion.multiply(QR.setFromAxisAngle(UP, lead(way, edge) * e));
    }
    /* reeling, still holding it up or still swinging it: it sags and shakes */
    if (!flung && h.stag > 0) { const sh = Math.sin(time * 31) * 0.02 * reel; vm.position.x += sh; vm.position.y += sh - 0.06 * reel; }
    /* a swing over, brought back to where the hand is wanted now: from where it was left, or, one that met nothing,
       carried on from there first, the weight of it still going */
    let held = sw ? 1 : 0;
    const B = this.back;
    if (B) {
      const k = clamp(B.rec ? 1 - h.rec / B.dur : sim.tick < B.t0 ? 1 : ((sim.tick - B.t0) * STEP) / B.dur, 0, 1), e = ease(B.missed ? clamp((k - 0.3) / 0.7, 0, 1) : k);
      P1.copy(vm.position); Q1.copy(vm.quaternion);
      if (B.missed && B.shape !== 'thrust') this.swung(B.shape, 1, PATHS[B.shape].to - dir(B.shape) * (FOLLOW + CARRY.per * B.mass * Math.sin(Math.min(1, k / 0.4) * HALF)), 0, B.fist, lead(B.shape, B.edge));
      else { vm.position.copy(B.at); vm.quaternion.copy(B.q); }
      P0.copy(vm.position); Q0.copy(vm.quaternion);
      vm.position.lerpVectors(P0, P1, e);
      vm.quaternion.slerpQuaternions(Q0, Q1, e);
      if (B.missed && B.shape === 'thrust') vm.position.y -= CARRY.sag * Math.sin(k * Math.PI);
      held = 1 - e;
      if (k >= 1) this.back = null;
    }
    /* a blow under way is drawn on the line it was thrown along, so a look away leaves it behind; it comes back to the
       view as it is brought back */
    if (held > 0) {
      Q0.setFromEuler(LOOK.set(look.pitch, look.yaw, 0)).invert().multiply(Q1.setFromEuler(LOOK.set(this.line.pitch, this.line.yaw, 0)));
      this.pivot.quaternion.identity().slerp(Q0, held);
    } else this.pivot.quaternion.identity();
  }

  /** held at rest, as it is held: fists and the knife out before you, the axe up, anything else across */
  private rest(own: Shape, fist: boolean, bob: number): void {
    const vm = this.vm, b = Math.sin(bob) * 0.012;
    if (own === 'thrust') {
      vm.rotation.set(fist ? 0.05 : -HALF + 0.1, fist ? 0.12 : 0, -0.15);
      vm.position.set(0.26, -0.3 + b, -0.42);
    } else {
      vm.rotation.set((own === 'chop' ? AXE_REST - HALF : -0.5) + Math.sin(bob * 0.5) * 0.02, 0, -0.15);
      vm.position.set(0.3, -0.34 + b, -0.5);
    }
  }

  /** a swung thing `q` through its swing, at `th` along its path, shaking `sh`: brought straight down from over your
   *  head, in the one upright plane it was lifted in; across either way, pointing out from you, turned through the
   *  sweep, in its plane. A fist points out along the forearm, not up a handle. Turned `roll` about its handle (lead) */
  private swung(shape: Shape, q: number, th: number, sh: number, fist: boolean, roll = 0): void {
    const vm = this.vm;
    if (shape === 'chop') {
      vm.rotation.set(th - HALF + sh, 0, -0.15);
      vm.position.set(0.18, -0.32 + 0.16 * Math.sin(th), -0.38);
    } else {
      vm.rotation.set(-HALF + 0.35 - 0.25 * Math.min(1, q / ACTIVE.to) + sh + (fist ? HALF - 0.3 : 0), -th, -0.15);
      vm.position.set(0.16 + 0.14 * Math.sin(th), -0.28, -0.32);
    }
    if (roll) vm.quaternion.multiply(QR.setFromAxisAngle(UP, roll));
  }
}
