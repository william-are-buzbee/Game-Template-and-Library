// sim/step.ts — advances the game by one fixed step. Everything that happens in the game happens here, so a test
// can play it with no browser (test/sim.test.ts) and two runs with the same inputs end in the same state.
import { STEP, angDiff, clamp } from '@wb/core';
import type { Input } from './input';
import type { State } from './state';

/** top speed, m/s */
export const SPEED = 5;
/** how quickly velocity reaches what the input asks for, 1/s */
const RESPONSE = 10;
/** how quickly the body turns to face where it is going, 1/s */
const TURN = 12;
/** the floor is a square this many metres from the middle to an edge */
export const HALF = 20;

export function step(s: State, inp: Input): void {
  const p = s.player;
  let wx = inp.strafe;
  let wz = -inp.forward;
  const len = Math.hypot(wx, wz);
  if (len > 1) {
    wx /= len;
    wz /= len;
  }
  const k = 1 - Math.exp(-RESPONSE * STEP);
  p.vx += (wx * SPEED - p.vx) * k;
  p.vz += (wz * SPEED - p.vz) * k;
  p.x = clamp(p.x + p.vx * STEP, -HALF, HALF);
  p.z = clamp(p.z + p.vz * STEP, -HALF, HALF);
  if (Math.abs(p.x) === HALF) p.vx = 0;
  if (Math.abs(p.z) === HALF) p.vz = 0;
  if (Math.hypot(p.vx, p.vz) > 0.2) {
    const want = Math.atan2(-p.vx, -p.vz);
    p.yaw += angDiff(p.yaw, want) * (1 - Math.exp(-TURN * STEP));
  }
  s.t += STEP;
}
