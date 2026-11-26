# HANDOFF — tethys

Where things stand: the latest versions, what to ask the person, what is open. Current state only — every version's whole story is its
CHANGELOG entry, and this file as it stood to v11.191 (220 versions back to v11.18, with the old dated notes) is `archive/HANDOFF-to-v11.191.md`.
Add the new version's paragraph at the top; take out what is no longer true; keep the five latest.

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

**v11.241 (26 Nov 2026): the plants' light copies on the low tier** (grow.js `PLOD`, `plodVariants`; parts.js `GEO_LK`; chunks.js `poolPlod`, `poolCull`,
`poolPack`; scene.js `HIDE_NEAR`, `HIDE_FAR`, `plodMat`; test/plod.js; FLORA.md; CHANGELOG). The person: *"YES we want to make lighter copies … 40% is 40%."*
Past 45 m on the low tier a plant's tile draws a copy at half the facets, without its smallest parts; the whole plant draws only its near tiles, so nothing
is shaded twice (v11.194's mistake). Triangles ×0.73–0.86 where there are plants (against v11.239); 0.04–1.1% of pixels change (far specks). The grasses (strap, tress) got
none — flat blades; next, invisible, their variants split by size. **Ask:** an F8 at `tp(69950,29582,-10)` against #208's plants 6.35 ms; any pop at 45 m.

**v11.240 (26 Nov 2026): the sky under the water only when it can reach the screen** (atmosphere.js `skyUnder`, `skyViewMaxY`, `OCC.cvU`; horizon.js
`renderFrame`; test/skyunder.js; CHANGELOG). The person: *"make sure being deep underwater actually stops the sky from trying to render."* It did not.
Now the dome and its cloud pass are left out looking down (either tier) and when their weight through the window is under half a level (the high tier
from ~135 m); pictures the same. Measured: **the low tier's window is the sky itself, faint to 800 m** — so it is still drawn there — and shallow and
level the cloud pass's waste cannot be cut exactly. **Ask:** the clouds at half resolution under water, or none through the window on the low tier; the
low tier's window fading to the computed sky with depth like the high tier's.
**v11.239 (25 Nov 2026): the reed to 160 m on the low tier and 300 on the high, the seagrass to 160** (scene.js `Q.reed`, `THIN_CUT`, `MATRD`, `MATSG`;
flora.js the reed and the strap; main.js `warmShaders`; FLORA.md; CHANGELOG). The work tower's report on v11.238 (#205): 60 fps on the median now, 40%
of frames late, its worst place a sand flat where the reed was 600k of 1.33M triangles, nearly all past 150 m and specks at its size; the seagrass the same.
The person: the low tier at 160, the high longer "for now" (option 2) — 300, where ours' north shore's far bed stays whole — and *"do the seagrass too."*
The tower's worst place: triangles ×0.56, the proxy ×0.77; the high tier ×0.79–0.98 in triangles and its pictures the same. **Ask:** the tower's frame at
`tp(72929,243)`; whether the high tier's reed may come down to 160 later (the person's "we can always do it for the other high tier later").

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
