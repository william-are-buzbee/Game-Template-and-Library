import { STEP } from '../../core/loop';
import type { Dyn } from '../../world/world';
import { impulse } from '../body';
import { hurtBy, log, sfx } from '../game';
import { exposed, struck } from '../combat';
import { closing, DOWN, FALL, LAUNCH, MOVES, react, RISE, SHOVE, type Move } from '../moves';
import type { Sim } from '../sim';
import { knockRag, makeRag, RAG, REFLEX, type Killing } from '../ragdoll';
import type { V3 } from '../sweep';
import type { Ai, Mutant } from '../cast';
import { drive, go, step_, turnTo, turnToward } from './move';
import { pace } from './gait';
import { beaten } from './round';
import { rouse, temperOf } from './husk';

/* The cast's side of the fight (engine.md §6): what lands on you, taking turns at you, a blow wound up, thrown and
   recovered from, and what a blow, a fall or a wall does to one of them. */

const dt = STEP;

/** what is said when it kills you */
export const DEATH: Record<Ai, string> = {
  husk: 'It beat you the way a person would. Patiently, and with both hands.',
  skitter: 'It folded itself over you, one limb at a time.',
  worm: 'They only ever wanted to hold you.',
  thresher: 'It opened, and you went in.',
  swimmer: 'The water closed over the last of the light.',
  grabber: 'The doorway closed its hands.',
  bloat: 'It sat on you. It did not seem to notice.',
  patient: '',
  dead: '',
};

/* ---- hurting you */

/** it lands on you: what it takes of you and of your poise (sim/combat.ts, struck), and the shove it gives you
 *  (kg m/s), or for one that throws you, how fast (m/s). Run into it and it lands harder; back off and softer
 *  (sim/moves.ts, closing); down, harder still */
export function strikes(sim: Sim, m: Mutant, dmg: number, poise: number, shove = 0, throws = 0): void {
  const b = sim.player.body;
  /* you are on something well above it: it cannot reach */
  if (!m.fixed && b.y - m.y > 1.4) return;
  const dx = b.x - m.x, dz = b.z - m.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d;
  const k = closing(-(b.vx * ux + b.vz * uz)) * (sim.hands.down > 0 ? DOWN.more : 1);
  hurtBy(sim.game, dmg * k, DEATH[m.ai], { x: m.x, z: m.z });
  const dv = throws || (shove * k) / b.mass, r = struck(sim, poise * k, { x: m.x, z: m.z }, dv);
  log(sim.game, `${m.type} → you  ${(dmg * k).toFixed(0)} dmg  ×${k.toFixed(2)}  shove ${dv.toFixed(1)} m/s  → ${r}  (poise ${(poise * k).toFixed(0)}, ${sim.hands.poise.toFixed(0)}/30 left)`);
  if (shove) impulse(b, ux * shove * k, uz * shove * k);
}

/* ---- taking turns

   Husks come at you one at a time. The one at you is the nearest of those hunting you close by (one mid-blow keeps its
   place); the rest hold off at arm's length and a half, circling, faced to you, until you are open (a blow of yours
   thrown, your arm coming back, or you reeling) or they have waited long enough. Your opening is their turn. */

export const WAIT = { ring: 2.4, near: 4, patience: 3 };

/** the husk at you, or -1 */
export function frontOf(sim: Sim): number {
  let best = -1, bd = 3.2;
  for (const m of sim.cast) {
    if (m.dead || m.ai !== 'husk' || m.state !== 'hunt' || Math.abs(m.dy) > 1.5) continue;
    const d = m.blow ? -1 : m.dp;
    if (d < bd) { bd = d; best = m.id; }
  }
  return best;
}

/** it holds off: another is at you, you are not open, and it has not waited too long */
export function waits(sim: Sim, m: Mutant): boolean {
  return sim.front >= 0 && sim.front !== m.id && !exposed(sim) && m.pat < WAIT.patience && m.dp < WAIT.near;
}

/** `ring` from you, edging round you, faced to you */
export function hover(sim: Sim, m: Mutant, ring: number): void {
  const p = sim.player.body, d = m.dp || 1, ux = (m.x - p.x) / d, uz = (m.z - p.z) / d;
  const a = m.id % 2 ? 0.35 : -0.35, c = Math.cos(a), sn = Math.sin(a);
  go(sim, m, p.x + (ux * c - uz * sn) * ring, p.z + (ux * sn + uz * c) * ring, pace(m, 'hover'));
  turnTo(sim, m, 8);
}

/* ---- a blow: wound up, thrown, recovered from

   A blow is three motions, as yours is two. The wind-up is the tell: it is heard, and the thing turns to follow you
   only for the first part of it, then holds the line it has chosen, so a step aside as it commits takes you out of the
   way. The strike is short and goes where it was aimed, carrying the thing forward a little: it lands only on you in
   front of it (an arc about the way it faces), within its reach, and not well above or below it. Then it recovers
   where the blow left it, not moving, not turning, and longer when the blow met nothing. That is your time. */

export type BlowPhase = 'wind' | 'strike' | 'after';
/** `at`: one of the cast it is thrown at (an index into Sim.cast), not you: the night round's, at the other patient */
export interface Blow { ph: BlowPhase; t: number; hit: boolean; at?: number }

/** a blow's motions, reach and weight: the same kind of thing as yours (sim/moves.ts) */
export type BlowKind = Move;

/** the blow this one throws, if it throws one */
export function blowKind(m: Mutant): BlowKind | null {
  switch (m.ai) {
    case 'husk': return (MOVES as Record<string, Move>)[m.type] ?? MOVES.husk; // its kind's own, if it has one
    case 'skitter': return m.big ? MOVES.bigSkitter : MOVES.skitter;
    case 'thresher': return MOVES.thresher;
    case 'worm': return MOVES.worm;
    case 'swimmer': return MOVES.swimmer;
    default: return null;
  }
}

/** where it is in its blow: the motion, and how far through it (0..1) */
export function blowAt(m: Mutant): { ph: BlowPhase; q: number } | null {
  const B = m.blow, K = blowKind(m);
  if (!B || !K) return null;
  const dur = B.ph === 'wind' ? K.wind : B.ph === 'strike' ? K.strike : B.hit ? K.rec : K.miss;
  return { ph: B.ph, q: Math.min(1, B.t / dur) };
}

/** how long a wide blow that glanced off a wall leaves it reeling (s), before the long recovery of a blow that met
 *  nothing */
const GLANCED = 0.6;

/** what an arm goes through: other bodies, and nothing else (glass stops it, though sight goes through) */
const onlyBodies = (d: Dyn) => d.kind === 'body';

/** a wall within the arc of its wide blow, at about a metre up, either side, out to most of its reach */
function cramped(sim: Sim, m: Mutant, K: Move): boolean {
  const half = Math.acos(K.arc), R = m.r + K.reach * 0.8, y = m.y + 1;
  for (const e of [-half, half]) {
    const a = m.yaw + e;
    if (sim.world.raycast(m.x, y, m.z, m.x + Math.sin(a) * R, y, m.z + Math.cos(a) * R, onlyBodies) < 1) return true;
  }
  return false;
}

/** how fast a lunge gets going (m/s²): it is thrown, all but at once */
const LUNGE = 120;

/** close enough to begin one */
export const inStart = (m: Mutant, K: BlowKind) => m.dp < m.r + K.start && Math.abs(m.dy) < 1.2;

/** you are where the blow goes: in front of it, in its reach, about level with it */
export function inBlow(sim: Sim, m: Mutant, K: BlowKind): boolean {
  const b = sim.player.body, dx = b.x - m.x, dz = b.z - m.z, d = Math.hypot(dx, dz);
  if (d > m.r + K.reach || Math.abs(b.y - m.y) > 1.4) return false;
  /* so close you are inside it: there is no getting round that */
  if (d < m.r) return true;
  return (dx * Math.sin(m.yaw) + dz * Math.cos(m.yaw)) / d >= K.arc;
}

export function beginBlow(sim: Sim, m: Mutant, K: BlowKind, at?: number): void {
  m.blow = at === undefined ? { ph: 'wind', t: 0, hit: false } : { ph: 'wind', t: 0, hit: false, at };
  step_(sim, m, K.tell, K.big);
}

/** a step of a blow under way; false when there is none, so the behaviour goes on with whatever else it does */
export function blowStep(sim: Sim, m: Mutant): boolean {
  const B = m.blow, K = blowKind(m);
  if (!B || !K) return false;
  B.t += dt;
  /* at another of the cast: turned to them, and it lands where they are, for sure */
  const q = B.at === undefined ? null : sim.cast[B.at];
  if (q) {
    if (B.ph !== 'after') turnToward(m, Math.atan2(q.x - m.x, q.z - m.z), K.turn);
    if (B.ph === 'wind' && B.t >= K.wind) { B.ph = 'strike'; B.t = 0; step_(sim, m, 'swing', K.big); }
    else if (B.ph === 'strike' && B.t >= K.strike) { B.hit = true; beaten(sim, q); B.ph = 'after'; B.t = 0; }
    else if (B.ph === 'after' && B.t >= K.rec) m.blow = null;
    return true;
  }
  switch (B.ph) {
    case 'wind':
      if (B.t < K.wind * K.lock) {
        turnTo(sim, m, K.turn);
        /* backed off from: it comes after you, until it has committed */
        if (K.creep && m.body && !inStart(m, K)) drive(sim, m, Math.sin(m.yaw) * K.creep, Math.cos(m.yaw) * K.creep);
      }
      if (B.t >= K.wind) {
        /* a wide blow with a wall in its arc glances off it: nothing lands, and it reels, long open */
        if (K.wide && cramped(sim, m, K)) {
          B.ph = 'after'; B.t = 0; B.hit = false;
          sfx(sim.game, 'blow', { x: m.x, y: m.y + 1, z: m.z });
          step_(sim, m, 'thud', true);
          m.reel = GLANCED; m.stun = Math.max(m.stun, GLANCED);
          break;
        }
        B.ph = 'strike'; B.t = 0; step_(sim, m, 'swing', K.big);
      }
      break;
    case 'strike': {
      /* the lunge, along the line it chose, thrown at once; not into you if you are already under it */
      if (m.body && m.dp > m.r + 0.3) drive(sim, m, Math.sin(m.yaw) * (K.lunge / K.strike), Math.cos(m.yaw) * (K.lunge / K.strike), LUNGE);
      if (!B.hit && inBlow(sim, m, K)) { B.hit = true; strikes(sim, m, K.dmg, K.poise, K.shove); }
      if (B.t >= K.strike) { if (!B.hit) step_(sim, m, 'whiff', K.big); B.ph = 'after'; B.t = 0; }
      break;
    }
    case 'after':
      if (B.t >= (B.hit ? K.rec : K.miss)) { m.blow = null; m.cd = K.cd; }
      break;
  }
  return true;
}

/** a blow that catches one open, recovering from its own: it hurts more, and takes more of its poise */
const OPEN = { dmg: 1.25, poise: 1.6 };
/** how long a flinch holds it, and a stagger (s); longer caught open */
const HOLD = { flinch: 0.2, stagger: 0.9 };

/** what a hit carries: the harm, the poise it takes, and the shove it gives (kg m/s), all as stood still; the way the
 *  shove goes, if not straight away from you; and what struck, for the hit log */
export interface Hit {
  dmg: number; poise: number; shove?: number; dir?: { x: number; z: number }; by?: string;
  /** where it landed, and the way what struck was going there: what a body killed by it goes loose with */
  at?: V3; way?: V3;
  /** how long it holds it still (s): everything it was doing waits, and the shove it was given (sim/moves.ts, HITSTOP) */
  stop?: number;
}

/** something hit it: a blow or a shot, landing `k` times as hard as one stood still (sim/moves.ts, closing). It is
 *  shoved away from you by what it weighs: a worm is thrown, a husk sent back a step, a thresher rocked, a bloat not
 *  moved at all. */
export function hitMutant(sim: Sim, m: Mutant, w: Hit, k = 1): void {
  const g = sim.game, p = sim.player.body, ph = m.blow?.ph, open = ph === 'after';
  /* on the floor, it takes a blow harder, and has no footing left to lose */
  if (m.down > 0) k *= DOWN.more;
  m.hp -= w.dmg * k * (open ? OPEN.dmg : 1);
  m.hit = Math.max(m.hit, Math.min(1, k));
  if (w.stop) m.stop = Math.max(m.stop, w.stop);
  sfx(g, 'hit');
  let v = 0, ux = 0, uz = 0;
  if (m.body && w.shove) {
    const dx = m.x - p.x, dz = m.z - p.z, d = Math.hypot(dx, dz) || 1;
    v = Math.min(SHOVE.most, (w.shove * k) / m.body.mass);
    ux = w.dir ? w.dir.x : dx / d; uz = w.dir ? w.dir.z : dz / d;
    if (v > 0) { m.body.vx += ux * v; m.body.vz += uz * v; }
  }
  const said = (r: string) => log(g, `${w.by ?? 'blow'} → ${m.type}  ${(w.dmg * k * (open ? OPEN.dmg : 1)).toFixed(0)} dmg  ×${k.toFixed(2)}${open ? ' open' : ''}  shove ${v.toFixed(1)} m/s  → ${r}`);
  if (m.hp <= 0) { kill(sim, m, { ux, uz, v, at: w.at, way: w.way }); said('dead'); return; }
  if (m.down > 0) {
    /* the body on the floor takes the blow where it landed (sim/ragdoll.ts) */
    if (m.rag && m.body && w.at && v > 0) knockRag(m.rag, w.at, w.way ?? { x: ux, y: 0, z: uz }, v * m.body.mass, sim.tick);
    /* and its hands come up to its face (sim/ragdoll.ts, REFLEX) */
    if (m.rag) m.rag.guard = REFLEX.guard.time;
    said('down already');
    return;
  }
  /* the ladder (sim/moves.ts): the part of its blow it is in may shrug it off; getting up, it has better footing */
  const K = blowKind(m), armour = !K ? 0 : ph === 'wind' ? K.armour.wind : ph === 'strike' ? K.armour.strike : 0;
  const hitPoise = Math.max(0, w.poise * k * (open ? OPEN.poise : 1) - (m.rise > 0 ? RISE.guard : 0));
  const R = react(m.poise, m.pmax, hitPoise, armour), hold = open ? OPEN.poise : 1;
  m.poise = R.left; m.calm = 0;
  if (R.r === 'stagger' && v >= LAUNCH.dv && m.body) { m.body.vy += LAUNCH.up * v; m.body.ground = false; }
  if (R.r === 'stagger' && v >= DOWN.dv && upright(m)) floored(sim, m, { ux, uz, v, at: w.at, way: w.way });
  else if (R.r === 'stagger') { m.blow = null; m.reel = HOLD.stagger * hold; m.stun = Math.max(m.stun, m.reel); }
  /* a flinch loses a blow on its way; one already thrown, it is still recovering from */
  else if (R.r === 'flinch') { if (!open) m.blow = null; m.stun = Math.max(m.stun, HOLD.flinch * hold); }
  said(`${m.down > 0 ? (v >= LAUNCH.dv ? 'thrown' : 'down') : R.r}  (poise ${hitPoise.toFixed(0)}, ${R.left.toFixed(0)}/${m.pmax} left)`);
  switch (m.ai) {
    case 'husk':
      if (m.state === 'idle' || m.state === 'lurk') { m.state = 'hunt'; m.lost = 0; m.post = false; rouse(sim, m); }
      /* braced to charge, or charging: put off it by anything that makes it flinch */
      else if ((m.state === 'brace' || m.state === 'rush') && R.r !== 'none') m.state = 'hunt';
      else if (m.hp < m.max * temperOf(m).flee && !m.fled && sim.rng.chance(0.5)) { m.state = 'flee'; m.st = 7; m.fled = true; m.blow = null; step_(sim, m, 'moan'); }
      if (R.r === 'stagger') step_(sim, m, 'moan');
      break;
    case 'worm': m.flee = 5; m.blow = null; break;
    case 'swimmer': m.flee = 3.5; m.blow = null; break;
    case 'skitter': if (m.state === 'idle') { m.state = 'hunt'; m.lost = 0; } break;
    case 'thresher': if (['idle', 'patrol'].includes(m.state)) { m.state = 'wind'; m.st = 0.5; m.dest = -1; } break;
    default: break;
  }
}

/** it stands on its feet, so it can be knocked off them: not the low ones (on the floor already), the fixed, or what
 *  nothing moves */
const upright = (m: Mutant): boolean => !!m.body && !m.low && !m.swim && Number.isFinite(m.body.mass);

/** knocked off its feet: down a while, then getting up; nothing it was doing goes on (sim/moves.ts, DOWN). Its body goes
 *  down loose, carrying what floored it, held to where its feet are (sim/ragdoll.ts); it is drawn coming back up out of
 *  that as it rises */
function floored(sim: Sim, m: Mutant, blow: Killing | null = null): void {
  if (RAG.floored) { m.rag = makeRag(m, blow, true); if (m.rag) m.rag.woke = sim.tick; }
  m.blow = null; m.reel = 0;
  m.down = DOWN.time; m.rise = 0;
  m.stun = Math.max(m.stun, DOWN.time + DOWN.rise);
  step_(sim, m, 'thud', true);
}

/** thrown into something solid, or fallen: `over` m/s past what does no harm, and the harm and poise of each (a
 *  slam or a fall, sim/moves.ts). A fall that breaks its poise puts it on the floor */
export function battered(sim: Sim, m: Mutant, over: number, r: { dmg: number; poise: number }): void {
  if (m.dead) return;
  if (m.down > 0) over *= DOWN.more;
  log(sim.game, `${r === FALL ? 'fall' : 'slam'} → ${m.type}  ${(over * r.dmg).toFixed(0)} dmg  (${over.toFixed(1)} m/s over)`);
  m.hp -= over * r.dmg;
  m.hit = Math.max(m.hit, 0.6);
  step_(sim, m, 'thud', m.big || m.mass > 2);
  if (m.hp <= 0) { kill(sim, m); return; }
  if (m.down > 0) return;
  const R = react(m.poise, m.pmax, Math.max(0, over * r.poise - (m.rise > 0 ? RISE.guard : 0)), 0);
  m.poise = R.left; m.calm = 0;
  if (R.r === 'stagger' && r === FALL && upright(m)) floored(sim, m);
  else if (R.r === 'stagger') { m.blow = null; m.reel = HOLD.stagger; m.stun = Math.max(m.stun, m.reel); }
  else if (R.r === 'flinch') { m.blow = null; m.stun = Math.max(m.stun, HOLD.flinch); }
}

/** you walked into it: what was not already after you is now */
export function shoved(sim: Sim, m: Mutant): void {
  if (m.dead) return;
  if (m.ai === 'husk' && m.state !== 'hunt' && m.state !== 'flee') { m.state = 'hunt'; m.lost = 0; m.post = false; m.dest = -1; step_(sim, m, 'moan'); rouse(sim, m); }
  else if (m.ai === 'skitter' && m.state === 'idle') { m.state = 'hunt'; m.lost = 0; m.bt = 0; step_(sim, m, 'skit'); }
}

/** dev (the arena): every one of the cast dead at once; with none left alive, the dead taken away, but for the station's
 *  own (they are the level's, and some have something on them) */
export function killAll(sim: Sim): void {
  if (sim.cast.some(m => !m.dead)) { for (const m of sim.cast) if (!m.dead) kill(sim, m); return; }
  for (const m of sim.cast) if (m.ai !== 'dead') { m.rag = null; m.away = true; }
}

function kill(sim: Sim, m: Mutant, blow: Killing | null = null, yours = true): void {
  m.dead = true;
  /* what has a body goes loose, carrying what killed it (sim/ragdoll.ts); the rest folds where it is. One already
     down is loose already, and takes the blow where it lies */
  if (m.rag && m.body && blow?.at && blow.v > 0) knockRag(m.rag, blow.at, blow.way ?? { x: blow.ux, y: 0, z: blow.uz }, blow.v * m.body.mass, sim.tick);
  else if (!m.rag) m.rag = makeRag(m, blow);
  if (m.rag) m.rag.woke = sim.tick;
  m.gone = 0;
  m.blow = null;
  m.ride = null;
  if (yours) sim.game.kills++;
  /* the body goes out of the world: what is left is not in anyone's way */
  if (m.body) {
    const k = sim.world.dyn.indexOf(m.body.dyn);
    if (k >= 0) sim.world.dyn.splice(k, 1);
  }
}
