---
name: promote
description: Move code that one game or lab has into packages/ because a second project needs it (the promotion rule in CLAUDE.md). Use whenever you are about to write something CATALOG.md or another project already has.
---

# Promote to a package

The promotion rule: code moves to `packages/` when, and only when, a second project needs it. One pull request does
all of the following.

1. **Choose the home.** No dependencies? It joins the package for dependency-free code (create it if this is the
   first). Needs three.js or a library? It goes in a package for that dependency. Don't make a package per system.
2. **Take the best version.** If both projects have one, compare them, and say in the pull request which won and why.
   Keep the API to what the two projects call: nothing speculative.
3. **Move, don't copy.** The package gets the code; both projects import it (`"@wb/<package>": "*"` in their
   `package.json`, then `npm install`) and their own copies are deleted.
4. **Pin its behaviour.** Tests in the package for what both projects rely on. If a project's output must not change
   (a world from a seed, a save file), add a golden test with values taken from the old code before the move.
5. **Document it.** The package's `README.md`: what it is, the API, and where it came from (project and date). Its
   `package.json` `description` is the one line `CATALOG.md` shows.
6. **A demo** page in the package (`demo/index.html`, built by its `build` script) once it has something to show.
7. `npm run catalog`, `npm run check`, `npm run build`, `npm run look -- --all`. In the pull request, say what to
   playtest in each project that changed.
