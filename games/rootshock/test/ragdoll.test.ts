import * as THREE from 'three';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { testbed } from '../src/content/levels/testbed';
import { STEP } from '../src/core/loop';
import { hitMutant, killAll, MT, spawn, type Hit, type Mutant } from '../src/sim/cast';
import { give } from '../src/sim/game';
import { noInput, type Input } from '../src/sim/input';
import { bones, RAG, ragAt, REFLEX, SKEL, STAGGER } from '../src/sim/ragdoll';
import { load, save } from '../src/sim/save';
import { makeSim, simLighting, step, type Sim } from '../src/sim/sim';
import type { Lighting } from '../src/world/light';
import { BUILD, CastView } from '../src/present/render/castView';
import { RIG, Rigged } from '../src/present/render/rig';
import { hold } from './kit';

/* Corpses that fall loose (engine.md §6, bodies with physics). */

const arena = (lv = testbed()): Sim => {
  const s = makeSim(lv, { seed: 3 }), b = s.player.body;
  b.x = 8; b.z = -3; b.y = 0; b.sync(); s.player.yaw = 0; s.game.god = true;
  return s;
};
/** one of the cast stood still at (x, y, z) facing yaw, a few steps to find its feet */
const stood = (s: Sim, type: string, x: number, y: number, z: number, yaw = Math.PI / 2): Mutant => {
  const m = spawn(s, type, x, y, z)!;
  m.stun = 1e9; m.yaw = yaw;
  for (let i = 0; i < 5; i++) step(s, noInput());
  return m;
};
/* the killing blows as yours land (combat.ts, landOn): the axe's chop, coming down; the baton's swing, across, which
   shoves half along the line and half across it; the pipe's, landing square, its head going the way it shoves. Shove by
   the weapon (70 kg m/s a kilogram and the arm's 1.5), as hard as a blow run into */
const AXE = (dir: { x: number; z: number }): Hit => ({ dmg: 999, poise: 29, shove: 70 * 4.7, dir, by: 'axe', way: { x: dir.x * 0.3, y: -1, z: dir.z * 0.3 } });
const BATON = (dir: { x: number; z: number }): Hit => ({ dmg: 999, poise: 13, shove: 70 * 2.6, dir, by: 'baton', way: { x: dir.x - dir.z, y: 0, z: dir.z + dir.x } });
const PIPE = (dir: { x: number; z: number }): Hit => ({ dmg: 999, poise: 22, shove: 70 * 3.9, dir, by: 'pipe', way: { x: dir.x, y: 0, z: dir.z } });
/** strike it from the side `dir` comes from, at chest height */
const strike = (s: Sim, m: Mutant, w: Hit, k = 1.3) => hitMutant(s, m, { ...w, at: { x: m.x - w.dir!.x * 0.4, y: m.y + (m.body?.h ?? 1) * 0.75, z: m.z - w.dir!.z * 0.4 } }, k);
const pt = (m: Mutant, name: string) => { const i = bones(m.model).at[name] * 3; return { x: m.rag!.p[i], y: m.rag!.p[i + 1], z: m.rag!.p[i + 2] }; };

describe('the skeletons', () => {
  it('weigh what their bodies weigh', () => {
    for (const k of Object.keys(SKEL)) expect(bones(k).mass, k).toBeCloseTo(MT[k].kg, 6);
  });

  it('have their joints where the models do, standing idle', () => {
    const mat = new THREE.MeshBasicMaterial(), v = new THREE.Vector3();
    for (const kind of Object.keys(RIG)) {
      const s = arena(), m = stood(s, kind, 8, 0, -8), M = BUILD[kind](mat, m), B = bones(kind);
      /* as built */
      M.g.updateMatrixWorld(true);
      for (const P of RIG[kind].parts) {
        if (!P.bone) continue;
        /* a limb turns about its first point (or the one it names): that is where the model's joint is */
        const o = [P.o ?? P.bone[0]].flat(), at = (k: number) => o.reduce((a, n) => a + B.rest[B.at[n] * 3 + k], 0) / o.length;
        P.at(M).getWorldPosition(v);
        expect(Math.hypot(v.x - at(0), v.y - at(1), v.z - at(2)), `${kind} ${o}`).toBeLessThan(0.065);
      }
    }
  });
});

describe('a body killed goes loose', () => {
  it('only what has a body and moves: a bloat and what grows on a wall fold where they are', () => {
    const s = arena();
    for (const t of ['husk', 'skitter', 'thresher', 'worm', 'bloat', 'grabber']) spawn(s, t, 8, 0, -8);
    killAll(s);
    expect(s.cast.map(m => !!m.rag)).toEqual([true, true, true, true, false, false]);
  });

  it('carries the killing blow: it goes the way it was struck, and lies where it fell', () => {
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, -1]]) {
      const s = arena(), m = stood(s, 'husk', 8, 0, -9), x0 = m.x, z0 = m.z;
      strike(s, m, PIPE({ x: dx, z: dz }));
      hold(s, 3);
      const a = ragAt(m.rag!), along = (a.x - x0) * dx + (a.z - z0) * dz, across = Math.abs((a.x - x0) * dz - (a.z - z0) * dx);
      expect(along, `${dx},${dz}`).toBeGreaterThan(0.6);
      expect(across).toBeLessThan(along);
      /* on the floor: nothing of it higher than a body lying down */
      for (let i = 0; i < bones('husk').names.length; i++) expect(m.rag!.p[i * 3 + 1]).toBeLessThan(0.45);
    }
  });

  it('an axe kill is not a pipe kill: the chop drops it where it stood, the swing carries it off along the blow', () => {
    /* facing you, as one you chop is */
    const fall = (w: Hit) => {
      const s = arena(), m = stood(s, 'husk', 8, 0, -9), x0 = m.x, z0 = m.z;
      strike(s, m, w);
      let down = 0;
      for (let t = 0; t < 3; t += STEP) { step(s, noInput()); if (!down && pt(m, 'head').y < 0.5) down = t; }
      /* where its hips lie: one that drops where it stood goes over its feet, and lies with its hips by them */
      const L = pt(m, 'hipL'), R = pt(m, 'hipR');
      return { down, went: Math.hypot((L.x + R.x) / 2 - x0, (L.z + R.z) / 2 - z0) };
    };
    const axe = fall(AXE({ x: 1, z: 0 })), pipe = fall(PIPE({ x: 1, z: 0 }));
    console.log(`axe: down in ${axe.down.toFixed(2)} s, hips ${axe.went.toFixed(2)} m from where it stood; pipe: down in ${pipe.down.toFixed(2)} s, ${pipe.went.toFixed(2)} m`);
    expect(axe.went).toBeLessThan(0.8);
    expect(pipe.went).toBeGreaterThan(axe.went + 0.5);
  });

  it('killed by a real chop, the light ones drop where they were struck: none thrown, none sent off sideways', () => {
    for (const kind of ['skitter', 'worm', 'husk']) {
      const s = arena(), m = stood(s, kind, 8, 0, -4.5, 0), B = bones(kind);
      m.hp = 1;
      const mid = () => {
        let x = 0, y = 0, z = 0;
        for (let i = 0; i < B.names.length; i++) { const w = B.kg[i] / B.mass; x += m.rag!.p[i * 3] * w; y += m.rag!.p[i * 3 + 1] * w; z += m.rag!.p[i * 3 + 2] * w; }
        return { x, y, z };
      };
      s.player.pitch = Math.atan2(m.body!.h * 0.5 - 1.6, 1.5);
      give(s.game, 'axe');
      hold(s, STEP, { attack: true });
      let c0: { x: number; y: number; z: number } | null = null, top = 0;
      for (let t = 0; t < 4; t += STEP) {
        step(s, noInput());
        if (m.rag && !c0) c0 = mid();
        if (c0) top = Math.max(top, mid().y - c0.y);
      }
      expect(m.dead, kind).toBe(true);
      const c = mid();
      console.log(`${kind}: axe kill lies ${(c0!.z - c.z).toFixed(2)} m along, ${(c.x - c0!.x).toFixed(2)} m across; rose ${top.toFixed(2)} m`);
      expect(Math.abs(c.x - c0!.x), kind).toBeLessThan(0.3);
      expect(Math.hypot(c.x - c0!.x, c.z - c0!.z), kind).toBeLessThan(kind === 'husk' ? 1.2 : 0.8);
      expect(top, kind).toBeLessThan(0.1);
    }
  });

  it('a worm dying thrashes where it dies, and does not swim off', () => {
    const lies = (thrash: boolean) => {
      const s = arena(), m = stood(s, 'worm', 8, 0, -9), t0 = REFLEX.writhe.time;
      if (!thrash) REFLEX.writhe.time = 0;
      killAll(s);
      hold(s, 3);
      REFLEX.writhe.time = t0;
      return ragAt(m.rag!);
    };
    const a = lies(true), b = lies(false);
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeLessThan(0.15);
  });

  it('killed harder (run in: the closing multiplier), it goes further', () => {
    const far = (k: number) => {
      const s = arena(), m = stood(s, 'husk', 8, 0, -9), x0 = m.x;
      strike(s, m, PIPE({ x: 1, z: 0 }), k);
      hold(s, 3);
      return ragAt(m.rag!).x - x0;
    };
    expect(far(1.2)).toBeGreaterThan(far(0.6) + 0.3);
  });

  it('killed with no blow (a fall, the dev key), it crumples where it stood', () => {
    const s = arena(), m = stood(s, 'husk', 8, 0, -9);
    killAll(s);
    hold(s, 3);
    const a = ragAt(m.rag!);
    expect(Math.hypot(a.x - 8, a.z + 9)).toBeLessThan(1.2);
    expect(pt(m, 'head').y).toBeLessThan(0.45);
  });

  it('killed near a wall and struck into it, it slumps against it rather than lying flat', () => {
    /* the arena's west wall, x = -2, clear of the low bay: the pipe's swing from 1.2 m out, the baton's (which carries
       it less far, and turns it along the wall) from a metre */
    for (const [w, d] of [[PIPE({ x: -1, z: 0 }), 1.2], [BATON({ x: -1, z: 0 }), 1]] as const) {
      const s = arena(), m = stood(s, 'husk', -2 + d, 0, -16.5);
      strike(s, m, w, 1.2);
      hold(s, 4);
      const h = pt(m, 'head');
      expect(h.y, w.by).toBeGreaterThan(0.6);
      expect(h.x).toBeLessThan(-1.6);
    }
  });

  it('killed on the ledge and struck off it, it goes over and lies on the floor 3 m below', () => {
    const s = arena(), m = stood(s, 'husk', 12.5, 3, -14.5);
    strike(s, m, PIPE({ x: -1, z: 0 }), 1);
    hold(s, 4);
    expect(m.y).toBeLessThan(0.2);
    expect(m.x).toBeLessThan(12);
  });

  it('every kind settles and goes to sleep within a few seconds, and then lies still', () => {
    for (const t of ['husk', 'skitter', 'thresher', 'worm']) {
      const s = arena(), m = stood(s, t, 8, 0, -9);
      strike(s, m, AXE({ x: 1, z: 0 }));
      hold(s, 3);
      expect(m.rag!.awake, t).toBe(false);
      const p = m.rag!.p.slice();
      hold(s, 1);
      expect(m.rag!.p).toEqual(p);
    }
  });

  it('holds together: no bone stretched or squashed by more than a few centimetres once it lies still', () => {
    for (const t of ['husk', 'skitter', 'thresher', 'worm']) {
      const s = arena(), m = stood(s, t, 8, 0, -9), B = bones(t);
      strike(s, m, BATON({ x: 1, z: 0 }));
      hold(s, 3);
      const R = m.rag!;
      let worst = 0;
      for (let k = 0; k < B.sticks.length; k += 3) {
        const a = B.sticks[k] * 3, b = B.sticks[k + 1] * 3, d = Math.hypot(R.p[a] - R.p[b], R.p[a + 1] - R.p[b + 1], R.p[a + 2] - R.p[b + 2]);
        worst = Math.max(worst, Math.abs(d - B.sticks[k + 2]));
      }
      console.log(`${t}: bones off their length by ${(worst * 1000).toFixed(0)} mm at most`);
      expect(worst, t).toBeLessThan(0.03);
    }
  });

  it('is the same fall twice: a corpse is plain numbers, with no chance in it', () => {
    const run = () => {
      const s = arena(), a = stood(s, 'husk', 8, 0, -9), b = stood(s, 'thresher', 6, 0, -10);
      strike(s, a, AXE({ x: 1, z: 0.3 }), 1.4);
      strike(s, b, BATON({ x: -0.5, z: -1 }), 1.1);
      hold(s, 2);
      return [a.rag!.p, b.rag!.p, a.x, b.z];
    };
    expect(run()).toEqual(run());
  });

  it('is heard landing', () => {
    const s = arena(), m = stood(s, 'husk', 8, 0, -9);
    strike(s, m, AXE({ x: 1, z: 0 }));
    let thuds = 0;
    for (let t = 0; t < 2; t += STEP) {
      s.game.events.length = 0;
      step(s, noInput());
      thuds += s.game.events.filter(e => e.type === 'sfx' && e.name === 'thud').length;
    }
    expect(thuds).toBeGreaterThan(0);
    expect(thuds).toBeLessThan(8);
  });
});

describe('muscle tone', () => {
  /** how far its limbs are from how it stands, in its trunk's frame (m, on average), `secs` after the axe kills it;
   *  with tone as it is, or none */
  const outOfShape = (secs: number, tone: boolean) => {
    const keep = RAG.tone.start;
    if (!tone) RAG.tone.start = 0;
    try {
      const s = arena(), m = stood(s, 'husk', 8, 0, -9);
      strike(s, m, AXE({ x: 1, z: 0 }));
      hold(s, secs);
      /* its trunk's frame from hips and left shoulder, as the tone reckons it (sim/ragdoll.ts, frameOf) */
      const B = bones('husk'), p = m.rag!.p, at = (q: number[], i: number) => [q[i * 3], q[i * 3 + 1], q[i * 3 + 2]];
      const frame = (q: number[]) => {
        const [a, b, c] = ['hipL', 'hipR', 'shL'].map(n => at(q, B.at[n]));
        const e = b.map((v, k) => v - a[k]), el = Math.hypot(...e), u = e.map(v => v / el), f = c.map((v, k) => v - a[k]);
        const n = [u[1] * f[2] - u[2] * f[1], u[2] * f[0] - u[0] * f[2], u[0] * f[1] - u[1] * f[0]], nl = Math.hypot(...n), w = n.map(v => v / nl);
        const v2 = [w[1] * u[2] - w[2] * u[1], w[2] * u[0] - w[0] * u[2], w[0] * u[1] - w[1] * u[0]];
        return (i: number) => { const d = at(q, i).map((x, k) => x - a[k]); return [u, v2, w].map(ax => ax[0] * d[0] + ax[1] * d[1] + ax[2] * d[2]); };
      };
      const now = frame(p), was = frame(B.rest);
      let sum = 0;
      for (const n of ['kneeL', 'kneeR', 'footL', 'footR', 'handL', 'handR']) { const a = now(B.at[n]), b = was(B.at[n]); sum += Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
      return sum / 6;
    } finally { RAG.tone.start = keep; }
  };

  it('nobody goes limp at once: struck dead, a body keeps its shape a moment, then lets go', () => {
    const toned = outOfShape(0.25, true), limp = outOfShape(0.25, false);
    console.log(`a quarter second after the axe, its limbs are ${(toned * 100).toFixed(0)} cm out of shape (with no tone, ${(limp * 100).toFixed(0)} cm)`);
    expect(toned).toBeLessThan(limp * 0.75);
  });

  it('a body knocked about later does not get its tone back', () => {
    const s = arena(), m = stood(s, 'husk', 8, 0, -9);
    killAll(s);
    hold(s, 3);
    const R = m.rag!, age = R.age!;
    expect(age).toBeGreaterThan(RAG.tone.last);
    strike(s, m, BATON({ x: 1, z: 0 }));
    expect(R.awake).toBe(true);
    hold(s, 0.5);
    expect(R.age!).toBeGreaterThan(age);
  });

  it('a body falls at the earth\'s gravity, not the station\'s: it takes longer to go down', () => {
    const down = (g: number) => {
      const keep = RAG.gravity;
      RAG.gravity = g;
      try {
        const s = arena(), m = stood(s, 'husk', 8, 0, -9);
        killAll(s);
        let t = 0;
        while (pt(m, 'head').y > 0.5 && t < 4) { step(s, noInput()); t += STEP; }
        return t;
      } finally { RAG.gravity = keep; }
    };
    const earth = down(RAG.gravity), station = down(20);
    console.log(`killed with no blow, its head is down in ${earth.toFixed(2)} s (at the station's 20 m/s², ${station.toFixed(2)} s)`);
    expect(earth).toBeGreaterThan(station + 0.15);
  });
});

describe('reflexes', () => {
  /** run with the reflexes as they are, or with none */
  const without = <T>(on: boolean, f: () => T): T => {
    const keep = structuredClone(REFLEX);
    if (!on) { REFLEX.brace.pull = 0; REFLEX.clutch.pull = 0; REFLEX.guard.pull = 0; REFLEX.writhe.amp = 0; }
    try { return f(); } finally { Object.assign(REFLEX, keep); }
  };
  const dist = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  /** a husk knocked down backward (shoved north, the way it faces away from), and its hands a third of a second on */
  const knocked = (on: boolean) => without(on, () => {
    const s = arena(), m = stood(s, 'husk', 8, 0, -8, Math.PI);
    m.stun = 0;
    hitMutant(s, m, { dmg: 5, poise: 500, shove: 420, dir: { x: 0, z: -1 }, at: { x: m.x, y: 1.35, z: m.z + 0.3 }, way: { x: 0, y: 0, z: -1 } }, 1);
    hold(s, 0.35);
    return { s, m, hands: ['handL', 'handR'].map(n => pt(m, n)), hips: pt(m, 'hipL') };
  });

  it('knocked down, its hands go out and down the way it is going over, to catch it', () => {
    const on = knocked(true), off = knocked(false);
    /* the way it goes is north (-z): its hands further that way, and lower, than they fall of themselves */
    const reachOn = on.hands.reduce((a, h) => a + (on.hips.z - h.z) - h.y, 0), reachOff = off.hands.reduce((a, h) => a + (off.hips.z - h.z) - h.y, 0);
    console.log(`braced, its hands are ${((reachOn - reachOff) / 2).toFixed(2)} m further out and down each, a third of a second into its fall`);
    expect(reachOn).toBeGreaterThan(reachOff + 0.2);
  });

  it('struck while it is down, its hands come up to its face', () => {
    const guard = (on: boolean) => {
      const { s, m } = knocked(on);
      hold(s, 0.4);
      without(on, () => {
        hitMutant(s, m, { dmg: 2, poise: 5, shove: 100, dir: { x: 0, z: -1 }, at: pt(m, 'belly'), way: { x: 0, y: -1, z: 0 } }, 1);
        hold(s, 0.3);
      });
      return Math.min(...['handL', 'handR'].map(n => dist(pt(m, n), pt(m, 'head'))));
    };
    const on = guard(true), off = guard(false);
    console.log(`struck down, its nearer hand is ${on.toFixed(2)} m from its head (with no reflexes, ${off.toFixed(2)} m)`);
    expect(on).toBeLessThan(off - 0.15);
  });

  it('dying, a hand goes toward where it was struck', () => {
    const clutch = (on: boolean) => without(on, () => {
      const s = arena(), m = stood(s, 'thresher', 8, 0, -9, 0);
      hitMutant(s, m, { dmg: 999, poise: 1, shove: 300, dir: { x: 1, z: 0 }, at: { x: m.x - 0.2, y: 1.4, z: m.z + 0.2 }, way: { x: 1, y: 0, z: 0 } }, 1);
      const R = m.rag!;
      let near = Infinity;
      for (let t = 0; t < 0.7; t += STEP) {
        step(s, noInput());
        const w = { x: R.p[R.wound! * 3], y: R.p[R.wound! * 3 + 1], z: R.p[R.wound! * 3 + 2] };
        near = Math.min(near, ...['handL', 'handR'].map(n => dist(pt(m, n), w)));
      }
      return near;
    });
    const on = clutch(true), off = clutch(false);
    console.log(`a thresher dying: its nearest hand comes within ${on.toFixed(2)} m of the wound (with no reflexes, ${off.toFixed(2)} m)`);
    expect(on).toBeLessThan(off - 0.1);
  });

  it('a worm dying thrashes', () => {
    const thrash = (on: boolean) => without(on, () => {
      const s = arena(), m = stood(s, 'worm', 8, 0, -9, 0);
      killAll(s);
      let side = 0;
      for (let t = 0; t < 1.5; t += STEP) { const x0 = m.rag!.p.filter((_, k) => k % 3 === 0); step(s, noInput()); side += m.rag!.p.filter((_, k) => k % 3 === 0).reduce((a, x, k) => a + Math.abs(x - x0[k]), 0); }
      return side;
    });
    expect(thrash(true)).toBeGreaterThan(thrash(false) * 2);
  });
});

describe('stagger steps', () => {
  /** knocked down, shoved at 5.5 m/s, with the stagger steps as they are or none: how many steps, and how long before
   *  its head is lower than half its height */
  const knocked = (type: string, on: boolean) => {
    const keep = STAGGER.alive;
    if (!on) STAGGER.alive = -1;
    try {
      const s = arena(), m = stood(s, type, 8, 0, -8, Math.PI);
      m.stun = 0;
      hitMutant(s, m, { dmg: 5, poise: 500, shove: m.body!.mass * 5.5, dir: { x: 0, z: -1 }, at: { x: m.x, y: m.body!.h * 0.75, z: m.z + 0.3 }, way: { x: 0, y: 0, z: -1 } }, 1);
      const R = m.rag!;
      let down = -1;
      for (let t = 0; t < 1.5; t += STEP) { step(s, noInput()); if (down < 0 && pt(m, 'head').y < m.body!.h * 0.5) down = t; }
      return { steps: R.steps ?? 0, down };
    } finally { STAGGER.alive = keep; }
  };

  it('knocked off its feet, a body steps to catch itself before it goes down', () => {
    for (const t of ['husk', 'thresher']) {
      const on = knocked(t, true), off = knocked(t, false);
      console.log(`${t}: ${on.steps} steps, its head down in ${on.down.toFixed(2)} s (with no steps, ${off.down.toFixed(2)} s)`);
      expect(on.steps, t).toBeGreaterThanOrEqual(1);
      expect(on.down, t).toBeGreaterThan(off.down + 0.1);
    }
  });

  it('the dying do not: no step under a body killed', () => {
    const s = arena(), m = stood(s, 'husk', 8, 0, -9);
    strike(s, m, AXE({ x: 1, z: 0 }));
    hold(s, 1);
    expect(m.rag!.steps ?? 0).toBe(0);
  });
});

describe('corpses stay in the world', () => {
  /** a husk (or another) killed and left to settle, lying north of you */
  const lying = (s: Sim, x = 8, z = -6, kind = 'husk') => {
    const m = stood(s, kind, x, 0, z);
    killAll(s);
    hold(s, 3);
    expect(m.rag!.awake).toBe(false);
    return m;
  };

  it('a blow through one knocks it the way it went, and goes on: the pipe\'s swing shoves it along, the axe\'s chop pins it', () => {
    for (const [id, least] of [['axe', -0.05], ['pipe', 0.1]] as const) {
      const s = arena(), m = lying(s), a0 = ragAt(m.rag!);
      const b = s.player.body; b.x = a0.x; b.z = a0.z + 1.2; b.sync(); s.player.yaw = 0; s.player.pitch = -0.7;
      give(s.game, id); s.game.weapon = id;
      hold(s, STEP, { attack: true });
      hold(s, 2.5); // the arm comes up (the axe 1.1 s), and the blow comes down
      const a = ragAt(m.rag!);
      console.log(`${id} knocks a husk lying 1.2 m off ${(a0.z - a.z).toFixed(2)} m`);
      expect(s.hands.swing?.knocked ?? [m.id]).toContain(m.id); // it was struck
      expect(a0.z - a.z, id).toBeGreaterThan(least); // north, the way you faced
      expect(s.hands.swing?.struck ?? null).toBe(null); // not stopped in it
    }
  });

  it('a shot knocks one too', () => {
    const s = arena(), m = lying(s), a0 = ragAt(m.rag!);
    const b = s.player.body; b.x = a0.x; b.z = a0.z + 3; b.sync(); s.player.yaw = 0; s.player.pitch = -0.45;
    give(s.game, 'shotgun'); give(s.game, 'shells'); s.game.weapon = 'shotgun';
    hold(s, 2 * STEP, { attack: true });
    expect(m.rag!.awake).toBe(true);
    hold(s, 1);
    /* a round shoves a body lying on the floor a little: fired down at it, it presses it into the floor */
    expect(a0.z - ragAt(m.rag!).z).toBeGreaterThan(0.03);
  });

  it('walked into, it is kicked aside by your legs, not carried off before you, and you are not stopped', () => {
    for (const run of [false, true]) {
      const s = arena(), m = lying(s), a0 = ragAt(m.rag!), b = s.player.body;
      b.x = a0.x; b.z = a0.z + 2; b.sync(); s.player.yaw = 0;
      hold(s, 1.5, { forward: 1, run });
      expect(b.z).toBeLessThan(a0.z - 0.5); // you went on past it
      const a = ragAt(m.rag!), moved = Math.hypot(a.x - a0.x, a.z - a0.z);
      expect(moved, `run ${run}`).toBeGreaterThan(0.03);
      expect(moved, `run ${run}`).toBeLessThan(0.3); // it went 2.6 m before you, 4 run into, when you shoved it by all you weigh
      hold(s, 3);
      expect(m.rag!.awake).toBe(false); // and it settles again
    }
  });

  it('walked into, the heavier it is the less it goes: a thresher\'s hardly, a worm\'s furthest, none carried off', () => {
    const moved: Record<string, number> = {};
    for (const kind of ['thresher', 'husk', 'worm']) {
      const s = arena(), m = lying(s, 8, -6, kind), a0 = ragAt(m.rag!), b = s.player.body;
      b.x = a0.x; b.z = a0.z + 2.5; b.sync(); s.player.yaw = 0;
      hold(s, 1.6, { forward: 1 });
      hold(s, 2);
      const a = ragAt(m.rag!);
      moved[kind] = Math.hypot(a.x - a0.x, a.z - a0.z);
    }
    expect(moved.thresher).toBeLessThan(0.06);
    expect(moved.thresher).toBeLessThan(moved.husk);
    expect(moved.husk).toBeLessThan(moved.worm);
    expect(moved.worm).toBeLessThan(1);
  });

  it('brushed past, its limbs are swept aside, light as they are, and its trunk hardly shifts', () => {
    for (const run of [false, true]) {
      const s = arena(), m = lying(s), B = bones('husk'), p0 = [...m.rag!.p], b = s.player.body;
      /* along it, 0.4 m to its side: its trunk the way it lies, from its head to its hips */
      const at = (n: string, k: number) => p0[B.at[n] * 3 + k], hx = (at('hipL', 0) + at('hipR', 0)) / 2, hz = (at('hipL', 2) + at('hipR', 2)) / 2;
      const ux0 = at('head', 0) - hx, uz0 = at('head', 2) - hz, ul = Math.hypot(ux0, uz0), ux = ux0 / ul, uz = uz0 / ul;
      b.x = hx - ux * 2.5 - uz * 0.4; b.z = hz - uz * 2.5 + ux * 0.4; b.sync(); s.player.yaw = Math.atan2(-ux, -uz);
      hold(s, 1.6, { forward: 1, run });
      hold(s, 3);
      let limb = 0, trunk = 0;
      for (let i = 0; i < B.names.length; i++) {
        const d = Math.hypot(m.rag!.p[i * 3] - p0[i * 3], m.rag!.p[i * 3 + 2] - p0[i * 3 + 2]);
        if (B.carry[i] < B.mass) limb = Math.max(limb, d); else trunk = Math.max(trunk, d);
      }
      expect(limb, `run ${run}`).toBeGreaterThan(0.25); // was 0.12 kicked as if each limb weighed all of it
      expect(trunk, `run ${run}`).toBeLessThan(0.2);
      expect(m.rag!.awake).toBe(false);
    }
  });

  it('lying in one who stands still, it is left as it lies, asleep: it is not kicked', () => {
    const s = arena(), m = lying(s), a0 = ragAt(m.rag!), b = s.player.body;
    b.x = a0.x; b.z = a0.z; b.sync();
    hold(s, 2);
    expect(m.rag!.awake).toBe(false);
    expect(ragAt(m.rag!)).toEqual(a0);
  });

  it('is drawn where it lies while it sleeps, though it is laid only once, and again where it goes once woken', () => {
    const s = arena(), m = lying(s), M = BUILD.husk(new THREE.MeshBasicMaterial(), m), rig = new Rigged(M, 'husk');
    const head = () => { M.g.updateMatrixWorld(true); const v = M.hd.getWorldPosition(new THREE.Vector3()); return v; };
    const near = (v: THREE.Vector3) => Math.hypot(v.x - pt(m, 'head').x, v.y - pt(m, 'head').y, v.z - pt(m, 'head').z);
    rig.pose(m.rag!, 1, 1);
    const h0 = head();
    expect(near(h0)).toBeLessThan(0.15);
    /* drawn as one of the living is placed, first (castView.ts): the pose it was laid in stands */
    M.g.position.set(3, 1, 3); M.g.rotation.y = 1;
    rig.pose(m.rag!, 0.5, 1 / 60);
    expect(head().distanceTo(h0)).toBeLessThan(1e-9);
    /* walked through, it wakes and goes along: drawn there */
    const b = s.player.body, a0 = ragAt(m.rag!);
    b.x = a0.x; b.z = a0.z + 2; b.sync(); s.player.yaw = 0;
    hold(s, 1.5, { forward: 1 });
    rig.pose(m.rag!, 1, 1 / 60);
    expect(head().distanceTo(h0)).toBeGreaterThan(0.1);
    expect(near(head())).toBeLessThan(0.15);
  });

  it('asleep, it is drawn as one mesh where its parts lay, and as its parts again once woken', () => {
    const s = arena(), m = lying(s), cv = new CastView(new THREE.Group(), s, simLighting(s));
    /* frames a sixtieth of a second apart, as the page draws them (the blend into its points goes by time) */
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    onTestFinished(() => { vi.restoreAllMocks(); });
    /* seen from where you stand, looking at it (what is out of sight is not drawn: castView.ts, SIGHT) */
    const eye = new THREE.PerspectiveCamera(72, 16 / 9, 0.06, 140);
    const look = () => { const b = s.player.body, a = ragAt(m.rag!); eye.position.set(b.x, b.y + 1.6, b.z); eye.lookAt(a.x, a.y, a.z); };
    const draw = (n = 1) => { for (let k = 0; k < n; k++) { now += 1000 / 60; look(); cv.update(1, eye); } };
    const shown = () => (cv as unknown as { shown: { m: Mutant; M: { g: THREE.Group }; baked: THREE.Mesh | null }[] }).shown.find(x => x.m === m)!;
    draw(15); // blended in and laid as it lies
    const S = shown();
    expect(S.baked).not.toBe(null);
    expect(S.M.g.visible).toBe(false);
    /* the one mesh covers what its parts did, to the vertex */
    S.M.g.visible = true;
    const parts = new THREE.Box3().setFromObject(S.M.g, true), one = new THREE.Box3().setFromObject(S.baked!, true);
    let n = 0;
    S.M.g.traverseVisible(o => { if ((o as THREE.Mesh).isMesh) n += (o as THREE.Mesh).geometry.getAttribute('position').count; });
    S.M.g.visible = false;
    expect(parts.min.distanceTo(one.min) + parts.max.distanceTo(one.max)).toBeLessThan(1e-5);
    expect(S.baked!.geometry.getAttribute('position').count).toBe(n);
    /* walked through, it wakes: its parts again, and the mesh gone, while it is awake */
    const b = s.player.body, a0 = ragAt(m.rag!);
    b.x = a0.x; b.z = a0.z + 2; b.sync(); s.player.yaw = 0;
    let woke = 0, apart = 0;
    for (let t = 0; t < 1.5; t += STEP) {
      step(s, { ...noInput(), forward: 1 }); draw();
      if (m.rag!.awake) { woke++; if (S.baked === null && S.M.g.visible) apart++; }
    }
    expect(woke).toBeGreaterThan(10);
    expect(apart).toBe(woke);
    hold(s, 3);
    draw(15);
    expect(S.baked).not.toBe(null); // and again, once it settles
  });

  it('asleep out of sight, it is laid as one mesh all the same, not drawn, and drawn once looked at', () => {
    const s = arena(), m = lying(s), cv = new CastView(new THREE.Group(), s, simLighting(s));
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    onTestFinished(() => { vi.restoreAllMocks(); });
    const eye = new THREE.PerspectiveCamera(72, 16 / 9, 0.06, 140), a = ragAt(m.rag!);
    eye.position.set(a.x, a.y + 1.6, a.z + 6);
    eye.lookAt(a.x, a.y + 1.6, a.z + 20); // turned away from it
    for (let k = 0; k < 15; k++) { now += 1000 / 60; cv.update(1, eye); }
    const S = (cv as unknown as { shown: { m: Mutant; M: { g: THREE.Group }; baked: THREE.Mesh | null }[] }).shown.find(x => x.m === m)!;
    expect(S.baked).not.toBe(null);
    expect(S.baked!.visible).toBe(false);
    expect(S.baked!.geometry.getAttribute('position').count).toBeGreaterThan(100); // all of it, though nothing of it was shown
    eye.lookAt(a.x, a.y, a.z);
    now += 1000 / 60; cv.update(1, eye);
    expect(S.baked!.visible).toBe(true);
  });

  it('one of the cast walking through one kicks it too', () => {
    const s = arena(), m = lying(s), a0 = ragAt(m.rag!), b = s.player.body;
    b.x = a0.x; b.z = a0.z - 5; b.sync(); s.player.yaw = Math.PI;
    const h = spawn(s, 'husk', a0.x, 0, a0.z + 3)!;
    s.game.god = true;
    hold(s, 3);
    expect(h.z).toBeLessThan(a0.z);
    const a = ragAt(m.rag!), moved = Math.hypot(a.x - a0.x, a.z - a0.z);
    expect(moved).toBeGreaterThan(0.03);
    expect(moved).toBeLessThan(0.3);
  });

  it('one falls on another: they lie one on the other, not through it', () => {
    const s = arena(), under = lying(s), a0 = ragAt(under.rag!);
    const top = stood(s, 'husk', a0.x, 0, a0.z + 0.9, Math.PI);
    strike(s, top, AXE({ x: 0, z: -1 }), 1);
    hold(s, 4);
    const A = bones('husk');
    let worst = 0;
    for (let i = 0; i < A.names.length; i++) for (let j = 0; j < A.names.length; j++) {
      const p = top.rag!.p, q = under.rag!.p;
      worst = Math.max(worst, A.r[i] + A.r[j] - Math.hypot(p[i * 3] - q[j * 3], p[i * 3 + 1] - q[j * 3 + 1], p[i * 3 + 2] - q[j * 3 + 2]));
    }
    expect(worst).toBeLessThan(0.06);
    expect(Math.max(...bones('husk').names.map((_, i) => top.rag!.p[i * 3 + 1]))).toBeGreaterThan(0.22); // on it, not beside it
    expect(top.rag!.awake || under.rag!.awake).toBe(false);
  });

  it('a platform carries one that lies on it, and a door coming down puts one out of its way', () => {
    /* the lab's lift: 8..10 by 30..32, from 0.2 up to 3 */
    const s = arena(), m = stood(s, 'husk', 9, 0.2, 31, 0);
    killAll(s);
    hold(s, 3);
    const p = s.platforms[0];
    p.target = 1; p.moving = true;
    hold(s, 3);
    expect(p.y).toBe(3);
    expect(m.y).toBeGreaterThan(2.9);
    /* the door in the passage south of the hall, 7..9 by 13.75..14, open with a body lying across its sill */
    const t = arena(), d = t.doors[0], q = stood(t, 'husk', 8, 0, 14.6, Math.PI);
    d.open = true; d.t = 1;
    strike(t, q, BATON({ x: 0, z: -1 }), 1);
    hold(t, 2);
    expect(Math.min(...bones('husk').names.map((_, i) => Math.abs(q.rag!.p[i * 3 + 2] - 13.875)))).toBeLessThan(0.3); // across the sill
    d.open = false; d.hold = 0;
    hold(t, 2);
    expect(d.t).toBe(0);
    const B = bones('husk');
    for (let i = 0; i < B.names.length; i++) {
      const x = q.rag!.p[i * 3], z = q.rag!.p[i * 3 + 2];
      /* a point meets the world as a box 0.6 of its radius about it (sim/ragdoll.ts, collide) */
      expect(x > 7 && x < 9 && z > 13.75 - B.r[i] * 0.6 && z < 14 + B.r[i] * 0.6, B.names[i]).toBe(false);
    }
  });

  it('is saved: a run saved with a body falling plays on as it would have', () => {
    /* a husk the level places (a save knows the level's cast, not those the arena puts down) */
    const level = () => { const lv = testbed(); lv.mutants.push({ type: 'husk', x: 8, y: 0, z: -8, opts: {} }); return lv; };
    const run = (saveAt: number | null) => {
      let s = arena(level());
      const m = s.cast[0];
      m.stun = 1e9;
      hold(s, 0.1);
      strike(s, m, AXE({ x: 0.6, z: -0.8 }), 1.4);
      for (let k = 0; k < 90; k++) {
        if (k === saveAt) s = load(level(), JSON.parse(JSON.stringify(save(s))));
        step(s, noInput());
      }
      return s.cast[0].rag!.p;
    };
    expect(run(20)).toEqual(run(null));
  });

  it('a save from before corpses were kept loads its dead laid where they lay', () => {
    const level = () => { const lv = testbed(); lv.mutants.push({ type: 'husk', x: 8, y: 0, z: -6, opts: {} }); return lv; };
    const s = arena(level()), m = s.cast[0];
    killAll(s);
    hold(s, 3);
    const data = JSON.parse(JSON.stringify(save(s)));
    delete data.cast[0].rag;
    const t = load(level(), data);
    expect(t.cast[0].rag?.awake).toBe(false);
    expect(Math.hypot(ragAt(t.cast[0].rag!).x - m.x, ragAt(t.cast[0].rag!).z - m.z)).toBeLessThan(1.2);
  });

  it('the dev key clears the dead once none are left alive', () => {
    const s = arena();
    lying(s);
    killAll(s);
    expect(s.cast[0].away).toBe(true);
    expect(s.cast[0].rag).toBe(null);
  });
});

describe('knocked down, loose', () => {
  /** a husk the axe floors, run in (engine.md §6, knockdowns: 6.2 m/s) */
  const floor = (s: Sim, m: Mutant) => hitMutant(s, m, { dmg: 10, poise: 29, shove: 70 * 4.7, dir: { x: 0, z: -1 }, by: 'axe', at: { x: m.x, y: m.y + 1.35, z: m.z + 0.4 }, way: { x: 0, y: -1, z: -0.3 } }, 1.5);

  it('goes down loose, lies, and is its own body again once up', () => {
    for (const t of ['husk', 'thresher']) {
      const s = arena(), m = stood(s, t, 8, 0, -8, 0);
      m.stun = 0; s.game.god = true;
      hitMutant(s, m, { dmg: 10, poise: 500, shove: 1500, dir: { x: 0, z: -1 }, at: { x: m.x, y: m.y + m.body!.h * 0.75, z: m.z + 0.4 }, way: { x: 0, y: -1, z: -0.3 } }, 1);
      expect(m.down, t).toBeGreaterThan(0);
      expect(m.rag).not.toBe(null);
      const R = m.rag!, B = bones(t);
      hold(s, 0.9);
      /* down: no higher than sitting (one thrown hard catches itself on its hands, REFLEX.brace) */
      expect(Math.max(...B.names.map((_, i) => R.p[i * 3 + 1])), t).toBeLessThan(m.body!.h * 0.55);
      /* drawn after its feet: it lies about where the fight has it */
      const a = ragAt(R);
      expect(Math.hypot(a.x - m.x, a.z - m.z), t).toBeLessThan(1);
      hold(s, 0.8);
      expect(m.down + m.rise).toBe(0);
      expect(m.rag).toBe(null);
    }
  });

  it('changes nothing in the fight: the same knockdown with and without it goes the same', () => {
    const run = (loose: boolean) => {
      RAG.floored = loose;
      const s = arena(), m = stood(s, 'husk', 8, 0, -6, 0);
      m.stun = 0;
      floor(s, m);
      const out: number[] = [];
      for (let k = 0; k < 150; k++) { step(s, noInput()); out.push(m.x, m.z, m.hp, m.down, m.rise, m.poise, s.player.body.x, s.player.body.z, s.game.hp); }
      return out;
    };
    try { expect(run(true)).toEqual(run(false)); } finally { RAG.floored = true; }
  });

  it('a blow on one down jolts its body where it lands; killed there, the same body goes on, dead', () => {
    const s = arena(), m = stood(s, 'husk', 8, 0, -8, 0);
    m.stun = 0;
    floor(s, m);
    hold(s, 0.5);
    const R = m.rag!, before = R.p.slice();
    hitMutant(s, m, { dmg: 5, poise: 10, shove: 300, dir: { x: 1, z: 0 }, at: pt(m, 'head'), way: { x: 1, y: 0, z: 0 } }, 1);
    hold(s, 0.2);
    const head = bones('husk').at.head * 3;
    expect(R.p[head] - before[head]).toBeGreaterThan(0.05);
    hitMutant(s, m, { dmg: 999, poise: 10, shove: 300, dir: { x: 1, z: 0 }, at: pt(m, 'belly'), way: { x: 1, y: 0, z: 0 } }, 1);
    expect(m.dead).toBe(true);
    expect(m.rag).toBe(R);
    hold(s, 3);
    expect(R.awake).toBe(false);
  });

  it('is saved while down: a run saved with one on the floor plays on as it would have', () => {
    const level = () => { const lv = testbed(); lv.mutants.push({ type: 'husk', x: 8, y: 0, z: -6, opts: {} }); return lv; };
    const run = (saveAt: number | null) => {
      let s = arena(level());
      hold(s, 0.1);
      floor(s, s.cast[0]);
      for (let k = 0; k < 120; k++) {
        if (k === saveAt) s = load(level(), JSON.parse(JSON.stringify(save(s))));
        step(s, noInput());
      }
      const m = s.cast[0];
      return [m.x, m.z, m.down, m.rise, m.rag?.p ?? null];
    };
    expect(run(30)).toEqual(run(null));
  });
});

describe('drawn going loose', () => {
  /** drawn a frame a step, `alpha` of the way through it as the page has it, and lit by a light as bright as it is high
   *  above the floor, so how high its light is taken shows: `act` done after a second, then drawn on. Each frame, the
   *  most any part of it moved and how much its light changed; and the frame `act` came before */
  const watch = (s: Sim, m: Mutant, act: () => void) => {
    const L = { looseLights: [], atPoint: (_x: number, y: number) => [y, y, y], flickAt: () => [0, 0, 0], towards: () => [0, 0, 0] } as unknown as Lighting;
    const cv = new CastView(new THREE.Group(), s, L), eye = new THREE.PerspectiveCamera(72, 16 / 9, 0.06, 140), b = s.player.body;
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    /* none of the living's twitches (castView.ts, ANIM): what moves is what going loose moves */
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    onTestFinished(() => { vi.restoreAllMocks(); });
    const S = (cv as unknown as { shown: { m: Mutant; M: { g: THREE.Group }; mat: THREE.ShaderMaterial }[] }).shown.find(x => x.m === m)!;
    const at = () => { const out: THREE.Vector3[] = []; S.M.g.traverse(o => { if ((o as THREE.Mesh).isMesh) out.push(o.getWorldPosition(new THREE.Vector3())); }); return out; };
    const moved: number[] = [], lit: number[] = [];
    let was = at(), light = 0;
    const frame = () => {
      step(s, noInput());
      now += 1000 / 60;
      eye.position.set(b.x, b.y + 1.6, b.z); eye.lookAt(m.x, m.y + 0.5, m.z);
      cv.update(0.5, eye);
      const p = at(), l = (S.mat.uniforms.uLight.value as THREE.Vector3).x;
      moved.push(Math.max(...p.map((v, i) => v.distanceTo(was[i])))); lit.push(Math.abs(l - light));
      was = p; light = l;
    };
    for (let k = 0; k < 60; k++) frame();
    act();
    const k0 = moved.length;
    for (let k = 0; k < 60; k++) frame();
    return { moved, lit, k0 };
  };
  /** on the frame it went loose, no part of it moved more than standing would; through the blend into its points
   *  (rig.ts, BLEND), none jumped; and its light came down to where the middle of one lying is (castView.ts, LIFT) over
   *  the blend too, not in a frame */
  const smooth = (r: ReturnType<typeof watch>, what: string) => {
    expect(r.moved[r.k0], `${what}: the frame it went loose`).toBeLessThan(0.1);
    expect(Math.max(...r.moved.slice(r.k0, r.k0 + 20)), `${what}: going loose`).toBeLessThan(0.5);
    expect(Math.max(...r.lit.slice(1)), `${what}: its light`).toBeLessThan(0.1);
  };

  it('killed, a body goes loose from where it was drawn: it does not jump, nor come in from the world\'s middle', () => {
    for (const kind of ['husk', 'thresher', 'skitter', 'worm']) {
      const s = arena(), m = stood(s, kind, 8, 0, -6, 0);
      smooth(watch(s, m, () => strike(s, m, PIPE({ x: 0, z: -1 }))), kind);
      expect(m.dead).toBe(true);
    }
  });

  it('knocked down, the same: it goes down from where it stood, struck back on its heels or not', () => {
    const s = arena(), m = stood(s, 'husk', 8, 0, -6, 0);
    smooth(watch(s, m, () => {
      m.stun = 0;
      hitMutant(s, m, { dmg: 10, poise: 500, shove: 1500, dir: { x: 0, z: -1 }, at: { x: m.x, y: m.y + m.body!.h * 0.75, z: m.z + 0.4 }, way: { x: 0, y: -1, z: -0.3 } }, 1);
      expect(m.down).toBeGreaterThan(0);
    }), 'knocked down');
  });

  it('one never drawn standing (a corpse in a save) is laid as it lies at once, with nothing to go loose from', () => {
    const s = arena(), m = stood(s, 'husk', 8, 0, -6);
    killAll(s);
    hold(s, 3);
    vi.spyOn(performance, 'now').mockReturnValue(0);
    onTestFinished(() => { vi.restoreAllMocks(); });
    const cv = new CastView(new THREE.Group(), s, simLighting(s));
    cv.update(1, new THREE.PerspectiveCamera());
    const S = (cv as unknown as { shown: { m: Mutant; M: { hd: THREE.Object3D } }[] }).shown.find(x => x.m === m)!;
    const h = S.M.hd.getWorldPosition(new THREE.Vector3()), p = pt(m, 'head');
    expect(Math.hypot(h.x - p.x, h.y - p.y, h.z - p.z)).toBeLessThan(0.15);
  });
});

it('costs little: sixteen falling at once, and asleep, timed against the arena with nothing in it; forty, walked through', () => {
  /* a step of the whole sim, on average over `secs`, in ms */
  const timed = (s: Sim, secs: number, inp: Partial<Input> = {}) => {
    let all = 0, n = 0;
    for (let t = 0; t < secs; t += STEP) { const t0 = performance.now(); step(s, { ...noInput(), ...inp }); all += performance.now() - t0; n++; }
    return all / n;
  };
  const empty = arena();
  spawn(empty, 'worm', 30, 0, 30); // the level's ways made, as the others have them
  killAll(empty);
  timed(empty, 0.5);
  const base = timed(empty, 1);
  const s = arena(), cast: Mutant[] = [];
  for (let k = 0; k < RAG.budget; k++) cast.push(stood(s, ['husk', 'thresher', 'skitter', 'worm'][k % 4], -0.5 + (k % 4) * 3.5, 0, -6 - Math.floor(k / 4) * 3));
  for (const m of cast) strike(s, m, AXE({ x: 1, z: 0 }));
  const falling = timed(s, 0.5), settling = timed(s, 0.5);
  hold(s, 8);
  const asleep = timed(s, 1);
  expect(cast.every(m => !m.rag!.awake)).toBe(true);
  /* forty husks, killed together in a heap 5 m across, then walked through */
  const t = arena(), heap: Mutant[] = [];
  for (let k = 0; k < 40; k++) heap.push(stood(t, 'husk', 5.5 + (k % 8) * 0.7, 0, -12 + Math.floor(k / 8) * 0.9));
  for (const m of heap) strike(t, m, AXE({ x: 0.3, z: 1 }), 1);
  const forty = timed(t, 0.5), most = Math.max(...Array.from({ length: 1 }, () => heap.filter(m => m.rag!.awake).length));
  hold(t, 2);
  const capped = heap.filter(m => m.rag!.awake).length;
  hold(t, 8);
  const b = t.player.body;
  b.x = 8; b.z = -14; b.sync(); t.player.yaw = Math.PI;
  const walking = timed(t, 2, { forward: 1 });
  console.log(`a step: the arena alone ${base.toFixed(3)} ms; 16 corpses falling ${falling.toFixed(3)} ms (${((falling - base) / 16 * 1000).toFixed(0)} µs a corpse), ` +
    `settling ${settling.toFixed(3)} ms, all asleep ${asleep.toFixed(3)} ms; 40 falling in a heap ${forty.toFixed(3)} ms (${most} awake), ` +
    `${capped} awake 2 s on; walking through the heap ${walking.toFixed(3)} ms`);
  expect(falling - base).toBeLessThan(4);
  expect(asleep - base).toBeLessThan(0.3);
  expect(capped).toBeLessThanOrEqual(RAG.budget);
  expect(walking).toBeLessThan(4);
});
