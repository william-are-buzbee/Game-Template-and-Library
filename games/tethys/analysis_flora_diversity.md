# Flora diversity: enough species, arranged badly (12 Nov 2026)

An analysis of the world as of v11.115, made by a review agent at the person's request. Its §5 changes were proposals; the person's
decisions are at the end of §5. The question (the person, 12 Nov 2026):

> "Is this an acceptable amount of plant diversity for an archipelago, or are we seeing a repeating species over and over simply
> because? It's very possible that a single region this small would look similar. It also may just be how we designed it."

## The answer

**The roster is plausible. The way it is laid out is not.** There are about 47 sessile species in eight lines, and 36–42 of them can
stand on any island with a reef at the surface or land. That is about as many forms as a diver can tell apart on a remote Pacific
reef. A remote province 30 Myr old should be poor and repetitive. Hawaii has about 60 stony corals; the Coral Triangle has 605. The
repetition the person sees comes from three things in the code, not from the planet:

1. **One density.** strap is tried 2,400 times a cell, 22 times the median species. It covers every sandy floor from −3 to −42 m.
   It is 69% of all the plants in the province's shallows and about 91% of what the eye sees on any lagoon floor, at ours and 217 km
   east alike.
2. **No history.** No envelope reads anything an island's age, size or isolation sets, and 99 of the 122 islands come from one reef
   template. Atolls 1 Ma and 30 Ma old carry the same flora in the same proportions.
3. **Variants that don't read.** Below −30 m every stipe, wisp and bladder is the same variant, and every stipe is cut to the surface.
   The forest is a fence of one plant.

On Earth one runner green can carpet a lagoon. But a lagoon floor there is meadows among bare sand and patch reefs, and its meadows
are several species. Here it is one species, everywhere, with no reef in it, although TAXA designed "dome patch-reefs" there.

## How it was measured

- **The envelope survey.** Every sessile `FLORA` entry's chance of standing at a point, by `placeFloraType`'s own rule: `per` ×
  `envW` × the `field` patches, the slope cap, the `reach` and surface rules (chunks.js:204–239). It ran on a 250 m grid over the whole
  province (1.39 M points), with finer grids round ours (20 m), the giant (60 m), the 308 m island (50 m) and eight atolls (40 m). It
  leaves out `clearOf` and `settleOn`, so it counts a few too many rigid plants next to rock.
- **The real placement.** `genChunk` ran on a 3×3 of cells at 15 sites, and every instance was counted through a hook on
  `makeInstanced`, added in a scratch copy of the bundle. The game is untouched.
- **The visual share.** Each instance is weighted by its side area: the variant's height × width (real geometry, `test/geo.js`) ×
  scale². A stipe or bladder counts the full water column tall.
- **The diversity measure.** S is the number of species present. N2 = 1/Σp² is the inverse Simpson: how many equally common species
  would give the same dominance. N2 = 1 is a monoculture.
- **The screenshots.** The built game, a new game, then `tp()` to ten of the sites. The look is described in §2.

## 1. The inventory

52 `FLORA` entries make about 47 species. `rusthorn` and `rustdome` are the horn and the dome on fresh basalt (TAXA), and the three
old domes are one giant in three shapes. The table counts every species whose depth envelope reaches the band:

| band | greens | floaters | reds | polyps | crowns | cones | sacs | mats | all |
|---|---|---|---|---|---|---|---|---|---|
| tide band and land (≥ −9) | 9 | 0 | 2 | 7 | 2 | 2 | 5 | 2 | 29 |
| shallows (−9 to −40) | 5 | 5 | 3 | 11 | 3 | 1 | 5 | 3 | 36 |
| lit slope (−40 to −150) | 2 | 5 | 4 | 8 | 4 | 1 | 9 | 3 | 36 |
| twilight (−150 to −300) | 0 | 0 | 1 | 2 | 2 | 0 | 4 | 1 | 10 |
| deep (< −300) | 0 | 0 | 0 | 2 | 2 | 0 | 2 | 2 | 8 |

**Some of the roster is never seen:**
- `seep` and `greymat` stand nowhere, because no basin is anoxic (v11.108; flora.js:1163–1166, 1229).
- `darkrind` covers about 4 ha (flora.js:1237; "fine being off for now", the person, 11 Nov 2026).
- The rust forms grow only on young flows, which five islands have.
- `plume` and `mat` grow only at ours' vents.

That leaves about 40 species in play.

**By ground:** 27 species need rock (`sub` ≥ 0.5), 13 take mixed ground and 8 take any. Only four are sand or mud species: strap,
sandball, pen and glass. Sand is the province's commonest lit ground (§2), and it has the fewest species of its own.

**Densities** (`per`, tries a cell at full tolerance):

| species | strap | tussock | turf | stipe | reed | tidetree | paddle | wisp | rind | median species |
|---|---|---|---|---|---|---|---|---|---|---|
| per | 2,400 | 1,500 | 1,200 | 900 | 900 | 700 | 600 | 420 | 380 | 110 |

Envelopes are plateaus (world.js:501–504). Wherever two species both stand at full tolerance, their numbers are in the ratio of their
`per`. Dominance is therefore set by the density table, not by the conditions.

**Variants.** 48 species pack three variants into one geometry (grow.js:126–129), but the variants do little:
- **Same shape, three sizes.** 23 of the 48 have one topology in all three variants: three random draws of one recipe, or one radius
  stepped. `strapB`, `grapeB` and `tussockB` ignore `k` (flora.js:21, 52, 867). `domeB`, `hornB` and `bommieB` change one radius or
  length (flora.js:158–200).
- **Size steps lost in the scale.** The variants' height ratios run 1.1–2.0. Each instance's own scale range (`s`) is 1.6–4.0, which
  swamps that step in every species.
- **Ecotypes with nothing to read below −30 m.** Eight species draw their variant from wave exposure (`ecoK`, grow.js:28–29). `expo`
  fades out by −30 m (world.js:479), and 80% of these species' instances stand where only one variant can be drawn: wisp 95%,
  bladder 99%, stipe 72%, ladder and ribbon 65%, turf 44%, chain 38%, paddle 10%.

## 2. What a player sees

**The province by band**, from the envelope survey:

| band | area | most individuals | most of the view | N2 (count) | N2 (view) |
|---|---|---|---|---|---|
| tide band and land | 1,221 km² | tussock 35%, turf 20%, tidetree 11% | tidetree 90% | 5.4 | 1.2 |
| shallows | 11,224 km² | **strap 69%**, wisp 13%, grape 4% | strap 57%, stipe 27% | 2.0 | 2.5 |
| lit slope | 1,513 km² | strap 29%, wisp 13%, rind 12%, stipe 7% | stipe 69%, bladder 21% | 7.6 | 1.9 |
| twilight | 1,849 km² | pen 19%, frond 17%, thicket 11%, vase 10% | thicket 27%, lily 13% | 9.1 | 7.1 |
| deep | 69,829 km² | pen 40%, frond 26%, glass 17%, thicket 17% | thicket 43%, pen 22% | 3.5 | 3.4 |

Most of the 11,224 km² of shallows is the 33 banks' flats and the atolls' lagoons. Sand at −20 to −40, calm and poor: strap's ground.

**How often one species takes the view.** The table gives the share of planted points where one species is more than half of what
can stand there:

| band | province, by count | province, by eye | round ours, by count | round ours, by eye |
|---|---|---|---|---|
| tide band and land | 70% | 75% | 80% | 76% |
| shallows | **93%** | **96%** | 43% | 83% |
| lit slope | 37% | 79% | 14% | 68% |
| twilight | 59% | 37% | 62% | 12% |
| deep | 84% | 34% | 69% | 2% |

Strap is the commonest plant at 92.5% of all shallow points in the province. Round ours the shallows are mixed by count (turf on rock,
strap on sand), but by eye the forest takes them.

**The sites**, from the game's own placement, counting everything within 100 m:

| place | depth | S | N2 count | N2 view | most individuals | most of the view |
|---|---|---|---|---|---|---|
| ours, the lagoon | −22 | 8 | 1.7 | 1.2 | strap 75% | strap 92% |
| m140 atoll (20 km), lagoon | −31 | 8 | 1.7 | 1.2 | strap 75% | strap 92% |
| m122 bank (43 km), the flat | −20 | 8 | 1.8 | 1.2 | strap 74% | strap 91% |
| m28 atoll (217 km), lagoon | −21 | 8 | 1.8 | 1.2 | strap 73% | strap 91% |
| ours, reef top in the lee | −12 | 24 | 5.1 | 3.8 | turf 40% | tidetree 48%, ribbon 12% |
| m28, reef top | −11 | 22 | 6.2 | 2.1 | turf 36% | stipe 68% |
| ours, the shelf at (330, 0) | −16 | 21 | 6.0 | 1.3 | turf 34% | stipe 88% |
| m138 (308 m island), shelf | −15 | 19 | 6.4 | 1.5 | turf 33% | stipe 82% |
| ours, the fed shelf | −35 | 24 | **12.2** | 2.5 | wisp 15% | stipe 58% |
| m28, the fed slope | −55 | 20 | 8.5 | 1.6 | stipe 24% | stipe 78% |
| ours, the terraces | −101 | 15 | 6.2 | 1.8 | rind 32% | bladder 74% |
| the giant, shelf edge | −155 | 14 | 7.6 | 3.8 | lily 22% | lily 40% |
| ours, twilight mud | −240 | 5 | 3.8 | 4.1 | frond 37% | frond 35% |
| ours, the deep floor | −1025 | 3 | 2.8 | 3.0 | pen 44% | frond 37% |

**What the variants did at these sites:**
- At m28's fed slope, all 281 stipes were variant 0.
- At ours' fed shelf, all 122 wisps were variant 0.
- On ours' reef top the turf split 12/195/266, the surf's variant.
- In ours' lagoon the strap split 416/447/440, three random draws of the same six blades.

**What the screenshots show:**
- **The four lagoon and bank shots** (ours, 20 km, 43 km, 217 km) are the same picture: a pale floor and strap's green V-tufts to the
  fog. The odd grape, star and rock is the only other thing in them, and nothing tells the four places apart.
- **The shelf at (330, 0)** is a regular stand of identical stipes, all the same height to the surface.
- **The reef tops** (ours, and m28 at 217 km) are the varied places: tables, horns, cups, tubes, loops, chains, ribbons and fans in
  one view. Here too ours and m28 look alike.
- **The terraces at −100** are sparse sacs and red rind. Plausibly dim and poor.

So the variety exists on rock in the light, and the reef top and the fed shelf are as rich by count as anywhere in the game. The
repetition is the sand, which strap takes, and the forest, which is one variant of one stipe at one height.

**Two smaller artefacts the survey found:**
- **wisp on the lagoons.** The floaters' founder has no `nut` term (flora.js:1006). It stands on every poor lagoon floor, 8–20% of
  the individuals there, although TAXA puts the line on the fed flanks.
- **The deep.** It has 3–5 species to a view, which is plausible: an abyssal floor is monotonous over kilometres.

## 3. Island to island

Composition above −150 m, land and tide band included, from the envelope survey. Similarity is Bray–Curtis against the mean atoll:
1 means identical proportions.

| islands | n | S | N2 | commonest | similarity to the mean atoll |
|---|---|---|---|---|---|
| ours | 1 | 40 | 12.7 | rind 15% | 0.59 |
| the giant | 1 | 42 | 11.9 | tussock 19% | 0.55 |
| the 308 m island (m138, 3.1 Ma) | 1 | 38 | 11.5 | tussock 21% | 0.56 |
| young high islands (0.4–0.7 Ma) | 3 | 41 | 4.6 | tussock 44% | 0.48 |
| atolls within 60 km, rim at the surface | 7 | 36 | 6.7 | strap 33% | 0.85 |
| drowned-rim atolls (rim −31 to −60) | 6 | 24 | 8.4 | rind, wisp or strap 23% | 0.40 |
| atolls 60–150 km | 18 | 38 | 3.4 | strap 51% | 0.89 |
| atolls past 150 km (17–30 Ma) | 17 | 38 | 3.0 | strap 56% | 0.87 |
| banks | 30 | 39 | 2.4 | strap 63% | 0.77 (0.96 to the mean bank) |

- **Every island has nearly the same list.** 36 of the species stand on at least 68 of the 85 islands that have 2 km² or more above
  −150 m. The exceptions follow the ground, not history: the rust forms and vents (5 young islands), the thicket (27 islands with deep
  carbonate spurs) and the land forms (the high islands).
- **Islands differ only by their shape:**
  - High islands have land.
  - The drowned atolls lack the tide band and the lagoon.
  - Lagoon size sets how much strap there is. Older atolls in the model have wider rings, so N2 falls with age (Spearman ρ −0.70);
    that runs entirely through lagoon area (ρ(area, N2) = −0.87). In this world the oldest islands are the most monotonous, because a
    wider lagoon is only more strap.
  - Distance from ours does not change composition (ρ between distance and similarity 0.14).

**Why:**
- **`envW` reads nothing an island's history sets.** It reads only the ground height, the slope, the nine fields and `oxy`, which it
  derives from `nut` (world.js:501–504).
- **The fields come from shape and aspect alone.** Each record's shape plus its aspect to one wind and one current (`WIND_A`, `CUR_A`,
  world.js:32; `expoW`, `upW`, world.js:315–316). Food, exposure and current follow from those (world.js:478–480). Every atoll's
  north-east face is therefore a forest and every lee is reef and strap.
- **99 of the 122 records are one template.** Ours, scaled to the reef's ring (region.js:241–242).
- **The region model has the history; the records drop it.** It knows each member's first light and the nearest lit member it was
  settled from (region.js:123), and which members are fed, with no upstream shelter (region.js:97–102). `rgRecord` keeps only id,
  place, state and age (region.js:234), and nothing reads the age.
- **The colonisation history is already computed.** Seed 32's founder is m2 in the far east, lit 30 Ma ago. Ours is 20 hops from it.
  The median hop is 12 km and the longest 54 km.

## 4. Earth

| place | what | number | source |
|---|---|---|---|
| Hawaiian Islands | seaweeds and seagrasses | 661 (450 red, 137 green, 71 brown, 3 seagrass); 13.2% endemic | Sherwood & Guiry 2023 [1] |
| Hawaiian Islands | stony corals | ~60; NWHI 57, main islands 59; 17 NWHI endemics (30%) are 37–53% of each reef's coral; archipelago endemism > 25% | Maragos et al. 2004; NOAA [2] |
| Coral Triangle | zooxanthellate corals | 605 (76% of the world's); the Bird's Head alone 574 | Veron et al. 2009 [3] |
| GBR vs Galápagos | coral species per reef system | 321 vs 13 | Bellwood & Hughes 2001, as reported in its *Science* commentary [4] |
| Indonesia → French Polynesia | coral richness | local richness and regional pools both fall across 15 islands eastward | Karlson, Cornell & Hughes 2004 [5] |
| Pacific islands | seagrasses | 16 species in 17 of 22 countries; Papua New Guinea 13, French Polynesia 2 | McKenzie et al. 2021 [6] |
| French Polynesia | benthic algae | 425 taxa, of which 117 cyanobacteria (so ~308 macroalgae); 29% of its red algae occur only in the Austral group | Payri & N'Yeurt 1997 [7]; N'Yeurt & Payri 2010 [8] |
| Galápagos | macroalgae | 311–333 species; 39% endemic in the 1998 tally | [9] |
| northern GBR | *Halimeda* bioherms | 6,095 km², a mix of *Halimeda* species with *Caulerpa* | McNeil et al. 2016 [10] |
| Mediterranean | *Posidonia oceanica* | "vast monospecific meadows" | [11] |

**Plausible** (the planet's logic, and Earth agrees):
- **A short list.** A remote archipelago is species-poor. Hawaii's seaweed list is long, but most of it is turf, crust and epiphytes a
  diver cannot tell apart. What a diver sees as distinct forms runs to a few dozen: the scale of Tethys's roster. That is a judgement,
  not a sourced number.
- **One species dominating a habitat.** Kelp canopies, *Posidonia* meadows and *Halimeda* flats are real (SEAFLOOR §2 already says so).
  Seagrass thins to two species by French Polynesia.
- **The same list on neighbouring islands.** Spore and larva dispersers cross 10–20 km gaps in days (SEAFLOOR §1). The Tuamotus'
  atolls do look alike.

**Artefacts** (the code, not the planet):
- **A lawn with no bare sand.** One runner at 22 times the median density, with no bare patches or patch reefs.
- **One species where Earth has a genus.** A *Halimeda* flat is several *Halimeda* species. Here it is one strap with three
  near-identical variants.
- **Identical proportions from 1 to 30 Ma.** Earth's old remote clusters carry their own species: 29% of French Polynesia's red algae
  occur only in the Austral group, Hawaii's corals are 25–30% endemic and Galápagos seaweeds ~39%. Here the first light and the
  stepping stones are computed and thrown away.
- **A lagoon that is only sand.** Atoll lagoons are studded with patch and pinnacle reefs, and TAXA:151 designed "dome patch-reefs" for
  ours. The lagoon floor is sand (`sub` 0.33, world.js:486), level to ±1.5 m (world.js:388), and the reef formers need `sub` ≥ 0.6
  (table, horn, dome: flora.js:1080–1081, 1089–1093). So none ever stands there.
- **A forest of one cut.** Every stipe is cut to the surface (chunks.js:227) and is the sheltered variant below −30 m. A real kelp
  forest has recruits and subadults under the canopy.

## 5. What would add diversity, ranked

Ranked by how much of what a player sees each one changes, against its cost. "The person's" marks a design choice to ask about first.

1. **Meadows, not a lawn.** Claude's to tune; the person looks.
   - **The change.** Take strap's `per` from 2,400 to ~800 and gate it with a coarse `pocket`-style threshold (chunks.js:216, the
     button's), so it grows in meadows with bare sand between. Give wisp the `nut` gate its line has (flora.js:1006, 1007).
   - **The cost.** Two lines in flora.js. No new draw call, and fewer instances.
   - **On screen.** Every lagoon and bank flat (most of the province's 11,224 km² of shallows) becomes patches of meadow and pale
     sand. N2 on a lagoon floor rises from 1.7 to about 3.
2. **Patch reefs in the lagoons.** The person's: it changes ours' ground.
   - **The change.** Build TAXA's "dome patch-reefs". Add hard knolls to the lagoon floor, rock on top, a few metres high and 100–300 m
     apart: the seamounts' pillow knobs (`R.knob`, `R.bare`, region.js:243) moved to the lagoon term. The existing reef roster settles
     them by envelope, with no new species.
   - **The cost.** About 10 lines in islandH's lagoon block (world.js:386–388) and a margin in `rgBound`. Ours' lagoon moves, so
     `ISLANDS[0]`'s bit-identity goes by decision, and the baselines in test/records.js and test/region.js move.
   - **On screen.** The biggest change of any here: the commonest lit ground in the province gets reef islands in its meadows,
     99 reefs at once.
3. **Variants that read, and a forest with ages.** Claude's craft; the person looks.
   - **Variants.** Give `k` a shape, not a size, in the builders that ignore it or step one radius (flora.js:21, 52, 158–200, 867).
     Strap could be narrow-bladed, broad and few-bladed, or a single tall fan; the dome banded, lobed or plate-edged.
   - **A second ecotype axis.** Below −30 m give the eight ecotype species another driver, the current (`flow`) or the depth.
   - **Juveniles.** Draw a share of stipes as juveniles at a third to two-thirds of the water column (chunks.js:227).
   - **The cost.** Tens of lines in grow.js and flora.js, and one line in chunks.js. The variants share one geometry, so there is no
     draw-call cost; vertices grow a little.
   - **On screen.** The forest stops being a fence, and a meadow of one species stops being one shape.
4. **Fields that differ between islands.** The person's.
   - **The change.** Let an upstream neighbour's shelter lower a member's `nut` and `expo`, and its wake shade the next. The region
     model already knows who shelters whom (region.js:97–102). GLOBE §9 stage 5 names exactly this: "where two members of one age stop
     being the same".
   - **The cost.** About 20 lines in `sample()` and the records. The old square's bit-identity tests move.
   - **On screen.** Some atolls ringed in forest, others in the lee all reef and sand.
5. **A second sand flora.** The person's: the roster.
   - **The change.** Within TAXA's lines: the chain's lime upright on calm sand (*Halimeda*'s real lagoon form holds by a bulb in sand;
     today's chain needs rock and surf), a pale deep strap congener for the 30–40 m lagoons, and a sand sac.
   - **The cost.** A `species()` each (15–30 lines) and one `FLORA` line each, plus a draw call where present.
   - **On screen.** The meadow becomes two or three runners and a lime upright, as real *Halimeda* flats are.
6. **Endemics: the range term** (SEAFLOOR §6, open). The person's.
   - **The change.** Carry `lit` and `src` from the model into the records (region.js:123, 234). Give the short-dispersal lines
     (brooding sacs, crowns, cones) sister species by cluster: the old east's own tube, lily or cone, for instance.
   - **The cost.** A range factor in `placeFloraType` (chunks.js:215, one `recsAt` lookup) and a `species()` per endemic. Ranges are
     disjoint, so no view draws more.
   - **On screen.** Travelling east changes the species, not only the depth.
7. **Disturbance and succession patches.** The person's: a new mechanism.
   - **The change.** Storm gaps on exposed coasts and slides reset ground to pioneers (turf, limerind, beard), then chain and polyps. A
     seeded "time since disturbance" scaled by `expo`, read at placement only.
   - **The cost.** About 20 lines and a new envelope key. No shader change.
   - **On screen.** Reef tops and forests with clearings and patches in different stages.
8. **Absence by arrival order** (TAXA's stages). The person's; ranks low.
   - **Why little changes.** With hops of ~12 km and every island lit for 0.4 Ma or more, almost every line reaches every island. It
     would change only the 50 kyr seamount and the active shield, which the progression rule (`young` ≤ 0.45) half covers already.
   - **When it is worth it.** Only together with 6.

**Decisions (the person, 12 Nov 2026):** "Yes go ahead with 1 and 3 and then leave 2 for something to consider after. And these YES to
islands shielding each other, another sand flora, the other two as well, yes." So: **1 and 3 built** (v11.116); **4** (islands shield
each other), **5** (a second sand flora), **6** (species by island group) and **7** (storm clearings and regrowth) **yes**, in that
order (v11.117–120); **2** (patch reefs) to consider after; **8** not asked.

## 6. What could not be checked

- **Frame cost.** Nothing proposed was built, so the frame cost of any proposal is unmeasured. The forest at (330, 0) is the place to
  time 3.
- **The envelope survey's gaps.** It leaves out `clearOf` and `settleOn`. The 15 sites with real placement agree with it in rank and
  rough share.
- **The visual share.** It is a proxy: side area, not what the fog and the camera show. The screenshots are ten frames under software
  WebGL, with three.js r128 served from a local copy because cdnjs was blocked.
- **Earth's numbers.** They come from the cited papers' abstracts and records found by search; most of the papers' own sites were
  unreachable from this session. The "few dozen forms a diver tells apart" is a judgement.
- **The land.** tussock and tidetree are counted but not judged; the land flora is its own pass (FLORA, Open).

## Sources

1. [Sherwood & Guiry 2023, Inventory of the Seaweeds and Seagrasses of the Hawaiian Islands, *Biology* 12:215](https://www.mdpi.com/2079-7737/12/2/215)
2. [NOAA, status of the coral reefs of Hawaii](https://www.coris.noaa.gov/portals/pdfs/status_coralreef_hawaii.pdf); [Kenyon et al., NWHI (Maragos et al. 2004 counts)](https://webarchive.library.unt.edu/web/20130215150249/http://www.pifsc.noaa.gov/library/pubs/Kenyon_etal_ARB_558_2008.pdf)
3. [Veron et al. 2009, Delineating the Coral Triangle, *Galaxea* 11:91](https://www.jstage.jst.go.jp/article/galaxea/11/2/11_2_91/_article)
4. [*Science* 2001 commentary on Bellwood & Hughes](https://www.aoml.noaa.gov/ftp/od/library/habitat-knowlton.pdf)
5. [Karlson, Cornell & Hughes 2004, *Nature* 429:867](https://www.nature.com/articles/nature02685)
6. [McKenzie et al. 2021, Seagrass ecosystems of the Pacific Island Countries and Territories, *Mar. Poll. Bull.* 167:112308](https://archimer.ifremer.fr/doc/00689/80148/83211.pdf)
7. [Payri & N'Yeurt 1997, A revised checklist of Polynesian benthic marine algae](https://repository.usp.ac.fj/id/eprint/5283/1/A_Revised_Checklist_of_Polynesian_Benthic_Marine_Algae.pdf)
8. [N'Yeurt & Payri 2010, Marine algal flora of French Polynesia III, Rhodophyta](https://sciencepress.mnhn.fr/en/periodiques/algologie/31/1/marine-algal-flora-french-polynesia-iii-rhodophyta-additions-phaeophyceae-and-chlorophyta)
9. [Galápagos marine biodiversity tables (data to 1998)](https://biblio.naturalsciences.be/rbins-publications/bulletins-de-linstitut-royal-des-sciences-naturelles-de-belgique-entomologie/70-sup-2000/entomo70sup_31-38.pdf); [Galápagos macroalgae review](https://kimuk.conare.ac.cr/Record/PUCR_d596e40d77d822e7e2d48c697b50ae18?lng=pt-br)
10. [McNeil et al. 2016, the Halimeda bioherms of the Great Barrier Reef, *Coral Reefs*](https://portfolio.jcu.edu.au/publications/JCU156306)
11. [*Frontiers in Marine Science* 2022, 9:891467 (Posidonia meadows)](https://www.frontiersin.org/articles/10.3389/fmars.2022.891467)
