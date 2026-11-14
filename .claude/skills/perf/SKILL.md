---
name: perf
description: Measure what a change costs, or run a performance pass. Use on every change to code that runs every frame or at load (the world, creatures, physics, cell streaming, flora, the frame loop) to put before-and-after numbers in the pull request; when the person says a preview feels laggier; and when asked for a performance pass.
---

# What it costs

The person plays each preview and, when it feels laggier, has tended to save the performance pass for later; by then several
versions have added to it and nobody knows which (`docs/decisions.md`, 26). So every change measures itself, and the pull
request says what it cost before the person plays it.

## On every change that touches a hot path

1. **Keep the sources from before** in your scratchpad: `git archive origin/main <game>/src <game>/vendor <game>/shell.html | tar -x -C <dir>`
   (any older commit works the same, for finding which version moved a number).
2. **Run the game's tools against it.** Tethys: its CLAUDE.md, "Performance", says which tool for which file
   (`test/bench.js` the world, `test/frames.js` the frame's creatures, `test/bench_creatures.js` the builds and the cells), each
   with `BASE=<dir>`; each prints the ratio and whether the result is the same to the bit. A game without tools: time the hot
   function over a fixed input in node, the best of several runs, alternating old and new.
3. **Say it in the pull request** — a small table (before, after, ratio) under "What changed", the same in the CHANGELOG entry.
   Anything worse by more than 10% goes in the first line, with why it is worth it. What a session cannot measure (the GPU:
   draws, shaders, fill) say you did not, and what the person should look at in the readout.
4. **Check the shapes** if you added or changed an object read every frame or every sample (Tethys: `SHAPES=1 node test/frames.js`).

## When the person says it feels laggier

Ask where (a `tp()` or the place) and for the readout there: fps, frame ms, physics ms, render ms, draws, creatures. Render ms
running away from the rest is the GPU, which no CPU pass helps. Otherwise measure that place, then `BASE=` older versions
(`git archive <commit>`) to find the version that moved it.

## A performance pass

1. **Measure before touching anything**, on the person's heaviest place, with the tools above; profile (`node --cpu-prof`;
   Tethys `PROF=<function> node test/frames.js`). Time the game as it runs, warm: a function timed cold on a small input can
   hide what the game pays (v11.148's `sample()` read 1.6 µs cold and 2.4 in the game).
2. **Look for shapes first.** If a hot function's own lines are slow with nothing in them but property reads, count the
   objects' hidden classes (`node --allow-natives-syntax`, `%HaveSameMap`, `%HasFastProperties`). The cure is one literal with
   every key, in one order, unset ones `undefined`; never `delete`; never build an object key by key from a list (a dictionary:
   "one shape" and slow — build a literal with `new Function`, as Tethys's `defFlat`). Then pin it with a test.
3. **Keep every result the same to the bit** unless the person decides otherwise: hash what the code produces before and after
   (the tools do), and seed whatever is random for the comparison (Tethys's benches seed `Math.random`, and give three.js's
   UUIDs a stream of their own: three draws four numbers for every geometry it makes). A change that alters behaviour, however
   slightly — fewer updates for far animals, a coarser grid — is the person's call: measure it, propose it, don't ship it.
4. **Pin what the gain rests on** with a deterministic test (a shape check, a replay against the whole build), never a
   timing: timings on shared CI runners are noise.
5. **Write it down**: the CHANGELOG entry with its table, the DESIGN section's numbers, the game's CLAUDE.md "Things that bite"
   for any new rule, HANDOFF's paragraph; and in the pull request what was left for the person to decide.
