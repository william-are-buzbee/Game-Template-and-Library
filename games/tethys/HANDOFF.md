# HANDOFF — tethys

Where things stand: the latest versions, what to ask the person, what is open. Current state only — every version's whole story is its
CHANGELOG entry, and this file as it stood to v11.191 (220 versions back to v11.18, with the old dated notes) is `archive/HANDOFF-to-v11.191.md`.
Add the new version's paragraph at the top; take out what is no longer true; keep the five latest.

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

**v11.228 (24 Nov 2026): the clock and the risk** (creatures_defs.js `BEHAVE`; creatures_ai.js `CLK`, `CK`, `REST`, `RISK`, `findPrey`, the roles;
combat.js `dread`; test/clock.js; BEHAVIOUR.md, new; DESIGN Creatures; CHANGELOG). The behaviour overhaul's pass 0, after the person's answers (24 Nov
2026: the shared parts first, *"Clock and risk first"*; the player's bias struck; sight by light for the creatures, pass 1; readable predators, *"yes
absolutely"*). Every kind keeps hours from Earth's reef shifts (the night's eel, lurker, arrow, rasp, flicker; the day's grazer, darter, crusher; the
changeover's ridge and needle; the wedge the tide's) and rests out of them (cover, floor, sand, hover, a slow cruise), hungrier before it hunts; the
schools settle at night. Prey is weighed by its mass, its bite, its venom, the hunter's own wounds and how far it is failing; the player is weighed as any
body. Prey that watches a hunter is looked at first — a slowblood circles, a ringmouth holds off facing it, a hingeshell never looks — and its answer
decides: running is chased, a turned back is the opening, coming at it drives it off. Fixed: the crusher's carrion, the arrow's jet pose, a wounded
hunter fleeing the player whatever hurt it, the carcass glow read from the drawing. The frame within noise (the forest ×0.97, p95 ×0.89; Chromium ×0.94), the GPU's counts the same. **Ask:** BEHAVIOUR §8 — whether the look reads and facing it down
is fair; whether the shifts show; whether the shelf by day is too quiet.

**v11.227 (24 Nov 2026): the hoop and the quill; the abyssal fed** (creatures_spec.js `SPECS.hoop`, `SPECS.quill`, the tentacles' `sieve`;
creatures_defs.js `DEFS`, `STATION.canopy`, `stationW`, `SPAWN`, `VARIETY`; creatures_ai.js `filterSeek`'s `gape`, `plumbY`'s `canopy`; test/hoop.js;
test/plumb.js §8; CLADES, PLANET, DESIGN; CHANGELOG). The person's *"filter feeding slow blood giant and the smaller cone vertical ring mouth"*. The hoop:
the ridge's line as a 16 m filter giant in the fed open water, its mouth's tentacle ring a sieve held open inside a swarm (~7,500 in the world). The
quill: the plumb's line at 3 m, hung among the weed forest's stalks by the new canopy station (~29,000). The abyssal, which was collapsing on main
(392 → 73 in 90 days: its prey breed too slowly), now eats the ortho too: from 2,017 it settles near half that (its least ~970 at day 325, rising after), the ortho steady at ~12,900. **v11.227.1**: the person found the hoop by accident while searching the island for a single quill — there were ~15 on the whole shelf;
now ~40 there, in stands of five (`grp`, `n` 8). **Ask:** does the hoop read as a filter
giant (its ring open in a swarm); can the quill be found among the stalks, and is it the small upright one they meant.

**v11.226 (24 Nov 2026): the individual for every placed species** (creatures_defs.js `VARIETY`, `GROW`, `MORPHS`, `VARY_AUTO`; creatures_ai.js
`autoVary`, `KIND_LOD`; test/variety.js, test/combat.js; VARIETY.md; DESIGN; CHANGELOG). All 38 kinds the ledger places are individuals: the clades' growth
laws (soft ringmouths narrow, slowbloods' old giants, hingeshells in moult steps, drifters by food), morphs with causes (red, yellow, dark, pale,
banded, spotted), proportions by part; five uniform (the schools, the pall, the cinder). First sight of a busy place ×1.13 (once a session); the
frame level; no hitch on the person's card. **v11.226.1**: a morph's odds follow the place (`placeOf`, `FAVOUR`) — the dark ones where the background
is dark, about one in 100 on the bright dunes; the black ridge 37% over the open ocean. **Ask:** whether the dark morphs now sit where the dark is.

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
