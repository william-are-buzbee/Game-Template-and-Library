# HANDOFF — tethys

Where things stand: the latest versions, what to ask the person, what is open. Current state only — every version's whole story is its
CHANGELOG entry, and this file as it stood to v11.191 (220 versions back to v11.18, with the old dated notes) is `archive/HANDOFF-to-v11.191.md`.
Add the new version's paragraph at the top; take out what is no longer true; keep the five latest.

**v11.234 (25 Nov 2026): the fan rebuilt** (flora.js `fanB`, the `fan` entry; grow.js `branch`'s `col2`; FLORA.md's head note and roster; CHANGELOG).
The person: *"the multicolored triangles are a bit too ubiquitous and look kind of strange"* — the fan, a squashed cone in four vivid tints at 200 tries
a cell. Asked to strike or rebuild, the person chose the rebuild: a pale branching fan in one plane across the current, 40 tries a cell in patches,
only in strong current below 12 m — about a ninth as many. **Ask:** whether the new fans read as fans, and whether they are now too few to notice.

**v11.233 (25 Nov 2026): the drifters** (creatures_ai.js `DRIFT`, `STRAND`, `updateJelly`, `updateSailer`; creatures_defs.js `BEHAVE`; ecology.js
`POP.stung`; test/drifters.js, test/live.js; BEHAVIOUR §3g; DRIFTERS, DESIGN; CHANGELOG). The person: *"Let's do the drifters while I test this
out."* A jelly or a sailer's lines hold a small swimmer that touches them, haul it to the mouth and eat it, then digest; the player is stung, never
held. The jelly follows the plankton's daily layer. A sailer that grounds on a shoal or the strand dies there, carrion for the scuttles. Rare in play:
drifters are about one a cell. **Ask:** BEHAVIOUR §8.10 (what eats a live drifter); whether a catch is ever seen.

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
