import { FixedLoop } from './core/loop';
import { bench } from './content/levels/bench';
import { testbed } from './content/levels/testbed';
import { STATION } from './content/station';
import { Lighting } from './world/light';
import { applyCommands, looseLights, makeSim, simLighting, type Sim } from './sim/sim';
import { killAll, spawn, stutters } from './sim/cast';
import { give } from './sim/game';
import { Beams } from './present/render/beams';
import { levelDef, loadRun, makeRun, saveRun, soloRun, stepRun, type Run } from './sim/run';
import { save } from './sim/save';
import { checkProgress, describe, type CheckOpts } from './sim/progress';
import { readStore, writeStore } from './present/store';
import { CameraRig, type Prev } from './present/camera';
import { Controls } from './present/controls';
import { Audio } from './present/audio';
import { Soundscape } from './present/soundscape';
import { View } from './present/render/view';
import { LevelView } from './present/render/levelView';
import { HandsView } from './present/render/handsView';
import { SelfView } from './present/render/selfView';
import { Motes } from './present/render/motes';
import { Prints } from './present/render/prints';
import { Drips } from './present/render/drips';
import { Cascade } from './present/cascade';
import { U, setDetail } from './present/render/shader';
import { Hud } from './present/ui/hud';
import { Panels } from './present/ui/panels';
import { Carried } from './present/ui/carried';
import { Feed } from './present/ui/feed';
import { Meter } from './present/perf';
import { Governor } from './present/quality';
import { Touch } from './present/touch';
import { ITEMS } from './content/items';

/* Boot: content -> world -> sim, and the page around it. The frame runs whole sim steps for the time that passed, then draws
   between the last two. The sim reports what happened as events (messages, sounds, a note to show, the power changing,
   another level); the menus send what the player chose back as commands. A run holds every level you have been to;
   each is drawn as its own group, kept once made. */

const params = new URLSearchParams(location.search);
const DEV = params.has('dev');
/** ?fps: the frame rate and the share of the screen drawn, in the corner, without the rest of the dev readout */
const FPS = params.has('fps');
/** a phone or a tablet: touch controls (present/touch.ts), and what the page says is said for them */
const TOUCH = matchMedia('(pointer: coarse)').matches;
if (TOUCH) document.body.classList.add('touch');

/* how much of the screen's resolution is drawn (present/quality.ts): where it settled last time on this device, or for a
   phone, part way down to begin with */
const SCALE_KEY = 'rootshock-v2:scale', stepped = readStore(SCALE_KEY);
const governor = new Governor(stepped !== null ? Number(stepped) : TOUCH ? 2 : 0);

const canvas = document.getElementById('c') as HTMLCanvasElement;
const hud = new Hud();
let view: View;
try {
  view = new View(canvas, governor.scale);
} catch {
  document.querySelector('#title nav')!.textContent = 'This browser could not start WebGL.';
  throw new Error('no WebGL');
}

/* which level: the station's start by default; ?level=<id> for another, the bench for the bush's growth (bench), or the
   test bed. ?power=full: everything on. */
const want = params.get('level') ?? STATION.start;
const inStation = STATION.levels.some(l => l.id === want);
if (inStation && params.get('power') === 'full') { STATION.main = true; for (const c of Object.values(STATION.circuits)) { c.on = true; c.broken = false; } }
/* a run left part way (paused, tab hidden, page closed) goes on from where it was; going on uses the save up, so a
   death is still a death. Dev pages and the test bed do not save. (The key keeps the name it had when this was v2, so
   a run in progress survives the move to the site's root.) */
const SAVE_KEY = 'rootshock-v2:run', saving = !DEV && inStation && !params.has('level');
const stored = saving ? readStore(SAVE_KEY) : null;
let resumed: Run | null = null;
if (stored) try { resumed = loadRun(STATION, JSON.parse(stored)); } catch { writeStore(SAVE_KEY, null); }
/* a new game begins with the opening (sim/opening.ts); ?level= (the station's first level too) starts as it leaves things */
const opening = !params.has('level') && params.get('power') !== 'full';
function newRun(): Run {
  const seed = (Math.random() * 2 ** 32) >>> 0;
  return inStation ? makeRun(STATION, { seed, start: want, opening }) : soloRun(makeSim(want === 'bench' ? bench() : testbed(), { seed }));
}
/* The title's shot. A run kept is shown where you left it. With none, the station as you have not seen it: the lobby lit
   end to end, or the cargo bay dark, from its floor by the door in from Security, where the link's red emergency light
   spills (one or the other each visit; ?shot=lobby or ?shot=cargo for one). A level made for the look of it only, the
   power set for the shot and you stood where the camera is; New game makes the real one. The lobby from the head of the
   grand stair, the statue under the false sky; the bay low, crouched by the door, toward the nest's red glow on the floor */
const SHOTS: Record<string, { x: number; z: number; y: number; yaw: number; pitch: number; crouch?: boolean; power?: (s: NonNullable<Sim['game']['station']>) => void }> = {
  lobby: { x: 11, z: -5, y: 5, yaw: 0, pitch: -0.16, power: s => { s.main = true; Object.assign(s.circuits.SEC, { broken: false, on: true }); } },
  cargo: { x: 114.5, z: 2, y: 0, yaw: -2.25, pitch: 0.06, crouch: true },
};
function shotRun(): Run {
  const ask = params.get('shot'), S = SHOTS[ask && ask in SHOTS ? ask : Math.random() < 0.5 ? 'lobby' : 'cargo'];
  const level = levelDef(STATION, STATION.start), sim = makeSim(level, { seed: 1, station: STATION }), p = sim.player, b = p.body;
  S.power?.(sim.game.station!);
  b.x = S.x; b.z = S.z; b.y = sim.world.groundBelow({ x: S.x, z: S.z, hx: b.r, hz: b.r, round: true }, S.y + 1); b.sync();
  p.yaw = S.yaw; p.pitch = S.pitch; p.crouch = !!S.crouch;
  sim.game.events.length = 0;
  return { station: STATION, sims: new Map([[level.id, sim]]), here: sim };
}
/** the run in the page is only the title's shot */
let shot = !resumed && inStation && opening;
let run: Run = resumed ?? (shot ? shotRun() : newRun());
let sim: Sim = run.here;
let mode: 'title' | 'play' | 'pause' | 'panel' | 'end' = 'title';
/** the run in the page has been played (or was saved): the title offers to go on with it */
let begun = !!resumed;
function suspend(): void {
  if (saving && sim.tick > 0 && !sim.game.ended && mode !== 'title' && mode !== 'end') writeStore(SAVE_KEY, JSON.stringify(saveRun(run)));
}
hud.entry('title', 'continue', begun);
/* the ways round the game for working on it: the test bed, the power on, the first engine */
if (DEV) document.querySelector('#title .dev')!.classList.remove('hide');
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  /* (with a mouse, losing the capture has paused it already) */
  if (TOUCH && mode === 'play') setMode('pause');
  suspend();
});
window.addEventListener('pagehide', suspend);

/* each level drawn once, and lit by the power as it is when you are there */
const lightingNow = () => (sim.lighting ??= simLighting(sim));
let lighting = lightingNow();
const levels = new Map<Sim, LevelView>();
function levelView(): LevelView {
  let lv = levels.get(sim);
  if (!lv) levels.set(sim, (lv = new LevelView(sim, lighting, DEV)));
  else lv.relight(lighting);
  return lv;
}
let here = levelView();
view.show(here.group);
here.bind();
view.scene.add(view.camera); // the hand rides on it
/* where everything is, worked out once a frame (below, before the first pass), not again by each pass: the scene is
   a couple of thousand things, most of them the parts of the cast */
view.scene.matrixWorldAutoUpdate = false;
const handsView = new HandsView(view.camera, sim, lighting);
const selfView = new SelfView(view.scene, sim, lighting);
let hurtFx = 0, hitFx = 0;
const hitDir = document.getElementById('hitdir')!;

const rig = new CameraRig();
const feed = new Feed(canvas);
const beams = new Beams();
const prints = new Prints(view.scene, lighting);
const drips = new Drips(view.scene, lighting, (x, y, z, water) => scape.dripAt(sim, x, y, z, water));
const motes = new Motes(view.scene, lighting, (x, y, z, k) => scape.gust(sim, x, y, z, k));
const loop = new FixedLoop();
const audio = new Audio();
const scape = new Soundscape(audio);
const prev: Prev = { x: 0, y: 0, z: 0 };
const fade = document.getElementById('fade')!;

const controls = new Controls(canvas, () => { if (mode === 'play') setMode('pause'); });
/** a menu that stops the game was opened over what you carry (a paper read from it): put away, it comes back */
let carrying = false;
const panels = new Panels(c => sim.game.commands.push(c), () => {
  if (mode !== 'panel') return;
  setMode('play');
  if (carrying) { carrying = false; inventory(true); } else controls.lock();
});
const carried = new Carried(c => sim.game.commands.push(c), () => sim.game);
panels.touch = TOUCH;
const touch = TOUCH ? new Touch(controls, {
  carry: () => { if (mode === 'play') inventory(!carried.open); },
  pause: () => { if (mode === 'play') setMode('pause'); },
}) : null;
/* on a phone the game is the whole screen, on its side; leaving that (the back gesture) pauses it */
function fullScreen(): void {
  if (!TOUCH || document.fullscreenElement || !document.documentElement.requestFullscreen) return;
  document.documentElement.requestFullscreen({ navigationUI: 'hide' })
    .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape'))
    .catch(() => {});
}
document.addEventListener('fullscreenchange', () => { if (TOUCH && !document.fullscreenElement && mode === 'play') setMode('pause'); });
/* ?dev keys, as the first engine had them: V fly, G god, B bright; O for the collider overlay; P for the tracker. And for
   working on the fight (engine.md §6, F4; the arena is in the test bed, north of the hall): 1 to 5 put one of the cast
   down in front of you, awake and after you (a husk, a skitter, a thresher, a worm, a big skitter), 0 kills
   them all (and, with none left alive, takes the dead away); T slows time (a quarter, a tenth, and back); Y changes what is in your hand; H puts you right (whole,
   standing, your poise back); U holds the cast still, or lets them go. The readout shows how you stand and the last
   few blows, in numbers. */
const devFlags = { bright: false, track: false, slow: 1, frozen: false };
const hitLog: string[] = [];
const SPAWN: [string, Record<string, unknown>][] = [['husk', {}], ['skitter', {}], ['thresher', {}], ['worm', {}], ['skitter', { big: 1 }], ['changed', {}], ['bonemid', {}], ['plantold', {}]];
const ARMS: (string | null)[] = [null, 'baton', 'pipe', 'wrench', 'axe', 'knife'];
if (DEV) {
  SPAWN.forEach(([type, opts], i) => controls.onKey.set('Digit' + (i + 1), () => {
    if (mode !== 'play') return;
    const b = sim.player.body, x = b.x - Math.sin(sim.player.yaw) * 3.5, z = b.z - Math.cos(sim.player.yaw) * 3.5;
    const y = sim.world.groundBelow({ x, z, hx: 0.3, hz: 0.3, round: true }, b.y + 1.5);
    const m = spawn(sim, type, x, y, z, opts);
    if (m && devFlags.frozen) m.stun = 1e9;
  }));
  controls.onKey.set('Digit0', () => killAll(sim));
  controls.onKey.set('KeyT', () => { devFlags.slow = devFlags.slow === 1 ? 0.25 : devFlags.slow === 0.25 ? 0.1 : 1; });
  controls.onKey.set('KeyY', () => {
    const g = sim.game, next = ARMS[(ARMS.indexOf(g.weapon) + 1) % ARMS.length];
    if (next && !g.inv.some(s => s.id === next)) give(g, next);
    g.weapon = next;
  });
  controls.onKey.set('KeyH', () => { const h = sim.hands; sim.game.hp = 100; h.poise = 30; h.stag = h.down = h.rise = 0; });
  controls.onKey.set('KeyU', () => { devFlags.frozen = !devFlags.frozen; for (const m of sim.cast) m.stun = devFlags.frozen ? 1e9 : 0; });
  controls.onKey.set('KeyV', () => { sim.player.fly = !sim.player.fly; });
  controls.onKey.set('KeyG', () => { sim.game.god = !sim.game.god; });
  controls.onKey.set('KeyB', () => { devFlags.bright = !devFlags.bright; U.uBright.value = devFlags.bright ? 0.55 : 0; });
  controls.onKey.set('KeyO', () => here.overlay?.toggle());
  controls.onKey.set('KeyP', () => { devFlags.track = !devFlags.track; tracked = ''; });
}

/* the tracker (?dev, P): the progression checker on where you stand, run again whenever what it depends on changes (what
   you hold, wear and know, the power, the room you are in) and every half second while you are under water, so you see
   your breath's reach shrink. A level on the far side of a dive is looked at as it stands, or fresh if not yet visited. */
let tracked = '', trackT = 0;
const previews = new Map<string, Sim>();
function track(dt: number): void {
  if (!devFlags.track || !inStation) { hud.track(null); return; }
  const g = sim.game, b = sim.player.body, R = sim.world.roomAt(b.x, b.y + 0.5, b.z);
  const sig = JSON.stringify([sim.world.def.id, R?.id, g.inv, g.worn, g.keys, g.read, g.station, sim.doors.map(d => d.unlocked), sim.items.map(i => i.taken)]);
  trackT -= dt;
  if (sig === tracked && !(sim.player.under && trackT <= 0)) return;
  tracked = sig; trackT = 0.5;
  const far = (id: string) => run.sims.get(id) ?? previews.get(id) ?? (previews.set(id, makeSim(levelDef(STATION, id), { station: STATION, seed: 1 })), previews.get(id)!);
  try { hud.track(describe(checkProgress(sim, { through: far }))); } catch (e) { hud.track('The tracker cannot say: ' + (e as Error).message); }
}

function setMode(m: typeof mode): void {
  if (m === 'pause') suspend();
  if (m !== 'play' && carried.open) { carrying = m === 'panel'; carried.show(false); controls.free = false; }
  mode = m;
  controls.enabled = m === 'play';
  hud.show('title', m === 'title');
  hud.show('pause', m === 'pause');
  hud.show('settings', false);
  hud.show('hud', m !== 'title');
  touch?.show(m === 'play');
  document.body.classList.toggle('playing', m === 'play');
}
function openPanel(fn: () => void): void {
  setMode('panel');
  fn();
}
/* what you carry (present/ui/carried.ts): up over the game, which goes on. With a mouse the pointer comes out of looking
   to work it (you still walk), and goes back in when it is put away: Tab is a key pressed, so the capture may be asked
   for then. By touch it is only shown, the stick and the buttons as they were. */
function inventory(on: boolean): void {
  if (carried.open === on) return;
  carried.show(on);
  controls.free = on && !TOUCH;
  if (TOUCH) return;
  if (on) { if (document.pointerLockElement) document.exitPointerLock(); }
  else controls.lock();
}

/* brightness: the player's own setting, kept between runs. It is on the screen only: the cast and the cameras see by the
   light as it is */
const BRIGHT_KEY = 'rootshock-v2:bright', brightIn = [...document.querySelectorAll<HTMLInputElement>('input.brightness')];
let gain = Number(readStore(BRIGHT_KEY)) || 1;
for (const el of brightIn) {
  el.value = String(gain);
  el.addEventListener('input', () => {
    gain = Number(el.value);
    writeStore(BRIGHT_KEY, String(gain));
    for (const o of brightIn) o.value = el.value;
  });
}

/* look speed, played by touch: the player's own, kept between runs */
const LOOK_KEY = 'rootshock-v2:look', lookIn = [...document.querySelectorAll<HTMLInputElement>('input.lookspeed')];
if (touch) touch.speed = Number(readStore(LOOK_KEY)) || 1;
for (const el of lookIn) {
  el.value = String(touch?.speed ?? 1);
  el.addEventListener('input', () => {
    if (touch) touch.speed = Number(el.value);
    writeStore(LOOK_KEY, el.value);
    for (const o of lookIn) o.value = el.value;
  });
}

/* which side a swing is sent from by A and D (or the stick): from that side, or swapped, the way you step (sim/combat.ts,
   wayOf). The player's own, kept between runs; the controls shown say which */
const SWAP_KEY = 'rootshock-v2:swap', swapIn = [...document.querySelectorAll<HTMLInputElement>('input.swap')];
function swapSides(on: boolean): void {
  controls.swap = on;
  for (const o of swapIn) o.checked = on;
  for (const el of document.querySelectorAll<HTMLElement>('.keysonly .sides')) el.textContent = on ? 'from the right, the left' : 'from the left, the right';
  for (const el of document.querySelectorAll<HTMLElement>('.touchonly .sides')) el.textContent = on ? 'from the other side' : 'from that side';
}
for (const el of swapIn) el.addEventListener('change', () => { swapSides(el.checked); writeStore(SWAP_KEY, el.checked ? 'on' : null); });
swapSides(readStore(SWAP_KEY) === 'on');

/* surface detail: what walls, floors and ceilings are made of, drawn on them and heard from them (footsteps, crates,
   blows), and the services under bare ceilings; the player's to turn off (title and pause screens, kept between runs; ?detail=off for one visit; ?dev, M), for the
   station as it looked before. Looks only. */
const DETAIL_KEY = 'rootshock-v2:detail', detailIn = [...document.querySelectorAll<HTMLInputElement>('input.detail')];
let detail = params.get('detail') ? params.get('detail') !== 'off' : readStore(DETAIL_KEY) !== 'off';
function showDetail(on: boolean, keep: boolean): void {
  detail = on;
  setDetail(on);
  scape.materials = on;
  for (const lv of levels.values()) lv.showDetail(on);
  for (const o of detailIn) o.checked = on;
  if (keep) writeStore(DETAIL_KEY, on ? 'on' : 'off');
}
for (const el of detailIn) {
  el.addEventListener('change', () => showDetail(el.checked, true));
}
showDetail(detail, false);
if (DEV) controls.onKey.set('KeyM', () => showDetail(!detail, false));

/* the menus. Settings opens over the title or the pause, and goes back to it */
function settings(on: boolean): void {
  hud.show('settings', on);
  hud.show(mode === 'title' ? 'title' : 'pause', !on);
}
function play(): void {
  (document.activeElement as HTMLElement | null)?.blur(); // a key in play is not a press of the menu's button
  audio.start();
  setMode('play');
  controls.lock();
  fullScreen();
}
hud.onMenu('title', go => {
  if (go === 'settings') { settings(true); return; }
  if (go === 'new' && (begun || shot)) fresh();
  writeStore(SAVE_KEY, null); // going on uses the save up, so a death is still a death
  begun = true;
  play();
});
/* Quit: to the title, the run kept (pausing saved it) */
hud.onMenu('pause', go => {
  if (go === 'settings') settings(true);
  else if (go === 'quit') { setMode('title'); hud.entry('title', 'continue', true); }
  else play();
});
hud.onMenu('settings', go => { if (go === 'back') settings(false); });
document.getElementById('end')!.addEventListener('click', () => location.reload());

/** a new game over one in the page: the run made again, and what was drawn for the old one let go */
function fresh(): void {
  writeStore(SAVE_KEY, null);
  for (const lv of levels.values()) lv.dispose();
  levels.clear();
  previews.clear();
  hitLog.length = 0;
  tracked = '';
  shot = false;
  run = newRun();
  arrive();
}

/* keys the menus handle: Tab for what you carry (Esc there pauses), Esc and E to step back, digits on a keypad, R to start
   again */
window.addEventListener('keydown', e => {
  if (e.repeat) return;
  const c = e.code;
  if (mode === 'play' && (c === 'Tab' || c === 'KeyI')) { inventory(!carried.open); return; }
  if (mode === 'play' && carried.open && c === 'Escape') { setMode('pause'); return; }
  if (mode === 'end' && c === 'KeyR') { location.reload(); return; }
  if (c === 'Escape' && !document.getElementById('settings')!.classList.contains('hide')) { settings(false); return; }
  if (mode !== 'panel') return;
  const open = panels.open;
  if (open === 'pad') {
    const m = /^(?:Digit|Numpad)(\d)$/.exec(c);
    if (m) sim.game.commands.push({ type: 'pad', key: m[1] });
    else if (c === 'Backspace') sim.game.commands.push({ type: 'pad', key: 'C' });
    else if (c === 'Escape' || c === 'Tab') panels.close();
  } else if (c === 'Escape' || c === 'Tab' || c === 'KeyI' || c === 'KeyE' || (c === 'Space' && open === 'note')) panels.close();
});

/** the dev readout's lines for the fight: how you stand, the keys, and the last few blows */
function fightLine(): string {
  const h = sim.hands, g = sim.game, b = sim.player.body, state = h.down > 0 ? 'down' : h.rise > 0 ? 'getting up' : h.stag > 0 ? 'reeling' : '';
  const you = `you  hp ${Math.max(0, g.hp).toFixed(0)}  poise ${h.poise.toFixed(0)}/30  ${Math.hypot(b.vx, b.vz).toFixed(1)} m/s  ${g.weapon ?? 'fists'}  ${state}${devFlags.slow < 1 ? `  time ×${devFlags.slow}` : ''}${devFlags.frozen ? '  cast held' : ''}`;
  return `${you}\n1-5 put down changed skitter thresher worm big-skitter  0 clear  T slow  Y weapon  H heal  U hold\n${hitLog.join('\n')}`;
}

/** a power change being seen to come on, or null */
let cascade: Cascade | null = null;
function relightAll(L: Lighting): void {
  lighting = L;
  here.relight(L);
  handsView.setLighting(L);
  selfView.setLighting(L);
  motes.setLighting(L);
  prints.setLighting(L);
  drips.setLighting(L);
}

/** you are on another level: draw it, light it, and fade in as the first engine did */
function arrive(): void {
  sim = run.here;
  cascade = null;
  lighting = lightingNow();
  here = levelView();
  view.show(here.group);
  here.bind();
  beams.rescan();
  handsView.sim = sim;
  handsView.setLighting(lighting);
  selfView.sim = sim;
  selfView.setLighting(lighting);
  motes.setLighting(lighting);
  prints.setLighting(lighting);
  drips.setLighting(lighting);
  rig.reset();
  const b = sim.player.body;
  prev.x = b.x; prev.y = b.y; prev.z = b.z;
  fade.style.transition = 'none';
  fade.style.opacity = '1';
  requestAnimationFrame(() => { fade.style.transition = 'opacity .65s'; fade.style.opacity = '0'; });
}

/** what the sim reported this frame */
function events(): void {
  const g = sim.game;
  for (const ev of g.events.splice(0)) {
    switch (ev.type) {
      case 'say': break; // nothing the sim says is on the screen, for now: what it would say is to be shown in the world
      case 'log': if (DEV) { hitLog.push(ev.text); if (hitLog.length > 5) hitLog.shift(); } break;
      case 'sfx': scape.event(sim, ev); break;
      case 'note': openPanel(() => panels.showNote(g, ev.key)); break;
      case 'pad': openPanel(() => { panels.show('pad'); panels.renderPad(g); }); break;
      case 'lift': openPanel(() => panels.showLift(STATION.levels.map(l => ({ id: l.id, name: l.name, here: l.id === sim.world.def.id })))); break;
      case 'level': break; // the run has moved you already: see arrive()
      case 'power': {
        /* what comes on comes on room by room, out from where you are; what goes off goes at once */
        const b = sim.player.body, R = sim.world.roomAt(b.x, b.y + 0.5, b.z);
        const from = cascade ? cascade.L.to : lighting;
        cascade = new Cascade(sim.world, from, lightingNow(), R?.id ?? -1, r => scape.strike(sim, sim.world.rooms[r]));
        relightAll(cascade.L);
        scape.powerChanged();
        if (ev.loud) audio.play('power');
        break;
      }
      case 'relight':
        /* a light of its own went out: at once, no tubes striking (a power change under way is seen to at once too) */
        cascade = null;
        relightAll(lightingNow());
        break;
      case 'hurt':
        hurtFx = ev.shake > 0 ? 1 : Math.max(hurtFx, 0.7); rig.shake = Math.max(rig.shake, ev.shake);
        if (ev.from) {
          /* which way it came from, as you face: 0 ahead, a quarter turn right, half behind */
          const b = sim.player.body, a = Math.atan2(ev.from.x - b.x, -(ev.from.z - b.z)) + sim.player.yaw;
          rig.struck(a);
          hitDir.style.setProperty('--hx', (50 + 50 * Math.sin(a)).toFixed(1) + '%');
          hitDir.style.setProperty('--hy', (50 - 50 * Math.cos(a)).toFixed(1) + '%');
          hitFx = 1;
        }
        break;
      case 'impact': rig.impact(ev.k); break;
      case 'shake': rig.shake = Math.max(rig.shake, ev.k); break;
      case 'end': setMode('end'); if (document.pointerLockElement) document.exitPointerLock(); panels.showEnd(ev.win); break;
    }
  }
  if (panels.open === 'pad') { panels.renderPad(g); if (!g.pad) panels.close(); }
  if (carried.open) carried.render();
}

let last = 0, fps = 60, flick = 0, expo = 1;
/* where a frame goes (?dev): the sim's steps; the cast, crates and doors put where the sim has them; the rest of the
   page's work; and the frame handed to the GPU (the beams' shadow maps and the view), with how many draw calls and
   triangles that was. The GPU's own time is not here: a low fps with little of it spent here is the GPU */
const meter = new Meter();
view.renderer.info.autoReset = false;
function frame(t: number): void {
  requestAnimationFrame(frame);
  const t0 = performance.now();
  view.renderer.info.reset();
  const dt = last ? Math.min(0.25, (t - last) / 1000) : 0;
  last = t;
  /* the world runs while you play; while a menu is open it stands still and only takes the menu's commands. A lift
     chosen from its panel is a command: the step after it is the one that takes you. */
  if (mode === 'play') {
    const n = loop.advance(dt * devFlags.slow);
    for (let k = 0; k < n; k++) {
      const b = sim.player.body;
      prev.x = b.x; prev.y = b.y; prev.z = b.z;
      stepRun(run, controls.take());
      if (run.here !== sim) { events(); arrive(); }
    }
    meter.add('steps', n);
  } else if (mode === 'panel') applyCommands(sim);
  const t1 = performance.now();
  meter.add('sim', t1 - t0);
  if (!sim.tick) { const b = sim.player.body; prev.x = b.x; prev.y = b.y; prev.z = b.z; }
  rig.update(view.camera, sim, prev, mode === 'play' ? loop.alpha : 1, dt, controls.pending);
  handsView.shown = !feed.update(sim, view.camera) && mode !== 'title'; // sat at a console, the view is its camera's; the title's is only the place
  /* a failing battery stutters */
  const g = sim.game;
  flick -= dt;
  if (flick < 0 && Math.random() < dt * (g.batt < 20 ? 1.4 : 0.3)) flick = 0.05 + Math.random() * 0.2;
  if (flick > 0 && g.lightOn) { U.uFlash.value *= 0.25; U.uBounce.value *= 0.25; }
  const t2 = performance.now();
  here.update(mode === 'play' ? loop.alpha : 1, view.camera);
  const castMs = performance.now() - t2;
  meter.add('cast', castMs);
  /* the eye: it opens in the dark, slowly, and narrows against light quickly, so a room coming on glares a moment.
     It adapts to what is around you and to your own light, close in front of you; in a lit room it stays a little open,
     so the light reads as light */
  {
    const b = sim.player.body, l = lighting.atPoint(b.x, b.y + 1, b.z);
    const seen = Math.max(l[0], l[1], l[2]) + U.uFlash.value * 0.12 + U.uBounce.value * 2 + U.uLamp.value * 0.3;
    const k = Math.min(1, Math.max(0, (seen - 0.02) / 0.48)), want = devFlags.bright ? 1 : 1.45 - 0.25 * k * k * (3 - 2 * k);
    expo += (want - expo) * Math.min(1, dt * (want > expo ? 0.6 : 4));
    U.uExpo.value = expo * gain;
  }
  if (cascade) {
    const flipped = cascade.update(dt);
    if (flipped.length) here.relightRooms(lighting, flipped);
    if (cascade.done) { relightAll(cascade.L.to); cascade = null; }
  }
  /* light through the doors as they stand, and from the lights lying about (the sim's own lighting follows both already;
     a cascade's does not) */
  lighting.follow(k => sim.doors[k].t);
  lighting.lights(looseLights(sim));
  here.syncLight(lighting);
  handsView.update(rig.bob, t / 1000, rig.at);
  selfView.update(rig.at, rig.eye, dt);
  motes.resize(view.renderer.domElement.height, view.camera.fov);
  motes.update(sim, view.camera.position, mode === 'play' ? dt : 0);
  prints.update(sim, mode === 'play' ? dt : 0);
  drips.resize(view.renderer.domElement.height, view.camera.fov);
  drips.update(sim, mode === 'play' ? dt : 0);
  scape.placedDrips = drips.count > 0;
  hurtFx = Math.max(0, hurtFx - dt * 0.9);
  hitFx = Math.max(0, hitFx - dt * 1.6);
  hitDir.style.opacity = hitFx.toFixed(2);
  events();
  if (mode === 'play') scape.update(sim, dt, t / 1000);

  /* water: tinted and close in wading water, more so under it (less with goggles), as before */
  const p = sim.player, under = p.under, wet = p.water !== 'dry';
  U.uWet.value = under ? 1 : wet ? 0.4 : 0;
  /* thin in dry air, so a long hall reads to its far end where it is lit */
  const fog = (under ? (g.worn.includes('goggles') ? 0.075 : 0.21) : wet ? 0.045 : 0.02) * (devFlags.bright ? 0.25 : 1);
  U.uFog.value += (fog - U.uFog.value) * Math.min(1, dt * 4);
  panels.prompt(mode === 'play' ? sim.focus?.text ?? null : null);
  touch?.update(!!sim.focus || !!sim.watch, !!(g.weapon && ITEMS[g.weapon].w?.gun));
  panels.status(g, p.air < p.airMax - 0.01 ? p.air / p.airMax : null, hurtFx);

  const b = sim.player.body, room = sim.world.roomAt(b.x, b.y + 0.5, b.z);
  if (dt > 0) fps += (1 / dt - fps) * 0.05;
  if (DEV) track(dt);
  hud.dev(!DEV && FPS ? `${Math.round(fps)} fps  ${Math.round(governor.scale * 100)}%` : DEV ? `${b.x.toFixed(2)} ${b.y.toFixed(2)} ${b.z.toFixed(2)}  ${room?.name ?? 'rock'}  ${b.ground ? 'ground' : 'air'}  ${Math.round(fps)} fps\n${sim.world.def.name}: ${sim.world.grid.chunkCount} chunks  mesh ${here.meshMs.toFixed(0)} ms in ${here.pieces} pieces  ${['fly', 'god', 'bright'].filter(k => k === 'fly' ? sim.player.fly : k === 'god' ? sim.game.god : devFlags.bright).join(' ')}\n${perfLine()}\nV fly  G god  B bright  O colliders  P tracker  M surface detail\n${fightLine()}` : null);
  const t3 = performance.now();
  view.scene.updateMatrixWorld();
  beams.render(view.renderer, view.scene, view.camera.position, lighting.looseLights);
  view.draw(t / 1000, stutters(sim));
  const t4 = performance.now(), info = view.renderer.info.render;
  meter.add('gl', t4 - t3);
  meter.add('page', t3 - t1 - castMs);
  meter.add('frame', t4 - t0);
  meter.add('calls', info.calls);
  meter.add('tris', info.triangles / 1000);
  meter.end(dt);
  /* fewer pixels while the card cannot keep up (not counting the frame being handed to it, which can wait on it) */
  if (governor.frame(dt, t3 - t0)) { view.setScale(governor.scale); writeStore(SCALE_KEY, String(governor.step)); }
}

/** the dev readout's lines for where a frame goes (meter): ms, as the mean and worst of the last half second */
function perfLine(): string {
  const dead = sim.cast.filter(m => m.rag), awake = dead.filter(m => m.rag!.awake).length;
  return `ms  ${meter.line(['frame', 'sim', 'cast', 'page', 'gl'])}  (${meter.line(['steps'], 1)} a frame)  drawn at ${Math.round(governor.scale * 100)}%\n` +
    `${meter.line(['calls'], 0)} draw calls  ${meter.line(['tris'], 0)}k triangles  loose bodies ${awake} awake of ${dead.length}`;
}
/* ?dev: the run on the window, for poking at from the console or a test script */
if (DEV) (window as unknown as { rs: unknown }).rs = {
  get run() { return run; }, view, get sim() { return sim; }, step: stepRun, save: () => save(sim), saveRun: () => saveRun(run),
  progress: (o?: CheckOpts) => describe(checkProgress(sim, o)),
  give: (id: string, n?: number) => give(sim.game, id, n),
};

setMode('title');
requestAnimationFrame(frame);
