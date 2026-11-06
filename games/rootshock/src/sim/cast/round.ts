import type { RoundStop } from '../../content/types';
import { angLerp, clamp } from '../../core/math';
import { STEP } from '../../core/loop';
import { field as fieldFrom } from '../../world/nav';
import { carded, rulesFor, soundRules, staffField } from '../fields';
import { end, power, sfx } from '../game';
import { MOVES } from '../moves';
import type { Sim } from '../sim';
import { bones, knockRag, layRag, makeRag, ragAt } from '../ragdoll';
import type { Mutant } from '../cast';
import { fieldTo, follow, go, mayRoute, rnd, step_, turnToward } from './move';
import { pace } from './gait';
import { beginBlow } from './blows';
import { doorMid, SEARCH } from './husk';

/* The night round and the other patient (world.md §8, the night round; the opening): the round a stop at a time,
   its card at the readers and its flashlight; the other patient at the glass, and hiding; and what the round does
   to them when it finds them. */

const dt = STEP;

/* ---- the night round (world.md §8): one of the changed still walking the night shift's round, a stop at a time, its
   flashlight on. It is the one that walks the dark: its beam is what it sees by, so it keeps to its round lit or not. At
   a stop it stands and plays its beam about; at a door on its round it tries the reader with its card, which beeps green
   or red. Taken off its round (it saw you, an alarm, a breaker), it comes back to it where it left off. */

/** at a stop, how long it looks about if the stop does not say, how far its beam swings either way (radians) and how
 *  fast; between tries at a reader, and how far either way it sweeps its beam about a room it has opened, or one it has
 *  gone into to search; how far below level it holds the beam walking; and, drawn off a stop by a noise, how long it
 *  stands looking toward it first, its beam on it (sound before sight: the opening). Its paces are its gait's
 *  (cast/gait.ts, nightround): slow on its round, sedated as they all are; after you, slower than the rest */
export const ROUND = { look: 2.5, sweep: 0.55, into: 0.5, about: 1.5, swing: 1.1, beep: 0.8, pitch: 0.14, roused: 4.5 };

/** the door a stop tries: the nearest within reach of it (not a pane of glass), or -1 */
function stopDoor(sim: Sim, P: RoundStop): number {
  let best = -1, bd = 2.6;
  sim.doors.forEach((d, k) => {
    if (d.def.glass) return;
    const at = doorMid(d), dd = Math.hypot(at.x - P.x, at.z - P.z);
    if (dd < bd && Math.abs(d.def.y0 - P.y) < 1) { bd = dd; best = k; }
  });
  return best;
}

/** it shows the door its card. A dark reader does nothing; a live one beeps, green if the card opens it (and the door
 *  lets it through, as any of the staff's), red if not. True if it opened */
function tryDoor(sim: Sim, m: Mutant, k: number): boolean {
  const d = sim.doors[k], at = doorMid(d);
  if (!d.def.card || power(sim.game, d.def.circuit) <= 0) return false;
  const ok = m.cards && carded(sim, d);
  d.beep = READER; d.beepOk = ok;
  sfx(sim.game, ok ? 'take' : 'deny', at);
  if (ok) { d.open = true; d.pass = Math.max(d.pass, 2.5 + (m.round?.[m.beat % m.round.length].look ?? 0)); }
  return ok;
}
/** how long a reader shows green or red after a card (s) */
export const READER = 0.8;

/** a stop it keeps now: one wanting a circuit live is passed by while it is dead, and one for the first time round only
 *  after that */
const keeps = (sim: Sim, m: Mutant, P: RoundStop) => (!P.need || power(sim.game, P.need) > 0) && (!P.once || m.lap === 0);

/** a step of its round: to the next stop it keeps, then a while there, looking about or at a reader */
export function walkRound(sim: Sim, m: Mutant): void {
  const R = m.round!, Fs = sim.fields;
  if (!Fs || m.spot < 0 || !R.length) return;
  const P = R[m.beat % R.length];
  const next = () => { m.beat = (m.beat + 1) % R.length; if (m.beat === 0) m.lap++; m.dest = -1; m.wt = 0; m.st = 0; };
  /* stopped: the beam about, or held on the reader; then the card, as many times as the stop says */
  if (m.wt > 0) {
    const k = P.tries ? stopDoor(sim, P) : -1;
    if (P.graft && m.graft > 0) grafting(sim, m);
    else if (k >= 0) {
      /* at the reader; through a door it opened, its beam swept about the room, side to side */
      const at = doorMid(sim.doors[k]), to = Math.atan2(at.x - m.x, at.z - m.z), sweep = m.st <= 0 && sim.doors[k].open ? Math.sin(m.ph * ROUND.swing * 1.6) * ROUND.into : 0;
      turnToward(m, to + sweep, 4);
    } else if (P.about) turnToward(m, m.wm + Math.sin(m.ph * ROUND.swing * 0.8) * ROUND.about, 2.5); // right round the room
    else turnToward(m, m.wm + Math.sin(m.ph * ROUND.swing) * ROUND.sweep, 3);
    if ((m.wt -= dt) > 0) return;
    if (P.take) {
      /* the other patient, where they hide: struck, and struck again, and then taken */
      const q = m.drag < 0 ? prey(sim, m) : undefined;
      if (q && m.st > 0) { m.st--; beginBlow(sim, m, MOVES.husk, q.id); m.wt = m.st > 0 ? BEAT.gap : BEAT.grab; return; }
      if (q) { take(sim, m, q); m.wt = P.wait ?? ROUND.look; return; }
    }
    if (m.st > 0 && k >= 0) {
      m.st--;
      /* green: it looks in, its beam into the room, a while; red: a moment, and again if it was to try again */
      if (tryDoor(sim, m, k)) { m.st = 0; m.wt = P.look ?? ROUND.beep; }
      else m.wt = ROUND.beep;
      return;
    }
    next();
    return;
  }
  if (m.dest < 0) {
    if (!keeps(sim, m, P)) { next(); return; }
    const k = Fs.nav.locate(P.x, P.y, P.z);
    if (k < 0) { next(); return; }
    if (!mayRoute(sim)) return;
    m.F = fieldTo(sim, m, k);
    if (!Number.isFinite(m.F[m.spot])) { next(); return; }
    m.dest = k; m.stk = 0;
  }
  if (m.spot === m.dest || m.F![m.spot] < 0.9) {
    /* there: it stops, and looks about (or at the reader), the way it came or the way the stop faces it; and takes
       whoever is there to be taken */
    m.dest = -1; m.wm = P.face ?? m.yaw; m.st = P.take ? BEAT.blows : P.tries ?? 0;
    m.wt = P.tries ? P.wait ?? ROUND.beep : P.take ? BEAT.first : P.wait ?? ROUND.look;
    if (P.graft) graftHere(sim, m);
    if (m.wt <= 0) next();
    return;
  }
  if (follow(sim, m, m.F!, P.pace ?? pace(m, 'round'), false)) m.stk = 0;
  else if ((m.stk += dt) > 4) next(); // it cannot get there as things stand: on to the next
}

/** at a stop where it takes someone: how many times it strikes them first, the moment before the first, between them,
 *  and before it takes hold (s) */
export const BEAT = { blows: 2, first: 0.6, gap: 0.5, grab: 0.9 };

/** the other patient, near where it stops: there to be taken */
const prey = (sim: Sim, m: Mutant) => sim.cast.find(q => !q.dead && q.ai === 'patient' && q.state !== 'dragged' && Math.hypot(q.x - m.x, q.z - m.z) < 4 && Math.abs(q.y - m.y) < 1);

/** a blow of the night round's landing on the other patient: they are rocked by it, and bleed where they are (the pool
 *  is the sim's, so it is there however it is drawn: Sim.pools) */
export function beaten(sim: Sim, q: Mutant): void {
  sfx(sim.game, 'struck', { x: q.x, y: q.y + 0.8, z: q.z });
  q.hit = 1; q.reel = 0.5;
  const P = sim.pools.find(p => !p.kind && Math.hypot(p.x - q.x, p.z - q.z) < 0.6);
  if (P) P.r = Math.min(1.4, P.r + 0.5);
  else sim.pools.push({ x: q.x, y: q.y, z: q.z, r: 0.8 });
}

/** the other patient, struck down: out cold (Pia's line: its touch is the opiate, world.md §10), and it takes them by an
 *  ankle and drags them from then on. Alive, and taken (world.md §8, the opening) */
function take(sim: Sim, m: Mutant, q: Mutant): void {
  m.yaw = Math.atan2(q.x - m.x, q.z - m.z); m.wm = m.yaw;
  sfx(sim.game, 'taken', { x: q.x, y: q.y + 1, z: q.z });
  slack(sim, q);
  q.state = 'dragged';
  m.drag = q.id; m.trail = 0;
}

/** out cold: loose, alive, no tone, and out of everyone's way (made again after a load, as a save does not say what is in
 *  the world) */
function slack(sim: Sim, q: Mutant): void {
  q.down = 1e9; q.rise = 0;
  if (!q.rag) q.rag = makeRag(q, null, true);
  if (q.rag) { q.rag.limp = true; q.rag.woke = sim.tick; }
  if (q.body) { const k = sim.world.dyn.indexOf(q.body.dyn); if (k >= 0) sim.world.dyn.splice(k, 1); }
}

/** the graft (world.md §8, the opening): where it stops with what it has dragged, it lets go, kneels over them and puts
 *  the leaf into their arm, which takes a while, the body jerking under it, the suite's lights stuttering (`stutters`)
 *  and the blood spreading round them. Then it leaves them there, out cold. `GRAFT`: how long it takes (s), how long it
 *  looks at its work after, and how often the body jerks; how hard */
export const GRAFT = { time: 6, after: 1.5, jerk: [0.25, 0.7] as const, J: 45 };
function graftHere(sim: Sim, m: Mutant): void {
  const q = sim.cast[m.drag];
  m.drag = -1;
  if (!q || q.dead) return;
  q.state = 'out'; q.grafted = true;
  if (q.rag) q.rag.pin = null;
  const at = q.rag ? ragAt(q.rag) : { x: q.x, y: q.y, z: q.z };
  m.wx = at.x; m.wz = at.z; m.st = 0.4;
  m.graft = GRAFT.time; m.wt = GRAFT.time + GRAFT.after;
  sfx(sim.game, 'graft', { x: at.x, y: at.y + 0.3, z: at.z });
}
/** a step of it: down over the body, its beam on it; the body jerking, and bleeding */
function grafting(sim: Sim, m: Mutant): void {
  turnToward(m, Math.atan2(m.wx - m.x, m.wz - m.z), 4);
  const q = sim.cast.find(o => o.grafted && o.state === 'out' && Math.hypot(o.x - m.wx, o.z - m.wz) < 2);
  if (!q?.rag) return;
  bleed(sim, q, 0.3);
  if ((m.st -= dt) > 0) return;
  m.st = sim.rng.range(GRAFT.jerk[0], GRAFT.jerk[1]);
  const B = bones(q.rag.kind), i = Math.floor(sim.rng.range(0, B.names.length - 0.001)), p = q.rag.p;
  knockRag(q.rag, { x: p[i * 3], y: p[i * 3 + 1], z: p[i * 3 + 2] }, { x: sim.rng.range(-0.4, 0.4), y: 1, z: sim.rng.range(-0.4, 0.4) }, GRAFT.J, sim.tick);
}

/** grafting: the suite's lights stutter hard while it does it (render/view.ts, the soundscape) */
export const stutters = (sim: Sim): boolean => sim.cast.some(m => m.graft > 0);

/** blood: a pool spreading under one of the cast where it lies (by `k` metres a second, to as big as a pool gets), and a
 *  smear where a body is dragged (`Sim.pools`; drawn in castView.ts, and walked through, render/prints.ts). Not without
 *  end */
export const BLOOD = { pool: 1.9, most: 220, smear: 0.55 };
function bleed(sim: Sim, q: Mutant, k: number): void {
  const at = q.rag ? ragAt(q.rag) : { x: q.x, y: q.y, z: q.z };
  const P = sim.pools.find(p => !p.kind && Math.hypot(p.x - at.x, p.z - at.z) < 0.7);
  if (P) P.r = Math.min(BLOOD.pool, P.r + k * dt);
  else if (sim.pools.length < BLOOD.most) sim.pools.push({ x: at.x, y: q.y, z: at.z, r: 0.3 });
}
function smear(sim: Sim, x: number, y: number, z: number, yaw: number): void {
  if (sim.pools.length < BLOOD.most) sim.pools.push({ x, y, z, r: 1, kind: 'smear', yaw });
}

/** you, in the opening, within its reach: weak from the days under and nothing in your hands, you are taken as the other
 *  patient was (world.md §8, The opening). The rest of the game it fights as the others do; and not in god mode */
export function takesYou(sim: Sim, m: Mutant): boolean {
  const O = sim.opening;
  if (!m.round || !m.torch || !O || O.phase === 'done' || sim.game.ended || sim.game.god) return false;
  const b = sim.player.body;
  m.yaw = Math.atan2(b.x - m.x, b.z - m.z);
  sfx(sim.game, 'taken', { x: b.x, y: b.y + 1, z: b.z });
  end(sim.game, false, 'Its hand closes on your ankle, and where it touches you, you go slack. You are still awake when it starts to drag you.');
  return true;
}

/** dragged by the ankle: its foot in the night round's hand, low behind it, and the rest of it after, on the floor, as
 *  the loose body goes (sim/ragdoll.ts): where it is is where its middle is. It bleeds as it goes, and leaves a smear */
const DRAG = { hand: [0.3, -0.3, 0.42] as const };
function dragged(sim: Sim, m: Mutant): void {
  const d = sim.cast.find(q => q.drag === m.id && !q.dead);
  if (!d || !m.body) return;
  const s = Math.sin(d.yaw), c = Math.cos(d.yaw), [rx, fz, hy] = DRAG.hand;
  /* its right is (cos, -sin) of where it faces (sin, cos) */
  const hx = d.x + rx * c + fz * s, hz = d.z - rx * s + fz * c;
  if (m.rag) { m.rag.pin = { i: bones(m.model).at.footR, x: hx, y: d.y + hy, z: hz }; m.rag.awake = true; m.rag.still = 0; }
  lies(sim, m);
  if ((m.trail += Math.hypot(d.x - d.px, d.z - d.pz)) >= BLOOD.smear) { m.trail = 0; smear(sim, m.x, m.y, m.z, d.yaw); }
}
/** out cold where it lies: its body kept with its loose body's middle, out of everyone's way (made again after a load,
 *  as a save does not say what is in the world) */
function lies(sim: Sim, m: Mutant): void {
  const b = m.body!, k = sim.world.dyn.indexOf(b.dyn);
  if (k >= 0) sim.world.dyn.splice(k, 1);
  if (m.rag) { const at = ragAt(m.rag); b.x = m.x = at.x; b.z = m.z = at.z; b.y = m.y = Math.max(at.y, m.y - 0.5); }
  b.vy = 0; b.vx = b.vz = 0; b.sync();
}

/** the other patient (world.md §8, the opening): at its window, still, until it sees you wake; then banging on the glass
 *  to you, which carries. When that draws the night round's beam onto the hall it stops, points up at it for you, and
 *  crouches under its window: what to fear, and what to do, shown without a word. Found anyway (its door takes a guard's
 *  card), it is struck down where it hides, dragged out and grafted, and left out cold. `BANG`: how often it strikes the glass (s), how far the sound carries
 *  (m); how long it points */
export const BANG = { every: [0.55, 0.95] as const, loud: 40, least: 2.5, warn: 2.8 };
export function patient(sim: Sim, m: Mutant): void {
  const b = sim.player.body;
  /* its door opening, early: down at once */
  const opened = sim.doors.some(d => d.t > 0.3 && !d.def.glass && !d.def.open && Math.hypot((d.def.x0 + d.def.x1) / 2 - m.x, (d.def.z0 + d.def.z1) / 2 - m.z) < 3);
  if (opened && (m.state === 'wait' || m.state === 'bang' || m.state === 'warn')) m.state = 'hide';
  const face = (x: number, z: number, k = 3) => { m.yaw = angLerp(m.yaw, Math.atan2(x - m.x, z - m.z), Math.min(1, dt * k)); };
  const to = (P: { x: number; z: number } | null) => !P || Math.hypot(P.x - m.x, P.z - m.z) < 0.25 || (go(sim, m, P.x, P.z, pace(m, 'walk')), m.mv = pace(m, 'walk'), false);
  switch (m.state) {
    case 'bang': {
      /* at the glass, toward you: struck, and struck again, until the noise brings something; and a moment more, the time
         it takes to see the beam come on to the hall (m.tense: it has been heard) */
      face(b.x, b.z);
      m.st += dt;
      if (m.tense && m.st > BANG.least) { m.state = 'warn'; m.st = BANG.warn; break; }
      if ((m.wt -= dt) > 0) break;
      m.wt = sim.rng.range(BANG.every[0], BANG.every[1]);
      const at = { x: m.x + Math.sin(m.yaw) * 0.5, y: m.y + 1.4, z: m.z + Math.cos(m.yaw) * 0.5 };
      sfx(sim.game, 'bang', at);
      if (noiseAt(sim, at.x, m.y, at.z, BANG.loud)) m.tense = 1;
      break;
    }
    case 'warn':
      /* it has seen the beam: still, to you, pointing up at it */
      face(b.x, b.z);
      if ((m.st -= dt) <= 0) m.state = 'hide';
      break;
    case 'hide': {
      /* down under its window, as small as it can make itself, turned to its door */
      if (!to(m.hide)) break;
      const d = sim.doors.find(q => !q.def.glass && !q.def.open && Math.hypot((q.def.x0 + q.def.x1) / 2 - m.x, (q.def.z0 + q.def.z1) / 2 - m.z) < 4);
      if (d) face((d.def.x0 + d.def.x1) / 2, (d.def.z0 + d.def.z1) / 2, 2);
      break;
    }
    case 'dragged':
      dragged(sim, m);
      break;
    case 'out':
      /* out cold where it was left, grafted, bleeding a while yet */
      lies(sim, m);
      bleed(sim, m, 0.012);
      break;
  }
}

/** a sound made somewhere, not by you (the other patient banging, a big door opened): heard by each of the cast it
 *  carries to as the air goes (shut doors muffle it), within `loud` metres. One on its round at a stop turns to it, its
 *  beam on it, a while, and then goes on with its round; one at rest, on the same floor, goes over to look (world.md §8:
 *  noise draws them): about there a while, or, if it is to `come` however far it is, as long as the walk takes it and
 *  then a while there. True if any on its round heard it */
export function noiseAt(sim: Sim, x: number, y: number, z: number, loud: number, come = false): boolean {
  const Fs = sim.fields;
  if (!Fs) return false;
  const spot = Fs.nav.locate(x, y, z);
  if (spot < 0) return false;
  const heard = fieldFrom(Fs.nav, spot, soundRules(sim, Fs), undefined, loud);
  let roused = false;
  for (const m of sim.cast) {
    if (m.dead || m.stun > 0 || m.spot < 0 || m.ai !== 'husk' || !(heard[m.spot] < loud)) continue;
    if (m.state === 'round' && m.wt > 0 && m.st <= 0) {
      if (m.wt > ROUND.roused) { m.wt = ROUND.roused; m.wm = Math.atan2(x - m.x, z - m.z); }
      roused = true;
    } else if (m.state === 'idle' && !m.round && Math.abs(y - m.y) < 1.5) {
      step_(sim, m, 'mutter');
      m.state = 'search'; m.st = rnd(sim, SEARCH.time[0], SEARCH.time[1]) + (come ? heard[m.spot] / pace(m, 'search') : 0);
      m.dest = -1; m.wx = x; m.wz = z; m.wt = 0; m.post = false;
    }
  }
  return roused;
}

/** seen where it cannot get to you (behind the glass of a room whose door will not take its card): the night round comes
 *  to the glass and looks in at you a while, then goes on with its round. `PEER`: how long it looks, how near the glass it
 *  stands, how long before it will do so again, how near you a door it has yet to try is yours (m), and how many of its
 *  stops ahead it looks for one */
export const PEER = { look: 5, off: 0.55, again: 25, near: 6, ahead: 6 };

/** a door beside you is still to be tried on its round: at the stop it is at (tries left), or one of the next several */
export function triesYours(sim: Sim, m: Mutant): boolean {
  const R = m.round!, b = sim.player.body;
  for (let k = 0; k < PEER.ahead; k++) {
    const P = R[(m.beat + k) % R.length];
    if (!P.tries || (k === 0 && m.dest < 0 && m.st <= 0 && m.wt > 0)) continue; // that one tried, and done with
    const d = stopDoor(sim, P);
    if (d >= 0 && Math.hypot((sim.doors[d].def.x0 + sim.doors[d].def.x1) / 2 - b.x, (sim.doors[d].def.z0 + sim.doors[d].def.z1) / 2 - b.z) < PEER.near) return true;
  }
  return false;
}

/** can it get to where you are, as the doors stand, with its card? */
export function reaches(sim: Sim, m: Mutant): boolean {
  const Fs = sim.fields;
  if (!Fs || m.spot < 0 || Fs.from < 0) return false;
  if (Number.isFinite(Fs.ways[m.walker][m.spot])) return true;
  if (m.cards && m.walker === 'hands') return Number.isFinite(staffField(sim, Fs)[m.spot]);
  return Number.isFinite(fieldFrom(Fs.nav, Fs.from, rulesFor(sim, Fs, m.walker, m.cards), undefined, 90)[m.spot]);
}

/** the pane nearest it between it and you, and the spot on its own side of it to look in from; or where it stands */
export function glassSpot(sim: Sim, m: Mutant): { x: number; z: number } {
  const b = sim.player.body;
  let best: { x: number; z: number } | null = null, bd = 4;
  for (const d of sim.doors) {
    const D = d.def;
    if (!D.glass || Math.abs(D.y0 - m.y) > 1.5) continue;
    const cx = (D.x0 + D.x1) / 2, cz = (D.z0 + D.z1) / 2, dd = Math.hypot(cx - m.x, cz - m.z);
    if (dd > bd) continue;
    /* its side of the pane, toward you across it */
    const nx = D.alongX ? 0 : Math.sign(m.x - cx) || 1, nz = D.alongX ? Math.sign(m.z - cz) || 1 : 0;
    if ((b.x - cx) * nx + (b.z - cz) * nz > 0) continue; // you are on its side: no pane between
    bd = dd; best = { x: cx + nx * PEER.off, z: cz + nz * PEER.off };
  }
  return best ?? { x: m.x, z: m.z };
}

/** its flashlight: from its lens, in its left hand held out before it, along where it looks. Walking it holds the beam
 *  a little down the way ahead; after you, or looking in at you, on you. It swings the beam there, most of the way in a
 *  fifth of a second (`swing`, a share a second), not in a step. Drawn (castView.ts) from the same numbers */
export const TORCH = { shoulder: [-0.27, 1.46] as const, arm: 0.66, lead: 0.06, swing: 15 };
/** how far down it wants its flashlight (rad) */
function torchAim(sim: Sim, m: Mutant): number {
  const b = sim.player.body;
  if (m.state === 'hunt' || m.state === 'peer') return clamp(Math.atan2(m.y + TORCH.shoulder[1] - (b.y + 1.1), Math.max(0.5, m.dp)), -0.6, 0.9);
  if (m.graft > 0) return clamp(Math.atan2(TORCH.shoulder[1] - 0.6, Math.max(0.4, Math.hypot(m.wx - m.x, m.wz - m.z))), 0, 1.1); // down on what it grafts
  return ROUND.pitch;
}
/** a step of its flashlight: swung toward where it wants it, which changes at once with what it is doing. The beam, the
 *  light it puts on you for the cast, and the arm drawn holding it all go from this one pitch */
export function swingTorch(sim: Sim, m: Mutant): void {
  m.tp += (torchAim(sim, m) - m.tp) * Math.min(1, dt * TORCH.swing);
}
export function torchRay(m: Mutant): { x: number; y: number; z: number; dx: number; dy: number; dz: number; pitch: number } {
  const pitch = m.tp;
  const s = Math.sin(m.yaw), c = Math.cos(m.yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const [ox, oy] = TORCH.shoulder, L = TORCH.arm + TORCH.lead; // the beam from just past the lens
  /* its own right is (cos, -sin) of where it faces (sin, cos); the shoulder to its left, the hand out along the beam */
  const x = m.x + ox * c + s * cp * L, z = m.z - ox * s + c * cp * L, y = m.y + oy - sp * L;
  return { x, y, z, dx: s * cp, dy: -sp, dz: c * cp, pitch };
}

/** the other patient as the opening leaves them, for a game begun without it: out cold where they were grafted (`at`),
 *  in their blood, and their blood where they hid */
export function leftGrafted(sim: Sim, m: Mutant, at: { x: number; y: number; z: number }): void {
  if (m.dead || !m.body) return;
  if (m.hide) sim.pools.push({ x: m.hide.x, y: m.y, z: m.hide.z, r: 1.3 });
  const b = m.body;
  b.x = m.x = m.px = at.x; b.y = m.y = m.py = at.y; b.z = m.z = m.pz = at.z; b.sync();
  m.rag = layRag(m);
  slack(sim, m);
  m.state = 'out'; m.grafted = true;
  sim.pools.push({ x: at.x, y: at.y, z: at.z, r: BLOOD.pool });
}
