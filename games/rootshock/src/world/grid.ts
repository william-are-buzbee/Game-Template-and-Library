/* The query grid: space in cells of CELL metres, in the station's frame (cell (0, 0, 0) has its low corner at the origin).
   Each cell holds what is there: ROCK (-1), a room id (>= 0: open space, and whose), or a block (<= -2: solid built back
   into a room). Rock is the default and costs nothing: cells are stored in chunks of CHUNK³, and only chunks with
   something other than rock in them exist. */
export const CELL = 0.25;
export const CHUNK = 16;
export const ROCK = -1;
export const blockCell = (b: number): number => -2 - b;
export const cellBlock = (c: number): number => -2 - c;

const OFF = 512; // chunk coordinates from -512 to 511: ±2 km either way
const key = (cx: number, cy: number, cz: number): number => ((cx + OFF) * 1024 + (cy + OFF)) * 1024 + (cz + OFF);

export class Grid {
  private chunks = new Map<number, Int16Array>();
  private lastKey = -1;
  private last: Int16Array | undefined;

  private chunk(cx: number, cy: number, cz: number): Int16Array | undefined {
    const k = key(cx, cy, cz);
    if (k !== this.lastKey) {
      this.lastKey = k;
      this.last = this.chunks.get(k);
    }
    return this.last;
  }

  /** the cell at (i, j, k); anywhere never carved is rock */
  get(i: number, j: number, k: number): number {
    const c = this.chunk(i >> 4, j >> 4, k >> 4);
    return c ? c[((k & 15) * 16 + (j & 15)) * 16 + (i & 15)] : ROCK;
  }

  set(i: number, j: number, k: number, v: number): void {
    let c = this.chunk(i >> 4, j >> 4, k >> 4);
    if (!c) {
      if (v === ROCK) return;
      c = new Int16Array(CHUNK * CHUNK * CHUNK).fill(ROCK);
      this.chunks.set(key(i >> 4, j >> 4, k >> 4), c);
      this.lastKey = -1;
    }
    c[((k & 15) * 16 + (j & 15)) * 16 + (i & 15)] = v;
  }

  /** a chunk's cells, (k * 16 + j) * 16 + i within it; undefined where it is all rock */
  chunkCells(cx: number, cy: number, cz: number): Int16Array | undefined {
    return this.chunks.get(key(cx, cy, cz));
  }

  hasChunk(cx: number, cy: number, cz: number): boolean {
    return this.chunks.has(key(cx, cy, cz));
  }

  /** every chunk that exists, by chunk coordinates */
  forEachChunk(f: (cx: number, cy: number, cz: number) => void): void {
    for (const k of this.chunks.keys()) {
      const cz = (k % 1024) - OFF, cy = (Math.floor(k / 1024) % 1024) - OFF, cx = Math.floor(k / 1048576) - OFF;
      f(cx, cy, cz);
    }
  }

  get chunkCount(): number {
    return this.chunks.size;
  }

  ci(x: number): number { return Math.floor(x / CELL); }
  at(x: number, y: number, z: number): number {
    return this.get(Math.floor(x / CELL), Math.floor(y / CELL), Math.floor(z / CELL));
  }

  /** fill every cell whose centre lies inside the box */
  fill(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, v: number): void {
    const i0 = Math.round(x0 / CELL), i1 = Math.round(x1 / CELL), j0 = Math.round(y0 / CELL), j1 = Math.round(y1 / CELL);
    const k0 = Math.round(z0 / CELL), k1 = Math.round(z1 / CELL);
    for (let k = k0; k < k1; k++) for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) this.set(i, j, k, v);
  }
}
