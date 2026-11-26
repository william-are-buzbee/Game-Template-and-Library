# HANDOFF — tethys

Where things stand: the latest versions, what to ask the person, what is open. Current state only — every version's whole story is its
CHANGELOG entry, and this file as it stood to v11.191 (220 versions back to v11.18, with the old dated notes) is `archive/HANDOFF-to-v11.191.md`.
Add the new version's paragraph at the top; take out what is no longer true; keep the five latest.

**v11.241 (26 Nov 2026): the plants' light copies on the low tier** (grow.js `PLOD`, `plodVariants`; parts.js `GEO_LK`; chunks.js `poolPlod`, `poolCull`,
`poolPack`; scene.js `HIDE_NEAR`, `HIDE_FAR`, `plodMat`; test/plod.js; FLORA.md; CHANGELOG). The person: *"YES we want to make lighter copies … 40% is 40%."*
Past 45 m on the low tier a plant's tile draws a copy at half the facets, without its smallest parts; the whole plant draws only its near tiles, so nothing
is shaded twice (v11.194's mistake). Triangles ×0.73–0.86 where there are plants (against v11.239); 0.04–1.1% of pixels change (far specks). The grasses (strap, tress) got
none — flat blades; next, invisible, their variants split by size. **Ask:** an F8 at `tp(69950,29582,-10)` against #208's plants 6.35 ms; any pop at 45 m.

**v11.240 (26 Nov 2026): the sky under the water only when it can reach the screen** (atmosphere.js `skyUnder`, `skyViewMaxY`, `OCC.cvU`; horizon.js
`renderFrame`; test/skyunder.js; CHANGELOG). The person: *"make sure being deep underwater actually stops the sky from trying to render."* It did not.
Now the dome and its cloud pass are left out looking down (either tier) and when their weight through the window is under half a level (the high tier
from ~135 m); pictures the same. Measured: **the low tier's window is the sky itself, faint to 800 m** — so it is still drawn there — and shallow and
level the cloud pass's waste cannot be cut exactly. **Ask:** the clouds at half resolution under water, or none through the window on the low tier; the
low tier's window fading to the computed sky with depth like the high tier's.
**v11.239 (25 Nov 2026): the reed to 160 m on the low tier and 300 on the high, the seagrass to 160** (scene.js `Q.reed`, `THIN_CUT`, `MATRD`, `MATSG`;
flora.js the reed and the strap; main.js `warmShaders`; FLORA.md; CHANGELOG). The work tower's report on v11.238 (#205): 60 fps on the median now, 40%
of frames late, its worst place a sand flat where the reed was 600k of 1.33M triangles, nearly all past 150 m and specks at its size; the seagrass the same.
The person: the low tier at 160, the high longer "for now" (option 2) — 300, where ours' north shore's far bed stays whole — and *"do the seagrass too."*
The tower's worst place: triangles ×0.56, the proxy ×0.77; the high tier ×0.79–0.98 in triangles and its pictures the same. **Ask:** the tower's frame at
`tp(72929,243)`; whether the high tier's reed may come down to 160 later (the person's "we can always do it for the other high tier later").

**v11.238 (25 Nov 2026): a performance pass — the scans by square, the matrices only of what is drawn, the dark lights skipped** (creatures_ai.js
`CG`, `cgNear`, `crMW`; horizon.js `MW.hide`; scene.js the light chunks; test/scangrid.js; DESIGN Performance; CHANGELOG). The person: *"find any performance
updates we can do to make the game more easily playable now."* Since v11.220 the GPU's side got lighter and the creatures' CPU work ×1.20–1.27. Three cuts,
nothing seen or simulated changed: the schools', grazers' and hunters' scans read the bodies within reach from a grid instead of all 1,380 (the creatures'
step ×0.86 by the fair bench); three's render no longer recomposes the matrices of 13,600 creature parts out of sight (renderFrame's CPU side ×0.65–0.79); a point
light at 0 is skipped in the shaders (the proxy's vertex work ×0.81–0.89). **Ask:** the readout's `render` and `gpu` at `tp(330,0)` and `tp(110,-380)` on
the preview against main's, and an F9 from each machine — the work tower's last report is v11.197.

**v11.237.1 (25 Nov 2026): the creatures bench made fair** (test/bench_creatures.js, test/benchpage.js `iso`, test/perf.js's note, test/README.md;
CHANGELOG). No game code changed. The bench read identical sources ×0.81–1.28 at a place, so `perf.js` flagged cells no change could reach. Now
both trees' pages are open at once and take turns — kind by kind, cell by cell, 20 frames at a time, the first alternating — and every piece is the
least of eight rounds, a cell's down to each step of its generator, on a page whose clock reads to 5 µs: identical sources read within ±4% at the forest,
the atoll and the platform and ×0.93–1.07 at the sea and the giant's coast (×0.81–1.28 before). It takes ~5½ minutes (~1¼ before). **Ask:** nothing.

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
