import * as THREE from 'three';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { STATION } from '../src/content/station';
import { looseLights, simLighting, step, type Sim } from '../src/sim/sim';
import { noInput } from '../src/sim/input';
import { STEP } from '../src/core/loop';
import { GAIT, ROUND, torchRay, type Mutant } from '../src/sim/cast';
import type { Loose } from '../src/world/light';
import { CastView } from '../src/present/render/castView';
import { fresh, hold, upper } from './kit';

/* The night round (world.md §8): one of the changed still walking the night shift's round with its flashlight on. It walks
   the dark by its beam, tries the readers on its round with its card, and its beam lights you for anything that sees. */

const level = upper();
function place(s: Sim, who: Mutant | 'player', x: number, y: number, z: number): void {
  const b = who === 'player' ? s.player.body : who.body!;
  b.x = x; b.y = y; b.z = z; b.vx = b.vz = 0; b.vy = 0; b.sync();
  if (who !== 'player') { who.x = who.px = x; who.y = who.py = y; who.z = who.pz = z; }
}
/** the night round alone; you a storey down in the suite, out of it all */
const setUp = () => {
  const s = fresh(), m = s.cast.find(q => q.type === 'nightround')!;
  for (const q of s.cast) if (q !== m) q.stun = 1e9;
  place(s, 'player', 39, -4.5, -15);
  hold(s, 0.1);
  return { s, m };
};
const roomOf = (s: Sim, m: Mutant) => s.world.roomAt(m.x, m.y + 0.5, m.z)?.name;
/** the first stop of its round in the wing: before it, the suite's, for the opening's night (and only while the wing has
 *  power: sim/opening.ts) */
const wingStop = (m: Mutant) => m.round!.findIndex(P => !P.once);
const beeps = (s: Sim) => s.game.events.filter(e => e.type === 'sfx' && (e.name === 'take' || e.name === 'deny')).map(e => (e as { name: string }).name);

describe('the night round', () => {
  it('walks its round in the dark wing, stop to stop, where the rest of the changed will not go; the suite\'s stops passed by', () => {
    const { s, m } = setUp();
    expect(m.round!.length).toBeGreaterThan(4);
    const w = wingStop(m);
    expect(w).toBeGreaterThan(0);
    hold(s, 0.3);
    expect(m.beat).toBe(w); // the suite's first-time stops, with the wing dead, passed by, a step each
    expect(m.cards).toBe(true);
    const wing = s.world.rooms.find(R => R.name === 'Security corridor')!;
    expect(Math.max(...s.lighting!.room(wing.id))).toBe(0); // cut: dark
    const seen: number[] = [m.beat], rooms = new Set<string>();
    for (let t = 0; t < 90; t += STEP) {
      step(s, noInput());
      if (m.beat !== seen[seen.length - 1]) seen.push(m.beat);
      const r = roomOf(s, m);
      if (r) rooms.add(r);
    }
    expect(seen.slice(0, 5)).toEqual([w, w + 1, w + 2, w + 3, w + 4]); // in order
    expect([...rooms].every(r => r === 'Security corridor' || r === 'Lobby' || r === "Nurses' station")).toBe(true);
    expect(m.state).toBe('round');
  });

  it('its beam lights what it points at, and you in it: seen crouched and still in the dark, where one without a light would pass you by', () => {
    const run = (torch: boolean) => {
      const { s, m } = setUp();
      m.torch = torch;
      place(s, m, 52, 0, -1); m.yaw = -Math.PI / 2; m.wm = m.yaw; // in the wing's corridor, looking west down it
      m.state = 'round'; m.dest = -1; m.wt = 6; m.st = 0; // stopped at a stop, looking about
      place(s, 'player', 46, 0, -1); s.player.yaw = -Math.PI / 2; // 6 m ahead of it, your back to it
      hold(s, 0.1, { crouch: true });
      let vis = 0;
      for (let t = 0; t < 5 && m.state !== 'hunt'; t += STEP) { step(s, noInput()); vis = Math.max(vis, s.game.vis); }
      return { state: m.state, vis: Math.max(vis, s.game.vis) };
    };
    const dark = run(false), lit = run(true);
    expect(dark.state).not.toBe('hunt');
    expect(dark.vis).toBeLessThan(0.25);
    expect(lit.state).toBe('hunt');
    expect(lit.vis).toBeGreaterThan(0.5); // what the cameras see you by too (sim/eyes.ts, camSees)
  });

  it('tries the reader at a door on its round: nothing from a dark one; green, and through, with power; red where its card does not open it', () => {
    const at = (mended: boolean, cards = true) => {
      const { s, m } = setUp();
      if (mended) { s.game.station!.circuits.SEC.broken = false; s.lighting = null; }
      m.cards = cards;
      const w = wingStop(m);
      place(s, m, 60, 0, -1); m.beat = w; m.state = 'round'; m.dest = -1; m.wt = 0;
      const d = s.doors.find(q => q.def.card === 's' && !q.def.failsafe)!; // the briefing room's, its first stop in the wing
      s.game.events.length = 0;
      let lit = false, ok = false;
      for (let t = 0; t < 20 && m.beat === w; t += STEP) { step(s, noInput()); if (d.beep > 0) { lit = true; ok = d.beepOk; } }
      return { heard: beeps(s), lit, ok, beat: m.beat - w };
    };
    const dark = at(false);
    expect(dark.heard).toEqual([]);
    expect(dark.lit).toBe(false);
    expect(dark.beat).toBe(1); // and on
    const green = at(true);
    expect(green.heard).toContain('take');
    expect(green.lit && green.ok).toBe(true);
    const red = at(true, false);
    expect(red.heard).toEqual(['deny']);
    expect(red.lit && !red.ok).toBe(true);
    expect(red.beat).toBe(1);
  });

  it('taken off its round, it comes back to it where it left off', () => {
    const { s, m } = setUp();
    const w = wingStop(m);
    m.beat = w + 3; m.state = 'hunt'; m.lost = 7.5; // after you, and has lost you
    hold(s, 1);
    expect(m.state).toBe('round');
    expect(m.beat).toBe(w + 3);
  });

  it('dies, and its light with it', () => {
    const { s, m } = setUp();
    expect(looseLights(s).some(L => L.key === 'torch' + m.id)).toBe(true);
    m.dead = true;
    expect(looseLights(s).some(L => L.key === 'torch' + m.id)).toBe(false);
  });

  it('slow on its round, slower after you than the rest', () => {
    expect(GAIT.nightround.pace.round).toBeLessThan(GAIT.husk.pace.walk); // the others' rounds
    expect(GAIT.nightround.pace.hunt).toBeLessThan(GAIT.husk.pace.hunt);
  });

  it('swings its beam onto you, not there in a step; the arm drawn holding it goes with it', () => {
    const { s, m } = setUp();
    place(s, m, 52, 0, -1); m.yaw = -Math.PI / 2; m.state = 'round'; m.stun = 1e9; // held in the wing's corridor, facing west
    place(s, 'player', 51.1, 0, -1); // just in front of it
    hold(s, 0.5);
    expect(torchRay(m).pitch).toBeCloseTo(ROUND.pitch, 3); // down the way ahead
    vi.spyOn(performance, 'now').mockReturnValue(0);
    onTestFinished(() => { vi.restoreAllMocks(); });
    const cv = new CastView(new THREE.Group(), s, simLighting(s)), eye = new THREE.PerspectiveCamera();
    const arm = (cv as unknown as { shown: { m: Mutant; M: { arms: THREE.Object3D[] } }[] }).shown.find(x => x.m === m)!.M.arms[0];
    /* after you: the beam up onto you. Before, it was there the step it knew you */
    const at: number[] = [torchRay(m).pitch];
    m.state = 'hunt';
    for (let k = 0; k < 24; k++) {
      step(s, noInput());
      cv.update(1, eye);
      at.push(torchRay(m).pitch);
      expect(arm.rotation.x).toBeCloseTo(at[at.length - 1] - Math.PI / 2, 6); // held out along its beam, every frame
    }
    const aim = at[at.length - 1], steps = at.slice(1).map((p, i) => p - at[i]);
    expect(aim - ROUND.pitch).toBeGreaterThan(0.2);
    expect(Math.max(...steps)).toBeLessThan((aim - ROUND.pitch) * 0.3); // no step a third of the way
    expect(Math.abs(at[12] - aim)).toBeLessThan(0.02); // most of the way in a fifth of a second
  });

  it('what its light throws back goes along with it as it walks, and is not left where it was', () => {
    const { s, m } = setUp(), lit = s.lighting as unknown as { loose: Map<string, { at: Loose }> };
    let worst = 0;
    for (let t = 0; t < 30; t += STEP) {
      step(s, noInput());
      const g = lit.loose.get('torch' + m.id), r = torchRay(m);
      if (g) worst = Math.max(worst, Math.hypot(g.at.x - r.x, g.at.y - r.y, g.at.z - r.z));
    }
    /* worked out again once it has gone half a metre (or turned 8°) since it last was: it was put where the beam was
       when it last jumped, and was 10 m behind it on average, 26 m at worst */
    expect(worst).toBeLessThan(0.6);
  });

  it('a save made on its round plays on the same', async () => {
    const { s } = setUp();
    hold(s, 4);
    const { load, save } = await import('../src/sim/save');
    const a = load(level, JSON.parse(JSON.stringify(save(s))), { seed: 7, station: STATION });
    hold(s, 5); hold(a, 5);
    expect(JSON.stringify(save(a))).toBe(JSON.stringify(save(s)));
  });
});
