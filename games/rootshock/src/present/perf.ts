/* Where a frame goes (?dev): each part timed, and gathered over half a second into its mean and its worst a frame, so
   the numbers hold still long enough to read. Looks only; nothing reads it but the dev readout. */

/** how often the numbers shown change (s) */
const EVERY = 0.5;

export class Meter {
  /** this frame's, and the half second's: summed, and the worst frame */
  private now = new Map<string, number>();
  private sum = new Map<string, number>();
  private most = new Map<string, number>();
  private frames = 0;
  private t = 0;
  /** what was measured over the last half second: each part's mean and worst a frame */
  shown = new Map<string, { mean: number; max: number }>();

  /** `v` more of `part` this frame (ms, or a count) */
  add(part: string, v: number): void {
    this.now.set(part, (this.now.get(part) ?? 0) + v);
  }

  /** the frame is over, `dt` seconds after the last */
  end(dt: number): void {
    for (const [k, v] of this.now) {
      this.sum.set(k, (this.sum.get(k) ?? 0) + v);
      this.most.set(k, Math.max(this.most.get(k) ?? 0, v));
    }
    this.now.clear();
    this.frames++;
    this.t += dt;
    if (this.t < EVERY) return;
    this.shown = new Map([...this.sum].map(([k, v]) => [k, { mean: v / this.frames, max: this.most.get(k)! }]));
    this.sum.clear(); this.most.clear();
    this.frames = 0; this.t = 0;
  }

  /** each part as its mean/worst, `dp` places after the point */
  line(parts: string[], dp = 2): string {
    return parts.map(k => {
      const s = this.shown.get(k);
      return `${k} ${s ? `${s.mean.toFixed(dp)}/${s.max.toFixed(dp)}` : '-'}`;
    }).join('  ');
  }
}
