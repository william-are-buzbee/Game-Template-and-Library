import { wstats, type Shape, type WeaponStats } from '../content/items';
import { clamp } from '../core/math';
import { STEP } from '../core/loop';
import type { Dyn } from '../world/world';
import { hitMutant, type Mutant } from './cast';
import { consume, log, makeNoise, sfx } from './game';
import { push } from './body';
import { knockRag, ragOnLine } from './ragdoll';
import { closing, DOWN, GLANCE, HITSTOP, LAUNCH, POISE, react, REEL, regain, RISE, SHOVE, swingOf, type Swing } from './moves';
import { ACTIVE, across, along, frame, meetsCylinder, type Frame, type V3 } from './sweep';
import type { Input } from './input';
import { eyeHeight } from './player';
import type { Sim } from './sim';

export { wstats, type WeaponStats };

/* Your hands (engine.md §8; §6, F2). A swing is two motions: the arm comes up (the load, as long as the weight in it
   takes), and the blow comes down. Every blow of a weapon is the same blow, in full, at the pace its weight allows:
   click, and it swings as soon as the arm is up; hold, and it stays up until you let go. There are no half blows. A
   blow that lands stops the swing for a moment (hit-stop), so you feel it land. A gun fires on the press.

   Once thrown, a blow is committed (sim/moves.ts): it goes along the line you let it go on, wherever you look after;
   a full one carries you a step forward, and one that meets nothing leaves you longer coming back. A load can be held
   as long as you like, and nothing that hits you takes a load or a blow from you short of putting you on the floor. A
   hit takes poise, though: enough of it and you reel, thrown back and slowed, and cannot start another load until you
   have your feet; enough to floor you, and what was in your hands goes with your footing. A press while you are busy
   is kept a moment, so a blow can follow a blow.

   Which way it goes is what you hold as you press (wayOf): from your left or your right, over your head, or the
   weapon's own way. Only the path is yours to choose: the blow is the same blow, as hard and as quick, whichever way
   it comes. What it meets on the way is what differs (a side swing glances in a corridor a chop clears, and takes the
   one on your flank first). */

export interface Hands {
  /** seconds a swing has been loading; -1 when not */
  chg: number;
  full: boolean;
  /** let go before the arm was up: the blow goes as soon as it is */
  go: boolean;
  /** a swing under way: how far through it is and how long it takes; how far across the part that can land it has
   *  been traced (sim/sweep.ts); whether that part is over, and whether it ended meeting nothing but the world; and
   *  how far through it was when it glanced off something, or when it met one of the cast and stopped in it, if it did */
  swing: { t: number; dur: number; a: number; done: boolean; missed?: boolean; glance?: number; struck?: number; knocked?: number[] } | null;
  /** the line a thrown blow goes along, fixed as you let it go */
  line: { yaw: number; pitch: number } | null;
  /** after a blow that met nothing, the arm coming back: no new swing until it is in */
  rec: number;
  /** after any blow, seconds left that your feet are still its (sim/moves.ts, Swing.settle) */
  plant: number;
  /** a blow has landed: the swing holds still this long */
  stop: number;
  /** a gun's cooldown */
  gcd: number;
  /** a gun's kick, 1 dying to 0, and its flash */
  kick: number;
  muzzle: number;
  /** the button was down last step */
  held: boolean;
  /** a press while busy, kept this much longer */
  buf: number;
  /** the way the last press asked for (wayOf), and the way the load or blow under way goes, taken from it as the load
   *  begins; null before any */
  want: Shape | null;
  way: Shape | null;
  /** your poise, seconds since you were last hit, and seconds left of reeling */
  poise: number;
  calm: number;
  stag: number;
  /** knocked down (sim/moves.ts, DOWN): seconds left on the floor, then seconds left getting up; and which way you
   *  went over (1 to your right, -1 to your left), for the view */
  down: number;
  rise: number;
  side: number;
}

export const makeHands = (): Hands => ({
  chg: -1, full: false, go: false, swing: null, line: null, rec: 0, plant: 0, stop: 0, gcd: 0, kick: 0, muzzle: 0, held: false, buf: 0, want: null, way: null,
  poise: POISE.you, calm: 99, stag: 0, down: 0, rise: 0, side: 1,
});

/** how long a press is kept while you are busy (s) */
const BUF = 0.2;

/** the way a press asks a swing to go, by what you hold as you press: from your left (A), a backhand across to your
 *  right; from your right (D), a side swing across to your left; forward (W), over your head and down for anything
 *  swung, or straight out for what is thrust (the knife, your fists); nothing, or back, the weapon's own way. A key
 *  counts pushed more than halfway (a stick need not be pushed all the way), the stronger if both are. With the sides
 *  swapped (Input.swap, a setting), A sends it from your right and D from your left: the blow goes the way you step */
export function wayOf(w: WeaponStats, input: Input): Shape {
  const s = input.swap ? -input.strafe : input.strafe, f = input.forward;
  if (Math.abs(s) >= 0.5 && Math.abs(s) >= f) return s < 0 ? 'back' : 'side';
  if (f >= 0.5) return w.shape === 'thrust' ? 'thrust' : 'chop';
  return w.shape;
}

/** the way the load or blow under way goes: as it was asked to, if what is in your hand goes that way (it may have
 *  been changed since), else that thing's own way */
export function wayNow(sim: Sim, w = wstats(sim.game.weapon)): Shape {
  const way = sim.hands.way;
  return way === 'side' || way === 'back' || way === (w.shape === 'thrust' ? 'thrust' : 'chop') ? way : w.shape;
}

const dt = STEP;
const wet = (sim: Sim) => sim.player.water !== 'dry';
export const loadTime = (sim: Sim, w: WeaponStats) => (w.time + 0.15) * (wet(sim) ? 1.3 : 1);
const swingFor = (w: WeaponStats) => swingOf(w.kind, w.mass);
/** how long a blow of it stood still holds still what it lands on, and itself (sim/moves.ts, HITSTOP) */
const stopFor = (w: WeaponStats) => HITSTOP.base + HITSTOP.kg * w.mass;

/** you are open: a blow of yours thrown, your arm coming back, or you reeling. What waits for its turn goes now. */
export const exposed = (sim: Sim): boolean => {
  const h = sim.hands;
  return h.rec > 0 || h.stag > 0 || !!h.swing?.done;
};

/** your pace as a share of it: none on the floor, a third while you reel or get up (sim/moves.ts, REEL, DOWN); loading
 *  does not slow you, and swinging takes your feet another way (feet) */
export const pace = (sim: Sim): number => {
  const h = sim.hands;
  return h.down > 0 ? 0 : h.stag > 0 || h.rise > 0 ? REEL.pace : 1;
};

/** your say over your feet, as a share of it (sim/moves.ts, Swing.feet): a blow of yours has them from letting it go
 *  until it has settled, and, one that met nothing, until the arm is in. Loading does not */
export const feet = (sim: Sim): number => {
  const h = sim.hands;
  return h.swing || h.rec > 0 || h.plant > 0 ? swingFor(wstats(sim.game.weapon)).feet : 1;
};

/** the blow you let go is done, landed or not, and has your feet still: you are planted (player.ts) */
export const planted = (sim: Sim): boolean => {
  const h = sim.hands;
  return h.swing ? h.swing.done : h.rec > 0 || h.plant > 0;
};

/** you are on the floor, or getting up from it */
export const floored = (sim: Sim): boolean => sim.hands.down > 0 || sim.hands.rise > 0;

export function updateHands(sim: Sim, input: Input): void {
  const h = sim.hands, g = sim.game, w = wstats(g.weapon), S = swingFor(w);
  if (h.gcd > 0) h.gcd -= dt;
  if (h.kick > 0) h.kick = Math.max(0, h.kick - dt * 5);
  if (h.muzzle > 0) h.muzzle -= dt;
  if (h.rec > 0) h.rec -= dt;
  if (h.plant > 0) h.plant -= dt;
  if (h.stag > 0) h.stag = Math.max(0, h.stag - dt);
  if (h.down > 0) { h.down = Math.max(0, h.down - dt); if (h.down === 0) h.rise = DOWN.rise; }
  else if (h.rise > 0) h.rise = Math.max(0, h.rise - dt);
  if (h.buf > 0) h.buf -= dt;
  h.calm += dt;
  h.poise = regain(h.poise, POISE.you, h.calm, dt);
  const press = input.attack && !h.held, release = !input.attack && h.held;
  h.held = input.attack;
  if (w.gun) { h.chg = -1; h.swing = null; if (press && h.stag <= 0 && !floored(sim)) fire(sim, w); return; }
  const free = !h.swing && h.chg < 0 && h.rec <= 0 && h.stag <= 0 && !floored(sim);
  if (press) h.want = wayOf(w, input);
  if (press && !free) h.buf = BUF;
  /* a buffered press starts the load whether or not it is still held: let go already, it is a click. It goes the way
     it asked for as it was pressed, whatever is held now */
  if (free && (press || h.buf > 0)) { h.chg = 0; h.full = false; h.go = !input.attack; h.buf = 0; h.way = h.want; }
  if (h.chg >= 0) {
    h.chg += dt;
    if (release) h.go = true;
    if (h.chg >= loadTime(sim, w) && !h.full) { h.full = true; if (!h.go) sfx(g, 'load'); }
    /* up, and let go of: down it comes, along the way you face now */
    if (h.full && h.go) {
      h.chg = -1; h.full = false; h.go = false;
      h.swing = { t: 0, dur: (0.2 + 0.05 * w.mass) * (wet(sim) ? 1.3 : 1), a: 0, done: false };
      h.line = { yaw: sim.player.yaw, pitch: sim.player.pitch };
      sfx(g, 'swing');
    }
  }
  const s = h.swing;
  if (s) {
    if (h.stop > 0) h.stop -= dt;
    else s.t += dt;
    const q = Math.min(1, s.t / s.dur);
    if (!s.done) {
      /* trace it across what it has covered this step; the first thing it meets ends it */
      const a = across(q);
      const met = a > s.a ? sweep(sim, w, s.a, a) : 'none';
      s.a = a;
      if (met !== 'none' || q >= ACTIVE.to) {
        s.done = true;
        s.missed = met !== 'hit';
        if (met === 'glance') s.glance = q;
        /* it stops in what it hit: it does not go on through it */
        if (met === 'hit') s.struck = q;
        lunge(sim, S);
      }
    }
    if (q >= 1) {
      h.swing = null; h.line = null;
      if (s.missed) h.rec = S.miss;
      h.plant = S.settle;
    }
  }
}

/** a blow carries you a step along it, once it is done: up to its pace along it, not on top of what you had (run in,
 *  and it adds nothing; backing off, it takes you forward all the same) */
function lunge(sim: Sim, S: Swing): void {
  const L = sim.hands.line, b = sim.player.body;
  if (!L || !b.ground) return;
  const fx = -Math.sin(L.yaw), fz = -Math.cos(L.yaw), dv = clamp(S.lunge - (b.vx * fx + b.vz * fz), 0, S.lunge);
  push(b, fx * dv, fz * dv);
}

/** a blow lands on you, with `poise` behind it and shoving you at `dv` m/s: the ladder (sim/moves.ts). Short of
 *  flooring you, it takes no load and no blow from you. If it breaks your poise you reel: thrown back from it, slowed,
 *  no new load until you have your feet. If it breaks your poise and shoves you hard enough (DOWN.dv), you go down, and
 *  a load held up or a blow thrown is lost: there is no swinging from the floor; harder still (LAUNCH.dv), you are
 *  thrown, and land down. Down, a hit takes no more footing from you; getting up, it has to get past RISE.guard. */
export function struck(sim: Sim, poise: number, from?: { x: number; z: number }, dv = 0): string {
  const h = sim.hands, g = sim.game, b = sim.player.body;
  if (g.ended) return 'none';
  h.calm = 0;
  if (h.down > 0) return 'down already';
  const R = react(h.poise, POISE.you, Math.max(0, poise - (h.rise > 0 ? RISE.guard : 0)), 0);
  h.poise = R.left;
  if (R.r !== 'stagger') return R.r === 'flinch' ? 'shrugged off' : 'none';
  if (dv >= DOWN.dv) {
    /* off your feet: over the way the blow sent you, and, hard enough, up and over; what was in your hands goes with
       your footing, the load you held up and the blow you threw. A button still held when you are up starts nothing:
       let go and press again */
    h.down = DOWN.time; h.rise = 0; h.stag = 0;
    h.chg = -1; h.full = false; h.go = false; h.swing = null; h.line = null; h.buf = 0;
    if (from) { const r = { x: Math.cos(sim.player.yaw), z: -Math.sin(sim.player.yaw) }; h.side = (b.x - from.x) * r.x + (b.z - from.z) * r.z >= 0 ? 1 : -1; }
    if (dv >= LAUNCH.dv) push(b, 0, 0, LAUNCH.up * dv);
    sfx(g, 'reel');
    sfx(g, 'land', undefined, false, 0, 1);
    g.events.push({ type: 'shake', k: 0.6 });
    return dv >= LAUNCH.dv ? 'thrown' : 'down';
  }
  h.stag = REEL.you;
  sfx(g, 'reel');
  g.events.push({ type: 'shake', k: 0.35 });
  if (from) { const dx = b.x - from.x, dz = b.z - from.z, d = Math.hypot(dx, dz) || 1; push(b, (dx / d) * REEL.push, (dz / d) * REEL.push); }
  return 'stagger';
}

const seeThrough = (d: Dyn) => d.kind === 'body';

/** where a gun looks from and which way */
function aim(sim: Sim) {
  const p = sim.player, b = p.body, cp = Math.cos(p.pitch);
  return { ex: b.x, ey: b.y + eyeHeight(p), ez: b.z, fx: -Math.sin(p.yaw) * cp, fy: Math.sin(p.pitch), fz: -Math.cos(p.yaw) * cp };
}

/** what of a grabber can be hit: all of it as it is drawn (castView.ts), its sac and head and the tentacles that hang
 *  from them to your knee, taken as an upright column `r` across standing `out` off its wall, from `y0` to `y1` over
 *  the floor. (Its head alone, as first built, was a ball above your eye, and you could not tell where it was) */
const GRAB = { out: 0.12, r: 0.42, y0: 0.35, y1: 2.55 };
const grabAt = (m: Mutant) => ({ x: m.x + Math.sin(m.yaw) * GRAB.out, z: m.z + Math.cos(m.yaw) * GRAB.out });

/** the frame of the blow under way: your eye, and the line it was thrown along */
function blowFrame(sim: Sim): Frame {
  const p = sim.player, b = p.body, L = sim.hands.line ?? p;
  return frame({ x: b.x, y: b.y + eyeHeight(p), z: b.z }, L.yaw, L.pitch);
}

/** how far out the head of what you swing goes along its path: its reach across the floor, whatever the pitch (you
 *  lean into a blow aimed low, so looking down at a worm costs you no reach) */
const headReach = (sim: Sim, w: WeaponStats): number => w.reach / Math.max(0.6, Math.cos((sim.hands.line ?? sim.player).pitch));

/** the path the head of your blow takes across the part that can land, for the dev overlay; null with none under way */
export function sweepPath(sim: Sim, n = 16): V3[] | null {
  if (!sim.hands.swing || sim.hands.swing.done) return null;
  const w = wstats(sim.game.weapon), F = blowFrame(sim), R = headReach(sim, w), out: V3[] = [];
  for (let i = 0; i <= n; i++) out.push(along(F, wayNow(sim, w), R, i / n));
  return out;
}

const mix = (a: V3, b: V3, t: number): V3 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
const ray = (sim: Sim, a: V3, b: V3) => sim.world.raycast(a.x, a.y, a.z, b.x, b.y, b.z, seeThrough);

/* Your blow traced across the part of it that can land, from `a0` to `a1` of it (sim/sweep.ts): the hand to the head of
   what you swing, a few points along it, each followed through this step's move. The first thing any of them meets is
   what the blow meets: one of the cast, and it is hit; a wall, a door, a crate, and the blow glances off it (a heavy
   one hard enough to knock the wind out of you). The floor it scrapes along. A thing on the far side of a wall is not
   reached through it. */
function sweep(sim: Sim, w: WeaponStats, a0: number, a1: number): 'none' | 'hit' | 'glance' {
  const g = sim.game, b = sim.player.body, F = blowFrame(sim), R = headReach(sim, w), sh = wayNow(sim, w);
  const n = Math.max(1, Math.ceil((a1 - a0) * 8));
  for (let i = 0; i < n; i++) {
    const u0 = a0 + ((a1 - a0) * i) / n, u1 = a0 + ((a1 - a0) * (i + 1)) / n;
    let best: Mutant | null = null, bt = 2, at: V3 | null = null, from: V3 | null = null, to: V3 | null = null;
    /* what lies in its way is knocked by the head's path, or by the length of it, which reaches the floor */
    const H0 = along(F, sh, R, u0), H1 = along(F, sh, R, u1), S0 = along(F, sh, R, u1, 0.5);
    for (const m of sim.cast) if (m.dead && m.rag) knock(sim, w, m, H0, H1, F) || knock(sim, w, m, S0, H1, F, H1.x - H0.x, H1.y - H0.y, H1.z - H0.z);
    for (const k of [0.5, 0.75, 1]) {
      const A = along(F, sh, R, u0, k), B = along(F, sh, R, u1, k);
      for (const m of sim.cast) {
        if (m.dead) continue;
        const c = grabAt(m);
        const t = m.model === 'grabber' ? meetsCylinder(A, B, c.x, c.z, GRAB.r, m.y + GRAB.y0, m.y + GRAB.y1)
          : meetsCylinder(A, B, m.x, m.z, m.r + 0.08, m.y, m.y + (m.body?.h ?? 1));
        if (t === null || t >= bt) continue;
        const P = mix(A, B, t);
        if (ray(sim, F.p, P) < 1) continue; // behind something
        bt = t; best = m; at = P; from = A; to = B;
      }
    }
    /* the world: the head's own path this step, and the length of the thing from your hand to the head. The floor
       does not stop it: a blow aimed low scrapes along it */
    const tp = ray(sim, H0, H1), ts = ray(sim, F.p, H1);
    const C = tp < 1 ? mix(H0, H1, tp) : ts < 1 ? mix(F.p, H1, ts) : null;
    const tw = !C || C.y < b.y + 0.3 ? 2 : tp < 1 ? tp : 1;
    if (best && at && from && to && bt <= tw) { landOn(sim, w, best, from, to, at); return 'hit'; }
    if (C && tw <= 1) {
      sfx(g, 'blow', C);
      makeNoise(g, 8);
      landed(sim, 0.8, stopFor(w));
      /* it comes back at you: a heavy thing hard enough to knock the wind out of you */
      const r = struck(sim, swingFor(w).poise * GLANCE.poise, { x: C.x, z: C.z });
      log(g, `${sim.game.weapon ?? 'fists'} ${sh} glanced off the wall  → ${r}  (poise ${(swingFor(w).poise * GLANCE.poise).toFixed(0)}, ${sim.hands.poise.toFixed(0)}/30 left)`);
      return 'glance';
    }
  }
  return 'none';
}

/** a swing that passes through a corpse knocks it, once a swing, with what it would shove one of the living by, and
 *  goes on through it (sim/ragdoll.ts): a body on the floor is not in the way of a blow */
function knock(sim: Sim, w: WeaponStats, m: Mutant, A: V3, B: V3, F: Frame, hx = B.x - A.x, hy = B.y - A.y, hz = B.z - A.z): boolean {
  const S = sim.hands.swing;
  if (!S || S.knocked?.includes(m.id)) return false;
  const hit = ragOnLine(m.rag!, A, B, 0.05);
  if (!hit || ray(sim, F.p, hit.at) < 1) return false;
  (S.knocked ??= []).push(m.id);
  const b = sim.player.body, L = sim.hands.line ?? sim.player, fx = -Math.sin(L.yaw), fz = -Math.cos(L.yaw);
  const hl = Math.hypot(hx, hy, hz) || 1;
  /* half along the line it was thrown, half the way the head was going (hx, hy, hz), as a blow on the living goes */
  const way = { x: fx + hx / hl, y: hy / hl, z: fz + hz / hl };
  knockRag(m.rag!, hit.at, way, SHOVE.you * (w.mass + SHOVE.arm) * closing(b.vx * fx + b.vz * fz), sim.tick);
  sfx(sim.game, 'hit', hit.at);
  return true;
}

/** your blow lands on one of the cast: as hard as you and it were closing along it (sim/moves.ts, closing), and it is
 *  shoved the way the blow was going (half along the line, half the way the head was moving: a side swing sends a
 *  worm off to your left) */
function landOn(sim: Sim, w: WeaponStats, m: Mutant, A: V3, B: V3, at: V3): void {
  const b = sim.player.body, L = sim.hands.line ?? sim.player, fx = -Math.sin(L.yaw), fz = -Math.cos(L.yaw);
  const you = b.vx * fx + b.vz * fz, it = m.fixed ? 0 : -((m.x - m.px) * fx + (m.z - m.pz) * fz) / dt;
  /* the head's way across the floor counts by how much of its going is across the floor: a chop coming down (or, low,
     back toward you) shoves along the line, not off it. (Each made a unit on its own, a chop landing below your eye
     summed to almost nothing, and the shove went whichever way what was left of it pointed) */
  const hl = Math.hypot(B.x - A.x, B.y - A.y, B.z - A.z) || 1;
  let dx = fx + (B.x - A.x) / hl, dz = fz + (B.z - A.z) / hl, dl = Math.hypot(dx, dz);
  if (dl < 0.1) { dx = fx; dz = fz; dl = 1; }
  const k = closing(you + it), stop = stopFor(w) * k;
  hitMutant(sim, m, { dmg: w.dmg, poise: swingFor(w).poise, shove: SHOVE.you * (w.mass + SHOVE.arm), dir: { x: dx / dl, z: dz / dl }, by: `${sim.game.weapon ?? 'fists'} ${wayNow(sim, w)}`, at, way: { x: B.x - A.x, y: B.y - A.y, z: B.z - A.z }, stop }, k);
  makeNoise(sim.game, 10);
  landed(sim, 1, stop);
}

/** a blow met something: the swing stops in it `stop` seconds (hit-stop), and the view takes a jolt `k` (0..1) hard */
function landed(sim: Sim, k: number, stop: number): void {
  sim.hands.stop = stop;
  sim.game.events.push({ type: 'impact', k });
}

function fire(sim: Sim, w: WeaponStats): void {
  const h = sim.hands, g = sim.game;
  if (h.gcd > 0) return;
  if (sim.player.under) { sfx(g, 'deny'); h.gcd = 0.5; return; }
  const i = g.inv.findIndex(s => s.id === w.ammo);
  if (i < 0) { sfx(g, 'deny'); h.gcd = 0.5; return; }
  consume(g, i);
  const big = w.dmg > 50, range = w.range ?? 20;
  h.gcd = w.cd ?? 0.5; h.kick = 1; h.muzzle = 0.06;
  sfx(g, big ? 'boom' : 'shot');
  makeNoise(g, 36);
  g.events.push({ type: 'shake', k: big ? 0.3 : 0.12 });
  const A = aim(sim);
  let best: Mutant | null = null, bd = 1e9, by = 0;
  for (const m of sim.cast) {
    if (m.dead) continue;
    const dx = m.x - A.ex, dz = m.z - A.ez, d = Math.hypot(dx, dz);
    if (d > range) continue;
    /* a grabber is aimed at where your line crosses it, as high as it hangs */
    const ty = m.model === 'grabber' ? clamp(A.ey + (A.fy / (Math.hypot(A.fx, A.fz) || 1)) * d, m.y + GRAB.y0, m.y + GRAB.y1) : m.y + Math.min(0.9, (m.body?.h ?? 1) * 0.6), hy = ty - A.ey;
    const dot = (dx * A.fx + hy * A.fy + dz * A.fz) / Math.hypot(dx, hy, dz);
    if (dot < (w.cone ?? 0.98) && d > m.r + 0.8) continue;
    if (sim.world.raycast(A.ex, A.ey, A.ez, m.x, ty, m.z, seeThrough) < 1) continue;
    if (d < bd) { bd = d; best = m; by = ty; }
  }
  if (best) hitMutant(sim, best, { dmg: w.dmg * (big ? clamp(1.2 - bd / range, 0.25, 1) : 1), poise: big ? 60 : 22, shove: big ? 300 : 40, by: g.weapon ?? 'gun', at: { x: best.x, y: by, z: best.z }, way: { x: A.fx, y: A.fy, z: A.fz } }, 1);
  /* a corpse on its line, short of the wall, is shoved as one of the living would be; the round goes on */
  const from = { x: A.ex, y: A.ey, z: A.ez }, far = { x: A.ex + A.fx * range, y: A.ey + A.fy * range, z: A.ez + A.fz * range };
  const t = sim.world.raycast(from.x, from.y, from.z, far.x, far.y, far.z, seeThrough), to = { x: from.x + (far.x - from.x) * t, y: from.y + (far.y - from.y) * t, z: from.z + (far.z - from.z) * t };
  let hit: { m: Mutant; t: number; at: V3 } | null = null;
  for (const m of sim.cast) {
    if (!m.rag) continue;
    const h = ragOnLine(m.rag, from, to);
    if (h && (!hit || h.t < hit.t)) hit = { m, ...h };
  }
  if (hit) knockRag(hit.m.rag!, hit.at, { x: A.fx, y: A.fy, z: A.fz }, big ? 300 : 40, sim.tick);
}
