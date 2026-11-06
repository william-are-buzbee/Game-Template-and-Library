# CLAUDE.md — Rootshock

Read this first. Then `README.md` (running it, the commands, the dev keys, where things are), `docs/world.md` (what the
game is), `docs/engine.md` (how it is built) and `docs/handoff.md` (where the last session left off, newest at the top).

## What this is

A first-person game set in Lowfield Station, a facility deep under a field. TypeScript, three.js, Vite, Vitest. The rule
that keeps it malleable: `src/sim/` and `src/world/` never import three.js or touch the page.

## Delivering a change

Rootshock lives in the Game-Template-and-Library repository at `games/rootshock` since 6 Nov 2026 (its history came
with it). The root `CLAUDE.md` is the rulebook: `claude/…` branches, a pull request into `main`, never a push to `main`,
commits as `WB <willbuzbee@gmail.com>` with a `Co-Authored-By:` line for Claude, and `npm run check` and `npm run build`
before pushing. CI boots the game in headless Chromium; the pull request's preview is
`…/preview/<number>/games/rootshock/`.

- Say in the pull request what changed, why, what was checked, and what the owner should look at on the preview. Put
  lore, wording and open design questions under *For the owner*.
- Shared systems come from `@wb/core` (`packages/core`): `Rng`, `hashString`, `FixedLoop`, `STEP`, `Meter`, and
  `clamp`, `lerp`, `angDiff`, `angLerp` (re-exported by `src/core/math.ts`). Change them there, for every game, with
  their tests; `packages/core/test/golden.test.ts` pins the random numbers every level is dressed from.
- Under software WebGL (CI, a cloud session) the full renderer can take seconds a frame. To look at it from a session,
  trim it: `npm run look -- games/rootshock --query "?dbg=nomsaa,noglow,noprepass,nograin&detail=off" --size 640x360`.

## The owner

- Concise replies, dry wit, no praise, no constant agreement. Disagree when reasonable. Be plain about what can and
  cannot be checked from a session.
- When a design choice is theirs, ask, don't guess.
