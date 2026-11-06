import { it } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { STATION } from '../../src/content/station';
import { testbed } from '../../src/content/levels/testbed';
import { STEP } from '../../src/core/loop';
import { MT, spawn } from '../../src/sim/cast';
import { give } from '../../src/sim/game';
import { noInput, type Input } from '../../src/sim/input';
import { levelDef } from '../../src/sim/run';
import { makeSim, step, type Sim } from '../../src/sim/sim';
import { begin, say } from './out';

/* The cast, step by step, kept to compare with: for a change to how the cast move or decide that should change nothing.
   SAVE=<dir> runs each case and writes, for every step, a hash of the whole cast (where each is, its way on, what it is
   doing, its timers, its blow, its route) with the run's chance; and the cast in full once a second. CHECK=<dir> runs
   them again and says, for each case, the first step that differs, and who differs in the second around it. Each level
   as it begins and with everything on, you walking about it in god mode; the opening; and each kind in the test bed's
   arena with you swinging a pipe at it, then all of them at once. CASE=upper for those whose name has it. */

/** what one of the cast is, this step: everything a change to how they move would show in */
const state = (s: Sim): string[] => s.cast.map(m => [
  m.type, m.x, m.y, m.z, m.yaw, m.body?.vx, m.body?.vy, m.body?.vz, m.state, m.st, m.hp, m.poise, m.cd, m.stun, m.wt, m.wm, m.wx, m.wz,
  m.tk, m.lost, m.dest, m.spot, m.stk, m.near, m.side, m.mv, m.down, m.rise, m.reel, m.blow?.ph, m.blow?.t, m.ride?.t, m.beat, m.drag, m.tp,
].join(','));

const hash = (t: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16);
};
const snapshot = (s: Sim): string => [...state(s), `rng ${JSON.stringify(s.rng.state())}`, `sfx ${s.game.events.filter(e => e.type === 'sfx').map(e => (e as { name: string }).name).join(' ')}`].join('\n');

/** every circuit on, as ?power=full has it */
function fullPower(s: Sim): void {
  const S = s.game.station;
  if (!S) return;
  S.main = true;
  for (const c of Object.values(S.circuits)) { c.on = true; c.broken = false; }
  s.lighting = null;
}

/** you about the level: forward, turning, a run, a crouch, a swing; the same every time */
function walkAbout(s: Sim, t: number): Input {
  const k = Math.floor(t / 1.5) % 8, inp = noInput();
  s.player.yaw += [0, 0.02, 0, -0.03, 0.01, 0, -0.02, 0][k];
  if (k !== 4) inp.forward = 1;
  if (k === 2 || k === 5) inp.run = true;
  if (k === 6 && Math.floor(t / STEP) % 40 === 0) inp.attack = true;
  return inp;
}

interface Case { name: string; make: () => Sim; secs: number; input: (s: Sim, t: number) => Input }

function cases(): Case[] {
  const out: Case[] = [];
  const ids = [...STATION.levels.map(L => L.id)];
  for (const id of ids) {
    const make = (full: boolean) => () => {
      const s = makeSim(levelDef(STATION, id), { seed: 7, station: STATION });
      s.game.god = true;
      if (full) fullPower(s);
      return s;
    };
    out.push({ name: id, make: make(false), secs: 40, input: walkAbout });
    out.push({ name: `${id} full`, make: make(true), secs: 40, input: walkAbout });
  }
  out.push({
    name: 'opening', secs: 120, input: () => noInput(), make: () => {
      const s = makeSim(levelDef(STATION, STATION.start), { seed: 7, station: STATION, opening: true }), b = s.player.body;
      s.game.god = true;
      b.x = 39; b.z = -21; b.sync(); s.player.yaw = -Math.PI / 2; // a step back from your window, looking out
      return s;
    },
  });
  const arena = (kinds: [string, Record<string, unknown>][]) => () => {
    const s = makeSim(testbed(), { seed: 3 }), b = s.player.body;
    b.x = 8; b.z = -3; b.y = 0; b.sync(); s.game.god = true;
    give(s.game, 'pipe'); s.game.weapon = 'pipe';
    kinds.forEach(([k, o], i) => spawn(s, k, 6 + (i % 5), 0, -9 - Math.floor(i / 5) * 2, o));
    return s;
  };
  const swinging = (s: Sim, t: number): Input => {
    const inp = noInput(), m = s.cast.find(q => !q.dead), b = s.player.body;
    if (m) s.player.yaw = Math.atan2(-(m.x - b.x), -(m.z - b.z));
    if (Math.floor(t / STEP) % 90 === 0) inp.attack = true;
    if (Math.floor(t / 4) % 2) inp.forward = -1;
    return inp;
  };
  const kinds = Object.keys(MT).filter(k => k !== 'dead').map(k => [k, {}] as [string, Record<string, unknown>]);
  kinds.push(['skitter', { big: 1 }]);
  for (const [k, o] of kinds) out.push({ name: `arena ${k}${o.big ? ' big' : ''}`, make: arena([[k, o]]), secs: 15, input: swinging });
  out.push({ name: 'arena all', make: arena(kinds), secs: 20, input: swinging });
  return out;
}

it('trace', () => {
  const save = process.env.SAVE, check = process.env.CHECK, only = process.env.CASE;
  if (!save && !check) throw new Error('SAVE=<dir> or CHECK=<dir>');
  begin('trace', save ? ` saved to ${save}` : ` checked against ${check}`);
  if (save && !existsSync(save)) mkdirSync(save, { recursive: true });
  let differs = 0;
  for (const C of cases()) {
    if (only && !C.name.includes(only)) continue;
    const s = C.make(), file = `${save ?? check}/${C.name.replace(/ /g, '_')}.json`;
    const hashes: string[] = [], seconds: string[] = [], seen = new Set<string>();
    let t = 0;
    for (let i = 0; t < C.secs && !s.game.ended; i++, t += STEP) {
      s.game.events.length = 0;
      step(s, C.input(s, t));
      const snap = snapshot(s);
      hashes.push(hash(snap));
      if (i % 60 === 0) seconds.push(snap);
      for (const m of s.cast) if (!m.dead && m.ai !== 'dead') seen.add(`${m.type}:${m.state}`);
    }
    if (save) { writeFileSync(file, JSON.stringify({ hashes, seconds })); say(`${C.name}: ${hashes.length} steps saved; ${[...seen].sort().join(' ')}`); continue; }
    const was = JSON.parse(readFileSync(file, 'utf8')) as { hashes: string[]; seconds: string[] };
    const at = hashes.findIndex((h, i) => h !== was.hashes[i]);
    if (at < 0 && hashes.length === was.hashes.length) { say(`${C.name}: same, ${hashes.length} steps`); continue; }
    differs++;
    const i = at < 0 ? Math.min(hashes.length, was.hashes.length) : at, sec = Math.floor(i / 60);
    say(`${C.name}: differs from step ${i} (${(i * STEP).toFixed(2)} s; ${was.hashes.length} steps then, ${hashes.length} now)`);
    const a = (was.seconds[sec + 1] ?? was.seconds[sec] ?? '').split('\n'), b = (seconds[sec + 1] ?? seconds[sec] ?? '').split('\n');
    for (let k = 0, n = 0; k < Math.max(a.length, b.length) && n < 6; k++) if (a[k] !== b[k]) { say(`  was ${a[k]}\n  now ${b[k]}`); n++; }
  }
  say(check ? (differs ? `${differs} differ` : 'all the same') : 'saved');
});
