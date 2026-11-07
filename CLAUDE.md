# CLAUDE.md — Game-Template-and-Library

Read this first: it is the rulebook for every game, lab and package in this repository, for any agent (`AGENTS.md`
points here). Then read `CATALOG.md`, which lists what already exists, before building anything, and the `CLAUDE.md`
or `README.md` of the folder you are working in.

## What this is

The person's one place for everything made: games, one-shot experiments, and the systems they share, kept so that
anything built once can be found and used again. The person doesn't write code; Claude does. The person reviews and
merges.

| folder | holds | rules |
|---|---|---|
| `games/<name>` | real projects | the architecture rules below (three older games are grandfathered), tests, a `CLAUDE.md` of its own |
| `labs/<name>` | one-shots, model trials, tech demos | only that `npm run build` works |
| `packages/<name>` | proven systems used by two or more projects | a README with the API, tests, a demo |
| `tools/` | `new` (scaffold), `catalog`, `site`, `look`, `each` | |
| `docs/` | `standard.md` (repository settings), `decisions.md` (what was decided, and why) | |

Every game and lab is published to one site, https://william-are-buzbee.github.io/Game-Template-and-Library/
(`games/<name>/`, `labs/<name>/`), and every pull request gets a preview of all of them at `…/preview/<number>/`.

## Delivering a change

These are the repository standard (`docs/standard.md`); `main` is locked by the ruleset "Only Will Merges".

- **Branches.** Work only on `claude/…` branches: a fresh one per change, or per prompt, cut from the current
  `origin/main` (`git fetch origin main && git checkout -b claude/<what> origin/main`). This rule is standing permission
  to leave a session's assigned branch for a new `claude/…` one. Once a branch's pull request is open, the branch takes
  only fixes to that pull request; new work goes on a new branch and a new pull request, so the person can merge one
  while the next is under way.
- **Pull requests.** Push the branch (`git push -u origin claude/…`) and open a pull request into `main`. Never push to
  `main`, never force-push, never rebase or reset hard, and never merge: the person merges, and that merge is the release.
- **Identity.** Commits are authored as `WB <willbuzbee@gmail.com>` (`git config user.name WB` and
  `git config user.email willbuzbee@gmail.com` in the clone's local config, never any other name), with a
  `Co-Authored-By:` line for Claude on every commit. GitHub shows them "Unverified"; that is accepted.
- **Before every push:** `npm run check` (types, tests, catalog) and `npm run build`. CI runs both, and boots every game
  and lab in headless Chromium.
- **The pull request says** what changed and why, what was checked and what was looked at, and what the person should
  try on the preview: which game, which keys, what to look for. Say plainly what could not be checked from a session.

## Before you build anything

1. **Look in `CATALOG.md`.** If a package does it, use it. If a game or lab has it, that is the second use: promote it
   (below) rather than writing it again.
2. **A new project:** `npm run new -- game <name> "<one line>"` for something meant to last, `npm run new -- lab <name>
   "<one line>"` for a one-shot, a model trial or a tech demo. When in doubt, make a lab; a lab can become a game later.
3. **Write down what it is** (the game's `CLAUDE.md`, the lab's `README.md`) from the prompt before writing code.

## The promotion rule

Code lives where it was first needed. When a second project needs it, it moves to `packages/` in that same pull
request, with a README (the API, and where it came from), tests that pin what it does, a demo, and both projects
importing it. No package is written before it has a second user, and no package grows features nothing calls.

Packages are split where dependencies differ, not one per system: one with no dependencies for everything that needs
none, and a separate package for anything that needs three.js or another library.

## Architecture rules

Games started here follow these; labs are free to, and should if they hope to become games.

**Grandfathered:** Rootshock, Overworld and Tethys were built before these rules existed and are grandfathered in. Each
keeps the architecture its own `CLAUDE.md` describes (Overworld and Tethys are JavaScript; Tethys is one shared scope with
its own build), and a change to one follows that file, not these rules. Bringing one of them to these rules is a project
of its own, and the person's call (`docs/decisions.md`, 16).

1. **The sim never touches the renderer or the page.** `src/sim/` is the game as plain data, advanced one fixed step at
   a time. It never imports three.js or `src/present/`, and never uses `document` or `window`; `test/layers.test.ts`
   enforces it. This is what makes headless tests, saves, a server, multiplayer or a new renderer possible later
   without a rewrite.
2. **Plain data, seeded randomness.** State is plain objects and arrays, so it saves, clones and could be sent over a
   network. Anything random in the sim comes from a seeded generator, never `Math.random`.
3. **Recipes, not cakes.** Generated things (textures, meshes, sounds, levels) are stored as their generator and its
   parameters, and made at build or run time, so one recipe serves a 16×16 sprite and a 4k texture. No large binaries
   in git; a small hand-picked file is fine.
4. **TypeScript, strict.** The type checker is a second reviewer on every pull request.

## Look at what you change

From a cloud session you can build, test, run and screenshot; you cannot hear sound or measure the person's GPU.
`npm run build -w <dir> && npm run look -- <dir>` boots the real build in headless Chromium (software WebGL), fails on
any page error and writes a screenshot to `_look/<name>.png`. Look at it. `--query "?dev"`, `--wait <ms>` and
`--size 1600x900` change what is shot. The person's own check is the pull request's preview.

## Skills

`.claude/skills/`: `new-game`, `new-lab`, `promote`, `look`. Each is the checklist for that job.

## The person

- Doesn't write code; Claude does. Reviews and merges.
- Concise replies, dry wit, no praise, no constant agreement. Disagree when it seems reasonable. Be plain about what
  can and cannot be checked from a session.
- Likes questions and is open to ideas. When a design choice is the person's, ask, don't guess, and record the answer
  with its date (the folder's `CLAUDE.md`, or `docs/decisions.md` for the whole repository).
