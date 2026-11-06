import { sizeOf } from '../../content/items';

/* What you carry, drawn: a small coloured picture for each thing (content/items.ts), in the colours it is drawn in where it
   lies (content/lying.ts), shaped to the cells it takes in the grid (48 to a cell: a pistol stands up in two, a vest
   fills four); a card for each key you know, coloured by whose it is; a sheet for each paper you have read. Outlined in
   ink so the dark ones read on the panel's dark. The name is the hover's (panels.ts). */

const INK = '#0b0c0e';
/** a shape, filled and outlined */
const f = (fill: string, d: string, w = 1.6) => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>`;
/** a line in a colour: a highlight, a seam */
const l = (c: string, d: string, w = 1.6) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
/** a strap, a hose, a handle: a line in a colour, outlined in ink like the shapes */
const t = (c: string, d: string, w = 3) => l(INK, d, w + 2.4) + l(c, d, w);
const o = (fill: string, cx: number, cy: number, r: number, w = 1.6) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${INK}" stroke-width="${w}"/>`;

const RUB = '#2a2d32', RUB2 = '#3b3f45', RUBHI = '#5d636b';
const STEEL = '#8f949a', STEELHI = '#c3c8cd', CHROME = '#b8bdc2', CHROMEHI = '#eceef0';
const WOOD = '#6e4e2e', WOODHI = '#94693f';
const RED = '#a82a20', REDHI = '#d0473a';
const YEL = '#c9a227', YELHI = '#e8c95c';
const BRASS = '#b08d3a', BRASSHI = '#dcbb63', COPPER = '#b87333', COPPERHI = '#dd9a5c';

const VEST = 'M32 14h8q8 14 16 0h8l14 14-6 18v36H24V46l-6-18z';
const CARD = 'M7 13h34a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V15a2 2 0 0 1 2-2z';
/** where a card's colour goes, given when it is drawn */
const TINT = '@tint';

const ICONS: Record<string, string> = {
  /* 1 by 2, 1 by 3: long things stand up */
  baton: f(RUB, 'M20 9a4 4 0 0 1 8 0v50h-8z') + f(RUB2, 'M18.5 58h11v29a3 3 0 0 1-3 3h-5a3 3 0 0 1-3-3z') +
    l(RUBHI, 'M22.5 10v44') + l('#1b1d20', 'M19.5 65h9M19.5 71h9M19.5 77h9M19.5 83h9', 1.2),
  pipe: f('#6f747a', 'M18 14h12v116H18z') + f('#565b61', 'M14 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10H14z') + f('#565b61', 'M14 126h20v10a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2z') +
    l('#a6abb1', 'M21.5 21v102', 2) + `<circle cx="26" cy="62" r="2" fill="#7a4a2a"/><circle cx="23" cy="98" r="1.6" fill="#7a4a2a"/>`,
  wrench: f('#8a3a2a', 'M19 38h10v47a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4z') + l('#b4553f', 'M21.5 42v40') + `<circle cx="24" cy="82" r="2" fill="${INK}"/>` +
    f(STEEL, 'M17 6h22v9H27v7h12v9H17z') + l(STEELHI, 'M19.5 9v19') + f('#6a6f75', 'M18 31h13v7H18z', 1.2) + l('#4c5156', 'M21 31v7M24 31v7M27 31v7', 1),
  adjwrench: f(CHROME, 'M19 26h10l1 58a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z') + f(CHROME, 'M19 20V7A13 13 0 1 0 29 7V20Z') +
    `<circle cx="24" cy="82" r="2.5" fill="${INK}"/>` + l(CHROMEHI, 'M22 32v44') + l(CHROMEHI, 'M14.5 16a10 10 0 0 0 3 10', 1.2),
  pistol: f('#2a2d32', 'M21 48l18 7a3 3 0 0 1 2 3l2 13a3 3 0 0 1-3 3H25l-4-6z') + l('#4a4f56', 'M27 60l10 4M27 65l11 3', 1.2) +
    t('#3b3f45', 'M21 34h7a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-7', 2.4) +
    f('#464b52', 'M8 10a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v58H8z') + `<rect x="12" y="8" width="5" height="3" fill="${INK}"/>` + l('#7a8089', 'M11.5 13v36') +
    f('#2a2d32', 'M14 22h5v10h-5z', 1) + l('#2a2d32', 'M10 54h9M10 58h9M10 62h9', 1.1),
  shotgun: f('#24272b', 'M20 18h6v58h-6z') + f(RUB, 'M12 8a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v72h-8z') + f(RUB2, 'M18 36h11v26H18z') +
    l('#24272b', 'M19.5 41h8M19.5 46h8M19.5 51h8M19.5 56h8', 1.2) + l(RUBHI, 'M14.5 10v64') +
    t('#3b3f45', 'M30 88h5a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-5', 2.4) +
    f(RUB, 'M10 78h20v26H10z') + f(WOOD, 'M12 104h18l6 34a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3z') + l(WOODHI, 'M17 110l1.5 27') + l(RUBHI, 'M13 82v18'),
  knife: f('#c9cdd2', 'M18 60C18 30 22 14 30 4V60z') + l(CHROMEHI, 'M20.5 56C20.5 33 23.5 18 28.5 9', 1.2) + f('#8a8f95', 'M17 60h14v4H17z', 1.2) +
    f('#1f2125', 'M18 64h12v26a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3z') + `<circle cx="24" cy="72" r="1.6" fill="#9aa0a6"/><circle cx="24" cy="84" r="1.6" fill="#9aa0a6"/>`,
  axe: f(WOOD, 'M20 26h8v108a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3z') + l(WOODHI, 'M22.5 32v98') +
    f(RED, 'M15 14L5 5Q0 23 5 41L15 32z') + f(RED, 'M33 18L45 22L33 28z') + f(RED, 'M15 13h18v20H15z') +
    l('#d6dadf', 'M5 8Q1.5 23 5 38', 2.5) + l(REDHI, 'M17.5 16.5h13', 1.5),
  /* 2 by 1 */
  fuse: f('#a0a4a8', 'M4 20h10v8H4zM82 20h10v8H82z') + f('#d8d0b8', 'M24 14h48v20H24z') + f(COPPER, 'M14 12h12v24H14zM70 12h12v24H70z') +
    l('#f2ecda', 'M28 17.5h40', 1.5) + l('#8a3a2a', 'M38 26h20', 3) + l(COPPERHI, 'M17 15v18M73 15v18', 1.2),
  kit: t('#3b3f45', 'M38 15v-5h20v5') +
    f('#39485a', 'M8 14h80a3 3 0 0 1 3 3v20a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V17a3 3 0 0 1 3-3z') + f(YEL, 'M5 25h86v5H5z', 1) +
    f('#8a8f95', 'M18 12h6v6h-6zM72 12h6v6h-6z', 1) + l('#566a82', 'M9 18h78', 1.2),
  /* 2 by 2 */
  armor: f('#2a2e34', VEST) + f('#39485a', 'M34 40h28v32H34z', 1.2) + l('#53657c', 'M34 50.5h28M34 61h28M48 40v32', 1) +
    f('#1f2125', 'M24 54h10v5H24zM62 54h10v5H62z', 1) + l('#4a5058', 'M30 29l4 9M66 29l-4 9', 1.5),
  tacvest: f('#262a2f', VEST) + f('#4a5236', 'M40 32h16v11H40z', 1.2) + f('#4a5236', 'M29 52h15v17H29zM52 52h15v17H52z', 1.2) +
    l('#6b7650', 'M29 57.5h15M52 57.5h15M40 36h16', 1) + l('#3a4030', 'M25 76h46M25 80h46', 1.6) + l('#4a5058', 'M30 29l4 9M66 29l-4 9', 1.5),
  /* 1 by 1 */
  ammo9: [11, 21, 31].map(x => f(BRASS, `M${x} 23h7v17h-7z`) + f(COPPER, `M${x} 23v-4a3.5 3.5 0 0 1 7 0v4z`) + l(BRASSHI, `M${x + 2} 26v11`, 1.2)).join(''),
  shells: [10, 20, 30].map(x => f(RED, `M${x} 10h8v23h-8z`) + l(REDHI, `M${x + 2} 13v17`, 1.2) + f(BRASS, `M${x - 0.5} 33h9v7h-9z`)).join(''),
  batt: f('#8a8f95', 'M21 7h6v5h-6z', 1.2) + f(COPPER, 'M16 14a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v22H16z') + f('#1f2125', 'M16 36h16v4a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2z') +
    l(COPPERHI, 'M19 15v18') + l('#1f2125', 'M27 18v6M24 21h6', 1.5),
  medkit: t('#5d636b', 'M18 15v-5h12v5') +
    f('#d4d8d4', 'M7 15h34a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V17a2 2 0 0 1 2-2z') + f(RED, 'M21 19h6v5h5v6h-5v5h-6v-5h-5v-6h5z', 1) + l('#f2f4f2', 'M8 18h10', 1.2),
  bandage: f('#e3dfd2', 'M22 32h20v6H22z', 1.2) + o('#d8d4c8', 20, 24, 13) + `<circle cx="20" cy="24" r="4.5" fill="#8c887d" stroke="${INK}" stroke-width="1.2"/>` +
    l('#b5b1a5', 'M20 15a9 9 0 0 1 0 18', 1.2) + l('#f4f1e8', 'M12 18a10 10 0 0 1 5-5', 1.2),
  ration: f('#77716a', 'M4 18l5-1v14l-5-1zM44 18l-5-1v14l5-1z', 1.2) + f('#8a8478', 'M9 16h30v16H9z') + f(YEL, 'M16 19h16v10H16z', 1) +
    l('#5a4f1a', 'M19 22.5h10M19 25.5h7', 1),
  peaches: f('#b8bcc0', 'M13 11h22v28H13z') + f('#d88a2a', 'M13 17h22v16H13z', 1) + `<circle cx="24" cy="25" r="4.5" fill="#f2b45a" stroke="#9a5a1a" stroke-width="1"/>` +
    `<ellipse cx="24" cy="11" rx="11" ry="3" fill="#d6dadd" stroke="${INK}" stroke-width="1.6"/>` + l('#e6e9ec', 'M16 14v2M16 35v2', 1.2),
  rebreather: t('#4a4f56', 'M16 13C16 4 33 4 33 14', 2.6) +
    f(YEL, 'M10 20a6 6 0 0 1 12 0v20a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2z') + f('#3a3d42', 'M13 12h6v5h-6z', 1.2) + l(YELHI, 'M13 22v16', 1.5) +
    f('#2a2c2e', 'M27 14h12v12H27z') + f('#3a3d42', 'M29 26h8v6h-8z', 1.2) + l('#4a4f56', 'M30 18h6', 1.2),
  hardhat: f(YEL, 'M10 31a14 14 0 0 1 28 0z') + f('#b08d22', 'M4 31h40a2 2 0 0 1 0 4H4a2 2 0 0 1 0-4z') + l(YELHI, 'M24 18v12', 2) + l(YELHI, 'M14 27a10 10 0 0 1 6-8', 1.5),
  goggles: t('#4a4f56', 'M3 24h5M40 24h5', 2.6) + f('#22262a', 'M7 17h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2zM26 17h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H26a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z') +
    f('#8fd0d8', 'M9 20h11v7H9zM28 20h11v7H28z', 1) + l('#e8fbff', 'M11 22.5l3-1M30 22.5l3-1', 1.2),
  flash: `<g transform="rotate(-45 24 24)">` + f('#2a2c2e', 'M5 20h25v8H5z') + l('#3d4146', 'M9 21.5v5M12 21.5v5M15 21.5v5', 1.2) +
    f(YEL, 'M30 20l4-4h7v16h-7l-4-4z') + f('#f4ecc6', 'M41 17h3v14h-3z', 1) + f(YEL, 'M20 18h4v2h-4z', 0.8) + `</g>`,
  lantern: t('#5d636b', 'M17 11V6h14v5', 2.2) + f(YEL, 'M12 10h24v6H12z') + f('#f4e7b0', 'M14 16h20v16H14z', 1.2) +
    l('#9c7f1e', 'M19 16v16M24 16v16M29 16v16', 1.2) + f(YEL, 'M11 32h26v8H11z') + l(YELHI, 'M13 34h22', 1.2),
  liftkey: o(BRASS, 15, 24, 8) + `<circle cx="15" cy="24" r="3" fill="${INK}"/>` + f(BRASS, 'M23 22h20v4H23zM34 26h3v5h-3zM39 26h3v4h-3z', 1.4) + l(BRASSHI, 'M10 20a6 6 0 0 1 4-3', 1.2),
  card: f(TINT, CARD) + f('#e8e6dc', 'M9 17h10v12H9z', 1) + `<path d="M5 31h38v3H5z" fill="#15171a"/>` + l('#e8e6dc', 'M23 19h14M23 24h10', 1.5),
  paper: f('#e2ddcf', 'M12 6h17l7 7v29H12z') + f('#c6c0ae', 'M29 6v7h7z', 1) + l('#8c877a', 'M16 20h16M16 25h16M16 30h12', 1.2),
};

/** the picture for a thing (an item's id, 'card', 'liftkey' or 'paper'), drawn to the cells it takes; `tint` colours a
 *  card by whose it is */
export function icon(id: string, tint?: string): string {
  const [w, h] = ['card', 'paper', 'liftkey'].includes(id) ? [1, 1] : sizeOf(id), body = ICONS[id] ?? f('#86857c', 'M10 10h28v28H10z');
  return `<svg class="pic" viewBox="0 0 ${48 * w} ${48 * h}" aria-hidden="true">${body.replaceAll(TINT, tint ?? '#86857c')}</svg>`;
}

/** the picture for a key you know: the director's is a key, the rest are cards, coloured by whose they are */
export function keyIcon(k: string): string {
  if (k === 'lift') return icon('liftkey');
  const tint = ({ s: '#a8352a', o: '#5f7f99', h: '#6b8f4e', e: '#c9a227', surf: '#d9d3c1' } as Record<string, string>)[k] ?? '#86857c';
  return icon('card', tint);
}
