# HANDOFF — tethys

Where things stand: the latest versions, what to ask the person, what is open. Current state only — every version's whole story is its
CHANGELOG entry, and this file as it stood to v11.191 (220 versions back to v11.18, with the old dated notes) is `archive/HANDOFF-to-v11.191.md`.
Add the new version's paragraph at the top; take out what is no longer true; keep the five latest.

**v11.237 (25 Nov 2026): a performance pass — the scans by square, the matrices only of what is drawn, the dark lights skipped** (creatures_ai.js
`CG`, `cgNear`, `crMW`; horizon.js `MW.hide`; scene.js the light chunks; test/scangrid.js; DESIGN Performance; CHANGELOG). The person: *"find any performance
updates we can do to make the game more easily playable now."* Since v11.220 the GPU's side got lighter and the creatures' CPU work ×1.20–1.27. Three cuts,
nothing seen or simulated changed: the schools', grazers' and hunters' scans read the bodies within reach from a grid instead of all 1,380 (the creatures'
step ×0.66–0.82); three's render no longer recomposes the matrices of 13,600 creature parts out of sight (renderFrame's CPU side ×0.65–0.79); a point
light at 0 is skipped in the shaders (the proxy's vertex work ×0.81–0.89). **Ask:** the readout's `render` and `gpu` at `tp(330,0)` and `tp(110,-380)` on
the preview against main's, and an F9 from each machine — the work tower's last report is v11.197.

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

**v11.233 (25 Nov 2026): the drifters** (creatures_ai.js `DRIFT`, `STRAND`, `updateJelly`, `updateSailer`; creatures_defs.js `BEHAVE`; ecology.js
`POP.stung`; test/drifters.js, test/live.js; BEHAVIOUR §3g; DRIFTERS, DESIGN; CHANGELOG). The person: *"Let's do the drifters while I test this
out."* A jelly or a sailer's lines hold a small swimmer that touches them, haul it to the mouth and eat it, then digest; the player is stung, never
held. The jelly follows the plankton's daily layer. A sailer that grounds on a shoal or the strand dies there, carrion for the scuttles. Rare in play:
drifters are about one a cell. **Ask:** BEHAVIOUR §8.10 (what eats a live drifter); whether a catch is ever seen.

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
