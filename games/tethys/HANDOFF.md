# HANDOFF — tethys

Where things stand: the latest versions, what to ask the person, what is open. Current state only — every version's whole story is its
CHANGELOG entry, and this file as it stood to v11.191 (220 versions back to v11.18, with the old dated notes) is `archive/HANDOFF-to-v11.191.md`.
Add the new version's paragraph at the top; take out what is no longer true; keep the five latest.

**v11.250 (28 Nov 2026): one kit a clade, one tile a part** (creator.js `CRT_STD`, `crtKinds`, `CRT_ON_CORE`, `crtAdd`; test/creator.js; new
test/gaps.js; CREATOR.md Eighth round; DESIGN; CHANGELOG). The person: *"Every animal of the same clade should have an identical set of tools, parts"*
and *"one part gets one spot on the left side list"*. The creator's column is the clade's: every kind its cores take, one tile each, dropping the
clade's standard style, drawn on the clade's blank — the finback, the ridge and the eel show the very same column (the eel's fins and tail turn its
own on). Configs per part are later. `node test/gaps.js` lists the parts that float off their bodies for the clarity pass (36 of 228 by 1% or more;
the veil's skirt, the crusher's tail, the flicker's eye stalks worst). **Next:** clarity — parts anchored to the skin. **Ask:** the standard styles;
whether every part is free in the creator or still gated by what was seen (now by the kind).

**v11.249 (27 Nov 2026): the ear's instruments — the audio overhaul's first step** (src/audio.js `auGraph`; src/bench.js `bnGraph`, `bnBed`, `bnMix`;
test/sound.js, test/sound.json; test/spectro.js LUFS; listen.html; pages.yml; AUDIO.md "The overhaul", "The ear's instruments"). Every sound rendered
headless and offline — one-shots, beds, the whole mix at eight places — measured (LUFS) and held in CI (`npm run smoke`); on every preview
`listen.html` plays each sound that differs from main's blind, and copies the verdicts as a comment. Nothing heard changed. The person's answers:
headphones, creature voices in scope, music theirs, a blind pass per audio PR, the network opened later. First finding: the mix is quiet (−30 to
−41 LUFS) and below 2 kHz everywhere. **Next:** phase 2, the engine (AUDIO.md). **Ask:** the mixes on the preview's listen.html; CI's 7–10 minutes.

**v11.248 (27 Nov 2026): the creator as a picture — the words taken away** (new src/creator.js; shell.html `#crt`; lab.js `labRedo`; test/creator.js;
CREATOR.md Seventh round; DESIGN; CHANGELOG). The person: *"remove 95% of the text … a tasteful, minimalist thing my dad can use to make a creature."*
The creator (the menu's word and the conception) has no panel: the parts are pictures in a column, dragged onto the body and off it; a bar of icons
(undo, redo, turn, swim, act, start from another, keep, done; lay and decline at conception); colour swatches; the name with three thin bars. Only the
name is a word. The dev lab keeps its panel. **Next:** the person's images for the style and the stage.

**v11.247 (26 Nov 2026): the shape's drag, The Sapling's** (creatures_spec.js `SPINE_FORM`, `spineForm`, derive's `form`/`formWhy`; lab.js the caption;
test/spine.js; DESIGN The spine; CHANGELOG). The person: *"Absolutely, go for that."* A swimmer's drag coefficient × `form`, read off its knots: a lump
(girth past one rise and fall), a bend (the middle line off straight), a fat rear (widest girth past 0.6 of the way back). Every roster species is at 1
— none changed speed; a hand-made hump near a finback's tail is ×1.5 drag, 6.1 → 4.8 m/s. The lab's caption says why. **Ask:** the weights' feel
(lump 0.5, crook 0.5, rear 1.5); whether a body thicker at the front than the roster's should be rewarded.

**v11.246 (26 Nov 2026): the spine — every body a chain of knots, shaped by hand in the lab** (creatures_spec.js `SPINE`, `spineMove/Size/Add/Del`,
`spineRide`; parts.js `G.loft`, `G.ellK`, `knotV`; lab.js "the body by hand"; line.js the bill; test/spine.js; analysis_creators.md; CREATOR.md Sixth
round; DESIGN Creatures, The spine; CHANGELOG). The person: a Spore or Sapling style creator, *"they have to look identical but we can do the 'drag'
feature"*. The investigation is analysis_creators.md. Every core's body is now knots in its own numbers (a lathe's rings, a trunk's taper, a mantle's
rings, an ellipsoid's five, a bell's rings), so every species builds to the bit as before; in the lab the knots are beads on the body — drag to move
or bend, the wheel to fatten (shift height, alt width), double-click to add or remove, a trunk pulled longer grows plates; parts drag along it and
scale by the wheel; ctrl+z. **Ask:** analysis_creators.md's five questions; then in `#lab` the finback, the soft-arm, the sickle and the coilshell
shaped by hand — whether the beads, the rings and the gestures read. **v11.246.1**, the person's answers: the knots only on hover; the creator without
the core's sliders; a bend limit per clade (`SPINE_BEND`: hingeshells 25°, slowbloods 50, ringmouths 70, drifters 30 at most). **Ask:** the limits'
feel; whether the parts' sliders go from the creator too.

## Open

- **The plan** (analysis_project.md, the person's order, 20 Nov 2026): 1 the recorder (v11.191), 2 the docs (v11.192) and 3 the type checker (v11.193)
  done; 4 the flora's far copies built (v11.194) and struck (v11.201), and the tier that follows the machine (v11.199, the person's call); 7 a fixed step and seeded sim done
  (v11.209, v11.210); 6 three.js: the spike scoped it (4–6 days, analysis_project.md §6), v11.215 did the loading and the fixes that work on both
  versions, the rest after the tower's F8 (the person, 22 Nov); 5 the cells in workers: judged low value against the world cache (v11.214), not
  started; one door and its key end to end at any point.
- **Reports** (`node test/report.js --search`): #137 and #138, a work tower `20e1` (Intel UHD 730): high tier 82 ms a frame, the GPU 84 ms (main
  pass 75), 3.9M triangles; `#low` 33 ms, the GPU 35, 1.6M triangles — the GPU fell with the triangles (×0.41 against ×0.40), not the pixels (×0.81).
  They are step 4's before. The desktop tier is `high` on that chip; the boot under `#low` had a 7.4 s menu frame the recorder does not itemise.
  #141–#144, the home machine `kasd` (Brave hides the card), v11.194: 120 fps, the GPU 7.8–8.8 ms of 8.3; its freezes were the save store's read
  (v11.195) and write (v11.196), and the collector (200–325 ms every minute or two; the heap 1.5 GB in play, 2.9 GB at the list's reads — the old
  list held every slot whole). #144 is `#lod` at another place and size than #143, so no pair yet: one more without `#lod` at tp(-8479,5431,-11)
  in the same window settles it on that card (the work tower's pair still decides).
- **The person's open lists**, each in its doc: analysis_loading.md §4 (the loading page's look, one wait or two, a cache in the browser);
  analysis_fog.md (its questions); BIOLUM.md §7; WATER.md Part 5 (light across the line, an audit, nothing built); DEEP.md §11 (the
  constructors' place); analysis_archipelago.md §8.4; DIRECTION.md's Open list; LINEAGE.md §11 and §7c.4; SEAFLOOR.md §6; PIXEL.md (ready to build).
