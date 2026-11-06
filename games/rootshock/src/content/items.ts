/* Everything that can be carried, as the first engine had it. A weapon carries its handling (w); stackable things count
   (stack, and per: how many come in one find); a tool is a light; worn things go on, each in its place; a key is not
   carried but known. What is carried takes room in a grid (GRID): most things a cell, long and big things more (size). */

/** what you carry things in: cells across and down */
export const GRID = { w: 8, h: 3 };

/** where a worn thing goes on you: one of each */
export type WornSlot = 'body' | 'head' | 'eyes' | 'breath';
export const WORN_SLOTS: WornSlot[] = ['body', 'head', 'eyes', 'breath'];

/** the way a swung thing travels (engine.md §6, F3b): side to side, right to left, or back the other way, left to
 *  right (a backhand); a chop, straight down from over your head; or straight out, a thrust */
export type Shape = 'side' | 'back' | 'chop' | 'thrust';

export interface WeaponDef {
  mass: number;
  type?: 'blunt' | 'edge' | 'fist';
  /** how it is swung when you choose no other way (sim/combat.ts, wayOf): side by default */
  shape?: Shape;
  len?: number;
  gun?: boolean;
  dmg?: number;
  range?: number;
  cone?: number;
  ammo?: string;
  cd?: number;
}

export interface ItemDef {
  /** its name */
  n: string;
  /** what it is, in a line */
  d?: string;
  w?: WeaponDef;
  stack?: boolean;
  /** how many in one find (rounds in a box) */
  per?: number;
  heal?: number;
  tool?: boolean;
  /** worn, and where */
  worn?: WornSlot;
  /** the cells it takes in the grid, across and down (1 by 1 if not said) */
  size?: [number, number];
  /** knowing it opens things: the key it stands for */
  key?: string;
}

export const ITEMS: Record<string, ItemDef> = {
  baton: { n: "Guard's baton", d: 'Rubber over a steel core, 1.1 kg. Better than your hands.', w: { mass: 1.1, type: 'blunt', len: 0.5 }, size: [1, 2] },
  pipe: { n: 'Lead pipe', d: 'A metre of old plumbing, 2.4 kg. Slow. It ends arguments.', w: { mass: 2.4, type: 'blunt', len: 0.7 }, size: [1, 3] },
  wrench: { n: 'Pipe wrench', d: 'Steel, 1.6 kg. Quicker than the pipe, lighter on arrival.', w: { mass: 1.6, type: 'blunt', len: 0.45 }, size: [1, 2] },
  adjwrench: { n: 'Adjustable wrench', d: "Chrome steel, 1.1 kg. An engineer's tool. Handy, not heavy.", w: { mass: 1.1, type: 'blunt', len: 0.4 }, size: [1, 2] },
  pistol: { n: 'Service pistol', d: '9 mm. One click, one round. Everything on the floor hears it.', w: { gun: true, dmg: 36, range: 32, cone: 0.985, ammo: 'ammo9', cd: 0.38, mass: 0.9 }, size: [1, 2] },
  shotgun: { n: 'Shotgun', d: '12 gauge. Ruinous up close, a suggestion at distance.', w: { gun: true, dmg: 105, range: 15, cone: 0.93, ammo: 'shells', cd: 1.05, mass: 3.2 }, size: [1, 3] },
  ammo9: { n: '9 mm rounds', d: 'Loose rounds for the pistol.', stack: true, per: 12 },
  shells: { n: 'Shotgun shells', d: '12 gauge.', stack: true, per: 6 },
  knife: { n: 'Kitchen knife', d: '200 g of edge. Fast. You have to stand very close.', w: { mass: 0.2, type: 'edge', len: 0.25, shape: 'thrust' }, size: [1, 2] },
  axe: { n: 'Fire axe', d: '3.2 kg with an edge. Every swing is a commitment.', w: { mass: 3.2, type: 'edge', len: 0.9, shape: 'chop' }, size: [1, 3] },
  flash: { n: 'Flashlight', tool: true },
  lantern: { n: 'Dive lantern', tool: true },
  batt: { n: 'Battery', d: 'A fresh cell. Fits the flashlight and the lantern.', stack: true },
  medkit: { n: 'Trauma kit', d: 'Restores most of your health.', heal: 60 },
  bandage: { n: 'Bandage', d: 'Stops the bleeding.', heal: 25, stack: true },
  ration: { n: 'Ration bar', d: 'Dense, grey, edible.', heal: 8, stack: true },
  peaches: { n: 'Canned peaches', d: 'Syrup and all.', heal: 14, stack: true },
  fuse: { n: 'Main fuse', d: 'Ceramic cartridge fuse, heavy as a brick. Fits a generator bus.', size: [2, 1] },
  kit: { n: 'Splice kit', d: 'Crimps, sleeves, a length of heavy cable. Mends one broken service connection.', size: [2, 1] },
  armor: { n: 'Stab vest', worn: 'body', size: [2, 2] },
  hardhat: { n: 'Hard hat', worn: 'head' },
  tacvest: { n: 'Tactical vest', worn: 'body', size: [2, 2] },
  goggles: { n: 'Swim goggles', worn: 'eyes' },
  rebreather: { n: 'Rebreather', worn: 'breath' },
  surf: { n: 'Surface lift pass', key: 'surf' },
  liftkey: { n: "Director's lift key", key: 'lift' },
};

const KEYN: Record<string, string> = {
  s: 'Security keycard', o: 'Operations pass', h: 'Horticulture security pass', e: 'Engineering keycard', surf: 'Surface lift pass', lift: "Director's lift key",
};
export const keyName = (k: string): string => KEYN[k] ?? 'Room card, Residence ' + k;

/** the cells a thing takes in the grid, across and down */
export const sizeOf = (id: string): [number, number] => ITEMS[id]?.size ?? [1, 1];

/** how a weapon handles, from its mass and kind, as the first engine worked it out: damage, the time to load a swing
 *  (before the wind-up's own .15), reach (an arm, 0.8 m, and what is in it), stun. Bare hands when there is none. */
export interface WeaponStats {
  /** what kind of thing it is: blunt, edged, your fists, or a gun */
  kind: 'blunt' | 'edge' | 'fist' | 'gun';
  /** how it is swung (a gun's is never asked) */
  shape: Shape;
  dmg: number;
  /** seconds to load a swing (before the wind-up's own .15) */
  time: number;
  reach: number;
  stun: number;
  mass: number;
  gun?: boolean;
  range?: number;
  cone?: number;
  ammo?: string;
  cd?: number;
}

export function wstats(id: string | null): WeaponStats {
  const w = (id && ITEMS[id]?.w) || { mass: 0.6, type: 'fist' as const, len: 0 };
  if (w.gun) return { kind: 'gun', shape: 'thrust', time: 0.3, reach: 0, stun: 0.5, dmg: w.dmg ?? 0, mass: w.mass, gun: true, range: w.range, cone: w.cone, ammo: w.ammo, cd: w.cd };
  const dmg = w.type === 'edge' ? 14 + 9 * w.mass : w.type === 'fist' ? 5 : 12 * Math.pow(w.mass, 0.85);
  return { kind: w.type ?? 'blunt', shape: w.shape ?? (w.type === 'fist' ? 'thrust' : 'side'), dmg, time: 0.3 + 0.2 * w.mass, reach: 0.8 + (w.len ?? 0), stun: 0.15 + 0.2 * w.mass, mass: w.mass };
}

