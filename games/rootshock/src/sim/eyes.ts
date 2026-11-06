import type { CameraDef, SpeakerDef } from '../content/types';
import { STEP } from '@wb/core';
import { field } from '../world/nav';
import type { Dyn, World } from '../world/world';
import { needs, type Door } from './movers';
import { answer } from './cast';
import { routeRules, soundRules } from './fields';
import { power, sfx } from './game';
import { eyeHeight } from './player';
import type { Sim } from './sim';
import { noInput, type Input } from './input';

/* Security's eyes and voice (world.md §8): cameras, and the zone alarms they sound. Nothing here was built for this:
   it is Security's own equipment, CCTV on a lockdown protocol, and nobody sits behind the screens. The lockdown arms
   the restricted rooms (RoomDef.armed), and a camera hung in one guards it: with power it sees along its cone, as far
   as the light you are in lets it (as the cast see), and it takes anyone moving in an armed room at any pace, held in
   view a moment; stand stock still and it loses you, as motion detection does. Anywhere else a camera only records,
   and shows no light. A guard's light is the tell: green while it watches, red while it holds you, so there is time
   to step back out or freeze. The alarm sounds from the zone's speaker for a while, and every one of the changed that
   hears it hurries to the speaker, not to you (sim/cast.ts, 'answer'). And the zone locks down, protocol with no hand
   on it: each of its doors with power to move is bolted, heard being drawn for a second before it goes home (time to
   get through), its light red, and it holds while the alarm sounds. A door without power cannot be bolted, and one that
   loses its power lets its bolt go: exits fail safe. The answers: keep out of the armed rooms or out of the cone,
   freeze, cut its power, or smash it (loud); or smash the switch in its branch's comms cupboard (as loud), and every
   camera on the branch is blind; or smash the zone's speaker (as loud), and the zone has no voice. */

export interface Cam {
  def: CameraDef;
  /** it hangs in an armed room, and guards it; else it only records */
  guard: boolean;
  broken: boolean;
  /** how long it has held you moving, in seconds (EYES.hold sounds it) */
  hold: number;
  /** it has sounded its zone, and has not yet let you go: it keeps it sounding while it still has you moving */
  tripped: boolean;
}

export interface Alarm {
  zone: string;
  /** seconds left to sound */
  t: number;
  /** the spot under the speaker, the way there, and how far its sound carries to each spot */
  spot: number;
  route: Float32Array;
  heard: Float32Array;
  /** when it sounds next */
  next: number;
}

/** held moving this long, you sound the zone; the zone sounds this long, again from the start each time it is sounded;
 *  its sound carries this far; it goes round every so often. Under `still` m/s on the plan you are not moving; still in
 *  its view it lets go, `drain` seconds of hold a second; out of its view or out of the armed room, at once */
export const EYES = { hold: 1.4, sound: 12, reach: 34, every: 1.3, still: 0.3, drain: 0.5 };

/** a bolt is heard being drawn this long before it goes home */
export const LOCKDOWN = { draw: 1.1 };

/** what sight goes through: bodies, and glass */
const seeThrough = (d: Dyn) => d.kind === 'body' || !!d.glass;

export function makeCams(sim: Sim): Cam[] {
  return (sim.world.def.cameras ?? []).map(def => ({ def, guard: inArmed(sim.world, def.x, def.y - 1, def.z), broken: false, hold: 0, tripped: false }));
}

/** the zones a door is in: those of the rooms either side of it */
const doorZoneCache = new WeakMap<Door, string[]>();
export function doorZones(w: World, d: Door): string[] {
  let z = doorZoneCache.get(d);
  if (!z) {
    const D = d.def, cx = (D.x0 + D.x1) / 2, cz = (D.z0 + D.z1) / 2, y = D.y0 + 0.5, o = 1.3;
    const sides = D.alongX ? [w.roomAt(cx, y, cz - o), w.roomAt(cx, y, cz + o)] : [w.roomAt(cx - o, y, cz), w.roomAt(cx + o, y, cz)];
    z = [...new Set(sides.map(R => R?.zone).filter((q): q is string => !!q))];
    doorZoneCache.set(d, z);
  }
  return z;
}

/** a door the lockdown bolts: one that moves, with power enough to move it */
const boltable = (sim: Sim, d: Door): boolean => {
  const D = d.def;
  return !(D.seal || D.vent || D.lift || D.stuck || D.glass) && power(sim.game, D.circuit) >= needs(D);
};

/** the zone locks down: each of its doors that can be bolted and is not is heard being drawn */
function lockdown(sim: Sim, zone: string): void {
  for (const d of sim.doors) {
    if (d.down || d.drawing > 0 || !doorZones(sim.world, d).includes(zone) || !boltable(sim, d)) continue;
    d.drawing = LOCKDOWN.draw;
    sfx(sim.game, 'bolt-draw', doorAt(d));
  }
}

const doorAt = (d: Door) => ({ x: (d.def.x0 + d.def.x1) / 2, y: d.def.y0 + 2, z: (d.def.z0 + d.def.z1) / 2 });

/** a bolt being drawn goes home if its zone still sounds; a bolted door lets go when the alarm stops or its power goes */
function updateLockdown(sim: Sim): void {
  for (const d of sim.doors) {
    if (!d.down && d.drawing <= 0) continue;
    const sounding = doorZones(sim.world, d).some(z => sim.alarms.some(a => a.zone === z)), can = sounding && boltable(sim, d);
    if (d.drawing > 0 && (d.drawing -= STEP) <= 0) { d.drawing = 0; if (can) { d.down = true; sfx(sim.game, 'bolt', doorAt(d)); } }
    else if (d.down && !can) { d.down = false; sfx(sim.game, 'bolt-free', doorAt(d)); }
  }
}

/** the spot is in an armed room */
export const inArmed = (w: World, x: number, y: number, z: number): boolean => !!w.roomAt(x, y, z)?.armed;

/** a speaker hangs in the ceiling over its spot */
export function speakerY(w: World, S: SpeakerDef): number {
  const R = w.roomAt(S.x, S.y + 1, S.z);
  return R ? R.y0 + R.ht : S.y + 3;
}

/** the zone's speaker is whole */
export const voiced = (sim: Sim, zone: string): boolean => !sim.mute.includes(zone);

/** the zone's speaker can sound: whole, and its PA system has power. A dead one is as quiet as a smashed one: nothing
 *  hears it. (Security's PA is on critical power: in practice, only smashing it quiets a zone.) */
export function heard(sim: Sim, zone: string): boolean {
  if (!voiced(sim, zone)) return false;
  const S = sim.world.def.speakers?.find(s => s.zone === zone);
  return !S?.pa || power(sim.game, S.pa) >= 1;
}

/** it can see: whole, its branch's switch whole (it is fed through it: world.md §8, One control room), and with power
 *  to it */
export const camLive = (sim: Sim, c: Cam): boolean => !c.broken && !sim.blind.includes(c.def.circuit) && power(sim.game, c.def.circuit) >= 1;

/** it sees you: within its cone and its range for the light you are in, and nothing in the way */
export function camSees(sim: Sim, c: Cam): boolean {
  const C = c.def, b = sim.player.body, hy = b.y + eyeHeight(sim.player) * 0.9;
  const dx = b.x - C.x, dz = b.z - C.z, dp = Math.hypot(dx, dz), d = Math.hypot(dx, hy - C.y, dz);
  if (d > C.range * sim.game.vis || dp < 0.01) return false;
  if ((dx * Math.sin(C.yaw) + dz * Math.cos(C.yaw)) / dp < Math.cos(C.fov / 2)) return false;
  return sim.world.raycast(C.x, C.y, C.z, b.x, hy, b.z, seeThrough) >= 1;
}

/** sound a zone: its speaker goes, and goes on going a while; sounded again while it sounds, it starts over */
export function soundZone(sim: Sim, zone: string): void {
  const sp = sim.world.def.speakers?.find(s => s.zone === zone), F = sim.fields;
  if (!sp || !F || !heard(sim, zone)) return;
  const on = sim.alarms.find(a => a.zone === zone);
  if (on) { on.t = EYES.sound; return; }
  const spot = F.nav.locate(sp.x, sp.y, sp.z);
  if (spot < 0) return;
  sim.alarms.push(makeAlarm(sim, zone, spot, EYES.sound));
}

function makeAlarm(sim: Sim, zone: string, spot: number, t: number): Alarm {
  const F = sim.fields!;
  return {
    zone, t, spot, next: 0,
    route: field(F.nav, spot, routeRules(sim, F, 'hands')),
    heard: field(F.nav, spot, soundRules(sim, F), undefined, EYES.reach),
  };
}

/** what of an alarm a save keeps: its ways and reach are made again */
export type SavedAlarm = Pick<Alarm, 'zone' | 't' | 'spot' | 'next'>;
export const saveAlarm = (a: Alarm): SavedAlarm => ({ zone: a.zone, t: a.t, spot: a.spot, next: a.next });

/** the alarms as a save had them: their ways and reach made again */
export function restoreAlarms(sim: Sim, saved: SavedAlarm[]): void {
  sim.alarms = sim.fields ? saved.map(a => ({ ...makeAlarm(sim, a.zone, a.spot, a.t), next: a.next })) : [];
}

/** a step of the eyes and the alarms */
export function updateEyes(sim: Sim): void {
  const g = sim.game, b = sim.player.body, moving = Math.hypot(b.vx, b.vz) > EYES.still;
  const armed = inArmed(sim.world, b.x, b.y + 0.5, b.z);
  for (const c of sim.cams) {
    if (!c.guard || !armed || !camLive(sim, c) || !camSees(sim, c)) { c.hold = 0; c.tripped = false; continue; }
    if (moving) {
      if (c.hold === 0) sfx(g, 'cam', c.def); // it has you: the servo turns, the light goes red
      c.hold = Math.min(EYES.hold, c.hold + STEP);
    } else if ((c.hold = Math.max(0, c.hold - EYES.drain * STEP)) === 0) c.tripped = false; // still, it lets you go
    if (!moving) continue;
    /* it has you: it sounds its zone, once, and keeps it sounding while it still sees you moving */
    if (c.tripped) { const a = sim.alarms.find(q => q.zone === c.def.zone); if (a) a.t = EYES.sound; }
    else if (c.hold >= EYES.hold) { c.tripped = true; soundZone(sim, c.def.zone); }
  }
  for (const a of sim.alarms) {
    a.t -= STEP;
    if ((a.next -= STEP) <= 0 && heard(sim, a.zone)) {
      /* it goes round, and whatever hears it this time comes; the zone's doors lock down, any that came back since too */
      a.next = EYES.every;
      const sp = sim.world.def.speakers!.find(s => s.zone === a.zone)!;
      sfx(g, 'klaxon', { x: sp.x, y: sp.y + 2.6, z: sp.z }, true);
      for (const m of sim.cast) if (m.spot >= 0 && a.heard[m.spot] < EYES.reach) answer(sim, m, a.spot, a.route);
      lockdown(sim, a.zone);
    }
  }
  sim.alarms = sim.alarms.filter(a => a.t > 0);
  updateLockdown(sim);
}

/* Watching: sat at a console, you see through its cameras, one feed at a time (world.md §8, the camera wall). A
   console with a sequencer steps through them by itself, as a spot monitor does; strafe left or right for the next feed; use stands you up, and so does being hurt, or the console losing its power. While
   you watch you do nothing else: the world goes on, and you are not looking at it. */
export interface Watch {
  /** the console's circuit, and the cameras it shows (indices into Sim.cams), the one on screen */
  c: string;
  feeds: number[];
  at: number;
  /** which way you last pressed (to step a feed a press), and your health when you sat down */
  side: number;
  hp: number;
  /** a sequencer's: seconds on a feed before it steps on by itself (0: none), and how long this one has been up */
  dwell: number;
  t: number;
}

/** sit at a console: its feeds by name (a name it has no camera for is left out), and its sequencer's dwell if it has one */
export function sitAt(sim: Sim, c: string, names: string[], dwell = 0): void {
  const feeds = names.map(n => sim.cams.findIndex(q => q.def.name === n)).filter(i => i >= 0);
  if (!feeds.length) return;
  sim.watch = { c, feeds, at: 0, side: 0, hp: sim.game.hp, dwell, t: 0 };
}

/** the camera on screen, and whether it sends anything: whole, and with power */
export function onScreen(sim: Sim): { cam: Cam; live: boolean } | null {
  const w = sim.watch;
  if (!w) return null;
  const cam = sim.cams[w.feeds[w.at]];
  return { cam, live: camLive(sim, cam) };
}

/** a step at the console: what you pressed works it, and nothing else of it reaches you */
export function watching(sim: Sim, input: Input): Input {
  const w = sim.watch!;
  if (input.use || sim.game.hp < w.hp || power(sim.game, w.c) < 1) { sim.watch = null; return noInput(); }
  const side = Math.sign(input.strafe), n = w.feeds.length;
  if (side && side !== w.side) { w.at = (w.at + side + n) % n; w.t = 0; }
  else if (w.dwell && (w.t += STEP) >= w.dwell) { w.at = (w.at + 1) % n; w.t = 0; } // the sequencer steps on
  w.side = side;
  return noInput();
}

