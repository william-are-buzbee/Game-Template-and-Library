import type { Aim } from '../content/types';
import { ITEMS, keyName } from '../content/items';
import { STATION_NAMES } from '../content/names';
import { end, give, giveKey, consume, makeNoise, power, readNote, say, sfx, type Game } from './game';
import { locked, needs, occupied, sendPlatform, type Door, type Platform } from './movers';
import { eyeHeight } from './player';
import type { Sim } from './sim';
import { riders } from './sim';
import { heard, sitAt, soundZone, speakerY } from './eyes';
import { drill, noiseAt } from './cast';
import { silencePump } from './opening';
import { ragAt } from './ragdoll';

/* What you can use, and what using it does: E on whatever you are looking at. A label is the thing's name, and a state
   only where nothing in the world shows it (a breaker's); what using it says is only what you could not see or hear for
   yourself: what it wants that you lack. What the levels give a place to say (a body, a sealed door, a look) is theirs. */

export interface Usable {
  x: number; y: number; z: number;
  /** how near you have to be */
  r: number;
  label(): string | null;
  act(): void;
  off?: boolean;
  /** a name for one whose state a save must keep (a body searched) */
  key?: string;
}

/** an item lying in the world; a light lying switched on says which way it points, and one put down square on something
 *  how it lies (ItemDef.yaw) */
export interface WorldItem { id: string; n: number; x: number; y: number; z: number; taken: boolean; raw?: boolean; on?: Aim; yaw?: number }

export function buildUsables(sim: Sim): Usable[] {
  const g = sim.game, out: Usable[] = [], L = sim.world.def;
  for (const d of sim.doors) {
    const D = d.def;
    out.push({ x: (D.x0 + D.x1) / 2, y: D.y0 + (D.vent ? 0.6 : 1.3), z: (D.z0 + D.z1) / 2, r: D.vent ? 1.7 : 2.6, label: () => doorLabel(sim, d), act: () => doorAct(sim, d) });
  }
  for (const p of sim.platforms) if (p.def.call) out.push(platformUse(sim, p, 0), platformUse(sim, p, 1));
  /* a camera can be smashed, with something in your hand, and is heard well off; so can a zone's speaker, in the ceiling
     (or, over the atrium's well, leaning out from the gallery's rail), but only from below */
  const smash = (at: { x: number; y: number; z: number }, done: () => void) => () => {
    if (!g.weapon) { say(g, 'Not with bare hands.'); sfx(g, 'deny'); return; }
    done();
    sfx(g, 'smash', at, true);
    makeNoise(g, 14);
  };
  for (const c of sim.cams) {
    const C = c.def;
    out.push({ x: C.x, y: C.y, z: C.z, r: 2.4, label: () => (c.broken ? null : 'Camera'), act: smash(C, () => { c.broken = true; c.hold = 0; }) });
  }
  for (const S of L.speakers ?? []) {
    const at = { x: S.x, y: speakerY(sim.world, S) - 0.25, z: S.z };
    out.push({
      ...at, r: 3.2, label: () => (sim.mute.includes(S.zone) || sim.player.body.y > at.y - 2 ? null : 'Speaker'),
      act: smash(at, () => { sim.mute.push(S.zone); }),
    });
  }
  for (const it of sim.items) out.push(itemUse(sim, it));
  for (const n of L.notes) {
    const note = g.notes[n.key];
    if (note) out.push({ x: n.x, y: n.y + 0.05, z: n.z, r: 2, label: () => note.t, act: () => readNote(g, n.key) });
  }
  L.uses.forEach((u, ui) => {
    const o = u.opts as Record<string, never>;
    const base = { x: u.x, y: u.y, z: u.z, r: 2.4, key: 'use' + ui };
    switch (u.kind) {
      case 'body': {
        /* searched where it lies: the one of the station's dead laid out from here (MT.dead), wherever it has been
           kicked or knocked to since; here, if there is none */
        const j = L.mutants.findIndex(d => d.type === 'dead' && (d.opts.lies as number[] | undefined)?.[0] === u.x && (d.opts.lies as number[])[1] === u.z);
        const at = () => { const R = sim.cast[j]?.rag; return R ? ragAt(R) : null; };
        const use: Usable = {
          ...base,
          get x() { return at()?.x ?? u.x; },
          get y() { const a = at(); return a ? a.y + 0.3 : u.y; },
          get z() { return at()?.z ?? u.z; },
          label: () => (o.label as string) ?? 'Body',
          act: () => {
            use.off = true;
            if (o.say) say(g, o.say);
            for (const k of (o.keys as string[]) ?? []) giveKey(g, k);
            if (o.note) { if (!g.read.includes(o.note)) g.read.push(o.note); say(g, 'Armory: ' + g.code + '.'); }
          },
        };
        out.push(use);
        break;
      }
      case 'backup': {
        const c = o.c as string;
        out.push({
          ...base, label: () => 'Backup set: ' + (g.station?.circuits[c]?.back ? 'running' : 'stopped'),
          act: () => {
            const C = g.station?.circuits[c];
            if (!C) return;
            C.back = !C.back;
            g.events.push({ type: 'power', loud: false });
          },
        });
        break;
      }
      case 'panel': {
        /* `cut`: cut through by hand, not burned out */
        /* `brk`: a breaker on a board, not a level's service connection */
        const c = o.c as string, cut = !!o.cut, name = STATION_NAMES[c] ?? c, what = o.brk ? 'Breaker, ' : 'Service connection, ';
        out.push({
          ...base,
          label: () => { const C = g.station?.circuits[c]; return what + name + ': ' + (!C ? 'none' : C.broken ? (cut ? 'cut through' : 'burned through') : C.on ? 'closed' : 'open'); },
          act: () => {
            const C = g.station?.circuits[c];
            if (!C) return;
            if (C.broken) {
              const i = g.inv.findIndex(s => s.id === 'kit');
              if (i < 0) { say(g, 'Needs a splice kit.'); sfx(g, 'deny'); return; }
              consume(g, i); C.broken = false; C.on = true; sfx(g, 'clang');
              /* the circuit comes live on Security's board, and the board sounds the zone it is in */
              if (o.zone) soundZone(sim, o.zone as string);
            } else {
              C.on = !C.on;
              /* opened by hand: those it leaves in the dark may go to throw it back (sim/cast.ts, drill) */
              if (!C.on) drill(sim, c, u.x, u.y, u.z);
              sfx(g, 'clang');
            }
            g.events.push({ type: 'power', loud: false });
          },
        });
        break;
      }
      case 'elev': {
        /* a lift between two levels, off a circuit (the Security elevator): you arrive at the far level's mark for this one */
        const c = o.c as string, to = o.to as string;
        out.push({
          ...base, label: () => 'Elevator',
          act: () => {
            if (power(g, c) < 1) { say(g, 'No power.'); sfx(g, 'deny'); return; }
            if (!g.station?.built.includes(to)) { say(g, NOT_BUILT); return; }
            sfx(g, 'door', u);
            makeNoise(g, 10);
            g.travel = { level: to, mark: 'elev:' + L.id };
          },
        });
        break;
      }
      case 'fuse':
        out.push({
          ...base, label: () => (g.station?.fuseIn ? null : 'Fuse socket'),
          act: () => {
            const i = g.inv.findIndex(s => s.id === 'fuse');
            if (i < 0 || !g.station) { sfx(g, 'deny'); return; }
            consume(g, i); g.station.fuseIn = true; sfx(g, 'clang');
          },
        });
        break;
      case 'breaker':
        out.push({
          ...base, label: () => 'Gen-1 main breaker: ' + (g.station?.main ? 'on' : 'off'),
          act: () => {
            const s = g.station;
            if (!s) return;
            if (!s.fuseIn) { sfx(g, 'door'); say(g, 'No fuse.'); return; }
            s.main = !s.main;
            g.events.push({ type: 'power', loud: s.main });
          },
        });
        break;
      case 'lift':
        out.push({ ...base, label: () => 'Lift', act: () => { const P = power(g, 'LIFT'); if (P < 2) { say(g, short(P)); sfx(g, 'deny'); return; } g.events.push({ type: 'lift' }); } });
        break;
      case 'ladder': {
        const id = o.id as string, up = !!o.up, here = L.id;
        const other = () => g.station?.ladders[id]?.ends?.find(e => e !== here);
        out.push({
          ...base, label: () => (o.text as string) ?? (up ? 'Ladder up' : 'Ladder down'),
          act: () => {
            const S = g.station?.ladders[id], to = other();
            if (S?.broken) { say(g, S.broken); sfx(g, 'deny'); return; }
            const n = S?.need;
            if (n?.power && power(g, n.power) < 1) { say(g, n.msg ?? 'It will not open.'); sfx(g, 'deny'); return; }
            if (!to || !g.station?.built.includes(to)) { say(g, NOT_BUILT); return; }
            if (S?.say) say(g, S.say);
            sfx(g, 'step');
            makeNoise(g, 6);
            g.travel = { level: to, mark: 'ladder:' + id };
          },
        });
        break;
      }
      case 'stair': {
        const to = o.to as string;
        out.push({
          ...base, label: () => (o.up ? 'Stairs up' : 'Stairs down'),
          act: () => {
            if (!g.station?.built.includes(to)) { say(g, NOT_BUILT); return; }
            g.travel = { level: to, mark: 'stair:' + L.id };
          },
        });
        break;
      }
      case 'dive': {
        const to = o.to as string;
        out.push({
          ...base, label: () => o.label as string,
          act: () => {
            if (!g.station?.built.includes(to)) { say(g, NOT_BUILT); return; }
            sfx(g, 'slosh');
            g.travel = { level: to, mark: 'dive:' + L.id };
          },
        });
        break;
      }
      case 'look':
        out.push({ ...base, label: () => (o.label as string) ?? 'Look', act: () => { say(g, o.text as string); if (o.sfx) sfx(g, o.sfx as string, base); } });
        break;
      case 'pump':
        /* your infusion pump: its alarm, until you silence it (sim/opening.ts) */
        out.push({ ...base, r: 1.8, label: () => 'Pump', act: () => silencePump(sim) });
        break;
      case 'watch': {
        /* a spot monitor's console: sit and watch its cameras; dark without its power */
        const c = o.c as string, feeds = o.feeds as string[], dwell = (o.dwell as number | undefined) ?? 0;
        out.push({
          ...base, r: 1.8, label: () => 'Monitors',
          act: () => {
            if (power(g, c) < 1) { sfx(g, 'deny'); return; } // the screens are dark to look at
            sitAt(sim, c, feeds, dwell);
          },
        });
        break;
      }
      case 'call': {
        /* a break-glass call point: it sounds its zone, as a camera would, from the zone's PA; once, the glass gone */
        const zone = o.zone as string, at = { x: u.x, y: u.y, z: u.z };
        const call: Usable = {
          ...base, r: 1.8, label: () => 'Call point',
          act: () => {
            call.off = true;
            sfx(g, 'smash', at);
            makeNoise(g, 6);
            if (heard(sim, zone)) soundZone(sim, zone); // with no voice to call with, nothing sounds
          },
        };
        out.push(call);
        break;
      }
      case 'comms': {
        /* a comms cupboard's switch: read first, for what it feeds; then, with something in your hand, smashed (as loud as
           a camera), and every camera on its branch is blind (sim/eyes.ts, camLive). Not to be smashed twice */
        const c = o.c as string, at = { x: u.x, y: u.y, z: u.z }, blind = () => sim.blind.includes(c);
        let read = false;
        out.push({
          ...base, r: 1.8,
          label: () => (blind() ? null : read && g.weapon ? 'Smash the switch' : 'Comms cupboard'),
          act: () => {
            if (!read) { read = true; say(g, o.text as string); return; }
            smash(at, () => { sim.blind.push(c); })();
          },
        });
        break;
      }
    }
  });
  return out;
}

/** a cargo platform's button at one of its ends (0 the bottom, 1 the top): ride it to the other end if you are on it,
 *  or call it to you if it is at the other end */
function platformUse(sim: Sim, p: Platform, end: 0 | 1): Usable {
  const g = sim.game, d = p.def, call = d.call!, b = sim.player.body;
  const onIt = () => b.x > d.x0 && b.x < d.x1 && b.z > d.z0 && b.z < d.z1 && Math.abs(b.y - p.y) < 0.6;
  return {
    x: (d.x0 + d.x1) / 2, y: (end ? d.y1 : d.y0) + 1.1, z: (d.z0 + d.z1) / 2, r: 3.6,
    label: () => {
      if (p.moving) return null;
      if (onIt()) return p.target === end ? call.name : null;
      return p.target !== end ? call.name : null;
    },
    act: () => {
      if (power(g, call.circuit) < 1) { say(g, 'No power.'); sfx(g, 'deny'); return; }
      sendPlatform(p, onIt() ? (end ? 0 : 1) : end);
      sfx(g, 'door', { x: (d.x0 + d.x1) / 2, y: p.y, z: (d.z0 + d.z1) / 2 });
      makeNoise(g, 12);
    },
  };
}

export function itemUse(sim: Sim, it: WorldItem): Usable {
  const g = sim.game;
  const use: Usable = {
    x: it.x, y: it.y + 0.05, z: it.z, r: 2,
    label: () => (it.taken ? null : ITEMS[it.id].n),
    act: () => {
      const per = ITEMS[it.id].per;
      if (give(g, it.id, it.raw && per ? it.n / per : it.n)) {
        it.taken = true; use.off = true; sfx(g, 'take');
        /* a light lying on is still on in your hand */
        if (it.on && ITEMS[it.id].tool && g.batt > 0) { g.light = it.id; g.lightOn = true; }
      }
    },
  };
  return use;
}

export function doorLabel(sim: Sim, d: Door): string | null {
  const D = d.def, g = sim.game;
  if (D.glass) return null;
  if (D.vent) return d.open ? null : 'Loose panel';
  if (D.lift) return 'Surface lift';
  if (D.seal) return 'Jammed';
  if (D.stuck) return sim.player.crouch ? null : 'Jammed';
  if (d.down) return 'Locked down';
  const L = power(g, D.circuit), rd = D.card ? 'Card reader' : 'Keypad';
  if (D.kind === 'heavy') {
    if (L < needs(D)) return D.fire ? 'Fire shutter' : 'Heavy door';
    if (locked(d)) return rd;
    return D.fire ? 'Shutter control' : 'Door control';
  }
  if (L > 0) return locked(d) ? rd : null;
  if (locked(d)) return rd; // fail-secure: no power, no way through
  return 'Door';
}

/** what a thing wanting Gen-1 says when it lacks it: nothing on its circuit, or only a backup set's */
const short = (power: number) => (power ? 'Not on the backup.' : 'No power.');
const NOT_BUILT = 'Not built yet.';

export function doorAct(sim: Sim, d: Door): void {
  const D = d.def, g = sim.game, at = { x: (D.x0 + D.x1) / 2, y: D.y0, z: (D.z0 + D.z1) / 2 };
  if (D.lift) {
    const P = Math.min(power(g, D.circuit), power(g, sim.world.def.circuit));
    if (P < 2) { say(g, short(P)); sfx(g, 'deny'); return; }
    if (!g.keys.includes('surf') && !g.keys.includes('lift')) { say(g, 'Needs a surface pass.'); sfx(g, 'deny'); return; }
    end(g, true, 'lift');
    return;
  }
  if (D.seal) { if (D.msg) say(g, D.msg); sfx(g, 'deny'); return; }
  if (D.stuck) { sfx(g, 'deny'); return; }
  if (D.vent) { d.open = true; sfx(g, 'clang', at); makeNoise(g, 7); return; }
  if (d.down) { sfx(g, 'deny'); return; } // its red lamp says why
  const L = power(g, D.circuit), heavy = D.kind === 'heavy';
  if (heavy && L < needs(D)) { say(g, D.fire ? 'No power to its drive.' : short(L)); sfx(g, 'deny'); return; }
  if (locked(d)) {
    if (L === 0) { say(g, 'No power.'); sfx(g, 'deny'); return; }
    if (D.card) {
      if (!g.keys.includes(D.card)) { say(g, 'Needs the ' + keyName(D.card) + '.'); sfx(g, 'deny'); return; }
      d.unlocked = true; sfx(g, 'take');
      if (!heavy) return;
    } else {
      g.pad = { code: D.code === 2 ? g.code2 : g.code, typed: '', door: sim.doors.indexOf(d) };
      g.events.push({ type: 'pad' });
      return;
    }
  }
  if (!heavy && L > 0) return;
  if (d.open && occupied(d, riders(sim))) return;
  d.open = !d.open;
  d.hold = 3;
  sfx(g, 'door', at);
  makeNoise(g, heavy ? 10 : 7);
  /* a big one opened is heard much further, and those at rest come to it */
  if (d.open && D.loud) noiseAt(sim, at.x, D.y0, at.z, D.loud, true);
}

/** a key on the keypad in front of you */
export function padKey(g: Game, sim: Sim, k: string): void {
  const p = g.pad;
  if (!p) return;
  p.miss = undefined;
  if (k === 'C') p.typed = '';
  else if (p.typed.length < 4) p.typed += k;
  sfx(g, 'take');
  if (p.typed.length === 4) {
    if (p.typed === p.code) {
      const d = sim.doors[p.door];
      if (d) d.unlocked = true;
      g.pad = null;
    } else { sfx(g, 'deny'); p.miss = p.typed; p.typed = ''; }
  }
}

/** what you are looking at that can be used: the nearest thing roughly where you look, within its reach */
export function findUsable(sim: Sim): (Usable & { text: string }) | null {
  const p = sim.player, b = p.body, eye = b.y + eyeHeight(p), cp = Math.cos(p.pitch);
  const f = [-Math.sin(p.yaw) * cp, Math.sin(p.pitch), -Math.cos(p.yaw) * cp];
  let best: (Usable & { text: string }) | null = null, bs = 0.78;
  for (const u of sim.usables) {
    if (u.off) continue;
    const dx = u.x - b.x, dy = u.y - eye, dz = u.z - b.z, d = Math.hypot(dx, dy, dz);
    if (d > u.r) continue;
    const dot = d < 0.5 ? 1 : (dx * f[0] + dy * f[1] + dz * f[2]) / d;
    if (dot <= bs) continue;
    const text = u.label();
    if (!text) continue;
    bs = dot;
    best = Object.assign(u, { text });
  }
  return best;
}

