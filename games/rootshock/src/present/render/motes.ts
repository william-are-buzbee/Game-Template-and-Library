import * as THREE from 'three';
import type { Motes as Kind, RoomDef } from '../../content/types';
import { power } from '../../sim/game';
import { STEP } from '../../core/loop';
import type { Sim } from '../../sim/sim';
import type { Lighting } from '../../world/light';
import { LIGHTS, U, lightUniforms } from './shader';

/* What hangs in the air near you: dust, the green's spores, the flesh's flecks (RoomDef.motes). Nine hundred specks in
   a box that travels with the eye; one that drifts out of the box comes back in at the far side. Each is a fleck of
   matter, square and a couple of centimetres across, lit as a surface is: by the room's light as much as by your
   beam, and never brighter than a wall beside it would be (drawn over what is behind, not added to it). Some are pale,
   some dark grit.

   The air moves by the power: with the room's circuit live, it is drawn toward the room's vent panels (or, with none,
   along the room's length); on a backup set, barely; dead, it hangs and slowly settles. A sealed room is still air, not
   a problem to solve, and the dustiest: moving air carries most of it off, so a ventilated room shows a quarter of the
   dust a stuffy one does, and a room on its backup set about half. When the power changes they thin or thicken over a
   second or so.

   Each speck has a velocity of its own. It eases toward the air's (slowly: dust keeps going a while), is nudged at
   random rather than swung about a point, and is dragged along and shoved aside by anything moving through it, you
   or the cast; it keeps that push until the air takes it back. A door that has been shut a while breathes out when it
   opens: a gust of smaller specks through the doorway toward you, and a sound with it. Looks only: Math.random, never
   the sim's numbers. */

const N = 900;
/** gust specks, kept apart from the drifting ones */
const G = 80;
const HX = 4, HY = 2, HZ = 4;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** each kind's colour, how many of the specks show in still air, how big, and how it moves (lift: up, negative falls) */
/*  `share`: of the specks that show, how many are the kind's own; the rest are ordinary dust, so the green's air or a
    nest's is dust with spores or flecks in it, not air of another colour. Flecks are dark, a dried maroon: matter, not
    a tint of the light. */
const KIND: Record<Kind, { c: [number, number, number]; show: number; share: number; size: number; lift: number; glow: number }> = {
  dust: { c: [0.95, 0.9, 0.8], show: 0.15, share: 1, size: 1, lift: -0.006, glow: 0 },
  spores: { c: [0.72, 0.95, 0.48], show: 0.4, share: 0.5, size: 1.35, lift: 0.012, glow: 0.02 },
  flesh: { c: [0.5, 0.15, 0.12], show: 0.22, share: 0.35, size: 1.15, lift: -0.012, glow: 0 },
};

const VS = /* glsl */ `
attribute vec3 aCol; attribute vec3 aL; attribute float aA; attribute float aS;
uniform float uFog; uniform float uPx; uniform float uExpo;
varying vec3 vC; varying float vA;
${LIGHTS}
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 tc = cameraPosition - position; float d = length(tc);
  /* a beam through dust shows it, softly: less than a wall would take */
  vec3 light = aL + 0.45 * (held(position, vec3(0.0), 1.0) + lying(position, vec3(0.0))) + bounce(position) + 0.8 * lantern(position, 1.0);
  /* dust is never the brightest thing in view: bright light is given back softly, as the eye sees it */
  vec3 c = aCol * light * uExpo;
  vC = c / (1.0 + 0.35 * c) / uExpo;
  /* not right at the eye, not at the box's edge (where a speck comes back in), thinned by the fog */
  vA = aA * smoothstep(0.25, 0.8, d) * (1.0 - smoothstep(2.8, 3.9, d)) * exp(-d * uFog * 1.5);
  /* whole pixels, so a fleck is a crisp square and not a smudge */
  gl_PointSize = floor(clamp(uPx * aS / max(-mv.z, 0.1), 2.0, 14.0));
  gl_Position = projectionMatrix * mv;
}`;

const FS = /* glsl */ `
varying vec3 vC; varying float vA;
void main(){
  if (vA < 0.01) discard;
  gl_FragColor = vec4(vC, vA);
}`;

interface Air {
  fx: number; fz: number; speed: number; kind: Kind; vents: { x: number; y: number; z: number }[]; still: boolean;
  /** how much of the dust still air would hold this air holds: moving air carries it off */
  holds: number;
}

/** what moves through the air: where, how fast, how wide and how tall */
interface Mover { x: number; y: number; z: number; vx: number; vz: number; r: number; h: number }

/** how fast a speck takes the air's velocity (per second: slow, so it keeps a push a while); a push's reach past a
 *  body's side; how much of a body's own speed it gives what it passes through, and how hard it shoves it aside */
const DRAG = 0.8, REACH = 0.45, CARRY = 5, SHOVE = 2.5;

export class Motes {
  readonly points: THREE.Points;
  private geo = new THREE.BufferGeometry();
  private pos = new Float32Array((N + G) * 3);
  private vel = new Float32Array((N + G) * 3);
  private col = new Float32Array((N + G) * 3);
  private lit = new Float32Array((N + G) * 3);
  private alpha = new Float32Array(N + G);
  /** how opaque each speck is on its way to being, so the air thins or thickens over a second rather than at once */
  private want = new Float32Array(N + G);
  private size = new Float32Array(N + G);
  /** each speck's own: its shade, size and whether it shows, and the room it is in (-1 in rock, -2 not yet asked) */
  private seed = new Float32Array(N + G);
  private room = new Int32Array(N + G).fill(-1);
  /** the gusts' life left */
  private life = new Float32Array(G);
  private air = new Map<number, Air>();
  /** for each door: seconds since it was last fully shut, or Infinity while it stays shut from the start */
  private shut: number[] = [];
  private wasOpen: boolean[] = [];
  private sim: Sim | null = null;
  private turn = 0;
  /** where your body was last frame, for how fast it moves */
  private you: { x: number; z: number } | null = null;
  private mat: THREE.ShaderMaterial;

  constructor(scene: THREE.Object3D, private L: Lighting, private onGust: (x: number, y: number, z: number, k: number) => void) {
    const attr = (a: Float32Array, n: number) => new THREE.BufferAttribute(a, n).setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('position', attr(this.pos, 3));
    this.geo.setAttribute('aCol', attr(this.col, 3));
    this.geo.setAttribute('aL', attr(this.lit, 3));
    this.geo.setAttribute('aA', attr(this.alpha, 1));
    this.geo.setAttribute('aS', attr(this.size, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { ...lightUniforms(), uFog: U.uFog, uExpo: U.uExpo, uPx: { value: 4 } },
      vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
    scene.add(this.points);
    for (let i = 0; i < N + G; i++) this.seed[i] = Math.random();
  }

  /** the power changed: the air is worked out again, and the specks take the new light (and thin or thicken to it) */
  setLighting(L: Lighting): void {
    this.L = L;
    this.air.clear();
    for (let i = 0; i < N; i++) if (this.room[i] >= 0) this.room[i] = -3;
  }

  /** pixels at one metre away for a speck nearly three centimetres across */
  resize(height: number, fov: number): void {
    this.mat.uniforms.uPx.value = (height / 2 / Math.tan((fov * Math.PI) / 360)) * 0.027;
  }

  private airOf(sim: Sim, R: RoomDef): Air {
    let a = this.air.get(R.id);
    if (a) return a;
    const kind = R.motes ?? 'dust', cave = !!R.cells;
    /* a cave breathes on its own, slowly, whatever the power; a fitted room's air moves only while its fans do */
    const pw = power(sim.game, R.circuit), speed = cave ? 0.05 : pw === 2 ? 0.22 : pw === 1 ? 0.06 : 0;
    const long = R.x1 - R.x0 >= R.z1 - R.z0, sign = (R.id * 2654435761) % 2 ? 1 : -1;
    /* where it goes: the room's ceiling grilles, and any loose vent panel in its walls */
    const vents: { x: number; y: number; z: number }[] = [];
    if (!cave) {
      for (const G of sim.world.def.vents ?? []) {
        if (G.x > R.x0 && G.x < R.x1 && G.z > R.z0 && G.z < R.z1 && G.y > R.y0 && G.y < R.y0 + R.ht + 0.5) vents.push(G);
      }
      for (const d of sim.doors) {
        const D = d.def;
        if (!D.vent) continue;
        const x = (D.x0 + D.x1) / 2, z = (D.z0 + D.z1) / 2;
        if (x > R.x0 - 1 && x < R.x1 + 1 && z > R.z0 - 1 && z < R.z1 + 1 && D.y0 < R.y0 + R.ht && D.y1 > R.y0) vents.push({ x, y: (D.y0 + D.y1) / 2, z });
      }
    }
    const holds = cave ? 0.7 : pw === 2 ? 0.25 : pw === 1 ? 0.55 : 1;
    a = { fx: long ? sign : 0, fz: long ? 0 : sign, speed, kind, vents, still: speed === 0, holds };
    this.air.set(R.id, a);
    return a;
  }

  /** the air's own velocity where speck i is: toward the nearest vent, or along the room, and its kind's lift */
  private airVel(A: Air, x: number, z: number): [number, number, number] {
    let fx = A.fx, fz = A.fz, up = 0;
    if (A.vents.length) {
      let best = Infinity;
      for (const v of A.vents) {
        const dx = v.x - x, dz = v.z - z, d = Math.hypot(dx, dz);
        if (d < best) { best = d; fx = dx / (d || 1); fz = dz / (d || 1); }
      }
      /* near a grille the air turns up into it */
      if (best < 2) { const k = 1 - best / 2; fx *= 1 - 0.6 * k; fz *= 1 - 0.6 * k; up = 0.8 * k; }
    }
    return [fx * A.speed, KIND[A.kind].lift * (A.still ? 1 : 0.4) + up * A.speed, fz * A.speed];
  }

  /** put speck i somewhere in the box about the eye, moving with the air there */
  private scatter(sim: Sim, i: number, cx: number, cy: number, cz: number): void {
    const o = i * 3;
    this.pos[o] = cx + rnd(-HX, HX); this.pos[o + 1] = cy + rnd(-HY, HY); this.pos[o + 2] = cz + rnd(-HZ, HZ);
    this.place(sim, i, true);
    const r = this.room[i];
    this.vel.set(r >= 0 ? this.airVel(this.airOf(sim, sim.world.rooms[r]), this.pos[o], this.pos[o + 2]) : [0, 0, 0], o);
  }

  /** which room speck i is in, and so its colour, light and how opaque it should be; `fresh`: it shows so at once */
  private place(sim: Sim, i: number, fresh = false): void {
    const x = this.pos[i * 3], y = this.pos[i * 3 + 1], z = this.pos[i * 3 + 2];
    const R = sim.world.roomAt(x, y, z);
    const gust = i >= N;
    if (!R) { this.room[i] = -1; if (!gust) this.alpha[i] = this.want[i] = 0; return; }
    this.room[i] = R.id;
    const A = this.airOf(sim, R), s = this.seed[i], l = this.L.atPoint(x, y, z);
    /* the room's own kind of speck, or ordinary dust among them */
    const own = KIND[A.kind], K = (s * 5.71) % 1 < own.share ? own : KIND.dust;
    /* pale flecks and dark grit: each its own shade of its kind's colour */
    const shade = 0.4 + 0.6 * ((s * 13.7) % 1);
    this.col[i * 3] = K.c[0] * shade; this.col[i * 3 + 1] = K.c[1] * shade; this.col[i * 3 + 2] = K.c[2] * shade;
    /* a spore glows a little of itself, so the green's dark is never quite empty */
    this.lit[i * 3] = l[0] + K.glow; this.lit[i * 3 + 1] = l[1] + K.glow * 1.6; this.lit[i * 3 + 2] = l[2] + K.glow * 0.6;
    this.size[i] = K.size * (0.6 + 0.8 * s * s);
    if (gust) return;
    /* how many show: the kind's share of still air, less as the air moves; each a little see-through, as dust is */
    this.want[i] = s < own.show * A.holds ? (0.45 + 0.55 * ((s * 7.31) % 1)) * (0.8 + 0.2 * ((s * 3.17) % 1)) : 0;
    if (fresh) this.alpha[i] = this.want[i];
  }

  /** you and the cast near you, and how fast each is going (you by the eye, which moves smoothly between steps) */
  private movers(sim: Sim, cx: number, cz: number, dt: number): Mover[] {
    const out: Mover[] = [], b = sim.player.body;
    if (this.you && dt > 0) {
      const vx = (cx - this.you.x) / dt, vz = (cz - this.you.z) / dt;
      if (Math.hypot(vx, vz) < 12) out.push({ x: cx, y: b.y, z: cz, vx, vz, r: 0.35, h: 1.8 }); // faster is a jump in place
    }
    this.you = { x: cx, z: cz };
    for (const m of sim.cast) {
      if (m.dead || Math.abs(m.x - cx) > HX + 1 || Math.abs(m.z - cz) > HZ + 1) continue;
      out.push({ x: m.x, y: m.y, z: m.z, vx: (m.x - m.px) / STEP, vz: (m.z - m.pz) / STEP, r: m.r, h: m.body?.h ?? 1 });
    }
    return out;
  }

  update(sim: Sim, cam: THREE.Vector3, dt: number): void {
    const P = this.pos, V = this.vel, cx = cam.x, cy = cam.y, cz = cam.z;
    if (sim !== this.sim) {
      this.sim = sim; this.air.clear(); this.you = null;
      this.shut = sim.doors.map(() => Infinity);
      this.wasOpen = sim.doors.map(d => d.t > 0.02);
      for (let i = 0; i < N; i++) this.scatter(sim, i, cx, cy, cz);
      this.life.fill(0);
    }

    /* doors: one shut a while that starts to open breathes out at you */
    sim.doors.forEach((d, k) => {
      const open = d.t > 0.02, D = d.def;
      if (!open) this.shut[k] += dt;
      if (open && !this.wasOpen[k] && this.shut[k] > 20 && !D.vent && !D.lift) {
        const x = (D.x0 + D.x1) / 2, z = (D.z0 + D.z1) / 2;
        if (Math.hypot(x - cx, z - cz) < 12) this.gust(sim, d.def, cx, cz, D.kind === 'heavy' || D.seal ? 1 : 0.6);
      }
      if (!open) { if (this.wasOpen[k]) this.shut[k] = 0; }
      this.wasOpen[k] = open;
    });

    const refresh = Math.ceil(N / 8);
    for (let n = 0; n < refresh; n++) { const i = (this.turn + n) % N; this.place(sim, i); }
    this.turn = (this.turn + refresh) % N;
    const M = this.movers(sim, cx, cz, dt), fade = Math.min(1, dt * 1.2), kick = Math.sqrt(dt);
    /* a gust's specks are finer, and the air slows them sooner */
    const ease = 1 - Math.exp(-dt * DRAG), easeGust = 1 - Math.exp(-dt * DRAG * 2);

    for (let i = 0; i < N + G; i++) {
      const o = i * 3, gust = i >= N;
      if (gust) {
        const g = i - N;
        if (this.life[g] <= 0) { this.alpha[i] = 0; continue; }
        this.life[g] -= dt;
        this.alpha[i] = Math.min(1, this.life[g] / 0.8) * (0.4 + 0.4 * this.seed[i]);
      } else {
        /* out of the box: back in at the far side, a new speck moving with the air there */
        let x = P[o], y = P[o + 1], z = P[o + 2], wrapped = false;
        if (x - cx > HX) { x -= 2 * HX; wrapped = true; } else if (cx - x > HX) { x += 2 * HX; wrapped = true; }
        if (y - cy > HY) { y -= 2 * HY; wrapped = true; } else if (cy - y > HY) { y += 2 * HY; wrapped = true; }
        if (z - cz > HZ) { z -= 2 * HZ; wrapped = true; } else if (cz - z > HZ) { z += 2 * HZ; wrapped = true; }
        P[o] = x; P[o + 1] = y; P[o + 2] = z;
        if (wrapped || this.room[i] === -2) this.place(sim, i, true);
        else if (this.room[i] === -3) this.place(sim, i);
        if (wrapped && this.room[i] >= 0) V.set(this.airVel(this.airOf(sim, sim.world.rooms[this.room[i]]), x, z), o);
        this.alpha[i] += (this.want[i] - this.alpha[i]) * fade;
      }
      const r = this.room[i];
      if (r < 0 && !gust) continue;
      /* toward the air's velocity, slowly, with a random nudge (still air barely stirs) */
      if (r >= 0) {
        const A = this.airOf(sim, sim.world.rooms[r]), a = this.airVel(A, P[o], P[o + 2]), stir = (A.still ? 0.012 : 0.035) * kick;
        const e = gust ? easeGust : ease;
        V[o] += (a[0] - V[o]) * e + (Math.random() - 0.5) * stir;
        V[o + 1] += (a[1] - V[o + 1]) * e + (Math.random() - 0.5) * stir * 0.6;
        V[o + 2] += (a[2] - V[o + 2]) * e + (Math.random() - 0.5) * stir;
      }
      /* what moves through it drags it along and shoves it aside, and it keeps that until the air takes it back */
      for (const m of M) {
        const dy = P[o + 1] - m.y;
        if (dy < -0.1 || dy > m.h + 0.1) continue;
        const dx = P[o] - m.x, dz = P[o + 2] - m.z, d = Math.hypot(dx, dz), reach = m.r + REACH;
        if (d >= reach) continue;
        const w = 1 - d / reach, sp = Math.hypot(m.vx, m.vz), pull = 1 - Math.exp(-dt * CARRY * w);
        V[o] += (m.vx - V[o]) * pull; V[o + 2] += (m.vz - V[o + 2]) * pull;
        const nx = d > 1e-3 ? dx / d : Math.random() - 0.5, nz = d > 1e-3 ? dz / d : Math.random() - 0.5;
        V[o] += nx * sp * SHOVE * w * dt; V[o + 2] += nz * sp * SHOVE * w * dt;
      }
      P[o] += V[o] * dt; P[o + 1] += V[o + 1] * dt; P[o + 2] += V[o + 2] * dt;
    }

    for (const k of ['position', 'aCol', 'aL', 'aA', 'aS']) this.geo.getAttribute(k).needsUpdate = true;
  }

  private gust(sim: Sim, D: { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number; alongX: boolean }, cx: number, cz: number, k: number): void {
    const x = (D.x0 + D.x1) / 2, z = (D.z0 + D.z1) / 2, y = D.y0 + 1;
    /* toward your side of it */
    const nx = D.alongX ? 0 : Math.sign(cx - x) || 1, nz = D.alongX ? Math.sign(cz - z) || 1 : 0;
    const n = Math.round(G * 0.5 * k);
    for (let g = 0, made = 0; g < G && made < n; g++) {
      if (this.life[g] > 0) continue;
      made++;
      const i = N + g, o = i * 3, u = Math.random();
      this.pos[o] = D.alongX ? D.x0 + (D.x1 - D.x0) * u : x - nx * 0.4;
      this.pos[o + 1] = rnd(D.y0 + 0.1, Math.min(D.y1, D.y0 + 2.2));
      this.pos[o + 2] = D.alongX ? z - nz * 0.4 : D.z0 + (D.z1 - D.z0) * u;
      const sp = rnd(1.2, 2.4) * (0.6 + 0.4 * k);
      this.vel[o] = nx * sp + rnd(-0.4, 0.4); this.vel[o + 1] = rnd(-0.15, 0.3); this.vel[o + 2] = nz * sp + rnd(-0.4, 0.4);
      this.life[g] = rnd(1.2, 2.4);
      this.place(sim, i);
      /* finer than what hangs in the air: what a shut room has ground down and holds */
      this.size[i] *= 0.7;
      if (this.room[i] < 0) {
        /* the far side is the door's own slab: take the dust's colour and the light where you are */
        this.col.set(KIND.dust.c, o); this.lit.set([0.05, 0.05, 0.05], o); this.size[i] = 0.7;
      }
    }
    this.onGust(x, y, z, k);
  }
}
