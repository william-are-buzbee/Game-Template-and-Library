# analysis_loading.md — what the start does, and a loading page (20 Nov 2026)

The person, 20 Nov 2026, after v11.187: "the previous version was actually so bad even my good card at home could barely run it without lag and a huge
start up time. That's actually what I want to work on — a loading page, or some way of doing a lot of work at startup but somehow making that clearer.
Open to your discussion on this." A discussion; nothing here is built. §4 is the person's to answer.

## 1. What the start does, measured

Headless Chromium on a cloud machine with software WebGL (SwiftShader), v11.188, from navigation to play. The times are that machine's — a CPU drawing as
a GPU — so their proportions are the finding, not their size; the person's PC is faster at most of it, and on Windows the shader compiling is the
exception (below).

| step | time here | the page meanwhile |
|---|---|---|
| the scripts' top level | ~4.0 s | frozen, nothing drawn |
| — main.js: the nine cells under the menu's camera (`cellsAround`) | 1.5 s | |
| — region.js: the region model, the islands as records | 0.9 s | |
| — far.js: the water and floor maps (`wmFill`, `wmBlur`) | 0.8 s | |
| — scene.js: the caustic's tiles baked | 0.4 s | |
| the first frame: 69 shader programs compiled (the menu's in its render, the rest in `warmShaders`) | ~9 s | frozen |
| new game: the world round the start streamed (53 cells and far regions) | ~6 s of work | playing: spread over frames by the budget, land and plants appearing |

What makes it feel bad is less the total than that the first ~13 s here are **one frozen page with nothing on it** (the browser cannot paint while a
script runs), followed by the world arriving piece by piece once play starts.

**The shaders are the big one on the person's machine.** Chrome on Windows compiles every WebGL shader through Direct3D's HLSL compiler, which is slow for
long shaders, and every Tethys material carries the whole fog (the water's veil, the air, the clouds, the halo) in its pixel shader: 69 long programs. Chrome
keeps compiled programs in a disk cache, so a second visit to the same build is faster — but a new version changes the shader text, so **every preview the
person plays starts cold**, which is also why it felt worse to them than to a player would.

## 2. What can be done, by what it buys

1. **Make the start paint (a loading page that moves).** The top-level work becomes a boot sequence that yields to the browser between steps — the pattern
   the cells already stream with (`genChunk`) — so a page can draw a progress line and a word for each step between them. Nothing gets faster, but nothing
   is frozen, and the person sees what is happening. Moderate: main.js, the four heavy files' load-time calls, the shell's page.
2. **Compile the shaders in parallel, not one by one on the main thread.** Browsers that have `KHR_parallel_shader_compile` (Chrome does, Windows included)
   compile on the driver's own threads if the page does not ask for the result straight away; three.js r128 asks straight away (it checks each program's link
   status as it makes it). Turning that check off for the warm-up and polling the extension's completion flag instead lets all 69 compile at once while the
   loading page counts them. Likely the largest saving on the person's PC; unmeasurable here (SwiftShader has no such threads). Small: warmShaders and its poll.
3. **Do less at the start.**
   - The menu's nine cells could stream behind the loading page like any other cells instead of all at once (1.5 s here).
   - The region model and the water maps are the same for every visit of a version: they could be kept in the browser (IndexedDB) after the first visit and
     read back — a cache of what the recipe makes, rebuilt when the version changes, not a stored file in the repository (the "recipes, not cakes" rule
     holds). Saves ~1.7 s here on a second visit; nothing on a first.
   - Fewer or smaller programs: the world shadows' depth programs are compiled at the start though the world shadows are off by default; the fog could move out of
     the materials into one pass. The first is small; the second is a large rework, for later if ever.
4. **Let the world arrive before play, not during it.** New game and continue could wait behind the page until the cells and far regions round the start are
   streamed (~6 s of work here, less on a PC), so the first second of play is the whole world and none of it popping in. The same budget, moved to where
   nothing is happening.

## 3. What I would build first

2 and 1 together, then 4: the shaders compiled in parallel behind a page that shows each step, and play opening on a world already there. 3's cache after,
if the first visit of a version still feels long. Each is measured against the one before (test/fill.js's machinery times the boot as well as the frame).

## 4. Open — the person's

1. **The page's look.** Black, "tethys" in the game's lowercase letterspaced serif, a thin line filling under it and one quiet word for the step (*the
   island*, *the water*, *the light*, *the world round you*)? Or something more: a slow view of the sea drawn as soon as the first programs are ready?
2. **One wait or two.** Everything up front, then the menu instantly responsive and play opening at once — or the menu as early as possible with new game
   waiting for its world?
3. **The cache.** Is keeping the world's model in the browser between visits (rebuilt per version) acceptable?
