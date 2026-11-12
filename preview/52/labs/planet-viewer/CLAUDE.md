# CLAUDE.md — Planet-Viewer

Read this first. If the repo has an audit or design doc (a Fable audit was written 26 Sep 2026), read it before changing the code it covers.

## What this is

A procedural planet generator in the browser: plate tectonics and elevation, then atmosphere, currents and hydrology (all on a
typed-array `PlanetGrid`, `state.cells`), then a
512×512 regional window (≈78 km per planetary cell, typed arrays in `regional-grid.js`) with drainage, substrate and flora, then tiles. Plain ES modules, no
framework, no dependencies, no build step. `index.html` loads `main.js` as a module; `state.js` holds the shared `state`
that every other file imports (no imports of its own, no DOM), `dom.js` is the only DOM touch the simulation modules make.
Units: the planetary and hi-res grids are in *planet units* (1.0 = 10 km, tuned, leave alone); the regional and tile grids are
in **metres**, converted once in regional-gen.js Pass 1a — `units.js` is the one place that says so. A tile chunk is 128×128
tiles of ≈1.19 m covering one regional cell. The world is an archipelago on purpose (3–11 % land); **seed 5 is the anchor**.

| file | owns |
|---|---|
| core-math.js | noise, RNG (`mulberry32`), coordinates, colour helpers; the planetary grid `W`×`H` (512×256) |
| state.js | the shared `state` object (and `state.seed`, the seed of the planet on screen) |
| dom.js | `byId` / `setStatus`, no-ops without a document |
| main.js | entry point, orchestration, binds the renderers' canvases |
| planet-grid.js | the planetary grid as typed arrays (`PlanetGrid`, Float64 fields, enums for plate/boundary/flora/terrain, `cell(i)`) |
| planet-gen.js | the planetary pipeline (steps 1–5b) |
| planet-geology.js | plates, geo seeds, elevation, minerals |
| planet-atmosphere.js | wind, currents, SST, precipitation, hydrology |
| planet-render.js | planetary rendering: flat, globe, Mollweide |
| terrain-derive.js | the terrain derivation function and the terrain/cover enums |
| palette-compute.js | the three-layer colour pipeline |
| units.js | elevation units: `ELEV_UNIT_M`, `puToM`, the shelf / coastal / deep-water thresholds in metres |
| regional-constants.js | the regional window's shared constants, tiles per regional cell, tile size |
| regional-grid.js | the regional window as typed arrays (struct-of-arrays, row-major), enum tables, `cell(rx, ry)` |
| regional-gen.js | regional detail generation |
| regional-drainage.js | `routeFlow`: padded priority-flood + D8 used by the regional window and tile chunks; stream order against the planet max |
| regional-substrate.js | grain size, saturation, water table depth |
| regional-flora.js | flora type, ground cover, canopy |
| regional-render.js | regional and tile rendering |
| hires-gen.js | high-resolution surface generation |
| tile-gen.js | tile/chunk generation (phase B) |
| ui.js | events, keys, view switching, tuning, snapshot |

## Run and look

Planet-Viewer lives in the Game-Template-and-Library repository at `labs/planet-viewer` since 7 Nov 2026 (its history came
with it): a lab, not yet a game, so the repository's only rule for it is that it builds. From the repository's root:

```
npm run dev -w labs/planet-viewer     serve the folder at http://localhost:5173 (modules don't load from file://)
npm test -w labs/planet-viewer        tools/smoke.mjs: planet → hi-res ×2 → region → tile under Node with invariant checks (≈25 s, no browser)
```

`tools/probe.mjs` drives the real page in headless Chromium and prints the measurements `DIAGNOSTIC.md` cites. Beyond
that the check is looking at it: `npm run build -w labs/planet-viewer && npm run look -- labs/planet-viewer` boots the build
and screenshots it; the person's own check is the pull request's preview, `…/preview/<number>/labs/planet-viewer/`.

The site's index pictures the lab as the globe (8 Nov 2026, the person: "the 3d planet rather than the static square"),
not the flat map. `?card` (main.js `showCard`) is that picture: it generates the default seed by itself and shows the
globe alone, filling the window, still, without the HUD, turned (`landFacingRotY`) to face the most land, then marks
`<body data-card="ready">`, which the `card` in `package.json` waits for. `npm run look -- labs/planet-viewer --query "?card"
--wait 15000` shows it.

## Delivering a change

The root `CLAUDE.md` is the rulebook: a fresh `claude/…` branch per change, a pull request into `main`, never a push to
`main`, commits as `WB <willbuzbee@gmail.com>` with a `Co-Authored-By:` line for Claude.

1. One change or one pass per pull request.
2. Say in the pull request what changed, why, what was looked at, and what the person should check on the preview.
3. Live at `https://william-are-buzbee.github.io/Game-Template-and-Library/labs/planet-viewer/`. The old site,
   `https://william-are-buzbee.github.io/Planet-Viewer/`, and its kept copies per merge stay as the old repository left them.

## The person

- Concise replies, dry wit, no praise, no constant agreement. Disagree when reasonable. Be plain about what can and cannot be
  checked from a session.
- Likes questions and is open to ideas. When a design choice is theirs, ask, don't guess.
