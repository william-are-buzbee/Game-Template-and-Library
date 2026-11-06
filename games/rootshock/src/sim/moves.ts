/* Moves and reactions (engine.md §6, F2). One kind of blow for everything that fights: a wind-up (the tell), a strike
   (the short part that lands), and a recovery (your time, longer when it met nothing). Yours are worked out from what
   you hold; the cast's are written here. Over every blow sits the reaction ladder: a hit takes poise, and what it does
   depends on what is left. Thresholds, never a roll: the same blow does the same thing every time, so it can be learned.

   - none: it took the hit and goes on. A blow in a part that has armour (a thresher's arms, a skitter rearing) is
     not stopped by a hit lighter than its armour.
   - flinch: a wind-up or strike is lost; a moment's pause.
   - stagger: its poise is broken. It reels, open, for a while, and its poise comes back whole.

   Past stagger: knocked down, and thrown (below). Your own blows are never stopped (engine.md §6, F2 as built). */

export interface Move {
  /** seconds of each motion; recovery after a blow that landed, and after one that met nothing; a rest after that */
  wind: number; strike: number; rec: number; miss: number; cd: number;
  /** how fast it turns to follow you as it winds up, and how far through the wind-up it stops turning (and following:
   *  until then it creeps after you at `creep` m/s if you back out of its start, so backing off does not dodge it;
   *  stepping aside once it has stopped does) */
  turn: number; lock: number; creep: number;
  /** how near it comes before it begins, how far past its own edge the blow reaches, the cosine of half the arc it
     sweeps, and how far it lunges as it strikes */
  start: number; reach: number; arc: number; lunge: number;
  dmg: number;
  /** the poise a blow that lands takes */
  poise: number;
  /** the shove a blow that lands gives (kg m/s): on you, 75 kg, a husk's is 1.5 m/s */
  shove: number;
  /** the hit it shrugs off while winding up, and while striking, without losing the blow (it still costs it poise) */
  armour: { wind: number; strike: number };
  /** what it makes heard as it winds up */
  tell: string;
  big?: boolean;
  /** a blow swept wide, side to side: where a wall stands within its arc it glances off it (sim/cast.ts, blowStep) and
   *  is left reeling, long open. A corridor is the place to fight one */
  wide?: boolean;
}

const deg = (a: number) => Math.cos((a * Math.PI) / 180);

export const MOVES = {
  /* overhead, with one arm: wide, as an arm comes down, and slow to come back from */
  husk: { wind: 0.55, strike: 0.12, rec: 0.5, miss: 0.85, cd: 0.3, turn: 10, lock: 0.7, creep: 1.8, start: 0.85, reach: 1.0, arc: deg(55), lunge: 0.3, dmg: 20, poise: 20, shove: 110, armour: { wind: 0, strike: 12 }, tell: 'heave' },
  /* the bone line's middle years: the husk's blow with the bone arm, longer, heavier, a touch slower to throw and harder
     to put off */
  bonemid: { wind: 0.6, strike: 0.13, rec: 0.5, miss: 0.9, cd: 0.35, turn: 9, lock: 0.7, creep: 2.0, start: 1.05, reach: 1.3, arc: deg(50), lunge: 0.35, dmg: 28, poise: 26, shove: 150, armour: { wind: 6, strike: 16 }, tell: 'heave' },
  /* it rears and drops on you: narrow, and further forward than it looks. Fists do not put it off its drop */
  skitter: { wind: 0.5, strike: 0.1, rec: 0.4, miss: 0.7, cd: 0.45, turn: 6, lock: 0.6, creep: 0, start: 0.75, reach: 0.75, arc: deg(35), lunge: 0.5, dmg: 22, poise: 18, shove: 120, armour: { wind: 10, strike: 14 }, tell: 'skit' },
  bigSkitter: { wind: 0.7, strike: 0.15, rec: 0.7, miss: 1.1, cd: 0.6, turn: 5, lock: 0.6, creep: 0, start: 1.1, reach: 1.1, arc: deg(45), lunge: 0.6, dmg: 45, poise: 34, shove: 220, armour: { wind: 18, strike: 28 }, tell: 'skit', big: true },
  /* both arms, side to side: hard to get round, hard to stop, but a long time open after */
  thresher: { wind: 0.6, strike: 0.15, rec: 0.9, miss: 1.3, cd: 0.4, turn: 6, lock: 0.65, creep: 1.0, start: 0.7, reach: 0.9, arc: deg(70), lunge: 0.25, dmg: 45, poise: 45, shove: 360, armour: { wind: 30, strike: 60 }, tell: 'growl', big: true, wide: true },
  /* a worm's or a swimmer's is hardly a blow: a short rasp, the head lifted and the hand drawn back, then a grab. Quick
     to see, quick to be over: a step back as it lifts is enough */
  worm: { wind: 0.3, strike: 0.08, rec: 0.25, miss: 0.4, cd: 1.0, turn: 8, lock: 0.5, creep: 0, start: 0.7, reach: 0.75, arc: deg(60), lunge: 0.15, dmg: 12, poise: 8, shove: 30, armour: { wind: 0, strike: 0 }, tell: 'rasp' },
  swimmer: { wind: 0.3, strike: 0.08, rec: 0.25, miss: 0.4, cd: 0.9, turn: 8, lock: 0.5, creep: 0, start: 0.7, reach: 0.75, arc: deg(60), lunge: 0.2, dmg: 15, poise: 10, shove: 30, armour: { wind: 0, strike: 0 }, tell: 'rasp' },
} satisfies Record<string, Move>;

/* ---- the ladder */

/** how much a body can take before it reels; what it gets back once left alone, and after how long */
export const POISE = {
  you: 30, husk: 25, bonemid: 35, plantold: 30, skitter: 20, bigSkitter: 40, worm: 12, swimmer: 12, thresher: 70, bloat: 1e9, other: 30,
  /** seconds without a hit before it comes back, and how much of the whole a second */
  calm: 1.0, regain: 0.5,
};

export type Reaction = 'none' | 'flinch' | 'stagger';

/** a hit of `hit` poise on a body with `left` of it, in a part with `armour`: what it does, and what poise is left */
export function react(left: number, max: number, hit: number, armour: number): { r: Reaction; left: number } {
  if (hit <= 0) return { r: 'none', left };
  const now = left - hit;
  if (now <= 0) return { r: 'stagger', left: max };
  return { r: hit > armour ? 'flinch' : 'none', left: now };
}

/** a step of getting poise back: none while it is still being hit, then quickly */
export function regain(left: number, max: number, calm: number, dt: number): number {
  return calm < POISE.calm ? left : Math.min(max, left + max * POISE.regain * dt);
}

/* ---- impact (engine.md §6, F3a)

   What a blow carries is the speed of what strikes, relative to what it strikes. A blow stood still lands as written
   here; one thrown running in, or into something coming at you, lands harder; one thrown backing off lands softer.
   The head of a swung thing goes at about 11 m/s, so a blow run into at a sprint (5.6 m/s) is half again as hard.
   It is the same rule both ways: run into a husk's blow and it is harder on you too. Damage, the poise it takes and
   the shove it gives all go by it. */

export const IMPACT = { head: 11, least: 0.6, most: 1.8 };

/** how hard a blow lands, as a share of one stood still, for how fast the two were closing along it (m/s) */
export const closing = (v: number): number => Math.min(IMPACT.most, Math.max(IMPACT.least, 1 + v / IMPACT.head));

/** a blow of yours that lands holds both still a moment, what struck and what it struck (hit-stop): your swing stops in
 *  it, and it stands where it was hit, everything it was doing waiting, the shove it was given too. This long (s) for a
 *  blow stood still, and this much more a kilogram swung; as much longer as it lands harder (closing). Fists 0.05, the
 *  pipe 0.08, the axe 0.09, the axe run in at a sprint 0.14. A blow that glances off a wall holds your swing as long as
 *  one stood still */
export const HITSTOP = { base: 0.04, kg: 0.016 };

/** the shove a blow of yours gives: kg m/s for each kilogram swung, an arm's 1.5 kg with it; and the fastest a blow
 *  sends anything (m/s), so a worm is thrown, not fired. The axe sends a husk (80 kg) back at 4 m/s, a thresher at 1.5,
 *  a bloat not at all */
export const SHOVE = { you: 70, arm: 1.5, most: 7 };

/** thrown into something solid faster than `min` (m/s), or falling onto it faster than `min`: it hurts, `dmg` and
 *  `poise` for each m/s over. Your own feet never slam you: only being thrown does */
export const SLAM = { min: 3, dmg: 4, poise: 6 };
export const FALL = { min: 10, dmg: 6, poise: 8 };

/* ---- knocked down and thrown (engine.md §6, knockdowns)

   A hit that breaks a body's poise and shoves it at DOWN.dv or more knocks it off its feet, if it stands on them (you,
   a husk, a thresher; not the low ones, a worm, a skitter, which are on the floor already); at LAUNCH.dv or
   more it is thrown, some of the shove turned upward, and comes down after. Down, it does nothing for a while; then it
   gets up, and while it does a hit has to get past RISE.guard of poise before it counts: a moment of better footing,
   not immunity, so one knockdown cannot chain into the next. A blow on something down lands DOWN.more times as hard.
   A fall that breaks its poise puts it down too. Thresholds, as the rest of the ladder: the same blow does the same
   thing every time. A husk stood still and struck with the axe (4.1 m/s) reels; run in, and it goes down (6.2). */

/** the shove (m/s) that floors, how long a body stays down, how long it takes to get up (s), and how much harder a
 *  blow on something down lands */
export const DOWN = { dv: 4.5, time: 1.0, rise: 0.6, more: 1.5 };
/** the shove (m/s) that throws, and the share of it that goes upward */
export const LAUNCH = { dv: 7, up: 0.45 };
/** the poise a hit has to get past while its target is getting up */
export const RISE = { guard: 25 };

/** a blow of yours that glances off the world comes back at you with this share of the poise it would have taken
 *  (sim/combat.ts, sweep): a full blow of the axe or the pipe knocks the wind out of you, the baton's does not */
export const GLANCE = { poise: 1.1 };

/* ---- yours: what you hold makes the blow */

/** what a swing of yours carries and costs, from the weapon's mass and kind (engine.md §6, F2) */
export interface Swing {
  /** the poise a full blow takes */
  poise: number;
  /** the step forward a full blow carries you (m/s, along the blow) */
  lunge: number;
  /** recovery after a full blow that met nothing (s): the weight of it carries on */
  miss: number;
  /** your say over your feet once it is done until it has settled (a share of it): no running, and you want that share
   *  of your pace and get to it that share as fast; going faster than that you slow as one thrown does. Until it is
   *  done what you were doing goes on, whatever your keys say, so a blow run in lands harder. Every blow all but stops you;
   *  a heavy one stiller and longer (engine.md §6, F2) */
  feet: number;
  /** how long after it is over your feet are still its (s), landed or not; one that met nothing keeps them while the
   *  arm comes back, if that is longer */
  settle: number;
}

export function swingOf(kind: 'blunt' | 'edge' | 'fist' | 'gun', mass: number): Swing {
  return {
    poise: kind === 'fist' ? 4 : kind === 'edge' ? 9 * mass : 12 * mass,
    lunge: 1 + 0.6 * mass,
    miss: 0.15 + 0.12 * mass,
    feet: Math.max(0.1, 0.45 - 0.12 * mass),
    settle: 0.25 + 0.08 * mass,
  };
}

/** how long you reel when your poise breaks (s), how hard it pushes you from the blow (m/s), and your pace meanwhile
 *  (a share of it) */
export const REEL = { you: 0.7, push: 2.5, pace: 0.3 };
