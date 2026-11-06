import { GRID, ITEMS, WORN_SLOTS, keyName, sizeOf, type WornSlot } from '../../content/items';
import { fits, type Command, type Game } from '../../sim/game';
import { icon, keyIcon } from './icons';

/* What you carry, as System Shock 2 had it: Tab brings it up over the game, which goes on (main.ts frees the pointer
   from looking; you still walk). A grid of cells (GRID), each thing taking the cells of its size (a pistol two, a vest
   four), in colour and without words; beside it what you wear, one place each, and your two lights; under it the keys
   you know and the papers you have read. Pointed at, a thing is named. A click uses it (a weapon into your hand or out
   of it, food eaten, a vest put on, something worn taken off, a light switched, a paper read); dragged, it moves in the
   grid where it has room, onto you to wear it, or out of the panel to put it down; a right click puts it down too.
   Shows the game and sends commands; decides nothing. */

const $ = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const named = (n: string) => ` data-name="${esc(n)}"`;
const at = (x: number, y: number, w: number, h: number) => ` style="grid-area:${y + 1} / ${x + 1} / span ${h} / span ${w}"`;

type Place = WornSlot | 'flash' | 'lantern';
/** where each worn place and each light sits in the block beside the grid, in its cells: x, y, across, down */
const EQUIP: Record<Place, [number, number, number, number]> = {
  body: [0, 0, 2, 2], head: [2, 0, 1, 1], eyes: [2, 1, 1, 1], breath: [0, 2, 1, 1], flash: [1, 2, 1, 1], lantern: [2, 2, 1, 1],
};
/** what shows, faint, in a place with nothing in it */
const GHOST: Record<Place, string> = { body: 'armor', head: 'hardhat', eyes: 'goggles', breath: 'rebreather', flash: 'flash', lantern: 'lantern' };

/** a thing being dragged out of the grid: which, where in it the pointer took hold (cells), where the press began (px) */
interface Drag { slot: number; el: HTMLElement; gx: number; gy: number; x0: number; y0: number; ghost: HTMLElement | null }

export class Carried {
  open = false;
  private html = '';
  private drag: Drag | null = null;
  /** the name over the panel, and what it is over */
  private tipped: string | null = null;

  constructor(private send: (c: Command) => void, private game: () => Game) {
    const root = $('invb');
    root.addEventListener('pointerdown', e => this.down(e));
    window.addEventListener('pointermove', e => this.move(e));
    window.addEventListener('pointerup', e => this.up(e));
    window.addEventListener('pointercancel', () => this.end());
    /* the rest are clicked: what you wear, your lights, your papers */
    root.addEventListener('click', e => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-w], [data-t], [data-n]');
      if (!t) return;
      const d = t.dataset;
      if (d.w) this.send({ type: 'unwear', id: d.w });
      else if (d.t) this.send({ type: 'light', tool: d.t });
      else if (d.n) this.send({ type: 'read', key: d.n });
    });
    root.addEventListener('contextmenu', e => {
      e.preventDefault();
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-i], [data-t]');
      if (t?.dataset.i) this.send({ type: 'drop', slot: +t.dataset.i });
      else if (t?.dataset.t) this.send({ type: 'putDown', tool: t.dataset.t });
    });
    /* by touch the name stays over what was last tapped, until the next tap */
    root.addEventListener('pointerover', e => { if (!this.drag?.ghost) this.tip((e.target as HTMLElement).closest<HTMLElement>('[data-name]')); });
    root.addEventListener('pointerout', e => {
      const from = (e.target as HTMLElement).closest('[data-name]');
      if (e.pointerType !== 'touch' && from && !from.contains(e.relatedTarget as Node | null)) this.tip(null);
    });
  }

  show(on: boolean): void {
    this.open = on;
    $('inv').classList.toggle('hide', !on);
    if (on) { this.html = ''; this.render(); } else { this.end(); this.tip(null); }
  }

  render(): void {
    if (!this.open || this.drag) return; // not from under a thing being pressed or dragged
    const g = this.game();
    let h = '<div class="grid" id="ingrid">';
    for (let y = 0; y < GRID.h; y++) for (let x = 0; x < GRID.w; x++) h += '<i' + at(x, y, 1, 1) + '></i>';
    g.inv.forEach((s, i) => {
      const [w, hh] = sizeOf(s.id);
      h += '<div class="it' + (g.weapon === s.id ? ' on' : '') + '" data-i="' + i + '"' + named(ITEMS[s.id].n) + at(s.x, s.y, w, hh) + '>' + icon(s.id) +
        (s.n > 1 ? '<em>' + s.n + '</em>' : '') + '</div>';
    });
    h += '<div class="land hide" id="land"></div></div><div class="equip" id="equip">';
    for (const p of WORN_SLOTS) {
      const k = g.worn.find(q => ITEMS[q].worn === p);
      h += k ? '<div class="it" data-w="' + k + '"' + named(ITEMS[k].n) + at(...EQUIP[p]) + '>' + icon(k) + '</div>'
        : '<div class="it ghost"' + at(...EQUIP[p]) + '>' + icon(GHOST[p]) + '</div>';
    }
    for (const k of ['flash', 'lantern'] as const) {
      h += g.tools.includes(k)
        ? '<div class="it' + (g.light === k ? ' on' : '') + (g.light === k && g.lightOn ? ' lit' : '') + '" data-t="' + k + '"' + named(ITEMS[k].n) + at(...EQUIP[k]) + '>' + icon(k) + '</div>'
        : '<div class="it ghost"' + at(...EQUIP[k]) + '>' + icon(GHOST[k]) + '</div>';
    }
    h += '</div>';
    if (g.keys.length || g.read.length) {
      h += '<div class="row">' + g.keys.map(k => '<div class="it sm"' + named(keyName(k)) + '>' + keyIcon(k) + '</div>').join('') +
        g.read.map(k => '<div class="it sm" data-n="' + k + '"' + named(g.notes[k].t) + '>' + icon('paper') + '</div>').join('') + '</div>';
    }
    /* drawn again only when it changes: drawn every frame, a press longer than a frame lost what it was pressed on */
    if (h === this.html) return;
    this.html = h;
    $('invb').innerHTML = h;
    const was = this.tipped;
    this.tip(was ? [...$('invb').querySelectorAll<HTMLElement>('[data-name]')].find(e => e.dataset.name === was) ?? null : null);
  }

  private tip(el: HTMLElement | null): void {
    const t = $('tip');
    this.tipped = el?.dataset.name ?? null;
    t.classList.toggle('hide', !el);
    if (!el) return;
    t.textContent = el.dataset.name!;
    const r = el.getBoundingClientRect(), w = t.offsetWidth;
    t.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
    t.style.top = Math.min(innerHeight - t.offsetHeight - 8, r.bottom + 6) + 'px';
  }

  /* ---- dragging a thing in the grid. A press that does not move is a click: use it. */
  private down(e: PointerEvent): void {
    if (e.button !== 0) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-i]');
    if (!el) return;
    e.preventDefault();
    const r = el.getBoundingClientRect(), c = this.cell();
    this.drag = { slot: +el.dataset.i!, el, gx: Math.floor((e.clientX - r.left) / c), gy: Math.floor((e.clientY - r.top) / c), x0: e.clientX, y0: e.clientY, ghost: null };
  }

  private move(e: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    if (!d.ghost) {
      if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 6) return;
      const r = d.el.getBoundingClientRect();
      d.ghost = document.createElement('div');
      d.ghost.id = 'ghost';
      d.ghost.style.width = r.width + 'px';
      d.ghost.style.height = r.height + 'px';
      d.ghost.innerHTML = d.el.innerHTML;
      document.body.append(d.ghost);
      d.el.classList.add('lifted');
      this.tip(null);
    }
    const c = this.cell();
    d.ghost.style.transform = `translate(${e.clientX - (d.gx + 0.5) * c}px, ${e.clientY - (d.gy + 0.5) * c}px)`;
    const to = this.target(e), land = $('land');
    d.ghost.classList.toggle('out', to.out);
    land.classList.toggle('hide', !to.grid);
    if (to.grid) {
      const [w, h] = sizeOf(this.game().inv[d.slot]?.id ?? '');
      land.setAttribute('style', `grid-area:${to.y + 1} / ${to.x + 1} / span ${h} / span ${w}`);
      land.classList.toggle('no', !to.fits);
    }
  }

  private up(e: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    if (!d.ghost) { this.end(); this.send({ type: 'use', slot: d.slot }); return; }
    const to = this.target(e), s = this.game().inv[d.slot];
    if (to.grid && to.fits) this.send({ type: 'move', slot: d.slot, x: to.x, y: to.y });
    else if (to.wear && s && ITEMS[s.id].worn) this.send({ type: 'use', slot: d.slot });
    else if (to.out) this.send({ type: 'drop', slot: d.slot });
    this.end();
  }

  private end(): void {
    const d = this.drag;
    this.drag = null;
    if (!d?.ghost) return;
    d.ghost.remove();
    d.el.classList.remove('lifted');
    this.html = ''; // drawn again, as the sim has it after the move
    this.render();
  }

  /** a cell's size on the screen (px) */
  private cell(): number {
    return $('ingrid').getBoundingClientRect().width / GRID.w;
  }

  /** where a drag would land: in the grid (its top left, and whether it has room there), on you, or out of the panel */
  private target(e: PointerEvent): { grid: boolean; x: number; y: number; fits: boolean; wear: boolean; out: boolean } {
    const d = this.drag!, g = this.game(), s = g.inv[d.slot], c = this.cell(), gr = $('ingrid').getBoundingClientRect();
    const inside = (r: DOMRect) => e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    const grid = inside(gr), x = Math.floor((e.clientX - gr.left) / c) - d.gx, y = Math.floor((e.clientY - gr.top) / c) - d.gy;
    const [w, h] = s ? sizeOf(s.id) : [1, 1];
    return {
      grid, x, y, fits: !!s && fits(g, x, y, w, h, s),
      wear: inside($('equip').getBoundingClientRect()), out: !inside($('inv').getBoundingClientRect()),
    };
  }
}
