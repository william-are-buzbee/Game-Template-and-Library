import { ITEMS } from '../../content/items';
import type { Command, Game } from '../../sim/game';

/* The HUD and the menus that stop the game: the name of what you look at, health, breath and battery, the
   rounds for a gun in hand; a note, a keypad, the lift panel, the end. (What you carry is carried.ts: it does not stop
   the game.) As few words as will do. They show the game's state and turn clicks into commands for the sim; they decide
   nothing. */

const $ = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
/** the keypad's clear: a back-arrow with a cross in it */
const CLEAR = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h12v12H9l-6-6zM12.5 9.5l5 5M17.5 9.5l-5 5"/></svg>';

export type Panel = 'note' | 'pad' | 'lift';

export class Panels {
  open: Panel | null = null;
  private promptText = '';
  private ammoText = '';

  constructor(private send: (c: Command) => void, private onClose: () => void) {
    $('note').addEventListener('click', () => this.close());
    let h = '';
    for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0']) h += '<button data-k="' + k + '"' + (k === 'C' ? ' aria-label="Clear">' + CLEAR : '>' + k) + '</button>';
    $('padk').innerHTML = h;
    $('padk').addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-k]');
      if (b) this.send({ type: 'pad', key: b.dataset.k! });
    });
    $('liftb').addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-f]');
      if (b && !b.disabled) { this.send({ type: 'lift', level: b.dataset.f! }); this.close(); }
    });
    /* played by touch, there is no Esc or Tab: a button says it */
    $('back').addEventListener('click', e => { e.stopPropagation(); if (this.open) this.close(); });
  }

  /** played by touch (touch.ts): what is said is said for it */
  touch = false;

  show(p: Panel): void {
    this.closeAll();
    this.open = p;
    $(p).classList.remove('hide');
    document.body.classList.add('panelled');
    if (document.pointerLockElement) document.exitPointerLock();
  }
  close(): void {
    if (this.open === 'pad') this.send({ type: 'padClose' });
    this.closeAll();
    this.onClose();
  }
  private closeAll(): void {
    for (const id of ['note', 'pad', 'lift']) $(id).classList.add('hide');
    document.body.classList.remove('panelled');
    this.open = null;
  }

  /* ---- the HUD */
  /** what you are looking at that can be used: its name, and the dot made bolder */
  prompt(text: string | null): void {
    const t = text ?? '';
    if (t === this.promptText) return;
    this.promptText = t;
    $('prompt').textContent = t;
    $('dot').classList.toggle('can', !!t);
  }
  status(g: Game, airFrac: number | null, hurtFx = 0): void {
    $('hp').style.width = g.hp + '%';
    $('batw').classList.toggle('hide', !g.light);
    $('bat').style.width = g.batt + '%';
    $('bat').style.opacity = g.lightOn ? '1' : '0.45';
    $('o2w').classList.toggle('hide', airFrac === null);
    if (airFrac !== null) $('o2').style.width = (airFrac * 100).toFixed(1) + '%';
    /* what is in your hand you can see; the rounds left for a gun you cannot */
    const w = g.weapon ? ITEMS[g.weapon].w : null, ammo = w?.gun ? String(g.inv.find(q => q.id === w.ammo)?.n ?? 0) : '';
    if (ammo !== this.ammoText) { this.ammoText = ammo; $('ammo').textContent = ammo; }
    if (!g.ended) $('vig').style.opacity = String(Math.max(hurtFx, g.hp < 35 ? (35 - g.hp) / 50 : 0)); // dead, it stays red
  }

  /* ---- the menus */
  showNote(g: Game, key: string): void {
    const n = g.notes[key], art = $('notet');
    art.innerHTML = '<h2></h2><div></div>';
    art.firstElementChild!.textContent = n.t;
    art.children[1].textContent = n.b;
    this.show('note');
  }
  /** a wrong code stays on the display a moment (350 ms, as before) before it clears */
  private miss: { code: string; until: number } | null = null;
  renderPad(g: Game): void {
    const m = g.pad?.miss, now = performance.now();
    if (m && (!this.miss || this.miss.code !== m)) this.miss = { code: m, until: now + 350 };
    if (!m) this.miss = null;
    const show = this.miss && now < this.miss.until ? this.miss.code : g.pad?.typed ?? '';
    $('padd').textContent = (show + '····').slice(0, 4);
  }
  showLift(levels: { id: string; name: string; here: boolean }[]): void {
    let h = '';
    for (const l of levels) h += '<button data-f="' + l.id + '"' + (l.here ? ' disabled' : '') + '>' + esc(l.name) + '</button>';
    $('liftb').innerHTML = h;
    this.show('lift');
  }
  showEnd(win: boolean): void {
    /* the way out is told, as a paper would tell it; a death is only named */
    $('endh').textContent = win ? 'Surface' : 'Grafted';
    $('endp').textContent = !win ? ''
      : 'The lift climbs for a long time. When the doors open it is raining, and the rain is the first thing in nine days that has asked nothing of you. Six floors down, something green and something red go on disagreeing about who the station belongs to.';
    setTimeout(() => $('end').classList.remove('hide'), win ? 300 : 900);
    if (!win) $('vig').style.opacity = '1';
  }
}
