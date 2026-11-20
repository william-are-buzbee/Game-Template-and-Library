# analysis_project — what the project as a whole is missing (20 Nov 2026)

A review of Tethys as a project rather than as a game: how it is measured, built, documented and tested, and what stands between it and
"fantastically smooth" on the person's desktop. The person asked for "long term improvements … comfortable digging up a nice root that's in
the way eventually even if it means fucking up our lawn today", and answered every item yes, in this order (20 Nov 2026).

## The findings

- **Nothing measured on the machine that plays.** Every performance judgement was a proxy (SwiftShader's times, the GPU's counts) or a
  readout read out by the person at a `tp()` they had to be sent to. No GPU name, no GPU time, no session log, no record of the errors and
  silent fallbacks (`console.warn` in 19 places: the horizon tier, the light block, the world shadows) on the person's machine.
- **Triangles per pixel.** test/gpu.json: 3.8M triangles at the forest, 4.9M at the shore, at 1600×900 — about three a pixel in a
  low-poly game. Most are far plants smaller than a pixel. Only the tidewood has a far copy (v11.188).
- **Everything on the main thread.** `sample()` is a pure function and world.js and region.js hardly touch THREE, yet a cell's grid,
  colours and placement are made between frames under a budget.
- **three.js r128 (March 2021).** It asks each program's result as it makes it, so the browser cannot compile in parallel (analysis_loading:
  the first visit of every preview freezes for seconds); no multi-draw (`BatchedMesh`), no uniform buffers, and the WebGL1 path keeps the
  16-unit ceiling alive.
- **The step follows the frame rate** (`dt=clamp(iv/1000,0,0.05)`), and the creatures draw `Math.random`: physics differs at 60 and 144 Hz,
  and no session can be replayed.
- **The docs are a tax on every session.** CLAUDE.md 95 KB, loaded before any work; HANDOFF.md 224 KB though it says "keep it short";
  2.6 MB of prose against 1.7 MB of code, the rules inside version history.
- **No type checking.** TypeScript treats files without imports as one global scope, which is Tethys's model exactly: `tsc --checkJs`
  over src/ with r128's types needs no file moved.
- **The game's loop is behind its world.** DIRECTION.md's loop is eaten keys opening physical doors (symbionts, stolen stinging cells,
  senses, minerals); none of the keys has code. The last hundred versions went mostly into the world.

## The person's answers (20 Nov 2026)

"Let's go with A, the public issue works well too. That's fine." — then yes to each, "in the order you described":

| # | what | status |
|---|---|---|
| 1 | the flight recorder, sent as a public GitHub issue (F9) | built v11.191 |
| 2 | the docs cut to rules and a map | built v11.192 |
| 3 | `tsc --checkJs` over src/, a baseline ratcheted down | next |
| 4 | the flora's detail by distance, from the recipes, measured by the recorder | |
| 5 | the cells generated in workers | |
| 6 | three.js to a current release | |
| 7 | a fixed step and seeded randomness in the sim (replays) | |

One door and its key, end to end, can go in at any point.

## 1. The flight recorder (built v11.191, src/rec.js; DESIGN "The flight recorder")

Recorded in the person's browser, always, sent only by F9: the machine (the GPU's name from `WEBGL_debug_renderer_info`, threads, memory,
the screen, the drawing buffer, the tier, the effects); the boot's stages; every play frame's interval and the CPU's phases (streaming, play,
creatures, effects, scene, HUD, the render's submit); where the browser has `EXT_disjoint_timer_query_webgl2` (desktop Chrome), the GPU's own
time by pass (the world, the horizon tier, the clouds, the world's shadow map); the frames by the 215 m cell they were played in, with the
worst frame's place for a bench; the 40 worst frames and what each was doing; every warning and error; Chrome's long animation frames.

Sent as **(a)**, the person's choice: F9 opens GitHub's new-issue page with a few lines and the session deflated into one line; the person
submits. The repository is public, so the report is (the GPU's model, the threads, the memory, the screen, where the animal swam). (b), an
endpoint of our own with no click, was not chosen. What a report cannot say: a time per draw on the person's card (the passes are the grain),
anything in a browser without the timer (the GPU line says so), the CPU's time inside a phase.

Read with `node test/report.js --search` (every report, a table by version, the newest in full) or `node test/report.js <file>`; its `AT=`
lines stand test/gpu.js and test/fill.js at a report's worst moment.

## 2. The docs (built v11.192)

Every session loads CLAUDE.md before any work, and HANDOFF.md is read next: together 320 KB, most of it history. Now:

| file | before | after | what moved where |
|---|---|---|---|
| CLAUDE.md | 97.8 KB | 40.5 KB | the rules kept, their version histories out; the test table to `test/README.md`; the long docs and source tables to `README.md` |
| HANDOFF.md | 223.6 KB | 6.7 KB | the five latest versions and what is open; the old file whole in `archive/HANDOFF-to-v11.191.md`; the archipelago's working notes to the end of analysis_archipelago.md |
| README.md | 10.1 KB, stale | 21.4 KB | the long map: every doc (the ones the old tables missed added) and every source file |
| test/README.md | — | 31.1 KB | every test and bench, how `--test` runs, how to write a test |

What stays long, on purpose: DESIGN.md (390 KB) and CHANGELOG.md (1.1 MB) are read a section at a time, never whole, and CLAUDE.md says so.
The rule that keeps it this way is CLAUDE.md's own: HANDOFF is current state only, five versions; history goes to the CHANGELOG.
