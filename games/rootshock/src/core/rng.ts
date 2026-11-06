/** A seeded random generator (mulberry32). Content, world and sim draw from these, never from Math.random,
 *  so a level is dressed the same on every load and a run can be replayed. */
export class Rng {
  private s: number;
  constructor(seed: number | string) {
    this.s = typeof seed === 'number' ? seed >>> 0 : hashString(seed);
  }
  /** 0 <= x < 1 */
  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** range(b): 0..b; range(a, b): a..b */
  range(a: number, b?: number): number {
    return b === undefined ? this.next() * a : a + this.next() * (b - a);
  }
  int(n: number): number {
    return Math.floor(this.next() * n);
  }
  pick<T>(a: readonly T[]): T {
    return a[this.int(a.length)];
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  state(): number {
    return this.s;
  }
  /** go back to a state (a save's) */
  restore(s: number): void {
    this.s = s >>> 0;
  }
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
