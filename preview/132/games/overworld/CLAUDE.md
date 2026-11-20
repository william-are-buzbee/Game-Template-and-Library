# CLAUDE.md — Overworld

Read this first. Then `Notes/Design-Principles.md` before designing or implementing any system, and the `Notes/` doc for the
system you are touching. `Notes/Direction.md` says where the game is heading (muties, the mutagen organ, the island).
`Notes/Todo.md` is the person's prompt queue.

## What this is

A turn-based roguelike about surviving as an alien creature on a believably simulated world (see `readme.md` and
`Notes/Direction.md`; `Notes/Lore.md` is not authoritative): two founder lineages radiated into every niche, and the player is
a mutie among their descendants. Inspired by
Biblaridion's *Alien Biospheres*, Nethack and Caves of Qud.

**The core rule** (`Notes/Design-Principles.md`): everything is physical, everything is observable, everything is downstream of
the body map. Behaviour comes from structures in the body map doing physical things, never from probabilities, tuning levers or
behaviour labels. If a change needs something that isn't physically present in the body map, it's wrong.

Plain ES modules, no framework, no build step. `index.html` loads `js/main.js` as a module; `js/state.js` is the
shared mutable state every module imports. The one dependency is the repository's `@wb/core` (`packages/core`), vendored
as `vendor/wb-core.js` (committed; `npm run vendor -w games/overworld` rewrites it, and `npm test` fails when it is stale):
`js/rng.js` draws from its `Rng` since 6 Nov 2026, the same numbers as before. Each file's first lines say what it owns; the main groups:

| area | files (in `js/`) |
|---|---|
| entry, state, turns | main.js, state.js, turn-loop.js, save-load.js (IndexedDB, saved every turn), rng.js (seeded) |
| the body | body-maps.js (body maps, species templates, pathways), physiology.js, monsters.js (species records, spawning, personalities) |
| senses and minds | detection.js, signals.js, scent.js, sensory-constants.js, fov.js, wiring.js (each species' nervous system as nodes), nodes.js (runs a wiring), cognition.js, ai.js, ai-utils.js, behaviors.js, hunt-funnel.js (harness bookkeeping, read by nothing in play) |
| combat | combat.js, combat-constants.js |
| the world | world-gen.js (coordination), surface-gen.js, underground-gen.js, terrain.js, ecology-data.js, gen-utils.js, world-logic.js, world-state.js, time-cycle.js |
| player | player.js, player-actions.js, hub.js (the player plays the hub: its body runs first, the body screen), chargen.js (species selection, and the seed of the world the next game begins in), ground-items.js (corpses on the ground), interactions.js (the help screen) |
| colour | spectra.js: the one colour pipeline, reflectance × light × one eye's receptors → contrast or screen (`Notes/Spectral-Color-Design.md`; pure, not yet read by the game; the planet viewer is to carry a copy) |
| drawing and UI | rendering.js, display.js, sprites.js, sprites-32.js, texture-picker.js, modal.js, ui.js, log.js, log-ui.js, worldmap.js, debug.js; sprite-select.js and palette-compute.js (superseded by spectra.js) are standalone (CommonJS, not yet imported by the game) |

`Utils/planet-viewer.html` is a standalone planet tool (the Planet-Viewer repo is its own project); `Utils/spectra.html` shows every
material through every species' eye; `js/test-hare-bodymap.html` is a test page.

## Run and look

Overworld lives in the Game-Template-and-Library repository at `games/overworld` since 6 Nov 2026 (its history came with
it). From the repository's root:

```
npm run dev -w games/overworld        serve the folder at http://localhost:5173 (modules don't load from file://)
npm test -w games/overworld           vendor/wb-core.js current, then tools/check-modules.mjs: every module parses, every import resolves
npm run smoke -w games/overworld      tools/smoke.mjs: boots headless, plays, saves, reloads, resumes, checks seed determinism
```

Add `?seed=<n>` to the URL for a reproducible world (the seed is logged at the start of a run). The title screen shows the
world NEW GAME begins in: its real surface around the spawn, drawn by the game's own tile code with nobody looking. CI runs `npm test` and
`smoke` on every pull request (the repository's `.github/workflows/check.yml`), and boots the build. The smoke test and
`node tools/ecology.mjs` need Playwright: a cloud session has one (`require('playwright')` resolves); otherwise set
`PLAYWRIGHT_MODULE` to its folder. They catch breakage, not design: the real check is playing it. For behaviour,
`node tools/ecology.mjs [--seeds=1-8] [--turns=500] [--hunger=0.9] [--json=out.json]` (minutes, not in CI) runs the world over
several seeds with the player standing still and reports what the animals did as means ± spreads per 100 turns, and
deaths by species and cause, who killed whom and which side opened each fight, and the hunt funnel (per predator–animal
pair: detected, viable, pursued, adjacent, attacked, hit, killed, and why each episode ended); run it before and after a change.
`node tools/spectra.mjs` (plain node, seconds) prints what `spectra.js` makes of the materials: reference colours, each eye in
each light, contrast in JNDs; `--calibrate` refits the display's chroma scale. A single seed is
an anecdote: one change anywhere reroutes the world. From a session, `npm run build -w games/overworld && npm run look --
games/overworld` boots the build and screenshots it; the person's own check is the pull request's preview,
`…/preview/<number>/games/overworld/`.

## Delivering a change

The root `CLAUDE.md` is the rulebook: `claude/…` branches, a pull request into `main`, never a push to `main`, commits as
`WB <willbuzbee@gmail.com>` with a `Co-Authored-By:` line for Claude. What is particular to Overworld:

1. One change or one pass per pull request.
2. When a change moves a system's design, update its `Notes/` doc in the same pull request, and tick `Notes/Todo.md`.
3. Say in the pull request what changed, why, what was looked at, and what the person should check on the preview.
4. Live at `https://william-are-buzbee.github.io/Game-Template-and-Library/games/overworld/`. The old site,
   `https://william-are-buzbee.github.io/Overworld/`, and its kept copies per merge stay as the old repository left them.

## The person

- Concise replies, dry wit, no praise, no constant agreement. Disagree when reasonable. Be plain about what can and cannot be
  checked from a session.
- Likes questions and is open to ideas. When a design choice is theirs, ask, don't guess.
