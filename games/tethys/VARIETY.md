# VARIETY — the individual: what differs between two animals of one kind, why, and how it is made

**Status: proposed 23 Nov 2026; §8's questions answered the same day; nothing built.** The person's brief (23 Nov 2026): *"now is a good time to start discussing or working on docs for
implementing the diversity generator per individual, as well as color palettes for variety as well. But that kind of thing — should it be 30 m or
20 m — is exactly something that will come up in the generator."* Downstream of CLADES.md, *The radiation* (decided 23 Nov 2026: **individuals are
generated, species authored**) and PLANET's colour rules (blood tints, shell colour by water chemistry); beside LINEAGE §6 (a line's mutation is
the same space as a wild animal's variation); upstream of creatures_ai.js `spawn` once the person has struck what they do not want.

The brief behind the brief (CLADES, The radiation): the ringmouths read *"a little too clean"*, and the reason is that every animal of a kind is
the same animal. Endoceras in the imaging the person liked differs from shell to shell — colour, banding, arm length, size. That is what this is for.

## 1. What exists

| what varies | how | where |
|---|---|---|
| adult size | ±15%, uniform (`VARY.spread`) | creatures_ai.js `spawn` |
| juveniles | born at `ECO.juv` 0.55 of the kind's scale, grow up out of sight | `juvDef`, `growUp` |
| coat by the place's chemistry | rust, lime, sulfide, manganese, the young rock's dark — **hingeshells only** (`COAT_CHEM_KEYS` is empty for the rest) | creatures_spec.js `coatClassAt`, `coatChem` |
| the moult | the soft state, pale and clamped; the shed carapace | `MOULT` |
| wounds | a lost arm keeps a stump and grows back; a hold's damage | combat.js |
| the bestiary's coats | hue ±35, complement, blood, dark water, bleached, hard countershade — for looking only, nothing in the world reads them | creatures_builders.js `PAL_VARIANTS` |
| a coat drawn by physics | by depth band, blood and diet (carotenoids only from the lit shallows' food) — **the lab's only** | creatures_spec.js `coatFor`, `COAT_BAND`, `COAT_DIET`, `COAT_BLOOD` |
| patterns | one per clade (spots, stripes, plates, none), carried per vertex | `PATTERNS`, `patternOn` |

How a body is made matters for all of it: a kind is **built once per kind, age and coat class and then shared** (`KIND_GEO`; the build tape replays it),
and its colour is baked into its vertices. So anything that shows in shape or colour is a *variant* built once and shared by every animal that
draws it. Variants cost build time at first sight and memory, not draws: every creature already draws its own meshes. The far schools are the
exception (one instanced mesh per baked variant, each with a per-instance colour already allocated, `SCHOOL_INST`).

## 2. The principle: every difference has a cause the world can name

Five causes, each with a rule a player could learn by looking:

1. **Genes: the morph.** Discrete, a few per species, each with a frequency. Earth's polymorphisms are the model: the **melanic** morph (dark;
   commoner in cold, deep and vent water), the **erythristic** (red, which is free camouflage below −15, where a red animal is black), the
   **leucistic** (pale, rare), and a pattern morph (bands broken into spots). The common morph is most of the population; **a rare one is a find**,
   the kind of thing a player who plays ecologist remembers.
2. **Growth: age.** Size, and the marks of time, by the clade's own growth law (§3). Age is drawn from the kind's survival (the ledger's death rate
   `m`): many young, few old. *This is where "20 m or 30 m" is answered: both — the common adult at 20, the rare old one at 30.*
3. **Place: the environment.** The coat by the water's chemistry (built for hingeshells; extended to every clade's shell and plates, PLANET's
   shell-colour rule); the shade by depth (`coatFor`'s bands); **fouling**: the reef's own sessile taxa settled on an old shell where the water is
   fed (fossil orthocones carry crinoids and bryozoans, some settled in life).
4. **History.** Scars; a lost arm regrowing (built); a healed shell break; the **shed tip** of an old straightshell (Sphooceras: the old chambers
   dropped and sealed — young long and pointed, old blunt).
5. **Development: the small differences.** Proportions within the registry's believable bands (`PARTS` params' `b`): limb length, a shell's taper,
   a fin's size — a few percent, and **asymmetry** (one grasp arm longer). `derive` runs on the individual's spec, so the physics follows: a
   long-armed one turns slower, a big old one is heavier and slower to reach speed. Nothing is decorated that the calculator does not then feel.

**Never**: a colour without a cause (no blue pigment — blue is a structure, shallow and rare; nothing glows for nothing, BIOLUM §6); a variant the
eye cannot tell at 30 m spent where it costs a build; a difference the ledger would have to remember.

## 3. Growth laws, by clade (the size an age gives)

| clade | the law | what the population looks like |
|---|---|---|
| **ringmouths** | short-lived, spawn once and die (LINEAGE §3): growth stops at maturity; **the shelled keep a record** — a straightshell adds chambers all its life, so its length is its age, and the old shed the tip | soft ones all of a size; shelled ones spread, the longest the oldest |
| **slowbloods** | ectotherms, **growth never stops** (as fish and reptiles): slower each year, never zero | a wide spread with a long tail of giants — the old ridge is the big ridge |
| **hingeshells** | grow only at a moult, so **in steps** (instars); some stop at a terminal moult | sizes in classes you can count — a tell no other clade has |
| **drifters** | grow with food, shrink without (Earth's jellies do) | size follows the place's food, not age |

The plumb: adult ~20 m (today's build), old to ~30 m (the person, 23 Nov: *"I think we should let 30 m be a reasonable new size for it"*), the
old ones blunt-tipped, fouled in fed water, the band faded; juveniles at 0.55, hanging the same way.

## 4. How it is made: an individual is a recipe

- **An individual is `(kind, seed, age, place)`.** From it, `indiv()` draws a morph (by frequency), an age (by survival), the proportions (within
  the species' variance), and reads the place's coat class. Nothing is stored that the seed and the place do not give back.
- **The species carries a `VARIETY` row** (authored, small; the radiation's species get one when they are made): its morphs `[{name, freq, pal,
  pattern}]`, the params that vary and by how much, its growth law (the clade's unless it says), and which marks apply.
- **Variants are keys.** Geometry is shared by `kind · morph · proportion bin · coat class · age class` (young, adult, old). Each key is built
  once on the tape and shared. The proportions are quantised into a few bins so the keys stay few; size stays continuous (a scale, as now).
- **A budget per kind** (§8.3: the clade's default — the ringmouths' the largest, the hingeshells' next — and the species' own where it says):
  past it, an individual takes the nearest built key. Common kinds hit their budget; rare ones never do.
- **Physics per variant.** `derive` on the variant's spec, a flat def per variant (as `scaledDef` makes one now), so speed, turn and mass are the
  individual's. The ledger keeps counting kinds; its mass per kind is the type's (the spread averages out).
- **Stable** (decided, §8.1): seeded by the cell, the entry and the spawn's place in it, the same cell shows the same animals each visit while
  its counts hold — *the old blunt plumb at that wall*, recognisable, until it dies. 
- **Heredity.** The species' variance is its standing variation; the player's founder stays the type specimen for now (§8.4), and LINEAGE §6's mutation moves
  a line through the same space — one set of bands for the wild and the line.

## 5. Colour: palettes by physics

The rules exist (`coatFor`, CREATOR.md Colour): blood (copper teal, iron rust, vanadium straw), the pigments a clade makes (melanins; the
ringmouths' ommochromes, yellow to red-brown), what it eats (carotenoids only where the food is the lit shallows'), and depth (the shallows'
countershade, the shelf's olives and browns, the slope's reds and blacks, the deep's red and black). Proposed:

- **A species' palette is drawn by those rules** when a species is authored (the radiation's), then tuned by hand — not hand-picked from nothing.
- **A morph is a transform of the species' palette with a cause**: melanic (melanin up: value down, saturation down), erythristic (hue to red, the
  belly holds), leucistic (value up, saturation down; the eyes stay), carotenoid-rich (warmer — only where the diet allows). `PAL_VARIANTS` already
  holds most of these as looks; here they become morphs with frequencies.
- **The place shifts the coat** (`coatChem`) for every clade: a shell's and a plate's keys get the chemistry; flesh does not (blood decides it).
- **The pattern follows the habit**: disruptive (bands, mottle) among structure (reef, kelp, rubble), countershaded in open water, plain below the
  light; a pattern morph changes its scale or breaks it. Today's per-clade pattern is the default.
- **Continuous colour per animal** (every one a shade apart) would need a tint per creature in the shader — a uniform per draw, a renderer change
  with a cost to measure. Not proposed first: discrete morphs and place coats give most of the read for builds alone. The far schools can have it
  for nothing (their instanced meshes already have a per-instance colour, set to white today).

## 6. Cost, and how it is measured

More variants is more builds at first sight (the build table: 0.1–7 ms a kind the first time, ~0.1 ms replayed) on the generation's frame budget,
more memory, one far bake per variant, and a few more instanced meshes for the far schools. `test/bench_creatures.js` (builds, a cell's ms, every body
the same or not), `test/gpu.js` (draws, programs, bytes), `test/frames.js`; a new test pins the generator (a seed gives the same animal; the morph
frequencies hold over a census; no variant past the budget; every proportion inside its band; derive per variant).

## 7. The order (proposed)

1. **The machinery and the ringmouths' shelled** (the "too clean" ones): `VARIETY` rows, `indiv()`, variant keys and the budget, derive per variant,
   the seed. The plumb (20–30 m by age; the shed tip; fouling) and the ortho first, then coil, great, rasp.
2. **Growth laws** for every clade.
3. **Morph palettes** and the place coat for every clade.
4. **Marks**: scars, the shed tip, fouling everywhere it applies.
5. The rest of the roster, a clade a pass, each seen before the next.

## 8. Decided (the person, 23 Nov 2026)

1. **Stable individuals.** *"For now, leave them. But eventually the AI will have almost everything roaming according to how it ought to. Right now
   the fixed locations feel good though, in a tangible, stable kind of way in such a huge world."* An individual is seeded by its cell, its entry and
   its place among them, so the same animals stand in the same cell each visit; roaming is a later pass.
2. **Rarity is the species'.** *"Some animals should have high diversity and some should be uniform. I am a 1 in 50 kind of guy."* Each `VARIETY`
   row sets its own spread and morphs (none for a uniform species); a rare morph is about one in 50.
3. **The budget is the species'**, every clade has one, and **the ringmouths vary the most**, the hingeshells next: *"all the clades need it but I'd
   imagine ringmouths vary more as well as hingeshells, but in truth we need each species to have its own variety."* The clade sets the default
   (ringmouths highest), the species may move it.
4. **The player's founder is left alone** for now: the type specimen, as built.
5. **Size by age, and a range on top**: *"size by age for sure, but there should also be range on top of that."* The growth law gives the size an
   age gives; each animal then varies by its species' `range` around it.
