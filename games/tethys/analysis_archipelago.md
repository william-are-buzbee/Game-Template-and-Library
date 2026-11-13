# analysis_archipelago.md — how believable the province is (12 Nov 2026, v11.115)

Status: **a review; §6's build done in v11.121–123** (the members' shape and clock, the plateau's platform, the margins and lagoons); §8 (13 Nov
2026) reviews v11.122's platform against Earth's, nothing of it built. A believability pass over the region model's province as it stands at v11.115: its size, its scope and
its shape, each finding ranked **plausible**, **stretch** or **wrong**, with numbers, an Earth comparison and the knob or code that sets it;
then a ranked list of changes for the person to choose from (§5). Read GLOBE.md §9–10 first; this doc judges what they built.

How it was measured: `node test/region.js` (the province's table); `node test/map.js`, whole and zoomed (`SPAN=70000 CX=205000 CZ=0`,
`SPAN=70000 CX=105000 CZ=-10000`); scratch scripts over `regionModel()`'s members and over `sample()` — every member's numbers, radial
profiles of 27 records along 16 directions, the depth bands over the world on a 400 m grid, every pair of reef rings, the plateau's history
on a 2 km grid, the model under nine knob variants; and the real build in headless Chromium at five places (§7).

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
east is open sea over a flat weed floor (§7). Earth's atolls show at 15–20 km by their palms; land life is deferred, so this is correct.

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

**The person's to decide** (answered 12 Nov 2026, §6):
- The east: one carbonate platform (6 A), a seamount and guyot field (6 B), or circles as now with 2–4 patched in?
- Land and volume (5): shrink the land and rings to the volumes, or grow the volumes to the land?
- Erosion (7): a slow plate's long-lived high islands, or the Society-speed clock as now?
- The giant's barrier reef (1): now, or with the giant's own pass?

## 6. The person's answers (12 Nov 2026), and the build they set

- **The east: one carbonate platform** (6 A).
- **Land and volume: shrink the land** (5).
- **Erosion: "let's say 10, though I am not sure"** — high islands that last about 10 Myr (7). In numbers: `erode` 0.15/Myr. With the
  land shrunk, the big members then keep more than 150 m to ~9–10 Ma (the oldest high island 9.3 Ma, m109); the plateau's own sinking
  (1–1.6 km over 30 Myr) drowns them after that at any rate (0.10 gives 9.5 Ma), so ~10 Myr is about the most this plate allows. With
  0.15 the province has 7 high islands and 5 inside a living reef ring (the Bora Bora and Mayotte stage, none today but ours), banks fall
  from 36 to 7 and atolls rise from 67 to 87, land ~1,500 km²; the pins re-tune (ours' model volume 82 → 39 km³, the giant's 297 → 192).
  A knob: easy to move once seen.
- **The giant's barrier reef: with this work** (1).
- Not answered, so taken as recommended (§5): one margin per platform (2), lagoon depth by size (3), reef walls (4).

**The shape that holds the volume — answered (c), 12 Nov 2026: Earth's slopes, with the awesome shield pinned at 2,533 m.** Both ways of shrinking give nearly the same land; they differ in height:

| member | now | (a) summits kept, land at the 12° waterline | (b) Earth's slopes (7° land on 12° flanks), summits lower |
|---|---|---|---|
| the awesome shield m153 | 2,533 m, r 20.6 km | 2,533 m, r 11.9 km (446 km²) | ~1,530 m, r 12.4 km (486 km²) |
| m138 at its peak | 1,878 m, r 15.3 km | 1,878 m, r 8.8 km | ~1,160 m, r 9.5 km |
| m154 | 820 m, r 7.3 km | 820 m, r 4.2 km | ~540 m, r 4.4 km |
| the giant (pinned 900 m) | model r 11.6 km | r 6.7 km | r 7.1 km — its hand record's 7.0 already |

(a) is two lines, but its land stands at 12° on average, where Earth's subaerial shields run 4–8° (Lanai ~5°, Tahiti ~7°). (b) is the
believable shape, but needs the member's height worked out at its birth from how deep its base lay, and every summit not pinned
drops by ~40%. A third way: (b) with the awesome shield pinned at 2,533 m, as ours and the giant are — its volume grows to ~6,000 km³
and its moat with it, and the person's "one awesome" stays.

**The build, one version and one pull request each:**
1. **The members' shape and clock** — the land and rings volume-true (by the answer above), `erode` 0.15, and a high island's reef: a
   barrier reef and lagoon round the land (`rgRecord`'s high branch; `islandH`'s lagoon only where the ground lies under it, so ours is
   untouched), the rim state built with its land, the giant's record given its reef (the model's ring at −11 m). Everything in the
   ±70 km world near a member moves — m138, the atolls, the basins — so the tests that pin the province's numbers are re-pinned.
2. **The plateau's platform** — the members' reef rule run on the floor grid: where the plateau reached the light it keeps a carbonate
   top; its margin where it never did; its up-current edge drowned by the fed rule; the banks' fused flats replaced by it.
3. **Margins and lagoons** — one margin per platform (rims inside another's lagoon become faros or patch reefs), lagoon depth by size
   and time dry, reef walls, the slow plate's −120 bench — what step 2 does not already make.
4. Later, unasked: rims by the wind, blue holes, rejuvenated cones, the fed rule in time, `Te` and the swell.

## 7. What was looked at, and what was not

Seen: the province's map whole and two zooms (the east at x 205 km, the middle at x 105 km); in the build (headless Chromium, software
WebGL, by `tp()`): the surface over m6's lagoon (−40) and over m27's bank (−20), the 308 m island's summit, m6's outer slope at −70, the
open water past m109's southern edge. From the water the east is open sea over a flat weed floor to every horizon, the rims a line a
kilometre off: believable for a bank's interior, empty as a place. m6's outer slope at −70 to −120 is a smooth sediment hill with scattered
blocks — §3.5 seen: no reef front, no wall. The summit view is the known brown land.
Not seen: the person's GPU and frame rate (the software renderer drew ~0.5 frames a second), the far east in a long swim, sound.
Sources for the Earth numbers: GLOBE.md §3's own, Betzler et al. 2021 (Saya de Malha), the USGS and Enewetak margin surveys, Gischler et
al. 2014 and Purdy & Winterer 2001 (lagoon depth), and the standard figures for the islands named.

## 8. The plateau's platform against Earth's (13 Nov 2026, v11.125)

Status: **a review, nothing built.** v11.122's platform (`rgPlatform`, `rgPlat`) judged for its size and shape against Earth's isolated
carbonate platforms; the person's answers (§8.3) and what they set (§8.5). Measured with `node test/map.js` (whole, `SPAN=40000 CX=150000
CZ=-20000`, `SPAN=120000 CX=175000 CZ=-10000`), scratch scripts over `RG_PL` and `sample()`, `rgPlatform` re-run with its box widened 250 km
past the world's (the whole platform the model makes), and the build's `map.html`.

**8.1 The numbers.** Earth's from Betzler et al. 2021 (*Geology*) and 2023 (*Sedimentology*), Coopen et al. 2021, New et al. 2005, Sheppard
et al. 2012, Naseer & Hatcher 2004, IODP 359, Gischler et al. 2014, Grammer & Ginsburg 1992, Eberli & Ginsburg 1987, Harris & Purkis 2014–16,
read as search extracts (the papers' hosts were outside the session's network); the soft ones are marked.

| | area, km² | size, km | rim | interior | land |
|---|---|---|---|---|---|
| the platform, the model's whole | 37,540 | 205 × 176, a disc (4πA/P² 0.84) | at the sea all round: islets on 53% of the margin, awash 32%, under 3 m 15% | −26 … −57 (median −48) | ~40 km² in the world |
| the platform, in the world | 27,540 (29,259 with the 4 km past the edge) | a quarter-disc, cut by the box on the south and east | | | |
| Saya de Malha | 40,808 (the South Bank ~35,000) | South Bank 230 × 290 | a horseshoe on the north and east, open to the south, never at the sea (≥8 m); the west flat 50–55 m, the east 30–35 | 70–150 m, depressions to 455 and 980 (Russian surveys) | 0 |
| Great Chagos Bank | 12,642 (or ~13,500) | ~150 × 100 | mostly 5.5–15 m down; islands on the west and north rim, <5% of it | mean 75, max ~90 | 4.5 |
| Maldives | 21,373 of atolls and lagoons | 900 × 100–125, a double chain round the Inner Sea | cut by many channels | 35–90 (Huvadhu 80–90) | 298 |
| Great Bahama Bank | ~100,000 | irregular, cut by the Tongue of the Ocean (30 × 240) and Exuma Sound | islands ~8% of the platform, mostly windward, to 63 m (Cat Island's dunes) | 60% under 5 m | ~8% |

**8.2 Findings, ranked.**
- **Size — plausible.** Saya de Malha's area; 102 km from its middle to the nearest margin (Saya de Malha's South Bank is 230 km across).
  Thickness 1.0–1.5 km in 30 Myr (0.03–0.05 mm/yr; the Maldives ~3 km since the Eocene); the plateau round it at −1,300 to −1,450; atolls in
  kilometre-deep water off its margin, as Chagos's are. But the size is a knob's: see the next.
- **A circle — wrong, at the map's scale.** The platform is the head plateau's flat top: `platW` is 1 inside 0.6 × `headR` (96 km) and falls to
  the plate by `headR`, so the head stood level at +270–390 m at 30 Ma and the margin lies where that disc's edge fell through the reef's reach
  — within a few km of the 96 km circle — plus a lobe north-west along the track (the swell's, founded 22–25 Ma). On 90% of it the reef took
  hold at the history's first step (30.0 Ma), so the margin is the head's day-one edge, kept 30 Myr. Earth's platforms follow their basement's
  grain, come in segments and move their margins (the Great Bahama Bank's leeward one has built out 25 km since the late middle Miocene). From
  the water a 96 km radius reads straight; on the map (`n`, `map.html`) it is a round head.
- **No breaks — wrong.** No enclosed basin, no channel. All four of Earth's have them: the Tongue of the Ocean (1,100–2,000 m) and Exuma Sound
  (2,042); the Inner Sea (to ~550 m, drowned since the late middle Miocene); Saya de Malha's depressions and its 1,100 m channel to Nazareth
  (8–10 km wide, a ~400 m sill); Chagos's banks in 1–2 km of water.
- **The world's box cuts it — stretch, accepted (§8.3).** 73% of the model's platform is in the world; its south and east sides are the box
  (165 and 123 km of straight edge on its grid) and the whole windward margin (the wind from the east-south-east, `WIND_A`) lies outside.
  The only margins in reach are the west (leeward, down-current) and the north (where the current comes on, `CUR_A`).
- **One margin all round — stretch.** The rim's height, islets and passes by noise; the wall the same on every side. Earth's differ by side:
  Saya de Malha's rim stands on its north and east only, steep on the windward east and gentler to the west; the Bahamas' islands are windward
  and their leeward margins prograde. The margin a player can reach is the leeward one, which should be the drowned, sandier, gentler one.
- **Alive everywhere — stretch.** The reef's top is 0 at every node. Earth's platforms of this size are partly drowned — Saya de Malha by the
  current and the sea level (Betzler et al. 2021), the Maldives' Inner Sea — and their rims are mostly under the sea. v11.122 left the fed rule
  off the platform (`fedK` open since 10 Nov).
- **The wall — plausible steepness, not the atolls'.** One plane at `RG_PL_K.wall` (42°) steepened by the margin's warps: the steepest 100 m of
  each profile a median 66°, crest to toe 39°, the toe at −1,050 about 1.3 km out. Earth's: near-vertical to 100–150 m, then 30–50° (the Tongue
  of the Ocean 35–45°; Chub Cay vertical to 140 m, then ~50°; the Maldives' outer slopes 20–30° to ~2,000 m). The atolls beside it have had
  Enewetak's profile since v11.123 (the −122 bench, the talus easing to 17°); the platform has not.
- **The lagoon — stretch, shallow.** Median −48 (p10 −57, p90 −26), patch reefs above −15 on 7.4%, blue holes 0.17%. `RG_PL_K.lag` 50, where
  v11.123's own law (`rgLagD`) gives 60 for any ring past ~21 km: the province's widest lagoon is shallower than its widest atolls'. Chagos 75–90,
  Huvadhu 80–90, Saya de Malha 70–150.

**8.3 The person's answers (13 Nov 2026).**
- **The east: a chain of banks** (not one platform with channels and basins).
- **The rim: Earth's pattern for this size.**
- **The box: OK for now** — "eventually we expand".
- **The way to a chain (§8.4): (a), drowned saddles.**

**8.4 What a chain can be on this plate (a prototype, scratch only).** The plateau given relief before the reef sees it, `rgPlatform` re-run
(its box widened, the members and the floor as built):

| relief | the platform |
|---|---|
| none (as built) | 37,540 km², one disc |
| noise ±800 m at 60–110 km, along the fracture grain, about the head's level | 33,400 km², one bank (relief about the level percolates) |
| the same, the head lowered 150 / 250 / 330 / 450 m | 22,600 (one bank and two small) / 16,200 (one, elongate, embayed) / 10,800 (one) / 4,400 km² (two) — a sharp threshold |
| the plume's flux along the whole track band | stripes across the track, 5,700 km² — wrong in kind |
| a centre at each pulse on the track (29.3, 25.0, 22.3, 19.9 Ma), 45–55 km, on a head lowered 600–700 m | 10,400–16,100 km², **one ridge-bank along the track**, ~165 × 147 km, wholly in the world |
| the same, centres 24–30 km, from 15 Ma | 5,600–8,400 km², one ribbon ~150 km long |

The reason is the plate: at 1.06 cm/yr the pulses near the old end built their centres 22–46 km apart along the track (Earth's Mascarene banks
lie along ~2,000 km of track built since ~64 Ma), so any centre big enough to carry a bank overlaps its neighbours, and a reef keeps up on
whatever stood within its reach. Volcanism alone makes **one ridge-bank along the track**, its windward margin in the world; separate banks of
Saya de Malha's scale need something more:
- **(a) drowned saddles:** the ridge-bank cut where its centres meet, by the current — the saddles are its lows, where the flow across a bank
  runs fastest (Saya de Malha's and the Maldives' drowning, Betzler et al.); a chain of banks over mesophotic saddles 50–200 m deep;
- **(b) one ridge-bank, the chain the atolls west of it** (Great Chagos and the Chagos atolls round it);
- **(c) smaller centres** (12–15 km): banks of a few hundred km², which is what the members' atolls already are;
- **(d) a faster plate** (`v`): every member's age and place, the pins re-tuned — a province of its own.

**Answered (13 Nov 2026): (a), drowned saddles** (recommended: Earth's own way of breaking platforms this size, and answer 2's partial
drowning too). The person: "I am happy to test new world generation however it comes out, but the goal is clear".

**8.5 The build these set** (after §8.4's answer; one version and one pull request each). Step 1 **built v11.126** (13 Nov 2026): the head as four
centres scattered over the plume's footprint and the pulses' three, on a head 350 m lower; the necks (where a point lies between two centres) swept
by the currents and the tides, their reef at 3% of the rate and dissolving while exposed, so they gave up under the Pleistocene's swings — 8,298 km²
of banks (four over 300 km²) on 12,087 km² of drowned carbonate, most at −72 m, two early necks at −430 and ~−1,000 (CHANGELOG v11.126). Not as
planned: the head's centres overlap, so "between two centres" is its whole middle, not only narrow necks — it drowned too, as Saya de Malha's
interior did, and the banks stand round it. Step 2 **built v11.127** (13 Nov 2026): the margins by their side — windward at the sea with the islets
and the atolls' wall, lee under the sea by the bank upwind (−12 m behind 15 km, −25 behind 40+) with a slope of shed sand — and each bank's lagoon by
rgLagD of its area (41–57 m). Not done: the 70–150 m drowning-bank lagoon (the banks here are living ones, an atoll's by their size).
1. **The head's relief** — `platW`'s flat disc replaced by a lowered head with volcanic centres at the plume's pulses along the track
   (`regionModel`; the floor beside ours re-solved, the pins re-tuned); the platform the ridge-bank that comes of it; the members it buries
   with it. By §8.4's choice, the drowned saddles with it.
2. **The margin by its side and its size** — the windward margin's rim near the sea with islets where wide, the leeward and the up-current
   margins under the sea (20–55 m), the share of rim at the sea falling with the bank's size (Maldives' atolls → Chagos <5% → Saya de Malha 0);
   the wall the atolls' (Enewetak's) on the windward side, a prograding gentler slope leeward; the lagoon by `rgLagD` or deeper (70–150) with a
   few deep depressions.
3. Later: the box, when the world expands (the person: "eventually").

**8.6 What was looked at, and what was not.** Seen: the maps above, the model's whole platform against the world's box, `dist/map.html` (the
same square-cut quarter-disc). Not seen: the platform in play — headless Chromium (software WebGL, three r128 from npm since cdnjs was blocked)
ran out of memory on the first frame drawn after a game started, at ours too, so the session's renderer and not the platform; the real bundle
in Node loads the platform's cells in 0.3 s at ~100 MB. v11.122's unseen list stands: `tp(230000,20000,-1)`, `tp(146500,-14000,-1)`,
`tp(144000,-14000,-150)`.
