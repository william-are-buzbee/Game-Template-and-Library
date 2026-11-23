# HANDOFF — tethys

Where things stand: the latest versions, what to ask the person, what is open. Current state only — every version's whole story is its
CHANGELOG entry, and this file as it stood to v11.191 (220 versions back to v11.18, with the old dated notes) is `archive/HANDOFF-to-v11.191.md`.
Add the new version's paragraph at the top; take out what is no longer true; keep the five latest.

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

**v11.218 (23 Nov 2026): the three.js breakages mended both ways** (scene.js `T187`, `oneP`, `SH_DEPTH`, `LI`; atmosphere.js `refrFb`; benchpage
`THREE=187`; test/three187.js; analysis_project.md §6). r187 now draws the game as r128 does (mean change ≤ 0.43 of 255 at seven places); r128 the same
to the bit. The spike's slow boot does not reproduce. Next: the tower's F8 and F9, then the upgrade (the version, the loader's import map, the tests).

**v11.217 (23 Nov 2026): a quick F9 says this visit's boot** (rec.js `recWc`, recBody `now`; wcache.js; test/rec.js, test/report.js; CHANGELOG). F9
under a minute in sends the session before (why #176 said 9.5 min, its boot uncached); now this visit's boot rides with it, and every boot says what it
took from the world cache. The cache's read let go after the boot: 20.7 MB. **Ask:** open the game twice, F9; the "this visit" line.

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
