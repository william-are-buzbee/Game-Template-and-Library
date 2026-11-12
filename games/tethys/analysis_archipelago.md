# analysis_archipelago.md — how believable the province is (12 Nov 2026, v11.115)

Status: **a review, nothing built.** A believability pass over the region model's province as it stands at v11.115: its size, its scope and
its shape, each finding ranked **plausible**, **stretch** or **wrong**, with numbers, an Earth comparison and the knob or code that sets it;
then a ranked list of changes for the person to choose from (§5). Read GLOBE.md §9–10 first; this doc judges what they built.

How it was measured: `node test/region.js` (the province's table); `node test/map.js`, whole and zoomed (`SPAN=70000 CX=205000 CZ=0`,
`SPAN=70000 CX=105000 CZ=-10000`); scratch scripts over `regionModel()`'s members and over `sample()` — every member's numbers, radial
profiles of 27 records along 16 directions, the depth bands over the world on a 400 m grid, every pair of reef rings, the plateau's history
on a 2 km grid, the model under nine knob variants; and the real build in headless Chromium at five places (§6).

## 0. The province in numbers

The world is 382 × 227 km (86,800 km²). 159 members were born over 30 Myr; 122 are records (the two pins and 120 members), 37 are struck.

| state | n | age, Ma | volume, km³ (median) | today | ring radius, km |
|---|---|---|---|---|---|
| active shield | 1 | 0.65 | 2,558 | +2,533 m, 1,337 km² of land | — |
| high island | 4 | 0.39–3.14 | 28–528 (188) | +243 … +900 m | (computed 2.6–15.7, not built: §2.5) |
| rim and lagoon | 1 (ours) | 3.0 | 82 | +4 | 5.9 (model) |
| low island | 1 | 1.03 | 17 | +50 | — |
| atoll | 67 | 0.97–30 | 2–51 (9) | reef top 0 … −46 | 0.8–5.9 (3.1) |
| carbonate bank | 36 | 5.3–29.7 | 7–3,000 (37) | reef top 0, flat at −20 | 6.2–25.2 (7.6) |
| guyot | 28 | 3.3–29.5 | 1–71 (10) | −370 … −1,415 (−1,066) | — |
| seamount | 18 | 1.0–14.7 | 1–30 (4) | −330 … −1,434 | — |
| drowned bank, young | 1, 2 | 0.04–0.19 | 9–13 | −118 (reef), −451 … −626 | — |

From `sample()` at 400 m: land 1,990 km²; water 0 to −60 m **12,480 km²** (10,073 of it east of x = 70 km); −60 to −150 only 657.
Median distance to the nearest member 7 km. 132 of 159 members (83%) stood above the sea at some time.

**In three lines.** The west (ours, the giant, the awesome shield, the 820 m and 308 m islands) is a believable young cluster: heights, ages,
shelves and flanks all have Earth twins. The east is the problem: a carpet of circles — 100 reef caps, 57 pairs of rims crossing, banks
flat at −20 — that is wrong in shape, and that comes from three causes in region.js: a land disc wider than the volcano under it (§1.2),
reefs on every cone but none on the plateau they stand on (§2.3), and rims that do not know about each other (§3.1).

## 1. Size

**1.1 High islands' heights and land — plausible.** The giant 900 m at 1.31 Ma (Lanai: 1,026 m at 1.3 Ma); m154 820 m at 0.53 Ma;
m155 243 m at 0.39 Ma (Kahoolawe: 450 m at 1 Ma); the awesome shield 2,533 m and 1,337 km² at 0.65 Ma (Tahiti 2,241 m, 1,045 km²;
La Palma 2,426 m, 708 km²; Tenerife 3,715 m, 2,034 km²). m153 is wide for its height, which is §1.2.

**1.2 The land disc is wider than the volcano that holds the volume — wrong.** The model sizes each member as a 12° cone holding its V
(`rgShape`), then draws its land as a 7° cone from the summit (`m.shore = rtop + s/RG_SA`, region.js 136) and sets the reef ring at that
shore when the reef takes hold (`m.ring`, line 120). A 7° subaerial cone on top of the 12° pedestal under it holds 2–2.6 × V:

| member | V | land disc + the pedestal under it | 12° waterline at its peak | ring |
|---|---|---|---|---|
| m153 (shield) | 2,558 km³ | 5,988 km³ | 11.9 km | (shore 20.6 km) |
| m138 | 528 | 1,391 | 8.8 | 15.7 |
| m109 (bank) | 3,000 | 7,584 | 14.5 | 25.2 |
| m122 (bank) | 522 | 1,405 | 9.2 | 16.0 |

So **56 of 95 reef rings lie outside their own volcano's foot** (m109's ring 25.2 km round a cone whose foot is 23.8 km), 78 outside
three quarters of it. Earth's slopes are right — 4–8° subaerial over 10–20° submarine (PLANET) — but then the volume must hold the
shape. Either the land and rings shrink to the waterline of the shape that holds V (radius × ~0.58, area × ~0.33), or V grows to hold
the land (× 2–2.6, the moats with it). The inflation is why so many rings pass 6 km and become "banks" (§1.4).

**1.3 The rings' sizes — plausible, for the wrong reason.** 1.6–50 km across, median ~8 km for atolls and banks together. Earth's run
from ~2 km to Rangiroa's 80 × 32 km and Kwajalein's 2,174 km² lagoon; the Great Chagos Bank is 12,642 km². With §1.2 fixed by shrinking,
the rings fall to a median ~5 km across, under Earth's usual: Earth's atolls stand on 10³–10⁴ km³ edifices, the model's on 2–51 km³ (median 9).

**1.4 Lagoon depth runs backwards — wrong.** `rgRecord` (line 241) and `regionGrid` (line 154): a ring up to 6 km gets a lagoon 18 m deep plus
6 m a km of ring (23–40 m, capped at 40); a wider one is a "bank", flat at −20. So the biggest structures have the shallowest lagoons. On Earth the
depth grows with the atoll: a lagoon is mostly limestone dissolved by rain while the lowstands left it dry, so a bigger catchment digs
deeper (Purdy & Winterer 2001; Gischler et al. 2014 in the Maldives: depth with area and with rainfall); the large lagoons run 40–80 m. Saya
de Malha's rim is itself submerged, 8 m at its shallowest and ~40 m on average, its lagoons 40–100 and 100–200 m (Betzler et al. 2021). A
50 km ring with its rim at the sea and a 20 m flat inside is neither an atoll nor a bank of Earth's.

**1.5 The reef top at mean sea level under 6–9 m tides — stretch.** Rims stand at the reef's top, 0, with islets to +6 (`rimH = rt`).
A reef flat grows up to about low water and no higher (above it, it dries and dies), so here it would top out ~4 m under mean sea and
stand 3–4 m out at low springs. Montgomery Reef (the Kimberley, a 10–11 m range) does exactly that: up to 4 m out at low tide, ~300 km²
exposed, the sea pouring off its edge in waterfalls. The game's rims instead stand up to 10 m out at low springs. Ours is basalt and exempt.

**1.6 Guyots and seamounts — plausible.** Guyot flats at −370 to −1,415 (median −1,066) after 3–30 Myr; a member's total sinking here is
at most ~1.6 km (the plate's cooling ~1 km, the swell's 600 m), so the order is right (Earth's Cretaceous guyots are 1–2 km down after
50–100 Myr on faster, older plates). Their flats are small (≤ 3.3 km radius) because their volcanoes are (1–71 km³). Seamounts' summits
−330 to −1,434, flanks 20–25° easing to 12°: Earth's 10–20° with steeper young tops.

**1.7 Shelves — plausible, narrow.** From the shore to −60: m154 (0.5 Ma) 75 m, the giant 350, m138 (3.1 Ma) 525; to −150: 0.4–1.7 km.
Older shelves wider, as on Earth; Hawaii's are a little wider (1–3 km to −100).

**1.8 The plate's stiffness and the swell — stretch, small.** `Te` 6 km is a ridge's or a plume-heated plate's (Iceland, Galápagos); loads
on a plate 15–35 Myr old when loaded give 10–20 km on Earth (the depth of the 300–600 °C isotherm). `swellW` 110 km is a quarter of an
Earth swell's (Hawaii's ~1,000 km across, 1–1.5 km high), so members fall off it in ~10 Myr. Both move the subsidence by hundreds of metres,
not the picture: `Te` 15 gives 127 surfaced, a 32 km ring, 2,645 km² of land; `swellW` 400 changes almost nothing.

## 2. Scope

**2.1 Members and spacing — plausible.** 159 births in 30 Myr over a 40 km footprint, 7 km apart: a seamount province's density
(the Galápagos platform, the Canaries' seamount province).

**2.2 What surfaced — stretch, and robust.** 83% of members once stood above the sea. On Earth most seamounts never surface (the Canaries:
seven islands and over a hundred seamounts and guyots, GLOBE §3; its own "six above, a dozen below"). The model's reason: the old east
was born on a young, shallow plate (15–25 Myr old then), on the swell, at −120 m at 20 Ma and +270 m at 30 Ma, so every cone there surfaced. That is a Kerguelen-type plateau
and real enough. It barely moves with the knobs, because the plateau's level is solved for the −1100 beside ours: surfaced 105–144 of
159 under `plateAge` 80–200, `swell` 200–300, `vol` 12, `Te` 15, `erode` 0.15–0.25 (and 40 of 41 with fewer, bigger births: `vol` 20,
`rate` 3).

**2.3 The plateau never gets a reef — wrong, and the biggest.** Over a 2 km grid, ~21,800 km² of the plateau east of x ≈ 150 km stood
within 25 m of the sea between 24 and 30 Ma (18,600 km² above it), sinking ~0.05–0.1 mm/yr after. By the model's own rule (a reef that
takes hold keeps up at this subsidence; only fed water stops it, which would take its up-current edge as it takes the guyots) the rest is
a carbonate platform today — Saya de Malha, 40,808 km² on the Réunion track, the largest of the Mascarene Plateau's banks (the world's second largest isolated carbonate platform).
The model reefs the cones only (`run` steps members, not the floor), so between them the plateau lies bare at −1,100 to −1,550. Two
coherent answers: **(A)** give the plateau's floor grid the members' reef history: the east becomes one platform with margins, atolls on
its edges and inner basins where the moats sank it (the Maldives on the Chagos–Laccadive ridge, Saya de Malha); §3.1 and §1.4 then follow
from it. **(B)** deepen the head so it never reached the light; the −1100 pin fights this (2.2), and the east becomes a seamount and guyot
field with fewer, larger atolls. The person's call.

**2.4 The states by age — stretch.** Shield 0.65 Ma; high 0.4–1.3 (m138 at 3.1); ours a rim at 3.0; atolls from 1 Ma (on shoals) and
everywhere past 3; banks past 5.3; guyots 3.3–29.5. That is a fast plate's clock — Bora Bora 727 m at ~3.4 Ma, atolls past ~4.5 Ma in the
Societies — run on a Canary-speed plate. On Earth the fast plates' islands sink out of sight; the slow plates' stay high: Mauritius 828 m
at ~8 Ma; Mayotte 660 m with a 1,100–1,500 km² double-barrier lagoon (volcanic phases 15–0.5 Ma); Gran Canaria 1,956 m at 14.5 Ma;
Fuerteventura 807 m at ~20 Ma. The model gets atolls in Society time by eroding at `erode` 0.45/Myr (0.45 mm/yr at 1,000 m, a tenth of a
summit left after 5 Myr; Kauai keeps 1,598 m and pieces of its shield's surface at 5 Ma). At `erode` 0.15: high islands 7, rims 5, banks
27, land 3,046 km², ours' tuned V 82 → 39 km³.

**2.5 Barrier reefs computed, not built — wrong (and cheap).** The model gives four high islands a living reef ring well off their coast:
the giant's at 12.0 km (top −11 m) round a model coast of 9.4 (its record's land is 7.0); m138's at 15.7 km (−46) round 8.3 (record 5.4);
m154's at 7.4 (−45) round 6.9; m155's at 2.6 (−19) round 2.1. `rgRecord`'s high branch builds land and a shelf and no rim, and `regionGrid`
draws no ring for a high island. That drops the stage between high island and atoll — Bora Bora, Mayotte, Chuuk, Aitutaki — the one
that tells the story of the sequence. (m138's ring at 15.7 km lies past its record's flank: §1.2 again; the waterline's ring is ~9 km.)

**2.6 The guyots by the fed rule — stretch.** All 28 guyots are "fed": no high member upstream within 90 km (`fedL`), so the weed took
their shallows (`fedK` 0). Drowning by nutrients is real (Hallock & Schlager 1986; Saya de Malha is a platform drowning now). Its geometry is
not: islands enrich their own and their downstream water (the island mass effect: Doty & Oguri 1956, Gove et al. 2016), and PLANET says
productivity here is the flanks' upwelling, so a lee is the less clear water, not the more. And `high` is today's geometry: a shelter born
10 Myr later still counts. The model already drowns reefs the Earth way too — m149 −42, m148 −46 in a young load's moat; m156 at −118, a
lowstand reef outrun by a deglaciation (Hawaii's −150 m reef). `fedK` has been open with the person since 10 Nov.

**2.7 Struck members — stretch.** 37: 15 of 18 seamounts, 17 of 28 guyots, 3 banks, an atoll, a young cone. The model draws every cone
from the plateau, so a birth on an older member's flank is a cone inside a cone and `rgBuild` deletes it (line 260). On Earth it erupts onto
the flank: a satellite cone, or on an old island the rejuvenated stage (Diamond Head and Punchbowl on 2.6–3.7 Ma Oahu; Mauritius's younger
series; ours' own seeps and tuff cone). m151 (0.99 Ma, 11 km³) on m138 would be a young cone on a 3 Ma island.

**2.8 Land — plausible, low.** 1,990 km²: the Society Islands' (~1,600), under GLOBE §3's own 5,000–20,000. It moves with §1.2 and §2.4.

**2.9 What shows from the sea — plausible.** East of ours the rims stand +2 to +6, seen from the water to ~10 km; with no land plants the
east is open sea over a flat weed floor (§6). Earth's atolls show at 15–20 km by their palms; land life is deferred, so this is correct.

## 3. Shape

**3.1 Rims through each other's lagoons — wrong, the most visible.** Of 100 reef records, 57 pairs of rims cross, 23 nest, and 3 are
concentric: m32, m34, m36 within 200 m of one centre, rims at 2.7, 4.2 and 4.9 km (map at x 206.5, z −0.8). In m109's 25 km lagoon the
rims of m87, m73, m90 and m62 run as sea-level arcs across a −20 flat; 66 of 100 reef records touch another. A reef grows where the
platform meets open water: coalesced platforms have one margin round their union (Kwajalein's and Huvadhu's irregular rims), and what
stands inside is patch reefs and faros (the Maldives), never whole rings at the sea crossing each other. The cause: `sample()` takes the
smooth max of every record (world.js 463), each `islandH` rim unaware of the others; `rgBuild` strikes only by the centre.

**3.2 Banks fused at −20 — plausible.** Since v11.114 two banks meet at no higher than `FILL_TOP`, so neighbours fuse into one flat:
27 km of −20 from m27 into m31. That is the Bahamas' and Saya de Malha's look and agrees with §2.3 (A); only the arcs inside are wrong.

**3.3 Circles — stretch.** Each ring is a circle warped ±16%. Earth's atolls are polygons and crescents (Rangiroa 80 × 32 km), long
along their volcanoes' line; their windward rims are broad reef flats with islets, their leeward rims submerged and cut by passes.
Here islets and passes fall by angular noise (`rimA`), not by the wind (`expoW`) or the fracture grain (`K.fracA`).

**3.4 Lagoon floors flat — stretch.** ±1.5 m of noise at −20 or −40 (a 12 km transect across m6: −40 ± 1 wall to wall). Earth's lagoons
are studded with patch reefs and pinnacles, and the lowstands' karst leaves sinkholes and blue holes (the Great Blue Hole, 124 m deep and
318 m across; Dean's, 202 m). GLOBE §4 and SEAFLOOR §4 already call blue holes "the cheapest surprises for a swimmer".

**3.5 Reef margins as gentle as a volcano — wrong.** Atolls' and banks' outer slopes average 12–16° from −100 to −800 (steepest 100 m runs
30–40°, at the terraces and the `CARB` spurs): `rgRecord`'s reef flank is ours' basalt profile, 0.30 (16.7°) easing to 0.22 (12.4°).
A carbonate margin is the steepest thing in the sea: Enewetak's north-west margin is under 10° across the reef plate, then a slope from
−16 to −275 m steepening to ~55° and easing to 35°, then debris under 35°; the Bahamas' walls are vertical. The drop-off is a reef's
best-known shape, and the province has none.

**3.6 Eight equal terraces on every record — stretch.** −60 to −156 in eight 12 m steps (`R.terr`): ours' staircase, a sinking island's.
At ~0.05 mm/yr a 100 kyr cycle moves a member ~5 m, so the last Myr's ten lowstands cut one shoreline over and over: a slow plate's
reefs should carry one strong break near −120 to −130 and weaker ones at the older cycles' −30 and −70 (GLOBE §4 says as much).

**3.7 High islands, seamounts, guyots — plausible.** High islands' submarine flanks average 8.5–12° (−100 to −800), steeper near the
shore; seamounts 20–25° easing to 12°, their tops knobbed; guyots planed flat. Earth's 10–20°.

**3.8 The floor — plausible in kind, stretch in scale.** Moats where they should be (−735 m under the awesome shield; m109's ring of
deep water to −1,560 against the plateau's −1,321), arches 1.4% of their moats (metres), eleven silled basins, none anoxic.
The scale is §1.8's.

## 4. Ours against the model (a note, not a proposal)

The model's ours is a 82 km³ volcano planed to a 2 km-wide top with a living reef ring 5.9 km out (an atoll 12 km across, its top −12);
the record ours is a basalt rim at r ≈ 245 m round a 500 m lagoon, its shelf to 700 m. They differ ~20× in the reef's radius. Ours is
pinned and bit-identical by rule, so nothing here proposes changing it; but every comparison between ours and the model's atolls carries
it, and the person may want to know.

## 5. Changes, ranked (value for cost)

| # | change | where | cost | what it moves |
|---|---|---|---|---|
| 1 | Build the barrier reefs the model already computes: a rim at `m.ring` and a lagoon round the high islands | `rgRecord` high branch; `regionGrid`'s ring test | small | m138, m154, m155 gain Mayotte-like lagoons; the giant only if the person opens its record (its own pass) |
| 2 | One margin per platform: a rim inside another reef record's lagoon sinks to the lagoon (or survives as a faro if small); concentric members merge | world.js `sample`/`islandH` rim, or `rgBuild` | moderate | the east's look; 57 crossings and 23 nestings go; ours untouched (no reef overlaps it) |
| 3 | Lagoon depth by size (or by time dry at lowstands × rain); banks' rims under the sea, as Saya de Malha's | `rgRecord` `lagH`, `rimH`; `regionGrid` `lag` | small | every lagoon's depth and its weed and grazers; banks become real banks |
| 4 | Reef margins as walls: steep to ~−300, 35° talus below | `rgRecord` reef `prof`, `flank` | small | the drop-off everywhere east; `CARB`'s spurs and the deep gardens' ground; the bound tables |
| 5 | Land and volume consistent: shore and ring from the shape that holds V — or V grown to hold the land | region.js 120, 136 (`RG_SA`) | small code, wide ripple | every ring and state; the banks' count; m153–m155 and m138's land; the pins re-tune; the ±70 km world no longer v11.114's to the bit |
| 6 | The plateau's own reef (§2.3 A), or a deeper head (B) | `regionModel` (a reef history on the floor grid), `rgFloor`, `sample` | large | the whole east: one platform, its margins and inner basins; best done before or with 2–5 |
| 7 | Slower erosion toward slow-plate Earth (`erode` ~0.15) | `REGION_K` | one knob, wide ripple | more high islands with barrier reefs, ~3,000 km² of land, fewer banks; the pins re-tune |
| 8 | Rejuvenated cones instead of strikes: a birth's base is the ground already there | `regionModel` births, `rgBuild` | moderate | up to 37 more members, young cones on old islands, more seamounts |
| 9 | Rims by the wind (islets and broad flats windward, passes leeward) and long along the grain; patch reefs and blue holes in lagoons | `islandH` (`rimA` by `expoW`), a lagoon term | small–moderate | the atolls' variety; SEAFLOOR §4's blue holes |
| 10 | Slow-plate terraces (one −120 bench) and the reef top at low water (Montgomery Reef's low tide) | `rgRecord` `terr`, `rimH` | small | every reef's upper slope; a low-tide spectacle |
| 11 | The fed rule in time, or replaced by the moats' and the deglaciations' drowning | `regionModel` `fed` | moderate | which members are guyots (open with the person since 10 Nov) |
| 12 | `Te` and `swellW` toward Earth's | `REGION_K` | one knob each | moats and subsidence by hundreds of metres; little in the picture |

**My recommendation:** 1 and 2 first (cheap, and they fix the stage that is missing and the shape that is most wrong), 3 and 4 with them
(numbers), then decide 5–7 together, since each re-runs the province: 6 (A) is the biggest gain in believability and makes 2 and 3 fall
out of the model instead of being patched onto the records.

**The person's to decide:**
- The east: one carbonate platform (6 A), a seamount and guyot field (6 B), or circles as now with 2–4 patched in?
- Land and volume (5): shrink the land and rings to the volumes, or grow the volumes to the land?
- Erosion (7): a slow plate's long-lived high islands, or the Society-speed clock as now?
- The giant's barrier reef (1): now, or with the giant's own pass?

## 6. What was looked at, and what was not

Seen: the province's map whole and two zooms (the east at x 205 km, the middle at x 105 km); in the build (headless Chromium, software
WebGL, by `tp()`): the surface over m6's lagoon (−40) and over m27's bank (−20), the 308 m island's summit, m6's outer slope at −70, the
open water past m109's southern edge. From the water the east is open sea over a flat weed floor to every horizon, the rims a line a
kilometre off: believable for a bank's interior, empty as a place. m6's outer slope at −70 to −120 is a smooth sediment hill with scattered
blocks — §3.5 seen: no reef front, no wall. The summit view is the known brown land.
Not seen: the person's GPU and frame rate (the software renderer drew ~0.5 frames a second), the far east in a long swim, sound.
Sources for the Earth numbers: GLOBE.md §3's own, Betzler et al. 2021 (Saya de Malha), the USGS and Enewetak margin surveys, Gischler et
al. 2014 and Purdy & Winterer 2001 (lagoon depth), and the standard figures for the islands named.
