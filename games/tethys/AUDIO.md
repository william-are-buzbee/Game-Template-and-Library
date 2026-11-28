# AUDIO — the sound of the water (IDEAS #6), 9 Sep 2026

**v11.248 (27 Nov 2026): the overhaul begins, and its instruments come first** — "The overhaul" and "The ear's instruments" below. The
design further down is v11.14's, as built; the overhaul will strike and replace it piece by piece, and say so here.

**v11.34: there is now a bench — `#bench` renders every sound here to a wav and `node test/spectro.js` draws it, so a number in this file can be checked against what it actually makes. The first run's findings are in CHANGELOG v11.34; nothing below has been struck by them yet.**

**Built as v11.14 with the defaults below (the person: "defaults are good"); the numbers as built are in DESIGN, The sound, and the unheard list in CHANGELOG v11.14. This file is the design as proposed.**

The design for the audio overhaul, for the person's strikes before it is built. Downstream of `PLANET.md` (no lamps, no magic:
every sound here is water, rock, weather or a body moving water) and of `DESIGN.md` Visibility (the fog is the look; the sound
should be the same veil for the ear). Not music, and not animal voices — those are the person's, later. What this builds is the
*infrastructure*: a real 3D space for sound to sit in, and the water heard as itself.

Today's audio (audio.js, 18 lines): one looped brown-noise buffer through a lowpass that slides with depth and daylight, a
master gain that rises in rain, and `thump()` — a sine chirp for bites, hits, flops and splashes, played straight into the
output with no position. Nothing is placed, nothing reflects, nothing is occluded, and the water is one sound everywhere.

## What being under water sounds like, and what of it is cheap

- **The veil.** Water absorbs high frequencies with distance (roughly as frequency squared): far things are low and
  muffled, near things bright. That is one lowpass per source whose cutoff falls with distance. Depth does the same to the
  whole world: the surface's noise fades, and below ~200 m what's left is low.
- **Distance and delay.** Sound travels ~1480 m/s here (1 unit = 1 m): a bite 150 m off arrives 0.1 s after it is seen. Free
  to model on one-shots; a small honesty.
- **Reflection.** Open water reverberates almost not at all — but a rock wall two metres away slaps every sound back, a hole
  in the reef hums, the pit crater rang (struck v11.95). This is Thief's "room" idea, but the rooms are not authored: they are *read from the
  geometry* around the listener (below, The space). The person asked for exactly this.
- **Occlusion.** A ridge between you and the vent muffles it and a wall between you and a passing body muffles that. Cheap:
  march the line between source and listener through the terrain and the collider hash, count what it passes through.
- **The surface** is a moving sound source overhead: the wave function `waveH` already exists, so the slosh you hear can be
  *the wave you see*, modulated by the local wave's rate at the player's x,z, and it comes from above, fading with depth.
- **Your own body** is the loudest thing in the water: the rush of water past it at speed, the squeeze of a jet, the thud of
  bottoming out on sand, the knock and scrape on rock, the brush through weed. All of it from state the player already has.
- **Place**, read from the condition fields like everything else (no biome ids): `expo` for breakers on the shore, `flow` for the
  current's rush, `heat` for the fissure's hiss and rumble, `nut` for the reef's biological crackle (the one debatable item), the
  cell's flora count for the forest's rustle, `underCanopy` for a lid, depth for the hush and the pressure below the chemocline.

All of it is procedural — Web Audio nodes generating from noise buffers made at boot. No files, no assets, nothing to load. The
person's music, if any, gets its own bus and nothing here touches it.

## The architecture (audio.js, rewritten; ~350 lines)

```
sources ─┬─ voice[i]: gain → lowpass (absorption + occlusion) → PannerNode ──┬─ dry ──┐
         │  (8 pooled 3D voices; the beds and one-shots share them)          └─ send ─┤
self ────┴─ the player's own sounds, unpanned, straight to dry                       │
                                                       early taps (3 delays, panned) ←┤
                                                       reverb (2 convolvers, mixed)  ←┘
dry + taps + reverb → medium (lowpass + low shelf: depth, medium, hurt) → compressor → master → out
```

- **Voices.** Eight `PannerNode`s (HRTF on desktop, equal-power on low: `Q.hrtf`), each with its own gain and lowpass. Distance
  gain is computed by us (rolloff off on the panner) so the water's longer reach and its absorption are our curve, not the
  browser's: `g = 1/(1+d/18)`, cutoff `c0 · 1/(1+(d/60)²)`, and occlusion multiplies both. A bed asks for a voice when it is
  audible and gives it back when it isn't; one-shots take a voice for their length. Nothing allocates per frame; the graph is
  built once.
- **The listener** sits at the player's body, oriented as the camera (a third-person compromise: at the camera, your own body
  is seven metres in front of you; at the player with the player's facing, turning the camera does nothing). Ask (Q1).
- **Rates.** Emitter parameters are pushed at 20 Hz with `setTargetAtTime` (smoothed on the audio thread, so no zipper
  noise and no per-frame writes); the space probe runs at 4 Hz; the occlusion march per voice at 5 Hz. Main-thread cost is
  a few hundred `groundAt` and hash lookups a second: **under 0.05 ms a frame on average**, nothing on the GPU. The audio
  thread carries the DSP (8 HRTF panners and two short convolvers: a few percent of one core, on its own thread). That
  thread can't be measured from the sandbox; the readout gets an `audio` line (voices in use, the space's numbers) so the
  person can see what it is doing.
- **Tests.** The stub gains a fake `AudioContext` (nodes as inert objects with AudioParam-like fields) so the smoke test
  drives every audio path headlessly — undefined names, NaN into a param, a voice never returned — instead of skipping
  them as it does now (`AudioContext` is `undefined` in the stub today). It still proves nothing about how it sounds.

## The space — reflection read from the world

Every 0.25 s, twelve fixed rays leave the listener (up, down, four level, four level-up at 45°, two level-down) and march
in 3 m steps to 45 m through the terrain (`groundAt`), the surface (`TIDE`: a hard lid — the underside of the surface is a
near-perfect reflector) and the collider hash (rocks, structures, pads; the point-inside tests physics.js already has). Each
ray reports the distance to its first hit or "open". From the twelve:

- `enc` — the fraction of rays that hit: 0 in open water, ~0.5 against a wall, ~1 in a hole. Drives the **reverb send**
  (`wet = enc²`) and which reverb: a short dense one (a cove, 0.7 s) blending to a long dark one (a cavern, 2.4 s) as the
  mean hit distance grows. Both impulse responses are generated at boot (exponentially decaying noise, lowpassed harder as it
  decays — water's tail is dull). In open water the send is zero and the convolvers idle.
- **Early reflections**, the part that makes a *wall* audible: the three nearest hits become three delay taps on the dry bus,
  each delayed by its round trip (2·d/1480 s: 1–60 ms) and panned to its direction relative to the camera, gain by
  1/(1+d/6). Swim along a rock face and it whispers back from that side; swim into a gully and it closes in from both. This is
  the image-source method truncated to one bounce, per listener rather than per source (an approximation that costs three
  delay nodes instead of three per voice).
- `floor` (the down ray) — the **low shelf** gains 3 dB as the floor comes within 2 m: the boominess of lying in a hollow.
- `lid` — the up ray hitting the surface within 3 m: the slosh voice gets 6 dB and its lowpass opens: you are *in* the chop.
  `underCanopy` reads as a lid too (the mats over you), damping the surface voice and lifting the wet.

Cost: 12 rays × 15 steps = 180 `groundAt` and hash bucket reads, four times a second.

## Occlusion

For each placed voice, five times a second, the line from source to listener marched in 4 m steps: each step under the ground
or inside a solid counts. `occ = 1−0.85^steps`: a ridge in the way takes the vent to a rumble; a boulder takes a passing body
to a shadow. Occlusion reduces the voice's gain by up to −14 dB and its cutoff by up to 8×, and *raises* its reverb send a
little (what you hear of an occluded source is its reflected part). Smoothed, so a source ducking behind a rock fades, not pops.

## The sources

The beds, all continuous, all from the world's numbers, all 3D-placed unless marked *self*:

| # | source | placed at | driven by |
|---|---|---|---|
| 1 | **the column** — the water's own hiss (bandpassed noise 300–2 kHz) | *self*, unpanned | depth: full in the shallows, gone by 150 m; skyL (day is brighter than night, faintly) |
| 2 | **the deep** — brown rumble (what today's bed is) | *self* | depth: rises past 100 m; below the chemocline (−450) a beating pair of sines at 32/34 Hz, quiet: pressure |
| 3 | **the slosh** — the surface | the surface point over the player | gain by 1/(1+depth/6) and the local wave's *rate* (`waveH` at the player's x,z, differenced each update: the sound is the wave you see); the lid rule above; rain adds a fine patter through it |
| 4 | **breakers** — waves on the shore | 20 m uphill of the player (the ground gradient), at the surface | `expo` × shallowness (ground within 25 m of the surface); a swell of noise with the first wave's period, from the direction the shore lies |
| 5 | **the current** — broadband rush | *self* | |current| at the player (`currentAt`): the passes on the flood, the flanks |
| 6 | **the vent** — rumble + boiling hiss | the chimney (`LM.chimney`), occluded like anything | audible within ~250 m; the `heat` field adds a faint bubbling bed anywhere on the fissure |
| 7 | **the forest** — rustle and creak | the weighted centroid of the flora in the 3×3 cells (cheap: cells know their instance counts) | density × (current + wave rate): weed in a stream hisses, weed in slack water is nearly silent |
| 8 | **the crackle** — the reef's biological snap (random impulses through a bandpass; Earth's dominant reef sound) | *self*, wide | `nut` × shallowness, louder at night (skyL). **The one debatable source** (Q3): it is life, not water, though it is texture rather than voice |
| 9 | **rain** (exists as a gain) | the surface | `rainA`; from below a muffled hiss, above an open patter |
| 10 | **air** — wind, lapping, rain | *self* + the surface | only when `camAbove`: the medium opens (the master lowpass to 16 kHz), wind by `SKY.wind`; minimal, land is secondary (Q6) |

The self sounds, from the player's state, unpanned:

| # | sound | trigger |
|---|---|---|
| 11 | **flow** — water past the body: noise, gain ∝ spd², cutoff ∝ spd | `P.spd`, `sub`; a turn adds a swish (the yaw rate) |
| 12 | **the jet** — a whoosh burst per squeeze, decaying | `P.jetT` wrapping (soft-arm, coilshell); the finback gets a slow swish on its beat instead (a swimClock of its own) |
| 13 | **bottoming out** — thud on sediment, click on rock (by `sub`) | grounded with a downward hit; scaled by the impact |
| 14 | **rock** — knock, then scrape while pushing | `solidPush` moved the body against a non-flora solid (physics.js reports what it hit: one flag on flora solids, one word in `solidPush`) |
| 15 | **weed** — brush, rustle | `solidPush` against a flora solid; sustained while inside |
| 16 | **the bite / the hit / the flop / the splash** | the existing four `thump` calls, routed through the graph: placed for the hit's source, reverbed, and each with a noise transient over the sine so they are not four pitches of one beep. The *content* of the bite (the snap) belongs to POLISH pass B; this only gives it a place to sound |
| 17 | **hurt** — the medium's lowpass dips and the low shelf lifts for `P.hurtT` | the flinch, heard |

And the one that is the payoff of the 3D system:

| # | sound | placed at |
|---|---|---|
| 18 | **passing bodies** — the water a creature displaces: noise, gain ∝ size²·speed, cutoff by size (a big thing is low) | the six nearest moving bodies (`FLOW`, already gathered per frame for the snow), panned, occluded. Not a voice, not a call: water. Something big going past behind you is the whole point of placing sound (Q4) |

Nothing else about creatures is touched. Their voices, if they get any, would be one line each on a spec (`voice:` a
generator id) and a voice from the same pool — the hook is there, unused.

## What it doesn't do, and why

- **No HRTF on low tier** (`Q.hrtf` 0: equal-power panning): HRTF is the one thing here that costs the audio thread.
- **No per-source early reflections**: one bounce per listener is the approximation; per-source image sources would be 3 delays × 8 voices and buy little at this fidelity.
- **No Doppler**: Web Audio's is deprecated and the water's is a quarter of the air's.
- **No music bus content**: the bus exists (`music`, before the compressor, untouched by the medium filter) for the person's.
- **No assets**: everything is generated. If a generated sound reads as wrong, its recipe is ten lines to change.

## Delivery

`src/audio.js` rewritten (the graph, the pool, the probe, the sources), calls in `player.js` (the self sounds, the contact
flags), one line in `physics.js` (`solidPush` reports the flora/rock of its last push), `atmosphere.js` (the medium and rain
lines move into `updateAudio`), `main.js` (`updateAudio(dt)` after the camera, and the readout line), `test/stub.js` (the fake
`AudioContext`). Volumes get a `Q.vol` and the `M` key stays. The readout's tuner gains no keys — the numbers are in the
tables above and in DESIGN, The sound (new section), where the person can ask for a change by name.

**Unseen and unheard**: the sandbox has no audio output. What can be proved here: the graph builds, every path runs
headlessly, no NaN reaches a param, the probe's numbers are sane at the peak, on the shelf, over open water (the pit until v11.95) and at the vent (printed
by the smoke test). What can't: whether it sounds like water. The person listens; the first things to ask are whether the
slosh follows the chop, whether a rock face is audible on its side, and whether anything is too loud.

## Questions (defaults in bold; answer only where the default is wrong)

1. The listener: **at the player's body, facing as the camera** — or at the camera itself?
2. HRTF panning on desktop: **yes** (better front/back and up/down; costs the audio thread a few percent) — or equal-power everywhere?
3. The reef crackle (#8), the one biological bed: **in, quiet, by `nut` and the night** — or out until the animals get their turn?
4. Passing bodies (#18): **in** — or leave every creature silent, water included, until their pass?
5. The four existing thumps: **routed and given a transient, content left to pass B** — or left exactly as they are?
6. Above water: **the minimal air set** (wind, lapping, rain, the filter opening) — or nothing new above the surface?
7. Anything in the source tables to strike or add before it is built?

## The overhaul (27 Nov 2026)

The person asked what would let a session make and test sound with them, for an overhaul of the game's audio. The discussion's conclusion:
nobody here can hear (a session takes no audio in), so the overhaul's limit is how good the stand-ins for an ear are and how cheap it is for
the person to listen and say what they heard. The person's answers, 27 Nov 2026:

1. **They listen on headphones.** HRTF panning stays (`Q.hrtf`); where a sound sits around the head is worth the audio thread's few percent.
2. **Creature voices are in the overhaul's scope; music is not** — it is the person's. The `music` bus stays empty and nothing here touches it.
3. **They will do a blind listening pass on each audio pull request** (about ten minutes, `listen.html` on its preview, below).
4. **The network may be opened** to huggingface.co and freesound.org when phase 4 needs it (both are blocked in a cloud session today).

The plan, each phase its own pull requests:

1. **The instruments** (v11.248): every sound rendered headless and measured, its numbers held in CI, and the listening page. Nothing heard changes.
2. **The engine**: the sources as plain functions (samples out, no Web Audio types) run in an AudioWorklet in the game and in Node in the tests —
   the same code to the sample, a cost a voice that can be measured, renders by the thousand for a search — with placement and the reverbs left
   to the browser's own nodes (the panner, the convolver). The recipes move one for one first; test/sound.json proves nothing moved. An
   AudioWorklet wants https or localhost: the site is fine, a tethys.html opened from the disk keeps today's graph as its fallback. Faust
   (faustwasm) only if a recipe outgrows plain functions.
3. **The sound, from physics** (PLANET's rule holds for the ear): bubbles that ring at their size (Minnaert: ~3.3 kHz a millimetre of
   radius), rain under water as its own bubble signature, knocks by modal synthesis from the material and the size, and **the creatures' voices
   derived from their specs** (`derive`: the body's length sets its formants, a bigger animal lower with no knob). Recipes, never files: no
   generated sample libraries (they cannot follow the world's state and are cakes, the root CLAUDE.md's rule 3).
4. **Learned ears and real water** (with the network opened): an audio classifier and a text–audio scorer (AudioSet's classes, CLAP) as a
   regression check on what a sound is heard *as*, and the texture statistics of public-domain hydrophone recordings (McDermott and
   Simoncelli's: a rain or a crackle is heard by its statistics) kept as small JSON targets, not recordings.

## The ear's instruments (v11.248)

- **`node test/sound.js`** renders every sound in headless Chromium through the bench (`src/bench.js`), offline and with `Math.random` seeded:
  the thirteen one-shots, the material (four noise buffers, two impulse responses), every bed alone (22: the pressure's two sines joined
  them), and **the whole mix at eight places** — the bench places (test/benchpage.js `PLACES`) and the vent — the whole graph (`auGraph`) built
  into an OfflineAudioContext with the game's own tick (`auTick`) run against it at 20 Hz while the world steps between. One-shots, material and
  beds are the same to the bit run to run; a mix moved some hundred samples of 768,000 (8 s) by one step of sixteen bits (float order in the audio
  thread), so "the same sound" is `fp`, a hash of its numbers.
- **The numbers** (test/spectro.js `measure`): loudness in **LUFS** (BS.1770, K-weighted and gated; within 0.1 LU of ffmpeg's ebur128), the
  loudest 3 s, peak, crest, centroid, roll-off, five band shares, attack, decay, steadiness, clipping. **`test/sound.json`** holds them;
  `--check` fails when one moves past its tolerance, `--update` writes it — a change that moves a sound says so in its diff, as test/gpu.json
  does for the GPU. **CI holds the recipes only** (`--check --recipes` in `npm run smoke`, ~45 s; the person, 28 Nov 2026): the mixes move
  with the creatures as well as the sound, so they are checked by hand on an audio pull request, and heard.
- **`listen.html`** (on the site beside the game; its mp3s and `listen/index.json` made at publish by `test/sound.js --dist`, pages.yml): every
  mix, one-shot and bed to play, and on a preview every sound that differs from main's played **blind** — A and B in step, switched at the same
  instant, the louder brought down to the quieter unless asked (louder reads as better) — a verdict revealing which was which. "Copy for the
  pull request" makes the verdicts and notes one block to paste as a comment. A sound whose numbers are main's takes main's file, so the site's
  history keeps one copy; and the set is rendered only when the sound's sources changed — otherwise main's live set is copied (`--copy`).

**What the first full render says** (v11.248, before anything is changed; test/sound.json):
- The mix is **quiet and dark everywhere**: −29.6 LUFS at the vent, −36.6 in the forest, −40.5 in open water; a game is usually mixed to −24 to −18.
  Every place's centroid is 107–326 Hz and nothing reaches past 2 kHz above a hundredth of the energy — at the coast and in the wood too,
  where the medium is air and the lowpass opens to 16 kHz.
- The one-shots are still v11.34's finding: eleven of thirteen are one low thud (centroids 62–392 Hz, decays 260–385 ms), the knock has no
  knock in it, and the weed's brush (−49.7 LUFS) is the only one of its own.
- The crackle (`bed_crackle_l`/`_r`) is −57 LUFS at the bench's fixed level: the best texture in the game, near silence in play.

