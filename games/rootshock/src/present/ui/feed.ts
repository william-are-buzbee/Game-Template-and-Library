import type * as THREE from 'three';
import { onScreen } from '../../sim/eyes';
import type { Sim } from '../../sim/sim';
import { SHADOW_ONLY } from '../render/selfView';

/* Sat at a console (sim/eyes.ts, watching): the view is the camera's, from its lens, grey and hard as a monitor's, with
   what the monitor itself prints over it, the feed's name and the clock; a camera that sends nothing shows no signal.
   Nothing says how to work it: across for another camera, use to stand up. */

const el = (id: string, cls = '') => { const d = document.createElement('div'); d.id = id; if (cls) d.className = cls; return d; };

/** how far down a camera on its bracket looks */
const TILT = 0.32;

export class Feed {
  private root = el('feed', 'hide');
  private name = el('feedn');
  private clock = el('feedt');
  private none = el('feedx');
  private on = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.none.textContent = 'NO SIGNAL';
    this.root.append(this.name, this.clock, this.none);
    document.body.append(this.root);
  }

  /** put the view at the camera on screen, if you are watching one; says whether you are */
  update(sim: Sim, cam: THREE.PerspectiveCamera): boolean {
    const s = onScreen(sim), w = sim.watch;
    if (!s || !w) {
      if (this.on) { this.on = false; this.root.classList.add('hide'); this.canvas.style.filter = ''; cam.layers.disable(SHADOW_ONLY); document.body.classList.remove('watching'); }
      return false;
    }
    this.on = true;
    this.root.classList.remove('hide');
    document.body.classList.add('watching'); // no aim of yours over the feed
    cam.layers.enable(SHADOW_ONLY); // from out here, all of you: the head and arms the eye is not shown
    const C = s.cam.def;
    cam.position.set(C.x, C.y, C.z);
    cam.rotation.set(-TILT, C.yaw + Math.PI, 0);
    this.name.textContent = `CAM ${w.at + 1}/${w.feeds.length}  ${(C.name ?? '').toUpperCase()}`;
    const t = 3 * 3600 + 14 * 60 + sim.game.time, hh = Math.floor(t / 3600) % 24, mm = Math.floor(t / 60) % 60, ss = Math.floor(t) % 60;
    this.clock.textContent = [hh, mm, ss].map(n => String(n).padStart(2, '0')).join(':');
    this.none.classList.toggle('hide', s.live);
    this.canvas.style.filter = s.live ? 'grayscale(0.85) contrast(1.35) brightness(1.15)' : 'brightness(0)';
    return true;
  }
}
