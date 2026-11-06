/* How much of the screen's resolution is drawn. The light is worked out pixel by pixel, so a card that cannot keep up
   at full size (a phone's, a laptop's own) is given fewer pixels: a step down while frames come late (GOVERN) and
   the page's own work is not what holds them up; a step back up after a while of frames on time, but not soon to one
   found too slow (longer each time it is). Frames come on the screen's ticks, so a frame made quicker but still late
   looks no quicker: a step down that does not help is followed by another, up to `depth` of them, and if none has
   helped (the browser holding frames to 30 a second, say) they are all taken back, and none is tried for a while,
   longer each time. Looks only; nothing in the sim knows. */

/** the steps: what share of the screen's resolution each draws (across, and so up) */
export const SCALES = [1, 0.85, 0.72, 0.6, 0.5, 0.42];

export const GOVERN = {
  /** frames are measured over this long (s), the slowest `trim` of them left out (a level made, a tab come back to: a
   *  hitch now and then is not the card) */
  window: 1, trim: 0.1,
  /** a frame on time is this long (ms, a 60 Hz screen's); slower than `slow` of it on average is too slow, quicker than
   *  `quick` of it is on time */
  frame: 1000 / 60, slow: 1.2, quick: 1.06,
  /** the page's own work is what holds frames up when it is this much of them: then fewer pixels would not help */
  page: 0.75,
  /** a step down must make frames this much quicker to be kept; how many steps down are tried before giving up */
  gain: 0.9, depth: 3,
  /** windows in a row on time before a step up; how long a step found too slow is not gone back up to (s), doubling
   *  each time it is found too slow again */
  calm: 3, ceiling: 30,
  /** after a step down that did nothing, how long before another is tried (s), doubling each time */
  rest: 60,
};

export class Governor {
  /** which of SCALES is drawn */
  step: number;
  private t = 0;
  /** this window's frames (ms), and the page's own work in them (ms, summed) */
  private times: number[] = [];
  private work = 0;
  private now = 0;
  private calm = 0;
  /** until when each step is known too slow (s), and for how long it will be the next time */
  private slowUntil = SCALES.map(() => 0);
  private slowFor = SCALES.map(() => GOVERN.ceiling);
  /** steps down being tried: from which, how long frames were before them, and how many have been taken */
  private trial: { from: number; was: number; depth: number } | null = null;
  private restUntil = 0;
  private rest = GOVERN.rest;

  constructor(start = 0) {
    this.step = Math.max(0, Math.min(SCALES.length - 1, Math.round(start)));
  }

  get scale(): number {
    return SCALES[this.step];
  }

  /** a frame `dt` seconds after the last, `ms` of it the page's own work; says whether the step has changed */
  frame(dt: number, ms: number): boolean {
    this.now += dt;
    if (dt <= 0) return false;
    this.t += dt; this.times.push(dt * 1000); this.work += ms;
    if (this.t < GOVERN.window) return false;
    const T0 = this.times.sort((a, b) => a - b), kept = T0.slice(0, T0.length - Math.floor(T0.length * GOVERN.trim));
    const mean = kept.reduce((a, b) => a + b, 0) / kept.length, work = this.work / T0.length, was = this.step;
    this.t = this.work = 0; this.times = [];
    const G = GOVERN, slow = mean > G.frame * G.slow;
    const T = this.trial;
    if (T) {
      /* the steps down being tried: kept once one helps, another if not, all taken back if none has */
      if (mean <= T.was * G.gain) this.trial = null;
      else if (T.depth < G.depth && this.step < SCALES.length - 1) { this.step++; T.depth++; }
      else {
        this.step = T.from;
        this.slowUntil[T.from] = 0;
        this.restUntil = this.now + this.rest;
        this.rest *= 2;
        this.trial = null;
      }
    } else if (slow && work < G.page * mean && this.step < SCALES.length - 1 && this.now >= this.restUntil) {
      this.slowUntil[this.step] = this.now + this.slowFor[this.step];
      this.slowFor[this.step] *= 2;
      this.trial = { from: this.step, was: mean, depth: 1 };
      this.step++;
    }
    this.calm = mean < G.frame * G.quick ? this.calm + 1 : 0;
    if (this.calm >= G.calm && this.step > 0 && this.now >= this.slowUntil[this.step - 1] && !this.trial) {
      this.step--;
      this.calm = 0;
    }
    return this.step !== was;
  }
}
