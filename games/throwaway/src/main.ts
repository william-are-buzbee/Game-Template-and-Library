// main.ts — wires the game together: keys → the sim, one fixed step at a time → the view, every frame.
// `?dev` shows the frame rate and puts the state on `window.game` for poking at from the console.
import { Keys } from './present/keys';
import { View } from './present/view';
import { newState, type State } from './sim/state';
import { STEP, step } from './sim/step';

const dev = new URLSearchParams(location.search).has('dev');
const hud = document.getElementById('hud')!;
const view = new View(document.body);
const keys = new Keys();

let state: State = newState();
let prev: State = structuredClone(state);
/** never catch up more than this many steps in one frame (a stalled tab, a debugger pause) */
const MAX_STEPS = 8;
let acc = 0;
let last = performance.now();
let frames = 0;
let fpsAt = last;

if (dev) Object.assign(window, { game: { get state() { return state; }, set state(s: State) { state = s; prev = structuredClone(s); } } });

function frame(now: number): void {
  requestAnimationFrame(frame);
  acc += Math.min(0.25, Math.max(0, (now - last) / 1000));
  last = now;
  let n = Math.floor(acc / STEP + 1e-9);
  if (n > MAX_STEPS) {
    n = MAX_STEPS;
    acc = 0;
  } else acc -= n * STEP;
  for (let i = 0; i < n; i++) {
    if (i === n - 1) prev = structuredClone(state);
    step(state, keys.take());
  }
  view.draw(prev, state, acc / STEP);

  frames++;
  if (dev && now - fpsAt >= 500) {
    const p = state.player;
    hud.textContent = `${Math.round((frames * 1000) / (now - fpsAt))} fps\nx ${p.x.toFixed(1)}  z ${p.z.toFixed(1)}  t ${state.t.toFixed(1)}s`;
    frames = 0;
    fpsAt = now;
  }
}
requestAnimationFrame(frame);
