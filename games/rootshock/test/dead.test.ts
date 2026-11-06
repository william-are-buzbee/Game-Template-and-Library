import * as THREE from 'three';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { STATION } from '../src/content/station';
import { STEP } from '../src/core/loop';
import { bones, ragAt } from '../src/sim/ragdoll';
import { levelDef } from '../src/sim/run';
import { load, save } from '../src/sim/save';
import { makeSim, simLighting, type Sim } from '../src/sim/sim';
import { CastView } from '../src/present/render/castView';
import { hold } from './kit';

/* The station's dead, the guards and residents lying where they fell: bodies like any other (sim/cast.ts, MT.dead). */

const at = (id: string): Sim => makeSim(levelDef(STATION, id), { seed: 7, station: STATION });
const dead = (s: Sim) => s.cast.filter(m => m.ai === 'dead');

describe('the station\'s dead', () => {
  it('lie where the levels lay them, each a body on the floor, asleep and out of everyone\'s way, a search on each that has one', () => {
    let n = 0;
    for (const { id } of STATION.levels) {
      const s = at(id), L = s.world.def;
      for (const m of dead(s)) {
        n++;
        const R = m.rag!, B = bones('dead'), floor = s.world.groundBelow({ x: m.x, z: m.z, hx: 0.2, hz: 0.2, round: true }, m.y + 0.5);
        expect(m.dead, id).toBe(true);
        expect(R.awake, id).toBe(false);
        expect(s.world.dyn.includes(m.body!.dyn), id).toBe(false);
        /* flat on its back: nothing of it higher than a body lying down, its middle about where the level put it */
        for (let i = 0; i < B.names.length; i++) expect(R.p[i * 3 + 1] - floor, `${id} ${B.names[i]}`).toBeLessThan(0.3);
        const [x, z] = L.mutants[m.id].opts.lies as number[], a = ragAt(R);
        expect(Math.hypot(a.x - x, a.z - z), id).toBeLessThan(0.4);
      }
      /* every body to search is one of them */
      L.uses.forEach((u, ui) => {
        if (u.kind !== 'body') return;
        const m = dead(s).find(q => { const l = L.mutants[q.id].opts.lies as number[]; return l[0] === u.x && l[1] === u.z; });
        expect(m, `${id}: ${u.opts.label} at ${u.x}, ${u.z}`).toBeDefined();
        const use = s.usables.find(q => q.key === 'use' + ui)!, a = ragAt(m!.rag!);
        expect([use.x, use.z]).toEqual([a.x, a.z]);
      });
    }
    expect(n).toBeGreaterThan(10);
  });

  it('come after the living, so the living keep their numbers', () => {
    for (const { id } of STATION.levels) {
      const types = at(id).world.def.mutants.map(d => d.type), first = types.indexOf('dead');
      if (first >= 0) expect(types.slice(first).every(t => t === 'dead'), id).toBe(true);
    }
  });

  it('walked into, a guard is kicked as any body is, and is searched where it has gone; saved, it lies there still', () => {
    const s = at('upper'), L = s.world.def, ui = L.uses.findIndex(u => u.kind === 'body' && u.opts.label === 'Officer');
    const u = L.uses[ui], m = dead(s).find(q => (L.mutants[q.id].opts.lies as number[])[0] === u.x)!, a0 = ragAt(m.rag!), b = s.player.body;
    s.game.god = true;
    /* the officer lies north to south: walked into from the west, square to it, through its middle */
    b.x = a0.x - 2.5; b.z = a0.z; b.y = s.world.groundBelow({ x: b.x, z: b.z, hx: 0.3, hz: 0.3, round: true }, a0.y + 1.5); b.sync();
    s.player.yaw = -Math.PI / 2;
    hold(s, 1.6, { forward: 1 });
    hold(s, 3);
    const a = ragAt(m.rag!), moved = Math.hypot(a.x - a0.x, a.z - a0.z);
    expect(b.x).toBeGreaterThan(a0.x + 0.5); // you went on through it
    expect(moved).toBeGreaterThan(0.02);
    expect(moved).toBeLessThan(0.3);
    expect(m.rag!.awake).toBe(false);
    const use = s.usables.find(q => q.key === 'use' + ui)!;
    expect([use.x, use.z]).toEqual([a.x, a.z]);
    use.act();
    expect(s.game.keys).toContain('s');
    /* and a save keeps it where it lies, searched */
    const t = load(levelDef(STATION, 'upper'), JSON.parse(JSON.stringify(save(s))), { station: STATION });
    const m2 = t.cast[m.id], u2 = t.usables.find(q => q.key === 'use' + ui)!;
    expect(m2.rag!.p).toEqual(m.rag!.p);
    expect(u2.off).toBe(true);
  });

  it('are drawn as they lie, and do not bleed again: their blood is the level\'s', () => {
    const s = at('upper'), cv = new CastView(new THREE.Group(), s, simLighting(s));
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    onTestFinished(() => { vi.restoreAllMocks(); });
    const eye = new THREE.PerspectiveCamera(72, 16 / 9, 0.06, 140);
    for (let k = 0; k < 20; k++) { now += 1000 / 60; cv.update(1, eye); }
    const V = cv as unknown as { shown: { m: { ai: string }; baked: THREE.Mesh | null }[]; spreading: { m: { ai: string } }[] };
    const shown = V.shown.filter(x => x.m.ai === 'dead');
    expect(shown.length).toBeGreaterThan(0);
    for (const x of shown) expect(x.baked).not.toBe(null); // asleep, laid once as one mesh
    /* walked into and settled again, still none */
    for (const m of dead(s)) m.rag!.awake = true;
    for (let k = 0; k < 120; k++) { hold(s, STEP); now += 1000 / 60; cv.update(1, eye); }
    expect(V.spreading.filter(P => P.m.ai === 'dead')).toEqual([]);
  });
});
