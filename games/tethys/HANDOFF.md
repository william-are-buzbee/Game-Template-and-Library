# HANDOFF — tethys

Where things stand: the latest versions, what to ask the person, what is open. Current state only — every version's whole story is its
CHANGELOG entry, and this file as it stood to v11.191 (220 versions back to v11.18, with the old dated notes) is `archive/HANDOFF-to-v11.191.md`.
Add the new version's paragraph at the top; take out what is no longer true; keep the five latest.

**v11.223 (23 Nov 2026): the plumb, the stations, a gas shell's floor** (creatures_spec.js `SPECS.plumb`, `DERIVE_K.chamberY`; creatures_defs.js
`DEFS.plumb`, `STATION`, `stationW`; creatures_ai.js `updatePlumb`, `reachable`; chunks.js `stationPoint`; ecology.js; zoo.js; test/plumb.js; CLADES,
DESIGN The ecology, PLANET's roster; CHANGELOG). The person's hanger: the ortho's cone with no ballast, hung shell-up at walls in still water, riding
the swarm's layer, striking only down; the wall and lee stations weigh the ledger and place it; every gas-shelled body held above −450 (the ortho's
band left: it is the floor's). Seen in headless Chromium hanging at the wall at cell (118, 119). **Ask:** the plumb at a wall in the preview — the
look, its numbers (rare: ~1,700 in the world), and whether the coilshell player is held above −450 too.

**v11.222 (23 Nov 2026): the radiation** (CLADES.md, The radiation; PLANET.md; CHANGELOG). Docs only. The person's answers: individuals
generated, species authored from a radiation table; the hanger first — a straightshell with no ballast, hung vertical beside walls, rising with the
swarm's layer at night — and the ortho kept as it is; the slowbloods' reference becomes the jawless armoured fish; then the ringmouths' individuals and
the slowblood filter giant. Habitat at three scales (range, station, clock), agreed; no exceptions — every species held to its body's limits, so the ortho moves up. **Next:** the hanger.

**v11.221 (23 Nov 2026): the sparkle as a parallel ecosystem** (LINEAGE.md §7c, §12.39–46; CLAUDE.md and PLANET.md's no-magic rule;
CHANGELOG). Docs only, and a rough draft, not gospel: the aim is the sparkle as a fun mechanic that motivates the player. The
person's answers: not §7b's island but an ecosystem of its own over the whole world, the gods placed by hand and
designed first, the generation count kept, the sparkle released at laying and drained while not eating, the player just another sparkle
creature and hunted for it. The model (a substance moved by eating) is proposed; nine candidate gods in §7c.5. The ordinary ecology gets more passes
first. **Ask:** §7c.4, the first three.

**v11.220 (23 Nov 2026): F9 reports this visit first** (rec.js recBody, `recBrief`; test/report.js; test/rec.js; DESIGN.md; CHANGELOG). The person's
choice: the visit you are in, its time in seconds under a minute, and the session before below it when short. **Ask:** open twice, F9 at once.

**v11.219 (23 Nov 2026): the fill light's colours again** (atmosphere.js; test/lint.js; test/combat.js; CHANGELOG). A `//` mid-line had swallowed
them since v11.175: under water the fill takes the water's colour again (greener, darker in the shade). Lint now fails on code in a comment. **Ask:**
the look under water, better or worse than these six days (either is fine).

## Open

- **The plan** (analysis_project.md, the person's order, 20 Nov 2026): 1 the recorder (v11.191), 2 the docs (v11.192) and 3 the type checker (v11.193)
  done; 4 the flora's far copies built (v11.194) and struck (v11.201), and the tier that follows the machine (v11.199, the person's call); 7 a fixed step and seeded sim done
  (v11.209, v11.210); 6 three.js: the spike scoped it (4–6 days, analysis_project.md §6), v11.215 did the loading and the fixes that work on both
  versions, the rest after the tower's F8 (the person, 22 Nov); 5 the cells in workers: judged low value against the world cache (v11.214), not
  started; one door and its key end to end at any point.
- **Reports** (`node test/report.js --search`): #137 and #138, a work tower `20e1` (Intel UHD 730): high tier 82 ms a frame, the GPU 84 ms (main
  pass 75), 3.9M triangles; `#low` 33 ms, the GPU 35, 1.6M triangles — the GPU fell with the triangles (×0.41 against ×0.40), not the pixels (×0.81).
  They are step 4's before. The desktop tier is `high` on that chip; the boot under `#low` had a 7.4 s menu frame the recorder does not itemise.
  #141–#144, the home machine `kasd` (Brave hides the card), v11.194: 120 fps, the GPU 7.8–8.8 ms of 8.3; its freezes were the save store's read
  (v11.195) and write (v11.196), and the collector (200–325 ms every minute or two; the heap 1.5 GB in play, 2.9 GB at the list's reads — the old
  list held every slot whole). #144 is `#lod` at another place and size than #143, so no pair yet: one more without `#lod` at tp(-8479,5431,-11)
  in the same window settles it on that card (the work tower's pair still decides).
- **The person's open lists**, each in its doc: analysis_loading.md §4 (the loading page's look, one wait or two, a cache in the browser);
  analysis_fog.md (its questions); BIOLUM.md §7; WATER.md Part 5 (light across the line, an audit, nothing built); DEEP.md §11 (the
  constructors' place); analysis_archipelago.md §8.4; DIRECTION.md's Open list; LINEAGE.md §11 and §7c.4; SEAFLOOR.md §6; PIXEL.md (ready to build).
