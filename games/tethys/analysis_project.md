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
| 6 | three.js to a current release | (v11.200's survey: r128's per-draw attribute check, WebGLBindingStates.setup, thrown out of optimised code 252 times in 400 frames); the look will shift (colour management, light units) unless pinned — the person, 22 Nov 2026: "that is perfectly fine", after the low tier's triangles |
| 7 | a fixed step and seeded randomness in the sim (replays) | the person's answer: a fixed 60 Hz step with the drawing smoothed between steps (22 Nov 2026); built v11.209 (the sim's own randomness) and v11.210 (the step); replays wait on step 5; §7 |

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

## 6. three.js to a current release (the spike, 22 Nov 2026; the groundwork built v11.215)

The spike (a throwaway branch, `claude/tethys-three-spike`, never merged) ran the game on r187 after a handful of fixes. The whole of it, about 4–6
days: loading (½–1 day: r187 ships only a module); small API changes (½ day); four visible breakages (1–1½ days: the creatures' shadows, which take a
depth texture now; the refraction's copy of the frame, a FramebufferTexture; the sun lighting by the camera's depth again, a chunk renamed under
scene.js's regex; thinLight's translucency, the Lambert chunk rewritten); light units (½–1 day, with the person: the sun and sky convert exactly,
×π, but point lights fall off by a physical decay — the glows, the vents and the lures tuned by eye); tests (½–1 day: the cone and the lathe come out
slightly different, so test/bench.js's fingerprints move once, and the stub and test/gpu.json with them). It buys: V8 bail-outs inside three.js in 400
frames 336 → 75 (v11.200's worst, WebGLBindingStates.setup, gone), shaders compiled in the background (KHR_parallel_shader_compile), BatchedMesh.
It costs: the boot 9 → 12 s on the software GPU, cause unknown; lighting per pixel where r128's Lambert lit per vertex.

The person, 22 Nov 2026: "yes absolutely … we should do it", after the tower's F8 with v11.212 in (#169) — the tower is triangle-bound, and per-pixel
lighting moves cost the other way — with r128 kept switchable until both are compared in a preview.

**Built v11.215 (three.js-ready), on r128, before the upgrade:** what could be done without changing a pixel. three.js comes in as a module — r128's
own module build, the same 459 exports as its single file (loader.js `tethysStart`; dev.html and the bench page, a module script before the src files
deferred) — so the upgrade's loading half-day is spent and measured apart from it: the first frame the same (3.96–4.12 s against 3.56–4.22 s, a fresh
page in headless Chromium), so the spike's slower boot is r187's own, not the loading's. And the spike's fixes that work on both versions are in, each
by what exists rather than by version where it can be (grep `three.js-ready`): the refraction texture's format and `copyFramebufferToTexture`'s
arguments by `THREE.REVISION`; `DataArrayTexture` (its r138 name) or `DataTexture2DArray`; a pool's upload by `updateRanges` (r159) or `updateRange`;
`vColor.rgb` wherever a shader reads the vertex colour, which a later three may make a vec4. Pictures at five places the same to the bit, base against
this; test/gpu.json's counts unchanged. The breakages, the light units and the tests remain the upgrade's own.

**Built v11.218 (the breakages mended both ways), on r128, before the upgrade** — the person, 23 Nov 2026: "as for 1 and 2, I agree yes". The game now
runs on r187 looking as on r128: the bench page's seeded frame at its seven places, r128 against r187 (test/benchpage.js THREE=187), a mean change of
0.00–0.43 levels of 255 (0.1% of pixels or fewer move by more than 24), where it was 14–67 before; on r128 every picture the same to the bit. What r187
broke, and how each is mended (scene.js `T187`; only r128 and r187 are tested):
- **The plants did not draw** (not in the spike's list: its run predates v11.215's version of the pulled colour). r187's `vColor` is a vec4 whenever it
  is declared; v11.215 wrote a vec3 for it there. Every pulled pool's program failed to link. `VPULL_COLOR` by version.
- **The creatures' shadows**: r187's own depth pass packs nothing (its map keeps depth in a depth texture), and where depth is packed (`depthFor`) its
  bytes run the other way round (most significant in red). On r187 the casters take a depth material that packs (`SH_DEPTH`; r187 declares
  customDepthMaterial on every object, so no shape changes), and `shDepth` unpacks r187's order — r128's order read r187's bytes as noise (acne).
- **The surface from below showed the sky**: r187 draws a transparent double-sided material in two passes; the surface's fog and refraction came out
  wrong in them. `oneP`: one pass, as r128 drew it (forceSinglePass), on the five such materials.
- **The sun by the camera's depth**: r187 lights Lambert by the pixel and calls `getDirectionalLightInfo( directionalLight, directLight )`; the regex
  takes that form too, in the fragment.
- **Translucency** (thinLight): r187 has no front/back light per vertex; the share of the far face's light goes into `RE_Direct_Lambert` by the pixel.
- **The look**: colour management off and the output written linear, as r128 did; the light units exact, not by eye — r128's three multiplied every
  light's colour by π in its legacy mode, so intensities are set ×π on r187 (`LI`) and read back ÷π (the snow, the halo), and r128's point-light
  falloff replaces r187's in `lights_pars_begin`.
- **The refraction's copy** goes into a FramebufferTexture (r187 copies into nothing else), a new one at a new size.
Left for the upgrade itself: lighting is per pixel on r187 (the pictures above say it reads the same here; its cost on the person's GPUs is the tower's
question), 59 programs to r128's 45 (r187 keys programs on `opaque` and `vertexNormals` too: more compiles on a cold first visit, which r187's
`compileAsync` can take off the main thread), the cone's and the lathe's slightly different shapes (test/bench.js's fingerprints), the stub's version.
**The spike's slower boot does not reproduce** on today's code: a fresh page in headless Chromium, the first frame 4.64/4.77 s on r128, 4.82/4.91 s on
r187 with its minified core, the world in no later (28.0/28.9 against 28.1/33.1 s). cdnjs's minified r187 module imports its *unminified* core
(cdnjs minified the module itself): 0.57 MB on the wire against 0.31 with an import map pointing it at the minified core — the build's loader needs
that map when it moves to r187.

## 7. A fixed step (the person's answer, 22 Nov 2026; parts 1 and 2 built v11.209, v11.210)

Asked between (1) the sim's randomness seeded and each frame's length recorded — replays and exact tests, no change in feel — and (2) a fixed 60 Hz
step with the drawing smoothed between steps — physics the same at any frame rate, the sim a fraction of the cost at 120 Hz and over, every moving
thing reworked. The person: "for 1, yes please option 2 … Great ideas on this especially for a fixed timestep."

**What it is here.** The loop steps once a frame by the frame's own interval (`dt=clamp(iv/1000,0,0.05)`): the 4060's 144 Hz steps 2.4 times as
often as a 60 Hz screen, each step smaller, and the work tower at 30 fps steps 33 ms — contact, drag, the chains' verlet and every rate integrate
differently on each. And the sim and the eye candy draw from one `Math.random`: a faster screen draws more particles, which moves every number a
creature draws after them. So a fixed step alone would still not make the world the same at every frame rate.

**The parts, each its own version:**
1. **The sim's own randomness** (v11.209): every draw that changes the world's state — a creature's choices, spawns, combat, the player's body —
   from `SIMR`, a seeded stream of its own; `Math.random` left to what is only seen or heard (particles, snow, sparks, sound). Nothing else moves.
2. **The fixed step** (v11.210): an accumulator in main.js; the sim (`simStep`: the clock and the tide, the player, the schools and creatures,
   contact, the camera's follow, eggs, sheds, the ledger, the line's clocks, wounds and states) at `STEP` 1/60 s, at most three a frame (a longer
   frame slows the world, as the 0.05 clamp did); what is only seen — streaming, the atmosphere, particles, culling, lights, shadows, sound, the
   HUD — once a frame on its own interval. The drawing interpolated: the camera, the player's body and each creature's set between their last two
   steps by the fraction of a step since the last (`alpha`) for the render and put back after it, the shaders' clock at the same in-between time.
   **test/step.js**: one world run at 30, 60 and 144 Hz has the same creatures to the bit after the same seconds — any eye candy that feeds the sim,
   or a draw left on the wrong stream, breaks it.
3. **Not yet: a replay from a recording.** The cells load under a wall-clock budget, so the step on which a cell and its creatures arrive still
   follows the machine; tying the cells' generation to steps is step 5's (the workers).

**What it costs, expected:** at 60 Hz the same work. At 144 Hz the sim runs 60 times a second, not 144 (its ~2 ms on ~42% of frames). At 30 fps,
two steps a frame (the tower's sim 1.9 → ~3.8 ms; its frame is the GPU's). The smoothing: a few hundred transforms set and put back a frame.
Measured in each version's pull request.

