import { clamp } from '../core/math';
import type { ClimbDef } from '../content/types';
import type { Hit, World } from '../world/world';
import { fall, fits, footprint, makeBody, settle, slide, steer, STEP_UP, type Body } from './body';
import type { Input } from './input';

export const STAND = 1.8;
export const CROUCH = 1.0;
export const EYE = 1.62;
export const EYE_CROUCH = 0.95;
const RADIUS = 0.32;
const JUMP = 6.3;
/** water deeper than this at your feet and you are wading; deeper than SWIM and you are swimming */
const WADE = 0.3;
const SWIM = 1.3;
/** how high you can haul yourself out of water onto a ledge */
const CLIMB_OUT = 1.7;
/** on a fixed ladder: how fast you climb (m/s); looking further down than this (rad), walking forward takes you down it;
 *  and how far your feet come up over its head before you step off */
export const LADDER = { speed: 2.4, down: 0.5, over: 0.35 };
export const AIR = 35;
/** what you weigh, before what you hold */
export const MASS = 75;
/** how fast you change your pace on firm ground (m/s²), and how much less a kilogram of weapon in hand makes it */
const ACCEL = 30;
const LOAD = 0.05;
/** thrown faster than you could go yourself, you slow by this (m/s²) whatever you do */
const FRICTION = 24;
/** and in the air, by this: thrown is thrown */
const AIR_DRAG = 2;
/** the air you can hold, as you are dressed: four times as much with a rebreather on */
export const airFor = (worn: readonly string[]): number => (worn.includes('rebreather') ? 150 : AIR);

export interface Player {
  body: Body;
  yaw: number;
  pitch: number;
  crouch: boolean;
  /** crouch was released under something low; stand when there is room */
  wantStand: boolean;
  /** how far you moved this step, for footsteps and head bob */
  moved: number;
  /** speed at the last landing */
  impact: number;
  water: 'dry' | 'wading' | 'swimming';
  /** seconds of breath left, and how much you can hold (four times as much with a rebreather) */
  air: number;
  airMax: number;
  /** your eye is under the surface */
  under: boolean;
  /** seconds left of being held (you move at a third of your speed) */
  slow: number;
  /** the mass of the weapon in your hand (kg), which the sim keeps up to date: it slows how you change your pace */
  load: number;
  /** this step: how fast you were going into what stopped you (m/s), and whether you were thrown (going faster than
   *  you could go yourself): only then does a slam hurt */
  slam: number;
  thrown: boolean;
  /** what is left of your pace while you reel (sim/combat.ts, pace); the sim sets it */
  pace: number;
  /** your say over your going while a blow of yours has your feet (sim/combat.ts, feet), and whether it is done and has
   *  planted you (planted); the sim sets both */
  feet: number;
  planted: boolean;
  /** knocked down, or getting up (sim/combat.ts, floored): you lie low and cannot jump; the sim sets it */
  down: boolean;
  /** this step: running, for the noise it makes */
  running: boolean;
  /** this step: jumped */
  jumped: boolean;
  /** distance walked since the last footstep */
  stepD: number;
  /** dev: fly through everything */
  fly: boolean;
  /** this step: on a fixed ladder */
  climbing: boolean;
}

export function makePlayer(w: World, x: number, y: number, z: number, yaw: number): Player {
  const body = makeBody(w, x, y, z, RADIUS, STAND, MASS), own = body.dyn;
  /* every body stops you, the cast's too (engine.md §6, F1b) */
  body.skip = own;
  return {
    body, yaw, pitch: 0, crouch: false, wantStand: false, moved: 0, impact: 0,
    water: 'dry', air: AIR, airMax: AIR, under: false, slow: 0, load: 0, slam: 0, thrown: false, pace: 1, feet: 1, planted: false, down: false, running: false, jumped: false, stepD: 0, fly: false, climbing: false,
  };
}

export const eyeHeight = (p: Player): number => (p.crouch ? EYE_CROUCH : EYE);

/** the fixed ladder you are on, if any (LevelDef.climbs): standing in its box, from its foot to just over its head */
export function ladderAt(w: World, b: Body): ClimbDef | null {
  for (const L of w.def.climbs ?? []) if (b.x > L.x0 && b.x < L.x1 && b.z > L.z0 && b.z < L.z1 && b.y > L.y0 - 0.1 && b.y < L.y1 + LADDER.over + 0.05) return L;
  return null;
}

/** a step's walking intent: where it wants to go, so the sim can tell what it ran into */
export interface Stride {
  /** where your velocity was taking you this step, and how fast */
  dx: number; dz: number; speed: number;
  /** the pace you meant to go at (m/s) */
  wx: number; wz: number;
}

/** how fast you can change your pace where you are: your footing, and what you hold */
function accel(p: Player): number {
  const footing = p.water === 'swimming' ? 0.25 : p.water === 'wading' ? 0.5 : p.body.ground ? 1 : 0.33;
  return ACCEL * footing * Math.max(0.5, 1 - LOAD * p.load);
}

export function updatePlayer(w: World, p: Player, inp: Input, dt: number): { stride: Stride; hit: Hit } {
  const b = p.body;
  p.yaw += inp.yaw;
  p.pitch = clamp(p.pitch + inp.pitch, -1.45, 1.45);
  if (p.fly) return flyAbout(p, inp, dt);
  settle(w, b);

  const level = w.waterAt(b.x, b.z), depth = level - b.y;
  p.water = depth > SWIM ? 'swimming' : depth > WADE ? 'wading' : 'dry';
  const swim = p.water === 'swimming';
  /* on a fixed ladder the jump and crouch keys are up and down it, and nothing else */
  const ladder = !swim && !p.down ? ladderAt(w, b) : null;
  p.climbing = !!ladder;

  /* crouch is a toggle; standing up needs headroom. In deep water there is no crouching, only swimming down. */
  if (swim) { p.crouch = false; p.wantStand = false; }
  else if (inp.crouch && !ladder) {
    if (p.crouch) p.wantStand = true;
    else { p.crouch = true; p.wantStand = false; }
  }
  /* on the floor you are as low as crouching, and stand when you are up, if there is room */
  if (p.down && !swim) { p.crouch = true; p.wantStand = true; }
  if (p.crouch && p.wantStand && !p.down && fits(w, b, b.x, b.z, b.y, STAND)) { p.crouch = false; p.wantStand = false; }
  p.jumped = false;
  if (!swim && !ladder && !p.down && inp.jump && b.ground && (!p.crouch || fits(w, b, b.x, b.z, b.y, STAND))) {
    p.jumped = true;
    b.vy = JUMP; b.ground = false; p.crouch = false; p.wantStand = false;
  }
  b.h = p.crouch ? CROUCH : STAND;

  /* walking, wading, swimming */
  const f = clamp(inp.forward, -1, 1), s = clamp(inp.strafe, -1, 1), l = Math.hypot(f, s);
  /* a blow of yours has your feet (sim/combat.ts, feet): no running while it does */
  const run = inp.run && !p.crouch && f > 0 && p.water === 'dry' && p.feet === 1;
  let speed = swim ? 2.4 : p.water === 'wading' ? 2.2 : p.crouch ? 1.6 : run ? 5.6 : 3.2;
  p.running = run && l > 0;
  if (p.slow > 0) { p.slow -= dt; speed *= 0.35; }
  speed *= p.pace;
  const ox = b.x, oz = b.z;
  b.carried = false; // only the cast's friction asks it
  /* the pace you want, and how you get to it: as fast as your footing allows, or, thrown faster than you could go
     yourself, only as fast as friction slows you. A blow of yours has your feet from letting it go: until it is done,
     what you had goes on, up to a run, whatever your keys say (a blow run in lands harder); once done you are planted,
     wanting a share of your pace and getting to it that share as fast, and faster than that is thrown */
  const striking = p.feet < 1 && !p.planted, own = speed * p.feet, could = striking ? Math.max(own, 5.6 * p.pace) : own;
  let tx = 0, tz = 0;
  if (l > 0) {
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw), k = own / Math.max(1, l);
    tx = (fx * f + rx * s) * k; tz = (fz * f + rz * s) * k;
  }
  const thrown = Math.hypot(b.vx, b.vz) > could + 0.5;
  p.thrown = thrown;
  steer(b, tx, tz, !thrown ? (striking ? 0 : accel(p) * p.feet) : b.ground || p.water !== 'dry' ? FRICTION : AIR_DRAG, dt);
  const stride: Stride = { dx: b.vx * dt, dz: b.vz * dt, speed: Math.hypot(b.vx, b.vz), wx: tx, wz: tz };
  const { hit, slam } = slide(w, b, dt, swim ? CLIMB_OUT : STEP_UP);
  p.slam = slam;
  p.moved = Math.hypot(b.x - ox, b.z - oz);

  /* weight; in deep water you float at the surface, and swim up or down. Under a roof the water fills (the drowned
     sump), there is no surface to float to: you hang where you are. */
  if (swim) {
    const flooded = w.ceilingAbove(footprint(b), b.y + b.h, b.skip, level) <= level;
    const target = inp.rise ? 2 : inp.sink ? -2 : flooded ? 0 : clamp((depth - SWIM - 0.05) * 3, -1, 1);
    b.vy += (target - b.vy) * Math.min(1, dt * 6);
    p.impact = fall(w, b, dt, 0).impact;
  } else if (ladder) {
    /* on a ladder: up it walking forward (down it, looking down), or holding jump; down holding crouch, or walking back;
       still when you let go. At its head no further: step off onto the floor beside its hatch */
    const way = p.pitch < -LADDER.down ? -1 : 1, want = clamp(f * way + (inp.rise ? 1 : 0) - (inp.sink ? 1 : 0), -1, 1);
    b.vy = want * LADDER.speed;
    if (b.vy > 0 && b.y >= ladder.y1 + LADDER.over) b.vy = 0;
    p.impact = fall(w, b, dt, 0).impact;
  } else p.impact = fall(w, b, dt).impact;

  /* breath */
  p.under = b.y + eyeHeight(p) < w.waterAt(b.x, b.z);
  p.air = p.under ? Math.max(0, p.air - dt) : Math.min(p.airMax, p.air + dt * 40);
  return { stride, hit };
}

/** dev: through walls and floors, 7 m/s (18 with Shift), Space and C for up and down */
function flyAbout(p: Player, inp: Input, dt: number): { stride: Stride; hit: null } {
  const b = p.body, spd = inp.run ? 18 : 7, f = clamp(inp.forward, -1, 1), s = clamp(inp.strafe, -1, 1);
  b.x += (-Math.sin(p.yaw) * f + Math.cos(p.yaw) * s) * spd * dt;
  b.z += (-Math.cos(p.yaw) * f - Math.sin(p.yaw) * s) * spd * dt;
  b.y += ((inp.rise ? 1 : 0) - (inp.sink ? 1 : 0)) * spd * dt;
  b.vx = b.vz = b.vy = 0; b.ground = false; b.on = null;
  b.sync();
  p.moved = 0; p.impact = 0; p.jumped = false; p.running = false; p.water = 'dry'; p.under = false; p.air = p.airMax;
  p.crouch = false;
  return { stride: { dx: 0, dz: 0, speed: 0, wx: 0, wz: 0 }, hit: null };
}
