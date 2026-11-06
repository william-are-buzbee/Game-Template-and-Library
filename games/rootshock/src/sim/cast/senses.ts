import type { Dyn } from '../../world/world';
import { eyeHeight } from '../player';
import { simLighting, type Sim } from '../sim';
import type { Mutant } from '../cast';

/* What the cast see and hear of you (engine.md §8): along a clear line, as far as the light you stand in lets them;
   what you do, as far as it carries; and the light they see by. */

/* ---- perception */

/** what sight goes through: bodies, and glass */
export const seeThrough = (d: Dyn) => d.kind === 'body' || !!d.glass;

/** a clear line from its eye to yours: through no wall, door or crate. Looked along at most every tenth of a second. */
export function sight(sim: Sim, m: Mutant): boolean {
  if (sim.tick - m.losAt < 6) return m.los;
  m.losAt = sim.tick;
  const b = sim.player.body;
  m.los = sim.world.raycast(m.x, m.y + m.eye, m.z, b.x, b.y + eyeHeight(sim.player) * 0.9, b.z, seeThrough) >= 1;
  return m.los;
}

/** it sees you: near enough for the light you are in, and nothing in the way */
export const seeP = (sim: Sim, m: Mutant, range: number) => m.d < range * sim.game.vis && sight(sim, m);

/** it hears you: what you are doing carries as far as where it stands */
export function hears(sim: Sim, m: Mutant): boolean {
  const g = sim.game;
  if (g.noise <= 0 || !sim.fields) return false;
  if (m.spot >= 0) return sim.fields.sound[m.spot] < g.noise;
  return m.d < g.noise * 0.5;
}

/** in the beam of your flashlight */
export function inBeam(sim: Sim, m: Mutant): boolean {
  const p = sim.player, b = p.body, cp = Math.cos(p.pitch);
  const fx = -Math.sin(p.yaw) * cp, fy = Math.sin(p.pitch), fz = -Math.cos(p.yaw) * cp;
  const dx = m.x - b.x, dy = m.y + 0.3 - (b.y + eyeHeight(p)), dz = m.z - b.z, d = Math.hypot(dx, dy, dz) || 1;
  return (dx * fx + dy * fy + dz * fz) / d > 0.82 && sight(sim, m);
}

/** the level's light as the power stands: what the cast see by (made again when the power changes) */
const lighting = (sim: Sim) => (sim.lighting ??= simLighting(sim));
const LIT = 0.02;
export const lit = (sim: Sim, x: number, y: number, z: number) => Math.max(...lighting(sim).seen(x, y, z)) > LIT;
export function litRoom(sim: Sim, id: number): boolean {
  return Math.max(...lighting(sim).room(id)) > LIT;
}
