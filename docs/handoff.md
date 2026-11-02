# Handoff: Cargo, made larger

For whoever picks this up in a new session. The branch is `claude/sleepy-lovelace-4v64em`. The design and what was built
are world.md §8, *Cargo, made larger* and *Cargo, sketched, and built*; the sketch is `mockups/cargo.html`. The handoffs
before this one are kept below: their rules for the layout, their tools, asks and open items still stand.

## Where things are

- `src/content/levels/upper.ts`: `buildCargo` (on its own random stream), `buildNave` (the cavern, receiving's office
  and the backup set, the decks and their stairs, the goods lift and the hoist, the crane, the nest, the fan wall, the
  plenum and the mother, the parts crib, the exhaust link) and `buildWarehouse` (the warehouse's strips and shutters, the
  Cargo office, the fuel passage, the freight hall and shaft, charging, the workshop, the cold store, dangerous goods,
  the air plant).
- Fire shutters: `DoorDef.fire` and `low` (`content/types.ts`); `needs()` in `sim/movers.ts` is the power a door needs to
  move itself, used wherever the heavy-door rule was. Tested in `test/puzzle.test.ts`.
- `PlatformDef.look` and `platformParts` (`present/render/things.ts`): the hoist's car and the goods lift's carriage.
- `rack()` in `content/build/furnish.ts`; `ownStream()` in `content/build/plan.ts`.
- Fixed ladders, climbed: `ClimbDef` (`LevelDef.climbs`), `climb()` in `content/build/plan.ts` (a hatch in the floor
  above, railed but on its way off, and the rungs and cage), `ladderAt` and `LADDER` in `sim/player.ts`, `Edge.Climb`
  and `Rules.climb` in `world/nav.ts`, and in `sim/reach.ts`. Tested in `test/puzzle.test.ts` (up, off, on, down).
- Saves are version 25 (Cargo's doors, platforms and cast in a new order; the player's `climbing`).

## What was learned

- **A single door's middle goes off the whole metre** (114.4, not 114): its 1.2 m on the quarter-metre grid carves only
  1 m when centred on a whole metre, too narrow for a spot, and the nav says the room past it is out of reach.
- **The placement test wants every prop held**: on the floor, against a wall or ceiling, or touching something held, and
  none partly in rock along a wall (a lump on a wall: its face exactly at the wall, `ICO` for an icosahedron's reach).
  Hangers into a ceiling are fine; a stub into a wall is not.
- **Every room needs a spot, and every spot must be reachable**: a pit (the freight shaft, a room on the basement floor
  with `dy`) is `part` and its foot covered by a collider; a corner boxed in by furniture is a fault.
- **A level part rebuilt without moving the rest**: `ownStream(seed, draws, f)`, with `draws` what the old part took
  (count it by the stream's state before and after: each draw adds 0x6d2b79f5).
- **Screenshots under software rendering** need about 15 s after a teleport for the eye to adapt, and the game drops to a
  few hundred pixels wide: small glows far off do not show. Serve a build (`vite build`, `vite preview`), as below.

## Open (for the owner)

- The manifest's and the chief of security's notes had their facts moved (the fuse's place, platforms to the hoist,
  rungs to decks): lore, for the owner to reword.
- world.md §8, *Cargo, sketched, and built*, **Open**.

# Handoff: Security at the station's size, item 9

For whoever picks this up in a new session. The branch is `claude/practical-maxwell-ajw5zk`, on top of
william-are-buzbee/Rootshock#121 (merged); no pull request is open for it yet. The handoffs before this one are kept
below: their rules for the layout, their tools, asks and open items still stand. This adds what item 9 taught.

## Where the list is

world.md §8, *Security at the station's size*: 1 to 9 are built, 9 in two commits (the air plant with its duct, then the
comms cupboards). Next are the pings, 10 to 15: design work, so talk each through with the owner before building it (the
order below, *The order (agreed)*).

## Where things are

- `src/content/levels/upper.ts`, in `buildHub`: 'Air plant' (two boxes on T2, +10), the 'Duct' (one box on T2 and five on
  T1 with `dy`), and the grille's frame in the 'Staff mess'. In `buildUpper`: the bar's veneer, in the lobby; 'Comms:
  wing' after the booth's cameras, 'Comms: operations' after the atrium's, 'Comms: muster hall' and 'Comms: east bays'
  after the court's. The rack is `comms()` in `content/build/furnish.ts`; its switch is a use of kind `comms`
  (`sim/interact.ts`: read, then smashed), drawn whole or hanging by `present/render/things.ts`. A smashed switch puts
  its branch in `Sim.blind`, which `camLive` (`sim/eyes.ts`) reads, so detection, the cameras' lights and the screens'
  feeds all follow; saves keep it. Tests: `eyes.test.ts`.
- Saves are version 24.

## What was learned

- **A drop the nav takes is 2.5 m at most** (`DROP` in `world/nav.ts`), and a landing hurts above 10 m/s, which with
  `GRAVITY` 20 (`sim/body.ts`) is a 2.5 m fall too: keep drops to 2.25. The plant's floor is 5 m over the mess's, so the
  duct takes two drops (2.25 and 2) and three joints a quarter metre down between them.
- **Spots stand on the grid only** (rock, a block, a slope), never on a prop: a counter under a grille is no landing. A
  drop wants a floor spot a metre from the edge's, with nothing standing on it; hence the grille just past the servery's
  end.
- **Heights land on the 0.25 m grid** (`Grid.fill` rounds each face): a 3.2 m room's ceiling is 3.25 to the sim. Put
  floors that matter on quarter metres.
- **A crawl** is a room 1.5 m high: crouched you are 1.0, and a link wants 1.0 clear over the higher spot, so the lower of
  two sections a step apart needs 1.25 m over the higher one's floor.
- **An upper floor lays its slab at its own height under each of its rooms,** so a room on it with a negative `dy` has a
  slab through it. Build what lies below a floor's base on the floor beneath, with a positive `dy` (the duct's sections
  are on T1, floors at +7 to +7.75). Rooms on different floors open into each other where they touch (one voxel grid):
  that is how the duct meets the plant (T2) and the mess (T1), and the contacts test lists both.
- **Two rooms on one floor cannot stack:** the later claims the plan cell, top to bottom. A duct over a room on the same
  floor is not possible; go round it, or put it on the floor above.
- **A link's clearance is the same for every walker:** only a spot's headroom keeps one of the changed (1.8 m) out. A
  riser one could stand in must be reached only through something lower than that, or one could drop in after you and
  be stuck at its foot.
- **A room 2.5 m square gets its ceiling grille 0.35 m from its light**, and validate.test.ts wants 0.5: make small
  rooms 2.5 by 3.
- **The dev server reloads the page on every save,** which spoils a screenshot run in progress. Shoot from a build:
  `npx vite build --outDir <scratch>/dist`, then `npx vite preview --outDir <scratch>/dist --port 4173`, and point the
  script at port 4173.
- **Long sim tests time out under load.** On four cores with every file at once, two tests ran past the default 10 s
  on `main` already: the opening's "in your washroom..." (four openings, about 10 s alone, a little more with these
  rooms' bigger nav) and eyes' "the cast keep out of them on their rounds" (8 s alone). Each has 30 s now. Run
  `npm run check` with nothing else going (a browser rendering beside it slows everything).
- **`pkill -f` or `pgrep -f` with a pattern that is also in your own command line** stops your own shell. Write the
  pattern `[v]ite preview`.

## Open (for the owner)

- What made the track in the duct's dust, and the noise along it in October (the `orders` note). The grille was forced
  out from inside; its look says so and no more.
- Smashing a comms cupboard blinds its branch's cameras (decided, and built). Watch in play whether a whole branch for
  one loud act is too cheap: the hall's switch takes the electrical room's, the Armory's and the range's guards at once.
- Decay as a system (world.md §1): only the bar's veneer is done, by hand.

---

# The previous handoff: Security at the station's size

For whoever picks this up in a new session. The branch is `claude/quirky-meitner-24eyvm`, opened as
william-are-buzbee/Rootshock#121; once that is merged, start from `main`. The two handoffs before this one are kept below:
their asks, tools and open items still stand.

## The design, and where it is

- `docs/world.md` §1, *Who lives here* (proposed): sized as it would really be, the station holds about 500 at any time
  (about 1,000 on the books, on rotation). What each level wants for that many, what being underground asks, and the
  rule: more station, not more monsters.
- `docs/world.md` §8, *Security at the station's size*: the list. 1 to 9 are rooms that were laid down as boxes in a
  first pass; 10 to 15 are places to grow later (a pocket for something of its own, or a way through). Each one built has
  a **Built:** note in its entry, and the order line at the end of the list says what is next.

## The order (agreed)

One at a time, in the list's order, each its own commit: the owner asks for each in turn ("do X next"). 1 to 8 are
built. Next is 9, the air plant (two or three times the size, ducts that can be crawled). Then the pings, 10 to 15: those
are design work, so talk each through with the owner before building it. 12, 13 and 15 add ways round gates, so each
wants a gate decided and the progression checker; 14 has lore open (which of the family sampled the trial lots).

## Where things are

- All of it is in `src/content/levels/upper.ts`; search by room name, since line numbers drift. In `buildUpper`: the
  arrival hall ('Surface landing'), the dock ('Goods inward'), the Ops suite ('Office: operations', 'Outer office',
  'Office: chief of security', 'Records', 'Conference room'), 'Maintenance' with its 'Generator room' and 'Fuel store',
  'Showers' and 'Toilets' after the locker room, and the 'Training room' before the muster speaker. In `buildHub`:
  'Administration' with its 'ID office' and 'Office: administration', 'Screening' with
  'Ladies' and 'Gentlemen', and at its end the 'Kitchen', 'Service stair', 'Pantry', 'Back passage', and the walk-ins
  off the service passage.
- New papers in `content/notes.ts`: `sealed` (the incident report in records) and `orders` (Maintenance's work orders).
  The arrival hall's board is `ARRIVAL` in `content/exhibit.ts`, drawn as the house's board (`render/exhibit.ts`). Their
  words, and the look texts on the new rooms, are placeholders for the owner.
- Saves are version 23 (`sim/save.ts`). Bump it, with a line in its list, whenever the level's doors change (a new door
  shifts the order every door after it is saved in).

## What was learned: the rules the layout keeps

- **The nav lattice is 1 m, its spots at x.5 and z.5.** A single door (1.2 m) must be centred within 0.3 m of a .5
  line, or no spot stands in its opening and the cast cannot use it (the chiller's door at 7.25 failed; at 7.4 it
  passes). Pairs and shutters are 2 m and more forgiving. The same holds for any gap: the opening in a cage, between
  props, round a table. A spot needs 0.3 m clear all round.
- **Stairs between floors** are a ramp under drawn steps, and the nav links spots a metre apart only if they differ by
  less than STEP_UP (0.5 m). So a 4.5 m rise wants 10 m of run: every stair on the level is 0.45 m a metre.
  `stairs()` makes the hole a room on the upper floor. The room under it on the lower floor wants `nolamp`, or its
  ceiling fittings hang over the hole (the placement test says so).
- **A door's frame runs past its opening.** The rooms either side must reach past it too, or the frame runs into rock
  (placement: "runs into a wall").
- **Props stand on the floor of the room they are in,** a sunken one too (`floorAt` adds the room's `dy`). A fitting must
  touch what holds it (a wall, a rail, the ceiling) by a hair, not stand a centimetre off it ("hangs in the air").
  Anything on a board must be within the board's edges ("off its edge").
- **Two rooms touching side by side are one space.** The meant contacts are listed in `test/contacts.test.ts`. Leave
  half a metre (a partition) or more between rooms that should be walled.
- **Zones.** A new room takes its alarm zone from the `ZONES` table at the end of `buildUpper`, or from `wing` in
  `buildHub`. A lockdown bolts the zone's doors that have power, and `test/eyes.test.ts` counts them. It also counts the
  ways into armed rooms ("the camera is the tell"): a new door into one must be in sight of its camera.
- **The tests can pass with a door blocked.** "Every room reachable" is satisfied if a room can be reached some other
  way. After adding any door, run the loops probe and check that the new link is listed:
  `LINKS=1 LEVEL=upper npx vitest run --config test/probes/vitest.config.ts loops`. It caught the pantry's cupboard
  standing in its door. The upper station has six loops now.
- **Listing the spots nobody can reach.** `test/cast.test.ts` ("reaches every room") gives only a count. To see where
  they are, drop a throwaway probe into `test/probes/` and delete it after:

      import { it } from 'vitest';
      import { field, openRules } from '../../src/world/nav';
      import { fresh } from '../kit';
      it('unreached', () => {
        const s = fresh(), nav = s.fields!.nav, b = s.player.body, d = field(nav, nav.locate(b.x, b.y, b.z), openRules(nav));
        d.forEach((v, i) => { if (v === Infinity) console.log(nav.x[i], nav.y[i], nav.z[i], s.world.rooms[nav.room[i]]?.name); });
      });

- **Keep calls off comment lines.** Screening's door to the nurses' station sat at the end of a `//` comment from the
  port to the metric kit until this branch, so screening and check-in were dead ends and nobody noticed.

## Seeing it

Headless Chromium, as the older handoff says: put the script below in your scratchpad, serve the game with
`npx vite --port 5173`, and run it with `NODE_PATH=$(npm root -g) node look.cjs <out dir> <url> '<views>' [hold|torch]`.
The url is `http://localhost:5173/?dev&level=upper&power=full` (everything lit); `hold` presses U so the cast stand
still; `torch` turns your flashlight on. Each view is `{"n": name, "x", "y", "z", "yaw", "pitch"}`: y is the floor's
height (0 the ground floor, -4.5 the suite's level, 5 the second floor); yaw 0 looks north (-z), π/2 west, -π/2 east,
π south.

    const { chromium } = require('playwright');
    const OUT = process.argv[2], URL = process.argv[3], views = JSON.parse(process.argv[4]), extra = process.argv[5] || '';
    (async () => {
      const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
      const p = await b.newPage({ viewport: { width: 960, height: 540 } });
      await p.goto(URL); await p.waitForFunction(() => window.rs?.sim, null, { timeout: 60000 });
      await p.waitForSelector('[data-go="new"]', { timeout: 60000 }).then(e => e.click()).catch(() => {});
      await p.waitForTimeout(1500);
      if (extra === 'hold') { await p.keyboard.press('KeyU'); await p.waitForTimeout(300); }
      for (const v of views) {
        await p.evaluate(([v, extra]) => {
          const s = window.rs.sim, pl = s.player, bd = pl.body;
          bd.x = v.x; bd.z = v.z; bd.y = v.y; bd.vx = bd.vz = bd.vy = 0; bd.sync?.();
          pl.yaw = v.yaw; pl.pitch = v.pitch ?? 0; pl.fly = false;
          if (extra === 'torch') { s.game.light = 'flash'; s.game.lightOn = true; s.game.batt = 100; }
        }, [v, extra]);
        await p.waitForTimeout(2500);
        await p.screenshot({ path: `${OUT}/${v.n}.png`, timeout: 180000 });
      }
      await b.close();
    })();

SwiftShader takes 30 to 60 s a frame. Run it in the background, six frames or fewer a run: the container restarted once
in the middle of a longer one, so commit before shooting. The first frame often comes out black, or under the title
menu, so shoot a warm-up frame first. Stop the dev server when done.

A plan of a level is the quickest way to see where there is room to grow: dump `levelDef(STATION, 'upper').rooms` (name,
x0 to x1, z0 to z1, y0, ht) from a throwaway probe and draw each floor. The annotated plan the list was worked out on
was made that way (not kept).

## Asks for this step

- Per room: `npm run check`, look at it in the built game, write a **Built:** note into its world.md entry and move the
  order line on, commit with a prose body saying why, push. One commit a room.
- Keep new rooms in the finish of their route (world.md §1, *Finish by route*) and on the power and zone of the rooms
  round them, unless the owner says otherwise.
- No new threats in the reworks: new rooms get evidence of the 500, not monsters (world.md §1, *More station, not more
  monsters*).

---

# The previous handoff: Security, second pass

For whoever picks this up in a new session. The design was settled in conversation and written into `docs/world.md`; this
is the map from it to the code, and the order to build it in. The previous handoff (bodies with physics) is kept at the
end: its asks, tools and open items still stand.

## The design, and where it is

All in `docs/world.md`. Read these first, in this order:

- §8, *Security*, **The second pass**: what goes (the overseer, the hand, the knock, the bolts, and their names), the
  cameras that guard armed places (not speed), running heard, the alarm answered in a hurry (alarm fatigue dropped), the
  lobby (a grand stair down from the checkpoint), one control room (the operations room, beside the head end on
  critical power; cameras on their branches' comms cupboards; spot monitors in the booth and the duty office), the
  camera wall in the operations room, the changed (intelligent but sedated; the plant growing
  out of them), one tool per room, the night round, the vaccinator, power on or off, flickering as a trope, the big dark
  section, call points, lockdown, load on the backup set, no alarm on the way out.
- §8, **The opening**: the six beats, from the IV pump's alarm to the fail-safe release.
- §3, *Who you are* and *The timeline*: sedated weeks on a false alarm; you start clean; the cut now happens at the start.
- §8, **Cargo, made larger**, and **Production** (later steps; not this one).
- §4, *Time and sleep* and *The water*; §10, *The sleepless* (later; not this one).

The old Security text in §8 is marked superseded but kept, because it describes what is built. When a piece is rebuilt,
rewrite or remove the old text for it in the same PR.

## The order (proposed; put it to the owner if it should change)

Each step its own PR, playable on its own.

1. **Take out the overseer and the hand.** Their cast entries, models, the knock, the bolts, the overseer's own sight
   and seat, `manned()`, their saves and tests. The level must still play and finish without them (the progression
   checker says so). The operations room stays a room for now (§8: its new answer is open).
2. **Cameras that guard places.** Lockdown arms restricted places; a camera on one takes you moving at any pace, and
   elsewhere only records; the changed keep out of them. Shown by floor paint and signs. Speed moves to the ears (tune
   the running noise). Take out alarm fatigue: every one in earshot hurries to the speaker, faster when it sees another
   hurrying. Then lockdown in place of the bolts (an alarm seals that zone's powered doors, heard
   and seen) and break-glass call points.
3. **The lobby, and the screens.** A re-layout, so before the steps that place things in the wing: the grand lobby
   between the shaft and the wing (about 40 by 30 m, 12 to 14 m tall), the wing and everything east of it pushed east.
   The surface cage lands on the second floor (+5), its hallway runs to the checkpoint, and the checkpoint opens onto
   the head of the grand stair; the hoist stays at the ground-floor shaft station with the hazard store. The statue, the
   lounge, the bar, the luminous ceiling; all on SEC, dark until the mend. The progression checker must still pass both
   routes. Then the first screens: the checkpoint booth shows the lobby, the shaft's landings and the checkpoint (on SEC,
   so it wakes with the mend), which is the camera-viewing mechanic the operations room's wall later grows from. The
   wing's control room becomes the briefing room in the same pass (its 33 screens go). The owner will playtest the way
   in from above.
4. **The changed.** Rename the husk's role in the text and the UI (no "husk" said in the game); then the intelligence:
   they notice a thrown breaker and come to look for who threw it, notice a door left open, and use cards. Slow and
   readable throughout. Their look (tobacco leaf in shelves out of neck and shoulders) is a model job; ask before
   spending long on it.
5. **The night round.** One of the changed walking a round with a flashlight that lights what it points at (so cameras see
   you in its beam), carrying a card you can take.
6. **The opening.** The suite on a night setting; the IV pump; the other patient (awake, tally marks, banging); the night
   round brought by the noise, trying each door with its card (reader beeps), the medical hold on yours, the scene
   started when you first look out (a timer behind it); the survivors' cut a minute on; the fail-safe release into
   emergency light. Moves the cut from before the game into it.
7. **The vaccinator**, then the big dark section and the one-tool-per-room ordering of the level, then load on the backup
   set. Then Cargo as an L.

## Where things are now

Step 2's first half is done: cameras guard the armed rooms they hang in (`RoomDef.armed`, `Cam.guard`, `EYES.still`;
the rest only record), the way into each was marked (red door signs and hazard paint; since taken out, the camera in view
from each way in being the tell),
the cast keep armed rooms out of their rounds, alarm fatigue is out, and every husk in earshot hurries to the speaker,
faster with another in sight hurrying (`ANSWER` in `sim/cast/husk.ts`). Running noise is left as it is until played.
Lockdown is done too: rooms carry their alarm zone (`RoomDef.zone`, set from a table at the end of `buildUpper`), and
each klaxon round bolts the zone's doors that have power to move (`Door.down`, `Door.drawing`, `LOCKDOWN` in
`sim/eyes.ts`), with the old bolt sounds and a red lamp over the door. And the call points, one a zone (`callPoint`, a
use of kind `call`). Step 2 is done.

Step 3's first half is done: the lobby (world.md §8, *The lobby*, *Where it goes*, for what was built and why the wing
did not move), the second-floor checkpoint and surface landing, the surface cage moved up to +5, Goods inward for the
hoist, and `grandStair` (`content/build/furnish.ts`). The booth's screens are done too: a console (`monitors`, a use of
kind `watch`), `Sim.watch` and `watching` in `sim/eyes.ts`, and the view in `present/ui/feed.ts`; the four cameras it shows
are named (`CameraDef.name`). The wing's control room is the briefing room now, and the duty office's screen (a
console with a sequencer, `dwell`) is done. Step 3 is done.

Step 4 has begun: Security's staff carry their cards (`Mutant.cards`, set from `LevelDef.cards` and the room they start in;
`carded` and the 'staff' rules in `sim/fields.ts`; `Door.pass` in `sim/movers.ts`; tests in `test/changed.test.ts`). The
code keeps the name `husk`; the dev tools say "changed". The breaker is searched for (the 'search' state and `SEARCH` in
`sim/cast/husk.ts`). A door left open is noticed and shut (the 'shut' state, `LEFT`, `Mutant.door`). Their look is done
too (`changed()` in `render/castView.ts`, for a husk with `cards`; the leaf from `shelf()` in `render/castKit.ts`, each
cluster merged into one mesh by `merged()`, so one draw call). Step 4 is done.
The camera wall waits on a way into the operations room.

Step 5 has begun: the night round walks (`nightround` in `MT`, `sim/cast.ts`; the 'round' state, `walkRound`,
`ROUND` in `sim/cast/round.ts`; its stops are `RoundStop`s, given to `mut()` as `round` on any deck). Its flashlight is a loose light like one
lying on (`torchRay`, put among `looseLights` in `sim/sim.ts`), so it lights you for it and for the cameras by the same
`vis`; what a beam throws back is made again only once it has moved a quarter metre or turned (`DRIFT` in
`world/light.ts`). At a stop with `tries` it shows the reader its card (`tryDoor`): `Door.beep` and `beepOk` show green
or red on the reader (`render/things.ts`). Drawn on the husk's model with the flashlight in its left hand
(`render/castView.ts`). Tests: `test/nightround.test.ts`. Save version 7. What step 5 still lacks is its card for you
to take (talk it through with the owner first).

Step 6 is done: the opening (world.md §8, *The opening*, **Built**, for what plays and where it differs from the beats).
`sim/opening.ts` times it (`Opening`, `OPENING`: the look out, the cut after the night round has gone, the pump, being
weak); a new game only (`SimOpts.opening`, `makeRun`'s `opening`, set in `main.ts` unless `?level=`). The rest is rules,
general, in their places: fail-safe locks (`DoorDef.failsafe`, `failSafe` in `sim/movers.ts`, also at `makeSim`);
emergency cells (`RoomDef.batt`, in `roomLight`); a round's stops that want a circuit live, come once, or take the other
patient (`RoundStop.need`, `once`, `take`); a sound made somewhere else drawing the cast (`noiseAt`); the night round coming to
the glass to look in when it cannot reach you (the 'peer' state, `PEER`, `reaches`, `glassSpot`); the other patient (`MT.patient`,
`patient()`, its model and skeleton). `mut()` takes places on other decks in its options (`TStop`; `at` for where it
stands). Save version 8. Tests: `test/opening.test.ts`. Found on the way: the operations room was a round's destination
(lit, grown shut, reached only up the armed stair); it is `noroam` now.

The opening's second pass, after the owner played it (world.md §8, *The opening*, **Built**): the suite laid out again
(the hall 14 m wide; rooms 3 and 4, empty, in sight of your window); the trigger is standing at your door or window
(`atDoor`, `OPENING.near`, `dwell`); the other patient warns you (states 'bang', 'warn', 'dark', 'hide' in `patient()`;
`noiseAt` says when its noise has roused the night round, which looks toward it `ROUND.roused` before it comes); the
night round touches them limp and drags them (`take`, `dragged`, `drop`, `Mutant.drag`; the loose body's `limp` and `pin`
in `sim/ragdoll.ts`); green rooms are looked into (`RoundStop.look`), and the suite is walked faster (`RoundStop.pace`);
the cut 10 s after it reaches the stair's top, then black for `OPENING.black` before the cells (their own supply,
`CELLS`, watching `SEC`: `Batt`). Light switches: `use` of kind `switch`, on rooms' own circuits (`ISO1`, `ISO2`).
The timeline is a week, not weeks (world.md §3), and Security fell to a late child of Pia (§2).

The third pass, in the dark (world.md §8, *The opening*, **Built**): the cut is days old (SEC broken from the start); the
suite runs on its own failing set, `ISO` (`back` set by `makeOpening`, dropped by `fail()` in `sim/opening.ts`, with a
`winddown`), its rooms flickering (`flick`), its locks, readers and pumps on it, and the cells watching it. The medical
hold, `GONE`, the light switches and the patient's 'dark' state are gone; every isolation door is on a guard's card. The
night round strikes the other patient twice before it takes them (`BEAT`; a blow at another of the cast, `Blow.at`;
`beaten()` leaves blood, `Sim.pools`, saved, drawn in `castView.ts`), sweeps each room it opens from the doorway
(`ROUND.into`), and in the opening takes you if it gets to you (`takesYou`: `end()`, game over). Card-carriers after you
now come through the card doors between (`staffField` in `sim/fields.ts`, a cache, so not saved), and nobody walks
straight at you through glass (`chase`). Your washroom's door is a hand-slid one (on the dead `SEC`), so it stays shut
behind you. Room 4 is walled off from the bay. Save version 10.

The fourth pass, the graft (world.md §8, *The opening*, **Built**): the other patient is struck out cold (`take`,
`slack`), dragged into the hall by the ankle, heavy rather than flailing (`RAG.slack`, and a limp body is not drawn
after its feet), leaving smears (`Sim.pools` kind `smear`), and grafted at a round stop (`RoundStop.graft`: `graftHere`,
`grafting`, `GRAFT`, the night round's `graft` timer, `stutters` for the view and the soundscape's hard flicker in
`present/flicker.ts`); then left out cold (patient state 'out', `lies`, `bleed`; `grafted`, drawn as a shelf of leaf
on the forearm, the gown streaked). The rooms are walked into and looked right round (`RoundStop.about`, `ROUND.about`);
a tries stop's `wait` is a pause before the card. Footprints through the new pools are the renderer's (`Prints.spilt`),
now foot-shaped; every pool is discs (`SPLAT` in `castView.ts`, `blood()` in `content/build/furnish.ts`). The take
respects god mode. Save version 11.

**On the back burner** (the owner set Security aside here; pick these up with them, not unasked):
- Step 7 above (the vaccinator, the big dark section, load on the backup set, Cargo as an L).
- How you get into the operations room, which the camera wall waits on. (world.md §8, *Security at the station's
  size*, 13, proposes one: the UPS room over the range, reached along the cable from the electrical room.)
- Call points as fire alarms instead (doors released, the changed sent to the muster hall), not lockdown: the owner's call.
  Releasing card doors would let you past the card progression, so it would want ordinary doors only.
- The `lockers` note (`content/notes.ts`) still describes the overseer ("it can see you… Screens off, it is blind"): lore
  for the owner to rewrite.
- The range's doorway steps 0.16 in light (`test/light.test.ts` samples around it by name).
- Playtest questions left open: whether lockdown should let the staff through; whether dark armed rooms, guarded mostly
  by your own flashlight, have teeth enough; the feeds' brightness at the start (`present/ui/feed.ts`); the running noise;
  the call points' size; the statue (a placeholder: the logo or a gardening motif later).

Step 1 is done: the overseer, the hand, the knock and the bolts are out of the code and of world.md §8 (old saves do not
load: save version 6). §10's lineage still names the overseer in three places (rules 1 and 8, *Security's first*): left
for the owner, since they are cosmology, not the level.

- `src/sim/eyes.ts`: cameras (`makeCams`, `camLive`, `camSees`), zones and speakers (`soundZone`, `heard`), alarms
  (`makeAlarm`, `restoreAlarms`), and `updateEyes`, which runs them. Tests: `test/eyes.test.ts`.
- `src/sim/cast.ts`: the cast. `Ai` and the kinds table near the top; its parts in `src/sim/cast/`. Answering an alarm
  (`answer`) and the power-failure drill (`drill`) are in `cast/husk.ts`. Tests: `test/cast.test.ts`.
- `src/sim/movers.ts`: doors (`locked`). `src/sim/interact.ts`: card readers and keypads (`doorLabel`, `doorAct`).
- `src/content/levels/upper.ts`: the level. The isolation suite is near the top (rooms round a common hall, the patient,
  the guard's dropped light); the start is `finishLevel` at the end (room 1, facing its door). The muster hall and the
  operations room (behind glass, its staff grown to its screens as dressing, its door grown shut) are in the middle; Cargo
  is `buildCargo`. Tests: `test/upper.test.ts`, `test/progress.test.ts` (the checker).
- `src/present/render/things.ts`: cameras and speakers drawn. `src/present/render/castView.ts`: models (`BUILD`, `ANIM`).
  `src/present/audio.ts`: the klaxon, the camera's servo.
- `src/sim/save.ts`: saves carry cameras, alarms and smashed speakers.

## Asks for this step

- Discussion first when something is not in world.md: the owner likes to talk a design through before it is built.
- Clarity over cleverness: power is on or off; every threat seen or heard before it lands, and with an answer.
- No new speech for the cast. No alarm on leaving the level.
- The combat asks below still hold (ask before anything that changes how combat plays).

---

# The previous handoff: bodies with physics

### Where it stands

- Merged: corpses loose (#68), corpses kept (#69), knockdowns loose (#70), muscle tone and corpse gravity (#71),
  reflexes (#72), stagger steps (#73).
- This branch (`claude/eager-fermi-bp97gu`, its own PR): four things found playing. The chop's shove went sideways
  (combat.ts, `landOn`); the dead flew (ragdoll.ts, `loose`, `RAG.shove`); the dying worm swam (`writhe`); the
  floored husk spun on its feet (`stagger`'s upright hold); the grabber could only be hit at its head (combat.ts,
  `GRAB`). engine.md §6, *After play, as built*, has the numbers.

### The asks that stand

- `src/sim/` and `src/world/` never import three.js or touch the page; the sim runs headless (vitest).
- Determinism: seeded randomness only; two identical runs end identically. Saves are plain data (`sim/save.ts`; the
  ragdoll's `Rag` is plain numbers). The world is rebuilt from the level, never saved. world.ts is the authority for
  characters, sight, sound, pathfinding; the ragdoll asks it, never the other way.
- **Ask before anything that changes how combat plays**: damage, poise, knockdown thresholds, and (by extension)
  when and where a blow lands. Tuned by feel; the owner likes where they are.
- `npm run check` (types and tests) before every push. Headless tests for anything new. Look at it in the built
  game with headless Chromium. House style: comments and docs in clipped prose in the game's register; constants in
  tables, each with a comment. Commit: a short title, a prose body saying why. A PR per step: what changed, what was
  measured, what is not built. Record what was built and measured, and what was tried and set aside, in engine.md §6.

### Where things are

- `src/sim/ragdoll.ts`: all of it. `SKEL` (each kind's points, rigid cluster, sticks, joint limits, hinges, tone,
  hands, legs), `RAG` (the solver and how blows land on a body), `REFLEX`, `STAGGER`. `makeRag`/`loose` turn a body
  loose with the blow in it; `updateCorpses` steps them all (budget 16 awake, asleep costs nothing); `begin` and
  `finish` are the two halves of a step; `knockRag` is a blow on one already loose.
- `src/sim/cast/blows.ts`: `hitMutant` (the shove, the kill, the knockdown), `floored`, `kill`.
- `src/sim/combat.ts`: your blows. `sweep` traces the swing (`sim/sweep.ts`: `PATHS`, `ACTIVE`, `along`); `landOn`
  makes the hit (shove, its way, `Hit.at`, `Hit.way`); `knock` is a swing through a corpse; `fire` the guns.
- `src/present/render/rig.ts`: draws a loose body with the model's own boxes (`RIG` per model), blends in and out.
- `src/present/render/castView.ts`: the models (`BUILD`, `ANIM`); the husk's and thresher's legs have knees for it.

### How to see what it does

- In the game: `npm run dev`, then `/?dev&level=testbed`, north into the arena. Keys 1 to 6 put down the cast, 0
  kills them all (again: clears the dead), T slow motion, Y your weapon, U freezes them, O the colliders. The hit log
  is in the dev readout. `window.rs` is the run: `rs.sim`, `rs.step(rs.run, input)`.
- Headless numbers: `test/probes/` (README there). `aim`, `kill`, `down`, each with knobs. Every fault in this
  branch was found by one of these first; looking at the game said only "it looks wrong".
- Headless Chromium (Playwright is preinstalled, not a dependency): put `playwright-core` in a scratch folder
  (`npm i playwright-core`), serve with `npx vite --port 5173`, and drive it:

      const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
        args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
      const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
      page.on('pageerror', e => errors.push(String(e)));
      await page.goto('http://localhost:5173/?dev&level=testbed');
      await page.waitForFunction(() => window.rs?.sim);
      await page.click('[data-go="new"]').catch(() => {});
      // T twice, then step it by hand from page.evaluate: import('/src/sim/input.ts') for noInput,
      // import('/src/sim/cast.ts') for spawn and hitMutant, rs.step(rs.run, { ...noInput(), attack: true })

  One 404 on load is the favicon, and is not a page error.

### Open

1. **The axe's aim** (asked about, not changed). The owner: "you'd think to just place the crosshair and swing; it
   doesn't land where you'd expect". Measured (`aim` probe): a chop meets the first thing its arc comes down on, so
   on anything tall it lands 22 to 43° above the crosshair wherever you aim (the top of a husk's head, from 1 m); on
   low things within 12°. Its reach is a radius from your eye (axe 1.7 m, more looking down), and nothing 2.5 m off is
   reached. Ways to go, each a change to how combat plays, so put to the owner first:
   - start the chop's arc lower (`PATHS.chop.from` 50° to 25°, say), so it lands nearer the crosshair, and a little
     later (by up to 0.1 s on a husk close by), and reaches less above you;
   - have the one under the crosshair met where the arc crosses the crosshair, the arc catching only others first;
   - leave it, and draw where it will land (the dev overlay already draws the path: `sweepPath`).
   The sideways shove (fixed here) will have made it feel worse than it is: try it again first.
   **Decided** (the owner): the chop is left as it is. Swings can be sent another way now, by the keys held as you
   press (engine.md §6, *Which way a swing goes, as built*): the axe swung across meets a tall thing at the crosshair.
2. **The overseer's hit volume** is the grabber's old head ball, 2 m up, above a mound 1.6 m high. Probably the same
   fault; not reported, so not touched.
3. **Knockdowns still turn some**: 118° in all while down across eighteen floorings, most of it lying and rolling
   after it is down; worst 208°. If it still reads as a trip, look at `RAG.local` and `RAG.tip` for the living (each
   alone made little difference to the spin, but that was with the spin's real cause in) and the brace.
4. **The stagger is fragile.** When a floored body goes down swings with small changes (engine.md, *Stagger steps*:
   "fragile"). The test for it allows the thresher's steps only 0.1 s over none (0.77 s against 0.62).
5. Not built, and never asked for: a reel that stumbles (a reel is the model's animation); corpses that block.

### What was learned

- Measure before touching: each fault here had an obvious suspect that was not it. The spin was not the local
  impulse, the tip, the anchor, or the steps (each off alone, it still spun); it was a pull on three of a rigid body's
  six points. Turn things off one at a time with `SET=`, and trace one case step by step (`TRACE=1`).
- Anything pulled on part of a rigid cluster turns the cluster. Pull all of it, or a point that is not in one.
- A wave along a body on a floor with friction is locomotion.
- Normalising a sum of two units can amplify rounding into a direction. Weight by what each is worth before adding.
- The fight's numbers (shove, poise, closing) are tuned for the living, on a cylinder with strong friction. A loose
  body given the same is a lighter, slipperier thing: give it its own share, and cap it.
- Tests that stood for a feel ("the axe carries it further than the baton") turn out to stand for a fault later.
  Write what it should look like, and check it against the owner's words.
