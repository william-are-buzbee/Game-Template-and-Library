const $ = (id: string) => document.getElementById(id)!;

export type Screen = 'title' | 'pause' | 'settings';

/** The page around the canvas: the title, pause and settings menus, the dev readout. */
export class Hud {
  show(id: Screen | 'hud', on: boolean): void {
    $(id).classList.toggle('hide', !on);
  }
  /** a menu's choice: its button's data-go */
  onMenu(id: Screen, f: (go: string) => void): void {
    $(id).addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-go]');
      if (b) f(b.dataset.go!);
    });
  }
  /** show a menu's entry, or not */
  entry(id: Screen, go: string, on: boolean): void {
    $(id).querySelector(`[data-go="${go}"]`)!.classList.toggle('hide', !on);
  }

  /** the breath bar: shown while it is not full */
  air(frac: number | null): void {
    $('o2w').classList.toggle('hide', frac === null);
    if (frac !== null) $('o2').style.width = (frac * 100).toFixed(1) + '%';
  }

  /** the dev tracker: what the progression checker says from where you stand */
  track(text: string | null): void {
    const el = $('track');
    el.classList.toggle('hide', text === null);
    if (text !== null && el.textContent !== text) el.textContent = text;
  }

  dev(text: string | null): void {
    const el = $('devtag');
    el.classList.toggle('hide', text === null);
    if (text !== null && el.textContent !== text) el.textContent = text;
  }
}
