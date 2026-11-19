# Fog and haze above the water: what the air does, and what the game's air does (19 Nov 2026)

A believability pass on the fog above the surface, at the person's request. **Answered 19 Nov 2026 (§8): all five changes, built as v11.185 (1, 2, 4)
and v11.186 (3, 5).** §6 is the proposal as written before the answers.
Downstream of `PLANET.md` (11.5° N, a 27 °C sea, Earth's radius and air, the trades), `CLOUDS.md` (the cloud base at 650 m, the inversion at
~1,550) and `GLOBE.md` §7 (what is visible from where); it audits DESIGN "The mist above the water" and "The air since v11.64" (world.js
`HAZE`, `AIR`; scene.js `MIST_GLSL`, `fogAir`, `skyFar`). The water's own veil is a different medium and is not in question here.

> "When I look out on the distant horizon, I see fog that tends to obscure objects in the distance. This does not look bad, but it makes me
> wonder how realistic that actually is, versus just a holdover from early days of development. I am asking you to do a plausibility and
> believability pass on fog in general — how does fog work, what produces it, what temperature, where does it go, how does it follow
> currents, etc. Then, I want to synthesize how it ought to look far away (in a shot like this) as well as just on the surface looking off
> on the horizon." (the person, 19 Nov 2026, with a still from a high island's grassy flank: the sea pale from a few km, two far islands as
> flat pale shapes on the haze)

**The short answer.** What obscures the distance is real, and is not fog: it is *haze* — the sea's salt and the air's moisture in the lowest
kilometre and a half. Fog, in the strict sense, belongs in few places on this planet — a calm dawn's lagoon (built) and, every day, the high islands' caps —
and the game does not draw the caps' (§5). The
holdover is not the haze's presence but its *shape*: a near term from the pre-v8 look that takes a third of every view's contrast in its
first two kilometres at any height and then stops, over a salt layer thinner than any real one (§4).

## 1. What fog is

Fog, mist and haze are one family sorted by how wet the particles are, and the eye sorts them by how far it can see.

| | what is in the air | relative humidity | visibility (WMO) | colour |
|---|---|---|---|---|
| **fog** | water droplets, 5–20 µm, 0.05–0.5 g/m³ — a cloud touching the ground | 100% (saturated) | under 1 km; 30–300 m in a thick one | white to grey: droplets far bigger than light's wavelength scatter every colour alike |
| **mist** | the same, fewer and smaller | ~95–100% | 1–5 km | grey-white |
| **haze** | dry or damp particles under 1 µm: sea salt, sulfate (from the plankton's DMS), dust, smoke; they swell with the humidity | under ~95% | over 5 km; 20–70 km at sea | blue-grey to white over the sea; yellow-brown with dust or smoke |

**Air saturates in two ways: it is cooled to its dew point, or water is added to it.** The air's capacity for water rises ~7% per °C
(Clausius–Clapeyron), so a few degrees of cooling is the whole story. Every kind of fog is one of these:

- **Advection fog**: warm moist air blowing over colder water (or land) and chilled from below. Earth's great sea fogs — California,
  Peru, Namibia, the Grand Banks — sit on cold currents or cold upwelling. Needs the water below the air's dew point.
- **Steam fog (sea smoke)**: cold air over much warmer water; the water evaporates into air that cannot hold it. Arctic outbreaks, lakes
  in autumn, a tropical lagoon at a clear calm dawn. Needs the water ~10 °C warmer than the air, or a still shallow pool after a cold night.
- **Radiation fog**: land losing heat to a clear night sky in calm air; the coldest air drains downhill and pools in valleys and craters;
  burns off from below one to three hours after sunrise. Not over the open sea: the sea's temperature barely moves in a day.
- **Upslope (orographic) fog**: wind forced up a mountain cools ~1 °C per 100 m until it saturates, at the same height the cumulus bases
  sit (the lifting condensation level). For someone on the slope, the cloud *is* fog. This is the fog of every high trade-wind island:
  Hawaii's and Réunion's cloud forests are the belt between the cloud base and the trade inversion.
- **Precipitation and mixing fog**: rain evaporating into cooler air, or two near-saturated airs mixing. Brief, under showers.

**Where it goes.** Fog is air, so it moves with the **wind**, not with the water: it follows ocean currents only indirectly, by forming
where the air crosses cold water and dying where it crosses warm. A sea-fog bank keeps the outline of the cold water under it; carried over
warm water or sunlit land it lifts into a low deck and breaks up. Cold, it behaves like water — radiation fog flows downhill, fills
basins, pours through gaps. Over a ridge it evaporates on the lee descent (the air warms as it sinks): the "tablecloth" and "waterfall"
clouds. An orographic cap looks still while the wind blows through it: it forms on the windward side and evaporates on the lee, all day.

**What it does to light.** Contrast falls by Beer–Lambert, `exp(−σ·d)`, with σ the extinction per metre; an object is lost at 2% of its
contrast, so the visual range is `3.912/σ` (Koschmieder). Two terms make the picture: the object's own light is attenuated, and the air
between adds its own glow (the airlight), the colour of the horizon sky in that direction. Droplets and coarse salt scatter strongly
forward, so toward the sun the airlight is a bright glare and things vanish sooner; away from the sun the haze is darker and bluer and
the same things stand out. Clear air (Rayleigh) is blue: on its own it limits sight to ~300 km, and over 50–100 km it turns dark ridges
blue and bright clouds a touch yellow, because it takes blue (~2.8·10⁻⁵ /m at sea level) four times faster than red (~0.6·10⁻⁵).

## 2. Tethys's air: no fog at sea, ever

The numbers are the planet's: the mixed layer 26–28 °C, trade air over it a degree or two cooler, and a cloud base at 650 m. That base is
itself a humidity: the condensation level rises ~125 m per °C of dew-point depression, so 650 m means the air at the water is ~5 °C above
its dew point — ~21 °C, ~75% humidity, which is what Earth's trades have.

| mechanism | what it needs | what Tethys has | verdict |
|---|---|---|---|
| advection sea fog | water below the air's dew point (≤ 21 °C) | 26–28 °C everywhere in reach; no cold current at 11.5° N | **no** |
| fog on the tidal fronts | the ~1 m/s streams of a 3× tide mixing cold water up | the mixed layer is 45–83 m deep and the shelf ~60: mixing stirs warm water into warm water; at the flanks' fronts a degree or two at most | **no** — 5–7 °C short; at most a whiter haze, too small to see |
| steam fog at sea | water ~10 °C warmer than the air | the trades are 1–2 °C cooler | **no** |
| steam fog on the lagoon | a clear calm night cooling the rim and the shallows | calms ~25% of days | **yes, built** (`MIST_DAWN`, v11.17.1) |
| radiation fog | calm, clear, land cooling, a basin to pool in | ours is a 30 m tuff cone; the giant has 14 km of land to 900 m and a caldera 110 m deep | **rare, possible** on the giant: its caldera and upland valleys on calm clear nights, gone an hour after sunrise |
| upslope fog | a slope rising past 650 m into the trades | the giant to 900 m, m122 to ~800 (48 km east of ours), the awesome shield to 2,533 | **daily**: the windward slopes above the cloud base, densest in the afternoon — the caps `CLD_CAPS` already draws from outside |
| shower mist and scud | rain into near-saturated air | showers ~8% of the time (`SHWR`) | **yes, built**: the haze ×(1+2.5·rain), the scud |

`HAZE`'s comment (world.js) reached the same verdict on 10 Sep, and it stands: no sea fog on a warm sea under trade air. The fog the person
sees on the horizon is haze, and haze is right. What follows is about its shape.

## 3. The haze, as Earth's trades have it

- **A layer about a kilometre and a half deep, not 70 m.** The trades' boundary layer is mixed from the water to the cloud base (650 m)
  and continues, damper, between the cumulus to the inversion (~1,550 m). Salt and sulfate fill it evenly; the humidity rises with height
  to ~100% at the cloud base, so the particles swell and the extinction, if anything, *grows* upward to just under the cloud base (lidar
  over the trades shows the maximum there). Above the inversion the air is dry, subsiding and clean: from a summit above it the haze is a
  flat milky sea with a sharp top, the sky over it deep blue, other summits crisp at 100 km.
- **How far you see at the water** (σ from sea-salt and sulfate optical depths of 0.05–0.15, plus Rayleigh):
  ~60–70 km on a clean light-wind day; **~35–40 km in ordinary trades**; ~20–25 km in a strong trade with whitecaps everywhere; 1–5 km
  under a shower. The salt is made by whitecaps, whose cover goes as the wind to the 3.4th power, so the wind is the knob: a calm clears
  the air over a day as the coarse salt settles; a shower washes it, and the hours after rain are the clearest of all.
- **The season**: the windy season is the hazier one (more whitecaps, `hazeK` already says whiter with the humidity); the still season
  the clearer, with more calms.
- **The horizon from the water is close and sharp.** An eye 0.5–3 m up sees the sea's edge at 2.5–6 km, through so little haze (60–80%
  of the contrast kept) that it is a line: the sea there a little darker than the sky's band above it. Islands stand *beyond* it, their
  feet behind the curve (the giant's shore at 18 km is 25 m under it, horizon.js), their bodies in the haze.
- **From a height the horizon goes.** From 450 m the sea's edge is 76 km off, the whole path in the layer; on an ordinary day the sea
  and the sky meet in the white band and there is no line, on a clear one a soft one.
- **Islands are found by their clouds first.** A sunlit cumulus is brighter than the sky, so it carries much further than the dark land
  under it: the stationary cap over a high island, its base tinted by a lagoon under it (the `lagoon glow`, v11.178), is how Pacific
  navigators found land beyond sight of it. The game has both.

## 4. What the game's air does, measured

The air is two things since v11.17 and v11.64 (world.js `HAZE`, `AIR`; scene.js `fogAir`): the **mist** — salt haze 1.7·10⁻⁴ /m at the water
over a scale height of **70 m**, the surf's spray over 4 m, the dawn mist — integrated along every ray and mixed toward `MIST_C`; then the
**radial fog**, `0.35·exp(−(0.0009·d)²) + 0.65·exp(−0.00003·d)`, mixed toward the sky in the ray's direction (`skyFar`). The second is the
pre-v8 fog's form, `FogExp2`, kept at a third of its weight: a Gaussian in distance, which no medium has, and the same at every height.

Contrast left (transmittance) by distance, today against a mixed layer (σ 0.9·10⁻⁴ /m to 650 m, half that to 1,550, clean above, Rayleigh
everywhere; "calm" and "windy" are σ 0.45 and 1.6·10⁻⁴; Earth's curvature in the chord):

| eye → target | | 1 km | 2 km | 5 km | 10 km | 18 km | 30 km | 50 km |
|---|---|---|---|---|---|---|---|---|
| water (1 m) → the sea | today | 66% | 45% | 24% | 9% | 2% | 0.4% | — |
| | physical | 90% | 82% | 60% | 36% | 16% | 5% | 0.6% |
| water (1 m) → 900 m summit | today | 78% | 61% | 52% | 42% | 30% | 18% | 8% |
| | physical | 92% | 84% | 64% | 41% | 20% | 7% | 1.3% |
| hillside (450 m) → 300 m flank | today | 79% | 62% | 56% | 48% | 37% | 26% | 14% |
| | physical | 90% | 82% | 60% | 36% | 16% | 5% | 0.6% |
| | calm | 95% | 89% | 76% | 57% | 36% | 19% | 6% |
| | windy | 84% | 71% | 43% | 18% | 5% | 0.6% | — |
| above the inversion (2,000 m) → 2,500 m summit | today | 79% | 63% | 56% | 48% | 38% | 26% | 15% |
| | physical | 99% | 97% | 93% | 86% | 77% | 64% | 48% |

What the table says:

1. **The near ground is too milky.** Today a third of the contrast is gone by 2 km from anywhere, a hillside or a summit alike; the
   air does that only in a mist. At the water today's effective visibility is ~10 km over the first 2 km and ~18 km over 18 — under the 23 km
   the comment at `AIR` names, because the radial term and the layer both count. Physically 2 km keeps ~82%.
2. **The far end is too kind, from a height.** Past the Gaussian's knee (~2 km) the radial term is almost clear air, and the 70 m layer
   is under every elevated ray: from the hillside a 300 m flank 50 km off keeps 14% — visible every day. Physically it is 0.6% on an ordinary
   day (gone) and 6% on a calm one (a faint shape). That is the still's pale islands: drawn as if the air were clear past 5 km.
3. **Height changes nothing.** Today a ray from above the inversion fogs exactly as one from a hillside; there is no haze top, so the
   shield's summit (2,533 m, the one place above the layer) cannot show the sea of haze below it or the summits crisp across it.
4. **The weather moves it only with rain.** No wind, calm, season or washed air after a shower — though the weather already has all four.
5. **Where the real fog is, the world is clear.** Inside the giant's cap (§5).
6. **Colour is one grey.** Every distance mixes toward the sky's colour in that direction (right: the airlight is the horizon sky), with
   one transmittance for all three channels. Missing: Rayleigh's blue on long paths above the haze.

What is right and stays: the far colour is the sky's in the ray's direction (`skyFar`, v11.45); the haze glows toward the luminary (a Mie
forward peak, `HAZE.glow`); the spray is a 4 m layer over the surf, the dawn mist a 6 m one — thin layers are what those are; the dome's
white band is the boundary layer seen edge-on (`mistFar`); rain thickens it; the horizon pass is fogged by the same function; no sea fog.

## 5. The one real fog, missing

Inside the giant's cap — 843 m on its windward flank at boot, under the deck's base at 650 — the dome is "fogged in" (atmosphere.js
`cloudVol` starts the march at the camera), so the sky is a flat grey, but the terrain, the trees and the rocks take only the clear air:
the forest a kilometre off stands dark and sharp against the grey. In a cap the visibility is 30–300 m, the light shadowless, the trees
dissolving into white within a few dozen trunks. Rendered (the prototype, §6.3: an extinction of 0.012 /m at the camera, ~330 m), it is
the most believable picture of the set, and the cloud-forest belt the wood (v11.180) already grows there for exactly this reason
(`WOOD.oro`: the windward flank lifted through the cloud band).

## 6. How it ought to look, and what would make it

**From a high island's flank, an ordinary trade day (the person's still):**

- To ~1 km: clear, the true colours, shadows barely lifted.
- 1–5 km: the reef's turquoise, the swell's rows and the wind lanes readable, softening; ~60% at 5 km.
- 5–20 km: the sea pales to the band's blue-grey; a neighbour at 18 km is a soft blue-grey mass at ~15–25%, its cap bright white and
  far more visible than the land under it.
- 20–50 km: islands at the threshold — an outline a shade off the haze, best with the sun behind; toward the sun, gone in the glare.
- No sea horizon: the sea goes into the white band; the band 5–10° tall, blue above; the cumulus bases one flat level receding in rows.
- A clear calm day: the shield, its summit 44 km off, as a blue-grey mass; a windy one: nothing past 20 km.

**From the water:** a sharp, near horizon (2.5–6 km), the sea just under it darker than the sky just over it; islands rising from behind
it, their feet hidden, their bodies hazed 15–30% at 18 km, their caps white; the band brightest just over the line.

**From the shield's summit, above the inversion:** a flat haze-sea below with a sharp top at ~1,550 m, the cumulus tops through it, the sky
deep blue, every summit above the layer crisp to 100 km and blue with distance.

**On the giant's windward slope above 650 m, by day:** in the cloud — grey-white, shadowless, ~100–300 m. Clearer at night and in the lee.

**The changes, ranked** (each the person's call: the haze is part of the look, WATER.md P6):

1. **One medium, physical** (scene.js `MIST_GLSL`, `fogAir`; world.js `HAZE`, `AIR`): the salt haze as the mixed layer — σ₀ to `CLOUD_H`,
   a fraction to `CLOUD_H + CLOUD_T`, nothing above — integrated in closed form along every ray (a piecewise-linear integral, the cost of
   the exponential it replaces); the Gaussian near term struck (`AIR.share` 0); `AIR.far` becomes Rayleigh. The spray and the dawn mist
   stay as they are. Fixes §4 items 1–3. *Prototyped* (below): from the water the giant at 8 km comes out darker and clearer; from the
   giant's flank the shield (its summit 44 km off) goes from a ghost to nearly nothing on an ordinary day, and comes back as a blue-grey mass on a calm one.
2. **The weather drives σ₀** (atmosphere.js `updateHaze`): the wind (calm ×0.5, trades ×1, a strong trade ×1.8), the season, ×(1+2.5·rain)
   under a shower and ×0.6 for half a day after one. Fixes item 4; turns "can I see the shield today" into weather.
3. **The cloud is fog** (the fog chunk, clouds.js): the deck's and the caps' density at the camera (`cloudAt` on the CPU, as `cloudHere` and the beam's
   shadow reads it) as an extinction of ~0.005–0.03 /m on every material in air, toward the cloud's own lit grey. Fixes item 5.
4. **Rayleigh by channel** on the air's paths (`fogAir`'s transmittance a vec3, blue 2.3× green, red 0.5×). Small inside the layer; the
   blue ridges from above it. Fixes item 6.
5. **Radiation fog in the giant's caldera and upland valleys** on calm clear nights (the dawn mist's rule, by the ground's hollowness
   rather than the lagoon). Optional; nobody may ever see it.

**Not to build:** sea fog, sea smoke, fog banks drifting with currents, fog on the tidal fronts. Each needs cold water this sea does not
have.

**What it would cost.** Items 1, 2 and 4 replace arithmetic in a chunk every fragment in air already runs: no draws, no uniforms that
are not already sent, no passes — `test/gpu.js` would show nothing, and the per-fragment cost is the GPU's to measure (the person's
4060). Item 3 is one uniform and one exponential per fragment. None of it touches under water.

**The prototype** (for the pictures only, never committed; a copy of src/ with three edits): in `MIST_GLSL`
`float blF(float y){y=max(y,0.0);return uMist.x*(min(y,650.0)+0.5*clamp(y-650.0,0.0,900.0));}` — the layer's optical depth from the water to
y — and `blL(y0,y1,d) = d·(blF(y1)−blF(y0))/(y1−y0)` in `mistRay` for the haze's term, `blF(∞) − blF(cy)` in `mistFar`; in `fogAir` the
transmittance `exp(−uFogA.x·L·vec3(0.51,1,2.26)·exp(−ȳ/8000))`; `HAZE.dens` 0.9·10⁻⁴ (0.45 for the calm day), `AIR.share` 0, `AIR.far`
1.24·10⁻⁵. The cap's picture added `MIST_W` 0.012 /m with no height falloff. Shot with `test/benchpage.js` and `choose()` at boot's 11 h:
the giant from the water (−7700, 6000), its lee at 420 m (−18714, 8086), its north flank at 374 m facing the shield (−16400, 5700, yaw
0.65), its cap at 843 m (−14484, 9621). Not tuned: the dome's band is σ₀·~1,100 m thick now against 0.012, and its gradient (`uHor`) was
painted for the thin one; a build would look at the low sky before anything else.

## 7. Open — the person's (answered, §8)

1. **The ordinary day.** Physical (~35–40 km at the water: the giant and the near neighbours every day, the shield and the far ones on clear
   days — GLOBE §7's own words, "within ~30 km most days and the great ones on clear days from 60–100"), or today's (the far islands always
   faintly there)?
2. **Weather in the haze** (item 2): should the distance change from day to day?
3. **Fog inside the cloud** (item 3): the giant's windward slope above 650 m in fog most afternoons — wanted?
4. **The blue of distance** (item 4) and **the caldera's night fog** (item 5): worth it?

## 8. The person's answers (19 Nov 2026)

> "1. For now, let's go with physical visibility. We can make them more noticeable later if believability does not sit well. 2. Yes absolutely,
> that's accurate and believable. 3. Of course, that sounds very accurate. 4. Yes please."

1. **The ordinary day is physical**: ~35–40 km at the water; the far islands on clear days. To revisit if it does not sit well — the knob is
   `HAZE.dens` (and `HAZE.calm` for how clear a calm is).
2. **The weather drives the haze** — built as v11.185 with item 1 and the blue of distance (item 4): world.js `HAZE`, `AIR.ray`; scene.js `blF`,
   `rnL`, `fogAir`; atmosphere.js `updateHaze`. Two things the prototype did not have, found in the build: the rain as a term of its own (below the
   shower's base and only across its shaft — as a share of the slab it greyed the whole sky to the zenith) and the haze's light dimmed under the
   cell (the bright horizon colour washed out the shower's dark base).
3. **Fog inside the cloud**, and 5, **the night fog in the craters** — v11.186.

