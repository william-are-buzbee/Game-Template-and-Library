# Decisions

What was decided for the whole repository, and why. One entry each, newest last; a game's own decisions live in its
`CLAUDE.md`. When a decision is reversed, strike it through and add the new one below; don't delete it.

The evidence behind the first entries is the audit of 6 Nov 2026 of Tethys, Rootshock, Overworld and Planet-Viewer,
which found four repositories sharing no code, copying it instead (the same random number generator four times, one
`publish.sh` three times), on three incompatible stacks.

1. **One repository for everything** (6 Nov 2026). Games, labs and shared packages live together. The shared code is
   small (about 1k lines when first counted) and a separately versioned package would cost a release and a bump pull
   request for every change to it; here an engine change and the games using it are one pull request, CI builds every
   game on every change, and every session can see everything that already exists, which is what stops systems being
   rebuilt. Cost: one site for all, so older games' own addresses change when they move in.
2. **Build for the future with structure, not features** (6 Nov 2026, the person). Ahead of need: places (`games/`,
   `labs/`, `packages/`), rules (promotion, architecture), tests and a record (`CATALOG.md`, this file). Not ahead of
   need: any system. Animation, procedural music, texture and mesh generators, multiplayer and the like each get built
   when a project wants them, in a lab first, and promoted when a second project does.
3. **Labs live here** (6 Nov 2026, the person). Every game so far began as a one-shot to try a model, so one-shots get a
   first-class home with one rule: they build.
4. **TypeScript, strict; Vite; Vitest; npm workspaces** (6 Nov 2026, the person: all future games in TypeScript). Types
   catch the mistakes a codebase written by a model and reviewed by a person keeps making; Vite builds and serves;
   npm workspaces need nothing beyond Node, and let a lab pin a different three.js than a game. Settings from
   Rootshock's `tsconfig.json`. The repository's own tools are TypeScript run directly by Node (22.18 or later), with no
   build step.
5. **The sim never touches the renderer or the page** (6 Nov 2026). Rootshock's rule (its `docs/engine.md` §3), made the
   rule for every game and enforced by a test in each. With plain-data state and seeded randomness it keeps headless
   tests, saves, a server, multiplayer and a new renderer possible without a rewrite.
6. **Recipes, not cakes** (6 Nov 2026). All three games were found entirely procedural: no asset was loaded anywhere.
   Generators and their parameters go in git; outputs are made at build or run time. Keeps the repository small and
   out of Git LFS, and one recipe serves every resolution.
7. **No general physics library by default** (6 Nov 2026). None of the games uses one. Rootshock decided against Rapier
   in writing (`docs/engine.md` §2 and §6: a 3.1 MB WebAssembly module against a 0.87 MB game, an asynchronous start, a
   second world to keep in step, and state that cannot be saved as plain data); Tethys has its own contact code. A game
   that wants one adds it as that game's dependency; it becomes a package by the promotion rule like anything else.
8. **Pull request previews by `.github/publish.sh`** (6 Nov 2026, the person: whatever is easier and brings up the
   preview). The script three of the repositories already used, writing `gh-pages` with no third-party action holding
   write access, and commenting the preview's link on the pull request. Its kept copy per version is dropped: with every
   game on one site a full copy per merge would outgrow Pages, and the `gh-pages` history keeps every version anyway.
9. **A fresh branch per change, or per prompt** (6 Nov 2026, the person). Planet-Viewer's rule, so one pull request can be
   merged while the next is under way.
10. **`CLAUDE.md` is the rulebook; `AGENTS.md` points to it** (6 Nov 2026). The standard requires the branch, pull request
    and identity rules to be stated in `CLAUDE.md`; other agents read `AGENTS.md`, which sends them there.
11. **The trends report is run by hand** (6 Nov 2026, the person), not on a schedule.
12. **What `@wb/core` took first, and what waited** (6 Nov 2026, Phase 4). From the audit's list of systems found in two
    or more games, `@wb/core` took the ones that can move without changing what any game does:
    - the random number generator: the same algorithm, giving the same numbers, in all four repositories (pinned by
      `packages/core/test/golden.test.ts`);
    - the fixed-step loop and the frame meter, both from Rootshock and now also in the game template;
    - the angle and interpolation maths.

    Waiting, each for a reason:
    - **save storage**: every game's saves hold players' data in its own format, and moving them onto one store changes
      how each saves, for nothing a player would see;
    - **the WebAudio core**: it would change how two games sound, and a session cannot hear;
    - **input** (pointer lock with a drag fallback, the touch stick): Tethys's input is wired into its game, and a rewrite
      changes its feel;
    - **noise**: Tethys's value noise and Overworld's Perlin noise are different algorithms, each bound to its worlds;
    - **collision**: the two 3D games share ideas (verlet constraints, closest points), not code.

    Each is promoted when a game needs it and the person can check the result: they hear the sound, or play the feel.
    Rootshock's resolution governor stays in Rootshock, its only user.
13. **A dev mode in every new game** (6 Nov 2026, from the person's "god mode without needing to ask"). Under `?dev` the
    template has a frame readout (`Meter`), the state on `window.game`, and P pause, `.` step, T slow time; each game adds
    its own keys to `DEV_KEYS`. What the two 3D games' dev modes shared was this pattern (Rootshock: a key map and T for
    slow time; Tethys: console helpers and a readout); their actual keys (fly, god, teleport) are each game's own.
14. **A game with no build step takes `@wb/core` as a committed file** (6 Nov 2026, Overworld). TypeScript games import
    the package's source; a game that is served as it is (Overworld) or built by its own script (Tethys) gets
    `packages/core`'s build copied into its `vendor/` and committed, so the folder still runs as it always did, with
    nothing to build first. Its `npm test` fails when the copy is stale. A generated file in git is the exception to the
    rule, and this is what it buys.
15. **Browser tests are a workspace's `smoke` script** (6 Nov 2026). `test` stays headless and fast; `smoke` needs
    Chromium and runs in CI after it is installed (`node tools/each.ts smoke`). Overworld's play-save-reload test is the
    first.
16. **The games that moved in keep their own architecture** (6 Nov 2026). Rootshock is TypeScript with its own layer rule
    (close to this repository's); Overworld is plain JavaScript modules served as they are; Tethys is JavaScript in one
    shared scope, built by its own `build.js` and `build.py`. The architecture rules in `CLAUDE.md` are for games started
    here. Bringing an older game to them (TypeScript, the sim/present split) is a project of its own and the person's call;
    until then each game's `CLAUDE.md` says how it is built. Each takes from `@wb/core` what it can without changing what it
    does: Rootshock all of it, Overworld and Tethys the random numbers (and Tethys the string hash).
