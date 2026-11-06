import type { Controls } from './controls';

/* Touch, for a phone or a tablet held on its side. The left of the screen is a stick, put down wherever the thumb lands:
   how far it is pushed is how fast you go, and pushed out past its rim you run. Anywhere else is looked across by
   dragging. On the right, the buttons: the hands (held to load a swing and let go to throw it, as the mouse button is;
   dragged, it looks as well, so a swing is aimed as it loads), use (lit when there is something to use), the light,
   jump (held, up through water) and crouch (held, down); at the top, what you carry and pause. Shown only in play;
   the menus are tapped as they are clicked. Each button is a picture, not a word. Feeds Controls as the keys and mouse do;
   decides nothing. */

export const TOUCH = {
  /** how far the stick goes (px from where the thumb came down to full pace); pushed past `run` of that, you run */
  reach: 52, run: 1.4,
  /** under this much of full, the stick is still */
  dead: 0.12,
  /** how far a drag turns you (radians a CSS px, times the player's own setting) */
  look: 0.0042,
  /** how much of the screen's width, from the left, the stick may be put down in */
  side: 0.42,
};

type Button = 'hands' | 'use' | 'light' | 'jump' | 'crouch' | 'carry' | 'pause';
/** each button's picture (no words on them), drawn on a 24 grid; the hands' is a swing's arc, or a sight for a gun */
const glyph = (d: string) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const GLYPH: Record<Button, string> = {
  hands: glyph('M5 17A9 9 0 0 1 17 5M17 5l-4-1M17 5l-1 4'),
  use: glyph('M8 21c-2-2-4-5-4-8V11h2v3M6 11V5a1.3 1.3 0 0 1 2.6 0v6M8.6 10V3.5a1.3 1.3 0 0 1 2.6 0V10M11.2 10V4.5a1.3 1.3 0 0 1 2.6 0V10M13.8 10.5V6.5a1.3 1.3 0 0 1 2.6 0V15c0 3-2 6-5 6H8'),
  light: glyph('M3 10h7l3-2v8l-3-2H3zM16 8l4-2M16 12h5M16 16l4 2'),
  jump: glyph('M5 15l7-7 7 7'),
  crouch: glyph('M5 9l7 7 7-7'),
  carry: glyph('M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'),
  pause: glyph('M8 5v14M16 5v14'),
};
const FIRE = glyph('M12 3v5M12 16v5M3 12h5M16 12h5M12 9a3 3 0 1 0 0.01 0');
const LABEL: Record<Button, string> = { hands: 'Swing', use: 'Use', light: 'Light', jump: 'Jump', crouch: 'Crouch', carry: 'Carried', pause: 'Pause' };

/** a finger on the glass: what it came down on, and where it was last */
interface Finger { on: 'stick' | 'look' | Button; x: number; y: number; x0: number; y0: number }

export class Touch {
  /** the player's own look speed (1 as given) */
  speed = 1;
  private root = document.createElement('div');
  private stick = document.createElement('div');
  private knob = document.createElement('i');
  private buttons = new Map<Button, HTMLElement>();
  private fingers = new Map<number, Finger>();
  private hold: NonNullable<Controls['touch']> = { forward: 0, strafe: 0, run: false, attack: false, rise: false, sink: false };

  constructor(private controls: Controls, private on: { carry(): void; pause(): void }) {
    controls.touch = this.hold;
    this.root.id = 'touch';
    this.root.className = 'hide';
    this.stick.id = 'stick';
    this.stick.append(this.knob);
    this.root.append(this.stick);
    for (const b of Object.keys(GLYPH) as Button[]) {
      const el = document.createElement('div');
      el.className = 'tb';
      el.dataset.tb = b;
      el.setAttribute('aria-label', LABEL[b]);
      el.innerHTML = GLYPH[b];
      this.buttons.set(b, el);
      this.root.append(el);
    }
    document.body.append(this.root);
    const R = this.root;
    R.addEventListener('pointerdown', e => this.down(e));
    R.addEventListener('pointermove', e => this.move(e));
    for (const ev of ['pointerup', 'pointercancel'] as const) R.addEventListener(ev, e => this.up(e));
    R.addEventListener('contextmenu', e => e.preventDefault()); // a long press is a held button, not a menu
    /* no click after a touch: a button that opens a menu or pauses would have it land on what it opened */
    R.addEventListener('touchend', e => e.preventDefault(), { passive: false });
  }

  /** shown while you play, gone while a menu is open (and everything let go) */
  show(on: boolean): void {
    this.root.classList.toggle('hide', !on);
    if (!on) for (const id of [...this.fingers.keys()]) this.lift(id);
  }

  /** what the buttons show: use lit when there is something to use; the hands' button by what is in them */
  private gun = false;
  update(canUse: boolean, gun: boolean): void {
    this.buttons.get('use')!.classList.toggle('lit', canUse);
    if (gun === this.gun) return;
    this.gun = gun;
    const h = this.buttons.get('hands')!;
    h.innerHTML = gun ? FIRE : GLYPH.hands;
    h.setAttribute('aria-label', gun ? 'Fire' : 'Swing');
  }

  private down(e: PointerEvent): void {
    e.preventDefault();
    this.root.setPointerCapture?.(e.pointerId);
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-tb]')?.dataset.tb as Button | undefined;
    const sticking = [...this.fingers.values()].some(f => f.on === 'stick');
    const on: Finger['on'] = b ?? (e.clientX < innerWidth * TOUCH.side && !sticking ? 'stick' : 'look');
    this.fingers.set(e.pointerId, { on, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
    const c = this.controls, H = this.hold;
    if (on === 'stick') {
      this.stick.style.left = e.clientX + 'px';
      this.stick.style.top = e.clientY + 'px';
      this.stick.classList.add('on');
      this.pushStick(0, 0);
    } else if (on !== 'look') {
      this.buttons.get(on)!.classList.add('down');
      if (on === 'hands') { H.attack = true; c.push('attack'); }
      else if (on === 'jump') { H.rise = true; c.push('jump'); }
      else if (on === 'crouch') { H.sink = true; c.push('crouch'); }
      else if (on === 'use' || on === 'light') c.push(on);
      else if (on === 'carry') this.on.carry();
      else if (on === 'pause') this.on.pause();
    }
  }

  private move(e: PointerEvent): void {
    const f = this.fingers.get(e.pointerId);
    if (!f) return;
    const dx = e.clientX - f.x, dy = e.clientY - f.y;
    f.x = e.clientX; f.y = e.clientY;
    if (f.on === 'stick') this.pushStick(f.x - f.x0, f.y - f.y0);
    else if (f.on === 'look' || f.on === 'hands') {
      const k = TOUCH.look * this.speed;
      this.controls.look(-dx * k, -dy * k);
    }
  }

  private up(e: PointerEvent): void {
    this.lift(e.pointerId);
  }

  private lift(id: number): void {
    const f = this.fingers.get(id);
    if (!f) return;
    this.fingers.delete(id);
    const H = this.hold;
    if (f.on === 'stick') { this.stick.classList.remove('on', 'run'); H.forward = H.strafe = 0; H.run = false; }
    else if (f.on !== 'look') {
      this.buttons.get(f.on)!.classList.remove('down');
      if (f.on === 'hands') H.attack = false;
      else if (f.on === 'jump') H.rise = false;
      else if (f.on === 'crouch') H.sink = false;
    }
  }

  /** the stick pushed (dx, dy) px from where it came down */
  private pushStick(dx: number, dy: number): void {
    const T = TOUCH, d = Math.hypot(dx, dy), most = T.reach * T.run, k = d > most ? most / d : 1, H = this.hold;
    this.knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    const n = Math.min(1, d / T.reach), u = d > 0 ? n / d : 0, live = n > T.dead;
    H.forward = live ? -dy * u : 0;
    H.strafe = live ? dx * u : 0;
    H.run = d > T.reach * T.run * 0.92;
    this.stick.classList.toggle('run', H.run);
  }
}
