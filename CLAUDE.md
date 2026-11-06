# CLAUDE.md — Rootshock

Read this first. Then `README.md` (running it, the commands, the dev keys, where things are), `docs/world.md` (what the
game is), `docs/engine.md` (how it is built) and `docs/handoff.md` (where the last session left off, newest at the top).

## What this is

A first-person game set in Lowfield Station, a facility deep under a field. TypeScript, three.js, Vite, Vitest. The rule
that keeps it malleable: `src/sim/` and `src/world/` never import three.js or touch the page.

## Delivering a change

The owner (william-are-buzbee) does not write code. Claude writes it; the owner plays the preview, reads the pull request
and merges it. The merge is the release.

1. Work on a `claude/…` branch, push it (`git push -u origin claude/…`) and open a pull request into `main`. Once a pull
   request is open, its branch takes only fixes to it; follow-up work goes on a new branch and a new pull request.
2. Never push to `main`. Never force-push, rebase or hard-reset. `main` is locked by the ruleset *Only Will Merges*
   (Settings → Rules): a pull request is the only way in, force pushes and deletion are blocked, and no approvals are
   required, because the pull requests open under the owner's account and GitHub does not let anyone approve their own.
   A refused push to `main` is the ruleset working, not something to get round.
3. Run `npm run check` before pushing. CI (`.github/workflows/check.yml`) runs it and a build on every pull request, and
   skips changes to docs alone.
4. Pages publishes the `gh-pages` branch. Every merge to `main` is live at `https://william-are-buzbee.github.io/Rootshock/`
   (`pages.yml`); every pull request gets a playable preview at `…/pr-preview/pr-<number>/`, linked in a comment on it and
   removed when it closes (`preview.yml`). Both workflows push to `gh-pages`, so no ruleset may cover it or all branches.
5. Commits are authored as Claude, the session's default identity; the owner's merges mark what they accepted. Do not
   change the identity.
6. Say in the pull request what changed, why, what was checked, and what the owner should look at on the preview. Put
   lore, wording and open design questions under *For the owner*.

## The owner

- Concise replies, dry wit, no praise, no constant agreement. Disagree when reasonable. Be plain about what can and
  cannot be checked from a session.
- When a design choice is theirs, ask, don't guess.
