import * as THREE from 'three';
import type { Colour } from '../../core/math';
import type { SignDef } from '../../content/types';
import type { Mat } from '../../content/materials';
import type { World } from '../../world/world';
import type { Lighting } from '../../world/light';
import { LIGHTS, U, lightUniforms } from './shader';

/* The signs over the doors. Not lit from within, as they were (a black plate shone in a dark room): lit as any
   surface is, by the room's light where they hang and the lights you carry. Their pale parts are retroreflective, as
   real room signs often are, so under your flashlight the letters flare and the plate stays dark; you read a dark
   corridor's signs by your beam.
   Each takes its look from the wall it hangs on, which says what part of the station it is in: bronze letters straight
   on the family's limestone; a small dark plate with a bar of the room's colour on block, plaster and board; a white
   plate with a coloured band where it is tiled; and on bare concrete and shotcrete, the name stencilled in paint, worn. */

type Style = 'plate' | 'bronze' | 'clinic' | 'stencil';

/** how each style is made: its height on the wall (m), how much its pale parts send your beam back, and whether only its
 *  letters are there (no plate) */
const STYLE: Record<Style, { h: number; retro: number; cut: boolean }> = {
  plate: { h: 0.24, retro: 2.2, cut: false },
  clinic: { h: 0.26, retro: 1.2, cut: false },
  /* metal letters catch a beam held square to them, less than reflective film */
  bronze: { h: 0.26, retro: 0.9, cut: true },
  stencil: { h: 0.26, retro: 0, cut: true },
};
/** the canvas's pixels a metre: sharp at a few metres, and mipmapped past that */
const PX = 420;

/** which style a wall of `m` takes */
function styleOf(m: Mat | undefined): Style {
  if (m === 'stone') return 'bronze';
  if (m === 'shot' || m === 'concrete' || m === 'rock') return 'stencil';
  if (m === 'glazed') return 'clinic';
  return 'plate';
}

const css = (c: Colour) => `rgb(${c.map(v => Math.round(Math.min(1, v) * 255)).join(',')})`;
const SANS = '"Barlow Condensed","Arial Narrow",Arial,sans-serif', SERIF = 'Newsreader,Georgia,serif';

/** draw a sign's face: its colour in rgb, and (for a style with no plate) where it is in alpha. Returns its width in
 *  metres */
function draw(c: HTMLCanvasElement, text: string, st: Style, band: Colour, seed: number): number {
  const S = STYLE[st], H = Math.round(S.h * PX), x = c.getContext('2d')!;
  const t = text.toUpperCase();
  const font = st === 'bronze' ? `500 ${Math.round(H * 0.72)}px ${SERIF}` : st === 'stencil' ? `600 ${Math.round(H * 0.72)}px ${SANS}`
    : `600 ${Math.round(H * 0.56)}px ${SANS}`;
  x.font = font;
  if (st === 'stencil') x.letterSpacing = `${Math.round(H * 0.08)}px`;
  if (st === 'bronze') x.letterSpacing = `${Math.round(H * 0.06)}px`;
  const pad = st === 'plate' ? H * 0.75 : st === 'clinic' ? H * 0.55 : H * 0.1, tw = Math.ceil(x.measureText(t).width);
  const W = Math.min(Math.round(1.9 * PX), Math.ceil(tw + 2 * pad));
  c.width = W; c.height = H;
  x.clearRect(0, 0, W, H);
  x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
  if (st === 'stencil') x.letterSpacing = `${Math.round(H * 0.08)}px`;
  if (st === 'bronze') x.letterSpacing = `${Math.round(H * 0.06)}px`;
  const mid = W / 2 + (st === 'plate' ? H * 0.12 : 0), max = W - 2 * pad;
  if (st === 'plate') {
    x.fillStyle = css([0.1, 0.11, 0.12]); x.fillRect(0, 0, W, H);
    x.fillStyle = css(band); x.fillRect(H * 0.18, H * 0.2, H * 0.12, H * 0.6);
    x.fillStyle = css([0.86, 0.84, 0.78]); x.fillText(t, mid, H * 0.53, max);
  } else if (st === 'clinic') {
    x.fillStyle = css([0.82, 0.84, 0.82]); x.fillRect(0, 0, W, H);
    x.fillStyle = css(band); x.fillRect(0, H * 0.8, W, H * 0.2);
    x.fillStyle = css([0.12, 0.13, 0.14]); x.fillText(t, mid, H * 0.42, max);
  } else if (st === 'bronze') {
    /* cast bronze, gone dark: darker than the stone it stands on, so it reads in the room's light */
    x.fillStyle = css([0.24, 0.16, 0.08]); x.fillText(t, mid, H * 0.55, max);
  } else {
    x.fillStyle = css([0.74, 0.68, 0.46]); x.fillText(t, mid, H * 0.54, max);
    /* worn: paint gone in flecks, more of it toward the foot of the letters */
    let s = seed * 9301 + 49297;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < W * H / 90; i++) {
      const px = rnd() * W, py = rnd() * H, r = 0.5 + rnd() * 1.8 * (0.5 + py / H);
      x.globalAlpha = 0.4 + rnd() * 0.6;
      x.beginPath(); x.arc(px, py, r, 0, 6.283); x.fill();
    }
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  }
  return W / PX;
}

const VS = /* glsl */ `
varying vec2 vUv; varying vec3 vW;
void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const FS = /* glsl */ `
uniform sampler2D uMap; uniform vec3 uL; uniform vec3 uN; uniform float uRetro; uniform float uCut;
uniform float uFog; uniform float uBright;
varying vec2 vUv; varying vec3 vW;
${LIGHTS}
void main(){
  vec4 t = texture2D(uMap, vUv);
  if (uCut > 0.5 && t.a < 0.5) discard;
  vec3 base = t.rgb / max(t.a, 0.001);
  vec3 tc = cameraPosition - vW; float d = length(tc);
  float facing = 0.35 + 0.65 * max(dot(uN, tc / max(d, 0.001)), 0.0);
  vec3 c = base * (uL + carried(vW, uN, facing) + lying(vW, uN) + vec3(uBright));
  /* what is pale on it sends your beam straight back at you */
  c += base * uRetro * dot(base, vec3(0.3, 0.59, 0.11)) * held(vW, uN, 1.0);
  c *= exp(-d * uFog);
  gl_FragColor = vec4(c, 1.0);
}`;

/** a face drawn on a wall, lit as a sign is: facing (nx, nz), sending `retro` of your beam back off its pale parts,
 *  and only where it is drawn if `cut` (the exhibit's boards, render/exhibit.ts, take one too) */
export function faceMaterial(nx: number, nz: number, retro: number, cut: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS,
    uniforms: {
      ...lightUniforms(), uFog: U.uFog, uBright: U.uBright,
      uMap: { value: null as THREE.Texture | null }, uL: { value: new THREE.Vector3() }, uN: { value: new THREE.Vector3(nx, 0, nz) },
      uRetro: { value: retro }, uCut: { value: cut ? 1 : 0 },
    },
  });
}

/** a drawing as a texture: a canvas drawn again at another width cannot go into the old one's storage */
export function faceTexture(c: HTMLCanvasElement): THREE.Texture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4; t.premultiplyAlpha = true;
  return t;
}

interface Hung { mat: THREE.ShaderMaterial; at: [number, number, number]; draw: () => void }

export class SignView {
  private hung: Hung[] = [];

  constructor(scene: THREE.Object3D, w: World, L: Lighting) {
    w.def.signs.forEach((s, k) => this.hang(scene, w, s, k));
    /* the face is drawn before the page's fonts may have come; draw it again once they have */
    document.fonts?.ready.then(() => { for (const h of this.hung) h.draw(); });
    this.setLighting(L);
  }

  private hang(scene: THREE.Object3D, w: World, s: SignDef, k: number): void {
    /* the room it is read from, half a metre out from the wall it hangs on */
    const nx = Math.sin(s.yaw), nz = Math.cos(s.yaw);
    const R = w.roomAt(s.x + nx * 0.5, s.y - 1, s.z + nz * 0.5), st = styleOf(R?.mat.wall), S = STYLE[st];
    const mat = faceMaterial(nx, nz, S.retro, S.cut);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, S.h), mat);
    /* a plate stands off the wall a little; paint and letters are on it */
    const off = S.cut ? -0.02 : 0;
    mesh.position.set(s.x + nx * off, s.y, s.z + nz * off);
    mesh.rotation.y = s.yaw;
    const band: Colour = R ? R.stripe : [0.5, 0.5, 0.5];
    const redraw = () => {
      const c = document.createElement('canvas');
      mesh.scale.x = draw(c, s.text, st, band, k + 1);
      (mat.uniforms.uMap.value as THREE.Texture | null)?.dispose();
      mat.uniforms.uMap.value = faceTexture(c);
    };
    redraw();
    scene.add(mesh);
    this.hung.push({ mat, at: [s.x + nx * 0.3, s.y - 0.4, s.z + nz * 0.3], draw: redraw });
  }

  /** the power changed: each sign takes the light where it hangs */
  setLighting(L: Lighting): void {
    for (const h of this.hung) (h.mat.uniforms.uL.value as THREE.Vector3).set(...L.atPoint(...h.at));
  }
}
