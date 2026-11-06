// sim/input.ts — what the player asks for in one step, whatever device it came from. The presentation layer fills
// it in (keys, touch, a pad, a test); the sim only ever reads it.

export interface Input {
  /** −1..1, positive is forward (−z) */
  forward: number;
  /** −1..1, positive is right (+x) */
  strafe: number;
}

export function noInput(): Input {
  return { forward: 0, strafe: 0 };
}
