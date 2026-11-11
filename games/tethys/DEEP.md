# DEEP.md — the deep under the region model (10 Nov 2026)

Status: **designed; §8 (the pit and the cairns struck) built v11.95; the oxygen field and the re-homing (§11 step 2) v11.96; the floor (§2, step 3) v11.97; the deep gardens (§3, step 4) v11.98; carcass falls (§4, step 5) v11.99.** The person's decisions are in §10; the build is §11. Read PLANET.md first (The ocean, the head note on The
basin), then GLOBE.md §9.1 (the region model and its basins), FLORA.md (the deep floor, the vents, the rim) and SEAFLOOR.md §4. The rule
stands: nothing has a name or a biome; every species places itself by envelope over the fields; nothing glows or moves without a reason.

## 1. Why

The person (10 Nov 2026): **let the region model's basins decide where the dark is.** The model encloses no basin round ours: the water beside
ours reaches the open ocean over a saddle near −1060. So the −450 chemocline round ours goes, and with it what was built on it. What takes
its place follows from two things only: how enclosed the water is, and how much food sinks into it. Open water under a productive island is
low in oxygen at mid-depth but not empty of it; only enclosed water goes without.

## 2. Round ours: an open deep with an oxygen minimum (survivable)

**The water.** Oxic to the floor, with an **oxygen-minimum layer** where the island's own food, raining down, is breathed faster than the
ocean ventilates it — Earth's tropical open oceans have one at 400–900 m without any wall round them. As a share of the surface's oxygen:
1 to the base of the light (~−150), falling to a core of **~0.3 at −500 to −800** (hypoxic, not anoxic: the person, survivable), recovering
toward ~0.5 at the floor (deep water ventilated from far away). The core is deeper and lower under the fed flank and in the lee's eddy (the
retention field, PLANKTON §12: the food is held there), shallower and weaker upstream. No sulfide, so no milky plate and no browner water;
no dissolved iron (iron dissolves only without oxygen).

**The temperature.** The open ocean's profile, not the basin's sill-depth water (PLANET's 8–10 °C goes with the basin): 26–28 °C to the
shelf's base (~−60), ~15 at −200, ~9 at −450, ~5.5 at −800, ~4.5 at the floor (−1100), ~2 on the plate (−3800). For the physiology model
(DIRECTION, decided, not built) when it comes.

**The life, as it is today, re-read.**
- **The abyssal: same depth, a better reason** (the person). Big predators on Earth (bigeye tuna, swordfish) hunt the upper edge of an
  oxygen minimum, where it squeezes their prey up into the water above it. Its rim is the minimum's top edge instead of a chemical line; its
  envelope (−560 to −380) stands.
- **The pall** lives in the minimum's core: PLANET already decided it belongs in the suboxic band, on the vampire-squid precedent (Earth's
  lives in its oxygen minimum on blood that binds oxygen at almost nothing). Its envelope moves from "below −470" to the core by oxygen.
- **The picker** (hypoxia-tolerant, picks at what sinks) works the minimum's floor and the carcass falls (§4).
- **The swarms' day depth.** Earth's migrators shelter in the minimum by day, out of the hunters' reach; the swarms' day layer (v11.84)
  reads the oxygen field.
- **The relict** keeps its ground: old bare rock below the light — the model's drowned members (the guyots that replace the hand-built
  sill, GLOBE §9.1).

**The floor.** Where there was one black plain (**built v11.97**, chunks.js `terrainColor`, `FLOOR_COL`, world.js `apronAt` — revised when it was
built, 11 Nov 2026: the draft put nodules on "the far plain", and a floor at −1100 in the tropics grows none):
- **The islands' aprons** — volcanic sand and silt off their flanks, dark grey-brown, laid fast, so manganese cannot grow on them. The supply
  is the rain on an island's land: `apronAt` is 1 at a record's foot and fades over 2 km plus 1.3 m for every metre of land radius. Ours, a
  rim with almost no land left, sheds little (what it shed standing high is under 2–3 Myr of ooze); the giant's reaches ~11 km past its foot.
- **The open floor: foraminiferal ooze**, pale grey-cream. A tropical floor above the carbonate compensation depth (Earth's ~4.5 km) is
  carbonate ooze; nodules belong to the abyssal plains under it, or to floors kept bare. So beyond the aprons this floor is pale, not black.
- **Pavement where the current keeps the floor bare** — iron-manganese on rubble, nodules speckling it, black: the sill's gap, where the
  inflow (`flow` 0.94) sweeps it (the Blake Plateau's pavement lies at ~800 m under the Gulf Stream for the same reason).
- **Crusts on rock** — iron-manganese grows 1–5 mm a million years on rock left bare in oxic water, thickest in the crust zone just under an
  oxygen minimum (the manganese the minimum releases comes out there): old rock below the light darkens with depth, to 0.6 of the way; fresh
  flows (`young`) carry none. SEAFLOOR §4's crusts are right at last (they were placed below the chemocline, where they cannot form).
- **The coat follows** (creatures_spec.js `coatClassAt`): manganese on pavement and crusted rock below −250; on ooze and apron the preset.

## 3. The deep gardens (sessile; no new fauna)

**Earth.** Cold-water coral reefs and seamount gardens: stony corals without algae (Lophelia, 200–1000 m, 4–12 °C), sea fans, black corals,
glass sponges — densest on hard ground where the current speeds up (seamount summits and rims, ridges, scarps), thin in an oxygen minimum's
core. The reef builders branch a centimetre or two a year; their mounds take tens of thousands of years.

**Here.** The lime polyps' line without its symbionts — the drifters' fixed stage (FLORA, Founders), which builds reef in the light with a
green partner — builds in the dark on plankton alone: **a branching deep reef former**, white to pale ochre, with the existing deep forms
beside it (glass on its stalk, frond, the lure-feeders stalk and ltree, lily) carried down to the floor. Placement by the fields, as all flora:
hard ground (`sub`), fast water (`flow`), the edges where the current accelerates (terrace lips, dike walls, talus, a guyot's rim), depth
−150 to −1100 with a thinning in the minimum's core (oxygen under ~0.35), and age (`young` low): **mounds only where the ground has had time**,
so the old members' rims are the richest and ours' flanks (3 Ma) carry thickets, not mounds. Big mounds are structures with collision in the
far layer (`bigsFor`); the small are pooled species with cut materials (FLORA_FAR's rules).

**Built v11.98** (flora.js; the person: "start step 4, the deep gardens"):
- **`thicket`** — the horn's bauplan (`hornB`), white to pale ochre, 0.9–2.2×, `per` 160, on `h` −1100..−150, `sub` ≥ 0.55, `rel` ≥ 0.6, `flow` ≥ 0.2,
  `oxy` ≥ 0.32, slopes to 1.4. **The relief stands for the quickening water below the light:** the flow field is surface- and tide-driven and
  reads a flat 0.22 everywhere below −300 — no internal tide over an edge — so below the light "where the current accelerates" is the convex
  hard ground (`rel`, the ground over its smoothed self); above −300 the flow itself still counts. 59 km² of ground: the sill's drowned summits
  north-east (the old members' rims, as designed) and the giant's shelf edge; none on ours' own flanks, which are mud below the light.
- **`mound`** — the thicket's rubble: a pale heap (`HEAP_B`, 6–14×, collision, the far layer's), `per` 2, on old (`young` ≤ 0.2), sharply convex
  (`rel` ≥ 0.85) hard ground, −900..−200, out of the minimum's core (`oxy` ≥ 0.35).
- **`glass`, `frond`, `pen` carried down to −1100** over the fed water (`nut` ≥ 0.18 with a taper of 0.04, so the open basin's 0.12 is out —
  the default 15% taper had let it in: 1,100–1,400 km² of the plain), thin in the core (`oxy` ≥ 0.3): `glass` 136 → 259 km², `pen` 67 → 230.
  `lily`, `vase` and `barrel` keep their ranges (their flow gates hold them above the deep's 0.22). The lure-feeders `stalk` and `ltree` named
  above exist nowhere in the game; nothing was revived.
- **envW's `oxy` term** (world.js `oxyProf`): the open water's oxygen at the ground's depth by the fields' `nut` — the profile `oxyAt` uses, without
  a basin's chemocline (the chemo gate does that).

## 4. Carcass falls

**Earth** (whale falls): a large carcass on an oxic floor goes through stages — mobile scavengers strip it (months to two years), then
opportunists work the enriched sediment and the bones (months to years), then bacterial mats live on the sulfide from the bones' fats
(decades). On an anoxic floor nothing eats it: it is preserved.

**Here.** A big body that dies and is not eaten (the veil, the abyssal, the ridge, a big slowblood) sinks; on the floor it is a structure
with stages on the game's clock: scavengers (the picker, any hungry hunter by `SMELL_R`), then the enriched patch, then the skeleton with
its mats — **the grey mats move here** (and to the vents; §6). The carcass model exists (creatures_ai.js, DIRECTION's "a veil's carcass
feeding the island for days"); the sinking, the floor and the stages are new. Below a chemocline (the basin, §5) there are no scavengers:
bodies and bones lie as they fell — the graveyard.

**Built v11.99** (creatures_ai.js `FALL`, `FALLS`; the person: "start step 5, the carcass falls"):
- **A fall is a record** (plain data, in the save: `fallsOut`/`fallsIn`) that outlives its cell: while a cell holds it, its flesh is a carcass
  (outside the ledger) the scavengers and the player eat at; its bones a mesh. Unloaded and reloaded, the carcass comes back with the flesh
  the clock left. The flesh goes at the scavengers' rate by the record's own clock — 1 game day for a 5 m body, 3 for the abyssal's 15
  (`FALL.scav`) — plus whatever eats at it while it is in sight.
- **The stages, on the person's clock:** the enriched patch for ~10 days after the flesh (a stain draped on the ground, the floor's own
  colour darkened toward rotting fat, fading at its edge); the mats from day 3 to ~40 (pale tufts on and round the bones); the bones until
  buried — 60 days on an island's apron, 150 on the ooze (`FALL.bury`). A shown fall is rebuilt as its stage moves (once a game day).
- **Where they come from:** a body of 5 m or more killed in sight and not eaten whole; and the ledger's off-screen dead of the big mortal
  kinds (ecology.js: natural deaths and the starved, in cells not loaded), each whole one a fall at a place in its cell, on the floor —
  ~5.4 a game day over the world (ortho 2.7, ridge 1.7, sickle 0.7, comb 0.3). Not the swarms (no body). `FALL.max` 400 records keeps ~74
  days of them; the oldest bones go first.
- **The graveyard:** a fall under a basin's chemocline draws no scavenger (`findCarcass`), its flesh goes at a twentieth of the rate and no
  mats grow. None in the world yet (no basin), so unseen.
- **`falls()`** in the console: the nearest falls, their stage and the `tp()` to each. The ledger's census fills the world's cells over the
  first minutes of a game, and off-screen falls start where it has.
- **Answered by the person (11 Nov 2026):** the veil, the tread and the great **age and die** (they were immortal in the ledger, `hp` 1e9 —
  so the veil's fall never came); since v11.100 they are mortal: the ledger's natural death takes them (veil 1,469 → 1,642 over the 120-day
  census, tread 77 → 82, great 152 → 161 — steady), they fall (the veils ~2.4 a game day over the world), and like everything else they can
  be wounded. **The bones landmark** (a permanent ~100 m ribcage) **was a holdover**: struck v11.100 — "maybe later we add fantastically large
  animals and bones, but for now, no."

## 5. The basin 28 km west — the dark, at scale

From GLOBE §9.1 (seed 32, a 1.1 km grid; recomputed at the game's grain when built): between ours, the giant and the awesome shield,
~317 km² behind a sill at −980, its chemocline at −1000, its floor at −1363. Pitch black (far below the light), ~5 °C (sill-depth water),
and below the shelled ringmouths' crush depth (PLANET: they implode before −800): only soft and armoured bodies go there.

Everything the −450 carried round ours lives here, where the geometry holds it: the milky bacterial plate at the chemocline; **the seep
line**, the straddlers rooted below with crowns above, round the basin's walls where the plate touches them; ochre iron where the ferrous
water meets oxygen; black iron-sulfide shells; the poison by feeding below it (COMBAT §3b); grey and black mats; the graveyard (§4).
DIRECTION's "what is at the bottom" has its address on the rim (§6).

Its centre lies at x ≈ −27 km, just past the square's west edge (−25.8): half of it is inside the world today. All of it needs the world
grown west (GLOBE §10, or `NCELL` alone).

## 6. The constructors' structures (the person: their structures first, the fauna later)

DIRECTION: the deep line's ringmouths, the clever clade's clever end, "arranged things at the rim that should not be arranged … never
explained". The believable floor under that mystery is large and real:
- **Dens and middens.** Octopuses dig dens under slabs and wall them with stones and shells, and the shells they eat pile into middens round
  the den — at Octopolis and Octlantis (Jervis Bay) the middens built up a whole settlement. The midden is how a den is found.
- **Brood fields.** At Davidson Seamount, 3,200 m down, thousands of deep octopuses brood together where warm water seeps through the rock:
  the warmth shortens the eggs' time. Dens gather where the ground is warm.
- **Carried and stacked things.** Octopuses carry shells as shelters and stack them; anything hard is building stuff.
- **Arrangements.** A small pufferfish (Amami-Ōshima) ploughs a two-metre sand circle with radial ridges for a nest, a pattern that looks
  designed. Patterned building is real behaviour; it needs no magic to start.

**Here.** On the basin's rim, along the seep line (the food is concentrated where the plate meets the walls) and never below the
chemocline (they breathe): dens under crust slabs, walled with stacked nodules and shells; middens of the basin's black sulfide shells round
each; denser where any warm seepage comes up — where the awesome shield's young flank meets the rim, if the build finds one there; and
round some dens, patterns in the sediment — **left out of this pass** (the person, 10 Nov 2026), noted for a later one. Built from the
ground's own materials: slabs, nodules, shells, and bones from the graveyard. As structures first (structures with collision, `settleOn`),
with the residents later.

## 7. The vents: kept, as the rejuvenated stage

Ours is 3 Ma and its shield is long finished, so a hot fissure (−250 to −280) and the chimney want a reason: **the rejuvenated stage.**
Hawaii's older islands erupt again a million years and more after their shields (the Honolulu Volcanics on Oahu, Koloa on Kauai);
Diamond Head is one of that stage's tuff cones — and so is ours (the flank cone, a tuff ring since v11.86). Vents in oxic water are Earth's
normal. The basker, the vent ranges of the picker and the cinder, the plume and the hair, the poison by heat and the black sulfide
shells at the vents all stand. **v11.96:** the same stage's diffuse seeps through the arm's fresh rock (SEAFLOOR §4; world.js `SEEP`, heat
≤ 0.14) are the cinder's reservoir, under the basker's reach, now the seep line is gone — the census found the vent field alone eaten out.

## 8. The pit, struck

The person (10 Nov 2026): "a silly holdover of an older time period … it clearly breaks believability and sets a bad precedent." The geology
agrees: pit craters stand open on an active rift (Kīlauea's), and ours went quiet ~2.5 Myr ago — talus, sand and reef would have filled a
500 m shaft long since. What goes:
- world.js: the pit term in `islandH` (`R.pit`), `PIT`, `ISLANDS[0].pit`, the comments that describe it. **Ours stops being bit-identical**
  for the first time — on purpose, by GLOBE §7's test (the reason above); the identity check is rerun to show nothing else moved.
- flora.js / chunks.js: the rim's boost round the pit (`f.rim`, the boulders' `rim`), and the cairns on its rim (`CAIRNS`, the seven stacked
  tors the person liked "as an oddity, once") — §11.
- The landmarks fixed by the pit, the dark's homes that name it (the pall's "the void, the pit", the picker's "the pit"), and the docs that
  describe it (PLANET, FLORA, DESIGN, SEAFLOOR, CLAUDE.md's "the pit and the chimney are fixed by the geology").
- Where it was: as if it had never been — the rift arm's ground, nothing marking the place (the person, §10). The cairns go with it.

## 9. Oxygen, and where it lands in the code

**The field.** `oxyAt(x,y,z)` (0..1 of the surface's) and `chemoAt(x,z)` (a basin's chemocline, or none), in world.js. The basins at the
game's grain from `sample()` at load, by region.js's flood; a few chemocline discs as uniforms for the shaders' plate. The player
(survivable): nothing above ~0.5; in the minimum's core a slow, recoverable deficit (the sprint and the body's ability first), gone again above
it; below a chemocline a hard drain — the basin is entered on reserves (DIRECTION's reserves and the sulfur symbiont have their door). The
slowbloods and the low-metabolism residents shrug it off (PLANET, decided). Envelopes gain an `oxy` term beside `h`.

**The 21 uses of `CHEMO`.** scene.js's plate and browner water → the chemocline discs; atmosphere.js's snow layer → the minimum's top
edge or none; chunks.js's "nothing sessile below the chemocline" → oxygen and the chemocline; far.js's two skips; combat.js `POISON.deep` →
`chemoAt`; creatures_spec.js's sulfide coat → `chemoAt` or heat; creatures_ai.js's depth clamps for the pall and schools → oxygen;
creatures_defs.js's pall row → `oxy`; worldmap.js's contour → the basins'; world.js's mud rule for the landmarks. chunks.js `terrainColor`:
the apron, the far plain's nodules, the crusts by age. flora.js: the deep reef former; glass, frond, stalk, ltree and lily carried down; the
seep and the grey mats re-homed.

## 10. The person's decisions (10 Nov 2026)

- **The pit goes** (§8).
- **The abyssal: "same depth, better reason, yes"** (§2).
- **New deep life: the gardens, the nodules and the carcass falls, "100%"; fauna can wait** (§2–4).
- **The constructors in the basin 28 km west, "perfect"; their structures first** (§6).
- **The oxygen minimum survivable** (§2, §9).
- **The cairns go with the pit**: "another holdover from a time when there were cool looking things in the game for the fuck of it." (§8)
- **Where the pit was: "it should look like it was never there, like the rest of the environment around it"** — no bowl, no scar: the rift
  arm's ground as if the pit had never been cut (§8).
- **The carcass fall's clock as proposed:** scavengers 1–3 game days, the enriched patch ~10, the mats ~40, the bones until buried (§4).
- **The constructors: dens, walls and middens, yes; the patterns in the sediment are left out of this pass**, noted for a later one (§6).

## 11. Open, and the build

**Built v11.96 (step 2):** `OXY`, `oxyAt`, `chemoAt` (world.js; DESIGN, The water's oxygen); the plate and the brown struck from the fog; the snow's
plate and black flakes by the camera's column; the seep and the grey mats on a band about a basin's chemocline; the cinder's seep-line row
struck (it returns about a basin, §5); the poison and the sulfide coat under a basin's chemocline; the pall in the core over the fed deep
(`h` −1200..−560, `nut` ≥ 0.25: 3,222 cells against 6,023); the readout's `oxy`. The silled rule refined (region.js): a sill between −100 and
−1100 — the inflow the minimum's water, not the ventilated deep's — and 10 km² or more; seed 32's only big dark is then the basin west.
Not in step 2: the player's oxygen (§9), the swarms' day depth by it. **Built v11.97 (step 3):** the floor (§2). Nothing open (answered 10 Nov 2026, §10). Left out on purpose: the patterns in the sediment round the constructors' dens (§6), for a later pass.

The build, proposed, in order: (1) strike the pit; (2) the oxygen field and `chemoAt` — the −450 plate goes round ours and the envelopes
move (the pall, the picker, the seep, the cinder's seep range, the grey mats, the poison, the sulfide coat); (3) the floor: the apron, the
crusts by age, the nodules far out; (4) the deep gardens; (5) carcass falls; (6) the basin and the constructors' structures — after GLOBE §8
step 5 puts the square's members in and the world reaches the basin.
