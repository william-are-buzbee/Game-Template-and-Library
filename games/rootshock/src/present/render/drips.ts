import * as THREE from 'three';
import { Rng } from '../../core/rng';
import type { Sim } from '../../sim/sim';
import type { Lighting } from '../../world/light';
import type { World } from '../../world/world';
import { LIGHTS, U, lightUniforms } from './shader';

/* Water coming through the rock. A level's drip points are found once, from its own id, so they are the same every
   time: in its caves and over its standing water, one to three a room, each where there is roof above and something
   below it. From each a drop falls now and then (each point at its own pace); where it lands it spreads a ring on
   water (a square, as everything on the floor is, growing and fading), or on stone a small splash, and under it the
   stone stays dark and wet. You hear it there (Soundscape.dripAt), not anywhere. Looks only. */

/** a drip point: where the drop starts and where it lands, on water or not, and how often */
export interface Drip { x: number; z: number; top: number; low: number; water: boolean; every: number; t: number }

const MAX_RINGS = 48, MAX_DROPS = 48, G = 9.8;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** where a level drips: its caves, and its rooms over standing water */
export function dripPoints(w: World): Drip[] {
  const r = new Rng('drips:' + w.def.id), out: Drip[] = [];
  for (const R of w.rooms) {
    if (R.doorway) continue;
    const cx = (R.x0 + R.x1) / 2, cz = (R.z0 + R.z1) / 2, wet = w.waterAt(cx, cz) > R.y0 - 0.5;
    if (!R.cells && !wet) continue;
    const want = Math.min(3, Math.max(1, Math.round(((R.x1 - R.x0) * (R.z1 - R.z0)) / 60)));
    for (let tries = 0, made = 0; tries < 12 && made < want; tries++) {
      const x = r.range(R.x0 + 0.5, R.x1 - 0.5), z = r.range(R.z0 + 0.5, R.z1 - 0.5);
      /* somewhere open in this room at (x, z): from there, the roof above and what is below */
      let y = -Infinity;
      for (let h = R.y0 + 0.5; h < R.y0 + R.ht; h += 0.5) if (w.roomAt(x, h, z)?.id === R.id) { y = h; break; }
      if (!Number.isFinite(y)) continue;
      const up = w.raycast(x, y, z, x, y + 30, z), down = w.raycast(x, y, z, x, y - 30, z);
      if (up >= 1 || down >= 1) continue; // open sky, or nothing under it
      const top = y + 30 * up - 0.02, floor = y - 30 * down, wl = w.waterAt(x, z), water = wl > floor;
      const low = water ? wl : floor + 0.01;
      if (top - low < 1) continue;
      out.push({ x, z, top, low, water, every: r.range(2, 7), t: r.range(0, 7) });
      made++;
    }
  }
  return out;
}

const RING_VS = /* glsl */ `
attribute vec3 iPos; attribute float iSize; attribute vec3 iCol; attribute float iA; attribute vec3 iL;
uniform float uFog;
varying vec3 vC; varying float vA; varying vec2 vS;
${LIGHTS}
void main(){
  vec3 p = iPos + vec3(position.x * iSize, 0.0, position.z * iSize);
  vec3 tc = cameraPosition - p; float d = length(tc);
  /* a ring on water is mostly what it catches: a little light of its own (iA > 0); a wet patch has none */
  vC = iCol * (iL + carried(p, vec3(0.0, 1.0, 0.0), 1.0) + lying(p, vec3(0.0, 1.0, 0.0)) + (iA > 0.0 ? 0.12 : 0.0));
  vA = iA * exp(-d * uFog);
  vS = position.xz * 2.0;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
/* a ring is a square's edge; a wet patch (iCol's alpha flag in vA's sign) is a whole square */
const RING_FS = /* glsl */ `
varying vec3 vC; varying float vA; varying vec2 vS;
void main(){
  float a = abs(vA), edge = max(abs(vS.x), abs(vS.y));
  if (vA > 0.0 && edge < 0.62) discard;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vC, a);
}`;

const DROP_VS = /* glsl */ `
attribute vec3 aL; attribute float aA;
uniform float uFog; uniform float uPx;
varying vec3 vC; varying float vA;
${LIGHTS}
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 tc = cameraPosition - position; float d = length(tc);
  vC = vec3(0.7, 0.8, 0.85) * (aL + 0.6 * (held(position, vec3(0.0), 1.0) + lying(position, vec3(0.0))) + bounce(position) + 0.1);
  vA = aA * exp(-d * uFog);
  gl_PointSize = floor(clamp(uPx / max(-mv.z, 0.1), 2.0, 6.0));
  gl_Position = projectionMatrix * mv;
}`;
const DROP_FS = /* glsl */ `
varying vec3 vC; varying float vA;
void main(){ if (vA < 0.01) discard; gl_FragColor = vec4(vC, vA); }`;

interface Ring { x: number; y: number; z: number; age: number; life: number; most: number; water: boolean }

export class Drips {
  private points: Drip[] = [];
  private sim: Sim | null = null;
  /* the drops in the air: which point, how long falling */
  private drops: { p: Drip; t: number }[] = [];
  private dropGeo = new THREE.BufferGeometry();
  private dPos = new Float32Array(MAX_DROPS * 3);
  private dL = new Float32Array(MAX_DROPS * 3);
  private dA = new Float32Array(MAX_DROPS);
  private dropMat: THREE.ShaderMaterial;
  /* rings spreading, and the wet patches under stone drips (the first instances, one a stone point) */
  private ringGeo = new THREE.InstancedBufferGeometry();
  private rPos = new Float32Array(MAX_RINGS * 3);
  private rSize = new Float32Array(MAX_RINGS);
  private rCol = new Float32Array(MAX_RINGS * 3);
  private rA = new Float32Array(MAX_RINGS);
  private rL = new Float32Array(MAX_RINGS * 3);
  private rings: Ring[] = [];
  private patches: Drip[] = [];

  constructor(scene: THREE.Object3D, private L: Lighting, private onDrip: (x: number, y: number, z: number, water: boolean) => void) {
    const dyn = <T extends THREE.BufferAttribute>(a: T) => a.setUsage(THREE.DynamicDrawUsage) as T;
    this.dropGeo.setAttribute('position', dyn(new THREE.BufferAttribute(this.dPos, 3)));
    this.dropGeo.setAttribute('aL', dyn(new THREE.BufferAttribute(this.dL, 3)));
    this.dropGeo.setAttribute('aA', dyn(new THREE.BufferAttribute(this.dA, 1)));
    this.dropMat = new THREE.ShaderMaterial({
      uniforms: { ...lightUniforms(), uFog: U.uFog, uPx: { value: 30 } },
      vertexShader: DROP_VS, fragmentShader: DROP_FS, transparent: true, depthWrite: false,
    });
    const drops = new THREE.Points(this.dropGeo, this.dropMat);
    drops.frustumCulled = false;
    scene.add(drops);

    const base = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.ringGeo.index = base.index;
    this.ringGeo.setAttribute('position', base.getAttribute('position'));
    const inst = (a: Float32Array, n: number) => new THREE.InstancedBufferAttribute(a, n).setUsage(THREE.DynamicDrawUsage);
    this.ringGeo.setAttribute('iPos', inst(this.rPos, 3));
    this.ringGeo.setAttribute('iSize', inst(this.rSize, 1));
    this.ringGeo.setAttribute('iCol', inst(this.rCol, 3));
    this.ringGeo.setAttribute('iA', inst(this.rA, 1));
    this.ringGeo.setAttribute('iL', inst(this.rL, 3));
    this.ringGeo.instanceCount = 0;
    const ringMat = new THREE.ShaderMaterial({
      uniforms: { ...lightUniforms(), uFog: U.uFog },
      vertexShader: RING_VS, fragmentShader: RING_FS, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    const rings = new THREE.Mesh(this.ringGeo, ringMat);
    rings.frustumCulled = false;
    rings.renderOrder = 1;
    scene.add(rings);
  }

  /** how many drip points this level has (the soundscape drips at random only where there are none) */
  get count(): number { return this.points.length; }

  setLighting(L: Lighting): void { this.L = L; }

  /** pixels at one metre for a drop: a few millimetres across, but never less than two pixels */
  resize(height: number, fov: number): void {
    this.dropMat.uniforms.uPx.value = (height / 2 / Math.tan((fov * Math.PI) / 360)) * 0.012;
  }

  private reset(sim: Sim): void {
    this.sim = sim;
    this.points = dripPoints(sim.world);
    this.patches = this.points.filter(p => !p.water).slice(0, MAX_RINGS / 2);
    this.drops = []; this.rings = [];
  }

  update(sim: Sim, dt: number): void {
    if (sim !== this.sim) this.reset(sim);
    for (const p of this.points) {
      if ((p.t -= dt) > 0) continue;
      p.t = p.every * rnd(0.7, 1.3);
      if (this.drops.length < MAX_DROPS) this.drops.push({ p, t: 0 });
    }
    /* drops falling, and landing */
    let n = 0;
    this.drops = this.drops.filter(d => {
      d.t += dt;
      const y = d.p.top - 0.5 * G * d.t * d.t;
      if (y <= d.p.low) {
        this.onDrip(d.p.x, d.p.low, d.p.z, d.p.water);
        if (this.rings.length < MAX_RINGS - this.patches.length)
          this.rings.push({ x: d.p.x, y: d.p.low + 0.006, z: d.p.z, age: 0, life: d.p.water ? 0.9 : 0.35, most: d.p.water ? 0.5 : 0.14, water: d.p.water });
        return false;
      }
      const l = this.L.atPoint(d.p.x, y, d.p.z);
      this.dPos.set([d.p.x, y, d.p.z], n * 3); this.dL.set(l, n * 3); this.dA[n] = 0.8;
      n++;
      return true;
    });
    for (let k = n; k < MAX_DROPS; k++) this.dA[k] = 0;
    this.dropGeo.setDrawRange(0, n);
    for (const a of ['position', 'aL', 'aA']) this.dropGeo.getAttribute(a).needsUpdate = true;

    /* the wet patches under stone drips, then the rings: a ring's alpha is positive (an edge), a patch's negative (whole) */
    let i = 0;
    for (const p of this.patches) {
      const l = this.L.atPoint(p.x, p.low + 0.05, p.z);
      this.rPos.set([p.x, p.low + 0.004, p.z], i * 3); this.rSize[i] = 0.32; this.rCol.set([0.05, 0.05, 0.055], i * 3); this.rL.set(l, i * 3); this.rA[i] = -0.4;
      i++;
    }
    this.rings = this.rings.filter(r => (r.age += dt) < r.life);
    for (const r of this.rings) {
      const f = r.age / r.life, l = this.L.atPoint(r.x, r.y + 0.05, r.z);
      this.rPos.set([r.x, r.y, r.z], i * 3); this.rSize[i] = 0.04 + r.most * f; this.rL.set(l, i * 3);
      this.rCol.set(r.water ? [0.7, 0.8, 0.85] : [0.5, 0.52, 0.55], i * 3); this.rA[i] = 0.7 * (1 - f);
      i++;
    }
    this.ringGeo.instanceCount = i;
    for (const a of ['iPos', 'iSize', 'iCol', 'iA', 'iL']) this.ringGeo.getAttribute(a).needsUpdate = true;
  }
}
