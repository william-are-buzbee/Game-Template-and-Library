# Mockups

Pages for looking at designs before they are built into the game. Each is a single HTML file that runs on its own in a
browser (three.js comes from a CDN), and each has been published as a private claude.ai artifact.

- `creatures.html`: the overseer and its hand, with their states and the knock code.
- `elders.html`: the elders of the lineage (`docs/world.md` §10), at true scale beside a 1.8 m figure, in the game's own
  kit of boxes, cylinders and icosahedra: Pia (her three stages), Ines, Dale and his line, Sam, Tom, and Holt's cave. One
  tab each; buttons switch states. `window.__rs` in the console exposes each scene and its `set…` function.
- `mutants.html`: a bench for Security's changed (`docs/world.md` §8), in the game's kit: sliders for their build and
  their walk (the floor moves at the walk's pace, so a planted foot should hold still), what they still wear, and growth
  clicked onto them (eyes, pustules, leaf shelves, stalks, roots, knots; the wheel sizes them). Saves designs as JSON
  (`rootshock-changed/1`, described at the top of its script); the published copy keeps them where Claude can read them.
  *Security's seven* (the Saved tab) is a line-up of the upper station's changed, one for each, newest to oldest;
  *Pia's lines* are examples of the bone, bloat and plant lines that founded the Commons, young to old and each young god.
  `window.__rs` in the console exposes the state.
- `plants.html`: the plant line bench, Pia's bush line (`docs/world.md` §8 and §10), published as *Plant Line Bench*:
  every plant mutant kept, numbered for good, in rows (Kept, Grown in, Maybe, Dropped) and a generator (templates,
  stages, batches; the same batch number rolls the same ones). Keep, Maybe or Drop each and leave a note; the picks are
  kept in the artifact's store (collection `picks`, one document a figure) where Claude can read them back. Each figure
  is baked into three meshes (still, body, head), so a row of fifty draws in a couple of dozen calls. `?` lists the
  keys; `window.__rs` in the console exposes the state, `select(i)`, `setLine(k)` and `setView(v)`.
- `cargo.html`: Cargo made larger (`docs/world.md` §8, *Cargo, sketched, and built*, which says what the build changed),
  at true scale in the game's kit: the nave, the warehouse arm (room and pillar), the freight shaft at the corner and the
  chambers off them, with the station's rooms round it and the old Cargo as an outline to compare. Overview, plan (a 10 m
  grid) or walk; *Lights out* leaves the nest's glow and your flashlight. Each place picked says what it is for.
  `window.__rs` in the console exposes the scene, `select(id)`, `setMode(m)` and `setDark(b)`.
- `lineage.html`: the family tree and an entry for each elder. Generated: edit `lineage/template.html` (the cards) or
  `lineage/build.py` (the tree's nodes), then run `python3 mockups/lineage/build.py`.

**Testing offline.** Where the CDN cannot be reached, a headless browser can serve three.js from `node_modules`: route
`https://cdn.jsdelivr.net/**` to `node_modules/three/build/`.

**Set aside.** June, a sixth elder, was mocked up and shelved; her tab is in the history at `e0672ba`.
