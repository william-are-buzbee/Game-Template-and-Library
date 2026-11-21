# HANDOFF — tethys

Where things stand: the latest versions, what to ask the person, what is open. Current state only — every version's whole story is its
CHANGELOG entry, and this file as it stood to v11.191 (220 versions back to v11.18, with the old dated notes) is `archive/HANDOFF-to-v11.191.md`.
Add the new version's paragraph at the top; take out what is no longer true; keep the five latest.

**v11.199 (21 Nov 2026): the tier follows the machine** (scene.js `TIER_K`, `TIER_SAVED`, `tierStep`, `tierFrame`; test/tier.js; DESIGN
"Performance and the quality tier"; analysis_project.md §4; CHANGELOG). The person's "option 2". Each browser keeps a verdict from its GPU's own
time: high far too heavy on the menu (over 40 ms) reloads into low at once; in play a minute over 20 ms is low from the next start, under 6 ms on
the machine's low is high again. `#low`/`#high` still win. Built on v11.198 (stacked: its PR first). **Ask:** the work tower without `#low`:
it should reload itself into low within seconds of the menu, and say so; the home machine should stay high.

**v11.198 (21 Nov 2026): the recorder drops the GPU timer's junk** (rec.js `RG_MAX`, `RG.junk`; test/report.js; test/rec.js; DESIGN "The flight
recorder"; CHANGELOG). The work tower's reports #148–149 had one GPU reading of 960,769 ms (no disjoint flag), which made the session's GPU mean 63 ms
(the median 24.8) and one place's 72. A reading under 0, not a number, or 2 s and over now drops its frame and is counted (`gpu.junk`); report.js
flags an older report that has one and prints its mean without it. **Ask:** nothing; the next work-tower report should show `junk` if it happens again.

**v11.197 (21 Nov 2026): the terrain stays in optimised code** (world.js `RDATA`, `rdata`, `recSeal`; region.js's load; test/opt.js; DESIGN, the
world's speed; CHANGELOG). The person's GC pauses: the long ones were v11.195's (the list held every slot whole: a full collection ×2.4 with six
slots here); the rest is garbage. 2.3 of the game's 4.2 MB a frame (the bench page, swimming) was islandH, stuck in V8's baseline tier: a record's
objects on shapes V8 had retired, which the optimiser takes no feedback from — 25 throw-outs and never again. Rebuilt on shapes of their own; the
world bit-identical. **Ask:** a report from home after 20+ minutes — the `gc` frames and the heap's sawtooth.

**v11.196 (21 Nov 2026): a save no longer stalls play** (save.js `popJob`, `popStep`, `popBin`, `saveSoon`, `saveStep`, `slotPack`, `slotUnpack`,
`slotJSON`; test/slots.js, test/player.js, test/boot.js, test/ledger.js; DESIGN, the save paragraph; CHANGELOG). The home report #143: every save in
play ~160 ms (the autosave, the pointer's release). The ledger is binary streams of runs now (SAVE_V 4), Blobs in IndexedDB, and a save in play is
walked over ~47 frames (~1.5 ms each) instead of at once; esc, a death, the page leaving still save at once, ×0.15–0.3 of before. Old saves load.
Built on v11.195 (stacked: its PR first). **Ask:** a report from home after some play — no `IDBRequest`, `pointerlockchange` or autosave hitch.

**v11.195 (21 Nov 2026): the save list reads summaries** (save.js `slotSum`, `slotPut`, `slotGet`, `slotDel`, `storeSums`; menu.js, main.js
`bootSlot`; test/slots.js; DESIGN, the save paragraph; CHANGELOG). The home reports (#141, #142) blamed 6 s of freezes on the store: the menu's list
read every slot whole, ledger and all. Every slot now has a summary beside it, written in the same transaction; the list reads only those; a slot is
read whole when it is continued, exported, or is the boot's last; an old slot is read once and given one. **Ask:** on the home machine, the menu and
continue with the slots it has (the first boot migrates them), and an F9 report — its long animation frames should no longer name the store.

## Open

- **The plan** (analysis_project.md, the person's order, 20 Nov 2026): 1 the recorder (v11.191), 2 the docs (v11.192) and 3 the type checker (v11.193)
  done; 4 the flora's far copies built and off (v11.194, `#lod`; their question still open), and the tier that follows the machine (v11.199, the person's call); next 5 the cells in workers, 6 three.js upgraded, 7 a fixed step and seeded sim; one door and
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
