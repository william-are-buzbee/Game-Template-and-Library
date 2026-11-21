# HANDOFF — tethys

Where things stand: the latest versions, what to ask the person, what is open. Current state only — every version's whole story is its
CHANGELOG entry, and this file as it stood to v11.191 (220 versions back to v11.18, with the old dated notes) is `archive/HANDOFF-to-v11.191.md`.
Add the new version's paragraph at the top; take out what is no longer true; keep the five latest.

**v11.195 (21 Nov 2026): the save list reads summaries** (save.js `slotSum`, `slotPut`, `slotGet`, `slotDel`, `storeSums`; menu.js, main.js
`bootSlot`; test/slots.js; DESIGN, the save paragraph; CHANGELOG). The home reports (#141, #142) blamed 6 s of freezes on the store: the menu's list
read every slot whole, ledger and all. Every slot now has a summary beside it, written in the same transaction; the list reads only those; a slot is
read whole when it is continued, exported, or is the boot's last; an old slot is read once and given one. **Ask:** on the home machine, the menu and
continue with the slots it has (the first boot migrates them), and an F9 report — its long animation frames should no longer name the store.

**v11.194 (21 Nov 2026): the flora's far copies — off** (parts.js `LOD`, grow.js `lodParts`, chunks.js `poolLodOwn`, scene.js `uCut`; test/lod.js;
analysis_project.md §4; CHANGELOG). Every flora material's cut is a uniform now (the same pictures); every species has a copy at half its detail
drawn past 150 m / 120 m — but on the proxy it cost more than it saved (the GPU ×1.06–1.08, 45 draws more), so only `#lod` turns it on.
**Ask:** two reports on the work tower at one place, without and with `#lod`; then the two pools or the tier that follows the machine (§4).

**v11.193 (20 Nov 2026): the type checker** (test/types.js, test/types.json, tsconfig.json, types/; analysis_project.md §3; CHANGELOG). TypeScript reads
src/*.js as the one scope it is; the old errors are a baseline that only goes down; the record, the creature and the player are closed types, so a
key misspelt or set late on them is an error — the player had twenty such keys, now in its literal. Nothing in the game changed (every body, the
simulation, the GPU's counts and the pictures the same). **Ask:** nothing to look at.

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

## Open

- **The plan** (analysis_project.md, the person's order, 20 Nov 2026): 1 the recorder (v11.191), 2 the docs (v11.192) and 3 the type checker (v11.193)
  done; 4 the flora's far copies built and off (v11.194, `#lod`; §4: a report each way decides, then the person's call); next 5 the cells in workers, 6 three.js upgraded, 7 a fixed step and seeded sim; one door and
  its key end to end at any point.
- **Reports** (`node test/report.js --search`): #137 and #138, a work tower `20e1` (Intel UHD 730): high tier 82 ms a frame, the GPU 84 ms (main
  pass 75), 3.9M triangles; `#low` 33 ms, the GPU 35, 1.6M triangles — the GPU fell with the triangles (×0.41 against ×0.40), not the pixels (×0.81).
  They are step 4's before. #141 and #142, the home machine `kasd` (Brave hides the card): 120 fps, the GPU 7.8–8.0 ms of 8.3; its freezes were the
  save store (v11.195) and the collector (200–325 ms every minute or two, the heap ~600 MB) — open. The desktop tier is `high` on that chip; the boot under `#low` had a 7.4 s menu frame the recorder does not itemise.
- **The person's open lists**, each in its doc: analysis_loading.md §4 (the loading page's look, one wait or two, a cache in the browser);
  analysis_fog.md (its questions); BIOLUM.md §7; WATER.md Part 5 (light across the line, an audit, nothing built); DEEP.md §11 (the
  constructors' place); analysis_archipelago.md §8.4; DIRECTION.md's Open list; LINEAGE.md §11; SEAFLOOR.md §6; PIXEL.md (ready to build).
