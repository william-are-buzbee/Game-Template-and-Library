# CLADES — the three clades as body plans, and the audit that asked for them

**Status: proposed 9 Sep 2026; the ringmouth pass built the same day** (the person: try the flat coil, the veil is a ringmouth
with rethought eyes, no glowing eyes anywhere, the tread stays, "continue onward"). The slowblood and hingeshell passes are next,
each seen before the other. The coats (palette variants in the bestiary) are built too. **23 Nov 2026: the radiation decided, nothing built** ([The radiation](#the-radiation-decided-23-nov-2026--nothing-built)):
individuals generated, species authored from a radiation table; the hanger first; the slowbloods' reference the jawless armoured fish; habitat at three scales proposed. Downstream of `PLANET.md` (the planet, the stalemate rule, blood, the niche audit — those stand);
upstream of `creatures_builders.js` once the person has struck what they don't want. Where this contradicts PLANET's clade
section it is a *proposed change* to PLANET, listed under [What this changes in PLANET](#what-this-changes-in-planet).

The person's brief (9 Sep): the roster is serviceable but reads as cephalopod / fish-reptile / arthropod in costume, and some
of it is literally Earth animals. Flag each creature (Earth clone / vague / unique / fits the art), then propose an upstream fix:
a signature per clade — integument, texture, shape, blood, sensory organs — so that two same-sized predators from different
clades converging on the same niche still tell apart, subtly, and a player can play ecologist without a bestiary.

## The diagnostic

Read from the preview sheets (`test/preview/*.png`, regenerated for this build) and the builders, not from the names. Columns:
**E** Earth clone (E! = a specific Earth animal by name; E = the Earth body plan), **V** vague (reads as a shape, not an animal),
**U** unique to the world (has a feature nothing on Earth has), **A** fits the art (simple enough, reads at low poly and at 50 m).

| id | clade | reads as | E | V | U | A | what I noticed |
|---|---|---|---|---|---|---|---|
| soft-arm | ringmouths | a squid | E! | | | ✓ | the Minecraft squid: box head, two pupiled eyes, two side fins, eight equal arms. Every one of those is the squid read |
| coilshell | ringmouths | a nautilus | E! | | | ✓ | the coil of spheres is the best-reading shell in the roster; the box head with two eyes is the nautilus |
| rasp | ringmouths | a snail with arms | E | | ✓ | ✓ | the eye ring on the mantle is the one ringmouth tell that exists; the rasp disc is the only visible ringmouth *mouth* |
| great | ringmouths | a spined ammonite | E! | | | ✓ | the coilshell's builder at ×3.2 with spines: the apex is a scaled player |
| ortho | ringmouths | *Cameroceras* | E! | | | ✓ | the roster's best silhouette, and Ordovician Earth exactly (banded cone, eight arms, two eyes) |
| arrow | ringmouths | a small squid | E! | ✓ | | ✓ | a box with arms; the soft-arm's cousin and it follows whatever the soft-arm becomes |
| lurker | ringmouths | an octopus on the floor | E! | | | ✓ | eight equal arms radiating flat + two eyes on top = octopus, from any angle |
| watcher | ringmouths | — | | | ✓ | ✓ | the raised five-eyed head that turns is the most alien thing in the ringmouths; the body under it is still an octopus |
| pall | ringmouths | a vampire squid | E! | | ✓ | ✓ | the net is striking and reads at distance; the twelve-eye ring is alien; the ear fins are the Dumbo/vampire read |
| veil | ringmouths | — | | ✓ | | ✓ | a blimp with hairs, two dark eyes, a mouth disc and glow spots (no-magic: they are the last lit thing). Vague, and unconfirmed as a ringmouth |
| finback | slowbloods | a tuna / a shark | E | | | ✓ | lathe, dorsal fin, paired pectorals, two lateral eyes, forked tail: a fish |
| darter | slowbloods | a minnow | E | ✓ | | ✓ | the same fish at 0.6 |
| needle | slowbloods | a needlefish | E! | | | ✓ | |
| grazer | slowbloods | a fat cod with a beak | E | ✓ | | ✓ | a lump with fins; the pale beak box is the only feature |
| basker | slowbloods | a black fish with red fins | E | | | ✓ | the rust countershade is the best colour in the slowbloods; white needle teeth are a fish/mammal read |
| ridge | slowbloods | a shark with spines | E | | | ✓ | |
| abyssal | slowbloods | the ridge, bigger, red-eyed | E | | | ✓ | *the same builder as the ridge at ×5* — the apex is a scale variant. Red eyes are a cartoon-villain read, and it lives below the light |
| eel | slowbloods | an eel | E! | | | ✓ | the chain is good tech; the animal is an eel |
| stone | slowbloods | — | | ✓ | ✓ | ✓ | a plated lump with two eyes and a lid; no Earth animal, but it reads as a box until it bites |
| crusher | slowbloods | *Dunkleosteus* | E! | | | ✓ | the plate rows and barbels give the slowbloods their only "texture"; the vice jaw and head make it a placoderm |
| scuttle | hingeshells | a trilobite / horseshoe crab | E! | | | ✓ | |
| trap | hingeshells | a mantis shrimp | E! | | ✓ | ✓ | the strike and the eyestalk tell are unique as *behaviour*; the shrimp abdomen and tail fan are the read |
| hook | hingeshells | a harvestman | E | | ✓ | ✓ | the hang, the drop, and the two-row eight-eye head are alien; the legs are a spider's |
| tread | hingeshells | the Ohmu | (anime) | | | ✓ | not Earth — Nausicaä. Someone else's design, recognisably. The arches and the eye row are good |
| picker | hingeshells | a sea spider | E! | | | ✓ | a pycnogonid to the tubercle |
| flicker | hingeshells | a shrimp | E! | | | ✓ | |
| hose | hingeshells | *Opabinia* | E! | | | ✓ | five stalked eyes + the proboscis with a claw = the most famous Cambrian animal after the next one |
| sickle | hingeshells | *Anomalocaris* | E! | | | ✓ | claws + plate mouth + flap rows + tail fan + stalk eyes: all five of its tells |
| comb | hingeshells | *Tamisiocaris* | E! | | | ✓ | |
| jelly | drifters | a jellyfish | E! | | | ✓ | and blue; parked for its own overhaul |

Everything fits the art: the low-poly kit is doing its job, and nothing needs to get more complex to get stranger. Nothing reads as
unique *at the clade level*: what is alien is scattered per species (a ring of eyes here, a net there, a head that turns) and
nothing in a clade shares it, so the clade reads as its Earth analogue and the alien species reads as an exception.

### What the pass shows (things the names hide)

1. **The roster is Earth's greatest hits in three eras.** Modern (squid, octopus, nautilus, fish, eel, shrimp, sea spider, mantis
   shrimp, jellyfish), Devonian (placoderm), Cambrian (trilobite, Opabinia, Anomalocaris, Tamisiocaris), plus one film. PLANET names
   the sources; the builders followed them faithfully. The person asked for "less of an Earth clone from the Cambrian" — the
   hingeshells are the worst offenders because Cambrian animals are already the strangest real animals, so the borrowing shows more.
2. **Two apexes are scale variants**: abyssal = ridge ×5, great = coilshell ×3.2. Same builder, same animal. If the apexes are
   going to be the sights of the world they want their own builders, whatever else changes.
3. **The clade tells that exist are colour and one kit.** Blood tint (PLANET) and the hingeshells' `trunk`/`leg` kit (plates with pale
   joints) are the only things a clade shares. Ringmouths and slowbloods have no kit of their own: the ringmouth head is a box with
   two pupiled eyes on the players, the arrow, the ortho — the single most squid-like feature in the roster — and the slowbloods are
   `buildFinback`'s profile with different fins.
4. **The clades' names promise features the builders don't have.** *Ringmouths* never show a mouth (except the rasp's disc); the
   ring of arms is the only ring, and it is the squid's. *Hingeshells* have no hinge anywhere. *Slowbloods* have the name only.
5. **Eyes are not a clade rule yet.** Yellow eyes on ringmouth and slowblood predators, black beads on hingeshells, red on the
   abyssal, pupils on some and not others. PLANET's eye rule (predators clustered forward, prey ringed) is applied per species.
   Eye *colour* and eye *movement* are free tells nobody is using.
6. **Teeth are white cones** on five slowbloods. White teeth are a vertebrate read; a clade with iron blood and chitin plates
   would have dark teeth, if it has teeth at all.
7. **Fins.** Paired lateral fins on the squid (soft-arm), ear fins on the pall, pectoral + dorsal + forked tail on every slowblood:
   the fin *arrangement* is Earth's, and arrangement is what a silhouette is made of.

## The fix: one ancestor, three fates for the ring

The person's instinct — everything non-insect descended from tentacled life, the slowbloods' tentacles closed into a rigid point —
goes one step further and becomes the whole story: **the common ancestor of all three clades was a radial crawler: a ring of arms
round a terminal mouth, a ring of eyespots on the rim, no head.** Bilateral symmetry evolved three times, from a ring, and each clade
broke the ring differently. That gives every clade a signature that is *derived*, not decorated, and it makes the count and
arrangement of appendages the tell — which is exactly the axis on which the roster currently pattern-matches to Earth (eight arms,
two fins, many legs).

Two characters are ancestral and shared, and they are what makes the whole biosphere read as one alien tree rather than three
Earth phyla:

- **The ring mouth.** Nothing on the planet has a hinged jaw. Every mouth is radial: arms round it (ringmouths), rigid petals that
  open as an iris (slowbloods), a ring of plates (hingeshells — `mouthRing` already exists on the sickle and the comb, and is
  Anomalocaris's; here it is the ancestor's, and every hingeshell has it, at the front). A crusher is a radial vice, a needle a
  radial pin, a grazer a radial rake: PLANET's "teeth are the variable" survives as the shape of the petals' inner edges.
- **The rim eyes.** The eyespot ring survives in all three: as a mantle collar on ringmouths, as an unbroken eye *band* on
  slowbloods, as the row along the shield's edge on hingeshells (the tread has it). Predators add a forward cluster on top of the
  relic; the relic never goes. Many cheap eyes are the planet's default and two good ones are the exception (PLANET, Ringmouths).

Everything below is what each clade did with the ring. The eye-tracking tiers are the person's (9 Sep): ringmouths track
plainly, slowbloods poorly, hingeshells not at all.

### Ringmouths — the ring kept open, and told apart

| | proposed |
|---|---|
| the ring | eight arms, **differentiated 2-4-2**: two long *grasp* arms forward (the weapon: hooks or suckers), four short stiff *oar* arms held out at the ring's sides (rowing, walking, bracing on the floor — they *do* things), two *keel* arms fused into a ventral fin the jet exits between. Never read as eight: read as a Y with a fringe |
| head | **none.** Mantle straight into the ring; no box head, no neck. The squid read is mostly the head |
| eyes | the collar: a ring of small eyes round the mantle rim, on everything. Predators add 3–5 larger eyes on a knuckle at the grasp arms' bases. **Pupils, and they track**: the pupil offsets toward `face` (the watcher's head already turns; this is the same idea on every ringmouth) |
| mouth | visible: a dark ring at the ring's centre with a beak in it |
| fins | none paired. The keel below; the mantle's tail end flares into a **three-lobed** skirt on the jetters (the ring's relic) |
| integument | smooth; the internal mineral shows as a **gladius ridge** down the mantle (the watcher has it); the shelled forms wear it outside |
| blood / tint | copper: grey-green to teal, never pink or red-brown (PLANET). The soft-arm and the arrow are currently red-brown — the wrong pigment |
| propulsion | the jet (the mantle pulses — exists) and the oars |
| the visible organ | the mantle pulse; the collar eyes are set in it and pulse with it |
| silhouette tell | a Y (two grasp arms) with a fringed collar, headless |
| the shell | the coil is the roster's best-reading shell and the nautilus's. Two ways to keep it and lose the read: coil it **flat** (a wheel carried horizontal over the mantle: a disc from the side, a spiral from above; Earth has this only in tiny snails — *Planorbis*), or keep the vertical coil and let the 2-4-2 ring and the headless collar carry the difference. The ortho's cone stays a cone (the simplest shell) with its bands run as a **helix** instead of rings |

### Slowbloods — the ring fused into a point

| | proposed |
|---|---|
| the ring | kept as a ring of **short stiff mouth tentacles** closing to a point (v11.8.8; the rigid petals and flaps of 11.8.4–7 were tried and struck). The person's first idea, exactly: "rigid, muscular mouth tentacles... pointed into an arrow". `st.strike` opens them |
| the bite | the petals' inner edges: needle ridges (needle, ridge), a thick plate on each (crusher: a vice from four sides beats a vice from two), a rake (grazer), none (the stone's suction) — all four the integument's plate rows on the petals' inner faces, reshaped (COMBAT §10.10, 24 Sep 2026): the saw once, in the sawmouths (ridge, abyssal, eel, basker) |
| eyes | the **eye band**: an unbroken dark collar round the base of the snout, a visor. Prey: even all round. Predators: the band thickens into two forward lobes. **No pupil, no sphere, no tracking** — the whole head turns, slowly (poor tracking, the person's tier) |
| fins | **three at 120°** — one dorsal, two ventro-lateral — and a **three-lobed tail** (one up, two down and out). The ring's relic in the fins; a fish has a different count everywhere you look |
| integument | scratchy: **chevron rows of small plates** down the back (the crusher's rows, on everything); the platebacks in full armour |
| blood / tint | iron: rust and red-brown flesh; the band dark iron; **no white teeth, no yellow or red eyes** |
| propulsion | the tail; the fins steer |
| the visible organ | a ring of **collar vents** behind the band that pulse (breathing shows: ectotherms, PLANET) |
| silhouette tell | an arrowhead snout, a dark collar, a Y tail |
| the longback | the eel keeps its chain; petals and band make it not an eel |

### Hingeshells — the ring sequenced and armoured

| | proposed |
|---|---|
| the ring | strung out into **rows** down each side: flaps (paddlers) or legs (walkers) — as now |
| the hinge | **the clade's own thing, and its name: a bivalved carapace along the back**, two valves hinged at the midline like a book. Raised when swimming or walking (the flaps and legs clear it), clamped shut when threatened and through the moult (the soft state hides inside). Earth's precedent is the ostracod and the clam shrimp, tiny and obscure; a 5 m predator with raised valves reads as nothing |
| mouth | the ring of plates (`mouthRing`), on every one, **at the front** |
| eyes | stalked beads that **never track**, plus the rim row along the front shield. Black |
| sensing | **no antennae.** A **comb**: a rake of rigid plates on the front of the shield (the person's "sensing probes"); the comb's size says how blind the animal is |
| integument | plates with pale joints (the `trunk`/`leg` kit — keep; it is the one clade kit that works). The inside of the valves is pale: **opening them is the tell**, and the moult is the whole animal pale |
| blood / tint | vanadium straw: pale joints, pale valve-linings |
| propulsion | metachronal flaps (exists), legs, the tail flick — burst and coast |
| the visible organ | the valves breathe (open and close slowly at rest) |
| silhouette tell | raised valves — a swimming mussel; an open book |

### The same-niche test

Three player-size predators, one per clade, at 50 m:

- **ortho** (ringmouth): a cone with a Y of grasp arms and a fringed collar.
- **ridge** (slowblood): an arrowhead with a dark visor and three fins.
- **sickle** (hingeshell): an open book on flaps, with a plate mouth in front.

Two floor grazers: the **rasp** (a shell, a collar, oars) and the **grazer** (a lathe, a visor, a rake snout) and the **scuttle**
(a walking book with a comb). Two floor ambushers: the **lurker** (a mantle with the arm fan laid forward, collar eyes) and the
**stone** (a plated lump whose petals open) and the **trap** (a buried book that cracks open as the eyestalks rise). The colours
can converge all they like.

### Breaking the easy pattern matches (the person's list)

- "If it looks like an octopus and has 8 limbs" — the count is not the tell, the *arrangement* is. Eight in a 2-4-2 with no head
  and a collar is not an octopus; eight equal arms round a box head is one at any count. Keep the ring (everything hangs off it);
  differentiate it.
- "Even the mammalian/reptilian clades need their own odd vision. Maybe they too can have multiple eyes" — I'd argue against more
  eyes on the slowbloods: if everything has many eyes, many eyes stops being a tell. The band is odder than more spheres and
  it is one clade's, and it gives the tracking tier for free (a band can't track).
- Two-eyes-with-pupils forward is the human-readable intent signal PLANET wanted to keep. It survives on one clade (the
  ringmouths, the clever ones); the slowbloods' lobes and the hingeshells' stalks show intent by *pointing*, not by pupils.
- Asymmetry is a real alien tell that costs nothing: one grasp arm longer than the other on a ringmouth family (the fiddler
  crab precedent), the hose's proboscis as one of a mismatched pair rather than a trunk.

## What it does to the roster

Not strikes — candidates, per species, for the person to strike from.

| species | what changes | note |
|---|---|---|
| soft-arm, arrow | headless, 2-4-2, collar + 3 forward eyes, three-lobed skirt, no side fins, teal | the players first: the person looks at them most |
| coilshell, rasp, great | 2-4-2, headless, collar; the shell flat or vertical (ask); the great gets its own builder | |
| ortho | 2-4-2, collar, helical bands | keep the cone |
| lurker | arm fan laid *forward* in two tiers, mantle tucked behind, collar | stops being an octopus from above |
| watcher | keep; ring differentiated, collar added | already the most alien |
| pall | keep the net; collar; **ear fins go** | |
| veil | rebuild: a forward net of filter arms on a collared mantle; **glow spots go** | ask whether it is a ringmouth at all (PLANET, Open 2) |
| finback, darter, needle, basker, ridge | petal snout, band, three fins, Y tail, chevron plates, no white teeth | one kit change does all five |
| grazer | petals as a rake; band even all round | the lump gets a face |
| abyssal | **its own builder**: a gigantotherm below the light — the band blind (closed), long barbels, the deepest body | no red eyes |
| eel | petals, band; keep the chain | |
| stone | petals; the lid becomes the petals opening | |
| crusher | petals as thick plates; keep the rows and barbels | the placoderm read goes with the hinged jaw |
| scuttle | valves, comb, plate mouth | the clade's walking type specimen |
| trap | valves as the lid it buries under; keep the raptorial fold and the eyestalk tell; **shrimp abdomen and tail fan go** | |
| hook | valves (small: it hangs, it needs the legs clear), comb | keep the eight-eye head |
| tread | the arches are already valve-like: make them **two rows** (left and right, hinged at the crest) and it is its own animal; comb in front | ask whether the Ohmu read bothers them |
| picker | small relic valves it cannot close; comb | the legs are fine |
| flicker | **a swimming bean**: valves it lives inside, legs out the bottom, the tail flick from inside the shell | the clam-shrimp precedent; very cheap, very not-shrimp |
| hose | valves; the proboscis becomes one of a **mismatched pair** of frontal appendages | Opabinia's tell is the single trunk |
| sickle | valves raised over the trunk; comb on the shield; **tail fan's twin spines go** | claws + plate mouth + flaps are convergent and stay; two of five tells changed and it is not Anomalocaris |
| comb | valves; the combs stay (a filter feeder is a filter feeder) | |
| jelly | its own pass | the person's call, made |

## What this changes in PLANET

- Ringmouths: "eight arms round the mouth" → eight in 2-4-2; "prey forms carry a ring of small eyes… predators a forward cluster"
  → *all* carry the ring, predators add the cluster.
- Slowbloods: "jaws" → the petal snout (a radial bite; the stalemate rule stands — bone and the bite, not the metabolism); "two camera
  eyes, forward on predators" → the eye band, lobed forward on predators; the fin plan; "teeth are the variable" → the petals' edges.
- Hingeshells: "many eyes, stalked or compound; antennae" → stalked and rimmed, **no antennae**, the comb; the bivalved carapace
  added as the clade's deep decision alongside the moult (the valves are where it hides while soft).
- Cross-clade: "Geometry language" stands; add **the ring rule** (every mouth is radial) and **the eye rule by clade** (collar with
  pupils / band / stalks and rim).
- The roster's Earth sources (Opabinia, Anomalocaris, Tamisiocaris, the mantis shrimp, the vampire squid, the Ohmu) become
  "the niche's precedent", not the design.

## How it would be built

Kit first, then one clade per pass, the bestiary after each (the person looks; nothing is placed differently — envelopes and
stats do not move). Roughly:

1. `armRing` gets a per-arm table (`arms:[{len,w}]` or a `plan:'2-4-2'` option) — the ring differentiated in one place.
2. `petalSnout(P,pal,z,r,len,n)` → returns the petal meshes for the anim to open on `st.strike`; `eyeBand(P,pal,z,R,h,pred)`;
   `finTrio`, `tailTrio`; `chevrons(P,pal,prof)`.
3. `valves(g,pal,z0,z1,w,h)` → two meshes hinged at the midline; the anim raises them with speed and clamps them on `st.tell`
   (and, later, in the soft state); `comb(P,pal,…)`.
4. Ringmouths pass (10 builders), slowbloods pass (10), hingeshells pass (9). The players in the first two passes.
5. Eye colour by clade set in `PAL` once.

Cost: three passes of the size of v10.6 (the fifteen builders), each seen before the next.

## The coats (built, v11.8)

For looking at the roster in other colours before any of this: in the bestiary, **up/down** (w/x) rebuild the shown species in a
palette variant — hue ±35°, the complement, the clade's *blood* tint (every hue pulled toward copper teal-grey / iron rust / vanadium
straw), dark water, bleached, a hard countershade. Eyes, pupils, glow, mouths and claws are left alone so the read of intent
survives; the caption names the coat. `COATS=1 node test/preview.js` writes a strip per species (`test/preview/<id>_coats.png`).
Nothing in the world reads the variants. Looking at the strips: the *blood* coat is the one that makes the three clades tell apart
by colour alone and is the least loud; the bleached coat is what the moult would look like.

## The ringmouth pass (built, v11.8 — unseen)

Kit (`parts.js`): `armRing` takes a `plan` (an entry per arm: `phi`, `len`/`w` multipliers, `sp` a spread offset — `ringPose` adds
it); `eyeCluster` (the predator's three or five pupiled eyes on a knuckle); `helix` (recolours a merged geometry in a winding band);
`eyeRing` takes a `y0`. In `creatures_builders.js`: `PLAN242`, `ringMouth` (the dark ring and beak), `skirtTrio` (the three-lobed
tail skirt), `buildJetter` (the soft-arm and the arrow are one builder with proportions), `coilShell` with `flat`, `coilBody` (the
soft body under a flat shell, shared by the coilshell, the rasp and the great), `buildGreat` (its own builder at last).

| species | built as |
|---|---|
| soft-arm, arrow | headless: the mantle runs into a collar with eight rim eyes; three pupiled eyes on a knuckle at the top of the ring; the mouth ring and beak at the centre; 2-4-2 arms; three-lobed skirt for the side fins; gladius ridge; teal-grey |
| coilshell | the shell stood on its edge over the mantle (v11.8.2; the flat wheel of v11.8.1 "sat flatside on top"), its outer whorl ending forward and curling up and back; the collar, the cluster of three, the mouth, 2-4-2; withdraws back under the shell |
| rasp | the same upright carry, small; six arms as a grasp pair and four oars (a crawler has no keel); the collar it already had |
| great | its own builder: a spined shell carried upright, a deeper mantle, a cluster of five, the grasp arms long |
| ortho | the cone kept, bands as a helix (3.5 turns); collar, cluster of five, mouth, 2-4-2 |
| lurker | mantle tucked behind with the collar on its front rim and a cluster of three on top; the eight arms laid forward in two tiers (grasp long, oars short) — a fan and a lump from above, not a star |
| watcher | collar added on the mantle; the four raised arms differentiated (a long pair forward, a short pair back); the head unchanged |
| pall | ear fins gone; gladius ridge; the mouth ring; the net stays equal (the deep line keeps the ancestral ring) |
| veil | no forward eyes; a collar of twelve; the twenty-two arms webbed into a forward funnel; three-lobed skirt; ridge; the glow spots gone; grey-teal |

Every ringmouth eye is a pale grey-green iris (a black pupil on the clusters); every slowblood eye is silver-grey; the abyssal's
red eyes and every yellow eye are gone. The darter's `glim` glow variant is still in the code, unspawned.

**Unseen:** all of it in the game's light. The first things to ask: does the soft-arm read as an animal at all with no head (the
preview reads it as a Y with a fringe); does the coilshell's shell look carried (seen in preview: the flat wheel did not, 9 Sep; the upright one is unseen); the lurker from above;
the veil's funnel against the pall's net at distance. The helix on the ortho is subtle at low poly — a two-tone check at 30 m.

## The slowblood pass (built, v11.8.4 — unseen)

Kit (`creatures_builders.js`): `mouthArms` (v11.8.8: the mouth is a ring of short stiff tentacles on the ringmouths' chain rig, converging to a point at rest and blooming
on the bite — the petal and flap mouths of 11.8.4–7 read as bolted on and then as a Lego fish; six or eight, four long on the needle), `slowEyes` (six small dark eyes round the head, no band, and on predators two
carried forward on flesh lobes, big, pupilled — a shark's eyes: dark on dark),
`eyeBand` (a dark iron collar with two silver eye patches — forward on predators, lateral on prey — and six dark vents behind; v11.8.5), `finTrio` (three at 120°, the ventral pair
beating against the dorsal), `tailTrio` (one up, two down and out), `chevrons` (paired plates in a ^ down the back, sized to the
lathe profile by `profR`), `buildAbyssal`.

| species | built as |
|---|---|
| finback (player), ridge | one builder: petal snout of five with needle ridges, band with lobes, three fins, Y tail, chevrons; the ridge keeps its spine row. The player finback is a hunter and wears the lobes |
| darter (and its glim coat) | four petals, a band, the trio; the glim's emissive material gone — it is the darter in a pale coat, still unspawned |
| needle | four long petals that close into the needle; lobes; chevrons; the trio |
| grazer | six short petals with a rake, an even band, chevrons; the petals stay a little open (it grazes) |
| basker | six needle petals, lobes, rust trio and tall rust Y tail, chevrons |
| abyssal | its own builder: a deeper body, a narrow band with no lobes (it hunts below the light), four long barbels, a double spine row, six plate petals, long fins |
| eel | the chain kept; the head carries the band and a five-petal snout (a separate mesh on the root, so it opens); the tail ends in three lobes |
| stone | the lid is six thick petals on the front, wide and low, that open on the strike; the band low and even; the white teeth gone |
| crusher | four plate petals that meet like a vice from four sides; lobes; the plate rows and barbels kept; the trio and the Y tail |

Every white cone tooth in the roster is gone. `test/anim.js` still passes on the finback (tail 3.9 rad/s max accelerating, 0.8 coasting).

**Seen (9 Sep):** the mouth was hard to read — overlapping petals, an idle gape, the silver band a cut, no eyes. v11.8.5: tapered petals that
meet, a dark lip line, no motion but the bite, the band dark with two silver eye patches. Unseen since. Still to ask: the three fins from
behind (a Y); whether the chevrons read as scales or as clutter at 30 m; the eel's snout on the chain head.

## The hingeshell pass (built, v11.9 — unseen)

Kit: `valves` (two plates hinged at the midline over the back; `set(k)`; pale inside; raised moving, clamped on the tell), `comb` (a rake of
rigid plates on the shield's front — the sensing organ; no antennae anywhere now), `mouthRing` with `front`. The tread untouched by the
person's word. Species: CHANGELOG v11.9 has the table. Every hingeshell but the tread now carries valves; the trap's are its lid, the
flicker's are the whole animal, the picker's a relic. The Cambrian tells that went: the trilobite's tail spine, the shrimp's abdomen and
fan on the trap, Opabinia's single trunk (a mismatched pair now), Anomalocaris's twin tail spines. What stays because it is convergent:
raptorial folds, frontal claws, the plate mouth, flap rows, stalked eyes, a tail fan.

**Unseen:** the valves reading as a shell that opens; the flicker as a bean at ribbon scale; the scuttle's flat pair on the strand.

## The raptor family (built, v11.9.1 — unseen)

The person (9 Sep): the sickle and the hose were still Anomalocaris and Opabinia. `buildRaptor` builds the niche as a family: every part a
choice (CHANGELOG v11.9.1 lists them), five looks in `RAPTORS` — keel (the sickle now), splay (the hose now), hood, lash, ram (bestiary).
The Earth tells that no look repeats together: stalked eyes + claw pair + plate mouth under + flap rows + tail fan. Each look keeps two of
the five at most. Open: which looks live in the world, and whether the niche wants two sizes of one look or one each of several.
**Answered v11.66 (the person's default, to be overridden in chat): all five live, one each, placed by what the build implies** — the keel on the
rockfall and the terraces, the splay in the weed forests, the hood buried on the sand flats and the lagoon floor as an ambusher from below (to v11.83;
since v11.83.1, the person's ask of 22 Sep, a player-sized hunter over the same flats and the lagoon, the look kept at 0.42 of its build, its claws
for the small prey), the lash on the ledges, the ram slow and big in the open water over the flank. Their prey is what their claws can open (COMBAT.md §7, answered).

## The variety pass (built, v11.66 — seen in the pane)

Two of a kind are no longer identical: a size band, a coat by the place's chemistry (rust, lime, sulfide, manganese, the young rock's dark —
PLANET's shell-colour rule as a per-instance shift of the kind's preset) and the moult (the soft state, pale and clamped; the shed carapaces),
all of it infrastructure the slowblood and ringmouth passes reuse (creatures_ai.js, the section over `spawn`; creatures_spec.js `coatChem`).
Five forms by mechanism, each with its two Earth tells at most (stalked eyes, claw pair, plate mouth under, flap rows, tail fan):

| form | family | mechanism | tells kept |
|---|---|---|---|
| sifter | paddlers | the comb's small relative: a filter-feeding swarmer of the lit, fed, moving water | stalked eyes, flap rows |
| cinder | walkers | the seep form: the picker's cousin on the mats, plated, black, poison by its diet | mouth under |
| wedge | walkers | the scuttle's exposure ecotype: low, wide, short-legged, heavy-valved on the surf's rock | mouth under |
| plough | walkers | the flats' deposit feeder: feeding combs under the front, no weapon | stalked eyes, mouth under |
| relict | paddlers | the sill relict: the hose's line larger and pale on the drowned summits below the light | stalked eyes, flap rows |

## The radiation (decided 23 Nov 2026 — nothing built)

The person's brief (23 Nov 2026): the ecology mirrors Earth a little too closely at times; the hingeshells are largely radiodonts and the whole
reads as mammals, bugs and squids; the ringmouths are *"a little too clean looking"*. The fix is to look at more of Earth, not less — other
periods than the Cretaceous — for patterns rather than animals: Endoceras as the imaging shows it (shell colours and patterns, limb lengths,
size, all varying), a cone that hangs point-up and drops on what is below, and existing shapes repurposed for new niches (the ridge as a
whale-like filter feeder). Convergence stays: what exists is fine, it is the variety that is short.

### The diagnosis

1. **Every individual of a ringmouth or slowblood kind is identical.** Size varies ±15% (`VARY`), and the coat by the place's chemistry
   only on hingeshells (`COAT_CHEM_KEYS` is empty for the other two). Every ortho has the same perfect cone, bands and arm lengths:
   identical copies read as made, and the clean read is that.
2. **One fresh design per niche.** Earth reads real because a few body plans radiate into many niches and kin look like kin. That is the
   pattern to take from Earth.
3. **Hingeshells are 17 of the 41 species** (ringmouths 10, slowbloods 10, drifters 4). New variety goes to the other two.

### Decided (the person, 23 Nov 2026)

1. **The generator is split.** *Individuals are generated* — in the world, per instance, by what the place and the animal's age say.
   *Species are authored*, from a radiation table (below): each a parent's spec plus overrides, so kinship shows; a niche and a
   behaviour are what make a species, and those are written by hand. The raptor family (v11.9.1) is the model. Nothing makes species at
   run time; if that comes, it comes from LINEAGE's mutation.
2. **The slowbloods' Earth reference becomes the jawless armoured fish** of the Silurian and Devonian — heterostracans, osteostracans,
   galeaspids: bone, no hinged jaw, head shields, eyes on top. That is the clade's own premise (PLANET: the bite and the bone, a ring
   mouth); the lathe and the fin layout of a modern fish are the read the slowbloods still carry (the audit read the finback as a tuna).
   A pass of its own.
3. **The hanger** (below) is first, *"if we can make it"* — it can. **The ortho stays as it is.**
4. Then the ringmouths' individuals, the slowblood filter giant, the jawless pass — the order proposed; the person may move it.

### The radiation table (Earth's patterns, and what each gives Tethys)

| pattern | Earth's precedent | on Tethys | parent | status |
|---|---|---|---|---|
| the unballasted cone | orthocones without ballast deposits float vertical, shell up (hydrostatic models of Palaeozoic nautiloids, Peterman et al. 2019); Endoceras's endocones were its ballast | **the hanger** | ortho | decided, first |
| predators become giant filter feeders | Aegirocassis (Ordovician, from predatory radiodonts), Leedsichthys (Jurassic, ~16 m, from predatory fish), basking sharks, baleen whales | **the slowblood filter giant**: the mouth ring held open as a round hoop, the petals' plate rows grown into fringes — no Earth animal gapes radially; a gigantotherm (holds its heat by size) of the cold fed water; eats the swarms (`FILTER`, `derive.filter`); fills the slowbloods' empty slot in the big filter feeders (the veil's niche, the comb the minor one) and gives the abyssal its prey | ridge (the sawmouths) | agreed |
| the shell's tip shed | Sphooceras truncatum dropped its old chambers and sealed the end | young long and pointed, old blunt — age read at 50 m | — | with the individuals |
| encrusted shells | crinoids, bryozoans, cornulitids on Palaeozoic orthocones, some settled while it lived | an old shell wears the reef's sessile taxa (TAXA) | — | with the individuals |
| healed injuries | repaired shell breaks are common in fossil cephalopods | a survivor keeps its scar | combat's wounds | with the individuals |
| armour without a jaw | heterostracans, osteostracans, galeaspids (whose head shields alone are a shape vocabulary) | the slowbloods' reference | every slowblood | decided, a pass |
| two sexes like two species | argonauts (the female's thin egg case secreted from her arms; a tiny male), anglerfish | a brooding ringmouth female grows a shell from her arms for the brood — the clade's one mineral, worn only for its one spawning (LINEAGE §3) | soft-arm | candidate |
| a squatter in a dead shell | hermit crabs; Phronima in a hollowed salp | a small hingeshell in a dead coilshell's shell — the ecology already makes the shells | coilshell's shell, a walker | candidate |
| a larva that breeds | larvaceans: tunicates that never grow up | a ringmouth that breeds small and never grows its shell | a straightshell juvenile | candidate |
| a vertical body among vertical stalks | shrimpfish and trumpetfish, hanging head-down among sea grass and urchin spines | **the stipe** (the person, 23 Nov 2026, asked for a shallow plumb and smaller ones that still point up): a 2–4 m upright straightshell hung among the weed forest's stipes, a stalk among stalks, dropping on darters and flickers | plumb | candidate |

Why the straightshells were never displaced, and may be big: on Earth the orthocones gave way when fish put jaws, bone and a fast
metabolism in one body; here the stalemate rule (PLANET) says no clade has all three. The 28% oxygen does the size. No sparkle needed.

### The individuals (generated) — designed in VARIETY.md (23 Nov 2026)

Per instance, by what: size (built, `VARY`); the coat by chemistry (built for hingeshells; extended to the ringmouths' shells and the
slowbloods' plates); arm lengths and asymmetry (the rigs are each creature's own, so these are cheap); the shell's banding; the tip shed
by age; encrusters and scars by age. A shell is shared geometry, so it varies as a few variants per kind and coat (as the flora's three per
species), never one per animal; what it costs is measured (`test/bench_creatures.js`, `test/gpu.js`).

### The hanger (decided, first to build — built v11.223 as the **plumb**)

- **The body**: the straightshell cone with no ballast, hung vertical — the shell up, the 2-4-2 ring down as a curtain. The ortho's spec
  is its parent; bigger than the ortho (the person: larger).
- **The physics**: the gas in the chambers is why it floats and why it points up. It rises and sinks by buoyancy — slow and cheap — and
  cannot hold station in a current (it is a mast), so it lives in still water.
- **The behaviour**: holds a station beside a wall over open water; its depth follows the swarm's daily layer (`swarmDepth`, built for
  the swarm, v11.84) — down by day, up at night, as what it eats follows the layer; the strike is downward: the mouth dips, the ring
  blooms, a jet with the funnel turned up.
- **How it is made**: the facing code points a body's +z where it goes or at `c.face` (creatures_ai.js), so a hanger is a body held
  nose-down and turned to its prey in the strike. New: its role (or the ambush's with a vertical station) and its station (below).
- **Depth**: a gas shell cannot be pumped below about −450 (PLANET, Ringmouths); its day depth stays above that.
- **Built v11.223** (CHANGELOG): `SPECS.plumb` (the ortho's cone, L 9.5 at ×1.35, the helix at 5 turns, a ring 3.6 long; a rose-grey shell under a dark
  helix), `DEFS.plumb` (`upright`, `station` wall and lee, `below` 0.5), creatures_ai.js `updatePlumb`, chunks.js `stationPoint`. Named for a plumb line;
  "the hanger" in this section is the same animal. Its day depth is the swarm's (or its arms' reach over the floor), its night depth near the surface
  (−28, deeper under a full moon); 1.2 m/s between. About 1,700 in the world at the census's equilibrium (the ortho 17,000), at walls only.
- **Seen by the person (23 Nov 2026), v11.223.1**: *"I really enjoy it"* — but it did not read as hanging (*"more like it's just... there... stands
  perfectly still, you get close and it grabs you"*, standing on the floor) and was too rare. So: its arms' tips at least 0.7 × size over the floor
  (`HANG.gap`); a slow bob, a pendulum sway that turns it, a drift round its station; carried by the current and pushed by bodies, drifting back;
  the arms hanging (rest spread 0.42 → 0.22); a paler shell. Walls from 11 m faces (`STATION.wall` 0.3–0.75) and `n` 4 → 12: about 8,100 in the
  world (the census at day 60). The person also wants it a god (LINEAGE §7c.6).
- **Seen again (23 Nov 2026)**: *"It reads better and it's more common which I greatly appreciate."* Asked: a shallow version, and smaller ones that
  still point up. The young are smaller (0.55, ~11 m) and hang the same way, at the same walls; nothing hangs in the shallows — its floor is 30 m down
  and its shell's length and its gap keep it deeper still. A shallow one is a species of its own: the stipe (the radiation table). Its size: 20 m
  typical, 30 m old, by the individual generator (VARIETY.md §3).

### Habitat: three scales (proposed and agreed 23 Nov 2026)

The person (23 Nov): think about what habitat an animal would want — the ortho against the hanger. Today a habitat is an envelope at the
cell's scale (215 m): which cells, by depth and one or two fields. In the cell a creature is placed at one seeded point near the block's
middle in its depth band and roams its `home`. Two species with one envelope live in one place, and nothing makes a wall a place.

1. **The range (the cells)** — the envelope, as now; its bounds taken from the body where the body sets them (a gas shell's depth, an
   ectotherm's heat, a sieve's food and flow), the hand-written band inside them. A test flags a species placed past its body's limits.
   (v11.223: the gas shell's built — derive's `deepY`, held every step; the ectotherm's waits for a temperature field, the sieve's is the envelope's `nut`.)
2. **The station (in the cell)** — the missing scale, and the one the player sees (wall and lee built v11.223: creatures_defs.js `STATION`). A small vocabulary, each a score over the cell's
   grid: *the wall* (a steep drop, open water beside it), *the lee* (low flow behind relief), *the lip* (`rel` high), *the edge* (sand
   against rock), *the canopy* (in the weed), *the open* (far from anything), *the crevice*. A species names one or two, is placed at
   the best-scoring points, and its `home` is the station. Walls have hangers; the lip has lashes; the hook gets its rock face.
3. **The clock** — a station moves: the day (the swarm's layer, built); the tide (the lee changes sides of a pinnacle as the stream turns,
   `tidalAt` — the hangers swing round it twice a day); the year (the filter giant comes with the bloom, PLANKTON §6).
4. **Habitat made by animals** — later: the giant's carcass as a fall (a floor community that lasts), the dead shells squatters take, the
   hingeshells' dens (unbuilt).

| | ortho | hanger |
|---|---|---|
| ballast | yes: lies level | none: hangs vertical |
| water | the current (`flow` 0.3–1, as now) | still: the lee |
| space | the open slope, cruising | a wall over a drop, holding station |
| depth | as now | above −450 always; deep by day, up at night with the layer |
| the hunt | the chase, a spear | the hang and the drop |

### Open (the person's)

1. ~~The habitat's three scales, and the station vocabulary~~ — **answered 23 Nov 2026: yes, both, as the start.** The person: *"If we
   do it right, it will all work just based off believable logic and physics."*
2. ~~The ortho's envelope past a gas shell's −450~~ — **answered 23 Nov 2026: moved up. "No exceptions for any animal as of yet":** every
   species is held to the limits its body sets.
3. The candidates (the brooding female's shell, the squatter, the larva): which, if any.
