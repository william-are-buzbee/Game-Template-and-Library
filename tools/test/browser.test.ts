// tools/lib/browser.ts: the WebGL counter (glCounting), run in node against a stand-in for WebGL whose calls do nothing.
// Run: node --test "tools/test/*.test.ts"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { glCounting, glLine, glMedian, glSum, type GlCounts } from '../lib/browser.ts';

// a stand-in context: every method the counter wraps (and a few uniforms), each recording that the real one was reached
const reached: string[] = [];
const METHODS = [
  'drawArrays', 'drawElements', 'drawRangeElements', 'drawArraysInstanced', 'drawElementsInstanced', 'useProgram',
  'bindFramebuffer', 'bufferData', 'bufferSubData', 'texImage2D', 'texSubImage2D', 'texImage3D', 'texSubImage3D',
  'compressedTexImage2D', 'copyTexImage2D', 'copyTexSubImage2D', 'blitFramebuffer', 'readPixels', 'linkProgram',
  'uniform1f', 'uniform3fv', 'uniformMatrix4fv', 'uniformBlockBinding',
];
class FakeGL2 {}
for (const m of METHODS) (FakeGL2.prototype as any)[m] = function () { reached.push(m); };
(FakeGL2.prototype as any).getExtension = (name: string) =>
  name === 'ANGLE_instanced_arrays' ? { drawArraysInstancedANGLE() { reached.push('ANGLE'); }, drawElementsInstancedANGLE() {} } : null;

const g = globalThis as any;
g.WebGL2RenderingContext = FakeGL2;
glCounting();
glCounting(); // a second install changes nothing
const counter = g.__gl as { take(): GlCounts; frame(): void; frames: GlCounts[]; quiet: boolean };
const gl = new FakeGL2() as any;

test('draws: triangles by mode, instances multiplied, points and lines vertices only', () => {
  counter.take();
  gl.drawArrays(4, 0, 30); // TRIANGLES: 10
  gl.drawElements(5, 12, 0x1403, 0); // TRIANGLE_STRIP: 10
  gl.drawElementsInstanced(4, 36, 0x1403, 0, 100); // 12 × 100
  gl.drawArrays(0, 0, 500); // POINTS: none
  const c = counter.take();
  assert.equal(c.draws, 4);
  assert.equal(c.instances, 103);
  assert.equal(c.triangles, 10 + 10 + 1200);
  assert.equal(c.vertices, 30 + 12 + 3600 + 500);
  assert.ok(reached.includes('drawElementsInstanced'), 'the real call is still made');
});

test('program and framebuffer changes, not every bind', () => {
  counter.take();
  const a = {}, b = {}, fb = {};
  gl.useProgram(a);
  gl.useProgram(a);
  gl.useProgram(b);
  gl.bindFramebuffer(0x8d40, fb);
  gl.bindFramebuffer(0x8d40, fb);
  gl.bindFramebuffer(0x8ca8, null); // READ_FRAMEBUFFER: not a pass
  gl.bindFramebuffer(0x8d40, null);
  gl.uniform1f(null, 1);
  gl.uniformMatrix4fv(null, false, new Float32Array(16));
  gl.uniformBlockBinding(null, 0, 0); // not an upload of a value
  const c = counter.take();
  assert.equal(c.programs, 2);
  assert.equal(c.passes, 2);
  assert.equal(c.uniforms, 2);
});

test('bytes: buffers and textures sent, allocations not, copies apart', () => {
  counter.take();
  gl.bufferData(0x8892, 4096, 0x88e4); // a size: allocated, nothing sent
  gl.bufferData(0x8892, new Float32Array(100), 0x88e4); // 400
  gl.bufferSubData(0x8892, 0, new Float32Array(100), 10, 20); // WebGL2's srcOffset, length: 80
  gl.texImage2D(0x0de1, 0, 0x1908, 64, 32, 0, 0x1908, 0x1401, new Uint8Array(64 * 32 * 4)); // RGBA bytes: 8192
  gl.texImage2D(0x0de1, 0, 0x1908, 256, 256, 0, 0x1908, 0x1401, null); // allocated only
  gl.texImage2D(0x0de1, 0, 0x8d40, 0x1907, 0x140b, { width: 10, height: 10 }); // RGB half float from a source: 600
  gl.texSubImage2D(0x0de1, 0, 0, 0, 16, 16, 0x1903, 0x1406, new Float32Array(256)); // RED float: 1024
  gl.texImage3D(0x806f, 0, 0x8d40, 8, 8, 4, 0, 0x1908, 0x8033, new Uint16Array(256)); // packed 4_4_4_4: 512
  gl.texImage2D(0x0de1, 0, 0x1908, 4, 4, 0, 0x1908, 0x1401, 0); // from a pixel buffer: a copy, 64
  gl.copyTexSubImage2D(0x0de1, 0, 0, 0, 0, 0, 100, 50); // 20000
  gl.compressedTexImage2D(0x0de1, 0, 0x83f0, 16, 16, 0, new Uint8Array(128));
  gl.readPixels(0, 0, 1, 1, 0x1908, 0x1401, new Uint8Array(4));
  gl.linkProgram({});
  const c = counter.take();
  assert.equal(c.bufferBytes, 480);
  assert.equal(c.textureBytes, 8192 + 600 + 1024 + 512 + 128);
  assert.equal(c.copyBytes, 64 + 20000);
  assert.equal(c.readbacks, 1);
  assert.equal(c.compiles, 1);
});

test('WebGL1 instancing through the extension is counted', () => {
  counter.take();
  gl.getExtension('ANGLE_instanced_arrays').drawArraysInstancedANGLE(4, 0, 6, 7);
  const c = counter.take();
  assert.deepEqual([c.draws, c.instances, c.triangles], [1, 7, 14]);
  assert.ok(reached.includes('ANGLE'));
});

test('quiet counts nothing; frame() takes a frame', () => {
  counter.take();
  counter.frames.length = 0;
  counter.quiet = true;
  gl.drawArrays(4, 0, 3);
  counter.quiet = false;
  gl.drawArrays(4, 0, 3);
  counter.frame();
  gl.drawArrays(4, 0, 3);
  gl.drawArrays(4, 0, 3);
  counter.frame();
  assert.deepEqual(counter.frames.map(f => f.draws), [1, 2]);
});

test('sum, median, a line', () => {
  const f = (draws: number, bufferBytes = 0) => ({ draws, bufferBytes });
  assert.equal(glSum([f(1, 10), f(2, 20)]).bufferBytes, 30);
  assert.equal(glMedian([f(5), f(1), f(100)]).draws, 5);
  assert.equal(glMedian([f(1), f(3)]).draws, 2);
  assert.equal(glLine(glSum([f(12000, 3 << 20)])), '12.0k draws, 3.0 MB to buffers');
  assert.equal(glLine(glSum([])), 'nothing');
});
