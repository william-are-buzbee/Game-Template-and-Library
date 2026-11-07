# Game-Template-and-Library

Every game, experiment and shared system in one place: games in `games/`, one-shots and tech demos in `labs/`,
systems shared by two or more of them in `packages/`. **[CATALOG.md](CATALOG.md)** lists everything that exists;
**the site** plays everything: https://william-are-buzbee.github.io/Game-Template-and-Library/

The code is written by Claude and reviewed and merged by the person; the rules for that are in [CLAUDE.md](CLAUDE.md),
the repository settings in [docs/standard.md](docs/standard.md), and what was decided and why in
[docs/decisions.md](docs/decisions.md).

## Asking for something new

Say it in a prompt: "a new game: …" or "a lab to try …". Claude scaffolds it (`npm run new`), builds it, and opens a
pull request; the pull request's preview link plays it before you merge.

## Running it yourself

Needs [Node.js](https://nodejs.org) 22.18 or later.

```
npm install                          once, and whenever a package.json changes
npm run dev -w games/<name>          play a game while working on it (reloads on save); labs/<name> likewise
npm run check                        types, the catalog, and the tests of what you changed (check:all: every test)
npm run build                        build everything
npm run new -- game <name> "<one line>"   start a game (or: lab)
```
