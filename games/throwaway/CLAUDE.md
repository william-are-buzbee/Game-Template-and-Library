# CLAUDE.md — Throwaway

Test of the game scaffold (Phase 3); delete once it has been seen working.

The root `CLAUDE.md` applies here: branches, pull requests, identity, the promotion rule and the architecture rules.
This file holds what is particular to this game. Keep it current: it is the first thing the next session reads.

## What this is

_Fill this in from the person's first prompt, before writing code: the idea, the feel, who you play, what it is not.
Anything that is the person's choice and the prompt leaves open, ask._

## Run, test, look

```
npm run dev -w games/throwaway                                     play it while working on it (reloads on save)
npm run check                                              types, tests and the catalog, whole repo (run before pushing)
npm test -w games/throwaway                                        this game's tests only
npm run build -w games/throwaway && npm run look -- games/throwaway        the real build in headless Chromium, screenshot to _look/throwaway.png
```

- `?dev` shows the frame rate and puts the state on `window.game` in the console.
- Live: https://william-are-buzbee.github.io/Game-Template-and-Library/games/throwaway/. A pull request's preview: `…/preview/<number>/games/throwaway/`.

## Layout

```
src/sim/       the game as plain data, advanced one fixed step at a time (step.ts). No three.js, no page.
src/present/   drawing (view.ts), camera, keys and mouse (keys.ts). Reads the sim, never writes it.
src/main.ts    keys → step() at a fixed 60 Hz → draw, every frame
test/          headless tests of the sim; layers.test.ts enforces the sim/present split
```

## Decisions

_One line each, dated, with the person's answers. Newest last._

- 2026-11-06: started from the game template (`npm run new`).
