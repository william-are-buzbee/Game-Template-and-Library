# HANDOFF — tethys

Where things stand: the latest versions, what to ask the person, what is open. Current state only — every version's whole story is its
CHANGELOG entry, and this file as it stood to v11.191 (220 versions back to v11.18, with the old dated notes) is `archive/HANDOFF-to-v11.191.md`.
Add the new version's paragraph at the top; take out what is no longer true; keep the five latest.

**v11.237.1 (25 Nov 2026): the creatures bench made fair** (test/bench_creatures.js, test/benchpage.js `iso`, test/perf.js's note, test/README.md;
CHANGELOG). No game code changed. The bench read identical sources ×0.81–1.28 at a place, so `perf.js` flagged cells no change could reach. Now
both trees' pages are open at once and take turns — kind by kind, cell by cell, 20 frames at a time, the first alternating — and every piece is the
least of eight rounds, a cell's down to each step of its generator, on a page whose clock reads to 5 µs: identical sources read within ±4% at the forest,
the atoll and the platform and ×0.93–1.07 at the sea and the giant's coast (×0.81–1.28 before). It takes ~5½ minutes (~1¼ before). **Ask:** nothing.

**v11.237 (25 Nov 2026): the sea line** (atmosphere.js `waterDome`, `DOME_M`, SKY_FS `uSkyCut`; horizon.js `hzIn`, `HZ_IN`, `HZ_DIP`, `uHzIn`;
test/horizon.js, test/horizon_page.js (smoke); DESIGN Visibility and the horizon tier; CHANGELOG). The person: *"Horizon flickering black line above
water."* The water dome was cut at the tide while the drawn far sea sits ~0.3 m under it, and the far plane is only 5% past the dome straight ahead, so
from a low eye a ray could pass over the sea's end to the bare dome: a one-pixel dark line across the middle, coming and going with the swell. The dome
now draws only a pixel's step under the drawn sea; the horizon pass's sea disc reaches in from a low eye and its sky is not cut at the water. **Ask:**
the horizon from the surface at sea, several headings and heights.

**v11.236 (25 Nov 2026): the snow as bright as its surroundings** (atmosphere.js `ptsLit`, `snowLight`, `SN_ALB`, `SN_OP`; fx.js, combat.js the same
patch; test/snow.js, test/stub.js; DESIGN The snow; CHANGELOG). The person: *"Marine snow is too visible in the dark … only as bright as its
surroundings."* Its light had a floor (45–95% of noon with no light at all, then the eye's gain); now a point takes the world's light where it is —
the ambient, the sun or moon by its depth, the own light and the pool's lights by the ground's falloff — and nothing else. The lit shallows as they
were; black water with nothing lit leaves it unseen. **Ask:** whether the snow in the own light's reach in the deep, and at night, is enough to keep
the sense of space; whether mid-depth by day now reads too thin.

**v11.235 (25 Nov 2026): the fan rebuilt** (flora.js `fanB`, the `fan` entry; grow.js `branch`'s `col2`; FLORA.md's head note and roster; CHANGELOG).
The person: *"the multicolored triangles are a bit too ubiquitous and look kind of strange"* — the fan, a squashed cone in four vivid tints at 200 tries
a cell. Asked to strike or rebuild, the person chose the rebuild: a pale branching fan in one plane across the current, 40 tries a cell in patches,
only in strong current below 12 m — about a ninth as many. **Ask:** whether the new fans read as fans, and whether they are now too few to notice.

**v11.234 (25 Nov 2026): the tidewood sparse, in stands** (flora.js `tidetree` `per`, `stand`; chunks.js `standK`, `isleK`, `STAND_LAND`; far.js
`impostorsGen`; FLORA Placement rules, DESIGN; CHANGELOG). The person: the tidal plant *"is simply too much of an eye sore … should be sparse"*, absent
from many land areas, most common on the larger islands. `per` 700 → 150, and stands: a seeded ~3 km noise that leaves whole coasts and small islands
bare, opened by the nearest land's catchment (a high or shield island's land radius). The world's census 1.53 M trees → 50 k (×0.033), 78% of them on
the four big islands; none round ours. The far copies follow. The reed is untouched. **Ask:** whether ours should keep a small stand; whether a stand
on the giant reads sparse enough; whether the reed is next.

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
