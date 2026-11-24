# CLAUDE.md — tethys

The rules and a short map. Read this first, then `HANDOFF.md` (where things stand), then the `DESIGN.md` section of any system before touching
it. History is `CHANGELOG.md` (every version; grep it, never read it whole). Every test and bench: `test/README.md`. What every doc and source
file is for, at length: `README.md`. The plan for the project as a whole: `analysis_project.md`.

## What this is

An underwater exploration game in one three.js file. Subnautica-like: no tech, no oxygen — swimming, an ecology, predators, a surface to breach
and land to flop onto. The player is one animal of a convergent-evolution roster: the three roster players are **soft-arm** (a ringmouth jetter),
**finback** (a slowblood) and **coilshell** (a ringmouth with a flat coiled shell), and any founder species can be played. three.js r128 from
cdnjs (its module build since v11.215, copied onto the global `THREE`), the game itself no module, no framework; the one library is `@wb/core`. Old-school low-poly: boxes, lathes and spheres, flat shading,
countershaded vertex colours; the fog is the look. Text in the game: minimal, lowercase, letterspaced serif, only when needed. 1 unit = 1 m; the
player is a 3–3.5 m animal.

**The rule (8 Sep 2026): the island is fully believable from its logic — no biomes, no magic, even for gameplay.** If a thing can't be derived
from a young shield volcano (ours is 3 Ma), a big close moon, 28% oxygen, iron, the silled basins' chemoclines where the region model puts them
(the person, 10 Nov 2026; GLOBE §9.1; `oxyAt`, `chemoAt` — round ours an oxic deep with an oxygen minimum; `chemoD`: a basin is anoxic only when
the food raining onto its sill outruns its inflow's oxygen, and none in today's world is) and the founder lines, it goes. No place has a name; every species
places itself by a tolerance envelope over the condition fields. Nothing glows, floats or moves without a physical reason; eyeshine is a
reflection; bioluminescence only as events. Earth is reference, never template. **The one exception (the person, 23 Nov 2026; LINEAGE
§7c, a rough draft): the sparkle**, a parallel ecosystem over the world, marked on everything that carries it, which may excuse physics
and size where that makes it a better mechanic; everything without the mark stays under this rule.

## Build, test, run, look

Run in `games/tethys`; from the repository's root the same are `npm run build -w games/tethys` (also writes `dist/` for the site),
`npm test -w games/tethys` and `npm run dev -w games/tethys`.

```
node build.js            tethys.html (everything inlined), dev.html (src/*.js loaded separately), src/INDEX.md (every top-level name, its line)
node build.js --test     the build, then every headless test on both tiers; exit 1 on any failure (JOBS=n side by side, SHARD=k/n one part)
node serve.js            http://localhost:8080/dev.html (edit and refresh) or /tethys.html (the build)
node test/types.js       the type checker over src/ against its baseline, test/types.json (also `npm run typecheck`, which CI runs)
npm run smoke            the browser tests CI runs: node test/gpu.js --check, node test/boot.js
```

- Node 22. Python is **not** on the person's PC; `build.py` is the same build for sandbox sessions. Change `build.js` and `build.py` together:
  their outputs are byte-identical (check with `cmp`).
- `tethys.html`, `dev.html` and `src/INDEX.md` are build output: gitignored, never edited. Run `node build.js` after a clone. The build stamps
  the CHANGELOG's last `## vX.Y` heading into both pages (`window.TETHYS_BUILD`): it is the version a report says.
- `@wb/core` is vendored as `vendor/wb-core.global.js` (one name, `WB`, first in `src/order.txt`), committed; `npm run vendor -w games/tethys`
  rewrites it and `npm test` fails when it is stale. `mulberry` and `hashStr` are `WB.Rng` and `WB.hashString`.
- `--test` runs the tests that time themselves (`ALONE` in build.js and build.py) one at a time first, then the rest (`SIDE`) side by side,
  longest first. A new test goes in one list, in both files, with its seconds (`JOBS=1` prints them; they balance CI's three shards,
  package.json `"shards": 3`). Only an `ALONE` test may read the wall clock.
- The headless tests concatenate `src/` in `order.txt` order against a stubbed THREE (`test/stub.js`: r128's own primitive points, real
  transforms) in Node. The world, terrain, collision and behaviour are real; rendering and sound are not. A new THREE API may need adding to
  the stub.
- **The type checker** (`test/types.js`; tsconfig.json, `types/globals.d.ts`): TypeScript reads src/*.js as the scripts they are, with r128's
  types (`@types/three@0.128.0`) and `@wb/core`'s source; nothing is converted or emitted. Its old errors (mostly the DOM's narrow types) are
  counted in `test/types.json`; a count that moves either way fails — a new error is a bug to fix, a fixed one is `--update`d, so the baseline
  only goes down. In JavaScript a plain object takes any key unchecked, so the checker guards the game's own objects only where they are
  typed: the record (`Rec`, world.js), the creature (`Creature`, creatures_ai.js) and the player (`Player`, player.js) are closed shapes
  listed beside their literals — a key misspelt or set that is not there is an error, the shape rule held at check time. A key added to one of
  those literals goes in its typedef too. When the checker is wrong, say why in a JSDoc type or `types/globals.d.ts`; never `@ts-ignore`.
- The benches are not in `--test`: `test/perf.js` (the pull request's table), `test/gpu.js` (exact GPU counts, held in CI), `test/fill.js`
  (GPU time per draw, a proxy), `test/frames.js`, `test/bench.js`, `test/bench_creatures.js`; the person's own machines: `test/report.js`.

## Delivering a change

1. Edit `src/*.js`; a new file goes in `src/order.txt`. Content is usually `creatures_defs.js` (stats, spawns, envelopes) and `flora.js`. A new
   creature is a **spec** in `creatures_spec.js`: made in the lab (`#lab`), exported (its `PAL`/`DEFS`/`ROSTER`/`SPECS` lines), its `SPAWN`
   envelope by hand. A part the kit lacks goes in `PARTS`: its styles in `reg` with their clades (and `cores`, `params`), every parameter with
   its `label`, bands and default on its line (`test/registry.js` fails otherwise). There are no hand builders. A new plant is a `species()` in
   flora.js from grow.js's bauplans.
2. `node build.js --test` green on both tiers; `node test/types.js` holding (or `test/types.json` lowered with `--update` when errors were
   fixed); **what it costs measured** if it touches a hot path ("Performance"); `node test/gpu.js --check` passing or `test/gpu.json` updated
   with the change.
3. **Look at it.** `node serve.js` (or the `tethys` launch config in the repository's `.claude/launch.json`) and `dev.html` in the app's browser
   (or `npm run look -- games/tethys` from the root): play to the changed
   thing, screenshot it. A hidden pane does not tick and its 0×0 viewport NaNs the menu: keep it visible, or drive the loop from the console —
   stub `requestAnimationFrame`, hold `player.pos`, call `loop(last+16.7)` a frame, and post `renderer.domElement.toDataURL()` to
   `/_bench/<name>.png` (serve.js writes `test/render/<name>.png`). A creature: also `node test/preview.js <id>`. "Unseen" in the CHANGELOG is
   only for what could not be looked at: the sound, and the person's GPU (but through a report).
4. `CHANGELOG.md`, oldest first: `## vX.Y — title (date)` — what changed and why, the knobs by name, what was seen, what it cost, and an
   **"Unseen, ask in this order"** list. Patch versions (`vX.Y.Z`) for fixes after the person looks. Update the `DESIGN.md` section whose
   numbers moved; a design doc gets a status note at its head when a pass builds or strikes it.
5. `HANDOFF.md` is current state only: the new version's short paragraph at the top, and whatever is no longer true removed. No history in it.
6. One commit and one pull request per version, on a `claude/…` branch, the message the CHANGELOG heading. The root `CLAUDE.md` has the rest
   (the identity, never `main`, never force, no rebase or hard reset). The person's merge is the release.
7. `main` is the live game at `https://william-are-buzbee.github.io/Game-Template-and-Library/games/tethys/` (`map.html` beside it); a pull
   request's preview is `…/preview/<number>/games/tethys/`, linked on it and removed when it closes. The old site `william-are-buzbee.github.io/Tethys/` stays as it was.

Without a PC (the claude.ai sandbox): copy `tethys.html` to `/mnt/user-data/outputs/` and zip the folder as `tethys-src.zip`.

## Performance: every change says what it costs

The person (14 Nov 2026) plays the previews, feels lag, and puts the performance pass off — so lag piles up over versions nobody can name
(`sample()` doubled over v11.137–147 unmeasured). So every change that touches a hot path measures itself before and after, and its pull
request says what it cost before the person plays it (the root `docs/decisions.md` 26; the `perf` skill).

- **`node test/perf.js`**: the files the branch changed since its merge base with `origin/main` (the working tree counts), the benches they
  call for run against the sources from before, the pull request's table printed (and `test/render/perf.md`). `--all`, `--only gpu,frames`,
  `--ref <commit>` (which version moved a number), `--dry`. By hand: `git archive origin/main games/tethys/src games/tethys/vendor
  games/tethys/shell.html | tar -x -C <dir>`, then a bench with `BASE=<dir>/games/tethys`.

  | the change touches | the bench (`--only`) | it says |
  |---|---|---|
  | world.js, region.js, util.js — anything `sample()` reaches | `test/bench.js` (`world`) | the load, µs a sample over five windows, every piece the same or not |
  | creatures_*.js, physics.js, parts.js, combat.js, fx.js, player.js, the frame loop | `test/frames.js` (`frames`) | ms a frame of the creatures' work at the forest, the simulation the same or not |
  | a creature's build, chunks.js, flora.js, grow.js, ecology.js, reef.js — a cell's generation | `test/bench_creatures.js` (`creatures`) | every kind's build, ms a cell at five places, every body the same or not |
  | anything drawn: every src file but audio, save, input, the menus and the dev tools; shell.html | `test/gpu.js` (`gpu`) | draws, instances, triangles, programs, uniforms, passes, bytes uploaded and copied, readbacks, compiles at first sight, at seven places — exact counts |
  | what a shader costs per vertex and per pixel | `test/fill.js` (`fill`) | each draw timed alone under software WebGL, vertices and pixels apart, and whether the picture moved — a proxy, not the person's GPU |
  | content: a species, a plant, a knob | its system's tool | more of a thing is more cost: more builds, creatures and draws |

- **The pull request says it**: a before/after/ratio table under "What changed", the same in the CHANGELOG entry. Worse by more than 10%
  anywhere goes in its first line, with why it is worth it. What could not be measured, it says.
- **The shape rule**: an object read every frame or every sample is made with all its keys at once, in one literal, in one order — never a key
  added later, never `delete`, never built key by key from a list (a dictionary: every read a lookup by name; a third of the cost twice,
  v11.148–149, seen only by a profiler). `SHAPES=1 node test/frames.js` counts the hot tables' shapes; a new hot table goes in its `__tables`.
  **A function V8 keeps throwing out of optimised code** runs in a slower tier and boxes every decimal (garbage): `node test/deopts.js` lists
  the sites thrown out again and again during play (v11.200; islandH's was 25 times and 2.5× the time, v11.197).
  Open: the `FLORA` entries are 46 shapes for 92 (read at a cell's generation, not every frame).
- **When the person says it lags:** ask for a report — F9 after playing — and read it with `node test/report.js --search`: the machine, the
  frames by phase, the GPU's own time by pass, the worst places with their `tp()` and an `AT=` line that stands test/fill.js and test/gpu.js at
  the worst frame. GPU time running away from the CPU's is draws, shaders and fill, which no CPU pass helps. Else measure the place
  (`PX= PZ= node test/frames.js`), then `BASE=` older versions to find the one that moved it. The reports' table by machine and version shows a
  creep on the person's own hardware.
- **In CI** no time is held (shared runners are noise). The deterministic proxies are: the records' shape (`test/records.js`), the creatures'
  (`test/live.js`), the build tape's replay (`test/registry.js`) and **the GPU's counts**: `node test/gpu.js --check` fails when a count at any
  place moves more than 10% from `test/gpu.json`. A change that means it runs `--update` and commits the file, so the diff shows what moved. The
  counts are the same on any machine (the bench's clock, `Math.random` seeded, the high tier at pixel ratio 1, 1600×900): a session's and CI's agree.

## Layout

`shell.html` the page (the build puts the scripts at `<!--SCRIPTS-->`); `src/` the game; `build.js`, `build.py`; `loader.js` tethys.html's loader (three.js and the world cache, then the game); `tsconfig.json` and `types/` the
type checker's; `serve.js` the dev server and
the sound bench's sink; `test/` the tests, the stub, the benches, the previews (`test/README.md`); `vendor/` `WB`; `tools/` vendor.js and
dist.js; `archive/` old docs kept whole; the design docs.

| src file | owns |
|---|---|
| rec.js · probe.js | the flight recorder (loaded first) · the probe (F8: each part of the frame skipped in turn on the person's GPU, v11.208). The recorder: every frame by phase and place, the GPU's time by pass (`recGpu`), the worst frames, the errors; F9 / `report()` sends it, `machine()` names the browser |
| util.js | math helpers, `mulberry`, value noise |
| world.js | the world as a function: `sample(x,z)` → the ground and nine fields `FI`; `envW`; tide, clock, sun, moon, the year, weather, waves; the water's colour and plankton; landmarks `LM`; oxygen; aprons; reef caps `CARB`; `lightPhys`; the wood `woodAt` |
| region.js | the region as a plume's history (`regionModel`, `REGION_K`); at load its members become the `ISLANDS` records (`rgBuild`) and its floor the world's (`rgFloor`) |
| physics.js | contact: the collider hash, capsules, verlet chains and rigs, body push, disturbance lists |
| scene.js | the tier `Q`, renderer, camera, lights, the fog, shadow maps, every shared material, the resolution `RES` |
| parts.js | the geometry kit `part`/`merge`, arm rigs and poses, `swimClock`, LOD bakes, the build tape |
| grow.js | the flora grammar: bauplans, `pigment(h,line)`, `species()`, `VPULL` |
| creatures_builders.js · creatures_spec.js | `PAL` and the part kit · the spec compiler: cores, `PARTS`, `compile`, `validate`, `derive`, `coatFor`, `SPECS` |
| flora.js · reef.js | the species, rocks, big structures and `FLORA` · the sessile structures appended to it |
| creatures_defs.js | `DEFS` (roles, behaviour, `defPhysics`), `SPAWN`, `ROSTER` |
| creatures_ai.js | spawning, LOD, behaviour by role, hunger, the clock and the risk (v11.228), carcasses, eggs, the frame's update |
| chunks.js | cell streaming: grid, terrain, flora placement (`settleOn`, `clearOf`), the pools `POOLS`, solids, spawns, culling, `ORIGIN` |
| ecology.js | the ledger `POP`: capacity, the off-screen model, births owed; the fine box and coarse patches |
| far.js | past the cells: far terrain, the apron, big structures, impostors, the water and floor maps (`wmAt`) |
| player.js · line.js | the player as a spec, movement, camera, abilities, the stomach · the line across generations: clutches, broods, moults, the editor at conception, the handover |
| atmosphere.js · clouds.js · horizon.js | the surface, sky, rain, haze, shafts, snow, fog and light by medium, HUD · the cloud field, caps, cloud fog, showers, the volume · the horizon tier; `renderFrame()` |
| combat.js · fx.js | holds, the edge and covering, wounds, blood, the player's grab and bite · debris, `bodyPose`, `hitFx`, the night's lights |
| audio.js · bench.js | procedural WebAudio · the sound bench |
| effects.js · worldmap.js · save.js | the effects list (`e`) · the world map (`n`) · slots, the profile, `startNew`/`startFrom`, `slotDeath` |
| step.js | the fixed step (v11.210): `simStep`, the accumulator's constants, the drawing between steps (`lerpSnap`, `lerpApply`, `lerpRestore`) |
| menu.js zoo.js lab.js · input.js main.js | the menu, the bestiary, the creature lab · input; the boot `BOOT`, the frame loop, the readout |

**The docs**, most upstream first (each at length in README.md). When a doc's Open list says a choice is the person's, ask.
`PLANET.md` the planet, its rules and the roster — the game changes when it conflicts · `TAXA.md`, `FLORA.md`, `REEF.md` the sessile life
(TAXA wins) · `CLADES.md`, `DRIFTERS.md`, `CREATOR.md` the bodies and the lab, `VARIETY.md` the individual, `BEHAVIOUR.md` what they do · `ARCHIPELAGO.md`, `GLOBE.md`, `DEEP.md`, `SEAFLOOR.md` the
islands, the region and the deep — read before placing an island or touching `CHEMO` · `PLANKTON.md`, `BIOLUM.md` (before any light on a
creature), `CLOUDS.md`, `WATER.md`, `PIXEL.md`, `POLISH.md`, `COMBAT.md`, `AUDIO.md` (every number chosen blind), `LINEAGE.md` ·
`DIRECTION.md` the game's loop; its Open list is the person's · **`DESIGN.md` the reference: a section per system, its numbers, knobs and
reasons** · `analysis_*.md` reviews with the person's answers (project, loading, fog, sessile, archipelago with its working notes, flora
diversity, believability, review) · `CHANGELOG.md` history · `HANDOFF.md` now · `IDEAS.txt` the person's backlog · `archive/` old docs whole.

## Architecture

- **The world is a function.** `sample(x,z,out)` (world.js) is the one truth: the ground and nine fields (`FI`: sub, flow, expo, nut, turb,
  young, heat, shel, rel), analytic geology plus fbm; no biome ids anywhere. The height alone is `sampleH(x,z)` (v11.205: no array made for fields nobody reads). The islands are records (`ISLANDS`, `islandH` in each island's own
  frame: ours, the giant and region.js's members) summed by smooth max over the model's floor (two records' meeting filled no higher than
  `FILL_TOP`, −20), found through the index (`RIX`, `recsAt` — never a loop over every record). `ISLANDS[0]` is ours and stays bit-identical but by a
  decision with its reason: check any change to `islandH` or `sample` against the last commit's world over the old square. Species and
  structures carry `env` envelopes (`envW`, 0..1). Landmarks: the chimney fixed by the geology, the rest searched at load (`findSpot`, seed
  4242, a fixed sequence — new ones go at the end).
- **Cells.** 215 m (`CELL`); the world a rectangle of 2,200×1,344 cells (`WORLD`; x `WX0`…`WX1` −110.1…362.9 km, z `WZ0`…`WZ1` −118.7…170.3 km;
  clamped by `worldX`/`worldZ`; `gridIn` its bounds); a table of cells is a `Map` by `ckey(i,j)`. `WORLD70`, the ±70.5 km square, is kept for the
  records' second pass, the flood's lattice and old saves. `NCELL` 240 and `HALF` 25.8 km are the old square: the grid's anchor (cell (0, 0) its corner,
  so every cell's place and seed holds) and the fine ledger's box. A loaded cell is a 49×49 grid, a terrain mesh, its flora as a block in each
  species' pool (the buttons, the rafts and the glow clouds keep a mesh per cell), its colliders and its creatures. `genChunk` is a generator
  run under a frame budget (`Q.budgetMs` at most: what the last frame left of `Q.target`),
  nearest first within `LOAD_R`: terrain → the structures' collision → cliffs → rock → flora (each asks `clearOf`) → landmarks → creatures.
- **Near and far.** far.js builds every big structure, coarse terrain in 4×4-cell regions, the apron to 2000 m past the edge, impostor cards and
  the water/floor maps; cells draw fine terrain and small flora on top (far vertices under loaded cells pushed down; impostors off within
  `FLORA_FAR`, 450 m, of a loaded cell). Above the water the horizon tier draws every island's land and the sea to 250 km in a pass under the main one;
  under water the far plane is the end. `bigsFor(i,j)` is cached so near collision and far drawing agree; everything sits on the ground by
  `settleOn`.
- **Flora.** `FLORA` entries: per-cell tries, envelopes, placement flags, a per-entry rng (order moves nothing); the photosynthetic tinted by
  `pigment(h,line)`; `species()` packs three variants into one geometry, chosen per instance.
- **Creatures.** `SPECS[id]` → `compile` (a core's frame; parts merged into the body or made rigs; `derive` the mass, drag, thrust, speed, turn)
  → `DEFS[kind]` (role, prey, reach, strike, behaviour by hand; speed, accel and turn never typed: `defPhysics` reads the build) and `SPAWN`
  (capacity, envelope) → the ledger → `placeKind`/`spawn` (geometry shared per kind in `KIND_GEO`; rigs the creature's own) →
  `updateCreatures` by role (boid, trap, watch, hunter, graze, wander, ambush, drift, sail, swarm; `coil` struck v11.230), then contact. A `swarm` has no spec,
  body or capsule and is drawn by the snow; its `SPAWN` row's `crop` flag makes its capacity the plankton's (`ecoCap` × `cropK`); it is food for
  any build with a sieve (`derive.filter` → `DEFS.filter`; creatures_ai.js `FILTER`), and `ecoOf` puts it on that kind's paper prey, never on
  `DEFS.prey` — never chased, held or bitten.
- **The ledger is the truth about who lives where** (ecology.js): `POP.n[entry][cell]`; capacity from mean `envW`; unloaded cells run the model
  every `ECO_STEP`; a loaded cell spawns from it and writes back. A kill goes through `kill()`, a creature leaving through `removeCreature`, a new
  spawn through `placeKind` with an `ent` (−1: outside the ledger, never counted or reborn). `SPAWN.n` is capacity; the equilibrium (`node
  test/census.js 120`) is the count. A loop over the ledger walks `POP.cells[ei]` (`ecoMark` adds to it, `ecoIndexAll` rebuilds it after a load), never
  every cell; an index is `ecoId(i,j)` (−1 in a coarse patch not split) and `ecoIJ(c)`, never `i*NCELL+j`; past the fine box the ledger is
  coarse patches, split round the player.
- **Combat** (combat.js, COMBAT.md): a fight is a hold — the grip (jaws, arms, claws, read off the spec) and the held body's capsule as one point;
  the struggle by mass in kilograms (`kgOfBody`). **There are no hit points**: a hold kept is a pin (subdued: `SUBDUE`; the struggle fades with
  the held body's `STAMINA`), then the placed act by the edge against the covering (`EDGE`: swallowed — a sequence, `SWALLOW` — opened,
  skewered, crushed, the nerve cord) or the hunter lets go. Every bite is the edge where the hold is (`biteOn`, `cutAt`): nothing
  through the covering is a bruise; through it, the bite's radius (`EDGE_RHO` × the gape) against the capsule's severs (`SEVER`), opens the
  vitals (`VITAL`) or wounds, bleeding from a volume (`BLOOD`: weak at 15% lost, collapsed at 30%, dead at 40%); the piece is the biter's
  food, and a body `TORN` 0.25 eaten is dead. Venom (`DEFS.venom`) and autotomy ride the hold; a wound edits a live copy of the spec and
  `derive` reruns (`speedK`, `turnK`); a hold on a part's own capsule (`hitOwn`) takes the part (`losePart`); a dropped arm keeps a stump and
  grows back (`RIG_STUMP`, `c.grow`). Hingeshells fed under a basin's chemocline or in the vents' heat are poison to eat (`POISON`,
  `DEFS.immune`). `DEFS.hp` is only the forage (≤1) / immortal (≥1e8) flag. A hunter commits its bite 0.25 s out and misses prey that dodges across the line (`MISS`); hungry hunters take a
  bleeding body within `SMELL_R`. Drifters and the coil's withdraw bypass holds. The player's death ends the slot's animal: you continue as the
  nearest living child of that life, or the save is over (line.js).
- **The frame** (main.js `loop`; v11.210, step.js): streaming → menu, zoo, lab → **the sim at a fixed step** (`simStep`, `SIM_STEP` 1/60 s,
  as many as the frame's time holds, at most `SIM_STEP_MAX` 3: clock and tide → `updatePlayer` → `updateCreatures` (and contact, the player among
  the bodies) → `finishPlayer` (pose, own arms) → eggs, ecology, the save and the line's clocks → pads, wounds, states) → the drawing set between the
  last two steps (`lerpApply`), the far schools' instances (`siFrame`), the camera (`camFrame`) → disturbers, snow, ink, splashes, blood → atmosphere,
  surface → cull, lights, shadows, audio → HUD, effects → render → the poses back (`lerpRestore`) → `recFrame`. **Moving a piece breaks contact
  silently.** Creatures past 150 m step every other step; `lodNear`/`lodFar` swap parts for baked meshes.
- **The quality tier** `Q` (scene.js) is numbers, never code paths; `#low`/`#high` force it; else this browser's verdict from its GPU's own time
  (v11.199, `TIER_SAVED`, `tierFrame`: low at once from the menu when high is far too heavy, else from the next start; `tier('forget')` in the console to judge
  again); else low on small touch screens, high elsewhere. A tier is read at load only: never change `Q` in a session. `Q.cldSh` 0
  leaves the cloud shadows out of the shaders (the low tier). `Q.march` is the cloud volume's steps and `Q.vol` the master volume — never one for the other (it once played the game at 80× gain).
- **Sound** (audio.js): one `AudioContext`; the space read from the geometry round the listener four times a second; beds from the world's
  numbers; an eight-voice pool for placed emitters; `M` mutes.

## Conventions

- **Dense formatting.** One statement per line, no spaces after `,` or `:`, `if(x)y;`, long lines are normal, semicolons always.
  `creatures_spec.js`, `lab.js`, `flora.js` and `reef.js` are multi-line from an old reformat; new code there is dense too. Never reformat
  existing code.
- **Names.** `UPPER_SNAKE` constants, knob tables and uniform arrays; `camelCase` functions; short locals (`c` creature, `d` def, `F` frame,
  `st` state, `sub` submerged fraction). Builders end in `B`, geometries in `Geo`, generators in `Gen` (`function*`, drained with `yield*`),
  GLSL strings in `_GLSL`, uniform objects in `U`. Scratch vectors `T1..T4`, `_m`, `_q`: nothing allocates per frame in a hot loop; `len3`,
  not `Math.hypot`.
- **Comments.** First line `// file.js — what it owns`; sections `// ---------- name ----------`. Prose says *why*, cites the doc (`PLANET`,
  `DESIGN Contact`), the version (`v11.27`) and what the person saw, with the date. The user is "the person".
- **Knobs** are top-level `const NAME=value; // meaning, units` or a table with a comment per key (`GRIP`, `ECO`, `AU_K`, `DERIVE_K`, `Q`). The
  readout's tuners change some live; bake a tuned value in by name.
- **Randomness.** `mulberry(seed)` wherever the world must persist (cells by index, species by `hashStr(id)`, landmarks 4242, noise 1337).
  **What a creature or the player does draws from `SIMR`** (`srnd(a,b)`; v11.209): a choice, a timer, a spawn's build, a hit's shove. `Math.random` (and
  `rnd`) only for what is only seen or heard — particles, snow, sparks, sound — so a faster screen drawing more of them moves nothing in the world
  (test/simrand.js fails on a sim draw left on `Math.random`). The benches seed `Math.random`, so one draw more at load moves every draw after it.
- **Units and frames.** 1 unit = 1 m, `GRAV` 9.8, y up, sea level 0, east +x, north −z, angles in radians from +x toward +z. **All creatures face
  +z.** A claws predator's `reach` (and an arms predator's past the near LOD) must exceed the contact distance of its and its prey's capsules or
  it never bites; a jaw bites when its mouth touches a capsule (`mouthOn`), its `reach` only the strike range's floor; near the player an arms
  predator takes hold when two arms touch the prey (`landsOn`). A day is 30 game hours in 40 real minutes; rates are per game day.
- **An animation's beat is a `swimClock`, never `t*f(spd)`**: `t` is the session clock, and `t*f` spins on every change of speed.
- **One scope, one library.** The bundle is one strict IIFE (`tethysMain`); any file may use any name from any file (`grep -n name src/*.js`
  finds its uses), and a top-level name is unique across files: a second declaration replaces the first without a word (`test/lint.js` fails
  on it). The library is `@wb/core` and nothing else: no `OrbitControls`, no `BufferGeometryUtils` (parts.js has its own merge).
- **Docs carry status.** "Built, unseen" means reasoned without a look; a doc's head note says what a later pass struck. Struck features leave
  the game; a kit may stay for reference, marked so.
- **Stale statements: fix when touched**; nothing is cleaned speculatively. Known stale: TAXA.md's header (says nothing is built); the
  CHANGELOG's two v11.18.1 entries; DESIGN's two Landmarks sections and `GRAV=14` at the head of The medium; "biome" wording in far.js and
  scene.js; the hand-builder branches in creatures_defs.js and zoo.js; reef `fill`/`drop`/`clear` handling no entry sets. **Left alive on
  purpose** (each says so where it lives): `GLOW` and the `f.glow` branches, for bioluminescence as events (PLANET Hooks); the `pads` path through
  grow.js, chunks.js and physics.js (an empty loop a frame); `y:'mid'`; `DEFS.glim`, `SPECS.glim`, `PAL.glim` (a species, kept — the person,
  15 Sep 2026).

## Things that bite

- **A `//` mid-line swallows the rest of the line** (v11.219): the code style is dense, and a comment added before more code on the same line hides
  that code with no error — the fill light's colours for six days (v11.175 → v11.219), the tier's frame (v11.202 → v11.207), a test's placing of
  traps. test/lint.js now fails on a line comment whose text runs two statements together; put a comment at the line's end, or `/* */` mid-line.

- **three.js is a module** (v11.215, three.js-ready; analysis_project.md §6): every release after r160 ships only that, so r128's does too here.
  tethys.html imports it in loader.js (`tethysStart`) beside the world cache's read; dev.html and the bench page (test/benchpage.js) with a module
  script before the src files, which are `defer` so the two run in order, before the page's load event. Either way its exports are copied onto a plain
  `window.THREE` (a namespace is frozen). Its address is `THREE_URL` in build.js and build.py (the bench page reads build.js's), and is in the world
  cache's hash. What differs between r128 and a current three and costs nothing to say both ways is said both ways (`THREE.REVISION`, a name that
  exists, `vColor.rgb`): grep `three.js-ready`. Since v11.218 what differs and is mended both ways keys on scene.js `T187` (r187, the upgrade's target;
  only r128 and r187 are tested): `test/three187.js` (smoke) boots it on r187 and fails on a shader that does not compile or a chunk not as expected;
  `THREE=187` before any bench runs that bench on r187. A shader string written for one version's chunk text is checked on both.

- **The world cache** (src/wcache.js, loader.js — cacheload.js until v11.215; v11.214): tethys.html carries a hash of the game's code (build.js `WH`, `TETHYS_BUILD.wh`), and
  what the load builds the same way every time for one build — the maps' first fill, the caustic tiles, region.js's platform and saddles (v11.216) — is read from IndexedDB (`world:<hash>`) before
  the game's script runs and taken instead of computed (`wcBuf`); a miss computes as always and the boot's end writes it (`wcWrite`). A new product
  goes the same way: its site asks `wcBuf`, hands what it has to `wcKeep`, and test/wcache.js holds it to the bit against a fresh build. A change to
  anything the product reads changes the code's hash, so nothing stale is read; dev.html, the benches and the tests carry no hash and never cache. A
  product that is one object of arrays and values goes through `wcProduct` and a maker of its own (region.js `rgPlatMake`, `rgSadMake`): one literal
  for the built and the cached, so a hot path reads one shape — an object rebuilt key by key from a list is a dictionary past a dozen keys, which
  test/wcache.js checks (`%HasFastProperties`). The island records themselves (regionModel, rgBuild) hold closures and are not cached.

- **The sim steps; the drawing does not** (step.js, v11.210; analysis_project.md §7). Whatever one step leaves for the next goes in `simStep`, on
  its `h` (never the frame's `dt`); whatever is only seen runs once a frame on `dt` and is never read by a step — the camera above all (`camFrame`:
  from the body as drawn and the heading as the mouse left it), the particles, the snow, the sway. A thing that moves goes in `lerpSnap` and
  `lerpApply` or it is drawn at 60 Hz on a faster screen; an instance buffer written from bodies is written again once a frame from them as drawn
  (`siFrame`). The sim reads `g.matrix`, so `lerpRestore` puts back the pose and its matrix after the render. test/step.js runs one world at 30, 60
  and 144 Hz and holds every creature to the bit; test/simrand.js holds the sim's draws to `SIMR`.

- **The start is a sequence** (main.js `BOOT`; analysis_loading.md). tethys.html runs the game after the page's first paint (dev.html cannot: it
  loads the files one by one); nothing is drawn
  until the world round the camera has streamed, and the cells wait for the store's answer (the last slot's ledger is what they spawn from).
  Leaving the menu ends the boot at once (`bootFinish`), so a test's `choose` works; a test that drives the menu's own frames steps until
  `__boot.done`. The warm-up compiles with the shadow map as play has it (three keys every program by it). A new material that draws at the
  start goes in `warmPrep`'s lists or is in the scene by `load`'s end; test/gpu.js's `sight` says what was missed. The camera note
  (`tethys.cam`) carries its slot's id; a slot's world and player are `slotWorld` and `slotPlayer` (`startFrom` is a clear and both).
- **A slot is written with its summary** (save.js; v11.195). The menu's list (`saveList`) is the slots' summaries (`sum:<id>`), never the slots,
  which are tens of MB once played long. Write a slot only with `slotPut` (never `storePut`: its summary would go stale), read one with `slotGet`,
  delete with `slotDel`; a field the list shows goes in `slotSum` and `slotEntry`. test/slots.js counts the whole reads.
- **A save in play is in slices** (save.js; v11.196). The ledger is binary streams of runs (`popBin`, `popJob`/`popStep`; `pop.bin`, SAVE_V 4),
  Blobs in IndexedDB (`slotPack` at the put, `slotUnpack` in `slotGet`: never read a slot from the store but through `slotGet`), plain arrays as
  text (`slotJSON`: the shadow, the localStorage store, an export — never `JSON.stringify` a record). In play save with `saveSoon` (walked
  `POP_SLICE` values a frame); `saveNow` is the whole save at once, for when the state is about to change under it (a new game, the page
  leaving). To the menu the walk begins at the key (`saveLeave`), the fade's frames walk it, and `saveFinish` ends it under the black (v11.204). A record from before (arrays of runs) still loads; test/ledger.js writes them to check.
- **A species' variants are pulled** (grow.js `VPULL`, scene.js `VPULL_GLSL`, chunks.js `VPULL_N`). On WebGL2 a variant species draws `f.gp`
  (vertices that carry only their number) with `f.mp`, and the vertex shader fetches its instance's variant from `VPULL_TEX`: a flora material's
  vertex code reads `transformed`, `objectNormal` and `vColor`, never the `position`, `normal` or `color` attributes. `f.geo` is still the
  packed geometry for the CPU (bounds, previews, the stub, WebGL1).
- **Every flora material's cut is a uniform** (scene.js `farCut`, `cutUOf`, `CUT_V`; v11.194): `uCut` (near, far, fade), the material's own
  (`m.cutAt` [far, fade], null for FLORA_FAR's). A new flora material sets `cutAt`, prepends `CUT_V` and sets `sh.uniforms.uCut=cutUOf(m)`. The
  generic far copies it was made for were struck in v11.201 (they cost more than they saved; analysis_project.md §4); the tidewood's own
  (`TREE_LOD`, a card's copy) stays.
- **Under water the surface is drawn first as an occluder** (atmosphere.js `SURF_OCC`, `OCC`): its facets outside the window write depth before
  the dome and the sky (the facet's cosine to the eye under `OCC.cv` 0.25; the window opens at `WIN_LO` 0.35). What must be seen through the
  surface from below is seen in the window or not at all; a thing drawn before renderOrder −12 is under it; a change to the window's rule
  (`WIN_LO`, `REFR_MAX`) moves `OCC.cv` with it.
- **Sixteen texture units** a fragment shader. The tinted materials use 7 on WebGL2 (the caustic's tiles one array, `CAU_ARR`) and the flora's
  vertex shader an eighth (`uPull`); WebGL1 is at 16 still — a new map there fails every compile. A new map channel goes in the water and floor
  maps (`waterMap`/`floorMap`, 1440×1440, filled together in `wmFill`/`wmBlur`: read in shaders at `(p - uWmO)*WM_SCALE + 0.5`, on the CPU through `WM_A`, `WM_I0`), whose free channels are
  used up (floor b and a the crops, water a the front's X).
- **A body is built once per kind and coat, then replayed** (parts.js `GEO_TAPE`, creatures_ai.js `tapeBuild`). A builder is a function of its
  spec, scale and palette; nothing in it reads a primitive's geometry or a part's transform but `merge` (while a tape plays they are not made:
  `G.*` returns `LAZY_G` and `part`'s `m` is null; `test/registry.js` finds a builder that does). A creature's own rigs, clocks and randomness are made as before; `BUILD_TAPE.on` false builds
  whole. **Every creature, its `st` and its def are one shape**: a key a creature takes as it lives is in spawn's literal (unset) and its
  `Creature` typedef, a `DEFS` key is in `DEF_KEYS`, a def is never written after load (`scaledDef` copies it flat); `test/live.js` fails
  otherwise, and the type checker on any typed path. The player is one shape the same way (`Player`, player.js).
- **Every record is one shape** (world.js `recNew`, typed `Rec`): every key any record carries, in one order; a key unset with `undefined`, never
  `delete`d (`test/records.js`). In the world's paths a distance is `hyp2(x,z)`, never `Math.sqrt(x*x+z*z)`, which differs in the last place. Before and
  after any change to world.js or region.js: `BASE=<copy> node test/bench.js`.
- **A record's own objects are `rdata`'s** (world.js `RDATA`, `recSeal`; v11.197): rebuilt at the end of region.js's load on a prototype of their own,
  every field first `undefined`, so V8 never retires their shape (a plain literal's shape is shared with every object whose keys begin the same
  way, and one retired kept islandH out of optimised code for good: 2 KB of garbage a sample, 2.5× the time). A plain object put on a record
  after the load goes through `rdata`; `test/opt.js` fails on one that is not, and when islandH or sample ends unoptimised.
- **The wood is the terrain's** (scene.js `woodGLSL` on `TERRAIN_MAT`, horizon.js `HZ_WOOD`): `terrainColor` writes the canopy per vertex
  (`wo`) and the vertex shader raises it past `FLORA_FAR − FLORA_FADE`. A new terrain mesh passes `terrainColor` a `wo` array and sets `aWood`,
  or it has no forest; a change to `FLORA_FAR` moves the trees' fade and the shell's rise together. Collision and every height the game reads are the ground's, never the shell's; the depth pass leaves the shell down.
- **A record may be an oval** (region.js `RG_OVAL`: `rot`, `sc`, `asq`): its radii (`rimR`, `land.r`, `reach`, its bound table `hi`, `quiet`) are in
  its own frame, never closer than the world distance over `sc` — compare through `rgLoc`/`rgAt`/
  `rgAlong` or over `sc`, never against a world distance directly.
- **Contact** is physics.js: colliders in a per-cell hash (`addSolid/addCapsule/addPad/addEllipsoid/addRock`, `solidPush`, `bodyPush`),
  capsules (`worldShapes/resolveBodies`), chains and rigs (`makeChain/simChain`, `makeRig/rigSkin/stepRigs`, posed by `ringPose/tailPose`).
  Chain buffers hold ≤39 points and ≤160 segments a rig. Every species geometry gets a per-cell clone for its instance attributes (`aVar`, `aDip`).
- **No NaN in a uniform array**: the sway shader's `DIST_A/DIST_B` (`vec4[12]`), the light block's `uSunW`, `uCastA/B` — r128's `flatten()`
  passes a typed array through only if its first element is a number.
- **The light block** (scene.js `LIGHT_GLSL` in `addTint`): the caustics and the bodies' shadows in every tinted fragment; `LIGHT_FX` false
  strips it if the GLSL fails (a black or magenta world at boot). `thinLight` regexes r128's Lambert chunk and warns rather than fails. Shadows
  are read by hand (`updateShadow`, `updateShadowS`, after `assignLights`), never through `receiveShadow`; the static map redraws only when the
  sun turns, the camera drifts 20 m, a cell loads or a switch flips.
- **The fog is not three's.** scene.js rewrites the fog chunks and shares uniforms through `THREE.ShaderLib`, pinned to r128's `cloneUniforms`.
  The camera goes in by hand (`uFogC`/`uFogR`): three's `cameraPosition` is (0,0,0) on Lambert/Basic/Points in r128 — never read it in a shared
  chunk. Fog is per material: `MAT`/sway/`MATFAR` "small" (fade sooner: a structure built with `MAT` vanishes at 300 m), `MATBIG`/`TERRAIN_MAT`/
  `GLOW` "big". `WAVE_GLSL` is generated from `WAVES`: never write the wave sum twice. The chunk ends with the eye's gain, `eyeC(col, gain)`
  (`EYE_GLSL`, world.js `NIGHT_EYE`): a world material with fog off, or a shader of its own that skips the chunk, calls it too, or stands up
  to ×4 darker on a moonless night (the dome and the horizon pass take it by hand).
- **The air** (world.js `HAZE`, `AIR`) is the boundary layer's slab, read by every material in air, the dome's band and the horizon pass; the far
  cut applies only under water, so a change to the far plane, the dome or the surface's far edge has a second consumer. `fogAir(col, o, rd, L,
  ck, fl)`: `fl` is the far end's height over the flat frame (0 in the world, the curve's drop in the horizon pass), or the far sea sinks under the slab. The slab follows
  `CLOUD_H`/`CLOUD_T`. `fogAir` calls `capFog` and `poolFog`, defined when clouds.js appends to the chunk: a shader that takes the chunk before
  clouds.js loads fails to link.
- **The mist's integral** (scene.js `mistL`) keeps both exponentials bounded: a ray dropping 90 m or more to the water once overflowed to black.
- **Past the world's edge** the edge regions' apron (`apronGen`) carries the far terrain 2000 m on; a mesh that ends at the edge shows against
  nothing.
- **The far layer draws every structure** (`bigsFor`) and every boulder (`rocksGen`, FLORA `farRock`); cells only register their collision —
  anything `big` or `farRock` that a cell draws itself pops and doubles. The ground rule is `settleOn`'s alone.
- **Draw distance.** The flora ends at `FLORA_FAR` and fades into it (`FLORA_FADE`, scene.js `farCut`): a new small species wants a fading
  material (every sway, variant, rock and `MAT` instance has one); a new big one a card in `FAR_IMP` (a low-poly copy of itself, never crossed
  cards) and no cut. The disturbance loop runs only within `DIST_R` of the camera.
- **The pools** (chunks.js `POOLS`): a cell's small flora is a block in its species' pool (not in `ch.meshes`/`ch.flora`) — since v11.212 one block a
  tile (`POOL_TILE.k`² a cell, `poolTiles`: written in the rng's order, then put in tile order), each with its sphere — the blocks after a cell's moved
  down over them in one sweep on unload, the written range uploaded (`updateRange`). Out of sight — its cell's, or its tile wholly out of the view or past
  the pool's reach (`tileSeen`) — by a per-instance flag (`aHide`) in `addTint`'s vertex code, never moved by the view, packed once still; so a pooled
  species' material is a tinted one. A tile hides only what is not drawn anyway: test/pool.js fails if one hides an instance within its reach. Placement reads the cell's own hash only (`solidPush(…, own)`), which `placeBigSolids` completes with every
  neighbour's reaching structure (`test/pool.js` fails if a cell's blocks differ by arrival order).
- **Capsules.** No hit capsule ends past the nose (`compile` clamps at `F.nose − r`; a hand-written list that reaches past it is cut back
  silently). A spec's own `hit` list puts the shell's capsule first and marks a part's own capsule `own` (the tails), or the covering reads the core's. A lost part is hidden and
  struck from the live spec, but the kind's shared far bake still has it past `lodNear`.
- **Shared geometry.** Never mutate a spawned creature's body geometry (shared per kind in `KIND_GEO`): build a variant. `disposeCreature`
  skips shared geometry.
- **Generators yield.** `buildTerrain`, `placeFloraType`, `makeSchool`, `bigsGen`, `impostorsGen` yield inside their big steps; a step that
  runs long is a frame over `Q.target`.
- **Local origins** (chunks.js `ORIGIN`): a cell's group sits at its corner (`ch.ox`, `ch.oz`) and a far region's at its own, so anything added
  to one holds local numbers — a vertex at `x - ch.ox`, an instance's translation at `e[12] - ch.ox` (`instLocal`), from the double, not the
  stored float. The pools hold translations relative to the render origin (`ORIGIN.x/z`, moved by `poolSnap`, following the camera); the snow,
  debris and blood keep doubles (`pp`, `fxP`, `blP`) and give the GPU copies — write the doubles. A horizon member's mesh sits at a lattice
  point. A mesh added in world coordinates lands a cell's or region's width away. Shaders take world positions through `modelMatrix` or the
  fog's `vFogPos`, never `position`.
- **Three clears to `scene.background`** whatever `renderer.autoClear` says (r128's WebGLBackground): a pass drawn before the main one is wiped
  unless the main scene's background is nulled for that frame (horizon.js `renderFrame`). Near-plane clipping is by view depth, not distance:
  a near plane at the far plane cuts a dome and anything off-axis to a 32° cone.
- **The stub**: `setTimeout` runs at once; `location.hash` comes from `TIER`; `Matrix4.lookAt`, `setFromRotationMatrix` and `slerp` are real and
  an object's matrix composes from its quaternion; `add` takes an object from its old parent, as three's does. A body placed by hand faces +z
  until something turns it: set the player's facing with `faceQ(P)` after its yaw.
- In the sandbox a second writer once edited `src/` mid-session; build from a clean copy and say so.

## Dev tools in the game

- **Keys.** `n` the world map (wheel zooms, drag pans, a click teleports, `o` the marks); `z` the bestiary (←→ step, space strike, s cruise);
  `l` the lab, `p` place its spec; `e` the effects list; `b` the sound bench (1 one-shots, 2 noise and irs, 3 the beds, 4 a live capture; needs
  `node serve.js`); `f` first person; `x` lay a clutch (any body but a drifter's, grown, on the floor; a soft ringmouth once, then it broods; a
  hingeshell at a den; it opens the editor at conception, where `l` lays); `r` or right mouse grab, click bite; `Q` the body's ability; `M` mute; **F9** send a report; **F8** the probe: what each part of the frame costs this GPU here (~15–30 s, hold still, leave the window be; kept for the next report).
- **The readout**: backquote (or `'`, F3) — fps, frame ms, work/worst, gen, res, draws, tris, cells, pools, far, creatures, phys, render (the
  submit and any wait), **gpu** (the card's own time, where the browser times it), heap, the tier, the medium, the place, oxygen, tide, hour,
  year, sun, moon, light, cloud, rain; the fog, audio and ecology lines. With it open the keys tune — the fog (`FOG_TUNE`: 1-2 3-4 5-6 7-8 9-0 -= [] ,. ;/
  o-n t-y u-i), the sound (`AU_TUNE`: g-h j-k v-b), the camera (`CAM_TUNE`: ←→ fov, pgdn-pgup the first person's, ↓↑ the arm); Backspace resets.
- **The console**: `tp(x,z,y)` (y above the ground, or a negative absolute depth; clamped to the world); `skip(days)` (in play; the clock on by game
  days, a fraction moving the hour; boot is phase 0.6 of `YEAR_D` 185, so `skip(28)` is the windy peak and `skip(120)` the still); `falls()`, `palls()` (pall ground nearest the start: `tp(2400,-699,-540)`), `milky()` (each with the `tp()` or `skip()` to it); `wmap.st`
  (what the world map cost); `report()` (F9); `probe()` (F8);
  `machine('home')` (this browser's name in its reports); `tier()` (this start's tier, why, and the machine's verdict; `tier('forget')` judges again).
- **The URL**: `#low` `#high`, `#zoo`, `#lab` or `#lab=<base64 spec>`, `#bench` (it arms the first click: an audio context needs a gesture),
  `#creator` (grants the menu's creator word).
- **The menu**: new game, continue — the slot whose world the menu shows, into it at once, and only it: not there after a death that ended the
  line or on a first visit (v11.213, the person's rule) — saves (any slot; in IndexedDB — clear the site's data to start clean; the tests use memory),
  options (the effects list), the creator. Esc in play with the pointer free saves and returns (esc twice when locked). A death writes its cause to the slot.
- **The effects list** (`e`): the cosmetic systems, each switched live; a slider under a switch is a row in `FX_SLIDERS` and a number in `FX_DEF`.
  Each tier keeps its own choices (`tethys.fx`, `tethys.fx.low`; v11.203); the low tier starts with `FX_LOW_OFF` off.
- `map.html` (planned islands, the `PLAN` string for test/map.js) and `region.html` (the province from region.js, its knobs, a survey of 30
  seeds, the recipe to paste into `REGION_K`) load `src/` as it is; open them on serve.js or from the file. Not part of the game.
- The heaviest place is the weed forest on the shelf at (330, 0).

## The person

- Concise replies, dry wit, no praise, no constant agreement; disagree when it is reasonable. Be plain about what you can and cannot do: from
  here you can build, test, serve, look and screenshot; you cannot hear the sound, and their GPU is measured only by their reports (F9; the GPU's
  time needs desktop Chrome's timer).
- Likes questions and is open to ideas. When a design choice is theirs (a doc's Open list, anything about the planet or the roster, what to
  strike), ask, don't guess, and record the answer in the doc with the date. The old per-version ask lists are a record of what was never
  looked at, not questions pending (15 Sep 2026).
- Plays on desktop: an RTX 4060, and several machines (home and two work towers, 20 Nov 2026). The phone is secondary and may lose things as
  long as desktop is "fantastically smooth".
- Cadence: content prompts freely; a performance pass whenever frame time creeps; and since 14 Nov 2026 every change to a hot path says what
  it cost, so a creep is seen in the version that made it.
