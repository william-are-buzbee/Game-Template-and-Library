import type { DoorDef, LevelDef, UseDef } from '../content/types';
import { ITEMS } from '../content/items';
import { NOTES } from '../content/notes';
import { Edge, type Nav } from '../world/nav';
import { power, type Game, type StationState } from './game';
import { makeFields } from './fields';
import { needs } from './movers';
import type { Sim } from './sim';
import { airFor } from './player';

/* The progression checker (world.md §4, engine.md §10). It plays the level as a puzzle, not as a game: what you hold
   and know, how the power stands, and where you can get to, with the real nav graph and the real door rules. From a
   start (or any save) it searches every state you could bring about, and reports:
   - what you can reach at all (rooms, things, ways off the level) and what you never can;
   - the shortest list of things to do to reach each way off;
   - soft-locks: states you can get into from which something you could have reached is gone for good (a kit spent on
     the wrong panel, a fuse used where it does not help);
   - dead ends: places you can drop into and not get out of.
   - air: where the water fills a room to its roof you swim on what breath you have, so a place counts as in reach only
     if you can get there and on to air (or a way out) before it runs out, starting from the air you have now; with a
     rebreather on you can hold more. Each thing in reach is in reach on its own: one breath is not planned around
     several. Through a dive into such water, `through` says what the far side holds on the breath you would take.
   It does not model fights, light, or falls longer than a body can take (a drop over 2.5 m is not on the graph).
   Power only ever helps (a lock without it stays shut), so switching on is taken as done like a key picked up, and
   switching off is never tried: it cannot open a way, and what can be switched back cannot lose one. */

/** what the puzzle turns on */
interface St {
  /** keys, codes known ('#1', '#2'), bodies searched ('b<use>'), things taken ('i<item>'), doors unlocked ('d<door>') */
  have: Set<string>;
  fuse: number;
  kit: number;
  station: StationState;
  /** where you are: a nav spot */
  at: number;
  /** the breath you have there, in seconds */
  air: number;
}

export interface Report {
  /** distinct states searched */
  states: number;
  rooms: { reached: string[]; never: string[] };
  items: { reached: string[]; never: string[] };
  /** ways off the level (ladders, stairs, dives, lifts, the surface) and the shortest route to each */
  goals: Record<string, string[]>;
  /** each: what is lost, and the route that loses it */
  softLocks: { lost: string[]; route: string[] }[];
  /** places you can drop into and not get out of: a room, and how you got there */
  deadEnds: { room: string; route: string[] }[];
  /** your breath where you stand, and the most you can hold */
  air: { now: number; max: number };
  /** for each dive down into water with no air in it: the breath you would go in with, and what you could reach there */
  through: Record<string, { air: number; rooms: string[]; never: string[]; goals: string[] }>;
}

export interface CheckOpts {
  /** facts from elsewhere taken as given: Gen-1 running (it is on another level), codes or keys known */
  main?: boolean;
  have?: string[];
  /** stop after this many states */
  limit?: number;
  /** start here instead of where the sim's player stands, with this much air */
  from?: { x: number; y: number; z: number; air: number };
  /** take a rebreather as worn */
  rebreather?: boolean;
  /** the far side of a dive, to look through it: the level as it stands, or null */
  through?: (level: string) => Sim | null;
}

const RELEVANT = new Set(['fuse', 'kit', 'rebreather']);
/** how fast you swim (player.ts), to count the breath a swim takes */
const SWIM_SPEED = 2.4;

/** what the puzzle needs to know about the level: precomputed once */
interface Model {
  nav: Nav;
  level: LevelDef;
  /** spots something can be reached from (within its reach, standing below it), for each use, item and note */
  useAt: number[][];
  itemAt: number[][];
  noteAt: number[][];
  /** notes that give the codes away */
  codeNotes: Map<string, '#1' | '#2'>;
  /** each door's reader or keypad: where you stand to use it */
  doorAt: number[][];
  /** the surface lift doors: where you stand to use them */
  liftDoorAt: Map<number, number[]>;
  /** what each item lying about is */
  itemIds: string[];
  /** Gen-1 was off at the start, so starting it is something to do */
  mainGoal: boolean;
  /** spots under water with no air over them: a body there cannot get its head out */
  airless: Uint8Array;
  wet: boolean;
  /** spots where a dive comes up into air: a way out of the water as good as air */
  exit: Uint8Array;
}

export function spotsNear(nav: Nav, x: number, y: number, z: number, r: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < nav.n; i++) {
    const dy = y - nav.y[i];
    if (dy < -0.5 || dy > 2.5) continue;
    if (Math.hypot(nav.x[i] - x, nav.z[i] - z) <= r) out.push(i);
  }
  return out;
}

function model(sim: Sim, nav: Nav): Model {
  const L = sim.world.def;
  const probe = NOTES('\u0001', '\u0002'), codeNotes = new Map<string, '#1' | '#2'>();
  for (const [k, n] of Object.entries(probe)) {
    if (n.b.includes('\u0001')) codeNotes.set(k, '#1');
    else if (n.b.includes('\u0002')) codeNotes.set(k, '#2');
  }
  const liftDoorAt = new Map<number, number[]>();
  L.doors.forEach((D, k) => { if (D.lift) liftDoorAt.set(k, spotsNear(nav, (D.x0 + D.x1) / 2, D.y0 + 1.3, (D.z0 + D.z1) / 2, 2.6)); });
  /* where your head stays under: the water over the spot is higher than you can get your eyes (the roof less a hand) */
  const airless = new Uint8Array(nav.n), exit = new Uint8Array(nav.n), useAt = L.uses.map(u => spotsNear(nav, u.x, u.y, u.z, 2.4));
  for (let i = 0; i < nav.n; i++) if (sim.world.waterAt(nav.x[i], nav.z[i]) > nav.y[i] + nav.head[i] - 0.18) airless[i] = 1;
  L.uses.forEach((u, ui) => { if (u.kind === 'dive' && !u.opts.under) for (const i of useAt[ui]) exit[i] = 1; });
  return {
    nav, level: L, codeNotes, liftDoorAt, doorAt: L.doors.map(D => spotsNear(nav, (D.x0 + D.x1) / 2, D.y0 + 1.3, (D.z0 + D.z1) / 2, 2.6)), itemIds: sim.items.map(it => it.id), mainGoal: false,
    airless, wet: airless.some(v => v === 1), exit, useAt,
    itemAt: sim.items.map(it => spotsNear(nav, it.x, it.y + 0.05, it.z, 2)),
    noteAt: L.notes.map(n => spotsNear(nav, n.x, n.y + 0.05, n.z, 2)),
  };
}

const pw = (st: St, c: string) => power({ station: st.station } as Game, c);

/** may you go through this door, as things stand? */
function passDoor(D: DoorDef, k: number, st: St): boolean {
  if (D.seal || D.lift) return false;
  if (D.stuck || D.vent) return true; // under it, crouching; a loose panel prised off
  const p = pw(st, D.circuit);
  /* fail-secure: locked until a card or code has opened it, which takes power at the time */
  const lockedNow = !!(D.card || D.code) && !st.have.has('d' + k);
  if (D.kind === 'heavy') return p >= needs(D) && !lockedNow;
  return !lockedNow; // powered it opens for you; dead, it slides by hand
}

/** how the doors and platforms stand for you: what decides where you can go */
function passKey(M: Model, st: St): string {
  return M.level.doors.map((D, k) => (passDoor(D, k, st) ? 1 : 0)).join('') + M.level.platforms.map(P => (!P.call || pw(st, P.call.circuit) >= 1 ? 1 : 0)).join('');
}

/** everywhere you can get to from where you stand (and, under water, get on from to air): with the breath you would
 *  have on getting there, where it counts */
type Reach = Uint8Array & { air?: Float32Array };
const airMax = (st: St) => airFor(st.have.has('rebreather') ? ['rebreather'] : []);
function flood(M: Model, st: St): Reach {
  if (M.wet) return floodBreath(M, st);
  const nav = M.nav, seen = new Uint8Array(nav.n), q = [st.at];
  const doorOk = M.level.doors.map((D, k) => passDoor(D, k, st));
  const liftOk = M.level.platforms.map(P => !P.call || pw(st, P.call.circuit) >= 1);
  seen[st.at] = 1;
  while (q.length) {
    const a = q.pop()!;
    for (let e = nav.start[a]; e < nav.start[a + 1]; e++) {
      const b = nav.to[e];
      if (seen[b]) continue;
      if (nav.door[b] >= 0 && !doorOk[nav.door[b]]) continue;
      if (nav.kind[e] === Edge.Lift && !liftOk[nav.lift[e]]) continue;
      seen[b] = 1;
      q.push(b);
    }
  }
  return seen;
}

/** the flood, counting breath. First, from every spot, the least breath it takes to get to air (or a dive up into it);
 *  then, from where you stand, the most breath you can have on reaching each spot. A spot is in reach if what you would
 *  have there is enough to get on to air. */
function floodBreath(M: Model, st: St): Reach {
  const nav = M.nav, n = nav.n, max = airMax(st), back = backEdges(nav);
  const doorOk = M.level.doors.map((D, k) => passDoor(D, k, st));
  const liftOk = M.level.platforms.map(P => !P.call || pw(st, P.call.circuit) >= 1);
  const open = (e: number, b: number) => !(nav.door[b] >= 0 && !doorOk[nav.door[b]]) && !(nav.kind[e] === Edge.Lift && !liftOk[nav.lift[e]]);
  const cost = (e: number, a: number, b: number) => (M.airless[a] || M.airless[b] ? nav.len[e] / SWIM_SPEED : 0);
  /* the breath each spot needs to get out: backwards from air */
  const need = new Float32Array(n).fill(Infinity), h1 = new Heap();
  for (let i = 0; i < n; i++) if (!M.airless[i] || M.exit[i]) { need[i] = 0; h1.push(i, 0); }
  for (let i = h1.pop(); i >= 0; i = h1.pop()) {
    for (let k = back.start[i]; k < back.start[i + 1]; k++) {
      const e = back.edge[k], a = back.from[k];
      if (!open(e, i)) continue;
      const v = need[i] + cost(e, a, i);
      if (v < need[a]) { need[a] = v; h1.push(a, v); }
    }
  }
  /* the breath you can have on reaching each spot: forwards from you */
  const best = new Float32Array(n).fill(-1), h2 = new Heap();
  best[st.at] = M.airless[st.at] ? st.air : max;
  h2.push(st.at, -best[st.at]);
  for (let a = h2.pop(); a >= 0; a = h2.pop()) {
    for (let e = nav.start[a]; e < nav.start[a + 1]; e++) {
      const b = nav.to[e];
      if (!open(e, b)) continue;
      const left = best[a] - cost(e, a, b);
      if (left < 0) continue;
      const v = M.airless[b] ? left : max;
      if (v > best[b]) { best[b] = v; h2.push(b, -v); }
    }
  }
  const seen: Reach = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (best[i] >= 0 && best[i] >= need[i] - 1e-6) seen[i] = 1;
  seen.air = best;
  return seen;
}

/** a small binary heap of spots, least key first */
class Heap {
  private k: number[] = [];
  private v: number[] = [];
  push(item: number, key: number): void {
    const k = this.k, v = this.v;
    let i = k.length;
    k.push(key); v.push(item);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= k[i]) break;
      [k[p], k[i]] = [k[i], k[p]]; [v[p], v[i]] = [v[i], v[p]];
      i = p;
    }
  }
  /** the spot with the least key, or -1 */
  pop(): number {
    const k = this.k, v = this.v;
    if (!k.length) return -1;
    const out = v[0], lk = k.pop()!, lv = v.pop()!;
    if (k.length) {
      k[0] = lk; v[0] = lv;
      for (let i = 0; ; ) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < k.length && k[l] < k[m]) m = l;
        if (r < k.length && k[r] < k[m]) m = r;
        if (m === i) break;
        [k[m], k[i]] = [k[i], k[m]]; [v[m], v[i]] = [v[i], v[m]];
        i = m;
      }
    }
    return out;
  }
}

const keyOf = (st: St) => {
  const s = st.station, c = Object.keys(s.circuits).sort().map(k => { const C = s.circuits[k]; return k + (C.on ? 1 : 0) + (C.back ? 1 : 0) + (C.broken ? 1 : 0); });
  return [st.at, [...st.have].sort().join(','), st.fuse, st.kit, s.main ? 1 : 0, s.fuseIn ? 1 : 0, c.join(''), Math.round(st.air)].join('|');
};
const clone = (st: St, at: number, air = st.air): St => ({ have: new Set(st.have), fuse: st.fuse, kit: st.kit, station: structuredClone(st.station), at, air });

/** something to do: where you do it (and the breath you have there), what it does, and whether it only ever adds (a
 *  key, a code, a thing carried) */
interface Action { id: string; label: string; at: number; air: number; mono: boolean; apply(n: St): void }
const after = (st: St, a: Action): St => { const n = clone(st, a.at, a.air); a.apply(n); return n; };

/** what you could do from here */
function actions(M: Model, st: St, R: Reach): Action[] {
  const out: Action[] = [], L = M.level;
  /* where to do it: in reach, and with the most breath left */
  const where = (spots: number[]) => {
    let best = -1;
    for (const i of spots) if (R[i] && (best < 0 || (R.air && R.air[i] > R.air[best]))) best = i;
    return best;
  };
  const breath = (at: number) => (R.air ? R.air[at] : airMax(st));
  /* things to take that matter to the puzzle (keys, fuses, kits) */
  M.itemAt.forEach((spots, i) => {
    const id = M.itemIds[i], it = ITEMS[id];
    if (st.have.has('i' + i) || !(it?.key || RELEVANT.has(id))) return;
    const at = where(spots);
    if (at < 0) return;
    out.push({
      id: 'item' + i, label: 'take ' + it.n.toLowerCase(), at, air: breath(at), mono: true,
      apply: n => { n.have.add('i' + i); if (it.key) n.have.add(it.key); if (id === 'fuse') n.fuse++; if (id === 'kit') n.kit++; if (id === 'rebreather') n.have.add('rebreather'); },
    });
  });
  /* papers that give a code away */
  M.noteAt.forEach((spots, i) => {
    const code = M.codeNotes.get(L.notes[i].key);
    if (!code || st.have.has(code)) return;
    const at = where(spots);
    if (at < 0) return;
    out.push({ id: 'note' + i, label: 'read ' + L.notes[i].key, at, air: breath(at), mono: true, apply: n => { n.have.add(code); } });
  });
  /* a reader or keypad you have the card or the code for, with power to read it: once opened, it stays unlocked */
  L.doors.forEach((D, k) => {
    if (!(D.card || D.code) || st.have.has('d' + k) || D.seal || D.lift) return;
    if (!(D.card ? st.have.has(D.card) : st.have.has('#' + D.code)) || pw(st, D.circuit) === 0) return;
    const at = where(M.doorAt[k]);
    if (at < 0) return;
    out.push({ id: 'door' + k, label: (D.card ? 'use the card at door ' : 'key the code at door ') + k, at, air: breath(at), mono: true, apply: n => { n.have.add('d' + k); } });
  });
  L.uses.forEach((u, ui) => {
    const at = where(M.useAt[ui]);
    if (at < 0) return;
    const o = u.opts as Record<string, never>, s = st.station;
    const act = (label: string, apply: (n: St) => void, mono = false) => out.push({ id: 'use' + ui, label, at, air: breath(at), mono, apply });
    switch (u.kind) {
      case 'body':
        if (st.have.has('b' + ui)) return;
        act('search the ' + ((o.label as string) ?? 'body').toLowerCase(), n => {
          n.have.add('b' + ui);
          for (const k of (o.keys as string[]) ?? []) n.have.add(k);
          if (o.note) n.have.add('#1');
        }, true);
        break;
      case 'backup': {
        const c = o.c as string, C = s.circuits[c];
        if (C && !C.back) act('start the ' + c + ' backup set', n => { n.station.circuits[c].back = true; }, true);
        break;
      }
      case 'panel': {
        const c = o.c as string, C = s.circuits[c];
        if (!C) return;
        if (C.broken) { if (st.kit > 0) act('mend the ' + c + ' connection with a kit', n => { n.kit--; Object.assign(n.station.circuits[c], { broken: false, on: true }); }); }
        else if (!C.on) act('close the ' + c + ' connection', n => { n.station.circuits[c].on = true; }, true);
        break;
      }
      case 'fuse':
        if (!s.fuseIn && st.fuse > 0) act('seat the fuse', n => { n.fuse--; n.station.fuseIn = true; });
        break;
      case 'breaker':
        if (s.fuseIn && !s.main) act('start Gen-1', n => { n.station.main = true; }, true);
        break;
    }
  });
  return out;
}

/** the ways off the level you can take from here, and Gen-1 running (if it was not at the start) */
function goals(M: Model, st: St, R: Uint8Array): string[] {
  const out: string[] = [], L = M.level, s = st.station;
  if (M.mainGoal && s.main) out.push('Gen-1 running');
  L.uses.forEach((u: UseDef, ui) => {
    if (!M.useAt[ui].some(i => R[i])) return;
    const o = u.opts as Record<string, never>;
    if (u.kind === 'ladder') {
      const S = s.ladders[o.id as string];
      if (!S || S.broken) return;
      if (S.need?.power && pw(st, S.need.power) < 1) return;
      const other = S.ends?.find(e => e !== L.id);
      out.push('ladder ' + o.id + (other ? ' to ' + (s.names[other] ?? other) : ''));
    } else if (u.kind === 'stair') out.push('stairs to ' + o.to);
    else if (u.kind === 'dive') out.push('dive to ' + (s.names[o.to as string] ?? o.to));
    else if (u.kind === 'elev' && pw(st, o.c as string) >= 1) out.push('elevator to ' + (s.names[o.to as string] ?? o.to));
    else if (u.kind === 'lift' && pw(st, 'LIFT') === 2) out.push('the lift');
  });
  for (const [k, spots] of M.liftDoorAt) {
    const D = L.doors[k];
    if (spots.some(i => R[i]) && pw(st, D.circuit) === 2 && pw(st, L.circuit) === 2 && (st.have.has('surf') || st.have.has('lift'))) out.push('the surface');
  }
  return out;
}

/** the state of a sim as the puzzle sees it */
function fromSim(sim: Sim, nav: Nav, o: CheckOpts): St {
  const g = sim.game, b = sim.player.body;
  const have = new Set<string>([...g.keys, ...(o.have ?? [])]);
  for (const k of g.read) {
    const n = g.notes[k];
    if (n?.b.includes(g.code)) have.add('#1');
    if (n?.b.includes(g.code2)) have.add('#2');
  }
  sim.items.forEach((it, i) => { if (it.taken) have.add('i' + i); });
  for (const u of sim.usables) if (u.off && u.key) have.add('b' + u.key.slice(3));
  /* in the opening, things as it leaves them: the suite's set dead, and its fail-safe locks let go */
  const opening = !!sim.opening && sim.opening.phase !== 'done';
  sim.doors.forEach((d, k) => { if (d.unlocked || (opening && d.def.failsafe)) have.add('d' + k); });
  const station: StationState = g.station ? structuredClone(g.station) : { circuits: {}, ladders: {}, main: true, fuseIn: true, names: {}, built: [] };
  if (opening && station.circuits.ISO) station.circuits.ISO.back = false;
  if (o.main !== undefined) station.main = o.main;
  /* a rebreather counts while you wear it: carried in a hand it does you no good until you put it on */
  if (g.worn.includes('rebreather') || o.rebreather) have.add('rebreather');
  const f = o.from ?? { x: b.x, y: b.y, z: b.z, air: sim.player.air };
  return {
    have, station, at: nav.locate(f.x, f.y, f.z), air: f.air,
    fuse: g.inv.find(s => s.id === 'fuse')?.n ?? 0, kit: g.inv.find(s => s.id === 'kit')?.n ?? 0,
  };
}

/** check a level from where a sim stands (a fresh one: the start; a loaded one: that save) */
export function checkProgress(sim: Sim, o: CheckOpts = {}): Report {
  const nav = (sim.fields ?? makeFields(sim)).nav, M = model(sim, nav), itemIds = M.itemIds;
  const s0 = fromSim(sim, nav, o);
  M.mainGoal = !s0.station.main;
  if (s0.at < 0) throw new Error('you are not standing anywhere on the nav graph');
  if (!M.airless[s0.at]) s0.air = airMax(s0); // where you can breathe, you can fill your lungs first
  /* breadth first over states: each remembers how it was reached, what it reaches, and where it can go next */
  const nodes: { st: St; from: number; steps: Action[]; goals: string[]; next: number[] }[] = [];
  const index = new Map<string, number>();
  const roomsSeen = new Set<number>(), itemsSeen = new Set<number>();
  const add = (st: St, from: number, steps: Action[]) => {
    const k = keyOf(st);
    if (index.has(k)) return index.get(k)!;
    index.set(k, nodes.length);
    nodes.push({ st, from, steps, goals: [], next: [] });
    return nodes.length - 1;
  };
  add(s0, -1, []);
  const limit = o.limit ?? 20000, deadEnds: Report['deadEnds'] = [], deadRooms = new Set<number>();
  /* a state is what you hold and how things stand, and where you are only as far as which places you can get to and back
     from (the region you stand in): two states alike but for which spot of the same region you did something at are one */
  const canon = new Map<string, number>(), deadSeen = new Set<string>();
  for (let n = 0; n < nodes.length && n < limit; n++) {
    const node = nodes[n], R = flood(M, node.st), back = floodBack(M, node.st);
    let rep = node.st.at;
    for (let i = 0; i < nav.n; i++) if (R[i] && back[i]) { rep = i; break; }
    const sig = passKey(M, node.st), ck = sig + '|' + rep + '|' + keyOf({ ...node.st, at: -1 });
    const same = canon.get(ck);
    if (same !== undefined) { node.next.push(same); continue; } // the same state: lead on to it
    canon.set(ck, n);
    for (let i = 0; i < nav.n; i++) if (R[i] && nav.room[i] >= 0) roomsSeen.add(nav.room[i]);
    M.itemAt.forEach((sp, i) => { if (sp.some(j => R[j])) itemsSeen.add(i); });
    node.goals = goals(M, node.st, R);
    /* what only ever adds (a key, a code, a thing carried) is taken at once, all of it within the region you stand in:
       the order of such things never matters, and taking them never closes a way. Only then is anything chosen. */
    const acts = actions(M, node.st, R);
    if (acts.some(a => a.mono && R[a.at] && back[a.at])) {
      const all = clone(node.st, node.st.at), steps: Action[] = [];
      for (let guard = 0; guard < 1000; guard++) {
        const R2 = flood(M, all), B2 = floodBack(M, all);
        /* one at a time: doing one can take another off the list (two backup sets for one circuit) */
        const a = actions(M, all, R2).find(x => x.mono && R2[x.at] && B2[x.at]);
        if (!a) break;
        a.apply(all); steps.push(a);
      }
      node.next.push(add(all, n, steps));
    } else for (const a of acts) node.next.push(add(after(node.st, a), n, [a]));
    /* dead ends: somewhere you can get to but not back from, from which nothing leads on. Asked once for each way the
       doors and platforms stand and each region: what you hold does not change where you can fall */
    if (deadSeen.has(sig + '|' + rep)) continue;
    deadSeen.add(sig + '|' + rep);
    const done = new Uint8Array(nav.n);
    for (let i = 0; i < nav.n; i++) {
      if (!R[i] || back[i] || done[i]) continue;
      /* a place you can get to but not back from: does anything lead on from it? */
      const there = clone(node.st, i, R.air ? R.air[i] : node.st.air), R2 = flood(M, there);
      let canReturn = false;
      for (let j = 0; j < nav.n; j++) if (R2[j]) { done[j] = 1; if (back[j]) canReturn = true; }
      if (canReturn || goals(M, there, R2).length || actions(M, there, R2).length) continue;
      const room = nav.room[i];
      if (deadRooms.has(room)) continue;
      deadRooms.add(room);
      deadEnds.push({ room: room >= 0 ? nameOf(sim, room) : 'nowhere', route: routeTo(nodes, n) });
    }
  }
  /* soft-locks: from each state, which goals can still be reached? (backwards over the state graph, per goal) */
  const all = new Set(nodes.flatMap(x => x.goals)), canStill = new Map<string, Uint8Array>();
  const prev: number[][] = nodes.map(() => []);
  nodes.forEach((x, i) => { for (const j of x.next) prev[j].push(i); });
  for (const goal of all) {
    const ok = new Uint8Array(nodes.length), q: number[] = [];
    nodes.forEach((x, i) => { if (x.goals.includes(goal)) { ok[i] = 1; q.push(i); } });
    while (q.length) { const j = q.pop()!; for (const i of prev[j]) if (!ok[i]) { ok[i] = 1; q.push(i); } }
    canStill.set(goal, ok);
  }
  const softLocks: Report['softLocks'] = [], seenLoss = new Set<string>();
  nodes.forEach((_x, i) => {
    const lost = [...all].filter(g => !canStill.get(g)![i]);
    const k = lost.join('|');
    if (lost.length && !seenLoss.has(k)) { seenLoss.add(k); softLocks.push({ lost, route: routeTo(nodes, i) }); }
  });
  const goalsOut: Report['goals'] = {};
  for (const goal of all) {
    /* breadth first, the first to reach it is the fewest choices; then drop whatever it took that the goal did not need */
    const i = nodes.findIndex(x => x.goals.includes(goal));
    const steps = routeSteps(nodes, i);
    for (let k = steps.length - 1; k >= 0; k--) {
      const without = steps.filter((_a, q) => q !== k);
      if (replay(M, s0, without, goal)) steps.splice(k, 1);
    }
    goalsOut[goal] = steps.map(a => a.label);
  }
  const roomName = (id: number) => nameOf(sim, id);
  const named = (ids: number[]) => [...new Set(ids.map(roomName))].sort();
  /* through each dive down into airless water: what you would reach there on the breath you would take down with you */
  const through: Report['through'] = {};
  if (o.through) for (const goal of all) {
    const i = nodes.findIndex(x => x.goals.includes(goal)), st = nodes[i].st, R = flood(M, st);
    const ui = M.level.uses.findIndex((u, k) => u.kind === 'dive' && u.opts.under && goal === 'dive to ' + (st.station.names[u.opts.to as string] ?? u.opts.to) && M.useAt[k].some(j => R[j]));
    if (ui < 0) continue;
    const to = M.level.uses[ui].opts.to as string, far = o.through(to), mark = far?.world.def.marks['dive:' + M.level.id];
    if (!far || !mark) continue;
    const at = M.useAt[ui].filter(j => R[j]).sort((a, b) => (R.air?.[b] ?? 0) - (R.air?.[a] ?? 0))[0], air = R.air ? R.air[at] : airMax(st);
    const r = checkProgress(far, { from: { ...mark, air }, rebreather: st.have.has('rebreather'), main: st.station.main });
    through[goal] = { air: Math.round(air), rooms: r.rooms.reached, never: r.rooms.never, goals: Object.keys(r.goals).sort() };
  }
  return {
    air: { now: Math.round(M.airless[s0.at] ? s0.air : airMax(s0)), max: airMax(s0) }, through,
    states: nodes.length,
    rooms: {
      reached: named([...roomsSeen]),
      /* a name never reached by any room that bears it (the Commons is many rooms; its air over the roofs is one nobody stands in) */
      never: named(sim.world.rooms.map(r => r.id).filter(id => !roomsSeen.has(id) && (nav.byRoom.get(id)?.length ?? 0) > 0))
        .filter(n => !named([...roomsSeen]).includes(n)),
    },
    items: {
      reached: [...itemsSeen].map(i => ITEMS[itemIds[i]]?.n ?? itemIds[i]).sort(),
      never: itemIds.map((id, i) => [id, i] as const).filter(([, i]) => !itemsSeen.has(i) && !sim.items[i].taken).map(([id]) => ITEMS[id]?.n ?? id).sort(),
    },
    goals: goalsOut, softLocks, deadEnds,
  };
}

/** a room by its name; a doorway (which has none) by the rooms it joins */
function nameOf(sim: Sim, id: number): string {
  const R = sim.world.rooms[id];
  if (R.name) return R.name;
  const nb = sim.world.neighbours(id).map(n => sim.world.rooms[n].name).filter(Boolean);
  return nb.length ? 'the doorway between ' + nb.join(' and ') : 'room ' + id;
}

function routeSteps(nodes: { from: number; steps: Action[] }[], i: number): Action[] {
  const out: Action[][] = [];
  for (let k = i; k > 0; k = nodes[k].from) out.push(nodes[k].steps);
  return out.reverse().flat();
}
const routeTo = (nodes: { from: number; steps: Action[] }[], i: number): string[] => routeSteps(nodes, i).map(a => a.label);

/** does doing these (by id, in order, each where it is done) reach the goal? */
function replay(M: Model, s0: St, steps: Action[], goal: string): boolean {
  let st = s0;
  for (const want of steps) {
    const a = actions(M, st, flood(M, st)).find(x => x.id === want.id);
    if (!a) return false;
    st = after(st, a);
  }
  return goals(M, st, flood(M, st)).includes(goal);
}

/** everywhere you could have come from to get here: the flood over the edges backwards */
function floodBack(M: Model, st: St): Uint8Array {
  const nav = M.nav, seen = new Uint8Array(nav.n), q = [st.at], back = backEdges(nav);
  const doorOk = M.level.doors.map((D, k) => passDoor(D, k, st));
  const liftOk = M.level.platforms.map(P => !P.call || pw(st, P.call.circuit) >= 1);
  seen[st.at] = 1;
  while (q.length) {
    const b = q.pop()!;
    if (nav.door[b] >= 0 && !doorOk[nav.door[b]]) continue;
    for (let k = back.start[b]; k < back.start[b + 1]; k++) {
      const e = back.edge[k], a = back.from[k];
      if (seen[a]) continue;
      if (nav.kind[e] === Edge.Lift && !liftOk[nav.lift[e]]) continue;
      if (nav.door[a] >= 0 && !doorOk[nav.door[a]]) continue;
      seen[a] = 1;
      q.push(a);
    }
  }
  return seen;
}

/** the graph's edges by where they arrive: for each spot, the edges into it and where each comes from */
const backs = new WeakMap<Nav, { start: Int32Array; edge: Int32Array; from: Int32Array }>();
function backEdges(nav: Nav) {
  let r = backs.get(nav);
  if (r) return r;
  const n = nav.n, m = nav.to.length, start = new Int32Array(n + 1), edge = new Int32Array(m), from = new Int32Array(m);
  for (let e = 0; e < m; e++) start[nav.to[e] + 1]++;
  for (let i = 0; i < n; i++) start[i + 1] += start[i];
  const fill = start.slice(0, n);
  for (let a = 0; a < n; a++) for (let e = nav.start[a]; e < nav.start[a + 1]; e++) { const p = fill[nav.to[e]]++; edge[p] = e; from[p] = a; }
  backs.set(nav, (r = { start, edge, from }));
  return r;
}

/** the report as text, for the console */
export function describe(r: Report): string {
  const lines = [`${r.states} states searched.`];
  lines.push(`Rooms reached: ${r.rooms.reached.length}; never: ${r.rooms.never.join(', ') || 'none'}.`);
  lines.push(`Things never in reach: ${r.items.never.join(', ') || 'none'}.`);
  lines.push(`Air: ${r.air.now} s of ${r.air.max}.`);
  for (const [g, route] of Object.entries(r.goals)) {
    lines.push(`${g}: ${route.length ? route.join(' → ') : 'from where you stand'}.`);
    const t = r.through[g];
    if (t) lines.push(`  down there on ${t.air} s of air: ${t.rooms.join(', ') || 'nowhere'}${t.never.length ? '; out of reach: ' + t.never.join(', ') : ''}; ways on: ${t.goals.join(', ') || 'none'}.`);
  }
  if (!Object.keys(r.goals).length) lines.push('No way off the level can be reached.');
  for (const s of r.softLocks) lines.push(`SOFT-LOCK: ${s.route.join(' → ')} loses ${s.lost.join(', ')}.`);
  for (const d of r.deadEnds) lines.push(`DEAD END: ${d.room}, after ${d.route.join(' → ') || 'nothing'}.`);
  return lines.join('\n');
}
