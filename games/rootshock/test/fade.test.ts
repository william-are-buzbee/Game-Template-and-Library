import * as THREE from 'three';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { testbed } from '../src/content/levels/testbed';
import { blowAt, blowKind, hitMutant, spawn, type Blow, type Mutant } from '../src/sim/cast';
import { noInput } from '../src/sim/input';
import { makeSim, simLighting, step, type Sim } from '../src/sim/sim';
import { ANIM, BUILD, CastView, type Ctx } from '../src/present/render/castView';

/* The living, drawn without a jump (render/fade.ts): where what an animation switches on changes, the model is taken
   over to the new pose, not put there in a frame; between switches it is drawn as its animation has it. */

type Shown = { m: Mutant; M: { g: THREE.Group; arms: THREE.Object3D[] } };

/** one of the cast put down in the arena after you, and drawn a frame a step, halfway through it: you stepping from
 *  one end to the other every two seconds (so it walks, stops, swings), and struck every second and a half (so it
 *  flinches, reels, has its swing cut short). `each` is shown it after every frame */
function fight(kind: string, secs: number, each: (s: Sim, m: Mutant, S: Shown) => void): void {
  /* none of the living's twitches (castView.ts, twitch): they come at random (each held to going out and back: below) */
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  let now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  onTestFinished(() => { vi.restoreAllMocks(); });
  const s = makeSim(testbed(), { seed: 3 }), b = s.player.body;
  s.game.god = true;
  const at = (z: number) => { b.x = 8; b.z = z; b.y = 0; b.sync(); s.player.yaw = 0; };
  at(-3);
  const m = spawn(s, kind, 8, 0, -9)!, cv = new CastView(new THREE.Group(), s, simLighting(s));
  const S = (cv as unknown as { shown: Shown[] }).shown.find(x => x.m === m)!;
  const eye = new THREE.PerspectiveCamera(72, 16 / 9, 0.06, 140);
  for (let k = 0; k < secs * 60; k++) {
    if (k % 120 === 0) at(k % 240 ? -3 : -15);
    if (k % 90 === 45 && m.down === 0) hitMutant(s, m, { dmg: 1, poise: 8 + (k % 4) * 4, shove: 60, dir: { x: 0, z: -1 }, at: { x: m.x, y: m.y + 1, z: m.z + 0.3 } }, 1);
    step(s, noInput());
    now += 1000 / 60;
    eye.position.set(b.x, b.y + 1.6, b.z); eye.lookAt(m.x, m.y + 0.5, m.z);
    cv.update(0.5, eye);
    each(s, m, S);
  }
}

describe('the living, drawn', () => {
  it('do not jump where their animations switch: walking, stopping, a swing begun or cut short, thrown back on its heels', () => {
    /* the most a part may move in a frame, in the model's own frame (walking across the floor not counted): a husk's
       arm swung down, or given back after its pose jumped, comes to 0.3 m; a thresher's arms flail half a metre a
       frame winding up, as they always have. Each jumped up to 2 m in a frame before (its arm thrown from overhead to
       its side, the step of a walk begun at a pace not the one it stood at) */
    for (const [kind, most] of [['husk', 0.45], ['thresher', 0.65]] as const) {
      const v = new THREE.Vector3(), seen = new Set<string>();
      let was: THREE.Vector3[] | null = null, tilt = 0, worst = 0, rocked = 0;
      fight(kind, 12, (_s, m, S) => {
        const g = S.M.g, p: THREE.Vector3[] = [];
        g.traverse(o => { if ((o as THREE.Mesh).isMesh) p.push(g.worldToLocal(o.getWorldPosition(v.set(0, 0, 0))).clone()); });
        if (was && !m.rag) { worst = Math.max(worst, ...p.map((q, i) => q.distanceTo(was![i]))); rocked = Math.max(rocked, Math.abs(g.rotation.x - tilt)); }
        was = p; tilt = g.rotation.x;
        seen.add(m.mv > 0 ? 'walking' : 'stood').add(blowAt(m)?.ph ?? 'no blow');
        if (m.reel > 0) seen.add('reeling');
      });
      for (const what of ['walking', 'stood', ...(kind === 'husk' ? ['wind', 'strike', 'reeling'] : [])]) expect(seen.has(what), `${kind}: ${what}`).toBe(true);
      expect(worst, kind).toBeLessThan(most);
      /* struck, rocked back on its heels over a few frames, not in one (it was 0.23 rad in a frame) */
      expect(rocked, kind).toBeLessThan(0.1);
    }
  });

  it('as its animation has it, less only what it jumped by: a husk\'s swing comes down when the sim has it come down', () => {
    let n = 0, worst = 0;
    fight('husk', 6, (_s, m, S) => {
      const B = blowAt(m);
      if (B?.ph !== 'strike' || m.reel > 0) return;
      /* castView.ts, ANIM.husk: the arm from overhead (-2.75) to low (-0.15) in a ninth of a second, faster as it goes.
         Its lunge sets it walking as it swings, a switch, and the arm is not held back for it: it was coming down
         either way. All it may be off by is the shake at the top of the wind-up (0.05 at most), given back */
      worst = Math.max(worst, Math.abs(S.M.arms[1].rotation.x - (-2.75 + 2.6 * B.q * B.q)));
      n++;
    });
    expect(n).toBeGreaterThan(3);
    expect(worst).toBeLessThan(0.05);
  });
});

describe('each animation, what it switches on held', () => {
  /* run as the page would run it, a frame every half millisecond, with what it switches on (castView.ts, SWITCHES) held
     as it is or going as it goes (a blow through its wind-up, strike and recovery; reeling running out): no part turns
     0.03 rad or moves 1.5 cm from one to the next. Nothing is that fast: a husk's arm coming down, the fastest thing any
     of them does, turns 0.022 rad in half a millisecond at the last. What does is a jump, which fade.ts cannot see
     (nothing it switches on changed), and draws as it is. Their twitches too: made to come every few tenths of a second
     here (Math.random), each must go out and back, not be there in a frame. Each run from two places in its cycles (m.ph),
     so a jump is not missed for falling where a tremble happened to be near nothing */
  const DT = 0.0005, TURN = 0.03, MOVE = 0.015, SECS = 1.5;
  /** a blow `t` s after it began: wound up, struck, then recovering from one that landed, and held at the end of that */
  const swing = (m: Mutant, t: number): Blow => {
    const K = blowKind(m)!;
    return t < K.wind ? { ph: 'wind', t, hit: false } : t < K.wind + K.strike ? { ph: 'strike', t: t - K.wind, hit: false }
      : { ph: 'after', t: Math.min(K.rec, t - K.wind - K.strike), hit: true };
  };
  type Case = [string, (m: Mutant, t: number) => void];
  const walking = (state: string): Case[1] => m => { m.state = state; m.mv = 1.5; };
  const still = (state: string): Case[1] => m => { m.state = state; };
  const husk: Case[] = [
    ['stood', still('idle')], ['walking', walking('idle')], ['hunting', walking('hunt')], ['stood hunting', still('hunt')], ['fleeing', walking('flee')],
    ['swinging', (m, t) => { m.state = 'hunt'; m.blow = swing(m, t); }], ['reeling', (m, t) => { m.state = 'hunt'; m.reel = Math.max(0.001, 0.9 - t); }],
  ];
  const CASES: [kind: string, opts: Record<string, unknown>, cases: Case[]][] = [
    ['husk', {}, husk],
    ['nightround', {}, [...husk, ['grafting', m => { m.state = 'graft'; m.graft = 5; m.wx = m.x + 0.8; m.wz = m.z; }], ['dragging', m => { walking('round')(m, 0); m.drag = 0; }]]],
    ['patient', {}, [['at its window', still('wait')], ['walking', walking('wait')], ['banging', (m, t) => { m.state = 'bang'; m.wt = Math.max(0.001, 0.95 - t); }],
      ['pointing', still('warn')], ['hiding', still('hide')], ['going to hide', walking('hide')]]],
    ['skitter', {}, [['stood', still('idle')], ['hunting', walking('hunt')], ['swinging', (m, t) => { walking('hunt')(m, t); m.blow = swing(m, t); }]]],
    ['skitter', { big: 1 }, [['swinging', (m, t) => { m.state = 'hunt'; m.blow = swing(m, t); }]]],
    ['thresher', {}, [['stood', still('idle')], ['walking', walking('patrol')], ['charging', walking('charge')], ['winding up', still('wind')], ['recovering', still('recover')],
      ['swinging', (m, t) => { m.state = 'pursue'; m.blow = swing(m, t); }]]],
    ['worm', {}, [['stood', still('idle')], ['walking', walking('idle')], ['swinging', (m, t) => { m.state = 'hunt'; m.blow = swing(m, t); }]]],
    ['grabber', {}, [['hanging', still('idle')], ['tensing', (m, t) => { m.tense = Math.min(0.8, t); }], ['gripping', m => { m.grab = 1; }]]],
    ['bloat', {}, [['sat', still('idle')]]],
  ];

  it('no part of any of them jumps', () => {
    let n = 0, hot = false;
    vi.spyOn(Math, 'random').mockImplementation(() => { if (hot) { hot = false; return 0.95; } if (++n % 300 === 0) { hot = true; return 0; } return 0.5; });
    onTestFinished(() => { vi.restoreAllMocks(); });
    const s = makeSim(testbed(), { seed: 3 }), L = simLighting(s), q = new THREE.Quaternion(), jumps: string[] = [];
    for (const [kind, opts, cases] of CASES) for (const [what, set] of cases) for (const ph of [3, 4.37]) {
      const m = spawn(s, kind, 8, 0, -9, opts)!, M = BUILD[m.model](new THREE.MeshBasicMaterial(), m), A = ANIM[m.model] ?? ANIM[m.ai];
      const parts: THREE.Object3D[] = [];
      M.g.traverse(o => { parts.push(o); });
      const c: Ctx = { sim: s, dt: DT, L, frame: 0 }, base = { ...m };
      let was: { q: THREE.Quaternion; p: THREE.Vector3 }[] | null = null, turned = 0, moved = 0, where = '';
      for (let t = 0; t < SECS; t += DT) {
        Object.assign(m, base, { ph: ph + t, mv: 0, blow: null, reel: 0, graft: 0, drag: -1, grab: 0, tense: 0 });
        set(m, t);
        c.frame++;
        M.g.position.set(0, 0, 0);
        A(m, M, c);
        const now = parts.map(o => ({ q: o.quaternion.clone(), p: o.position.clone() }));
        if (was) now.forEach((P, i) => {
          const a = 2 * Math.acos(Math.min(1, Math.abs(q.copy(P.q).dot(was![i].q)))), d = P.p.distanceTo(was![i].p);
          if (a > turned) { turned = a; if (a > TURN) where = `part ${i} at ${t.toFixed(4)} s`; }
          if (d > moved) { moved = d; if (d > MOVE) where = `part ${i} at ${t.toFixed(4)} s`; }
        });
        was = now;
      }
      if (turned > TURN || moved > MOVE) jumps.push(`${kind}${opts.big ? ' (big)' : ''} ${what} (from ${ph}): turned ${turned.toFixed(3)} rad, moved ${moved.toFixed(3)} m (${where})`);
    }
    expect(jumps).toEqual([]);
  });
});
