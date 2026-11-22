# HANDOFF — tethys

Where things stand: the latest versions, what to ask the person, what is open. Current state only — every version's whole story is its
CHANGELOG entry, and this file as it stood to v11.191 (220 versions back to v11.18, with the old dated notes) is `archive/HANDOFF-to-v11.191.md`.
Add the new version's paragraph at the top; take out what is no longer true; keep the five latest.

**v11.211 (22 Nov 2026): the probe trusted, and the plants' off-screen exit measured** (probe.js; scene.js `viewExit`, `cutFit`; test/probe.js;
CHANGELOG). Of the plants' triangles sent on the low tier only 21–45% are seen; the exit for the off-screen ones cost the software GPU 7%, so it is off in
play and the probe measures it. **Ask:** F8 then F9 on the tower, under water.

**v11.210 (22 Nov 2026): the fixed step** (src/step.js; main.js; player.js `camFrame`; creatures_ai.js `siFrame`; test/step.js; CHANGELOG). The sim at
1/60 s whatever the screen; the bodies drawn between their last two steps; the camera once a frame from the body as drawn and the mouse's heading. One
world at 30, 60 and 144 Hz is the same to the bit; the frame at 144 Hz ×0.50. **Ask:** the home machine at 144 Hz — swim and turn hard, look for any
stutter or lag; a fight as before.

**v11.209 (22 Nov 2026): the sim's own random numbers** (util.js `SIMR`, `srnd`; test/simrand.js; CHANGELOG). Part 1 of the fixed step (the person:
option 2; analysis_project.md §7): what a creature or the player does draws from `SIMR`, the eye candy from `Math.random`. Next: v11.210, the fixed
step itself, with the drawing smoothed between steps.

**v11.208 (22 Nov 2026): F8, the GPU probe** (src/probe.js; rec.js `REC.probe`; test/probe.js; test/report.js; CHANGELOG). Each part of the frame
skipped and each heavy effect switched off in turn, timed on the person's own GPU, kept for the report. For the tower's main pass (22–35 ms at 0.6 MP on
low): what the low tier cuts waits on its probe. **Ask:** F8 then F9 on the tower, under water and on the surface.

**v11.207 (22 Nov 2026): the tier samples again** (main.js; test/idle.js; CHANGELOG). v11.202's mid-line `//` comment had swallowed the loop's
`tierFrame` call: from v11.202 to v11.206 no verdict was made or changed. **Ask:** `tier()` after a minute of play on a browser with no verdict.

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
