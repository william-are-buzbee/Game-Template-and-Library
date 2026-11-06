import * as THREE from 'three';
import { BR, LCELL, LOFF } from '../../world/lightField';
import { BOUNCE, FLASH, LANTERN, POOL } from '../../world/light';
import { MATS, MAT_ORDER, type Mat, type Pattern } from '../../content/materials';
import { dbgDefines } from '../debug';

/* One shader for everything, carried over from the first engine.
   Light = the level's light (read point by point from its light field for the level itself, per object for things that
   move, per vertex for glass) + the lights you carry + the lights lying about, flat-shaded from screen-space derivatives.
   No ambient floor: unlit is black. A colour channel above 1.5 is emissive. A light fitting (a tube, a lamp) is lit by
   its room's light many times over (its `glow`), so it goes out with the room; it and anything emissive that is bright
   are drawn brighter than white (EMIT), so they glow in the picture (post.ts).
   Every light that is not the level's is drawn by LIGHTS below, in every shader that draws into the scene (motes,
   prints and drips too), from the numbers in world/light.ts, so a light is the same light wherever it falls and falls
   once. The flashlight is a reflector's beam: a hot centre, a faint bright ring at its rim, a wide dim spill; in your
   hand it shines from your hand (uFlashPos, your left, a little below the eye), aimed at what you look at, with a
   shadow map of its own (HELD, beams.ts), so what stands in it throws a shadow you can see, sliding as you sweep the
   beam; and what it lights close by throws some of it back around you (uBounce, measured by one ray a frame in
   camera.ts). Put down still on, it is the same beam from its lens, with a shadow map of its own, and what it throws
   back is in the level's light.
   The level's light (world/lightField.ts, put on the card by lightVolume.ts) is blended from the 2³ points around a
   pixel, a little off the surface into the open, taking only those on its open side that open space joins to the
   nearest: so light falls off smoothly across a room and through a doorway, and none comes through a wall or a slab.
   The part of it from tubes that stutter dims with them (uFlick), wherever it has reached. With it comes which way the
   light comes from there (uLD: how much of it from one way, and which), blended the same way, so a surface takes it by
   how it faces it (DIR): the wall facing a lamp or a lit doorway more than the one side on to it, a floor under
   fittings more than the ceiling beside them, and a bump catches it on the side it comes from. What takes a highlight
   (gloss) takes one from that light too, a soft sheen, so a polished floor shows a streak toward a lamp. Light that
   comes from every way (a room's fill) is taken as before.
   Your body stands in the way of the fittings over you (selfShade): a few capsules (selfView.ts) against the nearest
   fittings of the room you are in, each taking back its share of the light where it falls, soft-edged, wider and
   fainter the further it falls from you.
   What every shader here writes is light as it is, brighter than white where it is: the eye (uExpo: wide in the dark,
   narrowed in light; main.ts), the glow, the tone curve and the grain are the picture's, made once from it (post.ts).

   What a surface is made of (content/materials.ts, by aMat) is drawn on it, from where it is: the level's in the
   world, so a pattern runs on across faces, its joints laid from its room's corner (aRoomO), a moving thing's in its
   own frame, so a pushed crate's boards go with it.
   No textures but one of noise, made here. Each pattern gives a shade, a height and how glossy each part is (mortar is
   not, the block's paint is): the shade is the colour's, the height tips the surface's facing (bump, from how it
   changes across the screen), and the gloss is the carried lights' highlight. The beam, its facing and its highlight
   are reckoned from your hand, a little below and to the left of the eye (uFlashPos), so the relief of what is close is
   raked by it. Each detail fades to its average where a pixel is too wide for it (keep: far off, or seen at a slant),
   and the fine detail with distance, where it would only shimmer. The level's walls also show wear: grime at their
   foot, water run down from the ceiling in places.
   All of it is surface detail, the player's to turn off (uDetail, setDetail): off, every surface is its flat colour
   and the beam's facing is reckoned from the eye, as it was before materials were drawn. */

const PATTERNS: Pattern[] = ['none', 'cast', 'block', 'plaster', 'tiles', 'glazed', 'flags', 'plate', 'mesh', 'rock', 'boards',
  'shot', 'epoxy', 'vinyl', 'carpet', 'terrazzo', 'stone', 'flake', 'polished'];
/** how many materials there are, with "none" at 0 */
const NM = MAT_ORDER.length + 1;
const MAT_IDS = new Map<Mat, number>(MAT_ORDER.map((m, k) => [m, k + 1]));
/** a material's number for the shader (aMat): 0 for a thing that says nothing of what it is */
export const matId = (m?: Mat): number => (m ? MAT_IDS.get(m)! : 0);
const P = (p: Pattern) => PATTERNS.indexOf(p);
const f3 = (x: number) => x.toFixed(4);
const v3 = (c: readonly number[]) => `vec3(${c.map(f3).join(', ')})`;
/** the chips set in a matrix (chip() in the shader), measured there by sampling it at 400,000 points: the share of a
 *  surface they cover, and of that, the share whose kind is under each number. What a surface fades to where they are
 *  too fine to draw */
const CHIP_COVER = 0.2345, CHIP_KIND: Record<number, number> = { 0.35: 0.0772, 0.45: 0.1023, 0.55: 0.1275, 0.8: 0.1901, 0.9: 0.2127 };
/** terrazzo's chips of a size, faded: how much is chips, and how much each kind (dark, pale, rust) */
const TERRAZZO = `vec4(${f3(CHIP_COVER)}, ${f3(CHIP_KIND[0.35])}, ${f3(CHIP_KIND[0.8] - CHIP_KIND[0.35])}, ${f3(CHIP_KIND[0.9] - CHIP_KIND[0.8])})`;

/** every material's look, by number, written into the shader (a table sent as a uniform was sent, and checked, for every
 *  draw): (gloss, tightness, metal, bump) and (pattern, wear, salt) */
const look = (f: (L: (typeof MATS)[Mat]['look']) => number[]) =>
  `vec4[${NM}](vec4(0.0), ${MAT_ORDER.map(m => `vec4(${f(MATS[m].look).map(x => x.toFixed(4)).join(', ')})`).join(', ')})`;
const LOOK_A = look(L => [L.gloss, L.tight, L.metal, L.bump]), LOOK_B = look(L => [P(L.pattern), L.wear, L.salt, 0]);

/** how much brighter than white a light is drawn, so it glows: a fitting lit by its room's light (`glow` over `cut`: a
 *  tube's 3, a painted sky's 1.5) `fitting` times over what it was; something emissive, `most` times its colour for
 *  the brightest, by its brightest channel from `dim` up to `bright`, and a dimmer one (a screen, a pilot light) as it
 *  was. The light in the room is the light field's: this is only how the light itself looks. `cut` lies between the
 *  takes of the fittings and of the rest (1 and under), clear of both, and is tested on a vertex's own take: across a
 *  face, a take of 1 can come out a hair over 1 (an NVIDIA card's, through ANGLE, did), and tested there, pixel by
 *  pixel, it lit a floor in streaks of a fitting's brightness */
export const EMIT = { fitting: 2.4, cut: 1.25, most: 3.2, dim: 0.72, bright: 0.92 };

const VS = /* glsl */ `
attribute vec3 aCol; attribute float aMat; attribute vec2 aRoomY; attribute vec2 aRoomO;
const vec4 LOOK_A[${NM}] = ${LOOK_A};
const vec4 LOOK_B[${NM}] = ${LOOK_B};
#if defined(STATIC)
attribute float aLight;
#elif defined(BAKED)
attribute vec4 aLight;
#else
uniform vec3 uLight;
#endif
varying vec3 vW; varying vec3 vO; varying vec3 vC; varying vec3 vL; varying vec4 vLA; varying vec4 vLB; varying vec2 vRY; varying vec2 vRO;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vO = position; vC = aCol;
  int k = int(aMat + 0.5); vLA = LOOK_A[k]; vLB = LOOK_B[k]; vRY = aRoomY; vRO = aRoomO;
#if defined(STATIC)
  vL = vec3(aLight > ${f3(EMIT.cut)} ? aLight * ${f3(EMIT.fitting)} : aLight, 0.0, 0.0);
#elif defined(BAKED)
  vL = aLight.rgb;
#else
  vL = uLight;
#endif
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

/** how a surface takes the level's light by which way it comes from (the field's direction): facing straight into it
 *  `base` + `slope`, side on `base`, facing away `base` - `slope`; a bump tipped toward it by `relief` more; and the
 *  sheen it gives what has gloss, against the carried lights' highlight */
export const DIR = { base: 0.76, slope: 0.6, relief: 1.1, sheen: 0.5 };

/** the brightest light the field holds: what is over it is held at it */
export const LIGHT_RANGE = 4;

/** how many flashlights lying on are drawn with their beams, and their shadow maps' size */
export const BEAMS = 2, SHADOW = 512;
/** the shadow map's camera: wide enough for the whole spill, from just past the lens */
export const SHADOW_CAM = { fov: 100, near: 0.05, far: 30 };
/** the flashlight in your hand: its shadow map's size, finer than a beam lying about's, as it is the one you look along,
 *  and its camera's width, just past the spill's (spot is nothing outside FLASH.spill[0]) */
export const HELD = { size: 1024, fov: 86 };
/** how far a point is looked up off its surface in a beam's shadow map: `base` (m) for a beam lying about, and for any
 *  beam `texels` of its map's texels as wide as they are there (a texel spans more the further it is from the lens: 5 cm
 *  at 10 m from one lying about, 2 cm from yours). By a fixed few centimetres, a floor or a wall a beam rakes from far off
 *  shadowed itself in stripes, the map's rows and columns laid over it, that crawled as the beam moved (the night round's
 *  torch across the isolation suite, your own far down a corridor) */
export const STANDOFF = { base: 0.04, texels: 2 };
/** the standoff for each metre from the lens: so many texels of a map `fov` wide and `size` across */
const perMetre = (fov: number, size: number) => ((STANDOFF.texels * 2 * Math.tan((fov * Math.PI) / 360)) / size).toFixed(5);

/** your body's shadow from the fittings over you: how many capsules make you, how many fittings throw it, how much
 *  darker than the field's own reckoning it is drawn (the field's fill, light from everywhere, is mostly the fittings'
 *  too: by the field's numbers alone a shadow between two fittings was barely there), and the darkest it gets */
export const SELF = { caps: 5, fix: 2, dark: 1.6, most: 0.8 };

/** the lights that are not the level's, for any shader. Yours: `held(p, n, facing)` (the flashlight, from your hand),
 *  `bounce(p)` (what it throws back around you), `lantern(p, facing)`, and `carried(p, n, facing)` for all three. Lying
 *  about: `lying(p, n)`, flashlights put down on. Both beams throw shadows (n the surface's normal toward the eye, or zero
 *  for a speck of dust, which faces every way). A lantern lying on is in the level's light, as is what a beam lying on
 *  throws back */
export const LIGHTS = /* glsl */ `
uniform vec3 uFlashDir; uniform vec3 uFlashPos; uniform float uFlash; uniform float uLamp; uniform float uBounce;
uniform vec4 uBeam[${BEAMS}]; uniform vec3 uBeamDir[${BEAMS}]; uniform mat4 uBeamM[${BEAMS}];
uniform sampler2D uSh0; uniform sampler2D uSh1; uniform sampler2D uShH; uniform mat4 uHeldM;
float spot(float ca){
  float rim = (ca - ${f3(FLASH.rim)}) / ${f3(FLASH.rimW)};
  return 0.65 * smoothstep(${f3(FLASH.hot[0])}, ${f3(FLASH.hot[1])}, ca) + 0.42 * smoothstep(${f3(FLASH.spill[0])}, ${f3(FLASH.spill[1])}, ca) + 0.12 * exp(-rim * rim);
}
float unshadowed(sampler2D sm, mat4 M, vec3 p, float px);
vec3 held(vec3 p, vec3 n, float facing){
  if (uFlash <= 0.0) return vec3(0.0);
  vec3 v = p - uFlashPos; float d = length(v); vec3 L = v / max(d, 0.001);
  float s = spot(dot(L, uFlashDir));
  if (s <= 0.0) return vec3(0.0);
  /* (looked up a little toward the hand, and off the surface by the map's texels there, so a surface does not shadow
     itself: STANDOFF) */
  s *= unshadowed(uShH, uHeldM, p - L * 0.05 + n * ${perMetre(HELD.fov, HELD.size)} * d, ${(1 / HELD.size).toFixed(7)});
  return uFlash * s * facing * ${f3(FLASH.gain)} / (1.0 + ${f3(FLASH.fall)} * d * d) * ${v3(FLASH.colour)};
}
vec3 bounce(vec3 p){
  vec3 tc = cameraPosition - p;
  return uBounce / (1.0 + ${f3(BOUNCE.fall)} * dot(tc, tc)) * ${v3(BOUNCE.colour)};
}
vec3 lantern(vec3 p, float facing){
  vec3 tc = cameraPosition - p;
  return uLamp * facing * ${f3(LANTERN.gain)} / (1.0 + ${f3(LANTERN.fall)} * dot(tc, tc)) * ${v3(LANTERN.colour)};
}
vec3 carried(vec3 p, vec3 n, float facing){ return held(p, n, facing) + bounce(p) + lantern(p, facing); }
/* how much of a beam's light reaches p, by its shadow map (3 by 3 taps px apart, so the edge is soft) */
float unshadowed(sampler2D sm, mat4 M, vec3 p, float px){
  vec4 c = M * vec4(p, 1.0);
  if (c.w <= ${f3(SHADOW_CAM.near)}) return 0.0;
  vec2 uv = c.xy / c.w * 0.5 + 0.5;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0;
  float n = ${f3(SHADOW_CAM.near)}, f = ${f3(SHADOW_CAM.far)}, bias = 0.03 + 0.012 * c.w, lit = 0.0;
  for (int i = -1; i <= 1; i++)
    for (int j = -1; j <= 1; j++) {
      float z = textureLod(sm, uv + vec2(float(i), float(j)) * px, 0.0).r * 2.0 - 1.0;
      lit += c.w <= 2.0 * n * f / (f + n - z * (f - n)) + bias ? 1.0 : 0.0;
    }
  return lit / 9.0;
}
vec3 beamOn(vec3 p, vec3 n, vec4 B, vec3 dir, float seen){
  vec3 v = p - B.xyz; float d = length(v); vec3 L = v / max(d, 0.001);
  float facing = dot(n, n) > 0.0 ? 0.35 + 0.65 * abs(dot(n, L)) : 1.0;
  return B.w * seen * spot(dot(L, dir)) * facing * ${f3(FLASH.gain)} / (1.0 + ${f3(FLASH.fall)} * d * d) * ${v3(FLASH.colour)};
}
/* p looked up off its surface (n) in the map of a beam lying about with its lens at B (STANDOFF) */
vec3 offFor(vec3 p, vec3 n, vec3 B){ return p + n * (${f3(STANDOFF.base)} + ${perMetre(SHADOW_CAM.fov, SHADOW)} * length(p - B)); }
vec3 lying(vec3 p, vec3 n){
  vec3 out3 = vec3(0.0);
#ifdef DBG_NOBEAMS
  return out3;
#endif
  if (uBeam[0].w > 0.0) out3 += beamOn(p, n, uBeam[0], uBeamDir[0], unshadowed(uSh0, uBeamM[0], offFor(p, n, uBeam[0].xyz), ${(1 / SHADOW).toFixed(7)}));
  if (uBeam[1].w > 0.0) out3 += beamOn(p, n, uBeam[1], uBeamDir[1], unshadowed(uSh1, uBeamM[1], offFor(p, n, uBeam[1].xyz), ${(1 / SHADOW).toFixed(7)}));
  return out3;
}`;

/* The patterns. `p` is where on the thing (metres), `n` its facing there in the same frame, `up` how high over its
   room's floor; out come a shade (1 is the colour as given), a height (metres), a gloss multiplier, and a tint for
   what is not the colour as given (rust, a chip of marble, a brass strip). Lines are drawn with their width filtered
   over the pixel, and fade to the share of the surface they cover once finer than a pixel; noise and specks fade to
   their average by their own size against the pixel's (keep), before they would crawl. */
const SURFACE = /* glsl */ `
uniform sampler2D uNoise;
/* smooth noise in three dimensions from one look-up: the noise texture's green is its red moved by (37, 17), which is
   the next layer up */
float n3(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  vec2 uv = i.xy + vec2(37.0, 17.0) * i.z + f.xy;
  vec2 rg = texture2D(uNoise, (uv + 0.5) / 256.0).rg;
  return mix(rg.x, rg.y, f.z);
}
float hash(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
/* 1 on a line of a grid every per metres, w either side of it; 0 between. What a pixel shows is the share of it the
   line covers (the pixel fw wide, the line 2w): a line finer than a pixel is drawn as faint as it is thin. (Drawn at
   half strength across a whole pixel however thin it was, a joint a few millimetres wide stood out the further off it
   was, once the floor's own grain had faded: a grid of squares across every floor past a few metres.) Where the lines
   are as close as a few pixels, they fade to the share of the surface they cover */
float grid(float x, float per, float w){
  float d = abs(fract(x / per + 0.5) - 0.5) * per, fw = max(fwidth(x), 1e-6);
  float on = clamp((min(d + 0.5 * fw, w) - max(d - 0.5 * fw, -w)) / fw, 0.0, 1.0);
  return mix(on, min(1.0, 2.0 * w / per), smoothstep(0.1, 0.45, fw / per));
}
/* 1 within r of a point of a lattice of dots, d from the nearest */
float dot1(float d, float r, float fw){ return (1.0 - smoothstep(r - fw, r + fw, d)) * (1.0 - smoothstep(r * 0.4, r * 1.2, fw)); }
/* how much of a detail size metres across (a cell of noise, a speck) a pixel px metres wide can show: all of it while
   it is four pixels across, half at two, none under one and a third. Finer than that it is not drawn but sampled, a
   different few of its specks each frame as you move, so it crawls: on a floor or a wall seen at a slant, in streaks
   across the way the pixel is stretched. Faded to its average, it shades the surface as it would from that far */
float keep(float size, float px){ return 1.0 - smoothstep(0.25, 0.75, px / size); }
/* n3 at k cells a metre, faded to its average where a pixel px wide is too wide for them */
float n3f(vec3 p, float k, float px){ return mix(0.5, n3(p * k), keep(1.0 / k, px)); }
/* how far along a wall facing n the point q on the plan is: a wall facing x or z along z or x, as ever; a wall at an
   angle, along it, the same way from either face (along x before z) */
float along(vec2 q, vec3 n){
  vec2 an = abs(n.xz);
  if (max(an.x, an.y) > 0.999 * length(n.xz)) return an.x > an.y ? q.y : q.x;
  vec2 t = normalize(vec2(-n.z, n.x));
  return dot(q, t.x < 0.0 ? -t : t);
}
/* chips set in a matrix (terrazzo's marble, vinyl's flecks): round a point jittered in each cell of a lattice k a
   metre, a chip of a size, an angle and a stretch of its own, angular more than round, so that none of them lines up
   with the lattice (noise cut off at a level, as they were, came out in crosses, Ts and Ls along its own grid). How much
   of a pixel px wide the nearest chip covers, and which it is (0 to 1, to tell kinds by). A quarter of the surface or
   so is chips: CHIP_COVER, and the shares of it below a kind's number in CHIP_KIND */
vec2 chip(vec2 q, float k, float seed, float px){
  vec2 c = floor(q * k), f = fract(q * k);
  float best = -1e3, r0 = 1.0, kind = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 o = vec2(float(i), float(j)), id = c + o + seed;
    float h1 = hash(id), h2 = hash(id + 17.31), h3 = hash(id + 41.7), h4 = hash(id + 73.13);
    vec2 v = f - o - vec2(h1, h2);
    float cs = cos(h3 * 6.2832), sn = sin(h3 * 6.2832);
    v = vec2(cs * v.x - sn * v.y, (sn * v.x + cs * v.y) * (1.0 + 0.6 * h4));
    float r = 0.2 + 0.22 * fract(h1 * 7.13 + h2), b = 1.0 - (0.5 * length(v) + 0.4 * (abs(v.x) + abs(v.y))) / r;
    if (b > best) { best = b; r0 = r; kind = fract(h4 * 13.7 + h3); }
  }
  float e = px * k / r0;
  return vec2(smoothstep(-0.5 * e, 0.5 * e, best), kind);
}
/* scuffs, as soles and wheels leave them on a coat: in four cells in ten of a lattice k a metre, a short stroke of its
   own length (6 to 20 cm), width and way, bowed a little and thinning to its ends; how much of a pixel px wide the
   nearest covers, filtered as a joint is, and how dark it is */
float scuffs(vec2 q, float k, float px){
  vec2 c = floor(q * k);
  float best = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 id = c + vec2(float(i), float(j));
    float h1 = hash(id + 3.7), h2 = hash(id + 29.1), h3 = hash(id + 57.3), h4 = hash(id + 91.9);
    if (h4 > 0.4) continue;
    vec2 t = vec2(cos(h3 * 6.2832), sin(h3 * 6.2832)), v = q - (id + vec2(h1, h2)) / k;
    float len = 0.03 + 0.07 * fract(h1 * 9.7 + h2), a = dot(v, t);
    float b = dot(v, vec2(-t.y, t.x)) - 1.5 * (a * a - len * len) * (h4 - 0.2);
    float d = length(vec2(max(abs(a) - len, 0.0), b)), w = (0.002 + 0.002 * fract(h2 * 5.3 + h3)) * (1.0 - 0.6 * smoothstep(0.0, len, abs(a)));
    best = max(best, clamp((min(d + 0.5 * px, w) - max(d - 0.5 * px, -w)) / px, 0.0, 1.0) * (0.5 + h4));
  }
  return best;
}
void surface(int pat, vec3 p, vec3 n, float up, vec2 at, float det, out float alb, out float h, out float gm, out vec3 tint){
  alb = 1.0; h = 0.0; gm = 1.0; tint = vec3(1.0);
  vec3 an = abs(n);
  bool horiz = an.y > max(an.x, an.z);
  bool overhead = horiz && n.y < 0.0;
  /* where the joints are laid from: the corner of the room it is in (at), so each room's start at its own walls and
     do not run on from room to room in one lattice over the station. Noise is the world's, so it runs on across a
     doorway without a seam */
  vec3 pa = p - vec3(at.x, 0.0, at.y);
  /* across the face and up it: a floor or ceiling's are x and z; a wall's along it and up from the floor */
  vec2 uv = horiz ? pa.xz : vec2(along(pa.xz, n), up);
  float fw = fwidth(uv.x) + fwidth(uv.y);
  /* how wide a pixel is here (metres), the way it is widest: seen at a slant, it is stretched along the surface */
  float px = max(length(dFdx(p)), length(dFdy(p)));
  if (pat == ${P('cast')}) {
    float b = n3f(p, 0.6, px), s = n3f(p, 7.0, px), sp = n3f(p, 31.0, px);
    alb = 1.0 + 0.18 * (b - 0.5) + 0.12 * (s - 0.5) * det + 0.08 * (sp - 0.5) * det;
    h = 0.006 * b + 0.0015 * s + 0.0004 * sp;
    if (!horiz || overhead) {
      /* the formwork it was poured in: boards 1.2 by 0.6 m up a wall, sheets 1.2 by 2.4 overhead, and a pair of tie
         holes in each */
      vec2 per = overhead ? vec2(1.2, 2.4) : vec2(1.2, 0.6);
      float seam = max(grid(uv.x, per.x, 0.003), grid(uv.y, per.y, 0.003));
      vec2 c = fract(uv / per) * per;
      float tie = dot1(min(length(c - per * vec2(0.25, 0.5)), length(c - per * vec2(0.75, 0.5))), 0.012, fw);
      alb *= (1.0 - 0.16 * seam) * (1.0 - 0.5 * tie);
      h -= 0.002 * seam + 0.008 * tie;
    }
  } else if (pat == ${P('block')}) {
    /* block filled and painted smooth, as an institution paints it: no coursing (drawn, it read as brick), a roller's
       stipple, the paint a little uneven, and a control joint every 6 m */
    float m = n3f(p, 0.7, px), st = n3f(p, 55.0, px), j = grid(uv.x, 6.0, 0.004);
    alb = (1.0 + 0.05 * (m - 0.5) + 0.05 * (st - 0.5) * det) * (1.0 - 0.15 * j);
    h = 0.0003 * st - 0.002 * j;
    gm = 1.0 - 0.6 * j;
  } else if (pat == ${P('plaster')}) {
    float b = n3f(p, 1.1, px), pe = n3f(p, 42.0, px);
    alb = 1.0 + 0.05 * (b - 0.5) + 0.03 * (pe - 0.5) * det;
    h = 0.0002 * pe;
  } else if (pat == ${P('tiles')}) {
    /* a suspended ceiling's grid, 600 mm each way as the tiles are made, of painted T-bar; the tiles pitted mineral fibre */
    float bar = max(grid(uv.x, 0.6, 0.012), grid(uv.y, 0.6, 0.012));
    float pits = mix(0.11, smoothstep(0.7, 0.78, n3(p * 70.0)), keep(0.5 / 70.0, px)) * det, tone = hash(floor(uv / 0.6));
    alb = mix(1.0 + 0.06 * (tone - 0.5) + 0.04 * (n3f(p, 9.0, px) - 0.5) - 0.1 * pits, 1.12, bar);
    h = 0.004 * bar - 0.0006 * pits;
    gm = 1.0 + 5.0 * bar;
  } else if (pat == ${P('glazed')}) {
    /* 150 mm tiles in grout; each laid a little out of true, so a highlight breaks across them */
    vec2 cell = floor(uv / 0.15), f = fract(uv / 0.15) - 0.5;
    float g = max(grid(uv.x, 0.15, 0.0025), grid(uv.y, 0.15, 0.0025));
    float tone = hash(cell), tilt = hash(cell + 17.0);
    alb = (1.0 + 0.06 * (tone - 0.5)) * (1.0 - 0.35 * g);
    h = 0.0012 * ((tone - 0.5) * f.x + (tilt - 0.5) * f.y) - 0.002 * g;
    gm = 1.0 - 0.95 * g;
  } else if (pat == ${P('flags')}) {
    /* the street: large square flags, joint to joint (laid half a flag along, small and contrasting, they read as a
       brick pavement), each a little different in tone */
    vec2 cell = floor(uv / 0.9);
    float j = max(grid(uv.x, 0.9, 0.003), grid(uv.y, 0.9, 0.003));
    float tone = hash(cell), grit = n3f(p, 18.0, px);
    alb = (1.0 + 0.06 * (tone - 0.5) + 0.08 * (grit - 0.5) * det) * (1.0 - 0.2 * j);
    h = 0.0012 * grit - 0.003 * j;
  } else if (pat == ${P('mesh')} && horiz) {
    /* bar grating, galvanised: bearing bars 5 mm thick on 30 mm centres along z, 30 mm deep, so looked at across them
       their sides close the gaps and it reads as a floor, and looked along them you see down through (drawn as a
       square grid of thin lines, the same from every side, it read as graph paper); twisted cross rods every 100 mm,
       flush with their tops; panels a metre wide, a banding bar at each edge, each a little different */
    vec3 v = normalize(cameraPosition - p);
    float tilt = 1.0 / max(abs(v.y), 0.05);
    float top = grid(pa.x, 0.03, 0.0025);
    float bear = grid(pa.x, 0.03, min(0.0025 + 0.015 * abs(v.x) * tilt, 0.015));
    /* (a rod is 6 mm proud of the slot's floor of shadow: looking along the slots at a slant, the rods close them) */
    float rod = grid(pa.z, 0.1, min(0.0015 + 0.006 * abs(v.z) * tilt, 0.05));
    float band = grid(pa.x, 1.0, 0.004);
    float pan = hash(vec2(floor(pa.x), floor(pa.z / 6.0))), grime = n3f(p, 0.8, px);
    float solid = max(max(bear, 0.85 * rod), band);
    /* between the bars, the dim of what is under the walkway: not black */
    alb = mix(0.3, mix(0.62, 1.0, max(top, band)) * (1.0 + 0.1 * (pan - 0.5) + 0.14 * (grime - 0.5)), solid);
    h = 0.0015 * top + 0.003 * band;
    gm = max(top, band);
  } else if (pat == ${P('plate')} || pat == ${P('mesh')}) {
    /* steel plate in panels a metre across and 1.2 m high, seamed and riveted; brushed along its length */
    vec2 per = vec2(1.0, 1.2), c = fract(uv / per) * per;
    float seam = max(grid(uv.x, per.x, 0.002), grid(uv.y, per.y, 0.002));
    float ex = min(c.x, per.x - c.x), ey = min(c.y, per.y - c.y);
    float ax = abs(fract(uv.x / 0.15 + 0.5) - 0.5) * 0.15, ay = abs(fract(uv.y / 0.15 + 0.5) - 0.5) * 0.15;
    float riv = dot1(min(length(vec2(ex - 0.03, ay)), length(vec2(ey - 0.03, ax))), 0.007, fw);
    float brush = mix(0.5, n3(vec3(uv.x * 2.0, uv.y * 70.0, 3.1)), keep(1.0 / 70.0, px)), stain = n3f(p, 0.4, px);
    alb = (1.0 + 0.1 * (brush - 0.5) * det + 0.24 * (stain - 0.5)) * (1.0 - 0.3 * seam) * (1.0 + 0.15 * riv);
    h = -0.002 * seam + 0.003 * riv + 0.0001 * brush;
    gm = 0.7 + 0.6 * brush;
  } else if (pat == ${P('rock')}) {
    float a = n3f(p, 0.9, px), b = n3f(p, 3.1, px), c = n3f(p, 11.0, px);
    float strata = 0.5 + 0.5 * sin(p.y * 6.0 + a * 5.0);
    alb = 0.88 + 0.5 * (0.5 * a + 0.33 * b + 0.17 * c * det - 0.5) + 0.07 * strata;
    h = 0.09 * a + 0.025 * b + 0.004 * c * det;
    /* where it is wet, it shines */
    gm = 0.4 + 6.0 * smoothstep(0.6, 0.78, n3(p * 0.35 + 9.0));
  } else if (pat == ${P('boards')}) {
    /* planks 120 mm wide, across the face; grain along them */
    vec2 q = horiz ? pa.xz : vec2(along(pa.xz, n), p.y);
    float k = floor(q.y / 0.12), gap = grid(q.y, 0.12, 0.003);
    float tone = hash(vec2(k, 7.0)), grain = mix(0.5, n3(vec3(q.x * 1.5, q.y * 60.0, k * 3.0)), keep(1.0 / 60.0, px));
    alb = (1.0 + 0.2 * (tone - 0.5) + 0.14 * (grain - 0.5) * det) * (1.0 - 0.5 * gap);
    h = -0.003 * gap + 0.0003 * grain;
  } else if (pat == ${P('shot')}) {
    /* sprayed over blasted rock: lumps the size of the rock's own under the spray's grain, and no seams */
    float a = n3f(p, 0.7, px), b = n3f(p, 2.3, px), g = n3f(p, 23.0, px), sp = n3f(p, 61.0, px);
    alb = 0.94 + 0.2 * (a - 0.5) + 0.12 * (b - 0.5) + (0.1 * (g - 0.5) + 0.06 * (sp - 0.5)) * det;
    h = 0.07 * a + 0.025 * b + (0.002 * g + 0.0004 * sp) * det;
    if (!horiz || overhead) {
      /* the rock bolts: a plate 150 mm square every 1.5 m, rows staggered, sprayed over with the rest, so it shows as a
         raised square and the nut through it; under one in four on a wall, a faint stain of rust run down from it */
      float row = floor(uv.y / 1.5);
      vec2 q = vec2(uv.x + 0.75 * mod(row, 2.0), uv.y), cell = floor(q / 1.5), c = fract(q / 1.5) * 1.5 - 0.75;
      float edge = 1.0 - smoothstep(0.02, 0.08, fw);
      float plate = (1.0 - smoothstep(0.075 - fw, 0.075 + fw, max(abs(c.x), abs(c.y)))) * edge + 0.01 * (1.0 - edge);
      float nut = dot1(length(c), 0.022, fw);
      float tear = overhead ? 0.0 : step(0.75, hash(cell + 3.0)) * (1.0 - smoothstep(0.02, 0.07, abs(c.x)))
        * smoothstep(-0.5, -0.1, c.y) * (1.0 - smoothstep(-0.09, -0.07, c.y)) * edge;
      alb *= 1.0 - 0.15 * nut;
      h += 0.004 * plate + 0.006 * nut;
      gm = mix(gm, 3.0, nut);
      tint = mix(mix(vec3(1.0), vec3(1.0, 0.9, 0.8), nut), vec3(1.2, 0.9, 0.7), 0.45 * tear);
    }
  } else if (pat == ${P('epoxy')}) {
    /* a coated slab: the coat smooth and a little uneven in tone, dulled in patches where wheels and feet went, and
       scuffed there, each scuff its own way. (Drawn as noise stretched along x, the scuffs read as a texture smeared
       down every corridor that ran that way.) No saw cuts: a lattice of them across every corridor read as tiles, the
       squares they made meeting in crosses under your feet */
    float m = n3f(p, 0.45, px), worn = smoothstep(0.45, 0.75, n3f(p + 3.0, 0.5, px));
    float sc = det > 0.0 ? scuffs(horiz ? p.xz : vec2(along(p.xz, n), p.y), 2.5, px) * (0.3 + 0.7 * worn) * det : 0.0;
    alb = (1.0 + 0.08 * (m - 0.5)) * (1.0 - 0.04 * worn) * (1.0 - 0.3 * sc);
    gm = (1.0 - 0.5 * worn) * (1.0 - 0.7 * sc);
  } else if (pat == ${P('vinyl')}) {
    /* sheet vinyl: flecked dark and light, the seams welded every 2 m along the roll, with a rod of the same colour: a
       hairline, all but gone but where the light catches it */
    float kf = keep(0.5 / 120.0, px);
    vec2 fk = kf > 0.0 ? chip(horiz ? p.xz : vec2(along(p.xz, n), p.y), 120.0, 5.0, px) : vec2(0.0);
    float f1 = mix(${f3(CHIP_KIND[0.45])}, fk.x * step(fk.y, 0.45), kf), f2 = mix(${f3(CHIP_COVER - CHIP_KIND[0.55])}, fk.x * step(0.55, fk.y), kf);
    float seam = grid(uv.x, 2.0, 0.001), m = n3f(p, 0.6, px);
    alb = 1.0 + 0.05 * (m - 0.5) + (0.12 * f2 - 0.14 * f1) * det - 0.05 * seam;
    h = -0.0003 * seam;
    gm = 1.0 - 0.2 * seam;
  } else if (pat == ${P('carpet')}) {
    /* carpet laid wall to wall, its pile, and worn paler where the feet went. (It was tiles, 500 mm, each a quarter turn
       from the next: one more lattice of squares over a floor) */
    float pile = n3f(p, 160.0, px), worn = n3f(p, 0.7, px);
    alb = 1.0 + 0.14 * (pile - 0.5) * det + 0.08 * (worn - 0.5);
    h = 0.0008 * pile;
    gm = 0.0;
  } else if (pat == ${P('terrazzo')}) {
    /* marble chips in cement, ground flat and polished: dark, pale and a few rust-red ones, an inch or so across and
       smaller between, so they read further off than the finer specks elsewhere. Poured in one, with no brass strips
       between bays: their lattice across a floor read as tiles */
    vec2 q = horiz ? p.xz : vec2(along(p.xz, n), p.y);
    float ka = keep(0.5 / 26.0, px), kb = keep(0.5 / 52.0, px);
    vec2 a = ka > 0.0 ? chip(q, 26.0, 0.0, px) : vec2(0.0), b = kb > 0.0 ? chip(q, 52.0, 311.0, px) : vec2(0.0);
    /* (each size of chip by its kind: dark under 0.35, pale under 0.8, rust under 0.9, the rest the cement's own colour;
       faded to its share where too fine to show, the big ones over the small) */
    vec4 A = mix(${TERRAZZO},
      a.x * vec4(1.0, step(a.y, 0.35), step(0.35, a.y) * step(a.y, 0.8), step(0.8, a.y) * step(a.y, 0.9)), ka);
    vec4 B = mix(${TERRAZZO},
      b.x * vec4(1.0, step(b.y, 0.35), step(0.35, b.y) * step(b.y, 0.8), step(0.8, b.y) * step(b.y, 0.9)), kb);
    vec3 cs = A.yzw + (1.0 - A.x) * B.yzw;
    float grain = n3f(p, 90.0, px), m = n3f(p, 0.5, px);
    alb = (1.0 + 0.06 * (m - 0.5) + 0.06 * (grain - 0.5)) * (1.0 - 0.3 * cs.x) * (1.0 + 0.14 * cs.y);
    tint = mix(vec3(1.0), vec3(1.18, 0.9, 0.76), cs.z);
    h = 0.0002 * (cs.y - cs.x);
  } else if (pat == ${P('stone')}) {
    /* honed limestone hung as cladding: panels 1.5 m long and 0.75 high stacked joint over joint (set half a panel
       along, as masonry is, it reads as brick), hairline joints; its bedding planes, and pits where a fossil fell out */
    float row = floor(uv.y / 0.75), x = uv.x;
    float j = max(grid(uv.y, 0.75, 0.001), grid(x, 1.5, 0.001));
    float tone = hash(vec2(floor(x / 1.5), row)), bed = mix(0.5, n3(vec3(x * 1.5, uv.y * 14.0, tone * 40.0)), keep(1.0 / 14.0, px));
    float pit = mix(0.09, smoothstep(0.73, 0.78, n3(p * 45.0)), keep(0.5 / 45.0, px));
    alb = (1.0 + 0.06 * (tone - 0.5) + 0.08 * (bed - 0.5) * det - 0.12 * pit) * (1.0 - 0.1 * j);
    h = -0.001 * j - 0.0004 * pit;
    gm = 1.0 - 0.9 * j;
  } else if (pat == ${P('flake')}) {
    /* a coat with flakes of vinyl broadcast into it wet, under a clear coat: charcoal, pale grey and a few buff, a
       centimetre or so and smaller between, thicker where the broadcast fell thicker; the clear coat dulled, in
       patches, where feet went */
    vec2 q = horiz ? p.xz : vec2(along(p.xz, n), p.y);
    float ka = keep(0.5 / 45.0, px), kb = keep(0.5 / 80.0, px);
    vec2 a = ka > 0.0 ? chip(q, 45.0, 23.0, px) : vec2(0.0), b = kb > 0.0 ? chip(q, 80.0, 517.0, px) : vec2(0.0);
    vec4 A = mix(${TERRAZZO},
      a.x * vec4(1.0, step(a.y, 0.35), step(0.35, a.y) * step(a.y, 0.8), step(0.8, a.y) * step(a.y, 0.9)), ka);
    vec4 B = mix(${TERRAZZO},
      b.x * vec4(1.0, step(b.y, 0.35), step(0.35, b.y) * step(b.y, 0.8), step(0.8, b.y) * step(b.y, 0.9)), kb);
    float thick = 0.65 + 0.7 * n3f(p, 1.3, px), m = n3f(p, 0.5, px), grain = n3f(p, 18.0, px);
    vec3 cs = (A.yzw + (1.0 - A.x) * B.yzw) * thick;
    float worn = smoothstep(0.5, 0.75, n3f(p + 5.0, 0.7, px));
    /* (the grain: where the flakes are too fine to draw, the floor still reads as flecked a few metres on, rather
       than going plain at a line) */
    alb = (1.0 + 0.05 * (m - 0.5) + 0.07 * (grain - 0.5) * (1.0 - kb) * det) * (1.0 - 0.55 * cs.x) * (1.0 + 0.75 * cs.y);
    tint = mix(vec3(1.0), vec3(1.2, 1.05, 0.82), cs.z);
    h = 0.0002 * (cs.x + cs.y + cs.z);
    gm = 1.0 - 0.55 * worn;
  } else if (pat == ${P('polished')}) {
    /* a slab ground and polished: the cut faces of its gravel, rounded, in greys and browns near its own colour
       (marble chips bright in a cement are terrazzo; this is the slab's own stone), in a salt and pepper of sand; its
       tone clouded where the trowel and the densifier went, and here and there a hairline crack */
    vec2 q = horiz ? p.xz : vec2(along(p.xz, n), p.y);
    float ka = keep(0.5 / 24.0, px), kb = keep(0.5 / 48.0, px);
    vec2 a = ka > 0.0 ? chip(q, 24.0, 91.0, px) : vec2(0.0), b = kb > 0.0 ? chip(q, 48.0, 733.0, px) : vec2(0.0);
    vec4 A = mix(${TERRAZZO},
      a.x * vec4(1.0, step(a.y, 0.35), step(0.35, a.y) * step(a.y, 0.8), step(0.8, a.y) * step(a.y, 0.9)), ka);
    vec4 B = mix(${TERRAZZO},
      b.x * vec4(1.0, step(b.y, 0.35), step(0.35, b.y) * step(b.y, 0.8), step(0.8, b.y) * step(b.y, 0.9)), kb);
    vec3 cs = A.yzw + (1.0 - A.x) * B.yzw;
    float sand = n3f(p, 140.0, px), cloud = n3f(p, 0.7, px), cl2 = n3f(p + 3.0, 2.4, px);
    /* the crack: where a noise crosses its middle, jagged by a finer one, in a few places only; its width in metres,
       filtered over the pixel as a joint is */
    float w = n3(p * 0.8 + 4.0) + 0.06 * (n3(p * 11.0) - 0.5), gw = max(fwidth(w), 1e-6);
    float cd = abs(w - 0.5) * px / gw, cw = 0.0006;
    float crack = clamp((min(cd + 0.5 * px, cw) - max(cd - 0.5 * px, -cw)) / px, 0.0, 1.0) * smoothstep(0.64, 0.7, n3(p * 0.17 + 11.0));
    alb = (1.0 + 0.14 * (cloud - 0.5) + 0.07 * (cl2 - 0.5) + 0.1 * (sand - 0.5) * det) * (1.0 - 0.22 * cs.x) * (1.0 + 0.16 * cs.y)
      * (1.0 - 0.5 * crack);
    tint = mix(vec3(1.0), vec3(1.1, 0.96, 0.82), cs.z);
    h = 0.0001 * (cs.y - cs.x) - 0.0004 * crack;
    gm = (1.0 - 0.3 * (cl2 - 0.5)) * (1.0 - 0.8 * crack);
  }
}
/* the facing n tipped by a height h over the surface, from how both change across the screen (Mikkelsen's bump
   mapping of unparametrised surfaces) */
vec3 bumped(vec3 n, vec3 w, float h){
  vec3 dx = dFdx(w), dy = dFdy(w), r1 = cross(dy, n), r2 = cross(n, dx);
  float det = dot(dx, r1);
  vec3 g = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
  return normalize(abs(det) * n - g);
}`;

const FS = /* glsl */ `
#ifdef STATIC
uniform sampler2D uLA; uniform sampler2D uLD; uniform highp sampler3D uLI; uniform vec3 uLO; uniform vec3 uLN; uniform int uLW;
/* the level's light at p, on a surface facing n (toward the eye); in fl the part of it that flickers, and in dl which way
   it comes from (as long as the share of it that comes from one way); found, false where no open point is near */
vec3 fieldAt(vec3 p, vec3 n, out vec3 fl, out vec3 dl, out bool found){
  fl = vec3(0.0); dl = vec3(0.0); found = false;
  vec3 f = (p + n * 0.2 - ${f3(LOFF)}) / ${f3(LCELL)}, b = floor(f), t = f - b;
  vec3 bk = floor(b / ${BR}.0), ix = bk - uLO;
  if (any(lessThan(ix, vec3(0.0))) || any(greaterThanEqual(ix, uLN))) return vec3(0.0);
  float slot = texelFetch(uLI, ivec3(ix), 0).r;
  if (slot < 0.0) return vec3(0.0);
  ivec3 l = ivec3(b - bk * ${BR}.0);
  int base = int(slot) * ${(BR + 1) ** 3};
  vec4 S[8]; vec3 D[8]; float W[8]; int best = -1;
  for (int c = 0; c < 8; c++) {
    ivec3 o = ivec3(c & 1, (c >> 1) & 1, c >> 2), q = l + o;
    int i = base + (q.z * ${BR + 1} + q.y) * ${BR + 1} + q.x;
    S[c] = texelFetch(uLA, ivec2(i % uLW, i / uLW), 0);
    D[c] = texelFetch(uLD, ivec2(i % uLW, i / uLW), 0).rgb * 2.0 - 1.0;
    vec3 w3 = mix(1.0 - t, t, vec3(o));
    /* a point behind the surface counts for little: the far side of a wall it stands on */
    vec3 cp = (b + vec3(o)) * ${f3(LCELL)} + ${f3(LOFF)};
    W[c] = w3.x * w3.y * w3.z * (dot(cp - p, n) > -0.05 ? 1.0 : 0.03);
    if (S[c].a > 0.0 && (best < 0 || W[c] > W[best])) best = c;
  }
  if (best < 0) return vec3(0.0);
  found = true;
  /* only the points joined to the nearest open one */
  int reach = 1 << best;
  for (int pass = 0; pass < 3; pass++)
    for (int a = 0; a < 3; a++)
      for (int c = 0; c < 8; c++) {
        if ((c & (1 << a)) != 0) continue;
        int d = c | (1 << a);
        int bits = int(S[c].a * 255.0 + 0.5);
        if (((reach >> c) & 1) != ((reach >> d) & 1) && (bits & (2 << a)) != 0) reach |= (1 << c) | (1 << d);
      }
  vec3 acc = vec3(0.0), accF = vec3(0.0), accD = vec3(0.0); float sw = 0.0, sl = 0.0;
  for (int c = 0; c < 8; c++) {
    if (((reach >> c) & 1) == 0) continue;
    vec3 l = W[c] * S[c].rgb * S[c].rgb;
    float lm = dot(l, vec3(0.3, 0.59, 0.11));
    acc += l; accF += l * float(int(S[c].a * 255.0 + 0.5) >> 4) / 15.0; sw += W[c];
    accD += lm * D[c]; sl += lm;
  }
  dl = sl > 1e-7 ? accD / sl : vec3(0.0);
  fl = accF / max(sw, 1e-5) * ${f3(LIGHT_RANGE)};
  return acc / max(sw, 1e-5) * ${f3(LIGHT_RANGE)};
}
/* the same, at p on a surface a pixel wide px metres there. A pixel on a face's edge is shaded where its middle would
   be on that face, though only part of it is (the scene is smoothed at its edges: post.ts); past the edge, that can be
   inside what the face meets, with nothing open about it: a floor seen far off, along the foot of a wall. Unlit, such
   pixels made a line of black specks that crawled as you moved. There, it is looked up again from that far nearer the
   eye, which is in the open; and failing that (a rough cave roof), a lattice step nearer again */
vec3 field(vec3 p, vec3 n, float px, out vec3 fl, out vec3 dl){
  vec3 V = normalize(cameraPosition - p), l = vec3(0.0);
  bool found = false;
  for (int k = 0; k < 3 && !found; k++) l = fieldAt(p + V * (k == 0 ? 0.0 : px + (k == 1 ? 0.1 : 0.6)), n, fl, dl, found);
  return l;
}
uniform vec4 uSelfA[${SELF.caps}]; uniform vec4 uSelfB[${SELF.caps}]; uniform vec4 uFix[${SELF.fix}]; uniform vec3 uSelfLo; uniform vec3 uSelfHi;
/* how much of a capsule (a to b, radius r) stands between p and a light dl away along l: soft, its edge wider and its
   middle fainter the further p is behind it, and gone past 7 m */
float capsule(vec3 p, vec3 l, float dl, vec3 a, vec3 b, float r){
  vec3 ba = b - a, pa = p - a;
  float bb = max(dot(ba, ba), 1e-6), lb = dot(l, ba), lp = dot(l, pa), bp = dot(ba, pa);
  float s = clamp((bp - lp * lb) / max(bb - lb * lb, 1e-6), 0.0, 1.0);
  float t = clamp(s * lb - lp, 0.0, dl);
  if (t < 0.02 || t > dl - 0.05) return 0.0;
  s = clamp(dot(pa + t * l, ba) / bb, 0.0, 1.0);
  float d = length(pa + t * l - s * ba), w = 0.03 + 0.45 * t / max(dl - t, 0.25);
  return (1.0 - smoothstep(r - 0.5 * w, r + 0.5 * w, d)) * min(1.0, 2.0 * r / w) * (1.0 - smoothstep(4.0, 7.0, t));
}
/* how much of the level's light at p (facing n) your body leaves: each fitting's share of it, as the field reckons a
   fitting's pool (POOL in world/lightField.ts), less what the body hides of that fitting; drawn SELF.dark darker */
float selfShade(vec3 p, vec3 n){
  if (uFix[0].w <= 0.0 || any(lessThan(p, uSelfLo)) || any(greaterThan(p, uSelfHi))) return 1.0;
  vec3 q = p + n * 0.02;
  float sum = 0.0, cut = 0.0;
  for (int j = 0; j < ${SELF.fix}; j++) {
    vec4 F = uFix[j];
    vec3 L = F.xyz - q; float dl = length(L);
    if (F.w <= 0.0 || L.y <= 0.0) continue;
    float c = L.y / dl, v = F.w * c * c * c * ${f3(POOL.r2)} / (${f3(POOL.r2)} + dl * dl), occ = 0.0;
    for (int k = 0; k < ${SELF.caps}; k++) occ = max(occ, capsule(q, L / dl, dl, uSelfA[k].xyz, uSelfB[k].xyz, uSelfA[k].w));
    sum += v; cut += v * occ;
  }
  if (sum <= 0.0) return 1.0;
  float pool = ${f3(POOL.gain)} * min(sum, 1.0);
  return 1.0 - min(${f3(SELF.most)}, ${f3(SELF.dark)} * pool / (${f3(POOL.base)} + pool) * cut / sum);
}
#endif
${LIGHTS}
uniform float uFog; uniform float uWet;
uniform float uFlick; uniform float uHit; uniform float uBright; uniform float uDetail;
#if !defined(STATIC) && !defined(BAKED)
uniform vec3 uLightF; uniform vec3 uLightD;
#endif
varying vec3 vW; varying vec3 vO; varying vec3 vC; varying vec3 vL; varying vec4 vLA; varying vec4 vLB; varying vec2 vRY; varying vec2 vRO;
${SURFACE}
/* how much of the level's light a surface takes, facing nf (nb with its bumps): of what comes from every way, as before
   (sh, and rel for a bump facing up); of what comes from one way (dl, as long as its share), by how it faces that way */
float takes(vec3 nf, vec3 nb, vec3 dl, float sh, float rel){
  float a = min(length(dl), 1.0);
  if (a < 1e-3) return sh * rel;
  vec3 u = dl / a;
  float g = ${f3(DIR.base)} + ${f3(DIR.slope)} * dot(nf, u), r = clamp(1.0 + ${f3(DIR.relief)} * dot(nb - nf, u), 0.5, 1.5);
  return mix(sh * rel, g * r, a);
}
void main(){
  vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
  vec3 tc = cameraPosition - vW; float d = length(tc); vec3 Ld = tc / max(d, 0.001);
  vec3 nf = dot(n, Ld) < 0.0 ? -n : n;
  vec3 base = vC; float em = 0.0;
  if (base.r > 1.5) { base -= 2.0; em = 1.0; }
  /* what it is made of: the level's drawn where it is in the world, a moving thing's in its own frame */
  int pat = int(vLB.x + 0.5);
  float alb = 1.0, h = 0.0, gm = 1.0, det = 1.0 - smoothstep(9.0, 26.0, d);
  vec3 tint = vec3(1.0);
  bool walls = vRY.y > vRY.x, on = uDetail > 0.5;
  if (on && pat > 0 && em == 0.0) {
#ifdef STATIC
    surface(pat, vW, nf, walls ? vW.y - vRY.x : vW.y, vRO, det, alb, h, gm, tint);
#else
    vec3 no = normalize(cross(dFdx(vO), dFdy(vO)));
    surface(pat, vO, no, vO.y, vec2(0.0), det, alb, h, gm, tint);
#endif
  }
  /* wear, on the level's walls and ceilings: grime at the foot of a wall; in places, water run down from the
     ceiling, fading as it goes: on bare cement the white salts it leached out (vLB.z), on paint and tile a brown
     tide mark; blotches overhead */
  if (on && vLB.y > 0.0 && walls && em == 0.0) {
    float k = vLB.y;
    if (abs(nf.y) < 0.5) {
      float px = max(length(dFdx(vW)), length(dFdy(vW)));
      float g = (1.0 - smoothstep(0.0, 0.45, vW.y - vRY.x)) * (0.45 + 0.9 * n3f(vW, 1.7, px));
      float streak = mix(0.28, smoothstep(0.45, 0.8, n3(vec3(along(vW.xz, nf) * 9.0, vW.y * 0.5, 1.7))), keep(0.5 / 9.0, px));
      float run = smoothstep(0.58, 0.78, n3(vW * 0.21 + 5.0)) * streak * exp(-(vRY.y - vW.y) / 1.4);
      alb *= 1.0 - 0.3 * k * g;
      vec3 left = vLB.z > 0.5 ? min(base * vec3(1.6, 1.6, 1.55) + 0.06, vec3(0.82, 0.81, 0.78)) : base * vec3(0.74, 0.66, 0.52);
      base = mix(base, left, 0.7 * k * run);
      gm *= 1.0 - 0.6 * g;
    } else if (nf.y < 0.0) alb *= 1.0 - 0.12 * k * smoothstep(0.6, 0.85, n3(vW * 0.5 + 2.0));
  }
  base *= alb * tint;
  vec3 nb = on && vLA.w > 0.0 && det > 0.0 ? bumped(nf, vW, h * vLA.w * det) : nf;
  float sh = 0.55 + 0.45 * (abs(nb.y) * 0.95 + abs(nb.x) * 0.7 + abs(nb.z) * 0.5);
  /* the carried lights' facing, from your hand; the room's light comes from above, so a bump facing up takes more of it */
  vec3 Lf = normalize(uFlashPos - vW);
  float facing = on ? 0.35 + 0.65 * max(dot(nb, Lf), 0.0) : 0.35 + 0.65 * abs(dot(n, Ld));
  float rel = clamp(1.0 + 1.1 * (nb.y - nf.y), 0.5, 1.5);
  /* the level's light here, and which way it comes from */
  vec3 lvl = vec3(0.0), dl = vec3(0.0);
#if defined(STATIC)
#ifdef DBG_FLAT
  vec3 fl = vec3(0.0), lv = vec3(0.3);
#else
  float px = length(fwidth(vW));
  vec3 fl, lv = field(vW, nf, px, fl, dl);
#endif
#ifdef DBG_NODIR
  dl = vec3(0.0);
#endif
#ifdef DBG_NOSELF
  float shade = 1.0;
#else
  float shade = selfShade(vW, nf);
#endif
  lvl = (lv - fl * 0.55 * uFlick) * vL.x * shade;
  vec3 light = lvl * takes(nf, nb, dl, sh, rel);
#elif defined(BAKED)
  vec3 light = vL * sh;
#else
  lvl = vL - uLightF * 0.55 * uFlick; dl = uLightD;
  vec3 light = lvl * takes(nf, nb, dl, sh, rel);
#endif
  light += vec3(0.014) / (1.0 + 3.0 * d * d) + carried(vW, nf, facing) + lying(vW, nf) + vec3(uBright);
  /* a light that is lit is brighter than white, the brightest the most */
  float top = max(base.r, max(base.g, base.b));
  vec3 c = mix(base * light, max(base, vec3(0.0)) * (1.0 + ${f3(EMIT.most - 1)} * smoothstep(${f3(EMIT.dim)}, ${f3(EMIT.bright)}, top)), em);
  /* the highlight, of the flashlight and the lantern you carry, and a sheen from the level's light where it comes from
     one way: tight and tinted on metal, broad and white on paint */
  if (on && vLA.x > 0.0 && em == 0.0) {
    float tight = vLA.y, norm = (tight + 8.0) / 32.0, a = min(length(dl), 1.0);
    float sb = pow(max(dot(nb, normalize(Lf + Ld)), 0.0), tight), sl = pow(max(dot(nb, Ld), 0.0), tight);
    float sf = a > 1e-3 ? pow(max(dot(nb, normalize(dl / a + Ld)), 0.0), tight) * a * ${f3(DIR.sheen)} : 0.0;
    vec3 tint = mix(vec3(1.0), base * 2.2, vLA.z);
    c += tint * vLA.x * gm * norm * (held(vW, nf, 1.0) * sb + lantern(vW, 1.0) * sl + lvl * sf);
  }
  c += uHit * vec3(0.45, 0.08, 0.06);
  c *= exp(-d * uFog);
  c = max(mix(c, c * vec3(0.5, 0.85, 0.9), uWet), vec3(0.0));
#if defined(DBG_UNLIT)
  c = max(vC, vec3(0.0)) * 0.5;
#elif defined(DBG_SHOWNORMAL)
  c = (nf * 0.5 + 0.5) * 0.6;
#elif defined(DBG_SHOWLIGHT)
  c = lvl;
#elif defined(DBG_SHOWSURF)
  c = 0.15 + 0.45 * fract(vec3(vRY.x * 0.37 + vLB.x * 0.29, vL.x * 1.7 + vRY.y * 0.23, vLB.x * 0.61 + vC.r * 3.1));
#endif
#ifdef ALPHA
  gl_FragColor = vec4(c, ALPHA);
#else
  gl_FragColor = vec4(c, 1.0);
#endif
}`;

/** the noise the patterns are drawn from: 256 by 256, red random, green the red moved by (37, 17) (see n3). Made the
 *  same every time, so the station is too. */
function noiseTexture(): THREE.DataTexture {
  const N = 256, r = new Uint8Array(N * N), px = new Uint8Array(N * N * 4);
  let s = 0x2545f491;
  for (let i = 0; i < r.length; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; r[i] = (s >>> 0) & 255; }
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const k = (y * N + x) * 4;
      px[k] = r[y * N + x];
      px[k + 1] = r[((y + 17) % N) * N + ((x + 37) % N)];
      px[k + 3] = 255;
    }
  const t = new THREE.DataTexture(px, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}


/** uniforms every material shares: the flashlight, the fog, time, the eye */
export const U = {
  uFlashDir: { value: new THREE.Vector3(0, 0, -1) },
  /** where the flashlight is held: in your left hand, a little below the eye (camera.ts) */
  uFlashPos: { value: new THREE.Vector3() },
  /** 1 to draw what surfaces are made of, 0 for their flat colours (setDetail) */
  uDetail: { value: 1 },
  uFlash: { value: 0 },
  uLamp: { value: 0 },
  uFog: { value: 0.02 },
  uWet: { value: 0 },
  uTime: { value: 0 },
  /** 1 while flickering lights are dimmed (flicker.ts) */
  uFlick: { value: 0 },
  uBright: { value: 0 },
  /** the flashlight thrown back by whatever it is lighting close by */
  uBounce: { value: 0 },
  /** how open the eye is: above 1 adapted to the dark, below to the light */
  uExpo: { value: 1 },
  /** flashlights lying on: where (and how strong), which way, from where their shadow maps were taken, and the maps */
  uBeam: { value: Array.from({ length: BEAMS }, () => new THREE.Vector4()) },
  uBeamDir: { value: Array.from({ length: BEAMS }, () => new THREE.Vector3(0, 0, -1)) },
  uBeamM: { value: Array.from({ length: BEAMS }, () => new THREE.Matrix4()) },
  uSh0: { value: null as THREE.Texture | null },
  uSh1: { value: null as THREE.Texture | null },
  /** the flashlight in your hand: its shadow map, and from where it was taken (beams.ts) */
  uShH: { value: null as THREE.Texture | null },
  uHeldM: { value: new THREE.Matrix4() },
  /** your body, as capsules (a and its radius, b), the fittings that throw its shadow (where, and 1 if lit, 0 for
   *  none), and the room it falls in (selfView.ts) */
  uSelfA: { value: Array.from({ length: SELF.caps }, () => new THREE.Vector4()) },
  uSelfB: { value: Array.from({ length: SELF.caps }, () => new THREE.Vector4()) },
  uFix: { value: Array.from({ length: SELF.fix }, () => new THREE.Vector4()) },
  uSelfLo: { value: new THREE.Vector3() },
  uSelfHi: { value: new THREE.Vector3() },
  /** the level's light field: its bricks' texels, the index of its bricks, where the index starts and how big it is (in
   *  bricks), the texels' width (lightVolume.ts) */
  uLA: { value: null as THREE.Texture | null },
  /** which way its light comes from, laid out as uLA */
  uLD: { value: null as THREE.Texture | null },
  uLI: { value: null as THREE.Texture | null },
  uLO: { value: new THREE.Vector3() },
  uLN: { value: new THREE.Vector3() },
  uLW: { value: 2048 },
  uNoise: { value: noiseTexture() },
};

/** what a vertex is made of, its room's floor and ceiling, and the corner its joints are laid from, where its geometry
 *  does not say: nothing, and no room */
const DEFAULTS = { aMat: [0], aRoomY: [0, 0], aRoomO: [0, 0] };
function material(o: THREE.ShaderMaterialParameters): THREE.ShaderMaterial {
  const m = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide, ...o, defines: { ...dbgDefines(), ...o.defines } });
  m.defaultAttributeValues = { ...m.defaultAttributeValues, ...DEFAULTS };
  return m;
}

/** what has its depth drawn before anything is lit (the level's pieces: post.ts), on this layer as well as the first */
export const DEPTH_FIRST = 2;
/** that depth: placed exactly as VS places it, and pushed back a hair, so the light pass, drawing only what is not
 *  behind it, never loses the surface itself to rounding */
export function depthFirstMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `void main(){ vec4 w = modelMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `void main(){ gl_FragColor = vec4(0.0); }`,
    side: THREE.DoubleSide, colorWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  });
}

/** the level's material: lit from the level's light field, each vertex saying how much of it it takes */
export function staticMaterial(): THREE.ShaderMaterial {
  return material({ uniforms: { ...U, uHit: { value: 0 } }, defines: { STATIC: '' } });
}

/** a see-through surface (water, a window), its light baked into each vertex */
export function glassMaterial(alpha: number): THREE.ShaderMaterial {
  return material({ uniforms: { ...U, uHit: { value: 0 } }, defines: { BAKED: '', ALPHA: alpha.toFixed(3) }, transparent: true, depthWrite: false });
}

/** a material for one moving thing: its light (the part of it that flickers, and which way it comes from) is set from
 *  where it stands. With
 *  `alpha`, see-through, as a door's vision panel is */
export function dynamicMaterial(alpha?: number): THREE.ShaderMaterial {
  const uniforms = { ...U, uHit: { value: 0 }, uLight: { value: new THREE.Vector3() }, uLightF: { value: new THREE.Vector3() }, uLightD: { value: new THREE.Vector3() } };
  return alpha === undefined ? material({ uniforms }) : material({ uniforms, defines: { ALPHA: alpha.toFixed(3) }, transparent: true, depthWrite: false });
}

/** the uniforms LIGHTS reads, shared: for a material of its own that includes LIGHTS */
export function lightUniforms() {
  const { uFlashDir, uFlashPos, uFlash, uLamp, uBounce, uBeam, uBeamDir, uBeamM, uSh0, uSh1, uShH, uHeldM } = U;
  return { uFlashDir, uFlashPos, uFlash, uLamp, uBounce, uBeam, uBeamDir, uBeamM, uSh0, uSh1, uShH, uHeldM };
}

const NONE = [0, 0, 0];
/** light a moving thing's material by the level's light where it is: `l` the light, `f` the part of it that flickers,
 *  `d` which way it comes from (Lighting.towards; none, from every way) */
export function lightMaterial(mat: THREE.ShaderMaterial, l: readonly number[], f: readonly number[], d: readonly number[] = NONE): void {
  (mat.uniforms.uLight.value as THREE.Vector3).set(l[0], l[1], l[2]);
  (mat.uniforms.uLightF.value as THREE.Vector3).set(f[0], f[1], f[2]);
  (mat.uniforms.uLightD.value as THREE.Vector3).set(d[0], d[1], d[2]);
}

/** surface detail on or off: what surfaces are made of, their wear, the beam's highlight; the services under bare
 *  ceilings are shown or hidden with it by each level's view (LevelView.showDetail) */
export function setDetail(on: boolean): void {
  U.uDetail.value = on ? 1 : 0;
}
