# HANDOFF — tethys

Where things stand: the latest versions, what to ask the person, what is open. Current state only — every version's whole story is its
CHANGELOG entry, and this file as it stood to v11.191 (220 versions back to v11.18, with the old dated notes) is `archive/HANDOFF-to-v11.191.md`.
Add the new version's paragraph at the top; take out what is no longer true; keep the five latest.

**v11.226 (24 Nov 2026): the individual for every placed species** (creatures_defs.js `VARIETY`, `GROW`, `MORPHS`, `VARY_AUTO`; creatures_ai.js
`autoVary`, `KIND_LOD`; test/variety.js, test/combat.js; VARIETY.md; DESIGN; CHANGELOG). All 38 kinds the ledger places are individuals: the clades' growth
laws (soft ringmouths narrow, slowbloods' old giants, hingeshells in moult steps, drifters by food), morphs with causes (red, yellow, dark, pale,
banded, spotted), proportions by part; five uniform (the schools, the pall, the cinder). First sight of a busy place ×1.13 (once a session); the
frame level. **Ask:** the bestiary's `i` across the roster; a hitch on first visiting the shelf forest.

**v11.225 (23 Nov 2026): the individual, step 1** (creatures_defs.js `VARIETY`, `GROW`, `MORPHS`; creatures_ai.js `indiv`, `variantOf`; zoo.js `i`;
test/variety.js; test/preview.js `INDIV=1`; VARIETY.md; DESIGN The individual's variants; CHANGELOG). The plumb, ortho, great and rasp are individuals:
stable in their cell, size by age with a range (the plumb 20 m typical, 30 m old), a morph (a rare pale one in 50), a proportion set, old shells shed
and faded, their shells coloured by the place. The rest of the roster is the type, as before. **Ask:** the bestiary's `i` on those four; whether the
morphs read. **Next:** VARIETY §7 step 2, the growth laws for every clade.

**v11.224 (23 Nov 2026): the individual, designed** (VARIETY.md, new; LINEAGE §7c.6; CLADES; CHANGELOG). Docs only. The variety generator and
palettes proposed: every difference with a cause (morph, age by the clade's growth law, place, history, development), variants as shared keys
under a budget, palettes by `coatFor`'s physics. The person's answers: demigods for every god, the Plumb a god provisionally, 30 m for the old
plumbs. The stipe (a shallow upright straightshell) a candidate. §8 answered the same day: stable individuals, rarity and budget per species (the
ringmouths vary most), the founder left alone, size by age with a range on top. **Next:** VARIETY §7 step 1.

**v11.223.1 (23 Nov 2026): the plumb hangs, sways and is common; the coilshell held above −450** (creatures_ai.js `HANG`, `updatePlumb`; creatures_defs.js
`STATION`, `SPAWN`; player.js `deepY`, `DEEP_SOFT`; LINEAGE §7c.5–6; CHANGELOG). The person liked it but it read as standing still on the floor and was
too rare: now 7.7 m clear of the floor, bobbing, swaying, drifting, carried by the current and pushable; walls from 11 m faces and `n` 12 (~8,100 in the
world). The coilshell player stops at −450. The Plumb is the tenth candidate god, with demigods (§7c.6). **Ask:** does it read as hanging now; §7c.6's Open.

**v11.223 (23 Nov 2026): the plumb, the stations, a gas shell's floor** (creatures_spec.js `SPECS.plumb`, `DERIVE_K.chamberY`; creatures_defs.js
`DEFS.plumb`, `STATION`, `stationW`; creatures_ai.js `updatePlumb`, `reachable`; chunks.js `stationPoint`; ecology.js; zoo.js; test/plumb.js; CLADES,
DESIGN The ecology, PLANET's roster; CHANGELOG). The person's hanger: the ortho's cone with no ballast, hung shell-up at walls in still water, riding
the swarm's layer, striking only down; the wall and lee stations weigh the ledger and place it; every gas-shelled body held above −450 (the ortho's
band left: it is the floor's). Seen in headless Chromium hanging at the wall at cell (118, 119). The person's answers are v11.223.1's.

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
