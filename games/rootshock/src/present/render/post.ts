import * as THREE from 'three';
import { DEPTH_FIRST, U, depthFirstMaterial } from './shader';
import { dbg } from '../debug';

/* The picture, made from the scene once it is drawn. The scene is drawn into a target that holds light as it is, past
   white where it is brighter than that (a tube, the beam's hot centre close up), not clipped to what a screen can show;
   every shader that draws into it writes its light and nothing more. One pass then makes the picture from it: the eye
   (uExpo), the glow, the tone curve, the grain. So the screen's look is made in one place, the same for everything.

   The glow is what a bright light does in an eye: what is brighter than white (GLOW.from, softly) is taken down by halves
   to a small image and brought back up, each step wider, and laid over the picture, so a tube or a lamp (drawn brighter
   than white, EMIT in shader.ts) has a halo and the beam's centre on a wall close by blooms. The first step down weighs
   each patch by how bright it is (Karis's average), so one bright pixel cannot glitter from frame to frame; the steps
   are the 13-tap down and 3×3 tent up of Jimenez's (Call of Duty: Advanced Warfare, 2014).

   The tone curve: under TONE.knee everything is as it was (LIFT: the mid-tones lifted, black left black); over it the
   light is rolled off toward white, keeping its colour, instead of clipped, so the beam's hot centre has a shape and not
   a flat edge. Very bright light whitens (TONE.white), as it does in the eye.

   Before the scene is lit, the depth of the level's pieces is drawn into the target alone (DEPTH_FIRST), so the light
   pass shades only the surface in front at each pixel: drawn as they come, the walls of the rooms behind a wall and the
   floor under a stair were lit and then covered, 1.1 to 3.5 times over at a pixel in the upper station.

   The dark is grained here, most where it is darkest, over everything drawn. A card that cannot draw into a target that
   holds more than white draws into one that cannot: the game still plays, but with nothing over white the glow and the
   shoulder have nothing to work on, and the dark, stored before the eye opens on it, comes out in coarser steps. */

/** the screen's tone curve: mid-tones lifted, black left black, so a lit room reads as lit on a screen */
export const LIFT = /* glsl */ `vec3 lift(vec3 c){ return pow(max(c, vec3(0.0)), vec3(0.78)); }`;

/** the tone curve's shoulder: as LIFT under `knee` (by the brightest channel), and over it rolled off toward
 *  knee + room; `white`, how far toward white light goes by the time it is `whiteAt` */
export const TONE = { knee: 0.72, room: 0.42, white: 0.55, whiteAt: 7 };
/** the glow: what is over `from` (after the eye), softened over `soft` either side; how much of it is laid over the
 *  picture; and how many steps down it goes (each half the last, from half the screen) */
export const GLOW = { from: 1, soft: 0.45, gain: 1.5, steps: 6 };

const f = (x: number) => x.toFixed(4);

const VS = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/* a step down: 13 taps over the source (uPx its texel), the first weighing each 2×2 patch by how bright it is and taking
   what is over GLOW.from after the eye */
const DOWN = /* glsl */ `
uniform sampler2D uSrc; uniform vec2 uPx; uniform float uExpo;
varying vec2 vUv;
vec3 s(float x, float y){ return texture2D(uSrc, vUv + vec2(x, y) * uPx).rgb; }
float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
#ifdef FIRST
vec3 w(vec3 a, vec3 b, vec3 c, vec3 d){ vec3 m = (a + b + c + d) * 0.25; return m / (1.0 + luma(m)); }
vec3 kw(vec3 a, vec3 b, vec3 c, vec3 d){ vec3 m = (a + b + c + d) * 0.25; return vec3(1.0 / (1.0 + luma(m))); }
#endif
void main(){
  vec3 a = s(-2.0, 2.0), b = s(0.0, 2.0), c = s(2.0, 2.0);
  vec3 d = s(-2.0, 0.0), e = s(0.0, 0.0), f = s(2.0, 0.0);
  vec3 g = s(-2.0, -2.0), h = s(0.0, -2.0), i = s(2.0, -2.0);
  vec3 j = s(-1.0, 1.0), k = s(1.0, 1.0), l = s(-1.0, -1.0), m = s(1.0, -1.0);
#ifdef FIRST
  a *= uExpo; b *= uExpo; c *= uExpo; d *= uExpo; e *= uExpo; f *= uExpo; g *= uExpo; h *= uExpo; i *= uExpo;
  j *= uExpo; k *= uExpo; l *= uExpo; m *= uExpo;
  vec3 sum = w(j, k, l, m) * 0.5 + (w(a, b, d, e) + w(b, c, e, f) + w(d, e, g, h) + w(e, f, h, i)) * 0.125;
  vec3 wt = kw(j, k, l, m) * 0.5 + (kw(a, b, d, e) + kw(b, c, e, f) + kw(d, e, g, h) + kw(e, f, h, i)) * 0.125;
  vec3 o = sum / wt;
  /* what is over the threshold, softly */
  float br = max(o.r, max(o.g, o.b)), sk = clamp(br - ${f(GLOW.from - GLOW.soft)}, 0.0, ${f(2 * GLOW.soft)});
  sk = sk * sk / ${f(4 * GLOW.soft)};
  o *= max(sk, br - ${f(GLOW.from)}) / max(br, 1e-4);
#else
  vec3 o = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
#endif
  gl_FragColor = vec4(o, 1.0);
}`;

/* a step up: a 3×3 tent over the smaller image, added to the larger */
const UP = /* glsl */ `
uniform sampler2D uSrc; uniform vec2 uPx;
varying vec2 vUv;
vec3 s(float x, float y){ return texture2D(uSrc, vUv + vec2(x, y) * uPx).rgb; }
void main(){
  vec3 o = (s(-1.0, 1.0) + s(1.0, 1.0) + s(-1.0, -1.0) + s(1.0, -1.0)) + 2.0 * (s(0.0, 1.0) + s(-1.0, 0.0) + s(1.0, 0.0) + s(0.0, -1.0)) + 4.0 * s(0.0, 0.0);
  gl_FragColor = vec4(o / 16.0, 1.0);
}`;

/* the picture: the eye, the glow, the tone curve, the grain */
const FINAL = /* glsl */ `
uniform sampler2D uScene; uniform sampler2D uGlow; uniform float uExpo; uniform float uGlowK; uniform float uTime;
varying vec2 vUv;
${LIFT}
vec3 tone(vec3 c){
  c = max(c, vec3(0.0));
  float m = max(c.r, max(c.g, c.b));
  if (m <= ${f(TONE.knee)}) return lift(c);
  float t = m - ${f(TONE.knee)}, r = ${f(TONE.knee)} + t / (1.0 + t / ${f(TONE.room)});
  c = mix(c, vec3(m), ${f(TONE.white)} * smoothstep(1.0, ${f(TONE.whiteAt)}, m));
  return lift(c * (r / m));
}
void main(){
  vec3 c = tone(texture2D(uScene, vUv).rgb * uExpo + texture2D(uGlow, vUv).rgb * uGlowK);
  /* a hash with no sin in it (a sin hash shows patterns on some GPUs), moved every frame */
  vec3 h3 = fract(vec3(gl_FragCoord.xyx + floor(fract(uTime * 7.13) * 977.0)) * 0.1031);
  h3 += dot(h3, h3.yzx + 33.33);
  float gr = fract((h3.x + h3.y) * h3.z) - 0.5;
#ifndef DBG_NOGRAIN
  c += gr * 0.022 * (1.0 - smoothstep(0.0, 0.35, dot(c, vec3(0.3, 0.59, 0.11))));
#endif
  gl_FragColor = vec4(c, 1.0);
}`;

const pass = (fs: string, uniforms: Record<string, THREE.IUniform>, o: THREE.ShaderMaterialParameters = {}) =>
  new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false, ...o });

export class Post {
  /** where the scene is drawn: light as it is, smoothed at its edges (4 samples a pixel) */
  private scene: THREE.WebGLRenderTarget;
  /** the glow's steps, each half the last */
  private steps: THREE.WebGLRenderTarget[] = [];
  private type: THREE.TextureDataType;
  private quad: THREE.Mesh;
  private stage = new THREE.Scene();
  private cam = new THREE.Camera();
  private first: THREE.ShaderMaterial;
  private down: THREE.ShaderMaterial;
  private up: THREE.ShaderMaterial;
  private final: THREE.ShaderMaterial;
  private size = new THREE.Vector2();

  constructor(private renderer: THREE.WebGLRenderer) {
    const ext = renderer.extensions;
    this.type = ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float') ? THREE.HalfFloatType : THREE.UnsignedByteType;
    this.scene = new THREE.WebGLRenderTarget(1, 1, { type: this.type, samples: dbg('nomsaa') ? 0 : 4, depthBuffer: true });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    const src = () => ({ uSrc: { value: null as THREE.Texture | null }, uPx: { value: new THREE.Vector2() } });
    this.first = pass(DOWN, { ...src(), uExpo: U.uExpo }, { defines: { FIRST: '' } });
    this.down = pass(DOWN, { ...src(), uExpo: U.uExpo });
    this.up = pass(UP, src(), { blending: THREE.AdditiveBlending, transparent: true });
    this.final = pass(FINAL, { uScene: { value: this.scene.texture }, uGlow: { value: null }, uExpo: U.uExpo, uGlowK: { value: GLOW.gain / GLOW.steps }, uTime: U.uTime },
      { defines: dbg('nograin') ? { DBG_NOGRAIN: '' } : {} });
    this.quad = new THREE.Mesh(geo, this.final);
    this.quad.frustumCulled = false;
    this.stage.add(this.quad);
  }

  /** made the size of what the renderer draws */
  resize(): void {
    const s = this.renderer.getDrawingBufferSize(this.size), w = Math.max(1, s.x), h = Math.max(1, s.y);
    this.scene.setSize(w, h);
    for (const t of this.steps) t.dispose();
    this.steps = [];
    for (let k = 1; k <= GLOW.steps; k++) {
      const sw = Math.max(1, Math.round(w / 2 ** k)), sh = Math.max(1, Math.round(h / 2 ** k));
      const t = new THREE.WebGLRenderTarget(sw, sh, { type: this.type, depthBuffer: false });
      t.texture.minFilter = t.texture.magFilter = THREE.LinearFilter;
      t.texture.generateMipmaps = false;
      this.steps.push(t);
      if (sw <= 2 || sh <= 2) break;
    }
    this.final.uniforms.uGlow.value = this.steps[0].texture;
    this.final.uniforms.uGlowK.value = dbg('noglow') ? 0 : GLOW.gain / this.steps.length;
  }

  private draw(mat: THREE.ShaderMaterial, to: THREE.WebGLRenderTarget | null, src?: THREE.WebGLRenderTarget): void {
    if (src) {
      mat.uniforms.uSrc.value = src.texture;
      mat.uniforms.uPx.value.set(1 / src.width, 1 / src.height);
    }
    this.quad.material = mat;
    this.renderer.setRenderTarget(to);
    this.renderer.render(this.stage, this.cam);
  }

  private depthFirst = depthFirstMaterial();

  /** draw the scene, and the picture from it */
  render(scene: THREE.Scene, camera: THREE.Camera): void {
    const r = this.renderer, was = r.autoClear, layers = camera.layers.mask, over = scene.overrideMaterial;
    r.setRenderTarget(this.scene);
    if (dbg('noprepass')) r.clear();
    else {
      camera.layers.set(DEPTH_FIRST);
      scene.overrideMaterial = this.depthFirst;
      r.render(scene, camera);
      scene.overrideMaterial = over;
      camera.layers.mask = layers;
    }
    r.autoClear = false;
    r.render(scene, camera);
    const S = this.steps;
    this.draw(this.first, S[0], this.scene);
    for (let k = 1; k < S.length; k++) this.draw(this.down, S[k], S[k - 1]);
    for (let k = S.length - 1; k > 0; k--) this.draw(this.up, S[k - 1], S[k]);
    r.autoClear = was;
    this.draw(this.final, null);
  }
}
