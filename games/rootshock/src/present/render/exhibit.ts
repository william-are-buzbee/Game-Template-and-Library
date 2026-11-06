import * as THREE from 'three';
import type { Colour } from '../../core/math';
import type { World } from '../../world/world';
import type { Lighting } from '../../world/light';
import { ARRIVAL, HISTORY, HOUSE, PROCESS, STAGES, WELCOME, type Art, type Board } from '../../content/exhibit';
import { faceMaterial, faceTexture } from './signs';

/* The family's exhibit (world.md §8, *The exhibit*; content/exhibit.ts): printed boards in bronze frames, the company's
   story in its house style of the 80s, an ivory ground, a field green and a gold. Lit as the signs are, by the room
   where they hang and the lights you carry, so in the dark wing they are read by your beam; matt, so it sends little
   of it back. Each board's picture is drawn here, flat, from its `art`. */

/** the canvas's pixels a metre: a board is read from a metre or two; a long one gets fewer, to keep within what any
 *  GPU takes (MAXPX across) */
const PX = 300, MAXPX = 2048;
/** how much of your beam the printed board sends back */
const RETRO = 0.25;

const IVORY: Colour = [0.84, 0.8, 0.7], STONE: Colour = [0.74, 0.69, 0.58], GREEN: Colour = [0.17, 0.27, 0.19];
const LEAF: Colour = [0.36, 0.48, 0.26], GOLD: Colour = [0.66, 0.52, 0.26], CURED: Colour = [0.6, 0.42, 0.2];
const INK: Colour = [0.18, 0.14, 0.1], BLOT: Colour = [0.24, 0.24, 0.3];
const css = (c: Colour, a = 1) => `rgba(${c.map(v => Math.round(Math.min(1, v) * 255)).join(',')},${a})`;
const SANS = '"Barlow Condensed","Arial Narrow",Arial,sans-serif', SERIF = 'Newsreader,Georgia,serif';

type Ctx = CanvasRenderingContext2D;
/** a box to draw in, in pixels */
interface Box { x: number; y: number; w: number; h: number }

/** a tobacco leaf from (x, y), `len` long and `wid` wide, pointing at angle a (0: up), with its midrib */
function leaf(c: Ctx, x: number, y: number, len: number, wid: number, a: number, fill: Colour, rib: Colour | null = IVORY): void {
  c.save(); c.translate(x, y); c.rotate(a);
  c.beginPath(); c.moveTo(0, 0);
  c.bezierCurveTo(wid * 0.9, -len * 0.2, wid * 0.6, -len * 0.75, 0, -len);
  c.bezierCurveTo(-wid * 0.6, -len * 0.75, -wid * 0.9, -len * 0.2, 0, 0);
  c.fillStyle = css(fill); c.fill();
  if (rib) {
    c.strokeStyle = css(rib, 0.7); c.lineWidth = Math.max(1, wid * 0.06);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -len * 0.92);
    for (let k = 1; k <= 3; k++) { const t = -len * k * 0.22; for (const s of [-1, 1]) { c.moveTo(0, t); c.lineTo(s * wid * 0.32, t - len * 0.12); } }
    c.stroke();
  }
  c.restore();
}

/** a plant: a stalk `ht` tall from (x, y), leaves up it in pairs, the lowest largest */
function plant(c: Ctx, x: number, y: number, ht: number, fill: Colour, n = 4): void {
  c.strokeStyle = css(GREEN); c.lineWidth = Math.max(1.5, ht * 0.03);
  c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - ht); c.stroke();
  for (let k = 0; k < n; k++) {
    const t = (k + 0.6) / (n + 0.4), L = ht * (0.55 - 0.3 * t);
    leaf(c, x, y - ht * t * 0.9, L, L * 0.5, k % 2 ? 1.05 : -1.05, fill, null);
  }
}

/** a lamp bar over (x, y), w wide, its light falling `fall` below it */
function lamp(c: Ctx, x: number, y: number, w: number, fall: number): void {
  c.fillStyle = css(GOLD, 0.25);
  c.beginPath(); c.moveTo(x - w * 0.4, y); c.lineTo(x + w * 0.4, y); c.lineTo(x + w * 0.8, y + fall); c.lineTo(x - w * 0.8, y + fall); c.fill();
  c.fillStyle = css(GOLD); c.fillRect(x - w / 2, y - w * 0.12, w, w * 0.14);
}

/** the house's mark: a leaf in a ring */
function mark(c: Ctx, x: number, y: number, r: number, col: Colour): void {
  c.strokeStyle = css(col); c.lineWidth = r * 0.12;
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
  leaf(c, x - r * 0.25, y + r * 0.6, r * 1.3, r * 0.8, 0.45, col, GREEN);
}

const arrow = (c: Ctx, x0: number, y0: number, x1: number, y1: number, col: Colour, w: number) => {
  const a = Math.atan2(y1 - y0, x1 - x0), h = w * 3;
  c.strokeStyle = c.fillStyle = css(col); c.lineWidth = w;
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1 - Math.cos(a) * h, y1 - Math.sin(a) * h); c.stroke();
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 - Math.cos(a - 0.45) * h * 1.3, y1 - Math.sin(a - 0.45) * h * 1.3);
  c.lineTo(x1 - Math.cos(a + 0.45) * h * 1.3, y1 - Math.sin(a + 0.45) * h * 1.3); c.fill();
};

/** each board's picture, in its box */
const ART: Record<Art, (c: Ctx, b: Box) => void> = {
  /* the low field: rows running to the river, the sun over it */
  field(c, { x, y, w, h }) {
    const hz = y + h * 0.42;
    c.fillStyle = css(GOLD); c.beginPath(); c.arc(x + w * 0.72, hz, w * 0.16, Math.PI, 0); c.fill();
    c.fillStyle = css(LEAF, 0.35); c.fillRect(x, hz, w, h * 0.58);
    c.strokeStyle = css(GREEN); c.lineWidth = Math.max(1, w * 0.008);
    c.beginPath(); c.moveTo(x, hz); c.lineTo(x + w, hz); c.stroke();
    for (let k = -4; k <= 4; k++) { c.beginPath(); c.moveTo(x + w / 2 + k * w * 0.03, hz); c.lineTo(x + w / 2 + k * w * 0.2, y + h); c.stroke(); }
    for (let k = -3; k <= 3; k++) for (const t of [0.35, 0.65, 0.95]) {
      const px = x + w / 2 + (k + 0.5) * w * (0.03 + 0.17 * t), py = hz + h * 0.58 * t, s = w * 0.05 * (0.4 + t);
      leaf(c, px, py, s, s * 0.6, -0.6, GREEN, null); leaf(c, px, py, s, s * 0.6, 0.6, GREEN, null);
    }
  },
  /* the barns, leaf hung from the floor to the ridge, the slow fires' smoke */
  barns(c, { x, y, w, h }) {
    const bx = x + w * 0.2, bw = w * 0.6, top = y + h * 0.3, eave = y + h * 0.5, foot = y + h * 0.95;
    c.fillStyle = css(GREEN);
    c.beginPath(); c.moveTo(bx, foot); c.lineTo(bx, eave); c.lineTo(bx + bw / 2, top); c.lineTo(bx + bw, eave); c.lineTo(bx + bw, foot); c.fill();
    c.fillStyle = css(STONE); c.fillRect(bx + bw * 0.25, eave + h * 0.04, bw * 0.5, foot - eave - h * 0.04);
    for (let k = 0; k < 5; k++) leaf(c, bx + bw * (0.3 + k * 0.1), eave + h * 0.06, -(h * 0.2), w * 0.04, 0, k % 2 ? CURED : GOLD, null);
    c.strokeStyle = css(STONE); c.lineWidth = w * 0.025;
    for (const k of [0, 1]) { c.beginPath(); c.moveTo(bx + bw * (0.45 + k * 0.1), top + h * 0.02); c.bezierCurveTo(bx + bw * 0.3, y + h * 0.18, bx + bw * 0.8, y + h * 0.12, bx + bw * (0.55 + k * 0.2), y); c.stroke(); }
  },
  /* blue mould: a leaf gone in blotches, and the wet wind that brought it */
  blight(c, { x, y, w, h }) {
    leaf(c, x + w * 0.55, y + h * 0.95, h * 0.85, w * 0.5, 0.25, LEAF);
    for (const [u, v, r] of [[0.5, 0.6, 0.06], [0.62, 0.42, 0.05], [0.7, 0.62, 0.07], [0.56, 0.3, 0.035], [0.45, 0.76, 0.045]]) {
      c.fillStyle = css(BLOT, 0.85); c.beginPath(); c.arc(x + w * u, y + h * v, w * r, 0, Math.PI * 2); c.fill();
    }
    c.strokeStyle = css(GREEN, 0.8); c.lineWidth = w * 0.015;
    for (const v of [0.2, 0.32, 0.44]) { c.beginPath(); c.moveTo(x, y + h * v); c.bezierCurveTo(x + w * 0.15, y + h * (v - 0.06), x + w * 0.25, y + h * (v + 0.06), x + w * 0.38, y + h * v); c.stroke(); }
  },
  /* the shaft, from the field down four hundred metres to the caverns */
  shaft(c, { x, y, w, h }) {
    const g = y + h * 0.14;
    c.fillStyle = css(STONE); c.fillRect(x, g, w, h - (g - y));
    for (let k = 0; k < 6; k++) leaf(c, x + w * (0.1 + k * 0.16), g, h * 0.08, w * 0.04, (k % 2 ? 1 : -1) * 0.3, GREEN, null);
    c.fillStyle = css(GREEN); c.fillRect(x + w * 0.3, g, w * 0.06, h * 0.7);
    for (const [v, a, b] of [[0.62, 0.36, 0.85], [0.74, 0.12, 0.9], [0.86, 0.36, 0.7]]) c.fillRect(x + w * a, y + h * v, w * (b - a), h * 0.05);
    c.strokeStyle = css(INK); c.lineWidth = Math.max(1, w * 0.006);
    c.beginPath(); c.moveTo(x + w * 0.9, g); c.lineTo(x + w * 0.9, y + h * 0.62); c.stroke();
    for (const v of [g, y + h * 0.62]) { c.beginPath(); c.moveTo(x + w * 0.86, v); c.lineTo(x + w * 0.94, v); c.stroke(); }
    c.fillStyle = css(INK); c.font = `600 ${Math.round(h * 0.07)}px ${SANS}`; c.textAlign = 'right'; c.textBaseline = 'middle';
    c.fillText('400 m', x + w * 0.86, y + h * 0.38);
  },
  /* a grow gallery under its lamps: the sky the family made */
  galleries(c, { x, y, w, h }) {
    c.strokeStyle = css(GREEN); c.lineWidth = w * 0.02;
    c.beginPath(); c.moveTo(x + w * 0.04, y + h); c.lineTo(x + w * 0.04, y + h * 0.3); c.quadraticCurveTo(x + w / 2, y - h * 0.1, x + w * 0.96, y + h * 0.3); c.lineTo(x + w * 0.96, y + h); c.stroke();
    for (const u of [0.3, 0.7]) lamp(c, x + w * u, y + h * 0.3, w * 0.22, h * 0.45);
    c.fillStyle = css(GREEN); c.fillRect(x + w * 0.04, y + h * 0.9, w * 0.92, h * 0.1);
    for (let k = 0; k < 6; k++) plant(c, x + w * (0.14 + k * 0.145), y + h * 0.9, h * 0.32, LEAF, 3);
  },
  /* the range: the leaf, and what is made of it */
  range(c, { x, y, w, h }) {
    leaf(c, x + w * 0.5, y + h * 0.55, h * 0.5, w * 0.3, 0, LEAF);
    const foot = y + h * 0.95;
    c.fillStyle = css(STONE); c.fillRect(x + w * 0.06, foot - h * 0.06, w * 0.3, h * 0.06); c.fillStyle = css(GOLD); c.fillRect(x + w * 0.06, foot - h * 0.06, w * 0.08, h * 0.06);
    c.fillStyle = css(GREEN); c.fillRect(x + w * 0.44, foot - h * 0.28, w * 0.12, h * 0.28); c.fillRect(x + w * 0.475, foot - h * 0.36, w * 0.05, h * 0.08);
    c.fillStyle = css(GOLD); c.fillRect(x + w * 0.44, foot - h * 0.18, w * 0.12, h * 0.06);
    c.save(); c.translate(x + w * 0.8, foot - h * 0.12); c.rotate(-0.5);
    c.fillStyle = css(GREEN); c.fillRect(-w * 0.12, -h * 0.05, w * 0.12, h * 0.1); c.fillStyle = css(GOLD); c.fillRect(0, -h * 0.05, w * 0.12, h * 0.1);
    c.restore();
  },
  /* Phase 2: the station as it is, and the galleries to come under it */
  deeper(c, { x, y, w, h }) {
    c.fillStyle = css(STONE); c.fillRect(x, y + h * 0.08, w, h * 0.92);
    c.fillStyle = css(GREEN); c.fillRect(x + w * 0.3, y + h * 0.08, w * 0.06, h * 0.45);
    for (const [v, a, b] of [[0.3, 0.12, 0.8], [0.44, 0.36, 0.9]]) c.fillRect(x + w * a, y + h * v, w * (b - a), h * 0.06);
    c.strokeStyle = css(GOLD); c.lineWidth = w * 0.014; c.setLineDash([w * 0.03, w * 0.02]);
    c.strokeRect(x + w * 0.3, y + h * 0.53, w * 0.06, h * 0.3);
    for (const [v, a, b] of [[0.68, 0.08, 0.92], [0.84, 0.2, 0.84]]) c.strokeRect(x + w * a, y + h * v, w * (b - a), h * 0.07);
    c.setLineDash([]);
    arrow(c, x + w * 0.6, y + h * 0.52, x + w * 0.6, y + h * 0.66, GOLD, w * 0.012);
  },
  /* a seed, and how small it is */
  seed(c, { x, y, w, h }) {
    const r = Math.min(w, h) * 0.3, cx = x + w * 0.55, cy = y + h * 0.45;
    c.fillStyle = css(STONE); c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = css(GOLD); c.lineWidth = r * 0.08; c.stroke();
    c.fillStyle = css(CURED); c.beginPath(); c.ellipse(cx, cy, r * 0.42, r * 0.6, 0.4, 0, Math.PI * 2); c.fill();
    c.strokeStyle = css(INK, 0.5); c.lineWidth = r * 0.03;
    for (let k = -2; k <= 2; k++) { c.beginPath(); c.ellipse(cx, cy, r * 0.1 + Math.abs(k) * r * 0.06, r * 0.55, 0.4, 0, Math.PI * 2); c.stroke(); }
    c.fillStyle = css(INK);
    for (let k = 0; k < 9; k++) { c.beginPath(); c.arc(x + w * (0.1 + (k % 3) * 0.05), y + h * (0.82 + Math.floor(k / 3) * 0.04), Math.max(1, w * 0.008), 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = css(GOLD); c.lineWidth = r * 0.05; c.beginPath(); c.moveTo(x + w * 0.22, y + h * 0.8); c.lineTo(cx - r * 0.75, cy + r * 0.65); c.stroke();
  },
  /* the seed bed under its mist */
  seedbed(c, { x, y, w, h }) {
    c.fillStyle = css(GREEN); c.beginPath(); c.moveTo(x + w * 0.05, y + h * 0.7); c.lineTo(x + w * 0.95, y + h * 0.7); c.lineTo(x + w * 0.88, y + h * 0.9); c.lineTo(x + w * 0.12, y + h * 0.9); c.fill();
    for (let k = 0; k < 9; k++) { const px = x + w * (0.14 + k * 0.09); for (const s of [-1, 1]) leaf(c, px, y + h * 0.7, h * 0.12, w * 0.05, s * 0.7, LEAF, null); }
    c.fillStyle = css(GOLD, 0.8);
    for (let k = 0; k < 14; k++) { c.beginPath(); c.arc(x + w * (0.1 + ((k * 37) % 80) / 100), y + h * (0.12 + ((k * 23) % 40) / 100), w * 0.012, 0, Math.PI * 2); c.fill(); }
  },
  /* a seedling lifted, its roots bare, and set down in the gallery's bed */
  transplant(c, { x, y, w, h }) {
    const sx = x + w * 0.3, sy = y + h * 0.45;
    for (const s of [-1, 1]) leaf(c, sx, sy, h * 0.25, w * 0.12, s * 0.6, LEAF, null);
    c.strokeStyle = css(CURED); c.lineWidth = w * 0.01;
    for (const [a, l] of [[-0.4, 0.2], [0, 0.26], [0.35, 0.18], [0.15, 0.22]]) { c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(sx + w * a * 0.2, sy + h * l * 0.5, sx + w * a * 0.3, sy + h * l); c.stroke(); }
    arrow(c, sx + w * 0.12, sy, x + w * 0.62, y + h * 0.62, GOLD, w * 0.016);
    c.fillStyle = css(GREEN); c.fillRect(x + w * 0.5, y + h * 0.82, w * 0.45, h * 0.1);
    for (const s of [-1, 1]) leaf(c, x + w * 0.74, y + h * 0.82, h * 0.25, w * 0.12, s * 0.6, LEAF, null);
  },
  /* a plant taller than a man, under the lamp */
  lamps(c, { x, y, w, h }) {
    lamp(c, x + w / 2, y + h * 0.1, w * 0.5, h * 0.8);
    plant(c, x + w / 2, y + h * 0.95, h * 0.72, LEAF, 5);
  },
  /* the flower cut, and the leaves picked from the foot up */
  priming(c, { x, y, w, h }) {
    const px = x + w * 0.42, foot = y + h * 0.95;
    plant(c, px, foot, h * 0.7, LEAF, 3);
    c.fillStyle = css(GOLD); c.beginPath(); c.arc(px, foot - h * 0.76, w * 0.03, 0, Math.PI * 2); c.fill();
    c.strokeStyle = css(INK); c.lineWidth = w * 0.01; c.setLineDash([w * 0.025, w * 0.015]);
    c.beginPath(); c.moveTo(px - w * 0.12, foot - h * 0.71); c.lineTo(px + w * 0.12, foot - h * 0.71); c.stroke(); c.setLineDash([]);
    leaf(c, x + w * 0.8, foot - h * 0.05, h * 0.3, w * 0.12, 0.2, LEAF, null);
    arrow(c, px + w * 0.12, foot - h * 0.18, x + w * 0.72, foot - h * 0.18, GOLD, w * 0.014);
  },
  /* leaf on the stick in the curing hall, green to gold */
  curing(c, { x, y, w, h }) {
    c.fillStyle = css(GREEN); c.fillRect(x + w * 0.05, y + h * 0.18, w * 0.9, h * 0.04);
    const cols: Colour[] = [LEAF, [0.5, 0.5, 0.24], GOLD, CURED, [0.46, 0.3, 0.14]];
    cols.forEach((col, k) => leaf(c, x + w * (0.15 + k * 0.175), y + h * 0.2, -(h * 0.65), w * 0.14, 0, col, null));
  },
};

/** a board's picture in its box, leaving the board's own pen, fill and type as they were */
function picture(c: Ctx, art: Art, b: Box): void {
  c.save(); ART[art](c, b); c.restore();
}

/** wrap text to lines no wider than w */
function wrap(c: Ctx, text: string, w: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const t = line ? `${line} ${word}` : word;
    if (line && c.measureText(t).width > w) { out.push(line); line = word; } else line = t;
  }
  if (line) out.push(line);
  return out;
}

/** a board of the timeline, W by H pixels: the house's band, the year, the title, the picture, a line */
function drawBoard(c: Ctx, W: number, H: number, b: Board): void {
  const u = H / 100, m = W * 0.08;
  c.fillStyle = css(IVORY); c.fillRect(0, 0, W, H);
  c.fillStyle = css(GREEN); c.fillRect(0, 0, W, 11 * u);
  mark(c, m + 3 * u, 5.5 * u, 3.4 * u, GOLD);
  c.fillStyle = css(GOLD); c.font = `600 ${Math.round(3.2 * u)}px ${SANS}`; c.textAlign = 'left'; c.textBaseline = 'middle';
  c.letterSpacing = `${Math.round(0.6 * u)}px`; c.fillText(HOUSE.company.toUpperCase(), m + 8.5 * u, 5.8 * u, W - m * 2 - 8.5 * u); c.letterSpacing = '0px';
  c.fillStyle = css(GREEN); c.font = `400 ${Math.round(14 * u)}px ${SERIF}`; c.textBaseline = 'alphabetic';
  c.fillText(b.era, m, 27 * u, W - 2 * m);
  c.fillStyle = css(GOLD); c.fillRect(m, 30.5 * u, W - 2 * m, 0.7 * u);
  c.fillStyle = css(INK); c.font = `400 ${Math.round(6.4 * u)}px ${SERIF}`;
  c.fillText(b.title, m, 39 * u, W - 2 * m);
  picture(c, b.art, { x: m, y: 44 * u, w: W - 2 * m, h: 36 * u });
  c.fillStyle = css(INK); c.font = `500 ${Math.round(4 * u)}px ${SANS}`;
  wrap(c, b.line, W - 2 * m).slice(0, 2).forEach((l, k) => c.fillText(l, m, (87 + k * 4.6) * u));
  c.fillStyle = css(GOLD); c.fillRect(m, 95 * u, W - 2 * m, 0.4 * u);
  c.fillStyle = css(GREEN); c.font = `600 ${Math.round(2.4 * u)}px ${SANS}`; c.letterSpacing = `${Math.round(0.4 * u)}px`;
  c.fillText('LOWFIELD STATION', m, 98.4 * u); c.letterSpacing = '0px';
}

/** the growing process across one board, W by H pixels: the house and the title in a block at its left end, then each
 *  stage, numbered, with its picture and its line, an arrow to the next */
function drawProcess(c: Ctx, W: number, H: number): void {
  const u = H / 100, lead = W * PROCESS.lead, cw = (W - lead) / STAGES.length;
  c.fillStyle = css(IVORY); c.fillRect(0, 0, W, H);
  c.fillStyle = css(GREEN); c.fillRect(0, 0, lead, H);
  mark(c, lead / 2, 24 * u, 13 * u, GOLD);
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.fillStyle = css(GOLD); c.font = `600 ${Math.round(5 * u)}px ${SANS}`; c.letterSpacing = `${Math.round(0.8 * u)}px`;
  c.fillText(HOUSE.family.toUpperCase(), lead / 2, 50 * u, lead * 0.9); c.letterSpacing = '0px';
  c.fillStyle = css(IVORY); c.font = `400 ${Math.round(11 * u)}px ${SERIF}`;
  const words = PROCESS.title.split(' '), half = Math.ceil(words.length / 2);
  [words.slice(0, half).join(' '), words.slice(half).join(' ')].forEach((l, k) => c.fillText(l, lead / 2, (68 + k * 13) * u, lead * 0.9));
  c.fillStyle = css(GOLD); c.fillRect(lead * 0.2, 90 * u, lead * 0.6, 0.6 * u);
  STAGES.forEach((s, k) => {
    const x0 = lead + k * cw, cx = x0 + cw / 2;
    c.fillStyle = css(GOLD); c.beginPath(); c.arc(cx, 10 * u, 5 * u, 0, Math.PI * 2); c.fill();
    c.fillStyle = css(GREEN); c.font = `600 ${Math.round(6.5 * u)}px ${SANS}`; c.textBaseline = 'middle'; c.fillText(s.era, cx, 10.4 * u);
    c.fillStyle = css(INK); c.font = `400 ${Math.round(7 * u)}px ${SERIF}`; c.textBaseline = 'alphabetic'; c.fillText(s.title, cx, 26 * u, cw * 0.92);
    picture(c, s.art, { x: x0 + cw * 0.14, y: 31 * u, w: cw * 0.72, h: 46 * u });
    c.font = `500 ${Math.round(4.6 * u)}px ${SANS}`;
    wrap(c, s.line, cw * 0.84).slice(0, 2).forEach((l, j) => c.fillText(l, cx, (86 + j * 5.6) * u));
    if (k < STAGES.length - 1) arrow(c, x0 + cw * 0.9, 54 * u, x0 + cw * 1.1, 54 * u, GOLD, 0.8 * u);
  });
  c.strokeStyle = css(GOLD); c.lineWidth = 0.8 * u; c.strokeRect(0.4 * u, 0.4 * u, W - 0.8 * u, H - 0.8 * u);
}

/** the house's board, W by H pixels: its mark, its name, and the station (the upper corridor's, and the arrival hall's) */
function drawHouse(c: Ctx, W: number, H: number): void {
  const u = H / 100;
  c.fillStyle = css(GREEN); c.fillRect(0, 0, W, H);
  c.strokeStyle = css(GOLD); c.lineWidth = 0.8 * u; c.strokeRect(3 * u, 3 * u, W - 6 * u, H - 6 * u);
  mark(c, W / 2, 26 * u, 14 * u, GOLD);
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.fillStyle = css(IVORY); c.font = `400 ${Math.round(17 * u)}px ${SERIF}`; c.letterSpacing = `${Math.round(1.6 * u)}px`;
  c.fillText(HOUSE.family.toUpperCase(), W / 2, 63 * u, W * 0.86);
  c.fillStyle = css(GOLD); c.font = `600 ${Math.round(5.4 * u)}px ${SANS}`; c.letterSpacing = `${Math.round(1.2 * u)}px`;
  c.fillText(`LEAF COMPANY  ·  SINCE ${HOUSE.since}`, W / 2, 74 * u, W * 0.86); c.letterSpacing = '0px';
  c.fillRect(W * 0.3, 79 * u, W * 0.4, 0.5 * u);
  c.fillStyle = css(IVORY); c.font = `italic 400 ${Math.round(7 * u)}px ${SERIF}`;
  c.fillText('Lowfield Station', W / 2, 89 * u, W * 0.86);
}

interface Hung { mat: THREE.ShaderMaterial; at: [number, number, number]; draw: () => void }

export class ExhibitView {
  private hung: Hung[] = [];

  constructor(scene: THREE.Object3D, w: World, L: Lighting) {
    for (const E of w.def.exhibits ?? []) {
      const nx = Math.sin(E.yaw), nz = Math.cos(E.yaw), mat = faceMaterial(nx, nz, RETRO, false);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(E.w, E.h), mat);
      mesh.position.set(E.x, E.y, E.z); mesh.rotation.y = E.yaw;
      const board = HISTORY.find(b => b.key === E.key);
      const draw = () => {
        const c = document.createElement('canvas'), x = c.getContext('2d')!;
        const px = Math.min(PX, MAXPX / E.w);
        c.width = Math.round(E.w * px); c.height = Math.round(E.h * px);
        if (board) drawBoard(x, c.width, c.height, board); else if (E.key === WELCOME.key || E.key === ARRIVAL.key) drawHouse(x, c.width, c.height); else drawProcess(x, c.width, c.height);
        (mat.uniforms.uMap.value as THREE.Texture | null)?.dispose();
        mat.uniforms.uMap.value = faceTexture(c);
      };
      draw();
      scene.add(mesh);
      this.hung.push({ mat, at: [E.x + nx * 0.3, E.y - 0.4, E.z + nz * 0.3], draw });
    }
    /* drawn before the page's fonts may have come; drawn again once they have */
    document.fonts?.ready.then(() => { for (const h of this.hung) h.draw(); });
    this.setLighting(L);
  }

  /** the power changed: each board takes the light where it hangs */
  setLighting(L: Lighting): void {
    for (const h of this.hung) (h.mat.uniforms.uL.value as THREE.Vector3).set(...L.atPoint(...h.at));
  }
}
