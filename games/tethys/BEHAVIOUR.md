# BEHAVIOUR.md — what the animals do

**Status (24 Nov 2026): pass 0 built (v11.228): the clock, the risk and the look; the player's bias struck; the bugs §6 lists fixed. Pass 1 built
(v11.229): the senses (§3b); the sky and the pall's lights in the step. The ringmouths' pass built (v11.230, §3c): the plumb's night, the quill's
stand, the arrows' pack and ink, the lurker's giving-up, the great a hunter.** The person on v11.228: *"I play tested and enjoyed it, go ahead with pass 1."*
On v11.229 (24 Nov 2026): *"go ahead with the ringmouths pass and the plumb."* Next, the slowbloods (§4). Downstream of `PLANET.md` (each clade's deep decision is where its behaviour comes from), `CLADES.md`
(habitat at three scales: the range, the station, the clock), `COMBAT.md` (what a hold means; pass D is the person's predator pass) and `DIRECTION.md`
(the loop). The numbers live in `creatures_defs.js` (`BEHAVE`, `EYE_K`, `LAT_CLADE`) and `creatures_ai.js` (`CLK`, `REST`, `RISK`, `SENSE`, `SCENT`, `FREEZE`);
`DESIGN.md`, Creatures, has them.

## 1. The ask, and the person's answers

The person (24 Nov 2026): *"a widespread animal behavior overhaul, going clade by clade, role by role… Have creatures like the new hovering plumb
actually move, have a schedule, do things… Have animals that are predatory be more complex than simply aggroing when hungry (which works, but makes me
wonder if there are other mechanisms)… Make animals within the ecology distinct based on behavior."*

What there was (v11.227): eleven roles, dispatched in `updateCreatures`. Fifteen kinds shared the `hunter` role and differed only in numbers: past
`ECO.hungry` (0.4) it cast at 4× `detect` for prey, chased within `detect`, struck. Senses were one sphere, the same in every direction, regardless of
light (blood at 90 m and a glowing carcass the exceptions). Only the schools and the grazers had fear; an arrow, a needle, a hose or an eel is prey and
fled nothing. Only the swarm and the plumb's depth read the time of day; nothing rested. `findPrey` took the player at 0.7 of its distance.

The plan proposed and the person's answers (24 Nov 2026):

1. **The order: the parts every animal shares first, then a clade at a time.** — *"That's a fine order. Clock and risk first."*
2. **The player bias** (`findPrey`'s 0.7; PLANET: *"hunt the player because the player is prey-sized, not because it is the player"*). — *"Let's remove
   the bias for now."*
3. **Sight by light, for the creatures too** (BIOLUM §7.6). — *"Yes."* (Pass 1.)
4. **Readable predators**: some circle and inspect before they commit, so the player can see it coming and facing them or bolting decides it. —
   *"Yes absolutely."*

The rule over all of it is CLADES Open 1's (23 Nov 2026): *"If we do it right, it will all work just based off believable logic and physics."* Every
behaviour names its physical or biological reason; Earth is the reference for what works, never the template.

## 2. The clock (built v11.228)

The sim's own sun (`clockTick`, once a step from `clockH`; never `SKY`, which the drawing sets once a frame): `CK.day`, `CK.night` and `CK.dusk` sum to
one — the day from the sun on the horizon to full at ~11° up, the night full ~14° under it and gone ~3° under, dusk the changeover between (~2.6 game
hours, about three and a half real minutes, at each end of the day). `CK.hi` is the tide's height, low water 0 to high 1.

A kind's hours are `BEHAVE[kind].act`: `[day, night, dusk]` weights, blended by `CK`, and an optional fourth, the tide (+1 about only at high water, −1
only at low). A kind with none is about at every hour: below the light (the abyssal, the basker at its dark vents, the pall, the picker, the relict),
following its food (the filter feeders, the ram on the sifters, the sifters and the swarms), or with no brain to keep hours (the drifters).

| | the day | the night | dusk | rest | Earth's reference |
|---|---|---|---|---|---|
| arrow | 0.15 | 0.9 | 1 | hover | the squid: hover by day, hunt at dusk and through the night |
| ortho | 0.3 | 0.8 | 1 | hover | the slope's spear, about at dusk and in the dark |
| great | 0.8 | 0.3 | 0.6 | hover | |
| plumb | 0.4 | 1 | 1 | its post | the layer it eats comes up to it at night (the nautilus's commute) |
| quill | 1 | 0.3 | 0.6 | its post | the shrimpfish feeds by day among the spines |
| lurker | 0.3 | 1 | 0.8 | its post | the octopus |
| watcher | 1 | 0.15 | 0.6 | cover | |
| rasp | 0.3 | 1 | 0.7 | cover | the limpet, the chiton: grazes the rock at night, clamped to it by day |
| darter | 1 | 0.1 | 0.5 | the school settles | a planktivore's school |
| needle | 0.6 | 0.1 | 1 | hover | the trumpetfish: dawn and dusk |
| grazer | 1 | 0.1 | 0.4 | floor | the herbivores' day shift; the herd lies down at night |
| ridge | 0.35 | 0.6 | 1 | slow | the jack, the grouper: the changeover's hunter; a mixotherm that never stops |
| eel | 0.15 | 1 | 0.8 | cover | the moray |
| crusher | 1 | 0.15 | 0.6 | cover | the triggerfish, the wrasse |
| scuttle | 0.2 | 1 | 0.6 | bury | the ghost crab |
| trap, hook | 0.4 | 1 | 0.8 | their posts | |
| flicker | 0.2 | 1 | 0.7 | the school settles | the demersal plankton that rises out of the weed at night |
| hose | 0.2 | 1 | 0.8 | cover | after the flickers |
| sickle | 0.3 | 0.7 | 1 | cover | |
| hood | 1 | 0.2 | 0.6 | floor | |
| lash | 0.3 | 1 | 0.8 | cover | |
| wedge | tide: +1 | | | cover | the surf zone's walker: about with the water over it, clamped at low tide |
| plough | 0.3 | 1 | 0.6 | bury | |

What the hours do (`awakeOf` → `c.awake`, read at each scan):

- **The hunt's threshold.** A hunter hunts past `huntAt(c)` = `ECO.hungry` + `REST.k` × (1 − awake): 0.4 in its hours, 0.85 at none of them. Hunger
  gets it up, so a starving night hunter hunts at noon. A trap's reflex threshold rises by half as much; an ambusher out of its hours looks only
  `REST.see` (0.35) of its radius.
- **Rest** (`restBegin`, `restStep`), under `REST.on` (0.35), up again over `REST.off` (0.5): *cover* — against a rock, a stalk or a structure's foot
  within `REST.r` (24 m; `coverSpot`, the moult's `hideSpot` test), the open floor where there is none; *floor* — lying where it is; *bury* — sunk to
  `REST.bury` (0.3) of its clearance (`c.sink`, read by the floor clamp); *hover* — held in the water at `REST.lift` + its size over the floor;
  *slow* — cruising on at `REST.slow` (0.45) of its cruise. One lying on the floor holds against the current, as one sitting does. A resting hunter takes
  only an easy meal that comes within `REST.see` of its detect (the moray bites the hand put in its hole); a resting grazer still flees.
- **The schools** settle out of their hours: their marks 0.8–2.5 m over the floor within 12 m of home, the members at `REST.school` (0.45) of their speed.

Not yet: the tide's other uses (the lee swinging round a pinnacle twice a day, CLADES; low tide stranding prey for the walkers, DIRECTION), the year (the
filter giant with the bloom, PLANKTON §6), the moon (a bright night is an emptier one for the visual hunters: pass 1), the temperature model that should
move the slowbloods' hours (PLANET Hooks; decided 12 Sep 2026).

## 3. The risk and the look (built v11.228)

**The risk** (`riskOf`, 0..1): the prey's mass as a share of the hunter's, from `RISK.m` 0.08 (nothing) to 1 (whole) — `RISK.unarmed` (0.6) of it for a
body with no bite; `RISK.sting` (0.3) more for one with venom; × (1 + `RISK.hurt` × its own blood lost over `BLOOD.weak`) for a hunter already bleeding;
`RISK.weak` (0.7) of it off for a failing body (bleeding, soft, stunned, paralysed), half that for a young one or one held. **The need** (`needOf`) is the
hunger past the threshold as a share of the way on to starving. A hunter goes for prey only while need ≥ `RISK.k` (0.9) × risk, never asking more than
`RISK.cap` (0.95) — a starving animal takes anything it eats — and among what it dares takes the nearest by distance × (1 + risk). So a hook (1.1 t)
leaves a finback (1.8 t) until it is nearly starving and takes darters meanwhile; an ortho leaves a grazer (its bulk, its sting) until it is hungry; a
ridge (45 t) weighs a finback at nothing.

**The look** (the person's "readable predators"): prey that is watching the hunter — the player facing it (within 60°), a school or a grazer whose
threat it is — is not taken head on by a hunter that reads it (`BEHAVE.insp`), unless it is a mouthful (under `RISK.tiny` of the hunter's mass), failing,
or the hunter's need is past `RISK.reckless` (0.85). Instead:

- **a slowblood circles** (`'circle'`: the ridge, the needle, the crusher, the basker, the abyssal) — the shark at the seal: round it at `RISK.pace` of its
  speed, the ring closing from 2.4 × size + 2 m to 1.3 × size + 1 m as the look runs on (a hungrier one starts closer), a little under it;
- **a ringmouth holds off facing it** (`'stand'`: the arrow, the ortho; the eel, which watches from its post rather than circling) — at its standoff
  (1.8 → 1.15 × size), sliding round, the ring's eyes on it, as the watcher stands;
- **a hingeshell never looks** — no pursuit, and nothing to read between its strikes (PLANET). Nor do the ambushers.

The prey's answer decides it (`inspectStep`). **Running** (moving away at `RISK.run`, 2.5 m/s) is chased — bolting is what a chase is for. **A back
turned** for `RISK.back` (0.7 s) is the opening. **Coming at it while watching it** (`RISK.close`, 0.6 m/s) drives it off after `RISK.deter` (3 s) ×
(0.5 + need) — a watch alone counts a quarter — and it leaves for `RISK.cool` (20 s), swimming `RISK.away` (40 m) off. The look lasts `RISK.insp`
(4 s, and up to 10 s more the less it needs); at its end it goes in if its need is `RISK.commit` (0.5) or more, else it leaves. The player's lesson:
face it, and back off toward cover; never bolt from what is circling unless the cover is close.

## 3b. The senses (built v11.229)

An animal notices another (`notices`) by its eyes or its lateral line, and smells blood and carrion down the current. The player is a body like any
other to all three: what it does decides — swimming in the open at noon is seen from a predator's whole reach, holding still in the weed at night is
hiding, bleeding upstream of a hunter is safer than bleeding downstream of it.

- **The sky in the step** (`clockTick`): the moon's height and phase, the eclipses (a total eclipse of the sun is an evening: the day goes, the night
  has not come — dusk), `CK.dayK` and `CK.moonL` (the swarms' layer and the plumb's station read them now, not the drawing's `SKY`), and `CK.lg0`: the
  surface's light, log10 of noon's, by world.js `LIGHT_P` (the sun, the twilight falling 0.35 decades a degree, a full moon 1e-5, starlight 1e-8).
- **Sight** (`sightOf`, 0..1 of the reach asked): the light at the body looked at — `CK.lg0` falling tenfold every 60 m (`LIGHT_P.dec`, the island's fed
  water) — through the eye's two numbers (`DEFS.eye`, `EYE_K`: where it sees nothing, where it sees all it can, log10 of the light):

  | eye | nothing | all | whose | |
  |---|---|---|---|---|
  | `ring` | −10.5 | −5.5 | the ringmouths | a ring of simple eyes, a predator's forward cluster: a cephalopod's eyes are among the best in the dim |
  | `two` | −10 | −6 | the slowbloods | two good eyes, a fish's |
  | `stalk` | −9 | −5 | the hingeshells | stalked compound eyes, duller in the dim |
  | `night` | −11 | −7 | the eel, the lurker, the arrow, the hose, the lash, the trap, the hook | wide pupils and a tapetum (PLANET's eyeshine is its reflection) |
  | `deep` | −12 | −8 | the abyssal, the basker, the relict, the picker, the pall, the veil | tuned to the deep's own lights |

  PLANET's numbers fall out: noon's light reaches −6 at −360 m and −10 at −600 (big eyes see daylight to ~−600 in fed water), a full moon −6 at −60;
  starlight at −55 gives a fish's eyes 0.45 of their reach. Above the eye a body is a silhouette (`SENSE.sil` 1.5 decades × the sine of its height over
  it); a still body is seen at `SENSE.still` 0.35 of the reach plus `SENSE.big` 0.08 a metre of its size (motion gives the small away; an 18 m ridge
  still is seen whole), a moving one at all of it from `SENSE.move` 1.5 m/s; a body that matches its ground (`c.crypt`: 0.25 for the countershaded
  type, + 0.5 × its morph's favour at its place, read at its spawn — VARIETY's selection by the hunters now does what it was for) or is buried takes
  `SENSE.crypt` 0.6 of that off; one in the weed (`coverOf`: the canopy station's envelope, where the kelp stands from the floor to the surface) 0.5.
  The drifters have no eyes.
- **The lateral line** (`hearOf`, m): `DEFS.lat` × the hearer's size (`LAT_CLADE`: the slowbloods' canals 2.0, the hingeshells' comb 1.6, the
  ringmouths' epidermal lines 1.3; the eel 2.6) for a body moving at `SENSE.lat` 1.5 m/s or more, nothing under 0.2, × the square root of the felt
  body's size over the hearer's (0.4–1.6). Light-blind; a still body is silent (DIRECTION: *"a lateral line makes a still hunter invisible and a moving
  one loud"*). In the dark at −55 a ridge feels a swimming finback within 8 m and sees it within 21.
- **Scent down the current** (`scentFrom`, `plumeK`; COMBAT §10.6, *"downcurrent is the true direction of a scent"*): blood (combat.js `findBleeding`)
  and carrion (`findCarcass`) are smelt from `SCENT.down` 1.6 × their reach by a nose downstream of them and `SCENT.up` 0.2 × upstream, as the current
  runs to `SCENT.v` 0.25 m/s; in still water as before. A clutch is smelt as it was (from half the distance, the current aside).
- **Prey** notice with the same senses: a school's threat is a hunter of its kind it notices within 14 m (its members' eyes and lines), a grazer's the
  player within 8, a big predator within 18, its own within 7. At night a school sees its hunter late; a resting one feels it only when it moves close.
- **Freezing** (`DEFS.freeze`, `FREEZE.bolt` 3 m): the cryptic grazers — the rasp, the scuttle, the wedge, the plough, the cinder — hold still at a
  threat they notice beyond 3 m and their size (buried ones stay under; a hingeshell clamps its valves: the anim's `st.soft`, PLANET's *"clamped shut
  when threatened"*), and bolt when it comes closer. Still, they are seen late.
- **The watcher** is curious about the player it notices.

Not built (left for the clade passes): the player's own crypsis (its coat against the ground: `c.crypt` is the world's animals'); a lit body seen further
(a lure's draw on prey: BIOLUM §7.11); prey seeking cover as it flees; a flight distance by kind beyond the three ranges; hearing.

## 3c. The ringmouths (built v11.230)

PLANET's ringmouths are *"fast, clever, short-lived … packs … intelligence and manipulation"*, a ring of eyes for motion, the jetters' ink. The pass:

- **The plumb's night** (`updatePlumb`, `PLUMB`; the person's first ask, 24 Nov 2026: *"have creatures like the new hovering plumb actually move, have a
  schedule, do things"*). The nautilus is the reference: it rests deep on the reef's slope by day, climbs the wall at night to forage — mostly by smell, for
  carrion — and sinks back at dawn. A plumb hangs at its wall station and ambushes there (v11.223), climbing with the layer at dusk; hungry at night,
  after `PLUMB.wait` 15 s with nothing under it, it leaves the wall to forage (`'forage'`): legs at `PLUMB.jet` 0.8 m/s to points within `PLUMB.range`
  90 m of its station, at the layer's depth over the floor there, leaning into its way, dropping on what passes under it as at its post. It smells
  carrion down the current from `DEFS.scav` 150 m (`findCarcass`'s plume, §3b) and goes up the scent to eat at it (`'feed'`: its arms reach
  `PLUMB.reach` 3 m down past its clearance, `plumbFeedR`) — never under its shell's floor. Fed (`PLUMB.full` 0.15) or at the dawn it goes home to its
  wall. **The trim** (CLADES, The hanger: *"pump bore ∝ L², gas ∝ L³ … a giant stays at one depth"*): a plumb follows the layer's climb by its size
  factor (`trimOf`: all of it to `PLUMB.trim` 1.2, none from 1.45), and climbs at `HANG.rise` over that factor — the young and the typical rise every
  night, the oldest few (30 m and more) hang at their day depth. Not built: neighbours spacing on a wall, the tide swinging them round a pinnacle.
- **The quill's stand** (`phaseOf`, `QUILL`): a stand sways and drifts as one (its phase the stand's `STAND` 6 m square's, not each animal's); when
  one notices the player within `QUILL.alarm` 8 m or a hunter of 4 m or more within 12, it and its standmates within `QUILL.stand` 4 m slip down into
  the stalks, under their band, and hold still, hunting nothing, for `QUILL.hide` 20 s. Among the stalks the player is covered: a quill sees it there
  within about 4 m (§3b).
- **The arrows' pack** (`packCall`, `flankPt`, `PACK`): when one takes on prey, its idle packmates within `PACK.r` 30 m (past hunger `PACK.join` 0.2)
  join it on the same prey, and in the chase each comes in from its own side — half the pack left of the line to the prey, half right, by up to
  `PACK.flank` 9 m, straight in from `PACK.close` 6 m: a school pressed from two sides has nowhere to turn. **The ink** (`inkEscape`, `INK`): an arrow
  inks when a hunter chasing it closes within `INK.near` 5 m, or when it is taken hold of and lives (a jaw's first bite takes a small one outright),
  once in `INK.cool` 25 s: its cloud hides it from every eye for `INK.hide` 6 s, its chaser loses it with a chance of `INK.slip` 0.6 and leaves it for
  `INK.lose` 4 s, and it jets off from what came at it.
- **The lurker gives up a post that does not pay** (`LURK`): hungry in its hours, `LURK.give` 90 s at its post with nothing taken, it crawls to another
  among the rock within 24 m (`coverSpot`) — Earth's sit-and-wait hunters' giving-up time (the marginal value theorem). The hook keeps its place up in the
  structure.
- **The great hunts** (`DEFS.great`: role `hunter`, prey the player, the grazer, the eel, the lurker, the plough — the shelf's bodies of a tonne and
  more; a ringmouth's look, `insp` `stand`): its ram is its bite's opening blow (`landBite`: the prey stunned, then the beak). To v11.229 it was a
  `coil` that rammed the player and ate nothing; the role is struck. Its forward capsule ended 1.3 m into its arms, so a prey's body was held 1.6–2.5 m
  off its beak at contact; it ends at the beak now (`SPECS.great`), the arms before it their own chains. The crusher is not its prey: its plates kept
  the beak a metre off even so.

Not built in the pass: reputation (DIRECTION: *"some species remember"*); the watcher watching other animals; the pall's lure's meal (BIOLUM §7.11, the
person's); the ortho's spear as a jet; the plumb's demigods (LINEAGE §7c.6).

## 4. The plan (the passes)

0. **The clock and the risk** — built v11.228 (§2, §3, §6).
1. **The senses** — built v11.229 (§3b), but for what §3b leaves (the bucketing was not needed: §7). As planned: (PLANET Hooks "detection modes"; DIRECTION "senses per clade"; BIOLUM §7.6, answered yes): sight by the light at the animal's depth
   and hour (`lightPhys`, the moon), by the target's motion and by its contrast against its ground (the morphs' place: a dark one on dark rock is seen
   late — VARIETY's favour then has a gameplay reason); the lateral line, short and light-blind, loud for a moving body and silent for a still one;
   scent carried downstream (`currentAt`), for blood and carrion (COMBAT §10.6, pass D). Prey with the same senses: a flight distance per kind, freezing
   for the cryptic, cover. The pall's lights moved into the step (§6). A cell's creatures bucketed for the scans (§7, the cost).
2. **Ringmouths** — built v11.230 (§3c), but for what §3c leaves. As planned: the plumb's night (off its wall into the risen layer to hunt, scavenging by smell up a carcass's scent, back to the wall at dawn; the
   old giants too heavy to follow the layer — CLADES' trim physics — so age changes what a plumb does; neighbours spacing on a wall; the tide swinging
   them round a pinnacle); the arrows as a pack (flanking a school, inking when held); the quill's stand moving as one and slipping into the stalks; the
   great a hunter; the lurker leaving an ambush that does not pay. Reputation as part of intelligence (DIRECTION, decided 12 Sep 2026: "some species
   remember"), if wanted, as a wariness a cell's kind keeps — VARIETY forbids the ledger remembering an individual.
3. **Slowbloods**: the temperature model (the basker basking, sluggish if it strays; the stone torpid; the ridge's mixothermy); the grazers a herd whose
   alarm spreads; the abyssal's forays below the light; the chase paid from stamina (COMBAT §11 pass 4: *"hunters may outrun you in a short burst"*).
4. **Hingeshells**: the valves clamped at a threat and breathing at rest; the dens; the moult's cue (LINEAGE §12.34); the hook climbing and dropping from
   above; the scuttles on the strand at low tide; the strike as the clade's only hunt.
5. **Drifters**: eating what they sting; stranding; what eats them (DRIFTERS' open list).
6. **Between kinds**, where Earth backs it: needles shadowing the ram for the shoal it stuns (the jacks with the moray); scavengers queuing at a carcass
   by size; bite-and-wait on dangerous prey and "the return" (COMBAT pass D, the person's).

## 5. What the docs ask for that is not built (the sweep of 24 Nov 2026)

Behaviour the docs propose, defer or leave as a hook, checked against the code (beyond §4's): the lip, edge, open and crevice stations (CLADES; three of
seven built); the hingeshells' dens and brood guarding by the world's animals (`broodGuarded` is the player's line's alone); the den as a base
(DIRECTION); world animals' courtship and their clutches (the ledger lays them where births are owed); the jetters' pupils tracking `face` (CLADES);
the lurker's and hook's `below` (the hook should drop from above); "juveniles are soft" (PLANET); the drifters eating and dying (outside the ledger);
the deep scavenger of the falls (DIRECTION's Bathynomus niche); the comb's migration and a migration term in the ledger (PLANKTON §14); events by
physics (a moult season, low tide stranding prey, storms beaching sailer fleets); creature voices (AUDIO: the `voice` hook unused); COMBAT §11 passes 2–4
(the petals' timing, latching, the chase from stamina); the derived DEFS (LINEAGE §8.2: role, prey and diet off the build). The sparkle's gods and
demigods (LINEAGE §7c) wait for more passes over the ordinary ecology (the person: *"we will probably do another pass over the regular ecology a few
times before building this"*).

## 6. Fixed in pass 0

- **The player's bias** struck (§1, 2).
- **The crusher's carrion**: its `scav` 40 was dead — `scavenge` ran in the graze and watch roles only. A hunter with `scav` eats at a carcass between
  hunts when past `ECO.hungry`.
- **The arrow's jet pose**: `jetter` was the player's line's alone; the arrow row carries it (mantle-first in the chase, PLANET).
- **A wounded hunter fled the player** whatever hurt it; it flees what wounded it (`c.dread`: the biter at a lost part, `lastWounder` at the blood).
- **A carcass's glow** for the scavengers was the drawing's (`c.glow`, set once a frame and zeroed by the effects list's switch); `findCarcass` reads
  the sim's own (`carcGlow`, the same law).

Fixed in pass 1 (v11.229): **the pall's lights ran in the drawing** (fx.js `updatePho`, on the frame's `dt`, and `phoCloud` returned when the effects
list had bioluminescence off — a cosmetic switch took away the pall's flee): the hold, the cloud, the dark and the flee are the step's now (`phoStep`),
the drawing makes the cloud's blobs for each the step queues (`PHO_Q`). **The plumb's layer and the swarms read `SKY`**, the drawing's sky: they read
`CK.dayK` and `CK.moonL`.

## 7. Rules a behaviour change keeps

- The fixed step: every choice and timer from `SIMR`; nothing the drawing sets is read by a step (test/step.js, test/simrand.js).
- One shape: a key a creature takes is in spawn's literal and the `Creature` typedef (v11.228: `awake`, `sink`, `inspT`, `deter`, `dread`; v11.229:
  `crypt`, `cov`, `covT`; v11.230: `goal`, `waitT`, `inkT`); a `DEFS` key in `DEF_KEYS` (`act`, `rest`, `insp`, and v11.229's `eye`, `lat`, `freeze`, come from `BEHAVE`, `EYE_K` and
  `LAT_CLADE` before it is made; v11.230's `scav` from `BEHAVE`, `pack`, `ink`); a school's keys in `makeSchool`'s literal (`awake`, `rest`).
- `dropTarget` is the one way out of a pursuit; `kill()`, `removeCreature`, `placeKind` with `ent` for the ledger.
- The paper model (ecology.js) knows nothing of hours, rest, risk or the look: the ledger's rates and the census are unchanged, and only what is seen in
  the loaded cells moves. A pass that changes how often things eat on screen checks `test/live.js`'s starving share.
- The cost (`docs/decisions.md` 26): every scan is throttled (0.25–0.5 s) and allocation-free; `findPrey` walks every creature per scan (about 1,400 at
  the forest). Pass 1's senses ask more of each candidate within the reach and the frame held (v11.229: ×1.00 at the forest), so the creatures are not
  bucketed by cell yet; the next scan that asks more of every creature measures first. `node test/perf.js` before and after.

## 8. Open (the person's)

1. The hours in §2's table are first choices from Earth's reef shifts: any kind whose hours or rest are wrong for it.
2. Whether the shelf by day is now too quiet (most of its hunters keep the night or the dusk), or as it should be.
3. Whether the look reads — the ridge's circle, the ortho's standoff — and whether facing it down is too easy or too hard (`RISK.deter`, `RISK.commit`).
   The person on v11.228 (24 Nov 2026): *"I play tested and enjoyed it."*
4. Whether the night is now the hiding it should be (holding still in the weed; a hunter feeling you only when you move close), or too safe; whether
   the eyes' numbers (§3b) want moving.
5. Whether the player's own colour against its ground should hide it as the world's animals' does (§3b, not built).
