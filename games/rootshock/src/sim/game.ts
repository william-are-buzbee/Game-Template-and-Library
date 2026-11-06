import type { CircuitDef, LadderDef } from '../content/types';
import { GRID, ITEMS, keyName, sizeOf, wstats } from '../content/items';
import { NOTES, type Note } from '../content/notes';
import type { Rng } from '../core/rng';
import { circuitPower, type PowerLevel } from '../world/light';

/* The game's state beyond bodies and space: power, what you carry and know, your health, your light. It is all plain
   data, so a save can write it out (step 7). What happens is reported as events for the presentation to show and play;
   what the player asks of the menus comes back in as commands, applied at the start of the next step, so a run stays a
   sequence of inputs that can be replayed. */

/** a thing carried: what, how many, and the cell of the grid its top left is in (content/items.ts, GRID) */
export interface Slot { id: string; n: number; x: number; y: number }

export type SimEvent =
  | { type: 'say'; text: string }
  /** a sound: where it came from (y, its height, when known), big for the heavy kind, d metres' worth quieter, k how hard
   *  (a landing: 0 a hop, 1 a fall that hurt) */
  | { type: 'sfx'; name: string; x?: number; y?: number; z?: number; big?: boolean; d?: number; k?: number }
  | { type: 'note'; key: string }
  | { type: 'pad' }
  | { type: 'lift' }
  /** the power changed: Gen-1 coming up (loud), anything less (a clunk), or a light switch (quiet: its own click) */
  | { type: 'power'; loud: boolean; quiet?: boolean }
  /** a light of its own went out (a dropped flashlight picked up): the level is lit again, at once */
  | { type: 'relight' }
  /** you were hurt (the screen flashes) and how hard the view shakes */
  | { type: 'hurt'; shake: number; from?: { x: number; z: number } }
  | { type: 'shake'; k: number }
  /** a blow of yours landed, on something or on a wall, this hard (0..1): the view takes a jolt */
  | { type: 'impact'; k: number }
  | { type: 'end'; win: boolean; msg: string }
  /** you are on another level now */
  | { type: 'level'; id: string }
  /** what a blow did, in numbers: for the dev readout's hit log (engine.md §6, F4) */
  | { type: 'log'; text: string };

export type Command =
  | { type: 'use'; slot: number }
  | { type: 'drop'; slot: number }
  /** move a thing in the grid, its top left to (x, y), if there is room there */
  | { type: 'move'; slot: number; x: number; y: number }
  | { type: 'light'; tool: string }
  /** put a light down (if it is on, it stays on where it lies) */
  | { type: 'putDown'; tool: string }
  /** take off something worn, into the grid where there is room */
  | { type: 'unwear'; id: string }
  | { type: 'pad'; key: string }
  | { type: 'padClose' }
  | { type: 'lift'; level: string }
  | { type: 'read'; key: string };

export interface StationState {
  circuits: Record<string, CircuitDef>;
  ladders: Record<string, LadderDef>;
  /** Gen-1 is running */
  main: boolean;
  /** a fuse is in Gen-1's socket */
  fuseIn: boolean;
  /** every level's name, and which are built */
  names: Record<string, string>;
  built: string[];
}

export interface Game {
  station: StationState | null;
  inv: Slot[];
  tools: string[];
  keys: string[];
  worn: string[];
  weapon: string | null;
  notes: Record<string, Note>;
  read: string[];
  code: string;
  code2: string;
  hp: number;
  /** charge left in the light's battery, 0..100 */
  batt: number;
  /** which light is in hand, and whether it is on */
  light: string | null;
  lightOn: boolean;
  /** the keypad in front of you: what it wants, what you have typed, which door */
  pad: { code: string; typed: string; door: number; miss?: string } | null;
  ended: { win: boolean; msg: string } | null;
  /** you asked to go to another level: which, and the mark you arrive at there. The run carries it out. */
  travel: { level: string; mark: string } | null;
  time: number;
  /** how far what you are doing carries (metres, through the air), and the last loud thing and how long it lingers */
  noise: number;
  noiseI: number;
  noiseT: number;
  /** how easily you are seen: the light where you stand, your own light, crouching */
  vis: number;
  /** things that are said once */
  once: string[];
  kills: number;
  /** dev: nothing hurts */
  god: boolean;
  events: SimEvent[];
  commands: Command[];
}

export function makeGame(rng: Rng, station: StationState | null): Game {
  const code = String(1000 + rng.int(9000)), code2 = String(1000 + rng.int(9000));
  return {
    station, inv: [], tools: [], keys: [], worn: [], weapon: null, notes: NOTES(code, code2), read: [], code, code2,
    hp: 100, batt: 100, light: null, lightOn: false, pad: null, ended: null, travel: null, time: 0,
    noise: 0, noiseI: 0, noiseT: 0, vis: 1, once: [], kills: 0, god: false, events: [], commands: [],
  };
}

/** the power on a circuit: 2 fed by Gen-1, 1 a backup set, 0 dead. A level with no station (the test bed) is all lit. */
export function power(g: Game, c: string): PowerLevel {
  const s = g.station;
  return s ? circuitPower(s.circuits, s.main, c) : 2;
}

export const say = (g: Game, text: string): void => { g.events.push({ type: 'say', text }); };
/** a line for the dev readout's hit log */
export const log = (g: Game, text: string): void => { g.events.push({ type: 'log', text }); };
/** a sound: from a place, or (without one) your own, `d` metres' worth quieter; `k` how hard, for those that vary */
export const sfx = (g: Game, name: string, at?: { x: number; y?: number; z: number }, big?: boolean, d?: number, k?: number): void => {
  g.events.push({ type: 'sfx', name, x: at?.x, y: at?.y, z: at?.z, big, d, k });
};

export const has = (g: Game, id: string): boolean => g.tools.includes(id) || g.inv.some(s => s.id === id);

export function consume(g: Game, i: number): void {
  const s = g.inv[i];
  if (--s.n <= 0) {
    g.inv.splice(i, 1);
    if (g.weapon === s.id) g.weapon = null;
  }
}

/** your hands are full: the one thing worth saying about taking something */
const FULL = 'Hands full.';

/* ---- the grid. A thing takes the cells of its size from its top left; none may share a cell or hang off the edge. */

/** whether a thing w by h has room with its top left at (x, y), among all but `skip` */
export function fits(g: Game, x: number, y: number, w: number, h: number, skip?: Slot): boolean {
  if (x < 0 || y < 0 || x + w > GRID.w || y + h > GRID.h) return false;
  return g.inv.every(q => {
    if (q === skip) return true;
    const [qw, qh] = sizeOf(q.id);
    return x >= q.x + qw || q.x >= x + w || y >= q.y + qh || q.y >= y + h;
  });
}

/** the first place a thing w by h has room, going down each column from the left, or null */
function roomFor(g: Game, w: number, h: number): { x: number; y: number } | null {
  for (let x = 0; x <= GRID.w - w; x++) for (let y = 0; y <= GRID.h - h; y++) if (fits(g, x, y, w, h)) return { x, y };
  return null;
}

/** put a thing in the grid where it has room; if nowhere, everything packed again, the biggest first, and it with them.
 *  False (and nothing moved) if it will not go even so */
function stow(g: Game, s: Slot): boolean {
  const [w, h] = sizeOf(s.id), at = roomFor(g, w, h);
  if (at) { Object.assign(s, at); g.inv.push(s); return true; }
  const all = [...g.inv, s], was = g.inv.map(q => ({ x: q.x, y: q.y })), keep = g.inv;
  const area = (q: Slot) => { const [qw, qh] = sizeOf(q.id); return qw * qh * 10 + qh; };
  g.inv = [];
  for (const q of [...all].sort((a, b) => area(b) - area(a))) {
    const [qw, qh] = sizeOf(q.id), p = roomFor(g, qw, qh);
    if (!p) { g.inv = keep; keep.forEach((k, i) => Object.assign(k, was[i])); return false; }
    Object.assign(q, p);
    g.inv.push(q);
  }
  g.inv = all; // in the order they were taken
  return true;
}

/** move what is in slot i so its top left is at (x, y), if it has room there */
export function moveSlot(g: Game, i: number, x: number, y: number): void {
  const s = g.inv[i];
  if (!s) return;
  const [w, h] = sizeOf(s.id);
  if (fits(g, x, y, w, h, s)) { s.x = x; s.y = y; }
}

/** a save from before the grid: everything carried given a place */
export function settle(g: Game): void {
  const loose = g.inv.filter(q => q.x === undefined || q.y === undefined);
  if (!loose.length) return;
  g.inv = g.inv.filter(q => !loose.includes(q));
  for (const q of loose) if (!stow(g, q)) { g.inv.push(q); q.x = q.y = 0; }
}

/** what is worn where this would go */
const wornIn = (g: Game, id: string) => g.worn.find(k => ITEMS[k].worn === ITEMS[id].worn);

export function giveKey(g: Game, k: string): void {
  if (!g.keys.includes(k)) g.keys.push(k);
  say(g, keyName(k) + '.');
}

/** take something: into your hands, onto you, or into what you know. False if your hands are full. */
export function give(g: Game, id: string, n = 1): boolean {
  const it = ITEMS[id];
  if (!it) return false;
  /* nothing said: what you took was named while you looked at it */
  if (it.key) { if (!g.keys.includes(it.key)) g.keys.push(it.key); return true; }
  if (it.per) n *= it.per;
  /* on, if nothing is worn there; otherwise carried */
  if (it.worn && !wornIn(g, id)) {
    g.worn.push(id);
    return true;
  }
  if (it.tool) {
    if (!g.tools.includes(id)) g.tools.push(id);
    if (!g.light) g.light = id;
    return true;
  }
  const s = g.inv.find(q => q.id === id);
  if (s && it.stack) { s.n += n; return true; }
  if (!stow(g, { id, n, x: 0, y: 0 })) { say(g, FULL); sfx(g, 'deny'); return false; }
  /* into your hand if it is empty, or if this hits harder than what is in it */
  if (it.w && (!g.weapon || wstats(id).dmg > wstats(g.weapon).dmg)) g.weapon = id;
  return true;
}

export function readNote(g: Game, key: string): void {
  if (!g.notes[key]) return;
  if (!g.read.includes(key)) g.read.push(key);
  g.events.push({ type: 'note', key });
  sfx(g, 'paper');
}

/** F: switch the light in hand on or off, or switch to another light */
export function toggleLight(g: Game, want: string | null, underWater: boolean): void {
  if (want && has(g, want) && g.light !== want) { g.light = want; g.lightOn = false; }
  if (underWater && has(g, 'lantern')) g.light = 'lantern';
  if (!g.light || !has(g, g.light)) {
    g.light = has(g, 'flash') ? 'flash' : has(g, 'lantern') ? 'lantern' : null;
    if (!g.light) return;
  }
  if (!g.lightOn) {
    if (g.light === 'flash' && underWater) { sfx(g, 'deny'); return; }
    if (g.batt <= 0) {
      const i = g.inv.findIndex(s => s.id === 'batt');
      if (i < 0) { sfx(g, 'deny'); return; }
      consume(g, i); g.batt = 100;
    }
  }
  g.lightOn = !g.lightOn;
  sfx(g, 'take');
}

/** a step of the light: the battery runs down, and a fresh one goes in when it dies, if you have one */
export function runLight(g: Game, dt: number, underWater: boolean): void {
  if (g.lightOn && g.light === 'flash' && underWater) { g.lightOn = false; sfx(g, 'deny'); }
  if (!g.lightOn) return;
  g.batt -= (dt * 100) / (g.light === 'flash' ? 270 : 420);
  if (g.batt <= 0) {
    const i = g.inv.findIndex(s => s.id === 'batt');
    if (i >= 0) { consume(g, i); g.batt = 100; sfx(g, 'take'); }
    else { g.batt = 0; g.lightOn = false; }
  }
}

/** use what is in a slot: take a weapon in hand, eat, bandage, change a battery */
export function useItem(g: Game, i: number): void {
  const s = g.inv[i];
  if (!s) return;
  const it = ITEMS[s.id];
  if (it.w) g.weapon = g.weapon === s.id ? null : s.id;
  else if (it.heal) {
    if (g.hp >= 100) sfx(g, 'deny');
    else { g.hp = Math.min(100, g.hp + it.heal); consume(g, i); sfx(g, 'eat'); }
  } else if (s.id === 'batt') {
    if ((!has(g, 'flash') && !has(g, 'lantern')) || g.batt > 90) sfx(g, 'deny');
    else { g.batt = 100; consume(g, i); sfx(g, 'take'); }
  } else if (it.worn) {
    /* on; what was worn there comes off into the grid, where this was if nowhere else */
    const old = wornIn(g, s.id);
    g.inv.splice(i, 1);
    if (old) {
      g.worn.splice(g.worn.indexOf(old), 1);
      if (!stow(g, { id: old, n: 1, x: 0, y: 0 })) { g.worn.push(old); g.inv.splice(i, 0, s); say(g, FULL); sfx(g, 'deny'); return; }
    }
    g.worn.push(s.id);
    sfx(g, 'take');
  } else sfx(g, 'deny'); // used where it goes: a fuse, a kit; rounds go in a gun
}

/** take off something worn: it goes into the grid, if there is room */
export function unwear(g: Game, id: string): void {
  const k = g.worn.indexOf(id), it = ITEMS[id];
  if (k < 0 || !it) return;
  if (!stow(g, { id, n: 1, x: 0, y: 0 })) { say(g, FULL); sfx(g, 'deny'); return; }
  g.worn.splice(k, 1);
  sfx(g, 'take');
}

/** say it the first time only */
export function sayOnce(g: Game, key: string, text: string): void {
  if (g.once.includes(key)) return;
  g.once.push(key);
  say(g, text);
}

/** something loud happened here: for half a second it carries this far */
export function makeNoise(g: Game, r: number): void {
  g.noiseI = Math.max(g.noiseI, r);
  g.noiseT = 0.5;
}

/** hurt by something with hands or teeth: what you wear takes some of it */
export function hurtBy(g: Game, dmg: number, why: string, from?: { x: number; z: number }): void {
  let k = 1;
  if (g.worn.includes('tacvest')) k *= 0.55;
  else if (g.worn.includes('armor')) k *= 0.7;
  if (g.worn.includes('hardhat')) k *= 0.9;
  hurt(g, dmg * k, why, 0.45, true, from);
}

/** `from`: where the blow came from, if it came from somewhere (the view is knocked away from it) */
export function hurt(g: Game, dmg: number, why: string, shake = 0.45, sound = true, from?: { x: number; z: number }): void {
  if (g.ended || g.god) return;
  g.hp -= dmg;
  if (sound) sfx(g, 'hurt');
  g.events.push({ type: 'hurt', shake, from });
  if (g.hp <= 0) { g.hp = 0; end(g, false, why); }
}

export function end(g: Game, win: boolean, msg: string): void {
  if (g.ended) return;
  g.ended = { win, msg };
  g.events.push({ type: 'end', win, msg });
}
