// tools/lib/browser.ts — what tools/look.ts and tools/cards.ts share: a static server for a build, headless Chromium
// with software WebGL, a way to stop a game drawing so a screenshot can be taken, and a counter of what a page asks of
// the GPU (glCounting: draws, triangles, uploads… — the same on any machine, so comparable and checkable where a time is not;
// look.ts --gl, and Tethys's test/gpu.js, which requires this file).
// Playwright is not a dependency of the repo: it is found as PLAYWRIGHT_MODULE, else as a global `playwright`
// (cloud sessions have one; CI installs one in the job).
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join, normalize, resolve } from 'node:path';
import type { AddressInfo } from 'node:net';

const TYPES: Record<string, string> = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.wasm': 'application/wasm',
  '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.txt': 'text/plain',
};

/** serves a folder on a free local port; `url(server)` is its address */
export function serve(dir: string): Promise<Server> {
  const root = resolve(dir);
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    let file = normalize(join(root, path));
    if (!file.startsWith(root)) return void res.writeHead(403).end();
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) return void res.writeHead(404).end();
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise(ok => server.listen(0, '127.0.0.1', () => ok(server)));
}

export const url = (server: Server) => `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;

/** Playwright's chromium, or a message and exit 2 when there is none */
export async function launch(): Promise<any> {
  const require = createRequire(import.meta.url);
  let pw: any;
  try {
    pw = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
  } catch {
    console.error('Playwright not found: set PLAYWRIGHT_MODULE to its folder, or install it globally (`npm i -g playwright`).');
    process.exit(2);
  }
  // software WebGL, so a machine with no GPU (CI, a cloud session) still draws
  return pw.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
}

/**
 * Lets the page's frame loop be stopped later (`freeze`), so a screenshot of a heavy game can be taken. Must be added
 * before the page loads. Under headless software WebGL nothing holds a game back to the speed its frames are drawn: it
 * queues them far faster than SwiftShader draws them, and a screenshot waits behind the whole queue (Rootshock in CI,
 * 7 Nov 2026: 20 s and no picture; two minutes here). So every requestAnimationFrame callback goes through a gate that
 * `freeze` closes, and after each one the page waits for its WebGL contexts to finish drawing, by reading one pixel of
 * what is on screen (`gl.finish()` does not wait in Chromium; a read does): one frame at a time, the speed it would
 * really run at, and once the gate closes the last frame it drew stays on screen.
 */
export async function freezable(page: any): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __wbFrozen?: boolean };
    const contexts: WebGLRenderingContext[] = [];
    const getContext = HTMLCanvasElement.prototype.getContext as (this: HTMLCanvasElement, ...a: unknown[]) => unknown;
    (HTMLCanvasElement.prototype as any).getContext = function (this: HTMLCanvasElement, ...a: unknown[]) {
      const c = getContext.apply(this, a);
      if (c && /webgl/.test(String(a[0])) && !contexts.includes(c as WebGLRenderingContext)) contexts.push(c as WebGLRenderingContext);
      return c;
    };
    const px = new Uint8Array(4);
    const settle = (gl: WebGLRenderingContext) => {
      // the screen's framebuffer, then back to whatever the game had bound (both of them, in WebGL2)
      const two = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
      const draw = gl.getParameter(gl.FRAMEBUFFER_BINDING);
      const read = two ? gl.getParameter(0x8caa) : null; // READ_FRAMEBUFFER_BINDING
      const pack = two ? gl.getParameter(0x88ed) : null; // PIXEL_PACK_BUFFER_BINDING
      if (pack) (gl as WebGL2RenderingContext).bindBuffer(0x88eb, null); // PIXEL_PACK_BUFFER
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      if (two) {
        (gl as WebGL2RenderingContext).bindFramebuffer(0x8ca9, draw); // DRAW_FRAMEBUFFER
        (gl as WebGL2RenderingContext).bindFramebuffer(0x8ca8, read); // READ_FRAMEBUFFER
        if (pack) (gl as WebGL2RenderingContext).bindBuffer(0x88eb, pack);
      } else gl.bindFramebuffer(gl.FRAMEBUFFER, draw);
    };
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = cb =>
      raf(t => {
        if (w.__wbFrozen) return;
        cb(t);
        // a frame for the WebGL counter (glCounting), if there is one; the settle's own calls are not the game's
        const counter = (window as unknown as { __gl?: { frame(): void; quiet: boolean } }).__gl;
        if (counter) {
          counter.frame();
          counter.quiet = true;
        }
        for (const gl of contexts) if (!gl.isContextLost()) settle(gl);
        if (counter) counter.quiet = false;
      });
  });
}

/**
 * What a page asked of the GPU, counted at its WebGL calls (`glCounting`). Unlike a time, none of it depends on the
 * machine: the same page doing the same thing asks for the same work on a laptop, a CI runner or software WebGL, so these
 * can be compared between two versions anywhere and held to in CI. They are what the GPU's time is made of, not the time.
 */
export interface GlCounts {
  /** draw calls: each is CPU work to submit (three.js and the driver) as well as GPU work */
  draws: number;
  /** instances drawn: 1 for a plain draw, the count for an instanced one */
  instances: number;
  /** triangles submitted (instances included); points and lines count none */
  triangles: number;
  /** vertices submitted (instances included), whatever the primitive: points and lines too */
  vertices: number;
  /** changes of the program drawn with (a useProgram to a different one) */
  programs: number;
  /** uniform calls: three.js's per-object upload, and a CPU cost of its own */
  uniforms: number;
  /** changes of the framebuffer drawn into: a shadow map, a render target, back to the screen */
  passes: number;
  /** bytes sent from the CPU into buffers (geometry, instance data): bufferData with data, bufferSubData */
  bufferBytes: number;
  /** bytes sent from the CPU into textures: texImage and texSubImage with data, compressed or not */
  textureBytes: number;
  /** bytes copied on the GPU: copyTexImage, copyTexSubImage, blitFramebuffer, a texture filled from a pixel buffer */
  copyBytes: number;
  /** readPixels calls: each waits for the GPU to finish everything before it */
  readbacks: number;
  /** programs linked: a shader compile, tens to hundreds of ms the first time each is seen */
  compiles: number;
}

/** GlCounts' fields, in the order they are shown */
export const GL_KEYS = [
  'draws', 'instances', 'triangles', 'vertices', 'programs', 'uniforms', 'passes',
  'bufferBytes', 'textureBytes', 'copyBytes', 'readbacks', 'compiles',
] as const satisfies readonly (keyof GlCounts)[];

/**
 * Counts what the page asks of the GPU (GlCounts), by wrapping WebGL's calls. Add it before the page loads:
 * `page.addInitScript(glCounting)`. In the page, `__gl.take()` returns the counts since the last take and starts again;
 * `__gl.frame()` takes them into `__gl.frames` (the last 600), which `freezable` does after every frame it runs; while
 * `__gl.quiet` is true nothing is counted. Self-contained (Playwright sends its source to the page), so it also runs in
 * node against a stand-in for WebGL (tools/test/browser.test.ts).
 */
export function glCounting(): void {
  type Counts = Record<string, number>;
  const g = globalThis as any;
  if (g.__gl) return;
  const zero = (): Counts => ({
    draws: 0, instances: 0, triangles: 0, vertices: 0, programs: 0, uniforms: 0, passes: 0,
    bufferBytes: 0, textureBytes: 0, copyBytes: 0, readbacks: 0, compiles: 0,
  });
  const counter = {
    now: zero(),
    frames: [] as Counts[],
    quiet: false,
    take(): Counts {
      const c = counter.now;
      counter.now = zero();
      return c;
    },
    frame(): void {
      counter.frames.push(counter.take());
      if (counter.frames.length > 600) counter.frames.shift();
    },
  };
  g.__gl = counter;
  // what each context last had bound, so a call that changes nothing is not counted as a change
  const bound = new WeakMap<object, { program: unknown; fb: unknown }>();
  const state = (ctx: object) => {
    let s = bound.get(ctx);
    if (!s) bound.set(ctx, (s = { program: undefined, fb: null }));
    return s;
  };
  const draw = (mode: number, n: number, inst: number) => {
    const c = counter.now;
    c.draws!++;
    c.instances! += inst;
    c.vertices! += n * inst;
    // TRIANGLES, TRIANGLE_STRIP, TRIANGLE_FAN
    c.triangles! += (mode === 4 ? Math.floor(n / 3) : mode === 5 || mode === 6 ? Math.max(0, n - 2) : 0) * inst;
  };
  // bytes a pixel: a packed type is the whole pixel; otherwise the format's channels times the type's size
  const PACKED: Record<number, number> = { 0x8363: 2, 0x8033: 2, 0x8034: 2, 0x8368: 4, 0x8c3b: 4, 0x8c3e: 4, 0x84fa: 4, 0x8dad: 8 };
  const SIZE: Record<number, number> = { 0x1400: 1, 0x1401: 1, 0x1402: 2, 0x1403: 2, 0x1404: 4, 0x1405: 4, 0x1406: 4, 0x140b: 2, 0x8d61: 2 };
  const CHANNELS: Record<number, number> = {
    0x1902: 1, 0x1903: 1, 0x1906: 1, 0x1907: 3, 0x1908: 4, 0x1909: 1, 0x190a: 2, 0x84f9: 1,
    0x8227: 2, 0x8228: 2, 0x8d94: 1, 0x8d98: 3, 0x8d99: 4, 0x8c40: 3, 0x8c42: 4,
  };
  const bpp = (format: number, type: number) => PACKED[type] ?? (CHANNELS[format] ?? 4) * (SIZE[type] ?? 1);
  // a texture's data: nothing (an allocation, not counted), an offset into a pixel buffer (a copy on the GPU), or sent
  const texture = (w: number, h: number, d: number, format: number, type: number, data: unknown) => {
    if (data === null || data === undefined) return;
    counter.now[typeof data === 'number' ? 'copyBytes' : 'textureBytes']! += w * h * d * bpp(format, type);
  };
  const sourceSize = (s: any): [number, number] => [
    s.videoWidth || s.naturalWidth || s.displayWidth || s.width || 0,
    s.videoHeight || s.naturalHeight || s.displayHeight || s.height || 0,
  ];
  // bytes of an ArrayBuffer or a view of one, from srcOffset for length elements when WebGL2's forms give them
  const bytes = (data: any, srcOffset?: number, length?: number) => {
    if (!data || typeof data !== 'object' || typeof data.byteLength !== 'number') return 0;
    const each = data.BYTES_PER_ELEMENT || 1;
    return length ? length * each : data.byteLength - (srcOffset || 0) * each;
  };
  const count: Record<string, (ctx: object, a: any[]) => void> = {
    drawArrays: (_, a) => draw(a[0], a[2], 1),
    drawElements: (_, a) => draw(a[0], a[1], 1),
    drawRangeElements: (_, a) => draw(a[0], a[3], 1),
    drawArraysInstanced: (_, a) => draw(a[0], a[2], a[3]),
    drawElementsInstanced: (_, a) => draw(a[0], a[1], a[4]),
    useProgram: (ctx, a) => {
      const s = state(ctx);
      if (a[0] !== s.program) counter.now.programs!++;
      s.program = a[0];
    },
    bindFramebuffer: (ctx, a) => {
      if (a[0] !== 0x8d40 && a[0] !== 0x8ca9) return; // FRAMEBUFFER, DRAW_FRAMEBUFFER; not READ_FRAMEBUFFER
      const s = state(ctx);
      if ((a[1] ?? null) !== s.fb) counter.now.passes!++;
      s.fb = a[1] ?? null;
    },
    bufferData: (_, a) => void (counter.now.bufferBytes! += bytes(a[1], a[3], a[4])),
    bufferSubData: (_, a) => void (counter.now.bufferBytes! += bytes(a[2], a[3], a[4])),
    // (target, level, internalformat, width, height, border, format, type, pixels…) or (…, internalformat, format, type, source)
    texImage2D: (_, a) => {
      if (a.length >= 8) texture(a[3], a[4], 1, a[6], a[7], a[8]);
      else texture(...sourceSize(a[5] ?? {}), 1, a[3], a[4], a[5]);
    },
    // (target, level, x, y, width, height, format, type, pixels…) or (target, level, x, y, format, type, source)
    texSubImage2D: (_, a) => {
      if (a.length >= 9) texture(a[4], a[5], 1, a[6], a[7], a[8]);
      else texture(...sourceSize(a[6] ?? {}), 1, a[4], a[5], a[6]);
    },
    texImage3D: (_, a) => texture(a[3], a[4], a[5], a[7], a[8], a[9]),
    texSubImage3D: (_, a) => texture(a[5], a[6], a[7], a[8], a[9], a[10]),
    compressedTexImage2D: (_, a) => void (counter.now.textureBytes! += bytes(a[6])),
    compressedTexSubImage2D: (_, a) => void (counter.now.textureBytes! += bytes(a[7])),
    compressedTexImage3D: (_, a) => void (counter.now.textureBytes! += bytes(a[7])),
    compressedTexSubImage3D: (_, a) => void (counter.now.textureBytes! += bytes(a[9])),
    copyTexImage2D: (_, a) => void (counter.now.copyBytes! += a[5] * a[6] * 4),
    copyTexSubImage2D: (_, a) => void (counter.now.copyBytes! += a[6] * a[7] * 4),
    copyTexSubImage3D: (_, a) => void (counter.now.copyBytes! += a[7] * a[8] * 4),
    blitFramebuffer: (_, a) => void (counter.now.copyBytes! += Math.abs(a[6] - a[4]) * Math.abs(a[7] - a[5]) * 4),
    readPixels: () => void counter.now.readbacks!++,
    linkProgram: () => void counter.now.compiles!++,
  };
  const wrap = (on: any, name: string, f: (ctx: object, a: any[]) => void) => {
    const real = on[name];
    if (typeof real !== 'function' || real.__counted) return;
    const counted = function (this: object, ...a: any[]) {
      if (!counter.quiet)
        try {
          f(this, a);
        } catch {
          // a call the counter cannot read is still made
        }
      return real.apply(this, a);
    };
    (counted as any).__counted = true;
    on[name] = counted;
  };
  const uniform = () => void counter.now.uniforms!++;
  for (const C of [g.WebGLRenderingContext, g.WebGL2RenderingContext]) {
    const p = C?.prototype;
    if (!p) continue;
    for (const name of Object.keys(count)) wrap(p, name, count[name]!);
    for (const name of Object.getOwnPropertyNames(p)) if (/^uniform(\d|Matrix)/.test(name)) wrap(p, name, uniform);
    // WebGL1's instancing is an extension, and its interface is not a global: its object is wrapped as it is handed out
    const getExtension = p.getExtension;
    p.getExtension = function (this: object, name: string) {
      const ext = getExtension.call(this, name);
      if (ext && /^ANGLE_instanced_arrays$/i.test(name)) {
        wrap(ext, 'drawArraysInstancedANGLE', (_, a) => draw(a[0], a[2], a[3]));
        wrap(ext, 'drawElementsInstancedANGLE', (_, a) => draw(a[0], a[1], a[4]));
      }
      return ext;
    };
  }
}

/** frames' counts summed (`load`: everything up to a point) */
export function glSum(frames: Partial<GlCounts>[]): GlCounts {
  const out = Object.fromEntries(GL_KEYS.map(k => [k, 0])) as unknown as GlCounts;
  for (const f of frames) for (const k of GL_KEYS) out[k] += f[k] ?? 0;
  return out;
}

/** the median of each count over frames (a typical frame, which one frame's upload or compile does not move) */
export function glMedian(frames: Partial<GlCounts>[]): GlCounts {
  const out = Object.fromEntries(GL_KEYS.map(k => [k, 0])) as unknown as GlCounts;
  if (!frames.length) return out;
  for (const k of GL_KEYS) {
    const v = frames.map(f => f[k] ?? 0).sort((a, b) => a - b);
    const m = v.length >> 1;
    out[k] = v.length % 2 ? v[m]! : (v[m - 1]! + v[m]!) / 2;
  }
  return out;
}

/** a count as it reads: 1234 → 1.2k, bytes as KB and MB */
export function glNumber(k: keyof GlCounts, v: number): string {
  if (k.endsWith('Bytes')) return v >= 1 << 20 ? `${(v / (1 << 20)).toFixed(1)} MB` : v >= 1024 ? `${(v / 1024).toFixed(0)} KB` : `${Math.round(v)} B`;
  return v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v >= 1e4 ? `${(v / 1e3).toFixed(1)}k` : `${Math.round(v * 10) / 10}`;
}

/** one line of counts, leaving out the zeros */
export function glLine(c: GlCounts): string {
  const NAMES: Record<keyof GlCounts, string> = {
    draws: 'draws', instances: 'instances', triangles: 'triangles', vertices: 'vertices', programs: 'program changes',
    uniforms: 'uniforms', passes: 'passes', bufferBytes: 'to buffers', textureBytes: 'to textures', copyBytes: 'copied',
    readbacks: 'readbacks', compiles: 'programs linked',
  };
  const parts = GL_KEYS.filter(k => c[k]).map(k => `${glNumber(k, c[k])} ${NAMES[k]}`);
  return parts.length ? parts.join(', ') : 'nothing';
}

/** stops the page's frame loop (see `freezable`) */
export async function freeze(page: any): Promise<void> {
  await page.evaluate(() => void ((window as unknown as { __wbFrozen?: boolean }).__wbFrozen = true));
}
