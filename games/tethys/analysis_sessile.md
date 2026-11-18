# Sessile giants: one animal pasted everywhere, and the shapes that were missing (18 Nov 2026)

A believability pass on the big sessile animals, at the person's request. **Answered and built as v11.181** (the person's answers are at the
end). Downstream of `PLANET.md` (the clades, the tides, the light), `TAXA.md` (the sessile lines) and `FLORA.md` (the giants); beside `REEF.md`.

> "I want you to run a believability pass over the insanely oversized sessile ringmouth animals that are now used like giant boulders. I want
> to find a variety of shapes (the way we have mussels, clams, all sorts of sessile animals) and types of creatures just based on
> evolutionary plausibility. Rather than one gigantic sessile animal pasted everywhere, even though it looked good and was cool, it's just not
> believable or accurate to evolution." (the person, 18 Nov 2026)

## 1. What it was

The three **old domes** (`olddome` in flora.js since v9.5; `olddome2` the fused lobes and `olddome3` the low wide one in reef.js since v11.21):
one banded mound in three outlines, the polyp line's *farmers'* massive colony (a green in the skin: TAXA). They are structures — `big`
entries placed by far.js `bigsGen` and drawn by the far layer with the rock's material (`MATROCKB`), one dodecahedral lump each for collision —
which is why they read as boulders. (The person called them ringmouths; strictly they are the polyps', the drifters' fixed stage.)

| | as built to v11.178 | what the docs said |
|---|---|---|
| size | `s` 14–26, 12–22, 14–30; the mound is 1.52 of the scale wide, so **21–40 m across**, 5–8 m tall | "14–26 wide" (FLORA.md, Giants) |
| how many | `per` 1 each, three entries: **95 within 2.7 km of the start, 137 in the 17 km square round ours** | "~4 in the world" (v9.5) |
| where | −150 to −20, hard ground, `nut` 0.4–1 | "shelf edge, rockfall, terraces" |

## 2. Why it fails the filter

1. **Count.** A single colony 30 m across is a record on Earth, not a furniture item: the Solomons' colony found in 2024 (34 × 32 × 5.5 m)
   and Ta'u's in American Samoa are each famous because there is one. Massive colonies are 1–5 m; the few past 10 m are centuries old.
2. **Light.** The dome is a farmer. Its own small form (`dome`) stands −24 to −6; the giant stood to −150, six times deeper than its light.
   Earth's massive farmers rarely build domes below 30–40 m; what lives deeper is thin plates or fishers.
3. **Food.** Farmers win in clear poor water (`dome`'s `nut` 0–0.55). The giants stood in `nut` 0.4–1 — the fed water where the fishers, the
   weeds and the filter feeders beat them. That envelope is a filter feeder's.
4. **Ground.** Nothing kept a colony of a thousand years off lava a century old (`young` unchecked).
5. **Shape.** The only big living thing between −20 and −150 was one body plan, and nothing in the roster could pile.

## 3. What a big sessile thing is on Earth

Almost always **many animals, not one**. A sessile animal the size of a boulder is one of three things:

- **A bed or a bank** — larvae settling on their own kind, generation on generation, the dead bound under the living: oyster reefs, mussel
  banks, the worm-snails' platforms and Bermuda's boilers, serpulid mounds, honeycomb-worm reefs, glass-sponge reefs, cold-water coral mounds.
- **A colony with centuries of quiet**, in the conditions its kind needs: the massive corals, and the microatoll where one meets the low tide.
- **Dead**: shell banks, rubble, coquina (the deep `mound` already is this).

Big *single* sessile animals stop near 1–2.5 m (the giant clam, the barrel sponges, the vent tubes, the stalked sea lilies).

## 4. What tethys's lines can become

| form | line | Earth's proof | what it is | status |
|---|---|---|---|---|
| **gaper** | hingeshells (a new sessile line) | ostracods and clam shrimps live whole inside a hinged two-valved carapace; barnacles cement and comb | the clade's own hinge kept: one valve cemented, the other a lid, the combs out of the gape, the eye row on the lid's edge | **built v11.181** |
| **gaper bank** | the same | oyster reefs, mussel banks | a mound of generations, dead valves under live ones, long across the current; 6–13 m, 1–2.5 high | **built v11.181** |
| **wormshell** | ringmouths (crowns: "the cement") | the worm-snails (vermetids) | a coiled shell cemented at its apex that grew on as a wandering tube, the arm ring out of its mouth | **built v11.181** |
| **tube knoll** | the same | vermetid platforms, Bermuda's boilers | a knoll of tangled tubes in the surf, its top bared at the springs' lows; 2.5–6 m | **built v11.181** |
| **old domes**, revised | polyps (farmers) | massive colonies | in the light, poor clear water, old rock; 3–9 m (the low wide one to 14), the top at the lowest tide | **built v11.181** |
| **microatoll** | the same | microatolls | a colony that reached the lowest tide: a dead turfed top, a living lip; 2–6 m | **built v11.181** |
| sun crown | ringmouths (crowns) | the giant clam's niche | a crown whose flattened arms farm greens on the reef flat, 1–2.5 m, centuries old: the shallows' one big individual | proposed, not chosen |
| sunk gaper | hingeshells | cockles, pen shells | a gaper half-buried in sand, the gape up: sand's sessile filter feeder | proposed, not chosen |
| the great lily, the cistern | crowns, sacs | stalked crinoids, barrel sponges | FLORA.md's planned giants | still "next" there |

## 5. Where they stand (v11.181, measured with far.js `bigsFor` and `envW`)

| | the 17 km square round ours | the 8.8 km square on the atoll m88 (72.6, 27.4 km) |
|---|---|---|
| old domes (all three) | 10 (was 137) | 222 |
| microatolls | 0 | 42 (15 at `per` 2; raised to 5) |
| gaper banks | 77 | 101 |
| tube knolls | 28 | 50 |

Round ours the shallow hard ground is fed water (`nut` ≥ 0.6 in 87% of it, −5 to −30), where farmers lose: the domes are few and the
microatolls none, and the banks and knolls take the big shapes. The farmers' colonies are the atolls' — the clear poor water the reef
builders need. That is the archipelago differing by its logic (SEAFLOOR §2), not a knob.

## 6. The person's answers (18 Nov 2026)

1. **The giant** — "Yes, the old domes."
2. **The new forms** — gapers and gaper banks; wormshells and tube knolls. Not the sun crown or the sunk gapers (they stay proposed, §4).
3. **The old domes** — "Shrink, move to the light": farmers where farmers live, a few metres, a handful to a coast, plus the microatolls.

On the preview (18 Nov 2026): "the most recent update for the sessile creatures was a success ... the tube creatures looked the best by far. ... The
rock looking ball of little worms looks too busy. I would like to either rework it or ... put it off." Reworked as **v11.182**: the knoll as the lone
wormshell's gesture many times over — 24 long tubes standing up and out from a dark foot (crowded tube-dwellers grow erect: Earth's serpulid clumps and
vermetid aggregations), a crown on every living mouth — and drawn without the rock's tide band, which had stained its tubes grey-green. The person, on
its screenshots (18 Nov 2026): "WOW that looks awesome. I adore that new knoll. Exactly what I had in mind."

## 7. Open

- Whether the banks read as many animals or as a rock with things on it (v11.22 binned exactly that look: "put the placed rocks with stuff stuck
  to it in the bin"). The knolls did read so (§6) and are a thicket since v11.182, which the person kept; the banks are unanswered. The old domes and the microatoll also stand in
  the tide band (`MATROCKB`'s stain) at their tops — right for the microatoll's dead turfed top, arguable for a living dome; not changed.
- The sun crown and the sunk gaper (§4), if the reef flat and the sand want them later.
