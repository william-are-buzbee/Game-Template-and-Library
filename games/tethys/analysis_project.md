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
| 3 | `tsc --checkJs` over src/, a baseline ratcheted down | built v11.193 |
| 4 | the flora's detail by distance, from the recipes, measured by the recorder; then the tier that follows the machine | built v11.194, off, **struck v11.201** (they cost more than they saved); the tier built v11.199: a loss on the proxy; the person's reports decide |
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
| CLAUDE.md | 97.8 KB | 40.7 KB | the rules kept, their version histories out; the test table to `test/README.md`; the long docs and source tables to `README.md` |
| HANDOFF.md | 223.6 KB | 6.7 KB | the five latest versions and what is open; the old file whole in `archive/HANDOFF-to-v11.191.md`; the archipelago's working notes to the end of analysis_archipelago.md |
| README.md | 10.1 KB, stale | 21.4 KB | the long map: every doc (the ones the old tables missed added) and every source file |
| test/README.md | — | 31.1 KB | every test and bench, how `--test` runs, how to write a test |

What stays long, on purpose: DESIGN.md (390 KB) and CHANGELOG.md (1.1 MB) are read a section at a time, never whole, and CLAUDE.md says so.
The rule that keeps it this way is CLAUDE.md's own: HANDOFF is current state only, five versions; history goes to the CHANGELOG.

## 3. The type checker (built v11.193)

`node test/types.js` (and `npm run typecheck`, in CI's quick job on every pull request): TypeScript 7 reads src/*.js as the scripts they are —
one shared scope, as the build's IIFE has them — with three.js r128's types (`@types/three@0.128.0`) and `@wb/core`'s own source
(`types/globals.d.ts`); nothing is converted or emitted, and the whole game checks in about a second.

**What it found on its first run** (199 errors, 20 Nov 2026): no live bug. Most was noise — the DOM's narrow types (an event's target, a style's
opacity as a string), data hung on three's objects, tables of tuples it cannot type unhinted, `WB` (the vendored file reads as a CommonJS module;
declared from core's source instead). The real items, fixed, each changing nothing the game does:
- `fx.js` `DSP`: `size` twice in one literal (1.5, then 0.8, which won); the dead first dropped. (The dusk displays are off.)
- `region.js`: a composite's record pushed without `pin` beside the pins' with it — one shape now (`pin:false`).
- `horizon.js`: the tops given `to` after they were made — in the literal now.
- `main.js` passed `dt` to `updateMenu()`, which takes none; `palk` read `arguments` (TypeScript 7 no longer reads that as variadic) — rest
  parameters now.
- Type hints on the tables of tuples (`PLANETS`, `WCOL`, `WOPEN`, `WMAP_BANDS`) and the canvas.

**What a check of plain JavaScript cannot see**, and what was done about it: a misspelt key on the game's own objects. In JavaScript an object
literal takes any key, so `player.poss` passed. A JSDoc type that lists an object's keys closes it, and then the checker flags a key misspelt
*and a key set that is not in the list* — the shape rule (CLAUDE.md, "Performance"), held at check time on every path, not only where a test runs.
Three are closed now: the record (`Rec`), the creature (`Creature`, its 149 keys) and the player (`Player`). The first two were clean. **The
player was not**: twenty of its keys (`fovKickT`, `nudgeD`, `eaten`, `away`, `hopT`, `oxyD`, `turnV`, `accV`, …) were set only as play went, so
the object read every frame changed shape for its first frames — declared in its literal now, unset, which reads the same.

**Not caught in JavaScript at all**: a missing argument (every parameter of a JS function is optional to the checker; extra ones are caught).

**The ratchet** from here: the baseline (129) goes down as errors are fixed, never up; the next objects worth closing are `DEFS` rows, a
chunk, a hold. And step 6 (three.js upgraded) starts by swapping the types: every r128 call the new three.js no longer has will be on the list.

## 4. The flora's far copies (built v11.194, off by default)

**The first reports** (#137, #138; a work tower, Intel UHD 730, the same machine both): high tier 82 ms a frame, the GPU's own 84 (the world's
pass 75), 3.9M triangles drawn; `#low` 33 ms, the GPU 35, 1.6M triangles. The GPU fell with the triangles (×0.41 against ×0.40), not with the
pixels (×0.81) — but the low tier thins the plants, which takes their pixels' overdraw with them, so the two are not apart.

**Where the plants' triangles are** (in headless Chromium at the bench's places, every instanced mesh's instances by their distance): at the
forest 4.7M triangles asked of the GPU, 2.7M of them on instances past FLORA_FAR that leave the vertex shader at once; of the ~1.9M shaded,
1.1M at 250–450 m, 0.46M at 150–250, 0.42M within 150. The shore and the canopy alike.

**What the fog leaves of them** (the pooled plants past a distance hidden, the picture compared pixel for pixel with the whole): under the water at
the forest and the canopy, past 250 m almost nothing (≤13/255 on a few hundred pixels); at the atoll's clear water past 300 m faint silhouettes
still (5,662 pixels, ≤19); in the air everything. So the far plants are kept, not cut.

**The copies:** every pulled species rebuilt at half its sides and segments (`GEO_K`), its parts under 5% of the plant left out: ×0.61 of the
triangles over the 63 species (`test/lod.js`; the same plant, the same random draws), drawn past `LOD.dSea` 150 m in the water and `LOD.dAir`
120 m in the air on the pool's own buffers. Unseen in the pictures but for a speckle along the far stipes (1–2 pixel lines): the forest 1,209
pixels by ≤23/255, the atoll 8,808 by ≤61, the shore 183. **The plants' shaded triangles ×0.71–0.75.**

**What it cost** (`node test/perf.js`, against main): the GPU's time on the proxy ×1.06–1.08 *worse* at the forest, the shore and the canopy;
renderFrame's CPU ×1.37–1.48; 45 more draws a frame; no program compiled more (the twins share them). Two reasons: every far instance still
runs the whole plant's vertex shader only to leave it, and every near one the copy's — the same thrown-away vertex work v11.187 took out
(×0.80 at the shore then) — and a species is a draw more. **So it is off** (`LOD.on` false; `#lod` turns it on), and the default is the
game as it was (the counts and the pictures checked the same).

**What would do it without the waste:** two pools a species, near and far by cell, a cell's block moved between them as the camera goes —
no instance runs a shader it leaves; the full plant for the cells within the distance, the copy for the rest. By the numbers above about the same
~25% of the plants' triangles (a near cell holds plants out to 300 m), the draw more each species still, and a real rework of the pools.

**What the reports point at instead:** the tier. `#low` took the same machine from 82 to 33 ms; it is chosen today only on small touch screens.
A weak card on a desktop gets the high tier's density, distance and casters. The recorder can see the GPU's own time at the start, so the tier
could follow what the machine does rather than what it is called.

**The person's to decide** (open, 21 Nov 2026): a report each way on the tower at one place — the preview as it is, then with `#lod` — settles
whether the copies help a real weak card (the proxy's SwiftShader is not one); then whether to build the two pools, or the tier that follows
the machine first.

**The person's answer (21 Nov 2026)**, after the work tower's `#low` reports (#148–152: 25–31 ms of GPU a frame at low against 82 at high, #137):
"Yeah let's just go for option 2" — the tier that follows the machine, before any more evidence on the copies. **Built v11.199** (scene.js
`TIER_K`, `tierStep`, `tierFrame`; DESIGN "Performance and the quality tier"): each browser keeps a verdict from its GPU's own time; the far copies
stay off and their question open.

**The copies struck (21 Nov 2026).** The person: "The far copies can be kept in for now as they look no different to me and they only are at
'risk' of improving performance. if I'm wrong about that, axe them." They were off by default (what the person saw was the game without them), and
on they cost more on every machine: renderFrame's CPU ×1.37–1.48 and 45 draws a frame, the proxy's GPU ×1.06–1.08 (#144's home report, with
`#lod` at another place, read 4.5 ms of submit against 2.9). So, by the person's own rule, **struck in v11.201**; the uniform cut stays.
