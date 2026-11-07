// tools/lib/browser.ts — what tools/look.ts and tools/cards.ts share: a static server for a build, headless Chromium
// with software WebGL, and a way to stop a game drawing so a screenshot can be taken.
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
        for (const gl of contexts) if (!gl.isContextLost()) settle(gl);
      });
  });
}

/** stops the page's frame loop (see `freezable`) */
export async function freeze(page: any): Promise<void> {
  await page.evaluate(() => void ((window as unknown as { __wbFrozen?: boolean }).__wbFrozen = true));
}
