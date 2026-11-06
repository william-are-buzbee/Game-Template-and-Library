// main.ts — wires the game together: keys → the sim, one fixed step at a time (FixedLoop) → the view, every frame.
//
// ?dev is on in every game from the template: a readout of where each frame goes (Meter), the state on `window.game`
// for poking at from the console, and keys to hold time still — P pauses, . steps once while paused, T slows time
// (×¼, ×1/10, back). Add the game's own dev keys to DEV_KEYS as it grows, so the readout always lists them.
import { FixedLoop, Meter } from '@wb/core';
import { Keys } from './present/keys';
import { View } from './present/view';
import { newState, type State } from './sim/state';
import { step } from './sim/step';

const dev = new URLSearchParams(location.search).has('dev');
const hud = document.getElementById('hud')!;
const view = new View(document.body);
const keys = new Keys();
const loop = new FixedLoop();
const meter = new Meter();

let state: State = newState();
let prev: State = structuredClone(state);
let last = performance.now();

const time = { scale: 1, paused: false, stepOnce: false };
const DEV_KEYS: Record<string, [string, () => void]> = {
  KeyP: ['pause', () => void (time.paused = !time.paused)],
  Period: ['step', () => void (time.stepOnce = time.paused)],
  KeyT: ['slow', () => void (time.scale = time.scale === 1 ? 0.25 : time.scale === 0.25 ? 0.1 : 1)],
};
if (dev) {
  addEventListener('keydown', e => DEV_KEYS[e.code]?.[1]());
  Object.assign(window, { game: { get state() { return state; }, set state(s: State) { state = s; prev = structuredClone(s); }, time } });
}

function frame(now: number): void {
  requestAnimationFrame(frame);
  const dt = Math.min(0.25, Math.max(0, (now - last) / 1000));
  last = now;
  const t0 = performance.now();
  const n = time.paused ? (time.stepOnce ? 1 : 0) : loop.advance(dt * time.scale);
  time.stepOnce = false;
  for (let i = 0; i < n; i++) {
    if (i === n - 1) prev = structuredClone(state);
    step(state, keys.take());
  }
  const t1 = performance.now();
  view.draw(prev, state, time.paused ? 1 : loop.alpha);
  const t2 = performance.now();

  meter.add('frame', t2 - t0);
  meter.add('sim', t1 - t0);
  meter.add('draw', t2 - t1);
  meter.add('steps', n);
  meter.add('dt', dt * 1000);
  meter.end(dt);
  if (dev) {
    const p = state.player;
    const ms = meter.shown.get('dt')?.mean;
    const keysLine = Object.entries(DEV_KEYS).map(([code, [what]]) => `${code.replace(/^Key/, '').replace('Period', '.')} ${what}`).join('  ');
    hud.textContent =
      `${ms ? Math.round(1000 / ms) : '-'} fps  ms ${meter.line(['frame', 'sim', 'draw'])}  (${meter.line(['steps'], 1)} a frame)\n` +
      `x ${p.x.toFixed(1)}  z ${p.z.toFixed(1)}  t ${state.t.toFixed(1)}s${time.paused ? '  PAUSED' : ''}${time.scale < 1 ? `  time ×${time.scale}` : ''}\n` +
      keysLine;
  }
}
requestAnimationFrame(frame);
