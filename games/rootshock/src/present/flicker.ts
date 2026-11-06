/* A failing tube: dim for a slot, eleven slots a second, at random but the same for everyone who asks. The shader dims
   the rooms that flicker by it and the soundscape crackles by it, so the buzz drops out exactly when the light does. */

/** is a flickering light dimmed at time t (seconds)? `hard`: stuttering badly (the graft, sim/cast.ts `stutters`), out
 *  more than it is on, in shorter slots */
export function flickerAt(t: number, hard = false): boolean {
  const x = Math.sin(Math.floor(t * (hard ? 17 : 11))) * 43758.5453;
  return x - Math.floor(x) >= (hard ? 0.4 : 0.72);
}
/** how far down a flickering light goes when it is dimmed (the shader's uFlick): stuttering badly, all but out */
export const flickDepth = (hard: boolean): number => (hard ? 1.7 : 1);
