import * as THREE from 'three';
import { BR } from '../../world/lightField';
import type { Lighting } from '../../world/light';
import { LIGHT_RANGE, U } from './shader';

/* The level's light field on the card, for the shader to read point by point (render/shader.ts). Each brick of the field
   is laid out as 9³ texels, its own 8³ points and the first of the bricks past its high faces, so the 2³ points around
   anywhere are always in one brick. Texels: the light (square-rooted, over LIGHT_RANGE, so the dark keeps its steps
   fine), and in alpha the point's flags (open, joined along x, y, z) under how much of its light flickers (in 15ths).
   A second texture laid out the same holds which way each point's light comes from (Lighting.directions, over how
   bright it is there, so each part is -1 to 1, as a byte from 0 to 255). An index over the level's bricks says where
   each one is. */

const B9 = BR + 1, B93 = B9 * B9 * B9;

export class LightVolume {
  private atlas: THREE.DataTexture;
  private dirAtlas: THREE.DataTexture;
  private index: THREE.Data3DTexture;
  private data: Uint8Array;
  private dirData: Uint8Array;
  private origin = new THREE.Vector3();
  private size = new THREE.Vector3();
  readonly width: number;

  private L: Lighting | null;

  constructor(L: Lighting) {
    const F = L.field, S = F.slots;
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (let s = 0; s < S; s++) {
      const x = F.bpos[s * 3], y = F.bpos[s * 3 + 1], z = F.bpos[s * 3 + 2];
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); z0 = Math.min(z0, z); x1 = Math.max(x1, x); y1 = Math.max(y1, y); z1 = Math.max(z1, z);
    }
    if (!S) x0 = y0 = z0 = x1 = y1 = z1 = 0;
    const nx = x1 - x0 + 1, ny = y1 - y0 + 1, nz = z1 - z0 + 1, idx = new Float32Array(nx * ny * nz).fill(-1);
    for (let s = 0; s < S; s++) idx[((F.bpos[s * 3 + 2] - z0) * ny + (F.bpos[s * 3 + 1] - y0)) * nx + (F.bpos[s * 3] - x0)] = s;
    this.index = new THREE.Data3DTexture(idx, nx, ny, nz);
    this.index.format = THREE.RedFormat;
    this.index.type = THREE.FloatType;
    this.index.minFilter = this.index.magFilter = THREE.NearestFilter;
    this.index.unpackAlignment = 1;
    this.index.needsUpdate = true;
    this.origin.set(x0, y0, z0);
    this.size.set(nx, ny, nz);

    const texels = Math.max(1, S * B93);
    this.width = texels <= 2048 * 2048 ? 2048 : 4096;
    const h = Math.ceil(texels / this.width);
    this.data = new Uint8Array(this.width * h * 4);
    this.dirData = new Uint8Array(this.width * h * 4);
    const tex = (d: Uint8Array) => {
      const t = new THREE.DataTexture(d, this.width, h, THREE.RGBAFormat, THREE.UnsignedByteType);
      t.minFilter = t.magFilter = THREE.NearestFilter;
      t.generateMipmaps = false;
      return t;
    };
    this.atlas = tex(this.data);
    this.dirAtlas = tex(this.dirData);
    this.L = null;
    this.sync(L);
  }

  /** light it by L: all of it if L is new to it, or only the bricks whose light has changed since */
  sync(L: Lighting): void {
    const F = L.field;
    if (L !== this.L) {
      this.L = L;
      L.changed();
      for (let s = 0; s < F.slots; s++) this.brick(s);
      for (const t of [this.atlas, this.dirAtlas]) { t.clearUpdateRanges(); t.needsUpdate = true; }
      return;
    }
    const changed = L.changed();
    if (!changed.length) return;
    /* a brick's texels reach into the bricks past its high faces, so the bricks before a changed one change too */
    const todo = new Set<number>();
    for (const s of changed)
      for (let oz = -1; oz <= 0; oz++) for (let oy = -1; oy <= 0; oy++) for (let ox = -1; ox <= 0; ox++) {
        const t = F.nb[s * 27 + (oz + 1) * 9 + (oy + 1) * 3 + ox + 1];
        if (t >= 0) todo.add(t);
      }
    for (const s of todo) {
      this.brick(s);
      /* sent a row at a time: an update range may not run past the end of one */
      for (let a = s * B93, end = a + B93; a < end; ) {
        const b = Math.min(end, (Math.floor(a / this.width) + 1) * this.width);
        this.atlas.addUpdateRange(a * 4, (b - a) * 4);
        this.dirAtlas.addUpdateRange(a * 4, (b - a) * 4);
        a = b;
      }
    }
    this.atlas.needsUpdate = true;
    this.dirAtlas.needsUpdate = true;
  }

  private brick(s: number): void {
    const L = this.L!, F = L.field, col = L.colours, fcol = L.flickers, dir = L.directions, d = this.data, e = this.dirData;
    let t = s * B93 * 4;
    for (let z = 0; z < B9; z++)
      for (let y = 0; y < B9; y++)
        for (let x = 0; x < B9; x++, t += 4) {
          const P = F.local(s, x, y, z), f = P >= 0 ? F.flags[P] : 0;
          if (!f) { d[t] = d[t + 1] = d[t + 2] = d[t + 3] = 0; e[t] = e[t + 1] = e[t + 2] = 128; e[t + 3] = 0; continue; }
          const p = F.pid[P] * 3, top = Math.max(col[p], col[p + 1], col[p + 2]);
          const fl = top > 1e-4 ? Math.min(15, Math.round((15 * Math.max(fcol[p], fcol[p + 1], fcol[p + 2])) / top)) : 0;
          d[t] = enc(col[p]); d[t + 1] = enc(col[p + 1]); d[t + 2] = enc(col[p + 2]); d[t + 3] = (f & 15) | (fl << 4);
          const l = 0.3 * col[p] + 0.59 * col[p + 1] + 0.11 * col[p + 2], k = l > 1e-5 ? 1 / l : 0;
          e[t] = way(dir[p] * k); e[t + 1] = way(dir[p + 1] * k); e[t + 2] = way(dir[p + 2] * k); e[t + 3] = 0;
        }
  }

  /** draw by this volume */
  bind(): void {
    U.uLA.value = this.atlas;
    U.uLD.value = this.dirAtlas;
    U.uLI.value = this.index;
    U.uLO.value.copy(this.origin);
    U.uLN.value.copy(this.size);
    U.uLW.value = this.width;
  }

  /** let the card have its memory back */
  dispose(): void {
    this.atlas.dispose();
    this.dirAtlas.dispose();
    this.index.dispose();
  }
}

const enc = (v: number) => Math.round(Math.sqrt(Math.min(Math.max(v / LIGHT_RANGE, 0), 1)) * 255);
/** a part of a direction, -1 to 1, as a byte */
const way = (v: number) => Math.round((Math.min(Math.max(v, -1), 1) * 0.5 + 0.5) * 255);
