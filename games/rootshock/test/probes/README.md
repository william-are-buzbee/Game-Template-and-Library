# Probes

Measurements, not tests: each runs the real sim headless and writes what it found to `probe-<name>.txt` (in the
directory `PROBE_OUT` names, or here; git ignores them). Nothing in them fails. They are kept because the faults they
were written for were found by measuring, not by looking, and the next one will be too.

    npx vitest run --config test/probes/vitest.config.ts            # all of them
    npx vitest run --config test/probes/vitest.config.ts down       # one

- `aim.probe.ts`: where a swing lands against the crosshair, each kind stood in front of you at 1 to 2.5 m, aimed at
  low to high. `WEAPON=pipe` for the side swing, `KINDS=husk,grabber` for fewer.
- `kill.probe.ts`: where what a real swing kills lies, axe and pipe: how far its middle went along your line, across
  it, and how high it rose.
- `tread.probe.ts`: walking into a body on the floor: each kind killed with no blow and asleep, walked and run through
  by you across it (through its middle, its legs, its head), along it, and past it at its side, walked through by a
  husk, and stood in: how far its middle, its trunk and its furthest point went, how long it was awake. Then the
  station's own, on a level (`LEVEL=main`), each killed where it stands and walked through. `KINDS=husk,worm` for fewer.
- `down.probe.ts`: the axe flooring a husk (as hard as one run into): how far its shoulders turn on the plan while it
  is down, and how far its hips go out. `TRACE=1` prints one fall step by step.

- `glance.probe.ts`: where each way of swinging glances, by level: from every spot on the nav graph, facing eight ways
  with 1.6 m clear ahead, the world alone; a side swing, a backhand and one brought down, for each weapon.
  `WEAPONS=pipe,axe` for the weapons.

- `snap.probe.ts`: how far each kind's pose jumps in a frame while it fights you in the arena (struck every second and
  a half, you stepping from end to end every two), in the model's own frame: the median, 99th and worst, and the worst
  frames with what it was doing either side of them. `KINDS=husk,worm` for fewer.

- `step.probe.ts`: what a sim step costs on each level (mean, median, 95th, worst), walking; and the page's share of
  the light each frame.
- `placement.probe.ts`: everything `test/placement.ts` finds on every level, in the room it is in: things you pick up
  over, off or in what they lie on, fittings hanging in the air or running into walls (with their colour, to find them
  by), panes along their openings, rails against walls, what is drawn or pinned on a board hanging off its edge. The growth and stains the test lets meet rock are listed too.
  `KIND=floats` for one.
- `loops.probe.ts`: how each level is joined up, from the nav graph: its rooms and the links between them (doors by
  what they want, openings, platforms, drops), how many loops there are on foot and with drops, the rooms on a loop,
  the dead ends, and what cannot be walked to from the rest. A loop is a way round, which is what a patrol needs to be
  gone round rather than waited out. `LEVEL=upper` for one; `LINKS=1` lists every link.

- `patrols.probe.ts`: where the changed keep their rounds, each level left to itself for some minutes with you out of
  it: the rooms they were in, how many others each had within 6 m and how often two or more, the most in one room at
  once, and the rooms their rounds made for. `LEVEL=main`, `SEED=3`, `MINUTES=8`, `POWER=full` (everything on).

- `trace.probe.ts`: the cast, step by step, to compare with after a change to how they move or decide that should
  change nothing. `SAVE=<dir>` runs each case and keeps a hash of the whole cast each step (and the cast in full once a
  second); `CHECK=<dir>` runs them again and says, for each, the first step that differs and who differs. Each level as
  it begins and with everything on, you walking about it; the opening; and each kind in the arena, then all of them.
  `CASE=arena` for those whose name has it. Saving also lists the states each case reached, so you know what it covers.

- `golden.probe.ts`: every level as compiled, to compare with after a change to how levels are written that should
  change nothing, or only what it says. `SAVE=<dir>` writes each level's definition and grid there (before the change);
  `CHECK=<dir>` builds them again and lists what differs: by part, the first few things in each, and how many cells of
  the grid (and where the first are). `LEVEL=upper` for one.

`SET='STAGGER.upright=0;RAG.tip=0.6'` tries constants for one run (`kill` and `down`), without touching the tables.
To compare with what was there before a change: `git stash push <file>`, run with `PROBE_OUT` elsewhere, pop it.

`swing.ts` has the two pieces each uses: one of the cast stood in front of you in the test bed's arena, and a click
with a weapon aimed at a share of its height.
