# HANDOFF — tethys

Where things stand: the latest versions, what to ask the person, what is open. Current state only — every version's whole story is its
CHANGELOG entry, and this file as it stood to v11.191 (220 versions back to v11.18, with the old dated notes) is `archive/HANDOFF-to-v11.191.md`.
Add the new version's paragraph at the top; take out what is no longer true; keep the five latest.

**v11.232 (25 Nov 2026): the hingeshells** (creatures_ai.js `HINGE`, `DEN`, `HOOK`, `TIDEW`, `premoult`, `MOULT`; creatures_spec.js `VALVE`;
creatures_defs.js `BEHAVE`, `DEFS.hook`; test/hingeshells.js; BEHAVIOUR §3f; DESIGN Creatures; PLANET, CLADES, LINEAGE status notes; CHANGELOG). The
person on v11.231: *"go ahead with the hingeshells pass … being hunted seems OK."* The hingeshell hunters strike and do not chase: no sprint, a hunt
given up when no strike comes in 8 s or two miss. The valves breathe at rest. The hingeshells that rest in cover keep a den and run to it. In a
moult's last hour the valves stay down and the animal hides; the soft window is doubled to nature's lower end (5%), the player's too. The hook drops
on what passes under it and climbs to a new post when nothing does. The scuttles walk out on the flats at low water. **Ask:** BEHAVIOUR §8.9 (the
player's soft window, now 54 real minutes for a hose); whether the hingeshell hunters still frighten without chasing.

**v11.231 (24 Nov 2026): the slowbloods** (creatures_ai.js `TEMP`, `tempAt`, `THERM`, `BASK`, `HERD`, `FORAY`, `CHASE`; creatures_defs.js
`THERM_F`, `BEHAVE`; combat.js `slowOf`; test/slowbloods.js; BEHAVIOUR §3e; DESIGN Creatures; PLANET, COMBAT, DIRECTION status notes; CHANGELOG). The
person: *"go ahead with the slowbloods pass."* The water has a temperature (27 °C to −60, the thermocline to 3 °C, the vents' bubble), and a slowblood's
body follows it with its size's lag: the cold slows its speed, turn, notice and hunger, floored for the ridge (mixotherm), the abyssal and the hoop
(gigantotherms) and the torpid stone. The basker goes home to its vents to bask when cooled. A grazer's fright runs through its herd. The abyssal
forays below its rim. A chasing hunter sprints over its speed while its stamina lasts, then gives up spent — after you too. **Ask:** BEHAVIOUR §8.8
(should the cold slow you as a finback?); whether the sprint and the giving-up feel right.

**v11.230.1 (24 Nov 2026): the hangers roam** (creatures_ai.js `ROAM`, `plumbRoam`, `standFollow`, `quillHide`, `hangGo`, `hangPath`, `hangFloor`,
`plumbY`, `PLUMB.surf`; creatures_defs.js `SPAWN`'s last rows, `stOf`; chunks.js `placeKind`; ecology.js; test/ringmouths.js; BEHAVIOUR §3d; DESIGN
Creatures; CHANGELOG). The person on v11.230: the plumbs and the quills should roam, quills need not be in stands, the plumb's rise reads only with
lateral movement near the surface, and ranges should follow where an animal can live. By day a hanger moves its station now and then round its post
(a stand together); every plumb leaves at dusk, fed or not, and roams the night with its shell's top 3–6 m under the surface, slanting up as it goes;
a hungry plumb no longer forages on through the day. New rows: plumbs off the walls in still water, quills alone in and past the weed, an arrow pack
in the open water over the upwelling. **Ask:** BEHAVIOUR §8.6–7 — whether the night's plumbs read now; ranges by survival in a session of their own.

**v11.230 (24 Nov 2026): the ringmouths** (creatures_ai.js `updatePlumb`, `PLUMB`, `trimOf`, `phaseOf`, `QUILL`, `PACK`, `INK`, `LURK`, `landBite`;
creatures_defs.js `DEFS.great`, `BEHAVE`; creatures_spec.js `SPECS.great.hit`; test/ringmouths.js; BEHAVIOUR §3c; DESIGN Creatures; CHANGELOG). The person:
*"go ahead with the ringmouths pass and the plumb."* A hungry plumb leaves its wall at night to forage at the layer's depth, goes up a carcass's scent
to eat, and is home at dawn; the oldest hang at their day depth (the trim). A quill's stand sways as one and drops into the stalks when you come close.
The arrows hunt as a pack, coming at a school from both sides, and ink when a chaser closes. The lurker leaves a post where nothing passes. The great
hunts (the grazer, the eel, the plough, you), its ram the bite's opening blow; the `coil` role is gone. The pass costs nothing measurable over v11.229 (×1.00); v11.229's senses ×1.05 over v11.228 (`findPrey`). **Ask:** the plumb's night and its
gathering at a fall; the pack; whether a lethal great on the shelf is wanted. **Next:** the slowbloods (BEHAVIOUR §4: the temperature model first).

**v11.229 (24 Nov 2026): the senses** (creatures_ai.js `clockTick`, `sightOf`, `hearOf`, `notices`, `plumeK`, `SENSE`, `SCENT`, `FREEZE`;
creatures_defs.js `EYE_K`, `LAT_CLADE`, `BEHAVE`; combat.js `findBleeding`; fx.js `phoStep`; test/senses.js; BEHAVIOUR §3b; DESIGN Creatures; BIOLUM §7.6;
CHANGELOG). Pass 1, after the person's playtest of v11.228 (*"enjoyed it, go ahead with pass 1"*). Animals notice each other by sight — the light at
the body seen through each clade's and kind's eyes, a silhouette from below, a still body seen late, a matching or buried one later, one in the weed
later still — and by the lateral line (light-blind, silent for a still body); blood and carrion are smelt down the current. Prey use the same senses; the
cryptic grazers freeze (a hingeshell clamped) and bolt close. The step reads its own sky (the plumb's and the swarms' layer, the eclipses), and the
pall's cloud and flee are the step's, whatever the effects list says. The frame within noise (×1.00, p95 ×1.06; Chromium ×1.02), the GPU's counts the same. **Ask:** BEHAVIOUR §8.4–5 — whether the night hides you now, or too
well; whether your own colour should.

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
