import { angDiff, angLerp, clamp } from '../../core/math';
import { roomHas } from '../../content/types';
import { STEP } from '../../core/loop';
import { Edge, edgeCost, field as fieldFrom } from '../../world/nav';
import { shove, slide, steer, walk, type Slid } from '../body';
import { carded, doorShut, opensItself, routeRules, rulesFor, WAYS, type Fields } from '../fields';
import { power, sfx } from '../game';
import { sendPlatform, type Door } from '../movers';
import { SLAM } from '../moves';
import type { Sim } from '../sim';
import type { Mutant } from '../cast';
import { lit, litRoom, sight } from './senses';
import { battered } from './blows';

/* How the cast get about (engine.md §6, the cast by velocity, how the cast move; §7): on their own feet, down the nav
   graph's fields, through doors and onto platforms on the way, and where a wander, a roam or a round goes next. Every
   kind goes by these, each as its gait says (cast/gait.ts): how fast it changes pace, how it turns. */

const dt = STEP;

/* ---- the small things every behaviour does: turn to you, draw a chance, make a sound where it is */

/** turn toward `yaw`, a share `k` of the way a second; one that walks where it faces no faster than its gait turns */
export function turnToward(m: Mutant, yaw: number, k: number): void {
  const to = angLerp(m.yaw, yaw, Math.min(1, dt * k)), H = m.gait.heading;
  m.yaw = H ? m.yaw + clamp(angDiff(m.yaw, to), -H * dt, H * dt) : to;
}
export const turnTo = (sim: Sim, m: Mutant, k: number) => {
  const p = sim.player.body;
  turnToward(m, Math.atan2(p.x - m.x, p.z - m.z), k);
};
export const rnd = (sim: Sim, a: number, b?: number) => sim.rng.range(a, b);
export const step_ = (sim: Sim, m: Mutant, name: string, big = false) => sfx(sim.game, name, m, big);

/* ---- moving */

/* Its own feet (engine.md §6, the cast by velocity). Whatever it does, it does by wanting a velocity: it speeds toward it
   as fast as its kind can change pace, so it arrives with way on, brakes to stop, is slow to come back from a knock,
   and shoves what it walks into by what it weighs. Faster than it wants to go (knocked, thrown, carried along), friction
   slows it as it slows you, and a wall it is thrown into hurts it. One step of it, once a step: what the behaviours
   ask for, or, if none of them moved it, coming to a stop. */
export function drive(sim: Sim, m: Mutant, wx: number, wz: number, rate = m.gait.acc): Slid & { moved: number; pre: number } {
  const b = m.body!, p = sim.player.body, want = Math.hypot(wx, wz), thrown = Math.hypot(b.vx, b.vz) > want + 0.5;
  if (!b.carried) steer(b, wx, wz, thrown ? FRICTION : rate, dt);
  const vx = b.vx, vz = b.vz, ox = b.x, oz = b.z, r = slide(sim.world, b, dt);
  if (r.hit === p.dyn) shove(b, p, vx, vz, wx, wz, thrown);
  /* thrown into a wall, a door, a crate: it hurts (into another body, it only shoves it) */
  else if (thrown && r.hit && (r.hit === 'world' || r.hit.kind !== 'body') && r.slam > SLAM.min) battered(sim, m, r.slam - SLAM.min, SLAM);
  m.x = b.x; m.z = b.z;
  m.drove = true;
  const moved = Math.hypot(b.x - ox, b.z - oz);
  m.mv = moved / dt > 0.2 ? moved / dt : 0;
  return { ...r, moved, pre: Math.hypot(vx, vz) * dt };
}

/** walk toward (tx, tz) at `spd`, braking to arrive. True if it is there (or as near you as it comes); false if it was
 *  stopped this step and had to step aside */
export function go(sim: Sim, m: Mutant, tx: number, tz: number, spd: number): boolean {
  const b = m.body;
  if (!b) return false;
  let dx = tx - b.x, dz = tz - b.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.05) { drive(sim, m, 0, 0); return true; }
  dx /= d; dz /= d;
  const G = m.gait;
  let k = 1;
  if (G.heading) {
    /* one that walks where it faces turns toward the way no faster than it can, and goes as much of its pace as it faces
       it: none while it is a right angle or more from it, when it turns where it stands */
    const want = Math.atan2(dx, dz);
    m.yaw += clamp(angDiff(m.yaw, want), -G.heading * dt, G.heading * dt);
    k = Math.max(0, Math.cos(angDiff(m.yaw, want)));
    dx = Math.sin(m.yaw); dz = Math.cos(m.yaw);
  } else m.yaw = angLerp(m.yaw, Math.atan2(dx, dz), Math.min(1, dt * G.turn));
  /* it stops short of you, close enough to reach, never on top of you: braking in time, by the way it has on */
  const p = sim.player.body, v = Math.hypot(b.vx, b.vz), brake = (v * v) / (2 * Math.max(1, G.acc));
  const ahead = spd * dt + brake, nx = b.x + dx * ahead, nz = b.z + dz * ahead, nd = Math.hypot(nx - p.x, nz - p.z);
  if (Math.abs(m.dy) < 1.5 && nd < m.r + 0.3 && nd < m.dp) { drive(sim, m, 0, 0); return true; }
  /* and slows to arrive where it is going */
  const pace = Math.min(spd, Math.sqrt(2 * Math.max(1, G.acc) * d)) * k;
  const r = drive(sim, m, dx * pace, dz * pace);
  /* wedged on a corner or against another of them: sidestep, and keep to the same side until it clears. Not round you. */
  if (r.hit && r.hit !== p.dyn && r.moved < r.pre * 0.3 && r.pre > 1e-3) {
    const st = Math.max(r.pre, pace * dt * 0.5);
    if (!m.side) m.side = sim.rng.chance(0.5) ? 1 : -1;
    for (const q of [m.side, -m.side]) {
      const px = b.x, pz = b.z;
      walk(sim.world, b, dz * st * q, -dx * st * q);
      if (Math.hypot(b.x - px, b.z - pz) >= st * 0.3) { m.side = q; m.x = b.x; m.z = b.z; m.mv = spd; return false; }
    }
    return false;
  }
  m.side = 0;
  return true;
}

/** the door a spot stands in, if it is shut to this one now: open it by hand if it can, or wait for it */
function doorAhead(sim: Sim, m: Mutant, d: Door): 'go' | 'wait' | 'no' {
  if (d.t > 0.9) return 'go';
  if (WAYS[m.walker].doors === 'under' && d.def.stuck) return 'go';
  const pw = power(sim.game, d.def.circuit);
  if (opensItself(d, pw)) return 'wait'; // it is opening for us
  /* a card door: it shows the reader its card, which beeps, and the door lets it through and shuts after */
  if (m.cards && carded(sim, d)) {
    if (!d.open) { d.open = true; sfx(sim.game, 'take', { x: (d.def.x0 + d.def.x1) / 2, y: d.def.y0 + 1.2, z: (d.def.z0 + d.def.z1) / 2 }); }
    d.pass = Math.max(d.pass, 2.5);
    return 'wait';
  }
  if (m.opens && !doorShut(d)) {
    if (!d.open) {
      d.open = true; d.hold = 3;
      sfx(sim.game, 'door', { x: (d.def.x0 + d.def.x1) / 2, y: d.def.y0, z: (d.def.z0 + d.def.z1) / 2 });
    }
    return 'wait';
  }
  return 'no';
}

/** walk a field downhill (or, away, uphill): a spot at a time, working doors and riding platforms on the way */
export function follow(sim: Sim, m: Mutant, F: Float32Array, spd: number, away: boolean): boolean {
  const Fs = sim.fields;
  if (!Fs || !m.body) return false;
  if (m.ride) return ride(sim, m, Fs);
  const nav = Fs.nav, i = m.spot;
  if (i < 0) return false;
  const R = rulesFor(sim, Fs, m.walker, m.cards);
  /* downhill: the cheapest way on (the field is float32, so compare scores with each other, not with F[i]);
     uphill (away): the farthest neighbour that is farther than here */
  let bv = away ? F[i] : Infinity, best = -1, be = -1;
  if (away && !Number.isFinite(bv)) return false;
  for (let e = nav.start[i]; e < nav.start[i + 1]; e++) {
    const j = nav.to[e], v = F[j];
    if (!Number.isFinite(v)) continue;
    const c = edgeCost(nav, R, e, j);
    if (c === null) continue;
    const score = away ? v : v + c;
    if (away ? score > bv : score < bv) { bv = score; best = j; be = e; }
  }
  if (best < 0) return false;
  if (nav.kind[be] === Edge.Lift) {
    m.ride = { lift: nav.lift[be], up: nav.y[best] > nav.y[i], to: best, t: 0 };
    return ride(sim, m, Fs);
  }
  /* a door in the way */
  const dr = nav.door[best];
  if (dr >= 0) {
    const a = doorAhead(sim, m, sim.doors[dr]);
    if (a === 'no') return false;
    if (a === 'wait') { m.mv = 0; return true; }
  }
  /* stepping onto a platform: only when it is there to step onto */
  const L = Fs.onLift[best];
  if (L >= 0 && Fs.onLift[i] !== L) {
    const p = sim.platforms[L];
    if (p.moving || p.y > p.def.y0 + 0.01) { callLift(sim, m, L, 0); m.mv = 0; return true; }
  }
  /* to the spot; a body wider than the graph is made for, to where in its square it fits */
  const at = Fs.at[m.walker];
  return go(sim, m, nav.x[best] + (at ? at[best * 2] : 0), nav.z[best] + (at ? at[best * 2 + 1] : 0), spd);
}

/** a hand on the call button: send a platform to one end, if it has power and is not already on its way */
function callLift(sim: Sim, m: Mutant, li: number, end: 0 | 1): void {
  const p = sim.platforms[li], c = p.def.call;
  if (!c || !m.opens || p.moving || power(sim.game, c.circuit) <= 0) return;
  if (Math.abs(p.y - (end ? p.def.y1 : p.def.y0)) < 0.01) return;
  sendPlatform(p, end);
  sfx(sim.game, 'door', { x: (p.def.x0 + p.def.x1) / 2, y: p.y, z: (p.def.z0 + p.def.z1) / 2 });
}

/** the pace on and off a platform (m/s); one given its own pace by the level, as much slower or faster */
const RIDE = 1.8;

/** riding a platform: get on at the near end (calling it if it can), ride, and step off to the spot past it */
function ride(sim: Sim, m: Mutant, Fs: Fields): boolean {
  const R = m.ride!, p = sim.platforms[R.lift], D = p.def, b = m.body!, nav = Fs.nav, spd = RIDE * (m.gait.scale ?? 1);
  const near: 0 | 1 = R.up ? 0 : 1, far: 0 | 1 = R.up ? 1 : 0, farY = far ? D.y1 : D.y0;
  const at = (end: 0 | 1) => !p.moving && Math.abs(p.y - (end ? D.y1 : D.y0)) < 0.01;
  R.t += dt;
  if (R.t > 25) { m.ride = null; return false; } // nothing came: give it up
  const s = nav.locate(b.x, b.y, b.z);
  if (s === R.to || (s >= 0 && Math.abs(nav.y[s] - farY) < 0.4 && Fs.onLift[s] !== R.lift && b.on !== p.dyn)) { m.ride = null; return true; }
  if (b.on === p.dyn) {
    if (at(far)) return go(sim, m, nav.x[R.to], nav.z[R.to], spd);
    /* to the middle first: at the edge it would catch on the floor above, and the platform would turn back */
    const cx = (D.x0 + D.x1) / 2, cz = (D.z0 + D.z1) / 2;
    if (Math.hypot(b.x - cx, b.z - cz) > 0.25) return go(sim, m, cx, cz, spd);
    if (!p.moving) callLift(sim, m, R.lift, far); // a platform that goes by itself goes once stood on
    m.mv = 0;
    return true;
  }
  if (at(near)) return go(sim, m, (D.x0 + D.x1) / 2, (D.z0 + D.z1) / 2, spd);
  callLift(sim, m, R.lift, near);
  m.mv = 0;
  return true;
}

/** the field to you for the way it gets about (sim/fields.ts, WAYS) */
export const own = (sim: Sim, m: Mutant): Float32Array | undefined => sim.fields?.ways[m.walker];

export function chase(sim: Sim, m: Mutant, spd: number, F: Float32Array): boolean {
  const p = sim.player.body;
  /* seen and near: straight at you, unless the way round is far longer than that (a pane of glass between) */
  if (m.dp < 7 && Math.abs(m.dy) < 1 && sight(sim, m) && !(F[m.spot] > m.dp * 1.3 + 1.5)) return go(sim, m, p.x, p.z, spd);
  return follow(sim, m, F, spd, false);
}

export function away(sim: Sim, m: Mutant, spd: number, F?: Float32Array): boolean {
  const p = sim.player.body;
  if (sim.fields && follow(sim, m, F ?? sim.fields.ways[m.walker], spd, true)) return true;
  const dx = m.x - p.x, dz = m.z - p.z, d = Math.hypot(dx, dz) || 1;
  return go(sim, m, m.x + (dx / d) * 2, m.z + (dz / d) * 2, spd);
}

/** a charge: straight on, whatever is there. False when it hits something. */
export function chargeMove(sim: Sim, m: Mutant, spd: number): boolean {
  const r = drive(sim, m, Math.sin(m.cdir) * spd, Math.cos(m.cdir) * spd, CHARGE);
  m.yaw = m.cdir;
  /* into a wall at full tilt: it cannot stop, and it hurts, by how fast it met it (even if it got part of the way first) */
  if (r.hit && r.hit !== sim.player.body.dyn && (r.slam > 1 || r.moved < r.pre * 0.6)) {
    if (r.slam > SLAM.min) battered(sim, m, r.slam - SLAM.min, SLAM);
    return false;
  }
  return true;
}

/** how fast a charge gets going (m/s²): quicker than its walk, never all at once */
const CHARGE = 16;

/** ambling about where it lives: every so often (`every`, s) a new spot, near where it started (`near`: as far either way
 *  of it in x and in z, m) or anywhere in its own room, walked to for a while (`for`, s; without it, for as long as it
 *  is the spot). The timers are its own (wt, wm), so a behaviour that leaves off wandering takes them up where it was */
export interface Wander { every: readonly [number, number]; near?: readonly [number, number]; for?: readonly [number, number] }
/** a step of wandering at `spd`: true if it walked */
export function wander(sim: Sim, m: Mutant, W: Wander, spd: number): boolean {
  m.wt -= dt;
  if (m.wt < 0) {
    m.wt = rnd(sim, W.every[0], W.every[1]);
    if (W.near) { m.wx = m.hx + rnd(sim, -W.near[0], W.near[0]); m.wz = m.hz + rnd(sim, -W.near[1], W.near[1]); }
    else roomWp(sim, m);
    if (W.for) m.wm = rnd(sim, W.for[0], W.for[1]);
  }
  if (W.for) {
    if (m.wm <= 0) return false;
    m.wm -= dt;
  }
  go(sim, m, m.wx, m.wz, spd);
  return true;
}

/** a point somewhere in its own room */
export function roomWp(sim: Sim, m: Mutant): void {
  const R = sim.world.rooms[m.room];
  if (!R) { m.wx = m.hx; m.wz = m.hz; return; }
  const pad = Math.min(m.r + 0.3, (R.x1 - R.x0) / 2, (R.z1 - R.z0) / 2);
  m.wx = sim.rng.range(R.x0 + pad, R.x1 - pad);
  m.wz = sim.rng.range(R.z0 + pad, R.z1 - pad);
  /* a room of any outline: a point inside it, not just in its box */
  for (let k = 0; R.poly && k < 8 && !roomHas(R, m.wx, m.wz); k++) {
    m.wx = sim.rng.range(R.x0 + pad, R.x1 - pad);
    m.wz = sim.rng.range(R.z0 + pad, R.z1 - pad);
  }
}

const picked = new WeakMap<Sim, number>();
/** one new route a step at most, across the whole cast: true if this one may make it now (and so takes this step's) */
export function mayRoute(sim: Sim): boolean {
  if (picked.get(sim) === sim.tick) return false;
  picked.set(sim, sim.tick);
  return true;
}


/** how far a round goes (m, walked as the doors stand): as far as a hunt follows you (sim/fields.ts, LIMIT), so each
 *  keeps to its own end of a level; and how near the light must be for one in the dark to make for it. Nearer, it knows
 *  the light is there; farther, it does not, and keeps still (the dark Commons keeps its own, rather than sending them
 *  all the length of the street to Horticulture's backup set). How long it can come no nearer its goal before it is held
 *  up (s): `held`, or as long as walking `heldM` metres takes it, if that is longer. Nearer is a spot nearer, and a spot
 *  is a metre, so one slower than a husk (which walks 1.95 m in 1.5 s) takes longer to come nearer and is not held up
 *  for that */
export const ROAM = { reach: 90, light: 40, held: 1.5, heldM: 1.95 };

/** staff still keep rounds, and keep to the light: they hunt by sight (world.md §8). A round goes to a lit room it can
 *  get to as the doors stand (a locked door bars it), within ROAM.reach: one the fewest of the staff are in or making
 *  for, so they keep apart, and at random among those. A room is the room, not its boxes: the muster hall's four sides
 *  are one, and one chance, not four. One standing in the dark makes for a spot in the nearest lit room within
 *  ROAM.light; with none, it keeps still until the light comes. Only the choice needs the doors; the route there is
 *  made as any round's is, and a save keeps the choice. */
function pickDest(sim: Sim, m: Mutant): void {
  const Fs = sim.fields;
  if (!Fs || m.spot < 0) { m.wt = 3; return; }
  if (!mayRoute(sim)) { m.wt = 0.05; return; }
  const nav = Fs.nav, P = placeOf(sim), dark = !lit(sim, m.x, m.y + 0.5, m.z), reach = dark ? ROAM.light : ROAM.reach;
  const from = fieldFrom(nav, m.spot, rulesFor(sim, Fs, m.walker, m.cards), undefined, reach);
  /* the lit rooms in reach, each with its spots in reach */
  const spots = new Map<number, number[]>();
  for (const R of rounds(sim)) for (const k of nav.byRoom.get(R) ?? []) {
    if (!(from[k] <= reach)) continue;
    let s = spots.get(P[R]);
    if (!s) spots.set(P[R], (s = []));
    s.push(k);
  }
  if (!spots.size) { m.wt = dark ? 3 : 5; return; }
  let to: number[] = [];
  if (dark) {
    let best = Infinity;
    for (const s of spots.values()) for (const k of s) if (from[k] < best) { best = from[k]; to = s; }
  } else {
    const kept = keptBy(sim, P);
    let least = Infinity, fewest: number[][] = [];
    for (const [p, s] of spots) {
      const n = kept.get(p) ?? 0;
      if (n < least) { least = n; fewest = []; }
      if (n === least) fewest.push(s);
    }
    to = sim.rng.pick(fewest);
  }
  const k = sim.rng.pick(to);
  m.F = fieldTo(sim, m, k);
  if (!Number.isFinite(m.F[m.spot])) { m.wt = sim.rng.range(1, 3); return; }
  m.dest = k;
}

/** how many of the staff are in each room or making for it (one choosing counts where it stands: it has no way yet) */
function keptBy(sim: Sim, P: Int32Array): Map<number, number> {
  const nav = sim.fields!.nav, kept = new Map<number, number>();
  const placeAt = (k: number) => (k >= 0 && nav.room[k] >= 0 ? P[nav.room[k]] : -1);
  for (const o of sim.cast) {
    if (o.dead || o.ai !== 'husk') continue;
    const here = placeAt(o.spot), there = placeAt(o.dest);
    if (here >= 0) kept.set(here, (kept.get(here) ?? 0) + 1);
    if (there >= 0 && there !== here) kept.set(there, (kept.get(there) ?? 0) + 1);
  }
  return kept;
}

const places = new WeakMap<object, Int32Array>();
/** each box's room, as a round takes rooms: boxes of one name that join are one (the muster hall's four sides), as
 *  test/probes/loops.probe.ts takes them. A room is known by its lowest-numbered box */
function placeOf(sim: Sim): Int32Array {
  let P = places.get(sim.world);
  if (P) return P;
  const nav = sim.fields!.nav, rooms = sim.world.rooms, up = Int32Array.from(rooms, (_R, i) => i);
  const find = (r: number): number => (up[r] === r ? r : (up[r] = find(up[r])));
  for (let a = 0; a < nav.n; a++) for (let e = nav.start[a]; e < nav.start[a + 1]; e++) {
    const r = nav.room[a], q = nav.room[nav.to[e]];
    if (r < 0 || q < 0 || r === q || rooms[r].name !== rooms[q].name) continue;
    const x = find(r), y = find(q);
    if (x !== y) up[Math.max(x, y)] = Math.min(x, y);
  }
  P = up.map((_r, i) => find(i));
  places.set(sim.world, P);
  return P;
}

export function fieldTo(sim: Sim, m: Mutant, k: number): Float32Array {
  const Fs = sim.fields!;
  return fieldFrom(Fs.nav, k, routeRules(sim, Fs, m.walker), m.F ?? undefined);
}

/** after a load: the route to where it was going, made again (it depends on the level's shape alone) */
export function restoreRoute(sim: Sim, m: Mutant): void {
  m.F = sim.fields && m.dest >= 0 ? fieldTo(sim, m, m.dest) : null;
}

/** the rooms the cast's rounds can take them to, as the power stands: the lit ones */
export function rounds(sim: Sim): number[] {
  return roamRooms(sim).filter(R => litRoom(sim, R));
}

const roamCache = new WeakMap<object, number[]>();
/** rooms worth a walk: not a refuge, not marked off, not armed, not a doorway, not a cupboard */
function roamRooms(sim: Sim): number[] {
  let r = roamCache.get(sim.world);
  if (!r) {
    r = sim.world.rooms.filter(R => !R.safe && !R.noroam && !R.armed && !R.doorway && (R.x1 - R.x0) * (R.z1 - R.z0) >= 16).map(R => R.id);
    roamCache.set(sim.world, r);
  }
  return r;
}

/** a step of a roam at `spd`, standing `rest` seconds (at random between the two) when it gets there */
export function roam(sim: Sim, m: Mutant, spd: number, rest: readonly [number, number] = [3, 10]): void {
  if (m.wt > 0) { m.wt -= dt; return; }
  if (m.dest < 0) { pickDest(sim, m); m.near = 1e9; m.stk = 0; return; }
  const left = m.F && m.spot >= 0 ? m.F[m.spot] : Infinity;
  if (m.spot === m.dest || left < 1.2) { m.dest = -1; m.wt = sim.rng.range(rest[0], rest[1]); return; }
  const on = follow(sim, m, m.F!, spd, false);
  /* getting on is coming to a spot nearer than any yet. Held up is the rest, but for waiting at a door or for a
     platform: stopped on a locked door, wedged on a corner, or two of them meeting where there is no room to pass, each
     stepping aside into the other's way and back. A while of it, and it gives the round up for another */
  if (left < m.near || m.ride) { m.near = Math.min(m.near, left); m.stk = 0; }
  else if (!(on && !m.mv) && (m.stk += dt) > Math.max(ROAM.held, ROAM.heldM / spd)) { m.stk = 0; m.dest = -1; m.ride = null; m.wt = sim.rng.range(1, 3); }
}

/** what slows one of the cast that something shoved (m/s²): sent back at 4 m/s, it goes about 0.3 m */
const FRICTION = 28;
