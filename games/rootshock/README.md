# Rootshock

A first-person game set in Lowfield Station, a facility deep under a field. [`docs/world.md`](docs/world.md) says what
the game is; [`docs/engine.md`](docs/engine.md) says how it is built.

The first engine, a single page the game began as, is kept as it was in
[`archive/first-engine.html`](archive/first-engine.html): open it to compare, or add `?dev=newstation` to see the
station the game now plays.

## Running it

You need [Node.js](https://nodejs.org) 22 or later. From the repository root:

```
npm install        # once, and whenever package.json changes
npm run dev        # serves the game at http://localhost:5173 and reloads on every save
```

On a phone or a tablet it plays by touch, on its side (a stick under the left thumb, look with the right; engine.md §11,
*Touch*). `?fps` shows the frame rate and how much of the screen's resolution is being drawn (it steps down when the
GPU cannot keep up, and back up when it can).

Open `http://localhost:5173/?dev` for the position readout and `window.rs.sim` in the browser console. The readout also says
where each frame goes, in ms as the mean and worst of the last half second: the sim's steps, the cast put where the sim
has them, the rest of the page, and handing the frame to the GPU; with the draw calls and triangles that made, and how
many loose bodies are awake, and the share of the screen drawn. The GPU's own time is not counted: a low fps with little of the frame spent here is the GPU. Dev keys: V fly,
G god, B bright, O draws every collider (and each body's poise, velocity and state, and your swing's path), P the
tracker (what the progression checker says you can reach from where you stand).

For working on the fight, `?dev&level=testbed` and go north through the gate to the arena (weapons on the table). Keys
1 to 8 put one of the cast down in front of you, awake (husk, skitter, thresher, worm, big skitter, one of the changed, one of the
bone line's middle years, the bush's line old), 0 kills
them where they stand (and, with none left alive, clears the dead away); T slows time (×0.25, ×0.1, back); Y changes the weapon in your hand (A, D or W held as you click sends its swing from the left, the right or overhead); H puts you right; U holds the cast still or
lets them go. The readout shows how you stand and the last few blows in numbers: damage, the closing multiplier, the
shove, and what came of it. `?level=<id>` starts on another level (`upper`, `main`, `plant`, `sump`, `sumpdeep`, `cave`, or `testbed`);
`?power=full` starts with everything on. `?dev&level=bench` is a bench for the growth Security is overgrown with
(`src/content/build/overgrowth.ts`): each piece laid out with a look that names it, and an office colonised from a
corner, its front coming out along the corridor.

For a fault in the picture that one card draws and another does not, `?dbg=` leaves stages of it out, comma-separated
(`src/present/debug.ts`): `flat` (the level's light a plain grey, its light field not read), `nodir` (its light taken as
coming from every way), `noself` (no shadow of your body from the fittings), `nobeams` (no light from beams lying about,
the night round's torch among them), `noprepass` (the level's depth not drawn before it is lit), `noglow`, `nograin`,
`nomsaa` (edges not smoothed). `?detail=off` leaves out what surfaces are made of. Whichever makes the fault go is the
stage that draws it. In place of the picture it can show one thing it is made from: `unlit` (each surface its colour,
no light), `shownormal` (which way each pixel takes its surface to face), `showlight` (the level's light alone),
`showsurf` (each surface a colour of its own, so two lying in one plane show as two colours fighting).

| command | what it does |
|---|---|
| `npm run dev` | play it while you work on it |
| `npm run check` | type-check and run the tests (level validation and the progression checker among them); run this before pushing |
| `npm test` | the tests only |
| `npm run build` | build the publishable game into `dist/` |
| `npm run preview` | serve what `build` produced |

Every push to `main` publishes the game with GitHub Pages (`.github/workflows/pages.yml`), with the first engine at
`archive/first-engine.html`. Every pull request gets a playable preview at `pr-preview/pr-<number>/` on the same site,
linked from a comment on it and removed when it closes (`.github/workflows/preview.yml`). Both are pushed to the
`gh-pages` branch, which Pages serves (Settings → Pages → Deploy from a branch: `gh-pages`, `/ (root)`).

## Where things are

```
src/core      maths, seeded random numbers, the fixed-step loop
src/content   levels as data, and the kit for writing them (build/)
src/world     the level compiled into one spatial model; every spatial question goes here
src/sim       the game itself: bodies, the player, the cast, one step at a time. No three.js, no page.
src/present   drawing, the camera, keys and mouse, the HUD
test          tests; they run the sim with no browser
docs          the design (world.md) and the engine (engine.md)
archive       the first engine
```

The rule that keeps it malleable: `sim/` and `world/` never import three.js or touch the page.
