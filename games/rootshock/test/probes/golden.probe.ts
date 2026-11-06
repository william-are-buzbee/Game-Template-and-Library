import { it } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { STATION } from '../../src/content/station';
import { testbed } from '../../src/content/levels/testbed';
import type { LevelDef } from '../../src/content/types';
import { World } from '../../src/world/world';
import { begin, say } from './out';

/* Every level as compiled, kept to compare with: for a change to how levels are written that should change nothing
   (or only what it says it does). SAVE=<dir> writes each level's definition and its grid there; CHECK=<dir> builds
   them again and lists what differs from what was saved: by part of the definition, the first few things that differ
   in each, and how many cells of the grid are not what they were (and where the first are). LEVEL=upper for one.
   EQUIV=1 asks only that they be the same place: a room is its name and how it is (not its number, nor its box: a room
   drawn as two boxes is the same room drawn as one), a cell of the grid what is there (a room by name, a block by its
   colour and what it is made of), and the lists whose order nothing hangs on (props, fittings, grilles, water,
   colliders) compared as sets. Doors, items, the cast and the rest keep their order: saves and the tests name them by it. */

/** the grid, cell by cell: each chunk that is not all rock, as its coordinates and its cells */
function cells(def: LevelDef): Map<string, Int16Array> {
  const w = new World(def), out = new Map<string, Int16Array>();
  w.grid.forEachChunk((cx, cy, cz) => out.set(`${cx},${cy},${cz}`, w.grid.chunkCells(cx, cy, cz)!.slice()));
  return out;
}

const levels = (): [string, () => LevelDef][] => [
  ...STATION.levels.map(L => [L.id, L.build] as [string, () => LevelDef]),
  ['testbed', testbed],
];

/** where two values first part, as paths into them, up to `most` */
function differ(a: unknown, b: unknown, path: string, out: string[], most: number): void {
  if (out.length >= most) return;
  if (typeof a === 'number' && typeof b === 'number') {
    if (Math.abs(a - b) > 1e-6) out.push(`${path}: ${a} -> ${b}`);
    return;
  }
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    if (a !== b) out.push(`${path}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`);
    return;
  }
  const keys = new Set([...Object.keys(a as object), ...Object.keys(b as object)]);
  for (const k of keys) differ((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`, out, most);
}

/** a room as itself, whatever it is numbered or however it is boxed */
const roomSig = (R: LevelDef['rooms'][number]) => {
  const { id, x0, z0, x1, z1, part, ...rest } = R;
  void id; void x0; void z0; void x1; void z1; void part;
  return JSON.stringify(rest);
};
/** what a cell is, for EQUIV: rock, a room by its name and floor, or a block by how it looks */
const what = (def: LevelDef, v: number) => (v === -1 ? '#' : v >= 0 ? `${def.rooms[v].name}@${def.rooms[v].y0}` : `B${def.blocks[-2 - v].colour.map(c => c.toFixed(3))}${def.blocks[-2 - v].mat}`);
const SETS = new Set(['props', 'fixtures', 'vents', 'water', 'colliders', 'blocks', 'rooms']);
const round = (v: unknown): unknown => (typeof v === 'number' ? Math.round(v * 1e5) / 1e5 : Array.isArray(v) ? v.map(round) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, round(x)])) : v);

it('golden', () => {
  const save = process.env.SAVE, check = process.env.CHECK, only = process.env.LEVEL, equiv = !!process.env.EQUIV;
  begin('golden', save ? ` saved to ${save}` : ` checked against ${check}`);
  for (const [id, build] of levels()) {
    if (only && id !== only) continue;
    const def = build(), grid = cells(def);
    if (save) {
      if (!existsSync(save)) mkdirSync(save, { recursive: true });
      writeFileSync(`${save}/${id}.json`, JSON.stringify(def));
      writeFileSync(`${save}/${id}.grid`, JSON.stringify([...grid].map(([k, v]) => [k, Array.from(v)])));
      say(`${id}: saved`);
      continue;
    }
    if (!check) throw new Error('SAVE=<dir> or CHECK=<dir>');
    const was = JSON.parse(readFileSync(`${check}/${id}.json`, 'utf8')) as LevelDef;
    const wasGrid = new Map((JSON.parse(readFileSync(`${check}/${id}.grid`, 'utf8')) as [string, number[]][]).map(([k, v]) => [k, v]));
    say(`\n${id}`);
    const now = JSON.parse(JSON.stringify(def)) as Record<string, unknown>, old = was as unknown as Record<string, unknown>;
    let same = true;
    for (const part of new Set([...Object.keys(old), ...Object.keys(now)])) {
      let a = old[part], b = now[part];
      const d: string[] = [];
      if (equiv && part === 'blocks') continue;
      if (equiv && SETS.has(part) && Array.isArray(a) && Array.isArray(b)) {
        /* as sets: what is in one and not the other */
        const key = (v: unknown) => (part === 'rooms' ? roomSig(v as LevelDef['rooms'][number]) : JSON.stringify(round(v)));
        const count = (xs: unknown[]) => { const m = new Map<string, number>(); for (const x of xs) m.set(key(x), (m.get(key(x)) ?? 0) + 1); return m; };
        const ca = count(a), cb = count(b), gone: string[] = [], come: string[] = [];
        for (const [k, n] of ca) for (let q = part === 'rooms' ? Math.max(0, n - (cb.has(k) ? n : 0)) : n - (cb.get(k) ?? 0); q > 0; q--) gone.push(k);
        for (const [k, n] of cb) for (let q = part === 'rooms' ? Math.max(0, n - (ca.has(k) ? n : 0)) : n - (ca.get(k) ?? 0); q > 0; q--) come.push(k);
        if (!gone.length && !come.length) continue;
        a = gone; b = come;
        same = false;
        say(`  ${part}: ${gone.length} only before, ${come.length} only after`);
        for (const g of gone.slice(0, +(process.env.MOST ?? 6))) say(`    - ${g.slice(0, 300)}`);
        for (const g of come.slice(0, +(process.env.MOST ?? 6))) say(`    + ${g.slice(0, 300)}`);
        continue;
      }
      differ(a, b, part, d, 8);
      if (!d.length) continue;
      same = false;
      const n = (v: unknown) => (Array.isArray(v) ? ` (${v.length} -> ` : ' (');
      say(`  ${part}${Array.isArray(a) ? `${n(a)}${Array.isArray(b) ? b.length : '-'})` : ''}`);
      for (const line of d) say(`    ${line}`);
    }
    let off = 0;
    const first: string[] = [], kinds = new Map<string, number>();
    for (const k of new Set([...wasGrid.keys(), ...grid.keys()])) {
      const a = wasGrid.get(k), b = grid.get(k);
      for (let i = 0; i < 4096; i++) {
        const va = a ? a[i] : -1, vb = b ? b[i] : -1;
        if (equiv ? what(was, va) === what(def, vb) : va === vb) continue;
        off++;
        if (equiv) { const k = `${what(was, va)} -> ${what(def, vb)}`; kinds.set(k, (kinds.get(k) ?? 0) + 1); }
        if (first.length < 6) {
          const [cx, cy, cz] = k.split(',').map(Number), x = (cx * 16 + (i & 15)) * 0.25, y = (cy * 16 + ((i >> 4) & 15)) * 0.25, z = (cz * 16 + (i >> 8)) * 0.25;
          first.push(`(${x}, ${y}, ${z}) ${equiv ? what(was, va) : va} -> ${equiv ? what(def, vb) : vb}`);
        }
      }
    }
    if (off) {
      same = false;
      say(`  grid: ${off} cells differ; first at ${first.join('; ')}`);
      for (const [k, n] of [...kinds].sort((p, q) => q[1] - p[1]).slice(0, 12)) say(`    ${n} ${k}`);
    }
    if (same) say('  the same');
  }
});
