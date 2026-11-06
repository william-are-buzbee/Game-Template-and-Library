---
name: new-game
description: Start a new game in this repository (games/<name>). Use when the person asks for a new game or a prototype meant to last. For a one-shot, a model trial or a tech demo, use new-lab instead.
---

# New game

1. **Name it.** Short, lowercase, hyphens (`tide-pool`). If the prompt gives no hint, propose one and go on; the person
   can rename it in review.
2. **Read `CATALOG.md`.** Note every package that covers part of the idea; those get used, not rewritten. If a game or
   lab already has something this one needs, that is a second use: plan to promote it (the `promote` skill).
3. **Branch.** `git fetch origin main && git checkout -b claude/<name> origin/main`.
4. **Scaffold.** `npm run new -- game <name> "<one line: what it is>"`. This makes `games/<name>`, links it into the
   workspace and rewrites `CATALOG.md`.
5. **Write down what it is.** Fill in *What this is* in `games/<name>/CLAUDE.md` from the prompt: the idea, the feel,
   who you play, what it is not. Ask about anything that is the person's choice and the prompt leaves open.
6. **Build the first playable version.** The game logic in `src/sim/` (plain data, one fixed step, seeded randomness),
   drawing and input in `src/present/`. Add a test in `test/` for each rule of play you add.
7. **Check and look.** `npm run check`, `npm run build`, `npm run look -- games/<name>`, then open the screenshot.
8. **Deliver.** Commit (author `WB`, a `Co-Authored-By` line for Claude), push, open the pull request, and say what to
   try on the preview: `…/preview/<number>/games/<name>/`, which keys, and what to look for.
