import { noInput, type Input } from '../sim/input';

const SENS = 0.0022;

/** Keys and mouse in (or touch: touch.ts), one Input per sim step out. Presses are held until a step takes them; mouse
 *  movement is added up until a step takes it, and until then the camera shows it anyway (pending), so looking never
 *  lags. */
export class Controls {
  private keys: Record<string, boolean> = {};
  private press = { jump: false, crouch: false, light: false, use: false };
  /** keys the page handles itself (dev toggles), by code */
  readonly onKey = new Map<string, () => void>();
  readonly pending = { yaw: 0, pitch: 0 };
  /** pointer capture refused (some embedded browsers): drag to look instead */
  private dragLook = false;
  private dragging = false;
  /** the button is down, or went down since the last step took it (a click shorter than a step still counts) */
  private mouse = false;
  private clicked = false;
  /** Q held: the keyboard's way to load a swing */
  private q = false;
  /** capture has worked here before: losing it now is a pause, not a reason to fall back to dragging */
  private everLocked = false;
  /** a drag in progress (drag-look): how far, since when. A short still click is a click. */
  private drag: { moved: number; t: number } | null = null;
  enabled = false;
  /** the pointer is out, working what you carry (main.ts): it neither looks nor swings, and its capture let go is not a
   *  pause. You still walk. */
  free = false;
  /** played by touch (touch.ts): no mouse to capture. What the stick and the buttons hold: how far forward and to the
   *  side (-1 to 1), running, the hands, swimming up and down */
  touch: { forward: number; strafe: number; run: boolean; attack: boolean; rise: boolean; sink: boolean } | null = null;

  constructor(private canvas: HTMLCanvasElement, private onUnlock: () => void) {
    window.addEventListener('keydown', e => {
      if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
      if (e.repeat) return;
      this.keys[e.code] = true;
      if (!this.enabled) return;
      if (e.code === 'Space') this.press.jump = true;
      else if (e.code === 'KeyC') this.press.crouch = true;
      else if (e.code === 'KeyF') this.press.light = true;
      else if (e.code === 'KeyE') this.press.use = true;
      else if (e.code === 'KeyQ' && !this.free) { this.q = true; this.clicked = true; }
      else if (e.code === 'Escape' && this.dragLook) this.onUnlock(); // no capture to lose: Esc pauses
      this.onKey.get(e.code)?.();
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; if (e.code === 'KeyQ') this.q = false; });
    window.addEventListener('blur', () => { this.keys = {}; this.mouse = false; this.q = false; });
    document.addEventListener('mousemove', e => {
      if (!this.enabled || this.free || !(this.locked() || (this.dragLook && this.dragging))) return;
      if (this.drag) this.drag.moved += Math.abs(e.movementX) + Math.abs(e.movementY);
      this.pending.yaw -= e.movementX * SENS;
      this.pending.pitch -= e.movementY * SENS;
    });
    /* captured, the button is the hands; dragging to look, a drag is looking and only a short still click is the hands */
    canvas.addEventListener('mousedown', e => {
      if (!this.enabled || this.free) return;
      if (this.dragLook) { this.dragging = true; this.drag = { moved: 0, t: performance.now() }; return; }
      if (e.button === 0) { this.mouse = true; this.clicked = true; }
    });
    window.addEventListener('mouseup', e => {
      this.dragging = false;
      if (this.drag) {
        if (this.enabled && this.drag.moved < 5 && performance.now() - this.drag.t < 250) this.clicked = true;
        this.drag = null;
      } else if (e.button === 0) this.mouse = false;
    });
    document.addEventListener('pointerlockchange', () => {
      if (this.locked()) this.everLocked = true;
      else if (this.enabled && !this.dragLook && !this.free) this.onUnlock();
    });
    document.addEventListener('pointerlockerror', () => this.lockFail());
  }

  locked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  lock(): void {
    if (this.dragLook || this.touch) return;
    try {
      const r = this.canvas.requestPointerLock() as unknown as Promise<void> | undefined;
      r?.catch?.(() => this.lockFail());
    } catch {
      this.lockFail();
    }
  }

  /** capture refused: if it has worked here before, pause; the first time, look by dragging instead */
  private lockFail(): void {
    if (this.everLocked) { if (this.enabled) this.onUnlock(); return; }
    if (this.dragLook) return;
    this.dragLook = true;
  }

  /** touch: a press of one of these, as its key would be; the hands going down (a tap shorter than a step still counts) */
  push(k: 'jump' | 'crouch' | 'light' | 'use' | 'attack'): void {
    if (!this.enabled) return;
    if (k === 'attack') this.clicked = true;
    else this.press[k] = true;
  }
  /** touch: turn by this much (radians) */
  look(yaw: number, pitch: number): void {
    if (!this.enabled) return;
    this.pending.yaw += yaw;
    this.pending.pitch += pitch;
  }

  /** the sides a swing is sent from swapped (Settings: Swap swing sides) */
  swap = false;

  /** the input for one sim step */
  take(): Input {
    const k = this.keys, i = noInput(), t = this.touch;
    if (!this.enabled) return i;
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    i.forward = clamp((k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) + (t?.forward ?? 0));
    i.strafe = clamp((k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + (t?.strafe ?? 0));
    i.run = !!(k.ShiftLeft || k.ShiftRight || t?.run);
    i.yaw = this.pending.yaw; i.pitch = this.pending.pitch;
    this.pending.yaw = 0; this.pending.pitch = 0;
    i.jump = this.press.jump; i.crouch = this.press.crouch; i.light = this.press.light; i.use = this.press.use;
    i.rise = !!(k.Space || t?.rise); i.sink = !!(k.KeyC || t?.sink);
    i.attack = (!this.free && (this.mouse || this.clicked || this.q)) || !!t?.attack;
    i.swap = this.swap;
    this.clicked = false;
    this.press = { jump: false, crouch: false, light: false, use: false };
    return i;
  }
}
