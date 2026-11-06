import * as THREE from 'three';
import { bones, type Rag } from '../../sim/ragdoll';

/* A corpse, drawn (engine.md §6, bodies with physics). The sim moves a body's points (sim/ragdoll.ts); each box of the
   model rides the points of its joint. A torso is a frame: an origin, an up and a side, from its points. A limb is a
   bone: from one point to another, turned from its parent as little as takes it there, so it does not twist on its own.
   Each part is fixed to its frame as the model stands idle, so a body lying still is the model's own shape laid down.
   What is not tied to a frame (a thresher's ribs) stays as it was at the moment of death, on its
   parent. Going loose is not a cut: the model goes from where it was drawn to where its points are over BLEND; and
   one knocked down comes back out of its points into its animation as it gets up. */

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Model = { g: THREE.Group; [k: string]: any };
/** a point, or the middle of several */
type Ref = string | string[];
interface Part {
  at: (M: Model) => THREE.Object3D;
  /** a torso: origin, the way up (from, to), the way to its right as drawn (from, to) */
  frame?: [Ref, Ref, Ref, Ref, Ref];
  /** a limb: from, to; turned from part `parent` (by its index), with its origin at `o` if not at `from` */
  bone?: [Ref, Ref];
  parent?: number;
  o?: Ref;
}

/** seconds from the pose it was drawn in to the pose of its points */
export const BLEND = 0.15;

export const RIG: Record<string, { parts: Part[]; rest?: number }> = {
  husk: {
    parts: [
      { at: M => M.b, frame: [['hipL', 'hipR'], ['hipL', 'hipR'], ['shL', 'shR'], 'hipL', 'hipR'] },
      { at: M => M.hd, bone: [['shL', 'shR'], 'head'], parent: 0, o: 'head' },
      { at: M => M.legs[0], bone: ['hipL', 'kneeL'], parent: 0 },
      { at: M => M.shins[0], bone: ['kneeL', 'footL'], parent: 2 },
      { at: M => M.legs[1], bone: ['hipR', 'kneeR'], parent: 0 },
      { at: M => M.shins[1], bone: ['kneeR', 'footR'], parent: 4 },
      { at: M => M.arms[0], bone: ['shL', 'handL'], parent: 0 },
      { at: M => M.arms[1], bone: ['shR', 'handR'], parent: 0 },
    ],
  },
  thresher: {
    parts: [
      { at: M => M.b, frame: [['hipL', 'hipR'], ['hipL', 'hipR'], ['shL', 'shR'], 'hipL', 'hipR'] },
      { at: M => M.hd, bone: [['shL', 'shR'], 'head'], parent: 0, o: 'head' },
      { at: M => M.legs[0], bone: ['hipL', 'kneeL'], parent: 0 },
      { at: M => M.shins[0], bone: ['kneeL', 'footL'], parent: 2 },
      { at: M => M.legs[1], bone: ['hipR', 'kneeR'], parent: 0 },
      { at: M => M.shins[1], bone: ['kneeR', 'footR'], parent: 4 },
      { at: M => M.arms[0].a, bone: ['shL', 'elbL'], parent: 0 },
      { at: M => M.arms[0].f, bone: ['elbL', 'handL'], parent: 6 },
      { at: M => M.arms[1].a, bone: ['shR', 'elbR'], parent: 0 },
      { at: M => M.arms[1].f, bone: ['elbR', 'handR'], parent: 8 },
    ],
  },
  skitter: {
    parts: [
      { at: M => M.b, frame: [['fl', 'fr', 'bl', 'br'], ['fl', 'fr', 'bl', 'br'], 'top', ['fl', 'bl'], ['fr', 'br']] },
      ...['fl', 'bl', 'fr', 'br'].map((root, k): Part => ({ at: M => M.limbs[k].l, bone: [root, 'f' + k], parent: 0 })),
    ],
  },
  worm: {
    parts: [
      { at: M => M.hd, bone: ['s0', 'head'], o: 'head' },
      ...[0, 1, 2, 3, 4, 5].map((k): Part => ({ at: M => M.segs[k], bone: [k ? 's' + (k - 1) : 'head', k < 5 ? 's' + (k + 1) : 's5'], o: 's' + k })),
    ],
  },
};
/* the other patient is built as the husk is (render/castView.ts), and goes loose as it does */
RIG.patient = RIG.husk;
/* so are the station's dead (castView.ts, deadModel) */
RIG.dead = RIG.husk;
/* and the bone line's middle years, a husk grown (castView.ts, boneMid) */
RIG.bonemid = RIG.husk;
/* and the bush's line, old in it (castView.ts, plantOld) */
RIG.plantold = RIG.husk;

interface Bound {
  obj: THREE.Object3D;
  /** the part, or (for something of the model's own not tied to a frame) the part it goes with */
  part: number;
  /** where it is as the model stands idle, in the model's own frame */
  P0: THREE.Matrix4;
}
interface Compiled {
  frame?: number[][]; bone?: number[][]; o: number[]; parent: number;
  o0: THREE.Vector3; R0i: THREE.Quaternion; d0: THREE.Vector3;
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
const _m = new THREE.Matrix4(), _n = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3();
const _qi = new THREE.Quaternion();

/** the middle of some points: of the rest pose (model frame), or of a rag `alpha` of the way through its step */
function mid(out: THREE.Vector3, ix: number[], at: (i: number, k: number) => number): THREE.Vector3 {
  out.set(0, 0, 0);
  for (const i of ix) out.set(out.x + at(i, 0), out.y + at(i, 1), out.z + at(i, 2));
  return out.multiplyScalar(1 / ix.length);
}

/** a model fixed to the points of a skeleton */
export class Rigged {
  private parts: Compiled[];
  private bound: Bound[];
  /** each part's turn (from as it stands) and origin, this frame */
  private G: THREE.Quaternion[];
  private O: THREE.Vector3[];
  /** where each was drawn at death, and how far it has gone from that */
  private from: THREE.Matrix4[] | null = null;
  private t = 0;
  /** laid as it lies asleep, blended in: nothing to do until it wakes */
  private still = false;
  private woke = -1;
  /** the body it was last drawn from: a new one (a knockdown, then death) blends in afresh */
  private last: Rag | null = null;
  /** each part as it stands idle, in its parent's frame: put back before the animation runs again (it sets only the
   *  turns it moves) */
  private idle: { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3 }[];

  /** each part put back as it stands, for the animation to take it from there */
  restore(): void {
    this.still = false;
    this.bound.forEach((b, i) => { b.obj.position.copy(this.idle[i].p); b.obj.quaternion.copy(this.idle[i].q); b.obj.scale.copy(this.idle[i].s); });
  }
  private W: THREE.Matrix4[];

  /** `M` is to stand as it does idle when this is made (castView.ts poses it so) */
  constructor(private M: Model, kind: string) {
    const B = bones(kind), spec = RIG[kind], refs = (r: Ref) => (Array.isArray(r) ? r : [r]).map(n => {
      const i = B.at[n];
      if (i === undefined) throw new Error(`${kind}: no point ${n}`);
      return i;
    });
    const rest = (i: number, k: number) => B.rest[i * 3 + k];
    this.parts = spec.parts.map(P => {
      const c: Compiled = { o: [], parent: P.parent ?? -1, o0: new THREE.Vector3(), R0i: new THREE.Quaternion(), d0: new THREE.Vector3() };
      if (P.frame) {
        c.frame = P.frame.map(refs); c.o = c.frame[0];
        basis(c.frame, rest, _q); c.R0i.copy(_q).invert();
      } else {
        c.bone = P.bone!.map(refs); c.o = P.o ? refs(P.o) : c.bone[0];
        c.d0.subVectors(mid(_b, c.bone[1], rest), mid(_a, c.bone[0], rest)).normalize();
      }
      mid(c.o0, c.o, rest);
      return c;
    });
    M.g.position.set(0, 0, 0); M.g.rotation.set(0, 0, 0); M.g.scale.set(1, 1, 1);
    M.g.updateMatrixWorld(true);
    this.bound = spec.parts.map((P, i) => ({ obj: P.at(M), part: i, P0: P.at(M).matrixWorld.clone() }));
    /* what hangs on the model itself but is no part of it (a thresher's hips, a worm's hand) goes with its body */
    const tied = new Set(this.bound.map(b => b.obj));
    for (const o of M.g.children) if (!tied.has(o)) this.bound.push({ obj: o, part: spec.rest ?? 0, P0: o.matrixWorld.clone() });
    this.idle = this.bound.map(b => ({ p: b.obj.position.clone(), q: b.obj.quaternion.clone(), s: b.obj.scale.clone() }));
    this.G = this.parts.map(() => new THREE.Quaternion());
    this.O = this.parts.map(() => new THREE.Vector3());
    this.W = this.bound.map(() => new THREE.Matrix4());
  }

  /** draw it as its points lie, `alpha` of the way through the step, `dt` seconds since the last frame; blended in
   *  from where it was drawn when it went loose */
  pose(R: Rag, alpha: number, dt: number): void {
    const g = this.M.g;
    if (R !== this.last) { this.last = R; this.from = null; this.still = false; }
    /* woken since (even if asleep again by now, between two frames) */
    if (R.awake || R.woke !== this.woke) this.still = false;
    this.woke = R.woke;
    /* where it was drawn, taken while the model still stands where it was last placed (castView.ts places it no more
       once it is loose): taken once it is laid in the world's own frame, it was taken at the world's middle, and the
       body came in from there over BLEND */
    if (!this.from) {
      g.updateMatrixWorld(true);
      this.from = this.bound.map(b => b.obj.matrixWorld.clone());
      this.t = 0;
    }
    g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); g.scale.set(1, 1, 1);
    /* asleep, blended in and laid as it lies: its points do not move until it wakes, so neither does it */
    if (this.still) return;
    this.t = Math.min(BLEND, this.t + dt);
    g.updateMatrix(); g.updateMatrixWorld(true);
    const k = this.t / BLEND;
    this.lay(R, alpha, this.from, k * k * (3 - 2 * k));
    this.still = !R.awake && this.t >= BLEND;
  }

  /** laid as it lies asleep: it will not move until it wakes */
  get settled(): boolean {
    return this.still;
  }

  /** every part shown, as it was last laid, as one geometry in its group's frame: a body asleep drawn in one draw call
   *  rather than one a part (castView.ts). The parts' own geometries are shared, and left as they are */
  bake(): THREE.BufferGeometry {
    const g = this.M.g, inv = _m.copy(g.matrixWorld).invert(), shown: THREE.Mesh[] = [];
    /* the parts shown, whether or not the whole is being drawn just now (castView.ts, SIGHT) */
    for (const c of g.children) c.traverseVisible(o => { if ((o as THREE.Mesh).isMesh) shown.push(o as THREE.Mesh); });
    let n = 0;
    for (const o of shown) n += o.geometry.getAttribute('position').count;
    const P = new Float32Array(n * 3), C = new Float32Array(n * 3);
    let at = 0;
    for (const o of shown) {
      const pos = o.geometry.getAttribute('position'), col = o.geometry.getAttribute('aCol'), T = _n.multiplyMatrices(inv, o.matrixWorld);
      for (let v = 0; v < pos.count; v++, at++) {
        _p.fromBufferAttribute(pos, v).applyMatrix4(T).toArray(P, at * 3);
        C[at * 3] = col.getX(v); C[at * 3 + 1] = col.getY(v); C[at * 3 + 2] = col.getZ(v);
      }
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(P, 3));
    out.setAttribute('aCol', new THREE.BufferAttribute(C, 3));
    return out;
  }

  /** getting up (sim/cast.ts, `rise`): the model as its animation has it this frame, `e` (0..1) of the way there from
   *  as its points lie. The animation has been run, and the model placed where the sim has it */
  rise(R: Rag, alpha: number, e: number): void {
    const g = this.M.g;
    g.updateMatrixWorld(true);
    const to = this.bound.map(b => b.obj.matrixWorld.clone()), s = Math.min(1, Math.max(0, e));
    this.lay(R, alpha, to, 1 - s * s * (3 - 2 * s));
    this.from = null;
    this.still = false;
  }

  /** each part where its points put it, blended `e` of the way from `other` (1: all the points'), then into its
   *  parent's frame */
  private lay(R: Rag, alpha: number, other: THREE.Matrix4[], e: number): void {
    const g = this.M.g, at = (i: number, k: number) => R.o[i * 3 + k] + (R.p[i * 3 + k] - R.o[i * 3 + k]) * alpha;
    this.parts.forEach((c, j) => {
      const G = this.G[j];
      if (c.frame) basis(c.frame, at, G).multiply(c.R0i);
      else {
        const Gp = c.parent >= 0 ? this.G[c.parent] : _q.identity();
        _c.subVectors(mid(_b, c.bone![1], at), mid(_a, c.bone![0], at)).normalize();
        /* the limb's way as its parent would see it standing, and the least turn from how it stands to that */
        _c.applyQuaternion(_qi.copy(Gp).invert());
        G.setFromUnitVectors(c.d0, _c).premultiply(Gp);
      }
      mid(this.O[j], c.o, at);
    });
    const byObj = new Map<THREE.Object3D, THREE.Matrix4>();
    this.bound.forEach((b, i) => {
      const c = this.parts[b.part], W = this.W[i];
      /* W = T(origin) · G · T(-origin as it stands) · as it stands */
      W.makeTranslation(-c.o0.x, -c.o0.y, -c.o0.z).premultiply(_m.makeRotationFromQuaternion(this.G[b.part])).premultiply(_n.makeTranslation(this.O[b.part].x, this.O[b.part].y, this.O[b.part].z)).multiply(b.P0);
      if (e < 1) blend(other[i], W, e, W);
      byObj.set(b.obj, W);
    });
    /* each into its parent's frame: a parent tied to a frame is where it was just put */
    for (const b of this.bound) {
      const W = byObj.get(b.obj)!, par = b.obj.parent!, PW = byObj.get(par) ?? par.matrixWorld;
      _m.copy(PW).invert().multiply(W).decompose(b.obj.position, b.obj.quaternion, b.obj.scale);
    }
    g.updateMatrixWorld(true);
  }
}

/** a frame's turn from its points: up from the first pair, its right from the second, square to each other */
function basis(f: number[][], at: (i: number, k: number) => number, out: THREE.Quaternion): THREE.Quaternion {
  _y.subVectors(mid(_b, f[2], at), mid(_a, f[1], at)).normalize();
  _x.subVectors(mid(_b, f[4], at), mid(_a, f[3], at));
  _z.crossVectors(_x, _y).normalize();
  _x.crossVectors(_y, _z);
  return out.setFromRotationMatrix(_m.makeBasis(_x, _y, _z));
}

const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _p1 = new THREE.Vector3(), _p2 = new THREE.Vector3();
/** e of the way from one placing to another */
function blend(a: THREE.Matrix4, b: THREE.Matrix4, e: number, out: THREE.Matrix4): void {
  a.decompose(_p1, _q1, _s); b.decompose(_p2, _q2, _s);
  _p.lerpVectors(_p1, _p2, e);
  out.compose(_p, _q1.slerp(_q2, e), _s.set(1, 1, 1));
}
