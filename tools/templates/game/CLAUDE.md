# CLAUDE.md — {{title}}

{{description}}

The root `CLAUDE.md` applies here: branches, pull requests, identity, the promotion rule and the architecture rules.
This file holds what is particular to this game. Keep it current: it is the first thing the next session reads.

## What this is

_Fill this in from the person's first prompt, before writing code: the idea, the feel, who you play, what it is not.
Anything that is the person's choice and the prompt leaves open, ask._

## Run, test, look

```
npm run dev -w {{dir}}                                     play it while working on it (reloads on save)
npm run check                                              types, tests and the catalog, whole repo (run before pushing)
npm test -w {{dir}}                                        this game's tests only
npm run build -w {{dir}} && npm run look -- {{dir}}        the real build in headless Chromium, screenshot to _look/{{name}}.png
```

- `?dev` shows the frame rate and puts the state on `window.game` in the console.
- Live: {{site}}{{dir}}/. A pull request's preview: `…/preview/<number>/{{dir}}/`.

## Layout

```
src/sim/       the game as plain data, advanced one fixed step at a time (step.ts). No three.js, no page.
src/present/   drawing (view.ts), camera, keys and mouse (keys.ts). Reads the sim, never writes it.
src/main.ts    keys → step() at a fixed 60 Hz → draw, every frame
test/          headless tests of the sim; layers.test.ts enforces the sim/present split
```

## Decisions

_One line each, dated, with the person's answers. Newest last._

- {{date}}: started from the game template (`npm run new`).
