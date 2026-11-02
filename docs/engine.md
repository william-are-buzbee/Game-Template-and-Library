# Rootshock: the v2 engine

The plan for rebuilding the game on foundations that can take new features without surgery. It records what has been
agreed, what is proposed, and what is still open, in the same way as `world.md`. Status markers:

- **Agreed**: decided; build to it.
- **Proposed**: the recommended direction, not yet committed.
- **Open**: needs a decision before it is built.

`world.md` says what the game is. This document says how it is built.

---

## 1. Why rebuild

The first engine (`index.html`, one file; now `archive/first-engine.html`) grew a 3D world on top of a 2D engine, and
only part of the engine followed.

- **Two physics worlds.** The player uses `probe()`, which understands stacked layers, terrain, stairs, elevators and
  ceilings. Mutants, dropped items and melee use `collides()`, a flat tile mask: to them a 30 cm crate is a wall and a
  stair is rock. Mutants never fall, climb or change layer; their height is snapped to the terrain.
- **Sight and pathing are flat and local.** `los()` checks one layer's tiles. Flow fields are rebuilt only for the
  layer the player stands on, so mutants on other layers of the same level follow a stale field.
- **Every feature is threaded through many places.** A door lives in the mesh builder, `collides`, `probe`, `los`,
  `bfs`, `nextTile`, the frame loop, `occupied` and the lighting pass. Adding a new kind of thing means editing all
  of them.
- **Simulation and presentation are tangled.** Game state, three.js meshes and DOM updates share functions. There is
  no save/load, no headless run, and nothing to test against.
- **Variable timestep, unseeded randomness.** Jumps and falls vary slightly with frame rate; level dressing changes on
  every load.

None of this is a reason to lose what works. The content, the look, the sound and the feel carry over (§12).

---

## 2. Decisions so far

- **Agreed: a rewrite, not a retrofit.** The engine is rebuilt; content and design are carried over.
- **Agreed: it lives in `v2/`** until it replaces the first engine. **Done (step 9):** it is the game, at the repository
  root; the first engine is archived at `archive/first-engine.html`.
- **Agreed: TypeScript.** Types catch the class of mistake a game this size keeps making (a tile index where a metre was
  meant, a missing field on a level definition) before the game runs.
- **Agreed: a build step (Vite).** The source is many small files; a build tool bundles them into a static page.
  `npm run dev` serves it with live reload; `npm run build` produces the files to publish.
- **Agreed: the new station only.** v2 builds the station from `NEWSTATION` (the `?dev=newstation` levels). The old
  six-floor station is not ported.
- **Agreed: no general physics library for the world or the cast.** The world is a station of rooms, shafts and caves,
  not a pile of rigid bodies. A purpose-built world model (§4) fits it; cannon or rapier would fight it. One was
  proposed for debris alone (corpses that fall loose, crates that tumble), fed the grid as static colliders and never
  asked anything by the sim's rules (§6, *What a solver is for*). **Decided against, for corpses:** they fall loose by
  a small purpose-built ragdoll that asks `world.ts` what a body asks it (§6, *Bodies with physics, as built*).
- **Agreed: current three.js from npm**, replacing r128 from a CDN.

---

## 3. Architecture

Four layers, each depending only on the ones above it:

```
content   level definitions, items, the cast, notes (pure data plus authoring helpers)
   │
world     compiles a level into one spatial model and answers every spatial question
   │
sim       entities, components, systems; fixed step; seeded; no three.js, no DOM
   │
present   renderer, audio, HUD and menus; reads sim state, sends input in
```

**The one hard rule (agreed once this doc is agreed): `sim/` and `world/` never import three.js or touch the DOM.**
That is what makes save/load, a headless run, tests and the progression checker possible.

### Layout (proposed; at the repository root since step 9)

```
  index.html
  package.json, tsconfig.json, vite.config.ts
  src/
    main.ts              boot: load content, build world, start loop
    core/                maths, seeded rng, fixed-step loop, events
    content/
      station.ts         the levels, circuits, ladders (from NEWSTATION)
      levels/upper.ts …  one file per level
      build/             authoring helpers: room, cave, tunnel, door, props (today's bx, shelf, tbl …)
      cast.ts, items.ts, notes.ts
    world/
      compile.ts         level definition -> world model
      grid.ts            sparse cell grid, chunks
      query.ts           solidAt, sweep, raycast, groundBelow, overlap
      nav.ts             nav graph and flow fields
      light.ts           the light under the power, from lightField.ts (each source's light, per 0.5 m point)
    sim/
      ecs.ts             entity store
      components.ts
      systems/           physics, movers, doors, power, ai, perception, combat, interaction, inventory, air …
      save.ts
    present/
      render/            mesh from authored geometry, the shader, viewmodel
      audio/             the synthesised sounds
      ui/                HUD, inventory, notes, keypad, lift panel, map, dev panel
    dev/                 ?dev tools, collider and nav overlays
  test/
```

---

## 4. The world model

The central decision. Everything spatial (collision, sight, sound, pathing, light) asks one structure, so a new kind of
thing is added once.

### Options considered

- **A. Generalised layered grid.** Today's model with its gaps closed: per 2 m tile, a list of floor/ceiling spans,
  plus heightfields. Cheap, fits current content. Weak at anything that is not a column: overhangs within a tile,
  slanted walls, vents, props.
- **B. Authored volumes compiled to a sparse 3D cell grid.** Uniform queries; caves, shafts and walkways stop being
  special cases. Costs memory and a compile step, both small at station scale.
- **C. Free meshes and a navmesh.** Most flexible; needs editor-grade tooling. Overkill.

**Proposed: B.**

### How B works

- **Authoring stays in shapes.** Levels are still written as rooms, caves, tunnels, doors and props, in plan metres
  (the station's one shared frame: x east, z south, y up from the surface, as the level builders use it now).
- **The compiler produces a query grid**: cells of 0.25 m, stored in 16³ chunks, only where there is space (rock is
  the default and costs nothing). Each cell holds what is there: rock, a room (open), or a block (solid built back
  into a room); later, flags such as `water`, `climbable`, `crawl`.
- **Surfaces are meshed from the grid (agreed, built in step 1).** Wherever open meets solid there is a face; faces
  are merged into the largest flat rectangles that share a colour, then cut where the palette changes (dado and
  stripe on walls, the 2 m checker on floors). For axis-aligned rooms this is exactly the flat look of the first
  engine, and it guarantees that what you see is what you collide with. It means **built geometry snaps to 0.25 m**.
- **Slopes and caves (agreed, built in step 2): sloped surfaces.** A ramp, a cave floor or a cave ceiling is a
  heightfield: heights on a lattice (0.5 m for caves), blended between. A floor is solid from a base up to it; a
  ceiling, from it up. They are answered exactly, not by the grid, so a ramp is smooth to walk and to look at. A cave
  is a room carved in the grid from its lowest floor to its highest ceiling, with a floor surface and a ceiling
  surface inside; the walls are grid walls, plain rock with no dado or stripe.
- **Walls at an angle (built).** The grid's faces are its cells' faces, so a wall at an angle carved in it is a staircase.
  Instead a wall is a solid of its own (`WallDef`, `LevelDef.walls`): a straight run from one point on the plan to
  another, some thickness about that line, from one height to another. It is a turned box among the fixed solids, and
  every query answers it exactly (`meetsTurned`, `segmentTurned` in `world/shapes.ts`), so a body stops at its face,
  sight and a swing at its surface; the light field stamps it as it stamps a prop (light stops at it, though the cells
  either side are open); the mesh draws each face in the finish of the room in front of it, dado and stripe and all, cut
  where that room changes along it (`wallMesh` in `levelMesh.ts`); the shader lays a pattern along it, whichever way it
  faces. A room can have any outline (`RoomDef.poly`): carved cell by cell, each cell whose middle is inside it. The
  staircase its sides at an angle make is hidden by the walls standing on them: a wall at least `WALL_MIN` (0.36 m)
  thick, centred on the side, covers half a cell's diagonal either way. `LevelBuilder.outline` walls an outline's sides
  at an angle itself, closing its outward corners, and leaves open the sides it is told to (for a way through, put up
  the wall with a gap in it: `wall()`, twice). The test bed's angled hall, south of the lab, is one, with an annex
  through a gap in a wall at 127 degrees (`test/walls.test.ts`).
- **Levels in metres (built).** Levels were laid out on the first engine's 2 m tiles (`tiles.ts`, retired), so every
  room, wall and door was a tile or a run of them: walls 2 m thick unless marked as partitions, a single door's opening
  set against one end of its tile, and anything where two tiles met decided by which tile it was in. They are written in
  metres now, on `content/build/plan.ts` (and `furnish.ts`, the furniture): floors at their heights, rooms as boxes or
  outlines anywhere on the quarter-metre grid, a door at the middle of its opening on whatever wall is there (`span`
  for a single door's stretch of wall), a wall at any angle. A partition is two rooms drawn half a metre apart; a room
  that reaches a partition past the rest of its side has a strip drawn as more of it (`RoomOpts.part`: no fittings of
  its own). The compile paints each floor on the grid and asks it what is where, so doorways, slabs, rails and frames
  follow what is drawn, not tiles. Ported level by level against a saved build of each (`test/probes/golden.probe.ts`,
  `EQUIV`), then tidied of the tile units, build for build. On the way, walking every place where two rooms touch with
  no wall found what the tiles had left open on the upper station: room 4's corner at the stair's foot (the partitions
  never met, the bay holding the tile between), the isolation hall's upper half open to the check-in hall and screening
  beside it, and the upper corridor open to the lobby's void (`test/upper.test.ts`); and on the main level the square's
  shops and the flats over them, wall to wall with nothing between (flat C2's card lock kept nobody out of it). Every
  contact left is listed in `test/contacts.test.ts` with why it is meant, and one that is not listed fails it.
- **Small props** (crates, tables, shelves) are not stamped into the grid. They are boxes, oriented boxes or cylinders
  in a spatial hash, so they can later move.
- **Everything that moves is a `Dyn`**: a box the sim keeps up to date in the world's list. Doors, platforms, loose
  crates and bodies (a body's bounding box) all are, so each of them collides with all the others through the same
  queries, and a query names which one it hit.

### Queries (the whole API)

Shapes are footprints on the plan (a circle for a body, a rectangle for a crate) between two heights.

| query | used by |
|---|---|
| `solidAt(p)` | everything |
| `overlap(footprint, y0, y1)` → what it hit | movement, crushing checks, pushing crates |
| `sweep(footprint, y0, y1, delta)` → how far it gets | movement, sliding crates |
| `pushOut(footprint, y0, y1)` → the smallest nudge free | getting unstuck |
| `groundBelow(footprint, top)` → height | standing, stepping, falling |
| `ceilingAbove(footprint, from)` → height | jumping, standing up |
| `raycast(from, to)` → fraction of the way clear | sight, aim, melee, flashlight |
| `waterAt(x, z)` → surface | wading, swimming, air |
| `roomAt(p)` → room | room names, light, sound, AI territory |

Each query is answered against the grid, the fixed solids, the sloped surfaces and the moving solids, in that order.

---

## 5. Entities and components

**Proposed:** plain objects with optional parts, held in a small entity store. Not a full ECS library.

A thing is defined by which parts it has:

| component | holds |
|---|---|
| `transform` | position, yaw |
| `body` | radius, height, crouch height, velocity, grounded, mass, movement abilities |
| `health` | hp, armour, damage sources |
| `ai` | brain type, state, target, memory |
| `senses` | sight range, hearing, light sensitivity |
| `interactable` | prompt, range, action |
| `powered` | circuit, needs (backup / full) |
| `lock` | card, code, unlocked |
| `mover` | shape, positions, speed, what it carries |
| `light` | colour, radius, flicker |
| `item` | item id, count |
| `noise` | loudness this tick |

Examples:

- **Door**: transform + mover + powered + lock + interactable.
- **Husk**: transform + body (opens doors) + health + ai + senses.
- **Work lamp**: transform + light (+ a prop collider).
- **Dropped crowbar**: transform + item + interactable (+ body, if things fall).

Systems run in a fixed order each tick: input → ai → physics → movers → doors and power → combat → interaction →
perception → air and light → events out.

---

## 6. Physics

- **Fixed step at 60 Hz** with an accumulator, rendering in between (agreed in principle; part of the determinism
  in §10).
- **Bodies are upright cylinders.** One controller for the player, mutants and falling items: move and slide along
  walls, step up to 0.5 m, gravity, ceilings, crouch, fall damage. Push out of anything a body ends up inside
  (depenetration), so nothing gets trapped.
- **Movers carry bodies.** Standing on an elevator moves you with it. A closing door either stops or pushes; it never
  passes through a body.
- **Body against body** resolves by mass: the player can be shoved, and can shove things lighter than they are.
- **Abilities live on the body**, not in special cases: `opensDoors`, `low` (under jammed doors), `big` (no doorways),
  `swims`, `climbs`, `fixed`.
- **Water** comes from cell flags: wading slows you, deep water switches to swimming, air runs down.
- **Agreed: physical objects**, as long as they do not cost the frame rate. Kicked crates, thrown items, bodies that
  slump. Proposed way to keep them cheap:
  - **Asleep by default.** A crate is a static prop until something touches it (a kick, a shove, a blast, a body
    falling on it). Only then does it become a body: gravity, slide, collide, settle.
  - **Asleep again when still.** A settled object goes back to being a static prop in its new place.
  - **Simple shapes.** Boxes and cylinders that stay upright or tip onto a face; no tumbling rigid-body solver.
  - **A budget.** A fixed number awake at once (start at 16); past that, the oldest settles where it is.
  - **Measured.** A step-2 test level with a pile of crates, timed headless, decides whether the budget holds.

### The fight is physical (proposed)

`world.md` asks for fights that are about timing, not spacing: you commit to a blow and live with it, two husks are a
problem, and what you weigh and how fast you are going is in what you hit. That needs a few things under the sim that
it does not have yet. None of them is a solver; all of them are the body controller and the combat rules, done once
for everything that fights.

**The principle: one set of rules for both sides.** Mass, momentum, commitment and recovery are the same for you and
for the cast. A husk's blow and yours are the same thing at different weights; what knocks you down is what your axe
does to something lighter. You learn the rules by having them used on you.

**F1. Bodies with velocity and mass.** A body has a velocity on the plan as well as up and down, and a mass in
kilograms. You no longer move by a stride straight from the keys: you speed toward the velocity you want, at a rate
your footing allows (full on the ground, a little in the air, slow in water), and what you carry slows the change. One
function, `push`, changes a body's velocity, and everything that shoves goes through it: a thresher's charge, a blow
that knocks something back, a launch. A body moving faster than it can move itself has been thrown, and slows by
friction rather than by choice. Moving into a wall takes the velocity into the wall away and reports how fast that was
(the slam), as a landing reports its fall: wall damage (F3) reads it. **Built** (below). The cast at first still
steered by a step from their behaviours, with their velocity holding only what was done to them; they move by velocity
too now (*The cast by velocity, as built*, below).

**F1b. Bodies are solid to each other.** You walked through husks, skitters and worms: only the bloat, the thresher
and the hand stopped you, and the cast passed through you. So you could not be cornered and two husks could not hold
a corridor against you. Now every body stops every other, and one moving into another shoves it by mass, as two
bodies meeting share their momentum: you push a husk at about half your pace, a worm almost at your own, a thresher
barely, and a bloat not at all (it is rooted where it sits). A husk or a skitter shoved this way knows you are there.
**Built** (below).

**F2. One kind of action for both sides.** Your swing (`combat.ts`, `Hands`) and a mutant's blow (`cast.ts`, `BLOWS`)
are two implementations of one idea. Both become moves, written as data: phases (wind-up, active, recovery), and for
each what the body may do in it (how fast it may move, whether it may turn, what cancels it), where it can hit, and
what a hit carries. Over every action sits a **reaction ladder**: flinch (a wind-up lost), stagger (a stumble, open),
knockdown (on the floor a while), launch (thrown, then down). Which one comes is set by the hit against the body's
**poise**: a threshold, never a roll, so the same blow does the same thing every time and can be learned.

- **Commitment is in the blow, not the camera.** Taking the view from you in first person reads as the game failing.
  The line of a blow is fixed as it commits, as a husk's already is; you look where you like, and the blow goes
  where you sent it.
- A heavy blow carries a step forward, and one that meets nothing leaves you longer coming back. A short buffer
  (about 0.2 s) keeps commitment deliberate rather than unresponsive. (Proposed too, built, and set aside after
  playing: a held load that tires and drops, slower feet while loading, and hits that cancel your wind-up. See *F2,
  as built*.)
- A second husk waits for the first one's opening, which is yours: the recovery of a blow you committed to.

**F3. Hits are impulses.** What a blow carries is the speed of what strikes (the weapon's head, by how far the swing
was loaded) plus the body behind it, along the line of the blow, times an effective mass by the weapon. That drives
the damage, the poise it breaks and the push it gives, by one function for both directions. Running into a blow is
running into its strike: the counter hurts both. A blow is swept through the world across its active part, not
tested at one instant: an axe can take two husks in one sweep, and **a blow that meets a wall glances and staggers
whoever threw it**, so the big axe is a poor choice in a vent. Slams into walls hurt, as falls do, and the cast take
fall damage too, so a ledge is a weapon. In two halves: **F3a**, what a blow carries, slams and falls (built, below);
**F3b**, blows swept through the world and glancing off it (built, below).

**F4. Ways to see it.** Headless duel tests that script inputs and check what follows (a running axe blow floors a
husk; a standing one does not; committed to one husk, the second lands). A fight arena in the test bed. A dev
overlay of reach and arcs, poise and velocities, with slow motion.

**Knockdowns** sit on F2 and F3. A body has a posture: standing, crouched, down, getting up. A launch is a push with
some of it upward; gravity and landing do the rest. You knocked down: the view is thrown along the hit, lands low and
tilted, and you are down about a second; the cast use it (a husk stomps whoever is down). Getting up gives a moment of
extra poise, not immunity, so a knockdown cannot chain into a death. A husk knocked down has a pose (`castView`), and a
blow to it counts for more. These are authored, not simulated: the cast are boxes and blobs, and a reaction that is
written reads better than one that is solved. (Built so; since, the cast's knockdowns are drawn loose, the rules as
they were: *Bodies with physics, as built*.)

### What a solver is for (proposed)

Rapier (or cannon) gives none of what the fight needs: no phases, no poise, no blow that trades, no momentum in the
damage. Its character controller does what `body.ts` does. Taking it as the foundation would mean feeding it the grid
and the caves' surfaces while still asking `world.ts` for sight, sound and paths, and saving its snapshots in place of
plain data. What it is good at is debris: corpses that fall loose, crates that tumble, a body skidding down a stair.
Those sit on top of the game. If it comes in, it comes in for them, after the knockdowns, as a layer of its own. When
it came to corpses, it did not: a few points and sticks asking `world.ts` did the job, and kept a corpse plain data
(*Bodies with physics, as built*, below).

### Order

F1 and F1b, then F2, then F3, with F4 built alongside from the start; then the tuning. A solver waits until there is a
corpse worth throwing.

### F1 and F1b, as built

- **Velocity.** A body has `vx`, `vz` (m/s) and `mass` (kg). Yours is 75 kg and what you hold. On the ground you speed
  toward what you want at 30 m/s² (less by 5% a kilogram of weapon in hand, so the axe makes you slower to start and to
  stop); in the air at a third of that, wading at a half, swimming at a quarter. Past what you could go yourself, you
  have been thrown, and friction (24 m/s²) slows you whatever you do.
- **`slide`** moves a body by its velocity and takes away what a wall stopped, axis by axis; how much is its `slam`.
  **`push`** adds to a body's velocity; `impulse` is a push by a momentum, so mass tells.
- **The cast** kept their own steering at first, their velocity what was done to them, slowed by friction (28 m/s²,
  which keeps a blow's knock back at the 0.3 m it was); since, they move by velocity too (below). The thresher's charge
  throws you at 9 m/s, as it did.
- **Shoving.** When you move into one of the cast, you and it go on at the pace you would share if your momentum were
  shared between you: your pace times your mass over both, by the pace you were going or meant to go, whichever is
  more (so a rush into one hits harder). While it is carried so, friction does not slow it as well. Measured walking
  (and running): a worm (25 kg) 2.4 m/s (4.2), a skitter (45) 2.0 (3.5), a husk (80) 1.55 (2.7), a thresher (220)
  0.8 (1.4), the hand (300) 0.6 (1.1), a bloat none. One of the cast moving into you shoves you the same way. A husk or
  a skitter you walk into knows you are there, and hunts.
- **Tests**: `test/momentum.test.ts`.
- **Saves** carry each body's velocity (save version 4).

### F2, as built

- **Moves** (`sim/moves.ts`): every blow of the cast is a `Move` in one table (`MOVES`, which was `BLOWS`), with its
  motions, reach, damage, the poise it takes, and its armour while winding up and while striking. Yours are worked
  out from what you hold (`swingOf`: the poise a full blow takes, the step it carries you, the recovery when it meets
  nothing). The two sides still run their own code for the motions
  (`combat.ts`, `updateHands`; `cast/blows.ts`, `blowStep`), but read the same kind of data and the same ladder.
- **The ladder**: `react(left, max, hit, armour)`. A hit takes poise. Broken: **stagger** (it reels, open; its poise
  comes back whole). Not broken, but more than the armour of the part it is in: **flinch** (a wind-up or a strike on
  its way is lost). Otherwise **none**. Poise comes back once left alone a second, at half the whole a second. A blow
  that catches one open (recovering from its own) takes 1.6 times the poise and holds it 1.6 times as long.
- **Poise**: you 30; a worm 12, a skitter 20 (a big one 40), a husk 25, a thresher 70, the hand 90; a bloat cannot be
  moved. **What a blow takes**: a husk's 20, a skitter's 18, a thresher's 45, its charge 60; yours, at full, 12 a
  kilogram blunt and 9 edged (the baton 13, the pipe 29, the axe 29), fists 4; a pistol round 22, a shotgun 60.
  So one blow of the axe or the pipe staggers a husk, the baton takes two close together, fists only flinch it; two
  husk blows close together stagger you. On you the ladder has one rung: you reel, or you do not (below).
- **Armour** (the cast's): a thresher winding up shrugs off 30, striking 60; a skitter winding up 10, so fists do
  not put it off its drop; a husk striking 12. Armour keeps a blow going; it does not keep poise from breaking.
- **Every blow is a whole blow.** The arm comes up as fast as the weight in it allows (0.45 + 0.2 s a kilogram: fists
  0.57, the baton 0.67, the pipe 0.93, the axe 1.09) and the blow comes down in full: click and it goes as soon as
  the arm is up; hold and it stays up until you let go, as long as you like. There are no half blows (below).
- **Your blow commits.** Its line is fixed as it is thrown: you can look away, and it lands where you sent it. It
  carries you a step along it (1 + 0.6 m/s a kilogram). One that meets nothing, not even a wall, leaves the arm
  0.15 + 0.12 s a kilogram coming back (the axe half a second). Loading does not slow your feet; a blow under way has
  them (below). A click while you are busy is kept 0.2 s, and is a blow when the arm is free.
- **A blow has your feet** (since; `sim/moves.ts`, `Swing.feet`, `Swing.settle`; `sim/combat.ts`, `feet`, `planted`).
  Loading leaves them alone: the load is where you place yourself. From letting go, the blow has them, in two parts:
  - *Until it is done* (lands, glances, or its part that can land is over), your keys do nothing: what you had goes on,
    up to a run, so a blow run in lands as hard as you were going.
  - *Once done you are planted*, for the rest of the swing and `settle` after it, landed or not (0.25 s and 0.08 s a
    kilogram: the baton 0.34, the axe 0.51), or while the arm comes back from one that met nothing, if longer. No
    running; you want a share of a walk and get to it that share as fast (0.45 less 0.12 a kilogram, not under 0.1:
    fists 0.38, the baton 0.32, the pipe 0.16, the axe 0.1), and going faster than that you slow as one thrown does.
  - The step a blow carries you is up to its pace along the line, not on top of yours: run in and it adds nothing.
  Sprinting with the baton, you go on at a run until it is done, are brought to 1 m/s by 0.35 s after letting go and
  held there to 0.6 s (under half a walk a third of a second), and run again by 0.75 s; the axe holds you at 0.3 m/s
  for 0.6 s. Backed off from the moment it is let go, the baton gets you 0.3 m in all, the axe 0.05 (2.6 before).
  Tried first, and too little to feel: a share of your pace from letting go, only while the blow was under way (a
  sprinting baton went on at 4.4 m/s); then planted at 0.3 to 0.88 of a walk for 0.15 s and 0.1 s a kilogram (the
  baton at 2.5 m/s, never under 1.6: "you don't perceptibly stop whatsoever"). In the duels (twelve layouts each) one
  husk is still beaten untouched with anything, and two now cost every weapon: the axe is never untouched by two,
  either side of you or in front (it was every time), though none dies.
- **Drawn as it goes** (since; `present/render/handsView.ts`). What is in your hand is drawn on the line of the blow,
  not the view: look away mid-swing and it goes on without you, where the dev overlay's path goes. Over, it is brought
  back, not snapped to rest: in a sixth of a second after one that met something; after one that met nothing, carried
  on past its follow-through by its weight (0.12 rad a kilogram: the axe goes down past your knees) and brought back
  across the recovery, so the time you are locked out is the time you watch it come back. Looks only.
- **Hit-stop, both sides** (since; `sim/moves.ts`, `HITSTOP`). A blow of yours that lands holds still both your swing
  and what it struck: it stands where it was hit, shuddering, everything it was doing waiting, the shove it was given
  too, which it goes with after. A body it kills or floors is held loose where it was struck the same way. 0.04 s and
  0.016 s a kilogram swung, times how hard it landed (`closing`): fists 0.05, the pipe 0.08, the axe 0.09, the axe run
  in 0.14. It was 0.07 s for every blow, and only your swing held still: the husk was shoved the same step, so the
  stop read as your swing catching on air. Others of the cast are not held; a husk struck in its wind-up starts its
  blow that much later, as your swing does. A blow glancing off a wall holds your swing as one stood still would.
  Saves carry it (`Mutant.stop`); old saves load with none.
- **Hits on you never take a load or a blow from you**, short of flooring you. One that breaks your poise throws you
  back from it (2.5 m/s) and you reel 0.7 s: a third of your pace, the view jolted, the arm flung down, and no new load
  until you have your feet (a load already in hand, or a blow already thrown, goes on, drawn going on). One that
  floors you (*Knockdowns*) takes both (since): a load held up is dropped and a blow thrown is lost, so there is no
  swinging from the floor, and a button still held once you are up starts nothing until it is let go and pressed again.
- **Reach** is an arm (0.8 m) and what is in it, to a target's edge: the axe 1.7, the pipe 1.5, the baton 1.3, fists
  0.8. It was 1.3 and the weapon, which let the axe reach a husk's middle from 2.6 m, well outside anything a husk
  can do; the fight was won by spacing alone.
- **Husks** creep after you through the first part of a wind-up (1.8 m/s, a thresher 1.0) if you back out of it, so
  backing off does not dodge them; a step aside once they have stopped turning still does. They take turns: the one
  at you is the nearest of those hunting close by, and the rest hold off 2.4 m from you, circling, faced to you, until
  you are **open** (a blow of yours thrown, your arm coming back, or you reeling) or they have waited 3 s.
- **Heard and seen**: `reel` (yours); a husk reeling is thrown back on its heels, arms slack; your arm is flung down
  while you reel.
- **Set aside after playing** (built, tried, and taken out; kept here so the reasons are not lost):
  - *A held load that tires and drops* (the axe after 0.76 s). Intuitively wrong: it made a blow hard to time and
    hard to read. A load is held as long as you like.
  - *Slower feet while loading and swinging*, and slower again backing off. Not unrealistic, but wrong for the feel
    for now.
  - *Hits that cancel your load or your blow* (with heavy weapons trading through them). It felt odd: your blows
    cannot be cancelled for now. The reel stays.
  - *Husks that would not walk into a raised weapon* and hung at the edge of its reach. It read as artificial.
  - *Jabs*: a swing let go early came down at a quarter to seven tenths of a full blow, a fifth faster, and left the
    arm slow to come back. It felt like poking with a stick, or swinging three kilograms of axe absurdly fast. As in
    System Shock 2, a weapon has one swing, at its own pace.
- **What it plays like** (`test/fight.test.ts`, *duels*: a scripted fighter that loads early, gives ground while not
  ready, steps in when ready, lets go as the nearest steps into reach). Timed well, the axe beats one husk without a
  scratch. **Two husks are not yet a problem**: with a husk each side, or both in front, the axe kills both
  untouched; the pipe and baton are slower to kill but hardly hurt. A load held without end, that nothing takes from
  you, and that a husk walks into, decides the fight before it starts. With the tiring, the cancelling and the wary
  husks in, the same fighter died to two husks in five seconds. The levers left that do not undo the choices above:
  how far a husk's blow reaches against yours (a lunge from just outside your reach), how long a husk reels (0.9 s)
  against how long the axe takes to load (1.1 s), and how many axe blows a husk's poise takes (now one).
- **Saves**: version 5.
- **Not yet** (as F2 was built; since done: knockdowns, the dev overlay, the cast by velocity): husks giving ground
  themselves.

### F3a, as built

- **A blow lands by how fast the two were closing along it** (`sim/moves.ts`, `closing`): 1 + the closing speed over
  11 m/s (about the speed of a swung thing's head), between 0.6 and 1.8 of a blow stood still. Damage, the poise it
  takes and the shove it gives all go by it. Stood still, every blow is what it was. For yours, closing is your
  speed along the blow and its speed at you: an axe blow run in at a sprint takes 65 from a husk where one stood still
  takes 43; one thrown backing off, about 0.7 of that; a husk walking into it takes about a third more. For theirs,
  only your speed counts (their lunge is part of the blow as written): run into a husk's blow and it lands harder,
  back off and it lands softer.
- **Everything is shoved by what it weighs.** Your blow gives 70 kg m/s for each kilogram swung, an arm's 1.5 kg
  with it, at most 7 m/s to anything; it adds to what the thing is already doing. An axe blow stood still sends a worm
  or a skitter 0.9 m, a husk 0.34, a thresher 0.05, a bloat nowhere. (Before, anything light enough was knocked the
  same 0.3 m, whatever hit it, and nothing heavier moved.) A pistol round shoves 40, a shotgun 300. Their blows shove
  you: a husk's sends you back at 1.5 m/s, a skitter's 1.6, a big skitter's 2.9, a thresher's 4, a worm's 0.4.
- **Slams.** Thrown into something solid (a wall, a door, a crate; not another body, which it only shoves) faster
  than 3 m/s, a body takes 4 damage and 6 poise for each m/s over. Only being thrown slams you (going faster than you
  could go yourself): sprinting into a wall costs nothing. A thresher's charge throws you at 9 m/s: on open floor it
  takes 45; with a wall behind you, 61, and you reel.
- **Falls** hurt the cast as they hurt you: past 10 m/s, 6 damage and 8 poise for each m/s over. A husk knocked off
  3 m takes 6, off 6 m 32, off 10 m 60. A step or a stair does nothing.
- **Fixed on the way**: a body that met a wall part way through a step kept the part it managed as speed, so one
  impact counted as two lesser ones on two steps, each under the threshold. All the speed into a wall now goes into
  it at once.
- **What it plays like** (the same duels as F2): one husk is beaten untouched with any of the three weapons; two
  husks still hardly hurt the axe (it kills one or both untouched), while the pipe and the baton come out of a husk
  each side at three quarters and three fifths, without a kill. The levers of F2 still stand.
- **Tests**: `test/impact.test.ts`. No change to saves.

### F3b, as built

- **Shapes** (`content/items.ts`, `shape`): the pipe, the baton and the wrenches swing **side** to side, right to left
  across the way you face (40° each side of it); the axe **chops** straight down, in the upright plane of the way you
  face, from 50° above it to 40° below (at first it came from up and right to down and left, which read as a curve;
  playing set it straight); fists and the knife **thrust** straight out (their own ways; since, any can be sent another
  way: *Which way a swing goes, as built*). The path is laid on the line the blow was thrown
  along, pitch and all: look down at a worm and the swing goes low. Its reach across the floor is the weapon's, at any
  pitch (you lean into a low blow).
- **Swept, not tested at an instant** (`sim/sweep.ts`; `combat.ts`, `sweep`): the part of a swing from a fifth to
  three fifths of the way through can land. Each step, three points along the weapon (the hand to the head) are
  followed through their move, and the first thing any of them meets is what the blow meets. One of the cast: it is
  hit. Something on the far side of a wall is not reached through it. Who you hit is no longer who is nearest the
  crosshair: a side swing aimed at one worm takes the one on your right first.
- **Glancing.** If the head's path, or the length of the weapon from your hand to it, meets a wall, a door or a crate
  first, the blow glances: heard, felt, and it comes back on your poise at 1.1 times what it would have taken (so a
  full blow of the axe or the pipe knocks the wind out of you; the baton's, 15, does not). The arm is as long coming
  back as from a blow at nothing. The floor does not stop a blow: one aimed low scrapes along it.
- **Shoved the way the blow went**: half along the line, half the way the head was moving. A side swing sends a worm
  off to your left.
- **A blow stops in what it hits.** It goes on through nothing behind it, and it is drawn stopped there, rocked back a
  little off it, rather than following through as one that met nothing does (`swing.struck`).
- **Where it glances** (measured over every place to stand, facing every way with 1.6 m clear ahead): the pipe and
  the baton in 7% of them on the upper station, 10% on the main level, 11% in the plant, 6% in the sump, 1% in the
  cave; the axe's straight chop in 3%, 6%, 1%, 0% and 2%, nearly all of it the blow coming down onto something in front
  of you (a rail, a gallery's edge), not lifting it: it clears the corridors, and only the cave's low spring branch
  catches it overhead. A thresher glances in 11% and 16% (upper, main).
- **The thresher's blow is wide** (`MOVES.thresher.wide`): if a wall stands within its arc (70° each side, at a metre
  up, out to most of its reach) as it comes to strike, it glances: nothing lands, it is heard to hit the wall, and it
  reels 0.6 s before the 1.3 s recovery of a blow that met nothing. A corridor is the place to fight one; it still
  charges.
- **Seen**: the swing is drawn as the sim swings it. A side swing is drawn back to the right as it loads, brought
  across the middle of the view in the part that can land and on to the left; fists and the knife go straight out. A glance jumps back the way it came and shakes. The
  dev overlay (O) draws the path your blow's head will take, in white. The axe is held up at rest, lifted straight
  up over your head as it loads, and brought straight down: one upright plane from first to last.
- **What it plays like** (the duels): one husk is beaten untouched with the axe or the pipe; the baton's fighter no
  longer kills one in time. Two husks still leave the axe and the pipe unhurt (with fewer kills: a traced swing has to
  reach); the baton dies to two in front of it. Not yet done: a heavy blow carrying through a light thing into the
  next (cleaving).
- **Tests**: `test/sweep.test.ts`. No change to saves.

### Knockdowns, as built

- **The rungs past stagger** (`sim/moves.ts`, `DOWN`, `LAUNCH`, `RISE`). A hit that breaks a body's poise and shoves
  it at 4.5 m/s or more knocks it off its feet, if it stands on them: you, a husk, a thresher, the hand. Not a worm or
  a skitter, which are on the floor already, nor a bloat, which nothing moves. At 7 m/s or more it is thrown as well,
  0.45 of the shove turned upward, and comes down where it lands. A fall that breaks an upright body's poise puts it
  down too. Thresholds, as the rest of the ladder.
- **What does it.** Your axe, stood still, sends a husk back at 4.1 m/s: it reels. Run in, 6.2: it goes down. The pipe
  run in, 5.1: down. A worm or a skitter struck with the axe is thrown (7 m/s, the most a blow sends anything). A
  husk's blow shoves you at 1.5 m/s: two of them stagger you but never floor you. A thresher's swipe (its shove raised
  from 300 to 360 kg m/s so it does: 4.8 m/s) puts you on the floor; its charge (9 m/s) throws you.
- **Down** for a second, then **getting up** for 0.6 s. Down, nothing is done: no blows, no steps, no turn of its own
  (the cast's AI waits; you cannot move or start a load); a blow on whatever is down lands 1.5 times as hard and takes
  no more footing from it. Getting up, a hit's poise counts only past 25: a moment of better footing, not immunity,
  so a knockdown cannot chain into another (a pipe blow that would stagger a husk on its feet does not as it rises).
  Your own blows are still never stopped: one already thrown, or held loaded, goes on.
- **You, down**: as low as crouching (and standing again only where there is room); the view drops to the floor,
  tipped over the way you went and looking up, and comes back up as you rise; the arm is flung down out of the way.
  Heard: the wind knocked out of you and the floor coming up.
- **The cast, down**: drawn over backward onto the floor, and back up as they rise. (Since: loose, *Bodies with
  physics, as built*.)
- **Not built**: a husk that goes for whoever is down (they do go on striking, and land harder, but have no stomp of
  their own); rolling to get up. (Corpses that fall loose: since, below.)
- **Tests**: `test/down.test.ts`. Saves carry the cast's `down` and `rise` (still version 5: a save without them loads
  with nobody down).

### F4, as built

- **The arena** (`content/levels/testbed.ts`), north of the test bed's hall through a gate: 20 by 16 m of open floor
  5 m high; the baton, the pipe, the wrench, the axe and the knife on a table by the gate; a corridor 1.6 m wide off
  its east side, where a side swing and a thresher's sweep glance off the walls; a bay with a 2.2 m ceiling off its
  west side, where the axe's chop catches; a ledge 3 m up a ramp to knock things off. Nothing lives in it.
- **Keys** (`?dev`, `main.ts`): 1 to 6 put one of the cast down 3.5 m in front of you, faced to you and after you (a
  husk, a skitter, a thresher, a worm, a big skitter, the hand; `cast.ts`, `spawn`, which makes the level's ways about
  the first time if nothing else needed them); 0 kills them all where they stand (`killAll`), and, with none left
  alive, takes the dead away; T slows time to a quarter, a tenth, and
  back; Y changes the weapon in your hand (fists, baton, pipe, wrench, axe, knife); H puts you right; U holds the cast
  still, or lets them go. Anywhere, not only in the arena; a dev page does not save, so nothing put down is kept.
- **The overlay** (O) draws about each body its fight as the sim has it: a bar over its head as tall as the poise it
  has left, green going to red; an arrow at its feet for where its velocity takes it in a third of a second; a ring,
  red while it is down, yellow while it gets up, orange while it reels. Yours too, with your swing's path in white.
- **The hit log**: every blow, slam, fall and glance writes a line (`game.ts`, `log`; a `log` event the dev readout
  keeps the last five of): what struck what, the damage, the closing multiplier, whether it caught the other open,
  the shove, what came of it (shrugged off, flinch, stagger, down, thrown, dead), and the poise taken and left. Your own
  standing (health, poise, speed, weapon, down or reeling, the time scale) heads it.
- **Tests**: `test/arena.test.ts`.

### The cast by velocity, as built

- **One way of moving** (`cast/move.ts`, `drive`): whatever a behaviour does, it does by wanting a velocity, and the body
  speeds toward it as fast as its kind changes pace: a skitter 40 m/s² (at once), a husk 18, a swimmer 10, a thresher
  10, a worm 8, the hand 8, a bloat 3. Once a step: what the behaviours asked for, or, if none moved it (standing,
  winding up, reeling, down, stunned), coming to a stop on its own feet. Faster than it wants to go (knocked, thrown,
  carried along), friction slows it (28 m/s²) and a wall it is thrown into slams it, as before. What it walks into it
  shoves by what it weighs.
- **So**: a husk gets going in about a fifth of a second and arrives with way on, braking (by the way it has on) to
  stop short of you; knocked back, it has the knock to work off before it can come on again; its lunge is velocity,
  thrown at you at once (120 m/s²), and it carries a little past where it struck before it stands; its creep after you
  in a wind-up is velocity too. Walking to a point, it slows to arrive.
- **The thresher's charge** gets going at 16 m/s², reaching its 7.4 m/s in about 0.4 s, so there is a moment to step
  aside; into a wall it cannot stop, and the wall slams it by how fast it met it (17.6 from a full charge), whether
  or not it got part of the way first.
- **Stepping aside** when wedged on a corner or against another of them is still a nudge, as it was: the one piece of
  their moving not done by velocity.
- **Tests changed**: a husk now carries its lunge a step (up to 0.3 m) before it stands, where it stood dead still; a
  husk thrown into you shoves you a little less far (friction now takes the first step's speed before it meets you);
  the duels hold their husks past fleeing (one below two fifths of its health may flee once, on a coin's toss, which
  the change of timing turned up and the fighter, which does not chase, could not finish).
- **What it plays like** (the duels, fleeing held off): one husk, or two, is beaten untouched with the axe or the
  pipe; the baton takes one each side for a fifth of your health, and dies to two in front of it.
- **Tests**: `test/momentum.test.ts`, *the cast on their own feet*.

### How the cast move, as built

The cast moved by their own feet already (above), but what each did with them was the husk's, or written into each
behaviour as it came: every pace a number in the middle of the code (1.3 for a husk's round, 3.5 after you, 4.3 for a
big skitter), every kind turning the same way, footfalls timed in each behaviour, the nav graph's three kinds of body
in a type, an eye no higher than a person's. A new kind meant a change to each of them. Now how a kind moves is rows,
and what it does with them is the behaviour's:

- **A gait** (`GAIT`, `sim/cast/gait.ts`): its paces by name (`walk`, and any others its behaviour asks for: `hunt`,
  `flee`, `search`, `charge`), how fast it changes pace (`acc`, out of `MT`), how it turns, and its feet (the sound, the
  time between footfalls walking and going fast). A behaviour asks `pace(m, 'hunt')`; a pace a kind has none for is its
  walk. A kind with no row takes its behaviour's (the rootworm the worm's), a big one its own if there is one
  (`bigSkitter`), a fixed one none. The night round is the husk's row, slower to get going and slower after you.
- **Its own pace, from the level**: `walk` (m/s) in `mut()`'s options scales every pace of its kind's to it, the hunt
  with the walk, so a slow one is slow at everything; and `steps` (a minute, walking) its cadence, from which its
  stride follows. Without `steps`, a slower one takes fewer steps and shorter, each by the square root of how much
  slower. Its footfalls come as often as its steps; the husk's walk is drawn (`ANIM.husk`) and its prints laid
  (`render/prints.ts`) by its stride and cadence against its kind's (`Gait.stride`, `cadence`), so a slow one shuffles
  rather than skating; it rides on and off a platform as much slower (`RIDE`). Security's seven have the bench's
  (`mockups/mutants.html`): 0.25 to 1 m/s and 50 to 100 steps a minute, against the 1.3 the rest walk (`upper.ts`).
- **Held up, by distance** (`ROAM.held`, `heldM`): a roam gave its route up after 1.5 s coming no nearer, and nearer is a
  spot nearer, a metre: a husk at 0.7 m/s often takes longer than that, and gave up its route every couple of metres, and
  one at 0.25 would never have got anywhere. It is held up now after as long as 1.95 m takes it (what a husk walks in
  1.5 s), and 1.5 s at least, so nothing at the old paces changed.
- **Walking where it faces** (`heading`, rad/s): for a big body. It turns toward its way no faster than that, goes only
  as much of its pace as it faces the way, and turns where it stands to a way behind it. A husk, without it, steps any
  way at once and turns as it goes, as every kind did; no kind has it yet.
- **A way** (`WAYS`, `sim/fields.ts`; §7): what it needs and can do to get about. `MT.way` names it; by default it is
  worked out from the flags, as before (`noDoors` big, `opens` hands, else crawl). Each behaviour follows its own way's
  field (`own`, `cast/move.ts`), not a field named in its code.
- **Wandering** (`wander`, `cast/move.ts`): five behaviours ambled about where they lived, each with its own copy of
  the same few lines. One now, with how each does it in a table (`IDLE`, `sim/cast.ts`): how often, how far from where
  it started or anywhere in its room, and for how long.
- **Its eye** (`MT.eye`, `Mutant.eye`): by default as it was, a little below the top of its body and no higher than
  1.6 m. A tall one can be given its own.
- **What did not change**: how anything moves. `test/probes/trace.probe.ts` ran every level, as it begins and with
  everything on, the opening, and each kind in the arena, a step at a time, before and after: the same, to the bit, but
  for one thing. A night round put down in the arena with no round went after you at a husk's pace, because its
  slowness was keyed on having a round; it is its kind's now. In the game it always has a round.
- **A new kind** is then: a row in `MT` (its body, `ai` for the behaviour it shares, `model`); a row in `GAIT` if it
  moves unlike that behaviour's kind; a row in `WAYS` if it gets about unlike any there (by its headroom, width, step,
  drop and doors: one it fits, which a test holds it to); and, if it fights, its blow
  (`MOVES`, `blowKind`), poise (`POISE`) and death line (`DEATH`). A behaviour of its own is a function in `AI`
  (`sim/cast.ts`), and what it does when hit or walked into is in `hitMutant` and `shoved` (`cast/blows.ts`). Drawn, it
  is a model in `BUILD` and `ANIM` (`render/castView.ts`); gone loose, a skeleton in `SKEL` (`sim/ragdoll.ts`);
  walking, prints in `GAIT` (`render/prints.ts`).
- **Not yet**: the fight's part of a kind (its blow, its poise, what it does when hit) is still in switches on its
  behaviour. (How wide a body is, and the step it climbs and the drop it takes, are its way's now: §7, *Size, as built*.)
- **Tests**: `test/gait.test.ts`. A kind made in the test from rows alone (tall, slow, walking where it faces, with the
  husk's behaviour and a way of its own): it gets a field for its way where none walked it, keeps out of a passage too
  low for it that a husk takes, goes after you at its own pace, turns no faster than its gait, and stands to turn when
  you are behind it. A husk given its own pace is slow at everything, and one at 0.3 m/s keeps to its route the length
  of a hall. Four tests that had a husk's 1.3 m/s in them (`cast.test.ts`, `eyes.test.ts`) ask it of each one's own pace.
  With the seven slowed, the trace probe is the same as before on every level but the upper station.

### Bodies with physics, as built

The cast's bodies are physical while they live (velocity, mass, shoves, slams, falls); their deaths were drawn: a model
that shrank and tipped where it stood, its collider gone at once. Now what dies goes loose. Step 1 of three: corpses
fall loose; corpses stay in the world (knocked about, saved); knockdowns as ragdolls. All three built.

- **Not Rapier: a ragdoll of our own** (`sim/ragdoll.ts`). Rapier's current build (0.21; `@dimforge/rapier3d-compat`,
  and `@dimforge/rapier3d-deterministic-compat` for the same result on every machine) is a 3.1 MB WebAssembly module,
  1.2 MB gzipped, inlined as base64 in the compat builds, against a whole game of 0.87 MB (0.27 gzipped); it starts
  asynchronously; it would need the grid, the caves' surfaces, the props and every moving box fed to it as colliders
  and kept in step, a second world beside `world.ts`; its state is a binary snapshot, so a corpse could not be saved
  as plain data, nor restored from plain data and fall on as it would have; and what it moved could not be asked by
  the sim's rules, so a corpse would be looks and nothing else. A ragdoll of points and sticks (verlet) asks
  `world.ts` the questions a body does (`groundBelow`, `ceilingAbove`, `overlap`), so it meets what a body meets (the
  grid, ramps and cave floors, props, doors, platforms, crates), is plain numbers with no chance in it, and is some
  four hundred lines. What it lacks: rigid bodies with real inertia, and contact between boxes; only its points touch
  the world, so a limb's middle can rest across an edge it should not. For boxes on joints, enough.
- **A corpse is the sim's** (`Mutant.rag`), stepped after the cast (`updateCorpses`): it is pushed, and saved; it does
  not block. Why the sim's and not the drawing's alone: a blow or a body walking into it moves it, and those are the
  sim's to know (the sweep of a blow, where a husk walks), so a drawn-only corpse would need the sim to report every
  blow's path and every step to the drawing, which would then keep a second, unsaved copy of where the dead lie; it
  would be back where it fell after a load, and two players' runs from one save would differ. In the sim it is plain
  numbers, costs nothing asleep, and a run plays on from a save exactly. Why it does not block (it is not a `Dyn`:
  nothing stands on it, is stopped by it, or fails to see past it): a husk lying across a 1.6 m corridor that stopped
  you as a wall does would be a corridor shut by a fight, and the nav graph would not know it was there, so the cast
  would walk into it for ever; to stand on one, a body would step up and down 0.3 m with each, the view lurching; and
  each would be boxes in every query anything makes. Instead what walks into it shoves it aside (below), and is not
  slowed. One that should block (a heap in a doorway) is a thing to build when a level wants one.
- **Skeletons** (`SKEL`), from the models: a point for each joint and end, with a radius and a weight (they weigh what
  the body does), held by sticks; a torso is held rigid (four points to each other, the rest to those four); `apart`
  keeps pairs a share of their length apart, which is how far a hip or an elbow folds; a `hinge` bends one way (a
  knee back, a thresher's elbow forward). A husk is 12 points, a thresher 14, a skitter 10 (four legs, each one bent
  piece, as drawn), a worm 7 (a chain), the hand 33 (its body, four legs with knees, the four in front, the tail and head,
  the arms). A bloat, the grabbers and the overseer fold as before: nothing moves a bloat, and the rest are part of a
  wall.
- **Knees.** A husk's legs and a thresher's were one box each: dead, a body could only go over like a plank, and one
  against a wall slid down it sideways because it could not sit. Each leg is now two boxes at the knee, the same
  shape standing (`castView.ts`); only a body gone loose bends them.
- **The killing blow is in it.** A blow that kills now says where it landed and the way the striking thing was going
  (`Hit.at`, `Hit.way`: the head's path in `combat.ts`, `landOn`; a shot's line). The body goes loose moving as it was,
  shove and all (so the closing multiplier is in it), with the shove laid on by height (`RAG.tip`, 1.8: its feet take
  0.1 of it and its head 1.9; struck about the chest, a body goes over its feet rather than off them; since, 1.2), and
  0.55 of it (`RAG.local`; since, 0.35) given instead to the points within 0.6 m of where it landed, along the way the striking thing was
  going, at most 8 m/s a point. So the axe's chop drives a husk down and back, and the baton's swing turns it as it
  goes. A blow that would throw the living (7 m/s) throws the dead (0.45 of it upward; since, not at all, and the dead
  take of the shove only what the blow was going their way across the floor: *After play, as built*). Killed by no blow (a fall, a
  slam, the dev key), it slumps back off its heels (1.1 m/s at its top, the other way at its feet).
- **How it moves.** Each point keeps its speed (where it is less where it was), falls at the station's 20 m/s² (since,
  the earth's: *Muscle tone, as built*), and
  is held to its sticks eight times a step, the floor under it each time; what it does apart from the body as a
  whole is let die a little each step (`RAG.joint`, 0.97: a joint is not frictionless). Then the world, point by point,
  as a body walks: down or up first, then each way on the plan; a way that meets something keeps no speed along it.
  The floor drags a point by how hard it is pressed on it (Coulomb, 0.6; since, inside the passes: below), and a wall holds one along it by how hard it
  is pressed into it (1.2), but never by more than twice its own weight (`RAG.cling`). Under water it is slowed (3 a
  second) and weighs an eighth. Heard landing: a point coming down faster than 3.5 m/s thuds, at most every 0.3 s.
- **Asleep** once its weight, on the whole, moves slower than 0.12 m/s for half a second (a twitching hand does not
  keep it awake), or after 8 s awake on the floor whatever it is doing. Asleep it costs nothing. No more than 16 awake
  (`RAG.budget`); past that, the one awake longest sleeps where it is.
- **Drawn** (`render/rig.ts`): each box of the model rides its joint: a torso by a frame (an origin, an up, a right)
  from its points; a limb by the least turn from its parent that points it from one point to the next, so it does not
  twist on its own. Each is fixed to its frame as the model stands idle. What is not tied to a frame (a thresher's
  ribs, the hand's fingers' second joint, its head and eye) stays as it was the moment it died. Death is not a cut:
  over 0.15 s the model goes from where it was drawn to where its points are, and from where it was drawn last: once
  loose it is not placed again (the sim's middle of a corpse is not its feet, and a worm's is half its length off),
  and a corpse never drawn standing (from a save) is laid as it lies at once. For a while the pose it went from was
  taken after the model had been put at the world's middle, and every body killed or knocked down came in from there
  over the blend, a blink across the screen; a test now holds each kind to no jump on the frame it goes loose. The
  light it is lit by is taken lower once it lies (0.4 m, not 0.8), eased there over the same 0.15 s, as a room's
  light can be half as bright that much lower. It bleeds where it comes to rest (the
  pool waits until it is asleep). Asleep, it is laid once, not every frame, and drawn as one mesh of all its parts
  where they lie (one draw call, not one a part: a husk is 18, a thresher 47, the hand 81), its parts again once it
  wakes. Every part of the cast, living or dead, is culled by its own bounds by whichever camera draws it, a beam's
  shadow map too. The dev readout (`?dev`) says where each frame goes and how many draw calls it made.
- **What it looks like** (the arena, killed side on). A husk stood still and chopped with the axe is on the floor in
  0.25 s, 1.3 m along the blow, asleep in 1.6 s; run in, 1.6 m. The baton's swing turns it over its side and leaves it
  0.9 m along. Killed with no blow, its knees go and it crumples within 0.3 m of where it stood. A thresher drops onto
  its knees and folds over; a skitter is turned onto its back, legs up. Every kind is asleep within 2 s. **Against a wall**: a husk
  chopped toward the arena's west wall from 0.6 to 1 m out (to 1.2 run in) ends sitting against it, back to the wall,
  head 0.9 m up, legs out; nearer, it crumples at the wall's foot; further, it falls short. The baton's swing turns it
  along the wall, and it sits only killed within about half a metre. **On the ledge**: struck off it, it goes over and
  lies 3 m below; killed 0.8 m back from the edge by a light blow, it is left draped over it, head down.
- **Measured** (headless, `test/ragdoll.test.ts`; as step 1 was built, since cheaper: below): sixteen corpses falling
  at once cost about 1.5 ms a step together (93 µs each, a husk; the hand, 33 points, more), 1.1 ms while they
  settle, and nothing once they are asleep, which they all are within 8 s. The arena alone steps in about 0.1 ms. Bones are held within 5 mm (a thresher's heavy back
  stretches its torso by up to 25 mm lying down).
- **Tried and set aside**: friction as a fixed slowing (12 m/s²) whatever the load: a body hanging over the ledge was
  held there seconds by its feet. A wall's hold by impact alone: bodies slid down walls and lay flat at their foot,
  and none closer than 0.8 m sat. A wall's hold with no cap: a foot pressed against the ledge's face by its hip's limit
  hung a whole husk from it. The shove laid on evenly: a body carried bodily into a wall met it flat, from hips to head,
  and slid down it. Asleep by its fastest point: a thresher's arm swinging slowly at its side kept it awake 7 s.
- **Knocked about** (step 2). A swing of yours that passes through a corpse (the head's path, or the length of the
  weapon down to it, since a blow aimed at the floor goes into it) knocks it once a swing with what it would shove
  one of the living by, laid on as a killing blow is, and goes on through it: a body on the floor is not in the way of
  a blow. A shot shoves one on its line as it would one of the living (40, a shotgun's 300). The pipe's side swing
  shoves a husk lying at your feet 0.2 m along; the axe's chop drives it into the floor and pins it (7 cm). The cast's
  own blows do not move corpses yet.
- **Walked into**, by you or one of the cast: the points in the walker's way are put out of it by its share of the
  two weights (yours on a husk's corpse, 75 to 80: about half; a worm on a thresher's, a tenth), and keep that as
  their speed; the walker is not slowed. You walk through a husk's body and leave it shoved off its blood. (Since,
  kicked by the walker's legs, a limb by its own weight and the trunk by the whole body's, no faster than half the
  walker's pace: its limbs swept aside and its trunk shifted a hand's breadth. *Walked into, as built*.)
- **Against each other**: their points pushed apart, the lighter more, and dragging on each other by how hard they
  press (`RAG.rub`, 0.8), so one that falls on another lies on it; without the drag it slid off onto the floor. One
  asleep is woken only by a push of more than 3 cm (`RAG.stir`): at 1 cm, a body lying on another woke it with its
  own weight, and the two woke each other in turn for as long as they lay there.
- **Doors, platforms and crates**: a door on its way, a platform under way or a crate sliding wakes what it meets,
  and puts the points in its way out of its box by the shortest way that is not down. A platform carries a body on it
  up; a door coming down on a body lying across its sill puts it to one side, and shuts. (A door does not stop for a
  corpse as it does for the living: a body wedging a door open is a design question, not a physics one.)
- **The budget** puts to sleep the corpse awake longest, but never one awake less than a second (`RAG.down`): one put
  to sleep in the air would hang there standing. So forty killed at once are all awake while they fall.
- **Saved**: each corpse's points, as they are and were, and whether it sleeps (`Save.cast[].rag`, plain numbers). A
  run saved with a body falling plays on exactly as it would have. A save from before loads its dead laid on their
  backs where they lay, asleep. Still version 5. The dev key 0, with none alive, takes the dead away (`Mutant.away`).
- **Measured**, again (`test/ragdoll.test.ts`, after making the step cheaper: a floor found once a step, not twice;
  lengths by square roots, not `Math.hypot`; a prop's lookup without a set when it meets one column, in `world.ts`):
  sixteen falling at once cost about 1 ms a step together (60 µs each), 0.85 ms settling, nothing asleep. Forty husks
  killed together in a heap 5 m across, 2.5 ms a step while they fall (all awake, the budget waiting for them to land),
  all asleep within 2.5 s; walking through the heap, 0.7 ms.
- **Knocked down, loose** (step 3). A husk, a thresher or the hand floored (`cast/blows.ts`, `floored`) goes down as a body
  gone loose, carrying the blow that floored it, as a corpse does a killing one (less the throw, which the fight has
  given its body already). The fight is untouched: its body (the upright cylinder) is still where the rules have it,
  sliding on the knock, slamming into walls, getting up when `m.down` and `m.rise` say; the loose body is drawn after
  it, a fifth of the way to its feet each step (`RAG.held`), and never moves it. Down, it does not sleep, and nothing
  of it but the drawing reads it. A blow on one down jolts its body where it lands; killed down, the same body goes on,
  dead. Getting up (0.6 s), the model comes out of the pose its points have into its animation as it rises (`rig.ts`,
  `rise`), and the loose body is let go when it is up. The same knockdown with this on and off (`RAG.floored`) gives
  the same fight to the step, hit points, poise and timers alike (a test holds it to that).
- **What it looks like**: an axe run into a husk drops it to sitting within a third of a second (its knees go), then
  it lies back; a thresher floored sits down hard, leaning back on its arms. Drawn after its feet, a husk ends up lying
  about where it will stand. Up, it unfolds into its stance over the rise, which reads as getting up, if a smooth one.
- **Not built**: rolling over to get up (it rises the way its animation stands, from wherever its points lie); you, knocked down, are still a view thrown to the
  floor (there is no body of yours to go loose: `selfView` is drawn by the camera).
- **Saved**: the knocked down's loose body too; a run saved with one on the floor plays on exactly.
- **Tests**: `test/ragdoll.test.ts`.

### Muscle tone, as built

Playing the corpses found them goofy, for three reasons: nobody goes limp in no time at all; they fell at the station's
20 m/s², twice the earth's, which suits a jump and yanks a body down as if on a string; and the blow's shove was laid on
like a cartoon's (the head at 1.9 times it). The first of three tiers toward bodies that react (Euphoria's, in GTA and
Red Dead, are muscles on a ragdoll: every joint driven toward a pose, and behaviours choosing the poses); the next two
are reflexes and stagger steps (built: *Reflexes, as built*; *Stagger steps, as built*).

- **Muscle tone** (`RAG.tone`, `tone` in `sim/ragdoll.ts`). For the first moments after a body goes loose, each point is
  pulled toward where it is as it stands, in the frame its trunk has now (three points of the trunk, `SKEL.core`): the
  body keeps its shape a moment while it goes over as a whole, then lets go. A pull on where a point is, so it is a
  speed, damped by the joints as any swing is. It starts at 0.12 of the way each step and falls away to nothing over
  0.45 s (`start`, `last`), by each point's share (`SKEL.tone`: a husk's knees and feet half, its hands 0.6, its trunk
  and head all), so its knees still go first. Knocked down and alive, a body keeps a little (0.06, `alive`). Its clock
  is `Rag.age`, the seconds it has been loose and awake, so a kick that wakes a corpse later does not bring its tone
  back. A worm has no trunk to hold to, and none.
- **The earth's gravity** for what goes loose (`RAG.gravity`, 10 m/s²); the station's 20 stays for everything that
  walks. Killed with no blow, a husk's head is down in 1.0 s (0.7 s at 20).
- **Gentler blows.** The shove is laid on by height at 1.2, not 1.8 (its feet take 0.4 of it, its head 1.6), and a
  third of it, not half, goes to the part struck (`RAG.local`, 0.35).
- **Friction, done again.** At half the gravity a point pressed on the floor presses half as hard, so the drag was
  doubled (`RAG.friction`, 1.2: the same 12 m/s² on a body lying still). That showed the drag was on the wrong thing: a
  point dragged alone, after the bones were solved, so a 3 kg foot was held and the 77 kg behind it hauled it along; a
  husk felled by the axe skated two metres on its knees. Now the floor holds a point where it stood inside the passes
  over the bones, so the rest of the body turns about a foot the floor holds; and it holds it by a budget for the step,
  what the floor has pushed it up by times 1.2, spent across the passes, so a body's weight counts once, not once a
  pass. (Tried and set aside on the way: a drag on the whole body's speed by the weight it bears. It held the feet,
  and held the body upright with them: a body toppling has a moving middle over feet that do not slide, and that drag
  stopped the middle. Dead husks knelt for two seconds.)
- **What it looks like.** Killed with no blow, a husk's knees go: it sinks, sits back on its heels, and tips over,
  most of a second, where before it dropped. Chopped with the axe it goes over composed, its knees giving as it goes,
  and is carried 2.6 m along the blow; the baton's swing knocks it straight over in a third of a second, 0.9 m. A
  quarter second after the axe, its limbs are 6 cm out of the shape it stands in (with no tone, 35 cm). Chopped toward
  a wall from 0.8 to 1.4 m out (the baton's swing, from 1 to 1.4 m), it slides down it and ends sitting against it, head
  0.7 to 1 m up; over every distance from 0.4 to 1.4 m and three strengths of blow, 23 of 48 sit (with no tone, 26). A light blow on the ledge's edge can leave it draped over it; the axe sends it over. A body lying on the
  floor is harder to move than before: the pipe's swing shoves one 0.4 m, the axe's chop pins it where it is, a round
  fired down at it 8 cm.
- **Measured**: no cost to see. The same machine, the same test, this and before it, back to back three times: sixteen
  falling 1.5 to 2.5 ms a step either way, forty in a heap 2.6 to 3.1. (The machine was slower that day than for the
  figures above.)
- **Tried and set aside**: tone at 0.2 over 0.6 s, with legs at a quarter: bodies dropped to their knees and skated,
  and a leg folded under one sprang up a second after it lay down, the joint limits fighting it out of a pose tone had
  put it in; and so strong a hold took the slump out of a body killed by a wall (with the friction as it then was, 4 of 32
  sat, against 13 with none).
- **Tests**: `test/ragdoll.test.ts`, *muscle tone*; the earlier ones moved with it (the axe and the baton compared by
  how fast and how far, not which way they lie; the wall from 1.2 m and a metre; the ledge with the axe; a lying body
  pinned by the axe's chop rather than shoved).

### Reflexes, as built

The second tier. Tone holds a body's shape; a reflex gives a few of its points somewhere to go, as Euphoria's
behaviours pick the poses its muscles drive toward. Each is a target pulled toward a share of the way each step, no
faster than a hand moves (4 m/s), and nothing is quicker than 0.08 s (`REFLEX` in `sim/ragdoll.ts`, `SKEL.hands`,
`curl`, `writhe`). All of it is the loose body's: none of it reaches the fight.

- **Brace** (knocked down, alive). Toppling past a tilt of 20°, its hands reach out and down the way it is going over,
  as far as each arm reaches or to the first thing they meet (a ray from the shoulder: the floor, or a wall), for the
  half second of its fall, fading. A third of a second into a fall its hands are 1.4 m further out and down, each,
  than they fall of themselves. A husk thrown down catches itself on a hand and sits propped a moment before it lies.
- **Guard** (knocked down, alive, struck while down). Its hands come up in front of its face for 0.6 s: struck on the
  floor, its nearer hand is 0.5 m from its head (0.9 m with no reflexes).
- **Clutch** (dying, struck by a blow). The hand on the other arm from the one struck reaches toward where the blow
  landed, from 0.1 to 0.7 s, fading: its arm laid at its own length toward the wound and a little in front of it, so a
  husk killed by the axe lies with an arm across its chest. A dying thresher's nearer hand comes within 0.38 m of the
  wound (0.54 m with none).
- **Curl** (dying). The hand's four draw in under it as it sinks.
- **Writhe** (a worm dying). A wave down it, side to side, 0.12 m at 2.5 a second, dying away over 1.6 s. (Since, a
  standing bend and not a wave: the wave swam it 2 m along the floor. *After play, as built*.)
- **Tried and set aside**:
  - *Bracing the dying.* Dying bodies do not catch themselves, and a husk's arm is one bone: braced on the floor it is
    a strut, and the corpse lay propped on it like a tent.
  - *A brace aimed past the arm's length*, and one held all the time it was down. The arm fought its own bone and
    flailed; held, it pushed the body back up off the floor before it was due to rise.
  - *A clutching hand pulled to the wound itself.* A wound nearer its shoulder than its arm is long (a husk's right arm
    is a metre) cannot be reached by an arm of one bone, and the arm swung about, and stood up off a body lying down.
  - *A dead skitter's legs curled in.* Its legs are each one bent piece, so a curl that broke their lengths threw the
    body into the air; on its back with its legs up it reads as a dead spider already.
  - *A clutch by the hand nearest the wound*, when the wound was its own elbow.
- **What it changed**: the baton's kill now takes a little longer to go down (0.57 s, with its arms coming up in front
  as it goes over), so the axe and the baton differ now by how far they are carried (2.3 m and 1.2 m), not how fast.
  A knockdown thrown hard is down no higher than sitting, where before it lay flat.
- **Measured**: two rays a step for each knocked-down humanoid while it falls; nothing else that shows.
- **Tests**: `test/ragdoll.test.ts`, *reflexes*, each with the reflexes on and off.

### Stagger steps, as built

The third tier, and the one with the uncertain payoff: a body knocked off its feet steps to catch itself before it goes
down, so a knock reads as a stumble and then a fall (`STAGGER` and `stagger` in `sim/ragdoll.ts`; `SKEL.legs`).

- **The step.** Where its weight is going is its middle carried on by its speed for as long as a body that tall takes
  to fall (the capture point). Past 0.12 m from between its feet, it swings the foot further from there to it, lifted
  0.12 m, over 0.22 s, no further from its hip than 0.55 of its leg. While it tries, its trunk is held over its feet
  (`upright`, 0.06 of the way each step, fading to nothing over its time; since, all of it by height, at 0.045: held
  by its trunk's three frame points, it turned on its feet like a top. *After play, as built*). It tries for 0.45 s and two steps; then its
  knees are sent forward (`give`, 1.5 m/s), so one balanced on the feet it stepped to does not stand there while the
  fight has it on the floor. The step under way is the loose body's (`Rag.stride`, `Rag.steps`): saved, plain numbers.
- **Only the knocked down, and only those on two legs** (a husk, a thresher). The dying do not step: a step taken
  toward a wall put a body's feet under it and took the slump from one killed against it, and a dead thresher that had
  stepped stood balanced like a statue for two seconds.
- **What it looks like.** A husk floored stumbles a step back, drops to a knee with an arm out, and goes down on its
  side; its head is down 0.6 s after the blow (0.3 s with no steps). A thresher steps twice, leans, and goes over.
- **How it measured, and why it is fragile.** Without the trunk held up, the steps were for show: the body fell in the
  same 0.28 s whether or not its feet moved. With it held, when it goes down swings with small changes: across three
  facings and three knocks, the thresher's head got below half its height anywhere from 0.45 s to never in 1.6 s (held
  at 0.08 without the fade), the husk's from 0.6 to 1.35 s. With the fade over its time to try and the knees giving
  at the end, every case gets down, but not every case before it begins to rise (1 s after the blow): the latest, a
  husk knocked hard from the side, at 1.3 s, and one knocked lightly from the front at 1.1 s. With no steps, three of the
  eighteen were as late or later (1.18 s, 1.43 s, and one that never got there, sitting propped on a hand:
  REFLEX.brace). So a body can still be sitting up,
  or only just going over, when the fight has it down: the drawing says down, if not flat, while the rule (blows land
  1.5 times as hard) holds. Worth watching when you play.
- **Not built**: a reel (a stagger short of a knockdown) that stumbles. A reeling body is not loose: it is the model's
  animation, and stepping it would mean a body loose while it is still on its feet and fighting, every reel.
- **Tests**: `test/ragdoll.test.ts`, *stagger steps*: steps taken, and its head down later than with none; the dying
  take none.

### After play, as built

Four things found playing the three tiers, each traced headless before it was touched (`test/probes/`: probes, not
tests; README there).

- **The chop's shove went sideways.** `landOn` adds the line you face to the way the head was going on the plan, each
  made a unit first. Below your eye a chop's head is coming back toward you as it lands (its arc passes under the
  line), so the two summed to almost nothing, and the shove went whichever way the rounding left: a skitter or worm
  killed by the axe was sent off left or right at 7 m/s, and a husk floored low the same. Now the head's way counts by
  how much of its going is across the floor: a chop shoves along your line. Same shove, same poise; only its way.
- **The dead flew.** A corpse took the whole of the shove the fight gives the living (up to 7 m/s for a light one),
  laid on by height, and a blow of 7 threw it up as well. Now a corpse takes of the shove only what the blow was going
  its way across the floor (a chop, coming down, little or none), and no more than 4 m/s (`RAG.shove`), and none is
  thrown up. Killed by a real swing from 1.5 m, its middle lies (along your line, across it): a husk 0.75 m and 0.15 m
  (was 1.55 and 0.02), a skitter 0.3 m toward you (was 0.6, rising 0.2 m), a worm 0.46 and 0.06 (was 1.18 and 0.9
  across); the pipe's swing still carries them, a worm 1.1 m (was 4.2). A husk chopped facing you drops with its hips
  0.4 m from its feet; the pipe's swing puts them 1.6 m off.
- **The worm swam.** Its dying thrash was a wave down it, and a wave against a floor that drags is how a snake goes:
  killed by nothing, it went 2.2 m. Now it bends one way and the other, its ends against its middle, and what that would
  move the whole of it by is taken out: it thrashes where it dies (within 0.15 m of lying still).
- **The knocked-down husk spun.** The stagger's hold on the trunk pulled its three frame points (both hips and the
  left shoulder) over its feet, not the right shoulder, and the rigid trunk turned to follow, every step: struck
  square, a husk turned three quarters of a turn on its feet in half a second and went down sideways. Held now by all
  of it, by how high each point is over its feet (a tip about them, with no turn in it), at 0.045 (0.06 on every point
  held it up a second). Across eighteen floorings by the axe, its shoulders turn 118° in all while it is down (was
  230°; some of it is lying and rolling), and it goes over backward, away from the blow. Head down: a husk 0.73 s, a
  thresher 0.77 s (0.28 and 0.62 with no steps).
- **The grabber could not be found.** Only a ball 0.35 m about its head, 2 m up, could be hit; what is drawn is a sac,
  a head and five tentacles hanging to your knee, 0.84 m across. Now the whole of it, as an upright column 0.42 m about
  a point 0.12 m off its wall, 0.35 to 2.55 m up (`GRAB` in `combat.ts`); a shot is aimed at where your line crosses
  it. A side swing from 1 to 1.5 m, aimed low to high at it, landed once in twelve; now every time. The overseer still
  has the ball (it is a mound 1.6 m high, and the ball is above it): left alone, not having been asked about.
- **The axe's aim: measured, not changed.** A chop meets the first thing its arc comes down on, which is the top of
  anything tall: on a husk 1 m off, 22 to 43° above the crosshair wherever you aim at it; on a thresher, 43°. On the
  low ones (skitter, worm) within 12° of it. And its reach is a radius from your eye: nothing 2.5 m off is reached,
  aimed anywhere. So the axe lands where it should, as a chop, and not where the crosshair is. Making it land at the
  crosshair (the arc started lower, or the thing under the crosshair met where the arc crosses it) changes when a
  blow lands and what it can reach: how combat plays, so asked about first (handoff).
- **Tests**: `test/sweep.test.ts` (the chop shoves along your line, low and high; the grabber struck through its
  tentacles, and shot there), `test/ragdoll.test.ts` (killed by a real chop, the light ones drop where they were
  struck; the worm thrashes where it dies). The kill tests that carried a body with the axe now use the pipe.

### Drawn without a jump, as built

Found playing: a blink as a body went loose, and the living putting themselves from one pose into another in a frame.
Each measured headless before it was touched (`test/probes/snap.probe.ts` for the living).

- **Going loose**: *Bodies with physics*, *Drawn*, above. On the frame a body goes loose its parts move no more than
  standing would (under 0.05 m; it was 9.7 m, to the world's middle and back over the blend).
- **The living** (`render/fade.ts`). The animations are the first engine's, and go from one pose to another at once
  wherever what they switch on does: what it is doing; walking or not (each at its own pace, so at its own place in the
  step); a blow begun or cut short; thrown back on its heels; grafting, dragging, gripping; the other patient's fist
  coming off the glass. Where any of that changes (`SWITCHES` in `castView.ts`), the animation is run twice that frame,
  once as it was given things the frame before: the difference is what it jumped by, and the model is drawn as the
  animation has it less that, dying away over 0.2 s (`SWITCH`). Not a blend of the two poses: what was moving anyway
  is not held back (a husk's arm on its way down as its lunge sets it walking), so a blow lands when the sim has it
  land (a test holds a husk's swing to its animation, off by no more than the wind-up's shake, 0.05 rad). Between
  switches it is drawn as its animation has it; the cost is keeping what it last set, 2 µs a body a frame.
- **Struck, rocked back** over a few frames, not one: toward how far the blow rocks it, at 20 a second (at most 0.08
  rad in a frame; it was 0.28).
- **The other patient, pointing at the balcony**, turns its head from you to it and back in a fifth of a second, not a
  frame.
- **Twitches and trembles.** The changed twitch at random (a husk's head; a skitter's legs, head and body), and each
  twitch was a frame long, out and back at once: at sixty frames a second that read as the picture glitching. Now each
  jerks out quickly and comes back less quickly, over a fifth of a second for a husk's head and a seventh for a
  skitter (`twitch` in `castView.ts`), as often a second as they came a frame at sixty (a husk's head 0.9 times; a
  skitter's leg 2.4, its head 3, its body 1.8, fewer stood idle), so no more often on a faster screen; and none while
  a model is stood up to be rigged, where one would have been laid into every pose it went loose in. The tremble at
  the top of a wind-up (a husk's, a thresher's, a worm's) came on partway through and stopped at the strike, a jump
  each way; now it comes on and goes (`tremble`). A skitter's front legs left their step as it reared, and dropped back
  into it the instant its strike passed level (0.46 rad); now they go out of it and back as it rears and comes down.
  The night round's right arm stayed out from its side once it let go of what it dragged; now it comes in.
- **Found by a test, not by looking** (`test/fade.test.ts`, *each animation, what it switches on held*): every
  animation run at 2000 frames a second, what it switches on held, or going as it goes (a blow from wind-up to
  recovery, reeling running out), from two places in its cycles, with twitches made to come every few tenths of a
  second; no part may turn 0.03 rad or move 1.5 cm from one frame to the next (a husk's arm coming down, the fastest
  thing any of them does, turns 0.022). What does is a jump that `fade.ts` cannot see, as nothing it switches on
  changed. It found the trembles and the skitter's legs; with the twitches, 43 of its runs failed before.
- **The night round's flashlight** went where its state put it the step it changed (down the way ahead, up onto you),
  and with the arm drawn holding it eased, the two parted for a fifth of a second. Now the sim swings it: it holds its
  light at a pitch of its own (`Mutant.tp`, saved) that goes toward where it wants it, most of the way in a fifth of a
  second (`TORCH.swing`, `swingTorch` in `cast/round.ts`), and the beam, the light it puts on you for the cast, and the
  arm drawn holding it all go from that one pitch. A rule changed with it, slightly: the beam takes that fifth of a
  second to come onto you, so you are lit by it that much later. What its light throws back into the field
  (`Lighting.lights`) was worked out again only when the light moved a quarter of a metre or turned 8° in a step, which one
  carried about never did: it stayed where the beam was when it last jumped, 10 m behind the night round on average
  and 26 m at worst. Its jumps are what had kept it anywhere near, and with them gone it would have stayed further
  behind still. Now it is worked out again once the light has gone half a metre or turned 8° since it last was: never
  more than 0.6 m behind, about three times a second, 26 bricks of the light field a second sent to the card (was 7).
- **Measured** (the arena, struck every 1.5 s, you going from one end to the other every 2 s; the most a part moves in
  a frame, in the model's own frame): a husk 0.30 m (was 1.94: its arm thrown from overhead to its side, a walk begun
  at a pace not the one it stood at), a thresher 0.49 (was 1.98; its arms flail half a metre a frame winding up, as
  they always did), a worm 0.03 (was 0.21), a skitter 0.58 (as it was: the end of its strike, nose first, in a tenth of
  a second).
- **Tests**: `test/fade.test.ts`; `test/ragdoll.test.ts`, *drawn going loose*; `test/nightround.test.ts`, its beam
  swung onto you and what it throws back going along with it.

### Which way a swing goes, as built

Asked for by the owner: the direction of a blow yours to choose. Chosen with them: by the keys held as you press, not
the mouse (it only aims) or more buttons; each weapon its natural ways; the path chosen, not the numbers.

- **What you hold as you press** (`wayOf` in `sim/combat.ts`): A, a backhand from your left across to your right
  (`back` in `sim/sweep.ts`: the side swing in a mirror, rising from low on the left); D, a side swing from your right
  across to your left; W, brought down over your head for anything swung, straight out for the knife and your fists;
  nothing, or S, the weapon's own way (the pipe, the baton and the wrenches across from the right, the axe a chop, the
  knife and fists a thrust). So each has its natural set: the pipe, the baton and the wrenches both sides and
  overhead; the axe its chop and both sides; the knife a thrust and a slash either way; fists a jab and a hook either
  way. A key counts pushed past halfway, the stronger if both are (a stick held off straight). It is taken as you
  press, and a press kept while you are busy (`BUF`) goes the way it was pressed. The keys move you as they always
  did, so the way you step is the way the blow comes from. On a phone, the stick (index.html says so with the keys).
- **Swap swing sides** (since; Settings, kept between runs): A sends it from your right and D from your left, the blow
  going the way you step. The owner asked for it after playing. It comes to the sim with the keys (`Input.swap`), so a
  run is played as it was whatever is set; the controls shown say which way it is.
- **Only the path is chosen**: as hard, as quick, the same poise, shove, lunge and recovery whichever way (a test holds
  the damage and the swing's time equal). What differs is what the path meets. A backhand takes the one on your left
  first, as a side swing takes the one on your right, and shoves what it hits off to your right. Brought down over
  your head a blow clears a corridor a side swing glances off; swung across, it clears a low ceiling a chop catches.
- **Where each glances** (`test/probes/glance.probe.ts`: from every spot on the nav graph, facing eight ways with 1.6 m
  clear ahead, the world alone; as a side swing, as a backhand, brought down):

  | | pipe across | pipe down | baton across | baton down | axe across | axe down |
  |---|---|---|---|---|---|---|
  | upper | 7% | 4% | 6% | 2% | 13% | 8% |
  | main | 9% | 5% | 8% | 4% | 17% | 6% |
  | plant | 9% | 1% | 8% | 1% | 17% | 1% |
  | sump | 7% | 2% | 6% | 1% | 12% | 2% |
  | sumpdeep | 11% | 0% | 11% | 0% | 22% | 34% |
  | cave | 5% | 5% | 5% | 2% | 11% | 9% |

  A side swing and a backhand glance alike. Brought down, a blow glances in half the places across does or fewer,
  but for the axe under the deep sump's and the cave's low roofs. The axe swung across, all 1.7 m of its reach, glances
  in twice the places the pipe does. These count more cramped places than F3b's first count (the pipe's side swing
  there 7, 10, 11, 6 and 1%): compare within the table.
- **The axe's aim** (handoff, *Open* 1): its chop is left as it is, the owner's call. It still lands on the top of
  anything tall; swung across (A or D), it meets the thing at the crosshair's height.
- **Drawn** (`render/handsView.ts`): loading goes from how the thing is held at rest to where its way starts (drawn
  back to the right, to the left for a backhand, up over your head, back for a thrust), so anything can be sent any of
  its ways without a jump at the press or as it is let go; a fist hooks pointing along its forearm. An edged thing
  swung across (the axe, the knife) is turned a quarter about its handle as it is drawn back, so its edge leads, to the
  left across from the right and to the right on a backhand (`lead`): at first it went flat side first, its edge to
  the floor, as a chop holds it (the owner, playing). A test sends every
  weapon every way and holds each frame to what the swing itself moves in one (`test/hands.test.ts`). Looked at too,
  each way loaded and swung, in a browser. The dev readout's blow log names the way (`pipe back → husk`); the overlay
  (O) draws the path of the way the blow is going.
- **Tests**: `test/sweep.test.ts`, *which way it goes* (the sides swapped too); `test/hands.test.ts` (the edge
  leading too). No change to saves: the way is in
  `Hands`, which is saved whole, and an older save's is taken as the weapon's own.

### Walked into, as built

Found playing (the owner): walked into, a body went off before you as if it weighed nothing. Traced headless first
(`test/probes/tread.probe.ts`: each kind killed with no blow and asleep in the arena, walked and run through its middle,
along it and across it, and brushed past along its side; and the station's own, killed where they stand on a level and
walked through).

- **What it did.** The points in a walker's way were put out of it by the walker's share of the two weights (yours on
  a husk's, about half) every step, and kept that as their speed: a push as steady as the walker's going, which the
  floor's hold never beat once the body was moving. So it was carried off before you at near your pace: walked
  through, a husk went 2.6 m; run through, 4 to 5.7; a skitter up to 6.5; a thresher, 220 kg, 3.5 m along its length.
- **Kicked by legs** (`kicked` in `sim/ragdoll.ts`, `RAG.kick`). What meets a body is a walker's legs, one at a time,
  not all of it: a quarter of what it weighs. Each point in the walker's way is brought up to the share that and what
  the point takes with it make of how fast the walker comes at it (`Bones.carry`): a limb takes its own weight, so a
  hand or a foot is swept aside, and the trunk the whole body's, so it only shifts; a worm, with no trunk, all of it.
  No point is kicked to more than half the walker's pace (`RAG.kick.most`), and none further than out of the walker:
  the walker goes on through and leaves the body about where it lay, its limbs thrown about. By you, a husk's hand is
  kicked to half your pace, its trunk to a fifth, a thresher's trunk to a twelfth. One standing still in a body does
  not move it, nor wake it (`treads`: only a walker coming at it).
- **What it looks like** (how far its middle went, by weight, and its furthest point; walked or run through its middle
  square to it, along it from its feet, and past it 0.4 m to its side):

  | | through | along | past | run through | run past | a husk walking through |
  |---|---|---|---|---|---|---|
  | husk | 0.07, 0.34 m | 0.30, 0.39 | 0.09, 0.37 | 0.09, 0.66 | 0.12, 0.56 | 0.12 |
  | thresher | 0.03, 0.31 | 0.11, 0.29 | 0.07, 0.49 | 0.03, 0.43 | 0.08, 0.48 | 0.13 |
  | skitter | 0.26, 0.56 | 0.34, 0.40 | 0.15, 1.06 | 0.33, 0.66 | 0.07, 0.41 | 0.26 |
  | worm | 0.13, 0.32 | 0.77, 0.80 | 0.03, 0.04 | 0.16, 0.37 | 0.04, 0.06 | 0.16 |

  Each is awake about a second and asleep again. Run into, a body's limbs go further than walked into; its middle
  about as far, kicked faster and you through it sooner. In the station (the main level, each of the cast killed where
  it stood and walked through square to it), a husk's furthest point went 0.11 to 1.25 m, most of them 0.34 to 0.71,
  and its trunk 0.05 to 0.67; a worm's 0.1 to 0.6 m in all. Walking the length of a worm scuffs it along most, as it would.
- **Tried and set aside**: the first of these, played by the owner: every point kicked by the whole body's weight, not
  what it takes with it. Nothing was carried off (a husk's middle 0.07 to 0.19 m), but a body moved as one piece, a
  hand's breadth, and brushed past hardly at all (a husk's furthest point 0.12 m, run 0.13): "I pretty much walk
  through the corpses and have no effect on them when I step past". Each point by what it takes with it, with no most:
  a limb right ahead of you, kicked at nearly your pace, stayed ahead of you and drew the trunk after it through its
  joints (walked up from its feet, a husk's trunk went 0.7 m, run 0.9; a worm, every link a limb, 2 to 2.7 m; a husk
  walking through a thresher, 0.65). A trunk's points by the trunk alone (a husk's 46 kg) rather than all of it: the
  same. A cap on what a walker puts into a body in all, below what slides it on the floor, the lightest points served
  first or all alike: the trunk did not move at all, and a limb brushed past hardly (a husk's 0.07 to 0.19 m). Most
  of 1 or 1.5 m/s rather than half the walker's pace: a body run past moved less than one walked past. Before any of
  these, from the first change: a cap on how hard a walker pushes, as a share of its own weight, with the push as
  before: whatever it outweighed enough to beat the floor's hold was still carried off (at its weight, a skitter
  3.6 m, a worm 2.4) while a husk below that hardly stirred. That cap by the two weights' share, so no walker beats the
  floor: nothing moved, a ghost walked through. The pace capped by the whole walker's share of the two weights, not
  its legs': a worm still went 1.6 m along, 3.4 run. A walker standing still taken to come at what lies in it at a
  metre a second, to ease it out: the points behind a walker were pushed back against its going, and one stood in a
  skitter's body slid it 2.5 m in a tug of war. Without that, and before `treads` asked for a walker coming at it, a
  body lying in someone still woke and slept again every half second, drawn as its parts and laid as one mesh by
  turns.
- **Not built**: stepping over or onto a body (the walker still goes through it); the walker slowed by it (a corpse is
  still in nobody's way). The station's own dead were boxes on the floor, moved by nothing (since, bodies: *The
  station's dead, as built*).
- **Tests**: `test/ragdoll.test.ts`, *corpses stay in the world*: a husk's body walked and run into goes between 3 and
  30 cm; brushed past, its limbs are swept more than a quarter of a metre and its trunk less than a fifth; a thresher's
  goes less than a husk's, a worm's more, none a metre; one stood in is left as it lies, asleep; a husk walking
  through one kicks it too, as little. The test of a body drawn as one mesh and woken counts its frames awake, since it
  is asleep again within the second and a half it was held awake for before.

### The station's dead, as built

Asked for by the owner, once the cast's corpses could be kicked: the guards and residents the levels lay out where
they fell (the officer, Reyes, the deputy director, the drowned sergeant, the engineer, the residents in their flats,
the dead in the gore rooms and the chapel) were boxes on the floor beside a pool of blood, which nothing moved and you
walked through as through a rug. Now each is a body like any other.

- **One of the cast, dead before you came** (`MT.dead` in `sim/cast.ts`; `body` in `content/build/furnish.ts`). A level
  lays one where the boxes were, by its feet, a metre from its middle (north to south, its head to the north, or west
  to east, its head to the west), and says where its middle was (`opts.lies`) and what it wore (`opts.c`). Made, it is
  dead at once: out of the world, as the dead are, and laid flat on its back with each of its points on the floor under
  it, asleep (`layDead` in `sim/ragdoll.ts`). So a walk kicks it, a blow knocks it, a door or a platform puts it aside,
  and a body falling on it lies on it, as with any corpse.
- **A person** (`SKEL.dead`): the other patient's skeleton at a grown person's 75 kg, drawn as it is, part for part
  (`deadModel` in `render/castView.ts`; `RIG.dead`): slacks and shoes, a shirt in what the level says they wore (a
  guard in Security's uniform, its badge the one thing on it), grey in the face, the eyes near shut and the jaw dropped, the shirt
  stiff with dried blood front or back. It does not bleed again: its blood is the level's pool under it, laid as
  before. Each was grafted where it lies, so not necessarily dead (world.md §10): a small shelf of leaf comes out of one
  forearm in a raw knot, as on the other patient, which arm by the body.
- **Searched where it lies.** A body to search is still a use of the level's (`UseDef`, so the progression checker
  and the validator read it as they did), and is the one of the dead laid out from its spot: the prompt and its reach
  go where the body is, kicked or knocked (`interact.ts`).
- **The living unchanged.** The dead come after the living in a level's cast (`compile` in `content/build/plan.ts`),
  so the living keep their numbers, and draw nothing from the run's chance as they are made, so the living do as they
  did: every test of the cast's doings, the opening's among them, ran unchanged. The dev key 0 takes away the cast's
  dead but not the station's (they are the level's, and some have something on them).
- **Saved** as any corpse is (`Save.cast[].rag`). A level's cast is more by its dead, so saves are version 12, and a
  run saved before this does not load.
- **Looked at** in a browser (the upper station: the officer in his uniform on his blood, the deputy director in
  hers, each with its label on it).
- **Tests**: `test/dead.test.ts`: on every level, each lies where it was laid, on the floor, asleep and out of the
  world, and each body to search is one of them, searched where it lies; the living come first; the officer walked
  into is kicked a few centimetres, searched where it went, and saved there; drawn, laid as one mesh, and no pool of
  its own however it settles.

---

## 7. Navigation

As built in step 5 (`world/nav.ts`, `sim/fields.ts`):

- **The nav graph is built from the grid**: a spot wherever something can stand, on a 1 m lattice in plan and at
  every floor height (grid floors and sloped surfaces both), so one graph covers every layer of a level: a walkway and
  the hall under it are one place to the cast. Each spot knows its headroom, its room and the door it stands in, if
  any. Built once per level with everything that moves moved aside, and shared by every run of that level.
- **Near a wall at an angle** a spot may stand off its square's middle, at the nearest point in the square the wall
  leaves room for it (`NUDGE`). Walls on the grid's lines and the 1 m lattice agree; one at an angle, or a gap in one,
  falls anywhere across them, and with spots only in the middle a 1.4 m gap could have none either side to take a body
  through it. Nowhere near one, the lattice is as it was.
- **Edges** go to the eight neighbouring columns: a walk (a step up to 0.5 m, as a body climbs), or a drop (down to
  2.5 m, one way). Diagonals only where both squares beside them are open, so no corner is cut through rock. A
  platform joins the spots on it at the bottom to the spots beside it at the top.
- **Slopes** (step 8): a body climbs any floor that rises smoothly, a few centimetres a step, so a rise of up to a
  metre between neighbours is a walk both ways too, if the ground between climbs without a step over 0.25 m. On a
  steep floor a spot stands on the highest point under it. The cave's passages need both.
- **Doors and platforms are decided when walked, not when built.** The graph runs through every door; a field asks
  each door's state as it spreads. Who passes, as the first engine had it:
  - **crawl** (skitters, worms): open doors, jammed ones (under), and light doors that open by themselves;
  - **hands** (husks): any door a hand can work: not welded, panelled, jammed, heavy, locked or the lift's. A husk
    slides a dead light door open by hand and comes through;
  - **big** (bloat, thresher): no doors at all.
  Headroom filters too: 1 m to crawl, 1.8 m for a husk, 2.2 m for the big ones. These three are rows of `WAYS`
  (`sim/fields.ts`: headroom, doors none, under or by hand, whether it calls a platform); a kind that gets about unlike
  any of them is a new row (§6, *How the cast move, as built*).
- **Flow fields to the player**, one for each way walked and one for sound, by Dijkstra over the graph. One is
  refreshed each step in turn (about 2.5 ms each on the upper station's 7,600 spots), so each is at most four steps
  old and no step pays for all of them. Every level keeps the three the first engine had; a way of any other row only
  where some of the level's cast walk it (or one is put down there, in the arena), so a new way costs nothing where it
  is not walked, and on a level where it is, each field is a step older. A roam (a husk keeping its rounds) gets a field of its own to a room lit as
  the power stands, one new route a step across the whole cast (`rounds`, `pickDest` in `sim/cast/move.ts`): of the lit
  rooms it can get to as the doors stand now (a locked door bars it) within `ROAM.reach`, one the fewest of the staff
  are in or making for, at random among those, so they keep apart. A room is its boxes of one name that join
  (`placeOf`), so a hall built of four is one choice. One standing in the dark makes for a spot in the nearest lit room
  within `ROAM.light`, and with none keeps still until the light comes. A roam that comes no nearer its goal for a
  second and a half (waiting at a door or for a platform aside) gives it up for another (`Mutant.near`): two meeting
  head on used to sidestep into each other's way and back for good.
- **Agreed: mutants use stairs and elevators.** Stairs, ramps, walkways and drops are walked like any floor.
  Platforms: anything rides one that goes by itself; a husk calls one that has power, walks to its middle, rides it,
  and steps off at the top (tested: Cargo on backup, a husk calls the personnel hoist and rides it after you to the top
  deck). **Ladders**: the cast needs
  none. Every ladder in the station leads off its level, and the cast does not leave its level.
- A refuge (`safe`) is only kept out of the cast's rounds, as in the first engine; a hunter follows you into one.
- **Fields are cheap** (step 6): each is made from arrays of who may enter which spot (no call per edge), only when you
  have moved or a door or platform has changed, and only as far out as anything could use it (90 m for a hunt, 40 for
  sound).

### Two lines, one body, as built

Security's changed and the Commons' husks were one kind, `husk`, told apart by whether it carried a card. They are two
now (`husk`, `changed`; the night round is one of the changed), each knowing its line (`MT.line`: whose child it is,
world.md §10), and one behaviour takes them by their temper (`TEMPER`, `cast/husk.ts`):

| | the changed (bush) | the husks (bone) |
|---|---|---|
| `flee`: may run below this share of health | 0.4, as before | never |
| `rest`: stands between rounds (s) | 3 to 10, as before | 0.5 to 2 |
| `fidget`: at a post, shifts about it (m) | stands | 1.5 either way, at its `shift` pace (0.6 m/s) |
| `rouse`: turning on you sets off its line in earshot (m of air) | none | 14 |

A kind can have a temper of its own over its line's (`TEMPER[type]`): the bone line's middle years (`bonemid`) run at 0.6
of their health, and are otherwise their young's.

- **Drawn** by line, not by card: the bush's line as the changed (`changed()`), the bone line's as the husk.
- **Rousing** (`rouse`): a sound field from the one that turned (noticed you, or was struck or walked into), out to
  14 m; every other of its line in it not already after you, running, or stunned, turns too, and rouses in turn. On
  main, walking the street a minute: three or four after you at once, four or five in all, where it was two.
- **What did not change**: with the bone line given the changed's temper, the trace probe is the same to the bit on
  every level and the opening, so the split alone changes nothing; the four rows are the whole of the difference.
- **Dev**: key 6 in the arena puts down one of the changed; key 7 one of the bone line's middle years.
- **The bone line's middle years** (`bonemid`): the husk's behaviour and the husk's rig, at 1.08 times the size, 105
  kg, 1.95 m, 120 health, poise 35 (`POISE.bonemid`); its own model (`boneMid`, `render/castView.ts`) and skeleton
  (`SKEL.bonemid`, the husk's `grown`, `sim/ragdoll.ts`). Its blow is the husk's from the bone arm (`MOVES.bonemid`:
  28 harm against 20, reach 1.3 m against 1.0, a touch slower, harder to put off). Its gait walks the bench's stride
  (1.15 m/s) and hunts at 3.8. Its charge (`RUSH`, `cast/husk.ts`; states `brace` and `rush`): after you, with you seen
  3.5 to 9 m off and about level, every 4 to 9 s it may (a toss) brace 0.6 s, growling, and rush 1.1 s at most at 5.5
  m/s, turning after you at 1.2 rad/s; into you, 22 harm, poise 30, thrown 5 m/s (the thresher: 7.4 m/s, 45, 9); into a
  wall, it hurts itself and stands dazed. Never in its first seconds after you. Anything that makes it flinch puts it off
  a charge. It uses the husks' way: no spot it can walk on any level has under 2 m of headroom (measured).
- **The bush's line, old in it** (`plantold`): the changed's behaviour and the husk's rig at 1.15 times the size, 110 kg,
  2.05 m, 110 health, poise 30; the changed's model grown over (`changed(mat, m, K, over)`, `render/castView.ts`: at
  `K` 1 and not over it is the changed's to the vertex, checked) and a grown husk skeleton (`SKEL.plantold`). Its
  gait is the husk's scaled to the bench's stride and steps (`gaitOf('husk', …, 0.33, 56)`: 0.33 m/s walking, 0.89
  after you), so its legs, footfalls and prints go at its own slow stride. Its temper (`TEMPER.plantold`): never runs,
  rests 8 to 20 s, stands still at a post. Its blow is the husk's. On main, on post by the street's planter
  (85.5, 2.5). It fits the husks' way: no spot on it on main has under 2.15 m of headroom (measured). Dev key 8.
- **Loud doors** (`DoorDef.loud`): a big door slid open by hand is heard this far through the air, and those at rest in
  earshot come to it (`noiseAt`, which, for such a door, makes their search as long as the walk there). Cargo's, onto its
  dark bay, at 60 m: the young one at receiving and the middle-years beside it walk the forty metres to it, those deeper
  in stay.
  A test of Cargo's platform holds the cast still now, as the door it opens brings them.
- **Tests**: `test/lines.test.ts`.

### Size, as built

The graph is made for a husk: every spot, and the way between two, clear for a body 0.3 m in radius (`NAV_R`), that
steps up 0.5 m and drops 2.5. A body bigger, or one that climbs or drops more or less, now has its own say:

- **A way's size** (`WAYS`, `sim/fields.ts`): with its headroom, its radius (`r`), the step it climbs and the drop it
  takes. Each way gets a mask over the graph once (`sized`): spots too low or too narrow for it, and the links it may not
  take (too narrow, too high a step, too deep a drop). A way the graph is made for needs no mask; the three there are
  need none, so they walk exactly as before.
- **Where a wide body fits** (`fitting`, `world/nav.ts`): worked out once per level and radius, the first time something
  that wide is on the level. A body fits at a spot if it can stand somewhere in the spot's square (on the highest floor
  under it within a step: a stair's next tread, a slope's rise) with room over that to 2 m; and walks a link if it fits
  at both ends and somewhere across the way between. Somewhere, not at the middle: the lattice puts every spot in a 2 m
  corridor half a metre from a wall, and at the middle of its square a body 1.5 m across fits at none of them. So the
  graph also keeps where in its square each fits (`Fit.at`), and a wide body follows its field to there, not to the
  spot (`follow`, `cast/move.ts`). Tried and set aside: a circle at the spot's own floor height (every body wider than
  a husk was cut off from most of every level by its stairs and slopes), and a body at the middle of the square only
  (shut out of every 2 m corridor by the lattice).
- **Its cost**: half a second for a husk's width on the upper station or main, two for a body 1.8 m across; once, on
  the level it walks. Nothing on any level now pays it.
- **Steps and drops**: the graph has links for the highest step and deepest drop any way takes (`Nav.most`; each link
  knows the step it climbs, `Nav.climb`), and a way that takes less is masked off the rest. Sound goes over the steps
  and drops a husk does, whatever else is walked. A body climbs what its way does (`Body.climb`, from `WAYS`, for the
  step it walks up and the floor it follows down; yours and a husk's are 0.5).
- **The ones there are**: the three ways keep the graph's 0.3 m. At their kinds' true widths (a husk 0.34, a skitter 0.4,
  the thresher 0.5) husks lose nothing anywhere; skitters lose 27 spots on the upper station and 102 cut off on the
  plant; the thresher 6 spots on main, where it lives, and 668 cut off in the cave, where it does not. Not worth
  changing how they go, nor half a second on every level they are on. A test holds every kind to a way it fits, within
  0.1 m, but for the thresher and the bloat (which keeps to its room and never asks the way).
- **What did not change**: the trace probe is the same to the bit on every level, and again with a way added that climbs
  1.2 m and drops 4 (so every level's graph has links for it): the three ways are masked off them, and go as before.
- **Not yet**: no way of the game's is wider than the graph or climbs more; the first will be the big ones' (the bone
  mother's, the bloats that walk). The headroom between two spots is not looked at, only at each. A wide body follows
  the spots; it does not cut corners the way a smoother path would, and turns them as a husk does.
- **Tests** (`test/gait.test.ts`, *size*): a kind 1.6 m across, made from rows, keeps out of a 1 m slot a husk goes down
  and goes down a 2 m lane, its body too; climbs a 0.75 m ledge after you that a husk cannot, its body too; a way that
  drops 0.4 m will not come down off it.

---

## 8. Perception

As built in step 5 (`sim/cast/senses.ts`), the first engine's senses on the new world:

- **Sight** is a raycast from its eye to yours through the world model (walls, shut doors, crates and props hide you;
  bodies do not), within a range scaled by how visible you are: the light where you stand (`Lighting`), your own light,
  and crouching, as the first engine had it. A line of sight is looked along at most ten times a second.
- **Sound travels through space, not through walls**: what you do carries a distance (walking 4 m, running 9,
  wading 5, creeping 0; a jump 3, a landing 5, a door 7 or 10, a blow 6 to 10, a gun 36, for half a second), and a
  mutant hears it if the sound field puts it nearer than that. A shut light door adds 6 m, a heavy or welded one 12.
  Running in the next room is heard; running two floors up is not.
- **Memory**: not yet. As in the first engine, a hunter follows the field to where you are now, and gives up after
  losing sight of you for a while. Going to where it last heard you instead is a later refinement.

---

## 9. Power, doors, interaction

The rules in `world.md` §4 (doors and locks, power, repair kits) carry over unchanged. In v2 they are systems reading
components, not code threaded through the frame loop:

- **Power**: circuits are state; `powered` components read their level (0 dead, 1 backup, 2 full); the light bake and
  the render read the same state, through one rule (`circuitPower` in `world/light.ts`). A circuit is fed by Gen-1
  through its service connection, or is a branch (`feed`) that has whatever the circuit feeding it has, through its
  own; either way, at least what its own backup set gives. The Security wing is a branch off Ops (`world.md` §8).
- **Doors**: one system runs the rules for light, heavy, stuck, sealed, vent and lift doors, card and keypad locks.
  Collision, pathing and sight learn a door's state from its mover, never from a special case. A window is a door too: sealed,
  and glass (`DoorDef.glass`), so it stops what moves while every sight check (the cast's, the cameras', your flashlight's)
  looks through it; it is drawn as a tinted pane.
- **The staff's drill** (`world.md` §8): a breaker opened by hand starts a drill (`drill` in `sim/cast/husk.ts`): each husk it
  leaves in the dark is given a time to go (a quarter at once, the rest between 30 s and 180 s, later more likely), and goes
  to the board to throw it back if it is still in the dark then (state `fix`). Saves keep the drills.
- **Interaction**: anything with `interactable` is found by one query (in reach, in view, unobstructed), as today's
  `findInt`.
- **Cameras and zone alarms** (`sim/eyes.ts`, `world.md` §8): `LevelDef.cameras` (a lens, a yaw, a cone, a range, a circuit,
  a zone) and `LevelDef.speakers` (one a zone: the floor under it). A live camera sees you as the cast do (range times how
  visible you are, the cone, a clear line). Only a camera hung in an armed room (`RoomDef.armed`) guards (`Cam.guard`);
  the rest only record, and have no light. A guard holds you while you are in an armed room and moving at any pace (over
  `EYES.still`), a second of hold a second; standing in view it drains; out of view or out of the room it lets go at
  once. Held `EYES.hold` it sounds its zone, once a sighting (`Cam.tripped`), and keeps it sounding while it still sees
  you moving. An armed room is not marked (its red signs and hazard paint are gone): its guard is in plain view from
  every way in, which `test/eyes.test.ts` checks; the cast leave armed rooms out of their rounds. An alarm keeps a route
  to its speaker and how far its sound carries (both made once, when it starts, and again on load); each time the
  klaxon goes round, every husk in earshot that is not hunting takes the state `answer` and hurries the route (its own
  copy) at 2.6 m/s, 3.4 with another in sight hurrying too (`ANSWER` in `sim/cast/husk.ts`). Each round also locks the zone
  down: a door is in the zones of the rooms either side of it (`RoomDef.zone`, `doorZones`), and each in the zone that
  can move with the power it has is drawn (`Door.drawing`, `LOCKDOWN.draw`) and then bolted (`Door.down`, which
  `locked` counts, so it blocks the cast's ways too) while an alarm in one of its zones sounds and it keeps its power.
  A call point is a use of kind `call` (`content/build/furnish.ts`, `callPoint`; its zone in its opts, which validation
  checks has a speaker): used, it is spent (`Usable.off`, kept by saves as any spent use) and sounds its zone if the zone
  is `heard`; its pane is drawn until it is spent. Nobody is behind the screens: a camera
  needs only its power and to be whole. A smashed speaker mutes its zone (`Sim.mute`): nothing sounds there at all. (The
  overseer, its hand, its knock codes and its bolts were built here and taken out in Security's second pass.) A speaker is used from below only, and hangs in its room's ceiling. It is wired from its PA (`SpeakerDef.pa`, a
  circuit), not from its room, and sounds only while that has power (`heard` in `sim/eyes.ts`); Security's is critical
  power, which nothing you can reach switches. Saves keep each camera's state, the muted zones and the alarms; the
  routes are made again. Doors keep their bolts.
  A console is a use of kind `watch` (`monitors` in `content/build/furnish.ts`: a circuit, and its cameras by
  `CameraDef.name`, which validation checks are there). Sat at it, `Sim.watch` holds its feeds and the one on screen;
  each step `watching` (`sim/eyes.ts`) takes the input for itself (strafe for the next feed, a press at a time; use, a
  hurt, or the console's power going stands you up) and passes on none of it, and there is nothing to use. Saves do not
  keep it. `present/ui/feed.ts` puts the view at the lens (yaw as the sim's, tilted down a little), greys and lines it,
  hides the hands, shows the body's hidden parts, and shows no signal for a camera that is not `camLive`. A console with
  a `dwell` (`monitors`' option) has a sequencer: `Watch.t` counts up on a feed, and at the dwell it steps on; a press
  steps it and starts the count again.

**As built in step 4.** The game's state is plain data in the sim (`sim/game.ts`): circuits and Gen-1, keys, what you
carry (ten slots; a grid since, §11), lights and battery, what you wear, papers read, health, the run's keypad codes. What happens comes out
as events (a message, a sound and where it came from, a note to show, a keypad, the power changing, the end); what the
player chooses in a menu goes back in as commands, applied at the start of the next step, so a run is still only a
sequence of inputs. The door rules, the labels and the answers are the first engine's, line for line
(`sim/movers.ts`, `sim/interact.ts`). The world stands still while a menu is open, as it did (all but what you carry,
since: §11).

---

## 10. Determinism, saving, testing

- **Seeded randomness.** Each level is dressed from its own seed, so it looks the same on every load. The sim has its
  own seeded generator. `Math.random` is not used in `content/`, `world/` or `sim/`.
- **Stable ids.** Each world numbers what moves from 1, in the order it is made, so a level loaded twice gives the
  same ids and a save can name things by them.
- **Save and load** serialise the sim state: entities, circuits, inventory, flags, the player. The world model is
  rebuilt from content, never saved. A loaded run plays on exactly as the original would have (step 7).
- **Headless.** The sim runs in Node without a browser. That enables:
  - **Unit tests** for queries, the body controller, door rules, power.
  - **Level validation** at build time: every ladder has two ends, every key, card and code exists somewhere
    reachable, every door has a circuit.
  - **The progression checker** from `world.md` §4: prove from a save that the game can still be finished.
- **Nothing may hang.** Every test has a 10 s limit and every CI job a 10 minute one.
- **Proposed tools:** Vitest for tests; `npm run check` runs types, tests and level validation.

---

## 11. Presentation

- **The shader carries over**: unlit is black; the level's light plus flashlight cone plus lantern; flat shading from
  derivatives; fog; the wet tint; emissive colours.
- **Light (agreed, built in step 3; a light field since)**: each room is lit by its rule and its circuit's power (full,
  backup with emergency lights, or dark), in `world/light.ts`. Where that light goes is `world/lightField.ts`: a lattice
  of points every 0.5 m through the open space (each at the middle of a grid cell, so open or rock exactly as the grid
  has it; joined to its neighbours where the cell between is open), and for each source (a room, a lamp) what it would
  throw at each point if it shone white. A room's own light is its fill (even through it, reaching a metre or two out
  through its openings and fading, each room taking its share where rooms meet, so light changes across a doorway, not
  at a line) and what its fittings throw; fittings and lamps are seen point to point outward from the light, so they
  shine through a doorway and over a rail but never through rock. Light is linear in its sources, so the light under any
  power is a sum (a few ms), worked out once per level (about a second for the upper station, kept per level). Doors are
  gates: light through a door is kept apart and counts as far as the door stands open, so it spills out as one lifts.
  Fixed props are stamped into the lattice (a point inside one is closed, a join through one is cut), so a crate or a
  container throws a shadow from a fitting over it; and the fill a point takes is shaded by how open it is round it,
  above most (`SHADE`), so the floor under a desk, a corner, the gap under a slab are darker, as they would be. A room
  whose tubes stutter flickers wherever its light has reached: the field keeps the part of each point's light that
  flickers, and the shader and everything that moves dim that part with the tube. It keeps which way the light comes
  from too (since; `dir` in `world/lightField.ts`, `Lighting.directions` and `towards`): each source, with what it
  throws at a point, keeps the way back to it from there, as long as the share of it that comes from one way (a lamp
  all of it; a room's fittings toward those that light the point, by how much each does; a room's fill none in the
  room, where it has bounced about, and out past it mostly from the opening it left by, `FILL.way`). Summed like the
  light, by how bright each source is, it is linear in the sources too, so the power, the doors and the lights put down
  change it as they change the light. The shader lights a surface by how it faces it (`DIR` in `render/shader.ts`): the
  wall facing a lamp or a lit doorway takes more than the one side on to it, a floor under fittings more than the
  ceiling beside them, a bump catches it on the side it comes from, and what has gloss takes a soft sheen from it, so a
  polished floor shows a streak toward a lamp. What moves is lit the same way, from where it stands. In a hall under a
  grid of tubes the pulls sideways cancel, as they do in a real one, and the walls are lit evenly. It is the screen's
  alone: the sim, and what the cast see you by, go by how much light there is, never which way, and the sim never
  makes it.
  The renderer puts the field on the card (`render/lightVolume.ts`: a brick of 9³ texels per grid chunk and an index of
  them) and the shader blends the 2³ points around each pixel, only those on its open side and joined to the nearest,
  so no light comes through a wall or a slab; only the bricks whose light changed are sent again. A pixel on a face's
  edge is shaded where its middle would be on the face (the edges are smoothed), which past the edge can be inside what
  the face meets, with no open point about it; it is looked up again from nearer the eye (`field` in `shader.ts`).
  Unlit, those pixels were a line of black specks along the foot of a wall seen far off, crawling as you moved. What moves asks
  `Lighting.atPoint` (and `flickAt`), which blends the same way; what the cast see you by asks `Lighting.seen`, the same
  and any beam lying about that falls on you. `?power=full` shows a level with everything
  on.
- **Audio**: the synthesised sounds carry over, positioned from sim events (`present/audio.ts`). Since: a sound from a
  place reaches you the way the cast hears you (§8), along the sound field, so a shut door or rock muffles it and puts
  it further off; feet sound like what they fall on (concrete, a walkway's grating, rock, a puddle, a crate, a
  platform); you are heard jumping and landing, splashing in, gasping up; under water everything is dull. What the sim
  has no need to say is the soundscape's (`present/soundscape.ts`): the cast breathing, clicking, gurgling and dragging
  themselves along, their deaths, crates scraping and landing, caves dripping, your heart when you are badly hurt. It
  reads the sim and never draws on its seeded numbers. Every room echoes by how much air is in it (three synthesised
  echoes, a small room's, a hall's and a vast space's, mixed by the room's volume; rock rings more). The station makes its own noises now and then, from your room or one near it, overhead, muffled by what is between
  (`ambientFor`): a fitted room's pipes knock (more with its pumps running, sometimes a run of water hammer), its frame
  groans (more the bigger it is) and its metal ticks; a cave's rock settles, grit coming down after. When the power
  changes, metal ticks for a while as it warms or cools, and the pipes knock as the pumps take up or let go.
  A fitted room's air is heard moving while its fans run, louder, brighter and to one side near a grille: a soft rush on Gen-1, barely a breath on a backup set,
  and none in a dead room, where the dust hangs (`roomAir`). Gen-1 is heard from
  its board in the generator hall, along the rooms, and winds up and down; on the other levels it is a rumble in the
  rock. A flickering room buzzes and crackles in step with its light: the shader and the soundscape both ask
  `present/flicker.ts` when the tube is dimmed.
- **Light and air** (since): the flashlight is held, not glued to the eye: the beam trails the view by about 70 ms and
  sways with your stride (`present/camera.ts`); its cone is a reflector's (a hot centre, a faint ring at its rim, a
  wide dim spill); and a wall close in front of it throws a little light back around you (one ray a frame). It shines
  from your left hand (what you swing is in your right), a little below and left of the eye, aimed at what you look
  at: the beam crosses your line of sight where that meets the first thing along it (`AIM`, eased so it does not jump
  across an edge). It has a shadow map of its own from the hand (`HELD` in `render/shader.ts`, `render/beams.ts`,
  drawn each frame it is on), so what stands in it throws a shadow, off to the right of it, that slides as you sweep
  the beam: a pillar's down the floor and the wall behind, a rail's posts across the steps below, your legs' on the
  floor when you light your feet. Your head and arms are left out of it, the lens being in your hand. (Before, the
  beam came from the eye, which needs no shadows, as what it lights is all you see; it read as a disc laid on the
  world.) The eye
  adapts (`uExpo`): it opens slowly in the dark and narrows fast in light, so a room coming on glares; in a lit room it
  stays a little open, so light reads as light. The scene is drawn as light, not as a picture: every shader writes the
  light it sees, past white where it is brighter than that, into a target that keeps it (half floats, four samples a
  pixel), and one pass makes the picture from it (`render/post.ts`): the eye, the glow, the tone curve and the grain,
  the same for everything drawn. The glow is a bright light's halo in the eye: what is over white is taken down by halves
  to a small image and back up, wider each step, and laid over the picture (`GLOW`), so a tube, a lit screen and the
  beam's centre on a wall close by bloom. The tone curve (`LIFT` and `TONE`) lifts the mid-tones and leaves black
  black, as before, and under its knee it is exactly what it was; over it light is rolled off toward white, keeping its
  colour, instead of clipped, so the beam's hot centre has a shape and not a flat edge, and very bright light whitens.
  A fitting is drawn brighter than white, so it glows: a tube lit by its room's light (its `glow`) 2.4 times what it
  was, a bright emissive colour (a lamp, the lobby's false sky) up to 3.2 times (`EMIT` in `render/shader.ts`); the
  night round's lens too. Where the card cannot draw into a target that holds more than white, it draws into one that
  cannot, and looks as it did before. The haze is thin in dry air so a long hall reads to its far end, and the player's
  brightness setting (title and pause screens, kept between runs) scales the eye. All of it is the screen's alone: the
  cast and the cameras see by the light as it is. The dark is grained, most where it is darkest. A fitted room's light falls in pools under its ceiling fittings (`LevelDef.fixtures`, `POOL` in `world/lightField.ts`):
  a point takes 0.55 of the room's light plus 1.3 times what its fittings throw at it, down and falling off, so the
  floor under a tube is lit above the room's level and the corners and the ceiling below it, and what they throw
  through a doorway lights the floor past it. Between the lights you are a little harder to see. A room on its backup set is lit amber; its brightest channel, which
  is what the cast see you by, is what it was. Power that comes on is seen to (`present/cascade.ts`): room by room out
  from where you are, each tube striking (on, off a moment, on) as it catches, and heard to near you; only the rooms
  that flip have their light added again (`Staged.flipped`). Power going off is not staged, and the sim's light changes at
  once. A lamp's light reaches r metres from where the lamp is, up and down as well as across, so a light on the floor
  does not light a ceiling far over it; like a fitting's, it is stopped by rock and a shut door.
  **Lights lying about** are the lights you carry, not stand-ins for them. A light can be put down (the inventory's
  Lights), and one on stays on where it lies, pointing the way you faced, its battery running down there as in your
  hand; taken again, it is on in your hand. The flashlight at the stair's foot is one (`ItemDef.on`: lying on, and its
  aim). A flashlight lying on is drawn with the same beam as yours (`FLASH` and `spot` in `world/light.ts`), from its
  lens, with a shadow map of its own (`render/beams.ts`, the two nearest you); what it throws back (`BOUNCE`, as yours
  does) and a lantern lying on (`LANTERN`) go into the level's light field (`Lighting.lights`), worked out again once
  the light has gone half a metre or turned 8° since it last was (`DRIFT`). A point is looked up
  in a beam's map off its surface by two of the map's texels as wide as they are there (`STANDOFF` in
  `render/shader.ts`), yours as well: by a fixed few centimetres, a floor a beam raked from far off shadowed itself in
  stripes, the map's rows and columns, that crawled as the beam moved. The night round's torch showed them across the
  isolation suite and into the rooms off it (its map's texels are 5 cm across 10 m off), your own on a corridor's floor
  15 m and more ahead. Every shader draws every
  light that is not the level's from one piece of GLSL (`LIGHTS` in `render/shader.ts`: yours, and those lying about),
  so each light is added once and is the same light on a wall, a body, a footprint or a speck of dust. Motes (`present/render/motes.ts`) hang in the air about you, square flecks lit as a surface is (by the room as much as by your beam, never brighter than the wall beside them): with a live circuit the air
  is drawn toward the room's ceiling grilles (`LevelDef.vents`: one at each end of a long fitted room, one in a short
  one) and turns up into them, on a backup set barely, and in a dead room it hangs and settles;
  caves drift on their own. Moving air carries dust off: a ventilated room shows a quarter of a stuffy one's, a room on
  its backup set about half. Each speck has its own velocity, easing toward the air's, and anything moving through it,
  you or the cast, drags it along and shoves it aside; it keeps that push until the air takes it back. A room says what is in its air (`RoomDef.motes`): spores in Horticulture and the cave,
  dark red flecks in the Cargo nest and the nest residences, dust elsewhere; even there most specks are dust, with the
  room's own kind among them. A door shut twenty seconds or more breathes out
  at you when it opens, with a gust you hear.
- **Footprints** (since; `present/render/prints.ts`): flat blocks, the one shape blood has in the station. Each
  walker leaves one a pace, the size of the foot that made it (as the models in `castView` have them) and its pace by
  kind (yours and a husk's left and right, the thresher's broader and further apart, a skitter's small, quick and
  splayed wide, a worm's one wide patch), a touch smaller and fainter as what is on its soles runs out. Out of
  water they are wet for a dozen or so, which dry off in half a minute; through blood (a pool the level was built with,
  `LevelDef.stains`, or under one of the cast that fell) red for about ten, and those stay; through what a green one
  bled, green. A print that comes down on one already there grows it (to 1.6 times its first size) instead of lying on top. None in
  water, on a crate or on a platform. The newest 256 are kept; they are looks only, not saved. Bleeding is for later.
- **Your body** (since; `present/render/selfView.ts`): rough blocks in the coverall the sleeve already shows, stood
  under the eye with the spine 0.16 m behind it (further as you look down, so you see your legs and feet, not the top of
  your chest). The eye is shown the hips, the torso and the legs; the head and the arms are only drawn into shadow maps
  (`SHADOW_ONLY`), since the hand in front of the camera is `handsView`'s. Each leg is worked back from its foot (thigh
  and shin), so the feet keep to the floor; a whole stride is the distance between two footsteps heard (`sim.ts`), and
  the right foot comes down on the sound. Crouched, it sits right down on its heels, knees forward. A flashlight lying
  on throws your whole shadow (`beams.ts`). The fittings over you throw one too, though the level's light is worked out
  once: the body goes to the level's shader as five capsules (torso and head, legs, arms; `SELF` in `shader.ts`) with
  the nearest two lit fittings of the room you stand in, and each takes back its share of the light where it falls,
  as the field reckons a fitting's pool (`POOL`), drawn 1.6 times darker than that (`SELF.dark`: the field's fill is
  mostly the fittings' light too, and by its numbers alone a shadow between two fittings was barely there), soft-edged,
  wider and fainter with distance, gone past 7 m. Only the
  room you are in, and only you: the cast throw no shadow from a fitting yet. Looks only.
- **Drips** (since; `present/render/drips.ts`): a level's caves and rooms over standing water drip from fixed points
  (one to three a room, found from the level's id, so the same each load), each with roof above and a fall of a metre
  or more under it. A drop falls now and then; on water it spreads a square ring, on stone a small splash over a
  patch kept dark and wet; and it is heard where it lands (a plink on water, a tap on stone), not anywhere.
- **A fight's feel** (since): a swing let go early is a jab, weaker and slow to recover from, not nothing: it stuns and knocks
  back in proportion to how far it was loaded (a quarter-loaded jab, a quarter as much); a blow that
  lands, or meets a wall, holds the swing still a moment (hit-stop) and dips the view; a hurt from one of the cast
  knocks the view away from it and flashes the edge of the screen on its side; a husk's or skitter's wind-up that you
  step back from is heard to miss; the cast are rocked back when struck, and a light one knocked back slides its
  0.3 m (from a full blow) over a sixth of a second. A swing lands on whatever in reach is nearest the crosshair (the nearer of two about
  as near it), so with two in front of you, you choose which you hit by looking at it.
- **Their blows, as yours** (since): a husk's, a skitter's and the thresher's (on foot, not its charge) blow is three
  motions (`BLOWS` in `sim/cast.ts`). The wind-up is the tell: heard (a husk draws breath, a skitter clicks, the
  thresher growls) and seen (arm drawn up, rearing, arms spread); it turns to follow you for the first part of it, then
  holds its line, shaking at the top. The strike is short and lunges a little along that line, and lands only on you in
  an arc in front of it (a husk ±55°, a skitter ±35°, the thresher ±70°), within its reach and about level with it, so a
  step round it as it commits is a step out of it. Then it recovers where the blow left it, not moving or turning,
  longer when it met nothing (a husk 0.5 s, 0.85 s on a miss). A blow of yours that catches it recovering does a
  quarter more and stuns it longer; one that catches it winding up loses it the blow. A swing loaded while you dodge
  lands in that time; one begun after does not. A worm's (one of a pair; one alone only touches you) and a swimmer's
  reach is the same three motions, short: a rasp and the head lifted for 0.3 s, a grab, a quarter of a second open; a
  light put on a worm as it lifts puts it off. ?dev, O draws each blow's arc while it is under way.
- **Nothing fights in one plane** (since): everything is drawn two-sided, so two faces in one plane (a button flush with
  its post, a box on a shelf or the floor, a crate on a crate) showed through each other as you moved. Each prop and
  each part of a thing is drawn 1 to 7 mm larger than it is, different for neighbours (`apart` in `levelMesh.ts`). A
  grid floor or ceiling that a sloped surface covers (a cave flat at its room's floor) is not drawn at all. A run of
  parts laid face to face to read as one piece is drawn at its size instead (`PropDef.flush`), or every joint shows: the
  lobby's grand stair (`grandStair`), each tread and each block of its balustrade running on 2 cm into the next and
  5 mm into the floor, and the balustrade's faces sheeted 5 mm clear, as the end of each block stands edge on in the
  face it runs into. Its four stairs underneath are only the way up (`stairs(..., bare)`): their own steps, drawn
  inside the stone treads, showed through them.
- **Signs** (since; `present/render/signs.ts`): lit as any surface is, not from within (a black plate shone in a dark
  room): the room's light where each hangs, and the lights you carry. What is pale on them is retroreflective, as real
  room signs often are, so under your beam the letters flare and the plate stays dark. Each takes its look from the wall
  it hangs on: bronze letters straight on the family's limestone; a small dark plate with a bar of the room's stripe
  colour on block, plaster and board; a white plate with a coloured band on glazed tile; the name stencilled in worn
  paint on concrete and shotcrete. Drawn at 420 px a metre and sized to their words, so short names have short plates.
- **The exhibit's boards** (since; `present/render/exhibit.ts`, the words in `content/exhibit.ts`, hung by `exhibit()`
  in `content/build/plan.ts`): printed boards, lit as the signs are (their material, `faceMaterial`), matt, so they send
  only a quarter as much of your beam back. Each is drawn on a canvas from its board's data, its picture in flat paths
  (`ART`), 300 px a metre (fewer on a long one, to stay under 2048 across). What is read off a board is a bare note on
  its face, one a stage on the long one. *Found building it:* a board 4 mm in front of a solid backing was lost
  entirely to the level's depth, drawn first and pushed back a hair (`depthFirstMaterial`), and z-fought it with that
  pass off. So a board stands 3 cm off the bare wall as a sign does, and its bronze frame is four bars round its edge:
  nothing of the level lies just behind it.
- **What a frame costs** (since; measured in headless Chromium on a software GPU, so the counts and the main thread's
  share are real and the GPU's times only relative). The sim was never the trouble: a step is about 0.9 ms (99 in
  100 under 2 ms) on any level, the slow ones only in its first second. A frame was, three ways. It made too many
  draws: the level was one mesh, sent whole through every pass; every door, camera and speaker on the level was drawn
  wherever you stood (never culled); and every part of every one of the cast in view was a draw, in rooms beyond the
  walls too, so 700 to 1,540 draws a frame (the main level, looking across it). It lit pixels for nothing: the level
  drawn in the order it was built, each pixel's light was worked out 1.1 to 3.5 times (the lobby the worst). And the
  renderer walked its two thousand things to place them once for each pass. Now: the level's mesh is in pieces, one
  per 16 by 8 by 16 m of space (`PIECE` in `render/levelMesh.ts`), culled like anything else, so the flashlight's shadow
  map draws what is in its cone (in the cell, 205 draws and 62k triangles became 40 and 9k); its depth is drawn first
  and the light pass shades only what is in front (`DEPTH_FIRST`, `post.ts`; 1.05 to 1.3 a pixel); moving things are
  culled and looked up in the light only when they or it have moved (`Lighting.epoch`); the cast out of your sight
  (`SIGHT` in `render/castView.ts`: lines from the eye to its middle and corners, against the grid alone) is drawn
  only into the shadow maps that could still show it, a beam lying about's (`UNSEEN`) or the one in your hand if it
  stands in that cone, and otherwise not looked through at all; and the scene is placed once a frame. 157 to 577
  draws in the cell, 57 to 527 on the main level; the main thread's share of handing a frame over, slowed four times
  as a phone's would be, from 40 to 79 ms to 8 to 33. The material table each draw sent is written into the shader.
  The screen's resolution is the last thing given up (`present/quality.ts`): while frames come late and the page's
  own work is not what holds them, a step down (to 85, 72, 60, 50 and 42% of it), up again after a while on time,
  not soon to a step found too slow; a step that does not help is followed by up to two more, and if none helps (a
  browser holding frames to 30 a second) they are taken back and none tried for a minute, then longer. Where it
  settles is kept on the device; a phone starts at 72%. `?fps` shows the frame rate and the share drawn; `?dev` has
  both in its readout. Tried and set aside: drawing the level's pieces nearest first instead of their depth (the
  renderer's own order is by where a piece's middle falls on the screen, wrong for the piece round you; put right by
  hand, a fixed order within a piece is right from one side and wrong from the other, and the lobby went from 2.9 to
  7.3 a pixel). Not done: one draw for each of the cast (skinning), and doors and fittings merged into fewer draws;
  the many-materials cost of a draw, which the counts above have mostly made small.
- **Touch** (since; `present/touch.ts`): a phone or a tablet (`pointer: coarse`) is played on its side, the whole
  screen (asked for on the first tap, and pausing if left). The left of the screen is a stick, put down where the
  thumb lands: how far it is pushed is how fast you go, past its rim you run (loud, as Shift is). Anywhere else is
  dragged to look (a speed of the player's own, in Settings). On the right, the hands (held to load a swing and let go
  to throw it, as the mouse button; dragged, it looks too, so a swing is aimed as it loads; a sight with a gun), use
  (lit when there is something to use), the light, jump and crouch (held, swim up and down); at the top, what you carry
  and pause. Each button is a picture, not a word. The menus are tapped as they are clicked, with a back arrow for Esc;
  the HUD moves to the top left, out from under the thumbs. Only feeds Controls, as the keys and mouse do.
- **UI** stays in HTML over the canvas, with the current type and colours (Barlow Condensed, Newsreader, bone, ash,
  hazard). **As few words as will do** (since): everything that is not a paper is pared to what you cannot do without.
  - The title is the name and a menu: Continue (with a run kept), New game, Settings. Pause is Resume, Settings, Quit
    (to the title, the run kept: pausing saved it). Settings holds brightness, surface detail, look speed by touch,
    which side A and D swing from (since), and the controls, which no longer stand on the title. New game over a run in the page makes the run again in the page
    (`fresh` in `main.ts`; what was drawn for the old one is let go, `LevelView.dispose`). The test bed, the lights on and
    the first engine are linked from the title under `?dev` only. The end is its word (Surface, Grafted); the way out is
    told as before, without the counts; a click goes back to the title.
  - Behind the title, a shot of the station. A run kept is shown where you left it. With none, a level made for the look
    of it only (`shotRun` in `main.ts`, the power set for it and you stood at the camera; New game makes the real one):
    the lobby lit end to end from the head of the grand stair, or the cargo bay dark, low by the door in from Security,
    toward the nest's red glow on the floor; one or the other each visit (`?shot=lobby`, `?shot=cargo`). Your hands are
    not in it. The title's shade is dark under the name and behind the menu, and light elsewhere.
  - In play: no room or level name (you do not know where you are), nothing about what is in your hand (you can see it);
    the bars, and the rounds left as a bare number while a gun is in hand. What you look at that can be used is named
    under the dot, which grows a little: a thing's name, with no verb and no key (a state only where nothing in the
    world shows it: a breaker's, a backup set's). A console's feed keeps what a monitor prints over it (its camera's
    name, the clock) and says nothing of how to work it.
  - What you carry is System Shock 2's (`present/ui/carried.ts`): Tab brings it up as a strip over the top of the game,
    which **goes on** under it. With a mouse, the pointer leaves looking to work it (`Controls.free`: no look, no swing,
    and its capture let go is not a pause) and you still walk; Tab again puts it away and takes the pointer back; Esc
    pauses. By touch it is only shown, the stick and the buttons live beside it. A paper read from it opens over the
    paused game, and puts you back in it after.
  - It is a grid of 8 by 3 cells (`GRID`, `content/items.ts`), and each thing takes the cells of its `size`: most one;
    the baton, the wrenches, the knife and the pistol two, standing; the pipe, the axe and the shotgun three; a vest
    four, square; the fuse and the splice kit two, lying. Nothing shares a cell. What you take goes in the first place
    it fits, down each column from the left; where it fits nowhere but there is room enough, everything is packed
    again, the biggest first; only then are your hands full (`stow`, `sim/game.ts`). Dragged, a thing moves where it has
    room (the `move` command; where it would land shows, yellow or red), onto you to wear it, or out of the strip to
    put it down; a right click puts it down too. Clicked, it is used as before (a weapon into your hand, outlined;
    food; a battery). Places carry over in a save; one from before the grid finds everything a place on load.
  - Beside the grid, what you wear, one of each kind (`WornSlot`: body, head, eyes, breath) and your two lights; an
    empty place shows faintly what goes there. A second vest is carried, not worn over the first; put on, the first
    comes off into the grid. Under the grid, the keys you know (cards coloured by whose they are) and the papers read.
  - The pictures (`present/ui/icons.ts`) are in colour, the colours each thing is drawn in where it lies
    (`content/lying.ts`), shaped to its cells and outlined in ink. Each is named only while the pointer is on it (by
    touch, the last tapped); counts are a number in the corner.
  - What the sim says (`say`) is only what you could not see or hear for yourself, mostly what a thing wants that you
    lack (No power. Not on the backup. Needs the Security keycard. Needs a splice kit. Hands full.). Taking something,
    a switch thrown, a door unlocked, a keypad's code taken are heard, not said; the hints in the narrator's voice are
    gone. What a level gives a place to say (a body searched, a sealed door, a look at a schedule, a ladderway) is the
    level's writing; its labels are names (Officer, IV bag, Breach).
  - **None of it is on the screen, for now** (since): the messages at the bottom left are gone, the level's writing
    with them, until what it says can be shown in the world (on the thing itself, a screen, a sound). The sim still
    says it (`say` events), for the tests and for when it is shown. What a paper says is read as before; a code read off
    a body is among your papers. The drag-to-look hint for a browser that refuses the mouse's capture went with them.
- **Dev tools** carry over (`?dev`, fly, god, level select, map), plus overlays for colliders, nav graph and noise.

---

## 12. What carries over

- The new station's levels: upper station, main level and Commons, Horticulture, plant level, the sump and drowned
  sump, the cave. Ported into the v2 content format, keeping their plan coordinates.
- The cast and its behaviours (husk, skitter, bloat, thresher, worm, rootworm, swimmer, grabber, vine), items,
  weapons, notes, the lift, ladders, circuits, backup sets, repair kits.
- The look, the sound, the HUD.
- `world.md` §7: real access problems, the generator room as a climax, the thresher in the dark, light as a trade.
  v2 is not done until the upper station feels at least as good as it does now.

---

## 13. Build order (proposed)

Each step ends with something you can open and play.

1. **Scaffold. Done.** `v2/` with Vite, TypeScript, three.js, the fixed-step loop, the shader, and the test bed (a
   hall with steps, a mezzanine, ledges, a crawl, a dark room). Pulled forward from step 2 so there was something real
   to walk in: the dense grid, the basic queries (`overlapCylinder`, `groundBelow`, `ceilingAbove`, `roomAt`), the
   body controller (walk and slide, step up, gravity, ceilings, crouch), the greedy mesher. Tests run the sim headless,
   including one that proves two identical runs end identically, and one that enforces the layer rule (§3). CI runs
   them on every pull request that touches `v2/`.
2. **World model and body, the rest. Done.**
   - **Sparse grid**: chunks of 16³ cells exist only where there is space; the mesher walks only those.
   - **Queries** for circle and rectangle footprints; `sweep`, `raycast` and `pushOut`.
   - **Sloped surfaces**: ramps, cave floors and ceilings (§4).
   - **Doors** slide up when anything comes near and never close on it.
   - **Platforms** carry what stands on them and never crush it. One leaves when someone steps on after it has
     stopped, so it does not carry you off while you stand on it.
   - **Water**: wading slows you; in deep water you float, swim up and down, haul yourself out onto a ledge up to
     1.7 m above your feet, and your breath runs down while your head is under.
   - **Loose crates**: pushed by walking into them, knocked off stacks, carried by what they stand on, asleep when
     still. The awake budget is 16; a tumbling pile of 48 measured 0.46 ms per step headless, under 3% of a frame.
   - **Test bed lab wing** (through the door south of the hall): a ramp to a balcony, a lift to a gallery, a pool
     with a shallow shelf, crates to push, a cave. **Collider overlay**: `?dev`, then G.
3. **The upper station, static. Done.**
   - **The tile adapter** (`content/build/tiles.ts`, `fittings.ts`; retired since for levels in metres, §4) kept the
     first engine's way of laying out a level: decks of 2 m tiles, rooms, doors, caves and terrain fields, walkways, platforms, and its furniture kit.
     Levels port nearly line for line, then compile into v2 shapes: rooms, floor slabs under upper decks, rails on
     walkway edges, doorways with doors, cave surfaces from the terrain, ceiling fittings, props. A room can sit above
     or below its deck's floor (`dy`: the muster court, 1.25 m down; keep it to the grid's quarter metres), its ceiling
     riding on its own floor, and `flight` lays steps within a deck between two heights.
   - **The upper station and the Cargo cavern** (`content/levels/upper.ts`), ported from `buildUpper` and
     `buildCargo2`, with the station's circuits and ladderways (`content/station.ts`). It is now what v2 starts in;
     `?level=testbed` for the test bed.
   - **Carried as data for later steps**: items, notes, the cast, things to use (corpses, panels, backup sets,
     ladders, the lift), door rules (cards, codes, heavy, sealed, jammed), signs, marks. Doors open for anything near
     except welded and jammed ones; the rest of their rules come in step 4.
   - **Doors, platforms and signs** are drawn as they were.
   - **Reachability** (`sim/reach.ts`): a flood on foot from the start, doors open, platforms joining their ends.
     A test proves every room is reachable except the three behind welded doors. It is the seed of the progression
     checker.
   - **Measured** on the upper station: 58 rooms, 726 props, 2,081 chunks (16 MB of grid), 52 ms to build and
     compile, 200 to 300 ms to mesh in the browser (about 1 s under the test runner), 67,000 vertices.
4. **Doors, power, interaction, items, inventory, notes, HUD. Done.**
   - **Power**: circuits, backup sets, service connections, Gen-1's fuse and breaker; a change relights the level,
     door lights and signs (1.4 ms).
   - **Doors** with all their rules: light doors open for you on a live circuit and slide by hand on a dead one; heavy
     doors need Gen-1 and their button; card readers and keypads (the Armory code is drawn per run); welded, jammed
     (crouch under) and loose-panel doors; the surface lift as the way out.
   - **Things to use**: items to take (drawn as they were), notes to read (all eighteen, word for word), corpses to
     search for cards, backup sets, panels, cargo platforms called and ridden on power, ladders that check their gates.
     Ladders, stairs and the lift say so when the level they lead to is not built yet.
   - **You**: health, falls and drowning hurt, a flashlight to find and a battery that runs down, ten slots, the end
     screen (death, or the surface).
   - **The HUD and menus** as they were: messages, the use prompt, health, breath and battery bars, what is in hand;
     the inventory (Tab), a note, the keypad, the lift panel. The sounds, synthesised as before.
   - **Proof** (`test/puzzle.test.ts`): the upper station's gates played headless through the real interaction (stand
     near, look, press E): the flashlight, the officer's card and the control room, heavy doors on backup, the Armory
     keypad on Gen-1 with the run's code, Cargo's doors by hand, its backup set and the hoist up to the top deck, its fire shutters,
     ladderway B's gate, the fuse, the dead surface lift, a note, a fall.
   - **Not yet**: travel between levels waits for the other levels (step 8); saving (step 7).
5. **Mutants and combat. Done.**
   - **The nav graph and fields** (§7) and **perception** (§8).
   - **The cast** (`sim/cast.ts`): the first engine's seven behaviours, ported nearly line for line: the husk (keeps
     rounds or a post, hunts, swings, flees when hurt, lurks, comes back), the skitter (bursts, rears and drops on
     you), the bloat (wanders its room), the thresher (roars, charges, knocks you back, staggers off a wall), worms
     (shy of your light, harmless alone, two together bite), the swimmer, and the grabber (only its head counts). Their
     stats, ranges, timings and death lines are the old ones. Each is a body like yours: it falls, rides platforms,
     works doors, and blocks you and its kind; a dead one leaves the world. All randomness is the run's seed, so the
     same run plays the same twice (tested).
   - **Combat** (`sim/combat.ts`): hold to load a swing, let go to throw it, as before (early is nothing); the damage,
     reach and stun of each weapon from its mass and kind; guns fire on the press, spend a round, and are heard far
     off; hits stun by mass, knock light things back, and turn each kind as it turned. Armour takes its share.
   - **Presentation**: the old models and their animation, the weapon in hand with its load, swing and kick, the hit
     flash on them and the hurt flash and shake on you, blood where they fall, and their sounds placed where they are.
   - **Proof** (`test/cast.test.ts`): the graph reaches every room and everything stands on it; big bodies keep out of
     doors and shut doors muffle sound; a husk does not see you crouched behind it but hears you run; one that sees
     you comes and hurts; a husk slides a dead door open to reach you; a husk calls a platform and rides it up after
     you; a swing must be loaded; a pistol spends a round, is heard and kills; the same seed plays the same.
   - **Measured** on the upper station (22 of the cast): the graph has 7,585 spots and 55,700 edges and takes about
     0.5 s to build (once per level); twenty seconds of running about with everyone awake averages 1 to 1.7 ms a step
     under the test runner, with rare spikes to 13 ms (a field refresh and a new roam route landing together, or the
     collector). Worth smoothing before the bigger levels.
   - **Not yet**: ladders for the cast (§7); memory of where you were heard (§8); body against body by mass (§6:
     bodies block each other; a blow knocks light ones back).
6. **Parity check against the first engine's upper station. Done.**
   - **How**: an audit of every player-facing behaviour of the first engine on the upper station, each checked in both
     codebases (found at parity: movement and camera numbers, noise and visibility, light and battery,
     items, weapons, the cast's stats and states, doors, interaction, HUD, sounds, content); the same six views shot in
     both (`?dev=newstation` in the first engine), at the start's power; the cost of a step timed in the same browser.
   - **Looks**: the same, view for view, once an open door was lit by its doorway (it had been lit by the rock it slid
     into, and drawn black) and slid as far up as before.
   - **Fixed**: your footsteps (a step every 1.7 m, 2.3 running, quieter walking, none crouched); hunters follow you
     into refuges again; a better weapon goes into your hand as you take it; a gun's label counts its rounds; you walk
     through the soft ones of the cast (all but the bloat and the thresher), which stop short of you; a platform is
     heard when called, rattles and thuds; the opening line; Gen-1 coming up is heard (30 m) and felt; a power change
     clunks; a prised panel is heard; ladders say where they go; a wrong code shows a moment; the papers' sound; a
     missed swing rings off what is straight ahead; the end screen counts what you put down; the death screen stays
     red; the room's name waits for you to open your eyes; blood is relit with the room; the rebreather holds 150 s of
     air; drowning is quiet; capture refused once falls back to dragging with a hint (refused later, it pauses; Esc
     pauses while dragging); Q loads a swing; a drag never swings. Dev keys as before: V fly, G god, B bright (O for
     the collider overlay); `?power=full` starts the hum.
   - **Cost**: a step was 1.3 ms against the first engine's 0.08 ms a frame, with spikes to 13 ms; now 0.45 ms, with
     the worst about 2 ms (one 6 ms outlier, the collector). Loading takes 1 s against 0.5 s; half of it is the nav
     graph, which could be stored with the level later.
   - **Different on purpose**: sound goes through the rooms, not the walls (§8); a mutant on another tier sees and
     hears you (one world, walkways are not safe ground); husks call and ride a powered platform (agreed in §7); crates
     and furniture block sight; signs dim with their own door's circuit rather than the level's; the cast block each
     other rather than jostle.
   - **Not yet**: starting again without reloading the page (a reload needs a click to start); the dev map, menu and
     level select; the wet and underwater camera (no water on the upper station).
7. **Save and load, level validation, the progression checker. Done.**
   - **Save and load** (`sim/save.ts`): a save is plain data, everything that can change and nothing that cannot (the
     world is built again from the level): the game, you, doors, platforms, crates, what lies about and what was
     searched, the cast to the last timer, what each body stands on, and the fields over the nav graph (packed; they are
     made in turn, so cannot be made again exactly). A round's route is now made from the level's shape alone, so it can
     be. Proof: a run saved, written out as text, loaded, and played on for 1,200 steps alongside the original matches
     it exactly. 180 KB on the upper station, all but 21 KB of it the fields.
   - **In the page**: a run left part way (paused, the tab hidden, the page closed) is kept, and the title offers to go
     on from it, or to start again. Going on uses the save up, so a death is still a death: there was no saving at all
     in the first engine, and this keeps its stakes while not losing a run to a closed tab. Dev pages do not save.
   - **The progression checker** (`sim/progress.ts`): plays the level as a puzzle (keys, codes known, fuses and kits,
     every circuit's state, where you stand) over the real nav graph with the real door and platform rules, searching
     every state you can bring about, from the start or from any save. It reports the rooms and things you never reach,
     the shortest list of things to do to reach each way off the level, soft-locks (what a choice loses for good), and
     dead ends (places you can drop into and not climb out of); and, since step 9, breath under water (below).
     Facts from levels not yet built can be given (Gen-1
     running, a code known). On the upper station: 105 states in 0.2 s; both ladderways reachable (B once Cargo has its
     backup set), the Armory and the hazard store shut until Gen-1, no soft-locks, no dead ends; given Gen-1 and the
     Armory code, everything is in reach and the surface pass is all the way out needs. Proved also on a small level
     built to go wrong: one kit, two burned connections, and a pit. `rs.progress()` prints it in a `?dev` page.
   - **Level validation** (`sim/validate.ts`, run by the tests and so by `npm run check`): things that do not exist,
     circuits that do not, cards nobody carries, codes written nowhere, ladders that do not say where they go, and
     anything placed out of reach of anywhere to stand. What waits on a level not yet ported (ladder A1's other end; the
     Armory code, on Aldana's hand in the sump) is marked as such, not as a mistake.
8. **The other levels**, one at a time. **Done.**
   - **Travel** (`sim/run.ts`): a run is every level you have been to, each its own sim and world, sharing one game
     (what you carry and know, the power) and one draw of chance. Only the level you are on moves; one you leave waits
     as you left it, as in the first engine. Ladders, stairs and the lift ask for a trip; the run takes you to the far
     level's mark for the way you came (a ladderway now names the two levels it joins). A level is built the first time
     you go there (the main level: 1 s, its nav graph most of it, behind the fade). A run saves and loads whole. The
     page keeps each level's drawing once made, so going back is only showing it again.
   - **The main level** (`content/levels/main.ts`), ported from `buildMain`, `buildSquare`, `flatRect`, `groundFloor`
     and `buildHorticulture`: the Commons and its galleries and flats, the Square, Horticulture and the arboretum. 165
     rooms, 2,808 props, 71 doors, 69 of the cast; built in 46 ms. Shot beside the first engine with full power, view
     for view; the dressing that the first engine scattered by chance falls differently, as it did between its loads.
   - **Settled on the way**: storeys 3.5 m apart, not 3.4, so floors fall on the grid (§14); open air over a lower room
     has no floor only where that room reaches up through it (the street under its cavern), not over a flat's roof; a
     cavern's sky is drawn (its roof in its colour, lit up, no fittings), as before.
   - **Cost**: a step on the main level, everyone awake, 0.7 ms (worst 2 ms); the upper station 0.25 ms. What made the
     difference: a body standing still on firm ground is not asked about its footing, and the moving things near a
     footprint are found by their bounds before anything else is asked of them.
   - **Checked**: validation clean (the ladders on to the plant level and the cave wait for those levels); the checker
     from the foot of ladder A1 reaches Horticulture and every way on, with Gen-1 everything; 10 states, 85 ms. The
     checker now takes what only ever adds (keys, codes, things carried) all at once and trims each route to what its
     goal needs, which took it from thousands of states to tens.
   - **The plant level** (`content/levels/plant.ts`), ported from `buildPlant`: Engineering on the spine, Distribution
     with each floor's service connection, the backup plant, the link, and the generator hall with Gen-1's fuse socket
     and breaker. 32 rooms, 17 of the cast; built in 15 ms. Shot beside the first engine, view for view. Ladder A2
     stays collapsed; B2 down the exhaust shaft is the way in.
   - **Checked**: validation clean but for ladder A3, which waits for the sump. From the foot of B2 the checker reaches
     every room and thing, and Gen-1 running (a goal of its own when it was off at the start) in three steps: take the
     main fuse, seat it, start Gen-1. 8 states, 54 ms. Switching power on is now taken at once like a key, and off is
     never tried: power only opens ways now that locks fail secure, and a switch can be thrown back. Before that, the
     plant level's connections and backup sets made 2,434 states and 1.2 s.
   - **The sump and the drowned sump** (`content/levels/sump.ts`), ported from `buildSump` and `buildSumpDeep`: the
     hall at wading depth, the pump station, its control office (the dive lantern, the last log), the filters; under
     them the intake gallery, the flooded link, and Sergeant Aldana with the Armory code on her hand.
   - **Water on a level** is real now: a deck's `wet` is wading water over every room and doorway, `deep` floods every
     room over its roof. Where the water fills a room to the roof there is no surface to float up to, so you hang
     where you are and swim up or down as you choose; the first engine held you at the floor. Your breath runs from
     the moment you go in. **Dives** (the intake grates, the flooded link, the pool) are uses that travel, as ladders
     do: each comes out at the far level's mark `dive:` + the level you left. The first dive under says "One lungful.
     Count it."
   - **Fixed on the way**: wading water tints the view and closes it in, and goggles thin the fog under water, as
     before; the water is the first engine's colour; swimmers ride just under the surface of shallow water.
   - **The cave** (`content/levels/cave.ts`), ported from `buildCave`: the entry passage from the breach, the upper
     chamber and the spring branch climbing to the crack, the descent through breakdown, the great chamber and the
     green's arboretum, the lower passage, and the lower chamber with its pool, which is the flooded link. 7 rooms,
     568 props, 11 of the cast; built in 42 ms and compiled in 40; the nav graph (4,929 spots) 0.6 s; 1,819 chunks
     (15 MB). The pool is real water you can wade and swim in; the first engine drew a dark disc and kept you out of
     it with a hidden kerb.
   - **Caves of any outline** (§14): built as the first engine wrote them (`caveShape`, `tunnel`, `chamber`, in
     `tiles.ts` then, `plan.ts` now). Each is one room carved tile by tile, from just under its floor to just over its roof there
     (`RoomDef.cells`); a deck's caves share one floor and one roof, masked to their tiles (`SurfaceDef.mask`), so
     where a passage opens into a chamber there is no seam: the roof rises across the mouth instead of stepping. A
     cave's roof now rides on its floor, as in the first engine (over the arboretum's hills it had stayed level).
   - **Settled on the way**: the cave's passages are steeper than the nav graph allowed (the lower passage falls 12 m
     in 15, and where a tunnel leaves a chamber the first tile can be steeper than 45°). A body always climbed them;
     the graph now does too (§7). Before, the checker found the descent and the lower passage one-way drops and the
     lower chamber out of reach. Proof: a test walks you by the graph from the pool up to the breach, 58 m higher.
   - **Shot** beside the first engine, view for view: the sump at full power, the drowned sump and the cave with the
     dev light on, and the arboretum under its new roof.
   - **Checked**: each level validates clean, and so does the whole station: nothing waits any more (ladders A3 and
     CV, the Armory code). The checker: from the foot of A3, the ladder and the dive (the lift with Gen-1); in the
     drowned sump, both dives; from the breach, every chamber and passage and both ways out, no dead ends.
   - **Cost**: a step with everyone awake, 0.12 ms in the sump, 0.07 drowned, 0.15 in the cave (worst 4.5 ms).
   - **Logs are logs**: the last one in pump control sends you down "shaft B in the filter room", which the sump does
     not have. What a paper says is what its writer believed, not a map.
9. **Swap. Done.** v2 is the game.
   - **Where things are**: the game's sources are at the repository root (`index.html`, `src/`, `test/`); the first
     engine is archived, as it was, at `archive/first-engine.html`. Pages publishes the game at the site's root and the
     archive beside it (`.github/workflows/pages.yml`); `check.yml` runs types, tests and a build on every pull request
     but those that touch only the docs. The title links to the test bed, the station with the lights on, and the first
     engine. A run in progress keeps its save across the move.
   - **Breath in the checker**: where water fills a room to its roof, a place counts as in reach only if you can get
     there and on to air (or a dive up into it) on the breath you have now, swimming at 2.4 m/s; with a rebreather on
     you hold 150 s, without it 35. A rebreather counts while you wear it, and once taken (it goes on as you take it).
     Each thing is judged on its own; one breath is not planned around several. Through a dive down into such water, the
     report says what the far side holds on the breath you would take down. On the drowned sump one breath reaches
     everything, so the rebreather changes nothing there yet; on 12 s, the flooded link to the cave is out of reach.
     Proved also on a small level: 100 m of flooded tunnel, out of reach on one breath, in reach with the rebreather on,
     and out again when it comes off.
   - **Worn things come off**: click one under Worn in the inventory and it goes into a free hand; use it there to put it
     on again. A rebreather taken off under water leaves you one lungful.
   - **The tracker** (`?dev`, P): the checker's report from where you stand, at the top left, run again when what it
     depends on changes (what you hold, wear and know, the power, the room you are in) and every half second under
     water, so your reach shrinks as your breath does. A text version of the "reachable now" overlay `world.md` §5
     asks of the dev map, which is not built yet. It costs what the checker costs: 0.2 s on the upper station when you
     change room with it open.

---

## 14. Open questions

1. **Grid cell size**: 0.25 m, kept. The upper station costs 16 MB of grid; a chunk that is all one room could be
   stored as a single value if a bigger level needs it.

### Settled

- **Caves with irregular outlines** (step 8): stamped tile by tile, with the floor and roof surfaces masked to them;
  one floor and one roof for all of a deck's caves (§13, the cave).

- **Locks without power** (step 8): fail-secure, as `world.md` §4 has it. A card reader or keypad stays locked with
  its circuit dead, and needs power to read; once a card or code has opened a door, it stays unlocked. The first
  engine's rule (a dead lock is no lock) let a backup set switched off open a card door; the checker found it.

- **Storey heights** (step 8): 3.5 m, on the grid. The main level's storeys were 3.4 m; the 10 cm is not to be seen.

- **Mutants on stairs, ladders and elevators**: yes (§7).
- **Physical objects**: yes, unless they cost the frame rate (§6).
- **Publishing (agreed)**: GitHub Pages, from a workflow (`.github/workflows/pages.yml`). Every push to `main` publishes
  the game at the site root and the first engine at `archive/first-engine.html` (until step 9: the first engine at the
  root and v2 at `/v2/`). This needs the repository's Pages source set to **GitHub Actions** (Settings → Pages → Build
  and deployment → Source).
- **`station-plan.md`**: dropped. It was an earlier idea; the station now lives in the level builders, which are the
  reference for its layout and coordinates.

---

## 15. Materials

What things are made of, as one table (`content/materials.ts`) that the look, the sound and the sim all read, so
"steel" means the same to each. Plain data: the rule that `sim/` and `world/` never touch three.js holds.

- **Rule (proposed): a property goes in only when something reads it.** The table grows with what uses it, never
  ahead of it. Anything that matters in play must also read at a glance under a flashlight.
- **A thing is a body, a construction and a finish (proposed).** A crate is wood, hollow, stencilled; a light door
  sheet steel over a hollow core, a heavy door solid steel. Only the body is built so far.

**Step 1 (built): the table, and what stands on it.** Seven materials: concrete, paving, grating, steel, rock, wood,
glass. Each says only its tread, the voice a foot comes down with (`present/audio.ts`). A room says what its floor, walls
and ceiling are (`RoomDef.mat`); the authoring kit gives the usual ones (`tiles.room`: rock for a cave, grating for a
walkway, paving under a sky, concrete for the rest), and a room can say otherwise (`mat:`). Sloped surfaces, doors
and platforms say theirs; props may (a loose one is wood unless it says; containers and forklifts are steel). The
world answers what is underfoot (`World.floorMat`): what you stand on if it moves, else the top of a thing that says
what it is, else a sloped floor at your feet, else your room's floor. The footsteps ask it (`floorAt`), and sound as
they did, but for three things the old guesses had wrong: a step onto something in a cave rang like grating, a
container's roof and a forklift sounded like concrete, and the cast's feet on a crate or a platform were heard as
the floor under it.

**Step 2 (built): the look.** Four more materials, for walls and ceilings: painted block, painted plaster, a
suspended ceiling's tiles, glazed tile. Each material says how it takes the light (`look`): a pattern, how bright and
how tight the flashlight's highlight on it is, how much the highlight takes its own colour (metal does, paint does
not), how rough it is, and whether it shows wear. The palettes say what rooms are made of: cells, utility rooms and
bays bare concrete; Security painted block; offices painted block under a suspended ceiling; homes plaster; medical
rooms and Horticulture glazed tile; a doorway its steel frame. Blocks say what they are (a walkway's slab is grating).

The level's mesh carries each vertex's material and its room's floor and ceiling heights; the shader draws the
pattern from where the pixel is in the world (a moving thing's in its own frame, so a pushed crate's boards go with
it), from one 256 x 256 texture of noise made at startup: formwork seams and tie holes on poured concrete, block
coursed up from the floor, ceiling tiles on their T-bar grid, glazed tiles each laid a little out of true, paving
flags, riveted plate, a grating's bars with the dark between, rock in strata. Each pattern gives a shade, a height
and a gloss; the height tips the surface's facing (bump mapping from screen derivatives), and lines are filtered
over the pixel and fade to their average once finer than one; noise and specks fade to theirs by their own size
against the pixel's (since: step 4, *And floors and walls shimmered*). Fine detail fades out between 9 and 26 m. The
flashlight's facing and highlight are reckoned from your hand, a little below and left of the eye (since, the beam
itself too: §11), so it rakes across the relief of what is close and raises a highlight; the level's
light favours a bump that faces up. Walls show wear: grime at
their foot, in places brown streaks run down from the ceiling, blotches overhead; none on raw rock. Rooms under a
bare concrete ceiling, 3 to 6 m high and at least 6 m long, get services along one long wall: a cable tray and two
pipes on hangers, a quarter metre down. A suspended or plastered ceiling hides them.

All of the look (and, since step 3, the sound) is surface detail, which the player can turn off (a checkbox in
Settings, kept between runs; `?detail=off` for one visit; M under `?dev`). Off, the
shader skips the patterns, wear, bump and highlight, reckons the beam's facing from the eye, and the services (their own
mesh) are hidden: the station as it looked before.

**Step 3 (built): the sound.** Each material says how it sounds struck (`ring`): a few modes over a base pitch, each
with its loudness and how fast it dies; the click of the contact; grit that skitters off it; and how things of it are
usually built (solid, hollow, a sheet over a frame, an open grate). One voice, `impact` in `present/audio.ts`, plays
any strike from that and from what strikes it: how hard (a fist, rubber, steel) and how big (claws high, a heavy foot
low). A hard strike brings out a ringing thing's bright partials, a soft one only its tone; a hollow thing booms, a
grate rattles, rock and paving grit. Footsteps (yours and the cast's), claws, a crate landing (it and the floor) and
being dragged, and a blow that meets a wall (`blow`, at the point it lands; `World.solidMat` says what is there) all
go through it. Rendered offline and measured, the footsteps sit as loud as the old voices did; a steel or glass wall
rings loudest, concrete and tile are dull. Puddles keep their own voice.

Surface detail off brings back the old sound with the old look: the soundscape stops saying what things are made of
(`Soundscape.materials`), the floor is guessed from the room as before (`legacyFloor`), and every sound plays its old
voice.

**Step 4 (built): the station as built.** world.md §1, *The station as built*: mined at 400 m, the family's fabric
from the 80s under a refit. Seven more materials: shotcrete (`shot`), plasterboard (`board`, which looks as plaster
does and knocks hollow), a coated slab (`epoxy`), sheet vinyl, carpet, terrazzo, limestone (`stone`). Their
patterns: shotcrete lumpy at the rock's scale under the spray's grain, rock bolts every 1.5 m in staggered rows, their
plates sprayed over (a raised square, the nut showing through), and under one in four on a wall a faint stain of rust
(drawn plain and dark, with rust under every other one, they read as sockets leaking); a coated slab with scuffs that take its shine (its saw
cuts on 4 m bays, since taken out, drew squares that met in crosses down every corridor); vinyl flecked, its welded seams a roll's width (2 m) apart; carpet laid wall to wall (it was tiles, 500 mm, each a
quarter turn from the next, the pile running across one and along the next: squares again, and taken out); terrazzo's chips dark, pale and a few rust-red, an inch across so
they read further off (each fades to its average by its size against the pixel's, finer specks sooner), poured in one
(its brass strips on 1.5 m bays, since taken out, were another lattice of squares). Its chips, and vinyl's flecks, were
noise cut off at a level, which comes out in crosses, Ts and Ls along the noise's own grid; they are chips now
(`chip()`): one round a point jittered in each cell of a lattice, of a size, angle and stretch of its own; limestone panels 1.2 by 0.6 m, coursed half a panel along, tight joints, bedding and pits. A pattern can now
tint as well as shade (`surface`'s `tint`: rust, a chip, a strip). The wear's water run down a wall says what it left
(`Look.salt`): on bare cement (poured or sprayed) white salts, on paint and tile the brown tide mark as before.

The palettes (`content/build/furnish.ts`) say what rooms are made of: `UTIL` is dug (`DUG`: shotcrete walls and crown on
a poured floor), and so are the bays, Cargo's warehouse and its chambers, and the sump; Security's floors are coated (since, flaked, and its
corridor polished concrete: below); offices, the briefing room, the operations room and Cargo's control room and office
are `OFF` (board, carpet, a suspended ceiling); `OPS` halls are terrazzo; medical floors vinyl; homes carpeted; the
lobby, its gallery and the surface landing `FAM` (limestone, terrazzo, a plastered ceiling, a bronze band for the
stripe). The Commons' utility rooms stand in its blocks,
so are poured, not dug; its kitchen, canteen, laundry and gym are vinyl. Services hang under a sprayed crown as under a
poured one. The 2 m checker the first engine drew on floors, walls and the painted sky is gone (it read as a
checkerboard), and so is the shade a cave's floor and roof took by each square of their lattice (Cargo's floor is
one); each material draws its own joints, and a wall's or floor's faces merge whole. The start room is vinyl underfoot, so the first step sounds of it.

Then, from play: the lobby's limestone, laid half a panel along as masonry is, read as brick, and the block's dark
joints read as brickwork too. The stone is hung as cladding now (1.5 by 0.75 m, stacked joint over joint, hairline
joints) to 4 m, plaster over it (`RoomMats.upper` above `datum`); the paint fills the block's joints, so its coursing shows
faintly; the wing's two corridors are skim-coated (plaster over the block). The painted dado and stripe are drawn on
painted block only, and nowhere else.

And floors and walls shimmered as you moved, in streaks across the way a surface seen at a slant is stretched (a floor's
across the screen, a wall's up it). The patterns' noise and specks faded by distance (9 to 26 m) or past one pixel width
for all of them (`fine`), not by their own size against the pixel's, so near by, at a slant, one pixel spanned several of
the vinyl's flecks or the block's stipple and caught a different one each frame. Each now fades to its average where a
pixel is too wide for it (`keep` and `n3f` in `shader.ts`: all of it while it is four pixels across, half at two, none
under one and a third, the pixel measured the way it is widest), blotches as well as specks, and the wear's streaks; a
speck's average is its share of the surface, measured from the noise. Measured at 1920 by 1080 on the vinyl of the
isolation room and the Retreat passage, how much a floor changes from one frame to the next as you move fell five to
twelve times over, near what a plain surface shows. The vinyl's flecks (2 to 3 mm) and carpet's pile are finer than such
a screen's pixel past your feet, so they read as their average tone there; drawn coarser, they would show further off.

And on one card (an NVIDIA RTX 4060, through ANGLE's Direct3D 11) floors and walls lit in streaks: short bright lines
along the screen's rows, in patches with a triangle's straight edges, crawling as you looked about, worst on the lobby's
pale terrazzo. A lit fitting takes its room's light many times over, and the shader told one from the rest pixel by
pixel, by its take being over 1; most faces take exactly 1, and a 1 handed across a face can come out a hair over it,
so there a pixel of floor was drawn as bright as a tube. It is told apart on the vertex now, from the take as the mesh
has it (`EMIT.cut` in `shader.ts`, 1.25: between the rest's 1 and under and the painted sky's 1.5), and the pixel only
multiplies by what it is handed. In the browser, every take of 1 put one float over 1 drew the same streaks before and
nothing after. `?dbg=` (README) narrowed it to the light: the streaks showed in no view of what the picture is made of.

**Step 5 (built): doors.** Every door was a 2 m steel slab rising into a steel-lined tunnel. Now the kit says what
each is (`lookOf` in `content/build/plan.ts`, from the rooms either side; `DoorDef.look`): a shutter between two dug
places or a dug place and a plain one, and anything jammed; else heavy if it is heavy; else by the grander side, the
family's pair (`grand`) off limestone, a clinic's pair off glazed tile, an office door off board or carpet, painted
steel otherwise, or where a door says it is `plain` (a service door off a grand hall: the plant stair's, off the upper
corridor). A single door is 1.2 m, so its middle wants to be where the nav graph's spots are (a metre apart, on the
half: `NAV`), or nothing has anywhere in it to stand (`test/doors.test.ts`). All but shutters, jammed doors, welded ones, the lift's and loose panels slide sideways (`slides`) into
the end of the doorway that is rock (`side`; a door with no rock at either end rises). `doorBox` moves a sliding door
along its length by its width; a pair of leaves both slide into the wall at the pocket, the far leaf all the way and the
near one half (`Leaf.f` in `render/things.ts`), so they block exactly what one slab would and the sim is unchanged. The
doorway is lined with the grander room's finish (block lined as plaster), never painted with a dado; a shutter's is
the old bare steel. An architrave frames both faces (`FRAME`: bronze 16 cm for the family's, painted steel otherwise),
a shutter runs in guides instead. Readers, keypads, a heavy door's lamp and the lockdown lamp are on the wall beside
the door at its pocket side, so they stay when it slides. `test/doors.test.ts`: the looks land where meant, and on every
level each sliding door's slab, open, is in rock.

**Step 6 (built): partitions and glass.** Levels are laid out on 2 m tiles, so every wall was a tile of rock, 2 m
thick: right where rooms were dug apart, wrong where a cavern was divided. `partition(D, x, y, w, h)` marks a run of
wall tiles as built: each room either side reaches 0.75 m into the tile, leaving a wall 0.5 m thick (`THIN`; block and
its finish, on the world's quarter-metre grid either side of the tile's middle), faced on each side with that room's
own finish. A door in it has a doorway the wall's thickness (`DoorDef.depth`), its frame, sign, reader and lamps on the
wall's faces; a window in it (a glass door, as before) is a pane between a sill and a head (`glaze`: `full` to the floor,
`view` from 0.9 to 2.2 m, the default, or `high`, a clerestory from 2.2 to 2.8), framed to its size. The strips are
`RoomDef.part`: too narrow for the nav graph to stand a spot in, one place with their room. Built: the infirmary's wall
on the Security corridor (windows either side of its doors), the briefing room's vestibule and the duty office on
their halls, and on the main level the tissue lab's glass wall onto the north grow gallery and a window from the
director of research's office. Three new windows on the upper station renumber the doors after them, which the
progression tests name; what they say is unchanged. (In metres now, §4: a partition is two rooms drawn half a metre
apart, and the strips are `RoomOpts.part`, drawn only where a room reaches a partition past the rest of its side.)

**Step 7 (built): single doors are single doors.** A steel or office door's opening is 1.2 m (`NARROW`), set against
the end of its 2 m tile where its pocket is, the rest of the tile wall: there the nav graph's spot in that half of the
tile (0.5 m from the end, radius 0.3) stands clear, where a centred opening would leave the door no spot at all. Pairs,
heavy doors, shutters and windows keep the whole 2 m. Its leaf, frame, sign, reader and lamps are drawn to its width
(`doorLook` undoes the door frame's scaling for what is fixed). The thresher and the bloat use no doors (`noDoors`, as
before); everything that does fits, a skitter, the widest, with 10 cm either side (`test/doors.test.ts`, which also
checks that every door on every level still has a spot in it). The progression checker's answers are unchanged.
(In metres now, §4: a door is placed at its opening's middle, and `span` gives a single door the stretch of wall it
hangs in, against the end with wall beyond to slide into.)

**Step 8 (built): the rest of the glass.** Vision panels are holes in a door's leaf with glass in them, moving with it
(`holed`, `Leaf.glass`, a see-through `dynamicMaterial`). Any prop made of glass is drawn see-through on its own
(`glazing` in `render/things.ts`) and lets light through the light field; the court's balustrades, the checkpoint booth
and the treatment bay were opaque boxes before. A walkway floored with terrazzo (the family's) gets glass balustrades in
a bronze shoe with a bronze handrail, and its slab is the floor it says, not grating. A partition can face a tall room
on a deck below (a hall a control room looks down into, or a cave), and a run of windows down a wall is laid as a wall.
Built: Gen-1 control on the plant level, a storey up at the generator hall's west end, a stair to it beside the link
and four panes of full-height glass onto the hall (`test/doors.test.ts` sees the hall through them); the arboretum's
balcony on the main level, up a stair off the cross passage and along a passage in the rock to an archway; a clerestory
along the top of the locker room's wall on the Security corridor. The progression tests find door numbers by the sign
over the door, so windows added before a door no longer break them.

**Then, from play.** Painted block, even with its joints faint, read as brick wherever it was (Security, Operations,
the atrium, the checkpoint); it is drawn now as block filled and painted smooth, a roller's stipple and a control joint
every 6 m, no coursing. The Commons' paving, small flags half a flag along, read as a brick pavement; it is large square
flags, joint to joint, quiet in tone. A partition's room reaches 0.75 m into the wall tile, which left what was fixed to
the old face in the air (the wing's cut SEC connection, a call point, the infirmary's shelf): what stands within 0.6 m of
the old face moves with it (`followFace` in `content/build/tiles.ts`; in metres now, each simply stands there). The loose crates are gone from the station (the
testbed keeps its own for the tests that push them); a shelf's contents are laid in slots along each board, one a slot.

**Then, where things are.** What you pick up and the papers were put down 2 cm over whatever they lay on (the first
engine's habit), so on every desk, shelf and floor they hung in the air. They come to rest now on what is under them as
the level is built (`settle` in `content/build/builder.ts`): the floor, a step, or the top of anything square-topped, up
to 3 cm over or 10 cm under where they were put (further is a mistake, left for the test); on a shelf, a desk or a
table, square to it with a turn of their own (`ItemDef.yaw`) and 5 cm in from its edges, and a shelf's dressing
(`goods`) makes room for them. How each lies is data (`content/lying.ts`), so the builder and the tests know its size.
A note with no paper of its own (`NoteDef.bare`) is read off what it is written on: the nurses' whiteboard, which was a
sheet in the air in front of the board. Fittings hang from the ceiling as the grid carves it (`lid`: a 3.2 m room's is
at 3.25, where they hung 6 cm short; a 3.6 m room's at 3.5, where they were inside it). A lump is drawn 0.85 of its size
(`ICO`) and sat that much over its base; it sits on it now. A door's frame stops at a side wall instead of running into
it, and a window over a tall room on a deck below lies across its opening (the operations room's eight panes stood edge
on to the court). Flat things on rough ground (moss, the cave's stream) are tipped to the slope and laid so no edge is in
the air (`POpts.lie`). By hand, on every level: the treatment bay's shelf (10 cm into its wall), chair backs 17 cm behind
their seats, screens off their monitors and monitors off their desks, boards, signs and panels off their walls, the
patient's handprints 20 cm off the glass, the drip pole past the bed's head (in the wall), forklift wheels lying flat,
call points half in the wall, and the rest. The infirmary shelf the pass above meant to move never did (it stands
0.6 m and a hair off the old face); it was right where it was. `test/placement.ts` measures every pickup, paper, fitting
and pane against the world, `test/placement.test.ts` holds every level to it (growth and stains may meet rock, and in a
cave anything may), and the placement probe lists everything it finds.

Rails, too. A walkway's edge was railed wherever anything at all lay below the tile beyond it, so a gallery over a
doorway or a flat on the floor below had a rail standing against the wall there: 51 of them, along the Commons' and the
Square's fronts over every door below, at the end of the lobby's gallery, the atrium's, and the nurses' station's. An
edge is railed now only where a room on some deck below rises past the walkway's floor (`drop`, in `finishLevel`): looked
for through every deck down, so the third floor's gallery ends, its bridge and Cargo's decks, which look down past the
walkway under them, keep theirs. The test finds a rail with wall hard against it.

And what is drawn on a board. The nurses' station's whiteboard had its lines started 0.15 m in from its edge, so four of
the five ran off it into the air, most by more than half; the briefing room's plans had their outer sheets 0.25 m past the paper they were
pinned to. The test takes anything flat (a centimetre or two through) laid on the face of another, and finds the part of
it past that face's edge (`off its edge`). And a shelf stood out from a wall is set with its middle on a column of the
light's lattice: its inside, shut in by its boards, is dark, and its ends otherwise fall short of the half way to the
lattice's next point, so the wall beside it read that dark too, a slab standing out past each end.

A walkway's grating was a square grid of thin bright lines over black, the same from every side: it read as graph
paper. It is bar grating now (`mesh`), galvanised: bearing bars 5 mm thick on 30 mm centres along z and 30 mm deep, so
looked at across them their sides close the gaps (each bar drawn as wide as its top and the side of it you can see, from
the angle you look at it) and it reads as a grey floor, and looked along them you see down the slots; cross rods every
100 mm, which close the slots at a slant; panels a metre wide with a banding bar at each edge, each a shade apart. The
gaps are the dim of what is under the walkway, not black. Duller than it was (gloss 0.25).

And the coated floor looked like a texture stretched across it: its scuffs were noise drawn six times finer across z
than along x, so down every corridor that ran along x (the Security corridor, between the lobby and the atrium, the
worst) they smeared into long blurred streaks. A scuff is a mark now (`scuffs()` in `shader.ts`): in four cells in ten
of a lattice 2.5 a metre, a short stroke 6 to 20 cm long and a few millimetres wide, each its own way, bowed a little and
thinning to its ends, filtered over the pixel as a joint is; thicker where the coat is dulled. And Security has floors of
its own, two new materials beside it: a flaked coating (`flake`: the coat with vinyl flakes broadcast into it under a
clear coat, charcoal, pale grey and a few buff, 5 to 20 mm across in two sizes, as `chip()` draws terrazzo's, with a
grain that carries on a few metres past them so they do not stop at a line), the wing's rooms (`SEC`); and polished
concrete (`polished`: the slab ground to its gravel, rounded and near its own colour, in a salt and pepper of sand, its
tone clouded from the trowel and the densifier, which is what still reads at the far end of a corridor, and a hairline
crack here and there), the corridor itself. Seen against the old floor in the built game at 960 by 540. A third,
studded rubber, was the locker room's at first; it did not match the rest of the wing (the owner's call), and went: the
locker room is flaked as the other rooms are.

Not done: decay (world.md, proposed); a bronze or brushed metal of its own (steel's pattern is riveted plate); glossy
floors catching the tubes, which terrazzo and the coated floors now most want.

**Next (proposed), in order:**

1. **The look, further.** Glossy floors catching the ceiling's tubes; paint chipped to what is under it; the money
   decaying once the dehumidifiers stop; the tribes as finishes over a surface.
2. **The sound, further.** What a thing is built as, per thing rather than per material (a steel locker is hollow,
   a steel plate solid); weapons and items with materials of their own, so the striker is data and not a guess from
   the weapon; the thresher's charge into a wall; doors and the vent panel.
3. **The sim.** First, how loud a floor is underfoot feeds the noise you make (grating loud, rubber quiet), since the
   cast already hunt by sound. Then materials against blunt, edge and prying force and weapon wear, which gives
   world.md's brute force (§4) its content. Later: current (steel and water conduct), buoyancy, and the two tribes as
   finishes that spread over surfaces and change what they do.
