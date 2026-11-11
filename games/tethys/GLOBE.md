# GLOBE.md — the planet, then the region (25 Sep 2026)

Status: **designed, not built.** The person's decisions are in §7; the build is deferred to a chat with room for it (§8). Read PLANET.md first (The
planet, Geology) and ARCHIPELAGO.md: this doc revises ARCHIPELAGO's "one chain" into a cluster and says why; nothing in PLANET changes.
**Revised 10 Nov 2026:** no planet map — the region is drawn by a model of the plume's history (§9, agreed; **built v11.94**: src/region.js,
region.html, test/region.js — §8 step 1); a world that size, every member reachable (§10, proposed); the person's answers of that day in §7,
the build order in §8 rewritten.

## 1. Why zoom out

The game's rule is that everything on the island derives from its geology. The geology of an island *group* derives from its plate: how fast it
moves over the plume, how the plume pulses, how far the continents are, whether the sea has risen and fallen. Those are questions a planet answers
and a region cannot, and they are exactly the questions the chain has been guessing at — how many islands, how far apart, how big, which are drowned.
The person (25 Sep 2026): create the whole planet from its described characteristics, place ourselves on it, and when a region looks archipelago
enough, say "this is Tethys" and point at where the game could be. Island sizes are not to be guessed; the geology hands them over.

## 2. The planet's five facts (decided 25 Sep 2026)

1. **Continents exist, far away.** A world with plates and continents; ours is a small ocean plate a few thousand kilometres from any coast. Rivers
   and continental nutrient exist somewhere and matter nothing here. The feeling wanted is "something vast out there beyond the blue", never a
   coast on the horizon. PLANET's "no continent, so no river nutrients" stands as a statement about our neighbourhood.
2. **Latitude 10–20° (built: `LAT` 0.2 rad, 11.5°).** The trades, the easterly waves and the season are already this latitude's (CLOUDS.md, world.js
   `TILT` 15°, `sunDec`). Warm mixed layer, weak seasons, and cyclones possible — the storms pass of CLOUDS can be a cyclone's outer bands.
3. **A slow plate.** One to two centimetres a year over the plume (Hawaii's moves nine). Slow is the knob that turns a *chain* into a *cluster*:
   the volcanoes pile up round the plume instead of stringing out behind it. Direction matters only for which end is old, and that stays north-east
   (the sill is the drowned old end, world.js `SILL`).
4. **A pulsing plume.** The plume's flux varies over a few hundred thousand years, so members differ in size — two great, one enormous, some fine,
   some that never broke the surface. On Earth: the Canaries (Tenerife 3,700 m, La Gomera 1,500, the seamounts nothing).
5. **Ice ages, Earth's.** The far continents carry the caps; our latitude stays warm. The sea rises and falls ~120 m every ~100,000 years. This is
   what PLANET's "eustatic" 12 m terraces already assumed; now it is said.

## 3. What a slow plate makes: the cluster

The model is a **hotspot cluster with a seamount province** — Cape Verde (ten islands in a horseshoe 250 km across, 4,000 km² of land), the
Canaries (seven islands, 7,500 km², spacing 30–60 km, several visible from each, over a hundred seamounts and guyots round them), the Galápagos
(thirteen islands, as many drowned). Not Hawaii (a line), not the Philippines (an arc collision: it needs a trench next door, which would make us
andesite with no hotspot at all — the person wants that *size*, not that mechanism).

- **Land in the region:** 5,000–20,000 km² in all, over a province ~300 km across. The person's "twice Hawaii" (17,000 km² of land) is the top of
  what one plume makes; "a Philippines but not an Australia" is the same order.
- **Members:** on the order of six with summits above the sea and a dozen or more below it — the person's picture, and a seamount province's
  normal ratio. The visible six sit within ~40 km of one another (spacing 15–30 km: the Societies' spacing the built chain already has; Tahiti to
  Moorea is 17 km), so that from any one several show in various directions — the thing the person wants most ("almost nothing beats seeing
  multiple points of interest off in the distance").
- **Their differences are their ages**, and come free: the active shield with black flows, a plume and no shelf; the mature one with rain gullies,
  a windward cliff, a shelf and reef; the old one that is a rim and a lagoon (ours); the atoll; the guyot at −100 with a drowned reef on its flat
  top. Two islands of one age look alike, which is accurate.
- **The floor between them** is the province's ridge: feet overlapping into saddles at −900 to −1100, the basin floor beyond, the plate at −3800
  (ARCHIPELAGO, SEAFLOOR §4). "Islands that blend together and meld until they extend the floor" is this ridge; the drowned members are its
  high points.
- **Seen from the water:** a 900 m summit stands above the horizon to ~110 km in clear air; the haze allows 15–30 km on an ordinary day
  (horizon.js, `AIR`). So "visible" means within ~30 km most days and the great ones on clear days from 60–100. The weather deciding which
  peaks show is part of the vibe, not a cost.

**What this revises.** ARCHIPELAGO.md's chain (the giant 18 km SW, the young shield 36, the seamount 50, ages rising NE) becomes one lobe of the
cluster; its members and the built records stay where they are. The world's 52 km square (`NCELL` 240) is one window into a ~300 km province;
the rest is the horizon tier and later growth.

## 4. What ice adds

Ice costs nothing at the planet level and pays on every island:

- **A second shoreline at −100 to −120** on every member: a wave-cut break, drowned beaches and notches, where the last lowstand's sea stood.
- **The gullies continue under water** to that depth — the giant's rain valleys were cut when the shelf was dry.
- **Karst on the old ones**: an atoll that stood 120 m out of the water for tens of thousands of years was rained on and dissolved — sinkholes,
  caves, blue holes — then flooded. The drowned rims read as real shorelines, not only subsidence.
- **The terraces** at 12 m are interstadial stillstands; the shelf's base (~−60, PLANET) and the −120 break are two different events.

## 5. The tool: a planet map, then a region window

**Struck in part (10 Nov 2026):** the planet map (1) is not built — all it would hand over are §2's five facts, already decided. The region (2)
is drawn by §9's history model instead. Planet-Viewer (`labs/planet-viewer`) is Overworld's tool and has no relation to Tethys (the person).

Not a rendered sphere. Two pictures, both from rules, in the manner of `map.html` (loads world.js as it is):

1. **The planet** at continent resolution, equirectangular, drawn from a few rules rather than noise: plate polygons with motion vectors; ridges,
   trenches and hotspots; sea-floor depth from age (the standard curve, ~2500 m + 350 √age m); island chains along hotspot tracks by plate speed,
   clusters where the speed is low; arcs along trenches; the continents as outlines only; latitude bands for the trades, the westerlies and the
   gyres. Its job is to place us — a small ocean plate, low latitude, a plume under it, a continent ~3000 km away — and to make the region's
   numbers consequences instead of picks.
2. **The region**, a window of ~300 km cut from it: the province's members as records (`ISLANDS`, world.js), each with an age, a size from the
   plume's pulse and a state from its age (shield, mature, rim, atoll, guyot); the ridge between them; the −120 shoreline on each; the wind and
   the current from the planet's bands. The game's square is drawn on it. When the window looks like an archipelago the person says so, and the
   members' records go into `ISLANDS` in the order the horizon tier and the ledger can carry them (ARCHIPELAGO steps 1–4 are the pattern).

The value-noise machinery is not the tool here: a province is drawn by its logic (where the plume was when), and noise only grains it.

## 6. What it changes downstream, and what it does not

- **Nothing on our island**: `ISLANDS[0]` stays bit-identical (the identity test of ARCHIPELAGO step 1).
- **The chain's docs**: ARCHIPELAGO gets a head note pointing here; its table is one lobe.
- **The flora**: PLANET fixes the mixed layer at 26–28 °C; Earth kelp dies above ~20. "Kilometres of kelp reef" on the shelves is this planet's
  tropical weed forest (FLORA's, TAXA's), or it sits in an upwelling the plate map has to justify. To be decided on purpose, not by the word.
- **The road** (ARCHIPELAGO step 5, DIRECTION): the crossings between members are the saddles; the drifters and the cruisers live there.
- **Land life** (the person, 25 Sep 2026): the islands will carry flora and, later, play on land — an extension of the game, not part of this doc.

## 7. The person's answers (25 Sep 2026)

- Continents far away, yes; "a Philippines situation, not an Australia"; Iceland or twice Hawaii is the ballpark; the sight of land in the
  distance, and many of them in various directions, is the goal — "there is no reason to arbitrarily leave the world submerged".
- Latitude 10–20: yes.
- The chain's members: about six with visible peaks (two great, one awesome, two fine, one barely) and a dozen drowned, old or submerged;
  islands that blend into the floor with some rising higher. Asked whether that is plausible: it is a seamount province (§3).
- Plate direction: no preference; speed: whatever gives a believable, fun, messy series of islands — the slow plate's cluster, accepted.
- Ice: never considered; the terraces and the drowned rim are liked; what ice does to them is §4. Taken as Earth-like glacial cycles.
- **Accepted (25 Sep 2026): the cluster on a slow plate as the model, revising ARCHIPELAGO's single chain.**

**10 Nov 2026** (asked what comes next for the chain):

- No planet map; Planet-Viewer is Overworld's only. The plume's history as the model that hands over the members: agreed completely.
- **All six members reachable, eventually.** Realistically far apart if that is how far apart they are, and the whole world playable: "we can make
  a huge world, we just need to discuss how best to do that" (§10).
- **The test for any change**, our island included: not "make the world bigger" but "represent the island chain more accurately, and this piece is
  not accurate for x, y, z reasons" — accurate relative to this alien planet's Earth-like conditions. A lot of work has made the ecology feel
  believable; moving, adjusting or changing it is fine when it passes that test. Treat it less as a game than as a simulated ecology.
- **The giant gets its own attention later**, rivers included if a thorough look finds them plausible; rivers look expensive with the water
  physics as it is. Land can be ignored for now, until foliage can be made really cheaply: meanwhile it is "an awkward brown mountain".
- **Believability within scope, above all.** Not a straight line in one direction; different elevations and ages; space between things is fine,
  and long crossings are fine (fantastical things can later be placed between or around otherwise believable areas). As cool and
  player-friendly a space as a believable reading of the ecology allows. Some islands of the planet may be huge, near-continents, or tiny and far
  away: not shown here. The picture: the Galápagos or the Seychelles or something smaller — better, **several clusters at different
  elevations** — with enough formations that two areas that are "the same" in many ways look and feel different. Sameness where nature is
  samey is accepted.
- **The order of the work:** first a world that could stand on its own as a believable ecology for this planet, its conditions and its animals;
  only then the uniqueness and the human-positioned things that make a game fun.

## 8. Open, and the build

Open for the person, not to be decided here: the region's exact layout (picked on §9's page, as the chain was drawn on map.html); the weed
forests' warmth (§6); §9's and §10's open lists. Settled 10 Nov 2026: which member is which comes from the model, not from a pick; the world
grows to hold every member (§10).

The build, in order (rewritten 10 Nov 2026; the old one began with `globe.html`): (1) the region model (§9) and its page, ours and the giant
pinned (built v11.94, §9.1); (2) the person's layout (seed 32, 10 Nov 2026); (3) SEAFLOOR §4's formations as `islandH` terms by a member's age and state, each passing §7's test on our
island before it lands there; (4) the engine for a world that size (§10), every step invisible; (5) the records into `ISLANDS`, the horizon tier
first, then reachable — the game's own square first (its eleven members, the sill as the model's old track, the chemocline by the basins:
it needs no engine work, the square exists; **built v11.102**, §9.2); (6) the colonisation times (SEAFLOOR §6) and the young members' surface (SEAFLOOR §5). The giant's land is its own pass.

## 9. The region as a plume's history (10 Nov 2026; agreed in principle, the stages proposed)

The members are not placed; a plume is run and they fall out of it. The inputs are §2's facts and a handful of knobs: the plate's speed and
heading (1–2 cm a year, the old end north-east), the plume's flux over time (the pulse), its footprint (~100 km), the plate's elastic thickness,
the sea-level curve (Earth's glacial cycles, §4) and the reef's growth rate.

1. **The head.** A plume arriving builds a plateau of thickened crust: the province's platform. The game already says so — the basin floor at
   −1100 stands 2.7 km over the plate at −3800 (PLANET, The basin). Earth: the Galápagos platform, the Mascarene Plateau.
2. **The tail.** Volcanoes on the plateau, each born where the plume's footprint meets an old weakness (a fracture zone, an earlier rift), its
   volume the flux of its time. The pulse makes clusters in time and the plate turns time into distance: **clusters along the track, each one
   scattered, not a line.** At 1.5 cm a year, 20 Myr is 300 km of track (the Canaries: 21 Myr, 500 km).
3. **Each member's rise and fall.** Thermal subsidence; **flexure** — every new volcano bends the plate into a moat round itself, sinking its
   neighbours (Maui and Lanai sink under the Big Island; ours drowns beside the giant, which gives its subsidence a cause), and an arch beyond
   that lifts older members (Makatea, an atoll raised 113 m on Tahiti's arch; PLANET's "moat and arch, 50–150 km out — nothing at this scale"
   is at this scale now); the sea level; erosion.
4. **The reef against relative sea level decides the state:** high island; rim and lagoon (ours); atoll; raised atoll (limestone cliffs and caves
   on an arch); **carbonate bank** — sinking slowly enough for the reef to keep up: a flat, lit, shallow sea tens of km across at −10 to −60, dry at
   every lowstand, so karst and blue holes across it (Saya de Malha, 40,000 km² on the Réunion hotspot's track; the Great Bahama Bank's blue
   holes); guyot (the reef outrun: a flat top from −100 to −1000); seamount (never surfaced). The Seychelles' granite is a continental sliver and
   has no place here; its bank's form does, by this route.
5. **The water.** The old tracks' ridges enclose basins on the plateau; under a basin's sill the water is the chemocline's (PLANET); outside, the
   flank's deep is oxic and cold. A member inside and one outside are different places below −450. The current enters through the gaps (the
   upwelling), islands shelter one another's coasts and shade one another's wakes, and a bank turns the tide into streams. These are where two
   members of one age stop being the same.

Out come records for `ISLANDS`, each with its age, volume and state, and each member's colonisation time (SEAFLOOR §6) with them. `ISLANDS[0]`
and `[1]` are pinned: the model is tuned until they fall out of it, never overwritten. The model is a recipe (the repository's rule 3): run at
load from its seed and knobs, not typed as records. Its page sits beside map.html — the knobs, the province, the game's world on it — and the
person picks the layout. ARCHIPELAGO's young shield and seamount stay if the model puts something there.

What the model asks of the code: `CHEMO` is one constant (world.js); a deep outside the basin wants the chemocline's depth by place, or an oxygen
field beside the nine.

Answered by the person (10 Nov 2026, the second round): **a second basin may have its own sill and so its own chemocline** — the −450 is our
basin's, not the planet's (Cariaco's sits near −250 behind a 146 m sill); **ours is not young** — "whatever age gives the greatest variety and
the most tools and creative options", the creatures' own ages being as vague (DIRECTION, Open 1, closed: an input to the model, chosen when it
is built); **the stages: "that looks awesome — go ahead and build it."**

### 9.1 As built (v11.94, 10 Nov 2026)

`src/region.js` (`regionModel`, `regionGrid`, `regionBasins`, `regionSeen`; the knobs `REGION_K`, the pins `REGION_PINS`), drawn by
`region.html`, checked by `test/region.js`. In `order.txt` but not called by the game: its records go into `ISLANDS` with §8 step 5. What the
stages became, and what running them taught:

- **Ages.** Ours 3 Ma (the person: not young, the most variety); the plate 1.06 cm/yr, so the giant 1.31 Ma; the history 30 Myr, the track
  ~320 km, turning 3°/Myr (a quarter circle). Ours at 3 Ma comes out a rim at sea level with a living reef and the giant 900 m with one — the
  records' states — with no hand-setting beyond their volumes (82 and 297 km³, tuned). Erosion (0.45/Myr) and the waves leave nothing high
  past ~4 Myr: every high island in the province is from the giant's pulse or the one waxing now.
- **The births** are a power law (N(>V) ∝ V^−0.75, the smallest 6 km³): most are seamounts that never surface; a pulse makes ~6 over
  30 km³ and ~2 over 100. A pulse is pinned at the giant's birth, another waxing now (ARCHIPELAGO's active young shield; `young`).
- **A slow plate's reefs never drown.** Subsidence here is ~0.05 mm/yr (the loads are small: the giant's moat is ~200 m), so a reef top sinks
  ~5 m between highstands and every deglaciation's sea simply comes back up to it; reef growth rate makes no difference. Left alone, every
  old member is an atoll or a bank — the Tuamotus — and the game's own sill (drowned shields at −150 to −410) could not exist. **What stops a
  reef here is PLANET's own rule:** the lime polyps win only in clear, bright water. The current enters across the province's upstream face
  (the game's: the gap in the sill), and a member with nothing upstream to shelter it within 90 km (`fedL`) sits in the open ocean's fed water,
  where the weed takes its shallows: no reef (`fedK` 0), so it is planed and sinks — the guyots. Seed 32: all 28 guyots are fed; 103 atolls and
  banks in the lee.
- **Flexure is small at these sizes** (α 15.7 km at Te 6 km): the arch is ~1.4% of the moat, metres. No raised atoll comes out of any seed;
  §9's Makatea needs a Tahiti-sized load. The awesome member's moat (735 m under a 2,600 km³ shield) is the largest effect.
- **Colonisation comes free:** each member's first light and the nearest lit member then. Seed 32: median 11 km from a neighbour, the
  longest 54 km, one from afar (the founders).
- **The basin: the model does not make ours.** Its ridges are saddles at −1000 to −1500; it encloses basins of its own but none round ours.
  (v11.96 refined which go anoxic: a sill between −100 and −1100, so the inflow is the oxygen minimum's water, 10 km² or more — seed 32's
  big dark is then the 320 km² basin west behind −957/−980; its 1,260 km² basin behind −1273 takes ventilated deep water and stays oxic.) With the game's own ground inside its square, the water beside ours reaches
  the open ocean over ~−1060. The game's chemocline at −450 wants a sill near −430 all round, which a hotspot province does not build. Open
  for the person (below).
- **Births inside the game's square are kept and flagged**: the game has only floor there. Seed 32 puts a 308 m, 3.1 Ma island 20 km north
  of ours (in the awesome shield's moat). A proposal for §8 step 5, to be judged by §7's test, not built.
- **The default, seed 32** — of 60 surveyed, the nearest to the person's picture of 25 Sep: an active shield of 2,533 m (1,337 km², 47 km
  north-west of ours: the awesome one), the giant 900 and another of 820 (the great), 308 and 243 (the fine), 50 and ours (the barely); 5
  over the horizon from ours (the giant and the 308 on an ordinary day, three on clear days); 47 guyots, drowned banks and seamounts; 2,005 km²
  of land. region.html surveys any 30 seeds under any knobs.

**The person's answers (10 Nov 2026, the third round):**
- **The basins: "let the model's basins decide how it naturally should play out."** The −450 chemocline round ours goes. Seed 32 at a 1.1 km
  grid: the water round ours is open to the floor (out over ~−1060 east, −969 south, −1225 across the sill's corner); the nearest silled
  basin is 28 km west, between ours, the giant and the awesome shield (317 km², sill −980, chemocline −1000, floor −1363); the next 63 km
  east (−1134) and 116 km east (1,264 km², −1295). About 1% of the sea floor in the province lies under a chemocline. What the −450 carries
  today — `CHEMO` in ten files (the milky plate, the seep line, the iron domes, the poison by feeding, the anoxic manganese plain, the
  abyssal's rim) and eight envelopes — moves to where the basins put the dark, or is re-derived for an oxic deep (DIRECTION's "what is at the
  bottom" with it). The darkness of depth is the light's and stays where it is. A basin's sill comes out of a coarse grid here; the build
  computes it at the game's grain.
- **The layout: seed 32** (§8 step 2, done).
- **The proposals inside the square: accepted** — "the world we have now is nice but we are going to need to make some big changes, so
  that's ok." Seed 32 puts eleven members there: the 308 m high island 20 km north of ours, five atolls (three awash, two just under), five
  seamounts; the hand-built sill (world.js `SILL`) is to become the model's own old track.
- Still open: whether the reef on the fed face is none (`fedK` 0) or a little.
- What the deep becomes under the basins, the pit struck and the constructors' structures: **DEEP.md** (designed 10 Nov 2026).

### 9.2 The square from the model (v11.102, 11 Nov 2026; the person: "go ahead, start rebuilding the square")

Every member whose ground reaches the world (the square and the far layer's 2 km past it) is a record in `ISLANDS`, made at load from the seed
and the knobs (region.js `rgBuild`; DESIGN, The region). Not only the square's eleven: a member outside whose flank reaches in is the square's
ground there, and leaving it out would have left a flat floor where the model has a mountain. Seed 32, what that is:

- **The north-west corner is the awesome shield's southern side** — its coast crosses the corner (land from (−25.8, −16) to (−12.5, −25.8) km),
  its flank down to its moat at −1730. The model's active shield of 2,533 m, 47 km off, built with the giant's kit (an "awkward brown
  mountain" for now, as the giant was: the person, 10 Nov 2026), a caldera, flows down two rift zones on the fracture grain (one pointing at
  the 308 m island), no shelf (its lava reaches the sea). Its own pass, like the giant's, is later.
- **The 308 m island 20 km north** (m138, 3.1 Ma, older than ours): land 5.4 km in radius on a 4 km shelf cut by the waves into it — the model
  drew its coast at 8.3 km and no shelf; the shelf is cut into the land, so the flank stays where the model's 12° cone puts it (to have
  added it outside put its foot 3 km from ours). Two younger seamounts the model put on its land (0.99 and 2.62 Ma) are not built: the model
  draws every cone from the plateau, and a birth on another member's flank there is a cone inside it.
- **Ten atolls and two banks**: ours scaled to each reef's ring, the rim at the reef's top today — awash with islets to +6 (m134 south-east,
  m140 south, m115, m124, m152 past the edges), or under (m141 −5 east, m131 −17 north-north-east, m139 −22 on the 308 m island's shelf edge, m133
  −21 and m148 −46 past the west edge) — and the lagoons deeper on a wider ring. The north-east corner is the edge of a carbonate bank 32 km
  across (m122), its flat 20 m under; another (m127) lies past the east edge.
- **Three seamounts and a guyot**: m146 (−371) and m147 (−348) east of ours, m143 (−607) on m141's flank; the guyot m136 (−370) past the north
  edge. Their upper 200 m bare and knobbed with pillow mounds 30 m high: the deep gardens and the relict's rock, which to v11.101 were the
  sill's summits.
- **The floor is the model's**: −1100 beside ours (the pin), −1730 in the awesome's moat, −820 at the south-west corner. **The sill is
  gone**, and its gap's jet with it; the current's upwelling is every member's own (each upstream flank), blended where two meet.
- **The basins decide the dark** (the person, 10 Nov 2026): one silled basin in the square now, 12 km² behind −1010 between m131, m141 and
  the bank's flank (its chemocline −1030, its floor −1170) — the first anoxic water the player can reach. Ours, the giant and the floor
  between are open.
- **The apron** covers 87% of the floor under −700 (every island's debris; the ooze the rest). The awesome shield's run-out is capped at
  the giant's 11 km: more land feeds a thicker apron, not a longer one (its turbidites pond in its own moat).

What the sill's own life became (census, 200 days, nothing loaded): every kind holds; the square's capacity is 3.7× v11.101's (765,000
against 205,000: the atolls, the banks and the high island's shelf are reef and shelf). **The relict** (SEAFLOOR §3: bare rock −280..−450,
"the sill's") keeps 14 km² of the 38 it had once walls count as rock (the drowned atolls' walls, the two seamounts' summits; the loaded
cells see slope), but on paper only the summits (the ledger sees no slope), so it starts the off-screen model at 3. **The darkrind** (the
reds' crust at the light's floor in the clearest water, FLORA) loses its home: 4 ha against 252 — every bare rock that high now lies in some
island's fed water. Open for the person: let the darkrind go, or let its clear water be somewhere the model has (a drowned summit up-current,
past the square: §10).

Not yet: the members past the square that show over the horizon (the 820 m m154 and the 243 m m155 are built because their feet reach in;
the rest wait for §10's per-member horizon meshes); the young members' fresh surface and the colonisation times (§8 step 6); the fed face's
reef (`fedK`, still open).

## 10. A world that size (10 Nov 2026; agreed — the person, 11 Nov 2026: "engine work for a bigger world is great", "get started" — being built, §10.1)

What is already unbounded: `sample()` is analytic, and JavaScript's numbers are doubles, so the sim, the physics, the ledger's values and the
saves are exact at any distance. The limits are what is kept per cell for the whole world, and what the GPU gets as float32.

- **The GPU.** Every mesh's vertices local to its own corner, the mesh placed at the corner: three composes the model-view matrix in doubles, so
  the large numbers cancel before float32. The pools and the far regions relative to a render origin that re-snaps as the player travels (a
  re-snap rewrites the pools' matrices: rare). The terrain is written in world coordinates today (chunks.js `buildTerrain`): 2 mm at the square's
  edge, about 1.6 cm of vertex jitter at 200 km.
- **The ledger.** Its tables are dense (50 entries × five Float32 and a Uint8 × 57,600 cells, about 60 MB) and cannot grow. Two tiers: fine cells
  near the player, the same model on coarse patches beyond — the off-screen model is already a model — a patch split into cells by capacity as
  the player comes and merged as they go. The point records (broods, carcasses, the line) as they are.
- **Cells.** No `NCELL`: a cell is an (i, j) in a hash. The square's edge, the clamp and the apron go; the region's own floor is the edge.
- **The whole-world things become windows:** the water and floor maps (1440², and the texture units are full) scroll round the player; the big
  structures, the impostors and the landmarks stream by region as the far terrain has since v11.58; `sample()` finds its islands through an index
  of the records' reaches instead of a loop over every one; the horizon tier keeps a mesh per member, built as it comes within the disc.
- **Order, each step invisible** — the world at any place the same to the bit, and a test that says so: the records' index; the local origins;
  the cell hash; the ledger's tiers; the windows. Then the world grows to what §9 gives.

Not proposed: separate windows per cluster with a fade between them. The crossing is part of the world.

### 10.1 As built

- **Step 1, the records' index (v11.103).** world.js `RIX`, `recsAt`: a grid of 2 km buckets, each with the records (in ISLANDS order) whose
  reach or apron's run-out touches it; `sample()`, `apronAt` and `coneK` read their bucket instead of every record. Seed 32: 22 records in
  68 × 60 buckets over 136 × 120 km, 1.2 a bucket on average; `sample()` 1.21 µs against 1.99 over that extent. The world is v11.102's to
  the bit (test/records.js, the index against the old loop at ~110,000 points; and against v11.102's own code at 150,000). What v11.102 taught
  the rest of the plan: `sample()`'s cost is the island records it must compute where they overlap, not the loop — each record's bound table
  (v11.102, region.js `rgBound`) is what keeps that down, and a world of the whole province is mostly open floor between clusters, so the
  per-sample cost should not grow with it; the horizon tier's one mesh does (1.1 s of build for 20 records), which is why its per-member
  meshes are in the windows' step.
