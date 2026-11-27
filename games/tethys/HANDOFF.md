# HANDOFF — tethys

Where things stand: the latest versions, what to ask the person, what is open. Current state only — every version's whole story is its
CHANGELOG entry, and this file as it stood to v11.191 (220 versions back to v11.18, with the old dated notes) is `archive/HANDOFF-to-v11.191.md`.
Add the new version's paragraph at the top; take out what is no longer true; keep the five latest.

**v11.247 (26 Nov 2026): the shape's drag, The Sapling's** (creatures_spec.js `SPINE_FORM`, `spineForm`, derive's `form`/`formWhy`; lab.js the caption;
test/spine.js; DESIGN The spine; CHANGELOG). The person: *"Absolutely, go for that."* A swimmer's drag coefficient × `form`, read off its knots: a lump
(girth past one rise and fall), a bend (the middle line off straight), a fat rear (widest girth past 0.6 of the way back). Every roster species is at 1
— none changed speed; a hand-made hump near a finback's tail is ×1.5 drag, 6.1 → 4.8 m/s. The lab's caption says why. **Ask:** the weights' feel
(lump 0.5, crook 0.5, rear 1.5); whether a body thicker at the front than the roster's should be rewarded.

**v11.246 (26 Nov 2026): the spine — every body a chain of knots, shaped by hand in the lab** (creatures_spec.js `SPINE`, `spineMove/Size/Add/Del`,
`spineRide`; parts.js `G.loft`, `G.ellK`, `knotV`; lab.js "the body by hand"; line.js the bill; test/spine.js; analysis_creators.md; CREATOR.md Sixth
round; DESIGN Creatures, The spine; CHANGELOG). The person: a Spore or Sapling style creator, *"they have to look identical but we can do the 'drag'
feature"*. The investigation is analysis_creators.md. Every core's body is now knots in its own numbers (a lathe's rings, a trunk's taper, a mantle's
rings, an ellipsoid's five, a bell's rings), so every species builds to the bit as before; in the lab the knots are beads on the body — drag to move
or bend, the wheel to fatten (shift height, alt width), double-click to add or remove, a trunk pulled longer grows plates; parts drag along it and
scale by the wheel; ctrl+z. **Ask:** analysis_creators.md's five questions; then in `#lab` the finback, the soft-arm, the sickle and the coilshell
shaped by hand — whether the beads, the rings and the gestures read. **v11.246.1**, the person's answers: the knots only on hover; the creator without
the core's sliders; a bend limit per clade (`SPINE_BEND`: hingeshells 25°, slowbloods 50, ringmouths 70, drifters 30 at most). **Ask:** the limits'
feel; whether the parts' sliders go from the creator too.

**v11.245 (26 Nov 2026): the hover keeps station, never still; the plumb's day roam through the current and past the walls** (creatures_ai.js `HOVER`,
`hoverShift`, `ROAM`, `HANG.head`, `hangGo`, `hangSettle`, `roamBegin`, `c.roamD`; test/clock.js, test/ringmouths.js; BEHAVIOUR §2, §3d; DESIGN; CHANGELOG).
The person: the ortho "frozen", the plumb "barely moving"; on the findings, *"go ahead with those numbers."* The hover rest (the ortho and the arrow by day,
the great and the needle by night, ~45% of the day) held a point at 0.03 m/s; now it drifts, bobs, turns and shifts its spot (the ortho 0.47 m/s at rest).
The plumb's day roam (every 45 s at 0.6 m/s, from 90 and 0.35) makes its jet good in any current, settles its station out of the walls' colliders and stops
where it is after 5 s without headway: five plumbs at a wall 0.149 → 0.352 m/s across, jammed 51% → 6% of the day. **Ask:** an ortho at noon on the slope
and a plumb at its wall by day — whether the hover reads as rest, and whether the plumb's roams (most stop short against the wall) read right.

**v11.244 (26 Nov 2026): one of the two high islands in the map's middle struck — m122 gone, m93 back** (region.js `REGION_K.strike`; test/region.js,
test/horizon.js, test/gpu.json; DESIGN The region; ARCHIPELAGO; CHANGELOG). The person: *"there shouldn't really be two sunken islands in one spot … pick one
and kill it"* — m122 (799 m) and m109 (470 m), 54 km apart, each in its own drowned ring. m122 is never born and the pins refit: ours' own island the same
to the bit, the giant's barrier 85 m out, m154 41 m lower, m31 out of the platform's north margin, m109, m117 and m93 the west's lineages now. v11.243 had
struck the atoll m93 by misreading which two; it is back. **Ask:** the map's middle; whether "just one visible" means more of these should go.

**v11.242 (26 Nov 2026): the uneven species split by their variants' size** (grow.js `VSPLIT`, `vsplitOf`; chunks.js `poolSplit`, `poolFor`'s key;
test/vsplit.js; DESIGN; FLORA.md; CHANGELOG). The person: *"go ahead with the grass split."* A pulled draw ran every instance at its largest variant's count;
the strap's and the tress's light variants are a tenth to a fifth of their heavy one. Such a species now draws its light instances in a pool of their own
(the strap and the tress on both tiers; on the high, with no copies, eight more). Nothing seen changes (the pictures the same pixel for pixel). The F8
place's triangles ×0.79 (with v11.241, ×0.58 against v11.239), the high tier's ×0.91–0.97, +2–6 draws. **Ask:** the tower's F8 at `tp(69950,29582,-10)`.

## Open

- **The plan** (analysis_project.md, the person's order, 20 Nov 2026): 1 the recorder (v11.191), 2 the docs (v11.192) and 3 the type checker (v11.193)
  done; 4 the flora's far copies built (v11.194) and struck (v11.201), and the tier that follows the machine (v11.199, the person's call); 7 a fixed step and seeded sim done
  (v11.209, v11.210); 6 three.js: the spike scoped it (4–6 days, analysis_project.md §6), v11.215 did the loading and the fixes that work on both
  versions, the rest after the tower's F8 (the person, 22 Nov); 5 the cells in workers: judged low value against the world cache (v11.214), not
  started; one door and its key end to end at any point.
- **Reports** (`node test/report.js --search`): #137 and #138, a work tower `20e1` (Intel UHD 730): high tier 82 ms a frame, the GPU 84 ms (main
  pass 75), 3.9M triangles; `#low` 33 ms, the GPU 35, 1.6M triangles — the GPU fell with the triangles (×0.41 against ×0.40), not the pixels (×0.81).
  They are step 4's before. The desktop tier is `high` on that chip; the boot under `#low` had a 7.4 s menu frame the recorder does not itemise.
  #141–#144, the home machine `kasd` (Brave hides the card), v11.194: 120 fps, the GPU 7.8–8.8 ms of 8.3; its freezes were the save store's read
  (v11.195) and write (v11.196), and the collector (200–325 ms every minute or two; the heap 1.5 GB in play, 2.9 GB at the list's reads — the old
  list held every slot whole). #144 is `#lod` at another place and size than #143, so no pair yet: one more without `#lod` at tp(-8479,5431,-11)
  in the same window settles it on that card (the work tower's pair still decides).
- **The person's open lists**, each in its doc: analysis_loading.md §4 (the loading page's look, one wait or two, a cache in the browser);
  analysis_fog.md (its questions); BIOLUM.md §7; WATER.md Part 5 (light across the line, an audit, nothing built); DEEP.md §11 (the
  constructors' place); analysis_archipelago.md §8.4; DIRECTION.md's Open list; LINEAGE.md §11 and §7c.4; SEAFLOOR.md §6; PIXEL.md (ready to build).
