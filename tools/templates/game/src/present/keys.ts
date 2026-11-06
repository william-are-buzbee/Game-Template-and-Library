// present/keys.ts — the keyboard, read into the sim's Input once per step. WASD and the arrows move.
import type { Input } from '../sim/input';

export class Keys {
  private down = new Set<string>();

  constructor(target: Window = window) {
    target.addEventListener('keydown', e => this.down.add(e.code));
    target.addEventListener('keyup', e => this.down.delete(e.code));
    // a key held while the window loses focus never sends its keyup
    target.addEventListener('blur', () => this.down.clear());
  }

  take(): Input {
    const on = (...codes: string[]) => (codes.some(c => this.down.has(c)) ? 1 : 0);
    return {
      forward: on('KeyW', 'ArrowUp') - on('KeyS', 'ArrowDown'),
      strafe: on('KeyD', 'ArrowRight') - on('KeyA', 'ArrowLeft'),
    };
  }
}
