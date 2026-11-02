import type { LevelDef } from '../content/types';
import { NOTES } from '../content/notes';
import { Rng } from '../core/rng';
import { syncBody } from './body';
import { restoreRoute } from './cast';
import { layRag } from './ragdoll';
import { restoreAlarms, saveAlarm, type SavedAlarm } from './eyes';
import { settle, type Game } from './game';
import { makeHands } from './combat';
import { buildUsables, type WorldItem } from './interact';
import { doorBox, placePlatform } from './movers';
import type { Walker } from './fields';
import { makeSim, type Sim, type SimOpts } from './sim';

/* Save and load (engine.md §10). A save is plain data: everything in the sim that can change, by name or by the order
   it was made in (a level loaded twice makes the same things in the same order). The world itself is never saved;
   it is built again from the level. Fields over the nav graph are made again on load; a line of sight is looked along
   again. Loaded, a run plays on exactly as it would have. */

/** 2: the upper station laid out again (Security's wing and the atrium), so its doors and things are made in a new order.
 *  3: again (the muster hall, and the operations room behind glass), with the staff's power-failure drills
 *  4: bodies keep their velocity on the plan (engine.md §6, F1); the shoves that were kept beside it are gone
 *  5: poise, and blows that commit (engine.md §6, F2); since, the cast's knockdowns and corpses (each loads from a save
 *  without them: nobody down, the dead laid where they lay)
 *  6: the overseer and its hand gone, with their knocks and bolts; the level's cast is two fewer. Since, cameras that
 *  guard armed rooms (a save from before them loads: nothing tripped)
 *  7: the night round, one more of the level's cast, on its round with its flashlight
 *  8: the opening (sim/opening.ts): the suite laid out again, the other patient one more of the cast
 *  9: the opening's second pass: the suite laid out again, and the night round's drag
 *  10: the opening in the dark: the suite on its own backup set, the light switches gone, and blood on the floor
 *  11: the graft: the other patient grafted and left out cold, and the smear of their dragging
 *  12: the station's dead, bodies now: a level's cast is more by the guards and residents lying in it
 *  13: the skitter on four legs: a skitter's body is fewer points
 *  14: the bone line's middle years: Cargo's cast, main's and the plant's are more by them
 *  15: two of Cargo's taken out again
 *  16: one of the bush's line, old in it, in the Commons: main's cast is one more
 *  17: the walk-ins off the upper station's service passage: its doors made in a new order
 *  18: the chief of security's suite: again
 *  19: Maintenance, its generator room and fuel store: again
 *  20: administration, its ID office and the administrator's: again
 *  21: the lobby's washrooms, and screening's door to the nurses' station back: again
 *  22: the locker room's showers and toilets, and the training room: again
 *  23: the bar's kitchen, its service stair and pantry: again
 *  24: the comms cupboards, one a camera branch: again
 *  25: Cargo made larger (the decks, the hoist and the goods lift, the warehouse and its chambers, the fire shutters, the
 *  crane's ladder): the upper station's doors, platforms and cast made in a new order; the player's `climbing` */
export const SAVE_VERSION = 25;

/** copy the named fields of an object */
const pick = <T extends object, K extends keyof T>(o: T, keys: readonly K[]): Pick<T, K> => {
  const out = {} as Pick<T, K>;
  for (const k of keys) out[k] = structuredClone(o[k]);
  return out;
};
const put = <T extends object>(o: T, data: Partial<T>): void => { Object.assign(o, structuredClone(data)); };

const GAME = ['inv', 'tools', 'keys', 'worn', 'weapon', 'read', 'code', 'code2', 'hp', 'batt', 'light', 'lightOn', 'pad',
  'ended', 'time', 'noise', 'noiseI', 'noiseT', 'vis', 'once', 'kills', 'god'] as const;
const PLAYER = ['yaw', 'pitch', 'crouch', 'wantStand', 'moved', 'impact', 'water', 'air', 'airMax', 'under', 'slow', 'load', 'slam',
  'running', 'jumped', 'stepD', 'fly', 'climbing'] as const;
const BODY = ['x', 'y', 'z', 'vx', 'vz', 'vy', 'h', 'ground'] as const;
const DOOR = ['t', 'open', 'unlocked', 'hold', 'down', 'drawing', 'pass', 'beep', 'beepOk'] as const;
const PLATFORM = ['y', 'target', 'wait', 'moving', 'armed'] as const;
const LOOSE = ['x', 'y', 'z', 'vx', 'vy', 'vz', 'awake', 'ground', 'still', 'woke'] as const;
const MUTANT = ['x', 'y', 'z', 'px', 'py', 'pz', 'yaw', 'state', 'st', 'cd', 'stun', 'hp', 'post', 'wt', 'wm', 'wx', 'wz', 'tk',
  'lost', 'bt', 'burst', 'flee', 'ct', 'cdir', 'tgt', 'grab', 'tense', 'stk', 'near', 'fled', 'side', 'spot', 'mv',
  'hit', 'stop', 'poise', 'calm', 'reel', 'pat', 'down', 'rise', 'ph', 'dead', 'gone', 'away', 'dest', 'los', 'losAt', 'still', 'door', 'beat', 'lap', 'peered', 'torch', 'tp', 'drag', 'trail', 'graft', 'grafted'] as const;

/** what a rider stands on, by the moving thing's id */
const onId = (r: { on: { id: number } | null }) => r.on?.id ?? 0;

export interface Save {
  v: number;
  level: string;
  tick: number;
  rng: number;
  game: Partial<Game> & { station: Game['station'] };
  player: Record<string, unknown>;
  body: Record<string, unknown>;
  doors: Record<string, unknown>[];
  platforms: Record<string, unknown>[];
  loose: Record<string, unknown>[];
  items: WorldItem[];
  /** usables turned off that are not items (bodies searched), by key */
  spent: string[];
  cast: Record<string, unknown>[];
  hands: Sim['hands'];
  /** what each rider stands on (by id): the player, the loose things, the cast, in that order */
  on: number[];
  /** the cameras (smashed, how long each has held you, and whether it has sounded for you), and the alarms sounding;
   *  none in a save from before them */
  cams?: { broken: boolean; hold: number; tripped: boolean }[];
  alarms?: SavedAlarm[];
  /** the zones whose speaker is smashed */
  mute?: string[];
  /** the branches whose comms cupboard's switch is smashed */
  blind?: string[];
  /** breakers opened by hand, and who may go to throw them back */
  drills?: Sim['drills'];
  /** the opening, while it lasts (sim/opening.ts) */
  opening?: Sim['opening'];
  /** blood from the living, where they were struck */
  pools?: Sim['pools'];
  /** the fields over the nav graph as they stood (they are made in turn, so cannot be made again exactly) */
  fields: ({ from: number; turn: number; made: Record<string, string>; sound: string } & Partial<Record<Walker, string>>) | null;
}

/* a float array as text, exactly */
const pack = (a: Float32Array): string => {
  const b = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
};
const unpack = (s: string, into: Float32Array): void => {
  const t = atob(s), b = new Uint8Array(into.buffer, into.byteOffset, into.byteLength);
  if (t.length !== b.length) throw new Error('save does not fit this level\'s nav graph');
  for (let i = 0; i < b.length; i++) b[i] = t.charCodeAt(i);
};

export function save(sim: Sim): Save {
  const g = sim.game;
  return {
    v: SAVE_VERSION,
    level: sim.world.def.id,
    tick: sim.tick,
    rng: sim.rng.state(),
    game: { ...pick(g, GAME), station: structuredClone(g.station) },
    player: pick(sim.player, PLAYER),
    body: pick(sim.player.body, BODY),
    doors: sim.doors.map(d => pick(d, DOOR)),
    platforms: sim.platforms.map(p => pick(p, PLATFORM)),
    loose: sim.loose.all.map(o => pick(o, LOOSE)),
    items: structuredClone(sim.items),
    spent: sim.usables.filter(u => u.off && u.key).map(u => u.key!),
    cast: sim.cast.map(m => ({ ...pick(m, MUTANT), ride: structuredClone(m.ride), blow: structuredClone(m.blow), rag: structuredClone(m.rag), body: m.body ? pick(m.body, BODY) : null })),
    hands: structuredClone(sim.hands),
    on: [sim.player.body, ...sim.loose.all, ...sim.cast.map(m => m.body)].map(r => (r ? onId(r) : 0)),
    cams: sim.cams.map(c => ({ broken: c.broken, hold: c.hold, tripped: c.tripped })),
    alarms: sim.alarms.map(saveAlarm),
    drills: structuredClone(sim.drills),
    ...(sim.opening ? { opening: structuredClone(sim.opening) } : {}),
    ...(sim.pools.length ? { pools: structuredClone(sim.pools) } : {}),
    mute: [...sim.mute],
    blind: [...sim.blind],
    fields: sim.fields && {
      from: sim.fields.from, turn: sim.fields.turn, made: { ...sim.fields.made },
      ...Object.fromEntries(Object.entries(sim.fields.ways).map(([w, a]) => [w, pack(a)])), sound: pack(sim.fields.sound),
    },
  };
}

/** a sim of `level` as the save left it */
export function load(level: LevelDef, data: Save, o: SimOpts = {}): Sim {
  /* a level of a run that is not the one you are on shares the run's game and chance: those are not this save's to set */
  const shared = !!o.game;
  if (data.v !== SAVE_VERSION) throw new Error(`save version ${data.v}, expected ${SAVE_VERSION}`);
  if (data.level !== level.id) throw new Error(`save is of ${data.level}, not ${level.id}`);
  /* a save made in the opening is made again with it, and set as it was */
  const sim = makeSim(level, { ...o, opening: !!data.opening }), g = sim.game;
  g.events.length = 0; // what it said as it began was said long ago
  sim.tick = data.tick;
  if (!shared) {
    sim.rng = new Rng(data.rng);
    const { cap: _, ...game } = data.game as Partial<Game> & { cap?: number }; // a save from before the grid counted slots
    put(g, game);
    settle(g);
    g.notes = NOTES(g.code, g.code2);
  }

  put(sim.player, data.player as never);
  put(sim.player.body, data.body as never);
  syncBody(sim.player.body);
  sim.doors.forEach((d, i) => { put(d, data.doors[i] as never); Object.assign(d.dyn, doorBox(d, d.t)); });
  sim.platforms.forEach((p, i) => { put(p, data.platforms[i] as never); placePlatform(p); });
  sim.loose.all.forEach((q, i) => { put(q, data.loose[i] as never); q.sync(); });

  /* what lies about, what has been taken, and what has been used up */
  sim.items = structuredClone(data.items);
  sim.usables = buildUsables(sim);
  const spent = new Set(data.spent);
  for (const u of sim.usables) if (u.key && spent.has(u.key)) u.off = true;
  sim.cast.forEach((m, i) => {
    const { body, ride, blow, rag, ...own } = data.cast[i];
    put(m, own as never);
    m.ride = structuredClone(ride as typeof m.ride) ?? null;
    m.blow = structuredClone(blow as typeof m.blow) ?? null;
    m.rag = structuredClone(rag as typeof m.rag) ?? null;
    if (m.body) {
      put(m.body, body as never);
      syncBody(m.body);
      if (m.dead) { const k = sim.world.dyn.indexOf(m.body.dyn); if (k >= 0) sim.world.dyn.splice(k, 1); }
    }
    /* the dead of a save from before corpses were kept lie where they lay */
    if (m.dead && !m.away && rag === undefined) m.rag = layRag(m);
  });
  sim.hands = { ...makeHands(), ...structuredClone(data.hands) };
  sim.lighting = null;
  const F = sim.fields, d = data.fields;
  if (F && d) {
    F.from = d.from; F.turn = d.turn; F.made = { ...d.made };
    for (const [w, a] of Object.entries(F.ways)) { const s = d[w as Walker]; if (s) unpack(s, a); }
    unpack(d.sound, F.sound);
  }
  for (const m of sim.cast) restoreRoute(sim, m);
  sim.cams.forEach((c, i) => { const s = data.cams?.[i]; if (s) { c.broken = s.broken; c.hold = s.hold; c.tripped = s.tripped; } });
  sim.mute = [...(data.mute ?? [])];
  sim.blind = [...(data.blind ?? [])];
  sim.drills = structuredClone(data.drills ?? []);
  sim.opening = data.opening ? structuredClone(data.opening) : null;
  sim.pools = structuredClone(data.pools ?? []);
  restoreAlarms(sim, data.alarms ?? []);
  const byId = new Map(sim.world.dyn.map(d => [d.id, d]));
  [sim.player.body, ...sim.loose.all, ...sim.cast.map(m => m.body)].forEach((r, i) => { if (r) r.on = byId.get(data.on[i]) ?? null; });
  return sim;
}
