// creatures_defs.js — species stats and where they spawn. This is the file to edit for ecology changes.
// v11.55 (COMBAT.md): there are no hit points. hp keeps two meanings only — ≤1 is forage (dies at the touch), ≥1e8 is immortal (takes no wound);
// v11.100 (the person, 11 Nov 2026): the veil, the tread and the great age and die like the rest (they were immortal; DEEP §4: a veil's
// fall is the one the deep was written for) — their hp is now an ordinary mortal's, meaning nothing but that;
// any other value is nothing. dmg is a bite's size for the blood and the debris. venom {kind: 'paralyse' (t seconds, against: clades) | 'sting'}
// is the clade's chemistry (§3b): the lurker's beak paralyses, the basker's and the grazer's spines sting whatever clamps them. immune: the
// abyssal eats combs that fed at the chemocline without sickening (v11.56; the garter snake's answer to the newt — its comb was its whole diet; v11.227 adds the hoop and the ortho).
// roles: boid (a loose ribbon: flickers, darters) hunter (chases prey) graze ambush (sits, lunges; hang: from up in the structure)
// trap (sits, strikes) watch (the curious one) coil drift wander. legs: can move out of the water (walks); everything else is a
// swimmer and flops when beached. size: rough half-length, used for collision, LOD and floor clearance (clear overrides the
// clearance: a buried trap sits low). reach is centre-to-centre: how far an animal can bite. Since v11.31.1 the bite test floors it
// at the two bodies' own contact distance (creatures_ai.js reachOf, BITE_M), so a reach shorter than the biter's nose plus the
// prey's body no longer means it can never bite what is in front of it — 45 of the 58 predator/prey pairs here are such a pair.
// v11.71 (the person, 21 Sep 2026: "a universal logic of how fast an animal moves based on its size and mass and such"): no row carries a speed, an
// accel or a turn — defPhysics below reads them off the build (creatures_spec.js derive) for every kind, as the player's are. What stays by hand is
// behaviour: pace (the share of its top speed an animal goes about at when nothing hunts it and it hunts nothing — a hunter's chase is its top speed,
// so a hunter has none; the filter feeders and the floor's grazers amble at a fifth), flee:true (it bolts, at its top speed), cruise, cruiseF, burst,
// detect. Still absolute, and the next candidates: lunge and strike.speed (a burst over the top speed).
// strike {tell, dur, speed, range}: the tell then the strike (creatures_ai.js); burst {on, off}: burst-and-coast; preyClade: the
// player is prey only as that clade; calm: ignores threats; deep: keeps below the chemocline; stand: the watcher's standoff.
// Two masses, and they are not the same number (v11.32). The cube of size was written six times between here,
// creatures_ai.js, combat.js and ecology.js, three of them floored at 0.6 and three not, which reads as drift and is not. bodyMass is the physical one —
// contact, the body push and a hold's struggle — floored so a flicker at 0.064 does not vanish against a ridge. bioMass is
// the biological one the allometry uses (a birth rate as mass^-0.25, a meal, a carcass's flesh), and flooring it would put
// a flicker's rate at half what test/census.js is drawn for. Same cube, different floors, named so nobody unifies them.
const BODY_MIN=0.6;
function bioMass(d){return d.size*d.size*d.size;}
function bodyMass(d){return Math.max(BODY_MIN,bioMass(d));}
// The swarm (v11.84, PLANKTON.md §10, pass 4): the grazers of the water column as one thing — a cloud 10–30 m across, a ledger record like any
// kind, with no body: no geometry (swarmBuild), no hit capsule (nothing bites it; the filter feeders eat it through, v11.85), no push (ghost). It is
// drawn by the marine snow (atmosphere.js: a block of the snow's own points rides each swarm near the camera, in its pigment kind's colour), and
// its day is §5's: down to 300–500 m by day (the floor if that comes first), up into the top 50 m at dusk, held deeper under a bright moon
// (swarmDepth). Its capacity is the crop's (SPAWN `crop`: the lit standing stock through cropK), so the swarms are where the water is fed —
// the ring, the flank, the lee — and its rate is a grazer's (r, cycle set by hand: bioMass from size 6 would make it breed like a ridge).
function swarmBuild(){return {g:new THREE.Group(),anim:null,hit:[],rigs:[],cover:[],gape:0,pat:null};}
function cropK(C){return C/(C+0.5);} // the capacity's share at a lit crop C (mg/m³): half at 0.5 — island water; the basin's 0.06 gives a tenth
const DEFS={
  darter:{build:()=>compile(SPECS.darter),stock:8,size:0.6,pace:0.65,flee:true,hp:1,edible:true,food:14,role:'boid'},
  glim:{build:()=>compile(SPECS.glim),size:0.55,pace:0.6,flee:true,hp:1,edible:true,food:12,role:'boid'},
  arrow:{build:()=>compile(SPECS.arrow),size:1.0,hp:1,edible:true,food:24,role:'hunter',jetter:true,prey:['darter','flicker','scuttle','sifter'],detect:14,reach:0.9,dmg:0,biteCD:1,home:26,cruise:8,cruiseF:0.5,cool:2}, // jetter (v11.228): mantle-first with the arms trailing in the chase (PLANET, the jet pose) — only the player's line carried it
  grazer:{build:()=>compile(SPECS.grazer),stock:3,size:2.6,venom:{kind:'sting'},pace:0.55,flee:true,hp:70,role:'graze',home:32,floor:true}, // mortal since v11.26: the ridge's and the sickle's meal (it was 1e9 and every hunt ended bored)
  veil:{build:()=>compile(SPECS.veil),size:16,pace:0.19,hp:900,role:'wander',home:200,cruise:70,cruiseF:1},
  great:{build:()=>compile(SPECS.great),size:6,pace:0.14,ram:5,dmg:12,radius:9,reach:5.2,hp:600,role:'coil',home:45,cruise:10,cruiseF:1},
  ridge:{build:()=>compile(SPECS.ridge),size:9,hp:140,role:'hunter',prey:['player','grazer','picker','plough'],detect:46,reach:6.6,dmg:32,biteCD:1.5,home:240,cruise:60,cruiseF:0.4,cool:5},
  ortho:{build:()=>compile(SPECS.ortho),size:8,hp:90,role:'hunter',prey:['player','needle','darter','grazer','picker'],detect:40,reach:5.6,dmg:24,biteCD:1.2,home:220,cruise:70,cruiseF:0.4,cool:5},
  abyssal:{build:()=>compile(SPECS.abyssal),size:15,immune:true,hp:400,role:'hunter',prey:['player','comb','hoop','ortho'],cycle:10,detect:85,reach:10,dmg:55,biteCD:1.8,home:420,cruise:200,cruiseF:0.45,cool:6}, // v11.227: the ortho too — the comb and the hoop breed too slowly to feed it (the 90-day census: 392 → 73); an apex is a generalist, and the ortho shares its water (the sperm whale's giant squid)
  eel:{build:()=>compile(SPECS.eel),size:4,hp:55,role:'hunter',prey:['player','darter','flicker','sifter'],detect:17,reach:4.0,dmg:16,biteCD:1.1,home:40,cruise:14,cruiseF:0.35,cool:4},
  lurker:{build:()=>compile(SPECS.lurker),size:2.4,venom:{kind:'paralyse',t:7,against:{slowbloods:1,ringmouths:1}},hp:45,role:'ambush',prey:['player','darter','flicker','rasp','scuttle','needle','grazer','wedge','sifter'],radius:9,lunge:14,reach:3.2,dmg:20,lodNear:75},
  // drifters (DRIFTERS.md): no eyes, no hunting; they sting what touches them. surface: rides the wave (ys under the crest's origin)
  jelly:{build:()=>compile(SPECS.jelly),size:1.4,hp:1e9,role:'drift',reach:1.4,dmg:4,noOrient:true},
  deepbell:{build:()=>compile(SPECS.deepbell),size:4.5,hp:1e9,role:'drift',reach:4.2,dmg:8,noOrient:true,lodNear:90},
  sailer:{build:()=>compile(SPECS.sailer),size:1.8,hp:1e9,role:'sail',dmg:6,noOrient:true,surface:true,ys:-0.15,lines:0.9,lodNear:130},
  greatsailer:{build:()=>compile(SPECS.greatsailer),size:4.5,hp:1e9,role:'sail',dmg:10,noOrient:true,surface:true,ys:-0.3,lines:1.4,lodNear:230},
  // legs: walks on the strand and the sea floor alike; the only thing that is at home out of the water
  scuttle:{build:()=>compile(SPECS.scuttle),stock:4,size:0.7,pace:0.63,flee:true,hp:1,edible:true,food:10,role:'graze',home:18,floor:true,legs:true,cruiseF:0.5,scav:30},
  // The roster (PLANET.md), placed v10.7: size is the roster's half-length in metres; the stats are first guesses, tuned from what the
  // person sees. No temperature model yet (the basker is quick everywhere; PLANET Hooks), no moulting, no detection modes.
  rasp:{build:()=>compile(SPECS.rasp),stock:8,size:0.5,pace:0.22,flee:true,hp:1,edible:true,food:8,role:'graze',home:10,floor:true,cruiseF:0.6,scav:12},
  watcher:{build:()=>compile(SPECS.watcher),size:1.8,pace:0.43,hp:1e9,role:'watch',home:30,floor:true,detect:26,stand:6,cruiseF:0.4,scav:50},
  pall:{build:()=>compile(SPECS.pall),size:9,pace:0.15,hp:1e9,role:'wander',home:160,cruise:60,cruiseF:0.8,deep:true,lodNear:110},
  needle:{build:()=>compile(SPECS.needle),size:0.9,pace:0.87,flee:true,hp:1,edible:true,food:16,role:'hunter',prey:['flicker','darter','sifter'],detect:12,reach:1.2,dmg:0,biteCD:1,home:24,cruise:6,cruiseF:0.5,cool:2},
  basker:{build:()=>compile(SPECS.basker),size:5,venom:{kind:'sting'},hp:120,role:'hunter',prey:['player','picker','grazer','needle','cinder'],detect:32,reach:4.6,dmg:22,biteCD:1.4,home:70,cruise:25,cruiseF:0.4,cool:5},
  stone:{build:()=>compile(SPECS.stone),size:3,hp:200,role:'trap',prey:['player','picker','rasp','grazer','plough'],cycle:5,detect:2.8,reach:3.0,dmg:22,strike:{tell:0.15,dur:0.35},cool:2.5,floor:true,clear:0.8},
  crusher:{build:()=>compile(SPECS.crusher),size:4,hp:110,role:'hunter',prey:['rasp','scuttle','player','wedge'],preyClade:'coil',scav:40,detect:24,reach:4.2,dmg:28,biteCD:1.5,strike:{tell:0.3,dur:0.35,speed:9,range:1.7},home:50,cruise:14,cruiseF:0.4,cool:4},
  trap:{build:()=>compile(SPECS.trap),size:2,hp:60,role:'trap',prey:['player','flicker','needle','darter','scuttle','sifter'],detect:4.5,reach:3.3,dmg:24,strike:{tell:0.35,dur:0.3},cool:3,floor:true,clear:0.45},
  plumb:{build:()=>compile(SPECS.plumb),size:11,hp:120,role:'ambush',upright:true,station:['wall','lee'],below:0.5,prey:['player','darter','needle','arrow','flicker','sifter','hose','eel','watcher','grazer'],radius:22,lunge:8,reach:6.5,dmg:26,clear:11}, // v11.223 (CLADES, The radiation): hangs shell-up at a wall in still water (station), strikes only down (below), rides the swarm's layer (creatures_ai.js updatePlumb); clear: its arms' tips under its origin
  quill:{build:()=>compile(SPECS.quill),size:1.8,hp:30,role:'ambush',upright:true,station:['canopy'],canopy:[2,9],below:0.5,prey:['darter','flicker','needle'],radius:7,lunge:5,reach:1.2,dmg:6,clear:1.9}, // v11.227: the plumb's small line in the weed (CLADES, The radiation): hangs among the stalks (canopy: its height over the floor, a band, each its own), drops on the small
  hoop:{build:()=>compile(SPECS.hoop),size:8,pace:0.22,hp:500,role:'wander',gape:true,home:220,cruise:60,cruiseF:0.9,lodNear:110}, // v11.227: the filter giant — gape: its mouth's ring held open while it sieves (creatures_ai.js filterSeek); the abyssal's prey
  hook:{build:()=>compile(SPECS.hook),size:2.5,hp:50,role:'ambush',prey:['player','flicker','darter','needle'],hang:true,radius:11,lunge:11,reach:2.8,dmg:18},
  tread:{build:()=>compile(SPECS.tread),size:7,pace:0.17,hp:800,role:'graze',calm:true,home:90,floor:true,legs:true,cruiseF:1},
  picker:{build:()=>compile(SPECS.picker),stock:3,size:1.5,pace:0.62,flee:true,hp:1,edible:true,food:10,role:'graze',home:40,floor:true,legs:true,cruiseF:0.6,scav:90},
  flicker:{build:()=>compile(SPECS.flicker),stock:8,size:0.4,pace:0.51,flee:true,hp:1,edible:true,food:6,role:'boid'},
  hose:{build:()=>compile(SPECS.hose),size:1.5,hp:30,role:'hunter',prey:['flicker','darter'],detect:14,reach:2.2,dmg:0,biteCD:1.2,strike:{tell:0.25,dur:0.25,speed:9,range:1.8},burst:{on:0.45,off:0.9},home:30,cruise:10,cruiseF:0.5,cool:2},
  sickle:{build:()=>compile(SPECS.sickle),size:5,hp:150,role:'hunter',prey:['player','needle','grazer'],detect:42,reach:6.4,dmg:30,biteCD:1.8,strike:{tell:0.5,dur:0.4,speed:17,range:2.0},burst:{on:0.7,off:1.5},home:200,cruise:50,cruiseF:0.4,cool:5},
  // the raptor family's other looks (v11.9.1), placed v11.66 (the person's default: all five looks live, one each, where the build says). COMBAT.md §7's
  // finding — the hood's, lash's and ram's claws get through neither the grazer's nor the finback's hide — is answered by prey they can open: the forage
  // (dies at the touch), the ringmouths' skin, and any hingeshell at its moult (creatures_ai.js MOULT: a soft body is prey to whatever is big enough).
  // v11.10: every species whose build is compile(SPECS.x) is a spec (creatures_spec.js); the lab (#lab) edits them. A hand builder is a species without one.
  swarm:{build:swarmBuild,size:6,hp:1e9,edible:true,role:'swarm',ghost:true,noOrient:true,r:0.5,cycle:2,home:90,cruiseF:1,lodNear:10}, // v11.84: see above; size is the cloud's half-width. v11.85: edible — mortal on the ledger, the filter feeders' prey (ecoOf); still no capsule, so no bite ever lands on it: it is eaten through (creatures_ai.js filterIntake), and its biomass (bioMass: 216 t, a dense krill swarm's) is c.flesh
  hood:{build:()=>compile(SPECS.hood),size:2,hp:60,role:'hunter',prey:['player','flicker','darter','needle','scuttle','rasp','sifter','arrow'],detect:24,reach:4.6,dmg:18,biteCD:1.4,strike:{tell:0.35,dur:0.35,speed:12,range:1.8},burst:{on:0.5,off:1.1},home:50,cruise:16,cruiseF:0.4,cool:4}, // v11.83.1 (the person, 22 Sep): a player-sized hunter of the sand flats and the lagoon floor, the look kept at 0.42 of its build — the claws take the small prey, and you; to v11.83 it was the ambusher from under the sand (size 5, buried, a lunge like the lurker's)
  lash:{build:()=>compile(SPECS.lash),size:3,hp:90,role:'hunter',prey:['player','needle','darter','flicker','arrow','rasp','sifter'],detect:30,reach:5.0,dmg:20,biteCD:1.5,strike:{tell:0.4,dur:0.35,speed:17,range:2.0},burst:{on:0.6,off:1.2},home:60,cruise:20,cruiseF:0.4,cool:4}, // on the ledges, whips out
  ram:{build:()=>compile(SPECS.ram),size:4,hp:200,role:'hunter',prey:['sifter','flicker','darter','arrow'],detect:38,reach:5.5,dmg:34,biteCD:2.0,strike:{tell:0.6,dur:0.5,speed:14,range:2.4},burst:{on:0.8,off:2.0},home:180,cruise:45,cruiseF:0.4,cool:6}, // slow and big in the open water over the flank: its blow stuns a shoal (combat.js RAM), never the player's hunter
  comb:{build:()=>compile(SPECS.comb),size:7,pace:0.14,hp:260,role:'wander',burst:{on:1.4,off:3},home:180,cruise:60,cruiseF:1},
  // v11.66, the variety pass: five forms by mechanism (creatures_spec.js SPECS; PLANET roster)
  sifter:{build:()=>compile(SPECS.sifter),stock:6,size:0.6,pace:0.53,flee:true,hp:1,edible:true,food:8,role:'boid',mid:true}, // mid (v11.66): a swarmer of the water column, its ribbons wander at their own depth, not over the floor
  cinder:{build:()=>compile(SPECS.cinder),stock:3,size:1.2,pace:0.58,flee:true,hp:1,edible:true,food:10,role:'graze',home:30,floor:true,legs:true,cruiseF:0.6,scav:60,clear:0.55},
  wedge:{build:()=>compile(SPECS.wedge),stock:4,size:0.9,pace:0.58,flee:true,hp:1,edible:true,food:10,role:'graze',home:14,floor:true,legs:true,cruiseF:0.5,scav:20},
  plough:{build:()=>compile(SPECS.plough),stock:2,size:1.6,pace:0.6,flee:true,hp:60,role:'graze',home:40,floor:true,legs:true,cruiseF:0.6,clear:0.62},
  relict:{build:()=>compile(SPECS.relict),size:4,hp:120,role:'hunter',prey:['picker'],detect:22,reach:5.7,dmg:14,biteCD:1.5,strike:{tell:0.5,dur:0.4,speed:7,range:1.8},burst:{on:0.9,off:2.5},home:120,cruise:30,cruiseF:0.4,cool:5}, // slow: a life below the light on a diet of pickers
  // The three players (v11.75): rows for the presets, which spawn nowhere (no SPAWN entry; role 'player' is dispatched by nothing). What a body carries
  // that is not physics — its venom, what it eats, how it behaves — comes from its species' row here, for the player (player.js playerClade) and for the
  // young of its line (line.js lineKind: the founder's row on the child's body), through founderDef below. The numbers are v11.69–74's line kind, so the
  // presets' young are what they were: hp 100 (a body that fights), the player's food (DESIGN The player), detect 10 + 5 × size, home 20 + 10 × size.
  // The coilshell's venom is COMBAT.md §3b's (player.js CLADE_PRESETS to v11.74)
  soft:{build:()=>compile(SPECS.soft),size:1.6,hp:100,role:'player',prey:['arrow','needle','scuttle'],detect:18,biteCD:1.2,home:36,cruiseF:0.45,cool:3},
  fin:{build:()=>compile(SPECS.fin),size:1.8,hp:100,role:'player',prey:['arrow','needle','scuttle'],detect:19,biteCD:1.2,home:38,cruiseF:0.45,cool:3},
  coil:{build:()=>compile(SPECS.coil),size:1.5,hp:100,role:'player',prey:['arrow','needle','scuttle'],detect:17.5,biteCD:1.2,home:35,cruiseF:0.45,cool:3,venom:{kind:'paralyse',t:5,against:{slowbloods:1,ringmouths:1}}}
};
// The founder's row (v11.75, LINEAGE §8.2's seam): a player's spec carries `founder`, the species id its line began from (menu.js founderClade; a
// child's spec inherits it through the editor at conception, which copies the parent's), and everything about the animal that the calculator does not
// give — venom, immunity, its prey, its role and behaviour — is read off DEFS[founder] and carried down the line unchanged. A spec without the key (a
// save from before v11.75) is its own id's row, or its id's root ('fin-3' → 'fin', the convention line.js conceiveClose names a child by), or the
// preset of its kind. This is the seam §8.2's derived DEFS replaces: when role, prey, reach and diet are inferred from the build, founderDef goes and
// lineKind reads the inference; until then a sickle's line eats what a sickle eats however its body is edited.
function founderOf(spec){if(!spec)return null;if(spec.founder&&DEFS[spec.founder])return spec.founder;if(spec.id){if(DEFS[spec.id])return spec.id;const r=String(spec.id).replace(/-d+$/,'');if(DEFS[r])return r;}return spec.clade==='ringmouths'?(spec.core&&spec.core.kind==='coilbody'?'coil':'soft'):'fin';}
function founderDef(spec){const k=founderOf(spec);return k?DEFS[k]:null;}
// The physics off the build (v11.71): top is derive's speed, speed is what the AI has always read (top × pace), flee the top speed where a kind bolts,
// turn and accel derive's. A kind made later (the lab's, the line's young) goes through the same function. accel reaches the AI through seek
// (creatures_ai.js ACC_REF): a heavy body closes on the speed it wants more slowly than a light one.
function defPhysics(d,spec){const st=derive(spec);d.top=st.speed;d.speed=+(st.speed*(d.pace||1)).toFixed(2);if(d.flee)d.flee=st.speed;d.turn=st.turn;d.accel=st.accel;d.filter=st.filter||0;d.sprint=st.burst||1;d.deepY=st.deepY;return d;} // sprint (v11.92): derive's burst over the top speed — the committed lunge's speed (creatures_ai.js) // v11.85: filter, the sieve's m² off the build — a kind with any is a filter feeder (ecology.js ecoOf puts the swarm on its prey; creatures_ai.js filterIntake feeds it) // deepY (v11.223): the deepest the body may be, derive's — a gas-chambered shell's DERIVE_K.chamberY; undefined for every other body (creatures_ai.js holds it there, findPrey looks no deeper)
for(const k in DEFS)if(SPECS[k])defPhysics(DEFS[k],SPECS[k]);
// ---------- the clock and the approach (v11.228; BEHAVIOUR.md §2, §3) ----------
// The person (24 Nov 2026): "Have creatures like the hovering plumb actually move, have a schedule, do things… predatory [animals] more complex than
// simply aggroing when hungry… animals within the ecology distinct based on behaviour." Habitat's third scale is the clock (CLADES, Habitat: three
// scales): when a kind is about, and what it does when it is not. act: [day, night, dusk(, tide)] — its activity in each part of the sim's day
// (creatures_ai.js CK: day and night by the sun's height, dusk the changeover between them, the sun within ~13° of the horizon either side; the three
// sum to one, so a kind's activity is their blend) and, fourth, the tide: +1 about only at high water, −1 only at low. A kind with no act is about at
// every hour — what lives below the light (the day does not reach it), what follows its food wherever it goes (the filter feeders, the ram on the
// sifters, the swarms) and what has no brain to keep hours with (the drifters). rest: what it does outside its hours — 'cover' against a rock,
// a stalk or a structure's foot (creatures_ai.js coverSpot; the open floor where there is none), 'floor' lying on the open floor, 'bury' sunk into the
// sand, 'hover' held in the water near home, 'slow' cruising on at a fraction of its pace (a body that cannot stop: a mixotherm's warm muscle, a big
// slowblood's ram-ventilation). The ambushers and the traps keep their posts; their hours move how hungry they must be to strike and how far they
// look. The schools settle (updateSchools). insp: how a hunter approaches prey that is watching it — 'circle' (a slowblood: the tightening ring of a
// shark at a seal), 'stand' (a ringmouth: held off at its standoff, facing, the ring's eyes on it, as the watcher stands), or none (a hingeshell: no
// pursuit and nothing to read between its strikes, PLANET; the ambushers). Earth is the reference for the hours: the reef's day shift (the
// herbivores, the planktivores' schools, the wrasse and the trigger that crush shells), its night shift (the moray, the octopus, the squid, the
// demersal plankton that rises out of the weed) and the changeover's hunters (the jacks, the grouper, the trumpetfish) — "Earth is reference, never template"
const BEHAVE={
  // ringmouths: high metabolism and the ring's eyes; the night is the cephalopods'
  arrow:{act:[0.15,0.9,1],rest:'hover',insp:'stand',eye:'night'}, // the squid's: in a loose hover by day, hunting the ribbons at dusk and through the night
  ortho:{act:[0.3,0.8,1],rest:'hover',insp:'stand'}, // the slope's spear: about at dusk and in the dark, held in the current by day
  great:{act:[0.8,0.3,0.6],rest:'hover'}, // the shelf's coil: by day; it holds still in the water at night
  plumb:{act:[0.4,1,1]}, // its post at the wall (HANG): the layer it eats comes up at night, and it drops readily then; by day only the hungry drop
  quill:{act:[1,0.3,0.6]}, // the lit weed's (the shrimpfish feeds by day among the spines)
  lurker:{act:[0.3,1,0.8],eye:'night'}, // the octopus's hours: the night
  watcher:{act:[1,0.15,0.6],rest:'cover'}, // curious by day; in a crevice at night
  rasp:{act:[0.3,1,0.7],rest:'cover',freeze:true}, // grazes the rock at night (the limpet's, the chiton's), clamped against it by day
  // slowbloods: the reef fish's shifts (the temperature model, PLANET Hooks, will move them by the water's warmth)
  darter:{act:[1,0.1,0.5]}, // a planktivore's school: up in the water by day, settled to the floor at night
  needle:{act:[0.6,0.1,1],rest:'hover',insp:'circle'}, // the trumpetfish's: the ribbons at dawn and dusk
  grazer:{act:[1,0.1,0.4],rest:'floor'}, // the herd crops by day and lies down on the sand at night
  ridge:{act:[0.35,0.6,1],rest:'slow',insp:'circle'}, // the changeover's hunter: a mixotherm that never stops swimming
  eel:{act:[0.15,1,0.8],rest:'cover',insp:'stand',eye:'night',lat:2.6}, // the moray's: in the rubble by day, out at night; it watches from its post rather than circling
  crusher:{act:[1,0.15,0.6],rest:'cover',insp:'circle'}, // the shell-crusher's (the triggerfish, the wrasse): by day, in a crevice at night
  basker:{rest:'slow',insp:'circle',eye:'deep'}, // the vents are dark and warm at every hour
  abyssal:{rest:'slow',insp:'circle',eye:'deep'}, // below the light
  // hingeshells: no pursuit, the strike; the night shift's walkers
  scuttle:{act:[0.2,1,0.6],rest:'bury',freeze:true}, // the ghost crab's: out at night, in the sand by day
  trap:{act:[0.4,1,0.8],eye:'night'}, // buried at every hour; it strikes readily at night
  hook:{act:[0.4,1,0.8],eye:'night'},
  flicker:{act:[0.2,1,0.7]}, // the demersal plankton's: in the weed by day, up in the water at night
  hose:{act:[0.2,1,0.8],rest:'cover',eye:'night'}, // after the flickers
  sickle:{act:[0.3,0.7,1],rest:'cover'}, // among the rockfall's blocks out of its hours
  hood:{act:[1,0.2,0.6],rest:'floor'}, // the sand flats' by day
  lash:{act:[0.3,1,0.8],rest:'cover',eye:'night'}, // the ledges at night
  wedge:{act:[1,1,1,1],rest:'cover',freeze:true}, // the surf zone's walker: about when the water is over it, clamped to the rock at low tide
  plough:{act:[0.3,1,0.6],rest:'bury',freeze:true}, // ploughs the flats at night, under the sand by day
  // v11.229, the senses (eye, lat, freeze; BEHAVIOUR §4): the deep's eyes, tuned to what light there is (DEEP, BIOLUM §2)
  relict:{eye:'deep'},picker:{eye:'deep'},pall:{eye:'deep'},veil:{eye:'deep'},cinder:{freeze:true}
};
// The senses (v11.229; BEHAVIOUR §4, pass 1; PLANET, Light, revised 17 Nov 2026, and the eyes by clade; the person, 24 Nov 2026, on sight by light — BIOLUM §7.6 —
// "Yes", for the creatures too). An eye is two numbers: log10 of the light, as a share of the surface's noon (world.js lightPhys), where it sees nothing and
// where it sees all it can — its reach between by a smooth step (creatures_ai.js sightOf). PLANET: big eyes see daylight to ~1e-10 of the surface's
// (−600 in the island's fed water), a full moon to half that depth, starlight to −100…−180. By clade: the ringmouths' (a ring of simple eyes and a
// predator's forward cluster: a cephalopod's eyes are among the best in the dim), the slowbloods' (two good eyes, a fish's), the hingeshells' (stalked
// compound eyes, duller in the dim); by kind (BEHAVE.eye): a night hunter's (the moray's, the squid's: wide pupils and a tapetum — the eyeshine PLANET
// allows is its reflection) and the deep's (tuned to its own lights). The drifters have none (DRIFTERS). lat: the lateral line's reach, × the body's own
// size, for a body moving at SENSE.lat's top (creatures_ai.js hearOf): the slowbloods' canals, the hingeshells' comb (the shield's sensing plates,
// PLANET), the ringmouths' epidermal lines (the cephalopods' analogue) — light-blind, and silent for a body that holds still. freeze: a cryptic grazer
// that holds still at a threat it can see coming and bolts only when it is close (a hingeshell clamps its valves: PLANET's "clamped shut when threatened")
const EYE_K={ring:[-10.5,-5.5],two:[-10,-6],stalk:[-9,-5],night:[-11,-7],deep:[-12,-8]};
const EYE_CLADE={ringmouths:'ring',slowbloods:'two',hingeshells:'stalk'},LAT_CLADE={ringmouths:1.3,slowbloods:2.0,hingeshells:1.6,drifters:0};
for(const k in DEFS){const d=DEFS[k],sp=SPECS[k],b=BEHAVE[k]||{};if(b.act!==undefined)d.act=b.act;if(b.rest!==undefined)d.rest=b.rest;if(b.insp!==undefined)d.insp=b.insp;if(!sp)continue;
  const e=b.eye||EYE_CLADE[sp.clade];d.eye=e?EYE_K[e]:undefined;d.lat=b.lat!==undefined?b.lat:LAT_CLADE[sp.clade]||0;d.freeze=b.freeze||undefined;}
// v11.149 (the creature performance pass): every def one shape. The rows above are each their own literal, and an individual's def was its kind's
// chained under a copy of its own size (creatures_ai.js scaledDef: Object.create) — 26 shapes among the forest's creatures, so every d.role, d.size,
// d.prey in the frame was a lookup by name. Now each row is remade with DEF_KEYS — every key any row, a line's young or a scaled copy carries, in one
// order, unset where it has none (undefined reads as a missing key did) — and scaledDef copies one flat (defFlat), its keys outside the list kept
// after them. No def is written after load, so a copy reads as the chain did. A new key on a row goes in DEF_KEYS, or that row is a shape of its own
const DEF_KEYS=(()=>{const K=new Set();for(const k in DEFS)for(const q in DEFS[k])K.add(q);for(const q of ['size','speed','top','flee','reach','dmg','radius','lunge','detect','clear','food','filter','juv','build','spec','line','lineId','legs','jetter','prey','deepY'])K.add(q);return [...K];})(),DEF_SET=new Set(DEF_KEYS);
const DEF_LIT=new Function('d','return {'+DEF_KEYS.map(k=>JSON.stringify(k)+':d['+JSON.stringify(k)+']').join(',')+'};'); // one object literal of every key: a def made key by key from a list is a dictionary (V8's slow mode past a dozen added keys), however few shapes
function defFlat(d){const o=DEF_LIT(d);for(const k in d)if(!DEF_SET.has(k))o[k]=d[k];return o;}
for(const k in DEFS)DEFS[k]=defFlat(DEFS[k]);
// The world's capacity (v11.26): n is the individuals per cell of a kind at full tolerance, scaled by the cell's mean tolerance for the
// envelope (ecology.js ecoCap; chunks.js cellW) — it is the carrying capacity K of the ledger, not a spawn count. The ledger runs at
// 60–90% of it where nothing eats a kind and lower where something does. grp: placed in groups of that many (packs of arrows,
// herds of grazers, threes of needles, ribbons of flickers and darters as boid schools); land: on the strand, by land area. The
// numbers are a trophic pyramid drawn for 12 km² of water: apex predators in single figures, mid predators in tens, forage in the
// thousands (test/census.js prints the totals and runs the ledger's model on paper; DESIGN, The ecology). Before v11.26 the
// world held 70 ridges and 64 orthos against 172 darters — a pyramid upside down, and every hunt ended bored.
// v11.66 (the hingeshell variety pass): the hingeshells' envelopes read the fields, not the depth alone — expo (the surf), rel (a ledge, a lip),
// shel (the lagoon), flow and nut (the fed, moving water a filter feeder or a swarm follows), young (the collapse's fresh rock), heat (the seeps),
// turb (a burrower wants the sand that stays), and grp where the animal swarms. The numbers were drawn against a per-region capacity table (the
// CHANGELOG's): the giant's shelf is ~30× ours, so every K here is mostly its; the young shield has no record in the world yet.
const SPAWN=[
  {kind:'flicker',grp:10,n:24,env:{h:[-62,-4]}}, // the floor of the food web, in loose ribbons
  {kind:'flicker',grp:10,n:16,env:{h:[-62,-4],nut:[0.45,1]}}, // and more where the water is fed (v11.66)
  {kind:'sifter',grp:8,n:16,env:{h:[-300,-30],nut:[0.5,1],flow:[0.3,1]}}, // v11.66: the water column over the upwelling — the fed, moving water a swarm of filter feeders lives in; the ram's meal
  {kind:'darter',grp:9,n:20,env:{h:[-45,-5]}}, // darter ribbons over the shallows
  {kind:'needle',grp:3,n:3.6,env:{h:[-45,-4]}}, // needles hunt the ribbons in threes
  {kind:'rasp',n:14,env:{h:[-40,-3],sub:[0.55,1]}}, // rasps graze the rock of the shallows and the reef's rim
  {kind:'trap',n:3.5,env:{h:[-40,-5],sub:[0,0.45],expo:[0,0.6]}}, // buried in the sand where the ribbons pass — sand the surf does not strip (v11.66)
  {kind:'plough',n:2,env:{h:[-80,-8],sub:[0,0.4]}}, // v11.66: the flats' deposit feeder, on the sand the grazers pasture, the lagoon's floor and the terraces' sand
  {kind:'hood',n:0.3,env:{h:[-60,-6],sub:[0,0.45]}}, // v11.66: over the sand flats (buried there to v11.83; a hunter since v11.83.1)
  {kind:'hood',n:0.4,env:{h:[-40,-4],shel:[0.5,1]}}, // and the lagoon's floor (v11.66)
  {kind:'hose',n:1.7,env:{h:[-62,-14],sub:[0.5,1],nut:[0.4,1],flow:[0.15,0.85]}}, // in the weed forests (the stipe's own band, v11.66), after the flickers
  {kind:'lash',n:0.3,env:{h:[-80,-8],sub:[0.5,1],rel:[0.6,1]}}, // v11.66: the ledges and the lips — rock that stands above its surroundings (rel is 0.5 on flat ground)
  {kind:'wedge',n:6,env:{h:[-12,2],expo:[0.5,1],sub:[0.55,1]}}, // v11.66: the surf zone's walker, on the rock the waves strike (the cones' and the lime rind's ground)
  {kind:'crusher',n:0.5,env:{h:[-50,-8],sub:[0.5,1]}}, // on rock, where the rasps are (to −50: a crusher at −150 had nothing to eat)
  {kind:'watcher',n:0.5,env:{h:[-150,-14],sub:[0.4,1]}}, // the weed, the bladders, the terraces
  {kind:'hook',n:0.55,env:{h:[-62,-14],sub:[0.5,1],nut:[0.4,1]}}, // hangs in the weed forests
  {kind:'hook',n:0.4,env:{h:[-250,-40],sub:[0.6,1]}}, // and off rock faces
  {kind:'sickle',n:0.25,env:{h:[-300,-60],young:[0.35,1],sub:[0.4,1]}}, // the rockfall: the collapse's fresh blocks (v11.66: by young, not depth)
  {kind:'sickle',n:0.2,env:{h:[-160,-60],sub:[0.6,1],young:[0,0.3]}}, // and the terraces' rock
  {kind:'ram',n:0.12,env:{h:[-300,-40],nut:[0.5,1]}}, // v11.66: the open water over the upwelling flank, where the sifters swarm
  {kind:'stone',n:0.6,env:{h:[-320,-60],sub:[0,0.6]}}, // the plain, the terraces' sand
  {kind:'tread',n:0.06,env:{h:[-320,-60],sub:[0,0.4]}}, // a few in the whole world, on the mud (v11.66: sub to 0.4)
  {kind:'comb',n:0.2,env:{h:[-320,-150],nut:[0.3,1]}}, // the plain, the lantern fields, where the water is fed (v11.66); the abyssal's meal
  {kind:'relict',n:0.12,env:{h:[-450,-280],sub:[0.55,1],young:[0,0.3]}}, // v11.66 (SEAFLOOR §3): bare rock below the light and off the fresh flows — the sill's drowned summits, swept clean by the current; nowhere else has it (v11.102: the sill gone, the model's seamounts' summits and the drowned atolls' walls, GLOBE §9.2; v11.107, the person: "increased a bit" — the reefs' limestone spurs below the light, world.js CARB: 81 on paper in the old square, 3 in v11.106)
  {kind:'basker',n:4,env:{heat:[0.3,1]}}, // the vents (one cell of them)
  {kind:'picker',n:3,env:{h:[-800,-300]}}, // the lower flank's mud down into the dark (v11.28: to -400 while the void stood; the dark inside the square is the pit and the corners now, and the stone's and basker's food went with it)
  {kind:'picker',n:12,env:{heat:[0.3,1]}}, // and at the vents, in a swarm, picking at the mats (Earth's vent shrimp swarms): the basker's food (20 before the cinder took its share, v11.66)
  {kind:'cinder',n:8,env:{heat:[0.06,1,0.03]}}, // v11.96: and the arm's seeps (world.js SEEP, heat 0.06-0.14: under the basker's reach — the kind's reservoir now the seep line is gone, DEEP §2; heat ≥ 0.25 to v11.95) // v11.66: the seep walker on the vent field's mats; the basker's other meal, and poison to eat (combat.js POISON) — the basker eats the field's down to a couple
  // v11.96 (DEEP §2): the seep line's row struck — round ours there is no chemocline for a seep line; it comes back about a basin's (DEEP §5).
  // To v11.95: {kind:'cinder',n:1.5,env:{h:[-470,-440]}}, // and thinly along the seep line at the chemocline round every island (the sulfide's other home; the greymat's upper edge), where nothing hunts it — the kind's reservoir (v11.66)
  {kind:'pall',n:0.4,env:{h:[-1200,-560],nut:[0.25,1]}}, // the oxygen minimum's core over the deep, where the island's food rains into it (v11.96, DEEP §2: the vampire-squid precedent; below the chemocline over the flank, h -800..-470, to v11.95) — 3,222 cells against 6,023
  {kind:'arrow',grp:5,n:3.75,env:{h:[-62,-5]}}, // arrow squid hunt the shallows and the shelf in packs
  {kind:'great',n:0.1,env:{h:[-150,-8]}},
  {kind:'jelly',n:2,env:{h:[-800,-15]}},
  {kind:'jelly',n:2,env:{h:[-800,-15],nut:[0.5,1]}}, // twice as many in fed water
  {kind:'deepbell',n:0.35,env:{h:[-800,-220]}}, // the giant of the drift, below the light
  {kind:'swarm',n:2.5,crop:true,env:{h:[-3000,-12]}}, // v11.84: the grazers' swarms, where the crop is (crop: the capacity × cropK of the lit standing stock, ecoCap)
  {kind:'sailer',n:0.15,env:{h:[-800,-60]}}, // the odd one on open water; the fleets are the canopy's (spawnChunkCreatures)
  {kind:'sailer',n:1.4,env:{h:[-70,-10],expo:[0.55,1]}}, // and driven in against the shore the wind strikes (Earth: an oceanic animal met on the beach after an onshore wind)
  {kind:'scuttle',n:6,env:{h:[-30,-3],sub:[0.4,1],expo:[0,0.7]}}, // out of the surf, which is the wedge's (v11.66)
  {kind:'scuttle',n:45,max:8,land:true,env:{h:[0.6,90]}}, // the strand's own population, by land area (was a rule of its own before v11.26)
  {kind:'eel',n:0.6,env:{h:[-62,-14],sub:[0.5,1],nut:[0.4,1]}}, // in the weed forests' cover
  {kind:'eel',n:0.5,env:{h:[-150,-5],sub:[0.5,0.85]}}, // and among the rubble
  {kind:'lurker',n:0.9,env:{h:[-300,-8],sub:[0.5,1]}}, // an ambusher needs rock to lie among
  {kind:'grazer',grp:5,n:10,env:{h:[-160,-6],sub:[0,0.5]}}, // the grazers on the sand pasture and the terraces' sand (PLANET: flats, bladders, terraces)
  {kind:'grazer',grp:5,n:6,env:{h:[-24,-6],sub:[0.5,1]}}, // and on the turf
  {kind:'ridge',n:0.2,env:{h:[-300,-40]}},
  {kind:'ortho',n:0.3,env:{h:[-800,-100],flow:[0.3,1]}},
  {kind:'ortho',n:0.12,env:{heat:[0.3,1]}}, // the vents: warm water below the thermocline
  {kind:'veil',n:0.2,env:{h:[-800,-150]}},
  {kind:'abyssal',n:0.1,env:{h:[-560,-380],nut:[0.25,1]}}, // the rim of the dark where the water is fed (PLANET: the rim, forays below). v11.66: it was h −800..−400 over the whole basin's flanks, where the sill's and the far floor's cells reach no combs, and the 120-day census had it collapsing 70 → 12 since v11.65 (the 40-day run --test makes does not see it); the ledger's reach is 5×5 cells, so its home band is the two cells over the combs' deep edge
  {kind:'plumb',n:12,env:{h:[-520,-30],flow:[0,0.45]}}, // v11.223: the walls in still water (DEFS station: the capacity is the cell's share of wall and lee, ecology.js ecoCap) — the foot to −520, the face up past −450 (its shell's floor); the ortho's opposite, which wants the current. Last: a new row goes at the end, so every row before it draws from a cell's rng as it did (the seeded tests' runs)
  {kind:'quill',grp:5,n:8,env:{h:[-54,-16],sub:[0.55,1],nut:[0.45,1]}}, // v11.227: the weed forest (its canopy station: the stalks' envelope); new rows go last. v11.227.1: in stands of five (shrimpfish hang together), and n 3 → 8 — the person found none round the island at 1–2 a cell (n 12 overshot: the quill halved in 60 days and took the hook, its rival for the same small fish, to 47%)
  {kind:'hoop',n:0.12,env:{h:[-450,-80],nut:[0.5,1]}} // v11.227: the open water over the fed, cold flank — the upwelling, where the swarms are (the veil's deeper, the comb's on the plain)
];
// ---------- the stations (v11.223; CLADES, The radiation: habitat at three scales) ----------
// Habitat's second scale, where in its cell an animal stands (the first is SPAWN's envelope, the cells; the third the clock). A kind names its
// stations (DEFS.station); each is a score 0..1 at a point from the ground round it, and the kind's is their product. The ledger weighs a cell's
// capacity by it point by point (ecology.js ecoCap, ecoPatchCap: a cell with no wall holds no plumb) and placeKind stands the animal at the best
// of the cell's points (chunks.js stationPoint). wall: the ground rises steeply beside the point — the rise to its highest neighbour over their
// distance, a smooth step from lo to hi (over 36 m: an 11 m face starts it, a 27 m one is full) — and the face reaches up past the deepest the body may be (deepY) by `reach` m, so it hangs beside rock and
// not over a step far below it. lee: still water, 1 at flow lo to 0 at hi (a body hung vertical is a mast in a current). canopy (v11.227): in
// the weed forest, by the stalks' own envelope. Seven are proposed (wall, lee, lip, edge, canopy, open, crevice); these three are built.
const STATION={wall:{lo:0.3,hi:0.75,reach:10},lee:{lo:0.2,hi:0.5},canopy:{env:{h:[-54,-16],sub:[0.55,1],nut:[0.45,1],flow:[0.15,0.85],young:[0,0.45]}}}; // canopy (v11.227): in the weed forest — the stalks' own envelope (flora.js stipe), so a kind that names it stands where the stalks stand // wall lo/hi 0.45/0.9 to v11.223 (16–32 m faces); v11.223.1 (the person: more common, "a sea full of these things") 11–27 m
function stationW(st,h,rise,run,f,deepY){let w=1; // f: the place's fields (FI)
  for(let i=0;i<st.length;i++){const s=st[i];if(s==='wall'){w*=smooth(STATION.wall.lo,STATION.wall.hi,rise/run);if(deepY!==undefined&&h+rise<deepY+STATION.wall.reach)return 0;}else if(s==='lee')w*=1-smooth(STATION.lee.lo,STATION.lee.hi,f[FI.flow]);else if(s==='canopy')w*=envW(STATION.canopy.env,h,0,f);if(w<=0)return 0;}
  return w;}
// the rise to the highest of a grid point's four neighbours (a G×G grid of heights hs): the wall's height beside it
function gridRise(hs,G,n){const a=n%G,b=(n-a)/G,h=hs[n];let r=0;if(a>0)r=Math.max(r,hs[n-1]-h);if(a<G-1)r=Math.max(r,hs[n+1]-h);if(b>0)r=Math.max(r,hs[n-G]-h);if(b<G-1)r=Math.max(r,hs[n+G]-h);return r;}
// ---------- the individual (v11.225; VARIETY.md) ----------
// What differs between two of a kind, each by a cause the world can name (VARIETY §2): a morph (genes — a palette transform drawn by frequency, a
// rare one about one in 50: the person, 23 Nov 2026), an age (its size by its growth law, VARIETY §3, with the species' range on top — the person:
// "size by age for sure, but there should also be range on top of that" — and the marks of the old past `old` of the ages), a proportion set
// (development — the build's params moved within the registry's believable bands; `sets` of them a kind, the first the type, so the physics follows
// through derive) and the place's coat (coatChem: COAT_CHEM_KEYS, the ringmouths' shells since v11.225). An individual is seeded by its cell, its
// entry and its place among them (creatures_ai.js indivSeed), so a cell shows the same animals each visit (the person: "the fixed locations feel
// good… tangible, stable"). A kind with no row is built as the type, its size VARY's ±15%, as before; rows come a clade a pass (VARIETY §7).
// the clade's defaults (the person: "ringmouths in general should vary the most", the hingeshells next): max, the variants a kind may build (morph ×
// set × old; past it an animal takes the nearest built one); sets, the proportion sets; range, ± the size an animal takes on top of its age's (the
// hingeshells' small, so their moult steps stay steps); grow, the growth law; oldPal, what age does to the coat
const VARIETY_CLADE={ringmouths:{max:12,sets:3,range:0.06,grow:'stop',oldPal:'senescent'},hingeshells:{max:10,sets:3,range:0.02,grow:'moult',oldPal:'worn'},
  slowbloods:{max:6,sets:2,range:0.05,grow:'never',oldPal:'weathered'},drifters:{max:4,sets:1,range:0.04,grow:'food',oldPal:null}};
// the size an age gives (VARIETY §3): q the animal's age as its rank among its kind's adults (0 the youngest, 1 the oldest), S the adult band [least,
// most] about the type's 1, nut the place's food (0..1) where the law reads it. Every law puts the median adult at the type.
const INSTAR=1.18; // a hingeshell's growth at a moult: Dyar's rule, ~1.2–1.4 a moult in Earth's crustaceans, less in the adults
function growHalf(q,S,p){return q<0.5?lerp(S[0],1,q/0.5):lerp(1,S[1],Math.pow((q-0.5)/0.5,p));}
const GROW={
  shell:(q,S)=>growHalf(q,S,2.5), // a shell grows all its life, slower as it goes: half the adults between the least and the type, the oldest few the largest
  stop:(q,S)=>growHalf(q,S,1), // grown and done (the soft ringmouths: short lives, one spawning, LINEAGE §3): a narrow band, even across it
  never:(q,S)=>growHalf(q,S,1.8), // an ectotherm never stops (the slowbloods, as fish and reptiles): a long tail of old giants
  moult:(q,S)=>{const k=growHalf(q,S,2),l=Math.log(INSTAR),n=clamp(Math.round(Math.log(k)/l),Math.ceil(Math.log(S[0])/l-0.05),Math.floor(Math.log(S[1])/l+0.05));return Math.pow(INSTAR,n);}, // grown only at a moult (the hingeshells): sizes in steps you can count, the steps inside the band
  food:(q,S,nut)=>{const n=nut===undefined?0.5:nut;return growHalf(clamp(0.6*n+0.4*q,0,1),S,1);}}; // grows with food and shrinks without (the drifters, as Earth's jellies): the place's food first, age second
// a morph or a mark as a palette transform, on [hue°, sat, light] for a key (the eyes, the mouth and the claws are never moved: PAL_FIXED); each
// with its cause. A transform hands back the colour it was given for a key it leaves alone. The pigmented keys (MORPH_KEYS) are the coat's; the
// flesh is the blood's, the belly and the joints are pale by build, the comb and the gut are what they are.
const MORPH_KEYS={shell:1,band:1,top:1,mantle:1,arm:1,ridge:1,web:1,plate:1,flap:1,fin:1,rim:1,bell:1,valve:1,leg:1,rust:1};
function hueTo(a,b,t){const d=(((b-a)%360)+540)%360-180;return a+d*(Math.abs(d)>90?1:t);} // far round the wheel (a teal body to red) it goes all the way: a part-way blend would pass through yellow or green
const MORPHS={type:null,
  melanic:(c,k)=>PAL_PALE[k]?[c[0],c[1]*0.7,c[2]*0.72]:[c[0],c[1]*0.6,c[2]*0.5], // more melanin: cold, deep and vent water favour it; dark rock hides it
  erythristic:(c,k)=>MORPH_KEYS[k]?[hueTo(c[0],8,0.7),Math.max(c[1],0.42),c[2]*(k==='shell'?0.82:0.9)]:c, // red in the coat: ommochromes (ringmouths), astaxanthin from the diet (the rest); red is black below −15
  xanthic:(c,k)=>MORPH_KEYS[k]?[hueTo(c[0],46,0.65),Math.min(0.75,c[1]*1.25+0.1),lerp(c[2],0.55,0.25)]:c, // yellow: carotenoids, so only where the diet is the lit shallows' (VARIETY §5)
  leucistic:(c,k)=>[c[0],c[1]*0.35,lerp(c[2],0.86,0.55)], // little pigment at all: the rare pale one, one in 50 (the person, 23 Nov 2026)
  banded:(c,k)=>PAL_PALE[k]?[c[0],c[1],lerp(c[2],0.86,0.4)]:MORPH_KEYS[k]?[c[0],Math.min(1,c[1]*1.1),c[2]*0.62]:c, // a pattern morph: disruptive bands (MORPH_PAT, drawn with the texels on) and the hard contrast that goes with them — dark back, pale belly
  spotted:(c,k)=>MORPH_KEYS[k]?[hueTo(c[0],35,0.3),c[1]*0.6,lerp(c[2],0.5,0.35)]:c, // a pattern morph: the mottle (MORPH_PAT) and the floor's own paler, greyer tone
  old:(c,k)=>k==='shell'||k==='band'?[c[0],c[1]*0.62,lerp(c[2],0.6,0.3)]:c, // an old shell, worn and faded
  senescent:(c,k)=>MORPH_KEYS[k]?[c[0],c[1]*0.7,lerp(c[2],0.62,0.2)]:c, // a soft ringmouth near its end: the chromatophores fail, the skin pales
  weathered:(c,k)=>MORPH_KEYS[k]?[c[0],c[1]*0.85,c[2]*0.86]:c, // an old slowblood: darker, duller
  worn:(c,k)=>MORPH_KEYS[k]?[c[0],c[1]*0.72,lerp(c[2],0.42,0.25)]:c}; // an old hingeshell's carapace between its rare moults: dull, abraded
// where a morph is favoured (v11.226.1). The person (24 Nov 2026): "darker ones in darker biomes, but otherwise should not have random really dark
// ones in the bright dunes… the totally black ridge should show up a lot more often in darker waters or open ocean… not deterministic, just chance."
// A morph's odds are its frequency times its favour at the place an animal is drawn: what a hunter sees an animal against picks off the ones that
// stand out (Earth: the pocket mice dark on the lava and pale on the sand, the peppered moth). The place is read once, at the spawn (creatures_ai.js
// placeOf), as terms 0..1 — dark: how dark the animal's background is (the light lost with its depth, the ground's tone near the floor, the open
// ocean's depth beneath it); lit: the lit shallows, whose food carries carotenoids; rock, sand, floor: the ground within reach of it; vent: the
// vents' heat. A favour f multiplies the frequency by k[0] + (k[1] − k[0])·f²; the type and the pale one follow nothing.
const FAVOUR={k:[0.08,3.2]}; // the multiplier runs with the favour's square: a dark morph in the bright dunes is about one in 100, not one in 25
const MORPH_FAVOUR={melanic:'dark',erythristic:'dark',xanthic:'lit',banded:'rock',spotted:'floor'}; // the term a morph follows unless the row names its own (a morph's third element: a term, or 'none')
const GROUND_TONE={lime:0.02,'':0.05,rust:0.5,mn:0.85,sulfide:1}; // the ground's darkness by its chemistry class (coatClassAt): the reef's lime and the sand and ooze pale, the iron rust mid, manganese and sulfide black; fresh basalt ('d') 0.35 darker
// a pattern morph's pattern (PATTERNS: kind, cells a period, tone), in place of the clade's: banded the disruptive stripe of a body among structure,
// spotted the mottle of one on rubble, sand or weed
const MORPH_PAT={banded:{kind:'stripes',scale:2,tone:0.24},spotted:{kind:'spots',scale:3,tone:0.24}};
// the proportions that vary when a row does not list its own (`vary`): by part kind, and by core kind under 'core' — [param, ± fraction]; a param
// moves only where the spec sets it or its registry default is a number; counts never move. prof (the lathe's profile) is its girth: every radius
const VARY_AUTO={arms:[['len',0.14]],legs:[['ll',0.1]],fins:[['len',0.12],['h',0.12]],tail:[['ll',0.1],['lh',0.12],['L',0.1]],mouth:[['len',0.12]],
  flaps:[['len',0.1],['w',0.1]],weapon:[['len',0.1],['w',0.08]],comb:[['len',0.12]],eyes:[['len',0.15]],spines:[['h',0.2]],barbels:[['len',0.2]],
  chevrons:[['sz',0.1]],ridge:[['len',0.1],['h',0.15]],skirt:[['len',0.1],['h',0.1]],tailplate:[['w',0.1]],head:[['sy',0.08]],plates:[['w',0.08]],
  core:{lathe:[['prof',0.07],['sz',0.06]],trunk:[['w0',0.08],['w1',0.08],['h0',0.06],['h1',0.06],['L',0.05]],shield:[['sx',0.06],['sz',0.06]],
    coilbody:[['sx',0.05],['sy',0.06],['sz',0.05]],mantle:[['L',0.08],['R',0.06]],bell:[['R',0.08],['H',0.1]],chain:[['L',0.08],['w0',0.1]],
    sac:[['R',0.06],['sy',0.06]],bean:[['sx',0.06],['sz',0.06]],arches:[['L',0.05],['w0',0.05]]}};
// the rows (v11.225 the shelled ringmouths, v11.226 every placed species: the person, 24 Nov 2026, "variety for more species first"). grow: the law
// (the clade's unless set); size: the adult band about the type; old: the age rank past which an animal is old (1.1: never); morphs: [name,
// frequency, and the place's term it follows if not MORPH_FAVOUR's], the first the type; vary: [part kind or 'core', param, ± fraction] (VARY_AUTO's unless set); oldShell: what age does to the shell (a
// straightshell sheds its tip: Sphooceras, VARIETY §2.4); max, sets, range, oldPal: the clade's unless set. A uniform species has the type alone:
// the schooling forage (the oddity effect — the one that differs is the one a hunter picks out), the deep line's pall, the sulfide-black cinder.
// The person on v11.225 (24 Nov 2026): "I love how they can match their environment… their larger size is SO much more threatening and unique to
// this setting" — the bands are wide where the law allows it.
const VARIETY={
  // ringmouths: the shelled grow by their shells, the soft stop; they vary most
  plumb:{grow:'shell',size:[0.85,1.5],old:0.9,morphs:[['type',0.82],['melanic',0.16],['leucistic',0.02]],vary:[['arms','len',0.14],['shell','L',0.06],['shell','r0',0.1],['shell','turns',0.2]],oldShell:{L:0.82},oldPal:'old'}, // 20 m typical, 30 m the oldest (the person, 23 Nov 2026)
  quill:{grow:'shell',size:[0.85,1.4],old:0.9,morphs:[['type',0.68],['xanthic',0.3],['leucistic',0.02]],vary:[['arms','len',0.14],['shell','L',0.06],['shell','r0',0.1],['shell','turns',0.2]],oldShell:{L:0.85},oldPal:'old'}, // olive, or the bladders' gold (lit: the weed's own colours)
  ortho:{grow:'shell',size:[0.85,1.35],old:0.9,morphs:[['type',0.82],['erythristic',0.16],['leucistic',0.02]],vary:[['arms','len',0.14],['shell','L',0.06],['shell','r0',0.1],['shell','turns',0.2]],oldShell:{L:0.85},oldPal:'old'},
  great:{grow:'shell',size:[0.85,1.3],old:0.9,morphs:[['type',0.84],['melanic',0.14],['leucistic',0.02]],vary:[['arms','len',0.14],['shell','R1',0.08],['shell','k',0.05]],oldPal:'old'},
  rasp:{grow:'shell',size:[0.8,1.25],old:0.9,morphs:[['type',0.68],['erythristic',0.3,'lit'],['leucistic',0.02]],vary:[['arms','len',0.16],['shell','R1',0.1]],oldPal:'old'}, // the rasp: a grazer of the lit rock, where a red shell among the red crusts is the common second
  arrow:{size:[0.9,1.12],old:0.92,morphs:[['type',0.78],['erythristic',0.2,'none'],['leucistic',0.02]]}, // a pack's jetters: the flush of red is the chromatophores'
  lurker:{size:[0.85,1.2],old:0.92,morphs:[['type',0.58],['melanic',0.2],['spotted',0.2,'rock'],['leucistic',0.02]]}, // among rock: dark on the basalt, mottled on the rubble
  watcher:{size:[0.88,1.15],old:0.92,morphs:[['type',0.7],['erythristic',0.15,'none'],['banded',0.13],['leucistic',0.02]]},
  veil:{size:[0.85,1.25],old:0.92,morphs:[['type',0.9],['melanic',0.08],['leucistic',0.02]]}, // the deep line's filter feeder: long-lived and slow, a wider band
  pall:{size:[0.92,1.1],old:1.1,morphs:[['type',1]],sets:1}, // uniform: black in the oxygen minimum, nothing to show to anything there
  // slowbloods: never stop growing
  darter:{size:[0.85,1.25],old:1.1,morphs:[['type',1]],sets:1}, // uniform: a school (the oddity effect)
  needle:{size:[0.85,1.3],old:0.92,morphs:[['type',0.8],['banded',0.18],['leucistic',0.02]]},
  grazer:{size:[0.8,1.45],old:0.92,morphs:[['type',0.7],['melanic',0.16],['xanthic',0.12],['leucistic',0.02]]}, // the herds on the lit sand: carotenoid-rich from the green they crop
  basker:{size:[0.85,1.45],old:0.92,morphs:[['type',0.82],['melanic',0.16],['leucistic',0.02]]}, // the vents' warmth: melanin
  ridge:{size:[0.85,1.55],old:0.92,morphs:[['type',0.78],['melanic',0.2],['leucistic',0.02]]}, // the black ridge: the open ocean's and the dark water's (the person, 24 Nov 2026), rare in the lit
  hoop:{size:[0.85,1.5],old:0.92,morphs:[['type',0.8],['melanic',0.18],['leucistic',0.02]]}, // 16 m typical, 24 m the oldest (the abyssal, 19 m and to 30 old, takes the young and the typical); dark over the open deep
  abyssal:{size:[0.85,1.6],old:0.92,morphs:[['type',0.9],['erythristic',0.08],['leucistic',0.02]]}, // the deep's red, which is black where it lives
  eel:{size:[0.8,1.5],old:0.92,morphs:[['type',0.78],['spotted',0.2,'rock'],['leucistic',0.02]]}, // mottled in the weed's cover
  stone:{size:[0.85,1.4],old:0.92,morphs:[['type',0.8],['melanic',0.18],['leucistic',0.02]]}, // dark on the pavement and the crust
  crusher:{size:[0.85,1.45],old:0.92,morphs:[['type',0.82],['banded',0.16],['leucistic',0.02]]},
  // hingeshells: in moult steps
  flicker:{size:[0.85,1.2],old:1.1,morphs:[['type',1]],sets:1}, // uniform: a ribbon (the oddity effect)
  sifter:{size:[0.85,1.2],old:1.1,morphs:[['type',1]],sets:1}, // uniform: a swarm
  scuttle:{size:[0.8,1.4],old:0.92,morphs:[['type',0.7],['erythristic',0.18,'lit'],['banded',0.1],['leucistic',0.02]]}, // the strand's: red from a shore diet
  wedge:{size:[0.85,1.3],old:0.92,morphs:[['type',0.75],['melanic',0.23],['leucistic',0.02]]}, // dark on the surf's basalt
  trap:{size:[0.85,1.35],old:0.92,morphs:[['type',0.7],['spotted',0.28,'sand'],['leucistic',0.02]]}, // buried in sand: the mottle of it
  plough:{size:[0.85,1.3],old:0.92,morphs:[['type',0.8],['banded',0.18,'sand'],['leucistic',0.02]]},
  hood:{size:[0.85,1.3],old:0.92,morphs:[['type',0.85],['melanic',0.13],['leucistic',0.02]]},
  hose:{size:[0.85,1.3],old:0.92,morphs:[['type',0.8],['erythristic',0.18,'lit'],['leucistic',0.02]]}, // the weed forest's carotenoids
  lash:{size:[0.85,1.3],old:0.92,morphs:[['type',0.85],['banded',0.13],['leucistic',0.02]]},
  hook:{size:[0.85,1.35],old:0.92,morphs:[['type',0.8],['melanic',0.18],['leucistic',0.02]]},
  sickle:{size:[0.85,1.4],old:0.92,morphs:[['type',0.85],['melanic',0.13],['leucistic',0.02]]},
  ram:{size:[0.85,1.35],old:0.92,morphs:[['type',0.88],['banded',0.1,'none'],['leucistic',0.02]]},
  comb:{size:[0.85,1.35],old:0.92,morphs:[['type',0.9],['melanic',0.08],['leucistic',0.02]]},
  relict:{size:[0.85,1.3],old:0.92,morphs:[['type',0.92],['melanic',0.06],['leucistic',0.02]]},
  picker:{size:[0.85,1.3],old:0.92,morphs:[['type',0.85],['melanic',0.15]]}, // the vents' swarm: melanin, and no pale one in the dark
  tread:{size:[0.9,1.25],old:0.92,morphs:[['type',0.9],['melanic',0.08],['leucistic',0.02]]}, // the giant moults seldom: few steps
  cinder:{size:[0.85,1.25],old:1.1,morphs:[['type',1]],sets:1}, // uniform: black in its sulfide
  // drifters: by the place's food
  jelly:{size:[0.75,1.35],old:1.1,morphs:[['type',0.9],['erythristic',0.1]]}, // red is black below the light: the deeper ones carry it
  deepbell:{size:[0.8,1.3],old:1.1,morphs:[['type',1]]},
  sailer:{size:[0.8,1.25],old:1.1,morphs:[['type',1]]} // the ledger's (the fleets outside it are the type)
};
// The roster (PLANET.md) in the order the bestiary shows it (zoo.js). Display only: clade, family, niche, size is DEFS's (or the
// clade's, for the three players), floor: sits on the ground (shown at the game's floor clearance), new: built and not yet placed.
const ROSTER=[
  {id:'soft',name:'soft-arm',clade:'ringmouths',family:'jetters',niche:'the player',player:true},
  {id:'coil',name:'coilshell',clade:'ringmouths',family:'coilshells',niche:'the player',player:true},
  {id:'rasp',clade:'ringmouths',family:'coilshells',niche:'floor grazer, shelled',floor:true},
  {id:'great',clade:'ringmouths',family:'coilshells',niche:'shelf apex'},
  {id:'ortho',clade:'ringmouths',family:'straightshells',niche:'player-size predator, spear'},
  {id:'plumb',clade:'ringmouths',family:'straightshells',niche:'hangs at walls, drops on what passes under'},
  {id:'quill',clade:'ringmouths',family:'straightshells',niche:'hangs among the weed\'s stalks, drops on the small'},
  {id:'arrow',clade:'ringmouths',family:'jetters',niche:'small-prey hunter, in packs'},
  {id:'lurker',clade:'ringmouths',family:'crawlers',niche:'floor ambush, grab',floor:true},
  {id:'watcher',clade:'ringmouths',family:'crawlers',niche:'a curious omnivore',floor:true},
  {id:'pall',clade:'ringmouths',family:'the deep line',niche:'the dark\'s resident'},
  {id:'veil',clade:'ringmouths',family:'the deep line',niche:'big filter feeder (unconfirmed)'},
  {id:'fin',name:'finback',clade:'slowbloods',family:'finbacks',niche:'the player',player:true},
  {id:'darter',clade:'slowbloods',family:'finbacks',niche:'small forage'},
  {id:'needle',clade:'slowbloods',family:'finbacks',niche:'small-prey hunter, in threes'},
  {id:'grazer',clade:'slowbloods',family:'finbacks',niche:'floor grazer, herds',floor:true},
  {id:'basker',clade:'slowbloods',family:'finbacks',niche:'mid predator, vent-bound'},
  {id:'ridge',clade:'slowbloods',family:'ridgebacks',niche:'player-size predator, mixotherm'},
  {id:'hoop',clade:'slowbloods',family:'ridgebacks',niche:'big filter feeder, the open ring'},
  {id:'abyssal',clade:'slowbloods',family:'ridgebacks',niche:'apex, gigantotherm'},
  {id:'eel',clade:'slowbloods',family:'longbacks',niche:'structure hunter'},
  {id:'stone',clade:'slowbloods',family:'platebacks',niche:'floor ambush, torpid, bite',floor:true},
  {id:'crusher',clade:'slowbloods',family:'platebacks',niche:'shell-eater'},
  {id:'scuttle',clade:'hingeshells',family:'walkers',niche:'floor grazer, walks on land',floor:true},
  {id:'trap',clade:'hingeshells',family:'walkers',niche:'floor ambush, strike',floor:true},
  {id:'hook',clade:'hingeshells',family:'walkers',niche:'structure hunter, climbs'},
  {id:'tread',clade:'hingeshells',family:'walkers',niche:'sediment feeder, the giant',floor:true},
  {id:'picker',clade:'hingeshells',family:'walkers',niche:'scavenger at the rim of the dark',floor:true},
  {id:'flicker',clade:'hingeshells',family:'paddlers',niche:'small forage'},
  {id:'hose',clade:'hingeshells',family:'paddlers',niche:'small-prey hunter of the towers — the splay look'},
  {id:'sickle',clade:'hingeshells',family:'paddlers',niche:'player-size predator, burst and coast — the keel look'},
  {id:'hood',clade:'hingeshells',family:'paddlers',niche:'a player-sized hunter of the sand flats and the lagoon, a claw for small prey — the hood look'},
  {id:'lash',clade:'hingeshells',family:'paddlers',niche:'hunter of the ledges, whips out — the lash look'},
  {id:'ram',clade:'hingeshells',family:'paddlers',niche:'a blow on the swarms over the flank — the ram look'},
  {id:'comb',clade:'hingeshells',family:'paddlers',niche:'big filter feeder, the minor one'},
  {id:'sifter',clade:'hingeshells',family:'paddlers',niche:'small filter feeder of the fed water, in swarms'},
  {id:'relict',clade:'hingeshells',family:'paddlers',niche:'the sill relict: a hunter of pickers below the light'},
  {id:'cinder',clade:'hingeshells',family:'walkers',niche:'the seep walker, poison by its diet',floor:true},
  {id:'wedge',clade:'hingeshells',family:'walkers',niche:'the surf zone\'s walker',floor:true},
  {id:'plough',clade:'hingeshells',family:'walkers',niche:'deposit feeder of the flats',floor:true},
  {id:'jelly',clade:'drifters',family:'bells',niche:'the pulser, the lit water'},
  {id:'deepbell',clade:'drifters',family:'bells',niche:'the giant of the drift, below the light'},
  {id:'sailer',clade:'drifters',family:'floats',niche:'sails the surface, fishes with lines'},
  {id:'greatsailer',clade:'drifters',family:'floats',niche:'the landmark',new:true}
];
