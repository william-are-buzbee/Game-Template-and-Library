import type { MutantDef, RoundStop } from '../content/types';
import { clamp, PI, TAU } from '../core/math';
import { STEP } from '../core/loop';
import { fall, makeBody, push, settle, type Body } from './body';
import { makeFields, refreshFields, walkedHere, WAYS, type Walker } from './fields';
import { DOWN, FALL, MOVES, POISE, regain } from './moves';
import type { Sim } from './sim';
import { layDead, type Rag } from './ragdoll';
import { away, chargeMove, chase, drive, own, rnd, step_, turnTo, wander, type Wander } from './cast/move';
import { footfall, gaitOf, pace, type Gait } from './cast/gait';
import { hears, inBeam, seeP, sight } from './cast/senses';
import { battered, beginBlow, blowKind, blowStep, frontOf, inStart, strikes, type Blow } from './cast/blows';
import { husk, updateDrills } from './cast/husk';
import { patient, ROUND, swingTorch } from './cast/round';

/* The cast (engine.md §7, §8): what lives in the station, ported from the first engine's behaviours. Each is a body that
   walks like yours, so it has weight, falls, rides platforms and is stopped by what stops you; they block each other
   and you. They find their way over the nav graph's fields, see along lines of sight scaled by the light you stand in,
   and hear what you do as far as the sound of it carries through the rooms between.

   Here: their kinds, their making, and a step of them all. Their parts are in cast/: getting about (move.ts), seeing
   and hearing you (senses.ts), the fight (blows.ts), Security's staff (husk.ts), and the night round and the other
   patient (round.ts); how each kind moves, its gait (gait.ts). What the rest of the game uses of those parts it takes
   from here. The parts take only types from this file, so the AI table below finds every behaviour made.

   A new kind is a row in MT (its body, and the behaviour that steps it), one in GAIT if it moves unlike the kind whose
   behaviour it shares, and one in WAYS (sim/fields.ts) if it gets about unlike any there; engine.md §6, how the cast
   move, has the rest (its blow, its model). */
export { restoreRoute, rounds } from './cast/move';
export { GAIT, gaitOf, pace, type Gait } from './cast/gait';
export { blowAt, blowKind, DEATH, hitMutant, inBlow, killAll, shoved, type Blow, type BlowKind, type BlowPhase, type Hit } from './cast/blows';
export { answer, drill, free, type Drill } from './cast/husk';
export { BANG, BEAT, BLOOD, GRAFT, leftGrafted, noiseAt, PEER, READER, ROUND, stutters, TORCH, torchRay } from './cast/round';

export type Ai = 'husk' | 'skitter' | 'bloat' | 'thresher' | 'worm' | 'swimmer' | 'grabber' | 'patient' | 'dead';

/** whose child it is (world.md §10, Pia's young gods): the bone mother's, the bloat god's, the bush's. Its temper goes by
 *  it (cast/husk.ts, TEMPER), and its look (render/castView.ts) */
export type Line = 'bone' | 'bloat' | 'bush';

export interface Stats {
  ai?: Ai; model?: string; green?: boolean; line?: Line;
  hp: number; r: number; cr: number; mass: number;
  /** what its body weighs (kg), for shoving and being shoved; Infinity for one rooted where it sits */
  kg: number;
  /** its body's height */
  h: number;
  /** the way it gets about (sim/fields.ts, WAYS): by default, none through doors if it does not fit them (`noDoors`),
   *  any a hand works if it `opens` them, and under the jammed ones if neither */
  way?: Walker;
  /** how high it sees from (m): by default a little below the top of a body, and no higher than a person's eye */
  eye?: number;
  opens?: boolean; low?: boolean; noDoors?: boolean; solid?: boolean; fixed?: boolean; swim?: boolean;
  /** it carries a flashlight, on: a beam it sees by, and that lights you for everyone else (world.md §8, the night round) */
  torch?: boolean;
}

export const MT: Record<string, Stats> = {
  /* the bone mother's young: the Commons' husks, Cargo's, the plant's (world.md §10, the bone line, young) */
  husk: { line: 'bone', hp: 75, r: 0.38, cr: 0.34, mass: 1.2, kg: 80, h: 1.8, opens: true },
  /* the bone mother's, middle years, alongside the thresher (world.md §10; mockups/mutants.html, Bone, middle years): a
     husk grown, half again the weight and a head taller, one arm gone to bone and drawn out long, the ribs out. A husk in
     its wits (doors, breakers), harder at you, quicker to run, and now and then it charges (cast/husk.ts, RUSH) */
  bonemid: { ai: 'husk', model: 'bonemid', line: 'bone', hp: 120, r: 0.42, cr: 0.37, mass: 1.6, kg: 105, h: 1.95, opens: true },
  /* Security's staff, the bush's children: the changed (world.md §8). The husk's body and behaviour, their own temper */
  changed: { ai: 'husk', model: 'husk', line: 'bush', hp: 75, r: 0.38, cr: 0.34, mass: 1.2, kg: 80, h: 1.8, opens: true },
  /* the bush's line, old in it (world.md §10; mockups/mutants.html, Plant, old): further gone than Security's seven, the
     skin green, leaf in rows over it, swollen and stooped. The changed's behaviour; it barely walks, and does not run */
  plantold: { ai: 'husk', model: 'plantold', line: 'bush', hp: 110, r: 0.45, cr: 0.4, mass: 1.8, kg: 110, h: 2.05, opens: true },
  /* one of the changed still walking the night shift's round, its flashlight on (world.md §8, the night round) */
  nightround: { ai: 'husk', model: 'husk', line: 'bush', hp: 75, r: 0.38, cr: 0.34, mass: 1.2, kg: 80, h: 1.8, opens: true, torch: true },
  skitter: { hp: 60, r: 0.5, cr: 0.4, mass: 1, kg: 45, h: 0.9, low: true },
  bloat: { line: 'bloat', hp: 600, r: 1, cr: 0.9, mass: 8, kg: Infinity, h: 2.4, noDoors: true, solid: true },
  /* the bone mother's, halfway (world.md §10, the bone line, middle years) */
  thresher: { line: 'bone', hp: 150, r: 0.6, cr: 0.5, mass: 2.5, kg: 220, h: 2.1, solid: true, noDoors: true },
  /* 0.6 high: higher than a step, so you go round one rather than up onto it */
  worm: { hp: 40, r: 0.35, cr: 0.3, mass: 1, kg: 25, h: 0.6, low: true },
  rootworm: { ai: 'worm', model: 'worm', green: true, hp: 40, r: 0.35, cr: 0.3, mass: 1, kg: 25, h: 0.6, low: true },
  swimmer: { ai: 'swimmer', model: 'worm', hp: 40, r: 0.35, cr: 0.3, mass: 1, kg: 25, h: 0.6, swim: true },
  grabber: { hp: 30, r: 0.4, cr: 0, mass: 1, kg: Infinity, h: 0, fixed: true },
  /* the other patient in the isolation suite (world.md §8, the opening): awake for days, weak, and no danger to anyone */
  patient: { hp: 20, r: 0.3, cr: 0.28, mass: 1, kg: 55, h: 1.75 },
  vine: { ai: 'grabber', model: 'grabber', green: true, hp: 30, r: 0.4, cr: 0, mass: 1, kg: Infinity, h: 0, fixed: true },
  /* the station's dead, the guards and residents found where they fell (content/build/furnish.ts, body): dead before you
     came, laid out on the floor as bodies like any other, which a walk or a blow moves */
  dead: { hp: 1, r: 0.3, cr: 0.28, mass: 1, kg: 75, h: 1.75 },
};

/** a ride on a platform: which, which way, and the spot to step off to */
interface Ride { lift: number; up: boolean; to: number; t: number }

export interface Mutant {
  id: number;
  type: string;
  ai: Ai;
  model: string;
  green: boolean;
  /** null for the fixed (a grabber is part of its wall) */
  body: Body | null;
  /** where it is: its body's feet, or its own place */
  x: number; y: number; z: number;
  /** where it was at the start of this step, so it can be drawn between steps */
  px: number; py: number; pz: number;
  yaw: number;
  state: string;
  st: number;
  cd: number;
  stun: number;
  hp: number;
  max: number;
  mass: number;
  r: number;
  walker: Walker;
  opens: boolean; low: boolean; noDoors: boolean; fixed: boolean; swim: boolean; solid: boolean;
  /** a guard that keeps its post until it notices you; one sitting down; one grown over; a big one */
  post: boolean; sit: boolean; holt: boolean; big: boolean;
  /** one of Security's staff, who carries its card (LevelDef.cards; it started in one of Security's zones) */
  cards: boolean;
  /** the door it is going to shut, one it saw left open (an index into Sim.doors), or -1 */
  door: number;
  /** a guard's round: its stops, in order, kept to for good (null for the rest); the stop it is making for */
  round: RoundStop[] | null;
  beat: number;
  /** how many times it has been all the way round; seconds since it last stood at the glass looking in at you */
  lap: number; peered: number;
  /** the other patient's place to hide: where it crouches, under its window */
  hide: { x: number; z: number } | null;
  /** the one of the cast it is dragging (an index into Sim.cast), or -1; metres it has dragged them since the last smear
   *  of blood it left */
  drag: number; trail: number;
  /** seconds left of grafting what it took (the night round, world.md §8); the leaf in it (the other patient) */
  graft: number; grafted: boolean;
  /** its flashlight is on in its hand, and how far down it holds it (rad: cast/round.ts, swingTorch) */
  torch: boolean; tp: number;
  /** where it started, which it keeps near */
  hx: number; hz: number;
  room: number;
  /* the first engine's timers and flags, by their old names: wait, wander, waypoint, footstep, lost, burst, flee,
     charge clock and direction, targeted, grab, tension */
  wt: number; wm: number; wx: number; wz: number;
  tk: number; lost: number; bt: number; burst: boolean; flee: number; ct: number; cdir: number; tgt: boolean;
  grab: number; tense: number;
  /** a blow under way, or null */
  blow: Blow | null;
  /** a roam: the spot it is making for, and the field to it */
  dest: number;
  F: Float32Array | null;
  stk: number;
  /** the least way left (m) a roam has come to on its route: one held up is told from one getting on by it */
  near: number;
  fled: boolean;
  side: number;
  ride: Ride | null;
  /** the nav spot it stands on */
  spot: number;
  /** its speed this step, for its legs and footsteps */
  mv: number;
  /** to you: straight, on the plan, and how far you are above it */
  d: number; dp: number; dy: number;
  /** a line of sight to you, and when it was last looked along */
  los: boolean; losAt: number;
  /** 1 when just hit, dying away */
  hit: number;
  /** seconds left of being held still by a blow that landed (sim/moves.ts, HITSTOP) */
  stop: number;
  /** what it can take before it reels (sim/moves.ts), seconds since it was last hit, and seconds left of reeling */
  poise: number; pmax: number; calm: number; reel: number;
  /** seconds it has held off, waiting for its turn at you (a husk while another is at you) */
  pat: number;
  /** knocked down (sim/moves.ts, DOWN): seconds left on the floor, then seconds left getting up */
  down: number; rise: number;
  /** how it moves (cast/gait.ts): its kind's, or its own if the level gave it its own pace */
  gait: Gait;
  /** whether it moved itself this step (if not, it comes to a stop) */
  drove: boolean;
  /** how high it sees from (m) */
  eye: number;
  /** whose child it is (Line), if the game says */
  line: Line | null;
  /** time, for its animation */
  ph: number;
  dead: boolean;
  /** 0..1 of its fall when it dies, for those that only fold where they are (a bloat, what grows on a wall) */
  gone: number;
  /** its body gone loose: once it is dead, or while it is knocked down (sim/ragdoll.ts) */
  rag: Rag | null;
  /** dev (the arena's clear): taken out of the world altogether */
  away: boolean;
  /** steps it has stood still: a body at rest is not asked about its footing */
  still: number;
  /** what one of the station's dead was wearing: its shirt's colour (MT.dead), from the level */
  wear: number;
}

const dt = STEP;

export function makeCast(sim: Sim, defs: MutantDef[]): Mutant[] {
  return defs.filter(d => MT[d.type]).map((def, id) => makeMutant(sim, def, id));
}

/** the way a kind gets about: its own, or by default none through doors if it does not fit them, any a hand works if it
 *  opens them, and under the jammed ones if neither */
export const wayOf = (S: Stats): Walker => S.way ?? (S.noDoors ? 'big' : S.opens ? 'hands' : 'crawl');

/** one of the cast, as a level places it, numbered `id` */
function makeMutant(sim: Sim, def: MutantDef, id: number): Mutant {
  /* the station's dead draw nothing from the run's chance, so what lies about does not change what the living do */
  const S = MT[def.type], dead = def.type === 'dead', rnd = (a: number, b?: number) => (dead ? a : sim.rng.range(a, b));
  {
    const o = def.opts as Record<string, number | undefined>;
    /* every body stops every other, yours too (engine.md §6, F1b); they stop short of you, and shove you when they do not.
       It climbs what its way does */
    const walker = wayOf(S);
    const body = S.fixed ? null : makeBody(sim.world, def.x, def.y, def.z, S.cr, S.h, S.kg, WAYS[walker].climb);
    const room = sim.world.roomAt(def.x, def.y + 0.5, def.z)?.id ?? -1;
    const m: Mutant = {
      id, type: def.type, ai: S.ai ?? (def.type as Ai), model: S.model ?? def.type, green: !!S.green, body,
      x: def.x, y: def.y, z: def.z, px: def.x, py: def.y, pz: def.z, yaw: o.yaw ?? rnd(TAU), state: (def.opts.state as string | undefined) ?? 'idle', st: 0, cd: 0, stun: 0,
      hp: S.hp, max: S.hp, mass: S.mass, r: S.r,
      walker,
      opens: !!S.opens, low: !!S.low, noDoors: !!S.noDoors, fixed: !!S.fixed, swim: !!S.swim, solid: !!S.solid,
      post: !!o.post, sit: !!o.sit, holt: !!o.holt, big: !!o.big, hx: def.x, hz: def.z, room,
      cards: !!sim.world.def.cards && !!S.opens && !!sim.world.rooms[room]?.zone, door: -1,
      round: (def.opts.round as RoundStop[] | undefined) ?? null, beat: 0, lap: 0, peered: 99, torch: !!S.torch, tp: ROUND.pitch,
      hide: (def.opts.hide as { x: number; z: number } | undefined) ?? null, drag: -1, trail: 0, graft: 0, grafted: false,
      wt: rnd(1, 5), wm: 0, wx: 0, wz: 0, tk: 0, lost: 0, bt: 0, burst: false, flee: 0, ct: rnd(6, 14), cdir: 0, tgt: false,
      grab: 0, tense: 0, blow: null, dest: -1, F: null, stk: 0, near: 1e9, fled: false, side: 0, ride: null, spot: -1,
      mv: 0, d: 99, dp: 99, dy: 0, los: false, losAt: -99, hit: 0, stop: 0, poise: poiseOf(def.type, S.ai, !!o.big), pmax: poiseOf(def.type, S.ai, !!o.big), calm: 99, reel: 0, pat: 0, down: 0, rise: 0, gait: gaitOf(def.type, S.ai ?? def.type, !!o.big, o.walk, o.steps), drove: false,
      eye: S.eye ?? (S.fixed ? 2.0 : Math.min(1.6, S.h * 0.85)), line: S.line ?? null, ph: rnd(9), dead: false, gone: 0, rag: null, away: false, still: 0, wear: o.c ?? 0,
    };
    /* laid out where it was found: out of the world, as the dead are, and lying as its points do */
    if (dead) {
      m.dead = true;
      sim.world.dyn.splice(sim.world.dyn.indexOf(body!.dyn), 1);
      m.rag = layDead(m, sim.world);
    }
    return m;
  }
}

/** dev (the arena): one of the cast put down where nothing placed it, awake and after you. The ways about the level are
 *  worked out the first time, if no one else needed them. Not for a run that saves: a save knows the level's cast only */
export function spawn(sim: Sim, type: string, x: number, y: number, z: number, opts: Record<string, unknown> = {}): Mutant | null {
  if (!MT[type]) return null;
  const m = makeMutant(sim, { type, x, y, z, opts }, sim.cast.length);
  m.yaw = Math.atan2(sim.player.body.x - x, sim.player.body.z - z);
  sim.cast.push(m);
  if (!sim.fields) { sim.fields = makeFields(sim); refreshFields(sim, sim.fields); }
  else walkedHere(sim, sim.fields, m.walker);
  if (m.ai === 'husk' || m.ai === 'skitter') { m.state = 'hunt'; m.lost = 0; }
  else if (m.ai === 'thresher') { m.state = 'pursue'; m.st = 1e9; }
  return m;
}

/** what it can take before it reels: by its kind, a big skitter more */
function poiseOf(type: string, ai: Ai | undefined, big: boolean): number {
  const P = POISE as Record<string, number>;
  if ((ai ?? type) === 'skitter' && big) return POISE.bigSkitter;
  return P[type] ?? P[ai ?? ''] ?? POISE.other;
}

/** the bodies of the living, for doors and platforms to know about */
export const castBodies = (sim: Sim): Body[] => sim.cast.filter(m => !m.dead && m.body).map(m => m.body!);

/** those that make a light door open as they come near: anything that walks and fits a door */
export const castMovers = (sim: Sim): Body[] => sim.cast.filter(m => !m.dead && m.body && !m.noDoors).map(m => m.body!);

/* ---- the behaviours, as the first engine had them */

/** how each wanders when nothing has its attention (cast/move.ts, wander): a skitter in short scuttles about where it
 *  started, a bloat and a thresher about their rooms, a worm and a swimmer a while at a time */
const IDLE: Record<string, Wander> = {
  skitter: { every: [2, 7], near: [3, 3], for: [0.3, 0.8] },
  bloat: { every: [9, 18], for: [5, 10] },
  thresher: { every: [4, 9] },
  worm: { every: [3, 9], near: [2, 2], for: [1, 3] },
  swimmer: { every: [3, 8], near: [5, 2], for: [2, 5] },
};

const AI: Record<Ai, (sim: Sim, m: Mutant) => void> = {
  husk,

  skitter(sim, m) {
    const big = m.big, F = own(sim, m);
    if (m.state === 'idle') {
      if (seeP(sim, m, big ? 18 : 14) || hears(sim, m)) { m.state = 'hunt'; m.lost = 0; m.bt = 0; step_(sim, m, 'skit'); return; }
      if (wander(sim, m, IDLE.skitter, pace(m, 'walk')) && m.mv) footfall(sim, m, false);
      return;
    }
    if (blowStep(sim, m)) return;
    if (seeP(sim, m, big ? 24 : 18)) m.lost = 0; else m.lost += dt;
    if (m.lost > 9) { m.state = 'idle'; return; }
    m.bt -= dt;
    if (m.bt <= 0) { m.burst = !m.burst; m.bt = m.burst ? rnd(sim, 0.4, 0.9) : rnd(sim, 0.1, 0.4); }
    const K = blowKind(m)!;
    if (inStart(m, K)) { turnTo(sim, m, 6); if (m.cd <= 0) beginBlow(sim, m, K); }
    else if (m.burst && F) {
      chase(sim, m, pace(m, 'hunt'), F);
      if (m.mv) footfall(sim, m, true);
    }
  },

  bloat(sim, m) {
    if (m.sit) return;
    if (wander(sim, m, IDLE.bloat, pace(m, 'walk')) && m.mv) footfall(sim, m, false);
  },

  thresher(sim, m) {
    const p = sim.player, b = p.body, d = m.d;
    switch (m.state) {
      case 'idle': case 'patrol':
        if (seeP(sim, m, 16) || (hears(sim, m) && sight(sim, m))) { m.state = 'wind'; m.st = 0.75; step_(sim, m, 'roar'); break; }
        /* it charges about its room now and then */
        m.ct -= dt;
        if (m.ct < 0) { m.ct = rnd(sim, 7, 15); m.cdir = rnd(sim, TAU); m.tgt = false; m.state = 'charge'; m.st = rnd(sim, 1, 2.2); step_(sim, m, 'roar', true); break; }
        wander(sim, m, IDLE.thresher, pace(m, 'walk'));
        if (m.mv) footfall(sim, m, false);
        break;
      case 'wind':
        turnTo(sim, m, 6);
        m.st -= dt;
        if (m.st < 0) { m.state = 'charge'; m.st = 3; m.tgt = true; m.cdir = Math.atan2(b.x - m.x, b.z - m.z); }
        break;
      case 'charge': {
        if (m.tgt) { const want = Math.atan2(b.x - m.x, b.z - m.z), da = ((want - m.cdir + PI) % TAU + TAU) % TAU - PI; m.cdir += clamp(da, -1.3 * dt, 1.3 * dt); }
        m.st -= dt;
        footfall(sim, m, true);
        if (m.dp < m.r + 0.55 && Math.abs(m.dy) < 1.4) {
          strikes(sim, m, 45, 60, 0, 9);
          /* it throws you: 9 m/s along its charge, whatever you were doing */
          p.body.vx = 0; p.body.vz = 0; push(p.body, Math.sin(m.cdir) * 9, Math.cos(m.cdir) * 9);
          m.state = 'recover'; m.st = 1.6;
          break;
        }
        const ok = chargeMove(sim, m, pace(m, 'charge'));
        if (!ok) { step_(sim, m, 'thud'); if (d < 10) sim.game.events.push({ type: 'shake', k: 0.3 }); m.state = 'recover'; m.st = 1.4; }
        else if (m.st < 0) { m.state = 'recover'; m.st = 0.8; }
        break;
      }
      case 'recover':
        m.st -= dt;
        if (m.st < 0) {
          if (seeP(sim, m, 18)) { m.state = 'wind'; m.st = 0.5; step_(sim, m, 'roar'); }
          else { m.state = 'pursue'; m.st = m.tgt ? 7 : 0; }
        }
        break;
      case 'pursue':
        if (blowStep(sim, m)) break;
        m.st -= dt;
        if (m.st < 0) { m.state = 'patrol'; break; }
        if (seeP(sim, m, 18) && d > 3.5) { m.state = 'wind'; m.st = 0.5; step_(sim, m, 'roar'); break; }
        if (inStart(m, MOVES.thresher)) { turnTo(sim, m, 4); if (m.cd <= 0) beginBlow(sim, m, MOVES.thresher); }
        else if (sim.fields) chase(sim, m, pace(m, 'hunt'), own(sim, m)!);
        break;
    }
  },

  worm(sim, m) {
    const g = sim.game, F = own(sim, m), d = m.d;
    if (m.flee > 0) { m.flee -= dt; away(sim, m, pace(m, 'flee')); return; }
    const flash = g.lightOn && g.light === 'flash', lamp = g.lightOn && g.light === 'lantern';
    /* the light puts it off, its reach too */
    if ((d < 10 && flash && inBeam(sim, m)) || (d < 4.5 && lamp)) { m.blow = null; away(sim, m, pace(m, 'shy')); return; }
    if (blowStep(sim, m)) return;
    if (d < 5 || (d < 13 && sight(sim, m))) {
      if (inStart(m, MOVES.worm)) {
        if (sim.wormN >= 2) { turnTo(sim, m, 8); if (m.cd <= 0) beginBlow(sim, m, MOVES.worm); }
      } else if (F) chase(sim, m, pace(m, 'hunt'), F);
      return;
    }
    wander(sim, m, IDLE.worm, pace(m, 'walk'));
  },

  /* the ones that went into the water. light draws them. */
  swimmer(sim, m) {
    const g = sim.game, lamp = g.lightOn && g.light === 'lantern', F = own(sim, m);
    if (m.flee > 0) { m.flee -= dt; away(sim, m, pace(m, 'flee')); return; }
    if (blowStep(sim, m)) return;
    if (m.d < (lamp ? 22 : 9)) {
      if (inStart(m, MOVES.swimmer)) { turnTo(sim, m, 8); if (m.cd <= 0) beginBlow(sim, m, MOVES.swimmer); }
      else if (F) {
        chase(sim, m, pace(m, 'hunt'), F);
        if (m.mv) footfall(sim, m);
      }
      return;
    }
    wander(sim, m, IDLE.swimmer, pace(m, 'walk'));
  },

  /* the arms are bait. the thing is the head on the wall above them. */
  grabber(sim, m) {
    if (m.grab > 0) m.grab -= dt;
    if (m.dp < 1.5 && Math.abs(m.dy) < 2 && sight(sim, m)) {
      if (m.tense === 0) step_(sim, m, 'skit');
      m.tense += dt;
      if (m.tense > 0.8 && m.cd <= 0) {
        m.cd = 2.4; m.grab = 1; m.tense = 0.01;
        strikes(sim, m, 20, 10);
        sim.player.slow = 1.4;
      }
    } else m.tense = Math.max(0, m.tense - dt * 2);
  },
  patient,
  /* the station's dead: dead, and never asked */
  dead() {},
};

/** a step of everything alive */
export function updateCast(sim: Sim): void {
  updateDrills(sim);
  sim.front = frontOf(sim);
  const b = sim.player.body, Fs = sim.fields;
  let wn = 0;
  for (const m of sim.cast) if (m.ai === 'worm' && !m.dead && m.flee <= 0 && m.dp < 2.6) wn++;
  sim.wormN = wn;
  for (const m of sim.cast) {
    m.px = m.x; m.py = m.y; m.pz = m.z;
    /* held still by a blow that landed (sim/moves.ts, HITSTOP): nothing about it goes on, and the shove waits. One gone
       loose is held, and its hold run down, with the loose bodies (sim/ragdoll.ts, updateCorpses) */
    if (m.stop > 0) { if (!m.rag) m.stop = Math.max(0, m.stop - dt); continue; }
    if (m.hit > 0) m.hit = Math.max(0, m.hit - dt * 4);
    m.calm += dt;
    m.poise = regain(m.poise, m.pmax, m.calm, dt);
    if (m.reel > 0) m.reel = Math.max(0, m.reel - dt);
    if (m.graft > 0) m.graft = Math.max(0, m.graft - dt);
    /* on the floor, then getting up */
    if (m.down > 0) { m.down = Math.max(0, m.down - dt); if (m.down === 0) m.rise = DOWN.rise; }
    else if (m.rise > 0) m.rise = Math.max(0, m.rise - dt);
    /* up again: its body is its own once more */
    if (m.rag && !m.dead && m.down === 0 && m.rise === 0) m.rag = null;
    if (m.dead) { if (m.gone < 1) m.gone = Math.min(1, m.gone + dt * 2.5); continue; }
    /* one being dragged, or out cold, is put where its loose body is (dragged(), lies(), below): its own feet, falls and
       footing are not asked */
    const towed = m.state === 'dragged' || m.state === 'out';
    const mb = towed ? null : m.body, resting = !!mb && m.still > 2 && mb.ground && mb.vy === 0 && !mb.on, ox = mb?.x, oz = mb?.z;
    if (mb) {
      if (!resting) settle(sim.world, mb);
      m.x = mb.x; m.y = mb.y; m.z = mb.z;
      if (Fs && !m.ride) { const s = Fs.nav.locate(mb.x, mb.y, mb.z); if (s >= 0) m.spot = s; }
    }
    m.cd -= dt;
    const dx = b.x - m.x, dz = b.z - m.z;
    m.dy = b.y - m.y;
    m.dp = Math.hypot(dx, dz);
    m.d = Math.hypot(dx, dz, m.dy);
    m.mv = 0;
    m.ph += dt;
    m.drove = false;
    if (m.stun > 0) m.stun -= dt;
    else AI[m.ai](sim, m);
    if (m.torch) swingTorch(sim, m);
    /* nothing it did moved it this step (it stands, winds up, reels, lies there): it comes to a stop on its own feet,
       or, faster than it would go, by friction; what it meets meanwhile, it shoves */
    if (mb && !m.dead && !m.drove) drive(sim, m, 0, 0);
    if (mb) mb.carried = false;
    if (m.dead) continue;
    if (mb) {
      /* a body that has stood still on firm ground for a few steps stays where it is: its weight would only put it back */
      const moved = mb.x !== ox || mb.z !== oz;
      /* a fall hurts it as one hurts you */
      if (moved || !resting) { const { impact } = fall(sim.world, mb, dt); if (impact > FALL.min) battered(sim, m, impact - FALL.min, FALL); }
      m.still = moved ? 0 : m.still + 1;
      m.x = mb.x; m.y = mb.y; m.z = mb.z;
    }
    if (sim.game.ended) return;
  }
}
