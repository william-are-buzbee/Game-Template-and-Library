/** What the player asked for during one sim step. The presentation fills it from keys and mouse;
 *  a test or a replay can fill it from anything. */
export interface Input {
  /** -1..1: forward/back, right/left */
  forward: number;
  strafe: number;
  run: boolean;
  /** radians to turn this step */
  yaw: number;
  pitch: number;
  /** presses: true on the one step they happened */
  jump: boolean;
  crouch: boolean;
  light: boolean;
  /** E: use what you are looking at */
  use: boolean;
  /** held: swim up (jump key), swim down (crouch key) */
  rise: boolean;
  sink: boolean;
  /** held: the mouse button. Hold to load a swing, let go to throw it; a gun fires as it goes down */
  attack: boolean;
  /** the sides a swing is sent from swapped: stepping left sends it from your right (a setting, Swap swing sides;
   *  sim/combat.ts, wayOf) */
  swap: boolean;
}

export const noInput = (): Input => ({ forward: 0, strafe: 0, run: false, yaw: 0, pitch: 0, jump: false, crouch: false, light: false, use: false, rise: false, sink: false, attack: false, swap: false });
