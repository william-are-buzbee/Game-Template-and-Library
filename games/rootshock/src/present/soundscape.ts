import type { Mat } from '../content/materials';
import { ITEMS } from '../content/items';
import type { RoomDef } from '../content/types';
import { clamp } from '../core/math';
import { stutters, type Mutant } from '../sim/cast';
import { power, type SimEvent } from '../sim/game';
import type { Loose } from '../sim/loose';
import type { Sim } from '../sim/sim';
import { roomLight } from '../world/light';
import type { Dyn, World } from '../world/world';
import type { Audio, Surf, Voice } from './audio';
import { flickerAt } from './flicker';

/* Where each sound is, and the sounds nobody in the sim needs to know about. A sound from a place comes to you the way
   the cast hears you (engine.md §8): along the rooms between, so a closed door or a wall of rock muffles it and makes it
   further off than it looks. Feet are heard on what they fall on. The cast breathe, click and gurgle as they go, cry
   out when they die; crates scrape and land; caves drip; your heart is heard when you are badly hurt. Every room has
   the echo its size gives it; Gen-1 is heard from where it stands; a failing tube buzzes and crackles as it flickers.
   All of it is looks only, so it draws on Math.random and never on the sim's seeded numbers. */

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** what a foot comes down on at a place: a puddle, or what the floor is made of (content/materials.ts) */
export function underfoot(w: World, x: number, y: number, z: number, on: Dyn | null = null): Mat | 'wet' {
  if (!on && w.waterAt(x, z) > y + 0.03) return 'wet';
  return w.floorMat(x, y, z, on);
}

/** what a foot comes down on, as the station sounded before it knew what it was made of (surface detail off): a puddle,
 *  a crate's wood, a platform's metal, a cave's rock, a plain room's (a walkway's) metal; else concrete */
export function legacyFloor(w: World, x: number, y: number, z: number, on: Dyn | null = null): Surf {
  if (on) return on.kind === 'loose' ? 'wood' : on.kind === 'mover' ? 'metal' : 'concrete';
  if (w.waterAt(x, z) > y + 0.03) return 'wet';
  for (const s of w.surfaces) {
    const d = s.def;
    if (d.kind !== 'floor' || d.sides || d.hidden || x < d.x0 || x > d.x1 || z < d.z0 || z > d.z1 || !s.has(x, z)) continue;
    if (Math.abs(s.heightAt(x, z) - y) < 0.25) return 'rock';
  }
  const R = w.roomAt(x, y + 0.3, z);
  if (R?.cells || R?.sky !== undefined) return 'rock';
  return R?.plain ? 'metal' : 'concrete';
}

/** how hard what you swing is where it meets something (0 soft, 1 steel): fists are soft, the baton is rubber over its
 *  core, the rest is steel or an edge */
function hardness(weapon: string | null): number {
  const w = weapon ? ITEMS[weapon]?.w : undefined;
  return !w || w.type === 'fist' ? 0.1 : weapon === 'baton' ? 0.35 : 0.9;
}

/** how much of each echo a room has, a small room's, a hall's and a vast space's, by how much air is in it: a cell or an
 *  office (up to 200 m³) small, a corridor or a lab a hall, the Commons or the generator hall (5,000 m³ and up) vast.
 *  Rock rings. */
export function spaceOf(R: RoomDef, rock: boolean): [number, number, number] {
  let vol = 0;
  const c = R.cells;
  if (c) { for (let k = 0; k < c.lo.length; k++) if (c.hi[k] > c.lo[k]) vol += c.res * c.res * (c.hi[k] - c.lo[k]); }
  else vol = (R.x1 - R.x0) * (R.z1 - R.z0) * R.ht;
  const L = Math.log10(Math.max(1, vol)), tri = (at: number, w: number) => Math.max(0, 1 - Math.abs(L - at) / w);
  const sm = L <= 2.2 ? 1 : tri(2.2, 0.7), hall = tri(2.9, 0.8), vast = L >= 3.7 ? 1 : tri(3.7, 0.8), n = sm + hall + vast || 1;
  const wet = (0.2 + (0.12 * hall) / n + (0.2 * vast) / n) * (rock ? 1.3 : 1);
  return [(sm / n) * wet, (hall / n) * wet, (vast / n) * wet];
}

/** where Gen-1 is heard from: the board on its face, on the level it stands on; null on every other level */
export function genAt(w: World): { x: number; y: number; z: number } | null {
  const u = w.def.uses.find(u => u.kind === 'breaker');
  return u ? { x: u.x, y: u.y - 1, z: u.z } : null;
}

/** how a sound made at (x, y, z) reaches you: how far it has to come, from which side, how muffled. Through the rooms
 *  where the cast's sound field reaches; past it, or with no way through, as if through the rock. */
export function hearing(sim: Sim, x: number, y: number | undefined, z: number): Required<Pick<Voice, 'd' | 'pan' | 'muffle'>> {
  const p = sim.player, b = p.body, dx = x - b.x, dz = z - b.z, dp = Math.hypot(dx, dz);
  const pan = dp < 0.6 ? 0 : clamp((dx * Math.cos(p.yaw) - dz * Math.sin(p.yaw)) / dp, -1, 1) * 0.85;
  const straight = y === undefined ? dp : Math.hypot(dp, y - b.y);
  const F = sim.fields;
  if (!F || F.from < 0 || y === undefined) return { d: straight, pan, muffle: 0 };
  const s = F.nav.locate(x, y, z);
  if (s < 0) return { d: straight, pan, muffle: 0 };
  const path = F.sound[s];
  if (!Number.isFinite(path)) return { d: straight * 1.5 + 8, pan: pan * 0.6, muffle: 1 };
  const extra = Math.max(0, path - straight);
  return { d: straight + extra * 0.6, pan: pan * (1 - clamp(extra / 20, 0, 0.5)), muffle: clamp(extra / 14, 0, 1) };
}

/** how much air is moving in a room, 0 to 1, by its circuit's power: a fitted room's fans rush softly on Gen-1, barely on
 *  a backup set, and a dead room is still and silent, as its dust hangs (motes.ts). A cave's air is the bed's. */
export function roomAir(R: RoomDef, pw: number): number {
  if (R.cells) return 0;
  return pw === 2 ? 1 : pw === 1 ? 0.3 : 0;
}

/** the station's own noises: which a place makes now and then, and how likely each. A fitted room's pipes knock (more
 *  with its pumps running), its frame groans (more the bigger it is) and its metal ticks; a cave's rock settles, and
 *  groans deep down. */
export function ambientFor(R: RoomDef, cave: boolean, powered: boolean): { n: string; w: number }[] {
  if (cave) return [{ n: 'settle', w: 3 }, { n: 'groan', w: 0.7 }];
  const [, hall, vast] = spaceOf(R, false);
  return [{ n: 'knock', w: powered ? 3 : 1.5 }, { n: 'groan', w: 0.4 + hall + 2 * vast }, { n: 'tick', w: 0.8 }];
}

/** what each of the cast says at rest, and how often (seconds, least and most) */
const IDLE: Partial<Record<string, { n: string; t: [number, number] }>> = {
  husk: { n: 'breath', t: [5, 11] }, skitter: { n: 'click', t: [3, 8] }, bloat: { n: 'gurgle', t: [4, 9] },
  thresher: { n: 'growl', t: [4, 8] }, grabber: { n: 'creak', t: [7, 14] },
};
/** the footsteps, which are heard on what they fall on */
const FEET = new Set(['hstep', 'tap']);

interface Heard { dead: boolean; t: number; x: number; z: number; walked: number }
interface Crate { ground: boolean; vmin: number; x: number; z: number; slid: number }

export class Soundscape {
  private sim: Sim | null = null;
  private cast = new WeakMap<Mutant, Heard>();
  private crates = new WeakMap<Loose, Crate>();
  private was = { water: 'dry', under: false, air: 0, vy: 0 };
  private heart = 0;
  private drip = 2;
  private bubbles = 2;
  /** this level's Gen-1, the rooms near each room, the room whose echo you hear, a tube dimmed */
  private gen: ReturnType<typeof genAt> = null;
  private near = new Map<number, number[]>();
  private room = -1;
  private dim = false;
  /** the station's own noises: when the next comes; ticks still to come after the power changed, and when; a knock
   *  waiting as the pumps take up or let go */
  private amb = rnd(5, 12);
  private ticks = 0;
  private tickT = 0;
  private knockT = -1;

  constructor(private audio: Audio) {}

  /** what things are made of is heard (with surface detail on): footsteps, crates and blows ring as their materials
   *  do (audio.ts, impact). Off, they sound as they did before: a foot's five voices, guessed from the room */
  materials = true;

  /** what a foot or a thing comes down on, as the voice wants it: the material, or (materials off) the old guess */
  private floor(v: Voice, sim: Sim, x: number, y: number, z: number, on: Dyn | null = null): Voice {
    if (!this.materials) { v.surf = legacyFloor(sim.world, x, y, z, on); return v; }
    const u = underfoot(sim.world, x, y, z, on);
    if (u === 'wet') v.surf = 'wet';
    else v.mat = u;
    return v;
  }

  /** a sound the sim made */
  event(sim: Sim, ev: Extract<SimEvent, { type: 'sfx' }>): void {
    const p = sim.player, b = p.body;
    let n = ev.name;
    const v: Voice = { big: ev.big, k: ev.k };
    if (ev.x === undefined) {
      v.d = ev.d ?? 0;
      if (n === 'step' || n === 'land') this.floor(v, sim, b.x, b.y, b.z, b.on);
      if (n === 'slosh' && p.water === 'swimming') n = 'stroke';
    } else {
      Object.assign(v, hearing(sim, ev.x, ev.y, ev.z!));
      if (FEET.has(n) && ev.y !== undefined) this.floor(v, sim, ev.x, ev.y, ev.z!);
      /* a blow that met the wall: what the wall is, and what it was struck with */
      if (n === 'blow' && this.materials) {
        v.mat = sim.world.solidMat(ev.x, ev.y!, ev.z!, b.x, ev.y!, b.z);
        v.hard = hardness(sim.game.weapon);
      }
    }
    this.audio.play(n, v);
  }

  /** a room's tubes strike as the power comes on (cascade.ts): heard from near, a few at a time */
  strike(sim: Sim, R: RoomDef): void {
    const b = sim.player.body, x = (R.x0 + R.x1) / 2, z = (R.z0 + R.z1) / 2;
    if (this.struck >= 3 || Math.hypot(x - b.x, z - b.z) > 30 || R.lit === 'none') return;
    this.struck++;
    this.at(sim, 'strike', x, R.y0 + R.ht - 0.3, z);
  }
  private struck = 0;

  /** the power changed: metal ticks as it warms or cools for a while after, and the pipes knock as the pumps change */
  powerChanged(): void {
    this.ticks = 8 + Math.floor(Math.random() * 6);
    this.tickT = rnd(0.6, 1.4);
    this.knockT = rnd(1.5, 3.5);
  }

  /** somewhere for one of the station's noises to come from: in your room or one near it, overhead (the pipes and the
   *  frame run there) or, in a cave, in its roof */
  private somewhere(w: World, R: RoomDef): { x: number; y: number; z: number } {
    const rooms = [R.id, ...this.nearTo(w, R.id)].map(i => w.rooms[i]).filter(r => !r.doorway);
    const S = rooms[Math.floor(Math.random() * rooms.length)] ?? R;
    return { x: rnd(S.x0, S.x1), y: S.y0 + S.ht - 0.3, z: rnd(S.z0, S.z1) };
  }

  /** a drop has landed (drips.ts), on water or on stone: heard where it fell */
  dripAt(sim: Sim, x: number, y: number, z: number, water: boolean): void {
    const b = sim.player.body;
    if (Math.hypot(x - b.x, y - b.y, z - b.z) < 30) this.at(sim, 'drip', x, y, z, { k: water ? 1 : 0 });
  }
  /** this level drips at its own drip points (drips.ts), so not at random */
  placedDrips = false;

  /** a door shut a while has opened and breathed out (motes.ts), this hard */
  gust(sim: Sim, x: number, y: number, z: number, k: number): void {
    this.at(sim, 'gust', x, y, z, { k });
  }

  private at(sim: Sim, n: string, x: number, y: number, z: number, o: Voice = {}): void {
    this.audio.play(n, { ...o, ...hearing(sim, x, y, z) });
  }

  /** a frame of play: what the sim does not say */
  update(sim: Sim, dt: number, t = 0): void {
    const p = sim.player, b = p.body, g = sim.game, w = sim.world, A = this.audio;
    this.struck = 0;
    if (sim !== this.sim) {
      this.sim = sim; this.was = { water: p.water, under: p.under, air: p.air, vy: 0 };
      this.gen = genAt(w); this.near.clear(); this.room = -1;
    }

    /* water: in with a splash, under it everything dull, up again gasping */
    A.setUnder(p.under);
    if (this.was.water === 'dry' && p.water !== 'dry') {
      const vy = Math.min(this.was.vy, b.vy);
      if (vy < -3) A.play('splash', { k: clamp(-vy / 12, 0.3, 1) });
    }
    if (this.was.under && !p.under && this.was.air < p.airMax * 0.7) A.play('gasp', { k: 1 - this.was.air / p.airMax });
    if (p.under && (this.bubbles -= dt) < 0) {
      const short = p.air < p.airMax * 0.3;
      this.bubbles = short ? rnd(0.5, 1.4) : rnd(1.8, 4.5);
      A.play('bubble', { d: 2, big: short });
    }
    this.was.water = p.water; this.was.under = p.under; this.was.air = p.air; this.was.vy = b.vy;

    /* badly hurt, you hear your heart, faster as it gets worse */
    if (g.hp < 35 && !g.ended) {
      const k = 1 - Math.max(0, g.hp) / 35;
      if ((this.heart -= dt) < 0) { this.heart = 1.1 - 0.5 * k; A.play('heart', { k }); }
    } else this.heart = 0;

    /* the cast as they go: voices at rest, worms dragging themselves along, swimmers' bubbles, and a cry at the end */
    for (const m of sim.cast) {
      let h = this.cast.get(m);
      if (!h) this.cast.set(m, (h = { dead: m.dead, t: rnd(1, 6), x: m.x, z: m.z, walked: 0 }));
      if (m.dead) {
        if (!h.dead) { h.dead = true; this.at(sim, 'die-' + m.ai, m.x, m.y, m.z, { big: m.big }); }
        continue;
      }
      const moved = Math.hypot(m.x - h.x, m.z - h.z);
      h.x = m.x; h.z = m.z;
      if (moved > 0 && moved < 1) {
        h.walked += moved;
        if (m.ai === 'worm' && h.walked > 0.7) { h.walked = 0; this.at(sim, 'slither', m.x, m.y, m.z); }
        else if (m.ai === 'swimmer' && h.walked > 2.5) { h.walked = 0; this.at(sim, 'bubble', m.x, m.y, m.z); }
      }
      if ((h.t -= dt) > 0) continue;
      const I = IDLE[m.ai];
      if (!I) { h.t = 5; continue; }
      const hunting = m.state === 'hunt' || m.state === 'pursue';
      if (m.ai === 'husk' && hunting) { h.t = rnd(2.5, 5); this.at(sim, 'mutter', m.x, m.y, m.z); continue; }
      h.t = rnd(I.t[0], I.t[1]);
      if (m.state !== 'charge' && m.state !== 'wind') this.at(sim, I.n, m.x, m.y, m.z, { big: m.big });
    }

    /* crates: they scrape when shoved and land with a knock */
    for (const o of sim.loose.all) {
      let c = this.crates.get(o);
      if (!c) this.crates.set(o, (c = { ground: o.ground, vmin: 0, x: o.x, z: o.z, slid: 0 }));
      if (!o.awake) { c.ground = o.ground; c.x = o.x; c.z = o.z; continue; }
      if (!o.ground) c.vmin = Math.min(c.vmin, o.vy);
      else if (!c.ground && c.vmin < -3) this.at(sim, 'crate', o.x, o.y, o.z, this.floor({ k: clamp(-c.vmin / 10, 0, 1), by: o.prop.mat }, sim, o.x, o.y, o.z));
      if (o.ground) c.vmin = 0;
      const slid = Math.hypot(o.x - c.x, o.z - c.z);
      if (o.ground && slid > 0.3 * dt) { c.slid += slid; if (c.slid > 0.5) { c.slid = 0; this.at(sim, 'scrape', o.x, o.y, o.z, this.floor({ by: o.prop.mat }, sim, o.x, o.y, o.z)); } }
      c.ground = o.ground; c.x = o.x; c.z = o.z;
    }

    /* caves breathe and drip; so does anywhere near standing water */
    const cave = legacyFloor(w, b.x, b.y, b.z) === 'rock';
    A.setBed(cave ? 1 : 0);

    /* the room's echo: kept through a doorway, so passing between two halls does not shrink them */
    const R = w.roomAt(b.x, b.y + 1, b.z);
    if (R) {
      /* louder, brighter and to one side near the room's nearest grille */
      let near = 0, pan = 0, best = Infinity;
      for (const G of w.def.vents ?? []) {
        if (G.x < R.x0 || G.x > R.x1 || G.z < R.z0 || G.z > R.z1 || G.y < R.y0 || G.y > R.y0 + R.ht + 0.5) continue;
        const d = Math.hypot(G.x - b.x, G.y - b.y - 1.6, G.z - b.z);
        if (d < best) { best = d; near = clamp(1 - d / 5, 0, 1); pan = hearing(sim, G.x, undefined, G.z).pan; }
      }
      A.setAir(roomAir(R, power(g, R.circuit)), near, pan);
    }
    if (R && !R.doorway && R.id !== this.room) { this.room = R.id; A.setSpace(...spaceOf(R, cave || !!R.cells)); }

    /* Gen-1: loud and bright in its hall, along the rooms from it on its own level, a rumble in the rock on the rest */
    const main = !!g.station?.main, G = this.gen;
    if (G) { const h = hearing(sim, G.x, G.y, G.z), v = clamp(1 - h.d / 90, 0, 1); A.setHum(main, Math.max(0.15, v * v), h.muffle, h.pan); }
    else A.setHum(main, 0.15, 1, 0);

    /* a failing tube, lit: it buzzes in its room and a little beyond, and crackles each time it dims */
    let buzz = 0;
    if (R) {
      const lit = (r: RoomDef) => r.flick && Math.max(...roomLight(r, c => power(g, c))) > 0.02;
      if (lit(R)) buzz = 1;
      else if (this.nearTo(w, R.id).some(n => lit(w.rooms[n]))) buzz = 0.3;
    }
    /* the station's own noises, now and then, from somewhere near: what kind by where you are */
    if (R && !g.ended) {
      const pw = power(g, R.circuit) > 0, rock = cave || !!R.cells;
      if ((this.amb -= dt) < 0) {
        this.amb = rnd(7, 20);
        const pick = ambientFor(R, rock, pw), sum = pick.reduce((s, a) => s + a.w, 0);
        let r = Math.random() * sum, n = pick[0].n;
        for (const a of pick) { r -= a.w; if (r <= 0) { n = a.n; break; } }
        const at = this.somewhere(w, R);
        this.at(sim, n, at.x, at.y, at.z, { k: Math.random() < 0.3 ? rnd(0.5, 1) : 0 });
      }
      /* after the power changed: ticks, slowing as the metal settles, and a knock as the pumps take up or let go */
      if (this.ticks > 0 && (this.tickT -= dt) < 0) {
        this.ticks--;
        this.tickT = rnd(0.3, 1.2) * (1 + (14 - this.ticks) * 0.15);
        const at = this.somewhere(w, R);
        this.at(sim, 'tick', at.x, at.y, at.z);
      }
      if (this.knockT > 0 && (this.knockT -= dt) <= 0 && !rock) {
        const at = this.somewhere(w, R);
        this.at(sim, 'knock', at.x, at.y, at.z, { k: rnd(0.5, 1) });
      }
    }

    const dim = flickerAt(t, stutters(sim));
    A.setBuzz(buzz, dim);
    if (buzz && dim !== this.dim) A.play(dim ? 'zap' : 'tink', { k: buzz });
    this.dim = dim;
    if (!this.placedDrips && (this.drip -= dt) < 0) {
      this.drip = rnd(1.2, 4.5);
      const wet = cave || [[0, 0], [6, 0], [-6, 0], [0, 6], [0, -6]].some(([ox, oz]) => w.waterAt(b.x + ox, b.z + oz) > -Infinity);
      if (wet) A.play('drip', { d: rnd(3, 16), pan: rnd(-0.8, 0.8), muffle: rnd(0, 0.3) });
    }
  }

  /** the rooms next to a room, and through a doorway into the ones beyond it */
  private nearTo(w: World, id: number): number[] {
    let a = this.near.get(id);
    if (!a) {
      const s = new Set<number>();
      for (const n of w.neighbours(id)) { s.add(n); if (w.rooms[n].doorway) for (const m of w.neighbours(n)) s.add(m); }
      s.delete(id);
      this.near.set(id, (a = [...s]));
    }
    return a;
  }
}

