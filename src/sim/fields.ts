import { buildNav, DROP, Edge, field, fitting, NAV_R, STEP_UP, type Nav, type Rules } from '../world/nav';
import { power } from './game';
import { locked, needs, type Door, type Platform } from './movers';
import type { Sim } from './sim';

/* How far every spot is from you, for each way of getting about, and for sound (engine.md §7, §8). Kept fresh in
   rotation: one field a step, so each is at most a few steps old and no single step pays for all of them.

   A way (WAYS) is what a body needs and can do to get about: the headroom it needs, how wide it is, the step it walks up
   and the drop it takes, the doors it gets through, and whether it can call a platform. Each kind of the cast walks one
   (sim/cast.ts, MT); a new kind that fits none of these is a new row, and gets a field of its own on a level whose cast
   walks it. Its size keeps it to where it fits (`sized`); its body climbs what its way does (body.ts, `climb`). Who
   passes a door (as the first engine had it):
   - under: a door that is open, or jammed part open (they go under), or one that opens by itself for anything near;
   - hands: any door a hand can work: not welded, not a panel, not the lift's, not jammed, not heavy, not locked;
   - none: no doors at all. They are too big for the frames.
   Platforms: anything rides one that goes by itself; a hand can call one that has power.
   A refuge (`safe`) is only kept out of the cast's rounds; a hunter follows you into one, as it always did. */

export interface Way {
  /** the headroom it needs (m): no spot lower than this is on its way anywhere */
  head: number;
  /** how wide it is (m, a radius): no spot or link narrower is on its way. The graph is made for NAV_R (world/nav.ts) */
  r: number;
  /** the highest step it walks up, and the deepest drop it takes (m) */
  climb: number; drop: number;
  doors: 'none' | 'under' | 'hands';
  /** it calls a platform with power to it */
  call: boolean;
}

export const WAYS = {
  /* skitters, worms */
  crawl: { head: 1, r: NAV_R, climb: STEP_UP, drop: DROP, doors: 'under', call: false },
  /* Security's staff */
  hands: { head: 1.8, r: NAV_R, climb: STEP_UP, drop: DROP, doors: 'hands', call: true },
  /* the bloats, the thresher */
  big: { head: 2.2, r: NAV_R, climb: STEP_UP, drop: DROP, doors: 'none', call: false },
} satisfies Record<string, Way>;
export type Walker = keyof typeof WAYS;

/** the ways every level keeps a field for, walked or not, as the first engine did; any other only where it is walked */
const KEPT: Walker[] = ['crawl', 'hands', 'big'];

export interface Fields {
  nav: Nav;
  /** how far each spot is from you by foot, for each way walked on this level */
  ways: Record<string, Float32Array>;
  /** how far a sound made where you are travels to each spot: closed doors muffle it */
  sound: Float32Array;
  /** the fields made in turn, one a step: the ways, then sound */
  order: string[];
  /** spots on a platform at its low end: which platform, or -1 */
  onLift: Int16Array;
  /** the spot you were on when they were made */
  from: number;
  turn: number;
  /** for each way, the spots too low or too narrow for it; and for a way wider than the graph's own, where in each spot's
   *  square it stands (world/nav.ts, fitting) */
  low: Record<string, Uint8Array>;
  at: Record<string, Float32Array | null>;
  /** the spots in each door */
  doorSpots: number[][];
  /** the rules each way walks by, made once a step at most; one that carries its card has its own ('hands+cards') */
  rules: Map<string, { tick: number; R: Rules }>;
  /** what each field was last made from */
  made: Record<string, string>;
}

/* the graph depends only on the level's fixed shape, so every run of a level shares one */
const navs = new WeakMap<object, Nav>();

export function makeFields(sim: Sim): Fields {
  const def = sim.world.def, all: Way[] = Object.values(WAYS);
  let nav = navs.get(def);
  /* the graph has the links for the highest step and deepest drop of any way there is */
  const most = { climb: Math.max(...all.map(W => W.climb)), drop: Math.max(...all.map(W => W.drop)) };
  if (!nav) navs.set(def, (nav = buildNav(sim.world, sim.doors.map(d => d.def), sim.platforms.map(p => p.def), most)));
  const n = nav.n;
  const onLift = new Int16Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    sim.platforms.forEach((p, k) => {
      const D = p.def;
      if (nav.x[i] > D.x0 && nav.x[i] < D.x1 && nav.z[i] > D.z0 && nav.z[i] < D.z1 && Math.abs(nav.y[i] - D.y0) < 0.4) onLift[i] = k;
    });
  }
  const doorSpots: number[][] = sim.doors.map(() => []);
  for (let i = 0; i < n; i++) if (nav.door[i] >= 0) doorSpots[nav.door[i]].push(i);
  const F: Fields = {
    nav, ways: {}, sound: new Float32Array(n).fill(Infinity), order: ['sound'], onLift, from: -1, turn: 0, low: {}, at: {}, doorSpots,
    rules: new Map([['sound', blank(sim, n, true)]]), made: {},
  };
  F.rules.get('sound')!.R.edges = sized(sim, nav, SOUND).edges;
  const walked = new Set<string>(sim.cast.map(m => m.walker));
  for (const w of Object.keys(WAYS) as Walker[]) if (KEPT.includes(w) || walked.has(w)) addWay(sim, F, w);
  return F;
}

/** rules with nothing in them yet: who may not enter where, what entering costs (sound only), which platforms */
const blank = (sim: Sim, n: number, enter: boolean): { tick: number; R: Rules } => ({ tick: -1, R: { blocked: new Uint8Array(n), enter: enter ? new Float32Array(n) : null, lifts: new Uint8Array(sim.platforms.length), drop: enter ? 0 : 0.5, edges: null } });

/** sound goes over the steps and drops a husk walks, as it always has, whatever else is walked */
const SOUND: Way = { head: 0, r: 0, climb: STEP_UP, drop: DROP, doors: 'none', call: false };

/** where a way's size keeps it off: the spots too low or too narrow for it, and the links it may take (null: every one).
 *  By the level's shape alone, so made once a graph and way. A way no wider than the graph's own and taking every step
 *  and drop the graph has needs no list of links, and asks nothing of where a wider body fits (world/nav.ts, fitting) */
const sizes = new WeakMap<Nav, Map<Way, { low: Uint8Array; edges: Uint8Array | null; at: Float32Array | null }>>();
export function sized(sim: Sim, nav: Nav, W: Way): { low: Uint8Array; edges: Uint8Array | null; at: Float32Array | null } {
  let byWay = sizes.get(nav);
  if (!byWay) sizes.set(nav, (byWay = new Map()));
  let S = byWay.get(W);
  if (S) return S;
  const wide = W.r > NAV_R, C = wide ? fitting(sim.world, nav, W.r) : null, low = new Uint8Array(nav.n);
  for (let i = 0; i < nav.n; i++) if (nav.head[i] < W.head || (C && !C.spot[i])) low[i] = 1;
  let edges: Uint8Array | null = null;
  if (wide || W.climb < nav.most.climb || W.drop < nav.most.drop) {
    edges = new Uint8Array(nav.to.length);
    for (let a = 0; a < nav.n; a++)
      for (let e = nav.start[a]; e < nav.start[a + 1]; e++) {
        const fall = nav.kind[e] === Edge.Drop ? nav.y[a] - nav.y[nav.to[e]] : 0;
        edges[e] = nav.climb[e] <= W.climb && fall <= W.drop && (!C || C.edge[e]) ? 1 : 0;
      }
  }
  byWay.set(W, (S = { low, edges, at: C ? C.at : null }));
  return S;
}

/** a field for a way, if there is none yet: made in its turn, before sound's */
function addWay(sim: Sim, F: Fields, w: Walker): void {
  if (F.ways[w]) return;
  F.ways[w] = new Float32Array(F.nav.n).fill(Infinity);
  const S = sized(sim, F.nav, WAYS[w]);
  F.low[w] = S.low; F.at[w] = S.at;
  F.order.splice(F.order.length - 1, 0, w);
}

/** one of the cast put down on a level that walks a way the level's own did not (dev, the arena): its field, made now */
export function walkedHere(sim: Sim, F: Fields, w: Walker): void {
  if (F.ways[w]) return;
  addWay(sim, F, w);
  if (F.from >= 0) field(F.nav, F.from, rulesFor(sim, F, w), F.ways[w], LIMIT.walk);
}

const isOpen = (d: Door) => d.t > 0.9;
/** a light door on a live circuit, not locked: it opens for whatever comes near */
export const opensItself = (d: Door, pw: number) => {
  const D = d.def;
  return D.kind === 'light' && !(D.stuck || D.vent || D.seal || D.lift) && pw > 0 && !locked(d);
};
/** a door no hand can work */
export const doorShut = (d: Door) => {
  const D = d.def;
  return D.seal || D.vent || D.lift || D.stuck || D.kind === 'heavy' || locked(d);
};

/** a card door the staff can show their card to: on a level whose staff carry them, one their cards open (not the
 *  medical staff's), with power enough to move it, and not locked down (an alarm's bolt beats a card) */
export const carded = (sim: Sim, d: Door): boolean => {
  const D = d.def;
  return !!sim.world.def.cards && !!D.card && !D.code && !d.down && !(D.seal || D.vent || D.lift || D.stuck)
    && power(sim.game, D.circuit) >= needs(D);
};

/** may a body that gets about this way enter the door it is walking into? One with hands that carries its card, a card
 *  door it can show it to */
export function doorPasses(sim: Sim, d: Door, who: Walker, cards = false): boolean {
  const W = WAYS[who];
  if (W.doors === 'none') return false;
  if (isOpen(d)) return true;
  const pw = power(sim.game, d.def.circuit);
  if (opensItself(d, pw)) return true;
  if (cards && W.doors === 'hands' && carded(sim, d)) return true;
  return W.doors === 'under' ? d.def.stuck : !doorShut(d);
}

/** may it take this platform? */
export function liftPasses(sim: Sim, p: Platform, who: Walker): boolean {
  if (!p.def.call) return true;
  return WAYS[who].call && power(sim.game, p.def.call.circuit) > 0;
}

/** the rules for one way as the doors and platforms stand now: made once a step at most, and shared */
export function rulesFor(sim: Sim, F: Fields, who: Walker, cards = false): Rules {
  const staff = cards && WAYS[who].doors === 'hands', key = staff ? `${who}+cards` : who;
  let c = F.rules.get(key);
  if (!c) { F.rules.set(key, (c = blank(sim, F.nav.n, false))); c.R.edges = sized(sim, F.nav, WAYS[who]).edges; }
  if (c.tick === sim.tick) return c.R;
  const R = c.R;
  R.blocked.set(F.low[who]);
  sim.doors.forEach((d, k) => { if (!doorPasses(sim, d, who, staff)) for (const i of F.doorSpots[k]) R.blocked[i] = 1; });
  sim.platforms.forEach((p, k) => { R.lifts[k] = liftPasses(sim, p, who) ? 1 : 0; });
  c.tick = sim.tick;
  return R;
}

/** the rules for a round's route: by the level's shape alone (headroom, which platforms it can ever take), not by how
 *  the doors stand. Doors are met as they come (a shut one is worked, waited at, or the round given up), and the route
 *  can be made again exactly from a save. */
const routes = new WeakMap<Fields, Partial<Record<Walker, Rules>>>();
export function routeRules(sim: Sim, F: Fields, who: Walker): Rules {
  let c = routes.get(F);
  if (!c) routes.set(F, (c = {}));
  return (c[who] ??= {
    blocked: F.low[who], enter: null, drop: 0.5, edges: sized(sim, F.nav, WAYS[who]).edges,
    lifts: Uint8Array.from(sim.platforms, p => (!p.def.call || WAYS[who].call ? 1 : 0)),
  });
}

/** sound goes where air goes: through open doors freely, through shut ones muffled; not up a lift shaft's ride */
export function soundRules(sim: Sim, F: Fields): Rules {
  const R = F.rules.get('sound')!.R, e = R.enter!;
  sim.doors.forEach((d, k) => {
    const v = d.t > 0.5 ? 0 : d.def.kind === 'heavy' || d.def.seal ? 12 : 6;
    for (const i of F.doorSpots[k]) e[i] = v;
  });
  return R;
}

/** how far out each field is worth making: past it nothing could use it. A hunt is given up long before 90 m of
 *  corridor; the loudest thing you do (a gun) carries 36. */
const LIMIT = { walk: 90, sound: 40 } as const;

/** what a field was last made from: where you stood and how the doors and platforms stood */
function stateKey(sim: Sim, F: Fields, w: string): string {
  let k = String(F.from);
  if (w === 'sound') { for (const d of sim.doors) k += d.t > 0.5 ? '1' : '0'; return k; }
  const R = rulesFor(sim, F, w as Walker);
  sim.doors.forEach((_d, i) => { const s = F.doorSpots[i]; k += s.length && R.blocked[s[0]] ? '0' : '1'; });
  for (const l of R.lifts) k += l;
  return k;
}

/** a step of upkeep: the next field in turn, made again only if you have moved or a door or platform has changed */
export function updateFields(sim: Sim, F: Fields): void {
  const b = sim.player.body, at = F.nav.locate(b.x, b.y, b.z);
  if (at >= 0) F.from = at;
  if (F.from < 0) return;
  const w = F.order[F.turn++ % F.order.length], key = stateKey(sim, F, w);
  if (F.made[w] === key) return;
  F.made[w] = key;
  if (w === 'sound') field(F.nav, F.from, soundRules(sim, F), F.sound, LIMIT.sound);
  else field(F.nav, F.from, rulesFor(sim, F, w as Walker), F.ways[w], LIMIT.walk);
}

/** the hands' field for those who carry their cards, through the card doors their cards open: made when one of them
 *  wants it (after you, behind a door the hands' own field will not go through), and kept only as a cache, being made
 *  from where you are and how the doors stand alone */
const staffs = new WeakMap<Fields, { key: string; F: Float32Array }>();
export function staffField(sim: Sim, F: Fields): Float32Array {
  const R = rulesFor(sim, F, 'hands', true);
  let k = String(F.from);
  for (const s of F.doorSpots) k += s.length && R.blocked[s[0]] ? '0' : '1';
  for (const l of R.lifts) k += l;
  let c = staffs.get(F);
  if (!c) staffs.set(F, (c = { key: '', F: new Float32Array(F.nav.n) }));
  if (c.key !== k) { c.key = k; field(F.nav, F.from, R, c.F, LIMIT.walk); }
  return c.F;
}

/** every field now (at the start, or after a jump in place) */
export function refreshFields(sim: Sim, F: Fields): void {
  for (let k = 0; k < F.order.length; k++) updateFields(sim, F);
}
