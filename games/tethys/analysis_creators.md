# analysis_creators — how Spore-like creature creators shape a body, and what Tethys takes

**Status: the investigation (26 Nov 2026), and its first build, v11.246 (the spine: CREATOR.md "Sixth round"); the person's answers to its
questions (26 Nov 2026) built in v11.246.1, and the shape's drag ("Next" 3) chosen next.**

## What the person asked (26 Nov 2026)

*"I want you to do an investigation of games like Spore that have a creature creator. I want you to look at steam games like planetary life, the
sapling, thrive, etc. but I'd say the sapling and spore itself are the two that resemble the game the most. I want that kind of creature creator —
and this means doing some serious reworking of the creature logic so that they can be segmented. This means that they have to look identical but we
can do the 'drag' feature to allow bodies to be shaped intuitively and not using numbers on a dial. We can tweak it from there but the goal is a spore
or the sapling style creature creator over what we have now."*

Read as: every body becomes a chain of segments; every existing animal must look exactly as it does; the shaping is done by dragging on the body,
not with the panel's sliders.

**How this was researched.** Web pages, developer write-ups and papers, and Thrive's own source. Two sites were blocked from this session
(chrishecker.com and the Spore fan wiki), so Chris Hecker's liner notes and the wiki were read only as search-engine excerpts. Thrive was read
directly from its repository at commit 115e4f3 (26 Nov 2026). Daniel Lochner's open-source *Creature Creator* would not clone (it asked for
credentials), so its internals are unconfirmed. Where a claim below is an inference rather than something read, it says so.

## The games

### Spore (Maxis, 2008): the creature creator

- **The body is a spine; the skin is derived from it.** The torso is a chain of vertebrae inside a "malleable clay-like torso". The skin is one
  implicit surface ("metaballs") over spherical balls laid along the spine and the limbs, rebuilt live as the player edits. Ellipsoids were
  rejected as "significantly slower to evaluate since they're orientation dependent". The surface is a field polynomial in squared distance
  (after Triquet, Meseure & Chaillou, WSCG 2001), tessellated by ear clipping rather than marching cubes (which was patented when the skin was
  written). Negative balls were left out because the speed and stability tricks need positive weights.
  ([Hecker, *My Liner Notes for Spore*](https://chrishecker.com/My_Liner_Notes_for_Spore); [Hecker Q&A](https://forum.spore.com/jforum/posts/list/28338.page))
- **Parts are not in the skin.** Mouths, eyes, hands and feet are *rigblocks*: authored models with deformation handles that act "as simple
  sliders", scrubbing a 0–1 parameter through a morph ([Rigblocks, SIGGRAPH 2007](https://www.cs.cmu.edu/~ajw/s2007/0248-Rigblocks.pdf)).
- **Parts ride the spine.** For animation the spine is a quintic Hermite spline, and each of a creature's 20–80 "bodies" is stored as a
  parameter along that spline plus an offset and orientation in its frame, so a part goes where the spine goes
  ([Hecker et al., *Real-time Motion Retargeting to Highly Varied User-Created Morphologies*](https://chrishecker.com/Real-time_Motion_Retargeting_to_Highly_Varied_User-Created_Morphologies)).
- **The gestures.**
  - Click the torso and arrows appear at both ends of the spine; drag one out to add vertebrae, back in to remove them.
  - Drag a vertebra to bend the body; its neighbours follow.
  - The mouse wheel over a vertebra fattens or thins that section; over a part, it scales the part.
  - Drag a part's handles to morph it.
  - Hidden modifiers that players had to document for each other: Alt+drag duplicates, Ctrl+drag detaches a limb, Alt+click adds a limb
    joint, Tab shows rotation rings, A places a part without its mirror, Ctrl or Shift constrain movement.
  ([Spore Tips](https://sporetips.blogspot.com/2008/08/creator-tip-how-to-make-cool-crawling.html?m=1),
  [Steam guide](https://steamcommunity.com/sharedfiles/filedetails/?id=190418618),
  [GamesRadar](https://www.gamesradar.com/au/spore-creature-creator-hands-on/))
- **Symmetry** is on by default: a part off the middle gets a mirrored twin, and "symmetry counts as two parts"
  ([spore.com tutorials](https://www.spore.com/comm/tutorials)). The spine stays in the middle plane, which keeps every creature symmetric
  (inferred).
- **Stats** come from the parts, not the torso. There is a DNA budget (2,000 in the standalone creator) and a complexity meter. Feet give speed,
  mouths diet and bite, hands grasp and strike. Soren Johnson: "the gameplay effects of the creature parts are unfortunately quite discrete"
  ([Designer Notes](https://www.designer-notes.com/spore-my-view-of-the-elephant/)). Nothing found says the torso's shape counts.
- **Known faults** (Hecker):
  - Weights for animating the skin come from which part made which ball, which shears fat torsos.
  - Parts attached to the torso were never fixed.
  - The single field webs nearby limbs together; players exploited this for wings.

### The Sapling (Wessel Stoop)

- **The torso is a chain of segments**; a patch made mutations that add segments more likely, giving "longer necks or tails"
  ([patch notes](https://tuxdb.com/game/7477&gamenews=1)). A posture setting changes which way it grows
  ([v13.41](https://steamdb.info/patchnotes/21629014/)).
- **Gestures:** a red torso-length handle dragged to lengthen the torso ([v13.40](https://steamdb.info/patchnotes/21446740/)); small handles
  that reshape the body, dragged to make long necks; a length handle on body parts and tails
  ([Steam guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3164001661)). Parts are mirrored automatically.
- **The shape counts, and in water** — the most useful precedent here ([fan wiki](https://the-sapling-encyclopedia.fandom.com/wiki/Animals)):
  - *Body Shape Drag* scores how jagged the outline is. The ideal swimmer is "straight, with their thickest part at the front, and their
    thinnest part at the back".
  - *Body Part Drag* counts the parts that stick out.
  - Swimming speed is part speed minus the two drags.
- **What players say:** praised as "more intuitive than most", but "animals never change body shape, only size", parts other than branches and
  the spine can't be scaled, and the camera is a fight
  ([Steam reviews](https://steamcommunity.com/app/997380/reviews/?browsefilter=toprated)).

### Thrive (Revolutionary Games, open source)

- **The microbe and multicellular editors** place fixed hexes on a grid; symmetry cycles none, 2, 4, 6-way.
- **The macroscopic stage's metaball editor** (a prototype, read in its source):
  - **The body** is a tree of balls (`Metaball.cs`): a position, a diameter (0.4–5) and a parent each. A child always touches its parent, and the
    root cannot move.
  - **The skin** is a SCALIS convolution surface over the parent–child "bones", each tapering from one radius to the other, polygonised by dual
    contouring at 3 samples a unit. It is rebuilt only when the layout's hash changes; the code calls these "quite expensive".
  - **Gestures:** pick a cell type and size it first; a ghost ball shows where it will go (faded where it can't); click on a ball to add a child
    touching it at that point; M to move (re-parents to the ball clicked); two rings to swing a ball round its parent; undo and redo; costs in
    mutation points (add 7, move 3, resize 3, a mirrored add double).
- **The developers' own verdict:** the prototype is "fun to use, but ultimately a messy and unintuitive affair"
  ([forum](https://forum.revolutionarygamesstudio.com/t/macroscopic-editor-progression-and-principles/943/12)); a tree of parents is hard to
  read.

### Planetary Life

A parts-on-a-base system, not sculpting: a generic "body part" either enlarges the animal or becomes a proto-limb; legs come from pairs of fins;
exo- or endoskeleton gates the parts. Reviewers find the options limited and the Apply/Back loop tiresome
([discussion](https://steamcommunity.com/app/2471970/discussions/0/603040419439250819/), [review](https://rivalsector.com/planetary-life-is-a-love-letter-to-a-niche-genre/)).
Nothing was found on its mouse gestures.

### Ecosystem (underwater, evolved)

The genome is a directed graph — head, torso, limbs — with a repeat count that makes segmented bodies, in Karl Sims's line; swimming is fully
physical ([developer, Steam](https://steamcommunity.com/app/1133120/discussions/0/3077621289891507503/)). "Add part" became click-to-place
after players were frustrated by parts appearing at a default spot. Its editor is compared to "IKEA furniture without instructions — underwater".

### Others, a line each

- **Creature Creator (Daniel Lochner):** a spine you drag and scroll to fatten, parts from a grid ([itch.io](https://daniellochner.itch.io/spore-creature-creator)).
- **Crescent Loom:** an underwater 2D game where you snap bones, muscles and neurons together; nothing moves that you didn't wire.
- **Two hobby three.js prototypes, 2026:**
  - [sporer](https://github.com/elmaxe/sporer): 3–20 vertebrae in the middle plane, skin rings round them, the wheel to fatten, pulling an end
    dot to grow.
  - [sporetest](https://github.com/NickMarcha/sporetest): an implicit field meshed in a worker, parts kept out of the field.

## What recurs

1. **The player edits a skeleton; the skin is derived.** Spore's spine, Thrive's sphere tree, The Sapling's segments. Nobody sculpts vertices.
2. **One grammar on the nodes:**
   - drag a node to move it, kept in the middle plane;
   - the wheel over a node changes its girth;
   - drag an end outward to add segments;
   - the wheel over a part scales it.
3. **Parts sit on the skin but are not part of it**, stored relative to the spine (a place along it and an offset), so reshaping carries them.
4. **Mirroring by default**, with a per-part opt-out.
5. **Every gesture is one undo step**, with a preview of what it will do.
6. **A visible budget**: Spore's DNA, Thrive's mutation points.
7. **The shape counts only where a game makes it count**: The Sapling's drag and Ecosystem's physics do; Spore's torso is cosmetic.

## Pitfalls seen

- **Remeshing on every drag is the cost.** Spore limited itself to spheres for speed; Thrive's dual contouring is "quite expensive". A ring per
  vertebra costs nothing and keeps the mesh's layout.
- **One shared field webs limbs together**, and automatic skinning breaks on fat torsos.
- **Hidden modifier keys** that players had to document themselves.
- **A tree of parents is hard to read** (Thrive).
- **Parts dropped at a default spot** frustrated Ecosystem's players.
- **Shapes that only scale** (The Sapling) feel locked.
- **A double cost for a mirrored pair** felt arbitrary to players.

## What Tethys takes, and what it doesn't

| from them | in Tethys (v11.246) | why |
|---|---|---|
| a spine of vertebrae under the skin | every core's own segments are its knots: a lathe's rings, a trunk's taper down its plates, a mantle's rings, an ellipsoid's five, a bell's rings | the person's rule: every animal looks identical. The knots are the numbers each core already had, so an untouched body is built by the same arithmetic (`test/spine.js`: all of SPECS to the bit) |
| a metaball skin | **not taken**: the skin is the core's own low-poly geometry — a lathe, plates, a sphere — bent and swollen by its knots | the look is low-poly, flat shaded; a ring per knot is O(n), never retiles, and keeps the build's tape (one recording a kind) working |
| drag a vertebra; wheel to fatten | the same: drag a knot in the body's middle plane; the wheel fattens (shift: height only, alt: width only) | Spore's grammar; the modifiers are written in the panel, not hidden |
| drag an end out to add vertebrae | a trunk or the arches pulled longer grow plates at their pitch; any body takes a knot by a double-click on it | an arthropod's segments are its plates; a fish's rings are not segments it grows |
| parts ride the spine | a bent body's parts are moved and pitched by the bend at their place (`ride`); a part on the surface sits on a bulge | Hecker's spline parameter plus offset, done after the parts are built against the straight body, so no part had to learn it |
| drag a part; wheel scales it | the same, by the part's own numbers (`z`, `y`, and its main proportions) | |
| undo | ctrl+z, a gesture at a time | |
| symmetry by default | as before (the spine stays in the middle plane; a placed part may be mirrored) | |
| a budget | the conception's bill prices a reshape (line.js) | the editor at conception was already this |
| shape → stats (The Sapling's drag) | the calculator already reads volume and frontal area off the build; a fattened knot adds mass and area | the streamlining term (the profile's slope at the nose; CREATOR.md's calculator table) is the natural next step |

## Next, if the person wants it (proposals, not decisions)

1. **The skin turned square to a steep bend.** Rings are kept upright now, which shears past about 40°; Spore and sporer turn each ring to the
   spine's tangent (parallel transport).
2. **Rigs ride the bend.** An arm or leg rooted where the body bends stays where it was today.
3. **Shape → stats, The Sapling's way.** A drag term from the outline: thickest at the front, tapering, smooth. *Built v11.247.*
4. **A ghost before a part is placed, and placing a part by dragging it from the panel onto the body** (Ecosystem's lesson), in place of the add
   list.
5. **Part handles as morphs** (Spore's rigblocks): a mouth's gape, an arm's curl, dragged on the part rather than slid in the panel.
6. **A studio**: a neutral room and a turntable for the editor, in place of the peak's water (CREATOR.md, the size ceiling §6, already asks
   for it).

## Questions (26 Nov 2026) and the person's answers (the same day)

1. **The knots' look:** beads on a line with each section's ring, always shown while the spine is on — or only on hover, as Spore does?
2. **Growth by pulling:** should every body grow segments when pulled (a fish adding rings), or only the hingeshells' plates, as now?
3. **The sliders:** keep the core's sliders under the spine as a fine control, or hide them in the creator (`lab.player`) and keep them only in
   the dev lab?
4. **The bend's limit:** should the clades bend differently — a hingeshell's plates stiff, a ringmouth's mantle soft — as a believable band like
   the parameters' (warn past it), or free?
5. **Which next:** of the list above, which first?

**The answers (26 Nov 2026), built v11.246.1:**
1. *"Only on hover, as in spore."* The knots show while the cursor is on the body, a knot or a part, and through a gesture (`LAB_SP.show`).
2. *"Only the hingeshell."* Only a trunk and the arches grow plates when pulled; the other bodies stretch (as built in v11.246).
3. *"Hide the sliders."* The creator (the menu's word and the conception) shows none of the core's sliders, nor the profile's table; the dev lab
   keeps them. The parts' sliders stay in both (the question was the core's).
4. *"Yes for sure."* A bend limit per clade, `SPINE_BEND` (degrees between the spans either side of a knot): hingeshells 12 believable / 25
   extreme, slowbloods 25 / 50, ringmouths 35 / 70, drifters 15 / 30. Past the believable band the readout warns; the hand cannot drag past the
   extreme. The numbers are chosen, not measured: the person's to tune.
5. *"Absolutely, go for that"* — The Sapling's drag from the outline: built v11.247 (`SPINE_FORM`; DESIGN, The spine). It charges a lump, a bend
   and a fat rear, read off the knots; every species of the roster already has The Sapling's ideal outline, so none changed speed.

