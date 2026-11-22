# HANDOFF — tethys

Where things stand: the latest versions, what to ask the person, what is open. Current state only — every version's whole story is its
CHANGELOG entry, and this file as it stood to v11.191 (220 versions back to v11.18, with the old dated notes) is `archive/HANDOFF-to-v11.191.md`.
Add the new version's paragraph at the top; take out what is no longer true; keep the five latest.

**v11.203 (21 Nov 2026): the low tier's own effects** (effects.js `FX_LS`, `FX_LOW_OFF`; test/fxcost.js; test/tier.js; CHANGELOG). The person:
"It's not low if you can't run it on a low device." The low tier keeps its own effect choices (`tethys.fx.low`) and starts with the world's shadows
and the refraction off. The software GPU could not rank the per-pixel effects (noise ±6%); the tower's reports will. **Ask:** a report from the tower.

**v11.202 (21 Nov 2026): the idle menu at ~30 fps** (main.js `loop`, menu.js `MENU_IDLE_IV`; test/idle.js; CHANGELOG). #143 drew the menu at
120 fps for 57 minutes; the idle menu (12 s without the mouse) now draws every ~31 ms, woken at the first move. **Ask:** nothing but a still menu.

**v11.201 (21 Nov 2026): the flora's far copies struck** (parts.js, grow.js, chunks.js, rec.js; test/lod.js gone; analysis_project.md §4;
CHANGELOG). The person's rule — keep them only if they cannot hurt — and they did (on: renderFrame ×1.37–1.48, 45 draws more). The uniform cut and
the tidewood's own copy stay. **Ask:** nothing to look at.

**v11.200 (21 Nov 2026): where V8 throws the game out of optimised code** (test/deopts.js; parts.js `merge`, `GeoTape`; world.js `vlyCut`; far.js
`wmUpload`; test/bench_creatures.js; CHANGELOG). The survey after islandH: no other hot function stuck as it was; three loops out (merge's tape and
its reads, vlyCut's −0 index, wmBlur's texture setter); three.js r128's per-draw attribute check (252 in 400 frames) left for step 6. The creature
bench had a race with the save store since v11.189 (bodies differing between runs) — fixed. **Ask:** nothing to look at.

**v11.199 (21 Nov 2026): the tier follows the machine** (scene.js `TIER_K`, `TIER_SAVED`, `tierStep`, `tierFrame`; test/tier.js; DESIGN
"Performance and the quality tier"; analysis_project.md §4; CHANGELOG). The person's "option 2". Each browser keeps a verdict from its GPU's own
time: high far too heavy on the menu (over 40 ms) reloads into low at once; in play a minute over 20 ms is low from the next start, under 6 ms on
the machine's low is high again. `#low`/`#high` still win. **Ask:** the work tower without `#low`:
it should reload itself into low within seconds of the menu, and say so; the home machine should stay high.

## Open

- **The plan** (analysis_project.md, the person's order, 20 Nov 2026): 1 the recorder (v11.191), 2 the docs (v11.192) and 3 the type checker (v11.193)
  done; 4 the flora's far copies built (v11.194) and struck (v11.201), and the tier that follows the machine (v11.199, the person's call); next 5 the cells in workers, 6 three.js upgraded, 7 a fixed step and seeded sim; one door and
  its key end to end at any point.
- **Reports** (`node test/report.js --search`): #137 and #138, a work tower `20e1` (Intel UHD 730): high tier 82 ms a frame, the GPU 84 ms (main
  pass 75), 3.9M triangles; `#low` 33 ms, the GPU 35, 1.6M triangles — the GPU fell with the triangles (×0.41 against ×0.40), not the pixels (×0.81).
  They are step 4's before. The desktop tier is `high` on that chip; the boot under `#low` had a 7.4 s menu frame the recorder does not itemise.
  #141–#144, the home machine `kasd` (Brave hides the card), v11.194: 120 fps, the GPU 7.8–8.8 ms of 8.3; its freezes were the save store's read
  (v11.195) and write (v11.196), and the collector (200–325 ms every minute or two; the heap 1.5 GB in play, 2.9 GB at the list's reads — the old
  list held every slot whole). #144 is `#lod` at another place and size than #143, so no pair yet: one more without `#lod` at tp(-8479,5431,-11)
  in the same window settles it on that card (the work tower's pair still decides).
- **The person's open lists**, each in its doc: analysis_loading.md §4 (the loading page's look, one wait or two, a cache in the browser);
  analysis_fog.md (its questions); BIOLUM.md §7; WATER.md Part 5 (light across the line, an audit, nothing built); DEEP.md §11 (the
  constructors' place); analysis_archipelago.md §8.4; DIRECTION.md's Open list; LINEAGE.md §11; SEAFLOOR.md §6; PIXEL.md (ready to build).
