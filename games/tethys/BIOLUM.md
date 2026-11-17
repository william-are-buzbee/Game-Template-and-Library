# BIOLUM.md — what glows in Tethys's sea, where, and why (16 Nov 2026)

Status: **answered 17 Nov 2026 (§7): the three PLANET rules of §6 revised as proposed, steady lures allowed, the pall first — §8, building as
v11.163 (built: CHANGELOG).** Read PLANET.md first (the cross-clade rules, the Hooks and the Light bullet as revised that day), then PLANKTON.md §8, DEEP.md §2–3 and
DESIGN.md "The body's effects". What is still open is in §7.

**v11.171 (17 Nov 2026), the person:** "The lights of the bioluminescent creatures should actually emit a light. The way the own light does." The pall's net now holds a light-pool source (fx.js `PHO_LURE`), as the glowing carcasses (`BACT_L`) and the cloud (`PHO_L`) did; every one of them takes the halo (v11.166).

## 1. Where it stands

- **In the game:** glowing carcasses (gut bacteria lit by quorum, fx.js `BACT`; no comment from the person yet), milky seas (world.js `MILKY`: "I love the
  milky sea"), the animal's night eye (world.js `NIGHT_EYE`: "exactly what I wanted" — leave it).
- **Struck, kept as kits:** the motion wake (v11.162; fx.js `skBody`, `sparkBurst`, world.js `FLASH`) and the dusk displays (v11.162.1; fx.js `DSP`, `DSP.on`
  false). **v11.162.1 never reached `main`:** #101 merged one commit before it, so the live game still shows the displays. It is the first commit of
  this branch.
- **The person, 16 Nov 2026,** on the wake: "in a low poly world, I actually think it isn't very legible … even on earth it would be unclear for a human.
  So let's bin this idea of bioluminescence purely as a function of you moving with the intention of bringing it back in once we have other
  bioluminescent things in mind." On the displays: "odd looking, it comes up in a straight line and its little blue circles in a game with square
  features … it should be considered in a different way, like a creature that simply glows. but it would have to be pretty deep underwater and I don't
  know if like, a cloud of bioluminescing microbes is a common thing, or what the most common form of bioluminescence even is."
- **What the two strikes teach.** Both were points: the wake's sparks read as the marine snow (squares, the person's choice), and the displays were
  round dots in a square world. Neither lit anything the player cared about. A light that reads here is **on a body's own faces, or is a volume**
  (the milky sea is the water itself), **and it means something the player can act on.**

## 2. Earth, briefly

**How common.** Martini & Haddock (2017) scored 350,000+ animals over 1 cm in 240 ROV dives in and around Monterey Canyon, from the surface to 4,000 m:
**about three quarters can make light, and the share is much the same at every depth**; what changes is who. From 0 to 1,500 m most of the luminous
are jellies and comb jellies. (The paper's exact share was not re-read: nature.com was blocked from this session.) **The floor is
the exception:** on the Bahamas' slopes at 500–1,000 m — the slopes DEEP §3 already cites for the deep gardens — under 20% of benthic species
glowed, mostly cnidarians (sea pens, bamboo corals, anemones), greener than the water column's light, and most of the light seen there was plankton
flashing as it struck the filter feeders (Johnsen et al. 2012). It has evolved at least 94 times (Lau & Oakley 2021): nothing about it is rare or hard.

**What it is for** (Haddock, Moline & Case 2010):

| use | how | Earth's example |
|---|---|---|
| counter-illumination | a dim belly matched to the light from above erases the silhouette | hatchetfish, lanternfish; the bobtail squid in the shallows at night, about a third of the moonlight, tracking it (Jones & Nishiguchi 2004) |
| lure | a light that feeds its owner: what comes to it is eaten | anglerfish (bacteria in the esca; Baker et al. 2019), dragonfish chin barbels, an octopus whose suckers became photophores (*Stauroteuthis*, Johnsen et al. 1999) |
| defensive flash | a startle on contact | most jellies; the sea pens' half-second pulses |
| decoy cloud | light left behind while the animal goes dark | the vampire squid's arm-tip lights on contact and, when badly frightened, a cloud of glowing mucus (Robison et al. 2003); worms that drop glowing "bombs" (*Swima*, Osborn et al. 2009); shrimp that spew it |
| burglar alarm | light that calls the attacker's attacker | dinoflagellates; *Atolla*'s pinwheel when grabbed — Widder's e-jelly copies it and brought a giant squid to the camera (2019) |
| mate and kin signals | a pattern its own kind reads | lanternfish photophore patterns, species by species (lineages that signal speciate faster: Davis et al. 2014); sea fireflies' strings |
| searchlight | light to see by | the flashlight fish on moonless reefs (90 blinks a minute, longer on with prey; Hellinger et al. 2017); the dragonfish's far-red, unseen by its prey (below) |

**Where the light comes from.** Either the animal's own chemistry — a luciferin oxidised by an enzyme, so it needs oxygen; the commonest is coelenterazine,
which many animals take from their food rather than make — or **symbiotic bacteria** held in an organ and switched by a lid or a shutter (anglerfish,
flashlight fish, the bobtail squid). **Colour:** blue, ~470–490 nm, because blue carries furthest in water and most deep eyes see only it; greener on the
floor and the coast (Johnsen 2012); **red in three dragonfish genera alone** (>700 nm, a searchlight their prey cannot see, seen by a pigment taken from
the copepods they eat; Douglas et al. 1998).

**What a diver or a sub sees.** Sunlight usable to an eye ends near 1,000 m (the twilight zone is 200–1,000 m; NOAA). Below the light, or at night,
with the lamps off: **dark, punctuated by flashes where something is touched** — sparks off the hull, a jelly's ring, a sea pen pulsing. Widder at
800 ft with the lights off: "It was everywhere!" A sub's lights flashed three times are answered in unison. **Steady glows are the rare case**, because
a steady light gives its owner away: the steady ones are lures (they want to be seen) and counter-illumination (dim and matched, so not seen). In the
shallows at night: dinoflagellates sparking off hands and waves, sea fireflies' strings at dusk over reefs, flashlight fish on moonless nights.

**Clouds of glowing microbes.** Dinoflagellate blooms are common on coasts the world over and are what most people have seen — but they flash only when
stirred (the wake we struck). **A steady glow from microbes is bacteria's**, which light only when dense (quorum): on a carcass, a pellet or a flake of
snow (glowing particles draw zooplankton and fish, which is how the bacteria get eaten into a gut; Zarubin et al. 2012), and in **milky seas**: two
or three a year by ships' reports, twelve seen from satellites since 2013, mostly the north-west Indian Ocean and off Java (Miller et al. 2005, 2021).
**A deep cloud of glowing microbes is not a thing** past the glowing particles. So the answer to "the most common form": by animals counted, a jelly's
flash when touched; by what people see, dinoflagellates in a wake; by chemistry, coelenterazine.

## 3. What it means for Tethys

- **"Pretty deep" is mostly right.** Most luminous animals live below 200 m, and a light in daylight is wasted. Two exceptions are this planet's:
  the big close moon gives bright nights, which is when Earth's shallow counter-illuminators work hardest (the bobtail squid); and moonless nights,
  when the flashlight fish come up to the reef.
- **The game's deep is not dark by day.** Daylight falls linearly to a floor of 0.28 of the surface by −300 m and stays there (world.js `DL_MIN`,
  `DL_REF` 420): at −516 m over the fed flank at noon the frame is a navy murk, mean 25 of 255; at midnight it is 8, with only the own light
  (headless, low tier, 640×360). Earth's −500 m in clear water is of the order of a millionth of the surface's light. So lights would read well at night anywhere below the
  shallows, and dimly by day in the deep. Whether the deep should be dark by day is a question of its own (the eye is "never the depth", the person's
  for another time, 16 Nov 2026).
- **No hunter sees by light today.** Sight is a fixed `detect` range by day and night, at the surface and at −800 (creatures_ai.js `findPrey`); the one
  coupling ever built — a lit body seen further, `litK` — went with the wake. A light the *player* sees works at once; a light that changes what the
  *creatures* do needs a sight term (or `litK` back), and a lure needs prey drawn to a light (the inverse of `findCarcass`'s glow term).
- **Few kinds, so few lights.** Earth's three quarters is the open ocean's whole fauna. Tethys's deep is a founder fauna with a handful of residents
  (§4's candidates are most of them). At 94 origins, one or two luminous kinds per clade is believable; three quarters of the roster is not required.
- **The light needs oxygen; the minimum has enough.** Earth's vampire squid and lanternfish glow in their oxygen minimum; DEEP's core at 0.3 is no bar.
- **The look, derived from the strikes and the style:** a photophore is a **flat face of the body's own geometry**, square-edged, on the clade's
  language (a box's face on a hingeshell, a lathe ring's band on a slowblood, a sphere's facet on a ringmouth), blue (0.30, 0.62, 1.0) in the water,
  greener on the floor, never a halo or a point; a cloud is a volume (the milky sea's veil, or low-poly blobs).

**Mock-ups (16 Nov 2026, headless, low tier; not committed):** at −516 m at midnight, in the page only — a real pall with a ring of 12 flat blue squares
on its mantle and one at each of 8 arm tips reads at once as *something with eight arms* where the unlit pall is a silhouette only in the own light;
a stone with a dark stalk and one green square at its tip reads as a lure and lights its own plates; the pall's cloud as three additive icosahedra
reads as a glowing lump, not particles. The own light lights the stone too, which muddies "the lure lights its owner" up close.

## 4. Options

Each is derived from Earth's reason and placed by the fields (DEEP's oxygen minimum, the deep gardens, the basins). Ranked in §5.

**A. Photophore patterns — the deep read by its constellations.** *Earth:* lanternfish and dragonfish patterns, species by species; a pattern lit as a
flash when touched, or held dim for kin. *Here:* each luminous kind a pattern of flat faces, so a kind is known in the dark at a distance by its
lights, as eyes show intent by day (PLANET's cross-clade rule, one level up). *Who:* the pall (a ring on the mantle's rim, a spot at each arm tip —
the vampire squid's own layout), the veil (its eye ring's sockets edged), the sifter schools (rows on the flaps: Earth's krill are luminous) — a
school a moving constellation. *Gameplay:* at night and below the light you see who is there before you see them: the pall's ring (harmless), a
hunter's pattern (leave). *Kits:* the creatures' tinted material (an emissive flag per vertex, no new draw), `skC`'s colours. *Cost:* GPU fill only;
nothing per frame on the CPU but a per-kind on/off.

**B. The lure — a creature that simply glows because the glow feeds it.** *Earth:* the anglerfish's esca (bacteria), the dragonfish's barbel,
*Stauroteuthis*'s suckers; all sit-and-wait and low-metabolism. *Here:* the slowbloods already carry barbels (PLANET, Slowbloods: "barbels") and torpor;
a plateback of the oxygen minimum's floor (−500 to −800, `oxy` ~0.3, the picker's and the swarms' ground) with a barbel ending in a bacterial bulb —
the stone's deep cousin, or the stone itself carried down. The light pays: what comes to it is eaten. *Gameplay:* the clearest of all: a light in the
dark is a choice — food is gathering at it (the swarms, sifters, pickers drawn in), and so is something waiting. The player is prey-sized for a big
one. *Needs:* prey drawn to a light within a range (`findCarcass`'s `× (1 + 1.5·glow)` turned round), and the "never a lamp" revision (§6). *Kits:*
`BACT`'s light-pool source (`BACT_L`, two nearest), `skC`'s green (0.35, 1.0, 0.72), the bacteria's quorum reasoning (PLANKTON §8).

**C. The burglar alarm on a body — the deepbell.** *Earth:* *Atolla*, a dark-red deep coronate jelly, runs a ring of light round its bell when
grabbed, calling whatever hunts its attacker. *Here:* the deepbell (drifters, 4.5 m, dark red, −800 to −220) is already *Atolla*'s shape and colour.
Held by anything — a hunter or the player — its rim's faces light in a running wave for the hold's length, and every hunter that sees it comes for
the holder. *Gameplay:* grabbing a deepbell at night is loud; you watch a hunter's catch call a bigger one. *Kits:* the hold (combat.js), `hitFx`,
the struck `litK` (a lit body seen × (1 + 1.5·lit)) as it was. An event: no lamp.

**D. Decoy clouds — the pall's luminous mucus.** *Earth:* the vampire squid (Robison 2003; PLANET already names it as the pall's precedent).
*Here:* a pall held or struck lights its arm tips (A, as a flash), and if the hold goes on, it leaves a glowing cloud and goes dark; the hunter's
target is the cloud for a few seconds. A deep hingeshell spewing a cloud (Earth's shrimp) is the same rule on another clade. *Gameplay:* hunting at
night in the minimum, the prey you had is a glow you're biting. *Kits:* the soft-arm's ink already breaks a chase (`player.inkT`); the cloud's look as
the milky sea's veil, local, or low-poly additive blobs (the mock-up). The person said no to luminous ink *for the player* for now (16 Nov 2026);
this is the creatures'.

**E. Counter-illumination — the midwater's bellies.** *Earth:* hatchetfish, lanternfish, the bobtail squid under the moon. *Here:* the sifter
schools and the arrows at night under the big moon, their ventral faces lit to the light above (`skyLw`). *Gameplay:* honestly weak — the whole point is
not to be seen: from below a school vanishes against a moonlit surface, from the side the bellies glow faintly. Legible only as an absence.

**F. A light to see by.** *Earth:* the flashlight fish's blinking headlamps (moonless shallow reefs); the dragonfish's red searchlight. *Here:* a
red searchlight on a deep hunter, unseen by its deep prey, would show to a shallow-born player as a red patch moving over the floor — a hunter
looking. It turns on what the player's eye sees (the night eye drains colour toward a rod's blue-grey), which is a question of its own. Speculative.

**G. The gardens flash when brushed.** *Earth:* exactly what Johnsen found on the Bahamas' slopes: sea pens and bamboo corals flashing on contact,
waves of light along the colony. *Here:* PLANET's own hook ("pens and whips flashing when brushed (the sway shader already knows a body is near)"):
the pen, the whip and the thicket on the banks' deep slopes, −150 to −1,100, their faces lighting by vertex as any body passes, a wave up the stalk —
geometry, not points. *Gameplay:* a hunter crossing the garden at night lights it; you see it coming. *Kits:* `GLOW` and the `f.glow` branches kept
for this (CLAUDE.md, "Left alive on purpose"), `DIST_A/DIST_B`. *But:* it is light from motion, which the person binned "with the intention of bringing
it back in once we have other bioluminescent things"; it is not steady, so "no steady glowing plants" does not forbid it.

**Not proposed:** glowing marine snow (Earth's luminous particles are real, but the snow is squares by the person's choice and the wake's sparks were
already mistaken for it); sessile lure-feeders and lanterns (the person, 16 Nov 2026: no lanterns, no steady glowing plants; FLORA.md's `stalk` and
`ltree` exist nowhere); a deep cloud of glowing microbes (Earth has none, §2).

## 5. My ranking

1. **The pall's lights and its cloud (A on one kind, D)** — the smallest change on an existing creature already reasoned from the vampire squid,
   all events (a flash on contact, a cloud when held), so only the emissive clause needs revising. Tests the look in play.
2. **The lure (B)** — the most gameplay and the person's "creature that simply glows" done honestly. Needs the attraction and the lamp revision.
3. **The deepbell's alarm (C)** — an event, the kit mostly exists.
4. **Patterns on the midwater (A wide)** — the sifter schools as constellations; after 1 shows whether flat faces read at a distance.
5. **The gardens (G)** — only if the person wants motion-lit light back on these terms.
6. E and F last or never.

What I'd push back on: "a creature that simply glows" as a steady light with no use is the rare case on Earth for a reason — it is a beacon. If it
glows steadily it should be B.

## 6. The rules this touches — the person's call

**PLANET, Cross-clade rules** — now: "No eye glows … Eyeshine is a reflection … No emissive material on any creature." **Proposed:** "No eye glows
(eyeshine is a reflection). A creature makes light only from organs whose use can be named — a lure that feeds it, a pattern its own kind reads, a flash
or a cloud that saves it, a belly matched to the light above — drawn as the organ's own flat faces, never a halo round the animal. Nothing glows for
nothing."

**PLANET, Hooks** — now: "it may return only as *events* … Never a lamp." **Proposed:** "Never a lamp without a payoff to its owner." The v10.1 reason
("constant lanterns feed nothing and attract everything") stands for a sessile lantern; a lure is a lamp whose attraction is the point, which is why
Earth's are on predators.

**PLANET, The planet, Light** — now: "Below −200 vision is useless and hunting is by vibration, chemistry and electroreception." **Earth says
otherwise:** sunlight serves an eye to ~1,000 m, and below it and at night the deep's eyes are for bioluminescence (most deep fish see one blue,
tuned to it). **Proposed:** "Sunlight serves an eye to ~1,000 m on Earth; below the light and at night, eyes are for other animals' light. Vibration,
chemistry and electroreception still matter where nothing glows." (The game's own daylight curve is the readability's, and unchanged.)

## 7. Open — the person's

1. ~~**The emissive clause** (§6)~~ — **answered 17 Nov 2026: revised as proposed** ("Yes, revise that. That's fine, old rules existed for old
   reasons sometimes"); PLANET's cross-clade rules.
2. ~~**"Never a lamp"** (§6)~~ — **answered 17 Nov 2026: yes, a lure may glow steadily**; PLANET's Hooks.
3. ~~**"Below −200 vision is useless"** (§6)~~ — **answered 17 Nov 2026: revise it** ("This is a big one, we should definitely revise it and make it
   appropriate given Earth and the conditions of Tethys' star"); PLANET's Light bullet, with the star's share worked out (~14% fewer photons in the
   blue window than the Sun's at the same total light: every limit 4–7 m shallower — the water decides).
4. ~~**Which options, in what order**~~ — **answered 17 Nov 2026: start with the pall** ("sure, start there"); §8.
5. ~~**The look**~~ — **answered 17 Nov 2026** ("Your creature pics are good"): flat square faces as in the mock-ups.
6. **Sight by light:** a minimal term so creatures see lights (and lit bodies) further at night and below the light — or the player's eyes only, for now.
7. **The gardens (G):** do touch flashes on the deep gardens count as the binned "bioluminescence purely as a function of moving"?
8. **The kits:** keep the wake's (`FLASH`, `skBody`, `sparkBurst`) and the displays' (`DSP`) code, or strike them now the rethink is written down.
9. ~~**The deep by day**~~ — **answered 17 Nov 2026: dark, the eye adapting** (built v11.170, world.js `DEEP`): the deep's lights read by day below the twilight zone.
   Since the Light bullet's revision (17 Nov 2026) the floor is a listed conflict in PLANET.
10. **The pall's size by depth** (§8): a cline by oxygen (smaller in the core's worst water), a larger deep form below the core, or neither.
11. **The lure's payoff** (§8): the pall eats the swarms its lit net takes, on paper and in play — or the light stays the net's with no meal modelled.

## 8. The pall, first (17 Nov 2026)

**The person:** "Your creature pics are good. Though some palls are above the bioluminescence threshold so we need a variant that is maybe even larger
due to gigantism down there. or smaller due to low food, who knows. but I'd imagine glowing palls too high up would not be adaptive. I don't know
though. Open to your thoughts."

**Is there a depth above which a glow does not pay?** Not on Earth as a rule: the luminous share is the same at every depth (§2), and the twilight zone
(200–1,000 m) is where photophores are most elaborate; the vampire squid lives at 600–900 m. What the light changes is which use pays: a flash on
contact and a cloud work wherever it is dark round the animal; a steady lure pays more the darker the water. **And no pall is in the light:** palls
spawn and wander only in the oxygen minimum's core, −500 to −800 (world.js `OXY.core`; creatures_ai.js), over fed water, where by the revised Light
bullet noon is ~10⁻⁸ of the surface's light at −500 and ~10⁻¹² at −700 — starlight and darker — and the night is black. The intuition still holds at the
top of their range, so it is built as behaviour, not a variant: **the pall dims its web where daylight still reaches a deep eye** (by day dim above ~−550,
full by −600) and lights it below that and at any depth at night (fx.js `PHO.dark`, on world.js `lightPhys`). Earth's animals govern their
light (the bobtail squid follows the moon), so a depth form is not needed for it. Earth's twilight lure-bearers (dragonfish at 200–1,000 m by day) do
not all do this; the gate is the person's intuition made physical, and its two numbers are the knob.

**Size by depth — my view, the person's call (§7.10).** What Earth shows setting size in deep, cold water is oxygen: amphipods' maximum size tracks
the oxygen available (Chapelle & Peck 1999). The same reasoning makes animals *smaller* in an oxygen minimum, not larger (a prediction I could not find
tested on minimum-dwellers; the vampire squid is ~30 cm), and low food in the core points the same way. Gigantism belongs below the minimum, where the
water is colder and its oxygen recovers (0.3 → 0.5 by the floor). So if palls vary with depth, the core's are the smaller and any larger form lives
under the core (−800 to −1,100), where today there are none. Not built.

**What v11.163 builds** (the rules as revised 17 Nov 2026):
- **The lights**, flat faces on the pall's own arms, riding their chains: three along each web arm (*Stauroteuthis*'s light organs, which replaced its
  suckers: the net's steady lure) and one at each tip (the vampire squid's arm tips, lit on contact). Blue (0.30, 0.62, 1.0), drawn additive with the
  water's extinction and the eye, as the glows are.
- **Steady while it fishes in the dark**, by the gate above.
- **A flash on contact**: the tips flare and the web brightens for a second or two (the player touching it).
- **The cloud**: held for half a second, or bitten, the pall leaves a luminous cloud where its arms were (low-poly blobs, as the mock-up), goes dark for
  90 s and heads away from what held it (Robison 2003: the cloud takes a much stronger stimulus than the tips).
- **Not built, the person's (§7.11): the lure's payoff in the ecology.** The pall eats nothing today, on paper or in play (no prey, no sieve: "a net for
  catching in the dark", PLANKTON §11). *Stauroteuthis* catches copepods in its lit web; here that is the swarms, which shelter in the core by day
  (DEEP §2). Making the pall a swarm-eater ties its numbers to theirs (the census) and gives the lit net something to draw.

## Sources

- Martini & Haddock 2017, *Sci Rep* 7:45750 — [MBARI](https://www.mbari.org/?p=86796), [ScienceDaily](https://sciencedaily.com/releases/2017/04/170410154751.htm)
- Johnsen, Frank, Haddock, Widder & Messing 2012, *J Exp Biol* 215:3335 — [NSU record](https://nsuworks.nova.edu/occ_facarticles/84)
- Haddock, Moline & Case 2010, *Annu Rev Mar Sci* 2:443 — [PDF](https://www.mare-incognitum.no/files/downloads_mnight/curriculum%20ab334%202014/Haddock%20et%20al%202010.pdf), [UCSB functions](https://biolum.eemb.ucsb.edu/functions.html)
- Lau & Oakley 2021, *Biol Rev*, ≥94 origins — [record](https://zendy.io/title/10.1111/brv.12672)
- Robison, Reisenbichler, Hunt & Haddock 2003, *Biol Bull* 205:102 (vampire squid) — [PDF](https://archive.org/download/biostor-11184/biostor-11184.pdf)
- Osborn et al. 2009, *Science* (*Swima*) — [Scripps](https://scripps.ucsd.edu/news/scientists-discover-bioluminescent-green-bombers-deep-sea)
- Johnsen, Balser & Widder 1999, *Nature* (*Stauroteuthis*) — [record](https://ideas.repec.org/a/nat/nature/v398y1999i6723d10.1038_18131.html)
- Baker et al. 2019, *eLife* (anglerfish symbionts) — [eLife](https://elifesciences.org/articles/47606)
- Douglas et al. 1998, *Nature* (*Malacosteus*) — [Springer](https://link.springer.com/article/10.1038/30871), [UCSB](https://biolum.eemb.ucsb.edu/pdf/dragon.pdf)
- Widder's e-jelly and the giant squid, 2019 — [National Geographic](https://www.nationalgeographic.com/animals/article/giant-squid-us-waters-first-video)
- Hellinger et al. 2017, *PLoS ONE* (flashlight fish) — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5298212)
- Jones & Nishiguchi 2004, *Mar Biol* (bobtail squid) — [Springer](https://link.springer.com/doi/10.1007/s00227-003-1285-3)
- Davis et al. 2014 (lanternfish patterns and speciation) — [phys.org](https://phys.org/news/2014-03-distinctive-patterns-fish.pdf)
- Zarubin, Belkin, Ionescu & Genin 2012, *PNAS* — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3271926)
- Miller et al. 2005, *PNAS* (milky sea from orbit) — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC1242338); Miller 2021 — [The Conversation](https://theconversation.com/scientists-are-using-new-satellite-tech-to-find-glow-in-the-dark-milky-seas-of-maritime-lore-166542)
- Dinoflagellates — [UCSB red tide](https://biolum.eemb.ucsb.edu/organism/redtide.html), [Smithsonian](https://www.ocean.si.edu/node/107163)
- The twilight zone and the last sunlight — [NOAA Ocean Exploration](https://oceanexplorer.noaa.gov/?p=5645)
- Chapelle & Peck 1999, *Nature* 399:114 (size and oxygen) — [record](https://ideas.repec.org/a/nat/nature/v399y1999i6732d10.1038_20099.html)
- Widder with the lights off — [Discover](https://www.discovermagazine.com/splendor-in-the-dark-15488); sea pens' pulses — [Discover](https://www.discovermagazine.com/deep-sea-census-finds-glow-in-the-dark-bonanza-4632)
