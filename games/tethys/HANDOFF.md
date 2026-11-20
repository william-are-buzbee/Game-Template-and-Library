# HANDOFF — tethys

Where things stand: the latest versions, what to ask the person, what is open. Current state only — every version's whole story is its
CHANGELOG entry, and this file as it stood to v11.191 (220 versions back to v11.18, with the old dated notes) is `archive/HANDOFF-to-v11.191.md`.
Add the new version's paragraph at the top; take out what is no longer true; keep the five latest.

**v11.192 (20 Nov 2026): the docs cut to rules and a map** (analysis_project.md §2; CHANGELOG). CLAUDE.md 97.8 KB → 40.7 KB, every rule kept and the
version history taken out of them; the test table to `test/README.md` and the long docs and source tables to `README.md` (whole, the docs the old
tables missed added); this file cut to the latest versions, the old one kept whole in `archive/`; the archipelago's working notes (v11.126–154)
moved to the end of analysis_archipelago.md, where that work lives. Nothing in the game changed. **Ask:** nothing to look at; whether anything the
person relies on is now harder to find.

**v11.191 (20 Nov 2026): the flight recorder** (src/rec.js; test/report.js, test/rec.js; analysis_project.md, the plan for the project as a whole;
DESIGN "The flight recorder"; CHANGELOG). Every session is recorded in the browser that plays it — the machine, the boot, every frame by its phases and the
cell it was played in, the GPU's own time by pass where Chrome times it, the worst frames and what each did, every warning and error — and **F9** opens a
GitHub issue with it, which the person submits. Read them with `node test/report.js --search`; its `AT=` lines stand test/fill.js and test/gpu.js at a
report's worst moment. When the person says it lags, ask for a report, not a readout. **Next** (analysis_project.md, the person's order): `tsc --checkJs`, the flora's detail by distance, the cells in workers, three.js upgraded, a fixed step. **Ask:** F9 on the preview, and
the readout's `gpu`.

**v11.190 (20 Nov 2026): the tidewood's colour** (grow.js `PIG.greenAir`, `PIG_BOOST`; flora.js `tidetree` on `line: 'greenAir'`; DESIGN "The tidal forest";
CHANGELOG). The person: the beach trees "too neon or bright". The tidewood was the greens' 0–15 m water colour ×1.22, [0.44, 0.73, 0.24]; six colours were
shot in the game and the person chose between the softened green and the wood's leaf: [0.35, 0.47, 0.21], flat, no boost. Near and far copy alike. **Ask:**
the shore at noon on the preview, and whether the reed, scrub and tussock (still the old green) should follow.

**v11.189 (20 Nov 2026): the start** (main.js `BOOT`, `warmPrep`/`warmStep`, `bootFinish`; shell.html `#boot`, `#bootline`; save.js `slotWorld`/`slotPlayer`;
menu.js `menuContinue`, `saves`; test/boot.js; analysis_loading.md §5; DESIGN "The start and continue"; CHANGELOG). The person's answers of 20 Nov: a black
page with the title and a line from the first paint; behind it the last slot's world opened under the saved camera, the shaders warmed a program a frame,
the world streamed, the first frames drawn; then the scene fades in with the title where it was. Continue enters that world where you were, no fade.
Nothing compiles at first sight anywhere. **Ask:** a cold start of the preview on the person's card (how long, does it feel alive), continue (the body
appearing), and analysis_loading §4.3, the cache.

**v11.188 (20 Nov 2026): the low end** (scene.js `TREE_LOD`, `MATTRF`, `RES`, `resStep`, `Q.cloudRes`; chunks.js `poolLod`; atmosphere.js `CLDP`,
`cloudPass`; effects.js `hold the frame`; test/res.js; analysis_loading.md; DESIGN "What the GPU spends"; CHANGELOG). The person's three answers to v11.187:
the tidewood past 120 m is its 37-triangle far copy (a mirror on the pool's own buffers); the cloud volume is marched at half the screen on a side and
upsampled; the drawing buffer's scale steps down when the GPU drops frames and back up when it can (off on a card that makes 60 fps). On the proxy (test/fill.js) the frame ×0.86–0.91 at the shore, the coast and
the canopy, the sky ×0.37–0.68 with its pass. **Ask:** the swap at 120 m from the water at the shore, the clouds' edges, and on a weak machine the readout's `res`. And analysis_loading.md §4: the loading
page's look, one wait or two, a cache in the browser.

**v11.187 (19 Nov 2026): a performance pass — the flora's vertices, the air under the water, and the GPU's time taken** (grow.js `VPULL`; scene.js
`VPULL_GLSL`, `CAU_ARR`, `fogWaveH2`; atmosphere.js `SURF_OCC`, `OCC`; chunks.js the card species pooled; test/fill.js; test/benchpage.js `PLACES` with the
shore and the canopy; DESIGN "What the GPU spends"; CHANGELOG). The person's lag at the plants, the shore and the surface. Every plant drew its three
variants and threw two away in the vertex shader — now it fetches its own (the same pixels); under water the air behind the surface's mirror was shaded and
painted over — now the surface is drawn first as an occluder; the surface-reaching species are pooled; the fog's wave sum at the water line is taken once.
A frame's triangles and vertices ×0.52–0.58 at the forest, the atoll, the shore and the canopy (test/gpu.js), 21–23 fewer draws; the GPU's time as
SwiftShader takes it (test/fill.js, a proxy) ×0.88 at the shore, ×0.77–0.79 under water; open water up (the occluder, one draw). Nothing compiles at first sight
at the forest, the shore or the canopy any more (the shore had three). **Ask:** the readout (fps, frame ms, render ms, draws) at the shore `tp(110,-380)` from the water and 3 m down in the kelp beside it, against
v11.186's; then the person's calls in CHANGELOG v11.187 (the tidewood's weight, the sky's resolution, a low tier for a weak machine).

## Open

- **The plan** (analysis_project.md, the person's order, 20 Nov 2026): 1 the recorder (v11.191) and 2 the docs (v11.192) done; next 3 `tsc --checkJs`,
  4 the flora's detail by distance (measured by reports), 5 the cells in workers, 6 three.js upgraded, 7 a fixed step and seeded sim; one door and
  its key end to end at any point.
- **Reports**: none submitted yet. When the person sends one (F9 on any machine), read it with `node test/report.js --search`; its worst places
  are where the flora LOD (step 4) is measured.
- **The person's open lists**, each in its doc: analysis_loading.md §4 (the loading page's look, one wait or two, a cache in the browser);
  analysis_fog.md (its questions); BIOLUM.md §7; WATER.md Part 5 (light across the line, an audit, nothing built); DEEP.md §11 (the
  constructors' place); analysis_archipelago.md §8.4; DIRECTION.md's Open list; LINEAGE.md §11; SEAFLOOR.md §6; PIXEL.md (ready to build).
