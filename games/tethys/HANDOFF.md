# HANDOFF — tethys

Where things stand: the latest versions, what to ask the person, what is open. Current state only — every version's whole story is its
CHANGELOG entry, and this file as it stood to v11.191 (220 versions back to v11.18, with the old dated notes) is `archive/HANDOFF-to-v11.191.md`.
Add the new version's paragraph at the top; take out what is no longer true; keep the five latest.

**v11.206 (22 Nov 2026): the sky timed on its own** (rec.js pass 4; horizon.js; test/report.js; CHANGELOG). The horizon pass split into the sky and
the far land and sea in the reports. The tower's main pass (22–35 ms of ~30 at 0.6 MP, 1.4 M triangles on low) is the bigger cost. **Ask:** a tower
report after time on the surface.

**v11.205 (22 Nov 2026): less garbage** (world.js `sampleH`; ecology.js; CHANGELOG). The garbage 1,880 → 1,710 KB a frame on the bench page; every
number the same to the bit. What is left is mostly boxed doubles; no report since v11.197 shows the collector, so the hunt stops unless one does.

**v11.204 (22 Nov 2026): esc to the menu saves through the fade** (save.js `saveLeave`, `saveFinish`; menu.js `toMenu`; test/player.js;
CHANGELOG). The key was 75–270 ms of the whole save at once; now under 1 ms, the fade's frames walk the ledger, and what is left is walked under the
black. **Ask:** esc after a long play — the fade at once, continue where you were.

**v11.203 (21 Nov 2026): the low tier's own effects** (effects.js `FX_LS`, `FX_LOW_OFF`; test/fxcost.js; test/tier.js; CHANGELOG). The person:
"It's not low if you can't run it on a low device." The low tier keeps its own effect choices (`tethys.fx.low`) and starts with the world's shadows
and the refraction off. The software GPU could not rank the per-pixel effects (noise ±6%); the tower's reports will. **Ask:** a report from the tower.

**v11.202 (21 Nov 2026): the idle menu at ~30 fps** (main.js `loop`, menu.js `MENU_IDLE_IV`; test/idle.js; CHANGELOG). #143 drew the menu at
120 fps for 57 minutes; the idle menu (12 s without the mouse) now draws every ~31 ms, woken at the first move. **Ask:** nothing but a still menu.

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
