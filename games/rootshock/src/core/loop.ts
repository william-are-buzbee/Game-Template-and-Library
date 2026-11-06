/** The fixed step. The sim always advances by STEP seconds; the renderer draws between the last two steps.
 *  Real time is fed in, whole steps come out, and the remainder carries to the next frame. */
export const HZ = 60;
export const STEP = 1 / HZ;
/** never try to catch up more than this many steps in one frame (a stalled tab, a debugger pause) */
const MAX_STEPS = 8;

export class FixedLoop {
  private acc = 0;
  /** how far the renderer is between the previous step and the latest one, 0..1 */
  alpha = 0;

  /** add real elapsed seconds; returns how many sim steps to run now */
  advance(dt: number): number {
    this.acc += Math.max(0, dt);
    let n = Math.floor(this.acc / STEP + 1e-9);
    if (n > MAX_STEPS) {
      n = MAX_STEPS;
      this.acc = 0;
    } else this.acc = Math.max(0, this.acc - n * STEP);
    this.alpha = this.acc / STEP;
    return n;
  }
}
