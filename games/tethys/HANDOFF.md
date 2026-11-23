# HANDOFF — tethys

Where things stand: the latest versions, what to ask the person, what is open. Current state only — every version's whole story is its
CHANGELOG entry, and this file as it stood to v11.191 (220 versions back to v11.18, with the old dated notes) is `archive/HANDOFF-to-v11.191.md`.
Add the new version's paragraph at the top; take out what is no longer true; keep the five latest.

**v11.216 (22 Nov 2026): the world cache, part two** (wcache.js `wcProduct`; region.js `rgCache`, `rgPlatMake`, `rgSadMake`; order.txt; test/wcache.js;
CHANGELOG). The platform and the saddles cached too: the load in Node 3.1 → 0.95 s with everything cached, a cached reload's first frame 0.5–0.8 s sooner
than v11.215 in headless Chromium. The island records stay uncached (closures). **Ask:** open the game twice; F9 after the second.

**v11.215 (22 Nov 2026): three.js-ready** (loader.js `tethysStart`, cacheload.js renamed; build.js `THREE_URL`; test/benchpage.js; CHANGELOG;
analysis_project.md §6). r128 loaded as a module, as every current three.js is; the spike's fixes that work on both versions in. Pictures the same to the
bit, the load the same. Next: the tower's F8 and F9 (Wednesday), then the upgrade itself. **Ask:** nothing to see; it should load as before.

**v11.214 (22 Nov 2026): the world cache, part one** (src/wcache.js, cacheload.js — loader.js since v11.215; build.js `WH`; test/wcache.js, test/wcache_page.js; CHANGELOG). The
maps' first fill and the caustic tiles kept in IndexedDB under the code's hash and read before the game starts: the first frame 0.68 s sooner on a reload
in headless Chromium. Part two: v11.216. **Ask:** open the game twice; F9 after the second.

**v11.213 (22 Nov 2026): continue does one thing** (menu.js `contRec`, `contShow`; test/player.js, test/boot.js; CHANGELOG). Continue is the slot whose
world the menu shows and only it; not there after a death that ended the line or on a first visit (the person's rule). Next: the world cache (yes, 22 Nov).

**v11.212 (22 Nov 2026): the plants sent by the tile** (chunks.js `POOL_TILE`, `poolTiles`, `tileSeen`, `poolFar`; test/pool.js; CHANGELOG). Each cell's
block in a pool cut into 3×3 tiles, a tile out of view or past the reach flagged like a cell: a third fewer triangles at every planted place on both tiers,
the picture the same. **Ask:** the tower's frame rate, and F8/F9 there; on the home machine, turn hard in the kelp forest (no spike).

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
  constructors' place); analysis_archipelago.md §8.4; DIRECTION.md's Open list; LINEAGE.md §11; SEAFLOOR.md §6; PIXEL.md (ready to build).
