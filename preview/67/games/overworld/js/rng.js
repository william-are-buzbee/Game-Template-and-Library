// ==================== SEEDED RNG ====================
// The generator is @wb/core's Rng (the repository's packages/core, vendored as ../vendor/wb-core.js) since 6 Nov 2026:
// the same mulberry32, giving the same numbers as the code it replaced (packages/core/test/golden.test.ts), so a seed
// makes the same world and an old save's state resumes the same stream. One stream for the whole game, as before.
import { Rng } from '../vendor/wb-core.js';

const stream = new Rng(12345);

// a seed or a state of 0 is taken as 1, as the old generator did
export function srand(seed){ stream.restore((seed>>>0) || 1); }

// Save/load support: the generator's whole state is one 32-bit int.
export function getRngState(){ return stream.state(); }
export function setRngState(s){ stream.restore((s>>>0) || 1); }

export function rand(){ return stream.next(); }

export function randi(n){ return Math.floor(rand()*n); }
export function randRange(a,b){ return a + randi(b-a+1); }
export function choice(arr){ return arr[randi(arr.length)]; }
export function roll100(){ return randi(100)+1; }

export function randomRound(x){
  const f = Math.floor(x);
  const frac = x - f;
  return (frac > 0 && rand() < frac) ? f + 1 : f;
}
