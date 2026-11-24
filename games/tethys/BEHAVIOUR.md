# BEHAVIOUR.md — what the animals do

**Status (24 Nov 2026): pass 0 built (v11.228): the clock, the risk and the look; the player's bias struck; the bugs §6 lists fixed.** The senses
(pass 1) are next, then a pass a clade. Downstream of `PLANET.md` (each clade's deep decision is where its behaviour comes from), `CLADES.md`
(habitat at three scales: the range, the station, the clock), `COMBAT.md` (what a hold means; pass D is the person's predator pass) and `DIRECTION.md`
(the loop). The numbers live in `creatures_defs.js` (`BEHAVE`) and `creatures_ai.js` (`CLK`, `REST`, `RISK`); `DESIGN.md`, Creatures, has them.

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
(3 s, and up to 7 s more the less it needs); at its end it goes in if its need is `RISK.commit` (0.5) or more, else it leaves. The player's lesson:
face it, and back off toward cover; never bolt from what is circling unless the cover is close.

## 4. The plan (the passes)

0. **The clock and the risk** — built v11.228 (§2, §3, §6).
1. **The senses** (PLANET Hooks "detection modes"; DIRECTION "senses per clade"; BIOLUM §7.6, answered yes): sight by the light at the animal's depth
   and hour (`lightPhys`, the moon), by the target's motion and by its contrast against its ground (the morphs' place: a dark one on dark rock is seen
   late — VARIETY's favour then has a gameplay reason); the lateral line, short and light-blind, loud for a moving body and silent for a still one;
   scent carried downstream (`currentAt`), for blood and carrion (COMBAT §10.6, pass D). Prey with the same senses: a flight distance per kind, freezing
   for the cryptic, cover. The pall's lights moved into the step (§6). A cell's creatures bucketed for the scans (§7, the cost).
2. **Ringmouths**: the plumb's night (off its wall into the risen layer to hunt, scavenging by smell up a carcass's scent, back to the wall at dawn; the
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

Open, for pass 1: **the pall's lights run in the drawing** (fx.js `updatePho`, on the frame's `dt`, and `phoCloud` returns when the effects list has
bioluminescence off — so a cosmetic switch takes away the pall's flee). **The plumb's layer and the swarms read `SKY`**, the drawing's sky; they should
read `CK` (or a step's own moon).

## 7. Rules a behaviour change keeps

- The fixed step: every choice and timer from `SIMR`; nothing the drawing sets is read by a step (test/step.js, test/simrand.js).
- One shape: a key a creature takes is in spawn's literal and the `Creature` typedef (v11.228: `awake`, `sink`, `inspT`, `deter`, `dread`); a `DEFS`
  key in `DEF_KEYS` (`act`, `rest`, `insp` come from `BEHAVE` before it is made); a school's keys in `makeSchool`'s literal (`awake`, `rest`).
- `dropTarget` is the one way out of a pursuit; `kill()`, `removeCreature`, `placeKind` with `ent` for the ledger.
- The paper model (ecology.js) knows nothing of hours, rest, risk or the look: the ledger's rates and the census are unchanged, and only what is seen in
  the loaded cells moves. A pass that changes how often things eat on screen checks `test/live.js`'s starving share.
- The cost (`docs/decisions.md` 26): every scan is throttled (0.25–0.5 s) and allocation-free; `findPrey` walks every creature per scan (about 1,400 at
  the forest), so pass 1's richer senses bucket them by cell first. `node test/perf.js` before and after.

## 8. Open (the person's)

1. The hours in §2's table are first choices from Earth's reef shifts: any kind whose hours or rest are wrong for it.
2. Whether the shelf by day is now too quiet (most of its hunters keep the night or the dusk), or as it should be.
3. Whether the look reads — the ridge's circle, the ortho's standoff — and whether facing it down is too easy or too hard (`RISK.deter`, `RISK.commit`).
