# @wb/core

The systems the games share that need no dependency: no three.js, no page, nothing installed. Anything here can be used
by the sim (`src/sim/`) as well as by the drawing.

```ts
import { Rng, FixedLoop, STEP, clamp, angDiff, Meter } from '@wb/core';
```

A game with no bundler uses a build of it instead (`npm run build -w packages/core`):

- `dist/core.js` is an ES module. Map `@wb/core` to it with an import map.
- `dist/core.global.js` is a classic script defining the global `WB` (`WB.Rng`, `WB.FixedLoop`, …), for a game built as
  one script.

## API

| export | what it is | from |
|---|---|---|
| `Rng(seed: number \| string)` | Seeded random numbers (mulberry32). `next()` gives 0 ≤ x < 1, plus `range(a, b?)`, `int(n)`, `pick(arr)` and `chance(p)`. `state()` and `restore(s)` save and resume the stream. A string seed is hashed. | Rootshock `src/core/rng.ts`; the same numbers as Tethys's `mulberry`, Overworld's `rand` and Planet-Viewer's `mulberry32` (`test/golden.test.ts`) |
| `hashString(s)` | FNV-1a, 32-bit, unsigned. | Rootshock; Tethys's `hashStr` is the same function |
| `HZ`, `STEP` | 60 steps a second, and one step in seconds. | Rootshock `src/core/loop.ts` |
| `FixedLoop` | `advance(dt)` takes real seconds and returns how many whole steps to run now, at most 8, dropping the backlog after a stall. `alpha` (0..1) is how far the frame is between the last two steps, for drawing in between. | Rootshock `src/core/loop.ts` |
| `clamp`, `lerp` | `clamp(v, lo, hi)`, `lerp(a, b, t)`. | Rootshock `src/core/math.ts` |
| `angDiff(a, b)`, `angLerp(a, b, t)` | The shortest signed turn from angle `a` to angle `b`, in radians, and a turn part of the way there. | Rootshock `src/core/math.ts` |
| `PI`, `TAU` | π and 2π. | Rootshock `src/core/math.ts` |
| `Meter` | Where a frame goes, for a dev readout. `add(part, v)` during a frame and `end(dt)` after it. `line(parts, dp?)` gives each part as `mean/worst` over the last half second. | Rootshock `src/present/perf.ts` |

## What is not here yet, and why

The 6 Nov 2026 audit found more systems in two or more games. They wait for a reason, not for lack of a second user:

- **Save storage.** Each game's saves hold players' data in its own format, and moving them onto one store changes how
  each saves. Worth doing when it also fixes what players lose: Rootshock deletes saved runs on every save-version bump.
- **The WebAudio core.** Moving it changes how two games sound, and a session cannot hear.
- **Input** (pointer lock with a drag fallback, the touch stick). Tethys's input is wired into its game.
- **Noise.** Tethys's value noise and Overworld's Perlin noise are different algorithms, and each must keep
  generating the same worlds.

`docs/decisions.md` (entry 12) says why each waited; `docs/audit-2026-11.md` has what each game's version does, which
is best, and what makes moving it risky.
