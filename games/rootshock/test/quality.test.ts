import { describe, expect, it } from 'vitest';
import { GOVERN, Governor, SCALES } from '../src/present/quality';

/* How much of the screen is drawn (present/quality.ts). A card is played as a cost a pixel: a frame takes `fixed` ms
   plus `perPx` for a full screen's worth, scaled by the pixels drawn, and is shown on the next 60 Hz tick (or the
   browser's own cap). */
function play(G: Governor, secs: number, card: { fixed: number; perPx: number; cap?: number; work?: number }): number[] {
  const steps: number[] = [];
  for (let t = 0; t < secs; ) {
    const ms = card.fixed + card.perPx * G.scale * G.scale, tick = card.cap ?? GOVERN.frame;
    const dt = (Math.ceil(ms / tick - 1e-9) * tick) / 1000;
    t += dt;
    if (G.frame(dt, card.work ?? 3)) steps.push(G.step);
  }
  return steps;
}

describe('the share of the screen drawn', () => {
  it('steps down while the card cannot keep up, and stops where it can', () => {
    const G = new Governor(0);
    play(G, 30, { fixed: 4, perPx: 30 });
    expect(G.step).toBeGreaterThan(0);
    expect(4 + 30 * G.scale * G.scale).toBeLessThanOrEqual(GOVERN.frame); // on time
    expect(4 + 30 * SCALES[G.step - 1] ** 2).toBeGreaterThan(GOVERN.frame); // and no lower than it needs to be
  });

  it('does not step down when fewer pixels do not help (a browser holding frames to 30 a second)', () => {
    const G = new Governor(0);
    const steps = play(G, 120, { fixed: 4, perPx: 6, cap: 1000 / 30 });
    expect(G.step).toBe(0);
    expect(steps.length).toBeLessThanOrEqual(2 * (GOVERN.depth + 1)); // tried, taken back, rested a minute, once more
  });

  it('does not step down when it is the page that is slow', () => {
    const G = new Governor(0);
    play(G, 30, { fixed: 30, perPx: 2, work: 28 });
    expect(G.step).toBe(0);
  });

  it('steps back up on a card that can keep up, to the top', () => {
    const G = new Governor(4);
    play(G, 30, { fixed: 2, perPx: 8 });
    expect(G.step).toBe(0);
  });

  it('does not go back up to a step found too slow for a while, and does not see-saw', () => {
    const G = new Governor(0);
    const steps = play(G, 120, { fixed: 4, perPx: 14 }); // full size just too slow, the next just quick enough
    expect(G.step).toBe(1);
    expect(steps.length).toBeLessThanOrEqual(5); // down; up after 30 s and down again; after 60 more, the same
  });

  it('is not moved by a hitch now and then', () => {
    const G = new Governor(0);
    for (let k = 0; k < 600; k++) G.frame(k % 60 === 59 ? 0.5 : 1 / 60, 3); // a level made, once a second
    expect(G.step).toBe(0);
  });

  it('steps down on a card that only manages a few frames a second', () => {
    const G = new Governor(0);
    play(G, 20, { fixed: 10, perPx: 300 });
    expect(G.step).toBe(SCALES.length - 1);
  });
});
