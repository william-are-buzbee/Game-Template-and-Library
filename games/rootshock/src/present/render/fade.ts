import * as THREE from 'three';
import type { Model } from './rig';

/* The living, drawn without a jump (engine.md §6, bodies with physics). Their animations (castView.ts, ANIM: the first
   engine's, ported) go from one pose to another at once wherever what they switch on does: walking or not (each at its
   own pace, so at its own place in the step), hunting or not, a blow begun or cut short, thrown back on its heels. Where
   it does, the jump is taken out and given back over SWITCH: the model goes on as the animation has it, less what it
   jumped by, dying away. What it jumped by is the difference between the animation as it is given things now and as it
   was given them last frame, both run for now: so what was moving anyway (an arm on its way down) is not held back,
   and what is switched where nothing jumps is drawn as it is. Between switches it is drawn as the animation has it, so
   a blow lands when the sim has it land. */

/** seconds a jump takes to die away */
export const SWITCH = 0.2;

/** smoothstep, 0..1 */
const ease = (t: number) => t * t * (3 - 2 * t);
const _q = new THREE.Quaternion();

export class Fade {
  /** what the animation moves: what the model hands it (castView.ts, BUILD), and nothing else it can reach */
  private parts: THREE.Object3D[];
  /** what it jumped by, each part in its parent (where, turned, scaled), and the whole up or down (a husk kneeling) */
  private off: { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3 }[];
  private dy = 0;
  /** each part as the animation last set it: put back before it runs, as it sets only the angles it moves, and the rest
   *  would be what a turn drawn less a jump was taken apart into (or what a body loose was laid in: rig.ts) */
  private set: { p: THREE.Vector3; e: THREE.Euler; s: THREE.Vector3 }[];
  /** seconds since it switched; below 0, not switching */
  private t = -1;
  /** what the animation switched on last frame; null, nothing to switch from (loose until now: rig.ts brings it back) */
  private key: string | null = null;

  constructor(M: Model) {
    const found = new Set<THREE.Object3D>(), walk = (v: unknown): void => {
      if (v instanceof THREE.Object3D) { if (v !== M.g) found.add(v); } else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    Object.values(M).forEach(walk);
    this.parts = [...found];
    this.off = this.parts.map(() => ({ p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3() }));
    this.set = this.parts.map(o => ({ p: o.position.clone(), e: o.rotation.clone(), s: o.scale.clone() }));
  }

  /** each part as the animation last set it */
  private put(): void {
    this.parts.forEach((o, i) => { const S = this.set[i]; o.position.copy(S.p); o.rotation.copy(S.e); o.scale.copy(S.s); });
  }

  /** what is left of a jump, `t` seconds after it */
  private static left(t: number): number {
    return t < 0 ? 0 : 1 - ease(Math.min(1, t / SWITCH));
  }

  /** the animation, run by `anim` (given what it was given last frame, if `then`; else what it is given now), for what
   *  it switches on now (`key`: castView.ts, SWITCHES); drawn less what is left of a jump. `g` is placed where the sim
   *  has it; `dt` seconds since the last frame */
  run(g: THREE.Object3D, dt: number, key: string, anim: (then: boolean) => void): void {
    const { parts, off } = this, y0 = g.position.y;
    this.put();
    if (this.key !== null && key !== this.key) {
      /* as it would be drawn now had nothing switched: the animation as it was, less what is left of a jump before */
      anim(true);
      const k = Fade.left(this.t);
      parts.forEach((o, i) => {
        const J = off[i];
        J.p.multiplyScalar(k).add(o.position);
        J.q.copy(_q.identity().slerp(J.q, k).multiply(o.quaternion));
        J.s.multiplyScalar(k).add(o.scale);
      });
      this.dy = g.position.y - y0 + this.dy * k;
      g.position.y = y0;
      this.put();
      anim(false);
      /* what it jumped by: that, less as it has it now */
      parts.forEach((o, i) => {
        const J = off[i];
        J.p.sub(o.position);
        J.q.multiply(_q.copy(o.quaternion).invert());
        J.s.sub(o.scale);
      });
      this.dy -= g.position.y - y0;
      this.t = 0;
    } else anim(false);
    this.key = key;
    parts.forEach((o, i) => { const S = this.set[i]; S.p.copy(o.position); S.e.copy(o.rotation); S.s.copy(o.scale); });
    const k = Fade.left(this.t);
    if (this.t >= 0) this.t = k > 0 ? this.t + dt : -1;
    if (k <= 0) return;
    parts.forEach((o, i) => {
      const J = off[i];
      o.position.addScaledVector(J.p, k);
      o.quaternion.premultiply(_q.identity().slerp(J.q, k));
      o.scale.addScaledVector(J.s, k);
    });
    g.position.y += this.dy * k;
  }

  /** gone loose: drawn from its points (rig.ts), and brought back out of them as it gets up, with nothing to switch from */
  cut(): void {
    this.key = null;
    this.t = -1;
  }
}
