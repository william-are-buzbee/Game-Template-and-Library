import * as THREE from 'three';
import type { Mutant } from '../../sim/cast';
import type { Sim } from '../../sim/sim';
import type { Lighting } from '../../world/light';
import { LIGHTS, U, lightUniforms } from './shader';

/* What is left on the floor.

   Footprints, yours and the cast's: out of water soles are wet for a dozen prints or so, and those dry off in half a
   minute; through blood (a pool on the floor, or under one of the cast that fell) they are red for about ten, and
   those stay; through what a green one bled, green. Each print is a sole and a heel the size of the foot that made it (the
   models in castView), a touch smaller and fainter as what is on the sole runs out. A walker's feet and pace set its
   prints: you and the husks a pace apart, left and right; the thresher's broader and further apart; a skitter's
   small and quick; a worm one wide patch where it dragged itself.

   A print that comes down on one already there grows that one (up to a point) rather than lying on top of it, so
   a path walked over and over darkens into one patch instead of a pile of prints. (Bleeding is for later.)

   None in water, on a crate or on a platform. The newest 256 are kept. Looks only: not part of the sim, and not saved. */

const MAX = 256;
/** how much of the wet or the blood each print takes off a sole */
const WET_LEFT = 0.86, BLOOD_LEFT = 0.8;
/** seconds a wet print takes to dry */
const DRY = 32;
/** a print come down on one already there: how much it grows that one each way, and how far past its first size */
const GROW = { by: 0.03, most: 1.6 };

/** what a print is of: water, blood, or a green one's sap */
type Stuff = 'wet' | 'red' | 'green';
/** the station's blood is 0x3a0b0b; sap is the green ones' (castView's 0x24401f) */
const COLOUR: Record<Stuff, [number, number, number]> = { wet: [0.05, 0.05, 0.055], red: [0.23, 0.045, 0.045], green: [0.14, 0.25, 0.12] };

/** how each kind walks: its foot (width across, length along, as its model has it in castView), a pace, and how far
 *  its feet are from its middle. Yours are a boot's. */
interface Gait { w: number; l: number; pace: number; side: number }
const YOU: Gait = { w: 0.12, l: 0.28, pace: 0.75, side: 0.1 };
const GAIT: Partial<Record<string, Gait>> = {
  husk: { w: 0.16, l: 0.26, pace: 0.8, side: 0.11 },
  thresher: { w: 0.17, l: 0.3, pace: 1.2, side: 0.17 },
  skitter: { w: 0.11, l: 0.16, pace: 0.4, side: 0.7 },
  worm: { w: 0.38, l: 0.36, pace: 0.36, side: 0 },
};

const VS = /* glsl */ `
attribute vec3 iPos; attribute float iYaw; attribute vec2 iSize; attribute vec3 iCol; attribute float iA; attribute vec3 iL;
uniform float uFog;
varying vec3 vC; varying float vA; varying vec2 vQ;
${LIGHTS}
void main(){
  float c = cos(iYaw), s = sin(iYaw);
  vQ = position.xz;
  vec2 q = position.xz * iSize;
  vec3 p = iPos + vec3(q.x * c + q.y * s, 0.0, -q.x * s + q.y * c);
  vec3 tc = cameraPosition - p; float d = length(tc);
  vC = iCol * (iL + carried(p, vec3(0.0, 1.0, 0.0), 1.0) + lying(p, vec3(0.0, 1.0, 0.0)));
  vA = iA * exp(-d * uFog);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const FS = /* glsl */ `
varying vec3 vC; varying float vA; varying vec2 vQ;
void main(){
  if (vA < 0.01) discard;
  /* a foot, not a block: the ball and sole toward its front, the heel behind, round at both (the quad a unit square) */
  vec2 a = vec2(vQ.x / 0.5, (vQ.y - 0.12) / 0.38), h = vec2(vQ.x / 0.4, (vQ.y + 0.3) / 0.2);
  if (dot(a, a) > 1.0 && dot(h, h) > 1.0) discard;
  gl_FragColor = vec4(vC, vA);
}`;

/** a print on the floor: where, of what, how strong (0..1), how old, how big (across and along) and how big it began */
interface Print { x: number; y: number; z: number; stuff: Stuff; k: number; age: number; w: number; l: number; w0: number; l0: number }

/** a walker's soles: where it was, how far since its last print, which foot, what is on its feet */
interface Feet { x: number; z: number; gone: number; left: boolean; wet: number; blood: number; sap: boolean }

export class Prints {
  private geo = new THREE.InstancedBufferGeometry();
  private iPos = new Float32Array(MAX * 3);
  private iYaw = new Float32Array(MAX);
  private iSize = new Float32Array(MAX * 2);
  private iCol = new Float32Array(MAX * 3);
  private iA = new Float32Array(MAX);
  private iL = new Float32Array(MAX * 3);
  private list: Print[] = [];
  private next = 0;
  private you: Feet | null = null;
  private feet = new Map<Mutant, Feet>();
  private sim: Sim | null = null;

  constructor(scene: THREE.Object3D, private L: Lighting) {
    const base = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.geo.index = base.index;
    this.geo.setAttribute('position', base.getAttribute('position'));
    const attr = (a: Float32Array, n: number) => new THREE.InstancedBufferAttribute(a, n).setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('iPos', attr(this.iPos, 3));
    this.geo.setAttribute('iYaw', attr(this.iYaw, 1));
    this.geo.setAttribute('iSize', attr(this.iSize, 2));
    this.geo.setAttribute('iCol', attr(this.iCol, 3));
    this.geo.setAttribute('iA', attr(this.iA, 1));
    this.geo.setAttribute('iL', attr(this.iL, 3));
    this.geo.instanceCount = 0;
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...lightUniforms(), uFog: U.uFog },
      vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    const mesh = new THREE.Mesh(this.geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 1;
    scene.add(mesh);
  }

  /** the power changed: each print takes the light where it lies */
  setLighting(L: Lighting): void {
    this.L = L;
    this.list.forEach((p, k) => this.light(p, k));
    this.geo.getAttribute('iL').needsUpdate = true;
  }

  private light(p: Print, k: number): void {
    const l = this.L.atPoint(p.x, p.y + 0.05, p.z);
    this.iL[k * 3] = l[0]; this.iL[k * 3 + 1] = l[1]; this.iL[k * 3 + 2] = l[2];
  }

  /** is a point within a print (turned by yaw) around (cx, cz), w across and l along? */
  private static under(x: number, z: number, cx: number, cz: number, yaw: number, w: number, l: number): boolean {
    const dx = x - cx, dz = z - cz, c = Math.cos(yaw), s = Math.sin(yaw);
    return Math.abs(dx * c - dz * s) < w / 2 && Math.abs(dx * s + dz * c) < l / 2;
  }

  /** a print of `stuff` that (x, z) on the floor at y lies on, if any */
  private printAt(x: number, y: number, z: number, stuff: Stuff): number {
    for (let k = 0; k < this.list.length; k++) {
      const P = this.list[k];
      if (P.stuff === stuff && Math.abs(P.y - y) < 0.3 && Prints.under(x, z, P.x, P.z, this.iYaw[k], P.w, P.l)) return k;
    }
    return -1;
  }

  /** what is underfoot at (x, z) on the floor at y: a pool the level was built with, one the living bled (Sim.pools: a
   *  pool, not a smear), or what one of the cast that fell bled (blood, or a green one's sap). A print is not: walking
   *  back over your own trail does not wet your soles again. */
  private spilt(sim: Sim, x: number, y: number, z: number): 'red' | 'green' | null {
    for (const S of sim.world.def.stains ?? []) if (Math.abs(S.y - y) < 0.5 && Math.hypot(S.x - x, S.z - z) < S.r + 0.12) return 'red';
    for (const P of sim.pools) if (!P.kind && Math.abs(P.y - y) < 0.5 && Math.hypot(P.x - x, P.z - z) < P.r * 0.45 + 0.12) return 'red';
    for (const m of sim.cast) {
      if (!m.dead || m.away || m.fixed || m.swim || Math.abs(m.y - y) > 0.5) continue;
      if (Math.hypot(m.x - x, m.z - z) < m.r * 1.2 + 0.12) return m.green ? 'green' : 'red';
    }
    return null;
  }

  /** a print at (x, y, z), turned to `yaw`, of `stuff`, this strong, w across and l along */
  private put(x: number, y: number, z: number, yaw: number, w: number, l: number, stuff: Stuff, k: number): void {
    const P: Print = { x, y: y + 0.012, z, stuff, k, age: 0, w, l, w0: w, l0: l }, i = this.next;
    this.next = (this.next + 1) % MAX;
    this.list[i] = P;
    this.iPos.set([P.x, P.y, P.z], i * 3);
    this.iYaw[i] = yaw;
    this.iSize[i * 2] = w; this.iSize[i * 2 + 1] = l;
    this.light(P, i);
    this.geo.instanceCount = this.list.length;
    for (const a of ['iPos', 'iYaw', 'iSize', 'iL']) this.geo.getAttribute(a).needsUpdate = true;
  }

  /** a walker's foot down, facing `face`, in water or not, on firm floor or not */
  private step(sim: Sim, F: Feet, g: Gait, x: number, y: number, z: number, face: number, inWater: boolean, firm: boolean): void {
    if (inWater) { F.wet = 1; return; }
    if (!firm) return;
    F.left = !F.left;
    const side = F.left ? -g.side : g.side, fx = x + Math.cos(face) * side, fz = z - Math.sin(face) * side;
    const s = this.spilt(sim, fx, y, fz);
    if (s) { F.blood = 1; F.sap = s === 'green'; }
    if (F.wet < 0.08 && F.blood < 0.1) return;
    const stuff: Stuff = F.blood >= 0.1 ? (F.sap ? 'green' : 'red') : 'wet', k = stuff === 'wet' ? F.wet : F.blood;
    const on = this.printAt(fx, y, fz, stuff);
    if (on >= 0) {
      /* on a print already there: that one grows, and is as fresh as this foot */
      const P = this.list[on];
      P.w = Math.min(P.w0 * GROW.most, P.w + GROW.by); P.l = Math.min(P.l0 * GROW.most, P.l + GROW.by); P.k = Math.max(P.k, k); P.age = 0;
      this.iSize[on * 2] = P.w; this.iSize[on * 2 + 1] = P.l;
      this.geo.getAttribute('iSize').needsUpdate = true;
    } else {
      /* the foot's own size, a little less as what is on the sole runs out (it fades more than it shrinks), and turned
         a little off true, as a foot comes down */
      const s = 0.85 + 0.15 * k;
      this.put(fx, y, fz, face + (Math.random() - 0.5) * 0.3, g.w * s, g.l * s, stuff, k);
    }
    F.wet *= WET_LEFT; F.blood *= BLOOD_LEFT;
    if (F.wet < 0.08) F.wet = 0;
    if (F.blood < 0.1) F.blood = 0;
  }

  private reset(sim: Sim): void {
    this.sim = sim;
    this.list = []; this.next = 0; this.you = null; this.feet.clear();
    this.geo.instanceCount = 0;
  }

  private static feet(x: number, z: number, sap: boolean): Feet {
    return { x, z, gone: 0, left: false, wet: 0, blood: 0, sap };
  }

  /** a frame: a print every pace each walker goes (not a jump in place, and not you flying), and wet prints dry */
  update(sim: Sim, dt: number): void {
    if (sim !== this.sim) this.reset(sim);
    const w = sim.world, p = sim.player, b = p.body;
    /* you */
    const Y = (this.you ??= Prints.feet(b.x, b.z, false)), firmY = b.ground && !b.on, dryY = p.water === 'dry';
    if (!p.fly) this.walked(Y, b.x, b.z, YOU.pace, () => this.step(sim, Y, YOU, b.x, b.y, b.z, p.yaw, !dryY, firmY));
    Y.x = b.x; Y.z = b.z;
    /* the cast that walk; one of the cast faces (sin yaw, cos yaw), which is the prints' yaw plus a half turn */
    for (const m of sim.cast) {
      const G = GAIT[m.ai];
      if (!G || m.dead || m.fixed || m.swim || m.ride) { this.feet.delete(m); continue; }
      let F = this.feet.get(m);
      if (!F) this.feet.set(m, (F = Prints.feet(m.x, m.z, !!m.green)));
      const mb = m.body, face = m.yaw + Math.PI, wet = w.waterAt(m.x, m.z) > m.y + 0.05, firm = !mb || (mb.ground && !mb.on);
      const feet = F;
      this.walked(feet, m.x, m.z, G.pace * (m.gait.stride ?? 1), () => this.step(sim, feet, G, m.x, m.y, m.z, face, wet, firm)); // its own steps' length (sim/cast/gait.ts)
      F.x = m.x; F.z = m.z;
    }
    /* drying: water goes, blood and sap stay; prints fainter as the sole ran out */
    this.list.forEach((P, k) => {
      P.age += dt;
      this.iCol.set(COLOUR[P.stuff], k * 3);
      this.iA[k] = P.stuff === 'wet' ? 0.45 * P.k * Math.max(0, 1 - P.age / DRY) : 0.3 + 0.6 * P.k;
    });
    this.geo.getAttribute('iCol').needsUpdate = true;
    this.geo.getAttribute('iA').needsUpdate = true;
  }

  /** how far a walker has gone since its last print; a pace on, its foot comes down */
  private walked(F: Feet, x: number, z: number, pace: number, down: () => void): void {
    const d = Math.hypot(x - F.x, z - F.z);
    if (d < 3) F.gone += d; // further at once is a jump in place, not a walk
    if (F.gone >= pace) { F.gone = 0; down(); }
  }
}
